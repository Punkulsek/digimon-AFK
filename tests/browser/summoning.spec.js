import {test,expect} from '@playwright/test';
test('전체화면 소환·30회·건너뛰기·확률·저장·홈 복귀',async({page})=>{
 await page.goto('/');await page.locator('.nav-button[data-action="summon"]').click();await expect(page.locator('#summon-page')).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.locator('[data-action="draw"][data-count="30"]').click();await page.locator('[data-action="skipSummon"]').click();await expect(page.locator('#summon-page .pokemon-card')).toHaveCount(30);await expect(page.locator('#summon-page')).toContainText('7,000');
 await page.locator('.result-confirm').click();await page.locator('[data-action="draw"][data-count="1"]').click();await page.locator('[data-action="skipSummon"]').click();await expect(page.locator('#summon-page .pokemon-card')).toHaveCount(1);
 await page.locator('.result-confirm').click();await page.locator('[data-action="summonRates"]').click();await expect(page.locator('#summon-page')).toContainText('SSR+');await expect(page.locator('#summon-page tbody tr')).toHaveCount(10);
 await page.locator('.nav-button[data-action="home"]').click();await expect(page.locator('#summon-page')).toHaveCount(0);
 await page.reload();const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1')));expect(s.gems).toBe(6900);expect(s.summons).toBe(31);expect(s.inventory.length).toBe(37);
});
