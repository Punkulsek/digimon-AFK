import {DUNGEONS} from '../src/dungeon-config.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Battle,initialState,load,SAVE_KEY,validateState} from '../src/game.js';
import {battleReportRows} from '../src/battle-report.js';
test('real damage, recoil and effective healing are recorded without shield or overheal',()=>{
 const b=new Battle(initialState(),null,()=>.9),a=b.allies[0],e=b.enemies[0],r=b.runtime;
 e.hp=20;e.shield=10;r.damage(a,e,0,{fixed:10000,pure:true});
 assert.equal(battleReportRows(b)[0].damage,20);
 a.hp=30;r.recoil(a,5);r.heal(a,a,100000);
 const row=battleReportRows(b)[0];assert.equal(row.taken,5);assert.equal(row.healing,a.maxHp-25);
 b.spawn();assert.equal(battleReportRows(b)[0].damage,0);assert.equal(battleReportRows(new Battle(initialState()))[0].damage,0);
});
test('1.5x persists and legacy 3x migrates without losing progress',()=>{
 const s=initialState();s.speed=1.5;assert.equal(validateState(s),true);
 s.speed=3;s.stage=78;s.gold=23456;
 const storage={getItem:key=>key===SAVE_KEY?JSON.stringify(s):null,setItem(){}};
 const result=load(storage);assert.equal(result.status,'loaded');assert.equal(result.state.speed,2);assert.equal(result.state.stage,78);assert.equal(result.state.gold,23456);
});

test('normal waves, boss entry and defeat restart clear all three metrics',()=>{
 const s=initialState(),b=new Battle(s);
 const dirty=()=>{b.report={[b.allies[0].uid]:{uid:b.allies[0].uid,speciesId:1,damage:90,taken:40,healing:20}};};
 const clean=()=>assert.ok(battleReportRows(b).every(r=>r.damage===0&&r.taken===0&&r.healing===0));
 dirty();b.spawn();clean();dirty();s.kills=10;assert.equal(b.challenge(),true);clean();dirty();b.fail();clean();
});

test('every dungeon and tower starts fresh and preserves its completed result until the next battle',()=>{
 for(const d of DUNGEONS){
  const s=initialState(),b=new Battle(s,{id:d.id,stage:1});
  assert.ok(battleReportRows(b).every(r=>r.damage===0));
  b.report={[b.allies[0].uid]:{uid:b.allies[0].uid,speciesId:1,damage:30,taken:10,healing:5}};
  b.finishDungeon('lost');assert.equal(battleReportRows(b)[0].damage,30);
  const retry=new Battle(s,{id:d.id,stage:1});assert.ok(battleReportRows(retry).every(r=>r.damage===0&&r.taken===0&&r.healing===0));
 }
});
