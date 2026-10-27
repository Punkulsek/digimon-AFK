import {test,expect} from '@playwright/test';
import {initialState} from '../../src/game.js';
test('preset switches update equipped cards and save independently',async({page})=>{
 const s=initialState();s.auto=false;await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),s);await page.goto('/');await page.locator('.nav-button[data-action="collection"]').click();await page.locator('[data-action="formation"]').click();
 await page.locator('[data-slot="0"]').click();await page.locator('.collection-grid [data-id="starter-5"]').click();
 await page.locator('[data-preset="1"]').click();await expect(page.locator('[data-slot="0"]')).toHaveAttribute('aria-label',/이상해씨/);
 await page.locator('[data-preset="0"]').click();await expect(page.locator('[data-slot="0"]')).toHaveAttribute('aria-label',/이브이/);
 await expect(page.locator('.party-slot.occupied')).toHaveCount(5);await page.screenshot({path:'/tmp/party-presets.png'});
});
