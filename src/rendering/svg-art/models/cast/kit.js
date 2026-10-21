/**
 * Shared painting kit for the supporting cast (../cast.js, ./aria.js): SVG
 * gradient and path helpers, the lighting overlays every figure is finished
 * with, and the head every human face is built on. Art units; key light from
 * the upper left, a cool fill from the right, rim light on the right edge.
 */

export const INK = "#04060b";

/** Round to one decimal so the markup stays compact. */
export const r1 = (n) => Math.round(n * 10) / 10;

export function stops(list) {
  return list
    .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined ? "" : ` stop-opacity="${a}"`}/>`)
    .join("");
}

export const lin = (id, list, x1 = 0, y1 = 0, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(list)}</linearGradient>`;

export const rad = (id, list, cx = 0.5, cy = 0.5, r = 0.5) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops(list)}</radialGradient>`;

export const blur = (id, sd) =>
  `<filter id="${id}" filterUnits="userSpaceOnUse" x="-300" y="-300" width="600" height="600"><feGaussianBlur stdDeviation="${sd}"/></filter>`;

export const at = (x, y, s, markup) => `<g transform="translate(${x} ${y}) scale(${s})">${markup}</g>`;

/** Mirror an absolute M/L/C/Q path across x = 0. */
export function mir(d) {
  let i = 0;
  return d.replace(/-?\d*\.?\d+/g, (n) => (i++ % 2 === 0 ? String(r1(-parseFloat(n))) : n));
}

const hexRgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** Blend two hex colours; t = 0 → a, 1 → b. */
export function mix(a, b, t) {
  const x = hexRgb(a);
  const y = hexRgb(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** Smooth tapered limb through [x, y, width] points, as a closed path. */
export function limb(pts) {
  const n = pts.length;
  const L = [];
  const R = [];
  for (let i = 0; i < n; i++) {
    const [x, y, w] = pts[i];
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    L.push([x + (nx * w) / 2, y + (ny * w) / 2]);
    R.push([x - (nx * w) / 2, y - (ny * w) / 2]);
  }
  const P = (q) => `${r1(q[0])},${r1(q[1])}`;
  const run = (Q) => {
    let d = "";
    for (let i = 1; i < Q.length - 1; i++) {
      d += ` Q${P(Q[i])} ${r1((Q[i][0] + Q[i + 1][0]) / 2)},${r1((Q[i][1] + Q[i + 1][1]) / 2)}`;
    }
    return `${d} L${P(Q[Q.length - 1])}`;
  };
  R.reverse();
  return `M${P(L[0])}${run(L)} L${P(R[0])}${run(R)}Z`;
}

// ── Lighting overlays ─────────────────────────────────────────────────────

/**
 * Gradients the form-light overlay paints with, once per model: `${p}K` key
 * glow from the upper left, `${p}F` form shadow toward the lower right, `${p}B`
 * coloured bounce from below.
 */
export function lightDefs(p, { key = "#fff4e4", bounce = "#4a7cff", shade = "#000000", ks = 0.2, ss = 0.55, bs = 0.16 } = {}) {
  return (
    rad(`${p}K`, [[0, key, ks], [0.55, key, ks * 0.35], [1, key, 0]], 0.25, 0.15, 0.75) +
    lin(`${p}F`, [[0, shade, 0], [0.5, shade, 0], [1, shade, ss]], 0, 0.1, 1, 0.5) +
    lin(`${p}B`, [[0, bounce, 0], [0.7, bounce, 0], [1, bounce, bs]], 0, 0, 0, 1)
  );
}

/**
 * Form light over a shape: key glow, form shadow and bounce laid on top of
 * flat paint, clipped to `d` (one path, or several joined). `box` is the
 * gradient frame [x, y, w, h] in art units.
 */
export function formLight(p, clipId, d, [x, y, w, h]) {
  return (
    `<clipPath id="${clipId}"><path d="${d}"/></clipPath>` +
    `<g clip-path="url(#${clipId})">` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${p}F)"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${p}B)"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${p}K)"/>` +
    `</g>`
  );
}

/**
 * Cloth fold: a soft shadow trough with a lit ridge on the key side. `lit`
 * is the ridge colour (the cloth's own light tone), `dark` the trough.
 */
export const fold = (d, { dark = "#05070c", lit = "#7a8aa0", op = 0.6, w = 1 } = {}) =>
  `<path d="${d}" fill="none" stroke="${dark}" stroke-width="${r1(1.8 * w)}" stroke-linecap="round" opacity="${r1(op * 0.35)}"/>` +
  `<path d="${d}" fill="none" stroke="${dark}" stroke-width="${r1(0.7 * w)}" stroke-linecap="round" opacity="${op}"/>` +
  `<path d="${d}" transform="translate(-0.8 -0.7)" fill="none" stroke="${lit}" stroke-width="${r1(0.4 * w)}" stroke-linecap="round" opacity="${r1(op * 0.75)}"/>`;

// ── Faces ─────────────────────────────────────────────────────────────────
// Local head units: crown y -10, chin y +10, eye line y 0. Front view, key light
// upper-left, rim light on the right cheek.

export function headPath(o) {
  const w = o.w ?? (o.male ? 7.3 : 6.9);
  const jx = o.jaw ?? (o.male ? 6.1 : 5);
  const cy = o.male ? 10.2 : 9.8;
  const cw = o.chin ?? (o.male ? 2.8 : 1.9);
  return (
    `M0,-10 C${r1(w * 0.66)},-10 ${w},-6.8 ${w},-2.4 C${w},1.8 ${r1(jx + 0.9)},4.4 ${jx},6.6 ` +
    `C${r1(jx - 1.3)},8.8 ${cw},${cy} 0,${cy} C${-cw},${cy} ${r1(1.3 - jx)},8.8 ${-jx},6.6 ` +
    `C${r1(-jx - 0.9)},4.4 ${-w},1.8 ${-w},-2.4 C${-w},-6.8 ${r1(-w * 0.66)},-10 0,-10Z`
  );
}

export function faceDefs(p, o) {
  const [hi, mid, lo] = o.skin;
  const white = o.white ?? "#e4dbd2";
  const warm = o.blush ?? mix(mid, "#d04838", 0.55);
  const [li, ld] = o.lip;
  return (
    rad(`${p}sk`, [[0, hi], [0.5, mid], [1, lo]], 0.36, 0.32, 0.8) +
    // the shadow side warms where light turns into shade, as skin does
    lin(`${p}sh`, [[0, lo, 0], [0.48, lo, 0], [0.6, o.terminator ?? warm, 0.1], [1, lo, 0.85]], 0, 0, 1, 0) +
    lin(`${p}nk`, [[0, lo], [0.5, mid], [1, mid]], 0, 0, 0.4, 1) +
    rad(`${p}so`, [[0, lo, 0.75], [0.6, lo, 0.28], [1, lo, 0]]) +
    rad(`${p}hl`, [[0, hi, 0.75], [1, hi, 0]]) +
    rad(`${p}bl`, [[0, warm, 0.18], [1, warm, 0]]) +
    rad(`${p}ew`, [[0, white], [0.7, mix(white, lo, 0.2)], [1, mix(white, lo, 0.55)]], 0.5, 0.6, 0.6) +
    rad(`${p}ir`, [[0, mix(o.iris, "#ffffff", 0.35)], [0.55, o.iris], [1, mix(o.iris, "#000000", 0.6)]], 0.5, 0.7, 0.6) +
    lin(`${p}lp`, [[0, mix(li, ld, 0.5)], [0.45, li], [1, mix(li, "#000000", 0.25)]]) +
    `<clipPath id="${p}hc"><path d="${headPath(o)}"/></clipPath>`
  );
}

function eye(p, sx, o) {
  const X = (x) => r1(sx * x);
  const lid = o.lid ?? "#1a0f0a";
  const lo = o.skin[2];
  const id = `${p}e${sx < 0 ? "l" : "r"}`;
  const [lx, ly] = o.look ?? [0, 0];
  const ix = r1(sx * 3 + lx);
  const iy = r1(-0.1 + ly);
  const almond = `M${X(1.4)},0.05 Q${X(2.6)},-1.4 ${X(4.75)},-0.2 Q${X(3.2)},1 ${X(1.4)},0.05Z`;
  let s = `<clipPath id="${id}"><path d="${almond}"/></clipPath>`;
  s += `<path d="${almond}" fill="url(#${p}ew)"/>`;
  s += `<g clip-path="url(#${id})"><circle cx="${ix}" cy="${iy}" r="0.86" fill="url(#${p}ir)"/>`;
  s += `<circle cx="${ix}" cy="${iy}" r="0.82" fill="none" stroke="#000" stroke-width="0.16" opacity="0.45"/>`;
  s += `<circle cx="${ix}" cy="${iy}" r="0.36" fill="#070504"/>`;
  // the upper lid shades the top of the eyeball
  s += `<path d="M${X(1)},-1.8 L${X(5)},-1.8 L${X(5)},-0.4 Q${X(3)},-0.95 ${X(1)},-0.2Z" fill="${lo}" opacity="0.45"/>`;
  s += `</g>`;
  s += `<circle cx="${r1(ix - 0.3)}" cy="${r1(iy - 0.36)}" r="0.24" fill="#fff" opacity="0.95"/>`;
  s += `<circle cx="${r1(ix + 0.36)}" cy="${r1(iy + 0.3)}" r="0.1" fill="#fff" opacity="0.6"/>`;
  // upper lid line, thick at the outer corner
  s += `<path d="M${X(1.15)},0.15 Q${X(2.6)},-1.7 ${X(4.95)},-0.25 Q${X(3.6)},-1.05 ${X(2.6)},-1.1 Q${X(1.7)},-0.85 ${X(1.15)},0.15Z" fill="${lid}" stroke="${lid}" stroke-width="0.2" stroke-linejoin="round"/>`;
  if (o.lashes) {
    s += `<path d="M${X(4.5)},-0.45 Q${X(5.1)},-0.7 ${X(5.5)},-1.15 M${X(3.9)},-0.85 Q${X(4.4)},-1.3 ${X(4.6)},-1.6 M${X(3.2)},-1.1 Q${X(3.5)},-1.55 ${X(3.6)},-1.85" fill="none" stroke="${lid}" stroke-width="0.3" stroke-linecap="round"/>`;
  }
  // lower lid: a soft line and the lit rim of the waterline
  s += `<path d="M${X(1.6)},0.35 Q${X(3.1)},1.15 ${X(4.5)},0.1" fill="none" stroke="${lo}" stroke-width="0.24" opacity="0.7"/>`;
  s += `<path d="M${X(2)},0.55 Q${X(3.1)},1.05 ${X(4.2)},0.35" fill="none" stroke="${o.skin[0]}" stroke-width="0.14" opacity="0.5"/>`;
  // lid crease and the soft fold above it
  s += `<path d="M${X(1.5)},-1 Q${X(3)},-2.2 ${X(4.8)},-0.95" fill="none" stroke="${lo}" stroke-width="0.28" opacity="0.6"/>`;
  s += `<path d="M${X(1.8)},-1.55 Q${X(3.2)},-2.5 ${X(4.6)},-1.5" fill="none" stroke="${o.skin[0]}" stroke-width="0.2" opacity="0.35"/>`;
  return s;
}

const BROWS = {
  stern: [[1, -1.3], [3, -3.1], [5.5, -2.9], [3, -2.1], [1, -0.6]],
  raised: [[1.1, -2.6], [3, -4.2], [5.3, -3], [3, -3.3], [1.1, -2]],
  arch: [[1.1, -2.2], [3.4, -3.9], [5.4, -2.6], [3.3, -3.15], [1.1, -1.7]],
  soft: [[1.1, -2.1], [3, -3.35], [5.3, -2.3], [3, -2.75], [1.1, -1.6]],
};

function brow(sx, o) {
  const X = (x) => r1(sx * x);
  const k = (sx < 0 ? o.browL : o.browR) ?? o.brows ?? "soft";
  const d = BROWS[k] ?? BROWS.soft;
  const shape = `M${X(d[0][0])},${d[0][1]} Q${X(d[1][0])},${d[1][1]} ${X(d[2][0])},${d[2][1]} Q${X(d[3][0])},${d[3][1]} ${X(d[4][0])},${d[4][1]}Z`;
  // soft hair edge under a denser core, then a few hairs along the growth
  let s = `<path d="${shape}" fill="${o.browC}" opacity="0.35" stroke="${o.browC}" stroke-width="0.5" stroke-linejoin="round"/>`;
  s += `<path d="${shape}" fill="${o.browC}"/>`;
  const mx = (d[0][0] + d[4][0]) / 2;
  const my = (d[0][1] + d[4][1]) / 2;
  s += `<path d="M${X(mx)},${r1(my)} Q${X(d[1][0])},${r1(d[1][1] + 0.2)} ${X(d[2][0] - 0.3)},${r1(d[2][1] + 0.1)} M${X(mx + 0.6)},${r1(my - 0.4)} L${X(mx + 1.3)},${r1(my - 1)}" fill="none" stroke="${mix(o.browC, "#ffffff", 0.3)}" stroke-width="0.16" opacity="0.6" stroke-linecap="round"/>`;
  return s;
}

function mouth(o) {
  const [li, ld] = o.lip;
  const [hi, , lo] = o.skin;
  const line = o.lipLine ?? "#3a1a14";
  switch (o.mouth) {
    case "smile":
      return (
        `<path d="M-2.7,6.2 Q-1.2,6 -0.4,6.2 Q0,6.35 0.4,6.2 Q1.2,6 2.7,6.2 Q0,7.4 -2.7,6.2Z" fill="${ld}"/>` +
        `<path d="M-2.3,6.6 Q0,7.5 2.3,6.6 Q1.4,8.2 0,8.3 Q-1.4,8.2 -2.3,6.6Z" fill="${li}"/>` +
        `<path d="M-2.8,6.1 Q0,7.6 2.8,6.1" fill="none" stroke="${line}" stroke-width="0.32" stroke-linecap="round"/>` +
        `<path d="M-3.4,5.2 Q-3.8,6.2 -3.1,7.1 M3.4,5.2 Q3.8,6.2 3.1,7.1" fill="none" stroke="${lo}" stroke-width="0.25" opacity="0.6"/>` +
        `<ellipse cx="-0.5" cy="7.6" rx="0.8" ry="0.28" fill="${hi}" opacity="0.5"/>`
      );
    case "soft":
      // closed lips with the corners just lifted: warmth without a grin
      return (
        `<path d="M-2.6,6.55 Q-1.3,5.95 -0.4,6.15 Q0,6.3 0.4,6.15 Q1.3,5.95 2.6,6.45 Q0,6.95 -2.6,6.55Z" fill="${ld}"/>` +
        `<path d="M-2.2,6.75 Q0,7.05 2.2,6.7 Q1.4,8.15 0,8.25 Q-1.4,8.15 -2.2,6.75Z" fill="${li}"/>` +
        `<path d="M-2.75,6.45 Q-1.4,6.95 0,6.85 Q1.4,6.95 2.75,6.35" fill="none" stroke="${line}" stroke-width="0.3" stroke-linecap="round"/>` +
        `<path d="M-2.75,6.45 Q-3.1,6.2 -3.2,5.85 M2.75,6.35 Q3.1,6.1 3.25,5.75" fill="none" stroke="${line}" stroke-width="0.2" stroke-linecap="round" opacity="0.7"/>` +
        `<ellipse cx="-0.5" cy="7.5" rx="0.85" ry="0.28" fill="${hi}" opacity="0.55"/>` +
        `<ellipse cx="0" cy="8.95" rx="1.3" ry="0.35" fill="${lo}" opacity="0.3"/>`
      );
    case "stern":
      return (
        `<path d="M-2.5,7 Q0,6.4 2.5,7 Q0,7.1 -2.5,7Z" fill="${ld}"/>` +
        `<path d="M-2.1,7.1 Q0,7.3 2.1,7.1 Q0,8.1 -2.1,7.1Z" fill="${li}"/>` +
        `<path d="M-2.6,7.15 Q0,6.8 2.6,7.15" fill="none" stroke="${line}" stroke-width="0.38" stroke-linecap="round"/>` +
        `<path d="M-2.6,7.15 L-2.9,7.6 M2.6,7.15 L2.9,7.6" stroke="${lo}" stroke-width="0.22" opacity="0.6"/>`
      );
    case "grin":
      return (
        `<path d="M-2.5,6.6 Q0,6.5 3,5.8 Q1.7,8.4 -0.2,8.4 Q-1.9,8.2 -2.5,6.6Z" fill="#3a1a14"/>` +
        `<path d="M-2.1,6.7 Q0,6.6 2.6,6 Q2.1,6.9 0,7.3 Q-1.5,7.3 -2.1,6.7Z" fill="#ebe3d4"/>` +
        `<path d="M-1.4,6.8 L-1.3,7.3 M0,6.65 L0,7.3 M1.3,6.4 L1.3,7.1" stroke="#b8ac9a" stroke-width="0.12" opacity="0.7"/>` +
        `<path d="M-2.5,6.6 Q0,6.5 3,5.8 Q1.7,8.4 -0.2,8.4 Q-1.9,8.2 -2.5,6.6Z" fill="none" stroke="${ld}" stroke-width="0.45"/>` +
        `<path d="M3.5,4.7 Q4.1,6 3.4,7.2 M-3.1,5.6 Q-3.4,6.5 -2.9,7.2" fill="none" stroke="${lo}" stroke-width="0.28" opacity="0.65"/>` +
        `<ellipse cx="0.2" cy="8.9" rx="1.4" ry="0.35" fill="${lo}" opacity="0.35"/>`
      );
    default: {
      const k = o.mouth === "smirk" ? 0.4 : 0;
      return (
        `<path d="M-2.4,6.8 Q-1.2,6.1 -0.4,6.3 Q0,6.45 0.4,6.3 Q1.2,6.1 2.4,${r1(6.8 - k)} Q0,7 -2.4,6.8Z" fill="${ld}"/>` +
        `<path d="M-2.2,6.9 Q0,7.1 2.2,${r1(6.9 - k)} Q1.4,8.2 0,8.3 Q-1.4,8.2 -2.2,6.9Z" fill="${li}"/>` +
        `<path d="M-2.5,6.85 Q0,7.15 2.5,${r1(6.85 - k)}" fill="none" stroke="${line}" stroke-width="0.3" stroke-linecap="round"/>` +
        (k ? `<path d="M2.9,5.9 Q3.3,6.5 2.9,7" fill="none" stroke="${lo}" stroke-width="0.22" opacity="0.6"/>` : "") +
        `<ellipse cx="-0.5" cy="7.55" rx="0.8" ry="0.3" fill="${hi}" opacity="0.5"/>` +
        `<ellipse cx="0" cy="8.95" rx="1.3" ry="0.35" fill="${lo}" opacity="0.3"/>`
      );
    }
  }
}

/**
 * A believable adult head + neck at (o.x, o.y) scaled by o.s. `back` is drawn
 * behind the head, `front` over it (hair), `over` last (goggles, scars).
 * Optional: `look` [dx, dy] moves the irises, `browL` / `browR` pick each
 * brow's shape, `tilt` rotates the head about the neck (degrees).
 */
export function face(p, o) {
  const [hi, mid, lo] = o.skin;
  const ink = o.ink ?? INK;
  const w = o.w ?? (o.male ? 7.3 : 6.9);
  const jx = o.jaw ?? (o.male ? 6.1 : 5);
  const nw = o.neck ?? 3.5;
  const nl = o.neckLen ?? 18;
  const tilt = o.tilt ? `<g transform="rotate(${o.tilt} 0 6)">` : "<g>";
  let s = `<g transform="translate(${o.x} ${o.y}) scale(${o.s})">`;
  s += o.back ? `${tilt}${o.back}</g>` : "";
  s += `<path d="M${-nw},4 L${r1(-nw - 0.6)},${nl} L${r1(nw + 0.6)},${nl} L${nw},4Z" fill="url(#${p}nk)" stroke="${ink}" stroke-width="0.4"/>`;
  // neck: the jaw's cast shadow, the tendon on the lit side, the throat
  s += `<ellipse cx="0.6" cy="7.4" rx="${r1(nw + 1.4)}" ry="3.6" fill="url(#${p}so)"/>`;
  s += `<path d="M${-nw},7 C-2,10.8 2,10.8 ${nw},7 L${nw},11 C2,12.6 -2,12.6 ${-nw},11Z" fill="${lo}" opacity="0.35"/>`;
  s += `<path d="M${r1(-nw * 0.7)},9.6 L${r1(-nw * 0.2)},${r1(nl - 1)}" stroke="${hi}" stroke-width="0.6" opacity="0.25" stroke-linecap="round"/>`;
  s += `<path d="M${r1(nw * 0.3)},9 L${r1(nw * 0.6)},${r1(nl - 1)}" stroke="${lo}" stroke-width="0.5" opacity="0.35"/>`;
  s += `<path d="M${r1(nw * 0.85)},5 L${r1(nw + 0.4)},${r1(nl - 1)}" stroke="${o.rim ?? lo}" stroke-width="0.35" opacity="0.4"/>`;
  s += tilt;
  for (const sx of [-1, 1]) {
    const X = (x) => r1(sx * x);
    s += `<path d="M${X(w - 0.3)},-1.8 C${X(w + 1.4)},-2.8 ${X(w + 1.7)},1.6 ${X(w + 0.6)},3.6 C${X(w)},4.2 ${X(w - 0.4)},3.4 ${X(w - 0.4)},2.8Z" fill="${sx < 0 ? mid : lo}" stroke="${ink}" stroke-width="0.35"/>`;
    s += `<path d="M${X(w + 0.2)},-0.8 C${X(w + 1)},-0.8 ${X(w + 1)},1.6 ${X(w + 0.3)},2.4" fill="none" stroke="${lo}" stroke-width="0.3" opacity="0.7"/>`;
    s += `<ellipse cx="${X(w + 0.6)}" cy="0.6" rx="0.4" ry="0.8" fill="${o.blush ?? "#d0584a"}" opacity="0.25"/>`;
  }
  s += `<path d="${headPath(o)}" fill="url(#${p}sk)" stroke="${ink}" stroke-width="${o.inkW ?? 0.5}" stroke-linejoin="round"/>`;
  s += `<g clip-path="url(#${p}hc)">`;
  s += `<rect x="-9" y="-11" width="18" height="23" fill="url(#${p}sh)"/>`;
  // planes of the face: sockets, temples, cheek hollows, the warm cheeks
  s += `<ellipse cx="-3.1" cy="-0.8" rx="3.2" ry="2.2" fill="url(#${p}so)" opacity="0.7"/>`;
  s += `<ellipse cx="3.1" cy="-0.8" rx="3.2" ry="2.2" fill="url(#${p}so)"/>`;
  s += `<ellipse cx="${r1(w - 0.6)}" cy="-3.6" rx="1.8" ry="3.4" fill="url(#${p}so)"/>`;
  s += `<ellipse cx="${r1(jx - 1)}" cy="4" rx="2.2" ry="2.8" fill="url(#${p}so)" opacity="0.8"/>`;
  s += `<ellipse cx="${r1(1 - jx)}" cy="4.2" rx="1.8" ry="2.4" fill="url(#${p}so)" opacity="0.35"/>`;
  s += `<ellipse cx="-4.2" cy="3.2" rx="2.4" ry="1.5" fill="url(#${p}bl)"/>`;
  s += `<ellipse cx="4.2" cy="3.2" rx="2.4" ry="1.5" fill="url(#${p}bl)" opacity="0.8"/>`;
  s += `<ellipse cx="0.4" cy="4" rx="1.4" ry="1.2" fill="url(#${p}bl)" opacity="0.7"/>`;
  // key-light highlights: brow ridge and forehead, cheekbone, chin
  s += `<ellipse cx="-2" cy="-6" rx="4" ry="2.4" fill="url(#${p}hl)"/>`;
  s += `<ellipse cx="-4.4" cy="1.9" rx="2.4" ry="1.3" fill="url(#${p}hl)"/>`;
  s += `<ellipse cx="-0.5" cy="9.1" rx="1.6" ry="0.8" fill="url(#${p}hl)" opacity="0.7"/>`;
  s += `<path d="M${r1(jx - 1.8)},2.6 C${r1(jx - 0.2)},3.2 ${r1(jx + 0.6)},4.8 ${r1(jx + 0.2)},6.6 C${r1(jx - 0.9)},5.2 ${r1(jx - 1.4)},4 ${r1(jx - 1.8)},2.6Z" fill="${lo}" opacity="0.35"/>`;
  s += `<ellipse cx="0" cy="9.7" rx="${r1(jx * 0.7)}" ry="1.2" fill="${lo}" opacity="0.3"/>`;
  s += `</g>`;
  s += eye(p, -1, o) + eye(p, 1, o) + brow(-1, o) + brow(1, o);
  // Nose: shadow plane on the right, lit bridge and tip, nostril wings.
  s += `<path d="M0.6,-0.6 C1,1.6 1.6,3 2,4.2 C1.4,4.7 0.8,4.8 0.3,4.6Z" fill="${lo}" opacity="0.38"/>`;
  s += `<path d="M0.9,-1.4 C1.3,-0.6 1.5,0.2 1.4,0.9" fill="none" stroke="${lo}" stroke-width="0.5" opacity="0.25"/>`;
  s += `<path d="M-0.4,-0.6 C-0.55,1 -0.6,2.2 -0.5,2.9" fill="none" stroke="${hi}" stroke-width="0.4" opacity="0.5"/>`;
  s += `<ellipse cx="-0.25" cy="3.55" rx="0.7" ry="0.55" fill="${hi}" opacity="0.6"/>`;
  s += `<ellipse cx="0" cy="4.95" rx="1.5" ry="0.45" fill="${lo}" opacity="0.45"/>`;
  s += `<path d="M-1.9,4.4 Q-1.3,5.3 -0.45,5 M1.9,4.4 Q1.3,5.3 0.45,5" fill="none" stroke="${lo}" stroke-width="0.35" opacity="0.8"/>`;
  s += `<path d="M-1.5,3.4 Q-2.2,4.2 -1.8,4.9 M1.5,3.4 Q2.2,4.2 1.8,4.9" fill="none" stroke="${lo}" stroke-width="0.28" opacity="0.6"/>`;
  s += `<ellipse cx="-1.6" cy="3.9" rx="0.35" ry="0.25" fill="${hi}" opacity="0.4"/>`;
  // philtrum: two soft ridges with the groove between
  s += `<path d="M-0.45,5.2 L-0.6,6.1 M0.45,5.2 L0.6,6.1" stroke="${hi}" stroke-width="0.22" opacity="0.35"/>`;
  s += `<ellipse cx="0" cy="5.7" rx="0.4" ry="0.45" fill="${lo}" opacity="0.22"/>`;
  if (o.male) {
    s += `<path d="M-2.1,3.9 Q-3.3,5.4 -3.1,7.1 M2.1,3.9 Q3.3,5.4 3.1,7.1" fill="none" stroke="${lo}" stroke-width="0.25" opacity="0.4"/>`;
  }
  s += mouth({ ...o, lip: [`url(#${p}lp)`, o.lip[1]] });
  if (o.rim) {
    // clipped to the head so the light never spills past the jaw onto the neck
    s += `<path d="M${r1(w - 1.8)},-8.2 C${r1(w + 0.1)},-5.6 ${r1(w + 0.2)},-1 ${r1(w - 0.2)},2.4 C${r1(jx + 0.7)},4.4 ${r1(jx + 0.4)},5.6 ${r1(jx - 0.2)},6.8" fill="none" stroke="${o.rim}" stroke-width="0.8" stroke-linecap="round" opacity="0.85" clip-path="url(#${p}hc)"/>`;
  }
  s += o.front ?? "";
  s += o.over ?? "";
  s += `</g></g>`;
  return s;
}
