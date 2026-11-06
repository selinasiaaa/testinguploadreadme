import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPreset,presetOptions} from '../src/presets.js';
import {archiveTemplate,defaultValues,recordConfig,snapshotRecord,validateTemplateDefinition,versionTemplates} from '../src/templates.js';
import {detectServices,feeKey,resolveImport,selectionKey} from '../src/proposals.js';
import {makeRecord,normalizeField,validateConfig,validateWorkspace} from '../src/domain.js';
const config=JSON.parse(readFileSync(new URL('../dashboard-config.json',import.meta.url)));
const anc=()=>createPreset('anc',config);

test('every preset has valid editable fields, workflow and reusable configuration',()=>{
 for(const [key] of presetOptions){const t=createPreset(key,config);assert.doesNotThrow(()=>validateTemplateDefinition(t));assert.doesNotThrow(()=>validateConfig({...config,templates:[t]}));}
 const t=anc();assert.equal(t.modules.length,4);assert.equal(t.modules[0].fields[0].defaultValue,'');assert.equal(t.modules[1].fields[0].defaultValue,'');assert.equal(t.modules[3].fields[3].defaultValue,'');
});
test('service mentions and included proposal tables never imply client selection',()=>{
 const t=anc();t.modules.forEach(m=>m.defaultSelected=true);
 const modules=detectServices('BPO and Tax Compliance services',t,{tables:[{title:'Business Process Outsource',rows:[['Proposed fees (RM)'],['monthly account','1,234']]}]});
 assert.ok(modules.every(m=>!m.selected));assert.equal(modules[0].detectedStatus,'included_unconfirmed');assert.equal(modules[3].detectedStatus,'mentioned_unconfirmed');
});
test('DOCX fee cells extract prices, including separate Form E and EA rates',()=>{
 const t=anc();const tables=[{title:'Business Process Outsource',rows:[['Description','Proposed Fees (RM)'],['monthly account','1,234'],['monthly e-invoice','678']]},{title:'Tax Compliance',rows:[['Description','Proposed Fees (RM)'],['Form E; Form EA; Note** dormant company only','450**\nper return\n45**\nper form']]}];
 const modules=detectServices('Date: 30 October 2026\nService tax 8%',t,{tables});
 assert.equal(modules[0].fees.monthly_accounting.value,'1234');assert.equal(modules[0].fees.monthly_einvoice.value,'678');assert.equal(modules[3].fees.form_e.value,'450');assert.equal(modules[3].fees.form_ea.value,'45');assert.match(modules[3].fees.form_e.evidence,/dormant company/);assert.equal(modules[2].fees.annual_audit.source,'Template default (not extracted)');
});
test('structured selection flags and fee overrides retain explicit source provenance',()=>{
 const t=anc();const modules=detectServices('',t,{structured:{selectedModules:['bpo'],modules:[{id:'bpo',fees:{monthly_accounting:999}}]}});
 assert.equal(modules[0].selected,true);assert.equal(modules[0].fees.monthly_accounting.value,'999');assert.equal(modules[0].fees.monthly_accounting.source,'Structured proposal data');assert.equal(modules[2].selected,false);assert.equal(modules[0].verified,false);
});
test('spreadsheet selection and fee mappings use actual row values',()=>{
 const t=anc();const modules=detectServices('',t,{row:{BPO:'yes',Audit:'no',Fee:'1,500'},moduleColumns:{bpo:'BPO',audit:'Audit'},feeColumns:{[feeKey('bpo','monthly_accounting')]:'Fee'}});
 assert.equal(modules[0].selected,true);assert.equal(modules[2].selected,false);assert.equal(modules[2].detectedStatus,'excluded_explicit');assert.equal(modules[0].fees.monthly_accounting.value,'1500');
});
test('unreadable checkbox regions are uncertain while checked regions are explicit',()=>{
 const t=anc(),key=selectionKey('bpo');const options={regionMethods:{[key]:'OCR'},regionRaw:{[key]:'maybe'}};
 assert.equal(detectServices('BPO',t,options)[0].detectedStatus,'uncertain');options.regionRaw[key]='☑';assert.equal(detectServices('BPO',t,options)[0].selected,true);
});
test('missing document date stays missing and manual/default fields ignore incidental OCR',()=>{
 const t=anc();t.fields.push({id:'private_note',label:'Private note',type:'text',source:'manual'});
 const resolved=resolveImport(t,config,{text:'Company Name: Example SDN BHD',values:{signatory_name:'Incidental narrative',private_note:'Should not import'}});
 assert.equal(resolved.values.proposal_date,'');assert.equal(resolved.values.signatory_name,'Wang Choo Jad');assert.equal(resolved.values.private_note,'');assert.match(resolved.provenance.signatory_name.source,/Template default/);assert.match(defaultValues(t.fields).proposal_date,/^\d{4}-\d{2}-\d{2}$/);
});
test('fee normalization rejects narrative, dates and percentages',()=>{
 for(const value of ['29 October 2026','8% Service tax','valid for 1 month','RM 500 dormant company'])assert.equal(normalizeField(value,'currency'),'');
 assert.equal(normalizeField('RM 1,234.50','currency'),'1234.50');
});
test('version changes and template archival preserve historical definitions and fees',()=>{
 const t=anc(),snapshot=snapshotRecord(t,config),edited=structuredClone(t);edited.fields[0].label='Renamed client';edited.modules[2].fields[0].defaultValue='99000';
 const versions=versionTemplates([t],[edited]);assert.equal(versions[0].version,2);assert.equal(versions[0].versions[0].version,1);assert.notEqual(recordConfig(snapshot,config).fields[0].label,versions[0].fields[0].label);assert.equal(snapshot.templateSnapshot.modules[2].fields[0].defaultValue,'28000');
 const archived=archiveTemplate({...config,templates:versions},t.id,[snapshot]);assert.equal(archived.templates[0].status,'archived');assert.equal(archiveTemplate({...config,templates:[t]},t.id,[]).templates.length,0);
});
test('typed multi-select and repeating rows survive record validation and required checks',()=>{
 const t=createPreset('custom',config);t.fields.push({id:'choices',label:'Choices',type:'multiselect',options:['Online','Onsite'],required:true},{id:'scope',label:'Scope',type:'table'});
 const effective={...config,fields:t.fields,cadence:t.workflow};
 assert.throws(()=>makeRecord({customer:'Example',choices:[]},effective,{startedOn:'2026-10-30'}),/Choices/);
 const r=makeRecord({customer:'Example',choices:['Online'],scope:[{description:'Setup',amount:'12'}]},effective,{startedOn:'2026-10-30',...snapshotRecord(t,config)});
 assert.doesNotThrow(()=>validateWorkspace({config:{...config,templates:[t]},records:[r]}));assert.deepEqual(r.values.choices,['Online']);assert.equal(r.values.scope[0].description,'Setup');
});

test('manually added fields can still receive explicit saved-region extraction',()=>{
 const t=anc();t.fields.push({id:'received_date',label:'Received date',type:'date',source:'manual'});
 const result=resolveImport(t,config,{values:{received_date:'31/10/2026'},regionMethods:{received_date:'PDF text'}});assert.equal(result.values.received_date,'2026-10-31');
});
test('a manually added Document Date maps a Word Date label when present',()=>{
 const t=createPreset('custom',config);
 t.fields.push({id:'field_1234',label:'Document Date',type:'date',source:'manual'});
 const result=resolveImport(t,config,{text:'Fee proposal\nDate: 29 October 2026\nDue Date: 30 November 2026'});
 assert.equal(result.values.field_1234,'2026-10-29');
 assert.equal(result.provenance.field_1234.source,'Document extraction');
});
