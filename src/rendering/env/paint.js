/**
 * Canvas painting helpers for the Modern environment textures.
 *
 * Everything here runs once per act at level load (never per frame), so
 * gradients and shadowBlur glows are fine. The look follows the graphic-novel
 * style bible: 3–4 tone gradients lit from the upper left, mitred bevels,
 * #04060b ink outlines, AO where parts meet, emissive strips with a soft bloom.
 */

import { INK, hexRGB } from "./palettes.js";

export const T = 512;

export function makeCanvas(w, h = w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Small deterministic PRNG (mulberry32) so textures are stable between runs. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function lin(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

export function rad(ctx, x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

export const rgba = ([r, g, b], a) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;

// ── Realistic material bake ─────────────────────────────────────────────────
//
// While a Realistic wall face is painted, the helpers here also paint a height
// field (grey, 128 = the wall plane) and an emissive mask beside the albedo,
// and leave out the ink outlines. bakeMaterial() then lights the albedo from
// that height once, at level load. M is null for Modern and for the deck, so
// those paths draw exactly what they always have.

let M = null;

/** The active material target, or null outside a Realistic wall bake. */
export const material = () => M;

/** A fresh material target (flat height field, no emission) for one face. */
export function beginMaterial(p) {
  const h = makeCanvas(T).getContext("2d", { willReadFrequently: true });
  h.fillStyle = "rgb(128,128,128)";
  h.fillRect(0, 0, T, T);
  const e = makeCanvas(T).getContext("2d", { willReadFrequently: true });
  return { h, e, crevice: p.s0 };
}

/** Route the helpers' relief/emission into `m` while a face is painted; null ends it. */
export function useMaterial(m) {
  M = m;
}

export const grey = (v) => {
  const n = Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${n},${n},${n})`;
};

/** Height at a texel, so a nested plate can stand relative to what it sits on. */
function heightAt(x, y) {
  const px = Math.max(0, Math.min(T - 1, x | 0));
  const py = Math.max(0, Math.min(T - 1, y | 0));
  return M.h.getImageData(px, py, 1, 1).data[0];
}

/** Cut a groove/slot `depth` into the height field (subtracts, never occludes). */
export function sink(x, y, w, h, depth = 40) {
  if (!M) return;
  const g = M.h;
  g.globalCompositeOperation = "difference";
  g.fillStyle = grey(depth);
  g.fillRect(x, y, w, h);
  g.globalCompositeOperation = "source-over";
}

/** Add relief on top of whatever is there (ribs, bolts, pipes). */
export function raise(x, y, w, h, d = 16) {
  if (!M) return;
  const g = M.h;
  g.globalCompositeOperation = "lighter";
  g.fillStyle = grey(d);
  g.fillRect(x, y, w, h);
  g.globalCompositeOperation = "source-over";
}

/** Run `draw(heightCtx)` in additive ("lighter") or subtractive mode. */
export function relief(draw, mode = "lighter") {
  if (!M) return;
  const g = M.h;
  g.save();
  g.globalCompositeOperation = mode;
  draw(g);
  g.restore();
}

/** Occluding slab `d` above (or below, if negative) the surface under its centre. */
export function slab(x, y, w, h, d, b = 4) {
  if (!M) return;
  const base = heightAt(x + w / 2, y + h / 2);
  const n = Math.max(1, Math.min(4, Math.round(b / 2)));
  const s = b / n;
  for (let i = 0; i < n; i++) {
    M.h.fillStyle = grey(base + (d * (i + 1)) / n);
    M.h.fillRect(x + i * s, y + i * s, w - 2 * i * s, h - 2 * i * s);
  }
}

/** Mark light-emitting texels: the bake leaves them unlit and saturated. */
export function emit(draw, blur = 0) {
  if (!M) return;
  const g = M.e;
  g.save();
  g.fillStyle = "#fff";
  g.strokeStyle = "#fff";
  if (blur > 0) {
    g.shadowColor = "#fff";
    g.shadowBlur = blur;
  }
  draw(g);
  g.restore();
}

/** Ink fill in Modern; a dark recessed crevice in Realistic. */
export function ink(ctx, x, y, w, h, depth = 30) {
  if (!M) {
    ctx.fillStyle = INK;
    ctx.fillRect(x, y, w, h);
    return;
  }
  ctx.fillStyle = M.crevice;
  ctx.fillRect(x, y, w, h);
  sink(x, y, w, h, depth);
}

/** Mitred bevel: lit top/left facets, shadowed bottom/right facets. */
export function bevel(ctx, x, y, w, h, b, hi, lo, ha = 0.5, la = 0.7) {
  ctx.globalAlpha = ha;
  ctx.fillStyle = hi;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - b, y + b);
  ctx.lineTo(x + b, y + b);
  ctx.lineTo(x + b, y + h - b);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = la;
  ctx.fillStyle = lo;
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + b, y + h - b);
  ctx.lineTo(x + w - b, y + h - b);
  ctx.lineTo(x + w - b, y + b);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

/**
 * Raised plate: diagonal 3-tone fill, bevel, specular strip on the lit edge,
 * ink outline. `recess` flips the bevel so the panel reads as sunk in.
 */
export function plate(ctx, x, y, w, h, p, o = {}) {
  const tones = o.tones || [p.s3, p.s2, p.s1];
  const b = o.bevel ?? 6;
  if (M) {
    // Albedo only: a faint top-to-bottom falloff, no painted light or ink.
    // The relief does the rest when the face is lit in bakeMaterial().
    ctx.fillStyle = lin(ctx, 0, y, 0, y + h, [[0, tones[1]], [1, tones[2]]]);
    ctx.fillRect(x, y, w, h);
    slab(x, y, w, h, o.recess ? -(8 + b * 1.6) : 8 + b * 1.8, Math.max(2, b));
    if ((o.ink ?? 3) > 0) {
      // Panel gap where the ink outline was.
      relief((g) => {
        g.strokeStyle = grey(16);
        g.lineWidth = 1.5;
        g.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
      }, "difference");
    }
    return;
  }
  ctx.fillStyle = lin(ctx, x, y, x + w * 0.45, y + h, [[0, tones[0]], [0.5, tones[1]], [1, tones[2]]]);
  ctx.fillRect(x, y, w, h);
  if (b > 0) {
    if (o.recess) bevel(ctx, x, y, w, h, b, p.s0, p.s4, 0.75, 0.35);
    else bevel(ctx, x, y, w, h, b, p.s4, p.s0, 0.45, 0.75);
  }
  if (o.spec !== false && !o.recess && w > 40) {
    // Sharp specular strip along the lit top edge, fading out to the right.
    ctx.fillStyle = lin(ctx, x, 0, x + w, 0, [[0, "rgba(255,255,255,0.32)"], [0.55, "rgba(255,255,255,0.08)"], [1, "rgba(255,255,255,0)"]]);
    ctx.fillRect(x + b + 2, y + b + 1, w * 0.7, 2);
  }
  const ink = o.ink ?? 3;
  if (ink > 0) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = ink;
    ctx.lineJoin = "round";
    ctx.strokeRect(x + ink / 2, y + ink / 2, w - ink, h - ink);
  }
}

/** Domed rivet / bolt head with ink ring and a hot specular dot. */
export function rivet(ctx, x, y, r, p) {
  if (M) {
    // Contact shadow falls down-right of the key light; the dome's normals
    // put the highlight on the upper-left of the head.
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath();
    ctx.arc(x + r * 0.2, y + r * 0.55, r + 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.s3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    const peak = Math.min(40, r * 8);
    relief((g) => {
      g.fillStyle = rad(g, x, y, 0, r + 0.5, [[0, grey(peak)], [0.55, grey(peak * 0.72)], [1, grey(0)]]);
      g.beginPath();
      g.arc(x, y, r + 0.5, 0, Math.PI * 2);
      g.fill();
    });
    return;
  }
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.arc(x + r * 0.35, y + r * 0.45, r + 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rad(ctx, x - r * 0.4, y - r * 0.4, 0, r * 1.6, [[0, p.s4], [0.45, p.s3], [1, p.s0]]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, Math.max(0.8, r * 0.25), 0, Math.PI * 2);
  ctx.fill();
}

/** Emissive strip: ink housing, bloom halo, coloured tube, white-hot core. */
export function lightStrip(ctx, x, y, w, h, color, o = {}) {
  const blur = o.blur ?? 18;
  ctx.save();
  if (o.housing !== false) {
    ctx.fillStyle = M ? M.crevice : INK;
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    sink(x - 3, y - 3, w + 6, h + 6, 22);
  }
  if (M) {
    const a = o.alpha ?? 1;
    emit((g) => {
      g.globalAlpha = a;
      g.fillRect(x, y, w, h);
    }, blur * 0.5);
  }
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.fillStyle = color;
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.fillRect(x, y, w, h);
  ctx.shadowBlur = blur * 0.4;
  ctx.fillRect(x, y, w, h);
  ctx.shadowBlur = 0;
  ctx.fillStyle = o.core || "rgba(255,255,255,0.85)";
  const cw = w > h ? w - 4 : Math.max(1, w * 0.4);
  const ch = w > h ? Math.max(1, h * 0.4) : h - 4;
  ctx.fillRect(x + (w - cw) / 2, y + (h - ch) / 2, cw, ch);
  ctx.restore();
}

/** Small LED dot with glow. */
export function led(ctx, x, y, r, color, on = true) {
  ctx.save();
  ctx.fillStyle = M ? M.crevice : INK;
  ctx.beginPath();
  ctx.arc(x, y, r + 1.5, 0, Math.PI * 2);
  ctx.fill();
  if (M) {
    relief((g) => {
      g.fillStyle = grey(14);
      g.beginPath();
      g.arc(x, y, r + 1.5, 0, Math.PI * 2);
      g.fill();
    }, "difference");
    if (on) {
      emit((g) => {
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }, r * 2);
    }
  }
  if (on) {
    ctx.shadowColor = color;
    ctx.shadowBlur = r * 5;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#1a1f26";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Diagonal hazard stripes clipped to a rect, with ink border. */
export function hazard(ctx, x, y, w, h, c1, c2 = "#0b0d10", period = 28) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = c2;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = c1;
  for (let sx = x - h; sx < x + w + h; sx += period) {
    ctx.beginPath();
    ctx.moveTo(sx, y + h);
    ctx.lineTo(sx + period / 2, y + h);
    ctx.lineTo(sx + period / 2 + h, y);
    ctx.lineTo(sx + h, y);
    ctx.closePath();
    ctx.fill();
  }
  // Worn paint: darken the lower half a touch.
  ctx.fillStyle = lin(ctx, 0, y, 0, y + h, [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0.35)"]]);
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  if (M) {
    // Painted on a thin raised plate instead of an ink border.
    raise(x, y, w, h, 6);
    return;
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
}

/** Horizontal vent slots with lit lower lips. */
export function vents(ctx, x, y, w, h, n, p) {
  const gap = h / n;
  for (let i = 0; i < n; i++) {
    const vy = y + i * gap + gap * 0.25;
    if (M) {
      ctx.fillStyle = M.crevice;
      ctx.fillRect(x, vy, w, gap * 0.45);
      sink(x, vy, w, gap * 0.45, 46);
      continue;
    }
    ctx.fillStyle = INK;
    ctx.fillRect(x, vy, w, gap * 0.45);
    ctx.fillStyle = p.s4;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(x, vy + gap * 0.45, w, 1.5);
    ctx.globalAlpha = 1;
  }
}

let _noise = null;
function noiseTile() {
  if (_noise) return _noise;
  const c = makeCanvas(128);
  const g = c.getContext("2d");
  const img = g.createImageData(128, 128);
  const r = rng(9001);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = (r() * 255) | 0;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  _noise = c;
  return c;
}

/** Fine grit so flat gradients don't read as vector-clean plastic. */
export function grit(ctx, w, h, alpha = 0.1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = ctx.createPattern(noiseTile(), "repeat");
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/**
 * Realistic glowing fissure along a path (`trace(g)` builds it on any
 * context): a groove cut into the height field with a dark broken lip, a
 * crimson glow deep inside it, and the glow spilling onto the surrounding
 * surface as emission, so it reads as light from within the material rather
 * than a stroke painted on top. Only meaningful during a material bake.
 */
export function fissure(ctx, trace, w, glow = "#ff2a4a") {
  if (!M) return;
  const [gr, gg, gb] = hexRGB(glow);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Spill: the surface around the crack picks up its colour.
  ctx.shadowColor = rgba([gr, gg, gb], 0.8);
  ctx.shadowBlur = w * 8;
  ctx.strokeStyle = rgba([gr * 0.7, gg * 0.4, gb * 0.45], 0.45);
  ctx.lineWidth = w * 3.2;
  trace(ctx);
  ctx.stroke();
  ctx.shadowBlur = 0;
  // The broken lip and the dark walls of the crack.
  ctx.strokeStyle = "#060203";
  ctx.lineWidth = w * 1.7;
  trace(ctx);
  ctx.stroke();
  // Glow at the bottom of the crack: a hot core narrower than the opening.
  ctx.strokeStyle = rgba([gr * 0.7, gg * 0.5, gb * 0.55], 1);
  ctx.lineWidth = w * 0.75;
  trace(ctx);
  ctx.stroke();
  ctx.strokeStyle = rgba([255, Math.min(255, gg + 110), Math.min(255, gb + 90)], 0.75);
  ctx.lineWidth = Math.max(0.6, w * 0.28);
  trace(ctx);
  ctx.stroke();
  ctx.restore();
  relief((g) => {
    g.lineCap = "round";
    g.lineJoin = "round";
    g.strokeStyle = grey(34);
    g.lineWidth = w * 1.5;
    trace(g);
    g.stroke();
    g.strokeStyle = grey(20);
    g.lineWidth = w * 0.8;
    trace(g);
    g.stroke();
  }, "difference");
  // The core is emissive; the spill is faint partial emission around it.
  emit((g) => {
    g.lineCap = "round";
    g.lineJoin = "round";
    g.globalAlpha = 0.34;
    g.lineWidth = w * 3;
    trace(g);
    g.stroke();
  }, w * 6);
  emit((g) => {
    g.lineCap = "round";
    g.lineJoin = "round";
    g.lineWidth = w * 0.7;
    trace(g);
    g.stroke();
  }, w);
}

/**
 * Grime pass for a wall: strong contact AO where the wall meets the deck,
 * soot under the ceiling, drip streaks and scuffs near the base. Act 2 adds
 * rust blooms, Act 3 corrupted crimson hairline veins.
 */
export function grime(ctx, r, p, act) {
  const g = p.grime;
  ctx.fillStyle = lin(ctx, 0, T * 0.7, 0, T, [[0, rgba(g, 0)], [0.55, rgba(g, 0.28)], [0.88, rgba(g, 0.62)], [1, rgba(g, 0.92)]]);
  ctx.fillRect(0, T * 0.7, T, T * 0.3);
  ctx.fillStyle = lin(ctx, 0, 0, 0, 56, [[0, rgba(g, 0.75)], [1, rgba(g, 0)]]);
  ctx.fillRect(0, 0, T, 56);
  for (let i = 0; i < 34; i++) {
    const x = r() * T;
    const y = T * (0.12 + r() * 0.55);
    const len = 30 + r() * 150;
    ctx.fillStyle = lin(ctx, 0, y, 0, y + len, [[0, rgba(g, 0.16 + r() * 0.12)], [1, rgba(g, 0)]]);
    ctx.fillRect(x, y, 1 + r() * 3, len);
  }
  for (let i = 0; i < 90; i++) {
    const x = r() * T;
    const y = T * (0.72 + r() * 0.28);
    ctx.fillStyle = r() < 0.7 ? rgba(g, 0.25 + r() * 0.3) : "rgba(255,255,255,0.07)";
    ctx.fillRect(x, y, 1 + r() * 6, 1 + r() * 2);
  }
  if (act === 2 && p.rust) {
    for (let i = 0; i < 9; i++) {
      const x = r() * T;
      const y = T * (0.3 + r() * 0.65);
      const rr = 14 + r() * 40;
      ctx.fillStyle = rad(ctx, x, y, 0, rr, [[0, "rgba(120,60,24,0.38)"], [0.6, "rgba(90,44,18,0.18)"], [1, "rgba(60,30,10,0)"]]);
      ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
  }
  if (act === 3 && M) {
    // Realistic: the veins are hairline fissures glowing from inside.
    const pts = new Float32Array(16);
    const trace = (g) => {
      g.beginPath();
      g.moveTo(pts[0], pts[1]);
      for (let k = 2; k < 16; k += 2) g.lineTo(pts[k], pts[k + 1]);
    };
    for (let i = 0; i < 3; i++) {
      let x = r() * T;
      let y = T * (0.15 + r() * 0.5);
      pts[0] = x;
      pts[1] = y;
      for (let s = 0; s < 7; s++) {
        x += (r() - 0.5) * 60;
        y += 10 + r() * 34;
        pts[2 + s * 2] = x;
        pts[3 + s * 2] = y;
      }
      fissure(ctx, trace, 2.4);
    }
  } else if (act === 3) {
    ctx.save();
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      let x = r() * T;
      let y = T * (0.15 + r() * 0.5);
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 7; s++) {
        x += (r() - 0.5) * 60;
        y += 10 + r() * 34;
        ctx.lineTo(x, y);
      }
      ctx.shadowColor = "#ff2a4a";
      ctx.shadowBlur = 10;
      ctx.strokeStyle = "rgba(255,42,74,0.55)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,200,210,0.5)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    ctx.restore();
  }
}

/**
 * Box-filtered mip chain (512 → 16). Each level halves with high-quality
 * smoothing, so distant columns sample pre-averaged texels instead of
 * aliasing across the full-size art (no shimmer while strafing).
 */
export function buildMips(canvas, minSize = 16) {
  const mips = [canvas];
  let src = canvas;
  while (src.width > minSize) {
    const c = makeCanvas(src.width >> 1, src.height >> 1);
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    g.drawImage(src, 0, 0, c.width, c.height);
    mips.push(c);
    src = c;
  }
  return mips;
}

// ── Realistic bake ──────────────────────────────────────────────────────────

const N = T * T;
const MASK = T - 1;
let _fields = null;

/** Value noise, tileable in x (walls repeat sideways), shared by every bake. */
function noiseFields() {
  if (_fields) return _fields;
  const r = rng(424242);
  const blotch = new Float32Array(N);
  const fine = new Float32Array(N);
  // Octaves on grids that divide T, so the field wraps horizontally.
  for (const [cell, amp] of [[64, 0.55], [32, 0.3], [8, 0.15]]) {
    const gw = T / cell;
    const gh = gw + 1;
    const grid = new Float32Array(gw * gh);
    for (let i = 0; i < grid.length; i++) grid[i] = r();
    for (let y = 0; y < T; y++) {
      const fy = y / cell;
      const y0 = fy | 0;
      let ty = fy - y0;
      ty = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < T; x++) {
        const fx = x / cell;
        const x0 = fx | 0;
        const x1 = (x0 + 1) % gw;
        let tx = fx - x0;
        tx = tx * tx * (3 - 2 * tx);
        const a = grid[y0 * gw + x0] + (grid[y0 * gw + x1] - grid[y0 * gw + x0]) * tx;
        const b = grid[(y0 + 1) * gw + x0] + (grid[(y0 + 1) * gw + x1] - grid[(y0 + 1) * gw + x0]) * tx;
        blotch[y * T + x] += (a + (b - a) * ty) * amp;
      }
    }
  }
  // Fine: 4px-cell value noise (chips and flecks, not per-texel static).
  const gw = T / 4;
  const grid = new Float32Array(gw * (gw + 1));
  for (let i = 0; i < grid.length; i++) grid[i] = r();
  for (let y = 0; y < T; y++) {
    const y0 = y >> 2;
    const ty = (y & 3) / 4;
    for (let x = 0; x < T; x++) {
      const x0 = x >> 2;
      const x1 = (x0 + 1) % gw;
      const tx = (x & 3) / 4;
      const a = grid[y0 * gw + x0] + (grid[y0 * gw + x1] - grid[y0 * gw + x0]) * tx;
      const b = grid[(y0 + 1) * gw + x0] + (grid[(y0 + 1) * gw + x1] - grid[(y0 + 1) * gw + x0]) * tx;
      fine[y * T + x] = a + (b - a) * ty;
    }
  }
  _fields = { blotch, fine };
  return _fields;
}

/** Two-pass box blur, wrapping in x and clamping in y. `src` may equal `dst`. */
function boxBlur(src, dst, tmp, r, acc) {
  const k = 1 / (2 * r + 1);
  for (let y = 0; y < T; y++) {
    const row = y * T;
    let s = 0;
    for (let i = -r; i <= r; i++) s += src[row + (i & MASK)];
    for (let x = 0; x < T; x++) {
      tmp[row + x] = s * k;
      s += src[row + ((x + r + 1) & MASK)] - src[row + ((x - r) & MASK)];
    }
  }
  // Vertical pass walks rows with one running sum per column (cache-friendly).
  acc.fill(0);
  for (let i = -r; i <= r; i++) {
    const row = (i < 0 ? 0 : i) * T;
    for (let x = 0; x < T; x++) acc[x] += tmp[row + x];
  }
  for (let y = 0; y < T; y++) {
    const row = y * T;
    const add = (y + r + 1 < MASK ? y + r + 1 : MASK) * T;
    const sub = (y - r > 0 ? y - r : 0) * T;
    for (let x = 0; x < T; x++) {
      dst[row + x] = acc[x] * k;
      acc[x] += tmp[add + x] - tmp[sub + x];
    }
  }
}

let _buf = null;
function buffers() {
  if (!_buf) _buf = { hs: new Float32Array(N), hl: new Float32Array(N), tmp: new Float32Array(N), wet: new Float32Array(T), acc: new Float32Array(T), row: new Float32Array(T), col: new Float32Array(T) };
  return _buf;
}

// Key light from above (slightly left), a dim fill from below-right, and a
// fixed viewer straight on. Flat texels come out at exactly 1× their albedo.
const norm3 = (x, y, z) => {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
};
const KEY = norm3(-0.28, -0.78, 0.56);
const FILL = norm3(0.35, 0.55, 0.76);
const HALF = norm3(KEY[0], KEY[1], KEY[2] + 1);
const AMB = 0.34;
const KEY_I = 0.9;
const FILL_I = 0.22;
const FLAT = AMB + KEY_I * KEY[2] + FILL_I * FILL[2];
const FLAT_SPEC = HALF[2] ** 32;
const BUMP = 0.085;

/**
 * Light the albedo painted into `canvas` from material `m`'s height field and
 * bake in wear: grime and rust in crevices and along the floor line, water
 * stains running down from seams, rubbed-bright edges, brushed-metal grain
 * and a roughness that varies across the face.
 *
 * The albedo is never read back. JS turns the (CPU-side) height and emissive
 * maps into four layers and the canvas composites them onto the paint:
 * desaturate → wear/grime over-paint → multiply by light → add specular.
 */
export function bakeMaterial(canvas, m, p, act, seed) {
  const L = layers();
  bakeLayers(
    m.h.getImageData(0, 0, T, T).data,
    m.e.getImageData(0, 0, T, T).data,
    L.desat.data, L.paint.data, L.light.data, L.spec.data,
    p, act, seed,
  );
  const ctx = canvas.getContext("2d");
  ctx.save();
  const put = (img, op, alpha = 1) => {
    L.ctx.putImageData(img, 0, 0);
    ctx.globalCompositeOperation = op;
    ctx.globalAlpha = alpha;
    ctx.drawImage(L.canvas, 0, 0);
  };
  put(L.desat, "saturation");
  put(L.paint, "source-over");
  put(L.light, "multiply");
  // The light layer is stored at 1/LIGHT_RANGE so bevels can go above 1×;
  // adding the face onto itself restores the range.
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = LIGHT_RANGE - 1;
  ctx.drawImage(canvas, 0, 0);
  put(L.spec, "lighter");
  ctx.restore();
}

const LIGHT_RANGE = 1.5;

let _layers = null;
function layers() {
  if (_layers) return _layers;
  const canvas = makeCanvas(T);
  const ctx = canvas.getContext("2d");
  const img = () => ctx.createImageData(T, T);
  _layers = { canvas, ctx, desat: img(), paint: img(), light: img(), spec: img() };
  _layers.desat.data.fill(128);
  return _layers;
}

const CFG = new Float64Array(10);
const [kx, ky, kz] = KEY;
const [fx, fy, fz] = FILL;
const [hx, hy, hz] = HALF;

/** The bake on raw RGBA buffers: height `hd` + emissive alpha `ed` in, four layers out. */
export function bakeLayers(hd, ed, desat, paint, light, spec, p, act, seed) {
  const { blotch, fine } = noiseFields();
  const { hs, hl, tmp, wet, acc, row, col } = buffers();
  const r = rng(seed ^ 0x5bd1e995);

  for (let i = 0; i < N; i++) hs[i] = hd[i * 4];
  boxBlur(hs, hs, tmp, 1, acc);
  boxBlur(hs, hl, tmp, 11, acc);

  // Brushed grain runs horizontally: one value per row; only some columns leak.
  for (let y = 0; y < T; y++) row[y] = r() * 2 - 1;
  for (let x = 0; x < T; x++) col[x] = r() < 0.4 ? 0.4 + r() * 0.6 : 0;
  wet.fill(0);
  const ofs = (seed * 97) & MASK;

  const rust = hexRGB(p.rust || "#3a3128");
  const bare = hexRGB(p.s4);
  const C = CFG;
  C[0] = rust[0]; C[1] = rust[1]; C[2] = rust[2];
  C[3] = Math.min(255, bare[0] * 1.1); C[4] = Math.min(255, bare[1] * 1.1); C[5] = Math.min(255, bare[2] * 1.1);
  C[6] = p.grime[0]; C[7] = p.grime[1]; C[8] = p.grime[2];
  C[9] = act === 2 ? 0.85 : act === 3 ? 0.6 : 0.55;

  // One call per row keeps the hot loop small for the optimising compiler.
  for (let y = 0; y < T; y++) shadeRow(ed, desat, paint, light, spec, hs, hl, blotch, fine, wet, col, C, y, row[y], ofs);
}

function shadeRow(ed, desat, paint, light, spec, hs, hl, blotch, fine, wet, col, C, y, brushRow, ofs) {
  const yu = (y > 0 ? y - 1 : 0) * T;
  const yd = (y < MASK ? y + 1 : MASK) * T;
  const rowI = y * T;
  const floor = y > 360 ? ((y - 360) / 152) ** 1.5 : 0;
  const ceil = y < 48 ? (48 - y) / 48 : 0;
  const rustAmt = C[9];
  const lightScale = 255 / LIGHT_RANGE;
  for (let x = 0; x < T; x++) {
    const i = rowI + x;
    const o = i * 4;
    const e = ed[o + 3] / 255;
    const k = 1 - e;

    const h = hs[i];
    const dx = (hs[rowI + ((x + 1) & MASK)] - hs[rowI + ((x - 1) & MASK)]) * BUMP;
    const dy = (hs[yd + x] - hs[yu + x]) * BUMP;
    const il = 1 / Math.sqrt(dx * dx + dy * dy + 1);
    const nx = -dx * il;
    const ny = -dy * il;
    const nz = il;
    const cav = hl[i] - h; // > 0 down in a recess or seam; < 0 on a raised edge

    const n = blotch[rowI + ((x + ofs) & MASK)];
    const f = fine[i];

    // Rust / grime pools in crevices and creeps up from the floor line.
    const crev = cav > 2 ? (cav < 22 ? (cav - 2) * 0.05 : 1) : 0;
    let dirt = crev * 0.9 + floor * 0.9 + ceil * 0.4 + (n - 0.5) * 1.1;
    dirt = (dirt < 0 ? 0 : dirt > 1 ? 1 : dirt) * k;
    const rm = dirt * rustAmt * (0.6 + 0.4 * f);

    // Water stains: seams leak and the streak runs down the face.
    let w = wet[x] * 0.994;
    if (crev > 0.3 && col[x] > 0 && col[x] * crev > w) w = col[x] * crev;
    wet[x] = w;
    const st = w * 0.5 * k;

    // Edge wear: paint and oxide rubbed off raised edges.
    let wear = cav < -2 ? (-2 - cav) * 0.1 : 0;
    wear = (wear > 1 ? 1 : wear) * (f > 0.3 ? 0.7 : 0.2) * k;

    // Rust, then stain, then wear, flattened into one over-paint colour/alpha.
    const t1 = (1 - st) * (1 - wear);
    const wr = rm * t1;
    const ws = st * (1 - wear);
    const A = 1 - (1 - rm) * t1;
    if (A > 0.004) {
      const ia = 1 / A;
      paint[o] = (C[0] * wr + C[6] * ws + C[3] * wear) * ia;
      paint[o + 1] = (C[1] * wr + C[7] * ws + C[4] * wear) * ia;
      paint[o + 2] = (C[2] * wr + C[8] * ws + C[5] * wear) * ia;
    }
    paint[o + 3] = A * 255;

    // Grounded steel: pull the poster palette toward grey (not the emitters).
    desat[o + 3] = 115 * k;

    // Light: key from above + fill, crevice AO, soot and brushed grain.
    const ao = 1 - (crev * 0.55 < 0.6 ? crev * 0.55 : 0.6);
    const nl = nx * kx + ny * ky + nz * kz;
    const nf = nx * fx + ny * fy + nz * fz;
    const shade = (((AMB + (nl > 0 ? nl * KEY_I : 0)) * ao + (nf > 0 ? nf * FILL_I : 0)) / FLAT) *
      (1 - dirt * 0.35) * (0.9 + 0.2 * n) * (1 + brushRow * (0.035 + 0.03 * n));
    const lv = (shade * k + e) * lightScale;
    light[o] = light[o + 1] = light[o + 2] = lv;
    light[o + 3] = 255;

    // Specular above the flat-face level, so only faces tilted to the key
    // (top bevels, bolt heads) catch it. Rough where dirty, polished where worn,
    // stronger along the grain.
    let s = nx * hx + ny * hy + nz * hz;
    s = s > 0 ? s : 0;
    s *= s; s *= s; s *= s; s *= s; s *= s;
    s -= FLAT_SPEC;
    const gloss = (0.5 + 0.5 * n) * (1 - dirt * 0.85) * (0.75 + 0.25 * (brushRow + 1)) + wear * 1.4;
    const sv = s > 0 ? s * gloss * 150 * ao * k : 0;
    spec[o] = spec[o + 1] = spec[o + 2] = sv;
    spec[o + 3] = 255;
  }
}
