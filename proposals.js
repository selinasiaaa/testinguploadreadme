import {extractFields,normalizeField,validDate} from './domain.js';
import {defaultValues,emptyModules,templateFields} from './templates.js';
export const selectionKey=(id)=>`module_${id}_selection`;
export const feeKey=(moduleId,fieldId)=>`module_${moduleId}_${fieldId}`;
export function extractionFields(template,config){return templateFields(template,config).concat((template?.modules||[]).flatMap((m)=>[{id:selectionKey(m.id),label:`${m.shortName||m.name} — selected checkbox`,type:'checkbox',source:'region',aliases:'',required:false,group:m.name},...m.fields.filter((f)=>f.enabled!==false).map((f)=>({...f,id:feeKey(m.id,f.id),required:false,group:m.name}))]));}
const escaped=(s)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const includesAlias=(text,alias)=>new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped(alias)}(?:$|[^\\p{L}\\p{N}])`,'iu').test(text);
const aliases=(value)=>Array.isArray(value)?value:String(value||'').split(',').map((v)=>v.trim()).filter(Boolean);
export function parseProposalDate(value){const direct=normalizeField(value,'date');if(direct)return direct;const match=String(value||'').match(/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i);if(!match)return '';const m=['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(match[2].toLowerCase())+1;const result=`${match[3]}-${String(m).padStart(2,'0')}-${match[1].padStart(2,'0')}`;return validDate(result)?result:'';}
export function feeProposalFields(text,fields){
 const values={};const lines=text.split(/\r?\n/).map((s)=>s.trim()).filter(Boolean);const salutation=lines.findIndex((s)=>/^Dear\s+(?:Sir|Madam)/i.test(s));const header=lines.slice(0,salutation>=0?salutation:20);
 const rules={customer:()=>header.find((s)=>/\b(?:SDN\.?\s+BHD\.?|BERHAD|LIMITED|LTD\.?|PTE\.?|LLP|PLT)\b/i.test(s)),contact:()=>header.find((s)=>/^(Ms\.?|Mr\.?|Mrs\.?|Dr\.?)\s+\p{L}/iu.test(s)),salutation:()=>salutation>=0?lines[salutation].replace(/[,;:]$/,''):'',proposal_date:()=>parseProposalDate(header.find((s)=>/^Date\s*:/i.test(s))||''),document_title:()=>lines.find((s)=>/^Proposal for\b/i.test(s))};
 for(const field of fields){const fn=rules[field.id];if(fn&&fn())values[field.id]=fn();}
 return values;
}
function rates(cell){return [...String(cell||'').matchAll(/(?:^|\n)\s*(?:RM|MYR)?\s*(\d[\d,]*(?:\.\d{1,2})?)(?:\*{1,2})?(?=\s*(?:$|\n|per\b))/gim)].map((m)=>normalizeField(m[1],'currency'));}
export function detectServices(text,template,{tables=[],structured=null,row=null,moduleColumns={},feeColumns={},regionValues={},regionMethods={},regionRaw={}}={}) {
 const modules=emptyModules(template);
 for(const result of modules){
  const module=template.modules.find((m)=>m.id===result.moduleId),names=aliases(module.aliases).concat(module.name);const matching=tables.filter((t)=>names.some((name)=>includesAlias(t.title||t.rows?.[0]?.join(' ')||'',name)));
  const mentioned=names.filter((name)=>includesAlias(text,name));
  if(mentioned.length||matching.length){result.detectedStatus=matching.length?'included_unconfirmed':'mentioned_unconfirmed';result.method=matching.length?'DOCX service table':'Keyword / label';result.confidence=matching.length?'High confidence of inclusion; selection unverified':'Mention only; selection unverified';result.evidence=(matching[0]?.title||mentioned[0]||'')+' — inclusion does not prove client acceptance.';}
  const declaration=structured?.modules?.find((m)=>m.id===module.id||m.moduleId===module.id);const selectedIds=structured?.selectedModules;
  let explicit=declaration?.selected;
  if(Array.isArray(selectedIds))explicit=selectedIds.includes(module.id);
  const column=moduleColumns[module.id]||module.sourceColumn;
  if(row&&column&&Object.hasOwn(row,column)){const value=String(row[column]).trim();if(/^(yes|true|1|selected|included|checked|x)$/i.test(value))explicit=true;else if(/^(no|false|0|excluded|unchecked)$/i.test(value))explicit=false;else{result.detectedStatus='uncertain';result.evidence=`Column ${column}: ${value||'(blank)'}`;}}
  const selection=regionRaw[selectionKey(module.id)];
  if(regionMethods[selectionKey(module.id)]&&selection!==undefined){if(/^(?:yes|true|1|checked|selected|☑|✓|✔|\[x\])$/i.test(String(selection).trim()))explicit=true;else if(/^(?:no|false|0|unchecked|excluded|☐|\[ \])$/i.test(String(selection).trim()))explicit=false;else{result.detectedStatus='uncertain';result.evidence='Selection region did not contain a reliable checked/unchecked value.';}result.method='Saved selection region';}
  if(explicit===undefined&&matching.some((t)=>t.rows.some((r)=>r.some((c)=>/☑|✓|✔|\[x\]/i.test(c))))){explicit=true;result.method='Explicit checked service row';result.evidence='A checked service row was found in the matching table. Verify the selected scope.';}
  const checkLine=text.split(/\r?\n/).find((line)=>names.some((name)=>includesAlias(line,name))&&/^[\s]*(?:☑|✓|✔|\[x\])/i.test(line));
  if(checkLine&&explicit===undefined){explicit=true;result.method='Explicit checked label';result.evidence=checkLine;}
  if(typeof explicit==='boolean'){result.selected=explicit;result.detectedStatus=explicit?'selected_explicit':'excluded_explicit';result.method=row&&column?'Mapped source column':regionMethods[selectionKey(module.id)]?'Saved selection region':result.method==='Explicit checked service row'?result.method:checkLine?'Explicit checked label':'Structured proposal data';result.confidence='Explicit source selection; review required';result.evidence=result.evidence||'Selected-module flag provided by the source.';}
  for(const fee of (module.fields||[]).filter((f)=>f.enabled!==false)){
   let value,method='',evidence='';const regionKey=feeKey(module.id,fee.id);
   if(regionMethods[regionKey]&&regionValues[regionKey]!==undefined&&regionValues[regionKey]!==''){value=regionValues[regionKey];method=regionMethods[regionKey]||'Saved region';}
   const structuredFee=declaration?.fees?.[fee.id]??structured?.fees?.[module.id]?.[fee.id];
   if(structuredFee!==undefined&&structuredFee!==null&&structuredFee!==''){value=structuredFee?.value??structuredFee;method='Structured proposal data';}
   const feeColumn=feeColumns[regionKey]||fee.sourceColumn;
   if(row&&feeColumn&&row[feeColumn]!==undefined&&row[feeColumn]!==''){value=row[feeColumn];method='Mapped source column';}
   if(value===undefined)for(const table of matching){
    const header=table.rows.find((r)=>r.some((c)=>/proposed\s*fees|fees\s*\(RM/i.test(c)));const index=header?.findIndex((c)=>/proposed\s*fees|fees\s*\(RM/i.test(c));if(index===undefined||index<0)continue;
    const matchingRow=table.rows.find((r)=>r!==header&&aliases(fee.aliases||fee.label).some((label)=>includesAlias(r.slice(0,index).join('\n'),label))&&rates(r[index]).length);
    if(matchingRow){const candidates=rates(matchingRow[index]);value=candidates[fee.rateIndex||0];if(value!==undefined){method='DOCX fee cell';evidence=matchingRow[index]+(matchingRow.join('\n').match(/Note[\s\S]{0,600}/i)?.[0]?' | '+matchingRow.join('\n').match(/Note[\s\S]{0,600}/i)[0]:'');break;}}
   }
   if(value===undefined)for(const label of aliases(fee.aliases||fee.label)){const match=text.match(new RegExp(`${escaped(label)}[ \\t]*[:=][ \\t]*(?:RM|MYR)?[ \\t]*([\\d,]+(?:\\.\\d{1,2})?)`,'i'));if(match){value=match[1];method='Exact fee label';evidence=match[0];break;}}
   if(value!==undefined&&value!==''){const normalized=normalizeField(value,fee.type);if(normalized!=='')result.fees[fee.id]={value:normalized,source:method,verified:false,evidence};}
  }
 }
 return modules;
}
export function resolveImport(template,config,{text='',values={},tables=[],structured=null,row=null,moduleColumns={},feeColumns={},regionMethods={},regionRaw={}}={}) {
 const fields=templateFields(template,config);
 const autoFields=fields.filter((f)=>!['manual','default','structured','table','region'].includes(f.source)||(f.type==='date'&&(f.id==='document_date'||/^document date$/i.test(f.label.trim()))));
 const result={...extractFields(text,autoFields,template),...(template?.extractionProfile==='fee-proposal'?feeProposalFields(text,autoFields):{}),...Object.fromEntries(Object.entries(values).filter(([id,v])=>v!==''&&v!==undefined&&(row||regionMethods[id]||!['manual','default','structured','table'].includes(fields.find((f)=>f.id===id)?.source))))};
 if(structured)Object.assign(result,structured.values||{});
 const provenance={};const resolved={};
 for(const f of fields){let value=result[f.id];let source=value!==undefined?'Document extraction':'Missing';if(value===undefined||value===''){if(f.defaultValue!==undefined&&f.defaultValue!==''&&f.defaultValue!=='@today'){value=f.defaultValue;source='Template default (not extracted)';}else value=['multiselect','table'].includes(f.type)?[]:'';}if(f.type==='date')value=parseProposalDate(value);else value=normalizeField(value,f.type);resolved[f.id]=value;provenance[f.id]={source,verified:false};}
 return {values:resolved,provenance,serviceModules:detectServices(text,template||{modules:[]},{tables,structured,row,moduleColumns,feeColumns,regionValues:values,regionMethods,regionRaw})};
}
export function confirmModules(modules){return modules.map((m)=>({...m,verified:true,verification:'Confirmed during review',fees:Object.fromEntries(Object.entries(m.fees||{}).map(([id,fee])=>[id,{...fee,verified:true}]))}));}
export function validateModuleFees(template,modules){for(const m of modules.filter((m)=>m.selected)){const definition=template?.modules?.find((t)=>t.id===m.moduleId);for(const f of (definition?.fields||[]).filter((f)=>f.enabled!==false)){const value=m.fees[f.id]?.value;if(f.required&&(value===undefined||value===''))throw new Error(`${m.name}: ${f.label} is required.`);if(value!==undefined&&value!==''&&['currency','number'].includes(f.type)&&!Number.isFinite(Number(value)))throw new Error(`${f.label} must be numeric.`);}}}
export function recommendTemplate(doc,templates){if(doc.structured?.templateId){const exact=templates.find((t)=>t.id===doc.structured.templateId&&t.status!=='archived');if(exact)return exact;}const name=doc.structured?.templateName;if(name){const exact=templates.find((t)=>t.name.toLowerCase()===name.toLowerCase()&&t.status!=='archived');if(exact)return exact;}const text=doc.text||'';const scored=templates.filter((t)=>t.status==='active'||!t.status).map((t)=>({t,score:(t.modules||[]).reduce((n,m)=>n+aliases(m.aliases).filter((a)=>includesAlias(text,a)).length,0)+(t.fields||[]).reduce((n,f)=>n+aliases(f.aliases).filter((a)=>includesAlias(text,a)).length,0)})).sort((a,b)=>b.score-a.score);return scored[0]?.score>=2?scored[0].t:null;}
