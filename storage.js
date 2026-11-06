const DB_NAME = 'company-followup-studio-v1';
export async function openStore() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => { const db=request.result; if(!db.objectStoreNames.contains('state'))db.createObjectStore('state'); if(!db.objectStoreNames.contains('files'))db.createObjectStore('files'); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Browser storage is unavailable. Enable site storage to continue.'));
  });
}
export async function loadState() {
  const db = await openStore();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('state').objectStore('state').get('workspace');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
export async function saveState(state, expectedRevision, fileOps = []) {
  const db = await openStore();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['state','files'], 'readwrite');
      let conflict = false;
      const store = tx.objectStore('state');
      const request = store.get('workspace');
      request.onsuccess = () => {
        if ((request.result?.storageRevision || 0) !== expectedRevision) {
          conflict = true;
          tx.abort();
        } else { store.put(state, 'workspace'); for(const op of fileOps) { if(op.delete)tx.objectStore('files').delete(op.id);else tx.objectStore('files').put(op.file,op.id); } }
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error(conflict ? 'Another tab changed this workspace. Reload this page to load its latest saved data before editing again.' : 'Could not save. Storage may be full. Download a backup before closing.'));
    });
  } finally { db.close(); }
}
export function download(name, content, type = 'application/json') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'company';

export async function getFile(id) {
 const db=await openStore();try{return await new Promise((resolve,reject)=>{const request=db.transaction('files').objectStore('files').get(id);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}finally{db.close();}
}
export async function backupWorkspace(workspace) {
 const attachments=[];
 for(const meta of workspace.documents||[]) {
  const file=await getFile(meta.id);if(!file)continue;
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read attachment.'));reader.readAsDataURL(file);});
  attachments.push({id:meta.id,data});
 }
 download(`${slug(workspace.config.workspace?.name||workspace.config.company.name)}-backup.json`,JSON.stringify({format:'followup-studio-backup',version:1,exportedAt:new Date().toISOString(),workspace,attachments}));
}
export async function backupFiles(parsed) {
 const ops=[];
 for(const attachment of parsed.attachments||[]) {
  const meta=parsed.workspace.documents?.find((d)=>d.id===attachment.id);if(!meta||typeof attachment.data!=='string'||!attachment.data.startsWith('data:'))throw new Error('Invalid backup attachment.');
  const [header,base64]=attachment.data.split(',');if(!header.endsWith(';base64')||!base64)throw new Error('Invalid attachment encoding.');
  const bytes=Uint8Array.from(atob(base64),(c)=>c.charCodeAt(0));if(bytes.length>15*1024*1024)throw new Error('Backup document exceeds 15 MB.');
  ops.push({id:meta.id,file:new File([bytes],meta.name,{type:meta.type})});
 }
 return ops;
}
