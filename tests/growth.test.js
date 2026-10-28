import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,stats,load,validateState} from '../src/game.js';
import {EVOLUTIONS,evolutionMaterials,evolve,breakthrough,breakthroughCost,breakthroughCandidates} from '../src/growth.js';
import {species} from '../src/data.js';
test('모든 진화 경로의 대상·재료·조건 유효성 및 이브이 분기',()=>{
 const state=initialState();
 for(const e of EVOLUTIONS){assert.ok(species(e.from)&&species(e.to));assert.ok(evolutionMaterials(e).every(m=>m.id in state.materials));assert.ok(e.level<=100&&e.amount>0);}
 assert.deepEqual(EVOLUTIONS.filter(e=>e.from===133).map(e=>e.to),[134,135,136]);
});
test('진화의 세 조건과 지역 클리어 경계, UID·레벨·돌파·편성 보존',()=>{
 const s=initialState(),p=s.inventory[1];p.level=40;p.breakthrough=6;s.stage=60;s.materials.fire=150;
 assert.ok(evolve(s,p.uid,5));s.stage=61;p.level=19;assert.ok(evolve(s,p.uid,5));p.level=40;s.materials.fire=149;assert.ok(evolve(s,p.uid,5));
 s.materials.fire=150;const party=[...s.party];assert.equal(evolve(s,p.uid,5),null);assert.equal(p.speciesId,5);assert.equal(p.level,40);assert.equal(p.breakthrough,6);assert.equal(s.materials.fire,0);assert.deepEqual(s.party,party);assert.ok(evolve(s,p.uid,5));
 p.level=80;s.stage=161;s.materials.fire=600;s.materials.flying=600;assert.equal(evolve(s,p.uid,6),null);assert.equal(p.breakthrough,6);assert.ok(evolve(s,p.uid,7));
});
test('돌파 1~10 비용·능력치 증가, 최대 제한 및 저장 복원',()=>{
 const s=initialState(),p=s.inventory[0];p.speciesId=3;let prev=stats(p);
 for(let n=1;n<=10;n++){p.level=50+(n-1)*5;
 const cost=[1,2,2,3,5,7,9,10,12,15][n-1];s.shards[1]=(s.shards[1]||0)+cost;const count=s.inventory.length;
 assert.equal(breakthroughCost(p),cost);assert.equal(breakthrough(s,p.uid),null);assert.equal(p.breakthrough,n);assert.ok(stats(p).hp>prev.hp&&stats(p).atk>prev.atk);prev=stats(p);assert.equal(s.shards[1],0);assert.equal(s.inventory.length,count);
 }
 assert.ok(breakthrough(s,p.uid));assert.equal(load({getItem:()=>JSON.stringify(s)}).state.inventory[0].breakthrough,10);
});
test('돌파 조각의 계열 공유·보유 개체 보호·부족 시 무변경',()=>{
 const s=initialState(),p=s.inventory[1];p.speciesId=6;p.breakthrough=4;p.level=80;
 s.shards[4]=5;
 s.inventory.push({uid:'raised',speciesId:4,level:2},{uid:'starred',speciesId:5,level:1,breakthrough:1});
 assert.equal(breakthroughCandidates(s,p).length,5);
 assert.equal(breakthrough(s,p.uid),null);assert.equal(p.breakthrough,5);
 assert.ok(s.inventory.some(q=>q.uid==='raised'));assert.ok(s.inventory.some(q=>q.uid==='starred'));
 assert.equal(s.shards[4],0);
 const before=JSON.stringify(s);assert.ok(breakthrough(s,p.uid));assert.equal(JSON.stringify(s),before);
 delete p.breakthrough;assert.equal(load({getItem:()=>JSON.stringify(s)}).status,'loaded');p.breakthrough=11;assert.equal(validateState(s),false);
});
test('진화·소비 후 계열 재료와 도감 획득 기록 저장',()=>{
 const s=initialState(),p=s.inventory[1];p.level=40;s.stage=61;s.materials.fire=150;
 s.shards[4]=1;
 assert.equal(breakthroughCandidates(s,p).length,1);assert.equal(evolve(s,p.uid,5),null);assert.equal(breakthroughCandidates(s,p).length,1);
 p.level=50;s.stage=161;s.materials.fire=600;s.materials.flying=600;assert.equal(evolve(s,p.uid,6),null);assert.equal(breakthrough(s,p.uid),null);
 const restored=load({getItem:()=>JSON.stringify(s)}).state;
 for(const id of [4,5])assert.ok(restored.discovered.includes(id));
 assert.equal(breakthroughCandidates(restored,restored.inventory[1]).length,0);
});
