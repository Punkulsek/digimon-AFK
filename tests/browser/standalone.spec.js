import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

// Managed Chromium blocks file:// by administrator policy. Serve the exact
// standalone bytes through an in-memory route, with all other requests blocked.
// No Vite transforms, asset server, API, or network is used by these checks.
async function openStandalone(page){
 const html=await readFile(new URL('../../play.html',import.meta.url),'utf8');
 await page.route('**/*',route=>route.request().url()==='http://127.0.0.1/standalone'
  ?route.fulfill({contentType:'text/html; charset=utf-8',body:html})
  :route.abort());
 await page.goto('http://127.0.0.1/standalone');
}

test('독립 HTML을 외부 파일·네트워크 없이 실행하고 진행 복원',async({page,context})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.setOffline(true);
 await openStandalone(page);
 await expect(page.locator('#gold')).toHaveText('2,400');
 await expect(page.locator('.party-grid .pokemon-card')).toHaveCount(6);
 await expect.poll(()=>page.locator('.party-grid img').evaluateAll(images=>images.every(img=>img.complete&&img.naturalWidth>0))).toBe(true);
 await expect(page.locator('.party-grid img').first()).toHaveAttribute('src',/^data:image\/png;base64,/);
 await expect(page.locator('#fighters img').first()).toHaveAttribute('src',/^data:image\/gif;base64,/);
 await expect.poll(()=>page.locator('.enemy-hp-number').textContent()).not.toBe('95 / 95');
 await page.locator('[data-action="auto"]').click();
 await page.locator('.party-grid [data-id="starter-0"]').click();
 await expect(page.locator('.modal-header')).toContainText('씨앗포켓몬');
 await expect(page.locator('.rarity-badge')).toContainText('풀 / 독');
 await page.keyboard.press('Escape');
 await page.locator('.nav-button[data-action="summon"]').click();
 await page.locator('[data-action="draw"][data-count="10"]').click();
 await expect(page.locator('.result-grid .pokemon-card')).toHaveCount(10);
 await page.keyboard.press('Escape');
 await page.reload();
 await expect(page.locator('#gems')).toHaveText('900');
 await page.locator('.nav-button[data-action="collection"]').click();
 await expect(page.locator('.collection-grid .pokemon-card')).toHaveCount(16);
 expect(errors).toEqual([]);
});

test('저장소 접근이 차단되어도 독립 HTML 실행',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));
 await openStandalone(page);
 await expect(page.locator('.party-grid .pokemon-card')).toHaveCount(6);
 await expect(page.locator('#save-status')).toHaveText('저장 공간 확인 필요');
 await page.locator('[data-action="speed"]').click();
 await expect(page.locator('#speed')).toHaveText('2×');
 expect(errors).toEqual([]);
});
