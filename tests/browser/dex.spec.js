import {test,expect} from '@playwright/test';import {initialState} from '../../src/game.js';
for(const [width,height] of [[1920,1080],[844,390]])test(`도감 상세와 읽기 전용 레벨 비교 ${width}`,async({page})=>{
 const s=initialState();s.auto=false;await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),s);await page.setViewportSize({width,height});await page.goto('/');await page.locator('.nav-button[data-action="collection"]').click();await page.locator('[data-action="collectionTab"][data-tab="dex"]').click();await expect(page.locator('.dex-card')).toHaveCount(151);await page.locator('[data-action="dexDetail"][data-species="1"]').click();await expect(page.locator('.dex-flavor').first()).not.toBeEmpty();await page.locator('[data-action="dexTab"][data-tab="1"]').click();await expect(page.locator('.dex-stat-grid>div')).toHaveCount(11);await page.locator('[data-action="dexTab"][data-tab="2"]').click();await expect(page.locator('[data-dex-panel="2"]')).toContainText('초');await page.locator('[data-action="dexTab"][data-tab="3"]').click();
 await page.locator('#dex-level').fill('100');await page.locator('#dex-compare').fill('50');await expect(page.locator('#dex-current-heading')).toHaveText('Lv.100');await expect(page.locator('#dex-compare-heading')).toHaveText('Lv.50');await expect(page.locator('#dex-stat-rows tr')).toHaveCount(11);await expect(page.locator('#dex-stat-rows .increase').first()).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1')).inventory)).toEqual(s.inventory);await page.screenshot({path:`/tmp/dex-${width}.png`});await page.getByRole('button',{name:'닫기',exact:true}).click();await expect(page.locator('.dex-card')).toHaveCount(151);
});

test('포켓몬 하위 메뉴와 도감 번호·실루엣·관계·내부 스크롤',async({page})=>{
 const s=initialState();s.auto=false;
 await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),s);
 await page.goto('/');await page.locator('.nav-button[data-action="collection"]').click();
 const party=await page.locator('.party-header').boundingBox();
 const sub=page.locator('.collection-subnav');await expect(sub.getByRole('button')).toHaveCount(2);
 const rects=await sub.getByRole('button').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().width));expect(rects[0]).toBe(rects[1]);
 await sub.getByRole('button',{name:'도감',exact:true}).click();
 await expect(page.locator('.dex-card')).toHaveCount(151);await expect(page.locator('.dex-card.undiscovered')).toHaveCount(145);
 await expect(page.locator('.dex-header')).toContainText('6 / 151');
 const ids=await page.locator('.dex-card').evaluateAll(ns=>ns.map(n=>Number(n.dataset.species)));expect(ids).toEqual(Array.from({length:151},(_,j)=>j+1));
 await page.locator('.dex-card[data-species="4"]').click();await expect(page.getByRole('dialog')).toContainText('불꽃');await expect(page.getByRole('dialog')).toContainText('리자드 → 리자몽');await page.getByRole('button',{name:'닫기',exact:true}).click();
 await expect(page.locator('.dex-header')).toBeVisible();
 for(const viewport of [{width:1440,height:810},{width:844,height:390}]) {
 await page.setViewportSize(viewport);await page.locator('.dex-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);
 const last=await page.locator('.dex-card').last().boundingBox(),bar=await sub.boundingBox();expect(last.y+last.height).toBeLessThanOrEqual(bar.y);
 }
 await page.setViewportSize({width:1440,height:810});await sub.getByRole('button',{name:'포켓몬',exact:true}).click();expect(await page.locator('.party-header').boundingBox()).toEqual(party);
 await page.locator('.nav-button[data-action="home"]').click();await expect(sub).toBeHidden();await expect(page.locator('.nav-button')).toHaveText(['포켓몬','✦강화','홈','던전','소환']);
});
