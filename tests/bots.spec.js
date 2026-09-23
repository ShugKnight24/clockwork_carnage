/**
 * Bot Tests — Run in-browser bot profiles via Playwright.
 * Validates game mechanics end-to-end in a real browser.
 */
import { test, expect } from "@playwright/test";
import { loadGame, debug, screenshot } from "./helpers.js";

test.describe("Bot Profiles", () => {
  test.beforeEach(async ({ page }) => {
    await loadGame(page);
  });

  test("data validation suite passes", async ({ page }) => {
    const result = await page.evaluate(() => window.ccTest.validate("data"));
    expect(result).toBe(true);
  });

  test("map reachability suite passes", async ({ page }) => {
    const result = await page.evaluate(() => window.ccTest.validate("maps"));
    expect(result).toBe(true);
  });

  test("balance sanity suite passes", async ({ page }) => {
    const result = await page.evaluate(() => window.ccTest.validate("balance"));
    expect(result).toBe(true);
  });

  test("state transitions suite passes", async ({ page }) => {
    const result = await page.evaluate(() => window.ccTest.validate("states"));
    expect(result).toBe(true);
  });

  test("save/load round-trip suite passes", async ({ page }) => {
    const result = await page.evaluate(() =>
      window.ccTest.validate("saveload"),
    );
    expect(result).toBe(true);
  });

  test("upgrade interaction suite passes", async ({ page }) => {
    const result = await page.evaluate(() =>
      window.ccTest.validate("upgrades"),
    );
    expect(result).toBe(true);
  });

  test("performance benchmark suite passes", async ({ page }) => {
    const result = await page.evaluate(() => window.ccTest.validate("perf"));
    expect(result).toBe(true);
  });

  test("completionist bot completes tutorial + campaign", async ({ page }) => {
    test.setTimeout(120_000);
    const result = await page.evaluate(() =>
      window.ccTest.bot("completionist"),
    );
    expect(result).toBe(true);
    await screenshot(page, "bot-completionist-end");
  });

  test("speedrunner bot completes campaign level 0", async ({ page }) => {
    test.setTimeout(60_000);
    const result = await page.evaluate(() => window.ccTest.bot("speedrunner"));
    expect(result).toBe(true);
    await screenshot(page, "bot-speedrunner-end");
  });

  test("iron man bot survives 5 arena rounds", async ({ page }) => {
    test.setTimeout(120_000);
    const result = await page.evaluate(() => window.ccTest.bot("ironman"));
    expect(result).toBe(true);
    await screenshot(page, "bot-ironman-end");
  });

  test("no-damage bot completes without damage", async ({ page }) => {
    test.setTimeout(60_000);
    const result = await page.evaluate(() => window.ccTest.bot("nodamage"));
    expect(result).toBe(true);
    await screenshot(page, "bot-nodamage-end");
  });

  test("arena endurance bot survives 10 rounds", async ({ page }) => {
    test.setTimeout(180_000);
    const result = await page.evaluate(() => window.ccTest.bot("endurance"));
    expect(result).toBe(true);
    await screenshot(page, "bot-endurance-end");
  });
});
