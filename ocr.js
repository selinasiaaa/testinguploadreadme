import {openDocument,recognize} from './documents.js';
import {textInRegion} from './geometry.js';
export {extractFields} from './domain.js';
export async function readDocument(file,progress=()=>{},language='eng') {
 const doc=await openDocument(file,progress);
 if(doc.kind==='text')return doc.text;
 if(doc.kind==='table')return doc.sheets[0].rows.map((r)=>Object.entries(r).map(([k,v])=>`${k}: ${v}`).join('\n')).join('\n\n');
 const parts=[];for(const p of doc.pages)parts.push(p.boxes.length?textInRegion(p.boxes,{x:0,y:0,width:1,height:1}):(await recognize(p.url,language,progress)).text);return parts.join('\n\n');
}
