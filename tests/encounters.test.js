import test from 'node:test';import assert from 'node:assert/strict';import {STAGE_REGIONS,stageEnemy} from '../src/stages.js';
test('requested region pools and final bosses cover all 400 stages',()=>{
 const pools=[[10,13,11,14,25],[74,95,27],[41,74,46,35],[120,54,118,116],[19,16,58,29,32],[100,81,25],[41,74,66,95],[92,93,104],[23,109,88,41],[43,69,44,70],[109,88,100,66],[111,102,46,84,29,32],[81,100,82,101],[86,90,79,41],[88,109,58,77,132],[58,37,77,126],[111,33,30,51],[66,67,95,42],[87,93,124,148],[42,64,132,48,112]];
 const bosses=[12,76,36,121,20,26,76,105,34,45,31,115,145,144,89,59,34,68,149,150];
 STAGE_REGIONS.forEach((r,i)=>{assert.deepEqual(r.enemies,pools[i]);assert.equal(stageEnemy((i+1)*20,true).speciesId,bosses[i]);for(let j=1;j<=20;j++)for(let k=0;k<10;k++)assert.ok(pools[i].includes(stageEnemy(i*20+j,false,k).speciesId));});
});
