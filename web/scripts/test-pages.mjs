import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {localDB} from './sqlite.mjs';
import entry from '../dist-pages/_worker.js';
const directory = await mkdtemp(join(tmpdir(),'tiny-dreams-auth-'));
const DB=localDB(join(directory,'auth.sqlite'));
const env={DB,OWNER_PASSWORD:'test-only-password-32-characters',ASSETS:{fetch:async()=>new Response('private asset')}};
const origin='https://tinydreams.pages.dev';
function request(path='/',options={}) {
  const {method='GET',cookie,password,headers={},body}=options;
  return new Request(origin+path,{method,headers:{...(method==='POST'?{'Origin':origin,'Content-Type':'application/x-www-form-urlencoded','CF-Connecting-IP':'192.0.2.1'}:{}),...(cookie?{Cookie:cookie}:{}),...headers},...(method==='POST'?{body:body??new URLSearchParams({password:password??env.OWNER_PASSWORD}).toString()}: {})});
}
async function call(path,options={},bindings=env){return entry.fetch(request(path,options),bindings)}
try {
  assert.equal((await call('/login',{},{})).status,503);
  assert.equal((await call('/login',{}, {...env,OWNER_PASSWORD:'short'})).status,503);
  assert.equal((await call('/login')).status,200);
  for(const path of ['/', '/editions/test.png','/writers/01.png']) {
    const r=await call(path,{headers:{'oai-authenticated-user-id':'local-preview','Cf-Access-Jwt-Assertion':'fake'}});
    assert.equal(r.status,303);assert.equal(r.headers.get('Location'),'/login');
  }
  assert.equal((await call('/api/goals')).status,401);
  assert.equal((await call('/auth/login')).status,405);
  assert.equal((await call('/auth/login',{method:'POST',headers:{Origin:'https://evil.test'}})).status,403);
  assert.equal((await call('/auth/login',{method:'POST',headers:{Origin:''}})).status,403);
  assert.equal((await call('/auth/login',{method:'POST',headers:{'Content-Type':'application/json'}})).status,415);
  assert.equal((await call('/auth/login',{method:'POST',password:'wrong'})).status,401);
  const login=await call('/auth/login',{method:'POST'});
  assert.equal(login.status,303);
  const setCookie=login.headers.get('Set-Cookie');
  for(const part of ['__Host-tinydreams=','HttpOnly','Secure','SameSite=Strict','Path=/','Max-Age=604800'])assert.ok(setCookie.includes(part),part);
  const cookie=setCookie.split(';')[0];
  const root=await call('/',{cookie});
  assert.equal(await root.text(),'private asset');
  assert.equal(root.headers.get('Cache-Control'),'private, no-store');
  assert.equal((await call('/login',{cookie})).headers.get('Location'),'/');
  assert.equal((await call('/',{cookie}, {...env,OWNER_PASSWORD:'a-different-long-password'})).status,303);
  assert.equal((await call('/',{cookie:cookie.slice(0,-4)+'aaaa'})).status,303);
  const crossHost=await entry.fetch(new Request('https://preview.tinydreams.pages.dev/',{headers:{Cookie:cookie}}),env);
  assert.equal(crossHost.status,404);
  const previewLogin=await entry.fetch(new Request('https://preview.tinydreams.pages.dev/login'),env);
  assert.equal(previewLogin.status,404);
  const leaked=(await DB.prepare('SELECT * FROM td_auth_sessions').all()).results;
  assert.equal(leaked.length,1);assert.ok(!cookie.includes(leaked[0].token_hash));
  const created=await call('/api/goals',{method:'POST',cookie,headers:{'Content-Type':'application/json','oai-authenticated-user-id':'attacker'},body:JSON.stringify({title:'Auth fixture',reward:'',target:2,color:'sage'})});
  assert.equal(created.status,201);
  const records=(await DB.prepare('SELECT owner FROM goals').all()).results;
  assert.deepEqual(records.map(row=>row.owner),['local-preview']);
  assert.equal((await call('/api/goals',{method:'POST',cookie,headers:{Origin:'https://evil.test'}})).status,403);
  assert.equal((await call('/auth/logout',{method:'POST',cookie,headers:{Origin:'https://evil.test'}})).status,403);
  const logout=await call('/auth/logout',{method:'POST',cookie});
  assert.equal(logout.status,303);assert.ok(logout.headers.get('Set-Cookie').includes('Max-Age=0'));
  assert.equal((await call('/api/goals',{cookie})).status,401);
  const second=await call('/auth/login',{method:'POST'});
  const expired=second.headers.get('Set-Cookie').split(';')[0];
  await DB.prepare('UPDATE td_auth_sessions SET expires_at = 0').run();
  assert.equal((await call('/',{cookie:expired})).status,303);
  await DB.prepare('DELETE FROM td_auth_attempts').run();
  const attempts=await Promise.all(Array.from({length:7},()=>call('/auth/login',{method:'POST',password:'wrong'})));
  assert.equal(attempts.filter(r=>r.status===401).length,5);
  assert.equal(attempts.filter(r=>r.status===429).length,2);
  assert.ok(attempts.find(r=>r.status===429).headers.get('Retry-After'));
  const otherIP=await call('/auth/login',{method:'POST',headers:{'CF-Connecting-IP':'192.0.2.2'}});
  assert.equal(otherIP.status,303);
  assert.equal((await call('/auth/login',{method:'POST',body:'x'.repeat(3000),headers:{'CF-Connecting-IP':'192.0.2.3'}})).status,413);
  const unavailable={...env,DB:{batch:async()=>{throw Error('offline')}}};
  assert.equal((await call('/auth/login',{method:'POST'},unavailable)).status,503);
  assert.ok((await stat(new URL('../dist-pages/_worker.js',import.meta.url))).size<200000);
  const html=await readFile(new URL('../dist-pages/index.html',import.meta.url),'utf8');
  assert.ok(html.includes('action="/auth/logout"'));
  assert.ok(!html.includes(env.OWNER_PASSWORD));
  assert.ok(html.includes('rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"'));
  const loginHTML=await (await call('/login')).text();
  assert.ok(loginHTML.includes('rel="apple-touch-icon"'));
  assert.ok((await call('/login')).headers.get('Content-Security-Policy').includes("manifest-src 'self'"));
  const metadataEnv={ASSETS:{async fetch(request){
    const path=new URL(request.url).pathname.slice(1);
    return new Response(request.method==='HEAD'?null:await readFile(new URL('../dist-pages/'+path,import.meta.url)),{headers:{'Content-Type':path.endsWith('.png')?'image/png':path.endsWith('.svg')?'image/svg+xml':'application/manifest+json'}});
  }}};
  for(const [path,size] of [['/apple-touch-icon.png',180],['/icon-192.png',192],['/icon-512.png',512]]) {
    const response=await call(path,{},metadataEnv);
    assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'image/png');
    const png=Buffer.from(await response.arrayBuffer());
    assert.equal(png.readUInt32BE(0),0x89504e47);
    assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
    const head=await entry.fetch(new Request(origin+path,{method:'HEAD'}),metadataEnv);
    assert.equal(head.status,200);assert.equal(await head.text(),'');
    assert.equal((await call(path,{method:'POST'})).status,303);
  }
  assert.equal((await call('/icon.svg',{},metadataEnv)).status,200);
  const manifestResponse=await call('/manifest.webmanifest',{},metadataEnv);
  assert.equal(manifestResponse.status,200);
  const manifest=await manifestResponse.json();
  assert.equal(manifest.start_url,'/');
  assert.ok(manifest.icons.some(icon=>icon.src==='/icon-192.png'&&icon.sizes==='192x192'));
  assert.ok(manifest.icons.some(icon=>icon.src==='/icon-512.png'&&icon.sizes==='512x512'));
  for(const name of ['index.html','_routes.json','editions','writers','celebrations'])await stat(new URL('../dist-pages/'+name,import.meta.url));
  assert.deepEqual(JSON.parse(await readFile(new URL('../dist-pages/_routes.json',import.meta.url))),{version:1,include:['/*'],exclude:[]});
  console.log('PASS: private password login, secret/configuration errors, cookie protection, CSRF, forged identities, owner records, session expiry/rotation/logout, concurrent rate limiting, oversized bodies, unavailable D1 and upload package.');
} finally { await rm(directory,{recursive:true,force:true}); }
