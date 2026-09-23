import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { generateColumn, sampleColumn, fillColumn, surfaceHeight, biomeAt } from "../../src/world/column-gen.js";
import * as V2 from "../../src/world/column-gen-v2.js";
import { BAND, DYKE, perimeter } from "../../src/world/column-gen-blend.js";
import { checkGen } from "../../src/world/world-delta.js";
import { expandWorld } from "../../src/world/world-expand.js";
import { rleEncode } from "../../src/world/rle.js";
import { AIR, BEDROCK, WATER, LOG, LEAVES } from "../../src/world/blocks.js";
import { oldVoidWorld, oldTerrain } from "./fixtures/old-world.js";

const GRASS = 11, DIRT = 10, SAND = 12, ROCK = 13, ORE = 14;
const GROUND = new Set([BEDROCK, GRASS, DIRT, SAND, ROCK, ORE]);
const sha = (u8) => createHash("sha256").update(u8).digest("hex");
const at = (col, lx, ly, z) => col[(z << 8) | (ly << 4) | lx];
const groundOf = (col, lx, ly) => { let z = -1; while (z < 63 && GROUND.has(at(col, lx, ly, z + 1))) z++; return z; };
/** Top of the natural ground at a cell of a world. */
const groundAt = (w, x, y) => { let z = -1; while (z < 63 && GROUND.has(w.get(x, y, z + 1))) z++; return z; };

/** Chebyshev distance to the 128 box: 1 beside it, 0 or less inside. */
const dist = (x, y) => Math.max(-x, x - 127, -y, y - 127);

/** Old worlds to grow from: the shapes v4 left, a low edge under the sea line, and a rugged one. */
const OLD = {
  flat: () => () => 31,
  low: () => () => 26,
  terrain: (seed) => oldTerrain(seed),
  rugged: (seed) => (x, y) => surfaceHeight({ kind: "terrain", seed, v: 1 }, x, y),
};
const grown = (shape, seed) => expandWorld(oldVoidWorld(OLD[shape](seed), { seed }));

/** An expanded world with the old box and `ring` columns around it loaded. */
function grownAround(shape, seed, ring = 3) {
  const w = grown(shape, seed);
  for (let cy = -ring; cy < 8 + ring; cy++) for (let cx = -ring; cx < 8 + ring; cx++) w.ensureColumn(cx, cy);
  return w;
}

describe("blend generator: the old area", () => {
  it("makes only air inside the old area, as the void generator did", () => {
    const gen = grown("terrain", 5).meta.gen;
    expect(gen.kind).toBe("blend");
    for (const [cx, cy] of [[0, 0], [7, 7], [3, 5], [0, 7]]) {
      expect(generateColumn(gen, cx, cy).every((v) => v === AIR)).toBe(true);
    }
    expect(surfaceHeight(gen, 64, 64)).toBe(-1);
  });

  it("handles an area that does not sit on column borders", () => {
    const bounds = { x0: 5, y0: -7, x1: 70, y1: 50 };
    const w = expandWorld(oldVoidWorld(() => 33, { seed: 3, bounds }));
    for (let cy = -3; cy <= 5; cy++) for (let cx = -2; cx <= 6; cx++) w.ensureColumn(cx, cy);
    // The old content is intact right up to its edge on every side...
    for (const [x, y] of [[5, 0], [69, 20], [30, -7], [30, 49], [5, -7], [69, 49]]) expect(groundAt(w, x, y), `${x},${y}`).toBe(33);
    // ...and the new ground starts at its height.
    for (const [x, y] of [[4, 0], [70, 20], [30, -8], [30, 50], [4, -8], [70, 50]]) expect(groundAt(w, x, y), `${x},${y}`).toBe(33);
  });
});

describe("blend generator: determinism", () => {
  it("is version 2 byte for byte past the band and a tree's reach", () => {
    const gen = grown("terrain", 11).meta.gen, v2 = { kind: "terrain", seed: gen.seed, v: 2 };
    // Column (-3, 3) spans x -48..-33: 33 blocks out, past BAND + reach.
    for (const [cx, cy] of [[-3, 3], [10, 4], [4, 11], [-3, -3], [40, -12]]) {
      expect(sha(generateColumn(gen, cx, cy)), `${cx},${cy}`).toBe(sha(generateColumn(v2, cx, cy)));
    }
    // The band is not: the ring of columns around the old box differs.
    expect(sha(generateColumn(gen, -1, 3))).not.toBe(sha(generateColumn(v2, -1, 3)));
  });

  it("eases version 2's unrounded level, which rounds to its surface height", () => {
    const v2 = { kind: "terrain", seed: 77, v: 2 };
    for (let k = 0; k < 400; k++) {
      const x = k * 37 - 7000, y = k * 53 - 9000;
      const t = V2.surfaceHeight(v2, x, y);
      expect(Math.max(V2.MIN_TOP, Math.min(V2.MAX_TOP, Math.round(V2.surfaceLevel(v2, x, y))))).toBe(t);
    }
  });

  it("is generateColumn = fillColumn(sampleColumn), with surfaceHeight as the ground", () => {
    const gen = grown("rugged", 21).meta.gen;
    for (const [cx, cy] of [[-1, -1], [8, 3], [3, -2], [-2, 5], [9, 9]]) {
      const s = sampleColumn(gen, cx, cy);
      expect(sha(fillColumn(gen, cx, cy, s))).toBe(sha(generateColumn(gen, cx, cy)));
      const col = generateColumn(gen, cx, cy);
      for (let ly = 0; ly < 16; ly++) for (let lx = 0; lx < 16; lx++) {
        expect(groundOf(col, lx, ly)).toBe(surfaceHeight(gen, cx * 16 + lx, cy * 16 + ly));
      }
    }
  });

  it("makes the same bytes in any order, interleaved with other worlds", () => {
    const gen = grown("terrain", 31).meta.gen, other = grown("low", 32).meta.gen;
    const ring = [];
    for (let cy = -2; cy < 10; cy++) for (let cx = -2; cx < 10; cx++) if (cx < 0 || cy < 0 || cx > 7 || cy > 7) ring.push([cx, cy]);
    const first = new Map(ring.map(([cx, cy]) => [`${cx},${cy}`, sha(generateColumn(gen, cx, cy))]));
    // A fixed shuffle, and other generators' columns in between.
    const order = ring.map((c, i) => [(i * 7919) % ring.length, c]).sort((a, b) => a[0] - b[0]).map(([, c]) => c);
    for (const [cx, cy] of order) {
      generateColumn(other, cy, cx);
      generateColumn({ kind: "terrain", seed: 99, v: 2 }, cx + 5, cy);
      expect(sha(generateColumn(structuredClone(gen), cx, cy)), `${cx},${cy}`).toBe(first.get(`${cx},${cy}`));
    }
  });
});

describe("blend generator: the seam", () => {
  it("meets the old edge within a block, all the way round", () => {
    for (const shape of Object.keys(OLD)) for (const seed of [1, 42, 1234567]) {
      const w = grownAround(shape, seed, 1);
      let worst = 0;
      for (let k = 0; k < 128; k++) {
        for (const [ox, oy, ix, iy] of [[k, -1, k, 0], [k, 128, k, 127], [-1, k, 0, k], [128, k, 127, k]]) {
          worst = Math.max(worst, Math.abs(groundAt(w, ox, oy) - groundAt(w, ix, iy)));
        }
      }
      // Generator v2's own land slope bound is 2.
      expect(worst, `${shape} ${seed}`).toBeLessThanOrEqual(1);
    }
  }, 60_000);

  it("keeps generator v2's slope bounds through the band", () => {
    // |Δground| between 4-neighbours in the band: ≤ 2 outside the highlands,
    // ≤ 4 in them, as v2 holds everywhere; steps of 2 stay rare.
    for (const shape of Object.keys(OLD)) for (const seed of [7, 99]) {
      const w = grownAround(shape, seed, 2), gen = w.meta.gen;
      let worst = 0, worstHigh = 0, pairs = 0, steep = 0;
      for (let y = -32; y < 160; y++) for (let x = -32; x < 160; x++) {
        if (dist(x, y) < 1 || dist(x, y) > BAND + 1) continue;
        const high = biomeAt(gen, x, y).weights[2] >= 0.5, t = groundAt(w, x, y);
        for (const [nx, ny] of [[x + 1, y], [x, y + 1]]) {
          if (nx >= 160 || ny >= 160 || dist(nx, ny) < 1) continue;
          const d = Math.abs(groundAt(w, nx, ny) - t);
          if (high) { worstHigh = Math.max(worstHigh, d); continue; }
          worst = Math.max(worst, d); pairs++; if (d > 1) steep++;
        }
      }
      expect(worst, `${shape} ${seed}`).toBeLessThanOrEqual(2);
      expect(worstHigh, `${shape} ${seed}`).toBeLessThanOrEqual(4);
      expect(steep / pairs, `${shape} ${seed}`).toBeLessThan(0.05);
    }
  }, 60_000);

  it("never stands water beside air, and keeps it out of the dyke", () => {
    for (const shape of ["flat", "low", "terrain"]) for (const seed of [42, 1234567]) {
      const w = grownAround(shape, seed, 2);
      let water = 0;
      for (let y = -32; y < 160; y++) for (let x = -32; x < 160; x++) {
        if (dist(x, y) < 1) continue;
        for (let z = 0; z < V2.SEA; z++) {
          if (w.get(x, y, z) !== WATER) continue;
          water++;
          expect(dist(x, y), `${shape} ${seed} ${x},${y}`).toBeGreaterThanOrEqual(DYKE);
          for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
            if (Math.max(Math.abs(nx - 64), Math.abs(ny - 64)) >= 96) continue; // outside what is loaded
            expect(w.get(nx, ny, z), `${shape} ${seed} ${nx},${ny},${z}`).not.toBe(AIR);
          }
        }
      }
      // Seeds 42 and 1234567 have sea near the old box: the test is not vacuous.
      expect(water, `${shape} ${seed}`).toBeGreaterThan(100);
    }
  }, 60_000);

  it("grows whole trees near the seam, none reaching the old area", () => {
    let trees = 0;
    for (const seed of [1, 7, 42]) {
      const w = grownAround("terrain", seed, 2);
      for (let y = -32; y < 160; y++) for (let x = -32; x < 160; x++) {
        for (let z = 20; z < 48; z++) {
          const id = w.get(x, y, z);
          if (id !== LOG && id !== LEAVES) continue;
          if (dist(x, y) <= BAND) trees++;
          // Roots stand beyond the dyke and reach 3, so nothing comes nearer than 2.
          expect(dist(x, y), `${seed} ${x},${y},${z}`).toBeGreaterThanOrEqual(2);
        }
      }
    }
    expect(trees).toBeGreaterThan(0);
  }, 60_000);

  it("keeps an old grass edge grassy instead of ringing it with beach sand", () => {
    for (const seed of [1, 7, 42]) {
      const w = grownAround("flat", seed, 1);
      for (let k = 0; k < 128; k++) {
        for (const [x, y] of [[k, -1], [k, 128], [-1, k], [128, k], [k, -3], [-5, k]]) {
          const t = groundAt(w, x, y);
          expect(w.get(x, y, t), `${seed} ${x},${y}`).toBe(GRASS);
        }
      }
    }
  });
});

describe("blend generator rules", () => {
  it("uses only math that every engine computes to the same bits", () => {
    const src = readFileSync(new URL("../../src/world/column-gen-blend.js", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(src).not.toMatch(/Math\.(sin|cos|tan|asin|acos|atan|atan2|exp|expm1|pow|sqrt|cbrt|log|log2|log10|log1p|hypot|random|fround|sinh|cosh|tanh)\b/);
    expect(src).not.toMatch(/\*\*/);
    expect(src).not.toMatch(/SeededRNG|Date\.|performance\./);
  });

  it("is a generator checkGen accepts, and refuses a malformed one", () => {
    const gen = grown("flat", 3).meta.gen;
    expect(checkGen(gen)).toBe(gen);
    const n = perimeter(gen.area);
    expect(n).toBe(512);
    const bad = [
      { ...gen, v: 1 },
      { ...gen, seed: -1 },
      { ...gen, area: { x0: 0, y0: 0, x1: 0, y1: 128 } },
      { ...gen, edge: rleEncode(new Uint8Array(n - 1)) },
      { ...gen, caps: [11] },
      { ...gen, area: { x0: 0, y0: 0, x1: 1 << 20, y1: 128 }, edge: rleEncode(new Uint8Array(2 * ((1 << 20) + 128))) },
    ];
    for (const b of bad) expect(() => checkGen(b), JSON.stringify(b).slice(0, 80)).toThrow();
  });
});

describe("blend generator is frozen", () => {
  // Recorded 2026-09-23, identical under node (V8) and bun (JavaScriptCore).
  // Grown worlds save their new land as deltas against exactly these bytes;
  // a change here is a new version, never a new hash.
  const GOLDEN = {
    "-1,-1": "26500b2be47cdbaa417dc7ec34c50e00ac1381cc0ac9dd7ead5a90fe80b90e6e",
    "8,3": "6fedff469e7b7dbe5fdd3df329ce791d3c19c5c428c5c7f8bccc8ff1a891c4a1",
    "3,-2": "04df1c4399f29a23721d2e4ffc0791f2266a949d53aef451784056c393fe9ce3",
    "-2,5": "6043041976d0a96bc3088bac0c6b38eb46f4e9e6e042c3a80865156c142178b9",
    "9,9": "db624e67f64aceb2c58555c45f9c2e93e0a59740eea7dd1559f417ad8ae29f13",
    "0,8": "4a5fbbf49956aa2e69ee2f75ca8acb46637f60cdefa7e67d827fe83eed538d80",
  };
  const gen = {
    kind: "blend", seed: 4242, v: 2, area: { x0: 0, y0: 0, x1: 128, y1: 128 },
    // A profile that walks up and down, and caps of grass then sand.
    edge: rleEncode(Uint8Array.from({ length: 512 }, (_, i) => 26 + ((i * 7) % 13))),
    caps: rleEncode(Uint8Array.from({ length: 512 }, (_, i) => (i % 64 < 40 ? GRASS : SAND))),
  };

  it("matches the golden bytes of columns around an old area", () => {
    const got = {};
    for (const k of Object.keys(GOLDEN)) { const [cx, cy] = k.split(",").map(Number); got[k] = sha(generateColumn(gen, cx, cy)); }
    expect(got).toEqual(GOLDEN);
  });
});
