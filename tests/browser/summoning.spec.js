import {initialState} from '../../src/game.js';
import {test,expect} from '@playwright/test';
test('전체화면 소환·30회·건너뛰기·확률·저장·홈 복귀',async({page})=>{
 await page.goto('/');await page.locator('.nav-button[data-action="summon"]').click();await expect(page.locator('#summon-page')).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.locator('[data-action="draw"][data-count="30"]').click();await page.locator('[data-action="skipSummon"]').click();await expect(page.locator('#summon-page .pokemon-card')).toHaveCount(30);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1')).gems)).toBe(7000);await expect(page.locator('#summon-page')).not.toContainText('보유 다이아');
 await page.locator('.result-confirm').click();await page.locator('[data-action="draw"][data-count="1"]').click();await page.locator('[data-action="skipSummon"]').click();await expect(page.locator('#summon-page .pokemon-card')).toHaveCount(1);
 await page.locator('.result-confirm').click();await page.locator('[data-action="summonRates"]').click();await expect(page.locator('.summon-rates-modal')).toContainText('SSR+');for(let n=1;n<10;n++)await page.getByRole('button',{name:'다음 소환 레벨'}).click();await expect(page.locator('.rate-level-picker b')).toHaveText('Lv.10');await expect(page.locator('.rate-grades')).toContainText('0.05%');await page.getByRole('button',{name:'닫기',exact:true}).click();await expect(page.locator('.pokemon-ensemble')).toBeVisible();
 await page.locator('.nav-button[data-action="home"]').click();await expect(page.locator('#summon-page')).toHaveCount(0);
 await page.reload();const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1')));expect(s.gems).toBe(6900);expect(s.summons).toBe(31);expect(s.inventory.length+Object.values(s.shards).reduce((a,b)=>a+b,0)).toBe(37);
});

for(const [width,height] of [[1920,1080],[844,390]])test(`소환 배너와 버튼 화면 배치 ${width}`,async({page})=>{
 await page.setViewportSize({width,height});await page.goto('/');await page.locator('.nav-button[data-action="summon"]').click();
 await expect(page.locator('.pokemon-ensemble')).toBeVisible();expect(await page.locator('.pokemon-ensemble').evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('pokemon-ensemble.png');
 for(const count of [1,10,30])await expect(page.locator(`[data-action="draw"][data-count="${count}"]`)).toBeInViewport();
 expect(await page.locator('.pokemon-ensemble').evaluate(el=>getComputedStyle(el).backgroundSize)).toBe('contain');await page.screenshot({path:`/tmp/summon-lobby-${width}.png`});await page.locator('[data-action="summonRates"]').click();await expect(page.locator('.rate-pokemon-list')).toBeVisible();await page.screenshot({path:`/tmp/summon-rates-${width}.png`});
});
test('소환 가능 버튼만 노란색이며 레벨 게이지와 제목이 겹치지 않음',async({page})=>{
 await page.goto('/');await page.locator('.nav-button[data-action="summon"]').click();
 for(const count of [1,10,30]){const b=page.locator(`[data-action="draw"][data-count="${count}"]`);await expect(b).toBeEnabled();expect(await b.evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('255, 187, 10');}
 for(const [width,height] of [[1920,1080],[844,390]]){await page.setViewportSize({width,height});const level=await page.locator('.summon-level-strip').boundingBox(),title=await page.locator('.summon-lobby-title').boundingBox();expect(title.y).toBeGreaterThanOrEqual(level.y+level.height);}
 await page.addInitScript(s=>{s.gems=100;localStorage.setItem('pokemon-days-v1',JSON.stringify(s));},initialState());await page.reload();await page.locator('.nav-button[data-action="summon"]').click();
 await expect(page.locator('[data-count="1"][data-action="draw"]')).toBeEnabled();for(const count of [10,30]){const b=page.locator(`[data-action="draw"][data-count="${count}"]`);await expect(b).toBeDisabled();expect(await b.evaluate(el=>getComputedStyle(el).backgroundImage)).not.toContain('255, 187, 10');}
});
