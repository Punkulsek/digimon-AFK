import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {initialState} from '../../src/game.js';
async function mockFirebase(page){
 await page.route('**/src/asset-preload.js',r=>r.fulfill({contentType:'text/javascript',body:'export async function preloadGameAssets({onProgress}){onProgress({percent:100})}'}));
 const source=(await readFile('src/firebase-account.js','utf8')).replaceAll("from 'firebase/app'","from '/test-app.js'").replaceAll("from 'firebase/auth'","from '/test-auth.js'").replaceAll("from 'firebase/firestore/lite'","from '/test-firestore.js'");
 await page.route('**/src/firebase-account.js',r=>r.fulfill({contentType:'text/javascript',body:source}));
 await page.route('**/test-app.js',r=>r.fulfill({contentType:'text/javascript',body:`let app;export const getApps=()=>app?[app]:[];export const getApp=()=>app;export const initializeApp=options=>(app={options,name:'[DEFAULT]'});`}));
 await page.route('**/test-auth.js',r=>r.fulfill({contentType:'text/javascript',body:`
 let listener;const user=()=>{const uid=sessionStorage.getItem('test-auth');return uid?{uid,providerData:[{providerId:'google.com'}]}:null};
 export const getAuth=app=>({app});export const browserLocalPersistence={};export const setPersistence=async()=>{};
 export function onAuthStateChanged(auth,fn){listener=fn;setTimeout(()=>fn(user()),window.testAuthDelay||0);return()=>{};}
 export class GoogleAuthProvider{setCustomParameters(value){this.parameters=value;}}
 export async function signInWithPopup(auth,provider){window.popupCount=(window.popupCount||0)+1;if(provider.parameters.prompt!=='select_account')throw Error('missing account picker');sessionStorage.setItem('test-auth',window.nextGoogleUid||'A');await listener(user());}
 export async function signOut(){sessionStorage.removeItem('test-auth');listener(null);}
 `}));
 await page.route('**/test-firestore.js',r=>r.fulfill({contentType:'text/javascript',body:`
 const read=()=>JSON.parse(localStorage.getItem('test-cloud')||'{}');const snap=data=>({exists:()=>!!data,data:()=>data});
 export const getFirestore=(app,id)=>{if(id!=='default')throw Error('wrong database');return {}};
 export const doc=(db,...parts)=>parts.join('/');export const getDoc=async ref=>{await new Promise(r=>setTimeout(r,window.testReadDelay||0));return snap(read()[ref])};export const serverTimestamp=()=>Date.now();
 export async function runTransaction(db,fn){const store=read();const result=await fn({get:async ref=>snap(store[ref]),set:(ref,data)=>{store[ref]=data},delete:ref=>{delete store[ref]}});localStorage.setItem('test-cloud',JSON.stringify(store));return result;}
 `}));
}
test('settings logout returns to title, removes file-transfer UI and preserves separate Google account saves',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await mockFirebase(page);
 const s=initialState();s.gold=32123;s.auto=false;
 await page.addInitScript(s=>{if(!localStorage.getItem('pokemon-days-v1'))localStorage.setItem('pokemon-days-v1',JSON.stringify(s));},s);
 await page.goto('/');await expect(page.locator('.title-link .google-logo svg')).toBeVisible();await expect(page.locator('.title-start')).toBeHidden();
 await page.screenshot({path:'/tmp/eternal-google-title.png'});
 await page.locator('.title-link').click();await page.locator('.title-start').click();
 await page.getByRole('button',{name:'설정',exact:true}).click();
 await expect(page.getByText('진행 기록 옮기기')).toHaveCount(0);await expect(page.locator('[data-action="exportSave"],[data-action="importSave"]')).toHaveCount(0);
 await page.screenshot({path:'/tmp/eternal-logout-settings.png'});
 await page.locator('[data-action="logout"]').click();await expect(page.locator('.title-link')).toBeVisible();await expect(page.locator('.title-start')).toBeHidden();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1:account:A')).gold)).toBe(32123);
 await page.evaluate(()=>window.nextGoogleUid='B');await page.locator('.title-link').click();await page.locator('.title-start').click();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1:account:B')).gold)).toBe(10000);
 await page.getByRole('button',{name:'설정',exact:true}).click();await page.locator('[data-action="logout"]').click();await expect(page.locator('.title-link')).toBeVisible();
 await page.evaluate(()=>window.nextGoogleUid='A');await page.locator('.title-link').click();await page.locator('.title-start').click();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1:account:A')).gold)).toBe(32123);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1')).gold)).toBe(32123);
 expect(errors).toEqual([]);
});
test('returning from a suspended hidden tab catches up combat without replaying time twice',async({page})=>{
 await mockFirebase(page);
 const s=initialState();s.inventory.forEach(p=>p.level=50);s.autoBoss=false;
 await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),s);
 await page.goto('/');await page.locator('.title-link').click();await page.locator('.title-start').click();
 await page.clock.install();
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
 await page.evaluate(()=>{window.testHidden=true;Object.defineProperty(document,'hidden',{get:()=>window.testHidden,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
 // Simulates throttled timers: fastForward fires each due timer once, not 600 ticks.
 await page.clock.fastForward(60000);
 await page.evaluate(()=>{window.testHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
 await page.clock.runFor(20);
 await expect(page.locator('.game-shell')).not.toHaveAttribute('inert');
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1:account:A')).totalKills)).toBeGreaterThan(5);
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1:account:A')).gold);
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1:account:A')).gold)).toBe(before);
 await page.getByRole('button',{name:'설정',exact:true}).click();await page.locator('[data-action="settingAuto"]').click();
 const paused=await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1:account:A')).gold);
 await page.clock.fastForward(60000);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pokemon-days-v1:account:A')).gold)).toBe(paused);
});
test('existing Google identity restores on first visit despite transient config failure and delayed persistence',async({page})=>{
 await mockFirebase(page);const config=JSON.parse(await readFile('public/auth-config.json','utf8'));let attempts=0;
 await page.route('**/auth-config.json',r=>++attempts===1?r.fulfill({status:503,body:'temporary'}):r.fulfill({json:config}));
 await page.addInitScript(()=>{sessionStorage.setItem('test-auth','A');window.testAuthDelay=1200;window.testReadDelay=200;});
 await page.goto('/');await expect(page.locator('.title-link')).toBeHidden();await expect(page.locator('.title-start')).toBeHidden();
 await expect(page.locator('.title-start')).toBeVisible();await expect(page.locator('.title-start')).toBeEnabled();
 await expect(page.locator('.title-link')).toBeHidden();await expect(page.locator('.title-message')).not.toContainText('설정을 확인');
 expect(attempts).toBe(2);expect(await page.evaluate(()=>window.popupCount||0)).toBe(0);
 await page.locator('.title-start').click();await expect(page.locator('.eternal-title')).toHaveCount(0);
});
test('failed Firebase startup can be retried without reloading or opening Google popup for an existing account',async({page})=>{
 await mockFirebase(page);const config=JSON.parse(await readFile('public/auth-config.json','utf8'));let available=false;
 await page.route('**/auth-config.json',r=>available?r.fulfill({json:config}):r.fulfill({status:503,body:'temporary'}));
 await page.addInitScript(()=>sessionStorage.setItem('test-auth','A'));
 await page.goto('/');await expect(page.locator('.title-link')).toBeVisible();await expect(page.locator('.title-link')).toBeEnabled();
 available=true;await page.locator('.title-link').click();await expect(page.locator('.title-start')).toBeEnabled();expect(await page.evaluate(()=>window.popupCount||0)).toBe(0);
 await page.locator('.title-start').click();await expect(page.locator('.eternal-title')).toHaveCount(0);
});
test('reward chest shares HUD visibility and dungeon keys have distinct art with shared evolution design',async({page})=>{
 await mockFirebase(page);const s=initialState();s.auto=false;s.offlineRewards={lastSeen:Date.now(),seconds:60,gold:100,candies:1};s.dungeonKeys={day:new Date(Date.now()+9*3600000).toISOString().slice(0,10),coin:2,candy:6,rune:6,evolution:4};
 await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),s);
 await page.goto('/');await page.locator('.title-link').click();await page.locator('.title-start').click();
 await expect(page.locator('.topbar>.offline-chest')).toBeVisible();await expect(page.locator('.offline-ready-dot')).toBeVisible();
 await page.screenshot({path:'/tmp/eternal-chest-hud.png'});
 await page.locator('.offline-chest').click();await page.locator('[data-action="claimOffline"]').click();await expect(page.locator('.offline-ready-dot')).toBeHidden();
 await page.locator('.nav-button[data-action="collection"]').click();await expect(page.locator('.offline-chest')).toBeHidden();
 await page.locator('.nav-button[data-action="dungeons"]').click();await expect(page.locator('.offline-chest')).toBeHidden();
 const badges=page.locator('.dungeon-cards .dungeon-key-badge');await expect(badges).toHaveCount(4);
 await expect(page.locator('[data-key-type="coin"]')).toHaveText('2/6');
 const icons=await badges.locator('svg').evaluateAll(els=>els.map(e=>e.outerHTML));expect(new Set(icons).size).toBe(4);
 await page.screenshot({path:'/tmp/eternal-dungeon-keys.png'});
 await page.locator('[data-dungeon="evolution"]').click();const evolution=page.locator('.dungeon-types [data-key-type="evolution"]');await expect(evolution).toHaveCount(18);
 expect(new Set(await evolution.locator('svg').evaluateAll(els=>els.map(e=>e.outerHTML))).size).toBe(1);
 await expect(evolution.first()).toHaveText('4/6');
});
test('reward panel keeps teal surfaces and candy level button updates without losing its sprite',async({page})=>{
 await mockFirebase(page);const s=initialState();s.auto=false;s.candies=1000;s.offlineRewards={lastSeen:Date.now(),seconds:60,gold:100,candies:1};
 await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),s);
 await page.goto('/');await page.locator('.title-link').click();await page.locator('.title-start').click();await page.locator('.offline-chest').click();
 await expect(page.locator('.offline-reward-modal .modal-body')).toHaveCSS('background-color','rgb(7, 84, 101)');
 await expect(page.locator('.offline-reward-modal h2')).toHaveCSS('color','rgb(255, 255, 255)');
 await page.screenshot({path:'/tmp/offline-colors.png'});await page.locator('[data-action="close"]').click();
 await page.locator('.nav-button[data-action="collection"]').click();await page.locator('.pokemon-card[data-action="detail"]').first().click();
 const button=page.locator('[data-action="level"]');await button.scrollIntoViewIfNeeded();await expect(button.locator('svg')).toHaveCount(0);await expect(button).not.toContainText('이상한사탕');
 await expect(button.locator('img')).toBeVisible();expect(await button.locator('img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
 const before=await button.locator('.level-candy-count').textContent();await button.click();await expect(button.locator('.level-candy-count')).not.toHaveText(before);await expect(button.locator('img')).toBeVisible();
 await page.screenshot({path:'/tmp/candy-level.png'});
 await page.locator('[data-action="growthTab"][data-tab="evolution"]').click();
 await expect(page.locator('.evolution-overview')).toHaveCount(3);
 await expect(page.locator('.evolution-portraits img')).toHaveCount(6);
 await expect(page.locator('.evolution-comparison').first()).toContainText('진화 시 능력치 변화');
 await expect(page.locator('.evolution-condition.unmet').first()).toBeVisible();
 await page.screenshot({path:'/tmp/evolution-layout.png'});
});
test('mobile game dex keeps collection records, detail tabs and responsive scrolling',async({page})=>{
 await mockFirebase(page);const s=initialState();s.auto=false;
 await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),s);
 await page.goto('/');await page.locator('.title-link').click();await page.locator('.title-start').click();
 await page.locator('.nav-button[data-action="collection"]').click();await page.locator('[data-action="collectionTab"][data-tab="dex"]').click();
 await expect(page.locator('.dex-card')).toHaveCount(151);await expect(page.locator('.dex-progress-panel progress')).toHaveAttribute('max','151');
 await expect(page.locator('.dex-card.registered').first()).toContainText('등록');
 for(const viewport of [{width:1440,height:810},{width:844,height:390}]){
 await page.setViewportSize(viewport);await page.screenshot({path:`/tmp/mobile-dex-${viewport.width}.png`});
 await page.locator('.dex-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);await expect(page.locator('.dex-card').last()).toBeInViewport();
 await page.locator('.dex-scroll').evaluate(el=>el.scrollTop=0);
 }
 await page.setViewportSize({width:1440,height:810});await page.locator('.dex-card.registered').first().click();await expect(page.locator('.dex-detail-tabs button')).toHaveCount(4);
 await page.locator('[data-action="dexTab"][data-tab="1"]').click();await expect(page.locator('.dex-stat-grid>div')).toHaveCount(11);await page.screenshot({path:'/tmp/mobile-dex-detail.png'});
 await page.getByRole('button',{name:'닫기',exact:true}).click();await page.locator('[data-action="collectionTab"][data-tab="pokemon"]').click();await expect(page.locator('#collection-page')).not.toHaveClass(/dex-page/);
});
test('ordinary terrace edge separates scenery without changing dungeon surfaces',async({page})=>{
 await mockFirebase(page);const s=initialState();s.auto=false;
 await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),s);
 await page.goto('/');await page.locator('.title-link').click();await page.locator('.title-start').click();
 const edge=()=>page.locator('.region-art').evaluate(el=>getComputedStyle(el,'::after').backgroundImage);
 expect(await edge()).toContain('terrace-edges.png');
 for(const [region,atlas,row] of [[0,1,0],[2,1,2],[10,3,2]]){
 await page.locator('#scene').evaluate((el,{region,atlas,row})=>{el.dataset.region=region;const art=el.querySelector('.region-art');art.dataset.atlas=atlas;art.style.backgroundPosition=`0% ${row/3*100}%`;},{region,atlas,row});
 await page.screenshot({path:`/tmp/terrace-${region}.png`});
 }
 await page.setViewportSize({width:844,height:390});await page.screenshot({path:'/tmp/terrace-mobile.png'});
 await page.locator('#scene').evaluate(el=>{el.dataset.dungeon='coin';el.querySelector('.type-background').hidden=false;});
 await expect(page.locator('#scene .type-background')).toHaveCSS('mask-image','none');
 expect(await page.locator('#scene .type-background').evaluate(el=>getComputedStyle(el,'::after').backgroundImage)).toContain('terrace-edges.png');
});
test('daily themed scenery appears in previews and rune combat',async({page})=>{
 await mockFirebase(page);const s=initialState();s.auto=false;
 await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),s);
 await page.goto('/');await page.locator('.title-link').click();await page.locator('.title-start').click();
 await page.locator('.nav-button[data-action="dungeons"]').click();
 await expect(page.locator('.daily-banner')).toHaveCount(4);await page.locator('.daily-banner>.type-background').evaluateAll(els=>Promise.all(els.map(async el=>{const img=new Image();img.src=getComputedStyle(el).backgroundImage.slice(5,-2);await img.decode();})));await page.screenshot({path:'/tmp/daily-banners.png'});
 await page.setViewportSize({width:844,height:390});await page.locator('.daily-banner[data-dungeon="rune"]').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/daily-banners-mobile.png'});await page.setViewportSize({width:1440,height:810});
 for(const id of ['coin','candy','rune']){
 await page.locator('.nav-button[data-action="dungeons"]').click();await page.locator(`[data-action="dungeonSelect"][data-dungeon="${id}"]`).click();
 await expect(page.locator('.challenge-hero .type-background')).toBeVisible();
 const geometry=await page.locator('.challenge-hero .type-background').evaluate(el=>{const css=getComputedStyle(el),[w,h]=css.backgroundSize.split(' ').map(parseFloat);return {w,h,rows:Number(css.getPropertyValue('--panorama-rows')),ratio:Number(css.getPropertyValue('--panorama-aspect')),width:el.clientWidth,height:el.clientHeight};});
 expect(geometry.w).toBeGreaterThanOrEqual(geometry.width-1);expect(geometry.h/geometry.rows).toBeGreaterThanOrEqual(geometry.height-1);expect(geometry.w/(geometry.h/geometry.rows)).toBeCloseTo(geometry.ratio,2);
 await page.screenshot({path:`/tmp/daily-${id}.png`});
 }
 await page.locator('[data-action="dungeonEnter"]').click();await expect(page.locator('#scene')).toHaveAttribute('data-dungeon','rune');await expect(page.locator('#scene .type-background')).toHaveCSS('background-image',/rune-amethyst/);await page.screenshot({path:'/tmp/daily-rune-battle.png'});
});

test('tower redesign keeps floor selection and challenge without scenic preview',async({page})=>{
 await mockFirebase(page);const s=initialState();s.auto=false;s.dungeonClears.tower=4;
 await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),s);
 await page.goto('/');await page.locator('.title-link').click();await page.locator('.title-start').click();
 await page.locator('.nav-button[data-action="dungeons"]').click();await page.locator('[data-action="dungeonTab"][data-tab="challenge"]').click();await page.locator('[data-action="dungeonSelect"][data-dungeon="tower"]').click();
 await expect(page.locator('.tower-floor')).toHaveCount(200);await expect(page.locator('.tower-progress,.tower-map-toolbar')).toHaveCount(0);await expect(page.locator('.tower-scroll-arrow svg')).toHaveCount(2);const scrollBefore=await page.locator('.tower-floors').evaluate(el=>el.scrollTop);await page.locator('.tower-scroll-up').click();await expect.poll(()=>page.locator('.tower-floors').evaluate(el=>el.scrollTop)).toBeLessThan(scrollBefore);await page.locator('.tower-floors').evaluate((el,y)=>el.scrollTop=y,scrollBefore);await expect(page.locator('.tower-battle-preview')).toHaveCount(0);await expect(page.locator('.tower-details')).not.toContainText('층 구분');await expect(page.locator('.tower-enemy-card')).toHaveCount(5);
 await page.screenshot({path:'/tmp/tower-redesign.png'});
 await page.locator('.tower-floor[data-stage="6"]').click();await expect(page.locator('.tower-enter')).toHaveCount(0);await expect(page.locator('.tower-detail-heading h2')).toContainText('6');
 await page.locator('.tower-current-link').click();await expect(page.locator('.tower-enter')).toBeVisible();
 await page.setViewportSize({width:844,height:390});await page.screenshot({path:'/tmp/tower-redesign-mobile.png'});await page.locator('.tower-enter').click();await expect(page.locator('#scene')).toHaveAttribute('data-dungeon','tower');await page.setViewportSize({width:1440,height:810});await page.locator('#scene .type-background').evaluate(async el=>{const img=new Image();img.src=getComputedStyle(el).backgroundImage.slice(5,-2);await img.decode();});await page.screenshot({path:'/tmp/tower-atrium-battle.png'});
});

test('level reset button refunds candy, preserves breakthrough and disables repeat claims',async({page})=>{
 await mockFirebase(page);const s=initialState();s.auto=false;s.candies=5000;s.inventory[0].level=3;s.inventory[0].breakthrough=2;
 await page.addInitScript(s=>localStorage.setItem('pokemon-days-v1',JSON.stringify(s)),s);
 await page.goto('/');await page.locator('.title-link').click();await page.locator('.title-start').click();
 await page.locator('.nav-button[data-action="collection"]').click();await page.locator('.pokemon-card[data-action="detail"][data-id="starter-0"]').click();
 await page.locator('[data-action="resetLevelPreview"]').click();await expect(page.locator('.level-reset-summary')).toContainText('205개 반환');await page.screenshot({path:'/tmp/level-reset-confirm.png'});
 await page.locator('[data-action="resetLevelConfirm"]').click();await expect(page.locator('[data-action="resetLevelPreview"]')).toBeDisabled();await expect(page.locator('.detail-info h3').first()).toContainText('Lv. 1');await expect(page.locator('.level-candy-count')).toContainText('5,205');
 await page.locator('[data-action="level"]').click();await expect(page.locator('[data-action="resetLevelPreview"]')).toBeEnabled();await expect(page.locator('.level-candy-count')).toContainText('5,105');
});
