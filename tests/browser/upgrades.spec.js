import {test,expect} from '@playwright/test';import {initialState} from '../../src/game.js';
test('upgrade menu purchase persists and navigation closes page',async({page})=>{
 const s=initialState();s.auto=false;await page.addInitScript(s=>{if(!localStorage.getItem('pokemon-days-v1'))localStorage.setItem('pokemon-days-v1',JSON.stringify(s));},s);await page.goto('/');
 await expect(page.locator('.nav-button')).toHaveCount(5);await page.locator('[data-action="upgrades"]').click();await expect(page.locator('.upgrade-grid article')).toHaveCount(3);
 await page.locator('[data-key="atk"][data-count="10"]').click();await expect(page.locator('.upgrade-grid article').first()).toContainText('Lv.10 · +5.0%');
 await page.reload();await page.locator('[data-action="upgrades"]').click();await expect(page.locator('.upgrade-grid article').first()).toContainText('Lv.10');
 await page.locator('.nav-button[data-action="home"]').click();await expect(page.locator('#upgrade-page')).toHaveCount(0);
});

test('upgrade drawer leaves battle running and occupies only bottom of screen',async({page})=>{
 const s=initialState();s.auto=true;s.speed=3;s.kills=9;
 await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),s);await page.goto('/');await page.locator('[data-action="upgrades"]').click();
 const box=await page.locator('#upgrade-page').boundingBox();expect(box.y).toBeGreaterThan(350);expect(box.height).toBeLessThan(300);
 await expect(page.locator('#fighters')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1')).totalKills),{timeout:15000}).toBeGreaterThan(0);
 await expect(page.locator('#upgrade-page')).toBeVisible();await page.locator('[data-action="upgrades"]').click();await expect(page.locator('#upgrade-page')).toHaveCount(0);
});
