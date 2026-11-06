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
 b.spawn();assert.equal(battleReportRows(b)[0].damage,20);assert.equal(battleReportRows(new Battle(initialState()))[0].damage,0);
});
test('1.5x persists and legacy 3x migrates without losing progress',()=>{
 const s=initialState();s.speed=1.5;assert.equal(validateState(s),true);
 s.speed=3;s.stage=78;s.gold=23456;
 const storage={getItem:key=>key===SAVE_KEY?JSON.stringify(s):null,setItem(){}};
 const result=load(storage);assert.equal(result.status,'loaded');assert.equal(result.state.speed,2);assert.equal(result.state.stage,78);assert.equal(result.state.gold,23456);
});
