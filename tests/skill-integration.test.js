import test from 'node:test';
import assert from 'node:assert/strict';
import {Battle,initialState} from '../src/game.js';
import {SkillRuntime} from '../src/skill-runtime.js';
import {SKILLS,POKEMON_SKILLS,skillForSpecies} from '../src/skills.js';
import {HANDLED_MOVES} from '../src/skill-moves.js';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);
function fixture(count=5){
 const unit=(id,index)=>({uid:`${id}-${index}`,speciesId:id,level:10,hp:100000,maxHp:100000,atk:100,def:0,attackSpeed:100,penetration:0,damageReduction:0,bossDamage:0,skillHaste:0,skillAmplification:0,critChance:0,critDamage:150});
 const battle={allies:[unit(4,0)],enemies:Array.from({length:count},(_,i)=>unit(19,i)),events:[],rng:()=>.99};
 const runtime=new SkillRuntime(battle);battle.allies.forEach(u=>{runtime.init(u,'ally');u.skill=null;});battle.enemies.forEach(u=>{runtime.init(u,'enemy');u.skill=null;});return {battle,runtime,caster:battle.allies[0],targets:battle.enemies};
}
test('catalog covers 151 species and all 131 shared definitions',()=>{
 assert.equal(Object.keys(POKEMON_SKILLS).length,151);assert.equal(Object.keys(SKILLS).length,131);
 assert.deepEqual(new Set(HANDLED_MOVES),new Set(Object.keys(SKILLS)));
 for(let id=1;id<=151;id++){const skill=skillForSpecies(id);assert.ok(skill);assert.ok(skill.seconds>0);assert.equal(skill.name,POKEMON_SKILLS[id]);}
 assert.equal(skillForSpecies(25),skillForSpecies(26));assert.equal(skillForSpecies(25),skillForSpecies(135));
});
test('AoE retains per-target coefficient when opponents are missing',()=>{
 const many=fixture(5),one=fixture(1);many.runtime.cast(many.caster,'지진');one.runtime.cast(one.caster,'지진');
 const expected=235;for(const t of many.targets)near(t.maxHp-t.hp,expected);near(one.targets[0].maxHp-one.targets[0].hp,expected);
 const medium=fixture(5);medium.runtime.cast(medium.caster,'에어커터');assert.equal(medium.targets.filter(t=>t.hp<t.maxHp).length,3);
});
test('sleep blocks basics and casts while ordinary sleep still charges; dream eater holds gauge',()=>{
 const {runtime,caster,targets}=fixture();caster.skill='불꽃세례';caster.gauge=100;
 assert.equal(runtime.cast(caster,'꿈먹기'),false);assert.equal(caster.gauge,100);
 caster.gauge=0;runtime.status(caster,'sleep',3,targets[0]);const hp=targets[0].hp;
 runtime.basic(caster,targets[0]);assert.equal(runtime.cast(caster,'불꽃세례'),false);runtime.tick(1);assert.equal(targets[0].hp,hp);near(caster.gauge,100/9);
 runtime.removeStatus(caster,'sleep');runtime.status(caster,'sleep',3,targets[0],{freezeGauge:true});const gauge=caster.gauge;runtime.tick(1);near(caster.gauge,gauge);
});
test('nonstacking poison pays exactly total 5 percent, or 1 percent on bosses; curse has separate boss cap',()=>{
 for(const boss of [false,true]){const {runtime,caster,targets}=fixture(1),target=targets[0];target.isBoss=boss;
 runtime.status(target,'poison',6,caster);for(let i=0;i<60;i++)runtime.tick(.1);near(target.maxHp-target.hp,target.maxHp*(boss?.01:.05));}
 const {runtime,caster,targets}=fixture(1),target=targets[0];target.isBoss=true;runtime.status(target,'burn',6,caster);runtime.status(target,'burn',6,caster);near(runtime.effective(target).atk,85);
 runtime.cast(caster,'저주');for(let i=0;i<80;i++)runtime.tick(.1);near(target.maxHp-target.hp,target.maxHp*.01);
});
test('execute skills never instant-kill bosses; copied moves exclude executes and recursive copying',()=>{
 const {runtime,caster,targets}=fixture(1),target=targets[0];target.isBoss=true;target.hp=target.maxHp*.1;
 runtime.cast(caster,'땅가르기');assert.ok(target.hp>0);near(target.maxHp*.1-target.hp,410);
 const ally={...caster,uid:'copy-ally',speciesId:51};runtime.init(ally,'ally');runtime.battle.allies.push(ally);caster.speciesId=132;caster.gauge=100;
 assert.equal(runtime.cast(caster,'변신'),false);assert.equal(caster.gauge,100);
 ally.speciesId=35;assert.equal(runtime.cast(caster,'변신'),false);
 ally.speciesId=132;assert.equal(runtime.cast(caster,'변신'),false);
});
test('shared basic and skill damage applies critical overflow and defense/penetration identically',()=>{
 const {runtime,caster,targets}=fixture(1),t=targets[0];caster.critChance=120;caster.critDamage=180;caster.penetration=50;t.def=400;
 const basic=runtime.damage(caster,t,1,{skill:false}),skill=runtime.damage(caster,t,1,{skill:true});assert.equal(basic.crit,true);assert.equal(skill.crit,true);assert.equal(basic.damage,127);assert.equal(skill.damage,127);
});

test('Battle starts five versus five and gauge uses seconds independent of party count',()=>{
 function simulate(size){const s=initialState();s.party=s.party.slice(0,size);s.inventory[0].speciesId=4;const b=new Battle(s,null,()=>.99);assert.equal(b.enemies.length,5);b.allies.forEach(u=>u.hp=u.maxHp=1e7);b.enemies.forEach(u=>{u.hp=u.maxHp=1e7;u.atk=0;});for(let i=0;i<10;i++)b.tick(.1);return b.allies[0].gauge;}
 const full=simulate(5),solo=simulate(1);assert.ok(full>0);near(full,solo);
});
test('AoE defeat credits each enemy once and advances one wave, without charging new units retroactively',()=>{
 const s=initialState(),b=new Battle(s,null,()=>.99),runtime=b.runtime;
 const killed=b.enemies.slice();b.allies[0].atk=100000;b.enemies.forEach(u=>u.hp=1);
 runtime.cast(b.allies[0],'지진');b.tick(.1);assert.equal(s.totalKills,5);assert.equal(s.kills,1);assert.equal(s.stage,1);assert.ok(killed.every(u=>u.hp===0));assert.ok(b.enemies.every(u=>!killed.includes(u)));
 const gold=s.gold;b.tick(.1);assert.equal(s.totalKills,5);assert.equal(s.kills,1);assert.equal(s.gold,gold);
});
