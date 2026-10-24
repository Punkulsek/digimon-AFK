import {test,expect} from '@playwright/test';
import {initialState} from '../../src/game.js';
test('repeated level ups keep detail layout and show unified grade',async({page})=>{
 const s=initialState();s.auto=false;s.candies=100;
 await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),s);
 await page.goto('/');await page.locator('.nav-button[data-action="collection"]').click();
 await page.locator('.collection-grid [data-id="starter-1"]').click();
 await expect(page.locator('.rarity-badge')).toContainText('SSR');
 await page.evaluate(()=>{window.originalDetail=document.querySelector('.detail-modal');window.originalLevelButton=document.querySelector('[data-action="level"]');window.originalSprite=document.querySelector('.detail-sprite');});
 const before=await page.locator('.modal').boundingBox();
 for(let n=0;n<5;n++)await page.locator('[data-action="level"]').click();
 await expect(page.locator('.detail-info h3')).toContainText('6');
 const after=await page.locator('.modal').boundingBox();
 expect(Math.abs(before.x-after.x)).toBeLessThan(2);expect(Math.abs(before.width-after.width)).toBeLessThan(2);
 await expect(page.locator('.modal')).toHaveCount(1);
 expect(await page.evaluate(()=>originalDetail===document.querySelector('.detail-modal')&&originalLevelButton===document.querySelector('[data-action="level"]')&&originalSprite===document.querySelector('.detail-sprite'))).toBe(true);
});
