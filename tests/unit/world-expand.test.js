import { describe, it, expect } from "vitest";
import { edgeProfile, expandWorld, restoreBounds, canExpand, canRestoreBounds } from "../../src/world/world-expand.js";
import { encodeWorld, decodeWorld, encodeV4, packWorld, unpackWorld } from "../../src/world/world-codec.js";
import { WorldStore, MemoryBackend } from "../../src/world/world-store.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { surfaceHeight } from "../../src/world/column-gen.js";
import { rleDecode } from "../../src/world/rle.js";
import { BEDROCK } from "../../src/world/blocks.js";
import { oldVoidWorld, oldTerrain } from "./fixtures/old-world.js";

const GRASS = 11, DIRT = 10, SAND = 12, ROCK = 13, ORE = 14, STONE = 1, METAL = 3;
const GROUND = new Set([BEDROCK, GRASS, DIRT, SAND, ROCK, ORE]);
const groundAt = (w, x, y) => { let z = -1; while (z < 63 && GROUND.has(w.get(x, y, z + 1))) z++; return z; };

/** Every cell of the 128 box, as one byte string. */
function box(w) {
  w.loadAround(64, 64, 5);
  const out = new Uint8Array(128 * 128 * 64);
  w.readBox(0, 0, 0, 128, 128, 64, out);
  return Buffer.from(out);
}

/** Ground heights along both sides of the old edge, two cells deep each way. */
function seam(w) {
  w.loadAround(64, 64, 6);
  const out = [];
  for (let k = 0; k < 128; k += 3) {
    for (let d = -2; d <= 1; d++) out.push(groundAt(w, k, -1 - d), groundAt(w, k, 128 + d), groundAt(w, -1 - d, k), groundAt(w, 128 + d, k));
  }
  return out;
}

/** An old v4 terrain world with a build: a tower on the east edge and a mark in the middle. */
function oldWorld(seed = 42) {
  const w = oldVoidWorld(oldTerrain(seed), { seed });
  const t = groundAt(w, 127, 64);
  for (let z = t + 1; z <= t + 12; z++) w.set(127, 64, z, METAL);
  w.set(64, 64, 50, 7);
  w.meta.spawn = { x: 20.5, y: 30.5, z: 40, yaw: 1 };
  w.meta.enemySpawns = [{ x: 10.5, y: 10.5, z: 40, type: "drone" }];
  return w;
}

describe("edgeProfile", () => {
  it("reads the natural ground under a build, south, north, west, east", () => {
    const w = oldVoidWorld((x, y) => (y === 0 ? 30 : y === 127 ? 34 : x === 0 ? 28 : x === 127 ? 36 : 31));
    for (let z = 31; z < 45; z++) w.set(60, 0, z, STONE); // a wall on the south edge
    const p = edgeProfile(w, w.bounds);
    const edge = rleDecode(p.edge, 512), caps = rleDecode(p.caps, 512);
    expect(edge[60]).toBe(30);        // south row, under the wall
    expect(edge[128 + 5]).toBe(34);   // north row
    expect(edge[256 + 64]).toBe(28);  // west column
    expect(edge[384 + 64]).toBe(36);  // east column
    expect(caps[60]).toBe(GRASS);
    expect(caps[256 + 64]).toBe(SAND); // low ground was sand
  });

  it("drops a pit one or two cells wide, but follows a real slope", () => {
    const w = oldVoidWorld((x, y) => (y === 0 && (x === 40 || x === 41) ? 12 : y === 0 && x >= 80 ? 31 + Math.min(6, (x - 80) >> 2) : 31));
    const edge = rleDecode(edgeProfile(w, w.bounds).edge, 512);
    expect(edge[40]).toBe(31);
    expect(edge[41]).toBe(31);
    expect([edge[80], edge[92], edge[120]]).toEqual([31, 34, 37]);
  });

  it("gives an edge with no ground at all a default height", () => {
    const w = oldVoidWorld(() => 31);
    for (let z = 0; z < 64; z++) for (let x = 0; x < 128; x++) w.set(x, 0, z, 0);
    const edge = rleDecode(edgeProfile(w, w.bounds).edge, 512);
    expect(edge[50]).toBe(31);
  });
});

describe("expandWorld: a void world from v4", () => {
  it("becomes endless around its old box, which stays cell for cell", () => {
    const old = oldWorld(), before = box(old);
    const w = expandWorld(old);
    expect(w).not.toBe(old);
    expect(w.endless).toBe(true);
    expect(w.meta.endless).toBe(true);
    expect(w.meta.bounds).toBeUndefined();
    expect(w.meta.expandedFrom).toEqual({ x0: 0, y0: 0, x1: 128, y1: 128 });
    expect(w.meta.gen).toMatchObject({ kind: "blend", seed: 42, v: 2, area: { x0: 0, y0: 0, x1: 128, y1: 128 } });
    expect(w.meta.spawn).toEqual(old.meta.spawn);
    expect(w.meta.enemySpawns).toEqual(old.meta.enemySpawns);
    expect(box(w).equals(before)).toBe(true);
    // And there is land past the edge now, where the old world had none.
    w.loadAround(-20, 64, 1);
    expect(groundAt(w, -20, 64)).toBeGreaterThan(10);
    expect(old.get(-20, 64, 20)).toBe(0);
    // The tower on the east edge is a build, not ground: the land beside it
    // starts at the ground it stands on, not at its top.
    w.loadAround(140, 64, 1);
    expect(Math.abs(groundAt(w, 128, 64) - groundAt(old, 127, 64))).toBeLessThanOrEqual(1);
  });

  it("works on a world that came through the v4 codec, as a real old save does", () => {
    const src = oldWorld(7);
    const doc = encodeV4(src);
    delete doc.meta.gen; // saved before generators were stored
    const opened = decodeWorld(doc);
    expect(opened.meta.gen.kind).toBe("void");
    const w = expandWorld(opened);
    expect(w.meta.gen.seed).toBe(opened.meta.gen.seed);
    expect(box(w).equals(box(src))).toBe(true);
  });

  it("is idempotent, and keeps its generator through a restore and a second expansion", () => {
    const w = expandWorld(oldWorld());
    expect(expandWorld(w)).toBe(w);
    expect(canExpand(w)).toBe(false);
    const again = expandWorld(restoreBounds(w));
    expect(again.meta.gen).toEqual(w.meta.gen);
    expect(seam(again)).toEqual(seam(w));
  });
});

describe("expandWorld: a seeded bounded world (phases 2–3)", () => {
  it("drops its bounds and keeps generator v1, so the land runs on with no seam", () => {
    const old = generateWorld({ terrain: true, seed: 99, v: 1 });
    old.set(127, 20, 55, METAL);
    const w = expandWorld(old);
    expect(w.endless).toBe(true);
    expect(w.meta.gen).toEqual({ kind: "terrain", seed: 99, v: 1 });
    expect(w.meta.expandedFrom).toEqual({ x0: 0, y0: 0, x1: 128, y1: 128 });
    w.loadAround(64, 64, 6);
    expect(w.get(127, 20, 55)).toBe(METAL);
    // Every cell across the old edge is generator v1's own surface.
    for (let k = -20; k < 148; k++) {
      for (const [x, y] of [[k, -1], [k, 0], [k, 127], [k, 128], [-1, k], [0, k], [127, k], [128, k]]) {
        expect(groundAt(w, x, y), `${x},${y}`).toBe(surfaceHeight(w.meta.gen, x, y));
      }
    }
  });

  it("works the same for a bounded world made on generator v2", () => {
    const w = expandWorld(generateWorld({ terrain: true, seed: 5 }));
    expect(w.meta.gen).toEqual({ kind: "terrain", seed: 5, v: 2 });
    expect(w.endless).toBe(true);
  });
});

describe("saving a grown world", () => {
  it("round-trips through the v5 document with the old box and the seam unchanged", async () => {
    const w = expandWorld(oldWorld());
    w.loadAround(-40, 64, 1);
    w.set(-40, 64, 50, METAL); // a build out in the new land
    const again = decodeWorld(JSON.parse(JSON.stringify(encodeWorld(w))));
    expect(again.endless).toBe(true);
    expect(again.meta.gen).toEqual(w.meta.gen);
    expect(box(again).equals(box(w))).toBe(true);
    expect(seam(again)).toEqual(seam(w));
    again.loadAround(-40, 64, 0);
    expect(again.get(-40, 64, 50)).toBe(METAL);
    const packed = await unpackWorld(await packWorld(w));
    expect(seam(packed)).toEqual(seam(w));
  });

  it("saves as v5 in the store, and reloads endless with the seam where it was", async () => {
    const s = new WorldStore(new MemoryBackend());
    const old = oldWorld();
    await s.save(0, old);
    const w = expandWorld(await s.load(0));
    const at = seam(w);
    w.loadAround(150, 64, 0);
    w.set(150, 64, 50, METAL);
    await s.save(0, w);
    const row = s.backend.rows.get(0);
    expect(row.meta.endless).toBe(true);
    expect(row.meta.gen.kind).toBe("blend");
    const back = await s.load(0);
    expect(back.endless).toBe(true);
    expect(seam(back)).toEqual(at);
    expect(box(back).equals(box(old))).toBe(true);
    back.loadAround(150, 64, 0);
    expect(back.get(150, 64, 50)).toBe(METAL);
    // The grown world's meta stays small: the old edge profile is a couple of KB at most.
    expect(JSON.stringify(row.meta).length).toBeLessThan(4000);
  });
});

describe("restoreBounds", () => {
  it("puts the world back inside its old edge, and keeps what was built outside for later", async () => {
    const old = oldWorld();
    const w = expandWorld(old);
    expect(canRestoreBounds(w)).toBe(true);
    w.loadAround(-30, 40, 0);
    w.set(-30, 40, 50, METAL);
    w.set(64, 64, 51, STONE); // and an edit inside, made while endless
    w.meta.spawn = { x: -30.5, y: 40.5, z: 51, yaw: 0 }; // moved outside
    const b = restoreBounds(w);
    expect(b.endless).toBe(false);
    expect(b.bounds).toEqual({ x0: 0, y0: 0, x1: 128, y1: 128 });
    expect(b.meta.expandedFrom).toBeUndefined();
    expect(canRestoreBounds(b)).toBe(false);
    expect(b.get(64, 64, 51)).toBe(STONE);
    expect(b.get(-30, 40, 50)).toBe(0); // outside a bounded world: air
    expect(b.meta.spawn.x).toBeGreaterThanOrEqual(0); // spawn back inside
    old.set(64, 64, 51, STONE);
    expect(box(b).equals(box(old))).toBe(true);
    // Saved and reloaded bounded, then grown again: the outside build is back.
    const s = new WorldStore(new MemoryBackend());
    await s.save(3, b);
    const again = expandWorld(await s.load(3));
    again.loadAround(-30, 40, 0);
    expect(again.get(-30, 40, 50)).toBe(METAL);
  });

  it("leaves a world that was born endless alone", () => {
    const w = generateWorld({ terrain: true, seed: 3, endless: true });
    expect(canRestoreBounds(w)).toBe(false);
    expect(restoreBounds(w)).toBe(w);
  });
});
