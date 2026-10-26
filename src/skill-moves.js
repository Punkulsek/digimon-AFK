import skillData from './generated/skills.json' with {type:'json'};

// One handler per common move. Species assignment never changes a move's mechanics.
const handlers={};
const alive=u=>u&&u.hp>0;
const ratio=u=>u.hp/u.maxHp;
const excludedCopies=new Set(['변신','손가락흔들기','땅가르기','뿔드릴','멸망의노래']);
function context(engine,caster,scale,name){
 const enemies=engine.opponents(caster).filter(alive),allies=engine.alive(caster.side);
 return {e:engine,c:caster,s:scale,type:skillData.moves[name].type,enemies,allies,t:enemies[0],
  atk:()=>engine.effective(caster).atk,
  hit:(t,k,o={})=>engine.damage(caster,t,k,{scale,attackType:skillData.moves[name].type,...o}),
  status:(t,key,seconds,chance=1)=>alive(t)&&!engine.context?.immuneTargets?.has(t.uid)&&engine.rng()<Math.min(1,chance*scale+(caster.statusChance||0)/100)?engine.status(t,key,seconds,caster,{scale}):false,
  buff:(t,key,seconds,mods={},data={})=>engine.buff(t,key,seconds,Object.fromEntries(Object.entries(mods).map(([k,v])=>[k,v*scale])),{data:{scale,...data}}),
  heal:(t,n)=>engine.heal(caster,t,n,scale),
  shield:(t,n,seconds)=>engine.shield(caster,t,n,seconds,scale),
  lowest:(n)=>[...allies].sort((a,b)=>ratio(a)-ratio(b)).slice(0,n),
  highest:(units,stat)=>[...units].sort((a,b)=>engine.effective(b)[stat]-engine.effective(a)[stat])[0],
 };
}
function single(name,fn){handlers[name]=x=>{if(!x.t)return false;x.e.context?.targets.add(x.t.uid);return fn(x,x.t);};}
function area(name,n,fn){handlers[name]=x=>{if(!x.t)return false;for(const [i,t] of x.enemies.slice(0,n).entries()){x.e.context?.targets.add(t.uid);fn(x,t,i);}};}
function periodic(x,t,name,seconds,k){x.e.dot(x.c,t,name,seconds,2,()=>x.hit(t,k));}
function drain(x,t,k,p){const out=x.hit(t,k);x.heal(x.c,out.damage*p);return out;}
function charged(x,seconds,fn){x.c.castingUntil=x.e.time+seconds;const release=()=>{if(!alive(x.c))return;if(x.e.has(x.c,'sleep')){x.c.castingUntil=x.e.time+.05;x.e.delay(.05,release,x.c);return;}fn();};x.e.delay(seconds,release,x.c);}
function recoil(x,n){return x.e.recoil(x.c,n*x.s);}
function statusBonus(x,t,key,k,extra,chance,duration){const before=x.e.has(t,key);x.hit(t,k);if(before)x.hit(t,extra);x.status(t,key,duration,chance);}

single('불꽃세례',(x,t)=>statusBonus(x,t,'burn',1.7,.7,.55,5));
area('불꽃회오리',3,(x,t)=>{x.hit(t,1.4);periodic(x,t,'불꽃회오리',6,.4);});
handlers['오버히트']=x=>{x.enemies.slice(0,3).forEach((t,i)=>x.hit(t,i?1.9:4.3));x.buff(x.c,'오버히트',6,{atkPct:-20});};
handlers['하이드로캐논']=x=>{x.enemies.slice(0,3).forEach((t,i)=>x.hit(t,i?1.9:4.5,{shieldBonus:80*x.s}));x.e.hold(x.c,3);};
single('독침',(x,t)=>{x.hit(t,1.2);x.status(t,'poison',6,.7);});
single('더블니들',(x,t)=>{x.hit(t,1.2);x.status(t,'poison',6,.4);x.hit(t,x.e.has(t,'poison')?1.8:1.2);x.status(t,'poison',6,.4);});
area('바람일으키기',3,(x,t)=>{x.hit(t,1.3);x.buff(t,'바람일으키기',4,{attackSpeedPct:-10});});
single('날개치기',(x,t)=>{x.hit(t,2.3);x.buff(x.c,'날개치기',6,{attackSpeedPct:20});});
area('폭풍',3,(x,t)=>{x.hit(t,2.45*(x.e.has(t,'confusion')?1.25:1));x.status(t,'confusion',5,.6);});
single('전광석화',(x,t)=>{x.hit(t,1.45);if(alive(t)){const a=x.e.basic(x.c,t);if(a?.crit)x.e.charge(x.c,15*x.s);}});
single('필살앞니',(x,t)=>x.hit(t,t.hp*.25/Math.max(1,x.atk()),{maxDamage:t.isBoss?x.atk()*3.5*x.s:Infinity}));
single('마구찌르기',(x,t)=>{const n=2+Math.floor(x.e.rng()*4);for(let i=0;i<n;i++)x.hit(t,.8);});
single('회전부리',(x,t)=>{for(let i=0;i<4;i++)x.hit(t,1.1,{penetration:(i+1)*5*x.s});x.hit(t,1,{penetration:20*x.s});});
area('10만볼트',3,(x,t,i)=>{x.hit(t,i?1.75:2.9);x.status(t,'shock',6,.55);});
area('모래지옥',3,(x,t)=>{x.hit(t,1.1);periodic(x,t,'모래지옥',6,.45);x.buff(t,'모래지옥',6,{attackSpeedPct:-12});});
single('베어가르기',(x,t)=>{const out=x.hit(t,3.9,{critChance:(30+(x.c.memory.slashBonus||0))*x.s});x.c.memory.slashBonus=out.crit?0:Math.min(30,(x.c.memory.slashBonus||0)+15);});
area('대지의힘',3,(x,t)=>{x.hit(t,2.4);x.buff(t,'대지의힘',7,{defPct:-18});});
single('두번치기',(x,t)=>{const first=x.hit(t,1.05);x.hit(t,1.05*(first.crit?1.6:1));});
single('독찌르기',(x,t)=>{x.hit(t,2.6,{penetration:x.e.has(t,'poison')?25*x.s:0});x.status(t,'poison',7,.7);});
area('지진',5,(x,t)=>x.hit(t,2.35*(Object.entries(t.buffs).some(([key,b])=>x.e.has(t,key)&&(b.modifiers.defPct||0)<0)?1.25:1)));
area('열풍',5,(x,t)=>{x.hit(t,2.35*(x.e.has(t,'burn')?1.25:1));x.status(t,'burn',7,.65);});
single('흡혈',(x,t)=>drain(x,t,2.1,.45));
area('에어커터',3,(x,t)=>x.hit(t,1.95,{critChance:20*x.s}));
single('흡수',(x,t)=>drain(x,t,1.6,.35));
handlers['꽃잎댄스']=x=>{const targets=x.enemies.slice(0,5);for(let i=0;i<3;i++)targets.forEach(t=>x.hit(t,1.15));x.status(x.c,'confusion',4);};
single('기가드레인',(x,t)=>drain(x,t,3.3,.5));
single('땅파기',(x,t)=>charged(x,1,()=>x.hit(t,3.4,{penetration:20*x.s})));
single('땅가르기',(x,t)=>{if(!t.isBoss&&ratio(t)<=.18)x.e.execute(x.c,t,x.type);else x.hit(t,4.1,{penetration:t.isBoss?35*x.s:0});});
single('속이기',(x,t)=>{const first=!x.c.memory.fakeOutUsed;x.c.memory.fakeOutUsed=true;x.hit(t,first?3.1:2.1);if(first)x.e.hold(t,2);});
single('염동력',(x,t)=>{x.hit(t,2);x.status(t,'confusion',5,.5);});
area('사이코키네시스',3,(x,t)=>{x.hit(t,2.3);if(x.e.rng()<.6*x.s)x.buff(t,'사이코키네시스',6,{defPct:-15});});
single('분노',(x,t)=>{x.hit(t,2*(1+(x.c.memory.rage||0)*.18));x.c.memory.rage=0;});
single('인파이트',(x,t)=>{x.hit(t,4.8,{penetration:25*x.s});x.buff(x.c,'인파이트',6,{defPct:-20});});
single('불꽃엄니',(x,t)=>statusBonus(x,t,'burn',2.4,.85,.65,6));
handlers['신속']=x=>{let bonus=1;for(const t of [...x.enemies].sort((a,b)=>a.hp-b.hp).slice(0,3)){x.hit(t,1.85*bonus);bonus=t.hp===0?1.35:1;}};
single('물대포',(x,t)=>{x.hit(t,1.85);x.buff(t,'물대포',5,{attackSpeedPct:-10});});
area('버블광선',3,(x,t)=>{x.hit(t,1.6);x.buff(t,'버블광선',6,{attackSpeedPct:-20});});
single('폭발펀치',(x,t)=>{x.hit(t,4);x.status(t,'confusion',6);x.buff(x.c,'폭발펀치',2,{attackSpeedPct:-15});});
area('미래예지',3,(x,t)=>{const mark={caster:x.c,bonus:0};t.memory.futureSight=mark;x.e.delay(3,()=>{if(t.memory.futureSight!==mark)return;delete t.memory.futureSight;if(alive(t))x.hit(t,3.5*(1+mark.bonus));},t);});
single('태권당수',(x,t)=>x.hit(t,2.45,{critChance:25*x.s}));
single('크로스촙',(x,t)=>{const first=x.hit(t,2.05,{critChance:20*x.s});x.hit(t,2.05,{critChance:20*x.s,penetration:first.crit?35*x.s:0});});
single('덩굴채찍',(x,t)=>{x.hit(t,1.9);x.buff(t,'덩굴채찍',5,{defPct:-12});});
single('파워휩',(x,t)=>x.hit(t,4.3*(x.e.has(t,'poison')?1.3:1)));
area('용해액',3,(x,t)=>{x.hit(t,1.45);x.buff(t,'용해액',6,{defPct:-12});});
area('오물웨이브',5,(x,t)=>{x.hit(t,1.85);x.status(t,'poison',7,.6);});
single('돌떨구기',(x,t)=>{x.hit(t,2.35);x.buff(t,'돌떨구기',5,{attackSpeedPct:-15});});
single('불꽃바퀴',(x,t)=>{x.hit(t,2.15);x.status(t,'burn',5,.55);x.buff(x.c,'flameWheel',Infinity,{}, {coefficient:.8*x.s});});
area('트라이어택',3,(x,t)=>{x.hit(t,2);const key=['burn','shock','confusion'][Math.floor(x.e.rng()*3)];x.status(t,key,6,.7);});
single('얼음뭉치',(x,t)=>{x.hit(t,1.9);x.buff(t,'얼음뭉치',5,{attackSpeedPct:-12});x.buff(x.c,'iceShard',Infinity,{}, {multiplier:1+.5*x.s});});
area('오로라빔',3,(x,t)=>{x.hit(t,1.8);if(x.e.rng()<.65*x.s)x.buff(t,'오로라빔',6,{atkPct:-20});});
area('오물폭탄',3,(x,t,i)=>{x.hit(t,i?1.55:3.2);x.status(t,'poison',7,.7);});
single('고드름침',(x,t)=>{const n=3+Math.floor(x.e.rng()*3);for(let i=0;i<n;i++)x.hit(t,.95);});
handlers['꿈먹기']=x=>{const target=x.enemies.find(t=>x.e.has(t,'sleep'));if(!target)return false;drain(x,target,5,.45);};
single('조이기',(x,t)=>{x.hit(t,1.5);periodic(x,t,'조이기',6,.55);x.buff(t,'조이기',6,{attackSpeedPct:-15});});
single('찝기',(x,t)=>x.hit(t,2.8,{shieldBonus:60*x.s}));
single('집게해머',(x,t)=>{const out=x.hit(t,4.2,{critChance:30*x.s});if(out.crit)x.buff(t,'집게해머',6,{defPct:-20});});
area('소닉붐',3,(x,t)=>x.hit(t,0,{fixed:x.c.level*10+50}));
handlers['대폭발']=x=>{if(ratio(x.c)<=.2)return false;x.enemies.slice(0,5).forEach(t=>x.hit(t,4.4));recoil(x,x.c.hp*.6);x.e.hold(x.c,4);};
area('씨폭탄',3,(x,t)=>{x.hit(t,1.8);x.c.memory.seedBomb??={};const count=(x.c.memory.seedBomb[t.uid]||0)+1;x.c.memory.seedBomb[t.uid]=count%3;if(count%3===0)x.hit(t,1.2);});
handlers['솔라빔']=x=>{const targets=x.enemies.slice(0,3);targets.forEach(t=>x.e.context?.targets.add(t.uid));charged(x,2,()=>targets.forEach((t,i)=>x.hit(t,i?1.9:4.7)));};
single('뼈다귀치기',(x,t)=>{x.hit(t,2.8);x.e.charge(t,-15*x.s);});
single('뼈다귀부메랑',(x,t)=>{x.hit(t,1.8);x.buff(t,'뼈다귀부메랑',6,{defPct:-15});x.hit(t,1.8);});
single('무릎차기',(x,t)=>{x.hit(t,4.8);const spent=recoil(x,x.c.maxHp*.12);if(t.hp===0)x.e.heal(x.c,x.c,spent*.5,1,{unamplified:true});});
single('마하펀치',(x,t)=>{let crit=0;for(let i=0;i<3;i++)if(x.hit(t,1.1).crit)crit++;if(crit>=2)x.buff(x.c,'마하펀치',6,{attackSpeedPct:18});});
single('핥기',(x,t)=>{x.hit(t,2.1);if(x.status(t,'shock',5,.55))x.e.charge(t,-15*x.s);});
area('스모그',3,(x,t)=>{x.hit(t,1.25);x.status(t,'poison',6,.65);});
single('뿔찌르기',(x,t)=>x.hit(t,3,{penetration:20*x.s}));
handlers['암석포']=x=>{x.enemies.slice(0,3).forEach((t,i)=>x.hit(t,i?1.85:4.9));x.e.hold(x.c,3);};
area('용의숨결',3,(x,t)=>{x.hit(t,1.85);x.status(t,'shock',5,.55);});
single('폭포오르기',(x,t)=>{x.hit(t,2.8);x.e.charge(t,-15*x.s);});
single('뿔드릴',(x,t)=>{if(!t.isBoss&&ratio(t)<=.2)x.e.execute(x.c,t,x.type);else x.hit(t,4.2,{penetration:t.isBoss?35*x.s:0});});
handlers['스피드스타']=x=>{x.enemies.slice(0,3).forEach(t=>x.hit(t,1.75));x.buff(x.c,'스피드스타',6,{skillHaste:12});};
single('시저크로스',(x,t)=>{x.hit(t,2.1);x.hit(t,2.1*(ratio(t)<=.4?1.4:1));});
single('번개펀치',(x,t)=>statusBonus(x,t,'shock',3.25,.9,.6,6));
single('불꽃펀치',(x,t)=>statusBonus(x,t,'burn',3.3,1.1,.7,6));
handlers['난동부리기']=x=>{const targets=x.enemies.slice(0,3);for(let i=0;i<2;i++)targets.forEach(t=>x.hit(t,2.3));x.status(x.c,'confusion',4);};
single('플레어드라이브',(x,t)=>{x.hit(t,5.1);x.status(t,'burn',7);recoil(x,x.c.maxHp*.15);});
handlers['원시의힘']=x=>{x.enemies.slice(0,3).forEach(t=>x.hit(t,1.9));if(x.e.rng()<.3*x.s)x.buff(x.c,'원시의힘',8,{atkPct:20,defPct:20,attackSpeedPct:20});};
single('불새',(x,t)=>{x.buff(x.c,'불새',1.5,{defPct:-15});charged(x,1.5,()=>x.hit(t,5.5,{critChance:25*x.s}));});
area('눈보라',5,(x,t)=>{x.hit(t,2.25);x.buff(t,'눈보라',6,{attackSpeedPct:-20});});
handlers['방전']=x=>{let successes=0;for(const t of x.enemies.slice(0,5)){x.hit(t,2.15);if(x.status(t,'shock',6,.55))successes++;}x.e.charge(x.c,Math.min(20,successes*4)*x.s);};
single('용의분노',(x,t)=>x.hit(t,0,{fixed:x.c.level*13+60}));
handlers['역린']=x=>{const targets=x.enemies.slice(0,3);for(let i=0;i<2;i++)targets.forEach(t=>x.hit(t,1.65));if(targets[0])x.hit(targets[0],2.1);x.status(x.c,'confusion',4);};
handlers['사이코브레이크']=x=>{const target=x.highest(x.enemies,'atk');if(target)x.hit(target,5.7*(target.isBoss?1.2:1),{penetration:50*x.s});};

// Support / control moves.
single('씨뿌리기',(x,t)=>x.e.dot(x.c,t,'씨뿌리기',8,2,()=>{const out=x.hit(t,0,{fixed:t.maxHp*.0125,percentHp:true});x.heal(x.c,out.damage);}));
handlers['성장']=x=>x.buff(x.c,'성장',9,{atkPct:25,skillAmplification:20});
handlers['아로마테라피']=x=>{for(const a of x.allies)for(const k of ['poison','burn','shock','confusion'])x.e.removeStatus(a,k);x.lowest(3).forEach(a=>x.heal(a,x.atk()*1.6));};
handlers['껍질에숨기']=x=>{x.shield(x.c,x.c.maxHp*.16,7);x.buff(x.c,'껍질에숨기',7,{defPct:25});};
handlers['철벽']=x=>x.buff(x.c,'철벽',8,{defPct:40,damageReduction:8});
area('실뿜기',3,(x,t)=>{x.hit(t,.6);x.buff(t,'실뿜기',6,{attackSpeedPct:-22,gaugeRatePct:-10});});
handlers['단단해지기']=x=>x.e.buff(x.c,'단단해지기',12,{defPct:25*x.s},{maxStacks:3,data:{scale:x.s}});
handlers['나비춤']=x=>{const targets=[x.c,...x.allies.filter(a=>a!==x.c&&a.types?.includes('벌레')).slice(0,2)];for(const a of targets)x.buff(a,'나비춤',9,{attackSpeedPct:20,skillHaste:20,skillAmplification:20});};
handlers['뱀눈초리']=x=>{const t=x.highest(x.enemies,'atk');if(t){x.status(t,'shock',7);x.e.charge(t,-20*x.s);}};
handlers['똬리틀기']=x=>x.buff(x.c,'똬리틀기',8,{atkPct:25,defPct:25});
handlers['독압정']=x=>x.enemies.slice(0,5).forEach(t=>x.buff(t,'독압정',8,{}, {source:x.c,chance:.75*x.s,poisonScale:x.s}));
handlers['손가락흔들기']=x=>{const names=Object.keys(handlers).filter(n=>!excludedCopies.has(n));const name=names[Math.floor(x.e.rng()*names.length)];return executeSkill(x.e,x.c,name,x.s*.85);};
handlers['달빛']=x=>x.lowest(3).forEach(a=>x.heal(a,a.maxHp*.23*(ratio(a)<=.3?1.4:1)));
area('도깨비불',3,(x,t)=>x.status(t,'burn',7,.75));
area('노래하기',3,(x,t)=>x.status(t,'sleep',3,.65));
handlers['도우미']=x=>{const target=x.highest(x.allies.filter(a=>a!==x.c),'atk')||x.c;x.buff(target,'도우미',8,{}, {damageBonus:45*x.s});};
area('독가루',3,(x,t)=>x.status(t,'poison',7,.8));
handlers['버섯포자']=x=>{const t=x.highest(x.enemies,'atk');if(t&&x.status(t,'sleep',3,.9))x.e.status(t,'sleep',3,x.c,{freezeGauge:true,scale:x.s});};
area('초음파',3,(x,t)=>x.status(t,'confusion',6,.7));
handlers['명상']=x=>x.buff(x.c,'명상',8,{skillAmplification:30,damageReduction:12});
handlers['벌크업']=x=>x.e.buff(x.c,'벌크업',10,{atkPct:20*x.s,defPct:20*x.s},{maxStacks:3,data:{scale:x.s}});
handlers['록커트']=x=>x.buff(x.c,'록커트',8,{attackSpeedPct:35});
handlers['고속이동']=x=>{const other=x.highest(x.allies.filter(a=>a!==x.c),'attackSpeed');for(const a of [x.c,other].filter(Boolean))x.buff(a,'고속이동',8,{attackSpeedPct:30,skillHaste:15});};
handlers['하품']=x=>{const t=x.highest(x.enemies,'atk');if(!t)return;const mark={};t.memory.yawn=mark;x.e.delay(2,()=>{if(t.memory.yawn===mark){delete t.memory.yawn;x.status(t,'sleep',3);}},t);};
handlers['게으름피우기']=x=>{const low=ratio(x.c)<=.35;x.heal(x.c,x.c.maxHp*.4);if(low)x.buff(x.c,'게으름피우기',6,{damageReduction:15});};
area('전기자석파',3,(x,t)=>{if(x.status(t,'shock',6,.75))x.e.charge(t,-10*x.s);});
handlers['칼춤']=x=>[...x.allies].sort((a,b)=>x.e.effective(b).atk-x.e.effective(a).atk).slice(0,2).forEach(a=>x.buff(a,'칼춤',9,{atkPct:30,critDamage:20},{penetration:15*x.s}));
area('독가스',3,(x,t)=>{x.status(t,'poison',7,.8);if(x.e.has(t,'poison'))x.buff(t,'독가스',5,{attackSpeedPct:-10});});
handlers['최면술']=x=>{const t=[...x.enemies].sort((a,b)=>b.gauge-a.gauge)[0];if(t&&x.status(t,'sleep',3,.8))x.e.status(t,'sleep',3,x.c,{freezeGauge:true,scale:x.s});};
single('저주',(x,t)=>{recoil(x,x.c.maxHp*.2);x.e.dot(x.c,t,'저주',8,2,()=>x.hit(t,0,{fixed:t.maxHp*(t.isBoss?.0025:.01),percentHp:true}));});
handlers['흑안개']=x=>{for(const t of x.enemies){const buffs=Object.entries(t.buffs).filter(([,b])=>['atkPct','defPct','attackSpeedPct','skillHaste'].some(k=>(b.modifiers?.[k]||0)>0));for(const [key] of buffs.slice(0,2))x.e.removeBuff(t,key);}};
handlers['알낳기']=x=>x.lowest(2).forEach(a=>{const low=ratio(a)<=.25;x.heal(a,a.maxHp*.3);if(low)x.shield(a,a.maxHp*.1,8);});
handlers['뿌리박기']=x=>{x.e.dot(x.c,x.c,'뿌리박기',8,2,()=>x.heal(x.c,x.c.maxHp*.07));x.buff(x.c,'뿌리박기',8,{damageReduction:15});};
handlers['카운터']=x=>x.buff(x.c,'카운터',6,{}, {reduction:40*x.s,reflection:2*x.s});
handlers['빛의장벽']=x=>x.allies.forEach(a=>x.buff(a,'빛의장벽',8,{}, {reduction:23*x.s}));
handlers['리플렉터']=x=>x.allies.forEach(a=>x.buff(a,'리플렉터',8,{}, {reduction:28*x.s}));
area('악마의키스',3,(x,t)=>x.status(t,'sleep',3,.65));
single('튀어오르기',(x,t)=>charged(x,1,()=>x.hit(t,.6)));
handlers['용의춤']=x=>{x.buff(x.c,'용의춤',9,{atkPct:30,attackSpeedPct:20});const other=x.highest(x.allies.filter(a=>a!==x.c&&a.types?.includes('드래곤')),'atk');if(other)x.buff(other,'용의춤',9,{atkPct:20,attackSpeedPct:15});};
area('멸망의노래',3,(x,t)=>{const mark={};t.memory.perish=mark;x.e.delay(8,()=>{if(t.memory.perish!==mark)return;delete t.memory.perish;if(!alive(t))return;if(!t.isBoss&&ratio(t)<=.2)x.e.execute(x.c,t,x.type);else x.hit(t,3.6);},t);});
handlers['변신']=x=>{const targets=x.allies.filter(a=>a!==x.c&&!excludedCopies.has(skillData.assignments[a.speciesId]));if(!targets.length)return false;const target=targets[Math.floor(x.e.rng()*targets.length)];return executeSkill(x.e,x.c,skillData.assignments[target.speciesId],x.s*.75);};
handlers['바톤터치']=x=>{const target=x.highest(x.allies.filter(a=>a!==x.c),'atk');if(!target)return false;const entry=Object.entries(x.c.buffs).find(([key,b])=>Object.values(b.modifiers||{}).some(v=>v>0)&&!['독압정','toxicSpikes'].includes(key));if(!entry){x.e.charge(target,25*x.s);return;}const [key,b]=entry;const mods=Object.fromEntries(Object.entries(b.modifiers||{}).map(([k,v])=>[k,v*x.s]));x.e.buff(target,key,Math.max(0,b.expires-x.e.time),mods,{data:{...b.data}});};
handlers['아쿠아링']=x=>x.lowest(3).forEach(a=>x.e.dot(x.c,a,'아쿠아링',8,2,()=>x.heal(a,x.atk()*.7)));
handlers['껍질깨기']=x=>x.buff(x.c,'껍질깨기',9,{atkPct:55,attackSpeedPct:35,skillAmplification:25,defPct:-30});
handlers['버티기']=x=>{if((x.c.memory.endureUses||0)>=2)return false;x.buff(x.c,'버티기',6,{}, {shieldRatio:.15*x.s});};
handlers['잠자기']=x=>{x.status(x.c,'sleep',2.5);x.heal(x.c,x.c.maxHp*.5);x.e.delay(2.5,()=>{for(const key of ['poison','burn','shock','confusion'])x.e.removeStatus(x.c,key);},x.c);};
handlers['신비의부적']=x=>{for(const a of x.allies){for(const key of Object.keys(a.statuses))x.e.removeStatus(a,key);x.buff(a,'신비의부적',7,{}, {charges:1});}};

const attackNames=Object.keys(skillData.moves).slice(0,Object.keys(skillData.moves).indexOf('씨뿌리기'));
const offensiveNames=new Set([...attackNames,'씨뿌리기','실뿜기','저주','튀어오르기','멸망의노래']);
export const HANDLED_MOVES=Object.freeze(Object.keys(handlers));
export function executeSkill(engine,caster,name,scale=1){
 const handler=handlers[name];if(!handler)throw new Error(`Unknown skill: ${name}`);
 if(!alive(caster))return false;
 if(engine.context&&offensiveNames.has(name))engine.context.offensive=true;
 const previous=engine.context?.attackType;if(engine.context)engine.context.attackType=skillData.moves[name].type;
 try{return handler(context(engine,caster,scale,name));}finally{if(engine.context)engine.context.attackType=previous;}
}
