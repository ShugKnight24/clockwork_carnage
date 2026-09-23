/**
 * CPU-side light sampling for the Realistic art style.
 *
 * The GL deck shader lights the floor per pixel. Sprites, projectiles and the
 * viewmodel are Canvas2D, so they ask this module how bright the world is at a
 * point and tint themselves to match. Two sources feed it:
 *
 *   - dynamic lights (game.lights: {x, y, color[0-255], radius, intensity}),
 *     with the same windowed inverse-square falloff the shader uses;
 *   - the ceiling lamps. The Modern ceiling is one tile repeated per map cell,
 *     so its emissive panels sit at the same fractional position in every
 *     cell. `buildLampField` blurs that tile once into a 16x16 grid, and a
 *     lookup at frac(x), frac(y) is the lamp light overhead.
 *
 * Pure functions plus one small cache. No per-call allocation: callers pass
 * the output object.
 */

export const LAMP_GRID = 16;

/** Baseline light when nothing is overhead: dim, slightly cool. */
export const AMBIENT = Object.freeze({ r: 0.46, g: 0.5, b: 0.56 });

/**
 * Blur a ceiling tile's emissive panels into a LAMP_GRID² RGB field (0-1).
 * @param {HTMLCanvasElement|OffscreenCanvas} ceil  one repeating ceiling tile
 * @returns {Float32Array|null}  LAMP_GRID*LAMP_GRID*3, or null when unreadable
 */
export function buildLampField(ceil) {
  if (!ceil || !ceil.width) return null;
  const n = LAMP_GRID;
  let data;
  try {
    const c = typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(n, n)
      : Object.assign(document.createElement("canvas"), { width: n, height: n });
    const g = c.getContext("2d", { willReadFrequently: true });
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    g.drawImage(ceil, 0, 0, n, n);
    data = g.getImageData(0, 0, n, n).data;
  } catch (_) {
    return null;
  }
  // Keep only the emissive part (bright texels), then box-blur twice with
  // wraparound so the pool spills across the cell edge like the shader's.
  let f = new Float32Array(n * n * 3);
  for (let i = 0; i < n * n; i++) {
    const r = data[i * 4] / 255;
    const gg = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;
    const lum = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
    const e = Math.max(0, Math.min(1, (lum - 0.3) / 0.45));
    f[i * 3] = r * e;
    f[i * 3 + 1] = gg * e;
    f[i * 3 + 2] = b * e;
  }
  for (let pass = 0; pass < 2; pass++) {
    const out = new Float32Array(f.length);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        let r = 0, gg = 0, b = 0;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const j = (((y + dy + n) % n) * n + ((x + dx + n) % n)) * 3;
            r += f[j]; gg += f[j + 1]; b += f[j + 2];
          }
        }
        const i = (y * n + x) * 3;
        out[i] = r / 25; out[i + 1] = gg / 25; out[i + 2] = b / 25;
      }
    }
    f = out;
  }
  return f;
}

/**
 * Light arriving at world point (x, y), as an RGB multiplier where AMBIENT is
 * an unlit spot and ~1.3 is under a lamp or beside a muzzle flash.
 *
 * @param {{r:number,g:number,b:number}} out  written and returned
 * @param {number} x
 * @param {number} y
 * @param {Array|null} lights       game.lights
 * @param {Float32Array|null} lampField  from buildLampField, or null
 */
export function sampleLight(out, x, y, lights, lampField) {
  let r = AMBIENT.r, g = AMBIENT.g, b = AMBIENT.b;
  if (lampField) {
    const n = LAMP_GRID;
    const fx = x - Math.floor(x);
    const fy = y - Math.floor(y);
    const i = (((fy * n) | 0) * n + ((fx * n) | 0)) * 3;
    r += lampField[i] * 1.6;
    g += lampField[i + 1] * 1.6;
    b += lampField[i + 2] * 1.6;
  }
  if (lights) {
    for (let k = 0; k < lights.length; k++) {
      const L = lights[k];
      const dx = L.x - x;
      const dy = L.y - y;
      const d2 = dx * dx + dy * dy;
      const r2 = L.radius * L.radius;
      if (d2 >= r2) continue;
      const q = d2 / r2;
      const win = 1 - q * q;
      const a = (win * win * (L.intensity ?? 1)) / (1 + (6 * d2) / r2);
      const c = L.color || [255, 200, 150];
      r += (c[0] / 255) * a;
      g += (c[1] / 255) * a;
      b += (c[2] / 255) * a;
    }
  }
  out.r = Math.min(1.6, r);
  out.g = Math.min(1.6, g);
  out.b = Math.min(1.6, b);
  return out;
}
