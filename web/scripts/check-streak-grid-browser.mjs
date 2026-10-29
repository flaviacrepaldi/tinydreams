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
 await js(`showDemo();const weekdays=[1,3,5],practice=[];for(let i=0;practice.length<14;i++){const d=dayBefore(i);if(weekdays.includes(weekday(d)))practice.push(d)};state.goals=[{id:'grid-test',title:'Aeróbico nos dias da rotina',color:'sage',target:30,reward:'',redeemed:0,days:practice.slice(0,7).filter((d,i)=>i!==2),failures:[practice[2]],entries:[],plan:{...planOf({}),completionMode:'period',start:dayBefore(40),end:dayBefore(-10),weekdays}},{id:'amount-test',title:'Meu objetivo de valor',color:'peach',target:25000,reward:'',redeemed:0,days:[],failures:[],entries:[{key:'a',day:dayBefore(10),value:400},{key:'b',day:dayBefore(5),value:500},{key:'c',day:dayBefore(1),value:700}],plan:{...planOf({}),kind:'amount',unit:'R$'}}];render()`);
 assert.equal(await js("document.querySelectorAll('.streak-square').length"),14);
 assert.equal(await js("document.querySelectorAll('.streak-square.success').length>0"),true);
 assert.equal(await js("document.querySelectorAll('.streak-square.failure').length"),1);
 assert.equal(await js("document.querySelectorAll('.streak-square.rest svg').length>0"),true);
 assert.equal(await js("document.querySelector('.habit-streak').parentElement.className"),'dream-daily-slot');

 await js("state.goals.push({...state.goals[0],id:'tall-test',title:'Uma lista diária com um título mais longo para conferir o espaço',reward:'Uma recompensa escolhida para celebrar',plan:{...planOf({}),completionMode:'total',dailyList:true,start:dayBefore(40),tasks:Array.from({length:8},(_,i)=>({id:'t'+i,title:'Item '+i,weekdays:[0,1,2,3,4,5,6]}))}});render()");
 for(const width of [320,390,700,768,1440]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:1050,deviceScaleFactor:1,mobile:width<=700});await js('document.fonts.ready');await js('fitAmountTrends();fitDreamGalleries()');
  assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false,'Page overflow at '+width);
  if(width<=560){
   assert.equal(await js("(()=>{const slot=document.querySelector('[data-goal=grid-test] .dream-daily-slot').getBoundingClientRect(),grid=document.querySelector('[data-goal=grid-test] .habit-streak').getBoundingClientRect();return Math.abs((grid.top-slot.top)-(slot.bottom-grid.bottom))<20})()"),true,'Balanced space around grid at '+width);
   assert.equal(await js("Math.abs(document.querySelector('[data-goal=grid-test]').getBoundingClientRect().height-document.querySelector('[data-goal=tall-test]').getBoundingClientRect().height)<2"),true,'Stable carousel card height');

  }

  assert.equal(await js("[...document.querySelectorAll('.goal')].every(card=>card.querySelector('.dream-progress').getBoundingClientRect().bottom<=card.querySelector('.dream-card-footer').getBoundingClientRect().top+1)"),true,'Progress and actions must not overlap at '+width);
  assert.equal(await js("getComputedStyle(document.querySelector('.streak-grid')).gridTemplateColumns.split(' ').length"),7);
  assert.equal(await js("(()=>{const grid=document.querySelector('.habit-streak').getBoundingClientRect(),card=document.querySelector('[data-goal=grid-test]').getBoundingClientRect();return Math.abs((grid.left+grid.right)-(card.left+card.right))<2})()"),true,'Centered grid at '+width);
  assert.equal(await js("document.querySelector('.streak-square').getBoundingClientRect().width>25"),true,'Larger squares at '+width);
  assert.equal(await js("document.querySelector('.habit-streak').getBoundingClientRect().bottom<=document.querySelector('[data-goal=grid-test] .dream-date-slot').getBoundingClientRect().top"),true,'Grid above deadline');
  assert.equal(await js("document.querySelectorAll('.streak-square')[7].getBoundingClientRect().top>document.querySelectorAll('.streak-square')[0].getBoundingClientRect().top"),true);
  assert.equal(await js("getComputedStyle(document.querySelector('.amount-trend')).display==='none'"),false);
  assert.equal(await js("document.querySelector('.amount-trend svg').getBoundingClientRect().height>=85"),true,'Readable plot at '+width);
  if(width<=700)assert.equal(await js("getComputedStyle(document.querySelector('[data-goal=amount-test] .countdown')).visibility"),'visible');
  if([390,1440].includes(width)){
   await js("document.querySelector('#content').scrollIntoView({block:'start'})");
   const png=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(`/tmp/tiny-streak-grid-${width}.png`,Buffer.from(png.data,'base64'));
   if(width===390){
    await js("const gallery=document.querySelector('.goal-grid'),amount=document.querySelector('[data-goal=amount-test]');gallery.scrollTo({left:amount.offsetLeft-gallery.firstElementChild.offsetLeft,behavior:'instant'})");
    await new Promise(r=>setTimeout(r,250));
    const amountMobile=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/tiny-amount-mobile.png',Buffer.from(amountMobile.data,'base64'));
    await js("gallery.scrollTo({left:gallery.scrollWidth-gallery.clientWidth,behavior:'instant'})");await new Promise(r=>setTimeout(r,300));
    assert.equal(await js('gallery.scrollLeft>0'),true,'Last card stays available to read');
    await js(`window.gallerySwipe=(dx,dy)=>{const start=new Touch({identifier:7,target:gallery,clientX:250,clientY:400}),end=new Touch({identifier:7,target:gallery,clientX:250+dx,clientY:400+dy});gallery.dispatchEvent(new TouchEvent('touchstart',{touches:[start],changedTouches:[start]}));gallery.dispatchEvent(new TouchEvent('touchend',{touches:[],changedTouches:[end]}))};gallerySwipe(-5,-100)`);
    await new Promise(r=>setTimeout(r,300));assert.equal(await js('gallery.scrollLeft>0'),true,'Vertical scrolling does not wrap');
    await js('gallerySwipe(-100,5)');await wait('gallery.scrollLeft<2');
    await js("gallery.scrollTo({left:gallery.scrollWidth-gallery.clientWidth,behavior:'instant'})");await new Promise(r=>setTimeout(r,300));
    await js("gallery.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}))");await wait('gallery.scrollLeft<2');

   }

  }
 }
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
 await js("state.goals=state.goals.filter(g=>g.id==='amount-test');render();fitAmountTrends()");
 assert.equal(await js("document.querySelector('.amount-trend').getBoundingClientRect().height>=150"),true,'Standalone amount chart has its own height');
 assert.equal(await js("document.querySelector('.amount-trend svg').getBoundingClientRect().height>=85"),true,'Plot remains readable without a neighboring habit');
 assert.equal(await js("document.querySelector('.amount-trend').getBoundingClientRect().top>=document.querySelector('.dream-summary').getBoundingClientRect().bottom"),true,'Plot stays below summary');
 assert.equal(await js("document.querySelector('.amount-trend').getBoundingClientRect().bottom<document.querySelector('.dream-progress>.progress').getBoundingClientRect().top"),true,'Plot stays above progress');
 const standalone=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/tiny-amount-standalone.png',Buffer.from(standalone.data,'base64'));
 await js("state.goals=[{...state.goals[0],id:'new-test',days:[],entries:[],failures:[],plan:{...planOf({}),completionMode:'total'}}];render()");
 assert.equal(await js("document.querySelectorAll('.streak-square.rest').length"),13,'No invented missing history before a habit begins');
 console.log('PASS: 14 squares in two rows, rest-day crosses, success/failure/missing states, blank history, readable charts on mobile and desktop and countdown at 320/390/700/768/1440px. Demo only.');
}finally{await cdp('Page.close');ws.close()}
