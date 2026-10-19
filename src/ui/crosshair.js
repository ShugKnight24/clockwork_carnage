import { isModernArt, isRealisticArt } from "../rendering/art-style.js";

/**
 * Crosshair rendering — pure function, zero game state dependency.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx - center X
 * @param {number} cy - center Y
 * @param {number} type - crosshair index (0-5)
 */
export function drawCrosshair(ctx, cx, cy, type) {
  if (isRealisticArt()) {
    drawCrosshairRealistic(ctx, cx, cy, type);
    return;
  }
  if (isModernArt()) {
    drawCrosshairModern(ctx, cx, cy, type);
    return;
  }
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

const INK = "#04060b";

/** Stroke the current path twice: ink underlay, then colour. */
function inked(ctx, color, lw) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw + 2;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}

function inkDot(ctx, cx, cy, r, color) {
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function ticks(ctx, cx, cy, inner, outer) {
  ctx.beginPath();
  ctx.moveTo(cx - outer, cy);
  ctx.lineTo(cx - inner, cy);
  ctx.moveTo(cx + inner, cy);
  ctx.lineTo(cx + outer, cy);
  ctx.moveTo(cx, cy - outer);
  ctx.lineTo(cx, cy - inner);
  ctx.moveTo(cx, cy + inner);
  ctx.lineTo(cx, cy + outer);
}

/** Modern art style: same six reticles, inked so they read on any wall. */
function drawCrosshairModern(ctx, cx, cy, type) {
  ctx.lineCap = "butt";
  if (type === 0) {
    inkDot(ctx, cx, cy, 3.5, "#ff2a4a");
    ctx.fillStyle = "rgba(255,220,225,0.95)";
    ctx.fillRect(cx - 0.75, cy - 0.75, 1.5, 1.5);
  } else if (type === 1) {
    ticks(ctx, cx, cy, 4, 11);
    inked(ctx, "#22e6ff", 1.75);
    ctx.fillStyle = INK;
    ctx.fillRect(cx - 2, cy - 2, 4, 4);
    ctx.fillStyle = "#b8f7ff";
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
  } else if (type === 2) {
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    inked(ctx, "rgba(255,90,110,0.9)", 1.25);
    ticks(ctx, cx, cy, 6, 18);
    inked(ctx, "rgba(255,90,110,0.9)", 1.25);
    inkDot(ctx, cx, cy, 1.6, "#ff2a4a");
  } else if (type === 3) {
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    inked(ctx, "rgba(235,242,248,0.85)", 1.5);
    ctx.fillStyle = INK;
    ctx.fillRect(cx - 2, cy - 2, 4, 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
  } else if (type === 4) {
    ctx.fillStyle = INK;
    ctx.fillRect(cx - 2.5, cy - 2.5, 5, 5);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
  } else if (type === 5) {
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(cx, cy, 1, 1);
  }
}

// ─── Realistic ──────────────────────────────────────────────────────────────

// Optic-style reticles: 1px lines on the pixel grid, each laid over a faint
// dark 3px underlay so they hold on a lit wall. No glow, no saturated colour.
const R_LINE = "rgba(232,234,229,0.92)";
const R_RED = "rgba(222,78,66,0.95)";
const R_EDGE = "rgba(4,6,8,0.42)";

/** Horizontal and vertical ticks from `inner` to `outer`, outline pass or line pass. */
function realTicks(ctx, x, y, inner, outer, edge) {
  const len = outer - inner;
  if (edge) {
    ctx.fillRect(x - outer - 1, y - 1, len + 2, 3);
    ctx.fillRect(x + inner, y - 1, len + 2, 3);
    ctx.fillRect(x - 1, y - outer - 1, 3, len + 2);
    ctx.fillRect(x - 1, y + inner, 3, len + 2);
  } else {
    ctx.fillRect(x - outer, y, len, 1);
    ctx.fillRect(x + inner + 1, y, len, 1);
    ctx.fillRect(x, y - outer, 1, len);
    ctx.fillRect(x, y + inner + 1, 1, len);
  }
}

/** 1px ring with a 3px dark underlay. */
function realRing(ctx, x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x + 0.5, y + 0.5, r, 0, Math.PI * 2);
  ctx.strokeStyle = R_EDGE;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** Square centre dot of `size` px with a 1px dark border. */
function realDot(ctx, x, y, size, color) {
  const o = (size - 1) >> 1;
  ctx.fillStyle = R_EDGE;
  ctx.fillRect(x - o - 1, y - o - 1, size + 2, size + 2);
  ctx.fillStyle = color;
  ctx.fillRect(x - o, y - o, size, size);
}

/** Realistic art style: the same six reticles as thin optic markings. */
function drawCrosshairRealistic(ctx, cx, cy, type) {
  const x = Math.round(cx);
  const y = Math.round(cy);
  if (type === 0) {
    // Red dot: a small emitter dot, no halo.
    ctx.beginPath();
    ctx.arc(x + 0.5, y + 0.5, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = R_EDGE;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 0.5, y + 0.5, 1.7, 0, Math.PI * 2);
    ctx.fillStyle = R_RED;
    ctx.fill();
  } else if (type === 1) {
    ctx.fillStyle = R_EDGE;
    realTicks(ctx, x, y, 4, 11, true);
    ctx.fillStyle = R_LINE;
    realTicks(ctx, x, y, 4, 11, false);
    realDot(ctx, x, y, 1, R_LINE);
  } else if (type === 2) {
    realRing(ctx, x, y, 18, R_RED);
    ctx.fillStyle = R_EDGE;
    realTicks(ctx, x, y, 6, 18, true);
    ctx.fillStyle = R_RED;
    realTicks(ctx, x, y, 6, 18, false);
    realDot(ctx, x, y, 2, R_RED);
  } else if (type === 3) {
    realRing(ctx, x, y, 12, R_LINE);
    realDot(ctx, x, y, 1, R_LINE);
  } else if (type === 4) {
    realDot(ctx, x, y, 2, R_LINE);
  } else if (type === 5) {
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(cx, cy, 1, 1);
  }
}

/**
 * The sight the suit projects while aimed in: a faint glass window with
 * corner brackets, a ring and a centre dot, at the aim point. The gun drops
 * below it (src/rendering/svg-art/viewmodels.js ADS_DROP), so the window
 * frames the target instead of the gun's body covering it. Dark-edged so it
 * reads on a lit wall and in a dark corridor alike.
 * @param {number} alpha 0..1
 * @param {number} [scale] 1 at a 900 px tall view
 */
export function drawAdsSight(ctx, cx, cy, alpha = 1, scale = 1) {
  if (alpha <= 0.01) return;
  const k = Math.max(0.7, Math.min(2, scale));
  const color = isModernArt() || isRealisticArt() ? "#7dfff0" : "#ff4a4a";
  const glass = isModernArt() || isRealisticArt() ? "rgba(125,255,240," : "rgba(255,90,90,";
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // The window: a faint pane, a hairline edge, brighter corners.
  const ww = 92 * k;
  const wh = 64 * k;
  const x0 = cx - ww / 2;
  const y0 = cy - wh / 2;
  const r = 10 * k;
  ctx.beginPath();
  ctx.roundRect(x0, y0, ww, wh, r);
  ctx.fillStyle = glass + "0.05)";
  ctx.fill();
  ctx.strokeStyle = glass + "0.28)";
  ctx.lineWidth = 1;
  ctx.stroke();
  const c = 14 * k;
  for (const [style, width] of [["rgba(0,0,0,0.55)", 3.5 * k], [color, 1.6 * k]]) {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const ex = cx + (sx * ww) / 2;
      const ey = cy + (sy * wh) / 2;
      ctx.moveTo(ex - sx * c, ey);
      ctx.lineTo(ex, ey);
      ctx.lineTo(ex, ey - sy * c);
    }
    ctx.stroke();
  }
  // A glint across the glass.
  ctx.strokeStyle = glass + "0.12)";
  ctx.lineWidth = 6 * k;
  ctx.beginPath();
  ctx.moveTo(x0 + ww * 0.12, y0 + wh * 0.62);
  ctx.lineTo(x0 + ww * 0.34, y0 + wh * 0.14);
  ctx.stroke();
  // The reticle: a ring, four ticks outside it, a dot.
  const ring = 9 * k;
  for (const [style, width] of [["rgba(0,0,0,0.6)", 3.2 * k], [color, 1.4 * k]]) {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(cx, cy, ring, 0, Math.PI * 2);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      ctx.moveTo(cx + dx * (ring + 3 * k), cy + dy * (ring + 3 * k));
      ctx.lineTo(cx + dx * (ring + 8 * k), cy + dy * (ring + 8 * k));
    }
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.beginPath();
  ctx.arc(cx, cy, 2.6 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, 1.6 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
