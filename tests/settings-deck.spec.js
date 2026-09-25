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

// Touch phones: a landscape phone keeps a full-height side panel (a bottom
// sheet there left about one row), portrait gets the sheet.
for (const [width, height, layout] of [[667, 375, "side"], [812, 375, "side"], [375, 812, "sheet"]]) {
  test(`touch ${width}x${height}: ${layout}, rows usable, the live view still shows`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto("/?debug");
    await page.waitForFunction(() => window.ccDebug);
    await page.evaluate(() => window.ccDebug.startCampaign(0, 1));
    await page.waitForFunction(() => window.ccDebug.game.state === "playing");
    await page.evaluate(() => { window.ccDebug.game.pauseGame(); window.ccDebug.game.openSettings({ returnTo: "pause", section: "video" }); });
    await expect(deck(page)).toHaveAttribute("open", "");
    await expect(deck(page)).toHaveAttribute("layout", layout);
    const m = await page.evaluate(() => {
      const root = document.querySelector("settings-deck").shadowRoot;
      const panel = root.querySelector(".panel").getBoundingClientRect();
      const box = root.querySelector(".rows").getBoundingClientRect();
      const rows = [...root.querySelectorAll(".rows .row")];
      return {
        panel: { left: panel.left, top: panel.top, width: panel.width, height: panel.height },
        visibleRows: rows.filter((r) => { const b = r.getBoundingClientRect(); return b.top >= box.top - 1 && b.bottom <= box.bottom + 1; }).length,
        minRow: Math.min(...rows.map((r) => r.getBoundingClientRect().height)),
      };
    });
    expect(m.minRow).toBeGreaterThanOrEqual(44);
    // No keyboard hints on a touch screen.
    await expect(deck(page)).toHaveAttribute("input", "touch");
    await expect(deck(page).locator(".back .in-kb")).toBeHidden();
    if (layout === "side") {
      expect(m.panel.height).toBeGreaterThanOrEqual(height - 40); // full height
      expect(m.panel.left).toBeGreaterThanOrEqual(width * 0.4 - 1); // 40% of the live view left
      expect(m.visibleRows).toBeGreaterThanOrEqual(3);
    } else {
      expect(m.visibleRows).toBeGreaterThanOrEqual(4);
    }
    await ctx.close();
  });
}

test("every interactive target is at least 44px tall", async ({ page }) => {
  await openDeck(page);
  await deck(page).locator('[role="tab"]', { hasText: "Video" }).click();
  const small = await page.evaluate(() =>
    [...document.querySelector("settings-deck").shadowRoot.querySelectorAll("button, [role=switch], [role=slider], [role=tab]")]
      .filter((el) => el.offsetParent && el.getBoundingClientRect().height < 44)
      .map((el) => el.dataset.key || el.textContent.trim()));
  expect(small).toEqual([]);
});

// ── Flows: the deck wired into the game (Task 4) ──────────────

// A standard pad the game can poll; __padSet(i, on) presses button i.
async function fakePad(page, id = "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)") {
  await page.addInitScript((padId) => {
    const pad = {
      id: padId,
      index: 0, mapping: "standard", connected: true, timestamp: 1,
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
      axes: [0, 0, 0, 0],
    };
    window.__padSet = (i, on) => { pad.buttons[i] = { pressed: on, touched: on, value: on ? 1 : 0 }; pad.timestamp++; };
    Object.defineProperty(navigator, "getGamepads", { value: () => [pad, null, null, null], configurable: true });
  }, id);
}

async function tapPad(page, i, hold = 80) {
  await page.evaluate((b) => window.__padSet(b, true), i);
  await page.waitForTimeout(hold);
  await page.evaluate((b) => window.__padSet(b, false), i);
  await page.waitForTimeout(80);
}

async function openFromMenu(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?debug");
  await page.waitForFunction(() => window.ccDebug);
  await page.keyboard.press("Enter"); // title → mode select
  await page.locator("#btnSettings").click();
  await expect(deck(page)).toHaveAttribute("open", "");
}

async function startPaused(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?debug");
  await page.waitForFunction(() => window.ccDebug);
  await page.evaluate(() => window.ccDebug.startCampaign(0, 1));
  await page.waitForFunction(() => window.ccDebug.game.state === "playing");
  await page.evaluate(() => window.ccDebug.game.pauseGame());
}

const state = (page) => page.evaluate(() => window.ccDebug.game.state);
const setting = (page, key) => page.evaluate((k) => window.ccDebug.game.settings[k], key);
const focusedKey = (page) => page.evaluate(() => document.querySelector("settings-deck").shadowRoot.activeElement?.dataset.key);

test("keyboard only: reach Video, flip bloom, leave to mode select", async ({ page }) => {
  await openFromMenu(page);
  await page.keyboard.press("KeyE"); // Video
  await page.evaluate(() => document.querySelector("settings-deck").focusRowByKey("enableBloom"));
  const before = await setting(page, "enableBloom");
  await page.keyboard.press("Enter");
  expect(await setting(page, "enableBloom")).toBe(!before);
  await page.keyboard.press("Escape");
  expect(await state(page)).toBe("modeSelect");
  // The menu is back exactly as the old Back path left it.
  await expect(deck(page)).not.toHaveAttribute("open", "");
  await expect(page.locator("#modeSelect")).toBeVisible();
  await expect(page.locator("#gameCanvas")).toBeHidden();
});

test("PageDown / PageUp / Home / End jump through the rows", async ({ page }) => {
  await openFromMenu(page);
  await page.keyboard.press("KeyE"); // Video
  const keys = await page.evaluate(() => document.querySelector("settings-deck").items.map((i) => i.key));
  await page.keyboard.press("PageDown");
  expect(await focusedKey(page)).toBe(keys[5]);
  await page.keyboard.press("End");
  expect(await focusedKey(page)).toBe(keys.at(-1));
  await page.keyboard.press("PageUp");
  expect(await focusedKey(page)).toBe(keys.at(-6));
  await page.keyboard.press("Home");
  expect(await focusedKey(page)).toBe(keys[0]);
});

test("a row changed from its default is marked, with an accessible description", async ({ page }) => {
  await openFromMenu(page);
  await page.keyboard.press("KeyE"); // Video
  const row = deck(page).locator('[data-key="enableFilmGrain"]');
  const was = await setting(page, "enableFilmGrain");
  const dflt = await page.evaluate(async () => (await import("/js/settings-registry.js")).DEFAULT_SETTINGS.enableFilmGrain);
  expect(was).toBe(dflt);
  await expect(row).not.toHaveClass(/\bchanged\b/);
  await expect(row).not.toHaveAttribute("aria-description", /./);
  await row.click();
  await expect(row).toHaveClass(/\bchanged\b/);
  await expect(row).toHaveAttribute("aria-description", "Changed from default");
  await row.click();
  await expect(row).not.toHaveClass(/\bchanged\b/);
  // Remap rows too.
  await page.mouse.move(5, 5); // off the list, so no hover moves the focus
  await page.evaluate(() => document.querySelector("settings-deck").focusRowByKey("remap:keyboard:interact"));
  await page.keyboard.press("Enter");
  await page.keyboard.press("KeyF"); // FPS counter's key: swap
  await page.keyboard.press("Enter");
  await expect(deck(page).locator('[data-key="remap:keyboard:interact"]')).toHaveAttribute("aria-description", "Changed from default");
  await expect(deck(page).locator('[data-key="remap:keyboard:moveForward"]')).not.toHaveAttribute("aria-description", /./);
});

test("a cursor resting on the list never takes focus from the keys; moving it does", async ({ page }) => {
  await startPaused(page);
  await page.evaluate(() => window.ccDebug.game.openSettings({ returnTo: "pause", section: "video" }));
  await expect(deck(page)).toHaveAttribute("open", "");
  const at = await page.evaluate(() => {
    const r = document.querySelector("settings-deck").shadowRoot.querySelector(".rows").getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + 150 };
  });
  await page.mouse.move(at.x, at.y);
  await page.waitForTimeout(100);
  const start = await page.evaluate(() => document.querySelector("settings-deck").state.row);
  const rows = [];
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(80);
    rows.push(await page.evaluate(() => document.querySelector("settings-deck").state.row));
  }
  expect(rows).toEqual([1, 2, 3, 4, 5, 6].map((d) => start + d));
  // A real move hands focus back to the pointer.
  await page.mouse.move(at.x, at.y + 60, { steps: 3 });
  const hovered = await page.evaluate(() => document.querySelector("settings-deck").state.row);
  expect(hovered).not.toBe(start + 6);
});

test("mode select key 9 opens the deck too", async ({ page }) => {
  await page.goto("/?debug");
  await page.waitForFunction(() => window.ccDebug);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Digit9");
  await expect(deck(page)).toHaveAttribute("open", "");
  await expect(page.locator("#modeSelect")).toBeHidden();
  expect(await page.evaluate(() => window.ccDebug.game._settingsReturnTo)).toBe("menu");
});

test("from pause: deck opens over the live match and Escape returns to pause", async ({ page }) => {
  await startPaused(page);
  const pos = await page.evaluate(() => ({ x: window.ccDebug.game.player.x, y: window.ccDebug.game.player.y }));
  await page.keyboard.press("KeyS"); // the pause menu's Settings key
  await expect(deck(page)).toHaveAttribute("open", "");
  expect(await state(page)).toBe("settings");
  await page.keyboard.press("Escape");
  expect(await state(page)).toBe("paused");
  expect(await page.evaluate(() => ({ x: window.ccDebug.game.player.x, y: window.ccDebug.game.player.y }))).toEqual(pos);
});

test("the pause menu's Controls key opens the deck on Controls", async ({ page }) => {
  await startPaused(page);
  await page.keyboard.press("KeyC");
  await expect(deck(page)).toHaveAttribute("open", "");
  await expect(deck(page)).toHaveAttribute("section", "controls");
  await page.keyboard.press("Escape");
  expect(await state(page)).toBe("paused");
});

test("if the deck cannot load, Settings goes straight back to the menu", async ({ page }) => {
  await page.route("**/js/components/settings-deck.js*", (route) => route.abort());
  await page.goto("/?debug");
  await page.waitForFunction(() => window.ccDebug);
  await page.keyboard.press("Enter");
  await page.locator("#btnSettings").click();
  await page.waitForFunction(() => window.ccDebug.game.state === "modeSelect");
  await expect(page.locator("#modeSelect")).toBeVisible();
  expect(await page.evaluate(() => window.ccDebug.game._showcase)).toBeUndefined();
});

test("from pause: no pointer lock, and clicks in the deck or the live view never take it", async ({ page }) => {
  await startPaused(page);
  await page.evaluate(() => {
    window.__locks = 0;
    const orig = HTMLElement.prototype.requestPointerLock;
    HTMLElement.prototype.requestPointerLock = function (...a) { window.__locks++; return orig?.apply(this, a); };
  });
  await page.evaluate(() => window.ccDebug.game.openSettings({ returnTo: "pause" }));
  await expect(deck(page)).toHaveAttribute("open", "");
  const before = await page.evaluate(() => JSON.stringify(window.ccDebug.game.settings));
  await deck(page).locator('[role="tab"]', { hasText: "Video" }).click();
  await page.mouse.click(300, 450); // the live view, left of the panel
  await page.mouse.click(300, 120);
  expect(await page.evaluate(() => window.__locks)).toBe(0);
  expect(await page.evaluate(() => document.pointerLockElement)).toBeNull();
  // A click on the live view is not a click on the old canvas screen.
  expect(await page.evaluate(() => JSON.stringify(window.ccDebug.game.settings))).toBe(before);
  expect(await state(page)).toBe("settings");
});

test("HUD editor returns into the deck, then Escape goes back to the opener", async ({ page }) => {
  await startPaused(page);
  await page.evaluate(() => window.ccDebug.game.openSettings({ returnTo: "pause" }));
  await expect(deck(page)).toHaveAttribute("open", "");
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(() => document.querySelector("settings-deck").focusRowByKey("editCustomHud"));
  await page.keyboard.press("Enter");
  expect(await state(page)).toBe("hudEditor");
  // The editor keeps running (it used to throw every frame and drop to the menu).
  await page.waitForTimeout(1500);
  expect(await state(page)).toBe("hudEditor");
  expect(errors).toEqual([]);
  await expect(deck(page)).not.toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  await expect(deck(page)).toHaveAttribute("open", "");
  expect(await state(page)).toBe("settings");
  await expect(deck(page)).toHaveAttribute("section", "access");
  await page.keyboard.press("Escape");
  expect(await state(page)).toBe("paused");
});

test("changing art style inside the deck re-skins in place and keeps focus", async ({ page }) => {
  await openFromMenu(page);
  await page.keyboard.press("KeyE");
  await page.evaluate(() => document.querySelector("settings-deck").focusRowByKey("artStyle"));
  const skinBefore = await deck(page).getAttribute("skin");
  await page.keyboard.press("ArrowRight");
  const skin = await deck(page).getAttribute("skin");
  const profile = await page.evaluate(() => document.documentElement.dataset.artProfile);
  expect(skin).not.toBe(skinBefore);
  expect(skin).toBe(profile);
  expect(await focusedKey(page)).toBe("artStyle");
});

test("art style changed from pause redraws the live view in the new style", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await startPaused(page);
  await page.evaluate(() => window.ccDebug.game.openSettings({ returnTo: "pause" }));
  await expect(deck(page)).toHaveAttribute("open", "");
  await page.waitForTimeout(1500); // late sprite decodes settle
  // Mean colour of a 24x16 grid of blocks, so film grain and flicker average out.
  const snap = () => page.evaluate(() => {
    const c = window.ccDebug.game.canvas;
    const px = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    const out = [];
    for (let by = 0; by < 16; by++) {
      for (let bx = 0; bx < 24; bx++) {
        let sum = 0, n = 0;
        for (let y = Math.floor((by * c.height) / 16); y < Math.floor(((by + 1) * c.height) / 16); y += 2) {
          for (let x = Math.floor((bx * c.width) / 24); x < Math.floor(((bx + 1) * c.width) / 24); x += 2) {
            const i = (y * c.width + x) * 4;
            sum += px[i] + px[i + 1] + px[i + 2];
            n++;
          }
        }
        out.push(sum / (3 * n));
      }
    }
    return out;
  });
  const diff = (a, b) => a.reduce((n, v, i) => n + (Math.abs(v - b[i]) > 4 ? 1 : 0), 0) / a.length;
  const a = await snap();
  await page.waitForTimeout(300);
  const noise = diff(a, await snap());
  await page.evaluate(() => document.querySelector("settings-deck").focusRowByKey("artStyle"));
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(800);
  const changed = diff(a, await snap());
  expect(changed, `noise ${noise}`).toBeGreaterThan(Math.max(0.1, noise * 5));
  expect(await focusedKey(page)).toBe("artStyle");
  expect(await deck(page).getAttribute("skin")).toBe(await page.evaluate(() => document.documentElement.dataset.artProfile));
  expect(errors).toEqual([]);
});

test("rapid art-style switching from pause with enemies in view never breaks the frame", async ({ page }) => {
  test.setTimeout(60_000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && /Frame error/.test(m.text())) errors.push(m.text().slice(0, 160)); });
  await page.addInitScript(() => { try { if (!sessionStorage.getItem("s")) { localStorage.setItem("cc_settings", JSON.stringify({ artStyle: 1 })); sessionStorage.setItem("s", "1"); } } catch (_) {} });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?debug");
  await page.waitForFunction(() => window.ccDebug);
  await page.evaluate(() => window.ccDebug.startCampaign(5, 1));
  await page.waitForFunction(() => window.ccDebug.game.state === "playing", null, { timeout: 20_000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.ccDebug.game.pauseGame());
  await page.evaluate(() => window.ccDebug.game.openSettings({ returnTo: "pause" }));
  await expect(deck(page)).toHaveAttribute("open", "");
  expect(await page.evaluate(() => window.ccDebug.game.entities.filter((e) => e.type === "enemy").length)).toBeGreaterThan(0);
  for (const [to, gap] of [[1, 600], [0, 700], [2, 500], [1, 600], [2, 700]]) {
    await page.evaluate(async (v) => {
      const g = window.ccDebug.game;
      const def = (await import("/js/settings-registry.js")).SETTINGS_REGISTRY.find((d) => d.key === "artStyle");
      g.settings.artStyle = v;
      def.onChange?.(g);
    }, to);
    await page.waitForTimeout(gap);
  }
  await page.waitForTimeout(1000);
  expect(errors).toEqual([]);
  expect(await state(page)).toBe("settings");
  await page.keyboard.press("Escape");
  expect(await state(page)).toBe("paused");
  await page.evaluate(() => window.ccDebug.game.resumeGame());
  await page.waitForTimeout(500);
  expect(await state(page)).toBe("playing");
  expect(errors).toEqual([]);
});

test("controller only: RB to Video, d-pad to a toggle, A flips, Y compares, X resets, B leaves", async ({ page }) => {
  await fakePad(page);
  await openFromMenu(page);
  await page.waitForFunction(() => window.ccDebug.game.gamepad.connected);
  await tapPad(page, 5); // RB
  await expect(deck(page)).toHaveAttribute("section", "video");
  await tapPad(page, 12); // d-pad up wraps to the reset row…
  await tapPad(page, 12); // …then the last toggle
  expect(await focusedKey(page)).toBe("showPerformanceOverlay");
  const before = await setting(page, "showPerformanceOverlay");
  await tapPad(page, 0); // A
  expect(await setting(page, "showPerformanceOverlay")).toBe(!before);
  await page.evaluate(() => window.__padSet(3, true)); // hold Y: show the value before
  await page.waitForTimeout(120);
  expect(await setting(page, "showPerformanceOverlay")).toBe(before);
  await page.evaluate(() => window.__padSet(3, false)); // release: back to the new value
  await page.waitForTimeout(120);
  expect(await setting(page, "showPerformanceOverlay")).toBe(!before);
  await tapPad(page, 2); // X resets the row
  expect(await setting(page, "showPerformanceOverlay")).toBe(await page.evaluate(async () => (await import("/js/settings-registry.js")).DEFAULT_SETTINGS.showPerformanceOverlay));
  await tapPad(page, 1); // B
  expect(await state(page)).toBe("modeSelect");
  await expect(page.locator("#modeSelect")).toBeVisible();
});

test("controller: holding the d-pad flips a toggle once but keeps sliding a slider", async ({ page }) => {
  await fakePad(page);
  await openFromMenu(page);
  await page.waitForFunction(() => window.ccDebug.game.gamepad.connected);
  await page.evaluate(() => document.querySelector("settings-deck").focusRowByKey("enableFilmGrain"));
  const was = await setting(page, "enableFilmGrain");
  // Count every flip while d-pad right is held.
  await page.evaluate(() => {
    const s = window.ccDebug.game.settings;
    let v = s.enableFilmGrain;
    window.__flips = 0;
    window.__watch = setInterval(() => { if (s.enableFilmGrain !== v) { v = s.enableFilmGrain; window.__flips++; } }, 5);
  });
  await page.evaluate(() => window.__padSet(15, true));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__padSet(15, false));
  await page.waitForTimeout(80);
  expect(await page.evaluate(() => { clearInterval(window.__watch); return window.__flips; })).toBe(1);
  expect(await setting(page, "enableFilmGrain")).toBe(!was);
  await page.evaluate(() => document.querySelector("settings-deck").focusRowByKey("fov"));
  const fov = await setting(page, "fov");
  await page.evaluate(() => window.__padSet(14, true)); // hold d-pad left
  await page.waitForTimeout(900);
  await page.evaluate(() => window.__padSet(14, false));
  await page.waitForTimeout(80);
  expect(fov - (await setting(page, "fov"))).toBeGreaterThan(2);
});

test("controller in the pause menu: LB never quits, Y opens Settings, X asks before quitting", async ({ page }) => {
  await fakePad(page);
  await startPaused(page);
  await page.waitForFunction(() => window.ccDebug.game.gamepad.connected);
  await tapPad(page, 4); // LB (was Q: straight to the title)
  expect(await state(page)).toBe("paused");
  await tapPad(page, 3); // Y
  await expect(deck(page)).toHaveAttribute("open", "");
  expect(await state(page)).toBe("settings");
  await tapPad(page, 1); // B leaves the deck, back to pause
  expect(await state(page)).toBe("paused");
  await tapPad(page, 8); // View opens it too
  expect(await state(page)).toBe("settings");
  await tapPad(page, 1);
  await tapPad(page, 2); // X: the quit prompt
  expect(await page.evaluate(() => window.ccDebug.game.pauseQuitConfirm)).toBe(true);
  expect(await state(page)).toBe("paused");
  await tapPad(page, 1); // B cancels it, still paused
  expect(await page.evaluate(() => window.ccDebug.game.pauseQuitConfirm)).toBe(false);
  expect(await state(page)).toBe("paused");
  await tapPad(page, 2);
  await tapPad(page, 0); // A confirms
  expect(await state(page)).toBe("title");
});

test("Quick shows a controller card only with a pad connected; it calibrates", async ({ page }) => {
  await openFromMenu(page);
  await expect(deck(page).locator('[data-key="card:controller"]')).toHaveCount(0);

  await fakePad(page);
  await openFromMenu(page);
  await page.waitForFunction(() => window.ccDebug.game.gamepad.connected);
  const card = deck(page).locator('[data-key="card:controller"]');
  await expect(card).toBeVisible();
  const status = await page.evaluate(() => window.ccDebug.game.gamepad.status.value);
  await expect(card).toContainText(status);
  await page.evaluate(() => {
    const gp = window.ccDebug.game.gamepad;
    window.__calibrated = 0;
    const orig = gp.calibrate.bind(gp);
    gp.calibrate = (...a) => { window.__calibrated++; return orig(...a); };
  });
  await card.click();
  expect(await page.evaluate(() => window.__calibrated)).toBe(1);
  await card.hover();
  await expect(deck(page).locator(".desc")).toContainText(await page.evaluate(() => window.ccDebug.game.gamepad.status.desc));
});

// ── The menu showcase (Task 6) ────────────────────────────────

test("showcase from the menu never writes progress and restores the menu", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?debug");
  await page.waitForFunction(() => window.ccDebug);
  // Everything but the settings' own storage, which closing the deck saves.
  const SETTINGS_KEYS = ["cc_settings", "cc_keybinds", "cc_padbinds"];
  const snap = () => page.evaluate((skip) => Object.fromEntries(Object.keys(localStorage).filter((k) => !skip.includes(k)).map((k) => [k, localStorage.getItem(k)])), SETTINGS_KEYS);
  await page.keyboard.press("Enter");
  const before = await snap();
  const fields = () => page.evaluate(() => {
    const g = window.ccDebug.game;
    return { map: g.map, mode: g.mode, entities: g.entities.length, player: g.player && { x: g.player.x, y: g.player.y, angle: g.player.angle, health: g.player.health } };
  });
  const gameBefore = await fields();
  await page.evaluate(() => {
    const g = window.ccDebug.game;
    window.__calls = [];
    for (const k of ["queueAriaMessage", "startTrack", "stopMusic", "saveCampaign", "saveArena"]) {
      const host = typeof g[k] === "function" ? g : g.audio;
      const orig = host[k];
      host[k] = (...a) => { window.__calls.push(k); return orig?.apply(host, a); };
    }
  });
  await page.locator("#btnSettings").click();
  await page.waitForFunction(() => window.ccDebug.game.mode === "showcase");
  await expect(page.locator("#gameCanvas")).toHaveCSS("opacity", "1");
  expect(await page.evaluate(() => window.ccDebug.game.entities.filter((e) => e.type === "enemy").every((e) => e.state === "idle"))).toBe(true);
  const hp = await page.evaluate(() => window.ccDebug.game.player.health);
  const x0 = await page.evaluate(() => window.ccDebug.game.player.x);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.ccDebug.game.player.x)).not.toBe(x0);
  // AI and damage never run: the enemies stay idle and the player untouched.
  expect(await page.evaluate(() => window.ccDebug.game.entities.filter((e) => e.type === "enemy").every((e) => e.state === "idle"))).toBe(true);
  expect(await page.evaluate(() => window.ccDebug.game.player.health)).toBe(hp);
  await page.keyboard.press("Escape");
  expect(await state(page)).toBe("modeSelect");
  expect(await fields()).toEqual(gameBefore);
  expect(await page.evaluate(() => window.__calls)).toEqual([]);
  expect(await snap()).toEqual(before);
});

test("Escape during the showcase load leaves the game as it was", async ({ page }) => {
  await page.goto("/?debug");
  await page.waitForFunction(() => window.ccDebug);
  await page.keyboard.press("Enter");
  const snap = () => page.evaluate(() => {
    const g = window.ccDebug.game;
    return { map: g.map?.name ?? null, mode: g.mode, entities: g.entities.length, player: g.player, palette: [g.renderer._actPalette, g.renderer._envLevel] };
  });
  const before = await snap();
  // Count installs: the showcase applies its act palette only once installed.
  await page.evaluate(() => {
    const r = window.ccDebug.game.renderer;
    const orig = r.applyActPalette.bind(r);
    window.__palettes = 0;
    r.applyActPalette = (...a) => { window.__palettes++; return orig(...a); };
  });
  // Escape in the same task as the click, so no frame has run: the deck is
  // not open yet and the showcase is still loading. (A separate key press
  // can land a few hundred ms later, after a fast load has installed.)
  await page.evaluate(() => {
    document.getElementById("btnSettings").click();
    document.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape", key: "Escape", bubbles: true }));
  });
  await page.waitForTimeout(800);
  expect(await state(page)).toBe("modeSelect");
  expect(await snap()).toEqual(before);
  expect(await page.evaluate(() => window.ccDebug.game._showcase)).toBeUndefined();
  expect(await page.evaluate(() => window.__palettes)).toBe(0); // it never installed
  await expect(page.locator("#modeSelect")).toBeVisible();
});

// Mean alpha-weighted brightness of a 24x16 grid of HUD blocks.
const hudBlocks = (page) => page.evaluate(() => {
  const c = window.ccDebug.game.hudCanvas;
  const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  const out = [];
  for (let by = 0; by < 16; by++) {
    for (let bx = 0; bx < 24; bx++) {
      let sum = 0, n = 0;
      for (let y = Math.floor((by * c.height) / 16); y < Math.floor(((by + 1) * c.height) / 16); y += 2) {
        for (let x = Math.floor((bx * c.width) / 24); x < Math.floor(((bx + 1) * c.width) / 24); x += 2) {
          const i = (y * c.width + x) * 4;
          sum += ((d[i] + d[i + 1] + d[i + 2]) / 3) * (d[i + 3] / 255);
          n++;
        }
      }
      out.push(sum / n);
    }
  }
  return out;
});
const blockDiff = (a, b) => a.reduce((n, v, i) => n + (Math.abs(v - b[i]) > 3 ? 1 : 0), 0);

test("the HUD shows behind the deck from pause, and HUD settings change it", async ({ page }) => {
  await startPaused(page);
  await page.evaluate(() => window.ccDebug.game.openSettings({ returnTo: "pause" }));
  await expect(deck(page)).toHaveAttribute("open", "");
  await page.waitForTimeout(400);
  const a = await hudBlocks(page);
  expect(a.filter((v) => v > 1).length).toBeGreaterThan(20); // the match's HUD, not a cleared canvas
  await page.waitForTimeout(300);
  const noise = blockDiff(a, await hudBlocks(page));
  await page.evaluate(() => document.querySelector("settings-deck").focusRowByKey("showPortrait"));
  const was = await setting(page, "showPortrait");
  await page.keyboard.press("Enter");
  expect(await setting(page, "showPortrait")).toBe(!was);
  await page.waitForTimeout(300);
  const changed = blockDiff(a, await hudBlocks(page));
  expect(changed, `noise ${noise}`).toBeGreaterThan(Math.max(3, noise * 3));
});

test("the showcase draws a HUD with a fresh player's values", async ({ page }) => {
  await openFromMenu(page);
  await page.waitForFunction(() => window.ccDebug.game.mode === "showcase");
  await page.waitForTimeout(400);
  expect((await hudBlocks(page)).filter((v) => v > 1).length).toBeGreaterThan(20);
  expect(await page.evaluate(() => { const p = window.ccDebug.game.player; return [p.health, p.maxHealth, p.score, p.kills]; })).toEqual([100, 100, 0, 0]);
});

test("releasing a volume slider plays a sample on its bus", async ({ page }) => {
  await openFromMenu(page);
  await page.evaluate(() => {
    const a = window.ccDebug.game.audio;
    window.__samples = [];
    for (const k of ["shootPistol", "musicSting", "speak"]) {
      const orig = a[k];
      a[k] = (...args) => { window.__samples.push(k); return orig.apply(a, args); };
    }
  });
  await deck(page).locator('[role="tab"]', { hasText: "Audio" }).click();
  const music = deck(page).locator('[role="slider"][data-key="musicVolume"]');
  const box = await music.locator(".track").boundingBox();
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height / 2);
  expect(await page.evaluate(() => window.__samples)).toEqual(["musicSting"]);
  // Keys: one sample once the nudges pause, not one per step.
  await page.evaluate(() => document.querySelector("settings-deck").focusRowByKey("voiceVolume"));
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__samples)).toEqual(["musicSting", "speak"]);
});

// ── Remapping (Task 8) ───────────────────────────────────────

const dialog = (page) => deck(page).locator('[role="alertdialog"]');
const focusRow = (page, key) => page.evaluate((k) => document.querySelector("settings-deck").focusRowByKey(k), key);
const keybind = (page, action) => page.evaluate((a) => window.ccDebug.game.keybinds[a], action);
const padBind = (page, action) => page.evaluate((a) => window.ccDebug.game.gamepad.bindings[a], action);
const activeInDeck = (page) => page.evaluate(() => {
  const a = document.querySelector("settings-deck").shadowRoot.activeElement;
  return a?.dataset.key ?? a?.getAttribute("role") ?? a?.dataset.confirm ?? a?.tagName;
});

test("remap Interact to F: prompt updates, play responds, reset restores", async ({ page }) => {
  await openFromMenu(page);
  for (let i = 0; i < 3; i++) await page.keyboard.press("KeyE"); // Controls
  await expect(deck(page)).toHaveAttribute("section", "controls");
  await focusRow(page, "remap:keyboard:interact");
  await page.keyboard.press("Enter");
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page)).toHaveAttribute("aria-modal", "true");
  await expect(dialog(page)).toContainText("Press a key for Interact");
  expect(await activeInDeck(page)).toBe("alertdialog"); // focus moved into the dialog
  await page.keyboard.press("KeyF");
  // KeyF was toggleFPS: conflict dialog, confirm the swap
  await expect(dialog(page)).toContainText("FPS counter");
  await expect(dialog(page)).toContainText("Swap?");
  expect(await activeInDeck(page)).toBe("yes");
  await page.keyboard.press("Enter");
  await expect(dialog(page)).toBeHidden();
  expect(await activeInDeck(page)).toBe("remap:keyboard:interact"); // focus back on the cell
  expect(await keybind(page, "interact")).toBe("KeyF");
  expect(await keybind(page, "toggleFPS")).toBe("KeyE");
  await expect(deck(page).locator('[data-key="remap:keyboard:interact"] .bind')).toHaveText("F");
  await expect(deck(page).locator('[data-key="remap:keyboard:toggleFPS"] .bind')).toHaveText("E");
  // Prompts read the same table.
  expect(await page.evaluate(async () => (await import("/src/ui/input-glyphs.js")).glyph(window.ccDebug.game, "interact", "keyboard").text)).toBe("F");
  // Survives a reload (InputManager storage).
  await page.reload();
  await page.waitForFunction(() => window.ccDebug);
  expect(await keybind(page, "interact")).toBe("KeyF");
  expect(await keybind(page, "toggleFPS")).toBe("KeyE");
  await page.keyboard.press("Enter");
  await page.locator("#btnSettings").click();
  await expect(deck(page)).toHaveAttribute("open", "");
  await focusRow(page, "resetKeyboard");
  await page.keyboard.press("Enter");
  expect(await keybind(page, "interact")).toBe("KeyE");
  expect(await keybind(page, "toggleFPS")).toBe("KeyF");
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem("cc_keybinds"))).interact).toBe("KeyE");
});

test("Escape cannot be bound", async ({ page }) => {
  await openFromMenu(page);
  for (let i = 0; i < 3; i++) await page.keyboard.press("KeyE");
  await focusRow(page, "remap:keyboard:interact");
  await page.keyboard.press("Enter");
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  expect(await keybind(page, "interact")).toBe("KeyE");
  expect(await state(page)).toBe("settings"); // Esc cancelled the capture, not the deck
  expect(await activeInDeck(page)).toBe("remap:keyboard:interact");
});

test("a rebound key works in play at once", async ({ page }) => {
  await startPaused(page);
  await page.keyboard.press("KeyS"); // pause → Settings
  await expect(deck(page)).toHaveAttribute("open", "");
  await focusRow(page, "remap:keyboard:interact");
  await page.keyboard.press("Enter");
  await page.keyboard.press("KeyG"); // free: no swap prompt
  await expect(dialog(page)).toBeHidden();
  expect(await keybind(page, "interact")).toBe("KeyG");
  expect(await page.evaluate(() => window.ccDebug.game.input.keybinds === window.ccDebug.game.keybinds)).toBe(true);
  await page.keyboard.press("Escape"); // deck → pause
  await page.evaluate(() => {
    const g = window.ccDebug.game;
    g.resumeGame();
    window.__interacts = 0;
    const orig = g.interact.bind(g);
    g.interact = (...a) => { window.__interacts++; return orig(...a); };
  });
  expect(await state(page)).toBe("playing");
  await page.keyboard.press("KeyE");
  expect(await page.evaluate(() => window.__interacts)).toBe(0);
  await page.keyboard.press("KeyG");
  expect(await page.evaluate(() => window.__interacts)).toBe(1);
});

test("capture keeps the browser from acting on Tab, Space and arrows", async ({ page }) => {
  await openFromMenu(page);
  await page.evaluate(() => {
    window.__prevented = {};
    document.addEventListener("keydown", (e) => { window.__prevented[e.code] = e.defaultPrevented; });
  });
  for (const code of ["Tab", "Space", "ArrowDown"]) {
    await focusRow(page, "remap:keyboard:chronoLock");
    await page.keyboard.press("Enter");
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press(code); // a free key: binds without a prompt
    await expect(dialog(page)).toBeHidden();
    expect(await keybind(page, "chronoLock")).toBe(code);
    expect(await activeInDeck(page)).toBe("remap:keyboard:chronoLock");
  }
  expect(await page.evaluate(() => window.__prevented)).toEqual({ Tab: true, Space: true, ArrowDown: true, Enter: true });
});

test("controller: A opens capture without binding, keys are ignored, Y swaps with A, prompts and play follow, reload keeps it", async ({ page }) => {
  await fakePad(page);
  await openFromMenu(page);
  await page.waitForFunction(() => window.ccDebug.game.gamepad.connected);
  await focusRow(page, "remap:gamepad:dash");
  await expect(deck(page).locator('[data-key="remap:gamepad:dash"] .bind')).toHaveText("A");
  await tapPad(page, 0); // A: opens the capture, and must not also bind A or click
  await expect(dialog(page)).toContainText("Press a button for Dash");
  await page.waitForTimeout(100);
  await expect(dialog(page)).toContainText("Press a button for Dash");
  await page.keyboard.press("KeyG"); // the other device: never a binding…
  await expect(dialog(page)).toContainText("Press a button for Dash");
  expect(await keybind(page, "interact")).toBe("KeyE");
  await page.keyboard.press("Escape"); // …but its Escape still cancels
  await expect(dialog(page)).toBeHidden();
  expect(await state(page)).toBe("settings");
  expect(await padBind(page, "dash")).toBe(0);
  await tapPad(page, 0); // capture again
  await expect(dialog(page)).toContainText("Press a button for Dash");
  await tapPad(page, 9); // Start: reserved for pause, so it cancels the capture
  await expect(dialog(page)).toBeHidden();
  expect(await padBind(page, "dash")).toBe(0);
  await tapPad(page, 0); // capture again
  await expect(dialog(page)).toContainText("Press a button for Dash");
  await tapPad(page, 3); // Y: used by Next weapon
  await expect(dialog(page)).toContainText("Next weapon");
  await expect(dialog(page)).toContainText("Swap?");
  await tapPad(page, 0); // A swaps
  await expect(dialog(page)).toBeHidden();
  expect(await padBind(page, "dash")).toBe(3);
  expect(await padBind(page, "weaponNext")).toBe(0);
  expect(await page.evaluate(async () => (await import("/src/ui/input-glyphs.js")).glyph(window.ccDebug.game, "dash", "gamepad").text)).toBe("Y");
  await expect(deck(page).locator('[data-key="remap:gamepad:dash"] .bind')).toHaveText("Y");
  expect(await activeInDeck(page)).toBe("remap:gamepad:dash");
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem("cc_padbinds")))).toEqual({ dash: 3, weaponNext: 0 });

  // In play, Y dashes now.
  await page.reload();
  await page.waitForFunction(() => window.ccDebug);
  expect(await padBind(page, "dash")).toBe(3); // cc_padbinds loaded at start-up
  await page.evaluate(() => window.ccDebug.startCampaign(0, 1));
  await page.waitForFunction(() => window.ccDebug.game.state === "playing");
  await page.evaluate(() => {
    const g = window.ccDebug.game;
    window.__dashes = 0;
    const orig = g.triggerDash.bind(g);
    g.triggerDash = (...a) => { window.__dashes++; return orig(...a); };
  });
  await page.waitForFunction(() => window.ccDebug.game.gamepad.connected);
  await tapPad(page, 3);
  expect(await page.evaluate(() => window.__dashes)).toBe(1);
});

test("controller: Start cancels, the RB pair moves together, reset restores", async ({ page }) => {
  await fakePad(page);
  await openFromMenu(page);
  await page.waitForFunction(() => window.ccDebug.game.gamepad.connected);
  await focusRow(page, "remap:gamepad:dash");
  await tapPad(page, 0);
  await expect(dialog(page)).toBeVisible();
  await tapPad(page, 9); // Start cancels (it can never be a binding)
  await expect(dialog(page)).toBeHidden();
  expect(await padBind(page, "dash")).toBe(0);
  expect(await state(page)).toBe("settings");
  expect(await activeInDeck(page)).toBe("remap:gamepad:dash");
  await tapPad(page, 0);
  await tapPad(page, 5); // RB: rewind and previous weapon
  await expect(dialog(page)).toContainText("Chrono Rewind and Previous weapon");
  await expect(dialog(page)).toContainText("Chrono Rewind and Previous weapon move together to A");
  await tapPad(page, 0);
  expect(await padBind(page, "dash")).toBe(5);
  expect(await padBind(page, "chronoRewind")).toBe(0);
  expect(await padBind(page, "weaponPrev")).toBe(0);
  await focusRow(page, "resetController");
  await tapPad(page, 0);
  expect(await padBind(page, "dash")).toBe(0);
  expect(await padBind(page, "weaponPrev")).toBe(5);
  expect(await page.evaluate(() => localStorage.getItem("cc_padbinds"))).toBe("{}");
});

test("a keyboard capture is cancelled by the pad's Start", async ({ page }) => {
  await fakePad(page);
  await openFromMenu(page);
  await page.waitForFunction(() => window.ccDebug.game.gamepad.connected);
  await focusRow(page, "remap:keyboard:interact");
  await page.keyboard.press("Enter");
  await expect(dialog(page)).toContainText("Press a key for Interact");
  await tapPad(page, 3); // another pad button: ignored
  await expect(dialog(page)).toBeVisible();
  await tapPad(page, 9);
  await expect(dialog(page)).toBeHidden();
  expect(await keybind(page, "interact")).toBe("KeyE");
  expect(await state(page)).toBe("settings");
});

test("controller rows show the connected pad's legends, Xbox with none", async ({ page }) => {
  await openFromMenu(page);
  await focusRow(page, "remap:gamepad:dash");
  await expect(deck(page).locator('[data-key="remap:gamepad:dash"] .bind')).toHaveText("A");
  await fakePad(page, "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)");
  await openFromMenu(page);
  await page.waitForFunction(() => window.ccDebug.game.gamepad.connected);
  await focusRow(page, "remap:gamepad:dash");
  await expect(deck(page).locator('[data-key="remap:gamepad:dash"] .bind')).toHaveText("✕");
  await expect(deck(page).locator('[data-key="remap:gamepad:weaponPrev"] .bind')).toHaveText("R1");
});

test("capture gives up after 8 seconds", async ({ page }) => {
  test.setTimeout(30_000);
  await openFromMenu(page);
  await focusRow(page, "remap:keyboard:interact");
  await page.keyboard.press("Enter");
  await expect(dialog(page)).toBeVisible();
  await page.waitForTimeout(7000);
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page)).toBeHidden({ timeout: 3000 });
  expect(await keybind(page, "interact")).toBe("KeyE");
  expect(await activeInDeck(page)).toBe("remap:keyboard:interact");
  await expect(deck(page).locator('[role="status"]')).toContainText("Interact unchanged");
});

test("controller: B can be bound (it swaps with crouch)", async ({ page }) => {
  await fakePad(page);
  await openFromMenu(page);
  await page.waitForFunction(() => window.ccDebug.game.gamepad.connected);
  await focusRow(page, "remap:gamepad:dash");
  await tapPad(page, 0);
  await expect(dialog(page)).toBeVisible();
  await tapPad(page, 1); // B is a binding now, not the cancel
  await expect(dialog(page)).toContainText("Crouch");
  await tapPad(page, 0); // A confirms the swap
  expect(await padBind(page, "dash")).toBe(1);
  expect(await padBind(page, "crouch")).toBe(0);
});
