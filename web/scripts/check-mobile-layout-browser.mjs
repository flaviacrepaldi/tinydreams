import {writeFileSync} from 'node:fs';
const t=await(await fetch('http://127.0.0.1:9223/json/new?http://localhost:4181',{method:'PUT'})).json();const ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let id=0;const q=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){q.get(m.id)(m.result);q.delete(m.id)}};const call=(method,params={})=>new Promise(r=>{q.set(++id,r);ws.send(JSON.stringify({id,method,params}))});const js=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};
await new Promise(r=>setTimeout(r,800));
const results=[];
for(const width of [320,360,390,430]){
 await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
 results.push(...await js(`(()=>{
 showDemo();state.groups=[{id:'qa-group',name:'Minha biblioteca de sonhos e novas histórias'}];state.goals[0].group_id='qa-group';
 const list={...state.goals[0],id:'qa-list',title:'cleaan food',days:[],entries:[],plan:{...planOf(state.goals[0]),dailyList:true,tasks:['fruta','legume','salada'].map((title,i)=>({id:'t'+i,title,weekdays:[0,1,2,3,4,5,6]}))}};state.goals.push(list);
 const output=[];const measure=name=>{const d=document.querySelector('dialog[open]'),root=d||document.documentElement,b=root.getBoundingClientRect();output.push({width:innerWidth,name,dialog:!!d,x:b.x,w:b.width,center:Math.round((b.left+b.right-innerWidth)/2),overflow:root.scrollWidth-root.clientWidth,children:[...root.querySelectorAll('input,select,textarea,fieldset,.form-row,.plan-item,.past-day-actions,.dialog-top')].filter(e=>{const r=e.getBoundingClientRect();return r.width&& (r.left<b.left||r.right>b.right)}).map(e=>e.id||e.className).slice(0,8)})};
 for(const view of ['dreams','today','calendar','shelf']){state.view=view;render();measure(view)}
 for(const id of ['settingsDialog','confirmDialog','calendarDayDialog']){document.querySelector('#'+id).showModal();measure(id);document.querySelector('#'+id).close()}
 for(const groupId of [undefined,'qa-group']){openGroup(groupId);measure(groupId?'rename-group':'new-group');document.querySelector('#groupDialog').close()}
 for(const kind of ['habit','daily-list','list','amount']){openForm();document.querySelector('#goalTitle').value='Um sonho com um nome comprido';document.querySelector('#goalKind').value=kind;document.querySelector('#goalKind').dispatchEvent(new Event('change'));if(kind==='daily-list')addRoutineRow({title:'fruta',weekdays:[0,1,2,3,4,5,6]});if(kind==='list')addItemRow({title:'Um livro para ler'});for(const step of goalSteps()){showGoalStep(step,false);measure('create-'+kind+'-'+step)}document.querySelector('#goalDialog').close()}
 openForm('qa-list');for(const step of goalSteps()){showGoalStep(step,false);measure('edit-list-'+step)}document.querySelector('#goalDialog').close();
 openDetails('qa-list');measure('list-history');document.querySelector('#progressDialog').close();openDetails('qa-list',undefined,true);measure('list-check');document.querySelector('#progressDialog').close();return output;
 })()`));
}
const failures=results.filter(r=>Math.abs(r.center)>1||r.overflow>1||r.children.length);if(failures.length)throw Error(JSON.stringify(failures));console.log('PASS: '+results.length+' mobile layout checks across four viewport widths.');
writeFileSync('/tmp/mobile-audit.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.filter(r=>Math.abs(r.center)>1||r.overflow>1||r.children.length),null,2));
await call('Emulation.setDeviceMetricsOverride',{width:320,height:694,deviceScaleFactor:1,mobile:true});await js("openForm('qa-list');showGoalStep(2,false)");writeFileSync('/tmp/mobile-edit-before.png',Buffer.from((await call('Page.captureScreenshot')).data,'base64'));ws.close();
