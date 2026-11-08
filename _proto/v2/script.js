/* Static Studios concept — background lines and the page transition.

   The background below is the original prototype's code, unchanged: the same
   spike() shape, the same STEP, the same 31 / 66 amplitudes, the same
   0.0011-per-frame travel, the same lifetimes, spawn rate and stroke. The
   only thing altered is how a line ARRIVES. Instead of fading up at full
   length it fires from one end and draws itself across, with the leading tip
   briefly brighter. Once that entrance finishes the line renders exactly as
   it always did. */

/* Canvas ignores CSS custom properties, so the drawing colours are read off
   :root once at load. That keeps the trace, the lines and the sweep in step
   with the theme instead of being hardcoded light-on-dark or dark-on-light. */
const THEME=(()=>{
  const cs=getComputedStyle(document.documentElement);
  const pick=(n,f)=>(cs.getPropertyValue(n)||'').trim()||f;
  const hex=pick('--ink','#171717');
  // turn whatever --ink is into an "r,g,b" triplet we can build rgba() from
  const probe=document.createElement('canvas').getContext('2d');
  probe.fillStyle=hex; probe.fillRect(0,0,1,1);
  const d=probe.getImageData(0,0,1,1).data;
  const lum=(0.299*d[0]+0.587*d[1]+0.114*d[2])/255;
  return {
    rgb:d[0]+','+d[1]+','+d[2],                    // the foreground
    back:lum>0.5?'0,0,0':'255,255,255',            // the opposite, for haloes
    dark:lum<=0.5                                  // is the page light?
  };
})();

(function background(){
  const c=document.getElementById('pulse-bg'); if(!c) return;
  const x=c.getContext('2d');
  let W,H,dpr;
  function size(){
    dpr=Math.min(devicePixelRatio||1,2.5);
    W=innerWidth;H=innerHeight;
    c.width=Math.round(W*dpr);c.height=Math.round(H*dpr);
    c.style.width=W+'px';c.style.height=H+'px';
    x.setTransform(dpr,0,0,dpr,0,0);
  }
  size();addEventListener('resize',size);

  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const lines=[];
  const MAX=18;

  /* Cursor interference. A line passing near the pointer picks up a local
     wobble, strongest where the pointer is closest and fading out with
     distance, so moving across the field disturbs the signal rather than
     sitting on top of it. */
  const CUR_R=150;        // how close the pointer has to be, in px
  const CUR_AMP=17;       // how far the line is pushed at full strength
  let mx=-99999,my=-99999,curOn=0,curT=0;
  addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY;curT=1;},{passive:true});
  addEventListener('blur',()=>{curT=0;});
  document.addEventListener('mouseout',e=>{if(!e.relatedTarget)curT=0;});

  function spawn(aged){
    // pick an angle, then extend the line well past both edges
    const ang=Math.random()*Math.PI;
    const cx=Math.random()*W, cy=Math.random()*H;
    const r=Math.hypot(W,H);
    let x1=cx-Math.cos(ang)*r, y1=cy-Math.sin(ang)*r;
    let x2=cx+Math.cos(ang)*r, y2=cy+Math.sin(ang)*r;
    // ENTRANCE ONLY: fire from either end, not always the same one
    if(Math.random()<0.5){ const tx=x1,ty=y1; x1=x2;y1=y2; x2=tx;y2=ty; }
    const life=9000+Math.random()*7000;
    lines.push({
      x1:x1, y1:y1, x2:x2, y2:y2,
      // ENTRANCE ONLY: stagger the opening batch through their lifetimes so
      // the page does not start with eleven lines firing at once
      born:performance.now()-(aged?Math.random()*life*0.8:0),
      life:life,
      zap:150+Math.random()*130,                  // ENTRANCE ONLY: ms to cross
      pulses:[],
      next:Math.random()*2600
    });
  }
  for(let i=0;i<11;i++) spawn(true);

  // classic ECG-ish spike, u in [-1,1]
  function spike(u){
    const a=Math.abs(u);
    if(a>1) return 0;
    if(u<-0.34) return 0;
    if(u<-0.16) return -0.18*(1-(Math.abs(u+0.25)/0.09));
    if(u<0)     return  (1+u/0.16);
    if(u<0.17)  return  (1-u/0.17)*1 - (u/0.17)*0.45;
    if(u<0.42)  return -0.45*(1-(u-0.17)/0.25);
    return 0;
  }

  function draw(now){
    curOn += (curT-curOn)*0.07;        // ease the interference in and out
    x.clearRect(0,0,W,H);
    for(let i=lines.length-1;i>=0;i--){
      const L=lines[i];
      const age=now-L.born, t=age/L.life;
      if(t>=1){lines.splice(i,1);continue;}
      // ENTRANCE ONLY: the fade-in is replaced by the beam drawing itself
      // across. The fade-out at the end of life is the original.
      const z=Math.min(1,age/L.zap);
      const reach=1-Math.pow(1-z,3);
      const hot=z<1?(1-z)*(1-z):0;
      const alpha = t>0.82 ? (1-(t-0.82)/0.18) : 1;

      if(!reduce && age>L.next){
        L.pulses.push({p:-0.05, big:Math.random()<0.22});
        L.next = age + 2400 + Math.random()*4200;   // low heart rate
      }
      const dx=L.x2-L.x1, dy=L.y2-L.y1;
      const len=Math.hypot(dx,dy);
      const nx=-dy/len, ny=dx/len;                  // perpendicular

      /* Where the pointer falls on THIS line, and how hard it pulls.
         cs is the point along the line nearest the pointer; perp is the
         pointer's signed distance from the line, which both sets the strength
         and decides which side the line bends toward. */
      let cs=0, cAmp=0, cSide=1;
      if(curOn>0.004){
        const rx=mx-L.x1, ry=my-L.y1;
        cs=(rx*dx+ry*dy)/(len*len);
        const perp=rx*nx+ry*ny, ap=Math.abs(perp);
        if(ap<CUR_R && cs>-0.02 && cs<1.02){
          cAmp=(1-ap/CUR_R)*curOn;
          cSide=perp<0?-1:1;
        }
      }

      x.beginPath();
      const STEP=0.004;
      for(let s=0;s<=reach;s+=STEP){
        let off=0;
        for(const pl of L.pulses){
          const u=(s-pl.p)/0.021;
          if(Math.abs(u)<=1) off += spike(u)*(pl.big?66:31);
        }
        if(cAmp>0.004){
          // a soft wobble in line-space, centred under the pointer
          const ds=(s-cs)*len;
          off += cSide*cAmp*CUR_AMP*Math.exp(-(ds*ds)/(2*90*90))*Math.sin(ds*0.045-now*0.006);
        }
        const px=L.x1+dx*s+nx*off, py=L.y1+dy*s+ny*off;
        s===0 ? x.moveTo(px,py) : x.lineTo(px,py);
      }
      x.strokeStyle='rgba('+THEME.rgb+','+(alpha*0.3)+')';
      x.lineWidth=1;
      x.stroke();

      // ENTRANCE ONLY: a brighter stretch chasing the tip while it travels.
      // hot is 0 once the entrance is done, so this stops drawing entirely.
      if(hot>0.002){
        const a0=Math.max(0,reach-0.16);
        let off0=0,off1=0;
        for(const pl of L.pulses){
          const u0=(a0-pl.p)/0.021, u1=(reach-pl.p)/0.021;
          if(Math.abs(u0)<=1) off0 += spike(u0)*(pl.big?66:31);
          if(Math.abs(u1)<=1) off1 += spike(u1)*(pl.big?66:31);
        }
        const g=x.createLinearGradient(L.x1+dx*a0+nx*off0, L.y1+dy*a0+ny*off0,
                                       L.x1+dx*reach+nx*off1, L.y1+dy*reach+ny*off1);
        g.addColorStop(0,'rgba('+THEME.rgb+',0)');
        g.addColorStop(1,'rgba('+THEME.rgb+','+(alpha*0.72*hot)+')');
        x.beginPath();
        for(let s=a0;s<=reach;s+=STEP){
          let off=0;
          for(const pl of L.pulses){
            const u=(s-pl.p)/0.021;
            if(Math.abs(u)<=1) off += spike(u)*(pl.big?66:31);
          }
          const px=L.x1+dx*s+nx*off, py=L.y1+dy*s+ny*off;
          s===a0 ? x.moveTo(px,py) : x.lineTo(px,py);
        }
        x.strokeStyle=g;x.lineWidth=1.5;x.stroke();
      }

      for(let j=L.pulses.length-1;j>=0;j--){
        L.pulses[j].p += 0.0011;
        if(L.pulses[j].p>1.05) L.pulses.splice(j,1);
      }
    }
    if(lines.length<MAX && Math.random()<0.03) spawn();
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

(function miniStatic(){
  // vis starts TRUE. IntersectionObserver only ever turns painting off, it is
  // never what switches it on, so a card still parked offscreen in the
  // carousel track is already painted by the time it slides into view.
  const minis=[...document.querySelectorAll('.mini-static,.screen-static')]
    .map(cv=>({cv,ctx:cv.getContext('2d'),vis:true,img:null,buf:null,w:0,h:0}));
  if(!minis.length) return;
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  let seed=0x2545F491;
  const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
  /* Untuned-TV snow. Full range so it reads as a received signal rather than a
     texture, plus two things a real mistuned set does: a soft bright bar
     rolling slowly down the frame, and the occasional dropped scanline that
     slides sideways. */
  function paint(m,now){
    if(!m.buf) return;
    const w=m.cv.width,h=m.cv.height;
    const bar=(((now*0.00013)%1)*1.55-0.28)*h;        // rolling bar centre
    const barH=Math.max(3,h*0.22);
    for(let y=0;y<h;y++){
      // rare tear: slide one row sideways, like a dropped scanline
      const tear=(rnd()%769===0)?((rnd()%13)-6):0;
      const lift=Math.max(0,1-Math.abs(y-bar)/barH)*46;
      const row=y*w;
      for(let xp=0;xp<w;xp++){
        let v=(rnd()&255)+lift;
        if(v>255)v=255;
        let xx=xp+tear;
        if(xx<0)xx+=w; else if(xx>=w)xx-=w;
        m.buf[row+xx]=0xff000000|(v<<16)|(v<<8)|v;
      }
    }
    m.ctx.putImageData(m.img,0,0);
  }
  /* Size from the element's own box. Relying on ResizeObserver alone left the
     canvas at its default 300x150 with no pixel buffer, so paint() bailed and
     nothing ever drew. This is checked every frame instead, which is cheap
     because it only reallocates when the box actually changes. */
  function measure(m){
    const r=m.cv.getBoundingClientRect();
    const w=Math.max(1,Math.ceil(r.width/3)), h=Math.max(1,Math.ceil(r.height/3));
    if(r.width<1||r.height<1) return false;          // not laid out yet, try again
    if(w===m.w&&h===m.h&&m.buf) return true;
    m.w=w;m.h=h;m.cv.width=w;m.cv.height=h;
    m.img=m.ctx.createImageData(w,h);
    m.buf=new Uint32Array(m.img.data.buffer);
    return true;
  }
  const io=new IntersectionObserver(es=>es.forEach(e=>{
    const m=minis.find(m=>m.cv===e.target); if(m) m.vis=e.isIntersecting;
  }));
  minis.forEach(m=>{io.observe(m.cv);if(measure(m))paint(m,performance.now());});
  let last=0;
  (function loop(t){
    requestAnimationFrame(loop);
    if(reduce||document.hidden||t-last<62) return;   // ~16fps, enough for snow
    last=t;
    for(const m of minis){ if(!m.vis) continue; if(measure(m)) paint(m,t); }
  })(0);
})();

/* Brief form. No backend: it rebuilds a mailto link as you type, so Send opens
   the sender's own mail app with the brief already written. Copy for DMs puts
   the same text on the clipboard for Instagram. The fields are whatever the page
   marks with data-label (music, games and apps ask for different things); the
   one marked data-subject names the email, data-fallback covers it when empty. */
(function brief(){
  const form=document.getElementById('brief'); if(!form) return;
  const $=id=>document.getElementById(id);
  const fields=[...form.querySelectorAll('[data-label]')];
  const send=$('send'); if(!send||!fields.length) return;
  const val=f=>(f.value||'').trim();
  function text(){
    return ['STATIC STUDIOS / CAMPAIGN BRIEF','']
      .concat(fields.map(f=>f.dataset.label+': '+(val(f)||f.dataset.empty||'-')))
      .join('\n');
  }
  function update(){
    const s=form.querySelector('[data-subject]');
    send.href='mailto:contact@staticstudios.io'
      +'?subject='+encodeURIComponent((form.dataset.subject||'Campaign brief')+': '
        +((s&&val(s))||form.dataset.fallback||'new campaign'))
      +'&body='+encodeURIComponent(text());
  }
  fields.forEach(f=>{f.addEventListener('input',update);f.addEventListener('change',update);});
  form.addEventListener('submit',e=>{e.preventDefault(); send.click();});   // Enter sends
  update();
  const copy=$('copy'), status=$('copyStatus');
  if(copy) copy.addEventListener('click',async()=>{
    const label=copy.textContent;
    try{
      await navigator.clipboard.writeText(text());
      copy.textContent='Copied';
      if(status) status.textContent='Brief copied to clipboard.';
    }catch(e){
      copy.textContent='Copy blocked';
      if(status) status.textContent='Copying was blocked, use the email button instead.';
    }
    setTimeout(()=>{copy.textContent=label;},1800);
  });
})();

/* Screen burn. The sweep scorches this layer as it crosses; the heat glows
   through a thermal ramp and cools off, like phosphor burn on a CRT. The
   backing canvas is deliberately low resolution so the browser's own
   upscaling does the blurring for free. */
const heat=(()=>{
  const cv=document.getElementById('heat');
  if(!cv) return {deposit(){}};
  const h=cv.getContext('2d');
  const CELL=6;
  // Heat left after one second. Low enough that the tail visibly dies back
  // from the oldest end while the head is still travelling.
  // Heat left after one second. At 0.09 the peak had cooled off the top of the
  // ramp within ~120ms, so the core never got past orange and the whole burn
  // read purple. Slower cooling lets the trail show the full ramp: yellow at
  // the head, through orange and red, to magenta and indigo at the tail.
  const COOL=0.18;
  let hw=0,hh=0,img=null,buf=null,grid=null,R=0,K=0,kern=null,live=false;

  const stops=[[0,[42,17,112]],[.22,[90,20,151]],[.42,[176,24,111]],
               [.6,[229,57,43]],[.8,[248,141,29]],[1,[255,226,77]]];
  const LUT=(()=>{
    const o=new Uint8Array(256*3);
    for(let i=0;i<256;i++){
      const t=i/255;let k=0;
      while(k<stops.length-2&&t>stops[k+1][0])k++;
      const [t0,c0]=stops[k],[t1,c1]=stops[k+1];
      const f=Math.min(1,Math.max(0,(t-t0)/(t1-t0)));
      for(let j=0;j<3;j++)o[i*3+j]=Math.round(c0[j]+(c1[j]-c0[j])*f);
    }
    return o;
  })();

  function size(){
    const w=innerWidth,ht=innerHeight;
    if(w<1||ht<1) return false;                 // never hand 0 to the canvas
    hw=Math.max(1,Math.ceil(w/CELL));hh=Math.max(1,Math.ceil(ht/CELL));
    cv.width=hw;cv.height=hh;
    img=h.createImageData(hw,hh);buf=new Uint32Array(img.data.buffer);
    grid=new Float32Array(hw*hh);
    // Wider reach so the glow has somewhere to fall off through, but a tight
    // sigma so the core stays hot and the colour ramps outward rather than
    // washing the whole blob one flat shade.
    R=Math.max(4,Math.round(42/CELL));K=2*R+1;
    const sig=R/2.4;kern=new Float32Array(K*K);
    for(let y=-R;y<=R;y++)for(let x2=-R;x2<=R;x2++){
      const d=x2*x2+y*y;
      kern[(y+R)*K+(x2+R)]=d>R*R?0:Math.exp(-d/(2*sig*sig));
    }
    return true;
  }
  function deposit(cx0,cy0,amt){
    if(!grid) return;
    const cx=Math.round(cx0/CELL),cy=Math.round(cy0/CELL);
    for(let y=-R;y<=R;y++){
      const yy=cy+y; if(yy<0||yy>=hh) continue;
      const row=yy*hw,krow=(y+R)*K+R;
      for(let x2=-R;x2<=R;x2++){
        const xx=cx+x2; if(xx<0||xx>=hw) continue;
        const k=kern[krow+x2]; if(!k) continue;
        const i=row+xx,v=grid[i]+amt*k;
        grid[i]=v>1.6?1.6:v;   // headroom above 1 so a saturated core holds
                               // yellow for a beat before it starts cooling
      }
    }
    live=true; kick();
  }
  /* The loop only runs while there is heat on screen: deposit() starts it, and
     it stops itself once everything has cooled (battery, 4 Nov 2026). */
  let lastT=performance.now(), running=false;
  function kick(){ if(!running){ running=true; lastT=performance.now(); requestAnimationFrame(frame); } }
  function frame(now){
    const dt=Math.min(0.05,(now-lastT)/1000); lastT=now;
    if(!grid||!live||document.hidden){ running=false; return; }
    requestAnimationFrame(frame);
    const keep=Math.pow(COOL,dt);
    let any=false;
    for(let i=0;i<buf.length;i++){
      const v=grid[i];
      if(v>0.004){
        any=true; grid[i]=v*keep;
        const t=v>1?1:v,k=((t*255)|0)*3;
        const a=Math.min(255,Math.round(248*(t*t*(3-2*t))));
        buf[i]=(a<<24)|(LUT[k+2]<<16)|(LUT[k+1]<<8)|LUT[k];
      } else { grid[i]=0; buf[i]=0; }
    }
    live=any;
    h.putImageData(img,0,0);
  }
  size();
  addEventListener('resize',size);
  /* Animation frames stop in a background tab, so a burn that was mid-fade
     when you switched away would be frozen there waiting for you. Wipe it on
     the way out and restart the clock on the way back in. */
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){
      if(grid) grid.fill(0);
      if(buf){ buf.fill(0); h.putImageData(img,0,0); }
      live=false;
    } else lastT=performance.now();
  });
  return {deposit};
})();

/* ═══ HEART MONITOR PULSE (page transitions) ═══════════════════════
   The trace itself is the concept's, unchanged: same DUR, TRAIL and PEAK,
   same QRS geometry, same P and T gaussians, same white halo under a dark
   stroke, same head dot.

   The one real difference between that file and this one is that it was a
   single document swapping divs, and this is six documents. So the sweep is
   handed over mid-flight: at the R peak we record how far along we are and
   navigate, and the arriving page picks the trace up at exactly that point
   and carries it to the end. Same animation, drawn across two documents,
   with the page change landing on the beat the way it does in the concept.
   The scorch builds up as it goes, so the burn carries too. */
(function monitor(){
  const c=document.getElementById('zap');
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const DUR=860, TRAIL=0.6, END=1+TRAIL, PEAK=0.488;
  const KEY='ss-sweep', STALE=900;        // ms after which a handover is dropped

  const g=(u,cc,s)=>Math.exp(-((u-cc)**2)/(2*s*s));
  const QRS=[[0.462,0],[0.472,0.14],[PEAK,-1],[0.503,0.38],[0.516,0]];
  function yAt(u){                        // classic P, QRS, T trace (negative = up)
    let y=-0.12*g(u,0.40,0.016)-0.24*g(u,0.60,0.03);
    if(u>QRS[0][0]&&u<QRS[QRS.length-1][0]){
      for(let i=0;i<QRS.length-1;i++){
        const [a,ya]=QRS[i],[b,yb]=QRS[i+1];
        if(u>=a&&u<=b){ y+=ya+(yb-ya)*(u-a)/(b-a); break; }
      }
    }
    return y;
  }

  if(!c) return;
  const ctx=c.getContext('2d');
  let W=0,H=0,raf=0,t0=0,onPeak=null,fired=false;

  function size(){
    const d=Math.min(2,devicePixelRatio||1);
    W=innerWidth;H=innerHeight;
    if(W<1||H<1) return false;
    const cw=Math.round(W*d),ch=Math.round(H*d);
    if(c.width!==cw||c.height!==ch){ c.width=cw;c.height=ch; }
    c.style.width=W+'px';c.style.height=H+'px';
    ctx.setTransform(d,0,0,d,0,0);
    return true;
  }

  function frame(now){
    const p=Math.min(1,(now-t0)/DUR), head=p*END*W;   // linear sweep, like a real monitor
    const base=H/2, A=Math.min(150,H*0.17);
    ctx.clearRect(0,0,W,H);
    const x0=Math.max(0,head-TRAIL*W), x1=Math.min(W,head);
    if(x1>x0){
      const grad=ctx.createLinearGradient(head-TRAIL*W,0,head,0);
      grad.addColorStop(0,'rgba('+THEME.rgb+',0)');
      grad.addColorStop(.55,'rgba('+THEME.rgb+',1)');
      grad.addColorStop(1,'rgba('+THEME.rgb+',1)');
      ctx.beginPath();
      for(let x=x0;;x+=2){
        const xx=Math.min(x,x1), y=base+yAt(xx/W)*A;
        xx===x0?ctx.moveTo(xx,y):ctx.lineTo(xx,y);
        if(xx>=x1) break;
      }
      ctx.lineJoin='round';ctx.lineCap='round';
      const halo=ctx.createLinearGradient(head-TRAIL*W,0,head,0);
      halo.addColorStop(0,'rgba('+THEME.back+',0)');
      halo.addColorStop(1,'rgba('+THEME.back+',.9)');
      ctx.strokeStyle=halo;ctx.lineWidth=8;ctx.stroke();
      ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=12;
      ctx.strokeStyle=grad;ctx.lineWidth=3;ctx.stroke();
      ctx.shadowBlur=0;
    }
    if(head<=W){
      const hy=base+yAt(head/W)*A;
      ctx.beginPath();ctx.arc(head,hy,4.5,0,Math.PI*2);
      ctx.fillStyle='rgb('+THEME.rgb+')';ctx.shadowColor='rgba('+THEME.back+',.5)';ctx.shadowBlur=14;
      ctx.fill();ctx.shadowBlur=0;
      // Burn hard. A deposit has to reach the top of the 0..1 thermal ramp or
      // the trace never gets past indigo: 0.6 at the baseline saturates the
      // core to yellow-white, and the R spike pushes it well past.
      heat.deposit(head,hy,0.75+Math.abs(yAt(head/W))*0.65);
    }
    if(!fired&&head>=PEAK*W){ fired=true; onPeak&&onPeak(p); }
    if(p<1) raf=requestAnimationFrame(frame);
    else { ctx.clearRect(0,0,W,H); raf=0; if(!fired){ fired=true; onPeak&&onPeak(1); } }
  }

  function play(cb,fromP){
    if(!size()){ cb&&cb(1); return; }
    cancelAnimationFrame(raf);
    c.style.display='block';
    onPeak=cb; fired=false;
    t0=performance.now()-(fromP||0)*DUR;
    raf=requestAnimationFrame(frame);
  }

  /* Pick up a sweep that started on the previous page. */
  (function resume(){
    if(reduce) return;
    let s=null;
    try{ s=JSON.parse(sessionStorage.getItem(KEY)||'null'); sessionStorage.removeItem(KEY); }catch(e){}
    if(!s||typeof s.p!=='number') return;
    const gap=Date.now()-s.at;
    if(gap<0||gap>STALE) return;
    const p=s.p+gap/DUR;                  // where the trace would be by now
    if(p>=1) return;
    play(null,p);                         // no callback: nothing left to navigate to
  })();

  addEventListener('resize',size); size();

  document.querySelectorAll('a[data-zap]').forEach(a=>{
    a.addEventListener('click',e=>{
      if(e.metaKey||e.ctrlKey||e.shiftKey||e.button!==0) return;
      const href=a.getAttribute('href');
      if(!href||href.startsWith('http')||href.startsWith('mailto')) return;
      e.preventDefault();
      if(reduce){ location.href=href; return; }
      if(raf) return;                     // a sweep is already running
      play(p=>{
        // hand the trace, and the scorch, to the page we are about to load
        try{ sessionStorage.setItem(KEY,JSON.stringify({at:Date.now(),p:p})); }catch(e){}
        location.href=href;
      });
    });
  });
})();


/* ═══ GATE PICK ═══════════════════════════════════════════════════════
   Clicking a name on the gate swells it and drops the other two while the
   sweep runs; Back (bfcache) puts the menu as it was. */
(function gatePick(){
  const nav=document.querySelector('.gate-menu nav'); if(!nav) return;
  nav.addEventListener('click',e=>{
    const a=e.target.closest('a');
    if(!a||e.metaKey||e.ctrlKey||e.shiftKey||e.button!==0) return;   // new-tab clicks leave it alone
    a.classList.add('is-picked'); nav.classList.add('picked');
  });
  addEventListener('pageshow',()=>{
    nav.classList.remove('picked');
    nav.querySelectorAll('.is-picked').forEach(a=>a.classList.remove('is-picked'));
  });
})();


/* ═══ NOISE SOURCE (footer wordmark) ═══════════════════════════════════
   One tile of snow as a data URL, clipped to the big footer wordmark by
   CSS and jumped around by a steps() animation. From the v3 concept. */
(function noise(){
  if(!document.querySelector('.static-fill')) return;
  function noiseCanvas(size,lo,hi){
    const c=document.createElement('canvas'); c.width=c.height=size;
    const x=c.getContext('2d'), img=x.createImageData(size,size), d=img.data;
    for(let i=0;i<d.length;i+=4){ const v=lo+Math.random()*(hi-lo); d[i]=d[i+1]=d[i+2]=v; d[i+3]=255; }
    x.putImageData(img,0,0); return c;
  }
  try{
    document.documentElement.style.setProperty('--noise','url('+noiseCanvas(128,105,255).toDataURL()+')');
    document.documentElement.classList.add('has-noise');
  }catch(e){}
})();
