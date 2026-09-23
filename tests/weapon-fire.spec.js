/**
 * E2E — Verify weapon firing does not produce console errors.
 *
 * This test guards against the critical regression where calling drawGlow
 * through an undefined proxy crashed the render pipeline mid-frame.
 */
import { test, expect } from "@playwright/test";
import { loadGame, enterModeSelect, waitForState } from "./helpers.js";

test.describe("Weapon Firing", () => {
  test("firing weapon produces no console errors", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loadGame(page);
    await enterModeSelect(page);

    // Start campaign tutorial via debug bridge
    await page.evaluate(() => {
      window.ccDebug.startCampaign(0);
    });

    await waitForState(page, "playing", 15_000);

    // Give the player god mode + ammo so we can focus on the render path
    await page.evaluate(() => {
      window.ccDebug.godMode(true);
      window.ccDebug.setPlayer({ ammo: 999 });
    });

    // Fire weapon for several frames
    await page.evaluate(() => window.ccDebug.fire(true));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.ccDebug.fire(false));

    // Let a few render frames settle
    await page.waitForTimeout(300);

    // Filter non-critical warnings
    const critical = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("gtag"),
    );
    expect(critical).toHaveLength(0);
  });
});
