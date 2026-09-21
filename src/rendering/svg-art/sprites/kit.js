/**
 * Shared SVG building blocks for in-world billboard sprites.
 *
 * Sprite units: the enemy's sprite column is 200×200 units centred on the
 * projection centre, so x ∈ [-100, 100] spans the column width and y = +100 is
 * the floor line. Everything here returns plain markup strings; nothing runs
 * per frame.
 */

export const INK = "#04060b";

export const f = (n) => Math.round(n * 10) / 10;
export const P = (x, y) => `${f(x)} ${f(y)}`;

/** Point `len` from p, `deg` degrees off straight down (positive swings toward screen right). */
export function polar(p, deg, len) {
  const r = (deg * Math.PI) / 180;
  return [p[0] + Math.sin(r) * len, p[1] + Math.cos(r) * len];
}

/** Heading of a→b in polar's convention. */
export const heading = (a, b) => (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180) / Math.PI;

export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Blend two #rrggbb colours (t = 0 → a, 1 → b). */
export function mix(a, b, t) {
  const A = hex(a);
  const B = hex(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

/** Tapered capsule outline from joint a (width wa) to joint b (width wb). */
export function capsule(a, b, wa, wb) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const nx = -(b[1] - a[1]) / len;
  const ny = (b[0] - a[0]) / len;
  const ra = wa / 2;
  const rb = wb / 2;
  return (
    `M${P(a[0] + nx * ra, a[1] + ny * ra)}L${P(b[0] + nx * rb, b[1] + ny * rb)}` +
    `A${f(rb)} ${f(rb)} 0 0 0 ${P(b[0] - nx * rb, b[1] - ny * rb)}` +
    `L${P(a[0] - nx * ra, a[1] - ny * ra)}A${f(ra)} ${f(ra)} 0 0 0 ${P(a[0] + nx * ra, a[1] + ny * ra)}Z`
  );
}

/** Closed polygon path from [[x, y], …]. */
export const poly = (pts) => "M" + pts.map((p) => P(p[0], p[1])).join("L") + "Z";

/** Point list transformed by rotation (deg) about origin o, then offset. */
export function rot(pts, deg, o = [0, 0], off = [0, 0]) {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return pts.map(([x, y]) => {
    const dx = x - o[0];
    const dy = y - o[1];
    return [o[0] + dx * c - dy * s + off[0], o[1] + dx * s + dy * c + off[1]];
  });
}

/* ── Realistic build mode ─────────────────────────────────────────────────
 * While `withRealisticBuild` runs, the primitives below emit the Realistic
 * look instead of the comic one: no ink outlines (a part's edge is a soft,
 * darker band of its own colour), muted speculars, and `lit` swaps the ink
 * ring and rim light for key/fill shading, edge occlusion and surface wear.
 * Outside it every function returns exactly the Modern markup.
 */
let REAL = false;

/** Run `fn` with the primitives in Realistic mode (build time only, never per frame). */
export function withRealisticBuild(fn) {
  const prev = REAL;
  REAL = true;
  try {
    return fn();
  } finally {
    REAL = prev;
  }
}

/** Edge of a solid part in Realistic mode: a darker band of its own colour. */
function edge(fill, w) {
  if (fill === "none") return ` stroke="#1b1e23" stroke-width="${f(w)}"`;
  if (fill[0] === "#" && fill.length === 7) return ` stroke="${mix(fill, "#000000", 0.45)}" stroke-width="${f(w * 0.7)}"`;
  return ` stroke="#000" stroke-opacity=".32" stroke-width="${f(w * 0.7)}"`;
}

export const sh = (d, fill, w = 1.3, extra = "") =>
  REAL
    ? `<path d="${d}" fill="${fill}"${w ? edge(fill, w) : ""} stroke-linejoin="round"${extra}/>`
    : `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"${extra}/>`;
export const ln = (d, color, w, op = 1) =>
  REAL && color === INK
    ? `<path d="${d}" fill="none" stroke="#000" stroke-width="${w}" stroke-opacity="${f(op * 0.45 * 100) / 100}" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-opacity="${op}" stroke-linecap="round" stroke-linejoin="round"/>`;
export const circ = (x, y, r, fill, w = 1.3, extra = "") =>
  `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${w ? (REAL ? edge(fill, w) : ` stroke="${INK}" stroke-width="${w}"`) : ""}${extra}/>`;
export const ell = (x, y, rx, ry, fill, w = 1.3, extra = "") =>
  `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${w ? (REAL ? edge(fill, w) : ` stroke="${INK}" stroke-width="${w}"`) : ""}${extra}/>`;
export const limb = (a, b, wa, wb, fill, w = 1.3) => sh(capsule(a, b, wa, wb), fill, w);

/** Four-tone material gradient lit from the upper left. */
export function material(id, hi, mid, low, deep) {
  return (
    `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2=".45">` +
    `<stop offset="0" stop-color="${hi}"/><stop offset=".22" stop-color="${mid}"/>` +
    `<stop offset=".58" stop-color="${low}"/><stop offset="1" stop-color="${deep}"/></linearGradient>`
  );
}

/** Materials derived from a type's two palette colours. */
export function paletteMaterials(prefix, c1, c2) {
  return (
    material(prefix, mix(c1, "#ffffff", 0.4), c1, mix(c1, c2, 0.55), mix(c2, "#000000", 0.35)) +
    material(`${prefix}Dk`, mix(c1, c2, 0.4), mix(c2, "#000000", 0.05), mix(c2, "#000000", 0.45), "#07080c")
  );
}

export const BASE_MATERIALS =
  material("steel", "#a9bfd2", "#6f8aa3", "#3a4d61", "#161f29") +
  material("gun", "#6b7684", "#39424e", "#1c222b", "#0a0d11") +
  material("cloth", "#454b55", "#2a2f37", "#171a20", "#0a0b0e") +
  material("brass", "#f6dc98", "#bf9244", "#6e4f1e", "#241808") +
  material("glass", "#cfe9ff", "#4a6d8a", "#1b2c3c", "#0a121a");

/** Filters and the key-light wash, sized to the sprite box. */
export function baseDefs(box) {
  const [x, y, w, h] = box;
  const R = `filterUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"`;
  return (
    `<filter id="wht" ${R}><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/></filter>` +
    `<filter id="blk" ${R}><feColorMatrix type="matrix" values="0 0 0 0 0.016 0 0 0 0 0.024 0 0 0 0 0.043 0 0 0 1 0"/></filter>` +
    `<filter id="gb" ${R}><feGaussianBlur stdDeviation="2.4"/></filter>` +
    `<filter id="gb2" ${R}><feGaussianBlur stdDeviation="6"/></filter>` +
    `<filter id="ao" ${R}><feGaussianBlur stdDeviation="1.6"/></filter>` +
    `<linearGradient id="shade" gradientUnits="userSpaceOnUse" x1="${f(x + w * 0.2)}" y1="${f(y)}" x2="${f(x + w * 0.8)}" y2="${f(y + h)}">` +
    `<stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/>` +
    `<stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient>`
  );
}

/**
 * Wrap a figure with the house lighting: a heavy ink silhouette outline (reads
 * at 40px), a key-light/shadow wash clipped to the silhouette, and a coloured
 * rim on the right and top edges.
 */
export function lit(content, box, rim, o = {}) {
  if (REAL) return litReal(content, box);
  const { ink = 2, rimX = 3, rimY = 2.4, rimOp = 0.95 } = o;
  const [x, y, w, h] = box;
  const R = `x="${x}" y="${y}" width="${w}" height="${h}"`;
  let outline = "";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    outline += `<use href="#c" filter="url(#blk)" transform="translate(${f(Math.cos(a) * ink)} ${f(Math.sin(a) * ink)})"/>`;
  }
  return (
    `<defs><g id="c">${content}</g>` +
    `<mask id="sil" maskUnits="userSpaceOnUse" ${R}><use href="#c" filter="url(#wht)"/></mask>` +
    `<mask id="rim" maskUnits="userSpaceOnUse" ${R}><use href="#c" filter="url(#wht)"/>` +
    `<use href="#c" filter="url(#blk)" transform="translate(${-rimX} ${rimY})"/></mask></defs>` +
    outline +
    `<use href="#c"/>` +
    `<rect ${R} fill="url(#shade)" mask="url(#sil)"/>` +
    `<rect ${R} fill="${rim}" opacity="${rimOp}" mask="url(#rim)"/>`
  );
}

/**
 * Realistic counterpart of `lit` (needs `realDefs`): the figure with its
 * paint muted, a key light from above-left falling off toward the floor,
 * occlusion soaking into the silhouette edge away from the key, and fine
 * grime over every surface. No outline ring, no rim light.
 */
function litReal(content, box) {
  const [x, y, w, h] = box;
  const R = `x="${x}" y="${y}" width="${w}" height="${h}"`;
  return (
    `<defs><g id="c">${content}</g>` +
    `<mask id="sil" maskUnits="userSpaceOnUse" ${R}><use href="#c" filter="url(#wht)"/></mask></defs>` +
    `<use href="#c" filter="url(#rsat)"/>` +
    `<use href="#c" filter="url(#rwear)" opacity=".26"/>` +
    `<rect ${R} fill="url(#rkey)" mask="url(#sil)"/>` +
    `<rect ${R} fill="url(#rfall)" mask="url(#sil)"/>` +
    `<use href="#c" filter="url(#redge)"/>`
  );
}

/** Extra <defs> the Realistic `lit` needs, sized to the sprite box. Append to `baseDefs(box)`. */
export function realDefs(box) {
  const [x, y, w, h] = box;
  const R = `filterUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"`;
  return (
    `<filter id="rsat" ${R}><feColorMatrix type="saturate" values=".7"/></filter>` +
    // Occlusion band inside the silhouette, biased to the lower right (away
    // from the key) by offsetting the blurred alpha up and to the left.
    `<filter id="redge" ${R}><feGaussianBlur in="SourceAlpha" stdDeviation="2.4"/><feOffset dx="-1.4" dy="-1.8" result="b"/>` +
    `<feComposite in="SourceAlpha" in2="b" operator="arithmetic" k2="1" k3="-1"/>` +
    `<feColorMatrix type="matrix" values="0 0 0 0 .02 0 0 0 0 .02 0 0 0 0 .03 0 0 0 .8 0"/></filter>` +
    // Grime and wear: fractal noise thresholded into speckle and blotches.
    `<filter id="rwear" ${R}><feTurbulence type="fractalNoise" baseFrequency=".32" numOctaves="3" seed="11"/>` +
    `<feColorMatrix type="matrix" values="0 0 0 0 .07 0 0 0 0 .055 0 0 0 0 .04 -2.6 0 0 0 1.45"/>` +
    `<feComposite in2="SourceAlpha" operator="in"/></filter>` +
    `<linearGradient id="rkey" gradientUnits="userSpaceOnUse" x1="${f(x + w * 0.15)}" y1="${f(y)}" x2="${f(x + w * 0.85)}" y2="${f(y + h * 0.8)}">` +
    `<stop offset="0" stop-color="#fff4e4" stop-opacity=".16"/><stop offset=".38" stop-color="#fff4e4" stop-opacity="0"/>` +
    `<stop offset=".52" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".46"/></linearGradient>` +
    `<linearGradient id="rfall" gradientUnits="userSpaceOnUse" x1="0" y1="${f(y)}" x2="0" y2="${f(y + h)}">` +
    `<stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".5" stop-color="#000" stop-opacity=".04"/>` +
    `<stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>`
  );
}

/** Material with a narrow specular band (metal, gloss paint) instead of a broad highlight. */
function sheen(id, base, spec, low, deep, at = 0.12) {
  return (
    `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2=".45">` +
    `<stop offset="0" stop-color="${mix(base, low, 0.2)}"/><stop offset="${f(at - 0.06)}" stop-color="${base}"/>` +
    `<stop offset="${f(at)}" stop-color="${spec}"/><stop offset="${f(at + 0.08)}" stop-color="${base}"/>` +
    `<stop offset=".6" stop-color="${low}"/><stop offset="1" stop-color="${deep}"/></linearGradient>`
  );
}

/** Realistic base materials under the same ids as BASE_MATERIALS. */
export const REAL_BASE_MATERIALS =
  sheen("steel", "#7a848e", "#c9cfd4", "#3c444c", "#15191d") +
  sheen("gun", "#40444a", "#80868c", "#212428", "#0b0c0e", 0.14) +
  material("cloth", "#3e4146", "#303338", "#1e2024", "#111214") +
  sheen("brass", "#8c7447", "#d8c79a", "#4f3f22", "#1c150b") +
  `<linearGradient id="glass" x1="0" y1="0" x2="1" y2=".7"><stop offset="0" stop-color="#8a9aa6"/><stop offset=".18" stop-color="#3a4854"/>` +
  `<stop offset=".2" stop-color="#b4c0c8"/><stop offset=".24" stop-color="#2c3842"/><stop offset="1" stop-color="#10161b"/></linearGradient>`;

/** Realistic palette materials: painted armour with a satin sheen, not a comic ramp. */
export function realPaletteMaterials(prefix, c1, c2) {
  const base = mix(c1, "#6a6d70", 0.22);
  const dk = mix(mix(c1, c2, 0.5), "#44464a", 0.3);
  return (
    sheen(prefix, base, mix(base, "#ffffff", 0.3), mix(base, "#000000", 0.42), mix(c2, "#000000", 0.72), 0.16) +
    sheen(`${prefix}Dk`, mix(dk, "#000000", 0.15), mix(dk, "#ffffff", 0.15), mix(dk, "#000000", 0.55), "#08090b", 0.16)
  );
}

/** Emissive markup: a soft bloom copy under the crisp shapes. */
export const glow = (m, wide = false) => `<g filter="url(#${wide ? "gb2" : "gb"})">${m}</g>${m}`;

/** Round-edged glowing slit / bar (visors, eyes). */
export const bar = (x, y, w, h, fill) =>
  `<rect x="${f(x - w / 2)}" y="${f(y - h / 2)}" width="${f(w)}" height="${f(h)}" rx="${f(Math.min(w, h) / 2)}" fill="${fill}"/>`;

/** Starburst muzzle flash centred at (x, y). */
export function flash(x, y, r, color, core = "#ffffff") {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const k = i % 2 ? 0.38 : i % 4 ? 0.75 : 1;
    pts.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k]);
  }
  return `<path d="${poly(pts)}" fill="${color}"/>` + circ(x, y, r * 0.34, core, 0);
}

/** Soft ambient-occlusion blot where parts meet (neck, armpits, belt, knees). */
export const ao = (x, y, rx, ry, op = 0.45) =>
  `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="#000" opacity="${REAL ? f(Math.min(0.75, op * 1.3) * 100) / 100 : op}" filter="url(#ao)"/>`;

/** Specular strip along a lit edge (Realistic: a fainter, narrower, warm glint). */
export const spec = (d, op = 0.55, w = 1.1) => (REAL ? ln(d, "#fff3e2", f(w * 0.7 * 10) / 10, f(op * 0.5 * 100) / 100) : ln(d, "#ffffff", w, op));

/** Hanging cable from a to b with sag, inked with a thin highlight. */
export function cable(a, b, sag = 6, color = "#1c2027", w = 2) {
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag];
  const d = `M${P(a[0], a[1])}Q${P(m[0], m[1])} ${P(b[0], b[1])}`;
  const dh = `M${P(a[0] - 0.4, a[1] - 0.6)}Q${P(m[0] - 0.4, m[1] - 0.6)} ${P(b[0] - 0.4, b[1] - 0.6)}`;
  return ln(d, INK, w + 1.6) + ln(d, color, w) + ln(dh, "#9aa6b4", 0.6, 0.45);
}

/** Polygon plate with a specular strip on its first (upper-left) edge. */
export function plate(pts, fill, w = 1.3, hi = 0.5) {
  const [a, b] = pts;
  const inset = (p, q) => [p[0] + (q[0] - p[0]) * 0.12, p[1] + (q[1] - p[1]) * 0.12 + 1.2];
  const s0 = inset(a, b);
  const s1 = inset(b, a);
  return sh(poly(pts), fill, w) + (hi ? spec(`M${P(s0[0], s0[1])}L${P(s1[0], s1[1])}`, hi) : "");
}

/** Ring of `n` glyph ticks (runes, dial marks) around (x, y). */
export function glyphRing(x, y, r, n, color, w = 1.2, len = 3) {
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    d += `M${P(x + c * r, y + s * r)}L${P(x + c * (r + len), y + s * (r + len))}`;
    if (i % 3 === 0) d += `M${P(x + c * (r + len + 1.5) - s * 1.5, y + s * (r + len + 1.5) + c * 1.5)}l${f(s * 3)} ${f(-c * 3)}`;
  }
  return ln(d, color, w);
}
