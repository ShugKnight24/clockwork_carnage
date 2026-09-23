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

/** Changing-room bench: varnished slats on a steel U-frame. */
function bench() {
  const w = 150;
  const d = 36;
  const dx = d * OX;
  const x = -(w + dx) / 2;
  const top = -45;
  let s = shadow(2, -6, 88, 14);
  // Rear legs (seen through the gap), then front legs.
  for (const lx of [x + 12, x + w - 18]) {
    s += rect(lx + dx * 0.85, zy(top + 6, d * 0.85), 5, -top - 6, "url(#dkS)", 0.8);
  }
  for (const lx of [x + 12, x + w - 18]) {
    s += block(lx, top + 6, 5, -top - 6, 4, "dk", { top: false, hi: 0.2 });
    s += rect(lx - 3, -2, 11, 2.5, "#1a1f26", 0.6, 1);
  }
  s += block(x + 12, top + 10, w - 24, 3.5, d * 0.85, "dk", { hi: 0 });
  // Seat: three slats across the depth.
  for (let i = 2; i >= 0; i--) {
    const z = (i * d) / 3;
    const [sx, sy] = pj(x, top, z);
    s += block(sx, sy, w, 5, d / 3 - 1.5, "wd", { side: true, hi: i === 0 ? 0.35 : 0 });
  }
  // Wood grain on the front slat and screw heads.
  s += line(`M${f(x + 8)},${top + 2}h40M${f(x + 70)},${top + 3}h52`, "#3a2806", 0.4, 0.45);
  for (const lx of [x + 14.5, x + w - 15.5]) s += ell(lx, top + 2.5, 0.9, 0.9, "#1a1206");
  s += rim(`M${f(x + w + d * OX)},${f(zy(top, d) + 1)}v4`, 0.45);
  return { box: [-90, -66, 180, 76], layers: [{ markup: `<g>${s}</g>` }] };
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

/** Office desk: walnut top, drawer pedestal, papers, mug and a closed laptop. */
function desk() {
  const w = 140;
  const d = 70;
  const dx = d * OX;
  const x = -(w + dx) / 2;
  const top = -76;
  let s = shadow(6, -12, 92, 24);
  // Back modesty panel and right leg panel.
  s += rect(x + 46 + dx * 0.7, zy(top + 4, d * 0.7), w - 52, 40, "url(#wnS)", 0.8);
  s += block(x + w - 5, top + 4, 5, -top - 4, d - 4, "wn", { top: false, hi: 0.2 });
  // Pedestal with three drawers.
  s += block(x + 2, top + 4, 42, -top - 4, d - 4, "wn", { top: false });
  for (let i = 0; i < 3; i++) {
    const yy = top + 8 + i * 23;
    s += rect(x + 5, yy, 36, 20, "url(#wnF)", 0.6, 0.8);
    s += rect(x + 16, yy + 8, 14, 2.4, "url(#chrome)", 0.5, 1);
  }
  s += rect(x + 2, top + 4, 42, 5, "url(#ao)", 0);
  // Top slab.
  s += block(x, top, w, 4, d, "wn", { hi: 0.4 });
  // Items on the top, placed by depth.
  const at = (px, z) => pj(x + px, top, z);
  let [px, py] = at(20, 30);
  s += poly([[px, py], [px + 30, py - 2], [px + 42, py - 10], [px + 12, py - 8]], "#e8ecef", 0.6);
  s += poly([[px + 2, py - 2], [px + 32, py - 4], [px + 43, py - 12], [px + 13, py - 10]], "#f7f9fb", 0.6);
  s += line(`M${f(px + 10)},${f(py - 5)}l18,-1M${f(px + 12)},${f(py - 7)}l20,-1.5`, "#6a7a88", 0.4, 0.6);
  [px, py] = at(78, 22);
  s += block(px, py - 2.5, 40, 2.5, 30, "dk", { hi: 0.3 });
  [px, py] = at(124, 12);
  s += path(`M${f(px - 5)},${f(py - 14)}V${f(py - 1)}C${f(px - 5)},${f(py + 1)} ${f(px + 5)},${f(py + 1)} ${f(px + 5)},${f(py - 1)}V${f(py - 14)}Z`, "url(#chrome)", 0.8);
  s += ell(px, py - 14, 5, 1.5, "#2a1a10", 0.6);
  s += `<path d="M${f(px + 5)},${f(py - 11)}c4,0 4,7 0,7" fill="none" stroke="${INK}" stroke-width="1.6"/>`;
  s += rim(`M${f(x + w + dx)},${f(zy(top, d) + 1)}v3`, 0.5);
  const [lx, ly] = at(98, 36);
  return {
    box: [-94, -104, 188, 112],
    layers: [
      { markup: `<g>${s}</g>` },
      { markup: lamp(lx, ly - 2.8, 0.9, "#22e6ff", "#d8fdff"), shade: false, blend: "lighter", anim: { type: "pulse", min: 0.2, max: 1, speed: 1.6 } },
    ],
  };
}

/** Three-drawer grey steel filing cabinet. */
function filingCabinet() {
  const w = 50;
  const h = 110;
  const d = 62;
  const x = -(w + d * OX) / 2;
  const y = -h;
  let s = shadow(6, -8, 40, 16);
  s += block(x, y, w, h, d, "gy");
  for (let i = 0; i < 3; i++) {
    const yy = y + 4 + i * 35;
    s += rect(x + 3, yy, w - 6, 32, "url(#gyF)", 0.7, 0.6);
    s += line(`M${f(x + 3.8)},${f(yy + 31)}V${f(yy + 0.8)}H${f(x + w - 3.8)}`, "#fff", 0.5, 0.45);
    s += rect(x + 17, yy + 6, 16, 6, "#f4f1e6", 0.5, 0.5);
    s += line(`M${f(x + 19)},${f(yy + 9)}h10`, "#556", 0.5, 0.6);
    s += rect(x + 14, yy + 15, 22, 4, "url(#chrome)", 0.6, 2);
    s += rect(x + 3, yy + 32, w - 6, 3, "url(#ao)", 0);
  }
  // Folder tab poking out of the top drawer.
  s += poly([[x + 32, y + 4], [x + 36, y - 1], [x + 44, y - 1], [x + 44, y + 4]], "#e3c46a", 0.5);
  s += rim(`M${f(x + w + d * OX)},${f(zy(y, d) + 1)}V${f(zy(-1, d))}`, 0.35);
  return { box: [-46, -130, 96, 140], layers: [{ markup: `<g>${s}</g>` }] };
}

/** Security console: steel desk with twin CRT-green monitors and keyboard. */
function monitorBank() {
  const w = 150;
  const d = 60;
  const dx = d * OX;
  const x = -(w + dx) / 2;
  const top = -74;
  let s = shadow(6, -10, 92, 20);
  s += block(x + 4, top + 5, w - 8, -top - 5, d - 8, "dk", { top: false });
  // Front panel vents and status strip.
  s += vents(x + 16, top + 18, 40, 5, 4.4);
  s += vents(x + w - 60, top + 18, 40, 5, 4.4);
  s += rect(x + 64, top + 16, 22, 10, "#0a0f14", 0.6, 1);
  s += rect(x + 4, top + 5, w - 8, 5, "url(#ao)", 0);
  s += block(x, top, w, 5, d, "st", { hi: 0.4 });
  // Keyboard on the desk top.
  let [kx, ky] = pj(x + 45, top, 14);
  s += poly([[kx, ky], [kx + 60, ky], [kx + 66, ky - 5], [kx + 6, ky - 5]], "#1a2028", 0.7);
  s += line(`M${f(kx + 6)},${f(ky - 1.8)}h52M${f(kx + 8)},${f(ky - 3.4)}h50`, "#56646f", 0.6, 0.7);
  // Monitors on a shared post.
  const [mx, my] = pj(0, top, 40);
  s += rect(mx - 3, my - 22, 6, 22, "url(#pipe)", 0.8);
  s += poly([[mx - 14, my], [mx + 14, my], [mx + 17, my - 3], [mx - 11, my - 3]], "url(#dkT)", 0.7);
  const screens = [];
  let readouts = "";
  for (const side of [-1, 1]) {
    const sx = mx + side * 33 - 30;
    const sy = my - 64;
    s += block(sx, sy, 60, 40, 8, "dk", { hi: 0.3 });
    s += rect(sx + 3.5, sy + 3.5, 53, 31, "url(#screen)", 0.7);
    // Static readout lines.
    for (let ln = 0; ln < 5; ln++) {
      const lw = 18 + ((ln * 37 + side * 11 + 60) % 26);
      s += rect(sx + 7, sy + 8 + ln * 5, lw, 1.6, "#00cc66", 0, 0, ` opacity=".75"`);
      if (REAL) readouts += rect(sx + 7, sy + 8 + ln * 5, lw, 1.6, "#5dffa8", 0, 0, ` opacity=".55"`);
    }
    s += `<rect x="${f(sx + 36)}" y="${f(sy + 22)}" width="16" height="9" fill="none" stroke="#00cc66" stroke-width=".4" stroke-opacity=".7"/>`;
    s += line(`M${f(sx + 37)},${f(sy + 29)}l3,-3l3,2l3,-5l3,3l3,-2`, "#9dffcc", 0.5, 0.8);
    s += ell(sx + 54, sy + 38, 0.8, 0.8, "#00ff88");
    screens.push([sx + 3.5, sy + 3.5, 53, 31]);
  }
  s += rim(`M${f(x + w + dx)},${f(zy(top, d) + 1)}V${f(zy(-5, d))}`, 0.3);
  // Emissive screen wash + bloom.
  let glow = "";
  for (const [gx, gy, gw, gh] of screens) {
    glow += rect(gx, gy, gw, gh, "#00ff88", 0, 0, ` opacity=".16"`);
    glow += `<ellipse cx="${f(gx + gw / 2)}" cy="${f(gy + gh / 2)}" rx="${f(gw * 0.75)}" ry="${f(gh * 0.9)}" fill="url(#bloomG)"/>`;
  }
  glow += readouts;
  glow += lamp(x + 68, top + 21, 0.9, "#ff3344", "#ffd0d6") + lamp(x + 75, top + 21, 0.9, "#00ff88", "#d0ffe6");
  return {
    box: [-94, -156, 190, 166],
    layers: [
      { markup: `<g>${s}</g>` },
      {
        markup: `<g>${glow}</g>`,
        shade: false,
        blend: "lighter",
        anim: { type: "flicker", min: 0.55, max: 1, speed: 2.2 },
        scan: { rects: screens, speed: 9, color: "#00ff88", alpha: 0.35 },
      },
    ],
  };
}

/** Break-room table: laminate top on four steel tube legs, paper cup. */
function table() {
  const w = 110;
  const d = 75;
  const dx = d * OX;
  const x = -(w + dx) / 2;
  const top = -74;
  let s = shadow(8, -10, 76, 24);
  const legs = [[x + 5, d - 6], [x + w - 10, d - 6], [x + 5, 2], [x + w - 10, 2]];
  for (const [lx, z] of legs) {
    const [px, py] = pj(lx, top, z);
    s += rect(px, py + 4, 4.5, -top - 4, z > 10 ? "url(#dkS)" : "url(#pipe)", 0.8);
    s += rect(px - 1.5, py - top - 2, 7.5, 2.5, "#15191e", 0.5, 1);
  }
  s += block(x + 4, top + 4, w - 8, 5, d - 6, "dk", { top: false, hi: 0 });
  s += block(x, top, w, 4.5, d, "lm", { hi: 0.45 });
  // Paper cup and napkin holder.
  const [cx, cy] = pj(x + 30, top, 30);
  s += path(`M${f(cx - 3.5)},${f(cy - 11)}L${f(cx - 2.6)},${f(cy)}H${f(cx + 2.6)}L${f(cx + 3.5)},${f(cy - 11)}Z`, "#f2efe6", 0.6);
  s += rect(cx - 3.5, cy - 8, 7, 3, "#c0392b", 0);
  const [nx, ny] = pj(x + 70, top, 40);
  s += block(nx, ny - 9, 12, 9, 6, "st", { hi: 0.3 });
  s += rect(nx + 1.5, ny - 12, 9, 4, "#fdfdfb", 0.5);
  s += rim(`M${f(x + w + dx)},${f(zy(top, d) + 1)}v3.5`, 0.5);
  return { box: [-80, -104, 164, 114], layers: [{ markup: `<g>${s}</g>` }] };
}

/** Office swivel chair: padded seat at knee height, mesh back, star base. */
function chair() {
  const sw = 48;
  const d = 44;
  const dx = d * OX;
  const x = -(sw + dx) / 2;
  const seat = -48;
  let s = shadow(4, -6, 36, 12);
  // Backrest behind the seat.
  const [bx, by] = pj(x + 2, seat - 2, d - 4);
  // J-bar from under the seat up the back of the backrest.
  const [jx, jy] = pj(x + sw / 2, seat + 8, d * 0.5);
  s += path(`M${f(jx - 2)},${f(jy)}L${f(bx + sw / 2 + 4)},${f(by + 2)}V${f(by - 20)}h-6V${f(by - 3)}L${f(jx - 6)},${f(jy - 4)}Z`, "url(#pipe)", 0.8);
  s += path(`M${f(bx)},${f(by - 6)}C${f(bx - 2)},${f(by - 30)} ${f(bx)},${f(by - 48)} ${f(bx + 6)},${f(by - 52)}H${f(bx + sw - 10)}C${f(bx + sw - 4)},${f(by - 48)} ${f(bx + sw - 2)},${f(by - 30)} ${f(bx + sw - 4)},${f(by - 6)}Z`, "url(#fbF)", 1.1);
  s += path(`M${f(bx + 5)},${f(by - 12)}C${f(bx + 4)},${f(by - 30)} ${f(bx + 6)},${f(by - 42)} ${f(bx + 10)},${f(by - 46)}H${f(bx + sw - 14)}C${f(bx + sw - 10)},${f(by - 42)} ${f(bx + sw - 8)},${f(by - 30)} ${f(bx + sw - 9)},${f(by - 12)}Z`, "none", 0.5, ` stroke-opacity=".6"`);
  s += line(`M${f(bx + 7)},${f(by - 44)}C${f(bx + 4)},${f(by - 32)} ${f(bx + 5)},${f(by - 20)} ${f(bx + 6)},${f(by - 10)}`, "#9a9ab8", 1, 0.35);
  s += rim(`M${f(bx + sw - 4.5)},${f(by - 44)}C${f(bx + sw - 2.5)},${f(by - 30)} ${f(bx + sw - 2.8)},${f(by - 18)} ${f(bx + sw - 4.5)},${f(by - 8)}`, 0.4);
  // Star base with casters and gas lift.
  const [cx, cy] = pj(x + sw / 2, 0, d / 2);
  const liftTop = zy(seat + 6, d / 2);
  s += rect(cx - 2.5, liftTop, 5, cy - 4 - liftTop, "url(#chrome)", 0.8);
  for (const [lx, ly] of [[-26, 2], [26, 1], [-14, -9], [16, -10], [0, 5]]) {
    s += line(`M${f(cx)},${f(cy - 4)}L${f(cx + lx)},${f(cy + ly - 2)}`, INK, 4.6, 1);
    s += line(`M${f(cx)},${f(cy - 4)}L${f(cx + lx)},${f(cy + ly - 2)}`, "#2b3139", 2.6, 1);
    s += ell(cx + lx, cy + ly, 2.6, 2.4, "url(#rubber)", 0.6);
  }
  // Seat cushion.
  s += block(x, seat, sw, 8, d, "fb", { rx: 0, hi: 0.3 });
  s += rect(x, seat, sw, 8, "url(#vert)", 0);
  return { box: [-40, -118, 88, 126], layers: [{ markup: `<g>${s}</g>` }] };
}

/** Blue snack/drink vending machine with lit glass front and blinking status LED. */
function vendingMachine() {
  const w = 88;
  const h = 183;
  const d = 72;
  const x = -(w + d * OX) / 2;
  const y = -h;
  let s = shadow(8, -10, 64, 20);
  s += block(x, y, w, h, d, "bv", { top: false });
  // Lightbox header.
  s += rect(x + 4, y + 4, w - 8, 14, "#0c1a48", 0.7, 1);
  s += rect(x + 8, y + 7, 30, 8, "#e8eefc", 0, 1.5);
  s += rect(x + 10, y + 9, 12, 4, "#d02030", 0, 1);
  // Glass window and shelves of product.
  const gx = x + 5;
  const gy = y + 22;
  const gw = 56;
  const gh = 104;
  s += rect(gx, gy, gw, gh, "#0a1430", 1.1, 1);
  const colors = ["#ff4444", "#44ff44", "#ffaa00", "#e8e8f0", "#44aaff"];
  for (let r = 0; r < 4; r++) {
    const sy = gy + 24 + r * 25;
    for (let c = 0; c < 5; c++) {
      const px = gx + 5 + c * 10.4;
      const col = colors[(r * 2 + c) % 5];
      if (r % 2 === 0) {
        s += rect(px, sy - 15, 8, 15, col, 0.5, 1.2);
        s += rect(px + 1.2, sy - 13, 2, 11, "#fff", 0, 0, ` opacity=".45"`);
        s += rect(px, sy - 15, 8, 3, "#c9d2da", 0.3, 1);
      } else {
        s += path(`M${f(px - 0.5)},${f(sy - 16)}h9l-0.8,16h-7.4Z`, col, 0.5);
        s += rect(px + 1, sy - 11, 6, 4, "#fff", 0, 0, ` opacity=".55"`);
      }
    }
    s += rect(gx + 1, sy, gw - 2, 2.2, "#8a96a2", 0.4);
    s += line(`M${f(gx + 3)},${f(sy + 3.8)}h${gw - 6}`, "#c8d4de", 0.6, 0.35);
  }
  // Keypad column.
  const kx = x + 66;
  s += rect(kx, gy, 17, 22, "#081020", 0.7, 1);
  s += rect(kx + 2, gy + 3, 13, 6, "#3a0a0a", 0.4);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) s += rect(kx + 2.2 + c * 4.4, gy + 28 + r * 5, 3.4, 3.6, "url(#chrome)", 0.4, 0.6);
  s += rect(kx + 5, gy + 52, 7, 12, "#070b16", 0.5, 1);
  s += line(`M${f(kx + 8.5)},${f(gy + 55)}v6`, "#9aa6b2", 0.9, 1);
  s += rect(kx + 3, gy + 72, 11, 22, "url(#dkF)", 0.5, 1);
  // Dispenser flap.
  s += rect(x + 8, -48, 52, 20, "#070b16", 0.9, 1.5);
  s += rect(x + 10, -46, 48, 8, "url(#dkT)", 0.5, 1);
  s += rect(x, -14, w, 14, "url(#bvS)", 0.8);
  // Glass reflection streaks on top of everything.
  s += `<path d="M${f(gx + 8)},${f(gy)}l-8,26v14l22,-40ZM${f(gx + 30)},${f(gy)}l-30,56v8l35,-64Z" fill="#fff" opacity=".1"/>`;
  s += rim(`M${f(x + w + d * OX)},${f(zy(y, d) + 2)}V${f(zy(-2, d))}`, 0.4);
  let glow = rect(gx + 1, gy + 1, gw - 2, gh - 2, "#bfe2ff", 0, 0, ` opacity=".16"`);
  glow += `<rect x="${f(gx)}" y="${f(gy)}" width="${gw}" height="${gh}" fill="#8fd0ff" opacity=".35" filter="url(#soft)"/>`;
  glow += rect(x + 8, y + 7, 30, 8, "#ffffff", 0, 1.5, ` opacity=".35"`);
  glow += rect(kx + 2, gy + 3, 13, 6, "#ff3344", 0, 0, ` opacity=".6"`);
  return {
    box: [-66, -212, 134, 224],
    layers: [
      { markup: `<g>${s}</g>` },
      { markup: `<g>${glow}</g>`, shade: false, blend: "lighter", anim: { type: "pulse", min: 0.65, max: 1, speed: 1.8 } },
      { markup: lamp(kx + 13, y + 11, 1.5, "#00ff44", "#d8ffe0"), shade: false, blend: "lighter", anim: { type: "blink", min: 0.3, max: 0.9, speed: 5 } },
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

/** Terracotta planter with arching palm fronds in two swaying layers. */
function pottedPlant() {
  const rimY = -44;
  let pot = shadow(2, -3, 34, 9);
  pot += path(`M-22,${rimY}L-16,-2C-15,0 15,0 16,-2L22,${rimY}Z`, "url(#tcF)", 1.1);
  pot += path(`M-22,${rimY}L-16,-2C-15,0 15,0 16,-2L22,${rimY}Z`, "url(#vert)", 0);
  pot += line(`M-17,${rimY + 6}L-12.5,-5`, "#f0a070", 1.2, 0.35);
  pot += rect(-25, rimY - 7, 50, 8, "url(#tcF)", 1.1, 1.5);
  pot += line(`M-24,${rimY - 6}h47`, "#f0a070", 0.6, 0.45);
  pot += rect(-22, rimY + 1, 44, 4, "url(#ao)", 0);
  pot += ell(0, rimY - 6.5, 21, 2.6, "#2a1a0c", 0.6);
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
};

const buildAll = () => {
  const out = {};
  for (const key in BUILDERS) out[key] = BUILDERS[key]();
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

let realProps = null;

/** Realistic prop set, built on first use and cached: { defs, sprites }. */
export function buildRealisticProps() {
  if (realProps) return realProps;
  const sprites = withRealistic(buildAll);
  for (const key in sprites) realizeSprite(sprites[key]);
  realProps = { defs: REAL_PROP_FX + realSurfaceDefs() + gradeMarkup(DEFS), sprites };
  return realProps;
}
