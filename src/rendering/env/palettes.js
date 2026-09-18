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
export function glowColors(act) {
  const p = getEnvPalette(act);
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
