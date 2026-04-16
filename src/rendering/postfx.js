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
  if (player.hurtTime && time - player.hurtTime < 200) {
    const alpha = 0.3 * (1 - (time - player.hurtTime) / 200);
    ctx.fillStyle = `rgba(255,0,0,${alpha})`;
    ctx.fillRect(0, 0, w, h);
  }

  // Damage direction indicator — red arc on screen edge
  if (player.hurtTime && time - player.hurtTime < 500 && player.lastDamageAngle != null) {
    drawDamageDirection(ctx, w, h, time, player);
  }

  // Glitch slice effect
  if (state.glitchEffect > 0.01) {
    drawGlitch(ctx, w, h, canvas, state.glitchEffect);
  }

  // Chromatic aberration — RGB channel split
  drawChromaticAberration(ctx, w, h, canvas, time, player, state.glitchEffect);

  // Death fade
  if (!player.alive) {
    ctx.fillStyle = "rgba(80,0,0,0.5)";
    ctx.fillRect(0, 0, w, h);
  }
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
  intensity = Math.max(0.03, Math.min(1, intensity));
  const offset = Math.ceil(intensity * 3);
  if (offset < 1) return;

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = intensity * 0.12;
  ctx.drawImage(canvas, -offset, 0);
  ctx.drawImage(canvas, offset, 0);
  ctx.restore();
}
