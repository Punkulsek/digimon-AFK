export async function pauseBattle(page) {
  await page.getByRole("button", { name: "설정", exact: true }).click();
  const toggle = page.getByRole("button", { name: "자동 전투 전환" });
  if ((await toggle.getAttribute("aria-pressed")) === "true")
    await toggle.click();
  await page.keyboard.press("Escape");
}
