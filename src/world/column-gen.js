// src/world/column-gen.js
/**
 * Terrain, one 16 × 16 × 64 column at a time, as a pure function of the
 * world's generator settings `{kind, seed, v}` and the column's coordinates.
 * The same column comes out byte-identical whatever order columns are made in,
 * on whatever browser, because saved edits (phase 3) are stored as differences
 * against exactly these bytes.
 *
 * Rules for anyone touching this file:
 * - Only `+ - * /`, `Math.floor`, `Math.round`, `Math.abs`, `Math.min`,
 *   `Math.max`, `Math.imul` and bit operations. ECMAScript pins those to exact
 *   IEEE-754 results; `Math.sin`, `Math.cos`, `Math.exp`, `Math.pow` and friends
 *   are left to each engine's accuracy and would split worlds between browsers.
 *   A unit test scans this file for them.
 * - No sequential RNG and no state carried between cells or columns: every
 *   value is a hash of the seed and the cell's coordinates.
 * - A generator version is never changed once worlds exist that were saved
 *   against it. New terrain is a new version, with the old one kept beside it.
 */
import { AIR, BEDROCK } from "./blocks.js";

/** Generator version, stored in every world's `meta.gen.v`. */
export const GEN_VERSION = 1;

const GRASS = 11, DIRT = 10, SAND = 12, ROCK = 13, ORE = 14;
const CS = 16, H = 64, CELLS = CS * CS * H;
/** A flat world's surface, and the height every biome is built around. */
const FLAT_TOP = 31;
/**
 * Generated ground stays within 20..47, so z = 48 and up is always open air:
 * room to build over the highest peak, and a height tests can rely on.
 */
export const MIN_TOP = 20, MAX_TOP = 47;
/** Ore is 2% of rock above z = 2: a hash under this share of 2³². */
const ORE_BELOW = Math.floor(0.02 * 4294967296);

export const BIOMES = Object.freeze(["plains", "hills", "highlands", "sands"]);
const PLAINS = 0, HILLS = 1, HIGHLANDS = 2, SANDS = 3;

/** 32-bit multiply-xorshift mix of a seed and two integers. */
export function hash2(s, i, j) {
  let h = Math.imul(s ^ Math.imul(i, 0x9e3779b1), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13) ^ Math.imul(j, 0xc2b2ae35), 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 16), 0x165667b1);
  return (h ^ (h >>> 15)) >>> 0;
}

const smooth = (t) => t * t * (3 - 2 * t);
/** 0 below `a`, 1 above `b`, smoothstep between. */
const ramp = (v, a, b) => (v <= a ? 0 : v >= b ? 1 : smooth((v - a) / (b - a)));

/**
 * Value noise in [-1, 1) on an unbounded lattice of spacing `s` cells. Each
 * lattice point is a hash of its own coordinates, so nothing wraps and nothing
 * repeats (the old 17 × 17 table repeated every 16 lattice cells).
 */
function noise(salt, x, y, s) {
  const gx = x / s, gy = y / s;
  const i = Math.floor(gx), j = Math.floor(gy);
  const fx = smooth(gx - i), fy = smooth(gy - j);
  const v00 = hash2(salt, i, j), v10 = hash2(salt, i + 1, j);
  const v01 = hash2(salt, i, j + 1), v11 = hash2(salt, i + 1, j + 1);
  // Interpolate the raw 32-bit values and scale once: exact integers in a
  // double, and one division instead of four.
  const a = v00 + (v10 - v00) * fx, b = v01 + (v11 - v01) * fx;
  return (a + (b - a) * fy) / 2147483648 - 1;
}

/**
 * The same noise on a turned lattice. Value noise creases along its grid, so
 * a lone octave draws long straight contours and borders on the x and y axes;
 * octaves on differently turned lattices hide each other's. Each turn is an
 * integer map that also scales — (3x − 4y, 4x + 3y) by 5 for about 53°,
 * (5x + 12y, 12x − 5y) by 13 for about 67° mirrored — so the spacing is
 * scaled to match: exact integer inputs, no trigonometry.
 */
const turned = (salt, x, y, s) => noise(salt, 3 * x - 4 * y, 4 * x + 3 * y, 5 * s);
const turned2 = (salt, x, y, s) => noise(salt, 5 * x + 12 * y, 12 * x - 5 * y, 13 * s);

/** One salt per noise layer, so the layers of one seed are unrelated. */
const L_RUGGED = 0, L_DRY = 1, L_BIG = 2, L_D24 = 3, L_D9 = 4, L_RIDGE = 5, L_JITTER = 6, L_ORE = 7, L_CRAG = 8, LAYERS = 9;
let saltSeed = -1;
const salts = new Int32Array(LAYERS);
function saltsFor(seed) {
  if (seed !== saltSeed) {
    for (let k = 0; k < LAYERS; k++) salts[k] = hash2(seed, k, 0x5eed) | 0;
    saltSeed = seed;
  }
  return salts;
}

/**
 * Biome weights at a cell, into `w` (four entries summing to 1). Two
 * low-frequency fields decide them: ruggedness walks plains → hills →
 * highlands, and dryness turns the flat end into sand flats. Every weight is a
 * smoothstep of a smooth field, so heights blended by them have no step
 * anywhere, and a biome border is a slope, never a cliff.
 */
function biomeWeights(sl, x, y, w) {
  const r = turned(sl[L_RUGGED], x, y, 112) * 0.8 + noise(sl[L_RUGGED], x + 7919, y - 7919, 44) * 0.2;
  const d = turned2(sl[L_DRY], x, y, 136) * 0.8 + noise(sl[L_DRY], x - 4447, y + 4447, 52) * 0.2;
  const high = ramp(r, 0.18, 0.4);
  const flat = 1 - ramp(r, -0.22, -0.02);
  const dry = ramp(d, 0.12, 0.32) * flat;
  w[PLAINS] = flat - dry;
  w[SANDS] = dry;
  w[HIGHLANDS] = high;
  w[HILLS] = 1 - flat - high;
  return w;
}

/**
 * Unrounded surface height at a cell: each biome's own height blended by the
 * weights. Also leaves the weights in `w` for the caller.
 */
function rawHeight(sl, x, y, w) {
  biomeWeights(sl, x, y, w);
  // Today's shape: two octaves at 24 and 9 cells, weighted 0.7 / 0.3.
  const detail = turned2(sl[L_D24], x, y, 24) * 0.7 + noise(sl[L_D9], x, y, 9) * 0.3;
  let h = 0;
  if (w[PLAINS] > 0) h += w[PLAINS] * (32 + detail * 4);
  if (w[SANDS] > 0) h += w[SANDS] * (29 + detail * 1.5);
  if (w[HILLS] > 0 || w[HIGHLANDS] > 0) {
    const big = turned(sl[L_BIG], x, y, 52);
    if (w[HILLS] > 0) h += w[HILLS] * (36 + big * 9 + detail * 2.5);
    if (w[HIGHLANDS] > 0) {
      // Ridged noise: 1 − |n| creases along the zero line of n, which is what
      // gives the highlands crests and crags instead of domes. The crags are
      // weighted in twice, so they only rise where the highlands are well
      // established and the border stays a walkable slope.
      const n = turned(sl[L_RIDGE], y, x, 30) * 0.7 + noise(sl[L_RIDGE], x, y, 13) * 0.3;
      const ridge = 1 - Math.abs(n), wh = w[HIGHLANDS];
      h += wh * (34 + big * 4 + ridge * ridge * 13 * wh + detail * 1.5);
      // Tors: where a short-range noise crests, knobs of rock a few blocks
      // high. Only the part above the threshold counts, so the height stays
      // continuous; their flanks are the steep, rock-capped ground the
      // highlands are named for.
      const crag = noise(sl[L_CRAG], x, y, 7) - 0.4;
      if (crag > 0) h += wh * wh * crag * 8;
    }
  }
  return h;
}

/**
 * Peaks are squashed above SOFT_TOP rather than cut, so the MAX_TOP lid is
 * almost never reached (about 0.02% of cells) and summits stay rounded.
 */
const SOFT_TOP = 42;
const clampTop = (h) => Math.max(MIN_TOP, Math.min(MAX_TOP, Math.round(h > SOFT_TOP ? SOFT_TOP + (h - SOFT_TOP) * 0.5 : h)));
const wScratch = new Float64Array(4);

/**
 * z of the top solid block of generated terrain at a cell. A pure function of
 * the seed and the cell, so spawn height, and later a blend band's edge
 * heights, are known without generating the column.
 */
export function surfaceHeight(gen, x, y) {
  if (gen.kind === "flat") return FLAT_TOP;
  if (gen.kind !== "terrain") return -1;
  return clampTop(rawHeight(saltsFor(gen.seed >>> 0), x, y, wScratch));
}

/** Padded 18 × 18 height grid: the column plus one ring, for slopes at its edge. */
const P = CS + 2;

/**
 * The first half of generating a column: surface heights and surface biomes,
 * with no blocks yet. `out.top` is an 18 × 18 grid of top z indexed
 * `(ly + 1) * 18 + (lx + 1)`, so it covers one cell past the column on each
 * side; `out.biome` is the 16 × 16 biome that dresses each surface.
 *
 * Kept apart from `fillColumn` so a later blend band (spec decision #1: old
 * worlds grow outward) can feather `out.top` toward an old world's edge heights
 * before any block is written. Layering and ore then follow the feathered
 * heights with no change here.
 */
export function sampleColumn(gen, cx, cy, out = { top: new Int16Array(P * P), biome: new Uint8Array(CS * CS) }) {
  const { top, biome } = out;
  if (gen.kind !== "terrain") {
    top.fill(gen.kind === "flat" ? FLAT_TOP : -1);
    biome.fill(PLAINS);
    return out;
  }
  const sl = saltsFor(gen.seed >>> 0), w = wScratch;
  const bx = cx * CS, by = cy * CS;
  for (let py = 0; py < P; py++) for (let px = 0; px < P; px++) {
    const x = bx + px - 1, y = by + py - 1;
    top[py * P + px] = clampTop(rawHeight(sl, x, y, w));
    if (px === 0 || py === 0 || px === P - 1 || py === P - 1) continue;
    // Surface biome: the heaviest weight after a little patchy jitter, so a
    // border frays into drifts and outcrops instead of a straight seam.
    const j = noise(sl[L_JITTER], x, y, 5) * 0.12 + turned(sl[L_JITTER], y, x, 16) * 0.2;
    let best = PLAINS, bw = -1;
    for (let k = 0; k < 4; k++) {
      const v = w[k] + (k & 1 ? j : -j);
      if (v > bw) { bw = v; best = k; }
    }
    biome[(py - 1) * CS + (px - 1)] = best;
  }
  return out;
}

/** Height at which highlands turn from grassy shoulders to bare rock. */
const ROCKLINE = 41;

/**
 * The second half: blocks from a sampled surface. Layering is today's —
 * bedrock at 0, rock, four of dirt, grass on top, sand on low ground — with
 * sand flats sanded four deep and highlands bare rock wherever they are steep
 * or high. A rock cell above z = 2 is ore when its own hash says so.
 */
export function fillColumn(gen, cx, cy, sample, out = new Uint8Array(CELLS)) {
  out.fill(AIR);
  if (gen.kind !== "terrain" && gen.kind !== "flat") return out;
  const terrain = gen.kind === "terrain";
  const { top, biome } = sample;
  const oreSalt = terrain ? saltsFor(gen.seed >>> 0)[L_ORE] : 0;
  for (let ly = 0; ly < CS; ly++) for (let lx = 0; lx < CS; lx++) {
    const p = (ly + 1) * P + (lx + 1), t = top[p];
    if (t < 0) continue;
    const b = biome[ly * CS + lx], off = (ly << 4) | lx;
    let cap = GRASS, under = DIRT, depth = 4;
    if (terrain) {
      if (b === SANDS || (b !== HIGHLANDS && t <= 29)) { cap = SAND; under = SAND; }
      else if (b === HIGHLANDS) {
        const slope = Math.max(
          Math.abs(top[p - 1] - t), Math.abs(top[p + 1] - t),
          Math.abs(top[p - P] - t), Math.abs(top[p + P] - t));
        if (slope >= 2 || t >= ROCKLINE) { cap = ROCK; under = ROCK; }
        else depth = 2;
      }
    }
    const x = cx * CS + lx, y = cy * CS + ly;
    const hc = terrain ? hash2(oreSalt, x, y) : 0;
    for (let z = 0; z <= t; z++) {
      let id = z === 0 ? BEDROCK : z < t - depth ? ROCK : z < t ? under : cap;
      if (terrain && id === ROCK && z > 2 && hash2(hc, z, 0x0e) < ORE_BELOW) id = ORE;
      out[(z << 8) | off] = id;
    }
  }
  return out;
}

const sampleScratch = { top: new Int16Array(P * P), biome: new Uint8Array(CS * CS) };

/**
 * One column's blocks, indexed `(z * 16 + ly) * 16 + lx` like `World`'s
 * columns. `gen.kind` is "terrain", "flat" or "void" (all air).
 */
export function generateColumn(gen, cx, cy, out = new Uint8Array(CELLS)) {
  return fillColumn(gen, cx, cy, sampleColumn(gen, cx, cy, sampleScratch), out);
}

/** Biome weights at a cell, for tests and tools. Not used by generation. */
export function biomeAt(gen, x, y) {
  const w = biomeWeights(saltsFor(gen.seed >>> 0), x, y, new Float64Array(4));
  return { weights: Array.from(w), biome: BIOMES[w.indexOf(Math.max(...w))] };
}

/** How far `findSpawn` looks for level ground before settling for the start. */
const SPAWN_REACH = 24;

/**
 * The cell nearest (x, y) where the player can walk off in every direction:
 * its eight neighbours are within one block of it, which the one-block
 * step-up climbs without a jump. Square rings outward, so the nearest such
 * cell wins; the start cell itself when nothing in reach qualifies. Uses only
 * `surfaceHeight`, so it needs no column in memory.
 * @returns {{x:number,y:number,z:number}} z is the first air cell above ground
 */
export function findSpawn(gen, x, y) {
  const cx = Math.floor(x), cy = Math.floor(y);
  const level = (bx, by) => {
    const t = surfaceHeight(gen, bx, by);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (Math.abs(surfaceHeight(gen, bx + dx, by + dy) - t) > 1) return -1;
    }
    return t;
  };
  for (let r = 0; r <= SPAWN_REACH; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const t = level(cx + dx, cy + dy);
      if (t >= 0) return { x: cx + dx + 0.5, y: cy + dy + 0.5, z: t + 1 };
    }
  }
  return { x: cx + 0.5, y: cy + 0.5, z: surfaceHeight(gen, cx, cy) + 1 };
}
