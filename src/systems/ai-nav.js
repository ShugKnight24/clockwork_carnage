/**
 * Enemy navigation and aim helpers for the grid AI (src/systems/ai.js).
 *
 * Enemies used to steer in a straight line at the player and stall against
 * the first wall in the way, so a fight came to you one enemy at a time, or
 * not at all. Here:
 *   - navField: a BFS distance field over open floor to a target cell,
 *     shared by every enemy heading there and rebuilt when it goes stale;
 *   - navAngle: which way to step from a position to get closer along it;
 *   - leadPoint: where to aim a shot so it meets a moving target.
 *
 * Pure: grids and numbers in, numbers out. No game state.
 */

const OPEN = 0;

/** How long a field stays trusted (seconds of game time): doors open, walls shift. */
export const FIELD_TTL = 0.5;

/**
 * Steps from every cell to (tx, ty) over open floor (-1: unreachable), with
 * diagonal moves where both side cells are open (no corner cutting). The
 * target's own cell counts even if it is not floor: an enemy can still come
 * up beside someone standing in a doorway.
 * @returns {{ dist: Float32Array, w: number, h: number, tx: number, ty: number }}
 */
export function buildNavField(map, tx, ty) {
  const w = map.width;
  const h = map.height;
  const gx = Math.floor(tx);
  const gy = Math.floor(ty);
  const dist = new Float32Array(w * h).fill(-1);
  const field = { dist, w, h, tx: gx, ty: gy };
  if (gx < 0 || gy < 0 || gx >= w || gy >= h) return field;
  const open = (x, y) => x >= 0 && y >= 0 && x < w && y < h && map.grid[y][x] === OPEN;
  // A small bucketed Dijkstra: straight steps cost 1, diagonals √2.
  const queue = [gy * w + gx];
  dist[gy * w + gx] = 0;
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    const x = i % w;
    const y = (i / w) | 0;
    const d = dist[i];
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (!ox && !oy) continue;
        const nx = x + ox;
        const ny = y + oy;
        if (!open(nx, ny)) continue;
        if (ox && oy && (!open(x + ox, y) || !open(x, y + oy))) continue;
        const nd = d + (ox && oy ? Math.SQRT2 : 1);
        const j = ny * w + nx;
        if (dist[j] >= 0 && dist[j] <= nd) continue;
        dist[j] = nd;
        queue.push(j);
      }
    }
  }
  return field;
}

/**
 * A cache of fields by target cell, so a dozen enemies chasing one player
 * share one search. `now` is game time in seconds.
 */
export class NavFields {
  constructor() {
    this._fields = new Map();
  }

  get(map, tx, ty, now) {
    const key = `${Math.floor(tx)},${Math.floor(ty)}`;
    const f = this._fields.get(key);
    if (f && f.map === map && now - f.at < FIELD_TTL) return f.field;
    if (this._fields.size > 32) this._fields.clear();
    const field = buildNavField(map, tx, ty);
    this._fields.set(key, { map, at: now, field });
    return field;
  }

  clear() {
    this._fields.clear();
  }
}

/** Steps from (x, y) to the field's target, or -1 when it cannot get there. */
export function navSteps(field, x, y) {
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  if (cx < 0 || cy < 0 || cx >= field.w || cy >= field.h) return -1;
  return field.dist[cy * field.w + cx];
}

/**
 * The heading that takes (x, y) one cell closer to the field's target: toward
 * the centre of the best neighbouring cell. Null when already in the target
 * cell or when there is no way there.
 */
export function navAngle(field, x, y) {
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  const { w, h, dist } = field;
  if (cx < 0 || cy < 0 || cx >= w || cy >= h) return null;
  const here = dist[cy * w + cx];
  if (here === 0) return null;
  let best = here < 0 ? Infinity : here;
  let bx = -1;
  let by = -1;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      if (!ox && !oy) continue;
      const nx = cx + ox;
      const ny = cy + oy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const d = dist[ny * w + nx];
      if (d < 0 || d >= best) continue;
      // No corner cutting from a cell the field does not know (off the
      // floor, or the start of an unreachable pocket).
      if (ox && oy && (dist[cy * w + nx] < 0 || dist[ny * w + cx] < 0)) continue;
      best = d;
      bx = nx;
      by = ny;
    }
  }
  if (bx < 0) return null;
  return Math.atan2(by + 0.5 - y, bx + 0.5 - x);
}

/**
 * Where to aim a round of `speed` (units/s) fired from (sx, sy) so it meets a
 * target at (tx, ty) moving at (vx, vy), led by `lead` (0 aims at where it
 * is, 1 at where it will be). The flight time is capped so a long shot at a
 * runner does not aim at the next room.
 */
export function leadPoint(sx, sy, tx, ty, vx, vy, speed, lead = 0.5, maxT = 1.2) {
  if (!(speed > 0) || !(lead > 0)) return { x: tx, y: ty };
  const t = Math.min(maxT, Math.hypot(tx - sx, ty - sy) / speed) * lead;
  return { x: tx + vx * t, y: ty + vy * t };
}
