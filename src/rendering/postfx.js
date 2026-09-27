/**
 * PostFX — full-screen visual effects applied after scene rendering.
 * Extracted from game.js render loop.
 *
 * Pure rendering functions — no game state mutation.
 */

import { isModernArt, isRealisticArt } from "./art-style.js";

/**
 * Render all post-processing effects in order.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w - canvas width
 * @param {number} h - canvas height
 * @param {object} state - snapshot of relevant game state
 */
export function renderPostFX(ctx, w, h, state) {
  const { time, player, canvas } = state;
  const postProcessing = state.postProcessing !== false;
  const act = state.act || 1;

  // Muzzle flash screen lighting — additive glow around the gun, fades over
  // 100ms. A flat full-screen fill turned the whole cool-blue deck sepia on
  // every shot, a strobe under automatic fire, and cost a full-frame fill on
  // weak GPUs.
  if (state.muzzleFlashTime && time - state.muzzleFlashTime < 100) {
    const t = (time - state.muzzleFlashTime) / 100;
    drawMuzzleGlow(ctx, w, h, state.muzzleFlashColor, 0.16 * (1 - t));
  }

  // Hurt flash — red overlay
  if (postProcessing && player.hurtTime && time - player.hurtTime < 200) {
    const k = 1 - (time - player.hurtTime) / 200;
    if (isRealisticArt()) {
      // A flat red fill goes through the filmic exposure and floods the whole
      // frame; blood-at-the-edges reads as a hit without hiding the scene.
      const prev = ctx.globalAlpha;
      ctx.globalAlpha = 0.75 * k;
      ctx.drawImage(getHurtVignette(), 0, 0, w, h);
      ctx.globalAlpha = prev;
    } else {
      ctx.fillStyle = `rgba(255,0,0,${0.3 * k})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // Modern HUD draws its own inked damage chevron and low-HP corner frames
  // (hud-modern.js drawModernCombatCues); the arc would double that read.
  const modern = isModernArt();

  // Damage direction indicator — red arc on screen edge
  if (!modern && postProcessing && player.hurtTime && time - player.hurtTime < 500 && player.lastDamageAngle != null) {
    drawDamageDirection(ctx, w, h, time, player);
  }

  // Low-health warning pulse — red vignette + heartbeat audio
  const hpRatio = player.health / player.maxHealth;
  if (player.alive && hpRatio < 0.25 && hpRatio > 0) {
    const severity = 1 - (hpRatio / 0.25); // 0 at 25%, 1 at 0%
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.006 * (1 + severity)); // faster at lower health
    const alpha = severity * pulse * 0.35;

    if (modern) {
      // Same pulse as the HUD's crimson corner frames so they breathe together.
      drawModernLowHealthVignette(ctx, w, h, severity, pulse);
    } else {
      const grd = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.7);
      grd.addColorStop(0, "rgba(180,0,0,0)");
      grd.addColorStop(1, `rgba(180,0,0,${alpha})`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
    }

    // Critical health (< 10%) — slight desaturation overlay
    if (hpRatio < 0.1) {
      const desatAlpha = (1 - hpRatio / 0.1) * 0.12;
      ctx.fillStyle = `rgba(128,128,128,${desatAlpha})`;
      ctx.globalCompositeOperation = "saturation";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
    }

    // Heartbeat audio — driven from the same place as the visual pulse
    state.audio?.heartbeat?.(severity);
  }

  // Glitch slice effect
  if (postProcessing && state.glitchEffect > 0.01) {
    drawGlitch(ctx, w, h, canvas, state.glitchEffect);
  }

  // Chromatic aberration — RGB channel split
  if (postProcessing && state.enableChromaticAberration !== false) drawChromaticAberration(ctx, w, h, canvas, time, player, state.glitchEffect);

  // Bloom — soft glow from bright areas
  if (postProcessing && state.enableBloom !== false) drawBloom(ctx, w, h, canvas);

  // Film grain — subtle animated noise. Sells the "old broadcast" mood
  // without bleeding contrast. Uses a cached noise tile to avoid drawing
  // thousands of pixels every frame.
  if (postProcessing && state.enableFilmGrain !== false) drawFilmGrain(ctx, w, h, time);

  // Per-act color grade tint
  // Callers that grade on the GPU pass enableColorGrade: false, or the tint
  // lands twice.
  if (postProcessing && state.enableColorGrade !== false) drawColorGrade(ctx, w, h, act);

  // Death fade
  if (!player.alive) {
    ctx.fillStyle = "rgba(80,0,0,0.5)";
    ctx.fillRect(0, 0, w, h);
  }
}

/** Where the gun sits on screen, as a fraction of the frame. */
const MUZZLE_GLOW_X = 0.6;
const MUZZLE_GLOW_Y = 0.62;

/** Radial glow from the gun, clipped to its own square so the fill stays small. */
function drawMuzzleGlow(ctx, w, h, rgb, alpha) {
  const cx = w * MUZZLE_GLOW_X;
  const cy = h * MUZZLE_GLOW_Y;
  const r = h * 0.6;
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grd.addColorStop(0, `rgba(${rgb},${alpha})`);
  grd.addColorStop(0.45, `rgba(${rgb},${alpha * 0.35})`);
  grd.addColorStop(1, `rgba(${rgb},0)`);
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = grd;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.globalCompositeOperation = prev;
}

let _grainTile = null;
let _grainPattern = null;
const GRAIN_TILE = 128;
function getGrainTile() {
  if (_grainTile) return _grainTile;
  const c = (typeof OffscreenCanvas !== "undefined")
    ? new OffscreenCanvas(GRAIN_TILE, GRAIN_TILE)
    : Object.assign(document.createElement("canvas"), { width: GRAIN_TILE, height: GRAIN_TILE });
  const tctx = c.getContext("2d");
  const img = tctx.createImageData(GRAIN_TILE, GRAIN_TILE);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  _grainTile = c;
  return c;
}

/**
 * Film grain: a 1:1 noise tile, re-offset ~24 times a second so it crawls
 * like film. Hard-light around mid-grey lifts and darkens by roughly the same
 * amount at any brightness; the old overlay at 4.5% was near-invisible in the
 * dark decks where grain matters most.
 */
function drawFilmGrain(ctx, w, h, time) {
  if (!_grainPattern) _grainPattern = ctx.createPattern(getGrainTile(), "repeat");
  const f = Math.floor(time / 42);
  const ox = (f * 73) % GRAIN_TILE;
  const oy = (f * 151) % GRAIN_TILE;
  ctx.save();
  ctx.globalAlpha = 0.055;
  ctx.globalCompositeOperation = "hard-light";
  ctx.translate(-ox, -oy);
  ctx.fillStyle = _grainPattern;
  ctx.fillRect(ox, oy, w, h);
  ctx.restore();
}

/**
 * Modern low-health vignette: ink-dark edges with a crimson band just inside,
 * like an inked panel border closing in. Baked once into a small canvas and
 * stretched (a radial ramp survives the upscale), so no per-frame gradient.
 */
let _lowHpVignette = null;
function getLowHpVignette() {
  if (_lowHpVignette) return _lowHpVignette;
  const vw = 256;
  const vh = 160;
  const c = (typeof OffscreenCanvas !== "undefined")
    ? new OffscreenCanvas(vw, vh)
    : Object.assign(document.createElement("canvas"), { width: vw, height: vh });
  const g = c.getContext("2d");
  // Draw a circle and stretch it so the falloff follows the screen aspect.
  g.setTransform(vw / vh, 0, 0, 1, 0, 0);
  const r = vh * 0.62;
  const grd = g.createRadialGradient(vh / 2, vh / 2, r * 0.42, vh / 2, vh / 2, r);
  grd.addColorStop(0, "rgba(120,0,20,0)");
  grd.addColorStop(0.55, "rgba(150,6,30,0.28)");
  grd.addColorStop(0.82, "rgba(90,2,16,0.72)");
  grd.addColorStop(1, "rgba(4,6,11,0.95)");
  g.fillStyle = grd;
  g.fillRect(0, 0, vh, vh);
  _lowHpVignette = c;
  return c;
}

function drawModernLowHealthVignette(ctx, w, h, severity, pulse) {
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = Math.min(1, 0.25 + severity * (0.45 + 0.55 * pulse) * 0.75);
  ctx.drawImage(getLowHpVignette(), 0, 0, w, h);
  ctx.globalAlpha = prev;
}

function drawDamageDirection(ctx, w, h, time, player) {
  const elapsed = (time - player.hurtTime) / 500;
  const dirAlpha = 0.6 * (1 - elapsed);
  let relAngle = player.lastDamageAngle - player.angle;
  while (relAngle > Math.PI) relAngle -= Math.PI * 2;
  while (relAngle < -Math.PI) relAngle += Math.PI * 2;
  const cx = w / 2;
  const cy = h / 2;
  const outerR = Math.min(w, h) * 0.48;
  const innerR = outerR * 0.85;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(relAngle);
  ctx.beginPath();
  ctx.arc(0, 0, outerR, -0.35, 0.35);
  ctx.arc(0, 0, innerR, 0.35, -0.35, true);
  ctx.closePath();
  ctx.fillStyle = `rgba(255,20,0,${dirAlpha})`;
  ctx.fill();
  ctx.restore();
}

export function drawGlitch(ctx, w, h, canvas, intensity) {
  for (let i = 0; i < 3; i++) {
    const y = Math.random() * h;
    const sliceH = 2 + Math.random() * 10;
    const offset = (Math.random() - 0.5) * 30 * intensity;
    ctx.drawImage(canvas, 0, y, w, sliceH, offset, y, w, sliceH);
  }
}

/** Scratch canvas at frame size for the red channel of the aberration. */
let _caCanvas = null;
let _caCtx = null;
function scratch(canvas, w, h) {
  if (!canvas || canvas.width !== w || canvas.height !== h) {
    canvas = (typeof OffscreenCanvas !== "undefined")
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement("canvas"), { width: w, height: h });
  }
  return canvas;
}

/**
 * Lens fringe: the red channel is replaced by a copy of the frame scaled out
 * from the centre, so the split is zero mid-screen and grows towards the
 * edges (~0.2% of the width there). Hits and glitches widen it. Before, it
 * only ran for 300 ms after damage at 12% alpha, so the toggle showed nothing.
 */
export function drawChromaticAberration(ctx, w, h, canvas, time, player, glitchEffect) {
  let intensity = glitchEffect * 0.5;
  if (player.hurtTime) {
    const elapsed = time - player.hurtTime;
    if (elapsed < 300) intensity += 0.3 * (1 - elapsed / 300);
  }
  intensity = Math.max(0, Math.min(1, intensity));
  const k = 0.004 + intensity * 0.02;
  const ox = (w * k) / 2;
  const oy = (h * k) / 2;

  _caCanvas = scratch(_caCanvas, w, h);
  if (!_caCtx || _caCtx.canvas !== _caCanvas) _caCtx = _caCanvas.getContext("2d");
  const b = _caCtx;
  b.globalCompositeOperation = "copy";
  b.drawImage(canvas, -ox, -oy, w + 2 * ox, h + 2 * oy);
  b.globalCompositeOperation = "multiply";
  b.fillStyle = "#ff0000";
  b.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "#00ffff";
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "lighter";
  ctx.drawImage(_caCanvas, 0, 0);
  ctx.restore();
}

/**
 * Bloom: downsample to 1/8, keep the highlights, blur, add back. All
 * canvas-to-canvas draws, so nothing is read back to the CPU.
 */
let _bloomA = null;
let _bloomB = null;

export function drawBloom(ctx, w, h, canvas) {
  const bw = Math.max(1, w >> 3);
  const bh = Math.max(1, h >> 3);
  _bloomA = scratch(_bloomA, bw, bh);
  _bloomB = scratch(_bloomB, bw, bh);
  const a = _bloomA.getContext("2d");
  const b = _bloomB.getContext("2d");
  a.globalCompositeOperation = "copy";
  a.drawImage(canvas, 0, 0, bw, bh);
  // Soft threshold: multiplying the buffer by itself twice is x^4, which
  // keeps highlights (0.9 -> 0.66) and drops midtones (0.5 -> 0.06).
  a.globalCompositeOperation = "multiply";
  a.drawImage(_bloomA, 0, 0);
  a.drawImage(_bloomA, 0, 0);
  b.globalCompositeOperation = "copy";
  b.filter = "blur(2px)";
  b.drawImage(_bloomA, 0, 0);
  b.filter = "none";
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.45;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(_bloomB, 0, 0, w, h);
  ctx.restore();
}

/** Color grade — per-act tint overlay. */
export function drawColorGrade(ctx, w, h, act) {
  if (isRealisticArt()) {
    drawRealisticGrade(ctx, w, h);
    return;
  }
  if (isModernArt()) {
    // Comic: the GPU pass's ink vignette, baked once and stretched.
    ctx.drawImage(comicVignette(), 0, 0, w, h);
  }
  const tints = {
    1: "rgba(0,40,60,0.06)",   // subtle teal
    2: "rgba(40,25,0,0.06)",   // warm amber
    3: "rgba(40,0,10,0.06)",   // hot crimson
  };
  ctx.fillStyle = tints[act] || tints[1];
  ctx.fillRect(0, 0, w, h);
}

// ── Realistic grade, Canvas2D fallback ──────────────────────────────────────
// Used only when WebGL2 is unavailable; the GL path does a full filmic
// tonemap instead. Canvas2D cannot tonemap cheaply, so this approximates the
// two parts that carry most of the look: lower saturation and lens falloff.
let _realVignette = null;
let _realVigKey = "";

function realisticVignette(w, h) {
  const key = `${w}x${h}`;
  if (_realVignette && _realVigKey === key) return _realVignette;
  const c = (typeof OffscreenCanvas !== "undefined")
    ? new OffscreenCanvas(w, h)
    : Object.assign(document.createElement("canvas"), { width: w, height: h });
  const g = c.getContext("2d");
  const r = Math.hypot(w, h) / 2;
  const grad = g.createRadialGradient(w / 2, h / 2, r * 0.35, w / 2, h / 2, r);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.42)");
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  _realVignette = c;
  _realVigKey = key;
  return c;
}

export function drawRealisticGrade(ctx, w, h) {
  // Saturation, contrast and exposure are CSS filters on the canvas element
  // (style.css, data-art-profile="realistic"): the compositor applies them on
  // the GPU with no pixel readback. Only the lens falloff is drawn here.
  ctx.drawImage(realisticVignette(w, h), 0, 0);
}

let _comicVignette = null;
/** Comic grade: ink-dark corners like the HUD frame. 256x160, stretched. */
function comicVignette() {
  if (_comicVignette) return _comicVignette;
  const vw = 256;
  const vh = 160;
  const c = (typeof OffscreenCanvas !== "undefined")
    ? new OffscreenCanvas(vw, vh)
    : Object.assign(document.createElement("canvas"), { width: vw, height: vh });
  const g = c.getContext("2d");
  g.setTransform(vw / vh, 0, 0, 1, 0, 0);
  const r = vh * 0.72;
  const grd = g.createRadialGradient(vh / 2, vh / 2, r * 0.58, vh / 2, vh / 2, r);
  grd.addColorStop(0, "rgba(4,6,11,0)");
  grd.addColorStop(1, "rgba(4,6,11,0.4)");
  g.fillStyle = grd;
  g.fillRect(0, 0, vh, vh);
  _comicVignette = c;
  return c;
}

let _hurtVignette = null;
/** Realistic hurt flash: clear centre, dark-red edges. Baked once, stretched. */
function getHurtVignette() {
  if (_hurtVignette) return _hurtVignette;
  const vw = 256;
  const vh = 160;
  const c = (typeof OffscreenCanvas !== "undefined")
    ? new OffscreenCanvas(vw, vh)
    : Object.assign(document.createElement("canvas"), { width: vw, height: vh });
  const g = c.getContext("2d");
  g.setTransform(vw / vh, 0, 0, 1, 0, 0);
  const r = vh * 0.66;
  const grd = g.createRadialGradient(vh / 2, vh / 2, r * 0.45, vh / 2, vh / 2, r);
  grd.addColorStop(0, "rgba(140,0,0,0)");
  grd.addColorStop(0.7, "rgba(120,0,0,0.35)");
  grd.addColorStop(1, "rgba(60,0,0,0.8)");
  g.fillStyle = grd;
  g.fillRect(0, 0, vh, vh);
  _hurtVignette = c;
  return c;
}
