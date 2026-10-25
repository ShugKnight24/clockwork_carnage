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

  // Light refracted out through the facets: thin god-rays from the core.
  let rays = "";
  [[-160, 70], [-128, 52], [-96, 64], [-62, 58], [-28, 70], [16, 60], [58, 66], [104, 54], [140, 62]].forEach(([deg, len], i) => {
    const a = (deg * Math.PI) / 180;
    const w = 0.05 + (i % 3) * 0.02;
    const pt = (k, da) => [2 + Math.cos(a + da) * len * k, -30 + Math.sin(a + da) * len * k];
    rays += poly([pt(0.15, 0), pt(1, -w), pt(1, w)], `fill="${pal.light}" opacity="${n1(0.16 + (i % 2) * 0.1)}"`);
  });
  const aura =
    bloom(2, -28, 78, 92, "fAura") +
    bloom(2, 56, 44, 7, "fHalo", 0.35) +
    `<g filter="url(#fBlur2)">${rays}</g>` +
    // Caustic light thrown on the ground below it.
    `<g filter="url(#fBlur1)">` + [[-14, 57, 10], [8, 59, 14], [22, 56, 7], [-28, 59, 6]].map(([x, y, rx]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="1.4" fill="${pal.pale}" opacity="0.3"/>`).join("") + `</g>`;

  const orbit =
    MINI_SHARDS.map(([x, y, s, r]) => miniShard(x, y, s, r)).join("") +
    [[-38, -84], [34, -100], [60, -30], [-60, -10], [40, 44], [-24, 50]]
      .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${0.8 + (i % 3) * 0.4}" fill="${pal.pale}" opacity="0.8"/>`)
      .join("") +
    [[-30, -96, 5], [44, -60, 4], [-52, 12, 3.5], [30, 30, 3]]
      .map(([x, y, r]) => `<path d="M${x} ${y - r}L${x + r * 0.16} ${y - r * 0.16}L${x + r} ${y}L${x + r * 0.16} ${y + r * 0.16}L${x} ${y + r}L${x - r * 0.16} ${y + r * 0.16}L${x - r} ${y}L${x - r * 0.16} ${y - r * 0.16}Z" fill="${pal.core}" opacity="0.85"/>`)
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
    // Internal refraction planes and a chromatic fringe on the lit edge.
    `<g clip-path="url(#fClip)" opacity="0.5">` +
    poly([[-20, -40], [14, -70], [22, -60], [-12, -30]], `fill="${pal.pale}" opacity="0.18"`) +
    poly([[-24, 0], [20, -30], [24, -20], [-16, 8]], `fill="${pal.core}" opacity="0.12"`) +
    seg([-26, -10], [18, -64], `stroke="${pal.core}" stroke-width="0.4" opacity="0.6"`) + `</g>` +
    `<polyline points="${pts([SHARD[7], SHARD[0], SHARD[1]])}" fill="none" stroke="#ff7ad0" stroke-width="0.5" opacity="0.35" transform="translate(-0.8 0.3)"/>` +
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
    `<filter id="stBlur" x="-0.3" y="-0.3" width="1.6" height="1.6"><feGaussianBlur stdDeviation="1.6"/></filter>` +
    `<filter id="stSoft" filterUnits="userSpaceOnUse" x="-130" y="-142" width="260" height="196"><feGaussianBlur stdDeviation="4"/></filter>` +
    `<linearGradient id="stBeam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#bff8ff" stop-opacity="0.5"/><stop offset="0.5" stop-color="#5cf0ff" stop-opacity="0.12"/><stop offset="1" stop-color="#5cf0ff" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="stFog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fb8d8" stop-opacity="0"/><stop offset="0.5" stop-color="#8fb8d8" stop-opacity="0.22"/><stop offset="1" stop-color="#8fb8d8" stop-opacity="0.05"/></linearGradient>` +
    `<linearGradient id="stRim" x1="0" y1="0" x2="1" y2="0"><stop offset="0.6" stop-color="#22e6ff" stop-opacity="0"/><stop offset="1" stop-color="#22e6ff" stop-opacity="0.28"/></linearGradient>`;

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

  // Searchlights raking up off the plinth into the night haze.
  const beam = (x, ang, w) =>
    `<path transform="rotate(${ang} ${x} 40)" d="M${x - 1.5} 40 L${x + 1.5} 40 L${x + w} -140 L${x - w} -140 Z" fill="url(#stBeam)"/>`;
  const aura =
    bloom(0, -38, 132, 100, "stAura") +
    bloom(0, -121, 18, 18, "stBeacon", 0.3) +
    `<g filter="url(#stSoft)">${beam(-100, -14, 14)}${beam(100, 16, 14)}${beam(-56, -4, 9)}${beam(60, 6, 9)}</g>`;

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
    // Low fog rolling across the plinth, lit from the entrance.
    `<g filter="url(#stSoft)"><rect x="-128" y="26" width="256" height="24" fill="url(#stFog)"/><ellipse cx="0" cy="40" rx="70" ry="9" fill="#5cf0ff" opacity="0.25"/></g>` +
    // Cyan rim down the right-hand faces (the station's own glow behind it).
    `<rect x="-90" y="-23" width="180" height="57" fill="url(#stRim)" opacity="0.8"/>` +
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

/**
 * The Chronos PD station's main corridor, painted to match the playable rooms
 * (src/rendering/env/rooms/corridor.js): dark band under a tiled ceiling of
 * fluorescent troffers, cream upper wall with the blue wayfinding stripe,
 * steel chair rail, navy lower panels, black kick base, glossy steel floor.
 * Notice board and wanted posters on the left, the armory door and the alarm
 * beacon on the right, the lobby's frosted doors glowing at the far end.
 */
function stationBackground() {
  const VX = 800;
  const VY = 400;
  const FL = 760;
  const S = camera(VX, VY, FL);
  const W = 1.1;
  const C = -1.05;
  const F = 1;
  const NEAR = 0.7;
  const FAR = 7;
  const BAND = -0.62; // bottom of the dark band under the ceiling
  const RAIL = 0.12; // chair rail
  const KICK = 0.8; // rubber base
  const r = rng(77);
  const side = (X, z, Y) => sideFrame(VX, VY, FL, X, z, Y);

  const defs =
    SHADE_DEFS +
    `<linearGradient id="ceil" x1="0" y1="0" x2="0" y2="300" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#05070b"/><stop offset="1" stop-color="#1a212b"/></linearGradient>` +
    `<linearGradient id="floor" x1="0" y1="510" x2="0" y2="900" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2a3442"/><stop offset="0.3" stop-color="#18202c"/><stop offset="1" stop-color="#080b10"/></linearGradient>` +
    `<linearGradient id="paintL" x1="0" y1="0" x2="690" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2a2a28"/><stop offset="0.5" stop-color="#5e5d57"/><stop offset="1" stop-color="#9a988e"/></linearGradient>` +
    `<linearGradient id="paintR" x1="1600" y1="0" x2="910" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#232322"/><stop offset="0.5" stop-color="#55544e"/><stop offset="1" stop-color="#8e8c84"/></linearGradient>` +
    `<linearGradient id="navyL" x1="0" y1="0" x2="690" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#070d18"/><stop offset="0.5" stop-color="#14233e"/><stop offset="1" stop-color="#243c64"/></linearGradient>` +
    `<linearGradient id="navyR" x1="1600" y1="0" x2="910" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#060b15"/><stop offset="0.5" stop-color="#12203a"/><stop offset="1" stop-color="#20365c"/></linearGradient>` +
    `<linearGradient id="bandG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1f27"/><stop offset="1" stop-color="#3a424e"/></linearGradient>` +
    `<linearGradient id="diff" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d8e6f2"/></linearGradient>` +
    `<linearGradient id="frost" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4fbff"/><stop offset="0.5" stop-color="#bfe4f2"/><stop offset="1" stop-color="#5aa8c4"/></linearGradient>` +
    `<linearGradient id="cork" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c49a64"/><stop offset="1" stop-color="#7a5832"/></linearGradient>` +
    `<linearGradient id="poster" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0e8d0"/><stop offset="1" stop-color="#c8bc9a"/></linearGradient>` +
    `<linearGradient id="steelG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8dee6"/><stop offset="0.5" stop-color="#8c949e"/><stop offset="1" stop-color="#4a5058"/></linearGradient>` +
    `<linearGradient id="cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4e0" stop-opacity="0.16"/><stop offset="0.7" stop-color="#fff4e0" stop-opacity="0.03"/><stop offset="1" stop-color="#fff4e0" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="beamGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff4455" stop-opacity="0.9"/><stop offset="1" stop-color="#ff2a3a" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="fall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6e6" stop-opacity="0.12"/><stop offset="0.4" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/></linearGradient>` +
    fadeGrad("gTube", "#fff6e8", 0.6, 0.25) +
    fadeGrad("gPool", "#e8eef6", 0.34, 0.4) +
    fadeGrad("gStreak", "#f4f8ff", 0.5, 0.3) +
    fadeGrad("gDoor", "#bfeaff", 0.55, 0.3) +
    fadeGrad("gHaze", "#6a88a8", 0.18, 0.45) +
    fadeGrad("gRed", "#ff2a3a", 0.55, 0.25) +
    fadeGrad("gGreen", "#44ff88", 0.7, 0.25) +
    BG_BLUR("blur6", 6) +
    BG_BLUR("blur2", 2) +
    BG_BLUR("blur14", 14);

  // ── Shell ──
  let base = `<rect width="1600" height="900" fill="#05070b"/>`;
  base += poly(flatQuad(S, C, -W, W, NEAR, FAR), `fill="url(#ceil)"`);
  base += poly(flatQuad(S, F, -W, W, NEAR, FAR), `fill="url(#floor)"`);
  for (const [X, paint, navy] of [[-W, "paintL", "navyL"], [W, "paintR", "navyR"]]) {
    base += poly(wallQuad(S, X, C, BAND, NEAR, FAR), `fill="url(#bandG)"`);
    base += poly(wallQuad(S, X, BAND, RAIL, NEAR, FAR), `fill="url(#${paint})"`);
    base += poly(wallQuad(S, X, BAND, BAND + 0.012, NEAR, FAR), `fill="#d6aa3e" opacity="0.85"`);
    base += poly(wallQuad(S, X, BAND + 0.05, BAND + 0.09, NEAR, FAR), `fill="#2f5c9e"`);
    base += poly(wallQuad(S, X, RAIL, KICK, NEAR, FAR), `fill="url(#${navy})"`);
    base += poly(wallQuad(S, X, RAIL - 0.02, RAIL + 0.03, NEAR, FAR), `fill="url(#steelG)"`);
    base += seg(S(X, RAIL + 0.03, NEAR), S(X, RAIL + 0.03, FAR), `stroke="#000" stroke-width="2" opacity="0.5"`);
    base += poly(wallQuad(S, X, KICK, F, NEAR, FAR), `fill="#0d0f12"`);
    base += seg(S(X, KICK, NEAR), S(X, KICK, FAR), `stroke="#3a3e46" stroke-width="1.4"`);
    // Lower panel seams and their screw heads.
    for (let z = 1.0; z < FAR; z += 0.6) {
      base += seg(S(X, RAIL + 0.03, z), S(X, KICK, z), `stroke="#060a14" stroke-width="${n1(Math.max(0.7, 3 / z))}"`);
      base += seg(S(X, RAIL + 0.03, z + 0.012), S(X, KICK, z + 0.012), `stroke="#5a78a8" stroke-width="${n1(Math.max(0.5, 1.4 / z))}" opacity="0.35"`);
    }
    // Scuffs on the paint at trolley height.
    for (let i = 0; i < 10; i++) {
      const z = 1 + r() * 5;
      const y = -0.1 + r() * 0.15;
      base += poly(wallQuad(S, X, y, y + 0.006, z, z + 0.05 + r() * 0.2), `fill="#000" opacity="${n1(0.08 + r() * 0.1)}"`);
    }
    base += poly(wallQuad(S, X, BAND, KICK, NEAR, FAR), `fill="url(#fall)"`);
  }

  // Ceiling grid and troffers.
  for (const X of [-0.66, -0.22, 0.22, 0.66]) base += seg(S(X, C, NEAR), S(X, C, FAR), `stroke="#262e3a" stroke-width="1.6"`);
  for (let z = 0.9; z < FAR; z += 0.45) base += seg(S(-W, C, z), S(W, C, z), `stroke="#262e3a" stroke-width="${n1(Math.max(0.6, 2.4 / z))}"`);
  const TROFFERS = [];
  for (let z = 1.15; z < FAR - 0.4; z += 0.9) TROFFERS.push([-0.2, 0.2, z, z + 0.3]);
  for (const [a, b, z0, z1] of TROFFERS) {
    base += poly(flatQuad(S, C + 0.004, a - 0.025, b + 0.025, z0 - 0.04, z1 + 0.04), `fill="#0b0e13" stroke="${INK}" stroke-width="1"`);
    base += poly(flatQuad(S, C + 0.006, a, b, z0, z1), `fill="url(#diff)"`);
    base += seg(S(0, C + 0.006, z0), S(0, C + 0.006, z1), `stroke="#a8b8c8" stroke-width="${n1(Math.max(0.6, 2 / z0))}" opacity="0.7"`);
  }
  // Sprinkler main along the ceiling's right side.
  base += poly(wallQuad(S, 0.8, C + 0.02, C + 0.06, NEAR, FAR), `fill="#3a1414"`);
  base += poly(wallQuad(S, 0.8, C + 0.02, C + 0.03, NEAR, FAR), `fill="#8a4a44" opacity="0.5"`);

  // Floor: glossy steel tiles with dark seams and rivets.
  for (let X = -W; X < W - 0.01; X += 0.55) {
    for (let z = NEAR; z < FAR - 0.01; z += 0.55) {
      const v = r();
      base += poly(flatQuad(S, F, X + 0.008, X + 0.55 - 0.008, z + 0.008, Math.min(FAR, z + 0.55) - 0.008), `fill="${v < 0.3 ? "#222b38" : v < 0.7 ? "#1c2430" : "#171e29"}"`);
    }
  }
  for (const X of [-0.55, 0, 0.55]) base += seg(S(X, F, NEAR), S(X, F, FAR), `stroke="#06080c" stroke-width="2"`);
  for (let z = NEAR; z < FAR; z += 0.55) base += seg(S(-W, F, z), S(W, F, z), `stroke="#06080c" stroke-width="${n1(Math.max(0.6, 3 / z))}"`);

  // ── Far end: the lobby's frosted double doors, an EXIT sign over them ──
  base += poly(faceQuad(S, FAR, -W, W, C, BAND), `fill="#252b34"`);
  base += poly(faceQuad(S, FAR, -W, W, BAND, F), `fill="#8a887e"`);
  base += poly(faceQuad(S, FAR, -W, W, RAIL, F), `fill="#1a2a48"`);
  base += poly(faceQuad(S, FAR, -0.62, 0.62, -0.68, F), `fill="#1c2a34" stroke="${INK}" stroke-width="1.5"`);
  for (const [a, b] of [[-0.56, -0.03], [0.03, 0.56]]) {
    base += poly(faceQuad(S, FAR, a, b, -0.62, F), `fill="#2a3a46" stroke="${INK}" stroke-width="1"`);
    base += poly(faceQuad(S, FAR, a + 0.08, b - 0.08, -0.5, 0.25), `fill="url(#frost)"`);
    base += poly(faceQuad(S, FAR, a + 0.08, b - 0.08, 0.02, 0.04), `fill="#2a3a46"`);
  }
  base += poly(faceQuad(S, FAR, -0.24, 0.24, -0.9, -0.76), `fill="#0a1a10" stroke="${INK}" stroke-width="1"`);
  base += `<g transform="translate(${VX} ${n1(VY - 0.8 * FL / FAR)}) scale(${n1(FL / FAR * 100) / 100})"><text x="0" y="0" ${FONT} font-weight="900" font-size="0.1" text-anchor="middle" fill="#6aff9a">EXIT</text></g>`;

  // ── Left wall: notice board, wanted posters, fire point ──
  const XL = -W + 0.004;
  const board = [2.0, 2.75];
  base += poly(wallQuad(S, XL, -0.5, 0.0, board[0], board[1]), `fill="#2a1e14" stroke="${INK}" stroke-width="1.5"`);
  base += poly(wallQuad(S, XL, -0.47, -0.03, board[0] + 0.025, board[1] - 0.025), `fill="url(#cork)"`);
  const papers = [[2.08, 2.3, -0.44, -0.2, "#f4f2ea"], [2.34, 2.52, -0.42, -0.26, "#f6e68c"], [2.36, 2.62, -0.22, -0.06, "#e2ecf6"], [2.1, 2.28, -0.16, -0.05, "#f4f2ea"], [2.56, 2.7, -0.44, -0.3, "#f4c2b0"]];
  for (const [z0, z1, y0, y1, c] of papers) {
    base += poly(wallQuad(S, XL + 0.002, y0, y1, z0, z1), `fill="${c}"`);
    for (let k = 1; k < 4; k++) base += poly(wallQuad(S, XL + 0.003, lerp(y0, y1, k / 4.5), lerp(y0, y1, k / 4.5) + 0.008, z0 + 0.02, z1 - 0.03), `fill="#3a3a40" opacity="0.6"`);
    const [px, py] = S(XL, y0 + 0.01, (z0 + z1) / 2);
    base += `<circle cx="${n1(px)}" cy="${n1(py)}" r="${n1(5 / z0)}" fill="#c23a2a"/>`;
  }
  base += `<g transform="${side(XL, 2.375, -0.555)}"><text x="0" y="0.025" ${FONT} font-weight="900" font-size="0.07" text-anchor="middle" fill="#e8e4d8">NOTICES</text></g>`;
  // Three wanted posters.
  [[3.15, "V. KESSLER"], [3.55, "UNKNOWN"], [3.95, "T. MORALES"]].forEach(([z, name]) => {
    const z1 = z + 0.3;
    base += poly(wallQuad(S, XL, -0.48, -0.02, z, z1), `fill="url(#poster)" stroke="${INK}" stroke-width="1"`);
    base += poly(wallQuad(S, XL + 0.002, -0.46, -0.38, z + 0.02, z1 - 0.02), `fill="#b8221c"`);
    base += `<g transform="${side(XL, z + 0.15, -0.415)}"><text x="0" y="0.025" ${FONT} font-weight="900" font-size="0.06" text-anchor="middle" fill="#f8f0e0">WANTED</text></g>`;
    base += `<g transform="${side(XL, z + 0.15, -0.22)}"><circle cx="0" cy="-0.05" r="0.05" fill="#3a3a42"/><path d="M-0.1 0.08 C-0.1 0.0 -0.06 -0.01 0 -0.01 C0.06 -0.01 0.1 0 0.1 0.08Z" fill="#3a3a42"/></g>`;
    base += `<g transform="${side(XL, z + 0.15, -0.075)}"><text x="0" y="0.015" ${FONT} font-weight="800" font-size="0.04" text-anchor="middle" fill="#2a1a10">${name}</text></g>`;
  });
  // Fire point: red cabinet, extinguisher.
  base += poly(wallQuad(S, XL, -0.35, 0.05, 4.7, 4.95), `fill="#a01e14" stroke="${INK}" stroke-width="1"`);
  base += poly(wallQuad(S, XL + 0.002, -0.3, 0.0, 4.74, 4.91), `fill="#5a0c08"`);
  base += poly(wallQuad(S, XL + 0.003, -0.25, -0.02, 4.79, 4.86), `fill="#e8402a"`);

  // ── Right wall: armory door, its sign, the alarm beacon ──
  const XR = W - 0.004;
  const [dz0, dz1] = [2.3, 2.95];
  base += poly(wallQuad(S, XR, -0.72, F - 0.004, dz0 - 0.05, dz1 + 0.05), `fill="#1d8a96" stroke="${INK}" stroke-width="1.5"`);
  base += poly(wallQuad(S, XR - 0.002, -0.68, F - 0.004, dz0, dz1), `fill="#2a3038"`);
  base += poly(wallQuad(S, XR - 0.003, -0.6, -0.25, dz0 + 0.18, dz1 - 0.18), `fill="#9ed8e8" opacity="0.6"`);
  base += poly(wallQuad(S, XR - 0.003, -0.6, -0.25, lerp(dz0, dz1, 0.48), lerp(dz0, dz1, 0.52)), `fill="#1a2028"`);
  for (let k = 0; k < 7; k++) {
    const z0 = lerp(dz0, dz1, k / 7);
    base += poly([S(XR - 0.003, 0.82, z0), S(XR - 0.003, 0.82, z0 + 0.04), S(XR - 0.003, 0.92, z0 + 0.08), S(XR - 0.003, 0.92, z0 + 0.04)], `fill="#e8b23a" opacity="0.85"`);
  }
  base += poly(wallQuad(S, XR - 0.003, 0.05, 0.12, dz0 + 0.04, dz0 + 0.1), `fill="url(#steelG)"`);
  base += poly(wallQuad(S, XR, -0.92, -0.78, dz0 - 0.02, dz1 + 0.02), `fill="#22385e" stroke="${INK}" stroke-width="1"`);
  base += `<g transform="${side(XR, (dz0 + dz1) / 2, -0.85)}"><text x="0" y="0.035" ${FONT} font-weight="900" font-size="0.09" text-anchor="middle" fill="#f2f2ee">ARMORY</text></g>`;
  // Keypad beside the door.
  base += poly(wallQuad(S, XR, -0.15, 0.05, dz1 + 0.1, dz1 + 0.18), `fill="#1a1e24" stroke="${INK}" stroke-width="1"`);
  // Second door further down, then a crest plate.
  base += poly(wallQuad(S, XR, -0.7, F - 0.004, 4.3, 4.75), `fill="#1d8a96" stroke="${INK}" stroke-width="1"`);
  base += poly(wallQuad(S, XR - 0.002, -0.66, F - 0.004, 4.33, 4.72), `fill="#2a3038"`);
  base += poly(wallQuad(S, XR, -0.5, -0.1, 3.4, 3.8), `fill="#14243e" stroke="#d8b25a" stroke-width="1.5"`);
  base += `<g transform="${side(XR, 3.6, -0.3)}"><path d="M-0.09 -0.12 L0.09 -0.12 L0.09 0.02 C0.09 0.09 0.03 0.13 0 0.15 C-0.03 0.13 -0.09 0.09 -0.09 0.02Z" fill="#d8b25a"/><path d="M-0.06 -0.09 L0.06 -0.09 L0.06 0.02 C0.06 0.07 0.02 0.1 0 0.11 C-0.02 0.1 -0.06 0.07 -0.06 0.02Z" fill="#22385e"/><circle cx="0" cy="0" r="0.03" fill="#d8b25a"/></g>`;

  // Hanging wayfinding sign mid-corridor.
  const signZ = 3.3;
  for (const X of [-0.3, 0.3]) base += seg(S(X, C, signZ), S(X, -0.9, signZ), `stroke="#1a2028" stroke-width="2"`);
  base += poly(faceQuad(S, signZ, -0.42, 0.42, -0.9, -0.74), `fill="#22385e" stroke="${INK}" stroke-width="1.5"`);
  base += `<g transform="translate(${VX} ${n1(VY - 0.82 * FL / signZ)}) scale(${n1(FL / signZ * 100) / 100})"><text x="-0.05" y="0.03" ${FONT} font-weight="900" font-size="0.07" text-anchor="middle" fill="#f2f2ee">LOBBY · BRIEFING</text><path d="M0.31 -0.03 L0.37 0 L0.31 0.03" fill="none" stroke="#d6aa3e" stroke-width="0.016"/></g>`;

  // Alarm beacon housing (right wall, high).
  const beaconZ = 1.7;
  const [bx, by] = S(W, -0.75, beaconZ);
  base += `<rect x="${n1(bx - 26)}" y="${n1(by - 4)}" width="22" height="34" rx="3" fill="#141e2a" stroke="${INK}" stroke-width="1.5"/>`;
  base += `<path d="M ${n1(bx - 34)} ${n1(by + 6)} A 19 22 0 0 1 ${n1(bx + 4)} ${n1(by + 6)} Z" fill="#5a0d14" stroke="${INK}" stroke-width="1.5"/>`;
  base += `<path d="M ${n1(bx - 27)} ${n1(by - 6)} A 12 11 0 0 1 ${n1(bx - 13)} ${n1(by - 12)}" fill="none" stroke="#ff8a90" stroke-width="2" opacity="0.6"/>`;
  base += `<rect x="${n1(bx - 38)}" y="${n1(by + 6)}" width="46" height="7" rx="1" fill="#1c2733" stroke="${INK}" stroke-width="1.2"/>`;
  const [ox, oy] = [bx - 15, by - 4];

  // ── Light ──
  const tube = ([a, b, z0, z1], k = 1) => {
    const zc = (z0 + z1) / 2;
    const [cx, cy] = S(0, C, zc);
    const s = FL / zc;
    let m = bloom(cx, cy + 3, (b - a) * s * 1.4, (z1 - z0) * s * 0.35 + 6, "gTube", k);
    const [px, py] = S(0, F, zc + 0.15);
    m += bloom(px, py, s * 0.6, s * 0.08, "gPool", k);
    // Its reflection in the glossy floor.
    const [rx, ry] = S(0, 2 * F - C, zc);
    if (ry < 900) m += bloom(rx, ry, s * 0.12, s * 0.5, "gStreak", 0.7 * k);
    return m;
  };
  const FLICK = 1;
  const cone = ([a, b, z0, z1]) => poly([S(a, C + 0.01, z0), S(b, C + 0.01, z0), S(b + 0.3, F, z1 + 0.2), S(a - 0.3, F, z1 + 0.2)], `fill="url(#cone)"`);
  let lights = `<g filter="url(#blur14)">${TROFFERS.filter((_, i) => i !== FLICK).map(cone).join("")}</g>`;
  lights += TROFFERS.filter((_, i) => i !== FLICK).map((t) => tube(t)).join("");
  // Paint lit by the tubes: soft vertical washes down both walls.
  TROFFERS.forEach(([, , z0, z1]) => {
    const zc = (z0 + z1) / 2;
    for (const X of [-W, W]) {
      const [wx, wy] = S(X, -0.3, zc);
      lights += bloom(wx, wy, 34 * (FL / zc) / 300, 140 * (FL / zc) / 300, "gPool", 0.35);
    }
  });
  // The lobby's daylight through the frosted doors, and its spill on the floor.
  lights += bloom(VX, S(0, -0.1, FAR)[1], 150, 120, "gDoor", 0.9);
  lights += poly(faceQuad(S, FAR, -0.48, 0.48, -0.5, 0.25), `fill="#ffffff" opacity="0.3" filter="url(#blur6)"`);
  lights += bloom(VX, S(0, F, FAR - 0.6)[1], 160, 26, "gDoor", 0.8);
  lights += bloom(VX, 690, 50, 180, "gStreak", 0.35);
  const flicker = tube(TROFFERS[FLICK]) + `<g filter="url(#blur14)">${cone(TROFFERS[FLICK])}</g>` + poly(flatQuad(S, C + 0.006, -0.2, 0.2, TROFFERS[FLICK][2], TROFFERS[FLICK][3]), `fill="#ffffff"`);

  // Atmospheric haze, thicker toward the far end.
  const haze =
    bloom(800, 400, 360, 200, "gHaze") +
    bloom(800, 380, 700, 160, "gHaze", 0.7) +
    bloom(500, 520, 420, 100, "gHaze", 0.5) +
    bloom(1150, 330, 380, 120, "gHaze", 0.5);

  // EXIT sign glow and small status lights.
  const [ex, ey] = S(0, -0.83, FAR);
  const dot = (X, Y, z, color, size = 1) => {
    const [x, y] = S(X, Y, z);
    const rr = (9 / z) * size;
    return `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(rr * 3.5)}" fill="${color}" opacity="0.3" filter="url(#blur2)"/>` +
      `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(Math.max(1, rr))}" fill="${color}"/>`;
  };
  const indA = bloom(ex, ey, 70, 26, "gGreen", 0.8) + dot(XR, -0.08, dz1 + 0.14, "#44ff99", 1.2);
  const indB = dot(XR, -0.02, dz1 + 0.14, "#ff3344", 1.1) + dot(XR, -0.05, 4.8, "#ffaa44", 1);

  const wash = bloom(ox, oy, 360, 260, "gRed", 0.5) + bloom(ox, oy, 40, 34, "gRed") +
    `<circle cx="${n1(ox)}" cy="${n1(oy)}" r="7" fill="#ff8a90"/>`;
  const BL = 620;
  const beam = `<g filter="url(#blur6)">` +
    poly([[ox, oy], [ox + BL, oy - 100], [ox + BL, oy + 100]], `fill="url(#beamGrad)"`) +
    `<g transform="rotate(180 ${n1(ox)} ${n1(oy)})">` +
    poly([[ox, oy], [ox + BL, oy - 100], [ox + BL, oy + 100]], `fill="url(#beamGrad)"`) +
    `</g></g>`;

  return {
    box: [0, 0, 1600, 900],
    defs,
    layers: [
      { markup: base },
      { markup: haze, anim: { type: "drift", amp: 40, speed: 0.12 }, blend: "screen", opacity: 0.7 },
      { markup: lights, blend: "lighter", opacity: 0.8 },
      { markup: flicker, anim: { type: "flicker", min: 0.15, max: 1, speed: 0.8 }, blend: "lighter" },
      { markup: indA, anim: { type: "flicker", min: 0.6, max: 1, speed: 1.7 }, blend: "lighter" },
      { markup: indB, anim: { type: "flicker", min: 0.1, max: 1, speed: 1.1, phase: 2.3 }, blend: "lighter" },
      { markup: wash, anim: { type: "pulse", min: 0.15, max: 0.8, speed: 5 }, blend: "lighter" },
      { markup: beam, anim: { type: "spin", speed: 2.5, pivot: [n1(ox), n1(oy)] }, blend: "lighter", opacity: 0.4 },
      shadeLayer(),
    ],
  };
}

// ── Locker room background ──────────────────────────────────────────────────

/**
 * Local affine frame on a side wall (constant X) around (z, Y): maps local
 * (dz, dY) world offsets to the screen, so small details (name cards, text,
 * handles) can be drawn flat and still sit in the wall's perspective.
 */
const sideFrame = (vx, vy, f, X, z, Y) => {
  // Text runs toward the vanishing point on the left wall, away from it on the right.
  const s = X < 0 ? 1 : -1;
  const q = (v) => n1(v * 100) / 100;
  return `matrix(${q((-s * X * f) / (z * z))} ${q((-s * Y * f) / (z * z))} 0 ${q(f / z)} ${n1(vx + (X * f) / z)} ${n1(vy + (Y * f) / z)})`;
};

const FONT = `font-family="Arial, Helvetica, sans-serif"`;

/** One navy locker door in world units, top-left (x, y), w × h: louvres, name card, number, handle, dial. */
function navyDoor(x, y, w, h, name, num, r, o = {}) {
  const s = w / 0.32; // detail scale relative to a standard door
  let m = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#lkDoor)" stroke="${INK}" stroke-width="${0.005 * s}"/>`;
  // Pressed-steel bevel: lit top/left edge, shadowed bottom/right.
  m += `<path d="M${x + 0.006} ${y + h - 0.006}V${y + 0.006}H${x + w - 0.006}" fill="none" stroke="#7d9cc8" stroke-width="${0.004 * s}" opacity="0.55"/>`;
  m += `<path d="M${x + w - 0.006} ${y + 0.008}V${y + h - 0.006}H${x + 0.008}" fill="none" stroke="#050912" stroke-width="${0.005 * s}" opacity="0.7"/>`;
  // Louvres, top and bottom.
  for (const [ly, n] of [[y + 0.05 * s, 6], [y + h - 0.17 * s, 5]]) {
    for (let i = 0; i < n; i++) {
      const yy = ly + i * 0.024 * s;
      m += `<rect x="${x + w * 0.22}" y="${n1(yy * 1000) / 1000}" width="${w * 0.56}" height="${0.009 * s}" fill="#060a14"/>`;
      m += `<rect x="${x + w * 0.22}" y="${n1((yy + 0.009 * s) * 1000) / 1000}" width="${w * 0.56}" height="${0.003 * s}" fill="#9bb6dc" opacity="0.32"/>`;
    }
  }
  // Name card in a brass holder, locker number under it.
  const cy = y + 0.25 * s;
  m += `<rect x="${x + w * 0.15}" y="${cy - 0.036 * s}" width="${w * 0.7}" height="${0.07 * s}" fill="url(#lkBrass)" stroke="${INK}" stroke-width="${0.003 * s}"/>`;
  m += `<rect x="${x + w * 0.175}" y="${cy - 0.027 * s}" width="${w * 0.65}" height="${0.052 * s}" fill="#ebe4d2"/>`;
  m += `<text x="${x + w / 2}" y="${cy + 0.013 * s}" ${FONT} font-weight="900" font-size="${(name.length > 7 ? 0.034 : 0.04) * s}" text-anchor="middle" fill="#141820">${name}</text>`;
  m += `<text x="${x + w / 2}" y="${cy + 0.08 * s}" ${FONT} font-weight="700" font-size="${0.03 * s}" text-anchor="middle" fill="#a8bcd8" opacity="0.8">${num}</text>`;
  // Recessed pull handle and the combination dial on the latch side.
  const hx = x + w - 0.075 * s;
  m += `<rect x="${hx}" y="${y + 0.4 * s}" width="${0.032 * s}" height="${0.19 * s}" rx="${0.006 * s}" fill="#05080f"/>`;
  m += `<rect x="${hx + 0.006 * s}" y="${y + 0.405 * s}" width="${0.02 * s}" height="${0.18 * s}" fill="url(#lkSteel)"/>`;
  m += `<circle cx="${hx + 0.016 * s}" cy="${y + 0.64 * s}" r="${0.018 * s}" fill="url(#lkDial)" stroke="${INK}" stroke-width="${0.003 * s}"/>`;
  // Boot scuffs low on the door.
  for (let i = 0; i < 4; i++) {
    m += `<rect x="${n1((x + 0.02 + r() * (w - 0.1)) * 1000) / 1000}" y="${n1((y + h - 0.2 + r() * 0.16) * 1000) / 1000}" width="${n1((0.02 + r() * 0.05) * 1000) / 1000}" height="0.003" fill="#c8d8f0" opacity="${n1(0.08 + r() * 0.1)}"/>`;
  }
  if (o.note) {
    m += `<g transform="translate(${x + w * 0.42} ${y + 0.52 * s}) rotate(5)"><rect x="-0.045" y="-0.04" width="0.09" height="0.08" fill="#f2e07e"/>` +
      `<rect x="-0.045" y="0.03" width="0.09" height="0.01" fill="#000" opacity="0.12"/>` +
      `<text x="0" y="0.004" ${FONT} font-weight="700" font-size="0.017" text-anchor="middle" fill="#1a2440">${o.note}</text></g>`;
  }
  if (o.sticker) m += `<circle cx="${x + w * 0.4}" cy="${y + 0.56 * s}" r="${0.03 * s}" fill="${o.sticker}" stroke="#f0f0f0" stroke-width="${0.006 * s}"/>`;
  if (o.photo) {
    m += `<g transform="translate(${x + w * 0.42} ${y + 0.55 * s}) rotate(-4)"><rect x="-0.04" y="-0.05" width="0.08" height="0.1" fill="#e8e4da"/>` +
      `<rect x="-0.032" y="-0.042" width="0.064" height="0.066" fill="${o.photo}"/><circle cx="0" cy="-0.016" r="0.014" fill="#1c2638" opacity="0.7"/></g>`;
  }
  if (o.rnd) {
    m += `<g transform="translate(${x + w * 0.42} ${y + 0.5 * s}) rotate(-5)"><rect x="-0.07" y="-0.034" width="0.14" height="0.068" fill="#f2d64a"/>` +
      `<rect x="-0.07" y="-0.034" width="0.14" height="0.016" fill="#1a1a1a"/>` +
      `<text x="0" y="0.024" ${FONT} font-weight="900" font-size="0.034" text-anchor="middle" fill="#1a1a1a">R&amp;D</text></g>`;
  }
  return m;
}

/** An open locker's interior (world units): back wall, shelf, a uniform on its hanger, boots, a taped photo. */
function lockerInside(x, y, w, h, kit) {
  let m = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#lkInside)" stroke="${INK}" stroke-width="0.005"/>`;
  m += `<rect x="${x}" y="${y + 0.16}" width="${w}" height="0.018" fill="#2a3a56"/><rect x="${x}" y="${y + 0.178}" width="${w}" height="0.01" fill="#000" opacity="0.5"/>`;
  m += `<rect x="${x + 0.03}" y="${y + 0.09}" width="0.1" height="0.07" rx="0.01" fill="${kit.cap || "#1c2a48"}"/>`;
  const cx = x + w / 2;
  const ty = y + 0.22;
  m += `<path d="M${cx} ${ty}v0.025M${cx - 0.08} ${ty + 0.06}L${cx} ${ty + 0.025}L${cx + 0.08} ${ty + 0.06}" fill="none" stroke="#8a96a8" stroke-width="0.006"/>`;
  m += `<path d="M${cx - 0.1} ${ty + 0.07}L${cx - 0.03} ${ty + 0.035}L${cx + 0.03} ${ty + 0.035}L${cx + 0.1} ${ty + 0.07}L${cx + 0.09} ${ty + 0.5}L${cx - 0.09} ${ty + 0.5}Z" fill="${kit.shirt || "#22385e"}" stroke="${INK}" stroke-width="0.004"/>`;
  m += `<path d="M${cx} ${ty + 0.04}V${ty + 0.5}" stroke="#0a1220" stroke-width="0.004"/>`;
  m += `<rect x="${cx + 0.025}" y="${ty + 0.11}" width="0.04" height="0.03" fill="#d8b25a" opacity="0.8"/>`;
  m += `<path d="M${cx - 0.1} ${ty + 0.07}L${cx - 0.13} ${ty + 0.3}L${cx - 0.09} ${ty + 0.3}" fill="${kit.shirt || "#22385e"}" stroke="${INK}" stroke-width="0.004"/>`;
  m += `<rect x="${x + 0.04}" y="${y + h - 0.1}" width="0.09" height="0.09" rx="0.012" fill="#0b0d12"/><rect x="${x + 0.14}" y="${y + h - 0.1}" width="0.09" height="0.09" rx="0.012" fill="#0e1016"/>`;
  if (kit.photo) m += `<g transform="translate(${x + w - 0.06} ${y + 0.3}) rotate(6)"><rect x="-0.035" y="-0.045" width="0.07" height="0.09" fill="#e4e0d4"/><rect x="-0.028" y="-0.038" width="0.056" height="0.06" fill="${kit.photo}"/></g>`;
  // Inside shadow cast by the cabinet's own top and hinge side.
  m += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#lkInShade)"/>`;
  return m;
}

function lockerRoomBackground() {
  const VX = 800;
  const VY = 430;
  const FL = 700;
  const L = camera(VX, VY, FL);
  const W = 1.3;
  const C = -1;
  const F = 1;
  const NEAR = 0.9;
  const FAR = 2.4;
  const TOP = -0.42; // top of the locker banks (~2.1 m of a 3 m wall)
  const BASE = 0.9; // plinth
  const K = FL / FAR;
  const r = rng(412);

  const defs =
    SHADE_DEFS +
    `<linearGradient id="lCeil" x1="0" y1="0" x2="0" y2="160" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#05080d"/><stop offset="1" stop-color="#151c26"/></linearGradient>` +
    `<linearGradient id="lFloor" x1="0" y1="722" x2="0" y2="900" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#222c3c"/><stop offset="0.5" stop-color="#161e2b"/><stop offset="1" stop-color="#0a0e15"/></linearGradient>` +
    `<linearGradient id="lkDoor" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="#46639a"/><stop offset="0.3" stop-color="#2f4a78"/><stop offset="0.75" stop-color="#1e3054"/><stop offset="1" stop-color="#121e36"/></linearGradient>` +
    `<linearGradient id="lkSide" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#121d34"/><stop offset="1" stop-color="#2c4674"/></linearGradient>` +
    `<linearGradient id="lkSideR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#0e182c"/><stop offset="1" stop-color="#28406a"/></linearGradient>` +
    `<linearGradient id="lkBrass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9b866"/><stop offset="0.5" stop-color="#8a6a2a"/><stop offset="1" stop-color="#4a3612"/></linearGradient>` +
    `<linearGradient id="lkSteel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c8d4e4"/><stop offset="0.4" stop-color="#7a8aa0"/><stop offset="1" stop-color="#3a4658"/></linearGradient>` +
    `<radialGradient id="lkDial" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#e2e8f0"/><stop offset="0.5" stop-color="#7a8698"/><stop offset="1" stop-color="#1a2030"/></radialGradient>` +
    `<linearGradient id="lkInside" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#18233a"/><stop offset="1" stop-color="#0a101c"/></linearGradient>` +
    `<linearGradient id="lkInShade" x1="0" y1="0" x2="1" y2="0.4"><stop offset="0" stop-color="#000" stop-opacity="0.75"/><stop offset="0.4" stop-color="#000" stop-opacity="0.2"/><stop offset="1" stop-color="#000" stop-opacity="0.05"/></linearGradient>` +
    `<linearGradient id="lkBand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#181d24"/><stop offset="0.55" stop-color="#262d36"/><stop offset="1" stop-color="#323b46"/></linearGradient>` +
    // Overhead light falling down the lockers: lit caps, darker toward the plinth.
    `<linearGradient id="lkFall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfeaff" stop-opacity="0.14"/><stop offset="0.35" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.5"/></linearGradient>` +
    `<linearGradient id="lkRefl" x1="0" y1="722" x2="0" y2="900" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0.5"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<mask id="lkReflM" maskUnits="userSpaceOnUse" x="0" y="700" width="1600" height="200"><rect x="0" y="722" width="1600" height="178" fill="url(#lkRefl)"/></mask>` +
    `<linearGradient id="inside" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9ff8ff"/><stop offset="0.35" stop-color="#2bc8e2"/><stop offset="1" stop-color="#05303c"/></linearGradient>` +
    `<linearGradient id="doorOpen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a2a48"/><stop offset="0.85" stop-color="#2e4a78"/><stop offset="1" stop-color="#8ee8f4"/></linearGradient>` +
    `<linearGradient id="lkWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0b866"/><stop offset="1" stop-color="#a87c3a"/></linearGradient>` +
    `<linearGradient id="cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6f2ff" stop-opacity="0.16"/><stop offset="0.6" stop-color="#e6f2ff" stop-opacity="0.035"/><stop offset="1" stop-color="#e6f2ff" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="spill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22e6ff" stop-opacity="0.5"/><stop offset="1" stop-color="#22e6ff" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="lkDiff" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfe2f4"/></linearGradient>` +
    fadeGrad("gTube", "#e8f4ff", 0.6, 0.25) +
    fadeGrad("gPool", "#c8dcf4", 0.4, 0.4) +
    fadeGrad("gCyan", "#22e6ff", 0.55, 0.3) +
    fadeGrad("gHaze", "#5a7ea4", 0.18, 0.45) +
    fadeGrad("gAmber", "#ffb24a", 0.7, 0.25) +
    BG_BLUR("blur2", 2) +
    BG_BLUR("blur5", 5) +
    BG_BLUR("blur14", 14);

  // ── Shell: ceiling, floor, walls ──
  let base = `<rect width="1600" height="900" fill="#05080d"/>`;
  base += poly(flatQuad(L, C, -W, W, NEAR, FAR), `fill="url(#lCeil)"`);
  base += poly(flatQuad(L, F, -W, W, NEAR, FAR), `fill="url(#lFloor)"`);
  base += poly(wallQuad(L, -W, C, F, NEAR, FAR), `fill="#0c121c"`);
  base += poly(wallQuad(L, W, C, F, NEAR, FAR), `fill="#0a1019"`);

  // Ceiling: acoustic tile grid and recessed troffers (three rows).
  for (let X = -1.2; X <= 1.21; X += 0.4) base += seg(L(X, C, NEAR), L(X, C, FAR), `stroke="#232c38" stroke-width="2"`);
  for (let z = 1.0; z < FAR; z += 0.3) base += seg(L(-W, C, z), L(W, C, z), `stroke="#232c38" stroke-width="${n1(2.4 / z)}"`);
  const TROFFERS = [];
  for (const z of [1.72, 2.12]) for (const [a, b] of [[-1.15, -0.45], [-0.32, 0.32], [0.45, 1.15]]) TROFFERS.push([a, b, z]);
  for (const [a, b, z] of TROFFERS) {
    base += poly(flatQuad(L, C + 0.003, a - 0.03, b + 0.03, z - 0.03, z + 0.13), `fill="#0a0e14" stroke="${INK}" stroke-width="1"`);
    base += poly(flatQuad(L, C + 0.005, a, b, z, z + 0.1), `fill="url(#lkDiff)"`);
    for (let k = 1; k < 4; k++) base += seg(L(lerp(a, b, k / 4), C + 0.005, z), L(lerp(a, b, k / 4), C + 0.005, z + 0.1), `stroke="#9fb2c8" stroke-width="1" opacity="0.6"`);
  }
  // A ceiling vent and a sprinkler head or two.
  base += poly(flatQuad(L, C + 0.004, -0.15, 0.15, 2.18, 2.3), `fill="#10161e" stroke="#2a3442" stroke-width="1"`);
  for (let i = 1; i < 6; i++) base += seg(L(-0.14, C + 0.004, 2.18 + i * 0.02), L(0.14, C + 0.004, 2.18 + i * 0.02), `stroke="#05080c" stroke-width="1.2"`);

  // Floor: dark steel tiles, each a slightly different tone, with worn seams.
  for (let X = -W; X < W - 0.01; X += 0.4) {
    for (let z = NEAR; z < FAR - 0.01; z += 0.3) {
      const v = r();
      base += poly(flatQuad(L, F, X + 0.006, Math.min(W, X + 0.4) - 0.006, z + 0.006, Math.min(FAR, z + 0.3) - 0.006), `fill="${v < 0.3 ? "#232d3e" : v < 0.7 ? "#1d2534" : "#18202d"}"`);
    }
  }
  for (let X = -1.3; X <= 1.31; X += 0.4) base += seg(L(X, F, NEAR), L(X, F, FAR), `stroke="#070a10" stroke-width="2"`);
  for (let z = NEAR; z <= FAR; z += 0.3) base += seg(L(-W, F, z), L(W, F, z), `stroke="#070a10" stroke-width="${n1(3 / z)}"`);
  // Tread plates: rivets at the tile corners.
  for (let X = -0.9; X <= 0.91; X += 0.4) for (let z = 1.2; z < FAR; z += 0.3) {
    const [x, y] = L(X, F, z);
    base += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(3 / z)}" fill="#2c3646"/>`;
  }

  // ── Far wall: wall-above band, then a bank of eight navy lockers ──
  let far = `<g transform="translate(${VX} ${VY}) scale(${n1(K * 100) / 100})">`;
  far += `<rect x="${-W}" y="${C}" width="${2 * W}" height="${TOP - C}" fill="url(#lkBand)"/>`;
  far += `<rect x="${-W}" y="-0.9" width="${2 * W}" height="0.022" fill="#1a2028"/><rect x="${-W}" y="-0.878" width="${2 * W}" height="0.005" fill="#fff" opacity="0.08"/>`;
  for (let i = 0; i < 12; i++) far += `<rect x="${n1((-W + r() * 2.5) * 1000) / 1000}" y="${n1((-0.85 + r() * 0.35) * 1000) / 1000}" width="${n1((0.01 + r() * 0.12) * 1000) / 1000}" height="0.004" fill="#000" opacity="${n1(0.08 + r() * 0.12)}"/>`;
  far += `<text x="0.62" y="-0.6" ${FONT} font-weight="900" font-size="0.085" letter-spacing="0.02" text-anchor="middle" fill="#8a96a4" opacity="0.2">UNIT 4</text>`;
  far += `<text x="-0.62" y="-0.6" ${FONT} font-weight="900" font-size="0.085" letter-spacing="0.02" text-anchor="middle" fill="#8a96a4" opacity="0.2">UNIT 4</text>`;
  // Water stain running down from the vent line.
  far += `<path d="M-0.95 -0.9 C-0.94 -0.78 -0.97 -0.66 -0.95 -0.48 L-0.91 -0.48 C-0.92 -0.66 -0.9 -0.78 -0.9 -0.9Z" fill="#000" opacity="0.12"/>`;
  far += `<rect x="${-W}" y="${TOP - 0.02}" width="${2 * W}" height="0.02" fill="#000" opacity="0.5"/>`;
  far += `<rect x="${-W}" y="${TOP}" width="${2 * W}" height="0.04" fill="#2f4a78" stroke="${INK}" stroke-width="0.005"/><rect x="${-W}" y="${TOP}" width="${2 * W}" height="0.006" fill="#9ab8e4" opacity="0.5"/>`;
  const LW = (2 * W) / 8;
  const doorY = TOP + 0.04;
  const doorH = BASE - doorY;
  const BANK = [
    ["RASCZAK", 401, { note: "BRIEF 0600" }],
    ["11235", 412, { rnd: true, ajar: true }],
    ["KAEL", 402, { open: { shirt: "#22385e", photo: "#7aa0c8" } }],
    ["OKAFOR", 403, { sticker: "#c23a3a" }],
    ["LINDQVIST", 404, {}],
    ["DUARTE", 405, { open: { shirt: "#3a3a32", cap: "#2a2a24" } }],
    ["MBEKI", 406, { photo: "#7aa0c8" }],
    ["PRICE", 407, { note: "OWE U 1" }],
  ];
  BANK.forEach(([name, num, o], i) => {
    const x = -W + i * LW + 0.008;
    const w = LW - 0.016;
    if (o.open) far += lockerInside(x, doorY, w, doorH, o.open);
    else if (o.ajar) far += `<rect x="${x}" y="${doorY}" width="${w}" height="${doorH}" fill="url(#inside)" stroke="${INK}" stroke-width="0.005"/>`;
    else far += navyDoor(x, doorY, w, doorH, name, num, r, o);
    // Brass name rail along the cap.
    far += `<rect x="${x + w * 0.3}" y="${TOP + 0.01}" width="${w * 0.4}" height="0.02" fill="url(#lkBrass)" opacity="0.8"/>`;
  });
  // The ajar locker: a suit on its hook, backlit.
  {
    const x = -W + LW + 0.008;
    const cx = x + (LW - 0.016) * 0.58;
    far += `<path d="M${cx} ${doorY + 0.12}v0.04" stroke="#021219" stroke-width="0.008"/>`;
    far += `<path d="M${cx - 0.11} ${doorY + 0.22} Q${cx} ${doorY + 0.13} ${cx + 0.11} ${doorY + 0.22} L${cx + 0.1} ${doorY + 0.95} L${cx + 0.03} ${doorY + 0.92} L${cx} ${doorY + 0.5} L${cx - 0.03} ${doorY + 0.92} L${cx - 0.1} ${doorY + 0.95} Z" fill="#031a22" opacity="0.88"/>`;
    far += `<rect x="${x}" y="${doorY + 0.16}" width="${LW - 0.016}" height="0.016" fill="#063040"/>`;
  }
  far += `<rect x="${-W}" y="${doorY}" width="${2 * W}" height="${doorH}" fill="url(#lkFall)"/>`;
  far += `<rect x="${-W}" y="${BASE}" width="${2 * W}" height="${F - BASE}" fill="#14171d" stroke="${INK}" stroke-width="0.005"/><rect x="${-W}" y="${BASE}" width="${2 * W}" height="0.006" fill="#6a7484" opacity="0.5"/>`;
  far += `</g>`;
  // Swung-open doors of the two open lockers (hinged on their left edge, swung ~80° toward the viewer).
  const swung = (i, ang, grad) => {
    const ha = -W + i * LW + 0.008;
    const w = LW - 0.016;
    const fx = ha + w * Math.cos(ang) * 0.92;
    const fz = FAR - w * Math.sin(ang) * 0.92;
    let s = poly([L(ha, doorY, FAR), L(fx, doorY, fz), L(fx, BASE - 0.005, fz), L(ha, BASE - 0.005, FAR)], `fill="url(#${grad})" stroke="${INK}" stroke-width="1.3"`);
    for (let j = 0; j < 6; j++) {
      const y = doorY + 0.05 + j * 0.024;
      s += poly([L(lerp(ha, fx, 0.25), y, lerp(FAR, fz, 0.25)), L(lerp(ha, fx, 0.75), y, lerp(FAR, fz, 0.75)), L(lerp(ha, fx, 0.75), y + 0.009, lerp(FAR, fz, 0.75)), L(lerp(ha, fx, 0.25), y + 0.009, lerp(FAR, fz, 0.25))], `fill="#060a14"`);
    }
    return s;
  };
  far += swung(2, 1.25, "lkSideR") + swung(5, 1.3, "lkSideR") + swung(1, 0.95, "doorOpen");
  // R&D tag on the ajar door's face, seen at an angle.
  {
    const ha = -W + LW + 0.008;
    const w = LW - 0.016;
    const p = (t, Y) => L(ha + w * Math.cos(0.95) * 0.92 * t, Y, FAR - w * Math.sin(0.95) * 0.92 * t);
    far += poly([p(0.25, 0.02), p(0.75, 0.02), p(0.75, 0.09), p(0.25, 0.09)], `fill="#f2d64a" opacity="0.9"`);
    far += poly([p(0.25, 0.02), p(0.75, 0.02), p(0.75, 0.036), p(0.25, 0.036)], `fill="#1a1a1a"`);
  }

  // ── Side walls: the same banks running toward the camera ──
  let side = "";
  const SIDE_NAMES = ["TANAKA", "ABARA", "REYES", "HALE"];
  for (const [X, grad] of [[-W, "lkSide"], [W, "lkSideR"]]) {
    side += poly(wallQuad(L, X, C, TOP, NEAR, FAR), `fill="url(#lkBand)"`);
    side += poly(wallQuad(L, X, -0.9, -0.878, NEAR, FAR), `fill="#1a2028"`);
    side += poly(wallQuad(L, X, TOP, TOP + 0.04, NEAR, FAR), `fill="#2f4a78" stroke="${INK}" stroke-width="1"`);
    side += poly(wallQuad(L, X, BASE, F, NEAR, FAR), `fill="#111419"`);
    side += seg(L(X, BASE, NEAR), L(X, BASE, FAR), `stroke="#6a7484" stroke-width="1.2" opacity="0.4"`);
    let i = 0;
    for (let z = FAR - 0.32; z > NEAR + 0.05; z -= 0.32, i++) {
      const a = z + 0.008;
      const b = z + 0.312;
      // A door into the corridor on the right wall, teal frame and hazard foot.
      if (X > 0 && i === 1) {
        side += poly(wallQuad(L, X, doorY - 0.06, BASE, a - 0.04, b + 0.04), `fill="#1d8a96" stroke="${INK}" stroke-width="1.5"`);
        side += poly(wallQuad(L, X, doorY - 0.03, BASE, a - 0.01, b + 0.01), `fill="#1a1e24"`);
        side += poly(wallQuad(L, X, doorY - 0.03, BASE, (a + b) / 2 - 0.004, (a + b) / 2 + 0.004), `fill="#050608"`);
        for (let k = 0; k < 6; k++) {
          const z0 = lerp(a, b, k / 6);
          side += poly([L(X, 0.72, z0), L(X, 0.72, z0 + 0.025), L(X, 0.8, z0 + 0.05), L(X, 0.8, z0 + 0.025)], `fill="#e8b23a" opacity="0.85"`);
        }
        side += poly(wallQuad(L, X, -0.12, 0.02, (a + b) / 2 - 0.05, (a + b) / 2 - 0.012), `fill="#2a3442" opacity="0.8"`);
        continue;
      }
      side += poly(wallQuad(L, X, doorY, BASE - 0.005, a, b), `fill="url(#${grad})" stroke="${INK}" stroke-width="1.2"`);
      for (const [ly, n] of [[doorY + 0.05, 6], [BASE - 0.17, 5]]) {
        for (let j = 0; j < n; j++) {
          const y = ly + j * 0.024;
          side += poly(wallQuad(L, X, y, y + 0.009, lerp(a, b, 0.22), lerp(a, b, 0.78)), `fill="#060a14"`);
        }
      }
      const zc = (a + b) / 2;
      const nm = SIDE_NAMES[i % SIDE_NAMES.length];
      side += `<g transform="${sideFrame(VX, VY, FL, X, zc, doorY + 0.25)}">` +
        `<rect x="-0.11" y="-0.036" width="0.22" height="0.07" fill="url(#lkBrass)"/><rect x="-0.102" y="-0.027" width="0.204" height="0.052" fill="#ebe4d2"/>` +
        `<text x="0" y="0.013" ${FONT} font-weight="900" font-size="0.038" text-anchor="middle" fill="#141820">${nm}</text></g>`;
      const hz = X < 0 ? lerp(a, b, 0.82) : lerp(a, b, 0.18);
      side += `<g transform="${sideFrame(VX, VY, FL, X, hz, doorY + 0.4)}"><rect x="-0.016" y="0" width="0.032" height="0.19" fill="#05080f"/><rect x="-0.01" y="0.005" width="0.02" height="0.18" fill="url(#lkSteel)"/></g>`;
    }
    side += poly(wallQuad(L, X, doorY, BASE, NEAR, FAR), `fill="url(#lkFall)"`);
  }

  // Floor reflection of the far bank (glossy sealed steel), and contact shadows.
  // Glossy floor: the bank's cool sheen and each open locker's light, smeared toward the camera.
  let refl = `<g mask="url(#lkReflM)"><rect x="${n1(VX - W * K)}" y="${n1(VY + F * K)}" width="${n1(2 * W * K)}" height="120" fill="#2f4a78" opacity="0.35"/>`;
  for (let i = 0; i < 8; i++) {
    const x = VX + (-W + (i + 0.5) * LW) * K;
    refl += `<rect x="${n1(x - LW * K * 0.4)}" y="${n1(VY + F * K)}" width="${n1(LW * K * 0.8)}" height="90" fill="${i === 1 ? "#22e6ff" : "#4a6a9a"}" opacity="${i === 1 ? 0.35 : 0.18}"/>`;
  }
  refl += `</g>`;
  // Contact shadows along the plinths and under the bench, one blur for all.
  let shadows = poly(flatQuad(L, F, -W, W, FAR - 0.06, FAR), `fill="#000" opacity="0.45"`);
  for (const X of [-W, W]) shadows += poly(flatQuad(L, F, X > 0 ? W - 0.06 : -W, X > 0 ? W : -W + 0.06, NEAR, FAR), `fill="#000" opacity="0.5"`);

  // Bench: slatted wood seat on steel legs, a towel left on it.
  const B0 = 0.12;
  const B1 = 1.02;
  const BZ0 = 1.62;
  const BZ1 = 1.76;
  const SY = 0.7;
  shadows += poly(flatQuad(L, F, B0 - 0.05, B1 + 0.05, BZ0 - 0.03, BZ1 + 0.06), `fill="#000" opacity="0.85"`);
  refl += `<g filter="url(#blur5)">${shadows}</g>`;
  let bench = "";
  for (const X of [B0 + 0.06, B1 - 0.06]) {
    for (const z of [BZ0 + 0.02, BZ1 - 0.02]) bench += poly(faceQuad(L, z, X - 0.012, X + 0.012, SY + 0.03, F), `fill="url(#lkSteel)" stroke="${INK}" stroke-width="1"`);
    bench += poly(faceQuad(L, BZ0 + 0.02, X - 0.012, X + 0.012, SY + 0.22, SY + 0.24), `fill="#3a4658"`);
    for (const z of [BZ0 + 0.02, BZ1 - 0.02]) {
      const [fx2, fy2] = L(X, F, z);
      bench += `<ellipse cx="${n1(fx2)}" cy="${n1(fy2)}" rx="${n1(30 / z)}" ry="${n1(6 / z)}" fill="#000" opacity="0.7"/>`;
    }
  }
  bench += poly(flatQuad(L, SY, B0, B1, BZ0, BZ1), `fill="url(#lkWood)" stroke="${INK}" stroke-width="1.2"`);
  for (let k = 1; k < 4; k++) bench += seg(L(B0, SY, lerp(BZ0, BZ1, k / 4)), L(B1, SY, lerp(BZ0, BZ1, k / 4)), `stroke="#5a3e18" stroke-width="1.6"`);
  bench += poly(faceQuad(L, BZ0, B0, B1, SY, SY + 0.03), `fill="#8a6430" stroke="${INK}" stroke-width="1.2"`);
  bench += seg(L(B0, SY, BZ0), L(B1, SY, BZ0), `stroke="#ffe0a0" stroke-width="1.4" opacity="0.7"`);
  bench += poly([L(0.72, SY - 0.012, BZ0 + 0.025), L(0.88, SY - 0.012, BZ0 + 0.025), L(0.88, SY - 0.012, BZ1 - 0.025), L(0.72, SY - 0.012, BZ1 - 0.025)], `fill="#c8ccd4" stroke="${INK}" stroke-width="0.8"`);
  // Gym bag on the floor by the far bank.
  bench += `<ellipse cx="${n1(L(-0.62, F, 2.2)[0])}" cy="${n1(L(-0.62, F, 2.2)[1])}" rx="58" ry="8" fill="#000" opacity="0.55"/>`;
  bench += `<path d="M${n1(L(-0.82, F, 2.2)[0])} ${n1(L(-0.82, F, 2.2)[1])} C${n1(L(-0.84, 0.82, 2.2)[0])} ${n1(L(-0.84, 0.82, 2.2)[1])} ${n1(L(-0.4, 0.82, 2.2)[0])} ${n1(L(-0.4, 0.82, 2.2)[1])} ${n1(L(-0.42, F, 2.2)[0])} ${n1(L(-0.42, F, 2.2)[1])}Z" fill="#1a1e26" stroke="${INK}" stroke-width="1.2"/>`;
  bench += `<path d="M${n1(L(-0.72, 0.86, 2.2)[0])} ${n1(L(-0.72, 0.86, 2.2)[1])} Q${n1(L(-0.62, 0.74, 2.2)[0])} ${n1(L(-0.62, 0.74, 2.2)[1])} ${n1(L(-0.52, 0.86, 2.2)[0])} ${n1(L(-0.52, 0.86, 2.2)[1])}" fill="none" stroke="#2a3040" stroke-width="3"/>`;

  base += far + side + refl + bench;

  // ── Light: troffer blooms, volumetric cones, pools on floor and lockers ──
  const FLICK = 4; // index of the flickering troffer (front row, centre)
  const lit = (i) => {
    const [a, b, z] = TROFFERS[i];
    const zc = z + 0.05;
    const [cx, cy] = L((a + b) / 2, C, zc);
    const s = FL / zc;
    return bloom(cx, cy + 4, (b - a) * s * 0.8, s * 0.12, "gTube") +
      bloom(cx, cy + 2, (b - a) * s * 0.5, s * 0.04, "gTube");
  };
  const cone = (i) => {
    const [a, b, z] = TROFFERS[i];
    return poly([L(a, C + 0.01, z), L(b, C + 0.01, z), L(b + 0.12, F, z + 0.1), L(a - 0.12, F, z + 0.1)], `fill="url(#cone)"`);
  };
  let lights = `<g filter="url(#blur14)">${TROFFERS.map((_, i) => (i !== FLICK ? cone(i) : "")).join("")}</g>`;
  TROFFERS.forEach((_, i) => { if (i !== FLICK) lights += lit(i); });
  for (const X of [-0.75, 0, 0.75]) {
    const [px, py] = L(X, F, 1.75);
    lights += bloom(px, py, 210, 34, "gPool", 0.9);
    const [qx, qy] = L(X, F, 2.15);
    lights += bloom(qx, qy, 130, 18, "gPool", 0.8);
  }
  for (const X of [-W, W]) {
    const [wx, wy] = L(X, -0.25, 1.9);
    lights += bloom(wx, wy, 50, 160, "gPool", 0.25);
  }
  const flickerTube = (() => {
    const [a, b, z] = TROFFERS[FLICK];
    return poly(flatQuad(L, C + 0.005, a, b, z, z + 0.1), `fill="#ffffff"`) + lit(FLICK) + `<g filter="url(#blur14)">${cone(FLICK)}</g>`;
  })();

  // Cyan glow spilling out of the ajar locker.
  const ha = -W + LW + 0.008;
  const hb = ha + LW - 0.016;
  const fx = ha + (hb - ha) * Math.cos(0.95) * 0.92;
  const fz = FAR - (hb - ha) * Math.sin(0.95) * 0.92;
  const gapTop = L(fx, doorY, fz);
  const gapBot = L(fx, BASE - 0.005, fz);
  const frameTop = L(hb, doorY, FAR);
  const frameBot = L(hb, BASE - 0.005, FAR);
  const glow =
    poly([gapTop, frameTop, frameBot, gapBot], `fill="#9ff6ff" opacity="0.16"`) +
    poly([gapTop, frameTop, frameBot, gapBot], `fill="#22e6ff" opacity="0.32" filter="url(#blur5)"`) +
    bloom((frameTop[0] + gapTop[0]) / 2, (frameTop[1] + frameBot[1]) / 2, 110, 260, "gCyan", 0.55) +
    poly([gapBot, frameBot, L(hb + 0.35, F, FAR - 0.8), L(fx - 0.2, F, FAR - 0.8)], `fill="url(#spill)" filter="url(#blur5)"`) +
    seg(gapTop, gapBot, `stroke="#c8fbff" stroke-width="2"`) +
    seg(L(hb + 0.01, doorY, FAR), L(hb + 0.01, BASE, FAR), `stroke="#22e6ff" stroke-width="1.6" opacity="0.6"`);

  // Status LEDs: the cadet's locker light and the door's keypad.
  const [lx, ly] = L(hb - 0.05, doorY + 0.1, FAR);
  const [dx, dy] = L(W, -0.05, FAR - 0.64 + 0.15);
  const leds =
    `<circle cx="${n1(lx)}" cy="${n1(ly)}" r="12" fill="#ffb24a" opacity="0.4" filter="url(#blur2)"/><circle cx="${n1(lx)}" cy="${n1(ly)}" r="2.6" fill="#ffe2b0"/>` +
    `<circle cx="${n1(dx)}" cy="${n1(dy)}" r="14" fill="#44ff99" opacity="0.35" filter="url(#blur2)"/><circle cx="${n1(dx)}" cy="${n1(dy)}" r="3" fill="#c8ffe0"/>`;

  // Haze hanging under the lights (atmospheric depth over the far bank).
  const haze =
    bloom(800, 470, 620, 160, "gHaze") +
    bloom(560, 420, 380, 200, "gHaze", 0.7) +
    bloom(1100, 380, 420, 180, "gHaze", 0.6) +
    bloom(620, 420, 160, 260, "gCyan", 0.1);

  return {
    box: [0, 0, 1600, 900],
    defs,
    layers: [
      { markup: base },
      { markup: haze, anim: { type: "drift", amp: 30, speed: 0.1 }, blend: "screen", opacity: 0.6 },
      { markup: lights, blend: "lighter", opacity: 0.75 },
      { markup: flickerTube, anim: { type: "flicker", min: 0.12, max: 1, speed: 1.4 }, blend: "lighter" },
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
    `<stop offset="0" stop-color="#0d1624"/><stop offset="0.45" stop-color="#060a12"/><stop offset="1" stop-color="#020306"/></radialGradient>` +
    // A single overhead key light: a soft shaft onto the spot where the speaker stands.
    `<linearGradient id="dShaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9cc2e8" stop-opacity="0.22"/><stop offset="0.55" stop-color="#7aa4d0" stop-opacity="0.08"/><stop offset="1" stop-color="#7aa4d0" stop-opacity="0"/></linearGradient>` +
    `<radialGradient id="dPool"><stop offset="0" stop-color="#8ab4e0" stop-opacity="0.26"/><stop offset="0.5" stop-color="#5a84b4" stop-opacity="0.08"/><stop offset="1" stop-color="#5a84b4" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="dFloor" x1="0" y1="480" x2="0" y2="900" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0a1018" stop-opacity="0"/><stop offset="0.25" stop-color="#0a1018" stop-opacity="0.8"/><stop offset="1" stop-color="#020306"/></linearGradient>` +
    // Film grain: a tile of faint light and dark specks.
    (() => {
      const rand = rng(97);
      let lt = "";
      let dk = "";
      for (let i = 0; i < 260; i++) {
        const x = n1(rand() * 96);
        const y = n1(rand() * 96);
        if (rand() < 0.5) lt += `M${x},${y}h0.9v0.9h-0.9Z`;
        else dk += `M${x},${y}h1.1v1.1h-1.1Z`;
      }
      return `<pattern id="dGrain" patternUnits="userSpaceOnUse" width="96" height="96"><path d="${lt}" fill="#c8d8ec" opacity="0.07"/><path d="${dk}" fill="#000" opacity="0.18"/></pattern>`;
    })() +
    fadeGrad("gHaze", "#22405f", 0.22, 0.45) +
    fadeGrad("gHazeW", "#3a5878", 0.16, 0.45) +
    fadeGrad("gMote", "#b4d2f0", 0.5, 0.3) +
    BG_BLUR("dBlur", 26) +
    BG_BLUR("dBlur3", 3);

  let base = `<rect width="1600" height="900" fill="url(#void)"/>`;
  // Far wall of darkness: faint vertical structure so the void has depth.
  for (const [x, w, a] of [[180, 90, 0.05], [420, 40, 0.04], [1180, 60, 0.05], [1390, 110, 0.04]]) {
    base += `<rect x="${x}" y="0" width="${w}" height="640" fill="#1a2a40" opacity="${a}" filter="url(#dBlur)"/>`;
  }
  base += `<g filter="url(#dBlur)"><path d="M700 -20 L900 -20 L1060 560 L540 560 Z" fill="url(#dShaft)"/>` +
    `<path d="M760 -20 L840 -20 L920 540 L680 540 Z" fill="url(#dShaft)" opacity="0.8"/></g>` +
    `<rect x="0" y="480" width="1600" height="420" fill="url(#dFloor)"/>` +
    `<ellipse cx="800" cy="520" rx="340" ry="46" fill="url(#dPool)"/>` +
    `<ellipse cx="800" cy="518" rx="140" ry="16" fill="url(#dPool)"/>` +
    `<rect width="1600" height="900" fill="url(#dGrain)"/>`;

  // Two banks of slow fog: a cool far one and a warmer, nearer one.
  const haze1 = bloom(540, 300, 560, 170, "gHaze") + bloom(1180, 390, 460, 140, "gHaze", 0.8) + bloom(800, 520, 700, 90, "gHazeW", 0.8);
  const haze2 = bloom(860, 210, 600, 120, "gHaze", 0.7) + bloom(260, 470, 320, 100, "gHaze", 0.5) + bloom(1300, 600, 380, 80, "gHazeW", 0.7);

  const rand = rng(7);
  let dust = "";
  // Motes lit in the shaft, fine and sharp...
  for (let i = 0; i < 60; i++) {
    const y = 20 + rand() * 640;
    const spread = 110 + (y / 760) * 220;
    const x = 800 + (rand() - 0.5) * 2 * spread;
    const r = 0.7 + rand() * 1.2;
    dust += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="#cfe2f6" opacity="${n1(0.12 + rand() * 0.3)}"/>`;
  }
  // ...faint ones in the dark, and a few big out-of-focus specks close to the lens.
  for (let i = 0; i < 30; i++) {
    dust += `<circle cx="${n1(40 + rand() * 1520)}" cy="${n1(30 + rand() * 580)}" r="${n1(0.8 + rand() * 1.2)}" fill="#a9cbe8" opacity="${n1(0.05 + rand() * 0.14)}"/>`;
  }
  let bokeh = "";
  for (let i = 0; i < 7; i++) bokeh += `<circle cx="${n1(80 + rand() * 1440)}" cy="${n1(60 + rand() * 520)}" r="${n1(9 + rand() * 16)}" fill="#8fb4dc" opacity="${n1(0.025 + rand() * 0.03)}"/>`;
  dust += `<g filter="url(#dBlur3)">${bokeh}</g>`;

  return {
    box: [0, 0, 1600, 900],
    defs,
    layers: [
      { markup: base },
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
    linGrad("cKey", [[0, "#ffffff", 0.12], [0.45, "#ffffff", 0], [0.7, "#000000", 0], [1, "#000000", 0.35]], 1, 1) +
    linGrad("cRim", [[0, "#8aa2b8"], [0.5, "#566c82"], [1, "#2a3a4a"]], 1, 0) +
    linGrad("cLid", [[0, "#2e3c4c"], [0.5, "#1c2733"], [1, "#0c1219"]], 1, 0.4) +
    linGrad("cFoam", [[0, "#2a2e36"], [0.5, "#181b21"], [1, "#0a0b0e"]], 0.4, 1) +
    linGrad("cNote", [[0, "#f6e68c"], [0.55, "#dcc052"], [1, "#9c8028"]], 1, 1) +
    `<radialGradient id="cBump" cx="0.35" cy="0.3" r="0.7"><stop offset="0" stop-color="#3a3f48"/><stop offset="1" stop-color="#0e1014"/></radialGradient>` +
    `<radialGradient id="cHum"><stop offset="0" stop-color="#22e6ff" stop-opacity="0.35"/><stop offset="0.5" stop-color="#22e6ff" stop-opacity="0.1"/><stop offset="1" stop-color="#22e6ff" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="cShadow"><stop offset="0" stop-color="#000" stop-opacity="0.8"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
    linGrad("cBench", [[0, "#7a5626"], [0.5, "#b08446"], [1, "#d8b066"]]) +
    linGrad("cLeg", [[0, "#c8d4e4"], [0.5, "#6a7688"], [1, "#2a3240"]], 1, 0) +
    linGrad("cLegFade", [[0, "#fff"], [0.6, "#fff"], [1, "#000"]]) +
    `<mask id="cLegM" maskUnits="userSpaceOnUse" x="-140" y="60" width="280" height="40"><rect x="-140" y="60" width="280" height="40" fill="url(#cLegFade)"/></mask>` +
    `<linearGradient id="cBenchFadeG" x1="-134" y1="0" x2="130" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000"/><stop offset="0.16" stop-color="#fff"/><stop offset="0.84" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>` +
    `<mask id="cBenchFade" maskUnits="userSpaceOnUse" x="-140" y="20" width="280" height="80"><rect x="-140" y="20" width="280" height="80" fill="url(#cBenchFadeG)"/></mask>` +
    `<clipPath id="cHazClip"><polygon points="-84,13 60,13 60,21 -84,21"/></clipPath>` +
    `<clipPath id="cLidClip"><polygon points="-61,-31 78,-31 83.6,-89 -55.4,-89"/></clipPath>` +
    glowFilter("chBlur", 1.3) +
    glowFilter("cGlow", 2.2) +
    glowFilter("cAO", 3);

  // Locker-room bench the crate rests on, fading out at both ends.
  let lid = `<g mask="url(#cBenchFade)">`;
  lid += poly([[-132, 66], [128, 66], [112, 30], [-116, 30]], `fill="url(#cBench)" ${ink(0.8)}`);
  for (let i = 1; i < 4; i++) lid += seg([lerp(-116, -132, i / 4), lerp(30, 66, i / 4)], [lerp(112, 128, i / 4), lerp(30, 66, i / 4)], `stroke="#3a2610" stroke-width="1.4" opacity="0.85"`);
  // Wood grain along the slats.
  for (let i = 0; i < 14; i++) {
    const v = 0.06 + (i / 14) * 0.9;
    const y = lerp(30, 66, v);
    lid += seg([lerp(-116, -132, v) + 10 + (i * 37) % 60, y + 1.2], [lerp(-116, -132, v) + 60 + (i * 53) % 120, y + 1.2], `stroke="#5a3e18" stroke-width="0.4" opacity="0.5"`);
  }
  lid += poly([[-132, 66], [128, 66], [128, 72], [-132, 72]], `fill="#7a5626" ${ink(0.8)}`);
  lid += seg([-130, 66.6], [126, 66.6], `stroke="#ffe0a0" stroke-width="0.8" opacity="0.6"`);
  // Steel legs running out of frame.
  lid += `<g mask="url(#cLegM)">` + [-100, -90, 84, 94].map((x) => `<rect x="${x}" y="72" width="5" height="28" fill="url(#cLeg)" ${ink(0.5)}/>`).join("") + `</g>`;
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
  // The rim goes behind the helmet: it sits up out of the foam, proud of the
  // back edge, and only the front lip is drawn over it (in the shell).
  const helmet =
    path("M-88,4 L64,4 L84,-26 L-68,-26Z M-81,0 L58,0 L76,-21 L-62,-21Z", `fill="url(#cRim)" fill-rule="evenodd" ${ink(0.8)}`) +
    `<ellipse cx="-4" cy="-2" rx="30" ry="6" fill="#000" opacity="0.7" filter="url(#cAO)"/>` +
    `<g ${helmT}>${helm.body}</g>`;

  // Crate shell drawn over the foam: rim, front face, right side, hardware.
  let shell = "";
  shell += poly([[64, 4], [84, -26], [84, 26], [64, 56]], `fill="url(#cSide)" ${ink()}`);
  shell += poly([[-88, 4], [64, 4], [58, 0], [-81, 0]], `fill="url(#cRim)" ${ink(0.8)}`);
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
  {
    const rs = rng(61);
    let sc = "";
    for (let i = 0; i < 26; i++) {
      const x = -86 + rs() * 146;
      const y = 6 + rs() * 48;
      if (y > 12 && y < 22) continue;
      const l = 3 + rs() * 12;
      sc += `M${n1(x)},${n1(y)} l${n1(l)},${n1((rs() - 0.5) * 2)} `;
    }
    shell += path(sc, `fill="none" stroke="#c8dcec" stroke-width="0.3" opacity="0.16"`);
    // Paint worn to bare metal along the top lip and the corners.
    shell += path("M-80,4.6 L-62,4.6 M-30,4.6 L-18,4.6 M20,4.6 L40,4.6", `fill="none" stroke="#e8f0f8" stroke-width="0.9" opacity="0.55"`);
    // Key light from the upper left falling across the face.
    shell += `<polygon points="-88,4 64,4 64,56 -88,56" fill="url(#cKey)"/>`;
  }

  const hum =
    bloom(-4, -30, 70, 44, "cHum") +
    `<g ${helmT}>${helm.glow}</g>`;
  const leds =
    [[34, "#3ce07a"], [42, "#22e6ff"], [50, "#ffaa44"]]
      .map(([x, c]) => `<circle cx="${x}" cy="36" r="3.4" fill="${c}" filter="url(#chBlur)"/><circle cx="${x}" cy="36" r="0.7" fill="#fff"/>`)
      .join("") +
    `<rect x="-2" y="30" width="18" height="6" fill="#22e6ff" opacity="0.4" filter="url(#chBlur)"/>`;

  return {
    box: [-136, -106, 268, 206],
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
    `<linearGradient id="vrSheen" x1="0" y1="0" x2="1" y2="0.6"><stop offset="0.18" stop-color="#e8f6ff" stop-opacity="0"/><stop offset="0.3" stop-color="#e8f6ff" stop-opacity="0.13"/><stop offset="0.42" stop-color="#e8f6ff" stop-opacity="0.02"/><stop offset="0.5" stop-color="#e8f6ff" stop-opacity="0.07"/><stop offset="0.56" stop-color="#e8f6ff" stop-opacity="0"/></linearGradient>` +
    `<radialGradient id="vrCurve" cx="0.5" cy="0.5" r="0.62"><stop offset="0.7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.6"/></radialGradient>` +
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
  // Curved glass: dark corners, a window's reflection slanting across it.
  crack += `<rect x="${SX0}" y="${SY0}" width="${SX1 - SX0}" height="${SY1 - SY0}" fill="url(#vrCurve)"/>`;
  crack += `<rect x="${SX0}" y="${SY0}" width="${SX1 - SX0}" height="${SY1 - SY0}" fill="url(#vrSheen)"/>`;
  crack += `<rect x="${SX0}" y="${SY0}" width="${SX1 - SX0}" height="1.6" fill="#000" opacity="0.5"/>`;
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
    `<radialGradient id="rfLamp" cx="0.18" cy="0.1" r="1.05"><stop offset="0" stop-color="#ffe6b0" stop-opacity="0.26"/><stop offset="0.45" stop-color="#ffd890" stop-opacity="0.05"/><stop offset="0.75" stop-color="#000" stop-opacity="0.12"/><stop offset="1" stop-color="#000" stop-opacity="0.42"/></radialGradient>` +
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
  // Paper tooth: faint fibres across the sheet.
  {
    let fib = "";
    for (let i = 0; i < 40; i++) {
      const x = -86 + rand() * 160;
      const y = -64 + rand() * 110;
      fib += `M${n1(x)},${n1(y)} l${n1(2 + rand() * 6)},${n1((rand() - 0.5) * 1.5)} `;
    }
    page += path(fib, `fill="none" stroke="#8a8476" stroke-width="0.25" opacity="0.35"`);
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
  // A desk lamp off to the upper left: warm pool, falling off into shadow.
  page += `<rect x="-88" y="-66" width="168" height="114" fill="url(#rfLamp)"/>`;
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
