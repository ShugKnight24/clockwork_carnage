/**
 * Math utilities — pure functions, no side effects.
 * Replaces scattered inline math across game.js, renderer.js, etc.
 */

/** Clamp value between min and max. */
export const clamp = (v, min, max) =>
  v < min ? min : v > max ? max : v;

/** Linear interpolation from a to b by t. */
export const lerp = (a, b, t) => a + (b - a) * t;

/** Euclidean distance between two points. */
export const dist = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

/** Squared distance (avoids sqrt for comparison-only checks). */
export const dist2 = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
};

/** Normalize angle to [-PI, PI]. */
export const normalizeAngle = (a) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

/** Degrees to radians. */
export const deg2rad = (d) => (d * Math.PI) / 180;

/** Radians to degrees. */
export const rad2deg = (r) => (r * 180) / Math.PI;

/** Smooth step (hermite interpolation). */
export const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Random integer in [min, max] inclusive. */
export const randInt = (min, max) =>
  min + Math.floor(Math.random() * (max - min + 1));

/** Random float in [min, max). */
export const randFloat = (min, max) =>
  min + Math.random() * (max - min);

/** Pick random element from array. */
export const randPick = (arr) =>
  arr[Math.floor(Math.random() * arr.length)];

/**
 * Framerate-invariant exponential decay.
 * `rate60` is the per-frame multiplier originally tuned at 60 fps
 * (e.g. 0.9 means "lose 10% per frame at 60 Hz").
 * Returns the equivalent multiplier for arbitrary `dt` (seconds).
 */
export const decay = (rate60, dt) => Math.pow(rate60, dt * 60);
