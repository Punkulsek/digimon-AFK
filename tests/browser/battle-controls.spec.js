import {test,expect} from '@playwright/test';
import {initialState} from '../../src/game.js';
test('report opens with live party data and speed controls share persisted settings',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const s=initialState();s.auto=false;
 await page.addInitScript(s=>{if(!localStorage.getItem('pokemon-days-v1'))localStorage.setItem('pokemon-days-v1',JSON.stringify(s));},s);
 await page.goto('/');await expect(page.locator('.stage-speed')).toHaveText('1배');
 await page.locator('.stage-speed').click();await expect(page.locator('.stage-speed')).toHaveText('1.5배');await page.reload();await expect(page.locator('.stage-speed')).toHaveText('1.5배');
 await page.getByRole('button',{name:'설정',exact:true}).click();await expect(page.locator('[data-action="settingSpeed"]')).toHaveText('1.5×');await page.locator('[data-action="settingSpeed"]').click();await expect(page.locator('.stage-speed')).toHaveText('2배');
 await page.screenshot({path:'/tmp/new-settings.png'});await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.locator('.stage-speed').click();await expect(page.locator('.stage-speed')).toHaveText('1배');
 await page.getByRole('button',{name:'딜량표',exact:true}).click();await expect(page.locator('.report-meter-row')).toHaveCount(5);await expect(page.locator('.report-tabs')).toContainText('받은 회복량');
 await expect(page.locator('.modal')).toHaveCount(0);await page.getByRole('tab',{name:'받은 피해',exact:true}).click();await expect(page.locator('#battle-report-panel')).toHaveAttribute('data-metric','taken');await page.getByRole('tab',{name:'딜량',exact:true}).click();await page.screenshot({path:'/tmp/new-report.png'});
 await page.getByRole('button',{name:'딜량표 접기',exact:true}).click();await expect(page.locator('#battle-report-panel')).toHaveCount(0);await page.getByRole('button',{name:'설정',exact:true}).click();await page.locator('[data-action="settingAuto"]').click();await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.getByRole('button',{name:'딜량표',exact:true}).click();await expect.poll(async()=>Number((await page.locator('.report-meter-data strong').first().textContent()).split(' ')[0].replaceAll(',','')),{timeout:10000}).toBeGreaterThan(0);
 expect(errors).toEqual([]);
});
