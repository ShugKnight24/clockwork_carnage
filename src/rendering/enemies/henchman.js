export function renderHenchman(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha, time, enemy, hitFlash) {
  // ── Voss's Henchman ──────────────────────────────────────────
  // Armored humanoid trooper — orange/brown, tactical gear, visor
  const w2 = bodyWidth * 0.7;
  const top = centerY - halfH * 0.38;
  const bot = centerY + halfH * 0.42;
  const torsoH = bot - top;
  const walk = Math.sin(time * 0.006 + enemy.x * 5) * halfH * 0.015;
  const breathe = Math.sin(time * 0.003) * halfH * 0.004;

  // ── Legs ──
  const legH = halfH * 0.28;
  const legW = w2 * 0.3;
  const leftLegX = screenX - w2 * 0.45;
  const rightLegX = screenX + w2 * 0.15;
  // Boots (dark treaded)
  ctx.fillStyle = "#2a1a0a";
  ctx.beginPath();
  ctx.roundRect(leftLegX - 2, bot + legH * 0.6, legW + 4, legH * 0.4 + 2, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(rightLegX - 2, bot + legH * 0.6, legW + 4, legH * 0.4 + 2, 2);
  ctx.fill();
  // Boot soles
  ctx.fillStyle = "#1a0a00";
  ctx.fillRect(leftLegX - 2, bot + legH - 2, legW + 4, 3);
  ctx.fillRect(rightLegX - 2, bot + legH - 2, legW + 4, 3);
  // Upper legs
  ctx.fillStyle = "#332200";
  ctx.fillRect(leftLegX, bot, legW, legH * 0.65);
  ctx.fillRect(rightLegX, bot, legW, legH * 0.65);
  // Knee armor pads
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.roundRect(leftLegX - 1, bot + legH * 0.15, legW + 2, legH * 0.22, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(rightLegX - 1, bot + legH * 0.15, legW + 2, legH * 0.22, 3);
  ctx.fill();

  // ── Torso ──
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.roundRect(screenX - w2, top + walk + breathe, w2 * 2, torsoH, 4);
  ctx.fill();

  // Rim light (right edge highlight for pseudo-3D depth)
  const rimGrad = ctx.createLinearGradient(screenX + w2 * 0.5, 0, screenX + w2, 0);
  rimGrad.addColorStop(0, 'transparent');
  rimGrad.addColorStop(1, `rgba(255,200,150,${hitFlash ? 0.5 : 0.18})`);
  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.roundRect(screenX - w2, top + walk + breathe, w2 * 2, torsoH, 4);
  ctx.fill();

  // Shadow gradient (left edge for depth)
  const shdGrad = ctx.createLinearGradient(screenX - w2, 0, screenX - w2 * 0.3, 0);
  shdGrad.addColorStop(0, 'rgba(0,0,0,0.25)');
  shdGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = shdGrad;
  ctx.beginPath();
  ctx.roundRect(screenX - w2, top + walk + breathe, w2 * 2, torsoH, 4);
  ctx.fill();

  // Chest plate (lighter center)
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.roundRect(screenX - w2 * 0.75, top + torsoH * 0.08 + walk + breathe, w2 * 1.5, torsoH * 0.52, 3);
  ctx.fill();

  // Tactical vest pouches
  ctx.fillStyle = "#3a2810";
  const pouchY = top + torsoH * 0.35 + walk + breathe;
  for (let pi = 0; pi < 3; pi++) {
    const px = screenX - w2 * 0.55 + pi * w2 * 0.45;
    ctx.beginPath();
    ctx.roundRect(px, pouchY, w2 * 0.3, torsoH * 0.14, 2);
    ctx.fill();
  }
  // Pouch flap lines
  ctx.strokeStyle = "#2a1a08";
  ctx.lineWidth = 0.5;
  for (let pi = 0; pi < 3; pi++) {
    const px = screenX - w2 * 0.55 + pi * w2 * 0.45;
    ctx.beginPath();
    ctx.moveTo(px, pouchY + torsoH * 0.04);
    ctx.lineTo(px + w2 * 0.3, pouchY + torsoH * 0.04);
    ctx.stroke();
  }

  // Center seam
  ctx.strokeStyle = darkColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(screenX, top + torsoH * 0.1 + walk + breathe);
  ctx.lineTo(screenX, bot - torsoH * 0.05 + walk + breathe);
  ctx.stroke();

  // Belt
  ctx.fillStyle = "#443311";
  ctx.beginPath();
  ctx.roundRect(screenX - w2 * 0.85, bot - torsoH * 0.13 + walk + breathe, w2 * 1.7, torsoH * 0.1, 2);
  ctx.fill();
  // Belt buckle
  ctx.fillStyle = "#887744";
  ctx.beginPath();
  ctx.roundRect(screenX - w2 * 0.1, bot - torsoH * 0.13 + walk + breathe, w2 * 0.2, torsoH * 0.1, 1);
  ctx.fill();

  // ── Shoulder pads ──
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.roundRect(screenX - w2 * 1.15, top + walk + breathe, w2 * 0.42, torsoH * 0.24, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(screenX + w2 * 0.73, top + walk + breathe, w2 * 0.42, torsoH * 0.24, 3);
  ctx.fill();
  // Shoulder rivets
  ctx.fillStyle = "#887744";
  const rivetR = w2 * 0.04;
  ctx.beginPath();
  ctx.arc(screenX - w2 * 0.94, top + torsoH * 0.05 + walk + breathe, rivetR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(screenX + w2 * 0.94, top + torsoH * 0.05 + walk + breathe, rivetR, 0, Math.PI * 2);
  ctx.fill();

  // ── Arms ──
  ctx.fillStyle = darkColor;
  // Left arm
  ctx.fillRect(screenX - w2 * 1.1, top + torsoH * 0.22 + walk + breathe, w2 * 0.22, torsoH * 0.45);
  // Right arm (angled with weapon)
  ctx.save();
  ctx.translate(screenX + w2 * 0.9, top + torsoH * 0.22 + walk + breathe);
  ctx.rotate(0.1);
  ctx.fillRect(0, 0, w2 * 0.22, torsoH * 0.45);
  ctx.restore();
  // Hands
  ctx.fillStyle = "#2a1a0a";
  ctx.beginPath();
  ctx.arc(screenX - w2 * 1.0, top + torsoH * 0.68 + walk + breathe, w2 * 0.12, 0, Math.PI * 2);
  ctx.fill();

  // ── Helmet ──
  const headR = w2 * 0.58;
  const headY = top - headR * 0.5 + walk + breathe;
  // Base helmet shape
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.arc(screenX, headY, headR, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(screenX - headR, headY, headR * 2, headR * 0.7);
  // Chin guard
  ctx.beginPath();
  ctx.roundRect(screenX - headR * 0.7, headY + headR * 0.5, headR * 1.4, headR * 0.25, 2);
  ctx.fill();
  // Visor (orange glow slit) — layered fills instead of shadowBlur for perf
  const visorColor = hitFlash ? "#ffffff" : baseColor;
  // Outer glow layer
  ctx.fillStyle = visorColor;
  ctx.globalAlpha = alpha * 0.2;
  ctx.beginPath();
  ctx.roundRect(screenX - headR * 0.82, headY + headR * 0.14, headR * 1.64, headR * 0.34, 4);
  ctx.fill();
  ctx.globalAlpha = alpha * 0.4;
  ctx.beginPath();
  ctx.roundRect(screenX - headR * 0.77, headY + headR * 0.17, headR * 1.54, headR * 0.28, 3);
  ctx.fill();
  // Core visor
  ctx.globalAlpha = alpha;
  ctx.fillStyle = visorColor;
  ctx.beginPath();
  ctx.roundRect(screenX - headR * 0.72, headY + headR * 0.2, headR * 1.44, headR * 0.22, 2);
  ctx.fill();
  // Visor reflection
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = alpha * 0.3;
  ctx.beginPath();
  ctx.roundRect(screenX - headR * 0.5, headY + headR * 0.22, headR * 0.4, headR * 0.06, 1);
  ctx.fill();
  ctx.globalAlpha = alpha;
  // Helmet ridge
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = alpha * 0.4;
  ctx.beginPath();
  ctx.arc(screenX, headY, headR * 0.95, Math.PI + 0.5, -0.5);
  ctx.stroke();
  ctx.globalAlpha = alpha;
  // Antenna nub
  ctx.fillStyle = "#555555";
  ctx.fillRect(screenX + headR * 0.5, headY - headR * 0.6, w2 * 0.06, headR * 0.5);
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(screenX + headR * 0.5 + w2 * 0.03, headY - headR * 0.6, w2 * 0.04, 0, Math.PI * 2);
  ctx.fill();

  // ── Weapon (angled rifle) ──
  const wpnX = screenX + w2 * 0.65;
  const wpnY = top + torsoH * 0.3 + walk + breathe;
  ctx.fillStyle = "#444444";
  ctx.save();
  ctx.translate(wpnX, wpnY);
  ctx.rotate(0.15);
  // Stock
  ctx.fillRect(-w2 * 0.1, 0, w2 * 0.15, w2 * 0.08);
  // Barrel
  ctx.fillRect(w2 * 0.05, -w2 * 0.02, w2 * 0.7, w2 * 0.06);
  // Muzzle
  ctx.fillStyle = "#333333";
  ctx.fillRect(w2 * 0.7, -w2 * 0.03, w2 * 0.12, w2 * 0.08);
  // Scope
  ctx.fillStyle = "#555555";
  ctx.beginPath();
  ctx.roundRect(w2 * 0.2, -w2 * 0.08, w2 * 0.2, w2 * 0.05, 1);
  ctx.fill();
  // Scope lens glint
  ctx.fillStyle = hitFlash ? "#ffffff" : "#88ccff";
  ctx.globalAlpha = alpha * (0.4 + 0.2 * Math.sin(time * 0.005));
  ctx.beginPath();
  ctx.arc(w2 * 0.4, -w2 * 0.055, w2 * 0.02, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.restore();

  // ── Shoulder comm device (left) ──
  ctx.fillStyle = "#444444";
  ctx.beginPath();
  ctx.roundRect(screenX - w2 * 1.2, top - torsoH * 0.02 + walk + breathe, w2 * 0.18, torsoH * 0.12, 2);
  ctx.fill();
  // Comm LED
  const ledBlink = Math.sin(time * 0.008) > 0.3;
  ctx.fillStyle = ledBlink ? "#00ff44" : "#004400";
  ctx.beginPath();
  ctx.arc(screenX - w2 * 1.11, top + torsoH * 0.02 + walk + breathe, w2 * 0.03, 0, Math.PI * 2);
  ctx.fill();
}
