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
 await cdp('Page.enable');await cdp('Network.enable');await cdp('Network.setBlockedURLs',{urls:['*/editions/*','*/celebrations/*']});
 await cdp('Page.navigate',{url:origin});await wait("!!document.querySelector('.brand-hat')&&typeof state!=='undefined'&&!state.busy");
 assert.equal(await js("document.querySelector('.brand-hat').dataset.hat"),'halloween');
 assert.equal(await js("document.querySelectorAll('.brand-monogram .brand-spark').length"),1);
 const icon=await js("document.querySelector('link[rel=icon]').href"),letters=await js("document.querySelector('.brand-letters').getAttribute('d')");
 for(const width of [320,390,768,1440]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<=700});await js('document.fonts.ready');
  assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false,'Page overflow at '+width);
  assert.equal(await js("document.querySelector('.brand').getBoundingClientRect().right<=document.querySelector('#newGoalButton').getBoundingClientRect().left"),true,'Brand and create action do not overlap at '+width);
  await js('window.scrollTo(0,0)');
  if([390,1440].includes(width)){const png=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(`/tmp/tiny-brand-${width}.png`,Buffer.from(png.data,'base64'))}
 }
 // Inspect only the seasonal SVG; future illustrations stay blocked and are never captured.
 await js("DreamThemes.preview('2026-11')");
 assert.equal(await js("document.querySelector('.brand-hat').dataset.hat"),'tidal');
 assert.equal(await js("document.querySelector('.brand-letters').getAttribute('d')"),letters);
 assert.equal(await js("document.querySelector('link[rel=icon]').href"),icon);
 await js('DreamThemes.reset()');
 assert.equal(await js("document.querySelector('.brand-hat').dataset.hat"),'halloween');
 const small=await js("fetch(document.querySelector('link[rel=icon]').href).then(r=>r.text())");
 assert.equal(small.includes('brand-hat'),false);assert.equal(small.includes('brand-spark'),true);
 console.log('PASS: seasonal header hat, invariant monogram/spark, fixed icon, theme reset and header layout at 320/390/768/1440px. Future artwork blocked.');
}finally{await cdp('Page.close');ws.close()}
