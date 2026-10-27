import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState,save,load} from '../src/game.js';
import {normalizePresets,selectPreset} from '../src/party-presets.js';
import {mergeDuplicates} from '../src/duplicates.js';
import {EVOLUTIONS} from '../src/growth.js';
test('all evolution families merge unevolved duplicates preserving evolved growth and preset references',()=>{
 for(const e of EVOLUTIONS){const s=initialState();s.inventory=[{uid:'evolved',speciesId:e.to,level:80,breakthrough:7},{uid:'base',speciesId:e.from,level:1}];s.party=['base'];s.partyPresets=[['base']];mergeDuplicates(s);assert.equal(s.inventory.length,1);assert.equal(s.inventory[0].speciesId,e.to);assert.equal(s.inventory[0].level,80);assert.equal(s.inventory[0].breakthrough,7);assert.deepEqual(s.party,['evolved']);assert.deepEqual(s.partyPresets,[['evolved']]);assert.equal(Object.values(s.shards)[0],1);mergeDuplicates(s);assert.equal(Object.values(s.shards)[0],1);}
});
test('presets independently retain order across switching and save reload',()=>{
 const s=initialState();normalizePresets(s);const original=[...s.party];s.party.reverse();const reversed=[...s.party];selectPreset(s,1);assert.deepEqual(s.party,original);s.party[0]='starter-5';selectPreset(s,0);assert.deepEqual(s.party,reversed);const memory=new Map();const storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};save(storage,s);const restored=load(storage).state;selectPreset(restored,1);assert.equal(restored.party[0],'starter-5');assert.equal(restored.partyPresets.length,5);
});
