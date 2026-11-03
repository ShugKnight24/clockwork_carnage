// tests/tools/map-checks.js
// Static checks on an authored tile map, shared by the map-integrity unit
// test and `npm run validate:maps`. Pure: no DOM, no game state.
//
// Reachability uses the same passability the game does: floor (0) is
// walkable, and doors (5) and secret walls (6) become floor when the player
// interacts with them. Cells a map lists under `doors` open too (the
// tutorial's scripted doors). Nothing else in the grid changes at runtime.

export const OPENABLE = new Set([0, 5, 6]);

const cell = (p) => [Math.floor(p.x), Math.floor(p.y)];
const key = (x, y) => `${x},${y}`;

/** Cells the map opens by script: `doors: { name: [{x, y}, …] }`. */
function doorCells(level) {
  const out = new Set();
  for (const cells of Object.values(level.doors || {})) {
    for (const c of Array.isArray(cells) ? cells : []) out.add(key(c.x, c.y));
  }
  return out;
}

/** Every cell the player can reach from playerStart, as "x,y" keys. */
export function reachableFrom(level) {
  const doors = doorCells(level);
  const [sx, sy] = cell(level.playerStart);
  const seen = new Set([key(sx, sy)]);
  const queue = [[sx, sy]];
  for (let i = 0; i < queue.length; i++) {
    const [cx, cy] = queue[i];
    for (const [nx, ny] of [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= level.width || ny >= level.height) continue;
      const k = key(nx, ny);
      if (seen.has(k) || !(OPENABLE.has(level.grid[ny][nx]) || doors.has(k))) continue;
      seen.add(k);
      queue.push([nx, ny]);
    }
  }
  return seen;
}

export const entityLabel = (e) => `${e.enemyType || e.type}@${Math.floor(e.x)},${Math.floor(e.y)}`;

/** What a level places for the player to meet: campaign `entities`, the tutorial's `pickups`. */
export const placedEntities = (level) => [...(level.entities || []), ...(level.pickups || [])];

/**
 * Every problem with a map, as readable strings; [] when it is sound.
 * Checks the grid's dimensions, the start on open floor, the exit (when the
 * level has one; a boss level ends on the kill) on reachable floor, and every
 * placed entity on open, reachable floor.
 */
export function mapProblems(level) {
  const out = [];
  const { width: w, height: h, grid } = level;
  if (!Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0) return [`bad dimensions ${w}×${h}`];
  if (!Array.isArray(grid) || grid.length !== h) return [`grid has ${grid?.length} rows, height is ${h}`];
  grid.forEach((row, y) => {
    if (row.length !== w) out.push(`row ${y} has ${row.length} cells, width is ${w}`);
  });
  if (out.length) return out;

  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  const [sx, sy] = cell(level.playerStart || { x: -1, y: -1 });
  if (!inside(sx, sy)) return [`playerStart ${sx},${sy} is outside the grid`];
  if (grid[sy][sx] !== 0) out.push(`playerStart ${sx},${sy} is on tile ${grid[sy][sx]}, not floor`);

  const reach = reachableFrom(level);
  if (level.exit) {
    const [ex, ey] = cell(level.exit);
    if (!inside(ex, ey)) out.push(`exit ${ex},${ey} is outside the grid`);
    else if (grid[ey][ex] !== 0) out.push(`exit ${ex},${ey} is on tile ${grid[ey][ex]}, not floor`);
    else if (!reach.has(key(ex, ey))) out.push(`exit ${ex},${ey} cannot be reached from the start`);
  }
  for (const e of placedEntities(level)) {
    const [x, y] = cell(e);
    if (!inside(x, y)) out.push(`${entityLabel(e)} is outside the grid`);
    else if (grid[y][x] !== 0) out.push(`${entityLabel(e)} is on tile ${grid[y][x]}, not floor`);
    else if (!reach.has(key(x, y))) out.push(`${entityLabel(e)} cannot be reached from the start`);
  }
  return out;
}
