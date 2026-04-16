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
  },
  high: {
    renderScale: 0.85,
    particleMultiplier: 0.8,
    drawDistance: 18,
    enableScanlines: true,
    enableVignette: true,
    enableFloorTexture: true,
  },
  medium: {
    renderScale: 0.7,
    particleMultiplier: 0.5,
    drawDistance: 14,
    enableScanlines: false,
    enableVignette: true,
    enableFloorTexture: true,
  },
  low: {
    renderScale: 0.5,
    particleMultiplier: 0.3,
    drawDistance: 10,
    enableScanlines: false,
    enableVignette: false,
    enableFloorTexture: false,
  },
};

export class AdaptiveQuality {
  constructor(opts) {
    this.targetFPS = opts?.targetFPS ?? 55; // slightly below 60 for headroom
    this.minScale = opts?.minScale ?? 0.35;
    this.maxScale = opts?.maxScale ?? 1.0;
    this.renderScale = this.maxScale;
    this.history = [];
    this.historySize = 30; // ~0.5s of frames at 60fps
    this.adjustInterval = 500; // ms between adjustments
    this.lastAdjust = 0;

    // Quality switches
    this.particleMultiplier = 1.0;
    this.drawDistance = 20;
    this.enableScanlines = true;
    this.enableVignette = true;
    this.enableFloorTexture = true;
  }

  /** Record a frame's FPS. Call every frame. */
  recordFPS(fps) {
    this.history.push(fps);
    if (this.history.length > this.historySize) this.history.shift();
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
    if (now - this.lastAdjust < this.adjustInterval) return false;
    this.lastAdjust = now;

    // Warmup guard — skip until FPS history is full to avoid cold-start oscillation
    if (this.history.length < this.historySize) return false;

    const avg = this.averageFPS;
    const prevScale = this.renderScale;

    if (avg < this.targetFPS - 8) {
      // Significant drop — scale down aggressively
      this.renderScale *= 0.9;
    } else if (avg < this.targetFPS - 3) {
      // Moderate drop — scale down gently
      this.renderScale *= 0.97;
    } else if (avg > this.targetFPS + 2 && this.renderScale < this.maxScale) {
      // Headroom — scale up slowly
      this.renderScale *= 1.02;
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

    return Math.abs(this.renderScale - prevScale) > 0.005;
  }

  /** Apply a named preset directly. */
  applyPreset(name) {
    const p = QUALITY_PRESETS[name];
    if (!p) return;
    this.renderScale = p.renderScale;
    this.particleMultiplier = p.particleMultiplier;
    this.drawDistance = p.drawDistance;
    this.enableScanlines = p.enableScanlines;
    this.enableVignette = p.enableVignette;
    this.enableFloorTexture = p.enableFloorTexture;
  }
}
