import {writeFile,mkdir} from 'node:fs/promises';
const target=await (await fetch('http://127.0.0.1:9223/json/new?http://localhost:4181',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+': '+r.exceptionDetails.exception?.description);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
async function click(selector){await js(`document.querySelector(${JSON.stringify(selector)}).click()`)}
await mkdir('/tmp/tiny-groups-review',{recursive:true});await cdp('Page.enable');await cdp('Page.navigate',{url:'http://localhost:4181'});await wait("typeof state!=='undefined'&&!state.busy");
const assert=async(expression,message)=>{if(!await js(expression))throw Error(message)};
await js(`showDemo();state.goals.push({id:'daily-list-magic',title:'Cuidar da alimentação',target:7,color:'sage',days:[],entries:[],plan:{kind:'habit',dailyList:true,start:dayBefore(7),end:'',weekdays:[0,1,2,3,4,5,6],notes:'',unit:'',items:[],tasks:['Fruta','Salada','Legume'].map((title,i)=>({id:'item'+i,title,weekdays:[0,1,2,3,4,5,6]}))}});openDetails('daily-list-magic')`);
for(let i=0;i<3;i++){
 await js(`changeEntry('daily-list-magic',{key:today()+':item${i}',day:today(),done:true})`);
 await assert(`document.querySelector('#itemMilestone').textContent.includes('${i+1} de 3 itens')`,'Missing individual feedback');
 await assert(`document.querySelector('#itemMilestone').textContent.includes('${['Fruta','Salada','Legume'][i]}')`,'Wrong item name');
 await assert(`state.goals.at(-1).days.length===${i===2?1:0}`,'Item incorrectly completed day');
 await assert("document.querySelector('#progressDialog').open&&getComputedStyle(document.querySelector('#itemMilestone')).pointerEvents==='none'",'Checklist blocked or dialog closed');
}
await assert("document.querySelector('#itemMilestone h2').textContent==='Lista do dia concluída!'",'Last-item celebration missing');
await js("changeEntry('daily-list-magic',{key:today()+':item1',day:today(),done:false})");await assert("!document.querySelector('#itemMilestone')&&state.goals.at(-1).days.length===0",'Undo celebrated or preserved completed day');
for(const edition of ['2026-10','2026-11','2027-04','2027-09']){
 await js(`DreamThemes.preview('${edition}')`);await js("changeEntry('daily-list-magic',{key:today()+':item1',day:today(),done:true})");
 await assert("document.querySelector('#itemMilestone').dataset.magic===DreamThemes.current.atmosphere",'Wrong edition effect');
 for(const width of [320,390,1440]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<600});
  await new Promise(r=>setTimeout(r,700));
  await assert("(()=>{const r=document.querySelector('#itemMilestone').getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()",'Item feedback outside viewport');
 }
 await js("changeEntry('daily-list-magic',{key:today()+':item1',day:today(),done:false})");
}
await js("changeEntry('daily-list-magic',{key:today()+':item1',day:today(),done:true})");await new Promise(r=>setTimeout(r,3000));await assert("!document.querySelector('#itemMilestone')",'Item feedback did not clear');
await js("document.querySelector('#progressDialog').close()");await wait("!document.querySelector('#milestone').hidden");
await assert("document.querySelector('#milestone h2').textContent.includes('concluído')",'Day completion was lost');
await cdp('Page.close');ws.close();console.log('PASS: individual item feedback, accurate daily count, final-item celebration, undo, theme effects, responsive positioning, automatic cleanup, and preserved daily milestone.');
