/**
 * Adaptive quality / performance monitor.
 *
 * Dynamically adjusts render resolution to maintain target FPS.
 * The game canvas renders at (width * scale, height * scale) and
 * CSS scales it up to native resolution.
 */

import { clamp } from "./math.js";

export const QUALITY_PRESETS = {
  ultra: {
    renderScale: 1.0,
    particleMultiplier: 1.0,
    drawDistance: 20,
    enableVignette: true,
    enableFloorTexture: true,
    enableBloom: true,
    enableChromaticAberration: true,
    enableFilmGrain: true,
  },
  high: {
    renderScale: 0.85,
    particleMultiplier: 0.8,
    drawDistance: 18,
    enableVignette: true,
    enableFloorTexture: true,
    enableBloom: true,
    enableChromaticAberration: true,
    enableFilmGrain: true,
  },
  medium: {
    renderScale: 0.7,
    particleMultiplier: 0.5,
    drawDistance: 14,
    enableVignette: true,
    enableFloorTexture: true,
    enableBloom: false,
    enableChromaticAberration: false,
    enableFilmGrain: true,
  },
  low: {
    renderScale: 0.5,
    particleMultiplier: 0.3,
    drawDistance: 10,
    enableVignette: false,
    enableFloorTexture: false,
    enableBloom: false,
    enableChromaticAberration: false,
    enableFilmGrain: false,
  },
  "ultra-low": {
    renderScale: 0.35,
    particleMultiplier: 0.15,
    drawDistance: 8,
    enableVignette: false,
    enableFloorTexture: false,
    enableBloom: false,
    enableChromaticAberration: false,
    enableFilmGrain: false,
  },
};

/** Graphics Preset setting values, by index. */
export const GRAPHICS_PRESETS = ["auto", "ultra-low", "low", "medium", "high", "ultra", "custom"];

/**
 * What the chosen preset and Battery Saver allow, for the effects the player
 * also toggles. Runtime caps only: the player's own toggles are never
 * rewritten, so leaving a preset or Battery Saver brings them straight back.
 * Pure, so the settings screen can label a capped toggle.
 */
export function effectCeilings(settings) {
  const p = QUALITY_PRESETS[GRAPHICS_PRESETS[settings.graphicsPreset]];
  const saver = !!settings.batterySaver;
  return {
    enableBloom: (p?.enableBloom ?? true) && !saver,
    enableChromaticAberration: (p?.enableChromaticAberration ?? true) && !saver,
    enableFilmGrain: p?.enableFilmGrain ?? true,
    enableVignette: p?.enableVignette ?? true,
    enableFloorTexture: p?.enableFloorTexture ?? true,
  };
}

/**
 * Why a player toggle is not taking effect: "preset", "saver" or null.
 * `key` is the settings key (enableBloom, floorTexture, ...).
 */
export function effectCapReason(settings, key) {
  const k = key === "floorTexture" ? "enableFloorTexture" : key;
  if (effectCeilings(settings)[k] !== false) return null;
  const p = QUALITY_PRESETS[GRAPHICS_PRESETS[settings.graphicsPreset]];
  return p && p[k] === false ? "preset" : "saver";
}

// Governor tiers by render scale. Stepping back up needs a margin above the
// step-down point, so a scale hovering at a boundary cannot flicker effects.
const TIER_DOWN = [0.6, 0.8];
const TIER_UP = [0.65, 0.85];
const TIER_PARTICLES = [0.3, 0.5, 1];
const TIER_DRAW = [10, 14, 20];

export class AdaptiveQuality {
  constructor(opts) {
    this.targetFPS = opts?.targetFPS ?? 55; // slightly below 60 for headroom
    this.minScale = opts?.minScale ?? 0.35;
    this.maxScale = opts?.maxScale ?? 1.0;
    this.renderScale = this.maxScale;
    this.stableScale = this.renderScale;
    this.history = [];
    this.historySize = 90; // ~1.5s at 60fps; avoids cold-start scale flicker
    this.adjustInterval = 1500; // ms between adjustments
    this.lastAdjust = 0;
    this.lastResize = 0;

    // What the player and preset allow. The governor only scales within
    // these; it never turns on something the player turned off.
    this.caps = { particleMultiplier: 1, drawDistance: 20, enableVignette: true, enableFloorTexture: true };
    this._tier = 2; // 0 low, 1 medium, 2 full

    // Effective quality switches the renderer reads
    this.particleMultiplier = 1.0;
    this.drawDistance = 20;
    this.enableVignette = true;
    this.enableFloorTexture = true;
    // Post-FX ceilings set by the preset. The player's settings toggles still
    // apply on top: an effect renders only when both allow it.
    this.enableBloom = true;
    this.enableChromaticAberration = true;
    this.enableFilmGrain = true;
    this.auto = true;
  }

  /** Record a frame's FPS. Call every frame. */
  recordFPS(fps) {
    // A lone frame over ~250 ms in an otherwise running game is a stall — a
    // level load, a tab switch, a first-sight asset decode — not the
    // machine's pace. Counting it downscaled the whole next level for a one-off
    // wait; start the window over instead (the warmup guard then holds).
    if (fps < 4 && this.history.length && this.averageFPS > 20) {
      this.history.length = 0;
      return;
    }
    this.history.push(fps);
    if (this.history.length > this.historySize) this.history.shift();
  }

  /**
   * FPS at the 92nd-percentile frame time: if more than ~8% of frames (one in
   * twelve) are slow, this reads the slow rate. An average hides stutter: 90 fps with a 50 ms hitch every
   * few frames still averages well above target.
   */
  get lowFPS() {
    const n = this.history.length;
    if (n === 0) return 60;
    const buf = this._sortBuf || (this._sortBuf = new Float64Array(this.historySize));
    for (let i = 0; i < n; i++) buf[i] = this.history[i];
    const s = buf.subarray(0, n).sort();
    return s[Math.floor(n * 0.08)];
  }

  /** Average FPS over the sample window. */
  get averageFPS() {
    if (this.history.length === 0) return 60;
    let sum = 0;
    for (const f of this.history) sum += f;
    return sum / this.history.length;
  }

  /**
   * Adjust quality settings based on recent FPS.
   * Call every frame — internally throttled to adjustInterval.
   * Returns true if renderScale changed.
   */
  adjust(now) {
    if (!this.auto) return false;
    if (now - this.lastAdjust < this.adjustInterval) return false;
    this.lastAdjust = now;

    // Warmup guard — skip until FPS history is full to avoid cold-start oscillation
    if (this.history.length < this.historySize) return false;

    const avg = this.averageFPS;
    const low = this.lowFPS;
    // Frequent hitches: roughly one frame in twelve below 60% of target.
    const hitchy = low < this.targetFPS * 0.6;

    if (avg < this.targetFPS - 10 || hitchy) {
      // Significant drop — scale down aggressively
      this.renderScale *= 0.93;
    } else if (avg < this.targetFPS - 5) {
      // Moderate drop — scale down gently
      this.renderScale *= 0.98;
    } else if (avg > this.targetFPS + 5 && low > this.targetFPS * 0.8 && this.renderScale < this.maxScale) {
      // Headroom — scale up slowly
      this.renderScale *= 1.02;
    }

    this.renderScale = clamp(this.renderScale, this.minScale, this.maxScale);

    // Scale effects within what the player allowed; see _applyTier.
    this._applyTier();

    // Resize when the target has drifted far enough from what the canvases
    // use. Comparing one step against the previous one meant 2% up-steps never
    // qualified: after a single downscale the game stayed soft for the rest
    // of the session. A resize reallocates the GL canvas and framebuffer
    // (~60 ms measured), so it stays rare.
    if (Math.abs(this.renderScale - this.stableScale) < 0.06) return false;
    if (now - this.lastResize < 3000) return false;
    this.lastResize = now;
    return true;
  }

  /**
   * Recompute the effective switches: the caps as-is for a fixed preset, or
   * the caps scaled by the governor's tier in Auto. Particles multiply, draw
   * distance takes the smaller, and an effect is only ever switched off here.
   */
  _applyTier() {
    const c = this.caps;
    let t = 2;
    if (this.auto) {
      const s = this.renderScale;
      t = this._tier;
      while (t > 0 && s < TIER_DOWN[t - 1]) t--;
      while (t < 2 && s >= TIER_UP[t]) t++;
      this._tier = t;
    }
    this.particleMultiplier = c.particleMultiplier * TIER_PARTICLES[t];
    this.drawDistance = Math.min(c.drawDistance, TIER_DRAW[t]);
    this.enableVignette = c.enableVignette && t >= 1;
    this.enableFloorTexture = c.enableFloorTexture && t >= 1;
  }

  /** Set what the player and preset allow; unset keys keep their value. */
  setCaps({ particleMultiplier, drawDistance, enableVignette, enableFloorTexture } = {}) {
    const c = this.caps;
    if (particleMultiplier != null) c.particleMultiplier = clamp(particleMultiplier, 0, 1);
    if (drawDistance != null) c.drawDistance = drawDistance;
    if (enableVignette != null) c.enableVignette = !!enableVignette;
    if (enableFloorTexture != null) c.enableFloorTexture = !!enableFloorTexture;
    this._applyTier();
  }

  /** Apply a named preset directly. */
  applyPreset(name) {
    const p = QUALITY_PRESETS[name];
    if (!p) return;
    this.auto = false;
    this.renderScale = p.renderScale;
    this.stableScale = p.renderScale;
    this.setCaps(p);
    // Presets defined these but they were never copied, so "low" still paid
    // for bloom, chromatic aberration and film grain.
    this.enableBloom = p.enableBloom;
    this.enableChromaticAberration = p.enableChromaticAberration;
    this.enableFilmGrain = p.enableFilmGrain;
  }

  applyCustom({ renderScale, ...caps }) {
    this.auto = false;
    if (renderScale != null) this.renderScale = this.stableScale = clamp(renderScale, this.minScale, this.maxScale);
    this.setCaps(caps);
  }

  useAuto() {
    this.auto = true;
    // Auto mode scales resolution rather than gating post-FX; restore the
    // ceilings in case a lighter preset lowered them earlier.
    this.enableBloom = true;
    this.enableChromaticAberration = true;
    this.enableFilmGrain = true;
    this._applyTier();
  }

  /**
   * Jump to full resolution, e.g. on leaving Battery Saver or a low preset.
   * Climbing back at 2% per step took most of a minute. The FPS window
   * restarts so the governor judges the new scale on its own frames.
   */
  resetScale() {
    this.renderScale = this.stableScale = this.maxScale;
    this.history.length = 0;
    this._tier = 2;
    this._applyTier();
  }
}
