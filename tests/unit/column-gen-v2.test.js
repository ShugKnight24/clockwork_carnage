import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  GEN_VERSION, GEN_V1, GEN_VERSIONS, generateColumn, sampleColumn, fillColumn, surfaceHeight, findSpawn, biomeAt,
} from "../../src/world/column-gen.js";
import { SEA, BIOMES, MIN_TOP, MAX_TOP, regionAt } from "../../src/world/column-gen-v2.js";
import { AIR, BEDROCK, WATER, LOG, LEAVES } from "../../src/world/blocks.js";
import { DEFAULT_BOUNDS } from "../../src/world/world.js";

const GRASS = 11, DIRT = 10, SAND = 12, ROCK = 13, ORE = 14;
const GROUND = new Set([BEDROCK, GRASS, DIRT, SAND, ROCK, ORE]);
const v2 = (seed) => ({ kind: "terrain", seed, v: 2 });
const at = (col, lx, ly, z) => col[(z << 8) | (ly << 4) | lx];
/** The top of the ground, under any water and trees. */
const groundOf = (col, lx, ly) => { let z = 0; while (z < 63 && GROUND.has(at(col, lx, ly, z + 1))) z++; return z; };
const sha = (u8) => createHash("sha256").update(u8).digest("hex");
const wet = (t) => t < SEA - 1; // a water cell sits at z = SEA - 1 over this ground

/** Ground tops of an n × n area at (x0, y0) — multiples of 16 — through generateColumn. */
function grounds(gen, x0, y0, n) {
  const out = new Int16Array(n * n), cols = [];
  for (let cy = 0; cy < n / 16; cy++) for (let cx = 0; cx < n / 16; cx++) {
    const col = generateColumn(gen, (x0 >> 4) + cx, (y0 >> 4) + cy);
    cols.push(col);
    for (let ly = 0; ly < 16; ly++) for (let lx = 0; lx < 16; lx++) out[(cy * 16 + ly) * n + cx * 16 + lx] = groundOf(col, lx, ly);
  }
  return out;
}

describe("generator versions", () => {
  it("makes new worlds with version 2 and keeps version 1 reproducible", () => {
    expect(GEN_V1).toBe(1);
    expect(GEN_VERSION).toBe(2);
    expect(GEN_VERSIONS).toEqual([1, 2]);
  });

  it("dispatches terrain on gen.v; flat and void are the same in both", () => {
    expect(sha(generateColumn(v2(7), 0, 0))).not.toBe(sha(generateColumn({ ...v2(7), v: 1 }, 0, 0)));
    for (const kind of ["flat", "void"]) {
      expect(sha(generateColumn({ kind, seed: 5, v: 2 }, 3, -4))).toBe(sha(generateColumn({ kind, seed: 5, v: 1 }, 3, -4)));
    }
    expect(surfaceHeight({ kind: "flat", seed: 1, v: 2 }, 5, 5)).toBe(31);
  });
});

describe("generator v2: determinism", () => {
  it("makes the same bytes alone and after other columns and seeds", () => {
    const first = generateColumn(v2(99), 3, -2).slice();
    for (let i = 0; i < 60; i++) generateColumn(v2(i), i * 7 - 300, 40 - i);
    expect(sha(generateColumn(v2(99), 3, -2))).toBe(sha(first));
  });

  it("reads the seed as unsigned 32-bit and differs between seeds", () => {
    expect(sha(generateColumn(v2(2 ** 32 + 7), 1, 1))).toBe(sha(generateColumn(v2(7), 1, 1)));
    expect(sha(generateColumn(v2(7), 1, 1))).not.toBe(sha(generateColumn(v2(8), 1, 1)));
  });

  it("is generateColumn = fillColumn(sampleColumn), with surfaceHeight as the ground", () => {
    const gen = v2(31);
    for (const [cx, cy] of [[-4, 9], [30, -12], [200, 200]]) {
      const s = sampleColumn(gen, cx, cy);
      expect(sha(fillColumn(gen, cx, cy, s))).toBe(sha(generateColumn(gen, cx, cy)));
      const col = generateColumn(gen, cx, cy);
      for (let ly = 0; ly < 16; ly++) for (let lx = 0; lx < 16; lx++) {
        expect(groundOf(col, lx, ly)).toBe(surfaceHeight(gen, cx * 16 + lx, cy * 16 + ly));
      }
    }
  });

  it("has no seam in the ground across column borders", () => {
    const gen = v2(4242), n = 48, t = grounds(gen, -16, -16, n);
    const want = new Int16Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) want[y * n + x] = surfaceHeight(gen, x - 16, y - 16);
    expect(Array.from(t)).toEqual(Array.from(want));
  });
});

describe("generator v2: water", () => {
  it("fills exactly the air below the sea line and above the ground, nothing else", () => {
    const bad = [];
    for (const [seed, cx, cy] of [[7, 0, 0], [7, -40, 25], [42, 300, -300], [99, 4, 4], [99, -1000, 77]]) {
      const gen = v2(seed);
      for (let k = 0; k < 16; k++) {
        const col = generateColumn(gen, cx + (k & 3) * 5, cy + (k >> 2) * 5);
        for (let ly = 0; ly < 16; ly++) for (let lx = 0; lx < 16; lx++) {
          const g = groundOf(col, lx, ly);
          for (let z = 0; z < 64; z++) {
            const id = at(col, lx, ly, z), water = z > g && z < SEA;
            if ((id === WATER) !== water) bad.push(`${seed} ${cx},${cy} ${lx},${ly},${z}: ${id}`);
          }
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it("covers about a quarter of the surface, much more in archipelagos and little in the interior", () => {
    const share = { all: [0, 0], archipelago: [0, 0], coast: [0, 0], interior: [0, 0] };
    const perSeed = [];
    for (const seed of [7, 42, 99, 1234567, 3735928559]) {
      const gen = v2(seed);
      let n = 0, w = 0;
      for (let j = 0; j < 90; j++) for (let i = 0; i < 90; i++) {
        const x = i * 443 - 20000, y = j * 443 - 20000, isWet = wet(surfaceHeight(gen, x, y)) ? 1 : 0;
        const r = regionAt(gen, x, y);
        share[r][0]++; share[r][1] += isWet; share.all[0]++; share.all[1] += isWet;
        n++; w += isWet;
      }
      perSeed.push(w / n);
    }
    const f = (k) => share[k][1] / share[k][0];
    expect(f("all")).toBeGreaterThan(0.2); expect(f("all")).toBeLessThan(0.3);
    for (const s of perSeed) { expect(s).toBeGreaterThan(0.17); expect(s).toBeLessThan(0.34); }
    expect(f("archipelago")).toBeGreaterThan(0.38);
    expect(f("interior")).toBeLessThan(0.16);
    expect(f("coast")).toBeGreaterThan(f("interior"));
    expect(f("coast")).toBeLessThan(f("archipelago"));
    // Every region kind is common: the share varies over the map, not by seed.
    for (const k of ["archipelago", "coast", "interior"]) expect(share[k][0] / share.all[0]).toBeGreaterThan(0.2);
  });

  it("dresses dry land beside water in beach sand, bar highland rock, and the water's bed in sand or rock", () => {
    let shore = 0, sand = 0, rock = 0, beds = 0, badBed = 0;
    for (const [seed, x0, y0] of [[7, -512, -512], [42, 2048, -4096], [1234567, 10000, 9000]]) {
      const gen = v2(seed), n = 192;
      const t = new Int16Array(n * n);
      const cap = new Uint8Array(n * n);
      for (let cy = 0; cy < n / 16; cy++) for (let cx = 0; cx < n / 16; cx++) {
        const col = generateColumn(gen, (x0 >> 4) + cx, (y0 >> 4) + cy);
        for (let ly = 0; ly < 16; ly++) for (let lx = 0; lx < 16; lx++) {
          const i = (cy * 16 + ly) * n + cx * 16 + lx, g = groundOf(col, lx, ly);
          t[i] = g; cap[i] = at(col, lx, ly, g);
        }
      }
      for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) {
        const i = y * n + x;
        if (wet(t[i])) { beds++; if (cap[i] !== SAND && cap[i] !== ROCK && cap[i] !== ORE) badBed++; continue; }
        if (![i - 1, i + 1, i - n, i + n].some((j) => wet(t[j]))) continue;
        shore++;
        if (cap[i] === SAND) sand++; else if (cap[i] === ROCK || cap[i] === ORE) rock++;
      }
    }
    expect(beds).toBeGreaterThan(1000); expect(shore).toBeGreaterThan(500);
    expect(badBed).toBe(0);
    expect(sand + rock).toBe(shore);
    expect(sand / shore).toBeGreaterThan(0.9);
  });

  it("carries rivers to the sea, or into a lake, through water", () => {
    // Find river water, then walk the water from it: every river runs
    // downhill on its network, so it must end in the sea or in the lake of a
    // basin, and most of them reach the sea.
    let tried = 0, sea = 0, lake = 0;
    const steps = [];
    for (const seed of [7, 42]) {
      const gen = v2(seed), memo = new Map();
      const isWet = (x, y) => { const k = x * 4e6 + y; let v = memo.get(k); if (v === undefined) memo.set(k, (v = wet(surfaceHeight(gen, x, y)))); return v; };
      for (let s = 0, found = 0; s < 400 && found < 10; s++) {
        const sx = (s % 20) * 457 - 4000, sy = Math.floor(s / 20) * 389 - 4000;
        let start = null;
        for (let d = 0; d < 96 && !start; d++) {
          const b = biomeAt(gen, sx + d, sy);
          if (b.river && b.weights[4] < 0.5 && isWet(sx + d, sy)) start = [sx + d, sy];
        }
        if (!start) continue;
        found++; tried++;
        const seen = new Set([start[0] * 4e6 + start[1]]);
        let frontier = [start], n = 0, end = null;
        while (frontier.length && n < 900 && !end) {
          const next = [];
          for (const [x, y] of frontier) {
            const b = biomeAt(gen, x, y);
            if (b.weights[4] > 0.5) { end = "sea"; break; }
            if (b.basin) { end = "lake"; break; }
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const k = (x + dx) * 4e6 + y + dy;
              if (!seen.has(k) && isWet(x + dx, y + dy)) { seen.add(k); next.push([x + dx, y + dy]); }
            }
          }
          frontier = next; n++;
        }
        if (end === "sea") { sea++; steps.push(n); } else if (end === "lake") lake++;
      }
    }
    expect(tried).toBeGreaterThanOrEqual(16);
    expect((sea + lake) / tried).toBeGreaterThanOrEqual(0.9);
    expect(sea / tried).toBeGreaterThanOrEqual(0.6);
  }, 120_000);
});

describe("generator v2: land", () => {
  it("lists the four land biomes and the ocean", () => {
    expect(BIOMES).toEqual(["plains", "hills", "highlands", "sands", "ocean"]);
  });

  it("keeps every biome, weights summing to 1", () => {
    const n = Object.fromEntries(BIOMES.map((b) => [b, 0]));
    let worst = 0;
    for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) {
      const b = biomeAt(v2(7), i * 1571 - 50_000, j * 1571 - 50_000);
      n[b.biome]++;
      worst = Math.max(worst, Math.abs(b.weights.reduce((a, c) => a + c, 0) - 1));
    }
    expect(worst).toBeLessThan(1e-12);
    for (const b of BIOMES) expect(n[b] / 4096, b).toBeGreaterThan(0.03);
  });

  it("keeps v1's slope bound on land and on the sea floor", () => {
    // |Δground| between 4-neighbours ≤ 2 outside the highlands and ≤ 1 for
    // 99% of those pairs, coasts, lake bowls and river banks included; ≤ 4 in
    // the highlands.
    for (const [seed, x0, y0] of [[7, -256, -256], [42, 4096, -8192], [1234567, 9984, 9984]]) {
      const gen = v2(seed), n = 320, t = grounds(gen, x0, y0, n);
      let pairs = 0, steep = 0, worst = 0, worstRocky = 0;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const i = y * n + x;
        const hi = biomeAt(gen, x0 + x, y0 + y).weights[2] >= 0.5;
        for (const j of [x + 1 < n ? i + 1 : -1, y + 1 < n ? i + n : -1]) {
          if (j < 0) continue;
          const d = Math.abs(t[j] - t[i]);
          if (hi) { worstRocky = Math.max(worstRocky, d); continue; }
          worst = Math.max(worst, d); pairs++; if (d > 1) steep++;
        }
      }
      expect(worstRocky, `seed ${seed}`).toBeLessThanOrEqual(4);
      expect(worst, `seed ${seed}`).toBeLessThanOrEqual(2);
      expect(steep / pairs, `seed ${seed}`).toBeLessThan(0.01);
    }
  }, 60_000);

  it("stays within 12..47, with z = 48 and up open air", () => {
    let lo = 99, hi = -1;
    for (const seed of [7, 42]) {
      for (let k = 0; k < 40; k++) {
        const col = generateColumn(v2(seed), k * 37 - 700, k * 23 - 400);
        for (let ly = 0; ly < 16; ly++) for (let lx = 0; lx < 16; lx++) {
          const g = groundOf(col, lx, ly); lo = Math.min(lo, g); hi = Math.max(hi, g);
          for (let z = 48; z < 64; z++) expect(at(col, lx, ly, z)).toBe(AIR);
        }
      }
    }
    expect(MIN_TOP).toBe(12); expect(MAX_TOP).toBe(47);
    expect(lo).toBeGreaterThanOrEqual(MIN_TOP); expect(hi).toBeLessThanOrEqual(MAX_TOP);
    expect(lo).toBeLessThan(24); // there is deep sea
  });

  it("layers bedrock, rock and ore under the dressing, as v1 does", () => {
    let ore = 0, rock = 0;
    for (let c = 0; c < 40; c++) {
      const col = generateColumn(v2(17), c * 3 - 100, c * 5 - 100);
      for (let ly = 0; ly < 16; ly++) for (let lx = 0; lx < 16; lx++) {
        expect(at(col, lx, ly, 0)).toBe(BEDROCK);
        const g = groundOf(col, lx, ly);
        for (let z = 1; z <= g; z++) expect(GROUND.has(at(col, lx, ly, z))).toBe(true);
        for (let z = 3; z <= g - 5; z++) { const id = at(col, lx, ly, z); if (id === ORE) ore++; else if (id === ROCK) rock++; }
      }
    }
    expect(ore / (ore + rock)).toBeGreaterThan(0.015); expect(ore / (ore + rock)).toBeLessThan(0.025);
  });
});

describe("generator v2: spawn", () => {
  it("finds dry, level ground with no tree on it, inside the bounds, for every seed", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const gen = v2(seed * 2654435761);
      for (const [x, y, bounds] of [[64.5, 64.5, DEFAULT_BOUNDS], [0.5, 0.5, null]]) {
        const s = findSpawn(gen, x, y, bounds);
        const bx = Math.floor(s.x), by = Math.floor(s.y), t = surfaceHeight(gen, bx, by);
        expect(s.z).toBe(t + 1);
        expect(t, `seed ${seed}`).toBeGreaterThanOrEqual(SEA);
        if (bounds) { expect(bx).toBeGreaterThanOrEqual(0); expect(bx).toBeLessThan(128); expect(by).toBeGreaterThanOrEqual(0); expect(by).toBeLessThan(128); }
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          expect(Math.abs(surfaceHeight(gen, bx + dx, by + dy) - t)).toBeLessThanOrEqual(1);
        }
        const col = generateColumn(gen, bx >> 4, by >> 4);
        expect(at(col, bx & 15, by & 15, t + 1)).toBe(AIR);
        expect(at(col, bx & 15, by & 15, t + 2)).toBe(AIR);
      }
    }
  }, 60_000);
});

describe("generator v2 rules", () => {
  it("uses only math that every engine computes to the same bits", () => {
    for (const f of ["column-gen-v2.js", "trees.js"]) {
      const src = readFileSync(new URL(`../../src/world/${f}`, import.meta.url), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(src, f).not.toMatch(/Math\.(sin|cos|tan|asin|acos|atan|atan2|exp|expm1|pow|sqrt|cbrt|log|log2|log10|log1p|hypot|random|fround|sinh|cosh|tanh)\b/);
      expect(src, f).not.toMatch(/\*\*/);
      expect(src, f).not.toMatch(/SeededRNG|Date\.|performance\./);
    }
  });

  it("never puts a tree block where it could not stand", () => {
    // Logs and leaves only in air above the ground, never in the water.
    for (const [seed, cx, cy] of [[7, 0, 0], [42, 12, -30], [99, -64, 64]]) {
      for (let k = 0; k < 9; k++) {
        const col = generateColumn(v2(seed), cx + (k % 3), cy + Math.floor(k / 3));
        for (let ly = 0; ly < 16; ly++) for (let lx = 0; lx < 16; lx++) {
          const g = groundOf(col, lx, ly);
          for (let z = 0; z <= g; z++) expect([LOG, LEAVES]).not.toContain(at(col, lx, ly, z));
          for (let z = g + 1; z < SEA; z++) if (at(col, lx, ly, z) !== WATER) expect(g).toBeGreaterThanOrEqual(SEA - 1);
        }
      }
    }
  });
});
