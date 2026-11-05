import {test,expect} from '@playwright/test';
import {initialState} from '../../src/game.js';
async function open(page,seed){
 await page.addInitScript(s=>{if(!localStorage.getItem('pokemon-days-v1'))localStorage.setItem('pokemon-days-v1',JSON.stringify(s));},seed);
 await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T00:00:10Z'));
 await page.goto('/');
}
test('wave track is read-only, settings persist and dungeon controls remain accessible',async({page})=>{
 const s=initialState();s.auto=false;s.kills=8;s.stage=181;await open(page,s);
 await expect(page.locator('#region-name')).toHaveText('무지개체육관');await expect(page.locator('#stage-number')).toHaveText('10-1');
 await expect(page.getByRole('progressbar',{name:'보스 등장 진행도'})).toHaveAttribute('aria-valuenow','8');
 await expect(page.locator('#boss-progress-label')).toHaveText('보스까지 2단계!');
 await expect(page.locator('.stage-wave')).toHaveCount(10);
 await expect(page.locator('.stage-wave.current')).toHaveAttribute('data-wave','8');
 const bar=await page.locator('#boss-gauge').boundingBox();
 for(const portion of [0,.3,.6,1])await page.mouse.click(bar.x+bar.width*portion,bar.y+bar.height/2);
 await page.locator('#hud-boss-marker').dispatchEvent('touchend');
 await expect(page.locator('.modal')).toHaveCount(0);await expect(page.locator('#stage-number')).toHaveText('10-1');await expect(page.locator('#boss-gauge')).toHaveAttribute('aria-valuenow','8');
 await expect(page.locator('#boss-progress-ui [data-action],#boss-progress-ui button')).toHaveCount(0);
 await page.getByRole('checkbox',{name:'자동 소환 예약'}).click();await expect(page.locator('#hud-auto-boss')).toHaveAttribute('aria-checked','false');
 await page.reload();await expect(page.locator('#hud-auto-boss')).toHaveAttribute('aria-checked','false');
 await page.getByRole('button',{name:'스테이지 진행 설정'}).click();await expect(page.getByRole('button',{name:'자동 보스 전환'})).toHaveAttribute('aria-pressed','false');
 await page.getByRole('button',{name:'자동 보스 전환'}).click();await page.getByRole('button',{name:'닫기',exact:true}).click();await expect(page.locator('#hud-auto-boss')).toHaveAttribute('aria-checked','true');
 await page.getByRole('button',{name:'스테이지 정보',exact:true}).click();await page.locator('.region-itinerary summary').click();await expect(page.locator('.region-itinerary li')).toHaveCount(20);await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.locator('.nav-button[data-action="dungeons"]').click();await page.locator('[data-dungeon="coin"]').click();await page.getByRole('button',{name:'던전 입장'}).click();
 await expect(page.locator('#boss-progress-ui')).toBeHidden();await page.locator('[data-action="dungeonStatus"]').click();await page.locator('[data-action="exitDungeon"]').click();await page.locator('.nav-button[data-action="home"]').click();await expect(page.locator('#boss-gauge')).toHaveAttribute('aria-valuenow','8');
});
test('profile shortcut, eight records and responsive stage controls',async({page})=>{
 const s=initialState();s.auto=false;s.kills=7;await open(page,s);
 const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
 for(const size of [{width:1920,height:1080},{width:1440,height:810},{width:844,height:390},{width:568,height:320},{width:390,height:844}]){
  await page.setViewportSize(size);
  for(const selector of ['#boss-gauge','.stage-hud .stage-banner','#hud-auto-boss','.stage-hud-settings']){
   const r=await page.locator(selector).boundingBox();expect(r.x).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(size.width);
  }
  const footer=await page.locator('.stage-hud-footer').boundingBox();
  for(const selector of ['.topbar .profile','.currencies','.topbar .settings-button','.mission-button'])expect(overlap(footer,await page.locator(selector).boundingBox()),`${size.width}: ${selector}`).toBe(false);
  await page.screenshot({path:`/tmp/stage-hud-${size.width}.png`});
 }
 await page.setViewportSize({width:1440,height:810});await page.getByRole('button',{name:'트레이너 프로필 열기'}).click();
 await expect(page.locator('[data-trainer-record]')).toHaveCount(8);await expect(page.locator('.trainer-modal')).not.toContainText('펫');await expect(page.locator('.trainer-modal')).not.toContainText('레벨 보상');
 await page.getByRole('button',{name:'프로필 이미지 변경',exact:true}).click();await page.getByRole('button',{name:'피카츄 프로필 이미지',exact:true}).click();await page.getByRole('button',{name:'닫기',exact:true}).click();await expect(page.locator('#trainer-hud-avatar')).toHaveAttribute('data-species','25');
});
test('boss preparation, battle and completion never turn the track into a button',async({page})=>{
 const s=initialState();s.auto=false;s.autoBoss=false;s.kills=10;s.stage=10;await open(page,s);
 await expect(page.locator('#boss-progress-label')).toHaveText('보스 도전 가능!');await page.locator('#hud-boss-marker').click();await expect(page.locator('.modal')).toHaveCount(0);
 await page.getByRole('button',{name:'스테이지 정보',exact:true}).click();await page.locator('#boss-button').click();
 await expect(page.locator('#boss-progress-label')).toContainText('중간 보스');await expect(page.locator('#boss-gauge')).toHaveAttribute('aria-valuenow','10');await expect(page.locator('.enemy-unit .enemy-heading').first()).toContainText('보스');
 const complete=initialState();complete.stage=400;complete.campaignCleared=true;complete.auto=false;
 await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),complete);await page.reload();
 await expect(page.locator('#stage-number')).toHaveText('20-20');await expect(page.locator('#boss-progress-label')).toHaveText('관동 400스테이지 완료');await expect(page.locator('#hud-auto-boss')).toBeDisabled();
});
test('clearing enemy formations updates each checkpoint and remaining wave count',async({page})=>{
 const s=initialState();s.auto=true;s.autoBoss=false;s.inventory.forEach(p=>{p.level=100;p.breakthrough=10;});s.upgrades.atk=1000;s.upgrades.hp=1000;await open(page,s);
 await expect(page.locator('#boss-gauge')).toHaveAttribute('aria-valuenow','0');
 await page.clock.runFor(8000);
 const count=Number(await page.locator('#boss-gauge').getAttribute('aria-valuenow'));
 expect(count).toBeGreaterThan(0);expect(count).toBeLessThan(10);await expect(page.locator('#boss-remaining')).toHaveText(String(10-count));await expect(page.locator('.stage-wave.current')).toHaveAttribute('data-wave',String(count));
});
