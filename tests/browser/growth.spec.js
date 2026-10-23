import {test,expect} from '@playwright/test';
import {initialState} from '../../src/game.js';
test('진화 확인·자동 돌파·5개 별 색상 및 새로고침 저장',async({page})=>{
 const s=initialState();s.auto=false;s.stage=61;s.materials.fire=150;s.inventory[1].level=40;s.inventory[1].breakthrough=5;
 s.inventory.push(...Array.from({length:6},(_,j)=>({uid:`copy-${j}`,speciesId:5,level:1,breakthrough:0})));
 await page.addInitScript(s=>{if(!localStorage.getItem('pokemon-days-v1'))localStorage.setItem('pokemon-days-v1',JSON.stringify(s));},s);
 await page.goto('/');await page.locator('[data-action="collection"]').first().click();
 await page.locator('.collection-grid [data-id="starter-1"]').click();
 await page.locator('[data-action="evolvePreview"]').click();await page.locator('[data-action="evolveConfirm"]').click();
 await expect(page.locator('.modal-header')).toContainText('리자드');
 await page.locator('[data-action="breakthroughConfirm"]').click();
 await expect(page.locator('.growth-panel')).toContainText('돌파 6 / 10');
 await expect(page.locator('.growth-panel .growth-stars > span')).toHaveCount(5);
 await expect(page.locator('.growth-panel .growth-stars .purple')).toHaveCount(1);
 await expect(page.locator('.growth-panel .growth-stars .gold')).toHaveCount(4);
 await page.reload();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1')));
 expect(saved.inventory.find(p=>p.uid==='starter-1')).toMatchObject({speciesId:5,level:40,breakthrough:6});expect(saved.materials.fire).toBe(0);expect(saved.inventory).toHaveLength(6);expect(saved.party).toEqual(s.party);
});
