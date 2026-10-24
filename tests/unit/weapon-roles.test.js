/**
 * weapon-roles.test.js — each gun has a job, and rounds are per gun.
 *
 *   Shotgun     tight and reaching: out-damages the Scattergun past ~6 m
 *   Scattergun  devastating close, spent past ~6 m, phases shields
 *   Ricochet    cheap rounds; banks hit harder and chain to a second enemy
 *   Sniper      scarce and slow; a headshot drops anything short of a boss,
 *               a body shot does not clear a room
 *   Ammo        each gun carries its own capped reserve; crates feed every
 *               gun a little; the sidearm never runs dry
 */
import { describe, it, expect } from "vitest";
import { WEAPONS } from "../../src/data/weapons.js";
import { falloffMult } from "../../src/systems/combat-orchestrator.js";
import { calculateEnemyDamage } from "../../src/systems/combat.js";
import { updateProjectiles } from "../../src/systems/projectile-update.js";
import { Player, Projectile } from "../../js/entities.js";
import { HEADSHOT_MULT } from "../../src/constants.js";
import { ENEMY_TYPES } from "../../src/data/enemies.js";

const byName = (name) => WEAPONS.find((w) => w.name === name);
const shotgun = byName("Temporal Shotgun");
const scatter = byName("Phase Scattergun");
const ricochet = byName("Ricochet Pistol");
const sniper = byName("Temporal Sniper");
const pistol = byName("Chrono Pistol");

/**
 * Expected damage per second against a body of radius `r` at `dist`: the
 * share of a uniform disc cone that lands (target's angular radius over the
 * cone's), times falloff.
 */
function effectiveDps(w, dist, r = 0.35) {
  const cone = Math.tan(w.spread) * dist;
  const landed = cone <= r ? 1 : (r / cone) ** 2;
  const reach = dist <= w.range ? 1 : 0;
  return ((w.damage * (w.pellets || 1) * landed * falloffMult(w, dist) * 1000) / w.fireRate) * reach;
}

describe("Shotgun vs Scattergun", () => {
  it("the Scattergun wins up close", () => {
    expect(effectiveDps(scatter, 1.5)).toBeGreaterThan(effectiveDps(shotgun, 1.5) * 1.3);
  });

  it("the Shotgun wins from about six metres out, and reaches twice as far", () => {
    for (const d of [6, 8, 12, 16]) expect(effectiveDps(shotgun, d), `${d} m`).toBeGreaterThan(effectiveDps(scatter, d) * 2);
    expect(shotgun.range).toBeGreaterThanOrEqual(2 * scatter.range);
    expect(effectiveDps(scatter, 6)).toBeLessThan(effectiveDps(scatter, 2) * 0.4);
  });

  it("only the Scattergun phases shields", () => {
    expect(scatter.phasesShields).toBe(true);
    expect(shotgun.phasesShields).toBeFalsy();
  });

  it("falloff is full inside its first distance and floors at its last", () => {
    expect(falloffMult(scatter, 2)).toBe(1);
    expect(falloffMult(scatter, 50)).toBeCloseTo(scatter.falloff[2]);
    expect(falloffMult(pistol, 50)).toBe(1);
  });
});

describe("Ricochet Pistol is never a downgrade", () => {
  it("out-damages the free pistol head on, and more off a wall", () => {
    const dps = (w) => (w.damage * 1000) / w.fireRate;
    expect(dps(ricochet)).toBeGreaterThan(dps(pistol));
    expect(ricochet.pickupAmmo).toBeGreaterThanOrEqual(30); // cheap: crates fill it fast
  });

  it("chains from the enemy it hits to the next one in sight", () => {
    const n = 12;
    const map = { width: n, height: n, grid: Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => (x === 0 || y === 0 || x === n - 1 || y === n - 1 ? 1 : 0))) };
    const enemy = (x, y) => ({ type: "enemy", active: true, state: "idle", x, y, def: { radius: 0.35, hitHeight: 0.4 } });
    const a = enemy(5, 3);
    const b = enemy(5, 7);
    const hits = [];
    const p = new Projectile(2, 3, 1, 0, ricochet.damage, 20, "player");
    p.bounces = ricochet.bounces;
    p.chains = true;
    const ctx = {
      projectiles: [p], entities: [p], map,
      entityGrid: { query: () => [a, b] },
      player: { x: 2, y: 3, angle: 0 },
      audio: { calculatePan: () => 0, enemyHit: () => {} },
      spawnWallSparks: () => {},
      damageEnemy: (e) => hits.push(e),
      damagePlayer: () => {},
    };
    for (let i = 0; i < 40 && hits.length < 2; i++) updateProjectiles(ctx, 1 / 60);
    expect(hits).toEqual([a, b]);
  });
});

describe("Temporal Sniper", () => {
  const hp = (type) => ENEMY_TYPES[type]?.health ?? 0;

  it("a headshot drops anything short of a boss; a body shot leaves the bigger ones up", () => {
    const head = sniper.damage * HEADSHOT_MULT * sniper.headshotMult;
    expect(head).toBeGreaterThanOrEqual(400);
    expect(sniper.damage).toBeLessThan(hp("sentinel"));
  });

  it("pierces shields and plate, but a boss's carapace still caps it", () => {
    expect(sniper.piercesArmor).toBe(true);
    const commander = { x: 5, y: 0, angle: Math.PI, def: { frontShield: true }, _shield: 120 };
    const head = sniper.damage * HEADSHOT_MULT * sniper.headshotMult;
    // Face on, through the front shield and the energy shield, untouched.
    expect(calculateEnemyDamage(sniper.damage, commander, 0, { x: 0, y: 0 }, { phasesShields: true }).finalDamage).toBe(sniper.damage);
    const shell = { x: 5, y: 0, def: { armor: { mul: 0.2, cap: 40 } } };
    expect(calculateEnemyDamage(head, shell, 0, { x: 0, y: 0 }, { phasesShields: true }).finalDamage).toBe(40);
  });

  it("is scarce and slow", () => {
    expect(sniper.maxAmmo).toBeLessThanOrEqual(10);
    expect(sniper.pickupAmmo).toBe(1);
    expect(sniper.fireRate).toBeGreaterThanOrEqual(1500);
  });
});

describe("rounds per gun", () => {
  it("a gun comes loaded with its startAmmo, and the HUD count is the held gun's", () => {
    const p = new Player();
    p.weapons = [0, 1, 5];
    p.currentWeapon = 1;
    expect(p.ammo).toBe(shotgun.startAmmo);
    p.currentWeapon = 2;
    expect(p.ammo).toBe(sniper.startAmmo);
    p.ammo -= 1;
    expect(p.reserveOf(5)).toBe(sniper.startAmmo - 1);
    expect(p.reserveOf(1)).toBe(shotgun.startAmmo);
  });

  it("a crate feeds every gun carried its own share, up to each cap", () => {
    const p = new Player();
    p.weapons = [0, 1, 5];
    p.addAmmoPacks(1);
    expect(p.reserveOf(1)).toBe(shotgun.startAmmo + shotgun.pickupAmmo);
    expect(p.reserveOf(5)).toBe(sniper.startAmmo + 1);
    p.addAmmoPacks(100);
    for (const id of [1, 5]) expect(p.reserveOf(id)).toBe(WEAPONS[id].maxAmmo);
  });

  it("every gun but the sidearm has a cap, a start and a crate share", () => {
    for (const w of WEAPONS) {
      if (w.infiniteAmmo) continue;
      expect(w.startAmmo, w.name).toBeGreaterThan(0);
      expect(w.startAmmo, w.name).toBeLessThanOrEqual(w.maxAmmo);
      expect(w.pickupAmmo, w.name).toBeGreaterThan(0);
      expect(w.maxAmmo, w.name).toBeLessThanOrEqual(240);
    }
  });

  it("the sidearm never runs dry and reads as endless", () => {
    const p = new Player();
    expect(pistol.infiniteAmmo).toBe(true);
    expect(p.ammoLabel).toBe(`${pistol.magSize}/∞`);
    p.weapons = [0, 1];
    p.currentWeapon = 1;
    expect(p.ammoLabel).toBe(`${shotgun.magSize}/${shotgun.startAmmo - shotgun.magSize}`);
  });

  it("LOW AMMO is a quarter of the held gun's cap, never the sidearm", () => {
    const p = new Player();
    expect(p.ammoLow).toBe(false);
    p.weapons = [0, 5];
    p.currentWeapon = 1;
    p.ammo = sniper.startAmmo;
    expect(p.ammoLow).toBe(false);
    p.ammo = 2;
    expect(p.ammoLow).toBe(true);
  });

  it("saves and restores each gun's rounds", () => {
    const p = new Player();
    p.weapons = [0, 2];
    p.currentWeapon = 1;
    p.ammo = 7;
    const q = new Player();
    q.deserialize(JSON.parse(JSON.stringify(p.serialize())));
    q.currentWeapon = 1;
    expect(q.ammo).toBe(7);
  });
});
