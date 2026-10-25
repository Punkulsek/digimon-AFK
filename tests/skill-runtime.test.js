import test from 'node:test';import assert from 'node:assert/strict';
import {SkillRuntime} from '../src/skill-runtime.js';
const unit=(uid,speciesId=4)=>({uid,speciesId,level:20,hp:10000,maxHp:10000,atk:100,def:0,attackSpeed:100,penetration:0,damageReduction:0,bossDamage:0,skillHaste:0,skillAmplification:0,critChance:0,critDamage:150});
function arena(){const a=unit('a'),b=unit('b');const battle={allies:[a],enemies:[b],events:[],rng:()=>.99};const r=new SkillRuntime(battle);r.init(a,'ally');r.init(b,'enemy');a.skill=b.skill=null;return {r,a,b,battle};}
test('poison total budget, refresh, boss cap and final tick are independent of reflect',()=>{
 const {r,a,b}=arena();r.buff(b,'리플렉터',10,{});r.status(b,'poison',6,a);for(let i=0;i<60;i++)r.tick(.1);assert.ok(Math.abs(b.hp-9500)<1e-6);
 b.hp=b.maxHp;b.isBoss=true;r.status(b,'poison',6,a);r.tick(6);assert.equal(b.hp,9900);
 b.hp=b.maxHp;b.isBoss=false;r.status(b,'poison',6,a);r.tick(2);r.status(b,'poison',6,a);assert.equal(Object.keys(b.statuses).length,1);r.tick(6);assert.ok(Math.abs(b.hp-(10000-500/3-500))<1e-6);
});
test('sleep stops basic and casting; only explicit freeze stops gauge; haste is timed',()=>{
 const {r,a,b}=arena();a.skill='불꽃세례';r.status(a,'sleep',3,b);r.tick(2);assert.ok(Math.abs(a.gauge-200/9)<1e-8);assert.equal(r.basic(a,b).damage,0);
 a.gauge=0;r.status(a,'sleep',3,b,{freezeGauge:true});r.tick(3);assert.equal(a.gauge,0);r.tick(1);assert.ok(Math.abs(a.gauge-100/9)<1e-8);
 a.gauge=0;a.skillHaste=100;r.tick(1);assert.ok(Math.abs(a.gauge-200/9)<1e-8);
});
test('buffs expire without mutating base stats, stacks expire individually, no shield means no shell defense',()=>{
 const {r,a}=arena();r.buff(a,'성장',2,{atkPct:25});assert.equal(r.effective(a).atk,125);r.tick(2);assert.equal(r.effective(a).atk,100);assert.equal(a.atk,100);
 a.def=100;r.buff(a,'단단해지기',2,{defPct:25},{maxStacks:3});r.tick(1);r.buff(a,'단단해지기',2,{defPct:25},{maxStacks:3});assert.equal(r.effective(a).def,150);r.tick(1);assert.equal(r.effective(a).def,125);
 r.buff(a,'껍질에숨기',7,{defPct:25});assert.equal(r.effective(a).def,125);r.shield(a,a,100,7);assert.equal(r.effective(a).def,150);
});
test('damage shields absorb boosted shield damage only; reduction and support amplification apply once',()=>{
 const {r,a,b}=arena();b.shield=100;b.shieldUntil=10;b.damageReduction=20;
 const out=r.damage(a,b,2,{shieldBonus:100});assert.equal(out.damage,110);assert.equal(b.shield,0);assert.equal(b.hp,9890);
 a.skillAmplification=50;a.hp=9000;assert.equal(r.heal(a,a,100),150);assert.equal(r.heal(a,a,100,1,{unamplified:true}),100);assert.equal(r.shield(a,a,100,4),150);
});
test('counter only reflects once, endure has two uses per fight, guard blocks one status',()=>{
 const {r,a,b}=arena();r.buff(b,'카운터',6,{});const hit=r.basic(a,b);assert.equal(hit.damage,60);assert.equal(a.hp,9880);assert.equal(r.has(b,'카운터'),false);
 for(let n=0;n<3;n++){b.hp=10;b.shield=0;r.buff(b,'버티기',6,{});r.damage(a,b,10);assert.equal(b.hp,n<2?1:0);}
 a.hp=10000;r.buff(a,'신비의부적',7,{});assert.equal(r.status(a,'burn',5,b),false);assert.equal(r.status(a,'burn',5,b),true);
});
test('delayed and periodic skill damage retains consumed next-skill buff context',()=>{
 const {r,a,b}=arena();r.buff(a,'도우미',8,{}, {data:{damageBonus:45}});a.gauge=100;r.cast(a,'땅파기');assert.equal(r.has(a,'도우미'),false);assert.equal(b.hp,10000);r.tick(1);assert.equal(b.hp,9507);
 r.buff(a,'도우미',8,{}, {data:{damageBonus:45}});b.hp=10000;r.cast(a,'불꽃회오리');r.tick(6);assert.equal(b.hp,9623);
});
test('basic-triggered growth, coil and rock polish apply only during their buffs',()=>{
 const {r,a,b}=arena();r.buff(a,'성장',9,{}, {data:{scale:1}});r.buff(a,'똬리틀기',8,{});r.buff(a,'록커트',8,{});
 for(let i=0;i<4;i++)r.basic(a,b);assert.equal(a.memory.growthReady,.25);assert.equal(a.memory.coilReady,true);const hit=r.basic(a,b);assert.equal(hit.crit,true);assert.equal(a.gauge,25);
});
