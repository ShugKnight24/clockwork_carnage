// Showroom customization: nested fields (badge stack, gear) edit, undo and save.
import { test, expect } from "@playwright/test";
import { loadGame, debug } from "./helpers.js";

async function openCreator(page) {
  // Clear once per test, not on every navigation, so a reload keeps the save.
  await page.addInitScript(() => {
    try {
      if (!sessionStorage.getItem("cc_test_cleared")) {
        localStorage.clear();
        sessionStorage.setItem("cc_test_cleared", "1");
      }
    } catch (_) {}
  });
  await loadGame(page);
  await debug(page, "showCharacterCreate");
  await page.waitForTimeout(700);
}

const room = (page) => page.locator("agent-showroom");
const tab = (page, id) => room(page).locator(`#tab-${id}`);
const opt = (page, key, idx) => room(page).locator(`.opt[data-key="${key}"][data-idx="${idx}"]`);

test("undo restores badge after symbol change", async ({ page }) => {
  await openCreator(page);
  await tab(page, "badge").click();
  await room(page).locator('[data-mode="configure"]').click();
  const before = await page.evaluate(() => JSON.stringify(window.ccDebug.game.character.badge));
  await opt(page, "badge.symbol", 3).click();
  expect(await page.evaluate(() => window.ccDebug.game.character.badge.layers[0].symbol)).toBe("star");
  await page.keyboard.press("KeyZ");
  expect(await page.evaluate(() => JSON.stringify(window.ccDebug.game.character.badge))).toBe(before);
});

test("gear choice persists across reload", async ({ page }) => {
  await openCreator(page);
  await tab(page, "gear").click();
  await opt(page, "acc.back", 1).click();
  await room(page).locator(".save").click();
  await page.reload();
  await page.waitForFunction(() => window.ccDebug?.game);
  expect(await page.evaluate(() => window.ccDebug.game.character.accessories.back)).toBe("backpack");
});

test("no console errors across the new tabs", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await openCreator(page);
  for (const id of ["gear", "badge", "suit"]) {
    await tab(page, id).click();
    await page.waitForTimeout(200);
  }
  expect(errors).toEqual([]);
});

test("locked preset shows a toast and leaves the character unchanged", async ({ page }) => {
  await openCreator(page);
  const snapshot = () =>
    page.evaluate(() => {
      const ch = window.ccDebug.game.character;
      return JSON.stringify({ badge: ch.badge, accessories: ch.accessories, armorIndex: ch.armorIndex });
    });
  const before = await snapshot();
  // Juggernaut (preset 1) needs the tier-3 "heavy" armour, which a fresh save
  // (no campaign progress, no arena survival) has not earned.
  await room(page).locator('.preset[data-preset="1"]').click();
  await expect(room(page).locator(".toast")).toHaveText(/Juggernaut locked/);
  expect(await snapshot()).toBe(before);
});

test("locked armour variant is rejected and armorVariant stays 0", async ({ page }) => {
  await openCreator(page);
  await tab(page, "suit").click();
  const chip = room(page).locator('[data-variant="1"]');
  await chip.click({ force: true });
  await expect(room(page).locator(".toast")).toHaveText(/locked/);
  await expect(chip).toHaveClass(/shake/);
  expect(await page.evaluate(() => window.ccDebug.game.character.armorVariant)).toBe(0);
});

// ── Legacy canvas creator: the same badge stack and gear slots ──

async function openLegacyCreator(page) {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem("cc_settings", JSON.stringify({ artStyle: 0 }));
    } catch (_) {}
  });
  await loadGame(page);
  await debug(page, "showCharacterCreate");
  await page.waitForTimeout(500);
}

/** Select the tab that edits `key`, and return its index. */
const legacyTab = (page, key) =>
  page.evaluate(async (k) => {
    const { CREATOR_CATEGORIES } = await import("/src/ui/character-creator.js");
    const i = CREATOR_CATEGORIES.findIndex((c) => c.key === k);
    window.ccDebug.game.creatorCategory = i;
    window.ccDebug.game.creatorPlacementSel = 0;
    return i;
  }, key);

test("legacy creator edits badge and gear", async ({ page }) => {
  await openLegacyCreator(page);
  const keys = await page.evaluate(async () =>
    (await import("/src/ui/character-creator.js")).CREATOR_CATEGORIES.map((c) => c.key),
  );
  expect(keys).toEqual(
    expect.arrayContaining([
      "badge.symbol",
      "badge.frame",
      "badge.enamel",
      "badge.metal",
      "badge.finish",
      "badge.placement",
      "acc.back",
      "acc.waist",
      "acc.helmet",
      "acc.arms",
      "acc.neck",
      "acc.legs",
    ]),
  );

  // The default badge is the clock (symbol 2), so one step down is the star.
  await legacyTab(page, "badge.symbol");
  await page.keyboard.press("ArrowDown");
  expect(await page.evaluate(() => window.ccDebug.game.character.badge.layers[0].symbol)).toBe("star");
  // Picking any badge field wears the badge — an empty placement set means the
  // choice would be invisible.
  expect(await page.evaluate(() => window.ccDebug.game.character.badge.placements)).toEqual(["chest"]);

  await legacyTab(page, "badge.frame");
  await page.keyboard.press("ArrowDown");
  expect(await page.evaluate(() => window.ccDebug.game.character.badge.layers[0].frame)).toBe("shield");

  await legacyTab(page, "acc.back");
  await page.keyboard.press("ArrowDown");
  expect(await page.evaluate(() => window.ccDebug.game.character.accessories.back)).toBe("backpack");

  await page.waitForTimeout(400);
  await page.screenshot({ path: "screenshots/legacy-badge.png" });
});

test("legacy PLACE tab toggles where the badge is worn", async ({ page }) => {
  await openLegacyCreator(page);
  await legacyTab(page, "badge.symbol");
  await page.keyboard.press("ArrowDown");
  await legacyTab(page, "badge.placement");
  // Row 0 is chest, which the symbol pick already turned on.
  await page.keyboard.press("Space");
  expect(await page.evaluate(() => window.ccDebug.game.character.badge.placements)).toEqual([]);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  expect(await page.evaluate(() => window.ccDebug.game.character.badge.placements)).toEqual(["shoulder"]);
});

test("legacy creator tabs wrap on screen and stay clickable", async ({ page }) => {
  await openLegacyCreator(page);
  const strip = await page.evaluate(async () => {
    const { getCreatorLayout, tabRect, CREATOR_CATEGORIES } = await import("/src/ui/character-creator.js");
    const g = window.ccDebug.game;
    const w = g.canvas.width;
    const h = g.canvas.height;
    const L = getCreatorLayout(w, h, g.isTouchDevice && w < 700, g.isTouchDevice);
    const rects = CREATOR_CATEGORIES.map((c, i) => tabRect(L, i));
    return {
      w,
      minX: Math.min(...rects.map((r) => r.x)),
      maxX: Math.max(...rects.map((r) => r.x + r.w)),
      bottom: Math.max(...rects.map((r) => r.y + r.h)),
      contentY: L.contentY,
    };
  });
  expect(strip.minX).toBeGreaterThanOrEqual(0);
  expect(strip.maxX).toBeLessThanOrEqual(strip.w);
  expect(strip.bottom).toBeLessThanOrEqual(strip.contentY);

  // A tab on the wrapped second row still selects its category when clicked.
  const target = await legacyTab(page, "acc.legs");
  await page.evaluate(() => {
    window.ccDebug.game.creatorCategory = 1;
  });
  const point = await page.evaluate(async (i) => {
    const { getCreatorLayout, tabRect } = await import("/src/ui/character-creator.js");
    const g = window.ccDebug.game;
    const rect = g.canvas.getBoundingClientRect();
    const L = getCreatorLayout(g.canvas.width, g.canvas.height, g.isTouchDevice && g.canvas.width < 700, g.isTouchDevice);
    const t = tabRect(L, i);
    const k = rect.width / g.canvas.width;
    return { x: rect.left + (t.x + t.w / 2) * k, y: rect.top + (t.y + t.h / 2) * k };
  }, target);
  await page.mouse.click(point.x, point.y);
  expect(await page.evaluate(() => window.ccDebug.game.creatorCategory)).toBe(target);
});

test.describe("legacy creator on a touch phone", () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  test("tab strip clears the touch edge-cycle zones", async ({ page }) => {
    await openLegacyCreator(page);
    const strip = await page.evaluate(async () => {
      const { getCreatorLayout, tabRect, CREATOR_CATEGORIES } = await import("/src/ui/character-creator.js");
      const g = window.ccDebug.game;
      const w = g.canvas.width;
      const L = getCreatorLayout(w, g.canvas.height, g.isTouchDevice && w < 700, g.isTouchDevice);
      const rects = CREATOR_CATEGORIES.map((c, i) => tabRect(L, i));
      return {
        touch: !!g.isTouchDevice,
        w,
        // js/touch.js turns taps within 60 CSS px of either edge into category
        // cycling, and draws the ◀/▶ arrows there.
        zone: 60 * (w / window.innerWidth),
        minX: Math.min(...rects.map((r) => r.x)),
        maxX: Math.max(...rects.map((r) => r.x + r.w)),
      };
    });
    expect(strip.touch).toBe(true);
    expect(strip.minX).toBeGreaterThanOrEqual(strip.zone);
    expect(strip.maxX).toBeLessThanOrEqual(strip.w - strip.zone);
  });
});
