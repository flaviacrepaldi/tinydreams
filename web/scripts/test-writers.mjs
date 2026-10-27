import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {api} from '../worker/api.js';
import {writerAlbum} from '../shared/writers.js';
import {localDB} from './sqlite.mjs';
import {migratePlanner} from './migrate-planner.mjs';
const dir=mkdtempSync(join(tmpdir(),'tiny-writers-')),DB=localDB(join(dir,'test.sqlite'));
const artwork=[];
const env={DB,ASSETS:{fetch:async request=>{artwork.push(new URL(request.url).pathname);return new Response('portrait',{headers:{'Content-Type':'image/png'}})}}};
async function call(path='',method='GET',body,owner='album-owner'){
 return api(new Request('https://test/api/goals'+path,{method,headers:owner?{'oai-authenticated-user-id':owner}:{},...(body?{body:JSON.stringify(body)}:{})}),env);
}
try{
 await migratePlanner(DB);
 assert.equal((await call('/album','GET',null,null)).status,401);
 let album=await (await call('/album')).json();assert.equal(album.slots.length,10);assert.equal(album.total,0);assert.ok(album.slots.every(s=>!s.name&&!s.portrait&&!s.bio&&!s.source));
 assert.equal((await call('/portraits/01')).status,404);assert.equal(artwork.length,0);
 const ids=[];
 for(let i=0;i<16;i++){
  const g=await (await call('','POST',{title:'Conquista '+i,reward:'',target:1,color:'sage'})).json();ids.push(g.id);
  await call('/'+g.id+'/check','POST',{day:'2026-01-01',done:true});
  if(i===2){album=await (await call('/album')).json();assert.equal(album.total,3);assert.ok(album.slots.every(s=>!s.unlocked&&!s.name));assert.equal((await call('/portraits/01')).status,200);assert.equal((await call('/portraits/02')).status,404)}
  if(i===7){album=await (await call('/album')).json();assert.equal(album.slots.filter(s=>s.unlocked).length,1);assert.equal(album.slots[0].name,'Machado de Assis');assert.ok(album.slots.slice(1).every(s=>!s.name&&!s.portrait));}
 }
 album=await (await call('/album')).json();assert.equal(album.slots.filter(s=>s.unlocked).length,2);
 const r=await call('/portraits/02');assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'private, no-store');assert.equal(artwork.at(-1),'/writers/02.png');
 assert.equal((await call('/portraits/03')).status,404);
 assert.equal((await call('/portraits/01','GET',null,'other-owner')).status,404);assert.equal((await (await call('/album','GET',null,'other-owner')).json()).total,0);
 await call('/'+ids[15]+'/check','POST',{day:'2026-01-01',done:false});album=await (await call('/album')).json();assert.equal(album.total,15);assert.ok(!album.slots[1].unlocked&&!album.slots[1].name);
 await call('/'+ids[0],'DELETE');assert.equal((await (await call('/album')).json()).total,14);
 const demo=await (await call('/album?demo=1')).json();assert.equal(demo.slots.filter(s=>s.unlocked).length,1);assert.ok(demo.slots.slice(1).every(s=>!s.name));assert.equal((await call('/portraits/demo')).status,200);
 for(const path of ['/portraits/00','/portraits/11','/portraits/nope','/portraits/01/extra'])assert.equal((await call(path)).status,404);
 assert.equal((await call('/album','POST',{})).status,405);
 const full=writerAlbum(Array.from({length:80},()=>({target:1,days:['2026-01-01']})));assert.equal(full.slots.filter(s=>s.unlocked).length,10);assert.equal(new Set(full.slots.map(s=>s.country)).size,10);assert.ok(full.slots.every(s=>s.bio&&s.works.length>=2&&s.source.startsWith('https://')));
 console.log('PASS: ten-writer album, thresholds, hidden identities, authenticated portrait gates, owner isolation, corrections, deletion, and isolated preview.');
}finally{rmSync(dir,{recursive:true,force:true})}
