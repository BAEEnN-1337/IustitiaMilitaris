import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url),load=require('./ts-loader.cjs'),{root,scenarios}=require('./scenarios.cjs');
const {safeExternalUrl,parseImportedJson,scriptJson}=load(root+'/src/utils/security.ts');
for(const input of ['javascript:alert(1)','data:text/html,<script>','vbscript:evil','//evil.test','https://user:pass@evil.test']) assert.equal(safeExternalUrl(input),undefined);
assert.equal(safeExternalUrl('https://example.com/legal'),'https://example.com/legal');
assert.throws(()=>parseImportedJson('{"__proto__":{"polluted":true}}'));
const attack='</script><script>alert(1)</script>\u2028\u2029>&';
assert.doesNotMatch(scriptJson(attack),/[<>&\u2028\u2029]/);
const {generateScorm12Zip}=load(root+'/src/utils/scormExport.ts'),JSZip=require('jszip');
const malicious=structuredClone(scenarios[0]);malicious.nazva=attack;malicious.vuzly[0].varianty[0].id="A');alert(1);//";malicious.vuzly[0].varianty[0].tekst=attack;
const norms=JSON.parse(await readFile(root+'/normy.json','utf8'));
const zip=await JSZip.loadAsync(await (await generateScorm12Zip(malicious,norms,'en')).arrayBuffer());
const html=await zip.file('index.html').async('string');assert.doesNotMatch(html,/innerHTML|onclick=|<script>alert/);assert.ok((await zip.file('imsmanifest.xml').async('string')).includes('&lt;/script&gt;'));
const directory=await mkdtemp(path.join(os.tmpdir(),'security-')),base='http://127.0.0.1:18570';
const server=spawn(process.execPath,['server/index.js'],{cwd:root,env:{...process.env,PORT:'18570',DATA_DIR:directory},stdio:['ignore','pipe','pipe']});
const sockets=[];
function wait(ws,predicate){return new Promise((resolve,reject)=>{const t=setTimeout(()=>{ws.off('message',listener);reject(Error('WS timeout'));},4000);const listener=raw=>{const m=JSON.parse(raw);if(predicate(m)){clearTimeout(t);ws.off('message',listener);resolve(m);}};ws.on('message',listener);});}
async function connect(){const ws=new WebSocket('ws://127.0.0.1:18570/ws');sockets.push(ws);await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j);});return ws;}
async function command(ws,data,predicate){const promise=wait(ws,predicate);ws.send(JSON.stringify(data));return promise;}
const post=(url,body,headers={})=>fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
try{
 await new Promise((r,j)=>{const t=setTimeout(()=>j(Error('startup')),10000);server.stdout.on('data',d=>{if(String(d).includes('Local:')){clearTimeout(t);r();}});});
 const response=await fetch(base+'/');assert.equal(response.status,200);
 for(const key of ['x-content-type-options','x-frame-options','referrer-policy','permissions-policy','content-security-policy'])assert.ok(response.headers.get(key),key);
 assert.equal(response.headers.get('x-powered-by'),null);assert.equal(response.headers.get('strict-transport-security'),null);assert.ok(!response.headers.get('content-security-policy').includes('upgrade-insecure-requests'));
 for(const file of ['/server/data/store.json','/.git/config','/docs/cases-source.pdf','/server/accounts.js'])assert.equal((await fetch(base+file)).status,404);
 assert.equal((await post('/api/auth/login',{login:'valid-alias',password:'x'.repeat(129)})).status,400);
 const registration=await post('/api/auth/register',{login:'security-alias',password:'secure-password'});assert.equal(registration.status,200);
 const cookie=registration.headers.get('set-cookie').split(';')[0];assert.ok(!registration.headers.get('set-cookie').includes('Secure'));assert.ok(registration.headers.get('set-cookie').includes('HttpOnly'));
 assert.equal((await post('/api/progress',{scenarioId:'S01',pathway:[]},{Cookie:cookie,Origin:'http://evil.test'})).status,403);
 assert.equal((await post('/api/progress',{scenarioId:'S01',pathway:[]},{Cookie:cookie,Referer:'http://evil.test/test'})).status,403);
 const polluted=await post('/api/progress','{"__proto__":{"polluted":true}}',{Cookie:cookie});assert.ok([400,403].includes(polluted.status));assert.equal({}.polluted,undefined);
 const huge=await post('/api/progress',{notes:'x'.repeat(100000)});assert.equal(huge.status,413);assert.doesNotMatch(await huge.text(),/stack|\/workspace|node_modules/);
 const proxy=await post('/api/auth/login',{login:'security-alias',password:'secure-password'},{'x-forwarded-proto':'https'});assert.ok(proxy.headers.get('set-cookie').includes('Secure'));
 const badCookie=cookie.replace(/~\d+/, '~9999999999999');assert.equal((await fetch(base+'/api/progress',{headers:{Cookie:badCookie}})).status,401);
 let limited=false;for(let i=0;i<15;i++){const result=await post('/api/auth/login',{login:'rotating-'+i,password:'wrong-password'});if(result.status===429){limited=true;break;}assert.equal(result.status,401);}assert.ok(limited,'rotating login names must not bypass IP limit');
 const host=await connect(),created=await command(host,{type:'CREATE_ROOM',scenarioId:'S01'},m=>m.type==='ROOM_CREATED'),secret=created.hostSecret,code=created.room.code;
 const student=await connect();const joined=await command(student,{type:'JOIN_ROOM',roomCode:code,clientVoteToken:'a'.repeat(32)},m=>m.type==='ROOM_UPDATE');assert.ok(!JSON.stringify(joined).includes(secret));assert.ok(!('hostSecret' in joined.room));
 for(const ws of [host,student])for(const token of [undefined,'0'.repeat(64)])for(const type of ['OPEN_VOTING','NEXT_STAGE','CLOSE_SESSION']){const denial=await command(ws,{type,hostSecret:token},m=>m.type==='ERROR');assert.equal(denial.error,'forbidden');}
 const opened=await command(host,{type:'OPEN_VOTING',hostSecret:secret},m=>m.room?.phase==='voting');assert.equal(opened.room.currentNodeId,'V1');
 await command(student,{type:'CLOSE_SESSION'},m=>m.error==='forbidden');
 const snapshot=await command(host,{type:'SET_LIVE',showLive:false,hostSecret:secret},m=>m.room?.showLive===false);assert.equal(snapshot.room.history.length,0);assert.equal(snapshot.room.phase,'voting');
 const oversized=await connect(),closed=new Promise(r=>oversized.once('close',r));oversized.send('x'.repeat(20000));assert.equal(await closed,1009);
 const flood=await connect(),floodClosed=new Promise(r=>flood.once('close',r));for(let i=0;i<130;i++)flood.send('{');assert.equal(await floodClosed,1008);
 const rejected=new WebSocket('ws://127.0.0.1:18570/ws',{origin:'http://evil.test'});sockets.push(rejected);await new Promise((r,j)=>{rejected.on('unexpected-response',(req,res)=>{assert.equal(res.statusCode,401);res.resume();rejected.terminate();r();});rejected.on('error',()=>{});setTimeout(()=>j(Error('origin check timeout')),4000).unref();});
 assert.equal((await fetch(base+'/api/health')).status,200);
 console.log('PASS security: real headers, HTTP/LAN cookies, expiry tampering, IP rate limit, CSRF, JSON pollution/body bounds, static isolation, WS secrets/origin/flood/payload, URL and SCORM injection protections');
}finally{for(const ws of sockets)ws.terminate();server.kill();await new Promise(r=>server.exitCode!==null?r():server.once('exit',r));await rm(directory,{recursive:true,force:true});}
