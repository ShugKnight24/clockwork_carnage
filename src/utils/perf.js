/**
 * Adaptive quality / performance monitor.
 *
 * Dynamically adjusts render resolution to maintain target FPS.
 * The game canvas renders at (width * scale, height * scale) and
 * CSS scales it up to native resolution.
 */

import { clamp } from "./math.js";

const QUALITY_PRESETS = {
  ultra: {
    renderScale: 1.0,
    particleMultiplier: 1.0,
    drawDistance: 20,
    enableScanlines: true,
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
    enableScanlines: true,
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
    enableScanlines: false,
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
    enableScanlines: false,
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
    enableScanlines: false,
    enableVignette: false,
    enableFloorTexture: false,
    enableBloom: false,
    enableChromaticAberration: false,
    enableFilmGrain: false,
  },
};

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

    // Quality switches
    this.particleMultiplier = 1.0;
    this.drawDistance = 20;
    this.enableScanlines = true;
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
    const prevScale = this.renderScale;
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
      this.renderScale *= 1.01;
    }

    this.renderScale = clamp(this.renderScale, this.minScale, this.maxScale);

    // Update quality switches based on scale
    if (this.renderScale < 0.6) {
      this.enableScanlines = false;
      this.enableVignette = false;
      this.particleMultiplier = 0.3;
      this.drawDistance = 10;
      this.enableFloorTexture = false;
    } else if (this.renderScale < 0.8) {
      this.enableScanlines = false;
      this.enableVignette = true;
      this.particleMultiplier = 0.5;
      this.drawDistance = 14;
      this.enableFloorTexture = true;
    } else {
      this.enableScanlines = true;
      this.enableVignette = true;
      this.particleMultiplier = 1.0;
      this.drawDistance = 20;
      this.enableFloorTexture = true;
    }

    if (Math.abs(this.renderScale - prevScale) <= 0.04) return false;
    if (now - this.lastResize < 2000) return false;
    this.lastResize = now;
    return true;
  }

  /** Apply a named preset directly. */
  applyPreset(name) {
    const p = QUALITY_PRESETS[name];
    if (!p) return;
    this.auto = false;
    this.renderScale = p.renderScale;
    this.stableScale = p.renderScale;
    this.particleMultiplier = p.particleMultiplier;
    this.drawDistance = p.drawDistance;
    this.enableScanlines = p.enableScanlines;
    this.enableVignette = p.enableVignette;
    this.enableFloorTexture = p.enableFloorTexture;
    // Presets defined these but they were never copied, so "low" still paid
    // for bloom, chromatic aberration and film grain.
    this.enableBloom = p.enableBloom;
    this.enableChromaticAberration = p.enableChromaticAberration;
    this.enableFilmGrain = p.enableFilmGrain;
  }

  applyCustom({ renderScale, particleMultiplier, drawDistance, enableScanlines, enableVignette, enableFloorTexture }) {
    this.auto = false;
    if (renderScale != null) this.renderScale = this.stableScale = clamp(renderScale, this.minScale, this.maxScale);
    if (particleMultiplier != null) this.particleMultiplier = clamp(particleMultiplier, 0, 1);
    if (drawDistance != null) this.drawDistance = drawDistance;
    if (enableScanlines != null) this.enableScanlines = !!enableScanlines;
    if (enableVignette != null) this.enableVignette = !!enableVignette;
    if (enableFloorTexture != null) this.enableFloorTexture = !!enableFloorTexture;
  }

  useAuto() {
    this.auto = true;
    // Auto mode scales resolution rather than gating post-FX; restore the
    // ceilings in case a lighter preset lowered them earlier.
    this.enableBloom = true;
    this.enableChromaticAberration = true;
    this.enableFilmGrain = true;
  }
}
