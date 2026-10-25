/**
 * The city outside the civic wing's glass, at 06:47 on the morning of the
 * freeze, painted as the depth layers src/rendering/env/city-view.js draws
 * behind the panes (each one a band of 512px tiles that repeats along the
 * glass, laid at its own distance beyond it, so it slides past at its own
 * rate as you walk).
 *
 *   sky    the dawn, by the direction you look: indigo overhead warming to
 *          rose and gold, the sun just up in the south-east, stratus lit
 *          from under, the hills at the edge of the world.
 *   far    the old city in haze, 45 cells out: towers, domes, the great
 *          cogs on the roofs, mill chimneys trailing steam on the wind.
 *   mid    the far bank, 18 cells out: the clock spire at 06:47, blocks
 *          with their lamps still on, the sun on their east faces, the
 *          river under them with the windows in it.
 *   near   the embankment across the river road, 6 cells out: its rail,
 *          plane trees turning, lamps still lit, the trams' wires; the
 *          road and its rails under it.
 *
 * The hall stands on its terrace over the river: the street is well below
 * the floor (z, in wall heights: the floor 0, the eye about 0.5), so the
 * far bank sits just under the eye and the old city's roofs along it.
 *
 * And what moves in it (SPRITES): a tram each way along the river road,
 * airships on their way in. Nothing here is lettered, as nothing is
 * mirrored; the sun is on the left looking south, where most of the glass
 * looks.
 */
import { makeCanvas, rng, lin, rad } from "../paint.js";

/** The tile size every layer is cut into (the GPU wall pass's 512px layers). */
export const TS = 512;

/** The sun's bearing (radians, east 0, south π/2) and the sky's span of elevation. */
const SUN = 0.78;
export const SKY = { tiles: 4, sLo: -0.3, sHi: 0.9 };

/**
 * The layers, nearest first. `D` is cells beyond the glass, `period` the
 * cells of street one band of `tiles` covers, z the height range (floor 0,
 * ceiling 1) its rows span.
 */
export const LAYERS = [
  { name: "near", D: 6, period: 24, tiles: 2, zLo: -6, zHi: 1.5, seed: 61 },
  { name: "mid", D: 18, period: 48, tiles: 2, zLo: -5, zHi: 5.5, seed: 62 },
  { name: "far", D: 45, period: 96, tiles: 2, zLo: -4, zHi: 11, seed: 63 },
];

// Levels outside: the river road under the terrace, the embankment's rail,
// the far bank's quay and the water.
const STREET = -1.62;
const RAIL = -1.3;
const QUAY = -2.3;
const RIVER = -2.6;


/**
 * What moves: `band` is its quarter of the sprite tile (rows band*128..),
 * `len` cells long, z its rows' range, `speed` cells a second along the
 * glass (negative runs the other way, drawn turned round), once every
 * `period` cells.
 */
// A tram's rows span 1.95 wall heights, from just under its rails.
const tramAt = (z) => ({ zLo: z - 0.13, zHi: z + 1.82 });
export const SPRITES = [
  { name: "tram", band: 0, D: 4.4, len: 3.4, ...tramAt(STREET), speed: 1.6, period: 64, phase: 6 },
  { name: "tram2", band: 1, D: 17.4, len: 3.4, ...tramAt(QUAY), speed: -1.1, period: 44, phase: 30 },
  { name: "airship", band: 2, D: 30, len: 6, zLo: 2.2, zHi: 4.2, speed: 0.4, period: 150, phase: 60 },
  { name: "airship2", band: 2, D: 62, len: 6, zLo: 6.2, zHi: 8.2, speed: -0.28, period: 210, phase: 20 },
];

// The palette of the hour.
const HAZE = [214, 170, 172];
const SUNLIT = "rgba(255,190,130,";
const LAMP = ["#ffe2a0", "#ffd07a", "#ffeccc"];
const FRONTS = [[168, 84, 70], [196, 156, 120], [110, 110, 140], [206, 186, 170], [120, 84, 96], [150, 120, 90]];

const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

/**
 * Paint a band of `w` × TS that wraps at its ends: `draw(g, w, h)` paints
 * onto a canvas with a margin each side, and what spills past an end comes
 * back in at the other.
 */
function wrapped(w, draw) {
  const M = 256;
  const wide = makeCanvas(w + M * 2, TS);
  const g = wide.getContext("2d");
  g.translate(M, 0);
  draw(g, w, TS);
  const out = makeCanvas(w, TS);
  const o = out.getContext("2d");
  o.drawImage(wide, M, 0, w, TS, 0, 0, w, TS);
  o.drawImage(wide, 0, 0, M, TS, w - M, 0, M, TS);
  o.drawImage(wide, M + w, 0, M, TS, 0, 0, M, TS);
  wide.width = wide.height = 0;
  return out;
}

// ── Sky ─────────────────────────────────────────────────────────────────────

export function paintSky() {
  const W = TS * SKY.tiles;
  return wrapped(W, (g, w, h) => {
    const hz = (h * SKY.sHi) / (SKY.sHi - SKY.sLo);
    const r = rng(71);
    g.fillStyle = lin(g, 0, 0, 0, hz, [
      [0, "#232658"], [0.3, "#3c3f7c"], [0.55, "#6e5e98"],
      [0.74, "#b07a9e"], [0.87, "#e0928e"], [0.95, "#f6b08a"], [1, "#ffd2a2"],
    ]);
    g.fillRect(-256, 0, w + 512, hz);
    // Below the line: the haze over the plain, where nothing nearer covers it.
    g.fillStyle = lin(g, 0, hz, 0, h, [[0, "#d8a8a4"], [0.3, "#a08498"], [1, "#5a5070"]]);
    g.fillRect(-256, hz, w + 512, h - hz);
    // The sun, just clear of the hills, and the sky warm round it.
    const sx = (SUN / Math.PI) * w;
    for (const x of [sx, sx - w, sx + w]) {
      g.save();
      g.translate(x, hz);
      g.scale(2.6, 1);
      g.fillStyle = rad(g, 0, 0, 0, 230, [[0, "rgba(255,240,200,0.95)"], [0.2, "rgba(255,206,150,0.6)"], [0.55, "rgba(255,160,130,0.22)"], [1, "rgba(255,140,120,0)"]]);
      g.fillRect(-240, -240, 480, 480);
      g.restore();
    }
    // The cold side of the sky, away from the sun.
    const cx = sx + w / 2;
    for (const x of [cx, cx - w]) {
      g.fillStyle = rad(g, x, hz, 0, 700, [[0, "rgba(60,60,120,0.32)"], [1, "rgba(60,60,120,0)"]]);
      g.fillRect(x - 700, 0, 1400, hz);
    }
    // Stratus in long bands: violet on top, lit pink and gold from below,
    // brightest toward the sun.
    for (let i = 0; i < 46; i++) {
      const x = r() * w;
      const y = hz * (0.12 + r() * 0.78);
      const len = 80 + r() * 320;
      const th = 3 + r() * 9 * (y / hz);
      const near = Math.max(0, 1 - Math.abs(((x - sx + w * 1.5) % w) - w / 2) / (w * 0.4));
      g.fillStyle = `rgba(${96 + near * 40},${80 + near * 20},${130},${0.35 + r() * 0.3})`;
      g.beginPath();
      g.ellipse(x, y, len, th, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = `rgba(255,${150 + near * 70},${130 + near * 30},${0.25 + near * 0.5})`;
      g.beginPath();
      g.ellipse(x + len * 0.08, y + th * 0.45, len * 0.85, th * 0.5, 0, 0, Math.PI * 2);
      g.fill();
    }
    // The sun's disc, half over the hills.
    g.fillStyle = "#fff6dc";
    g.beginPath();
    g.arc(sx, hz - 4, 15, 0, Math.PI * 2);
    g.fill();
    // Hills at the edge of the world, two ranges in haze.
    for (const [lift, col, amp] of [[26, "rgba(150,112,140,0.75)", 18], [12, "rgba(176,128,146,0.9)", 10]]) {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(-256, hz + 2);
      for (let x = -256; x <= w + 256; x += 16) {
        const y = hz - lift * 0.4 - amp * (0.5 + 0.5 * Math.sin(x * 0.004 + lift) * Math.sin(x * 0.0117 + 1.3));
        g.lineTo(x, y);
      }
      g.lineTo(w + 256, hz + 2);
      g.closePath();
      g.fill();
    }
    // Birds, a few, high.
    g.strokeStyle = "rgba(40,30,60,0.55)";
    g.lineWidth = 1.2;
    for (let i = 0; i < 14; i++) {
      const x = r() * w, y = hz * (0.35 + r() * 0.4), s = 2 + r() * 2.5;
      g.beginPath();
      g.moveTo(x - s, y - s * 0.6);
      g.quadraticCurveTo(x - s * 0.4, y - s * 0.8, x, y);
      g.quadraticCurveTo(x + s * 0.4, y - s * 0.8, x + s, y - s * 0.6);
      g.stroke();
    }
  });
}

// ── Pieces of the city ──────────────────────────────────────────────────────

/** A cog in silhouette: centre, radius, teeth. */
function cog(g, x, y, R, n, col, hub = null) {
  g.fillStyle = col;
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a0 = (i / (n * 2)) * Math.PI * 2;
    const a1 = ((i + 1) / (n * 2)) * Math.PI * 2;
    const rr = i % 2 ? R : R * 1.16;
    g.lineTo(x + Math.cos(a0) * rr, y + Math.sin(a0) * rr);
    g.lineTo(x + Math.cos(a1) * rr, y + Math.sin(a1) * rr);
  }
  g.closePath();
  g.fill();
  if (hub) {
    g.fillStyle = hub;
    g.beginPath();
    g.arc(x, y, R * 0.55, 0, Math.PI * 2);
    g.arc(x, y, R * 0.2, 0, Math.PI * 2, true);
    g.fill("evenodd");
  }
}

/** Steam off a chimney top, drifting east to west on the morning air. */
function plume(g, r, x, y, s, n = 14, alpha = 0.55) {
  let px = x, py = y, rr = s;
  for (let i = 0; i < n; i++) {
    const k = i / n;
    const a = alpha * (1 - k) ** 1.4;
    g.fillStyle = `rgba(255,${226 - k * 30},${214 - k * 20},${a})`;
    g.beginPath();
    g.arc(px, py, rr, 0, Math.PI * 2);
    g.fill();
    // Lit from the sun's side, shadowed on the other.
    g.fillStyle = `rgba(110,90,130,${a * 0.45})`;
    g.beginPath();
    g.arc(px + rr * 0.35, py + rr * 0.2, rr * 0.8, 0, Math.PI * 2);
    g.fill();
    px += s * (0.5 + r() * 0.6) + k * s * 1.2;
    py -= s * (0.9 - k * 0.5) + r() * s * 0.3;
    rr *= 1.12 + r() * 0.06;
  }
}

/**
 * One building, lit by the low sun from the left: its east face warm, its
 * front in the blue of the hour, windows lit or dark. `x`, `y` its top-left
 * in pixels, `base` its foot. `wx`, `wy` the window pitch. Returns the lit
 * windows for the river to reflect.
 */
function block(g, r, x, y, w, base, o) {
  const c = o.color;
  const lit = [];
  g.fillStyle = css(c);
  g.fillRect(x, y, w, base - y);
  // The sun on its east side and along its parapet.
  const side = Math.max(2, w * (o.side ?? 0.16));
  g.fillStyle = lin(g, x, 0, x + side, 0, [[0, SUNLIT + (o.sun ?? 0.55) + ")"], [1, SUNLIT + "0)"]]);
  g.fillRect(x, y, side, base - y);
  g.fillStyle = SUNLIT + (o.sun ?? 0.55) * 0.9 + ")";
  g.fillRect(x, y, w, Math.max(1, o.wy * 0.25));
  // Shade toward its foot, where the street's still in night.
  g.fillStyle = lin(g, 0, y, 0, base, [[0, "rgba(30,20,50,0)"], [1, "rgba(30,20,50,0.35)"]]);
  g.fillRect(x, y, w, base - y);
  const { wx, wy } = o;
  const ww = Math.max(1, wx * 0.5), wh = Math.max(1, wy * 0.55);
  for (let yy = y + wy * 0.7; yy < base - wy * 0.8; yy += wy) {
    for (let xx = x + wx * 0.5; xx < x + w - wx * 0.6; xx += wx) {
      const on = r() < (o.lit ?? 0.35);
      if (on) {
        g.fillStyle = LAMP[(r() * 3) | 0];
        lit.push([xx + ww / 2, yy]);
      } else {
        // Dark glass, some of it catching the dawn.
        g.fillStyle = r() < 0.25 ? "rgba(240,160,150,0.55)" : "rgba(28,24,48,0.7)";
      }
      g.fillRect(xx, yy, ww, wh);
    }
  }
  return lit;
}

/** A mansard roof or a stepped crown over a block. */
function roof(g, r, x, y, w, c, kind) {
  g.fillStyle = css(mix(c, [40, 30, 60], 0.3));
  g.beginPath();
  if (kind === 0) {
    const h = w * 0.22;
    g.moveTo(x - 2, y);
    g.lineTo(x + w * 0.12, y - h);
    g.lineTo(x + w * 0.88, y - h);
    g.lineTo(x + w + 2, y);
  } else if (kind === 1) {
    for (let k = 0; k < 3; k++) {
      const inset = w * (0.1 + k * 0.14);
      g.rect(x + inset, y - (k + 1) * w * 0.09, w - inset * 2, w * 0.09 + 1);
    }
  } else {
    g.moveTo(x + w * 0.2, y);
    g.arc(x + w / 2, y, w * 0.3, Math.PI, 0);
  }
  g.fill();
  if (kind === 2) {
    g.fillStyle = SUNLIT + "0.5)";
    g.beginPath();
    g.arc(x + w / 2, y, w * 0.3, Math.PI, Math.PI * 1.45);
    g.lineTo(x + w / 2, y);
    g.fill();
  }
}

// ── Far: the old city in haze ───────────────────────────────────────────────

function paintFar(L) {
  const W = TS * L.tiles;
  const Y = (z) => ((L.zHi - z) / (L.zHi - L.zLo)) * TS;
  const px = W / L.period;
  return wrapped(W, (g, w) => {
    const r = rng(L.seed);
    const ground = Y(QUAY - 0.2);
    const stacks = [];
    // Two ranks of towers, the back one fainter.
    for (const [rank, n, hz] of [[0, 60, 0.62], [1, 46, 0.4]]) {
      for (let i = 0; i < n; i++) {
        const bw = px * (1 + r() * 2.6);
        const x = r() * w;
        const top = Y((rank ? -1.7 : -1.1) + r() ** 2.2 * (rank ? 3.4 : r() < 0.06 ? 7 : 4.6));
        const c = mix([88 + r() * 30, 72 + r() * 20, 104 + r() * 24], HAZE, hz);
        block(g, r, x, top, bw, ground, { color: c, wx: px * 0.32, wy: px * 0.36, lit: 0.12, sun: 0.35 * (1 - hz), side: 0.2 });
        if (r() < 0.35) roof(g, r, x, top, bw, c, (r() * 3) | 0);
        if (r() < 0.12) {
          // A mast with its warning lamp.
          g.fillStyle = css(c);
          g.fillRect(x + bw / 2 - 1, top - px * 1.6, 2, px * 1.6);
          g.fillStyle = "rgba(255,80,60,0.9)";
          g.fillRect(x + bw / 2 - 1.5, top - px * 1.6 - 2, 3, 3);
        }
      }
      if (rank === 0) {
        // The haze between the ranks.
        g.fillStyle = css(HAZE, 0.35);
        g.fillRect(-256, 0, w + 512, ground);
      }
    }
    // The great cogs of the old clockworks, on their frames over the roofs.
    for (let i = 0; i < 5; i++) {
      const x = ((i + r() * 0.6) / 5) * w, R = px * (1.4 + r() * 1.8);
      const y = Y(-0.4 + r() * 1.8);
      const c = css(mix([96, 80, 108], HAZE, 0.42));
      g.fillStyle = c;
      g.fillRect(x - R * 0.12, y, R * 0.24, ground - y);
      cog(g, x, y, R, 10 + ((r() * 8) | 0), c, css(mix([150, 110, 120], HAZE, 0.3)));
    }
    // Mill chimneys and a gasholder.
    for (let i = 0; i < 9; i++) {
      const x = r() * w, cw = px * (0.35 + r() * 0.3);
      const top = Y(0.2 + r() * 2.2);
      const c = mix([80, 64, 92], HAZE, 0.38);
      g.fillStyle = css(c);
      g.beginPath();
      g.moveTo(x, ground);
      g.lineTo(x + cw * 0.15, top);
      g.lineTo(x + cw * 0.85, top);
      g.lineTo(x + cw, ground);
      g.fill();
      g.fillStyle = SUNLIT + "0.3)";
      g.fillRect(x + cw * 0.15, top, cw * 0.2, ground - top);
      stacks.push([x + cw / 2, top, cw * 0.6]);
    }
    const gx = r() * w, gr = px * 2.2, gt = Y(-0.7);
    g.fillStyle = css(mix([100, 84, 110], HAZE, 0.45));
    g.fillRect(gx, gt, gr * 2, ground - gt);
    g.strokeStyle = css(mix([70, 60, 90], HAZE, 0.4));
    g.lineWidth = 1;
    for (let k = 0; k <= 6; k++) g.strokeRect(gx + (k * gr) / 3 - 1, gt - 4, 2, ground - gt + 4);
    for (const [x, y, s] of stacks) plume(g, r, x, y, s, 12, 0.5);
    // The morning mist lying along the river and in the streets.
    g.fillStyle = lin(g, 0, Y(-0.6), 0, ground, [[0, css(HAZE, 0)], [0.6, css(HAZE, 0.45)], [1, css([226, 186, 180], 0.95)]]);
    g.fillRect(-256, Y(-0.6), w + 512, ground - Y(-0.6));
    g.fillStyle = css([226, 186, 180]);
    g.fillRect(-256, ground, w + 512, TS - ground);
  });
}

// ── Mid: the far bank and the river ─────────────────────────────────────────

/** The clock spire over the far bank, its face at 06:47. */
function spire(g, x, Y, px, ground) {
  const w = px * 1.5;
  const top = Y(QUAY + 3.4);
  const stone = [134, 116, 122];
  block(g, rng(5), x, top, w, ground, { color: stone, wx: px * 0.38, wy: px * 0.5, lit: 0.5, sun: 0.7, side: 0.24 });
  // The belfry, the clock stage and the copper spire over it.
  const bw = w * 0.8, bx = x + (w - bw) / 2;
  const bt = Y(QUAY + 4.4);
  g.fillStyle = css(mix(stone, [255, 220, 200], 0.08));
  g.fillRect(bx, bt, bw, top - bt);
  g.fillStyle = lin(g, bx, 0, bx + bw * 0.3, 0, [[0, SUNLIT + "0.6)"], [1, SUNLIT + "0)"]]);
  g.fillRect(bx, bt, bw * 0.3, top - bt);
  const cx = x + w / 2, cy = (bt + top) / 2, cr = Math.min(bw, top - bt) * 0.4;
  g.fillStyle = "rgba(255,226,160,0.35)";
  g.beginPath();
  g.arc(cx, cy, cr * 1.6, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#3a2c22";
  g.beginPath();
  g.arc(cx, cy, cr * 1.12, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#fff0c4";
  g.beginPath();
  g.arc(cx, cy, cr, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#2a1e16";
  g.lineCap = "round";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.lineWidth = i % 3 ? 1 : 2;
    g.beginPath();
    g.moveTo(cx + Math.sin(a) * cr * 0.8, cy - Math.cos(a) * cr * 0.8);
    g.lineTo(cx + Math.sin(a) * cr * 0.95, cy - Math.cos(a) * cr * 0.95);
    g.stroke();
  }
  const hand = (a, len, lw) => {
    g.lineWidth = lw;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.sin(a) * len, cy - Math.cos(a) * len);
    g.stroke();
  };
  hand(((6 + 47 / 60) / 12) * Math.PI * 2, cr * 0.5, 3);
  hand((47 / 60) * Math.PI * 2, cr * 0.8, 2);
  g.lineCap = "butt";
  const st = Y(QUAY + 6);
  g.fillStyle = "#5e8c7c";
  g.beginPath();
  g.moveTo(bx - 3, bt);
  g.lineTo(cx, st);
  g.lineTo(bx + bw + 3, bt);
  g.fill();
  g.fillStyle = "rgba(255,200,150,0.55)";
  g.beginPath();
  g.moveTo(bx - 3, bt);
  g.lineTo(cx, st);
  g.lineTo(cx - bw * 0.12, bt);
  g.fill();
  g.fillStyle = "#e0bc62";
  g.fillRect(cx - 1, st - 8, 2, 8);
}

function paintMid(L) {
  const W = TS * L.tiles;
  const Y = (z) => ((L.zHi - z) / (L.zHi - L.zLo)) * TS;
  const px = W / L.period;
  return wrapped(W, (g, w) => {
    const r = rng(L.seed);
    const ground = Y(QUAY);
    const lit = [];
    const stacks = [];
    // A back row, set into the haze, then the bank's own frontage.
    for (let x = -px; x < w; ) {
      const bw = px * (1.2 + r() * 2.2);
      const top = Y(QUAY + 1.4 + r() * 1.7);
      const c = mix([96 + r() * 26, 78 + r() * 18, 110 + r() * 20], HAZE, 0.4);
      block(g, r, x, top, bw, ground, { color: c, wx: px * 0.3, wy: px * 0.34, lit: 0.22, sun: 0.4 });
      if (r() < 0.5) roof(g, r, x, top, bw, c, (r() * 3) | 0);
      x += bw * (0.6 + r() * 0.5);
    }
    g.fillStyle = css(HAZE, 0.22);
    g.fillRect(-256, 0, w + 512, ground);
    // A cog turning the old water-works.
    const cogX = w * 0.7, cogY = Y(QUAY + 2.2);
    cog(g, cogX, cogY, px * 1.3, 14, "#6a5464", "#a07870");
    cog(g, cogX + px * 1.9, cogY + px * 0.7, px * 0.8, 10, "#62505e", "#9a7270");
    for (let x = -px * 0.5; x < w; ) {
      const bw = px * (1 + r() * 1.8);
      const top = Y(QUAY + 0.7 + r() * 1.6);
      // Brick, sandstone, slate and render, all still in the blue of the hour.
      const c = mix(FRONTS[(r() * FRONTS.length) | 0], [70, 60, 110], 0.38 + r() * 0.12);
      lit.push(...block(g, r, x, top, bw, ground, { color: c, wx: px * 0.34, wy: px * 0.4, lit: 0.38, sun: 0.75, side: 0.22 }));
      // A cornice and a string course.
      g.fillStyle = css(mix(c, [255, 220, 200], 0.25));
      g.fillRect(x - 1, top, bw + 2, Math.max(2, px * 0.08));
      g.fillStyle = css(mix(c, [20, 14, 30], 0.3));
      g.fillRect(x, top + (ground - top) * 0.32, bw, Math.max(1, px * 0.05));
      if (r() < 0.6) roof(g, r, x, top, bw, c, (r() * 3) | 0);
      if (r() < 0.28) {
        const cx = x + bw * (0.2 + r() * 0.6), ct = top - px * (0.6 + r() * 1.2);
        g.fillStyle = css(mix(c, [40, 30, 50], 0.3));
        g.fillRect(cx - px * 0.12, ct, px * 0.24, top - ct + 2);
        stacks.push([cx, ct, px * 0.16]);
      }
      x += bw + r() * px * 0.3;
    }
    spire(g, w * 0.22, Y, px, ground);
    for (const [x, y, s] of stacks) plume(g, r, x, y, s, 12, 0.5);
    // The quay along the bank, then the river.
    g.fillStyle = "#7a6872";
    g.fillRect(-256, ground, w + 512, Y(RIVER) - ground);
    g.fillStyle = SUNLIT + "0.35)";
    g.fillRect(-256, ground, w + 512, 2);
    const wTop = Y(RIVER);
    g.fillStyle = lin(g, 0, wTop, 0, TS, [[0, "#b88a9a"], [0.25, "#8a6e92"], [1, "#3c3a62"]]);
    g.fillRect(-256, wTop, w + 512, TS - wTop);
    // The far bank in the water, broken up: its lit windows, the sky between.
    for (const [x, y] of lit) {
      const d = ground - y;
      const yy = wTop + d * 0.35 + 2;
      if (yy > TS) continue;
      g.fillStyle = `rgba(255,214,150,${0.5 - Math.min(0.4, d / TS)})`;
      for (let k = 0; k < 3; k++) g.fillRect(x - 2 + (r() - 0.5) * 3, yy + k * 3, 4 + r() * 3, 1);
    }
    for (let i = 0; i < 260; i++) {
      const y = wTop + 4 + r() ** 0.7 * (TS - wTop - 4);
      g.fillStyle = r() < 0.5 ? `rgba(255,200,170,${0.2 + r() * 0.3})` : `rgba(40,36,80,${0.15 + r() * 0.2})`;
      g.fillRect(r() * w, y, 6 + r() * 26, 1);
    }
    // A barge on the stream, its stack smoking.
    const bx = w * 0.52, by = wTop + px * 0.55;
    g.fillStyle = "#2c2232";
    g.beginPath();
    g.moveTo(bx, by);
    g.lineTo(bx + px * 2.6, by);
    g.lineTo(bx + px * 2.4, by + px * 0.28);
    g.lineTo(bx + px * 0.2, by + px * 0.28);
    g.fill();
    g.fillRect(bx + px * 1.6, by - px * 0.45, px * 0.6, px * 0.45);
    g.fillStyle = LAMP[0];
    g.fillRect(bx + px * 1.7, by - px * 0.32, px * 0.14, px * 0.12);
    plume(g, r, bx + px * 1.8, by - px * 0.6, px * 0.12, 8, 0.45);
  });
}

// ── Near: the embankment over the river road ────────────────────────────────

function paintNear(L) {
  const W = TS * L.tiles;
  const Y = (z) => ((L.zHi - z) / (L.zHi - L.zLo)) * TS;
  const px = W / L.period;
  return wrapped(W, (g, w) => {
    const r = rng(L.seed);
    const rail = Y(RAIL), kerb = Y(STREET);
    // The road: asphalt still damp from the night, the tram rails in it.
    g.fillStyle = lin(g, 0, kerb, 0, TS, [[0, "#4c4656"], [0.4, "#3e3a4a"], [1, "#2e2c3a"]]);
    g.fillRect(-256, kerb, w + 512, TS - kerb);
    for (const z of [-0.33, -0.46, -0.93, -1.08].map((d) => STREET + d)) {
      g.fillStyle = "rgba(240,200,190,0.55)";
      g.fillRect(-256, Y(z), w + 512, 1.5);
      g.fillStyle = "rgba(20,16,30,0.5)";
      g.fillRect(-256, Y(z) + 1.5, w + 512, 1);
    }
    for (let x = 0; x < w; x += px * 2) {
      g.fillStyle = "rgba(230,220,200,0.35)";
      g.fillRect(x, Y(STREET - 0.7), px, 2);
    }
    // The pavement this side, under the glass: granite setts.
    const pav = Y(STREET - 2);
    g.fillStyle = lin(g, 0, pav, 0, TS, [[0, "#8a7e86"], [1, "#6a6070"]]);
    g.fillRect(-256, pav, w + 512, TS - pav);
    g.fillStyle = "rgba(40,30,50,0.3)";
    for (let y = pav + 10; y < TS; y += 14) g.fillRect(-256, y, w + 512, 1);
    g.fillStyle = "#a89a98";
    g.fillRect(-256, pav - 4, w + 512, 5);
    // The embankment: kerb, pavement, parapet.
    g.fillStyle = "#9a8c90";
    g.fillRect(-256, rail + px * 0.18, w + 512, kerb - rail - px * 0.18);
    g.fillStyle = SUNLIT + "0.25)";
    g.fillRect(-256, rail + px * 0.18, w + 512, 2);
    g.fillStyle = "#6e6270";
    g.fillRect(-256, kerb - 4, w + 512, 4);
    // Trees along it, the planes turning for October.
    const lamps = [];
    for (let i = 0; i < L.period / 4; i++) lamps.push(i * px * 4 + px * 0.5);
    for (const lx of lamps) {
      const tx = lx + px * 2;
      // The trunk, mottled as planes are, and its first boughs.
      g.fillStyle = "#4a3c3a";
      g.fillRect(tx - px * 0.07, Y(RAIL + 0.9), px * 0.14, rail + px * 0.2 - Y(RAIL + 0.9));
      g.fillStyle = "rgba(200,180,150,0.35)";
      for (let k = 0; k < 6; k++) g.fillRect(tx - px * 0.07 + r() * px * 0.08, Y(RAIL + 0.9) + r() * (rail - Y(RAIL + 0.9)), px * 0.05, px * 0.08);
      g.strokeStyle = "#3e302e";
      g.lineWidth = Math.max(2, px * 0.06);
      g.beginPath();
      for (const d of [-1, 1]) {
        g.moveTo(tx, Y(RAIL + 1.05));
        g.quadraticCurveTo(tx + d * px * 0.25, Y(RAIL + 1.3), tx + d * px * 0.55, Y(RAIL + 1.6));
      }
      g.stroke();
      for (let k = 0; k < 64; k++) {
        const a = r() * Math.PI * 2, d = r() ** 0.5;
        const cx = tx + Math.cos(a) * d * px * 0.9;
        const cy = Y(RAIL + 1.55) + Math.sin(a) * d * px * 0.62;
        const rr = px * (0.1 + r() * 0.13);
        const tone = [[200, 120, 60], [224, 164, 70], [150, 92, 50], [116, 124, 64]][(r() * 4) | 0];
        g.fillStyle = css(mix(tone, [60, 40, 70], 0.15 + (Math.cos(a) * 0.5 + 0.5) * 0.35));
        g.beginPath();
        g.arc(cx, cy, rr, 0, Math.PI * 2);
        g.fill();
        if (Math.cos(a) < -0.2) {
          g.fillStyle = SUNLIT + "0.35)";
          g.beginPath();
          g.arc(cx - rr * 0.3, cy - rr * 0.2, rr * 0.6, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    // The rail: cast iron, a baluster every hand's width.
    g.fillStyle = "#2a2230";
    g.fillRect(-256, rail, w + 512, 3);
    g.fillRect(-256, rail + px * 0.16, w + 512, 2);
    for (let x = -256; x < w + 256; x += px * 0.12) g.fillRect(x, rail, 1.5, px * 0.18);
    // The lamps, still lit, and the trams' wire hung from them.
    const wire = Y(RAIL + 1);
    for (const lx of lamps) {
      g.fillStyle = "#241c28";
      g.fillRect(lx - 2, Y(RAIL + 1.25), 4, rail - Y(RAIL + 1.25) + px * 0.2);
      g.fillRect(lx - 5, rail + px * 0.08, 10, px * 0.12);
      g.fillRect(lx, wire - 1, px * 0.5, 2);
      g.fillStyle = rad(g, lx, Y(RAIL + 1.35), 0, px * 0.7, [[0, "rgba(255,226,170,0.55)"], [1, "rgba(255,200,140,0)"]]);
      g.fillRect(lx - px, Y(RAIL + 1.35) - px, px * 2, px * 2);
      g.fillStyle = "#fff0c8";
      g.beginPath();
      g.arc(lx, Y(RAIL + 1.35), px * 0.12, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#241c28";
      g.fillRect(lx - px * 0.14, Y(RAIL + 1.35) - px * 0.16, px * 0.28, 3);
    }
    g.strokeStyle = "rgba(30,24,36,0.8)";
    g.lineWidth = 1.2;
    g.beginPath();
    for (let x = -256; x < w + 256; x += px * 4) {
      g.moveTo(x, wire);
      g.quadraticCurveTo(x + px * 2, wire + 5, x + px * 4, wire);
    }
    g.stroke();
  });
}

// ── What moves ──────────────────────────────────────────────────────────────

/** A tram in its livery, lit inside, a few early riders. */
function tram(g, y0, body, trim) {
  const h = 128, w = TS;
  const zLo = -0.75, zHi = 1.2;
  const Y = (z) => y0 + ((zHi - z) / (zHi - zLo)) * h;
  const bt = Y(0.5), bb = Y(-0.62);
  g.fillStyle = "#1c1820";
  for (const x of [60, 120, w - 120, w - 60]) {
    g.beginPath();
    g.arc(x, bb + 2, 8, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = body;
  g.beginPath();
  g.roundRect(6, bt, w - 12, bb - bt, [18, 18, 6, 6]);
  g.fill();
  g.fillStyle = "#f0e6d0";
  g.fillRect(6, bt + (bb - bt) * 0.18, w - 12, (bb - bt) * 0.42);
  g.fillStyle = trim;
  g.fillRect(6, bt + (bb - bt) * 0.62, w - 12, 4);
  for (let x = 30; x < w - 50; x += 46) {
    g.fillStyle = "#ffe2a8";
    g.fillRect(x, bt + (bb - bt) * 0.22, 34, (bb - bt) * 0.34);
    if ((x / 46) % 3 < 1.5) {
      g.fillStyle = "rgba(40,30,30,0.7)";
      g.beginPath();
      g.arc(x + 17, bt + (bb - bt) * 0.4, 6, 0, Math.PI * 2);
      g.fill();
      g.fillRect(x + 9, bt + (bb - bt) * 0.44, 16, 10);
    }
  }
  g.fillStyle = "rgba(255,200,140,0.5)";
  g.fillRect(6, bt, w - 12, 3);
  // The pole up to the wire, and the headlamps.
  g.strokeStyle = "#1c1820";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(w * 0.4, bt);
  g.lineTo(w * 0.5, Y(1.15));
  g.lineTo(w * 0.6, bt);
  g.stroke();
  g.fillStyle = "#fff4d0";
  for (const x of [14, w - 18]) g.fillRect(x, bb - 14, 5, 6);
}

/** An airship coming in: a ribbed silver hull, the gondola lit under it. */
function airship(g, y0) {
  const h = 128, w = TS;
  const cx = w / 2, cy = y0 + 54, rx = w * 0.45, ry = 34;
  g.fillStyle = lin(g, 0, cy - ry, 0, cy + ry, [[0, "#f2e4dc"], [0.5, "#b8aab8"], [1, "#5e5470"]]);
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(60,50,80,0.35)";
  g.lineWidth = 1.5;
  for (let k = 1; k < 9; k++) {
    const x = cx - rx + (k / 9) * rx * 2;
    const yy = ry * Math.sqrt(1 - ((x - cx) / rx) ** 2);
    g.beginPath();
    g.moveTo(x, cy - yy);
    g.lineTo(x, cy + yy);
    g.stroke();
  }
  // Fins at the tail (left: it flies to the right).
  g.fillStyle = "#6e5e76";
  g.beginPath();
  g.moveTo(cx - rx * 0.78, cy - 6);
  g.lineTo(cx - rx * 1.02, cy - ry - 14);
  g.lineTo(cx - rx * 0.95, cy - 4);
  g.moveTo(cx - rx * 0.78, cy + 6);
  g.lineTo(cx - rx * 1.02, cy + ry + 14);
  g.lineTo(cx - rx * 0.95, cy + 4);
  g.fill();
  g.fillStyle = "#3a3048";
  g.beginPath();
  g.roundRect(cx - 50, cy + ry - 4, 100, 22, 6);
  g.fill();
  g.fillStyle = "#ffe2a8";
  for (let x = cx - 40; x < cx + 40; x += 14) g.fillRect(x, cy + ry + 2, 8, 7);
  g.fillStyle = "#ff5a3a";
  g.fillRect(cx + rx - 6, cy - 3, 5, 5);
  g.fillStyle = "#6aff8a";
  g.fillRect(cx - rx * 0.9, cy - 3, 4, 4);
  g.fillStyle = "rgba(255,200,150,0.35)";
  g.beginPath();
  g.ellipse(cx - rx * 0.2, cy - ry * 0.45, rx * 0.6, ry * 0.3, 0, 0, Math.PI * 2);
  g.fill();
}

export function paintSprites() {
  const c = makeCanvas(TS);
  const g = c.getContext("2d");
  tram(g, 0, "#b8402e", "#e0bc62");
  tram(g, 128, "#2e6a52", "#e0bc62");
  airship(g, 256);
  return c;
}

/** Paint layer `name` as one band (`tiles` × TS wide). */
export function paintLayer(L) {
  return L.name === "far" ? paintFar(L) : L.name === "mid" ? paintMid(L) : paintNear(L);
}
