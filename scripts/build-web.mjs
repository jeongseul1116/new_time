import { webFiles as files } from './web-files.mjs';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'_site');
const digest=createHash('sha256');
for(const file of [...files,'sw.js']){digest.update(file);digest.update(await readFile(path.join(root,file)));}
const version=digest.digest('hex').slice(0,16);
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
for(const file of files){await mkdir(path.dirname(path.join(output,file)),{recursive:true});await cp(path.join(root,file),path.join(output,file));}
const worker=(await readFile(path.join(root,'sw.js'),'utf8')).replace('__CHAGOK_CACHE_VERSION__',version);
await writeFile(path.join(output,'sw.js'),worker);await writeFile(path.join(output,'.nojekyll'),'');
console.log(`Built ${files.length+1} web assets; offline cache ${version}`);
