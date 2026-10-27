import assert from 'node:assert/strict';
const base=process.env.TINY_DREAMS_QA_URL||'http://localhost:4181';
const target=await(await fetch('http://127.0.0.1:9223/json/new?'+base,{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0,navigations=0;const pending=new Map();
ws.addEventListener('message',event=>{const r=JSON.parse(event.data);if(r.method==='Page.frameNavigated'&&!r.params.frame.parentId)navigations++;if(r.id){const p=pending.get(r.id);pending.delete(r.id);r.error?p.reject(Error(r.error.message)):p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(resolve=>setTimeout(resolve,100))}throw Error('Timed out: '+expression)}
try{
 await cdp('Page.enable');await cdp('Page.bringToFront');await cdp('Page.navigate',{url:base});
 await wait('document.readyState==="complete" && !document.hidden && typeof state!=="undefined" && !state.busy && !!document.querySelector("meta[name=tiny-dreams-build]")');
 assert.match(await js('Array.from(document.scripts).find(script=>script.src.includes("updates.js")).src'),/updates\.js\?v=[a-f0-9]{20}$/);
 await js('document.querySelector("#newGoalButton").click();document.querySelector("#goalTitle").value="RASCUNHO preservado"');
 const before=navigations;
 await js(`window.originalFetch=fetch;window.releaseChecks=0;window.fetch=async(url,options)=>{if(String(url).startsWith('/version.json')){window.releaseChecks++;return new Response(JSON.stringify({version:'f'.repeat(20)}),{headers:{'Content-Type':'application/json'}})}return window.originalFetch(url,options)};const originalNow=Date.now;Date.now=()=>originalNow()+10000;window.dispatchEvent(new Event('pageshow'))`);
 await wait('window.releaseChecks>0');
 assert.equal(navigations,before,'Must not reload while editing');
 assert.equal(await js('document.querySelector("#goalTitle").value'),'RASCUNHO preservado');
 await js('document.querySelector("[data-close=goalDialog]").click();window.dispatchEvent(new Event("pageshow"))');
 await wait('window.releaseChecks===undefined && typeof state!=="undefined" && !state.busy');
 assert.equal(navigations,before+1,'An idle app must reload exactly once');
 assert.equal(await js('document.querySelector("meta[name=tiny-dreams-build]").content.length'),20);
 console.log('PASS: versioned browser assets, simulated release detection, draft preservation while editing, automatic idle reload and no reload loop.');
}finally{await cdp('Page.close');ws.close();}
