import {typeEffectiveness} from '../src/type-matchups.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {pokemonStats,criticalStats,resolveDamage,skillCharge,skillSupport,STAT_FIELDS} from '../src/combat-stats.js';
import {initialState,Battle,load,save,stats} from '../src/game.js';
test('eleven stats derive from species and growth, upgrade once, legacy save retained',()=>{
 const state=initialState(),p=state.inventory[0],base=stats(p,state);
 assert.equal(STAT_FIELDS.length,11);assert.equal(base.critChance,5);assert.equal(base.critDamage,150);
 assert.equal(base.hp,72);assert.equal(base.atk,14);assert.equal(base.def,49);
 assert.ok(stats({...p,level:40},state).atk>base.atk);assert.ok(stats({...p,speciesId:3},state).atk>base.atk);assert.ok(stats({...p,breakthrough:10},state).hp>base.hp);
 state.upgrades.atk=10;assert.equal(stats(p,state).atk,Math.round(base.atk*1.05));
 const store=new Map(),storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};save(storage,state);assert.deepEqual(load(storage).state,state);
});
test('critical chance boundaries and overflow add to existing bonus for basic and skill damage',()=>{
 for(const [chance,damage] of [[100,150],[120,160],[150,175],[200,200]]){
  const a={atk:100,critChance:chance,critDamage:150};assert.deepEqual(criticalStats(a),{chance:100,damage});
  assert.equal(resolveDamage(a,{def:0},{rng:()=>.999}).damage,damage);
  assert.equal(resolveDamage(a,{def:0},{skill:true,rng:()=>.999}).damage,damage);
 }
 assert.equal(criticalStats({critChance:120,critDamage:180}).damage,190);
 assert.equal(resolveDamage({atk:100,critChance:5,critDamage:150},{},{rng:()=>.049}).damage,150);
 assert.equal(resolveDamage({atk:100,critChance:5,critDamage:150},{},{rng:()=>.05}).damage,100);
});
test('ordered penetration, boss, skill, critical and final reduction apply exactly once',()=>{
 const a={atk:100,penetration:50,bossDamage:20,skillAmplification:50,critChance:100,critDamage:150};
 assert.equal(resolveDamage(a,{def:400,damageReduction:20},{boss:true,skill:true}).damage,144);
 assert.equal(resolveDamage({...a,penetration:1000},{def:400,damageReduction:1000}).damage,0);
 assert.equal(skillCharge(10,{skillHaste:50}),15);assert.equal(skillSupport(100,{skillAmplification:30}),130);
});
test('battle timers honor attack speed and damage stats in real combat',()=>{
 function run(speed){const s=initialState();s.party=[s.party[0]];const b=new Battle(s,null,()=>.99);b.enemies.forEach(e=>{e.hp=e.maxHp=1e9;e.atk=0;e.skill=null;});b.allies[0].attackSpeed=speed;b.allies[0].skill=null;let count=0;for(let i=0;i<200;i++)count+=b.tick(.1).filter(e=>e.basic&&e.side==='ally').length;return count;}
 assert.ok(run(200)>run(100)*1.8);
 const b=new Battle(initialState(),null,()=>.99);b.allies[0].critChance=200;b.allies[0].penetration=100;b.allies[0].attackProgress=1;b.enemy.hp=1e6;
 const e=b.tick(.1).find(e=>e.basic&&e.side==='ally');assert.equal(e.crit,true);assert.equal(e.damage,b.allies[0].atk*2*typeEffectiveness(b.allies[0].types[0],b.enemies.find(t=>t.uid===e.targetUid).types));
});
