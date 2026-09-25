import { test, expect } from "@playwright/test";
test.use({ launchOptions: { args: ["--use-gl=angle", "--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] } });

const testReel = {
  id: "spec", bpm: 120, bars: 4, music: [], narration: [], captions: [{ at: 1, len: 6, text: "Bend time." }],
  letterbox: { in: 1, out: 1 },
  shots: [
    { id: "a", at: 0, len: 8, scene: { kind: "art", bg: "deep_space" } },
    { id: "b", at: 8, len: 8, scene: { kind: "campaign", act: 1, level: 5, camera: { kind: "path" } } },
  ],
};

const storage = (page) => page.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])));

async function toMenu(page) {
  await page.goto("/?debug");
  await page.waitForFunction(() => window.ccDebug);
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => window.ccDebug.game.state === "modeSelect");
}

/** Start a reel without awaiting it; `window.__reelDone` flips when it resolves. */
async function startReel(page, reel, opts) {
  await page.evaluate(
    async ([r, o]) => {
      const { playReel } = await import("/src/cinematic/director.js");
      window.__reelDone = false;
      window.__reelEnd = null;
      playReel(window.ccDebug.game, r, { ...o, onEnd: (e) => (window.__reelEnd = e) }).then(() => (window.__reelDone = true));
    },
    [reel, opts],
  );
}

test("a reel plays art then a live level and returns to the menu untouched", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?debug");
  await page.waitForFunction(() => window.ccDebug);
  await page.keyboard.press("Enter");
  const before = await storage(page);
  const focus = await page.evaluate(() => document.activeElement?.id);
  const done = page.evaluate(async (reel) => {
    const { playReel } = await import("/src/cinematic/director.js");
    await playReel(window.ccDebug.game, reel, { returnTo: "menu" });
  }, testReel);
  await page.waitForFunction(() => window.ccDebug.game.state === "cinematic");
  // The level shot comes up: its level is installed while the reel plays it.
  await page.waitForFunction(async () => {
    const { directorState } = await import("/src/cinematic/director.js");
    return directorState(window.ccDebug.game)?.shotId === "b" && window.ccDebug.game.mode === "showcase";
  });
  await page.waitForTimeout(1000);
  await done;
  expect(await page.evaluate(() => window.ccDebug.game.state)).toBe("modeSelect");
  await expect(page.locator("#modeSelect")).toBeVisible();
  expect(await page.evaluate(() => window.ccDebug.game.mode)).not.toBe("showcase");
  expect(await page.evaluate(() => document.activeElement?.id)).toBe(focus);
  expect(await storage(page)).toBe(before);
  expect(errors).toEqual([]);
});

test("any key skips; skipping during the level build leaves nothing behind", async ({ page }) => {
  await page.goto("/?debug");
  await page.waitForFunction(() => window.ccDebug);
  await page.keyboard.press("Enter");
  const map = await page.evaluate(() => window.ccDebug.game.map?.name ?? null);
  await page.evaluate(async (reel) => {
    const { playReel } = await import("/src/cinematic/director.js");
    playReel(window.ccDebug.game, { ...reel, shots: [{ ...reel.shots[1], at: 0, len: 16 }] }, { returnTo: "menu" });
  }, testReel);
  await page.keyboard.press("Space");
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.ccDebug.game.state)).toBe("modeSelect");
  expect(await page.evaluate(() => window.ccDebug.game.map?.name ?? null)).toBe(map);
});

test("the skip key does not also act on the menu it returns to", async ({ page }) => {
  await toMenu(page);
  await startReel(page, testReel, { returnTo: "menu" });
  await page.waitForTimeout(300);
  // Focus sits on Campaign: a Space leaking through would start one.
  await page.keyboard.press("Space");
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.ccDebug.game.state)).toBe("modeSelect");
  expect(await page.evaluate(() => window.__reelEnd)).toEqual({ skipped: true });
  await page.mouse.click(10, 10); // an ordinary menu click still works afterwards
  expect(await page.evaluate(() => window.ccDebug.game.state)).toBe("modeSelect");
});

test("a click on the picture skips to the title", async ({ page }) => {
  await page.goto("/?debug");
  await page.waitForFunction(() => window.ccDebug);
  await startReel(page, testReel, { returnTo: "title" });
  await page.waitForFunction(() => window.ccDebug.game.state === "cinematic");
  await page.waitForTimeout(300);
  await page.mouse.click(640, 360);
  await page.waitForFunction(() => window.__reelDone);
  expect(await page.evaluate(() => window.ccDebug.game.state)).toBe("title");
  await expect(page.locator("#titleScreen")).toBeVisible();
});

test("a hidden tab pauses the reel and it resumes on the same beat", async ({ page }) => {
  await toMenu(page);
  await startReel(page, testReel, { returnTo: "menu" });
  await page.waitForTimeout(500);
  const setHidden = (hidden) =>
    page.evaluate((h) => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => h });
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (h ? "hidden" : "visible") });
      document.dispatchEvent(new Event("visibilitychange"));
    }, hidden);
  const t = () =>
    page.evaluate(async () => {
      const { directorState } = await import("/src/cinematic/director.js");
      return directorState(window.ccDebug.game);
    });
  await setHidden(true);
  const held = (await t()).t;
  const audioBefore = await page.evaluate(() => window.ccDebug.game.audio.ctx?.state ?? null);
  await page.waitForTimeout(600);
  const paused = await t();
  expect(paused.t).toBe(held);
  expect(paused.paused).toBe(true);
  if (audioBefore) expect(await page.evaluate(() => window.ccDebug.game.audio.ctx.state)).not.toBe("running");
  await setHidden(false);
  await page.waitForTimeout(300);
  const resumed = await t();
  // Back on the next frames from where it stopped, not jumped by the hidden time.
  expect(resumed.t).toBeGreaterThan(held);
  expect(resumed.t - held).toBeLessThan(0.5);
  expect(resumed.shotId).toBe(paused.shotId);
  if (audioBefore === "running") expect(await page.evaluate(() => window.ccDebug.game.audio.ctx.state)).toBe("running");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => window.__reelDone);
});

test("the lore video skips only on a held press", async ({ page }) => {
  await toMenu(page);
  await startReel(page, testReel, { returnTo: "campaign" });
  await page.waitForTimeout(300);
  await page.keyboard.press("Space");
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.ccDebug.game.state)).toBe("cinematic");
  await page.keyboard.down("Space");
  await page.waitForTimeout(1000);
  await page.keyboard.up("Space");
  await page.waitForFunction(() => window.__reelDone);
  expect(await page.evaluate(() => window.__reelEnd)).toEqual({ skipped: true });
  // The campaign hand-off owns what comes next; the test stands in for it.
  await page.evaluate(() => (window.ccDebug.game.state = "modeSelect"));
});

// ─── Title attract loop and Watch Trailer ─────────────────────────────────

const reelState = (page) =>
  page.evaluate(async () => {
    const { directorState } = await import("/src/cinematic/director.js");
    return directorState(window.ccDebug.game);
  });

/** Boot on a fake clock (it still runs in real time until told otherwise). */
async function bootIdle(page) {
  await page.clock.install();
  await page.goto("/?debug");
  await page.waitForFunction(() => window.ccDebug);
  // The settings deck preloads while the title is idle; the attract waits it out.
  await page.waitForFunction(() => window.ccDebug.game.settingsDeck);
}

test("leaving the title alone plays the sizzle reel; any key comes back to the title", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await bootIdle(page);
  await page.clock.fastForward(26000);
  await page.waitForFunction(() => window.ccDebug.game.state === "cinematic");
  expect((await reelState(page)).reelId).toBe("sizzle");
  await page.waitForTimeout(500);
  await page.keyboard.press("KeyA");
  await page.waitForFunction(() => window.ccDebug.game.state === "title");
  await expect(page.locator("#titleScreen")).toBeVisible();
  // The skip key is only a skip: the title did not also take it as "start".
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.ccDebug.game.state)).toBe("title");
  expect(errors).toEqual([]);
});

test("the attract loop never starts over the analytics consent card", async ({ page }) => {
  await bootIdle(page);
  await page.evaluate(() => window.dispatchEvent(new Event("cc:first-interaction")));
  await expect(page.locator("#cc-analytics-modal")).toBeVisible();
  await page.clock.fastForward(26000);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.ccDebug.game.state)).toBe("title");
  await page.clock.fastForward(26000);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.ccDebug.game.state)).toBe("title");
});

test("before any gesture the attract loop is silent and still captioned", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await bootIdle(page);
  await page.clock.fastForward(26000);
  await page.waitForFunction(() => window.ccDebug.game.state === "cinematic");
  const audio = await page.evaluate(() => ({ ctx: window.ccDebug.game.audio.ctx?.state ?? null, muted: window.ccDebug.game.audio._muted }));
  expect(audio.ctx === null || audio.ctx !== "running").toBe(true);
  expect(audio.muted).toBe(true);
  // "Chrono-Corp Station." is up from 0.5 s to 3 s: bright pixels in the caption lane.
  await expect.poll(async () => (await reelState(page))?.t ?? 0).toBeGreaterThan(1.2);
  const bright = await page.evaluate(() => {
    const c = document.getElementById("hudCanvas");
    const g = c.getContext("2d");
    const d = g.getImageData(0, Math.round(c.height * 0.5), Math.round(c.width * 0.6), Math.round(c.height * 0.5)).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && d[i] + d[i + 1] + d[i + 2] > 450) n++;
    return n;
  });
  expect(bright).toBeGreaterThan(200);
  await page.mouse.click(640, 360);
  await page.waitForFunction(() => window.ccDebug.game.state === "title");
  expect(await page.evaluate(() => window.ccDebug.game.audio._muted)).toBe(false);
  expect(errors).toEqual([]);
});

test("Watch Trailer plays with sound, hides the consent card, and Escape returns to its button", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await toMenu(page);
  const before = await storage(page);
  // Entering the menu is the first interaction: the consent card is up.
  await expect(page.locator("#cc-analytics-modal")).toBeVisible();
  await page.locator("#btnTrailer").click();
  await page.waitForFunction(() => window.ccDebug.game.state === "cinematic");
  expect((await reelState(page)).reelId).toBe("sizzle");
  await expect(page.locator("#cc-analytics-modal")).toBeHidden();
  expect(await page.evaluate(() => window.ccDebug.game.audio._muted)).toBe(false);
  expect(await page.evaluate(() => window.ccDebug.game.audio.ctx?.state)).toBe("running");
  await page.waitForTimeout(600);
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => window.ccDebug.game.state === "modeSelect");
  await expect(page.locator("#modeSelect")).toBeVisible();
  expect(await page.evaluate(() => document.activeElement?.id)).toBe("btnTrailer");
  // Still unanswered, and askable: back as it was, no choice written.
  await expect(page.locator("#cc-analytics-modal")).toBeVisible();
  expect(await storage(page)).toBe(before);
  // The skip Escape did not also go back to the title.
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.ccDebug.game.state)).toBe("modeSelect");
  expect(errors).toEqual([]);
});

test("0 on mode select starts the trailer", async ({ page }) => {
  await toMenu(page);
  await page.keyboard.press("Digit0");
  await page.waitForFunction(() => window.ccDebug.game.state === "cinematic");
  await page.keyboard.press("Space");
  await page.waitForFunction(() => window.ccDebug.game.state === "modeSelect");
  expect(await page.evaluate(() => document.activeElement?.id)).toBe("btnTrailer");
});
