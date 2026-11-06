import {clientOutcome,clientOutcomes,applyClientOutcome} from './workflow.js';
import {defaultValues,emptyModules,recordConfig,snapshotRecord,templateFields} from './templates.js';
import {validateModuleFees} from './proposals.js';
import {ModuleReview} from './ServiceModules.jsx';
import RecordDetailsV3 from './RecordDetailsV3.jsx';
import {scheduleStart,displayValue} from './domain.js';

import { useEffect, useId, useRef, useState } from 'react';

import { ArrowDownToLine, ArrowRight, ArrowUpRight, Bell, Building2, CalendarDays, Check, CheckCircle2, ChevronRight, CircleHelp, Cloud, Copy, Download, FileScan, FileText, FolderOpen, LayoutDashboard, ListFilter, LoaderCircle, Mail, MessageCircle, Plus, Search, Settings2, Sparkles, Trash2, Upload, X } from 'lucide-react';

import initialConfig from '../dashboard-config.json';

import { addDays, clone, csv, extractFields, formatDate, makeSchedule, nextStep, recordStatus, renderMessage, today, uid, validateConfig, validateWorkspace } from './domain.js';

import { download, loadState, saveState, slug } from './storage.js';

import { cloud, listCloud, pushCloud, deleteCloudWorkspace } from './cloud.js';



import { Label, Button, Empty, Modal, FileInput, FieldInput } from './ui.jsx';

const statusNames = { overdue: 'Overdue', today: 'Due today', upcoming: 'Upcoming', completed: 'Completed', won: 'Won', lost: 'Lost', paused: 'Paused', paid: 'Paid', replied: 'Replied', cancelled: 'Cancelled' };

export function RecordEditor({ config:workspaceConfig, record, onClose, onSave }) {
 const [templateId,setTemplateId]=useState(record?.templateId||'');
 const template=record?.templateSnapshot||workspaceConfig.templates.find((t)=>t.id===templateId);
 const config=record?recordConfig(record,workspaceConfig):template?{...workspaceConfig,fields:templateFields(template,workspaceConfig),cadence:template.workflow||workspaceConfig.cadence}:workspaceConfig;


 const [draft,setDraft]=useState(()=>record?clone(record):{id:uid(),title:'',owner:'',startedOn:today(),values:defaultValues(config.fields),serviceModules:emptyModules(template,true),outcome:'open',notes:'',history:[],schedule:[]});

 const [rebuild,setRebuild]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [firstDate,setFirstDate]=useState(''),[skipWeekends,setSkipWeekends]=useState(!!config.cadence.skipWeekends);
 const initialDraft=useRef(JSON.stringify(draft));const changed=JSON.stringify(draft)!==initialDraft.current||rebuild||!!firstDate||skipWeekends!==!!config.cadence.skipWeekends;
 const closeEditor=()=>{if(!busy&&(!changed||window.confirm('Discard unsaved record changes?')))onClose();};
 useEffect(()=>{if(!changed)return;const guard=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[changed]);
 const cadence={...config.cadence,firstDate,skipWeekends};
 const change=(key,value)=>setDraft((d)=>({...d,[key]:value}));let preview=[],previewError='';try{preview=record&&!rebuild?record.schedule:makeSchedule(scheduleStart(draft,config.cadence),cadence);}catch(e){previewError=e.message;}

 return <Modal title={record?'Edit record':'Create follow-up record'} wide onClose={closeEditor}><form onSubmit={async(e)=>{

  e.preventDefault();setBusy(true);setError('');try{

   const next=clone(draft);if(!record&&template)Object.assign(next,snapshotRecord(template,workspaceConfig));validateModuleFees(template,next.serviceModules||[]);next.title=next.title.trim();if(!next.title)throw new Error('Enter a record title.');

   for(const f of config.fields)if(f.required&&(!next.values[f.id]||(Array.isArray(next.values[f.id])&&!next.values[f.id].length)||(f.type==='checkbox'&&next.values[f.id]!=='true')))throw new Error(`${f.label} is required.`);

   if(!record||rebuild)next.schedule=makeSchedule(scheduleStart(next,config.cadence),cadence);

   next.history.push({id:uid(),at:new Date().toISOString(),text:record?rebuild?'Details updated and sequence regenerated.':'Record details updated.':'Record created with follow-up schedule.'});validateWorkspace({config:workspaceConfig,records:[next]});await onSave(next);

  }catch(e){setError(e.message);}finally{setBusy(false);}

 }}><div className="modal-body">{!record&&<label className="block-field"><Label>Follow-up template</Label><select value={templateId} onChange={(e)=>{const id=e.target.value,t=workspaceConfig.templates.find((t)=>t.id===id);setTemplateId(id);setDraft((d)=>({...d,values:defaultValues(templateFields(t,workspaceConfig)),serviceModules:emptyModules(t,true)}));}}><option value="">Workspace default</option>{workspaceConfig.templates.filter((t)=>!t.status||t.status==='active').map((t)=><option key={t.id} value={t.id}>{t.name} (v{t.version||1})</option>)}</select></label>}<div className="form-grid"><label className="span-2"><Label>Record title *</Label><input autoFocus required value={draft.title} onChange={(e)=>change('title',e.target.value)}/></label><label><Label>Owner / person in charge</Label><input value={draft.owner||''} onChange={(e)=>change('owner',e.target.value)}/></label><label><Label>Record start date *</Label><input type="date" onInput={(e)=>change('startedOn',e.currentTarget.value)} required value={draft.startedOn} onChange={(e)=>change('startedOn',e.target.value)}/></label>{config.fields.map((f)=><label key={f.id}><Label>{f.label}{f.required?' *':''}</Label><FieldInput field={f} value={draft.values[f.id]||''} required={f.required} disabled={!!record&&f.editable===false} onChange={(value)=>setDraft((previous)=>({...previous,values:{...previous.values,[f.id]:value}}))}/></label>)}<label><Label>Outcome</Label><select value={draft.outcome} onChange={(e)=>setDraft(d=>{const n=clone(d);n.outcome=e.target.value;delete n.clientOutcome;return n;})}>{['open','paused','completed','paid','replied','cancelled','won','lost'].map((s)=><option value={s} key={s}>{s[0].toUpperCase()+s.slice(1)}</option>)}</select></label><label className="span-2"><Label>Internal notes / remarks</Label><textarea value={draft.notes||''} onChange={(e)=>change('notes',e.target.value)}/></label></div>{template?.modules?.length>0&&<ModuleReview template={template} modules={draft.serviceModules||[]} onChange={(modules)=>change('serviceModules',modules)}/>} {record&&<label className="check-label rebuild"><input type="checkbox" checked={rebuild} onChange={(e)=>setRebuild(e.target.checked)}/>Regenerate sequence with the current rule (clears completion marks)</label>}<div className="form-grid"><label><Label>First follow-up date (optional override)</Label><input type="date" disabled={!!record&&!rebuild} value={firstDate} onInput={e=>setFirstDate(e.currentTarget.value)} onChange={e=>setFirstDate(e.target.value)}/></label><label className="check-label"><input type="checkbox" disabled={!!record&&!rebuild} checked={skipWeekends} onChange={e=>setSkipWeekends(e.target.checked)}/>Move weekends to Monday</label></div><h3>Follow-up schedule preview</h3>{previewError?<p className="info-box">{previewError}</p>:<ol className="schedule-preview">{preview.map((s)=><li key={s.id}><strong>{s.title}</strong><span>{s.due}</span></li>)}</ol>}{error&&<p role="alert" className="error-text">{error}</p>}</div><div className="modal-foot"><span className="muted">{changed?'Unsaved changes':'No unsaved changes'}</span><Button onClick={closeEditor} disabled={busy}>Cancel</Button><Button type="submit" kind="primary" disabled={busy}>{busy?'Saving…':record?'Save changes':'Create record & schedule'}</Button></div></form></Modal>;

}



export function RecordDetail(props){return <RecordDetailsV3 {...props}/>;}

export function CloudPanel({ workspace, revisions, onClose, backup, importBackup, notify, confirm, onRevision, onLoad }) {

  const [session, setSession] = useState(null);

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [entries, setEntries] = useState([]);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState('');

  const [actionState, setActionState] = useState('');

  const key = `${session?.user?.id}:${workspace.config.id}`;

  const revision = revisions[key];

  useEffect(() => {

    if (!cloud) return;

    cloud.auth.getSession().then(({ data }) => setSession(data.session));

    const { data } = cloud.auth.onAuthStateChange((_event, value) => { setSession(value); setEntries([]); });

    return () => data.subscription.unsubscribe();

  }, []);

  const action = async (fn) => { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); } };

  return <Modal title="Cloud & backup" onClose={onClose}><div className="modal-body cloud-panel"><div className="section-head"><span className="section-icon"><Download size={21} /></span><div><h3>A copy you control</h3><p>Backups include this company’s setup, records, and follow-up details.</p></div></div><div className="inline-actions wrap"><Button icon={Download} onClick={backup}>Download JSON backup</Button><FileInput accept=".json" onFile={importBackup}>Restore backup</FileInput></div><div className="info-box">Browser storage survives reloads on this device and website address. Clearing site data removes it. Deploying to Vercel does not upload these records; use backups or the optional cloud connection.</div><hr /><div className="section-head"><span className="section-icon"><Cloud size={21} /></span><div><h3>Optional Supabase sync</h3><p>Sign in to access the same cloud workspace on your other devices.</p></div></div>{!cloud ? <><p>Cloud storage is not configured. The dashboard is saving locally.</p><ol className="compact-list"><li>Create a Supabase project and run <code>supabase.sql</code> from your source folder.</li><li>Create your email/password user in Supabase Authentication.</li><li>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to <code>.env.local</code> or Vercel environment variables.</li><li>Restart the local server or redeploy, then sign in here.</li></ol><p className="muted">Use only the publishable/anon key in the app. Never add a service-role or secret key. The included database policies separate accounts.</p></> : !session ? <form onSubmit={(event) => { event.preventDefault(); action(async () => { const { error } = await cloud.auth.signInWithPassword({ email, password }); if (error) throw error; setPassword(''); }); }}><label className="block-field"><Label>Email</Label><input required type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></label><label className="block-field"><Label>Password</Label><input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label><Button kind="primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button><p className="muted">Create the user in your Supabase Authentication dashboard first.</p></form> : <><div className="signed-in"><span>{session.user.email}</span><Button disabled={busy} onClick={() => action(async () => { const { error } = await cloud.auth.signOut(); if (error) throw error; })}>Sign out</Button></div><div className="info-box">Sync is manual. Push this company after making changes; load its cloud copy on another device before editing. A revision check prevents overwriting newer cloud changes.</div><p className="muted">{revision ? `Last cloud revision: ${revision.revision}. ${revision.localAt === workspace.updatedAt ? 'Local copy matches your last sync.' : 'You have local changes since your last sync.'}` : 'This company has not been synced by this account on this browser.'}</p><div className="inline-actions wrap"><Button kind="primary" icon={Cloud} disabled={busy} onClick={() => action(async () => { const result = await pushCloud(workspace, revision?.revision || 0); const number=result.revision; await onRevision(key, { revision: number, at: new Date().toISOString(), localAt: workspace.updatedAt }); setActionState(result.warning||'Workspace and original documents pushed to cloud.'); notify('Company records and setup saved to your Supabase account.'); })}>Push this company</Button><Button disabled={busy} onClick={() => action(async () => { setEntries(await listCloud()); setActionState('Cloud list refreshed.'); })}>List cloud companies</Button></div><div className="cloud-entries">{entries.map((entry) => <div key={entry.id}><div><strong>{entry.payload?.config?.company?.name || entry.id}</strong><small>Revision {entry.revision} · {new Date(entry.updated_at).toLocaleString('en-MY')}</small></div><Button disabled={busy} onClick={() => confirm('Load cloud company?', 'This replaces the matching company on this device. Download a JSON backup first if you have local changes you want to keep.', () => action(async () => { await onLoad(entry, `${session.user.id}:${entry.id}`); setActionState('Cloud company loaded.'); notify('Cloud company loaded and saved on this device.'); }), 'Load cloud copy')}>Load</Button><Button kind="text-danger" disabled={busy} onClick={()=>confirm('Delete cloud workspace?','Permanently delete this account’s cloud workspace and its private originals? Local copies stay on each device. Download a backup first.',()=>action(async()=>{await deleteCloudWorkspace(entry);setEntries(await listCloud());setActionState('Cloud workspace deleted.');}),'Delete cloud copy',true)}>Delete cloud copy</Button></div>)}</div></>}{busy && <p className="progress"><LoaderCircle size={16} className="spin" />Working…</p>}{actionState && <p role="status">{actionState}</p>}{error && <p role="alert" className="error-text">{error}</p>}</div><div className="modal-foot"><Button onClick={onClose}>Done</Button></div></Modal>;

}

