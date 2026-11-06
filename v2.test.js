import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import JSZip from 'jszip';
import {addMonths,cloneWorkspace,makeRecord,makeSchedule,recordStatus,upgradeWorkspace,validateConfig} from '../src/domain.js';
import {layoutWarnings,moveRegion,normalizedPoint,resizeRegion,selectionBetween,textInRegion} from '../src/geometry.js';
import {mapRow,tableSheet} from '../src/documents.js';
const base=JSON.parse(await readFile(new URL('./fixtures/base-config.json',import.meta.url),'utf8'));
test('regions stay page-relative across zoom, reverse drag, movement and resize',()=>{
 assert.deepEqual(normalizedPoint(200,300,{left:100,top:100,width:400,height:400}),{x:.25,y:.5});
 assert.deepEqual(normalizedPoint(300,500,{left:100,top:100,width:800,height:800}),{x:.25,y:.5});
 const region=selectionBetween({x:.8,y:.6},{x:.2,y:.1});assert.equal(region.x,.2);assert.ok(Math.abs(region.width-.6)<.0001);
 assert.equal(moveRegion({x:.2,y:.1,width:.3,height:.4},1,1).x,.7);assert.equal(resizeRegion({x:.8,y:.8,width:.1,height:.1},{x:2,y:2}).width,1-.8);
});
test('saved regions read actual PDF text in the selected area',()=>{
 const boxes=[{text:'CUSTOMER',x:.1,y:.1,width:.3,height:.03},{text:'INV-100',x:.7,y:.1,width:.2,height:.03}];
 assert.equal(textInRegion(boxes,{x:.09,y:.09,width:.32,height:.06}),'CUSTOMER');
 assert.equal(textInRegion(boxes,{x:.69,y:.09,width:.22,height:.06}),'INV-100');
 assert.equal(textInRegion(boxes,{x:0,y:.8,width:1,height:.1}),'');
});
test('template validation rejects out-of-page boxes and missing fields',()=>{
 const c=structuredClone(base);c.templates=[{id:'t',name:'Invoice',kind:'regions',mappings:{},regions:[{id:'r',fieldId:'customer',page:1,x:.1,y:.1,width:.3,height:.1,shape:'rectangle'}]}];validateConfig(c);
 c.templates[0].regions[0].x=.9;assert.throws(()=>validateConfig(c));c.templates[0].regions[0].x=.1;c.templates[0].regions[0].fieldId='missing';assert.throws(()=>validateConfig(c));
});
test('layout review detects missing pages and changed proportions',()=>{
 assert.ok(layoutWarnings({pages:[{width:200,height:100,boxes:[]}]},{pageCount:2,regions:[{page:1,aspectRatio:1},{page:2}]}).length>=3);
});
test('spreadsheet mappings create real records and required data is checked',()=>{
 const sheet=tableSheet('Invoices',[['Client','Ref','Balance'],['Customer A','INV-1','1,200.50'],['Customer B','INV-2','300']]);
 const config=upgradeWorkspace({config:base,records:[]}).config;
 const values=mapRow(sheet.rows[0],{customer:'Client',reference:'Ref',amount:'Balance'},config.fields);
 const record=makeRecord(values,config,{startedOn:'2026-10-29'});assert.equal(record.values.amount,'1200.50');assert.equal(record.schedule[0].due,'2026-11-05');
 assert.throws(()=>makeRecord({},config));assert.throws(()=>tableSheet('Bad',[['Duplicate','Duplicate'],['1','2']]));
});
test('monthly schedules clamp to month end and use the configured document date',()=>{
 assert.equal(addMonths('2027-01-31',1),'2027-02-28');assert.equal(addMonths('2028-01-31',1),'2028-02-29');assert.equal(addMonths('2027-01-31',2),'2027-03-31');
 const config=upgradeWorkspace({config:base,records:[]}).config;config.fields.push({id:'document_date',label:'Document date',type:'date',required:false,aliases:''});config.cadence={...config.cadence,unit:'months',startField:'document_date'};
 const record=makeRecord({customer:'A',document_date:'2027-01-31'},config,{startedOn:'2026-10-29'});assert.equal(record.schedule[0].due,'2027-02-28');
 for(const outcome of ['paid','replied','cancelled','paused','completed'])assert.equal(recordStatus({...record,outcome}),outcome);
});
test('V1 workspaces upgrade without losing IDs, records or templates; clone excludes customers by default',()=>{
 const old={config:structuredClone(base),records:[{id:'old',schedule:[],history:[],values:{customer:'Private'}}]};
 const migrated=upgradeWorkspace(old);assert.equal(migrated.config.id,old.config.id);assert.equal(migrated.records[0].values.customer,'Private');assert.deepEqual(migrated.documents,[]);
 const copy=cloneWorkspace(migrated);assert.deepEqual(copy.records,[]);assert.notEqual(copy.config.id,migrated.config.id);
 const full=cloneWorkspace(migrated,{includeRecords:true});assert.equal(full.records.length,1);assert.notEqual(full.records[0].id,'old');
});
test('release ZIP contains independent source, backend schema and build scripts without secrets or runtime files',async()=>{
 const zip=await JSZip.loadAsync(await readFile(new URL('../public/releases/source.zip',import.meta.url)));
 for(const file of ['package.json','package-lock.json','src/App.jsx','src/export.js','src/DocumentView.jsx','src/navigation.js','src/VisualHome.jsx','src/NavigationShell.jsx','src/FollowUpSchedule.jsx','src/v4.css','src/templates.js','src/proposals.js','src/TemplateStudio.jsx','src/HelpCenter.jsx','tests/templates-v3.test.js','scripts/prepare.mjs','supabase.sql','database/001-workspaces-and-private-documents.sql','README.md'])assert.ok(zip.file(file),file);
 assert.ok(!Object.keys(zip.files).some((name)=>/node_modules|^dist\/|\.env\.local|^public\/ocr\//.test(name)));
});
