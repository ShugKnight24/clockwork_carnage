/**
 * Column ray march for the wall pass.
 *
 * A ray used to stop at the first solid cell. Low cover (a `heightMap` entry of
 * 1-4 layers, see `wallHeight` in src/systems/physics.js) is solid but short,
 * so stopping there drew the short wall and left nothing behind it: the view
 * over a waist-high counter showed floor and ceiling running off to the
 * horizon. The march now records each short wall it crosses and keeps going
 * until a full-height wall, the map edge, or short walls that already cover
 * the whole column.
 *
 * Screen rows grow downward and the eye sits halfway up a wall, so a short
 * wall at perpendicular distance `d` covers the rows from its top edge down to
 * the floor. Walls further along only show above the lowest top edge seen so
 * far: `clip` below. A wall under the eye also shows its top face, whose far
 * edge (at the distance the ray leaves the cell) is what hides things behind
 * it; a wall over the eye hides everything behind it below its near top edge.
 *
 * Pure and allocation-free: the renderer passes one reusable `hits` record per
 * frame and reads the results back out of its typed arrays.
 */

/** Short walls kept per column. More than this in one ray is not a real map. */
export const MAX_COLUMN_HITS = 16;

export function createColumnHits(max = MAX_COLUMN_HITS) {
  return {
    n: 0,
    /** Per hit: grid cell, face (0 = x side, 1 = y side), wall type. */
    mapX: new Int32Array(max),
    mapY: new Int32Array(max),
    side: new Uint8Array(max),
    type: new Int32Array(max),
    /** Perpendicular distance where the ray enters and leaves the cell. */
    dist: new Float64Array(max),
    exit: new Float64Array(max),
    /** Wall height, 0-1 of a full wall. */
    frac: new Float64Array(max),
    /** Screen Y above which the column is still open after this hit. */
    clip: new Float64Array(max),
    /** Set when the last hit is a full wall or the column is covered. */
    closed: false,
    stepX: 0,
    stepY: 0,
  };
}

/** Screen Y of a wall's top edge `frac` high at distance `d`. */
export function wallTopY(frac, d, h, horizon) {
  return horizon + ((0.5 - frac) * h) / d;
}

/**
 * March one screen column from (camX, camY) along (rayDirX, rayDirY).
 * `h` is the screen height and `horizon` the eye-level row (h/2 + yShift).
 * Fills `hits` front to back; the last hit is the one that closes the column.
 */
export function castColumn(map, camX, camY, rayDirX, rayDirY, h, horizon, hits) {
  const grid = map.grid;
  const hm = map.heightMap;
  const W = map.width;
  const H = map.height;
  const max = hits.dist.length;

  let mapX = camX | 0;
  let mapY = camY | 0;
  const deltaDistX = Math.abs(1 / rayDirX);
  const deltaDistY = Math.abs(1 / rayDirY);
  let stepX, stepY, sideDistX, sideDistY;
  if (rayDirX < 0) {
    stepX = -1;
    sideDistX = (camX - mapX) * deltaDistX;
  } else {
    stepX = 1;
    sideDistX = (mapX + 1.0 - camX) * deltaDistX;
  }
  if (rayDirY < 0) {
    stepY = -1;
    sideDistY = (camY - mapY) * deltaDistY;
  } else {
    stepY = 1;
    sideDistY = (mapY + 1.0 - camY) * deltaDistY;
  }
  hits.stepX = stepX;
  hits.stepY = stepY;

  let n = 0;
  let clip = Infinity;
  for (;;) {
    let side;
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1;
    }

    let type, frac;
    if (mapX < 0 || mapY < 0 || mapX >= W || mapY >= H) {
      type = 1;
      frac = 1;
    } else {
      type = grid[mapY][mapX];
      if (type === 0) continue;
      // Same rule as physics wallHeight(): layers 1-4 of 5 are short.
      const layers = hm ? hm[mapY]?.[mapX] : undefined;
      frac = layers > 0 && layers < 5 ? layers / 5 : 1;
    }

    let d = side === 0
      ? (mapX - camX + (1 - stepX) / 2) / rayDirX
      : (mapY - camY + (1 - stepY) / 2) / rayDirY;
    if (d < 0.01) d = 0.01;
    // The next boundary the DDA would cross is where the ray leaves the cell.
    const exit = sideDistX < sideDistY ? sideDistX : sideDistY;

    hits.mapX[n] = mapX;
    hits.mapY[n] = mapY;
    hits.side[n] = side;
    hits.type[n] = type;
    hits.dist[n] = d;
    hits.exit[n] = exit;
    hits.frac[n] = frac;

    if (frac >= 1) {
      hits.clip[n] = -Infinity;
      hits.n = n + 1;
      hits.closed = true;
      return hits;
    }

    // Under the eye the top face's far edge is the silhouette; over it, the
    // near top edge is.
    const top = frac < 0.5 ? wallTopY(frac, exit, h, horizon) : wallTopY(frac, d, h, horizon);
    if (top < clip) clip = top;
    hits.clip[n] = clip;
    n++;
    if (clip <= 0 || n === max) {
      // Nothing behind can show (or the record is full): this wall closes the
      // column as far as depth goes.
      hits.n = n;
      hits.closed = true;
      return hits;
    }
  }
}

/**
 * Screen Y below which an object at `depth` is hidden by short walls in front
 * of it, from the per-column records the wall pass keeps. `h` when none are.
 */
export function coverClipY(occN, occDist, occY, stride, x, depth, h) {
  let y = h;
  const n = occN[x];
  const base = x * stride;
  for (let i = 0; i < n; i++) {
    if (occDist[base + i] >= depth) break;
    y = occY[base + i];
  }
  return y;
}
