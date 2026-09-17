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

export const sh = (d, fill, w = 1.3, extra = "") =>
  `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"${extra}/>`;
export const ln = (d, color, w, op = 1) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-opacity="${op}" stroke-linecap="round" stroke-linejoin="round"/>`;
export const circ = (x, y, r, fill, w = 1.3, extra = "") =>
  `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${w ? ` stroke="${INK}" stroke-width="${w}"` : ""}${extra}/>`;
export const ell = (x, y, rx, ry, fill, w = 1.3, extra = "") =>
  `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${w ? ` stroke="${INK}" stroke-width="${w}"` : ""}${extra}/>`;
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
