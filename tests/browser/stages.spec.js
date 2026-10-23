import {test,expect} from '@playwright/test';
import {initialState} from '../../src/game.js';
async function open(page,seed){await page.addInitScript(s=>{if(!localStorage.getItem('pokemon-days-v1'))localStorage.setItem('pokemon-days-v1',JSON.stringify(s));},seed);await page.goto('/');}
test('상단 진행도 7/10·자동 도전 저장·400지역 목록·던전에서 숨김',async({page})=>{
 const s=initialState();s.auto=false;s.kills=7;s.stage=181;await open(page,s);
 await expect(page.locator('#region-name')).toHaveText('무지개체육관');await expect(page.locator('#stage-number')).toHaveText('10-1');
 await expect(page.getByRole('progressbar',{name:'보스 등장 진행도'})).toHaveAttribute('aria-valuenow','7');await expect(page.locator('#boss-progress-label')).toContainText('3마리');await expect(page.locator('#hud-boss-button')).toBeDisabled();
 await page.locator('#hud-auto-boss').click();await page.reload();await expect(page.locator('#hud-auto-boss')).toHaveAttribute('aria-pressed','false');
 await page.getByRole('button',{name:'스테이지 정보'}).click();await page.locator('.region-itinerary summary').click();await expect(page.locator('.region-itinerary li')).toHaveCount(20);await expect(page.locator('.region-itinerary')).toContainText('블루시티 동굴');await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.locator('.nav-button[data-action="dungeons"]').click();await page.locator('[data-dungeon="coin"]').click();await page.getByRole('button',{name:'던전 입장'}).click();await expect(page.locator('#boss-progress-ui')).toBeHidden();await page.locator('.nav-button[data-action="home"]').click();await expect(page.locator('#boss-progress-ui')).toBeVisible();await expect(page.locator('#boss-gauge')).toHaveAttribute('aria-valuenow','7');
});
test('준비된 중간 보스 도전 및 작은 화면 게이지 겹침 방지',async({page})=>{
 const s=initialState();s.auto=false;s.autoBoss=false;s.kills=10;s.stage=10;await open(page,s);
 await expect(page.locator('#boss-progress-label')).toContainText('중간 보스 도전 가능');await expect(page.locator('#hud-boss-button')).toBeEnabled();
 const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
 for(const size of [{width:1440,height:810},{width:844,height:390},{width:568,height:320},{width:390,height:844}]){
 await page.setViewportSize(size);const hud=await page.locator('.stage-hud').boundingBox();expect(hud.x+hud.width/2).toBeCloseTo(size.width/2,0);
 for(const selector of ['.profile','.currencies','.settings-button','#enemy-fighter'])expect(overlap(hud,await page.locator(selector).boundingBox()),selector).toBe(false);
 }
 await page.locator('#hud-boss-button').click();await expect(page.locator('.enemy-heading')).toContainText('중간 보스');await expect(page.locator('#boss-progress-label')).toContainText('중간 보스 ·');await expect(page.locator('#hud-boss-button')).toBeDisabled();
});
test('400스테이지 완료 표시와 보스 버튼 잠금',async({page})=>{
 const s=initialState();s.stage=400;s.campaignCleared=true;s.auto=false;await open(page,s);await expect(page.locator('#stage-number')).toHaveText('20-20');await expect(page.locator('#region-name')).toHaveText('블루시티 동굴');await expect(page.locator('#boss-progress-label')).toContainText('400스테이지 완료');await expect(page.locator('#hud-boss-button')).toBeDisabled();await page.getByRole('button',{name:'스테이지 정보'}).click();await expect(page.locator('.stage-node.complete')).toHaveCount(20);await expect(page.locator('#boss-button')).toBeDisabled();
});
