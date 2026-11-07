import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BattleClock} from '../src/battle-clock.js';
import {Battle,initialState} from '../src/game.js';
import {DUNGEONS} from '../src/dungeon-config.js';
const start=Date.UTC(2026,10,7,14,59,30);
function rng(){let n=123;return()=>((n=(n*1664525+1013904223)>>>0)/2**32);}
function snapshot(b){return JSON.parse(JSON.stringify({state:b.state,status:b.status,wave:b.wave,elapsed:b.elapsed,allies:b.allies,enemies:b.enemies,report:b.report}));}
for(const speed of [1,1.5,2])test(`throttled stage combat matches every foreground tick at ${speed}x, including date rollover`,()=>{
 const state=initialState();state.inventory.forEach(p=>p.level=50);
 const foreground=new Battle(structuredClone(state),null,rng()),background=new Battle(structuredClone(state),null,rng());
 foreground.targetRng=rng();background.targetRng=rng();
 const duration=120000,steps=duration*speed/100;
 for(let n=1;n<=steps;n++)foreground.tick(.1,start+n*100/speed);
 const clock=new BattleClock(start);clock.sync(start,{enabled:true,speed});clock.sync(start+duration,{enabled:true,speed});
 let count=0;while(clock.steps)count+=clock.drain((dt,at)=>{background.tick(dt,at)},37);
 assert.equal(count,steps);assert.deepEqual(snapshot(background),snapshot(foreground));assert.ok(background.state.totalKills>0);
});
for(const d of DUNGEONS)test(`background ${d.id} uses the same dungeon outcome and grants rewards once`,()=>{
 const state=initialState();state.inventory.forEach(p=>p.level=50);
 const a=new Battle(structuredClone(state),{id:d.id,stage:1},rng()),b=new Battle(structuredClone(state),{id:d.id,stage:1},rng());
 a.targetRng=rng();b.targetRng=rng();
 for(let n=1;n<=2400;n++)a.tick(.1,start+n*50);
 const c=new BattleClock(start);c.sync(start,{enabled:true,speed:2});c.sync(start+120000,{enabled:true,speed:2});let results=0;
 while(c.steps)c.drain((dt,at)=>{results+=b.tick(dt,at).filter(e=>e.type==='dungeonResult').length;return b.status==='fighting';});
 assert.equal(results,1);assert.deepEqual(snapshot(b),snapshot(a));
 c.sync(start+240000,{enabled:false,speed:2});c.drain(dt=>{b.tick(dt);return false;});assert.deepEqual(snapshot(b),snapshot(a));
});
test('pauses earn no time, speed changes preserve fractional steps, and no time is counted twice',()=>{
 const c=new BattleClock(0);let seconds=0;const tick=dt=>{seconds+=dt};
 c.sync(10000,{enabled:true,speed:1});assert.equal(c.drain(tick),0);
 c.sync(10050,{enabled:true,speed:2});c.sync(10075,{enabled:true,speed:2});assert.equal(c.drain(tick),1);
 c.sync(10075,{enabled:false,speed:2});c.sync(20075,{enabled:true,speed:1});assert.equal(c.drain(tick),0);
 c.sync(20175,{enabled:true,speed:1});assert.equal(c.drain(tick),1);assert.equal(c.drain(tick),0);assert.equal(seconds,.2);
 c.sync(20100,{enabled:true,speed:1});c.sync(20175,{enabled:true,speed:1});assert.equal(c.drain(tick),0);
 c.reset(20175);c.sync(999999,{enabled:true,speed:1});assert.equal(c.drain(tick),0);
});
