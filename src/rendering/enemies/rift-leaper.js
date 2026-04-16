export function renderRiftLeaper(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha, time, enemy, hitFlash) {
  // ── Rift Leaper ──────────────────────────────────────────
  // Athletic melee teleporter — magenta/pink, rift energy, crouched stance
  const w = bodyWidth * 0.65;
  const top = centerY - halfH * 0.35;
  const bot = centerY + halfH * 0.4;
  const torsoH = bot - top;
  const riftPulse = Math.sin(time * 0.006 + enemy.x * 4);
  const crouch = Math.sin(time * 0.008) * halfH * 0.01;

  // ── Rift portal afterimage ──
  ctx.save();
  ctx.globalAlpha = alpha * (0.06 + Math.abs(riftPulse) * 0.06);
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(screenX, centerY, w * 2, 0, Math.PI * 2);
  ctx.fill();
  // Inner rift ring
  ctx.globalAlpha = alpha * 0.08;
  ctx.strokeStyle = "#ff66ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(screenX, centerY, w * 1.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // ── Ghost trail (faded copy offset behind) ──
  ctx.save();
  ctx.globalAlpha = alpha * 0.08;
  ctx.fillStyle = baseColor;
  const ghostOff = 4 + Math.sin(time * 0.005) * 3;
  ctx.beginPath();
  ctx.roundRect(screenX - w + ghostOff, top + ghostOff, w * 2, torsoH, 3);
  ctx.fill();
  ctx.restore();

  // ── Legs (bent, spring-loaded) ──
  ctx.fillStyle = darkColor;
  const legH = halfH * 0.25;
  // Upper leg (angled back)
  ctx.save();
  ctx.translate(screenX - w * 0.35, bot + crouch);
  ctx.rotate(-0.15);
  ctx.fillRect(0, 0, w * 0.22, legH * 0.5);
  ctx.restore();
  ctx.save();
  ctx.translate(screenX + w * 0.15, bot + crouch);
  ctx.rotate(0.15);
  ctx.fillRect(0, 0, w * 0.22, legH * 0.5);
  ctx.restore();
  // Lower leg (angled forward — spring stance)
  ctx.save();
  ctx.translate(screenX - w * 0.4, bot + legH * 0.4 + crouch);
  ctx.rotate(0.25);
  ctx.fillRect(0, 0, w * 0.18, legH * 0.55);
  ctx.restore();
  ctx.save();
  ctx.translate(screenX + w * 0.22, bot + legH * 0.4 + crouch);
  ctx.rotate(-0.25);
  ctx.fillRect(0, 0, w * 0.18, legH * 0.55);
  ctx.restore();
  // Feet (sharp, digitigrade)
  ctx.fillStyle = "#221133";
  ctx.beginPath();
  ctx.moveTo(screenX - w * 0.55, bot + legH * 0.85 + crouch);
  ctx.lineTo(screenX - w * 0.2, bot + legH * 0.85 + crouch);
  ctx.lineTo(screenX - w * 0.35, bot + legH + crouch);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(screenX + w * 0.2, bot + legH * 0.85 + crouch);
  ctx.lineTo(screenX + w * 0.55, bot + legH * 0.85 + crouch);
  ctx.lineTo(screenX + w * 0.35, bot + legH + crouch);
  ctx.fill();

  // ── Body (crouched, lithe) ──
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.roundRect(screenX - w, top + crouch, w * 2, torsoH, 4);
  ctx.fill();

  // Rift energy veins across body
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 1;
  ctx.globalAlpha = alpha * (0.4 + riftPulse * 0.2);
  for (let ri = 0; ri < 4; ri++) {
    const ry = top + torsoH * (0.15 + ri * 0.22) + crouch;
    ctx.beginPath();
    ctx.moveTo(screenX - w * 0.85, ry);
    ctx.quadraticCurveTo(screenX - w * 0.3, ry - 4 + ri * 2, screenX, ry + 1);
    ctx.quadraticCurveTo(screenX + w * 0.3, ry + 3 - ri, screenX + w * 0.85, ry - 1);
    ctx.stroke();
  }
  ctx.globalAlpha = alpha;

  // Center rift core
  ctx.fillStyle = hitFlash ? "#ffffff" : "#ff44ff";
  ctx.shadowColor = "#ff22ff";
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(screenX, top + torsoH * 0.4 + crouch, w * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // ── Arms (spread wide, clawed) ──
  ctx.fillStyle = darkColor;
  // Left arm
  ctx.save();
  ctx.translate(screenX - w, top + torsoH * 0.15 + crouch);
  ctx.rotate(-0.4 + Math.sin(time * 0.005) * 0.05);
  ctx.fillRect(0, 0, w * 0.9, w * 0.18);
  // Claw (3 fingers)
  ctx.fillStyle = "#aa44aa";
  for (let ci = 0; ci < 3; ci++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.85, ci * w * 0.06);
    ctx.lineTo(w * 1.1, ci * w * 0.06 - w * 0.04);
    ctx.lineTo(w * 1.1, ci * w * 0.06 + w * 0.04);
    ctx.fill();
  }
  ctx.restore();
  // Right arm
  ctx.fillStyle = darkColor;
  ctx.save();
  ctx.translate(screenX + w, top + torsoH * 0.15 + crouch);
  ctx.rotate(0.4 - Math.sin(time * 0.005) * 0.05);
  ctx.fillRect(-w * 0.9, 0, w * 0.9, w * 0.18);
  // Claw
  ctx.fillStyle = "#aa44aa";
  for (let ci = 0; ci < 3; ci++) {
    ctx.beginPath();
    ctx.moveTo(-w * 0.85, ci * w * 0.06);
    ctx.lineTo(-w * 1.1, ci * w * 0.06 - w * 0.04);
    ctx.lineTo(-w * 1.1, ci * w * 0.06 + w * 0.04);
    ctx.fill();
  }
  ctx.restore();

  // ── Head ──
  const headR = w * 0.55;
  const headY = top - headR * 0.35 + crouch;
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.arc(screenX, headY + headR * 0.3, headR, 0, Math.PI * 2);
  ctx.fill();
  // Eyes (twin magenta slits)
  const eyeColor = hitFlash ? "#ffffff" : "#ff88ff";
  ctx.fillStyle = eyeColor;
  ctx.shadowColor = "#ff66ff";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.roundRect(screenX - headR * 0.52, headY + headR * 0.1, headR * 0.3, headR * 0.15, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(screenX + headR * 0.22, headY + headR * 0.1, headR * 0.3, headR * 0.15, 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Rift crown (energy wisps above head)
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 1;
  ctx.globalAlpha = alpha * 0.3;
  for (let wi = 0; wi < 3; wi++) {
    const wa = time * 0.004 + wi * Math.PI * 2 / 3;
    const wx = screenX + Math.cos(wa) * headR * 0.6;
    const wy = headY - headR * 0.4 + Math.sin(wa) * headR * 0.15;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx + Math.cos(wa) * headR * 0.3, wy - headR * 0.3);
    ctx.stroke();
  }
  ctx.globalAlpha = alpha;
}
