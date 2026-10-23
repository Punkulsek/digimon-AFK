import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,stats,load,validateState} from '../src/game.js';
import {EVOLUTIONS,evolve,breakthrough,breakthroughCost,breakthroughCandidates} from '../src/growth.js';
import {species} from '../src/data.js';
test('모든 진화 경로의 대상·재료·조건 유효성 및 이브이 분기',()=>{
 const state=initialState();
 for(const e of EVOLUTIONS){assert.ok(species(e.from)&&species(e.to));assert.ok(e.material in state.materials);assert.ok(e.level<=100&&e.amount>0);}
 assert.deepEqual(EVOLUTIONS.filter(e=>e.from===133).map(e=>e.to),[134,135,136]);
});
test('진화의 세 조건과 지역 클리어 경계, UID·레벨·돌파·편성 보존',()=>{
 const s=initialState(),p=s.inventory[1];p.level=40;p.breakthrough=6;s.stage=60;s.materials.fire=150;
 assert.ok(evolve(s,p.uid,5));s.stage=61;p.level=39;assert.ok(evolve(s,p.uid,5));p.level=40;s.materials.fire=149;assert.ok(evolve(s,p.uid,5));
 s.materials.fire=150;const party=[...s.party];assert.equal(evolve(s,p.uid,5),null);assert.equal(p.speciesId,5);assert.equal(p.level,40);assert.equal(p.breakthrough,6);assert.equal(s.materials.fire,0);assert.deepEqual(s.party,party);assert.ok(evolve(s,p.uid,5));
 p.level=80;s.stage=161;s.materials.fire=600;assert.equal(evolve(s,p.uid,6),null);assert.equal(p.breakthrough,6);assert.ok(evolve(s,p.uid,7));
});
test('돌파 1~10 비용·능력치 증가, 최대 제한 및 저장 복원',()=>{
 const s=initialState(),p=s.inventory[0];let prev=stats(p);
 for(let n=1;n<=10;n++){
 const ids=Array.from({length:n},(_,j)=>`copy-${n}-${j}`);s.inventory.push(...ids.map(uid=>({uid,speciesId:1,level:1,breakthrough:0})));
 assert.equal(breakthroughCost(p),n);assert.equal(breakthrough(s,p.uid,ids),null);assert.equal(p.breakthrough,n);assert.ok(stats(p).hp>prev.hp&&stats(p).atk>prev.atk);prev=stats(p);assert.ok(ids.every(id=>!s.inventory.some(q=>q.uid===id)));
 }
 assert.ok(breakthrough(s,p.uid,[]));assert.equal(load({getItem:()=>JSON.stringify(s)}).state.inventory[0].breakthrough,10);
});
test('재료 보호·중복 선택·다른 종·부족 시 무변경 및 레거시 저장',()=>{
 const s=initialState(),p=s.inventory[0];p.breakthrough=1;
 s.inventory.push({uid:'plain',speciesId:1,level:1},{uid:'raised',speciesId:1,level:2},{uid:'starred',speciesId:1,level:1,breakthrough:1});
 assert.deepEqual(breakthroughCandidates(s,p).map(q=>q.uid),['plain']);
 for(const ids of [[],['plain','plain'],['plain','raised'],['plain','starred'],['plain',s.party[1]],['plain',p.uid]]) {const before=JSON.stringify(s);assert.ok(breakthrough(s,p.uid,ids));assert.equal(JSON.stringify(s),before);}
 delete p.breakthrough;assert.equal(load({getItem:()=>JSON.stringify(s)}).status,'loaded');p.breakthrough=11;assert.equal(validateState(s),false);
});
