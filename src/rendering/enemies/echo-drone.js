import { drawGlow } from "../draw-utils.js";

export function renderEchoDrone(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha, time, enemy, hitFlash) {
  // ── Echo Drone ──────────────────────────────────────────
  // Small fast swarming recon bot — cyan, twin nacelles, sensor dome,
  // echo-clone trail, weapon emitter underneath
  const r = bodyWidth * 0.55;
  const cy = centerY - halfH * 0.02;
  const hover = Math.sin(time * 0.007 + enemy.y * 3) * halfH * 0.015;
  const rotorSpin = (time * 0.02 + enemy.x * 10) % (Math.PI * 2);
  const pulse = Math.sin(time * 0.005 + enemy.x * 4);

  // ── Echo trail (2 fading afterimages) ──
  for (let ei = 2; ei >= 1; ei--) {
    ctx.globalAlpha = alpha * 0.06 * ei;
    ctx.fillStyle = baseColor;
    const trailOff = ei * 4;
    ctx.beginPath();
    ctx.arc(screenX, cy + hover + trailOff, r * (1 - ei * 0.08), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = alpha;

  // ── Outer glow ──
  drawGlow(ctx, screenX, cy + hover, r * 1.4, baseColor, 0.08);

  // ── Engine nacelles (two pods flanking body) ──
  const nacW = r * 0.35;
  const nacH = r * 0.7;
  const nacOff = r * 0.95;
  for (const side of [-1, 1]) {
    const nx = screenX + side * nacOff;
    const ny = cy + hover;
    // Nacelle housing
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.roundRect(nx - nacW / 2, ny - nacH / 2, nacW, nacH, 3);
    ctx.fill();
    // Nacelle intake grille (3 horizontal lines)
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = alpha * 0.4;
    for (let gi = 0; gi < 3; gi++) {
      const gy = ny - nacH * 0.25 + gi * nacH * 0.25;
      ctx.beginPath();
      ctx.moveTo(nx - nacW * 0.35, gy);
      ctx.lineTo(nx + nacW * 0.35, gy);
      ctx.stroke();
    }
    ctx.globalAlpha = alpha;
    // Thruster glow at bottom of nacelle
    const thrustR = nacW * 0.3;
    const thrustY = ny + nacH / 2 + thrustR * 0.3;
    ctx.fillStyle = hitFlash ? "#ffffff" : "#00ffcc";
    ctx.shadowColor = "#00ffcc";
    ctx.shadowBlur = 6;
    ctx.globalAlpha = alpha * (0.5 + pulse * 0.2);
    ctx.beginPath();
    ctx.arc(nx, thrustY, thrustR, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 0;
  }

  // ── Struts (connecting nacelles to body) ──
  ctx.strokeStyle = "#335555";
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(screenX + side * r * 0.45, cy + hover);
    ctx.lineTo(screenX + side * nacOff, cy + hover);
    ctx.stroke();
  }

  // ── Main body (compact sphere with panel lines) ──
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.arc(screenX, cy + hover, r, 0, Math.PI * 2);
  ctx.fill();
  // Equator panel line
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = alpha * 0.35;
  ctx.beginPath();
  ctx.arc(screenX, cy + hover, r * 0.92, -0.3, Math.PI + 0.3);
  ctx.stroke();
  ctx.globalAlpha = alpha;
  // Inner hull (lighter)
  ctx.fillStyle = baseColor;
  ctx.globalAlpha = alpha * 0.25;
  ctx.beginPath();
  ctx.arc(screenX, cy + hover, r * 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha;

  // ── Sensor dome (top) ──
  const domeR = r * 0.35;
  const domeY = cy + hover - r * 0.65;
  ctx.fillStyle = "#224444";
  ctx.beginPath();
  ctx.arc(screenX, domeY, domeR, Math.PI, 0);
  ctx.fill();
  // Dome glass
  ctx.fillStyle = hitFlash ? "#ffffff" : "#88ffee";
  ctx.globalAlpha = alpha * 0.5;
  ctx.beginPath();
  ctx.arc(screenX, domeY, domeR * 0.7, Math.PI, 0);
  ctx.fill();
  ctx.globalAlpha = alpha;
  // Dome rim
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(screenX, domeY, domeR, Math.PI, 0);
  ctx.stroke();

  // ── Rotors (spinning blades above dome) ──
  ctx.strokeStyle = "rgba(170,255,255,0.45)";
  ctx.lineWidth = 1.5;
  for (let ri = 0; ri < 3; ri++) {
    const ra = rotorSpin + ri * (Math.PI * 2 / 3);
    const bladeLen = r * 0.55;
    const bladeY = domeY - domeR * 0.3;
    ctx.beginPath();
    ctx.moveTo(screenX, bladeY);
    ctx.lineTo(screenX + Math.cos(ra) * bladeLen, bladeY + Math.sin(ra) * bladeLen * 0.2);
    ctx.stroke();
  }

  // ── Central eye / sensor ──
  const eyeR = r * 0.22;
  const eyeColor = hitFlash ? "#ffffff" : "#00ffdd";
  ctx.fillStyle = eyeColor;
  ctx.shadowColor = eyeColor;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(screenX, cy + hover, eyeR, 0, Math.PI * 2);
  ctx.fill();
  // Pupil
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.arc(screenX, cy + hover, eyeR * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // ── Weapon emitter (underside) ──
  const emitY = cy + hover + r * 0.65;
  ctx.fillStyle = "#335555";
  ctx.beginPath();
  ctx.roundRect(screenX - r * 0.15, emitY, r * 0.3, r * 0.35, 2);
  ctx.fill();
  // Emitter barrel
  ctx.fillStyle = "#446666";
  ctx.fillRect(screenX - r * 0.07, emitY + r * 0.3, r * 0.14, r * 0.18);
  // Emitter charge glow (pulsing)
  ctx.fillStyle = hitFlash ? "#ffffff" : "#00ffcc";
  ctx.shadowColor = "#00ffcc";
  ctx.shadowBlur = 4;
  ctx.globalAlpha = alpha * (0.3 + pulse * 0.25);
  ctx.beginPath();
  ctx.arc(screenX, emitY + r * 0.48, r * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.shadowBlur = 0;

  // ── Antenna stubs (two small antennas at 45° from top) ──
  ctx.strokeStyle = "#557777";
  ctx.lineWidth = 1;
  for (const side of [-1, 1]) {
    const ax = screenX + side * r * 0.35;
    const ay = cy + hover - r * 0.75;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + side * r * 0.15, ay - r * 0.3);
    ctx.stroke();
    // Antenna tip
    const tipBlink = Math.sin(time * 0.009 + side) > 0.4;
    ctx.fillStyle = tipBlink ? "#00ffaa" : "#003322";
    ctx.beginPath();
    ctx.arc(ax + side * r * 0.15, ay - r * 0.3, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Status ring (orbiting dot around body) ──
  const orbitAngle = (time * 0.008 + enemy.y * 5) % (Math.PI * 2);
  const orbitR = r * 1.15;
  ctx.fillStyle = baseColor;
  ctx.globalAlpha = alpha * 0.4;
  ctx.beginPath();
  ctx.arc(
    screenX + Math.cos(orbitAngle) * orbitR,
    cy + hover + Math.sin(orbitAngle) * orbitR * 0.3,
    2, 0, Math.PI * 2
  );
  ctx.fill();
  ctx.globalAlpha = alpha;
}
