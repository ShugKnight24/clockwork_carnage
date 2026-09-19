// Pickup, exit, and projectile rendering — extracted from Renderer class

import { isModernArt } from "./art-style.js";
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

export function drawProjectile(ctx, screenX, centerY, sprWidth, dist, entity, time, fog) {
  if (fog <= 0) return;
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
