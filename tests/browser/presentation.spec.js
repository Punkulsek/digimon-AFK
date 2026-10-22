import { test, expect } from "@playwright/test";

test("관동 151종 이미지·애니메이션을 브라우저에서 정상 디코딩", async ({
  page,
}) => {
  await page.goto("/");
  const failed = await page.evaluate(async () => {
    const errors = [];
    for (let batch = 0; batch < 151; batch += 20) {
      const urls = Array.from(
        { length: Math.min(20, 151 - batch) },
        (_, i) => batch + i + 1,
      ).flatMap((id) => [`/pokemon/${id}.png`, `/pokemon/animated/${id}.gif`]);
      await Promise.all(
        urls.map(async (src) => {
          const img = new Image();
          img.src = src;
          try {
            await img.decode();
            if (!img.naturalWidth) errors.push(src);
          } catch {
            errors.push(src);
          }
        }),
      );
    }
    return errors;
  });
  expect(failed).toEqual([]);
  await expect(page.locator("#fighters img").first()).toHaveAttribute(
    "src",
    /animated\/1\.gif/,
  );
  await page.locator('.nav-button[data-action="collection"]').click();
  await expect(page.locator(".collection-grid img")).toHaveCount(6);
  expect(
    await page
      .locator(".collection-grid img")
      .evaluateAll((images) =>
        images.every((img) => img.complete && img.naturalWidth > 0),
      ),
  ).toBe(true);
});

test("음악이 실제 오디오 신호를 출력하고 음소거·볼륨을 저장", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Context = window.AudioContext;
    window.AudioContext = class extends Context {
      constructor(...args) {
        super(...args);
        window.testAudioContext = this;
      }
      createDynamicsCompressor() {
        const node = super.createDynamicsCompressor();
        const analyser = this.createAnalyser();
        node.connect(analyser);
        window.testAnalyser = analyser;
        return node;
      }
    };
  });
  await page.goto("/");
  expect(await page.evaluate(() => Boolean(window.testAudioContext))).toBe(
    false,
  );
  await page.getByRole("button", { name: "설정", exact: true }).click();
  const button = page.locator("#music-button");
  await expect(button).toHaveAttribute("data-state", "playing");
  await expect
    .poll(() =>
      page.evaluate(() => {
        if (!window.testAnalyser) return 0;
        const data = new Float32Array(window.testAnalyser.fftSize);
        window.testAnalyser.getFloatTimeDomainData(data);
        return Math.max(...data.map(Math.abs));
      }),
    )
    .toBeGreaterThan(0.0001);
  await button.click();
  await expect(button).toHaveAttribute("data-state", "muted");
  await page.getByRole("slider", { name: "배경음악 볼륨" }).fill("12");
  await page.getByRole("button", { name: "효과음 전환" }).click();
  await expect(
    page.getByRole("button", { name: "효과음 전환" }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const data = new Float32Array(window.testAnalyser.fftSize);
        window.testAnalyser.getFloatTimeDomainData(data);
        return Math.max(...data.map(Math.abs));
      }),
    )
    .toBeLessThan(0.00001);
  await page.reload();
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await expect(page.getByRole("slider", { name: "배경음악 볼륨" })).toHaveValue(
    "12",
  );
  await expect(
    page.getByRole("button", { name: "배경음악 전환" }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("button", { name: "효과음 전환" }),
  ).toHaveAttribute("aria-pressed", "false");
});
