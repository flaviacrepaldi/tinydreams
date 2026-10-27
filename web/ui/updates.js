// Refresh the running app after a new release, without interrupting edits/writes.
(() => {
  const version=document.querySelector('meta[name="tiny-dreams-build"]')?.content;
  if(!/^[a-f0-9]{20}$/.test(version||''))return;
  let pending=false,checking=false,reloading=false,lastInteraction=Date.now();
  function applyUpdate(){
    if(!pending||reloading||document.hidden||!navigator.onLine)return;
    if(typeof state!=='undefined'&&state.busy)return;
    if(document.querySelector('dialog[open]')||document.activeElement?.matches('input,textarea,select,[contenteditable="true"]'))return;
    if(Date.now()-lastInteraction<3000)return;
    reloading=true;
    location.reload();
  }
  async function checkVersion(){
    if(checking||reloading||document.hidden||!navigator.onLine)return;
    checking=true;
    try{
      const response=await fetch('/version.json?t='+Date.now(),{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(10000)});
      if(!response.ok||!response.headers.get('Content-Type')?.includes('application/json'))return;
      const next=await response.json();
      if(/^[a-f0-9]{20}$/.test(next.version||''))pending=next.version!==version;
      applyUpdate();
    }catch{/* Offline, unavailable or older deployment: keep the working page. */}
    finally{checking=false;}
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkVersion()});
  window.addEventListener('pageshow',checkVersion);
  window.addEventListener('online',checkVersion);
  for(const event of ['input','pointerdown','keydown'])document.addEventListener(event,()=>{lastInteraction=Date.now()},{passive:true});
  setInterval(checkVersion,60000);
  setInterval(applyUpdate,2000);
  checkVersion();
})();
