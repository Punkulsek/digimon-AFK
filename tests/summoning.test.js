import test from 'node:test';import assert from 'node:assert/strict';
import {initialState,summon} from '../src/game.js';
import {SUMMON_THRESHOLDS,SUMMON_RATES,SUMMON_POOLS,summonLevel} from '../src/summoning.js';
import {evolutionFamily} from '../src/growth.js';
test('소환 확률표·경계·기초 진화형 풀',()=>{for(let i=0;i<10;i++){assert.ok(Math.abs(SUMMON_RATES[i].reduce((a,b)=>a+b)-100)<1e-9);assert.equal(summonLevel(SUMMON_THRESHOLDS[i]),i+1);}for(const pool of SUMMON_POOLS){assert.ok(pool.length);for(const p of pool)assert.equal(evolutionFamily(p.id),p.id);}});
test('연속 소환의 다음 뽑기부터 레벨 확률 적용·가격·실패 무변경',()=>{const s=initialState();s.summons=99;let n=0;const out=summon(s,10,()=>n++%2===0?.69:0);assert.ok(SUMMON_POOLS[0].some(p=>p.id===out.result[0].speciesId));assert.ok(SUMMON_POOLS[1].some(p=>p.id===out.result[1].speciesId));assert.equal(s.gems,9000);assert.equal(s.summons,109);s.gems=2999;const before=JSON.stringify(s);assert.ok(summon(s,30).error);assert.equal(JSON.stringify(s),before);});
