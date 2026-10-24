/**
 * Shared pieces for the east wing's wall painters (halls, R&D, dispatch,
 * the atrium, holding, interview): things more than one room hangs on its
 * walls. Painted like the rest of the station (src/rendering/env/paint.js):
 * anything with text or a picture on a raised plate, screens and lamps as
 * emitters for the Realistic bake.
 */
import { T, lin, plate, relief, grey, emit, sink } from "../paint.js";

/**
 * Draw `fn` the right way round on screen. The raycaster lays every face
 * mirrored; inside this, plain fillText and left-to-right layouts read as
 * drawn (a map, a chart, a row of figures).
 */
export function onScreen(ctx, fn) {
  ctx.save();
  ctx.translate(T, 0);
  ctx.scale(-1, 1);
  fn();
  ctx.restore();
}

/** Text drawn the way it reads on screen (for use inside onScreen). */
export function text(ctx, s, x, y, size, color, weight = 800, align = "center", maxW = 0) {
  ctx.font = `${weight} ${size}px Arial, Helvetica, sans-serif`;
  if (maxW) {
    const w = ctx.measureText(s).width;
    if (w > maxW) ctx.font = `${weight} ${Math.floor((size * maxW) / w)}px Arial, Helvetica, sans-serif`;
  }
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

/** Mark an area as giving light (screens, lamps): Realistic leaves it unlit. */
export function lit(x, y, w, h, a = 0.85, blur = 6) {
  emit((g) => {
    g.globalAlpha = a;
    g.fillRect(x, y, w, h);
  }, blur);
}

/** A wall clock: black rim, white face, the hands at h:m. */
export function clockFace(ctx, cx, cy, cr, h, m) {
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.arc(cx + 4, cy + 6, cr + 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1c20";
  ctx.beginPath();
  ctx.arc(cx, cy, cr + 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f4f2ea";
  ctx.beginPath();
  ctx.arc(cx, cy, cr, 0, Math.PI * 2);
  ctx.fill();
  relief((g) => {
    g.fillStyle = grey(26);
    g.beginPath();
    g.arc(cx, cy, cr + 6, 0, Math.PI * 2);
    g.fill();
  });
  onScreen(ctx, () => {
    const x = T - cx;
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const k = i % 5 ? cr * 0.06 : cr * 0.16;
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = i % 5 ? 1.5 : 3;
      ctx.beginPath();
      ctx.moveTo(x + Math.sin(a) * (cr - 4), cy - Math.cos(a) * (cr - 4));
      ctx.lineTo(x + Math.sin(a) * (cr - 4 - k), cy - Math.cos(a) * (cr - 4 - k));
      ctx.stroke();
    }
    const hand = (a, len, wdt, c) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = wdt;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x - Math.sin(a) * 8, cy + Math.cos(a) * 8);
      ctx.lineTo(x + Math.sin(a) * len, cy - Math.cos(a) * len);
      ctx.stroke();
    };
    hand(((h + m / 60) / 12) * Math.PI * 2, cr * 0.5, Math.max(3, cr * 0.09), "#1a1a1a");
    hand((m / 60) * Math.PI * 2, cr * 0.78, Math.max(2, cr * 0.06), "#1a1a1a");
    ctx.lineCap = "butt";
  });
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(3, cr * 0.07), 0, Math.PI * 2);
  ctx.fill();
}

/** A lit screen in a bezel: `draw(x, y, w, h)` paints its contents. */
export function screen(ctx, p, x, y, w, h, draw, tint = "#071018") {
  plate(ctx, x - 8, y - 8, w + 16, h + 16, p, { tones: ["#2a2e34", "#1c1f24", "#0e1013"], bevel: 3, ink: 2 });
  ctx.fillStyle = tint;
  ctx.fillRect(x, y, w, h);
  sink(x, y, w, h, 10);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  draw(x, y, w, h);
  ctx.restore();
  lit(x, y, w, h, 0.75, 6);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(x, y, w, h * 0.35);
}

/** A person in silhouette from the waist up (behind glass, in a photo). */
export function bust(ctx, x, y, s, color = "#0a0c10") {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - s * 1.25, s * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - s, y + s * 0.6);
  ctx.quadraticCurveTo(x - s * 0.95, y - s * 0.7, x, y - s * 0.72);
  ctx.quadraticCurveTo(x + s * 0.95, y - s * 0.7, x + s, y + s * 0.6);
  ctx.closePath();
  ctx.fill();
}

/** A heavy armour frame, front on: the C-series plate the squads wear. */
export function heavyFrame(ctx, x, y, s, tones = ["#6a7484", "#4b5568", "#262c38"], visor = "#ffb030") {
  const g = lin(ctx, x - s, 0, x + s, 0, [[0, tones[2]], [0.4, tones[0]], [1, tones[2]]]);
  ctx.fillStyle = g;
  // Helmet, visor slit.
  ctx.beginPath();
  ctx.roundRect(x - s * 0.34, y - s * 2.1, s * 0.68, s * 0.62, s * 0.18);
  ctx.fill();
  ctx.fillStyle = visor;
  ctx.fillRect(x - s * 0.24, y - s * 1.86, s * 0.48, s * 0.1);
  // Pauldrons, chest plate, belt.
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x - s * 0.95, y - s * 1.44, s * 0.6, s * 0.46, s * 0.14);
  ctx.roundRect(x + s * 0.35, y - s * 1.44, s * 0.6, s * 0.46, s * 0.14);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x - s * 0.6, y - s * 1.46, s * 1.2, s * 1.1, s * 0.12);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x - s * 0.04, y - s * 1.4, s * 0.08, s * 1.0);
  ctx.fillRect(x - s * 0.62, y - s * 0.38, s * 1.24, s * 0.12);
  // Arms and legs.
  ctx.fillStyle = g;
  ctx.fillRect(x - s * 0.92, y - s * 1.0, s * 0.3, s * 0.95);
  ctx.fillRect(x + s * 0.62, y - s * 1.0, s * 0.3, s * 0.95);
  ctx.fillRect(x - s * 0.5, y - s * 0.26, s * 0.42, s * 1.3);
  ctx.fillRect(x + s * 0.08, y - s * 0.26, s * 0.42, s * 1.3);
}
