// src/world/world-expand.js
/**
 * A bounded world grows endless, and can go back (endless-world decision #1).
 *
 * - A world with a seeded generator (made in phases 2–3 on version 1, or a
 *   Bounded world made since) only drops its bounds: its generator already
 *   runs past them, so the land beyond meets the old edge with no seam.
 * - A void world (migrated from v4, or a legacy map) has no terrain of its
 *   own outside; its content is all saved deltas. It gets a blend generator
 *   (column-gen-blend.js): air inside the old area, so every delta stays
 *   valid, and new terrain outside feathered toward the old edge's heights,
 *   which are read here, once, from the old columns.
 *
 * Both work on the v5 document — encode, change `meta`, decode — so what the
 * player gets is exactly what a reload of the saved world gives.
 * `meta.expandedFrom` keeps the old bounds, so the change can be undone for
 * good: `restoreBounds` puts the world back inside them. Anything built
 * outside stays in its saved deltas, unseen by a bounded world, and returns
 * if the world is expanded again.
 */
import { World } from "./world.js";
import { AIR, BEDROCK } from "./blocks.js";
import { encodeWorld, decodeWorld } from "./world-codec.js";
import { genOf } from "./world-delta.js";
import { BLEND_VERSIONS, perimeter } from "./column-gen-blend.js";
import { MIN_TOP, MAX_TOP } from "./column-gen-v2.js";
import { rleEncode } from "./rle.js";
import { randomSeed } from "./world-gen.js";

const DIRT = 10, GRASS = 11, SAND = 12, ROCK = 13, ORE = 14;
/** What the ground of every generator, old or new, is made of. */
const NATURAL = new Set([BEDROCK, ROCK, ORE, DIRT, GRASS, SAND]);
/** The height given an old edge cell with no ground at all under it. */
const NO_GROUND = 31;
/** Cells either side of an edge cell in its median. */
const MEDIAN_REACH = 2;

/**
 * The old edge's profile (see column-gen-blend.js): for every cell on the
 * perimeter of `area`, the top of its natural ground — the unbroken run of
 * bedrock, rock, ore, dirt, grass and sand from z = 0 up, so a wall built on
 * the edge is not ground — and the block on top of it. A median of five along
 * each side drops pits and spikes a cell or two wide, which the band would
 * otherwise carry 24 blocks out.
 * @returns {{edge:number[], caps:number[]}} run-length encoded, in profile order
 */
export function edgeProfile(world, area) {
  const { x0, y0, x1, y1 } = area, w = x1 - x0, h = y1 - y0, n = perimeter(area);
  const raw = new Int16Array(n), caps = new Uint8Array(n);
  const read = (i, x, y) => {
    let z = -1;
    while (z + 1 < World.H && NATURAL.has(world.get(x, y, z + 1))) z++;
    raw[i] = z;
    caps[i] = z >= 0 ? world.get(x, y, z) : AIR;
  };
  for (let x = x0; x < x1; x++) { read(x - x0, x, y0); read(w + x - x0, x, y1 - 1); }
  for (let y = y0; y < y1; y++) { read(2 * w + y - y0, x0, y); read(2 * w + h + y - y0, x1 - 1, y); }

  const edge = new Uint8Array(n), win = [];
  for (const [start, len] of [[0, w], [w, w], [2 * w, h], [2 * w + h, h]]) {
    for (let k = 0; k < len; k++) {
      win.length = 0;
      for (let o = -MEDIAN_REACH; o <= MEDIAN_REACH; o++) {
        const v = raw[start + Math.max(0, Math.min(len - 1, k + o))];
        if (v >= 0) win.push(v);
      }
      win.sort((a, b) => a - b);
      const m = win.length ? win[(win.length - 1) >> 1] : NO_GROUND;
      edge[start + k] = Math.max(MIN_TOP, Math.min(MAX_TOP, m));
    }
  }
  return { edge: rleEncode(edge), caps: rleEncode(caps) };
}

export const canExpand = (world) => !world.endless;
export const canRestoreBounds = (world) => world.endless && !!world.meta.expandedFrom;

/**
 * `world` grown endless, as a new world; `world` itself when it already is.
 * Idempotent: a world that was expanded, restored and expanded again keeps
 * the generator it got the first time, so its new land never moves.
 */
export function expandWorld(world) {
  if (!canExpand(world)) return world;
  const { x0, y0, x1, y1 } = world.bounds;
  const doc = encodeWorld(world), meta = doc.meta, gen = genOf(meta);
  if (gen.kind === "void") {
    const area = { x0, y0, x1, y1 };
    meta.gen = {
      kind: "blend", seed: gen.seed ?? randomSeed(), v: BLEND_VERSIONS[BLEND_VERSIONS.length - 1],
      area, ...edgeProfile(world, area),
    };
  }
  meta.expandedFrom = { x0, y0, x1, y1 };
  delete meta.bounds;
  meta.endless = true;
  return decodeWorld(doc);
}

/**
 * An expanded world back inside the bounds it grew from, as a new world;
 * `world` itself when it did not grow from any. Its generator is kept, so the
 * old area is cell for cell what it was, and the edits made outside wait in
 * `edits` for the next expansion. A spawn left outside goes back to the
 * default.
 */
export function restoreBounds(world) {
  if (!canRestoreBounds(world)) return world;
  const doc = encodeWorld(world), meta = doc.meta, b = meta.expandedFrom;
  meta.bounds = b;
  delete meta.expandedFrom;
  delete meta.endless;
  const s = meta.spawn;
  if (s && !(s.x >= b.x0 && s.y >= b.y0 && s.x < b.x1 && s.y < b.y1)) delete meta.spawn;
  return decodeWorld(doc);
}
