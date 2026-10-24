import {test,expect} from '@playwright/test';
import {initialState} from '../../src/game.js';
import {STAGE_REGIONS} from '../../src/stages.js';
test('관동 20지역 배경 연결·원본 비율·전체화면 표시',async({page})=>{
 test.setTimeout(120000);
 const seed=initialState();seed.auto=false;
 await page.addInitScript(s=>{s.stage=Number(sessionStorage.getItem('test-region-stage')||1);localStorage.setItem('pokemon-days-v1',JSON.stringify(s));},seed);
 await page.goto('/');
 const seen=new Set();
 for(const r of STAGE_REGIONS){
   await page.evaluate(stage=>sessionStorage.setItem('test-region-stage',String(stage)),(r.id-1)*20+1);
   await page.reload();await expect(page.locator('#region-name')).toHaveText(r.name);
   const art=page.locator('.region-art');await expect(art).toBeVisible();await expect(art).toHaveAttribute('data-atlas',String(r.art.atlas));
   await expect(art).toHaveCSS('background-position',`${r.art.column*100}% ${r.art.row*100}%`);
   const decoded=await art.evaluate(async el=>{const image=new Image();image.src=getComputedStyle(el).backgroundImage.slice(5,-2);await image.decode();return [image.naturalWidth,image.naturalHeight];});expect(decoded).toEqual([1536,1024]);
   seen.add(`${r.art.atlas}:${r.art.column}:${r.art.row}`);
 }
 expect(seen.size).toBe(20);
 for(const size of [{width:1440,height:810},{width:844,height:390},{width:568,height:320},{width:390,height:844}]){
   await page.setViewportSize(size);const rect=await page.locator('.region-art').boundingBox();
   expect(rect.width/rect.height).toBeCloseTo(1.5,2);expect(rect.x).toBeLessThanOrEqual(0);expect(rect.y).toBeLessThanOrEqual(0);expect(rect.x+rect.width).toBeGreaterThanOrEqual(size.width-.1);expect(rect.y+rect.height).toBeGreaterThanOrEqual(size.height-.1);
 }
});
test('80→81 지역 전환과 던전 퇴장 시 새 배경 복원',async({page})=>{
 const seed=initialState();seed.stage=80;seed.kills=10;seed.auto=false;seed.speed=3;seed.inventory.forEach(p=>{p.level=100;p.breakthrough=10;});
 await page.addInitScript(s=>{if(!localStorage.getItem('pokemon-days-v1'))localStorage.setItem('pokemon-days-v1',JSON.stringify(s));},seed);
 await page.goto('/');await expect(page.locator('.region-art')).toHaveAttribute('data-atlas','1');
 await page.locator('#hud-boss-button').click();await expect(page.locator('#stage-number')).toHaveText('5-1');await expect(page.locator('.region-art')).toHaveAttribute('data-atlas','2');await expect(page.locator('.region-art')).toHaveCSS('background-position','0% 0%');
 await page.locator('.nav-button[data-action="dungeons"]').click();await page.locator('[data-dungeon="coin"]').click();await page.getByRole('button',{name:'던전 입장'}).click();await expect(page.locator('.region-art')).toBeHidden();await expect(page.locator('#scene')).toHaveAttribute('data-dungeon','coin');
 await page.locator('.nav-button[data-action="home"]').click();await expect(page.locator('.region-art')).toBeVisible();await expect(page.locator('.region-art')).toHaveAttribute('data-atlas','2');await expect(page.locator('#scene')).toHaveCSS('filter','none');
});
