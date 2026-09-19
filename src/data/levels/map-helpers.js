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
