/**
 * Legacy-art helpers for a shield bearer's turned views (src/rendering/
 * facing-view.js): which view the camera sees, a horizontal squeeze for a
 * figure turned away from face-on, and the power core on its back.
 */

import { facingView } from "../facing-view.js";

const last = new WeakMap(); // enemy -> last facingView result

/**
 * The view of `enemy` from the camera `cam` ({ rx, ry, x, y }: right vector
 * and position), or null without a camera. `shieldSide` as in facing-view.js.
 */
export function legacyFacing(enemy, cam, shieldSide = -1) {
  if (!cam || cam.rx == null) return null;
  const prev = last.get(enemy) || null;
  const r = facingView(enemy.angle, cam.x - enemy.x, cam.y - enemy.y, cam.rx, cam.ry, shieldSide, prev, prev || {});
  last.set(enemy, r);
  return r;
}

/** Run `fn` with the canvas squeezed horizontally by `k` about x = cx, then moved by dx. */
export function squeezed(ctx, cx, k, dx, fn) {
  ctx.save();
  ctx.translate(cx + dx, 0);
  ctx.scale(k, 1);
  ctx.translate(-cx, 0);
  fn();
  ctx.restore();
}

/** Mirror the canvas about x = cx (the caller saves and restores). */
export function mirrorAbout(ctx, cx) {
  ctx.translate(cx, 0);
  ctx.scale(-1, 1);
  ctx.translate(-cx, 0);
}

/**
 * The hot power core on a shield bearer's back (the rear-only `core` hit
 * zone): a dark housing, an amber glow that pulses, vents either side.
 */
export function drawBackCore(ctx, x, y, r, time, alpha) {
  const pulse = 0.75 + 0.25 * Math.sin(time * 0.006);
  ctx.fillStyle = "#1a1a22";
  ctx.beginPath();
  ctx.arc(x, y, r * 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a1206";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha * pulse;
  ctx.fillStyle = "rgba(255,122,30,0.35)";
  ctx.beginPath();
  ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff8a2a";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.82, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd27a";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff4d6";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Vents either side of it.
  ctx.fillStyle = "#ff9a3a";
  ctx.globalAlpha = alpha * 0.8 * pulse;
  for (const s of [-1, 1]) {
    ctx.fillRect(x + s * r * 1.5 - (s < 0 ? r * 0.6 : 0), y - r * 0.35, r * 0.6, r * 0.16);
    ctx.fillRect(x + s * r * 1.5 - (s < 0 ? r * 0.6 : 0), y + r * 0.2, r * 0.6, r * 0.16);
  }
  ctx.globalAlpha = alpha;
}

/**
 * Draw a Legacy shield bearer from the side the camera sees. `drawShield()`
 * draws its shield as from the front, centred on x = shieldX; `drawBody(back)`
 * the rest of it (`back`: seen from behind, so no visor). `w` is its half
 * width, `s` the side of the front view its shield is on, `coreY` / `coreR`
 * where the power core on its back sits.
 */
export function drawTurned(ctx, fv, o) {
  const { screenX, w, s, shieldX, drawShield, drawBody, coreY, coreR, time, alpha } = o;
  const shieldAt = (x, k) => squeezed(ctx, shieldX, k, x - shieldX, drawShield);
  ctx.save();
  if (fv?.flip) mirrorAbout(ctx, screenX);
  switch (fv?.view) {
    case "threeFar":
      shieldAt(shieldX + s * w * 0.3, 0.66);
      squeezed(ctx, screenX, 0.82, -s * w * 0.06, () => drawBody(false));
      break;
    case "threeNear":
      squeezed(ctx, screenX, 0.82, s * w * 0.06, () => drawBody(false));
      shieldAt(screenX - s * w * 0.15, 0.72);
      break;
    case "side":
      squeezed(ctx, screenX, 0.55, 0, () => drawBody(false));
      drawCoreSliver(ctx, screenX - s * w * 0.6, coreY, coreR, time, alpha);
      drawFlankBurst(ctx, o.enemy, screenX - s * w * 0.6, coreY, coreR, time, alpha);
      shieldAt(screenX + s * w * 0.95, 0.14);
      break;
    case "back":
      shieldAt(screenX - s * w * 1.05, 0.4);
      drawBody(true);
      drawBackCore(ctx, screenX, coreY, coreR, time, alpha);
      drawFlankBurst(ctx, o.enemy, screenX, coreY, coreR, time, alpha);
      break;
    default:
      drawShield();
      drawBody(false);
  }
  ctx.restore();
}

/** Ms the core flares after a hit past the shield (enemy.lastFlankAt). */
const FLANK_MS = 280;

/** A hit past its shield: the core on its back flares amber. */
export function drawFlankBurst(ctx, enemy, x, y, r, time, alpha) {
  const age = time - (enemy.lastFlankAt ?? -1e9);
  if (age < 0 || age > FLANK_MS) return;
  const k = 1 - age / FLANK_MS;
  const R = r * (2.2 + 1.6 * (1 - k));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha * k;
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, "rgba(255,240,200,1)");
  g.addColorStop(0.35, "rgba(255,150,50,0.85)");
  g.addColorStop(1, "rgba(255,90,20,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - R, y - R, R * 2, R * 2);
  ctx.restore();
}

/** The core's rim seen from the side: a hot sliver at the back edge of a profile. */
export function drawCoreSliver(ctx, x, y, r, time, alpha) {
  const pulse = 0.75 + 0.25 * Math.sin(time * 0.006);
  ctx.fillStyle = "#1a1a22";
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.45, r * 1.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha * pulse;
  ctx.fillStyle = "#ff8a2a";
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.26, r * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffe0a0";
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.12, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
