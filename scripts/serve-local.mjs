import {createServer} from 'node:http';
import {readFileSync,existsSync,statSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist');
if(!readFileSync(path.join(root,'app.js'),'utf8').includes("const SUPABASE_URL = 'http://127.0.0.1:"))throw Error('Refusing to serve an app connected to production. Run local-auth-tests.mjs first.');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer((req,res)=>{
 let name;try{name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}catch{res.writeHead(400);res.end();return;}
 if(name==='/')name='/index.html';const file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' http://127.0.0.1:54321 ws://127.0.0.1:54321; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
 res.end(readFileSync(file));
});
server.listen(53535,'127.0.0.1',()=>console.log('ISSSC local test app: http://127.0.0.1:53535 — production connections blocked.'));
