import { createClient } from '@supabase/supabase-js';
import {getFile} from './storage.js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const cloud = url && key ? createClient(url, key) : null;
export async function listCloud() {
  const { data, error } = await cloud.from('followup_workspaces').select('id, payload, revision, updated_at').order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}
export async function pushCloud(workspace, revision) {
  const {data:auth,error:authError}=await cloud.auth.getUser();
  if(authError||!auth.user)throw new Error('Sign in before syncing.');
  const previous=await cloud.from('followup_workspaces').select('payload').eq('id',workspace.config.id).maybeSingle();
  if(previous.error)throw previous.error;
  for(const meta of workspace.documents||[]){const file=await getFile(meta.id);if(!file)throw new Error(`Original ${meta.name} is missing locally. Load the cloud workspace before pushing.`);const upload=await cloud.storage.from('followup-documents').upload(documentPath(auth.user.id,workspace.config.id,meta.id),file,{upsert:true,contentType:meta.type||'application/octet-stream'});if(upload.error)throw new Error(`Document upload failed: ${upload.error.message}. Apply the V2 storage migration.`);}
  const { data, error } = await cloud.rpc('save_followup_workspace', { workspace_id: workspace.config.id, workspace_payload: workspace, expected_revision: revision });
  if (error) throw new Error(error.message.includes('conflict') ? 'Cloud copy changed on another device. Download a local backup, then load the cloud copy before editing again.' : error.message);
  const removed=(previous.data?.payload?.documents||[]).filter((d)=>!(workspace.documents||[]).some((current)=>current.id===d.id));
  let warning='';
  if(removed.length){const result=await cloud.storage.from('followup-documents').remove(removed.map((d)=>documentPath(auth.user.id,workspace.config.id,d.id)));if(result.error)warning='Workspace synced, but some removed files could not be cleaned up in private storage.';}
  return {revision:Number(data),warning};
}
const documentPath=(owner,workspace,id)=>`${owner}/${encodeURIComponent(workspace)}/${encodeURIComponent(id)}`;
export async function cloudDocumentFiles(workspace){const{data,error}=await cloud.auth.getUser();if(error||!data.user)throw new Error('Sign in to load cloud documents.');const files=[];for(const meta of workspace.documents||[]){const result=await cloud.storage.from('followup-documents').download(documentPath(data.user.id,workspace.config.id,meta.id));if(result.error)throw new Error(`Could not load ${meta.name}: ${result.error.message}`);files.push({id:meta.id,file:new File([result.data],meta.name,{type:meta.type})});}return files;}
export async function deleteCloudWorkspace(entry){const{data,error}=await cloud.auth.getUser();if(error||!data.user)throw new Error('Sign in first.');const deletion=await cloud.from('followup_workspaces').delete().eq('id',entry.id);if(deletion.error)throw deletion.error;const paths=(entry.payload.documents||[]).map((d)=>documentPath(data.user.id,entry.id,d.id));if(paths.length){const cleanup=await cloud.storage.from('followup-documents').remove(paths);if(cleanup.error)throw new Error('Cloud workspace deleted, but its private file cleanup failed. Remove orphaned files in Supabase Storage.');}}
