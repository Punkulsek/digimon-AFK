import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {initialState} from '../../src/game.js';

async function setup(page,url='/'){
  const s=initialState();s.auto=false;s.stage=57;s.summons=1234;s.dungeonClears.coin=23;s.dungeonClears.candy=31;s.dungeonClears['evolution-fire']=49;s.dungeonClears.tower=99;s.discovered.push(12,150);s.trainer.avatarSpeciesId=12;
  await page.addInitScript(s=>{if(!localStorage.getItem('pokemon-days-v1'))localStorage.setItem('pokemon-days-v1',JSON.stringify(s));},s);
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T00:00:10Z'));
  await page.goto(url);await page.getByRole('button',{name:'트레이너 프로필 열기'}).click();
}

test('trainer records, permanent portraits and nickname survive reload without level rewards',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);
  const dialog=page.locator('.trainer-modal');
  await expect(dialog).toBeVisible();await expect(dialog.locator('[data-trainer-level]')).toHaveText('12');
  await expect(dialog.locator('.trainer-level-track')).toHaveAttribute('aria-valuenow','1');
  await expect(dialog.locator('[data-trainer-record="stages"]')).toHaveText('56 / 400');
  await expect(dialog.locator('[data-trainer-record="pokemon"]')).toHaveText('6마리');
  await expect(dialog.locator('[data-trainer-record="coin"]')).toHaveText('23단계');
  await expect(dialog.locator('[data-trainer-record="candy"]')).toHaveText('31단계');
  await expect(dialog.locator('[data-trainer-record="summons"]')).toHaveText('1,234회');
  await expect(dialog.getByText('레벨 보상',{exact:true})).toHaveCount(0);
  const id=await dialog.locator('.trainer-id').textContent();
  await dialog.getByRole('button',{name:'닉네임 변경',exact:true}).click();
  await dialog.locator('#trainer-nickname').fill('   ');await dialog.getByRole('button',{name:'저장',exact:true}).click();
  await expect(dialog.locator('.trainer-name-error')).toContainText('입력');
  await dialog.locator('#trainer-nickname').fill('관동 & 피카츄');await dialog.locator('#trainer-nickname').press('Enter');
  await expect(dialog.locator('[data-trainer-name]')).toHaveText('관동 & 피카츄');
  await expect(page.locator('#trainer-hud-name')).toHaveText('관동 & 피카츄');
  await dialog.getByRole('button',{name:'프로필 이미지 변경',exact:true}).click();
  await expect(dialog.locator('.trainer-portrait-option')).toHaveCount(8);
  await expect(dialog.locator('[data-species="3"]')).toHaveCount(0);
  await dialog.getByRole('button',{name:'뮤츠 프로필 이미지',exact:true}).click();
  await expect(page.locator('#trainer-hud-avatar')).toHaveAttribute('data-species','150');
  await expect(dialog.locator('.trainer-portrait-art')).toHaveAttribute('data-species','150');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1')));
  expect(saved.inventory.some(p=>p.speciesId===150)).toBe(false);expect(saved.trainer.avatarSpeciesId).toBe(150);expect(saved.gold).toBe(10000);expect(saved.gems).toBe(10000);expect(saved.pokeballs).toBe(0);
  await page.reload();await page.getByRole('button',{name:'트레이너 프로필 열기'}).click();
  await expect(dialog.locator('.trainer-id')).toHaveText(id);await expect(dialog.locator('[data-trainer-name]')).toHaveText('관동 & 피카츄');
  await expect(dialog.locator('.trainer-portrait-art')).toHaveAttribute('data-species','150');
  await dialog.locator('.trainer-type-records summary').click();
  await expect(dialog.locator('[data-trainer-type="fire"]')).toHaveText('49단계');
  await expect(dialog.locator('[data-trainer-type="water"]')).toHaveText('0단계');
  expect(errors).toEqual([]);
});

test('profile fits full-screen and mobile sizes; picker return preserves record scrolling',async({page})=>{
  await setup(page);
  for(const size of [{width:1920,height:1080},{width:1440,height:810},{width:390,height:844},{width:844,height:390}]){
    await page.setViewportSize(size);
    const dialog=await page.locator('.trainer-modal').boundingBox();expect(dialog.x).toBeGreaterThanOrEqual(0);expect(dialog.y).toBeGreaterThanOrEqual(0);expect(dialog.y+dialog.height).toBeLessThanOrEqual(size.height);
    await expect(page.getByRole('button',{name:'닉네임 변경',exact:true})).toBeInViewport();
    await expect(page.locator('.trainer-record-list')).toBeInViewport();
    await page.screenshot({path:`/tmp/trainer-profile-${size.width}.png`});
  }
  const list=page.locator('.trainer-record-list');await list.evaluate(e=>e.scrollTop=100);
  const scroll=await list.evaluate(e=>e.scrollTop);
  await page.getByRole('button',{name:'프로필 이미지 변경',exact:true}).click();
  await page.screenshot({path:'/tmp/trainer-portraits-844.png'});
  await page.getByRole('button',{name:'프로필로',exact:true}).click();
  expect(await list.evaluate(e=>e.scrollTop)).toBeCloseTo(scroll,0);
  await page.clock.runFor(1000);expect(await list.evaluate(e=>e.scrollTop)).toBeCloseTo(scroll,0);
  await page.getByRole('button',{name:'닉네임 변경',exact:true}).click();await page.locator('#trainer-nickname').fill('변경 취소');
  await page.getByRole('button',{name:'취소',exact:true}).click();await expect(page.locator('[data-trainer-name]')).toHaveText('새싹 트레이너');
});


test('standalone profile and unlocked portraits work without external assets',async({page})=>{
  test.setTimeout(90000);
  const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');createReadStream(new URL('../../play.html',import.meta.url)).pipe(res);});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}/`;
  await page.route(/^https?:\/\//,route=>route.request().url()===url?route.continue():route.abort());
  try {
    await page.setViewportSize({width:1920,height:1080});await setup(page,url);
    await expect(page.locator('[data-trainer-record="summons"]')).toBeInViewport();
    await page.screenshot({path:'/tmp/trainer-profile-final.png'});
    await page.getByRole('button',{name:'프로필 이미지 변경',exact:true}).click();
    const images=await page.locator('.trainer-portrait-option img').evaluateAll(async images=>Promise.all(images.map(async img=>{await img.decode();return img.src.startsWith('data:image/')&&img.naturalWidth>0;})));
    expect(images).toHaveLength(8);expect(images.every(Boolean)).toBe(true);
    await page.getByRole('button',{name:'뮤츠 프로필 이미지',exact:true}).click();
    await expect(page.locator('#trainer-hud-avatar')).toHaveAttribute('data-species','150');
    await expect(page.locator('.trainer-modal')).not.toContainText('레벨 보상');
    await expect(page.locator('.trainer-modal')).not.toContainText('펫');
    await expect(page.locator('[data-trainer-record]')).toHaveCount(8);
    await page.getByRole('button',{name:'닫기',exact:true}).click();
    await expect(page.locator('#boss-gauge')).toHaveAttribute('aria-valuenow','0');
    await expect(page.locator('.stage-wave')).toHaveCount(10);
    await page.getByRole('checkbox',{name:'자동 소환 예약'}).click();
    await expect(page.locator('#hud-auto-boss')).toHaveAttribute('aria-checked','false');
    await page.screenshot({path:'/tmp/stage-hud-standalone.png'});
  } finally {await new Promise(resolve=>server.close(resolve));}
});
