import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {releaseHTML,releaseCSS} from './release.mjs';
const source=await readFile(new URL('../ui/updates.js',import.meta.url),'utf8');
const current='a'.repeat(20),next='b'.repeat(20);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function fixture(options={}){
  let now=1000,reloads=0,requests=0,remote=options.version??next;
  const intervals=new Map(),events=new Map();
  const document={hidden:false,activeElement:{matches:()=>false},dialog:false,
    querySelector(selector){return selector.startsWith('meta')?{content:current}:this.dialog?{}:null},
    addEventListener(name,handler){events.set(name,handler)}};
  const window={addEventListener(name,handler){events.set(name,handler)}};
  const navigator={onLine:options.online??true};
  const state={busy:false};
  vm.runInNewContext(source,{document,window,navigator,state,Date:{now:()=>now},AbortSignal,
    setInterval(fn,delay){intervals.set(delay,fn)},location:{reload(){reloads++}},
    async fetch(url,init){requests++;assert.equal(init.cache,'no-store');assert.ok(url.startsWith('/version.json?t='));if(options.offline)throw Error('network');return new Response(options.body??JSON.stringify({version:remote}),{status:options.status??200,headers:{'Content-Type':options.type??'application/json'}})}
  });
  await flush();
  return {document,navigator,state,events,intervals,advance(ms=4000){now+=ms},apply(){intervals.get(2000)()},async check(){await intervals.get(60000)();await flush()},setVersion(version){remote=version},get reloads(){return reloads},get requests(){return requests}};
}
let f=await fixture({version:current});f.advance();f.apply();assert.equal(f.reloads,0);
f=await fixture();assert.equal(f.reloads,0);f.advance();f.apply();assert.equal(f.reloads,1);f.apply();assert.equal(f.reloads,1,'Reload only once');
for(const blocker of ['dialog','focus','busy','hidden','offline']){
  f=await fixture();f.advance();
  if(blocker==='dialog')f.document.dialog=true;
  if(blocker==='focus')f.document.activeElement.matches=()=>true;
  if(blocker==='busy')f.state.busy=true;
  if(blocker==='hidden')f.document.hidden=true;
  if(blocker==='offline')f.navigator.onLine=false;
  f.apply();assert.equal(f.reloads,0,blocker+' must defer reload');
  f.document.dialog=false;f.document.activeElement.matches=()=>false;f.state.busy=false;f.document.hidden=false;f.navigator.onLine=true;
  f.apply();assert.equal(f.reloads,1,blocker+' must eventually update');
}
for(const options of [{offline:true},{status:503},{type:'text/html',body:'login'},{body:'not json'},{version:'malformed'}]){
  f=await fixture(options);f.advance();f.apply();assert.equal(f.reloads,0,'Failure must keep the existing app');
}
f=await fixture();f.advance();f.events.get('input')();f.apply();assert.equal(f.reloads,0,'Recent interactions must defer');f.advance();f.apply();assert.equal(f.reloads,1);
f=await fixture({version:current});f.setVersion(next);f.advance();await f.events.get('pageshow')();await flush();assert.equal(f.reloads,1,'Restored app checks for updates');
f=await fixture({version:current});f.document.hidden=true;await f.check();const requests=f.requests;f.setVersion(next);f.advance();f.document.hidden=false;await f.events.get('visibilitychange')();await flush();assert.equal(f.reloads,1);assert.equal(f.requests,requests+1);
f=await fixture({online:false});assert.equal(f.requests,0);f.navigator.onLine=true;f.advance();await f.events.get('online')();await flush();assert.equal(f.reloads,1);
const html=releaseHTML('<head><script src="/app.js"></script><link href="/style.css"><link href="/icon.svg"><a href="https://other.test/app.js">link</a></head>',current);
assert.ok(html.includes('tiny-dreams-build'));
for(const path of ['/app.js','/style.css','/icon.svg'])assert.ok(html.includes(path+'?v='+current));
assert.ok(html.includes('href="https://other.test/app.js"'));
assert.equal(releaseCSS("a{background:url('/garden.png')}b{src:url(/font.ttf)}c{background:url(https://other.test/a.png)}",current),`a{background:url('/garden.png?v=${current}')}b{src:url(/font.ttf?v=${current})}c{background:url(https://other.test/a.png)}`);
console.log('PASS: release URLs, unchanged version, deferred edits/writes, idle reload, restore/online checks, offline/invalid responses and no reload loops.');
