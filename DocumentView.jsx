import {useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Hand,MousePointer2,RectangleHorizontal,Circle,ZoomIn,ZoomOut} from 'lucide-react';
import {Button} from './ui.jsx';
import {moveRegion,normalizedPoint,resizeRegion,selectionBetween} from './geometry.js';
const colors=['#4f46e5','#15803d','#d97706','#0891b2','#db2777','#7c3aed'];
export default function DocumentView({doc,regions=[],fields=[],selected,onSelect=()=>{},onRegions=()=>{},onCreate,disabled=false}) {
  const[page,setPage]=useState(1),[zoom,setZoom]=useState(100),[tool,setTool]=useState('rectangle'),[draft,setDraft]=useState(null);const gesture=useRef(null),scrollRef=useRef(null);
  if(!doc)return <div className="document-placeholder">Upload a sample document to begin.</div>;
  if(doc.kind==='text')return <div className="text-document">{doc.limitation&&<p className="info-box">{doc.limitation}</p>}<pre>{doc.text}</pre></div>;
  if(doc.kind==='table'){const sheet=doc.sheets[0];return <div className="table-scroll"><table><thead><tr>{sheet.headers.map((h)=><th key={h}>{h}</th>)}</tr></thead><tbody>{sheet.rows.slice(0,8).map((r,i)=><tr key={i}>{sheet.headers.map((h)=><td key={h}>{r[h]}</td>)}</tr>)}</tbody></table></div>;}
  const current=doc.pages[Math.min(page,doc.pages.length)-1];
  const point=(event)=>normalizedPoint(event.clientX,event.clientY,event.currentTarget.getBoundingClientRect());
  return <div className="document-view"><div className="document-toolbar"><div className="inline-actions"><Button title="Previous page" aria-label="Previous page" disabled={page===1} onClick={()=>setPage(page-1)} icon={ChevronLeft}/><span>Page {page} / {doc.pages.length}</span><Button aria-label="Next page" disabled={page===doc.pages.length} onClick={()=>setPage(page+1)} icon={ChevronRight}/></div><div className="inline-actions"><Button aria-label="Zoom out" icon={ZoomOut} disabled={zoom<=50} onClick={()=>setZoom(zoom-25)}/><span>{zoom}%</span><Button aria-label="Zoom in" icon={ZoomIn} disabled={zoom>=250} onClick={()=>setZoom(zoom+25)}/></div>{onCreate&&<div className="inline-actions">{[['rectangle','Rectangle',RectangleHorizontal],['ellipse','Circle / ellipse (optional)',Circle],['select','Move selections',MousePointer2],['pan','Pan document',Hand]].map(([id,label,Icon])=><Button key={id} kind={tool===id?'primary':''} title={label} aria-label={label} aria-pressed={tool===id} icon={Icon} onClick={()=>setTool(id)}/>)}</div>}</div>
  <div className={`document-scroll tool-${tool}`} ref={scrollRef}><div className="image-stage" style={{width:`${zoom}%`,aspectRatio:`${current.width}/${current.height}`}}><img src={current.url} alt={`${doc.name}, page ${page}`} draggable={false}/><svg style={{touchAction:onCreate?'none':'auto',pointerEvents:onCreate?'auto':'none'}} aria-label="Document field selection canvas" viewBox="0 0 1000 1000" preserveAspectRatio="none" onPointerDown={(event)=>{
    if(disabled||!onCreate)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);const p=point(event);const target=event.target.closest('[data-region]');const region=target&&regions.find((r)=>r.id===target.dataset.region);
    if(tool==='pan'){gesture.current={mode:'pan',cx:event.clientX,cy:event.clientY,left:scrollRef.current.scrollLeft,top:scrollRef.current.scrollTop};return;}
    if(region){onSelect(region.id);gesture.current={mode:event.target.dataset.resize?'resize':'move',region,start:p};}
    else if(['rectangle','ellipse'].includes(tool)){gesture.current={mode:'draw',start:p};setDraft({...p,width:0,height:0,shape:tool});}
  }} onPointerMove={(event)=>{
    const g=gesture.current;if(!g)return;const p=point(event);
    if(g.mode==='pan'){scrollRef.current.scrollLeft=g.left+g.cx-event.clientX;scrollRef.current.scrollTop=g.top+g.cy-event.clientY;return;}
    if(g.mode==='draw')setDraft({...selectionBetween(g.start,p),shape:tool});
    else onRegions(regions.map((r)=>r.id===g.region.id?(g.mode==='resize'?resizeRegion(g.region,p):moveRegion(g.region,p.x-g.start.x,p.y-g.start.y)):r));
  }} onPointerUp={(event)=>{
    const g=gesture.current;gesture.current=null;if(!g)return;
    if(g.mode==='draw'){const region={...selectionBetween(g.start,point(event)),shape:tool,page,aspectRatio:current.width/current.height};if(region.width>0.005&&region.height>0.005)onCreate(region);setDraft(null);}
  }} onPointerCancel={()=>{gesture.current=null;setDraft(null);}}>
    {regions.filter((r)=>r.page===page).map((r,i)=>{const color=colors[i%colors.length];const active=selected===r.id;return <g key={r.id} data-region={r.id} style={{color}}>{r.shape==='ellipse'?<ellipse cx={(r.x+r.width/2)*1000} cy={(r.y+r.height/2)*1000} rx={r.width*500} ry={r.height*500} className={active?'region active':'region'}/>:<rect x={r.x*1000} y={r.y*1000} width={r.width*1000} height={r.height*1000} className={active?'region active':'region'}/>}<text x={r.x*1000+4} y={Math.max(18,r.y*1000-6)} className="region-label">{fields.find((f)=>f.id===r.fieldId)?.label||'Assign a field'}</text>{active&&<rect data-resize="true" x={(r.x+r.width)*1000-9} y={(r.y+r.height)*1000-9} width="18" height="18" className="resize-handle"/>}</g>;})}
    {draft&&(draft.shape==='ellipse'?<ellipse className="region draft" cx={(draft.x+draft.width/2)*1000} cy={(draft.y+draft.height/2)*1000} rx={draft.width*500} ry={draft.height*500}/>:<rect className="region draft" x={draft.x*1000} y={draft.y*1000} width={draft.width*1000} height={draft.height*1000}/>)}
  </svg></div></div>{onCreate&&<p className="canvas-help">Drag to draw a rectangle. Drag a selection to move it; drag its corner to resize. Coordinates are saved relative to the page, independent of zoom.</p>}</div>;
}
