import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const [major,minor]=process.versions.node.split('.').map(Number);
if(major<22||(major===22&&minor<12)){console.error('Install Node.js 22.12 or later (Node 24 recommended).');process.exit(1);}
const digest=createHash('sha256').update(readFileSync('package-lock.json')).digest('hex');
const marker='node_modules/.followup-dependency-lock';
if(!existsSync(marker)||readFileSync(marker,'utf8')!==digest){
 console.log('Installing the dependencies for this dashboard version…');
 const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['ci'],{stdio:'inherit',shell:process.platform==='win32'});
 if(result.status!==0)process.exit(result.status||1);
 writeFileSync(marker,digest);
}
