import {test,expect} from '@playwright/test';
import {initialState} from '../../src/game.js';

for(const size of [{width:1440,height:810},{width:844,height:390}])test(`casting phases, animated canvas and cleanup ${size.width}`,async({page})=>{
 await page.setViewportSize(size);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const state=initialState();state.auto=false;
 await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),state);await page.goto('/');
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});
 await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
 await page.evaluate(async()=>{
  const {playSkillEffect,clearSkillEffects}=await import('/src/skill-effects.js');
  window.previewSkill=(name,support=false)=>{
   clearSkillEffects();window.phases=[];window.impacts=0;
   const actor=document.querySelector('#fighters .fighter'),target=document.querySelector('#enemy .enemy-unit');
   const find=uid=>document.querySelector(`[data-unit-id="${uid}"]`);
   const result=playSkillEffect({uid:actor.dataset.unitId,name,targetUids:[(support?actor:target).dataset.unitId]},find,document.querySelector('#effects'),document.querySelector('.battlefield'),false,{onPhase:phase=>window.phases.push(phase)});
   result.onImpact(()=>window.impacts++);
  };
 });
 for(const [name,support] of [['불꽃세례',false],['10만볼트',false],['물대포',false],['베어가르기',false],['빛의장벽',true]]){
  await page.evaluate(([name,support])=>window.previewSkill(name,support),[name,support]);
  await expect(page.locator('.skill-vfx-label')).toHaveAttribute('data-phase','charge');
  await page.clock.runFor(1100);
  await expect(page.locator('.skill-vfx-label')).toHaveAttribute('data-phase','impact');
  const drawing=await page.locator('.skill-vfx-canvas').evaluate(canvas=>{
   const bytes=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let visible=0;for(let i=3;i<bytes.length;i+=4)if(bytes[i])visible++;
   return {visible,width:canvas.getBoundingClientRect().width,height:canvas.getBoundingClientRect().height};
  });
  expect(drawing.visible).toBeGreaterThan(150);expect(drawing.width).toBe(size.width);expect(drawing.height).toBe(size.height);
  expect(await page.evaluate(()=>window.phases)).toEqual(['charge','release','impact']);expect(await page.evaluate(()=>window.impacts)).toBe(1);
  const labelBox=await page.locator('.skill-vfx-label').boundingBox(),hudBox=await page.locator('.stage-hud').boundingBox();
  expect(labelBox.y).toBeGreaterThanOrEqual(hudBox.y+hudBox.height);
  await page.screenshot({path:`/tmp/cast-${size.width}-${name}.png`});
 }
 await page.clock.runFor(2000);
 await expect(page.locator('.skill-vfx-canvas')).toHaveCount(0);await expect(page.locator('.skill-vfx-label')).toHaveCount(0);
 await expect(page.locator('.skill-beam')).toHaveCount(0);
 await page.evaluate(()=>window.previewSkill('불꽃세례'));await page.locator('.nav-button[data-action="collection"]').click();
 await expect(page.locator('.skill-vfx-canvas')).toHaveCount(0);expect(errors).toEqual([]);
});

test('reduced motion skips movement and resize cancels pending impacts',async({page})=>{
 const state=initialState();state.auto=false;
 await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),state);await page.goto('/');
 const result=await page.evaluate(async()=>{
  const {playSkillEffect}=await import('/src/skill-effects.js');const actor=document.querySelector('#fighters .fighter');
  const find=()=>actor,layer=document.querySelector('#effects'),field=document.querySelector('.battlefield');
  const before=actor.querySelector('img').getAnimations().length;
  const effect=playSkillEffect({uid:actor.dataset.unitId,name:'오버히트'},find,layer,field,true);
  const after=actor.querySelector('img').getAnimations().length;
  window.impactCount=0;effect.onImpact(()=>window.impactCount++);window.dispatchEvent(new Event('resize'));
  return {before,after,duration:effect.duration,cancelled:effect.cancelled};
 });
 expect(result.before).toBe(result.after);expect(result.duration).toBe(600);expect(result.cancelled).toBe(true);
 await page.waitForTimeout(700);expect(await page.evaluate(()=>window.impactCount)).toBe(0);await expect(page.locator('.skill-vfx-canvas')).toHaveCount(0);
});

test('overlapping casts are bounded and cancelled casts cannot deliver late impacts',async({page})=>{
 const state=initialState();state.auto=false;await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),state);await page.goto('/');
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
 const result=await page.evaluate(async()=>{
  const {playSkillEffect,clearSkillEffects}=await import('/src/skill-effects.js');const actor=document.querySelector('#fighters .fighter');
  const cast=()=>playSkillEffect({uid:actor.dataset.unitId,name:'성장'},()=>actor,document.querySelector('#effects'),document.querySelector('.battlefield'));
  for(let i=0;i<40;i++)cast();
  const count=document.querySelectorAll('.skill-vfx-label').length,canvases=document.querySelectorAll('.skill-vfx-canvas').length;
  clearSkillEffects();window.cancelledImpacts=0;const effect=cast();effect.onImpact(()=>window.cancelledImpacts++);effect.cancel();return {count,canvases};
 });
 expect(result.count).toBeLessThanOrEqual(12);expect(result.canvases).toBe(1);
 await page.clock.runFor(2000);expect(await page.evaluate(()=>window.cancelledImpacts)).toBe(0);await expect(page.locator('.skill-vfx-canvas')).toHaveCount(0);
});

test('skill phase sound uses real Web Audio nodes and respects effects off and hidden state',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const {GameAudio}=await import('/src/audio.js');const audio=new GameAudio({getItem:()=>null});
  const context=new AudioContext();await context.resume();audio.context=context;audio.effects=context.createGain();audio.effects.connect(context.destination);audio.started=true;
  let nodes=0;const create=context.createOscillator.bind(context);context.createOscillator=()=>{nodes++;return create();};
  for(const phase of ['charge','release','impact'])audio.skillPhase(phase,'thunder');const active=nodes;
  audio.prefs.effects=false;audio.skillSoundTimes={};audio.skillPhase('impact','water');const muted=nodes;
  audio.prefs.effects=true;audio.hidden=true;audio.skillPhase('charge','heal');const hidden=nodes;
  await context.close();return {active,muted,hidden};
 });
 expect(result.active).toBe(3);expect(result.muted).toBe(3);expect(result.hidden).toBe(3);
});

test('a queued animation frame older than the cast cannot select a negative sprite frame',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const state=initialState();state.auto=false;
 await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),state);await page.goto('/');
 await page.evaluate(async()=>{
  const {playSkillEffect,clearSkillEffects}=await import('/src/skill-effects.js');const actor=document.querySelector('#fighters .fighter');
  const cast=()=>playSkillEffect({uid:actor.dataset.unitId,name:'10만볼트'},()=>actor,document.querySelector('#effects'),document.querySelector('.battlefield'));
  cast();await new Promise(resolve=>setTimeout(resolve,200));clearSkillEffects();
  const raf=window.requestAnimationFrame;window.requestAnimationFrame=callback=>raf(()=>callback(0));cast();
  await new Promise(resolve=>setTimeout(resolve,100));window.requestAnimationFrame=raf;clearSkillEffects();
 });
 expect(errors).toEqual([]);
});
