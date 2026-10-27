import {writeFile,mkdir} from 'node:fs/promises';
const target=await (await fetch('http://127.0.0.1:9223/json/new?http://localhost:4181',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+': '+r.exceptionDetails.exception?.description);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
async function click(selector){await js(`document.querySelector(${JSON.stringify(selector)}).click()`)}
await mkdir('/tmp/tiny-groups-review',{recursive:true});await cdp('Page.enable');await cdp('Page.navigate',{url:'http://localhost:4181'});await wait("typeof state!=='undefined'&&!state.busy");
const assert=async(expression,message)=>{if(!await js(expression))throw Error(message)};
await js('showDemo()');
await click('[data-action=new-group]');await js(`document.querySelector('#groupName').value='Meu Big Dream';document.querySelector('#groupMembers input').checked=true;document.querySelector('#groupForm').requestSubmit()`);await wait("!document.querySelector('#groupDialog').open");
await assert("state.groups.length===1&&state.goals[0].group_id===state.groups[0].id&&document.querySelector('.dream-group h2').textContent==='Meu Big Dream'",'Create/select group failed');
await assert("document.querySelectorAll('.dream-group').length===2",'Ungrouped dreams disappeared');
await click('[data-action=edit-group]');await js(`document.querySelector('#groupName').value='Minha biblioteca';document.querySelectorAll('#groupMembers input')[1].checked=true;document.querySelector('#groupForm').requestSubmit()`);await wait("!document.querySelector('#groupDialog').open");await assert("state.groups[0].name==='Minha biblioteca'&&state.goals[1].group_id===state.groups[0].id",'Rename/member editing failed');
await click('#newGoalButton');await js(`document.querySelector('#goalTitle').value='Um capítulo por dia';document.querySelector('#goalTarget').value=5;document.querySelector('#goalGroup').value=state.groups[0].id;document.querySelector('#goalForm').requestSubmit()`);await wait("!document.querySelector('#goalDialog').open");await assert("state.goals.at(-1).group_id===state.groups[0].id",'New dream group selection not saved');
await js('openForm(state.goals.at(-1).id)');await assert("document.querySelector('#goalGroup').value===state.groups[0].id",'Existing membership not selected');await click('[data-close=goalDialog]');
await click('[data-action=new-group]');await js(`document.querySelector('#groupName').value='Meu projeto pessoal';document.querySelector('#groupMembers input').checked=true;document.querySelector('#groupForm').requestSubmit()`);await wait("!document.querySelector('#groupDialog').open");await assert("state.goals[0].group_id===state.groups[1].id",'Move between groups failed');
await js(`openGroup(state.groups[1].id)`);await click('#deleteGroup');await click('#confirmDeleteGroup');await wait("!document.querySelector('#groupDialog').open");await assert("state.groups.length===1&&state.goals.length===4&&!state.goals[0].group_id",'Group removal deleted dreams');
await js(`state.goals[0].title='Um tydream com um título longo para conferir a leitura no celular';render()`);
for(const edition of ['2026-10','2026-11','2026-12','2027-01','2027-02','2027-03','2027-04','2027-05','2027-06','2027-07','2027-08','2027-09']){
 await js(`DreamThemes.preview('${edition}')`);
 for(const width of [320,390,768,1440]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});await js('document.fonts.ready');
  await assert('document.documentElement.scrollWidth<=innerWidth','Home overflow '+edition+' '+width);
  await assert("[...document.querySelectorAll('.goal .quick-outcomes button')].every(b=>b.getBoundingClientRect().height>=44)",'Small quick action targets '+edition);
  await assert("getComputedStyle(document.querySelector('.goal-grid')).display==='grid'",'Seasonal layout overrides compact groups '+edition);
  if(width<561){
   await assert("getComputedStyle(document.querySelector('.goal-grid')).overflowX==='auto'&&getComputedStyle(document.querySelector('.goal-grid')).scrollSnapType==='x mandatory'",'Missing mobile gallery '+edition);
   await assert("getComputedStyle(document.querySelector('.goal-grid')).scrollbarWidth==='none'",'Visible scrollbar '+edition);
   await js("window.gallery=document.querySelector('.goal-grid');gallery.scrollLeft=gallery.scrollWidth");await new Promise(r=>setTimeout(r,120));await assert('gallery.scrollLeft>0','Gallery does not scroll '+edition);await js('gallery.scrollLeft=0');
  }

  await click('[data-action=edit-group]');await assert('document.documentElement.scrollWidth<=innerWidth','Group form overflow '+edition+' '+width);await click('[data-close=groupDialog]');
 }
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:true});await js("document.querySelector('#content').scrollIntoView()");const image=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/tiny-groups-review/'+edition+'.png',Buffer.from(image.data,'base64'));
}
await js('DreamThemes.reset()');await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await js("document.querySelector('#content').scrollIntoView()");const desktop=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/tiny-groups-review/desktop.png',Buffer.from(desktop.data,'base64'));
await click('#leaveDemo');await assert('!state.demo&&state.groups===state.realGroups&&state.goals===state.real','Demo groups leaked into real records');
console.log('PASS: Big Dream create/rename/member move/delete, dream form membership, ungrouped home, compact cards, all 12 editions at 320/390/768/1440px, touch targets and demo isolation. No real database writes.');ws.close();
