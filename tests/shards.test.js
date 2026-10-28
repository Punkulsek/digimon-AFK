import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,summon,load,save,SAVE_KEY} from '../src/game.js';
import {breakthrough,breakthroughCost,BREAKTHROUGH_COSTS} from '../src/growth.js';
test('duplicate summons become persistent family shards and consume only on breakthrough',()=>{
 const s=initialState();summon(s,30,()=>0);
 assert.equal(new Set(s.inventory.map(p=>p.speciesId)).size,s.inventory.length);
 const p=s.inventory.find(p=>p.speciesId===10);assert.equal(s.shards[10],29);
 p.speciesId=12;s.discovered.push(12);s.discovered.sort((a,b)=>a-b);p.level=50;assert.equal(breakthrough(s,p.uid),null);assert.equal(s.shards[10],19);assert.equal(p.breakthrough,1);
 const m=new Map(),store={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};save(store,s);assert.deepEqual(load(store).state,s);
});
test('legacy duplicate migration preserves maxima, party references and backup once',()=>{
 const s=initialState();s.inventory.push({uid:'dup',speciesId:1,level:40,breakthrough:3});s.party[0]='dup';
 const raw=JSON.stringify(s),m=new Map([[SAVE_KEY,raw]]),store={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};
 const migrated=load(store).state;assert.equal(migrated.inventory.length,6);assert.equal(migrated.inventory[0].level,40);assert.equal(migrated.inventory[0].breakthrough,3);assert.equal(migrated.shards[1],1);assert.equal(migrated.party[0],'starter-0');assert.equal(m.get(SAVE_KEY+'-before-shards'),raw);assert.deepEqual(load(store).state,migrated);
});

test('all four grades use exact ten-step costs and stop at maximum',()=>{
 const ids=[12,40,6,150],families=[10,39,4,150],totals=[4860,935,66,55];
 ids.forEach((id,g)=>{const s=initialState(),p={uid:'test',speciesId:id,level:80,breakthrough:0};s.inventory=[p];s.party=[p.uid];s.shards[families[g]]=totals[g];
 for(let n=0;n<10;n++){p.level=50+n*5;assert.equal(breakthroughCost(p),BREAKTHROUGH_COSTS[g][n]);assert.equal(breakthrough(s,p.uid),null);assert.equal(p.breakthrough,n+1);assert.equal(p.level,50+n*5);}
 assert.equal(s.shards[families[g]],0);assert.equal(breakthroughCost(p),0);const before=JSON.stringify(s);assert.ok(breakthrough(s,p.uid));assert.equal(JSON.stringify(s),before);
 });
 assert.equal(breakthroughCost({speciesId:6,breakthrough:6}),9);
});
