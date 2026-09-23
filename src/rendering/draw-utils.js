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

/**
 * Draw a bright edge highlight on the right side of a rectangular area.
 * Uses a linear gradient (transparent center → color at edge) for pseudo-3D rim lighting.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - left edge
 * @param {number} y - top edge
 * @param {number} width
 * @param {number} height
 * @param {string} color - CSS color for the rim highlight
 * @param {number} intensity - opacity 0–1
 */
export function drawRimLight(ctx, x, y, width, height, color, intensity) {
  const rimW = width * 0.3;
  const grad = ctx.createLinearGradient(x + width - rimW, y, x + width, y);
  grad.addColorStop(0, "transparent");
  grad.addColorStop(1, color);
  ctx.save();
  ctx.globalAlpha = intensity;
  ctx.fillStyle = grad;
  ctx.fillRect(x + width - rimW, y, rimW, height);
  ctx.restore();
}

/**
 * Draw a dark gradient on the left side of a rectangular area for shadow.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - left edge
 * @param {number} y - top edge
 * @param {number} width
 * @param {number} height
 * @param {number} intensity - opacity 0–1
 */
export function drawShadowGradient(ctx, x, y, width, height, intensity) {
  const shadowW = width * 0.35;
  const grad = ctx.createLinearGradient(x, y, x + shadowW, y);
  grad.addColorStop(0, "rgba(0,0,0,1)");
  grad.addColorStop(1, "transparent");
  ctx.save();
  ctx.globalAlpha = intensity;
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, shadowW, height);
  ctx.restore();
}

/**
 * Draw an animated hexagonal-pattern energy shield bubble.
 * Uses arc segments with animated opacity.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - center x
 * @param {number} y - center y
 * @param {number} radius
 * @param {string} color - CSS color
 * @param {number} time - animation time (ms)
 * @param {number} strength - shield strength 0–1
 */
export function drawEnergyShield(ctx, x, y, radius, color, time, strength) {
  const segments = 6;
  const angleStep = (Math.PI * 2) / segments;
  const phase = time * 0.003;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (let i = 0; i < segments; i++) {
    const a0 = angleStep * i + phase;
    const a1 = a0 + angleStep * 0.8;
    // Each segment pulses independently for the hex shimmer effect
    const pulse = 0.3 + 0.7 * Math.abs(Math.sin(phase + i * 1.05));
    ctx.globalAlpha = strength * pulse;
    ctx.beginPath();
    ctx.arc(x, y, radius, a0, a1);
    ctx.stroke();
  }
  // Inner glow fill
  ctx.globalAlpha = strength * 0.08;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
