// ── Boss Form Dispatcher ──
// Each form's size, about its feet: the Shell towers, the Final Form is
// smaller than you. A cracked Shell shrinks to what was inside (_spriteScale).
const FORM_SIZE = { 1: 1.3, 2: 1.1, 3: 0.9 };

export function renderBoss(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha, time, enemy, hitFlash) {
  const form = enemy.def.form || 1;
  const renderers = { 1: renderBehemoth, 2: renderVolcanicTitan, 3: renderRemainder };
  const size = (FORM_SIZE[form] ?? 1) * (enemy._spriteScale ?? 1);
  const feet = centerY + halfH;
  ctx.save();
  ctx.translate(screenX, feet);
  ctx.scale(size, size);
  ctx.translate(-screenX, -feet);
  (renderers[form] || renderBehemoth)(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, alpha, time, enemy, hitFlash);
  if (form === 1 && enemy._shellCracked) renderShellCracks(ctx, screenX, halfH, bodyTop, bodyBottom, bodyWidth, time, enemy);
  ctx.restore();
}

/** The Shell broken open: the core's light through the seams. */
function renderShellCracks(ctx, screenX, halfH, bodyTop, bodyBottom, bodyWidth, time, enemy) {
  const bW = bodyWidth * 1.5;
  const cy = bodyTop + (bodyBottom - bodyTop) * 0.35;
  const seams = [
    [[0, 0], [-0.25, -0.35], [-0.18, -0.6], [-0.4, -0.85]],
    [[0, 0], [0.3, -0.3], [0.22, -0.55], [0.5, -0.8]],
    [[0, 0], [-0.4, 0.15], [-0.7, 0.05], [-1.0, 0.25]],
    [[0, 0], [0.45, 0.2], [0.75, 0.08], [1.05, 0.3]],
    [[0, 0], [-0.08, 0.45], [0.06, 0.8], [-0.05, 1.3]],
  ];
  const shed = Math.min(1, (enemy._crackT ?? 1) / 0.7);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [w, col, a] of [[halfH * 0.06, "rgba(34,230,255,", 0.45], [halfH * 0.018, "rgba(234,255,255,", 0.95]]) {
    ctx.strokeStyle = `${col}${a * (0.65 + 0.35 * Math.sin(time * 0.009)) * shed})`;
    ctx.lineWidth = Math.max(1, w);
    ctx.beginPath();
    for (const seam of seams) {
      seam.forEach(([x, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, screenX + x * bW, cy + y * halfH * 0.5));
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════
// FORM 1 — THE BEHEMOTH
// Industrial juggernaut. Hulking diving-suit titan with massive
// riveted armor, steam vents, drill-clamp hands, brass porthole helmet.
// Design: BioShock Big Daddy meets 40K Dreadnought.
// ════════════════════════════════════════════════════════════════════
function renderBehemoth(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, alpha, time, enemy, hitFlash) {
  const bW = bodyWidth * 1.5;
  const bTop = bodyTop - halfH * 0.2;
  const bBot = bodyBottom + halfH * 0.12;
  const torsoH = bBot - bTop;
  const breathe = Math.sin(time * 0.0015) * halfH * 0.015;
  const pulse = (Math.sin(time * 0.003) + 1) * 0.5;

  const brass = hitFlash ? "#ffffff" : "#b58e3d";
  const darkBrass = hitFlash ? "#ffaaaa" : "#7a5c1d";
  const copper = hitFlash ? "#ffcccc" : "#b87333";
  const steel = "#71797e";
  const glow = "rgba(0, 255, 255, ";

  // ── Industrial smoke aura ──
  ctx.save();
  const auraR = bW * 2.2 + pulse * bW * 0.15;
  const auraGrad = ctx.createRadialGradient(screenX, centerY, bW * 0.3, screenX, centerY, auraR);
  auraGrad.addColorStop(0, `rgba(40, 30, 15, 0.35)`);
  auraGrad.addColorStop(0.6, `rgba(20, 15, 8, 0.15)`);
  auraGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(screenX, centerY, auraR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Backpack / reactor housing ──
  ctx.fillStyle = "#1a1008";
  ctx.beginPath();
  ctx.moveTo(screenX - bW * 1.15, bTop + torsoH * 0.05);
  ctx.quadraticCurveTo(screenX - bW * 1.5, centerY, screenX - bW * 1.1, bBot + halfH * 0.35);
  ctx.lineTo(screenX + bW * 1.1, bBot + halfH * 0.35);
  ctx.quadraticCurveTo(screenX + bW * 1.5, centerY, screenX + bW * 1.15, bTop + torsoH * 0.05);
  ctx.closePath();
  ctx.fill();

  // Exhaust stacks on backpack
  for (const side of [-1, 1]) {
    const sx = screenX + side * bW * 0.7;
    ctx.fillStyle = "#333";
    ctx.fillRect(sx - 4, bTop - halfH * 0.25 + breathe, 8, halfH * 0.25);
    ctx.fillStyle = steel;
    ctx.fillRect(sx - 6, bTop - halfH * 0.27 + breathe, 12, 6);
    // Steam puffs
    const steamAlpha = 0.15 + pulse * 0.1;
    ctx.fillStyle = `rgba(180, 180, 160, ${steamAlpha})`;
    for (let p = 0; p < 3; p++) {
      const py = bTop - halfH * (0.28 + p * 0.06) + breathe + Math.sin(time * 0.004 + p + side) * 3;
      const pr = 4 + p * 3 + Math.sin(time * 0.003 + p) * 2;
      ctx.beginPath();
      ctx.arc(sx + Math.sin(time * 0.002 + p * 2) * 4, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Steam pipes running along shoulders ──
  ctx.strokeStyle = steel;
  ctx.lineWidth = 4;
  for (const side of [-1, 1]) {
    const px = screenX + side * bW * 0.65;
    ctx.beginPath();
    ctx.moveTo(px, bTop + breathe + torsoH * 0.1);
    ctx.quadraticCurveTo(px + side * 15, bTop - halfH * 0.1 + breathe, px + side * 25, bTop - halfH * 0.18 + breathe);
    ctx.stroke();
    // Pipe joint rivets
    ctx.fillStyle = "#555";
    ctx.beginPath();
    ctx.arc(px, bTop + breathe + torsoH * 0.1, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Main body — heavy plated torso ──
  ctx.fillStyle = darkBrass;
  ctx.beginPath();
  ctx.moveTo(screenX - bW * 0.9, bTop + breathe);
  ctx.lineTo(screenX - bW * 1.05, bTop + torsoH * 0.12 + breathe);
  ctx.lineTo(screenX - bW, bBot);
  ctx.lineTo(screenX + bW, bBot);
  ctx.lineTo(screenX + bW * 1.05, bTop + torsoH * 0.12 + breathe);
  ctx.lineTo(screenX + bW * 0.9, bTop + breathe);
  ctx.closePath();
  ctx.fill();

  // Rim light (right edge highlight)
  const rimGrad = ctx.createLinearGradient(screenX + bW * 0.4, 0, screenX + bW, 0);
  rimGrad.addColorStop(0, 'transparent');
  rimGrad.addColorStop(1, `rgba(255,100,80,${hitFlash ? 0.5 : 0.2})`);
  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.moveTo(screenX - bW * 0.9, bTop + breathe);
  ctx.lineTo(screenX - bW * 1.05, bTop + torsoH * 0.12 + breathe);
  ctx.lineTo(screenX - bW, bBot);
  ctx.lineTo(screenX + bW, bBot);
  ctx.lineTo(screenX + bW * 1.05, bTop + torsoH * 0.12 + breathe);
  ctx.lineTo(screenX + bW * 0.9, bTop + breathe);
  ctx.closePath();
  ctx.fill();

  // Shadow gradient (left edge)
  const shdGrad = ctx.createLinearGradient(screenX - bW * 1.05, 0, screenX - bW * 0.3, 0);
  shdGrad.addColorStop(0, 'rgba(0,0,0,0.25)');
  shdGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = shdGrad;
  ctx.beginPath();
  ctx.moveTo(screenX - bW * 0.9, bTop + breathe);
  ctx.lineTo(screenX - bW * 1.05, bTop + torsoH * 0.12 + breathe);
  ctx.lineTo(screenX - bW, bBot);
  ctx.lineTo(screenX + bW, bBot);
  ctx.lineTo(screenX + bW * 1.05, bTop + torsoH * 0.12 + breathe);
  ctx.lineTo(screenX + bW * 0.9, bTop + breathe);
  ctx.closePath();
  ctx.fill();

  // Chest plate overlay — central armor
  ctx.fillStyle = brass;
  ctx.beginPath();
  ctx.moveTo(screenX - bW * 0.65, bTop + torsoH * 0.06 + breathe);
  ctx.lineTo(screenX + bW * 0.65, bTop + torsoH * 0.06 + breathe);
  ctx.lineTo(screenX + bW * 0.6, bBot - torsoH * 0.18);
  ctx.lineTo(screenX - bW * 0.6, bBot - torsoH * 0.18);
  ctx.closePath();
  ctx.fill();

  // Chest plate rivets
  ctx.fillStyle = "#444";
  for (let r = 0; r < 6; r++) {
    const rx = screenX - bW * 0.5 + r * bW * 0.2;
    ctx.beginPath();
    ctx.arc(rx, bTop + torsoH * 0.08 + breathe, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rx, bBot - torsoH * 0.2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Central reactor core / chest porthole ──
  const coreY = bTop + torsoH * 0.38 + breathe;
  const coreR = bW * 0.22;
  // Outer ring
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(screenX, coreY, coreR * 1.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = copper;
  ctx.lineWidth = 4;
  ctx.stroke();
  // Inner glass
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(screenX, coreY, coreR, 0, Math.PI * 2);
  ctx.fill();
  // Cyan core glow
  const coreGlow = ctx.createRadialGradient(screenX, coreY, 0, screenX, coreY, coreR);
  coreGlow.addColorStop(0, glow + "0.9)");
  coreGlow.addColorStop(0.5, glow + (0.3 + pulse * 0.3) + ")");
  coreGlow.addColorStop(1, glow + "0.05)");
  ctx.fillStyle = coreGlow;
  ctx.beginPath();
  ctx.arc(screenX, coreY, coreR, 0, Math.PI * 2);
  ctx.fill();
  // Grill bars over core
  ctx.strokeStyle = steel;
  ctx.lineWidth = 3;
  for (let g = 0; g < 5; g++) {
    const gx = screenX - coreR * 0.8 + (g / 4) * coreR * 1.6;
    ctx.beginPath();
    ctx.moveTo(gx, coreY - coreR * 0.85);
    ctx.lineTo(gx, coreY + coreR * 0.85);
    ctx.stroke();
  }
  // Core bolts
  ctx.fillStyle = "#666";
  for (let b = 0; b < 8; b++) {
    const ba = (b / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(screenX + Math.cos(ba) * coreR * 1.05, coreY + Math.sin(ba) * coreR * 1.05, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Massive pauldrons ──
  for (const side of [-1, 1]) {
    const px = screenX + side * bW * 0.95;
    const py = bTop + breathe - torsoH * 0.02;
    const pW = bW * 0.55;
    const pH = torsoH * 0.25;
    // Pauldron body
    ctx.fillStyle = brass;
    ctx.beginPath();
    ctx.ellipse(px, py, pW, pH, side * 0.15, 0, Math.PI * 2);
    ctx.fill();
    // Pauldron edge
    ctx.strokeStyle = darkBrass;
    ctx.lineWidth = 3;
    ctx.stroke();
    // Pauldron spikes
    ctx.fillStyle = copper;
    for (let s = 0; s < 3; s++) {
      const sa = Math.PI * 0.8 + s * 0.4;
      const bx = px + Math.cos(sa) * pW * 0.85 * side;
      const by = py + Math.sin(sa) * pH * 0.8;
      ctx.beginPath();
      ctx.moveTo(bx, by - 3);
      ctx.lineTo(bx + side * 12, by);
      ctx.lineTo(bx, by + 3);
      ctx.fill();
    }
    // Rivets
    ctx.fillStyle = "#555";
    for (let r = 0; r < 4; r++) {
      const ra = Math.PI + r * 0.5 * side;
      ctx.beginPath();
      ctx.arc(px + Math.cos(ra) * pW * 0.65, py + Math.sin(ra) * pH * 0.6, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Diving helmet — massive brass dome ──
  const hW = bW * 0.72;
  const hH = bW * 0.72;
  const hX = screenX;
  const hY = bTop - hH * 0.5 + breathe;

  // Neck joint
  ctx.fillStyle = "#333";
  ctx.fillRect(screenX - bW * 0.25, bTop + breathe - 8, bW * 0.5, 16);
  ctx.fillStyle = steel;
  ctx.fillRect(screenX - bW * 0.28, bTop + breathe - 3, bW * 0.56, 6);

  // Helmet dome
  ctx.fillStyle = brass;
  ctx.beginPath();
  ctx.arc(hX, hY, hW * 0.55, 0, Math.PI * 2);
  ctx.fill();
  // Helmet seam lines
  ctx.strokeStyle = darkBrass;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hX, hY - hW * 0.55);
  ctx.lineTo(hX, hY + hW * 0.55);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hX - hW * 0.55, hY);
  ctx.lineTo(hX + hW * 0.55, hY);
  ctx.stroke();
  // Helmet border ring
  ctx.strokeStyle = copper;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(hX, hY, hW * 0.55, 0, Math.PI * 2);
  ctx.stroke();

  // ── Main porthole (single large eye) ──
  const phR = hW * 0.2;
  // Porthole frame
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(hX, hY + hH * 0.02, phR * 1.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = copper;
  ctx.lineWidth = 4;
  ctx.stroke();
  // Porthole glass
  ctx.fillStyle = "#0a1a1a";
  ctx.beginPath();
  ctx.arc(hX, hY + hH * 0.02, phR, 0, Math.PI * 2);
  ctx.fill();
  // Eye glow
  const eyeGlow = ctx.createRadialGradient(hX, hY + hH * 0.02, 0, hX, hY + hH * 0.02, phR);
  eyeGlow.addColorStop(0, glow + (0.6 + pulse * 0.4) + ")");
  eyeGlow.addColorStop(0.6, glow + "0.2)");
  eyeGlow.addColorStop(1, glow + "0.0)");
  ctx.fillStyle = eyeGlow;
  ctx.beginPath();
  ctx.arc(hX, hY + hH * 0.02, phR, 0, Math.PI * 2);
  ctx.fill();
  // Porthole bolts
  ctx.fillStyle = "#666";
  for (let b = 0; b < 6; b++) {
    const ba = (b / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(hX + Math.cos(ba) * phR * 1.25, hY + hH * 0.02 + Math.sin(ba) * phR * 1.25, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Side portholes (smaller)
  for (const side of [-1, 1]) {
    const spX = hX + side * hW * 0.35;
    const spY = hY - hH * 0.08;
    const spR = phR * 0.45;
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(spX, spY, spR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = copper;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = glow + (0.2 + pulse * 0.15) + ")";
    ctx.beginPath();
    ctx.arc(spX, spY, spR * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Chin guard / jaw plate
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.moveTo(hX - hW * 0.3, hY + hH * 0.32);
  ctx.lineTo(hX + hW * 0.3, hY + hH * 0.32);
  ctx.lineTo(hX + hW * 0.15, hY + hH * 0.52);
  ctx.lineTo(hX - hW * 0.15, hY + hH * 0.52);
  ctx.closePath();
  ctx.fill();
  // Chin vent slits
  ctx.fillStyle = "#222";
  for (let v = 0; v < 4; v++) {
    ctx.fillRect(hX - hW * 0.2 + v * hW * 0.12, hY + hH * 0.36, hW * 0.08, 3);
  }

  // ── Arms — massive with drill/clamp hands ──
  for (const side of [-1, 1]) {
    const shX = screenX + side * bW * 0.9;
    const shY = bTop + torsoH * 0.1 + breathe;
    const elbX = screenX + side * bW * 1.25;
    const elbY = centerY + halfH * 0.08;
    const handX = screenX + side * bW * 1.0;
    const handY = bBot + halfH * 0.18;
    // Upper arm
    ctx.strokeStyle = darkBrass;
    ctx.lineWidth = bW * 0.28;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(shX, shY);
    ctx.quadraticCurveTo(elbX, elbY, handX, handY);
    ctx.stroke();
    // Armor plates on arm
    ctx.strokeStyle = brass;
    ctx.lineWidth = bW * 0.18;
    ctx.beginPath();
    ctx.moveTo(shX, shY + torsoH * 0.04);
    ctx.lineTo(elbX * 0.65 + shX * 0.35, (shY + elbY) * 0.5);
    ctx.stroke();
    // Elbow joint
    ctx.fillStyle = copper;
    ctx.beginPath();
    ctx.arc(elbX * 0.8 + shX * 0.2, (shY + elbY) * 0.5, bW * 0.09, 0, Math.PI * 2);
    ctx.fill();
    // Forearm armor
    ctx.strokeStyle = brass;
    ctx.lineWidth = bW * 0.16;
    ctx.beginPath();
    ctx.moveTo(elbX * 0.8 + shX * 0.2, (shY + elbY) * 0.5);
    ctx.lineTo(handX, handY);
    ctx.stroke();

    // Hand — drill on right, clamp on left
    if (side > 0) {
      // Drill hand
      ctx.fillStyle = steel;
      ctx.beginPath();
      ctx.arc(handX, handY, bW * 0.12, 0, Math.PI * 2);
      ctx.fill();
      // Drill bit
      const drillLen = bW * 0.35;
      ctx.fillStyle = "#aaa";
      ctx.beginPath();
      ctx.moveTo(handX, handY - bW * 0.06);
      ctx.lineTo(handX + side * drillLen, handY);
      ctx.lineTo(handX, handY + bW * 0.06);
      ctx.closePath();
      ctx.fill();
      // Drill spiral grooves
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 1.5;
      for (let d = 0; d < 5; d++) {
        const dx = handX + side * (d / 5) * drillLen;
        ctx.beginPath();
        ctx.moveTo(dx, handY - bW * 0.05 * (1 - d / 5));
        ctx.lineTo(dx + side * drillLen * 0.08, handY + bW * 0.05 * (1 - d / 5));
        ctx.stroke();
      }
      // Spinning effect
      ctx.strokeStyle = `rgba(200, 220, 255, ${0.15 + pulse * 0.1})`;
      ctx.lineWidth = 1;
      const spinAngle = time * 0.01;
      ctx.beginPath();
      ctx.arc(handX + side * drillLen * 0.3, handY, bW * 0.04, spinAngle, spinAngle + Math.PI);
      ctx.stroke();
    } else {
      // Clamp hand
      ctx.fillStyle = steel;
      ctx.beginPath();
      ctx.arc(handX, handY, bW * 0.11, 0, Math.PI * 2);
      ctx.fill();
      // Clamp jaws
      const jawGap = 4 + Math.sin(time * 0.004) * 6;
      ctx.fillStyle = "#999";
      ctx.beginPath();
      ctx.moveTo(handX, handY - jawGap);
      ctx.lineTo(handX + side * bW * 0.28, handY - bW * 0.08);
      ctx.lineTo(handX + side * bW * 0.28, handY - jawGap + 4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(handX, handY + jawGap);
      ctx.lineTo(handX + side * bW * 0.28, handY + bW * 0.08);
      ctx.lineTo(handX + side * bW * 0.28, handY + jawGap - 4);
      ctx.closePath();
      ctx.fill();
      // Hydraulic pistons on clamp
      ctx.strokeStyle = "#777";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(handX - 3, handY - 2);
      ctx.lineTo(handX + side * bW * 0.2, handY - jawGap * 0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(handX - 3, handY + 2);
      ctx.lineTo(handX + side * bW * 0.2, handY + jawGap * 0.8);
      ctx.stroke();
    }
  }

  // ── Belt / midsection plating ──
  ctx.fillStyle = hitFlash ? "#666" : "#331118";
  ctx.fillRect(screenX - bW * 0.9, bBot - torsoH * 0.13, bW * 1.8, torsoH * 0.09);
  // Belt buckle — glowing
  ctx.fillStyle = copper;
  ctx.beginPath();
  ctx.arc(screenX, bBot - torsoH * 0.085, bW * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = glow + (0.4 + pulse * 0.3) + ")";
  ctx.beginPath();
  ctx.arc(screenX, bBot - torsoH * 0.085, bW * 0.05, 0, Math.PI * 2);
  ctx.fill();

  // ── Legs — thick armored pistons ──
  for (const side of [-1, 1]) {
    const hipX = screenX + side * bW * 0.38;
    const hipY = bBot - torsoH * 0.04;
    const kneeX = hipX + side * bW * 0.08;
    const kneeY = bBot + halfH * 0.22;
    const footX = hipX;
    const footY = bBot + halfH * 0.48;
    const legW = bW * 0.28;
    // Upper leg
    ctx.fillStyle = darkBrass;
    ctx.beginPath();
    ctx.moveTo(hipX - legW, hipY);
    ctx.lineTo(kneeX - legW * 0.85, kneeY);
    ctx.lineTo(kneeX + legW * 0.85, kneeY);
    ctx.lineTo(hipX + legW, hipY);
    ctx.fill();
    // Piston detail on thigh
    ctx.strokeStyle = steel;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hipX + side * legW * 0.3, hipY + 5);
    ctx.lineTo(kneeX + side * legW * 0.3, kneeY - 5);
    ctx.stroke();
    // Knee plate
    ctx.fillStyle = brass;
    ctx.beginPath();
    ctx.arc(kneeX, kneeY, legW * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = copper;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Shin guard
    ctx.fillStyle = darkBrass;
    ctx.beginPath();
    ctx.moveTo(kneeX - legW * 0.8, kneeY);
    ctx.lineTo(footX - legW * 1.0, footY);
    ctx.lineTo(footX + legW * 1.0, footY);
    ctx.lineTo(kneeX + legW * 0.8, kneeY);
    ctx.fill();
    // Shin armor plate
    ctx.fillStyle = brass;
    ctx.fillRect(kneeX - legW * 0.45, kneeY + legW * 0.3, legW * 0.9, (footY - kneeY) * 0.55);
    // Boot
    ctx.fillStyle = hitFlash ? "#552222" : "#0a0004";
    ctx.beginPath();
    ctx.moveTo(footX - legW * 1.2, footY);
    ctx.lineTo(footX + side * legW * 0.6, footY + halfH * 0.07);
    ctx.lineTo(footX + legW * 1.2, footY);
    ctx.fill();
  }

  // ── Temporal energy crackle ──
  ctx.strokeStyle = `rgba(0, 255, 255, ${0.12 + pulse * 0.15})`;
  ctx.lineWidth = 1.5;
  for (let e = 0; e < 5; e++) {
    const eAng = time * 0.0015 + e * Math.PI * 0.4;
    const eR = bW * 0.8 + Math.sin(time * 0.004 + e) * bW * 0.25;
    const ex1 = screenX + Math.cos(eAng) * eR * 0.4;
    const ey1 = centerY + Math.sin(eAng) * eR * 0.35;
    const ex2 = screenX + Math.cos(eAng + 0.6) * eR;
    const ey2 = centerY + Math.sin(eAng + 0.6) * eR * 0.7;
    ctx.beginPath();
    ctx.moveTo(ex1, ey1);
    ctx.lineTo((ex1 + ex2) * 0.5 + Math.sin(time * 0.008 + e) * 8, (ey1 + ey2) * 0.5);
    ctx.lineTo(ex2, ey2);
    ctx.stroke();
  }

  // ── Floating debris / shards ──
  for (let s = 0; s < 6; s++) {
    const sAng = time * 0.001 + s * Math.PI * 0.35;
    const sR = bW * 1.3 + Math.sin(time * 0.003 + s * 2) * bW * 0.15;
    const sx = screenX + Math.cos(sAng) * sR;
    const sy = centerY + Math.sin(sAng) * sR * 0.5;
    const sSize = 2 + Math.sin(s * 3) * 1.5;
    ctx.fillStyle = `rgba(0, 220, 220, ${0.12 + Math.sin(time * 0.004 + s) * 0.08})`;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(time * 0.002 + s);
    ctx.fillRect(-sSize, -sSize * 0.5, sSize * 2, sSize);
    ctx.restore();
  }
}


// ════════════════════════════════════════════════════════════════════
// FORM 2 — THE VOLCANIC TITAN
// Raw power incarnate. Armor cracking apart under impossible muscle.
// Exposed pulsing sinew, ember veins glowing through fractures,
// volcanic heat shimmer, molten core. The machine can't contain him.
// ════════════════════════════════════════════════════════════════════
function renderVolcanicTitan(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, alpha, time, enemy, hitFlash) {
  const bW = bodyWidth * 1.65;
  const bTop = bodyTop - halfH * 0.25;
  const bBot = bodyBottom + halfH * 0.15;
  const torsoH = bBot - bTop;
  const breathe = Math.sin(time * 0.002) * halfH * 0.02;
  const pulse = (Math.sin(time * 0.004) + 1) * 0.5;
  const heavePulse = (Math.sin(time * 0.0025) + 1) * 0.5; // slow power heave

  const obsidian = hitFlash ? "#ffffff" : "#2a0a0a";
  const darkObsidian = hitFlash ? "#ffaaaa" : "#1a0505";
  const ember = hitFlash ? "#ffcccc" : "#e04800";
  const molten = hitFlash ? "#ffffaa" : "#ff6600";
  const cracks = "rgba(255, 100, 0, ";

  // ── Heat shimmer aura ──
  ctx.save();
  const auraR = bW * 2.5 + pulse * bW * 0.2;
  const auraGrad = ctx.createRadialGradient(screenX, centerY, bW * 0.3, screenX, centerY, auraR);
  auraGrad.addColorStop(0, `rgba(80, 20, 0, 0.4)`);
  auraGrad.addColorStop(0.4, `rgba(40, 8, 0, 0.2)`);
  auraGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(screenX, centerY, auraR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Heat distortion particles rising ──
  for (let h = 0; h < 8; h++) {
    const hx = screenX + Math.sin(h * 1.7 + time * 0.002) * bW * 0.8;
    const hy = bTop - halfH * 0.1 - ((time * 0.05 + h * 40) % (halfH * 0.5));
    const hAlpha = 0.08 + Math.sin(h + time * 0.003) * 0.04;
    ctx.fillStyle = `rgba(255, 120, 20, ${hAlpha})`;
    ctx.beginPath();
    ctx.arc(hx, hy + breathe, 3 + Math.sin(h * 2) * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Massive torso — exposed muscle with cracked armor plates ──
  // Base muscle mass — dark red/brown flesh
  ctx.fillStyle = "#3a1515";
  ctx.beginPath();
  ctx.moveTo(screenX - bW * 1.0, bTop + breathe);
  ctx.quadraticCurveTo(screenX - bW * 1.15, bTop + torsoH * 0.3 + breathe, screenX - bW * 1.05, bBot);
  ctx.lineTo(screenX + bW * 1.05, bBot);
  ctx.quadraticCurveTo(screenX + bW * 1.15, bTop + torsoH * 0.3 + breathe, screenX + bW * 1.0, bTop + breathe);
  ctx.closePath();
  ctx.fill();

  // Muscle definition — pectorals
  for (const side of [-1, 1]) {
    const pecGrad = ctx.createRadialGradient(
      screenX + side * bW * 0.3, bTop + torsoH * 0.22 + breathe, bW * 0.05,
      screenX + side * bW * 0.3, bTop + torsoH * 0.22 + breathe, bW * 0.35
    );
    pecGrad.addColorStop(0, "#4a2020");
    pecGrad.addColorStop(1, "#3a1515");
    ctx.fillStyle = pecGrad;
    ctx.beginPath();
    ctx.ellipse(screenX + side * bW * 0.3, bTop + torsoH * 0.22 + breathe, bW * 0.35, torsoH * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Muscle definition — abs (6 pack visible through cracks)
  ctx.fillStyle = "#4a1818";
  for (let row = 0; row < 3; row++) {
    for (const side of [-0.5, 0.5]) {
      const ax = screenX + side * bW * 0.18;
      const ay = bTop + torsoH * (0.42 + row * 0.1) + breathe;
      ctx.beginPath();
      ctx.ellipse(ax, ay, bW * 0.12, torsoH * 0.035, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Cracked armor fragments — still clinging to the body ──
  ctx.fillStyle = obsidian;
  // Left chest plate fragment
  ctx.beginPath();
  ctx.moveTo(screenX - bW * 0.7, bTop + torsoH * 0.05 + breathe);
  ctx.lineTo(screenX - bW * 0.15, bTop + torsoH * 0.08 + breathe);
  ctx.lineTo(screenX - bW * 0.25, bTop + torsoH * 0.32 + breathe);
  ctx.lineTo(screenX - bW * 0.8, bTop + torsoH * 0.28 + breathe);
  ctx.closePath();
  ctx.fill();
  // Right chest fragment — smaller, more broken
  ctx.beginPath();
  ctx.moveTo(screenX + bW * 0.2, bTop + torsoH * 0.1 + breathe);
  ctx.lineTo(screenX + bW * 0.65, bTop + torsoH * 0.06 + breathe);
  ctx.lineTo(screenX + bW * 0.55, bTop + torsoH * 0.25 + breathe);
  ctx.closePath();
  ctx.fill();
  // Lower abdomen plate
  ctx.beginPath();
  ctx.moveTo(screenX - bW * 0.4, bBot - torsoH * 0.22);
  ctx.lineTo(screenX + bW * 0.3, bBot - torsoH * 0.25);
  ctx.lineTo(screenX + bW * 0.35, bBot - torsoH * 0.1);
  ctx.lineTo(screenX - bW * 0.45, bBot - torsoH * 0.08);
  ctx.closePath();
  ctx.fill();

  // ── Ember vein cracks glowing through armor and flesh ──
  ctx.strokeStyle = cracks + (0.5 + pulse * 0.3) + ")";
  ctx.lineWidth = 2;
  // Major crack lines
  const crackPaths = [
    [[screenX - bW * 0.15, bTop + torsoH * 0.08], [screenX - bW * 0.05, bTop + torsoH * 0.2], [screenX + bW * 0.1, bTop + torsoH * 0.35]],
    [[screenX + bW * 0.55, bTop + torsoH * 0.25], [screenX + bW * 0.4, bTop + torsoH * 0.4], [screenX + bW * 0.35, bBot - torsoH * 0.15]],
    [[screenX - bW * 0.6, bTop + torsoH * 0.3], [screenX - bW * 0.5, centerY], [screenX - bW * 0.55, bBot - torsoH * 0.1]],
    [[screenX - bW * 0.1, bBot - torsoH * 0.25], [screenX, bBot - torsoH * 0.15], [screenX + bW * 0.15, bBot - torsoH * 0.08]],
  ];
  for (const path of crackPaths) {
    ctx.beginPath();
    ctx.moveTo(path[0][0], path[0][1] + breathe);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i][0], path[i][1] + breathe);
    ctx.stroke();
    // Glow bloom along cracks
    ctx.strokeStyle = cracks + (0.15 + pulse * 0.1) + ")";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(path[0][0], path[0][1] + breathe);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i][0], path[i][1] + breathe);
    ctx.stroke();
    ctx.strokeStyle = cracks + (0.5 + pulse * 0.3) + ")";
    ctx.lineWidth = 2;
  }

  // ── Molten core — exposed through shattered chest ──
  const mCoreY = bTop + torsoH * 0.35 + breathe;
  const mCoreR = bW * 0.18 + heavePulse * bW * 0.03;
  const mGrad = ctx.createRadialGradient(screenX, mCoreY, 0, screenX, mCoreY, mCoreR * 1.5);
  mGrad.addColorStop(0, `rgba(255, 200, 50, ${0.9})`);
  mGrad.addColorStop(0.3, `rgba(255, 100, 0, ${0.7})`);
  mGrad.addColorStop(0.7, `rgba(200, 40, 0, ${0.4})`);
  mGrad.addColorStop(1, `rgba(100, 10, 0, 0)`);
  ctx.fillStyle = mGrad;
  ctx.beginPath();
  ctx.arc(screenX, mCoreY, mCoreR * 1.5, 0, Math.PI * 2);
  ctx.fill();
  // Core center white-hot
  ctx.fillStyle = `rgba(255, 240, 200, ${0.6 + pulse * 0.3})`;
  ctx.beginPath();
  ctx.arc(screenX, mCoreY, mCoreR * 0.3, 0, Math.PI * 2);
  ctx.fill();

  // ── Massive shoulders / traps — bulging muscle ──
  for (const side of [-1, 1]) {
    // Trapezius bulge
    const trapGrad = ctx.createRadialGradient(
      screenX + side * bW * 0.5, bTop + torsoH * 0.02 + breathe, bW * 0.1,
      screenX + side * bW * 0.5, bTop + torsoH * 0.02 + breathe, bW * 0.5
    );
    trapGrad.addColorStop(0, "#4a2020");
    trapGrad.addColorStop(1, "#3a1515");
    ctx.fillStyle = trapGrad;
    ctx.beginPath();
    ctx.ellipse(screenX + side * bW * 0.55, bTop + torsoH * 0.02 + breathe, bW * 0.45, torsoH * 0.12, side * 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Remaining pauldron fragment
    ctx.fillStyle = obsidian;
    ctx.beginPath();
    ctx.ellipse(screenX + side * bW * 0.85, bTop - torsoH * 0.03 + breathe, bW * 0.22, torsoH * 0.08, side * 0.3, 0, Math.PI);
    ctx.fill();
    // Ember vein on shoulder
    ctx.strokeStyle = cracks + (0.4 + pulse * 0.2) + ")";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(screenX + side * bW * 0.3, bTop + breathe);
    ctx.quadraticCurveTo(screenX + side * bW * 0.6, bTop - torsoH * 0.05 + breathe, screenX + side * bW * 0.85, bTop + breathe);
    ctx.stroke();
  }

  // ── Head — helmet partially destroyed, face visible ──
  const hW = bW * 0.55;
  const hH = bW * 0.55;
  const hX = screenX;
  const hY = bTop - hH * 0.4 + breathe;

  // Neck — thick muscular
  ctx.fillStyle = "#3a1515";
  ctx.fillRect(screenX - bW * 0.2, bTop + breathe - 10, bW * 0.4, 20);
  // Neck veins
  ctx.strokeStyle = cracks + "0.3)";
  ctx.lineWidth = 1.5;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(screenX + side * bW * 0.08, bTop + breathe + 5);
    ctx.quadraticCurveTo(screenX + side * bW * 0.15, bTop + breathe - 5, screenX + side * bW * 0.1, hY + hH * 0.4);
    ctx.stroke();
  }

  // Remaining helmet — cracked on one side
  ctx.fillStyle = obsidian;
  ctx.beginPath();
  ctx.arc(hX, hY, hW * 0.5, -Math.PI * 0.8, Math.PI * 0.3);
  ctx.closePath();
  ctx.fill();

  // Exposed face/skull on other side — glowing ember
  ctx.fillStyle = "#4a1a1a";
  ctx.beginPath();
  ctx.arc(hX + hW * 0.08, hY, hW * 0.42, 0, Math.PI * 2);
  ctx.fill();

  // Eyes — blazing
  for (const side of [-1, 1]) {
    const eyeX = hX + side * hW * 0.15 + hW * 0.05;
    const eyeY = hY - hH * 0.05;
    // Eye socket
    ctx.fillStyle = "#1a0505";
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, hW * 0.1, hW * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    // Blazing eye
    const eyeGlow = ctx.createRadialGradient(eyeX, eyeY, 0, eyeX, eyeY, hW * 0.09);
    eyeGlow.addColorStop(0, `rgba(255, 220, 100, ${0.9 + pulse * 0.1})`);
    eyeGlow.addColorStop(0.5, `rgba(255, 80, 0, ${0.6})`);
    eyeGlow.addColorStop(1, `rgba(200, 30, 0, 0)`);
    ctx.fillStyle = eyeGlow;
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, hW * 0.09, hW * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Broken porthole on remaining helmet piece
  const bpX = hX - hW * 0.18;
  const bpY = hY + hH * 0.02;
  const bpR = hW * 0.12;
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(bpX, bpY, bpR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255, 80, 0, ${0.3 + pulse * 0.2})`;
  ctx.beginPath();
  ctx.arc(bpX, bpY, bpR * 0.7, 0, Math.PI * 2);
  ctx.fill();
  // Crack radiating from broken porthole
  ctx.strokeStyle = cracks + "0.5)";
  ctx.lineWidth = 1.5;
  for (let c = 0; c < 4; c++) {
    const ca = c * Math.PI * 0.4 + 0.3;
    ctx.beginPath();
    ctx.moveTo(bpX + Math.cos(ca) * bpR, bpY + Math.sin(ca) * bpR);
    ctx.lineTo(bpX + Math.cos(ca) * bpR * 2.5, bpY + Math.sin(ca) * bpR * 2.5);
    ctx.stroke();
  }

  // ── Arms — massive exposed muscle ──
  for (const side of [-1, 1]) {
    const shX = screenX + side * bW * 0.95;
    const shY = bTop + torsoH * 0.08 + breathe;
    const elbX = screenX + side * bW * 1.35;
    const elbY = centerY + halfH * 0.1;
    const handX = screenX + side * bW * 1.1;
    const handY = bBot + halfH * 0.2;

    // Upper arm — bulging bicep
    ctx.strokeStyle = "#3a1515";
    ctx.lineWidth = bW * 0.32;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(shX, shY);
    ctx.quadraticCurveTo(elbX, elbY, handX, handY);
    ctx.stroke();
    // Bicep highlight
    const midArmX = (shX + elbX) * 0.5;
    const midArmY = (shY + elbY) * 0.5;
    ctx.fillStyle = "#4a2020";
    ctx.beginPath();
    ctx.ellipse(midArmX + side * bW * 0.05, midArmY, bW * 0.12, torsoH * 0.06, side * 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Remaining gauntlet fragment
    ctx.fillStyle = obsidian;
    ctx.beginPath();
    ctx.ellipse((elbX + handX) * 0.5, (elbY + handY) * 0.5, bW * 0.1, torsoH * 0.06, side * 0.5, 0, Math.PI);
    ctx.fill();
    // Arm veins
    ctx.strokeStyle = cracks + (0.35 + pulse * 0.15) + ")";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(shX + side * 3, shY + 5);
    ctx.quadraticCurveTo(midArmX + side * bW * 0.1, midArmY, elbX, elbY);
    ctx.stroke();
    // Fist — massive
    ctx.fillStyle = "#3a1515";
    ctx.beginPath();
    ctx.arc(handX, handY, bW * 0.14, 0, Math.PI * 2);
    ctx.fill();
    // Knuckle ember glow
    ctx.fillStyle = cracks + (0.3 + pulse * 0.2) + ")";
    ctx.beginPath();
    ctx.arc(handX + side * bW * 0.06, handY - 4, bW * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Legs — tree-trunk muscle ──
  for (const side of [-1, 1]) {
    const hipX = screenX + side * bW * 0.4;
    const hipY = bBot - torsoH * 0.04;
    const kneeX = hipX + side * bW * 0.1;
    const kneeY = bBot + halfH * 0.24;
    const footX = hipX;
    const footY = bBot + halfH * 0.5;
    const legW = bW * 0.3;
    // Upper leg
    ctx.fillStyle = "#3a1515";
    ctx.beginPath();
    ctx.moveTo(hipX - legW * 1.1, hipY);
    ctx.lineTo(kneeX - legW, kneeY);
    ctx.lineTo(kneeX + legW, kneeY);
    ctx.lineTo(hipX + legW * 1.1, hipY);
    ctx.fill();
    // Quad definition
    ctx.fillStyle = "#4a1818";
    ctx.beginPath();
    ctx.ellipse(hipX + side * legW * 0.2, (hipY + kneeY) * 0.5, legW * 0.3, (kneeY - hipY) * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Knee — exposed joint with ember
    ctx.fillStyle = "#2a0a0a";
    ctx.beginPath();
    ctx.arc(kneeX, kneeY, legW * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cracks + (0.25 + pulse * 0.15) + ")";
    ctx.beginPath();
    ctx.arc(kneeX, kneeY, legW * 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Shin
    ctx.fillStyle = "#3a1515";
    ctx.beginPath();
    ctx.moveTo(kneeX - legW * 0.85, kneeY);
    ctx.lineTo(footX - legW * 1.1, footY);
    ctx.lineTo(footX + legW * 1.1, footY);
    ctx.lineTo(kneeX + legW * 0.85, kneeY);
    ctx.fill();
    // Remaining shin armor
    ctx.fillStyle = obsidian;
    ctx.fillRect(kneeX - legW * 0.35, kneeY + legW * 0.4, legW * 0.7, (footY - kneeY) * 0.4);
    // Boot
    ctx.fillStyle = "#1a0505";
    ctx.beginPath();
    ctx.moveTo(footX - legW * 1.3, footY);
    ctx.lineTo(footX + side * legW * 0.7, footY + halfH * 0.07);
    ctx.lineTo(footX + legW * 1.3, footY);
    ctx.fill();
  }

  // ── Ember corona ──
  ctx.strokeStyle = `rgba(255, 100, 0, ${0.2 + pulse * 0.15})`;
  ctx.lineWidth = 2;
  for (let arc = 0; arc < 5; arc++) {
    const arcAng = time * (0.002 + arc * 0.0004) + (arc * Math.PI * 2) / 5;
    const arcR = bW * 1.5 + arc * bW * 0.08;
    ctx.beginPath();
    ctx.arc(screenX, centerY, arcR, arcAng, arcAng + 0.7);
    ctx.stroke();
  }

  // ── Molten drip particles ──
  for (let d = 0; d < 6; d++) {
    const dx = screenX + Math.sin(d * 2.1) * bW * 0.7;
    const dy = bBot + ((time * 0.04 + d * 30) % (halfH * 0.4));
    const dAlpha = 0.3 - (dy - bBot) / (halfH * 0.4) * 0.3;
    if (dAlpha > 0) {
      ctx.fillStyle = `rgba(255, 120, 0, ${dAlpha})`;
      ctx.beginPath();
      ctx.ellipse(dx, dy, 2, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}


// ════════════════════════════════════════════════════════════════════
// FORM 3 — THE REMAINDER
// What is left of him: a thin man of brass struts in a tattered mantle,
// a porcelain clock-face mask, one hand raised with two fingers out, and
// an arch of small clocks behind. The weakest-looking thing in the Core.
// ════════════════════════════════════════════════════════════════════
function renderRemainder(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, alpha, time, enemy, hitFlash) {
  const u = halfH / 100;
  const X = (x) => screenX + x * u;
  const Y = (y) => centerY + y * u;
  const pulse = (Math.sin(time * 0.004) + 1) * 0.5;
  const sway = Math.sin(time * 0.0016) * 2;
  const violet = hitFlash ? "#ffffff" : "#b98aff";
  const strut = hitFlash ? "#ffffff" : "#b4aee6";
  const plate = hitFlash ? "#ffdddd" : "#2a1a50";
  const line = (pts, w, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, w * u);
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
    ctx.stroke();
  };
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Arch of small clocks behind him.
  ctx.strokeStyle = `rgba(185, 138, 255, ${0.35 + pulse * 0.2})`;
  ctx.lineWidth = Math.max(1, 1.5 * u);
  ctx.beginPath();
  ctx.ellipse(X(0), Y(-34), 58 * u, 40 * u, 0, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (1.1 + (i / 6) * 0.8);
    const cx = X(Math.cos(a) * 58);
    const cy = Y(-34 + Math.sin(a) * 40);
    ctx.fillStyle = "#140a2c";
    ctx.strokeStyle = violet;
    ctx.lineWidth = Math.max(1, u);
    ctx.beginPath();
    ctx.arc(cx, cy, 5 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(time * 0.001 + i) * 3.5 * u, cy + Math.sin(time * 0.001 + i) * 3.5 * u);
    ctx.stroke();
  }

  // Mantle: thin, tattered, hanging off the shoulders.
  ctx.fillStyle = hitFlash ? "rgba(255,255,255,0.6)" : "rgba(20, 10, 40, 0.85)";
  ctx.beginPath();
  ctx.moveTo(X(-14), Y(-30));
  for (const [x, y] of [[-24, 20], [-30, 84], [-22, 76], [-18, 92], [-10, 80], [0, 90], [10, 80], [18, 92], [22, 76], [30, 84], [24, 20], [14, -30]]) {
    ctx.lineTo(X(x + (y > 60 ? sway : 0)), Y(y));
  }
  ctx.closePath();
  ctx.fill();

  // Legs, and the hanging arm.
  line([[-4, 30], [-8, 64], [-7, 98]], 3, strut);
  line([[4, 30], [8, 64], [7, 98]], 3, strut);
  line([[-14, -28], [-20, 0], [-21, 26]], 2.6, strut);
  line([[-21, 26], [-22, 36]], 1, strut);
  line([[-20, 26], [-19, 37]], 1, strut);

  // Torso: a narrow cage.
  ctx.fillStyle = plate;
  ctx.beginPath();
  ctx.moveTo(X(-14), Y(-32));
  ctx.lineTo(X(14), Y(-32));
  ctx.lineTo(X(6), Y(28));
  ctx.lineTo(X(-6), Y(28));
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 4; i++) line([[-11 + i * 1.5, -24 + i * 9], [0, -22 + i * 9], [11 - i * 1.5, -24 + i * 9]], 1.2, "#8f86c8");
  line([[0, -32], [0, 28]], 1.4, strut);

  // The raised arm: two fingers out.
  line([[14, -28], [26, -12], [30, -42]], 2.6, strut);
  line([[30, -42], [29, -54]], 1.1, strut);
  line([[31, -42], [33, -53]], 1.1, strut);

  // Core.
  const coreG = ctx.createRadialGradient(X(0), Y(-12), 0, X(0), Y(-12), 12 * u);
  coreG.addColorStop(0, "rgba(246, 240, 255, 0.95)");
  coreG.addColorStop(0.35, `rgba(155, 92, 255, ${0.5 + pulse * 0.3})`);
  coreG.addColorStop(1, "rgba(155, 92, 255, 0)");
  ctx.fillStyle = coreG;
  ctx.beginPath();
  ctx.arc(X(0), Y(-12), 12 * u, 0, Math.PI * 2);
  ctx.fill();

  // Neck, mask and crown.
  line([[0, -32], [0, -38]], 1.6, strut);
  ctx.fillStyle = hitFlash ? "#ffffff" : "#ece8f6";
  ctx.beginPath();
  ctx.ellipse(X(0), Y(-47), 6.5 * u, 9 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  line([[1.5, -56], [0.5, -50], [2, -46], [0, -40]], 0.8, "#4a2a8a");
  ctx.fillStyle = violet;
  ctx.fillRect(X(-4.5), Y(-49), 3 * u, 1.2 * u);
  ctx.fillRect(X(1.5), Y(-49), 3 * u, 1.2 * u);
  for (const [x, y] of [[-4, -60], [0, -64], [4, -60]]) {
    line([[x * 0.5, -55], [x, y]], 0.9, "#b4aee6");
    ctx.strokeStyle = violet;
    ctx.beginPath();
    ctx.arc(X(x), Y(y - 1.5), 1.6 * u, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Glow: fingertips and eyes.
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = `rgba(185, 138, 255, ${0.5 + pulse * 0.4})`;
  for (const [x, y] of [[29, -55], [33, -54], [-3, -48.5], [3, -48.5]]) {
    ctx.beginPath();
    ctx.arc(X(x), Y(y), 2.2 * u, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
