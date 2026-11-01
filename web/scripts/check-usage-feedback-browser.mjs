import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const origin=process.env.TINY_COMPLETION_URL||'http://localhost:4177';
const target=await (await fetch('http://127.0.0.1:9226/json/new?'+origin,{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);r.error?p.reject(Error(r.error.message)):p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function wait(expression){for(let n=0;n<100;n++){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
try{
 await cdp('Page.enable');
 for(const width of [320,390,1440]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<600});
  await cdp('Page.navigate',{url:origin});await wait("typeof state!=='undefined'&&!state.busy");
  await js(`showDemo();state.homeFilter='all';state.goals=[{id:'counter',title:'contador de repetições',target:21,color:'peach',days:[],entries:[],failures:[],reward:'',plan:{...planOf({}),start:dayBefore(4),dailyTarget:2,dailyCounter:true,unit:'copos'}},...state.goals];render();openDetails('counter')`);
  await wait("document.body.style.position==='fixed'");
  assert.equal(await js("document.querySelector('#routineDay').hidden"),true);
  assert.equal(await js("document.querySelector('#routineDay').min===dayBefore(4)&&document.querySelector('#routineDay').max===today()"),true);
  assert.equal(await js("!!document.querySelector('#pastHistory')"),false);
  assert.equal(await js("document.querySelector('#routineChecks').firstElementChild.classList.contains('day-outcome')"),true);
  assert.equal(await js("document.querySelector('#progressContent').textContent.includes('Sem registro')"),false);
  await js("document.querySelector('[data-add-repeat]').click()");await wait("!state.busy&&dailyTotal(state.goals[0],today())===1");
  assert.equal(await js("state.goals[0].days.length"),0);
  await js("document.querySelector('[data-add-repeat]').click()");await wait("!state.busy&&state.goals[0].days.includes(today())");
  assert.equal(await js("document.querySelector('[data-add-repeat]').disabled"),true);
  await js("document.querySelector('[data-undo-repeat]').click()");await wait("!state.busy&&!state.goals[0].days.includes(today())");
  await js("document.getElementById('history-tab-'+dayBefore(1)).click()");
  assert.equal(await js("document.querySelector('#routineDay').value===dayBefore(1)"),true);
  await js("document.getElementById('history-tab-'+today()).click();document.querySelector('[data-pick-history-date]').click()");
  assert.equal(await js("document.querySelector('#routineDay').hidden"),false);
  const shot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/tiny-history-'+width+'.png',Buffer.from(shot.data,'base64'));
  await js("document.querySelector('#progressDialog').close();resetMilestonePanel()");await wait("document.body.style.position!== 'fixed'");
  assert.equal(await js("document.documentElement.scrollWidth>innerWidth"),false);
  await js("document.querySelectorAll('.goal-grid')[0].scrollIntoView({block:'start'});");
  const dimensions=[];
  for(const edition of ['2026-10','2026-11','2026-12','2027-01','2027-02','2027-03','2027-04','2027-05','2027-06','2027-07','2027-08','2027-09']){
   await js(`DreamThemes.preview('${edition}');render()`);
   dimensions.push(await js("[...document.querySelectorAll('.amulet-frame')].map(el=>[el.getBoundingClientRect().width,el.getBoundingClientRect().height])"));
   const proportions=await js(`Promise.all([...document.querySelectorAll('.talisman')].map(async el=>{
    const card=el.closest('.goal'),frame=el.closest('.amulet-frame'),box=el.getBoundingClientRect(),style=getComputedStyle(el);
    const frameBox=frame.getBoundingClientRect();
    if(card.dataset.amuletEdition==='2026-10')return {valid:Math.abs(box.width/box.height-2/3)<.01,contained:box.width<=frameBox.width+.1&&box.height<=frameBox.height+.1};
    const aspect=Number(getComputedStyle(card).getPropertyValue('--amulet-crop-aspect'));
    const img=new Image();img.src=style.backgroundImage.slice(5,-2);await img.decode();
    const [sheetWidth,sheetHeight]=style.backgroundSize.split(' ').map(value=>parseFloat(value)/100);
    const scaleX=box.width*sheetWidth/img.naturalWidth,scaleY=box.height*sheetHeight/img.naturalHeight;
    return {valid:Math.abs(box.width/box.height-aspect)<.001&&Math.abs(scaleX/scaleY-1)<.001,contained:box.width<=frameBox.width+.1&&box.height<=frameBox.height+.1};
   }))`);
   assert.ok(proportions.every(p=>p.valid&&p.contained),`Natural source proportions and frame containment at ${width}px in ${edition}`);
  }
  assert.ok(dimensions.every(d=>d.every((size,i)=>Math.abs(size[0]-dimensions[0][i][0])<=1&&size[1]===dimensions[0][i][1])),'Amulet canvas is equal in every edition');
 }
 console.log('PASS: mobile/desktop history navigation, bounded dates, visual empty state, repeat counter/undo, scroll lock, all-edition amulet sizing, natural image proportions and overflow.');
}finally{await cdp('Page.close');ws.close()}
