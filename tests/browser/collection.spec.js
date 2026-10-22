import {test, expect} from '@playwright/test';
import {initialState, power} from '../../src/game.js';
import {species} from '../../src/data.js';

test('전체화면 관리, 고정 파티, 내부 스크롤, 정렬 및 슬롯 교체 저장', async ({page}) => {
  const saved=initialState(); saved.auto=false;
  for(let n=0;n<50;n++) saved.inventory.push({uid:`extra-${n}`,speciesId:n%2 ? 150 : 1,level:n+1});
  await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),saved);
  await page.goto('/');
  const nav=page.locator('.nav-button');
  const boxes=await nav.evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return {x:b.x,width:b.width};}));
  for(let n=1;n<3;n++) {expect(boxes[n].width).toBeCloseTo(boxes[0].width,1);expect(boxes[n].x).toBeCloseTo(boxes[n-1].x+boxes[n-1].width,1);}
  await page.locator('[data-action="collection"]').click();
  await expect(page.locator('#collection-page')).toBeVisible();
  await expect(page.locator('.adventure')).toBeHidden();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.party-slot')).toHaveCount(5);
  const before=await page.locator('.party-header').boundingBox();
  await page.locator('.collection-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);
  expect(await page.locator('.collection-scroll').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
  expect(await page.locator('.party-header').boundingBox()).toEqual(before);
  for(const key of ['level','rarity','power']) {
    await page.locator(`[data-sort="${key}"]`).click();
    const ids=await page.locator('.collection-grid .pokemon-card').evaluateAll(nodes=>nodes.map(n=>n.dataset.id));
    const values=ids.map(id=>{const p=saved.inventory.find(p=>p.uid===id);return key==='level'?p.level:key==='power'?power(p):species(p.speciesId).rarity;});
    expect(values).toEqual([...values].sort((a,b)=>b-a));
  }
  await page.locator('.party-slot').first().click();
  await page.getByRole('button',{name:'다른 포켓몬으로 교체'}).click();
  await page.locator('[data-action="assignSlot"][data-id="starter-5"]').click();
  await expect(page.locator('.party-slot').first()).toContainText('이브이');
  await page.locator('.party-slot').first().click();
  await page.getByRole('button',{name:'편성 해제',exact:true}).click();
  await expect(page.locator('.party-slot.empty')).toHaveCount(1);
  await page.locator('.party-slot.empty').click();
  await page.locator('[data-action="assignSlot"][data-id="starter-0"]').click();
  await expect(page.locator('#party-count')).toHaveText('5 / 5');
  const result=await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1')));
  expect(result.party).toEqual(['starter-1','starter-2','starter-3','starter-4','starter-0']);
  expect(result.inventory).toEqual(saved.inventory);
  for(const size of [{width:844,height:390},{width:568,height:320},{width:390,height:844}]) {
    await page.setViewportSize(size);
    const bar=await page.locator('.bottom-nav').boundingBox();
    expect(bar.x).toBe(0);
    expect(bar.width).toBe(size.width);
    expect(bar.y+bar.height).toBe(size.height);
    const buttons=await page.locator('.nav-button').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));
    expect(Math.max(...buttons)-Math.min(...buttons)).toBeLessThan(1);
    const scroll=await page.locator('.collection-scroll').boundingBox();
    expect(scroll.height).toBeGreaterThan(35);
    const party=await page.locator('.party-header').boundingBox();
    await page.locator('.collection-scroll').evaluate(el=>el.scrollTop=0);
    expect(await page.locator('.party-header').boundingBox()).toEqual(party);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator('.collection-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);
    const last=await page.locator('.collection-grid .pokemon-card').last().boundingBox();
    expect(last.y+last.height).toBeLessThanOrEqual(bar.y);
  }
  await page.locator('.nav-button[data-action="home"]').click();
  await expect(page.locator('#collection-page')).toBeHidden();
  await expect(page.locator('.adventure')).toBeVisible();
});
