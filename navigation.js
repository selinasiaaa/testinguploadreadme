export const categories=[
 {id:'workspace',label:'Workspace',heading:'Workspace management',description:'Your companies, branding and preferences.'},
 {id:'templates',label:'Templates',heading:'Templates & document processing',description:'Define information once. Reuse it with every document.'},
 {id:'documents',label:'Documents',heading:'Document processing',description:'Import documents and connect their fields.'},
 {id:'followups',label:'Follow-Ups',heading:'Follow-up management',description:'Keep every conversation moving.'},
 {id:'reports',label:'Reports',heading:'Reports & analytics',description:'Understand progress across your workspace.'},
 {id:'tools',label:'Tools',heading:'Tools & exports',description:'Your records, backups and complete source code.'},
 {id:'help',label:'Help',heading:'Guides & support',description:'Clear steps for every task.'}
];
export const actions=[
 {id:'today',label:'Today’s Follow-Ups',description:'Your daily queue, replies and next actions',category:'followups',icon:'calendar',tone:'teal',page:'today'},
 {id:'workspace-create',label:'Create Workspace',description:'Start a separate company workspace',category:'workspace',icon:'building-plus',tone:'blue',page:'workspaces'},
 {id:'workspaces',label:'Manage Workspaces',description:'Open, clone or edit your companies',category:'workspace',icon:'buildings',tone:'indigo',page:'workspaces'},
 {id:'company',label:'Company Branding',description:'Your logo, colors and contact details',category:'workspace',icon:'palette',tone:'pink',page:'company'},
 {id:'settings',label:'Workspace Settings',description:'Preferences and workspace information',category:'workspace',icon:'settings',tone:'slate',page:'settings'},
 {id:'library',label:'Template Library',description:'View and manage reusable templates',category:'templates',icon:'collection',tone:'violet',page:'library'},
 {id:'library-create',label:'Create Template',description:'Start from a preset or a blank template',category:'templates',icon:'file-plus',tone:'blue',page:'library'},
 {id:'templates',label:'OCR Template Builder',description:'Select values visually on a document',category:'templates',icon:'scan',tone:'teal',page:'templates'},
 {id:'import',label:'Import Documents',description:'Extract, review and create records',category:'documents',icon:'upload',tone:'cyan',page:'import'},
 {id:'field-mapping',label:'Field Mapping',description:'Connect document values to your fields',category:'templates',icon:'mapping',tone:'indigo',page:'templates'},
 {id:'preset-fields',label:'Preset Field Settings',description:'Edit required fields, defaults and services',category:'templates',icon:'checklist',tone:'amber',page:'library'},
 {id:'records',label:'Follow-Up Records',description:'View clients, services and progress',category:'followups',icon:'contacts',tone:'blue',page:'records'},
 {id:'record-create',label:'Create Follow-Up',description:'Add a client and generate a schedule',category:'followups',icon:'calendar-plus',tone:'teal',page:'records'},
 {id:'schedule',label:'Follow-Up Schedule',description:'See scheduled attempts by date',category:'followups',icon:'calendar',tone:'violet',page:'schedule'},
 {id:'overdue',label:'Overdue Follow-Ups',description:'Focus on conversations needing attention',category:'followups',icon:'clock',tone:'coral',page:'records'},
 {id:'completed',label:'Completed Follow-Ups',description:'Review completed records and outcomes',category:'followups',icon:'completed',tone:'green',page:'records'},
 {id:'automation',label:'Follow-Up Automation',description:'Set attempts, intervals and message drafts',category:'followups',icon:'workflow',tone:'pink',page:'automation'},
 {id:'reports',label:'Reports & Analytics',description:'See your workspace performance',category:'reports',icon:'chart',tone:'blue',page:'reports'},
 {id:'export-records',label:'Export Records',description:'Filter records and download a CSV',category:'tools',icon:'export',tone:'green',page:'records'},
 {id:'export',label:'Download Source Code',description:'Save the full project as a ZIP',category:'tools',icon:'download',tone:'amber',page:'export'},
 {id:'help',label:'User Guide',description:'Search instructions and guided workflows',category:'help',icon:'book',tone:'violet',page:'help'}
];
export const actionById=(id)=>actions.find((action)=>action.id===id);
export const routeIds=new Set(['home','dashboard','fields',...actions.map((a)=>a.id),...categories.map((c)=>`category-${c.id}`)]);
export function readRoute(hash=''){const id=hash.replace(/^#\/?/,'').split('?')[0];return id==='dashboard'?'home':routeIds.has(id)?id:'home';}
export function routePage(route){return route==='home'||route.startsWith('category-')?'home':actionById(route)?.page||route;}
export function routeCategory(route){return route.startsWith('category-')?route.slice(9):actionById(route)?.category||'home';}
export function scheduleEntries(records,{from='',to='',status='all'}={}){return records.flatMap((record)=>record.schedule.filter((step)=>!['paused','cancelled','lost','won','paid','replied','completed'].includes(record.outcome)||step.completedAt).map((step,index)=>({record,step,attempt:index+1}))).filter(({step})=>(!from||step.due>=from)&&(!to||step.due<=to)&&(status==='all'||(status==='completed'?!!step.completedAt:!step.completedAt))).sort((a,b)=>a.step.due.localeCompare(b.step.due)||a.record.title.localeCompare(b.record.title));}
