import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,validateState,load,save,SAVE_KEY,summon,levelUp,toggleParty,stats,Battle} from '../src/game.js';
import {SUMMON_POOLS} from '../src/summoning.js';
import {stageLabel,regionName} from '../src/data.js';
test('신규 시작 재화 각 10000 및 기존 잔액 보존',()=>{
 const fresh=initialState();assert.equal(fresh.gold,10000);assert.equal(fresh.gems,10000);
 const old={...fresh,gold:2400,gems:3600};
 assert.deepEqual(load({getItem:()=>JSON.stringify(old)}).state,old);
});
test('기존 6마리 저장을 5마리로 이관하며 보유·성장·재화를 유지',()=>{
 const old=initialState();old.party=old.inventory.map(p=>p.uid);old.gold=12345;old.stage=27;old.inventory[5].level=9;
 const store=new Map([[SAVE_KEY,JSON.stringify(old)]]);const storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
 assert.equal(validateState(old),false);
 const loaded=load(storage);assert.equal(loaded.status,'loaded');
 assert.deepEqual(loaded.state,{...old,party:old.party.slice(0,5)});
 assert.deepEqual(JSON.parse(store.get(SAVE_KEY)),loaded.state);
 assert.equal(new Battle(loaded.state).allies.length,5);
 assert.ok(toggleParty(loaded.state,'starter-5'));
});
test('저장 복원 및 손상 데이터 처리',()=>{const store=new Map();const storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};const s=initialState();s.gold=456;s.stage=21;assert.ok(save(storage,s));assert.deepEqual(load(storage).state,s);store.set(SAVE_KEY,'invalid');assert.equal(load(storage).status,'unavailable');store.set(SAVE_KEY,JSON.stringify({...s,party:['missing']}));assert.equal(load(storage).status,'invalid');assert.equal(save({setItem(){throw Error()}},s),false);});
test('초기 상태 유효성과 중복·범위 검증',()=>{const s=initialState();assert.ok(validateState(s));assert.equal(validateState({...s,gold:-1}),false);assert.equal(validateState({...s,party:['starter-0','starter-0']}),false);assert.equal(validateState({...s,kills:11}),false);});
test('1회 및 10회 소환 비용과 중복 조각',()=>{const s=initialState();const one=summon(s,1,()=>.999);assert.equal(one.result[0].speciesId,SUMMON_POOLS[0].at(-1).id);assert.equal(s.gems,9900);const ten=summon(s,10,()=>0);assert.equal(ten.result.length,10);assert.equal(s.gems,8900);assert.equal(new Set(s.inventory.map(p=>p.speciesId)).size,s.inventory.length);assert.equal(s.shards[ten.result[0].speciesId],9);s.gems=600;assert.ok(summon(s,10).error);assert.equal(s.gems,600);});
test('이상한사탕 성장 비용과 부족·최대 레벨',()=>{const s=initialState(),p=s.inventory[0],before=stats(p);assert.ok(levelUp(s,p.uid));s.candies=100;assert.equal(levelUp(s,p.uid),null);assert.equal(s.candies,0);assert.equal(s.gold,10000);assert.equal(p.level,2);assert.ok(stats(p).hp>before.hp);s.candies=0;assert.ok(levelUp(s,p.uid));assert.equal(p.level,2);s.candies=9999;p.level=100;assert.ok(levelUp(s,p.uid));assert.equal(p.level,100);});
test('편성 5마리 한도와 최소 한 마리',()=>{const s=initialState();const p=summon(s,1,()=>0).result[0];assert.ok(toggleParty(s,p.uid));assert.equal(toggleParty(s,s.party[0]),null);assert.equal(toggleParty(s,p.uid),null);assert.equal(s.party.length,5);while(s.party.length>1)toggleParty(s,s.party[0]);assert.ok(toggleParty(s,s.party[0]));assert.equal(s.party.length,1);});
test('자동 전투 정지, 적 처치, 포켓코인 및 보스 진입',()=>{const s=initialState();s.autoBoss=false;const b=new Battle(s,null,()=>.5);s.auto=false;const hp=b.enemy.hp;b.tick();assert.equal(b.enemy.hp,hp);s.auto=true;for(let t=0;t<250&&s.kills<10;t++)b.tick();assert.equal(s.kills,10);assert.ok(s.gold>10000);assert.ok(b.challenge());assert.equal(b.boss,true);assert.equal(b.challenge(),false);for(let t=0;t<100&&s.stage===1;t++)b.tick();assert.equal(s.stage,2);assert.equal(s.kills,0);assert.equal(s.gems,10100);});
test('자동 보스 및 실패 후 현재 스테이지 자동 사냥 복귀',()=>{const s=initialState();s.kills=9;const b=new Battle(s);b.enemies.forEach(e=>e.hp=0);assert.ok(b.tick().some(e=>e.type==='boss'));assert.equal(b.boss,true);b.allies.forEach(a=>a.hp=0);assert.ok(b.tick().some(e=>e.type==='defeat'));assert.equal(b.boss,false);assert.equal(s.stage,1);assert.equal(s.autoBoss,false);assert.ok(b.allies.every(a=>a.hp===a.maxHp));const hp=b.enemies.reduce((n,e)=>n+e.hp,0);for(let i=0;i<10;i++)b.tick(.1);assert.ok(b.enemies.reduce((n,e)=>n+e.hp,0)<hp);});
test('20 스테이지 완료 후 다음 지역 이동',()=>{const s=initialState();s.stage=20;s.kills=10;const b=new Battle(s);b.challenge();b.enemies.forEach(e=>e.hp=0);b.tick();assert.equal(s.stage,21);assert.equal(stageLabel(s.stage),'2-1');assert.equal(regionName(s.stage),'회색체육관');});
