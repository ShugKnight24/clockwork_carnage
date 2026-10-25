/**
 * Comms portraits: a painted head-and-shoulders bust for each voice on the
 * comms plate, drawn the way that person looks in the world (the station
 * sprites in src/rendering/enemies/station-people.js and
 * src/rendering/svg-art/sprites/humanoids.js, the squad in
 * src/rendering/svg-art/models/cast.js).
 *
 * Every bust is vector art in a 100-unit box, lit from the upper left with a
 * rim light in the character's own colour on the right, over a backdrop
 * tinted the same. Three finishes:
 *   comic   ink outlines and hard cel shading over a halftone backdrop
 *   real    soft shading, graded toward grey, vignette and film grain
 *   legacy  the comic bust rasterised small and blown up into pixels
 *
 * Painting is the expensive part, so each (character, finish, size, frame)
 * is painted once into an offscreen canvas. A frame is a mouth shape (shut,
 * half, open) or a blink; for the helmeted, the frames are visor levels.
 * Per frame the plate only blits: the frame for this instant, a brightness
 * pulse while the line is being said, radio static for a line over the air,
 * ARIA's hologram flicker, and the grain moving.
 */

import { VOICES, voiceKeyFor } from "../audio/voice.js";

const INK = "#04060b";

// ─── Colour ────────────────────────────────────────────────────────────────

const _rgb = new Map();
function rgbOf(hex) {
  let c = _rgb.get(hex);
  if (!c) {
    // Plate tones arrive as #rgb, #rrggbb or rgb(r,g,b).
    const s = String(hex);
    const m = s.match(/rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/);
    if (m) c = [Number(m[1]), Number(m[2]), Number(m[3])];
    else {
      let h = s.replace("#", "");
      if (h.length === 3) h = h.replace(/./g, "$&$&");
      const n = parseInt(h.slice(0, 6), 16) || 0;
      c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    _rgb.set(hex, c);
  }
  return c;
}

const toHex = (r, g, b) => "#" + ((1 << 24) | (clamp255(r) << 16) | (clamp255(g) << 8) | clamp255(b)).toString(16).slice(1);
const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)));

function mix(a, b, t) {
  const [r1, g1, b1] = rgbOf(a);
  const [r2, g2, b2] = rgbOf(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** Toward a cool near-black: the shadow side of a form. */
const darkOf = (hex, k) => mix(hex, "#0b0f1c", k);
/** Toward a warm white: the side facing the key light. */
const lightOf = (hex, k) => mix(hex, "#fff6ea", k);

function alpha(hex, a) {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Realistic grade: pulled toward its own grey (less for lights and glows,
 * `keep` near 1) and down a touch, like the rest of the Realistic HUD.
 */
function grade(hex, keep = 0.55) {
  const [r, g, b] = rgbOf(hex);
  const l = 0.3 * r + 0.59 * g + 0.11 * b;
  const k = keep;
  return toHex((l + (r - l) * k) * 0.9 + 6, (l + (g - l) * k) * 0.9 + 7, (l + (b - l) * k) * 0.9 + 8);
}

// ─── Paths ─────────────────────────────────────────────────────────────────

const _paths = new Map();
function pathOf(d) {
  if (typeof d !== "string") return d;
  let p = _paths.get(d);
  if (!p) {
    p = new Path2D(d);
    _paths.set(d, p);
  }
  return p;
}

function ell(cx, cy, rx, ry, rot = 0) {
  const p = new Path2D();
  p.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
  return p;
}

const rect = (x, y, w, h) => `M${x} ${y}L${x + w} ${y}L${x + w} ${y + h}L${x} ${y + h}Z`;

/** Mirror an absolute M/L/C/Q/Z path across the bust's centre line (x = 50). */
function mir(d) {
  let i = 0;
  return d.replace(/-?\d*\.?\d+/g, (n) => (i++ % 2 === 0 ? String(Math.round((100 - Number(n)) * 100) / 100) : n));
}

// ─── Pen: one set of shapes, three finishes ────────────────────────────────

class Pen {
  constructor(g, style, tint, px) {
    this.g = g;
    this.style = style;
    this.real = style === "real";
    this.tint = tint;
    this.px = px; // device pixels per bust unit (for blur radii)
    this.alpha = 1;
  }

  col(hex, keep) {
    return this.real ? grade(hex, keep) : hex;
  }

  /**
   * A shaded form: base fill, its shadow crescent away from the key light,
   * a highlight toward it, an optional rim in the tint on the right, and an
   * ink edge (comic) or a soft dark one (real).
   */
  part(d, base, o = {}) {
    const g = this.g;
    const p = pathOf(d);
    const a = this.alpha * (o.alpha ?? 1);
    g.save();
    g.globalAlpha = a;
    g.fillStyle = this.col(base);
    g.fill(p);
    if (!o.flat) {
      g.save();
      g.clip(p);
      const dep = o.depth ?? 5;
      const dark = this.col(darkOf(base, o.shadow ?? 0.45));
      const hi = this.col(lightOf(base, o.hi ?? 0.3));
      if (this.real) {
        for (let i = 1; i <= 4; i++) this._cres(p, dep * i * 0.4, dep * i * 0.3, dark, a * 0.24);
        if (o.hi !== 0) for (let i = 1; i <= 3; i++) this._cres(p, -dep * i * 0.28, -dep * i * 0.3, hi, a * 0.13);
      } else {
        this._cres(p, dep, dep * 0.75, dark, a);
        if (o.hi !== 0) this._cres(p, -dep * 0.42, -dep * 0.45, hi, a * 0.85);
      }
      if (o.rim) {
        const rc = this.col(lightOf(this.tint, 0.15), 0.8);
        if (this.real) for (let i = 1; i <= 3; i++) this._cres(p, o.rim * i * 0.5, 0, rc, a * 0.2);
        else this._cres(p, o.rim, 0, rc, a * 0.85);
      }
      g.restore();
    }
    if (o.ink !== 0) {
      g.lineJoin = "round";
      if (this.real) {
        g.globalAlpha = a * 0.45;
        g.lineWidth = 0.8;
        g.strokeStyle = "#05070a";
      } else {
        g.lineWidth = (o.ink ?? 1) * (this.style === "legacy" ? 3.4 : 1.6);
        g.strokeStyle = INK;
      }
      g.stroke(p);
    }
    g.restore();
  }

  /** Fill `p` minus a copy of it shifted by (-dx, -dy): a crescent on the far side. */
  _cres(p, dx, dy, color, a) {
    const q = new Path2D();
    q.rect(-30, -30, 160, 160);
    q.addPath(p, new DOMMatrix([1, 0, 0, 1, -dx, -dy]));
    this.g.globalAlpha = a;
    this.g.fillStyle = color;
    this.g.fill(q, "evenodd");
  }

  fill(d, color, a = 1) {
    const g = this.g;
    g.save();
    g.globalAlpha = this.alpha * a;
    g.fillStyle = this.col(color);
    g.fill(pathOf(d));
    g.restore();
  }

  line(d, color, w = 1, a = 1, keep) {
    const g = this.g;
    g.save();
    g.globalAlpha = this.alpha * a;
    g.strokeStyle = this.col(color, keep);
    g.lineWidth = this.style === "legacy" ? Math.max(w, 2.4) : w;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.stroke(pathOf(d));
    g.restore();
  }

  /** Emissive shape: a halo, the colour, and a hot core. */
  glow(d, color, a = 1, blur = 5) {
    const g = this.g;
    const p = pathOf(d);
    const c = this.col(color, 0.8);
    g.save();
    g.globalAlpha = this.alpha * a;
    g.fillStyle = c;
    g.shadowColor = c;
    g.shadowBlur = blur * this.px;
    g.fill(p);
    g.shadowBlur = 0;
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = this.alpha * a * 0.55;
    g.fillStyle = this.col(lightOf(color, 0.55), 0.8);
    g.fill(p);
    g.restore();
  }

  glowLine(d, color, w, a = 1, blur = 4) {
    const g = this.g;
    const c = this.col(color, 0.8);
    g.save();
    g.globalAlpha = this.alpha * a;
    g.strokeStyle = c;
    g.lineWidth = w;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.shadowColor = c;
    g.shadowBlur = blur * this.px;
    g.stroke(pathOf(d));
    g.restore();
  }
}

// ─── Anatomy ───────────────────────────────────────────────────────────────

const FACE_F = "M36.5 38C36.5 24 42.5 19 50 19C57.5 19 63.5 24 63.5 38C63.5 48 58.5 57 50 60.5C41.5 57 36.5 48 36.5 38Z";
const FACE_M = "M35.5 38C35.5 24 42 18.5 50 18.5C58 18.5 64.5 24 64.5 38C64.5 50 60.5 57.5 50 60.5C39.5 57.5 35.5 50 35.5 38Z";
const NECK = "M43.5 50L56.5 50L58 71L42 71Z";
const CHIN_SHADOW = "M43.5 50L56.5 50L57.2 61C53 63.6 47 63.6 42.8 61Z";
const TORSO = "M2 101L6 86C10 76 22 71.5 36 69.5L64 69.5C78 71.5 90 76 94 86L98 101Z";
const TORSO_SLIM = "M9 101L13 88C16 80 25 75 37 73.5L63 73.5C75 75 84 80 87 88L91 101Z";

function eyes(pen, F, L) {
  const y = L.eyeY ?? 40.5;
  const dx = 6.4;
  for (const s of [-1, 1]) {
    const x = 50 + s * dx;
    if (F.blink) {
      pen.line(`M${x - 2.8} ${y}Q${x} ${y + 1.3} ${x + 2.8} ${y}`, "#2a1a14", 1.1, 0.95);
    } else {
      pen.part(ell(x, y, 2.8, 1.6), L.sclera ?? "#eee6dc", { flat: true, ink: 0 });
      pen.fill(ell(x - s * 0.2, y + 0.1, 1.4, 1.4), L.iris ?? "#3a2a1e");
      pen.fill(ell(x - s * 0.2, y + 0.1, 0.62, 0.62), "#07060a");
      pen.fill(ell(x - s * 0.2 - 0.5, y - 0.5, 0.42, 0.42), "#ffffff", 0.9);
      pen.line(`M${x - 3.1} ${y + 0.1}Q${x} ${y - 2.4} ${x + 3.1} ${y + 0.1}`, "#1a100c", L.lashes ? 1.3 : 1);
      if (L.lashes) pen.line(`M${x + s * 3} ${y - 0.1}L${x + s * 4.1} ${y - 1}`, "#1a100c", 0.8);
    }
    const bi = 50 + s * 3;
    const bo = 50 + s * 9.6;
    const by = y - 4.6 + (L.browRaise ?? 0);
    const tilt = L.stern ? 1.3 : 0;
    pen.line(`M${bi} ${by + tilt}Q${(bi + bo) / 2} ${by - 1.5} ${bo} ${by + 0.5}`, L.brow ?? "#2a1d16", L.male ? 1.9 : 1.3);
  }
}

function mouth(pen, F, L) {
  const y = L.mouthY ?? 53.4;
  const w = L.male ? 4.4 : 3.8;
  const lip = L.lip ?? mix(L.skin, "#8a3a30", 0.35);
  const o = F.mouth;
  if (!o) {
    pen.line(`M${50 - w} ${y}Q50 ${y + 0.9} ${50 + w} ${y}`, darkOf(lip, 0.45), 1.05);
    if (!L.male) pen.fill(`M${50 - w * 0.7} ${y + 0.7}Q50 ${y + 2.6} ${50 + w * 0.7} ${y + 0.7}Q50 ${y + 1.3} ${50 - w * 0.7} ${y + 0.7}Z`, lip, 0.75);
    return;
  }
  const h = o === 1 ? 1.4 : 2.8;
  const ww = o === 1 ? w * 0.78 : w * 0.9;
  pen.fill(`M${50 - ww} ${y}Q50 ${y - 1} ${50 + ww} ${y}Q50 ${y + h * 1.6} ${50 - ww} ${y}Z`, "#2a0c0a");
  if (o === 2) pen.fill(`M${50 - ww * 0.7} ${y - 0.3}Q50 ${y - 0.7} ${50 + ww * 0.7} ${y - 0.3}L${50 + ww * 0.6} ${y + 0.6}Q50 ${y + 0.4} ${50 - ww * 0.6} ${y + 0.6}Z`, "#e6ded2", 0.85);
  pen.line(`M${50 - ww} ${y}Q50 ${y - 1} ${50 + ww} ${y}`, darkOf(lip, 0.3), 0.9);
  if (!L.male) pen.line(`M${50 - ww * 0.8} ${y + h * 0.8 + 0.6}Q50 ${y + h * 1.25 + 0.9} ${50 + ww * 0.8} ${y + h * 0.8 + 0.6}`, lip, 1.2, 0.8);
}

/** Neck, ears, face and features. Hair, hats and helmets go on after. */
function head(pen, F, L) {
  const sk = L.skin;
  pen.part(NECK, darkOf(sk, 0.18), { depth: 4, hi: 0 });
  pen.fill(CHIN_SHADOW, darkOf(sk, 0.5), 0.75);
  const ex = L.male ? 35.2 : 36.2;
  for (const s of [-1, 1]) pen.part(ell(50 + s * (50 - ex), 41, 2.5, 4.3), darkOf(sk, 0.08), { depth: 1.6, hi: 0, rim: s > 0 ? 1 : 0 });
  pen.part(L.male ? FACE_M : FACE_F, sk, { depth: 6.5, rim: 2.2 });
  // Cheek warmth, the nose's shadow side and the nostrils.
  pen.fill(ell(43.2, 48, 3.6, 2.2), "#d8705c", L.male ? 0.08 : 0.16);
  pen.fill(ell(56.8, 48, 3.6, 2.2), "#d8705c", L.male ? 0.06 : 0.12);
  pen.line("M50.8 41.6Q52.6 46.6 50.8 48.2", darkOf(sk, 0.45), 0.95, 0.85);
  pen.line("M47.8 48.6Q50 49.9 52.4 48.6", darkOf(sk, 0.5), 0.75, 0.8);
  if (L.age) {
    pen.line("M44.4 47.8Q43.2 51.4 44.8 55", darkOf(sk, 0.4), 0.7, 0.55);
    pen.line("M55.6 47.8Q56.8 51.4 55.2 55", darkOf(sk, 0.4), 0.7, 0.55);
    pen.line("M41 42.6L39.4 43.6M59 42.6L60.6 43.6", darkOf(sk, 0.4), 0.6, 0.5);
  }
  if (L.stubble) pen.fill("M38.6 48C41 56 46 60 50 60.4C54 60 59 56 61.4 48C58 53 54 56 50 56.4C46 56 42 53 38.6 48Z", "#2a2420", 0.28);
  eyes(pen, F, L);
  if (L.moustache) pen.part("M43.4 51.2C46 49.2 54 49.2 56.6 51.2C55.2 53.2 52.2 52.2 50 52.5C47.8 52.2 44.8 53.2 43.4 51.2Z", L.moustache, { depth: 1.2, hi: 0.35 });
  mouth(pen, F, L.moustache ? { ...L, mouthY: 54.6 } : L);
}

/** The cap's shadow across the brow, or a helmet rim's. */
function castShadow(pen, y0, a = 0.38) {
  pen.fill(`M35 ${y0}C42 ${y0 + 4} 58 ${y0 + 4} 65 ${y0}L65 ${y0 + 5}C58 ${y0 + 8.5} 42 ${y0 + 8.5} 35 ${y0 + 5}Z`, "#0b0f1c", a);
}

// ─── Kit ───────────────────────────────────────────────────────────────────

function pauldron(pen, base, trim, o = {}) {
  const L = "M1 93C1 78 11 69.5 25.5 68.5C34 68.2 38.5 73 37.6 79.6C29 84 15 88.6 1 93Z";
  pen.part(L, base, { depth: 4.5, rim: 0 });
  pen.part(mir(L), base, { depth: 4.5, rim: 2 });
  if (trim) {
    const t = "M3.6 87.4C5.6 77.6 13.4 71.4 25.6 70.8C31.6 70.6 35.2 73.4 35.6 77.6";
    pen.line(t, trim, o.trimW ?? 1.8, 0.95);
    pen.line(mir(t), trim, o.trimW ?? 1.8, 0.95);
  }
}

function plateTorso(pen, base, o = {}) {
  pen.part(o.wide ? "M-4 101L0 82C6 72 20 67 36 66L64 66C80 67 94 72 100 82L104 101Z" : TORSO, base, { depth: 6, rim: 2.4 });
  // Gorget / collar ring under the helmet.
  pen.part("M35 63L65 63L68 72.5C59 77 41 77 32 72.5Z", o.gorget ?? darkOf(base, 0.3), { depth: 2.5 });
}

/**
 * A closed trooper helmet: dome, visor (its glow steps with the speech
 * frame), a jaw piece with vents, and side blocks. Shapes per member.
 */
function helmet(pen, F, H) {
  const lvl = [0.62, 0.84, 1][F.mouth];
  pen.part(H.dome, H.base, { depth: 6, rim: 2.6, hi: 0.4 });
  if (H.side) {
    pen.part(H.side, darkOf(H.base, 0.25), { depth: 1.5, hi: 0.2 });
    pen.part(mir(H.side), darkOf(H.base, 0.25), { depth: 1.5, hi: 0.2, rim: 1 });
  }
  if (H.extra) H.extra(pen, F);
  pen.part(H.visor, darkOf(H.glow, 0.78), { depth: 2, hi: 0.15, shadow: 0.3 });
  pen.glow(H.slit, H.glow, lvl, 5);
  // Glass glint across the top of the visor.
  if (H.glint) pen.line(H.glint, "#ffffff", 0.9, 0.55);
  pen.part(H.jaw, darkOf(H.base, 0.2), { depth: 2.5, hi: 0.2 });
  for (const vx of [45.5, 50, 54.5]) pen.line(`M${vx} ${H.ventY}L${vx} ${H.ventY + 4}`, "#06080c", 1, 0.85);
  // A comms LED on the chin lights while they talk.
  if (F.mouth) pen.glow(ell(H.ledX ?? 57.6, H.ventY + 1.2, 0.9, 0.9), H.glow, 0.9, 3);
}

// ─── Civilians: one painter, configured per person ─────────────────────────

const HAIR_BACK = {
  bob: "M33.6 52C31 31 37 15 50 14C63 15 69 31 66.4 52L63.4 55C64.4 41 62 30 50 28.6C38 30 35.6 41 36.6 55Z",
  long: "M32 66C28 41 32 16 50 14C68 16 72 41 68 66L62.4 67.6C64.4 47 62 30 50 28.6C38 30 35.6 47 37.6 67.6Z",
  short: null,
  bun: "M44 15.4C44 9.6 47 6.6 50 6.6C53 6.6 56 9.6 56 15.4Z",
  pony: "M58 26C70 30 74 46 70 64C67.6 66 66 64 66.6 60C68 48 66 38 60 33Z",
};
const HAIR_FRONT = {
  bob: "M36.6 39C36 24 43 17.4 51 17.4C60 17.4 64.6 24 64 35C58 28.4 50.4 26.6 43.4 30.2C40.4 32.4 38.4 35.4 36.6 39Z",
  long: "M36.2 37C36 22.6 43 16.6 50 16.6C57 16.6 64 22.6 63.8 37C61.4 29 56.6 24.4 50.4 24.6C49.4 27 45.2 30.4 36.2 37Z",
  short: "M35.6 36C35 22 42 16.4 50 16.4C58 16.4 65 22 64.4 36C63 30 60 27.4 56 26.4C51 28 44 28 40 26.6C37.8 28.6 36.4 32 35.6 36Z",
  bun: "M35.8 40C34.4 24 41 15.6 50 15.6C59 15.6 65.6 24 64.2 40C62.4 30.6 57.6 25.6 50 25.6C42.4 25.6 37.6 30.6 35.8 40Z",
  swept: "M35.4 36C34.6 21 42 15.6 50.6 15.6C59 15.6 65.4 21.4 64.6 34C61 27.6 55.6 25 49 25.4C44 25.6 39.6 29 35.4 36Z",
};

function civilian(pen, F, C) {
  // Hair behind the head first.
  const hb = HAIR_BACK[C.hair];
  if (hb) pen.part(hb, C.hairC, { depth: 3, rim: 1.6 });
  // Garment.
  if (C.garment === "labcoat") {
    pen.part(TORSO, C.coat ?? "#e8ecf0", { depth: 6, rim: 2.4, shadow: 0.35 });
    pen.part("M38 69.4L50 90L62 69.4Z", C.shirt ?? "#3a8f88", { depth: 2 });
    const lap = "M37 69.4L49.2 92L44.4 101L33 101L29.6 79Z";
    pen.part(lap, darkOf(C.coat ?? "#e8ecf0", 0.12), { depth: 2.5 });
    pen.part(mir(lap), darkOf(C.coat ?? "#e8ecf0", 0.12), { depth: 2.5, rim: 1.2 });
    pen.part(rect(69, 82, 2.2, 9), "#2f7fd0", { flat: true, ink: 0.6 });
  } else if (C.garment === "coveralls") {
    pen.part(TORSO, C.coat ?? "#5a7276", { depth: 6, rim: 2.4 });
    pen.part("M35.6 69L50 79.6L64.4 69L67.4 74.4L50 85.4L32.6 74.4Z", darkOf(C.coat ?? "#5a7276", 0.15), { depth: 2 });
    pen.line("M33.6 73.6L50 84.4L66.4 73.6", C.trim ?? "#d0802f", 0.9, 0.9);
    pen.line("M50 85.4L50 101", darkOf(C.coat ?? "#5a7276", 0.45), 1.1);
    pen.part(rect(60, 86, 11, 4.4), C.trim ?? "#d0802f", { flat: true, ink: 0.6 });
  } else {
    // A long coat with a high collar (Lyra, Voss).
    pen.part(TORSO, C.coat, { depth: 6, rim: 2.4 });
    pen.part("M37.6 66L50 78L62.4 66L64.6 72L50 86L35.4 72Z", darkOf(C.coat, 0.2), { depth: 2 });
    pen.line("M36.4 70.6L50 84L63.6 70.6", C.trim, 1.6, 0.95);
  }
  if (C.lanyard) {
    pen.line("M42.4 70Q44.4 84 47.4 93.6", C.lanyard, 1.6);
    pen.line("M57.6 70Q55.6 84 52.6 93.6", C.lanyard, 1.6);
    pen.part(rect(44.6, 92.6, 10.8, 8.4), "#f2f4f6", { depth: 1, ink: 0.6 });
    pen.fill(rect(44.6, 92.6, 10.8, 2.2), C.lanyard);
  }
  if (C.stopwatch) {
    pen.line("M42 70Q50 84 58 70", "#c03a2a", 1.1);
    pen.part(ell(50, 87.4, 4.4, 4.4), "#c8d0d8", { depth: 1.5, hi: 0.4 });
    pen.fill(ell(50, 87.4, 3.2, 3.2), "#f4f2ea");
    pen.line("M50 87.4L50 85M50 87.4L51.8 88.2", "#1a1a1a", 0.6);
    pen.part(rect(49.2, 81.6, 1.6, 1.6), "#c8d0d8", { flat: true, ink: 0.5 });
  }
  head(pen, F, C);
  if (C.freckles) for (const [fx, fy] of [[42.4, 46.4], [44, 47.6], [45.4, 46.6], [55, 46.6], [56.4, 47.6], [58, 46.4]]) pen.fill(ell(fx, fy, 0.35, 0.35), darkOf(C.skin, 0.45), 0.7);
  if (C.glasses) {
    for (const s of [-1, 1]) pen.line(rect(50 + s * 6.4 - 3.6, 38.2, 7.2, 4.8), "#1a1410", 0.9);
    pen.line("M46.4 40L53.6 40", "#1a1410", 0.8);
  }
  pen.part(HAIR_FRONT[C.front ?? C.hair] ?? HAIR_FRONT.short, C.hairC, { depth: 3, rim: 1.6, hi: 0.35 });
  if (C.streak) pen.line("M44 19.4C38.6 24 35.8 34 36 46", C.streak, 1.3, 0.9);
  if (C.headband) pen.line("M35.8 30C42 25.6 58 25.6 64.2 30", C.headband, 2.2);
  if (C.goggles) {
    pen.line("M35.4 29.4Q50 22.6 64.6 29.4", "#20262e", 2.4);
    for (const gx of [44.4, 55.6]) {
      pen.part(ell(gx, 26, 4.6, 3.3), "#8a9aa6", { depth: 1, hi: 0.4 });
      pen.part(ell(gx, 26, 3.4, 2.3), "#2a4a58", { depth: 1.2, hi: 0.5, ink: 0 });
      pen.line(`M${gx - 1.8} ${25}L${gx - 0.4} ${24.2}`, "#e8fbff", 0.7, 0.8);
    }
  }
  if (C.headset) {
    pen.line("M34.4 38C33 18 67 18 65.6 38", "#1c2228", 2.4);
    for (const s of [-1, 1]) pen.part(ell(50 + s * 15.6, 42, 3, 5), "#2a323a", { depth: 1.2, hi: 0.3 });
    pen.line("M34.6 46.4Q36.2 55 44.6 55.6", "#2a323a", 1.4);
    pen.fill(ell(44.8, 55.6, 1.3, 1.1), "#2a323a");
    if (F.mouth) pen.glow(ell(44.8, 55.6, 0.8, 0.8), pen.tint, 1, 3);
  }
  if (C.visorBand) {
    pen.part("M35 38C42 36 58 36 65 38L64.6 43.4C58 41.6 42 41.6 35.4 43.4Z", "#140a02", { depth: 1, hi: 0.2 });
    pen.glow("M36.6 39.4C43 38 57 38 63.4 39.4L63.2 41C57 40 43 40 36.8 41Z", C.visorBand, 0.85, 4);
  }
  if (C.badge) {
    pen.part(ell(66, 84, 2.6, 2.6), "#2a1a08", { flat: true, ink: 0.6 });
    pen.glow(ell(66, 84, 1.2, 1.2), C.badge, 1, 3);
  }
}

// ─── The cast ──────────────────────────────────────────────────────────────

const SKINS = ["#e3b892", "#c48a5e", "#8a5a3c", "#f0caa6", "#a8714a", "#6e4630"];
const HAIRS = ["#1d1712", "#3a2618", "#120e0c", "#5a3b22", "#26201c"];

function hashOf(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Each character: backdrop tint, whether they blink, and how to paint them. */
const CAST = {
  aria: {
    tint: "#3ee8ff",
    holo: true,
    paint(pen, F) {
      const t = pen.tint;
      pen.alpha = 0.92;
      pen.part(TORSO_SLIM, "#1d5878", { depth: 5, rim: 2.4 });
      pen.part("M41 65L59 65L62.4 73.6L50 80.4L37.6 73.6Z", "#2a7494", { depth: 2 });
      pen.line("M37.6 73.6L50 84L62.4 73.6", t, 2.2, 0.95);
      // The bob behind her head, longer on her right.
      pen.part("M33 53C29.6 34 33 15.6 50 13.6C66.4 14 71.6 30 68.4 46L66.4 52L63.4 34C58.4 28 48 27 40 30C37 37 36.6 45 37.6 55Z", "#1a2a48", { depth: 3, rim: 1.8 });
      head(pen, F, { skin: "#c2f2ff", iris: t, sclera: "#e8ffff", brow: "#24405e", lip: "#58b4cc", lashes: true });
      pen.part("M36 37C35 24 42 16.6 51 16.6C60 16.6 66 23 65.6 33C60 26.6 52 25.2 44 27C41 30 38.4 33 36 37Z", "#1d2e4c", { depth: 3, rim: 1.6, hi: 0.4 });
      pen.part("M36 30C32.4 40 32.4 52 35.2 58.4L39.6 56.4C37.6 48 37.6 40 39.2 33Z", "#16243c", { depth: 2 });
      pen.line("M44 18.8C38.4 24 35.4 34 35.6 47", t, 1.4, 0.9);
      // Earpiece and its lead to the mic at her mouth; no headset band.
      pen.part(ell(64.8, 42, 2, 3.8, 0.15), "#28506a", { depth: 1, hi: 0.4 });
      pen.line("M64.4 45.6Q63.6 51.6 58.4 53", "#8fd0e6", 0.9, 0.9);
      pen.glow(ell(58, 53, 1, 1), t, 1, 3);
      // Her eyes glow.
      if (!F.blink) for (const s of [-1, 1]) pen.glow(ell(50 + s * 6.4, 40.6, 1.2, 1.2), t, 0.9, 3.5);
      pen.alpha = 1;
    },
  },

  simon: {
    tint: "#e0b84a",
    blinks: true,
    paint(pen, F) {
      const gold = "#e0b84a";
      // The short crimson cape stands up behind the shoulders.
      pen.part("M-2 101L-2 80C14 70 30 66 50 66C70 66 86 70 102 80L102 101Z", "#7a1a24", { depth: 3, rim: 1.5 });
      plateTorso(pen, "#4e5f8c", { gorget: "#c89a3a" });
      // Sash with gold edges, and the ribbon rack.
      pen.part("M20 75L31 72L72 101L57 101Z", "#8a1a22", { depth: 2 });
      pen.line("M21 75.6L58 101M30.6 72.6L71.4 101", gold, 0.9, 0.9);
      ["#c23a3a", "#2a6ac2", "#e0b84a", "#2a8a5a", "#f0f0ec", "#7a2a9a"].forEach((c, i) => pen.fill(rect(60 + (i % 3) * 3.8, 79 + Math.floor(i / 3) * 2.8, 3.4, 2.4), c));
      pauldron(pen, "#5a6c9a", gold, { trimW: 2.2 });
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) pen.fill(rect(50 + s * 33 - 4.5, 74.5 + k * 3.2, 9, 2), gold);
      head(pen, F, { skin: "#d8a982", male: true, brow: "#b4b4b8", stern: true, iris: "#5a6a7a", age: true, moustache: "#a6a8ac" });
      pen.part("M37 38C38 31 44 28.4 50 28.4C56 28.4 62 31 63 38C58 34 42 34 37 38Z", "#9a9a9a", { depth: 1.5 });
      // Helmet with the visor up so his face shows: the shell frames it.
      pen.part("M30.6 50C28 28 36 10.6 50 10C64 10.6 72 28 69.4 50L65.6 59L63.2 38.4C61 30.4 56 27 50 27C44 27 39 30.4 36.8 38.4L34.4 59Z", "#4e5f8c", { depth: 5, rim: 2.4, hi: 0.5 });
      pen.line("M36.8 38.4C39 30.4 44 27 50 27C56 27 61 30.4 63.2 38.4", gold, 1.2);
      pen.part("M48.2 10.4L51.8 10.4L51.2 25L48.8 25Z", gold, { depth: 0.8, hi: 0.5, ink: 0.7 });
      pen.part("M33.6 25.6C38 16.6 62 16.6 66.4 25.6L64.8 31C58 26.4 42 26.4 35.2 31Z", "#1a2436", { depth: 1.5, hi: 0.5 });
      pen.line("M37.6 23.4C44 19.6 56 19.6 62.4 23.4", "#e8f0ff", 0.8, 0.55);
    },
  },

  rasczak: {
    tint: "#ff4a2e",
    paint(pen, F) {
      const red = "#ff4a2e";
      // The command whip off the radio pack on his right shoulder.
      pen.line("M80 70L89 6", "#16191e", 2.6);
      pen.line("M79.4 70L88.4 6", "#7a828c", 0.7, 0.6);
      plateTorso(pen, "#3a3f4a", { gorget: "#22262e" });
      pauldron(pen, "#3a3f4a", "#8a1c14");
      pen.part(rect(73, 63, 13, 10), "#2a2e36", { depth: 1.5 });
      pen.glow(ell(89, 6.4, 1.6, 1.6), red, 1, 4);
      // His bar, the tally of five, a valour ribbon.
      pen.part(rect(77, 76.4, 9.4, 3.4), "#dfe4ea", { flat: true, ink: 0.6 });
      pen.line("M10 77L10 82M12.4 77L12.4 82M14.8 77L14.8 82M17.2 77L17.2 82M8.6 81L19 77", "#e8e2d6", 0.9, 0.9);
      pen.fill(rect(54, 82, 10, 2.4), "#c23a3a");
      pen.fill(rect(58, 82, 2, 2.4), "#f0f0ec");
      helmet(pen, F, {
        base: "#3a3f4a",
        glow: red,
        dome: "M29.6 46C28 24 37 9.6 50 9.2C63 9.6 72 24 70.4 46L68 60C62 66 38 66 32 60Z",
        side: "M27.6 38L32 38L32 50L28.4 50Z",
        visor: "M32.6 35.6L67.4 35.6L65.4 46L50 50.4L34.6 46Z",
        slit: "M35.4 38.8L64.6 38.8L63.4 43.6L50 46.8L36.6 43.6Z",
        glint: "M36 37.2L52 37.2",
        jaw: "M36 50.4L50 54.4L64 50.4L62 60.4C56 63.4 44 63.4 38 60.4Z",
        ventY: 55.6,
        extra(pen) {
          pen.part("M48.2 9.6L51.8 9.6L51.4 30L48.6 30Z", "#d8dde4", { depth: 0.6, ink: 0.6 });
          pen.line("M57.4 15.4L64 21M59.4 13.8L66 19.4M61.6 12.8L67.4 17.6", "#c4cad2", 0.75, 0.8);
        },
      });
    },
  },

  kael: {
    tint: "#4488ff",
    paint(pen, F) {
      const blue = "#4488ff";
      plateTorso(pen, "#4a5672", { wide: true });
      // Chest slab, riveted, and the Supervisor's handset on his strap.
      pen.part("M30 73L70 73L68.4 96L50 101L31.6 96Z", "#56627e", { depth: 3, rim: 1.2 });
      for (const [rx, ry] of [[33, 76], [67, 76], [34, 93], [66, 93]]) pen.part(ell(rx, ry, 1.1, 1.1), "#9aa6b8", { flat: true, ink: 0.4 });
      pen.line("M24 70L64 101", "#1c2230", 3.2);
      pen.part(rect(54.6, 80, 7, 12), "#1c2230", { depth: 1, hi: 0.3 });
      pen.glow(ell(58.1, 82.4, 0.9, 0.9), "#ffb347", 0.9, 3);
      // Doubled pauldrons.
      const L2 = "M-2 99C2 90 12 85 26 83.4L37 85C27 91 12 95.4 -2 101Z";
      pen.part(L2, "#323a48", { depth: 2 });
      pen.part(mir(L2), "#323a48", { depth: 2, rim: 1.4 });
      const L1 = "M-3 90C-3 74 9 63.6 25.6 63.4C36 63.4 40.4 69.6 39.4 77.6C30 82 14 86 -3 90Z";
      pen.part(L1, "#56627e", { depth: 5 });
      pen.part(mir(L1), "#56627e", { depth: 5, rim: 2.2 });
      // The breacher shield's rim rising at his left, his blue chevron on it.
      pen.part("M-4 101L-4 82C3 78.6 12 78.4 20 80.4L21 101Z", "#7a8aa0", { depth: 3, hi: 0.45 });
      pen.glowLine("M8.4 101L8.4 88M2.4 94L8.4 88L14.4 94", blue, 1.6, 0.95, 3);
      helmet(pen, F, {
        base: "#56627e",
        glow: blue,
        dome: "M27 48C25 24 36 8.6 50 8.2C64 8.6 75 24 73 48L70 62C63 68 37 68 30 62Z",
        side: "M24.6 37.6L29.4 37.6L29.4 50.6L25.2 50.6Z",
        visor: "M31 37L69 37L67 47.4L50 51.6L33 47.4Z",
        slit: "M33.6 40.2L66.4 40.2L65.2 44.8L50 48.4L34.8 44.8Z",
        glint: "M34.6 38.6L54 38.6",
        jaw: "M35 52L50 56.4L65 52L63 63.4C57 66.4 43 66.4 37 63.4Z",
        ventY: 57.6,
        extra(pen) {
          pen.line("M50 8.6L50 1.6", "#8aa4bc", 1.6);
          pen.part("M27.6 34.6Q50 25.6 72.4 34.6L71.4 28.4Q50 19.6 28.6 28.4Z", "#323a48", { depth: 1.5, hi: 0.35 });
        },
      });
    },
  },

  officer: {
    tint: "#6fb6ff",
    blinks: true,
    paint(pen, F, v) {
      const gold = "#d9b44a";
      const skin = SKINS[v % SKINS.length];
      const hair = HAIRS[(v >> 3) % HAIRS.length];
      pen.part(TORSO, "#33558c", { depth: 6, rim: 2.4 });
      // Shoulder boards with gold edges.
      const ep = "M12 78.4L32.4 71.6L33.6 76L14.4 83Z";
      pen.part(ep, "#203a66", { depth: 1, hi: 0.3 });
      pen.part(mir(ep), "#203a66", { depth: 1, hi: 0.3, rim: 1 });
      pen.line("M14.4 83L33.6 76", gold, 1);
      pen.line(mir("M14.4 83L33.6 76"), gold, 1);
      pen.part("M39.6 66L50 78.4L60.4 66L64.4 70.4L50 86L35.6 70.4Z", "#c9d4de", { depth: 2 });
      pen.part("M48 77L52 77L53.4 96L50 99.6L46.6 96Z", "#0b1220", { depth: 1, hi: 0.3 });
      // Badge on the chest.
      pen.part("M70 79L74 80.4L73.4 85.4L70 87.4L66.6 85.4L66 80.4Z", gold, { depth: 1, hi: 0.5, ink: 0.6 });
      head(pen, F, { skin, male: true, brow: hair, iris: "#3a2a1e" });
      for (const s of [-1, 1]) pen.fill(s < 0 ? "M35.4 34L39 34L38.6 46L36 44Z" : mir("M35.4 34L39 34L38.6 46L36 44Z"), hair);
      castShadow(pen, 34.6);
      // Peaked cap: crown, band, peak and badge.
      pen.part("M29.6 33.4C28 18 38 10.6 50 10C62 10.6 72 18 70.4 33.4Z", "#1c2c4c", { depth: 3, rim: 2, hi: 0.3 });
      pen.part(rect(31, 29.4, 38, 5.4), "#0b1220", { flat: true, ink: 0.7 });
      pen.part("M29.4 34.6L70.6 34.6Q62 41.6 50 41.6Q38 41.6 29.4 34.6Z", "#06090f", { depth: 1.5, hi: 0.5 });
      pen.line("M34 36.2Q50 40 66 36.2", "#5a6a8a", 0.6, 0.6);
      pen.part("M50 17.6L53.4 21.6L50 26L46.6 21.6Z", gold, { depth: 0.8, hi: 0.5, ink: 0.6 });
    },
  },

  orr: {
    tint: "#9ff0d8",
    blinks: true,
    paint(pen, F) {
      civilian(pen, F, {
        garment: "labcoat", shirt: "#3a8f88", lanyard: "#2f7fd0", goggles: true,
        skin: "#e3b892", hair: "bob", hairC: "#2a1d16", iris: "#4a3424", lashes: true, brow: "#2a1d16",
      });
    },
  },

  lin: {
    tint: "#9fd8f0",
    blinks: true,
    paint(pen, F) {
      civilian(pen, F, {
        garment: "coveralls", coat: "#5a7276", trim: "#d0802f", headset: true,
        skin: "#8a5a3c", hair: "bun", hairC: "#151010", iris: "#2a1a10", lashes: true, brow: "#151010",
      });
    },
  },

  vale: {
    tint: "#f0d89f",
    blinks: true,
    paint(pen, F) {
      civilian(pen, F, {
        garment: "coveralls", coat: "#5a7276", trim: "#d0802f", stopwatch: true, headband: "#d0802f", freckles: true,
        skin: "#a8714a", hair: "pony", front: "swept", hairC: "#3a2618", iris: "#3a2a1a", lashes: true, brow: "#2a1a10",
      });
    },
  },

  staff: {
    tint: "#c8d0dc",
    blinks: true,
    paint(pen, F) {
      civilian(pen, F, {
        garment: "labcoat", shirt: "#4a6a9a", lanyard: "#c23a5a", glasses: true,
        skin: "#f0caa6", hair: "long", hairC: "#5a3b22", iris: "#3a5a4a", lashes: true, brow: "#4a2e1a",
      });
    },
  },

  staffM: {
    tint: "#c8d0dc",
    blinks: true,
    paint(pen, F) {
      civilian(pen, F, {
        garment: "labcoat", shirt: "#3a8f88", lanyard: "#2f7fd0", male: true, stubble: true,
        skin: "#c48a5e", hair: "short", hairC: "#1d1712", iris: "#2a1a10", brow: "#1d1712",
      });
    },
  },

  miri: {
    tint: "#5ad8c8",
    blinks: true,
    paint(pen, F) {
      civilian(pen, F, {
        garment: "labcoat", shirt: "#2a9a8a", lanyard: "#2a9a8a",
        skin: "#eebd98", hair: "bob", hairC: "#4a2a1a", iris: "#3a6a5a", lashes: true, brow: "#3a2214",
      });
    },
  },

  kai: {
    tint: "#ff8a3a",
    blinks: true,
    paint(pen, F) {
      civilian(pen, F, {
        garment: "coveralls", coat: "#b8582a", trim: "#ffd08a", goggles: true, male: true, stubble: true,
        skin: "#f0c496", hair: "short", hairC: "#2a1a10", iris: "#3a2a1a", brow: "#2a1a10",
      });
    },
  },

  lyra: {
    tint: "#ffae3a",
    blinks: true,
    paint(pen, F) {
      civilian(pen, F, {
        garment: "coat", coat: "#3c3c5a", trim: "#ffaa44", visorBand: "#ffc070", badge: "#ffaa44",
        skin: "#f2cba8", hair: "long", hairC: "#3a2814", iris: "#c8761e", lashes: true, brow: "#2a1a0a", lip: "#c8675a",
      });
    },
  },

  voss: {
    tint: "#ff2a4a",
    blinks: true,
    paint(pen, F) {
      civilian(pen, F, {
        garment: "coat", coat: "#22283a", trim: "#5ad8ff", male: true, stern: true, age: true,
        skin: "#dcb896", hair: "short", front: "swept", hairC: "#c4ccd4", iris: "#5a96cc", brow: "#5a6674",
      });
    },
  },

  lord: {
    tint: "#ff2a4a",
    paint(pen, F) {
      const brass = "#b8862e";
      // Tattered mantle, then the arch of broken clocks behind his head.
      pen.part("M-2 101L2 82C10 72 26 66 50 65C74 66 90 72 98 82L102 101L92 96L86 101L78 95L70 101L30 101L22 95L14 101L8 96Z", "#4a1018", { depth: 5, rim: 2 });
      for (const [cx, cy, r] of [[22, 22, 8], [50, 8, 7], [78, 22, 8], [12, 44, 6], [88, 44, 6]]) {
        pen.part(ell(cx, cy, r, r), "#e8e0cc", { depth: 1.5, hi: 0.3 });
        pen.line(`M${cx} ${cy}L${cx} ${cy - r * 0.7}M${cx} ${cy}L${cx + r * 0.5} ${cy + r * 0.2}`, "#1a1410", 0.8);
        pen.line(`M${cx - r * 0.8} ${cy - r * 0.5}L${cx + r * 0.3} ${cy + r * 0.8}`, "#3a2a20", 0.6, 0.8);
      }
      pen.part(NECK, brass, { depth: 3 });
      pen.line("M46 52L46 70M54 52L54 70", "#5a3a14", 1);
      // The porcelain clock-face mask: ticks, hands, eyes burning red.
      pen.part("M35 38C35 23 42 17 50 17C58 17 65 23 65 38C65 50 60 59 50 62C40 59 35 50 35 38Z", "#f0eadc", { depth: 6, rim: 2.2, hi: 0.4 });
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const r0 = i % 3 === 0 ? 10.6 : 12;
        pen.line(`M${50 + Math.sin(a) * r0} ${39 - Math.cos(a) * r0 * 1.25}L${50 + Math.sin(a) * 13.2} ${39 - Math.cos(a) * 13.2 * 1.25}`, "#2a2018", 0.8, 0.8);
      }
      pen.line("M50 39L50 28M50 39L57 43", "#1a1410", 1.3);
      pen.line("M44 22L48 31L45 36", "#6a5a48", 0.6, 0.8);
      const lvl = [0.7, 0.88, 1][F.mouth];
      for (const s of [-1, 1]) {
        pen.fill(ell(50 + s * 6.4, 38, 3, 2), "#120406");
        pen.glow(ell(50 + s * 6.4, 38, 1.6, 1.1), "#ff2a3a", lvl, 4);
      }
      pen.fill(`M45 ${53 - F.mouth * 0.4}L55 ${53 - F.mouth * 0.4}L54 ${54.4 + F.mouth}L46 ${54.4 + F.mouth}Z`, "#120406", 0.85);
    },
  },

  squad: {
    tint: "#ffd24a",
    paint(pen, F) {
      plateTorso(pen, "#3a4a5e");
      pauldron(pen, "#4a5c72", "#ffd24a", { trimW: 1.2 });
      helmet(pen, F, {
        base: "#5a6e84",
        glow: "#ffd24a",
        dome: "M29.6 46C28 24 37 10 50 9.6C63 10 72 24 70.4 46L67.6 60C61.6 65 38.4 65 32.4 60Z",
        side: "M27.4 37.6L31.6 37.6L31.6 49.6L28.2 49.6Z",
        visor: "M32.4 35.4L67.6 35.4L66 45.6L50 49.6L34 45.6Z",
        slit: "M35 38.4L65 38.4L63.8 43L50 46.2L36.2 43Z",
        glint: "M36 36.8L52 36.8",
        jaw: "M36 49.6L50 53.4L64 49.6L62 60C56 63 44 63 38 60Z",
        ventY: 54.8,
        extra(pen) {
          pen.part(rect(49, 10.4, 2, 7), "#ffd24a", { flat: true, ink: 0.5 });
        },
      });
    },
  },

  nova: {
    tint: "#ff4488",
    paint(pen, F) {
      const pink = "#ff4488";
      pen.part(TORSO_SLIM, "#3a4656", { depth: 5, rim: 2.4 });
      pen.part("M35 63L65 63L67.4 72C59 76 41 76 32.6 72Z", "#2a3440", { depth: 2 });
      pen.part("M41 75C45.6 78 54.4 78 59 75L60 81.6C54.4 84.4 45.6 84.4 40 81.6Z", pink, { depth: 1.5, hi: 0.4 });
      // One pauldron, on her left.
      pen.part("M7 92C8 80 15.6 73.6 26 72.6L30.6 78C22 80.4 14 85.6 8.6 93.6Z", "#4a5868", { depth: 3 });
      helmet(pen, F, {
        base: "#8a9cb0",
        glow: pink,
        dome: "M31.6 46C30 26 38 12.6 50 12.2C62 12.6 70 26 68.4 46L65.4 58.6C60 63 40 63 34.6 58.6Z",
        side: null,
        visor: "M33 35.6L67 35.6L66 43.4L50 46.6L34 43.4Z",
        slit: "M35 37.6L65 37.6L64.4 41.4L50 44L35.6 41.4Z",
        glint: "M36.4 36.6L54 36.6",
        jaw: "M36.4 47.2L50 50.4L63.6 47.2L61.6 58C56 61 44 61 38.4 58Z",
        ventY: 51.8,
        extra(pen) {
          // The fin swept back off the crown, edged in her colour.
          pen.part("M47.6 13.4C54 6.6 64.6 5.6 75 11.6C65 12 58 14 52.4 18.6Z", "#8a9cb0", { depth: 1.5, hi: 0.4 });
          pen.line("M51.4 13.2C56.4 9.4 63.4 8.6 71.4 11", pink, 0.9);
        },
      });
    },
  },

  rook: {
    tint: "#44ff88",
    paint(pen, F) {
      const green = "#44ff88";
      // Pack frame behind him, its whip antenna, the tool arm over his shoulder.
      pen.part("M13 70L87 70L90 101L10 101Z", "#243040", { depth: 3 });
      pen.line("M20 70L12.4 4", "#8898a8", 1.2);
      pen.glow(ell(12.4, 4.6, 1.6, 1.6), green, 1, 4);
      pen.line("M78 70L87 52L97 58", "#9fb2c4", 5);
      pen.line("M78 70L87 52L97 58", "#4a5a6a", 3);
      pen.part(ell(87, 52, 2.6, 2.6), "#2a3440", { depth: 1, hi: 0.4 });
      plateTorso(pen, "#3a4a5a");
      pen.line("M30 80.6L70 80.6", green, 1.1, 0.9);
      for (const px of [24, 70]) pen.part(rect(px, 88, 7, 9), "#243040", { depth: 1, hi: 0.3 });
      pauldron(pen, "#4a5a6a", null);
      helmet(pen, F, {
        base: "#6a7c8e",
        glow: green,
        dome: "M30.6 46L30.6 22C30.6 15 37 11 44 11L56 11C63 11 69.4 15 69.4 22L69.4 46L65.6 60C58.6 64.4 41.4 64.4 34.4 60Z",
        side: "M27 30L30.6 30L30.6 44L27 44Z",
        visor: "M33 33L67 33L67 44.4L33 44.4Z",
        slit: "M35 36L65 36L65 41.6L35 41.6Z",
        glint: "M36 34.4L52 34.4",
        jaw: "M35.4 47.6L64.6 47.6L62.6 60C56 63 44 63 37.4 60Z",
        ventY: 52.6,
        extra(pen, F) {
          pen.part(rect(69.4, 24, 6, 14), "#4a5a6a", { depth: 1, hi: 0.3 });
          pen.glow(ell(72.4, 27.4, 0.9, 0.9), green, F.mouth ? 1 : 0.7, 3);
        },
      });
    },
  },

  pa: {
    tint: "#9fb4c8",
    paint(pen, F) {
      const t = pen.tint;
      // The station's wall speaker: bracket, housing, grille, the Bureau's clock.
      pen.part("M42 74L58 74L60 101L40 101Z", "#2a323c", { depth: 3 });
      pen.part(ell(50, 44, 31, 31), "#3a4450", { depth: 5, rim: 2.4, hi: 0.35 });
      pen.part(ell(50, 44, 25, 25), "#1a2028", { depth: 3, hi: 0.2 });
      const lvl = [0.35, 0.7, 1][F.mouth];
      for (const r of [8, 13, 18, 23]) pen.glowLine(ell(50, 44, r, r), t, 1.2, lvl * (1 - r / 40), 3);
      pen.part(ell(50, 44, 6.4, 6.4), "#c8d0d8", { depth: 1, hi: 0.4 });
      pen.line("M50 44L50 39.6M50 44L53.2 45.6", "#1a1a1a", 0.9);
      for (const [bx, by] of [[22, 20], [78, 20], [22, 68], [78, 68]]) pen.part(ell(bx, by, 1.4, 1.4), "#8a96a4", { flat: true, ink: 0.5 });
    },
  },

  unknown: {
    tint: "#8a96a8",
    paint(pen) {
      pen.part(TORSO, "#141820", { depth: 4, rim: 2.6, hi: 0 });
      pen.part(NECK, "#10141a", { depth: 2, hi: 0 });
      pen.part(FACE_M, "#181c24", { depth: 5, rim: 2.6, hi: 0 });
      pen.part("M34.6 40C33 22 41 15 50 15C59 15 67 22 65.4 40C62 28 56 25 50 25C44 25 38 28 34.6 40Z", "#0e1016", { depth: 2, rim: 1.6, hi: 0 });
    },
  },
};

/** Which bust a printed speaker label gets. */
export function portraitIdFor(speaker) {
  const s = String(speaker || "ARIA").toUpperCase();
  const has = (w) => new RegExp(`(^|[^A-Z])${w}([^A-Z]|$)`).test(s);
  if (has("ARIA")) return "aria";
  if (has("SUPERVISOR") || has("SIMON")) return "simon";
  if (has("RASCZAK")) return "rasczak";
  if (has("KAEL")) return "kael";
  if (has("ORR")) return "orr";
  if (has("LIN")) return "lin";
  if (has("VALE")) return "vale";
  if (has("LYRA")) return "lyra";
  if (has("NOVA")) return "nova";
  if (has("ROOK")) return "rook";
  if (has("VOSS")) return "voss";
  if (has("LORD") || has("PARADOX")) return "lord";
  if (has("MIRI")) return "miri";
  if (has("KAI")) return "kai";
  if (has("SQUAD")) return "squad";
  if (s === "STAFF_M") return "staffM";
  if (has("STAFF")) return "staff";
  if (/^(PA|SYSTEMS?|SISTEMA|WARNING|AVISO|ERROR|FINAL TIMELINE)$/.test(s)) return "pa";
  if (has("UNKNOWN")) return "unknown";
  return "officer";
}

/**
 * Whether a line comes over the air (and so gets the static): an explicit
 * `radio` on the line, a log or recording, or a voice with the radio band.
 */
export function isRadioLine(msg) {
  if (!msg) return false;
  if (msg.radio != null) return !!msg.radio;
  const s = String(msg.speaker || "").toUpperCase();
  if (/\(LOG\)|RECORDED|UNKNOWN/.test(s)) return true;
  const key = msg.voice ?? voiceKeyFor({ speaker: msg.speaker || "ARIA" });
  return !!VOICES[key]?.radio;
}

// ─── Sprite cache ──────────────────────────────────────────────────────────

const _sprites = new Map();
const MAX_SPRITES = 160;
const PAD = 2;

function cached(key, w, h, dpr, paint) {
  let c = _sprites.get(key);
  if (c) {
    // Most recently used goes to the back of the eviction line.
    _sprites.delete(key);
    _sprites.set(key, c);
    return c;
  }
  c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w * dpr));
  c.height = Math.max(1, Math.ceil(h * dpr));
  paint(c.getContext("2d"), c);
  if (_sprites.size >= MAX_SPRITES) _sprites.delete(_sprites.keys().next().value);
  _sprites.set(key, c);
  return c;
}

/** How many portrait bitmaps are cached (for tests and the perf overlay). */
export function portraitCacheSize() {
  return _sprites.size;
}

function cutPath(g, x, y, w, h, k) {
  g.beginPath();
  g.moveTo(x + k, y);
  g.lineTo(x + w, y);
  g.lineTo(x + w, y + h - k);
  g.lineTo(x + w - k, y + h);
  g.lineTo(x, y + h);
  g.lineTo(x, y + k);
  g.closePath();
}

/** The inner well's outline per finish, in sprite units (origin at the well). */
function wellPath(g, style, s) {
  const k = 6 * (s / 40);
  if (style === "legacy") {
    g.beginPath();
    g.roundRect(0, 0, s, s, 4);
  } else if (style === "real") cutPath(g, 1, 1, s - 2, s - 2, k - 1);
  else cutPath(g, 0, 0, s, s, k);
}

function backdrop(g, style, tint, holo) {
  const real = style === "real";
  const t = real ? grade(tint, 0.6) : tint;
  const bg = g.createLinearGradient(0, 0, 0, 100);
  if (real) {
    bg.addColorStop(0, "#161b20");
    bg.addColorStop(1, "#06080a");
  } else if (style === "legacy") {
    bg.addColorStop(0, "#06202e");
    bg.addColorStop(1, "#020a10");
  } else {
    bg.addColorStop(0, holo ? "#0a2a36" : "#1a2c40");
    bg.addColorStop(1, "#060a11");
  }
  g.fillStyle = bg;
  g.fillRect(-2, -2, 104, 104);
  const glow = g.createRadialGradient(64, 34, 0, 64, 34, 66);
  glow.addColorStop(0, alpha(t, real ? 0.26 : 0.42));
  glow.addColorStop(1, alpha(t, 0));
  g.fillStyle = glow;
  g.fillRect(-2, -2, 104, 104);
  if (style === "comic") {
    // Halftone in the tint, growing toward the lower right.
    g.fillStyle = alpha(tint, 0.2);
    for (let y = 2; y < 100; y += 5) {
      for (let x = 2 + ((y / 5) % 2) * 2.5; x < 100; x += 5) {
        const r = 0.25 + ((x + y) / 200) * 1.1;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  if (holo) {
    // Projector grid and the beam rising from below.
    g.strokeStyle = alpha(tint, 0.12);
    g.lineWidth = 0.5;
    for (let i = 0; i <= 100; i += 10) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, 100);
      g.moveTo(0, i);
      g.lineTo(100, i);
      g.stroke();
    }
    const beam = g.createLinearGradient(0, 100, 0, 40);
    beam.addColorStop(0, alpha(tint, real ? 0.22 : 0.35));
    beam.addColorStop(1, alpha(tint, 0));
    g.fillStyle = beam;
    g.fillRect(-2, 40, 104, 62);
  }
}

/** Seeded noise so grain and static never repaint differently. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function finish(g, style, tint, holo, s, dpr) {
  // In device pixels from here (the sprite's own scale).
  g.setTransform(dpr, 0, 0, dpr, PAD * dpr, PAD * dpr);
  if (holo) {
    g.fillStyle = alpha(tint, style === "real" ? 0.1 : 0.16);
    for (let y = 0; y < s; y += 2) g.fillRect(0, y, s, 0.7);
  } else if (style === "comic") {
    g.fillStyle = "rgba(0,0,0,0.1)";
    for (let y = 0; y < s; y += 2) g.fillRect(0, y, s, 1);
  }
  if (style === "real") {
    const key = g.createLinearGradient(0, 0, s, s);
    key.addColorStop(0, "rgba(255,244,230,0.08)");
    key.addColorStop(0.5, "rgba(0,0,0,0)");
    key.addColorStop(1, "rgba(0,0,0,0.42)");
    g.fillStyle = key;
    g.fillRect(0, 0, s, s);
    const vig = g.createRadialGradient(s * 0.5, s * 0.45, s * 0.25, s * 0.5, s * 0.5, s * 0.78);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.38)");
    g.fillStyle = vig;
    g.fillRect(0, 0, s, s);
    // Baked grain; a moving layer goes on per frame.
    const r = rng(hashOf(tint) ^ s);
    const n = Math.round(s * s * 0.35);
    for (let i = 0; i < n; i++) {
      const v = r();
      g.fillStyle = v > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.09)";
      g.fillRect(r() * s, r() * s, 0.6, 0.6);
    }
  }
}

function frameBezel(g, style, tone, s) {
  const k = 6 * (s / 40);
  if (style === "comic") {
    g.strokeStyle = alpha(tone, 0.6);
    g.lineWidth = 1;
    cutPath(g, 1.5, 1.5, s - 3, s - 3, k - 1);
    g.stroke();
  } else if (style === "real") {
    g.strokeStyle = "rgba(222,230,228,0.34)";
    g.lineWidth = 1;
    cutPath(g, 0.5, 0.5, s - 1, s - 1, k - 0.5);
    g.stroke();
  } else {
    g.strokeStyle = alpha(tone, 0.6);
    g.lineWidth = 1;
    g.beginPath();
    g.roundRect(0.5, 0.5, s - 1, s - 1, 4);
    g.stroke();
  }
}

/** Paint one character's bust (no bezel) into a 100-unit box scaled to `s`. */
function paintBust(g, id, style, s, dpr, F, variant) {
  const ch = CAST[id];
  g.save();
  g.scale(s / 100, s / 100);
  backdrop(g, style, ch.tint, ch.holo);
  const pen = new Pen(g, style, ch.tint, (s / 100) * dpr);
  ch.paint(pen, F, variant);
  g.restore();
}

/**
 * The cached bitmap for one frame of a bust. `frame`: 0 shut, 1 half, 2 open,
 * 3 blink. The sprite is (size + 4) square with the well inset by 2.
 */
function bustSprite(id, style, size, dpr, frame, tone, variant) {
  const key = `${id}:${variant}|${style}|${size}|${dpr}|${frame}|${tone}`;
  const box = size + PAD * 2;
  return cached(key, box, box, dpr, (g) => {
    const F = { mouth: frame === 3 ? 0 : frame, blink: frame === 3 };
    const holo = CAST[id].holo;
    g.setTransform(dpr, 0, 0, dpr, PAD * dpr, PAD * dpr);
    if (style === "comic") {
      g.fillStyle = INK;
      cutPath(g, -1.5, -1.5, size + 3, size + 3, 6 * (size / 40) + 1);
      g.fill();
    }
    g.save();
    wellPath(g, style, size);
    g.clip();
    if (style === "legacy") {
      // Painted small and blown up: chunky pixels like the rest of Legacy.
      const lo = Math.max(16, Math.round(size * 0.5));
      const tmp = document.createElement("canvas");
      tmp.width = lo;
      tmp.height = lo;
      paintBust(tmp.getContext("2d"), id, "legacy", lo, 1, F, variant);
      g.imageSmoothingEnabled = false;
      g.drawImage(tmp, 0, 0, size, size);
      g.imageSmoothingEnabled = true;
      if (holo) {
        g.fillStyle = alpha(CAST[id].tint, 0.12);
        for (let y = 0; y < size; y += 2) g.fillRect(0, y, size, 1);
      }
    } else {
      paintBust(g, id, style, size, dpr, F, variant);
      finish(g, style, CAST[id].tint, holo, size, dpr);
    }
    g.restore();
    g.setTransform(dpr, 0, 0, dpr, PAD * dpr, PAD * dpr);
    frameBezel(g, style, tone, size);
  });
}

/** The well filled flat: the speaking pulse draws it with "lighter". */
function flashSprite(style, size, dpr) {
  const box = size + PAD * 2;
  return cached(`flash|${style}|${size}|${dpr}`, box, box, dpr, (g) => {
    g.setTransform(dpr, 0, 0, dpr, PAD * dpr, PAD * dpr);
    wellPath(g, style, size);
    g.fillStyle = "#ffffff";
    g.fill();
  });
}

/** Monochrome noise tiles: radio static, and Realistic's moving grain. */
function noiseSprite(size, dpr, i) {
  return cached(`noise|${size}|${dpr}|${i}`, size, size, dpr, (g, c) => {
    const img = g.createImageData(c.width, c.height);
    const r = rng(9001 + i * 7919);
    const d = img.data;
    for (let p = 0; p < d.length; p += 4) {
      const v = r();
      const lum = v > 0.5 ? 255 : 0;
      d[p] = d[p + 1] = d[p + 2] = lum;
      d[p + 3] = Math.round(Math.pow(r(), 3) * 255);
    }
    g.putImageData(img, 0, 0);
  });
}

/** A soft horizontal band that rolls down ARIA's feed. */
function bandSprite(size, dpr, tint) {
  return cached(`band|${size}|${dpr}|${tint}`, size, size * 0.3, dpr, (g, c) => {
    const grad = g.createLinearGradient(0, 0, 0, c.height);
    grad.addColorStop(0, alpha(tint, 0));
    grad.addColorStop(0.5, alpha(tint, 0.35));
    grad.addColorStop(1, alpha(tint, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);
  });
}

// ─── Per frame ─────────────────────────────────────────────────────────────

/** Mouth shape for this instant while talking: a syllable-ish rhythm. */
function mouthAt(t, seed) {
  const v = Math.sin(t * 15.3 + seed) * 0.6 + Math.sin(t * 8.9 + seed * 1.7) * 0.4;
  return v > 0.32 ? 2 : v > -0.3 ? 1 : 0;
}

/**
 * Draw a speaker's portrait with its well at (x, y), `size` square.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ speaker: string, x: number, y: number, size: number, style: "comic"|"real"|"legacy",
 *   tone: string, t: number, speaking?: boolean, radio?: boolean, dpr?: number }} o
 */
export function drawCommsPortrait(ctx, o) {
  const { speaker, x, y, size, style, tone, t } = o;
  const dpr = o.dpr ?? 1;
  const id = portraitIdFor(speaker);
  const ch = CAST[id];
  const seed = (hashOf(String(speaker)) % 1000) / 100;
  const variant = id === "officer" ? hashOf(String(speaker)) % 997 : 0;

  let frame = 0;
  if (o.speaking) frame = mouthAt(t, seed);
  if (ch.blinks && frame === 0 && (t + seed) % 3.7 < 0.13) frame = 3;

  const a0 = ctx.globalAlpha;
  let a = a0;
  let glitch = false;
  if (ch.holo) {
    // ARIA's feed: a fast shimmer, and now and then the signal dips.
    a *= 0.9 + 0.08 * Math.sin(t * 23) * Math.sin(t * 3.1);
    glitch = (t * 0.83 + seed) % 1 < 0.035;
    if (glitch) a *= 0.62;
  }
  const sprite = bustSprite(id, style, size, dpr, frame, tone, variant);
  const box = size + PAD * 2;
  ctx.globalAlpha = a;
  ctx.drawImage(sprite, x - PAD, y - PAD, box, box);

  const radio = !!o.radio;
  const tear = radio && (t * 1.9 + seed) % 1 < 0.06;
  if (!o.speaking && !ch.holo && !radio && style !== "real") {
    ctx.globalAlpha = a0;
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 1, y + 1, size - 2, size - 2);
  ctx.clip();

  if (o.speaking) {
    // The face brightens with the voice.
    ctx.globalCompositeOperation = "lighter";
    const flash = flashSprite(style, size, dpr);
    ctx.globalAlpha = a0 * (0.035 + 0.05 * frame / 2);
    ctx.drawImage(flash, x - PAD, y - PAD, box, box);
    ctx.globalCompositeOperation = "source-over";
  }

  if (ch.holo) {
    const band = bandSprite(size, dpr, ch.tint);
    const by = y - size * 0.3 + ((t * 0.45) % 1) * size * 1.3;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = a0 * 0.55;
    ctx.drawImage(band, x, by, size, size * 0.3);
    if (glitch) {
      // Chromatic split while the signal dips.
      ctx.globalAlpha = a0 * 0.35;
      ctx.drawImage(sprite, x - PAD + 1.5, y - PAD, box, box);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  if (radio || style === "real") {
    const tile = noiseSprite(size, dpr, Math.floor(t * 18) % 3);
    ctx.globalAlpha = a0 * (radio ? (style === "real" ? 0.2 : 0.26) : 0.07);
    ctx.drawImage(tile, x, y, size, size);
  }

  if (radio) {
    // A bar of interference rolling down, and now and then the picture tears.
    const ry = y + ((t * 0.7 + seed) % 1) * size;
    ctx.globalAlpha = a0 * 0.22;
    ctx.fillStyle = "#e8f4ff";
    ctx.fillRect(x, ry, size, 1.5);
    if (tear) {
      const ty = Math.floor(((Math.floor(t * 30) * 37) % 100) / 100 * size * 0.8);
      const th = Math.max(3, Math.round(size * 0.14));
      const shift = (Math.floor(t * 40) % 2 ? 1 : -1) * Math.max(2, size * 0.07);
      ctx.globalAlpha = a0;
      ctx.drawImage(sprite, PAD * dpr, (PAD + ty) * dpr, size * dpr, th * dpr, x + shift, y + ty, size, th);
    }
  }
  ctx.restore();
  ctx.globalAlpha = a0;
}

/** Paint every frame of a bust ahead of time (the plate never stalls on one). */
export function warmCommsPortrait(speaker, style, size, tone, dpr = 1) {
  const id = portraitIdFor(speaker);
  const variant = id === "officer" ? hashOf(String(speaker)) % 997 : 0;
  for (let f = 0; f < (CAST[id].blinks ? 4 : 3); f++) bustSprite(id, style, size, dpr, f, tone, variant);
}

/** Every bust id, for the contact sheet and tests. */
export const PORTRAIT_IDS = Object.keys(CAST);
