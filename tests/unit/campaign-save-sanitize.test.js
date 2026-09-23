import { describe, it, expect } from "vitest";
import { sanitizeCampaignSave } from "../../src/core/save-system.js";

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
  aimOffsetX: 0, aimOffsetY: 0,
  weapons: [0, 2], currentWeapon: 1,
  health: 80,
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

  it("clamps aim offsets into range", () => {
    const out = sanitizeCampaignSave({ ...good, aimOffsetX: -25, aimOffsetY: 40 }, level);
    expect(Math.abs(out.aimOffsetX)).toBeLessThanOrEqual(0.18);
    expect(Math.abs(out.aimOffsetY)).toBeLessThanOrEqual(0.3);
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
});
