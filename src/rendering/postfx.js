/**
 * PostFX — full-screen visual effects applied after scene rendering.
 * Extracted from game.js render loop.
 *
 * Pure rendering functions — no game state mutation.
 */

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
    const alpha = 0.3 * (1 - (time - player.hurtTime) / 200);
    ctx.fillStyle = `rgba(255,0,0,${alpha})`;
    ctx.fillRect(0, 0, w, h);
  }

  // Damage direction indicator — red arc on screen edge
  if (postProcessing && player.hurtTime && time - player.hurtTime < 500 && player.lastDamageAngle != null) {
    drawDamageDirection(ctx, w, h, time, player);
  }

  // Low-health warning pulse — red vignette + heartbeat audio
  const hpRatio = player.health / player.maxHealth;
  if (player.alive && hpRatio < 0.25 && hpRatio > 0) {
    const severity = 1 - (hpRatio / 0.25); // 0 at 25%, 1 at 0%
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.006 * (1 + severity)); // faster at lower health
    const alpha = severity * pulse * 0.35;

    const grd = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.7);
    grd.addColorStop(0, "rgba(180,0,0,0)");
    grd.addColorStop(1, `rgba(180,0,0,${alpha})`);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

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
  const tints = {
    1: "rgba(0,40,60,0.06)",   // subtle teal
    2: "rgba(40,25,0,0.06)",   // warm amber
    3: "rgba(40,0,10,0.06)",   // hot crimson
  };
  ctx.fillStyle = tints[act] || tints[1];
  ctx.fillRect(0, 0, w, h);
}
