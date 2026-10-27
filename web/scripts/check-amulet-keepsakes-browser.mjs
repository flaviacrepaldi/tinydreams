import {writeFile,mkdir} from 'node:fs/promises';
const target=await (await fetch('http://127.0.0.1:9223/json/new?http://localhost:4181',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+': '+r.exceptionDetails.exception?.description);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
async function click(selector){await js(`document.querySelector(${JSON.stringify(selector)}).click()`)}
await cdp('Page.enable');await cdp('Page.navigate',{url:'http://localhost:4181'});await wait("typeof state!=='undefined'&&!state.busy");
const assert=async(expression,message)=>{if(!await js(expression))throw Error(message)};
await assert("!performance.getEntriesByType('resource').some(r=>r.name.includes('/editions/'))",'Future art preloaded');
await assert("DreamThemes.forCreation('2026-11-01T02:59:59Z').id==='2026-10'&&DreamThemes.forCreation('2026-11-01T03:00:00Z').id==='2026-11'",'Birth edition timezone boundary wrong');
await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:1000,deviceScaleFactor:1,mobile:true});
const editions=['2026-10','2026-11','2026-12','2027-01','2027-02','2027-03','2027-04','2027-05','2027-06','2027-07','2027-08','2027-09'];
const snapshot="JSON.stringify([...document.querySelectorAll('.goal')].map(g=>{const art=g.querySelector('.talisman'),s=getComputedStyle(art);return {birth:g.dataset.amuletEdition,image:s.backgroundImage,size:s.backgroundSize,width:s.width,height:s.height,ghost:g.querySelector('.ghost-scene')?getComputedStyle(g.querySelector('.ghost-scene')).display:null}}))";
for(const birth of editions){
 await js(`state.demo=true;state.groups=[];state.view='dreams';state.goals=demoGoals().map(g=>({...g,created_at:'${birth}-10T15:00:00.000Z'}));render()`);
 const before=await js(snapshot),records=await js('JSON.stringify(state.goals)');
 for(const room of editions){await js(`DreamThemes.preview('${room}')`);if(await js(snapshot)!==before)throw Error('Amulet changed from '+birth+' inside '+room);await assert('document.documentElement.scrollWidth<=innerWidth','Mixed-edition overflow');if(await js('JSON.stringify(state.goals)')!==records)throw Error('Theme switch rewrote records')}
}
await js("state.goals=demoGoals().map(g=>({...g,created_at:'2026-10-27T15:00:00Z'}));DreamThemes.preview('2026-11');render()");
await assert("getComputedStyle(document.querySelector('.ghost-spirit')).animationName==='none'",'Ghost started moving');
for(const width of [320,390,768,1440]){await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<600});await assert('document.documentElement.scrollWidth<=innerWidth','Retained art overflow '+width)}
await js("openForm(state.goals[0].id);document.querySelector('#goalTitle').value='Novo nome';document.querySelector('#goalForm').requestSubmit()");await wait("!document.querySelector('#goalDialog').open");await assert("state.goals[0].created_at==='2026-10-27T15:00:00Z'&&document.querySelector('.goal').dataset.amuletEdition==='2026-10'",'Edit changed birth amulet');
await js('DreamThemes.reset()');console.log('PASS: immutable amulets for all 12 birth editions across all 12 rooms, Sao Paulo boundaries, no preloading, preserved data/edits, stationary ghost and responsive mixed-edition cards. Demo only; no real writes.');ws.close();
