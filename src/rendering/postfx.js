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

  // Muzzle flash screen lighting — additive overlay, fades over 100ms
  if (state.muzzleFlashTime && time - state.muzzleFlashTime < 100) {
    const t = (time - state.muzzleFlashTime) / 100;
    const alpha = 0.12 * (1 - t);
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(${state.muzzleFlashColor},${alpha})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = prev;
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

let _grainTile = null;
let _grainTileSize = 256;
function getGrainTile() {
  if (_grainTile) return _grainTile;
  const c = (typeof OffscreenCanvas !== "undefined")
    ? new OffscreenCanvas(_grainTileSize, _grainTileSize)
    : Object.assign(document.createElement("canvas"), { width: _grainTileSize, height: _grainTileSize });
  const tctx = c.getContext("2d");
  const img = tctx.createImageData(_grainTileSize, _grainTileSize);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  _grainTile = c;
  return c;
}

function drawFilmGrain(ctx, w, h, time) {
  const tile = getGrainTile();
  const rotation = time * 0.0001;
  ctx.save();
  ctx.globalAlpha = 0.045;
  ctx.globalCompositeOperation = "overlay";
  // Single draw with rotated transform covers the screen (tile is large enough)
  const cx = w / 2;
  const cy = h / 2;
  const scale = Math.max(w, h) / _grainTileSize * 1.5;
  ctx.setTransform(
    Math.cos(rotation) * scale, Math.sin(rotation) * scale,
    -Math.sin(rotation) * scale, Math.cos(rotation) * scale,
    cx, cy
  );
  ctx.drawImage(tile, -_grainTileSize / 2, -_grainTileSize / 2);
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

export function drawChromaticAberration(ctx, w, h, canvas, time, player, glitchEffect) {
  let intensity = glitchEffect * 0.5;
  if (player.hurtTime) {
    const elapsed = time - player.hurtTime;
    if (elapsed < 300) intensity += 0.3 * (1 - elapsed / 300);
  }
  intensity = Math.max(0, Math.min(1, intensity));
  const offset = Math.ceil(intensity * 3);
  if (offset < 1) return;

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = intensity * 0.12;
  // Horizontal shift
  ctx.drawImage(canvas, -offset, 0);
  ctx.drawImage(canvas, offset, 0);
  // Radial vertical shift — stronger at edges
  const vOffset = Math.ceil(offset * 0.5);
  if (vOffset >= 1) {
    ctx.globalAlpha = intensity * 0.06;
    ctx.drawImage(canvas, 0, -vOffset);
    ctx.drawImage(canvas, 0, vOffset);
  }
  ctx.restore();
}

/** Bloom — downsample to small buffer, draw back at full size with additive blend. */
let _bloomCanvas = null;
let _bloomCtx = null;
let _bloomW = 0;
let _bloomH = 0;

export function drawBloom(ctx, w, h, canvas) {
  const bw = (w >> 2) || 1;
  const bh = (h >> 2) || 1;
  if (!_bloomCanvas || _bloomW !== bw || _bloomH !== bh) {
    _bloomCanvas = (typeof OffscreenCanvas !== "undefined")
      ? new OffscreenCanvas(bw, bh)
      : Object.assign(document.createElement("canvas"), { width: bw, height: bh });
    _bloomCtx = _bloomCanvas.getContext("2d");
    _bloomW = bw;
    _bloomH = bh;
  }
  _bloomCtx.drawImage(canvas, 0, 0, bw, bh);
  // Brightness threshold — boost contrast so only bright areas survive
  _bloomCtx.globalCompositeOperation = "multiply";
  _bloomCtx.fillStyle = "rgb(180,180,180)";
  _bloomCtx.fillRect(0, 0, bw, bh);
  _bloomCtx.globalCompositeOperation = "source-over";
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.18;
  ctx.drawImage(_bloomCanvas, 0, 0, w, h);
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
