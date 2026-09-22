import { describe, it, expect } from "vitest";
import { VoxelAISystem } from "../../src/systems/voxel-ai.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { ENEMY_TYPES } from "../../src/data/enemies.js";

const mkEnemy = (type, x, y, z) => ({ type: "enemy", enemyType: type, def: ENEMY_TYPES[type], active: true, x, y, z, vz: 0, state: "chase", stateTime: 1, painTimer: 0, lastAttackTime: -1e9, alertRange: 20, health: 50 });
const ctx = (world, entities, player) => ({ world, map: null, entities, player, time: 1000, fx: { spawnPointLight() {}, spawnHitImpact() {} }, audio: { playEnemyAttack() {} }, settings: {}, damagePlayer() {}, spawnProjectile() {} });

describe("VoxelAISystem", () => {
  it("walker on a ledge falls to the ground", () => {
    const w = generateWorld({ terrain: false });
    const e = mkEnemy(Object.keys(ENEMY_TYPES).find((k) => !ENEMY_TYPES[k].flying), 20.5, 20.5, 40);
    const ai = new VoxelAISystem();
    const c = ctx(w, [e], { x: 60, y: 60, z: 32, health: 100 });
    for (let i = 0; i < 120; i++) ai.update(c, 1 / 60);
    expect(e.z).toBe(32);
  });

  it("walker chases along the ground and jumps a one-block step", () => {
    const w = generateWorld({ terrain: false });
    for (let y = 18; y < 23; y++) w.set(23, y, 32, 1); // one-block wall across its path
    const e = mkEnemy(Object.keys(ENEMY_TYPES).find((k) => !ENEMY_TYPES[k].flying), 20.5, 20.5, 32);
    const ai = new VoxelAISystem();
    const c = ctx(w, [e], { x: 30.5, y: 20.5, z: 32, health: 100 });
    for (let i = 0; i < 300; i++) { c.time += 16; ai.update(c, 1 / 60); }
    expect(e.x).toBeGreaterThan(23.5);
  });

  it("flyer holds altitude and closes distance", () => {
    const w = generateWorld({ terrain: false });
    const type = Object.keys(ENEMY_TYPES).find((k) => ENEMY_TYPES[k].flying);
    const e = mkEnemy(type, 20.5, 20.5, 36);
    const ai = new VoxelAISystem();
    const c = ctx(w, [e], { x: 40.5, y: 20.5, z: 32, health: 100 });
    for (let i = 0; i < 120; i++) { c.time += 16; ai.update(c, 1 / 60); }
    expect(e.x).toBeGreaterThan(21); expect(Math.abs(e.z - 36)).toBeLessThan(0.6);
  });
});
