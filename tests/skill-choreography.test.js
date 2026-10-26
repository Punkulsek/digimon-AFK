import test from 'node:test';
import assert from 'node:assert/strict';
import {SKILLS} from '../src/skills.js';
import {skillChoreography} from '../src/skill-choreography.js';

test('every move has a finite, readable casting timeline at every battle speed',()=>{
 for(const name of Object.keys(SKILLS))for(const speed of [1,2,3]){
  const p=skillChoreography(name,speed);
  assert.equal(p.known,true,name);
  assert.ok(p.windup>=400&&p.travel>=200,name);
  assert.ok(p.impact<p.duration&&p.duration-p.impact>=900,name);
  assert.ok(p.duration<=5200,name);
 }
});
test('elemental, physical and support spells use different motion recipes; charged skills stay readable at 3x',()=>{
 const moves=['불꽃세례','10만볼트','물대포','베어가르기','알낳기','빛의장벽'];
 assert.equal(new Set(moves.map(name=>skillChoreography(name).recipe)).size,moves.length);
 assert.ok(skillChoreography('솔라빔').windup>=2000);
 assert.ok(skillChoreography('솔라빔',3).windup>=650);
 assert.ok(skillChoreography('더블니들').count>1);
});

// Runtime metadata stays consistent with the pinned, original sprite manifests.
import sheets from '../src/generated/effect-sheets.json' with {type:'json'};
import manifest from '../public/effects/sources.json' with {type:'json'};
test('sprite frame metadata matches source dimensions and transparent palette',()=>{
 assert.deepEqual(sheets.assets,manifest.assets.map(a=>Object.fromEntries(['name','path','width','height','paletteZero'].map(key=>[key,a[key]]))));
});
