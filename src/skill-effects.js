const colors={fire:'#ff963e',water:'#74dcff',electric:'#ffe36a',grass:'#a5f279',ice:'#b9f4ff',poison:'#e0a0ff',psychic:'#ed99ff',physical:'#fff1b0',heal:'#86ffc0',shield:'#90daff',song:'#b8a0ff',kiss:'#ff9fce'};
function theme(name){
 if(name==='악마의키스')return 'kiss';if(/노래|초음파|하품|최면/.test(name))return 'song';
 if(/회복|달빛|알낳기|아쿠아링|아로마|흡수|드레인|흡혈|뿌리박기|잠자기|게으름/.test(name))return 'heal';
 if(/장벽|리플렉터|철벽|껍질에|버티기|신비/.test(name))return 'shield';
 if(/불|열풍|오버히트|플레어/.test(name))return 'fire';if(/물|하이드로|버블|폭포|찝기|집게/.test(name))return 'water';
 if(/번개|볼트|방전|전기|소닉/.test(name))return 'electric';if(/얼음|고드름|눈보라|오로라/.test(name))return 'ice';
 if(/독|오물|스모그|용해/.test(name))return 'poison';if(/씨|꽃|잎|풀|덩굴|파워휩|솔라|성장/.test(name))return 'grass';
 if(/사이코|염동|미래|저주|꿈|흑안개|명상/.test(name))return 'psychic';return 'physical';
}
const sheets={fire:'blue_flames',water:'water_impact',electric:'spark_0',grass:'razor_leaf',ice:'ice_crystals_0',poison:'poison_bubble',psychic:'green_sparkle',physical:'hit',heal:'green_sparkle',shield:'green_sparkle',song:'music_notes',kiss:'magenta_heart'};
// Original GBA indexed graphics are rendered via color-keyed canvases (index 0),
// preserving source PNGs byte-for-byte. No sprite frames are resampled offline.
const cache=new Map();
function sprite(name){if(!cache.has(name)){const img=new Image();img.src=globalThis.POKEMON_EFFECTS?.[name]||`/effects/${name}.png`;cache.set(name,img);}return cache.get(name);}
function spot(el,field){const r=el.getBoundingClientRect();return {x:r.left-field.left+r.width/2,y:r.top-field.top+r.height/2};}
function animateNode(node,frames,timing){const options={...timing,duration:timing.duration*1.8};node.animate(frames,options).onfinish=()=>node.remove();setTimeout(()=>node.remove(),options.duration+(options.delay||0)+200);}
function burst(layer,x,y,kind,reduced){
 const color=colors[kind],ring=document.createElement('span');ring.className=`skill-impact skill-impact-${kind}`;ring.style.cssText=`left:${x}px;top:${y}px;--skill-color:${color}`;layer.append(ring);
 animateNode(ring,[{transform:'translate(-50%,-50%) scale(.35)',opacity:.95},{transform:`translate(-50%,-50%) scale(${reduced?1:1.5})`,opacity:0}],{duration:reduced?200:650,easing:'ease-out'});
 if(reduced)return;
 const img=sprite(sheets[kind]);
 for(let n=0;n<5;n++){
  const p=document.createElement('canvas');p.width=p.height=64;p.className='skill-pixel';p.style.cssText=`left:${x}px;top:${y}px;--skill-color:${color}`;
  const draw=()=>{const ctx=p.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;const size=Math.min(img.naturalWidth,img.naturalHeight,64);const cols=Math.floor(img.naturalWidth/size),rows=Math.floor(img.naturalHeight/size),frame=n%(cols*rows);ctx.drawImage(img,(frame%cols)*size,Math.floor(frame/cols)*size,size,size,0,0,64,64);try{const pixels=ctx.getImageData(0,0,64,64),d=pixels.data,r=d[0],g=d[1],b=d[2];for(let i=0;i<d.length;i+=4)if(d[i]===r&&d[i+1]===g&&d[i+2]===b)d[i+3]=0;ctx.putImageData(pixels,0,0);}catch{}};
  if(img.complete&&img.naturalWidth)draw();else img.addEventListener('load',draw,{once:true});layer.append(p);
  const angle=n*Math.PI*2/5,dx=Math.cos(angle)*45,dy=Math.sin(angle)*35-12;
  animateNode(p,[{transform:'translate(-50%,-50%) scale(.35)',opacity:0},{opacity:1,offset:.2},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.7)`,opacity:0}],{duration:550+n*40,delay:n*20,easing:'ease-out'});
 }
 if(kind==='song'||kind==='kiss'){
  const symbol=document.createElement('span');symbol.className='skill-symbol';symbol.textContent=kind==='kiss'?'♥':'♪';symbol.style.cssText=`left:${x}px;top:${y}px;color:${color}`;layer.append(symbol);animateNode(symbol,[{transform:'translate(-50%,0)',opacity:1},{transform:'translate(-50%,-65px)',opacity:0}],{duration:850});
 }
}
export function playSkillEffect(event,find,layer,fieldElement,reduced=false){
 const actor=find(event.uid);if(!actor||!layer||!fieldElement)return;
 const field=fieldElement.getBoundingClientRect(),start=spot(actor,field),kind=theme(event.name),color=colors[kind];
 const label=document.createElement('span');label.className='skill-cast-name';label.textContent=event.name;label.style.cssText=`left:${start.x}px;top:${start.y-40}px;--skill-color:${color}`;layer.append(label);animateNode(label,[{transform:'translate(-50%,5px)',opacity:0},{opacity:1,offset:.15},{opacity:1,offset:.75},{transform:'translate(-50%,-18px)',opacity:0}],{duration:1100});
 const targets=(event.targetUids||[]).map(find).filter(Boolean);if(!targets.length)targets.push(actor);
 for(const target of targets){const end=spot(target,field);
  burst(layer,end.x,end.y,kind,reduced);
 }
}
