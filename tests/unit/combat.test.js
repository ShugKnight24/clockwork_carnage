import { describe, it, expect } from "vitest";
import {
  calculateEnemyDamage,
  applySplashDamage,
  markEnemyDead,
  calculatePlayerDamage,
  isBossEnemy,
  aimHitsTargetHeight,
  distanceToWall,
  enemyHitRadius,
  pickHitscanTarget,
  rayEnemyHit,
  voxelShotReach,
} from "../../src/systems/combat.js";
import { aimAngles } from "../../src/systems/aim.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { PLAYER } from "../../src/world/voxel-physics.js";

// ── Helpers ──────────────────────────────────────────────

const makeEnemy = (overrides = {}) => ({
  x: 5, y: 5, angle: 0,
  health: 100, maxHealth: 100,
  state: "chase", active: true,
  type: "enemy", enemyType: "drone",
  hitTime: 0, dissolving: false, dissolveTimer: 0, deathTime: 0,
  def: { frontShield: false, ...overrides.def },
  _shield: 0,
  ...overrides,
});

const makePlayer = (overrides = {}) => ({
  x: 3, y: 3,
  armor: 0, shield: 0, dodgeChance: 0,
  ...overrides,
});

// ── calculateEnemyDamage ─────────────────────────────────

describe("calculateEnemyDamage", () => {
  it("base damage with no crit, no shield", () => {
    const enemy = makeEnemy();
    const result = calculateEnemyDamage(25, enemy, 0, { x: 3, y: 3 });
    expect(result.finalDamage).toBe(25);
    expect(result.isCrit).toBe(false);
    expect(result.shieldSpark).toBe(false);
  });

  it("100% crit chance → double damage", () => {
    const enemy = makeEnemy();
    const result = calculateEnemyDamage(25, enemy, 1.0, { x: 3, y: 3 });
    expect(result.finalDamage).toBe(50);
    expect(result.isCrit).toBe(true);
  });

  it("front shield reduces damage from front", () => {
    // Enemy at (5,5) facing toward player at (5,3) — angle ~ -PI/2
    const enemy = makeEnemy({
      x: 5, y: 5,
      angle: -Math.PI / 2,
      def: { frontShield: true },
    });
    const result = calculateEnemyDamage(100, enemy, 0, { x: 5, y: 3 });
    // Should take 80% reduction → 20 damage
    expect(result.finalDamage).toBe(20);
  });

  it("energy shield absorbs damage", () => {
    const enemy = makeEnemy({ _shield: 30 });
    const result = calculateEnemyDamage(50, enemy, 0, { x: 3, y: 3 });
    expect(result.finalDamage).toBe(20); // 50 - 30 absorbed
    expect(result.shieldSpark).toBe(true);
    expect(enemy._shield).toBe(0);
  });

  it("energy shield fully absorbs small hit", () => {
    const enemy = makeEnemy({ _shield: 100 });
    const result = calculateEnemyDamage(30, enemy, 0, { x: 3, y: 3 });
    expect(result.finalDamage).toBe(0);
    expect(enemy._shield).toBe(70);
  });
});

// ── applySplashDamage ────────────────────────────────────

describe("applySplashDamage", () => {
  it("damages nearby enemies within splash radius", () => {
    const source = makeEnemy({ x: 5, y: 5 });
    const nearby = makeEnemy({ x: 6, y: 5, health: 100 });
    const entities = [source, nearby];

    const killed = applySplashDamage(entities, source, 30, 0.5, 1000);
    // Splash = 30 * 0.5 = 15, distance = 1 (within 2.5 radius)
    expect(nearby.health).toBe(85);
    expect(killed).toHaveLength(0);
  });

  it("kills enemy and returns in killed array", () => {
    const source = makeEnemy({ x: 5, y: 5 });
    const weak = makeEnemy({ x: 6, y: 5, health: 10 });
    const entities = [source, weak];

    const killed = applySplashDamage(entities, source, 100, 1.0, 1000);
    expect(killed).toHaveLength(1);
    expect(weak.state).toBe("dead");
    expect(weak.dissolving).toBe(true);
  });

  it("ignores enemies beyond splash radius", () => {
    const source = makeEnemy({ x: 5, y: 5 });
    const far = makeEnemy({ x: 10, y: 10, health: 100 });
    const entities = [source, far];

    applySplashDamage(entities, source, 100, 1.0, 1000);
    expect(far.health).toBe(100); // untouched
  });

  it("ignores dead/inactive enemies", () => {
    const source = makeEnemy({ x: 5, y: 5 });
    const dead = makeEnemy({ x: 6, y: 5, state: "dead", health: 50 });
    const inactive = makeEnemy({ x: 6, y: 6, active: false, health: 50 });
    const entities = [source, dead, inactive];

    applySplashDamage(entities, source, 100, 1.0, 1000);
    expect(dead.health).toBe(50);
    expect(inactive.health).toBe(50);
  });
});

// ── markEnemyDead ────────────────────────────────────────

describe("markEnemyDead", () => {
  it("sets dead state with dissolve", () => {
    const enemy = makeEnemy();
    markEnemyDead(enemy, 5000);
    expect(enemy.state).toBe("dead");
    expect(enemy.dissolving).toBe(true);
    expect(enemy.dissolveTimer).toBe(0.5);
    expect(enemy.deathTime).toBe(5000);
  });
});

// ── calculatePlayerDamage ────────────────────────────────

describe("calculatePlayerDamage", () => {
  it("full damage with no armor/shield", () => {
    const player = makePlayer();
    const result = calculatePlayerDamage(30, player);
    expect(result.actualDamage).toBe(30);
    expect(result.dodged).toBe(false);
    expect(result.shieldAbsorbed).toBe(0);
  });

  it("armor reduces damage", () => {
    const player = makePlayer({ armor: 10 });
    const result = calculatePlayerDamage(30, player);
    // max(1, 30 - 10*0.3) = max(1, 27) = 27
    expect(result.actualDamage).toBe(27);
  });

  it("minimum 1 damage with high armor", () => {
    const player = makePlayer({ armor: 1000 });
    const result = calculatePlayerDamage(5, player);
    expect(result.actualDamage).toBe(1);
  });

  it("shield absorbs damage", () => {
    const player = makePlayer({ shield: 20 });
    const result = calculatePlayerDamage(30, player);
    expect(result.shieldAbsorbed).toBe(20);
    expect(result.actualDamage).toBe(10);
    expect(player.shield).toBe(0);
  });

  it("shield fully absorbs small hit", () => {
    const player = makePlayer({ shield: 50 });
    const result = calculatePlayerDamage(20, player);
    expect(result.shieldAbsorbed).toBe(20);
    expect(result.actualDamage).toBe(0);
    expect(player.shield).toBe(30);
  });

  it("100% dodge → zero damage", () => {
    const player = makePlayer({ dodgeChance: 1.0 });
    const result = calculatePlayerDamage(100, player);
    expect(result.actualDamage).toBe(0);
    expect(result.dodged).toBe(true);
  });
});

// ── isBossEnemy ──────────────────────────────────────────

describe("isBossEnemy", () => {
  it("boss types → true", () => {
    expect(isBossEnemy({ enemyType: "boss" })).toBe(true);
    expect(isBossEnemy({ enemyType: "boss_form2" })).toBe(true);
    expect(isBossEnemy({ enemyType: "boss_form3" })).toBe(true);
  });

  it("non-boss types → false", () => {
    expect(isBossEnemy({ enemyType: "drone" })).toBe(false);
    expect(isBossEnemy({ enemyType: "phantom" })).toBe(false);
    expect(isBossEnemy({ enemyType: "sentinel" })).toBe(false);
  });
});

describe("aimHitsTargetHeight", () => {
  it("accepts aim inside default enemy hit volume", () => {
    expect(aimHitsTargetHeight(0.5, makeEnemy())).toBe(true);
  });

  it("rejects aim outside default enemy hit volume", () => {
    expect(aimHitsTargetHeight(1.4, makeEnemy())).toBe(false);
  });
});

describe("enemy hit geometry", () => {
  it("uses a forgiving visual hit radius for small enemies", () => {
    const enemy = makeEnemy({ def: { radius: 0.2 } });
    expect(enemyHitRadius(enemy)).toBeGreaterThan(enemy.def.radius);
  });

  it("hits an enemy whose tiny AI radius would have missed", () => {
    // Hit radius floor tracks visible sprite width, not the tiny AI body radius.
    const player = { x: 0, y: 0 };
    const enemy = makeEnemy({ x: 6, y: 0.48, def: { radius: 0.2 } });
    const hit = rayEnemyHit(player, 1, 0, 10, 0, enemy);
    expect(hit?.enemy).toBe(enemy);
  });

  it("hits small enemies at long range", () => {
    // Floor covers visible body edge; angular widen still helps at very long range.
    const player = { x: 0, y: 0 };
    const enemy = makeEnemy({ x: 35, y: 0.49, def: { radius: 0.2 } });
    expect(rayEnemyHit(player, 1, 0, 50, 0, enemy)?.enemy).toBe(enemy);
  });

  it("keeps distant reticle targets hittable despite tiny AI radius", () => {
    const player = { x: 0, y: 0 };
    const enemy = makeEnemy({ x: 80, y: 0.9, def: { radius: 0.2 } });
    expect(rayEnemyHit(player, 1, 0, 100, 0, enemy)?.enemy).toBe(enemy);
  });

  it("hits at oblique world angles", () => {
    const angle = Math.PI / 4;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const player = { x: 2, y: 2 };
    const enemy = makeEnemy({ x: 2 + dirX * 18 - dirY * 0.45, y: 2 + dirY * 18 + dirX * 0.45, def: { radius: 0.25 } });
    expect(rayEnemyHit(player, dirX, dirY, 30, 0, enemy)?.enemy).toBe(enemy);
  });

  it("rejects targets outside range or behind the player", () => {
    const player = { x: 0, y: 0 };
    expect(rayEnemyHit(player, 1, 0, 5, 0, makeEnemy({ x: 6, y: 0 }))).toBeNull();
    expect(rayEnemyHit(player, 1, 0, 10, 0, makeEnemy({ x: -1, y: 0 }))).toBeNull();
  });

  it("selects closest valid enemy before farther targets", () => {
    const player = { x: 0, y: 0 };
    const near = makeEnemy({ x: 6, y: 0.1 });
    const far = makeEnemy({ x: 12, y: 0.1 });
    const hit = pickHitscanTarget(player, 1, 0, 0, 20, [far, near], null);
    expect(hit?.enemy).toBe(near);
  });

  it("blocks targets behind walls", () => {
    const player = { x: 1.5, y: 1.5 };
    const map = {
      width: 8,
      height: 3,
      grid: [
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 1, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1],
      ],
    };
    const enemy = makeEnemy({ x: 5.5, y: 1.5 });
    expect(distanceToWall(player, 1, 0, map, 20)).toBeCloseTo(1.5);
    expect(pickHitscanTarget(player, 1, 0, 0, 20, [enemy], map)).toBeNull();
  });

  it("reticle yaw can target enemies away from camera center", () => {
    const player = { x: 0, y: 0, angle: 0, aimOffsetX: 0.14, aimOffsetY: 0 };
    const { yaw, pitch } = aimAngles(player, 70);
    const dist = 24;
    const enemy = makeEnemy({ x: Math.cos(yaw) * dist, y: Math.sin(yaw) * dist });
    const hit = rayEnemyHit(player, Math.cos(yaw), Math.sin(yaw), 40, pitch, enemy);
    expect(hit?.enemy).toBe(enemy);
  });

  it("reticle pitch accepts vertical aim at distance", () => {
    const player = { x: 0, y: 0, angle: 0, aimOffsetX: 0, aimOffsetY: -0.08 };
    const { yaw, pitch } = aimAngles(player, 70);
    const dist = 14;
    const enemy = makeEnemy({ x: dist, y: 0, def: { radius: 0.3, hitCenter: Math.tan(pitch) * dist, hitHeight: 0.2 } });
    const hit = rayEnemyHit(player, Math.cos(yaw), Math.sin(yaw), 30, pitch, enemy);
    expect(hit?.enemy).toBe(enemy);
  });
});

// ── 3D hitscan against a voxel world ─────────────────────

describe("hitscan in a voxel world", () => {
  /** Flat world: blocks fill z < 32, so a body stands with its feet at z = 32. */
  const FLOOR = 32;
  /** Feet at the floor, so the eye rides at 33.6 — over a one-block wall, under a two. */
  const shooter = () => ({ x: 20.5, y: 20.5, z: FLOOR });
  const eyeZ = FLOOR + PLAYER.eye;
  /** A drone hovering with its hit centre exactly on the level sight line. */
  const drone = (x) => makeEnemy({
    x, y: 20.5, z: eyeZ - 0.35,
    def: { radius: 0.3, hitCenter: 0.35, hitHeight: 0.55 },
  });
  const wall = (world, height) => {
    for (let y = 19; y <= 22; y++) {
      for (let z = FLOOR; z < FLOOR + height; z++) world.set(23, y, z, 1);
    }
  };
  /** What the shot reaches — the caller casts this once and hands it over. */
  const shoot = (world, pitch, entities) => pickHitscanTarget(
    shooter(), 1, 0, pitch, 30, entities, null,
    voxelShotReach(world, shooter(), 1, 0, pitch, 30),
  );

  it("a two-block wall stops the shot short of the drone behind it", () => {
    const world = generateWorld({ terrain: false });
    wall(world, 2);
    const reach = voxelShotReach(world, shooter(), 1, 0, 0, 30);
    expect(reach.blocked).toBe(true);
    expect(reach.dist).toBeCloseTo(2.5);
    expect(reach.z).toBeCloseTo(eyeZ);
    expect(shoot(world, 0, [drone(26.5)])).toBeNull();
  });

  it("a shot clears a one-block wall and hits the drone behind it", () => {
    const world = generateWorld({ terrain: false });
    wall(world, 1);
    expect(voxelShotReach(world, shooter(), 1, 0, 0, 30).blocked).toBe(false);
    const enemy = drone(26.5);
    expect(shoot(world, 0, [enemy])?.enemy).toBe(enemy);
  });

  it("a drone below the sight line is missed even with nothing in the way", () => {
    const world = generateWorld({ terrain: false });
    const enemy = drone(26.5);
    enemy.z -= 2;
    expect(shoot(world, 0, [enemy])).toBeNull();
  });

  it("aiming up clears the two-block wall a level shot died on", () => {
    const world = generateWorld({ terrain: false });
    wall(world, 2);
    const pitch = Math.atan2(3, 6); // 6 blocks out, 3 up
    const enemy = drone(26.5);
    enemy.z = eyeZ + 3 - 0.35;
    expect(shoot(world, pitch, [enemy])?.enemy).toBe(enemy);
  });
});
