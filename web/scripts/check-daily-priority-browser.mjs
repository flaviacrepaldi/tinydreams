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
 await cdp('Page.enable');await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:1000,deviceScaleFactor:1,mobile:true});
 await cdp('Page.navigate',{url:origin});await wait("typeof state!=='undefined'&&!state.busy");
 await js(`showDemo();state.groups=[{id:'routine',name:'Minha rotina'}];const base={title:'Hábito',target:21,color:'sage',reward:'',redeemed:0,entries:[],failures:[],group_id:'routine',plan:{...planOf({}),completionMode:'total',start:dayBefore(14)}};state.goals=[{...base,id:'todo1',title:'Caminhar',days:[]},{...base,id:'todo2',title:'Ler',days:[]},{...base,id:'done',title:'Já fiz hoje',days:[today()]},{...base,id:'rest',title:'Descanso',days:[],plan:{...base.plan,weekdays:[(weekday(today())+1)%7]}}];render()`);
 await js('document.fonts.ready');
 assert.deepEqual(await js("[...document.querySelectorAll('.goal')].map(c=>c.dataset.goal)"),['todo1','todo2','done','rest']);
 assert.equal(await js("document.querySelector('.group-today-progress').textContent"),'1 de 3 feitos hoje');
 assert.equal(await js("document.querySelectorAll('.done-today').length"),1);
 await js("document.querySelector('[data-goal=todo1] [data-action=quick-outcome][data-status=success]').click()");
 await wait("!state.busy&&document.querySelector('[data-goal=todo1]').classList.contains('done-today')");
 await js("resetMilestonePanel();document.querySelector('#content').scrollIntoView({block:'start'})");
 assert.deepEqual(await js("[...document.querySelectorAll('.goal')].map(c=>c.dataset.goal)"),['todo2','todo1','done','rest']);
 assert.equal(await js("document.querySelector('.group-today-progress').textContent"),'2 de 3 feitos hoje');
 assert.equal(await js("state.goals.find(g=>g.id==='todo1').color"),'sage','Amulet ownership/color is preserved');
 assert.equal(await js("document.querySelector('[data-goal=todo1] .streak-square.current').classList.contains('success')"),true);
 assert.equal(await js("(()=>{const grid=document.querySelector('.goal-grid').getBoundingClientRect(),card=document.querySelector('[data-goal=todo1]').getBoundingClientRect();return Math.abs(grid.left-card.left)<2})()"),true,'Just-completed card stays in view');
 const png=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/tiny-daily-priority-mobile.png',Buffer.from(png.data,'base64'));
 await js(`const gallery=document.querySelector('.goal-grid'),start=new Touch({identifier:8,target:gallery,clientX:250,clientY:400}),end=new Touch({identifier:8,target:gallery,clientX:150,clientY:405});gallery.dispatchEvent(new TouchEvent('touchstart',{touches:[start],changedTouches:[start]}));gallery.dispatchEvent(new TouchEvent('touchend',{touches:[],changedTouches:[end]}))`);
 await wait('gallery.scrollLeft<2');
 await js("document.querySelector('[data-goal=todo1] [data-action=quick-outcome][data-status=success]').click()");
 await wait("!state.busy&&!document.querySelector('[data-goal=todo1]').classList.contains('done-today')");
 assert.equal(await js("document.querySelector('.group-today-progress').textContent"),'1 de 3 feitos hoje');
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await js('render()');
 const desktop=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/tiny-daily-priority-desktop.png',Buffer.from(desktop.data,'base64'));
 assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false);
 console.log('PASS: pending/done/rest ordering, daily totals, real demo check/undo, filled grid, stable viewport after completion, next pending swipe and preserved amulet color.');
}finally{await cdp('Page.close');ws.close()}
