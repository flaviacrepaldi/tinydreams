import {writeFile,mkdir} from 'node:fs/promises';
const target=await (await fetch('http://127.0.0.1:9223/json/new?http://localhost:4181',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+': '+r.exceptionDetails.exception?.description);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
async function click(selector){await js(`document.querySelector(${JSON.stringify(selector)}).click()`)}
await mkdir('/tmp/tiny-groups-review',{recursive:true});await cdp('Page.enable');await cdp('Page.navigate',{url:'http://localhost:4181'});await wait("typeof state!=='undefined'&&!state.busy");
const assert=async(expression,message)=>{if(!await js(expression))throw Error(message)};
await mkdir('/tmp/tiny-magic-review',{recursive:true});
await js('showDemo()');
const editions=['2026-10','2026-11','2026-12','2027-01','2027-02','2027-03','2027-04','2027-05','2027-06','2027-07','2027-08','2027-09'];
for(const edition of editions){
 await js(`DreamThemes.preview('${edition}')`);
 for(const width of [320,390,1440]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<600});
  await js("milestoneQueue.set(state.goals[0].id,{id:state.goals[0].id,kind:'day',day:today()});state.goals[0].days.push(today());flushMilestones();clearTimeout(milestoneTimer)");
  await assert("!document.querySelector('#milestone').hidden",'Missing celebration');
  await assert(`document.querySelector('#milestone').dataset.edition==='${edition}'`,'Wrong theme');
  await assert("(()=>{const d=document.createElement('div');d.innerHTML=icon(DreamThemes.current.progressSymbol);return d.innerHTML===document.querySelector('.milestone-sigil').innerHTML})()",'Wrong motif');
  await new Promise(r=>setTimeout(r,700));
  await assert("(()=>{const r=document.querySelector('#milestone').getBoundingClientRect();return Math.abs(r.x+r.width/2-document.documentElement.clientWidth/2)<2&&Math.abs(r.y+r.height/2-innerHeight/2)<3&&r.x>=0&&r.right<=innerWidth})()",'Off-center or overflow '+edition+' '+width);
  await assert("document.querySelectorAll('.milestone-sparks>span').length===12",'Particle count');
  await assert("document.querySelector('.milestone-copy button').getBoundingClientRect().height>=44",'Small target');
  if(width===390){await new Promise(r=>setTimeout(r,750));await writeFile('/tmp/tiny-magic-review/'+edition+'.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'))}
  await click('[data-action=dismiss-milestone]');await assert("document.querySelector('#milestone').hidden",'Dismiss failed');
 }
}
await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
await js("milestoneQueue.set(state.goals[0].id,{id:state.goals[0].id,kind:'day',day:today()});flushMilestones()");
await assert("getComputedStyle(document.querySelector('.milestone-sigil')).animationName==='none'",'Reduced motion ignored');
await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await assert("document.querySelector('#milestone').hidden",'Escape failed');
await cdp('Page.close');ws.close();console.log('PASS: centered magic celebration, twelve theme motifs, bounded particles, mobile/desktop positioning, dismissal, Escape and reduced motion.');
