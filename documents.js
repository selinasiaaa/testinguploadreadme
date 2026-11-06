import {extractFields,normalizeField} from './domain.js';
import {layoutWarnings,textInRegion} from './geometry.js';
export const acceptedDocuments='.pdf,.docx,.xlsx,.csv,.png,.jpg,.jpeg,.webp,.bmp,.txt,.json';
const canvasPage=(canvas,boxes=[])=>({width:canvas.width,height:canvas.height,url:canvas.toDataURL('image/png'),boxes});
export async function openDocument(file,progress=()=>{}) {
  if(file.size>15*1024*1024)throw new Error('Choose a document smaller than 15 MB.');
  const ext=file.name.split('.').pop().toLowerCase();progress(`Opening ${file.name}…`);
  if(ext==='pdf') {
    const pdfjs=await import('pdfjs-dist');const {default:workerUrl}=await import('pdfjs-dist/build/pdf.worker.min.mjs?url');pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;
    const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false});
    try {
      const pdf=await task.promise;if(pdf.numPages>12)throw new Error('Use PDFs with 12 pages or fewer.');const pages=[];
      for(let number=1;number<=pdf.numPages;number++) {
        progress(`Rendering page ${number} of ${pdf.numPages}…`);const page=await pdf.getPage(number),natural=page.getViewport({scale:1}),viewport=page.getViewport({scale:Math.min(1.8,1800/natural.width,2400/natural.height)});
        const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
        const content=await page.getTextContent();const boxes=content.items.filter((i)=>i.str?.trim()).map((i)=>{const tx=pdfjs.Util.transform(viewport.transform,i.transform),h=Math.hypot(tx[2],tx[3]);const ctx=canvas.getContext('2d');ctx.font=`${h}px ${content.styles[i.fontName]?.fontFamily||'sans-serif'}`;const widths=Array.from({length:i.str.length+1},(_,n)=>ctx.measureText(i.str.slice(0,n)).width);const measured=widths[widths.length-1]||1;return{text:i.str,x:tx[4]/canvas.width,y:(tx[5]-h)/canvas.height,width:i.width*viewport.scale/canvas.width,height:h/canvas.height,charEdges:widths.map((w)=>w/measured)};});
        pages.push(canvasPage(canvas,boxes));page.cleanup();canvas.width=0;canvas.height=0;
      }return{kind:'visual',name:file.name,pages};
    }finally{await task.destroy();}
  }
  if(['png','jpg','jpeg','webp','bmp'].includes(ext)) {
    const image=await createImageBitmap(file),scale=Math.min(1,2400/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=image.width*scale;canvas.height=image.height*scale;canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);image.close();return{kind:'visual',name:file.name,pages:[canvasPage(canvas)]};
  }
  if(ext==='json'){const parsed=JSON.parse(await file.text());const records=Array.isArray(parsed)?parsed:Array.isArray(parsed.records)?parsed.records:[parsed];if(!records.length||records.some((r)=>!r||typeof r!=='object'||Array.isArray(r)))throw new Error('Use a structured proposal object or records array.');return {kind:'structured',name:file.name,structured:records[0],records,text:JSON.stringify(records,null,2)};}
  if(ext==='docx'){
    const mammoth=await import('mammoth/mammoth.browser.js');const bytes=await file.arrayBuffer();const result=await mammoth.extractRawText({arrayBuffer:bytes});
    const {default:JSZip}=await import('jszip');const zip=await JSZip.loadAsync(bytes);const xml=await zip.file('word/document.xml').async('string');
    const tree=new DOMParser().parseFromString(xml,'application/xml'),ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const tables=Array.from(tree.getElementsByTagNameNS(ns,'tbl')).map((table)=>{const rows=Array.from(table.children).filter((n)=>n.localName==='tr').map((row)=>Array.from(row.children).filter((n)=>n.localName==='tc').map((cell)=>Array.from(cell.getElementsByTagNameNS(ns,'p')).map((p)=>Array.from(p.getElementsByTagNameNS(ns,'t')).map((t)=>t.textContent).join('')).join('\n')));return {title:rows[0]?.join(' ')||'',rows};});
    return {kind:'text',name:file.name,text:result.value,tables,limitation:'DOCX text and table extraction are supported. Export to PDF for exact visual region selection.'};
  }
  if(ext==='txt')return{kind:'text',name:file.name,text:await file.text()};
  if(ext==='csv'){const{default:Papa}=await import('papaparse');const result=Papa.parse(await file.text(),{skipEmptyLines:'greedy'});if(result.errors.length)throw new Error(result.errors[0].message);return{kind:'table',name:file.name,sheets:[tableSheet('CSV',result.data)]};}
  if(ext==='xlsx') {
    const{default:ExcelJS}=await import('exceljs/dist/exceljs.min.js');const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(await file.arrayBuffer());
    const sheets=workbook.worksheets.map((sheet)=>{if(sheet.rowCount>5001||sheet.columnCount>100)throw new Error('Use at most 5,000 rows and 100 columns.');const rows=[];sheet.eachRow({includeEmpty:true},(row)=>rows.push(Array.from({length:sheet.columnCount},(_,i)=>{const c=row.getCell(i+1);return c.value instanceof Date?c.value.toISOString().slice(0,10):c.text;})));return tableSheet(sheet.name,rows);});if(!sheets.length)throw new Error('Workbook is empty.');return{kind:'table',name:file.name,sheets};
  }
  throw new Error('Supported: PDF, DOCX, XLSX, CSV, PNG, JPG, WebP, BMP and TXT. Save legacy .xls as .xlsx first.');
}
export function tableSheet(name,rows){if(!rows.length||!rows[0].length)throw new Error('Document is empty.');if(rows.length>5001||rows[0].length>100)throw new Error('Use at most 5,000 data rows and 100 columns.');const headers=rows[0].map((v,i)=>String(v??'').trim()||`Column ${i+1}`);if(new Set(headers).size!==headers.length)throw new Error('Column headings must be unique.');return{name,headers,rows:rows.slice(1).filter((r)=>r.some((v)=>String(v??'').trim())).map((r)=>Object.fromEntries(headers.map((h,i)=>[h,String(r[i]??'')])))};}
export function mapRow(row,mappings,fields){return Object.fromEntries(fields.map((f)=>[f.id,normalizeField(row[mappings[f.id]]??'',f.type)]));}
const timeout=(promise,ms,message)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(message)),ms);promise.then((v)=>{clearTimeout(timer);resolve(v);},(e)=>{clearTimeout(timer);reject(e);});});
export async function recognize(image,language='eng',progress=()=>{}) {
  const{createWorker}=await import('tesseract.js');let worker,expired=false;const base=new URL(`${import.meta.env.BASE_URL}ocr/`,location.origin).href;
  const pending=createWorker(language,1,{workerPath:`${base}worker.min.js`,corePath:base,langPath:base,workerBlobURL:false,logger:(e)=>progress(`OCR: ${e.status} ${Math.round((e.progress||0)*100)}%`)});pending.then((late)=>{if(expired)late.terminate();},()=>{});
  try{worker=await timeout(pending,60000,'OCR assets did not load. Restart with npm run dev or rebuild/redeploy the complete app.');const result=await timeout(worker.recognize(image),90000,'OCR timed out. Try a smaller selection.');return{text:result.data.text,confidence:result.data.confidence};}
  catch(e){if(/fetch|network|importScripts/i.test(e.message))throw new Error('OCR files could not load from this website. Rebuild and redeploy the complete dist folder, including /ocr assets.');throw e;}
  finally{expired=true;if(worker)await worker.terminate();}
}
async function pageCanvas(page){const image=new Image();image.src=page.url;await image.decode();const canvas=document.createElement('canvas');canvas.width=page.width;canvas.height=page.height;canvas.getContext('2d').drawImage(image,0,0);return canvas;}
export async function readRegion(doc,region,language,progress){const page=doc.pages[region.page-1];if(!page)return{text:'',confidence:0,method:'missing page'};const direct=textInRegion(page.boxes||[],region);if(direct)return{text:direct.replace(/^[\s:|]+/,''),confidence:100,method:'PDF text'};const source=await pageCanvas(page),crop=document.createElement('canvas');crop.width=Math.max(1,Math.round(region.width*page.width));crop.height=Math.max(1,Math.round(region.height*page.height));const ctx=crop.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,crop.width,crop.height);if(region.shape==='ellipse'){ctx.save();ctx.beginPath();ctx.ellipse(crop.width/2,crop.height/2,crop.width/2,crop.height/2,0,0,Math.PI*2);ctx.clip();}ctx.drawImage(source,region.x*page.width,region.y*page.height,crop.width,crop.height,0,0,crop.width,crop.height);if(region.shape==='ellipse')ctx.restore();return{...await recognize(crop,language,progress),method:'OCR'};}
export async function extractDocument(doc,config,template,language,progress=()=>{}) {
  if(doc.kind==='table')throw new Error('Use column mapping for spreadsheets.');const values={},warnings=[],results=[];
  if(template?.regions?.length&&doc.kind==='visual') {
    warnings.push(...layoutWarnings(doc,template));
    for(const region of template.regions){const field=config.fields.find((f)=>f.id===region.fieldId);if(!field)continue;progress(`Extracting ${field.label}…`);const result=await readRegion(doc,region,language,progress);values[field.id]=normalizeField(result.text,field.type);results.push({...result,fieldId:field.id});if(!values[field.id]||result.confidence<70)warnings.push(`Review ${field.label}: missing or uncertain text.`);}
    warnings.push('Region templates assume the same layout. Verify every value.');
  }else{let text=doc.text||'';if(doc.kind==='visual')for(const p of doc.pages)text+='\n'+(p.boxes.length?textInRegion(p.boxes,{x:0,y:0,width:1,height:1}):(await recognize(p.url,language,progress)).text);Object.assign(values,extractFields(text,config.fields,template));}
  return{values,warnings,results};
}

export async function getDocumentText(doc,language='eng',progress=()=>{}){if(doc.text)return doc.text;const parts=[];for(const p of doc.pages||[])parts.push(p.boxes?.length?p.boxes.slice().sort((a,b)=>Math.abs(a.y-b.y)<.008?a.x-b.x:a.y-b.y).map((b)=>b.text).join('\n'):(await recognize(p.url,language,progress)).text);return parts.join('\n\n');}
