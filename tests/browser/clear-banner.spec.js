import {test,expect} from '@playwright/test';import {initialState} from '../../src/game.js';
test('regional boss clear shows comic ribbon then continues next region',async({page})=>{
 const s=initialState();s.stage=20;s.kills=10;s.speed=3;s.inventory.forEach(p=>p.level=100);
 await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),s);await page.goto('/');
 await expect(page.locator('#stage-transition.visible')).toBeVisible({timeout:15000});
 await expect(page.locator('.clear-ribbon strong')).toHaveText('클리어!');await expect(page.locator('.clear-ribbon span')).toContainText('회색체육관');
 await page.screenshot({path:'/tmp/stage-clear-banner.png'});
 await expect(page.locator('#stage-transition')).not.toHaveClass(/visible/,{timeout:4000});await expect(page.locator('#stage-number')).toHaveText('2-1');
});
