import http from 'node:http';
import {createHash} from 'node:crypto';
import { readFile } from 'node:fs/promises';
const files={'':'index.html','index.html':'index.html','app.js':'app.js','floating-window.js':'floating-window.js','reverse-tracking.js':'reverse-tracking.js','web-app.js':'web-app.js','style.css':'style.css','sw.js':'sw.js','manifest.webmanifest':'manifest.webmanifest','icons/icon.svg':'icons/icon.svg','icons/icon-192.png':'icons/icon-192.png','icons/icon-512.png':'icons/icon-512.png','icons/maskable-512.png':'icons/maskable-512.png'};
const base=process.env.BASE_PATH||'/';
if(!base.startsWith('/')||!base.endsWith('/'))throw new Error('BASE_PATH must begin and end with /.');
http.createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(base!=='/'&&pathname===base.slice(0,-1)){res.writeHead(301,{Location:base});return res.end();}
  const file=pathname.startsWith(base)?files[pathname.slice(base.length)]:null;
  if(!file){res.writeHead(404);return res.end('Not found');}
  const mime=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webmanifest')?'application/manifest+json':file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':'text/html';
  res.setHeader('Content-Type',mime+'; charset=utf-8');
  if(file==='sw.js')res.setHeader('Cache-Control','no-cache');
  let contents=await readFile(new URL(file,import.meta.url));
  if(file==='sw.js'){
   const hash=createHash('sha256');
   for(const source of new Set(Object.values(files))){hash.update(source);hash.update(await readFile(new URL(source,import.meta.url)));}
   contents=contents.toString().replace('__CHAGOK_CACHE_VERSION__',hash.digest('hex').slice(0,16));
  }
  res.end(contents);
 }catch{res.writeHead(500);res.end('Server error');}
}).listen(Number(process.env.PORT)||3000,'0.0.0.0');
