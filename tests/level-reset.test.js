import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,levelUp,levelRefund,resetLevel,save,load} from '../src/game.js';
import {breakthrough,breakthroughCost,maxLevel} from '../src/growth.js';
test('reset refunds exact current cycle cost and preserves evolution, breakthrough, runes and party',()=>{
 const s=initialState(),p=s.inventory[0];p.speciesId=3;p.breakthrough=3;p.runes={slots:[{locked:true}]};s.candies=1000000;const start=s.candies;
 for(let i=0;i<30;i++)assert.equal(levelUp(s,p.uid),null);
 const expected=start-s.candies,party=structuredClone(s.party),runes=structuredClone(p.runes);
 assert.equal(levelRefund(p),expected);assert.equal(resetLevel(s,p.uid),null);assert.equal(s.candies,start);assert.equal(p.level,1);assert.equal(p.breakthrough,3);assert.equal(p.speciesId,3);assert.deepEqual(p.runes,runes);assert.deepEqual(s.party,party);
 assert.ok(resetLevel(s,p.uid));assert.equal(s.candies,start);
 assert.equal(levelUp(s,p.uid),null);assert.equal(levelRefund(p),100);assert.equal(resetLevel(s,p.uid),null);assert.equal(s.candies,start);
});
test('breakthrough cost cannot be reclaimed in a later reset',()=>{
 const s=initialState(),p=s.inventory[0];p.speciesId=3;s.candies=10000000;
 while(p.level<maxLevel(p))assert.equal(levelUp(s,p.uid),null);
 s.shards[1]=breakthroughCost(p);assert.equal(breakthrough(s,p.uid),null);const balance=s.candies;
 assert.equal(levelRefund(p),0);assert.ok(resetLevel(s,p.uid));assert.equal(s.candies,balance);
 for(let i=0;i<5;i++)levelUp(s,p.uid);
 assert.equal(resetLevel(s,p.uid),null);assert.equal(s.candies,balance);assert.equal(p.breakthrough,1);assert.equal(s.shards[1],0);
});
test('legacy levels refund without a ledger and persist across reload',()=>{
 const s=initialState(),p=s.inventory[0];p.level=10;const expected=levelRefund(p),balance=s.candies;
 assert.equal(resetLevel(s,p.uid),null);const store=new Map(),storage={setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)};assert.ok(save(storage,s));const restored=load(storage).state;assert.equal(restored.candies,balance+expected);assert.equal(restored.inventory.find(q=>q.uid===p.uid).level,1);assert.ok(resetLevel(restored,p.uid));
});
