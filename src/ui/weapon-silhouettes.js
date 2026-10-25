/**
 * Side-profile weapon icons for the HUDs, one per weapon id.
 *
 * Flat visor glyphs, the way a helmet readout draws a gun: one light body
 * silhouette with panel cuts, muzzle right, and the weapon's energy parts as
 * a separate accent layer. Every icon is drawn on the same 160x56 grid at one
 * scale, so a sidearm reads smaller than a rifle and the set stays consistent
 * (the old icons were orthographic renders of the 3D viewmodels, dark
 * gunmetal that sank into the panels at slot size).
 *
 * Two layers per weapon (body and glow) are rasterised once per size bucket,
 * colour and art style; drawing an icon is then two drawImage calls. The glow
 * layer takes the weapon's colour, or its finish's energy colour.
 */

import { WEAPONS } from "../data/weapons.js";
import { activeFinish, finishKey } from "../data/weapon-skins.js";
import { isModernArt, isRealisticArt, onArtStyleChange } from "../rendering/art-style.js";

export const SILHOUETTE_BOX = [0, 0, 160, 56];

// ─── Shapes ─────────────────────────────────────────────────────────────────
// Each weapon: `body` polygons (unioned), `cut` polygons punched out of the
// body (panel seams, trigger guards), `glow` polygons in the accent colour.
// Flat arrays of x,y pairs on the 160x56 grid. Circles are [cx, cy, r].

const ICONS = {
  // Chrono Pistol: compact sidearm, coil along the slide, emitter ring.
  0: {
    body: [
      [38, 15, 120, 15, 126, 18, 126, 27, 38, 27],
      [42, 27, 116, 27, 116, 31, 76, 31, 72, 34, 42, 34],
      [62, 31, 80, 31, 80, 38, 75, 42, 62, 42],
      [42, 30, 62, 30, 60, 37, 55, 52, 37, 52, 41, 37],
      [124, 17, 130, 17, 130, 28, 124, 28],
    ],
    cut: [
      [66, 33, 76, 33, 76, 37, 73, 39, 66, 39],
      [38, 26, 116, 26, 116, 27, 38, 27],
      [45, 38, 55, 38, 53, 40, 44, 40],
    ],
    glow: [[58, 19, 112, 19, 112, 22, 58, 22], [127, 20, 130, 20, 130, 25, 127, 25]],
  },
  // Temporal Shotgun: long barrel over a magazine tube, ribbed pump, stock.
  1: {
    body: [
      [78, 15, 152, 15, 152, 22, 78, 22],
      [80, 23, 140, 23, 140, 28, 80, 28],
      [92, 22, 128, 22, 130, 25, 130, 32, 92, 32],
      [44, 13, 84, 13, 84, 30, 44, 30],
      [54, 29, 70, 29, 68, 37, 56, 37],
      [8, 19, 46, 15, 46, 30, 40, 31, 22, 40, 8, 43],
    ],
    cut: [
      [58, 31, 66, 31, 65, 35, 59, 35],
      [97, 25, 99, 25, 99, 31, 97, 31],
      [103, 25, 105, 25, 105, 31, 103, 31],
      [109, 25, 111, 25, 111, 31, 109, 31],
      [115, 25, 117, 25, 117, 31, 115, 31],
      [12, 23, 30, 21, 30, 23, 12, 26],
      [78, 22, 152, 22, 152, 23, 78, 23],
    ],
    glow: [[50, 18, 78, 18, 78, 21, 50, 21], [146, 16, 152, 16, 152, 21, 146, 21]],
  },
  // Phase Rifle: rail-sighted carbine, angled mag, energy line on the guard.
  2: {
    body: [
      [118, 19, 154, 19, 154, 24, 118, 24],
      [86, 14, 120, 14, 126, 18, 126, 28, 86, 28],
      [40, 12, 90, 12, 90, 28, 40, 28],
      [52, 7, 80, 7, 80, 12, 52, 12],
      [62, 27, 76, 27, 81, 44, 68, 46],
      [44, 27, 55, 27, 52, 42, 41, 42],
      [6, 14, 42, 14, 42, 26, 27, 26, 11, 33, 6, 33],
    ],
    cut: [
      [12, 18, 34, 18, 34, 21, 12, 21],
      [56, 9, 58, 9, 58, 12, 56, 12],
      [62, 9, 64, 9, 64, 12, 62, 12],
      [68, 9, 70, 9, 70, 12, 68, 12],
      [90, 26, 126, 26, 126, 28, 90, 28],
    ],
    glow: [[90, 19, 122, 19, 122, 22, 90, 22], [46, 17, 72, 17, 72, 19, 46, 19], [150, 19, 154, 19, 154, 24, 150, 24]],
  },
  // Quantum Cannon: heavy shrouded barrel, carry handle, three cell windows.
  3: {
    body: [
      [58, 10, 140, 10, 149, 16, 149, 33, 140, 39, 58, 39],
      [146, 13, 155, 13, 155, 36, 146, 36],
      [20, 14, 60, 14, 60, 37, 20, 37],
      [70, 4, 112, 4, 112, 11, 70, 11],
      [44, 36, 57, 36, 55, 51, 42, 51],
      [98, 38, 108, 38, 108, 49, 98, 49],
      [10, 18, 22, 18, 22, 33, 10, 33],
    ],
    cut: [
      [76, 6, 106, 6, 106, 10, 76, 10],
      [24, 24, 56, 24, 56, 26, 24, 26],
      [60, 36, 140, 36, 140, 37, 60, 37],
    ],
    glow: [[84, 16, 92, 16, 92, 32, 84, 32], [98, 16, 106, 16, 106, 32, 98, 32], [112, 16, 120, 16, 120, 32, 112, 32], [151, 17, 155, 17, 155, 32, 151, 32]],
  },
  // Phase Scattergun: stacked twin barrels over a drum, short stock.
  4: {
    body: [
      [80, 12, 152, 12, 152, 19, 80, 19],
      [80, 20, 148, 20, 148, 27, 80, 27],
      [36, 11, 86, 11, 86, 30, 36, 30],
      [40, 29, 53, 29, 51, 44, 38, 44],
      [10, 16, 38, 13, 38, 28, 15, 35, 10, 35],
    ],
    circles: [[70, 34, 11]],
    cut: [
      [80, 19, 152, 19, 152, 20, 80, 20],
      [16, 20, 30, 18, 30, 21, 16, 23],
    ],
    cutCircles: [[70, 34, 4]],
    glow: [[88, 22, 140, 22, 140, 25, 88, 25], [42, 15, 74, 15, 74, 18, 42, 18]],
    glowRings: [[70, 34, 8, 2]],
  },
  // Temporal Sniper: long fluted barrel, scope with lit lens, thumbhole stock.
  5: {
    body: [
      [100, 19, 152, 19, 152, 23, 100, 23],
      [148, 16, 158, 16, 158, 25, 148, 25],
      [40, 15, 104, 15, 104, 27, 40, 27],
      [54, 7, 92, 7, 92, 12, 54, 12],
      [47, 5, 55, 5, 55, 14, 47, 14],
      [90, 4, 100, 4, 100, 15, 90, 15],
      [62, 11, 66, 11, 66, 16, 62, 16],
      [80, 11, 84, 11, 84, 16, 80, 16],
      [64, 26, 75, 26, 75, 37, 64, 37],
      [42, 26, 52, 26, 50, 40, 39, 40],
      [2, 16, 42, 15, 42, 29, 31, 29, 25, 37, 4, 37],
    ],
    cut: [
      [14, 24, 26, 24, 23, 29, 12, 29],
      [151, 18, 153, 18, 153, 23, 151, 23],
      [44, 21, 100, 21, 100, 22, 44, 22],
    ],
    glow: [[96, 6, 100, 6, 100, 13, 96, 13], [108, 20, 146, 20, 146, 22, 108, 22]],
  },
  // Ricochet Pistol: angular revolver, vented barrel, lit cylinder flutes.
  6: {
    body: [
      [70, 14, 132, 14, 134, 17, 134, 22, 70, 22],
      [56, 12, 77, 12, 77, 29, 56, 29],
      [43, 14, 58, 14, 58, 31, 43, 31],
      [38, 9, 47, 9, 47, 15, 42, 17],
      [43, 28, 58, 28, 56, 35, 50, 51, 33, 51, 39, 35],
      [58, 28, 72, 28, 72, 34, 66, 39, 58, 39],
    ],
    cut: [
      [61, 30, 68, 30, 68, 33, 64, 36, 61, 36],
      [84, 14, 88, 14, 88, 17, 84, 17],
      [94, 14, 98, 14, 98, 17, 94, 17],
      [104, 14, 108, 14, 108, 17, 104, 17],
      [114, 14, 118, 14, 118, 17, 114, 17],
    ],
    glow: [[59, 16, 74, 16, 74, 18, 59, 18], [59, 21, 74, 21, 74, 23, 59, 23], [80, 19, 130, 19, 130, 21, 80, 21]],
  },
  // EMP Launcher: fat coil tube with a flared emitter, fore grip, sight.
  7: {
    body: [
      [46, 10, 142, 10, 142, 32, 46, 32],
      [140, 6, 155, 4, 155, 38, 140, 36],
      [16, 14, 48, 14, 48, 30, 16, 30],
      [56, 31, 69, 31, 67, 48, 54, 48],
      [104, 31, 115, 31, 115, 45, 104, 45],
      [68, 4, 84, 4, 84, 11, 68, 11],
      [8, 17, 18, 17, 18, 27, 8, 27],
    ],
    cut: [
      [72, 6, 80, 6, 80, 9, 72, 9],
      [20, 21, 44, 21, 44, 23, 20, 23],
    ],
    glow: [
      [80, 12, 84, 12, 84, 30, 80, 30],
      [94, 12, 98, 12, 98, 30, 94, 30],
      [108, 12, 112, 12, 112, 30, 108, 30],
      [122, 12, 126, 12, 126, 30, 122, 30],
      [150, 9, 155, 8, 155, 34, 150, 33],
    ],
  },
};

export const hasSilhouette = (id) => id in ICONS;

function polyPath(list, circles) {
  const p = new Path2D();
  for (const pts of list || []) {
    p.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
    p.closePath();
  }
  for (const [cx, cy, r] of circles || []) {
    p.moveTo(cx + r, cy);
    p.arc(cx, cy, r, 0, Math.PI * 2);
    p.closePath();
  }
  return p;
}

const paths = new Map(); // id -> { body, cut, glow }
function iconPaths(id) {
  let p = paths.get(id);
  if (p) return p;
  const d = ICONS[id];
  if (!d) return null;
  p = {
    body: polyPath(d.body, d.circles),
    cut: polyPath(d.cut, d.cutCircles),
    glow: polyPath(d.glow),
    rings: d.glowRings || [],
  };
  paths.set(id, p);
  return p;
}

// ─── Raster ─────────────────────────────────────────────────────────────────

// Per art style: body tone, edge and how hard the accent glows. Comic keeps
// an ink rim so the glyph sits on its inked steel; Modern (realistic) runs a
// soft off-white with a hairline; Legacy matches its monospace green-on-black.
const LOOKS = {
  comic: { top: "#f4f8fb", bottom: "#a9bccb", ink: "#05080d", inkW: 2.4, seam: "rgba(5,8,13,0.85)", halo: 5 },
  real: { top: "#eef1ee", bottom: "#aeb8b9", ink: null, inkW: 0, seam: "rgba(6,9,11,0.7)", halo: 3 },
  legacy: { top: "#e6fff4", bottom: "#8fb8a8", ink: "#000000", inkW: 1.5, seam: "rgba(0,0,0,0.8)", halo: 4 },
};
const look = () => (isRealisticArt() ? "real" : isModernArt() ? "comic" : "legacy");

const cache = new Map(); // key -> { body, glow }
onArtStyleChange(() => cache.clear());

function paintBody(g, P, L) {
  if (L.ink) {
    g.lineJoin = "round";
    g.lineWidth = L.inkW * 2;
    g.strokeStyle = L.ink;
    g.stroke(P.body);
    g.fillStyle = L.ink;
    g.fill(P.body);
  }
  const grad = g.createLinearGradient(0, 4, 0, 52);
  grad.addColorStop(0, L.top);
  grad.addColorStop(1, L.bottom);
  g.fillStyle = grad;
  g.fill(P.body);
  // Seams and guards: punched through, then a dark line so they still read
  // where the cut is thinner than a pixel.
  g.globalCompositeOperation = "destination-out";
  g.fill(P.cut);
  g.globalCompositeOperation = "source-over";
  g.fillStyle = L.seam;
  g.globalAlpha = 0.35;
  g.fill(P.cut);
  g.globalAlpha = 1;
  // A top-light rim along the upper edge of every part.
  g.save();
  g.clip(P.body);
  g.translate(0, 1.2);
  g.globalCompositeOperation = "destination-out";
  g.globalAlpha = 0.18;
  g.fill(P.body);
  g.restore();
}

function paintGlow(g, P, L, color) {
  g.fillStyle = color;
  g.shadowColor = color;
  g.shadowBlur = L.halo;
  g.fill(P.glow);
  g.strokeStyle = color;
  for (const [cx, cy, r, lw] of P.rings) {
    g.lineWidth = lw;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.stroke();
  }
  g.shadowBlur = 0;
  // White-hot core so the accent reads even in a dim colour.
  g.globalAlpha = 0.45;
  g.fillStyle = "#ffffff";
  g.save();
  g.translate(0, 0.4);
  g.scale(1, 0.985);
  g.fill(P.glow);
  g.restore();
  g.globalAlpha = 1;
}

function raster(id, color, pxPerUnit) {
  const P = iconPaths(id);
  if (!P) return null;
  const L = LOOKS[look()];
  const [, , BW, BH] = SILHOUETTE_BOX;
  const k = pxPerUnit;
  const mk = (paint) => {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(BW * k));
    c.height = Math.max(1, Math.ceil(BH * k));
    const g = c.getContext("2d");
    g.scale(k, k);
    paint(g);
    return c;
  };
  return { body: mk((g) => paintBody(g, P, L)), glow: mk((g) => paintGlow(g, P, L, color)) };
}

/** The accent for a weapon: its finish's energy colour when it has one. */
function accentFor(id, color) {
  const finish = activeFinish(id);
  const accent = finish?.energy && color === WEAPONS[id]?.color ? finish.energy : color;
  return { accent, fk: finishKey(finish) };
}

/**
 * Bitmaps for a weapon icon at `pxPerUnit` device pixels per grid unit.
 * `color` is the accent of the energy parts. Sizes are bucketed so a
 * resize or HUD-scale change re-rasterises a handful of times, not per frame.
 */
export function silhouetteLayers(id, color, pxPerUnit) {
  if (!(id in ICONS)) return null;
  const { accent, fk } = accentFor(id, color);
  const k = Math.max(0.25, Math.ceil(pxPerUnit * 8) / 8);
  const key = `${id}|${accent}|${fk}|${k}`;
  let r = cache.get(key);
  if (r === undefined) {
    r = raster(id, accent, k);
    if (cache.size > 96) cache.clear();
    cache.set(key, r);
  }
  return r;
}

/**
 * Draw a weapon's icon fitted and centred inside a box, aspect kept. Every
 * HUD's weapon slots use this. Returns false for an unknown weapon.
 * `glow` scales the accent layer: 0 for a dim, unselected slot.
 */
export function drawWeaponIcon(ctx, id, color, x, y, w, h, { alpha = 1, glow = 1 } = {}) {
  const ar = SILHOUETTE_BOX[2] / SILHOUETTE_BOX[3];
  let W = w;
  let H = w / ar;
  if (H > h) {
    H = h;
    W = h * ar;
  }
  const t = ctx.getTransform();
  const layers = silhouetteLayers(id, color, (W / SILHOUETTE_BOX[2]) * (Math.hypot(t.a, t.b) || 1));
  if (!layers) return false;
  const dx = x + (w - W) / 2;
  const dy = y + (h - H) / 2;
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * alpha;
  ctx.drawImage(layers.body, dx, dy, W, H);
  if (glow > 0) {
    ctx.globalAlpha = a0 * alpha * glow;
    ctx.drawImage(layers.glow, dx, dy, W, H);
  }
  ctx.globalAlpha = a0;
  return true;
}
