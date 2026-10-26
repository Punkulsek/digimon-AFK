import test from 'node:test';import assert from 'node:assert/strict';
import {initialState,Battle} from '../src/game.js';
function killTarget(b){b.enemy.hp=0;return b.tick(.001);}
test('ten five-Pokemon waves required, not two; boss and all escorts required for stage advance',()=>{
 const s=initialState(),b=new Battle(s,null,()=>.99);
 for(let wave=0;wave<10;wave++){
  for(let target=0;target<5;target++){killTarget(b);assert.equal(s.kills,target===4?wave+1:wave);assert.equal(s.stage,1);}
  assert.equal(b.boss,wave===9);
 }
 assert.equal(s.totalKills,50);assert.equal(b.enemies.filter(e=>e.isBoss).length,1);
 for(let target=0;target<4;target++){killTarget(b);assert.equal(s.stage,1);}
 killTarget(b);assert.equal(s.stage,2);assert.equal(s.kills,0);
});
test('manual challenge waits for ten completed waves and progress saturates',()=>{
 const s=initialState();s.autoBoss=false;const b=new Battle(s,null,()=>.99);
 for(let n=0;n<55;n++){killTarget(b);if(n<49)assert.equal(b.challenge(),false);}
 assert.equal(s.kills,10);assert.equal(b.boss,false);assert.equal(b.challenge(),true);
});

test('new stage clears both teams gauges and scheduled skill work',()=>{
 const s=initialState();s.kills=10;const b=new Battle(s);b.challenge();
 b.allies.forEach(a=>a.gauge=77);b.runtime.pending.push({at:999,fn:()=>{throw new Error('stale cast');}});
 b.enemies.forEach(e=>e.hp=0);b.tick(.01);
 assert.equal(s.stage,2);assert.ok([...b.allies,...b.enemies].every(u=>u.gauge===0));assert.equal(b.runtime.pending.length,0);
});

test('each enemy formation restores HP and clears temporary combat state, keeping permanent stats',()=>{
 const s=initialState();s.autoBoss=false;s.upgrades.hp=20;const b=new Battle(s);const original=b.allies.map(u=>({atk:u.atk,maxHp:u.maxHp,uid:u.uid}));
 for(let wave=0;wave<10;wave++){
  const a=b.allies[0];a.hp=1;a.gauge=88;b.runtime.buff(a,'성장',30,{atkPct:25});b.runtime.status(a,'burn',30,a);b.runtime.shield(a,a,300,30);b.runtime.dot(a,a,'test',30,1,()=>{throw new Error('old dot');});b.runtime.delay(10,()=>{throw new Error('old delayed cast');},a);
  b.enemies.forEach(e=>e.hp=0);b.tick(.001);
  assert.equal(s.stage,1);assert.equal(s.kills,wave+1);
  for(const u of [...b.allies,...b.enemies]){assert.equal(u.hp,u.maxHp);assert.equal(u.gauge,0);assert.equal(u.shield,0);assert.deepEqual(u.buffs,{});assert.deepEqual(u.statuses,{});assert.deepEqual(u.memory,{});}
  assert.equal(b.runtime.pending.length,0);assert.equal(b.runtime.periodic.size,0);assert.deepEqual(b.allies.map(u=>({atk:u.atk,maxHp:u.maxHp,uid:u.uid})),original);
 }
 b.allies.forEach(u=>{u.hp=1;u.gauge=99;});assert.equal(b.challenge(),true);assert.ok([...b.allies,...b.enemies].every(u=>u.hp===u.maxHp&&u.gauge===0&&u.shield===0));
});
