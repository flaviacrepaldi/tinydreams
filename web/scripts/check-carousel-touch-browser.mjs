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
 await cdp('Page.enable');await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:1000,deviceScaleFactor:1,mobile:true});await cdp('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await cdp('Page.navigate',{url:origin});await wait("typeof state!=='undefined'&&!state.busy");
 await js("showDemo();document.querySelector('.goal-grid').scrollIntoView({block:'start'});window.grid=document.querySelector('.goal-grid');grid.scrollTo({left:grid.scrollWidth-grid.clientWidth,behavior:'instant'});window.events=[];['touchstart','touchmove','touchend','touchcancel','scrollend'].forEach(name=>grid.addEventListener(name,e=>events.push({type:name,prevented:e.defaultPrevented,x:e.changedTouches?.[0]?.clientX,scroll:grid.scrollLeft,max:grid.scrollWidth-grid.clientWidth}),{passive:true}))");
 await new Promise(r=>setTimeout(r,400));const box=await js("({x:grid.getBoundingClientRect().left,y:grid.getBoundingClientRect().top})");
 await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+260,y:box.y+110}]});
 for(let n=1;n<=8;n++){await cdp('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+260-n*20,y:box.y+110}]});await new Promise(r=>setTimeout(r,25))}
 await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await new Promise(r=>setTimeout(r,1200));
 const result=await js('({scroll:grid.scrollLeft,max:grid.scrollWidth-grid.clientWidth,events})');assert.ok(result.scroll<2,'Native touch swipe returns to first card');assert.ok(result.events.some(e=>e.type==='touchmove'&&e.prevented),'Outward gesture cancels native edge scrolling');console.log('PASS: native Chrome touch swipe wraps at the last card and suppresses edge scrolling.');
}finally{await cdp('Page.close');ws.close()}
