import {writeFile,mkdir} from 'node:fs/promises';
const target=await (await fetch('http://127.0.0.1:9223/json/new?http://localhost:4181',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+': '+r.exceptionDetails.exception?.description);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
async function click(selector){await js(`document.querySelector(${JSON.stringify(selector)}).click()`)}
await mkdir('/tmp/tiny-groups-review',{recursive:true});await cdp('Page.enable');await cdp('Page.navigate',{url:'http://localhost:4181'});await wait("typeof state!=='undefined'&&!state.busy");
const assert=async(expression,message)=>{if(!await js(expression))throw Error(message)};
await mkdir('/tmp/tiny-painted-review',{recursive:true});
await js('showDemo()');
await assert("fetch('/potion-celebration-v1.png').then(r=>r.ok)",'Missing sprite artwork');
for(const kind of ['day','dream']){
 await js(`DreamThemes.preview('2026-10');{const g=state.goals[0];g.days=Array.from({length:1},(_,i)=>dayBefore(i));g.target=${kind==='dream'?1:21};milestoneQueue.set(g.id,{id:g.id,kind:'${kind}',day:today()});flushMilestones();clearTimeout(milestoneTimer)}`);
 await assert(`document.querySelector('.painted-enchantment').dataset.scene==='${kind}'`,'Wrong sequence');
 const start=await js("getComputedStyle(document.querySelector('.potion-sprite')).backgroundPosition");
 await new Promise(r=>setTimeout(r,1300));
 await assert(`getComputedStyle(document.querySelector('.potion-sprite')).backgroundPosition!==${JSON.stringify(start)}`,'Sprite frames did not advance');
 await new Promise(r=>setTimeout(r,2500));
 for(const width of [320,390,1440]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<600});
  await assert("(()=>{const p=document.querySelector('#milestone'),r=p.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()",'Painted celebration overflow');
  await writeFile('/tmp/tiny-painted-review/'+kind+'-'+width+'.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
 }
 await click('[data-action=dismiss-milestone]');
}
await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
await js("{const g=state.goals[0];milestoneQueue.set(g.id,{id:g.id,kind:'day',day:today()});flushMilestones();clearTimeout(milestoneTimer)}");
await assert("getComputedStyle(document.querySelector('.potion-sprite')).animationName==='none'",'Reduced motion ignored');
await assert("getComputedStyle(document.querySelector('.potion-sprite')).backgroundPosition.includes('66.6667')",'Reduced-motion final pose missing');
await cdp('Page.close');ws.close();console.log('PASS: packaged watercolor atlas, distinct day/dream sequences, real frame advancement, mobile/desktop bounds, reduced motion and final pose.');
