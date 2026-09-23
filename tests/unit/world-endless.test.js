import { describe, it, expect } from "vitest";
import { World, colKey } from "../../src/world/world.js";
import { AIR, WATER } from "../../src/world/blocks.js";
import { generateColumn, surfaceHeight, GEN_VERSION } from "../../src/world/column-gen.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { encodeWorld, decodeWorld } from "../../src/world/world-codec.js";

const GEN = Object.freeze({ kind: "terrain", seed: 1234, v: GEN_VERSION });
const endless = (meta = {}) => new World({ gen: GEN, endless: true, ...meta });
const B = World.BORDER;

describe("an endless world", () => {
  it("has the border for bounds and starts with nothing resident", () => {
    const w = endless();
    expect(w.endless).toBe(true);
    expect(w.bounds).toEqual({ x0: -B, y0: -B, x1: B, y1: B });
    expect(w.columns.size).toBe(0);
    expect(w.dirty.size).toBe(0);
    expect(w.meta.endless).toBe(true);
    expect(w.meta.bounds).toBeUndefined();
  });

  it("stands its default spawn on the generated surface at (0.5, 0.5)", () => {
    const s = endless().defaultSpawn();
    expect(s).toEqual({ x: 0.5, y: 0.5, z: surfaceHeight(GEN, 0, 0) + 1, yaw: 0 });
    expect(endless({ gen: { kind: "flat", v: GEN_VERSION } }).defaultSpawn().z).toBe(32);
  });

  it("loads a column as generated, with its saved delta over it, and not as an edit", () => {
    const w = endless();
    const col = w.ensureColumn(-3, 5);
    expect(Array.from(col.blocks)).toEqual(Array.from(generateColumn(GEN, -3, 5)));
    expect(col.modified).toBe(false);
    for (let cz = 0; cz < 4; cz++) expect(w.dirty.has(w.chunkIndex(-3, 5, cz))).toBe(true);
    expect(w.isLoaded(-48, 80)).toBe(true);
    expect(w.isLoaded(-49, 80)).toBe(false);
  });

  it("answers air in an unloaded column, and set loads it first", () => {
    const w = endless();
    const x = 900_001, y = -700_003;
    expect(w.get(x, y, 10)).toBe(AIR);
    expect(w.topSolid(x, y)).toBe(-1);
    expect(w.set(x, y, 55, 7)).toBe(true);
    expect(w.isLoaded(x, y)).toBe(true);
    expect(w.get(x, y, 55)).toBe(7);
    // The rest of the column is the generated terrain, not air.
    expect(w.topSolid(x, y)).toBe(55);
    expect(w.get(x, y, 1)).not.toBe(AIR);
  });

  it("folds a modified column into edits on unload, and gets it back on reload", () => {
    const w = endless();
    w.set(20, 20, 50, 9);
    w.markPlaced(20, 20, 50);
    const key = colKey(1, 1);
    expect(w.unloadColumn(1, 1)).toBe(true);
    expect(w.columns.has(key)).toBe(false);
    expect(w.edits.has(key)).toBe(true);
    // Neither cache may still answer for the column that went away.
    expect(w.get(20, 20, 50)).toBe(AIR);
    expect(w.isLoaded(20, 20)).toBe(false);
    w.ensureColumn(1, 1);
    expect(w.get(20, 20, 50)).toBe(9);
    expect(w.wasPlaced(20, 20, 50)).toBe(true);
    expect(w.columns.get(key).modified).toBe(false);
  });

  it("queues an unloaded column's chunks for the renderer and forgets their dirt", () => {
    const w = endless();
    w.ensureColumn(0, 0);
    w.ensureColumn(2, 0);
    w.takeEvicted();
    w.unloadColumn(0, 0);
    const keys = [0, 1, 2, 3].map((cz) => w.chunkIndex(0, 0, cz));
    expect(w.takeEvicted().sort()).toEqual(keys.sort());
    expect(w.takeEvicted()).toEqual([]);
    for (const k of keys) expect(w.dirty.has(k)).toBe(false);
    expect(w.dirty.has(w.chunkIndex(2, 0, 0))).toBe(true);
    expect(w.unloadColumn(0, 0)).toBe(false);
  });

  it("leaves edits alone when an unmodified column unloads", () => {
    const w = endless();
    w.ensureColumn(4, 4);
    w.unloadColumn(4, 4);
    expect(w.edits.size).toBe(0);
    expect(w.dropped.size).toBe(0);
  });

  it("drops the delta of a column put back as generated before it unloads", () => {
    const w = endless();
    const before = (w.ensureColumn(0, 0), w.get(3, 3, 5));
    w.set(3, 3, 5, 7);
    w.unloadColumn(0, 0);
    expect(w.edits.size).toBe(1);
    w.set(3, 3, 5, before);
    w.unloadColumn(0, 0);
    expect(w.edits.size).toBe(0);
    expect(w.dropped.has(colKey(0, 0))).toBe(true);
  });

  it("knows which cells sit in an unloaded column", () => {
    const w = endless();
    w.ensureColumn(0, 0);
    expect(w.unloadedAt(5, 5)).toBe(false);
    expect(w.unloadedAt(16, 5)).toBe(true);
    expect(w.unloadedAt(-1, 5)).toBe(true);
    expect(w.unloadedAt(B, 0)).toBe(false); // past the border: nothing to load
  });

  it("is ready to mesh a column only when all eight neighbours are resident", () => {
    const w = endless();
    w.loadAround(8, 8, 1);
    expect(w.columns.size).toBe(9);
    expect(w.columnReady(0, 0)).toBe(true);
    expect(w.columnReady(1, 0)).toBe(false);
    w.unloadColumn(-1, -1);
    expect(w.columnReady(0, 0)).toBe(false);
    // At the border the missing ring is outside the world, not late.
    const cx = (B >> 4) - 1;
    w.loadAround(B - 8, 8, 1);
    expect(w.columnReady(cx, 0)).toBe(true);
  });

  it("saves and reopens endless, with edits in unloaded columns kept", () => {
    const w = endless({ name: "Far" });
    w.set(-5000, 7000, 50, 3);
    w.unloadColumn(-5000 >> 4, 7000 >> 4);
    w.set(10, 10, 50, 4);
    const doc = JSON.parse(JSON.stringify(encodeWorld(w)));
    expect(doc.meta.endless).toBe(true);
    expect(doc.columns).toHaveLength(2);
    const back = decodeWorld(doc);
    expect(back.endless).toBe(true);
    expect(back.columns.size).toBe(0);
    expect(back.get(10, 10, 50)).toBe(AIR); // not loaded yet
    back.loadAround(10, 10, 0);
    back.loadAround(-5000, 7000, 0);
    expect(back.get(10, 10, 50)).toBe(4);
    expect(back.get(-5000, 7000, 50)).toBe(3);
  });

  it("counts blocks only in its edited columns", () => {
    const w = endless();
    w.loadAround(0, 0, 1);
    expect(w.countBlocks()).toBe(0);
    w.set(1, 1, 60, 2);
    const col = w.columns.get(colKey(0, 0)).blocks;
    expect(w.countBlocks()).toBe(col.reduce((n, v) => n + (v !== AIR ? 1 : 0), 0));
  });
});

describe("generateWorld", () => {
  it("makes an endless world with nothing generated up front", () => {
    const w = generateWorld({ terrain: true, seed: 77, endless: true, name: "E" });
    expect(w.endless).toBe(true);
    expect(w.columns.size).toBe(0);
    expect(w.meta.gen).toEqual({ kind: "terrain", seed: 77, v: GEN_VERSION });
    // Spawn is on level ground near the origin, known without a column.
    expect(Math.abs(w.meta.spawn.x) < 30 && Math.abs(w.meta.spawn.y) < 30).toBe(true);
    expect(w.meta.spawn.z).toBe(surfaceHeight(w.meta.gen, Math.floor(w.meta.spawn.x), Math.floor(w.meta.spawn.y)) + 1);
  });

  it("still makes the bounded box by default", () => {
    const w = generateWorld({ terrain: true, seed: 77 });
    expect(w.endless).toBe(false);
    expect(w.columns.size).toBe(64);
    expect("endless" in w.meta).toBe(false);
  });
});

describe("a bounded world", () => {
  it("has no unloaded cells and every column is ready", () => {
    const w = new World();
    expect(w.endless).toBe(false);
    expect(w.unloadedAt(5, 5)).toBe(false);
    expect(w.unloadedAt(-5, 5)).toBe(false);
    expect(w.columnReady(0, 0)).toBe(true);
    expect(w.columnReady(7, 7)).toBe(true);
    w.loadAround(64, 64, 1); // a no-op: everything is resident already
    expect(w.columns.size).toBe(64);
  });
});

describe("topSolid", () => {
  it("looks through water to the ground under it", () => {
    const w = new World();
    w.set(3, 3, 10, 1);
    w.set(3, 3, 11, WATER);
    w.set(3, 3, 12, WATER);
    expect(w.topSolid(3, 3)).toBe(10);
  });
});
