// Pickup, exit, and projectile rendering — extracted from Renderer class

import { isModernArt, isRealisticArt } from "./art-style.js";
import { projectileKind } from "../../js/vfx.js";
import { drawSvgSprite, warmSvgSprites } from "./props.js";
import { DEFS as PICKUP_DEFS, PICKUP_SPRITES } from "./svg-art/sprites/pickups.js";

let _pickupsWarmed = false;

/** Modern art: blit the SVG pickup at the legacy bob position; false = draw legacy. */
function drawModernPickup(ctx, key, x, y, size, time, fog) {
  if (!isModernArt()) return false;
  if (!_pickupsWarmed) {
    _pickupsWarmed = true;
    warmSvgSprites(PICKUP_SPRITES, PICKUP_DEFS, size / 100);
  }
  return drawSvgSprite(ctx, key, PICKUP_SPRITES[key], PICKUP_DEFS, x, y, size / 100, time / 1000, fog);
}

export function drawPickup(
  ctx,
  screenX,
  centerY,
  sprWidth,
  sprHeight,
  dist,
  color,
  symbol,
  time,
  fog,
) {
  if (fog <= 0) return;
  const size = Math.max(4, sprWidth * 0.3);
  const bob = Math.sin(time * 0.004) * size * 0.2;
  const spin = time * 0.003;
  const y = centerY + sprHeight * 0.15 + bob;

  // Outer pulsing glow
  const pulse = 0.3 + Math.sin(time * 0.006) * 0.15;
  ctx.globalAlpha = fog * pulse;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(screenX, y, size * 1.3, 0, Math.PI * 2);
  ctx.fill();

  // Inner glow
  ctx.globalAlpha = fog * 0.4;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(screenX, y, size * 0.9, 0, Math.PI * 2);
  ctx.fill();

  // Diamond-shaped core (rotates)
  ctx.save();
  ctx.translate(screenX, y);
  ctx.rotate(spin);
  ctx.globalAlpha = fog;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.55);
  ctx.lineTo(size * 0.55, 0);
  ctx.lineTo(0, size * 0.55);
  ctx.lineTo(-size * 0.55, 0);
  ctx.closePath();
  ctx.fill();

  // Inner highlight
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.3);
  ctx.lineTo(size * 0.3, 0);
  ctx.lineTo(0, size * 0.3);
  ctx.lineTo(-size * 0.3, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Sparkle particles
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 3; i++) {
    const angle = spin * 2 + i * ((Math.PI * 2) / 3);
    const sparkR = size * 0.8;
    const sx = Math.cos(angle) * sparkR;
    const sy = Math.sin(angle) * sparkR;
    ctx.globalAlpha = fog * (0.3 + Math.sin(time * 0.01 + i) * 0.3);
    ctx.beginPath();
    ctx.arc(screenX + sx, y + sy, Math.max(1, size * 0.08), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

export function drawHealthPickup(
  ctx,
  screenX,
  centerY,
  sprWidth,
  sprHeight,
  dist,
  time,
  fog,
) {
  if (fog <= 0) return;
  const size = Math.max(6, sprWidth * 0.35);
  const bob = Math.sin(time * 0.004) * size * 0.2;
  const y = centerY + sprHeight * 0.15 + bob;
  if (drawModernPickup(ctx, "health", screenX, y, size, time, fog)) return;
  const pulse = 0.8 + Math.sin(time * 0.006) * 0.2;

  // Outer radial glow
  ctx.globalAlpha = fog * 0.2 * pulse;
  ctx.fillStyle = "#00ff44";
  ctx.beginPath();
  ctx.arc(screenX, y, size * 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Soft glow ring
  ctx.globalAlpha = fog * 0.3;
  ctx.fillStyle = "#00ff44";
  ctx.beginPath();
  ctx.arc(screenX, y, size * 1.2, 0, Math.PI * 2);
  ctx.fill();

  // White background with rounded look
  ctx.globalAlpha = fog;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(screenX - size * 0.6, y - size * 0.6, size * 1.2, size * 1.2);

  // Highlight on box
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(screenX - size * 0.6, y - size * 0.6, size * 0.4, size * 1.2);

  // Red cross
  const crossT = size * 0.22;
  ctx.fillStyle = "#ff2222";
  ctx.fillRect(screenX - crossT / 2, y - size * 0.45, crossT, size * 0.9);
  ctx.fillRect(screenX - size * 0.45, y - crossT / 2, size * 0.9, crossT);

  // Cross highlight
  ctx.fillStyle = "rgba(255,100,100,0.3)";
  ctx.fillRect(
    screenX - crossT / 2,
    y - size * 0.45,
    crossT * 0.4,
    size * 0.9,
  );

  // Border with pulse
  ctx.strokeStyle = "#00cc44";
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = fog * pulse;
  ctx.strokeRect(
    screenX - size * 0.6,
    y - size * 0.6,
    size * 1.2,
    size * 1.2,
  );

  // Corner dots
  ctx.fillStyle = "#00ff44";
  ctx.globalAlpha = fog * 0.6;
  const corners = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];
  corners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(
      screenX + cx * size * 0.6,
      y + cy * size * 0.6,
      Math.max(1, size * 0.06),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  });

  ctx.globalAlpha = 1;
}

export function drawAmmoPickup(ctx, screenX, centerY, sprWidth, sprHeight, dist, time, fog) {
  if (fog <= 0) return;
  const size = Math.max(6, sprWidth * 0.35);
  const bob = Math.sin(time * 0.004 + 1) * size * 0.2;
  const y = centerY + sprHeight * 0.15 + bob;
  if (drawModernPickup(ctx, "ammo", screenX, y, size, time, fog)) return;
  // Soft glow
  ctx.globalAlpha = fog * 0.3;
  ctx.fillStyle = "#ffaa00";
  ctx.beginPath();
  ctx.arc(screenX, y, size * 1.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = fog;
  // Magazine body
  const magW = size * 0.5;
  const magH = size * 1.0;
  ctx.fillStyle = "#555555";
  ctx.fillRect(screenX - magW / 2, y - magH / 2, magW, magH);
  // Highlight strip on magazine
  ctx.fillStyle = "#777777";
  ctx.fillRect(
    screenX - magW / 2 + 1,
    y - magH / 2 + 1,
    magW * 0.3,
    magH - 2,
  );
  // Cartridge tips
  const tipH = magH * 0.15;
  ctx.fillStyle = "#ddaa33";
  ctx.fillRect(
    screenX - magW / 2 + 1,
    y - magH / 2 - tipH + 1,
    magW * 0.25,
    tipH,
  );
  ctx.fillRect(screenX, y - magH / 2 - tipH + 1, magW * 0.25, tipH);
  ctx.fillRect(
    screenX - magW / 4,
    y - magH / 2 - tipH * 0.7 + 1,
    magW * 0.25,
    tipH * 0.7,
  );
  // Feed lip detail at top
  ctx.fillStyle = "#666666";
  ctx.fillRect(screenX - magW / 2 - 1, y - magH / 2, magW + 2, 2);
  // Border
  ctx.strokeStyle = "#ffaa00";
  ctx.lineWidth = 1;
  ctx.strokeRect(screenX - magW / 2, y - magH / 2, magW, magH);
  ctx.globalAlpha = 1;
}

/**
 * Gear drop — a piece of armour left on the floor. Reads as loot rather than a
 * consumable: a gold-amber plate that turns slowly on a rising glow column,
 * so it is legible across a room and never mistaken for health or ammo.
 */
export function drawGearPickup(ctx, screenX, centerY, sprWidth, sprHeight, dist, time, fog) {
  if (fog <= 0) return;
  const size = Math.max(6, sprWidth * 0.34);
  const bob = Math.sin(time * 0.0032 + 1.1) * size * 0.18;
  const y = centerY + sprHeight * 0.14 + bob;
  const spin = time * 0.0016;
  // Light column, so a drop behind cover still shows. Fades out with height
  // and widens at the base, or it reads as a solid amber post.
  const colH = size * 2.6;
  const beam = ctx.createLinearGradient(0, y - colH, 0, y);
  beam.addColorStop(0, "rgba(255,194,74,0)");
  beam.addColorStop(1, "rgba(255,210,120,0.5)");
  ctx.globalAlpha = fog * (0.5 + 0.18 * Math.sin(time * 0.005));
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(screenX - size * 0.1, y - colH);
  ctx.lineTo(screenX + size * 0.1, y - colH);
  ctx.lineTo(screenX + size * 0.3, y);
  ctx.lineTo(screenX - size * 0.3, y);
  ctx.closePath();
  ctx.fill();

  // Modern (realistic) draws a physical shoulder plate from the props sprite
  // set; Comic and Legacy keep the canvas plate below. The light column above
  // stays in every style: it is how a drop behind cover gets noticed.
  if (isRealisticArt()) {
    ctx.globalAlpha = 1;
    if (drawModernPickup(ctx, "gear", screenX, y, size, time, fog)) return;
  }

  ctx.save();
  ctx.translate(screenX, y);
  // A slow yaw: the plate turns to catch the light, it does not tumble.
  ctx.scale(Math.cos(spin) * 0.65 + 0.35, 1);

  // Shoulder-plate silhouette
  ctx.globalAlpha = fog;
  ctx.fillStyle = "#c9922e";
  ctx.beginPath();
  ctx.moveTo(-size * 0.62, size * 0.34);
  ctx.lineTo(-size * 0.44, -size * 0.46);
  ctx.lineTo(size * 0.44, -size * 0.46);
  ctx.lineTo(size * 0.62, size * 0.34);
  ctx.closePath();
  ctx.fill();

  // Lit upper bevel
  ctx.fillStyle = "#ffd980";
  ctx.beginPath();
  ctx.moveTo(-size * 0.44, -size * 0.46);
  ctx.lineTo(size * 0.44, -size * 0.46);
  ctx.lineTo(size * 0.36, -size * 0.22);
  ctx.lineTo(-size * 0.36, -size * 0.22);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#3a2708";
  ctx.lineWidth = Math.max(1, size * 0.07);
  ctx.beginPath();
  ctx.moveTo(-size * 0.62, size * 0.34);
  ctx.lineTo(-size * 0.44, -size * 0.46);
  ctx.lineTo(size * 0.44, -size * 0.46);
  ctx.lineTo(size * 0.62, size * 0.34);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function drawWeaponPickup(
  ctx,
  screenX,
  centerY,
  sprWidth,
  sprHeight,
  dist,
  time,
  fog,
) {
  if (fog <= 0) return;
  const size = Math.max(6, sprWidth * 0.35);
  const bob = Math.sin(time * 0.004 + 2) * size * 0.2;
  const y = centerY + sprHeight * 0.15 + bob;
  if (drawModernPickup(ctx, "weapon", screenX, y, size, time, fog)) return;
  // Soft glow
  ctx.globalAlpha = fog * 0.3;
  ctx.fillStyle = "#00ccff";
  ctx.beginPath();
  ctx.arc(screenX, y, size * 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = fog;
  // Metal crate body
  const crW = size * 0.9;
  const crH = size * 0.7;
  ctx.fillStyle = "#667788";
  ctx.fillRect(screenX - crW / 2, y - crH / 2, crW, crH);
  // Top face
  ctx.fillStyle = "#889aaa";
  ctx.beginPath();
  ctx.moveTo(screenX - crW / 2, y - crH / 2);
  ctx.lineTo(screenX - crW / 2 + crW * 0.15, y - crH / 2 - crH * 0.2);
  ctx.lineTo(screenX + crW / 2 + crW * 0.15, y - crH / 2 - crH * 0.2);
  ctx.lineTo(screenX + crW / 2, y - crH / 2);
  ctx.closePath();
  ctx.fill();
  // Right face
  ctx.fillStyle = "#556677";
  ctx.beginPath();
  ctx.moveTo(screenX + crW / 2, y - crH / 2);
  ctx.lineTo(screenX + crW / 2 + crW * 0.15, y - crH / 2 - crH * 0.2);
  ctx.lineTo(screenX + crW / 2 + crW * 0.15, y + crH / 2 - crH * 0.2);
  ctx.lineTo(screenX + crW / 2, y + crH / 2);
  ctx.closePath();
  ctx.fill();
  // Cross straps
  ctx.strokeStyle = "#88aacc";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(screenX - crW / 2, y - crH / 2);
  ctx.lineTo(screenX + crW / 2, y + crH / 2);
  ctx.moveTo(screenX + crW / 2, y - crH / 2);
  ctx.lineTo(screenX - crW / 2, y + crH / 2);
  ctx.stroke();
  // Corner rivets
  ctx.fillStyle = "#aaccee";
  const rivetR = Math.max(1, size * 0.05);
  [
    [-crW / 2 + 2, -crH / 2 + 2],
    [crW / 2 - 2, -crH / 2 + 2],
    [-crW / 2 + 2, crH / 2 - 2],
    [crW / 2 - 2, crH / 2 - 2],
  ].forEach(([rx, ry]) => {
    ctx.beginPath();
    ctx.arc(screenX + rx, y + ry, rivetR, 0, Math.PI * 2);
    ctx.fill();
  });
  // Border
  ctx.strokeStyle = "#00ccff";
  ctx.lineWidth = 1;
  ctx.strokeRect(screenX - crW / 2, y - crH / 2, crW, crH);
  ctx.globalAlpha = 1;
}

export function drawExit(ctx, screenX, centerY, sprWidth, sprHeight, dist, time, fog) {
  if (fog <= 0) return;
  const size = Math.max(8, sprWidth * 0.5);
  // Modern art draws the airlock as a layered SVG blast door; the legacy
  // canvas drawing below stays as the fallback, same as every other pickup.
  if (drawModernPickup(ctx, "exit", screenX, centerY, size, time, fog)) return;
  const t = time * 0.003;
  const pulse = 0.7 + Math.sin(t * 1.4) * 0.3;

  ctx.save();
  ctx.translate(screenX, centerY);

  // ── Airlock door frame ──────────────────────────────────────────
  const dW = size * 1.4; // door half-width
  const dH = size * 2.0; // door half-height
  const frameThick = Math.max(2, size * 0.12);

  // Ambient glow behind door
  ctx.globalAlpha = fog * pulse * 0.18;
  const grd = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, size * 2.4);
  grd.addColorStop(0, "#00ffaa");
  grd.addColorStop(1, "transparent");
  ctx.fillStyle = grd;
  ctx.fillRect(-size * 2.4, -size * 2.4, size * 4.8, size * 4.8);

  // Door panel (dark interior)
  ctx.globalAlpha = fog * 0.7;
  ctx.fillStyle = "#0a1a12";
  ctx.fillRect(-dW, -dH, dW * 2, dH * 2);

  // Scan-line shimmer inside door
  ctx.globalAlpha = fog * 0.08;
  ctx.fillStyle = "#00ff88";
  const scanOff = (time * 0.04) % (dH * 2);
  ctx.fillRect(-dW, -dH + scanOff, dW * 2, 2);

  // Outer frame
  ctx.globalAlpha = fog * pulse * 0.85;
  ctx.strokeStyle = "#00cc88";
  ctx.lineWidth = frameThick;
  ctx.strokeRect(-dW, -dH, dW * 2, dH * 2);

  // Inner frame bevel
  ctx.globalAlpha = fog * 0.4;
  ctx.strokeStyle = "#005533";
  ctx.lineWidth = frameThick * 0.5;
  ctx.strokeRect(
    -dW + frameThick,
    -dH + frameThick,
    (dW - frameThick) * 2,
    (dH - frameThick) * 2,
  );

  // Hazard stripes — top bar
  ctx.globalAlpha = fog * 0.55;
  const stripeH = Math.max(3, size * 0.18);
  const stripeCount = 6;
  const stripeW = (dW * 2) / stripeCount;
  for (let s = 0; s < stripeCount; s++) {
    ctx.fillStyle = s % 2 === 0 ? "#ffcc00" : "#111111";
    ctx.fillRect(-dW + s * stripeW, -dH, stripeW, stripeH);
    ctx.fillRect(-dW + s * stripeW, dH - stripeH, stripeW, stripeH);
  }

  // Status indicator lights (left frame)
  const lightR = Math.max(2, size * 0.1);
  const lightSpacing = dH * 0.4;
  const greenPulse = 0.8 + Math.sin(t * 2.2) * 0.2;
  for (let li = 0; li < 3; li++) {
    const ly = -dH * 0.35 + li * lightSpacing;
    // Glow
    ctx.globalAlpha = fog * greenPulse * 0.4;
    ctx.fillStyle = "#00ff88";
    ctx.beginPath();
    ctx.arc(-dW - lightR * 0.5, ly, lightR * 2, 0, Math.PI * 2);
    ctx.fill();
    // Core
    ctx.globalAlpha = fog * greenPulse * 0.9;
    ctx.fillStyle = "#00ff88";
    ctx.beginPath();
    ctx.arc(-dW - lightR * 0.5, ly, lightR, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Rotating energy arcs
  for (let i = 0; i < 4; i++) {
    const a = t * 2 + (i * Math.PI) / 2;
    const rx = Math.cos(a) * size * 0.9;
    const ry = Math.sin(a) * size * 1.3;
    ctx.globalAlpha = fog * 0.6;
    ctx.fillStyle = i % 2 === 0 ? "#00ffcc" : "#88ffdd";
    ctx.beginPath();
    ctx.arc(rx, ry, Math.max(2, size * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }

  // Door centre seam (vertical split line)
  ctx.globalAlpha = fog * pulse * 0.5;
  ctx.strokeStyle = "#00ffaa";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -dH + stripeH);
  ctx.lineTo(0, dH - stripeH);
  ctx.stroke();

  // Horizontal locking bolt indicator (recessed)
  ctx.globalAlpha = fog * 0.3;
  ctx.fillStyle = "#004422";
  ctx.fillRect(-dW * 0.6, -size * 0.08, dW * 1.2, size * 0.16);
  ctx.globalAlpha = fog * pulse * 0.7;
  ctx.strokeStyle = "#00cc88";
  ctx.lineWidth = 1;
  ctx.strokeRect(-dW * 0.6, -size * 0.08, dW * 1.2, size * 0.16);

  // "AIRLOCK" label above door
  if (size > 14) {
    const fontSize = Math.max(7, size * 0.22);
    ctx.globalAlpha = fog * pulse * 0.75;
    ctx.fillStyle = "#00ffcc";
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText("AIRLOCK", 0, -dH - fontSize * 0.3);
  }

  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
  ctx.restore();
}

// ── Realistic FX: projectiles and impact particles ──────────────────────────
//
// Emissive, not painted: every glow is a pre-rasterised gradient sprite
// (cached per colour and size bucket) composited additively, so the post-FX
// tonemap treats it as light. Nothing here builds a gradient or a string per
// frame.

/**
 * Camera for the current frame, in the renderer's projection terms. The
 * renderer sets it once per frame (setFxCamera); streaks project their tail
 * through it. Until it is set, bolts draw without a streak.
 */
const FX_CAM = {
  valid: false,
  dirX: 1, dirY: 0, planeX: 0, planeY: 0.66,
  cx: 0, cy: 0, w: 1, h: 1, invDet: 1,
};

export function setFxCamera(dirX, dirY, planeX, planeY, cx, cy, w, h) {
  FX_CAM.dirX = dirX;
  FX_CAM.dirY = dirY;
  FX_CAM.planeX = planeX;
  FX_CAM.planeY = planeY;
  FX_CAM.cx = cx;
  FX_CAM.cy = cy;
  FX_CAM.w = w;
  FX_CAM.h = h;
  FX_CAM.invDet = 1 / (planeX * dirY - dirX * planeY);
  FX_CAM.valid = true;
}

const camTX = (dx, dy) => FX_CAM.invDet * (FX_CAM.dirY * dx - FX_CAM.dirX * dy);
const camTY = (dx, dy) => FX_CAM.invDet * (-FX_CAM.planeY * dx + FX_CAM.planeX * dy);

function fxCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

const mixW = (c, k) => Math.round(c + (255 - c) * k);
const rgba = (r, g, b, a) => `rgba(${r},${g},${b},${a})`;

/** Radial sprite; stops are [pos, whiteMix, alpha] triples over colour rgb. */
function bakeRadial(size, r, g, b, stops) {
  const c = fxCanvas(size, size);
  const g2 = c.getContext("2d");
  const h = size / 2;
  const grad = g2.createRadialGradient(h, h, 0, h, h, h);
  for (let i = 0; i < stops.length; i += 3) {
    const k = stops[i + 1];
    grad.addColorStop(stops[i], rgba(mixW(r, k), mixW(g, k), mixW(b, k), stops[i + 2]));
  }
  g2.fillStyle = grad;
  g2.fillRect(0, 0, size, size);
  return c;
}

// Falloff: a tight bright lobe with a long soft tail, like a bloomed point.
const HALO_STOPS = [0, 0.35, 0.95, 0.07, 0.15, 0.75, 0.18, 0, 0.4, 0.38, 0, 0.16, 0.62, 0, 0.05, 1, 0, 0];
// White-hot centre that only tints toward the bolt colour at its rim.
const CORE_STOPS = [0, 1, 1, 0.28, 0.9, 0.95, 0.55, 0.55, 0.45, 1, 0.2, 0];
// Smoke and dust: soft, translucent, no hard edge.
const PUFF_STOPS = [0, 0, 0.5, 0.35, 0, 0.36, 0.7, 0, 0.12, 1, 0, 0];

/** Horizontal streak sprite, head at the right; `hot` pulls it toward white. */
function bakeTrail(r, g, b, hot, flip) {
  const W = 128, H = 32;
  const c = fxCanvas(W, H);
  const g2 = c.getContext("2d");
  const k = hot ? 0.75 : 0;
  const cr = mixW(r, k), cg = mixW(g, k), cb = mixW(b, k);
  const along = g2.createLinearGradient(flip ? W : 0, 0, flip ? 0 : W, 0);
  along.addColorStop(0, rgba(cr, cg, cb, 0));
  along.addColorStop(0.45, rgba(cr, cg, cb, 0.12));
  along.addColorStop(0.8, rgba(cr, cg, cb, 0.5));
  along.addColorStop(1, rgba(cr, cg, cb, 1));
  g2.fillStyle = along;
  g2.fillRect(0, 0, W, H);
  const across = g2.createLinearGradient(0, 0, 0, H);
  across.addColorStop(0, "rgba(0,0,0,0)");
  across.addColorStop(0.3, "rgba(0,0,0,0.3)");
  across.addColorStop(0.5, "rgba(0,0,0,1)");
  across.addColorStop(0.7, "rgba(0,0,0,0.3)");
  across.addColorStop(1, "rgba(0,0,0,0)");
  g2.globalCompositeOperation = "destination-in";
  g2.fillStyle = across;
  g2.fillRect(0, 0, W, H);
  return c;
}

const BUCKETS = [16, 32, 64, 128];
const bucketFor = (d) => (d <= 20 ? 0 : d <= 44 ? 1 : d <= 96 ? 2 : 3);

function makePalette(r, g, b) {
  return {
    r, g, b,
    halo: [null, null, null, null],
    core: [null, null, null, null],
    puff: null,
    trailL: null, trailR: null, hotL: null, hotR: null,
    arc: rgba(mixW(r, 0.6), mixW(g, 0.6), mixW(b, 0.6), 0.9),
  };
}

function haloSprite(pal, d) {
  const i = bucketFor(d);
  return pal.halo[i] || (pal.halo[i] = bakeRadial(BUCKETS[i], pal.r, pal.g, pal.b, HALO_STOPS));
}
function coreSprite(pal, d) {
  const i = bucketFor(d);
  return pal.core[i] || (pal.core[i] = bakeRadial(BUCKETS[i], pal.r, pal.g, pal.b, CORE_STOPS));
}
function puffSprite(pal) {
  return pal.puff || (pal.puff = bakeRadial(64, pal.r, pal.g, pal.b, PUFF_STOPS));
}
/** Trail whose head is at the right (tail extends left) or the left. */
function trailSprite(pal, headRight, hot) {
  if (hot) {
    if (headRight) return pal.hotR || (pal.hotR = bakeTrail(pal.r, pal.g, pal.b, true, false));
    return pal.hotL || (pal.hotL = bakeTrail(pal.r, pal.g, pal.b, true, true));
  }
  if (headRight) return pal.trailR || (pal.trailR = bakeTrail(pal.r, pal.g, pal.b, false, false));
  return pal.trailL || (pal.trailL = bakeTrail(pal.r, pal.g, pal.b, false, true));
}

const _palByColor = new Map(); // CSS hex string → palette
const _palByRGB = new Map(); // 4-bit-per-channel key → palette

function paletteFor(color) {
  let pal = _palByColor.get(color);
  if (!pal) {
    let r = 255, g = 0, b = 68;
    if (typeof color === "string" && color[0] === "#") {
      const s = color.length === 4
        ? color[1] + color[1] + color[2] + color[2] + color[3] + color[3]
        : color.slice(1, 7);
      const n = parseInt(s, 16);
      if (!Number.isNaN(n)) { r = (n >> 16) & 255; g = (n >> 8) & 255; b = n & 255; }
    }
    pal = makePalette(r, g, b);
    _palByColor.set(color, pal);
  }
  return pal;
}

function paletteRGB(r, g, b) {
  const qr = Math.max(0, Math.min(15, r >> 4));
  const qg = Math.max(0, Math.min(15, g >> 4));
  const qb = Math.max(0, Math.min(15, b >> 4));
  const key = (qr << 8) | (qg << 4) | qb;
  let pal = _palByRGB.get(key);
  if (!pal) {
    pal = makePalette(qr * 17, qg * 17, qb * 17);
    _palByRGB.set(key, pal);
  }
  return pal;
}

/**
 * Per-kind look, all in world units scaled by depth. `trail` is the streak's
 * exposure in seconds (length = speed × trail), `trailW` its thickness as a
 * fraction of the halo.
 */
const BOLT = {
  plasma:  { halo: 0.24, core: 0.045, haloMin: 5, coreMin: 1.4, haloA: 0.8,  trail: 0.05,  trailW: 0.42, flick: 0.18 },
  tracer:  { halo: 0.13, core: 0.026, haloMin: 3.5, coreMin: 1.1, haloA: 0.6, trail: 0.11,  trailW: 0.34, flick: 0.08 },
  heavy:   { halo: 0.4,  core: 0.08,  haloMin: 7, coreMin: 2,   haloA: 0.85, trail: 0.035, trailW: 0.55, flick: 0.22 },
  missile: { halo: 0.2,  core: 0.04,  haloMin: 5, coreMin: 1.4, haloA: 0.8,  trail: 0.13,  trailW: 0.34, flick: 0.35 },
  emp:     { halo: 0.3,  core: 0.05,  haloMin: 6, coreMin: 1.6, haloA: 0.75, trail: 0.04,  trailW: 0.45, flick: 0.3 },
};
const SMOKE_PAL = paletteLazy(70, 66, 62);
function paletteLazy(r, g, b) {
  let pal = null;
  return () => pal || (pal = makePalette(r, g, b));
}

/** Cheap deterministic hash → [0, 1). */
function hash01(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function drawRealisticProjectile(ctx, sx, cy, unit, e, time, fog) {
  const kind = projectileKind(e);
  const S = BOLT[kind];
  const pal = paletteFor(e.color);
  if (e._fxSeed === undefined) e._fxSeed = hash01(e.originX * 12.9898 + e.originY * 78.233) * 100;
  const seed = e._fxSeed;

  const cap = FX_CAM.valid ? FX_CAM.h * 0.1 : 72;
  let haloR = Math.min(cap, Math.max(S.haloMin, unit * S.halo));
  const coreR = Math.min(cap * 0.3, Math.max(S.coreMin, unit * S.core));
  // Two incommensurate sines: an unsteady burn, never a regular pulse.
  const flick = 1 - S.flick * (0.5 + 0.5 * Math.sin(time * 0.047 + seed)) * (0.5 + 0.5 * Math.sin(time * 0.113 + seed * 1.7));
  if (kind === "heavy") haloR *= 1 + 0.07 * Math.sin(time * 0.011 + seed);

  const prevOp = ctx.globalCompositeOperation;

  // Motion streak. Projectiles fly at eye height, and every eye-height point
  // projects onto the horizon row, so the streak is horizontal: only the
  // tail's screen x is needed. It comes from the bolt's world velocity
  // against the camera, not from frame-to-frame screen motion, so turning
  // does not smear it.
  let tailX = sx;
  if (FX_CAM.valid && e.speed > 0) {
    const hx = e.x - FX_CAM.cx;
    const hy = e.y - FX_CAM.cy;
    const tyH = camTY(hx, hy);
    const k = camTY(e.dirX, e.dirY); // depth gained per unit travelled
    let L = e.speed * S.trail;
    // Keep the tail in front of the near plane when the bolt flies away from us.
    if (k > 0 && tyH - k * L < 0.2) L = Math.max(0, (tyH - 0.2) / k);
    const tyT = tyH - k * L;
    if (tyT > 0.1) {
      const txT = camTX(hx - e.dirX * L, hy - e.dirY * L);
      tailX = (FX_CAM.w / 2) * (1 + txT / tyT);
      const lim = FX_CAM.w * 0.5;
      if (tailX - sx > lim) tailX = sx + lim;
      else if (sx - tailX > lim) tailX = sx - lim;
    }
  }
  const dx = tailX - sx;

  if (kind === "missile" && Math.abs(dx) > 2) {
    // Exhaust smoke: lit matter, not light, so it composites normally and
    // runs twice as long as the flame.
    const smoke = SMOKE_PAL();
    const len = Math.abs(dx) * 2;
    const th = haloR * 0.7;
    ctx.globalAlpha = fog * 0.3;
    if (dx < 0) ctx.drawImage(trailSprite(smoke, true, false), sx - len, cy - th, len, th * 2);
    else ctx.drawImage(trailSprite(smoke, false, false), sx, cy - th, len, th * 2);
  }

  ctx.globalCompositeOperation = "lighter";

  if (Math.abs(dx) > 1.5) {
    const lead = haloR * 0.35; // run the streak slightly under the head
    const th = Math.max(1.5, haloR * S.trailW);
    const hotTh = Math.max(1, coreR * 1.1);
    const len = Math.abs(dx) + lead;
    ctx.globalAlpha = fog * flick * 0.9;
    if (dx < 0) {
      ctx.drawImage(trailSprite(pal, true, false), tailX, cy - th, len, th * 2);
      ctx.drawImage(trailSprite(pal, true, true), sx - len * 0.6, cy - hotTh, len * 0.6 + lead * 0.3, hotTh * 2);
    } else {
      ctx.drawImage(trailSprite(pal, false, false), sx - lead, cy - th, len, th * 2);
      ctx.drawImage(trailSprite(pal, false, true), sx - lead * 0.3, cy - hotTh, len * 0.6 + lead * 0.3, hotTh * 2);
    }
  }

  // Coloured falloff, then the white-hot core.
  const hd = haloR * 2;
  ctx.globalAlpha = fog * flick * S.haloA;
  ctx.drawImage(haloSprite(pal, hd), sx - haloR, cy - haloR, hd, hd);
  const cr = coreR * 2.2;
  const cd = cr * 2;
  ctx.globalAlpha = fog * (0.85 + 0.15 * flick);
  ctx.drawImage(coreSprite(pal, cd), sx - cr, cy - cr, cd, cd);

  if (kind === "emp") {
    // Discharge arcs: three jagged filaments, re-struck every ~60 ms.
    const strike = Math.floor(time / 60) + seed;
    ctx.globalAlpha = fog * 0.55;
    ctx.strokeStyle = pal.arc;
    ctx.lineWidth = Math.max(0.75, Math.min(2, coreR * 0.15));
    ctx.beginPath();
    for (let a = 0; a < 3; a++) {
      if (hash01(strike * 1.9 + a * 4.1) < 0.35) continue; // arcs strike intermittently
      const base = hash01(strike * 3.1 + a) * Math.PI * 2;
      const reach = haloR * (0.35 + 0.3 * hash01(strike + a * 7.7));
      let px = sx, py = cy;
      ctx.moveTo(px, py);
      for (let s = 1; s <= 4; s++) {
        const r = (reach * s) / 4;
        const ang = base + (hash01(strike * 5.3 + a * 13 + s) - 0.5) * 0.9;
        px = sx + Math.cos(ang) * r;
        py = cy + Math.sin(ang) * r;
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = prevOp;
}

// Spark heat ramp, white-hot → yellow → orange → dull red → dark.
const HEAT_STEPS = 16;
const HEAT = [];
const HEAT_PAL = [];
{
  const ramp = [
    [0, 40, 10, 5], [0.12, 110, 25, 8], [0.3, 220, 70, 15],
    [0.5, 255, 140, 40], [0.75, 255, 215, 120], [1, 255, 250, 235],
  ];
  for (let i = 0; i < HEAT_STEPS; i++) {
    const t = i / (HEAT_STEPS - 1);
    let j = 1;
    while (j < ramp.length - 1 && ramp[j][0] < t) j++;
    const a = ramp[j - 1], b = ramp[j];
    const f = (t - a[0]) / (b[0] - a[0]);
    const r = Math.round(a[1] + (b[1] - a[1]) * f);
    const g = Math.round(a[2] + (b[2] - a[2]) * f);
    const bb = Math.round(a[3] + (b[3] - a[3]) * f);
    HEAT.push(`rgb(${r},${g},${bb})`);
    HEAT_PAL.push([r, g, bb]);
  }
}
const SPARK_SHUTTER = 0.022; // seconds of travel smeared into a spark streak

// Chip face colours, quantised to 4 bits per channel so the cache stays small.
const _chipCols = new Map();
function chipColour(r, g, b) {
  const qr = Math.max(0, Math.min(15, (r + 8) >> 4));
  const qg = Math.max(0, Math.min(15, (g + 8) >> 4));
  const qb = Math.max(0, Math.min(15, (b + 8) >> 4));
  const key = (qr << 8) | (qg << 4) | qb;
  let c = _chipCols.get(key);
  if (!c) {
    c = `rgb(${qr * 17},${qg * 17},${qb * 17})`;
    _chipCols.set(key, c);
  }
  return c;
}

/**
 * Tumbling debris chip: an irregular 4-5 sided shard spinning in the view
 * plane while it flips end over end (its width squashes through zero), so the
 * lit face and the dark underside alternate. A thin catch-light runs along
 * the top edge of the lit face. Fades out over its last moments.
 */
function drawChip(ctx, p, sx, sy, size, depth) {
  // Debris spawned outside vfx.js has no seed: derive one from its random size.
  const seed = p._seed ?? hash01(p.size * 997);
  const age = (p.maxLife || 0.5) - (p.life > 0 ? p.life : 0);
  const spin = (seed - 0.5) * 34;
  const ang = seed * 6.283 + age * spin;
  const flip = Math.cos(seed * 17 + age * (9 + seed * 14));
  const lit = flip >= 0;
  const sq = 0.18 + Math.abs(flip) * 0.82;
  const rad = Math.max(1.2, size * 0.6);
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const sides = seed > 0.55 ? 5 : 4;
  // Distance darkening, like the default particle's fog.
  const fog = Math.max(0.35, Math.min(1, 1.25 - depth * 0.07));
  const k = lit ? 1.35 * fog : 0.42 * fog;
  const r = p.r ?? 90;
  const g = p.g ?? 85;
  const b = p.b ?? 80;
  ctx.globalAlpha = Math.min(1, (p.life > 0 ? p.life : 0) * 7);
  ctx.fillStyle = chipColour(r * k + (lit ? 10 : 0), g * k + (lit ? 10 : 0), b * k + (lit ? 12 : 0));
  ctx.beginPath();
  let x0 = 0;
  let y0 = 0;
  let x1 = 0;
  let y1 = 0;
  for (let i = 0; i < sides; i++) {
    // Jagged outline: each vertex gets its own radius and angular jitter.
    const a = (i / sides) * 6.283 + (hash01(seed * 91 + i) - 0.5) * 0.9;
    const rr = rad * (0.55 + hash01(seed * 53 + i * 7) * 0.6);
    const lx = Math.cos(a) * rr;
    const ly = Math.sin(a) * rr * sq;
    const px = sx + lx * ca - ly * sa;
    const py = sy + lx * sa + ly * ca;
    if (i === 0) {
      ctx.moveTo(px, py);
      x0 = px; y0 = py;
    } else ctx.lineTo(px, py);
    if (i === 1) {
      x1 = px;
      y1 = py;
    }
  }
  ctx.closePath();
  ctx.fill();
  // The first edge catches the key light when it faces up.
  if (lit && rad > 2.2 && sq > 0.45 && y0 + y1 < sy * 2) {
    ctx.strokeStyle = chipColour(r * 2.2 * fog + 40, g * 2.2 * fog + 38, b * 2.2 * fog + 34);
    ctx.lineWidth = Math.min(1.5, rad * 0.22);
    ctx.globalAlpha *= 0.7;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/**
 * Realistic particle drawer. The renderer projects and occludes the particle,
 * then calls this; false means "not mine, draw the default square".
 *
 * @param {number} sx,sy  projected screen position (already integer)
 * @param {number} size   projected size in px (h / depth × p.size)
 * @param {number} depth  camera-space depth (transformY)
 */
export function drawRealisticParticle(ctx, p, sx, sy, size, depth) {
  if (!FX_CAM.valid) return false;
  const type = p._type;
  if (type === "debris") {
    drawChip(ctx, p, sx, sy, size, depth);
    return true;
  }
  const life = p.life > 0 ? p.life : 0;
  const prevOp = ctx.globalCompositeOperation;

  if (type === "smoke") {
    // Soft translucent puff, fading in as it spreads and out as it thins.
    const d = Math.max(3, size * 2.4);
    ctx.globalAlpha = Math.min(1, life * 1.6) * 0.3;
    ctx.drawImage(puffSprite(paletteRGB(p.r, p.g, p.b)), sx - d / 2, sy - d / 2, d, d);
    ctx.globalAlpha = 1;
    return true;
  }

  ctx.globalCompositeOperation = "lighter";
  if (type === "spark") {
    const t = Math.min(1, life / (p.maxLife || 0.3));
    const hi = (t * (HEAT_STEPS - 1)) | 0;
    const h = FX_CAM.h;
    const unit = h / depth;
    const lw = Math.min(3, Math.max(1, unit * p.size * 0.45));
    // Tail = where the spark was one shutter-time ago.
    const tx = camTX(p.x - FX_CAM.cx, p.y - FX_CAM.cy);
    const txT = tx + camTX(-p.vx * SPARK_SHUTTER, -p.vy * SPARK_SHUTTER);
    const tyT = depth + camTY(-p.vx * SPARK_SHUTTER, -p.vy * SPARK_SHUTTER);
    ctx.globalAlpha = Math.min(1, t * 2.5);
    ctx.strokeStyle = HEAT[hi];
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    if (tyT > 0.12) {
      const horizon = sy - (p.z || 0) * unit;
      ctx.lineTo(
        (FX_CAM.w / 2) * (1 + txT / tyT),
        horizon + ((p.z || 0) - (p.vz || 0) * SPARK_SHUTTER) * (h / tyT),
      );
    } else {
      ctx.lineTo(sx + 0.5, sy + 0.5);
    }
    ctx.stroke();
    ctx.lineCap = "butt";
    if (t > 0.45) {
      const c = HEAT_PAL[hi];
      const d = lw * 7;
      ctx.globalAlpha = (t - 0.45) * 1.2;
      ctx.drawImage(haloSprite(paletteRGB(c[0], c[1], c[2]), d), sx - d / 2, sy - d / 2, d, d);
    }
  } else {
    // "energy" bursts / fireball lobes and the default emissive bits.
    const pal = paletteRGB(p.r ?? 255, p.g ?? 255, p.b ?? 255);
    const d = Math.max(2, size * (type === "energy" ? 3 : 2.6));
    ctx.globalAlpha = Math.min(1, life * (type === "energy" ? 4 : 3)) * 0.85;
    ctx.drawImage(haloSprite(pal, d), sx - d / 2, sy - d / 2, d, d);
    if (d > 6) {
      const c = d * 0.4;
      ctx.drawImage(coreSprite(pal, c), sx - c / 2, sy - c / 2, c, c);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = prevOp;
  return true;
}

export function drawProjectile(ctx, screenX, centerY, sprWidth, dist, entity, time, fog) {
  if (fog <= 0) return;
  if (isRealisticArt()) {
    drawRealisticProjectile(ctx, screenX, centerY, sprWidth, entity, time, fog);
    return;
  }
  const size = Math.max(3, sprWidth * 0.15);
  const color = entity.color || "#ff0044";
  const t = time * 0.006;

  // Outer glow halo
  ctx.globalAlpha = fog * 0.35;
  const glow = ctx.createRadialGradient(
    screenX,
    centerY,
    0,
    screenX,
    centerY,
    size * 3,
  );
  glow.addColorStop(0, color);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(screenX - size * 3, centerY - size * 3, size * 6, size * 6);

  // Core orb
  ctx.globalAlpha = fog * 0.8;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(screenX, centerY, size * 0.9, 0, Math.PI * 2);
  ctx.fill();

  // Bright center
  ctx.globalAlpha = fog;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(screenX, centerY, size * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Sparks
  ctx.globalAlpha = fog * 0.6;
  for (let i = 0; i < 3; i++) {
    const a = t + i * 2.1;
    const sx = screenX + Math.cos(a) * size * 1.4;
    const sy = centerY + Math.sin(a) * size * 1.4;
    ctx.fillStyle = color;
    ctx.fillRect(sx - 1, sy - 1, 2, 2);
  }

  ctx.globalAlpha = 1;
}

/**
 * Exotic meltdown pickup — shared base sprite. Style differs by `variant`:
 *   "damage2x": red/orange, "×2" glyph, damage motif
 *   "invuln":   gold/white, star glyph, shield motif
 */
export function drawExoticPickup(
  ctx,
  screenX,
  centerY,
  sprWidth,
  sprHeight,
  dist,
  time,
  fog,
  variant,
) {
  if (fog <= 0) return;
  const size = Math.max(7, sprWidth * 0.4);
  const bob = Math.sin(time * 0.005) * size * 0.25;
  const y = centerY + sprHeight * 0.1 + bob;
  if (drawModernPickup(ctx, variant === "damage2x" ? "damage2x" : "invuln", screenX, y, size, time, fog)) return;
  const pulse = 0.7 + Math.sin(time * 0.008) * 0.3;
  const spin = (time * 0.003) % (Math.PI * 2);

  const isDmg = variant === "damage2x";
  const colorCore = isDmg ? "#ff3322" : "#ffdd44";
  const colorGlow = isDmg ? "#ff6644" : "#ffee88";
  const colorDark = isDmg ? "#661100" : "#886600";

  // Outer pulsing halo
  ctx.globalAlpha = fog * 0.25 * pulse;
  ctx.fillStyle = colorGlow;
  ctx.beginPath();
  ctx.arc(screenX, y, size * 2.0, 0, Math.PI * 2);
  ctx.fill();

  // Mid glow
  ctx.globalAlpha = fog * 0.45;
  ctx.fillStyle = colorCore;
  ctx.beginPath();
  ctx.arc(screenX, y, size * 1.3, 0, Math.PI * 2);
  ctx.fill();

  // Rotating diamond core
  ctx.save();
  ctx.translate(screenX, y);
  ctx.rotate(spin);
  ctx.globalAlpha = fog;
  ctx.fillStyle = colorCore;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.9);
  ctx.lineTo(size * 0.9, 0);
  ctx.lineTo(0, size * 0.9);
  ctx.lineTo(-size * 0.9, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = colorDark;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner highlight
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.5);
  ctx.lineTo(size * 0.25, -size * 0.25);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Glyph overlay (no rotate — always upright, legible)
  ctx.globalAlpha = fog;
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.max(9, Math.floor(size * 0.95))}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(isDmg ? "2x" : "+", screenX, y);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  ctx.globalAlpha = 1;
}
