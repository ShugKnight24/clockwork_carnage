import { describe, it, expect } from "vitest";
import { generateWorld, randomSeed } from "../../src/world/world-gen.js";
import { generateColumn, GEN_VERSION } from "../../src/world/column-gen.js";
import { encodeWorld, decodeWorld } from "../../src/world/world-codec.js";
import { AIR, BEDROCK } from "../../src/world/blocks.js";

/** Every resident cell, in column order. */
const cells = (w) => Buffer.concat([...w.columns.values()].map((c) => Buffer.from(c.blocks)));

describe("generateWorld", () => {
  it("flat: grass at 31, dirt below, rock deeper, bedrock at 0, air from 32 up", () => {
    const w = generateWorld({ terrain: false });
    expect(w.get(10, 10, 31)).toBe(11);
    expect(w.get(10, 10, 30)).toBe(10);
    expect(w.get(10, 10, 20)).toBe(13);
    expect(w.get(10, 10, 0)).toBe(BEDROCK);
    expect(w.get(10, 10, 32)).toBe(AIR);
    expect(w.meta.spawn).toEqual({ x: 64.5, y: 64.5, z: 32, yaw: 0 });
    // ore veins are a terrain:true feature; a flat world is bedrock/rock/dirt/grass only
    expect(cells(w).includes(14)).toBe(false);
  });

  it("terrain: deterministic per seed, surface stays within 20..47, has ore", () => {
    const a = generateWorld({ terrain: true, seed: 7 });
    const b = generateWorld({ terrain: true, seed: 7 });
    expect(cells(a).equals(cells(b))).toBe(true);
    let ore = 0, lo = 99, hi = -1;
    const { x0, y0, x1, y1 } = a.bounds;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const t = a.topSolid(x, y); lo = Math.min(lo, t); hi = Math.max(hi, t);
      for (let z = 0; z <= t; z++) if (a.get(x, y, z) === 14) ore++;
    }
    expect(lo).toBeGreaterThanOrEqual(20); expect(hi).toBeLessThanOrEqual(47);
    expect(ore).toBeGreaterThan(50);
    const s = a.meta.spawn;
    expect(a.get(Math.floor(s.x), Math.floor(s.y), s.z)).toBe(AIR);
    expect(s.z).toBe(a.topSolid(Math.floor(s.x), Math.floor(s.y)) + 1);
  });

  it("stores its generator settings and is made of generateColumn's columns", () => {
    const w = generateWorld({ terrain: true, seed: 2 ** 32 + 99 });
    expect(w.meta.gen).toEqual({ kind: "terrain", seed: 99, v: GEN_VERSION });
    for (const col of w.columns.values()) {
      expect(Buffer.from(col.blocks).equals(Buffer.from(generateColumn(w.meta.gen, col.cx, col.cy)))).toBe(true);
    }
    expect(generateWorld({ terrain: false, seed: 5 }).meta.gen).toEqual({ kind: "flat", seed: 5, v: GEN_VERSION });
  });

  it("regenerates the same terrain from its saved meta alone", () => {
    const w = generateWorld({ terrain: true, seed: 4321 });
    const back = decodeWorld(JSON.parse(JSON.stringify(encodeWorld(w))));
    expect(back.meta.gen).toEqual(w.meta.gen);
    const again = generateWorld({ terrain: back.meta.gen.kind === "terrain", seed: back.meta.gen.seed });
    expect(cells(again).equals(cells(w))).toBe(true);
  });

  it("spawns on level ground inside the box for many seeds", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const w = generateWorld({ terrain: true, seed: seed * 104729 });
      const s = w.meta.spawn, bx = Math.floor(s.x), by = Math.floor(s.y), t = w.topSolid(bx, by);
      expect(w.inBounds(bx, by, s.z)).toBe(true);
      expect(s.z).toBe(t + 1);
      expect(s.yaw).toBe(0);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        expect(Math.abs(w.topSolid(bx + dx, by + dy) - t)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("randomSeed is an unsigned 32-bit integer", () => {
    for (let i = 0; i < 20; i++) {
      const s = randomSeed();
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0); expect(s).toBeLessThan(2 ** 32);
    }
  });

  it("bumps world.version and marks every chunk dirty", () => {
    const w = generateWorld({ terrain: false });
    expect(w.version).toBeGreaterThan(0);
    expect(w.takeDirty().length).toBe(256);
  });
});
