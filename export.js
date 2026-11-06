import JSZip from 'jszip';

import {download,slug} from './storage.js';

import {clone,validateConfig} from './domain.js';

export async function exportProject(config,onProgress=()=>{}) {

 validateConfig(config);onProgress('Downloading project release…');

 const response=await fetch(`${import.meta.env.BASE_URL}releases/source.zip`,{cache:'no-store'});

 if(!response.ok)throw new Error(`Source release unavailable (${response.status}). Run npm run build and deploy the complete dist folder.`);

 const zip=await JSZip.loadAsync(await response.arrayBuffer());

 for(const required of ['package.json','src/App.jsx','scripts/prepare.mjs','supabase.sql'])if(!zip.file(required))throw new Error('The release archive is incomplete. Rebuild this deployment.');

 const safe=clone(config);delete safe.savedViews;safe.templates.forEach((t)=>{delete t.sampleDocumentId;});

 zip.file('dashboard-config.json',JSON.stringify(safe,null,2));

 const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'},(meta)=>onProgress(`Preparing ZIP ${Math.round(meta.percent)}%`));

 download(`${slug(config.workspace?.name||config.company.name)}-source.zip`,blob);onProgress('Complete');

}

