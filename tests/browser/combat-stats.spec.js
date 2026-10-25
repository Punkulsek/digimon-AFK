import {test,expect} from '@playwright/test';
import {initialState} from '../../src/game.js';
for(const viewport of [{width:1440,height:810},{width:844,height:390}])test(`eleven stats and stable growth dossier ${viewport.width}`,async({page})=>{
 await page.setViewportSize(viewport);const s=initialState();s.auto=false;s.candies=100;
 await page.addInitScript(s=>{if(!localStorage.getItem('pokemon-days-v1'))localStorage.setItem('pokemon-days-v1',JSON.stringify(s));},s);
 await page.goto('/');await page.locator('.nav-button[data-action="collection"]').click();await page.locator('.collection-grid [data-id="starter-1"]').click();
 await expect(page.locator('[data-stat]')).toHaveCount(11);await expect(page.locator('[data-stat="critChance"]')).toHaveText('5%');await expect(page.locator('[data-stat="critDamage"]')).toHaveText('150%');
 const before=await page.locator('[data-stat="atk"]').innerText();await page.locator('[data-action="level"]').click();await expect(page.locator('[data-stat="atk"]')).not.toHaveText(before);
 const overflow=await page.locator('.detail-modal').evaluate(el=>el.scrollWidth>el.clientWidth+1);expect(overflow).toBe(false);
 await page.screenshot({path:`/tmp/stats-${viewport.width}.png`});
 await page.reload();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1')));expect(saved.inventory[1].level).toBe(2);expect(saved.inventory).toHaveLength(6);
});
