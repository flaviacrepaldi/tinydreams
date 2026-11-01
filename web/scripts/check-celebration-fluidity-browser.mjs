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
 await cdp('Page.enable');await cdp('Page.bringToFront');
 for(const width of [390,1440]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});await cdp('Page.navigate',{url:origin});await wait("typeof state!=='undefined'&&!state.busy");
  await js(`showDemo();state.goals=Array.from({length:12},(_,i)=>({id:'fluid-${width}-'+i,title:'conquista de exemplo '+i,target:21,color:'peach',days:[],entries:[],failures:[],reward:'',plan:{...planOf({}),start:dayBefore(3)}}));render();window.scrollTo(0,500)`);
  await js("celebrationArtWarmed.get(DreamThemes.current.celebrationAsset).decode()");
  const scroll=await js('scrollY');
  await js("document.querySelector('[data-action=quick-outcome][data-status=success]').click()");await wait("document.querySelector('#milestoneDialog').open");
  assert.equal(await js("document.documentElement.dataset.motion"),'paused','Background stays paused');
  assert.equal(await js("document.documentElement.dataset.celebrationMotion"),'active','Celebration stays active inside modal');
  assert.equal(await js("document.querySelectorAll('.celebration-frame').length"),8);
  const samples=await js(`new Promise(resolve=>{const samples=[],start=performance.now();function sample(t){samples.push({t:t-start,opacities:[...document.querySelectorAll('.celebration-frame')].map(el=>Number(getComputedStyle(el).opacity))});if(t-start<1450)requestAnimationFrame(sample);else resolve(samples)}requestAnimationFrame(sample)})`);
  assert.ok(samples.some(s=>s.opacities.some(o=>o>0.05&&o<.95)),'Frames blend rather than jump');
  const additive=await js("CSS.supports('mix-blend-mode','plus-lighter')");
  assert.ok(samples.every(s=>additive?s.opacities.reduce((sum,o)=>sum+o,0)>.99:s.opacities.some(o=>o>.9)),'No blank or dimmed gaps between poses');
  assert.equal(samples.at(-1).opacities.at(-1),1,'Final pose remains visible');
  const intervals=samples.slice(1).map((s,i)=>s.t-samples[i].t).sort((a,b)=>a-b);console.log(`${width}px rAF interval p95: ${intervals[Math.floor(intervals.length*.95)].toFixed(1)}ms`);
  assert.equal(await js("getComputedStyle(document.querySelector('#milestoneDialog'),'::backdrop').backdropFilter"),'none');
  const png=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(`/tmp/tiny-fluid-celebration-${width}.png`,Buffer.from(png.data,'base64'));
  await js('dismissMilestone()');await wait("!document.querySelector('#milestoneDialog').open");
  assert.equal(await js('scrollY'),scroll,'Closing restores the original page position');
  assert.equal(await js("Number.parseFloat(document.querySelector('[data-goal=\"'+state.goals[0].id+'\"] .progress>span').style.width)>0"),true,'Deferred feedback never rewinds the completed card progress');
  await js("openDetails(state.goals[1].id,today());document.querySelector('[data-outcome=success]').click()");await wait('!state.busy');
  assert.equal(await js("document.querySelector('#milestoneDialog').open"),false,'History does not get interrupted');
  await js("document.querySelector('#progressDialog').close()");await wait("document.querySelector('#milestoneDialog').open");
  assert.equal(await js("document.documentElement.dataset.celebrationMotion"),'active','Deferred celebration animates after history closes');
  await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await wait("document.documentElement.dataset.celebrationMotion==='paused'");
  assert.equal(await js("[...document.querySelectorAll('.celebration-frame')].every(el=>getComputedStyle(el).display==='none')"),true);
  assert.ok(await js("getComputedStyle(document.querySelector('.potion-sprite')).backgroundImage.includes(DreamThemes.current.celebrationAsset)"),'Reduced motion keeps final artwork');
  await cdp('Emulation.setEmulatedMedia',{features:[]});
  await js("{const t=document.querySelector('#motionToggle');t.checked=false;t.dispatchEvent(new Event('change'))}");
  assert.equal(await js("document.documentElement.dataset.celebrationMotion"),'paused','Manual pause applies to celebration');
  await js("{const t=document.querySelector('#motionToggle');t.checked=true;t.dispatchEvent(new Event('change'));dismissMilestone()}");
  assert.equal(await js('scrollY'),scroll,'History-to-celebration keeps the same scroll position');
  assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false);
 }
 console.log('PASS: continuous watercolor blending, active modal celebration with paused scenery, no pose gaps, reduced/manual motion, deferred history feedback, original scroll position and mobile/desktop bounds. Demo only.');
}finally{await cdp('Page.close');ws.close()}
