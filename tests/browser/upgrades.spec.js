import {test,expect} from '@playwright/test';import {initialState} from '../../src/game.js';
test('upgrade menu purchase persists and navigation closes page',async({page})=>{
 const s=initialState();s.auto=false;await page.addInitScript(s=>{if(!localStorage.getItem('pokemon-days-v1'))localStorage.setItem('pokemon-days-v1',JSON.stringify(s));},s);await page.goto('/');
 await expect(page.locator('.nav-button')).toHaveCount(5);await page.locator('[data-action="upgrades"]').click();await expect(page.locator('.upgrade-grid article')).toHaveCount(3);
 await page.locator('[data-key="atk"][data-count="10"]').click();await expect(page.locator('.upgrade-grid article').first()).toContainText('Lv.10 · +5.0%');
 await page.reload();await page.locator('[data-action="upgrades"]').click();await expect(page.locator('.upgrade-grid article').first()).toContainText('Lv.10');
 await page.locator('.nav-button[data-action="home"]').click();await expect(page.locator('#upgrade-page')).toHaveCount(0);
});
