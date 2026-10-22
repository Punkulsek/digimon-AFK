import {test,expect} from '@playwright/test';
test('성장, 편성, 10회 소환 및 새로고침 저장 복원',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await page.locator('[data-action="auto"]').click();
 await page.locator('.nav-button[data-action="collection"]').click();
 await page.locator('.collection-grid .pokemon-card').first().click();
 await page.locator('[data-action="level"]').click();
 await expect(page.getByRole('heading',{name:'Lv. 2 / 100'})).toBeVisible();
 await page.locator('[data-action="party"]').click();await page.keyboard.press('Escape');
 await expect(page.locator('#party-count')).toHaveText('5 / 6');
 await page.locator('.nav-button[data-action="summon"]').click();
 await page.locator('[data-action="draw"][data-count="10"]').click();
 await expect(page.locator('.result-grid .pokemon-card')).toHaveCount(10);
 await page.locator('.result-confirm').click();await page.locator('[data-action="draw"][data-count="10"]').click();
 await expect(page.getByRole('status')).toContainText('다이아가 부족');
 await page.keyboard.press('Escape');
 const before=await page.evaluate(()=>localStorage.getItem('pokemon-days-v1'));
 await page.reload();await expect(page.locator('#gems')).toHaveText('900');
 expect(await page.evaluate(()=>localStorage.getItem('pokemon-days-v1'))).toEqual(before);
 await expect(page.locator('#party-count')).toHaveText('5 / 6');
 await page.locator('.nav-button[data-action="stages"]').click();await expect(page.locator('.stage-node')).toHaveCount(20);
 expect(errors).toEqual([]);
});
test('16:9 PC 화면과 모바일 화면의 가로 넘침 없음',async({page})=>{
 await page.goto('/');
 const size=await page.locator('.game-shell').boundingBox();expect(size.width/size.height).toBeCloseTo(16/9,2);
 for(const viewport of [{width:844,height:390},{width:390,height:844}]){await page.setViewportSize(viewport);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});
