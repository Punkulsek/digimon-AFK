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
