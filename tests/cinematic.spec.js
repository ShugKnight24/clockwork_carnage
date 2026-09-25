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

const combatReel = {
  id: "combat", bpm: 120, bars: 5, music: [], narration: [], captions: [],
  shots: [
    {
      id: "fight", at: 0, len: 10, scene: { kind: "campaign", act: 1, level: 2, camera: { kind: "path", loop: 60 } },
      events: [
        { at: 0, type: "spawn", enemy: "henchman", count: 2 },
        { at: 1, type: "attack", target: "all" },
        { at: 2, type: "fire", weapon: 1, dur: 3 },
        { at: 6, type: "card", title: "The Hound", sub: "SUIT C-0016. NOBODY INSIDE.", silhouette: true, len: 3 },
      ],
    },
    {
      id: "slow", at: 10, len: 10, scene: { kind: "campaign", act: 2, level: 1, camera: { kind: "path", loop: 60 } },
      events: [
        { at: 0, type: "spawn", enemy: "drone", count: 3 },
        { at: 1, type: "chrono", on: true },
        { at: 2, type: "fire", weapon: 0, dur: 4 },
        { at: 4, type: "freeze", target: "nearest" },
        { at: 7, type: "rewind" },
      ],
    },
  ],
};

/** What a reel must leave exactly as it found it. */
const gameSnapshot = (page) =>
  page.evaluate(() => {
    const g = window.ccDebug.game;
    // Wall time played keeps counting through a reel, as on any screen.
    const { totalTimePlayed, ...stats } = g.achievementStats;
    return JSON.stringify({
      player: window.ccDebug.getPlayer(),
      chrono: [g.player.chronoActive, g.player.chronoEnergy],
      powers: [...g.chronoPowers.powers],
      stats,
      shots: [g.shotsFired, g.killedEnemies, g.totalEnemies],
      streak: g.killStreakSystem.best,
      timeScale: g.timeScale,
      audioScale: g.audio._timeScale,
      mode: g.mode,
      own: ["damagePlayer", "queueAriaMessage", "triggerAriaOnce", "saveAchievements"].filter((k) => Object.hasOwn(g, k)),
    });
  });

test("a combat reel fights, shifts and locks time, then leaves the player, powers and stats untouched", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await toMenu(page);
  const before = await storage(page);
  const snap = await gameSnapshot(page);
  await startReel(page, combatReel, { returnTo: "menu" });
  // The fight: enemies on screen, the shotgun firing.
  await page.waitForFunction(() => window.ccDebug.game.player.isFiring === true);
  expect(await page.evaluate(() => window.ccDebug.game.player.getWeaponDef().id)).toBe(1);
  expect(await page.evaluate(() => window.ccDebug.game.mode)).toBe("reel");
  // The shift: time slows through the game's own time-scale pass.
  await page.waitForFunction(() => window.ccDebug.game.player.chronoActive === true);
  await page.waitForFunction(() => window.ccDebug.game.timeScale < 0.5);
  await page.waitForFunction(() => !!window.ccDebug.game.chronoPowers.lock);
  await page.waitForFunction(() => window.__reelDone, null, { timeout: 20000 });
  expect(await page.evaluate(() => window.ccDebug.game.state)).toBe("modeSelect");
  expect(await gameSnapshot(page)).toBe(snap);
  expect(await storage(page)).toBe(before);
  expect(errors).toEqual([]);
});

test("skipping in the middle of a Chrono Shift puts time and the music back (Review Focus 1)", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await toMenu(page);
  const snap = await gameSnapshot(page);
  await startReel(page, { ...combatReel, shots: [{ ...combatReel.shots[1], at: 0, len: 12 }], bars: 3 }, { returnTo: "menu" });
  await page.waitForFunction(() => window.ccDebug.game.player.chronoActive === true && window.ccDebug.game.timeScale < 0.5);
  await page.waitForFunction(() => window.ccDebug.game.audio._timeScale < 0.5);
  await page.keyboard.press("Space");
  await page.waitForFunction(() => window.__reelDone);
  // A few frames of the menu: nothing turns the slow-down back on.
  await page.waitForTimeout(300);
  expect(await gameSnapshot(page)).toBe(snap);
  expect(errors).toEqual([]);
});

// One shot of every scene kind, with a style flip, a card over a live level
// and the Meltdown swarm, short enough to play in each art style.
const scenesReel = {
  id: "scenes", bpm: 120, bars: 11, music: [], narration: [], captions: [],
  letterbox: { in: 1, out: 1 },
  shots: [
    { id: "art", at: 0, len: 2, scene: { kind: "art", bg: "deep_space" } },
    {
      id: "campaign", at: 2, len: 6, scene: { kind: "campaign", act: 1, level: 2, camera: { kind: "path", loop: 60 } },
      events: [{ at: 1, type: "fire", weapon: 0, dur: 2 }, { at: 3, type: "card", title: "The Hound", sub: "SUIT C-0016. NOBODY INSIDE.", len: 2 }],
    },
    {
      id: "meltdown", at: 8, len: 8, scene: { kind: "meltdown", pickBeats: 3 },
      events: [{ at: 3, type: "spawn", enemy: "drone", count: 3 }, { at: 4, type: "fire", weapon: 0, dur: 3 }],
    },
    { id: "forge", at: 16, len: 10, scene: { kind: "forge", build: "tower" } },
    {
      id: "creator", at: 26, len: 10, scene: { kind: "creator", looks: "curated" },
      events: [{ at: 2, type: "look" }, { at: 4, type: "look" }, { at: 5, type: "artStyle", style: 0 }, { at: 6, type: "look" }, { at: 7, type: "artStyle", style: 2 }, { at: 8, type: "visor" }],
    },
    { id: "title", at: 36, len: 8, scene: { kind: "title" } },
  ],
};

/** localStorage, every IndexedDB database with each store's record count, and the Forge/creator/settings objects. */
const persisted = (page) =>
  page.evaluate(async () => {
    const ls = Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)]);
    const dbs = [];
    for (const { name, version } of (await indexedDB.databases?.()) ?? []) {
      const db = await new Promise((res, rej) => {
        const req = indexedDB.open(name);
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
      const stores = [];
      for (const s of db.objectStoreNames) {
        const n = await new Promise((res) => {
          const req = db.transaction(s).objectStore(s).count();
          req.onsuccess = () => res(req.result);
        });
        stores.push([s, n]);
      }
      db.close();
      dbs.push([name, version, stores]);
    }
    const g = window.ccDebug.game;
    return JSON.stringify({ ls, dbs, character: g.character, artStyle: g.settings.artStyle, builder: !!g.builder, voxel: !!g.voxelRenderer, meltdown: !!g.meltdown, stats: { ...g.achievementStats, totalTimePlayed: 0 } });
  });

for (const [style, name] of [[0, "Legacy"], [1, "Comic"], [2, "Modern"]]) {
  test(`every scene kind plays in ${name} and nothing persists`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript((s) => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem("cc_settings", JSON.stringify({ artStyle: s }));
      localStorage.setItem("cc_analytics_consent", "declined");
      localStorage.setItem("cc_meltdown_scores", JSON.stringify([{ score: 1234, distance: 120, time: 30, hero: "agent" }]));
      localStorage.setItem("cc_forge_current_slot", "2");
    }, style);
    await toMenu(page);
    expect(await page.evaluate(() => document.documentElement.dataset.artProfile)).toBe(["legacy", "modern", "realistic"][style]);
    const before = await persisted(page);
    // Where the viewmodel is drawn from: only a first-person level with nothing over it.
    await page.evaluate(async () => {
      const { directorState } = await import("/src/cinematic/director.js");
      const g = window.ccDebug.game;
      window.__weaponIn = new Set();
      const draw = g.drawWeapon;
      g.drawWeapon = function (...a) {
        const d = directorState(g);
        if (d) window.__weaponIn.add(d.card ? `${d.shotId}+card` : d.shotId);
        return draw.apply(this, a);
      };
    });
    await startReel(page, scenesReel, { returnTo: "menu" });
    const seen = new Set();
    const probe = async () => {
      const s = await page.evaluate(async () => {
        const { directorState } = await import("/src/cinematic/director.js");
        const g = window.ccDebug.game;
        const d = directorState(g);
        return d && { shot: d.shotId, mode: g.mode, cards: g._meltdownUpgradeChoices?.length ?? 0, art: document.documentElement.dataset.artProfile };
      });
      if (s) seen.add(JSON.stringify(s));
      return s;
    };
    while (!(await page.evaluate(() => window.__reelDone))) {
      await probe();
      await page.waitForTimeout(150);
    }
    // (Before the first frame of the reel no shot is up yet.)
    const shots = [...seen].map((s) => JSON.parse(s)).filter((s) => s.shot);
    expect(new Set(shots.map((s) => s.shot))).toEqual(new Set(scenesReel.shots.map((s) => s.id)));
    // Meltdown opens on the upgrade cards, then runs; the creator flips styles and comes back.
    expect(shots.some((s) => s.shot === "meltdown" && s.cards === 3)).toBe(true);
    expect(shots.some((s) => s.shot === "meltdown" && s.cards === 0 && s.mode === "reel")).toBe(true);
    expect(shots.filter((s) => s.shot === "creator").map((s) => s.art)).toContain(style === 0 ? "realistic" : "legacy");
    expect(shots.filter((s) => s.shot === "title").every((s) => s.art === ["legacy", "modern", "realistic"][style])).toBe(true);
    const weapon = await page.evaluate(() => [...window.__weaponIn]);
    expect(weapon.every((s) => s === "campaign" || s === "meltdown")).toBe(true);
    expect(weapon).toContain("campaign");
    expect(await page.evaluate(() => window.ccDebug.game.state)).toBe("modeSelect");
    expect(await page.evaluate(() => document.documentElement.dataset.artProfile)).toBe(["legacy", "modern", "realistic"][style]);
    expect(await persisted(page)).toBe(before);
    expect(errors).toEqual([]);
  });
}
