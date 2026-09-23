// src/world/world-streamer.js
/**
 * Which columns of an endless world are resident. Each frame the streamer is
 * handed the camera's position and a time budget; it drops columns past the
 * unload radius (World.unloadColumn folds their edits first) and loads the
 * missing ones inside the load radius, nearest first, until the budget is
 * spent. Distances run from the camera's exact position to a column's centre,
 * so the resident set is a disc.
 *
 * Loading happens only inside the load radius and unloading only past the
 * wider unload radius. A player walking back and forth over a column border
 * therefore never loads and drops the same ring over and over.
 *
 * Bounded worlds have no streamer: every column in their bounds is resident
 * from the start, as it always was.
 */

/** Steady-state milliseconds a frame for loading and meshing together (spec §6). */
export const STEADY_MS = 3;
/** Milliseconds a frame while the ground around the camera is still arriving. */
export const LOADING_MS = 10;
/** The draw radius on the high tiers: the 160 blocks the Forge always drew. */
export const MAX_DRAW_RADIUS = 160;
/** Blocks over which the edge of the draw disc fades to full fog (decision #6). */
export const FOG_FADE = 16;

/** How far the camera moves before the streamer looks again at what to load and drop. */
const RESCAN = 2;
/** Columns around the camera that must be meshed before the steady budget applies. */
const NEAR = 2;

/**
 * Draw radius in blocks for a quality tier (decision #4). `quality.drawDistance`
 * counts raycaster tiles (8..20); it only picks the tier here.
 */
export function drawRadiusFor(quality) {
  const t = quality?.drawDistance ?? 20;
  return t >= 18 ? MAX_DRAW_RADIUS : t >= 14 ? 128 : t >= 10 ? 96 : 80;
}

/**
 * Every radius follows from the draw radius. A point within `draw` lies in a
 * column whose centre is within `draw + 8√2`; that column is meshed only with
 * its eight neighbours resident, whose centres are up to 16√2 further out.
 */
export function streamRadii(draw) {
  return { draw, mesh: draw + 12, load: draw + 36, unload: draw + 60 };
}

const streamers = new WeakMap();

/** The streamer of an endless world, made on first use; null for a bounded one. */
export function streamerFor(world) {
  if (!world?.endless) return null;
  let s = streamers.get(world);
  if (!s) streamers.set(world, (s = new WorldStreamer(world)));
  return s;
}

export class WorldStreamer {
  /**
   * @param {import("./world.js").World} world an endless world
   * @param {{drawRadius?:number, clock?:() => number}} [opts]
   */
  constructor(world, { drawRadius = MAX_DRAW_RADIUS, clock = () => performance.now() } = {}) {
    this.world = world;
    this.clock = clock;
    this.radii = streamRadii(drawRadius);
    // Missing columns inside the load radius, nearest first, as of the last scan.
    this._queue = [];
    this._next = 0;
    this._scanX = NaN; this._scanY = NaN;
    this.stats = { resident: 0, pending: 0, loaded: 0, unloaded: 0, ms: 0 };
  }

  setDrawRadius(d) {
    if (d === this.radii.draw) return;
    this.radii = streamRadii(d);
    this._scanX = NaN; // look again at once
  }

  /**
   * The budget for this frame: the loading one until the 5 × 5 columns
   * around the camera are resident and meshed, then the steady one.
   */
  budget(x, y) {
    const w = this.world, cx = Math.floor(x) >> 4, cy = Math.floor(y) >> 4;
    for (let dy = -NEAR; dy <= NEAR; dy++) for (let dx = -NEAR; dx <= NEAR; dx++) {
      if (!w.columnInBounds(cx + dx, cy + dy)) continue;
      if (!w.column(cx + dx, cy + dy)) return LOADING_MS;
      for (let cz = 0; cz < 4; cz++) if (w.dirty.has(w.chunkIndex(cx + dx, cy + dy, cz))) return LOADING_MS;
    }
    return STEADY_MS;
  }

  /**
   * One frame of streaming. Unloading is cheap and never waits; loading stops
   * once `budgetMs` is spent, after at least one column.
   * @returns {number} milliseconds spent
   */
  update(x, y, budgetMs) {
    const t0 = this.clock();
    const st = this.stats;
    st.loaded = 0; st.unloaded = 0;
    if (!(Math.abs(x - this._scanX) < RESCAN && Math.abs(y - this._scanY) < RESCAN)) this._scan(x, y);
    const w = this.world, q = this._queue;
    while (this._next < q.length) {
      if (st.loaded > 0 && this.clock() - t0 >= budgetMs) break;
      const c = q[this._next++];
      if (w.column(c.cx, c.cy)) continue;
      w.ensureColumn(c.cx, c.cy);
      st.loaded++;
    }
    st.resident = w.columns.size;
    st.pending = q.length - this._next;
    st.ms = this.clock() - t0;
    return st.ms;
  }

  /** Drop what is past the unload radius and queue what is missing inside the load radius. */
  _scan(x, y) {
    this._scanX = x; this._scanY = y;
    const w = this.world, { load, unload } = this.radii;
    const far = [];
    for (const col of w.columns.values()) {
      if (Math.hypot(col.cx * 16 + 8 - x, col.cy * 16 + 8 - y) > unload) far.push(col);
    }
    for (const col of far) w.unloadColumn(col.cx, col.cy);
    this.stats.unloaded = far.length;

    const q = this._queue;
    q.length = 0; this._next = 0;
    const n = Math.ceil(load / 16) + 1, pcx = Math.floor(x) >> 4, pcy = Math.floor(y) >> 4;
    for (let cy = pcy - n; cy <= pcy + n; cy++) for (let cx = pcx - n; cx <= pcx + n; cx++) {
      const d = Math.hypot(cx * 16 + 8 - x, cy * 16 + 8 - y);
      if (d > load || w.column(cx, cy) || !w.columnInBounds(cx, cy)) continue;
      q.push({ cx, cy, d });
    }
    q.sort((a, b) => a.d - b.d);
  }
}
