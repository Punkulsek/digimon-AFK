import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {initialState} from '../../src/game.js';
import {DUNGEONS} from '../../src/dungeon-config.js';
import {dungeonScenery} from '../../src/battle-scenery.js';

async function seed(page){
  const s=initialState();s.auto=false;s.dungeonClears.tower=4;
  await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),s);
  await page.goto('/');
  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+50));
}
async function insideFloor(page){
  const floor=await page.locator('.battle-floor').boundingBox();
  const boxes=await page.locator('#fighters .field-art,#enemy .field-art').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};}));
  expect(boxes).toHaveLength(10);
  for(const r of boxes){expect(r.top).toBeGreaterThan(floor.y);expect(r.bottom).toBeLessThan(floor.y+floor.height);expect(r.left).toBeGreaterThan(floor.x);expect(r.right).toBeLessThan(floor.x+floor.width);}
}
test('all 22 dungeons have distinct loaded scenery above an independent floor',async({page})=>{
  test.setTimeout(120000);await seed(page);const seen=new Set();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.locator('.nav-button[data-action="dungeons"]').click();
  for(const d of DUNGEONS){
    await page.locator(`[data-action="dungeonTab"][data-tab="${d.id==='tower'?'challenge':'daily'}"]`).click();
    if(d.id.startsWith('evolution-'))await page.locator('[data-dungeon="evolution"]').click();
    await page.locator(`[data-action="dungeonSelect"][data-dungeon="${d.id}"]`).click();
    await page.locator('[data-action="dungeonEnter"]').click();
    const a=dungeonScenery(d.id),art=page.locator('#scene>.type-background');
    await expect(art).toBeVisible();await expect(page.locator('.region-art')).toBeHidden();
    await expect(art).toHaveAttribute('data-atlas',String(a.atlas));expect(await art.evaluate(e=>parseFloat(getComputedStyle(e).backgroundPositionY))).toBeCloseTo(a.row/(a.rows-1)*100,3);
    const size=await art.evaluate(async e=>{const img=new Image();img.src=getComputedStyle(e).backgroundImage.slice(5,-2);await img.decode();return [img.naturalWidth,img.naturalHeight];});expect(size[0]).toBeGreaterThan(1000);
    seen.add(`${a.atlas}:${a.row}`);await insideFloor(page);
    await page.locator('[data-action="dungeonStatus"]').click();await page.locator('[data-action="exitDungeon"]').click();
  }
  expect(seen.size).toBe(22);expect(errors).toEqual([]);
  await page.locator('.nav-button[data-action="home"]').click();await expect(page.locator('.region-art')).toBeVisible();await expect(page.locator('#scene>.type-background')).toBeHidden();
});
test('normal and boss sprites fit the lower platform at desktop and landscape sizes',async({page})=>{
  await seed(page);
  for(const size of [{width:1920,height:1080},{width:1440,height:810},{width:844,height:390},{width:568,height:320}]){await page.setViewportSize(size);await insideFloor(page);}
  await page.setViewportSize({width:1920,height:1080});
  await page.locator('.nav-button[data-action="dungeons"]').click();await page.locator('[data-action="dungeonTab"][data-tab="challenge"]').click();await page.locator('[data-dungeon="tower"]').click();await page.locator('[data-action="dungeonEnter"]').click();
  for(const size of [{width:1920,height:1080},{width:1440,height:810},{width:844,height:390},{width:568,height:320}]){await page.setViewportSize(size);await insideFloor(page);}
});

test('standalone embeds the exact latest 12 scenery and floor sheets without network',async({page})=>{
  test.setTimeout(90000);
  const html=await readFile(new URL('../../play.html',import.meta.url),'utf8');
  const manifest=JSON.parse(await readFile(new URL('../../public/scene/panoramas/sources.json',import.meta.url),'utf8'));
  await page.route('**/*',route=>route.request().url()==='http://127.0.0.1/standalone'?route.fulfill({contentType:'text/html',body:html}):route.abort());
  await page.goto('http://127.0.0.1/standalone');
  const result=await page.evaluate(async entries=>{
    const out=[];
    for(const entry of entries){
      const el=document.querySelector(entry.file.startsWith('regions-')?'.region-art':entry.file.startsWith('dungeons-')?'#scene>.type-background':'.battle-floor');
      const atlas=entry.file.match(/-(\d+)\.png/);if(atlas)el.dataset.atlas=atlas[1];
      const img=new Image();img.src=getComputedStyle(el).backgroundImage.slice(5,-2);await img.decode();
      const bytes=await (await fetch(img.src)).arrayBuffer();const digest=await crypto.subtle.digest('SHA-256',bytes);
      out.push({file:entry.file,width:img.naturalWidth,height:img.naturalHeight,embedded:img.src.startsWith('data:image/png;base64,'),sha256:[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('')});
    }
    return out;
  },manifest);
  expect(result).toEqual(manifest.map(({file,width,height,sha256})=>({file,width,height,sha256,embedded:true})));
});
