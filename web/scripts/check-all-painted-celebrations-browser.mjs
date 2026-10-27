import {writeFile,mkdir} from 'node:fs/promises';
const target=await (await fetch('http://127.0.0.1:9223/json/new?http://localhost:4181',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+': '+r.exceptionDetails.exception?.description);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
async function click(selector){await js(`document.querySelector(${JSON.stringify(selector)}).click()`)}
await mkdir('/tmp/tiny-groups-review',{recursive:true});await cdp('Page.enable');await cdp('Page.navigate',{url:'http://localhost:4181'});await wait("typeof state!=='undefined'&&!state.busy");
const assert=async(expression,message)=>{if(!await js(expression))throw Error(message)};
await mkdir('/tmp/tiny-all-celebrations',{recursive:true});await js('showDemo()');
await assert("performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname.startsWith('/celebrations/')).length===0",'Inactive editions preloaded');
const editions=['2026-10','2026-11','2026-12','2027-01','2027-02','2027-03','2027-04','2027-05','2027-06','2027-07','2027-08','2027-09'];
for(const edition of editions){
 await js(`DreamThemes.preview('${edition}')`);
 await assert("fetch(DreamThemes.current.celebrationAsset).then(r=>r.ok)",'Missing packaged artwork '+edition);
 for(const kind of ['day','dream']){
  await js(`{const g=state.goals[0];g.days=[today()];g.target=${kind==='dream'?1:21};milestoneQueue.set(g.id,{id:g.id,kind:'${kind}',day:today()});flushMilestones();clearTimeout(milestoneTimer)}`);
  await assert(`document.querySelector('.painted-enchantment').dataset.scene==='${kind}'`,'Wrong sequence '+edition);
  await assert("getComputedStyle(document.querySelector('.potion-sprite')).backgroundImage.includes(DreamThemes.current.celebrationAsset)",'Wrong atlas '+edition);
  const start=await js("getComputedStyle(document.querySelector('.potion-sprite')).backgroundPosition");await new Promise(r=>setTimeout(r,550));
  await assert(`getComputedStyle(document.querySelector('.potion-sprite')).backgroundPosition!==${JSON.stringify(start)}`,'No frame progression '+edition+' '+kind);
  await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await assert("getComputedStyle(document.querySelector('.potion-sprite')).animationName==='none'",'Reduced motion ignored '+edition);
  for(const width of [320,390,1440]){
   await cdp('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<600});
   await assert("(()=>{const r=document.querySelector('#milestone').getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.y>=0&&r.bottom<=innerHeight})()",'Overflow '+edition+' '+kind+' '+width);
   if(kind==='day'&&width===390){await js("new Promise((resolve,reject)=>{const i=new Image();i.onload=resolve;i.onerror=reject;i.src=DreamThemes.current.celebrationAsset})");await writeFile('/tmp/tiny-all-celebrations/'+edition+'.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'))}
  }
  await click('[data-action=dismiss-milestone]');await cdp('Emulation.setEmulatedMedia',{features:[]});
 }
}
// A contact sheet of actual final atlas cells makes all twelve illustrations reviewable together.
await js(`state.busy=true;document.querySelector('#content').innerHTML='<div id="artReview" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:20px;background:#211b31"></div>';const root=document.querySelector('#artReview');for(let i=0;i<12;i++){const id=${JSON.stringify(editions)}[i];DreamThemes.preview(id);const e=DreamThemes.current;const card=document.createElement('div');card.style.cssText='background:'+e.tokens['--surface']+';color:'+e.tokens['--text']+';text-align:center;padding:10px;border-radius:12px';const art=document.createElement('div');art.style.cssText='width:230px;height:230px;margin:auto;background-image:url('+e.celebrationAsset+');background-size:400% 400%;background-position:100% '+(e.celebrationFinalRow??100)+'%';card.append(art,document.createTextNode(id+' · '+e.month));root.append(card)}`);
await cdp('Emulation.setDeviceMetricsOverride',{width:1200,height:1000,deviceScaleFactor:1,mobile:false});
await new Promise(r=>setTimeout(r,500));const rect=await js("(()=>{const r=document.querySelector('#artReview').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()");
await writeFile('/tmp/tiny-all-celebrations/contact-sheet.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png',clip:rect,captureBeyondViewport:true})).data,'base64'));
await cdp('Page.close');ws.close();console.log('PASS: twelve packaged illustrated themes, advancing day/dream frames, active-edition-only preloading, reduced motion, and three responsive viewport sizes.');
