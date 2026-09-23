import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  SEA, generateColumn, sampleColumn, fillColumn, surfaceHeight, treeAtCell, biomeAt,
} from "../../src/world/column-gen-v2.js";
import { SPECIES, SPECIES_NAMES, TREE_REACH, treeShape, treeTop, plantOver } from "../../src/world/trees.js";
import { AIR, WATER, LOG, LEAVES, SAPLING } from "../../src/world/blocks.js";

const v2 = (seed) => ({ kind: "terrain", seed, v: 2 });
const SAND = 12, ROCK = 13, GRASS = 11;
const sha = (u8) => createHash("sha256").update(u8).digest("hex");

describe("tree shapes", () => {
  it("stay within the reach, start with a trunk at the root and top out where treeTop says", () => {
    for (const species of Object.values(SPECIES)) {
      for (let h = 0; h < 4096; h += 37) {
        let top = -1, root = null, far = 0;
        treeShape(species, h * 2654435761 >>> 0, (dx, dy, dz, id) => {
          far = Math.max(far, Math.abs(dx), Math.abs(dy));
          top = Math.max(top, dz);
          expect(dz).toBeGreaterThanOrEqual(0);
          expect([LOG, LEAVES]).toContain(id);
          if (dx === 0 && dy === 0 && dz === 0) root = id;
        });
        expect(far).toBeLessThanOrEqual(TREE_REACH);
        expect(root).toBe(LOG);
        expect(top).toBe(treeTop(species, h * 2654435761 >>> 0));
      }
    }
  });

  it("plant logs over leaves, leaves only in air, and never replace ground or water", () => {
    expect(plantOver(AIR, LEAVES)).toBe(LEAVES);
    expect(plantOver(AIR, LOG)).toBe(LOG);
    expect(plantOver(LEAVES, LOG)).toBe(LOG);
    expect(plantOver(LOG, LEAVES)).toBe(LOG);
    for (const ground of [WATER, GRASS, SAND, ROCK, SAPLING]) {
      expect(plantOver(ground, LOG)).toBe(ground);
      expect(plantOver(ground, LEAVES)).toBe(ground);
    }
  });
});

describe("trees in generator v2", () => {
  /**
   * The same 96 × 96 area two ways: column by column in a shuffled order, the
   * way a streamer would; and as bare terrain with every tree then planted
   * whole into one big array. Any tree cut at a column border, planted twice
   * or planted in a different order shows up as a difference.
   */
  it("are the same generated column by column in any order as planted whole", () => {
    for (const [seed, cx0, cy0] of [[7, -3, -3], [42, 20, -40], [1234567, -300, 250]]) {
      const gen = v2(seed), N = 6, S = N * 16, x0 = cx0 * 16, y0 = cy0 * 16;
      const idx = (x, y, z) => (z * S + (y - y0)) * S + (x - x0);
      const order = [];
      for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) order.push([cx0 + cx, cy0 + cy]);
      let r = seed;
      for (let i = order.length - 1; i > 0; i--) { r = (Math.imul(r, 1103515245) + 12345) >>> 0; const j = r % (i + 1); [order[i], order[j]] = [order[j], order[i]]; }
      const streamed = new Uint8Array(S * S * 64), whole = new Uint8Array(S * S * 64);
      for (const [cx, cy] of order) {
        const col = generateColumn(gen, cx, cy);
        for (let i = 0; i < col.length; i++) streamed[idx(cx * 16 + (i & 15), cy * 16 + ((i >> 4) & 15), i >> 8)] = col[i];
      }
      for (let cy = cy0; cy < cy0 + N; cy++) for (let cx = cx0; cx < cx0 + N; cx++) {
        const col = fillColumn(gen, cx, cy, sampleColumn(gen, cx, cy), undefined, { trees: false });
        for (let i = 0; i < col.length; i++) whole[idx(cx * 16 + (i & 15), cy * 16 + ((i >> 4) & 15), i >> 8)] = col[i];
      }
      let trees = 0, straddling = 0;
      for (let j = Math.floor((y0 - TREE_REACH) / 4); j <= Math.floor((y0 + S + TREE_REACH) / 4); j++) {
        for (let i = Math.floor((x0 - TREE_REACH) / 4); i <= Math.floor((x0 + S + TREE_REACH) / 4); i++) {
          const tr = treeAtCell(gen, i, j);
          if (!tr) continue;
          trees++;
          const cols = new Set();
          treeShape(tr.species, tr.h, (dx, dy, dz, id) => {
            const x = tr.x + dx, y = tr.y + dy, z = tr.z + dz;
            cols.add(`${x >> 4},${y >> 4}`);
            if (x < x0 || y < y0 || x >= x0 + S || y >= y0 + S) return;
            whole[idx(x, y, z)] = plantOver(whole[idx(x, y, z)], id);
          });
          if (cols.size > 1) straddling++;
        }
      }
      expect(trees, `seed ${seed}`).toBeGreaterThan(10);
      expect(straddling, `seed ${seed}`).toBeGreaterThan(3); // the test must cross borders to mean anything
      expect(sha(streamed), `seed ${seed}`).toBe(sha(whole));
    }
  }, 60_000);

  it("root on dry, level grass or sand, never in water, on rock or on a slope", () => {
    const seen = new Set();
    let n = 0;
    for (const seed of [7, 42]) {
      const gen = v2(seed);
      for (let j = -150; j < 150; j += 3) for (let i = -150; i < 150; i += 3) {
        const tr = treeAtCell(gen, i, j);
        if (!tr) continue;
        n++;
        const t = surfaceHeight(gen, tr.x, tr.y);
        expect(tr.z).toBe(t + 1);
        expect(t).toBeGreaterThanOrEqual(SEA - 1);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) expect(Math.abs(surfaceHeight(gen, tr.x + dx, tr.y + dy) - t)).toBeLessThanOrEqual(1);
        const col = generateColumn(gen, tr.x >> 4, tr.y >> 4), cap = col[(t << 8) | ((tr.y & 15) << 4) | (tr.x & 15)];
        expect([GRASS, SAND]).toContain(cap);
        if (tr.species === SPECIES.PALM || tr.species === SPECIES.SHRUB) expect(cap).toBe(SAND); else expect(cap).toBe(GRASS);
        expect(tr.z + treeTop(tr.species, tr.h)).toBeLessThanOrEqual(47);
        seen.add(tr.species);
      }
    }
    expect(n).toBeGreaterThan(200);
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  }, 60_000);

  it("grow by biome: broadleaf in plains and hills, pines up high, palms on beaches, shrubs on sand flats", () => {
    const by = { plains: [0, 0], hills: [0, 0], highlands: [0, 0] };
    const species = Object.fromEntries(SPECIES_NAMES.map((s) => [s, {}]));
    const gen = v2(99);
    for (let j = -600; j < 600; j += 2) for (let i = -600; i < 600; i += 2) {
      const tr = treeAtCell(gen, i, j);
      const b = biomeAt(gen, i * 4 + 2, j * 4 + 2).biome;
      if (by[b]) { by[b][0]++; if (tr) by[b][1]++; }
      if (!tr) continue;
      const rb = biomeAt(gen, tr.x, tr.y).biome, name = SPECIES_NAMES[tr.species];
      species[name][rb] = (species[name][rb] || 0) + 1;
    }
    const d = (k) => by[k][1] / by[k][0];
    // Hills and highlands are wooded, plains more open.
    expect(d("hills")).toBeGreaterThan(d("plains") * 1.5);
    expect(d("highlands")).toBeGreaterThan(d("plains"));
    const share = (name, biomes) => {
      const all = Object.values(species[name]).reduce((a, b) => a + b, 0);
      return biomes.reduce((a, b) => a + (species[name][b] || 0), 0) / all;
    };
    expect(share("broadleaf", ["plains", "hills"])).toBeGreaterThan(0.9);
    expect(share("pine", ["highlands", "hills"])).toBeGreaterThan(0.9);
    expect(share("shrub", ["sands"])).toBeGreaterThan(0.8);
  }, 60_000);
});
