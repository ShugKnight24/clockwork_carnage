/**
 * Cinematic overlay: letterbox bars, captions, narration subtitles, title and
 * logo slams, boss/squad cards, and the fade / flash / glitch transitions,
 * drawn on the HUD canvas over the director's shot.
 *
 * It only reads a timeline state (`stateAt()` from timeline.js) plus a few
 * options, so the live director and the recorder draw identical frames.
 *
 * The overlay runs every frame of a reel, so every piece of text is baked
 * once into an offscreen sprite (per text object, profile, size and DPR) and
 * only blitted afterwards with alpha and an integer-snapped offset. Glows are
 * layered translucent fills at bake time, never shadowBlur.
 *
 * Looks follow the art profile, matching the HUD's boss name card:
 *   legacy    — neon monospace, cyan/red layered glow, hairlines;
 *   modern    — Comic: cream caption plates, ink outlines, chrome titles;
 *   realistic — Modern helmet-HUD: off-white tracked type, thin fading rules.
 */

import { COLOR, FONT, CAPTION } from "../ui/design-tokens.js";
import * as kit from "../ui/modern-ui-kit.js";

const BAR_ASPECT = 2.39;
const SLIDE_MS = 0.25; // caption slide in/out (s)
const SLIDE_PX = 24;
const PUNCH_S = 0.2; // logo/title scale punch 1.08 → 1
const CARD_OPEN_S = 0.22;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

// ─── Layout (pure) ──────────────────────────────────────────────────────────

/**
 * Geometry for one frame. Bars take a 16:9 picture to 2.39:1 when the
 * letterbox is fully in; a picture already wider gets none. Pass `out` to
 * reuse an object (the per-frame path does), otherwise a new one is returned.
 */
export function overlayLayout(w, h, { letterbox = 0, fontScale = 1, safe = 0 } = {}, out = null) {
  const L = out ?? { barH: 0, caption: {}, narration: {}, title: {}, card: {} };
  const barH = Math.max(0, (h - w / BAR_ASPECT) / 2) * clamp(letterbox, 0, 1);
  L.barH = barH;
  const cap = L.caption;
  cap.size = clamp(h * 0.034, 16, 44) * fontScale;
  cap.x = w * 0.06 + safe;
  cap.y = h - barH - h * 0.08 - safe;
  cap.maxW = w * 0.62 - safe;
  // Narration subtitles sit centred under the caption lane, above the bar.
  const nar = L.narration;
  nar.size = Math.max(14, cap.size * 0.72);
  nar.x = w / 2;
  nar.y = h - barH - h * 0.03 - safe;
  nar.maxW = w * 0.64;
  const ti = L.title;
  ti.size = clamp(h * 0.09, 36, 120);
  ti.x = w / 2;
  ti.y = h * 0.5;
  const card = L.card;
  card.w = w * 0.46;
  card.h = clamp(h * 0.12, 84, 150);
  card.x = (w - card.w) / 2;
  card.y = h * 0.35 - card.h / 2;
  return L;
}

// ─── Themes ─────────────────────────────────────────────────────────────────

const LEGACY_MONO = '"SF Mono", Menlo, Consolas, "Courier New", monospace';
const REAL_FAMILY = '"Helvetica Neue", "Segoe UI", Roboto, Arial, sans-serif';

const _fonts = new Map();
/** Cached font string per family/weight/size (built once, never per frame). */
function font(family, weight, px) {
  const size = Math.max(6, Math.round(px));
  const key = `${family}|${weight}|${size}`;
  let f = _fonts.get(key);
  if (!f) {
    f = `${weight} ${size}px ${family}`;
    _fonts.set(key, f);
  }
  return f;
}

const REAL = { text: "#e4e6e1", dim: "#98a3a4", accent: "#8fbcc4", crit: "#e0493f", critSoft: "#e98a80" };
const NEON = { cyan: "#00ffcc", cyanRGB: "0,255,204", core: "#e2fff8", red: "#ff3a3a", redRGB: "255,58,58", redCore: "#ffe4e4" };

// ─── Sprite baking ──────────────────────────────────────────────────────────

let _measure = null;
function measureCtx() {
  if (!_measure) _measure = document.createElement("canvas").getContext("2d");
  return _measure;
}

function textWidth(fontStr, text, spacing = 0) {
  const m = measureCtx();
  m.font = fontStr;
  if ("letterSpacing" in m) m.letterSpacing = `${spacing}px`;
  return m.measureText(text).width;
}

/** Offscreen canvas of w×h CSS px plus `pad` on every side, painted at dpr. */
function bake(entry, w, h, pad, dpr, paint) {
  const c = entry.canvas ?? document.createElement("canvas");
  c.width = Math.max(1, Math.ceil((w + pad * 2) * dpr));
  c.height = Math.max(1, Math.ceil((h + pad * 2) * dpr));
  const g = c.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, dpr * pad, dpr * pad);
  g.clearRect(-pad, -pad, w + pad * 2, h + pad * 2);
  paint(g, w, h);
  entry.canvas = c;
  entry.w = Math.round(w);
  entry.h = Math.round(h);
  entry.pad = pad;
  return entry;
}

/**
 * Sprites are cached against the reel's own caption/narration objects, so
 * a steady frame does no lookups by string. An entry is rebuilt only when the
 * profile, size, DPR or viewport width changes.
 */
const _cache = new WeakMap();
function entryFor(obj, slot, profile, size, dpr, vw) {
  let e = _cache.get(obj);
  if (!e) {
    e = {};
    _cache.set(obj, e);
  }
  let s = e[slot];
  if (!s) s = e[slot] = { canvas: null, profile: "", size: 0, dpr: 0, vw: 0, w: 0, h: 0, pad: 0, ax: 0, ay: 0 };
  const fresh = s.canvas && s.profile === profile && s.size === size && s.dpr === dpr && s.vw === vw;
  if (!fresh) {
    s.profile = profile;
    s.size = size;
    s.dpr = dpr;
    s.vw = vw;
    s.stale = true;
  }
  return s;
}

/** Blit a baked entry with its top-left at (x, y), snapped to whole pixels. */
function blit(ctx, e, x, y) {
  const p = e.pad;
  ctx.drawImage(e.canvas, Math.round(x - p), Math.round(y - p), e.w + p * 2, e.h + p * 2);
}

/** Layered translucent fills around the glyphs: a soft glow without shadowBlur. */
function glowText(g, text, x, y, rgb, radius) {
  const steps = [
    [radius, 0.1],
    [radius * 0.6, 0.16],
    [radius * 0.3, 0.26],
  ];
  for (const [r, a] of steps) {
    g.fillStyle = `rgba(${rgb},${a})`;
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2;
      g.fillText(text, x + Math.cos(ang) * r, y + Math.sin(ang) * r);
    }
  }
}

/** Ink outline, every pass before any fill (no seams between letters). */
function inkedText(g, text, x, y, fill, ink, lw) {
  g.lineJoin = "round";
  g.lineWidth = lw;
  g.strokeStyle = ink;
  g.strokeText(text, x, y);
  g.fillStyle = fill;
  g.fillText(text, x, y);
}

/** Greedy word wrap at bake time. */
function wrap(fontStr, text, maxW, spacing = 0) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && textWidth(fontStr, next, spacing) > maxW) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

// ─── Captions (bottom-left) ────────────────────────────────────────────────

function captionStyle(profile, size) {
  if (profile === "legacy") return { font: font(LEGACY_MONO, 800, size), spacing: size * 0.04 };
  if (profile === "realistic") return { font: font(REAL_FAMILY, 500, size), spacing: size * 0.16 };
  return { font: font(FONT.display, 800, size), spacing: size * 0.08 };
}

function bakeCaption(e, text, profile, size, maxW) {
  const label = String(text).toUpperCase();
  let { font: f, spacing } = captionStyle(profile, size);
  let tw = textWidth(f, label, spacing);
  // Too long for the lane: shrink rather than wrap (captions are one beat long).
  if (tw > maxW) {
    const s = size * (maxW / tw);
    ({ font: f, spacing } = captionStyle(profile, s));
    size = s;
    tw = textWidth(f, label, spacing);
  }
  tw = Math.ceil(tw);
  if (profile === "legacy") {
    const padX = Math.round(size * 0.55);
    const w = tw + padX * 2 + size * 1.6;
    const h = Math.round(size * 1.7);
    bake(e, w, h, Math.ceil(size * 0.3), e.dpr, (g) => {
      const band = g.createLinearGradient(0, 0, w, 0);
      band.addColorStop(0, "rgba(0,12,16,0.78)");
      band.addColorStop(0.65, "rgba(0,12,16,0.5)");
      band.addColorStop(1, "rgba(0,12,16,0)");
      g.fillStyle = band;
      g.fillRect(0, 0, w, h);
      g.fillStyle = NEON.cyan;
      g.fillRect(0, 0, 3, h);
      const rule = g.createLinearGradient(0, 0, w * 0.8, 0);
      rule.addColorStop(0, `rgba(${NEON.cyanRGB},0.9)`);
      rule.addColorStop(1, `rgba(${NEON.cyanRGB},0)`);
      g.fillStyle = rule;
      g.fillRect(0, 0, w * 0.8, 1);
      g.fillRect(0, h - 1, w * 0.5, 1);
      g.font = f;
      if ("letterSpacing" in g) g.letterSpacing = `${spacing}px`;
      g.textBaseline = "middle";
      const x = padX + 3;
      const y = h / 2 + size * 0.04;
      glowText(g, label, x, y, NEON.cyanRGB, size * 0.14);
      // A faint red ghost a pixel left: the legacy CRT's colour fringe.
      g.fillStyle = "rgba(255,40,90,0.45)";
      g.fillText(label, x - 1.5, y);
      g.fillStyle = NEON.core;
      g.fillText(label, x, y);
    });
    e.ay = e.h / 2;
  } else if (profile === "realistic") {
    const padX = Math.round(size * 0.9);
    const w = tw + padX * 2 + size * 2;
    const h = Math.round(size * 2);
    bake(e, w, h, 4, e.dpr, (g) => {
      const plate = g.createLinearGradient(0, 0, w, 0);
      plate.addColorStop(0, "rgba(6,9,11,0.6)");
      plate.addColorStop(0.6, "rgba(6,9,11,0.35)");
      plate.addColorStop(1, "rgba(6,9,11,0)");
      g.fillStyle = plate;
      g.fillRect(0, 0, w, h);
      g.fillStyle = REAL.accent;
      g.fillRect(0, Math.round(h * 0.18), 2, Math.round(h * 0.64));
      const rule = g.createLinearGradient(0, 0, tw + padX * 2, 0);
      rule.addColorStop(0, "rgba(226,232,230,0.55)");
      rule.addColorStop(1, "rgba(226,232,230,0)");
      g.fillStyle = rule;
      g.fillRect(0, 0, tw + padX * 2, 1);
      g.font = f;
      if ("letterSpacing" in g) g.letterSpacing = `${spacing}px`;
      g.textBaseline = "middle";
      const y = h / 2 + size * 0.05;
      g.fillStyle = "rgba(0,0,0,0.5)";
      g.fillText(label, padX + 1, y + 1);
      g.fillStyle = REAL.text;
      g.fillText(label, padX, y);
    });
    e.ay = e.h / 2;
  } else {
    // Comic: cream caption plate, heavy ink border, hard ink drop shadow,
    // crimson tab, tilted a degree like a panel caption.
    const padX = Math.round(size * 0.6);
    const tab = Math.round(size * 0.32);
    const w = tw + padX * 2 + tab;
    const h = Math.round(size * 1.6);
    const ink = Math.max(2, Math.round(size * 0.09));
    const drop = Math.round(size * 0.16);
    const pad = Math.ceil(size * 0.5);
    bake(e, w, h, pad, e.dpr, (g) => {
      g.translate(w / 2, h / 2);
      g.rotate(-0.018);
      g.translate(-w / 2, -h / 2);
      g.fillStyle = "rgba(4,6,11,0.9)";
      g.fillRect(drop, drop, w, h);
      g.fillStyle = COLOR.ink;
      g.fillRect(-ink, -ink, w + ink * 2, h + ink * 2);
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, CAPTION.cream.top);
      grad.addColorStop(1, CAPTION.cream.bottom);
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(255,255,255,0.4)";
      g.fillRect(0, 0, w, Math.max(1, ink * 0.5));
      g.fillStyle = COLOR.crimson;
      g.fillRect(0, 0, tab, h);
      g.fillStyle = COLOR.ink;
      g.fillRect(tab, 0, Math.max(1, ink * 0.6), h);
      g.font = f;
      if ("letterSpacing" in g) g.letterSpacing = `${spacing}px`;
      g.textBaseline = "middle";
      g.fillStyle = CAPTION.cream.text;
      g.fillText(label, tab + padX + spacing / 2, h / 2 + size * 0.07);
    });
    e.ay = e.h / 2;
  }
}

// ─── Narration subtitles (bottom-centre) ───────────────────────────────────

function bakeNarration(e, text, profile, size, maxW) {
  const f =
    profile === "legacy" ? font(LEGACY_MONO, 600, size) : profile === "realistic" ? font(REAL_FAMILY, 400, size) : font(FONT.display, 700, size);
  const spacing = profile === "modern" ? size * 0.02 : 0;
  let lines = wrap(f, text, maxW, spacing);
  // Balance the lines so a subtitle never ends on a lone word.
  if (lines.length > 1) {
    const even = textWidth(f, text, spacing) / lines.length;
    const balanced = wrap(f, text, Math.min(maxW, even * 1.08), spacing);
    if (balanced.length === lines.length) lines = balanced;
  }
  let tw = 0;
  for (const l of lines) tw = Math.max(tw, textWidth(f, l, spacing));
  const lineH = Math.round(size * 1.35);
  const padX = Math.round(size * 0.6);
  const padY = Math.round(size * 0.3);
  const w = Math.ceil(tw) + padX * 2;
  const h = lines.length * lineH + padY * 2;
  bake(e, w, h, 4, e.dpr, (g) => {
    g.font = f;
    if ("letterSpacing" in g) g.letterSpacing = `${spacing}px`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    // Standard subtitle backing: readable over any shot, lighter under Comic's ink.
    g.fillStyle = profile === "modern" ? "rgba(4,6,11,0.4)" : "rgba(0,0,0,0.55)";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < lines.length; i++) {
      const y = padY + lineH * (i + 0.5) + size * 0.04;
      if (profile === "legacy") {
        g.fillStyle = `rgba(${NEON.cyanRGB},0.22)`;
        g.fillText(lines[i], w / 2 + 1, y + 1);
        g.fillStyle = "#d6fff5";
        g.fillText(lines[i], w / 2, y);
      } else if (profile === "realistic") {
        g.fillStyle = REAL.text;
        g.fillText(lines[i], w / 2, y);
      } else {
        inkedText(g, lines[i], w / 2, y, COLOR.cream, COLOR.ink, Math.max(2, size * 0.16));
      }
    }
  });
  e.ay = e.h; // anchored by its bottom edge
}

// ─── Titles and the logo slam (centre) ─────────────────────────────────────

function bakeTitle(e, text, sub, profile, size, maxW) {
  const label = String(text).toUpperCase();
  let px = size;
  const sp = profile === "realistic" ? 0.2 : profile === "legacy" ? 0.06 : 0.06;
  const fam = profile === "legacy" ? LEGACY_MONO : profile === "realistic" ? REAL_FAMILY : FONT.display;
  const wt = profile === "realistic" ? 300 : 800;
  let tw = textWidth(font(fam, wt, px), label, px * sp);
  if (tw > maxW) {
    px *= maxW / tw;
    tw = textWidth(font(fam, wt, px), label, px * sp);
  }
  const subSize = Math.max(14, Math.round(px * 0.26));
  const w = Math.ceil(Math.max(tw, sub ? textWidth(font(fam, 700, subSize), sub.toUpperCase(), subSize * 0.2) : 0)) + px;
  const h = Math.round(px * 1.5 + (sub ? subSize * 2.2 : 0));
  const base = Math.round(px * 1.1);
  bake(e, w, h, Math.ceil(px * 0.3), e.dpr, (g) => {
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    const cx = w / 2;
    if (profile !== "modern") {
      // Soft dark pool behind thin type so bright set lights never cut through it.
      const pad = Math.ceil(px * 0.3);
      g.save();
      g.translate(cx, h / 2);
      g.scale(1, (h / 2 + pad) / (w / 2 + pad));
      const pool = g.createRadialGradient(0, 0, 0, 0, 0, w / 2 + pad);
      pool.addColorStop(0, "rgba(0,0,0,0.5)");
      pool.addColorStop(0.55, "rgba(0,0,0,0.32)");
      pool.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = pool;
      g.fillRect(-w / 2 - pad, -w / 2 - pad, w + pad * 2, w + pad * 2);
      g.restore();
    }
    if (profile === "modern") {
      kit.drawTitle(g, label, cx, base, px, COLOR.cyan);
    } else {
      g.font = font(fam, wt, px);
      if ("letterSpacing" in g) g.letterSpacing = `${px * sp}px`;
      const x = cx + (px * sp) / 2;
      if (profile === "legacy") {
        glowText(g, label, x, base, NEON.cyanRGB, px * 0.12);
        g.fillStyle = "rgba(255,40,90,0.5)";
        g.fillText(label, x - 2, base);
        g.fillStyle = NEON.core;
        g.fillText(label, x, base);
        g.fillStyle = `rgba(${NEON.cyanRGB},0.8)`;
        g.fillRect(cx - tw * 0.4, base + px * 0.18, tw * 0.8, 2);
      } else {
        g.fillStyle = "rgba(0,0,0,0.45)";
        g.fillText(label, x + 1, base + 1);
        g.fillStyle = REAL.text;
        g.fillText(label, x, base);
        const rule = g.createLinearGradient(cx - tw * 0.4, 0, cx + tw * 0.4, 0);
        rule.addColorStop(0, "rgba(143,188,196,0)");
        rule.addColorStop(0.5, REAL.accent);
        rule.addColorStop(1, "rgba(143,188,196,0)");
        g.fillStyle = rule;
        g.fillRect(cx - tw * 0.4, base + Math.round(px * 0.24), tw * 0.8, 1);
      }
    }
    if (sub) drawSub(g, sub, cx, base + px * 0.45, subSize, profile);
  });
  e.ax = e.w / 2;
  e.ay = base - px * 0.35; // optical centre of the caps
}

/** The small line under a title or card (tracked, per profile). */
function drawSub(g, sub, cx, top, size, profile, alert = false) {
  const label = String(sub).toUpperCase();
  g.textAlign = "center";
  g.textBaseline = "top";
  if (profile === "modern") {
    kit.drawCaption(g, cx, top, label, { size, scheme: alert ? "crimson" : "cream", align: "center" });
    return;
  }
  const fam = profile === "legacy" ? LEGACY_MONO : REAL_FAMILY;
  const spacing = size * (profile === "legacy" ? 0.12 : 0.24);
  g.font = font(fam, profile === "legacy" ? 700 : 500, size);
  if ("letterSpacing" in g) g.letterSpacing = `${spacing}px`;
  // Red is for threats (boss cards); titles and taglines take the accent.
  g.fillStyle = profile === "legacy" ? (alert ? "#ff8080" : "#7fffe6") : alert ? REAL.critSoft : REAL.accent;
  g.fillText(label, cx + spacing / 2, top);
}

function bakeSub(e, sub, profile, size) {
  const fam = profile === "legacy" ? LEGACY_MONO : REAL_FAMILY;
  const sp = size * (profile === "legacy" ? 0.12 : 0.24);
  const tw = profile === "modern" ? kit.captionWidth(sub, size) : textWidth(font(fam, 700, size), String(sub).toUpperCase(), sp);
  const w = Math.ceil(tw) + 8;
  const h = Math.round(size * 1.9);
  bake(e, w, h, 6, e.dpr, (g) => drawSub(g, sub, w / 2, 0, size, profile));
}

/** The logo raster at its slam size: SVG rasterises once, then it is a blit. */
const _logo = { canvas: null, img: null, w: 0, h: 0, dpr: 0, pad: 0, stale: true, ax: 0, ay: 0 };
function logoSprite(img, w, dpr) {
  const iw = img.naturalWidth || img.width || 720;
  const ih = img.naturalHeight || img.height || 322;
  const lw = Math.round(w);
  const lh = Math.round((lw * ih) / iw);
  if (_logo.canvas && _logo.img === img && _logo.w === lw && _logo.dpr === dpr) return _logo;
  _logo.img = img;
  _logo.dpr = dpr;
  // Baked at the punch's peak scale so the slam never upsamples.
  bake(_logo, lw * 1.08, lh * 1.08, 0, dpr, (g, bw, bh) => g.drawImage(img, 0, 0, bw, bh));
  _logo.w = lw;
  _logo.h = lh;
  return _logo;
}

// ─── Cards (boss / squad) ──────────────────────────────────────────────────

function bakeCard(e, c, profile, L) {
  const cw = Math.round(L.card.w);
  const ch = Math.round(L.card.h);
  const squad = c.tone === "squad";
  const title = String(c.text).toUpperCase();
  const sub = c.sub ? String(c.sub) : "";
  const pad = Math.ceil(ch * 0.4);
  bake(e, cw, ch, pad, e.dpr, (g) => {
    const cx = cw / 2;
    let size = Math.round(ch * 0.4);
    if (profile === "modern") {
      const accent = squad ? COLOR.cyan : COLOR.crimson;
      kit.drawPanel(g, 0, 0, cw, ch, { variant: "menu", accent, chamfer: 16 });
      g.fillStyle = squad ? "rgba(34,230,255,0.12)" : "rgba(255,42,74,0.16)";
      g.fillRect(2, 2, cw - 4, ch - 4);
      size = fitSize(font(FONT.display, 800, ch * 0.46), title, Math.round(ch * 0.46), cw * 0.86, 0.06);
      kit.drawTitle(g, title, cx, ch * (sub ? 0.56 : 0.66), size, accent, squad ? {} : { fillTop: "#fff1f3", fillBottom: "#ffb3be" });
      if (sub) {
        // Hangs off the bottom edge as a tab, like the HUD boss card.
        const ss = Math.max(14, Math.round(ch * 0.16));
        kit.drawCaption(g, cx, ch - Math.round(ss * 1.65 * 0.55), sub, { size: ss, scheme: squad ? "cyan" : "crimson", align: "center" });
      }
      return;
    }
    const legacy = profile === "legacy";
    const rgb = legacy ? (squad ? NEON.cyanRGB : NEON.redRGB) : squad ? "143,188,196" : "224,73,63";
    // Backdrop band fading out at both ends, hairlines top and bottom.
    const band = g.createLinearGradient(0, 0, cw, 0);
    band.addColorStop(0, legacy ? `rgba(${rgb},0)` : "rgba(6,9,11,0)");
    band.addColorStop(0.5, legacy ? `rgba(${squad ? "0,120,110" : "180,20,20"},0.6)` : "rgba(6,9,11,0.8)");
    if (!legacy) {
      band.addColorStop(0.2, "rgba(6,9,11,0.62)");
      band.addColorStop(0.8, "rgba(6,9,11,0.62)");
    }
    band.addColorStop(1, legacy ? `rgba(${rgb},0)` : "rgba(6,9,11,0)");
    g.fillStyle = band;
    g.fillRect(0, 0, cw, ch);
    if (legacy) {
      // Scanlines over the band, baked.
      g.fillStyle = "rgba(0,0,0,0.18)";
      for (let y = 0; y < ch; y += 3) g.fillRect(0, y, cw, 1);
    }
    const rule = g.createLinearGradient(0, 0, cw, 0);
    rule.addColorStop(0, `rgba(${rgb},0)`);
    rule.addColorStop(0.5, `rgba(${rgb},${legacy ? 1 : 0.85})`);
    rule.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = rule;
    g.fillRect(0, 0, cw, legacy ? 2 : 1);
    g.fillRect(0, ch - (legacy ? 2 : 1), cw, legacy ? 2 : 1);
    const fam = legacy ? LEGACY_MONO : REAL_FAMILY;
    const wt = legacy ? 800 : 400;
    const sp = legacy ? 0.06 : 0.2;
    size = fitSize(font(fam, wt, size), title, size, cw * 0.86, sp);
    g.font = font(fam, wt, size);
    if ("letterSpacing" in g) g.letterSpacing = `${size * sp}px`;
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    const ty = Math.round(ch * (sub ? 0.56 : 0.64));
    const tx = cx + (size * sp) / 2;
    if (legacy) {
      glowText(g, title, tx, ty, rgb, size * 0.14);
      g.fillStyle = squad ? NEON.core : NEON.redCore;
      g.fillText(title, tx, ty);
    } else {
      g.fillStyle = "rgba(0,0,0,0.45)";
      g.fillText(title, tx + 1, ty + 1);
      g.fillStyle = REAL.text;
      g.fillText(title, tx, ty);
    }
    if (sub) {
      const ss = Math.max(14, Math.round(ch * 0.16));
      g.textBaseline = "top";
      g.font = font(fam, legacy ? 700 : 500, ss);
      const s2 = ss * (legacy ? 0.12 : 0.24);
      if ("letterSpacing" in g) g.letterSpacing = `${s2}px`;
      g.fillStyle = legacy ? (squad ? "#7fffe6" : "#ff8080") : squad ? REAL.accent : REAL.critSoft;
      g.fillText(sub.toUpperCase(), cx + s2 / 2, ty + ch * 0.12);
    }
  });
  e.ax = 0;
  e.ay = 0;
}

function fitSize(fontStr, text, size, maxW, sp) {
  const tw = textWidth(fontStr, text, size * sp);
  return tw > maxW ? Math.floor(size * (maxW / tw)) : size;
}

// ─── Transitions ───────────────────────────────────────────────────────────

let _tint = null;
function tintCanvas(pw, ph) {
  if (!_tint) _tint = document.createElement("canvas");
  if (_tint.width !== pw || _tint.height !== ph) {
    _tint.width = pw;
    _tint.height = ph;
  }
  return _tint;
}

/** Deterministic hash → 0..1, so recorded and live glitches tear the same way. */
function hash(n) {
  let t = (n * 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Chromatic tearing: red and cyan channel copies of the picture pushed apart,
 * then 3–6 horizontal slices redrawn sideways, re-rolled 30 times a second.
 */
function drawGlitch(ctx, src, w, h, k, now) {
  if (!src || !src.width) return;
  const sx = src.width / w;
  const sy = src.height / h;
  const shift = w * 0.01 * k;
  const seed = Math.floor(now * 30);
  // Channel split, drawn through one reusable tint canvas.
  const t = tintCanvas(src.width, src.height);
  const g = t.getContext("2d");
  const prevOp = ctx.globalCompositeOperation;
  const prevA = ctx.globalAlpha;
  for (let pass = 0; pass < 2; pass++) {
    g.globalCompositeOperation = "copy";
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = "multiply";
    g.fillStyle = pass === 0 ? "#ff0000" : "#00ffff";
    g.fillRect(0, 0, t.width, t.height);
    g.globalCompositeOperation = "destination-in";
    g.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.35 * k;
    ctx.drawImage(t, Math.round(pass === 0 ? -shift : shift), 0, w, h);
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = prevA;
  const n = 3 + Math.floor(hash(seed) * 4);
  for (let i = 0; i < n; i++) {
    const r1 = hash(seed * 7 + i * 13 + 1);
    const r2 = hash(seed * 11 + i * 17 + 2);
    const r3 = hash(seed * 5 + i * 23 + 3);
    const y = Math.floor(r1 * h * 0.92);
    const bh = Math.max(2, Math.floor(h * (0.012 + r2 * 0.07)));
    const dx = Math.round((r3 * 2 - 1) * shift * 3);
    ctx.drawImage(src, 0, y * sy, src.width, bh * sy, dx, y, w, bh);
    // A bright tear line along the slice edge.
    ctx.fillStyle = r3 > 0.5 ? "rgba(0,255,230,0.35)" : "rgba(255,40,90,0.35)";
    ctx.fillRect(0, y, w, 1);
  }
  ctx.globalCompositeOperation = prevOp;
}

// ─── Frame ─────────────────────────────────────────────────────────────────

const _L = overlayLayout(16, 9, {});
const _lopts = { letterbox: 0, fontScale: 1, safe: 0 };

/**
 * Draw one overlay frame.
 *   state: stateAt() output. Caption/narration windows are timed from `now`
 *     (reel seconds) and `bpm` (the reel's tempo) so slides land on beats.
 *   opts.flash / opts.glitch: 0..1 intensities from the director (already
 *     capped at 3 per second); reduced motion drops both, and the punches.
 *   opts.source: the canvas the glitch tears (the game canvas); defaults to
 *     the overlay's own canvas.
 *   A "title" caption with `logo: true` slams `opts.logo` instead of its text.
 */
export function drawOverlay(ctx, w, h, state, opts = {}) {
  const profile = opts.profile === "legacy" || opts.profile === "realistic" ? opts.profile : "modern";
  const reduced = !!opts.reducedMotion;
  const now = opts.now ?? 0;
  const spb = 60 / (opts.bpm || 120);
  const dpr = opts.dpr ?? kit.pixelRatio(ctx);
  _lopts.letterbox = state.letterbox ?? 0;
  _lopts.fontScale = opts.fontScale ?? 1;
  _lopts.safe = opts.safe ?? 0;
  const L = overlayLayout(w, h, _lopts, _L);
  const prevA = ctx.globalAlpha;

  // 1. Picture-level effects under everything else.
  if (!reduced && opts.glitch > 0) drawGlitch(ctx, opts.source ?? ctx.canvas, w, h, opts.glitch, now);
  const tr = state.transition;
  if (tr && tr.kind === "fade") {
    ctx.globalAlpha = smooth(tr.progress);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = prevA;
  }

  // 2. Letterbox.
  if (L.barH > 0.5) {
    const bh = Math.round(L.barH);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, bh);
    ctx.fillRect(0, h - bh, w, bh);
  }

  // 3. Text layers.
  const caps = state.captions;
  let capY = L.caption.y;
  for (let i = 0; caps && i < caps.length; i++) {
    const c = caps[i];
    const ct = now - c.at * spb;
    const cl = c.len * spb;
    if (c.kind === "title") drawTitleCaption(ctx, c, ct, cl, profile, reduced, dpr, L, opts.logo, w);
    else if (c.kind === "card") drawCard(ctx, c, ct, cl, profile, reduced, dpr, L, w);
    else {
      const e = entryFor(c, "cap", profile, Math.round(L.caption.size), dpr, w);
      if (e.stale) {
        bakeCaption(e, c.text, profile, e.size, L.caption.maxW);
        e.stale = false;
      }
      const a = smooth(Math.min(ct / SLIDE_MS, (cl - ct) / SLIDE_MS));
      if (a <= 0) continue;
      ctx.globalAlpha = prevA * a;
      blit(ctx, e, L.caption.x - (reduced ? 0 : SLIDE_PX * (1 - a)), capY - e.ay);
      capY -= e.h * 1.25;
    }
  }
  const n = state.narration;
  if (n) {
    const e = entryFor(n, "nar", profile, Math.round(L.narration.size), dpr, w);
    if (e.stale) {
      bakeNarration(e, n.text, profile, e.size, L.narration.maxW);
      e.stale = false;
    }
    const nt = now - n.at * spb;
    const a = smooth(Math.min(nt / 0.15, (n.len * spb - nt) / 0.15));
    if (a > 0) {
      ctx.globalAlpha = prevA * a;
      blit(ctx, e, L.narration.x - e.w / 2, L.narration.y - e.ay);
    }
  }
  ctx.globalAlpha = prevA;

  // 4. White flash over everything (logo slams emerge from it).
  if (!reduced && opts.flash > 0) {
    ctx.globalAlpha = prevA * Math.min(1, opts.flash);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = prevA;
  }
}

function drawTitleCaption(ctx, c, ct, cl, profile, reduced, dpr, L, logo, w) {
  const out = smooth((cl - ct) / 0.3);
  if (out <= 0 || ct < 0) return;
  // The slam lands at full opacity; reduced motion eases it in instead.
  const a = reduced ? smooth(ct / 0.3) * out : out;
  const punch = reduced ? 1 : 1 + 0.08 * (1 - smooth(ct / PUNCH_S));
  const prevA = ctx.globalAlpha;
  ctx.globalAlpha = prevA * a;
  if (c.logo && logo && (logo.naturalWidth || logo.width)) {
    const s = logoSprite(logo, w * 0.6, dpr);
    const dw = Math.round(s.w * punch);
    const dh = Math.round(s.h * punch);
    ctx.drawImage(s.canvas, Math.round(L.title.x - dw / 2), Math.round(L.title.y - dh / 2), dw, dh);
    if (c.sub) {
      const e = entryFor(c, "logosub", profile, Math.round(L.caption.size * 0.8), dpr, w);
      if (e.stale) {
        bakeSub(e, c.sub, profile, e.size);
        e.stale = false;
      }
      blit(ctx, e, L.title.x - e.w / 2, L.title.y + s.h / 2 + e.size * 0.4);
    }
  } else {
    const e = entryFor(c, "title", profile, Math.round(L.title.size), dpr, w);
    if (e.stale) {
      bakeTitle(e, c.text, c.sub, profile, e.size, w * 0.8);
      e.stale = false;
    }
    if (punch === 1) blit(ctx, e, L.title.x - e.ax, L.title.y - e.ay);
    else {
      const p = e.pad;
      const dw = Math.round((e.w + p * 2) * punch);
      const dh = Math.round((e.h + p * 2) * punch);
      ctx.drawImage(e.canvas, Math.round(L.title.x - (e.ax + p) * punch), Math.round(L.title.y - (e.ay + p) * punch), dw, dh);
    }
  }
  ctx.globalAlpha = prevA;
}

function drawCard(ctx, c, ct, cl, profile, reduced, dpr, L, w) {
  if (ct < 0) return;
  const e = entryFor(c, "card", profile, Math.round(L.card.h), dpr, w);
  if (e.stale) {
    bakeCard(e, c, profile, L);
    e.stale = false;
  }
  const inK = smooth(ct / CARD_OPEN_S);
  const a = Math.min(inK, smooth((cl - ct) / 0.25));
  if (a <= 0) return;
  const prevA = ctx.globalAlpha;
  ctx.globalAlpha = prevA * a;
  const x = Math.round(L.card.x);
  const y = Math.round(L.card.y);
  if (reduced || inK >= 1) blit(ctx, e, x, y);
  else {
    // Opens like a shutter from its centre line (no scaling of the type).
    const p = e.pad;
    const fullH = e.h + p * 2;
    const vis = Math.max(1, Math.round(fullH * inK));
    const top = Math.round((fullH - vis) / 2);
    const k = e.canvas.height / fullH;
    ctx.drawImage(e.canvas, 0, top * k, e.canvas.width, vis * k, x - p, y - p + top, e.w + p * 2, vis);
  }
  ctx.globalAlpha = prevA;
}

// ─── Hold-to-skip hint ─────────────────────────────────────────────────────

const _skip = { canvas: null, text: "", profile: "", dpr: 0, w: 0, h: 0, pad: 0 };

/**
 * "Hold <glyph> to skip" chip, bottom-right (inside the bar when letterboxed),
 * with a ring that fills as the hold progresses (0..1).
 */
export function drawSkipHint(ctx, w, h, text, progress, opts = {}) {
  const profile = opts.profile === "legacy" || opts.profile === "realistic" ? opts.profile : "modern";
  const dpr = opts.dpr ?? kit.pixelRatio(ctx);
  const size = Math.round(clamp(h * 0.016, 12, 18));
  const ring = Math.round(size * 0.75);
  if (!_skip.canvas || _skip.text !== text || _skip.profile !== profile || _skip.dpr !== dpr || _skip.size !== size) {
    _skip.text = text;
    _skip.profile = profile;
    _skip.dpr = dpr;
    _skip.size = size;
    const fam = profile === "legacy" ? LEGACY_MONO : profile === "realistic" ? REAL_FAMILY : FONT.display;
    const f = font(fam, profile === "realistic" ? 500 : 700, size);
    const sp = size * (profile === "realistic" ? 0.16 : 0.08);
    const label = String(text).toUpperCase();
    const tw = Math.ceil(textWidth(f, label, sp));
    const padX = Math.round(size * 0.8);
    const bw = tw + padX * 3 + ring * 2;
    const bh = Math.round(size * 2.2);
    bake(_skip, bw, bh, 4, dpr, (g) => {
      if (profile === "modern") {
        kit.drawPanel(g, 0, 0, bw, bh, { variant: "glass", accent: COLOR.cyan, chamfer: 7 });
      } else {
        g.fillStyle = "rgba(0,0,0,0.55)";
        g.fillRect(0, 0, bw, bh);
        g.fillStyle = profile === "legacy" ? `rgba(${NEON.cyanRGB},0.7)` : "rgba(226,232,230,0.35)";
        g.fillRect(0, 0, bw, 1);
      }
      g.font = f;
      if ("letterSpacing" in g) g.letterSpacing = `${sp}px`;
      g.textBaseline = "middle";
      g.fillStyle = profile === "legacy" ? NEON.core : profile === "realistic" ? REAL.text : COLOR.text;
      g.fillText(label, padX, bh / 2 + size * 0.05);
      // Ring track.
      g.strokeStyle = "rgba(255,255,255,0.18)";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(bw - padX - ring, bh / 2, ring, 0, Math.PI * 2);
      g.stroke();
    });
  }
  const margin = Math.round(Math.max(20, h * 0.03)) + (opts.safe ?? 0);
  const x = Math.round(w - margin - _skip.w);
  const y = Math.round(h - margin - _skip.h);
  const prevA = ctx.globalAlpha;
  ctx.globalAlpha = prevA * (opts.alpha ?? 1);
  blit(ctx, _skip, x, y);
  const p = clamp(progress, 0, 1);
  if (p > 0) {
    const padX = Math.round(size * 0.8);
    ctx.strokeStyle = profile === "legacy" ? NEON.cyan : profile === "realistic" ? REAL.accent : COLOR.cyan;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(x + _skip.w - padX - ring, y + _skip.h / 2, ring, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
    ctx.stroke();
    ctx.lineCap = "butt";
  }
  ctx.globalAlpha = prevA;
}
