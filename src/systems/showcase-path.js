/**
 * A slow looping camera path through a campaign map for the settings
 * showcase (and later the sizzle reel). It looks for the biggest real loop —
 * out through the level and back by another way — of 5–7 waypoints that can
 * each see the next with room to spare and never turn back on themselves, so
 * the camera sweeps halls instead of pacing the spawn corridor (a dead end in
 * most levels, where a loop has nowhere to go). The loop begins at its
 * waypoint nearest the player start. The camera rides a closed Catmull-Rom
 * curve that rounds each corner just inside its waypoint (see curveOf), and
 * that curve is checked against the walls before a loop is accepted.
 */

// Packs a cell into one number for Set lookups; wider than any map can be.
const CELL_KEY = 1 << 16;
const isOpen = (grid, x, y) => grid[y]?.[x] === 0;

/** Sample the segment every quarter cell; any wall sample blocks it. */
export function hasLineOfSight(grid, a, b) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(1, Math.ceil(d * 4));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (!isOpen(grid, Math.floor(a.x + (b.x - a.x) * t), Math.floor(a.y + (b.y - a.y) * t))) return false;
  }
  return true;
}

// Longest loop, in cells: 40 s round it is 3 cells/s, a little under the player's run.
const MAX_LOOP = 120;
const MIN_LEG = 3;
// Sharper than this reads as the camera snapping round, not sweeping.
const MAX_TURN = (100 * Math.PI) / 180;
// Leg corridors and curve samples keep this far from walls, so the near plane never grazes one.
const LEG_MARGIN = 0.35;
const CURVE_MARGIN = 0.3;
const WALKS = 4000;
// The camera cuts each corner this many cells before its waypoint (see curveOf).
const CHAMFER = 2;
// Turns gentler than this keep their waypoint as a single control point.
const CHAMFER_TURN = (20 * Math.PI) / 180;

/** Chebyshev distance of each open cell to the nearest wall or edge (1 = touching one). */
function clearance(grid) {
  const h = grid.length;
  const w = grid[0].length;
  const c = grid.map((row) => row.map(() => 0));
  const queue = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isOpen(grid, x, y)) continue;
      let edge = false;
      for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) if (!isOpen(grid, x + dx, y + dy)) edge = true;
      if (edge) {
        c[y][x] = 1;
        queue.push([x, y]);
      }
    }
  }
  for (let q = 0; q < queue.length; q++) {
    const [x, y] = queue[q];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (isOpen(grid, nx, ny) && c[ny][nx] === 0) {
          c[ny][nx] = c[y][x] + 1;
          queue.push([nx, ny]);
        }
      }
    }
  }
  return c;
}

// Doors and secret walls: shut in the showcase, but the player walks through them.
const PASSABLE = new Set([0, 5, 6]);

/** Cells the player can reach from the start (spawn rooms are often sealed by a door). */
function reachable(grid, sx, sy) {
  const seen = new Set([sy * CELL_KEY + sx]);
  const queue = [[sx, sy]];
  for (let q = 0; q < queue.length; q++) {
    const [x, y] = queue[q];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!PASSABLE.has(grid[ny]?.[nx]) || seen.has(ny * CELL_KEY + nx)) continue;
      seen.add(ny * CELL_KEY + nx);
      queue.push([nx, ny]);
    }
  }
  return seen;
}

/** Line of sight along the leg and two parallels either side of it. */
function wideSight(grid, a, b, margin) {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ox = (-(b.y - a.y) / d) * margin, oy = ((b.x - a.x) / d) * margin;
  return (
    hasLineOfSight(grid, a, b) &&
    hasLineOfSight(grid, { x: a.x + ox, y: a.y + oy }, { x: b.x + ox, y: b.y + oy }) &&
    hasLineOfSight(grid, { x: a.x - ox, y: a.y - oy }, { x: b.x - ox, y: b.y - oy })
  );
}

function turn(a, b, c) {
  return turnBetween(Math.atan2(b.y - a.y, b.x - a.x), Math.atan2(c.y - b.y, c.x - b.x));
}

function turnBetween(h0, h1) {
  const d = Math.abs(h1 - h0);
  return d > Math.PI ? 2 * Math.PI - d : d;
}

const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

/** Every point of the camera's curve, and a margin round it, sits in an open cell. */
function curveClear(grid, points) {
  const { ctrl } = curveOf(points);
  const n = ctrl.length;
  for (let i = 0; i < n; i++) {
    const p = (o) => ctrl[(i + o + n) % n];
    const steps = Math.ceil(dist(p(0), p(1)) * 5);
    for (let k = 0; k < steps; k++) {
      const s = catmull(p(-1), p(0), p(1), p(2), k / steps);
      for (const [dx, dy] of MARGIN_PROBES) if (!isOpen(grid, Math.floor(s.x + dx), Math.floor(s.y + dy))) return false;
    }
  }
  return true;
}

const MARGIN_PROBES = [[0, 0], [CURVE_MARGIN, 0], [-CURVE_MARGIN, 0], [0, CURVE_MARGIN], [0, -CURVE_MARGIN]];

/**
 * Search waypoint candidates (roomy cells on a lattice, reachable from the
 * start) for the longest, roomiest loop under MAX_LOOP whose curve stays
 * clear of the walls. Returns null when the level has no such loop.
 */
function searchLoop(grid, start, { minClear, stride, maxTurn, minPoints, maxPoints }) {
  const clear = clearance(grid);
  const reach = reachable(grid, Math.floor(start.x), Math.floor(start.y));
  const nodes = [];
  for (let y = 0; y < grid.length; y += stride) {
    for (let x = 0; x < grid[y].length; x += stride) {
      if (clear[y][x] >= minClear && reach.has(y * CELL_KEY + x)) nodes.push({ x: x + 0.5, y: y + 0.5 });
    }
  }
  if (nodes.length < minPoints) return null;
  const adj = nodes.map(() => []);
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = dist(nodes[i], nodes[j]);
      if (d < MIN_LEG || d > MAX_LOOP / 2 || !wideSight(grid, nodes[i], nodes[j], LEG_MARGIN)) continue;
      adj[i].push(j);
      adj[j].push(i);
    }
  }
  const linked = new Set();
  const links = (i, j) => (i < j ? i * 65536 + j : j * 65536 + i);
  adj.forEach((ns, i) => ns.forEach((j) => linked.add(links(i, j))));

  // Seeded random walks rather than a beam: a beam crowds onto one route and
  // small changes to a level swing its result, while many independent walks
  // that favour long legs find the big sweeps reliably. Fixed seed, so a given
  // level always gets the same path.
  const rand = mulberry32(nodes.length * 7919 + grid.length);
  const closed = [];
  const found = new Set();
  for (let w = 0; w < WALKS; w++) {
    const seed = Math.floor(rand() * nodes.length);
    const home = nodes[seed];
    const path = [seed];
    let heading = null;
    let len = 0;
    while (path.length < maxPoints) {
      const last = path[path.length - 1];
      const options = [];
      let total = 0;
      for (const j of adj[last]) {
        if (path.includes(j)) continue;
        const h = Math.atan2(nodes[j].y - nodes[last].y, nodes[j].x - nodes[last].x);
        if (heading !== null && turnBetween(heading, h) > maxTurn) continue;
        const d = dist(nodes[last], nodes[j]);
        if (len + d + dist(nodes[j], home) > MAX_LOOP) continue;
        options.push([j, h, d]);
        total += d * d;
      }
      if (!options.length) break;
      let pick = rand() * total;
      let o = options[options.length - 1];
      for (const opt of options) if ((pick -= opt[2] * opt[2]) <= 0) { o = opt; break; }
      const [j, h, d] = o;
      path.push(j);
      heading = h;
      len += d;
      if (path.length < minPoints || !linked.has(links(j, seed))) continue;
      if (turn(nodes[last], nodes[j], home) > maxTurn || turn(nodes[j], home, nodes[path[1]]) > maxTurn) continue;
      // Walks find the same loop from many starts; check each loop once.
      const key = [...path].sort((x, y) => x - y).join();
      if (found.has(key)) continue;
      found.add(key);
      const loop = path.map((k) => nodes[k]);
      closed.push({ score: len + dist(nodes[j], home) + Math.sqrt(area(loop)), loop });
    }
  }
  // The curve check is the costly part: run it best-first and stop at the first loop that passes.
  closed.sort((a, b) => b.score - a.score);
  return closed.find((c) => curveClear(grid, c.loop))?.loop ?? null;
}

/** Small deterministic PRNG (mulberry32). */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shoelace area: a loop that encloses space sweeps a room, a thin one paces it. */
function area(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

// A coarse lattice first (fast, long legs); a finer one with sharper turns for cramped levels.
const TIERS = [
  { minClear: 2, stride: 3, maxTurn: MAX_TURN },
  { minClear: 2, stride: 2, maxTurn: (135 * Math.PI) / 180 },
];

/**
 * Last resort for a level with no loop at all (one dead-end room): a small
 * orbit of the open cells nearest the start, every leg in line of sight.
 */
function orbitNearStart(grid, start, minPoints) {
  const sx = Math.floor(start.x), sy = Math.floor(start.y);
  for (let r = 3; r >= 1; r--) {
    const pts = [];
    for (let i = 0; i < minPoints; i++) {
      const a = (i / minPoints) * Math.PI * 2 + Math.PI;
      pts.push({ x: Math.floor(sx + r + Math.cos(a) * r) + 0.5, y: Math.floor(sy + Math.sin(a) * r) + 0.5 });
    }
    pts[0] = start;
    const ok = pts.every((p, i) => isOpen(grid, Math.floor(p.x), Math.floor(p.y)) && hasLineOfSight(grid, p, pts[(i + 1) % pts.length]));
    if (ok) return pts;
  }
  return Array.from({ length: minPoints }, () => ({ ...start }));
}

/**
 * @param {{ grid: number[][], playerStart: { x: number, y: number } }} map
 * @returns {{ x: number, y: number }[]} waypoints at open-cell centres, first = the one nearest the player start
 */
export function buildShowcasePath(map, { maxPoints = 7, minPoints = 5 } = {}) {
  const start = { x: Math.floor(map.playerStart.x) + 0.5, y: Math.floor(map.playerStart.y) + 0.5 };
  for (const tier of TIERS) {
    const loop = searchLoop(map.grid, start, { ...tier, minPoints, maxPoints });
    if (!loop) continue;
    // Begin (and end) at the waypoint nearest where the player would spawn.
    let k = 0;
    for (let i = 1; i < loop.length; i++) if (dist(loop[i], start) < dist(loop[k], start)) k = i;
    return [...loop.slice(k), ...loop.slice(0, k)];
  }
  return orbitNearStart(map.grid, start, minPoints);
}

/**
 * Centripetal Catmull-Rom (Barry–Goldman form). Uniform Catmull-Rom swings
 * wide wherever a long leg meets a short one, straight into the wall the
 * short leg was dodging; the centripetal knots keep the curve close to its
 * legs and never form a cusp.
 */
function catmull(p0, p1, p2, p3, t) {
  const knot = (a, b) => Math.max(1e-4, Math.sqrt(dist(a, b)));
  const t1 = knot(p0, p1);
  const t2 = t1 + knot(p1, p2);
  const t3 = t2 + knot(p2, p3);
  const u = t1 + (t2 - t1) * t;
  const lerp = (a, b, ta, tb) => {
    const w = (u - ta) / (tb - ta);
    return { x: a.x + (b.x - a.x) * w, y: a.y + (b.y - a.y) * w };
  };
  const a1 = lerp(p0, p1, 0, t1);
  const a2 = lerp(p1, p2, t1, t2);
  const a3 = lerp(p2, p3, t2, t3);
  const b1 = lerp(a1, a2, 0, t2);
  const b2 = lerp(a2, a3, t1, t3);
  return lerp(b1, b2, t1, t2);
}

const STEPS = 32;
const curves = new WeakMap();

/**
 * The camera's curve for a waypoint loop, cached per waypoint array (callers
 * treat a built path as immutable). Catmull-Rom leaves each control point
 * along the chord of its neighbours, so at a sharp corner between long legs
 * it bulges outward — into the wall of the corridor it is turning out of.
 * Splitting each corner into two control points a couple of cells back
 * along its legs makes the curve round the corner on the inside instead.
 * `cum` is the cumulative arc length, so `t` moves the camera at an even
 * speed rather than lingering on short legs and racing along long ones.
 */
function curveOf(points) {
  let curve = curves.get(points);
  if (curve) return curve;
  const n = points.length;
  const ctrl = [];
  for (let i = 0; i < n; i++) {
    const a = points[(i - 1 + n) % n], v = points[i], b = points[(i + 1) % n];
    const da = dist(v, a), db = dist(v, b);
    if (da < 1e-6 || db < 1e-6 || turn(a, v, b) < CHAMFER_TURN) {
      ctrl.push(v);
      continue;
    }
    const ra = Math.min(CHAMFER, da / 3), rb = Math.min(CHAMFER, db / 3);
    ctrl.push({ x: v.x + ((a.x - v.x) / da) * ra, y: v.y + ((a.y - v.y) / da) * ra });
    ctrl.push({ x: v.x + ((b.x - v.x) / db) * rb, y: v.y + ((b.y - v.y) / db) * rb });
  }
  const m = ctrl.length;
  const cum = [0];
  let prev = ctrl[0];
  for (let i = 0; i < m; i++) {
    const p = (o) => ctrl[(i + o + m) % m];
    for (let s = 1; s <= STEPS; s++) {
      const q = catmull(p(-1), p(0), p(1), p(2), s / STEPS);
      cum.push(cum[cum.length - 1] + Math.hypot(q.x - prev.x, q.y - prev.y));
      prev = q;
    }
  }
  curve = { ctrl, cum, total: cum[cum.length - 1] };
  curves.set(points, curve);
  return curve;
}

/** Closed loop sample: `t` in [0, 1) wraps; `angle` looks along the direction of travel. */
export function samplePath(points, t) {
  if (!points?.length) return { x: 0, y: 0, angle: 0 };
  if (points.length < 2) return { x: points[0].x, y: points[0].y, angle: 0 };
  if (!Number.isFinite(t)) t = 0;
  const { ctrl, cum, total } = curveOf(points);
  const n = ctrl.length;
  const target = (((t % 1) + 1) % 1) * total;
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= target) lo = mid;
    else hi = mid;
  }
  const span = cum[hi] - cum[lo];
  const u = (lo + (span > 0 ? (target - cum[lo]) / span : 0)) / STEPS;
  const i = Math.min(n - 1, Math.floor(u));
  const k = u - i;
  const p = (o) => ctrl[(i + o + n) % n];
  const pos = catmull(p(-1), p(0), p(1), p(2), k);
  // Heading from a nearby point on the same segment, ahead unless at its very end.
  const e = k < 0.999 ? 1e-3 : -1e-3;
  const near = catmull(p(-1), p(0), p(1), p(2), k + e);
  const angle = e > 0 ? Math.atan2(near.y - pos.y, near.x - pos.x) : Math.atan2(pos.y - near.y, pos.x - near.x);
  return { x: pos.x, y: pos.y, angle };
}
