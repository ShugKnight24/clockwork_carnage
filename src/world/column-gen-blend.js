// src/world/column-gen-blend.js
/**
 * The generator of an old world grown endless (endless-world decision #1).
 * `{kind: "blend", seed, v, area, edge, caps}`:
 *
 * - Inside `area`, the old world's bounds, it makes only air, exactly as the
 *   void generator did. The old world's content is all saved deltas, so every
 *   one of them stays valid byte for byte.
 * - Outside, it is generator version `v`'s terrain for `seed`. Within BAND
 *   blocks of the old edge, the surface is feathered toward the old edge's own
 *   heights, so the new land meets the old at its height and there is no cliff.
 *
 * `edge` and `caps` are the old edge's profile, read once when the world was
 * converted (world-expand.js): the natural ground height of each cell on the
 * area's perimeter and the block on top of it, run-length encoded, in the
 * order south row, north row, west column, east column (corners in both).
 * They ride in `meta.gen`, so generating a column next to the old area never
 * needs an old column in memory.
 *
 * The rules of column-gen.js hold here, and a unit test scans this file:
 * only `+ - * /`, `Math.floor`, `Math.round`, `Math.abs`, `Math.min`,
 * `Math.max`, `Math.imul` and bit operations; no state between cells or
 * columns but caches of pure values.
 *
 * FROZEN on 2026-09-23 with version 2 outside: worlds that grew endless save
 * their new land as deltas against this file's output, held to golden hashes
 * in tests/unit/column-gen-blend.test.js. A change is a new `v`, never an edit.
 */
import { AIR, WATER } from "./blocks.js";
import * as V2 from "./column-gen-v2.js";
import { SPECIES, TREE_REACH } from "./trees.js";
import { rleDecode, rleLength } from "./rle.js";

/** Blocks over which new ground is feathered from the old edge height to its own. */
export const BAND = 24;
/**
 * By this distance from the old area the ground is held up to the sea's dry
 * line, and it stays there a block further; nothing that near holds water.
 * Sea water never flows, so water beside the old area's air would stand there
 * as a wall. This way every water cell lies beyond the dyke, and a step
 * between neighbours changes the distance by at most one, so every water cell
 * has ground or more water beside it. Past the dyke the floor falls a block a
 * block, so the ground never drops off it.
 */
export const DYKE = 4;

const GRASS = 11, DIRT = 10, SAND = 12;
const CS = 16, H = 64, P = CS + 2, CELLS = CS * CS * H;
/** Ground at this height has no water over it. */
const DRY = V2.SEA - 1;
/**
 * Past this distance a column is version 2's, byte for byte: its heights, and
 * those of every tree root that can reach it and the root's neighbours, lie
 * beyond the band.
 */
const FAR = BAND + TREE_REACH + 1;
/**
 * Generator v2 dresses low dry land as beach, which would ring an old grass
 * world with sand. Out to 6..13 blocks from an old grass edge (a noise frays
 * the line into patches), sand on dry ground stays grass and dirt instead.
 */
const GRASS_NEAR = 6, GRASS_FRAY = 7;
/**
 * The band's contours would run parallel to the old edge, which is straight.
 * A noise moves the blend weight's distance by up to WARP blocks mid-band
 * (none at either end), so they wander like a coast's.
 */
const WARP = 3;
/** Areas are bounded worlds, which are held whole; this caps a hostile profile. */
const MAX_PERIMETER = 65536;
const BORDER = 1 << 20;

/** Generator versions a blend can grow outside its area. */
export const BLEND_VERSIONS = Object.freeze([V2.GEN_V2]);

/** 32-bit multiply-xorshift mix, as the generators use (kept separate on purpose). */
function hash2(s, i, j) {
  let h = Math.imul(s ^ Math.imul(i, 0x9e3779b1), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13) ^ Math.imul(j, 0xc2b2ae35), 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 16), 0x165667b1);
  return (h ^ (h >>> 15)) >>> 0;
}

const smooth = (t) => t * t * (3 - 2 * t);

/** Value noise in [-1, 1) on a hashed lattice of spacing `s`, as the generators make it. */
function noise(salt, x, y, s) {
  const gx = x / s, gy = y / s;
  const i = Math.floor(gx), j = Math.floor(gy);
  const fx = smooth(gx - i), fy = smooth(gy - j);
  const v00 = hash2(salt, i, j), v10 = hash2(salt, i + 1, j);
  const v01 = hash2(salt, i, j + 1), v11 = hash2(salt, i + 1, j + 1);
  const a = v00 + (v10 - v00) * fx, b = v01 + (v11 - v01) * fx;
  return (a + (b - a) * fy) / 2147483648 - 1;
}

/** Cells on the perimeter of `area`: the length of `edge` and `caps`. */
export const perimeter = (a) => 2 * ((a.x1 - a.x0) + (a.y1 - a.y0));

/** Is `gen` a blend generator this build can reproduce? */
export function checkBlend(gen) {
  const a = gen.area;
  const int = (v) => Number.isInteger(v) && v >= -BORDER && v <= BORDER;
  if (!BLEND_VERSIONS.includes(gen.v)) return false;
  if (!Number.isInteger(gen.seed) || gen.seed < 0 || gen.seed > 0xffffffff) return false;
  if (!a || typeof a !== "object" || ![a.x0, a.y0, a.x1, a.y1].every(int) || a.x0 >= a.x1 || a.y0 >= a.y1) return false;
  const n = perimeter(a);
  return n <= MAX_PERIMETER && rleLength(gen.edge) === n && rleLength(gen.caps) === n;
}

/**
 * The decoded profile of a generator, cached on the generator object (meta
 * objects are not mutated; a clone decodes again, which is cheap).
 */
const profiles = new WeakMap();
function profileOf(gen) {
  let p = profiles.get(gen);
  if (p) return p;
  const { x0, y0, x1, y1 } = gen.area, n = perimeter(gen.area);
  p = {
    gen, x0, y0, xe: x1 - 1, ye: y1 - 1, w: x1 - x0, h: y1 - y0,
    warpSalt: hash2(gen.seed >>> 0, 0xb1e, 1) | 0, fraySalt: hash2(gen.seed >>> 0, 0xb1e, 2) | 0,
    edge: rleDecode(gen.edge, n), caps: rleDecode(gen.caps, n),
  };
  // Tree hooks for generator v2, made once per profile rather than per column.
  p.topAt = (x, y, t) => heightAt(p, x, y, t);
  p.treeAt = (g, i, j) => {
    const tr = V2.treeAtCell(g, i, j, p.topAt);
    if (!tr) return null;
    // Reach 3 (across or along) from a root beyond the dyke never touches the old area.
    if (cheb(p, tr.x, tr.y) <= DYKE) return null;
    if ((tr.species === SPECIES.PALM || tr.species === SPECIES.SHRUB) && keepsGrass(p, tr.x, tr.y, dist(p, tr.x, tr.y), tr.z - 1)) return null;
    return tr;
  };
  profiles.set(gen, p);
  return p;
}

/** Chebyshev distance from a cell to the old area: 1 beside it, 0 or less inside. */
const cheb = (p, x, y) => Math.max(p.x0 - x, x - p.xe, p.y0 - y, y - p.ye);

/**
 * The distance the band is measured in: straight out from a side, and round
 * a corner by an octagon (within 8% of a circle, no square root). Measured
 * square, the band's contours would turn each corner in a sharp diagonal
 * crease. Never less than `cheb`, never more than √2 times it.
 */
function dist(p, x, y) {
  const ax = Math.max(p.x0 - x, x - p.xe), ay = Math.max(p.y0 - y, y - p.ye);
  if (ax <= 0 || ay <= 0) return Math.max(ax, ay);
  return ax > ay ? ax + 0.4142 * ay : ay + 0.4142 * ax;
}

/**
 * Profile index of the old edge cell nearest (x, y), which for a cell on the
 * perimeter is itself; -1 for a cell deeper inside.
 */
function edgeAt(p, x, y) {
  const px = x < p.x0 ? p.x0 : x > p.xe ? p.xe : x;
  const py = y < p.y0 ? p.y0 : y > p.ye ? p.ye : y;
  if (y <= p.y0) return px - p.x0;
  if (y >= p.ye) return p.w + px - p.x0;
  if (x <= p.x0) return 2 * p.w + py - p.y0;
  if (x >= p.xe) return 2 * p.w + p.h + py - p.y0;
  return -1;
}

/**
 * Ground height at a cell whose own generator would put it at `g`. In the
 * band: the old edge height `e` eased into the generator's unrounded level by
 * a smoothstep of distance, then rounded once, so the first new cell sits at
 * `e` and the last at `g`, never a step. (Easing the rounded `g` would round
 * twice and speckle the ground with single-block bumps.) Inside the old area:
 * the old edge height on its perimeter (what the slope of the cells beside it
 * reads), -1 deeper in.
 */
function heightAt(p, x, y, g) {
  const d = dist(p, x, y);
  if (d >= BAND) return g;
  const i = edgeAt(p, x, y);
  if (d <= 0) return i < 0 ? -1 : p.edge[i];
  let e = p.edge[i];
  // An edge below the dry line is eased up to it across the dyke and blended
  // from there, so a low old world is ringed by land where the land beyond
  // is dry, not by a moat.
  if (e < DRY) e += (DRY - e) * smooth(d < DYKE ? d / DYKE : 1);
  const level = V2.surfaceLevel(p.gen, x, y);
  const u = d / BAND, w = u + WARP / BAND * 4 * u * (1 - u) * noise(p.warpSalt, x, y, 20);
  let h = e + (level - e) * smooth(w < 0 ? 0 : w > 1 ? 1 : w);
  // The dyke's floor: the eased edge (at the dry line by DYKE), level for a
  // block, then down no faster than a block a block, so a deep sea beyond
  // shelves away from it.
  const f = d <= DYKE ? Math.min(e, DRY) : DRY - Math.max(0, d - DYKE - 1);
  if (h < f) h = f;
  return Math.max(V2.MIN_TOP, Math.min(V2.MAX_TOP, Math.round(h)));
}

/** Does this dry band cell keep the old edge's grass rather than beach sand? */
function keepsGrass(p, x, y, d, t) {
  if (d <= 0 || d >= GRASS_NEAR + GRASS_FRAY) return false;
  if (d >= GRASS_NEAR + GRASS_FRAY * (noise(p.fraySalt, x, y, 6) * 0.5 + 0.5)) return false;
  if (p.caps[edgeAt(p, x, y)] !== GRASS) return false;
  return t >= DRY || d < DYKE + 1;
}

/** The smallest distance from any cell of a column to the old area. */
function columnDist(p, cx, cy) {
  const bx = cx * CS, by = cy * CS;
  return Math.max(p.x0 - (bx + CS - 1), bx - p.xe, p.y0 - (by + CS - 1), by - p.ye);
}

const insideArea = (p, cx, cy) => cx * CS >= p.x0 && cx * CS + CS - 1 <= p.xe && cy * CS >= p.y0 && cy * CS + CS - 1 <= p.ye;

/** z of the top block of generated ground at a cell; -1 inside the old area. */
export function surfaceHeight(gen, x, y) {
  const p = profileOf(gen);
  if (cheb(p, x, y) <= 0) return -1;
  return heightAt(p, x, y, V2.surfaceHeight(gen, x, y));
}

/** Version 2's sample of the column (18 × 18 heights, 16 × 16 biomes), feathered. */
export function sampleColumn(gen, cx, cy, out = { top: new Int16Array(P * P), biome: new Uint8Array(CS * CS) }) {
  V2.sampleColumn(gen, cx, cy, out);
  const p = profileOf(gen);
  if (columnDist(p, cx, cy) - 1 >= BAND) return out;
  const { top } = out, bx = cx * CS - 1, by = cy * CS - 1;
  for (let py = 0; py < P; py++) for (let px = 0; px < P; px++) {
    const i = py * P + px;
    top[i] = heightAt(p, bx + px, by + py, top[i]);
  }
  return out;
}

/**
 * Blocks from a feathered sample: version 2's layering, water and dressing,
 * then the old area emptied, the dyke drained, old grass kept, and trees
 * rooted on the feathered ground and kept off the old area.
 */
export function fillColumn(gen, cx, cy, sample, out = new Uint8Array(CELLS)) {
  const p = profileOf(gen);
  V2.fillColumn(gen, cx, cy, sample, out, { trees: false });
  if (columnDist(p, cx, cy) < GRASS_NEAR + GRASS_FRAY) {
    const { top } = sample;
    for (let ly = 0; ly < CS; ly++) for (let lx = 0; lx < CS; lx++) {
      const x = cx * CS + lx, y = cy * CS + ly, off = (ly << 4) | lx;
      const d = dist(p, x, y);
      if (d <= 0) {
        for (let z = 0; z < H; z++) out[(z << 8) | off] = AIR;
        continue;
      }
      const t = top[(ly + 1) * P + lx + 1];
      if (d < DYKE + 1) for (let z = t + 1; z < V2.SEA; z++) if (out[(z << 8) | off] === WATER) out[(z << 8) | off] = AIR;
      if (keepsGrass(p, x, y, d, t) && out[(t << 8) | off] === SAND) {
        out[(t << 8) | off] = GRASS;
        for (let z = t - 1; z >= t - 3 && z > 0; z--) if (out[(z << 8) | off] === SAND) out[(z << 8) | off] = DIRT;
      }
    }
  }
  V2.plantTrees(gen, cx, cy, out, p.treeAt);
  return out;
}

const sampleScratch = { top: new Int16Array(P * P), biome: new Uint8Array(CS * CS) };

/** One column's blocks, indexed `(z * 16 + ly) * 16 + lx`. */
export function generateColumn(gen, cx, cy, out = new Uint8Array(CELLS)) {
  const p = profileOf(gen);
  if (insideArea(p, cx, cy)) return out.fill(AIR);
  if (columnDist(p, cx, cy) >= FAR) return V2.generateColumn(gen, cx, cy, out);
  return fillColumn(gen, cx, cy, sampleColumn(gen, cx, cy, sampleScratch), out);
}

/** Version 2's biome at a cell, for tests and tools. */
export const biomeAt = (gen, x, y) => V2.biomeAt(gen, x, y);
