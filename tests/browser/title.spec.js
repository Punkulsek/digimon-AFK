import {test,expect} from '@playwright/test';
import {initialState} from '../../src/game.js';
test('unlinked title preserves progress and hides game entry',async({page})=>{
 await page.route('**/auth-config.json',r=>r.fulfill({json:{}}));
 const s=initialState();s.stage=45;s.gold=45678;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(s=>{if(!localStorage.getItem('pokemon-days-v1'))localStorage.setItem('pokemon-days-v1',JSON.stringify(s));},s);
 await page.setViewportSize({width:1920,height:1080});await page.goto('/');
 await expect(page.locator('.eternal-title')).toBeVisible();await expect(page.locator('.eternal-logo')).toBeVisible();
 expect(await page.locator('.eternal-logo').evaluate(async im=>{await im.decode();return im.naturalWidth>0})).toBe(true);
 expect(await page.locator('audio[data-title-bgm]').evaluate(a=>a.loop)).toBe(true);
 const kills=await page.locator('#boss-gauge').getAttribute('aria-valuenow');await page.waitForTimeout(1200);await expect(page.locator('#boss-gauge')).toHaveAttribute('aria-valuenow',kills);
 await expect(page.locator('.title-start')).toBeHidden();
 await page.locator('.title-link').click();await expect(page.locator('.title-message')).toContainText('설정');
 await expect(page.locator('.eternal-title')).toBeVisible();expect(errors).toEqual([]);
});

test('standalone title embeds the supplied assets without network',async({page})=>{
 const {createServer}=await import('node:http'),{createReadStream}=await import('node:fs');
 const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');createReadStream(new URL('../../play.html',import.meta.url)).pipe(res)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/`;
 await page.route(/^https?:\/\//,r=>r.request().url()===url?r.continue():r.abort());
 try{await page.goto(url);await expect(page.locator('.eternal-title')).toBeVisible();expect(await page.locator('.eternal-logo').evaluate(async i=>{await i.decode();return i.src.startsWith('data:')&&i.naturalWidth>0})).toBe(true);expect(await page.locator('audio[data-title-bgm]').evaluate(a=>a.src.startsWith('data:audio/'))).toBe(true);await expect(page.locator('.title-start')).toBeHidden();}finally{await new Promise(r=>server.close(r))}
});
