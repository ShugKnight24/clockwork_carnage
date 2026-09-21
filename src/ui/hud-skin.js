/**
 * HUD skin: one theme object plus drop-in versions of the UI-kit primitives
 * the Modern HUD layouts draw with (panel, caption, bar, brackets, title,
 * inked text, font).
 *
 * Modern keeps the graphic-novel kit untouched: every primitive forwards to
 * modern-ui-kit.js with the same arguments and `HT` holds exactly the colours
 * the layouts used to hardcode, so Modern output is pixel-identical.
 *
 * Realistic swaps in a helmet-HUD look: thin 1px strokes and no ink outlines,
 * off-white text with one desaturated accent, amber for warnings, red only
 * for critical, soft translucent backing plates that fade out at their edges,
 * light tabular numerals and small tracked labels. The HUD is drawn every
 * frame, so plates, captions and titles are rasterised once per size into the
 * kit's sprite cache (distinct keys) and only blitted afterwards.
 *
 * `HT` is one live object: it is re-filled when the art style changes, so the
 * layouts read `HT.accent` etc. with no per-frame lookup or allocation.
 */

import { COLOR } from "./design-tokens.js";
import * as kit from "./modern-ui-kit.js";
import { isRealisticArt, onArtStyleChange } from "../rendering/art-style.js";

// ─── Themes ─────────────────────────────────────────────────────────────────

/** Modern: the values the layouts hardcoded before the skin existed. */
const MODERN = {
  ...COLOR,
  realistic: false,
  outline: true, // ink outlines, glow halos, chamfered steel
  labelTrack: 0, // extra label tracking (em)
  accent: COLOR.cyan,
  // Health / vitals.
  critText: "#ff5a6e",
  critSoft: "#ff8a96",
  critPale: "#ffd0d6",
  critRGB: "255,42,74",
  flash: "#ffffff",
  ghost: "rgba(255,214,190,0.78)",
  healRGB: "120,255,190",
  healCore: "240,255,246",
  shield: "#4f8dff",
  shieldFull: "#8cc4ff",
  shieldRGB: "160,210,255",
  shardRGB: "150,200,255",
  chrono: "#c77dff",
  chronoText: "#d9a8ff",
  chronoDim: "#5d4488",
  chronoRing: "rgba(155,92,255,0.35)",
  chronoTail: "rgba(199,125,255,0.6)",
  dash: "#7ff6ff",
  // Weapon block.
  ammo: "#ffe3a3",
  ammoLowPale: "#ffb3be",
  pip: "#ffd48a",
  pipEmpty: "rgba(111,138,163,0.18)",
  pipSpent: "#fff1c8",
  heatGlow: "#ff7a2a",
  slotOn: "rgba(34,230,255,0.22)",
  slotOff: "rgba(24,34,46,0.85)",
  track: "rgba(24,34,46,0.95)",
  // Chips, compass, clocks.
  chipLabel: "#8feeff",
  clock: "#b9d4ea",
  objectiveRGB: "0,255,204",
  bossForm2: "#ff2a5f",
  bossForm3: "#ff1f45",
};

/** Realistic: military-sim helmet HUD. */
const REALISTIC = {
  ...MODERN,
  realistic: true,
  outline: false,
  labelTrack: 0.16,
  ink: "rgba(0,0,0,0)",
  text: "#e4e6e1",
  textDim: "#98a3a4",
  textFaint: "#687375",
  accent: "#8fbcc4",
  cyan: "#8fbcc4",
  energy: "#8fbcc4",
  amber: "#dca24c",
  gold: "#dca24c",
  crimson: "#e0493f",
  danger: "#e0493f",
  green: "#d3dbd5", // healthy reads neutral; colour is reserved for trouble
  violet: "#a59cc2",
  critText: "#e0493f",
  critSoft: "#e98a80",
  critPale: "#f0c3bd",
  critRGB: "224,73,63",
  flash: "#ffffff",
  ghost: "rgba(236,228,214,0.42)",
  healRGB: "210,228,222",
  healCore: "236,242,238",
  shield: "#9db3c6",
  shieldFull: "#bccbd8",
  shieldRGB: "190,206,220",
  shardRGB: "190,206,220",
  chrono: "#b3a8d4",
  chronoText: "#c6bedf",
  chronoDim: "#6c6784",
  chronoRing: "rgba(165,156,194,0.22)",
  chronoTail: "rgba(179,168,212,0.5)",
  dash: "#c9dde0",
  ammo: "#e4e6e1",
  ammoLowPale: "#efc98e",
  pip: "rgba(228,230,225,0.78)",
  pipEmpty: "rgba(200,210,210,0.12)",
  pipSpent: "rgba(236,238,233,0.9)",
  heatGlow: "#d98a4a",
  slotOn: "rgba(143,188,196,0.2)",
  slotOff: "rgba(10,14,17,0.42)",
  track: "rgba(200,212,212,0.12)",
  chipLabel: "#98a3a4",
  clock: "#c9d0cf",
  objectiveRGB: "143,188,196",
  bossForm2: "#e0493f",
  bossForm3: "#e0493f",
};

/** Live theme for the active art style (Modern values unless Realistic). */
export const HT = {};
function syncTheme() {
  Object.assign(HT, isRealisticArt() ? REALISTIC : MODERN);
}
syncTheme();
onArtStyleChange(syncTheme);

/** Kit palette re-exported for layouts that import `UI` from here. */
export const UI = HT;

// ─── Fonts ──────────────────────────────────────────────────────────────────

// Neo-grotesk system faces whose default figures are tabular.
const REAL_FAMILY = '"Helvetica Neue", "Segoe UI", Roboto, Arial, sans-serif';
const _realFonts = new Map();

/**
 * Drop-in for the kit's uiFont. Realistic: big numerals run light, labels
 * medium, clocks share the same tabular face instead of a code mono.
 */
export function uiFont(px, weight = 700, mono = false) {
  if (!HT.realistic) return kit.uiFont(px, weight, mono);
  const size = Math.max(6, Math.round(px));
  const w = mono ? 400 : weight >= 800 ? (size >= 22 ? 300 : 500) : 500;
  const key = w * 1000 + size;
  let f = _realFonts.get(key);
  if (!f) {
    f = `${w} ${size}px ${REAL_FAMILY}`;
    _realFonts.set(key, f);
  }
  return f;
}

/** Label tracking in px for a label at `size` (Modern: `spacing` unchanged). */
export function track(size, spacing) {
  return HT.labelTrack ? Math.max(spacing, size * HT.labelTrack) : spacing;
}

let _mctx = null;
function measure(font, text, spacing) {
  if (!_mctx) _mctx = document.createElement("canvas").getContext("2d");
  _mctx.font = font;
  _mctx.letterSpacing = `${spacing}px`;
  const tw = _mctx.measureText(text).width;
  _mctx.letterSpacing = "0px";
  return tw;
}

// ─── Realistic painters (cached) ────────────────────────────────────────────

/**
 * Soft translucent backing plate: a smoked-glass body whose edges feather
 * out, a hairline catching light along the top that fades toward both ends
 * (the holographic falloff), and an optional 1px accent tick on the left.
 */
function paintPlate(g, w, h, accent, bar, strong) {
  g.save();
  g.shadowColor = "rgba(3,5,7,0.5)";
  g.shadowBlur = 7;
  const body = g.createLinearGradient(0, 0, 0, h);
  body.addColorStop(0, strong ? "rgba(12,16,19,0.6)" : "rgba(12,16,19,0.46)");
  body.addColorStop(1, strong ? "rgba(7,10,12,0.5)" : "rgba(7,10,12,0.34)");
  g.fillStyle = body;
  g.beginPath();
  g.roundRect(0, 0, w, h, 2);
  g.fill();
  g.restore();
  // Faint emissive wash from the left, falling off across the plate.
  const wash = g.createLinearGradient(0, 0, w, 0);
  wash.addColorStop(0, "rgba(170,200,205,0.06)");
  wash.addColorStop(0.6, "rgba(170,200,205,0.015)");
  wash.addColorStop(1, "rgba(170,200,205,0)");
  g.fillStyle = wash;
  g.fillRect(0, 0, w, h);
  const rule = g.createLinearGradient(0, 0, w, 0);
  rule.addColorStop(0, "rgba(226,232,230,0.04)");
  rule.addColorStop(0.3, "rgba(226,232,230,0.22)");
  rule.addColorStop(0.7, "rgba(226,232,230,0.22)");
  rule.addColorStop(1, "rgba(226,232,230,0.04)");
  g.fillStyle = rule;
  g.fillRect(1, 0, w - 2, 1);
  if (accent) {
    g.globalAlpha = bar ? 0.95 : 0.8;
    g.fillStyle = accent;
    g.fillRect(0, 3, bar ? 2 : 1, h - 6);
    g.globalAlpha = 1;
  }
}

const PLATE_PAD = 8;

function realPanel(ctx, x, y, w, h, opts) {
  const pw = Math.max(4, Math.round(w));
  const ph = Math.max(4, Math.round(h));
  const accent = opts.accent || null;
  const bar = !!opts.bar;
  const strong = opts.variant === "menu" || opts.variant === "raised";
  const c = kit.cachedSprite(ctx, `rplate:${accent}:${bar ? 1 : 0}${strong ? 1 : 0}`, pw, ph, PLATE_PAD,
    (g, sw, sh) => paintPlate(g, sw, sh, accent, bar, strong));
  kit.blitSprite(ctx, c, x, y, pw, ph, PLATE_PAD);
}

const CAPTION_TONE = {
  cream: "text",
  steel: "textDim",
  cyan: "accent",
  amber: "amber",
  crimson: "critSoft", // red text on a dark plate needs the lighter tint to read
  violet: "violet",
};

function realCaption(ctx, x, y, text, opts) {
  const size = Math.round(opts.size || 12);
  const scheme = opts.scheme || "cream";
  const color = HT[CAPTION_TONE[scheme] || "text"];
  const spacing = Math.max(1, size * HT.labelTrack);
  const font = uiFont(size, 700);
  const label = String(text).toUpperCase();
  const padX = opts.padX ?? Math.round(size * 0.8);
  const tw = Math.ceil(measure(font, label, spacing));
  const w = tw + padX * 2;
  const h = Math.round(size * 1.65);
  const c = kit.cachedSprite(ctx, `rcap:${scheme}:${size}:${padX}:${label}`, w, h, PLATE_PAD, (g, sw, sh) => {
    paintPlate(g, sw, sh, scheme === "cream" || scheme === "steel" ? null : color, false, false);
    g.font = font;
    g.letterSpacing = `${spacing}px`;
    g.fillStyle = color;
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.fillText(label, padX + spacing / 2, sh / 2 + size * 0.06);
  });
  const align = opts.align || "left";
  const bx = Math.round(align === "center" ? x - w / 2 : align === "right" ? x - w : x);
  kit.blitSprite(ctx, c, bx, y, w, h, PLATE_PAD);
  return { w, h, x: bx };
}

function paintSegments(g, w, h, segments) {
  g.fillStyle = "rgba(4,6,8,0.55)";
  for (let i = 1; i < segments; i++) g.fillRect(Math.round((w * i) / segments) - 0.5, 0, 1, h);
}

function realBar(ctx, x, y, w, h, pct, color, opts) {
  const bw = Math.max(4, Math.round(w));
  const bh = Math.max(2, Math.round(h));
  const bx = Math.round(x);
  const by = Math.round(y);
  const p = pct > 0 ? (pct < 1 ? pct : 1) : 0;
  ctx.fillStyle = HT.track;
  ctx.fillRect(bx, by, bw, bh);
  const ghost = opts.ghost || 0;
  if (ghost > p) {
    ctx.fillStyle = HT.ghost;
    ctx.fillRect(bx + bw * p, by, bw * (ghost - p), bh);
  }
  const fw = bw * p;
  if (fw > 0.5) {
    const prev = ctx.globalAlpha;
    ctx.globalAlpha = prev * 0.9;
    ctx.fillStyle = color;
    ctx.fillRect(bx, by, fw, bh);
    ctx.globalAlpha = prev;
    if (opts.edge !== false && p < 1 && fw > 2) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillRect(bx + fw - 1, by, 1, bh);
    }
  }
  const segments = opts.segments || 0;
  if (segments > 1) {
    kit.blitSprite(ctx, kit.cachedSprite(ctx, `rbar-seg:${segments}`, bw, bh, 0, (g, sw, sh) => paintSegments(g, sw, sh, segments)), bx, by, bw, bh, 0);
  }
}

function realTitle(ctx, text, cx, baselineY, size, accent, opts) {
  const px = Math.round(size);
  const label = String(text).toUpperCase();
  const spacing = Math.round(px * 0.2);
  const font = `300 ${px}px ${REAL_FAMILY}`;
  const tw = Math.ceil(measure(font, label, spacing));
  const w = tw + 16;
  const h = Math.round(px * 1.45);
  const pad = 6;
  const fill = opts.fillTop || HT.text;
  const c = kit.cachedSprite(ctx, `rtitle:${label}:${px}:${accent}:${fill}`, w, h, pad, (g, sw) => {
    g.font = font;
    g.letterSpacing = `${spacing}px`;
    g.textAlign = "center";
    const by = Math.round(px * 1.02);
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.fillText(label, sw / 2 + spacing / 2 + 1, by + 1);
    g.fillStyle = fill;
    g.fillText(label, sw / 2 + spacing / 2, by);
    // Hairline rule that fades out toward its ends.
    const ruleY = by + Math.round(px * 0.22);
    const rule = g.createLinearGradient(sw / 2 - tw * 0.35, 0, sw / 2 + tw * 0.35, 0);
    rule.addColorStop(0, "rgba(0,0,0,0)");
    rule.addColorStop(0.5, accent);
    rule.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = rule;
    g.fillRect(sw / 2 - tw * 0.35, ruleY, tw * 0.7, 1);
  });
  kit.blitSprite(ctx, c, cx - w / 2, baselineY - Math.round(px * 1.02), w, h, pad);
  return { w: tw, h };
}

// ─── Drop-in primitives ─────────────────────────────────────────────────────

export function drawPanel(ctx, x, y, w, h, opts = {}) {
  if (HT.realistic) realPanel(ctx, x, y, w, h, opts);
  else kit.drawPanel(ctx, x, y, w, h, opts);
}

export function drawCaption(ctx, x, y, text, opts = {}) {
  return HT.realistic ? realCaption(ctx, x, y, text, opts) : kit.drawCaption(ctx, x, y, text, opts);
}

export function drawBar(ctx, x, y, w, h, pct, color, opts = {}) {
  if (HT.realistic) realBar(ctx, x, y, w, h, pct, color, opts);
  else kit.drawBar(ctx, x, y, w, h, pct, color, opts);
}

export function drawBrackets(ctx, x, y, w, h, color, len = 10, lw = 2) {
  kit.drawBrackets(ctx, x, y, w, h, color, len, HT.realistic ? Math.min(lw, 1.25) : lw);
}

export function drawTitle(ctx, text, cx, baselineY, size, accent = HT.accent, opts = {}) {
  return HT.realistic
    ? realTitle(ctx, text, cx, baselineY, size, accent, opts)
    : kit.drawTitle(ctx, text, cx, baselineY, size, accent, opts);
}

/** Text over the 3D scene: ink outline in Modern, a soft 1px drop in Realistic. */
export function inkText(ctx, text, x, y, fill, inkWidth = 3) {
  if (!HT.realistic) {
    kit.inkText(ctx, text, x, y, fill, inkWidth);
    return;
  }
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

export const { pixelRatio, cachedSprite, blitSprite } = kit;
