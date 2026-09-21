/**
 * Performance budgets across device profiles.
 *
 * Frame-to-frame timing depends on the machine's GPU and whatever else is
 * running, so these budgets check what the game controls and what regresses
 * silently:
 *   - render pixels stay within the device tier's pixel budget (a 4K monitor
 *     must not render 8 MP per frame);
 *   - CPU render time per frame (ccDebug.getPerf().renderMs) stays inside a
 *     per-profile budget in both art styles;
 *   - no main-thread long task over the hitch budget once the scene is warm
 *     (the old GPU post-FX readback and the filtered creator figure both
 *     showed up here as 100-250 ms tasks).
 *
 * Run: npx playwright test tests/perf-budget.spec.js
 */
import { test, expect, chromium } from "@playwright/test";

const PORT = Number(process.env.CC_TEST_PORT ?? 3100);
const URL = `http://localhost:${PORT}`;

// Budgets carry headroom over measured values (M1 Pro, 2026-09-21), so they
// catch regressions rather than machine noise.
const PROFILES = [
  { name: "laptop-hidpi", viewport: { width: 1440, height: 900 }, dpr: 2, cpu: 1, renderMs: 6, pixelCap: 1.8e6 },
  { name: "4k-monitor", viewport: { width: 3840, height: 2160 }, dpr: 1, cpu: 1, renderMs: 8, pixelCap: 1.8e6 },
  { name: "slow-laptop", viewport: { width: 1280, height: 800 }, dpr: 1, cpu: 4, renderMs: 22, pixelCap: 1.8e6 },
  { name: "phone", viewport: { width: 780, height: 360 }, dpr: 3, cpu: 4, touch: true, renderMs: 22, pixelCap: 1.0e6 },
];
const STYLES = [
  { name: "comic", id: 1 },
  { name: "modern", id: 2 },
];
const LONG_TASK_BUDGET = 120;

let browser;
test.beforeAll(async () => {
  // GPU flags: without them headless Chromium has no WebGL and never runs the
  // renderer players actually get.
  browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-gpu"] });
});
test.afterAll(async () => browser?.close());

async function measure(profile, style, scene) {
  const ctx = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: profile.dpr,
    hasTouch: !!profile.touch,
    isMobile: !!profile.touch,
  });
  const page = await ctx.newPage();
  await page.addInitScript((s) => {
    localStorage.setItem("cc_settings", JSON.stringify({ artStyle: s }));
    window.__longTasks = [];
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__longTasks.push(e.duration);
      }).observe({ entryTypes: ["longtask"] });
    } catch (_) {}
  }, style.id);
  if (profile.cpu > 1) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });
  }
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForFunction(() => !!window.ccDebug, null, { timeout: 30_000 });
  const r = await page.evaluate(async (scene) => {
    const d = window.ccDebug;
    const g = d.game;
    if (scene === "campaign") {
      d.startCampaign(1, 1);
      d.godMode(true);
    } else if (scene === "creator") {
      d.showCharacterCreate();
    }
    // Warm: decode art, bake textures, let the governor settle.
    await new Promise((res) => setTimeout(res, 3000));
    window.__longTasks.length = 0;
    const samples = [];
    const sr = document.querySelector("agent-showroom");
    let yaw = 0;
    await new Promise((res) => {
      const end = performance.now() + 3000;
      const tick = () => {
        if (scene === "campaign") {
          g.player.angle += 0.02;
          samples.push(d.getPerf().renderMs);
        } else if (sr?.setYaw) sr.setYaw((yaw += 0.05), true);
        performance.now() < end ? requestAnimationFrame(tick) : res();
      };
      requestAnimationFrame(tick);
    });
    const avg = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;
    return {
      renderMs: avg,
      pixels: g.canvas.width * g.canvas.height,
      longMax: window.__longTasks.length ? Math.max(...window.__longTasks) : 0,
    };
  }, scene);
  await ctx.close();
  return r;
}

for (const profile of PROFILES) {
  for (const style of STYLES) {
    test(`${profile.name} / ${style.name}: gameplay within budget`, async () => {
      test.setTimeout(90_000);
      const r = await measure(profile, style, "campaign");
      test.info().annotations.push({ type: "perf", description: JSON.stringify(r) });
      expect(r.pixels, "render pixels over the tier budget").toBeLessThanOrEqual(profile.pixelCap * 1.01);
      expect(r.renderMs, "CPU render time per frame").toBeLessThanOrEqual(profile.renderMs);
      expect(r.longMax, "main-thread hitch").toBeLessThanOrEqual(LONG_TASK_BUDGET * profile.cpu);
    });
  }
}

for (const style of STYLES) {
  test(`laptop-hidpi / ${style.name}: character creator has no hitches`, async () => {
    test.setTimeout(90_000);
    const r = await measure(PROFILES[0], style, "creator");
    test.info().annotations.push({ type: "perf", description: JSON.stringify(r) });
    expect(r.longMax, "main-thread hitch while turning the agent").toBeLessThanOrEqual(LONG_TASK_BUDGET);
  });
}
