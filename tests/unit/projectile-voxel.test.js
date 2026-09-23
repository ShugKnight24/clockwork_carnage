import { describe, it, expect } from "vitest";
import { updateProjectiles } from "../../src/systems/projectile-update.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { World } from "../../src/world/world.js";
import { Projectile } from "../../js/entities.js";

/** Flat world: blocks fill z < 32, so a body stands with its feet at z = 32. */
const FLOOR = 32;

/**
 * A bolt leaving (x, y, z) on `pitch`, carrying the same fields the game gives
 * one: a unit horizontal heading plus the vertical part of a unit 3D heading.
 */
function bolt(x, y, z, pitch = 0, opts = {}) {
  const yaw = opts.yaw ?? 0;
  const p = new Projectile(x, y, Math.cos(yaw), Math.sin(yaw), 10, opts.speed ?? 12, opts.owner ?? "player");
  p.z = z;
  p.pitch = pitch;
  p.dirZ = Math.sin(pitch);
  return p;
}

function makeCtx(world, projectiles, entities = [], player = { x: 0, y: 0, z: FLOOR, angle: 0 }) {
  const sparks = [];
  const hits = [];
  const playerHits = [];
  return {
    ctx: {
      world,
      map: null,
      projectiles,
      entities,
      entityGrid: { query: () => entities },
      player,
      time: 1000,
      lights: [],
      audio: { calculatePan: () => 0, enemyHit() {} },
      spawnWallSparks: (x, y, z) => sparks.push({ x, y, z }),
      damageEnemy: (e, d) => hits.push({ e, d }),
      damagePlayer: (d) => playerHits.push(d),
    },
    sparks,
    hits,
    playerHits,
  };
}

/** Run frames until every projectile is spent, or `frames` have gone by. */
function fly(ctx, projectiles, frames = 240) {
  for (let i = 0; i < frames && projectiles.some((p) => p.active); i++) {
    updateProjectiles(ctx, 1 / 60);
  }
}

const mkEnemy = (x, y, z) => ({
  type: "enemy", enemyType: "drone", active: true, state: "chase",
  x, y, z, health: 50,
  def: { radius: 0.3, hitCenter: 0.35, hitHeight: 0.55, color1: "#ff0000" },
});

describe("projectiles in a voxel world", () => {
  it("a level shot dies on the wall block it flies into", () => {
    const world = generateWorld({ terrain: false });
    for (let z = FLOOR; z < FLOOR + 4; z++) world.set(24, 20, z, 1);
    const p = bolt(20.5, 20.5, FLOOR + 1.5);
    const { ctx, sparks } = makeCtx(world, [p]);
    fly(ctx, [p]);

    expect(p.active).toBe(false);
    expect(sparks).toHaveLength(1);
    // Stopped inside the wall's column at the height it set out at.
    expect(Math.floor(sparks[0].x)).toBe(24);
    expect(sparks[0].z).toBeCloseTo(FLOOR + 1.5, 5);
  });

  it("a shot aimed down stops at the ground instead of flying on", () => {
    const world = generateWorld({ terrain: false });
    const p = bolt(20.5, 20.5, FLOOR + 3, -Math.PI / 4);
    const { ctx, sparks } = makeCtx(world, [p]);
    fly(ctx, [p]);

    expect(p.active).toBe(false);
    expect(sparks).toHaveLength(1);
    expect(sparks[0].z).toBeLessThan(FLOOR);
    expect(sparks[0].z).toBeGreaterThan(FLOOR - 0.5);
    // At 45° it travelled out as far as it fell, give or take the sub-step
    // that carried it into the ground.
    expect(sparks[0].x - 20.5).toBeGreaterThan(2.9);
    expect(sparks[0].x - 20.5).toBeLessThan(3.3);
  });

  it("a shot aimed at the sky leaves the world and stops existing", () => {
    const world = generateWorld({ terrain: false });
    const p = bolt(20.5, 20.5, FLOOR + 1.5, Math.PI / 2 - 0.001);
    const projectiles = [p];
    const { ctx, sparks } = makeCtx(world, projectiles);
    fly(ctx, projectiles);

    expect(p.active).toBe(false);
    expect(p.z).toBeGreaterThanOrEqual(World.H);
    expect(sparks).toHaveLength(0); // it left, it did not hit anything
    expect(projectiles).toHaveLength(0);
  });

  it("hits a drone inside its z band and passes a drone below it", () => {
    const world = generateWorld({ terrain: false });
    const level = mkEnemy(26.5, 20.5, FLOOR + 1.15); // hit centre at FLOOR + 1.5
    const shot = bolt(20.5, 20.5, FLOOR + 1.5);
    const hit = makeCtx(world, [shot], [level]);
    fly(hit.ctx, [shot]);
    expect(hit.hits).toHaveLength(1);
    expect(hit.hits[0].e).toBe(level);

    const low = mkEnemy(26.5, 20.5, FLOOR - 2);
    const over = bolt(20.5, 20.5, FLOOR + 1.5);
    const miss = makeCtx(world, [over], [low]);
    fly(miss.ctx, [over]);
    expect(miss.hits).toHaveLength(0);
  });

  it("an enemy bolt only damages the player once it reaches their height", () => {
    const world = generateWorld({ terrain: false });
    const player = { x: 26.5, y: 20.5, z: FLOOR, angle: 0 };

    const chest = bolt(20.5, 20.5, FLOOR + 0.85, 0, { owner: "enemy" });
    const onTarget = makeCtx(world, [chest], [], player);
    fly(onTarget.ctx, [chest]);
    expect(onTarget.playerHits).toHaveLength(1);

    const high = bolt(20.5, 20.5, FLOOR + 3, 0, { owner: "enemy" });
    const overhead = makeCtx(world, [high], [], player);
    fly(overhead.ctx, [high]);
    expect(overhead.playerHits).toHaveLength(0);
  });

  it("a splash on a one-block roof spares the walker beneath it", () => {
    const world = generateWorld({ terrain: false });
    // A roof exactly one block thick, at z = 33.
    for (let x = 24; x <= 32; x++) for (let y = 19; y <= 22; y++) world.set(x, y, 33, 1);

    const beside = mkEnemy(29.0, 20.5, 34);   // on the roof, where the bolt goes off
    const below = mkEnemy(29.0, 20.5, FLOOR); // on the ground directly under it
    // A heavy round (over the splash threshold) skimming the roof.
    const p = bolt(25.5, 20.5, 34.0, 0, { speed: 12 });
    p.damage = 80;
    const { ctx, hits } = makeCtx(world, [p], [beside, below]);
    fly(ctx, [p]);

    expect(p.active).toBe(false);
    // The walker's hit centre is 1.65 blocks under the blast — well inside the
    // 2-block sphere, so only the roof between them can spare it. Check that
    // before checking it went unhurt, or the roof proves nothing.
    const centre = FLOOR + below.def.hitCenter;
    expect(Math.hypot(p.x - below.x, p.y - below.y, p.z - centre)).toBeLessThan(2);
    const hurt = hits.map((h) => h.e);
    expect(hurt).toContain(beside);
    expect(hurt).not.toContain(below);
  });

  it("a flat bullet with no dirZ keeps the speed it was given", () => {
    const world = generateWorld({ terrain: false });
    const p = bolt(20.5, 20.5, FLOOR + 1.5);
    const { ctx } = makeCtx(world, [p]);
    updateProjectiles(ctx, 1 / 60);
    expect(p.x - 20.5).toBeCloseTo(12 / 60, 6);
    expect(p.z).toBeCloseTo(FLOOR + 1.5, 6);
  });
});

describe("projectiles in a world bounded away from the origin", () => {
  it("die at the world's own edge, not at zero", () => {
    const w = new World({ bounds: { x0: -64, y0: -64, x1: -32, y1: -32 } });
    const p = bolt(-40.5, -48.5, 40, 0, { yaw: 0, speed: 20 });
    const { ctx } = makeCtx(w, [p], [], { x: -60, y: -60, z: 1, angle: 0 });
    let steps = 0;
    while (p.active && steps++ < 200) updateProjectiles(ctx, 1 / 60);
    expect(p.active).toBe(false);
    expect(p.x).toBeGreaterThanOrEqual(-32);
    expect(p.x).toBeLessThan(-30);

    const q = bolt(-33.5, -48.5, 40, 0, { yaw: Math.PI, speed: 20 }); // west, deeper into the bounds
    const { ctx: ctx2 } = makeCtx(w, [q], [], { x: -60, y: -60, z: 1, angle: 0 });
    updateProjectiles(ctx2, 1 / 60);
    expect(q.active).toBe(true); // negative x inside the bounds is not "outside"
  });
});
