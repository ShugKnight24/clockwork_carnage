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
 *   - the Forge's own voxel phase (phases.voxel) stays inside its own budget,
 *     so a regression there cannot hide inside the wider renderMs figure;
 *   - no main-thread long task over the hitch budget once the scene is warm
 *     (the old GPU post-FX readback and the filtered creator figure both
 *     showed up here as 100-250 ms tasks);
 *   - a long noclip flight in a straight line across an endless Forge world
 *     keeps the voxel phase (streaming included) and the streamer's own share
 *     inside budget, the resident columns inside the unload disc and the
 *     chunk draws under 400 (endless-world spec §17).
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
// The voxel pass measured 0.1-1.1 ms across every profile; 6 ms is loud enough
// to catch a cull or re-mesh regression and quiet enough to survive noise.
const VOXEL_MS_BUDGET = 6;
// Endless-world streaming (spec §6, §17): generation's share of a steady
// frame, the resident set's ceiling (the unload disc at the 160-block draw
// radius: 220 blocks, plus a column's reach) and the draw-call ceiling.
const STREAM_MS_BUDGET = 3;
const MAX_COLUMNS = Math.ceil(Math.PI * ((220 + 12) / 16) ** 2);
const MAX_DRAWS = 400;
const FLIGHT_SECONDS = Number(process.env.CC_FLIGHT_SECONDS ?? 60);

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
    } else if (scene === "forge") {
      d.startBuilder();
      // startBuilder() is fire-and-forget (lazy-loads the voxel renderer and
      // forge.js chunk, then generates or migrates a world) — wait for the
      // state flip and a first drawn chunk before the warm-up timer below,
      // so a slow/throttled load doesn't eat into the warm-up budget.
      await new Promise((res) => {
        const check = () =>
          g.state === "builder" && (g.voxelRenderer?.stats.chunksDrawn ?? 0) > 0
            ? res()
            : requestAnimationFrame(check);
        requestAnimationFrame(check);
      });
      // A freshly loaded world starts with every chunk dirty; let the
      // mesh-budget sweep finish so it isn't still running when sampling
      // starts (a few consecutive idle frames confirm it settled).
      await new Promise((res) => {
        let idle = 0;
        const check = () => {
          idle = g.voxelRenderer.stats.meshedThisFrame === 0 ? idle + 1 : 0;
          idle >= 5 ? res() : requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      });
    }
    // Warm: decode art, bake textures (Modern's first setStyle bakes
    // materials here, ~220ms), let the governor settle.
    await new Promise((res) => setTimeout(res, 3000));
    window.__longTasks.length = 0;
    const samples = [];
    const voxelSamples = [];
    const sr = document.querySelector("agent-showroom");
    let yaw = 0;
    await new Promise((res) => {
      const end = performance.now() + 3000;
      const tick = () => {
        if (scene === "campaign") {
          g.player.angle += 0.02;
          samples.push(d.getPerf().renderMs);
        } else if (scene === "forge") {
          g.builder.player.angle += 0.02;
          const p = d.getPerf();
          samples.push(p.renderMs);
          voxelSamples.push(p.phases.voxel);
        } else if (sr?.setYaw) sr.setYaw((yaw += 0.05), true);
        performance.now() < end ? requestAnimationFrame(tick) : res();
      };
      requestAnimationFrame(tick);
    });
    const avg = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;
    const voxelAvg = voxelSamples.length ? voxelSamples.reduce((a, b) => a + b, 0) / voxelSamples.length : 0;
    return {
      renderMs: avg,
      voxelMs: voxelAvg,
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

for (const profile of PROFILES) {
  for (const style of STYLES) {
    test(`${profile.name} / ${style.name}: forge within budget`, async () => {
      test.setTimeout(90_000);
      const r = await measure(profile, style, "forge");
      test.info().annotations.push({ type: "perf", description: JSON.stringify(r) });
      expect(r.pixels, "render pixels over the tier budget").toBeLessThanOrEqual(profile.pixelCap * 1.01);
      expect(r.renderMs, "CPU render time per frame").toBeLessThanOrEqual(profile.renderMs);
      expect(r.voxelMs, "voxel pass per frame").toBeLessThanOrEqual(VOXEL_MS_BUDGET);
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

/**
 * Fly a new endless Forge world in a straight line at noclip speed, on real
 * key events, sampling every frame: the voxel phase (renderer + streamer),
 * the streamer alone, the frame interval, draws, resident columns and heap.
 */
async function measureFlight(profile) {
  const ctx = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: profile.dpr,
    hasTouch: !!profile.touch,
    isMobile: !!profile.touch,
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    localStorage.setItem("cc_settings", JSON.stringify({ artStyle: 1 }));
    window.__longTasks = [];
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__longTasks.push(e.duration);
      }).observe({ entryTypes: ["longtask"] });
    } catch (_) {}
  });
  if (profile.cpu > 1) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });
  }
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForFunction(() => !!window.ccDebug, null, { timeout: 30_000 });
  const open = await page.evaluate(async () => {
    const t0 = performance.now();
    window.ccDebug.startBuilder();
    const g = window.ccDebug.game;
    await new Promise((res) => {
      const check = () =>
        g.state === "builder" && (g.voxelRenderer?.stats.chunksDrawn ?? 0) > 0 ? res() : requestAnimationFrame(check);
      requestAnimationFrame(check);
    });
    return { firstChunkMs: performance.now() - t0, endless: g.builder.world.endless };
  });
  await page.keyboard.press("Space"); // the onboarding card
  // Entering the Forge the first time bakes the art style's materials, a
  // long task of its own that has nothing to do with worlds. Opening a world
  // is measured on a warm Forge: Ctrl+N, until the ground around the player
  // is meshed and the loading budget has stepped down.
  await page.waitForTimeout(2000);
  await page.evaluate(() => { window.__longTasks.length = 0; });
  const reopen = await page.evaluate(async () => {
    const g = window.ccDebug.game, seed = g.builder.world.meta.gen.seed;
    const t0 = performance.now();
    document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyN", ctrlKey: true, bubbles: true }));
    let first = 0;
    await new Promise((res) => {
      const check = () => {
        const w = g.builder.world;
        const fresh = w.meta.gen.seed !== seed && g.voxelRenderer.world === w;
        if (fresh && !first && g.voxelRenderer.stats.chunksDrawn > 0) first = performance.now() - t0;
        fresh && first && window.ccDebug.forgeWorldStats().pending === 0 ? res() : requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
    return { newWorldFirstChunkMs: first, newWorldLoadedMs: performance.now() - t0 };
  });
  const openLong = await page.evaluate(() => (window.__longTasks.length ? Math.max(...window.__longTasks) : 0));
  await page.keyboard.press("KeyN"); // noclip
  await page.keyboard.down("Space");
  await page.waitForFunction(() => window.ccDebug.game.builder.player.z > 50, null, { timeout: 60_000 });
  await page.keyboard.up("Space");
  await page.keyboard.down("KeyW");
  const r = await page.evaluate(async (seconds) => {
    const d = window.ccDebug, g = d.game, b = g.builder;
    window.__longTasks.length = 0;
    const voxel = [], stream = [], frame = [];
    let draws = 0, columns = 0, meshes = 0, edge = 0, pendingMax = 0;
    const x0 = b.player.x;
    const heap0 = performance.memory?.usedJSHeapSize ?? 0;
    let last = performance.now();
    await new Promise((res) => {
      const end = last + seconds * 1000;
      const tick = () => {
        const now = performance.now();
        const s = d.forgeWorldStats();
        voxel.push(s.ms + s.streamMs);
        stream.push(s.streamMs);
        frame.push(now - last);
        last = now;
        draws = Math.max(draws, s.chunksDrawn);
        columns = Math.max(columns, s.columns);
        meshes = Math.max(meshes, s.meshes);
        pendingMax = Math.max(pendingMax, s.pending);
        // Ground under the player the whole way.
        if (!b.world.isLoaded(Math.floor(b.player.x), Math.floor(b.player.y))) edge++;
        now < end ? requestAnimationFrame(tick) : res();
      };
      requestAnimationFrame(tick);
    });
    const avg = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
    const pct = (a, p) => [...a].sort((x, y) => x - y)[Math.floor(a.length * p)] ?? 0;
    const heap1 = performance.memory?.usedJSHeapSize ?? 0;
    return {
      flown: b.player.x - x0,
      frames: frame.length,
      frameAvg: avg(frame), frameP95: pct(frame, 0.95),
      voxelAvg: avg(voxel), voxelP95: pct(voxel, 0.95), voxelMax: Math.max(...voxel),
      streamAvg: avg(stream), streamMax: Math.max(...stream),
      draws, columns, meshes, pendingMax, edge,
      blockMB: (columns * 16384) / 1048576,
      heapMB: heap1 / 1048576, heapGrowthMB: (heap1 - heap0) / 1048576,
      longMax: window.__longTasks.length ? Math.max(...window.__longTasks) : 0,
    };
  }, FLIGHT_SECONDS);
  await page.keyboard.up("KeyW");
  await ctx.close();
  return { ...open, ...reopen, openLong, ...r };
}

for (const profile of PROFILES) {
  test(`${profile.name}: long flight over an endless forge world within budget`, async () => {
    test.setTimeout(FLIGHT_SECONDS * 1000 + 180_000);
    const r = await measureFlight(profile);
    test.info().annotations.push({ type: "perf", description: JSON.stringify(r) });
    console.log(`[flight] ${profile.name} ${JSON.stringify(r)}`);
    expect(r.endless, "a new forge world is endless").toBe(true);
    // Noclip is 14 blocks a second; a throttled frame rate slows it (dt is capped).
    expect(r.flown, "distance flown").toBeGreaterThan(FLIGHT_SECONDS * 4);
    expect(r.voxelAvg, "voxel pass, streaming included, per frame").toBeLessThanOrEqual(VOXEL_MS_BUDGET);
    expect(r.streamAvg, "streaming per frame").toBeLessThanOrEqual(STREAM_MS_BUDGET);
    expect(r.columns, "resident columns").toBeLessThanOrEqual(MAX_COLUMNS);
    expect(r.draws, "chunk draws per frame").toBeLessThan(MAX_DRAWS);
    expect(r.edge, "frames with no ground loaded under the player").toBe(0);
    expect(r.longMax, "main-thread hitch while flying").toBeLessThanOrEqual(LONG_TASK_BUDGET * profile.cpu);
    expect(r.openLong, "main-thread hitch while opening the world").toBeLessThanOrEqual(LONG_TASK_BUDGET * profile.cpu);
  });
}
