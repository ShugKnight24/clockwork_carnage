import { drawGlow } from "../draw-utils.js";

export function renderTemporalEngineer(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha, time, enemy, hitFlash) {
  // ── Temporal Engineer ──────────────────────────────────────
  // Technical support unit — gold, heavy hex armor, backpack reactor,
  // holographic wrist display, diagnostic tool arm, data visor
  const w = bodyWidth * 0.75;
  const top = centerY - halfH * 0.38;
  const bot = centerY + halfH * 0.44;
  const h = bot - top;
  const techPulse = Math.sin(time * 0.005 + enemy.y * 3);
  const dataTick = Math.sin(time * 0.008 + enemy.x * 4);

  // ── Legs (armored, wide stance) ──
  const legH = halfH * 0.26;
  const legW = w * 0.3;
  for (const side of [-1, 1]) {
    const legX = screenX + side * w * 0.35 - legW / 2;
    // Upper leg
    ctx.fillStyle = darkColor;
    ctx.fillRect(legX, bot, legW, legH * 0.55);
    // Knee cap (rounded)
    ctx.fillStyle = baseColor;
    ctx.globalAlpha = alpha * 0.5;
    ctx.beginPath();
    ctx.roundRect(legX - 1, bot + legH * 0.18, legW + 2, legH * 0.18, 3);
    ctx.fill();
    ctx.globalAlpha = alpha;
    // Boot (heavy, treaded)
    ctx.fillStyle = "#443311";
    ctx.beginPath();
    ctx.roundRect(legX - 2, bot + legH * 0.55, legW + 4, legH * 0.45 + 2, 2);
    ctx.fill();
    // Boot sole
    ctx.fillStyle = "#332200";
    ctx.fillRect(legX - 2, bot + legH - 2, legW + 4, 3);
  }

  // ── Torso (rectangular, armored) ──
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.roundRect(screenX - w, top, w * 2, h, 4);
  ctx.fill();

  // ── Hex armor plating ──
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = alpha * 0.3;
  const hexSize = w * 0.32;
  for (let hx = -1; hx <= 1; hx++) {
    for (let hy = 0; hy < 3; hy++) {
      const hcx = screenX + hx * hexSize * 1.5;
      const hcy = top + h * (0.15 + hy * 0.28);
      ctx.beginPath();
      for (let hi = 0; hi < 6; hi++) {
        const ha = (hi / 6) * Math.PI * 2 - Math.PI / 6;
        const px = hcx + Math.cos(ha) * hexSize * 0.4;
        const py = hcy + Math.sin(ha) * hexSize * 0.4;
        hi === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.globalAlpha = alpha;

  // ── Center control panel ──
  ctx.fillStyle = baseColor;
  ctx.globalAlpha = alpha * 0.6;
  ctx.beginPath();
  ctx.roundRect(screenX - w * 0.45, top + h * 0.12, w * 0.9, h * 0.32, 3);
  ctx.fill();
  ctx.globalAlpha = alpha;
  // Panel border
  ctx.strokeStyle = "#ffeebb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(screenX - w * 0.45, top + h * 0.12, w * 0.9, h * 0.32, 3);
  ctx.stroke();

  // ── Status indicators (3 small dots on panel) ──
  for (let si = 0; si < 3; si++) {
    const sx = screenX - w * 0.25 + si * w * 0.25;
    const sy = top + h * 0.18;
    const on = Math.sin(time * 0.006 + si * 2.1) > 0;
    ctx.fillStyle = on ? (hitFlash ? "#ffffff" : "#00ff66") : "#333311";
    ctx.beginPath();
    ctx.arc(sx, sy, w * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Main status light (pulsing) ──
  const lightColor = hitFlash ? "#ffffff" : "#ffdd00";
  ctx.fillStyle = lightColor;
  ctx.shadowColor = "#ffd36b";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(screenX, top + h * 0.3, w * 0.11 * (0.8 + techPulse * 0.2), 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // ── Belt with utility pouches ──
  const beltY = bot - h * 0.14;
  ctx.fillStyle = "#554422";
  ctx.beginPath();
  ctx.roundRect(screenX - w * 0.9, beltY, w * 1.8, h * 0.1, 2);
  ctx.fill();
  // Pouches
  ctx.fillStyle = "#443311";
  for (let pi = 0; pi < 4; pi++) {
    const px = screenX - w * 0.7 + pi * w * 0.4;
    ctx.beginPath();
    ctx.roundRect(px, beltY - h * 0.02, w * 0.25, h * 0.12, 2);
    ctx.fill();
  }
  // Belt buckle (tech)
  ctx.fillStyle = "#887744";
  ctx.beginPath();
  ctx.roundRect(screenX - w * 0.1, beltY, w * 0.2, h * 0.1, 1);
  ctx.fill();

  // ── Shoulder pads ──
  ctx.fillStyle = baseColor;
  ctx.globalAlpha = alpha * 0.7;
  for (const side of [-1, 1]) {
    const spX = screenX + side * w * 0.95 - w * 0.2;
    ctx.beginPath();
    ctx.roundRect(spX, top, w * 0.4, h * 0.2, 3);
    ctx.fill();
  }
  ctx.globalAlpha = alpha;

  // ── Arms ──
  for (const side of [-1, 1]) {
    const armX = screenX + side * w * 1.05;
    // Upper arm
    ctx.fillStyle = darkColor;
    ctx.fillRect(armX - w * 0.11, top + h * 0.2, w * 0.22, h * 0.35);
    // Forearm
    ctx.fillRect(armX - w * 0.1, top + h * 0.55, w * 0.2, h * 0.2);
    // Wrist device (both sides get smaller ones)
    ctx.fillStyle = "#887744";
    ctx.beginPath();
    ctx.roundRect(armX - w * 0.12, top + h * 0.52, w * 0.24, h * 0.06, 2);
    ctx.fill();
  }
  // Hand (left — gloved)
  ctx.fillStyle = "#443311";
  ctx.beginPath();
  ctx.arc(screenX - w * 1.05, top + h * 0.77, w * 0.1, 0, Math.PI * 2);
  ctx.fill();

  // ── Tool arm (right side — extended diagnostic device) ──
  const toolX = screenX + w * 1.05;
  const toolY = top + h * 0.5;
  // Wrist mount
  ctx.fillStyle = "#887744";
  ctx.beginPath();
  ctx.roundRect(toolX - w * 0.08, toolY, w * 0.16, h * 0.08, 2);
  ctx.fill();
  // Tool housing
  ctx.fillStyle = "#555533";
  ctx.beginPath();
  ctx.roundRect(toolX + w * 0.05, toolY - h * 0.02, w * 0.5, h * 0.12, 3);
  ctx.fill();
  // Tool emitter
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.roundRect(toolX + w * 0.45, toolY - h * 0.03, w * 0.15, h * 0.14, 2);
  ctx.fill();
  // Tool emitter glow
  ctx.fillStyle = hitFlash ? "#ffffff" : "#ffdd00";
  ctx.shadowColor = "#ffdd00";
  ctx.shadowBlur = 5;
  ctx.globalAlpha = alpha * (0.4 + dataTick * 0.3);
  ctx.beginPath();
  ctx.arc(toolX + w * 0.6, toolY + h * 0.04, w * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.shadowBlur = 0;

  // ── Backpack reactor ──
  // Visible as a protruding outline behind shoulders
  ctx.fillStyle = "#554422";
  ctx.beginPath();
  ctx.roundRect(screenX - w * 0.55, top - h * 0.05, w * 1.1, h * 0.35, 4);
  ctx.fill();
  // Reactor vents (3 horizontal slits)
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = alpha * 0.35;
  for (let vi = 0; vi < 3; vi++) {
    const vy = top - h * 0.02 + vi * h * 0.08;
    ctx.beginPath();
    ctx.moveTo(screenX - w * 0.35, vy);
    ctx.lineTo(screenX + w * 0.35, vy);
    ctx.stroke();
  }
  ctx.globalAlpha = alpha;
  // Reactor core glow (behind center)
  drawGlow(ctx, screenX, top + h * 0.08, w * 0.4, "#ffd36b", 0.12 + techPulse * 0.05);

  // ── Head (boxy with data visor) ──
  const headW = w * 0.6;
  const headH = w * 0.7;
  const headY = top - headH * 0.75;
  // Helmet base
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.roundRect(screenX - headW, headY, headW * 2, headH, 3);
  ctx.fill();
  // Chin guard
  ctx.fillRect(screenX - headW * 0.7, headY + headH * 0.75, headW * 1.4, headH * 0.2);
  // Visor (gold data band)
  const visorColor = hitFlash ? "#ffffff" : baseColor;
  ctx.fillStyle = visorColor;
  ctx.shadowColor = baseColor;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.roundRect(screenX - headW * 0.85, headY + headH * 0.3, headW * 1.7, headH * 0.22, 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Visor data readout (scrolling ticks inside visor)
  ctx.fillStyle = darkColor;
  ctx.globalAlpha = alpha * 0.4;
  const tickOffset = (time * 0.05) % (headW * 0.3);
  for (let ti = 0; ti < 6; ti++) {
    const tx = screenX - headW * 0.7 + ti * headW * 0.3 + tickOffset;
    if (tx > screenX - headW * 0.8 && tx < screenX + headW * 0.8) {
      const tw = headW * 0.08 + Math.sin(ti * 1.7) * headW * 0.04;
      ctx.fillRect(tx, headY + headH * 0.35, tw, headH * 0.12);
    }
  }
  ctx.globalAlpha = alpha;
  // Visor reflection
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = alpha * 0.2;
  ctx.beginPath();
  ctx.roundRect(screenX - headW * 0.5, headY + headH * 0.32, headW * 0.35, headH * 0.06, 1);
  ctx.fill();
  ctx.globalAlpha = alpha;

  // ── Antenna (right side, taller with fork tip) ──
  ctx.strokeStyle = "#888866";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(screenX + headW * 0.5, headY);
  ctx.lineTo(screenX + headW * 0.7, headY - headH * 0.7);
  ctx.stroke();
  // Fork tip
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(screenX + headW * 0.7, headY - headH * 0.7);
  ctx.lineTo(screenX + headW * 0.6, headY - headH * 0.85);
  ctx.moveTo(screenX + headW * 0.7, headY - headH * 0.7);
  ctx.lineTo(screenX + headW * 0.8, headY - headH * 0.85);
  ctx.stroke();
  // Antenna blink
  if (Math.sin(time * 0.01) > 0) {
    ctx.fillStyle = "#ffdd00";
    ctx.shadowColor = "#ffdd00";
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(screenX + headW * 0.7, headY - headH * 0.7, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ── Holographic projection (floating data near tool arm) ──
  const holoX = toolX + w * 0.3;
  const holoY = toolY - h * 0.2;
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = alpha * (0.15 + dataTick * 0.1);
  // Holo diamond outline
  ctx.beginPath();
  ctx.moveTo(holoX, holoY - w * 0.25);
  ctx.lineTo(holoX + w * 0.2, holoY);
  ctx.lineTo(holoX, holoY + w * 0.25);
  ctx.lineTo(holoX - w * 0.2, holoY);
  ctx.closePath();
  ctx.stroke();
  // Holo inner cross
  ctx.beginPath();
  ctx.moveTo(holoX - w * 0.1, holoY);
  ctx.lineTo(holoX + w * 0.1, holoY);
  ctx.moveTo(holoX, holoY - w * 0.12);
  ctx.lineTo(holoX, holoY + w * 0.12);
  ctx.stroke();
  ctx.globalAlpha = alpha;
}
