/**
 * Smoke Tests — Verify the game loads and basic state transitions work.
 */
import { test, expect } from "@playwright/test";
import { loadGame, debug, enterModeSelect, waitForState } from "./helpers.js";

test.describe("Game Loading", () => {
  test("page loads without console errors", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loadGame(page);

    // Filter out expected non-critical warnings
    const critical = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("gtag"),
    );
    expect(critical).toHaveLength(0);
  });

  test("title screen is visible", async ({ page }) => {
    await loadGame(page);
    const title = page.locator("#titleScreen h1");
    await expect(title).toBeVisible();
    await expect(title).toHaveText("CLOCKWORK CARNAGE");
  });

  test("debug bridge is exposed", async ({ page }) => {
    await loadGame(page);
    const hasDebug = await page.evaluate(
      () => typeof window.ccDebug === "object",
    );
    expect(hasDebug).toBe(true);
  });

  test("test harness is exposed", async ({ page }) => {
    await loadGame(page);
    const hasTest = await page.evaluate(
      () => typeof window.ccTest === "object",
    );
    expect(hasTest).toBe(true);
  });

  test("canvas elements exist", async ({ page }) => {
    await loadGame(page);
    const gameCanvas = page.locator("#gameCanvas");
    const hudCanvas = page.locator("#hudCanvas");
    await expect(gameCanvas).toBeAttached();
    await expect(hudCanvas).toBeAttached();
  });
});

test.describe("State Transitions", () => {
  test("title → mode select", async ({ page }) => {
    await loadGame(page);
    await enterModeSelect(page);
    const state = await debug(page, "getState");
    expect(state).toBe("modeSelect");
  });

  test("mode select → back to title", async ({ page }) => {
    await loadGame(page);
    await enterModeSelect(page);
    await page.click("#btnBack");
    await page.waitForSelector("#titleScreen", { state: "visible" });
    const state = await debug(page, "getState");
    expect(state).toBe("title");
  });

  test("can start tutorial", async ({ page }) => {
    await loadGame(page);
    await enterModeSelect(page);
    await page.click("#btnTutorial");
    await page.waitForTimeout(500);
    const state = await debug(page, "getState");
    // Tutorial starts with a cutscene or goes straight to playing
    expect(["cutscene", "playing", "tutorial"]).toContain(state);
  });

  test("can start arena", async ({ page }) => {
    await loadGame(page);
    await enterModeSelect(page);
    await page.click("#btnArena");
    await page.waitForTimeout(500);
    const state = await debug(page, "getState");
    expect(["playing", "cutscene"]).toContain(state);
  });

  test("can start builder", async ({ page }) => {
    await loadGame(page);
    await enterModeSelect(page);
    await page.click("#btnBuilder");
    await page.waitForTimeout(500);
    const state = await debug(page, "getState");
    expect(state).toBe("builder");
  });

  test("can open character creator", async ({ page }) => {
    await loadGame(page);
    await enterModeSelect(page);
    await page.click("#btnCustomize");
    await page.waitForTimeout(500);
    const state = await debug(page, "getState");
    expect(state).toBe("characterCreate");
  });
});

test.describe("Debug Bridge Navigation", () => {
  test("can jump to upgrade screen", async ({ page }) => {
    await loadGame(page);
    const state = await debug(page, "showUpgradeScreen", 5000);
    expect(state).toBe("upgrade");
  });

  test("can jump to game over", async ({ page }) => {
    await loadGame(page);
    const state = await debug(page, "showGameOver");
    expect(state).toBe("gameOver");
  });

  test("can jump to victory", async ({ page }) => {
    await loadGame(page);
    const state = await debug(page, "showVictory");
    expect(state).toBe("victory");
  });

  test("can jump to tutorial complete", async ({ page }) => {
    await loadGame(page);
    const state = await debug(page, "showTutorialComplete");
    expect(state).toBe("tutorialComplete");
  });

  test("can start specific cutscene", async ({ page }) => {
    await loadGame(page);
    const cutscenes = await debug(page, "listCutscenes");
    expect(cutscenes.length).toBeGreaterThan(0);

    const result = await debug(page, "startCutscene", cutscenes[0]);
    expect(result.state).toBe("cutscene");
    expect(result.available).toBe(true);
  });

  test("can get and set player stats", async ({ page }) => {
    await loadGame(page);
    await debug(page, "startArena");

    const player = await debug(page, "setPlayer", {
      health: 42,
      score: 1337,
    });
    expect(player.health).toBe(42);
    expect(player.score).toBe(1337);
  });
});
