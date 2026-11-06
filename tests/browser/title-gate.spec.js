import {test,expect} from '@playwright/test';
test('start is hidden until Google authentication and waits for safe cloud load',async({page})=>{
 await page.route('**/title-gate',r=>r.fulfill({contentType:'text/html',body:'<div class="game-shell"></div>'}));await page.goto('/title-gate');
 await page.evaluate(async()=>{const {showTitle}=await import('/src/title.js');let fn;window.account={user:null,loading:false,canStart:false,ready:Promise.resolve(),subscribe(cb){fn=cb;return()=>{}},async login(){this.user={uid:'A'};this.loading=true;fn()},async retry(){fn()}};window.refreshTitle=()=>fn();showTitle({account:window.account,onStart:()=>window.started=true,getNotice:()=>window.notice||''});});
 await expect(page.locator('.title-start')).toBeHidden();await page.locator('.title-link').click();await expect(page.locator('.title-start')).toBeVisible();await expect(page.locator('.title-start')).toBeDisabled();await expect(page.locator('.title-link')).toBeHidden();
 await page.evaluate(()=>{window.account.loading=false;window.notice='permission-denied';window.refreshTitle()});await page.locator('.title-start').click();await expect(page.locator('.eternal-title')).toBeVisible();expect(await page.evaluate(()=>window.started)).toBeUndefined();
 await page.evaluate(()=>{window.account.canStart=true;window.notice='';window.refreshTitle()});await page.locator('.title-start').click();await expect(page.locator('.eternal-title')).toHaveCount(0);expect(await page.evaluate(()=>window.started)).toBe(true);
});
