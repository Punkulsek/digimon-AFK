import test from 'node:test';
import assert from 'node:assert/strict';
import {SPECIES,species,RARITIES} from '../src/data.js';
import {initialState,summon,validateState} from '../src/game.js';

test('첨부 PokeAPI에서 관동 151종의 한글 이름·타입·도감 정보 로드',()=>{
 assert.deepEqual(SPECIES.map(p=>p.id),Array.from({length:151},(_,i)=>i+1));
 for(const p of SPECIES){
  assert.match(p.name,/[가-힣]/);
  assert.ok(p.types.length>=1&&p.types.length<=2);
  assert.ok(p.height>0&&p.weight>0);
  assert.equal(Object.keys(p.baseStats).length,6);
  assert.ok(p.hp>0&&p.atk>0);
 }
 assert.equal(species(151).name,'뮤');
 assert.deepEqual(species(1).types,['풀','독']);
 assert.equal(species(25).height,.4);
 assert.equal(species(25).weight,6);
});

test('추가된 모든 포켓몬이 해당 등급에서 소환되고 저장 가능',()=>{
 let offset=0;
 for(let rarity=0;rarity<RARITIES.length;rarity++){
  const pool=SPECIES.filter(p=>p.rarity===rarity);
  assert.ok(pool.length>0);
  for(let idx=0;idx<pool.length;idx++){
   const state=initialState();let call=0;
   const result=summon(state,1,()=>call++===0?(offset+.5)/100:(idx+.5)/pool.length);
   assert.equal(result.result[0].speciesId,pool[idx].id);
   assert.ok(validateState(state));
  }
  offset+=RARITIES[rarity].chance;
 }
});
