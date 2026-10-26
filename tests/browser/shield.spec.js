import {test,expect} from '@playwright/test';import {initialState} from '../../src/game.js';
for(const size of [{width:1440,height:810},{width:844,height:390}])test(`live shield overlay follows the HP track and expires ${size.width}`,async({page})=>{
 await page.setViewportSize(size);const errors=[];page.on('pageerror',e=>errors.push(e.message));const s=initialState();s.stage=20;s.speed=3;s.autoBoss=false;s.upgrades.hp=1000;
 await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),s);await page.goto('/');
 const shield=page.locator('#fighter-starter-2 .shield-gauge');await expect(shield).toBeHidden();await expect(shield).toBeVisible({timeout:20000});
 expect(Number(await shield.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
 const {box,hp}=await shield.evaluate(el=>({box:el.getBoundingClientRect().toJSON(),hp:el.parentElement.getBoundingClientRect().toJSON()}));expect(box.width).toBeGreaterThan(0);expect(box.x).toBeGreaterThanOrEqual(hp.x);expect(box.x+box.width).toBeLessThanOrEqual(hp.x+hp.width+1);expect(box.height).toBeLessThanOrEqual(hp.height);
 await page.screenshot({path:`/tmp/shield-${size.width}.png`});
 await expect(shield).toBeHidden({timeout:12000});expect(Number(await shield.getAttribute('aria-valuenow'))).toBe(0);expect(errors).toEqual([]);
});
