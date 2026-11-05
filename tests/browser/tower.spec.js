import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {initialState} from '../../src/game.js';
import {dungeonInfo} from '../../src/dungeon.js';
import {species} from '../../src/data.js';

async function openTower(page,cleared=71,url='/'){
  const state=initialState();state.auto=false;state.dungeonClears.tower=cleared;
  await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),state);
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
  await page.clock.pauseAt(new Date('2030-01-01T00:00:10Z'));
  await page.goto(url);
  await page.locator('.nav-button[data-action="dungeons"]').click();
  await expect(page.locator('.dungeon-cards .dungeon-card')).toHaveCount(4);
  await page.getByRole('button',{name:'도전 던전',exact:true}).click();
  await page.locator('[data-dungeon="tower"]').click();
}

test('tower previews all floors without remounting or unlocking encounters',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await openTower(page);
  const floors=page.locator('.tower-floors'),details=page.locator('.tower-details');
  await expect(page.locator('.tower-floor')).toHaveCount(200);
  await expect(page.locator('.tower-floor.boss-floor')).toHaveCount(40);
  await expect(page.locator('.tower-floor').first()).toHaveAttribute('data-stage','200');
  await expect(page.locator('.tower-floor').last()).toHaveAttribute('data-stage','1');
  await expect(page.locator('.tower-floor.selected')).toHaveAttribute('data-stage','72');
  await expect(page.locator('.tower-floor.selected')).toBeInViewport();
  await floors.evaluate(el=>{el.dataset.testMounted='yes';});
  const before=await page.evaluate(()=>localStorage.getItem('pokemon-days-v1'));
  await page.locator('.tower-floor[data-stage="75"]').scrollIntoViewIfNeeded();
  const scroll=await floors.evaluate(el=>el.scrollTop);
  await page.locator('.tower-floor[data-stage="75"]').click();
  expect(await floors.evaluate(el=>el.scrollTop)).toBeCloseTo(scroll,0);
  await expect(floors).toHaveAttribute('data-test-mounted','yes');
  await expect(details.locator('h2')).toHaveText('모다피의 탑 75층');
  await expect(details.locator('.tower-state')).toHaveText('미개방');
  await expect(details.locator('[data-action="dungeonEnter"]')).toHaveCount(0);
  const info=dungeonInfo('tower',75);
  await expect(details.locator('.tower-enemies strong')).toHaveText(info.enemies.map(id=>species(id).name));
  await expect(details.locator('.tower-reward strong')).toHaveText(`× ${info.amount.toLocaleString('ko-KR')}`);
  await expect(details.locator('.tower-boss')).toHaveCount(1);
  expect(await page.evaluate(()=>localStorage.getItem('pokemon-days-v1'))).toBe(before);
  await page.locator('.tower-floor[data-stage="200"]').click();
  await expect(details.locator('h2')).toHaveText('모다피의 탑 200층');
  await expect(page.locator('.tower-floor[data-stage="200"]')).toBeInViewport();
  await page.locator('.tower-floor[data-stage="1"]').click();
  await expect(details.locator('.tower-state')).toHaveText('클리어 완료');
  await expect(details.locator('[data-action="dungeonEnter"]')).toHaveCount(0);
  await page.locator('.tower-map-toolbar [data-action="towerCurrent"]').click();
  await expect(page.locator('.tower-floor.selected')).toHaveAttribute('data-stage','72');
  await expect(page.locator('.tower-floor.selected')).toBeInViewport();
  await page.getByRole('button',{name:'던전 입장',exact:true}).click();
  await expect(page.locator('#region-name')).toHaveText('모다피의 탑');
  await expect(page.locator('#stage-number')).toHaveText('72층');
  await expect(page.locator('#enemy .enemy-unit')).toHaveCount(5);
  await expect(page.locator('#fighters>.fighter')).toHaveCount(5);
  await expect(page.locator('#scene')).toHaveAttribute('data-dungeon','tower');
  expect(errors).toEqual([]);
});

test('tower board fits desktop and landscape with a scrollable left tower',async({page})=>{
  await openTower(page);
  for(const size of [{width:1920,height:1080},{width:1440,height:810},{width:844,height:390}]){
    await page.setViewportSize(size);
    await expect(page.locator('.tower-floor.selected')).toBeInViewport();
    const map=await page.locator('.tower-map').boundingBox(),detail=await page.locator('.tower-details').boundingBox();
    expect(map.x+map.width).toBeLessThan(detail.x);
    const footer=await page.locator('.tower-detail-footer').boundingBox();
    expect(footer.y+footer.height).toBeLessThanOrEqual(detail.y+detail.height);
    const scroll=await page.locator('.tower-floors').evaluate(el=>({scroll:el.scrollHeight,client:el.clientHeight}));
    expect(scroll.scroll).toBeGreaterThan(scroll.client*10);
    await expect(page.getByRole('button',{name:'던전 입장',exact:true})).toBeInViewport();
    await expect(page.locator('.tower-enemies .tower-enemy-card')).toHaveCount(5);
    for(const selector of ['.tower-story','.tower-battle-preview .type-background']){
      const width=await page.locator(selector).first().evaluate(async el=>{const img=new Image();img.src=getComputedStyle(el).backgroundImage.slice(5,-2);await img.decode();return img.naturalWidth;});
      expect(width).toBeGreaterThan(1000);
    }
    await page.screenshot({path:`/tmp/tower-redesign-${size.width}.png`});
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-action="dungeonEnter"]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-action="dungeonEnter"]')).toBeInViewport();
  await page.screenshot({path:'/tmp/tower-redesign-portrait.png'});
});

test('all-cleared tower remains browsable and daily dungeon navigation is preserved',async({page})=>{
  await openTower(page,200);
  await expect(page.locator('.tower-progress')).toContainText('200 / 200층 클리어');
  await expect(page.locator('.tower-state')).toHaveText('클리어 완료');
  await expect(page.locator('[data-action="dungeonEnter"]')).toHaveCount(0);
  await page.locator('.tower-floor[data-stage="195"]').click();
  await expect(page.locator('.tower-details h2')).toHaveText('모다피의 탑 195층');
  await page.locator('.tower-back').click();
  await expect(page.locator('#dungeon-page')).not.toHaveClass(/tower-page/);
  await page.getByRole('button',{name:'일일 던전',exact:true}).click();
  await page.locator('[data-dungeon="candy"]').click();
  await page.getByRole('button',{name:'던전 입장',exact:true}).click();
  await expect(page.locator('#region-name')).toHaveText('이상한사탕 던전');
});


test('standalone tower facade, preview and rewards load without network',async({page})=>{
  test.setTimeout(90000);
  // Stream the standalone file: sending the full embedded HTML over CDP exceeds
  // Chromium's message limit. Only this document is served; external requests fail.
  const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');createReadStream(new URL('../../play.html',import.meta.url)).pipe(res);});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}/`;
  await page.route(/^https?:\/\//,route=>route.request().url()===url?route.continue():route.abort());
  try {
  await openTower(page,4,url);
  await expect(page.locator('.tower-details h2')).toHaveText('모다피의 탑 5층');
  await expect(page.locator('.tower-boss')).toHaveCount(1);
  for(const selector of ['.tower-story','.tower-battle-preview .type-background','.tower-preview-floor']){
    const loaded=await page.locator(selector).first().evaluate(async el=>{const img=new Image();img.src=getComputedStyle(el).backgroundImage.slice(5,-2);await img.decode();return img.src.startsWith('data:image/')&&img.naturalWidth>1000;});
    expect(loaded).toBe(true);
  }
  const coin=page.locator('.tower-coin img');
  expect(await coin.evaluate(async el=>{await el.decode();return el.src.startsWith('data:image/');})).toBe(true);
  await page.getByRole('button',{name:'던전 입장',exact:true}).click();
  await expect(page.locator('#stage-number')).toHaveText('5층');
  } finally {await new Promise(resolve=>server.close(resolve));}
});
