import {test,expect} from '@playwright/test';
test('전체화면 소환·30회·건너뛰기·확률·저장·홈 복귀',async({page})=>{
 await page.goto('/');await page.locator('.nav-button[data-action="summon"]').click();await expect(page.locator('#summon-page')).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.locator('[data-action="draw"][data-count="30"]').click();await page.locator('[data-action="skipSummon"]').click();await expect(page.locator('#summon-page .pokemon-card')).toHaveCount(30);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1')).gems)).toBe(7000);await expect(page.locator('#summon-page')).not.toContainText('보유 다이아');
 await page.locator('.result-confirm').click();await page.locator('[data-action="draw"][data-count="1"]').click();await page.locator('[data-action="skipSummon"]').click();await expect(page.locator('#summon-page .pokemon-card')).toHaveCount(1);
 await page.locator('.result-confirm').click();await page.locator('[data-action="summonRates"]').click();await expect(page.locator('#summon-page')).toContainText('SSR+');await expect(page.locator('#summon-page tbody tr')).toHaveCount(10);
 await page.locator('.nav-button[data-action="home"]').click();await expect(page.locator('#summon-page')).toHaveCount(0);
 await page.reload();const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1')));expect(s.gems).toBe(6900);expect(s.summons).toBe(31);expect(s.inventory.length+Object.values(s.shards).reduce((a,b)=>a+b,0)).toBe(37);
});

for(const [width,height] of [[1440,810],[844,390]])test(`소환 배너와 버튼 화면 배치 ${width}`,async({page})=>{
 await page.setViewportSize({width,height});await page.goto('/');await page.locator('.nav-button[data-action="summon"]').click();
 await expect(page.locator('.pokemon-ensemble')).toBeVisible();expect(await page.locator('.pokemon-ensemble').evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('pokemon-ensemble.png');
 for(const count of [1,10,30])await expect(page.locator(`[data-action="draw"][data-count="${count}"]`)).toBeInViewport();
 await page.screenshot({path:`/tmp/summon-lobby-${width}.png`});
});
