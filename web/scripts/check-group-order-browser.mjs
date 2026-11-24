import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const qaUrl=process.env.TINY_QA_URL||'http://localhost:4177',debugUrl=process.env.TINY_QA_DEBUG_URL||'http://127.0.0.1:9223';
const target=await (await fetch(debugUrl+'/json/new?'+qaUrl,{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let rpcId=0;const pending=new Map();ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(Error(r.error.message));else p.resolve(r.result)}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++rpcId;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function js(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function wait(expression){const end=Date.now()+10000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+expression)}
await cdp('Page.enable');await cdp('Page.navigate',{url:qaUrl});await wait("typeof state!=='undefined'&&!state.busy");

await js(`showDemo();state.homeFilter='all';state.groups=[{id:'order',name:'Meus cuidados'}];state.goals.forEach((g,i)=>{g.group_id='order';g.title=i===0?'Um título longo para conferir a ordem dos meus cuidados na tela inicial':g.title});render()`);
await js(`state.groups.push({id:'empty-group',name:'Big Dream vazio'});render();document.querySelector('[data-action="new"][data-group="empty-group"]').click()`);
assert.equal(await js("document.querySelector('#goalGroup').value"),'empty-group','Creation starts in the selected Big Dream');
await js(`document.querySelector('#goalTitle').value='Novo tiny dream';document.querySelector('#goalTarget').value=5;showGoalStep(3,false);document.querySelector('#goalForm').requestSubmit()`);
await wait("!document.querySelector('#goalDialog').open");
assert.equal(await js("state.goals.find(g=>g.title==='Novo tiny dream').group_id"),'empty-group','The created dream belongs to the chosen Big Dream');
await js(`state.goals=state.goals.filter(g=>g.title!=='Novo tiny dream');state.groups=state.groups.filter(g=>g.id!=='empty-group');render()`);
const original=await js('state.goals.map(g=>g.id)');
await js(`state.goals.push({...state.goals[0],id:'order-completed',title:'Já concluído',target:1,days:[dayBefore(2)],plan:{...planOf({}),kind:'habit',completionMode:'total'}},{...state.goals[0],id:'order-archived',title:'Encerrado incompleto',days:[],plan:{...planOf({}),start:'2020-01-01',end:'2020-01-02',incompleteAccepted:true}});render()`);
const hidden=['order-completed','order-archived'];

async function drag(from,to,touch){
 const points=await js(`(()=>{const rows=[...document.querySelectorAll('#groupOrder .group-order-row')],a=rows[${from}].querySelector('button').getBoundingClientRect(),b=rows[${to}].getBoundingClientRect();return{x:a.left+a.width/2,y:a.top+a.height/2,end:b.top+b.height/2+${to>from?8:-8}}})()`);
 if(touch)await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:points.x,y:points.y}]});
 else{await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:points.x,y:points.y});await cdp('Input.dispatchMouseEvent',{type:'mousePressed',x:points.x,y:points.y,button:'left',clickCount:1})}
 for(let i=1;i<=10;i++){
  const y=points.y+(points.end-points.y)*i/10;
  if(touch)await cdp('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:points.x,y}]});
  else await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:points.x,y,button:'left',buttons:1});
 }
 if(touch)await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 else await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:points.x,y:points.end,button:'left',clickCount:1});
}
for(const width of [320,390,430,1280]){
 const touch=width<600;
 await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:touch});
 await cdp('Emulation.setTouchEmulationEnabled',{enabled:touch});
 const heading=await js(`(()=>{const h=document.querySelector('.big-dream-volume .group-heading'),title=h.querySelector('h2').getBoundingClientRect(),add=h.querySelector('.group-create-button').getBoundingClientRect(),edit=h.querySelector('.rename-group-button').getBoundingClientRect(),r=h.getBoundingClientRect();return {overlap:title.right>add.left||add.right>edit.left,verticalDifference:Math.abs(add.top-edit.top),overflow:r.right>innerWidth||h.scrollWidth>h.clientWidth+1,addWidth:add.width}})()`);
 assert.ok(!heading.overlap&&!heading.overflow&&heading.verticalDifference<1&&heading.addWidth===44,`Big Dream controls at ${width}px: ${JSON.stringify(heading)}`);
 if(width===390){await js("document.querySelector('.mobile-chapter-link')?.click();document.querySelector('.big-dream-volume').scrollIntoView({block:'start'})");const shot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/group-create-390.png',Buffer.from(shot.data,'base64'))}
 await js(`openGroup('order')`);
 assert.deepEqual(await js("[...document.querySelectorAll('#groupOrder .group-order-row')].map(r=>r.dataset.id)"),original,'Only active dreams appear');
 assert.equal(await js("document.querySelector('#groupOrder svg path').getAttribute('d')"),'M5 9h14M5 15h14');
 await drag(0,1,touch);
 const expected=[original[1],original[0],...original.slice(2)];
 assert.deepEqual(await js("[...document.querySelectorAll('#groupOrder .group-order-row')].map(r=>r.dataset.id)"),expected);
 assert.ok(await js("(()=>{const d=document.querySelector('#groupDialog');return d.scrollWidth<=d.clientWidth+1&&d.getBoundingClientRect().left>=0})()"));
 assert.equal(await js("document.querySelectorAll('.is-dragging').length"),0);
 await js('document.fonts.ready');
 const png=await cdp('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/group-order-'+width+'.png',Buffer.from(png.data,'base64'));
 await js("document.querySelector('#groupForm').requestSubmit()");await wait("!document.querySelector('#groupDialog').open");
 assert.deepEqual(await js('state.groups[0].goalOrder'),[...expected,...hidden]);
 assert.deepEqual(await js("[...document.querySelectorAll('.big-dream-volume .goal')].map(g=>g.dataset.goal)"),expected);
 await js(`openGroup('order')`);await drag(1,0,touch);
 await js("document.querySelector('#groupForm').requestSubmit()");await wait("!document.querySelector('#groupDialog').open");
 assert.deepEqual(await js('state.groups[0].goalOrder'),[...original,...hidden]);
}
await js(`openGroup('order');document.querySelector('#groupOrder button').focus()`);
await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown'});
assert.deepEqual(await js("[...document.querySelectorAll('#groupOrder .group-order-row')].map(r=>r.dataset.id)"),[original[1],original[0],...original.slice(2)]);
await js("document.querySelector('#groupDialog').close();openGroup('order')");
assert.deepEqual(await js("[...document.querySelectorAll('#groupOrder .group-order-row')].map(r=>r.dataset.id)"),original,'Cancel discards draft');
await js("document.querySelector('#groupDialog').close();openGroup()");
assert.equal(await js("document.querySelectorAll('#groupMembers input').length"),original.length,'New group selection only includes active dreams');
await js("document.querySelector('#groupDialog').close();state.goals=state.goals.filter(g=>g.id.startsWith('order-'));openGroup('order')");
assert.equal(await js("document.querySelectorAll('#groupOrder .group-order-row').length"),0);
assert.match(await js("document.querySelector('#groupOrder').textContent"),/não tem tydreams ativos/);
console.log('PASS: active-only rows, completed/archive preservation, two-line handle, empty state; actual touch/mouse drag forward/backward, keyboard, save, reopen, cancel and wrapped titles at 320/390/430/1280px.');ws.close();
