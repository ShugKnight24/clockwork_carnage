/**
 * Player portrait — 10-stage damage visualization.
 * Pure rendering, zero game state dependency.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {{ health: number, maxHealth: number, alive: boolean, time: number }} state
 */
export function drawPortrait(ctx, x, y, w, h, { health, maxHealth, alive, time }) {
  const healthPct = health / maxHealth;
  const isDead = !alive || health <= 0;
  // Use modular time to prevent floating-point precision loss after hours of play
  const animTime = time % 25132; // ~4*PI*2000, covers all portrait sin periods

  ctx.fillStyle = "#0a0a18";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = isDead ? "rgba(255,0,0,0.6)" : "rgba(0,200,255,0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  const cx = x + w / 2;
  const cy = y + h / 2;
  const s = w / 90; // scale factor relative to 90px base

  // Head/neck base
  if (isDead || healthPct <= 0.9) {
    const skinColor = isDead
      ? "#778877"
      : healthPct > 0.7
        ? "#cc9966"
        : healthPct > 0.5
          ? "#bb8855"
          : healthPct > 0.3
            ? "#aa7744"
            : "#8a5544";
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2 * s, 18 * s, 22 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (isDead || healthPct <= 0.1) {
    // Stage 10
    ctx.fillStyle = isDead ? "#667766" : "#6a4444";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2 * s, 18 * s, 22 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isDead ? "#445544" : "#553333";
    ctx.beginPath();
    ctx.ellipse(cx - 8 * s, cy - 2 * s, 6 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 8 * s, cy - 2 * s, 6 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isDead ? "#334433" : "#442222";
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 12 * s, cy - 2 * s);
    ctx.lineTo(cx - 4 * s, cy - 2 * s);
    ctx.moveTo(cx + 4 * s, cy - 2 * s);
    ctx.lineTo(cx + 12 * s, cy - 2 * s);
    ctx.stroke();

    ctx.fillStyle = "#2a2222";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12 * s, 7 * s, 5 * s, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = "#660000";
    ctx.fillRect(cx + 5 * s, cy + 13 * s, 2 * s, 6 * s);

    ctx.fillStyle = isDead ? "#556655" : "#553333";
    ctx.fillRect(cx - 13 * s, cy - 7 * s, 26 * s, 2 * s);

    ctx.fillStyle = isDead ? "#778877" : "#6a4444";
    ctx.beginPath();
    ctx.moveTo(cx, cy + 1 * s);
    ctx.lineTo(cx + 2 * s, cy + 5 * s);
    ctx.lineTo(cx - 2 * s, cy + 5 * s);
    ctx.fill();

    ctx.strokeStyle = "#553333";
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(cx + 3 * s, cy - 5 * s);
    ctx.lineTo(cx + 10 * s, cy - 1 * s);
    ctx.stroke();

    ctx.fillStyle = "#1a2a3a";
    ctx.fillRect(cx - 17 * s, cy - 10 * s, 6 * s, 3 * s);
    ctx.fillRect(cx + 11 * s, cy - 9 * s, 5 * s, 3 * s);
  }

  // Helmet
  if (!isDead && healthPct > 0.5) {
    ctx.fillStyle = "#1a2a3a";
    ctx.beginPath();
    ctx.ellipse(cx, cy - 2 * s, 20 * s, 24 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#334466";
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.arc(cx, cy - 6 * s, 18 * s, Math.PI + 0.3, -0.3);
    ctx.stroke();
  }

  if (!isDead && healthPct > 0.9) {
    // Stage 1 (>90%)
    ctx.fillStyle = "#0a1520";
    ctx.fillRect(cx - 18 * s, cy - 8 * s, 36 * s, 22 * s);

    ctx.fillStyle = "#00ddff";
    ctx.globalAlpha = 0.8 + Math.sin(animTime / 400) * 0.15;
    ctx.fillRect(cx - 16 * s, cy - 6 * s, 32 * s, 10 * s);
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(0,0,0,0.15)";
    for (let sl = 0; sl < 5; sl++) {
      ctx.fillRect(cx - 16 * s, cy - 6 * s + sl * 2 * s, 32 * s, 1 * s);
    }
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(cx - 12 * s, cy - 4 * s, 10 * s, 3 * s);

    ctx.fillStyle = "#66ffff";
    ctx.globalAlpha = 0.4 + Math.sin(animTime / 200) * 0.2;
    ctx.fillRect(cx + 8 * s, cy - 4 * s, 2 * s, 2 * s);
    ctx.fillRect(cx + 12 * s, cy - 3 * s, 2 * s, 2 * s);
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#1a2a3a";
    ctx.fillRect(cx - 14 * s, cy + 8 * s, 28 * s, 10 * s);
    ctx.fillStyle = "#112233";
    ctx.fillRect(cx - 8 * s, cy + 10 * s, 16 * s, 4 * s);
    ctx.fillStyle = "#0a1520";
    for (let v = 0; v < 3; v++) {
      ctx.fillRect(cx - 5 * s + v * 4 * s, cy + 10 * s, 2 * s, 4 * s);
    }
    ctx.fillStyle = "#1a2a3a";
    ctx.fillRect(cx - 16 * s, cy + 18 * s, 32 * s, 6 * s);
    ctx.fillStyle = "#0f1f2f";
    ctx.fillRect(cx - 12 * s, cy + 20 * s, 24 * s, 3 * s);

    ctx.strokeStyle = "rgba(0,200,255,0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 18 * s, cy - 8 * s, 36 * s, 22 * s);
  } else if (healthPct > 0.8) {
    // Stage 2 (80-90%)
    ctx.fillStyle = "#0a1520";
    ctx.fillRect(cx - 18 * s, cy - 8 * s, 36 * s, 22 * s);

    ctx.fillStyle = "#00ddff";
    ctx.globalAlpha = 0.75 + Math.sin(animTime / 400) * 0.12;
    ctx.fillRect(cx - 16 * s, cy - 6 * s, 32 * s, 10 * s);
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(0,0,0,0.15)";
    for (let sl = 0; sl < 5; sl++) {
      ctx.fillRect(cx - 16 * s, cy - 6 * s + sl * 2 * s, 32 * s, 1 * s);
    }
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(cx - 12 * s, cy - 4 * s, 10 * s, 3 * s);

    // Scorch mark
    ctx.fillStyle = "rgba(40,20,10,0.45)";
    ctx.beginPath();
    ctx.ellipse(cx + 13 * s, cy - 14 * s, 4 * s, 3 * s, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Small dent
    ctx.strokeStyle = "#223344";
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.arc(cx - 10 * s, cy - 16 * s, 3 * s, 0.5, 2.5);
    ctx.stroke();

    ctx.fillStyle = "#1a2a3a";
    ctx.fillRect(cx - 14 * s, cy + 8 * s, 28 * s, 10 * s);
    ctx.fillStyle = "#112233";
    ctx.fillRect(cx - 8 * s, cy + 10 * s, 16 * s, 4 * s);
    ctx.fillStyle = "#0a1520";
    for (let v = 0; v < 3; v++) {
      ctx.fillRect(cx - 5 * s + v * 4 * s, cy + 10 * s, 2 * s, 4 * s);
    }
    ctx.fillStyle = "#1a2a3a";
    ctx.fillRect(cx - 16 * s, cy + 18 * s, 32 * s, 6 * s);
  } else if (healthPct > 0.7) {
    // Stage 3 (70-80%)
    ctx.fillStyle = "#0a1520";
    ctx.fillRect(cx - 18 * s, cy - 8 * s, 36 * s, 22 * s);

    ctx.fillStyle = "#00ccee";
    ctx.globalAlpha = 0.65 + Math.sin(animTime / 350) * 0.1;
    ctx.fillRect(cx - 16 * s, cy - 6 * s, 32 * s, 10 * s);
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(0,0,0,0.18)";
    for (let sl = 0; sl < 5; sl++) {
      ctx.fillRect(cx - 16 * s, cy - 6 * s + sl * 2 * s, 32 * s, 1 * s);
    }
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(cx - 12 * s, cy - 4 * s, 8 * s, 3 * s);

    // Single crack
    ctx.strokeStyle = "#ff4466";
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx + 4 * s, cy - 6 * s);
    ctx.lineTo(cx + 6 * s, cy - 2 * s);
    ctx.lineTo(cx + 10 * s, cy + 2 * s);
    ctx.stroke();

    // Blood spot
    ctx.fillStyle = "#880000";
    ctx.beginPath();
    ctx.arc(cx + 5 * s, cy - 6 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Scorch marks
    ctx.fillStyle = "rgba(40,20,10,0.45)";
    ctx.beginPath();
    ctx.ellipse(cx + 12 * s, cy - 14 * s, 4 * s, 3 * s, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1a2a3a";
    ctx.fillRect(cx - 14 * s, cy + 8 * s, 28 * s, 10 * s);
    ctx.fillStyle = "#112233";
    ctx.fillRect(cx - 8 * s, cy + 10 * s, 16 * s, 4 * s);
    ctx.fillStyle = "#1a2a3a";
    ctx.fillRect(cx - 16 * s, cy + 18 * s, 32 * s, 6 * s);
  } else if (healthPct > 0.6) {
    // Stage 4 (60-70%)
    ctx.fillStyle = "#0a1520";
    ctx.fillRect(cx - 18 * s, cy - 8 * s, 36 * s, 22 * s);

    ctx.fillStyle = "#00aacc";
    ctx.globalAlpha = 0.55 + Math.sin(animTime / 250) * 0.12;
    ctx.fillRect(cx - 16 * s, cy - 6 * s, 32 * s, 10 * s);
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(0,0,0,0.2)";
    for (let sl = 0; sl < 5; sl++) {
      ctx.fillRect(cx - 16 * s, cy - 6 * s + sl * 2 * s, 32 * s, 1 * s);
    }

    // Spider cracks
    ctx.strokeStyle = "#ff4466";
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx + 2 * s, cy - 6 * s);
    ctx.lineTo(cx + 5 * s, cy - 1 * s);
    ctx.lineTo(cx + 9 * s, cy + 3 * s);
    ctx.moveTo(cx + 4 * s, cy - 3 * s);
    ctx.lineTo(cx + 10 * s, cy);
    ctx.lineTo(cx + 14 * s, cy + 1 * s);
    ctx.stroke();

    // Eye peeking
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.ellipse(cx + 8 * s, cy - 1 * s, 3 * s, 2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#224488";
    ctx.beginPath();
    ctx.arc(cx + 8 * s, cy - 1 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Blood drip
    ctx.fillStyle = "#880000";
    ctx.fillRect(cx + 5 * s, cy + 1 * s, 2 * s, 6 * s);

    // Scorch marks
    ctx.fillStyle = "rgba(40,20,10,0.45)";
    ctx.beginPath();
    ctx.ellipse(cx + 12 * s, cy - 13 * s, 4 * s, 3 * s, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - 8 * s, cy - 15 * s, 3 * s, 2 * s, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1a2a3a";
    ctx.fillRect(cx - 14 * s, cy + 8 * s, 28 * s, 10 * s);
    ctx.fillStyle = "#112233";
    ctx.fillRect(cx - 8 * s, cy + 10 * s, 16 * s, 4 * s);
    ctx.fillStyle = "#1a2a3a";
    ctx.fillRect(cx - 16 * s, cy + 18 * s, 32 * s, 6 * s);
  } else if (healthPct > 0.5) {
    // Stage 5 (50-60%)
    ctx.fillStyle = "#0a1520";
    ctx.fillRect(cx - 18 * s, cy - 8 * s, 36 * s, 22 * s);

    ctx.fillStyle = "#00aacc";
    ctx.globalAlpha = 0.5 + Math.sin(animTime / 300) * 0.1;
    ctx.fillRect(cx - 16 * s, cy - 6 * s, 14 * s, 10 * s);
    ctx.globalAlpha = 0.2;
    ctx.fillRect(cx + 2 * s, cy - 6 * s, 14 * s, 10 * s);
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(0,0,0,0.15)";
    for (let sl = 0; sl < 3; sl++) {
      ctx.fillRect(cx - 16 * s, cy - 6 * s + sl * 3 * s, 14 * s, 1 * s);
    }

    ctx.strokeStyle = "#ff4466";
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 2 * s, cy - 6 * s);
    ctx.lineTo(cx + 2 * s, cy);
    ctx.lineTo(cx + 6 * s, cy + 4 * s);
    ctx.moveTo(cx, cy - 4 * s);
    ctx.lineTo(cx + 8 * s, cy);
    ctx.lineTo(cx + 12 * s, cy + 2 * s);
    ctx.moveTo(cx + 3 * s, cy - 6 * s);
    ctx.lineTo(cx + 5 * s, cy - 2 * s);
    ctx.stroke();

    // Eye
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(cx + 7 * s, cy - 1 * s, 4 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#224488";
    ctx.beginPath();
    ctx.arc(cx + 7 * s, cy - 1 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(cx + 7 * s, cy - 1 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1a2a3a";
    ctx.fillRect(cx - 14 * s, cy + 8 * s, 28 * s, 10 * s);
    ctx.fillStyle = "#112233";
    ctx.fillRect(cx - 8 * s, cy + 10 * s, 16 * s, 4 * s);

    ctx.fillStyle = "#880000";
    ctx.fillRect(cx + 3 * s, cy + 2 * s, 2 * s, 8 * s);

    ctx.fillStyle = "rgba(40,20,10,0.5)";
    ctx.beginPath();
    ctx.ellipse(cx + 12 * s, cy - 12 * s, 5 * s, 4 * s, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1a2a3a";
    ctx.fillRect(cx - 16 * s, cy + 18 * s, 32 * s, 6 * s);
  } else if (healthPct > 0.4) {
    // Stage 6 (40-50%)
    ctx.fillStyle = "#1a2a3a";
    ctx.beginPath();
    ctx.ellipse(
      cx - 2 * s,
      cy - 2 * s,
      19 * s,
      23 * s,
      0,
      Math.PI * 0.6,
      Math.PI * 2.1,
    );
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#334466";
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.arc(cx - 2 * s, cy - 6 * s, 17 * s, Math.PI + 0.3, -0.4);
    ctx.stroke();

    ctx.fillStyle = "#0a1520";
    ctx.fillRect(cx - 17 * s, cy - 7 * s, 17 * s, 18 * s);

    ctx.fillStyle = "#00aacc";
    ctx.globalAlpha = 0.3 + Math.sin(animTime / 200) * 0.1;
    ctx.fillRect(cx - 15 * s, cy - 5 * s, 14 * s, 7 * s);
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(0,0,0,0.2)";
    for (let sl = 0; sl < 3; sl++) {
      ctx.fillRect(cx - 15 * s, cy - 5 * s + sl * 3 * s, 14 * s, 1 * s);
    }

    ctx.strokeStyle = "#ff4466";
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 4 * s, cy - 5 * s);
    ctx.lineTo(cx + 1 * s, cy + 2 * s);
    ctx.moveTo(cx - 8 * s, cy - 3 * s);
    ctx.lineTo(cx - 3 * s, cy + 3 * s);
    ctx.moveTo(cx - 12 * s, cy);
    ctx.lineTo(cx - 7 * s, cy + 4 * s);
    ctx.stroke();

    // Left eye
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(cx - 8 * s, cy - 1 * s, 4 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#224488";
    ctx.beginPath();
    ctx.arc(cx - 8 * s, cy - 1 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(cx - 8 * s, cy - 1 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();

    // Right eye
    ctx.fillStyle = "#887055";
    ctx.beginPath();
    ctx.ellipse(cx + 8 * s, cy - 2 * s, 5 * s, 3.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(cx + 8 * s, cy - 1.5 * s, 3 * s, 2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#224488";
    ctx.beginPath();
    ctx.arc(cx + 8 * s, cy - 1.5 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(cx + 8 * s, cy - 1.5 * s, 0.7 * s, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = "#aa7744";
    ctx.beginPath();
    ctx.moveTo(cx + 2 * s, cy + 2 * s);
    ctx.lineTo(cx + 4 * s, cy + 6 * s);
    ctx.lineTo(cx + 1 * s, cy + 6 * s);
    ctx.fill();

    // Break edge
    ctx.strokeStyle = "#2a3a4a";
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(cx + 1 * s, cy - 20 * s);
    ctx.lineTo(cx + 3 * s, cy - 10 * s);
    ctx.lineTo(cx + 1 * s, cy - 2 * s);
    ctx.lineTo(cx + 3 * s, cy + 8 * s);
    ctx.stroke();

    ctx.fillStyle = "#880000";
    ctx.fillRect(cx + 2 * s, cy + 2 * s, 2 * s, 8 * s);

    ctx.fillStyle = "#1a2a3a";
    ctx.fillRect(cx - 14 * s, cy + 8 * s, 16 * s, 10 * s);
    ctx.fillStyle = "#1a2a3a";
    ctx.fillRect(cx - 16 * s, cy + 18 * s, 32 * s, 6 * s);
  } else if (healthPct > 0.3) {
    // Stage 7 (30-40%)
    ctx.fillStyle = "#1a2a3a";
    ctx.beginPath();
    ctx.moveTo(cx - 18 * s, cy - 18 * s);
    ctx.lineTo(cx - 8 * s, cy - 20 * s);
    ctx.lineTo(cx - 6 * s, cy - 12 * s);
    ctx.lineTo(cx - 16 * s, cy - 10 * s);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#00aacc";
    ctx.globalAlpha = 0.15 + Math.sin(animTime / 100) * 0.1;
    ctx.fillRect(cx - 16 * s, cy - 16 * s, 6 * s, 3 * s);
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#885533";
    ctx.fillRect(cx - 14 * s, cy - 8 * s, 28 * s, 3 * s);

    // Left eye
    ctx.fillStyle = "#ffddcc";
    ctx.beginPath();
    ctx.ellipse(cx - 8 * s, cy - 2 * s, 5 * s, 3.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#cc3333";
    ctx.lineWidth = 0.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 12 * s, cy - 3 * s);
    ctx.lineTo(cx - 9 * s, cy - 2 * s);
    ctx.moveTo(cx - 12 * s, cy - 1 * s);
    ctx.lineTo(cx - 10 * s, cy - 1.5 * s);
    ctx.stroke();
    ctx.fillStyle = "#224488";
    ctx.beginPath();
    ctx.arc(cx - 8 * s, cy - 2 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(cx - 8 * s, cy - 2 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();

    // Right eye
    ctx.fillStyle = "#774455";
    ctx.beginPath();
    ctx.ellipse(cx + 8 * s, cy - 2 * s, 6 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffddcc";
    ctx.fillRect(cx + 5 * s, cy - 2.5 * s, 6 * s, 1.5 * s);
    ctx.fillStyle = "#224488";
    ctx.fillRect(cx + 7 * s, cy - 2 * s, 2 * s, 1 * s);

    // Broken nose
    ctx.fillStyle = "#aa6633";
    ctx.beginPath();
    ctx.moveTo(cx, cy + 1 * s);
    ctx.lineTo(cx + 3 * s, cy + 6 * s);
    ctx.lineTo(cx - 2 * s, cy + 6 * s);
    ctx.fill();
    ctx.fillStyle = "#990000";
    ctx.fillRect(cx, cy + 6 * s, 2 * s, 3 * s);

    // Snarl
    ctx.fillStyle = "#331111";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12 * s, 8 * s, 3.5 * s, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = "#ddccbb";
    for (let t = 0; t < 6; t++) {
      ctx.fillRect(cx - 6 * s + t * 2 * s, cy + 10.5 * s, 1.5 * s, 2 * s);
    }
    ctx.fillStyle = "#331111";
    ctx.fillRect(cx + 2 * s, cy + 10.5 * s, 2 * s, 2 * s);

    ctx.fillStyle = "rgba(60,40,30,0.3)";
    ctx.fillRect(cx - 12 * s, cy + 8 * s, 24 * s, 10 * s);

    ctx.fillStyle = "#990000";
    ctx.fillRect(cx - 14 * s, cy - 6 * s, 2 * s, 10 * s);
    ctx.fillRect(cx + 10 * s, cy - 4 * s, 2 * s, 12 * s);

    ctx.strokeStyle = "#990000";
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx + 4 * s, cy - 6 * s);
    ctx.lineTo(cx + 12 * s, cy - 2 * s);
    ctx.stroke();
  } else if (healthPct > 0.2) {
    // Stage 8 (20-30%)
    ctx.fillStyle = "#774422";
    ctx.fillRect(cx - 14 * s, cy - 8 * s, 28 * s, 3.5 * s);

    // Left eye
    ctx.fillStyle = "#ffccbb";
    ctx.beginPath();
    ctx.ellipse(cx - 8 * s, cy - 2 * s, 4.5 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#cc2222";
    ctx.lineWidth = 0.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 11 * s, cy - 3 * s);
    ctx.lineTo(cx - 9 * s, cy - 2 * s);
    ctx.moveTo(cx - 11 * s, cy - 1 * s);
    ctx.lineTo(cx - 9 * s, cy - 1.5 * s);
    ctx.stroke();
    ctx.fillStyle = "#224488";
    ctx.beginPath();
    ctx.arc(cx - 8 * s, cy - 2 * s, 1.8 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(cx - 8 * s, cy - 2 * s, 0.8 * s, 0, Math.PI * 2);
    ctx.fill();

    // Right eye
    ctx.fillStyle = "#664455";
    ctx.beginPath();
    ctx.ellipse(cx + 8 * s, cy - 2 * s, 6 * s, 4.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffddcc";
    ctx.fillRect(cx + 5 * s, cy - 2.5 * s, 6 * s, 1 * s);

    // Broken nose
    ctx.fillStyle = "#995533";
    ctx.beginPath();
    ctx.moveTo(cx + 1 * s, cy + 1 * s);
    ctx.lineTo(cx + 4 * s, cy + 5 * s);
    ctx.lineTo(cx - 1 * s, cy + 6 * s);
    ctx.fill();
    ctx.fillStyle = "#990000";
    ctx.fillRect(cx + 1 * s, cy + 5 * s, 2 * s, 4 * s);

    // Grimace
    ctx.fillStyle = "#2a1111";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12 * s, 7 * s, 3.5 * s, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = "#ccbbaa";
    for (let t = 0; t < 5; t++) {
      ctx.fillRect(cx - 5 * s + t * 2.5 * s, cy + 10.5 * s, 1.5 * s, 2 * s);
    }

    // Heavy bruising
    ctx.fillStyle = "rgba(80,30,50,0.35)";
    ctx.beginPath();
    ctx.ellipse(cx - 5 * s, cy - 3 * s, 7 * s, 5 * s, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(60,20,40,0.25)";
    ctx.beginPath();
    ctx.ellipse(cx + 7 * s, cy + 1 * s, 6 * s, 4 * s, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Stubble/grime
    ctx.fillStyle = "rgba(50,30,25,0.3)";
    ctx.fillRect(cx - 12 * s, cy + 7 * s, 24 * s, 11 * s);

    // Blood
    ctx.fillStyle = "#880000";
    ctx.fillRect(cx - 14 * s, cy - 6 * s, 2 * s, 12 * s);
    ctx.fillRect(cx + 10 * s, cy - 5 * s, 2 * s, 14 * s);
    ctx.fillRect(cx - 3 * s, cy + 5 * s, 6 * s, 2 * s);

    // Deep cut
    ctx.strokeStyle = "#880000";
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx + 3 * s, cy - 7 * s);
    ctx.lineTo(cx + 12 * s, cy - 2 * s);
    ctx.stroke();
  } else if (healthPct > 0.1) {
    // Stage 9 (10-20%)
    ctx.fillStyle = "#8a5544";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2 * s, 18 * s, 22 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Heavy bruising
    ctx.fillStyle = "rgba(80,30,50,0.4)";
    ctx.beginPath();
    ctx.ellipse(cx - 6 * s, cy - 4 * s, 8 * s, 6 * s, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(60,20,40,0.3)";
    ctx.beginPath();
    ctx.ellipse(cx + 6 * s, cy, 7 * s, 5 * s, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#774422";
    ctx.fillRect(cx - 14 * s, cy - 8 * s, 28 * s, 3.5 * s);

    // Left eye
    ctx.fillStyle = "#ffccbb";
    ctx.beginPath();
    ctx.ellipse(cx - 8 * s, cy - 2 * s, 4 * s, 2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#cc2222";
    ctx.lineWidth = 0.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 11 * s, cy - 2.5 * s);
    ctx.lineTo(cx - 9 * s, cy - 2 * s);
    ctx.moveTo(cx - 11 * s, cy - 1 * s);
    ctx.lineTo(cx - 9 * s, cy - 1.5 * s);
    ctx.stroke();
    ctx.fillStyle = "#224488";
    ctx.beginPath();
    ctx.arc(cx - 8 * s, cy - 2 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(cx - 8 * s, cy - 2 * s, 0.7 * s, 0, Math.PI * 2);
    ctx.fill();

    // Right eye
    ctx.fillStyle = "#664455";
    ctx.beginPath();
    ctx.ellipse(cx + 8 * s, cy - 2 * s, 6 * s, 4.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#553344";
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx + 4 * s, cy - 2 * s);
    ctx.lineTo(cx + 12 * s, cy - 2 * s);
    ctx.stroke();

    // Nose
    ctx.fillStyle = "#995533";
    ctx.beginPath();
    ctx.moveTo(cx + 1 * s, cy + 1 * s);
    ctx.lineTo(cx + 4 * s, cy + 5 * s);
    ctx.lineTo(cx - 1 * s, cy + 6 * s);
    ctx.fill();
    ctx.fillStyle = "#990000";
    ctx.fillRect(cx + 1 * s, cy + 5 * s, 2 * s, 5 * s);

    // Mouth
    ctx.fillStyle = "#2a1111";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12 * s, 7 * s, 4 * s, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = "#ccbbaa";
    ctx.fillRect(cx - 4 * s, cy + 10.5 * s, 1.5 * s, 2 * s);
    ctx.fillRect(cx - 1 * s, cy + 10.5 * s, 1.5 * s, 2 * s);
    ctx.fillRect(cx + 3 * s, cy + 10.5 * s, 1.5 * s, 2 * s);
    ctx.fillStyle = "#880000";
    ctx.fillRect(cx + 5 * s, cy + 13 * s, 2 * s, 5 * s);
    ctx.fillRect(cx - 3 * s, cy + 14 * s, 2 * s, 3 * s);

    // Heavy blood
    ctx.fillStyle = "#880000";
    ctx.fillRect(cx - 15 * s, cy - 6 * s, 2 * s, 14 * s);
    ctx.fillRect(cx + 11 * s, cy - 8 * s, 2 * s, 16 * s);
    ctx.fillRect(cx - 4 * s, cy + 5 * s, 8 * s, 2 * s);

    // Deep cuts
    ctx.strokeStyle = "#880000";
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(cx + 3 * s, cy - 8 * s);
    ctx.lineTo(cx + 13 * s, cy - 1 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 10 * s, cy + 3 * s);
    ctx.lineTo(cx - 4 * s, cy + 8 * s);
    ctx.stroke();

    // Stubble/grime
    ctx.fillStyle = "rgba(40,25,20,0.35)";
    ctx.fillRect(cx - 13 * s, cy + 6 * s, 26 * s, 12 * s);
  }

  // Temporal badge
  ctx.fillStyle = "#ffaa00";
  ctx.globalAlpha = 0.5 + Math.sin(time / 500) * 0.2;
  ctx.beginPath();
  ctx.arc(x + 8 * s, y + h - 10 * s, 4 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffcc44";
  ctx.beginPath();
  ctx.arc(x + 8 * s, y + h - 10 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}
