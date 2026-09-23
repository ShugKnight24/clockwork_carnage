// src/world/world-delta.js
/**
 * A saved column is a delta against what its generator makes: an overlay of
 * 16,384 bytes where `NO_EDIT` (0xFF) means "as generated" and anything else is
 * the block stored there — air included, a dug block is an edit — run-length
 * encoded. It is almost all 0xFF, so a column with a handful of edits costs a
 * few dozen numbers. Survival placed bits ride alongside, run-length encoded,
 * only when any are set.
 *
 * This is only safe because a generator version never changes once worlds are
 * saved against it (column-gen.js): the overlay says "differs from what
 * version N makes", nothing more.
 */
import { GEN_V1, GEN_VERSIONS, generateColumn } from "./column-gen.js";
import { rleEncode, rleDecode } from "./rle.js";

export const NO_EDIT = 0xff;
const CELLS = 16 * 16 * 64;
export const PLACED_BYTES = CELLS >> 3;

/**
 * The generator of a world that never stored one — built before generators
 * were stored, or converted from a legacy map. It makes only air, so every
 * block in such a world is an edit and its deltas are its full content.
 * Void is the same in every version; it keeps the version it was made with.
 */
export const VOID_GEN = Object.freeze({ kind: "void", v: GEN_V1 });

export const genOf = (meta) => meta?.gen || VOID_GEN;

/** Throws unless `gen` is a generator this build can reproduce exactly. */
export function checkGen(gen) {
  const ok = gen && typeof gen === "object" && GEN_VERSIONS.includes(gen.v) &&
    (gen.kind === "terrain" || gen.kind === "flat" || gen.kind === "void") &&
    (gen.seed === undefined ? gen.kind !== "terrain" : Number.isInteger(gen.seed) && gen.seed >= 0 && gen.seed <= 0xffffffff);
  if (!ok) throw new Error(`unsupported generator ${JSON.stringify(gen)}`);
  return gen;
}

// One generation buffer and one overlay buffer, reused by every diff.
const base = new Uint8Array(CELLS);
const overlay = new Uint8Array(CELLS);

/**
 * `col` as a delta against `gen`, or null when it has nothing to keep: its
 * blocks are exactly what the generator makes and nothing in it was placed.
 * @returns {{cx:number, cy:number, overlay:number[], placed:number[]|null}|null}
 */
export function columnDelta(gen, col) {
  generateColumn(gen, col.cx, col.cy, base);
  const b = col.blocks;
  let edited = false;
  for (let i = 0; i < CELLS; i++) {
    const v = b[i];
    if (v === base[i]) overlay[i] = NO_EDIT;
    else { overlay[i] = v; edited = true; }
  }
  const placed = col.placed && col.placed.some((v) => v !== 0) ? rleEncode(col.placed) : null;
  if (!edited && !placed) return null;
  return { cx: col.cx, cy: col.cy, overlay: rleEncode(overlay), placed };
}

/** Lay a delta over a column that already holds its generated blocks. */
export function applyDelta(col, d) {
  const ov = rleDecode(d.overlay, CELLS), b = col.blocks;
  for (let i = 0; i < CELLS; i++) if (ov[i] !== NO_EDIT) b[i] = ov[i];
  col.placed = d.placed ? rleDecode(d.placed, PLACED_BYTES) : null;
}

/**
 * Turn one resident column into its saved delta in `world.edits`, or, when it
 * diffs back to exactly what the generator makes, drop its delta and leave a
 * tombstone in `world.dropped` so the store can delete its row. Both are
 * stamped with a fresh `editRev`, which is how a save finds what changed since
 * the last one it wrote. Unloading a column runs this before it lets go.
 * @returns {boolean} a delta was added, changed or dropped
 */
export function foldColumn(world, key, col, gen = genOf(world.meta)) {
  col.modified = false;
  const d = columnDelta(gen, col);
  if (d) {
    d.rev = ++world.editRev;
    world.edits.set(key, d);
    world.dropped.delete(key);
    return true;
  }
  if (!world.edits.delete(key)) return false;
  world.dropped.set(key, ++world.editRev);
  return true;
}

/**
 * Fold every modified resident column (`foldColumn`).
 * @returns {number} deltas added, changed or dropped
 */
export function foldEdits(world) {
  const gen = genOf(world.meta);
  let n = 0;
  for (const [key, col] of world.columns) {
    if (col.modified && foldColumn(world, key, col, gen)) n++;
  }
  return n;
}

/**
 * Rebuild every resident column from the generator and its saved delta, e.g.
 * after `edits` was read from a document or the store.
 */
export function restoreColumns(world) {
  const gen = genOf(world.meta);
  for (const [key, col] of world.columns) {
    generateColumn(gen, col.cx, col.cy, col.blocks);
    col.placed = null;
    const d = world.edits.get(key);
    if (d) applyDelta(col, d);
    col.modified = false;
  }
  world.markAllDirty();
  world.version++;
}
