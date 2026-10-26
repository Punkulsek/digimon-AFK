import sources from './generated/effect-sheets.json' with {type:'json'};
import {skillChoreography} from './skill-choreography.js';

// Original sheets are decoded once, then their animation frames are played in order.
// All choreography below is authored for this game's 5-v-5 field, not an emulator.
const sheets=new Map(),stages=new WeakMap(),activeStages=new Set(),motions=new WeakMap();
const PI=Math.PI,TAU=PI*2,clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>1-(1-clamp(n))**3;
function prepareSheets(){for(const asset of sources.assets){if(sheets.has(asset.name))continue;const entry={frames:[],asset};sheets.set(asset.name,entry);const image=new Image();image.onload=()=>{const size=Math.min(asset.width,asset.height,32),cols=asset.width/size,rows=asset.height/size;for(let n=0;n<cols*rows;n++){const frame=document.createElement('canvas');frame.width=frame.height=size;const ctx=frame.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,(n%cols)*size,Math.floor(n/cols)*size,size,size,0,0,size,size);const pixels=ctx.getImageData(0,0,size,size),d=pixels.data,[r,g,b]=asset.paletteZero;for(let i=0;i<d.length;i+=4)if(d[i]===r&&d[i+1]===g&&d[i+2]===b)d[i+3]=0;ctx.putImageData(pixels,0,0);entry.frames.push(frame);}};image.src=globalThis.POKEMON_EFFECTS?.[asset.name]||`/effects/${asset.path}`;}}
function sprite(ctx,name,x,y,size,t,rotation=0,alpha=1){const f=sheets.get(name)?.frames;if(!f?.length)return;ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,y);ctx.rotate(rotation);ctx.imageSmoothingEnabled=false;ctx.drawImage(f[Math.floor(Math.max(0,t)/95)%f.length],-size/2,-size/2,size,size);ctx.restore();}
function ring(c,x,y,r,color,alpha=1,sy=1,width=2){if(r<=0||alpha<=0)return;c.save();c.globalAlpha*=alpha;c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.ellipse(x,y,r,r*sy,0,0,TAU);c.stroke();c.restore();}
function glow(c,x,y,r,color,alpha=1){if(r<=0)return;c.save();c.globalAlpha*=alpha;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'#ffffff');g.addColorStop(.18,color);g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();}
function dot(c,x,y,size,color,alpha=1){c.save();c.globalAlpha*=alpha;c.fillStyle=color;c.fillRect(Math.round(x-size/2),Math.round(y-size/2),size,size);c.restore();}
function path(c,points,color,width=2,alpha=1){c.save();c.globalAlpha*=alpha;c.strokeStyle=color;c.lineWidth=width;c.lineJoin='miter';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();c.restore();}
function star(c,x,y,r,color,alpha=1,rotation=0){c.save();c.translate(x,y);c.rotate(rotation);c.globalAlpha*=alpha;c.fillStyle=color;c.beginPath();for(let i=0;i<8;i++){const a=i*PI/4,rr=i%2?r*.25:r;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}c.closePath();c.fill();c.restore();}
function polygon(c,x,y,r,n,color,alpha,rotation=0){const points=Array.from({length:n+1},(_,i)=>[x+Math.cos(i*TAU/n+rotation)*r,y+Math.sin(i*TAU/n+rotation)*r]);path(c,points,color,3,alpha);}
function curve(a,b,p,bend=40){return {x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p-Math.sin(p*PI)*bend};}
function spray(c,x,y,t,color,seed=0,n=18,size=4){for(let i=0;i<n;i++){const a=i*2.399+seed*.01,r=(15+(i%5)*8)*ease(t),gravity=t*t*25;dot(c,x+Math.cos(a)*r,y+Math.sin(a)*r+gravity,size*(1-t*.5),i%3?'#fff5cc':color,1-t);}}
function bolt(c,x,y,t,color,size=90){const pts=[];for(let i=0;i<7;i++)pts.push([x+(i===6?0:Math.sin(i*12.9+Math.floor(t*9))*13),y-size+i*size/6]);path(c,pts,color,7,.75);path(c,pts,'#fffde0',2,1);}
function flame(c,x,y,r,t,alpha=1){c.save();c.globalAlpha*=alpha;glow(c,x,y,r*1.6,'#ff7b24',.55);c.fillStyle='#ff792c';c.beginPath();c.moveTo(x-r*.7,y+r*.5);c.quadraticCurveTo(x-r,y-r*.1,x-r*.25,y-r*1.8);c.quadraticCurveTo(x+r*.15,y-r*.2,x+r*.45,y-r);c.quadraticCurveTo(x+r*1.1,y+r*.5,x,y+r*.7);c.closePath();c.fill();star(c,x,y,r*.65,'#fff6b1',1,t);sprite(c,'blue_flames',x,y-r*.2,r*1.2,t,0,.35);c.restore();}
function impact(c,x,y,p,kind,color,time,size,variant){
 const fade=1-clamp(p),r=size*(.35+ease(p)*.8);if(fade<=0)return;
 if(['ember','inferno','ghostfire','dragon'].includes(kind)){
  ring(c,x,y+size*.25,r,color,fade,.32,3);for(let i=0;i<5;i++)flame(c,x+(i-2)*size*.24,y-(i%2)*size*.2,size*(kind==='inferno'?.45:.3),time+i*80,fade);
  spray(c,x,y,p,color,variant,20,4);
 }else if(kind==='thunder'){
  const flash=.45+.55*Math.abs(Math.sin(p*PI*5));glow(c,x,y,size*.85,color,fade*.6);bolt(c,x,y,p,color,size*1.9);ring(c,x,y,r,color,fade,.45);for(let i=0;i<5;i++)sprite(c,'spark_0',x+Math.cos(i*1.26)*r,y+Math.sin(i*1.26)*r*.6,24,time+i*60,0,fade*flash);
 }else if(kind==='water'){
  ring(c,x,y+18,r,color,fade,.35,4);sprite(c,'water_impact',x,y,size*1.7,time,0,fade);for(let i=0;i<12;i++){const a=i*PI/6;dot(c,x+Math.cos(a)*r,y+Math.sin(a)*r*.7+20*p*p,5,i%2?color:'#e4fbff',fade);}
 }else if(kind==='ice'){
  ring(c,x,y+20,r,color,fade,.35);for(let i=0;i<9;i++)sprite(c,'ice_crystals_0',x+Math.cos(i)*r*.7,y+Math.sin(i)*r*.5,size*.55,time,i*.5,fade);star(c,x,y,size*.85,'#fff',fade,time*.001);
 }else if(kind==='earth'){
  for(let i=0;i<6;i++){const a=i*TAU/6;path(c,[[x,y],[x+Math.cos(a)*r*.6,y+Math.sin(a)*r*.25],[x+Math.cos(a+.2)*r,y+Math.sin(a+.2)*r*.35]],'#5c4131',3,fade);dot(c,x+Math.cos(a)*r*.7,y-Math.sin(p*PI)*size*.6+Math.sin(a)*20,12,color,fade);}ring(c,x,y+10,r*1.2,color,fade,.3,4);
 }else if(kind==='venom'){
  glow(c,x,y+15,size,color,fade*.25);ring(c,x,y+20,r,color,fade,.3,4);for(let i=0;i<6;i++)sprite(c,'poison_bubble',x+(i-2.5)*13,y-p*size-(i%3)*10,25+(i%2)*8,time+i*50,0,fade);
 }else if(['seed','leaf'].includes(kind)){
  for(let i=0;i<8;i++){const a=i*TAU/8+p*2; sprite(c,'razor_leaf',x+Math.cos(a)*r*.8,y+Math.sin(a)*r*.5,25,time,i+p*3,fade);}if(kind==='seed'){path(c,[[x-20,y+20],[x-15,y-5],[x,y-10],[x+15,y+10]],'#4baf66',4,fade);sprite(c,'green_sparkle',x,y-20,size,time,0,fade);}ring(c,x,y+15,r,color,fade,.3);
 }else if(['heal','drain','boost','copy'].includes(kind)){
  ring(c,x,y+25,r,color,fade,.35,3);for(let i=0;i<7;i++){const yy=y+30-p*size*1.4-(i%3)*15,xx=x+Math.sin(i*2.3)*size*.65;sprite(c,'green_sparkle',xx,yy,20,time+i*50,0,fade);if(kind==='heal'){path(c,[[xx-5,yy],[xx+5,yy]],color,3,fade);path(c,[[xx,yy-5],[xx,yy+5]],color,3,fade);}else path(c,[[xx-5,yy+4],[xx,yy-3],[xx+5,yy+4]],color,2,fade);}glow(c,x,y,size,color,fade*.18);
 }else if(kind==='shield'){
  const rr=size*(.8+.05*Math.sin(time*.01));polygon(c,x,y,rr,6,color,fade,PI/6);polygon(c,x,y,rr*.85,6,'#e8fcff',fade*.6,PI/6);glow(c,x,y,rr,color,fade*.2);for(let i=0;i<6;i++)star(c,x+Math.cos(i*TAU/6+PI/6)*rr,y+Math.sin(i*TAU/6+PI/6)*rr,5,'#fff',fade);
 }else if(['song','kiss','sleep'].includes(kind)){
  for(let i=0;i<4;i++){const xx=x+Math.sin(i*1.6+p*3)*size*.6,yy=y-p*size-i*8;sprite(c,kind==='kiss'?'magenta_heart':'music_notes',xx,yy,28,time+i*100,Math.sin(time*.003)*.2,fade);}ring(c,x,y,r,color,fade,.65);
 }else if(kind==='web'){
  for(let i=0;i<8;i++){const a=i*TAU/8;path(c,[[x,y],[x+Math.cos(a)*r,y+Math.sin(a)*r]],color,1,fade);}for(let i=1;i<4;i++)polygon(c,x,y,r*i/3,8,color,fade*.8);
 }else if(kind==='psychic'){
  for(let i=0;i<3;i++)ring(c,x,y,r*(.7+i*.15),i%2?color:'#fff',fade*.8,.4+i*.2,2);star(c,x,y,size*.8,color,fade,time*.002);glow(c,x,y,size*1.2,color,fade*.3);
 }else if(kind==='explosion'){
  glow(c,x,y,r*1.6,color,fade*.8);ring(c,x,y,r*1.5,'#fff6b2',fade,.8,5);spray(c,x,y,p,color,variant,28,7);sprite(c,'hit',x,y,size*2,time,0,fade);
 }else if(kind==='star'){
  for(let i=0;i<5;i++)star(c,x+Math.cos(i*1.25)*r,y+Math.sin(i*1.25)*r*.6,12,color,fade,time*.002);sprite(c,'hit',x,y,size,time,0,fade*.6);
 }else{
  const slashes=kind==='slash'?3:1;for(let i=0;i<slashes;i++){const offset=(i-1)*12;c.save();c.globalAlpha=fade;c.translate(x+offset,y+offset);c.rotate(-.7+(variant%2)*1.4);c.fillStyle='#fff9d5';c.beginPath();c.moveTo(-size*.7,-6);c.quadraticCurveTo(0,-22,size*.8,0);c.quadraticCurveTo(0,4,-size*.7,-6);c.fill();c.restore();}sprite(c,'hit',x,y,size*1.4,time,0,fade);spray(c,x,y,p,color,variant,14,3);
 }
}
function spellTravel(c,cast,t){
 const {profile:p,origin:a,targets}=cast;const progress=clamp((t-p.windup)/p.travel),size=cast.size;
 if(t<p.windup||t>p.impact+150)return;
 for(const [j,b] of targets.entries()){
  const bend=(p.recipe==='water'?20:p.recipe==='seed'?65:35)*cast.scale;
  if(['thunder','earth','psychic','shield','heal','boost','explosion'].includes(p.recipe)){
   for(let k=0;k<3;k++)ring(c,b.x,b.y,Math.max(2,size*(1-progress)*(1+k*.4)),p.color,.5,.6);continue;
  }
  if(['brawl','slash','rush'].includes(p.recipe)){
   const dir=b.x>a.x?1:-1;for(let k=0;k<4;k++)path(c,[[b.x-dir*(size+40)*(1-progress)-k*6,b.y-12+k*8],[b.x-dir*size*(1-progress)-k*6,b.y-12+k*8]],p.color,2,.65);continue;
  }
  const n=p.recipe==='water'&&p.name==='하이드로캐논'?7:p.heavy?6:4;
  for(let i=0;i<n;i++){
   const q=clamp(progress*1.3-i*.09),pos=curve(a,b,q,bend+(i%2)*14);if(q<=0||q>=1)continue;
   const sz=size*(p.recipe==='water'?.22:.18)+(i===0?6:0);
   if(['ember','inferno','ghostfire','dragon'].includes(p.recipe))flame(c,pos.x,pos.y,sz,t+i*90);
   else if(p.recipe==='water'){glow(c,pos.x,pos.y,sz*1.6,p.color,.4);ring(c,pos.x,pos.y,sz,p.color,1,.8,3);dot(c,pos.x-3,pos.y-4,4,'#fff');}
   else if(p.recipe==='ice')sprite(c,'ice_crystals_0',pos.x,pos.y,sz*2,t+i*90,-PI/4);
   else if(p.recipe==='venom')sprite(c,'poison_bubble',pos.x,pos.y,sz*2,t+i*70);
   else if(p.recipe==='seed')dot(c,pos.x,pos.y,sz*.7,i%2?'#e9e3a3':'#6c9a46');
   else if(p.recipe==='leaf')sprite(c,'razor_leaf',pos.x,pos.y,sz*2,t,progress*6+i);
   else if(p.recipe==='song'||p.recipe==='kiss'||p.recipe==='sleep')sprite(c,p.recipe==='kiss'?'magenta_heart':'music_notes',pos.x,pos.y,sz*2,t+i*95,Math.sin(t*.008)*.2);
   else star(c,pos.x,pos.y,sz,p.color,1,t*.002);
  }
 }
}
function frameCast(c,cast,t){
 const {origin:a,profile:p,size,targets}=cast;const charge=clamp(t/p.windup);
 if(t<p.windup+180){
  const alpha=t<p.windup?(.25+charge*.65):1-(t-p.windup)/180;
  ring(c,a.x,a.y+size*.5,size*(.65+charge*.2),p.color,alpha,.3,2);
  ring(c,a.x,a.y+size*.5,size*(1.1-charge*.25),p.color,alpha*.6,.3,1);
  glow(c,a.x,a.y,size*(.65+charge*.2),p.color,alpha*.2);
  for(let i=0;i<12;i++){const angle=i*TAU/12+t*.003,r=size*(1.3-charge*.85),xx=a.x+Math.cos(angle)*r,yy=a.y+Math.sin(angle)*r*.65-charge*12;dot(c,xx,yy,i%3?3:5,i%3?p.color:'#fff',alpha);}
  if(p.recipe==='thunder')sprite(c,'spark_0',a.x,a.y-size*.2,size*.6,t,0,alpha);
  if(p.recipe==='shield')polygon(c,a.x,a.y,size*.7,6,p.color,alpha*.7,t*.001);
  if(p.recipe==='boost')for(let i=0;i<3;i++)path(c,[[a.x-10,a.y+20-i*15-charge*15],[a.x,a.y+10-i*15-charge*15],[a.x+10,a.y+20-i*15-charge*15]],p.color,3,alpha);
 }
 if(t>=p.windup&&t<p.windup+160)star(c,a.x,a.y,size*.7,'#fffbd8',1-(t-p.windup)/160);
 spellTravel(c,cast,t);
 if(t>=p.impact){
  const duration=p.duration-p.impact;
  for(const [i,b] of targets.entries()){
   const local=t-p.impact-i*65;if(local<0)continue;
   const hits=p.count;for(let h=0;h<hits;h++){const hitTime=local-h*135;if(hitTime<0)continue;const pp=clamp(hitTime/(duration-h*80));impact(c,b.x+(h?Math.sin(h*3)*12:0),b.y,pp,p.recipe,p.color,hitTime,size*(p.heavy?1.35:1),p.seed+h);}
   if(p.recipe==='drain'){const q=clamp(local/750),pos=curve(b,a,q,40);for(let k=0;k<3;k++)glow(c,pos.x+k*8,pos.y-k*6,7,p.color,1-q);}
  }
 }
}
function point(el,field){const image=el.querySelector('.pokemon-art img')||el.querySelector('.pokemon-art')||el,r=image.getBoundingClientRect();return {x:r.left-field.left+r.width/2,y:r.top-field.top+r.height*.55};}
function moveActor(actor,p,sign,reduced,scale,distance){const image=actor.querySelector('.pokemon-art img');if(!image||reduced)return;motions.get(image)?.cancel();const melee=['slash','brawl','rush'].includes(p.recipe),jump=p.name==='튀어오르기';const x=melee?Math.min(100,Math.max(30,distance*.55))/scale:10;const animation=image.animate([{transform:'translate(0,0)',filter:'brightness(1)'},{transform:`translate(${-sign*5*scale}px,${jump?-18*scale:2}px)`,filter:`brightness(1.15) drop-shadow(0 0 5px ${p.color})`,offset:p.windup/p.duration},{transform:`translate(${sign*x*scale}px,${jump?-5:0}px)`,filter:`brightness(1.35) drop-shadow(0 0 8px ${p.color})`,offset:p.impact/p.duration},{transform:'translate(0,0)',filter:'brightness(1)',offset:Math.min(.98,(p.impact+250)/p.duration)},{transform:'translate(0,0)',filter:'brightness(1)'}],{duration:p.duration,easing:'ease-out'});motions.set(image,animation);return animation;}
function createStage(layer,field){
 const canvas=document.createElement('canvas');canvas.className='skill-vfx-canvas';canvas.setAttribute('aria-hidden','true');layer.append(canvas);
 const ctx=canvas.getContext('2d'),stage={canvas,ctx,layer,field,casts:[],raf:0};stages.set(layer,stage);activeStages.add(stage);
 stage.clear=()=>{cancelAnimationFrame(stage.raf);for(const cast of stage.casts){cast.label.remove();cast.motion?.cancel();cast.cancelled=true;}stage.casts=[];canvas.remove();stages.delete(layer);activeStages.delete(stage);};
 stage.draw=now=>{
  if(!layer.isConnected||document.hidden){stage.clear();return;}
  const rect=field.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5),w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);
  for(const cast of stage.casts){if(cast.cancelled)continue;cast.targets=cast.targetUids.map(cast.find).filter(el=>el&&!el.classList.contains('fainted')).map(el=>point(el,cast.fieldElement.getBoundingClientRect()));const t=Math.max(0,now-cast.start),p=cast.profile;
   cast.label.dataset.phase=t<p.windup?'charge':t<p.impact?'release':'impact';
   if(t>=p.windup&&!cast.released){cast.released=true;cast.onPhase?.('release',p);}
   if(t>=p.impact&&!cast.impacted){cast.impacted=true;cast.onPhase?.('impact',p);for(const callback of cast.callbacks)callback();cast.callbacks=[];}
   cast.label.style.opacity=String(Math.min(1,t/100)*clamp((p.duration-t)/300));
   if(cast.reduced){for(const b of cast.targets)ring(ctx,b.x,b.y,cast.size*.7,p.color,.3,.8);}
   else frameCast(ctx,cast,t);
  }
  stage.casts=stage.casts.filter(cast=>{if(now-cast.start>=cast.profile.duration||cast.cancelled){cast.label.remove();return false;}return true;});
  if(stage.casts.length)stage.raf=requestAnimationFrame(stage.draw);else stage.clear();
 };
 return stage;
}
export function clearSkillEffects(){for(const stage of [...activeStages])stage.clear();}
if(typeof document!=='undefined'){document.addEventListener('visibilitychange',()=>{if(document.hidden)clearSkillEffects();});window.addEventListener('resize',clearSkillEffects);}
export function playSkillEffect(event,find,layer,fieldElement,reduced=false,options={}){
 const actor=find(event.uid);if(!actor||!layer||!fieldElement)return null;prepareSheets();
 const field=fieldElement.getBoundingClientRect(),origin=point(actor,field),profile=skillChoreography(event.name,options.speed||1);
 let targets=(event.effectTargetUids||event.targetUids||[]).map(find).filter(Boolean);if(!targets.length)targets=[actor];
 const points=targets.map(el=>point(el,field)),scale=Math.max(.55,Math.min(1,field.height/700)),size=(profile.heavy?60:50)*scale;
 if(reduced){profile.windup=100;profile.travel=100;profile.impact=200;profile.duration=600;}
 const hud=fieldElement.querySelector('.stage-hud')?.getBoundingClientRect();
 const underHud=hud&&origin.x+field.left>=hud.left-50&&origin.x+field.left<=hud.right+50;
 const labelTop=Math.max(8,origin.y-size-22,underHud?hud.bottom-field.top+4:0);
 const label=document.createElement('span');label.className='skill-cast-name skill-vfx-label';label.textContent=event.name;label.dataset.recipe=profile.recipe;label.dataset.phase='charge';label.style.cssText=`left:${origin.x}px;top:${labelTop}px;--skill-color:${profile.color}`;layer.append(label);
 const cast={profile,origin,targetUids:targets.map(el=>el.dataset.unitId),find,fieldElement,targets:points,start:performance.now(),size,scale,label,reduced,callbacks:[],onPhase:options.onPhase};
 cast.motion=moveActor(actor,profile,points[0].x>=origin.x?1:-1,reduced,scale,Math.abs(points[0].x-origin.x));
 let stage=stages.get(layer);if(!stage)stage=createStage(layer,fieldElement);
 if(stage.casts.length>=12){const old=stage.casts.shift();old.label.remove();old.motion?.cancel();old.cancelled=true;old.callbacks=[];}
 stage.casts.push(cast);if(!stage.raf)stage.raf=requestAnimationFrame(stage.draw);
 options.onPhase?.('charge',profile);
 return {retarget(uid){if(!cast.targetUids.includes(uid))cast.targetUids.push(uid);},impactDelay:profile.impact,duration:profile.duration,get cancelled(){return !!cast.cancelled;},onImpact(fn){if(cast.cancelled)return;if(cast.impacted)fn();else cast.callbacks.push(fn);},cancel(){cast.cancelled=true;cast.motion?.cancel();cast.label.remove();}};
}
