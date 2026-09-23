/**
 * Spatial hash grid for efficient proximity queries.
 *
 * Replaces O(n) linear scans with O(k) lookups where k = nearby entities.
 * Used by physics, combat, and AI systems.
 */

export class SpatialGrid {
  constructor(cellSize = 2) {
    this.cells = new Map();
    this.cellSize = cellSize;
    this.invCellSize = 1 / cellSize;
  }

  /** Clear all cells. Call once per frame before re-inserting entities. */
  clear() {
    this.cells.clear();
  }

  /** Hash (cellX, cellY) into a single integer key. */
  _key(cx, cy) {
    // Cantor pairing — works for non-negative integers.
    // Shift by 1000 to handle the typical map size range.
    const a = cx + 1000;
    const b = cy + 1000;
    return ((a + b) * (a + b + 1)) / 2 + b;
  }

  /** Insert an entity into the grid. */
  insert(entity) {
    const cx = Math.floor(entity.x * this.invCellSize);
    const cy = Math.floor(entity.y * this.invCellSize);
    const k = this._key(cx, cy);
    const cell = this.cells.get(k);
    if (cell) cell.push(entity);
    else this.cells.set(k, [entity]);
  }

  /** Insert all active entities from an array. */
  insertAll(entities) {
    for (const e of entities) {
      if (e.active) this.insert(e);
    }
  }

  /**
   * Query all entities within a rectangular region centered on (x, y)
   * with the given radius. Returns entities from all overlapping cells.
   *
   * The caller should still do a precise distance check on results.
   */
  query(x, y, radius) {
    const minCX = Math.floor((x - radius) * this.invCellSize);
    const maxCX = Math.floor((x + radius) * this.invCellSize);
    const minCY = Math.floor((y - radius) * this.invCellSize);
    const maxCY = Math.floor((y + radius) * this.invCellSize);

    const results = [];
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const cell = this.cells.get(this._key(cx, cy));
        if (cell) {
          for (const e of cell) {
            if (e.active) results.push(e);
          }
        }
      }
    }
    return results;
  }

  /** Count of occupied cells. Useful for debugging. */
  get size() {
    return this.cells.size;
  }
}
