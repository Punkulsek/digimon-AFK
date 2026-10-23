import { test, expect } from "@playwright/test";
import { pauseBattle } from "./helpers.js";
import { initialState } from "../../src/game.js";
test("성장, 편성, 10회 소환 및 새로고침 저장 복원", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await pauseBattle(page);
  await page.locator('.nav-button[data-action="collection"]').click();
  await page.locator(".collection-grid .pokemon-card").first().click();
  await page.locator('[data-action="level"]').click();
  await expect(
    page.getByRole("heading", { name: "Lv. 2 / 100" }),
  ).toBeVisible();
  await page.locator('[data-action="party"]').click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#fighters .fighter")).toHaveCount(4);
  await page.locator('.nav-button[data-action="summon"]').click();
  await page.locator('[data-action="draw"][data-count="10"]').click();
  await expect(page.locator(".result-grid .pokemon-card")).toHaveCount(10);
  await page.locator(".result-confirm").click();
  for (let n=0;n<2;n++) {
    await page.locator('[data-action="draw"][data-count="10"]').click();
    await expect(page.locator(".result-grid .pokemon-card")).toHaveCount(10);
    await page.locator(".result-confirm").click();
  }
  await page.locator('[data-action="draw"][data-count="10"]').click();
  await expect(page.getByRole("status")).toContainText("다이아가 부족");
  await page.keyboard.press("Escape");
  const before = await page.evaluate(() =>
    localStorage.getItem("pokemon-days-v1"),
  );
  await page.reload();
  await expect(page.locator("#gems")).toHaveText("1,900");
  expect(
    await page.evaluate(() => localStorage.getItem("pokemon-days-v1")),
  ).toEqual(before);
  await expect(page.locator("#fighters .fighter")).toHaveCount(4);
  await page.getByRole("button", { name: "스테이지 정보" }).click();
  await expect(page.locator(".stage-node")).toHaveCount(20);
  expect(errors).toEqual([]);
});
test("기존 저장 데이터와 설정을 유지하고 스테이지 팝업에서 수동 보스 도전", async ({
  page,
}) => {
  const saved = initialState();
  saved.kills = 10;
  saved.totalKills = 10;
  saved.auto = false;
  saved.autoBoss = false;
  saved.speed = 2;
  await page.addInitScript(
    (state) => localStorage.setItem("pokemon-days-v1", JSON.stringify(state)),
    saved,
  );
  await page.goto("/");
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "자동 전투 전환" }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("button", { name: "자동 보스 전환" }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("button", { name: "전투 배속", exact: true }),
  ).toHaveText("2×");
  await page.keyboard.press("Escape");
  await page.locator('.nav-button[data-action="collection"]').click();
  await expect(page.locator("#party-count")).toHaveText("5 / 5");
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("pokemon-days-v1")),
    ),
  ).toEqual(saved);
  await page.getByRole("button", { name: "스테이지 정보" }).click();
  await expect(
    page.getByRole("button", { name: "보스 도전", exact: true }),
  ).toBeEnabled();
  await page.locator('[data-action="quest"]').click();
  await expect(page.locator("#gems")).toHaveText("10,300");
  await expect(page.locator("#quest-text")).toHaveText("보상 획득 완료");
  await page.locator('[data-action="quest"]').click();
  await expect(page.locator("#gems")).toHaveText("10,300");
  await page.getByRole("button", { name: "보스 도전", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".enemy-heading")).toHaveClass(/is-boss/);
  await expect(page.locator(".battlefield")).toHaveClass(/boss-active/);
  await expect
    .poll(() => page.locator(".enemy-hp-number").textContent())
    .not.toBe("300 / 300");
});
test("전투 배경이 모든 화면을 채우고 홈 버튼은 하단 중앙에 고정", async ({
  page,
}) => {
  await page.goto("/");
  const sizes = [
    { width: 1440, height: 810 },
    { width: 1920, height: 1080 },
    { width: 1280, height: 1024 },
    { width: 844, height: 390 },
    { width: 568, height: 320 },
    { width: 390, height: 844 },
  ];
  for (const viewport of sizes) {
    await page.setViewportSize(viewport);
    for (const selector of [".game-shell", ".battlefield", "#scene"]) {
      const box = await page.locator(selector).boundingBox();
      expect(box.x).toBeCloseTo(0, 0);
      expect(box.y).toBeCloseTo(0, 0);
      expect(box.width).toBeCloseTo(viewport.width, 0);
      expect(box.height).toBeCloseTo(viewport.height, 0);
    }
    const nav = page.getByRole("navigation", { name: "주요 메뉴" });
    await expect(nav.getByRole("button")).toHaveText(["포켓몬", "홈", "소환"]);
    const home = await nav
      .getByRole("button", { name: "홈", exact: true })
      .boundingBox();
    expect(home.x + home.width / 2).toBeCloseTo(viewport.width / 2, 0);
    expect(viewport.height - home.y - home.height).toBeLessThanOrEqual(25);
    const profile = await page.locator(".profile").boundingBox();
    const stage = await page
      .getByRole("button", { name: "스테이지 정보" })
      .boundingBox();
    const settings = await page
      .getByRole("button", { name: "설정", exact: true })
      .boundingBox();
    expect(stage.x + stage.width / 2).toBeCloseTo(viewport.width / 2, 0);
    expect(profile.x).toBeLessThan(25);
    expect(settings.x + settings.width).toBeGreaterThan(viewport.width - 25);
    const overlaps = (a, b) =>
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y;
    expect(overlaps(profile, stage)).toBe(false);
    expect(overlaps(settings, stage)).toBe(false);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBe(true);
  }
  await expect(
    page.locator(
      ".mission-panel,.party-section,.battle-controls,.battle-bottom,.section-heading",
    ),
  ).toHaveCount(0);
  await expect(page.locator(".battlefield")).toHaveCSS(
    "border-top-width",
    "0px",
  );
  await expect(page.locator(".battlefield")).toHaveCSS("border-radius", "0px");
  await page.locator('.nav-button[data-action="collection"]').click();
  await expect(
    page.locator('.nav-button[data-action="collection"]'),
  ).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  await expect(page.locator('.nav-button[data-action="home"]')).toHaveAttribute(
    "aria-current",
    "page",
  );
});
