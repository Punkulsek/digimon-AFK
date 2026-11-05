import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,load,save,SAVE_KEY,summon} from '../src/game.js';
import {evolve,breakthrough,breakthroughCost} from '../src/growth.js';
import {mergeDuplicates} from '../src/duplicates.js';
import {normalizeTrainer,trainerProgress,trainerRecords,setTrainerAvatar,renameTrainer,unlockedPortraits} from '../src/trainer.js';
const storage=state=>{const map=new Map(state?[[SAVE_KEY,JSON.stringify(state)]]:[]);return {getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};};

test('legacy save gets a stable profile without resetting growth, inventory or balances',()=>{
  const old=initialState();delete old.trainer;old.gold=123456;old.stage=57;old.inventory[0].level=25;old.dungeonClears.coin=12;
  const store=storage(old),loaded=load(store);assert.equal(loaded.status,'loaded');const {trainer,...game}=loaded.state;
  assert.deepEqual(game,old);assert.match(trainer.id,/^PK-[A-Z2-9]{12}$/);assert.equal(trainer.nickname,'새싹 트레이너');
  assert.equal(load(store).state.trainer.id,trainer.id);assert.equal('claimedLevelRewards' in trainer,false);
});

test('evolved and consumed species stay unlocked, and chosen portrait survives rebirth and reload',()=>{
  const s=initialState();s.inventory.push({uid:'butterfree',speciesId:12,level:50,breakthrough:0});
  // R Caterpie is first acquired as a duplicate of the already evolved Butterfree.
  const result=summon(s,1,()=>0);assert.equal(result.result[0].speciesId,10);
  assert.equal(s.inventory.some(p=>p.speciesId===10),false);assert.ok(unlockedPortraits(s).includes(10));
  assert.equal(setTrainerAvatar(s,10),true);assert.equal(setTrainerAvatar(s,12),true);
  const p=s.inventory.find(p=>p.uid==='butterfree');s.shards[10]=breakthroughCost(p);
  assert.equal(breakthrough(s,p.uid),null);assert.equal(p.speciesId,10);assert.equal(p.level,1);
  assert.equal(s.inventory.some(p=>p.speciesId===12),false);assert.equal(s.trainer.avatarSpeciesId,12);
  const store=storage();save(store,s);const restored=load(store).state;
  assert.equal(restored.trainer.avatarSpeciesId,12);assert.ok(unlockedPortraits(restored).includes(12));
  assert.equal(setTrainerAvatar(restored,150),false);assert.equal(restored.trainer.avatarSpeciesId,12);
});

test('evolution and direct duplicate repair record both exact species before removal',()=>{
  const s=initialState();s.stage=61;s.inventory[0].level=20;s.materials.grass=1000;s.materials.poison=1000;
  assert.equal(evolve(s,'starter-0',2),null);assert.ok(s.discovered.includes(1));assert.ok(s.discovered.includes(2));
  assert.equal(setTrainerAvatar(s,1),true);
  const p={uid:'caterpie',speciesId:10,level:1,breakthrough:0};s.inventory.push(p,{uid:'metapod',speciesId:11,level:10,breakthrough:0});
  mergeDuplicates(s);assert.ok(s.discovered.includes(10));assert.ok(s.discovered.includes(11));assert.equal(s.inventory.includes(p),false);
});

test('profile edits validate input and persist without changing identity or resources',()=>{
  const s=initialState(),id=s.trainer.id,coins=s.gold,balls=s.pokeballs;
  assert.ok(renameTrainer(s,'   '));assert.ok(renameTrainer(s,'가'.repeat(17)));assert.ok(renameTrainer(s,'<img src=x>'));
  assert.equal(renameTrainer(s,'  관동 & 피카츄  '),null);assert.equal(s.trainer.nickname,'관동 & 피카츄');assert.equal(s.trainer.id,id);
  const store=storage();save(store,s);assert.equal(load(store).state.trainer.nickname,'관동 & 피카츄');assert.equal(s.gold,coins);assert.equal(s.pokeballs,balls);
  s.trainer={nickname:42,id:3,avatarSpeciesId:999};normalizeTrainer(s);assert.equal(s.trainer.nickname,'새싹 트레이너');assert.ok(unlockedPortraits(s).includes(s.trainer.avatarSpeciesId));
});

test('records and trainer progress use real stages, collection and dungeon data',()=>{
  const s=initialState();s.stage=57;s.inventory[1].breakthrough=10;s.summons=1234;s.dungeonClears.coin=23;s.dungeonClears.candy=31;s.dungeonClears['evolution-fire']=49;s.dungeonClears.tower=99;
  assert.deepEqual(trainerProgress(s),{level:12,completed:56,progress:1,required:5,isMax:false});
  const rows=Object.fromEntries(trainerRecords(s).map(r=>[r.id,r.value]));
  assert.deepEqual(rows,{stages:'56 / 400',pokemon:'6마리',breakthrough:'1마리',coin:'23단계',candy:'31단계',types:'최고 49단계',tower:'100층',summons:'1,234회'});
  s.stage=400;s.campaignCleared=true;s.dungeonClears.tower=200;assert.equal(trainerProgress(s).level,80);assert.equal(trainerProgress(s).completed,400);assert.equal(trainerProgress(s).progress,5);assert.equal(trainerRecords(s).find(r=>r.id==='tower').value,'200층');
});
