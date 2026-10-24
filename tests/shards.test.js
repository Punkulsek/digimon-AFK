import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,summon,load,save,SAVE_KEY} from '../src/game.js';
import {breakthrough} from '../src/growth.js';
test('duplicate summons become persistent family shards and consume only on breakthrough',()=>{
 const s=initialState();summon(s,10,()=>0);
 assert.equal(new Set(s.inventory.map(p=>p.speciesId)).size,s.inventory.length);
 const p=s.inventory.find(p=>p.speciesId===10);assert.equal(s.shards[10],9);
 assert.equal(breakthrough(s,p.uid),null);assert.equal(s.shards[10],8);assert.equal(p.breakthrough,1);
 const m=new Map(),store={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};save(store,s);assert.deepEqual(load(store).state,s);
});
test('legacy duplicate migration preserves maxima, party references and backup once',()=>{
 const s=initialState();s.inventory.push({uid:'dup',speciesId:1,level:40,breakthrough:3});s.party[0]='dup';
 const raw=JSON.stringify(s),m=new Map([[SAVE_KEY,raw]]),store={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};
 const migrated=load(store).state;assert.equal(migrated.inventory.length,6);assert.equal(migrated.inventory[0].level,40);assert.equal(migrated.inventory[0].breakthrough,3);assert.equal(migrated.shards[1],1);assert.equal(migrated.party[0],'starter-0');assert.equal(m.get(SAVE_KEY+'-before-shards'),raw);assert.deepEqual(load(store).state,migrated);
});
