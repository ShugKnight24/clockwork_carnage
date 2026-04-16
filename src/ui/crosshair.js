/**
 * Crosshair rendering — pure function, zero game state dependency.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx - center X
 * @param {number} cy - center Y
 * @param {number} type - crosshair index (0-5)
 */
export function drawCrosshair(ctx, cx, cy, type) {
  if (type === 0) {
    // Red Dot
    ctx.fillStyle = "rgba(255,50,50,0.9)";
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,150,150,0.5)";
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 1) {
    // Green Cross
    ctx.strokeStyle = "rgba(0,255,200,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx - 4, cy);
    ctx.moveTo(cx + 4, cy);
    ctx.lineTo(cx + 10, cy);
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx, cy - 4);
    ctx.moveTo(cx, cy + 4);
    ctx.lineTo(cx, cy + 10);
    ctx.stroke();
    ctx.fillStyle = "rgba(0,255,200,0.9)";
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
  } else if (type === 2) {
    // ACOG Scope
    ctx.strokeStyle = "rgba(255,100,100,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy);
    ctx.lineTo(cx - 5, cy);
    ctx.moveTo(cx + 5, cy);
    ctx.lineTo(cx + 18, cy);
    ctx.moveTo(cx, cy - 18);
    ctx.lineTo(cx, cy - 5);
    ctx.moveTo(cx, cy + 5);
    ctx.lineTo(cx, cy + 18);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,80,80,0.8)";
    ctx.beginPath();
    ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 3) {
    // Circle
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
  } else if (type === 4) {
    // Minimal
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillRect(cx - 1, cy - 1, 3, 3);
  } else if (type === 5) {
    // None — very subtle center reference
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(cx, cy, 1, 1);
  }
}
