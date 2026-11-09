import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const qaUrl=process.env.TINY_QA_URL||'http://localhost:4177',debugUrl=process.env.TINY_QA_DEBUG_URL||'http://127.0.0.1:9223';
const target=await (await fetch(debugUrl+'/json/new?'+qaUrl,{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
await cdp('Page.enable');await cdp('Page.navigate',{url:qaUrl});await wait("typeof state!=='undefined'&&!state.busy");
await js('showDemo()');await js('document.fonts.ready');
for(const width of [320,390,430,1280]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});
 for(const safeTop of width<600?[0,24]:[0]){
  await js(`document.documentElement.style.setProperty('--top-safe-area','${safeTop}px')`);
  let reference;
  for(const view of ['intro','dreams','calendar','shelf','analytics','dreams']){
   const tab=view==='intro'?'dreams':view;
   await js(`document.querySelector('.tab[data-view="${tab}"]').click()`);
   await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
   await js("document.querySelector('#demoBanner').hidden=true;window.scrollTo(0,0);document.querySelector('#mobileDreams').scrollTop=0");
   if(width<600&&view==='intro')await js("document.querySelector('.mobile-chapter-back').click()");
   else if(width<600&&view==='dreams')await js("document.querySelector('.mobile-chapter-link').click()");
   await js('document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))');
   const geometry=await js(`(()=>{
    const b=document.querySelector('${width<600&&view==='dreams'?'.overview-mobile-brand':'.topbar .brand'}'),s=getComputedStyle(b),box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
    const filter=${width<600&&view==='dreams'?"document.querySelector('.overview-tools .home-filter')":"null"};
    return {brand:box(b),symbol:box(b.querySelector('svg')),text:box(b.querySelector('span')),font:s.font,spacing:s.letterSpacing,gap:s.gap,color:s.color,art:b.querySelector('svg').innerHTML,filterGap:filter?box(filter).x-(box(b).x+box(b).width):null};
   })()`);
   if(!reference)reference=geometry;
   for(const part of ['brand','symbol','text'])for(const metric of ['x','y','width','height'])assert.ok(Math.abs(geometry[part][metric]-reference[part][metric])<.1,`${width}px safe=${safeTop} ${view}: ${part}.${metric} shifts: ${JSON.stringify({reference,geometry})}`);
   for(const key of ['font','spacing','gap','color','art'])assert.equal(geometry[key],reference[key],`${view} logo differs in ${key}`);
   assert.ok(geometry.text.height<=parseFloat(await js(`getComputedStyle(document.querySelector('${width<600&&view==='dreams'?'.overview-mobile-brand':'.topbar .brand'}')).lineHeight`))+.1,'The wordmark must not wrap');
   if(geometry.filterGap!==null)assert.ok(geometry.filterGap>=5,'Home filters must not squeeze or overlap the logo');
   assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false);
   if(!['intro','dreams'].includes(view))assert.equal(await js("document.querySelectorAll('.topbar>.new-group-button').length"),0,'Leaving home removes its temporary create button');
   if(!safeTop){const png=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(`/tmp/brand-${view}-${width}.png`,Buffer.from(png.data,'base64'))}
  }
 }
 console.log('PASS: identical logo geometry, typography and artwork across intro, home, calendar, shelf, analytics and return at '+width+'px, including top safe area');
}
await js("document.documentElement.style.removeProperty('--top-safe-area')");
ws.close();
