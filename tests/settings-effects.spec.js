/**
 * Every graphics toggle must visibly change the frame, and keep changing it:
 * the adaptive governor used to overwrite the player's choices within a
 * couple of seconds, and several toggles drew nothing at all.
 *
 * Each case renders a frozen, seeded frame before and after the change, diffs
 * the game canvas against a noise floor measured the same way, then diffs
 * again 3 s later with the governor still running.
 */
import { test, expect } from "@playwright/test";

// Headless Chromium has no WebGL without these, and the GL floor/ceiling
// path is where the Modern deck lives.
test.use({
  launchOptions: { args: ["--use-gl=angle", "--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] },
});

const VIEWPORT = { width: 1280, height: 720 };

// Particle burst in front of the player, rebuilt identically for every render.
const BURST = `g => {
  g.player.particles.length = 0; g.lights.length = window.__L;
  const a = g.player.angle;
  for (let i = -2; i <= 2; i++) {
    const x = g.player.x + Math.cos(a) * 2.2 - Math.sin(a) * i * 0.35;
    const y = g.player.y + Math.sin(a) * 2.2 + Math.cos(a) * i * 0.35;
    g.spawnDeathParticles(x, y, "#ff8800", "#ffee00");
  }
}`;

const CASES = [
  { key: "enableBloom", from: true, to: false },
  { key: "enableChromaticAberration", from: true, to: false },
  { key: "enableFilmGrain", from: true, to: false },
  { key: "floorTexture", from: true, to: false },
  { key: "effectsQuality", from: 2, to: 0, prep: BURST },
  { key: "postProcessing", from: true, to: false },
  { key: "renderScale", from: 100, to: 50, resize: true },
  { key: "graphicsPreset", from: 0, to: 2, resize: true },
];

// Switching Auto -> 3D (WebGL) re-creates the GL context. It used to lose the
// Modern deck textures and fall back to the soft CPU floor.
const SAME = [{ key: "renderMode", from: 0, to: 2 }];

async function setup(browser, artStyle) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  await ctx.addInitScript((s) => {
    if (!sessionStorage.getItem("cc_fx_seeded")) {
      localStorage.setItem("cc_settings", JSON.stringify({ artStyle: s }));
      sessionStorage.setItem("cc_fx_seeded", "1");
    }
  }, artStyle);
  const page = await ctx.newPage();
  await page.goto("/?debug");
  await page.waitForFunction(() => window.ccDebug, null, { timeout: 30_000 });
  await page.evaluate(async () => {
    window.__R = await import("/js/settings-registry.js");
    ccDebug.startCampaign(0, 1);
  });
  await page.waitForTimeout(3500);
  await page.evaluate(() => {
    const g = ccDebug.game;
    ccDebug.godMode(true);
    g.player.health = g.player.maxHealth = 100;
    g.player.hurtTime = 0;
    g.update = function () {}; // freeze the simulation; the rAF loop and governor keep running
    window.__FIXT = g.time;
    window.__L = g.lights.length;
    window.__snaps = {};
    // Deterministic render: seeded Math.random, pinned clocks and game time,
    // synchronous GPU post source. Rendered twice so one-frame lags settle.
    window.__snap = (name, prep) => {
      const orand = Math.random, opn = performance.now, odn = Date.now;
      let s = 12345;
      Math.random = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
      performance.now = () => 5e5;
      Date.now = () => 1.7e12;
      const glr = g.renderer.glRenderer;
      if (glr) glr._syncUpload = true;
      const t = g.time;
      g.time = window.__FIXT;
      try {
        prep && prep(g); g.render();
        s = 12345;
        prep && prep(g); g.render();
      } finally {
        Math.random = orand; performance.now = opn; Date.now = odn; g.time = t;
      }
      const c = g.canvas;
      window.__snaps[name] = { px: c.getContext("2d").getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
    };
    // pct: pixels with any channel off by more than 10; mad: mean abs diff.
    window.__diff = (a, b) => {
      const A = window.__snaps[a], B = window.__snaps[b];
      if (A.w !== B.w || A.h !== B.h) return { resized: true, from: [A.w, A.h], to: [B.w, B.h] };
      const x = A.px, y = B.px;
      let n = 0, sum = 0;
      for (let i = 0; i < x.length; i += 4) {
        const d0 = Math.abs(x[i] - y[i]), d1 = Math.abs(x[i + 1] - y[i + 1]), d2 = Math.abs(x[i + 2] - y[i + 2]);
        sum += d0 + d1 + d2;
        if (d0 > 10 || d1 > 10 || d2 > 10) n++;
      }
      const N = x.length / 4;
      return { pct: (100 * n) / N, mad: sum / (3 * N) };
    };
    window.__set = (key, v) => {
      const def = window.__R.SETTINGS_REGISTRY.find((d) => d.key === key);
      g.settings[key] = v;
      def?.onChange?.(g);
    };
    window.__reset = () => {
      const D = window.__R.DEFAULT_SETTINGS;
      for (const k of Object.keys(D)) if (k !== "artStyle") g.settings[k] = D[k];
      g.applyRenderMode();
      g.applyPerformanceSettings();
      g.showFPS = false;
    };
  });
  // Late sprite decodes and bakes change the first seconds of a level; wait
  // until two frames a second apart match before measuring anything.
  for (let i = 0; i < 12; i++) {
    await page.evaluate(() => { window.__reset(); __snap("W0"); });
    await page.waitForTimeout(1000);
    const d = await page.evaluate(() => { __snap("W1"); return __diff("W0", "W1"); });
    if (!d.resized && d.pct < 0.2) break;
  }
  return { ctx, page };
}

/** Beyond-noise test for one diff: both measures clear the floor. */
function changed(d, noise) {
  if (d.resized) return true;
  return d.pct > Math.max(0.2, noise.pct * 5) && d.mad > Math.max(0.1, noise.mad * 5);
}

for (const [artStyle, name] of [[1, "Comic"], [2, "Modern"]]) {
  test.describe(`graphics settings change the frame (${name})`, () => {
    let session;
    test.beforeAll(async ({ browser }) => {
      session = await setup(browser, artStyle);
    });
    test.afterAll(async () => {
      await session?.ctx.close();
    });

    for (const c of CASES) {
      test(`${c.key}: ${JSON.stringify(c.from)} -> ${JSON.stringify(c.to)}`, async () => {
        const { page } = session;
        const prep = c.prep || "null";
        await page.evaluate(([k, v]) => { window.__reset(); window.__set(k, v); }, [c.key, c.from]);
        await page.waitForTimeout(600);
        await page.evaluate((p) => { __snap("A", eval(p)); }, prep);
        await page.waitForTimeout(400);
        await page.evaluate((p) => { __snap("A2", eval(p)); }, prep);
        const noise = await page.evaluate(() => __diff("A", "A2"));

        await page.evaluate(([k, v]) => window.__set(k, v), [c.key, c.to]);
        await page.waitForTimeout(400);
        await page.evaluate((p) => { __snap("B", eval(p)); }, prep);
        const now = await page.evaluate(() => __diff("A2", "B"));

        await page.waitForTimeout(3000);
        await page.evaluate((p) => { __snap("C", eval(p)); }, prep);
        const later = await page.evaluate(() => __diff("A2", "C"));
        const held = await page.evaluate(() => __diff("B", "C"));
        const setting = await page.evaluate((k) => ccDebug.game.settings[k], c.key);
        // The governor may legitimately change the render size meanwhile, and
        // a resize alone must not count as the toggle holding. So also flip
        // back now and diff at whatever size the frame has reached.
        let toggle = null;
        if (!c.resize) {
          await page.evaluate(([k, v]) => window.__set(k, v), [c.key, c.from]);
          await page.evaluate((p) => { __snap("D", eval(p)); }, prep);
          toggle = await page.evaluate(() => __diff("D", "C"));
        }

        console.log(`[fx] ${name} ${c.key}`, JSON.stringify({ noise, now, later, held, toggle }));
        expect(noise.resized, "noise frames differ in size").toBeFalsy();
        expect(changed(now, noise), `${c.key} changed the frame`).toBe(true);
        expect(setting, "setting kept its value").toEqual(c.to);
        if (c.resize) {
          expect(later.resized, `${c.key} still in effect 3 s later`).toBe(true);
          expect(held.resized, "render size held").toBeFalsy();
        } else {
          expect(toggle.resized, "toggling back resized the frame").toBeFalsy();
          expect(changed(toggle, noise), `${c.key} still changes the frame 3 s later`).toBe(true);
          if (!later.resized) expect(changed(later, noise), `${c.key} still changed 3 s later`).toBe(true);
        }
      });
    }

    for (const c of SAME) {
      test(`${c.key}: ${c.from} -> ${c.to} looks the same`, async () => {
        const { page } = session;
        await page.evaluate(([k, v]) => { window.__reset(); window.__set(k, v); }, [c.key, c.from]);
        await page.waitForTimeout(600);
        await page.evaluate(() => { __snap("A"); });
        await page.waitForTimeout(400);
        await page.evaluate(() => { __snap("A2"); });
        const noise = await page.evaluate(() => __diff("A", "A2"));
        await page.evaluate(([k, v]) => window.__set(k, v), [c.key, c.to]);
        await page.waitForTimeout(400);
        await page.evaluate(() => { __snap("B"); });
        const now = await page.evaluate(() => __diff("A2", "B"));
        await page.evaluate(() => window.__reset());
        console.log(`[fx] ${name} ${c.key} same`, JSON.stringify({ noise, now }));
        expect(now.resized).toBeFalsy();
        expect(changed(now, noise), `${c.key} changed the frame`).toBe(false);
      });
    }

    test("leaving Low or Battery Saver restores full scale and the player's toggles", async () => {
      const { page } = session;
      const r = await page.evaluate(() => {
        const g = ccDebug.game;
        window.__reset();
        window.__set("graphicsPreset", 2);
        const low = g.quality.renderScale;
        window.__set("graphicsPreset", 0);
        const auto = g.quality.renderScale;
        window.__set("batterySaver", true);
        const saver = [g.quality.renderScale, g.quality.enableBloom, g.settings.enableBloom];
        window.__set("batterySaver", false);
        return { low, auto, saver, after: [g.quality.renderScale, g.settings.enableBloom, g.settings.enableChromaticAberration] };
      });
      expect(r.low).toBeCloseTo(0.5);
      expect(r.auto).toBe(1);
      expect(r.saver).toEqual([0.7, false, true]);
      expect(r.after).toEqual([1, true, true]);
    });
  });
}
