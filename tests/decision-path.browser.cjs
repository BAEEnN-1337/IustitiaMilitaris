const {chromium}=require('playwright'),{spawn}=require('node:child_process'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {root,scenarios,englishScenarios}=require('./scenarios.cjs');
const load=require('./ts-loader.cjs'),labels=load(root+'/src/i18n/index.ts').translations;
(async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'decision-path-'));const server=spawn(process.execPath,['server/index.js'],{cwd:root,env:{...process.env,PORT:'18560',DATA_DIR:dir},stdio:['ignore','pipe','pipe']});let browser;try{await new Promise((r,j)=>{const t=setTimeout(()=>j(Error('startup')),10000);server.stdout.on('data',d=>{if(String(d).includes('Local:')){clearTimeout(t);r();}});});browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});await fs.mkdir(root+'/test-results/decision-path',{recursive:true});
for(const theme of ['dark','light'])for(const lang of ['uk','en'])for(const width of [360,1280]){
 const c=await browser.newContext({viewport:{width,height:900}});const paths={};
 for(const s of scenarios.filter(s=>['S01','S03'].includes(s.id))){let n=s.vuzly[0],i=0;paths[s.id]=[];while(n){const v=n.varianty[(i+1)%n.varianty.length];paths[s.id].push({nodeId:n.id,variantId:v.id});n=s.vuzly.find(n=>n.id===v.nastupnyi_vuzol);i++;}}
 await c.addInitScript(({theme,lang,paths})=>{localStorage.setItem('eds-theme',theme);localStorage.setItem('eds-language',lang);for(const [id,pathway]of Object.entries(paths))localStorage.setItem('simulator_progress_'+id,JSON.stringify({pathway}));},{theme,lang,paths});const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 for(const id of ['S01','S03']){
  await p.goto('http://127.0.0.1:18560/scenarios/'+id+'/summary');await p.waitForFunction(n=>document.querySelectorAll('[data-testid="path-stage"]').length===n,paths[id].length);
  const source=lang==='uk'?scenarios.find(s=>s.id===id):englishScenarios[id];
  const stages=p.getByTestId('path-stage');assert.equal(await stages.count(),id==='S01'?6:9);
  for(const [i,step]of paths[id].entries()){
   const n=source.vuzly.find(n=>n.id===step.nodeId),blocks=stages.nth(i).getByTestId('path-option');assert.equal(await blocks.count(),n.varianty.length);
   assert.deepEqual(await blocks.locator('strong').allTextContents(),(lang==='uk'?'АБВГ':'ABCD').slice(0,n.varianty.length).split(''));
   const boxes=await blocks.locator('rect').first().count();assert.ok(boxes);
   const positions=await blocks.evaluateAll(es=>es.map(e=>{const r=e.querySelector('rect');return [+r.getAttribute('x'),+r.getAttribute('y')];}));assert.ok(positions.every((r,j)=>r[0]===positions[0][0]&&(!j||r[1]>positions[j-1][1])));
   assert.equal(await blocks.locator('[title]').count(),n.varianty.length);
   assert.equal(await blocks.filter({has:p.locator('[aria-label="'+(lang==='uk'?'Обрано':'Selected')+'"]')}).count(),1);
  }
  const curves=p.getByTestId('selected-curve');assert.equal(await curves.count(),paths[id].length-1);
  for(let i=0;i<paths[id].length-1;i++){
   const geometry=await curves.nth(i).evaluate(e=>{const start=e.getPointAtLength(0),end=e.getPointAtLength(e.getTotalLength());return [start.x,start.y,end.x,end.y];});
   const selected=stages.nth(i).locator('[data-selected="true"] > rect').first(),next=stages.nth(i+1).locator('[data-selected="true"] > rect').first();
   const rect=await selected.evaluate(e=>[+e.getAttribute('x'),+e.getAttribute('y'),+e.getAttribute('width'),+e.getAttribute('height')]),r2=await next.evaluate(e=>[+e.getAttribute('x'),+e.getAttribute('y'),+e.getAttribute('height')]);
   assert.deepEqual(geometry,[rect[0]+rect[2],rect[1]+rect[3]/2,r2[0],r2[1]+r2[2]/2]);
  }
  const text=await stages.allTextContents();assert.doesNotMatch(text.join(' '),/\bV\d+\b/);if(lang==='en')assert.doesNotMatch(text.join(' '),/\p{Script=Cyrillic}/u);
  assert.ok(await p.locator('.decision-path-scroll').evaluate(e=>e.scrollWidth>e.clientWidth));
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await p.screenshot({path:`${root}/test-results/decision-path/${id}-${theme}-${lang}-${width}.png`,fullPage:true});
 }
 await p.goto('http://127.0.0.1:18560/builder/S01');await p.getByRole('button',{name:labels[lang].builder.visualGraphTab,exact:true}).click();
 const edges=p.getByTestId('builder-edge');assert.equal(await edges.count(),11);
 const strings=await edges.locator('text').allTextContents();assert.ok(strings.includes(lang==='uk'?'А · Б · В · Г':'A · B · C · D'));assert.ok(strings.every(s=>!/[АБВГABCD]{2}/.test(s)));
 assert.deepEqual(errors,[]);await c.close();console.log('PASS decision paths and grouped edges',theme,lang,width);
}
}finally{await browser?.close();server.kill();await fs.rm(dir,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
