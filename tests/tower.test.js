import {test} from 'node:test';import assert from 'node:assert/strict';
import {initialState,Battle,load,validateState} from '../src/game.js';import {dungeonInfo,canEnterDungeon} from '../src/dungeon.js';import {GameAudio} from '../src/audio.js';
test('200 tower floors, varied enemies, bosses every five floors, sequential rewards and save migration',()=>{
 const s=initialState();assert.equal(canEnterDungeon(s,'tower',2),false);
 for(let floor=1;floor<=200;floor++){const d=dungeonInfo('tower',floor);assert.equal(d.boss,floor%5===0);assert.equal(d.enemies.length,5);assert.ok(new Set(d.enemies).size>1);s.dungeonClears.tower=floor-1;const b=new Battle(s,{id:'tower',stage:floor});assert.equal(b.enemies.filter(e=>e.isBoss).length,floor%5===0?1:0);const before=s.gold;b.finishDungeon('won');assert.equal(s.gold,before+d.amount);b.finishDungeon('won');assert.equal(s.gold,before+d.amount);assert.equal(s.dungeonClears.tower,floor);}
 assert.ok(validateState(s));assert.equal(canEnterDungeon(s,'tower',201),false);delete s.dungeonClears.tower;const restored=load({getItem:()=>JSON.stringify(s)}).state;assert.equal(restored.gold,s.gold);assert.equal(restored.dungeonClears.tower,0);
});
test('exclusive video mutes both buses and restores preferences without persistence changes',()=>{
 const a=new GameAudio({getItem:()=>null,setItem:()=>{throw Error('unexpected save')}});const bus=()=>({gain:{value:1,cancelScheduledValues(){},setValueAtTime(v){this.value=v},setTargetAtTime(v){this.value=v}}});a.context={currentTime:0};a.music=bus();a.effects=bus();const prefs={...a.prefs};a.setVideoExclusive(true);assert.equal(a.music.gain.value,0);assert.equal(a.effects.gain.value,0);a.setVideoExclusive(false);assert.ok(a.music.gain.value>0&&a.effects.gain.value>0);assert.deepEqual(a.prefs,prefs);
});
