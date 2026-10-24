import {test,expect} from '@playwright/test';
import {initialState} from '../../src/game.js';
for(const grade of [0,1,2,3])test(`Canvas tier ${grade} plays projected scene, silhouette, reveal and disposes`,async({page})=>{
 await page.goto('/');await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
 await page.evaluate(async grade=>{
  const {createSummonCinematic,summonTimeline}=await import('/src/summon-cinematic.js');
  const canvas=document.createElement('canvas');canvas.id='test-cinematic';canvas.style='position:fixed;inset:0;width:800px;height:600px;z-index:999';document.body.append(canvas);
  window.cues=[];window.finished=0;window.released=0;window.timeline=summonTimeline(grade);
  window.cinema=createSummonCinematic({canvas,grade,sprite:'/pokemon/25.png',rng:()=>.42,sound:{beginCinematic:()=>({cue:p=>window.cues.push(p),dispose:()=>window.released++})},onFinish:()=>window.finished++});
 },grade);
 const canvas=page.locator('#test-cinematic'),times=await page.evaluate(()=>window.timeline);
 await page.clock.runFor(100);await expect(canvas).toHaveAttribute('data-phase','arrival');
 const first=await canvas.evaluate(c=>c.toDataURL());
 await page.clock.runFor(times.open+50-100);await expect(canvas).toHaveAttribute('data-phase','burst');
 expect(await canvas.evaluate(c=>c.toDataURL())).not.toBe(first);
 await page.clock.runFor(times.silhouette-times.open);await expect(canvas).toHaveAttribute('data-phase','silhouette');
 await page.clock.runFor(times.reveal-times.silhouette);await expect(canvas).toHaveAttribute('data-phase','reveal');
 await page.clock.runFor(times.end-times.reveal+100);
 expect(await page.evaluate(()=>[finished,released,cinema.disposed])).toEqual([1,1,true]);
 if(grade===3)expect(await page.evaluate(()=>cues)).toContain('stillness');
 await page.evaluate(()=>{cinema.skip();cinema.dispose();});expect(await page.evaluate(()=>[finished,released])).toEqual([1,1]);
});
test('skip, immediate reentry, navigation and reduced motion preserve exactly one payment',async({page})=>{
 const state=initialState();state.auto=false;
 await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),state);
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
 await page.locator('.nav-button[data-action="summon"]').click();await page.locator('[data-count="10"]').click();
 await page.locator('[data-action="skipSummon"]').click();
 expect(await page.locator('.summon-result-card').evaluateAll(cards=>cards.every(card=>getComputedStyle(card).animationName==='none'))).toBe(true);
 await page.evaluate(()=>{document.querySelector('.result-confirm').click();document.querySelector('[data-count="1"]').click();});
 await page.clock.runFor(1700);await expect(page.locator('.result-grid .pokemon-card')).toHaveCount(1);
 expect(await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('pokemon-days-v1'));return [s.gems,s.summons,s.inventory.length];})).toEqual([8900,11,17]);
 await page.locator('.result-confirm').click();await page.locator('[data-count="1"]').click();await page.locator('.nav-button[data-action="home"]').click();await page.clock.runFor(9000);await expect(page.locator('#summon-page')).toHaveCount(0);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1')).summons)).toBe(12);
});
test('hidden page settles cinematic and restores its audio session once',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const {createSummonCinematic}=await import('/src/summon-cinematic.js');
  const {GameAudio}=await import('/src/audio.js');const audio=new GameAudio({getItem:()=>null});
  const canvas=document.createElement('canvas');document.body.append(canvas);let finished=0;
  const cinema=createSummonCinematic({canvas,grade:3,sprite:'',sound:audio,onFinish:()=>finished++});
  audio.cinematic.cue('stillness',3);const duck=audio.musicDuck;
  Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));cinema.skip();
  return {duck,restored:audio.musicDuck,finished,disposed:cinema.disposed,session:audio.cinematic};
 });
 expect(result).toEqual({duck:.08,restored:1,finished:1,disposed:true,session:null});
});
