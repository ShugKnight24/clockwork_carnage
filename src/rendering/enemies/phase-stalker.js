import { drawGlow } from "../draw-utils.js";

export function renderPhaseStalker(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha, time, enemy, hitFlash) {
  // ── Phase Stalker ──────────────────────────────────────────
  // Thin ghostly melee teleporter — teal/green, phasing shimmer,
  // blade arms, digitigrade legs, hooded skull head, phase distortion
  const w = bodyWidth * 0.5;
  const top = centerY - halfH * 0.45;
  const bot = centerY + halfH * 0.48;
  const h = bot - top;
  const phase = Math.sin(time * 0.008 + enemy.x * 7);
  const shimmer = Math.abs(Math.sin(time * 0.012 + enemy.y * 5));
  const flicker = Math.sin(time * 0.015 + enemy.x * 3);

  // ── Phase afterimages (2 offset ghosts) ──
  for (let gi = 2; gi >= 1; gi--) {
    ctx.globalAlpha = alpha * 0.08 * gi;
    ctx.fillStyle = baseColor;
    const off = phase * w * 0.3 * gi;
    ctx.fillRect(screenX - w * 0.6 + off, top + gi * 2, w * 1.2, h);
    // Ghost head
    ctx.beginPath();
    ctx.arc(screenX + off, top - w * 0.15 + gi * 2, w * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = alpha;

  // ── Phase distortion aura ──
  drawGlow(ctx, screenX, centerY, w * 2.5, baseColor, 0.06 + shimmer * 0.04);

  // ── Legs (digitigrade, jointed) ──
  const legH = halfH * 0.32;
  const kneeY = bot + legH * 0.4;
  const footY = bot + legH;
  ctx.strokeStyle = darkColor;
  ctx.lineWidth = w * 0.18;
  ctx.lineCap = "round";
  for (const side of [-1, 1]) {
    const hipX = screenX + side * w * 0.3;
    const kneeX = hipX + side * w * 0.15;
    const footX = hipX - side * w * 0.05;
    // Upper leg (hip to knee)
    ctx.beginPath();
    ctx.moveTo(hipX, bot);
    ctx.lineTo(kneeX, kneeY);
    ctx.stroke();
    // Lower leg (knee to foot, reversed angle)
    ctx.beginPath();
    ctx.moveTo(kneeX, kneeY);
    ctx.lineTo(footX, footY);
    ctx.stroke();
    // Knee joint dot
    ctx.fillStyle = baseColor;
    ctx.globalAlpha = alpha * 0.5;
    ctx.beginPath();
    ctx.arc(kneeX, kneeY, w * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;
    // Foot claw (two prongs)
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 1.5;
    for (const prong of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(footX, footY);
      ctx.lineTo(footX + prong * w * 0.15, footY + legH * 0.12);
      ctx.stroke();
    }
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = w * 0.18;
  }
  ctx.lineCap = "butt";

  // ── Torso (thin elongated) ──
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.roundRect(screenX - w, top, w * 2, h, 4);
  ctx.fill();

  // ── Inner body glow (shimmer) ──
  ctx.fillStyle = baseColor;
  ctx.globalAlpha = alpha * (0.3 + shimmer * 0.3);
  ctx.beginPath();
  ctx.roundRect(screenX - w * 0.6, top + h * 0.05, w * 1.2, h * 0.9, 3);
  ctx.fill();
  ctx.globalAlpha = alpha;

  // ── Phasing grid lines (horizontal scan, scrolling) ──
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 0.7;
  ctx.globalAlpha = alpha * 0.25;
  const scanSpacing = h / 7;
  for (let sl = 0; sl < 7; sl++) {
    const rawY = top + sl * scanSpacing + ((time * 0.03) % scanSpacing);
    if (rawY > top && rawY < bot) {
      const wobble = Math.sin(time * 0.01 + sl * 2) * w * 0.1;
      ctx.beginPath();
      ctx.moveTo(screenX - w + wobble, rawY);
      ctx.lineTo(screenX + w - wobble, rawY);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = alpha;

  // ── Rib-like armor segments ──
  ctx.strokeStyle = darkColor;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = alpha * 0.4;
  for (let ri = 0; ri < 4; ri++) {
    const ribY = top + h * (0.2 + ri * 0.18);
    const ribW = w * (0.85 - ri * 0.05);
    ctx.beginPath();
    ctx.arc(screenX, ribY, ribW, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }
  ctx.globalAlpha = alpha;

  // ── Blade arms ──
  const armOriginY = top + h * 0.15;
  const bladeLen = w * 1.8;
  for (const side of [-1, 1]) {
    const armX = screenX + side * w * 1.05;
    // Upper arm
    ctx.fillStyle = darkColor;
    ctx.fillRect(armX - w * 0.1, armOriginY, w * 0.2, h * 0.35);
    // Elbow joint
    ctx.fillStyle = baseColor;
    ctx.globalAlpha = alpha * 0.6;
    ctx.beginPath();
    ctx.arc(armX, armOriginY + h * 0.35, w * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;
    // Blade (curved scythe)
    const bladeAngle = side * 0.2 + flicker * 0.05;
    ctx.save();
    ctx.translate(armX, armOriginY + h * 0.35);
    ctx.rotate(bladeAngle);
    ctx.fillStyle = baseColor;
    ctx.globalAlpha = alpha * 0.7;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(side * w * 0.1, bladeLen * 0.6);
    ctx.lineTo(0, bladeLen);
    ctx.lineTo(-side * w * 0.05, bladeLen * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = alpha;
    // Blade edge glow
    ctx.strokeStyle = hitFlash ? "#ffffff" : "#00ffcc";
    ctx.shadowColor = "#00ffcc";
    ctx.shadowBlur = 4;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(side * w * 0.1, bladeLen * 0.6);
    ctx.lineTo(0, bladeLen);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Head (hooded skull) ──
  const headR = w * 0.65;
  const headY = top - headR * 0.4;
  // Hood (pointed cowl)
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.moveTo(screenX, headY - headR * 0.9);
  ctx.lineTo(screenX - headR * 1.1, headY + headR * 0.6);
  ctx.lineTo(screenX + headR * 1.1, headY + headR * 0.6);
  ctx.closePath();
  ctx.fill();
  // Face area (dark void)
  ctx.fillStyle = "#001108";
  ctx.beginPath();
  ctx.arc(screenX, headY + headR * 0.15, headR * 0.6, 0, Math.PI * 2);
  ctx.fill();
  // Eyes (twin teal slits)
  const eyeColor = hitFlash ? "#ffffff" : "#00ffcc";
  ctx.fillStyle = eyeColor;
  ctx.shadowColor = eyeColor;
  ctx.shadowBlur = 10;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.roundRect(
      screenX + side * headR * 0.1 - headR * 0.15,
      headY + headR * 0.05,
      headR * 0.3, headR * 0.12, 2
    );
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // ── Phase wisps (floating energy particles) ──
  ctx.fillStyle = baseColor;
  for (let wi = 0; wi < 5; wi++) {
    const wAngle = (time * 0.004 + wi * 1.3 + enemy.y * 2) % (Math.PI * 2);
    const wDist = w * (1.5 + Math.sin(time * 0.006 + wi) * 0.4);
    const wX = screenX + Math.cos(wAngle) * wDist;
    const wY = centerY + Math.sin(wAngle) * wDist * 0.5;
    ctx.globalAlpha = alpha * (0.15 + 0.1 * Math.sin(time * 0.01 + wi * 2));
    ctx.beginPath();
    ctx.arc(wX, wY, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = alpha;
}
