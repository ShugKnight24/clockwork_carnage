// src/world/world.js
import { AIR, BEDROCK } from "./blocks.js";

const H = 64, CS = 16, CZ = H / CS; // 4 render chunks stacked in a column
const COLUMN_CELLS = CS * CS * H;   // 16384

/**
 * Endless worlds will stop at ±2²⁰ blocks. The border is what keeps every
 * column key below 2³⁴ and every chunk key below 2³⁶, so both are exact in a
 * double and a Map can key on plain numbers.
 */
const BORDER = 1 << 20;
const KEY_OFF = 65536, KEY_SPAN = 131072;

/** The 128 × 128 box every world had before columns, and still the default. */
export const DEFAULT_BOUNDS = Object.freeze({ x0: 0, y0: 0, x1: 128, y1: 128 });

/**
 * A bounded world keeps every column in its bounds resident. That is fine for
 * the 64 columns of the default box; far more than this is a world that needs
 * the streamer, which does not exist yet.
 */
const MAX_RESIDENT = 4096;

const SLOTS = 256;             // direct-mapped column cache, 16 × 16
const NO_COLUMN = 0x7fffffff;  // outside any column coordinate, so never matches
const NO_BLOCKS = new Uint8Array(0);

/** Packed column key; `cx`, `cy` are column (chunk) coordinates, not blocks. */
export const colKey = (cx, cy) => (cx + KEY_OFF) * KEY_SPAN + (cy + KEY_OFF);

/**
 * Decode a render chunk key into `out` as [cx, cy, cz]. Writes into the
 * caller's array so a sort comparator can decode without allocating.
 */
export function chunkKeyCoords(key, out) {
  const cz = key % CZ;
  const col = (key - cz) / CZ;
  const cy = col % KEY_SPAN;
  out[0] = (col - cy) / KEY_SPAN - KEY_OFF;
  out[1] = cy - KEY_OFF;
  out[2] = cz;
  return out;
}

function normBounds(b) {
  if (!b) return DEFAULT_BOUNDS;
  const { x0, y0, x1, y1 } = b;
  const ok = [x0, y0, x1, y1].every((v) => Number.isInteger(v) && v >= -BORDER && v <= BORDER);
  if (!ok || x0 >= x1 || y0 >= y1) throw new Error(`bad world bounds ${JSON.stringify(b)}`);
  return Object.freeze({ x0, y0, x1, y1 });
}

/**
 * Blocks live in 16 × 16 × 64 columns in a Map keyed by `colKey`, each one
 * `Uint8Array` indexed `(z * 16 + ly) * 16 + lx`. Coordinates are integers and
 * may be negative: `>> 4` and `& 15` floor and wrap correctly for them.
 *
 * Bounds come from `meta.bounds` and default to the 128 box. The default is
 * deliberately not written into `meta`, so a world that never chose bounds
 * saves exactly as it did before columns existed.
 */
export class World {
  static H = H; static GROUND = 32; static CS = CS; static CZ = CZ; static BORDER = BORDER;
  constructor(meta = {}) {
    this.bounds = normBounds(meta.bounds);
    const { x0, y0, x1, y1 } = this.bounds;
    // Unpacked copies for get(), which runs millions of times a second.
    this._x0 = x0; this._y0 = y0; this._x1 = x1; this._y1 = y1;
    this.meta = {
      name: "New World", act: 1,
      spawn: this.defaultSpawn(),
      exit: null, enemySpawns: [], pickups: [],
      ...meta,
    };
    this.columns = new Map(); // colKey -> { cx, cy, blocks, modified }
    this.dirty = new Set();   // render chunk keys waiting to be meshed
    this.version = 0; // bumps on every change; caches key off it
    // Two caches in front of the Map, whose keys are too big for V8's fast
    // small-integer path. The last column resolved catches runs of
    // neighbouring cells (physics sweeps, station scans, the mesher's copy);
    // a direct-mapped table of 16 × 16 columns catches reads that hop between
    // columns, and holds the whole default world.
    this._cx = NO_COLUMN; this._cy = NO_COLUMN; this._col = null; this._blk = NO_BLOCKS;
    // The part of the last column that is inside the bounds. get() tests only
    // this rectangle on a hit: four compares stand in for both the bounds check
    // and the column match. Empty until the first lookup.
    this._hx0 = 0; this._hx1 = 0; this._hy0 = 0; this._hy1 = 0;
    this._slotX = new Int32Array(SLOTS).fill(NO_COLUMN);
    this._slotY = new Int32Array(SLOTS).fill(NO_COLUMN);
    this._slotCol = new Array(SLOTS).fill(null);

    const cx0 = x0 >> 4, cy0 = y0 >> 4, cx1 = (x1 - 1) >> 4, cy1 = (y1 - 1) >> 4;
    if ((cx1 - cx0 + 1) * (cy1 - cy0 + 1) > MAX_RESIDENT) throw new Error("world bounds too large to hold resident");
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) this.ensureColumn(cx, cy);
  }

  /** Centre of the bounds, standing at ground level. */
  defaultSpawn() {
    const { x0, y0, x1, y1 } = this.bounds;
    return { x: Math.floor((x0 + x1) / 2) + 0.5, y: Math.floor((y0 + y1) / 2) + 0.5, z: World.GROUND, yaw: 0 };
  }

  columnKey(cx, cy) { return colKey(cx, cy); }

  /** The resident column at column coords, or undefined. Never creates one. */
  column(cx, cy) {
    if (cx === this._cx && cy === this._cy) return this._col;
    const s = ((cx & 15) << 4) | (cy & 15);
    let col;
    if (this._slotX[s] === cx && this._slotY[s] === cy) col = this._slotCol[s];
    else {
      col = this.columns.get(colKey(cx, cy));
      if (!col) return undefined;
      this._slotX[s] = cx; this._slotY[s] = cy; this._slotCol[s] = col;
    }
    this._cx = cx; this._cy = cy; this._col = col; this._blk = col.blocks;
    this._hx0 = Math.max(cx << 4, this._x0); this._hx1 = Math.min((cx << 4) + CS, this._x1);
    this._hy0 = Math.max(cy << 4, this._y0); this._hy1 = Math.min((cy << 4) + CS, this._y1);
    return col;
  }

  /** The column at column coords, created all-air (and queued for meshing) when missing. */
  ensureColumn(cx, cy) {
    let col = this.column(cx, cy);
    if (col) return col;
    col = { cx, cy, blocks: new Uint8Array(COLUMN_CELLS), modified: false };
    this.columns.set(colKey(cx, cy), col);
    for (let cz = 0; cz < CZ; cz++) this.dirty.add(this.chunkIndex(cx, cy, cz));
    return this.column(cx, cy);
  }

  inBounds(x, y, z) {
    return z >= 0 && z < H && x >= this._x0 && y >= this._y0 && x < this._x1 && y < this._y1;
  }

  /** Inside the bounds and in a resident column (block coordinates). */
  isLoaded(x, y) {
    if (x < this._x0 || y < this._y0 || x >= this._x1 || y >= this._y1) return false;
    return this.column(x >> 4, y >> 4) !== undefined;
  }

  get(x, y, z) {
    if (z < 0) return BEDROCK;
    if (z >= H) return AIR;
    if (x >= this._hx0 && x < this._hx1 && y >= this._hy0 && y < this._hy1) {
      return this._blk[(z << 8) | ((y & 15) << 4) | (x & 15)];
    }
    // Kept out of get() so the hit path above stays small enough to inline.
    return this._getMiss(x, y, z);
  }

  _getMiss(x, y, z) {
    if (x < this._x0 || y < this._y0 || x >= this._x1 || y >= this._y1) return AIR;
    const col = this.column(x >> 4, y >> 4);
    return col ? col.blocks[(z << 8) | ((y & 15) << 4) | (x & 15)] : AIR;
  }

  /** @returns {boolean} true when the block changed */
  set(x, y, z, id) {
    if (!this.inBounds(x, y, z)) return false;
    const cx = x >> 4, cy = y >> 4;
    const col = this.ensureColumn(cx, cy);
    const i = (z << 8) | ((y & 15) << 4) | (x & 15);
    if (col.blocks[i] === id) return false;
    col.blocks[i] = id;
    col.modified = true;
    this.version++;
    const cz = z >> 4;
    this.markDirty(cx, cy, cz);
    // A block on a chunk face changes the neighbour chunk's hidden-face test.
    // markDirty ignores chunks that are not resident, so no clamps here.
    const lx = x & 15, ly = y & 15, lz = z & 15;
    if (lx === 0) this.markDirty(cx - 1, cy, cz);
    if (lx === 15) this.markDirty(cx + 1, cy, cz);
    if (ly === 0) this.markDirty(cx, cy - 1, cz);
    if (ly === 15) this.markDirty(cx, cy + 1, cz);
    if (lz === 0) this.markDirty(cx, cy, cz - 1);
    if (lz === 15) this.markDirty(cx, cy, cz + 1);
    return true;
  }

  /**
   * Copy the box [x0, x0 + sx) × [y0, y0 + sy) × [z0, z0 + sz) into `out`,
   * indexed `(z * sy + y) * sx + x`, answering exactly what get() would. One
   * column lookup per (x, y), not per cell, which is what makes the mesher's
   * padded copy cheap.
   */
  readBox(x0, y0, z0, sx, sy, sz, out) {
    const plane = sx * sy;
    for (let y = 0; y < sy; y++) {
      const wy = y0 + y;
      for (let x = 0; x < sx; x++) {
        const wx = x0 + x;
        const col = wx >= this._x0 && wy >= this._y0 && wx < this._x1 && wy < this._y1
          ? this.column(wx >> 4, wy >> 4) : undefined;
        const off = ((wy & 15) << 4) | (wx & 15);
        let o = y * sx + x;
        for (let z = 0; z < sz; z++, o += plane) {
          const wz = z0 + z;
          out[o] = wz < 0 ? BEDROCK : wz >= H || !col ? AIR : col.blocks[(wz << 8) | off];
        }
      }
    }
    return out;
  }

  /** Render chunk key: `colKey * 4 + cz`, exact up to the border. */
  chunkIndex(cx, cy, cz) { return colKey(cx, cy) * CZ + cz; }
  chunkCoords(key) { return chunkKeyCoords(key, [0, 0, 0]); }

  /** Queue a chunk for meshing. Chunks outside the resident columns are ignored. */
  markDirty(cx, cy, cz) {
    if (cz < 0 || cz >= CZ || !this.column(cx, cy)) return;
    this.dirty.add(this.chunkIndex(cx, cy, cz));
  }

  /** Queue every resident chunk, e.g. after the atlas or GL context was rebuilt. */
  markAllDirty() {
    for (const col of this.columns.values()) for (let cz = 0; cz < CZ; cz++) this.dirty.add(this.chunkIndex(col.cx, col.cy, cz));
  }

  /** Dirty chunk keys, cleared as they are handed out. */
  takeDirty() {
    const out = [...this.dirty];
    this.dirty.clear();
    return out;
  }

  /** z of the highest solid block in a column, or -1. */
  topSolid(x, y) {
    if (x < this._x0 || y < this._y0 || x >= this._x1 || y >= this._y1) return -1;
    const col = this.column(x >> 4, y >> 4);
    if (!col) return -1;
    const off = ((y & 15) << 4) | (x & 15);
    for (let z = H - 1; z >= 0; z--) if (col.blocks[(z << 8) | off] !== AIR) return z;
    return -1;
  }

  /** Non-air cells across the resident columns. */
  countBlocks() {
    let n = 0;
    for (const col of this.columns.values()) {
      const b = col.blocks;
      for (let i = 0; i < b.length; i++) if (b[i] !== AIR) n++;
    }
    return n;
  }

  /** Every resident chunk. */
  forEachChunk(fn) {
    for (const col of this.columns.values()) for (let cz = 0; cz < CZ; cz++) fn(col.cx, col.cy, cz, this.chunkIndex(col.cx, col.cy, cz));
  }
}
