import {writeFile,mkdir} from 'node:fs/promises';
const target=await (await fetch('http://127.0.0.1:9223/json/new?http://localhost:4177',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+': '+r.exceptionDetails.exception?.description);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
async function click(selector){await js(`document.querySelector(${JSON.stringify(selector)}).click()`)}
async function screenshot(name,width,height=1000){await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});await js('document.fonts.ready');await js("document.querySelector('#goalDialog').scrollTop=document.querySelector('#emojiChoices').offsetTop-90");await new Promise(r=>setTimeout(r,300));const m=await cdp('Page.getLayoutMetrics');const png=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height,scale:1}});await writeFile(new URL('../../.impeccable/review/emoji-'+name+'.png',import.meta.url),Buffer.from(png.data,'base64'));const overflow=await js('document.documentElement.scrollWidth>innerWidth');if(overflow)throw Error('Horizontal overflow at '+width)}




await cdp('Page.enable');await cdp('Page.navigate',{url:'http://localhost:4177'});await wait("typeof state!=='undefined'&&!state.busy");await js('showDemo()');await click('#newGoalButton');
if(!await js("!document.querySelector('#goalColor')"))throw Error('Amulet selector remains');
await js("document.querySelector('#goalTitle').value='Meu sonho personalizado'");await click('[data-emoji="💧"]');
if(!await js("document.querySelector('#goalEmoji').value==='💧' && document.querySelector('[data-emoji=\"💧\"]').getAttribute('aria-pressed')==='true'"))throw Error('Picker not selected');
await screenshot('picker',390,844);await js("document.querySelector('#goalForm').requestSubmit()");await wait("!document.querySelector('#goalDialog').open");
const goalId=await js('state.goals.at(-1).id');const color=await js('state.goals.at(-1).color');
if(!await js(`!!document.querySelector('[data-goal="${goalId}"] .card-symbol')`))throw Error('Card emoji missing');
await click(`[data-action=edit][data-id="${goalId}"]`);if(!await js("document.querySelector('#goalEmoji').value==='💧'"))throw Error('Emoji lost on edit');
await js("document.querySelector('[aria-label=Coração]').click();document.querySelector('#goalForm').requestSubmit()");await wait("!document.querySelector('#goalDialog').open");
if(!await js(`state.goals.find(g=>g.id==='${goalId}').plan.emoji==='❤️' && state.goals.find(g=>g.id==='${goalId}').color==='${color}'`))throw Error('Symbol or amulet persistence failed');
await click('[data-view=today]');if(!await js("!!document.querySelector('#content .card-symbol')"))throw Error('Today emoji missing');
console.log('PASS: emoji picker, outline symbol selection, card and Today rendering, edit persistence, automatic amulet, mobile overflow.');ws.close();
