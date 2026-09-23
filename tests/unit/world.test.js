import { describe, it, expect } from "vitest";
import { World } from "../../src/world/world.js";
import { BLOCKS, AIR, BEDROCK, isSolid, isOpaque, LAYER_TO_BLOCKS, FACE } from "../../src/world/blocks.js";

describe("blocks", () => {
  it("has stable ids and the fourteen playable blocks, bedrock, three stations and water", () => {
    expect(BLOCKS.length).toBe(20);
    BLOCKS.forEach((b, i) => expect(b.id).toBe(i));
    expect(BLOCKS.map((b) => b.name)).toEqual([
      "Air", "Stone", "Tech", "Metal", "Energy", "Door", "Secret", "Boss", "Glass", "Rift",
      "Dirt", "Grass", "Sand", "Rock", "Ore", "Bedrock",
      "Workbench", "Anvil", "Forge", "Water",
    ]);
    expect(AIR).toBe(0); expect(BEDROCK).toBe(15);
    expect(isSolid(AIR)).toBe(false); expect(isSolid(8)).toBe(true);
    expect(isOpaque(8)).toBe(false); expect(isOpaque(1)).toBe(true);
    expect(isSolid(16)).toBe(true); expect(isOpaque(16)).toBe(true);
    expect(LAYER_TO_BLOCKS).toEqual([0, 1, 1, 2, 2, 3]);
    expect(FACE).toEqual({ TOP: 0, SIDE: 1, BOTTOM: 2 });
  });

  it("gives each station a distinct top face so it reads from above", () => {
    for (const id of [16, 17, 18]) {
      expect(BLOCKS[id].faces.top).not.toBe(BLOCKS[id].faces.side);
      expect(BLOCKS[id].hardness).toBeGreaterThan(0);
      expect(Number.isFinite(BLOCKS[id].hardness)).toBe(true);
    }
  });
});

describe("World", () => {
  it("indexes columns z-major and clamps out-of-bounds reads", () => {
    const w = new World();
    w.set(17, 34, 3, 5);
    expect(w.column(1, 2).blocks[(3 * 16 + 2) * 16 + 1]).toBe(5);
    expect(w.get(0, 0, -1)).toBe(BEDROCK);
    expect(w.get(0, 0, 64)).toBe(AIR);
    expect(w.get(-1, 0, 10)).toBe(AIR);
    expect(w.get(128, 5, 10)).toBe(AIR);
  });

  it("set returns whether the block changed and refuses out-of-bounds", () => {
    const w = new World();
    expect(w.set(5, 5, 32, 1)).toBe(true);
    expect(w.set(5, 5, 32, 1)).toBe(false);
    expect(w.get(5, 5, 32)).toBe(1);
    expect(w.set(-1, 5, 32, 1)).toBe(false);
    expect(w.set(5, 5, 64, 1)).toBe(false);
  });

  it("setBlock dirties the neighbour chunk on a face", () => {
    const w = new World();
    w.takeDirty();
    w.set(16, 5, 33, 1); // x=16 is the first column of chunk cx=1, touching cx=0 (z=33 stays clear of the cz boundary)
    expect(w.takeDirty().sort()).toEqual([w.chunkIndex(0, 0, 2), w.chunkIndex(1, 0, 2)].sort());
    w.set(20, 20, 47, 1); // z=47 is the last row of cz=2, touching cz=3
    expect(w.takeDirty().sort()).toEqual([w.chunkIndex(1, 1, 2), w.chunkIndex(1, 1, 3)].sort());
    expect(w.takeDirty()).toEqual([]);
  });

  it("a fresh world is all dirty so the first mesh pass builds everything", () => {
    expect(new World().takeDirty().length).toBe(256);
  });

  it("topSolid finds the highest solid block in a column", () => {
    const w = new World();
    expect(w.topSolid(3, 3)).toBe(-1);
    w.set(3, 3, 10, 1); w.set(3, 3, 12, 8);
    expect(w.topSolid(3, 3)).toBe(12);
  });
});
