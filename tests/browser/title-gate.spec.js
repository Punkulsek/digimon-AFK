import {test,expect} from '@playwright/test';
test('start is hidden until Google authentication and waits for safe cloud load',async({page})=>{
 await page.route('**/title-gate',r=>r.fulfill({contentType:'text/html',body:'<div class="game-shell"></div>'}));await page.goto('/title-gate');
 await page.evaluate(async()=>{const {showTitle}=await import('/src/title.js');let fn;window.account={user:null,loading:false,canStart:false,ready:Promise.resolve(),subscribe(cb){fn=cb;return()=>{}},async login(){this.user={uid:'A'};this.loading=true;fn()},async retry(){fn()}};window.refreshTitle=()=>fn();showTitle({download:async()=>{},account:window.account,onStart:()=>window.started=true,getNotice:()=>window.notice||''});});
 await expect(page.locator('.title-start')).toBeHidden();await page.locator('.title-link').click();await expect(page.locator('.title-start')).toBeVisible();await expect(page.locator('.title-start')).toBeDisabled();await expect(page.locator('.title-link')).toBeHidden();
 await page.evaluate(()=>{window.account.loading=false;window.notice='permission-denied';window.refreshTitle()});await page.locator('.title-start').click();await expect(page.locator('.eternal-title')).toBeVisible();expect(await page.evaluate(()=>window.started)).toBeUndefined();
 await page.evaluate(()=>{window.account.canStart=true;window.notice='';window.refreshTitle()});await page.locator('.title-start').click();await expect(page.locator('.eternal-title')).toHaveCount(0);expect(await page.evaluate(()=>window.started)).toBe(true);
});
test('downloads and auth restoration independently gate both existing title buttons',async({page})=>{
 await page.route('**/title-download-test',r=>r.fulfill({contentType:'text/html',body:'<div class="game-shell"></div>'}));await page.goto('/title-download-test');
 await page.evaluate(async()=>{
  const {showTitle}=await import('/src/title.js');let fn,authResolve,downloadResolve;
  window.account={user:null,initializing:true,loading:true,canStart:false,ready:new Promise(r=>authResolve=r),subscribe(cb){fn=cb;return()=>{}},async login(){window.linked=true},async retry(){}};
  window.restore=()=>{account.user={uid:'A'};account.initializing=false;account.loading=false;account.canStart=true;authResolve();fn()};
  window.downloadDone=()=>downloadResolve();
  showTitle({account,onStart:()=>window.started=true,download:({onProgress})=>{window.progress=onProgress;return new Promise(r=>downloadResolve=r)}});
 });
 await expect(page.locator('.title-download')).toHaveAttribute('aria-valuenow','0');await expect(page.locator('.title-link')).toBeHidden();
 await page.evaluate(()=>{window.progress({percent:37});window.restore()});await expect(page.locator('.title-start')).toBeVisible();await expect(page.locator('.title-start')).toBeDisabled();
 await expect(page.locator('.title-download')).toHaveAttribute('aria-valuenow','37');
 await page.locator('.title-background').evaluate(i=>i.decode());await page.locator('.eternal-logo').evaluate(i=>i.decode());
 await page.screenshot({path:'/tmp/eternal-download-title.png',animations:'disabled'});
 await page.locator('.title-start').dispatchEvent('click');expect(await page.evaluate(()=>window.started)).toBeUndefined();
 await page.evaluate(()=>window.downloadDone());await expect(page.locator('.title-download')).toBeHidden();await page.locator('.title-start').click();expect(await page.evaluate(()=>window.started)).toBe(true);
});
