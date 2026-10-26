'use strict';
// October's small enchantments. No data requests, sound, or layout measurements per frame.
(()=>{
  const root=document.documentElement;
  const canvas=document.querySelector('#nightMagic');
  const context=canvas.getContext('2d');
  const toggle=document.querySelector('#motionToggle');
  const hint=document.querySelector('#motionHint');
  let atmosphere=document.documentElement.dataset.atmosphere||'stars';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let enabled=true;
  try{enabled=localStorage.getItem('tiny-dreams-motion')!=='off';}catch{}
  let inView=true,frame=0,lastFrame=0,width=0,height=0,shootingStar=null,nextStar=0;
  const fireflies=Array.from({length:9},()=>({x:Math.random(),y:.57+Math.random()*.34,phase:Math.random()*Math.PI*2,speed:.3+Math.random()*.4,radius:.8+Math.random()*.7}));
  const artObserver=new IntersectionObserver(entries=>{
    for(const entry of entries)entry.target.classList.toggle('magic-visible',entry.isIntersecting);
  },{threshold:.15});
  const observeArt=()=>{
    artObserver.disconnect();
    document.querySelectorAll('.talisman,.empty-talisman').forEach((art,i)=>{
      art.style.setProperty('--magic-delay',`${-(i%5)*1.3}s`);
      artObserver.observe(art);
    });
  };
  new MutationObserver(observeArt).observe(document.querySelector('#content'),{childList:true,subtree:true});
  observeArt();
  function resize(){
    const box=canvas.getBoundingClientRect();
    width=box.width;height=box.height;
    const ratio=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    context?.setTransform(ratio,0,0,ratio,0,0);
  }
  function active(){return enabled&&!reduced.matches&&!document.hidden&&!document.querySelector('dialog[open]');}
  function update(){
    root.dataset.motion=active()?'active':'paused';
    toggle.checked=enabled&&!reduced.matches;
    toggle.disabled=reduced.matches;
    hint.textContent=reduced.matches?'Os movimentos estão pausados pela preferência de reduzir movimento do seu dispositivo.':'Você pode pausar os movimentos quando quiser.';
    cancelAnimationFrame(frame);frame=0;
    if(active()&&inView&&context){nextStar=performance.now()+2000+Math.random()*3000;lastFrame=0;frame=requestAnimationFrame(draw);}
    else{shootingStar=null;context?.clearRect(0,0,width,height);}
  }
  function draw(now){
    frame=requestAnimationFrame(draw);
    if(now-lastFrame<1000/30)return;
    lastFrame=now;
    context.clearRect(0,0,width,height);
    const seconds=now/1000;
    for(const fly of fireflies){
      const pulse=.12+.35*(.5+.5*Math.sin(seconds*fly.speed+fly.phase));
      const x=fly.x*width+Math.sin(seconds*.2+fly.phase)*12;
      const y=fly.y*height+Math.cos(seconds*.3+fly.phase)*9;
      context.fillStyle=`rgba(255,217,151,${pulse})`;
      context.strokeStyle=`rgba(224,236,239,${pulse*.5})`;
      if(atmosphere==='rain'){
        const fall=(fly.y*height+seconds*(18+fly.speed*12))%height;
        context.lineWidth=.7;context.beginPath();context.moveTo(x,fall);context.lineTo(x-3,fall+16);context.stroke();
      }else if(atmosphere==='bubbles'){
        const rise=height-((fly.y*height+seconds*fly.speed*7)%height);
        context.lineWidth=.7;context.beginPath();context.arc(x,rise,fly.radius+1,0,Math.PI*2);context.stroke();
      }else if(atmosphere==='petals'){
        const fall=(fly.y*height+seconds*fly.speed*5)%height;
        context.fillStyle=`rgba(236,219,228,${pulse})`;context.beginPath();context.ellipse(x,fall,2.6,1.3,Math.sin(seconds*.4+fly.phase),0,Math.PI*2);context.fill();
      }else{
        context.beginPath();context.arc(x,y,fly.radius,0,Math.PI*2);context.fill();
      }
    }
    if(atmosphere==='stars'&&!shootingStar&&now>=nextStar){
      shootingStar={born:now,x:width*(.35+Math.random()*.55),y:height*(.05+Math.random()*.22),distance:Math.min(width*.35,210),duration:1100};
    }
    if(shootingStar){
      const star=shootingStar,progress=(now-star.born)/star.duration;
      if(progress>=1){shootingStar=null;nextStar=now+8000+Math.random()*14000;return;}
      const x=star.x-star.distance*progress,y=star.y+star.distance*.48*progress;
      const alpha=Math.sin(progress*Math.PI)*.8;
      const tail=Math.min(65,star.distance*progress);
      const gradient=context.createLinearGradient(x,y,x+tail,y-tail*.48);
      gradient.addColorStop(0,`rgba(255,243,216,${alpha})`);gradient.addColorStop(1,'rgba(255,243,216,0)');
      context.strokeStyle=gradient;context.lineWidth=1.3;context.beginPath();context.moveTo(x,y);context.lineTo(x+tail,y-tail*.48);context.stroke();
      context.fillStyle=`rgba(255,250,231,${alpha})`;context.beginPath();context.arc(x,y,1.4,0,Math.PI*2);context.fill();
    }
  }
  document.addEventListener('dreameditionchange',()=>{atmosphere=root.dataset.atmosphere||'stars';shootingStar=null;update();});
  toggle.addEventListener('change',()=>{enabled=toggle.checked;try{localStorage.setItem('tiny-dreams-motion',enabled?'on':'off');}catch{}update();});
  reduced.addEventListener('change',update);
  document.addEventListener('visibilitychange',update);
  const dialogObserver=new MutationObserver(update);
  document.querySelectorAll('dialog').forEach(dialog=>dialogObserver.observe(dialog,{attributes:true,attributeFilter:['open']}));
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;update();}).observe(canvas);
  window.addEventListener('resize',resize,{passive:true});
  resize();update();
})();
// Return to the quiet ambient motion after the check-in's one-off celebration.
document.addEventListener('animationend',event=>{
  if(event.animationName==='bloom')event.target.closest('.goal')?.classList.remove('celebrate');
});
