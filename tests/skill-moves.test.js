import test from 'node:test';
import assert from 'node:assert/strict';
import skillData from '../src/generated/skills.json' with {type:'json'};
import {HANDLED_MOVES,executeSkill} from '../src/skill-moves.js';
import {SkillRuntime} from '../src/skill-runtime.js';
function setup(rng=()=>.99){
 const b={allies:[],enemies:[],events:[],targetRng:()=>.999,rng};const e=new SkillRuntime(b);
 const unit=(id,side,n)=>e.init({uid:`${side}-${n}`,speciesId:id,types:side==='ally'?['벌레','드래곤']:['노말'],level:10,hp:10000,maxHp:10000,atk:100,def:0,attackSpeed:100,penetration:0,damageReduction:0,bossDamage:0,skillHaste:0,skillAmplification:0,critChance:0,critDamage:150},side);
 b.allies=Array.from({length:5},(_,n)=>unit(n===0?1:4,'ally',n));b.enemies=Array.from({length:5},(_,n)=>unit(19,'enemy',n));for(const u of e.units)u.skill=null;
 return {e,b,c:b.allies[0],t:b.enemies[0]};
}
test('all 131 authoritative common moves have executable handlers and all 151 assignments resolve',()=>{
 assert.equal(HANDLED_MOVES.length,131);assert.deepEqual([...HANDLED_MOVES].sort(),Object.keys(skillData.moves).sort());assert.equal(Object.keys(skillData.assignments).length,151);
 for(const name of HANDLED_MOVES){const {e,b,c,t}=setup(()=>0);c.hp=8000;e.status(t,'sleep',10,c);assert.notEqual(executeSkill(e,c,name),false,name);e.tick(20);for(const u of e.units){assert.ok(Number.isFinite(u.hp),name);assert.ok(u.hp>=0&&u.hp<=u.maxHp,name);assert.ok(u.gauge>=0&&u.gauge<=100,name);}}
});
test('area attacks retain per-target coefficients with one or three remaining targets',()=>{
 for(const count of [1,3,5]){const {e,b,c}=setup();b.enemies.slice(count).forEach(t=>t.hp=0);e.cast(c,'10만볼트');assert.equal(b.enemies[0].hp,9710);if(count>=3){assert.equal(b.enemies[1].hp,9825);assert.equal(b.enemies[2].hp,9825);}if(count===5)assert.equal(b.enemies[3].hp,10000);}
});
test('double needle poison interaction, bone debuff and independent multi-hit rolls',()=>{
 const a=setup(()=>0);a.e.cast(a.c,'더블니들');assert.equal(a.t.hp,9700);assert.ok(a.e.has(a.t,'poison'));
 const b=setup();b.t.def=400;b.e.cast(b.c,'뼈다귀부메랑');assert.equal(b.t.hp,10000-90-97);
 const c=setup();let n=0;c.b.rng=()=>[.01,.99,.01,.99][n++%4];c.c.critChance=50;c.e.cast(c.c,'회전부리');const hits=c.b.events.filter(e=>e.type==='damage');assert.deepEqual(hits.slice(0,4).map(h=>h.crit),[true,false,true,false]);
});
test('delayed strikes, dot refresh and conditional gauge retention',()=>{
 const a=setup();a.c.gauge=100;assert.equal(a.e.cast(a.c,'꿈먹기'),false);assert.equal(a.c.gauge,100);
 a.c.hp=2000;assert.equal(a.e.cast(a.c,'대폭발'),false);assert.equal(a.c.gauge,100);
 const b=setup();b.e.cast(b.c,'솔라빔');assert.equal(b.t.hp,10000);assert.ok(b.e.isDisabled(b.c));b.e.tick(2);assert.equal(b.t.hp,9530);assert.equal(b.b.enemies[1].hp,9810);
 const c=setup();c.e.cast(c.c,'불꽃회오리');c.e.cast(c.c,'불꽃회오리');assert.equal(c.e.periodic.size,3);c.e.tick(6);assert.equal(c.t.hp,10000-280-120);
});
test('same-target third seed bomb bonus and HP gate finisher preserve boss immunity',()=>{
 const a=setup();for(let i=0;i<3;i++)a.e.cast(a.c,'씨폭탄');assert.equal(a.t.hp,9340);
 const b=setup();b.t.hp=1800;b.e.cast(b.c,'땅가르기');assert.equal(b.t.hp,0);
 const c=setup();c.t.hp=1800;c.t.isBoss=true;c.e.cast(c.c,'땅가르기');assert.equal(c.t.hp,1390);
});
test('copies preserve source definition and apply 85/75 percent potency',()=>{
 const eligible=HANDLED_MOVES.filter(n=>!['변신','손가락흔들기','땅가르기','뿔드릴','멸망의노래'].includes(n));
 const index=eligible.indexOf('용의분노'),a=setup(()=> (index+.1)/eligible.length);a.e.cast(a.c,'손가락흔들기');assert.equal(a.t.hp,10000-190*.85);
 const b=setup(()=>0);b.b.allies.slice(1).forEach(u=>u.speciesId=147);b.e.cast(b.c,'변신');assert.equal(b.t.hp,10000-190*.75);
 const c=setup();c.b.allies.slice(1).forEach(u=>u.speciesId=132);c.c.gauge=100;assert.equal(c.e.cast(c.c,'변신'),false);assert.equal(c.c.gauge,100);
});
test('support conditions target only eligible living allies and cleanse only specified statuses',()=>{
 const a=setup();a.b.allies[1].types=['벌레'];a.b.allies[2].types=['물'];a.b.allies[3].types=['불꽃'];a.b.allies[4].types=['풀'];a.e.cast(a.c,'나비춤');assert.ok(a.e.has(a.c,'나비춤'));assert.ok(a.e.has(a.b.allies[1],'나비춤'));assert.equal(a.e.has(a.b.allies[2],'나비춤'),false);
 a.e.status(a.c,'poison',6,a.t);a.e.status(a.c,'sleep',3,a.t);executeSkill(a.e,a.b.allies[1],'아로마테라피');assert.equal(a.e.has(a.c,'poison'),false);assert.ok(a.e.has(a.c,'sleep'));
});
