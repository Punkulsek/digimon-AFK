import test from 'node:test';
import assert from 'node:assert/strict';
import {summonTimeline,cinematicFrame} from '../src/summon-cinematic.js';
import {GameAudio} from '../src/audio.js';
for(let grade=0;grade<4;grade++)test(`grade ${grade}: ordered silhouette and reveal, bounded duration`,()=>{
 const t=summonTimeline(grade);assert.ok(t.open<t.silhouette&&t.silhouette<t.reveal&&t.reveal<t.end);assert.ok(t.end<=8000);
 assert.equal(cinematicFrame(t.open,grade).phase,'burst');assert.equal(cinematicFrame(t.silhouette,grade).phase,'silhouette');assert.equal(cinematicFrame(t.reveal,grade).phase,'reveal');assert.equal(cinematicFrame(t.end,grade).done,true);
 if(grade===3){assert.equal(cinematicFrame(t.eclipse,grade).phase,'eclipse');assert.equal(cinematicFrame(t.still,grade).phase,'stillness');}
 else assert.equal(t.still,Infinity);
 const reduced=summonTimeline(grade,true);assert.equal(reduced.end,1500);assert.equal(cinematicFrame(reduced.reveal,grade,true).phase,'reveal');
});
test('cinematic audio restores user music level and owns effect lifetime',()=>{
 const audio=new GameAudio({getItem:()=>null,setItem(){}});audio.prefs.musicVolume=61;audio.prefs.effects=false;
 const session=audio.beginCinematic();session.cue('stillness',3);assert.equal(audio.musicDuck,.08);assert.equal(audio.prefs.musicVolume,61);
 session.dispose();session.dispose();assert.equal(audio.musicDuck,1);assert.equal(audio.cinematic,null);assert.equal(audio.prefs.effects,false);
 session.cue('stillness',3);assert.equal(audio.musicDuck,1);
 const first=audio.beginCinematic(),second=audio.beginCinematic();first.dispose();assert.equal(audio.cinematic,second);second.dispose();assert.equal(audio.musicDuck,1);
});
