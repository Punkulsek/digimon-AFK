import test from 'node:test';import assert from 'node:assert/strict';
import {initialState,stats,save,load} from '../src/game.js';import {upgradeCost,upgradeQuote,buyUpgrade} from '../src/upgrades.js';
test('exact summed costs, MAX boundary, independent upgrades, stats and save',()=>{
 const s=initialState(),p=s.inventory[0],before=stats(p,s);const total=Array.from({length:10},(_,i)=>Math.ceil(100*1.08**i)).reduce((a,b)=>a+b,0);
 assert.equal(upgradeQuote(s,'atk',10).cost,total);assert.equal(buyUpgrade(s,'atk',10),null);assert.equal(s.gold,10000-total);assert.equal(stats(p,s).atk,Math.round(before.atk*1.05));assert.equal(s.upgrades.hp,0);
 const q=upgradeQuote(s,'hp','MAX');assert.ok(q.cost<=s.gold);assert.ok(q.cost+upgradeCost(q.levels)>s.gold);buyUpgrade(s,'hp','MAX');assert.ok(s.gold>=0);
 const old=JSON.stringify(s);assert.ok(buyUpgrade(s,'def',100));assert.equal(JSON.stringify(s),old);assert.equal(upgradeCost(1000),Infinity);
 const m=new Map(),store={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};save(store,s);assert.deepEqual(load(store).state,s);
});
