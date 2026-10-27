import {writeFile,mkdir} from 'node:fs/promises';
const target=await (await fetch('http://127.0.0.1:9223/json/new?http://localhost:4181',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+': '+r.exceptionDetails.exception?.description);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
async function click(selector){await js(`document.querySelector(${JSON.stringify(selector)}).click()`)}
await mkdir('/tmp/tiny-groups-review',{recursive:true});await cdp('Page.enable');await cdp('Page.navigate',{url:'http://localhost:4181'});await wait("typeof state!=='undefined'&&!state.busy");
const assert=async(expression,message)=>{if(!await js(expression))throw Error(message)};
await js("state.view='shelf';render()");await wait("!!document.querySelector('.portrait-bookcase')");
await assert("document.querySelectorAll('.portrait-spine').length===8&&!document.querySelector('.spine-art')",'Empty shelf must have eight closed spines');
await js('shelfDemo(3)');await wait("document.querySelectorAll('.spine-art').length===3");
await assert("!document.querySelector('#content').textContent.includes('Machado')",'Partial shelf leaked identity');
await click('[data-action=collection-album]');await wait("!!document.querySelector('.writer-open-album')");await assert("document.querySelectorAll('.writer-album-slot').length===10&&!document.querySelector('.writer-portrait')",'Partial example unlocked album');
await js('shelfDemo(8)');await wait("document.querySelectorAll('.spine-art').length===8");await click('[data-action=collection-album]');await wait("!!document.querySelector('.writer-portrait')");await assert("document.querySelectorAll('.unlocked').length===1&&document.querySelectorAll('.sealed').length===9",'Album slots incorrect');
await assert("document.querySelector('.album-biography h3').textContent==='Machado de Assis'",'Earned biography missing');
for(const width of [320,390,768,1440]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<600});
 for(const edition of ['2026-10','2026-12','2027-04','2027-09']){
  await js(`DreamThemes.preview('${edition}')`);await js('document.fonts.ready');
  await assert('document.documentElement.scrollWidth<=innerWidth','Album horizontal overflow '+width+' '+edition);
  await assert("getComputedStyle(document.querySelector('.writer-collection')).backgroundColor==='rgb(33, 27, 49)'",'Collection changed with monthly edition');
 }
 await js("DreamThemes.reset();document.querySelector('#content').scrollIntoView()");
 await writeFile('/tmp/tiny-groups-review/album-'+width+'.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
 await click('[data-action=collection-shelf]');await wait("!!document.querySelector('.portrait-bookcase')");
 await assert("getComputedStyle(document.querySelector('.portrait-bookcase')).gridTemplateColumns.split(' ').length===4",'Shelf is not four columns');
 await assert("document.querySelectorAll('.portrait-spine').length===8&&document.querySelectorAll('.spine-art').length===8",'Full portrait missing books');
 await assert('document.documentElement.scrollWidth<=innerWidth','Shelf overflow '+width);
 await click('[data-action=shelf-book]');await wait("!!document.querySelector('.shelf-selected')");await assert("!!document.querySelector('[data-action=redeem]')&&!!document.querySelector('[data-action=details]')",'Book history and reward missing');
 await writeFile('/tmp/tiny-groups-review/books-'+width+'.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await click('[data-action=collection-album]');await wait("!!document.querySelector('.writer-open-album')");
}
await click('#leaveDemo');await wait('!state.demo');await wait("!!document.querySelector('.writer-open-album')");await assert("!document.querySelector('.writer-portrait')",'Leaving demo retained earned writer');
await js("state.view='shelf';collectionView='shelf';render();state.view='dreams';render()");await new Promise(r=>setTimeout(r,400));await assert("!document.querySelector('.writer-collection')",'Late collection request replaced active screen');
await cdp('Page.close');ws.close();console.log('PASS: 3/8 and 8/8 previews, ten album slots, no identity leaks, four-column shelves, rewards/history, four viewport sizes, four editions, demo exit, and stale-request protection.');
