/**
 * Shared drawing utilities used by enemy renderers.
 * Extracted from Renderer class methods.
 */

/** Draw a radial gradient glow circle. */
export function drawGlow(ctx, x, y, radius, color, strength = 0.5) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "transparent");
  ctx.globalAlpha = strength;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1.0;
}

/** Draw vertical tech/circuit lines across a rectangular area. */
export function drawTechLines(ctx, x, y, width, height, color, opacity = 0.3) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = opacity;
  const spacing = 4;
  for (let i = 0; i < width; i += spacing) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i, y + height);
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;
}
