import {writeFile,mkdir} from 'node:fs/promises';
const target=await (await fetch('http://127.0.0.1:9223/json/new?http://localhost:4177',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+': '+r.exceptionDetails.exception?.description);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
async function click(selector){await js(`document.querySelector(${JSON.stringify(selector)}).click()`)}
async function capture(name,selector,width=390){await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});await js('document.fonts.ready');if(selector)await js(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start'})`);await new Promise(r=>setTimeout(r,100));const png=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(new URL('../../.impeccable/review/front-outcomes-'+name+'.png',import.meta.url),Buffer.from(png.data,'base64'));if(await js('document.documentElement.scrollWidth>innerWidth'))throw Error('Horizontal overflow')}


await cdp('Page.enable');await cdp('Page.navigate',{url:'http://localhost:4177'});await wait("typeof state!=='undefined'&&!state.busy");await js("showDemo();const p={kind:'habit',impulse:true,start:'',end:'',weekdays:[0,1,2,3,4,5,6],notes:'',unit:'',support:'',tasks:[],items:[]};state.goals=[{id:'front-impulse',title:'Meu combinado',target:20,color:'sage',reward:'',days:[],failures:[],entries:[],plan:p},{id:'front-simple',title:'Meu hábito',target:20,color:'lavender',reward:'',days:[],failures:[],entries:[]}];render()");
await capture('mobile','#content');
await click('[data-action=quick-outcome][data-status=failure][data-id=front-impulse]');
await wait("outcomeOf(state.goals[0],today())==='failure'");if(await js("document.querySelector('#progressDialog').open"))throw Error('Failure opened history');
await click('[data-action=quick-outcome][data-status=success][data-id=front-impulse]');
await wait("outcomeOf(state.goals[0],today())==='success'");
await click('[data-action=quick-outcome][data-status=success][data-id=front-impulse]');await wait("outcomeOf(state.goals[0],today())===null");
await click('[data-action=quick-outcome][data-status=failure][data-id=front-simple]');await wait("outcomeOf(state.goals[1],today())==='failure'");
await click('[data-view=today]');await capture('today','#content');
await click('[data-action=quick-outcome][data-status=success][data-id=front-simple]');await wait("outcomeOf(state.goals[1],today())==='success'");
if(await js("document.querySelector('#progressDialog').open"))throw Error('Today action opened history');
await click('[data-view=dreams]');await capture('desktop','#content',1440);
console.log('PASS: direct success/failure on impulse and ordinary habit cards, correction/undo, Today actions, no history modal, mobile/desktop layout.');ws.close();
