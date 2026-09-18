/**
 * Canvas painting helpers for the Modern environment textures.
 *
 * Everything here runs once per act at level load (never per frame), so
 * gradients and shadowBlur glows are fine. The look follows the graphic-novel
 * style bible: 3–4 tone gradients lit from the upper left, mitred bevels,
 * #04060b ink outlines, AO where parts meet, emissive strips with a soft bloom.
 */

import { INK } from "./palettes.js";

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
    ctx.fillStyle = INK;
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
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
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x, y, r + 1.5, 0, Math.PI * 2);
  ctx.fill();
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
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
}

/** Horizontal vent slots with lit lower lips. */
export function vents(ctx, x, y, w, h, n, p) {
  const gap = h / n;
  for (let i = 0; i < n; i++) {
    const vy = y + i * gap + gap * 0.25;
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
  if (act === 3) {
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
