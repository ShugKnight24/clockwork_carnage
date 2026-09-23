/**
 * Modern-mode HUD portrait: the player's customised agent bust (agent-rig) with
 * pre-rasterised battle damage in ten stages plus a death stage.
 *
 * Layers (each rasterised once per size bucket through svg-art/raster.js):
 *   bg      accent-lit backdrop                  per accent colour
 *   base    bust (cape, armour, helmet)          per character
 *   glow    visor/eye glow, flickers when hurt   per character
 *   sil:*   flat silhouettes for hit flash and heal / shield shimmer
 *   dmg:N   cumulative damage decals             per stage + open/closed helm
 * Per frame only transforms, alphas and a handful of spark strokes change.
 * PG-13: armour takes the damage (cracks, scorch, dents, sparks) — no blood.
 */

import { buildAgentParts } from "../rendering/svg-art/agent-rig.js";
import { getLayerImage } from "../rendering/svg-art/raster.js";
import { CHARACTER_COLORS, HELMET_STYLES } from "../data/cosmetics.js";
import { COLOR } from "./design-tokens.js";
import { isRealisticArt } from "../rendering/art-style.js";
import { lookKey } from "../core/character-fields.js";

const INK = COLOR.ink;
const BOX = [-24, -104.5, 48, 48];
const OPEN = new Set(["wide", "mohawk"]);

// ─── Character layers ───────────────────────────────────────────────────────

let _charKey = "";
let _char = null;

function silFilter(id, color) {
  return `<filter id="${id}" x="-10%" y="-10%" width="120%" height="120%"><feFlood flood-color="${color}"/><feComposite in2="SourceAlpha" operator="in"/></filter>`;
}

/**
 * Cached bust layers for a character. Exported so tests can prove the cache
 * rebuilds on an edit; the portrait itself is the only real caller.
 */
export function characterLayers(character) {
  const c = character || {};
  // Key off the whole look, every call: `game.character` is one object mutated
  // in place, so identity never changes and only the key can catch an edit. An
  // untouched character costs a short string compare per frame.
  const key = lookKey(c);
  if (key !== _charKey || !_char) {
    _charKey = key;
    const p = buildAgentParts(c, { pose: "idle" });
    const k = Math.round(p.width * 100) / 100;
    const tf = k === 1 ? "" : ` transform="scale(${k} 1)"`;
    const base = `<g${tf}>${p.back}${p.cape}${p.body}${p.glow}</g>${p.head}`;
    const accent = (CHARACTER_COLORS[c.colorIndex | 0] || CHARACTER_COLORS[0]).accent;
    const helmet = (HELMET_STYLES[c.helmetIndex | 0] || HELMET_STYLES[0]).id;
    _char = {
      key,
      accent,
      open: OPEN.has(helmet),
      defs: p.defs + silFilter("silW", "#ffffff") + silFilter("silH", "#7dffc4") + silFilter("silS", "#7cc8ff"),
      base,
      glow: p.headGlow,
    };
  }
  return _char;
}

// ─── Damage decals ──────────────────────────────────────────────────────────

const DMG_DEFS =
  `<radialGradient id="scorch"><stop offset="0" stop-color="#040201" stop-opacity=".9"/>` +
  `<stop offset=".55" stop-color="#1c1009" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
  `<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".7"/></filter>`;

/** Glass fracture: bright hairline with an offset ink shadow. */
const crack = (d, w = 0.42) =>
  `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w * 1.6}" stroke-linecap="round" stroke-linejoin="round" opacity=".7" transform="translate(.22 .28)"/>` +
  `<path d="${d}" fill="none" stroke="#eafcff" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity=".92"/>`;
const scratch = (d) =>
  `<path d="${d}" fill="none" stroke="${INK}" stroke-width=".5" stroke-linecap="round" opacity=".55" transform="translate(.15 .2)"/>` +
  `<path d="${d}" fill="none" stroke="#c7d5e2" stroke-width=".32" stroke-linecap="round" opacity=".75"/>`;
const scorch = (cx, cy, rx, ry, o = 1) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#scorch)" opacity="${o}"/>`;
const dent = (d, hi) =>
  `<path d="${d}" fill="#070b11" opacity=".78"/>` +
  `<path d="${hi}" fill="none" stroke="#b3c6d6" stroke-width=".35" stroke-linecap="round" opacity=".8"/>`;
const chip = (x, y) => `<path d="M${x},${y} l.9,-.5 l.7,.6 l-.5,.8 z" fill="#9fb4c7" stroke="${INK}" stroke-width=".18"/>`;

// Visor fractures are authored around a closed visor centred on y=-81 and
// squashed onto the raised brow visor for open helmets.
const VISOR_STAGES = [
  "",
  "",
  "",
  crack("M5.5,-81 L8.6,-84.1 M5.5,-81 L9.4,-79.3 M5.5,-81 L3.4,-83.4"),
  crack("M8.6,-84.1 L10.2,-84.9 M5.5,-81 L6.6,-77.8"),
  crack("M5.5,-81 L1.2,-80.6 L-2.6,-82.4 M1.2,-80.6 L-0.4,-77.6 M-2.6,-82.4 L-6.2,-83.8"),
  crack("M-6,-79.8 L-9.4,-81.8 M-6,-79.8 L-8.8,-77.8 M-6,-79.8 L-3.6,-78 M-6,-79.8 L-5.2,-83.4", 0.36),
  `<path d="M4,-82.6 L7.2,-83.5 L7.9,-80.2 L5.7,-78.7 L3.6,-80.4 Z" fill="#020304" stroke="${INK}" stroke-width=".4"/>` +
    crack("M4,-82.6 L7.2,-83.5 L7.9,-80.2 L5.7,-78.7 L3.6,-80.4 Z", 0.3),
  crack("M-2.6,-82.4 L-1.6,-85 M1.2,-80.6 L2.6,-77.4 M-9.4,-81.8 L-10.4,-79.4 M7.9,-80.2 L10.4,-81.6", 0.32),
  `<circle cx="5.7" cy="-81" r="1.9" fill="${COLOR.crimson}" filter="url(#soft)" opacity=".95"/><circle cx="5.7" cy="-81" r=".6" fill="#ffd0d6"/>`,
];

const SHELL_STAGES = [
  "",
  scratch("M-6.4,-92.4 L-2.6,-90.6 M-5,-93 L-3.4,-92.1"),
  scorch(-8, -88.5, 4.6, 3.6, 0.85),
  scratch("M2,-93.6 L6.4,-92.2"),
  dent("M3,-92 C5,-94.1 8.6,-93.1 9.6,-90.4 C7.6,-91.4 5.2,-91.6 3,-92 Z", "M3.4,-91.2 C5.4,-90.6 7.6,-90.2 9.2,-89.6") + chip(-3.6, -94) + chip(9.8, -86.6),
  scorch(-15, -62, 7, 4.2, 0.8) + scratch("M-10.6,-84.6 L-9,-88.2"),
  scorch(15.5, -60.5, 6, 3.6, 0.7) + dent("M-9.4,-91.6 C-8,-94 -5,-95 -3.2,-94.2 C-5.4,-93.4 -7.6,-92.6 -9.4,-91.6 Z", "M-9,-90.8 C-7.4,-92.2 -5.4,-93.2 -3.4,-93.6") + chip(-11, -83.4),
  scorch(9, -88, 5.4, 4.4, 0.9) + scorch(2, -72, 5, 2.4, 0.55),
  scorch(-4, -95, 6, 2.6, 0.75) + chip(6.4, -94.6) + chip(-12, -79) + scratch("M8.6,-75 L11,-78.6 M-8.4,-72.4 L-11,-75.2"),
  scorch(0, -66, 12, 4, 0.8),
];

function damageMarkup(stage, open) {
  let visor = "";
  let shell = "";
  const last = Math.min(stage, 9);
  for (let i = 1; i <= last; i++) {
    visor += VISOR_STAGES[i];
    shell += SHELL_STAGES[i];
  }
  if (open) {
    // Raised brow visor: squash fractures onto it; soot on the face, not wounds.
    visor = `<g transform="translate(0 -88.4) scale(1 .42) translate(0 81)">${visor}</g>` +
      (stage >= 5 ? scorch(-4.5, -76, 2.6, 1.5, 0.45) + scorch(5, -73.5, 2.2, 1.2, 0.35) : "");
  }
  let dead = "";
  if (stage >= 10) {
    dead = open
      ? scorch(0, -76, 7, 4, 0.55)
      : `<path d="M-11.3,-86.4 L11.3,-86.4 L11,-76.2 L0,-75.2 L-11,-76.2 Z" fill="#05070a" opacity=".82"/>` + VISOR_STAGES[7] + VISOR_STAGES[8];
  }
  return shell + visor + dead;
}

// ─── Per-frame state ────────────────────────────────────────────────────────

const BAND_WEIGHTS = [0.2, 0.55, 1, 0.55, 0.2];
const P = { health: -1, shield: -1, hitAt: -1e9, healAt: -1e9, shieldAt: -1e9, deadAt: -1e9 };
const SPARK_POINTS = [[8.9, -82.8], [-10.8, -78.2], [6.4, -72.6], [-6.6, -93.2]];
// Open helmets show the face: keep sparks on the shell and raised visor.
const SPARK_POINTS_OPEN = [[12.6, -84.2], [-12.4, -81.6], [8.2, -92.4], [-6.6, -93.2]];

function flicker(t, stage) {
  if (stage >= 10) return 0;
  if (stage < 6) return 0.85 + 0.15 * Math.sin(t * 2.2);
  const n = 0.55 + 0.25 * Math.sin(t * 23.1) + 0.2 * Math.sin(t * 37.7 + 1.3);
  const drop = Math.sin(t * (stage >= 9 ? 7.9 : 4.3)) > (stage >= 9 ? 0.6 : 0.86);
  return drop ? 0.08 : Math.max(0.2, n);
}

function drawSparks(ctx, t, stage, ox, oy, s, open) {
  const points = open ? SPARK_POINTS_OPEN : SPARK_POINTS;
  const count = stage >= 9 ? 4 : stage >= 7 ? 3 : 2;
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const phase = Math.sin(t * (3.1 + i * 0.7) + i * 2.3);
    if (phase < 0.9) continue;
    const [px, py] = points[i];
    const sx = ox + (px - BOX[0]) * s;
    const sy = oy + (py - BOX[1]) * s;
    const seed = Math.floor(t * 18) + i * 7;
    ctx.strokeStyle = i % 2 ? "#7df2ff" : "#ffe7a3";
    ctx.lineWidth = Math.max(1, s * 0.28);
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const a = ((seed * 37 + k * 113) % 360) * (Math.PI / 180);
      const len = s * (1.6 + ((seed + k * 5) % 4));
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len);
    }
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
}

/**
 * Draw the Modern portrait into (x, y, w, h). Returns false while the bust is
 * still decoding so the caller can fall back to the legacy portrait.
 * state: { health, maxHealth, alive, shield?, character }
 */
export function drawPortraitModern(ctx, x, y, w, h, state) {
  const ch = characterLayers(state.character);
  const m = ctx.getTransform();
  const dpr = Math.hypot(m.a, m.b) || 1;
  const s = Math.max(w / BOX[2], h / BOX[3]);
  const px = s * dpr;

  const real = isRealisticArt();
  const base = real
    ? getLayerImage(`portrait:rbase:${ch.key}`, BOX, realDefs(ch), realBase(ch), px)
    : getLayerImage(`portrait:base:${ch.key}`, BOX, ch.defs, ch.base, px);
  if (!base) return false;
  const bg = real
    ? getLayerImage("portrait:rbg", BOX, "", REAL_BACKDROP, px)
    : getLayerImage(`portrait:bg:${ch.accent}`, BOX, "", backdropMarkup(ch.accent), px);

  const now = performance.now();
  const t = now / 1000;
  const maxH = state.maxHealth || 1;
  const pct = Math.max(0, Math.min(1, state.health / maxH));
  const dead = !state.alive || state.health <= 0;
  const stage = dead ? 10 : Math.min(9, Math.floor((1 - pct) * 10 + 1e-4));

  // Event detection (hit jolt, heal / shield shimmer).
  if (P.health >= 0) {
    if (state.health < P.health - 0.01) P.hitAt = now;
    else if (state.health > P.health + 0.01 && !dead) P.healAt = now;
    const sh = state.shield || 0;
    if (P.shield >= 0 && sh > P.shield + 0.5) P.shieldAt = now;
  }
  P.health = state.health;
  P.shield = state.shield || 0;
  if (dead && P.deadAt < 0) P.deadAt = now;
  if (!dead) P.deadAt = -1e9;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  ctx.fillStyle = "#070b12";
  ctx.fillRect(x, y, w, h);
  if (bg) ctx.drawImage(bg, x + w / 2 - (BOX[2] * s) / 2, y + h / 2 - (BOX[3] * s) / 2, BOX[2] * s, BOX[3] * s);

  // Hit reaction: short damped jolt.
  const hk = (now - P.hitAt) / 240;
  let jx = 0;
  let jy = 0;
  if (hk >= 0 && hk < 1) {
    jx = Math.sin(hk * Math.PI * 3) * (1 - hk) * s * 1.1;
    jy = -(1 - hk) * s * 0.5;
  }
  const dw = BOX[2] * s;
  const dh = BOX[3] * s;
  const ox = Math.round(x + w / 2 - dw / 2 + jx);
  const oy = Math.round(y + h / 2 - dh / 2 + jy + s * 1.5);
  ctx.drawImage(base, ox, oy, dw, dh);

  if (stage > 0) {
    const dmg = getLayerImage(`portrait:dmg:${ch.open ? 1 : 0}:${stage}`, BOX, DMG_DEFS, damageMarkup(stage, ch.open), px);
    if (dmg) ctx.drawImage(dmg, ox, oy, dw, dh);
  }

  const glowA = flicker(t, stage) * (real ? 0.6 : 1);
  if (glowA > 0) {
    const glow = real
      ? getLayerImage(`portrait:rglow:${ch.key}`, BOX, realDefs(ch), `<g filter="url(#rGlow)">${ch.glow}</g>`, px)
      : getLayerImage(`portrait:glow:${ch.key}`, BOX, ch.defs, ch.glow, px);
    if (glow) {
      ctx.globalAlpha = glowA;
      ctx.drawImage(glow, ox, oy, dw, dh);
      ctx.globalAlpha = 1;
    }
  }

  if (stage >= 5 && !dead) drawSparks(ctx, t, stage, ox, oy, s, ch.open);

  // Heal / shield restore: a coloured silhouette band sweeps down the bust.
  const healK = (now - P.healAt) / 650;
  const shieldK = (now - P.shieldAt) / 650;
  const shimmerK = healK >= 0 && healK < 1 ? healK : shieldK >= 0 && shieldK < 1 ? shieldK : -1;
  if (shimmerK >= 0) {
    const id = shimmerK === healK ? "silH" : "silS";
    const sil = real
      ? getLayerImage(`portrait:r${id}:${ch.key}`, BOX, realDefs(ch), realSilhouette(ch, `r${id}`), px)
      : getLayerImage(`portrait:${id}:${ch.key}`, BOX, ch.defs, `<g filter="url(#${id})">${ch.base}</g>`, px);
    if (sil) {
      // Soft-edged band: five slices, brightest in the middle.
      const band = 0.32;
      const c = -band + shimmerK * (1 + band * 2);
      const fade = 1 - shimmerK * 0.5;
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 5; i++) {
        const top = Math.max(0, c - band / 2 + (i * band) / 5);
        const bot = Math.min(1, c - band / 2 + ((i + 1) * band) / 5);
        if (bot <= top) continue;
        ctx.globalAlpha = (real ? 0.3 : 0.6) * fade * BAND_WEIGHTS[i];
        ctx.drawImage(sil, 0, top * sil.height, sil.width, (bot - top) * sil.height, ox, oy + top * dh, dw, (bot - top) * dh);
      }
      ctx.globalAlpha = 0.14 * (1 - shimmerK);
      ctx.drawImage(sil, ox, oy, dw, dh);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
  }

  // Hit flash on the silhouette. Realistic: a restrained red wash over the
  // (already desaturated) bust instead of a white-out.
  if (real && hk >= 0 && hk < 0.6) {
    const sil = getLayerImage(`portrait:rsilR:${ch.key}`, BOX, realDefs(ch), realSilhouette(ch, "rsilR"), px);
    if (sil) {
      ctx.globalAlpha = 0.4 * (1 - hk / 0.6);
      ctx.drawImage(sil, ox, oy, dw, dh);
      ctx.globalAlpha = 1;
    }
  } else if (hk >= 0 && hk < 0.6) {
    const sil = getLayerImage(`portrait:silW:${ch.key}`, BOX, ch.defs, `<g filter="url(#silW)">${ch.base}</g>`, px);
    if (sil) {
      ctx.globalAlpha = 0.85 * (1 - hk / 0.6);
      ctx.drawImage(sil, ox, oy, dw, dh);
      ctx.globalAlpha = 1;
    }
  }

  if (real) {
    drawRealVitals(ctx, x, y, w, h, s, now, pct, dead);
  } else if (dead) {
    ctx.fillStyle = "rgba(6,8,12,0.5)";
    ctx.fillRect(x, y, w, h);
    const k = Math.min(1, (now - P.deadAt) / 400);
    ctx.globalAlpha = k;
    ctx.fillStyle = "rgba(255,42,74,0.9)";
    ctx.fillRect(x, y + h * 0.7, w, Math.max(2, s * 0.35));
    ctx.globalAlpha = 1;
  } else if (pct < 0.3) {
    const pulse = 0.5 + 0.5 * Math.sin(now * (pct < 0.15 ? 0.014 : 0.009));
    ctx.fillStyle = `rgba(255,42,74,${(0.05 + 0.08 * pulse).toFixed(3)})`;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = `rgba(255,42,74,${(0.35 + 0.5 * pulse).toFixed(3)})`;
    ctx.lineWidth = Math.max(2, s * 0.5);
    ctx.strokeRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  }
  ctx.restore();
  return true;
}

// ─── Realistic ──────────────────────────────────────────────────────────────

/**
 * Realistic bust: the same character markup with the ink outlines thinned to
 * a faint contact shade, graded toward desaturated, then lit by a soft key
 * from the upper left with the lower right falling into shadow. Rasterised
 * once per character and size like the Modern layers.
 */
const REAL_DEFS =
  `<filter id="rGrade" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
  `<feColorMatrix type="saturate" values=".28"/>` +
  `<feComponentTransfer><feFuncR type="linear" slope=".86" intercept=".015"/><feFuncG type="linear" slope=".87" intercept=".015"/>` +
  `<feFuncB type="linear" slope=".88" intercept=".02"/></feComponentTransfer></filter>` +
  `<filter id="rGlow" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values=".4"/></filter>` +
  `<linearGradient id="rKey" x1="0" y1="0" x2="1" y2="1">` +
  `<stop offset="0" stop-color="#fff4e6" stop-opacity=".2"/><stop offset=".42" stop-color="#fff4e6" stop-opacity="0"/>` +
  `<stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient>` +
  silFilter("rsilH", "#cfe0da") + silFilter("rsilS", "#b9c9d6") + silFilter("rsilR", "#9e2f27");

const INK_STROKE = `stroke="${INK}"`;
const SOFT_STROKE = `stroke="rgba(10,12,15,.3)"`;

function realDefs(ch) {
  if (!ch.rdefs) ch.rdefs = ch.defs + REAL_DEFS;
  return ch.rdefs;
}

function realSoft(ch) {
  if (!ch.rsoft) ch.rsoft = ch.base.split(INK_STROKE).join(SOFT_STROKE);
  return ch.rsoft;
}

function realBase(ch) {
  if (!ch.rbase) {
    const soft = realSoft(ch);
    ch.rbase =
      `<g filter="url(#rGrade)">${soft}</g>` +
      `<mask id="rMask"><g filter="url(#silW)">${soft}</g></mask>` +
      `<rect x="${BOX[0]}" y="${BOX[1]}" width="${BOX[2]}" height="${BOX[3]}" fill="url(#rKey)" mask="url(#rMask)"/>`;
  }
  return ch.rbase;
}

function realSilhouette(ch, id) {
  return `<g filter="url(#${id})">${realSoft(ch)}</g>`;
}

/** Neutral dark backdrop with a faint key-side falloff; no accent, no scanlines. */
const REAL_BACKDROP =
  `<defs><radialGradient id="rpbg" cx=".3" cy=".25" r=".95">` +
  `<stop offset="0" stop-color="#2a2f33"/><stop offset=".5" stop-color="#121518"/>` +
  `<stop offset="1" stop-color="#06080a"/></radialGradient></defs>` +
  `<rect x="${BOX[0]}" y="${BOX[1]}" width="${BOX[2]}" height="${BOX[3]}" fill="url(#rpbg)"/>` +
  `<ellipse cx="0" cy="-56" rx="30" ry="9" fill="#000" opacity=".5"/>`;

const R_CRIT = "rgb(224,73,63)";
const R_DEAD = "rgba(6,8,10,0.55)";

/** Realistic low-health / dead overlays: thin, dim, no allocation per frame. */
function drawRealVitals(ctx, x, y, w, h, s, now, pct, dead) {
  if (dead) {
    ctx.fillStyle = R_DEAD;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = Math.min(1, (now - P.deadAt) / 400) * 0.85;
    ctx.fillStyle = R_CRIT;
    ctx.fillRect(x, Math.round(y + h * 0.7), w, 1);
    ctx.globalAlpha = 1;
  } else if (pct < 0.3) {
    const pulse = 0.5 + 0.5 * Math.sin(now * (pct < 0.15 ? 0.014 : 0.009));
    ctx.fillStyle = R_CRIT;
    ctx.globalAlpha = 0.04 + 0.06 * pulse;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 0.25 + 0.4 * pulse;
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y + 1, 1, h - 2);
    ctx.fillRect(x + w - 1, y + 1, 1, h - 2);
    ctx.globalAlpha = 1;
  }
}

function backdropMarkup(accent) {
  let lines = "";
  for (let yy = BOX[1] + 1; yy < BOX[1] + BOX[3]; yy += 1.6) {
    lines += `M${BOX[0]},${yy.toFixed(1)}H${BOX[0] + BOX[2]}`;
  }
  return (
    `<defs><radialGradient id="pbg" cx=".36" cy=".32" r=".85">` +
    `<stop offset="0" stop-color="${accent}" stop-opacity=".42"/><stop offset=".42" stop-color="#0d1a28"/>` +
    `<stop offset="1" stop-color="#03050a"/></radialGradient></defs>` +
    `<rect x="${BOX[0]}" y="${BOX[1]}" width="${BOX[2]}" height="${BOX[3]}" fill="url(#pbg)"/>` +
    `<path d="${lines}" stroke="#9fd8ff" stroke-width=".18" opacity=".08"/>` +
    `<ellipse cx="0" cy="-56" rx="30" ry="9" fill="#000" opacity=".45"/>`
  );
}

/** Stage index the portrait would show for a health fraction (testing aid). */
export function portraitStage(pct, alive = true) {
  if (!alive || pct <= 0) return 10;
  return Math.min(9, Math.floor((1 - pct) * 10 + 1e-4));
}

/** Forget hit/heal history (tooling and level restarts). */
export function resetPortraitMotion() {
  P.health = -1;
  P.shield = -1;
  P.hitAt = -1e9;
  P.healAt = -1e9;
  P.shieldAt = -1e9;
  P.deadAt = -1e9;
}
