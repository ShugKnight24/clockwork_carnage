import { describe, it, expect } from "vitest";
import { World } from "../../src/world/world.js";
import { GEN_VERSION } from "../../src/world/column-gen.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { moveAABB, aabbOverlapsSolid, raycastBlocks, PLAYER } from "../../src/world/voxel-physics.js";
import { updateProjectiles } from "../../src/systems/projectile-update.js";
import { VoxelAISystem } from "../../src/systems/voxel-ai.js";
import { spawnFromMeta } from "../../src/systems/voxel-glue.js";
import { stationsInRange } from "../../src/rpg/stations.js";
import { ENEMY_TYPES } from "../../src/data/enemies.js";
import { Projectile } from "../../js/entities.js";

const FLAT = Object.freeze({ kind: "flat", v: GEN_VERSION });
/** A flat endless world, ground top at z = 31, with the 3 × 3 columns around (8, 8) loaded: x and y in -16..32. */
function flat() {
  const w = new World({ gen: FLAT, endless: true });
  w.loadAround(8, 8, 1);
  return w;
}
const body = (x, y, z) => ({ x, y, z, half: PLAYER.half, height: PLAYER.height });
const B = World.BORDER;

describe("physics next to unloaded columns", () => {
  it("stops a walking body at the edge of what is loaded", () => {
    const w = flat();
    const r = moveAABB(w, body(30.5, 8.5, 32), 5, 0, 0);
    expect(r.x).toBeCloseTo(32 - PLAYER.half, 3);
    expect(r.hitX).toBe(true);
    const back = moveAABB(w, body(-14.5, 8.5, 32), -5, 0, 0);
    expect(back.x).toBeCloseTo(-16 + PLAYER.half, 3);
  });

  it("does not let a body fall into an unloaded column", () => {
    const w = flat();
    // Standing over a column that is not there yet: it holds, as over ground.
    const r = moveAABB(w, body(40.5, 8.5, 50), 0, 0, -10);
    expect(r.z).toBe(50);
    expect(r.hitZ).toBe(true);
    expect(aabbOverlapsSolid(w, 40.5, 8.5, 50, PLAYER.half, PLAYER.height)).toBe(true);
  });

  it("lets rays through, as air", () => {
    const w = flat();
    // Aimed from above the loaded ground out over the unloaded east.
    expect(raycastBlocks(w, 30.5, 8.5, 40, 1, 0, 0, 6)).toBe(null);
  });

  it("clamps at the border of an endless world", () => {
    const w = new World({ gen: FLAT, endless: true });
    w.loadAround(B - 8, 8, 1);
    const r = moveAABB(w, body(B - 1, 8.5, 32), 5, 0, 0);
    expect(r.x).toBeCloseTo(B - PLAYER.half, 6);
    expect(r.hitX).toBe(true);
  });

  it("leaves bounded worlds' edges as they were", () => {
    const w = generateWorld({ terrain: false });
    const r = moveAABB(w, body(126.5, 64.5, 32), 5, 0, 0);
    expect(r.x).toBe(128 - PLAYER.half);
    expect(r.hitX).toBe(true);
  });
});

describe("bolts", () => {
  const ctx = (world, projectiles, sparks) => ({
    world, map: null, projectiles, entities: [], entityGrid: { query: () => [] },
    player: { x: 0, y: 0, z: 32, angle: 0 }, time: 1000, lights: [],
    audio: { calculatePan: () => 0, enemyHit() {} },
    spawnWallSparks: (x, y, z) => sparks.push({ x, y, z }),
    damageEnemy() {}, damagePlayer() {},
  });

  it("die entering an unloaded column, without a spark on a wall that is not there", () => {
    const w = flat();
    const p = new Projectile(28.5, 8.5, 1, 0, 10, 12, "player");
    p.z = 40; p.dirZ = 0;
    const sparks = [];
    const c = ctx(w, [p], sparks);
    for (let i = 0; i < 60 && p.active; i++) updateProjectiles(c, 1 / 60);
    expect(p.active).toBe(false);
    expect(p.x).toBeGreaterThanOrEqual(32);
    expect(p.x).toBeLessThan(33);
    expect(sparks).toHaveLength(0);
  });
});

describe("enemies in unloaded columns", () => {
  it("are frozen until their column loads", () => {
    const w = flat();
    const type = Object.keys(ENEMY_TYPES).find((k) => !ENEMY_TYPES[k].flying);
    const e = { type: "enemy", enemyType: type, def: ENEMY_TYPES[type], active: true, x: 60.5, y: 8.5, z: 40, vz: 0, state: "chase", stateTime: 1, painTimer: 0, lastAttackTime: -1e9, alertRange: 200, health: 50 };
    const ai = new VoxelAISystem();
    const c = { world: w, map: null, entities: [e], player: { x: 20.5, y: 8.5, z: 32, health: 100 }, time: 1000, fx: {}, audio: { playEnemyAttack() {} }, settings: {}, damagePlayer() {}, spawnProjectile() {} };
    for (let i = 0; i < 60; i++) ai.update(c, 1 / 60);
    expect([e.x, e.y, e.z]).toEqual([60.5, 8.5, 40]);
    w.loadAround(60.5, 8.5, 1);
    for (let i = 0; i < 60; i++) ai.update(c, 1 / 60);
    expect(e.z).toBe(32); // it fell to the ground once there was ground
  });
});

describe("spawn in an endless world", () => {
  it("loads the columns around the spawn and stands on the surface", () => {
    const w = generateWorld({ terrain: true, seed: 5, endless: true });
    expect(w.columns.size).toBe(0);
    const s = spawnFromMeta(w);
    expect(s).not.toBe(null);
    expect(w.isLoaded(Math.floor(s.x), Math.floor(s.y))).toBe(true);
    expect(w.topSolid(Math.floor(s.x), Math.floor(s.y)) + 1).toBe(s.z);
  });

  it("finds a marker far from spawn once its columns load", () => {
    const w = generateWorld({ terrain: false, endless: true });
    w.meta.spawn = { x: -900_000.5, y: 400_000.5, z: 32, yaw: 1 };
    const s = spawnFromMeta(w);
    expect(s).toEqual({ x: -900_000.5, y: 400_000.5, z: 32, yaw: 1 });
  });
});

describe("stations", () => {
  it("are found across a column border at negative coordinates", () => {
    const w = new World({ gen: FLAT, endless: true });
    w.loadAround(-16, -16, 1);
    w.set(-17, -16, 32, 16); // workbench, one column west of the player's
    w.set(-15, -18, 33, 17); // anvil, one column south
    const found = stationsInRange(w, { x: -15.5, y: -15.5, z: 32 });
    expect([...found].sort()).toEqual(["anvil", "workbench"]);
  });
});
