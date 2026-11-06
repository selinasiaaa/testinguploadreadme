import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'public/ocr');
await mkdir(target, { recursive: true });
await cp(path.join(root, 'node_modules/tesseract.js/dist/worker.min.js'), path.join(target, 'worker.min.js'));
for (const name of await readdir(path.join(root, 'node_modules/tesseract.js-core'))) {
  if (name.includes('lstm') && (name.endsWith('.wasm.js') || name.endsWith('.wasm'))) await cp(path.join(root,'node_modules/tesseract.js-core',name),path.join(target,name));
}
for (const lang of ['eng','msa','chi_sim']) await cp(path.join(root, `node_modules/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`), path.join(target, `${lang}.traineddata.gz`));
const zip = new JSZip();
const roots = ['package.json','package-lock.json','index.html','vite.config.js','vercel.json','.env.example','.gitignore','README.md','VERIFICATION.md','supabase.sql','START-DASHBOARD.cmd','dashboard-config.json','src','scripts','tests','database'];
async function add(relative) {
  const absolute = path.join(root, relative);
  const { stat } = await import('node:fs/promises');
  if ((await stat(absolute)).isDirectory()) { for (const name of await readdir(absolute)) await add(`${relative}/${name}`); }
  else if (!relative.includes('.env.local')) zip.file(relative, await readFile(absolute));
}
for (const name of roots) await add(name);
await mkdir(path.join(root,'public/releases'),{recursive:true});
await writeFile(path.join(root,'public/releases/source.zip'), await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
console.log('Prepared same-origin OCR assets and complete source release ZIP.');
