import {TodayQueue,BackupHealth,PerformanceReports} from './WorkflowViews.jsx';
import {mergeImported} from './workflow.js';
import VisualHome from './VisualHome.jsx';
import {CategorySidebar,TopNavigation,StatusBar} from './NavigationShell.jsx';
import FollowUpSchedule from './FollowUpSchedule.jsx';
import {readRoute,routePage,routeCategory,actionById} from './navigation.js';
import TemplateStudio from './TemplateStudio.jsx';
import HelpCenter from './HelpCenter.jsx';
import RecordsTable from './RecordsTable.jsx';
import {versionTemplates} from './templates.js';
import {useEffect,useRef,useState} from 'react';

import {BarChart3,Bell,Building2,CalendarDays,CheckCircle2,Cloud,Download,FileScan,FileText,FolderOpen,LayoutDashboard,Menu,Plus,Search,Settings2,Upload,X} from 'lucide-react';

import initialConfig from '../dashboard-config.json';

import {clone,csv,displayValue,nextStep,recordStatus,today,uid,upgradeWorkspace,validateConfig,validateWorkspace} from './domain.js';

import {backupFiles,backupWorkspace,download,loadState,saveState,slug} from './storage.js';

import {Button,Confirm,Empty,FileInput,Modal} from './ui.jsx';

import {CloudPanel,RecordDetail,RecordEditor} from './RecordPanels.jsx';

import TemplateBuilder from './TemplateBuilder.jsx';

import ImportDocuments from './ImportDocuments.jsx';

import WorkspaceManager from './WorkspaceManager.jsx';

import SettingsEditor from './SettingsEditor.jsx';

const statusNames={overdue:'Overdue',today:'Due today',upcoming:'Upcoming',completed:'Completed',won:'Won',lost:'Lost',paused:'Paused',paid:'Paid',replied:'Replied',cancelled:'Cancelled'};

const finished=['completed','won','paid','replied'];

export default function App(){

 const[visualTemplateId,setVisualTemplateId]=useState(''),[helpTopic,setHelpTopic]=useState('');
 const[smallScreen,setSmallScreen]=useState(()=>window.matchMedia('(max-width: 760px)').matches);
 useEffect(()=>{const media=window.matchMedia('(max-width: 760px)');const listener=()=>setSmallScreen(media.matches);media.addEventListener('change',listener);return()=>media.removeEventListener('change',listener);},[]);
 const[state,setState]=useState(null),[fatal,setFatal]=useState(''),[route,setRoute]=useState(()=>readRoute(window.location.hash)),[collapsed,setCollapsed]=useState(true),[mobileNav,setMobileNav]=useState(false),[editor,setEditor]=useState(null),[detail,setDetail]=useState(null),[notice,setNotice]=useState(null),[confirmation,setConfirmation]=useState(null),[showCloud,setShowCloud]=useState(false),[filter,setFilter]=useState('all'),[query,setQuery]=useState(''),[saving,setSaving]=useState(false),[exporting,setExporting]=useState(false),[exportProgress,setExportProgress]=useState(''),[dirty,setDirty]=useState(false),[clock,setClock]=useState(today());const stateRef=useRef(null),queue=useRef(Promise.resolve());

 const page=routePage(route);const routeRef=useRef(route),routeGuard=useRef(fn=>fn());routeRef.current=route;
 const setPage=(target)=>{const next=readRoute('#/'+(target==='dashboard'?'home':target));if(routeRef.current!==next){window.history.pushState(null,'','#/'+next);routeRef.current=next;}setRoute(next);};
 useEffect(()=>{window.history.replaceState(null,'','#/'+routeRef.current);const onHistory=()=>{const next=readRoute(window.location.hash);if(next===routeRef.current)return;const prior=routeRef.current;window.history.replaceState(null,'','#/'+prior);routeGuard.current(()=>{window.history.replaceState(null,'','#/'+next);routeRef.current=next;setRoute(next);setDetail(null);setEditor(null);setMobileNav(false);});};window.addEventListener('popstate',onHistory);window.addEventListener('hashchange',onHistory);return()=>{window.removeEventListener('popstate',onHistory);window.removeEventListener('hashchange',onHistory);};},[]);
 useEffect(()=>{if(route==='record-create'&&state?.activeId)setEditor({});},[route,state?.activeId]);
 useEffect(()=>{document.title=`${actionById(route)?.label||'Home'} · FollowUp Workspace V5`;},[route]);

 useEffect(()=>{loadState().then((saved)=>{if(saved&&(saved.version!==1||!Array.isArray(saved.workspaces)))throw new Error('Saved state is unsupported. Existing data has not been reset.');const next=saved||{version:1,activeId:initialConfig.id,workspaces:[{config:clone(initialConfig),records:[],documents:[],updatedAt:new Date().toISOString()}],cloudRevisions:{}};next.workspaces=next.workspaces.map(upgradeWorkspace);next.workspaces.forEach(validateWorkspace);next.cloudRevisions||={};stateRef.current=next;setState(next);if(!next.workspaces.length)setPage('workspaces');}).catch((e)=>setFatal(e.message));const timer=setInterval(()=>setClock(today()),30000);return()=>clearInterval(timer);},[]);

 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(null),8000);return()=>clearTimeout(t);},[notice]);

 useEffect(()=>{if(!dirty)return;const handler=(e)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler);},[dirty]);

 const notify=(text,error=false)=>setNotice({text,error});

 const run=async(fn)=>{try{return await fn();}catch(e){notify(e.message||'The operation failed.',true);}};

 const commit=(change,files=[])=>{const task=queue.current.catch(()=>{}).then(async()=>{setSaving(true);try{const next=clone(stateRef.current);change(next);next.workspaces.forEach(validateWorkspace);const expected=stateRef.current.storageRevision||0;next.storageRevision=expected+1;await saveState(next,expected,files);stateRef.current=next;setState(next);}finally{setSaving(false);}});queue.current=task;return task;};

 const confirm=(title,message,action,label='Continue',danger=false)=>setConfirmation({title,message,action:()=>run(action),label,danger});

 const leave=(fn)=>{if(dirty)confirm('Discard unsaved changes?','Save your settings or template before leaving, or discard these unsaved edits.',()=>{setDirty(false);fn();},'Discard changes');else fn();};

 routeGuard.current=leave;
 const navigate=(target)=>leave(()=>{setPage(target);setDetail(null);setEditor(target==='record-create'?{}:null);setMobileNav(false);window.scrollTo({top:0});});

 if(fatal)return <main className="boot"><h1>Storage needs attention</h1><p>{fatal}</p><p>Enable browser storage and reload. No saved data was deleted.</p></main>;

 if(!state)return <main className="boot"><h1>Opening FollowUp Workspace…</h1></main>;

 const workspace=state.workspaces.find((w)=>w.config.id===state.activeId)||state.workspaces[0];const config=workspace?.config||upgradeWorkspace({config:clone(initialConfig),records:[]}).config;const records=workspace?.records||[];

 const updateWorkspace=(fn,files=[])=>commit((next)=>{const target=next.workspaces.find((w)=>w.config.id===workspace.config.id);if(!target)throw new Error('Workspace no longer exists.');fn(target);target.updatedAt=new Date().toISOString();},files);

 const switchWorkspace=(id,target='dashboard')=>leave(()=>run(async()=>{await commit((next)=>{next.activeId=id;});setPage(target);setDetail(null);setEditor(null);setFilter('all');setQuery('');setMobileNav(false);}));

 const fileMeta=(attachment)=>({id:attachment.id,name:attachment.file.name,type:attachment.file.type,size:attachment.file.size,sha256:attachment.sha256||'',lastModified:attachment.file.lastModified,purpose:attachment.purpose,templateId:attachment.templateId||'',createdAt:new Date().toISOString()});

 const saveConfig=async(updated,attachment)=>{validateConfig(updated);await updateWorkspace((w)=>{const revised=clone(updated);revised.templates=versionTemplates(w.config.templates,revised.templates);w.config=revised;if(attachment&&!w.documents.some((d)=>d.id===attachment.id))w.documents.push(fileMeta(attachment));},attachment?[{id:attachment.id,file:attachment.file}]:[]);setDirty(false);return stateRef.current.workspaces.find((w)=>w.config.id===workspace.config.id).config;};

 const saveRecord=async(record)=>{validateWorkspace({config,records:[record]});await updateWorkspace((w)=>{const index=w.records.findIndex((r)=>r.id===record.id);if(index<0)w.records.unshift(record);else w.records[index]=record;});};

 const backup=(w=workspace)=>run(async()=>{await backupWorkspace(w);await commit(next=>{const target=next.workspaces.find(x=>x.config.id===w.config.id);if(target)target.lastBackupAt=new Date().toISOString();});notify('Backup downloaded with records, templates and saved original documents.');});

 const restore=(file)=>run(async()=>{if(file.size>250*1024*1024)throw new Error('Use a backup smaller than 250 MB.');const parsed=JSON.parse(await file.text());if(parsed.format!=='followup-studio-backup'||parsed.version!==1)throw new Error('Choose a Follow-up Studio JSON backup.');const incoming=upgradeWorkspace(validateWorkspace(parsed.workspace));const ops=await backupFiles(parsed);confirm('Restore workspace backup?',`Restore “${incoming.config.workspace.name}” with ${incoming.records.length} records and ${ops.length} original files? A matching local workspace will be replaced.`,async()=>{await commit((next)=>{const i=next.workspaces.findIndex((w)=>w.config.id===incoming.config.id);if(i<0)next.workspaces.push(incoming);else next.workspaces[i]=incoming;next.activeId=incoming.config.id;},ops);setPage('dashboard');setDirty(false);setDetail(null);notify('Backup restored.');},'Restore backup');});

 const exportSource=()=>run(async()=>{setExporting(true);try{const{exportProject}=await import('./export.js');await exportProject(config,setExportProgress);notify('Complete source ZIP downloaded. Customer records and documents are excluded.');}finally{setExporting(false);}});

 const pending=records.filter((r)=>nextStep(r)),overdue=records.filter((r)=>recordStatus(r,clock)==='overdue'),complete=records.filter((r)=>finished.includes(recordStatus(r,clock)));

 const visibleFields=config.fields.filter((f)=>f.visible!==false);const detailRecord=records.find((r)=>r.id===detail);

 const filtered=records.filter((r)=>{const status=recordStatus(r,clock);return(filter==='all'||(filter==='pending'?!!nextStep(r):filter==='completed'?finished.includes(status):filter==='due'?['today','overdue'].includes(status):status===filter))&&`${r.title} ${r.owner||''} ${Object.values(r.values).join(' ')}`.toLowerCase().includes(query.toLowerCase());}).sort((a,b)=>(nextStep(a)?.due||'9999').localeCompare(nextStep(b)?.due||'9999'));

 const renderRecords=()=> <RecordsTable key={config.id} config={config} records={records} filter={route==='overdue'?'overdue':route==='completed'?'completed':filter} setFilter={(value)=>{setFilter(value);if(['overdue','completed'].includes(route))navigate('records');}} query={query} setQuery={setQuery} onOpen={setDetail} onBulk={async(ids,change)=>{await updateWorkspace(w=>{w.records.forEach(r=>{if(ids.includes(r.id))change(r);});});}} onSaveViews={async(views)=>{const next=clone(config);next.savedViews=views;await saveConfig(next);}} notify={notify} saving={saving} onSaveLayout={async(id,layout)=>{const next=clone(config);if(id){const template=next.templates.find((t)=>t.id===id);if(!template)throw new Error('This historical template is no longer configurable. Use the workspace layout.');template.tableLayout=layout;}else next.tableLayout=layout;await saveConfig(next);}}/>;
 const openVisual=(id)=>{setVisualTemplateId(id);navigate('templates');};
 const openHelp=(topic)=>{setHelpTopic(topic);navigate('help');};

 return <div className={`app-shell ${collapsed?'sidebar-collapsed':''} ${mobileNav?'mobile-nav-open':''}`} style={{'--brand':config.company.color,'--secondary':config.company.secondaryColor}}>

 <CategorySidebar route={route} onNavigate={navigate} smallScreen={smallScreen} mobileNav={mobileNav} onClose={()=>setMobileNav(false)} onCloud={()=>setShowCloud(true)} saving={saving}/>
 <div className="main-shell"><TopNavigation route={route} onNavigate={navigate} workspaces={state.workspaces} workspace={workspace} onSwitch={switchWorkspace} onToggle={()=>{if(smallScreen)setMobileNav(!mobileNav);else setCollapsed(!collapsed);}}/>
 <main className="content">{dirty&&<div className="edit-status" role="status">Unsaved changes — save before leaving this page.</div>}{workspace&&page!=='help'&&<button className="context-help" onClick={()=>openHelp(page==='templates'?'ocr':page==='library'?'templates':page==='records'?'followup':page==='export'?'export':page==='workspaces'?'workspaces':'start')}>Help with this page</button>}{!workspace&&page!=='workspaces'?<Empty title="Create your first workspace" action={<Button kind="primary" onClick={()=>setPage('workspaces')}>Open Workspaces</Button>}>Start with a company, add its fields and document templates, then import records.</Empty>:<>

 {route==='home'&&<><TodayQueue key={config.id} compact records={records} config={config} onOpen={setDetail} onSave={saveRecord} onNavigate={navigate} notify={notify}/><BackupHealth workspace={workspace} onBackup={()=>backup()} onRestore={restore}/></>}
 {page==='today'&&<TodayQueue key={config.id} records={records} config={config} onOpen={setDetail} onSave={saveRecord} onNavigate={navigate} notify={notify}/>}
 {page==='home'&&<VisualHome workspace={workspace} category={routeCategory(route)} onNavigate={navigate} counts={{pending:pending.length,overdue:overdue.length,completed:complete.length}}/>}
 {page==='records'&&<><div className="page-heading"><div><span className="eyebrow">{config.company.name}</span><h1>{route==='overdue'?'Overdue Follow-Ups':route==='completed'?'Completed Follow-Ups':route==='export-records'?'Export Records':'Follow-Up Records'}</h1><p>{route==='export-records'?'Choose your filters and columns, then download your records as CSV.':'Open a record to add remarks, record an attempt, reschedule or mark complete.'}</p></div><div className="inline-actions"><Button icon={Upload} onClick={()=>navigate('import')}>Import documents</Button><Button kind="primary" icon={Plus} onClick={()=>navigate('record-create')}>Create follow-up</Button></div></div>{renderRecords()}</>}
 {page==='schedule'&&<FollowUpSchedule config={config} records={records} onOpen={setDetail} onNavigate={navigate}/>}

 {page==='library'&&<TemplateStudio initialIntent={route==='library-create'?'create':route==='preset-fields'?'fields':''} key={`${config.id}-${route}`} workspace={workspace} onSave={saveConfig} confirm={confirm} notify={notify} onDirty={setDirty} onVisual={openVisual}/>}
 {page==='help'&&<HelpCenter key={helpTopic} initialTopic={helpTopic} onNavigate={navigate}/>}
 {page==='templates'&&<>{route==='field-mapping'&&<p className="info-box">Field mapping: choose a saved template and sample document. Select a field, draw its region or map its printed label / spreadsheet column, then Test and Save template.</p>}<TemplateBuilder initialTemplateId={visualTemplateId} key={`${config.id}-${visualTemplateId}`} workspace={workspace} onSave={saveConfig} confirm={confirm} notify={notify} onDirty={setDirty}/></>}

 {page==='import'&&<ImportDocuments onHelp={openHelp} key={config.id} workspace={workspace} onSaveConfig={saveConfig} notify={notify} confirm={confirm} onImport={async(imported,attachment)=>{await updateWorkspace((w)=>{for(const incoming of imported){if(incoming.replaceId){const index=w.records.findIndex(r=>r.id===incoming.replaceId);if(index<0)throw new Error('The record to update no longer exists.');w.records[index]=mergeImported(w.records[index],incoming);}else {if(w.records.some(r=>r.sourceKey===incoming.sourceKey))throw new Error('This document row was already imported. Choose update or skip.');w.records.unshift(incoming);}}if(!w.documents.some((d)=>d.id===attachment.id))w.documents.push(fileMeta(attachment));},[{id:attachment.id,file:attachment.file}]);}} onDeleteDocument={(id)=>run(async()=>{await updateWorkspace((w)=>{w.documents=w.documents.filter((d)=>d.id!==id);w.config.templates.forEach((t)=>{if(t.sampleDocumentId===id)delete t.sampleDocumentId;});},[{id,delete:true}]);notify('Original document deleted locally; records preserved.');})}/>}

 {['company','fields','automation','settings'].includes(page)&&<>{page==='settings'&&<div className="settings-shortcuts"><Button onClick={()=>navigate('fields')}>Manage custom fields & visible columns</Button><Button icon={Cloud} onClick={()=>setShowCloud(true)}>Cloud & backup</Button></div>}<SettingsEditor key={`${config.id}-${page}`} config={config} section={page} onSave={saveConfig} notify={notify} onDirty={setDirty}/></>}

 {page==='workspaces'&&<WorkspaceManager key={`${config.id}-${route}`} initialCreate={route==='workspace-create'} workspaces={state.workspaces} activeId={workspace?.config.id} notify={notify} backup={backup} confirm={confirm} onSwitch={switchWorkspace} onEdit={(id)=>switchWorkspace(id,'settings')} onCreate={async(w)=>{validateWorkspace(w);await commit((next)=>{next.workspaces.push(w);next.activeId=w.config.id;});setPage('dashboard');notify('Workspace created.');}} onDelete={async(id)=>{const target=state.workspaces.find((w)=>w.config.id===id);await commit((next)=>{next.workspaces=next.workspaces.filter((w)=>w.config.id!==id);if(next.activeId===id)next.activeId=next.workspaces[0]?.config.id||null;Object.keys(next.cloudRevisions).filter((key)=>key.endsWith(':'+id)).forEach((key)=>delete next.cloudRevisions[key]);},(target.documents||[]).map((d)=>({id:d.id,delete:true})));notify('Selected workspace deleted locally. Other workspaces are unchanged.');}}/>}

 {page==='reports'&&<PerformanceReports records={records} config={config}/>}

 {page==='export'&&<><div className="page-heading"><div><span className="eyebrow">YOUR PROJECT, YOUR SOURCE</span><h1>Download Complete Source Code</h1><p>A real release archive generated from the project at build time.</p></div></div><section className="panel export-panel"><FileText size={42}/><h2>Ready for your PC and Vercel</h2><p>Includes React source, OCR and import code, the backend SQL functions and private-storage policies, migrations, dependencies, configuration examples, tests, launcher and deployment instructions.</p><p>The ZIP includes this workspace’s saved branding and template coordinates. Customer records, original documents, passwords and cloud sessions are excluded. Use a private backup to transfer records.</p><Button kind="primary" icon={Download} disabled={exporting||!workspace} onClick={exportSource}>{exporting?'Preparing archive…':'Download complete source ZIP'}</Button>{exporting&&<p role="status" className="progress">{exportProgress}</p>}<div className="info-box">Extract → npm ci → npm run dev. For Vercel: npm run build, output dist. The build prepares OCR assets and the source release automatically.</div><div className="inline-actions wrap"><Button onClick={()=>backup()}>Download private workspace backup</Button><FileInput accept=".json" onFile={restore}>Restore workspace backup</FileInput></div></section></>}

 </>}</main><StatusBar workspace={workspace} clock={clock} saving={saving} lastSync={Object.entries(state.cloudRevisions).filter(([key])=>key.endsWith(':'+config.id)).map(([,value])=>value.at).filter(Boolean).sort().at(-1)}/></div>

 {notice&&<div className={`toast ${notice.error?'error':''}`} role={notice.error?'alert':'status'}><CheckCircle2 size={20}/><span>{notice.text}</span><button className="icon-button" aria-label="Dismiss notification" onClick={()=>setNotice(null)}><X size={18}/></button></div>}

 {editor&&<RecordEditor config={config} record={editor.record} onClose={()=>{setEditor(null);if(route==='record-create')setPage('records');}} onSave={async(record)=>{await saveRecord(record);setEditor(null);if(route==='record-create')setPage('records');setDetail(record.id);notify('Record and follow-up details saved.');}}/>}

 {detailRecord&&!editor&&<RecordDetail record={detailRecord} config={config} onClose={()=>setDetail(null)} onEdit={()=>setEditor({record:detailRecord})} onUpdate={saveRecord} notify={notify} onDelete={()=>confirm('Delete record?',`Delete “${detailRecord.title}” and its follow-up history? Download a workspace backup first if needed.`,async()=>{await updateWorkspace((w)=>{w.records=w.records.filter((r)=>r.id!==detailRecord.id);});setDetail(null);notify('Record deleted locally.');},'Delete record',true)}/>}

 {showCloud&&workspace&&<CloudPanel workspace={workspace} revisions={state.cloudRevisions} onClose={()=>setShowCloud(false)} backup={()=>backup()} importBackup={restore} notify={notify} confirm={confirm} onRevision={(key,value)=>commit((next)=>{next.cloudRevisions[key]=value;})} onLoad={async(entry,key)=>{const incoming=upgradeWorkspace(validateWorkspace(entry.payload));const {cloudDocumentFiles}=await import('./cloud.js');const files=await cloudDocumentFiles(incoming);await commit((next)=>{const i=next.workspaces.findIndex((w)=>w.config.id===entry.id);if(i<0)next.workspaces.push(incoming);else next.workspaces[i]=incoming;next.activeId=entry.id;next.cloudRevisions[key]={revision:entry.revision,at:entry.updated_at,localAt:incoming.updatedAt};},files);setPage('dashboard');setDetail(null);notify('Cloud workspace and original documents loaded.');}}/>}

 {confirmation&&<Confirm request={confirmation} onClose={()=>setConfirmation(null)}/>}

 </div>;

}

