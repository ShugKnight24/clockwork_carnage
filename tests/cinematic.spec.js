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
