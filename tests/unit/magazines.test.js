/**
 * Magazines: a gun fires from rounds loaded out of its per-gun reserve, an
 * empty trigger reloads, a switch cancels the reload, and an active-reload
 * hit's magazine hits harder until it is spent.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { Player } from "../../js/entities.js";
import { WEAPONS } from "../../src/data/weapons.js";
import { fireWeapon } from "../../src/systems/combat-orchestrator.js";
import { reloadPress, updateReloads, isReloading } from "../../src/systems/reload.js";
import { BOOST } from "../../src/systems/active-reload.js";
import { createConditioning, SKILLS } from "../../src/systems/conditioning.js";
import { awardConditioning, updateConditioning, noteConditioningKill } from "../../src/systems/conditioning-play.js";

const byName = (name) => WEAPONS.find((w) => w.name === name);
const shotgun = byName("Temporal Shotgun");
const pistol = byName("Chrono Pistol");
const cannon = byName("Quantum Cannon");

/** A game around a real Player holding `ids`, with projectiles going nowhere. */
function makeGame(ids = [0, 1]) {
  const player = new Player(2.5, 2.5, 0);
  player.weapons = ids;
  player.currentWeapon = ids.length - 1;
  const fired = [];
  const game = {
    time: 1000, mode: "campaign", player, settings: { fov: 70 }, canvas: { height: 720 },
    audio: new Proxy({}, { get: () => () => {} }),
    achievementStats: { totalShotsFired: 0 }, shotsFired: 0,
    projectiles: fired, entities: [], screenShake: 0, map: { width: 1, height: 1, grid: [[1]] },
    conditioning: createConditioning(),
    _spawnMuzzleFlash: () => {}, getCharacterColor: () => ({}),
  };
  return game;
}

/** Fire once, past the gun's cooldown. */
function shoot(game) {
  game.time += 5000;
  fireWeapon(game);
}

afterEach(() => vi.restoreAllMocks());

describe("magazines", () => {
  it("a fresh trigger pull mid-reload is the active-reload press; a held trigger is not", () => {
    const g = makeGame([0, 1]);
    shoot(g);
    expect(reloadPress(g)).toBe(true); // R starts the reload
    const a = g.activeReload.active;
    g.player.isFiring = true; // held from before: no press
    g.activeReload.fireWas = true;
    g.time = a.start + a.duration * ((a.zoneStart + a.zoneEnd) / 2);
    updateReloads(g);
    expect(g.activeReload.active?.pressed).toBeFalsy();
    g.player.isFiring = false;
    updateReloads(g);
    g.player.isFiring = true; // a new pull, in the zone
    updateReloads(g);
    expect(isReloading(g)).toBe(false);
    expect(g.activeReload.stats.hits).toBe(1);
    expect(g.player.loaded).toBe(shotgun.magSize);
  });


  it("a gun comes loaded out of what it carries, and the HUD reads loaded/rest", () => {
    const p = new Player();
    p.weapons = [0, 1];
    p.currentWeapon = 1;
    expect(p.loaded).toBe(shotgun.magSize);
    expect(p.ammo).toBe(shotgun.startAmmo);
    expect(p.ammoLabel).toBe(`${shotgun.magSize}/${shotgun.startAmmo - shotgun.magSize}`);
  });

  it("a shot spends from the magazine and the reserve; the sidearm's reserve never drops", () => {
    const g = makeGame([0, 1]);
    shoot(g);
    expect(g.player.loaded).toBe(shotgun.magSize - 1);
    expect(g.player.ammo).toBe(shotgun.startAmmo - 1);
    g.player.currentWeapon = 0;
    shoot(g);
    expect(g.player.loaded).toBe(pistol.magSize - 1);
    expect(g.player.ammoLabel).toBe(`${pistol.magSize - 1}/∞`);
  });

  it("an empty magazine reloads on the trigger, and fires again once it is in", () => {
    const g = makeGame([0, 1]);
    for (let i = 0; i < shotgun.magSize; i++) shoot(g);
    expect(g.player.loaded).toBe(0);
    shoot(g); // the dry trigger starts the reload
    expect(isReloading(g)).toBe(true);
    expect(g.player.loaded).toBe(0);
    const shots = g.shotsFired;
    g.time += 10;
    fireWeapon(g);
    expect(g.shotsFired).toBe(shots); // no round mid-reload
    g.time += shotgun.reloadMs;
    updateReloads(g);
    expect(isReloading(g)).toBe(false);
    expect(g.player.loaded).toBe(shotgun.magSize);
    expect(g.player.ammo).toBe(shotgun.startAmmo - shotgun.magSize);
  });

  it("a reload never loads more than the gun carries", () => {
    const g = makeGame([0, 3]);
    g.player.reserves[cannon.id] = 7; // one shot loaded, two rounds over
    g.player.mags[cannon.id] = 5;
    shoot(g);
    expect(g.player.loaded).toBe(0);
    expect(reloadPress(g)).toBe(true);
    g.time += cannon.reloadMs + 1;
    updateReloads(g);
    expect(g.player.loaded).toBe(2);
    // Two rounds are not a five-round shot: the dry fallback to the sidearm.
    shoot(g);
    expect(g.player.weapons[g.player.currentWeapon]).toBe(0);
  });

  it("R with a full magazine does nothing", () => {
    const g = makeGame([0, 1]);
    expect(reloadPress(g)).toBe(false);
    expect(isReloading(g)).toBe(false);
  });

  it("a weapon switch cancels the reload and leaves the magazine as it was", () => {
    const g = makeGame([0, 1]);
    shoot(g);
    reloadPress(g);
    expect(isReloading(g)).toBe(true);
    g.player.currentWeapon = 0;
    updateReloads(g);
    g.player.currentWeapon = 1;
    g.time += 10000;
    updateReloads(g);
    expect(g.player.loaded).toBe(shotgun.magSize - 1);
    expect(g.activeReload.stats.cancels).toBe(1);
  });

  it("an active-reload hit loads at once and the magazine does +15% until spent", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const ricochet = byName("Ricochet Pistol");
    const g = makeGame([0, ricochet.id]);
    shoot(g);
    expect(g.projectiles.at(-1).damage).toBeCloseTo(ricochet.damage);
    reloadPress(g);
    const a = g.activeReload.active;
    g.time = a.start + a.duration * ((a.zoneStart + a.zoneEnd) / 2);
    const heard = [];
    g.onActiveReload = (outcome, id) => heard.push([outcome, id]);
    expect(reloadPress(g)).toBe(true);
    expect(heard).toEqual([["hit", ricochet.id]]);
    expect(g.player.loaded).toBe(ricochet.magSize);
    // The boost rides on every round of this magazine…
    for (let i = 0; i < ricochet.magSize; i++) {
      shoot(g);
      expect(g.projectiles.at(-1).damage).toBeCloseTo(ricochet.damage * BOOST);
    }
    // …and goes with its last one: the next magazine is ordinary.
    expect(g.activeReload.boosted[ricochet.id]).toBeUndefined();
    shoot(g);
    g.time += ricochet.reloadMs + 1;
    updateReloads(g);
    shoot(g);
    expect(g.projectiles.at(-1).damage).toBeCloseTo(ricochet.damage);
  });

  it("a hit is Reload XP, more for a perfect", () => {
    const g = makeGame([0, 1]);
    shoot(g);
    reloadPress(g);
    const a = g.activeReload.active;
    g.time = a.start + a.duration * a.zoneStart + 1;
    reloadPress(g);
    expect(g.activeReload.last.outcome).toBe("perfect");
    expect(g.conditioning.reload).toBe(2);
  });

  it("a jam makes the reload longer", () => {
    const g = makeGame([0, 1]);
    shoot(g);
    reloadPress(g);
    const start = g.activeReload.active.start;
    g.time = start + 10;
    reloadPress(g);
    expect(g.activeReload.last.outcome).toBe("jam");
    g.time = start + shotgun.reloadMs + 1;
    updateReloads(g);
    expect(isReloading(g)).toBe(true);
    g.time += 700;
    updateReloads(g);
    expect(g.player.loaded).toBe(shotgun.magSize);
  });
});

describe("conditioning in play", () => {
  it("counts tiles sprinted as Stamina XP and puts the bonus on the player", () => {
    const g = makeGame();
    const p = g.player;
    updateConditioning(g);
    p.isSprinting = true;
    for (let i = 0; i < 400; i++) {
      p.x += 0.5;
      updateConditioning(g);
    }
    expect(g.conditioning.stamina).toBeCloseTo(200);
    expect(p.condStaminaBonus).toBe(5);
    expect(p.staminaCap).toBe(p.maxStamina + 5);
    expect(p.condRegenMult).toBeCloseTo(1.1);
    expect(g.conditioningChip).toMatchObject({ skill: "stamina", level: 1 });
  });

  it("a teleport is not a sprint", () => {
    const g = makeGame();
    updateConditioning(g);
    g.player.isSprinting = true;
    g.player.x += 30;
    updateConditioning(g);
    expect(g.conditioning.stamina).toBe(0);
  });

  it("aimed kills and headshot kills are Steadiness XP; hip body kills are not", () => {
    const g = makeGame();
    noteConditioningKill(g, false);
    expect(g.conditioning.steadiness).toBe(0);
    noteConditioningKill(g, true);
    expect(g.conditioning.steadiness).toBe(1);
    g.player.isAiming = true;
    noteConditioningKill(g, true);
    expect(g.conditioning.steadiness).toBe(3);
  });

  it("the Forge's play test and the Meltdown train nothing", () => {
    const g = makeGame();
    g.mode = "meltdown";
    awardConditioning(g, "reload", SKILLS.reload.xp[4]);
    expect(g.conditioning.reload).toBe(0);
  });
});
