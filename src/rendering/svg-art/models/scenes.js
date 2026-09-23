/** SVG scene art and backgrounds. See ../index.js for the format. */

// ── Shared helpers ──────────────────────────────────────────────────────────

const INK = "#04060b";
const n1 = (v) => Math.round(v * 10) / 10;
const pts = (list) => list.map(([x, y]) => `${n1(x)},${n1(y)}`).join(" ");
const poly = (list, attrs) => `<polygon points="${pts(list)}" ${attrs}/>`;
const seg = ([x1, y1], [x2, y2], attrs) =>
  `<line x1="${n1(x1)}" y1="${n1(y1)}" x2="${n1(x2)}" y2="${n1(y2)}" ${attrs}/>`;
const lerp = (a, b, k) => a + (b - a) * k;

/** Deterministic PRNG so backgrounds rasterise identically every load. */
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** One-point perspective: world (X, Y, z) → screen, vanishing point (vx, vy). */
const camera = (vx, vy, f) => (X, Y, z) => [vx + (X * f) / z, vy + (Y * f) / z];
/** Quad on a side wall (constant X). */
const wallQuad = (cam, X, y0, y1, z0, z1) => [cam(X, y0, z0), cam(X, y0, z1), cam(X, y1, z1), cam(X, y1, z0)];
/** Quad on a floor/ceiling plane (constant Y). */
const flatQuad = (cam, Y, x0, x1, z0, z1) => [cam(x0, Y, z0), cam(x1, Y, z0), cam(x1, Y, z1), cam(x0, Y, z1)];
/** Quad facing the viewer (constant z). */
const faceQuad = (cam, z, x0, x1, y0, y1) => [cam(x0, y0, z), cam(x1, y0, z), cam(x1, y1, z), cam(x0, y1, z)];

/** Soft round glow using a shared radial gradient id. */
const bloom = (x, y, rx, ry, grad, opacity = 1) =>
  `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(rx)}" ry="${n1(ry)}" fill="url(#${grad})" opacity="${opacity}"/>`;

/** Radial gradient that fades a colour to transparent (objectBoundingBox). */
const fadeGrad = (id, color, a0, mid = 0.35) =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${a0}"/>` +
  `<stop offset="${mid}" stop-color="${color}" stop-opacity="${n1(a0 * 0.45 * 100) / 100}"/>` +
  `<stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;

// Bottom-of-frame darkening (dialogue sits there) plus a soft vignette.
const SHADE_DEFS =
  `<linearGradient id="shadeBottom" x1="0" y1="0" x2="0" y2="900" gradientUnits="userSpaceOnUse">` +
  `<stop offset="0.5" stop-color="#020408" stop-opacity="0"/>` +
  `<stop offset="0.7" stop-color="#020408" stop-opacity="0.55"/>` +
  `<stop offset="1" stop-color="#010204" stop-opacity="0.94"/></linearGradient>` +
  `<radialGradient id="shadeVignette" cx="800" cy="380" r="900" gradientUnits="userSpaceOnUse" ` +
  `gradientTransform="translate(800 380) scale(1 0.66) translate(-800 -380)">` +
  `<stop offset="0.5" stop-color="#000" stop-opacity="0"/>` +
  `<stop offset="1" stop-color="#000" stop-opacity="0.85"/></radialGradient>`;

const shadeLayer = (bottom = 1, edge = 1) => ({
  markup:
    `<rect width="1600" height="900" fill="url(#shadeVignette)" opacity="${edge}"/>` +
    `<rect width="1600" height="900" fill="url(#shadeBottom)" opacity="${bottom}"/>`,
});

const BG_BLUR = (id, sd) =>
  `<filter id="${id}" filterUnits="userSpaceOnUse" x="-100" y="-100" width="1800" height="1100">` +
  `<feGaussianBlur stdDeviation="${sd}"/></filter>`;

// ── Memory fragments ────────────────────────────────────────────────────────

const FRAGMENT_PALETTES = {
  fragment_blue: { deep: "#04162c", mid: "#0d4f8c", light: "#3fa6ff", pale: "#c4e6ff", core: "#f0f9ff", glow: "#1e8cff" },
  fragment_green: { deep: "#03211a", mid: "#0b6a49", light: "#3fe0a0", pale: "#c8ffe4", core: "#f2fff8", glow: "#1fd68e" },
  fragment_amber: { deep: "#261504", mid: "#86500e", light: "#ffac3c", pale: "#ffe2b6", core: "#fff7ea", glow: "#ff9624" },
};

// Main shard outline (clockwise from apex) and its inner ridge vertex.
const SHARD = [[3, -92], [20, -60], [31, -22], [24, 12], [6, 40], [-14, 20], [-29, -14], [-18, -56]];
const SHARD_CORE = [1, -26];
// Facet shade per edge, lit from the upper left.
const SHARD_SHADES = ["fLight", "fMid", "fRim", "fDark", "fDeep", "fDark", "fMid", "fPale"];
const BACK_SHARD = [[40, -70], [49, -42], [43, -4], [27, 8], [19, -30]];
const SIDE_SHARD = [[-36, -44], [-23, -26], [-20, 8], [-31, 18], [-43, -6]];
const MINI_SHARDS = [[-52, -66, 8, 0.4], [48, -84, 6, -0.3], [55, 22, 7, 0.6], [-47, 34, 5, -0.5]];

/** Facets for a convex shard around an inner vertex. */
function facets(outline, core, shades) {
  return outline
    .map((p, i) => {
      const q = outline[(i + 1) % outline.length];
      return poly([core, p, q], `fill="url(#${shades[i % shades.length]})" fill-opacity="0.86"`);
    })
    .join("");
}

/** A small tumbling shard (diamond with two lit facets). */
function miniShard(x, y, s, rot) {
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  const p = (dx, dy) => [x + dx * c - dy * sn, y + dx * sn + dy * c];
  const top = p(0, -s * 1.6);
  const r = p(s * 0.7, -s * 0.1);
  const bot = p(0, s * 1.3);
  const l = p(-s * 0.6, s * 0.1);
  const mid = p(s * 0.05, 0);
  return (
    poly([top, r, bot, l], `fill="url(#fMid)" stroke="${INK}" stroke-width="0.6" stroke-linejoin="round"`) +
    poly([top, mid, l], `fill="url(#fPale)" fill-opacity="0.9"`) +
    poly([mid, r, bot], `fill="url(#fDark)" fill-opacity="0.8"`)
  );
}

function fragmentModel(pal) {
  const defs =
    `<linearGradient id="fPale" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.core}"/><stop offset="1" stop-color="${pal.light}"/></linearGradient>` +
    `<linearGradient id="fLight" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.pale}"/><stop offset="1" stop-color="${pal.mid}"/></linearGradient>` +
    `<linearGradient id="fMid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.light}"/><stop offset="1" stop-color="${pal.deep}"/></linearGradient>` +
    `<linearGradient id="fRim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${pal.deep}"/><stop offset="0.7" stop-color="${pal.mid}"/><stop offset="1" stop-color="${pal.light}"/></linearGradient>` +
    `<linearGradient id="fDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.mid}"/><stop offset="1" stop-color="${pal.deep}"/></linearGradient>` +
    `<linearGradient id="fDeep" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.deep}"/><stop offset="1" stop-color="#020306"/></linearGradient>` +
    fadeGrad("fAura", pal.glow, 0.34, 0.4) +
    fadeGrad("fCore", pal.core, 0.95, 0.25) +
    fadeGrad("fHalo", pal.light, 0.7, 0.3) +
    `<clipPath id="fClip"><polygon points="${pts(SHARD)}"/></clipPath>` +
    `<filter id="fBlur2" x="-0.5" y="-0.5" width="2" height="2"><feGaussianBlur stdDeviation="2"/></filter>` +
    `<filter id="fBlur1" x="-0.5" y="-0.5" width="2" height="2"><feGaussianBlur stdDeviation="0.9"/></filter>`;

  // Ghost of the person this memory belongs to: head, neck and shoulders.
  const bust =
    "M -2 -56 C -9 -56 -12 -49 -11 -43 C -10 -37 -7 -33 -5 -31 L -5 -27 C -11 -25 -19 -23 -23 -17 " +
    "C -26 -12 -26 0 -26 8 L 28 8 C 28 0 28 -12 25 -17 C 21 -23 13 -25 7 -27 L 7 -31 " +
    "C 9 -33 12 -37 12 -43 C 13 -50 9 -56 2 -56 Z";

  const aura =
    bloom(2, -28, 78, 92, "fAura") +
    bloom(2, 56, 44, 7, "fHalo", 0.35);

  const orbit =
    MINI_SHARDS.map(([x, y, s, r]) => miniShard(x, y, s, r)).join("") +
    [[-38, -84], [34, -100], [60, -30], [-60, -10], [40, 44], [-24, 50]]
      .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${0.8 + (i % 3) * 0.4}" fill="${pal.pale}" opacity="0.8"/>`)
      .join("");

  const crystal =
    // back shard (in shadow)
    poly(BACK_SHARD, `fill="url(#fDark)" stroke="${INK}" stroke-width="1" stroke-linejoin="round"`) +
    poly([BACK_SHARD[0], BACK_SHARD[1], BACK_SHARD[4]], `fill="url(#fMid)" fill-opacity="0.7"`) +
    seg(BACK_SHARD[0], BACK_SHARD[1], `stroke="${pal.light}" stroke-width="0.8" opacity="0.8"`) +
    // main shard
    `<polygon points="${pts(SHARD)}" fill="${pal.deep}"/>` +
    facets(SHARD, SHARD_CORE, SHARD_SHADES) +
    // memory silhouette trapped inside
    `<g clip-path="url(#fClip)"><path d="${bust}" fill="${pal.deep}" opacity="0.72"/>` +
    `<path d="${bust}" fill="none" stroke="#020306" stroke-width="1.4" opacity="0.35"/></g>` +
    // facet ridges
    SHARD.map((p) => seg(SHARD_CORE, p, `stroke="${pal.pale}" stroke-width="0.45" opacity="0.22"`)).join("") +
    // specular strip along the lit upper-left edges
    poly([[-17, -55], [2, -89], [4, -84], [-13, -53]], `fill="${pal.core}" opacity="0.75"`) +
    poly([[-27, -15], [-18, -53], [-16, -50], [-24, -15]], `fill="${pal.pale}" opacity="0.45"`) +
    `<polygon points="${pts(SHARD)}" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>` +
    // front-left shard
    poly(SIDE_SHARD, `fill="url(#fMid)" stroke="${INK}" stroke-width="1" stroke-linejoin="round"`) +
    poly([SIDE_SHARD[0], [-28, -8], SIDE_SHARD[4]], `fill="url(#fPale)" fill-opacity="0.8"`) +
    poly([SIDE_SHARD[0], SIDE_SHARD[1], SIDE_SHARD[2], [-28, -8]], `fill="url(#fDark)" fill-opacity="0.75"`) +
    seg(SIDE_SHARD[0], SIDE_SHARD[4], `stroke="${pal.core}" stroke-width="0.7" opacity="0.7"`);

  const inner =
    `<g clip-path="url(#fClip)">` +
    bloom(2, -30, 30, 44, "fHalo", 0.75) +
    bloom(2, -44, 13, 15, "fCore", 0.9) +
    `<path d="${bust}" fill="none" stroke="${pal.pale}" stroke-width="1.6" filter="url(#fBlur2)" opacity="0.9"/>` +
    `<path d="${bust}" fill="none" stroke="${pal.core}" stroke-width="0.5" opacity="0.8"/>` +
    `</g>` +
    // rim light on the right edges
    `<polyline points="${pts([SHARD[1], SHARD[2], SHARD[3], SHARD[4]])}" fill="none" stroke="${pal.light}" stroke-width="1.3" stroke-linejoin="round" filter="url(#fBlur1)"/>` +
    `<polyline points="${pts([SHARD[0], SHARD[1], SHARD[2]])}" fill="none" stroke="${pal.core}" stroke-width="0.5" opacity="0.9"/>`;

  // Corrupted scan lines tearing through the memory.
  const glitch =
    `<g clip-path="url(#fClip)">` +
    [[-62, 34, 1.2], [-40, 50, 0.7], [-18, 40, 1.4], [-4, 22, 0.6], [14, 46, 1]]
      .map(([y, w, h], i) => `<rect x="${n1(-w / 2 + (i % 2 ? 6 : -4))}" y="${y}" width="${w}" height="${h}" fill="${pal.core}" opacity="0.8"/>`)
      .join("") +
    `</g>` +
    `<rect x="24" y="-41" width="16" height="1" fill="${pal.light}" opacity="0.7"/>` +
    `<rect x="-44" y="-2" width="12" height="1.2" fill="${pal.light}" opacity="0.6"/>`;

  return {
    box: [-72, -108, 144, 174],
    defs,
    anim: { type: "float", amp: 3, speed: 1.1 },
    layers: [
      { markup: aura, anim: { type: "pulse", min: 0.55, max: 1, speed: 1.7 }, blend: "lighter" },
      { markup: orbit, anim: { type: "float", amp: 4, speed: 1.4, phase: 1.3 } },
      { markup: crystal },
      { markup: inner, anim: { type: "flicker", min: 0.55, max: 1, speed: 1.2 }, blend: "lighter" },
      { markup: glitch, anim: { type: "flicker", min: 0, max: 0.9, speed: 2.6, phase: 0.7 }, blend: "lighter" },
    ],
  };
}

// ── Chronos Station exterior ────────────────────────────────────────────────

function stationModel() {
  const defs =
    `<linearGradient id="stBlock" x1="0" y1="0" x2="1" y2="0.35"><stop offset="0" stop-color="#4c6782"/><stop offset="0.35" stop-color="#2c3e52"/><stop offset="0.8" stop-color="#141f2c"/><stop offset="1" stop-color="#0c141e"/></linearGradient>` +
    `<linearGradient id="stTower" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6f8aa3"/><stop offset="0.3" stop-color="#3a4d61"/><stop offset="0.7" stop-color="#1c2733"/><stop offset="1" stop-color="#0e1620"/></linearGradient>` +
    `<linearGradient id="stWingL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#465f78"/><stop offset="1" stop-color="#1c2836"/></linearGradient>` +
    `<linearGradient id="stWingR" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a2633"/><stop offset="1" stop-color="#0a111a"/></linearGradient>` +
    `<linearGradient id="stPlinth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3a4a"/><stop offset="1" stop-color="#080d14"/></linearGradient>` +
    `<linearGradient id="stDoor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaffff"/><stop offset="0.5" stop-color="#5cf0ff"/><stop offset="1" stop-color="#0b6378"/></linearGradient>` +
    `<linearGradient id="stRing" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7f9bb5"/><stop offset="0.5" stop-color="#34475b"/><stop offset="1" stop-color="#1a2531"/></linearGradient>` +
    fadeGrad("stAura", "#22e6ff", 0.3, 0.4) +
    fadeGrad("stGlow", "#7ff4ff", 0.8, 0.25) +
    fadeGrad("stBeacon", "#00ffcc", 0.9, 0.2) +
    `<radialGradient id="stGround"><stop offset="0" stop-color="#000" stop-opacity="0.7"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
    `<filter id="stBlur" x="-0.3" y="-0.3" width="1.6" height="1.6"><feGaussianBlur stdDeviation="1.6"/></filter>`;

  const rand = rng(31);
  const windowRows = [-15, -3, 9];
  let windows = "";
  let windowsDark = "";
  for (const y of windowRows) {
    windowsDark += `<rect x="-84" y="${y - 1}" width="168" height="7" fill="#050b12"/>`;
    for (let x = -82; x < 80; x += 7) {
      if (x > -16 && x < 10 && y === 9) continue; // canopy
      const r = rand();
      if (r < 0.1) windows += `<rect x="${x}" y="${y}" width="5" height="4.2" fill="#ffcf8a" opacity="0.85"/>`;
      else if (r < 0.62) windows += `<rect x="${x}" y="${y}" width="5" height="4.2" fill="#8ff4ff" opacity="${r < 0.35 ? 0.55 : 0.9}"/>`;
    }
  }
  for (const [x0, x1] of [[-112, -90], [92, 112]]) {
    windowsDark += `<rect x="${x0}" y="10" width="${x1 - x0}" height="6" fill="#050b12"/>`;
    for (let x = x0 + 2; x < x1 - 3; x += 6) {
      if (rand() < 0.6) windows += `<rect x="${x}" y="11" width="4" height="3.6" fill="#8ff4ff"/>`;
    }
  }
  windows += `<rect x="-18" y="-82.6" width="36" height="2.4" fill="#b8fbff" opacity="0.8"/>`;
  for (let y = -72; y < -32; y += 6) {
    if (rand() < 0.75) windows += `<rect x="-2.2" y="${y}" width="4.4" height="3.6" fill="#b8fbff"/>`;
  }

  const ringBack = "M -52 -52 A 52 11 0 0 1 52 -52";
  const ringFront = "M 52 -52 A 52 11 0 0 1 -52 -52";
  const ticks = [];
  for (let i = 1; i < 12; i++) {
    const a = (i / 12) * Math.PI;
    ticks.push([52 * Math.cos(a), -52 + 11 * Math.sin(a)]);
  }

  const aura =
    bloom(0, -38, 132, 100, "stAura") +
    bloom(0, -121, 18, 18, "stBeacon", 0.3);

  const tier = (y) =>
    `<rect x="-86" y="${y + 6.2}" width="172" height="1.2" fill="#0a111a"/>` +
    seg([-86, y + 6.4], [86, y + 6.4], `stroke="#7d98b2" stroke-width="0.5" opacity="0.45"`);

  const structure =
    `<ellipse cx="0" cy="46" rx="126" ry="8" fill="url(#stGround)"/>` +
    // ring, back half
    `<path d="${ringBack}" fill="none" stroke="#101923" stroke-width="4.5"/>` +
    `<path d="${ringBack}" fill="none" stroke="#22e6ff" stroke-width="0.6" opacity="0.35"/>` +
    // wings
    poly([[-118, 34], [-118, 6], [-106, -3], [-86, -3], [-86, 34]], `fill="url(#stWingL)" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"`) +
    poly([[86, 34], [86, -3], [106, -3], [118, 6], [118, 34]], `fill="url(#stWingR)" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"`) +
    seg([-118, 6], [-106, -3], `stroke="#9fbad0" stroke-width="0.7" opacity="0.6"`) +
    seg([106, -3], [118, 6], `stroke="#22e6ff" stroke-width="0.8" opacity="0.6"`) +
    seg([118, 6], [118, 34], `stroke="#22e6ff" stroke-width="0.9" opacity="0.75"`) +
    // main block with its roof deck seen from slightly above
    poly([[-90, 34], [-90, -10], [-77, -23], [77, -23], [90, -10], [90, 34]], `fill="url(#stBlock)" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"`) +
    poly([[-77, -23], [77, -23], [70, -29], [-70, -29]], `fill="#33475c" stroke="${INK}" stroke-width="1" stroke-linejoin="round"`) +
    `<rect x="-66" y="-33" width="14" height="6" fill="#1c2733" stroke="${INK}" stroke-width="0.7"/>` +
    `<rect x="-47" y="-31.5" width="8" height="4" fill="#243242" stroke="${INK}" stroke-width="0.6"/>` +
    `<rect x="44" y="-33" width="18" height="6" fill="#18222e" stroke="${INK}" stroke-width="0.7"/>` +
    seg([-66, -33], [-52, -33], `stroke="#8fb0cc" stroke-width="0.5" opacity="0.6"`) +
    `<polyline points="-90,-10 -77,-23 76,-23" fill="none" stroke="#a9c3d8" stroke-width="0.8" opacity="0.7"/>` +
    `<polyline points="77,-23 90,-10 90,34" fill="none" stroke="#22e6ff" stroke-width="1" opacity="0.7"/>` +
    windowsDark +
    windowRows.map(tier).join("") +
    [-62, -34, 34, 62].map((x) => `<rect x="${x - 2}" y="-20" width="4" height="54" fill="#0c1520"/>` +
      seg([x - 2, -20], [x - 2, 34], `stroke="#6f8aa3" stroke-width="0.5" opacity="0.5"`)).join("") +
    // entrance
    poly([[-24, 17], [24, 17], [28, 13], [-28, 13]], `fill="#3a4d61" stroke="${INK}" stroke-width="0.8"`) +
    `<rect x="-13" y="18" width="26" height="16" fill="url(#stDoor)" stroke="${INK}" stroke-width="0.8"/>` +
    seg([0, 18], [0, 34], `stroke="#0b3e4c" stroke-width="0.8"`) +
    // plinth
    poly([[-112, 34], [112, 34], [124, 46], [-124, 46]], `fill="url(#stPlinth)" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"`) +
    seg([-112, 34], [112, 34], `stroke="#8fb0cc" stroke-width="0.7" opacity="0.6"`) +
    poly([[-14, 34], [14, 34], [18, 46], [-18, 46]], `fill="#1c2c3a" opacity="0.8"`) +
    // antenna mast
    `<rect x="-1.3" y="-120" width="2.6" height="24" fill="#2a3a4a" stroke="${INK}" stroke-width="0.6"/>` +
    `<rect x="-6" y="-108" width="12" height="1.6" fill="#3a4d61" stroke="${INK}" stroke-width="0.4"/>` +
    `<rect x="-4" y="-114" width="8" height="1.3" fill="#3a4d61" stroke="${INK}" stroke-width="0.4"/>` +
    // tower body, observation deck and crown
    poly([[-27, -24], [-19, -78], [19, -78], [27, -24]], `fill="url(#stTower)" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"`) +
    `<rect x="-3.4" y="-74" width="6.8" height="44" fill="#050b12"/>` +
    seg([-12, -76], [-16.5, -26], `stroke="${INK}" stroke-width="0.5" opacity="0.6"`) +
    seg([12, -76], [16.5, -26], `stroke="${INK}" stroke-width="0.5" opacity="0.6"`) +
    [-40, -62].map((y) => {
      const hw = 19 + ((-78 - y) / -54) * 8;
      return seg([-hw, y], [hw, y], `stroke="${INK}" stroke-width="1"`) + seg([-hw, y + 1], [hw, y + 1], `stroke="#8fb0cc" stroke-width="0.5" opacity="0.5"`);
    }).join("") +
    seg([-18.5, -76], [-26.3, -26], `stroke="#b9d3e8" stroke-width="0.7" opacity="0.55"`) +
    seg([19, -78], [27, -24], `stroke="#22e6ff" stroke-width="0.9" opacity="0.7"`) +
    poly([[-23, -78], [23, -78], [21, -85], [-21, -85]], `fill="url(#stTower)" stroke="${INK}" stroke-width="1" stroke-linejoin="round"`) +
    `<rect x="-19" y="-83.2" width="38" height="3.6" fill="#050b12"/>` +
    poly([[-18, -85], [-11, -95], [11, -95], [18, -85]], `fill="url(#stTower)" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"`) +
    poly([[-6, -95], [-3.5, -100], [3.5, -100], [6, -95]], `fill="#3a4d61" stroke="${INK}" stroke-width="0.8"`) +
    seg([-21, -85], [21, -85], `stroke="#b9d3e8" stroke-width="0.6" opacity="0.6"`) +
    seg([-11, -95], [11, -95], `stroke="#b9d3e8" stroke-width="0.6" opacity="0.6"`) +
    seg([18, -85], [11, -95], `stroke="#22e6ff" stroke-width="0.7" opacity="0.6"`) +
    // ring struts and front half
    seg([-23, -48], [-44, -45], `stroke="#1c2733" stroke-width="2"`) +
    seg([23, -48], [44, -45], `stroke="#1c2733" stroke-width="2"`) +
    `<path d="${ringFront}" fill="none" stroke="${INK}" stroke-width="6"/>` +
    `<path d="${ringFront}" fill="none" stroke="url(#stRing)" stroke-width="4.2"/>`;

  const lights =
    windows +
    `<g filter="url(#stBlur)" opacity="0.8">${windows}</g>` +
    bloom(0, 30, 30, 16, "stGlow", 0.7) +
    poly([[-13, 34], [13, 34], [20, 46], [-20, 46]], `fill="#5cf0ff" opacity="0.2"`);

  const ring =
    `<path d="${ringFront}" fill="none" stroke="#22e6ff" stroke-width="0.8"/>` +
    `<path d="${ringFront}" fill="none" stroke="#22e6ff" stroke-width="2.4" filter="url(#stBlur)" opacity="0.7"/>` +
    ticks.map(([x, y]) => `<circle cx="${n1(x)}" cy="${n1(y + 0.4)}" r="0.9" fill="#d8fdff"/>`).join("");

  const beacon =
    bloom(0, -121, 16, 16, "stBeacon") +
    `<circle cx="0" cy="-121" r="2.4" fill="#eafffb"/>` +
    seg([-10, -121], [10, -121], `stroke="#9ffff0" stroke-width="0.5" opacity="0.7"`);

  return {
    box: [-130, -142, 260, 196],
    defs,
    layers: [
      { markup: aura, anim: { type: "pulse", min: 0.6, max: 1, speed: 1.8 }, blend: "lighter" },
      { markup: structure },
      { markup: lights, anim: { type: "flicker", min: 0.82, max: 1, speed: 0.5 }, blend: "lighter" },
      { markup: ring, anim: { type: "pulse", min: 0.45, max: 1, speed: 1.2 }, blend: "lighter" },
      { markup: beacon, anim: { type: "pulse", min: 0.3, max: 1, speed: 3 }, blend: "lighter" },
    ],
  };
}

// ── Station corridor background ─────────────────────────────────────────────

function stationBackground() {
  const S = camera(800, 340, 800);
  const W = 1;
  const C = -1.1;
  const F = 1;
  const NEAR = 0.7;
  const FAR = 7;
  const T = 0.08; // rib thickness
  const CH = 0.14; // rib chamfer
  const D = 0.07; // rib depth
  const ribs = [1.1, 1.45, 1.95, 2.6, 3.5, 4.7, 6.1];
  const bays = ribs.map((z, i) => [(z + D) / (1 - T) + 0.02, (ribs[i + 1] ?? FAR) - 0.03]);

  const defs =
    SHADE_DEFS +
    `<linearGradient id="ceil" x1="0" y1="0" x2="0" y2="220" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#03060b"/><stop offset="1" stop-color="#0e1a2b"/></linearGradient>` +
    `<linearGradient id="floor" x1="0" y1="455" x2="0" y2="900" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#16283c"/><stop offset="0.35" stop-color="#0a1522"/><stop offset="1" stop-color="#020409"/></linearGradient>` +
    `<linearGradient id="wallL" x1="0" y1="0" x2="686" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#03060c"/><stop offset="0.55" stop-color="#0b1626"/><stop offset="1" stop-color="#162a40"/></linearGradient>` +
    `<linearGradient id="wallR" x1="1600" y1="0" x2="914" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#02050a"/><stop offset="0.55" stop-color="#0a1422"/><stop offset="1" stop-color="#14263a"/></linearGradient>` +
    `<linearGradient id="panelL" x1="0" y1="0" x2="686" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#060b14"/><stop offset="1" stop-color="#1c3048"/></linearGradient>` +
    `<linearGradient id="panelR" x1="1600" y1="0" x2="914" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#04080f"/><stop offset="1" stop-color="#192b40"/></linearGradient>` +
    `<linearGradient id="guide" x1="0" y1="455" x2="0" y2="760" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#22e6ff" stop-opacity="0.75"/><stop offset="1" stop-color="#22e6ff" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="doorLight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2fdff"/><stop offset="0.45" stop-color="#8ff0ff"/><stop offset="1" stop-color="#1a90ad"/></linearGradient>` +
    `<linearGradient id="beamGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff4455" stop-opacity="0.9"/><stop offset="1" stop-color="#ff2a3a" stop-opacity="0"/></linearGradient>` +
    fadeGrad("gCyan", "#8feaff", 0.55, 0.3) +
    fadeGrad("gPanel", "#bdf3ff", 0.5, 0.3) +
    fadeGrad("gHaze", "#3b7fb0", 0.22, 0.45) +
    fadeGrad("gRed", "#ff2a3a", 0.55, 0.25) +
    fadeGrad("gDot", "#ffffff", 0.9, 0.2) +
    BG_BLUR("blur6", 6) +
    BG_BLUR("blur2", 2);

  let base = `<rect width="1600" height="900" fill="#03060b"/>`;
  base += poly(flatQuad(S, C, -W, W, NEAR, FAR), `fill="url(#ceil)"`);
  base += poly(flatQuad(S, F, -W, W, NEAR, FAR), `fill="url(#floor)"`);
  base += poly(wallQuad(S, -W, C, F, NEAR, FAR), `fill="url(#wallL)"`);
  base += poly(wallQuad(S, W, C, F, NEAR, FAR), `fill="url(#wallR)"`);

  // Far bulkhead with a lit, half-open blast door.
  base += poly(faceQuad(S, FAR, -W, W, C, F), `fill="#101d2e"`);
  base += poly(faceQuad(S, FAR, -0.62, 0.62, -0.8, F), `fill="#1b2b3e" stroke="${INK}" stroke-width="1.5"`);
  base += poly(faceQuad(S, FAR, -0.46, 0.46, -0.66, F), `fill="url(#doorLight)"`);
  base += poly(faceQuad(S, FAR, -0.46, -0.2, -0.66, F), `fill="#0d1826"`);
  base += poly(faceQuad(S, FAR, 0.2, 0.46, -0.66, F), `fill="#0b1522"`);
  base += seg(S(-0.2, -0.66, FAR), S(-0.2, F, FAR), `stroke="#8ff0ff" stroke-width="1.6"`);
  base += seg(S(0.2, -0.66, FAR), S(0.2, F, FAR), `stroke="#8ff0ff" stroke-width="1.6"`);
  base += poly(faceQuad(S, FAR, -0.62, 0.62, -0.92, -0.84), `fill="#ffaa44" opacity="0.8"`);
  for (let i = 0; i < 12; i++) {
    const x = -0.6 + i * 0.1;
    base += poly([S(x, -0.92, FAR), S(x + 0.05, -0.92, FAR), S(x + 0.02, -0.84, FAR), S(x - 0.03, -0.84, FAR)], `fill="#120c05"`);
  }

  // Floor: panel seams, centre grating and guide strips.
  for (const X of [-0.5, 0.5]) base += seg(S(X, F, NEAR), S(X, F, FAR), `stroke="#1d3148" stroke-width="1.2" opacity="0.7"`);
  base += poly(flatQuad(S, F, -0.2, 0.2, NEAR, FAR), `fill="#0a1522"`);
  for (let z = 1.6; z < FAR; z += 0.22) base += seg(S(-0.2, F, z), S(0.2, F, z), `stroke="#03070d" stroke-width="${n1(Math.max(0.6, 5 / z))}"`);
  base += poly(flatQuad(S, F, -0.66, -0.61, NEAR, FAR), `fill="url(#guide)"`);
  base += poly(flatQuad(S, F, 0.61, 0.66, NEAR, FAR), `fill="url(#guide)"`);
  for (const z of ribs) base += poly(flatQuad(S, F, -W, W, z, z + D), `fill="#0d1826"`);

  // Wall panels, ceiling lights and practical wall strips per bay.
  bays.forEach(([z0, z1], i) => {
    if (z1 - z0 < 0.15) return;
    const a = z0 + 0.03;
    const b = z1 - 0.03;
    base += poly(wallQuad(S, -W, -0.8, 0.62, a, b), `fill="url(#panelL)" stroke="${INK}" stroke-width="1.2"`);
    base += poly(wallQuad(S, W, -0.8, 0.62, a, b), `fill="url(#panelR)" stroke="${INK}" stroke-width="1.2"`);
    base += seg(S(-W, -0.8, a), S(-W, -0.8, b), `stroke="#4d6a86" stroke-width="1" opacity="0.5"`);
    base += seg(S(W, -0.8, a), S(W, -0.8, b), `stroke="#3a5670" stroke-width="1" opacity="0.4"`);
    base += poly(flatQuad(S, C, -0.3, 0.3, a + 0.04, b - 0.04), `fill="#dff8ff"`);
    base += poly(flatQuad(S, C, -0.34, 0.34, a, b), `fill="none" stroke="#1d2e42" stroke-width="2"`);
    // vertical light strip at the far end of each bay
    base += poly(wallQuad(S, -W, -0.55, 0.35, b - 0.07, b - 0.03), `fill="#aef0ff"`);
    base += poly(wallQuad(S, W, -0.55, 0.35, b - 0.07, b - 0.03), `fill="#aef0ff"`);
    // kick plate
    base += poly(wallQuad(S, -W, 0.8, F, a, b), `fill="#060b13"`);
    base += poly(wallQuad(S, W, 0.8, F, a, b), `fill="#050a11"`);
    base += seg(S(-W, 0.8, a), S(-W, 0.8, b), `stroke="#22e6ff" stroke-width="1" opacity="${i > 2 ? 0.35 : 0.15}"`);
    base += seg(S(W, 0.8, a), S(W, 0.8, b), `stroke="#22e6ff" stroke-width="1" opacity="${i > 2 ? 0.3 : 0.12}"`);
  });

  // Wall display on the left, side door on the right.
  const [dz0, dz1] = bays[2];
  base += poly(wallQuad(S, -W, -0.52, 0.06, dz0 + 0.06, dz1 - 0.12), `fill="#040b14" stroke="#2b4b68" stroke-width="2"`);
  const [rz0, rz1] = bays[3];
  base += poly(wallQuad(S, W, -0.66, F, rz0 + 0.08, rz1 - 0.2), `fill="#081220" stroke="#2c4560" stroke-width="2"`);
  base += seg(S(W, -0.66, lerp(rz0, rz1, 0.42)), S(W, F, lerp(rz0, rz1, 0.42)), `stroke="#02050a" stroke-width="2"`);
  base += poly(wallQuad(S, W, -0.2, 0.05, rz1 - 0.17, rz1 - 0.1), `fill="#0c1a28" stroke="#2c4560" stroke-width="1"`);

  // Pipes along the left wall, cable tray on the right.
  const pipe = (X, Y, r) => {
    let s = poly(wallQuad(S, X, Y - r, Y + r, NEAR, FAR), `fill="#132131"`);
    s += poly(wallQuad(S, X, Y - r * 0.8, Y - r * 0.15, NEAR, FAR), `fill="#4a637c" opacity="0.6"`);
    s += poly(wallQuad(S, X, Y - r * 0.6, Y - r * 0.4, NEAR, FAR), `fill="#cfe6f5" opacity="0.45"`);
    s += poly(wallQuad(S, X, Y + r * 0.5, Y + r, NEAR, FAR), `fill="#02050a" opacity="0.7"`);
    return s;
  };
  base += pipe(-0.95, -0.95, 0.05) + pipe(-0.96, -0.83, 0.035) + pipe(-0.965, -0.74, 0.03) + pipe(-0.96, 0.7, 0.045);
  base += poly(wallQuad(S, 0.93, -0.98, -0.9, NEAR, FAR), `fill="#0e1826"`);
  base += poly(wallQuad(S, 0.93, -0.91, -0.89, NEAR, FAR), `fill="#5a7690" opacity="0.5"`);
  base += pipe(0.965, 0.45, 0.03);
  for (let z = 1.2; z < FAR; z += 0.5) {
    base += poly(faceQuad(S, z, -W, -0.9, -1.01, -0.68), `fill="#08101a"`);
    base += poly(faceQuad(S, z, 0.9, W, -1.0, -0.86), `fill="#08101a"`);
  }

  // Structural ribs, far to near.
  for (const z of [...ribs].reverse()) {
    const k = Math.min(1, (z - 1) / 5);
    const ix = W - T;
    const iy = C + T;
    const inner = [[-ix, F], [-ix, iy + CH], [-ix + CH, iy], [ix - CH, iy], [ix, iy + CH], [ix, F]];
    base += poly(wallQuad(S, -ix, iy + CH, F, z, z + D), `fill="#1c2e42"`);
    base += poly(wallQuad(S, ix, iy + CH, F, z, z + D), `fill="#243a52"`);
    base += poly(flatQuad(S, iy, -ix + CH, ix - CH, z, z + D), `fill="#15243a"`);
    base += poly([S(-ix, iy + CH, z), S(-ix + CH, iy, z), S(-ix + CH, iy, z + D), S(-ix, iy + CH, z + D)], `fill="#223650"`);
    base += poly([S(ix, iy + CH, z), S(ix - CH, iy, z), S(ix - CH, iy, z + D), S(ix, iy + CH, z + D)], `fill="#1a2c42"`);
    const outer = [S(-W - 0.05, F + 0.01, z), S(-W - 0.05, C - 0.05, z), S(W + 0.05, C - 0.05, z), S(W + 0.05, F + 0.01, z)];
    const hole = inner.map(([x, y]) => S(x, y, z));
    const r = Math.round(lerp(8, 26, k));
    const g = Math.round(lerp(14, 40, k));
    const bl = Math.round(lerp(22, 58, k));
    base += `<path fill-rule="evenodd" d="M${pts(outer).replace(/ /g, " L")} Z M${pts(hole).replace(/ /g, " L")} Z" fill="rgb(${r},${g},${bl})" stroke="${INK}" stroke-width="${n1(2 / z + 0.5)}"/>`;
    base += `<polyline points="${pts(hole)}" fill="none" stroke="#22e6ff" stroke-width="${n1(2.4 / z)}" opacity="${n1(0.12 + 0.3 * k)}"/>`;
    base += `<polyline points="${pts([S(-W, F, z), S(-W, C, z), S(W, C, z)])}" fill="none" stroke="#6f8aa3" stroke-width="${n1(1.6 / z)}" opacity="${n1(0.1 + 0.25 * k)}"/>`;
    for (const Y of [-0.5, 0.1, 0.7]) {
      for (const X of [-W + T / 2, W - T / 2]) {
        const [bx, by] = S(X, Y, z);
        base += `<circle cx="${n1(bx)}" cy="${n1(by)}" r="${n1(2.6 / z)}" fill="#3a4d61"/>`;
      }
    }
  }

  // Hanging wayfinding sign (shapes only) and emergency beacon housing.
  const signZ = 3.95;
  for (const X of [0.2, 0.62]) base += seg(S(X, C, signZ), S(X, -1.02, signZ), `stroke="#1a2838" stroke-width="2"`);
  base += poly(faceQuad(S, signZ, 0.12, 0.7, -1.02, -0.86), `fill="#07111c" stroke="#2c4560" stroke-width="1.5"`);
  for (let i = 0; i < 3; i++) {
    const x = 0.2 + i * 0.07;
    base += `<polyline points="${pts([S(x, -0.99, signZ), S(x + 0.04, -0.94, signZ), S(x, -0.89, signZ)])}" fill="none" stroke="#22e6ff" stroke-width="2.4" stroke-linejoin="round" opacity="${0.5 + i * 0.2}"/>`;
  }
  base += poly(faceQuad(S, signZ, 0.45, 0.66, -0.955, -0.925), `fill="#22e6ff" opacity="0.55"`);
  base += poly(faceQuad(S, 5.3, -0.8, -0.42, -0.62, -0.5), `fill="#1a1206" stroke="#ffaa44" stroke-width="1" opacity="0.85"`);
  base += poly(faceQuad(S, 5.3, -0.76, -0.64, -0.6, -0.52), `fill="#ffaa44" opacity="0.5"`);

  const beaconZ = bays[2][0] + 0.12;
  const [bx, by] = S(W, -0.62, beaconZ);
  base += `<rect x="${n1(bx - 4)}" y="${n1(by - 2)}" width="14" height="22" rx="2" fill="#141e2a" stroke="${INK}" stroke-width="1.5"/>`;
  base += `<path d="M ${n1(bx - 13)} ${n1(by + 4)} A 13 15 0 0 1 ${n1(bx + 13)} ${n1(by + 4)} Z" fill="#5a0d14" stroke="${INK}" stroke-width="1.5"/>`;
  base += `<path d="M ${n1(bx - 8)} ${n1(by - 6)} A 9 8 0 0 1 ${n1(bx + 2)} ${n1(by - 10)}" fill="none" stroke="#ff8a90" stroke-width="1.6" opacity="0.6"/>`;
  base += `<rect x="${n1(bx - 16)}" y="${n1(by + 4)}" width="32" height="5" rx="1" fill="#1c2733" stroke="${INK}" stroke-width="1.2"/>`;

  // Static light: blooms, door wash, floor reflections.
  let lights = bloom(800, 380, 190, 150, "gCyan", 0.9);
  lights += bloom(800, 560, 70, 150, "gCyan", 0.4);
  lights += poly(faceQuad(S, FAR, -0.46, 0.46, -0.66, F), `fill="#ffffff" opacity="0.35" filter="url(#blur6)"`);
  bays.forEach(([z0, z1]) => {
    if (z1 - z0 < 0.15) return;
    const [cx, cy] = S(0, C, (z0 + z1) / 2);
    const s = 800 / ((z0 + z1) / 2);
    lights += bloom(cx, cy + 6, s * 0.42, s * 0.14, "gPanel");
    for (const X of [-W, W]) {
      const [lx, ly] = S(X, -0.1, z1 - 0.08);
      lights += bloom(lx, ly, 70 * (s / 400), 260 * (s / 400), "gCyan", 0.55);
      const [rx, ry] = S(X * 0.92, 2.1, z1 - 0.08);
      if (ry < 900) lights += bloom(rx, ry, 30 * (s / 400), 150 * (s / 400), "gCyan", 0.22);
    }
  });
  lights += poly(flatQuad(S, F, -0.66, -0.61, NEAR, FAR), `fill="#22e6ff" opacity="0.4" filter="url(#blur2)"`);
  lights += poly(flatQuad(S, F, 0.61, 0.66, NEAR, FAR), `fill="#22e6ff" opacity="0.4" filter="url(#blur2)"`);

  // Slow cool haze hanging in the corridor.
  const haze =
    bloom(560, 330, 460, 140, "gHaze") +
    bloom(1080, 300, 420, 120, "gHaze", 0.8) +
    bloom(820, 470, 520, 90, "gHaze", 0.7) +
    bloom(300, 180, 300, 110, "gHaze", 0.5) +
    bloom(1330, 200, 280, 120, "gHaze", 0.5);

  // Data display bars and the running LED strip along the left wall.
  let data = "";
  const rd = rng(11);
  for (let row = 0; row < 7; row++) {
    const Y = -0.46 + row * 0.075;
    const len = 0.1 + rd() * 0.2;
    data += poly(wallQuad(S, -W + 0.005, Y, Y + 0.035, dz0 + 0.1, dz0 + 0.1 + len), `fill="${row === 2 ? "#ffaa44" : "#22e6ff"}" opacity="0.8"`);
  }
  for (let z = 1.2; z < FAR; z += 0.12) {
    if (rd() < 0.35) continue;
    data += poly(wallQuad(S, -W + 0.005, -0.66, -0.64, z, z + 0.05), `fill="#5cf0ff"`);
  }
  data = data + `<g filter="url(#blur2)">${data}</g>`;

  // Indicator lights (two sets so they blink out of sync).
  const dot = (X, Y, z, color, size = 1) => {
    const [x, y] = S(X, Y, z);
    const r = (9 / z) * size;
    return `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r * 3.5)}" fill="${color}" opacity="0.25" filter="url(#blur2)"/>` +
      `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(Math.max(1, r))}" fill="${color}"/>`;
  };
  let indA = "";
  let indB = "";
  bays.forEach(([z0, z1], i) => {
    if (z1 - z0 < 0.15) return;
    const m = (z0 + z1) / 2;
    indA += dot(-W, 0.3, m, "#22e6ff") + dot(W, 0.25, m + 0.05, i % 2 ? "#44ff99" : "#22e6ff");
    indB += dot(-W, 0.4, m + 0.06, i % 2 ? "#ff3344" : "#ffaa44") + dot(W, 0.35, m - 0.04, "#ffaa44", 0.8);
  });
  indA += dot(W, -0.12, rz1 - 0.14, "#44ff99", 1.4) + dot(-0.55, -0.72, FAR, "#44ff99", 1.2);
  indB += dot(W, -0.02, rz1 - 0.14, "#ff3344", 1.2) + dot(0.55, -0.72, FAR, "#ff3344", 1.2);

  const wash = bloom(bx, by, 320, 240, "gRed", 0.55) + bloom(bx, by - 4, 34, 30, "gRed") +
    `<circle cx="${n1(bx)}" cy="${n1(by - 2)}" r="6" fill="#ff8a90"/>`;
  const L = 560;
  const beam = `<g filter="url(#blur6)">` +
    poly([[bx, by], [bx + L, by - 90], [bx + L, by + 90]], `fill="url(#beamGrad)"`) +
    `<g transform="rotate(180 ${n1(bx)} ${n1(by)})">` +
    poly([[bx, by], [bx + L, by - 90], [bx + L, by + 90]], `fill="url(#beamGrad)"`) +
    `</g></g>`;

  return {
    box: [0, 0, 1600, 900],
    defs,
    layers: [
      { markup: base },
      { markup: haze, anim: { type: "drift", amp: 40, speed: 0.12 }, blend: "screen", opacity: 0.8 },
      { markup: lights, blend: "lighter", opacity: 0.8 },
      { markup: data, anim: { type: "flicker", min: 0.35, max: 1, speed: 0.8 }, blend: "lighter" },
      { markup: indA, anim: { type: "flicker", min: 0.1, max: 1, speed: 1.7 }, blend: "lighter" },
      { markup: indB, anim: { type: "flicker", min: 0.1, max: 1, speed: 1.1, phase: 2.3 }, blend: "lighter" },
      { markup: wash, anim: { type: "pulse", min: 0.15, max: 0.8, speed: 5 }, blend: "lighter" },
      { markup: beam, anim: { type: "spin", speed: 2.5, pivot: [n1(bx), n1(by)] }, blend: "lighter", opacity: 0.45 },
      shadeLayer(),
    ],
  };
}

// ── Locker room background ──────────────────────────────────────────────────

function lockerRoomBackground() {
  const L = camera(800, 380, 800);
  const W = 1.3;
  const C = -1;
  const F = 1;
  const NEAR = 0.9;
  const FAR = 3.2;
  const TOP = -0.8;
  const BASE = 0.9;

  const defs =
    SHADE_DEFS +
    `<linearGradient id="lCeil" x1="0" y1="0" x2="0" y2="130" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#03060b"/><stop offset="1" stop-color="#0c1726"/></linearGradient>` +
    `<linearGradient id="lFloor" x1="0" y1="630" x2="0" y2="900" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#132337"/><stop offset="0.4" stop-color="#08111c"/><stop offset="1" stop-color="#020409"/></linearGradient>` +
    `<linearGradient id="lWallL" x1="0" y1="0" x2="475" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#03060b"/><stop offset="1" stop-color="#0f1c2c"/></linearGradient>` +
    `<linearGradient id="lWallR" x1="1600" y1="0" x2="1125" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#03060b"/><stop offset="1" stop-color="#0f1c2c"/></linearGradient>` +
    `<linearGradient id="lockF" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a6179"/><stop offset="0.35" stop-color="#2c3e52"/><stop offset="1" stop-color="#141e2a"/></linearGradient>` +
    `<linearGradient id="lockL" x1="0" y1="0" x2="475" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0c131d"/><stop offset="1" stop-color="#2e4258"/></linearGradient>` +
    `<linearGradient id="lockR" x1="1600" y1="0" x2="1125" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0a1119"/><stop offset="1" stop-color="#2a3c50"/></linearGradient>` +
    `<linearGradient id="doorOpen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1c2733"/><stop offset="0.8" stop-color="#34495e"/><stop offset="1" stop-color="#7fdcec"/></linearGradient>` +
    `<radialGradient id="inside" cx="0.55" cy="0.3" r="0.8"><stop offset="0" stop-color="#c8faff"/><stop offset="0.18" stop-color="#3fd8ee"/><stop offset="0.55" stop-color="#0a4b5a"/><stop offset="1" stop-color="#021219"/></radialGradient>` +
    `<linearGradient id="crateF" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3f5163"/><stop offset="0.5" stop-color="#232f3b"/><stop offset="1" stop-color="#10171f"/></linearGradient>` +
    `<linearGradient id="bench" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f4052"/><stop offset="1" stop-color="#4f6780"/></linearGradient>` +
    `<linearGradient id="cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cff4ff" stop-opacity="0.16"/><stop offset="1" stop-color="#cff4ff" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="spill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22e6ff" stop-opacity="0.45"/><stop offset="1" stop-color="#22e6ff" stop-opacity="0"/></linearGradient>` +
    fadeGrad("gTube", "#d6f6ff", 0.6, 0.25) +
    fadeGrad("gCyan", "#22e6ff", 0.55, 0.3) +
    fadeGrad("gHaze", "#3b7fb0", 0.2, 0.45) +
    BG_BLUR("blur2", 2) +
    BG_BLUR("blur5", 5);

  let base = `<rect width="1600" height="900" fill="#03060b"/>`;
  base += poly(flatQuad(L, C, -W, W, NEAR, FAR), `fill="url(#lCeil)"`);
  base += poly(flatQuad(L, F, -W, W, NEAR, FAR), `fill="url(#lFloor)"`);
  base += poly(wallQuad(L, -W, C, F, NEAR, FAR), `fill="url(#lWallL)"`);
  base += poly(wallQuad(L, W, C, F, NEAR, FAR), `fill="url(#lWallR)"`);
  base += poly(faceQuad(L, FAR, -W, W, C, F), `fill="#0d1929"`);

  // Floor tiles.
  for (let X = -1.2; X <= 1.21; X += 0.4) base += seg(L(X, F, NEAR), L(X, F, FAR), `stroke="#16283c" stroke-width="1.2" opacity="0.8"`);
  for (let z = 1.3; z < FAR; z += 0.35) base += seg(L(-W, F, z), L(W, F, z), `stroke="#16283c" stroke-width="${n1(2 / z)}" opacity="0.8"`);

  // Side-wall lockers.
  const sideLocker = (X, z, grad, rim) => {
    const w = 0.3;
    let s = poly(wallQuad(L, X, TOP - 0.02, BASE, z, z + w), `fill="#04080e"`);
    s += poly(wallQuad(L, X, TOP, BASE - 0.02, z + 0.012, z + w - 0.012), `fill="url(#${grad})"`);
    for (let j = 0; j < 5; j++) {
      const y = TOP + 0.1 + j * 0.04;
      s += poly(wallQuad(L, X, y, y + 0.018, z + 0.06, z + w - 0.06), `fill="#070c13"`);
    }
    s += poly(wallQuad(L, X, -0.42, -0.35, z + 0.08, z + 0.2), `fill="#5a7088" opacity="0.5"`);
    s += poly(wallQuad(L, X, -0.02, 0.14, z + w - 0.06, z + w - 0.04), `fill="#8aa2b8"`);
    s += seg(L(X, TOP, z + 0.012), L(X, TOP, z + w - 0.012), `stroke="${rim}" stroke-width="1.2" opacity="0.5"`);
    return s;
  };
  for (let z = 3.2 - 0.3 * 7; z < FAR - 0.1; z += 0.3) {
    base += sideLocker(-W, z, "lockL", "#8fb0cc");
    base += sideLocker(W, z, "lockR", "#6f8aa3");
  }
  for (const X of [-W, W]) {
    base += poly(wallQuad(L, X, BASE, F, NEAR, FAR), `fill="#060a11"`);
    base += poly(wallQuad(L, X, C, TOP - 0.02, NEAR, FAR), `fill="#08101a"`);
  }

  // Far wall: frontal locker row, second from the left is ajar.
  const LW = 0.36;
  const x0 = -LW * 3.5;
  base += poly(faceQuad(L, FAR, x0 - 0.02, -x0 + 0.02, TOP - 0.02, BASE), `fill="#04080e"`);
  base += poly(faceQuad(L, FAR, -W, W, BASE, F), `fill="#060a11"`);
  for (let i = 0; i < 7; i++) {
    const a = x0 + i * LW + 0.012;
    const b = a + LW - 0.024;
    if (i === 1) {
      base += poly(faceQuad(L, FAR, a, b, TOP, BASE - 0.02), `fill="url(#inside)"`);
      base += poly(faceQuad(L, FAR, a + 0.02, b - 0.02, -0.52, -0.49), `fill="#0a3a48"`);
      const jk = (dx, y) => pts([L(a + dx, y, FAR)]);
      // hanging suit on a hook
      base += seg(L(a + 0.23, -0.55, FAR), L(a + 0.23, -0.47, FAR), `stroke="#021219" stroke-width="2"`);
      base += `<path d="M ${jk(0.11, -0.39)} Q ${jk(0.23, -0.5)} ${jk(0.35, -0.39)} L ${jk(0.33, 0.3)} L ${jk(0.24, 0.27)} L ${jk(0.23, -0.2)} L ${jk(0.22, 0.27)} L ${jk(0.13, 0.3)} Z" fill="#031a22" opacity="0.85"/>`;
      base += poly(faceQuad(L, FAR, a + 0.02, b - 0.02, 0.45, 0.5), `fill="#06303c"`);
      continue;
    }
    base += poly(faceQuad(L, FAR, a, b, TOP, BASE - 0.02), `fill="url(#lockF)"`);
    for (let j = 0; j < 5; j++) {
      const y = TOP + 0.1 + j * 0.04;
      base += poly(faceQuad(L, FAR, a + 0.07, b - 0.07, y, y + 0.018), `fill="#070c13"`);
    }
    base += poly(faceQuad(L, FAR, a + 0.09, b - 0.09, -0.42, -0.36), `fill="#5a7088" opacity="0.55"`);
    base += poly(faceQuad(L, FAR, b - 0.07, b - 0.045, -0.04, 0.14), `fill="#8aa2b8"`);
    base += seg(L(a, TOP, FAR), L(a, BASE - 0.02, FAR), `stroke="#8fb0cc" stroke-width="1" opacity="0.35"`);
    base += seg(L(a, TOP, FAR), L(b, TOP, FAR), `stroke="#a9c3d8" stroke-width="1" opacity="0.4"`);
  }
  // The ajar door, swung ~38° toward the viewer on its left hinge.
  const ha = x0 + LW + 0.012;
  const hb = ha + LW - 0.024;
  const ang = 0.96;
  const fx = ha + (hb - ha) * Math.cos(ang);
  const fz = FAR - (hb - ha) * Math.sin(ang);
  base += poly([L(ha, TOP, FAR), L(fx, TOP, fz), L(fx, BASE - 0.02, fz), L(ha, BASE - 0.02, FAR)], `fill="url(#doorOpen)" stroke="${INK}" stroke-width="1.2"`);
  for (let j = 0; j < 5; j++) {
    const y = TOP + 0.1 + j * 0.04;
    const p = (t) => [lerp(ha, fx, t), lerp(FAR, fz, t)];
    const [ax, az] = p(0.2);
    const [cx, cz] = p(0.8);
    base += poly([L(ax, y, az), L(cx, y, cz), L(cx, y + 0.018, cz), L(ax, y + 0.018, az)], `fill="#070c13"`);
  }

  // R&D crate in front of the open locker.
  const cx0 = -1.24;
  const cx1 = -0.76;
  const cy = 0.52;
  const cz0 = 2.72;
  const cz1 = 3.08;
  base += poly(wallQuad(L, cx1, cy, F, cz0, cz1), `fill="#18222d" stroke="${INK}" stroke-width="1.5"`);
  base += poly(flatQuad(L, cy, cx0, cx1, cz0, cz1), `fill="#4a5f74" stroke="${INK}" stroke-width="1.5"`);
  base += poly(faceQuad(L, cz0, cx0, cx1, cy, F), `fill="url(#crateF)" stroke="${INK}" stroke-width="1.5"`);
  base += poly(faceQuad(L, cz0, cx0, cx1, 0.6, 0.67), `fill="#ffaa44" opacity="0.85"`);
  for (let i = 0; i < 7; i++) {
    const x = cx0 + 0.02 + i * 0.075;
    base += poly([L(x, 0.6, cz0), L(x + 0.035, 0.6, cz0), L(x + 0.01, 0.67, cz0), L(x - 0.025, 0.67, cz0)], `fill="#140d04"`);
  }
  base += seg(L(cx0, 0.58, cz0), L(cx1, 0.58, cz0), `stroke="${INK}" stroke-width="1.5"`);
  base += seg(L(cx1, 0.58, cz0), L(cx1, 0.58, cz1), `stroke="${INK}" stroke-width="1.2"`);
  base += seg(L(cx0, cy, cz0), L(cx1, cy, cz0), `stroke="#a9c3d8" stroke-width="1.2" opacity="0.6"`);
  for (const [a, b] of [[cx0, cx0 + 0.06], [cx1 - 0.06, cx1]]) base += poly(faceQuad(L, cz0, a, b, cy, F), `fill="#0c131b" opacity="0.8"`);
  base += poly(faceQuad(L, cz0, cx0 + 0.14, cx0 + 0.3, 0.76, 0.8), `fill="#a9c3d8" opacity="0.3"`);
  base += poly(faceQuad(L, cz0, cx0 + 0.14, cx0 + 0.24, 0.83, 0.86), `fill="#a9c3d8" opacity="0.25"`);

  // Bench down the aisle.
  const bz0 = 1.95;
  const bz1 = 2.9;
  const BW = 0.15;
  for (const z of [2.7, 2.12]) {
    for (const X of [-BW + 0.02, BW - 0.05]) base += poly(faceQuad(L, z, X, X + 0.03, 0.55, F), `fill="#0a1119" stroke="${INK}" stroke-width="1"`);
    base += poly(faceQuad(L, z, -BW + 0.02, BW - 0.02, 0.8, 0.83), `fill="#0a1119"`);
  }
  base += poly(wallQuad(L, -BW, 0.5, 0.55, bz0, bz1), `fill="#131d28"`);
  base += poly(wallQuad(L, BW, 0.5, 0.55, bz0, bz1), `fill="#1a2633"`);
  base += poly(flatQuad(L, 0.5, -BW, BW, bz0, bz1), `fill="url(#bench)" stroke="${INK}" stroke-width="1.2"`);
  for (let X = -BW + 0.05; X < BW - 0.02; X += 0.05) base += seg(L(X, 0.5, bz0), L(X, 0.5, bz1), `stroke="#0e1620" stroke-width="1" opacity="0.7"`);
  base += poly(faceQuad(L, bz0, -BW, BW, 0.5, 0.55), `fill="#1c2733" stroke="${INK}" stroke-width="1.2"`);
  base += seg(L(-BW, 0.5, bz0), L(BW, 0.5, bz0), `stroke="#a9c3d8" stroke-width="1.4" opacity="0.7"`);

  // Ceiling fixtures (middle one is the flickering tube).
  const tubes = [2.3, 2.65, 3.02];
  for (const z of tubes) {
    base += poly(flatQuad(L, C + 0.01, -0.78, 0.78, z, z + 0.1), `fill="#141e2a"`);
    base += poly(faceQuad(L, z, -0.78, 0.78, C, C + 0.05), `fill="#1c2733" stroke="${INK}" stroke-width="1"`);
    base += poly(faceQuad(L, z + 0.01, -0.72, 0.72, C + 0.05, C + 0.08), `fill="${z === tubes[1] ? "#3a4a58" : "#e8fbff"}"`);
  }

  let lights = "";
  for (const z of [tubes[0], tubes[2]]) {
    const [cx, ty] = L(0, C + 0.065, z);
    const s = 800 / z;
    lights += bloom(cx, ty, s * 0.9, s * 0.12, "gTube");
    lights += poly([L(-0.72, C + 0.08, z), L(0.72, C + 0.08, z), L(1.1, 0.4, z + 0.2), L(-1.1, 0.4, z + 0.2)], `fill="url(#cone)"`);
  }
  lights += bloom(800, 700, 360, 60, "gTube", 0.25);

  const flickerTube = (() => {
    const z = tubes[1];
    const [cx, ty] = L(0, C + 0.065, z);
    const s = 800 / z;
    return poly(faceQuad(L, z + 0.01, -0.72, 0.72, C + 0.05, C + 0.08), `fill="#f2fdff"`) +
      bloom(cx, ty, s * 0.95, s * 0.14, "gTube") +
      poly([L(-0.72, C + 0.08, z), L(0.72, C + 0.08, z), L(1.1, 0.4, z + 0.2), L(-1.1, 0.4, z + 0.2)], `fill="url(#cone)"`);
  })();

  // Cyan glow spilling from the open locker.
  const gapTop = L(fx, TOP, fz);
  const gapBot = L(fx, BASE - 0.02, fz);
  const frameTop = L(hb, TOP, FAR);
  const frameBot = L(hb, BASE - 0.02, FAR);
  const glow =
    poly([gapTop, frameTop, frameBot, gapBot], `fill="#9ff6ff" opacity="0.18"`) +
    poly([gapTop, frameTop, frameBot, gapBot], `fill="#22e6ff" opacity="0.3" filter="url(#blur5)"`) +
    bloom(frameTop[0], 400, 70, 230, "gCyan", 0.7) +
    poly([gapBot, frameBot, L(0.25, F, 2.3), L(-0.48, F, 2.3)], `fill="url(#spill)" filter="url(#blur5)"`) +
    seg(gapTop, gapBot, `stroke="#c8fbff" stroke-width="2"`) +
    seg(L(hb + 0.024, TOP, FAR), L(hb + 0.024, BASE - 0.02, FAR), `stroke="#22e6ff" stroke-width="1.6" opacity="0.7"`) +
    seg(L(cx1, cy, cz0), L(cx1, cy, cz1), `stroke="#5cefff" stroke-width="1.6" opacity="0.6"`) +
    seg(L(cx1, cy, cz0), L(cx1, F, cz0), `stroke="#5cefff" stroke-width="1.2" opacity="0.35"`);

  const [ledX, ledY] = L(cx1 - 0.1, 0.72, cz0);
  const leds =
    `<circle cx="${n1(ledX)}" cy="${n1(ledY)}" r="10" fill="#22e6ff" opacity="0.35" filter="url(#blur2)"/>` +
    `<circle cx="${n1(ledX)}" cy="${n1(ledY)}" r="3" fill="#c8fbff"/>` +
    `<circle cx="${n1(ledX - 14)}" cy="${n1(ledY)}" r="2.4" fill="#ffaa44"/>` +
    `<circle cx="${n1(ledX - 14)}" cy="${n1(ledY)}" r="8" fill="#ffaa44" opacity="0.3" filter="url(#blur2)"/>`;

  const haze =
    bloom(700, 330, 520, 150, "gHaze") +
    bloom(1150, 250, 380, 120, "gHaze", 0.7) +
    bloom(620, 380, 200, 220, "gCyan", 0.12);

  return {
    box: [0, 0, 1600, 900],
    defs,
    layers: [
      { markup: base },
      { markup: haze, anim: { type: "drift", amp: 30, speed: 0.1 }, blend: "screen", opacity: 0.8 },
      { markup: lights, blend: "lighter", opacity: 0.85 },
      { markup: flickerTube, anim: { type: "flicker", min: 0.08, max: 1, speed: 1.4 }, blend: "lighter" },
      { markup: glow, anim: { type: "pulse", min: 0.7, max: 1, speed: 1.3 }, blend: "lighter" },
      { markup: leds, anim: { type: "flicker", min: 0.2, max: 1, speed: 1.6 }, blend: "lighter" },
      shadeLayer(),
    ],
  };
}

// ── Dark void background ────────────────────────────────────────────────────

function darkBackground() {
  const defs =
    SHADE_DEFS +
    `<radialGradient id="void" cx="800" cy="340" r="960" gradientUnits="userSpaceOnUse" gradientTransform="translate(800 340) scale(1 0.7) translate(-800 -340)">` +
    `<stop offset="0" stop-color="#0b1320"/><stop offset="0.45" stop-color="#060a12"/><stop offset="1" stop-color="#020306"/></radialGradient>` +
    fadeGrad("gHaze", "#1f3b5c", 0.2, 0.45) +
    fadeGrad("gMote", "#9fc4e8", 0.5, 0.3);

  const haze1 = bloom(540, 300, 560, 170, "gHaze") + bloom(1180, 390, 460, 140, "gHaze", 0.8);
  const haze2 = bloom(860, 210, 600, 120, "gHaze", 0.7) + bloom(260, 470, 320, 100, "gHaze", 0.5);

  const rand = rng(7);
  let dust = "";
  for (let i = 0; i < 44; i++) {
    const x = 40 + rand() * 1520;
    const y = 30 + rand() * 580;
    const r = 0.8 + rand() * 1.4;
    dust += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="#a9cbe8" opacity="${n1(0.06 + rand() * 0.2)}"/>`;
  }
  for (let i = 0; i < 7; i++) {
    dust += bloom(100 + rand() * 1400, 60 + rand() * 500, 8 + rand() * 10, 8 + rand() * 10, "gMote", 0.12);
  }

  return {
    box: [0, 0, 1600, 900],
    defs,
    layers: [
      { markup: `<rect width="1600" height="900" fill="url(#void)"/>` },
      { markup: haze1, anim: { type: "drift", amp: 36, speed: 0.07 }, blend: "screen", opacity: 0.7 },
      { markup: haze2, anim: { type: "drift", amp: 28, speed: 0.05, phase: 9 }, blend: "screen", opacity: 0.6 },
      { markup: dust, anim: { type: "float", amp: 9, speed: 0.22 } },
      shadeLayer(0.9, 0.9),
    ],
  };
}

// ── Story props ─────────────────────────────────────────────────────────────

const path = (d, attrs) => `<path d="${d}" ${attrs}/>`;
const ink = (w = 1.1) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"`;
const glowFilter = (id, sd) =>
  `<filter id="${id}" filterUnits="userSpaceOnUse" x="-200" y="-200" width="400" height="400"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
const linGrad = (id, stops, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">` +
  stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("") +
  `</linearGradient>`;

/** Alpha Prototype helmet (the hero's, front view) resting unpowered; returns body and visor glow. */
function propHelmet() {
  const shell =
    "M0,-95 C7.6,-95 11.4,-89.8 11.4,-82.5 L11,-77 C10.6,-73.4 8.6,-70.6 5,-69 C3,-68.2 1.5,-68 0,-68 " +
    "C-1.5,-68 -3,-68.2 -5,-69 C-8.6,-70.6 -10.6,-73.4 -11,-77 L-11.4,-82.5 C-11.4,-89.8 -7.6,-95 0,-95 Z";
  const recess = "M-11.3,-86.2 L-2.4,-84.8 L0,-83.2 L2.4,-84.8 L11.3,-86.2 L10.9,-78.4 L3.4,-76.6 L0,-75.6 L-3.4,-76.6 L-10.9,-78.4 Z";
  const glass = "M-10.2,-85.1 L-2.4,-83.8 L0,-82.3 L2.4,-83.8 L10.2,-85.1 L10,-79.3 L3.2,-77.7 L0,-76.9 L-3.2,-77.7 L-10,-79.3 Z";
  const jaw = "M-6.6,-76.1 L-3.3,-76.8 L0,-75.7 L3.3,-76.8 L6.6,-76.1 L5.3,-71 C3.6,-69.5 1.8,-68.9 0,-68.8 C-1.8,-68.9 -3.6,-69.5 -5.3,-71 Z";
  const stroke = (d, c, w, op = 1) =>
    path(d, `fill="none" stroke="${c}" stroke-width="${w}" stroke-opacity="${op}" stroke-linecap="round"`);
  const body =
    path(shell, `fill="url(#chSteel)" ${ink(0.5)}`) +
    path("M-2,-94.8 C-1.2,-95.4 1.2,-95.4 2,-94.8 L1.5,-86.6 L-1.5,-86.6 Z", `fill="url(#chSteelDk)" ${ink(0.25)}`) +
    `<ellipse cx="-5.2" cy="-89.6" rx="4.4" ry="2.8" fill="url(#chSheen)"/>` +
    stroke("M-8.2,-91 C-6.4,-93.4 -3.8,-94.4 -2.3,-94.4", "#f4faff", 0.45, 0.85) +
    stroke("M-10.9,-86 C-6,-88.4 6,-88.4 10.9,-86", INK, 0.3, 0.7) +
    stroke("M-10.8,-78 C-8.8,-75 -7.6,-72.6 -5.2,-70.6 M10.8,-78 C8.8,-75 7.6,-72.6 5.2,-70.6", INK, 0.25, 0.6) +
    path(jaw, `fill="url(#chSteelDk)" ${ink(0.3)}`) +
    stroke("M-2.2,-74 L2.2,-74 M-2.4,-72.5 L2.4,-72.5 M-2,-71 L2,-71", "#020306", 0.3, 0.9) +
    `<circle cx="-11" cy="-80.6" r="2.3" fill="url(#chSteelDk)" ${ink(0.3)}/><circle cx="11" cy="-80.6" r="2.3" fill="url(#chSteelDk)" ${ink(0.3)}/>` +
    path(recess, `fill="#03060a" ${ink(0.25)}`) +
    path(glass, `fill="url(#chVisor)" ${ink(0.15)}`) +
    stroke("M-9,-84 L-4.6,-83.1", "#bfefff", 0.35, 0.55) +
    stroke("M10.6,-90 C11.7,-87 11.7,-83 11.2,-78.6", "#22e6ff", 0.4, 0.7);
  const glow =
    path(glass, `fill="#00e5ff" filter="url(#chBlur)" opacity="0.45"`) +
    stroke("M-9.4,-81.8 L-2.6,-80.6 L0,-79.6 L2.6,-80.6 L9.4,-81.8", "#8af6ff", 0.4, 0.8);
  return { body, glow };
}

/** The unmarked R&D crate in the cadet's locker, lid open on the Alpha Prototype helmet. */
function armorCrateModel() {
  const defs =
    linGrad("chSteel", [[0, "#9ab2c7"], [0.18, "#6f8aa3"], [0.5, "#3a4d61"], [0.82, "#1c2733"], [1, "#111821"]], 1, 0.35) +
    linGrad("chSteelDk", [[0, "#52697f"], [0.45, "#2a3a4d"], [1, "#0c1219"]], 1, 0.35) +
    linGrad("chVisor", [[0, "#031a22"], [0.45, "#0a4656"], [0.6, "#1a7a8c"], [1, "#021820"]]) +
    `<radialGradient id="chSheen"><stop offset="0" stop-color="#fff" stop-opacity="0.45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
    linGrad("cFront", [[0, "#4a5f74"], [0.45, "#2a3a4a"], [1, "#111922"]], 1, 0.6) +
    linGrad("cSide", [[0, "#1c2733"], [1, "#0a1016"]], 0, 1) +
    linGrad("cRim", [[0, "#8aa2b8"], [0.5, "#566c82"], [1, "#2a3a4a"]], 1, 0) +
    linGrad("cLid", [[0, "#2e3c4c"], [0.5, "#1c2733"], [1, "#0c1219"]], 1, 0.4) +
    linGrad("cFoam", [[0, "#2a2e36"], [0.5, "#181b21"], [1, "#0a0b0e"]], 0.4, 1) +
    linGrad("cNote", [[0, "#f6e68c"], [0.55, "#dcc052"], [1, "#9c8028"]], 1, 1) +
    `<radialGradient id="cBump" cx="0.35" cy="0.3" r="0.7"><stop offset="0" stop-color="#3a3f48"/><stop offset="1" stop-color="#0e1014"/></radialGradient>` +
    `<radialGradient id="cHum"><stop offset="0" stop-color="#22e6ff" stop-opacity="0.35"/><stop offset="0.5" stop-color="#22e6ff" stop-opacity="0.1"/><stop offset="1" stop-color="#22e6ff" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="cShadow"><stop offset="0" stop-color="#000" stop-opacity="0.8"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
    linGrad("cBench", [[0, "#1a2430"], [0.6, "#2a3846"], [1, "#3a4a5a"]]) +
    `<linearGradient id="cBenchFadeG" x1="-134" y1="0" x2="130" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000"/><stop offset="0.3" stop-color="#fff"/><stop offset="0.7" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>` +
    `<mask id="cBenchFade" maskUnits="userSpaceOnUse" x="-140" y="20" width="280" height="60"><rect x="-140" y="20" width="280" height="60" fill="url(#cBenchFadeG)"/></mask>` +
    `<clipPath id="cHazClip"><polygon points="-84,13 60,13 60,21 -84,21"/></clipPath>` +
    `<clipPath id="cLidClip"><polygon points="-61,-31 78,-31 83.6,-89 -55.4,-89"/></clipPath>` +
    glowFilter("chBlur", 1.3) +
    glowFilter("cGlow", 2.2) +
    glowFilter("cAO", 3);

  // Locker-room bench the crate rests on, fading out at both ends.
  let lid = `<g mask="url(#cBenchFade)">`;
  lid += poly([[-132, 66], [128, 66], [112, 30], [-116, 30]], `fill="url(#cBench)" ${ink(0.8)}`);
  for (let i = 1; i < 6; i++) lid += seg([lerp(-116, -132, i / 6), lerp(30, 66, i / 6)], [lerp(112, 128, i / 6), lerp(30, 66, i / 6)], `stroke="#0a1016" stroke-width="0.7" opacity="0.6"`);
  lid += poly([[-132, 66], [128, 66], [128, 74], [-132, 74]], `fill="#0e151d" ${ink(0.8)}`);
  lid += seg([-130, 66.6], [126, 66.6], `stroke="#a9c3d8" stroke-width="0.8" opacity="0.5"`);
  lid += `</g>`;
  lid += `<ellipse cx="-2" cy="52" rx="100" ry="11" fill="url(#cShadow)"/>`;
  // Lid, hinged along the back edge and leaning back.
  lid += poly([[84, -26], [90, -94], [95, -91], [89, -23]], `fill="#0c1219" ${ink(0.8)}`);
  lid += poly([[-62, -94], [90, -94], [95, -99], [-57, -99]], `fill="#6f8aa3" ${ink(0.8)}`);
  lid += poly([[-68, -26], [84, -26], [90, -94], [-62, -94]], `fill="url(#cLid)" ${ink()}`);
  lid += poly([[-61, -31], [78, -31], [83.6, -89], [-55.4, -89]], `fill="#0e1116" ${ink(0.6)}`);
  let bumps = "";
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 17; c++) {
      const v = (r + 0.5) / 7;
      const x = lerp(-61, -55.4, 1 - v) + ((c + (r % 2) * 0.5) / 16.5) * lerp(139, 139, v);
      const y = lerp(-89, -31, v);
      bumps += `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="3.6" ry="3.4" fill="url(#cBump)"/>`;
    }
  }
  lid += `<g clip-path="url(#cLidClip)">${bumps}<rect x="-70" y="-45" width="160" height="16" fill="#000" opacity="0.45" filter="url(#cAO)"/></g>`;
  lid += seg([-62, -94], [90, -94], `stroke="#b8cee2" stroke-width="0.8" opacity="0.7"`);
  lid += seg([90, -94], [84, -26], `stroke="#22e6ff" stroke-width="0.9" opacity="0.55"`);
  for (const x of [-56, 58]) {
    lid += poly([[x, -30], [x + 14, -30], [x + 14, -22], [x, -22]], `fill="url(#chSteelDk)" ${ink(0.6)}`);
    lid += `<circle cx="${x + 7}" cy="-26" r="1.6" fill="#0a1016" stroke="#6f8aa3" stroke-width="0.5"/>`;
  }

  // Sticky note on the lid lining: three scrawled lines and a heavy underline.
  const note =
    `<g transform="translate(-44 -64) rotate(-7)">` +
    path("M-14,-13 L14,-13 L14,8 L8.4,14 L-14,14Z", `fill="url(#cNote)" ${ink(0.7)}`) +
    path("M14,8 L9,9 L8.4,14Z", `fill="#9c8028" ${ink(0.5)}`) +
    `<rect x="-14" y="-13" width="28" height="5" fill="#b89c30" opacity="0.4"/>` +
    `<rect x="-7" y="-16" width="14" height="5" fill="#dfe8f0" opacity="0.35" transform="rotate(4)"/>` +
    path(
      "M-10,-4 C-8.4,-6 -6.6,-2 -4.8,-4.2 C-3,-6.2 -1.4,-2.4 0.6,-4.6 C2,-6 3.6,-3.4 5.4,-4.8 M-10,2 C-7.6,0 -5.6,3.6 -3,1.4 C-1.2,-0.2 0.8,3 3.6,1 C5,0 6.4,1.6 8,0.8 M-10,8 C-8.4,6.4 -6.2,9.4 -3.8,7.4",
      `fill="none" stroke="#1a2440" stroke-width="0.9" stroke-linecap="round"`,
    ) +
    path("M-1,10.6 L7,9.4", `fill="none" stroke="#1a2440" stroke-width="0.9" stroke-linecap="round"`) +
    path("M-13.4,-12.4 L13.4,-12.4", `fill="none" stroke="#fff8c8" stroke-width="0.5" opacity="0.7"`) +
    `</g>`;

  // Crate interior: walls, foam insert, cut-outs and their contents.
  let inner = "";
  inner += poly([[-81, 0], [58, 0], [76, -21], [-62, -21]], `fill="#07090d"`);
  inner += poly([[-62, -21], [76, -21], [74, -13], [-64, -13]], `fill="#141b24"`);
  inner += poly([[-81, 0], [-62, -21], [-64, -13], [-81, 6]], `fill="#1a2430"`);
  inner += poly([[-81, 7], [60, 7], [74, -13], [-64, -13]], `fill="url(#cFoam)" ${ink(0.5)}`);
  inner += `<ellipse cx="-4" cy="-3" rx="36" ry="8.6" fill="#030405"/>`;
  inner += `<ellipse cx="-4" cy="-4.4" rx="33" ry="6.4" fill="#22e6ff" opacity="0.12" filter="url(#cGlow)"/>`;
  inner += poly([[-72, 2], [-44, 2], [-38, -8], [-66, -8]], `fill="#040506" ${ink(0.4)}`);
  inner += `<g transform="translate(-55 -3) rotate(-4)"><rect x="-11" y="-3.2" width="22" height="6.4" rx="3.2" fill="url(#chSteel)" ${ink(0.5)}/>` +
    `<rect x="-3" y="-3.2" width="5" height="6.4" fill="#0a3a44" ${ink(0.3)}/><rect x="-2.2" y="-2.2" width="3.4" height="1.4" fill="#8af6ff" opacity="0.8"/>` +
    `<path d="M-9.4,-1.8 L8,-1.8" stroke="#dfeaf4" stroke-width="0.5" opacity="0.6"/></g>`;
  inner += poly([[34, 2], [52, 2], [62, -10], [44, -10]], `fill="#040506" ${ink(0.4)}`);
  inner += path("M40,-1 L44,-6 L47,-9 L49,-8 L47.4,-5 L52,-9.6 L54,-8.6 L50.4,-4 L55,-7.4 L56.4,-6 L51.6,-1.4 L54.4,-3 L55.4,-1.4 L49,3 L41,3Z", `fill="#07080a" stroke="#2e333c" stroke-width="0.5"`);
  inner += seg([-81, 7], [60, 7], `stroke="#000" stroke-width="3" opacity="0.5"`);

  const helm = propHelmet();
  const helmT = `transform="translate(-4 170.4) rotate(-6 0 -80) scale(2.4)"`;
  const helmet =
    `<ellipse cx="-4" cy="-2" rx="30" ry="6" fill="#000" opacity="0.7" filter="url(#cAO)"/>` +
    `<g ${helmT}>${helm.body}</g>`;

  // Crate shell drawn over the foam: rim, front face, right side, hardware.
  let shell = "";
  shell += poly([[64, 4], [84, -26], [84, 26], [64, 56]], `fill="url(#cSide)" ${ink()}`);
  shell += path("M-88,4 L64,4 L84,-26 L-68,-26Z M-81,0 L58,0 L76,-21 L-62,-21Z", `fill="url(#cRim)" fill-rule="evenodd" ${ink(0.8)}`);
  shell += poly([[-88, 4], [64, 4], [64, 56], [-88, 56]], `fill="url(#cFront)" ${ink()}`);
  shell += `<g clip-path="url(#cHazClip)"><rect x="-84" y="13" width="144" height="8" fill="#e8a23c"/>`;
  for (let x = -90; x < 64; x += 9) shell += poly([[x, 21], [x + 4.5, 21], [x + 12.5, 13], [x + 8, 13]], `fill="#15100a"`);
  shell += `</g>`;
  shell += poly([[-84, 13], [60, 13], [60, 21], [-84, 21]], `fill="none" ${ink(0.5)}`);
  shell += seg([-84, 13.6], [60, 13.6], `stroke="#fff0c8" stroke-width="0.5" opacity="0.5"`);
  shell += poly([[-76, 28], [-20, 28], [-20, 46], [-76, 46]], `fill="#141c26" ${ink(0.5)}`);
  for (let i = 0; i < 6; i++) {
    const x = -72 + i * 8.6;
    shell += `<rect x="${n1(x)}" y="31" width="6" height="12" fill="#6f8aa3" opacity="0.18"/>`;
    shell += `<rect x="${n1(x + 2.4)}" y="35.4" width="1.2" height="3.2" fill="#141c26"/>`;
  }
  shell += `<rect x="-6" y="27" width="26" height="20" rx="1.5" fill="url(#chSteelDk)" ${ink(0.6)}/>`;
  shell += `<rect x="-2" y="30" width="18" height="6" fill="#041218" stroke="#22e6ff" stroke-width="0.4" stroke-opacity="0.6"/>`;
  shell += `<rect x="-0.6" y="31.6" width="8" height="1.2" fill="#22e6ff" opacity="0.6"/><rect x="-0.6" y="33.6" width="5" height="1" fill="#22e6ff" opacity="0.35"/>`;
  shell += `<rect x="-1" y="39" width="16" height="5" rx="1" fill="#0a1016" ${ink(0.4)}/>`;
  for (const [x, c] of [[34, "#3ce07a"], [42, "#22e6ff"], [50, "#ffaa44"]]) {
    shell += `<rect x="${x - 2.6}" y="33.4" width="5.2" height="5.2" rx="1" fill="#070b10" ${ink(0.4)}/><circle cx="${x}" cy="36" r="1.5" fill="${c}"/>`;
  }
  shell += seg([30, 42], [54, 42], `stroke="#6f8aa3" stroke-width="0.6" opacity="0.4"`);
  for (const [x, sx] of [[-88, 1], [64, -1]]) {
    for (const [y, sy] of [[4, 1], [56, -1]]) {
      shell += path(`M${x},${y} L${x + sx * 12},${y} L${x + sx * 12},${y + sy * 3.4} L${x + sx * 3.4},${y + sy * 3.4} L${x + sx * 3.4},${y + sy * 12} L${x},${y + sy * 12}Z`, `fill="url(#chSteelDk)" ${ink(0.5)}`);
    }
  }
  shell += path("M70,12 L78,0 L78,18 L70,30Z", `fill="#0a1016" ${ink(0.6)}`);
  shell += path("M71.6,15 L76.4,8 L76.4,16 L71.6,23Z", `fill="#1c2733"`);
  shell += seg([-86, 4.8], [63, 4.8], `stroke="#c8dcec" stroke-width="0.9" opacity="0.7"`);
  shell += seg([-87.4, 6], [-87.4, 54], `stroke="#8aa2b8" stroke-width="0.7" opacity="0.5"`);
  shell += seg([84.6, -25], [84.6, 25], `stroke="#22e6ff" stroke-width="1" opacity="0.6"`);
  shell += seg([65, 55], [85, 25.6], `stroke="#22e6ff" stroke-width="0.6" opacity="0.35"`);
  shell += poly([[-88, 46], [64, 46], [64, 56], [-88, 56]], `fill="#000" opacity="0.3"`);

  const hum =
    bloom(-4, -30, 70, 44, "cHum") +
    `<g ${helmT}>${helm.glow}</g>`;
  const leds =
    [[34, "#3ce07a"], [42, "#22e6ff"], [50, "#ffaa44"]]
      .map(([x, c]) => `<circle cx="${x}" cy="36" r="3.4" fill="${c}" filter="url(#chBlur)"/><circle cx="${x}" cy="36" r="0.7" fill="#fff"/>`)
      .join("") +
    `<rect x="-2" y="30" width="18" height="6" fill="#22e6ff" opacity="0.4" filter="url(#chBlur)"/>`;

  return {
    box: [-136, -106, 268, 184],
    defs,
    layers: [
      { markup: lid },
      { markup: note, anim: { type: "sway", amp: 0.02, speed: 1.3, pivot: [-44, -79] } },
      { markup: inner + helmet },
      { markup: hum, anim: { type: "pulse", min: 0.35, max: 0.85, speed: 1.4 }, blend: "lighter" },
      { markup: shell },
      { markup: leds, anim: { type: "pulse", min: 0.3, max: 1, speed: 3 }, blend: "lighter" },
    ],
  };
}

/** Voss as he appears on archive footage: silver hair swept back, high collar, stern. */
function vossOnScreen() {
  const head =
    "M0,-10 C4.8,-10 7.2,-6.8 7.2,-2.4 C7.2,1.8 7.2,4.4 6.3,6.6 C5,8.8 3,10.2 0,10.2 " +
    "C-3,10.2 -5,8.8 -6.3,6.6 C-7.2,4.4 -7.2,1.8 -7.2,-2.4 C-7.2,-6.8 -4.8,-10 0,-10Z";
  let s = `<g transform="translate(-8 -42) scale(2.3)">`;
  s += path("M-24,26 C-20,17.6 -12,15.4 -4.6,13.6 L4.6,13.6 C12,15.4 20,17.6 24,26 L26,40 L-26,40Z", `fill="url(#vrCoat)"`);
  s += path("M-4.4,4 L-5,16 L5,16 L4.4,4Z", `fill="url(#vrNeck)"`);
  s += path("M-8.4,11.4 C-9.4,14 -10.6,17 -11.4,21 L-4.4,17 L-3,14Z M8.4,11.4 C9.4,14 10.6,17 11.4,21 L4.4,17 L3,14Z", `fill="#0a2238" stroke="#5ad8ff" stroke-width="0.35"`);
  s += path("M-2.6,17 L3.6,26 L3.6,40", `fill="none" stroke="#041220" stroke-width="0.6"`);
  s += path("M14,21 L17.4,23 L20.8,21 M14,23.4 L17.4,25.4 L20.8,23.4", `fill="none" stroke="#5ad8ff" stroke-width="0.6"`);
  s += path("M-7.2,-2 C-8.4,-2.6 -8.8,1.4 -7.6,3.4 M7.2,-2 C8.4,-2.6 8.8,1.4 7.6,3.4", `fill="#3a78a8" stroke="#07182a" stroke-width="0.3"`);
  s += path(head, `fill="url(#vrSkin)" stroke="#07182a" stroke-width="0.4"`);
  s += path("M1.4,-4 C4.6,-4 6.8,-1 7,2.6 C6.6,5.6 4.6,8.6 1.8,9.6Z", `fill="#07203a" opacity="0.45"`);
  s += path("M-7.5,-1 C-8.2,-7.6 -5.8,-11.6 -0.4,-11.9 C5.2,-12.1 8.4,-8.8 7.7,-1.4 C7.3,-3.8 6.7,-5.8 5.3,-6.8 C3,-8.1 -1.6,-8.5 -4.6,-7.5 C-6.4,-6.7 -7.1,-4.4 -7.5,-1Z", `fill="url(#vrHair)" stroke="#07182a" stroke-width="0.35"`);
  s += path("M-5.4,-7.4 C-3.4,-10.2 1,-11.2 5.2,-9.6 M-3.2,-8.2 C-0.2,-10.4 3.6,-10.6 6.6,-8", `fill="none" stroke="#e8f8ff" stroke-width="0.3" opacity="0.7"`);
  s += path("M-5.6,-2.8 L-1.2,-1.6 L-1.2,-0.8 L-5.4,-1.8Z M5.6,-2.8 L1.2,-1.6 L1.2,-0.8 L5.4,-1.8Z", `fill="#051628"`);
  s += `<ellipse cx="-3.2" cy="0.1" rx="1.6" ry="0.7" fill="#041020"/><ellipse cx="3.2" cy="0.1" rx="1.6" ry="0.7" fill="#041020"/>`;
  s += `<circle cx="-3" cy="0" r="0.35" fill="#dff8ff"/><circle cx="3.4" cy="0" r="0.35" fill="#9fe4ff"/>`;
  s += path("M0.5,-0.4 C1,1.6 1.6,3 2,4.2 C1.4,4.7 0.8,4.8 0.3,4.6Z", `fill="#07203a" opacity="0.55"`);
  s += path("M-1.8,4.8 Q0,5.4 1.8,4.8", `fill="none" stroke="#07203a" stroke-width="0.35"`);
  s += path("M-2.6,7.1 Q0,6.7 2.6,7.1", `fill="none" stroke="#041020" stroke-width="0.5" stroke-linecap="round"`);
  s += path("M-5.6,-1.8 L-2.7,4.4", `fill="none" stroke="#bfefff" stroke-width="0.3" opacity="0.6"`);
  s += path("M-6.6,-6 C-7.6,-2 -7.4,3 -6,6.4", `fill="none" stroke="#bfefff" stroke-width="0.4" opacity="0.5"`);
  s += `</g>`;
  return s;
}

// Screen rectangle shared by the wall-monitor recordings (art units).
const REC_X0 = -94;
const REC_X1 = 94;
const REC_Y0 = -77;
const REC_Y1 = 19;

/**
 * A cracked wall monitor with a sparking bezel, playing `footage` behind
 * scanlines and chroma glitch bands. `hud` sits above the vignette, `defs` adds
 * footage gradients and `extra` layers go straight after the screen.
 */
function monitorRecordingModel({ defs: footageDefs = "", footage, hud = "", extra = [] }) {
  const [SX0, SX1, SY0, SY1] = [REC_X0, REC_X1, REC_Y0, REC_Y1];
  const rand = rng(29);
  const defs =
    linGrad("vrScreen", [[0, "#06223a"], [0.55, "#041626"], [1, "#020a14"]]) +
    `<radialGradient id="vrVig" cx="0.45" cy="0.45" r="0.7"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.75"/></radialGradient>` +
    footageDefs +
    linGrad("vrBezel", [[0, "#5a6e82"], [0.2, "#2e3c4c"], [0.7, "#161e28"], [1, "#0a0e14"]], 1, 1) +
    linGrad("vrBand", [[0, "#9fe4ff", 0], [0.5, "#9fe4ff", 0.35], [1, "#9fe4ff", 0]]) +
    fadeGrad("vrSpill", "#2a9aff", 0.3, 0.4) +
    fadeGrad("vrSpark", "#ffe0a0", 0.9, 0.25) +
    `<radialGradient id="vrWall"><stop offset="0" stop-color="#000" stop-opacity="0.75"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
    `<clipPath id="vrClip"><rect x="${SX0}" y="${SY0}" width="${SX1 - SX0}" height="${SY1 - SY0}"/></clipPath>` +
    glowFilter("vrGlow", 1.4) +
    glowFilter("vrSoft", 3);

  let back = `<rect x="-116" y="-96" width="236" height="140" rx="10" fill="url(#vrWall)"/>`;
  back += `<rect x="-5" y="-156" width="10" height="68" fill="url(#vrBezel)" ${ink(0.8)}/><rect x="-10" y="-96" width="20" height="8" fill="#141c26" ${ink(0.8)}/>`;
  back += seg([-3.4, -155], [-3.4, -97], `stroke="#8aa2b8" stroke-width="0.6" opacity="0.6"`);
  back += seg([4.2, -155], [4.2, -97], `stroke="#22e6ff" stroke-width="0.5" opacity="0.4"`);
  back += path("M6,-150 C12,-130 10,-110 7,-94", `fill="none" stroke="#0a0e14" stroke-width="1.4" stroke-linecap="round"`);

  let screen = `<g clip-path="url(#vrClip)"><rect x="${SX0}" y="${SY0}" width="${SX1 - SX0}" height="${SY1 - SY0}" fill="url(#vrScreen)"/>`;
  screen += `<g stroke="#2a8acc" stroke-width="0.3" opacity="0.25">`;
  for (let x = -84; x < 94; x += 14) screen += `<path d="M${x},${SY0} L${x},${SY1}"/>`;
  screen += `</g>`;
  screen += footage;
  for (let y = SY0; y < SY1; y += 1.8) screen += `<rect x="${SX0}" y="${n1(y)}" width="${SX1 - SX0}" height="0.8" fill="#000" opacity="0.32"/>`;
  screen += `<rect x="${SX0}" y="${SY0}" width="${SX1 - SX0}" height="${SY1 - SY0}" fill="url(#vrVig)"/>`;
  screen += hud;
  screen += `</g>`;

  // Glitch: displaced chroma copies of the footage inside thin bands, plus dead blocks.
  let glitch = `<defs>`;
  const bands = [[-58, 4, 7], [-38, 2.4, -9], [-22, 5, 5], [2, 3, -6]];
  bands.forEach(([y, h], i) => (glitch += `<clipPath id="vrB${i}"><rect x="${SX0}" y="${y}" width="${SX1 - SX0}" height="${h}"/></clipPath>`));
  glitch += `</defs><g clip-path="url(#vrClip)">`;
  bands.forEach(([, , dx], i) => {
    glitch += `<g clip-path="url(#vrB${i})"><g transform="translate(${dx} 0)" opacity="0.8">${footage}</g>`;
    glitch += `<rect x="${SX0}" y="-80" width="${SX1 - SX0}" height="110" fill="${i % 2 ? "#ff2a4a" : "#22e6ff"}" opacity="0.28"/></g>`;
  });
  for (let i = 0; i < 16; i++) {
    const x = SX0 + rand() * (SX1 - SX0 - 20);
    const y = SY0 + rand() * (SY1 - SY0 - 4);
    glitch += `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(4 + rand() * 18)}" height="${n1(0.8 + rand() * 2.2)}" fill="${rand() > 0.3 ? "#bfefff" : "#ff5a70"}" opacity="${n1(0.25 + rand() * 0.5)}"/>`;
  }
  glitch += `</g>`;

  const roll = `<g clip-path="url(#vrClip)"><rect x="${SX0}" y="-36" width="${SX1 - SX0}" height="10" fill="url(#vrBand)"/></g>`;

  // Cracked glass radiating from an impact up and to the right.
  const IX = 50;
  const IY = -40;
  let crack = `<g clip-path="url(#vrClip)">`;
  crack += poly([[IX - 5, IY - 3], [IX + 3, IY - 6], [IX + 7, IY + 2], [IX + 1, IY + 6], [IX - 6, IY + 3]], `fill="#010306" stroke="#dff4ff" stroke-width="0.4" stroke-opacity="0.6"`);
  crack += poly([[IX + 3, IY - 6], [IX + 22, IY - 30], [IX + 36, IY - 20], [IX + 7, IY + 2]], `fill="#bfefff" opacity="0.06"`);
  crack += poly([[IX - 6, IY + 3], [IX - 34, IY + 30], [IX - 14, IY + 44], [IX + 1, IY + 6]], `fill="#bfefff" opacity="0.05"`);
  const rays = [[-150, 60], [-120, 72], [-80, 58], [-30, 70], [10, 44], [50, 52], [95, 64], [140, 48], [175, 70], [215, 60], [250, 82], [300, 50]];
  const ends = rays.map(([deg, len]) => {
    const a = (deg * Math.PI) / 180;
    let d = `M${IX},${IY}`;
    let [x, y] = [IX, IY];
    const pts2 = [];
    for (let k = 1; k <= 4; k++) {
      const jitter = (rand() - 0.5) * 0.5;
      x = IX + Math.cos(a + jitter * 0.4) * (len * k) / 4;
      y = IY + Math.sin(a + jitter * 0.4) * (len * k) / 4;
      d += ` L${n1(x)},${n1(y)}`;
      pts2.push([x, y]);
    }
    crack += path(d, `fill="none" stroke="#010306" stroke-width="1" opacity="0.8"`);
    crack += path(d, `fill="none" stroke="#e8f8ff" stroke-width="0.4" opacity="0.75" transform="translate(-0.5 -0.4)"`);
    return pts2;
  });
  for (const ring of [1, 2]) {
    let d = "";
    ends.forEach((p, i) => {
      const q = ends[(i + 1) % ends.length];
      if (rand() < 0.3) return;
      d += `M${n1(p[ring][0])},${n1(p[ring][1])} L${n1(q[ring][0])},${n1(q[ring][1])} `;
    });
    crack += path(d, `fill="none" stroke="#dff4ff" stroke-width="0.35" opacity="${ring === 1 ? 0.6 : 0.35}"`);
  }
  crack += `</g>`;

  // Bezel with a chipped lower-right corner and torn wiring.
  let bezel = path(
    `M-104,-86 L104,-86 L104,12 L92,28 L-104,28Z M${SX0},${SY0} L${SX1},${SY0} L${SX1},${SY1} L${SX0},${SY1}Z`,
    `fill="url(#vrBezel)" fill-rule="evenodd" ${ink()}`,
  );
  bezel += path(`M104,12 L96,14 L99,19 L92,20 L92,28Z`, `fill="#06090e" ${ink(0.6)}`);
  bezel += seg([-102, -84.6], [102, -84.6], `stroke="#b8cee2" stroke-width="0.8" opacity="0.6"`);
  bezel += seg([-102.6, -84], [-102.6, 26], `stroke="#8aa2b8" stroke-width="0.6" opacity="0.45"`);
  bezel += seg([104.6, -84], [104.6, 10], `stroke="#22e6ff" stroke-width="0.8" opacity="0.5"`);
  bezel += seg([SX0, SY1 + 0.6], [SX1, SY1 + 0.6], `stroke="#000" stroke-width="1.2" opacity="0.6"`);
  bezel += `<rect x="-14" y="21.4" width="28" height="3" rx="1" fill="#0a0e14" stroke="#4a5a6e" stroke-width="0.4"/>`;
  bezel += `<circle cx="-96" cy="24" r="1.2" fill="#3a0a0e" stroke="${INK}" stroke-width="0.3"/>`;
  for (const [x, y] of [[-100, -82], [100, -82], [-100, 24]]) bezel += `<circle cx="${x}" cy="${y}" r="1.1" fill="#2a3644" stroke="${INK}" stroke-width="0.35"/>`;
  bezel += path("M95,18 C96,30 92,38 95,52", `fill="none" stroke="#b83a2a" stroke-width="1.2" stroke-linecap="round"`);
  bezel += path("M98,18 C101,28 104,34 101,46", `fill="none" stroke="#2a7ab8" stroke-width="1.2" stroke-linecap="round"`);
  bezel += path("M100,16 C104,22 108,26 110,36", `fill="none" stroke="#c8a040" stroke-width="1" stroke-linecap="round"`);
  bezel += `<circle cx="95" cy="52" r="0.9" fill="#d8c090"/><circle cx="101" cy="46" r="0.9" fill="#d8c090"/><circle cx="110" cy="36" r="0.8" fill="#d8c090"/>`;

  const spill = bloom(0, -30, 130, 80, "vrSpill");
  let sparks = "";
  for (const [x, y, r] of [[99, 17, 1], [95, 52, 0.8], [110, 36, 0.6]]) {
    sparks += bloom(x, y, 12 * r, 12 * r, "vrSpark");
    let rays2 = "";
    for (let i = 0; i < 7; i++) {
      const a = rand() * Math.PI * 2;
      const l = (4 + rand() * 9) * r;
      rays2 += `M${x},${y} L${n1(x + Math.cos(a) * l)},${n1(y + Math.sin(a) * l)} `;
    }
    sparks += path(rays2, `fill="none" stroke="#ffd890" stroke-width="0.9" stroke-linecap="round" filter="url(#vrGlow)"`);
    sparks += path(rays2, `fill="none" stroke="#fffaf0" stroke-width="0.35" stroke-linecap="round"`);
    for (let i = 0; i < 4; i++) sparks += `<circle cx="${n1(x + (rand() - 0.3) * 14 * r)}" cy="${n1(y + rand() * 16 * r)}" r="0.6" fill="#fff0c8"/>`;
  }
  const rec =
    `<circle cx="-84" cy="-68" r="3.6" fill="#ff3344" filter="url(#vrGlow)"/>` +
    `<rect x="-14" y="21.4" width="28" height="3" fill="#22e6ff" opacity="0.25" filter="url(#vrGlow)"/>`;

  return {
    box: [-122, -158, 244, 222],
    defs,
    layers: [
      { markup: back },
      { markup: spill, anim: { type: "flicker", min: 0.5, max: 1, speed: 1.4 }, blend: "lighter" },
      { markup: screen, anim: { type: "flicker", min: 0.82, max: 1, speed: 2.2 } },
      ...extra,
      { markup: roll, anim: { type: "float", amp: 34, speed: 0.9 }, blend: "lighter" },
      { markup: glitch, anim: { type: "flicker", min: 0, max: 1, speed: 3.4 }, blend: "lighter" },
      { markup: crack },
      { markup: bezel },
      { markup: rec, anim: { type: "pulse", min: 0.2, max: 1, speed: 3.2 }, blend: "lighter" },
      { markup: sparks, anim: { type: "flicker", min: 0, max: 1, speed: 5 }, blend: "lighter" },
    ],
  };
}

/** A cracked wall monitor looping Voss's corrupted recording. */
function vossRecordingModel() {
  const defs =
    linGrad("vrSkin", [[0, "#bfefff"], [0.45, "#5ab4e6"], [1, "#1a5286"]], 1, 0.4) +
    linGrad("vrHair", [[0, "#f0fbff"], [0.5, "#9ad4f4"], [1, "#3a78a8"]], 1, 1) +
    linGrad("vrNeck", [[0, "#1a5286"], [1, "#2a6ea4"]], 1, 0) +
    linGrad("vrCoat", [[0, "#1c4a74"], [0.5, "#0c2640"], [1, "#040e1a"]], 1, 0.3);
  let hud = `<rect x="-86" y="-70" width="4" height="4" rx="2" fill="#ff3344"/>`;
  hud += `<rect x="-79" y="-69.4" width="14" height="2.8" fill="#9fd8ff" opacity="0.6"/>`;
  hud += `<rect x="54" y="-69.4" width="30" height="2.8" fill="#9fd8ff" opacity="0.5"/>`;
  hud += `<rect x="-86" y="10" width="172" height="1.2" fill="#9fd8ff" opacity="0.3"/><rect x="-86" y="10" width="61" height="1.2" fill="#9fd8ff" opacity="0.8"/>`;
  return monitorRecordingModel({ defs, footage: vossOnScreen(), hud });
}

// 5×5 pixel glyphs for on-screen captions (rows top to bottom, "1" = lit).
const PIXEL_GLYPHS = {
  U: ["10001", "10001", "10001", "10001", "01110"],
  N: ["10001", "11001", "10101", "10011", "10001"],
  K: ["10001", "10010", "11100", "10010", "10001"],
  O: ["01110", "10001", "10001", "10001", "01110"],
  W: ["10001", "10001", "10101", "10101", "01010"],
};

/** A word as one path of merged pixel runs, top-left at (x, y), `px` units per pixel. */
function pixelWord(word, x, y, px, attrs) {
  let d = "";
  [...word].forEach((ch, i) => {
    PIXEL_GLYPHS[ch].forEach((row, r) => {
      for (const m of row.matchAll(/1+/g)) {
        d += `M${n1(x + (i * 6 + m.index) * px)},${n1(y + r * px)}h${n1(m[0].length * px)}v${px}h${n1(-m[0].length * px)}Z`;
      }
    });
  });
  return path(d, attrs);
}

/** A tile of TV static: random grey cells, one path per grey level. */
function staticPattern(id, seed, cell = 1.2, size = 20) {
  const rand = rng(seed);
  const levels = ["#56687a", "#9fb4c4", "#e8f4ff"];
  const ds = levels.map(() => "");
  for (let r = 0; r < size; r++) {
    const streak = rand() < 0.12 ? 1 : 0;
    for (let c = 0; c < size; c++) {
      const v = rand() + streak * 0.35;
      if (v < 0.38) continue;
      const lv = v < 0.66 ? 0 : v < 0.88 ? 1 : 2;
      ds[lv] += `M${n1(c * cell)},${n1(r * cell)}h${cell}v${cell}h-${cell}Z`;
    }
  }
  const w = n1(size * cell);
  return (
    `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${w}" height="${w}">` +
    `<rect width="${w}" height="${w}" fill="#0a121a"/>` +
    ds.map((d, i) => path(d, `fill="${levels[i]}"`)).join("") +
    `</pattern>`
  );
}

/** Screen-space rows the static face block occupies, ragged at the edges. */
function staticFaceRows() {
  const rand = rng(71);
  const rows = [];
  for (let y = -66; y < -24; y += 2.4) {
    const k = (y + 1.2 + 45) / 22;
    const half = 17 * Math.sqrt(Math.max(0, 1 - k * k)) + 3 + rand() * 3;
    const tear = rand() < 0.16 ? 5 + rand() * 9 : 0;
    const x = -34 - half - rand() * 2 - tear;
    rows.push([x, y, -34 + half + rand() * 2 + tear * rand() - x, 2.4]);
  }
  return rows;
}

/** One frame of the static face: `patternId` fill, dark tear lines and scanlines over it. */
function staticFace(patternId, seed, shift) {
  const rand = rng(seed);
  let s = `<g clip-path="url(#urFace)"><rect x="-70" y="-70" width="70" height="50" fill="url(#${patternId})" transform="translate(${shift[0]} ${shift[1]})"/>`;
  for (let i = 0; i < 3; i++) {
    const y = -64 + rand() * 38;
    s += `<rect x="-70" y="${n1(y)}" width="70" height="${n1(0.6 + rand() * 1.2)}" fill="${rand() > 0.5 ? "#000" : "#dff4ff"}" opacity="${n1(0.35 + rand() * 0.4)}"/>`;
  }
  for (let y = -66; y < -22; y += 1.8) s += `<rect x="-70" y="${n1(y)}" width="70" height="0.8" fill="#000" opacity="0.3"/>`;
  s += `</g>`;
  return s;
}

/** Faceless figure on archive footage: a plain-suited silhouette, head replaced by a static block. */
function unknownOnScreen() {
  let s = `<ellipse cx="-34" cy="-30" rx="58" ry="46" fill="url(#urBack)"/>`;
  s += path(
    "M-88,19 C-86,2 -76,-10 -60,-15 L-43,-21 C-42,-25 -42,-28 -42.4,-31 L-25.6,-31 C-26,-28 -26,-25 -25,-21 L-8,-15 C8,-10 18,2 20,19Z",
    `fill="url(#urBody)" stroke="#03080f" stroke-width="0.6"`,
  );
  s += path("M-43,-21 L-34,-6 L-25,-21", `fill="none" stroke="#020810" stroke-width="0.8" opacity="0.8"`);
  s += path("M-50,-17 L-40,6 L-34,-6 M-18,-17 L-28,6 L-34,-6", `fill="none" stroke="#1e4a6e" stroke-width="0.5" opacity="0.7"`);
  s += path("M-25,-21 L-8,-15 C8,-10 18,2 20,19", `fill="none" stroke="#8ae4ff" stroke-width="1" opacity="0.6"`);
  s += path("M-43,-21 L-60,-15 C-76,-10 -86,2 -88,19", `fill="none" stroke="#5ab4e6" stroke-width="0.7" opacity="0.35"`);
  s += `<ellipse cx="-34" cy="-45" rx="14" ry="17" fill="#030a14"/>`;
  return s;
}

/** A cracked wall monitor looping a recording of a man whose face is pure static, captioned UNKNOWN. */
function unknownRecordingModel() {
  const rand = rng(83);
  const rows = staticFaceRows();
  const defs =
    linGrad("urBody", [[0, "#050e18"], [0.6, "#030a12"], [1, "#010408"]], 1, 0.4) +
    fadeGrad("urBack", "#4ab8ff", 0.55, 0.45) +
    linGrad("urPlate", [[0, "#ff4458"], [0.5, "#d41c32"], [1, "#7a0c18"]]) +
    fadeGrad("urRed", "#ff2a4a", 0.55, 0.35) +
    `<clipPath id="urFace">${rows.map(([x, y, w, h]) => `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${h}"/>`).join("")}</clipPath>` +
    staticPattern("urN0", 11);
  const figure = unknownOnScreen();
  const face0 = staticFace("urN0", 5, [0, 0]);
  const footage = figure + face0;

  // Lower-third caption plate and a file panel whose author field has been wiped.
  let hud = `<rect x="-86" y="-70" width="4" height="4" rx="2" fill="#ff3344"/>`;
  hud += `<rect x="-79" y="-69.4" width="14" height="2.8" fill="#9fd8ff" opacity="0.6"/>`;
  hud += `<rect x="-86" y="12" width="172" height="1.2" fill="#9fd8ff" opacity="0.3"/><rect x="-86" y="12" width="104" height="1.2" fill="#9fd8ff" opacity="0.8"/>`;
  hud += `<rect x="-78" y="-8" width="68" height="13" fill="#000" opacity="0.45"/>`;
  hud += `<rect x="-80" y="-10" width="68" height="13" fill="url(#urPlate)" stroke="#2a0208" stroke-width="0.6"/>`;
  hud += `<rect x="-80" y="-10" width="9" height="13" fill="#3a0610"/>`;
  hud += poly([[-75.5, -7.2], [-72.4, -1.4], [-78.6, -1.4]], `fill="none" stroke="#ff5a6a" stroke-width="0.7" stroke-linejoin="round"`);
  hud += `<rect x="-75.8" y="-5.6" width="0.6" height="2.2" fill="#ff5a6a"/><rect x="-75.8" y="-2.8" width="0.6" height="0.6" fill="#ff5a6a"/>`;
  hud += seg([-71, -9.4], [-12.6, -9.4], `stroke="#ffb0b8" stroke-width="0.5" opacity="0.7"`);
  hud += pixelWord("UNKNOWN", -67.4, -6.6, 1.2, `fill="#fff0f2"`);

  const fields = [[-60, 0.7], [-50, 0.55], [-17, 0.5], [-8, 0.4]];
  for (const [y, a] of fields) {
    hud += `<rect x="14" y="${y}" width="${n1(8 + rand() * 10)}" height="2.2" fill="#9fd8ff" opacity="${a * 0.7}"/>`;
    let x = 40;
    while (x < 80) {
      const w = 3 + rand() * 9;
      hud += `<rect x="${n1(x)}" y="${y}" width="${n1(Math.min(w, 84 - x))}" height="2.2" fill="#bfe8ff" opacity="${a}"/>`;
      x += w + 1.6;
    }
  }
  hud += `<rect x="14" y="-68" width="46" height="3" fill="#9fd8ff" opacity="0.5"/><rect x="62" y="-68" width="22" height="3" fill="#ff3344" opacity="0.6"/>`;
  const AY = -34;
  hud += `<rect x="14" y="${AY + 3}" width="18" height="2.4" fill="#9fd8ff" opacity="0.7"/>`;
  hud += `<rect x="38" y="${AY}" width="48" height="8.4" fill="#020609" stroke="#9fd8ff" stroke-width="0.4" stroke-opacity="0.7"/>`;
  hud += `<g clip-path="url(#urField)"><defs><clipPath id="urField"><rect x="38.4" y="${AY + 0.4}" width="47.2" height="7.6"/></clipPath></defs>`;
  let hatch = "";
  for (let x = 30; x < 90; x += 2.2) hatch += `M${x},${AY + 8} L${n1(x + 7.6)},${AY + 0.4} `;
  hud += path(hatch, `fill="none" stroke="#4a6a84" stroke-width="0.5" opacity="0.8"`);
  for (let i = 0; i < 14; i++) {
    const x = 40 + rand() * 10 + i * 1.1;
    hud += `<rect x="${n1(x)}" y="${n1(AY + 2 + rand() * 4)}" width="${n1(0.6 + (1 - i / 14) * 2)}" height="1.4" fill="#dff4ff" opacity="${n1(0.9 - i * 0.05)}"/>`;
  }
  hud += `<rect x="38.4" y="${AY + 3.4}" width="47.2" height="1.4" fill="#ff3344" opacity="0.75"/>`;
  hud += `</g>`;

  const face1 = `<defs>${staticPattern("urN1", 23)}</defs>` + staticFace("urN1", 17, [0.6, 0.4]);
  const face2 = `<defs>${staticPattern("urN2", 41)}</defs>` + staticFace("urN2", 29, [-0.4, 0.8]);
  const faceRoll =
    `<g clip-path="url(#urFace)"><rect x="-70" y="-49" width="70" height="3" fill="#e8f8ff" opacity="0.5"/>` +
    `<rect x="-70" y="-46" width="70" height="7" fill="#9fe4ff" opacity="0.12"/></g>`;
  const glow =
    bloom(-46, -3.5, 44, 14, "urRed", 0.8) +
    `<rect x="38.4" y="${AY + 3.2}" width="47.2" height="1.8" fill="#ff5a6a" opacity="0.6" filter="url(#vrGlow)"/>`;

  return monitorRecordingModel({
    defs,
    footage,
    hud,
    extra: [
      { markup: face1, anim: { type: "flicker", min: 0, max: 1, speed: 9 } },
      { markup: face2, anim: { type: "flicker", min: 0, max: 1, speed: 13, phase: 0.4 } },
      { markup: faceRoll, anim: { type: "float", amp: 20, speed: 2.4 }, blend: "lighter" },
      { markup: glow, anim: { type: "flicker", min: 0.45, max: 1, speed: 2 }, blend: "lighter" },
    ],
  });
}

/** A Bureau personnel file: redacted pages, clipped mystery photo, encrypted signal, CLASSIFIED stamp. */
function redactedFileModel() {
  const rand = rng(53);
  const defs =
    linGrad("rfFolder", [[0, "#9a7a4c"], [0.45, "#6a5230"], [1, "#2a1e0e"]], 1, 0.8) +
    linGrad("rfPaper", [[0, "#e6e2d6"], [0.5, "#bcb8ac"], [1, "#6e6a60"]], 1, 0.9) +
    linGrad("rfPhoto", [[0, "#3a4656"], [1, "#0e141c"]], 0.6, 1) +
    linGrad("rfClip", [[0, "#e8f0f8"], [0.5, "#8a9aaa"], [1, "#3a4654"]], 1, 1) +
    `<radialGradient id="rfShadow"><stop offset="0" stop-color="#000" stop-opacity="0.8"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
    fadeGrad("rfGlow", "#3aa8ff", 0.35, 0.4) +
    `<mask id="rfGrunge" maskUnits="userSpaceOnUse" x="-60" y="-30" width="120" height="60"><rect x="-60" y="-30" width="120" height="60" fill="#fff"/>` +
    Array.from({ length: 70 }, () => `<circle cx="${n1((rand() - 0.5) * 80)}" cy="${n1((rand() - 0.5) * 30)}" r="${n1(0.3 + rand() * 1.3)}" fill="#000"/>`).join("") +
    `<rect x="-40" y="4" width="26" height="12" fill="#000" opacity="0.5"/></mask>` +
    glowFilter("rfBlur", 1.4) +
    glowFilter("rfSoft", 3);

  let base = `<ellipse cx="0" cy="58" rx="112" ry="10" fill="url(#rfShadow)"/>`;
  base += `<g transform="rotate(-4)">`;
  base += path("M-98,-74 L-92,-84 L-48,-84 L-42,-74 L96,-74 L96,54 L-98,54Z", `fill="url(#rfFolder)" ${ink()}`);
  base += seg([-96, -73], [94, -73], `stroke="#e0c894" stroke-width="0.6" opacity="0.6"`);
  base += seg([-91, -83], [-49, -83], `stroke="#e0c894" stroke-width="0.6" opacity="0.6"`);
  base += `<rect x="-86" y="-82" width="30" height="5" fill="#2a1e0e" opacity="0.6"/>`;
  base += seg([96.6, -72], [96.6, 52], `stroke="#22e6ff" stroke-width="0.8" opacity="0.5"`);
  base += `<rect x="-84" y="-60" width="170" height="116" fill="#000" opacity="0.55" filter="url(#rfSoft)"/>`;
  base += `</g>`;

  let page = `<g transform="rotate(-1.5)">`;
  page += `<rect x="-88" y="-66" width="168" height="114" fill="url(#rfPaper)" ${ink(0.8)}/>`;
  page += `<rect x="-86" y="-64" width="168" height="114" fill="none" stroke="#fff" stroke-width="0.5" opacity="0.4"/>`;
  page += `<g transform="translate(64 -52)"><circle r="7.6" fill="none" stroke="#3a4454" stroke-width="0.9"/><circle r="5" fill="none" stroke="#3a4454" stroke-width="0.5"/>`;
  page += `<path d="M0,0 L0,-3.6 M0,0 L2.6,1.2" stroke="#3a4454" stroke-width="0.8" stroke-linecap="round"/></g>`;
  page += `<rect x="-24" y="-60" width="56" height="4.4" fill="#262c36"/><rect x="-24" y="-53" width="34" height="2" fill="#5a606a"/>`;
  page += seg([-84, -46], [76, -46], `stroke="#5a606a" stroke-width="0.6"`);
  const rows = [
    [-24, -40, [[0, 22, 0], [24, 30, 1], [56, 20, 0]]],
    [-24, -33, [[0, 14, 0], [16, 58, 1]]],
    [-24, -26, [[0, 30, 0], [32, 18, 0], [52, 24, 1]]],
    [-24, -19, [[0, 40, 1], [42, 34, 0]]],
    [-24, -12, [[0, 18, 0], [20, 26, 0], [48, 26, 1]]],
    [-84, -2, [[0, 36, 0], [38, 70, 1], [110, 50, 0]]],
    [-84, 5, [[0, 20, 1], [22, 44, 0], [68, 28, 0], [98, 62, 1]]],
    [-84, 12, [[0, 62, 0], [64, 40, 1], [106, 30, 0]]],
    [-84, 19, [[0, 30, 0], [32, 52, 1]]],
  ];
  for (const [x0, y, parts] of rows) {
    for (const [dx, w, red] of parts) {
      page += red
        ? `<rect x="${x0 + dx}" y="${y - 2.4}" width="${w}" height="4.6" fill="#07080a" transform="rotate(${n1((rand() - 0.5) * 0.8)} ${x0 + dx} ${y})"/>`
        : `<rect x="${x0 + dx}" y="${y - 0.8}" width="${w}" height="1.6" fill="#6a6e76" opacity="0.8"/>`;
    }
  }
  page += `<circle cx="-62" cy="30" r="13" fill="none" stroke="#6a4a2a" stroke-width="1.6" opacity="0.2"/>`;
  page += `<path d="M-74,27 A13,13 0 0 1 -56,18" fill="none" stroke="#6a4a2a" stroke-width="0.8" opacity="0.25"/>`;

  // Encrypted signal strip.
  page += `<rect x="-80" y="26" width="152" height="18" rx="1.2" fill="#050a12" ${ink(0.6)}/>`;
  page += `<g stroke="#1a3a5a" stroke-width="0.35">`;
  for (let x = -76; x < 72; x += 6) page += `<path d="M${x},27.4 L${x},${x % 24 === 0 ? 30 : 28.6}"/>`;
  page += `</g>`;
  let wave = "M-76,35";
  for (let x = -74; x <= 68; x += 2) {
    const amp = x > -20 && x < 30 ? 7 : 3.6;
    wave += ` L${x},${n1(35 + (rand() - 0.5) * 2 * amp * (0.4 + 0.6 * Math.abs(Math.sin(x * 0.21))))}`;
  }
  page += path(wave, `fill="none" stroke="#6ac8ff" stroke-width="0.7" stroke-linejoin="round"`);
  let blocks = "";
  for (let i = 0; i < 9; i++) blocks += `<rect x="${-72 + i * 16 + n1(rand() * 6)}" y="${n1(28.6 + rand() * 11)}" width="${n1(2 + rand() * 5)}" height="1.6" fill="#ffaa44" opacity="0.7"/>`;
  page += blocks;

  // Clipped photo: blank-faced silhouette with a question mark.
  page += `<g transform="translate(-58 -32) rotate(-6)">`;
  page += `<rect x="-24" y="-28" width="44" height="54" fill="#000" opacity="0.5" filter="url(#rfBlur)" transform="translate(2 2)"/>`;
  page += `<rect x="-24" y="-28" width="44" height="54" fill="#dedad0" ${ink(0.6)}/>`;
  page += `<rect x="-20.4" y="-24.4" width="36.8" height="40" fill="url(#rfPhoto)"/>`;
  page += path("M-20.4,15.6 C-18,6 -12,3.4 -6,2 C-10.4,-1 -12,-6 -11.4,-10 C-10.6,-16 -6.8,-19.6 -2,-19.6 C2.8,-19.6 6.6,-16 7.4,-10 C8,-6 6.4,-1 2,2 C8,3.4 14,6 16.4,15.6Z", `fill="#05080c"`);
  page += path("M-6.8,-12.4 C-6.8,-16.4 2.8,-16.4 2.8,-11.8 C2.8,-8.6 -2,-8.4 -2,-4.6 L-2,-3", `fill="none" stroke="#ffaa44" stroke-width="2.2" stroke-linecap="round" opacity="0.9"`);
  page += `<circle cx="-2" cy="0.6" r="1.3" fill="#ffaa44" opacity="0.9"/>`;
  page += `<rect x="-20.4" y="-24.4" width="36.8" height="40" fill="none" stroke="#000" stroke-width="0.6" opacity="0.6"/>`;
  page += `<rect x="-18" y="19" width="22" height="1.6" fill="#6a6e76"/>`;
  page += path("M-12,-34 L-12,-12 C-12,-8 -6,-8 -6,-12 L-6,-30 C-6,-33 -9.4,-33 -9.4,-30 L-9.4,-15", `fill="none" stroke="#1a222c" stroke-width="1.8" stroke-linecap="round"`);
  page += path("M-12,-34 L-12,-12 C-12,-8 -6,-8 -6,-12 L-6,-30 C-6,-33 -9.4,-33 -9.4,-30 L-9.4,-15", `fill="none" stroke="url(#rfClip)" stroke-width="1" stroke-linecap="round"`);
  page += `</g>`;

  // CLASSIFIED stamp as blocky glyph shapes inside a double border.
  let stamp = `<g transform="translate(40 -4) rotate(-12)"><g mask="url(#rfGrunge)" fill="#c41e2a" opacity="0.85">`;
  stamp += path("M-40,-12 L40,-12 L40,12 L-40,12Z M-37.4,-9.4 L-37.4,9.4 L37.4,9.4 L37.4,-9.4Z", `fill-rule="evenodd"`);
  stamp += path("M-35.6,-7.8 L35.6,-7.8 L35.6,-6.8 L-35.6,-6.8Z M-35.6,6.8 L35.6,6.8 L35.6,7.8 L-35.6,7.8Z", "");
  const glyphs = [
    "M0,0 H6 V2 H2 V8 H6 V10 H0Z",
    "M0,0 H2 V8 H6 V10 H0Z",
    "M0,10 L2.6,0 H4.6 L7,10 H5 L4.4,7.4 H2.6 L2,10Z M3,5.6 H4 L3.6,2.8Z",
    "M0,0 H6 V2 H2 V4 H6 V10 H0 V8 H4 V6 H0Z",
    "M0,0 H6 V2 H2 V4 H6 V10 H0 V8 H4 V6 H0Z",
    "M0,0 H6 V2 H4 V8 H6 V10 H0 V8 H2 V2 H0Z",
    "M0,0 H6 V2 H2 V4 H5 V6 H2 V10 H0Z",
    "M0,0 H6 V2 H4 V8 H6 V10 H0 V8 H2 V2 H0Z",
    "M0,0 H6 V2 H2 V4 H5 V6 H2 V8 H6 V10 H0Z",
    "M0,0 H4 C7,0 7,10 4,10 H0Z M2,2 V8 H3.6 C5,8 5,2 3.6,2Z",
  ];
  glyphs.forEach((d, i) => (stamp += `<path d="${d}" fill-rule="evenodd" transform="translate(${n1(-33.4 + i * 6.9)} -5)"/>`));
  stamp += `</g></g>`;
  page += stamp;
  page += `</g>`;

  const glow =
    `<g transform="rotate(-1.5)">` +
    bloom(-4, 35, 96, 16, "rfGlow") +
    path(wave, `fill="none" stroke="#3aa8ff" stroke-width="2" stroke-linejoin="round" filter="url(#rfBlur)"`) +
    path(wave, `fill="none" stroke="#e0f6ff" stroke-width="0.35" stroke-linejoin="round"`) +
    `</g>`;
  const scan = `<g transform="rotate(-1.5)"><rect x="-4" y="27" width="3" height="16" fill="#9fe4ff" opacity="0.45" filter="url(#rfBlur)"/></g>`;

  return {
    box: [-116, -92, 230, 164],
    defs,
    layers: [
      { markup: base },
      { markup: page },
      { markup: glow, anim: { type: "pulse", min: 0.35, max: 1, speed: 2.4 }, blend: "lighter" },
      { markup: scan, anim: { type: "drift", amp: 66, speed: 0.9 }, blend: "lighter" },
    ],
  };
}

export const MODELS = {
  /** Chronos Station exterior: Bureau HQ block, ringed tower, antenna beacon. */
  station: stationModel(),
  /** Memory fragment (Voss): luminous blue crystal with a ghosted figure inside. */
  fragment_blue: fragmentModel(FRAGMENT_PALETTES.fragment_blue),
  /** Memory fragment (Miri): luminous green crystal with a ghosted figure inside. */
  fragment_green: fragmentModel(FRAGMENT_PALETTES.fragment_green),
  /** Memory fragment (Kai): luminous amber crystal with a ghosted figure inside. */
  fragment_amber: fragmentModel(FRAGMENT_PALETTES.fragment_amber),
  /** The R&D crate in the cadet's locker: lid open on the Alpha Prototype helmet, sticky note, status LEDs. */
  armor_crate: armorCrateModel(),
  /** Cracked wall monitor looping Voss's corrupted recording: scanlines, glitch bands, sparking bezel. */
  voss_recording: vossRecordingModel(),
  /** Same cracked monitor, but the recorded man is a silhouette with a TV-static face, captioned UNKNOWN; author field wiped. */
  unknown_recording: unknownRecordingModel(),
  /** Bureau personnel file: redaction bars, clipped question-mark photo, glowing encrypted signal, CLASSIFIED stamp. */
  redacted_file: redactedFileModel(),
};

export const BACKGROUNDS = {
  /** Chronos Station interior corridor: ribs, pipes, lit bulkhead, sweeping red beacon. */
  station: stationBackground(),
  /** Bureau locker room: locker rows, bench, strip lights, open locker glowing cyan, R&D crate. */
  locker_room: lockerRoomBackground(),
  /** Near-black void with faint cool haze and dust, for dialogue frames. */
  dark: darkBackground(),
};
