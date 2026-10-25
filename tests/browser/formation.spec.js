import {test,expect} from '@playwright/test';
import {initialState} from '../../src/game.js';
for(const size of [{width:1440,height:810},{width:844,height:390}])test(`mirrored formations ${size.width}`,async({page})=>{
 await page.setViewportSize(size);const s=initialState();s.auto=false;
 await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),s);await page.goto('/');
 const allies=await page.locator('#fighters>.fighter').all(),enemies=await page.locator('#enemy>.enemy-unit').all();expect(enemies).toHaveLength(5);
 const a=await Promise.all(allies.map(e=>e.boundingBox())),b=await Promise.all(enemies.map(e=>e.boundingBox()));
 expect(a[0].x).toBeGreaterThan(a[3].x);expect(b[0].x).toBeLessThan(b[3].x);expect(a[0].y).toBeLessThan(a[1].y);expect(a[1].y).toBeLessThan(a[2].y);
 expect(Math.max(...a.map(r=>r.x+r.width))).toBeLessThan(Math.min(...b.map(r=>r.x)));
 await page.locator('#enemy').evaluate(el=>el.classList.add('boss-formation'));const boss=await enemies[0].boundingBox(),top=await enemies[1].boundingBox(),bottom=await enemies[2].boundingBox();expect(boss.y).toBeGreaterThan(top.y);expect(boss.y).toBeLessThan(bottom.y);
});
test('boss hit preserves dimensions and defeated enemies disappear',async({page})=>{
 const s=initialState();s.auto=false;await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),s);await page.goto('/');
 await page.locator('#enemy').evaluate(el=>{el.classList.add('boss-formation');el.querySelector('.enemy').classList.add('boss');el.lastElementChild.classList.add('fainted');});
 await expect(page.locator('#enemy>.enemy-unit').last()).toBeHidden();
 const art=page.locator('#enemy .boss .field-art'),before=await art.boundingBox();
 await page.locator('#enemy .boss').evaluate(el=>el.classList.add('hit'));await page.waitForTimeout(150);
 const after=await art.boundingBox();expect(after.width).toBeCloseTo(before.width,0);expect(after.height).toBeCloseTo(before.height,0);
 for(const group of ['#fighters>.fighter','#enemy>.enemy-unit']){const boxes=await Promise.all((await page.locator(group).all()).map(x=>x.boundingBox()));for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];expect(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y).toBe(true);}}
 await page.screenshot({path:'/tmp/compact-boss.png'});
});
