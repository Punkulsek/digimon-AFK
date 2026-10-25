import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,Battle,load,validateState} from '../src/game.js';
import {species,stageLabel,regionName} from '../src/data.js';
import {MAX_STAGE,STAGE_REGIONS,stageEnemy,bossTier,attackDamage} from '../src/stages.js';
import {builds,simulate} from '../scripts/simulate-balance.mjs';
test('관동 20지역·400스테이지의 이름·경계·지역별 적 구성',()=>{
 assert.equal(MAX_STAGE,400);assert.equal(STAGE_REGIONS.length,20);
 assert.deepEqual(STAGE_REGIONS.map(r=>r.name),['상록숲','회색체육관','달맞이산','블루체육관','상트안느호','갈색체육관','바위터널','포켓몬타워','로켓단 아지트','무지개체육관','실프주식회사','사파리존','무인발전소','쌍둥이섬','포켓몬저택','홍련체육관','상록체육관','챔피언로드','석영고원','블루시티 동굴']);
 for(const r of STAGE_REGIONS){assert.equal(regionName(r.id*20),r.name);assert.equal(stageLabel(r.id*20),`${r.id}-20`);assert.equal(stageLabel((r.id-1)*20+1),`${r.id}-1`);for(const id of [...r.enemies,r.midBoss,r.finalBoss])assert.ok(species(id));}
});
test('일반 적 HP·공격력·방어력 단조 증가와 지역 경계의 완만한 증가',()=>{
 for(let stage=2;stage<=400;stage++){
 const a=stageEnemy(stage-1),b=stageEnemy(stage);assert.ok(b.hp>=a.hp&&b.atk>=a.atk&&b.def>=a.def);
 assert.ok(b.hp/a.hp<1.07);assert.ok(b.atk-a.atk<=Math.max(1,a.atk*.07));
 }
 assert.ok(stageEnemy(400).hp<10000);
 assert.ok(attackDamage(100,100)<attackDamage(100,0));assert.ok(attackDamage(1,10000)>=1);
});
test('매 스테이지 보스·10 중간 보스·20 최종 보스 및 보스 재도전',()=>{
 for(let r=0;r<20;r++){
 assert.equal(bossTier(r*20+9),'normal');assert.equal(bossTier(r*20+10),'mid');assert.equal(bossTier(r*20+20),'final');
 const ordinary=stageEnemy(r*20+9,true),mid=stageEnemy(r*20+10,true),final=stageEnemy(r*20+20,true);
 assert.ok(mid.hp>ordinary.hp&&final.hp>mid.hp);assert.ok(mid.atk>ordinary.atk&&final.atk>mid.atk);
 }
 const s=initialState();s.stage=200;s.kills=10;const b=new Battle(s);b.challenge();b.allies.forEach(p=>p.hp=0);b.tick();assert.equal(s.stage,200);assert.equal(s.autoBoss,false);assert.equal(b.boss,false);assert.equal(s.auto,true);b.enemies.forEach(e=>e.atk=0);const attacks=[];for(let n=0;n<50;n++)attacks.push(...b.tick(.1));assert.ok(attacks.some(e=>e.basic&&e.side==='ally')); assert.ok(b.challenge());
});
test('400 완료 1회 지급·401 방지·완료 후 사냥·저장 및 이전 초과 진행 이관',()=>{
 const s=initialState();s.stage=400;s.kills=10;const b=new Battle(s);assert.ok(b.challenge());b.enemies.forEach(e=>e.hp=0);
 assert.ok(b.tick().some(e=>e.type==='campaignComplete'));assert.equal(s.stage,400);assert.equal(s.campaignCleared,true);assert.equal(s.gems,10100);assert.equal(b.challenge(),false);
 for(let n=0;n<30;n++){b.enemies.forEach(e=>e.hp=0);b.tick();}
 assert.equal(s.gems,10100);assert.equal(s.stage,400);assert.equal(b.boss,false);assert.ok(validateState(s));
 assert.equal(load({getItem:()=>JSON.stringify(s)}).state.campaignCleared,true);
 const old=initialState();old.stage=527;delete old.campaignCleared;old.gold=12345;const restored=load({getItem:()=>JSON.stringify(old)}).state;assert.equal(restored.stage,400);assert.equal(restored.campaignCleared,true);assert.equal(restored.gold,12345);assert.deepEqual(restored.inventory,old.inventory);
 assert.equal(validateState({...s,stage:401}),false);
});
test('성장 단계에 따라 동일 적에게 가하는 실제 전투 피해 증가',()=>{
 function dealt(level,breakthrough,stage){const s=initialState();s.stage=stage;s.inventory.forEach(p=>{p.level=level;p.breakthrough=breakthrough;});const b=new Battle(s,null,()=>.99);b.enemies.forEach(e=>{e.hp=e.maxHp=1e12;e.atk=0;e.skill=null;});b.allies.forEach(a=>a.skill=null);let damage=0;for(let t=0;t<200;t++)for(const e of b.tick(.1))if(e.type==='damage'&&e.side==='ally'&&!e.periodic)damage+=e.damage;return damage;}
 for(const stage of [1,160,400]){const base=dealt(1,0,stage),levelled=dealt(50,0,stage),grown=dealt(100,10,stage);assert.ok(levelled>base*2);assert.ok(grown>levelled);}
});
