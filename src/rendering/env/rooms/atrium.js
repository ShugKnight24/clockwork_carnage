/**
 * Wall painters for the atrium (src/data/levels/rooms/atrium.js places
 * them). Keyed by wall id.
 *
 * The upper floor of a two-storey hall: board-marked concrete with tall
 * glazing over the city, the department's anniversary banners, the great
 * clock at the end of the bridge and its plaque, and the glass balustrade
 * along the catwalk's edge. The balustrade is a low wall (WAIST): a short
 * wall shows the bottom of its texture, so the rail and glass are painted
 * in the lower two fifths.
 */
import { ATRIUM_WALLS as W } from "../../../data/levels/rooms/atrium.js";
import { letter } from "../locker-art.js";
import { T, lin, plate, rivet, lightStrip, raise, sink } from "../paint.js";
import { clockFace, lit } from "./east-kit.js";

const CONCRETE = ["#a8a8a2", "#96968f", "#7c7c76"];
const STEEL = ["#b4bcc6", "#868e98", "#4a5058"];
const DARK = ["#2a2e34", "#1c1f24", "#0e1013"];
const NAVY = ["#2e4a7a", "#22385e", "#16243e"];

const KICK = 470;

/** Board-marked concrete, the formwork's lines and tie holes. */
function concrete(ctx, p, r, top = 0, bottom = KICK) {
  ctx.fillStyle = lin(ctx, 0, top, 0, bottom, [[0, CONCRETE[2]], [0.5, CONCRETE[1]], [1, CONCRETE[0]]]);
  ctx.fillRect(0, top, T, bottom - top);
  for (let y = top + 40; y < bottom; y += 40) {
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(0, y, T, 2);
  }
  for (let y = top + 60; y < bottom; y += 120) {
    for (const x of [64, T / 2, T - 64]) {
      ctx.fillStyle = "rgba(30,30,30,0.45)";
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.06})`;
    ctx.fillRect(r() * T, top + r() * (bottom - top), 1 + r() * 3, 4 + r() * 30);
  }
  plate(ctx, 0, KICK, T, T - KICK, p, { tones: DARK, bevel: 3, ink: 2, spec: false });
}

/** The tall glazing: the morning city through it, mullions, a sill. */
function paintWall(ctx, p, r) {
  concrete(ctx, p, r);
  const x = 40, y = 30, w = T - 80, h = 380;
  ctx.fillStyle = lin(ctx, 0, y, 0, y + h, [[0, "#8ab4dc"], [0.55, "#d8c8a8"], [1, "#6a7a8a"]]);
  ctx.fillRect(x, y, w, h);
  sink(x, y, w, h, 24);
  lit(x, y, w, h, 0.3, 10);
  // Towers across the river, low sun on them.
  for (let i = 0; i < 7; i++) {
    const bw = 30 + r() * 40;
    const bh = 60 + r() * 160;
    const bx = x + r() * (w - bw);
    ctx.fillStyle = `rgba(${40 + r() * 30},${50 + r() * 30},${70 + r() * 30},0.85)`;
    ctx.fillRect(bx, y + h - bh, bw, bh);
    ctx.fillStyle = "rgba(255,220,160,0.35)";
    for (let k = 0; k < bh / 16; k++) ctx.fillRect(bx + 4, y + h - bh + 6 + k * 16, bw - 8, 3);
  }
  for (const mx of [x, x + w / 2 - 6, x + w - 12]) plate(ctx, mx, y, 12, h, p, { tones: STEEL, bevel: 2, ink: 1.5 });
  plate(ctx, x, y + h / 2 - 6, w, 12, p, { tones: STEEL, bevel: 2, ink: 1.5 });
  plate(ctx, x - 10, y + h, w + 20, 16, p, { tones: STEEL, bevel: 3, ink: 2 });
}

/** A hanging banner: CHRONOS PD, fifty years keeping the hour. */
function paintBanner(ctx, p, r) {
  concrete(ctx, p, r);
  plate(ctx, 120, 20, T - 240, 14, p, { tones: STEEL, bevel: 2, ink: 1.5 });
  plate(ctx, 136, 34, T - 272, 360, p, { tones: NAVY, bevel: 3, ink: 2, spec: false });
  ctx.fillStyle = "#d8b25a";
  ctx.fillRect(136, 60, T - 272, 6);
  ctx.fillRect(136, 360, T - 272, 6);
  letter(ctx, "50", T / 2, 140, 96, "#d8b25a", 900);
  letter(ctx, "YEARS", T / 2, 210, 30, "#f2f2ee", 900);
  letter(ctx, "KEEPING", T / 2, 262, 22, "#f2f2ee", 800);
  letter(ctx, "THE HOUR", T / 2, 292, 22, "#f2f2ee", 800);
  letter(ctx, "CHRONOS PD", T / 2, 336, 16, "#d8b25a", 900);
  raise(136, 34, T - 272, 360, 6);
}

/** The great clock, big enough to read from the far end of the bridge. */
function paintClock(ctx, p, r) {
  concrete(ctx, p, r);
  plate(ctx, 36, 40, T - 72, T - 72 - 40, p, { tones: ["#3a2a1a", "#2a1e12", "#160e08"], bevel: 6, ink: 3 });
  clockFace(ctx, T / 2, 240, 180, 6, 38);
  for (const [x, y] of [[60, 64], [T - 60, 64], [60, 416], [T - 60, 416]]) rivet(ctx, x, y, 6, p);
}

/** Its plaque: the clock's dedication. */
function paintPlaque(ctx, p, r) {
  concrete(ctx, p, r);
  plate(ctx, 70, 150, T - 140, 160, p, { tones: ["#e8cc7a", "#c8a24e", "#8a6a28"], bevel: 5, ink: 3 });
  letter(ctx, "THE STATION CLOCK", T / 2, 186, 22, "#2a1a08", 900);
  letter(ctx, "SET TO THE ENGINE", T / 2, 220, 16, "#3a2410", 800);
  letter(ctx, "NEVER A SECOND OUT", T / 2, 250, 16, "#3a2410", 800);
  letter(ctx, "DEDICATED BY THE BUREAU", T / 2, 286, 11, "#3a2410", 800);
}

/** The glass balustrade: a steel handrail over clear panels, posts between. */
function paintBalustrade(ctx, p, r) {
  // Above the rail (never seen on a low wall): the concrete, for a far view.
  concrete(ctx, p, r, 0, 300);
  const top = 312;
  // The panes on a plate of their own: Realistic's bake repaints a flat face.
  plate(ctx, 0, top, T, T - top, p, { tones: ["#b4d4ea", "#8cb0cc", "#5a7c98"], bevel: 2, ink: 0, spec: false });
  ctx.fillStyle = lin(ctx, 0, top, 0, T, [[0, "rgba(160,200,230,0.35)"], [1, "rgba(90,120,150,0.45)"]]);
  ctx.fillRect(0, top, T, T - top);
  ctx.fillStyle = "rgba(230,245,255,0.25)";
  for (const [a, b] of [[40, 110], [300, 340]]) {
    ctx.beginPath();
    ctx.moveTo(a, top + 20);
    ctx.lineTo(b, top + 20);
    ctx.lineTo(b - 60, T - 20);
    ctx.lineTo(a - 60, T - 20);
    ctx.closePath();
    ctx.fill();
  }
  for (const x of [0, T - 16]) plate(ctx, x, top, 16, T - top, p, { tones: STEEL, bevel: 2, ink: 1.5 });
  plate(ctx, 0, top - 4, T, 22, p, { tones: STEEL, bevel: 4, ink: 2 });
  lightStrip(ctx, 0, T - 22, T, 4, "#bfe8ff", { blur: 10, alpha: 0.5, housing: false });
  plate(ctx, 0, T - 16, T, 16, p, { tones: DARK, bevel: 2, ink: 1.5, spec: false });
}

export const PAINTERS = {
  [W.WALL]: paintWall,
  [W.BANNER]: paintBanner,
  [W.CLOCK]: paintClock,
  [W.PLAQUE]: paintPlaque,
  [W.BALUSTRADE]: paintBalustrade,
};
