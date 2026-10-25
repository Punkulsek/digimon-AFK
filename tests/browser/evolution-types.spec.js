import {test,expect} from '@playwright/test';import {initialState} from '../../src/game.js';import {EVOLUTION_TYPES} from '../../src/dungeon-config.js';
test('all 18 type banners scroll and unique backgrounds reach battle',async({page})=>{
 await page.setViewportSize({width:844,height:390});const s=initialState();s.auto=false;
 await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),s);await page.goto('/');await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
 const seen=new Set();
 for(const t of EVOLUTION_TYPES){await page.locator('.nav-button[data-action="dungeons"]').click();await page.locator('[data-dungeon="evolution"]').click();await expect(page.locator('.type-dungeon')).toHaveCount(18);
 const button=page.locator(`[data-dungeon="evolution-${t.id}"]`);await button.scrollIntoViewIfNeeded();await expect(button).toBeInViewport();await button.click();
 await expect(page.locator('.challenge-hero .type-background')).toBeVisible();await page.locator('[data-action="dungeonEnter"]').click();const bg=page.locator('#scene > .type-background');await expect(bg).toBeVisible();
 const value=await bg.evaluate(async el=>{const style=getComputedStyle(el),img=new Image();img.src=style.backgroundImage.slice(5,-2);await img.decode();if(!img.naturalWidth)throw Error('No image');return style.backgroundImage+style.backgroundPosition;});seen.add(value);
 await page.locator('.nav-button[data-action="home"]').click();await expect(bg).toBeHidden();await expect(page.locator('.region-art')).toBeVisible();}
 expect(seen.size).toBe(18);
});
test('dual evolution lists both materials, prevents partial payment, then saves both deductions',async({page})=>{
 const s=initialState();s.auto=false;s.stage=161;s.materials.fire=700;s.materials.flying=599;s.inventory[1].speciesId=5;s.inventory[1].level=80;
 await page.addInitScript(s=>{if(!localStorage.getItem('pokemon-days-v1'))localStorage.setItem('pokemon-days-v1',JSON.stringify(s));},s);await page.goto('/');await page.locator('.nav-button[data-action="collection"]').click();await page.locator('.collection-grid [data-id="starter-1"]').click();
 await expect(page.locator('.evolution-option')).toContainText('불꽃 진화 재료 600개');await expect(page.locator('.evolution-option')).toContainText('비행 진화 재료 600개');await expect(page.locator('[data-action="evolvePreview"]')).toBeDisabled();
 await page.addInitScript(()=>{const s=JSON.parse(localStorage.getItem('pokemon-days-v1'));s.materials.flying=650;localStorage.setItem('pokemon-days-v1',JSON.stringify(s));});await page.reload();await page.locator('.nav-button[data-action="collection"]').click();await page.locator('.collection-grid [data-id="starter-1"]').click();await page.locator('[data-action="evolvePreview"]').click();await expect(page.locator('.modal-body')).toContainText('불꽃 진화 재료 600개 + 비행 진화 재료 600개');await page.locator('[data-action="evolveConfirm"]').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1')));expect(saved.materials.fire).toBe(100);expect(saved.materials.flying).toBe(50);expect(saved.inventory[1].speciesId).toBe(6);
});
