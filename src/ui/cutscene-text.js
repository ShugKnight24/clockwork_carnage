/**
 * Cutscene text layout and lettering.
 *
 * Three looks, one per art style:
 *   legacy — the original monospace terminal text (kept as is).
 *   comic  — hand-lettering style: uppercase dialogue in balloons sized to the
 *            text with a tail toward the speaker, yellow narration captions,
 *            radio balloons for voices off panel, ink-stroked sound effects.
 *   cine   — film subtitles: clean sans, off-white with a soft shadow over a
 *            translucent band, speaker names in small tracked caps.
 *
 * Wrapping is by measured width and balanced (every line of a block about the
 * same length, so no orphan word on the last line). Layouts are cached per
 * font/width/text; callers draw from the cached rows every frame and never
 * re-measure.
 *
 * No web fonts ship with the game (CSP font-src 'self', no font files), so
 * every face is a system stack.
 */

import { FONT } from "./design-tokens.js";

export const CS_FONT = {
  // Comic lettering: rounded hand-drawn faces that read as lettering in caps.
  letter: '"Comic Neue", "Chalkboard SE", "Comic Sans MS", "Marker Felt", "Trebuchet MS", sans-serif',
  // Sound effects and splash titles: heavy condensed display.
  sfx: 'Impact, Haettenschweiler, "Arial Narrow Bold", "Arial Black", sans-serif',
  // Subtitles: neutral UI sans.
  cine: '"SF Pro Text", "Segoe UI", "Helvetica Neue", Roboto, Arial, sans-serif',
  // Small tracked caps (speaker names, slugs, prompts).
  caps: FONT.display,
  legacy: "monospace",
};

export const INK = "#0d0a08";
export const PAPER_CAPTION = "#fff1b8"; // narration caption yellow
export const PAPER_BALLOON = "#fdfcf7";
export const PAPER_RADIO = "#e9f8ff";
export const SUB_TEXT = "#f4f1ea";

const _fonts = new Map();
/** Cached CSS font string. */
export function csFont(face, px, weight = 700, italic = false) {
  const size = Math.max(6, Math.round(px * 2) / 2);
  const key = `${face}|${size}|${weight}|${italic ? 1 : 0}`;
  let f = _fonts.get(key);
  if (!f) {
    f = `${italic ? "italic " : ""}${weight} ${size}px ${CS_FONT[face] || face}`;
    _fonts.set(key, f);
  }
  return f;
}

/** Set tracking where the canvas supports it (Chrome 99+, Safari 17+). */
export function setTracking(g, px) {
  if ("letterSpacing" in g) g.letterSpacing = px ? `${px}px` : "0px";
}

// ─── Wrapping ───────────────────────────────────────────────────────────────

const _layouts = new Map();
const MAX_LAYOUTS = 400;

function greedy(widths, space, maxW) {
  const breaks = [];
  let lineW = 0;
  for (let i = 0; i < widths.length; i++) {
    const add = lineW === 0 ? widths[i] : lineW + space + widths[i];
    if (lineW > 0 && add > maxW) {
      breaks.push(i);
      lineW = widths[i];
    } else {
      lineW = add;
    }
  }
  return breaks;
}

/**
 * Wrap `text` in `font` to at most `maxW` (user units), balanced so the lines
 * are near equal length. Returns { lines, widths, width } where `width` is the
 * widest measured line. Cached; `g` is any 2D context used for measuring.
 */
export function wrapText(g, text, font, maxW, tracking = 0) {
  const mw = Math.max(1, Math.floor(maxW));
  const key = `${font}|${tracking}|${mw}|${text}`;
  let lay = _layouts.get(key);
  if (lay) return lay;

  g.save();
  g.font = font;
  setTracking(g, tracking);
  const words = String(text).split(/\s+/).filter(Boolean);
  const widths = words.map((wd) => g.measureText(wd).width);
  const space = g.measureText(" ").width;
  let breaks = greedy(widths, space, mw);
  if (breaks.length > 0) {
    // Smallest width that still needs the same number of lines.
    const n = breaks.length;
    let lo = Math.max(...widths);
    let hi = mw;
    for (let it = 0; it < 10 && hi - lo > 1; it++) {
      const mid = (lo + hi) / 2;
      if (greedy(widths, space, mid).length > n) lo = mid;
      else hi = mid;
    }
    breaks = greedy(widths, space, Math.ceil(hi) + 1);
  }
  const lines = [];
  let start = 0;
  for (const b of [...breaks, words.length]) {
    lines.push(words.slice(start, b).join(" "));
    start = b;
  }
  const lw = lines.map((l) => g.measureText(l).width);
  g.restore();

  lay = { lines, widths: lw, width: lw.length ? Math.max(...lw) : 0 };
  if (_layouts.size >= MAX_LAYOUTS) _layouts.delete(_layouts.keys().next().value);
  _layouts.set(key, lay);
  return lay;
}

// ─── Line classification ────────────────────────────────────────────────────

const SPEAKER_RE = /^([A-Z][A-Z .'-]{1,24}):\s*(.*)$/;
const QUOTE_RE = /^["“](.*?)["”]?$/;

/**
 * Split a resolved line into { speaker, text, quoted }.
 * "ARIA: Vitals back."   → speaker ARIA
 * "\"You read my file.\"" → quoted (the character on screen speaking)
 */
export function classifyLine(text) {
  let speaker = null;
  let body = String(text);
  const sm = body.match(SPEAKER_RE);
  if (sm) {
    speaker = sm[1].trim();
    body = sm[2];
  }
  let quoted = false;
  const qm = body.match(QUOTE_RE);
  if (qm && /^["“]/.test(body) && /["”]$/.test(body) && body.length > 1) {
    quoted = true;
    body = qm[1];
  }
  return { speaker, text: body, quoted };
}

// ─── Colour ─────────────────────────────────────────────────────────────────

function parseColor(c) {
  if (!c) return null;
  let m = /^#([0-9a-f]{3,8})$/i.exec(c);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map((x) => x + x).join("");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  m = /rgba?\(([^)]+)\)/i.exec(c);
  if (m) return m[1].split(",").slice(0, 3).map((v) => parseFloat(v));
  return null;
}

function lum(rgb) {
  const ch = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

const _readable = new Map();
/**
 * `color` if it reaches `ratio` contrast against `bg`, else the same hue
 * pushed toward black or white until it does.
 */
export function readableOn(color, bg, ratio = 4.5) {
  const key = `${color}|${bg}|${ratio}`;
  let out = _readable.get(key);
  if (out) return out;
  const fg = parseColor(color);
  const b = parseColor(bg);
  if (!fg || !b) return color || SUB_TEXT;
  const lb = lum(b);
  const dark = lb > 0.4;
  let c = fg;
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    c = fg.map((v) => Math.round(dark ? v * (1 - t) : v + (255 - v) * t));
    const lf = lum(c);
    const r = (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
    if (r >= ratio) break;
  }
  out = `rgb(${c[0]},${c[1]},${c[2]})`;
  _readable.set(key, out);
  return out;
}

/**
 * Lettering colour for text on a light paper: ink for greys and pastels
 * (black lettering is the convention), a darkened version of the author's
 * colour when it is a strong hue (reds for alarm, etc.).
 */
export function inkFor(color, paper) {
  const c = parseColor(color);
  if (!c) return INK;
  const max = Math.max(...c);
  const min = Math.min(...c);
  const sat = max === 0 ? 0 : (max - min) / max;
  if (sat < 0.5 || max - min < 110) return INK;
  return readableOn(color, paper, 6);
}

// ─── Shapes ─────────────────────────────────────────────────────────────────

/** Speech balloon body: an oval-cornered box hugging the text. */
export function balloonPath(g, x, y, w, h) {
  const r = Math.min(h / 2, w / 2, Math.max(10, h * 0.48));
  g.roundRect(x, y, w, h, r);
}

/**
 * Tail wedge from the balloon edge toward (tx, ty). The base sits inside the
 * balloon so the union outline stays clean.
 */
export function tailPath(g, bx, by, bw, bh, tx, ty, base) {
  const cx = bx + bw / 2;
  const cy = by + bh / 2;
  // Base anchored a third of the way toward the target side of the balloon.
  const ax = Math.max(bx + bh * 0.5, Math.min(bx + bw - bh * 0.5, cx + (tx - cx) * 0.35));
  const ay = ty < cy ? by + bh * 0.3 : by + bh * 0.7;
  const dx = tx - ax;
  const dy = ty - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const half = base / 2;
  // Curved wedge with a slight hook, like a lettered tail.
  g.moveTo(ax + nx * half, ay + ny * half);
  g.quadraticCurveTo(ax + dx * 0.55 + nx * half * 0.2, ay + dy * 0.55 + ny * half * 0.2, tx, ty);
  g.quadraticCurveTo(ax + dx * 0.45 - nx * half * 0.6, ay + dy * 0.45 - ny * half * 0.6, ax - nx * half, ay - ny * half);
  g.closePath();
}

/**
 * Ink a balloon (+ optional tail) as one shape: stroke both at double width,
 * then fill both, so the tail joins the body with no seam.
 */
export function drawBalloon(g, x, y, w, h, opts) {
  const { fill = PAPER_BALLOON, ink = INK, lw = 2, tail = null, radio = false } = opts || {};
  g.save();
  g.lineJoin = "round";
  // Hard offset shadow, printed look.
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.beginPath();
  balloonPath(g, x + lw * 1.5, y + lw * 1.5, w, h);
  g.fill();
  g.strokeStyle = ink;
  g.lineWidth = lw * 2;
  g.beginPath();
  balloonPath(g, x, y, w, h);
  if (tail) tailPath(g, x, y, w, h, tail.x, tail.y, tail.base);
  g.stroke();
  g.fillStyle = fill;
  g.beginPath();
  balloonPath(g, x, y, w, h);
  g.fill();
  if (tail) {
    g.beginPath();
    tailPath(g, x, y, w, h, tail.x, tail.y, tail.base);
    g.fill();
  }
  if (radio) {
    // Radio / transmitted voice: an inner rule reads as "over the comms".
    g.strokeStyle = "rgba(20,60,80,0.45)";
    g.lineWidth = Math.max(1, lw * 0.6);
    g.setLineDash([lw * 3, lw * 2]);
    g.beginPath();
    balloonPath(g, x + lw * 2.2, y + lw * 2.2, w - lw * 4.4, h - lw * 4.4);
    g.stroke();
    g.setLineDash([]);
  }
  g.restore();
}

/** Narration caption: a squared box with an ink rule and a hard drop shadow. */
export function drawCaptionBox(g, x, y, w, h, opts) {
  const { fill = PAPER_CAPTION, ink = INK, lw = 2 } = opts || {};
  g.save();
  g.fillStyle = "rgba(0,0,0,0.45)";
  g.fillRect(x + lw * 2, y + lw * 2, w, h);
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
  g.strokeStyle = ink;
  g.lineWidth = lw;
  g.strokeRect(x, y, w, h);
  g.restore();
}
