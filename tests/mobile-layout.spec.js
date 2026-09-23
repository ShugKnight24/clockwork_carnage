/**
 * Mobile layout pass. The geometry itself is asserted in
 * tests/unit/touch-layout.test.js; this captures the rendered result on real
 * viewports so regressions in the surrounding UI are visible.
 */
import { test } from "@playwright/test";
import { loadGame, debug } from "./helpers.js";

const VIEWS = [
  { name: "iphone-se-landscape", width: 667, height: 375 },
  { name: "iphone-14-landscape", width: 844, height: 390 },
  { name: "small-android-landscape", width: 640, height: 360 },
];

for (const v of VIEWS) {
  test.describe(v.name, () => {
    test.use({
      viewport: { width: v.width, height: v.height },
      hasTouch: true,
      isMobile: true,
    });

    // Each test starts from an empty store; a saved character left behind by a
    // neighbour makes the creator open on its unsaved-changes prompt.
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        try {
          localStorage.clear();
        } catch (_) {}
      });
    });

    test("creator fits the stage", async ({ page }) => {
      await loadGame(page);
      await debug(page, "showCharacterCreate");
      await page.waitForTimeout(900);
      await page.screenshot({ path: `screenshots/mobile-${v.name}-creator.png` });
    });

    test("touch controls clear the edges", async ({ page }) => {
      await loadGame(page);
      await debug(page, "startArena");
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `screenshots/mobile-${v.name}-controls.png` });
    });
  });
}
