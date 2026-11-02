import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const qaUrl=process.env.TINY_QA_URL||'http://localhost:4177',debugUrl=process.env.TINY_QA_DEBUG_URL||'http://127.0.0.1:9223';
const target=await (await fetch(debugUrl+'/json/new?'+qaUrl,{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
await cdp('Page.enable');await cdp('Page.navigate',{url:qaUrl});await wait("typeof state!=='undefined'&&!state.busy");
await js(`showDemo();state.groups=[{id:'one',name:'Cuidados'},{id:'two',name:'Rotina'}];const p={kind:'habit',start:dayBefore(4),end:'',weekdays:[0,1,2,3,4,5,6],notes:'',unit:'',tasks:[],items:[]};state.goals=['Hábito simples','Quantidade diária','Minha lista de cuidados com um título mais longo','Resistir ao impulso','Contar repetições','Outro hábito'].map((title,i)=>({id:'align'+i,title,target:30,reward:i===2?'Uma pausa para mim':'',color:['sage','peach','lavender'][i%3],created_at:new Date().toISOString(),group_id:i<4?'one':'two',days:[dayBefore(1)],failures:[],entries:[],plan:{...p,notes:i===2?'Uma observação sobre os cuidados.':'',impulse:i===3,support:i===3?'Meu combinado anterior.':'',impulseStartedAt:i===3?new Date(Date.now()-183845000).toISOString():undefined,dailyTarget:i===1?2:i===4?3:null,dailyCounter:i===4,unit:i===1?'litros':'',dailyList:i===2,tasks:i===2?[{id:'a',title:'Cuidar de mim',weekdays:p.weekdays}]:[]}}));state.goals.push({id:'amount-check',title:'somar 10K em investimentos',target:10000,reward:'',color:'peach',days:[],failures:[],group_id:'two',created_at:new Date().toISOString(),entries:[{key:'a',day:dayBefore(3),value:100},{key:'b',day:dayBefore(1),value:200}],plan:{...p,kind:'amount',unit:'R$'}},{id:'list-check',title:'Meus livros',target:2,reward:'',color:'sage',days:[],failures:[],entries:[],group_id:'two',created_at:new Date().toISOString(),plan:{...p,kind:'list',items:[{id:'one',title:'Um livro'},{id:'two',title:'Outro livro'}]}});render()`);
for(const width of [320,390,430,1280]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});
 const ids=await js('state.goals.map(g=>g.id)');
 for(const id of ids){
  await js(`openForm(${JSON.stringify(id)})`);await js('document.fonts.ready');await js("document.querySelector('#goalExtras').open=true;document.querySelector('#durationInfo').open=true");
  const result=await js(`(()=>{const d=document.querySelector('#goalDialog'),r=d.getBoundingClientRect();return {overflow:d.scrollWidth-d.clientWidth,outside:r.left<0||r.right>innerWidth,offenders:[...d.querySelectorAll('*')].filter(e=>{const s=getComputedStyle(e);return s.display!=='none'&&e.getClientRects().length&&e.getBoundingClientRect().right>r.right-10}).map(e=>({tag:e.tagName,id:e.id,cls:e.className,width:e.getBoundingClientRect().width}))}})()`);
  assert.ok(result.overflow<=1&&!result.outside,JSON.stringify({width,id,...result}));
  assert.equal(await js("document.querySelector('#goalSupport')"),null);
  if(id==='align3'){
   assert.equal(await js("document.querySelector('#goalNotes').value"),'Meu combinado anterior.');
   if(width===390){await js("document.querySelector('#goalNotes').scrollIntoView({block:'center'})");const png=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/combined-field-390.png',Buffer.from(png.data,'base64'))}
   await js("document.querySelector('#goalNotes').value='Um combinado só.'");
   assert.equal(await js('agreementOf({plan:formPlan()})'),'Um combinado só.');
   assert.equal(await js('formPlan().support'),'Meu combinado anterior.');
   await js("document.querySelector('#goalNotes').value=''");
   assert.equal(await js('agreementOf({plan:formPlan()})'),'');
  }
  await js("document.querySelector('#goalDialog').scrollTop=document.querySelector('#goalDialog').scrollHeight");
  assert.ok(await js("(()=>{const d=document.querySelector('#goalDialog');return d.scrollWidth<=d.clientWidth+1})()"),'Expanded lower fields overflow');
  await js("document.querySelector('#goalDialog').scrollTop=0");
  if(width===390&&id==='list-check'){const png=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/edit-dialog-390.png',Buffer.from(png.data,'base64'))}
  await js("document.querySelector('#goalDialog').close()");
 }
 console.log('PASS: edit dialogs have no horizontal overflow at '+width+'px');
}
ws.close();
