import {test,expect} from '@playwright/test';import {initialState} from '../../src/game.js';
test('formation mode edits party without opening details and normal mode restores details',async({page})=>{const s=initialState();s.auto=false;await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),s);await page.goto('/');await page.locator('.nav-button[data-action="collection"]').click();await page.locator('[data-action="formation"]').click();
 const card=id=>page.locator(`.collection-grid [data-id="${id}"]`);
 await card('starter-5').click();await expect(page.locator('.modal')).toHaveCount(0);await expect(page.locator('#party-count')).toHaveText('5 / 5');
 await card('starter-0').click();await expect(page.locator('#party-count')).toHaveText('4 / 5');await expect(page.locator('.modal')).toHaveCount(0);await card('starter-5').click();await expect(page.locator('#party-count')).toHaveText('5 / 5');
 await page.locator('[data-action="slot"][data-slot="0"]').click();await expect(page.locator('.modal')).toHaveCount(0);await card('starter-0').click();await expect(page.locator('.modal')).toHaveCount(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1')).party[0])).toBe('starter-0');
 await page.locator('[data-action="formation"]').click();await card('starter-0').click();await expect(page.locator('.detail-modal')).toBeVisible();});
