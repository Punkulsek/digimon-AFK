import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {initialState} from '../../src/game.js';
const seed=()=>{const s=initialState();s.stage=20;s.speed=3;s.autoBoss=false;s.upgrades.hp=1000;return s;};
for(const size of [{width:1440,height:810},{width:844,height:390}])test(`skills gauges, effects and detail ${size.width}`,async({page})=>{
 await page.setViewportSize(size);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(s=>{if(!localStorage.getItem('pokemon-days-v1'))localStorage.setItem('pokemon-days-v1',JSON.stringify(s));},seed());await page.goto('/');
 await expect(page.locator('.skill-gauge')).toHaveCount(10);
 await expect.poll(async()=>Number(await page.locator('#fighters .skill-gauge').first().getAttribute('aria-valuenow'))).toBeGreaterThan(0);
 await expect(page.locator('.skill-cast-name').first()).toBeVisible({timeout:12000});
 await expect(page.locator('.skill-beam')).toHaveCount(0);
 const bars=await page.locator('[data-unit-id]').evaluateAll(units=>units.map(u=>{const hp=u.querySelector('.hp-track,.enemy-hp').getBoundingClientRect(),g=u.querySelector('.skill-gauge').getBoundingClientRect();return Math.abs(hp.width-g.width)<1&&Math.abs(hp.height-g.height)<1;}));expect(bars.every(Boolean)).toBe(true);
 await expect(page.locator('.effect-badge').first()).toBeVisible({timeout:5000});
 await page.screenshot({path:`/tmp/skills-${size.width}.png`});
 await page.locator('.nav-button[data-action="collection"]').click();await page.locator('.collection-grid [data-id="starter-1"]').click();
 await expect(page.locator('.pokemon-skill-detail')).toContainText('불꽃세례');await expect(page.locator('.pokemon-skill-detail')).toContainText('9초');await expect(page.locator('.pokemon-skill-detail')).toContainText('170%');
 await page.reload();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1')));expect(saved.inventory).toHaveLength(6);expect(saved.upgrades.hp).toBe(1000);expect(errors).toEqual([]);
});
test('standalone contains and loads effects without external requests',async({page})=>{
 const html=await readFile('play.html','utf8'),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().url()==='http://127.0.0.1:5173/offline-skills'?route.fulfill({contentType:'text/html',body:html}):route.abort());
 await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),seed());await page.goto('/offline-skills');
 await expect(page.locator('.skill-gauge')).toHaveCount(10);await expect(page.locator('.skill-cast-name').first()).toBeVisible({timeout:12000});
 const count=await page.evaluate(()=>Object.keys(window.POKEMON_EFFECTS).length);expect(count).toBe(10);expect(errors).toEqual([]);
});
