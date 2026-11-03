/**
 * Byte-budgeted LRU for baked UI sprites (panels, comms cards, portraits).
 *
 * Each cache keeps its own byte cap, and every cache draws from one shared
 * pool: a canvas costs width×height×4 bytes however it is used, and iOS caps
 * all of a page's canvases together (~384 MB). raster.js counts this pool in
 * its own budget (spriteBytes), and setRasterBudget lowers the pool on phones.
 */

// The pool is a quarter of the raster budget (raster.js sets it): 64 MB on a
// desktop, 16 MB on a phone. Arena play with comms up holds ~10 MB at 2x DPR.
let POOL_BUDGET = 64 * 1024 * 1024;
let poolBytes = 0;
let tick = 0;
const caches = new Set();

/** Cap the bytes all sprite caches may hold together. */
export function setSpriteBudget(bytes) {
  POOL_BUDGET = bytes;
  trimPool(null);
}

/** Bytes held by every sprite cache together. */
export function spriteBytes() {
  return poolBytes;
}

/** Bytes a canvas's bitmap holds. */
export function canvasBytes(c) {
  return c.width * c.height * 4;
}

/**
 * Drop the least recently used sprite across all caches until the pool fits.
 * `keep` is the entry just added; it is never dropped, so a caller can draw
 * what it was handed.
 */
function trimPool(keep) {
  while (poolBytes > POOL_BUDGET) {
    let oldest = null;
    for (const cache of caches) {
      const head = cache._map.values().next().value;
      if (head && head !== keep && (!oldest || head.used < oldest.used)) oldest = head;
    }
    if (!oldest) return;
    oldest.cache._drop(oldest.key);
  }
}

export class SpriteCache {
  /** `maxBytes` caps this cache alone; the shared pool caps all of them. */
  constructor(maxBytes) {
    this.maxBytes = maxBytes;
    this.bytes = 0;
    this._map = new Map(); // key -> { cache, key, canvas, bytes, used }, oldest first
    caches.add(this);
  }

  get size() {
    return this._map.size;
  }

  /** The canvas for `key`, now most recently used; undefined on a miss. */
  get(key) {
    const e = this._map.get(key);
    if (!e) return undefined;
    this._map.delete(key);
    this._map.set(key, e);
    e.used = ++tick;
    return e.canvas;
  }

  /** Cache `canvas` under `key`, dropping the least recently used past the caps. */
  set(key, canvas) {
    if (this._map.has(key)) this._drop(key);
    const e = { cache: this, key, canvas, bytes: canvasBytes(canvas), used: ++tick };
    this._map.set(key, e);
    this.bytes += e.bytes;
    poolBytes += e.bytes;
    while (this.bytes > this.maxBytes) {
      const head = this._map.values().next().value;
      if (head === e) break;
      this._drop(head.key);
    }
    trimPool(e);
    return canvas;
  }

  /** Drop every sprite. */
  clear() {
    poolBytes -= this.bytes;
    this.bytes = 0;
    this._map.clear();
  }

  _drop(key) {
    const e = this._map.get(key);
    this._map.delete(key);
    this.bytes -= e.bytes;
    poolBytes -= e.bytes;
  }
}
