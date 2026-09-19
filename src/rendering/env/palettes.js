/**
 * Modern environment palettes, one per campaign act. Shared by the wall/deck
 * texture painters, the fog grade and the floor shader so every surface of a
 * level agrees on its steel, its accent light and its air colour.
 *
 * Act 1 Chronos Station: blue steel, cyan light.
 * Act 2 industrial depths: rusted bronze steel, amber sodium light.
 * Act 3 corrupted core: violet-black steel, crimson/violet light.
 */

export const INK = "#04060b";

export const ENV_PALETTES = {
  1: {
    // steel ramp, dark → specular
    s0: "#0a121b", s1: "#152130", s2: "#1f3042", s3: "#324a60", s4: "#6f8aa3",
    trim: "#26384a",
    accent: "#22e6ff", accentDeep: "#0b5d6e",
    warn: "#ffae3a", alert: "#ff3344",
    lamp: "#d8f6ff",
    grime: [3, 8, 12],
    rust: null,
    energy: "#9b5cff", energyHot: "#e2c6ff",
    rift: "#00ffcc",
    // Fog: near air is the deep station navy, far air lifts toward a hazy teal
    // (atmospheric perspective).
    fogNear: [7, 15, 25], fogFar: [26, 50, 66],
    lampRGB: [150, 225, 255], accentRGB: [34, 230, 255],
  },
  2: {
    s0: "#120d09", s1: "#221912", s2: "#33261b", s3: "#4f3b29", s4: "#9a7a55",
    trim: "#3a2a1c",
    accent: "#ffae3a", accentDeep: "#6e3f0b",
    warn: "#ffae3a", alert: "#ff5522",
    lamp: "#ffe2b0",
    grime: [10, 6, 3],
    rust: "#6b3a1c",
    energy: "#ff7a3a", energyHot: "#ffe0b8",
    rift: "#7dffb0",
    fogNear: [18, 11, 6], fogFar: [62, 40, 22],
    lampRGB: [255, 200, 120], accentRGB: [255, 174, 58],
  },
  3: {
    s0: "#0e0710", s1: "#1a0e1d", s2: "#28152c", s3: "#3f2244", s4: "#8a5f8e",
    trim: "#2c1830",
    accent: "#ff2a4a", accentDeep: "#6a0f22",
    warn: "#9b5cff", alert: "#ff2a4a",
    lamp: "#ffc6d6",
    grime: [8, 2, 8],
    rust: "#4a1030",
    energy: "#b36bff", energyHot: "#f2d6ff",
    rift: "#ff4df0",
    fogNear: [16, 5, 13], fogFar: [54, 18, 42],
    lampRGB: [255, 140, 175], accentRGB: [255, 42, 74],
  },
};

export const getEnvPalette = (act) => ENV_PALETTES[act] || ENV_PALETTES[1];

// ── Per-level looks ─────────────────────────────────────────────────────────

/**
 * Three act palettes meant nine campaign levels shipped three looks — every
 * level inside an act was pixel-for-pixel the same steel, lamp and fog.
 *
 * Each level now derives its own palette from its act base: the steel ramp is
 * rotated and re-lit as a whole so it stays a coherent metal, and only the
 * handful of fields that carry the room's mood are named outright. Anything
 * left out falls through to the act.
 *
 * `steel` is {h, s, l}: hue degrees to rotate, and saturation / lightness
 * multipliers. Keyed by campaign level index.
 */
export const LEVEL_ENVS = {
  // ── Act 1: Chronos Station ──
  0: { name: "Entry" },
  1: {
    // Security: harder and colder than the lobby, lit by fluorescent white.
    name: "Checkpoint",
    steel: { h: -14, s: 0.55, l: 0.85, lift: 0.02 },
    accent: "#6fe8ff", accentDeep: "#10485c", lamp: "#f2fbff",
    fogNear: [10, 16, 22], fogFar: [46, 62, 74],
  },
  2: {
    // Research: clinical, bright, lit green over the benches.
    name: "Research Wing",
    steel: { h: 38, s: 0.4, l: 1.1, lift: 0.1 },
    accent: "#4effc0", accentDeep: "#0b6a52", lamp: "#f4fff9",
    energy: "#63ffd0", energyHot: "#d6fff1",
    fogNear: [20, 30, 27], fogFar: [72, 96, 84],
  },
  // ── Act 2: industrial depths ──
  3: { name: "Containment" },
  4: {
    // Server farm: cold machine light fighting the rust.
    name: "Server Farm",
    steel: { h: 34, s: 0.3, l: 0.95, lift: 0.05 },
    accent: "#7ee3c4", accentDeep: "#1d5a4c", lamp: "#cdf2e6",
    energy: "#46d6ff", energyHot: "#cdf2ff",
    fogNear: [10, 18, 18], fogFar: [40, 64, 62],
  },
  5: {
    // Reactor: everything runs hot, the air itself glows.
    name: "Reactor",
    steel: { h: -16, s: 1.4, l: 0.95, lift: 0.04 },
    accent: "#ff6a1e", accentDeep: "#7a2606", lamp: "#ffcf92",
    energy: "#ff3a1e", energyHot: "#ffd2b0",
    fogNear: [42, 16, 6], fogFar: [120, 52, 18],
  },
  // ── Act 3: corrupted core ──
  6: { name: "Voss' Laboratory" },
  7: {
    // Nexus: the violet goes cold and electric.
    name: "Temporal Nexus",
    steel: { h: 34, s: 0.75, l: 1.0, lift: 0.05 },
    accent: "#8a6bff", accentDeep: "#221068", lamp: "#cfc6ff",
    energy: "#6f7bff", energyHot: "#dcd6ff",
    fogNear: [14, 12, 38], fogFar: [48, 42, 108],
  },
  8: {
    // Paradox Core: near-black metal, everything else is the rift.
    name: "Paradox Core",
    steel: { h: -12, s: 1.4, l: 0.5, lift: -0.015 },
    accent: "#ff1f5a", accentDeep: "#54000f", lamp: "#ffb3c6",
    energy: "#ff4df0", energyHot: "#ffd6fb",
    fogNear: [12, 2, 10], fogFar: [86, 8, 40],
  },
};

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

/** "#rrggbb" → {h, s, l} with h in degrees, s/l in 0..1. */
function hexToHSL(hex) {
  const [r, g, b] = hexRGB(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s, l };
}

/** {h, s, l} → "#rrggbb". */
function hslToHex({ h, s, l }) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const seg = Math.floor(h / 60) % 6;
  const [r, g, b] = [
    [c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x],
  ][seg];
  return (
    "#" +
    [r, g, b].map((v) => clamp255((v + m) * 255).toString(16).padStart(2, "0")).join("")
  );
}

/**
 * Rotate a hex colour's hue and re-light it. `l` scales lightness and `lift`
 * adds to it — a multiplier alone cannot move a near-black steel ramp, which
 * is most of what a wall actually shows.
 */
export function shiftHex(hex, { h = 0, s = 1, l = 1, lift = 0 } = {}) {
  const c = hexToHSL(hex);
  return hslToHex({
    h: c.h + h,
    s: Math.min(1, c.s * s),
    l: Math.min(1, Math.max(0, c.l * l + lift)),
  });
}

const STEEL_KEYS = ["s0", "s1", "s2", "s3", "s4", "trim"];

/**
 * The palette for one campaign level: its act's base, with the level's own
 * steel shift and named overrides applied. `level` is the campaign index;
 * pass null (arena, tutorial, builder) for the plain act palette.
 */
export function resolveEnvPalette(act, level) {
  const base = getEnvPalette(act);
  const spec = level == null ? null : LEVEL_ENVS[level];
  if (!spec || (!spec.steel && Object.keys(spec).length <= 1)) return base;

  const out = { ...base };
  if (spec.steel) for (const k of STEEL_KEYS) out[k] = shiftHex(base[k], spec.steel);
  for (const [k, v] of Object.entries(spec)) {
    if (k === "steel" || k === "name") continue;
    out[k] = v;
  }
  // The authored *RGB triples are not the hex: each act's light tint is a
  // deeper, more saturated version of its fixture colour. Follow the new hex
  // while keeping that authored relationship, instead of flattening it.
  out.lampRGB = spec.lampRGB || retint(base.lampRGB, base.lamp, out.lamp);
  out.accentRGB = spec.accentRGB || retint(base.accentRGB, base.accent, out.accent);
  return out;
}

/** Move `rgb` by the same per-channel ratio that takes `fromHex` to `toHex`. */
function retint(rgb, fromHex, toHex) {
  if (fromHex === toHex) return rgb;
  const from = hexRGB(fromHex);
  const to = hexRGB(toHex);
  return rgb.map((v, i) => clamp255(v * ((to[i] + 8) / (from[i] + 8))));
}

/** "#rrggbb" → [r, g, b] */
export function hexRGB(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Wall types that bleed coloured light onto the deck in front of them, as an
 * index into glowColors(act). 0 = none.
 */
export const WALL_GLOW_INDEX = { 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 8: 6 };

/** RGB 0-255 glow colours indexed by WALL_GLOW_INDEX (index 0 unused). */
export function glowColors(act, pal) {
  const p = pal || getEnvPalette(act);
  return [
    [0, 0, 0],
    hexRGB(p.accent).map((v) => v * 0.55),   // tech banks: accent LEDs
    hexRGB(p.energy),                         // energy cells
    hexRGB(p.accent).map((v) => v * 0.8),    // door frame strips
    [255, 42, 74],                            // paradox veins
    hexRGB(p.rift),                           // temporal rift
    [90, 150, 190],                           // glass: faint sky spill
  ];
}

/** Glow strength per index (how far/bright the deck spill reads). */
export const GLOW_STRENGTH = [0, 0.35, 0.8, 0.55, 0.7, 0.9, 0.25];

/** Fog curve shared by walls, floor and ceiling so they meet seamlessly. */
export const FOG_DENSITY = 0.085;
