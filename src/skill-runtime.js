import {typeEffectiveness} from './type-matchups.js';
import skillData from './generated/skills.json' with {type:'json'};
import {resolveDamage} from './combat-stats.js';
import {executeSkill} from './skill-moves.js';

export const SKILLS=skillData.moves;
export const SKILL_ASSIGNMENTS=skillData.assignments;
const aliases={growth:'성장',coil:'똬리틀기',rockPolish:'록커트',hardening:'단단해지기',bulkUp:'벌크업',counter:'카운터',lightScreen:'빛의장벽',reflect:'리플렉터',endure:'버티기',safeguard:'신비의부적',shell:'껍질에숨기',toxicSpikes:'독압정',helpingHand:'도우미',swordsDance:'칼춤'};
const keyOf=key=>aliases[key]||key;
const finite=(v,otherwise=0)=>Number.isFinite(v)?v:otherwise;
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,finite(v)));
let nextCastId=0;
const badStatuses=['poison','burn','shock','sleep','confusion'];

export class SkillRuntime {
 constructor(battle){this.battle=battle;this.time=0;this.pending=[];this.periodic=new Map();this.context=null;this.nextUid=0;this.rng=()=>battle.rng();}
 get units(){return [...this.battle.allies,...this.battle.enemies];}
 emit(event){if(this.context)event.castId=this.context.id;this.battle.events.push(event);if(this.context&&event.targetUid)this.context.targets.add(event.targetUid);}
 init(unit,side){
  Object.assign(unit,{side,statuses:{},buffs:{},shield:0,shieldUntil:0,gauge:0,memory:{},castingUntil:0,holdUntil:0});
  unit.uid ||= `${side}-${++this.nextUid}`;unit.level ||=1;unit.skill=SKILL_ASSIGNMENTS[unit.speciesId];return unit;
 }
 alive(side){return (side==='ally'?this.battle.allies:this.battle.enemies).filter(u=>u.hp>0);}
 opponents(caster){const targets=this.alive(caster.side==='ally'?'enemy':'ally');for(let i=targets.length-1;i>0;i--){const j=Math.min(i,Math.floor((this.battle.targetRng||Math.random)()*(i+1)));[targets[i],targets[j]]=[targets[j],targets[i]];}return targets;}
 has(unit,key){key=keyOf(key);const effect=unit.statuses?.[key]||unit.buffs?.[key];return !!effect&&effect.expires>this.time;}
 getBuff(unit,key){return this.has(unit,key)?unit.buffs[keyOf(key)]:null;}
 removeStatus(unit,name){delete unit.statuses[name];}
 removeBuff(unit,key){delete unit.buffs[keyOf(key)];}
 isDisabled(unit){return unit.hp<=0||this.has(unit,'sleep')||this.has(unit,'charging')||unit.castingUntil>this.time;}
 effective(unit){
  const out={...unit},mods={};
  for(const [key,b] of Object.entries(unit.buffs||{})){
   if(!this.has(unit,key))continue;
   if(key==='껍질에숨기'&&unit.shield<=0)continue;
   const count=b.stacks?b.stacks.filter(t=>t>this.time).length:1;
   for(const [k,v] of Object.entries(b.modifiers||{}))mods[k]=(mods[k]||0)+finite(v)*count;
  }
  out.atk=Math.max(0,unit.atk*(1+(mods.atkPct||0)/100))*(this.has(unit,'burn')?1-.15*(unit.statuses.burn.data.scale??1):1);
  out.def=Math.max(0,unit.def*(1+(mods.defPct||0)/100));
  out.attackSpeed=Math.max(1,(unit.attackSpeed??100)*(1+(mods.attackSpeedPct||0)/100))*(this.has(unit,'shock')?1-.2*(unit.statuses.shock.data.scale??1):1);
  for(const k of ['penetration','damageReduction','bossDamage','skillHaste','skillAmplification','critChance','critDamage'])out[k]=finite(unit[k],k==='critChance'?5:k==='critDamage'?150:0)+(mods[k]||0);
  out.gaugeRate=Math.max(0,1+(mods.gaugeRatePct||0)/100);
  return out;
 }
 buff(target,key,duration,modifiers={},options={}){
  if(target.hp<=0||(target.side!==this.context?.caster?.side&&this.context?.immuneTargets?.has(target.uid)))return null;key=keyOf(key);
  const previous=target.buffs[key],expires=this.time+Math.max(0,duration);
  if(key==='성장')target.memory.growthHits=0;if(key==='똬리틀기'){target.memory.coilHits=0;target.memory.coilReady=false;}if(key==='록커트')target.memory.rockHits=0;
  const b={expires,modifiers:{...modifiers},data:{...options,...options.data}};
  if(options.maxStacks){b.stacks=[...(previous?.stacks||[]).filter(t=>t>this.time),expires];if(b.stacks.length>options.maxStacks)b.stacks.shift();b.expires=Math.max(...b.stacks);}
  target.buffs[key]=b;this.emit({type:"buff",uid:this.context?.caster?.uid,targetUid:target.uid,name:key});return b;
 }
 status(target,name,duration,source,options={}){
  if(target.hp<=0||this.context?.immuneTargets?.has(target.uid))return false;
  if(badStatuses.includes(name)&&this.has(target,'safeguard')){this.removeBuff(target,'safeguard');this.emit({type:'statusBlock',targetUid:target.uid});return false;}
  const previous=target.statuses[name];
  target.statuses[name]={expires:this.time+duration,source,data:{...options},duration,appliedAt:this.time,paid:0};
  if(name==='sleep'&&options.freezeGauge)target.statuses[name].data.freezeGauge=true;
  this.emit({type:'status',uid:source?.uid,targetUid:target.uid,name,duration,refresh:!!previous});return true;
 }
 charge(unit,points){if(points<0&&this.context?.immuneTargets?.has(unit.uid))return;unit.gauge=clamp(unit.gauge+points,0,100);}
 hold(unit,seconds){if(unit.side!==this.context?.caster?.side&&this.context?.immuneTargets?.has(unit.uid))return;unit.holdUntil=Math.max(unit.holdUntil||0,this.time+seconds);}
 heal(caster,target,amount,scale=1,options={}){
  if(target.hp<=0)return 0;const value=Math.max(0,amount)*scale*(options.unamplified?1:1+Math.max(0,this.effective(caster).skillAmplification)/100);
  const healed=Math.min(target.maxHp-target.hp,value);target.hp+=healed;
  if(healed>0)this.emit({type:'heal',uid:caster.uid,targetUid:target.uid,amount:healed});return healed;
 }
 shield(caster,target,amount,duration,scale=1){
  if(target.hp<=0)return 0;
  const value=Math.max(0,amount)*scale*(1+Math.max(0,this.effective(caster).skillAmplification)/100);
  target.shield=Math.max(target.shield||0,value);target.shieldUntil=Math.max(target.shieldUntil||0,this.time+duration);
  this.emit({type:'shield',uid:caster.uid,targetUid:target.uid,amount:value});return value;
 }
 recoil(unit,amount){const loss=Math.min(unit.hp,Math.max(0,finite(amount)));unit.hp-=loss;this.emit({type:'damage',uid:unit.uid,targetUid:unit.uid,damage:loss,crit:false,recoil:true,skill:false});return loss;}
 damage(caster,target,coefficient,options={}){
  if(!this.units.includes(caster))return {damage:0,crit:false};
  if((!target||target.hp<=0)&&!options.periodic&&!options.pure&&!options.counter)target=this.opponents(caster)[0];
  if(!target||target.hp<=0||!this.units.includes(target))return {damage:0,crit:false};
  const skill=options.skill!==false,a=this.effective(caster),d=this.effective(target),ctx=this.context?.caster===caster?this.context:null;
  const attackType=options.attackType||(options.basic?caster.types?.[0]:ctx?.attackType);
  const effectiveness=options.percentHp||options.pure||options.counter?1:typeEffectiveness(attackType,target.types);
  if(effectiveness===0){if(ctx){ctx.immuneTargets??=new Set();ctx.immuneTargets.add(target.uid);}this.emit({type:'immune',uid:caster.uid,targetUid:target.uid,attackType});return {damage:0,crit:false,immune:true};}
  a.penetration+=finite(options.penetration)+(skill?ctx?.penetration||0:0);a.critChance+=finite(options.critChance);
  if(options.forceCrit)a.critChance=Math.max(100,a.critChance);
  let crit=false,amount=0;
  if(options.fixed!==undefined){amount=Math.max(0,options.fixed)*(options.scale??1);if(skill&&!options.percentHp&&!options.pure)amount*=(1+Math.max(0,a.skillAmplification)/100)*(target.isBoss?1+Math.max(0,a.bossDamage)/100:1)*(ctx?.multiplier||1);if(!options.pure)amount*=1-clamp(d.damageReduction,0,100)/100;}
  else {const result=resolveDamage(a,d,{boss:!!target.isBoss,skill,coefficient:coefficient*(options.scale??1)*(skill?ctx?.multiplier||1:1),rng:this.rng});amount=result.damage;crit=result.crit;}
  if(skill&&!options.periodic&&this.has(target,'lightScreen'))amount*=1-.23*(this.getBuff(target,'lightScreen').data.scale??1);
  if(!skill&&!options.periodic&&this.has(target,'reflect'))amount*=1-.28*(this.getBuff(target,'reflect').data.scale??1);
  const harden=this.getBuff(target,'hardening');if(skill&&harden?.stacks?.length>=3){amount*=1-.35*(harden.data.scale??1);harden.stacks.shift();}
  const counter=!skill&&!options.periodic&&!options.noCounter?this.getBuff(target,'counter'):null;
  if(counter)amount*=1-.4*(counter.data.scale??1);
  amount=Math.min(Math.max(0,amount)*effectiveness,options.maxDamage??Infinity);let shieldLoss=0;
  if(target.shield>0){const multiplier=1+Math.max(0,options.shieldBonus||0)/100;shieldLoss=Math.min(target.shield,amount*multiplier);target.shield-=shieldLoss;amount=Math.max(0,amount-shieldLoss/multiplier);}
  const endure=this.getBuff(target,'endure');let endured=false;
  if(amount>=target.hp&&endure&&(target.memory.endureUses||0)<2){amount=Math.max(0,target.hp-1);target.memory.endureUses=(target.memory.endureUses||0)+1;this.removeBuff(target,'endure');endured=true;}
  const actual=Math.min(target.hp,amount);target.hp=Math.max(0,target.hp-actual);
  if(actual>0||shieldLoss>0){target.memory.rage=Math.min(5,(target.memory.rage||0)+1);const future=target.memory.futureSight;if(skill&&future&&future.caster!==caster&&future.caster?.side===caster.side)future.bonus=Math.min(.32,(future.bonus||0)+.08);}
  this.emit({type:'damage',uid:caster.uid,targetUid:target.uid,damage:actual,shieldDamage:shieldLoss,crit,skill,attackType,effectiveness,side:caster.side,basic:!!options.basic,periodic:!!options.periodic,counter:!!options.counter});
  if(endured)this.shield(target,target,target.maxHp*.15,6,endure.data.scale??1);
  if(counter){this.removeBuff(target,'counter');if(caster.hp>0)this.damage(target,caster,0,{fixed:actual*2*(counter.data.scale??1),skill:false,noCounter:true,counter:true});}
  return {damage:actual,crit,shieldDamage:shieldLoss};
 }
 execute(caster,target,attackType=this.context?.attackType){if(!target||target.hp<=0||target.isBoss||typeEffectiveness(attackType,target.types)===0)return false;const damage=target.hp;target.hp=0;target.shield=0;this.emit({type:'damage',uid:caster.uid,targetUid:target.uid,damage,crit:false,skill:true,execute:true});return true;}
 basic(caster,target){
  if(!target||target.hp<=0)target=this.opponents(caster)[0];
  if(this.isDisabled(caster)||!target||target.hp<=0)return {damage:0,crit:false};
  if(this.has(caster,'confusion')&&this.rng()<.2)return this.damage(caster,caster,.5,{skill:false,noCounter:true});
  const coil=this.getBuff(caster,'coil'),forced=!!caster.memory.coilReady;
  const ice=this.getBuff(caster,'iceShard');let multiplier=ice?.data.multiplier||caster.memory.nextBasicMultiplier||1;
  if(ice)this.removeBuff(caster,'iceShard');delete caster.memory.nextBasicMultiplier;
  const result=this.damage(caster,target,multiplier,{skill:false,basic:true,forceCrit:forced});
  if(forced)caster.memory.coilReady=false;
  if(coil&&!forced){caster.memory.coilHits=(caster.memory.coilHits||0)+1;if(caster.memory.coilHits>=4){caster.memory.coilReady=true;caster.memory.coilHits=0;}}
  const growth=this.getBuff(caster,'growth');if(growth){caster.memory.growthHits=(caster.memory.growthHits||0)+1;if(caster.memory.growthHits>=4){caster.memory.growthReady=.25*(growth.data.scale??1);caster.memory.growthHits=0;}}
  const rock=this.getBuff(caster,'rockPolish');if(rock){caster.memory.rockHits=(caster.memory.rockHits||0)+1;if(caster.memory.rockHits>=5){this.charge(caster,25*(rock.data.scale??1));caster.memory.rockHits=0;}}
  const flame=this.getBuff(caster,'flameWheel');const extra=flame?.data.coefficient||caster.memory.nextFire;
  if(extra&&target.hp>0){this.damage(caster,target,extra,{skill:false,attackType:'불꽃'});this.removeBuff(caster,'flameWheel');delete caster.memory.nextFire;}
  return result;
 }
 delay(seconds,fn,owner){const context=this.context;const callback=()=>{const previous=this.context;this.context=context;try{return fn();}finally{this.context=previous;}};const job={at:this.time+seconds,fn:callback,owner};this.pending.push(job);return job;}
 dot(caster,target,key,duration,interval,callback){
  if(this.context?.immuneTargets?.has(target.uid))return;
  const id=`${target.uid}:${key}`,context=this.context;if(context)context.targets.add(target.uid);const effect={caster,target,key,until:this.time+duration,next:this.time+interval,interval,callback:()=>{const previous=this.context;this.context=context;try{return callback();}finally{this.context=previous;}}};this.periodic.set(id,effect);return effect;
 }
 cast(unit,moveName=unit.skill,scale=1){
  if(this.isDisabled(unit)||unit.holdUntil>this.time||!SKILLS[moveName])return false;
  const previous=this.context,help=this.getBuff(unit,'helpingHand'),swords=this.getBuff(unit,'swordsDance');
  const context={id:++nextCastId,caster:unit,targets:new Set(),multiplier:1+(help?.data.damageBonus||0)/100+(unit.memory.growthReady||0),penetration:swords?.data.penetration||0};
  this.context=context;const start=this.battle.events.length,oldGauge=unit.gauge;unit.gauge=0;
  let done;
  try{done=executeSkill(this,unit,moveName,scale)!==false;}finally{this.context=previous;}
  if(!done){unit.gauge=oldGauge;return false;}
  const offensive=this.battle.events.slice(start).some(e=>e.type==='damage'&&e.uid===unit.uid&&e.targetUid!==unit.uid&&e.skill);
  // Delayed offensive skills must retain their cast-wide bonuses until resolution.
  const delayed=['땅파기','솔라빔','불새','튀어오르기','미래예지','멸망의노래'].includes(moveName);
  if(offensive||delayed||context.offensive){
   this.removeBuff(unit,'helpingHand');delete unit.memory.growthReady;
   if(swords)swords.data.penetration=0;
   const spikes=this.getBuff(unit,'toxicSpikes');if(spikes){if(this.rng()<(spikes.data.chance??.75))this.status(unit,'poison',6,spikes.data.source||unit,{scale:spikes.data.poisonScale??1});this.removeBuff(unit,'toxicSpikes');}
  }
  const targets=[...context.targets],enemyTargets=targets.filter(uid=>this.units.some(target=>target.uid===uid&&target.side!==unit.side));
  this.battle.events.splice(start,0,{type:'skill',castId:context.id,uid:unit.uid,side:unit.side,name:moveName,targetUids:targets,effectTargetUids:enemyTargets.length?enemyTargets:targets});return true;
 }
 tick(dt){
  if(!(dt>0))return;
  const before=this.time;const blocked=new Map(this.units.map(u=>[u,Math.max(before,u.holdUntil||0,this.has(u,'chargeStop')?u.buffs.chargeStop.expires:0,this.has(u,'sleep')&&u.statuses.sleep.data.freezeGauge?u.statuses.sleep.expires:0)]));this.time+=dt;
  for(const u of this.units){
   if(u.hp<=0)continue;
   const poison=u.statuses.poison;
   if(poison){const elapsed=Math.min(this.time,poison.expires)-Math.max(before,poison.appliedAt);if(elapsed>0){const total=u.maxHp*(u.isBoss?.01:.05)*(poison.data.scale??1);const damage=Math.min(total-poison.paid,total*elapsed/poison.duration);poison.paid+=damage;this.damage(poison.source||u,u,0,{fixed:damage,pure:true,skill:false,noCounter:true,periodic:true});}}
   for(const [key,s] of Object.entries(u.statuses)){if(s.expires<=this.time){delete u.statuses[key];if(key==='sleep'&&s.data.cleanseOnEnd)for(const bad of ['poison','burn','shock','confusion'])delete u.statuses[bad];}}
   for(const [key,b] of Object.entries(u.buffs)){if(b.stacks)b.stacks=b.stacks.filter(t=>t>this.time);if(b.expires<=this.time||b.stacks?.length===0){delete u.buffs[key];if(key==='성장')u.memory.growthHits=0;if(key==='똬리틀기'){u.memory.coilHits=0;u.memory.coilReady=false;}if(key==='록커트')u.memory.rockHits=0;}}
   if(u.shieldUntil<=this.time)u.shield=0;
  }
  for(const [id,e] of this.periodic){
   if(e.target.hp<=0){this.periodic.delete(id);continue;}
   while(e.next<=this.time+1e-9&&e.next<=e.until+1e-9){e.callback();e.next+=e.interval;if(e.target.hp<=0)break;}
   if(e.next>e.until||e.target.hp<=0)this.periodic.delete(id);
  }
  const due=this.pending.filter(j=>j.at<=this.time);this.pending=this.pending.filter(j=>j.at>this.time);
  for(const j of due)if(!j.owner||j.owner.hp>0)j.fn();
  for(const u of this.units){
   if(u.hp<=0)continue;const skill=SKILLS[u.skill];if(!skill)continue;
   const freeze=this.has(u,'chargeStop')||u.holdUntil>this.time||(this.has(u,'sleep')&&u.statuses.sleep.data.freezeGauge);
   if(!freeze){const st=this.effective(u);this.charge(u,Math.max(0,this.time-blocked.get(u))/skill.seconds*100*Math.max(0,1+st.skillHaste/100)*st.gaugeRate);}
   if(u.gauge>=100&&!this.isDisabled(u))this.cast(u);
  }
 }
}
