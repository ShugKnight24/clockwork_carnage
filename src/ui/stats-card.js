import { isCompactPhone } from "../../js/layout.js";

/**
 * Stats card — 2x2 grid showing kills/time/accuracy/streak + score.
 * Shared by GameOver, Victory, and LevelComplete screens.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w - canvas width
 * @param {number} startY
 * @param {string} accentColor
 * @param {string} textColor
 * @param {number|undefined} countUp - animation progress 0..1
 * @param {{ isTouchDevice: boolean, canvasHeight: number, shotsFired: number, shotsHit: number, roundStartTime: number, killedEnemies: number, totalEnemies: number, bestStreak: number, score: number }} stats
 */
/**
 * Total vertical space the card occupies from startY, including the SCORE
 * footer line. Callers flow subsequent content from startY + this.
 */
export function statsCardHeight(stats) {
  const compact = stats.isTouchDevice && isCompactPhone(stats.canvasHeight);
  return (compact ? 80 : 130) + (compact ? 14 : 20);
}

export function renderStatsCard(ctx, w, startY, accentColor, textColor, countUp, stats) {
  const compact = stats.isTouchDevice && isCompactPhone(stats.canvasHeight);
  const cu = typeof countUp === "number" ? Math.min(1, Math.max(0, countUp)) : 1;
  const accuracy =
    stats.shotsFired > 0
      ? Math.round((stats.shotsHit / stats.shotsFired) * 100)
      : 0;
  const elapsed = Math.round(
    (performance.now() - stats.roundStartTime) / 1000,
  );
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = `${mins}:${String(secs).padStart(2, "0")}`;

  // Count-up animated values
  const dispKills = Math.round(stats.killedEnemies * cu);
  const dispAccuracy = Math.round(accuracy * cu);
  const dispStreak = Math.round(stats.bestStreak * cu);

  // Card background with inner glow
  const cardW = compact ? Math.min(300, w - 40) : 380;
  const cardH = compact ? 80 : 130;
  const cx = w / 2 - cardW / 2;
  // Outer glow
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 12;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.beginPath();
  ctx.roundRect(cx, startY, cardW, cardH, 8);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Border
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(cx, startY, cardW, cardH, 8);
  ctx.stroke();
  // Inner accent line at top of card
  ctx.fillStyle = accentColor;
  ctx.globalAlpha = 0.15;
  ctx.beginPath();
  ctx.roundRect(cx + 1, startY + 1, cardW - 2, 3, [7, 7, 0, 0]);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Vertical divider
  ctx.strokeStyle = `${accentColor}33`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2, startY + 12);
  ctx.lineTo(w / 2, startY + cardH - 12);
  ctx.stroke();
  // Horizontal divider
  ctx.beginPath();
  ctx.moveTo(cx + 16, startY + cardH / 2);
  ctx.lineTo(cx + cardW - 16, startY + cardH / 2);
  ctx.stroke();

  // Stats in 2x2 grid
  const statItems = [
    { label: "KILLS", value: `${dispKills}/${stats.totalEnemies}` },
    { label: "TIME", value: timeStr },
    { label: "ACCURACY", value: `${dispAccuracy}%` },
    { label: "BEST STREAK", value: `${dispStreak}x` },
  ];

  const colW = cardW / 2;
  const rowH = cardH / 2;
  ctx.textAlign = "center";
  for (let i = 0; i < statItems.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const sx = cx + col * colW + colW / 2;
    const sy = startY + row * rowH + 18;

    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.6;
    ctx.font = `bold ${compact ? 8 : 10}px monospace`;
    ctx.fillText(statItems[i].label, sx, sy);
    ctx.globalAlpha = 1;

    ctx.fillStyle = accentColor;
    ctx.font = `bold ${compact ? 16 : 24}px monospace`;
    ctx.fillText(statItems[i].value, sx, sy + (compact ? 18 : 26));
  }

  // Score bar at bottom of card
  ctx.fillStyle = accentColor;
  ctx.font = `bold ${compact ? 12 : 14}px monospace`;
  ctx.fillText(
    `SCORE: ${stats.score}`,
    w / 2,
    startY + cardH + (compact ? 14 : 20),
  );
}
