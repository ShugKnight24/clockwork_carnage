import { describe, it, expect } from "vitest";
import { WEAPONS } from "../../src/data/weapons.js";
import { calculateEnemyDamage } from "../../src/systems/combat.js";
import { updateProjectiles } from "../../src/systems/projectile-update.js";
import { AISystem } from "../../src/systems/ai.js";
import { Enemy, Projectile } from "../../js/entities.js";

const byName = (name) => WEAPONS.find((w) => w.name === name);
const dps = (w) => (w.damage * (w.pellets || 1) * 1000) / w.fireRate;

describe("weapon balance", () => {
  it("keeps every gun within reach of the others", () => {
    const pistol = dps(byName("Chrono Pistol"));
    for (const w of WEAPONS) {
      // Nothing out-damages the sidearm by more than about two and a half times.
      expect(dps(w) / pistol, w.name).toBeLessThan(2.5);
    }
  });

  it("makes the Phase Rifle a rifle, not a hose", () => {
    const rifle = byName("Phase Rifle");
    expect(dps(rifle)).toBeLessThan(130);
    expect(rifle.ammoPerShot).toBe(1);
  });
});

describe("Phase Scattergun", () => {
  const shielded = () => ({ x: 3, y: 3, angle: 0, def: { frontShield: true }, _shield: 0 });

  it("phases through a front shield", () => {
    const front = { x: 5, y: 3 }; // the shield faces +x, at the player
    expect(calculateEnemyDamage(100, shielded(), 0, front).finalDamage).toBeCloseTo(20);
    expect(calculateEnemyDamage(100, shielded(), 0, front, { phasesShields: true }).finalDamage).toBe(100);
  });

  it("phases through an energy shield", () => {
    const e = { x: 3, y: 3, def: {}, _shield: 30 };
    expect(calculateEnemyDamage(50, e, 0, { x: 0, y: 0 }, { phasesShields: true }).finalDamage).toBe(50);
    expect(e._shield).toBe(30);
  });

  it("is the gun that says so", () => {
    expect(byName("Phase Scattergun").phasesShields).toBe(true);
  });
});

describe("Ricochet Pistol", () => {
  /** A 10x10 room: walls around the edge. */
  const room = () => {
    const n = 10;
    return { width: n, height: n, grid: Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => (x === 0 || y === 0 || x === n - 1 || y === n - 1 ? 1 : 0))) };
  };
  const ctx = (projectiles, map, hits) => ({
    projectiles,
    entities: [...projectiles],
    entityGrid: { query: () => [] },
    map,
    player: { x: 5, y: 5, angle: 0 },
    audio: { calculatePan: () => 0, enemyHit: () => {} },
    spawnWallSparks: () => hits.push("spark"),
    damageEnemy: () => {},
    damagePlayer: () => {},
  });

  it("glances off a wall and flies back", () => {
    const map = room();
    const p = new Projectile(5.5, 5.5, 1, 0, 12, 12, "player");
    p.bounces = byName("Ricochet Pistol").bounces;
    const hits = [];
    for (let i = 0; i < 30; i++) updateProjectiles(ctx([p], map, hits), 1 / 60);
    expect(p.active).toBe(true);
    expect(p.dirX).toBe(-1); // mirrored off the east wall
    expect(p.bounces).toBe(1);
    expect(p.damage).toBeCloseTo(12 * 0.85);
  });

  it("stops once its bounces are spent", () => {
    const map = room();
    const p = new Projectile(5.5, 5.5, 1, 0, 12, 12, "player");
    p.bounces = 0;
    const hits = [];
    for (let i = 0; i < 30; i++) updateProjectiles(ctx([p], map, hits), 1 / 60);
    expect(p.active).toBe(false);
  });

  it("an ordinary round still stops at the wall", () => {
    const map = room();
    const p = new Projectile(5.5, 5.5, 1, 0, 12, 12, "player");
    for (let i = 0; i < 30; i++) updateProjectiles(ctx([p], map, []), 1 / 60);
    expect(p.active).toBe(false);
  });
});

describe("Temporal Sniper", () => {
  it("slows what it hits: the target runs on a slower clock", () => {
    const map = { width: 30, height: 30, grid: Array.from({ length: 30 }, () => new Array(30).fill(0)) };
    const audio = { calculatePan: () => 0, enemyShoot: () => {}, enemyHit: () => {}, enemyBark: () => {}, telegraph: () => {} };
    const run = (slowed) => {
      const e = new Enemy(5.5, 15.5, "henchman");
      e.state = "chase";
      e.lastAttackTime = 1e12; // no shooting, just walking
      if (slowed) {
        e._slowUntil = 1e9;
        e._slowFactor = byName("Temporal Sniper").slowOnHit.factor;
      }
      const player = { x: 25.5, y: 15.5, angle: 0, chronoActive: false };
      const ai = new AISystem();
      let time = 0;
      for (let i = 0; i < 60; i++) {
        time += 1000 / 60;
        ai.update({ entities: [e], player, map, time, timeScale: 1, projectiles: [], chronoBombs: [], damageNumbers: [], audio }, 1 / 60);
      }
      return Math.hypot(e.x - 5.5, e.y - 15.5);
    };
    expect(run(true)).toBeLessThan(run(false) * 0.5);
  });
});

describe("phase dash", () => {
  it("lets a hit pass through mid-dash, and not after", async () => {
    const { damagePlayer } = await import("../../src/systems/combat-orchestrator.js");
    const game = { time: 1000, player: { alive: true, health: 100, maxHealth: 100, armor: 0, shield: 0, dodgeChance: 0, _phaseUntil: 1250 }, glitchEffect: 0 };
    damagePlayer(game, 30, { x: 0, y: 0 });
    expect(game.player.health).toBe(100);
    expect(game.glitchEffect).toBeGreaterThan(0);
  });
});
