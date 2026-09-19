/**
 * Screenshot Tests — Capture every game state for visual review.
 *
 * Run: npm run test:screenshots
 * Screenshots saved to: screenshots/
 */
import { test } from "@playwright/test";
import {
  loadGame,
  debug,
  screenshot,
  enterModeSelect,
  waitFrames,
} from "./helpers.js";

test.describe("State Screenshots", () => {
  test.beforeEach(async ({ page }) => {
    await loadGame(page);
  });

  test("title screen", async ({ page }) => {
    await screenshot(page, "01-title");
  });

  test("mode select", async ({ page }) => {
    await enterModeSelect(page);
    await screenshot(page, "02-mode-select");
  });

  test("tutorial - playing", async ({ page }) => {
    await debug(page, "startTutorial");
    // Skip intro cutscene if present
    const state = await debug(page, "getState");
    if (state === "cutscene") {
      await debug(page, "skipCutscene");
    }
    await page.waitForTimeout(500);
    await screenshot(page, "03-tutorial-playing");
  });

  test("arena - playing", async ({ page }) => {
    await debug(page, "startArena");
    await page.waitForTimeout(300);
    await screenshot(page, "04-arena-playing");
  });

  test("campaign level 0", async ({ page }) => {
    await debug(page, "startCampaign", 0);
    await page.waitForTimeout(300);
    await screenshot(page, "05-campaign-level0");
  });

  test("upgrade screen", async ({ page }) => {
    await debug(page, "showUpgradeScreen", 5000);
    await page.waitForTimeout(300);
    await screenshot(page, "06-upgrade-screen");
  });

  test("game over", async ({ page }) => {
    await debug(page, "startArena");
    await debug(page, "showGameOver");
    await page.waitForTimeout(300);
    await screenshot(page, "07-game-over");
  });

  test("victory", async ({ page }) => {
    await debug(page, "startCampaign", 0);
    await debug(page, "showVictory");
    await page.waitForTimeout(300);
    await screenshot(page, "08-victory");
  });

  test("level complete", async ({ page }) => {
    await debug(page, "startCampaign", 0);
    await debug(page, "showLevelComplete");
    await page.waitForTimeout(300);
    await screenshot(page, "09-level-complete");
  });

  test("tutorial complete menu", async ({ page }) => {
    await debug(page, "showTutorialComplete");
    await page.waitForTimeout(300);
    await screenshot(page, "10-tutorial-complete");
  });

  test("character creator", async ({ page }) => {
    await debug(page, "showCharacterCreate");
    await page.waitForTimeout(300);
    await screenshot(page, "11-character-creator");
  });

  test("pause menu", async ({ page }) => {
    await debug(page, "startArena");
    await debug(page, "showPauseMenu");
    await page.waitForTimeout(200);
    await screenshot(page, "12-pause-menu");
  });

  test("settings screen", async ({ page }) => {
    await debug(page, "startArena");
    await debug(page, "showSettings");
    await page.waitForTimeout(200);
    await screenshot(page, "13-settings");
  });

  test("controls screen", async ({ page }) => {
    await debug(page, "startArena");
    await debug(page, "showControls");
    await page.waitForTimeout(200);
    await screenshot(page, "14-controls");
  });

  test("builder mode", async ({ page }) => {
    await debug(page, "startBuilder");
    await page.waitForTimeout(500);
    await screenshot(page, "15-builder");
  });
});

test.describe("Cutscene Screenshots", () => {
  test("capture all cutscene first frames", async ({ page }) => {
    await loadGame(page);
    const cutscenes = await debug(page, "listCutscenes");

    for (let i = 0; i < cutscenes.length; i++) {
      const key = cutscenes[i];
      await debug(page, "startCutscene", key);
      await page.waitForTimeout(400);
      await screenshot(page, `cutscene-${String(i).padStart(2, "0")}-${key}`);
      await debug(page, "skipCutscene");
    }
  });
});

test.describe("Upgrade Screen Interactions", () => {
  test("capture upgrade selection states", async ({ page }) => {
    await loadGame(page);
    await debug(page, "showUpgradeScreen", 10000);
    await page.waitForTimeout(300);

    // Screenshot with first item selected
    await screenshot(page, "upgrade-selection-0");

    // Navigate down
    await debug(page, "pressKey", "KeyS");
    await page.waitForTimeout(200);
    await screenshot(page, "upgrade-selection-1");

    // Navigate to continue button
    for (let i = 0; i < 10; i++) {
      await debug(page, "pressKey", "KeyS");
    }
    await page.waitForTimeout(200);
    await screenshot(page, "upgrade-continue-selected");
  });
});
