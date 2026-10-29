import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,load,validateState,levelCost,levelUp,SAVE_KEY,Battle} from '../src/game.js';
import {dungeonInfo,canEnterDungeon} from '../src/dungeon.js';
import {EVOLUTION_TYPES} from '../src/dungeon-config.js';
const createRun=(state,id,stage)=>new Battle(state,{id,stage});
const finish=run=>{for(let i=0;i<130;i++)run.tick();return run;};
test('일반 전투 엔진의 동일 공격·피격 이벤트를 던전에서도 사용',()=>{
 const state=initialState();const field=new Battle(state);const dungeon=createRun(state,'coin',1);
 for(const run of [field,dungeon]){const events=[];run.allies.forEach(a=>a.hp=a.maxHp=10000);for(let i=0;i<50;i++)events.push(...run.tick(.1));assert.ok(events.some(e=>e.basic&&e.side==='ally'));assert.ok(events.some(e=>e.basic&&e.side==='enemy'));}
 assert.equal(dungeon.enemy.speciesId,dungeonInfo('coin',1).enemy);
 assert.equal(dungeon.challenge(),false);
});
test('기존 저장에 던전 기록·사탕·재료만 추가하고 기존 진행을 보존',()=>{
 const old=initialState();delete old.candies;delete old.materials;delete old.dungeonClears;old.stage=42;old.gold=123;old.gems=456;
 const s=load({getItem:()=>JSON.stringify(old)}).state;
 assert.equal(s.stage,42);assert.equal(s.gold,123);assert.equal(s.gems,456);assert.deepEqual(s.party,old.party);assert.equal(s.candies,0);assert.equal(s.materials.fire,0);assert.ok(validateState(s));
 assert.equal(validateState({...s,candies:-1}),false);assert.equal(validateState({...s,dungeonClears:{...s.dungeonClears,coin:101}}),false);
});
test('던전 단계 잠금, 난이도와 보상 증가 및 잘못된 입장 방지',()=>{
 const s=initialState();assert.ok(canEnterDungeon(s,'coin',1));assert.equal(canEnterDungeon(s,'coin',2),false);
 for(const stage of [0,101,1.5,NaN])assert.equal(canEnterDungeon(s,'coin',stage),false);
 assert.throws(()=>createRun(s,'coin',2));assert.equal(dungeonInfo('unknown',1),null);
 for(let stage=2;stage<=100;stage++){const a=dungeonInfo('candy',stage-1),b=dungeonInfo('candy',stage);assert.ok(b.hp>a.hp&&b.atk>a.atk&&b.amount>a.amount);}
});
test('승리 보상은 한 번만 지급하고 일반 스테이지 진행은 그대로 유지',()=>{
 const s=initialState(),before=structuredClone(s);const run=finish(createRun(s,'coin',1));assert.equal(run.status,'won');
 assert.equal(s.gold,before.gold+625);assert.equal(s.dungeonClears.coin,1);assert.ok(canEnterDungeon(s,'coin',2));
 run.tick();assert.equal(s.gold,before.gold+625);
 for(const key of ['stage','kills','totalKills','gems','auto','autoBoss','party','inventory'])assert.deepEqual(s[key],before[key]);
 finish(createRun(s,'coin',1));assert.equal(s.gold,before.gold+1250);
});
test('18개 타입 재료와 클리어 기록은 서로 독립적',()=>{
 for(const type of EVOLUTION_TYPES){const s=initialState();const run=finish(createRun(s,`evolution-${type.id}`,1));assert.equal(run.status,'won');assert.equal(s.materials[type.id],4);assert.equal(s.dungeonClears[`evolution-${type.id}`],1);for(const other of EVOLUTION_TYPES.filter(t=>t.id!==type.id)){assert.equal(s.materials[other.id],0);assert.equal(s.dungeonClears[`evolution-${other.id}`],0);}}
});
test('패배·중도 이탈은 보상과 클리어 기록을 바꾸지 않고 재도전 가능',()=>{
 const s=initialState();s.dungeonClears.coin=9;s.party=[s.party[0]];const before=structuredClone(s);
 const run=finish(createRun(s,'coin',10));assert.equal(run.status,'lost');assert.deepEqual(s,before);
 const retry=createRun(s,'coin',10);assert.equal(retry.enemy.hp,retry.enemy.maxHp);assert.equal(retry.allies[0].hp,retry.allies[0].maxHp);retry.tick();assert.deepEqual(s,before);
});
test('사탕 던전 보상으로 성장하고 높은 레벨에서는 더 많은 사탕 소비',()=>{
 const s=initialState();assert.equal(finish(createRun(s,'candy',1)).status,'won');assert.equal(s.candies,250);
 const p=s.inventory[0];const gold=s.gold;assert.equal(levelUp(s,p.uid),null);assert.equal(s.candies,150);assert.equal(s.gold,gold);p.level=51;assert.equal(levelCost(p),1147);assert.ok(levelUp(s,p.uid));assert.equal(p.level,51);
});
test('모든 던전 100단계 개방 경계와 사탕 성장 곡선',()=>{
 const s=initialState();
 for(const id of Object.keys(s.dungeonClears)){s.dungeonClears[id]=99;assert.ok(canEnterDungeon(s,id,100));assert.equal(canEnterDungeon(s,id,101),false);const end=dungeonInfo(id,100);assert.ok(Number.isSafeInteger(end.hp)&&Number.isSafeInteger(end.atk)&&end.amount>0);}
 for(const [level,cost] of [[1,100],[2,105],[3,110],[4,116],[10,155],[20,253],[50,1092]])assert.equal(levelCost({level}),cost);
 for(let level=2;level<100;level++)assert.ok(levelCost({level})>levelCost({level:level-1}));
 assert.equal(dungeonInfo('candy',1).amount,250);assert.equal(dungeonInfo('candy',100).amount,25618);
 assert.ok(validateState(s));
});
