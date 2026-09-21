/**
 * SVG → bitmap cache for cutscene art.
 *
 * Canvas2D cannot draw SVG markup directly, so every layer is serialised into a
 * standalone SVG document, decoded once as an <img> at the device-pixel size it
 * will be drawn at, and blitted every frame after that. Sizes are bucketed in
 * half-octave steps so a resize or zoom re-rasterises at most a few times and
 * the art never gets upscaled into blur.
 */

const MAX_PX = 4096;
// Decoded bitmaps cost width×height×4 bytes. Past this budget the least
// recently used sizes are dropped (a level can show dozens of sprite sizes).
const BYTE_BUDGET = 256 * 1024 * 1024;
const EVICT_IDLE_MS = 2000;
const layers = new Map(); // layer id -> Map(bucket -> { img, ready, failed, bytes, lastUsed })
let totalBytes = 0;

// Decoded SVG <img>s are still vector: drawing one into a canvas can re-render
// the SVG on every draw, and a sub-pixel transform (weapon sway, bob) defeats
// the browser's cache. That cost ~4 ms a frame for the viewmodel alone. Each
// decoded layer is baked once into a plain canvas bitmap and that is what
// callers draw. Baking rasterises the SVG, so it is budgeted per frame; until
// a layer's turn comes, the <img> is returned and still draws correctly.
const BAKE_BUDGET_PX = 1.5e6; // per animation frame
let bakeLeft = BAKE_BUDGET_PX;
let bakeReset = false;
function bake(entry) {
  const img = entry.img;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (typeof document === "undefined" || !w || !h) return;
  if (w * h > bakeLeft) return;
  bakeLeft -= w * h;
  if (!bakeReset && typeof requestAnimationFrame === "function") {
    bakeReset = true;
    requestAnimationFrame(() => {
      bakeReset = false;
      bakeLeft = BAKE_BUDGET_PX;
    });
  }
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d").drawImage(img, 0, 0);
  entry.img = c;
  entry.baked = true;
  img.src = "";
}

function evictIdle(now) {
  if (totalBytes <= BYTE_BUDGET) return;
  const idle = [];
  for (const [id, buckets] of layers) {
    for (const [bucket, e] of buckets) {
      if (now - e.lastUsed > EVICT_IDLE_MS) idle.push([e.lastUsed, id, bucket, e]);
    }
  }
  idle.sort((a, b) => a[0] - b[0]);
  for (const [, id, bucket, e] of idle) {
    if (totalBytes <= BYTE_BUDGET) break;
    const buckets = layers.get(id);
    buckets.delete(bucket);
    if (!buckets.size) layers.delete(id);
    totalBytes -= e.bytes;
    if (!e.baked) e.img.src = "";
    else e.img.width = 0; // free the bitmap now rather than at GC
  }
}

/** Round a draw scale up to the next half-octave so bitmaps are never upscaled. */
export function scaleBucket(scale) {
  const s = Math.max(0.25, scale);
  return 2 ** (Math.ceil(Math.log2(s) * 2) / 2);
}

function buildDocument(box, defs, markup, pxW, pxH) {
  const [x, y, w, h] = box;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" ` +
    `width="${pxW}" height="${pxH}" preserveAspectRatio="none">` +
    (defs ? `<defs>${defs}</defs>` : "") +
    markup +
    `</svg>`
  );
}

/**
 * Request a layer bitmap. Returns the best ready image for this layer — the
 * requested bucket when decoded, otherwise any other decoded bucket — or null
 * while nothing has decoded yet.
 *
 * @param {string} id      unique layer id, e.g. "art:hero:0"
 * @param {number[]} box   [x, y, w, h] viewBox in art units
 * @param {string} defs    shared <defs> contents
 * @param {string} markup  layer body
 * @param {number} scale   device pixels per art unit
 */
export function getLayerImage(id, box, defs, markup, scale) {
  const bucket = scaleBucket(scale);
  const now = performance.now();
  let buckets = layers.get(id);
  if (!buckets) {
    buckets = new Map();
    layers.set(id, buckets);
  }
  let entry = buckets.get(bucket);
  if (!entry) {
    const k = Math.min(bucket, MAX_PX / box[2], MAX_PX / box[3]);
    const pxW = Math.max(1, Math.round(box[2] * k));
    const pxH = Math.max(1, Math.round(box[3] * k));
    const img = new Image();
    entry = { img, ready: false, failed: false, bytes: pxW * pxH * 4, lastUsed: now };
    buckets.set(bucket, entry);
    totalBytes += entry.bytes;
    img.decoding = "async";
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildDocument(box, defs, markup, pxW, pxH))}`;
    const done = () => { entry.ready = img.naturalWidth > 0; entry.failed = !entry.ready; };
    if (typeof img.decode === "function") img.decode().then(done, () => { entry.failed = true; });
    else img.onload = done;
    evictIdle(now);
  }
  entry.lastUsed = now;
  if (entry.ready) {
    if (!entry.baked) bake(entry);
    return entry.img;
  }
  // Fall back to the nearest decoded size of the same layer so a resize or a
  // distance change never blanks it while the new size decodes.
  let best = null;
  let bestGap = Infinity;
  for (const [b, e] of buckets) {
    const gap = Math.abs(Math.log2(b / bucket));
    if (e.ready && gap < bestGap) {
      best = e;
      bestGap = gap;
    }
  }
  if (best) {
    best.lastUsed = now;
    return best.img;
  }
  return null;
}

/** True once any bucket of a layer failed to decode (bad markup). */
export function layerFailed(id) {
  for (const e of layers.get(id)?.values() ?? []) if (e.failed) return true;
  return false;
}

/**
 * Drop every decoded bitmap. Called when the player leaves the Modern asset
 * set for Legacy, so up to BYTE_BUDGET of decoded art is not held for a style
 * that is no longer drawn. Layers re-decode lazily if Modern comes back.
 */
export function releaseRasterCache() {
  for (const buckets of layers.values()) {
    for (const e of buckets.values()) {
      if (!e.img) continue;
      if (e.baked) e.img.width = 0;
      else e.img.src = "";
    }
  }
  layers.clear();
  totalBytes = 0;
}
