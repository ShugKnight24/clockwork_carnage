import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--use-gl=angle", "--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] } });

const deck = (page) => page.locator("settings-deck");

async function openDeck(page, width = 1440, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto("/?debug");
  await page.waitForFunction(() => window.ccDebug);
  await page.evaluate(async () => {
    const { mountSettingsDeck } = await import("/js/components/settings-deck.js");
    const d = mountSettingsDeck(window.ccDebug.game);
    d.open({ returnTo: "menu" });
  });
  await expect(deck(page)).toBeVisible();
}

test("renders six section tabs with tablist semantics", async ({ page }) => {
  await openDeck(page);
  const tabs = deck(page).locator('[role="tab"]');
  await expect(tabs).toHaveCount(6);
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
  await expect(deck(page).locator('[role="tabpanel"]')).toHaveCount(1);
});

test("toggles are switches and sliders are sliders", async ({ page }) => {
  await openDeck(page);
  await deck(page).locator('[role="tab"]', { hasText: "Video" }).click();
  await expect(deck(page).locator('[role="switch"][data-key="enableBloom"]')).toHaveAttribute("aria-checked", /true|false/);
  await expect(deck(page).locator('[role="slider"][data-key="fov"]')).toHaveAttribute("aria-valuenow", /\d+/);
});

test("clicking a switch changes the setting and announces it", async ({ page }) => {
  await openDeck(page);
  await deck(page).locator('[role="tab"]', { hasText: "Video" }).click();
  const before = await page.evaluate(() => window.ccDebug.game.settings.enableFilmGrain);
  await deck(page).locator('[role="switch"][data-key="enableFilmGrain"]').click();
  expect(await page.evaluate(() => window.ccDebug.game.settings.enableFilmGrain)).toBe(!before);
  await expect(deck(page).locator('[role="status"]')).toContainText("Film Grain");
});

test("one tab stop per list (roving tabindex)", async ({ page }) => {
  await openDeck(page);
  await deck(page).locator('[role="tab"]', { hasText: "Video" }).click();
  const zeros = await deck(page).locator('.rows [tabindex="0"]').count();
  expect(zeros).toBe(1);
});

test("side panel above 700px, bottom sheet below, focus kept across the switch", async ({ page }) => {
  await openDeck(page, 1440, 900);
  await deck(page).locator('[role="tab"]', { hasText: "Video" }).click();
  await page.evaluate(() => document.querySelector("settings-deck").focusRowByKey("fov"));
  await expect(deck(page)).toHaveAttribute("layout", "side");
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(deck(page)).toHaveAttribute("layout", "sheet");
  const focused = await page.evaluate(() => document.querySelector("settings-deck").shadowRoot.activeElement?.dataset.key);
  expect(focused).toBe("fov");
});

test("a row low in the list stays focused and in view when the panel becomes a sheet", async ({ page }) => {
  await openDeck(page, 1440, 900);
  await deck(page).locator('[role="tab"]', { hasText: "Video" }).click();
  await page.evaluate(() => document.querySelector("settings-deck").focusRowByKey("showPerformanceOverlay"));
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(deck(page)).toHaveAttribute("layout", "sheet");
  const seen = await page.evaluate(() => {
    const root = document.querySelector("settings-deck").shadowRoot;
    const row = root.activeElement.getBoundingClientRect();
    const box = root.querySelector(".rows").getBoundingClientRect();
    return { key: root.activeElement.dataset.key, inView: row.top >= box.top && row.bottom <= box.bottom };
  });
  expect(seen).toEqual({ key: "showPerformanceOverlay", inView: true });
});

test("every interactive target is at least 44px tall", async ({ page }) => {
  await openDeck(page);
  await deck(page).locator('[role="tab"]', { hasText: "Video" }).click();
  const small = await page.evaluate(() =>
    [...document.querySelector("settings-deck").shadowRoot.querySelectorAll("button, [role=switch], [role=slider], [role=tab]")]
      .filter((el) => el.offsetParent && el.getBoundingClientRect().height < 44)
      .map((el) => el.dataset.key || el.textContent.trim()));
  expect(small).toEqual([]);
});
