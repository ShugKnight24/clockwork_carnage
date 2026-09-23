// ── Reusable Map Building Primitives ──────────────────────────────
// Same pattern as tutorial.js — programmatic 60×60 map construction.
// Tile legend: 0=empty, 1=stone, 2=tech, 3=metal, 4=energy, 5=door,
//              6=secret, 7=boss, 8=glass, 9=temporal rift

export function createGrid(w, h, fill = 1) {
  return Array.from({ length: h }, () => Array(w).fill(fill));
}

// ── Height ────────────────────────────────────────────────────────
// A level can hand the renderer a `heightMap` of builder layers (1-5) beside
// its grid. Anything below 5 draws as a short wall you can see and shoot over,
// and `wallHeight` in src/systems/physics.js turns the same number into the
// line-of-sight and hitscan tests. A map without one is all full-height walls.

/**
 * Named layer counts, so level data reads as heights rather than integers.
 * The eye sits at half a wall, so only KNEE and WAIST can be seen over
 * standing; SHOULDER and TALL block sight while still showing the ceiling.
 */
export const LAYER = { KNEE: 1, WAIST: 2, SHOULDER: 3, TALL: 4, FULL: 5 };

/** Companion height grid for a map, full-height everywhere by default. */
export function createHeights(w, h) {
  return Array.from({ length: h }, () => Array(w).fill(LAYER.FULL));
}

/**
 * Low cover: solid to walk through, open to look and shoot over. Writes the
 * tile into the grid and the height into the companion map.
 *
 * `layers` is one of LAYER.KNEE…LAYER.TALL. Waist-high cover hides a crouched agent
 * from enemy fire and not a standing one, which is the whole point of it.
 */
export function lowWall(g, hm, r1, c1, r2, c2, layers = LAYER.WAIST, v = 3) {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      g[r][c] = v;
      hm[r][c] = layers;
    }
  }
}

/** A single low block — a crate-sized piece of cover. */
export function lowTile(g, hm, r, c, layers = LAYER.WAIST, v = 3) {
  g[r][c] = v;
  hm[r][c] = layers;
}

/**
 * Scatter low cover through a room on a spacing, the way `coverGrid` places
 * full pillars — but shootable over, so a firefight has angles instead of
 * blind corners.
 */
export function lowCoverGrid(g, hm, r1, c1, r2, c2, spacingR = 5, spacingC = 6, layers = LAYER.WAIST, v = 3) {
  for (let r = r1; r <= r2; r += spacingR)
    for (let c = c1; c <= c2; c += spacingC) lowTile(g, hm, r, c, layers, v);
}

/** Carve a rectangle to a given tile value (default: open floor). */
export function carve(g, r1, c1, r2, c2, v = 0) {
  for (let r = r1; r <= r2; r++)
    for (let c = c1; c <= c2; c++) g[r][c] = v;
}

/** Draw a horizontal wall segment. */
export function hWall(g, r, c1, c2, v) {
  for (let c = c1; c <= c2; c++) g[r][c] = v;
}

/** Draw a vertical wall segment. */
export function vWall(g, r1, r2, c, v) {
  for (let r = r1; r <= r2; r++) g[r][c] = v;
}

/** Place a single tile (pillar, decoration, etc). */
export function tile(g, r, c, v = 3) { g[r][c] = v; }

/** Place a door tile. */
export function door(g, r, c) { g[r][c] = 5; }

/**
 * Draw a walled room and carve its interior.
 * Returns the interior bounds {r1, c1, r2, c2} for further decoration.
 */
export function room(g, r1, c1, r2, c2, wallType = 1) {
  hWall(g, r1, c1, c2, wallType);
  hWall(g, r2, c1, c2, wallType);
  vWall(g, r1, r2, c1, wallType);
  vWall(g, r1, r2, c2, wallType);
  carve(g, r1 + 1, c1 + 1, r2 - 1, c2 - 1);
  return { r1: r1 + 1, c1: c1 + 1, r2: r2 - 1, c2: c2 - 1 };
}

/** Carve a corridor connecting two areas. */
export function corridor(g, r1, c1, r2, c2) {
  carve(g, Math.min(r1, r2), Math.min(c1, c2), Math.max(r1, r2), Math.max(c1, c2));
}

/**
 * Place cover pillars in a grid pattern within bounds.
 * spacing: distance between pillars; offset: starting offset from top-left.
 */
export function coverGrid(g, r1, c1, r2, c2, spacingR = 4, spacingC = 4, v = 3) {
  for (let r = r1; r <= r2; r += spacingR)
    for (let c = c1; c <= c2; c += spacingC) g[r][c] = v;
}

/**
 * Place a row of cell rooms along a wall (like holding cells or offices).
 * Each cell: cellW wide, cellH tall, with a door centered on doorSide.
 * Returns array of cell interior centers for entity placement.
 */
export function cellRow(g, startR, startC, count, cellW, cellH, wallType = 3, doorSide = "south") {
  const centers = [];
  for (let i = 0; i < count; i++) {
    const c1 = startC + i * (cellW - 1); // overlap walls between cells
    const r1 = startR;
    const r2 = r1 + cellH - 1;
    const c2 = c1 + cellW - 1;
    room(g, r1, c1, r2, c2, wallType);
    // Door placement
    const doorC = c1 + Math.floor(cellW / 2);
    if (doorSide === "south") door(g, r2, doorC);
    else if (doorSide === "north") door(g, r1, doorC);
    centers.push({ x: (c1 + c2) / 2 + 0.5, y: (r1 + r2) / 2 + 0.5 });
  }
  return centers;
}

// ── Composition ───────────────────────────────────────────────────
// Every campaign level was hand-built on the same skeleton: a 60x60 grid
// entered from the south at (29.5, 55.5) and exited due north. Eight of the
// nine started on the exact same tile. Rotating a finished level turns that
// march north into a march east or west without re-authoring a single room,
// so the campaign stops reading as one corridor walked nine times.

/** Rotate a point (world units) by `deg` clockwise inside a w x h grid. */
export function rotatePoint(x, y, w, h, deg) {
  if (deg === 90) return [h - y, x];
  if (deg === 180) return [w - x, h - y];
  if (deg === 270) return [y, w - x];
  return [x, y];
}

/** Rotate a cell index by `deg` clockwise inside a w x h grid. */
export function rotateCell(c, r, w, h, deg) {
  if (deg === 90) return [h - 1 - r, c];
  if (deg === 180) return [w - 1 - c, h - 1 - r];
  if (deg === 270) return [r, w - 1 - c];
  return [c, r];
}

/** Rotate a 2D array clockwise by `deg`, returning a new array. */
function rotateGrid(rows, w, h, deg) {
  if (!rows || deg === 0) return rows;
  const [nw, nh] = deg === 180 ? [w, h] : [h, w];
  const out = Array.from({ length: nh }, () => Array(nw).fill(0));
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const [nc, nr] = rotateCell(c, r, w, h, deg);
      out[nr][nc] = rows[r][c];
    }
  }
  return out;
}

/**
 * Turn a finished level clockwise. Everything positional moves with it: the
 * grid, the height map, the spawn, the exit, entities, props and secret walls,
 * plus the direction the player faces on arrival.
 *
 * @param {object} level a level object as a builder returns it
 * @param {number} deg 90, 180 or 270; anything else returns the level as-is
 */
export function rotateLevel(level, deg) {
  if (!deg || deg % 360 === 0) return level;
  const d = ((deg % 360) + 360) % 360;
  const { width: w, height: h } = level;
  const [nw, nh] = d === 180 ? [w, h] : [h, w];
  const pt = (p) => {
    const [x, y] = rotatePoint(p.x, p.y, w, h, d);
    return { ...p, x, y };
  };
  const start = rotatePoint(level.playerStart.x, level.playerStart.y, w, h, d);
  return {
    ...level,
    width: nw,
    height: nh,
    grid: rotateGrid(level.grid, w, h, d),
    heightMap: rotateGrid(level.heightMap, w, h, d),
    playerStart: {
      ...level.playerStart,
      x: start[0],
      y: start[1],
      dir: (level.playerStart.dir ?? 0) + (d * Math.PI) / 180,
    },
    exit: level.exit ? pt(level.exit) : level.exit,
    entities: (level.entities || []).map(pt),
    // Props are authored on cell indices, not world centres.
    props: (level.props || []).map((p) => {
      const [x, y] = rotateCell(p.x, p.y, w, h, d);
      return { ...p, x, y };
    }),
    secrets: (level.secrets || []).map((sec) => {
      const [wallX, wallY] = rotateCell(sec.wallX, sec.wallY, w, h, d);
      return { ...sec, wallX, wallY };
    }),
  };
}

/**
 * Break the mirror.
 *
 * Every level placed its cover as pairs reflected about the centre line, so
 * the grids measured 95-100% mirror-symmetric and every room read as the same
 * room twice. This walks the *isolated* pillars — a solid cell with open floor
 * on all four sides — and varies them with a per-level seed: some are cleared,
 * some step one tile off the mirror line, and some drop to waist height so
 * they become cover you can shoot over.
 *
 * Only isolated pillars are eligible, which is what makes it safe: a cell
 * already surrounded by floor cannot be holding a route together, so nothing
 * here can cut the map in two. `tests/unit/map-integrity.test.js` re-checks
 * reachability regardless.
 */
export function varyCover(level, rng) {
  const { grid, width: w, height: h } = level;
  const heights = level.heightMap || createHeights(w, h);
  const open = (c, r) => c > 0 && r > 0 && c < w - 1 && r < h - 1 && grid[r][c] === 0;
  const isolated = (c, r) =>
    grid[r]?.[c] > 0 && open(c, r - 1) && open(c, r + 1) && open(c - 1, r) && open(c + 1, r);

  // Walk one side of the mirror line only. Rolling both halves independently
  // leaves too many pairs intact by chance; treating a pair once, on one side,
  // breaks it every time the roll is not "leave".
  const pillars = [];
  for (let r = 1; r < h - 1; r++) {
    for (let c = 1; c < (w - 1) / 2; c++) if (isolated(c, r)) pillars.push([c, r]);
  }

  for (const [c, r] of pillars) {
    // Re-check: an earlier nudge may have changed this cell's neighbourhood.
    if (!isolated(c, r)) continue;
    const roll = rng.next();
    const tile = grid[r][c];
    if (roll < 0.3) {
      // Clear it — the room breathes and the pair stops rhyming.
      grid[r][c] = 0;
      heights[r][c] = LAYER.FULL;
    } else if (roll < 0.6) {
      // Step one tile off the line, but only into somewhere just as open.
      const [dc, dr] = [[1, 0], [-1, 0], [0, 1], [0, -1]][(rng.next() * 4) | 0];
      const nc = c + dc;
      const nr = r + dr;
      if (open(nc, nr) && open(nc, nr - 1) && open(nc, nr + 1) && open(nc - 1, nr) && open(nc + 1, nr)) {
        grid[r][c] = 0;
        heights[r][c] = LAYER.FULL;
        grid[nr][nc] = tile;
        heights[nr][nc] = LAYER.FULL;
      }
    } else if (roll < 0.9) {
      // Drop it to cover height: still blocks movement, no longer blocks
      // sight. This is also how verticality reaches every level at once.
      heights[r][c] = rng.next() < 0.6 ? LAYER.WAIST : LAYER.KNEE;
    }
  }
  return { ...level, heightMap: heights };
}
