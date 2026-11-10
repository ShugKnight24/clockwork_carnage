import { describe, it, expect } from "vitest";
import { sanitizeCampaignSave, levelContentHash } from "../../src/core/save-system.js";

// 4×3 level: a ring of walls around two open cells.
const level = {
  width: 4,
  height: 3,
  grid: [
    [1, 1, 1, 1],
    [1, 0, 0, 1],
    [1, 1, 1, 1],
  ],
};
const good = {
  level: 0,
  playerX: 1.5, playerY: 1.5, playerAngle: 0,
  weapons: [0, 2], currentWeapon: 1,
  health: 80,
  contentHash: levelContentHash(level),
  mapGrid: level.grid,
  entityStates: [{ type: "enemy", x: 2.5, y: 1.5, health: 10, state: "idle", active: true }],
};

describe("sanitizeCampaignSave", () => {
  it("keeps a save that still fits the level", () => {
    expect(sanitizeCampaignSave(good, level)).toEqual(good);
  });

  it("drops a position that is now inside a wall", () => {
    const out = sanitizeCampaignSave({ ...good, playerX: 0.5 }, level);
    expect(out.playerX).toBeUndefined();
    expect(out.playerAngle).toBeUndefined();
  });

  it("drops a position JSON stored as null", () => {
    const out = sanitizeCampaignSave({ ...good, playerX: null, playerY: null }, level);
    expect(out.playerX).toBeUndefined();
  });

  it("drops a grid of another size and the entity states that went with it", () => {
    const out = sanitizeCampaignSave({ ...good, mapGrid: [[0, 0], [0, 0]] }, level);
    expect(out.mapGrid).toBeUndefined();
    expect(out.entityStates).toBeUndefined();
  });

  it("drops the free-aim reticle offsets an older save carried", () => {
    const out = sanitizeCampaignSave({ ...good, aimOffsetX: 0.15, aimOffsetY: -25 }, level);
    expect(out).not.toHaveProperty("aimOffsetX");
    expect(out).not.toHaveProperty("aimOffsetY");
  });

  it("keeps the selected gun when unknown weapons are dropped", () => {
    const out = sanitizeCampaignSave({ ...good, weapons: [99, 0, 2], currentWeapon: 2 }, level);
    expect(out.weapons).toEqual([0, 2]);
    expect(out.currentWeapon).toBe(1);
  });

  it("drops a dead or non-number health", () => {
    expect(sanitizeCampaignSave({ ...good, health: 0 }, level).health).toBeUndefined();
    expect(sanitizeCampaignSave({ ...good, health: null }, level).health).toBeUndefined();
  });

  it("drops an enemy position inside a wall but keeps its state", () => {
    const out = sanitizeCampaignSave(
      { ...good, entityStates: [{ type: "enemy", x: 0.5, y: 0.5, health: 5, state: "chase", active: true }] },
      level,
    );
    expect(out.entityStates[0]).toEqual({ type: "enemy", health: 5, state: "chase", active: true });
  });

  describe("a save made on another layout of the level", () => {
    const moved = { ...level, grid: [[1, 1, 1, 1], [1, 0, 1, 1], [1, 1, 1, 1]] };

    it("keeps progress but starts the level fresh", () => {
      const out = sanitizeCampaignSave(good, moved);
      expect(out.staleLayout).toBe(true);
      for (const k of ["mapGrid", "entityStates", "killedEnemies", "playerX", "playerY", "playerAngle"]) expect(out[k], k).toBeUndefined();
      expect(out.weapons).toEqual([0, 2]);
      expect(out.health).toBe(80);
      expect(out.level).toBe(0);
    });

    it("treats a save from before the hash as another layout", () => {
      const { contentHash: _h, ...old } = good;
      const out = sanitizeCampaignSave(old, level);
      expect(out.staleLayout).toBe(true);
      expect(out.mapGrid).toBeUndefined();
    });
  });
});

describe("levelContentHash", () => {
  it("is stable for equal levels and changes with the layout", () => {
    expect(levelContentHash(structuredClone(level))).toBe(levelContentHash(level));
    const moved = structuredClone(level);
    moved.grid[1][2] = 1;
    expect(levelContentHash(moved)).not.toBe(levelContentHash(level));
  });
});
