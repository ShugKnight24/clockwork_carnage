/**
 * Builds the Clockwork Carnage brand kit: one mark and one custom-lettered
 * wordmark, drawn in the three art styles the game ships (Legacy neon, Comic
 * ink, Modern steel), plus favicons, one-colour versions and two alternative
 * marks for comparison.
 *
 * Everything is geometry: the lettering is hand-drawn centrelines, not a font,
 * because the game ships no web fonts and a typed logo would change shape on
 * every machine. Run: node scripts/brand/build-brand.mjs
 */
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("assets/brand");

// The game's own palette (src/ui/design-tokens.js).
const C = {
  ink: "#04060b", void: "#05060c", navy: "#0b1422", steel: "#2a3a4a", steelHi: "#6f8aa3",
  text: "#e4edf5", cyan: "#22e6ff", energy: "#00ffcc", crimson: "#ff2a4a", amber: "#ffae3a",
  gold: "#ffd24a", cream: "#f3e9cf", violet: "#9b5cff",
};

const f = (n) => +n.toFixed(2);

// ── Lettering ───────────────────────────────────────────────────────────────
// Each glyph is a centreline on a 56 × 100 box, stroked 18 wide with square
// caps and mitred joins, so the strokes fill the box edge to edge. Corners are
// chamfered top-left and bottom-right, like the game's UI plates. A miter
// limit of 2 keeps right angles and chamfers sharp but bevels the acute joins
// (the W's valley, the K's crotch) that would otherwise grow spikes.
const GW = 56, GH = 100, SW = 18, GAP = 17;
const GLYPHS = {
  C: "M47 9H23L9 23V91H47",
  L: "M9 9V91H47",
  O: "M23 9H47V77L33 91H9V23Z",
  K: "M9 9V91M47 9L22 50L47 91",
  W: "M9 9V91L28 64L47 91V9",
  R: "M9 91V9H33L47 23V41L37 51H9M31 51L47 91",
  A: "M9 91V23L23 9H47V91M9 55H47",
  N: "M9 91V9L47 91V9",
  G: "M47 9H23L9 23V91H33L47 77V55H30",
  E: "M47 9H9V91H47M9 50H38",
};

function word(text) {
  let x = 0;
  const parts = [];
  for (const ch of text) {
    if (ch === " ") { x += GW * 0.6; continue; }
    parts.push(`<path d="${GLYPHS[ch]}" transform="translate(${x} 0)"/>`);
    x += GW + GAP;
  }
  return { body: parts.join(""), width: x - GAP };
}

// ── The mark: a gear broken open into a C ───────────────────────────────────
// Twelve teeth on a ring with its right side cut away. Hands at 12 and 11, and
// a crimson second hand stopped at eleven seconds, running out through the gap.
function gearC({ teeth = 12, ro = 46, rb = 39, ri = 27, gap = 34 } = {}) {
  const step = 360 / teeth;
  const pts = [];
  const a0 = gap, a1 = 360 - gap;
  const pol = (r, deg) => {
    const t = (deg * Math.PI) / 180;
    return [f(r * Math.cos(t)), f(r * Math.sin(t))];
  };
  // Outer contour, tooth by tooth, clipped to [a0, a1].
  const push = (r, a) => { if (a >= a0 && a <= a1) pts.push(pol(r, a)); };
  pts.push(pol(rb, a0));
  for (let k = 0; k < teeth; k++) {
    const c = k * step + step / 2;
    const tw = step * 0.26, tf = step * 0.18;
    push(rb, c - tw - tf);
    push(ro, c - tw);
    push(ro, c + tw);
    push(rb, c + tw + tf);
  }
  pts.push(pol(rb, a1));
  const [ix1, iy1] = pol(ri, a1), [ix0, iy0] = pol(ri, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${pts.map((p) => p.join(" ")).join("L")}L${ix1} ${iy1}A${ri} ${ri} 0 ${large} 0 ${ix0} ${iy0}Z`;
}

const hand = (deg, len, tail = 0) => {
  const t = ((deg - 90) * Math.PI) / 180;
  return { x1: f(-Math.cos(t) * tail), y1: f(-Math.sin(t) * tail), x2: f(Math.cos(t) * len), y2: f(Math.sin(t) * len) };
};
// Clock angles, clockwise from 12.
const MINUTE = hand(0, 21);
const HOUR = hand(330, 15);
const SECOND_FULL = hand(66, 50, 9); // eleven seconds past
const SECOND = SECOND_FULL;

// ── Styles ──────────────────────────────────────────────────────────────────
const defs = {
  legacy: `
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3.2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="rift" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="4"/></filter>
    <radialGradient id="bgL" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#0d1a38"/><stop offset="1" stop-color="${C.void}"/></radialGradient>`,
  comic: `
    <pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
      <circle cx="3.5" cy="3.5" r="1.4" fill="${C.ink}" opacity="0.18"/>
    </pattern>
    <filter id="rift" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3"/></filter>
    <linearGradient id="steelC" x1="0" y1="-50" x2="0" y2="50" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#9fb6cb"/><stop offset=".5" stop-color="#6f8aa3"/><stop offset="1" stop-color="#3a4d61"/>
    </linearGradient>`,
  modern: `
    <linearGradient id="steelM" x1="0" y1="-50" x2="0" y2="50" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#e9f2fa"/><stop offset=".45" stop-color="#9fb3c6"/><stop offset=".55" stop-color="#6c8196"/><stop offset="1" stop-color="#2c3a48"/>
    </linearGradient>
    <linearGradient id="letM" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#f4f8fc"/><stop offset=".5" stop-color="#b8c7d6"/><stop offset=".52" stop-color="#8a9db0"/><stop offset="1" stop-color="#5a6d80"/>
    </linearGradient>
    <linearGradient id="redM" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ff6a80"/><stop offset=".5" stop-color="#ff2a4a"/><stop offset="1" stop-color="#b3102b"/>
    </linearGradient>
    <linearGradient id="redC" x1="0" y1="-50" x2="0" y2="50" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ff7a8e"/><stop offset=".5" stop-color="#ff2a4a"/><stop offset="1" stop-color="#9e0d26"/>
    </linearGradient>
    <filter id="rift" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.5"/></filter>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".45"/></filter>`,
};

/** The gear-C mark drawn in a style, centred on 0,0 in a 100-unit circle. */
function mark(style, { mono = null, simple = false, secondLen = null, face = false } = {}) {
  // In the name the hand stops inside the break, short of the next letter.
  const SECOND = secondLen ? hand(66, secondLen, 9) : SECOND_FULL;
  const gear = gearC(simple ? { teeth: 8, ro: 47, rb: 38, ri: 24, gap: 38 } : undefined);
  const hands = simple ? [] : [HOUR];
  const line = (h, stroke, w, extra = "") => `<line x1="${h.x1}" y1="${h.y1}" x2="${h.x2}" y2="${h.y2}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"${extra}/>`;
  if (mono) {
    return `<path d="${gear}" fill="${mono}"/>${[...hands, MINUTE].map((h) => line(h, mono, simple ? 7 : 6)).join("")}${line(SECOND, mono, simple ? 5 : 3.5)}<circle r="${simple ? 7 : 5.5}" fill="${mono}"/>`;
  }
  // A clock face behind the hands, so they never sit on whatever is behind
  // the mark (the shattered red C, in the twin mark).
  const faceDisc = (fill, op = 1) => (face ? `<circle r="25" fill="${fill}" opacity="${op}"/>` : "");
  // A thin keyline under every hand so it reads on steel, red or neon alike.
  const keyed = (h, stroke, w, key) => line(h, key, w + 2.6) + line(h, stroke, w);
  if (style === "legacy") {
    return `${faceDisc(C.void, 0.92)}
      <g fill="none">${[...hands, MINUTE, SECOND].map((h) => line(h, C.void, 7)).join("")}</g>
      <g filter="url(#glow)" fill="none" stroke-linejoin="round">
      <path d="${gear}" stroke="${C.cyan}" stroke-width="${simple ? 4 : 2.6}"/>
      ${hands.map((h) => line(h, C.cyan, 3)).join("")}${line(MINUTE, C.energy, simple ? 5 : 3.4)}
      ${line(SECOND, C.crimson, simple ? 4 : 2.4)}
      <circle r="${simple ? 5 : 3.6}" fill="${C.energy}" stroke="none"/>
    </g>`;
  }
  if (style === "comic") {
    // At favicon size the drop shadow and dots only muddy the silhouette.
    const shadow = simple ? "" : `<g transform="translate(5 6)" fill="${C.ink}"><path d="${gear}"/></g>`;
    return `${shadow}
      <path d="${gear}" fill="url(#steelC)" stroke="${C.ink}" stroke-width="${simple ? 4 : 4}" stroke-linejoin="round"/>
      ${simple ? "" : `<path d="${gear}" fill="url(#dots)"/>`}
      ${face ? `<circle r="25" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>` : ""}
      ${hands.map((h) => line(h, C.ink, 8) + line(h, C.cream, 4)).join("")}
      ${line(MINUTE, C.ink, simple ? 11 : 9)}${line(MINUTE, C.cyan, simple ? 6 : 4.5)}
      ${line(SECOND, C.ink, simple ? 8 : 6.5)}${line(SECOND, C.crimson, simple ? 4 : 3)}
      <circle r="${simple ? 7.5 : 6}" fill="${C.amber}" stroke="${C.ink}" stroke-width="3"/>`;
  }
  // modern
  return `<g filter="url(#soft)">
      <path d="${gear}" fill="url(#steelM)"/>
      <path d="${gear}" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="1"/>
      ${faceDisc(C.navy, 0.95)}
      ${hands.map((h) => keyed(h, "#dfe8f0", 4, C.navy)).join("")}${keyed(MINUTE, C.cyan, simple ? 6 : 3.6, C.navy)}
      ${keyed(SECOND, C.crimson, simple ? 4 : 2.2, C.navy)}
      <circle r="${simple ? 6 : 4.4}" fill="#eef4fa"/><circle r="${simple ? 2.4 : 1.8}" fill="${C.crimson}"/>
    </g>`;
}

const strokeAttrs = (w) => `fill="none" stroke-width="${w}" stroke-linecap="square" stroke-linejoin="miter" stroke-miterlimit="2"`;

/** One line of lettering at (x, y) in a style; `accent` lines are CARNAGE red. */
function letterLine(style, w, x, y, accent, mono = null) {
  const g = (inner) => `<g transform="translate(${f(x)} ${f(y)})">${inner}</g>`;
  if (mono) return g(`<g ${strokeAttrs(SW)} stroke="${mono}">${w.body}</g>`);
  if (style === "legacy") {
    const col = accent ? C.crimson : C.cyan;
    return g(`<g filter="url(#glow)"><g ${strokeAttrs(9)} stroke="${col}">${w.body}</g><g ${strokeAttrs(3)} stroke="#e8fbff">${w.body}</g></g>`);
  }
  if (style === "comic") {
    const col = accent ? C.crimson : C.cream;
    return g(`<g transform="translate(6 7)"><g ${strokeAttrs(SW + 7)} stroke="${C.ink}">${w.body}</g></g>
      <g ${strokeAttrs(SW + 7)} stroke="${C.ink}">${w.body}</g>
      <g ${strokeAttrs(SW)} stroke="${col}">${w.body}</g>`);
  }
  const col = accent ? "url(#redM)" : "url(#letM)";
  return g(`<g filter="url(#soft)"><g ${strokeAttrs(SW)} stroke="${col}">${w.body}</g></g>`);
}

/** The plain two-line wordmark (CLOCKWORK / CARNAGE), origin top-left, cap height 100. */
function wordmark(style, { mono = null, oneLine = false } = {}) {
  const top = word(oneLine ? "CLOCKWORK CARNAGE" : "CLOCKWORK");
  const bot = oneLine ? null : word("CARNAGE");
  const width = Math.max(top.width, bot?.width ?? 0);
  let body = letterLine(style, top, (width - top.width) / 2, 0, false, mono);
  if (bot) body += letterLine(style, bot, (width - bot.width) / 2, GH + 34, true, mono);
  return { body, width, height: bot ? GH * 2 + 34 : GH };
}

// ── The chaos C: CARNAGE's C is the gear's ring, shattered ──────────────────
// Order and chaos, one letter each. The pieces drift apart and turn, one slips
// sideways like a glitched frame, debris flies out of the break, and violet
// rift light shows through the cracks: the unknown the Engine let in.
const polar = (r, deg) => {
  const t = (deg * Math.PI) / 180;
  return [f(r * Math.cos(t)), f(r * Math.sin(t))];
};
const pathOf = (pts) => `M${pts.map((p) => p.join(" ")).join("L")}Z`;

/** Break an annulus sector into shards: `cuts` are [angle, zigzag°], `moves` [drift, turn°, slip] per shard. */
function shards({ R = 46, r = 27, a0 = 40, a1 = 320, cuts, moves }) {
  const edges = [a0, ...cuts.map((c) => c[0]), a1];
  const zig = [0, ...cuts.map((c) => c[1]), 0];
  const out = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const a = edges[i], b = edges[i + 1];
    const pts = [];
    for (let k = 0; k <= 6; k++) pts.push(polar(R, a + ((b - a) * k) / 6));
    if (i < edges.length - 2) pts.push(polar((R + r) / 2, b + zig[i + 1]));
    for (let k = 6; k >= 0; k--) pts.push(polar(r, a + ((b - a) * k) / 6));
    if (i > 0) pts.push(polar((R + r) / 2, a + zig[i]));
    const mid = (a + b) / 2;
    const [mx, my] = polar((R + r) / 2, mid);
    const [drift, turn, slip] = moves[i] ?? [0, 0, 0];
    const [dx, dy] = polar(drift, mid);
    out.push({ d: pathOf(pts), t: `translate(${f(dx + slip)} ${dy}) rotate(${turn} ${mx} ${my})` });
  }
  return out;
}
const CHAOS = shards({
  cuts: [[96, -7], [150, 8], [204, -6], [262, 7]],
  moves: [[2, -3, 0], [7, 5, 0], [1, -2, 6], [8, 6, 0], [3, -7, -5]],
});
const DEBRIS = ["M50 -14L59 -10L52 -3Z", "M57 7L68 4L62 14Z", "M46 20L54 25L45 27Z", "M66 -3L72 0L66 3Z", "M40 31L44 37L37 36Z"];
function ringPath(R = 46, r = 27, a0 = 40, a1 = 320) {
  const [ox0, oy0] = polar(R, a0), [ox1, oy1] = polar(R, a1), [ix1, iy1] = polar(r, a1), [ix0, iy0] = polar(r, a0);
  return `M${ox0} ${oy0}A${R} ${R} 0 1 1 ${ox1} ${oy1}L${ix1} ${iy1}A${r} ${r} 0 1 0 ${ix0} ${iy0}Z`;
}

/** Shards, debris and rift light in a style. */
function shattered(style, pieces, debris, rift, { mono = null, simple = false } = {}) {
  const P = (fill, extra = "") => pieces.map((p) => `<path d="${p.d}" transform="${p.t}" fill="${fill}"${extra}/>`).join("");
  const Dx = (fill, extra = "") => (simple ? debris.slice(0, 2) : debris).map((d) => `<path d="${d}" fill="${fill}"${extra}/>`).join("");
  if (mono) return P(mono) + Dx(mono);
  if (style === "legacy") {
    return `<path d="${rift}" fill="${C.violet}" opacity=".5" filter="url(#rift)"/>
      <g filter="url(#glow)">${P("none", ` stroke="${C.crimson}" stroke-width="${simple ? 4 : 2.6}" stroke-linejoin="round"`)}${Dx("none", ` stroke="${C.crimson}" stroke-width="2"`)}</g>`;
  }
  if (style === "comic") {
    return `<path d="${rift}" fill="${C.violet}" opacity=".75" filter="url(#rift)"/>
      <g transform="translate(5 6)" fill="${C.ink}">${P(C.ink)}${Dx(C.ink)}</g>
      ${P(C.crimson, ` stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"`)}${simple ? "" : P("url(#dots)")}
      ${Dx(C.crimson, ` stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"`)}`;
  }
  return `<path d="${rift}" fill="${C.violet}" opacity=".6" filter="url(#rift)"/>
    <g filter="url(#soft)">${P("url(#redC)")}${Dx("url(#redC)")}</g>
    ${P("none", ` stroke="#ffffff" stroke-opacity=".3" stroke-width="1"`)}`;
}
const chaosC = (style, opts = {}) => shattered(style, CHAOS, DEBRIS, ringPath(), opts);

// ── The name with its two Cs ────────────────────────────────────────────────
// CLOCKWORK's C is the gear clock; CARNAGE's C is that ring shattered. The two
// big Cs sit on different levels, the second lower and further right, so the
// name reads as a staircase from order down into chaos.
const BIG = 1.55; // big C radius ≈ 71, against a cap height of 100

function logotype(style, { mono = null } = {}) {
  const R = 46 * BIG;
  const L1 = word("LOCKWORK"), L2 = word("ARNAGE");
  const c1 = [R, 50], c2 = [R + 96, 205];
  const t1 = c1[0] + R - 6, t2 = c2[0] + R - 6;
  const body =
    `<g transform="translate(${f(c2[0])} ${c2[1]}) scale(${BIG})">${chaosC(style, { mono })}</g>` +
    letterLine(style, L1, t1, 0, false, mono) +
    letterLine(style, L2, t2, 155, true, mono) +
    `<g transform="translate(${f(c1[0])} ${c1[1]}) scale(${BIG})">${mark(style, { mono, secondLen: 36 })}</g>`;
  return { body, x0: -8, y0: f(50 - R - 8), width: f(Math.max(t1 + L1.width, t2 + L2.width + 30) + 16), height: f(c2[1] + R + 16 - (50 - R - 8)) };
}

function logotypeLine(style, { mono = null } = {}) {
  const S = 1.3, R = 46 * S;
  const L1 = word("LOCKWORK"), L2 = word("ARNAGE");
  const c1 = [R, 36];
  const t1 = c1[0] + R - 6;
  const c2 = [t1 + L1.width + 44 + R, 64];
  const t2 = c2[0] + R - 6;
  const body =
    `<g transform="translate(${f(c2[0])} ${c2[1]}) scale(${S})">${chaosC(style, { mono })}</g>` +
    letterLine(style, L1, t1, 0, false, mono) +
    letterLine(style, L2, t2, 0, true, mono) +
    `<g transform="translate(${f(c1[0])} ${c1[1]}) scale(${S})">${mark(style, { mono, secondLen: 36 })}</g>`;
  return { body, x0: -8, y0: f(36 - R - 8), width: f(t2 + L2.width + 40), height: f(64 + R + 16 - (36 - R - 8)) };
}

/** The two Cs as one mark: order over chaos. */
const twinMark = (style, opts = {}) =>
  `<g transform="translate(13 16) scale(.66)">${chaosC(style, opts)}</g><g transform="translate(-20 -15) scale(.66)">${mark(style, { ...opts, secondLen: 38, face: !opts.mono })}</g>`;

// ── Alternative marks ───────────────────────────────────────────────────────
// A: half clockwork, half carnage. The gear's left half keeps its teeth and the
// clock; its right half has come apart.
const SPLIT = shards({
  R: 46, r: 24, a0: -84, a1: 84,
  cuts: [[-44, 8], [-6, -7], [36, 6]],
  moves: [[5, 7, 0], [9, -6, 4], [4, 5, 0], [10, -9, 0]],
});
const SPLIT_DEBRIS = ["M56 -30L64 -26L57 -20Z", "M60 10L70 8L65 18Z", "M50 36L57 42L48 43Z"];
function splitGear(style, opts = {}) {
  const left = gearC({ gap: 94 }); // the ring's left half: teeth from 94° to 266°
  const leftHalf = gearHalf(style, left, opts);
  return shattered(style, SPLIT, SPLIT_DEBRIS, ringPath(46, 24, -84, 84), opts) + leftHalf + handsOnly(style, opts);
}
function gearHalf(style, d, { mono = null } = {}) {
  if (mono) return `<path d="${d}" fill="${mono}"/>`;
  if (style === "legacy") return `<path d="${d}" fill="none" stroke="${C.cyan}" stroke-width="2.6" filter="url(#glow)"/>`;
  if (style === "comic") return `<g transform="translate(5 6)"><path d="${d}" fill="${C.ink}"/></g><path d="${d}" fill="url(#steelC)" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/><path d="${d}" fill="url(#dots)"/>`;
  return `<path d="${d}" fill="url(#steelM)" filter="url(#soft)"/>`;
}
function handsOnly(style, { mono = null } = {}) {
  const line = (h, stroke, w) => `<line x1="${h.x1}" y1="${h.y1}" x2="${h.x2}" y2="${h.y2}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>`;
  if (mono) return line(MINUTE, mono, 6) + line(SECOND, mono, 3.5) + `<circle r="5.5" fill="${mono}"/>`;
  if (style === "comic") return line(MINUTE, C.ink, 9) + line(MINUTE, C.cyan, 4.5) + line(SECOND, C.ink, 6.5) + line(SECOND, C.crimson, 3) + `<circle r="6" fill="${C.amber}" stroke="${C.ink}" stroke-width="3"/>`;
  const glow = style === "legacy" ? ` filter="url(#glow)"` : "";
  return `<g${glow}>${line(MINUTE, C.cyan, 3.6)}${line(SECOND, C.crimson, 2.4)}<circle r="4" fill="${style === "legacy" ? C.energy : "#eef4fa"}"/></g>`;
}

// B: a clock face torn from eleven o'clock, the right-hand piece knocked askew,
// rift light in the tear. The hands stopped at 11:00:11.
function tornClock(style, { mono = null } = {}) {
  const Rf = 44;
  const start = polar(Rf, 240), end = polar(Rf, 60); // 11 o'clock to 5 o'clock
  const tear = [start];
  for (let k = 1; k < 7; k++) {
    const t = k / 7;
    const x = start[0] + (end[0] - start[0]) * t, y = start[1] + (end[1] - start[1]) * t;
    const n = (k % 2 ? 1 : -1) * 6; // zigzag across the line
    tear.push([f(x + n * 0.87), f(y - n * 0.5)]);
  }
  tear.push(end);
  const arc = (from, to, sweep) => `A${Rf} ${Rf} 0 0 ${sweep} ${to[0]} ${to[1]}`;
  const leftD = `M${tear.map((p) => p.join(" ")).join("L")}${arc(end, start, 1)}Z`;
  const rightD = `M${[...tear].reverse().map((p) => p.join(" ")).join("L")}${arc(start, end, 1)}Z`;
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = i * 30 - 90, [x1, y1] = polar(36, a), [x2, y2] = polar(i % 3 ? 40 : 30, a);
    return `M${x1} ${y1}L${x2} ${y2}`;
  }).join("");
  const hour = hand(330, 20), minute = hand(0, 30), second = hand(66, 38, 8);
  const hands = (stroke, sw) => [hour, minute].map((h) => `<line x1="0" y1="0" x2="${h.x2}" y2="${h.y2}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>`).join("");
  const sec = (stroke, sw) => `<line x1="${second.x1}" y1="${second.y1}" x2="${second.x2}" y2="${second.y2}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>`;
  const shift = `translate(7 5) rotate(6)`;
  const riftD = `M${tear.map((p) => p.join(" ")).join("L")}`;
  if (mono) return `<path d="${leftD}" fill="${mono}"/><g transform="${shift}"><path d="${rightD}" fill="${mono}"/></g>`;
  if (style === "legacy") {
    return `<path d="${riftD}" fill="none" stroke="${C.violet}" stroke-width="10" opacity=".6" filter="url(#rift)"/>
      <g filter="url(#glow)" fill="none" stroke-linecap="round"><path d="${leftD}" stroke="${C.cyan}" stroke-width="2.6"/>
      <g transform="${shift}"><path d="${rightD}" stroke="${C.crimson}" stroke-width="2.6"/></g>
      <path d="${ticks}" stroke="${C.cyan}" stroke-width="2" opacity=".7"/>${hands(C.energy, 3)}${sec(C.crimson, 2.2)}</g>`;
  }
  if (style === "comic") {
    return `<path d="${riftD}" fill="none" stroke="${C.violet}" stroke-width="12" opacity=".85" filter="url(#rift)"/>
      <g transform="translate(5 6)" fill="${C.ink}"><path d="${leftD}"/><g transform="${shift}"><path d="${rightD}"/></g></g>
      <path d="${leftD}" fill="${C.cream}" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/>
      <g transform="${shift}"><path d="${rightD}" fill="${C.crimson}" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/><path d="${rightD}" fill="url(#dots)"/></g>
      <path d="${ticks}" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>
      ${hands(C.ink, 6)}${sec(C.ink, 5)}${sec(C.crimson, 2.4)}<circle r="4.5" fill="${C.amber}" stroke="${C.ink}" stroke-width="2.5"/>`;
  }
  return `<path d="${riftD}" fill="none" stroke="${C.violet}" stroke-width="10" opacity=".7" filter="url(#rift)"/>
    <g filter="url(#soft)"><path d="${leftD}" fill="url(#steelM)"/><g transform="${shift}"><path d="${rightD}" fill="url(#redC)"/></g></g>
    <path d="${ticks}" stroke="#ffffff" stroke-opacity=".75" stroke-width="2" stroke-linecap="round"/>
    ${hands("#eef4fa", 3.4)}${sec(C.crimson, 2)}<circle r="3.6" fill="#eef4fa"/>`;
}

// ── Assembling files ────────────────────────────────────────────────────────
const TITLE = "Clockwork Carnage";
function svg(viewBox, inner, style, { title = TITLE, desc = "", bg = null } = {}) {
  const [, , w, h] = viewBox;
  const back = bg === "legacy" ? `<rect width="${w}" height="${h}" rx="${Math.min(w, h) * 0.12}" fill="url(#bgL)"/>`
    : bg === "comic" ? `<rect width="${w}" height="${h}" rx="${Math.min(w, h) * 0.12}" fill="${C.cream}"/><rect width="${w}" height="${h}" rx="${Math.min(w, h) * 0.12}" fill="url(#dots)"/>`
    : bg === "modern" ? `<rect width="${w}" height="${h}" rx="${Math.min(w, h) * 0.12}" fill="${C.navy}"/>`
    : bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.join(" ")}" role="img" aria-labelledby="t d">
<title id="t">${title}</title><desc id="d">${desc}</desc>
<defs>${defs[style] ?? ""}${bg === "comic" && style !== "comic" ? defs.comic : ""}</defs>
${back}${inner}
</svg>
`;
}

function write(rel, content) {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

const STYLES = {
  legacy: { name: "Legacy", bg: "legacy", note: "neon line art on the void, like the original terminal HUD" },
  comic: { name: "Comic", bg: "comic", note: "steel and cream under a hard ink line and drop shadow, on halftone" },
  modern: { name: "Modern", bg: "modern", note: "machined steel, no ink, soft light" },
};

for (const [key, s] of Object.entries(STYLES)) {
  const desc = `The gear-C mark: a gear broken open into a C, its second hand stopped at eleven seconds. ${s.name} style, ${s.note}.`;
  // Icon, transparent and on its tile.
  write(`${key}/icon.svg`, svg([-60, -60, 120, 120], mark(key), key, { desc }));
  write(`${key}/icon-tile.svg`, svg([0, 0, 120, 120], `<g transform="translate(60 60)">${mark(key)}</g>`, key, { desc, bg: s.bg }));
  // Favicon: fewer, bolder teeth; reads at 16 px.
  write(`${key}/favicon.svg`, svg([0, 0, 64, 64], `<g transform="translate(32 32) scale(.6)">${mark(key, { simple: true })}</g>`, key, { desc: `Favicon. ${desc}`, bg: s.bg }));
  // Wordmarks.
  const two = wordmark(key);
  write(`${key}/wordmark.svg`, svg([-20, -20, two.width + 40, two.height + 44], two.body, key, { desc: `Wordmark, two lines. ${s.name} style.` }));
  const one = wordmark(key, { oneLine: true });
  write(`${key}/wordmark-line.svg`, svg([-20, -20, one.width + 40, one.height + 44], one.body, key, { desc: `Wordmark, one line. ${s.name} style.` }));
  // Horizontal lockup: mark left, two-line wordmark right, both 240 tall.
  const k = 240 / two.height;
  const hW = 260 + 40 + two.width * k;
  write(`${key}/lockup-horizontal.svg`, svg([-20, -20, hW + 40, 280],
    `<g transform="translate(120 120) scale(2.3)">${mark(key)}</g><g transform="translate(300 0) scale(${f(k)})">${two.body}</g>`, key,
    { desc: `Horizontal lockup. ${desc}` }));
  // Stacked lockup: mark over the wordmark.
  const sW = Math.max(two.width * 0.55, 260);
  write(`${key}/lockup-stacked.svg`, svg([-20, -20, sW + 40, 280 + two.height * 0.55 + 60],
    `<g transform="translate(${f(sW / 2)} 120) scale(2.3)">${mark(key)}</g><g transform="translate(${f((sW - two.width * 0.55) / 2)} 290) scale(.55)">${two.body}</g>`, key,
    { desc: `Stacked lockup. ${desc}` }));
  // On-tile horizontal, the way it sits on a title screen.
  write(`${key}/lockup-horizontal-tile.svg`, svg([0, 0, hW + 80, 320],
    `<g transform="translate(20 20)"><g transform="translate(120 120) scale(2.3)">${mark(key)}</g><g transform="translate(300 0) scale(${f(k)})">${two.body}</g></g>`, key,
    { desc: `Horizontal lockup on its background. ${desc}`, bg: s.bg }));
}

// One-colour versions: for print, watermarks, embossing, merch.
for (const [name, col] of [["ink", C.ink], ["white", "#ffffff"]]) {
  write(`mono/icon-${name}.svg`, svg([-60, -60, 120, 120], mark(null, { mono: col }), null, { desc: `One-colour ${name} mark.` }));
  const two = wordmark(null, { mono: col });
  const k = 240 / two.height;
  write(`mono/lockup-horizontal-${name}.svg`, svg([-20, -20, 260 + 40 + two.width * k + 40, 280],
    `<g transform="translate(120 120) scale(2.3)">${mark(null, { mono: col })}</g><g transform="translate(300 0) scale(${f(k)})">${two.body}</g>`, null,
    { desc: `One-colour ${name} horizontal lockup.` }));
  write(`mono/favicon-${name}.svg`, svg([0, 0, 64, 64], `<g transform="translate(32 32) scale(.6)">${mark(null, { mono: col, simple: true })}</g>`, null, { desc: `One-colour ${name} favicon.` }));
}

// The name with its two Cs, and the two Cs as one mark.
for (const [key, s] of Object.entries(STYLES)) {
  const two = logotype(key);
  const vb = [two.x0, two.y0, two.width, two.height];
  const desc = `The name with its two Cs: CLOCKWORK's C is the gear clock, CARNAGE's C that ring shattered, on a lower level. ${s.name} style.`;
  write(`${key}/logotype.svg`, svg(vb, two.body, key, { desc }));
  write(`${key}/logotype-tile.svg`, svg([0, 0, two.width + 60, two.height + 60],
    `<g transform="translate(${f(30 - two.x0)} ${f(30 - two.y0)})">${two.body}</g>`, key, { desc, bg: s.bg }));
  const one = logotypeLine(key);
  write(`${key}/logotype-line.svg`, svg([one.x0, one.y0, one.width, one.height], one.body, key, { desc: `One-line name with its two Cs. ${s.name} style.` }));
  const twinDesc = `The two Cs as one mark: the gear clock over its shattered twin. ${s.name} style.`;
  write(`${key}/mark-twin.svg`, svg([-62, -62, 124, 124], twinMark(key), key, { desc: twinDesc }));
  write(`${key}/mark-twin-tile.svg`, svg([0, 0, 124, 124], `<g transform="translate(60 61)">${twinMark(key)}</g>`, key, { desc: twinDesc, bg: s.bg }));
  // Alternatives.
  write(`alternatives/split-gear-${key}.svg`, svg([0, 0, 124, 124], `<g transform="translate(58 62)">${splitGear(key)}</g>`, key, { desc: `Alternative: half clockwork, half carnage. ${s.name} style.`, bg: s.bg }));
  write(`alternatives/torn-clock-${key}.svg`, svg([0, 0, 124, 124], `<g transform="translate(60 60)">${tornClock(key)}</g>`, key, { desc: `Alternative: a clock face torn at eleven o'clock. ${s.name} style.`, bg: s.bg }));
}
for (const [name, col] of [["ink", C.ink], ["white", "#ffffff"]]) {
  const two = logotype(null, { mono: col });
  write(`mono/logotype-${name}.svg`, svg([two.x0, two.y0, two.width, two.height], two.body, null, { desc: `One-colour ${name} name with its two Cs.` }));
  write(`mono/mark-twin-${name}.svg`, svg([-62, -62, 124, 124], twinMark(null, { mono: col }), null, { desc: `One-colour ${name} twin-C mark.` }));
}
// The site's own favicon is the Comic one: Comic is the default art style.
fs.copyFileSync(path.join(OUT, "comic/favicon.svg"), path.resolve("favicon.svg"));

console.log(`brand kit written to ${path.relative(process.cwd(), OUT)} (and favicon.svg)`);
