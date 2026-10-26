import {test,expect} from '@playwright/test';import {initialState} from '../../src/game.js';
async function seed(page){const s=initialState();s.auto=false;s.stage=80;s.gold=321;s.gems=456;s.candies=99;s.summons=350;s.upgrades.atk=20;s.inventory[0].level=40;await page.addInitScript(s=>{if(!localStorage.getItem('pokemon-days-v1')){localStorage.setItem('pokemon-days-v1',JSON.stringify(s));localStorage.setItem('pokemon-days-audio-v1',JSON.stringify({music:false,effects:false,musicVolume:17,effectsVolume:23}));localStorage.setItem('unrelated-data','keep');}},s);await page.goto('/');await page.getByRole('button',{name:'설정',exact:true}).click();await page.locator('[data-action="resetPrompt"]').click();}
test('reset requires explicit confirmation, cancel preserves progress and reset survives reload',async({page})=>{
 await seed(page);await expect(page.locator('[data-action="resetConfirm"]')).toBeDisabled();await page.getByLabel('계속하려면', {exact:false}).fill('초기');await expect(page.locator('[data-action="resetConfirm"]')).toBeDisabled();await page.getByRole('button',{name:'취소',exact:true}).click();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1')).stage)).toBe(80);
 await page.locator('[data-action="resetPrompt"]').click();await page.locator('#reset-confirm-text').fill('초기화');await Promise.all([page.waitForEvent('load'),page.locator('[data-action="resetConfirm"]').click()]);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1')));expect(saved).toEqual(initialState());
 await page.reload();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1')).stage)).toBe(1);
 expect(await page.evaluate(()=>localStorage.getItem('unrelated-data'))).toBe('keep');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-audio-v1')).musicVolume)).toBe(17);
});
test('storage failure leaves the existing save and dialog intact',async({page})=>{
 await seed(page);await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new Error('blocked');};});await page.locator('#reset-confirm-text').fill('초기화');await page.locator('[data-action="resetConfirm"]').click();await expect(page.locator('#reset-error')).toContainText('초기화하지 못했습니다');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1')).stage)).toBe(80);
});
