// src/world/trees.js
/**
 * Tree shapes, shared by generator v2 and by saplings growing in a live
 * world. A shape is a pure function of its species and one 32-bit hash, laid
 * out around its root: `dz = 0` is the first cell above the ground it stands
 * on. Only integer arithmetic and bit operations, so the generator may call
 * it (column-gen-v2.js carries the rules for frozen generators).
 *
 * The shapes and `plantOver` are part of generator version 2's frozen output
 * (column-gen-v2.js): changing them moves every v2 world. A new shape is a new
 * species, used only by a later generator version or by saplings.
 *
 * Trees overlap freely. Whatever order they are planted in, a cell ends as
 * the strongest of what was written there: terrain and water are never
 * replaced, a log beats leaves, and leaves only fill air. That is what lets
 * each column plant its neighbours' trees without asking which came first.
 */
import { AIR, LOG, LEAVES, SAPLING } from "./blocks.js";

export const SPECIES = Object.freeze({ BROADLEAF: 0, PINE: 1, PALM: 2, SHRUB: 3 });
export const SPECIES_NAMES = Object.freeze(["broadleaf", "pine", "palm", "shrub"]);

/** No block of any shape is further than this from its root, across or along. */
export const TREE_REACH = 3;

/** The block a cell holds after `id` is planted over `cur`. */
export function plantOver(cur, id) {
  if (cur === AIR) return id;
  if (cur === LEAVES && id === LOG) return LOG;
  return cur;
}

/** Height of a shape's topmost block above its root cell (dz of the top). */
export function treeTop(species, h) {
  switch (species) {
    case SPECIES.BROADLEAF: return 4 + (h & 1) + ((h >>> 1) & 1) + 1;
    case SPECIES.PINE: return 6 + ((h >>> 2) & 3) % 3 + 1;
    case SPECIES.PALM: return 5 + ((h >>> 4) & 1) + 1;
    default: return 1;
  }
}

/**
 * Every block of one tree, as `emit(dx, dy, dz, id)`. Logs come first, but
 * `plantOver` makes the order irrelevant to the result.
 */
export function treeShape(species, h, emit) {
  if (species === SPECIES.BROADLEAF) {
    // A round crown: two wide layers with ragged corners, a 3 × 3 and a cap.
    const t = 4 + (h & 1) + ((h >>> 1) & 1);
    for (let z = 0; z < t; z++) emit(0, 0, z, LOG);
    let bit = 8;
    for (const z of [t - 2, t - 1]) {
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if ((dx === 0 && dy === 0)) continue;
        const corner = Math.abs(dx) === 2 && Math.abs(dy) === 2;
        if (corner && ((h >>> (bit++ & 31)) & 1) === 0) continue;
        emit(dx, dy, z, LEAVES);
      }
    }
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) emit(dx, dy, t, LEAVES);
    emit(0, 0, t + 1, LEAVES);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if ((h >>> (bit++ & 31)) & 1) emit(dx, dy, t + 1, LEAVES);
    return;
  }
  if (species === SPECIES.PINE) {
    // A narrow cone of alternating wide and narrow tiers up a tall trunk.
    const t = 6 + ((h >>> 2) & 3) % 3;
    for (let z = 0; z < t; z++) emit(0, 0, z, LOG);
    for (let z = 2; z <= t; z++) {
      const d = t - z;
      const r = d === 0 ? 0 : d <= 2 ? 1 : (d & 1) === 1 ? 2 : 1;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (dx === 0 && dy === 0 && z < t) continue;
        if (r === 2 && Math.abs(dx) + Math.abs(dy) > 3) continue;
        if (r === 0 && Math.abs(dx) + Math.abs(dy) > 1) continue;
        emit(dx, dy, z, LEAVES);
      }
    }
    emit(0, 0, t + 1, LEAVES);
    return;
  }
  if (species === SPECIES.PALM) {
    // A bare trunk and a star of fronds that droop at their tips.
    const t = 5 + ((h >>> 4) & 1);
    for (let z = 0; z < t; z++) emit(0, 0, z, LOG);
    emit(0, 0, t, LEAVES);
    for (const [ux, uy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      emit(ux, uy, t, LEAVES); emit(2 * ux, 2 * uy, t, LEAVES); emit(3 * ux, 3 * uy, t - 1, LEAVES);
    }
    for (const [ux, uy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      emit(ux, uy, t, LEAVES); emit(2 * ux, 2 * uy, t - 1, LEAVES);
    }
    emit(0, 0, t + 1, LEAVES);
    return;
  }
  // Shrub: a knot of leaves round a stub of a log.
  emit(0, 0, 0, LOG);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) emit(dx, dy, 0, LEAVES);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (Math.abs(dx) + Math.abs(dy) === 2 && (h >>> (6 + ((dx + 1) + (dy + 1) * 3))) & 1) continue;
    emit(dx, dy, 1, LEAVES);
  }
}

// ─── Saplings in a live world ───────────────────────────────

/** Ground a sapling may be planted on and grow from: grass or dirt. */
export const SAPLING_SOIL = new Set([10, 11]);

/**
 * Which tree a sapling becomes. There is no generator to ask in a live world
 * (and a v1 world has no species at all), so it goes by what is at hand: high
 * ground grows pines, everything else broadleaf.
 */
export const saplingSpecies = (z) => (z >= 38 ? SPECIES.PINE : SPECIES.BROADLEAF);

/**
 * Grow the sapling at (x, y, z) into a tree, if it has room: its trunk must
 * rise through air (or leaves), and nothing may stand above the top. Leaves
 * only fill air, so a crown squeezed against a wall just grows lopsided.
 * Writes through `world.set`, so the change is an edit the next save keeps;
 * the new blocks are the world's, not the player's, so no placed bit is set
 * and the sapling's own is cleared.
 * @returns {boolean} true when it grew
 */
export function growSapling(world, x, y, z, hash) {
  if (world.get(x, y, z) !== SAPLING || !SAPLING_SOIL.has(world.get(x, y, z - 1))) return false;
  const species = saplingSpecies(z), top = treeTop(species, hash);
  if (z + top >= 64) return false;
  let room = true;
  treeShape(species, hash, (dx, dy, dz, id) => {
    if (id !== LOG || !room) return;
    const cur = world.get(x + dx, y + dy, z + dz);
    if (!(dz === 0 ? cur === SAPLING : cur === AIR || cur === LEAVES)) room = false;
  });
  if (!room) return false;
  world.clearPlaced(x, y, z);
  world.set(x, y, z, AIR); // the trunk's first log goes where the sapling was
  treeShape(species, hash, (dx, dy, dz, id) => {
    const cx = x + dx, cy = y + dy, cz = z + dz;
    if (!world.inBounds(cx, cy, cz)) return;
    const cur = world.get(cx, cy, cz), next = plantOver(cur, id);
    if (next !== cur) world.set(cx, cy, cz, next);
  });
  return true;
}

/** Chance that a sapling picked by a random tick grows on that tick. */
export const GROW_CHANCE = 0.35;

/**
 * One random tick over the columns within `radius` of the player's column:
 * `picks` random cells per column, and a sapling among them grows with
 * GROW_CHANCE. A sapling therefore takes a random, memoryless time to grow;
 * with the Forge's settings (a tick a second, 160 picks) that averages about
 * five minutes. `rand` is injected so tests can drive it.
 * @returns {number} how many saplings grew
 */
export function randomTick(world, px, py, rand, { radius = 3, picks = 160 } = {}) {
  const pcx = Math.floor(px) >> 4, pcy = Math.floor(py) >> 4;
  let grew = 0;
  for (let cy = pcy - radius; cy <= pcy + radius; cy++) for (let cx = pcx - radius; cx <= pcx + radius; cx++) {
    const col = world.column(cx, cy);
    if (!col) continue;
    const b = col.blocks;
    for (let k = 0; k < picks; k++) {
      const i = Math.floor(rand() * b.length);
      if (b[i] !== SAPLING) continue;
      if (rand() >= GROW_CHANCE) continue;
      const x = (cx << 4) | (i & 15), y = (cy << 4) | ((i >> 4) & 15), z = i >> 8;
      if (growSapling(world, x, y, z, (rand() * 4294967296) >>> 0)) grew++;
    }
  }
  return grew;
}

/** May a sapling be planted in this cell: empty air (not water), with grass or dirt under it. */
export function saplingFits(world, x, y, z) {
  return world.get(x, y, z) === AIR && SAPLING_SOIL.has(world.get(x, y, z - 1));
}
