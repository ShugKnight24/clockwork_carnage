import { describe, it, expect } from "vitest";
import { generateWorld } from "../../src/world/world-gen.js";
import { World } from "../../src/world/world.js";
import { AIR, BEDROCK } from "../../src/world/blocks.js";

describe("generateWorld", () => {
  it("flat: grass at 31, dirt below, rock deeper, bedrock at 0, air from 32 up", () => {
    const w = generateWorld({ terrain: false });
    expect(w.get(10, 10, 31)).toBe(11);
    expect(w.get(10, 10, 30)).toBe(10);
    expect(w.get(10, 10, 20)).toBe(13);
    expect(w.get(10, 10, 0)).toBe(BEDROCK);
    expect(w.get(10, 10, 32)).toBe(AIR);
    expect(w.meta.spawn).toEqual({ x: 64.5, y: 64.5, z: 32, yaw: 0 });
  });

  it("terrain: deterministic per seed, surface stays within 26..38, has ore", () => {
    const a = generateWorld({ terrain: true, seed: 7 });
    const b = generateWorld({ terrain: true, seed: 7 });
    expect(Buffer.from(a.blocks).equals(Buffer.from(b.blocks))).toBe(true);
    let ore = 0, lo = 99, hi = -1;
    for (let y = 0; y < World.D; y++) for (let x = 0; x < World.W; x++) {
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
