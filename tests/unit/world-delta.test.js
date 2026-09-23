import { describe, it, expect } from "vitest";
import { World, colKey } from "../../src/world/world.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { generateColumn } from "../../src/world/column-gen.js";
import { NO_EDIT, VOID_GEN, genOf, foldEdits, restoreColumns } from "../../src/world/world-delta.js";
import { rleDecode } from "../../src/world/rle.js";
import { AIR } from "../../src/world/blocks.js";

/** Every resident cell, in column order. */
const cells = (w) => Buffer.concat([...w.columns.values()].map((c) => Buffer.from(c.blocks)));
/** Every resident column's placed bits, all-zero where it has none. */
const bits = (w) => Buffer.concat([...w.columns.values()].map((c) => Buffer.from(c.placed || new Uint8Array(2048))));

/** A world rebuilt from nothing but what a save keeps: meta and edits. */
function restored(w) {
  const back = new World(structuredClone(w.meta));
  for (const [k, d] of w.edits) back.edits.set(k, d);
  restoreColumns(back);
  return back;
}

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0) / 4294967296);
}

describe("column deltas", () => {
  it("an unedited world folds to nothing", () => {
    const w = generateWorld({ terrain: true, seed: 5 });
    expect(foldEdits(w)).toBe(0);
    expect(w.edits.size).toBe(0);
  });

  it("stores one edit as an overlay that is 0xFF everywhere else", () => {
    const w = generateWorld({ terrain: true, seed: 5 });
    const top = w.topSolid(20, 21);
    w.set(20, 21, top, AIR); // digging is an edit too
    expect(foldEdits(w)).toBe(1);
    const d = w.edits.get(colKey(1, 1));
    expect(d).toMatchObject({ cx: 1, cy: 1, placed: null });
    const ov = rleDecode(d.overlay, 16384);
    const i = (top << 8) | ((21 & 15) << 4) | (20 & 15);
    expect(ov[i]).toBe(AIR);
    expect(ov.filter((v) => v !== NO_EDIT)).toHaveLength(1);
    expect(d.overlay).toHaveLength(6); // three runs
  });

  it("drops the delta when the column is put back, and leaves a tombstone", () => {
    const w = generateWorld({ terrain: true, seed: 5 });
    const top = w.topSolid(3, 3), was = w.get(3, 3, top);
    w.set(3, 3, top, AIR);
    foldEdits(w);
    const rev = w.editRev;
    w.set(3, 3, top, was);
    expect(foldEdits(w)).toBe(1);
    expect(w.edits.size).toBe(0);
    expect(w.dropped.get(colKey(0, 0))).toBe(rev + 1);
  });

  it("stamps each changed delta once per fold and leaves the rest alone", () => {
    const w = generateWorld({ terrain: false });
    w.set(1, 1, 40, 5); w.set(40, 1, 40, 5);
    foldEdits(w);
    const a = w.edits.get(colKey(0, 0)).rev, b = w.edits.get(colKey(2, 0)).rev;
    expect(new Set([a, b])).toEqual(new Set([1, 2]));
    w.set(2, 1, 40, 6);
    foldEdits(w);
    expect(w.edits.get(colKey(0, 0)).rev).toBe(3);
    expect(w.edits.get(colKey(2, 0)).rev).toBe(b);
    expect(foldEdits(w)).toBe(0);
  });

  it("round-trips random edits and placed bits for seeded and void worlds", () => {
    const worlds = [
      generateWorld({ terrain: true, seed: 11 }),
      generateWorld({ terrain: true, seed: 0xdeadbeef }),
      generateWorld({ terrain: false, seed: 3 }),
      new World({ name: "void" }),
    ];
    for (const [n, w] of worlds.entries()) {
      const r = rng(n + 1);
      for (let i = 0; i < 400; i++) {
        const x = Math.floor(r() * 128), y = Math.floor(r() * 128), z = Math.floor(r() * 64);
        const roll = r();
        if (roll < 0.2) {
          // The generated value: an edit that is no edit at all.
          const col = generateColumn(genOf(w.meta), x >> 4, y >> 4);
          w.set(x, y, z, col[(z << 8) | ((y & 15) << 4) | (x & 15)]);
        } else if (roll < 0.35) w.markPlaced(x, y, z);
        else if (roll < 0.4) w.clearPlaced(x, y, z);
        else w.set(x, y, z, Math.floor(r() * 19));
        if (i % 97 === 0) foldEdits(w); // folds in between must not change the outcome
      }
      foldEdits(w);
      const back = restored(w);
      expect(cells(back).equals(cells(w)), `world ${n} cells`).toBe(true);
      expect(bits(back).equals(bits(w)), `world ${n} placed`).toBe(true);
    }
  });

  it("treats a world with no stored generator as void", () => {
    expect(genOf({})).toBe(VOID_GEN);
    const w = new World();
    w.set(0, 0, 0, 15);
    foldEdits(w);
    expect(restored(w).get(0, 0, 0)).toBe(15);
    expect(restored(w).get(0, 0, 1)).toBe(AIR);
  });
});

describe("placed bits in the world", () => {
  it("marks, clears and keeps cells apart across a column border", () => {
    const w = new World();
    w.markPlaced(15, 16, 3); w.markPlaced(16, 15, 3);
    expect(w.wasPlaced(15, 16, 3)).toBe(true);
    expect(w.wasPlaced(16, 15, 3)).toBe(true);
    expect(w.wasPlaced(16, 16, 3)).toBe(false);
    expect(w.wasPlaced(15, 16, 4)).toBe(false);
    w.clearPlaced(15, 16, 3);
    expect(w.wasPlaced(15, 16, 3)).toBe(false);
    expect(w.wasPlaced(16, 15, 3)).toBe(true);
  });

  it("ignores cells outside the world", () => {
    const w = new World();
    w.markPlaced(-1, 0, 3); w.markPlaced(0, 0, 64); w.markPlaced(128, 5, 5);
    expect(w.wasPlaced(-1, 0, 3)).toBe(false);
    expect(w.wasPlaced(0, 0, 64)).toBe(false);
    expect([...w.columns.values()].some((c) => c.placed)).toBe(false);
  });

  it("allocates bits only where something was placed, and marks the column modified", () => {
    const w = generateWorld({ terrain: false });
    w.markPlaced(40, 40, 20);
    const cols = [...w.columns.values()].filter((c) => c.placed);
    expect(cols).toHaveLength(1);
    expect(cols[0].modified).toBe(true);
  });

  it("keeps a delta for a column whose only change is a placed bit", () => {
    // Dig a stone and put a stone back: the blocks match the generator, but
    // the cell is now the player's and must still pay no xp.
    const w = generateWorld({ terrain: false });
    w.set(5, 5, 20, AIR); w.set(5, 5, 20, 13); w.markPlaced(5, 5, 20);
    foldEdits(w);
    const d = w.edits.get(colKey(0, 0));
    expect(d.placed).not.toBe(null);
    expect(rleDecode(d.overlay, 16384).every((v) => v === NO_EDIT)).toBe(true);
    expect(restored(w).wasPlaced(5, 5, 20)).toBe(true);
  });

  it("clearAllPlaced drops every bit and the deltas that only carried them", () => {
    const w = generateWorld({ terrain: false });
    w.markPlaced(5, 5, 20); w.set(40, 40, 40, 3); w.markPlaced(40, 40, 40);
    foldEdits(w);
    w.clearAllPlaced();
    expect(w.wasPlaced(5, 5, 20)).toBe(false);
    expect(w.wasPlaced(40, 40, 40)).toBe(false);
    foldEdits(w);
    expect(w.edits.has(colKey(0, 0))).toBe(false);
    expect(w.edits.get(colKey(2, 2)).placed).toBe(null);
  });
});
