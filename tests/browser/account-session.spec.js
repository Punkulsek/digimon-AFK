import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {initialState} from '../../src/game.js';
async function mockFirebase(page){
 const source=(await readFile('src/firebase-account.js','utf8')).replaceAll("from 'firebase/app'","from '/test-app.js'").replaceAll("from 'firebase/auth'","from '/test-auth.js'").replaceAll("from 'firebase/firestore/lite'","from '/test-firestore.js'");
 await page.route('**/src/firebase-account.js',r=>r.fulfill({contentType:'text/javascript',body:source}));
 await page.route('**/test-app.js',r=>r.fulfill({contentType:'text/javascript',body:`let app;export const getApps=()=>app?[app]:[];export const getApp=()=>app;export const initializeApp=options=>(app={options,name:'[DEFAULT]'});`}));
 await page.route('**/test-auth.js',r=>r.fulfill({contentType:'text/javascript',body:`
 let listener;const user=()=>{const uid=sessionStorage.getItem('test-auth');return uid?{uid,providerData:[{providerId:'google.com'}]}:null};
 export const getAuth=app=>({app});export const browserLocalPersistence={};export const setPersistence=async()=>{};
 export function onAuthStateChanged(auth,fn){listener=fn;queueMicrotask(()=>fn(user()));return()=>{};}
 export class GoogleAuthProvider{setCustomParameters(value){this.parameters=value;}}
 export async function signInWithPopup(auth,provider){if(provider.parameters.prompt!=='select_account')throw Error('missing account picker');sessionStorage.setItem('test-auth',window.nextGoogleUid||'A');await listener(user());}
 export async function signOut(){sessionStorage.removeItem('test-auth');listener(null);}
 `}));
 await page.route('**/test-firestore.js',r=>r.fulfill({contentType:'text/javascript',body:`
 const read=()=>JSON.parse(localStorage.getItem('test-cloud')||'{}');const snap=data=>({exists:()=>!!data,data:()=>data});
 export const getFirestore=(app,id)=>{if(id!=='default')throw Error('wrong database');return {}};
 export const doc=(db,...parts)=>parts.join('/');export const getDoc=async ref=>snap(read()[ref]);export const serverTimestamp=()=>Date.now();
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
