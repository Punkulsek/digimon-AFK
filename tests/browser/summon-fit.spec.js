import {test,expect} from '@playwright/test';
for(const [width,height] of [[1920,1080],[1280,720],[844,390]])test(`30 cards fit ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});await page.goto('/');await page.locator('.nav-button[data-action="summon"]').click();await page.locator('[data-action="draw"][data-count="30"]').click();await page.locator('.video-skip').click();await page.locator('.reveal-all').click();await expect(page.locator('.summon-result-card')).toHaveCount(30);
 const layout=await page.locator('.result-reveal-scroll').evaluate(el=>{const r=el.getBoundingClientRect();return {fits:el.scrollHeight<=el.clientHeight+1,cards:[...el.querySelectorAll('.summon-result-card')].every(c=>{const b=c.getBoundingClientRect();return b.top>=r.top&&b.bottom<=r.bottom+1&&b.left>=r.left&&b.right<=r.right+1;})};});expect(layout).toEqual({fits:true,cards:true});await page.screenshot({path:`/tmp/summon-fit-${width}.png`,animations:'disabled'});
});
