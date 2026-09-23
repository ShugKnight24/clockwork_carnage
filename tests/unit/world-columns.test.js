import { describe, it, expect } from "vitest";
import { World, colKey, chunkKeyCoords, DEFAULT_BOUNDS } from "../../src/world/world.js";
import { AIR, BEDROCK } from "../../src/world/blocks.js";
import { SeededRNG } from "../../src/utils/seeded-rng.js";
import { World as FlatWorld } from "./fixtures/flat-world.js";

const sorted = (a) => [...a].sort((x, y) => x - y);

describe("column keys", () => {
  it("round-trip chunk coordinates, negative ones included", () => {
    const w = new World();
    for (const [cx, cy, cz] of [[0, 0, 0], [7, 7, 3], [-1, 0, 2], [0, -1, 1], [-65536, 65535, 3], [65535, -65536, 0], [-3, -900, 1]]) {
      const key = w.chunkIndex(cx, cy, cz);
      expect(Number.isSafeInteger(key)).toBe(true);
      expect(w.chunkCoords(key)).toEqual([cx, cy, cz]);
      const out = [0, 0, 0];
      expect(chunkKeyCoords(key, out)).toBe(out);
      expect(out).toEqual([cx, cy, cz]);
    }
    expect(w.columnKey(-1, 2)).toBe(colKey(-1, 2));
    expect(colKey(-1, 0)).not.toBe(colKey(0, -1));
  });
});

describe("a default world", () => {
  it("is the 128 box without writing bounds into its meta", () => {
    const w = new World();
    expect(w.bounds).toEqual({ x0: 0, y0: 0, x1: 128, y1: 128 });
    expect(DEFAULT_BOUNDS).toEqual(w.bounds);
    expect("bounds" in w.meta).toBe(false);
    expect(w.meta.spawn).toEqual({ x: 64.5, y: 64.5, z: 32, yaw: 0 });
    expect(w.columns.size).toBe(64);
    expect(w.dirty.size).toBe(256);
  });

  it("answers bedrock below, air above and air outside every edge", () => {
    const w = new World();
    for (const [x, y] of [[0, 0], [127, 127], [0, 127], [127, 0]]) w.set(x, y, 5, 1);
    expect(w.get(0, 0, 5)).toBe(1); expect(w.get(127, 127, 5)).toBe(1);
    expect(w.get(0, 0, -1)).toBe(BEDROCK);
    expect(w.get(-7, 300, -1)).toBe(BEDROCK);
    expect(w.get(0, 0, 64)).toBe(AIR);
    for (const [x, y] of [[-1, 0], [128, 0], [0, -1], [0, 128], [-1, -1], [128, 128], [-17, 5], [5, 1000]]) {
      expect(w.get(x, y, 5), `${x},${y}`).toBe(AIR);
      expect(w.inBounds(x, y, 5)).toBe(false);
      expect(w.set(x, y, 5, 1)).toBe(false);
      expect(w.isLoaded(x, y)).toBe(false);
      expect(w.topSolid(x, y)).toBe(-1);
    }
    expect(w.isLoaded(0, 0)).toBe(true); expect(w.isLoaded(127, 127)).toBe(true);
  });

  it("reads and writes across column borders", () => {
    const w = new World();
    w.set(15, 20, 33, 2); w.set(16, 20, 33, 3); w.set(20, 31, 34, 4); w.set(20, 32, 34, 5);
    expect([w.get(15, 20, 33), w.get(16, 20, 33), w.get(20, 31, 34), w.get(20, 32, 34)]).toEqual([2, 3, 4, 5]);
    // Alternating reads between two columns must not return the other one's cell.
    for (let i = 0; i < 4; i++) { expect(w.get(15, 20, 33)).toBe(2); expect(w.get(16, 20, 33)).toBe(3); }
    expect(w.columns.get(colKey(0, 1)).modified).toBe(true);
    expect(w.columns.get(colKey(5, 5)).modified).toBe(false);
  });

  it("dirties neighbour chunks across column borders but never outside the resident columns", () => {
    const w = new World();
    w.takeDirty();
    w.set(16, 5, 33, 1);
    expect(sorted(w.takeDirty())).toEqual(sorted([w.chunkIndex(0, 0, 2), w.chunkIndex(1, 0, 2)]));
    w.set(40, 47, 20, 1); // ly = 15: touches cy = 3
    expect(sorted(w.takeDirty())).toEqual(sorted([w.chunkIndex(2, 2, 1), w.chunkIndex(2, 3, 1)]));
    w.set(0, 0, 33, 1); // the west and north neighbours are outside the world
    expect(w.takeDirty()).toEqual([w.chunkIndex(0, 0, 2)]);
    w.set(127, 127, 16, 1); // and so are the east and south ones; z = 16 touches cz = 0
    expect(sorted(w.takeDirty())).toEqual(sorted([w.chunkIndex(7, 7, 1), w.chunkIndex(7, 7, 0)]));
    expect(w.takeDirty()).toEqual([]);
  });

  it("counts every non-air block", () => {
    const w = new World();
    expect(w.countBlocks()).toBe(0);
    w.set(1, 1, 1, 1); w.set(100, 90, 60, 8); w.set(1, 1, 1, 0);
    expect(w.countBlocks()).toBe(1);
  });
});

describe("a world bounded at negative coordinates", () => {
  const box = { x0: -32, y0: -16, x1: 0, y1: 16 };

  it("keeps only its own columns and writes inside its bounds", () => {
    const w = new World({ bounds: box });
    expect(w.bounds).toEqual(box);
    expect(w.meta.bounds).toEqual(box);
    expect(w.columns.size).toBe(4);
    expect(w.meta.spawn).toEqual({ x: -15.5, y: 0.5, z: 32, yaw: 0 });
    expect(w.set(-32, -16, 10, 3)).toBe(true);
    expect(w.set(-1, 15, 10, 4)).toBe(true);
    expect(w.get(-32, -16, 10)).toBe(3); expect(w.get(-1, 15, 10)).toBe(4);
    expect(w.set(0, 0, 10, 1)).toBe(false); expect(w.set(-33, 0, 10, 1)).toBe(false);
    expect(w.get(0, 0, 10)).toBe(AIR);
    expect(w.topSolid(-1, 15)).toBe(10);
  });

  it("marks the neighbour across a negative column border", () => {
    const w = new World({ bounds: box });
    w.takeDirty();
    w.set(-17, -1, 40, 1); // lx = 15 of cx = -2, ly = 15 of cy = -1
    expect(sorted(w.takeDirty())).toEqual(sorted([w.chunkIndex(-2, -1, 2), w.chunkIndex(-1, -1, 2), w.chunkIndex(-2, 0, 2)]));
    w.set(-16, 0, 40, 1); // lx = 0 of cx = -1, ly = 0 of cy = 0
    expect(sorted(w.takeDirty())).toEqual(sorted([w.chunkIndex(-1, 0, 2), w.chunkIndex(-2, 0, 2), w.chunkIndex(-1, -1, 2)]));
  });

  it("refuses bounds that are inverted, fractional or past the border", () => {
    for (const bad of [
      { x0: 10, y0: 0, x1: 0, y1: 16 },
      { x0: 0, y0: 0, x1: 16.5, y1: 16 },
      { x0: 0, y0: 0, x1: World.BORDER + 16, y1: 16 },
      { x0: 0, y0: 0, x1: 16 },
    ]) expect(() => new World({ bounds: bad }), JSON.stringify(bad)).toThrow();
  });
});

describe("readBox", () => {
  it("copies exactly what get answers, straddling bounds, floor and roof", () => {
    const w = new World();
    const rng = new SeededRNG(9);
    for (let i = 0; i < 3000; i++) w.set((rng.next() * 40) | 0, (rng.next() * 40) | 0, (rng.next() * 64) | 0, 1 + ((rng.next() * 17) | 0));
    for (const [x0, y0, z0] of [[-1, -1, -1], [14, 30, 46], [-9, 5, 60], [120, 120, 20]]) {
      const sx = 18, sy = 13, sz = 9;
      const out = new Uint8Array(sx * sy * sz);
      w.readBox(x0, y0, z0, sx, sy, sz, out);
      for (let z = 0; z < sz; z++) for (let y = 0; y < sy; y++) for (let x = 0; x < sx; x++) {
        const got = out[(z * sy + y) * sx + x], want = w.get(x0 + x, y0 + y, z0 + z);
        if (got !== want) expect(`${x0 + x},${y0 + y},${z0 + z} = ${got}`).toBe(`${x0 + x},${y0 + y},${z0 + z} = ${want}`);
      }
    }
  });
});

describe("against the flat world it replaced", () => {
  it("gives identical answers to a long random sequence of operations", () => {
    const cols = new World(), flat = new FlatWorld();
    cols.takeDirty(); flat.takeDirty();
    const rng = new SeededRNG(20260922);
    const r = (lo, hi) => lo + Math.floor(rng.next() * (hi - lo));
    // Old chunk indices translated to column keys, so both dirty lists compare.
    const asKeys = (list) => sorted(list.map((ci) => cols.chunkIndex(...flat.chunkCoords(ci))));
    for (let i = 0; i < 20000; i++) {
      // Cluster half the writes on chunk faces, where neighbour marking lives.
      const edge = rng.next() < 0.5;
      const x = edge ? r(0, 8) * 16 + (rng.next() < 0.5 ? 0 : 15) : r(-4, 132);
      const y = r(-4, 132), z = r(-3, 67);
      const op = rng.next();
      if (op < 0.5) {
        const id = r(0, 19);
        expect(cols.set(x, y, z, id), `set ${x},${y},${z}`).toBe(flat.set(x, y, z, id));
      } else if (op < 0.85) {
        expect(cols.get(x, y, z), `get ${x},${y},${z}`).toBe(flat.get(x, y, z));
      } else if (op < 0.95) {
        expect(cols.topSolid(x, y), `top ${x},${y}`).toBe(flat.topSolid(x, y));
      } else {
        expect(cols.inBounds(x, y, z)).toBe(flat.inBounds(x, y, z));
      }
      if (i % 97 === 0) expect(sorted(cols.takeDirty())).toEqual(asKeys(flat.takeDirty()));
    }
    expect(cols.version).toBe(flat.version);
    for (let z = 0; z < 64; z++) for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      if (cols.get(x, y, z) !== flat.get(x, y, z)) expect(`${x},${y},${z}`).toBe("identical");
    }
  });
});
