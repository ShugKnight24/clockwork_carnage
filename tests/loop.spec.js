/**
 * Main-loop guarantees: one rAF chain, a frame cap that actually holds, and a
 * loop that survives a burst of failing frames instead of stopping forever.
 */
import { test, expect } from "@playwright/test";
import { loadGame, debug } from "./helpers.js";

test("gameLoop schedules exactly one callback per frame", async ({ page }) => {
  // Count the frames gameLoop ran in (distinct rAF timestamps) against how
  // often it ran. Other UI animates on rAF too, so all callbacks together
  // are not the frame count.
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    const probe = (window.__raf = { runs: 0, stamps: new Set() });
    window.requestAnimationFrame = (cb) => {
      if (cb.name !== "gameLoop") return raf(cb);
      return raf((ts) => {
        probe.runs++;
        probe.stamps.add(ts);
        return cb(ts);
      });
    };
  });
  await loadGame(page);
  await debug(page, "startArena");
  await page.waitForTimeout(2000);

  const { runs, frames } = await page.evaluate(() => ({
    runs: window.__raf.runs,
    frames: window.__raf.stamps.size,
  }));
  // A duplicated chain would run gameLoop about twice per frame.
  expect(frames).toBeGreaterThan(10);
  expect(runs).toBeLessThanOrEqual(frames + 2);
});

test("a 30 fps cap holds without starving the render scale", async ({ page }) => {
  await loadGame(page);
  await debug(page, "startArena");
  await debug(page, "godMode", true);

  const sample = await page.evaluate(async () => {
    const g = window.ccDebug.game;
    g.settings.batterySaver = true;
    const orig = g.render.bind(g);
    let rendered = 0;
    g.render = (...a) => {
      rendered++;
      return orig(...a);
    };
    const t0 = performance.now();
    await new Promise((r) => setTimeout(r, 4000));
    const ms = performance.now() - t0;
    g.render = orig;
    return {
      perSecond: (rendered / ms) * 1000,
      targetFPS: g.quality.targetFPS,
      renderScale: g.quality.renderScale,
    };
  });

  expect(sample.perSecond).toBeLessThanOrEqual(34);
  // The target has to follow the cap, or adaptive quality reads a deliberate
  // 30 fps as a slow machine and walks the scale down to the 0.35 floor.
  expect(sample.targetFPS).toBeLessThan(40);
  expect(sample.renderScale).toBeGreaterThan(0.8);
});

test("the loop recovers instead of halting after a burst of errors", async ({ page }) => {
  await loadGame(page);
  await debug(page, "startArena");

  await page.evaluate(() => {
    const g = window.ccDebug.game;
    const orig = g.render.bind(g);
    let n = 0;
    g.render = (...a) => {
      if (n++ < 90) throw new Error("probe-induced render failure");
      return orig(...a);
    };
    window.__frames = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) =>
      raf((ts) => {
        window.__frames++;
        return cb(ts);
      });
  });
  await page.waitForTimeout(3000);

  const after = await page.evaluate(() => ({
    frames: window.__frames,
    state: window.ccDebug.getState(),
  }));
  // Before the fix this stopped dead at 59 frames with the canvas frozen.
  expect(after.frames).toBeGreaterThan(120);
  expect(after.state).toBe("modeSelect");
});
