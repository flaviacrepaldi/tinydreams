// Visual QA of editions. Saves files only; never forwards surprise artwork to chat.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const base=process.env.TINY_DREAMS_QA_URL||'http://localhost:4174';
const catalog=JSON.parse(await readFile(new URL('../ui/editions.json',import.meta.url),'utf8'));
const target=await(await fetch('http://127.0.0.1:9222/json/new?about:blank',{method:'PUT'})).json();
const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
let sequence=0;const pending=new Map();const errors=[];
socket.addEventListener('message',event=>{const response=JSON.parse(event.data);if(response.method==='Runtime.exceptionThrown')errors.push(response.params.exceptionDetails.text);if(!response.id)return;const p=pending.get(response.id);pending.delete(response.id);response.error?p.reject(Error(response.error.message)):p.resolve(response.result)});
const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))});
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function wait(expression){for(let n=0;n<120;n++){if(await js(expression))return;await pause(100)}throw Error('Timed out: '+expression)}
async function viewport(width,height=920){await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});await pause(150)}
const output=new URL('../../.impeccable/review/editions/',import.meta.url);await mkdir(output,{recursive:true});
async function screenshot(name){await js('document.fonts.ready');await js('scrollTo(0,0)');await pause(100);const metrics=await cdp('Page.getLayoutMetrics');const image=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:metrics.cssLayoutViewport.clientWidth,height:Math.ceil(metrics.cssContentSize.height),scale:1}});await writeFile(new URL(name+'.png',output),Buffer.from(image.data,'base64'))}
await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Network.enable');await cdp('Network.setCacheDisabled',{cacheDisabled:true});await cdp('Page.navigate',{url:base});await wait("typeof DreamThemes!=='undefined' && typeof state!=='undefined' && !state.busy");
assert.equal(await js('DreamThemes.current.id'),'2026-10');
assert.equal(await js("performance.getEntriesByType('resource').some(r=>r.name.includes('/editions/'))"),false,'Future art must not be loaded in advance');
assert.equal(await js("!!document.querySelector('#editionDetails,#editionPreview,#previewEdition,#editionPreviewBanner')"),false);
await js('showDemo()');const original=await js('JSON.stringify(state.goals)');
const response=await fetch(base+'/editions/unknown.png');assert.equal(response.status,404);
for(const edition of catalog){
  await js(`DreamThemes.preview(${JSON.stringify(edition.id)})`);
  if(edition.asset){await js(`new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=()=>reject(Error('Artwork unavailable'));image.src=${JSON.stringify(edition.asset)}})`);}
  assert.equal(await js('DreamThemes.current.id'),edition.id);
  assert.equal(await js('JSON.stringify(state.goals)'),original,'Theme previews must not mutate records');
  assert.equal(await js("document.querySelector('.moon-note,.season-note,footer')!==null"),false,'No scattered decorative phrases');
  for(const width of [320,390,768,1440]){
    await viewport(width);
    assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false,edition.id+' overflow at '+width);
    assert.equal(await js("document.querySelector('[data-action=quick-outcome][data-status=success]').getBoundingClientRect().height>=40"),true);
    if(width<=390)assert.equal(await js("[...document.querySelectorAll('.goal h2')].every(h=>h.getBoundingClientRect().width>=110)"),true,edition.id+' title space');
    if(width===390||width===1440)await screenshot(edition.id+(width===390?'-mobile':'-desktop'));
  }
  await viewport(390,844);await js("document.querySelector('#newGoalButton').click()");
  assert.equal(await js("getComputedStyle(document.querySelector('#goalTitle')).fontSize"),'16px');
  assert.equal(await js("document.querySelector('#goalDialog').getBoundingClientRect().width<=innerWidth"),true);
  assert.equal(await js("!!document.querySelector('#goalEmoji') && !document.querySelector('#goalColor')"),true);
  await js("document.querySelector('[data-close=goalDialog]').click()");
  await js("document.querySelector('[data-view=today]').click()");assert.equal(await js("document.querySelectorAll('.today-row').length"),3);
  await js("document.querySelector('[data-view=calendar]').click()");assert.ok(await js("document.querySelectorAll('.calendar-day').length>27"));
  await js("document.querySelector('[data-view=dreams]').click()");
  console.log('PASS:',edition.id,'artwork, four viewport widths, form, tabs and data preservation');
}
await js('DreamThemes.reset()');assert.equal(await js('DreamThemes.previewId'),null);assert.equal(await js('DreamThemes.current.id'),'2026-10');
await cdp('Page.reload');await wait("typeof DreamThemes!=='undefined' && !state.busy");assert.equal(await js('DreamThemes.previewId'),null);
await cdp('Page.addScriptToEvaluateOnNewDocument',{source:"{const Original=Date;const fixed=Original.parse('2027-01-12T15:00:00Z');window.Date=class extends Original{constructor(...args){super(...(args.length?args:[fixed]))}static now(){return fixed}}}"});
await cdp('Page.reload');await wait("typeof DreamThemes!=='undefined' && !state.busy");assert.equal(await js('DreamThemes.current.id'),'2027-01');assert.ok(await js("document.querySelector('h1').textContent.includes('Feliz aniversário!')"));
await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await wait("document.documentElement.dataset.motion==='paused'");assert.equal(await js("getComputedStyle(document.querySelector('#nightMagic')).display"),'none');
assert.deepEqual(errors,[]);console.log('PASS: automatic date selection, birthday, no surprise preloading, preview reset, reduced motion; no D1 writes.');socket.close();
