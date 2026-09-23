import { renderBeast } from "./beast.js";

/**
 * The Hound (suit C-0016), placeholder: the beast's body in the Hound's own
 * colours, never quite where it was a moment ago. A faint afterimage trails
 * a few frames behind and the body snaps between positions like a bad frame
 * rate. The real Hound art replaces this with the Act II maps.
 */
export function renderHound(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha, time, enemy, hitFlash) {
  const step = Math.floor(time / 90 + enemy.x * 7);
  const jump = (n) => ((Math.sin(n * 12.9898) * 43758.5453) % 1) - 0.5;
  const trail = bodyWidth * 0.9;
  ctx.save();
  ctx.globalAlpha = alpha * 0.28;
  renderBeast(ctx, screenX - trail + jump(step - 2) * 6, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha * 0.28, time - 180, enemy, false);
  ctx.globalAlpha = alpha * 0.5;
  renderBeast(ctx, screenX - trail * 0.45 + jump(step - 1) * 6, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha * 0.5, time - 90, enemy, false);
  ctx.restore();
  renderBeast(ctx, screenX + jump(step) * bodyWidth * 0.25, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha, time, enemy, hitFlash);
}
