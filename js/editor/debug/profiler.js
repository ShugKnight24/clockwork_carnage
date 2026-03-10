// ═══════════════════════════════════════════════════════════════════
// CLOCKWORK FORGE — Profiler
// Real-time performance monitoring: FPS graph, frame budget bars,
// per-phase timing breakdowns, entity count, and peak tracking.
// ═══════════════════════════════════════════════════════════════════

/**
 * Phase-level frame profiler — collects per-frame, per-phase timing
 * data and renders a live overlay with FPS graph, stacked budget bars,
 * and detailed phase breakdown.
 *
 * Render phases: raycast, vignette, weapon, effects, hud, overlays
 * Update phases: player, enemies, projectiles, pickups, misc
 */

/** Phase keys and display colors */
const RENDER_PHASES = [
  { key: "raycast",  label: "ray",  color: "rgba(0,100,255,0.5)" },
  { key: "vignette", label: "vig",  color: "rgba(0,60,180,0.4)" },
  { key: "weapon",   label: "wpn",  color: "rgba(80,80,255,0.4)" },
  { key: "effects",  label: "fx",   color: "rgba(120,40,200,0.4)" },
  { key: "hud",      label: "hud",  color: "rgba(200,200,0,0.4)" },
  { key: "overlays", label: "ovr",  color: "rgba(180,120,0,0.4)" },
];

const UPDATE_PHASES = [
  { key: "player",      label: "plr",  color: "rgba(0,255,100,0.5)" },
  { key: "enemies",     label: "ent",  color: "rgba(0,200,60,0.4)" },
  { key: "projectiles", label: "prj",  color: "rgba(0,160,40,0.4)" },
  { key: "pickups",     label: "pkp",  color: "rgba(0,120,30,0.4)" },
  { key: "misc",        label: "msc",  color: "rgba(0,80,20,0.3)" },
];

const HISTORY_SIZE = 120; // ~2 seconds at 60fps

export class Profiler {
  constructor() {
    /** Rolling history for the FPS graph */
    this.frameHistory = new Float64Array(HISTORY_SIZE);
    this.updateHistory = new Float64Array(HISTORY_SIZE);
    this.renderHistory = new Float64Array(HISTORY_SIZE);
    this.entityHistory = new Uint16Array(HISTORY_SIZE);
    this.historyIdx = 0;
    this.historyLen = 0;

    /** Per-phase rolling histories */
    this.phaseHistory = {};
    for (const p of [...RENDER_PHASES, ...UPDATE_PHASES]) {
      this.phaseHistory[p.key] = new Float64Array(HISTORY_SIZE);
    }

    /** Running averages */
    this.avgFps = 60;
    this.avgUpdate = 0;
    this.avgRender = 0;
    this.avgPhases = {};
    for (const p of [...RENDER_PHASES, ...UPDATE_PHASES]) {
      this.avgPhases[p.key] = 0;
    }

    /** Target budget */
    this.targetFps = 60;
    this.frameBudgetMs = 1000 / 60; // 16.67ms

    /** Last frame timestamp for FPS calculation */
    this.lastFrameTime = performance.now();

    /** Peak tracking */
    this.peakUpdate = 0;
    this.peakRender = 0;
    this.peakFrame = 0;

    /** Per-frame phase timings (written by game, read at recordFrame) */
    this.currentPhases = {};
  }

  /**
   * Record one frame's timing data.
   * @param {number} updateMs    — Milliseconds spent in game.update()
   * @param {number} renderMs    — Milliseconds spent in game.render()
   * @param {number} entityCount — Total entities this frame
   */
  recordFrame(updateMs, renderMs, entityCount) {
    const now = performance.now();
    const frameMs = now - this.lastFrameTime;
    this.lastFrameTime = now;

    const idx = this.historyIdx % HISTORY_SIZE;
    this.frameHistory[idx] = frameMs;
    this.updateHistory[idx] = updateMs;
    this.renderHistory[idx] = renderMs;
    this.entityHistory[idx] = entityCount;

    // Store per-phase timings
    for (const p of [...RENDER_PHASES, ...UPDATE_PHASES]) {
      const val = this.currentPhases[p.key] || 0;
      this.phaseHistory[p.key][idx] = val;
      this.avgPhases[p.key] = this.avgPhases[p.key] * 0.9 + val * 0.1;
    }
    this.currentPhases = {};

    this.historyIdx++;
    this.historyLen = Math.min(this.historyLen + 1, HISTORY_SIZE);

    // Running averages (exponential moving average, alpha=0.1)
    this.avgFps = this.avgFps * 0.9 + (1000 / Math.max(frameMs, 0.1)) * 0.1;
    this.avgUpdate = this.avgUpdate * 0.9 + updateMs * 0.1;
    this.avgRender = this.avgRender * 0.9 + renderMs * 0.1;

    // Peaks (reset every 120 frames)
    this.peakUpdate = Math.max(this.peakUpdate, updateMs);
    this.peakRender = Math.max(this.peakRender, renderMs);
    this.peakFrame = Math.max(this.peakFrame, frameMs);
    if (this.historyIdx % HISTORY_SIZE === 0) {
      this.peakUpdate = 0;
      this.peakRender = 0;
      this.peakFrame = 0;
    }
  }

  /** Get a snapshot of current averages (for harness/telemetry) */
  getSnapshot() {
    const phases = {};
    for (const p of [...RENDER_PHASES, ...UPDATE_PHASES]) {
      phases[p.key] = +this.avgPhases[p.key].toFixed(2);
    }
    return {
      fps: Math.round(this.avgFps),
      updateMs: +this.avgUpdate.toFixed(2),
      renderMs: +this.avgRender.toFixed(2),
      peakFrame: +this.peakFrame.toFixed(2),
      peakUpdate: +this.peakUpdate.toFixed(2),
      peakRender: +this.peakRender.toFixed(2),
      phases,
    };
  }

  /**
   * Render the profiler HUD: FPS number, per-phase breakdown, graph,
   * and stacked budget bars.
   */
  render(ctx, x, y, w, h) {
    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(x, y, w, h);

    // ── FPS number ──────────────────────────────────────────────
    const fps = Math.round(this.avgFps);
    ctx.font = "bold 16px monospace";
    ctx.textBaseline = "top";
    ctx.fillStyle = fps >= 55 ? "#0f0" : fps >= 30 ? "#ff0" : "#f00";
    ctx.fillText(`${fps} FPS`, x + 4, y + 2);

    // Aggregate timing
    ctx.font = "9px monospace";
    ctx.fillStyle = "#aaa";
    const entCount = this.entityHistory[(this.historyIdx - 1 + HISTORY_SIZE) % HISTORY_SIZE] || 0;
    ctx.fillText(
      `upd: ${this.avgUpdate.toFixed(1)}ms  rnd: ${this.avgRender.toFixed(1)}ms  ent: ${entCount}`,
      x + 80,
      y + 6,
    );

    // ── Per-phase breakdown ─────────────────────────────────────
    let ly = y + 20;
    ctx.font = "8px monospace";

    // Render phases
    ctx.fillStyle = "#68f";
    ctx.fillText("RENDER", x + 4, ly);
    ly += 9;
    for (const p of RENDER_PHASES) {
      const avg = this.avgPhases[p.key];
      const pct = (avg / Math.max(this.avgRender, 0.01)) * 100;
      ctx.fillStyle = avg > 4 ? "#f88" : avg > 2 ? "#ff8" : "#8f8";
      ctx.fillText(
        `${p.label}: ${avg.toFixed(1)}ms (${pct.toFixed(0)}%)`,
        x + 8,
        ly,
      );
      ly += 9;
    }

    // Update phases
    ly += 2;
    ctx.fillStyle = "#6f8";
    ctx.fillText("UPDATE", x + 4, ly);
    ly += 9;
    for (const p of UPDATE_PHASES) {
      const avg = this.avgPhases[p.key];
      const pct = (avg / Math.max(this.avgUpdate, 0.01)) * 100;
      ctx.fillStyle = avg > 4 ? "#f88" : avg > 2 ? "#ff8" : "#8f8";
      ctx.fillText(
        `${p.label}: ${avg.toFixed(1)}ms (${pct.toFixed(0)}%)`,
        x + 8,
        ly,
      );
      ly += 9;
    }

    // Peak line
    ly += 2;
    ctx.fillStyle = "#888";
    ctx.fillText(
      `peak: ${this.peakFrame.toFixed(1)}ms (upd:${this.peakUpdate.toFixed(1)} rnd:${this.peakRender.toFixed(1)})`,
      x + 4,
      ly,
    );

    // ── FPS Graph ───────────────────────────────────────────────
    const graphY = ly + 12;
    const graphH = y + h - graphY - 4;
    const graphW = w - 8;
    const gx = x + 4;

    if (graphH < 10) {
      ctx.strokeStyle = "#333";
      ctx.strokeRect(x, y, w, h);
      return;
    }

    // 60fps line
    ctx.strokeStyle = "#0f03";
    ctx.beginPath();
    ctx.moveTo(gx, graphY + graphH * (1 - 60 / 120));
    ctx.lineTo(gx + graphW, graphY + graphH * (1 - 60 / 120));
    ctx.stroke();

    // 30fps line
    ctx.strokeStyle = "#f003";
    ctx.beginPath();
    ctx.moveTo(gx, graphY + graphH * (1 - 30 / 120));
    ctx.lineTo(gx + graphW, graphY + graphH * (1 - 30 / 120));
    ctx.stroke();

    // Stacked phase bars
    if (this.historyLen > 1) {
      const step = graphW / (HISTORY_SIZE - 1);

      // Render phase bars (stacked bottom-up)
      for (let i = 0; i < this.historyLen; i++) {
        const hIdx =
          (this.historyIdx - this.historyLen + i + HISTORY_SIZE) % HISTORY_SIZE;
        let stackH = 0;
        for (const p of RENDER_PHASES) {
          const ms = this.phaseHistory[p.key][hIdx];
          const barH = (ms / this.frameBudgetMs) * graphH;
          ctx.fillStyle = p.color;
          ctx.fillRect(
            gx + i * step,
            graphY + graphH - stackH - barH,
            Math.max(step - 1, 1),
            barH,
          );
          stackH += barH;
        }
        // Update phase bars on top
        for (const p of UPDATE_PHASES) {
          const ms = this.phaseHistory[p.key][hIdx];
          const barH = (ms / this.frameBudgetMs) * graphH;
          ctx.fillStyle = p.color;
          ctx.fillRect(
            gx + i * step,
            graphY + graphH - stackH - barH,
            Math.max(step - 1, 1),
            barH,
          );
          stackH += barH;
        }
      }

      // FPS line
      ctx.strokeStyle = "#0f0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < this.historyLen; i++) {
        const hIdx =
          (this.historyIdx - this.historyLen + i + HISTORY_SIZE) % HISTORY_SIZE;
        const fpsVal = 1000 / Math.max(this.frameHistory[hIdx], 0.1);
        const gy = graphY + graphH * (1 - Math.min(fpsVal, 120) / 120);
        if (i === 0) ctx.moveTo(gx + i * step, gy);
        else ctx.lineTo(gx + i * step, gy);
      }
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = "#333";
    ctx.strokeRect(x, y, w, h);
  }
}
