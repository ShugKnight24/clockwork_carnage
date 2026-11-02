/**
 * Mobile layout on real viewports. The geometry is unit-tested in
 * tests/unit/touch-layout.test.js against touchZones() alone; this reads the
 * zones the running game actually laid out (game.touchControls.zones) once the
 * page, its safe-area probe and its resize have all had their say, and holds
 * them to the same rules: every button on screen, none overlapping another,
 * none over the reticle. The screenshots stay for a look by eye.
 */
import { test, expect } from "@playwright/test";
import { loadGame, debug } from "./helpers.js";
import { BUTTON_KEYS } from "../src/ui/touch-layout.js";

const VIEWS = [
  { name: "iphone-se-landscape", width: 667, height: 375 },
  { name: "iphone-14-landscape", width: 844, height: 390 },
  { name: "small-android-landscape", width: 640, height: 360 },
];

/** Clear space around the screen centre, where the reticle sits on touch (centred aim). */
const RETICLE_CLEAR = 24;

function layoutProblems(z, w, h) {
  const out = [];
  if (z.w !== w || z.h !== h) out.push(`zones laid out for ${z.w}×${z.h}, viewport is ${w}×${h}`);
  const buttons = BUTTON_KEYS.filter((k) => z[k]).map((k) => ({ k, ...z[k] }));
  if (buttons.length < 6) out.push(`only ${buttons.length} buttons laid out`);
  for (const b of buttons) {
    if (b.x - b.r < 0 || b.y - b.r < 0 || b.x + b.r > w || b.y + b.r > h) out.push(`${b.k} off screen`);
    if (Math.hypot(b.x - w / 2, b.y - h / 2) < b.r + RETICLE_CLEAR) out.push(`${b.k} over the reticle`);
  }
  for (let i = 0; i < buttons.length; i++) {
    for (let j = i + 1; j < buttons.length; j++) {
      const a = buttons[i], b = buttons[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r) out.push(`${a.k}/${b.k} overlap`);
    }
  }
  return out;
}

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
      const box = await page.locator("agent-showroom").boundingBox();
      expect(box, "the showroom is laid out").not.toBeNull();
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.y).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width).toBeLessThanOrEqual(v.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(v.height + 1);
      await page.screenshot({ path: `screenshots/mobile-${v.name}-creator.png` });
    });

    test("touch controls clear the edges, each other and the reticle", async ({ page }) => {
      await loadGame(page);
      await debug(page, "startArena");
      await page.waitForTimeout(1200);
      const zones = await page.evaluate(() => {
        const tc = window.ccDebug.game.touchControls;
        return tc ? JSON.parse(JSON.stringify(tc.zones)) : null;
      });
      expect(zones, "touch controls are active on a touch phone").not.toBeNull();
      expect(layoutProblems(zones, v.width, v.height)).toEqual([]);
      await page.screenshot({ path: `screenshots/mobile-${v.name}-controls.png` });
    });
  });
}
