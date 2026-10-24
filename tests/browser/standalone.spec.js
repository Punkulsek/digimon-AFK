import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { pauseBattle } from "./helpers.js";

// Managed Chromium blocks file:// by administrator policy. Serve the exact
// standalone bytes through an in-memory route, with all other requests blocked.
// No Vite transforms, asset server, API, or network is used by these checks.
async function openStandalone(page) {
  const html = await readFile(
    new URL("../../play.html", import.meta.url),
    "utf8",
  );
  await page.route("**/*", (route) =>
    route.request().url() === "http://127.0.0.1/standalone"
      ? route.fulfill({ contentType: "text/html; charset=utf-8", body: html })
      : route.abort(),
  );
  await page.goto("http://127.0.0.1/standalone");
}

test("독립 HTML을 외부 파일·네트워크 없이 실행하고 진행 복원", async ({
  page,
  context,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.setOffline(true);
  await openStandalone(page);
  await expect(page.locator("#gold")).toHaveText("10,000");
  for (const name of ['포켓코인','다이아']) {
    const icon=page.locator('.currencies').getByRole('img',{name,exact:true});
    await expect(icon).toHaveAttribute('src',/^data:image\/png;base64,/);
    expect(await icon.evaluate(async img=>{await img.decode();return img.naturalWidth;})).toBe(1254);
  }
  await expect(page.locator("#fighters .fighter")).toHaveCount(5);
  await expect
    .poll(() =>
      page
        .locator("#fighters img")
        .evaluateAll((images) =>
          images.every((img) => img.complete && img.naturalWidth > 0),
        ),
    )
    .toBe(true);
  await expect(page.locator("#fighters img").first()).toHaveAttribute(
    "src",
    /^data:image\/gif;base64,/,
  );
  await expect
    .poll(() => page.locator(".enemy-hp-number").textContent())
    .not.toBe("55 / 55");
  await pauseBattle(page);
  await page.locator('.nav-button[data-action="collection"]').click();
  await expect(page.locator(".collection-grid img").first()).toHaveAttribute(
    "src",
    /^data:image\/png;base64,/,
  );
  await page.locator('.collection-grid [data-id="starter-0"]').click();
  await expect(page.locator(".modal-header")).toContainText("씨앗포켓몬");
  await expect(page.locator(".rarity-badge")).toContainText("풀 / 독");
  await page.keyboard.press("Escape");
  await page.locator('.nav-button[data-action="summon"]').click();
  await page.locator('[data-action="draw"][data-count="10"]').click();
  await expect(page.locator(".result-grid .pokemon-card")).toHaveCount(10);
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator("#gems")).toHaveText("7,300");
  await page.locator('.nav-button[data-action="collection"]').click();
  await expect(page.locator(".collection-grid .pokemon-card")).toHaveCount(16);
  expect(errors).toEqual([]);
});

test("저장소 접근이 차단되어도 독립 HTML 실행", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Blocked", "SecurityError");
      },
    }),
  );
  await openStandalone(page);
  await expect(page.locator("#fighters .fighter")).toHaveCount(5);
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await expect(page.locator("#save-status")).toHaveText("저장 공간 확인 필요");
  await page.getByRole("button", { name: "전투 배속", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "전투 배속", exact: true }),
  ).toHaveText("2×");
  expect(errors).toEqual([]);
});

test('모든 승인 던전 배경을 오프라인 표시하고 일반 지역 배경 복원', async ({page}) => {
  await openStandalone(page);
  await pauseBattle(page);
  const scene = page.locator('#scene');
  const art = page.locator('.region-art');
  const original = await art.evaluate(el => [getComputedStyle(el).backgroundImage, getComputedStyle(el).backgroundPosition]);
  const sheets = await art.evaluate(async el => {
    const previous=el.dataset.atlas, result=[];
    try {
      for(let n=1;n<=5;n++) {
        el.dataset.atlas=n;
        const value=getComputedStyle(el).backgroundImage, img=new Image();
        img.src=value.slice(5,-2);await img.decode();
        result.push({embedded:img.src.startsWith('data:image/png;base64,'),size:[img.naturalWidth,img.naturalHeight]});
      }
    } finally {el.dataset.atlas=previous;}
    return result;
  });
  expect(sheets).toEqual(Array.from({length:5},()=>({embedded:true,size:[1536,1024]})));
  const backgrounds = new Set();
  for (const id of ['coin','candy','evolution-fire','evolution-water','evolution-grass','evolution-electric','evolution-rock','evolution-ice']) {
    await page.getByRole('button',{name:'던전',exact:true}).click();
    if (id.startsWith('evolution-')) await page.locator('[data-dungeon="evolution"]').click();
    await page.locator(`[data-dungeon="${id}"]`).click();
    await page.getByRole('button',{name:'던전 입장'}).click();
    await expect(scene).toHaveAttribute('data-dungeon',id);
    await expect(art).toBeHidden();
    await expect(scene).toHaveCSS('filter','none');
    const background = await scene.evaluate(async el => {
      const value = getComputedStyle(el).backgroundImage;
      const img = new Image(); img.src = value.slice(5,-2); await img.decode();
      if (!img.naturalWidth) throw new Error('Missing background');
      return value;
    });
    expect(background).toContain('data:image/png;base64,');
    backgrounds.add(background);
    await page.locator('.nav-button[data-action="home"]').click();
    await expect(scene).not.toHaveAttribute('data-dungeon');
    await expect(art).toBeVisible();
    expect(await art.evaluate(el => [getComputedStyle(el).backgroundImage,getComputedStyle(el).backgroundPosition])).toEqual(original);
  }
  expect(backgrounds.size).toBe(8);
});
