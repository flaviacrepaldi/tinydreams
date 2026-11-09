import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const qaUrl=process.env.TINY_QA_URL||'http://localhost:4177',debugUrl=process.env.TINY_QA_DEBUG_URL||'http://127.0.0.1:9223';
const target=await (await fetch(debugUrl+'/json/new?'+qaUrl,{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
await cdp('Page.enable');await cdp('Page.navigate',{url:qaUrl});await wait("typeof state!=='undefined'&&!state.busy");
await js(`showDemo();state.groups=[{id:'one',name:'Cuidados'},{id:'two',name:'Rotina'}];const p={kind:'habit',start:dayBefore(4),end:'',weekdays:[0,1,2,3,4,5,6],notes:'',unit:'',tasks:[],items:[]};state.goals=['Hábito simples','Quantidade diária','Minha lista de cuidados com um título mais longo','Resistir ao impulso','Contar repetições','Outro hábito'].map((title,i)=>({id:'align'+i,title,target:30,reward:i===2?'Uma pausa para mim':'',color:['sage','peach','lavender'][i%3],created_at:new Date().toISOString(),group_id:i<4?'one':'two',days:[dayBefore(1)],failures:[],entries:[],plan:{...p,notes:i===2?'Uma observação sobre os cuidados.':'',impulse:i===3,support:i===3?'Meu combinado para atravessar a vontade.':'',impulseStartedAt:i===3?new Date(Date.now()-183845000).toISOString():undefined,dailyTarget:i===1?2:i===4?3:null,dailyCounter:i===4,unit:i===1?'litros':'',dailyList:i===2,tasks:i===2?[{id:'a',title:'Cuidar de mim',weekdays:p.weekdays}]:[]}}));state.goals.push({id:'amount-check',title:'somar 10K em investimentos',target:10000,reward:'',color:'peach',days:[],failures:[],group_id:'two',created_at:new Date().toISOString(),entries:[{key:'a',day:dayBefore(3),value:100},{key:'b',day:dayBefore(1),value:200}],plan:{...p,kind:'amount',unit:'R$'}},{id:'list-check',title:'Meus livros',target:2,reward:'',color:'sage',days:[],failures:[],entries:[],group_id:'two',created_at:new Date().toISOString(),plan:{...p,kind:'list',items:[{id:'one',title:'Um livro'},{id:'two',title:'Outro livro'}]}});render()`);
for(const width of [320,390,430]){
 for(const height of [844,740,500]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await js("document.querySelector('.mobile-chapter-link').click()");
  await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  await js("document.querySelector('.overview-mobile-brand').scrollIntoView();document.querySelector('.home-filter button').focus()");
  const result=await js(`(()=>{const m=document.querySelector('main'),w=document.querySelector('#mobileDreams'),p=document.querySelector('.mobile-intro-panel'),r=m.getBoundingClientRect(),wr=w.getBoundingClientRect();return {chapter:m.dataset.chapter,scroll:m.scrollTop,intro:getComputedStyle(p).visibility,workspace:getComputedStyle(w).visibility,top:wr.top-r.top,bottom:wr.bottom-r.bottom}})()`);
  assert.equal(result.chapter,'1');assert.equal(result.intro,'hidden');assert.equal(result.workspace,'visible');assert.equal(result.scroll,0);assert.ok(Math.abs(result.top)<1&&Math.abs(result.bottom)<1,JSON.stringify(result));
  await js("openForm('align0');document.querySelector('#goalNotes').focus();document.querySelector('#goalDialog').close()");
  assert.equal(await js("document.querySelector('main').scrollTop"),0);
  await js("document.querySelector('.mobile-chapter-back').click()");
  assert.equal(await js("getComputedStyle(document.querySelector('#mobileDreams')).visibility"),'hidden');
  assert.equal(await js("getComputedStyle(document.querySelector('.mobile-intro-panel')).visibility"),'visible');
  await js("document.querySelector('.mobile-chapter-link').click()");
  const scenery=await js(`(()=>{
   const sky=document.querySelector('.sky'),read=()=>{const s=getComputedStyle(sky);return [s.backgroundImage,s.backgroundSize,s.backgroundPosition,s.height]},dreams=read(),workspace=getComputedStyle(document.querySelector('#mobileDreams'));
   const transparent=workspace.backgroundImage==='none'&&workspace.backgroundColor==='rgba(0, 0, 0, 0)';
   const others=['calendar','shelf','analytics'].map(view=>{document.body.dataset.view=view;return read()});document.body.dataset.view='dreams';
   const main=document.querySelector('main');main.dataset.chapter='0';const intro=getComputedStyle(sky).backgroundImage;main.dataset.chapter='1';
   return {dreams,others,transparent,intro};
  })()`);
  assert.equal(scenery.transparent,true,'The second chapter must expose the shared page background');
  for(const background of scenery.others)assert.deepEqual(scenery.dreams,background,'Dreams must use the same scenery, crop and fade as other tabs');
  assert.ok(scenery.intro.includes('0.48')&&scenery.intro.includes('0.68'),'Introduction must retain its thematic scenery: '+scenery.intro);
  if(height===844){
   await js("document.querySelector('.mobile-chapter-back').click()");
   const intro=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/intro-chapter-'+width+'.png',Buffer.from(intro.data,'base64'));
   await js("document.querySelector('.mobile-chapter-link').click()");
   const lower=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/lower-chapter-'+width+'.png',Buffer.from(lower.data,'base64'));
  }
  if(width===390&&height===844){const png=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/lower-chapter-390.png',Buffer.from(png.data,'base64'))}
 }
 console.log('PASS: lower chapter hides upper chapter through focus, editing and viewport resize at '+width+'px');
}
ws.close();
