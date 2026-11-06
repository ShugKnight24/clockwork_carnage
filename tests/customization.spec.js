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

test("a hair colour picked in the showroom changes the figure and survives a reload", async ({ page }) => {
  await openCreator(page);
  await tab(page, "face").click();
  const figure = () => room(page).locator(".figure").innerHTML();
  const before = await figure();
  const pink = await page.evaluate(async () => (await import("/src/data/cosmetics.js")).HAIR_COLORS.findIndex((e) => e.id === "pink"));
  await opt(page, "hairColor", pink).click();
  expect(await page.evaluate(() => window.ccDebug.game.character.hairColor)).toBe("pink");
  await expect.poll(figure).not.toBe(before);
  expect(await figure()).toContain("#e8408c");
  await expect(opt(page, "hairColor", pink)).toHaveAttribute("aria-checked", "true");
  await room(page).locator(".save").click();
  await page.reload();
  await page.waitForFunction(() => window.ccDebug?.game);
  expect(await page.evaluate(() => window.ccDebug.game.character.hairColor)).toBe("pink");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("cc_character")).hairColor)).toBe("pink");
});

/** Own every lockable piece, and have the showroom see it. */
const grantAll = (page) =>
  page.evaluate(async () => {
    const g = window.ccDebug.game;
    const m = await import("/src/systems/unlocks.js");
    for (const it of m.lockedItems(m.gameUnlockContext(g, { fresh: true }))) m.grantOwned(it.key, it.id);
    const room = document.querySelector("agent-showroom");
    room._unlockCtx = null; // the showroom caches the context per open
    room.renderAll(false);
  });

/** Grid position of piece `id` in the table behind showroom key `key`. */
const posOf = (page, key, id) =>
  page.evaluate(async ([k, i]) => (await import("/src/core/character-fields.js")).getIndex({ [k]: i, accessories: { [k.slice(4)]: i } }, k), [key, id]);

test("eyewear and a face item show under an open helmet; a closed helmet says they are hidden", async ({ page }) => {
  await openCreator(page);
  await grantAll(page);
  const figure = () => room(page).locator(".figure").innerHTML();
  await tab(page, "helmet").click();
  await opt(page, "helmet", await posOf(page, "helmet", "wide")).click();
  await tab(page, "gear").click();
  await opt(page, "acc.eyes", await posOf(page, "acc.eyes", "aviators")).click();
  await opt(page, "acc.face", await posOf(page, "acc.face", "scar")).click();
  expect(await page.evaluate(() => window.ccDebug.game.character.accessories)).toMatchObject({ eyes: "aviators", face: "scar" });
  await expect.poll(figure).toContain('data-acc="aviators"');
  expect(await figure()).toContain('data-acc="scar"');
  const note = (slot) => room(page).locator(`[data-note="face-slot"][data-slot="${slot}"]`);
  await expect(note("eyes")).toBeHidden();
  await expect(note("face")).toBeHidden();
  // A closed helmet: the picks are kept, not drawn, and both sections say why.
  await tab(page, "helmet").click();
  await opt(page, "helmet", await posOf(page, "helmet", "standard")).click();
  await tab(page, "gear").click();
  await expect.poll(figure).not.toContain('data-acc="aviators"');
  expect(await figure()).not.toContain('data-acc="scar"');
  await expect(note("eyes")).toBeVisible();
  await expect(note("eyes")).toHaveText(/^Hidden under the Standard Dome/);
  await expect(note("face")).toHaveText(/^Hidden under the Standard Dome/);
  expect(await page.evaluate(() => window.ccDebug.game.character.accessories)).toMatchObject({ eyes: "aviators", face: "scar" });
  // The Marshal's brim: eyewear over the bandana, no room for the rest.
  await tab(page, "helmet").click();
  await opt(page, "helmet", await posOf(page, "helmet", "brim")).click();
  await tab(page, "gear").click();
  await expect.poll(figure).toContain('data-acc="aviators"');
  expect(await figure()).not.toContain('data-acc="scar"');
  await expect(note("eyes")).toBeHidden();
  await expect(note("face")).toHaveText(/^No room under the Marshal's Brim/);
});

test("war paint takes a colour of its own, a swatch or a custom one, and keeps it over a reload", async ({ page }) => {
  await openCreator(page);
  await grantAll(page);
  const figure = () => room(page).locator(".figure").innerHTML();
  const tints = () => page.evaluate(() => window.ccDebug.game.character.accessoryTints);
  await tab(page, "helmet").click();
  await opt(page, "helmet", await posOf(page, "helmet", "wide")).click();
  await tab(page, "gear").click();
  const row = room(page).locator('.tintrow[data-tint-slot="face"]');
  await expect(row).toBeHidden();
  await opt(page, "acc.face", await posOf(page, "acc.face", "warpaint")).click();
  await expect(row).toBeVisible();
  // Its own ochre red to start, whatever the suit.
  await expect(row.locator('.tsw[data-hex="#b0302a"]')).toHaveAttribute("aria-checked", "true");
  await expect.poll(figure).toContain('fill="#b0302a"');
  await row.locator('.tsw[data-hex="#2f4f8f"]').click();
  expect(await tints()).toEqual({ face: "#2f4f8f" });
  await expect.poll(figure).toContain('fill="#2f4f8f"');
  await expect(row.locator(".tname")).toHaveText("Woad Blue");
  // A colour of the player's own, from the colour input; one undo step back.
  await row.locator('input[type="color"]').fill("#8a2be2");
  expect(await tints()).toEqual({ face: "#8a2be2" });
  await expect(row.locator(".tname")).toHaveText("Custom");
  await expect.poll(figure).toContain('fill="#8a2be2"');
  await room(page).getByRole("button", { name: "Undo last change" }).click();
  expect(await tints()).toEqual({ face: "#2f4f8f" });
  await row.locator('input[type="color"]').fill("#8a2be2");
  // A saved look keeps its paint.
  await room(page).locator(".save-look").click();
  await row.locator('.tsw[data-hex="#3f7a3a"]').click();
  expect(await tints()).toEqual({ face: "#3f7a3a" });
  await room(page).locator(".look .preset").nth(0).click();
  expect(await tints()).toEqual({ face: "#8a2be2" });
  await room(page).locator(".save").click();
  await page.reload();
  await page.waitForFunction(() => window.ccDebug?.game);
  expect(await page.evaluate(() => window.ccDebug.game.character.accessories.face)).toBe("warpaint");
  expect(await tints()).toEqual({ face: "#8a2be2" });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("cc_character")).accessoryTints)).toEqual({ face: "#8a2be2" });
});

test("presets and looks saved before the eyes and face slots keep the eyewear and face item worn", async ({ page }) => {
  await openCreator(page);
  await page.evaluate(() => {
    const g = window.ccDebug.game;
    g.character.accessories = { ...g.character.accessories, eyes: "aviators", face: "scar" };
    localStorage.setItem("cc_saved_looks", JSON.stringify([
      { name: "Old", look: { version: 2, color: "solar_gold", accessories: { back: "backpack", waist: "none", helmet: "none", arms: "none", neck: "none", legs: "none" } } },
    ]));
    document.querySelector("agent-showroom").renderLooks();
  });
  await room(page).locator(".look .preset").nth(0).click();
  expect(await page.evaluate(() => window.ccDebug.game.character.accessories)).toMatchObject({ back: "backpack", eyes: "aviators", face: "scar" });
  // A preset sets the gear, never the eyewear or face item.
  await room(page).locator('.preset[data-preset="0"]').click();
  expect(await page.evaluate(() => window.ccDebug.game.character.accessories)).toMatchObject({ back: "none", waist: "belt", eyes: "aviators", face: "scar" });
});

test("presets and looks saved before hair colour keep the hair colour picked", async ({ page }) => {
  await openCreator(page);
  const ch = () => page.evaluate(() => ({ ...window.ccDebug.game.character }));
  const colorIdx = (id) => page.evaluate(async (k) => (await import("/src/data/cosmetics.js")).HAIR_COLORS.findIndex((e) => e.id === k), id);
  await tab(page, "face").click();
  await opt(page, "hairColor", await colorIdx("pink")).click();
  // A preset sets the cut, never the colour.
  await room(page).locator('.preset[data-preset="0"]').click();
  expect(await ch()).toMatchObject({ hair: "short", hairColor: "pink" });
  // Two looks saved before hair colour: one of table positions, one of ids.
  await page.evaluate(() => {
    localStorage.setItem("cc_saved_looks", JSON.stringify([
      { name: "Old", look: { colorIndex: 3, hairIndex: 12 } },
      { name: "Mid", look: { version: 2, color: "solar_gold", hair: "afro" } },
    ]));
    document.querySelector("agent-showroom").renderLooks();
  });
  await room(page).locator(".look .preset").nth(0).click();
  expect(await ch()).toMatchObject({ color: "void_purple", hair: "long", hairColor: "pink" });
  await room(page).locator(".look .preset").nth(1).click();
  expect(await ch()).toMatchObject({ color: "solar_gold", hair: "afro", hairColor: "pink" });
  // A look saved with a hair colour wears it again.
  await room(page).locator(".save-look").click();
  await opt(page, "hairColor", await colorIdx("teal")).click();
  expect((await ch()).hairColor).toBe("teal");
  await room(page).locator(".look .preset").nth(2).click();
  expect((await ch()).hairColor).toBe("pink");
});

test("no console errors across the new tabs", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await openCreator(page);
  for (const id of ["gear", "badge", "suit", "face"]) {
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
      return JSON.stringify({ badge: ch.badge, accessories: ch.accessories, armor: ch.armor });
    });
  const before = await snapshot();
  // Juggernaut (preset 1) needs the tier-3 "heavy" armour, which a fresh save
  // (no campaign progress, no arena survival) has not earned.
  await room(page).locator(".more-presets").click(); // locked presets are folded away
  await room(page).locator('.preset[data-preset="1"]').click();
  await expect(room(page).locator(".toast")).toHaveText(/Juggernaut locked/);
  expect(await snapshot()).toBe(before);
});

test("a dropped badge preset cannot smuggle in a locked symbol", async ({ page }) => {
  await openCreator(page);
  // Grant the preset itself the way a battlefield drop does, without the
  // achievement its symbol needs. Picking it must not equip that symbol: a
  // saved look sanitizeLocked rewrites on the next load is a silent rollback.
  const i = await page.evaluate(async () => {
    const m = await import("/src/systems/unlocks.js");
    const { BADGE_PRESETS, indexOfId } = await import("/src/data/badges.js");
    const idx = indexOfId(BADGE_PRESETS, "p_lordslayer");
    m.grantOwned("badge.preset", "p_lordslayer");
    const room = document.querySelector("agent-showroom");
    room._unlockCtx = null; // the showroom caches the context per open
    room.renderAll(false);
    return idx;
  });
  await tab(page, "badge").click();
  await opt(page, "badge.preset", i).click();
  const badge = await page.evaluate(() => window.ccDebug.game.character.badge);
  expect(badge.layers[0].symbol).toBe("clock");
  // The rest of the preset still applies, and it is on the agent.
  expect(badge.placements).toContain("chest");
});

test("earning a badge symbol raises an unlock toast", async ({ page }) => {
  await openCreator(page);
  // Felling the Act 1 Lord opens act badges, the Field Patch finish and their
  // presets — none of which carry a gear tier, the only thing the toast used
  // to announce besides loadout classes.
  await page.evaluate(() => {
    window.ccDebug.game.achievementStats.campaignActsCleared = 1;
    window.dispatchEvent(new CustomEvent("cc:progress"));
  });
  const plate = page.locator("unlock-toast .plate");
  await expect(plate.locator(".kind")).toHaveText(/Badge/i);
  expect(await page.evaluate(() => document.querySelector("unlock-toast").queue.length)).toBeGreaterThan(0);
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

test("legacy HAIR tab picks a hair colour by key and by swatch", async ({ page }) => {
  await openLegacyCreator(page);
  await legacyTab(page, "hair");
  const hairColor = () => page.evaluate(() => window.ccDebug.game.character.hairColor);
  await page.keyboard.press("KeyE");
  expect(await hairColor()).toBe("jet");
  await page.keyboard.press("KeyQ");
  await page.keyboard.press("KeyQ");
  expect(await hairColor()).toBe("chrono");
  // The cut is untouched by the colour row.
  expect(await page.evaluate(() => window.ccDebug.game.character.hair)).toBe("buzz");
  const point = await page.evaluate(async () => {
    const { getCreatorLayout, hairColorSwatches } = await import("/src/ui/character-creator.js");
    const { HAIR_COLORS } = await import("/src/data/cosmetics.js");
    const g = window.ccDebug.game;
    const rect = g.canvas.getBoundingClientRect();
    const L = getCreatorLayout(g.canvas.width, g.canvas.height, g.isTouchDevice && g.canvas.width < 700, g.isTouchDevice);
    const r = hairColorSwatches(L).rects[HAIR_COLORS.findIndex((e) => e.id === "platinum")];
    const k = rect.width / g.canvas.width;
    return { x: rect.left + (r.x + r.w / 2) * k, y: rect.top + (r.y + r.h / 2) * k };
  });
  await page.mouse.click(point.x, point.y);
  expect(await hairColor()).toBe("platinum");
  expect(await page.evaluate(() => window.ccDebug.game.character.hair)).toBe("buzz");
});

test("legacy GEAR FACE tab picks a war paint colour by key and by swatch", async ({ page }) => {
  await openLegacyCreator(page);
  await page.evaluate(() => {
    const g = window.ccDebug.game;
    g.character.accessories = { ...g.character.accessories, face: "warpaint" };
  });
  await legacyTab(page, "acc.face");
  const tint = () => page.evaluate(async () => (await import("/src/data/accessories.js")).tintFor(window.ccDebug.game.character, "face"));
  expect(await tint()).toBe("#b0302a");
  await page.keyboard.press("KeyE");
  expect(await tint()).toBe("#121212");
  await page.keyboard.press("KeyQ");
  await page.keyboard.press("KeyQ");
  expect(await tint()).toBe("#d9b02c");
  const point = await page.evaluate(async () => {
    const { getCreatorLayout, faceSlotFoot, CREATOR_CATEGORIES } = await import("/src/ui/character-creator.js");
    const g = window.ccDebug.game;
    const rect = g.canvas.getBoundingClientRect();
    const L = getCreatorLayout(g.canvas.width, g.canvas.height, g.isTouchDevice && g.canvas.width < 700, g.isTouchDevice);
    const r = faceSlotFoot(L, CREATOR_CATEGORIES[g.creatorCategory], g.character).tint.rects[3];
    const k = rect.width / g.canvas.width;
    return { x: rect.left + (r.x + r.w / 2) * k, y: rect.top + (r.y + r.h / 2) * k };
  });
  await page.mouse.click(point.x, point.y);
  expect(await tint()).toBe("#2f4f8f");
  // The item is untouched by the colour row.
  expect(await page.evaluate(() => window.ccDebug.game.character.accessories.face)).toBe("warpaint");
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

// ── Full-look screenshot sweep across all three art styles ──

for (const [style, name] of [[0, "legacy"], [1, "comic"], [2, "modern"]]) {
  test(`full look screenshot ${name}`, async ({ page }) => {
    await page.addInitScript((s) => { try { localStorage.clear(); localStorage.setItem("cc_settings", JSON.stringify({ artStyle: s })); } catch (_) {} }, style);
    await loadGame(page);
    await debug(page, "showCharacterCreate");
    await page.waitForTimeout(700);
    await page.evaluate(async () => {
      const g = window.ccDebug.game;
      const m = await import("/src/systems/unlocks.js");
      for (const it of m.lockedItems(m.gameUnlockContext(g, { fresh: true }))) m.grantOwned(it.key, it.id);
      g.character.badge = { layers: [{ frame: "shield", symbol: "guard", enamel: "oxblood", metal: "brass", x: 0, y: 0, scale: 1, rot: 0 }], finish: "auto", placements: ["chest", "shoulder", "helmet"] };
      g.character.accessories = { back: "backpack", waist: "belt", helmet: "nvg", arms: "screen", neck: "scarf", legs: "kneepads" };
      document.querySelector("agent-showroom")?.renderAll?.();
    });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `screenshots/custom-${name}.png` });
  });
}

test("saved looks restore an outfit; the cape comes off; locked presets fold away", async ({ page }) => {
  await openCreator(page);
  const ch = () => page.evaluate(() => ({ ...window.ccDebug.game.character }));
  // A fresh save has earned one preset; the rest wait behind the toggle.
  await expect(room(page).locator(".more-presets")).toHaveText(/more to earn/);
  const shown = await room(page).locator(".preset[data-preset]:visible").count();
  await room(page).locator(".more-presets").click();
  expect(await room(page).locator(".preset[data-preset]:visible").count()).toBeGreaterThan(shown);

  await tab(page, "colors").click();
  await opt(page, "color", 3).click();
  await room(page).locator(".save-look").click();
  await opt(page, "color", 1).click();
  expect((await ch()).color).toBe("midnight_blue");
  await room(page).locator(".look .preset").first().click();
  expect((await ch()).color).toBe("void_purple");

  await tab(page, "gear").click();
  await opt(page, "cape", 1).click();
  expect((await ch()).cape).toBe("none");
  await expect(room(page).locator(".figure .ag-cape path")).toHaveCount(0);

  await room(page).locator(".look").first().hover();
  await room(page).locator(".look .del").first().click();
  await expect(room(page).locator(".look")).toHaveCount(0);
});
