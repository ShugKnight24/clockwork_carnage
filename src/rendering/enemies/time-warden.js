export function renderTimeWarden(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha, time, enemy, hitFlash) {
  // ── Time Warden ──────────────────────────────────────────
  // Heavy armored guardian — blue, front energy shield, bulky
  const w = bodyWidth * 1.0;
  const top = centerY - halfH * 0.42;
  const bot = centerY + halfH * 0.46;
  const torsoH = bot - top;
  const shieldPulse = 0.4 + Math.sin(time * 0.004) * 0.2;
  const breathe = Math.sin(time * 0.0025) * halfH * 0.003;

  // ── Front energy shield ──
  if (!hitFlash) {
    // Outer shield arc
    ctx.globalAlpha = alpha * shieldPulse;
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(screenX, centerY, w * 1.6, -0.8, 0.8);
    ctx.stroke();
    // Shield fill
    ctx.fillStyle = baseColor;
    ctx.globalAlpha = alpha * shieldPulse * 0.08;
    ctx.beginPath();
    ctx.arc(screenX, centerY, w * 1.5, -0.7, 0.7);
    ctx.fill();
    // Inner shield line
    ctx.globalAlpha = alpha * shieldPulse * 0.5;
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(screenX, centerY, w * 1.3, -0.6, 0.6);
    ctx.stroke();
    // Shield hex pattern
    ctx.globalAlpha = alpha * shieldPulse * 0.15;
    for (let hi = 0; hi < 5; hi++) {
      const ha = -0.6 + hi * 0.3;
      const hx = screenX + Math.sin(ha) * w * 1.4;
      const hy = centerY + Math.cos(ha) * w * 0.3;
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(hx, hy, w * 0.15, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = alpha;
  }

  // ── Legs ──
  const legH = halfH * 0.28;
  ctx.fillStyle = darkColor;
  ctx.fillRect(screenX - w * 0.55, bot + breathe, w * 0.4, legH);
  ctx.fillRect(screenX + w * 0.15, bot + breathe, w * 0.4, legH);
  // Knee armor
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.roundRect(screenX - w * 0.58, bot + legH * 0.12 + breathe, w * 0.35, legH * 0.3, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(screenX + w * 0.23, bot + legH * 0.12 + breathe, w * 0.35, legH * 0.3, 3);
  ctx.fill();
  // Boot plating
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.roundRect(screenX - w * 0.6, bot + legH * 0.65 + breathe, w * 0.45, legH * 0.4, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(screenX + w * 0.15, bot + legH * 0.65 + breathe, w * 0.45, legH * 0.4, 3);
  ctx.fill();

  // ── Heavy body ──
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.roundRect(screenX - w, top + breathe, w * 2, torsoH, 5);
  ctx.fill();
  // Armor plates
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.roundRect(screenX - w * 0.85, top + torsoH * 0.06 + breathe, w * 1.7, torsoH * 0.48, 4);
  ctx.fill();
  // Plate seams
  ctx.strokeStyle = darkColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(screenX, top + torsoH * 0.08 + breathe);
  ctx.lineTo(screenX, top + torsoH * 0.52 + breathe);
  ctx.stroke();

  // ── Center power core ──
  const coreR = w * 0.25;
  const coreY = top + torsoH * 0.35 + breathe;
  // Core housing
  ctx.fillStyle = "#1a2244";
  ctx.beginPath();
  ctx.arc(screenX, coreY, coreR * 1.4, 0, Math.PI * 2);
  ctx.fill();
  // Core glow
  const coreColor = hitFlash ? "#ffffff" : "#88ccff";
  ctx.fillStyle = coreColor;
  ctx.shadowColor = "#4488ff";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(screenX, coreY, coreR, 0, Math.PI * 2);
  ctx.fill();
  // Core inner ring
  ctx.fillStyle = "#aaddff";
  ctx.beginPath();
  ctx.arc(screenX, coreY, coreR * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Core energy lines radiating out
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 1;
  ctx.globalAlpha = alpha * 0.3;
  for (let ci = 0; ci < 4; ci++) {
    const ca = time * 0.003 + ci * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(screenX + Math.cos(ca) * coreR * 0.6, coreY + Math.sin(ca) * coreR * 0.6);
    ctx.lineTo(screenX + Math.cos(ca) * coreR * 1.3, coreY + Math.sin(ca) * coreR * 1.3);
    ctx.stroke();
  }
  ctx.globalAlpha = alpha;

  // ── Shoulder pauldrons ──
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.roundRect(screenX - w * 1.25, top - torsoH * 0.02 + breathe, w * 0.45, torsoH * 0.28, 4);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(screenX + w * 0.8, top - torsoH * 0.02 + breathe, w * 0.45, torsoH * 0.28, 4);
  ctx.fill();
  // Pauldron edge glow
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 1;
  ctx.globalAlpha = alpha * shieldPulse;
  ctx.beginPath();
  ctx.roundRect(screenX - w * 1.25, top - torsoH * 0.02 + breathe, w * 0.45, torsoH * 0.28, 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(screenX + w * 0.8, top - torsoH * 0.02 + breathe, w * 0.45, torsoH * 0.28, 4);
  ctx.stroke();
  ctx.globalAlpha = alpha;

  // ── Arms (heavy gauntlets) ──
  ctx.fillStyle = darkColor;
  ctx.fillRect(screenX - w * 1.15, top + torsoH * 0.25 + breathe, w * 0.25, torsoH * 0.4);
  ctx.fillRect(screenX + w * 0.9, top + torsoH * 0.25 + breathe, w * 0.25, torsoH * 0.4);
  // Gauntlet armor
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.roundRect(screenX - w * 1.18, top + torsoH * 0.5 + breathe, w * 0.3, torsoH * 0.18, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(screenX + w * 0.88, top + torsoH * 0.5 + breathe, w * 0.3, torsoH * 0.18, 3);
  ctx.fill();

  // ── Head (armored dome) ──
  const headR = w * 0.55;
  const headY = top - headR * 0.35 + breathe;
  // Neck guard
  ctx.fillStyle = darkColor;
  ctx.fillRect(screenX - w * 0.3, top - torsoH * 0.05 + breathe, w * 0.6, torsoH * 0.1);
  // Helmet dome
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.arc(screenX, headY + headR * 0.3, headR, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(screenX - headR, headY + headR * 0.3, headR * 2, headR * 0.4);
  // Visor (blue line)
  const visorColor = hitFlash ? "#ffffff" : "#88bbff";
  ctx.fillStyle = visorColor;
  ctx.shadowColor = "#4488ff";
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.roundRect(screenX - headR * 0.65, headY + headR * 0.25, headR * 1.3, headR * 0.2, 2);
  ctx.fill();
  // Visor reflection
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = alpha * 0.25;
  ctx.beginPath();
  ctx.roundRect(screenX - headR * 0.4, headY + headR * 0.27, headR * 0.3, headR * 0.06, 1);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.shadowBlur = 0;
  // Helmet crest
  ctx.fillStyle = baseColor;
  ctx.globalAlpha = alpha * 0.5;
  ctx.fillRect(screenX - w * 0.03, headY - headR * 0.4, w * 0.06, headR * 0.7);
  ctx.globalAlpha = alpha;
}
