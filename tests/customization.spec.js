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

test("scrolling a tile into view never scrolls the creator itself", async ({ page }) => {
  await openCreator(page);
  await grantAll(page);
  await tab(page, "helmet").click();
  // A tile low in the grid, brought into view to be clicked (a keyboard
  // move scrolls the same way).
  await opt(page, "helmet", await posOf(page, "helmet", "brim")).click();
  expect(await room(page).evaluate((host) => host.shadowRoot.querySelector(".root").scrollTop)).toBe(0);
  const top = await tab(page, "gear").boundingBox();
  expect(top.y).toBeGreaterThanOrEqual(0);
  await tab(page, "gear").click();
});

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

test("a paint colour goes with its item: off and on again is the default, in the session and after a reload; undo brings it back", async ({ page }) => {
  await openCreator(page);
  await grantAll(page);
  const tints = () => page.evaluate(() => window.ccDebug.game.character.accessoryTints);
  const face = () => page.evaluate(() => window.ccDebug.game.character.accessories.face);
  const row = room(page).locator('.tintrow[data-tint-slot="face"]');
  const undo = room(page).getByRole("button", { name: "Undo last change" });
  await tab(page, "gear").click();
  const warpaint = await posOf(page, "acc.face", "warpaint");
  await opt(page, "acc.face", warpaint).click();
  await row.locator('.tsw[data-hex="#2f4f8f"]').click();
  expect(await tints()).toEqual({ face: "#2f4f8f" });
  // Off: the colour goes with it. Undo puts both back.
  await opt(page, "acc.face", 0).click();
  expect(await tints()).toEqual({});
  await undo.click();
  expect(await face()).toBe("warpaint");
  expect(await tints()).toEqual({ face: "#2f4f8f" });
  // Off and on again in the session: the default.
  await opt(page, "acc.face", 0).click();
  await opt(page, "acc.face", warpaint).click();
  expect(await tints()).toEqual({});
  await expect(row.locator('.tsw[data-hex="#b0302a"]')).toHaveAttribute("aria-checked", "true");
  // Painted, taken off and saved: after a reload it comes back in its default.
  await row.locator('.tsw[data-hex="#3f7a3a"]').click();
  await opt(page, "acc.face", 0).click();
  await room(page).locator(".save").click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("cc_character")).accessoryTints)).toEqual({});
  await page.reload();
  await page.waitForFunction(() => window.ccDebug?.game);
  await debug(page, "showCharacterCreate");
  await page.waitForTimeout(700);
  await grantAll(page);
  await tab(page, "gear").click();
  await opt(page, "acc.face", warpaint).click();
  expect(await tints()).toEqual({});
  await expect(row.locator('.tsw[data-hex="#b0302a"]')).toHaveAttribute("aria-checked", "true");
});

test("a colour drag whose first step changes nothing is still one undo step", async ({ page }) => {
  await openCreator(page);
  await grantAll(page);
  await tab(page, "gear").click();
  await opt(page, "acc.face", await posOf(page, "acc.face", "warpaint")).click();
  const steps = () => page.evaluate(() => document.querySelector("agent-showroom").undoStack.length);
  const before = await steps();
  // The drag starts on the colour already worn, then moves twice.
  await room(page).locator('.tintrow input[type="color"]').evaluate((input) => {
    for (const v of ["#b0302a", "#123456", "#654321"]) {
      input.value = v;
      input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    }
    input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  });
  expect(await page.evaluate(() => window.ccDebug.game.character.accessoryTints)).toEqual({ face: "#654321" });
  expect(await steps()).toBe(before + 1);
  await room(page).getByRole("button", { name: "Undo last change" }).click();
  expect(await page.evaluate(() => window.ccDebug.game.character.accessoryTints)).toEqual({});
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

test("preset and look thumbnails show the hair colour and face item worn, as wearing them keeps them", async ({ page }) => {
  await openCreator(page);
  await grantAll(page);
  const thumb = (sel) => room(page).locator(`${sel} .pthumb`).innerHTML();
  // A look saved before hair colour and the face slots, under an open helmet.
  await page.evaluate(() => {
    localStorage.setItem("cc_saved_looks", JSON.stringify([{ name: "Open", look: { version: 2, color: "solar_gold", hair: "afro", helmet: "wide", visor: "standard" } }]));
    document.querySelector("agent-showroom").renderLooks();
  });
  const pink = await page.evaluate(async () => (await import("/src/data/cosmetics.js")).HAIR_COLORS.findIndex((e) => e.id === "pink"));
  await tab(page, "face").click();
  await opt(page, "hairColor", pink).click();
  // Juggernaut wears the open mohawk helmet: its cut shows in the player's colour.
  await expect.poll(() => thumb('.preset[data-preset="1"]')).toContain("#e8408c");
  await expect.poll(() => thumb(".look .preset")).toContain("#e8408c");
  // A face item worn now shows on the look's thumbnail, as wearing the look keeps it.
  const before = await thumb(".look .preset");
  await page.evaluate(() => {
    const room = document.querySelector("agent-showroom");
    room.commit({ accessories: { ...room.character.accessories, face: "warpaint" } });
  });
  await expect.poll(() => thumb(".look .preset")).not.toBe(before);
  await room(page).locator(".look .preset").click();
  expect(await page.evaluate(() => window.ccDebug.game.character)).toMatchObject({ hair: "afro", hairColor: "pink", helmet: "wide", accessories: { face: "warpaint" } });
});

test("look thumbnails redraw only when what they show changes; focus on a look survives a class change", async ({ page }) => {
  await openCreator(page);
  await grantAll(page);
  await room(page).locator(".save-look").click();
  const look = room(page).locator('.look .preset[data-look="0"]');
  await look.evaluate((el) => {
    el.focus({ preventScroll: true });
    el.__kept = true;
    el.querySelector(".pthumb > svg").__kept = true;
  });
  await page.evaluate(() => {
    const r = document.querySelector("agent-showroom");
    for (const t of r.shadowRoot.querySelectorAll(".preset[data-preset] .pthumb > svg")) t.__kept = true;
    r.commit({ loadout: r.character.loadout === "enforcer" ? "gunslinger" : "enforcer" });
  });
  const after = await page.evaluate(() => {
    const r = document.querySelector("agent-showroom").shadowRoot;
    const el = r.querySelector('.look .preset[data-look="0"]');
    return {
      focused: r.activeElement === el && !!el.__kept,
      lookThumb: !!el.querySelector(".pthumb > svg").__kept,
      presetThumbs: [...r.querySelectorAll(".preset[data-preset] .pthumb > svg")].every((t) => t.__kept),
    };
  });
  expect(after).toEqual({ focused: true, lookThumb: true, presetThumbs: true });
  // A change a thumbnail does show redraws it in place (a preset keeps the
  // player's hair colour; the saved look holds its own), focus still where it was.
  await page.evaluate(() => {
    const r = document.querySelector("agent-showroom");
    r.commit({ hairColor: "pink" });
  });
  expect(await page.evaluate(() => {
    const r = document.querySelector("agent-showroom").shadowRoot;
    const el = r.querySelector('.look .preset[data-look="0"]');
    return {
      focused: r.activeElement === el && !!el.__kept,
      lookKept: !!el.querySelector(".pthumb > svg").__kept,
      presetRedrawn: !r.querySelector('.preset[data-preset="0"] .pthumb > svg').__kept,
    };
  })).toEqual({ focused: true, lookKept: true, presetRedrawn: true });
});

test("the shoulder note reads the frame's own right shoulder", async ({ page }) => {
  await openCreator(page);
  await tab(page, "suit").click();
  await page.evaluate(() => {
    const room = document.querySelector("agent-showroom");
    room.commit({ frame: "strider" });
  });
  await expect(room(page).locator('[data-note="frame-shoulders"]')).toHaveText("Strider leaves the right shoulder bare: this pick fits the left.");
});

test("theme captions appear in helmet grid in theme order", async ({ page }) => {
  await openCreator(page);
  await tab(page, "helmet").click();
  const themes = await page.evaluate(async () => (await import("/src/data/wardrobe-themes/index.js")).WARDROBE_THEMES.map((t) => ({ name: t.name, short: t.short })));
  const caps = room(page).locator('.section[data-key="helmet"] .gcap');
  // A one-helmet theme captions with its short name; every caption's title is the full one.
  await expect(caps).toHaveText(themes.map((t, i) => new RegExp(`^${i === 0 ? t.name : t.short}$`, "i")));
  for (const [i, t] of themes.entries()) await expect(caps.nth(i)).toHaveAttribute("title", t.name);
  // Each helmet sits under its own theme's caption.
  const misplaced = await room(page).evaluate(async (el) => {
    const { HELMET_STYLES } = await import("/src/data/cosmetics.js");
    return [...el.shadowRoot.querySelectorAll('.section[data-key="helmet"] .group')].flatMap((g) =>
      [...g.querySelectorAll(".opt")].map((o) => HELMET_STYLES[Number(o.dataset.idx)]).filter((h) => h.theme !== g.dataset.group).map((h) => h.id),
    );
  });
  expect(misplaced).toEqual([]);
  // The frame and shoulder grids are captioned the same way.
  await tab(page, "suit").click();
  await expect(room(page).locator('.section[data-key="frame"] .gcap')).toHaveText(themes.map((t, i) => new RegExp(`^${i === 0 ? t.name : t.short}$`, "i")));
  await expect(room(page).locator('.section[data-key="shoulder"] .gcap').first()).toHaveText(/field issue/i);
});

test("Sets row equips Ronin", async ({ page }) => {
  await openCreator(page);
  await grantAll(page);
  await tab(page, "suit").click();
  const tiles = room(page).locator(".section[data-section=sets] .settile");
  // One tile per designed theme: never Field Issue.
  await expect(tiles).toHaveCount(8);
  await expect(room(page).locator('.settile[data-set="issue"]')).toHaveCount(0);
  const ronin = room(page).locator('.settile[data-set="ronin"]');
  await expect(ronin.locator(".setlock")).toBeHidden();
  await expect(ronin.locator(".sown")).toHaveText("3/3 owned");
  await expect(room(page).locator(".setlocks .lockfold")).toHaveCount(0);
  await ronin.click();
  expect(await page.evaluate(() => window.ccDebug.game.character)).toMatchObject({ frame: "lamellar", helmet: "kabuto", shoulder: "sode" });
  await expect(ronin).toHaveAttribute("aria-pressed", "true");
  await expect(room(page).locator(".toast")).toHaveText("Ronin set on");
  await ronin.click();
  await expect(room(page).locator(".toast")).toHaveText("Ronin set already worn");
  // One undo step takes the whole set off.
  await room(page).getByRole("button", { name: "Undo last change" }).click();
  expect(await page.evaluate(() => window.ccDebug.game.character)).toMatchObject({ frame: "standard", helmet: "standard", shoulder: "none" });
});

/** Clear Act 1 the way the campaign records it, and have the showroom (if open) see it. */
const clearActOne = (page) =>
  page.evaluate(async () => {
    window.ccDebug.game.achievementStats.campaignActsCleared = 1;
    (await import("/src/systems/unlocks.js")).invalidateUnlockContext();
    const room = document.querySelector("agent-showroom");
    if (room) {
      room._unlockCtx = null; // the showroom caches the context per open
      room.renderAll(); // and builds a tab's tiles, locks and all, as it opens
    }
  });

test("a set with locked pieces equips what is owned and says what it skipped", async ({ page }) => {
  await openCreator(page);
  await tab(page, "suit").click();
  // A fresh save owns none of a theme's set: the Ronin tile says so up front.
  const ronin = room(page).locator('.settile[data-set="ronin"]');
  await expect(ronin.locator(".setlock")).toBeVisible();
  await expect(ronin.locator(".setlock b")).toHaveText("3");
  await expect(ronin.locator(".sown")).toHaveText("0/3 owned");
  await expect(ronin).toHaveClass(/\blocked\b/);
  await expect(ronin).toHaveAttribute("title", /^Ronin: Ronin \(Clear Act 1 .+\), Kabuto \(Clear Act 2 .+\), Sode \(Clear Act 1 .+\)$/);
  await expect(ronin).toHaveAttribute("aria-label", /Every piece is locked: Ronin locked: Clear Act 1/);
  // The rules that earn them sit in the section's unlock fold, grouped by rule:
  // every set's frame and shoulders with Act 1, its helmet with Act 2.
  const fold = room(page).locator(".setlocks .lockfold");
  await expect(fold.locator("summary")).toHaveText(/How to unlock · 24/);
  await fold.locator("summary").click();
  await expect(fold.locator(".lockrow")).toHaveCount(2);
  await expect(fold.locator(".lockrow").filter({ hasText: "Kabuto" })).toContainText(/Clear Act 2/);
  await expect(fold.locator(".lockrow").filter({ hasText: "Sode" })).toContainText(/Clear Act 1/);
  await ronin.click();
  await expect(room(page).locator(".toast")).toHaveText(/^Ronin set locked · Clear Act 1/);
  expect(await page.evaluate(() => window.ccDebug.game.character)).toMatchObject({ frame: "standard", helmet: "standard", shoulder: "none" });

  // After Act 1 the frame and shoulders are earned; the helmet still waits.
  await clearActOne(page);
  await expect(ronin.locator(".sown")).toHaveText("2/3 owned");
  await expect(ronin.locator(".setlock b")).toHaveText("");
  await expect(ronin).not.toHaveClass(/\blocked\b/);
  // Left: every set's helmet, and the Exo-Frame's frame and pods (all MK III).
  await expect(room(page).locator(".setlocks .lockfold summary")).toHaveText(/How to unlock · 10/);
  await ronin.click();
  expect(await page.evaluate(() => window.ccDebug.game.character)).toMatchObject({ frame: "lamellar", helmet: "standard", shoulder: "sode" });
  await expect(room(page).locator(".toast")).toHaveText("Ronin set on · Kabuto locked, skipped");
  await expect(ronin).toHaveAttribute("aria-pressed", "false");
});

test("theme frames are locked on a fresh save and earned with Act 1; the stock frames are open", async ({ page }) => {
  await openCreator(page);
  await tab(page, "suit").click();
  const frames = await page.evaluate(async () => (await import("/src/data/cosmetics.js")).BODY_FRAMES.map((f) => ({ id: f.id, name: f.name, tier: f.tier || 0 })));
  const frameOpt = (id) => opt(page, "frame", frames.findIndex((f) => f.id === id));
  const ACT1 = "Clear Act 1 or survive arena round 10";
  const ACT2 = "Clear Act 2 or survive arena round 15";
  for (const f of frames) {
    const o = frameOpt(f.id);
    if (!f.tier) {
      await expect(o, f.id).not.toHaveClass(/\blocked\b/);
      continue;
    }
    await expect(o, f.id).toHaveClass(/\blocked\b/);
    // Tier 3's rule counts acts, so its hint carries the progress too.
    const hint = f.tier === 2 ? ACT1 : `${ACT2} · 0/2 acts`;
    await expect(o, f.id).toHaveAttribute("title", hint);
    await expect(o, f.id).toHaveAttribute("aria-label", new RegExp(`Locked: ${hint}$`));
    await expect(o.locator(".lockbadge"), f.id).toBeVisible();
  }
  const fold = room(page).locator('.section[data-key="frame"] .lockfold');
  await expect(fold.locator("summary")).toHaveText(`How to unlock · ${frames.filter((f) => f.tier).length}`);
  await frameOpt("duster").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "screenshots/frames-locked-fresh.png" });

  // Picking one says what earns it and leaves the frame as worn (forced: a
  // locked tile is aria-disabled, which Playwright will not click).
  await frameOpt("duster").click({ force: true });
  await expect(room(page).locator(".toast")).toHaveText(`Frontier Duster locked · ${ACT1}`);
  expect(await page.evaluate(() => window.ccDebug.game.character.frame)).toBe("standard");

  await clearActOne(page);
  for (const f of frames.filter((x) => x.tier === 2)) await expect(frameOpt(f.id), f.id).not.toHaveClass(/\blocked\b/);
  await expect(frameOpt("exo")).toHaveClass(/\blocked\b/);
  await expect(fold.locator("summary")).toHaveText("How to unlock · 1");
  await frameOpt("duster").click();
  expect(await page.evaluate(() => window.ccDebug.game.character.frame)).toBe("duster");
  await frameOpt("duster").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "screenshots/frames-after-act1.png" });
});

test("clearing Act 1 announces frames with the MK II gear tier", async ({ page }) => {
  await openCreator(page);
  await page.evaluate(() => {
    // The toast element is made on first use: record what reaches any of them.
    const proto = customElements.get("unlock-toast").prototype;
    const show = proto.show;
    window.__shown = [];
    proto.show = function (msg) {
      window.__shown.push(msg);
      return show.call(this, msg);
    };
    window.ccDebug.game.achievementStats.campaignActsCleared = 1;
    window.dispatchEvent(new CustomEvent("cc:progress"));
  });
  await expect.poll(() => page.evaluate(() => window.__shown)).toContainEqual({ kind: "Gear tier", name: "MK II armor, frames, helmets, visors & shoulders" });
  // The tier plate leads (armour is the first lockable slot); it is what shows.
  const name = page.locator("unlock-toast .plate .name");
  await expect(name).toHaveText("MK II armor, frames, helmets, visors & shoulders");
  await page.screenshot({ path: "screenshots/unlock-toast-frames.png" });
});

test("editing a small piece frames the face, and gives the camera back after", async ({ page }) => {
  await openCreator(page);
  const camera = () => room(page).getAttribute("camera");
  // Focus as the showroom's own keyboard navigation does (focusNav): without
  // scrolling the page, which a bare focus() would, under the fixed panel.
  const focusTile = (key, idx = 0) => opt(page, key, idx).evaluate((el) => el.focus({ preventScroll: true }));
  // Clicks land in place too: Playwright's own scroll-into-view can shift the
  // fixed panel's ancestors on a loaded machine and leave a tile over the tabs.
  const press = (loc) => loc.evaluate((el) => el.click());
  await press(tab(page, "gear"));
  expect(await camera()).toBe("full");
  // Eyewear, the face item and its paint colour: the stage moves in on the face.
  await focusTile("acc.eyes", 1);
  await expect.poll(camera).toBe("face");
  await focusTile("acc.face", 1);
  expect(await camera()).toBe("face");
  // On to a slot that reads on the whole figure: back to the camera the tab had.
  await focusTile("acc.back", 1);
  await expect.poll(camera).toBe("full");
  // A pick by tap frames it too (Safari does not focus a tapped button).
  await press(opt(page, "acc.face", 1));
  await expect.poll(camera).toBe("face");
  await press(tab(page, "colors"));
  expect(await camera()).toBe("full");
  // Hair on the Face tab, which already looks at the face: it stays there.
  await press(tab(page, "face"));
  await focusTile("hair", 2);
  expect(await camera()).toBe("face");
  await focusTile("skinTone", 1);
  expect(await camera()).toBe("face");
  // A camera the player picks this visit wins: editing the eyewear leaves it be.
  await press(tab(page, "gear"));
  await press(room(page).locator('[data-camera="bust"]'));
  await focusTile("acc.eyes", 1);
  await page.waitForTimeout(150);
  expect(await camera()).toBe("bust");
  await focusTile("acc.back", 1);
  expect(await camera()).toBe("bust");
});

test("the canvas creator's preview moves in to the bust on the hair, eyes and face tabs", async ({ page }) => {
  await openLegacyCreator(page);
  const view = async (key) => {
    await legacyTab(page, key);
    return page.evaluate(async () => {
      const { previewFigure } = await import("/src/ui/character-creator.js");
      // Two frames: the game draws the tab, then the figure is on screen.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return previewFigure().wanted.split(":")[0];
    });
  };
  for (const key of ["hair", "eye", "skinTone", "acc.eyes", "acc.face"]) expect(await view(key), key).toBe("bust");
  for (const key of ["shoulder", "helmet", "color", "acc.back"]) expect(await view(key), key).toBe("full");
  await legacyTab(page, "hair");
  await page.waitForTimeout(300);
  await page.screenshot({ path: "screenshots/legacy-preview-bust.png" });
});

test("an expression picked in the showroom changes the face, shows on the LED mask and survives a reload", async ({ page }) => {
  await openCreator(page);
  await tab(page, "face").click();
  const figure = () => room(page).locator(".figure").innerHTML();
  const idx = (id) => page.evaluate(async (k) => (await import("/src/data/cosmetics.js")).EXPRESSIONS.findIndex((e) => e.id === k), id);
  const note = room(page).locator('[data-note="mouth"]');
  // Under the stock closed helmet the Face tab shows the bare head: the pick
  // draws, and the note says the helmet will hide it.
  await expect(note).toBeVisible();
  await expect(note).toContainText("Hidden under the");
  const before = await figure();
  await opt(page, "expression", await idx("grin")).click();
  expect(await page.evaluate(() => window.ccDebug.game.character.expression)).toBe("grin");
  await expect(opt(page, "expression", await idx("grin"))).toHaveAttribute("aria-checked", "true");
  await expect.poll(figure).not.toBe(before);
  // Every tile is drawn: a face close-up wearing its expression.
  expect(await room(page).locator('.opt[data-key="expression"] .thumb svg').count()).toBe(8);
  // On the LED mask the stage keeps the mask on and the note says it lights the pick.
  await page.evaluate(() => {
    Object.assign(window.ccDebug.game.character, { helmet: "ledmask" });
    document.querySelector("agent-showroom").renderAll();
  });
  await opt(page, "expression", await idx("frown")).evaluate((el) => el.click());
  await expect(note).toContainText("lights this pick in pixels");
  expect(await page.evaluate(() => document.querySelector("agent-showroom").stagePeek(window.ccDebug.game.character))).toBe(false);
  await room(page).locator(".save").click();
  await page.reload();
  await page.waitForFunction(() => window.ccDebug?.game);
  expect(await page.evaluate(() => window.ccDebug.game.character.expression)).toBe("frown");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("cc_character")).expression)).toBe("frown");
});

test("presets and looks saved before expressions keep the expression picked", async ({ page }) => {
  await openCreator(page);
  const ch = () => page.evaluate(() => ({ ...window.ccDebug.game.character }));
  const idx = (id) => page.evaluate(async (k) => (await import("/src/data/cosmetics.js")).EXPRESSIONS.findIndex((e) => e.id === k), id);
  await tab(page, "face").click();
  await opt(page, "expression", await idx("smirk")).click();
  // A preset sets the cut and the rest, never the expression.
  await room(page).locator('.preset[data-preset="0"]').click();
  expect(await ch()).toMatchObject({ hair: "short", expression: "smirk" });
  // Two looks saved before expressions: one of table positions, one of ids.
  await page.evaluate(() => {
    localStorage.setItem("cc_saved_looks", JSON.stringify([
      { name: "Old", look: { colorIndex: 3, hairIndex: 12 } },
      { name: "Mid", look: { version: 2, color: "solar_gold", hair: "afro" } },
    ]));
    document.querySelector("agent-showroom").renderLooks();
  });
  await room(page).locator(".look .preset").nth(0).click();
  expect(await ch()).toMatchObject({ color: "void_purple", hair: "long", expression: "smirk" });
  await room(page).locator(".look .preset").nth(1).click();
  expect(await ch()).toMatchObject({ color: "solar_gold", hair: "afro", expression: "smirk" });
  // A look saved with an expression wears it again.
  await room(page).locator(".save-look").click();
  await opt(page, "expression", await idx("shout")).click();
  expect((await ch()).expression).toBe("shout");
  await room(page).locator(".look .preset").nth(2).click();
  expect((await ch()).expression).toBe("smirk");
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

/**
 * Install window.__preview in the page: the canvas preview panel's figure
 * area (above the nameplate) read off the game canvas. `sample()` gives the
 * count of lit pixels (the figure: the panel behind it is near black) and a
 * coarse luminance grid to compare looks by.
 */
const installPreviewProbe = (page) =>
  page.evaluate(async () => {
    const cc = await import("/src/ui/character-creator.js");
    const g = window.ccDebug.game;
    const region = () => {
      const w = g.canvas.width;
      const h = g.canvas.height;
      const L = cc.getCreatorLayout(w, h, g.isTouchDevice && w < 700, g.isTouchDevice);
      return { x: Math.round(L.contentX + L.listW + L.contentGap), y: Math.round(L.contentY), w: Math.round(L.previewW), h: Math.round(L.panelH - 40) };
    };
    window.__preview = {
      figure: cc.previewFigure,
      sample() {
        const r = region();
        const d = g.renderer.ctx.getImageData(r.x, r.y, r.w, r.h).data;
        let lit = 0;
        const B = 8;
        const cols = Math.floor(r.w / B);
        const grid = new Array(cols * Math.floor(r.h / B)).fill(0);
        for (let y = 0; y < r.h; y++) {
          for (let x = 0; x < r.w; x++) {
            const i = (y * r.w + x) * 4;
            const m = Math.max(d[i], d[i + 1], d[i + 2]);
            if (m > 90) lit++;
            const cell = Math.floor(y / B) * cols + Math.floor(x / B);
            if (cell < grid.length) grid[cell] += (d[i] + d[i + 1] + d[i + 2]) / 3 / (B * B);
          }
        }
        return { lit, grid };
      },
      /**
       * Resolves once the look asked for is the one on screen. Checked from
       * the next frame on: the game draws (and asks for the look) first.
       */
      settled: () =>
        new Promise((resolve) => {
          const tick = () => {
            const f = cc.previewFigure();
            if (f.wanted && f.wanted === f.shown) requestAnimationFrame(() => resolve(f));
            else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
    };
  });

const gridDiff = (a, b) => a.reduce((t, v, i) => t + Math.abs(v - b[i]), 0) / a.length;

test("canvas creator preview shows a theme frame", async ({ page }) => {
  await openLegacyCreator(page);
  await legacyTab(page, "frame");
  await installPreviewProbe(page);
  await page.evaluate(() => window.__preview.settled());
  const base = await page.evaluate(() => window.__preview.sample());
  // Two frames of the same look differ only by the panel's animation: the noise floor.
  await page.waitForTimeout(250);
  const again = await page.evaluate(() => window.__preview.sample());
  // Theme frames are earned with Act 1; then picked as a player would, down
  // the SUIT FRAME list to the Abyssal Diver's suit.
  await clearActOne(page);
  // The list steps over the still-locked Exo-Frame, so walk by what is worn.
  const count = await page.evaluate(async () => (await import("/src/data/cosmetics.js")).BODY_FRAMES.length);
  for (let i = 0; i < count && (await page.evaluate(() => window.ccDebug.game.character.frame)) !== "diving"; i++) await page.keyboard.press("ArrowDown");
  expect(await page.evaluate(() => window.ccDebug.game.character.frame)).toBe("diving");
  const f = await page.evaluate(() => window.__preview.settled());
  expect(f.shown).toContain(".diving.");
  const suit = await page.evaluate(() => window.__preview.sample());
  const noise = gridDiff(base.grid, again.grid);
  const change = gridDiff(base.grid, suit.grid);
  console.log(`canvas preview: theme frame changes the figure by ${change.toFixed(2)} (noise ${noise.toFixed(2)})`);
  expect(base.lit).toBeGreaterThan(1000);
  expect(change).toBeGreaterThan(Math.max(2, noise * 4));
  await page.screenshot({ path: "screenshots/legacy-preview-theme-frame.png" });
});

test("the canvas creator's SUIT FRAME list skips locked theme frames until they are earned", async ({ page }) => {
  await openLegacyCreator(page);
  await legacyTab(page, "frame");
  const frames = await page.evaluate(async () => (await import("/src/data/cosmetics.js")).BODY_FRAMES.map((f) => ({ id: f.id, tier: f.tier || 0 })));
  const walk = async () => {
    const seen = [];
    for (let i = 0; i < frames.length; i++) {
      await page.keyboard.press("ArrowDown");
      seen.push(await page.evaluate(() => window.ccDebug.game.character.frame));
    }
    return [...new Set(seen)].sort();
  };
  // A fresh save steps through the stock frames only.
  expect(await walk()).toEqual(frames.filter((f) => !f.tier).map((f) => f.id).sort());
  await page.waitForTimeout(200);
  await page.screenshot({ path: "screenshots/legacy-frames-locked-fresh.png" });
  await clearActOne(page);
  expect(await walk()).toEqual(frames.filter((f) => f.tier !== 3).map((f) => f.id).sort());
});

test("canvas creator preview never blanks while a new look decodes", async ({ page }) => {
  await openLegacyCreator(page);
  await legacyTab(page, "shoulder");
  await installPreviewProbe(page);
  await page.evaluate(() => window.__preview.settled());
  const base = (await page.evaluate(() => window.__preview.sample())).lit;
  // Each look is new to the raster cache, so each one decodes while the last stays up.
  const runs = await page.evaluate(async () => {
    const g = window.ccDebug.game;
    const out = [];
    for (const [frame, helmet] of [["exo", "cockpit"], ["duster", "brim"], ["lamellar", "kabuto"], ["clockwork", "clockface"], ["spacesuit", "bubble"], ["vestment", "hood"]]) {
      g.character.frame = frame;
      g.character.helmet = helmet;
      const t0 = performance.now();
      let frames = 0;
      let minLit = Infinity;
      await new Promise((resolve) => {
        const tick = () => {
          frames++;
          minLit = Math.min(minLit, window.__preview.sample().lit);
          const f = window.__preview.figure();
          if (f.wanted === f.shown) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      out.push({ frame, frames, waitMs: Math.round(performance.now() - t0), decodeMs: Math.round(window.__preview.figure().decodeMs), minLit });
    }
    return out;
  });
  for (const r of runs) console.log(`canvas preview: ${r.frame} decoded in ${r.decodeMs} ms (${r.frames} frames on the last look)`);
  for (const r of runs) expect(r.minLit, `${r.frame}: the preview never empties`).toBeGreaterThan(base * 0.3);
});

test("legacy EXPRESSION tab picks by key and by row, and notes a helmet over the mouth", async ({ page }) => {
  await openLegacyCreator(page);
  await legacyTab(page, "expression");
  const expression = () => page.evaluate(() => window.ccDebug.game.character.expression);
  await page.keyboard.press("ArrowDown");
  expect(await expression()).toBe("smile");
  await page.keyboard.press("ArrowUp");
  expect(await expression()).toBe("default");
  // The preview moves in to the bust, the face bare under the closed helmet.
  const wanted = () =>
    page.evaluate(async () => {
      const { previewFigure } = await import("/src/ui/character-creator.js");
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return previewFigure().wanted;
    });
  expect(await wanted()).toMatch(/^bust:idle:1:/);
  // A click on a row picks it.
  const rowAt = (id) =>
    page.evaluate(async (k) => {
      const { getCreatorLayout, listWindow, CREATOR_CATEGORIES } = await import("/src/ui/character-creator.js");
      const { EXPRESSIONS } = await import("/src/data/cosmetics.js");
      const { getIndex } = await import("/src/core/character-fields.js");
      const g = window.ccDebug.game;
      const cat = CREATOR_CATEGORIES.find((c) => c.key === "expression");
      const rect = g.canvas.getBoundingClientRect();
      const L = getCreatorLayout(g.canvas.width, g.canvas.height, g.isTouchDevice && g.canvas.width < 700, g.isTouchDevice);
      const row = listWindow(L, cat, g.character, getIndex(g.character, "expression")).find((r) => r.type === "item" && r.i === EXPRESSIONS.findIndex((e) => e.id === k));
      const sx = rect.width / g.canvas.width;
      return { x: rect.left + (L.contentX + L.listW / 2) * sx, y: rect.top + (row.y + L.itemH / 2) * sx };
    }, id);
  const p = await rowAt("shocked");
  await page.mouse.click(p.x, p.y);
  expect(await expression()).toBe("shocked");
  // The LED mask lights it: no peek, no note. The brim's bandana covers it.
  const foot = (helmet) =>
    page.evaluate(async (h) => {
      const { getCreatorLayout, faceSlotFoot, CREATOR_CATEGORIES } = await import("/src/ui/character-creator.js");
      const g = window.ccDebug.game;
      g.character.helmet = h;
      const L = getCreatorLayout(g.canvas.width, g.canvas.height, false, false);
      return faceSlotFoot(L, CREATOR_CATEGORIES.find((c) => c.key === "expression"), g.character)?.head.join(" ") ?? null;
    }, helmet);
  expect(await foot("ledmask")).toBeNull();
  expect(await wanted()).toMatch(/^bust:idle:0:/);
  expect(await foot("brim")).toBe("COVERED BY THE MARSHAL'S BRIM");
  expect(await foot("standard")).toBe("HIDDEN UNDER THE STANDARD DOME");
  await page.waitForTimeout(400);
  await page.screenshot({ path: "screenshots/legacy-expression.png" });
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

// A phone on its side keeps the tab strip to two rows, so the lists keep
// their height, and a tap mid-strip lands on the tab under the finger. At
// 844 wide the tabs keep 38px (character-creator.js getCreatorLayout); at
// 667 the strip between the edge-cycle zones holds 14 tabs a row only at
// the phone minimum (28px), 33px as laid out.
for (const [w, h, minTab] of [[844, 390, 38], [667, 375, 28]]) {
  test.describe(`legacy creator tab strip at ${w}x${h}`, () => {
    test.use({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });

    test("two rows of tabs, wide enough, and a tap mid-strip picks that tab", async ({ page }) => {
      await openLegacyCreator(page);
      const strip = await page.evaluate(async () => {
        const { getCreatorLayout, tabRect, CREATOR_CATEGORIES } = await import("/src/ui/character-creator.js");
        const g = window.ccDebug.game;
        const L = getCreatorLayout(g.canvas.width, g.canvas.height, g.isTouchDevice && g.canvas.width < 700, g.isTouchDevice);
        const k = g.canvas.getBoundingClientRect().width / g.canvas.width;
        const rects = CREATOR_CATEGORIES.map((c, i) => tabRect(L, i));
        return { touch: !!g.isTouchDevice, rows: new Set(rects.map((r) => r.y)).size, minW: Math.min(...rects.map((r) => r.w)) * k, n: rects.length, perRow: L.perRow };
      });
      expect(strip.touch).toBe(true);
      expect(strip.rows).toBe(2);
      expect(strip.minW).toBeGreaterThanOrEqual(minTab);
      // The middle tab of each row, tapped.
      for (const target of [Math.floor(strip.perRow / 2), strip.perRow + Math.floor((strip.n - strip.perRow) / 2)]) {
        const point = await page.evaluate(async (i) => {
          const { getCreatorLayout, tabRect } = await import("/src/ui/character-creator.js");
          const g = window.ccDebug.game;
          const rect = g.canvas.getBoundingClientRect();
          const L = getCreatorLayout(g.canvas.width, g.canvas.height, g.isTouchDevice && g.canvas.width < 700, g.isTouchDevice);
          const t = tabRect(L, i);
          const k = rect.width / g.canvas.width;
          return { x: rect.left + (t.x + t.w / 2) * k, y: rect.top + (t.y + t.h / 2) * k };
        }, target);
        await page.touchscreen.tap(point.x, point.y);
        await expect.poll(() => page.evaluate(() => window.ccDebug.game.creatorCategory)).toBe(target);
      }
    });
  });
}

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
