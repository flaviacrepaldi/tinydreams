import {writeFile,mkdir} from 'node:fs/promises';
const target=await (await fetch('http://127.0.0.1:9223/json/new?http://localhost:4181',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+': '+r.exceptionDetails.exception?.description);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
async function click(selector){await js(`document.querySelector(${JSON.stringify(selector)}).click()`)}
await mkdir('/tmp/tiny-shelf-review',{recursive:true});await cdp('Page.enable');await cdp('Page.navigate',{url:'http://localhost:4181'});await wait("typeof state!=='undefined'&&!state.busy");
const assert=async(expression,message)=>{if(!await js(expression))throw Error(message)};
await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
await js(`state.demo=true;state.goals=Array.from({length:8},(_,i)=>({id:'modal-'+i,title:'Teste '+i,target:10,color:'sage',days:[],entries:[],failures:[]}));state.view='dreams';render();window.scrollTo(0,300)`);
const before=await js('window.scrollY');
await click('[data-action=quick-outcome][data-status=success][data-id=modal-0]');
await assert("document.querySelector('#milestoneDialog').open&&document.documentElement.classList.contains('milestone-open')",'Modal missing');
await assert("getComputedStyle(document.body).position==='fixed'",'Scroll unlocked');
await js("window.backgroundClicks=0;document.querySelector('#settingsButton').addEventListener('click',()=>window.backgroundClicks++)");
const png=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/tiny-shelf-review/modal-mobile.png',Buffer.from(png.data,'base64'));
await cdp('Input.dispatchMouseEvent',{type:'mousePressed',x:5,y:5,button:'left',clickCount:1});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:5,y:5,button:'left',clickCount:1});
await assert("!document.querySelector('#milestoneDialog').open&&!window.backgroundClicks&&!document.documentElement.classList.contains('milestone-open')",'Outside dismissal failed');
await assert(`window.scrollY===${before}`,'Scroll position lost');
await js("document.querySelector('#milestone').hidden=false;showMilestone()");await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await wait("!document.querySelector('#milestoneDialog').open");
await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await js("document.querySelector('#milestone').hidden=false;showMilestone()");
await assert("document.activeElement.closest('#milestoneDialog')!==null",'Focus escaped');await click('[data-action=dismiss-milestone]');await assert("!document.querySelector('#milestoneDialog').open",'Button failed');
console.log('PASS: mobile/desktop modal, outside click, background isolation, scroll lock/restoration, Escape, focus and close button. Demo only.');ws.close();
