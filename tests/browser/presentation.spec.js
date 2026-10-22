import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { pauseBattle } from "./helpers.js";

test("제공 MP3가 오프라인에서도 반복 재생되고 5마리와 그림자가 겹치지 않음", async ({ page }) => {
  await page.addInitScript(() => {
    const Context = window.AudioContext;
    window.AudioContext = class extends Context {
      createBufferSource() {
        const source = super.createBufferSource();
        window.bgmSource = source;
        const analyser = this.createAnalyser();
        source.connect(analyser);
        window.bgmAnalyser = analyser;
        return source;
      }
    };
  });
  const html = await readFile(new URL('../../play.html', import.meta.url), 'utf8');
  await page.route('**/*', route => route.request().url() === 'http://127.0.0.1/standalone'
    ? route.fulfill({contentType:'text/html', body:html}) : route.abort());
  await page.goto('http://127.0.0.1/standalone');
  await page.getByRole('button', {name:'설정', exact:true}).click();
  await expect.poll(() => page.evaluate(() => window.bgmSource?.loop)).toBe(true);
  expect(await page.evaluate(() => window.bgmSource.buffer.duration)).toBeGreaterThan(86);
  await page.evaluate(() => { window.bgmSource.playbackRate.value = 1024; });
  await page.waitForTimeout(250); // Cross multiple complete track boundaries.
  await page.evaluate(() => { window.bgmSource.playbackRate.value = 1; });
  await expect.poll(() => page.evaluate(() => {
    const samples = new Float32Array(window.bgmAnalyser.fftSize);
    window.bgmAnalyser.getFloatTimeDomainData(samples);
    return Math.max(...samples.map(Math.abs));
  })).toBeGreaterThan(0.0001);
  await page.keyboard.press('Escape');
  await pauseBattle(page);
  await page.waitForTimeout(500); // Let any in-flight attack finish before measuring idle placement.
  for (const viewport of [{width:1440,height:810},{width:844,height:390},{width:568,height:320},{width:390,height:844}]) {
    await page.setViewportSize(viewport);
    const boxes = await page.locator('#fighters .field-art').evaluateAll(nodes => nodes.map(node => {
      const {x,y,width,height} = node.getBoundingClientRect(); return {x,y,width,height};
    }));
    expect(boxes).toHaveLength(5);
    for (let i=0;i<boxes.length;i++) for (let j=i+1;j<boxes.length;j++) {
      const a=boxes[i], b=boxes[j];
      expect(a.x+a.width<=b.x || b.x+b.width<=a.x || a.y+a.height<=b.y || b.y+b.height<=a.y).toBe(true);
    }
    await expect(page.locator('.battlefield .fighter-shadow')).toHaveCount(6);
    expect(await page.locator('.fighter-shadow').first().evaluate(node => getComputedStyle(node).backgroundColor)).toBe('rgba(0, 0, 0, 0.28)');
  }
});

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
