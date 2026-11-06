const clamp = (n, min, max) => Math.max(min,Math.min(max,n));
export function selectionBetween(a,b) { return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(a.x-b.x),height:Math.abs(a.y-b.y)}; }
export function normalizedPoint(clientX,clientY,bounds) { return {x:clamp((clientX-bounds.left)/bounds.width,0,1),y:clamp((clientY-bounds.top)/bounds.height,0,1)}; }
export function moveRegion(region,dx,dy) { return {...region,x:clamp(region.x+dx,0,1-region.width),y:clamp(region.y+dy,0,1-region.height)}; }
export function resizeRegion(region,point) { return {...region,width:clamp(point.x-region.x,0.005,1-region.x),height:clamp(point.y-region.y,0.005,1-region.y)}; }
export function textInRegion(boxes,region) {
  return boxes.filter((b)=>b.y+b.height/2>=region.y && b.y+b.height/2<=region.y+region.height && b.x<region.x+region.width && b.x+b.width>region.x).sort((a,b)=>Math.abs(a.y-b.y)<0.008?a.x-b.x:a.y-b.y).map((b)=>{
    const left=(region.x-b.x)/b.width,right=(region.x+region.width-b.x)/b.width;
    if(b.charEdges)return Array.from(b.text).filter((_,i)=>{const center=(b.charEdges[i]+b.charEdges[i+1])/2;return center>=left&&center<=right;}).join('');
    const start=Math.max(0,Math.round(left*b.text.length));
    const end=Math.min(b.text.length,Math.round(right*b.text.length));
    return b.text.slice(start,end);
  }).join(' ').trim();
}
export function layoutWarnings(doc,template) {
  const warnings=[];
  if(template.pageCount && template.pageCount!==doc.pages.length) warnings.push('Page count differs from the saved sample. Review every field.');
  if(template.layoutFingerprint) {
    const current=layoutFingerprint(doc);
    const reference=template.layoutFingerprint;
    const common=current.filter((point)=>reference.includes(point)).length;
    if(reference.length && common/Math.max(reference.length,current.length)<0.65) warnings.push('Text positions differ substantially from the saved sample. Check or rebuild the region mapping.');
  }
  for(const region of template.regions||[]) {
    const page=doc.pages[region.page-1];
    if(!page) warnings.push(`Page ${region.page} is missing.`);
    else if(region.aspectRatio && Math.abs(page.width/page.height-region.aspectRatio)>0.06) warnings.push(`Page ${region.page} proportions differ from the sample.`);
  }
  return [...new Set(warnings)];
}
export function layoutFingerprint(doc){return (doc.pages||[]).flatMap((page,i)=>(page.boxes||[]).map((b)=>`${i+1}:${b.x.toFixed(2)}:${b.y.toFixed(2)}`));}
