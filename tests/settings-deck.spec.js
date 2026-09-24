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
async function fakePad(page) {
  await page.addInitScript(() => {
    const pad = {
      id: "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)",
      index: 0, mapping: "standard", connected: true, timestamp: 1,
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
      axes: [0, 0, 0, 0],
    };
    window.__padSet = (i, on) => { pad.buttons[i] = { pressed: on, touched: on, value: on ? 1 : 0 }; pad.timestamp++; };
    Object.defineProperty(navigator, "getGamepads", { value: () => [pad, null, null, null], configurable: true });
  });
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
