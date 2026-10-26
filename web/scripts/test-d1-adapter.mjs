import assert from 'node:assert/strict';
import {remoteD1} from './d1.mjs';
const ids={accountId:'a'.repeat(32),databaseId:'11111111-1111-1111-1111-111111111111'};
let request;
const db=remoteD1({...ids,getToken:async()=>'test-only',fetcher:async(url,options)=>{request={url,options};return Response.json({success:true,result:JSON.parse(options.body).batch.map(()=>({success:true,results:[{ok:1}]}))});}});
const query=db.prepare('SELECT ? AS ok');const bound=query.bind('a value');assert.deepEqual(query.params,[]);assert.deepEqual(bound.params,['a value']);assert.equal((await bound.all()).results[0].ok,1);assert.equal(request.options.headers.Authorization,'Bearer test-only');assert.deepEqual(JSON.parse(request.options.body),{batch:[{sql:'SELECT ? AS ok',params:['a value']}]});assert.equal(request.options.redirect,'error');assert.equal((await db.batch([bound,query.bind(2)])).length,2);
const denied=remoteD1({...ids,getToken:async()=>'secret-value',fetcher:async()=>Response.json({success:false,errors:[{message:'secret-value'}]},{status:403})});await assert.rejects(()=>denied.prepare('SELECT 1').run(),e=>!e.message.includes('secret-value')&&e.message.includes('Cloudflare'));
const broken=remoteD1({...ids,getToken:async()=>'test-only',fetcher:async()=>new Response('not JSON')});await assert.rejects(()=>broken.prepare('SELECT 1').all(),/inesperada/);
console.log('PASS: D1 parameter binding, transactional batch payload, server-only authorization, immutable statements, and sanitized failures.');
