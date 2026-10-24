// A small software 3D renderer: world-space mesh, camera projection and depth sorting.
const TAU = Math.PI * 2;
const clamp = n => Math.max(0, Math.min(1, n));
const ease = n => { n = clamp(n); return n * n * (3 - 2 * n); };
export const TIER_COLORS = ['#a9f5df', '#69caff', '#ca8cff', '#ffe6a0'];
export function summonTimeline(grade, reduced = false) {
  if (reduced) return { charge: 0, eclipse: 180, still: 300, open: 420, silhouette: 620, reveal: 850, end: 1500 };
  return grade === 3
    ? { charge: 700, eclipse: 2500, still: 3600, open: 4400, silhouette: 5000, reveal: 5650, end: 7600 }
    : { charge: 450, eclipse: Infinity, still: Infinity, open: 1600 + grade * 450, silhouette: 2050 + grade * 450, reveal: 2600 + grade * 450, end: 4000 + grade * 500 };
}
export function cinematicFrame(time, grade, reduced = false) {
  const t = summonTimeline(grade, reduced);
  const phase = time >= t.reveal ? 'reveal' : time >= t.silhouette ? 'silhouette' : time >= t.open ? 'burst' : grade === 3 && time >= t.still ? 'stillness' : grade === 3 && time >= t.eclipse ? 'eclipse' : time >= t.charge ? 'charge' : 'arrival';
  return { phase, done: time >= t.end, opening: ease((time - t.open) / (reduced ? 180 : 650)), charge: ease((time - t.charge) / Math.max(1, t.open - t.charge)), reveal: ease((time - t.reveal) / 450), timeline: t };
}
export function createSummonCinematic({ canvas, grade, sprite, sound, onFinish, reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false, rng = Math.random }) {
  const ctx = canvas.getContext('2d');
  const portrait = new Image(); portrait.src = sprite;
  const particles = Array.from({ length: reducedMotion ? 20 : [65, 110, 155, 210][grade] }, () => ({ angle: rng() * TAU, radius: 1.6 + rng() * 4, y: (rng() - .5) * 5, speed: .3 + rng(), size: .8 + rng() * 1.8 }));
  let width = 1, height = 1, raf = 0, disposed = false, lastPhase = '', start = performance.now();
  const audioSession = sound.beginCinematic();
  function resize() {
    const rect = canvas.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  function dispose() { if (disposed) return; disposed = true; cancelAnimationFrame(raf); observer.disconnect(); document.removeEventListener('visibilitychange', hidden); window.removeEventListener('pagehide', finish); audioSession.dispose(); }
  function finish() { if (disposed) return; dispose(); onFinish(); }
  function hidden() { if (document.hidden) finish(); }
  document.addEventListener('visibilitychange', hidden); window.addEventListener('pagehide', finish);
  function render(now) {
    if (disposed) return;
    const ms = now - start, f = cinematicFrame(ms, grade, reducedMotion), t = f.timeline;
    const sec = (f.phase === 'stillness' ? t.still : ms) / 1000;
    canvas.dataset.phase = f.phase; canvas.dataset.grade = String(grade);
    if (f.phase !== lastPhase) { lastPhase = f.phase; audioSession.cue(f.phase, grade); }
    if (f.done || !ctx) { finish(); return; }
    const w = width, h = height, unit = Math.min(w, h) * .245, color = TIER_COLORS[grade];
    const still = f.phase === 'stillness';
    if (still) f.charge = cinematicFrame(t.still, grade, reducedMotion).charge;
    const orbit = reducedMotion ? 0 : grade === 3 ? Math.sin(sec * .75) * .65 : Math.sin(sec * .65) * .22;
    const cameraCharge = still ? cinematicFrame(t.still, grade, reducedMotion).charge : f.charge;
    const distance = reducedMotion ? 6.4 : 7.5 - cameraCharge * 1.5 + f.opening * 1.2;
    const pitch = reducedMotion ? .12 : .17 + Math.sin(sec * .4) * .08;
    const project = ([x,y,z]) => { const xx=x*Math.cos(orbit)-z*Math.sin(orbit), zz=x*Math.sin(orbit)+z*Math.cos(orbit); const yy=y*Math.cos(pitch)-zz*Math.sin(pitch), depth=distance+ y*Math.sin(pitch)+zz*Math.cos(pitch); return {x:w/2+xx*unit*4/depth,y:h*.47-yy*unit*4/depth,z:depth,s:4/depth}; };
    ctx.fillStyle = '#040b19'; ctx.fillRect(0,0,w,h);
    const bg=ctx.createRadialGradient(w*.5,h*.46,0,w*.5,h*.46,Math.max(w,h)*.7);
    bg.addColorStop(0, still?'#100e19':grade===3?'#3d2d47':grade===2?'#251b45':'#103545'); bg.addColorStop(.6,'#071323'); bg.addColorStop(1,'#020711'); ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    // Perspective ground rings establish scale and the moving viewpoint.
    function ring(radius,y,alpha,rotation=0) { ctx.beginPath(); for(let j=0;j<=100;j++){const a=j/100*TAU;const p=project([Math.cos(a)*radius,y+Math.sin(a)*rotation,Math.sin(a)*radius]);j?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.lineWidth=1.2;ctx.stroke();ctx.globalAlpha=1; }
    for(let j=0;j<4;j++)ring(1.4+j*.67,-1.35,.1+j*.04);
    if(grade>0)for(let j=0;j<grade;j++)ring(1.6+j*.35,0,still?.08:.3,Math.sin(sec*.65+j)*1.2);
    const starTime = still ? t.still / 1000 : sec;
    const dots = particles.map(p=>{const a=p.angle+starTime*p.speed*.3;const contraction=f.opening?1+f.opening*2.5:1-f.charge*.65;return {...project([Math.cos(a)*p.radius*contraction,p.y*contraction,Math.sin(a)*p.radius*contraction]),size:p.size,angle:p.angle};}).sort((a,b)=>b.z-a.z);
    ctx.globalCompositeOperation='lighter';
    for(const p of dots){ctx.globalAlpha=still?.12:.25+f.charge*.5;ctx.fillStyle=grade===3?`hsl(${p.angle*57+sec*25} 90% 78%)`:color;ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.4,p.size*p.s),0,TAU);ctx.fill();}
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    if(grade===3 && ms>=t.eclipse && ms<t.open){const r=unit*(.85+f.charge*.25);ctx.shadowColor=color;ctx.shadowBlur=still?12:40;ctx.strokeStyle='#ffe7a4';ctx.lineWidth=still?2:5;ctx.beginPath();ctx.arc(w/2,h*.47,r,0,TAU);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#030611';ctx.beginPath();ctx.arc(w/2,h*.47,r-3,0,TAU);ctx.fill();}
    // Polygon hemispheres with diffuse and specular shading, separated on opening.
    if(ms<t.silhouette){
      const faces=[], rows=18, columns=48;
      const spin=reducedMotion?0:sec*.25;
      function vertex(lat,lon){const top=lat>0;const shift=(top?1:-1)*f.opening*.85;const tilt=(top?-1:1)*f.opening*.55;let x=Math.cos(lat)*Math.cos(lon+spin),y=Math.sin(lat),z=Math.cos(lat)*Math.sin(lon+spin);return [x,y*Math.cos(tilt)-z*Math.sin(tilt)+shift,y*Math.sin(tilt)+z*Math.cos(tilt)];}
      for(let a=0;a<rows;a++)for(let b=0;b<columns;b++){
        const la=-Math.PI/2+a/rows*Math.PI, lb=la+Math.PI/rows, lo=b/columns*TAU, hi=lo+TAU/columns;
        const vs=[vertex(la,lo),vertex(lb,lo),vertex(lb,hi),vertex(la,hi)],points=vs.map(project),mid=vs.reduce((o,p)=>o.map((v,i)=>v+p[i]/4),[0,0,0]);
        const light=clamp(.45+(-mid[0]*.3+mid[1]*.5-mid[2]*.55)*.55), belt=Math.abs((la+lb)/2)<.11;
        const base=belt?[15,23,36]:(la+lb)>0?[225,49,70]:[222,235,245];
        faces.push({points,z:points.reduce((s,p)=>s+p.z,0)/4,fill:`rgb(${base.map(v=>Math.round(v*(.35+light*.7))).join(',')})`});
      }
      faces.sort((a,b)=>b.z-a.z);ctx.globalAlpha=1-f.opening*.65;
      for(const face of faces){ctx.beginPath();face.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=face.fill;ctx.fill();ctx.strokeStyle=face.fill;ctx.lineWidth=.65;ctx.stroke();}
      ctx.globalAlpha=1;
      const button=project([0,0,-1.025]);const br=unit*.12*button.s;ctx.fillStyle='#101c2c';ctx.beginPath();ctx.arc(button.x,button.y,br*1.5,0,TAU);ctx.fill();ctx.shadowBlur=18+f.charge*25;ctx.shadowColor=color;ctx.fillStyle=color;ctx.beginPath();ctx.arc(button.x,button.y,br,0,TAU);ctx.fill();ctx.shadowBlur=0;
    }
    if(f.opening>0){const burstAge=clamp((ms-t.open)/900);ctx.globalCompositeOperation='lighter';for(let j=0;j<3+grade;j++){const radius=unit*(.2+burstAge*(3+j*.55));ctx.globalAlpha=(1-burstAge)*.7;ctx.strokeStyle=grade===3?`hsl(${j*65+40} 95% 80%)`:color;ctx.lineWidth=4-j*.5;ctx.beginPath();ctx.ellipse(w/2,h*.47,radius,radius*.58,sec*.15,0,TAU);ctx.stroke();}ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';}
    if(ms>=t.silhouette){
      const glow=ctx.createRadialGradient(w/2,h*.46,0,w/2,h*.46,unit*1.7);glow.addColorStop(0,color+'99');glow.addColorStop(1,color+'00');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
      const size=Math.min(w*.6,h*.43,330)*(reducedMotion?1:.9+f.reveal*.1);
      if(portrait.complete && portrait.naturalWidth){ctx.save();ctx.imageSmoothingEnabled=false;ctx.filter=f.phase==='silhouette'?'brightness(0) drop-shadow(0 0 16px '+color+')':'drop-shadow(0 8px 22px '+color+')';ctx.drawImage(portrait,w/2-size/2,h*.45-size/2,size,size);ctx.restore();}
      ctx.textAlign='center';ctx.fillStyle=color;ctx.font=`800 ${Math.min(42,w*.09)}px system-ui`;ctx.letterSpacing='6px';ctx.fillText(['R','SR','SSR','SSR+'][grade],w/2,h*.76);ctx.letterSpacing='0px';ctx.font='500 13px system-ui';ctx.fillStyle='#f0f4ff';ctx.fillText(f.phase==='silhouette'?'새로운 인연이 깨어납니다':'당신의 모험에 함께할 새로운 친구',w/2,h*.81);
    }
    if (!reducedMotion && ms >= t.reveal && ms < t.reveal + 650) {
      const release = (ms-t.reveal)/650;
      ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=(1-release)*.65;
      for(let j=0;j<18+grade*8;j++){const angle=j/(18+grade*8)*TAU;const length=unit*(1+release*3);ctx.beginPath();ctx.moveTo(w/2+Math.cos(angle)*unit*.35,h*.45+Math.sin(angle)*unit*.35);ctx.lineTo(w/2+Math.cos(angle)*length,h*.45+Math.sin(angle)*length);ctx.strokeStyle=grade===3?`hsl(${j*31} 100% 80%)`:color;ctx.lineWidth=2+(j%3);ctx.stroke();}ctx.restore();
    }
    const flash=reducedMotion?0:Math.max(Math.max(0,1-Math.abs(ms-t.open-170)/210)*.83,Math.max(0,1-Math.abs(ms-t.reveal-60)/150)*.72);
    if(flash){ctx.fillStyle=`rgba(255,250,235,${flash})`;ctx.fillRect(0,0,w,h);}
    // Letterbox and fine vignette finish the stage without covering the controls.
    ctx.fillStyle='#02050b';ctx.fillRect(0,0,w,h*.035);ctx.fillRect(0,h*.965,w,h*.035);
    raf=requestAnimationFrame(render);
  }
  raf=requestAnimationFrame(render);
  return { skip: finish, dispose, get disposed(){return disposed;} };
}
