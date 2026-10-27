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
await js("state.demo=true;state.groups=[];state.view='dreams';state.goals=demoGoals().map((g,i)=>({...g,created_at:['2026-10-27T15:00:00Z','2026-11-10T15:00:00Z','2027-04-10T15:00:00Z'][i]}));render()");
const records=await js('JSON.stringify(state.goals)');
for(const edition of ['2026-10','2026-11','2026-12','2027-01','2027-02','2027-03','2027-04','2027-05','2027-06','2027-07','2027-08','2027-09']){
 await js(`DreamThemes.preview('${edition}')`);
 await assert(`[...document.querySelectorAll('.goal')].every(g=>g.dataset.amuletEdition==='${edition}')`,'Old dreams retained creation artwork '+edition);
 if(edition!=='2026-10')await assert("[...document.querySelectorAll('.goal')].every(g=>g.style.getPropertyValue('--amulet-objects').includes(DreamThemes.current.asset))",'Wrong artwork URL');
 await assert(`JSON.stringify(state.goals)===${JSON.stringify(records)}`,'Theme change rewrote saved records');
 for(const width of [320,390,768,1440]){await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<600});await assert('document.documentElement.scrollWidth<=innerWidth','Seasonal art overflow '+edition+' '+width)}
}
await js("DreamThemes.preview('2026-10')");await assert("getComputedStyle(document.querySelector('.ghost-spirit')).animationName==='none'",'Ghost started moving');
await js("DreamThemes.preview('2026-11');openForm(state.goals[0].id);document.querySelector('#goalTitle').value='Novo nome';document.querySelector('#goalForm').requestSubmit()");await wait("!document.querySelector('#goalDialog').open");await assert("state.goals[0].created_at==='2026-10-27T15:00:00Z'&&document.querySelector('.goal').dataset.amuletEdition==='2026-11'",'Edit changed creation date or restored old artwork');
await cdp('Page.close');ws.close();console.log('PASS: all dreams follow twelve current editions, saved records/slots remain intact, four responsive sizes, stationary October ghost and edit consistency. Demo only; no real writes.');
