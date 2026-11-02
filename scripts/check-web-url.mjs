import { webFiles } from './web-files.mjs';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const base=new URL(process.argv[2]);
if(base.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(base.hostname))throw new Error('Expected an HTTPS app URL.');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','_site');
const expected=new Map();
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const name of [...webFiles,'sw.js'])expected.set(name,hash(await readFile(path.join(root,name))));
let error;
for(let attempt=1;attempt<=12;attempt++){
 try{
  for(const [name,digest]of expected){
   const url=new URL(name,base);url.searchParams.set('check',digest.slice(0,12));
   const response=await fetch(url,{signal:AbortSignal.timeout(15000),cache:'no-store'});
   if(!response.ok)throw new Error(`${name} returned HTTP ${response.status}`);
   if(hash(Buffer.from(await response.arrayBuffer()))!==digest)throw new Error(`${name} has not propagated yet`);
  }
  console.log(`Live app verified: ${expected.size} published assets match the tested build.`);process.exit(0);
 }catch(cause){error=cause;console.log(`Live check ${attempt}/12: ${cause.message}`);if(attempt<12)await new Promise(resolve=>setTimeout(resolve,5000));}
}
throw error;
