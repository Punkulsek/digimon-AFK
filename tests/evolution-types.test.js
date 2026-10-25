import test from 'node:test';import assert from 'node:assert/strict';
import {initialState,load,save,SAVE_KEY,Battle} from '../src/game.js';
import {EVOLUTION_TYPES,DUNGEONS} from '../src/dungeon-config.js';
import {EVOLUTIONS,evolutionMaterials,evolutionReady,evolve} from '../src/growth.js';
import {species} from '../src/data.js';
test('18 types have independent rewards and progression',()=>{
 assert.deepEqual(EVOLUTION_TYPES.map(t=>t.id),['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy']);assert.equal(DUNGEONS.length,20);
 for(const t of EVOLUTION_TYPES){const s=initialState();const b=new Battle(s,{id:`evolution-${t.id}`,stage:1});b.enemy.hp=1;b.tick();assert.equal(b.status,'won');assert.equal(s.materials[t.id],3);assert.equal(s.dungeonClears[`evolution-${t.id}`],1);for(const other of EVOLUTION_TYPES.filter(x=>x.id!==t.id)){assert.equal(s.materials[other.id],0);assert.equal(s.dungeonClears[`evolution-${other.id}`],0);}b.tick();assert.equal(s.materials[t.id],3);}
});
test('legacy six-type saves retain all existing data and gain twelve zero fields',()=>{
 const original=initialState();const oldIds=['fire','water','grass','electric','rock','ice'];original.gold=32100;original.candies=77;original.materials.fire=901;original.dungeonClears['evolution-fire']=7;
 for(const t of EVOLUTION_TYPES)if(!oldIds.includes(t.id)){delete original.materials[t.id];delete original.dungeonClears[`evolution-${t.id}`];}
 const m=new Map([[SAVE_KEY,JSON.stringify(original)]]),store={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};
 const restored=load(store);assert.equal(restored.status,'loaded');const s=restored.state;assert.equal(s.gold,32100);assert.equal(s.candies,77);assert.equal(s.materials.fire,901);assert.equal(s.dungeonClears['evolution-fire'],7);assert.deepEqual(s.inventory,original.inventory);assert.deepEqual(s.party,original.party);for(const t of EVOLUTION_TYPES)if(!oldIds.includes(t.id)){assert.equal(s.materials[t.id],0);assert.equal(s.dungeonClears[`evolution-${t.id}`],0);}assert.deepEqual(load(store).state,s);
 s.materials.poison=-1;save(store,s);assert.equal(load(store).status,'invalid');
});
test('target typing determines every evolution; six requested examples and changed types',()=>{
 const examples=[[5,['fire']],[6,['fire','flying']],[2,['grass','poison']],[130,['water','flying']],[148,['dragon']],[149,['dragon','flying']],[26,['electric']],[36,['fairy']],[62,['water','fighting']]];
 for(const [target,types] of examples)assert.deepEqual(evolutionMaterials(EVOLUTIONS.find(e=>e.to===target)).map(m=>m.id),types);
 for(const e of EVOLUTIONS){const materials=evolutionMaterials(e);assert.deepEqual(materials.map(m=>m.name),species(e.to).types);assert.ok(materials.every(m=>m.amount===e.amount&&m.amount>0));}
});
test('dual material shortage is atomic; successful evolution consumes both and retains growth',()=>{
 const s=initialState(),p=s.inventory[1];p.speciesId=5;p.level=80;p.breakthrough=6;s.stage=161;s.shards[4]=12;s.materials.fire=700;s.materials.flying=599;
 const e=EVOLUTIONS.find(e=>e.to===6),before=JSON.stringify(s);assert.equal(evolutionReady(s,p,e),false);assert.ok(evolve(s,p.uid,6));assert.equal(JSON.stringify(s),before);
 s.materials.flying=650;assert.equal(evolve(s,p.uid,6),null);assert.equal(s.materials.fire,100);assert.equal(s.materials.flying,50);assert.equal(p.speciesId,6);assert.equal(p.level,80);assert.equal(p.breakthrough,6);assert.equal(s.shards[4],12);assert.ok(s.party.includes(p.uid));
});
