/**
 * Power cells: the campaign's reason to leave the main corridor.
 *
 * Most campaign maps run a spine from the start straight to the exit, and
 * about two thirds of each floor — offices, cell rows, supply rooms — never
 * has to be entered. On a gated level the exit's extraction beacon stays
 * sealed until the player recovers the level's power cells, which are placed
 * here, off the direct route: every map gets them without hand-editing, the
 * same cells every run (seeded by the level's own seed).
 *
 * Pure: grids in, cell positions out.
 */

import { SeededRNG } from "../utils/seeded-rng.js";

const FLOOR = 0;
const DOOR = 5; // opened by interacting; walkable for planning
// Extra steps a cell must cost to visit, beyond the direct route. Relaxed
// once on cramped maps that have too few such cells.
const MIN_DETOUR = 10;
const MIN_DETOUR_RELAXED = 5;
// Nor so far off that the cell is a second level's worth of backtracking.
const MAX_DETOUR_FACTOR = 1.6;
// Keep cells apart from the start, the exit and each other (cells).
const CLEAR_OF_ENDS = 7;

const walkable = (v) => v === FLOOR || v === DOOR;

/** Steps from (sx, sy) to every reachable cell over floor and doors; -1 if unreachable. */
export function stepsFrom(grid, sx, sy) {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const dist = new Int32Array(w * h).fill(-1);
  const x0 = sx | 0;
  const y0 = sy | 0;
  if (y0 < 0 || y0 >= h || x0 < 0 || x0 >= w || !walkable(grid[y0][x0])) return { dist, w, h };
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  dist[y0 * w + x0] = 0;
  queue[tail++] = y0 * w + x0;
  while (head < tail) {
    const i = queue[head++];
    const x = i % w;
    const y = (i / w) | 0;
    const d = dist[i] + 1;
    if (x > 0 && dist[i - 1] < 0 && walkable(grid[y][x - 1])) { dist[i - 1] = d; queue[tail++] = i - 1; }
    if (x < w - 1 && dist[i + 1] < 0 && walkable(grid[y][x + 1])) { dist[i + 1] = d; queue[tail++] = i + 1; }
    if (y > 0 && dist[i - w] < 0 && walkable(grid[y - 1][x])) { dist[i - w] = d; queue[tail++] = i - w; }
    if (y < h - 1 && dist[i + w] < 0 && walkable(grid[y + 1][x])) { dist[i + w] = d; queue[tail++] = i + w; }
  }
  return { dist, w, h };
}

/**
 * Where to put `count` power cells on a map: reachable floor off the direct
 * start→exit route, spread out, clear of the start and the exit. Returns
 * [{x, y}] at cell centres, possibly fewer than `count` on a cramped map,
 * or [] when the exit cannot be reached at all.
 */
export function planPowerCells(grid, start, exit, count, seed = 1) {
  if (!grid?.length || !start || !exit || count <= 0) return [];
  const fromStart = stepsFrom(grid, start.x, start.y);
  const toExit = stepsFrom(grid, exit.x, exit.y);
  const { w, h } = fromStart;
  const route = fromStart.dist[(exit.y | 0) * w + (exit.x | 0)];
  if (route <= 0) return [];

  const pick = (minDetour) => {
    const out = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (grid[y][x] !== FLOOR) continue;
        const i = y * w + x;
        const a = fromStart.dist[i];
        const b = toExit.dist[i];
        if (a < 0 || b < 0) continue;
        const detour = a + b - route;
        if (detour < minDetour || detour > route * MAX_DETOUR_FACTOR) continue;
        // A cell in the open, not wedged into a wall's corner.
        let open = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (grid[y + dy]?.[x + dx] === FLOOR) open++;
        if (open < 3) continue;
        const cx = x + 0.5;
        const cy = y + 0.5;
        if (Math.hypot(cx - start.x, cy - start.y) < CLEAR_OF_ENDS) continue;
        if (Math.hypot(cx - exit.x, cy - exit.y) < CLEAR_OF_ENDS) continue;
        out.push({ x: cx, y: cy, detour });
      }
    }
    return out;
  };
  let candidates = pick(MIN_DETOUR);
  if (candidates.length < count * 4) candidates = pick(MIN_DETOUR_RELAXED);
  if (!candidates.length) return [];

  // Farthest-point sampling from a seeded first pick among the deeper half,
  // so cells land in different rooms rather than one cluster.
  const rng = new SeededRNG(seed);
  candidates.sort((p, q) => q.detour - p.detour || p.y - q.y || p.x - q.x);
  const deep = candidates.slice(0, Math.max(1, Math.ceil(candidates.length / 2)));
  const chosen = [deep[Math.floor(rng.next() * deep.length)]];
  while (chosen.length < count) {
    let best = null;
    let bestD = -1;
    for (const c of candidates) {
      let d = Infinity;
      for (const s of chosen) d = Math.min(d, Math.hypot(c.x - s.x, c.y - s.y));
      // Prefer the farther-off-route cell among near-equally spread ones.
      const score = d + c.detour * 0.05;
      if (score > bestD) {
        bestD = score;
        best = c;
      }
    }
    if (!best || bestD < 6) break;
    chosen.push(best);
  }
  return chosen.map(({ x, y }) => ({ x, y }));
}

/**
 * How many cells a campaign level holds shut, or 0 when it is not gated:
 * no exit (a boss arena), or the level already gates itself — an objective,
 * a teach room's seal, a collapse chase or a loop.
 */
export function powerCellsFor(map, setPiece, act, level) {
  if (!map?.exit || !map.playerStart) return 0;
  if (map.objective || setPiece?.objective) return 0;
  if (setPiece?.teach) return 0;
  const hazards = [...(setPiece?.hazards ?? []), ...(map.hazards ?? [])];
  if (hazards.some((hz) => hz.type === "collapse" || hz.type === "loop")) return 0;
  // Two in the opening levels, three after.
  return act === 1 && level < 3 ? 2 : 3;
}

/**
 * Collect every power cell on the level and unseal the exit, as if the player
 * had found them all. Test tooling that walks or jumps to the exit uses it.
 */
export function collectAllPowerCells(game) {
  for (const e of game.entities ?? []) if (e.type === "powerCell") e.active = false;
  if (game.powerCells) game.powerCells.found = game.powerCells.total;
  if (game.exitEntity) game.exitEntity.sealed = false;
}
