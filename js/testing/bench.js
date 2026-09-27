/**
 * In-game benchmark: open the game with `?bench` on any machine and it plays a
 * scripted run — look around, fire into empty space, fire into tough targets,
 * then kill waves — timing every frame. A panel shows the result with Copy and
 * Download buttons, so a slow machine only needs a browser to produce a report.
 *
 * Options (query string):
 *   bench           run the benchmark after boot
 *   fixed           hold the adaptive render scale at 1, to see the raw cost
 *   art=0|1|2       art style for the run (Legacy, Comic, Modern)
 *
 * The report is also left on `window.ccBenchResult` for scripts/bench.mjs.
 */
import { setArtStyle } from "../../src/rendering/art-style.js";

const PHASES = [
  { key: "look", label: "Look around", ms: 6000 },
  { key: "fire", label: "Fire, no targets", ms: 6000 },
  { key: "hits", label: "Fire into targets", ms: 7000 },
  { key: "kills", label: "Kill waves", ms: 9000 },
];

// Pistol, phase rifle, scattergun: slow, fast and spread fire.
const FIRE_WEAPONS = [0, 2, 4];

const raf = () => new Promise((r) => requestAnimationFrame(r));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function quantiles(deltas) {
  const s = [...deltas].sort((a, b) => a - b);
  const q = (p) => +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(1);
  const sum = deltas.reduce((a, b) => a + b, 0);
  return {
    frames: s.length,
    fps: +((1000 * s.length) / sum).toFixed(1),
    p50: q(0.5),
    p95: q(0.95),
    p99: q(0.99),
    max: +s.at(-1).toFixed(1),
    over33: deltas.filter((d) => d > 33.4).length,
    over50: deltas.filter((d) => d > 50).length,
  };
}

function gpuInfo(canvas) {
  try {
    const gl = document.createElement("canvas").getContext("webgl2") || canvas?.getContext?.("webgl");
    if (!gl) return { webgl2: false };
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      webgl2: true,
      vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    };
  } catch (err) {
    return { error: String(err) };
  }
}

/** Median rAF interval over half a second: the display's refresh, roughly. */
async function refreshMs() {
  const d = [];
  let last = performance.now();
  for (let i = 0; i < 30; i++) {
    await raf();
    const now = performance.now();
    d.push(now - last);
    last = now;
  }
  d.sort((a, b) => a - b);
  return +d[d.length >> 1].toFixed(2);
}

function environment(game) {
  const s = game.settings || {};
  const q = game.quality || {};
  return {
    when: new Date().toISOString(),
    url: location.href,
    userAgent: navigator.userAgent,
    platform: navigator.userAgentData?.platform ?? navigator.platform,
    cores: navigator.hardwareConcurrency ?? null,
    memoryGB: navigator.deviceMemory ?? null,
    dpr: window.devicePixelRatio,
    viewport: [window.innerWidth, window.innerHeight],
    screen: [screen.width, screen.height],
    canvas: [game.canvas?.width, game.canvas?.height],
    gpu: gpuInfo(game.canvas),
    rendererPath: game.renderer?.useWebGL && game.renderer?.glRenderer ? "webgl2-hybrid" : "canvas2d",
    settings: {
      artStyle: s.artStyle,
      graphicsPreset: s.graphicsPreset,
      postProcessing: s.postProcessing,
      gpuPostFx: s.gpuPostFx,
      bloom: s.enableBloom,
      chromaticAberration: s.enableChromaticAberration,
      filmGrain: s.enableFilmGrain,
      frameTarget: s.frameTarget,
      batterySaver: s.batterySaver,
    },
    quality: { auto: q.auto, renderScale: q.renderScale, particles: q.particleMultiplier, drawDistance: q.drawDistance },
  };
}

/** Spawn `n` enemies in an arc 3-5 cells ahead of the player. */
function spawnAhead(d, game, n, type, tough) {
  const p = game.player;
  for (let i = 0; i < n; i++) {
    const a = p.angle + (i - (n - 1) / 2) * 0.18;
    const r = 3 + (i % 3);
    d.spawn(type, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
    const e = game.entities[game.entities.length - 1];
    if (tough && e?.type === "enemy") {
      e.health = 1e7;
      e.maxHealth = 1e7;
    }
  }
}

async function runPhase(d, game, phase, onFrame) {
  const deltas = [];
  const longs = [];
  let obs = null;
  try {
    obs = new PerformanceObserver((l) => {
      for (const e of l.getEntries()) longs.push(Math.round(e.duration));
    });
    obs.observe({ type: "longtask" });
  } catch {
    /* longtask is Chromium-only */
  }
  d.getPerf(true);
  const scale0 = game.quality?.renderScale;
  const kills0 = game.player.kills;
  let last = performance.now();
  const start = last;
  const end = start + phase.ms;
  let n = 0;
  while (performance.now() < end) {
    await raf();
    const now = performance.now();
    deltas.push(now - last);
    last = now;
    n++;
    onFrame(n, now - start);
  }
  d.fire(false);
  obs?.disconnect();
  const perf = d.getPerf(true);
  return {
    key: phase.key,
    label: phase.label,
    ...quantiles(deltas),
    longTasks: longs.length,
    longMax: Math.max(0, ...longs),
    cpuUpdateMs: perf?.updateMs ?? null,
    cpuRenderMs: perf?.renderMs ?? null,
    phases: perf?.phases ?? null,
    renderScale: [scale0, game.quality?.renderScale],
    kills: game.player.kills - kills0,
  };
}

function sweep(d, n) {
  // A slow side-to-side sweep, the way a player scans a room.
  if (n % 4 === 0) d.mouseDelta(Math.floor(n / 90) % 2 ? -9 : 9, 0);
}

export async function runBench(d, game, { fixed = false, art = null, onStatus = () => {} } = {}) {
  if (art != null) setArtStyle(art);
  onStatus("Measuring the display…");
  const refresh = await refreshMs();
  d.startCampaign(0, 1);
  d.godMode(true);
  d.giveAllWeapons();
  if (fixed && game.quality) {
    game.quality.auto = false;
    game.quality.renderScale = 1;
  }
  onStatus("Loading the level…");
  await wait(3000);

  const results = [];
  for (let i = 0; i < PHASES.length; i++) {
    const phase = PHASES[i];
    onStatus(`${i + 1}/${PHASES.length} · ${phase.label}`);
    const p = game.player;
    p.health = p.maxHealth = 999999;
    p.ammo = 999999;
    // Level enemies stay out of the way so each phase measures one thing.
    for (const e of game.entities) if (e.type === "enemy") e.active = false;
    let nextWave = 0;
    if (phase.key === "hits") spawnAhead(d, game, 6, "henchman", true);
    const r = await runPhase(d, game, phase, (n, t) => {
      sweep(d, n);
      if (phase.key === "look") return;
      p.currentWeapon = FIRE_WEAPONS[Math.floor(t / (phase.ms / FIRE_WEAPONS.length)) % FIRE_WEAPONS.length];
      if (n === 1) d.fire(true);
      if (phase.key === "kills" && t >= nextWave) {
        nextWave += 1200;
        spawnAhead(d, game, 4, "drone", false);
      }
    });
    results.push(r);
  }
  d.fire(false);
  return { version: 1, refreshMs: refresh, fixedScale: fixed, env: environment(game), phases: results };
}

// ── Panel ───────────────────────────────────────────────────────────────────

function el(tag, css, text) {
  const e = document.createElement(tag);
  if (css) e.style.cssText = css;
  if (text != null) e.textContent = text;
  return e;
}

const PANEL_CSS =
  "position:fixed;z-index:99999;top:12px;left:50%;transform:translateX(-50%);max-width:min(760px,calc(100vw - 32px));box-sizing:border-box;" +
  "background:rgba(8,12,20,.94);color:#dfe8f2;font:13px/1.45 ui-monospace,Menlo,Consolas,monospace;" +
  "border:1px solid #2c4760;border-radius:8px;padding:12px 14px;box-shadow:0 8px 30px rgba(0,0,0,.5)";
const BTN_CSS =
  "background:#173049;color:#dfe8f2;border:1px solid #3b6286;border-radius:5px;padding:5px 12px;margin-right:8px;font:inherit;cursor:pointer";

export function showBenchPanel() {
  const panel = el("div", PANEL_CSS);
  panel.setAttribute("role", "status");
  const status = el("div", "font-weight:600", "Benchmark starting…");
  panel.append(status);
  document.body.append(panel);
  return {
    status: (t) => (status.textContent = `Benchmark · ${t}`),
    result(report) {
      status.textContent = "Benchmark done";
      const env = report.env;
      const meta = el(
        "div",
        "opacity:.8;margin:4px 0 8px",
        `${env.gpu?.renderer ?? "unknown GPU"} · ${env.cores ?? "?"} cores · ${env.viewport.join("×")} @${env.dpr}x · ` +
          `${env.rendererPath} · display ${(1000 / report.refreshMs).toFixed(0)} Hz`,
      );
      const table = el("table", "border-collapse:collapse;width:100%;white-space:nowrap;font-variant-numeric:tabular-nums");
      const head = ["Phase", "fps", "p50", "p95", "p99", "max", ">33ms", "long", "CPU ms", "scale"];
      const tr = (cells, bold) => {
        const row = el("tr");
        for (const c of cells) row.append(el("td", `padding:2px 6px;text-align:right;${bold ? "font-weight:600;border-bottom:1px solid #2c4760" : ""}`, c));
        row.firstChild.style.textAlign = "left";
        return row;
      };
      table.append(tr(head, true));
      for (const p of report.phases) {
        const cpu = p.cpuUpdateMs != null ? (p.cpuUpdateMs + p.cpuRenderMs).toFixed(1) : "–";
        table.append(tr([p.label, p.fps, p.p50, p.p95, p.p99, p.max, p.over33, p.longTasks, cpu, (p.renderScale[1] ?? 1).toFixed(2)]));
      }
      const note = el(
        "div",
        "opacity:.7;margin-top:8px",
        "Frame times in ms. When p50 is well above CPU ms, the GPU is the bottleneck.",
      );
      const json = JSON.stringify(report, null, 2);
      const bar = el("div", "margin-top:10px");
      const copy = el("button", BTN_CSS, "Copy report");
      copy.onclick = async () => {
        try {
          await navigator.clipboard.writeText(json);
          copy.textContent = "Copied";
        } catch {
          copy.textContent = "Copy failed — use Download";
        }
      };
      const dl = el("button", BTN_CSS, "Download JSON");
      dl.onclick = () => {
        const a = el("a");
        a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
        a.download = `cc-bench-${Date.now()}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      };
      const close = el("button", BTN_CSS, "Close");
      close.onclick = () => panel.remove();
      bar.append(copy, dl, close);
      const scroll = el("div", "overflow-x:auto");
      scroll.append(table);
      panel.append(meta, scroll, note, bar);
    },
    error(err) {
      status.textContent = `Benchmark failed: ${err?.message ?? err}`;
    },
  };
}
