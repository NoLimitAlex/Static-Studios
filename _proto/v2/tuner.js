/* Campaign tuner, shared by /music/campaigns/, /games/campaigns/ and /apps/campaigns/
   (4 Nov 2026, v2.1). A dark screen carrying stacked station cards under a permanent
   film of static, a tick band with a draggable needle, and a chip row underneath.

   Everything page-specific lives in the markup:
     #radio[data-start]          the station the page opens on (no scan: it is tuned
                                 on first paint, so the content shows immediately)
     .station-card[data-f]       where the station sits on the band (0 to 14)
     .station-card[data-name]    what screen readers hear ("Channel 001, Harvey")
     .station-card[data-mark]    optional short label on the band (default: the number)
     .station-card.open-st       the open channel, parked in the dead air past 12
     [data-count] inside a card  a number that counts up when its station locks
   The static film on #screenStatic is drawn by script.js. */
(function(){
  const radio=document.getElementById('radio'),
        band=document.getElementById('band'),
        ticks=document.getElementById('bandTicks'),
        needle=document.getElementById('needle'),
        hudF=document.getElementById('hudFreq'),
        hudS=document.getElementById('hudState'),
        stc=document.getElementById('screenStatic');
  if(!radio||!band) return;

  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const MAX=14, LAST_TICK=12;
  const cards=Array.prototype.slice.call(radio.querySelectorAll('.station-card'));
  const chips=Array.prototype.slice.call(radio.querySelectorAll('.st-chip'));
  const stations=cards.map(c=>({f:parseFloat(c.dataset.f),el:c,id:c.id,
                                name:c.dataset.name||c.id,open:c.classList.contains('open-st'),
                                mark:c.dataset.mark}))
                      .sort((a,b)=>a.f-b.f);
  let freq=parseFloat(radio.dataset.start||stations[0].f), locked=null, anim=null, countRAF;

  for(let v=0; v<=LAST_TICK*4; v++){
    const val=v/4, el=document.createElement('span');
    el.className='tick'+(val%2===0?' maj':(val%1===0?' mid':''));
    el.style.left=(val/MAX*100)+'%'; ticks.appendChild(el);
    if(val%2===0){
      const l=document.createElement('span');
      l.className='tick-l'; l.textContent=val; l.style.left=(val/MAX*100)+'%';
      ticks.appendChild(l);
    }
  }
  stations.forEach(s=>{
    const b=document.createElement('button');
    b.type='button'; b.className='st-mark'; b.tabIndex=-1;
    b.style.left=(s.f/MAX*100)+'%';
    b.textContent = s.open ? 'Open' : (s.mark || s.f.toFixed(1));
    b.setAttribute('aria-label','Tune to '+s.name);
    b.addEventListener('click',e=>{e.stopPropagation(); tuneTo(s.f);});
    ticks.appendChild(b); s.btn=b;
  });

  /* a headline figure counts up each time its station locks */
  function startCount(card){
    const el=card&&card.querySelector('[data-count]'); if(!el) return;
    const target=parseInt(el.dataset.count,10);
    const fmt=v=>Math.round(v).toLocaleString('en-GB');
    if(reduce){ el.textContent=fmt(target); return; }
    cancelAnimationFrame(countRAF); let t0=null;
    (function step(ts){
      if(!t0)t0=ts;
      const p=Math.min(1,(ts-t0)/1200), e=1-Math.pow(1-p,3);
      el.textContent=fmt(target*e);
      if(p<1) countRAF=requestAnimationFrame(step);
    })(performance.now());
  }

  const nearest=f=>stations.reduce((b,s)=>Math.abs(s.f-f)<Math.abs(b.f-f)?s:b,stations[0]);

  function render(first){
    needle.style.left=(freq/MAX*100)+'%';
    const n=nearest(freq), d=Math.abs(n.f-freq);
    const off=Math.min(1,d/0.55);
    // never fully clear: a film of static sits on the screen even when locked
    if(stc) stc.style.opacity=(0.07+off*0.78).toFixed(3);
    const lockNow = d<0.07 ? n : null;
    cards.forEach(c=>c.classList.toggle('on', c===n.el));
    stations.forEach(s=>s.btn.classList.toggle('on', s===lockNow));
    hudF.textContent='FM '+(lockNow&&lockNow.open ? '--.-' : freq.toFixed(1));
    hudS.textContent=lockNow?'Locked':'Searching';
    hudS.classList.toggle('lock',!!lockNow);
    if(lockNow!==locked){
      // on first paint the number is already written in the HTML: no count-up
      if(lockNow && !first) startCount(lockNow.el);
      locked=lockNow;
      chips.forEach(ch=>ch.setAttribute('aria-selected',
        String(!!lockNow && ch.getAttribute('aria-controls')===lockNow.id)));
      band.setAttribute('aria-valuenow',freq.toFixed(1));
      band.setAttribute('aria-valuetext', lockNow?lockNow.name:'Searching');
    }
  }

  function tuneTo(target){
    if(anim) cancelAnimationFrame(anim);
    if(reduce){ freq=target; render(); return; }
    const from=freq; let t0=null;
    const dur=Math.min(900, 250+Math.abs(target-from)*70);
    (function step(ts){
      if(!t0)t0=ts;
      const p=Math.min(1,(ts-t0)/dur), e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
      freq=from+(target-from)*e; render();
      anim = p<1 ? requestAnimationFrame(step) : null;
    })(performance.now());
  }

  const fromPointer=e=>{
    const r=ticks.getBoundingClientRect();
    return Math.max(0,Math.min(MAX,(e.clientX-r.left)/r.width*MAX));
  };

  let dragging=false, startX=0, moved=false;
  band.addEventListener('pointerdown',e=>{
    if(e.target.closest('.st-mark')) return;
    dragging=true; moved=false; startX=e.clientX;
    if(anim) cancelAnimationFrame(anim);
    band.setPointerCapture(e.pointerId);
  });
  band.addEventListener('pointermove',e=>{
    if(!dragging) return;
    if(Math.abs(e.clientX-startX)>3) moved=true;
    if(moved){ freq=fromPointer(e); render(); }
  });
  function end(e){
    if(!dragging) return; dragging=false;
    if(!moved) freq=fromPointer(e);
    tuneTo(nearest(freq).f);
  }
  band.addEventListener('pointerup',end);
  band.addEventListener('pointercancel',end);
  band.addEventListener('keydown',e=>{
    const i=stations.indexOf(nearest(freq));
    if(e.key==='ArrowRight'||e.key==='ArrowUp'){e.preventDefault();tuneTo(stations[Math.min(stations.length-1,i+1)].f);}
    if(e.key==='ArrowLeft'||e.key==='ArrowDown'){e.preventDefault();tuneTo(stations[Math.max(0,i-1)].f);}
    if(e.key==='Home'){e.preventDefault();tuneTo(stations[0].f);}
    if(e.key==='End'){e.preventDefault();tuneTo(stations[stations.length-1].f);}
  });
  chips.forEach(ch=>ch.addEventListener('click',()=>tuneTo(parseFloat(ch.dataset.f))));

  /* first view: already tuned to the start station, nothing to wait for */
  render(true);
})();
