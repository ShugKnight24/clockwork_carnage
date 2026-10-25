/**
 * In-world prop sprites for Modern art style (see ../../props.js for drawing).
 *
 * Units are centimetres. Origin (0,0) = the prop's footprint centre on the
 * floor, y up is negative, so a 190 cm locker spans y -190…0 and the engine
 * anchors y=0 on groundY(). Every prop is drawn in a fixed 3/4 view: a point
 * `z` cm behind the front plane shifts right by z·OX and converges vertically
 * toward the eye line (EYE, ~1.5 m), so low props show their top face and
 * tall ones have side edges that slope down like real perspective.
 *
 * Sprite format mirrors the cutscene models (../index.js):
 *   { box: [x, y, w, h], layers: [{ markup, anim?, blend?, shade? }] }
 * `shade: false` marks emissive layers that should not darken with distance.
 *
 * Realistic art style builds a second set from the same geometry
 * (buildRealisticProps, on first Realistic use): no ink outlines, graded
 * physical materials, a top key light, grime and scuffs, heavier contact
 * shadows and restrained emissives. Boxes and anchors are shared, so placement
 * does not change between styles.
 */

export const INK = "#04060b";
export const OX = 0.42;
export const EYE = -150;
const KZ = 0.0017;

// True only while buildRealisticProps / pickups' Realistic builders run, so
// the shared builders emit their Realistic variants. Modern builds at import
// with it false and its markup is unchanged.
let REAL = false;
export const isRealBuild = () => REAL;
/** Run `fn` with the Realistic variants of the shared helpers switched on. */
export function withRealistic(fn) {
  REAL = true;
  try {
    return fn();
  } finally {
    REAL = false;
  }
}

export const f = (n) => Math.round(n * 10) / 10;
export const pts = (list) => list.map(([x, y]) => `${f(x)},${f(y)}`).join(" ");
/** Height of a point pushed `z` cm back, converging toward the eye line. */
export const zy = (y, z) => y + (EYE - y) * z * KZ;
export const pj = (x, y, z) => [x + z * OX, zy(y, z)];

export const poly = (list, fill, w = 1.1, extra = "") =>
  `<polygon points="${pts(list)}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"${extra}/>`;
export const rect = (x, y, w, h, fill, sw = 1.1, rx = 0, extra = "") =>
  `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${rx ? ` rx="${rx}"` : ""} fill="${fill}"` +
  (sw ? ` stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"` : "") +
  `${extra}/>`;
export const path = (d, fill, w = 1.1, extra = "") =>
  `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"${extra}/>`;
export const line = (d, color, w, op = 1) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-opacity="${op}" stroke-linecap="round" stroke-linejoin="round"/>`;
export const ell = (cx, cy, rx, ry, fill, sw = 0, extra = "") =>
  `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"` +
  (sw ? ` stroke="${INK}" stroke-width="${sw}"` : "") +
  `${extra}/>`;

/** Material = front (diagonal, lit upper-left), side (shadow) and top gradients. */
function mat(id, top, front, side) {
  return (
    `<linearGradient id="${id}T" x1="0" y1="1" x2="1" y2="0">` +
    `<stop offset="0" stop-color="${top[0]}"/><stop offset="1" stop-color="${top[1]}"/></linearGradient>` +
    `<linearGradient id="${id}F" x1="0" y1="0" x2=".7" y2="1">` +
    `<stop offset="0" stop-color="${front[0]}"/><stop offset=".3" stop-color="${front[1]}"/>` +
    `<stop offset=".78" stop-color="${front[2]}"/><stop offset="1" stop-color="${front[3]}"/></linearGradient>` +
    `<linearGradient id="${id}S" x1="0" y1="0" x2="1" y2=".5">` +
    `<stop offset="0" stop-color="${side[0]}"/><stop offset="1" stop-color="${side[1]}"/></linearGradient>`
  );
}

/** Horizontal cylinder shading: soft edge, highlight at 28%, falloff to the right. */
function cyl(id, c) {
  return (
    `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="${c[1]}"/><stop offset=".28" stop-color="${c[0]}"/>` +
    `<stop offset=".6" stop-color="${c[2]}"/><stop offset=".9" stop-color="${c[3]}"/>` +
    `<stop offset="1" stop-color="${c[4]}"/></linearGradient>`
  );
}

export const DEFS =
  mat("st", ["#6b8196", "#8ea3b6"], ["#7f96ab", "#566b80", "#34475a", "#1f2b37"], ["#1f2b37", "#0d141b"]) +
  mat("dk", ["#4a5563", "#5d6a78"], ["#566271", "#3a4450", "#222932", "#14181e"], ["#1a1f26", "#0a0d10"]) +
  mat("gy", ["#9aa1a8", "#b9c0c6"], ["#b3b9bf", "#8d949b", "#666d74", "#484e55"], ["#50575e", "#2c3136"]) +
  mat("wd", ["#b4832b", "#d09a3a"], ["#c08a28", "#9a7016", "#735310", "#4f390a"], ["#5a410c", "#33240a"]) +
  mat("wn", ["#8a5a38", "#a36d45"], ["#8d5b37", "#6b4226", "#4d2f1b", "#34200f"], ["#3e2515", "#221409"]) +
  mat("ol", ["#71873f", "#8aa14e"], ["#7a9045", "#5b7231", "#3f5222", "#2c3a17"], ["#34431c", "#1b230e"]) +
  mat("bv", ["#3e62c4", "#5479d8"], ["#4a6fd0", "#2c4fb3", "#1d3888", "#122462"], ["#172d70", "#0a1640"]) +
  mat("cc", ["#a7a7a1", "#c2c2bb"], ["#b4b4ae", "#96968f", "#74746f", "#565652"], ["#61615c", "#3b3b38"]) +
  mat("lm", ["#b8ad9d", "#d2c8b8"], ["#a89c8b", "#887766", "#665748", "#4a3f34"], ["#554a3d", "#312a22"]) +
  mat("fb", ["#55556a", "#6a6a80"], ["#5d5d72", "#444455", "#2e2e3a", "#1d1d26"], ["#262631", "#121218"]) +
  mat("tc", ["#a8582a", "#c06a36"], ["#b76330", "#8b4513", "#65310d", "#442007"], ["#4f260a", "#2a1304"]) +
  // Office kit: navy upholstery, blue moulded plastic, white enamel, putty
  // steel, kraft board, soda red, brass.
  mat("nv", ["#3a4a6e", "#4b5d86"], ["#4a5b84", "#33416a", "#222d4c", "#151d33"], ["#1c2540", "#0c1122"]) +
  mat("pl", ["#5f86b4", "#78a0cc"], ["#6e95c2", "#4f75a3", "#355579", "#233a56"], ["#2a4466", "#152438"]) +
  mat("wt", ["#dfe3e6", "#f3f5f6"], ["#eef1f3", "#d3d8dc", "#aeb5bb", "#868e95"], ["#9aa2a9", "#646c73"]) +
  mat("bg", ["#c9bc9c", "#ddd2b4"], ["#d3c6a6", "#b9ab8a", "#958867", "#6f644a"], ["#7c7052", "#4f4733"]) +
  mat("kr", ["#c7a477", "#dcbd92"], ["#d1ae80", "#b38f62", "#8d6c45", "#664c2e"], ["#71552f", "#47341c"]) +
  mat("rd", ["#c43d3a", "#dc5450"], ["#d24a46", "#a8302d", "#7c201e", "#561412"], ["#651816", "#380a09"]) +
  mat("br", ["#b8903f", "#d8b25a"], ["#d0a84e", "#a8822f", "#7c5d1d", "#563f10"], ["#634816", "#3a2a0a"]) +
  cyl("brassC", ["#fff0b8", "#d8b25a", "#a8822f", "#6a4e16", "#3a2a0a"]) +
  cyl("bankers", ["#7ee0a0", "#2f9a58", "#1d703c", "#0f4524", "#062312"]) +
  cyl("bottle", ["#e6f6ff", "#9fd4ff", "#5aa8e6", "#2f78c0", "#1b4f8a"]) +
  `<linearGradient id="screenB" x1="0" y1="0" x2=".5" y2="1"><stop offset="0" stop-color="#2d6cb0"/>` +
  `<stop offset=".55" stop-color="#123c70"/><stop offset="1" stop-color="#08203f"/></linearGradient>` +
  `<linearGradient id="cctv" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#4a5e70"/>` +
  `<stop offset=".6" stop-color="#243443"/><stop offset="1" stop-color="#121c26"/></linearGradient>` +
  `<radialGradient id="bloomB"><stop offset="0" stop-color="#d8ecff" stop-opacity=".5"/>` +
  `<stop offset=".45" stop-color="#4a9cff" stop-opacity=".18"/><stop offset="1" stop-color="#4a9cff" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="leafS" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1a3f20"/>` +
  `<stop offset=".5" stop-color="#2f6a34"/><stop offset="1" stop-color="#5c9a4a"/></linearGradient>` +
  `<linearGradient id="leafR" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#0c3018"/>` +
  `<stop offset=".55" stop-color="#1f5a2c"/><stop offset="1" stop-color="#4c9a52"/></linearGradient>` +
  `<linearGradient id="cork" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#c99a62"/>` +
  `<stop offset=".6" stop-color="#a87a48"/><stop offset="1" stop-color="#7d5630"/></linearGradient>` +
  `<linearGradient id="board" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#fbfdfe"/>` +
  `<stop offset=".55" stop-color="#e8eef2"/><stop offset="1" stop-color="#c9d2d9"/></linearGradient>` +
  `<linearGradient id="shadeC" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9c9a4"/>` +
  `<stop offset=".3" stop-color="#f4ead2"/><stop offset=".75" stop-color="#c9b48a"/><stop offset="1" stop-color="#8f7c58"/></linearGradient>` +
  cyl("chrome", ["#f2f7fb", "#a7b4c0", "#6b7886", "#39434d", "#1b2128"]) +
  cyl("rubber", ["#5a6068", "#2d3238", "#1c2025", "#0f1215", "#06080a"]) +
  cyl("leather", ["#c4552a", "#8b2d0a", "#7a2204", "#4a1400", "#240900"]) +
  `<linearGradient id="chromeV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a7b4c0"/>` +
  `<stop offset=".3" stop-color="#f2f7fb"/><stop offset=".7" stop-color="#5a6775"/><stop offset="1" stop-color="#1b2128"/></linearGradient>` +
  `<linearGradient id="rubberV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4048"/>` +
  `<stop offset=".25" stop-color="#5a6068"/><stop offset=".6" stop-color="#1c2025"/><stop offset="1" stop-color="#06080a"/></linearGradient>` +
  cyl("pipe", ["#8d99a6", "#4d5864", "#353e48", "#1d242b", "#0c1014"]) +
  `<linearGradient id="vert" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/>` +
  `<stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>` +
  `<radialGradient id="shadow"><stop offset="0" stop-color="#000" stop-opacity=".6"/>` +
  `<stop offset=".55" stop-color="#000" stop-opacity=".32"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="ao" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".45"/>` +
  `<stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>` +
  `<radialGradient id="bloomG"><stop offset="0" stop-color="#9dffd0" stop-opacity=".55"/>` +
  `<stop offset=".45" stop-color="#00ff88" stop-opacity=".22"/><stop offset="1" stop-color="#00ff88" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="warmG"><stop offset="0" stop-color="#fff2c0" stop-opacity=".9"/>` +
  `<stop offset=".35" stop-color="#ffb030" stop-opacity=".45"/><stop offset="1" stop-color="#ff8a00" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="cyanG"><stop offset="0" stop-color="#d8fdff" stop-opacity=".95"/>` +
  `<stop offset=".35" stop-color="#22e6ff" stop-opacity=".5"/><stop offset="1" stop-color="#22e6ff" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="greenG"><stop offset="0" stop-color="#e0ffe8" stop-opacity=".95"/>` +
  `<stop offset=".35" stop-color="#00ff44" stop-opacity=".5"/><stop offset="1" stop-color="#00ff44" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="screen" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#0a5a3c"/>` +
  `<stop offset=".5" stop-color="#003322"/><stop offset="1" stop-color="#001810"/></linearGradient>` +
  `<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfe9ff"/>` +
  `<stop offset=".5" stop-color="#8ab8e0"/><stop offset="1" stop-color="#3e6a96"/></linearGradient>` +
  `<linearGradient id="leafA" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1a5e26"/>` +
  `<stop offset=".6" stop-color="#2f9a3f"/><stop offset="1" stop-color="#5fcf5f"/></linearGradient>` +
  `<linearGradient id="leafB" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#0f3f18"/>` +
  `<stop offset=".6" stop-color="#1f7a2e"/><stop offset="1" stop-color="#3aa648"/></linearGradient>` +
  `<filter id="glow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="2.2"/></filter>` +
  `<filter id="soft" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="5"/></filter>`;

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * Oblique box. (x, y) is the front face's top-left, `d` the depth in cm.
 * Draws side, top (skip with o.top=false for things above eye height) and front.
 */
export function block(x, y, w, h, d, m, o = {}) {
  const dx = d * OX;
  const yt = zy(y, d);
  const ink = o.ink ?? 1.1;
  let s = "";
  if (o.side !== false) s += poly([[x + w, y], [x + w + dx, yt], [x + w + dx, zy(y + h, d)], [x + w, y + h]], `url(#${m}S)`, ink);
  // The top face is only visible when it sits below the eye line.
  if (o.top !== false && yt < y - 0.5) s += poly([[x, y], [x + dx, yt], [x + w + dx, yt], [x + w, y]], `url(#${m}T)`, ink);
  s += rect(x, y, w, h, `url(#${m}F)`, ink, o.rx || 0);
  if (o.hi !== 0) s += line(`M${f(x + 1.2)},${f(y + h - 1.5)}V${f(y + 1.2)}H${f(x + w - 1.5)}`, "#fff", 0.7, o.hi ?? 0.28);
  return s;
}

/** Soft floor contact shadow. */
export const shadow = (cx, cy, rx, ry, op = 1) =>
  `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#shadow)" opacity="${op}"/>` +
  // Realistic: a tight occlusion core where the object meets the floor.
  (REAL ? `<ellipse cx="${f(cx - 1)}" cy="${f(cy + ry * 0.12)}" rx="${f(rx * 0.74)}" ry="${f(ry * 0.5)}" fill="url(#shadowCore)" opacity="${op}"/>` : "");

/** Rim light along an edge — cool cyan, the in-world accent colour. */
const rim = (d, op = 0.35, w = 0.9) => (REAL ? line(d, "#e6ecf0", w * 0.8, op * 0.4) : line(d, "#22e6ff", w, op));

/** Small emissive light: blurred halo + bright core (for glow layers). */
export const lamp = (x, y, r, color, core = "#ffffff") =>
  `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * (REAL ? 1.7 : 2.6))}" fill="${color}" opacity="${REAL ? ".3" : ".55"}" filter="url(#glow)"/>` +
  `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${core}"/>`;

/** Horizontal vent slits with a lit lower lip. */
function vents(x, y, w, n, gap = 4.2) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const yy = y + i * gap;
    s += rect(x, yy, w, 1.8, "#070b10", 0, 0.9);
    s += line(`M${f(x + 0.6)},${f(yy + 2.4)}H${f(x + w - 0.6)}`, "#c8d6e2", 0.5, 0.3);
  }
  return s;
}

/** Tapered leaf blade from base along an angle (deg from vertical) with a bend. */
function leaf(bx, by, deg, len, wid, bend, fill) {
  const a = (deg * Math.PI) / 180;
  const ux = Math.sin(a);
  const uy = -Math.cos(a);
  const tip = [bx + ux * len, by + uy * len + Math.abs(ux) * len * bend];
  const nx = -uy;
  const ny = ux;
  const mid = [bx + ux * len * 0.55, by + uy * len * 0.55];
  const c1 = [mid[0] + nx * wid, mid[1] + ny * wid];
  const c2 = [mid[0] - nx * wid, mid[1] - ny * wid];
  const d = `M${f(bx)},${f(by)}Q${f(c1[0])},${f(c1[1])} ${f(tip[0])},${f(tip[1])}Q${f(c2[0])},${f(c2[1])} ${f(bx)},${f(by)}Z`;
  const rib = `M${f(bx)},${f(by)}Q${f(mid[0])},${f(mid[1] - 1)} ${f(tip[0])},${f(tip[1])}`;
  if (REAL) {
    // Leaves fold along the midrib: the half away from the key light is darker.
    const half = `M${f(bx)},${f(by)}Q${f(c2[0])},${f(c2[1])} ${f(tip[0])},${f(tip[1])}Q${f(mid[0])},${f(mid[1] - 1)} ${f(bx)},${f(by)}Z`;
    return path(d, fill, 0.8) + `<path d="${half}" fill="#000" opacity=".26"/>` + line(rib, "#b8f0a0", 0.5, 0.3);
  }
  return path(d, fill, 0.8) + line(rib, "#b8f0a0", 0.5, 0.35);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** Double-door steel locker, 80×188 cm on a plinth, keypad lock LED. */
function locker() {
  const w = 80;
  const h = 188;
  const d = 45;
  const x = -(w + d * OX) / 2;
  const y = -196;
  const mx = x + w / 2;
  let s = shadow(4, -4, 58, 14);
  s += block(x + 3, -8, w - 6, 8, d - 6, "dk", { top: false, hi: 0 });
  s += block(x, y, w, h, d, "st", { top: false });
  // Doors: inset panels with bevels.
  for (const dx0 of [x + 3, mx + 1]) {
    const dw = w / 2 - 4;
    s += rect(dx0, y + 4, dw, h - 9, "none", 0.5, 0, ` stroke-opacity=".7"`);
    s += line(`M${f(dx0 + 0.8)},${f(y + h - 6)}V${f(y + 4.8)}H${f(dx0 + dw - 0.8)}`, "#cfe0ee", 0.5, 0.35);
    s += vents(dx0 + dw * 0.2, y + 14, dw * 0.6, 6);
    s += vents(dx0 + dw * 0.2, -44, dw * 0.6, 4);
  }
  s += line(`M${f(mx)},${f(y + 4)}V${f(-13)}`, INK, 1.1, 0.9);
  // Handles + lock box.
  s += rect(mx - 7.5, -118, 3.2, 26, "url(#chrome)", 0.6, 1.5);
  s += rect(mx + 4.3, -118, 3.2, 26, "url(#chrome)", 0.6, 1.5);
  s += rect(mx - 3.2, -126, 6.4, 10, "#141b22", 0.6, 1);
  // Number plates.
  s += rect(x + 12, y + 44, 14, 7, "#cfd7de", 0.5, 0.8);
  s += line(`M${f(x + 15)},${f(y + 47.5)}h3M${f(x + 20)},${f(y + 46)}v3`, "#1a232c", 0.9, 0.9);
  s += rect(mx + 10, y + 44, 14, 7, "#cfd7de", 0.5, 0.8);
  s += line(`M${f(mx + 13)},${f(y + 47.5)}h3M${f(mx + 18)},${f(y + 46)}v3h2`, "#1a232c", 0.9, 0.9);
  // Wear: scuffs low on the doors, AO under the top lip.
  s += line(`M${f(x + 10)},-30l9,-2M${f(mx + 20)},-58l12,3M${f(mx + 8)},-24l6,-1`, "#d8e4ee", 0.6, 0.25);
  s += rect(x + 0.6, y + 0.6, w - 1.2, 6, "url(#ao)", 0);
  // Side face panel seam and rim light.
  s += line(`M${f(x + w + d * OX * 0.5)},${f(zy(y, d * 0.5) + 6)}V${f(zy(-8, d * 0.5) - 4)}`, "#000", 0.6, 0.5);
  s += rim(`M${f(x + w + d * OX)},${f(zy(y, d) + 2)}V${f(zy(y + h, d) - 2)}`);
  return {
    box: [-64, -214, 128, 226],
    layers: [
      { markup: `<g>${s}</g>` },
      { markup: lamp(mx, -121, 1.3, "#00ff66", "#c8ffd8"), shade: false, blend: "lighter", anim: { type: "pulse", min: 0.45, max: 1, speed: 2.4 } },
    ],
  };
}

/** Range target: steel stand with a hanging backer board and ring target. */
function target() {
  const bar = -182;
  let frame = shadow(0, -3, 42, 9);
  frame += block(-36, -4, 72, 4, 30, "dk", { hi: 0 });
  frame += rect(-2.5, bar, 5, -bar - 4, "url(#pipe)", 0.9);
  frame += rect(-40, bar - 5, 80, 5, "url(#pipe)", 0.9, 1.5);
  frame += line(`M-30,${bar}v8M30,${bar}v8`, "#8a96a2", 1.4, 1);
  let board = rect(-34, bar + 8, 68, 82, "url(#lmF)", 1.1, 1);
  board += rect(-34, bar + 8, 68, 82, "url(#vert)", 0);
  const cy = bar + 48;
  board += ell(0, cy, 30, 30, "#ddddcc", 0.9);
  const rings = [[24, "#cc3333"], [17, "#ffffff"], [11, "#cc3333"], [5, "#ffcc00"]];
  for (const [r, c] of rings) board += ell(0, cy, r, r, c, 0.4);
  board += `<ellipse cx="0" cy="${cy}" rx="30" ry="30" fill="url(#vert)"/>`;
  board += line(`M-30,${cy}h60M0,${cy - 30}v60`, "#000", 0.3, 0.4);
  // Bullet holes with torn paper rims.
  for (const [hx, hy] of [[-6, -4], [3, 7], [14, -12], [-17, 15], [1, 1]]) {
    board += ell(hx, cy + hy, 1.4, 1.4, "#150d08") + ell(hx - 0.4, cy + hy - 0.4, 2.2, 2.2, "none", 0, ` stroke="#fff" stroke-opacity=".5" stroke-width=".4"`);
  }
  board += line(`M-30,${bar}l-4,8M30,${bar}l4,8`, "#b9c4ce", 0.8, 0.9);
  board += rim(`M34.5,${bar + 10}v78`, 0.4);
  return {
    box: [-48, -196, 96, 204],
    layers: [
      { markup: `<g>${frame}</g>` },
      { markup: `<g>${board}</g>`, anim: { type: "sway", amp: 0.035, speed: 2, pivot: [0, bar] } },
    ],
  };
}

/** Stroke-font stencil letters, 10×14 cells. */
const GLYPHS = {
  A: "M0,14L5,0L10,14M2.2,8.5H7.8",
  M: "M0,14V0L5,8L10,0V14",
  O: "M5,0C-1.5,0 -1.5,14 5,14C11.5,14 11.5,0 5,0Z",
};
const stencil = (text, x, y, k, color, op) =>
  `<g transform="translate(${f(x)},${f(y)}) scale(${k})" fill="none" stroke="${color}" stroke-width="${f(2.6)}" stroke-opacity="${op}" stroke-linejoin="miter">` +
  [...text].map((ch, i) => `<path d="${GLYPHS[ch]}" transform="translate(${i * 14},0)"/>`).join("") +
  `</g>`;

/** Olive military ammo crate with brass clasps, rope handle and stencil. */
function ammoCrate() {
  const w = 90;
  const h = 50;
  const d = 55;
  const x = -(w + d * OX) / 2;
  const y = -h;
  let s = shadow(4, -8, 62, 16);
  s += block(x, y, w, h, d, "ol");
  // Lid band and planks.
  s += line(`M${f(x)},${y + 9}h${w}l${f(d * OX)},${f(zy(y + 9, d) - y - 9)}`, INK, 0.8, 0.9);
  s += line(`M${f(x + 1)},${y + 10}h${w - 2}`, "#b8cc80", 0.5, 0.35);
  s += line(`M${f(x + 1)},${y + 29}h${w - 2}`, "#1a220c", 0.6, 0.6);
  for (let i = 1; i < 3; i++) {
    const [a0, b0] = pj(x, y, (i * d) / 3);
    s += line(`M${f(a0)},${f(b0)}h${w}`, "#2b3814", 0.6, 0.7);
  }
  // Corner brackets.
  for (const cx of [x, x + w - 9]) {
    s += rect(cx, y, 9, 9, "url(#dkF)", 0.6) + rect(cx, y + h - 9, 9, 9, "url(#dkF)", 0.6);
  }
  // Clasps.
  for (const cx of [x + 22, x + w - 28]) {
    s += rect(cx, y + 5, 6, 12, "#b89b2c", 0.7, 1) + line(`M${f(cx + 1.2)},${y + 6}v10`, "#fff3b0", 0.5, 0.6);
  }
  s += stencil("AMMO", x + 22, y + 24, 0.8, "#d7c35a", 0.7);
  // Rope handle on the side face.
  const [hx, hy] = pj(x + w, y + 22, d * 0.5);
  s += `<path d="M${f(hx - 7)},${f(hy + 2)}q7,9 14,-3" fill="none" stroke="${INK}" stroke-width="3"/>`;
  s += `<path d="M${f(hx - 7)},${f(hy + 2)}q7,9 14,-3" fill="none" stroke="#b39a6a" stroke-width="1.8"/>`;
  s += rim(`M${f(x + w + d * OX)},${f(zy(y, d) + 1)}V${f(zy(-1, d))}`, 0.35);
  return { box: [-64, -74, 130, 84], layers: [{ markup: `<g>${s}</g>` }] };
}

/**
 * Timber cargo crate with iron corner brackets and a smaller box stacked on
 * top. Warmer and taller than the olive ammo crate, so a room using both still
 * reads as two different objects.
 */
function crate() {
  const w = 76;
  const h = 62;
  const d = 50;
  const x = -(w + d * OX) / 2;
  const y = -h;
  let s = shadow(2, -6, 56, 15);
  s += block(x, y, w, h, d, "wd");
  // Plank seams across the front face.
  for (let i = 1; i < 3; i++) {
    s += line(`M${f(x + 1)},${f(y + (h * i) / 3)}h${f(w - 2)}`, "#5f4410", 0.7, 0.55);
  }
  // Diagonal brace, the way a shipping crate is actually built.
  s += line(`M${f(x + 3)},${f(y + h - 3)}L${f(x + w - 3)},${f(y + 3)}`, "#6d4d12", 1.1, 0.5);
  s += line(`M${f(x + 4)},${f(y + h - 4)}L${f(x + w - 4)},${f(y + 4)}`, "#d9a94a", 0.5, 0.3);
  // Iron corner brackets.
  for (const cx of [x, x + w - 8]) {
    s += rect(cx, y, 8, 8, "url(#dkF)", 0.6) + rect(cx, y + h - 8, 8, 8, "url(#dkF)", 0.6);
  }
  // Painted handling chevrons on the side face.
  const [gx, gy] = pj(x + w, y + 20, d * 0.45);
  s += line(`M${f(gx - 5)},${f(gy)}l5,-6l5,6`, "#c8532c", 1.6, 0.75);
  s += line(`M${f(gx - 5)},${f(gy + 7)}l5,-6l5,6`, "#c8532c", 1.6, 0.55);

  // Stacked box — a second, smaller crate sitting on the lid.
  const tw = 44;
  const th = 30;
  const td = 30;
  const tx = x + 10;
  const ty = zy(y, d * 0.5) - th;
  s += block(tx, ty, tw, th, td, "lm");
  s += line(`M${f(tx + 1)},${f(ty + th / 2)}h${f(tw - 2)}`, "#6b5c4a", 0.6, 0.5);
  s += rim(`M${f(tx + tw + td * OX)},${f(zy(ty, td) + 1)}V${f(zy(ty + th, td))}`, 0.3);
  return { box: [-60, -104, 122, 112], layers: [{ markup: `<g>${s}</g>` }] };
}

/** Hex dumbbell head seen end-on, with the back head peeking out in depth. */
function hexHead(cx, cy, r) {
  const hex = (ox, oy, rr) => Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return [ox + Math.cos(a) * rr, oy + Math.sin(a) * rr];
  });
  const [bx, by] = pj(cx, cy, r * 1.4);
  return (
    poly(hex(bx, by, r * 0.96), "url(#rubber)", 0.8) +
    poly(hex(cx, cy, r), "url(#dkF)", 1) +
    poly(hex(cx, cy, r * 0.62), "url(#dkT)", 0, ` opacity=".35"`) +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.28)}" fill="url(#chrome)" stroke="${INK}" stroke-width=".5"/>`
  );
}

/** Three-tier gym dumbbell rack, heavy weights low. */
function weightRack() {
  const w = 110;
  const d = 50;
  const x = -(w + d * OX) / 2;
  let s = shadow(4, -8, 70, 16);
  // Rear uprights, shelves (sloped back), then front uprights.
  for (const ux of [x, x + w - 6]) s += rect(ux + d * OX, zy(-118, d), 6, zy(0, d) - zy(-118, d), "url(#dkS)", 0.8);
  const tiers = [[-22, 9.5, 5], [-58, 8, 6], [-92, 6.5, 7]];
  for (const [ty, r, n] of tiers) {
    s += block(x + 3, ty, w - 6, 3, d, "dk", { hi: 0.2 });
    const gap = (w - 22) / n;
    for (let i = 0; i < n; i++) s += hexHead(x + 6 + gap * (i + 0.5) + d * OX * 0.2, zy(ty - r * 0.95, d * 0.2), r);
  }
  for (const ux of [x, x + w - 6]) {
    s += block(ux, -122, 6, 122, 6, "dk", { hi: 0.25 });
    s += rect(ux - 3, -3, 12, 3, "#1a1f26", 0.6, 1);
  }
  s += rect(x - 1, -126, w + 2, 6, "url(#stF)", 0.9, 1);
  s += rim(`M${f(x + w + d * OX)},${f(zy(-118, d))}V${f(zy(-6, d))}`, 0.3);
  return { box: [-70, -142, 142, 150], layers: [{ markup: `<g>${s}</g>` }] };
}

/** A pair of hex dumbbells lying on the floor. */
function dumbbell() {
  // Lying along x: round rubber plates seen edge-on, outer end face visible.
  const bell = (cx, by, len, r) => {
    const hw = 9;
    const cy = by - r;
    let s = rect(cx - len / 2 + hw - 1, cy - 2, len - hw * 2 + 2, 4, "url(#chromeV)", 0.7, 1.5);
    for (const [hx, end] of [[cx - len / 2, -1], [cx + len / 2 - hw, 1]]) {
      if (end > 0) s += ell(hx + hw, cy, 3.2, r, "#15181c", 0.8);
      s += rect(hx, cy - r, hw, r * 2, "url(#rubberV)", 1, 2.5);
      s += line(`M${f(hx + 2)},${f(cy - r + 1.4)}h${hw - 4}`, "#9aa4ae", 0.7, 0.5);
      s += line(`M${f(hx + hw * 0.5)},${f(cy - r + 1)}v${f(r * 2 - 2)}`, "#000", 0.5, 0.35);
    }
    return s;
  };
  let s = shadow(3, -3, 34, 8);
  s += bell(9, -6, 40, 7.5);
  s += bell(-5, 0, 44, 8.5);
  return { box: [-32, -30, 72, 36], layers: [{ markup: `<g>${s}</g>` }] };
}

/** Leather heavy bag on a chain from a ceiling bracket; swings as one piece. */
function punchingBag() {
  const top = -300;
  let floor = shadow(0, -2, 34, 8, 0.8);
  let bag = rect(-14, top, 28, 5, "url(#dkF)", 0.8, 1);
  // Chain links.
  for (let yy = top + 5; yy < -186; yy += 7) {
    bag += `<ellipse cx="0" cy="${yy + 3.5}" rx="${yy % 14 < 7 ? 1.6 : 2.6}" ry="3.8" fill="none" stroke="${INK}" stroke-width="2.2"/>`;
    bag += `<ellipse cx="0" cy="${yy + 3.5}" rx="${yy % 14 < 7 ? 1.6 : 2.6}" ry="3.8" fill="none" stroke="#9aa6b2" stroke-width="1"/>`;
  }
  bag += ell(0, -183, 3.5, 3.5, "url(#chrome)", 0.7);
  bag += line("M0,-182L-15,-162M0,-182L-5,-160M0,-182L5,-160M0,-182L15,-162", INK, 1.6, 1);
  bag += line("M0,-182L-15,-162M0,-182L15,-162", "#9aa6b2", 0.6, 0.9);
  // Body: cylinder with rounded caps.
  bag += path("M-18,-160C-18,-167 18,-167 18,-160V-52C18,-44 -18,-44 -18,-52Z", "url(#leather)", 1.2);
  bag += `<path d="M-18,-160C-18,-154 18,-154 18,-160" fill="none" stroke="${INK}" stroke-width=".7"/>`;
  bag += ell(0, -161, 18, 4, "#5a1a06", 0.7);
  bag += rect(-18, -122, 36, 13, "url(#rubber)", 0.8);
  bag += line("M-15,-117h8M-4,-117h10", "#e8e0d0", 1.6, 0.65);
  bag += line("M-17.6,-150C-10,-152 10,-152 17.6,-150M-17.6,-72C-10,-70 10,-70 17.6,-72", "#2a0800", 0.5, 0.6);
  bag += line("M-9,-156V-54", "#ff9a70", 1.6, 0.25);
  bag += rim("M17.4,-158V-54", 0.35);
  bag += `<path d="M-18,-52C-18,-44 18,-44 18,-52" fill="none" stroke="#000" stroke-width="2" stroke-opacity=".35"/>`;
  return {
    box: [-40, -306, 80, 314],
    layers: [
      { markup: `<g>${floor}</g>` },
      { markup: `<g>${bag}</g>`, anim: { type: "sway", amp: 0.028, speed: 1.5, pivot: [0, top] } },
    ],
  };
}

/** Rifle silhouette on pegs: gunmetal body, cyan power cell. Length in cm. */
function rifle(x, y, len, cell) {
  const k = len / 80;
  const P = (px, py) => `${f(x + px * k)},${f(y + py * k)}`;
  const body = `M${P(0, -3)}L${P(16, -4)}L${P(22, -7)}L${P(52, -7)}L${P(56, -4)}L${P(80, -4)}L${P(80, -1)}L${P(56, -1)}L${P(50, 2)}L${P(36, 2)}L${P(33, 10)}L${P(28, 10)}L${P(28, 2)}L${P(16, 2)}L${P(4, 6)}L${P(0, 6)}Z`;
  let s = path(body, "url(#dkF)", 1);
  s += line(`M${P(18, -5.5)}L${P(54, -5.5)}`, "#9fb0c0", 0.6, 0.5);
  s += rect(x + 38 * k, y - 14 * k, 12 * k, 6 * k, "#1a2028", 0.7, 1);
  if (cell) s += rect(x + 24 * k, y - 5.5 * k, 16 * k, 3 * k, "#0a4a55", 0.4, 0.6);
  return s;
}

/** Free-standing armory rack: pegboard with three weapons, cyan status strip. */
function weaponRack() {
  const w = 100;
  const x = -(w + 30 * OX) / 2;
  let s = shadow(4, -6, 64, 12);
  for (const fx of [x - 4, x + w - 12]) s += block(fx, -5, 16, 5, 30, "dk", { hi: 0 });
  s += block(x + 2, -178, 5, 173, 8, "dk", { top: false, hi: 0.25 });
  s += block(x + w - 7, -178, 5, 173, 8, "dk", { top: false, hi: 0.25 });
  s += rect(x + 7, -168, w - 14, 122, "url(#stF)", 1);
  // Pegboard holes.
  for (let r = 0; r < 11; r++) {
    for (let c = 0; c < 8; c++) s += ell(x + 13 + c * 10.6, -162 + r * 11, 0.9, 0.9, "#0d141b", 0, ` opacity=".7"`);
  }
  s += rect(x + 7, -168, w - 14, 5, "url(#ao)", 0);
  s += rect(x, -184, w, 8, "url(#dkF)", 1, 1);
  s += rect(x + 12, -181.5, w - 24, 2.4, "#062a33", 0.4);
  const guns = [[-150, 80], [-118, 70], [-84, 54]];
  const cells = [];
  for (const [gy, len] of guns) {
    const gx = x + (w - len) / 2;
    s += rect(gx + len * 0.18, gy + 1, 3, 6, "url(#chrome)", 0.5);
    s += rect(gx + len * 0.78, gy + 1, 3, 6, "url(#chrome)", 0.5);
    s += rifle(gx, gy, len, true);
    cells.push([gx + 24 * (len / 80), gy - 5.5 * (len / 80), 16 * (len / 80), 3 * (len / 80)]);
  }
  s += rim(`M${f(x + w - 2 + 8 * OX)},${f(zy(-176, 8))}v168`, 0.35);
  let glow = rect(x + 12, -181.5, w - 24, 2.4, "#22e6ff", 0, 0, ` filter="url(#glow)"`);
  glow += rect(x + 12, -181.2, w - 24, 1.6, "#bffcff", 0);
  for (const [cx, cy, cw, ch] of cells) glow += rect(cx, cy, cw, ch, "#22e6ff", 0, 0, ` filter="url(#glow)"`) + rect(cx + 0.5, cy + 0.6, cw - 1, ch - 1.2, "#bffcff", 0);
  return {
    box: [-62, -192, 128, 200],
    layers: [
      { markup: `<g>${s}</g>` },
      { markup: `<g>${glow}</g>`, shade: false, blend: "lighter", anim: { type: "pulse", min: 0.5, max: 1, speed: 2.2 } },
    ],
  };
}

/** Concrete jersey barrier: real profile on the end cap, hazard band, amber lamp. */
function barrier() {
  const w = 176;
  const depth = 60;
  const x0 = -(w + depth * OX) / 2;
  const x1 = x0 + w;
  // Profile (z depth, y height) from front base over the top to the back base.
  const prof = [[0, 0], [0, -8], [9, -26], [22, -80], [38, -80], [51, -26], [60, -8], [60, 0]];
  let s = shadow(6, -10, 108, 22);
  // Front faces: base kerb, lower slope, upper face.
  const face = (i, fill) => {
    const [za, ya] = prof[i];
    const [zb, yb] = prof[i + 1];
    return poly([pj(x0, ya, za), pj(x1, ya, za), pj(x1, yb, zb), pj(x0, yb, zb)], fill, 1);
  };
  s += face(2, "url(#ccF)");
  s += face(1, "url(#ccT)");
  s += face(0, "url(#ccS)");
  s += poly([pj(x0, -80, 22), pj(x1, -80, 22), pj(x1, -80, 38), pj(x0, -80, 38)], "url(#ccT)", 1);
  s += poly(prof.map(([z, yy]) => pj(x1, yy, z)), "url(#ccS)", 1.1);
  // Hazard stripes clipped to the upper face.
  const band = [pj(x0, -60, 16.9), pj(x1, -60, 16.9), pj(x1, -44, 12.8), pj(x0, -44, 12.8)];
  let stripes = "";
  for (let i = -2; i < 16; i++) {
    const sx = x0 + i * 13;
    stripes += `<path d="M${f(sx)},${f(band[2][1] + 2)}l13,0l14,-22l-13,0Z" fill="${i % 2 ? "#1c1c1c" : "#ffcc00"}"/>`;
  }
  s += `<clipPath id="hz"><polygon points="${pts(band)}"/></clipPath><g clip-path="url(#hz)">${stripes}</g>`;
  s += poly(band, "none", 0.6);
  s += poly(band, "url(#vert)", 0, ` opacity=".6"`);
  // Forklift slots, chips, cracks, speckle.
  for (const sx of [x0 + 34, x1 - 52]) s += poly([pj(sx, -2, 0), pj(sx + 18, -2, 0), pj(sx + 18, -7, 0), pj(sx, -7, 0)], "#1a1a18", 0.5);
  s += line(`M${f(x0 + 60)},-74l5,9l-2,7M${f(x1 - 40)},-72l-4,12`, "#2d2d2a", 0.6, 0.7);
  s += line(`M${f(x0 + 10)},-70l30,-1M${f(x0 + 90)},-36l40,-1`, "#f2f2ea", 0.7, 0.25);
  for (let i = 0; i < 26; i++) {
    const px = x0 + 16 + ((i * 53) % 150);
    const py = -36 - ((i * 29) % 36);
    s += ell(px + 6, py, 0.7, 0.7, i % 3 ? "#5c5c58" : "#dcdcd2", 0, ` opacity=".6"`);
  }
  s += rim(`${`M${pts([pj(x1, -8, 60)])}L${pts([pj(x1, -26, 51)])}L${pts([pj(x1, -80, 38)])}`}`, 0.35);
  // Warning lamp housing on top near the right end.
  const [lx, ly] = pj(x1 - 26, -80, 30);
  s += rect(lx - 5, ly - 4, 10, 4, "#1c2228", 0.8, 1);
  s += path(`M${f(lx - 4)},${f(ly - 4)}V${f(ly - 10)}C${f(lx - 4)},${f(ly - 15)} ${f(lx + 4)},${f(ly - 15)} ${f(lx + 4)},${f(ly - 10)}V${f(ly - 4)}Z`, "#8a4a08", 0.8);
  const glow =
    `<ellipse cx="${f(lx)}" cy="${f(ly - 9)}" rx="16" ry="12" fill="url(#warmG)"/>` +
    path(`M${f(lx - 3.4)},${f(ly - 4.5)}V${f(ly - 10)}C${f(lx - 3.4)},${f(ly - 14)} ${f(lx + 3.4)},${f(ly - 14)} ${f(lx + 3.4)},${f(ly - 10)}V${f(ly - 4.5)}Z`, "#ffc040", 0);
  return {
    box: [-110, -110, 222, 120],
    layers: [
      { markup: `<g>${s}</g>` },
      { markup: `<g>${glow}</g>`, shade: false, blend: "lighter", anim: { type: "blink", min: 0.08, max: 1, speed: 3.2 } },
    ],
  };
}

// ---------------------------------------------------------------------------
// Office kit: the station's furniture and what sits on it
// ---------------------------------------------------------------------------
//
// Builders that take `v` draw one of a type's variants (PROP_VARIANTS; the
// renderer picks one per placement by its cell, src/rendering/props.js), so
// a room of desks or chairs does not read as one drawing stamped about.

/** How far up the view a flat thing `dz` cm deep rises from its front edge at `y`. */
const rise = (y, dz) => (y - EYE) * dz * KZ;

/** A flat sheet lying on a surface: front-left corner (px, py), `w` wide, `dz` deep. */
function flat(px, py, w, dz, fill, sw = 0.5, extra = "") {
  const l = rise(py, dz);
  const k = dz * OX;
  return poly([[px, py], [px + w, py], [px + w + k, py - l], [px + k, py - l]], fill, sw, extra);
}

/** Lines of type across a flat sheet, as `flat` lays it. */
function typeLines(px, py, w, dz, n, color = "#55606c", op = 0.55) {
  let d = "";
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    const l = rise(py, dz * t);
    const x0 = px + dz * t * OX + w * 0.12;
    d += `M${f(x0)},${f(py - l)}h${f(w * (i === n ? 0.4 : 0.7))}`;
  }
  return line(d, color, 0.45, op);
}

/** A few sheets of paper squared up on a surface, the top one typed. */
function papers(px, py, n = 3, w = 26, dz = 20) {
  let s = "";
  for (let i = 0; i < n; i++) s += flat(px + ((i * 3) % 4) - 1.5, py - i * 0.7, w, dz, i % 2 ? "#e4e8ec" : "#f6f8fa", 0.4);
  return s + typeLines(px + 0.5, py - (n - 1) * 0.7, w, dz, 4);
}

/** Ceramic mug with a coloured band, coffee showing. */
const mug = (px, py, body = "#e9e4da", band = "#2c4f9e") =>
  path(`M${f(px - 4)},${f(py - 9)}V${f(py - 1)}C${f(px - 4)},${f(py + 0.8)} ${f(px + 4)},${f(py + 0.8)} ${f(px + 4)},${f(py - 1)}V${f(py - 9)}Z`, body, 0.7) +
  rect(px - 4, py - 6.5, 8, 2, band, 0) +
  line(`M${f(px - 2.6)},${f(py - 8)}V${f(py - 2)}`, "#fff", 0.8, 0.45) +
  ell(px, py - 9, 4, 1.3, "#3b2414", 0.5) +
  `<path d="M${f(px + 4)},${f(py - 7.5)}c3.6,0 3.6,5 0,5" fill="none" stroke="${INK}" stroke-width="1.6"/>` +
  `<path d="M${f(px + 4)},${f(py - 7.5)}c3.6,0 3.6,5 0,5" fill="none" stroke="${body}" stroke-width=".7"/>`;

/** Takeaway cup: tapered paper, card sleeve, lid. */
const paperCup = (px, py, sleeve = "#8a5a32") =>
  path(`M${f(px - 4.2)},${f(py - 13)}L${f(px - 3.1)},${f(py)}H${f(px + 3.1)}L${f(px + 4.2)},${f(py - 13)}Z`, "#f4f1e8", 0.6) +
  path(`M${f(px - 3.9)},${f(py - 10)}L${f(px - 3.5)},${f(py - 5)}H${f(px + 3.5)}L${f(px + 3.9)},${f(py - 10)}Z`, sleeve, 0.4) +
  rect(px - 4.8, py - 15, 9.6, 2.4, "#2a2e34", 0.5, 1) +
  line(`M${f(px - 2.4)},${f(py - 12)}L${f(px - 1.8)},${f(py - 2)}`, "#fff", 0.7, 0.5);

/** Flat-panel monitor on a foot at (cx, by): returns its markup and screen rect. */
function monitor(cx, by, sw = 50, sh = 31) {
  let m = ell(cx + 1, by - 1, 10, 2.4, "#1a2028", 0.6);
  m += rect(cx - 2, by - 15, 4, 14, "url(#pipe)", 0.6);
  const sx = cx - sw / 2;
  const sy = by - 15 - sh;
  m += block(sx, sy, sw, sh, 4, "dk", { hi: 0.25 });
  const scr = [sx + 2, sy + 2, sw - 4, sh - 6];
  m += rect(scr[0], scr[1], scr[2], scr[3], "url(#screenB)", 0.5);
  // A desktop: a case file open, a list beside it, the taskbar.
  m += rect(scr[0] + 3, scr[1] + 3, scr[2] * 0.5, scr[3] * 0.66, "#dfe8f1", 0, 0.5, ` opacity=".85"`);
  m += rect(scr[0] + 3, scr[1] + 3, scr[2] * 0.5, 2.2, "#2a6ac2", 0);
  m += rect(scr[0] + 5, scr[1] + 7, scr[2] * 0.14, scr[3] * 0.3, "#8a96a2", 0);
  m += line(`M${f(scr[0] + scr[2] * 0.24)},${f(scr[1] + 8)}h${f(scr[2] * 0.22)}M${f(scr[0] + scr[2] * 0.24)},${f(scr[1] + 11)}h${f(scr[2] * 0.18)}M${f(scr[0] + 5)},${f(scr[1] + scr[3] * 0.6)}h${f(scr[2] * 0.4)}`, "#4a5662", 0.6, 0.8);
  m += rect(scr[0] + scr[2] * 0.58, scr[1] + 6, scr[2] * 0.36, scr[3] * 0.5, "#a9c8e8", 0, 0.5, ` opacity=".55"`);
  m += rect(scr[0], scr[1] + scr[3] - 2.4, scr[2], 2.4, "#071830", 0);
  m += ell(sx + sw - 3.5, sy + sh - 2, 0.7, 0.7, "#7dff9a");
  return { m, scr };
}

/** Screen wash + bloom for an emissive layer, in a screen's colour. */
const screenGlow = ([x, y, w, h], tint = "#9fd0ff", bloom = "bloomB") =>
  rect(x, y, w, h, tint, 0, 0, ` opacity=".14"`) +
  `<ellipse cx="${f(x + w / 2)}" cy="${f(y + h / 2)}" rx="${f(w * 0.75)}" ry="${f(h * 0.9)}" fill="url(#${bloom})"/>`;

/**
 * A squad-room desk: walnut top on a three-drawer pedestal and a steel end
 * panel, 150×72 cm at 76 cm. Variants dress the top: a workstation, a
 * paperwork desk under a banker's lamp, a laptop and someone's coffee.
 */
function desk(v = 0) {
  const w = 150;
  const d = 72;
  const dx = d * OX;
  const x = -(w + dx) / 2;
  const top = -76;
  let s = shadow(8, -10, 96, 24);
  // Modesty panel set back, and the end panel on the right.
  s += rect(x + 48 + dx * 0.8, zy(top + 4, d * 0.8), w - 56, 44, "url(#wnS)", 0.8);
  s += block(x + w - 6, top + 4, 6, -top - 4, d - 4, "wn", { top: false, hi: 0.2 });
  s += rect(x + w - 8, -2.5, 10, 2.5, "#1a0f08", 0.5, 1);
  // Pedestal: a pencil drawer, two file drawers, a lock on the top one.
  s += block(x + 2, top + 4, 44, -top - 4, d - 4, "wn", { top: false });
  for (const [yy, hh] of [[top + 7, 12], [top + 21, 25], [top + 48, 25]]) {
    s += rect(x + 5, yy, 38, hh - 2, "url(#wnF)", 0.6, 0.8);
    s += line(`M${f(x + 5.8)},${f(yy + hh - 3)}V${f(yy + 0.8)}H${f(x + 42.2)}`, "#f0c89a", 0.5, 0.28);
    s += rect(x + 17, yy + (hh - 2) / 2 - 1.3, 14, 2.6, "url(#chrome)", 0.5, 1.2);
  }
  s += ell(x + 38.5, top + 12, 0.9, 0.9, "#1a1206");
  s += rect(x + 2, top + 4, 44, 5, "url(#ao)", 0);
  s += rect(x + 3, -3, 42, 3, "#1a0f08", 0, 0, ` opacity=".55"`);
  // Top slab and its darker edge band.
  s += block(x, top, w, 4, d, "wn", { hi: 0.45 });
  s += line(`M${f(x + 1)},${f(top + 3.3)}h${w - 2}`, "#2a160a", 0.7, 0.55);
  const at = (px, z) => pj(x + px, top, z);
  let glow = "";
  let [px, py] = [0, 0];
  if (v === 0) {
    // Workstation: monitor, keyboard and mouse, the in-tray, a mug.
    [px, py] = at(6, 30);
    s += block(px, py - 6, 30, 6, 22, "dk", { hi: 0.3 });
    s += papers(px + 2, py - 4.5, 3, 26, 18);
    [px, py] = at(70, 48);
    const mon = monitor(px, py);
    s += mon.m;
    glow += screenGlow(mon.scr);
    [px, py] = at(50, 12);
    s += flat(px, py, 42, 14, "#1a2028", 0.7);
    s += line(`M${f(px + 4)},${f(py - 2.5)}h${f(34)}M${f(px + 6)},${f(py - 4.6)}h${f(34)}M${f(px + 8)},${f(py - 6.7)}h${f(32)}`, "#56646f", 0.7, 0.75);
    [px, py] = at(100, 14);
    s += ell(px, py - 1.5, 3, 1.8, "#22282f", 0.6) + ell(px - 0.6, py - 2.3, 1.2, 0.6, "#8a96a2");
    [px, py] = at(124, 22);
    s += mug(px, py);
  } else if (v === 1) {
    // Paperwork: case folders, a pad and pen, the phone, a banker's lamp.
    [px, py] = at(8, 26);
    for (let i = 0; i < 4; i++) s += flat(px + i * 1.2, py - i * 1.4, 32, 22, ["#d9b55c", "#e3c46a", "#c9a34c", "#e8cf7e"][i], 0.5);
    s += flat(px + 3.6, py - 5.6, 6, 3, "#c0392b", 0.4);
    s += typeLines(px + 4, py - 5.6, 32, 22, 3, "#6a5420", 0.5);
    [px, py] = at(58, 14);
    s += flat(px, py, 22, 26, "#f2eecf", 0.5);
    s += typeLines(px, py, 22, 26, 5, "#5a6a8a", 0.5);
    s += line(`M${f(px + 22)},${f(py - 4)}l12,-6`, INK, 2.2, 1) + line(`M${f(px + 22)},${f(py - 4)}l12,-6`, "#2a4a9a", 1.2, 1);
    [px, py] = at(92, 40);
    s += block(px, py - 7, 22, 7, 16, "dk", { hi: 0.3 });
    s += path(`M${f(px + 1)},${f(py - 9)}h20c1,0 1,-4 -1,-4h-18c-2,0 -2,4 -1,4Z`, "url(#dkT)", 0.7);
    s += rect(px + 14, py - 5.5, 6, 3, "#0a0f14", 0.4);
    s += `<path d="M${f(px)},${f(py - 4)}c-6,2 -4,6 -9,8" fill="none" stroke="${INK}" stroke-width="1"/>`;
    glow += lamp(px + 5, py - 4, 0.8, "#ff3344", "#ffd0d6");
    [px, py] = at(124, 52);
    s += ell(px + 2, py - 1, 9, 2.2, "url(#brassC)", 0.7);
    s += rect(px, py - 26, 3, 25, "url(#brassC)", 0.6);
    s += path(`M${f(px - 15)},${f(py - 25)}C${f(px - 15)},${f(py - 35)} ${f(px + 19)},${f(py - 35)} ${f(px + 19)},${f(py - 25)}Z`, "url(#bankers)", 0.9);
    s += line(`M${f(px - 13)},${f(py - 29)}C${f(px - 8)},${f(py - 33)} ${f(px + 4)},${f(py - 33.5)} ${f(px + 10)},${f(py - 32)}`, "#d8ffe6", 0.8, 0.55);
    glow += `<ellipse cx="${f(px + 2)}" cy="${f(py - 18)}" rx="26" ry="14" fill="url(#warmG)" opacity=".7"/>`;
    glow += rect(px - 14, py - 25.6, 32, 1.6, "#fff4c8", 0, 0.8, ` opacity=".9"`);
  } else {
    // A laptop open on a pile of reports, the nameplate, the pen cup.
    [px, py] = at(40, 22);
    s += papers(px - 18, py + 3, 2, 30, 22);
    s += flat(px, py, 40, 26, "#2a3038", 0.7);
    s += flat(px + 4, py - 2, 32, 12, "#1a1f26", 0);
    const [hx, hy] = [px + 26 * OX, py - rise(py, 26)];
    s += poly([[hx, hy], [hx + 40, hy], [hx + 42, hy - 27], [hx + 2, hy - 27]], "url(#dkF)", 0.8);
    const scr = [hx + 4, hy - 25, 34, 21];
    s += poly([[scr[0], scr[1] + scr[3]], [scr[0] + scr[2], scr[1] + scr[3]], [scr[0] + scr[2] + 1.2, scr[1]], [scr[0] + 1.2, scr[1]]], "url(#screenB)", 0.4);
    s += rect(scr[0] + 4, scr[1] + 3, 14, 12, "#dfe8f1", 0, 0.5, ` opacity=".8"`) + rect(scr[0] + 4, scr[1] + 3, 14, 2, "#2a6ac2", 0);
    s += line(`M${f(scr[0] + 21)},${f(scr[1] + 5)}h10M${f(scr[0] + 21)},${f(scr[1] + 8)}h8M${f(scr[0] + 21)},${f(scr[1] + 11)}h9`, "#bcd6f0", 0.8, 0.7);
    glow += screenGlow(scr);
    [px, py] = at(96, 6);
    s += poly([[px, py], [px + 26, py], [px + 25, py - 6], [px + 1, py - 6]], "url(#brF)", 0.6);
    s += rect(px + 3, py - 4.6, 20, 3.2, "#1a1206", 0, 0.4);
    s += line(`M${f(px + 5)},${f(py - 3)}h7M${f(px + 14)},${f(py - 3)}h6`, "#e8cf7e", 0.7, 0.9);
    [px, py] = at(126, 40);
    s += path(`M${f(px - 3.5)},${f(py - 9)}V${f(py)}H${f(px + 3.5)}V${f(py - 9)}Z`, "url(#dkF)", 0.6);
    s += line(`M${f(px - 2)},${f(py - 9)}l-2,-7M${f(px)},${f(py - 9)}l1,-8M${f(px + 2)},${f(py - 9)}l3,-6`, "#2a4a9a", 1, 1);
    s += line(`M${f(px)},${f(py - 9)}l1,-8`, "#c0392b", 1, 1);
    [px, py] = at(112, 20);
    s += paperCup(px, py);
  }
  s += rim(`M${f(x + w + dx)},${f(zy(top, d) + 1)}v3`, 0.5);
  s += rim(`M${f(x + w + dx * 0.95)},${f(zy(top + 5, d - 4))}V${f(zy(-1, d - 4))}`, 0.25);
  const layers = [{ markup: `<g>${s}</g>` }];
  if (glow) layers.push({ markup: `<g>${glow}</g>`, shade: false, blend: "lighter", anim: { type: "pulse", min: 0.8, max: 1, speed: 1.3 } });
  return { box: [-96, -150, 192, 162], layers };
}

/**
 * Steel filing cabinet. Variants: grey three-drawer with a folder tab
 * caught in the top; tall putty four-drawer with an archive box on it; grey
 * three-drawer with its top drawer pulled out on the files.
 */
function filingCabinet(v = 0) {
  const tall = v === 1;
  const w = 50;
  const n = tall ? 4 : 3;
  const h = tall ? 136 : 106;
  const d = 62;
  const m = tall ? "bg" : "gy";
  const x = -(w + d * OX) / 2;
  const y = -h;
  const dh = (h - 6) / n;
  let s = shadow(6, -8, 42, 16);
  s += rect(x + 2, -4, w - 4, 4, "#1d2126", 0.6);
  s += block(x, y, w, h - 3, d, m);
  for (let i = 0; i < n; i++) {
    const yy = y + 3 + i * dh;
    s += rect(x + 3, yy, w - 6, dh - 3, `url(#${m}F)`, 0.7, 0.6);
    s += line(`M${f(x + 3.8)},${f(yy + dh - 4)}V${f(yy + 0.8)}H${f(x + w - 3.8)}`, "#fff", 0.5, 0.45);
    s += rect(x + 17, yy + 5, 16, 6, "#f4f1e6", 0.5, 0.5);
    s += line(`M${f(x + 19)},${f(yy + 8)}h${6 + ((i * 5) % 6)}`, "#556", 0.5, 0.6);
    s += rect(x + 14, yy + 14, 22, 4, "url(#chrome)", 0.6, 2);
    s += rect(x + 3, yy + dh - 3, w - 6, 3, "url(#ao)", 0);
  }
  if (v === 0) {
    s += poly([[x + 32, y + 4], [x + 36, y - 1], [x + 44, y - 1], [x + 44, y + 4]], "#e3c46a", 0.5);
    // A desk fan on top, its cage catching the light.
    const [fx, fy] = pj(x + 18, y, d * 0.5);
    s += ell(fx, fy - 1, 8, 2, "#2a3038", 0.6) + rect(fx - 1.5, fy - 12, 3, 11, "#3a4048", 0.5);
    s += ell(fx, fy - 20, 10, 10, "#1a2028", 0.8) + ell(fx, fy - 20, 8.6, 8.6, "none", 0, ` stroke="#9aa6b2" stroke-width=".5"`);
    s += line(`M${f(fx - 8)},${f(fy - 20)}h16M${f(fx)},${f(fy - 28)}v16M${f(fx - 6)},${f(fy - 26)}l12,12M${f(fx + 6)},${f(fy - 26)}l-12,12`, "#9aa6b2", 0.4, 0.7);
    s += ell(fx, fy - 20, 2, 2, "url(#chrome)", 0.5);
  } else if (v === 1) {
    // An archive box on top: kraft, a hand-written label.
    const [bx, by] = pj(x + 3, y, d * 0.3);
    s += block(bx, by - 26, 42, 26, 32, "kr", { hi: 0.3 });
    s += rect(bx, by - 26, 42, 5, "url(#krS)", 0.5);
    s += rect(bx + 9, by - 16, 24, 9, "#f4f1e6", 0.5, 0.5);
    s += line(`M${f(bx + 11)},${f(by - 13)}l3,-1l3,1.5l3,-2l3,1M${f(bx + 11)},${f(by - 10)}h14`, "#2a3a6a", 0.6, 0.8);
    s += rect(bx + 3, by - 13, 5, 2.6, "#3a2a14", 0, 1.2);
  } else {
    // Top drawer pulled out at the viewer: its front, its sides, the files.
    const yy = y + 3;
    const out = 26;
    const [ox, oy] = pj(x + 3, yy, -out);
    const back = pj(x + 3, yy, 0);
    s += poly([[ox + w - 6, oy], [back[0] + w - 6, back[1]], [back[0] + w - 6, back[1] + dh - 3], [ox + w - 6, oy + dh - 3]], "url(#gyS)", 0.7);
    s += poly([[ox, oy], [ox + w - 6, oy], [back[0] + w - 6, back[1]], [back[0], back[1]]], "#20262c", 0.6);
    for (let i = 0; i < 6; i++) {
      const t = 0.15 + i * 0.13;
      const [tx, ty] = pj(x + 5, yy, -out * (1 - t));
      s += poly([[tx, ty + 1], [tx + w - 10, ty + 1], [tx + w - 10, ty - 5], [tx + 4 + (i % 3) * 10, ty - 5], [tx + 2 + (i % 3) * 10, ty - 8], [tx + 2, ty - 8]], ["#e3c46a", "#d9b55c", "#c9d6e8", "#e8cf7e"][i % 4], 0.4);
    }
    s += rect(ox, oy, w - 6, dh - 3, "url(#gyF)", 0.8, 0.6);
    s += line(`M${f(ox + 0.8)},${f(oy + dh - 4)}V${f(oy + 0.8)}H${f(ox + w - 6.8)}`, "#fff", 0.5, 0.45);
    s += rect(ox + 14, oy + 5, 16, 6, "#f4f1e6", 0.5, 0.5);
    s += rect(ox + 11, oy + 14, 22, 4, "url(#chrome)", 0.6, 2);
    s += rect(x + 3, yy + dh - 3, w - 6, 5, "url(#ao)", 0);
  }
  s += rim(`M${f(x + w + d * OX)},${f(zy(y, d) + 1)}V${f(zy(-4, d))}`, 0.35);
  return { box: [-46, -176, 96, 186], layers: [{ markup: `<g>${s}</g>` }] };
}

/**
 * Security console: steel desk with twin monitors and a keyboard. Variants:
 * green status readouts, or the cameras' feeds in a grid.
 */
function monitorBank(v = 0) {
  const w = 150;
  const d = 60;
  const dx = d * OX;
  const x = -(w + dx) / 2;
  const top = -76;
  let s = shadow(6, -10, 92, 20);
  s += block(x + 4, top + 5, w - 8, -top - 5, d - 8, "dk", { top: false });
  s += vents(x + 16, top + 18, 40, 5, 4.4);
  s += vents(x + w - 60, top + 18, 40, 5, 4.4);
  s += rect(x + 64, top + 16, 22, 10, "#0a0f14", 0.6, 1);
  s += rect(x + 4, top + 5, w - 8, 5, "url(#ao)", 0);
  s += rect(x + 5, -3, w - 10, 3, "#05080b", 0, 0, ` opacity=".6"`);
  s += block(x, top, w, 5, d, "st", { hi: 0.4 });
  let [kx, ky] = pj(x + 45, top, 14);
  s += flat(kx, ky, 60, 12, "#1a2028", 0.7);
  s += line(`M${f(kx + 4)},${f(ky - 2)}h52M${f(kx + 6)},${f(ky - 4)}h52M${f(kx + 8)},${f(ky - 6)}h50`, "#56646f", 0.6, 0.7);
  [kx, ky] = pj(x + 116, top, 18);
  s += mug(kx, ky, "#2a3038", "#c8a040");
  [kx, ky] = pj(x + 10, top, 16);
  s += flat(kx, ky, 22, 26, "#f2eecf", 0.5) + typeLines(kx, ky, 22, 26, 5, "#5a6a8a", 0.5);
  const [mx, my] = pj(0, top, 40);
  s += rect(mx - 3, my - 22, 6, 22, "url(#pipe)", 0.8);
  s += poly([[mx - 14, my], [mx + 14, my], [mx + 17, my - 3], [mx - 11, my - 3]], "url(#dkT)", 0.7);
  const screens = [];
  let readouts = "";
  for (const side of [-1, 1]) {
    const sx = mx + side * 33 - 30;
    const sy = my - 64;
    s += block(sx, sy, 60, 40, 8, "dk", { hi: 0.3 });
    const scr = [sx + 3.5, sy + 3.5, 53, 31];
    if (v === 1) {
      s += rect(scr[0], scr[1], scr[2], scr[3], "url(#cctv)", 0.7);
      const tw = scr[2] / 2;
      const th = scr[3] / 2;
      for (let i = 0; i < 4; i++) {
        const tx = scr[0] + (i % 2) * tw;
        const ty = scr[1] + (i >> 1) * th;
        s += line(`M${f(tx + 1)},${f(ty + th - 1)}L${f(tx + tw * 0.42)},${f(ty + th * 0.45)}M${f(tx + tw - 1)},${f(ty + th - 1)}L${f(tx + tw * 0.58)},${f(ty + th * 0.45)}`, "#a9bccc", 0.5, 0.65);
        s += rect(tx + tw * 0.4, ty + th * 0.28, tw * 0.2, th * 0.18, "#71889c", 0, 0, ` opacity=".75"`);
        if ((i + side) % 3 === 0) s += rect(tx + tw * 0.6, ty + th * 0.5, 2, 5, "#cfd8e0", 0, 0.8, ` opacity=".7"`);
        s += rect(tx + 1.5, ty + 1.5, tw * 0.45, 1.4, "#e8f0f6", 0, 0, ` opacity=".6"`);
      }
      s += line(`M${f(scr[0] + tw)},${f(scr[1])}v${f(scr[3])}M${f(scr[0])},${f(scr[1] + th)}h${f(scr[2])}`, "#05080b", 1, 0.9);
      readouts += ell(scr[0] + tw - 3, scr[1] + 3, 1, 1, "#ff3344");
    } else {
      s += rect(scr[0], scr[1], scr[2], scr[3], "url(#screen)", 0.7);
      for (let ln = 0; ln < 5; ln++) {
        const lw = 18 + ((ln * 37 + side * 11 + 60) % 26);
        s += rect(sx + 7, sy + 8 + ln * 5, lw, 1.6, "#00cc66", 0, 0, ` opacity=".75"`);
        if (REAL) readouts += rect(sx + 7, sy + 8 + ln * 5, lw, 1.6, "#5dffa8", 0, 0, ` opacity=".55"`);
      }
      s += `<rect x="${f(sx + 36)}" y="${f(sy + 22)}" width="16" height="9" fill="none" stroke="#00cc66" stroke-width=".4" stroke-opacity=".7"/>`;
      s += line(`M${f(sx + 37)},${f(sy + 29)}l3,-3l3,2l3,-5l3,3l3,-2`, "#9dffcc", 0.5, 0.8);
    }
    s += ell(sx + 54, sy + 38, 0.8, 0.8, "#00ff88");
    screens.push(scr);
  }
  s += rim(`M${f(x + w + dx)},${f(zy(top, d) + 1)}V${f(zy(-5, d))}`, 0.3);
  let glow = "";
  for (const scr of screens) glow += v === 1 ? screenGlow(scr, "#cfe2f2") : screenGlow(scr, "#00ff88", "bloomG");
  glow += readouts;
  glow += lamp(x + 68, top + 21, 0.9, "#ff3344", "#ffd0d6") + lamp(x + 75, top + 21, 0.9, "#00ff88", "#d0ffe6");
  return {
    box: [-94, -158, 190, 168],
    layers: [
      { markup: `<g>${s}</g>` },
      {
        markup: `<g>${glow}</g>`,
        shade: false,
        blend: "lighter",
        anim: { type: "flicker", min: 0.55, max: 1, speed: 2.2 },
        scan: { rects: screens, speed: 9, color: v === 1 ? "#cfe2f2" : "#00ff88", alpha: v === 1 ? 0.22 : 0.35 },
      },
    ],
  };
}

/**
 * Break-room table: laminate top on four steel tube legs. Variants: a cup
 * and the napkins; the morning's box of doughnuts; the paper and a mug.
 */
function table(v = 0) {
  const w = 110;
  const d = 75;
  const dx = d * OX;
  const x = -(w + dx) / 2;
  const top = -74;
  let s = shadow(8, -10, 76, 24);
  const legs = [[x + 5, d - 6], [x + w - 10, d - 6], [x + 5, 2], [x + w - 10, 2]];
  for (const [lx, z] of legs) {
    const [px, py] = pj(lx, top, z);
    s += rect(px, py + 4, 4.5, zy(0, z) - py - 4, z > 10 ? "url(#dkS)" : "url(#pipe)", 0.8);
    s += rect(px - 1.5, zy(0, z) - 2.5, 7.5, 2.5, "#15191e", 0.5, 1);
  }
  s += block(x + 4, top + 4, w - 8, 5, d - 6, "dk", { top: false, hi: 0 });
  s += block(x, top, w, 4.5, d, "lm", { hi: 0.45 });
  s += line(`M${f(x + 1)},${f(top + 3.8)}h${w - 2}`, "#4a3f34", 0.6, 0.5);
  const at = (px, z) => pj(x + px, top, z);
  let [px, py] = [0, 0];
  if (v === 0) {
    [px, py] = at(30, 30);
    s += paperCup(px, py, "#c0392b");
    [px, py] = at(70, 40);
    s += block(px, py - 9, 12, 9, 6, "st", { hi: 0.3 });
    s += rect(px + 1.5, py - 12, 9, 4, "#fdfdfb", 0.5);
    [px, py] = at(14, 14);
    s += flat(px, py, 16, 14, "#f6f4ee", 0.4);
  } else if (v === 1) {
    // An open box of doughnuts, the lid up at the back, two gone.
    [px, py] = at(22, 18);
    s += flat(px, py, 46, 36, "#f2ece2", 0.6);
    const [lx, ly] = [px + 36 * OX, py - rise(py, 36)];
    s += poly([[lx, ly], [lx + 46, ly], [lx + 48, ly - 20], [lx + 2, ly - 20]], "#e98aa8", 0.7);
    s += line(`M${f(lx + 6)},${f(ly - 10)}h${f(34)}`, "#fff", 1.4, 0.7);
    const icing = ["#7a3e1c", "#f2a0c0", "#f4e7c4", "#7a3e1c"];
    for (let i = 0; i < 6; i++) {
      if (i === 1 || i === 4) continue;
      const cx = px + 9 + (i % 3) * 14 + (i > 2 ? 10 : 2);
      const cy = py - 4 - (i > 2 ? 8 : 0);
      s += ell(cx, cy, 6, 2.6, "#c98a48", 0.5) + ell(cx, cy - 0.8, 5, 2, icing[i % 4], 0) + ell(cx, cy - 0.8, 1.6, 0.6, "#3a2410");
      if (i % 2 === 0) s += line(`M${f(cx - 3)},${f(cy - 1)}h1M${f(cx + 1)},${f(cy - 1.6)}h1M${f(cx + 2.5)},${f(cy - 0.3)}h1`, "#4ad0ff", 0.6, 0.9);
    }
    [px, py] = at(84, 22);
    s += paperCup(px, py);
    [px, py] = at(92, 46);
    s += paperCup(px, py, "#2c4f9e");
  } else {
    // The paper folded open at the sport, a mug, the sugar.
    [px, py] = at(16, 22);
    s += flat(px, py, 44, 30, "#e2e2da", 0.5);
    s += flat(px + 2, py - 1, 40, 6, "#2a2e34", 0);
    s += typeLines(px + 1, py - 1, 42, 30, 6, "#6a6e74", 0.55);
    s += flat(px + 24, py - 4, 14, 12, "#8a96a2", 0);
    [px, py] = at(74, 28);
    s += mug(px, py, "#c0392b", "#f4f1e8");
    [px, py] = at(90, 50);
    s += path(`M${f(px - 3.5)},${f(py - 10)}V${f(py)}H${f(px + 3.5)}V${f(py - 10)}Z`, "#e6eef4", 0.6, ` opacity=".85"`);
    s += rect(px - 3.5, py - 6, 7, 6, "#fbfaf4", 0);
    s += path(`M${f(px - 3.5)},${f(py - 10)}C${f(px - 3.5)},${f(py - 14)} ${f(px + 3.5)},${f(py - 14)} ${f(px + 3.5)},${f(py - 10)}Z`, "url(#chrome)", 0.6);
  }
  s += rim(`M${f(x + w + dx)},${f(zy(top, d) + 1)}v3.5`, 0.5);
  return { box: [-80, -112, 164, 122], layers: [{ markup: `<g>${s}</g>` }] };
}

/**
 * Office swivel chair: padded seat at knee height, armrests, star base on
 * casters. Variants: charcoal mesh back; navy high-back with a headrest;
 * charcoal with a uniform jacket hung over it.
 */
function chair(v = 0) {
  const sw = 50;
  const d = 46;
  const dx = d * OX;
  const x = -(sw + dx) / 2;
  const seat = -48;
  const fab = v === 1 ? "nv" : "fb";
  const tall = v === 1 ? 66 : 50;
  let s = shadow(4, -6, 38, 12);
  const [bx, by] = pj(x + 3, seat - 2, d - 6);
  const bw = sw - 6;
  // J-bar from under the seat up the back of the backrest.
  const [jx, jy] = pj(x + sw / 2, seat + 8, d * 0.5);
  s += path(`M${f(jx - 2)},${f(jy)}L${f(bx + bw / 2 + 4)},${f(by + 2)}V${f(by - 20)}h-6V${f(by - 3)}L${f(jx - 6)},${f(jy - 4)}Z`, "url(#pipe)", 0.8);
  // The back: a rounded pad, its lumbar seam, a lit edge on the left.
  const bt = by - tall;
  s += path(`M${f(bx)},${f(by - 6)}C${f(bx - 2)},${f(by - tall * 0.6)} ${f(bx)},${f(bt + 4)} ${f(bx + 6)},${f(bt)}H${f(bx + bw - 6)}C${f(bx + bw)},${f(bt + 4)} ${f(bx + bw + 2)},${f(by - tall * 0.6)} ${f(bx + bw)},${f(by - 6)}Z`, `url(#${fab}F)`, 1.1);
  if (v === 1) {
    s += path(`M${f(bx + 9)},${f(bt + 1)}C${f(bx + 9)},${f(bt - 12)} ${f(bx + bw - 9)},${f(bt - 12)} ${f(bx + bw - 9)},${f(bt + 1)}Z`, `url(#${fab}F)`, 1);
    for (let i = 1; i < 4; i++) s += line(`M${f(bx + (bw * i) / 4)},${f(bt + 5)}V${f(by - 10)}`, "#0c1122", 0.6, 0.5);
  } else {
    // Mesh: a fine weave over the frame.
    let mesh = "";
    for (let i = 1; i < 9; i++) mesh += `M${f(bx + 4)},${f(by - 8 - i * (tall - 12) / 9)}h${f(bw - 8)}`;
    s += line(mesh, "#9a9ab8", 0.35, 0.3);
  }
  s += path(`M${f(bx + 5)},${f(by - 12)}C${f(bx + 4)},${f(by - tall * 0.6)} ${f(bx + 6)},${f(bt + 8)} ${f(bx + 10)},${f(bt + 4)}H${f(bx + bw - 10)}C${f(bx + bw - 6)},${f(bt + 8)} ${f(bx + bw - 4)},${f(by - tall * 0.6)} ${f(bx + bw - 5)},${f(by - 12)}Z`, "none", 0.5, ` stroke-opacity=".55"`);
  s += line(`M${f(bx + 2.5)},${f(bt + 8)}C${f(bx + 0.5)},${f(by - tall * 0.5)} ${f(bx + 1.5)},${f(by - 18)} ${f(bx + 2)},${f(by - 8)}`, v === 1 ? "#8ea4d4" : "#9a9ab8", 1, 0.4);
  s += rim(`M${f(bx + bw - 0.5)},${f(bt + 6)}C${f(bx + bw + 1.5)},${f(by - tall * 0.5)} ${f(bx + bw + 1.2)},${f(by - 18)} ${f(bx + bw - 0.5)},${f(by - 8)}`, 0.4);
  // Star base with casters and the gas lift.
  const [cx, cy] = pj(x + sw / 2, 0, d / 2);
  const liftTop = zy(seat + 6, d / 2);
  s += rect(cx - 2.5, liftTop, 5, cy - 4 - liftTop, "url(#chrome)", 0.8);
  s += rect(cx - 3.5, cy - 12, 7, 8, "url(#dkF)", 0.6, 1);
  for (const [lx, ly] of [[-26, 2], [26, 1], [-14, -9], [16, -10], [0, 5]]) {
    s += line(`M${f(cx)},${f(cy - 4)}L${f(cx + lx)},${f(cy + ly - 2)}`, INK, 4.6, 1);
    s += line(`M${f(cx)},${f(cy - 4)}L${f(cx + lx)},${f(cy + ly - 2)}`, "#2b3139", 2.6, 1);
    s += ell(cx + lx, cy + ly, 2.6, 2.4, "url(#rubber)", 0.6);
  }
  // Seat cushion, its rolled front edge.
  s += block(x, seat, sw, 8, d, fab, { rx: 0, hi: 0.3 });
  s += rect(x, seat, sw, 8, "url(#vert)", 0);
  s += line(`M${f(x + 2)},${f(seat + 1.4)}h${sw - 4}`, "#fff", 0.6, 0.25);
  // Armrests: a post either side and a pad.
  for (const ax of [x - 2, x + sw - 3]) {
    const [ox, oy] = pj(ax, seat - 18, 12);
    s += rect(ox + 1, oy + 3, 3.5, zy(seat + 2, 12) - oy - 3, "url(#dkF)", 0.6);
    s += block(ox - 1, oy, 6, 3.5, 22, "dk", { hi: 0.3 });
  }
  if (v === 2) {
    // A uniform jacket hung over the back: shoulders, a sleeve each side,
    // the division's patch catching the light.
    const jt = bt + 2;
    s += path(`M${f(bx - 3)},${f(jt + 8)}C${f(bx - 2)},${f(jt - 2)} ${f(bx + bw + 2)},${f(jt - 2)} ${f(bx + bw + 3)},${f(jt + 8)}L${f(bx + bw + 4)},${f(jt + 30)}C${f(bx + bw / 2 + 8)},${f(jt + 34)} ${f(bx + bw / 2 - 8)},${f(jt + 30)} ${f(bx - 4)},${f(jt + 32)}Z`, "url(#nvF)", 1);
    s += path(`M${f(bx - 4)},${f(jt + 10)}C${f(bx - 9)},${f(jt + 24)} ${f(bx - 8)},${f(jt + 40)} ${f(bx - 6)},${f(jt + 52)}L${f(bx)},${f(jt + 52)}C${f(bx - 1)},${f(jt + 40)} ${f(bx)},${f(jt + 26)} ${f(bx + 2)},${f(jt + 14)}Z`, "url(#nvF)", 0.9);
    s += path(`M${f(bx + bw + 3)},${f(jt + 10)}C${f(bx + bw + 7)},${f(jt + 22)} ${f(bx + bw + 7)},${f(jt + 34)} ${f(bx + bw + 6)},${f(jt + 44)}L${f(bx + bw + 1)},${f(jt + 44)}C${f(bx + bw + 1)},${f(jt + 34)} ${f(bx + bw)},${f(jt + 24)} ${f(bx + bw - 1)},${f(jt + 14)}Z`, "url(#nvS)", 0.9);
    s += line(`M${f(bx + 4)},${f(jt + 4)}C${f(bx + 14)},${f(jt + 1)} ${f(bx + bw - 14)},${f(jt + 1)} ${f(bx + bw - 4)},${f(jt + 4)}`, "#8ea4d4", 0.8, 0.5);
    s += path(`M${f(bx - 7)},${f(jt + 18)}l5,-1.5v7l-2.5,2.5l-2.5,-2.5Z`, "#c8a040", 0.5);
    s += rect(bx - 7, jt + 50, 7, 3, "#c8a040", 0, 0, ` opacity=".6"`);
  }
  return { box: [-40, -134, 88, 142], layers: [{ markup: `<g>${s}</g>` }] };
}

/**
 * Stacking chair for the lobby, the break room and the interview rooms: a
 * moulded shell on four chrome tube legs. Variants: blue shell, charcoal.
 */
function stackChair(v = 0) {
  const w = 46;
  const d = 46;
  const x = -(w + d * OX) / 2;
  const seat = -45;
  const shell = v === 1 ? "dk" : "pl";
  let s = shadow(3, -5, 32, 10);
  // Rear legs and the back's two struts.
  for (const lx of [x + 3, x + w - 6]) {
    const [px, py] = pj(lx, seat + 3, d - 6);
    s += rect(px, py, 2.6, zy(0, d - 6) - py, "url(#pipe)", 0.6);
    s += rect(px - 1, zy(0, d - 6) - 1.5, 4.6, 1.5, "#15191e", 0.4);
  }
  const b0 = pj(x + 3, seat - 2, d - 8);
  const b1 = pj(x + w - 3, seat - 2, d - 8);
  const b2 = pj(x + w - 2, seat - 44, d - 1);
  const b3 = pj(x + 2, seat - 44, d - 1);
  for (const t of [0.22, 0.78]) {
    const sx = b0[0] + (b1[0] - b0[0]) * t;
    s += rect(sx - 1.2, b0[1] - 10, 2.4, 12, "url(#chrome)", 0.5);
  }
  // The back shell, curved across the top, a hand slot.
  s += path(`M${f(b0[0])},${f(b0[1] - 8)}L${f(b3[0])},${f(b3[1] + 6)}C${f(b3[0] + 4)},${f(b3[1] - 2)} ${f(b2[0] - 4)},${f(b2[1] - 2)} ${f(b2[0])},${f(b2[1] + 6)}L${f(b1[0])},${f(b1[1] - 8)}C${f(b1[0] - 10)},${f(b1[1] - 5)} ${f(b0[0] + 10)},${f(b0[1] - 5)} ${f(b0[0])},${f(b0[1] - 8)}Z`, `url(#${shell}F)`, 1);
  const hx = (b2[0] + b3[0]) / 2;
  s += rect(hx - 7, b3[1] + 5, 14, 3.2, "#0a0f14", 0.4, 1.6);
  s += line(`M${f(b3[0] + 2)},${f(b3[1] + 7)}C${f(b3[0] + 2)},${f(b3[1] + 18)} ${f(b0[0] + 1)},${f(b0[1] - 20)} ${f(b0[0] + 1.5)},${f(b0[1] - 9)}`, "#fff", 0.9, 0.3);
  s += rim(`M${f(b2[0] - 1)},${f(b2[1] + 8)}L${f(b1[0] - 1)},${f(b1[1] - 9)}`, 0.35);
  // Seat pan and its rolled front.
  s += block(x, seat, w, 4, d - 2, shell, { hi: 0.35 });
  s += path(`M${f(x)},${f(seat + 4)}C${f(x)},${f(seat + 7)} ${f(x + w)},${f(seat + 7)} ${f(x + w)},${f(seat + 4)}Z`, `url(#${shell}S)`, 0.6);
  // Front legs.
  for (const lx of [x + 3, x + w - 6]) {
    s += rect(lx, seat + 5, 2.8, -seat - 6, "url(#chrome)", 0.6);
    s += rect(lx - 1, -1.8, 4.8, 1.8, "#15191e", 0.4);
  }
  return { box: [-36, -102, 76, 110], layers: [{ markup: `<g>${s}</g>` }] };
}

/** Changing-room bench: varnished slats on a steel U-frame; what was left on it varies. */
function bench(v = 0) {
  const w = 150;
  const d = 36;
  const dx = d * OX;
  const x = -(w + dx) / 2;
  const top = -45;
  let s = shadow(2, -6, 88, 14);
  for (const lx of [x + 12, x + w - 18]) {
    s += rect(lx + dx * 0.85, zy(top + 6, d * 0.85), 5, zy(0, d * 0.85) - zy(top + 6, d * 0.85), "url(#dkS)", 0.8);
  }
  if (v === 2) {
    // A pair of boots under it, toes out.
    for (const bx of [x + 52, x + 66]) {
      s += path(`M${f(bx)},-1V-16h9V-7c5,0 9,2 9,6Z`, "url(#dkF)", 0.8);
      s += line(`M${f(bx + 1)},-15h7M${f(bx + 1)},-12h7`, "#56646f", 0.5, 0.6);
      s += rect(bx - 0.5, -2, 19, 2, "#0a0d10", 0.4, 0.8);
    }
  }
  for (const lx of [x + 12, x + w - 18]) {
    s += block(lx, top + 6, 5, -top - 6, 4, "dk", { top: false, hi: 0.2 });
    s += rect(lx - 3, -2, 11, 2.5, "#1a1f26", 0.6, 1);
  }
  s += block(x + 12, top + 10, w - 24, 3.5, d * 0.85, "dk", { hi: 0 });
  for (let i = 2; i >= 0; i--) {
    const z = (i * d) / 3;
    const [sx, sy] = pj(x, top, z);
    s += block(sx, sy, w, 5, d / 3 - 1.5, "wd", { side: true, hi: i === 0 ? 0.35 : 0 });
  }
  s += line(`M${f(x + 8)},${top + 2}h40M${f(x + 70)},${top + 3}h52`, "#3a2806", 0.4, 0.45);
  for (const lx of [x + 14.5, x + w - 15.5]) s += ell(lx, top + 2.5, 0.9, 0.9, "#1a1206");
  if (v === 1) {
    // A folded towel and a kit bag left on it.
    let [px, py] = pj(x + 14, top, 6);
    s += block(px, py - 7, 30, 7, 22, "wt", { hi: 0.4 });
    s += line(`M${f(px + 1)},${f(py - 3.5)}h28`, "#2c4f9e", 1.2, 0.8);
    [px, py] = pj(x + 88, top, 14);
    s += path(`M${f(px)},${f(py)}C${f(px - 4)},${f(py - 22)} ${f(px + 46)},${f(py - 24)} ${f(px + 44)},${f(py)}Z`, "url(#nvF)", 1);
    s += line(`M${f(px + 4)},${f(py - 15)}C${f(px + 16)},${f(py - 20)} ${f(px + 30)},${f(py - 20)} ${f(px + 40)},${f(py - 15)}`, "#9aa6b2", 0.7, 0.8);
    s += `<path d="M${f(px + 12)},${f(py - 17)}c4,-10 16,-10 20,0" fill="none" stroke="${INK}" stroke-width="2.4"/>`;
    s += `<path d="M${f(px + 12)},${f(py - 17)}c4,-10 16,-10 20,0" fill="none" stroke="#2a3038" stroke-width="1.2"/>`;
    s += rect(px + 30, py - 11, 6, 4, "#c8a040", 0.4);
  } else if (v === 2) {
    const [px, py] = pj(x + 110, top, 16);
    s += rect(px - 4, py - 18, 8, 18, "url(#bottle)", 0.7, 2.5);
    s += rect(px - 3, py - 22, 6, 4, "#2a3038", 0.5, 1);
  }
  s += rim(`M${f(x + w + d * OX)},${f(zy(top, d) + 1)}v4`, 0.45);
  return { box: [-90, -84, 180, 94], layers: [{ markup: `<g>${s}</g>` }] };
}

/**
 * Public waiting bench for the halls and the civic wing: three perforated
 * steel seats on a beam and two T-legs. One variant has a paper left on it.
 */
function waitingBench(v = 0) {
  const n = 3;
  const sw = 52;
  const gap = 3;
  const w = n * sw + (n - 1) * gap;
  const d = 52;
  const x = -(w + d * OX) / 2;
  const seat = -44;
  let s = shadow(6, -6, 100, 16);
  const zm = d * 0.45;
  // Back panels first (furthest), then the beam, legs and seat pans.
  for (let i = 0; i < n; i++) {
    const sx = x + i * (sw + gap);
    const q = [pj(sx + 3, seat - 3, d - 12), pj(sx + sw - 3, seat - 3, d - 12), pj(sx + sw - 3, seat - 40, d - 2), pj(sx + 3, seat - 40, d - 2)];
    s += poly(q, "url(#stF)", 0.9);
    let dots = "";
    for (let r = 1; r < 7; r++) {
      for (let c = 1; c < 9; c++) {
        const u = c / 9;
        const t = r / 7;
        const px = q[0][0] + (q[1][0] - q[0][0]) * u + (q[3][0] - q[0][0]) * t;
        const py = q[0][1] + (q[3][1] - q[0][1]) * t;
        dots += `M${f(px)},${f(py)}h.01`;
      }
    }
    s += `<path d="${dots}" stroke="#0d141b" stroke-width="1.8" stroke-linecap="round" opacity=".7"/>`;
    s += line(`M${f(q[3][0] + 1)},${f(q[3][1] + 1)}H${f(q[2][0] - 1)}`, "#cfe0ee", 0.6, 0.4);
  }
  const [bmx, bmy] = pj(x + 6, seat + 5, zm);
  s += rect(bmx, bmy, w - 12, 6, "url(#dkF)", 0.8);
  for (const lx of [x + 26, x + w - 32]) {
    s += block(lx - 3, -4, 12, 4, d - 8, "dk", { hi: 0.2 });
    const [px, py] = pj(lx, seat + 10, zm);
    s += rect(px, py, 6, zy(-4, zm) - py, "url(#dkF)", 0.8);
  }
  for (let i = 0; i < n; i++) {
    const sx = x + i * (sw + gap);
    s += block(sx, seat, sw, 3, d - 8, "st", { hi: 0.35 });
    let dots = "";
    for (let r = 1; r < 4; r++) {
      for (let c = 1; c < 9; c++) {
        const [px, py] = pj(sx + (sw * c) / 9, seat, ((d - 8) * r) / 4);
        dots += `M${f(px)},${f(py)}h.01`;
      }
    }
    s += `<path d="${dots}" stroke="#0d141b" stroke-width="1.4" stroke-linecap="round" opacity=".6"/>`;
  }
  // Armrests at the ends and between the seats.
  for (let i = 0; i <= n; i++) {
    const ax = x + i * (sw + gap) - (i === n ? gap + 2 : i === 0 ? 0 : gap / 2 + 1);
    const [px, py] = pj(ax, seat - 16, 10);
    s += rect(px + 0.5, py + 3, 2.5, zy(seat, 10) - py - 3, "url(#chrome)", 0.5);
    s += block(px - 0.5, py, 4.5, 3, 24, "dk", { hi: 0.3 });
  }
  if (v === 1) {
    const [px, py] = pj(x + sw + gap + 8, seat, 10);
    s += flat(px, py - 0.5, 30, 22, "#e2e2da", 0.5) + flat(px + 2, py - 1.5, 26, 5, "#2a2e34", 0);
    s += typeLines(px + 1, py - 1.5, 28, 22, 4, "#6a6e74", 0.55);
    const [cx, cy] = pj(x + 12, 0, -8);
    s += paperCup(cx, cy);
  }
  s += rim(`M${f(x + w + d * OX - 4)},${f(zy(seat - 40, d - 2) + 2)}L${f(x + w + d * OX - 10)},${f(zy(seat - 3, d - 12))}`, 0.35);
  return { box: [-100, -104, 200, 114], layers: [{ markup: `<g>${s}</g>` }] };
}

/** Blue snack machine, or red drinks machine: lit glass front and a blinking status LED. */
function vendingMachine(v = 0) {
  const w = 88;
  const h = 183;
  const d = 72;
  const x = -(w + d * OX) / 2;
  const y = -h;
  const red = v === 1;
  const m = red ? "rd" : "bv";
  let s = shadow(8, -10, 64, 20);
  s += block(x, y, w, h, d, m, { top: false });
  s += rect(x + 4, y + 4, w - 8, 14, red ? "#3a0a0a" : "#0c1a48", 0.7, 1);
  s += rect(x + 8, y + 7, 30, 8, "#e8eefc", 0, 1.5);
  s += rect(x + 10, y + 9, 12, 4, red ? "#2c4f9e" : "#d02030", 0, 1);
  const gx = x + 5;
  const gy = y + 22;
  const gw = 56;
  const gh = 104;
  s += rect(gx, gy, gw, gh, red ? "#1a0808" : "#0a1430", 1.1, 1);
  const colors = red ? ["#d8dce0", "#ff4444", "#e8b030", "#3a8a44", "#2c4f9e"] : ["#ff4444", "#44ff44", "#ffaa00", "#e8e8f0", "#44aaff"];
  for (let r = 0; r < 4; r++) {
    const sy = gy + 24 + r * 25;
    for (let c = 0; c < 5; c++) {
      const px = gx + 5 + c * 10.4;
      const col = colors[(r * 2 + c) % 5];
      if (red || r % 2 === 0) {
        // Cans: a rounded body, a silver lid, a lit edge.
        s += rect(px, sy - 15, 8, 15, col, 0.5, 1.2);
        s += rect(px + 1.2, sy - 13, 2, 11, "#fff", 0, 0, ` opacity=".45"`);
        s += rect(px, sy - 15, 8, 3, "#c9d2da", 0.3, 1);
      } else {
        s += path(`M${f(px - 0.5)},${f(sy - 16)}h9l-0.8,16h-7.4Z`, col, 0.5);
        s += rect(px + 1, sy - 11, 6, 4, "#fff", 0, 0, ` opacity=".55"`);
      }
      // Spiral coils / can rails under each row.
      s += line(`M${f(px)},${f(sy + 1)}h8`, "#9aa6b2", 0.6, 0.6);
    }
    s += rect(gx + 1, sy, gw - 2, 2.2, "#8a96a2", 0.4);
    s += line(`M${f(gx + 3)},${f(sy + 3.8)}h${gw - 6}`, "#c8d4de", 0.6, 0.35);
  }
  const kx = x + 66;
  s += rect(kx, gy, 17, 22, "#081020", 0.7, 1);
  s += rect(kx + 2, gy + 3, 13, 6, "#3a0a0a", 0.4);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) s += rect(kx + 2.2 + c * 4.4, gy + 28 + r * 5, 3.4, 3.6, "url(#chrome)", 0.4, 0.6);
  s += rect(kx + 5, gy + 52, 7, 12, "#070b16", 0.5, 1);
  s += line(`M${f(kx + 8.5)},${f(gy + 55)}v6`, "#9aa6b2", 0.9, 1);
  s += rect(kx + 3, gy + 72, 11, 22, "url(#dkF)", 0.5, 1);
  s += rect(x + 8, -48, 52, 20, "#070b16", 0.9, 1.5);
  s += rect(x + 10, -46, 48, 8, "url(#dkT)", 0.5, 1);
  s += rect(x, -14, w, 14, `url(#${m}S)`, 0.8);
  // A scuffed kick plate and a sticker by the coin slot.
  s += line(`M${f(x + 10)},-8l12,-1M${f(x + 40)},-6l9,1`, "#d8e4ee", 0.6, 0.3);
  s += rect(kx + 2, gy + 98, 13, 7, "#ffcc00", 0.4, 0.6);
  s += `<path d="M${f(gx + 8)},${f(gy)}l-8,26v14l22,-40ZM${f(gx + 30)},${f(gy)}l-30,56v8l35,-64Z" fill="#fff" opacity=".1"/>`;
  s += rim(`M${f(x + w + d * OX)},${f(zy(y, d) + 2)}V${f(zy(-2, d))}`, 0.4);
  let glow = rect(gx + 1, gy + 1, gw - 2, gh - 2, red ? "#ffd8c8" : "#bfe2ff", 0, 0, ` opacity=".16"`);
  glow += `<rect x="${f(gx)}" y="${f(gy)}" width="${gw}" height="${gh}" fill="${red ? "#ffb0a0" : "#8fd0ff"}" opacity=".35" filter="url(#soft)"/>`;
  glow += rect(x + 8, y + 7, 30, 8, "#ffffff", 0, 1.5, ` opacity=".35"`);
  glow += rect(kx + 2, gy + 3, 13, 6, "#ff3344", 0, 0, ` opacity=".6"`);
  return {
    box: [-66, -212, 134, 224],
    layers: [
      { markup: `<g>${s}</g>` },
      { markup: `<g>${glow}</g>`, shade: false, blend: "lighter", anim: { type: "pulse", min: 0.65, max: 1, speed: 1.8, phase: v * 1.7 } },
      { markup: lamp(kx + 13, y + 11, 1.5, "#00ff44", "#d8ffe0"), shade: false, blend: "lighter", anim: { type: "blink", min: 0.3, max: 0.9, speed: 5 } },
    ],
  };
}

/** Pot's soil with a scatter of bark chips, seen over its rim at (cx, cy). */
const soil = (cx, cy, rx) =>
  ell(cx, cy, rx, rx * 0.12, "#2a1a0c", 0.6) +
  line(`M${f(cx - rx * 0.6)},${f(cy)}h2M${f(cx - rx * 0.1)},${f(cy - 0.6)}h2.4M${f(cx + rx * 0.4)},${f(cy + 0.3)}h2`, "#7a5a34", 0.9, 0.8);

/**
 * Office plants. Variants: a palm arching from a terracotta planter; a snake
 * plant's upright blades in a white ceramic pot; a rubber plant's broad
 * glossy leaves in a square charcoal planter. Leaves sway in two layers.
 */
function pottedPlant(v = 0) {
  if (v === 1) {
    const rimY = -40;
    let pot = shadow(2, -3, 26, 7);
    pot += path(`M-17,${rimY}L-15,-2C-14,0 14,0 15,-2L17,${rimY}Z`, "url(#wtF)", 1.1);
    pot += path(`M-17,${rimY}L-15,-2C-14,0 14,0 15,-2L17,${rimY}Z`, "url(#vert)", 0);
    pot += rect(-16.6, rimY + 10, 33.2, 4, "#3a4048", 0.5);
    pot += line(`M-13,${rimY + 3}L-11.5,-5`, "#fff", 1.4, 0.5);
    pot += ell(0, rimY, 17, 2.4, "url(#wtT)", 0.8);
    pot += soil(0, rimY + 0.4, 15);
    pot += rim(`M16.4,${rimY + 2}L14.6,-3`, 0.35);
    const blade = (bx, deg, len, wid) => {
      const a = (deg * Math.PI) / 180;
      const tx = bx + Math.sin(a) * len;
      const ty = rimY - Math.cos(a) * len;
      const d = `M${f(bx - wid)},${rimY}C${f(bx - wid * 1.3)},${f(rimY - len * 0.5)} ${f(tx - wid * 0.6)},${f(ty + len * 0.25)} ${f(tx)},${f(ty)}C${f(tx + wid * 0.6)},${f(ty + len * 0.25)} ${f(bx + wid * 1.3)},${f(rimY - len * 0.5)} ${f(bx + wid)},${rimY}Z`;
      let b = path(d, "url(#leafS)", 0.8);
      // Cross-banding, and the yellow margin the variety is known for.
      for (let k = 0.2; k < 0.85; k += 0.16) {
        const yy = rimY - len * k * Math.cos(a);
        const xx = bx + Math.sin(a) * len * k;
        b += line(`M${f(xx - wid * 0.8)},${f(yy + 1)}l${f(wid * 1.6)},-2`, "#8fc070", 0.6, 0.4);
      }
      b += line(`M${f(bx + wid)},${rimY}C${f(bx + wid * 1.3)},${f(rimY - len * 0.5)} ${f(tx + wid * 0.6)},${f(ty + len * 0.25)} ${f(tx)},${f(ty)}`, "#d8d070", 0.6, 0.7);
      if (REAL) b += `<path d="M${f(bx)},${rimY}C${f(bx + wid * 0.6)},${f(rimY - len * 0.5)} ${f(tx + wid * 0.3)},${f(ty + len * 0.25)} ${f(tx)},${f(ty)}C${f(tx + wid * 0.6)},${f(ty + len * 0.25)} ${f(bx + wid * 1.3)},${f(rimY - len * 0.5)} ${f(bx + wid)},${rimY}Z" fill="#000" opacity=".22"/>`;
      return b;
    };
    const back = [[-6, -14, 70, 4], [3, 8, 84, 4.5], [9, 18, 62, 4]].map(([bx, a, l, wd]) => blade(bx, a, l, wd)).join("");
    const front = [[-10, -22, 58, 4.5], [-3, -4, 92, 5], [5, 6, 76, 5], [11, 26, 50, 4]].map(([bx, a, l, wd]) => blade(bx, a, l, wd)).join("");
    return {
      box: [-44, -150, 88, 158],
      layers: [
        { markup: `<g>${back}</g>`, anim: { type: "sway", amp: 0.015, speed: 0.8, pivot: [0, rimY] } },
        { markup: `<g>${pot}</g>` },
        { markup: `<g>${front}</g>`, anim: { type: "sway", amp: 0.02, speed: 1, pivot: [0, rimY], phase: 1.1 } },
      ],
    };
  }
  if (v === 2) {
    const ph = 38;
    const pw = 38;
    const pd = 36;
    const px = -(pw + pd * OX) / 2;
    let pot = shadow(3, -3, 30, 8);
    pot += block(px, -ph, pw, ph, pd, "fb");
    pot += rect(px, -ph, pw, 4, "#1d1d26", 0.6);
    pot += line(`M${f(px + 4)},${-ph + 8}V-4`, "#9a9ab8", 0.8, 0.3);
    const [sx, sy] = pj(px + pw / 2, -ph, pd / 2);
    pot += soil(sx, sy, 16);
    pot += rim(`M${f(px + pw + pd * OX)},${f(zy(-ph, pd) + 1)}V${f(zy(-1, pd))}`, 0.35);
    // Stems up through the crown, then broad oval leaves round them.
    const stems = line(`M${f(sx - 2)},${f(sy)}C${f(sx - 6)},${f(sy - 40)} ${f(sx - 10)},${f(sy - 70)} ${f(sx - 8)},${f(sy - 104)}M${f(sx + 2)},${f(sy)}C${f(sx + 6)},${f(sy - 36)} ${f(sx + 12)},${f(sy - 60)} ${f(sx + 12)},${f(sy - 92)}`, "#4a3a20", 2.2, 1);
    const oval = (cx, cy, rx, ry, rot, fill) => {
      let l = `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${rot} ${f(cx)} ${f(cy)})" fill="${fill}" stroke="${INK}" stroke-width=".8"/>`;
      l += `<path d="M${f(cx - rx * 0.85 * Math.cos((rot * Math.PI) / 180))},${f(cy - rx * 0.85 * Math.sin((rot * Math.PI) / 180))}L${f(cx + rx * 0.85 * Math.cos((rot * Math.PI) / 180))},${f(cy + rx * 0.85 * Math.sin((rot * Math.PI) / 180))}" stroke="#a8d890" stroke-width=".5" stroke-opacity=".45"/>`;
      if (REAL) l += `<ellipse cx="${f(cx + 1)}" cy="${f(cy + ry * 0.4)}" rx="${f(rx * 0.8)}" ry="${f(ry * 0.45)}" transform="rotate(${rot} ${f(cx)} ${f(cy)})" fill="#000" opacity=".2"/>`;
      else l += `<ellipse cx="${f(cx - rx * 0.2)}" cy="${f(cy - ry * 0.35)}" rx="${f(rx * 0.45)}" ry="${f(ry * 0.22)}" transform="rotate(${rot} ${f(cx)} ${f(cy)})" fill="#fff" opacity=".18"/>`;
      return l;
    };
    // Leaves round the stems on a spiral (the golden angle), larger low
    // down: the ones turned toward the viewer go in front, the rest behind.
    const back = [];
    const front = [];
    for (let i = 0; i < 22; i++) {
      const t = i / 21;
      const phi = i * 2.4;
      const reach = (30 - t * 16) * (0.35 + 0.65 * Math.abs(Math.sin(phi)));
      const cx = sx + Math.sin(phi) * reach;
      const cy = sy - 22 - t * 98 + Math.cos(phi) * 4;
      const rot = Math.sign(Math.sin(phi) || 1) * (18 + t * 46) + ((i * 13) % 14) - 7;
      const near = Math.cos(phi) > 0;
      (near ? front : back).push(oval(cx, cy, 15 - t * 4, 6.6 - t * 1.4, rot, near ? "url(#leafR)" : "url(#leafB)"));
    }
    front.push(oval(sx + 1, sy - 126, 9, 4, -84, "url(#leafR)"));
    return {
      box: [-56, -160, 112, 168],
      layers: [
        { markup: `<g>${stems}${back.join("")}</g>`, anim: { type: "sway", amp: 0.012, speed: 0.9, pivot: [sx, sy] } },
        { markup: `<g>${pot}</g>` },
        { markup: `<g>${front.join("")}</g>`, anim: { type: "sway", amp: 0.018, speed: 1.1, pivot: [sx, sy], phase: 0.6 } },
      ],
    };
  }
  const rimY = -44;
  let pot = shadow(2, -3, 34, 9);
  // A saucer under the pot.
  pot += ell(0, -1.5, 19, 3, "url(#tcS)", 0.8);
  pot += path(`M-22,${rimY}L-16,-2C-15,0 15,0 16,-2L22,${rimY}Z`, "url(#tcF)", 1.1);
  pot += path(`M-22,${rimY}L-16,-2C-15,0 15,0 16,-2L22,${rimY}Z`, "url(#vert)", 0);
  pot += line(`M-17,${rimY + 6}L-12.5,-5`, "#f0a070", 1.2, 0.35);
  pot += rect(-25, rimY - 7, 50, 8, "url(#tcF)", 1.1, 1.5);
  pot += line(`M-24,${rimY - 6}h47`, "#f0a070", 0.6, 0.45);
  pot += rect(-22, rimY + 1, 44, 4, "url(#ao)", 0);
  pot += soil(0, rimY - 6.5, 21);
  // A water ring and old mineral bloom on the clay.
  pot += line(`M-19,${rimY + 22}C-8,${rimY + 25} 8,${rimY + 25} 19,${rimY + 22}`, "#e8d8c0", 0.8, 0.25);
  pot += rim(`M24.5,${rimY - 5}v4M21.4,${rimY + 2}L15.6,-3`, 0.35);
  const base = rimY - 6;
  const back = [[-62, 72, 7, 0.28], [-28, 86, 6, 0.12], [22, 84, 6, 0.12], [58, 70, 7, 0.3]]
    .map(([a, l, wd, b]) => leaf(0, base, a, l, wd, b, "url(#leafB)")).join("");
  const front = [[-78, 58, 7, 0.45], [-44, 76, 7.5, 0.2], [-8, 90, 6.5, 0.05], [34, 78, 7.5, 0.2], [74, 60, 7, 0.45]]
    .map(([a, l, wd, b]) => leaf(0, base, a, l, wd, b, "url(#leafA)")).join("");
  return {
    box: [-82, -150, 164, 158],
    layers: [
      { markup: `<g>${back}</g>`, anim: { type: "sway", amp: 0.03, speed: 1, pivot: [0, base] } },
      { markup: `<g>${pot}</g>` },
      { markup: `<g>${front}</g>`, anim: { type: "sway", amp: 0.045, speed: 1.25, pivot: [0, base], phase: 0.8 } },
    ],
  };
}

/** One bankers box at (bx, by) (front face's bottom-left), its lid and label. */
function archiveBox(bx, by, m = "kr", tag = 0) {
  const w = 40;
  const h = 27;
  const d = 32;
  let s = block(bx, by - h, w, h, d, m, { hi: 0.3 });
  s += rect(bx - 0.5, by - h, w + 1, 5, `url(#${m}S)`, 0.6);
  s += line(`M${f(bx + 1)},${f(by - h + 5.8)}h${w - 2}`, "#fff", 0.5, 0.3);
  s += rect(bx + 3, by - h + 9, 6, 3, "#1a1206", 0, 1.4);
  s += rect(bx + 13, by - h + 9, 22, 12, "#f4f1e6", 0.5, 0.5);
  s += rect(bx + 13, by - h + 9, 22, 2.6, tag % 2 ? "#c0392b" : "#2c4f9e", 0);
  s += line(`M${f(bx + 15)},${f(by - h + 15)}l3,-1l3,1.5l3,-2l3,1l3,-1M${f(bx + 15)},${f(by - h + 18.5)}h${10 + (tag % 3) * 3}`, "#2a3a6a", 0.6, 0.8);
  return s;
}

/** Stacked archive boxes, records and evidence waiting to go down to the vault. */
function archiveBoxes(v = 0) {
  const x = -46;
  let s = shadow(4, -6, 54, 14);
  if (v === 1) {
    s += archiveBox(x + 2, 0, "kr", 1);
    s += archiveBox(x + 4, -27, "wt", 2);
    s += archiveBox(x + 1, -54, "kr", 3);
    s += archiveBox(x + 46, 0, "wt", 0);
    // A loose lid leaning on the stack.
    s += poly([[x + 48, -27], [x + 86, -27], [x + 82, -36], [x + 52, -36]], "url(#krT)", 0.6);
  } else {
    s += archiveBox(x, 0, "kr", 0);
    s += archiveBox(x + 44, 0, "kr", 1);
    s += archiveBox(x + 20, -27, "wt", 2);
  }
  s += rim(`M${f(x + 84 + 32 * OX)},${f(zy(-27, 32) + 1)}V${f(zy(-1, 32))}`, 0.3);
  return { box: [-52, -102, 116, 112], layers: [{ markup: `<g>${s}</g>` }] };
}

/** Water cooler: white cabinet, the big blue bottle, hot and cold taps, the cups. */
function waterCooler() {
  const w = 32;
  const d = 32;
  const h = 100;
  const x = -(w + d * OX) / 2;
  let s = shadow(3, -5, 28, 9);
  s += block(x, -h, w, h, d, "wt");
  s += rect(x + 2, -4, w - 4, 4, "#2a3038", 0.5);
  // The tap recess, its drip tray, the taps.
  s += rect(x + 5, -h + 14, w - 10, 30, "#232a32", 0.7, 1.5);
  s += rect(x + 5, -h + 14, w - 10, 6, "url(#ao)", 0);
  s += rect(x + 6, -h + 39, w - 12, 4, "url(#chrome)", 0.5);
  s += line(`M${f(x + 8)},${f(-h + 41)}h${w - 16}`, "#1a2028", 0.4, 0.9);
  s += rect(x + 9, -h + 18, 5, 6, "#2c6ad0", 0.5, 1) + rect(x + w - 14, -h + 18, 5, 6, "#d03030", 0.5, 1);
  s += rect(x + 10.5, -h + 24, 2, 3, "#c8d4de", 0.4) + rect(x + w - 12.5, -h + 24, 2, 3, "#c8d4de", 0.4);
  // Lower door and its vent.
  s += rect(x + 4, -h + 52, w - 8, 42, "none", 0.5, 0.8, ` stroke-opacity=".5"`);
  s += vents(x + 8, -h + 58, w - 16, 3, 3.6);
  // Cup tube on the side.
  const [cx, cy] = pj(x + w, -h + 20, d * 0.45);
  s += rect(cx - 3, cy, 6, 34, "#e8f0f4", 0.6, 2, ` opacity=".9"`);
  for (let i = 0; i < 6; i++) s += line(`M${f(cx - 2.4)},${f(cy + 4 + i * 5)}h4.8`, "#9aa6b2", 0.5, 0.6);
  s += rim(`M${f(x + w + d * OX)},${f(zy(-h, d) + 1)}V${f(zy(-4, d))}`, 0.35);
  // The bottle: collar, a 19 l bottle upside down, ribbed, two-thirds full.
  const [bx, by] = pj(x + w / 2, -h, d / 2);
  s += ell(bx, by, 9, 2.4, "#c8d4de", 0.6);
  s += rect(bx - 4, by - 6, 8, 6, "url(#bottle)", 0.6);
  const top = by - 48;
  const body = `M${f(bx - 4)},${f(by - 6)}C${f(bx - 15)},${f(by - 8)} ${f(bx - 15)},${f(by - 12)} ${f(bx - 15)},${f(by - 16)}V${f(top + 6)}C${f(bx - 15)},${f(top)} ${f(bx + 15)},${f(top)} ${f(bx + 15)},${f(top + 6)}V${f(by - 16)}C${f(bx + 15)},${f(by - 12)} ${f(bx + 15)},${f(by - 8)} ${f(bx + 4)},${f(by - 6)}Z`;
  s += `<path d="${body}" fill="url(#bottle)" fill-opacity=".85" stroke="${INK}" stroke-width="1"/>`;
  s += `<path d="M${f(bx - 14.4)},${f(top + 18)}H${f(bx + 14.4)}V${f(by - 16)}C${f(bx + 14)},${f(by - 10)} ${f(bx - 14)},${f(by - 10)} ${f(bx - 14.4)},${f(by - 16)}Z" fill="#1b5aa0" opacity=".35"/>`;
  s += line(`M${f(bx - 14.4)},${f(top + 18)}H${f(bx + 14.4)}`, "#e6f6ff", 0.6, 0.6);
  for (const k of [0.3, 0.55]) s += line(`M${f(bx - 15)},${f(top + (by - top) * k)}C${f(bx - 5)},${f(top + (by - top) * k + 2)} ${f(bx + 5)},${f(top + (by - top) * k + 2)} ${f(bx + 15)},${f(top + (by - top) * k)}`, "#0d2a4e", 0.5, 0.4);
  s += line(`M${f(bx - 9)},${f(top + 6)}V${f(by - 14)}`, "#fff", 1.6, 0.55);
  return { box: [-28, -170, 62, 178], layers: [{ markup: `<g>${s}</g>` }] };
}

/** Office copier: paper drawers, the scanner lid, a lit panel and someone's sticky note. */
function copier() {
  const w = 66;
  const d = 60;
  const x = -(w + d * OX) / 2;
  let s = shadow(6, -6, 52, 15);
  s += rect(x + 3, -5, w - 6, 5, "#1d2126", 0.6);
  s += block(x, -60, w, 55, d, "wt", { top: false });
  for (let i = 0; i < 3; i++) {
    const yy = -58 + i * 18;
    s += rect(x + 3, yy, w - 6, 16, "url(#wtF)", 0.6, 0.6);
    s += rect(x + w / 2 - 9, yy + 3, 18, 3, "#3a4048", 0.4, 1.2);
    s += rect(x + 5, yy + 4, 3, 7, "#9aa6b2", 0, 0.6);
  }
  // Body over the drawers, the output slot and its tray, out on the left.
  s += block(x, -98, w, 38, d, "gy", { top: false });
  s += rect(x + 2, -86, w - 20, 5, "#14181e", 0.6, 1);
  s += poly([[x - 12, -79], [x + 4, -82], [x + 4, -78], [x - 12, -74]], "#c8d0d6", 0.7);
  s += poly([[x - 11, -80], [x + 3, -83.4], [x + 3, -81], [x - 11, -77.6]], "#f6f8fa", 0.4);
  // Scanner lid and glass edge.
  s += block(x + 2, -106, w - 4, 8, d - 6, "dk", { hi: 0.3 });
  s += line(`M${f(x + 4)},-99h${w - 8}`, "#7fd0ff", 0.6, 0.4);
  // Control panel, tilted, with its screen.
  s += poly([[x + w - 30, -94], [x + w - 4, -94], [x + w - 2, -100], [x + w - 28, -100]], "#2a3038", 0.7);
  const scr = [x + w - 26, -99, 12, 4];
  s += rect(scr[0], scr[1], scr[2], scr[3], "#0a2a3a", 0.4);
  for (let i = 0; i < 4; i++) s += rect(x + w - 12 + (i % 2) * 4, -99 + (i >> 1) * 2.4, 3, 1.6, "#9aa6b2", 0, 0.4);
  // OUT OF ORDER, in someone's handwriting.
  s += rect(x + 10, -95, 12, 11, "#ffe36a", 0.5, 0.4, ` transform="rotate(-6 ${f(x + 16)} -90)"`);
  s += line(`M${f(x + 12)},-91l3,-1l2,1l3,-1M${f(x + 12)},-88l7,-0.6`, "#2a3a6a", 0.6, 0.85);
  s += rim(`M${f(x + w + d * OX)},${f(zy(-98, d) + 1)}V${f(zy(-6, d))}`, 0.35);
  const glow = rect(scr[0], scr[1], scr[2], scr[3], "#46e0ff", 0, 0, ` opacity=".7"`) + lamp(x + w - 6, -96.5, 0.7, "#00ff88", "#d0ffe6");
  return {
    box: [-62, -130, 124, 140],
    layers: [
      { markup: `<g>${s}</g>` },
      { markup: `<g>${glow}</g>`, shade: false, blend: "lighter", anim: { type: "pulse", min: 0.6, max: 1, speed: 1.2 } },
    ],
  };
}

/** Scribbled handwriting: a run of loops `len` long at (x, y). */
function scrawl(x, y, len, color, w = 0.7, seed = 0, op = 0.9) {
  let d = `M${f(x)},${f(y)}`;
  for (let i = 0; i < len; i += 3) d += `l1.5,${(((i + seed) * 7) % 5) - 3}l1.5,${3 - (((i + seed) * 3) % 4)}`;
  return line(d, color, w, op);
}

/**
 * Mobile board on a stand. Variants: the squad's whiteboard (a timeline,
 * names, arrows, a photo under a magnet); a cork case board with photos,
 * index cards and red string between the pins.
 */
function whiteboard(v = 0) {
  const bw = 124;
  const bh = 84;
  const bx = -bw / 2 - 6;
  const by = -178;
  let s = shadow(4, -4, 70, 12, 0.8);
  // Stand: H feet on casters, two uprights.
  for (const lx of [bx + 4, bx + bw - 8]) {
    s += block(lx - 10, -5, 24, 3, 30, "dk", { hi: 0.2 });
    for (const z of [2, 28]) {
      const [cx, cy] = pj(lx - 8, -1, z);
      s += ell(cx, cy, 2.2, 2, "url(#rubber)", 0.5);
      const [ex, ey] = pj(lx + 10, -1, z);
      s += ell(ex, ey, 2.2, 2, "url(#rubber)", 0.5);
    }
    const [px, py] = pj(lx, by - 6, 14);
    s += rect(px, py, 4, zy(-5, 14) - py, "url(#chrome)", 0.7, 1);
  }
  s += block(bx, by, bw, bh, 3, "gy", { top: false, hi: 0 });
  const ix = bx + 3;
  const iy = by + 3;
  const iw = bw - 6;
  const ih = bh - 8;
  if (v === 1) {
    s += rect(ix, iy, iw, ih, "url(#cork)", 0.7);
    let dots = "";
    for (let i = 0; i < 70; i++) dots += `M${f(ix + 3 + ((i * 37) % (iw - 6)))},${f(iy + 3 + ((i * 53) % (ih - 6)))}h.01`;
    s += `<path d="${dots}" stroke="#5a3a1a" stroke-width="1.1" stroke-linecap="round" opacity=".45"/>`;
    const pins = [];
    const items = [[8, 6, 20, 24, 0], [40, 10, 16, 20, 1], [70, 5, 22, 26, 0], [96, 14, 16, 20, 1], [18, 44, 24, 18, 2], [56, 42, 26, 24, 0], [92, 46, 18, 18, 2]];
    for (const [ox, oy, w, h, k] of items) {
      const px = ix + ox;
      const py = iy + oy;
      if (k === 2) {
        s += rect(px, py, w, h, "#f6f4ec", 0.5, 0.3);
        s += line(`M${f(px + 2)},${f(py + 5)}h${w - 6}M${f(px + 2)},${f(py + 9)}h${w - 4}M${f(px + 2)},${f(py + 13)}h${w - 8}`, "#3a4a7a", 0.5, 0.7);
      } else {
        // A photo: white border, a figure's head and shoulders, or a car.
        s += rect(px, py, w, h, "#f2f0ea", 0.5, 0.3);
        s += rect(px + 1.6, py + 1.6, w - 3.2, h - 6, k ? "#5a6470" : "#7a8490", 0);
        if (k) s += rect(px + 3, py + h * 0.4, w - 6, h * 0.22, "#2a3038", 0, 2) + ell(px + 6, py + h * 0.66, 2, 2, "#111");
        else s += ell(px + w / 2, py + h * 0.32, w * 0.16, w * 0.18, "#2a3038") + path(`M${f(px + 3)},${f(py + h - 4.4)}C${f(px + 3)},${f(py + h * 0.5)} ${f(px + w - 3)},${f(py + h * 0.5)} ${f(px + w - 3)},${f(py + h - 4.4)}Z`, "#2a3038", 0);
      }
      pins.push([px + w / 2, py + 2]);
    }
    let str = "";
    for (const [a, b] of [[0, 1], [1, 5], [5, 3], [2, 5], [4, 5], [0, 4]]) str += `M${f(pins[a][0])},${f(pins[a][1])}L${f(pins[b][0])},${f(pins[b][1])}`;
    s += line(str, "#c0202a", 0.8, 0.9);
    for (const [px, py] of pins) s += ell(px, py, 1.6, 1.6, "#e03030", 0.4) + ell(px - 0.5, py - 0.5, 0.5, 0.5, "#ffd0d0");
  } else {
    s += rect(ix, iy, iw, ih, "url(#board)", 0.7);
    s += `<path d="M${f(ix + 10)},${f(iy)}l-10,30v12l26,-42ZM${f(ix + 74)},${f(iy)}l-40,${f(ih)}h8l40,-${f(ih)}Z" fill="#fff" opacity=".35"/>`;
    // Ghosts of last week's notes, wiped.
    s += scrawl(ix + 60, iy + 60, 40, "#9aa6b2", 1.4, 3, 0.25);
    // The timeline, its marks, the time circled in red.
    s += line(`M${f(ix + 6)},${f(iy + 30)}H${f(ix + iw - 8)}`, "#1a2a4a", 1, 0.9);
    for (let i = 0; i < 6; i++) s += line(`M${f(ix + 12 + i * 18)},${f(iy + 27)}v6`, "#1a2a4a", 0.9, 0.9);
    s += ell(ix + 66, iy + 22, 8, 4.5, "none", 0, ` stroke="#d02030" stroke-width="1"`);
    s += scrawl(ix + 60, iy + 22, 12, "#d02030", 0.8, 1);
    for (let i = 0; i < 4; i++) s += scrawl(ix + 8, iy + 40 + i * 7, 26 + ((i * 11) % 14), "#1a2a4a", 0.6, i);
    s += scrawl(ix + 8, iy + 10, 30, "#1a4aa0", 0.9, 5) + scrawl(ix + 70, iy + 42, 22, "#1a4aa0", 0.7, 2);
    s += line(`M${f(ix + 46)},${f(iy + 46)}C${f(ix + 56)},${f(iy + 52)} ${f(ix + 62)},${f(iy + 48)} ${f(ix + 68)},${f(iy + 42)}l-4,0.4M${f(ix + 68)},${f(iy + 42)}l-0.6,4`, "#d02030", 0.9, 0.9);
    // A photo under a magnet.
    s += rect(ix + iw - 28, iy + 6, 20, 16, "#f2f0ea", 0.5, 0.3, ` transform="rotate(4 ${f(ix + iw - 18)} ${f(iy + 14)})"`);
    s += rect(ix + iw - 26, iy + 8, 16, 10, "#6a7480", 0, 0, ` transform="rotate(4 ${f(ix + iw - 18)} ${f(iy + 14)})"`);
    s += ell(ix + iw - 18, iy + 7, 2, 2, "#2c4f9e", 0.4);
    // The marker tray, and a marker in it.
    s += block(ix + 10, iy + ih, iw - 20, 3, 6, "gy", { hi: 0.3 });
    s += rect(ix + 30, iy + ih - 2, 14, 2.4, "#d02030", 0.4, 1) + rect(ix + 48, iy + ih - 2, 14, 2.4, "#1a2a4a", 0.4, 1);
  }
  s += rim(`M${f(bx + bw + 3 * OX)},${f(zy(by, 3) + 1)}v${bh - 2}`, 0.3);
  return { box: [-82, -196, 164, 206], layers: [{ markup: `<g>${s}</g>` }] };
}

/** Brass floor lamp with a drum shade, lit warm from inside. */
function floorLamp() {
  const top = -176;
  let s = shadow(0, -2, 22, 6);
  s += ell(0, -2, 16, 4, "url(#brassC)", 0.9);
  s += ell(0, -3.4, 13, 2.8, "url(#brT)", 0);
  s += rect(-1.6, top + 30, 3.2, -top - 33, "url(#brassC)", 0.7);
  s += ell(0, -80, 3, 1.6, "url(#brassC)", 0.5);
  s += path(`M-15,${top}L-21,${top + 30}C-21,${top + 34} 21,${top + 34} 21,${top + 30}L15,${top}Z`, "url(#shadeC)", 1);
  s += ell(0, top, 15, 2.6, "#e8dcc0", 0.8);
  s += line(`M-11,${top + 4}L-15.5,${top + 28}`, "#fff", 1.2, 0.35);
  s += rim(`M15.6,${top + 2}L20.4,${top + 29}`, 0.35);
  const glow =
    `<ellipse cx="0" cy="${top + 32}" rx="40" ry="24" fill="url(#warmG)" opacity=".75"/>` +
    `<ellipse cx="0" cy="${top + 31.5}" rx="20" ry="2.6" fill="#fff4c8" opacity=".9"/>` +
    `<ellipse cx="0" cy="${top + 14}" rx="18" ry="16" fill="url(#warmG)" opacity=".35"/>`;
  return {
    box: [-44, -186, 88, 196],
    layers: [
      { markup: `<g>${s}</g>` },
      { markup: `<g>${glow}</g>`, shade: false, blend: "lighter", anim: { type: "pulse", min: 0.85, max: 1, speed: 0.9 } },
    ],
  };
}

/** Waste bin by a desk: wire mesh with crumpled paper, or plastic with a liner. */
function wasteBin(v = 0) {
  const top = -34;
  let s = shadow(2, -2, 18, 5);
  const shape = `M-13,${top}L-10,-1C-9,1 9,1 10,-1L13,${top}Z`;
  if (v === 1) {
    s += path(shape, "url(#dkF)", 1);
    s += path(`M-13.6,${top}L-12.6,${top + 6}C-6,${top + 8} 6,${top + 8} 12.6,${top + 6}L13.6,${top}Z`, "#14181e", 0.6);
    s += line(`M-10,${top + 9}L-8,-4`, "#9aa6b2", 1, 0.3);
    s += ell(0, top, 13.6, 2.2, "#0a0d10", 0.7);
    s += path(`M-4,${top}c-2,-6 6,-9 8,-3c2,-2 5,0 3,3Z`, "#f4f1e8", 0.6);
  } else {
    s += path(shape, "#2a3038", 1, ` fill-opacity=".35"`);
    let mesh = "";
    for (let i = 1; i < 8; i++) mesh += `M${f(-13 + i * 3.25)},${top}L${f(-10 + i * 2.5)},-1`;
    for (let i = 1; i < 6; i++) mesh += `M${f(-13 + i * 0.5)},${f(top + i * 5.6)}H${f(13 - i * 0.5)}`;
    s += line(mesh, "#56646f", 0.5, 0.9);
    // Crumpled sheets inside and over the rim.
    s += path(`M-9,${top + 10}c-2,-7 5,-12 9,-7c4,-4 10,2 7,7Z`, "#e8eaec", 0.5, ` opacity=".9"`);
    s += path(`M-6,${top + 1}c-3,-7 4,-10 7,-6c3,-3 8,1 5,6Z`, "#f6f8fa", 0.6);
    s += line(`M-3,${top - 3}l3,2l2,-2`, "#9aa6b2", 0.5, 0.8);
    s += ell(0, top, 13, 2, "none", 0, ` stroke="${INK}" stroke-width="1"`);
    s += ell(0, top, 12.4, 1.6, "none", 0, ` stroke="#9aa6b2" stroke-width=".6"`);
  }
  s += rim(`M12.6,${top + 2}L10,-3`, 0.35);
  return { box: [-22, -50, 44, 56], layers: [{ markup: `<g>${s}</g>` }] };
}

/** Coffee cart: a steel trolley, the drip machine and its carafe, cups and sugar. */
function coffeeCart() {
  const w = 64;
  const d = 40;
  const x = -(w + d * OX) / 2;
  const top = -84;
  let s = shadow(4, -5, 46, 12);
  for (const [lx, z] of [[x + 2, d - 3], [x + w - 5, d - 3], [x + 2, 1], [x + w - 5, 1]]) {
    const [px, py] = pj(lx, top, z);
    s += rect(px, py + 3, 3, zy(-3, z) - py - 3, z > 10 ? "url(#dkS)" : "url(#pipe)", 0.6);
    const [cx, cy] = pj(lx + 1.5, -1.6, z);
    s += ell(cx, cy, 2, 1.8, "url(#rubber)", 0.4);
  }
  // Lower shelf: a carton of cups and a sleeve of filters.
  s += block(x + 1, -22, w - 2, 3, d - 2, "st", { hi: 0.3 });
  let [px, py] = pj(x + 6, -22, 8);
  s += block(px, py - 16, 26, 16, 22, "kr", { hi: 0.3 });
  s += rect(px + 6, py - 11, 14, 6, "#f4f1e6", 0.4, 0.4);
  [px, py] = pj(x + 38, -22, 10);
  s += block(px, py - 9, 18, 9, 14, "wt", { hi: 0.3 });
  s += block(x, top, w, 4, d, "st", { hi: 0.45 });
  const at = (u, z) => pj(x + u, top, z);
  // The machine: body, the hood, the hot plate under the carafe.
  [px, py] = at(26, 30);
  s += block(px, py - 34, 26, 34, 20, "dk", { hi: 0.3 });
  s += rect(px + 2, py - 34, 22, 6, "#14181e", 0.5);
  s += rect(px + 2, py - 4, 22, 3, "#1a1f26", 0.5);
  s += path(`M${f(px + 5)},${f(py - 4)}V${f(py - 18)}C${f(px + 5)},${f(py - 23)} ${f(px + 21)},${f(py - 23)} ${f(px + 21)},${f(py - 18)}V${f(py - 4)}Z`, "#c8e0ee", 0.7, ` fill-opacity=".45"`);
  s += path(`M${f(px + 5.4)},${f(py - 4.4)}V${f(py - 12)}H${f(px + 20.6)}V${f(py - 4.4)}Z`, "#3b2414", 0, ` opacity=".9"`);
  s += line(`M${f(px + 7)},${f(py - 17)}V${f(py - 7)}`, "#fff", 1, 0.5);
  s += rect(px + 21, py - 20, 4, 3, "#1a1f26", 0.5, 1);
  // Cups stacked mouth-down, a sugar jar, stirrers in a mug.
  [px, py] = at(8, 18);
  for (let i = 0; i < 4; i++) s += path(`M${f(px - 4.2)},${f(py - i * 3)}L${f(px - 3.2)},${f(py - i * 3 - 4)}H${f(px + 3.2)}L${f(px + 4.2)},${f(py - i * 3)}Z`, "#f4f1e8", 0.5);
  [px, py] = at(56, 16);
  s += mug(px, py, "#2c4f9e", "#f4f1e8");
  s += line(`M${f(px - 1)},${f(py - 9)}l-1,-6M${f(px + 1)},${f(py - 9)}l1.5,-6`, "#c8a070", 0.8, 1);
  [px, py] = at(62, 34);
  s += rect(px - 3.5, py - 9, 7, 9, "#e6eef4", 0.5, 1, ` opacity=".85"`) + rect(px - 3.5, py - 11, 7, 2.4, "#c0392b", 0.4, 0.6);
  s += rim(`M${f(x + w + d * OX)},${f(zy(top, d) + 1)}v4`, 0.45);
  const [lx, ly] = at(46, 30);
  const glow = lamp(lx + 2.5, ly - 30, 0.9, "#ff3344", "#ffd0d6") +
    `<ellipse cx="${f(lx - 7)}" cy="${f(ly - 4)}" rx="12" ry="4" fill="url(#warmG)" opacity=".45"/>`;
  return {
    box: [-48, -136, 96, 146],
    layers: [
      { markup: `<g>${s}</g>` },
      { markup: `<g>${glow}</g>`, shade: false, blend: "lighter", anim: { type: "pulse", min: 0.7, max: 1, speed: 1.6 } },
    ],
  };
}

const BUILDERS = {
  locker,
  crate,
  bench,
  target,
  ammo_crate: ammoCrate,
  weight_rack: weightRack,
  dumbbell,
  punching_bag: punchingBag,
  desk,
  filing_cabinet: filingCabinet,
  monitor_bank: monitorBank,
  table,
  chair,
  vending_machine: vendingMachine,
  weapon_rack: weaponRack,
  potted_plant: pottedPlant,
  barrier,
  stack_chair: stackChair,
  waiting_bench: waitingBench,
  archive_boxes: archiveBoxes,
  water_cooler: waterCooler,
  copier,
  whiteboard,
  floor_lamp: floorLamp,
  waste_bin: wasteBin,
  coffee_cart: coffeeCart,
};

/**
 * How many looks a type has. Variant `v` of a type is the sprite keyed
 * `type.v` (variant 0 is the type's own key), built by the type's builder
 * with `v` as its argument.
 */
export const PROP_VARIANTS = {
  desk: 3,
  filing_cabinet: 3,
  monitor_bank: 2,
  table: 3,
  chair: 3,
  stack_chair: 2,
  bench: 3,
  waiting_bench: 2,
  vending_machine: 2,
  potted_plant: 3,
  archive_boxes: 2,
  whiteboard: 2,
  waste_bin: 2,
};

const buildAll = () => {
  const out = {};
  for (const key in BUILDERS) {
    out[key] = BUILDERS[key](0);
    for (let v = 1; v < (PROP_VARIANTS[key] || 1); v++) out[`${key}.${v}`] = BUILDERS[key](v);
  }
  return out;
};

export const PROP_SPRITES = buildAll();

// ---------------------------------------------------------------------------
// Realistic set
// ---------------------------------------------------------------------------

/** Ink outlines become a soft, translucent darker edge. */
const SOFT_EDGE = "rgba(10,8,6,.34)";

/**
 * Grade a #rgb / #rrggbb colour toward paint: pulled toward its own
 * luminance (reduced saturation) and off pure white and black.
 */
export function gradeHex(h, sat = 0.66) {
  const full = h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h;
  const n = parseInt(full, 16);
  const c = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  let out = "#";
  for (let i = 0; i < 3; i++) {
    const v = (L + (c[i] - L) * sat) * 0.88 + 0.025;
    out += Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0");
  }
  return out;
}

/** Realistic pass over finished markup: soft edges for ink, graded colours. `url(#id)` refs are untouched. */
export const gradeMarkup = (m, sat) =>
  m
    .replace(/stroke="#04060b"/g, `stroke="${SOFT_EDGE}"`)
    .replace(/(?<!url\()#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (_, h) => gradeHex(h, sat));

/**
 * Surface filters for the Realistic wrap. Frequencies are in art units, so
 * each sprite set passes values that suit its scale (props are centimetres).
 */
export const realSurfaceDefs = (grime = 0.035, scuff = "0.06 0.45") =>
  `<filter id="rWht"><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/></filter>` +
  `<filter id="rGrime"><feTurbulence type="fractalNoise" baseFrequency="${grime}" numOctaves="4" seed="3"/>` +
  `<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 2.6 0 0 0 -1.12"/>` +
  `<feComposite in="SourceGraphic" operator="in"/></filter>` +
  `<filter id="rScuff"><feTurbulence type="turbulence" baseFrequency="${scuff}" numOctaves="2" seed="11"/>` +
  `<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 7 0 0 0 -3.9"/>` +
  `<feComposite in="SourceGraphic" operator="in"/></filter>` +
  // Key light from above and slightly left, falling off to floor occlusion.
  `<linearGradient id="rKey" x1=".3" y1="0" x2=".62" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/>` +
  `<stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset=".62" stop-color="#000" stop-opacity=".06"/>` +
  `<stop offset="1" stop-color="#000" stop-opacity=".42"/></linearGradient>` +
  `<radialGradient id="shadowCore"><stop offset="0" stop-color="#000" stop-opacity=".72"/>` +
  `<stop offset=".6" stop-color="#000" stop-opacity=".34"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;

/**
 * Wrap a lit (non-emissive) layer: draw it, then key light, grime and scuffs
 * clipped to its own silhouette. Runs once per layer at build time.
 */
export function realWrap(markup, box, grime = 0.36, scuff = 0.2) {
  const R = `x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}"`;
  return (
    `<defs><g id="rl">${markup}</g>` +
    `<mask id="rm" maskUnits="userSpaceOnUse" ${R}><use href="#rl" filter="url(#rWht)"/></mask></defs>` +
    `<use href="#rl"/><g mask="url(#rm)"><rect ${R} fill="url(#rKey)"/>` +
    `<rect ${R} fill="#17120b" opacity="${grime}" filter="url(#rGrime)"/>` +
    `<rect ${R} fill="#e2dccf" opacity="${scuff}" filter="url(#rScuff)"/></g>`
  );
}

/**
 * Turn a sprite built under withRealistic() into its Realistic form: lit
 * layers graded and wrapped, emissive layers scaled by `glow`. The raw graded
 * markup is kept as `silMarkup` for the cheaper distance-fog silhouette.
 */
export function realizeSprite(sprite, glow = 0.85, o = {}) {
  sprite.realistic = true;
  for (const layer of sprite.layers) {
    if (layer.shade === false || layer.blend) {
      layer.opacity = (layer.opacity ?? 1) * glow;
      continue;
    }
    const m = gradeMarkup(layer.markup, o.sat);
    layer.silMarkup = m;
    layer.markup = realWrap(m, layer.box || sprite.box, o.grime, o.scuff);
  }
  return sprite;
}

/** Realistic overrides placed ahead of the graded Modern defs (first id wins). */
const REAL_PROP_FX =
  `<radialGradient id="shadow"><stop offset="0" stop-color="#000" stop-opacity=".74"/>` +
  `<stop offset=".5" stop-color="#000" stop-opacity=".4"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="bloomG"><stop offset="0" stop-color="#9dffd0" stop-opacity=".3"/>` +
  `<stop offset=".45" stop-color="#00ff88" stop-opacity=".1"/><stop offset="1" stop-color="#00ff88" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="warmG"><stop offset="0" stop-color="#fff2c0" stop-opacity=".8"/>` +
  `<stop offset=".3" stop-color="#ffb030" stop-opacity=".28"/><stop offset="1" stop-color="#ff8a00" stop-opacity="0"/></radialGradient>`;

/** Cleaner surfaces than the default wrap: wiped boards, enamel, and the paper on a desk. */
const REAL_SURFACE = {
  whiteboard: { grime: 0.14, scuff: 0.08 },
  water_cooler: { grime: 0.2, scuff: 0.12 },
  copier: { grime: 0.2, scuff: 0.12 },
  floor_lamp: { grime: 0.2, scuff: 0.1 },
  archive_boxes: { grime: 0.24, scuff: 0.12 },
};

let realProps = null;

/** Realistic prop set, built on first use and cached: { defs, sprites }. */
export function buildRealisticProps() {
  if (realProps) return realProps;
  const sprites = withRealistic(buildAll);
  for (const key in sprites) realizeSprite(sprites[key], 0.85, REAL_SURFACE[key.split(".")[0]]);
  realProps = { defs: REAL_PROP_FX + realSurfaceDefs() + gradeMarkup(DEFS), sprites };
  return realProps;
}
