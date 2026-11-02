/**
 * Hex colour helpers for "#rrggbb" strings (six digits only: no #rgb
 * shorthand, no alpha). Pure functions; the SVG art and canvas painters
 * share them so a tone mixes to the same hex everywhere.
 */

/** "#rrggbb" → [r, g, b]. */
export const hexRgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** [r, g, b] → "#rrggbb", each channel rounded and clamped to 0..255. */
export const rgbHex = (c) =>
  `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;

/**
 * Blend two hex colours; t = 0 → a, 1 → b. Channels are rounded but not
 * clamped, so keep t within 0..1 (or use mixHexClamped).
 */
export const mixHex = (a, b, t) => {
  const x = hexRgb(a);
  const y = hexRgb(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
};

/** mixHex with each channel clamped to 0..255, for t outside 0..1. */
export const mixHexClamped = (a, b, t) => {
  const x = hexRgb(a);
  const y = hexRgb(b);
  return rgbHex(x.map((v, i) => v + (y[i] - v) * t));
};
