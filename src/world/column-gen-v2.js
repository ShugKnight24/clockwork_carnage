// src/world/column-gen-v2.js
/**
 * Generator version 2: version 1's land with a sea at z = 30, ocean basins,
 * beaches, lakes, rivers and trees. One 16 × 16 × 64 column at a time, as a
 * pure function of `{kind, seed, v}` and the column's coordinates.
 *
 * The rules of column-gen.js hold here too, and a unit test scans this file:
 * - Only `+ - * /`, `Math.floor`, `Math.round`, `Math.abs`, `Math.min`,
 *   `Math.max`, `Math.imul` and bit operations — nothing an engine may round
 *   its own way.
 * - No sequential RNG, no state between cells or columns but the salt cache.
 * - Once worlds are saved against this version, its output never changes.
 *
 * It shares no code with version 1 on purpose: the hashing and noise below
 * start as a copy, so neither version can move the other.
 */
import { AIR, BEDROCK, WATER } from "./blocks.js";
import { SPECIES, TREE_REACH, treeShape, treeTop, plantOver } from "./trees.js";

/**
 * Generator version 2 — FROZEN on 2026-09-23 (Forge water, phase B). Worlds
 * made since store `meta.gen.v = 2` and their saved edits are diffs against
 * this file's exact output, held to golden hashes in
 * tests/unit/column-gen-v2.test.js (identical under V8 and JavaScriptCore).
 * Every constant, field, tree shape (trees.js `treeShape`, `treeTop`,
 * `plantOver`) and rule below is part of that output. New terrain goes into a
 * version 3 path; a golden hash is never re-recorded to make a change pass.
 */
export const GEN_V2 = 2;

const GRASS = 11, DIRT = 10, SAND = 12, ROCK = 13, ORE = 14;
const CS = 16, H = 64, CELLS = CS * CS * H;

/** Every air cell below this height and above the ground is water. */
export const SEA = 30;
/**
 * Ground runs 12..47: the sea floor reaches down to 12, and z = 48 and up is
 * always open air — trees included — as in version 1.
 */
export const MIN_TOP = 12, MAX_TOP = 47;
const ORE_BELOW = Math.floor(0.02 * 4294967296);

export const BIOMES = Object.freeze(["plains", "hills", "highlands", "sands", "ocean"]);
const PLAINS = 0, HILLS = 1, HIGHLANDS = 2, SANDS = 3, OCEAN = 4, RIVER = 5;

/** 32-bit multiply-xorshift mix of a seed and two integers. */
function hash2(s, i, j) {
  let h = Math.imul(s ^ Math.imul(i, 0x9e3779b1), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13) ^ Math.imul(j, 0xc2b2ae35), 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 16), 0x165667b1);
  return (h ^ (h >>> 15)) >>> 0;
}

const smooth = (t) => t * t * (3 - 2 * t);
/** 0 below `a`, 1 above `b`, smoothstep between. */
const ramp = (v, a, b) => (v <= a ? 0 : v >= b ? 1 : smooth((v - a) / (b - a)));

/** Value noise in [-1, 1) on an unbounded hashed lattice of spacing `s`. */
function noise(salt, x, y, s) {
  const gx = x / s, gy = y / s;
  const i = Math.floor(gx), j = Math.floor(gy);
  const fx = smooth(gx - i), fy = smooth(gy - j);
  const v00 = hash2(salt, i, j), v10 = hash2(salt, i + 1, j);
  const v01 = hash2(salt, i, j + 1), v11 = hash2(salt, i + 1, j + 1);
  const a = v00 + (v10 - v00) * fx, b = v01 + (v11 - v01) * fx;
  return (a + (b - a) * fy) / 2147483648 - 1;
}

/** The same noise on turned lattices (integer rotations, see column-gen.js). */
const turned = (salt, x, y, s) => noise(salt, 3 * x - 4 * y, 4 * x + 3 * y, 5 * s);
const turned2 = (salt, x, y, s) => noise(salt, 5 * x + 12 * y, 12 * x - 5 * y, 13 * s);

// Version 1's layers keep their numbers, so v2 land is v1 land where no sea,
// lake or river reaches it; the rest are new.
const L_RUGGED = 0, L_DRY = 1, L_BIG = 2, L_D24 = 3, L_D9 = 4, L_RIDGE = 5, L_JITTER = 6, L_ORE = 7, L_CRAG = 8;
const L_REGION = 9, L_CONT = 10, L_LAKE = 11, L_RIVER = 12, L_FLOOR = 13, L_TREE = 14, L_FOREST = 15, L_WARP = 16, LAYERS = 17;
let saltSeed = -1;
const salts = new Int32Array(LAYERS);
function saltsFor(seed) {
  if (seed !== saltSeed) {
    for (let k = 0; k < LAYERS; k++) salts[k] = hash2(seed, k, 0x5eed) | 0;
    saltSeed = seed;
  }
  return salts;
}

// ─── Water: region, continent, lakes, rivers ───────────────

/**
 * The sea line: continent values under it are sea. The region field moves it
 * over thousands of blocks, so an archipelago region is mostly water with
 * islands and a continental interior has only lakes and rivers.
 */
const SEA_LINE = -0.42, REGION_SWING = 0.52;
/**
 * Around the default spawns — (0.5, 0.5) endless, (64.5, 64.5) bounded — the
 * continent is raised to at least HOME_LAND above the sea line, fading out by
 * HOME_R, so a new world always starts on land.
 */
const HOME_X = 32, HOME_Y = 32, HOME_R2 = 170 * 170, HOME_LAND = 0.25;
/** Lakes: bowls this deep at most, in plains, hills and sand flats. */
const LAKE_DEPTH = 6;
/**
 * Rivers are a drainage network, not a noise contour, so every river runs
 * somewhere: to the sea, or into a lake. Nodes sit on a jittered grid of
 * RIVER_GRID blocks; each drains straight to whichever of its eight
 * neighbours lies lowest on the continent (the smooth part of it), and a node
 * with no lower neighbour holds a lake. A node in the sea ends its river.
 * Every step is downhill, so there are no loops, and every chain ends in the
 * sea or a lake. The node a column needs are within two grid cells of it.
 *
 * The channel is a V: its bed RIVER_BED, its banks rising RIVER_BANK blocks
 * per block from the channel line (meandered by a small warp), so a bank is
 * never steeper than about 0.6 and a river through high ground cuts a valley.
 */
const RIVER_GRID = 192, RIVER_BED = SEA - 4, RIVER_BANK = 0.4, RIVER_WARP = 8;
const LAKE_BED = SEA - 6, LAKE_MIN_R = 16;

/** Region field at a cell, −1 (interior) .. 1 (archipelago). */
const regionField = (sl, x, y) => turned2(sl[L_REGION], x, y, 1500);

/** `c` raised toward the home floor near the default spawns; continuous, so no cliff. */
function home(c, line, x, y) {
  const dx = x - HOME_X, dy = y - HOME_Y, d2 = dx * dx + dy * dy;
  if (d2 >= HOME_R2) return c;
  const lift = line + HOME_LAND - c;
  return lift > 0 ? c + lift * ramp(1 - d2 / HOME_R2, 0, 0.5) : c;
}

function continentField(sl, x, y, line) {
  const c = turned(sl[L_CONT], x, y, 420) * 0.75 + noise(sl[L_CONT], x - 9173, y + 9173, 150) * 0.25;
  return home(c, line, x, y);
}

/** Where the continent drains: its smooth part against the sea line (< 0 is sea). */
function flowLevel(sl, x, y) {
  const line = SEA_LINE + regionField(sl, x, y) * REGION_SWING;
  return home(turned(sl[L_CONT], x, y, 420) * 0.75, line, x, y) - line;
}

/** A node's position in block coordinates, into `out` [x, y]. */
function nodeAt(sl, a, b, out) {
  const h = hash2(sl[L_RIVER], a, b);
  out[0] = a * RIVER_GRID + 48 + (h & 0xffff) % 96;
  out[1] = b * RIVER_GRID + 48 + (h >>> 16) % 96;
  return out;
}

/**
 * A node of the river network: [x, y, kind, tx, ty] where kind 0 drains to the
 * node at (tx, ty), 1 is in the sea, 2 holds a lake of radius tx. Cached per
 * seed: it costs nine continent samples and every nearby cell asks for it.
 */
const nodeCache = new Map();
let nodeSeed = -1;
const pScratch = [0, 0];
function riverNode(sl, seed, a, b) {
  if (seed !== nodeSeed) { nodeCache.clear(); nodeSeed = seed; }
  const key = (a + 8192) * 16384 + (b + 8192);
  let n = nodeCache.get(key);
  if (n) return n;
  if (nodeCache.size >= 65536) nodeCache.clear();
  nodeAt(sl, a, b, pScratch);
  const x = pScratch[0], y = pScratch[1], here = flowLevel(sl, x, y);
  if (here < 0) n = [x, y, 1, 0, 0];
  else {
    let low = here, tx = 0, ty = 0;
    for (let db = -1; db <= 1; db++) for (let da = -1; da <= 1; da++) {
      if (da === 0 && db === 0) continue;
      nodeAt(sl, a + da, b + db, pScratch);
      const v = flowLevel(sl, pScratch[0], pScratch[1]);
      if (v < low) { low = v; tx = pScratch[0]; ty = pScratch[1]; }
    }
    n = low < here ? [x, y, 0, tx, ty] : [x, y, 2, LAKE_MIN_R + (hash2(sl[L_RIVER], b, a) & 15), 0];
  }
  nodeCache.set(key, n);
  return n;
}

/** A distance that needs no square root: within 8% of the true one, and never steeper than it by more. */
const approxLen = (dx, dy) => {
  const ax = Math.abs(dx), ay = Math.abs(dy);
  return ax > ay ? ax + 0.4142 * ay : ay + 0.4142 * ax;
};

/**
 * The height a river or network lake would cut the ground to at a cell, or
 * Infinity when none is near. The nodes of the 5 × 5 grid cells round the
 * cell cover every channel that can reach it.
 */
let bankKind = 0;
// The 5 × 5 nodes round the last grid cell asked about: neighbouring cells
// nearly always share them, which saves 25 map lookups a cell.
const near = [];
let nearA = NaN, nearB = NaN, nearSeed = -1;
function riverBank(sl, x, y) {
  const seed = saltSeed;
  let kind = 0;
  const px = x + noise(sl[L_WARP], x, y, 48) * RIVER_WARP, py = y + noise(sl[L_WARP], y, x, 48) * RIVER_WARP;
  const a0 = Math.floor(px / RIVER_GRID), b0 = Math.floor(py / RIVER_GRID);
  if (a0 !== nearA || b0 !== nearB || seed !== nearSeed) {
    near.length = 0;
    for (let b = b0 - 2; b <= b0 + 2; b++) for (let a = a0 - 2; a <= a0 + 2; a++) {
      const n = riverNode(sl, seed, a, b);
      if (n[2] !== 1) near.push(n);
    }
    nearA = a0; nearB = b0; nearSeed = seed;
  }
  let best = Infinity;
  for (let k = 0; k < near.length; k++) {
    const n = near[k];
    let v;
    if (n[2] === 2) v = LAKE_BED + RIVER_BANK * Math.max(0, approxLen(px - n[0], py - n[1]) - n[3]);
    else {
      const ex = n[3] - n[0], ey = n[4] - n[1], len2 = ex * ex + ey * ey;
      let t = ((px - n[0]) * ex + (py - n[1]) * ey) / len2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      v = RIVER_BED + RIVER_BANK * approxLen(px - n[0] - t * ex, py - n[1] - t * ey);
    }
    if (v < best) { best = v; kind = n[2] === 2 ? 2 : 1; }
  }
  bankKind = kind;
  return best;
}

/**
 * Biome weights at a cell into `w` (five entries summing to 1), and the
 * unrounded surface height. Land is version 1's four biomes, lifted a little
 * so the sea does not drown the lowlands, with highlands kept inland so a
 * coast is never a mountain wall; the ocean weight blends it down to the sea
 * floor, so a coast is a slope. Lakes and rivers are carved last.
 */
function rawHeight(sl, x, y, w) {
  const line = SEA_LINE + regionField(sl, x, y) * REGION_SWING;
  const c = continentField(sl, x, y, line);
  const o = 1 - ramp(c, line - 0.08, line + 0.14);
  const inland = ramp(c, line + 0.12, line + 0.42);

  const r = turned(sl[L_RUGGED], x, y, 112) * 0.8 + noise(sl[L_RUGGED], x + 7919, y - 7919, 44) * 0.2;
  const d = turned2(sl[L_DRY], x, y, 136) * 0.8 + noise(sl[L_DRY], x - 4447, y + 4447, 52) * 0.2;
  const high = ramp(r, 0.18, 0.4) * inland;
  const flat = 1 - ramp(r, -0.22, -0.02);
  const dry = ramp(d, 0.12, 0.32) * flat;
  const wp = flat - dry, ws = dry, wh = high, wl = 1 - flat - high;

  const detail = turned2(sl[L_D24], x, y, 24) * 0.7 + noise(sl[L_D9], x, y, 9) * 0.3;
  let land = 0;
  if (wp > 0) land += wp * (33 + detail * 3.5);
  if (ws > 0) land += ws * (31.5 + detail * 1.5);
  if (wl > 0 || wh > 0) {
    const big = turned(sl[L_BIG], x, y, 52);
    if (wl > 0) land += wl * (37 + big * 8 + detail * 2.5);
    if (wh > 0) {
      const n = turned(sl[L_RIDGE], y, x, 30) * 0.7 + noise(sl[L_RIDGE], x, y, 13) * 0.3;
      const ridge = 1 - Math.abs(n);
      land += wh * (34 + big * 4 + ridge * ridge * 13 * wh + detail * 1.5);
      const crag = noise(sl[L_CRAG], x, y, 7) - 0.4;
      if (crag > 0) land += wh * wh * crag * 8;
    }
  }
  // Lakes: bowls in the flatter land. Where a bowl dips under the sea line
  // it fills; above it, it is a dry hollow (lakes above the sea are not made).
  const k = noise(sl[L_LAKE], x, y, 100) * 0.7 + turned2(sl[L_LAKE], y, x, 40) * 0.3;
  const lake = ramp(k, 0.25, 0.6);
  if (lake > 0) land -= lake * LAKE_DEPTH * (1 - wh);

  let h = land;
  if (o > 0) {
    // The sea floor: shelving from the coast, deeper far out, rippled.
    const deep = ramp(line - c, 0.15, 0.45);
    const floor = 23 + turned(sl[L_FLOOR], x, y, 60) * 3 + detail * 1.5 - deep * 8;
    h = land * (1 - o) + floor * o;
  }

  const bank = riverBank(sl, x, y);
  const river = bank < h;
  if (river) h = bank;

  const lw = 1 - o;
  w[PLAINS] = wp * lw; w[HILLS] = wl * lw; w[HIGHLANDS] = wh * lw; w[SANDS] = ws * lw; w[OCEAN] = o;
  w[RIVER] = river ? bankKind : 0; // not a weight: tools ask what cut this cell, 1 a river, 2 its lake
  return h;
}

const SOFT_TOP = 42;
const clampTop = (h) => Math.max(MIN_TOP, Math.min(MAX_TOP, Math.round(h > SOFT_TOP ? SOFT_TOP + (h - SOFT_TOP) * 0.5 : h)));
const wScratch = new Float64Array(6);

/** z of the top block of generated ground at a cell (water and trees are above it). */
export function surfaceHeight(gen, x, y) {
  return clampTop(rawHeight(saltsFor(gen.seed >>> 0), x, y, wScratch));
}

const levelScratch = new Float64Array(6);

/**
 * The ground height before it is rounded and clamped (peaks squashed as
 * `surfaceHeight` squashes them), for the blend band (column-gen-blend.js),
 * which eases it toward an old edge and rounds once. Its own scratch, so it
 * can be called from inside `treeAtCell`'s height hook.
 */
export function surfaceLevel(gen, x, y) {
  const h = rawHeight(saltsFor(gen.seed >>> 0), x, y, levelScratch);
  return h > SOFT_TOP ? SOFT_TOP + (h - SOFT_TOP) * 0.5 : h;
}

/** The surface biome: the heaviest weight after patchy jitter, as in version 1. */
function surfaceBiome(sl, x, y, w) {
  const j = noise(sl[L_JITTER], x, y, 5) * 0.12 + turned(sl[L_JITTER], y, x, 16) * 0.2;
  let best = PLAINS, bw = -1;
  for (let k = 0; k < 5; k++) {
    const v = w[k] + (k & 1 ? j : -j);
    if (v > bw) { bw = v; best = k; }
  }
  return best;
}

const P = CS + 2;

/**
 * Heights for the column and a one-cell ring (18 × 18, `(ly + 1) * 18 + lx + 1`)
 * and the 16 × 16 surface biomes. Version 1's shape, so a later blend band
 * can feather `top` the same way.
 */
export function sampleColumn(gen, cx, cy, out = { top: new Int16Array(P * P), biome: new Uint8Array(CS * CS) }) {
  const { top, biome } = out;
  const sl = saltsFor(gen.seed >>> 0), w = wScratch;
  const bx = cx * CS, by = cy * CS;
  for (let py = 0; py < P; py++) for (let px = 0; px < P; px++) {
    const x = bx + px - 1, y = by + py - 1;
    top[py * P + px] = clampTop(rawHeight(sl, x, y, w));
    if (px === 0 || py === 0 || px === P - 1 || py === P - 1) continue;
    biome[(py - 1) * CS + (px - 1)] = surfaceBiome(sl, x, y, w);
  }
  return out;
}

const ROCKLINE = 41;
/** Sea-floor patches of bare rock, in deep water. */
const FLOOR_ROCK_BELOW = SEA - 9;

/**
 * What a surface cell is dressed in, and how deep: [cap, under, depth].
 * Under water it is sand (rock patches out deep); within two blocks of the
 * sea line it is beach sand; otherwise version 1's rules.
 */
function dress(sl, x, y, t, b, slope, out) {
  if (t < SEA - 1) {
    const rock = t < FLOOR_ROCK_BELOW && noise(sl[L_FLOOR], x, y, 11) > 0.2;
    out[0] = rock ? ROCK : SAND; out[1] = rock ? ROCK : SAND; out[2] = 3;
  } else if (b === HIGHLANDS && (slope >= 2 || t >= ROCKLINE)) {
    out[0] = ROCK; out[1] = ROCK; out[2] = 4;
  } else if (t <= SEA + 1) {
    out[0] = SAND; out[1] = SAND; out[2] = 3;
  } else if (b === SANDS || b === OCEAN) {
    out[0] = SAND; out[1] = SAND; out[2] = 4;
  } else {
    out[0] = GRASS; out[1] = DIRT; out[2] = b === HIGHLANDS ? 2 : 4;
  }
  return out;
}
const dressScratch = [0, 0, 0];

// ─── Trees ─────────────────────────────────────────────────

/** Trees root on a grid of 4 × 4-block cells, one candidate per cell. */
const TREE_CELL = 4;
/** Chance a candidate grows, per biome, before the forest field scales it. */
const DENSITY = { [PLAINS]: 0.1, [HILLS]: 0.24, [HIGHLANDS]: 0.26 };
const PALM_DENSITY = 0.07, SHRUB_DENSITY = 0.05;
/** Nothing grows denser than this, so most candidates are rejected on their hash alone. */
const MAX_DENSITY = 0.5;

/**
 * The tree rooted in grid cell (i, j), or null. Everything it reads is a pure
 * function of the root's coordinates — its height, its biome, the slope
 * under it, the forest field — so every column that asks gets the same tree.
 *
 * `topAt(x, y, t)`, when given, turns this version's ground height `t` at a
 * cell into the height the caller's world has there (the blend band of an
 * old world grown endless, column-gen-blend.js). Without it the output is
 * this version's, unchanged.
 * @returns {{x:number, y:number, z:number, species:number, h:number}|null} z is the root cell, one above the ground
 */
export function treeAtCell(gen, i, j, topAt = null) {
  const sl = saltsFor(gen.seed >>> 0);
  const hc = hash2(sl[L_TREE], i, j);
  const roll = (hc >>> 16) / 65536;
  if (roll >= MAX_DENSITY) return null;
  const x = i * TREE_CELL + (hc & 3), y = j * TREE_CELL + ((hc >>> 2) & 3);
  const w = wScratch;
  let t = clampTop(rawHeight(sl, x, y, w));
  if (topAt) t = topAt(x, y, t);
  if (t < SEA - 1) return null;
  const b = surfaceBiome(sl, x, y, w);
  let slope = 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const n = clampTop(rawHeight(sl, x + dx, y + dy, w));
    slope = Math.max(slope, Math.abs((topAt ? topAt(x + dx, y + dy, n) : n) - t));
  }
  if (slope > 1) return null;
  const cap = dress(sl, x, y, t, b, slope, dressScratch)[0];
  let species, density;
  if (cap === GRASS) {
    species = b === HIGHLANDS || t >= 39 ? SPECIES.PINE : SPECIES.BROADLEAF;
    // Forests and clearings: a patch field scales the biome's density.
    const f = noise(sl[L_FOREST], x, y, 70) * 0.7 + noise(sl[L_FOREST], y, x, 23) * 0.3;
    density = (DENSITY[b] ?? DENSITY[PLAINS]) * (0.2 + 1.6 * ramp(f, -0.25, 0.35));
  } else if (cap === SAND && t <= SEA + 1) {
    species = SPECIES.PALM; density = PALM_DENSITY;
  } else if (cap === SAND && b === SANDS) {
    species = SPECIES.SHRUB; density = SHRUB_DENSITY;
  } else return null;
  if (roll >= density) return null;
  const h = hash2(hc, x, y);
  if (t + 1 + treeTop(species, h) > MAX_TOP) return null;
  return { x, y, z: t + 1, species, h };
}

/**
 * Plant into `out` every tree whose blocks can reach the column: the roots in
 * the column and within TREE_REACH of it, which lie in it and its eight
 * neighbours (endless-world spec §4). Only the column's own cells are written.
 * `treeAt` picks the tree of a grid cell; the blend band passes one that
 * roots trees on its own heights and keeps them off the old area.
 */
export function plantTrees(gen, cx, cy, out, treeAt = treeAtCell) {
  const x0 = cx * CS, y0 = cy * CS;
  const i0 = Math.floor((x0 - TREE_REACH) / TREE_CELL), i1 = Math.floor((x0 + CS - 1 + TREE_REACH) / TREE_CELL);
  const j0 = Math.floor((y0 - TREE_REACH) / TREE_CELL), j1 = Math.floor((y0 + CS - 1 + TREE_REACH) / TREE_CELL);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const tr = treeAt(gen, i, j);
    if (!tr) continue;
    if (tr.x < x0 - TREE_REACH || tr.x >= x0 + CS + TREE_REACH || tr.y < y0 - TREE_REACH || tr.y >= y0 + CS + TREE_REACH) continue;
    treeShape(tr.species, tr.h, (dx, dy, dz, id) => {
      const lx = tr.x + dx - x0, ly = tr.y + dy - y0, z = tr.z + dz;
      if (lx < 0 || lx >= CS || ly < 0 || ly >= CS || z >= H) return;
      const k = (z << 8) | (ly << 4) | lx;
      out[k] = plantOver(out[k], id);
    });
  }
}

// ─── Blocks ────────────────────────────────────────────────

/**
 * Blocks from a sampled surface: bedrock, rock with ore, the dressing, water
 * up to the sea line, then trees.
 */
export function fillColumn(gen, cx, cy, sample, out = new Uint8Array(CELLS), { trees = true } = {}) {
  out.fill(AIR);
  const { top, biome } = sample;
  const sl = saltsFor(gen.seed >>> 0), oreSalt = sl[L_ORE];
  const dr = dressScratch;
  for (let ly = 0; ly < CS; ly++) for (let lx = 0; lx < CS; lx++) {
    const p = (ly + 1) * P + (lx + 1), t = top[p];
    const x = cx * CS + lx, y = cy * CS + ly, off = (ly << 4) | lx;
    const slope = Math.max(
      Math.abs(top[p - 1] - t), Math.abs(top[p + 1] - t),
      Math.abs(top[p - P] - t), Math.abs(top[p + P] - t));
    dress(sl, x, y, t, biome[ly * CS + lx], slope, dr);
    const cap = dr[0], under = dr[1], depth = dr[2];
    const hc = hash2(oreSalt, x, y);
    for (let z = 0; z <= t; z++) {
      let id = z === 0 ? BEDROCK : z < t - depth ? ROCK : z < t ? under : cap;
      if (id === ROCK && z > 2 && hash2(hc, z, 0x0e) < ORE_BELOW) id = ORE;
      out[(z << 8) | off] = id;
    }
    for (let z = t + 1; z < SEA; z++) out[(z << 8) | off] = WATER;
  }
  if (trees) plantTrees(gen, cx, cy, out);
  return out;
}

const sampleScratch = { top: new Int16Array(P * P), biome: new Uint8Array(CS * CS) };

/** One column's blocks, indexed `(z * 16 + ly) * 16 + lx`. */
export function generateColumn(gen, cx, cy, out = new Uint8Array(CELLS)) {
  return fillColumn(gen, cx, cy, sampleColumn(gen, cx, cy, sampleScratch), out);
}

// ─── Tools and spawn ───────────────────────────────────────

/**
 * Biome weights, the heaviest biome, the region, and whether a river channel
 * (`river`) or the lake at the end of one (`basin`) cut the ground here, for
 * tests and tools. Not used by generation.
 */
export function biomeAt(gen, x, y) {
  const sl = saltsFor(gen.seed >>> 0), w = new Float64Array(6);
  rawHeight(sl, x, y, w);
  const weights = Array.from(w.subarray(0, 5));
  return { weights, biome: BIOMES[weights.indexOf(Math.max(...weights))], region: regionAt(gen, x, y), river: w[RIVER] === 1, basin: w[RIVER] === 2 };
}

/** Which kind of region a cell is in: "archipelago", "coast" or "interior". */
export function regionAt(gen, x, y) {
  const g = regionField(saltsFor(gen.seed >>> 0), x, y);
  return g > 0.25 ? "archipelago" : g < -0.25 ? "interior" : "coast";
}

/** Does any tree put a block in the columns [x0, x1] × [y0, y1], at any height? */
export function treeOver(gen, x0, y0, x1, y1) {
  let hit = false;
  const i0 = Math.floor((x0 - TREE_REACH) / TREE_CELL), i1 = Math.floor((x1 + TREE_REACH) / TREE_CELL);
  const j0 = Math.floor((y0 - TREE_REACH) / TREE_CELL), j1 = Math.floor((y1 + TREE_REACH) / TREE_CELL);
  for (let j = j0; j <= j1 && !hit; j++) for (let i = i0; i <= i1 && !hit; i++) {
    const tr = treeAtCell(gen, i, j);
    if (!tr) continue;
    treeShape(tr.species, tr.h, (dx, dy) => {
      const x = tr.x + dx, y = tr.y + dy;
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) hit = true;
    });
  }
  return hit;
}

const SPAWN_REACH = 40;

/**
 * The nearest dry, level cell to (x, y) inside `bounds` when given: its eight
 * neighbours within one block, its ground at or above the sea line, and open
 * sky over it and its neighbours (no trunk to walk into, no crown overhead).
 * Square rings outward, as in version 1.
 * @returns {{x:number,y:number,z:number}} z is the first air cell above ground
 */
export function findSpawn(gen, x, y, bounds = null) {
  const cx = Math.floor(x), cy = Math.floor(y);
  const inside = (bx, by) => !bounds || (bx >= bounds.x0 && by >= bounds.y0 && bx < bounds.x1 && by < bounds.y1);
  const ok = (bx, by) => {
    if (!inside(bx, by)) return -1;
    const t = surfaceHeight(gen, bx, by);
    if (t < SEA) return -1;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (Math.abs(surfaceHeight(gen, bx + dx, by + dy) - t) > 1) return -1;
    }
    if (treeOver(gen, bx - 1, by - 1, bx + 1, by + 1)) return -1;
    return t;
  };
  for (let r = 0; r <= SPAWN_REACH; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const t = ok(cx + dx, cy + dy);
      if (t >= 0) return { x: cx + dx + 0.5, y: cy + dy + 0.5, z: t + 1 };
    }
  }
  return { x: cx + 0.5, y: cy + 0.5, z: Math.max(surfaceHeight(gen, cx, cy), SEA - 1) + 1 };
}
