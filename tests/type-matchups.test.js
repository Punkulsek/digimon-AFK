import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {TYPES,TYPE_CHART,typeEffectiveness as mult} from '../src/type-matchups.js';
import {SKILLS} from '../src/skills.js';import {SkillRuntime} from '../src/skill-runtime.js';
function arena(types=[['노말']]){const make=(uid,types)=>({uid,types,speciesId:4,level:20,hp:100000,maxHp:100000,atk:100,def:0,attackSpeed:100,critChance:0,critDamage:150});const a=make('a',['불꽃','비행']),enemies=types.map((t,i)=>make('e'+i,t)),b={allies:[a],enemies,events:[],rng:()=>0,targetRng:()=>.999};const r=new SkillRuntime(b);r.init(a,'ally');enemies.forEach(e=>r.init(e,'enemy'));r.units.forEach(u=>u.skill=null);return {r,a,enemies,b};}
test('all 324 matchups match the PokeAPI official-game data snapshot',()=>{
 const ids=['','노말','격투','비행','독','땅','바위','벌레','고스트','강철','불꽃','물','풀','전기','에스퍼','얼음','드래곤','악','페어리'];let count=0;
 for(const line of readFileSync(new URL('./fixtures/type-efficacy.csv',import.meta.url),'utf8').trim().split('\n').slice(1)){const [a,d,n]=line.split(',').map(Number);if(a<=18&&d<=18){assert.equal(TYPE_CHART[ids[a]][ids[d]],n/100,`${ids[a]} -> ${ids[d]}`);count++;}}
 assert.equal(count,324);for(const move of Object.values(SKILLS))assert.ok(TYPES.includes(move.type),move.name);
});
test('dual weaknesses, resistance and immunity multiply without STAB',()=>{
 for(const [a,d,n] of [['전기',['물','비행'],4],['바위',['불꽃','비행'],4],['풀',['풀','독'],.25],['땅',['노말','비행'],0],['고스트',['노말'],0],['전기',['물','땅'],0]])assert.equal(mult(a,d),n);
 const {r,a,enemies:[e]}=arena();assert.equal(r.basic(a,e).damage,100);a.types=['비행','불꽃'];e.types=['풀'];assert.equal(r.basic(a,e).damage,200);
});
test('move typing is independent of caster, with individual AoE immunity and attached status blocking',()=>{
 const {r,a,enemies,b}=arena([['땅'],['물'],['물','비행']]);a.types=['노말'];r.cast(a,'10만볼트');
 assert.deepEqual(enemies.map(e=>e.maxHp-e.hp),[0,350,700]);assert.equal(enemies[0].statuses.shock,undefined);assert.ok(enemies[1].statuses.shock);assert.ok(b.events.some(e=>e.type==='immune'));
 const f=arena([['강철']]);f.r.cast(f.a,'독침');assert.equal(f.enemies[0].hp,100000);assert.equal(f.enemies[0].statuses.poison,undefined);
});
test('support and HP-based damage bypass matchups, while delayed damage retains its move type',()=>{
 const {r,a,enemies:[e]}=arena([['강철']]);r.status(e,'poison',6,a);r.tick(6);assert.equal(e.hp,95000);
 r.cast(a,'저주');r.tick(8);assert.equal(e.hp,91000);
 a.hp=50000;r.cast(a,'잠자기');assert.equal(a.hp,100000);
 const f=arena([['불꽃']]);f.r.cast(f.a,'솔라빔');f.r.tick(2);assert.equal(f.enemies[0].hp,100000-235);
});
test('matching primary or secondary caster type never grants a same-type attack bonus',()=>{
 const hits=[];for(const types of [['불꽃'],['비행','불꽃'],['노말']]){const {r,a,enemies:[e]}=arena();a.types=types;r.cast(a,'불꽃세례');hits.push(e.maxHp-e.hp);}assert.deepEqual(hits,[170,170,170]);
});

test('immune hits cannot stun, drain gauge, execute, or consume shields; standalone status still works',()=>{
 const {r,a,enemies:[e]}=arena([['고스트']]);e.shield=500;e.shieldUntil=50;r.cast(a,'속이기');assert.equal(e.holdUntil,0);assert.equal(e.shield,500);e.hp=1;r.cast(a,'뿔드릴');assert.equal(e.hp,1);
 e.types=['비행'];e.gauge=70;r.cast(a,'뼈다귀치기');assert.equal(e.gauge,70);
 e.types=['땅'];r.cast(a,'전기자석파');assert.ok(e.statuses.shock);
});
