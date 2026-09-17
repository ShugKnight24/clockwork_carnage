/**
 * Modern-mode canvas UI kit — graphic-novel realism for HUD and menus.
 *
 * Machined steel panels with an ink outline and chamfered corners, cyan energy
 * accents, crimson for danger, off-white comic caption plates. Everything
 * static (panel bodies, bar tracks, gloss, titles, captions, keycaps) is drawn
 * once into an offscreen canvas per size and blitted afterwards, because the
 * HUD runs every frame and gradients/shadows are the expensive part of Canvas2D.
 * Only the moving parts (bar fill width, numbers) are drawn per frame.
 *
 * Sprites are rasterised at the context's device pixel ratio (read from its
 * transform) so they stay crisp on the DPR-scaled HUD canvas.
 */

export const UI = {
  ink: "#04060b",
  void: "#05060c",
  navy: "#0b1422",
  steel: "#2a3a4a",
  steelHi: "#6f8aa3",
  text: "#e4edf5",
  textDim: "#8fa4b8",
  textFaint: "#5d7185",
  cyan: "#22e6ff",
  energy: "#00ffcc",
  crimson: "#ff2a4a",
  danger: "#ff3344",
  amber: "#ffae3a",
  gold: "#ffd24a",
  violet: "#9b5cff",
  green: "#3dff8a",
  cream: "#f3e9cf",
  captionInk: "#1a1208",
};

// System font stacks only (no web fonts ship with the game): a condensed
// display face for labels/numbers and a tabular mono for timers.
export const FONT_DISPLAY =
  'Bahnschrift, "Avenir Next Condensed", "DIN Condensed", "Roboto Condensed", "Arial Narrow", "Helvetica Neue", sans-serif';
export const FONT_MONO =
  '"SF Mono", "Cascadia Mono", "Roboto Mono", Menlo, Consolas, monospace';

const _fontCache = new Map();
/** Cached font string, e.g. uiFont(14) → `700 14px Bahnschrift, …`. */
export function uiFont(px, weight = 700, mono = false) {
  const size = Math.max(6, Math.round(px));
  const key = (mono ? 100000 : 0) + weight * 1000 + size;
  let f = _fontCache.get(key);
  if (!f) {
    f = `${weight} ${size}px ${mono ? FONT_MONO : FONT_DISPLAY}`;
    _fontCache.set(key, f);
  }
  return f;
}

// ─── Sprite cache ───────────────────────────────────────────────────────────

const _sprites = new Map();
const MAX_SPRITES = 220;

/** Device pixel ratio baked into a context's transform (HUD canvas uses dpr). */
export function pixelRatio(ctx) {
  const m = ctx.getTransform();
  // Snap to quarter steps so tiny float drift doesn't split cache keys.
  return Math.max(1, Math.round(Math.hypot(m.a, m.b) * 4) / 4);
}

/**
 * Offscreen canvas of `w`×`h` CSS px (+ `pad` on every side), drawn once by
 * `paint(g, w, h)` with the origin at the inner top-left.
 */
function sprite(key, w, h, pad, dpr, paint) {
  const k = `${key}|${w}|${h}|${dpr}`;
  let c = _sprites.get(k);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil((w + pad * 2) * dpr));
  c.height = Math.max(1, Math.ceil((h + pad * 2) * dpr));
  const g = c.getContext("2d");
  g.scale(dpr, dpr);
  g.translate(pad, pad);
  paint(g, w, h);
  if (_sprites.size >= MAX_SPRITES) _sprites.delete(_sprites.keys().next().value);
  _sprites.set(k, c);
  return c;
}

function blit(ctx, c, x, y, w, h, pad) {
  ctx.drawImage(c, x - pad, y - pad, w + pad * 2, h + pad * 2);
}

/**
 * Public access to the sprite cache for layout-specific static art (gauge
 * bezels, tapes). `paint(g, w, h)` runs once per key/size/DPR; draw the result
 * with blitSprite at the same w/h/pad.
 */
export function cachedSprite(ctx, key, w, h, pad, paint) {
  return sprite(key, Math.round(w), Math.round(h), pad, pixelRatio(ctx), paint);
}

export function blitSprite(ctx, c, x, y, w, h, pad = 0) {
  blit(ctx, c, Math.round(x), Math.round(y), Math.round(w), Math.round(h), pad);
}

/** Chamfered rectangle: top-left and bottom-right corners cut at 45°. */
export function chamferPath(g, x, y, w, h, c) {
  const k = Math.max(0, Math.min(c, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + k, y);
  g.lineTo(x + w, y);
  g.lineTo(x + w, y + h - k);
  g.lineTo(x + w - k, y + h);
  g.lineTo(x, y + h);
  g.lineTo(x, y + k);
  g.closePath();
}

// ─── Panels ─────────────────────────────────────────────────────────────────

const PANEL_FILLS = {
  // [top, mid, bottom] steel tones; alpha lets the scene read through on HUD.
  hud: ["rgba(44,60,77,0.86)", "rgba(22,32,43,0.84)", "rgba(10,16,24,0.86)"],
  menu: ["rgba(40,55,71,0.97)", "rgba(20,29,39,0.97)", "rgba(9,14,21,0.97)"],
  raised: ["rgba(66,88,111,0.97)", "rgba(31,44,58,0.97)", "rgba(15,23,32,0.97)"],
  well: ["rgba(4,7,11,0.92)", "rgba(9,14,20,0.9)", "rgba(20,29,39,0.9)"],
  glass: ["rgba(8,14,22,0.72)", "rgba(6,10,16,0.7)", "rgba(10,16,24,0.74)"],
};

function paintPanel(g, w, h, variant, accent, chamfer, brackets, bar, glow) {
  const fills = PANEL_FILLS[variant] || PANEL_FILLS.hud;
  const inset = 1.5;

  if (glow && accent) {
    g.save();
    g.shadowColor = accent;
    g.shadowBlur = 12;
    g.fillStyle = UI.ink;
    chamferPath(g, 0, 0, w, h, chamfer);
    g.fill();
    g.restore();
  }

  // Ink silhouette first; the steel body is inset so the outline is crisp.
  g.fillStyle = UI.ink;
  chamferPath(g, 0, 0, w, h, chamfer);
  g.fill();

  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, fills[0]);
  grad.addColorStop(0.45, fills[1]);
  grad.addColorStop(1, fills[2]);
  g.save();
  chamferPath(g, inset, inset, w - inset * 2, h - inset * 2, chamfer - 0.6);
  g.clip();
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);

  // Brushed-metal grain: faint horizontal strokes.
  if (variant !== "glass") {
    g.fillStyle = variant === "well" ? "rgba(255,255,255,0.012)" : "rgba(255,255,255,0.022)";
    for (let yy = inset + 2; yy < h; yy += 3) g.fillRect(0, yy, w, 1);
  }

  if (variant !== "well") {
    // Key light from upper-left: soft sheen on the upper third.
    const sheen = g.createLinearGradient(0, 0, w * 0.35, h * 0.9);
    sheen.addColorStop(0, "rgba(190,215,235,0.10)");
    sheen.addColorStop(0.5, "rgba(190,215,235,0.02)");
    sheen.addColorStop(1, "rgba(190,215,235,0)");
    g.fillStyle = sheen;
    g.fillRect(0, 0, w, h);
    // Specular top bevel + darker bottom lip.
    g.fillStyle = "rgba(185,210,232,0.34)";
    g.fillRect(chamfer, inset, w, 1);
    g.fillStyle = "rgba(185,210,232,0.12)";
    g.fillRect(inset, chamfer, 1, h);
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.fillRect(0, h - inset - 1, w, 1);
  } else {
    // Recessed: shadow falls on the top inner edge.
    g.fillStyle = "rgba(0,0,0,0.55)";
    g.fillRect(0, inset, w, 2);
    g.fillStyle = "rgba(111,138,163,0.18)";
    g.fillRect(0, h - inset - 1, w, 1);
  }

  if (bar && accent) {
    g.fillStyle = accent;
    g.fillRect(inset, inset, 3, h);
  }
  g.restore();

  // Machined inner hairline.
  g.strokeStyle = variant === "well" ? "rgba(111,138,163,0.14)" : "rgba(130,160,188,0.2)";
  g.lineWidth = 1;
  chamferPath(g, inset + 2.5, inset + 2.5, w - (inset + 2.5) * 2, h - (inset + 2.5) * 2, chamfer - 1.5);
  g.stroke();

  if (brackets && accent) {
    const len = Math.max(4, Math.min(12, w * 0.18, h * 0.4));
    g.strokeStyle = accent;
    g.lineWidth = 1.5;
    g.lineCap = "square";
    g.beginPath();
    // Top-right and bottom-left corners (the square ones).
    g.moveTo(w - len - 1, 1.25);
    g.lineTo(w - 1.25, 1.25);
    g.lineTo(w - 1.25, len + 1);
    g.moveTo(1.25, h - len - 1);
    g.lineTo(1.25, h - 1.25);
    g.lineTo(len + 1, h - 1.25);
    g.stroke();
    // Tick on the top-left chamfer.
    if (chamfer >= 5) {
      g.globalAlpha = 0.7;
      g.beginPath();
      g.moveTo(1.5, chamfer + 0.5);
      g.lineTo(chamfer + 0.5, 1.5);
      g.stroke();
      g.globalAlpha = 1;
    }
  }
}

/**
 * Steel panel. opts: variant "hud"|"menu"|"raised"|"well"|"glass",
 * accent (bracket/bar colour), chamfer px, brackets, bar (left accent strip),
 * glow (soft accent halo — use for focus states only).
 */
export function drawPanel(ctx, x, y, w, h, opts = {}) {
  const pw = Math.max(4, Math.round(w));
  const ph = Math.max(4, Math.round(h));
  const variant = opts.variant || "hud";
  const accent = opts.accent || null;
  const chamfer = opts.chamfer ?? Math.min(10, Math.round(Math.min(pw, ph) * 0.22));
  const brackets = opts.brackets !== false && !!accent;
  const bar = !!opts.bar;
  const glow = !!opts.glow;
  const pad = glow ? 14 : 1;
  const key = `panel:${variant}:${accent}:${chamfer}:${brackets ? 1 : 0}${bar ? 1 : 0}${glow ? 1 : 0}`;
  const dpr = pixelRatio(ctx);
  const c = sprite(key, pw, ph, pad, dpr, (g, sw, sh) =>
    paintPanel(g, sw, sh, variant, accent, chamfer, brackets, bar, glow));
  blit(ctx, c, Math.round(x), Math.round(y), pw, ph, pad);
}

/** L-shaped corner brackets drawn live (cheap strokes) — for pulsing frames. */
export function drawBrackets(ctx, x, y, w, h, color, len = 10, lw = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
  ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len);
  ctx.moveTo(x + w, y + h - len); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - len, y + h);
  ctx.moveTo(x + len, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - len);
  ctx.stroke();
}

// ─── Bars ───────────────────────────────────────────────────────────────────

function paintTrack(g, w, h) {
  g.fillStyle = UI.ink;
  g.fillRect(-1.5, -1.5, w + 3, h + 3);
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "rgba(2,4,8,0.95)");
  grad.addColorStop(1, "rgba(24,33,44,0.95)");
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(0,0,0,0.6)";
  g.fillRect(0, 0, w, 1);
}

function paintBarOverlay(g, w, h, segments) {
  // Glass-tube gloss: bright upper band, darker lower band.
  const gloss = g.createLinearGradient(0, 0, 0, h);
  gloss.addColorStop(0, "rgba(255,255,255,0.34)");
  gloss.addColorStop(0.38, "rgba(255,255,255,0.08)");
  gloss.addColorStop(0.55, "rgba(0,0,0,0)");
  gloss.addColorStop(1, "rgba(0,0,0,0.28)");
  g.fillStyle = gloss;
  g.fillRect(0, 0, w, h);
  if (segments > 1) {
    g.fillStyle = UI.ink;
    const gap = h >= 8 ? 2 : 1.25;
    for (let i = 1; i < segments; i++) {
      g.fillRect(Math.round((w * i) / segments - gap / 2), 0, gap, h);
    }
  }
}

function paintBarGlow(g, w, h, color) {
  g.shadowColor = color;
  g.shadowBlur = Math.max(6, h * 1.2);
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
}

/**
 * Segmented energy bar with inked groove, gloss and a bright leading edge.
 * opts: segments, glow (0..1 alpha of the bloom), ghost (0..1 trailing
 * "recent damage" fill), edge (leading highlight, default true).
 */
export function drawBar(ctx, x, y, w, h, pct, color, opts = {}) {
  const bw = Math.max(4, Math.round(w));
  const bh = Math.max(2, Math.round(h));
  const bx = Math.round(x);
  const by = Math.round(y);
  const p = pct > 0 ? (pct < 1 ? pct : 1) : 0;
  const segments = opts.segments || 0;
  const dpr = pixelRatio(ctx);

  blit(ctx, sprite("bar-track", bw, bh, 2, dpr, paintTrack), bx, by, bw, bh, 2);

  const ghost = opts.ghost || 0;
  if (ghost > p) {
    ctx.fillStyle = "rgba(255,214,190,0.7)";
    ctx.fillRect(bx + bw * p, by, bw * (ghost - p), bh);
  }

  const fw = bw * p;
  if (fw > 0.5) {
    const glow = opts.glow || 0;
    if (glow > 0) {
      const gp = 10;
      const gc = sprite(`bar-glow:${color}`, bw, bh, gp, dpr, (g, sw, sh) => paintBarGlow(g, sw, sh, color));
      const prevA = ctx.globalAlpha;
      ctx.globalAlpha = prevA * glow;
      const sw = Math.min(bw + gp * 2, fw + gp * 2);
      ctx.drawImage(gc, 0, 0, sw * dpr, gc.height, bx - gp, by - gp, sw, bh + gp * 2);
      ctx.globalAlpha = prevA;
    }
    ctx.fillStyle = color;
    ctx.fillRect(bx, by, fw, bh);
    if (opts.edge !== false && p < 1 && fw > 2) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(bx + fw - 1.5, by, 1.5, bh);
    }
  }

  blit(ctx, sprite(`bar-over:${segments}`, bw, bh, 0, dpr, (g, sw, sh) => paintBarOverlay(g, sw, sh, segments)), bx, by, bw, bh, 0);
}

// ─── Text plates ────────────────────────────────────────────────────────────

const CAPTION_SCHEMES = {
  cream: { top: "#f7eed6", bottom: "#ddcca2", text: UI.captionInk },
  crimson: { top: "#ff5068", bottom: "#b3142c", text: "#fff4f4" },
  cyan: { top: "#7df2ff", bottom: "#12a9c6", text: "#021219" },
  amber: { top: "#ffd48a", bottom: "#d58414", text: "#1d1004" },
  steel: { top: "#3b4f63", bottom: "#18222e", text: UI.text },
  violet: { top: "#c09bff", bottom: "#6a38c9", text: "#fbf7ff" },
};

function measureWith(font, text, spacing) {
  const m = _measureCtx();
  m.font = font;
  if ("letterSpacing" in m) m.letterSpacing = `${spacing}px`;
  const tw = m.measureText(text).width;
  if ("letterSpacing" in m) m.letterSpacing = "0px";
  return tw;
}

let _mctx = null;
function _measureCtx() {
  if (!_mctx) _mctx = document.createElement("canvas").getContext("2d");
  return _mctx;
}

/**
 * Comic caption plate: off-white (or scheme-coloured) card, ink outline, hard
 * ink drop shadow, uppercase condensed text. Returns {w, h}.
 * opts: size (font px), scheme, align "left"|"center"|"right", padX.
 */
export function drawCaption(ctx, x, y, text, opts = {}) {
  const size = Math.round(opts.size || 12);
  const scheme = opts.scheme || "cream";
  const s = CAPTION_SCHEMES[scheme] || CAPTION_SCHEMES.cream;
  const spacing = Math.max(0.5, size * 0.08);
  const font = uiFont(size, 700);
  const label = String(text).toUpperCase();
  const padX = opts.padX ?? Math.round(size * 0.7);
  const tw = Math.ceil(measureWith(font, label, spacing));
  const w = tw + padX * 2;
  const h = Math.round(size * 1.65);
  const dpr = pixelRatio(ctx);
  const c = sprite(`cap:${scheme}:${size}:${label}`, w, h, 3, dpr, (g, sw, sh) => {
    g.fillStyle = "rgba(4,6,11,0.85)";
    g.fillRect(2, 2, sw, sh);
    g.fillStyle = UI.ink;
    g.fillRect(-1, -1, sw + 2, sh + 2);
    const grad = g.createLinearGradient(0, 0, 0, sh);
    grad.addColorStop(0, s.top);
    grad.addColorStop(1, s.bottom);
    g.fillStyle = grad;
    g.fillRect(0.5, 0.5, sw - 1, sh - 1);
    g.fillStyle = "rgba(255,255,255,0.35)";
    g.fillRect(0.5, 0.5, sw - 1, 1);
    g.font = font;
    if ("letterSpacing" in g) g.letterSpacing = `${spacing}px`;
    g.fillStyle = s.text;
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.fillText(label, padX + spacing / 2, sh / 2 + size * 0.06);
  });
  const align = opts.align || "left";
  const bx = Math.round(align === "center" ? x - w / 2 : align === "right" ? x - w : x);
  blit(ctx, c, bx, Math.round(y), w, h, 3);
  return { w, h, x: bx };
}

/** Width a caption plate would take, without drawing. */
export function captionWidth(text, size = 12) {
  const spacing = Math.max(0.5, size * 0.08);
  return Math.ceil(measureWith(uiFont(size, 700), String(text).toUpperCase(), spacing)) + Math.round(size * 0.7) * 2;
}

/**
 * Big inked title: chrome-steel fill, heavy ink outline, offset ink shadow and
 * an accent underline. Cached per text/size/accent.
 */
export function drawTitle(ctx, text, cx, baselineY, size, accent = UI.cyan, opts = {}) {
  const px = Math.round(size);
  const label = String(text).toUpperCase();
  const spacing = Math.round(px * 0.06);
  const font = uiFont(px, 800);
  const tw = Math.ceil(measureWith(font, label, spacing));
  const ink = Math.max(3, Math.round(px * 0.13));
  const w = tw + ink * 2 + 8;
  const h = Math.round(px * 1.45);
  const pad = 12;
  const fillTop = opts.fillTop || "#ffffff";
  const fillBottom = opts.fillBottom || "#9fb4c7";
  const dpr = pixelRatio(ctx);
  const c = sprite(`title:${label}:${px}:${accent}:${fillTop}:${fillBottom}`, w, h, pad, dpr, (g, sw, sh) => {
    g.font = font;
    if ("letterSpacing" in g) g.letterSpacing = `${spacing}px`;
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    g.lineJoin = "round";
    const bx = sw / 2 + spacing / 2;
    const by = Math.round(px * 1.02);
    // Accent bloom behind the letters.
    g.save();
    g.shadowColor = accent;
    g.shadowBlur = px * 0.5;
    g.globalAlpha = 0.55;
    g.fillStyle = accent;
    g.fillText(label, bx, by);
    g.restore();
    // Offset ink shadow, then outline, then chrome fill.
    g.lineWidth = ink * 2;
    g.strokeStyle = UI.ink;
    g.strokeText(label, bx + px * 0.05, by + px * 0.06);
    g.strokeText(label, bx, by);
    const grad = g.createLinearGradient(0, by - px * 0.8, 0, by);
    grad.addColorStop(0, fillTop);
    grad.addColorStop(0.55, fillTop);
    grad.addColorStop(0.56, fillBottom);
    grad.addColorStop(1, fillBottom);
    g.fillStyle = grad;
    g.fillText(label, bx, by);
    // Accent underline rule.
    const ruleY = by + Math.round(px * 0.2);
    g.fillStyle = UI.ink;
    g.fillRect(sw / 2 - tw * 0.32 - 2, ruleY - 2, tw * 0.64 + 4, 6);
    g.fillStyle = accent;
    g.fillRect(sw / 2 - tw * 0.32, ruleY, tw * 0.64, 2);
  });
  const baseOff = Math.round(px * 1.02);
  blit(ctx, c, Math.round(cx - w / 2), Math.round(baselineY - baseOff), w, h, pad);
  return { w: tw, h };
}

/** Steel keycap chip with a legend. Returns its width. */
export function drawKeycap(ctx, x, y, text, opts = {}) {
  const size = Math.round(opts.size || 11);
  const label = String(text);
  const font = uiFont(size, 700);
  const tw = Math.ceil(measureWith(font, label, 0.5));
  const w = Math.max(Math.round(size * 1.9), tw + Math.round(size * 1.1));
  const h = Math.round(size * 1.9);
  const accent = opts.accent || null;
  const dpr = pixelRatio(ctx);
  const c = sprite(`key:${size}:${label}:${accent}`, w, h, 2, dpr, (g, sw, sh) => {
    g.fillStyle = UI.ink;
    g.beginPath();
    g.roundRect(-1, -1, sw + 2, sh + 2, 4);
    g.fill();
    const grad = g.createLinearGradient(0, 0, 0, sh);
    grad.addColorStop(0, "#56708a");
    grad.addColorStop(0.12, "#34475b");
    grad.addColorStop(0.8, "#1c2835");
    grad.addColorStop(1, "#0d141c");
    g.fillStyle = grad;
    g.beginPath();
    g.roundRect(0.5, 0.5, sw - 1, sh - 1, 3);
    g.fill();
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.fillRect(2, sh - 4, sw - 4, 2);
    g.font = font;
    if ("letterSpacing" in g) g.letterSpacing = "0.5px";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = accent || UI.text;
    g.fillText(label, sw / 2 + 0.25, sh / 2 - 1);
  });
  const align = opts.align || "left";
  const bx = Math.round(align === "right" ? x - w : align === "center" ? x - w / 2 : x);
  blit(ctx, c, bx, Math.round(y), w, h, 2);
  return w;
}

/** Section header: accent tab, condensed label, hairline rule to width. */
export function drawSectionHeader(ctx, x, y, w, text, accent = UI.cyan, size = 12) {
  const label = String(text).toUpperCase();
  const font = uiFont(size, 700);
  const dpr = pixelRatio(ctx);
  const h = Math.round(size * 1.6);
  const c = sprite(`sect:${label}:${size}:${accent}`, Math.round(w), h, 1, dpr, (g, sw, sh) => {
    g.fillStyle = UI.ink;
    g.fillRect(0, 1, 7, sh - 2);
    g.fillStyle = accent;
    g.fillRect(1, 2, 5, sh - 4);
    g.font = font;
    if ("letterSpacing" in g) g.letterSpacing = `${Math.round(size * 0.12)}px`;
    g.textBaseline = "middle";
    g.fillStyle = UI.text;
    g.fillText(label, 13, sh / 2 + 0.5);
    const tw = g.measureText(label).width + 22;
    if (sw > tw + 8) {
      g.fillStyle = "rgba(130,160,188,0.28)";
      g.fillRect(tw, Math.round(sh / 2), sw - tw, 1);
      g.fillStyle = accent;
      g.fillRect(sw - 10, Math.round(sh / 2) - 1, 10, 3);
    }
  });
  blit(ctx, c, Math.round(x), Math.round(y), Math.round(w), h, 1);
  return h;
}

/**
 * Button with idle/focus/pressed states over a steel panel. `accent` tints
 * brackets, label and the focus halo.
 */
export function drawButton(ctx, x, y, w, h, label, state = "idle", accent = UI.cyan, opts = {}) {
  const focus = state === "focus" || state === "pressed";
  const pressed = state === "pressed";
  const oy = pressed ? 1 : 0;
  drawPanel(ctx, x, y + oy, w, h, {
    variant: pressed ? "well" : focus ? "raised" : "menu",
    accent: focus ? accent : opts.idleAccent || null,
    glow: focus && !pressed,
    bar: focus,
    chamfer: Math.min(9, Math.round(h * 0.28)),
  });
  const size = opts.size || Math.round(Math.min(16, h * 0.42));
  ctx.font = uiFont(size, 700);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = focus ? "#ffffff" : opts.idleColor || UI.textDim;
  ctx.fillText(String(label).toUpperCase(), x + w / 2, y + h / 2 + oy + 1);
  if (focus) {
    ctx.fillStyle = accent;
    ctx.fillRect(Math.round(x + w / 2 - w * 0.2), Math.round(y + h - 4 + oy), Math.round(w * 0.4), 2);
  }
  ctx.textBaseline = "alphabetic";
}

// ─── Backdrops ──────────────────────────────────────────────────────────────

const BACKDROP_TINTS = {
  steel: ["rgba(8,14,22,0.9)", "rgba(2,3,7,0.97)", "rgba(34,230,255,0.06)"],
  crimson: ["rgba(34,4,10,0.92)", "rgba(6,1,3,0.97)", "rgba(255,42,74,0.10)"],
  gold: ["rgba(10,16,26,0.92)", "rgba(2,3,7,0.97)", "rgba(255,214,120,0.05)"],
  cyan: ["rgba(4,16,24,0.92)", "rgba(1,4,8,0.97)", "rgba(0,255,204,0.08)"],
};

/**
 * Full-screen menu scrim: radial steel-dark vignette with a faint key-light
 * pool, comic halftone dots in the corners, and a thin ink letterbox. Cached
 * per size — resolution-independent content, so it is drawn at 1x.
 */
export function drawBackdrop(ctx, w, h, tint = "steel", alpha = 1) {
  const t = BACKDROP_TINTS[tint] || BACKDROP_TINTS.steel;
  const bw = Math.max(1, Math.round(w));
  const bh = Math.max(1, Math.round(h));
  const c = sprite(`bg:${tint}`, bw, bh, 0, 1, (g, sw, sh) => {
    const r = Math.hypot(sw, sh) * 0.62;
    const grad = g.createRadialGradient(sw * 0.42, sh * 0.32, 0, sw / 2, sh / 2, r);
    grad.addColorStop(0, t[0]);
    grad.addColorStop(1, t[1]);
    g.fillStyle = grad;
    g.fillRect(0, 0, sw, sh);
    // Accent pool behind the content column.
    const pool = g.createRadialGradient(sw / 2, sh * 0.3, 0, sw / 2, sh * 0.3, sh * 0.7);
    pool.addColorStop(0, t[2]);
    pool.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = pool;
    g.fillRect(0, 0, sw, sh);
    // Halftone dots fading in toward the lower corners.
    const step = 7;
    for (let yy = sh * 0.55; yy < sh; yy += step) {
      for (let xx = 0; xx < sw; xx += step) {
        const edge = Math.min(xx, sw - xx) / (sw * 0.3);
        const k = ((yy - sh * 0.55) / (sh * 0.45)) * Math.max(0, 1 - edge);
        if (k < 0.08) continue;
        g.fillStyle = `rgba(150,180,205,${(0.07 * k).toFixed(3)})`;
        g.beginPath();
        g.arc(xx + ((yy / step) % 2) * 3.5, yy, 1.6 * k, 0, Math.PI * 2);
        g.fill();
      }
    }
    // Ink letterbox rules.
    g.fillStyle = "rgba(4,6,11,0.9)";
    g.fillRect(0, 0, sw, 3);
    g.fillRect(0, sh - 3, sw, 3);
  });
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha;
  ctx.drawImage(c, 0, 0, w, h);
  ctx.globalAlpha = prev;
}

/** Plain text with an ink outline (for text floating over the 3D scene). */
export function inkText(ctx, text, x, y, fill, inkWidth = 3) {
  ctx.lineJoin = "round";
  ctx.lineWidth = inkWidth;
  ctx.strokeStyle = UI.ink;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/** Drop every cached sprite (e.g. after a DPR change). */
export function clearUiKitCache() {
  _sprites.clear();
}
