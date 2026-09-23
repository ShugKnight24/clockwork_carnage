import { describe, it, expect } from "vitest";
import { VoxelAISystem } from "../../src/systems/voxel-ai.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { ENEMY_TYPES } from "../../src/data/enemies.js";
import { WATER, isWater } from "../../src/world/blocks.js";

const mkEnemy = (type, x, y, z) => ({ type: "enemy", enemyType: type, def: ENEMY_TYPES[type], active: true, x, y, z, vz: 0, state: "chase", stateTime: 1, painTimer: 0, lastAttackTime: -1e9, alertRange: 40, health: 50 });
const ctx = (world, entities, player) => ({ world, map: null, entities, player, time: 1000, fx: { spawnPointLight() {}, spawnHitImpact() {} }, audio: { playEnemyAttack() {} }, settings: {}, damagePlayer() {}, spawnProjectile() {} });
const WALKER = Object.keys(ENEMY_TYPES).find((k) => !ENEMY_TYPES[k].flying && ENEMY_TYPES[k].speed > 0);
const FLYER = Object.keys(ENEMY_TYPES).find((k) => ENEMY_TYPES[k].flying && ENEMY_TYPES[k].speed > 0);

/**
 * A flat world (ground top z = 32) with a pool across x = 24..31, y 0..30:
 * water to the brim at z = 28..31 over a stone floor at 27; a puddle one
 * block deep (y 40..50); and a lower pool (y 70..90) whose water stops two
 * blocks down.
 */
function pools() {
  const w = generateWorld({ terrain: false });
  for (let y = 0; y < 31; y++) for (let x = 24; x < 32; x++) for (let z = 27; z < 32; z++) w.set(x, y, z, z === 27 ? 1 : WATER);
  for (let y = 40; y < 51; y++) for (let x = 24; x < 32; x++) w.set(x, y, 31, WATER);
  for (let y = 70; y < 90; y++) for (let x = 24; x < 32; x++) for (let z = 27; z < 32; z++) w.set(x, y, z, z === 27 ? 1 : z < 30 ? WATER : 0);
  return w;
}

function chase(w, e, player, seconds) {
  const ai = new VoxelAISystem();
  const c = ctx(w, [e], player);
  let wet = false;
  for (let i = 0; i < seconds * 60; i++) {
    c.time += 16;
    ai.update(c, 1 / 60);
    wet ||= isWater(w.get(Math.floor(e.x), Math.floor(e.y), Math.floor(e.z)));
  }
  return wet;
}

describe("play-test walkers keep out of water", () => {
  it("stops at the edge of a pool between it and the player", () => {
    const w = pools();
    const e = mkEnemy(WALKER, 18.5, 20.5, 32);
    const wet = chase(w, e, { x: 36.5, y: 20.5, z: 32, health: 100 }, 6);
    expect(wet).toBe(false);
    expect(e.x).toBeGreaterThan(22.5);
    expect(e.x).toBeLessThanOrEqual(24);
  });

  it("does not drop off a bank into water below it", () => {
    const w = pools();
    const e = mkEnemy(WALKER, 18.5, 80.5, 32);
    const wet = chase(w, e, { x: 36.5, y: 80.5, z: 32, health: 100 }, 6);
    expect(wet).toBe(false);
    expect(e.z).toBe(32);
  });

  it("one already in the water still walks out toward the player", () => {
    const w = pools();
    const e = mkEnemy(WALKER, 30.5, 45.5, 31);
    chase(w, e, { x: 40.5, y: 45.5, z: 32, health: 100 }, 8);
    expect(e.x).toBeGreaterThan(32);
  });

  it("a flyer crosses the water", () => {
    const w = pools();
    const e = mkEnemy(FLYER, 18.5, 20.5, 35);
    chase(w, e, { x: 40.5, y: 20.5, z: 32, health: 100 }, 8);
    expect(e.x).toBeGreaterThan(30);
  });
});
