import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const origin=process.env.TINY_COMPLETION_URL||'http://localhost:4177';
const target=await (await fetch('http://127.0.0.1:9226/json/new?'+origin,{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);r.error?p.reject(Error(r.error.message)):p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function wait(expression){for(let n=0;n<100;n++){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
try{
 await cdp('Page.enable');await cdp('Page.navigate',{url:origin});await wait("typeof state!=='undefined'&&!state.busy");
 await js(`showDemo();const weekdays=[1,3,5],practice=[];for(let i=0;practice.length<14;i++){const d=dayBefore(i);if(weekdays.includes(weekday(d)))practice.push(d)};state.goals=[{id:'grid-test',title:'Aeróbico nos dias da rotina',color:'sage',target:30,reward:'',redeemed:0,days:practice.slice(0,7).filter((d,i)=>i!==2),failures:[practice[2]],entries:[],plan:{...planOf({}),completionMode:'total',start:dayBefore(40),weekdays}},{id:'amount-test',title:'Meu objetivo de valor',color:'peach',target:25000,reward:'',redeemed:0,days:[],failures:[],entries:[{key:'a',day:dayBefore(10),value:400},{key:'b',day:dayBefore(5),value:500},{key:'c',day:dayBefore(1),value:700}],plan:{...planOf({}),kind:'amount',unit:'R$'}}];render()`);
 assert.equal(await js("document.querySelectorAll('.streak-square').length"),14);
 assert.equal(await js("document.querySelectorAll('.streak-square.success').length>0"),true);
 assert.equal(await js("document.querySelectorAll('.streak-square.failure').length"),1);
 assert.equal(await js("document.querySelectorAll('.streak-square.rest svg').length>0"),true);
 assert.equal(await js("document.querySelector('.habit-streak').parentElement.className"),'dream-progress');

 for(const width of [320,390,700,768,1440]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:1050,deviceScaleFactor:1,mobile:width<=700});await js('document.fonts.ready');await js('fitAmountTrends();fitDreamGalleries()');
  assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false,'Page overflow at '+width);
  assert.equal(await js("[...document.querySelectorAll('.goal')].every(card=>card.querySelector('.dream-progress').getBoundingClientRect().bottom<=card.querySelector('.dream-card-footer').getBoundingClientRect().top+1)"),true,'Progress and actions must not overlap at '+width);
  assert.equal(await js("getComputedStyle(document.querySelector('.streak-grid')).gridTemplateColumns.split(' ').length"),7);
  assert.equal(await js("document.querySelectorAll('.streak-square')[7].getBoundingClientRect().top>document.querySelectorAll('.streak-square')[0].getBoundingClientRect().top"),true);
  assert.equal(await js("getComputedStyle(document.querySelector('.amount-trend')).display==='none'"),width<=700);
  if(width<=700)assert.equal(await js("getComputedStyle(document.querySelector('[data-goal=amount-test] .countdown')).visibility"),'visible');
  if([390,1440].includes(width)){
   await js("document.querySelector('#content').scrollIntoView({block:'start'})");
   const png=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(`/tmp/tiny-streak-grid-${width}.png`,Buffer.from(png.data,'base64'));
  }
 }
 await js("state.goals=[{...state.goals[0],id:'new-test',days:[],failures:[],plan:{...planOf({}),completionMode:'total'}}];render()");
 assert.equal(await js("document.querySelectorAll('.streak-square.rest').length"),13,'No invented missing history before a habit begins');
 console.log('PASS: 14 squares in two rows, rest-day crosses, success/failure/missing states, blank history, responsive chart removal/restoration and countdown at 320/390/700/768/1440px. Demo only.');
}finally{await cdp('Page.close');ws.close()}
