import { describe, it, expect } from "vitest";
import { generateWorld } from "../../src/world/world-gen.js";
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

  it("terrain: deterministic per seed, surface stays within 26..38, has ore", () => {
    const a = generateWorld({ terrain: true, seed: 7 });
    const b = generateWorld({ terrain: true, seed: 7 });
    expect(cells(a).equals(cells(b))).toBe(true);
    let ore = 0, lo = 99, hi = -1;
    const { x0, y0, x1, y1 } = a.bounds;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const t = a.topSolid(x, y); lo = Math.min(lo, t); hi = Math.max(hi, t);
      for (let z = 0; z <= t; z++) if (a.get(x, y, z) === 14) ore++;
    }
    expect(lo).toBeGreaterThanOrEqual(26); expect(hi).toBeLessThanOrEqual(38);
    expect(ore).toBeGreaterThan(50);
    expect(a.get(64, 64, a.topSolid(64, 64) + 1)).toBe(AIR);
    expect(a.meta.spawn.z).toBe(a.topSolid(64, 64) + 1);
  });

  it("bumps world.version and marks every chunk dirty", () => {
    const w = generateWorld({ terrain: false });
    expect(w.version).toBeGreaterThan(0);
    expect(w.takeDirty().length).toBe(256);
  });
});
