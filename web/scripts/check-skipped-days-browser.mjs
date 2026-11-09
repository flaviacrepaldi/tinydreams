import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const qaUrl=process.env.TINY_QA_URL||'http://localhost:4177',debugUrl=process.env.TINY_QA_DEBUG_URL||'http://127.0.0.1:9223';
const target=await (await fetch(debugUrl+'/json/new?'+qaUrl,{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
await cdp('Page.enable');await cdp('Page.navigate',{url:qaUrl});await wait("typeof state!=='undefined'&&!state.busy");
await js("window.skipWrites=[];window.skipFetch=fetch;window.fetch=(url,options={})=>{if(options.method&&!['GET','HEAD'].includes(options.method))skipWrites.push(String(url));return skipFetch(url,options)};window.skipReal=JSON.stringify(state.real)");
for(const width of [320,390,430,1280]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});
 await js(`(()=>{showDemo();state.homeFilter='all';state.groups=[{id:'a',name:'cuidados'},{id:'b',name:'rotina'}];const p={...planOf({}),kind:'habit',start:dayBefore(12),end:dayBefore(-2),weekdays:[0,1,2,3,4,5,6],skippedDays:[dayBefore(3),dayBefore(4),today()]};state.goals=['total','streak','period','tasks','quantity','counter','impulse'].map((variant,i)=>({id:'skip-'+variant,title:variant==='tasks'?'uma lista diária com título em duas linhas':'cuidar de mim · '+variant,target:30,color:['sage','peach','lavender'][i%3],group_id:i<4?'a':'b',created_at:new Date().toISOString(),reward:'uma pausa para ler',days:[dayBefore(1)],failures:variant==='impulse'?[]:[dayBefore(2)],entries:[],plan:{...p,completionMode:variant==='streak'?'streak':variant==='period'?'period':'total',dailyList:variant==='tasks',tasks:variant==='tasks'?[{id:'one',title:'cuidar de mim',weekdays:p.weekdays}]:[],dailyTarget:['quantity','counter'].includes(variant)?2:null,dailyCounter:variant==='counter',impulse:variant==='impulse',impulseStartedAt:dayBefore(8)+'T12:00:00-03:00',notes:variant==='tasks'?'uma observação que pode ocupar mais de uma linha':''}}));state.goals.push({id:'skip-control',title:'atividade prevista hoje',target:30,color:'sage',days:[],failures:[],entries:[],plan:{...p,skippedDays:[]}});seedMilestones();render();document.querySelector('#demoBanner').hidden=true;document.querySelector('.mobile-chapter-link')?.click()})()`);
 await js('document.fonts.ready');
 for(const variant of ['total','streak','period','tasks','quantity','counter','impulse']){
  const result=await js(`(()=>{const c=document.querySelector('[data-goal="skip-${variant}"]'),current=c.querySelector('.streak-square.current'),s=getComputedStyle(current);return {height:c.getBoundingClientRect().height,overflow:c.scrollHeight-c.clientHeight,cells:c.querySelectorAll('.streak-square').length,watermark:current.classList.contains('rest-today'),opacity:Number(s.opacity),content:current.innerHTML,outline:s.outlineStyle,disabled:[...c.querySelectorAll('.quick-outcomes button')].every(b=>b.disabled),past:[3,4].map(n=>{const e=c.querySelector('[data-practice-day="'+dayBefore(n)+'"]');return {absent:!e}}),failure:'${variant}'==='impulse'||(()=>{const f=c.querySelector('[data-practice-day="'+dayBefore(2)+'"]');return getComputedStyle(f).visibility==='visible'&&!!f.querySelector('svg')})(),undo:c.querySelector('.skip-day-button')?.disabled}})()`);
  assert.equal(await js(`document.querySelectorAll('[data-goal="skip-${variant}"] .omitted-day').length`),0,'No hidden gaps between planned dates');
  assert.equal(result.height,582);assert.ok(result.overflow<=1);assert.equal(result.cells,14);
  assert.equal(result.watermark,true);assert.ok(result.opacity<=.3);assert.equal(result.content,'');assert.equal(result.outline,'none');assert.equal(result.disabled,true);
  for(const past of result.past)assert.equal(past.absent,true,'Skipped dates consume no grid cell');
  assert.equal(result.failure,true,'Real failures remain visible');if(variant!=='impulse')assert.equal(result.undo,false,'Undo skip remains available');
 }
 await js("document.querySelector('[data-goal=skip-total] .quick-outcomes button').click()");
 assert.equal(await js("planOf(state.goals[0]).skippedDays.includes(today())"),true,'Disabled actions cannot register a skipped day');
 await js("document.querySelector('[data-filter=today]').click()");
 assert.equal(await js("document.querySelectorAll('.goal').length"),1,'Today contains only scheduled dreams');
 assert.equal(await js("document.querySelector('.goal').dataset.goal"),'skip-control');
 await js("document.querySelector('[data-filter=all]').click();document.querySelector('[data-goal=skip-total] .skip-day-button').click()");await wait('!state.busy');
 assert.equal(await js("planOf(state.goals[0]).skippedDays.includes(today())"),false);
 assert.equal(await js("document.querySelector('[data-goal=skip-total] .current').classList.contains('rest-today')"),false);
 assert.equal(await js("document.querySelector('[data-goal=skip-total] .quick-outcomes button').disabled"),false);
 await js("document.querySelector('[data-filter=today]').click()");
 assert.equal(await js("document.querySelectorAll('.goal').length"),2,'Undo returns the dream to Today');
 await js("document.querySelector('[data-goal=skip-total] .skip-day-button').click()");await wait('!state.busy');
 assert.equal(await js("document.querySelector('[data-goal=skip-total]')"),null,'Actual skip action removes the dream from Today');
 await js("document.querySelector('[data-filter=all]').click();state.goals[0].plan.end=today();render()");
 assert.equal(await js("document.querySelector('[data-goal=skip-total] .current').innerHTML"),'','Skipped deadline today remains an empty watermark');
 await js("state.goals[0].plan.end=dayBefore(-2);state.goals[0].plan.skippedDays=[dayBefore(3),dayBefore(4)];state.goals[0].plan.weekdays=[0,1,2,3,4,5,6].filter(d=>d!==dateFrom(today()).getDay());render()");
 assert.equal(await js("document.querySelector('[data-goal=skip-total] .current').innerHTML"),'','Weekday rest also has no cross');
 assert.equal(await js("document.querySelector('[data-goal=skip-total] .current').classList.contains('rest-today')"),true);
 await js("state.goals[0].plan.weekdays=[0,1,2,3,4,5,6];state.goals[0].plan.skippedDays.push(today());render();document.querySelector('#demoBanner').hidden=true");
 await js("state.goals[0].plan.start=dayBefore(60);state.goals[0].plan.end='';state.goals[0].plan.weekdays=[1,3,5];render()");
 const compressed=await js("(()=>{const cells=[...document.querySelectorAll('[data-goal=skip-total] .streak-square')];return {current:cells.findIndex(e=>e.classList.contains('current')),dates:cells.map(e=>e.dataset.practiceDay),planned:cells.filter(e=>!e.classList.contains('current')).every(e=>scheduled(state.goals[0],e.dataset.practiceDay)&&getComputedStyle(e).visibility==='visible')}})()");
 assert.equal(compressed.current,10);assert.equal(compressed.dates.length,14);assert.equal(compressed.planned,true,'Weekday rests consume no cells');
 assert.ok(compressed.dates.some((day,i)=>i&&Date.parse(day)-Date.parse(compressed.dates[i-1])>86400000),'Calendar gaps compact into neighboring circles');
 await js("state.goals[0].plan.weekdays=[0,1,2,3,4,5,6];state.goals[0].plan.end=dayBefore(-2);render()");
 await js("state.goals[0].plan.start=dayBefore(2);render();document.querySelector('#demoBanner').hidden=true;clearTimeout(toastTimer);document.querySelector('#toast').hidden=true");
 const beforeStart=await js("[...document.querySelectorAll('[data-goal=skip-total] .prestart-day')].map(e=>({opacity:Number(getComputedStyle(e).opacity),visibility:getComputedStyle(e).visibility,content:e.innerHTML,aria:e.getAttribute('aria-hidden')}))");
 assert.ok(beforeStart.length>=8,'Earlier dates fill the reserved row');
 for(const day of beforeStart){assert.ok(day.opacity<=.15);assert.equal(day.visibility,'visible');assert.equal(day.content,'');assert.equal(day.aria,'true')}
 await js("document.querySelector('[data-goal=skip-total]').scrollIntoView({block:'start',inline:'start',behavior:'instant'})");
 const startShot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(`/tmp/skipped-prestart-${width}.png`,Buffer.from(startShot.data,'base64'));
 await js("state.goals[0].plan.start=dayBefore(12);render();document.querySelector('#demoBanner').hidden=true");
 for(const variant of ['total','streak','period','tasks','quantity','counter','impulse']){
  await js(`document.querySelector('[data-goal="skip-${variant}"]').scrollIntoView({block:'start',inline:'start',behavior:'instant'})`);
  await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  const png=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(`/tmp/skipped-${variant}-${width}.png`,Buffer.from(png.data,'base64'));
 }
 assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false);
 console.log('PASS: skipped/rest dates are removed without gaps, Today watermark is empty, daily actions disabled, All/Today and undo work across habit types at '+width+'px');
}
assert.deepEqual(await js('skipWrites'),[]);assert.equal(await js('JSON.stringify(state.real)===skipReal'),true);
ws.close();
