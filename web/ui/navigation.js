// Familiar navigation and lowercase authored copy, without changing saved text.
(() => {
  Object.assign(icons, {
    chevronLeft:'<path d="m15 5-7 7 7 7"/>',
    chevronRight:'<path d="m9 5 7 7-7 7"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h1m6 0h1"/>',
    analytics:'<path d="M4 3v17h17M8 16v-5m5 5V7m5 9V4"/>',
    today:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    shelf:'<path d="M3 21h18M5 3h4v15H5zm5 2h4v13h-4zm5-1 4-1 3 14-4 1z"/>'
  });
  const navIcons={dreams:'book',today:'today',calendar:'calendar',shelf:'shelf',analytics:'analytics'};
  document.querySelectorAll('.tab').forEach(button => {
    button.insertAdjacentHTML('afterbegin', icon(navIcons[button.dataset.view], 'nav-symbol'));
  });
  const scrollPositions=new Map();
  let previousView=state.view;
  document.querySelector('.tabs').addEventListener('click', event => {
    const button=event.target.closest('[data-view]');
    if (!button || button.disabled || button.dataset.view===previousView) return;
    scrollPositions.set(previousView,scrollY);previousView=button.dataset.view;
    window.scrollTo({top:scrollPositions.get(previousView)||0,behavior:'instant'});
  });
  document.querySelector('.tabs').addEventListener('keydown', event => {
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const tabs=[...document.querySelectorAll('.tab:not(:disabled)')],index=tabs.indexOf(document.activeElement);
    if(index<0)return;
    event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    tabs[next].click();tabs[next].focus();
  });
  document.addEventListener('click', event => {
    const button=event.target.closest('[data-calendar-goal]');if(!button)return;
    $('#calendarDayDialog').close();openDetails(button.dataset.calendarGoal,button.dataset.day);
  });
  // User titles, notes, units and form values retain exactly the authored casing.
  const userContent='[data-user-content],input,textarea,script,style,.goal h2,.group-heading h2,.group-member strong,.today-info h3,#progressTitle,.task-summary-title,.plan-item strong,.plan-notes,.reward-name,.dream-book h3,.shelf-selected h3,.spine-caption,#calendarGoal option:not([value="all"]),#goalGroup option:not([value=""])';
  function lowercaseNode(node) {
    if(node.nodeType===Node.TEXT_NODE){
      if(!node.parentElement || node.parentElement.closest(userContent))return;
      const value=node.data.toLocaleLowerCase('pt-BR');if(value!==node.data)node.data=value;
      return;
    }
    if(node.nodeType!==Node.ELEMENT_NODE)return;
    if(node.hasAttribute('placeholder'))node.setAttribute('placeholder',node.getAttribute('placeholder').toLocaleLowerCase('pt-BR'));
    if(node.matches(userContent))return;
    for(const child of node.childNodes)lowercaseNode(child);
  }
  lowercaseNode(document.body);
  new MutationObserver(changes => {
    for(const change of changes){
      if(change.type==='characterData')lowercaseNode(change.target);
      else for(const node of change.addedNodes)lowercaseNode(node);
    }
  }).observe(document.body,{subtree:true,childList:true,characterData:true});
})();

// Reversible mobile book proposal; only changes presentation on this device.
(()=>{
 const toggle=document.getElementById('mobileBookToggle');
 if(!toggle)return;
 let enabled=true;
 try{enabled=localStorage.getItem('tiny-mobile-book-preview')!=='off'}catch{}
 const apply=()=>{document.documentElement.dataset.mobileBook=String(enabled);toggle.checked=enabled};
 apply();
 toggle.addEventListener('change',()=>{
  enabled=toggle.checked;apply();
  try{localStorage.setItem('tiny-mobile-book-preview',enabled?'on':'off')}catch{}
 });
})();

// Full-screen chapter navigation, isolated from horizontal dream-card gestures.
(()=>{
 const root=document.documentElement,main=document.querySelector('main');
 const welcome=document.querySelector('.welcome'),header=document.querySelector('.topbar'),workspace=document.querySelector('#mobileDreams');
 const media=matchMedia('(max-width:560px)');
 const navigation=workspace?.querySelector('.workspace-top');
 if(!main||!welcome||!header||!workspace)return;
 let panel=null,page=0,gesture=null,locked=false,timer;
 const back=document.createElement('button');back.type='button';back.className='mobile-chapter-back';back.textContent='↑ voltar ao início';
 workspace.prepend(back);
 const active=()=>root.dataset.mobileBook==='true'&&document.body.dataset.view==='dreams'&&media.matches;
 function go(next){
  if(!panel)return;
  page=next;locked=true;clearTimeout(timer);
  main.scrollTo({top:page*main.clientHeight,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
  timer=setTimeout(()=>{locked=false},500);
  panel.inert=page===1;workspace.inert=page===0;
 }
 function sync(){
  if(active()&&!panel){
   panel=document.createElement('section');panel.className='mobile-intro-panel';panel.setAttribute('aria-label','início');
   main.prepend(panel);panel.append(header,welcome);if(navigation)document.body.append(navigation);main.classList.add('mobile-chapter-pager');
   window.scrollTo({top:0,behavior:'instant'});page=0;main.scrollTop=0;workspace.inert=true;
  }else if(!active()&&panel){
   panel.inert=false;workspace.inert=false;if(navigation)workspace.prepend(navigation);document.body.insertBefore(header,main);main.prepend(welcome);panel.remove();panel=null;
   main.classList.remove('mobile-chapter-pager');main.scrollTop=0;clearTimeout(timer);locked=false;
  }
 }
 welcome.querySelector('.mobile-chapter-link')?.addEventListener('click',event=>{if(active()){event.preventDefault();go(1)}});
 back.addEventListener('click',()=>go(0));
 main.addEventListener('touchstart',event=>{
  if(!active()||locked||document.querySelector('dialog[open]')||event.touches.length!==1){gesture=null;return}
  const t=event.touches[0];gesture={x:t.clientX,y:t.clientY,top:page===0?panel.scrollTop:workspace.scrollTop,bottom:page===0?panel.scrollHeight-panel.clientHeight:0,change:false};
 },{passive:true});
 main.addEventListener('touchmove',event=>{
  if(!gesture)return;
  const t=event.touches[0],dx=t.clientX-gesture.x,dy=t.clientY-gesture.y;
  if(Math.abs(dy)<=Math.abs(dx)||Math.abs(dy)<10)return;
  if((page===0&&dy<0&&gesture.top>=gesture.bottom-2)||(page===1&&dy>0&&gesture.top<=2)){
   event.preventDefault();gesture.change=true;
  }
 },{passive:false});
 main.addEventListener('touchend',event=>{
  if(!gesture)return;
  const t=event.changedTouches[0],dy=t.clientY-gesture.y;
  if(gesture.change&&Math.abs(dy)>45&&!locked)go(page===0?1:0);
  gesture=null;
 },{passive:true});
 main.addEventListener('touchcancel',()=>{gesture=null},{passive:true});
 main.addEventListener('wheel',event=>{
  if(!active()||document.querySelector('dialog[open]')||Math.abs(event.deltaY)<=Math.abs(event.deltaX))return;
  if(page===0&&event.deltaY>0&&panel.scrollTop>=panel.scrollHeight-panel.clientHeight-2||page===1&&event.deltaY<0&&workspace.scrollTop<=0){event.preventDefault();if(!locked)go(page===0?1:0)}
 },{passive:false});
 new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['data-mobile-book']});
 new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['data-view']});
 media.addEventListener('change',sync);
 window.addEventListener('resize',()=>{if(panel)main.scrollTo({top:page*main.clientHeight,behavior:'instant'})});
 sync();
})();
