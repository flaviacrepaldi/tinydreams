import {writeFileSync} from 'node:fs';
const t=await(await fetch('http://127.0.0.1:9223/json/new?http://localhost:4181',{method:'PUT'})).json();const ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let id=0;const q=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){q.get(m.id)(m.result);q.delete(m.id)}};const call=(method,params={})=>new Promise(r=>{q.set(++id,r);ws.send(JSON.stringify({id,method,params}))});const js=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception.description);return r.result.value};const check=async(expr,msg)=>{if(!await js(expr))throw Error(msg)};
await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await new Promise(r=>setTimeout(r,800));
await js('showDemo();openForm()');await js('nextGoalStep()');await check('goalStep===0','Empty title allowed');
for(const kind of ['habit','daily-list','list','amount']){
 await js(`document.querySelector('#goalDialog').close();openForm();document.querySelector('#goalTitle').value='QA ${kind}';document.querySelector('[name=goalKindChoice][value=\"${kind}\"]').click();nextGoalStep()`);
 await check(`goalStep===${kind==='amount'?2:1}`,'Wrong branch '+kind);
 if(kind==='daily-list')await js(`addRoutineRow({id:'qa',title:'fruta',weekdays:[0,1,2,3,4,5,6]})`);
 if(kind==='list')await js(`addItemRow({id:'qa',title:'ler',date:''})`);
 if(kind!=='amount')await js('nextGoalStep()');
 await check('goalStep===2','Routine did not advance '+kind);
 if(kind!=='list')await js(`document.querySelector('#goalTarget').value='5'`);
 await js('nextGoalStep()');await check('goalStep===3','Period did not advance '+kind);
 await js(`document.querySelector('#goalForm').requestSubmit()`);await new Promise(r=>setTimeout(r,120));
 await check(`!document.querySelector('#goalDialog').open&&state.goals.some(g=>g.title==='QA ${kind}')`,'Failed save '+kind);
}
await js(`openForm(state.goals.find(g=>g.title==='QA daily-list').id)`);await check("document.querySelector('[name=goalKindChoice][value=daily-list]').checked&&document.querySelector('#goalKind').value==='daily-list'&&document.querySelector('#routineRows .row-title').value==='fruta'",'Edit lost list');
await js(`document.querySelector('#goalDialog').close();openForm()`);
await check("document.querySelectorAll('[data-goal-step]:not([hidden])').length===1",'Multiple steps visible');
writeFileSync('/tmp/tiny-wizard-mobile.png',Buffer.from((await call('Page.captureScreenshot')).data,'base64'));
await js(`document.querySelector('#goalDialog').close()`);
await check("getComputedStyle(document.querySelector('.tabs')).position==='fixed'&&document.querySelector('.tabs').getBoundingClientRect().width>0",'Mobile navigation missing');
writeFileSync('/tmp/tiny-home-mobile.png',Buffer.from((await call('Page.captureScreenshot')).data,'base64'));
await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
await js('openForm()');writeFileSync('/tmp/tiny-wizard-desktop.png',Buffer.from((await call('Page.captureScreenshot')).data,'base64'));
console.log('PASS: required title, four adaptive branches, demo saves, daily-list edit, single visible step, mobile navigation.');ws.close();
