import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  GEN_V1, BIOMES, MAX_TOP, generateColumn, sampleColumn, fillColumn, surfaceHeight, findSpawn, biomeAt,
} from "../../src/world/column-gen.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { AIR, BEDROCK } from "../../src/world/blocks.js";

const GRASS = 11, DIRT = 10, SAND = 12, ROCK = 13, ORE = 14;
const terrain = (seed) => ({ kind: "terrain", seed, v: 1 });
const at = (col, lx, ly, z) => col[(z << 8) | (ly << 4) | lx];
const topOf = (col, lx, ly) => { let z = 63; while (z >= 0 && at(col, lx, ly, z) === AIR) z--; return z; };
const sha = (u8) => createHash("sha256").update(u8).digest("hex");

/** Tops of an n × n block area starting at (x0, y0), both multiples of 16, through generateColumn. */
function tops(gen, x0, y0, n) {
  const out = new Int16Array(n * n);
  for (let cy = 0; cy < n / 16; cy++) for (let cx = 0; cx < n / 16; cx++) {
    const col = generateColumn(gen, (x0 >> 4) + cx, (y0 >> 4) + cy);
    for (let ly = 0; ly < 16; ly++) for (let lx = 0; lx < 16; lx++) out[(cy * 16 + ly) * n + cx * 16 + lx] = topOf(col, lx, ly);
  }
  return out;
}

describe("generateColumn: determinism", () => {
  it("makes the same bytes alone and after a hundred other columns and seeds", () => {
    const first = generateColumn(terrain(99), 3, -2).slice();
    for (let i = 0; i < 100; i++) generateColumn(terrain(i), i * 7 - 300, 40 - i);
    expect(sha(generateColumn(terrain(99), 3, -2))).toBe(sha(first));
  });

  it("writes into a caller's buffer and clears it first", () => {
    const out = new Uint8Array(16384).fill(9);
    const same = generateColumn(terrain(5), 0, 0, out);
    expect(same).toBe(out);
    expect(sha(out)).toBe(sha(generateColumn(terrain(5), 0, 0)));
  });

  it("reads the seed as unsigned 32-bit and differs between seeds", () => {
    expect(sha(generateColumn(terrain(2 ** 32 + 7), 1, 1))).toBe(sha(generateColumn(terrain(7), 1, 1)));
    expect(sha(generateColumn(terrain(-1), 1, 1))).toBe(sha(generateColumn(terrain(0xffffffff), 1, 1)));
    expect(sha(generateColumn(terrain(7), 1, 1))).not.toBe(sha(generateColumn(terrain(8), 1, 1)));
  });

  it("is generateColumn = fillColumn(sampleColumn), with surfaceHeight as the top", () => {
    const gen = terrain(31);
    const s = sampleColumn(gen, -4, 9);
    expect(sha(fillColumn(gen, -4, 9, s))).toBe(sha(generateColumn(gen, -4, 9)));
    const col = generateColumn(gen, -4, 9);
    for (let ly = 0; ly < 16; ly++) for (let lx = 0; lx < 16; lx++) {
      expect(topOf(col, lx, ly)).toBe(surfaceHeight(gen, -64 + lx, 144 + ly));
    }
    // the padded ring is the neighbours' own surface
    for (let i = -1; i <= 16; i++) {
      expect(s.top[(i + 1) * 18]).toBe(surfaceHeight(gen, -65, 144 + i));
      expect(s.top[i + 1]).toBe(surfaceHeight(gen, -64 + i, 143));
    }
  });

  it("stays inside the column: no seam in the surface across column borders", () => {
    const gen = terrain(4242), n = 48, t = tops(gen, -16, -16, n);
    const want = new Int16Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) want[y * n + x] = surfaceHeight(gen, x - 16, y - 16);
    expect(Array.from(t)).toEqual(Array.from(want));
  });
});

describe("generateColumn: no repetition", () => {
  it("differs at the old lattice periods and far away", () => {
    const gen = terrain(7);
    const base = sha(generateColumn(gen, 2, 3));
    for (const d of [384, 1152, 100_000, -100_000]) {
      expect(sha(generateColumn(gen, 2 + d / 16, 3))).not.toBe(base);
      expect(sha(generateColumn(gen, 2, 3 + d / 16))).not.toBe(base);
    }
  });

  it("has no strong autocorrelation at the old wrap lengths", () => {
    // The old 16-cell lattice made the surface repeat every 144 (the /9
    // octave), 384 (the /24 octave) and 1,152 blocks (both). With hashed
    // lattice points nothing there lines up.
    const gen = terrain(1234567), N = 40_000;
    const h = new Float64Array(N + 1152);
    for (let i = 0; i < h.length; i++) h[i] = surfaceHeight(gen, i - 20_000, 777);
    const mean = h.reduce((a, b) => a + b, 0) / h.length;
    const corr = (lag) => {
      let num = 0, den = 0;
      for (let i = 0; i < N; i++) { num += (h[i] - mean) * (h[i + lag] - mean); den += (h[i] - mean) ** 2; }
      return num / den;
    };
    const same = (lag) => { let n = 0; for (let i = 0; i < N; i++) if (h[i] === h[i + lag]) n++; return n / N; };
    for (const lag of [144, 384, 1152]) {
      expect(Math.abs(corr(lag))).toBeLessThan(0.5);
      expect(same(lag)).toBeLessThan(0.4);
    }
    expect(corr(1)).toBeGreaterThan(0.9); // it is still smooth terrain, not noise
  });
});

describe("generateColumn: environment variants", () => {
  it("lists the four v1 biomes", () => {
    expect(BIOMES).toEqual(["plains", "hills", "highlands", "sands"]);
  });

  it("covers every biome over a wide sample, none taking over", () => {
    for (const seed of [7, 1234567, 99]) {
      const n = Object.fromEntries(BIOMES.map((b) => [b, 0]));
      for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) n[biomeAt(terrain(seed), i * 1571 - 50_000, j * 1571 - 50_000).biome]++;
      for (const b of BIOMES) {
        expect(n[b] / 4096, `${b} on seed ${seed}`).toBeGreaterThan(0.04);
        expect(n[b] / 4096, `${b} on seed ${seed}`).toBeLessThan(0.6);
      }
    }
  });

  it("blends weights that sum to 1 and change slowly from cell to cell", () => {
    const gen = terrain(11);
    let prev = biomeAt(gen, -3000, 500).weights, maxStep = 0;
    let worstSum = 0, lowest = 0;
    for (let x = -2999; x < 3000; x++) {
      const w = biomeAt(gen, x, 500).weights;
      worstSum = Math.max(worstSum, Math.abs(w.reduce((a, b) => a + b, 0) - 1));
      lowest = Math.min(lowest, ...w);
      for (let k = 0; k < 4; k++) maxStep = Math.max(maxStep, Math.abs(w[k] - prev[k]));
      prev = w;
    }
    expect(worstSum).toBeLessThan(1e-12);
    expect(lowest).toBe(0);
    expect(maxStep).toBeLessThan(0.15); // a border is tens of blocks wide, never a line
  });

  it("keeps slopes walkable outside the highlands, and bounded inside them", () => {
    // Bound: |Δtop| between 4-neighbours ≤ 2 outside the highlands and ≤ 1 for
    // 99% of those pairs (the step-up climbs 1; the jump clears 1.5). Highland
    // tors and crags may reach 4: they are the intended rocky feature.
    for (const [seed, x0, y0] of [[7, -256, -256], [42, 4096, -8192], [99, -65536, 32768]]) {
      const gen = terrain(seed), n = 384, t = tops(gen, x0, y0, n);
      const highland = new Uint8Array(n * n);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) highland[y * n + x] = biomeAt(gen, x0 + x, y0 + y).weights[2] >= 0.5 ? 1 : 0;
      let pairs = 0, steep = 0, worstRocky = 0, worst = 0;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const i = y * n + x;
        for (const j of [x + 1 < n ? i + 1 : -1, y + 1 < n ? i + n : -1]) {
          if (j < 0) continue;
          const d = Math.abs(t[j] - t[i]);
          if (highland[i] || highland[j]) { worstRocky = Math.max(worstRocky, d); continue; }
          worst = Math.max(worst, d);
          pairs++; if (d > 1) steep++;
        }
      }
      expect(worstRocky, `seed ${seed}`).toBeLessThanOrEqual(4);
      expect(worst, `seed ${seed}`).toBeLessThanOrEqual(2);
      expect(steep / pairs, `seed ${seed}`).toBeLessThan(0.01);
    }
  });

  it("uses a wider height range than the old 26..38 and never reaches z = 48", () => {
    let lo = 99, hi = -1;
    for (const seed of [7, 42, 99]) {
      const t = tops(terrain(seed), -512, -512, 1024);
      for (const v of t) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    }
    expect(MAX_TOP).toBe(47); // e2e sight lines at z = 48..49 rely on open air there
    expect(lo).toBeGreaterThanOrEqual(20); expect(hi).toBeLessThanOrEqual(MAX_TOP);
    expect(lo).toBeLessThanOrEqual(27); expect(hi).toBe(MAX_TOP);
  });
});

describe("generateColumn: layering and ore", () => {
  it("is solid from bedrock to the top, dressed by biome", () => {
    const caps = new Set(), bad = [];
    const LAYERS = new Set([DIRT, SAND, ROCK, ORE, GRASS]);
    for (let c = 0; c < 400; c++) {
      const col = generateColumn(terrain(3), (c % 20) * 7 - 70, Math.floor(c / 20) * 7 - 70);
      for (let ly = 0; ly < 16; ly += 3) for (let lx = 0; lx < 16; lx += 3) {
        const t = topOf(col, lx, ly), cap = at(col, lx, ly, t), under = at(col, lx, ly, t - 1);
        if (at(col, lx, ly, 0) !== BEDROCK) bad.push(`no bedrock ${c}`);
        for (let z = 1; z <= t; z++) if (!LAYERS.has(at(col, lx, ly, z))) bad.push(`hole ${c} ${lx},${ly},${z}`);
        if (cap === GRASS && under !== DIRT) bad.push(`grass on ${under}`);
        if (cap === SAND && under !== SAND) bad.push(`sand on ${under}`);
        caps.add(cap === ORE ? ROCK : cap);
      }
    }
    expect(bad).toEqual([]);
    expect([...caps].sort()).toEqual([GRASS, SAND, ROCK].sort());
  });

  it("puts ore in about 2% of rock above z = 2, cell by cell", () => {
    let ore = 0, rock = 0, low = 0;
    for (let c = 0; c < 64; c++) {
      const col = generateColumn(terrain(17), c * 3 - 100, c * 5 - 100);
      for (let i = 0; i < col.length; i++) {
        const z = i >> 8;
        if (col[i] === ORE) { if (z <= 2) low++; else ore++; }
        else if (col[i] === ROCK && z > 2) rock++;
      }
    }
    expect(low).toBe(0);
    expect(ore / (ore + rock)).toBeGreaterThan(0.017);
    expect(ore / (ore + rock)).toBeLessThan(0.023);
  });
});

describe("flat and void generators", () => {
  it("flat: today's layers everywhere, no ore, at any coordinate", () => {
    for (const [cx, cy] of [[0, 0], [-3, 7], [65000, -65000]]) {
      const col = generateColumn({ kind: "flat", seed: 5, v: 1 }, cx, cy);
      for (let ly = 0; ly < 16; ly++) for (let lx = 0; lx < 16; lx++) {
        expect(at(col, lx, ly, 0)).toBe(BEDROCK);
        for (let z = 1; z < 27; z++) expect(at(col, lx, ly, z)).toBe(ROCK);
        for (let z = 27; z < 31; z++) expect(at(col, lx, ly, z)).toBe(DIRT);
        expect(at(col, lx, ly, 31)).toBe(GRASS);
        expect(at(col, lx, ly, 32)).toBe(AIR);
      }
    }
    expect(surfaceHeight({ kind: "flat", seed: 1, v: 1 }, 123, -456)).toBe(31);
  });

  it("void: all air", () => {
    expect(generateColumn({ kind: "void", seed: 5, v: 1 }, 2, 2).every((v) => v === AIR)).toBe(true);
    expect(surfaceHeight({ kind: "void", seed: 5, v: 1 }, 0, 0)).toBe(-1);
  });
});

describe("findSpawn", () => {
  it("finds level ground near the asked point for every seed", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const gen = terrain(seed * 2654435761);
      const s = findSpawn(gen, 64.5, 64.5);
      const bx = Math.floor(s.x), by = Math.floor(s.y), t = surfaceHeight(gen, bx, by);
      expect(s.z).toBe(t + 1);
      expect(Math.max(Math.abs(bx - 64), Math.abs(by - 64))).toBeLessThanOrEqual(24);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        expect(Math.abs(surfaceHeight(gen, bx + dx, by + dy) - t)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("keeps the asked point on flat ground", () => {
    expect(findSpawn({ kind: "flat", seed: 1, v: 1 }, 64.5, 64.5)).toEqual({ x: 64.5, y: 64.5, z: 32 });
  });
});

describe("generator v1 is frozen", () => {
  it("uses only math that every engine computes to the same bits", () => {
    const src = readFileSync(new URL("../../src/world/column-gen.js", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""); // code only, not the comments that name the banned calls
    expect(src).not.toMatch(/Math\.(sin|cos|tan|asin|acos|atan|atan2|exp|expm1|pow|sqrt|cbrt|log|log2|log10|log1p|hypot|random|fround|sinh|cosh|tanh)\b/);
    expect(src).not.toMatch(/\*\*/);
    expect(src).not.toMatch(/SeededRNG|Date\.|performance\./);
  });

  it("is version 1", () => {
    expect(GEN_V1).toBe(1);
  });

  // Recorded when v1 was frozen (2026-09-22), and identical under V8 (node)
  // and JavaScriptCore (bun). These never change: a failure here means
  // generator v1's output moved, which would strand every saved edit on
  // shifted terrain. Put new terrain in a v2 path instead; never record anew.
  // [seed, cx, cy, sha256 of the column's 16,384 bytes]
  const GOLDEN = [
    [7, 0, 0, "a3e27935c9727bdd8e2f244f2ce72d99153bec5270917e28ce9b7699b8bd03d0"],
    [7, 4, 4, "3c0d43a053792e6bc22b27584899acc6988d9a6a9fa5962f9410ae79b0bac431"],
    [7, -1, -1, "2bd289f7cc50ae1946b9f8b8763f477c983629517d0e55943c8da50d0be0dd2b"],
    [7, -37, 12, "aa4b77b1ea097c53ef0874ce4ed7efae92b7d9dcf8915cd485a8443d144da353"],
    [7, 6250, -6250, "3d78b82f43bf05946e9486785b7f66206216756f2bc06b418a8f916f3248f7c0"],
    [7, 65535, -65536, "d138d164224a0e3740140b9c1efc67749015d171f29087a927882875f9b93ca8"],
    [1234567, 0, 0, "e88f6894351fa80e782d265b38199823d80007a75d816744aad447a1cbf79e47"],
    [1234567, 4, 4, "63c4be9269ac5d9f4eaebb744c4424d1db3d6bc1ed29d8fd50cb8ed7fd9ce47a"],
    [1234567, -1, -1, "ff2de73d8093e1c682d5e0e761dbd0fc3de46c398a4d004707f3407d228f8029"],
    [1234567, -37, 12, "0ceaf20bdf2540991430a9c48a576b154935cf82e089fe6311388afba5952c05"],
    [1234567, 6250, -6250, "fb8dc7c644bcc2295bec5de3ba81eecbd37edfbda7722eced089e874f34c0d60"],
    [1234567, 65535, -65536, "62ddfa912b2c726cf9ba8b4d3c384a848b22c09aaeedf221c0af584d11d1a248"],
    [3735928559, 0, 0, "d3fbc6b6c0ff9c2910809ac52d3dd5199455c861b5c1af5564dde0c70f8c7a6b"],
    [3735928559, 4, 4, "35f3068933d34368cbaebc1c5dc2d6074c05bbe88eb68a4adf8515da185f7811"],
    [3735928559, -1, -1, "f88ab152cd35c3dce4d9ca543d27c68505ffe742af5a908d39f9b5a1afeb88d6"],
    [3735928559, -37, 12, "aaaf0cfb4a82649420b6723b3d5cc1680621277b8ecb2d4b365ddec8f96c0e9e"],
    [3735928559, 6250, -6250, "2bb5c7016ca6adf0fd9ce7b018cd88de1265b5b3e04042568274312269897a07"],
    [3735928559, 65535, -65536, "4e97f4ee450aa5bf99312b55573cb183a98f4ca65e0a62be4476521703ddf17e"],
    [7, -9, -40, "5eafe37950ee4320a6eb3f376d408911921c4e4532428cac6052f47d3ddd1917"], // all plains
    [7, 35, -40, "747b325b1dda5ab6a499807255f7ba803b6821bfdb9e8f199c0272e28995c98a"], // all hills
    [7, 12, -40, "9910004c2545654ea46eae51f8262bccef349a535bf1f42f70585a1a00bb8937"], // all highlands
    [7, -19, -35, "bde8621b35e38b0d4969d3c9ad5705784a92d64fb34c93b3e8c9ecfb13842f49"], // all sands
  ];

  it("matches the golden bytes of fixed columns", () => {
    for (const [seed, cx, cy, hash] of GOLDEN) expect(sha(generateColumn(terrain(seed), cx, cy)), `${seed} ${cx},${cy}`).toBe(hash);
  });

  it("matches the golden bytes of a whole 128 × 128 world and of flat ground", () => {
    const w = generateWorld({ terrain: true, seed: 7, v: 1 });
    expect(sha(Buffer.concat([...w.columns.values()].map((c) => Buffer.from(c.blocks))))).toBe("297f25dbf3a135c0d400dbc9501f5c05e003548c3b1e2647aefd81fc4c0fe871");
    expect(sha(generateColumn({ kind: "flat", seed: 1, v: 1 }, 0, 0))).toBe("34c6c37d91559a5d8f07c78adb5583b40a75d368f238ffcd080c7fd52f229789");
  });
});
