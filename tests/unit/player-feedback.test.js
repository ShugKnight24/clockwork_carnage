import { describe, it, expect, vi, afterEach } from "vitest";
import {
  LOW_HEALTH_AT,
  lowHealthSeverity,
  heartbeatInterval,
  muffleCutoff,
  heartPulse,
  lowHealthVignetteAlpha,
  streakNotes,
  damageCueWeight,
  noteDamageCue,
  activeDamageCues,
  DAMAGE_CUE_MS,
} from "../../src/systems/player-feedback.js";
import { damagePlayer, damageEnemy, onEnemyKill, fireWeapon } from "../../src/systems/combat-orchestrator.js";
import { updateProjectiles } from "../../src/systems/projectile-update.js";
import { zoneAimHeight } from "../../src/systems/combat.js";
import { exitIsOpen } from "../../src/systems/exit-cells.js";
import { WEAPONS } from "../../src/data/weapons.js";
import { Enemy } from "../../js/entities.js";

afterEach(() => vi.restoreAllMocks());

describe("low-health state", () => {
  it("switches on below 30% health and climbs to 1 at empty", () => {
    expect(LOW_HEALTH_AT).toBe(0.3);
    expect(lowHealthSeverity(100, 100)).toBe(0);
    expect(lowHealthSeverity(30, 100)).toBe(0);
    expect(lowHealthSeverity(29, 100)).toBeGreaterThan(0);
    expect(lowHealthSeverity(15, 100)).toBeCloseTo(0.5);
    expect(lowHealthSeverity(1, 100)).toBeGreaterThan(0.95);
    // Dead is not "low".
    expect(lowHealthSeverity(0, 100)).toBe(0);
    expect(lowHealthSeverity(-5, 100)).toBe(0);
  });

  it("beats the heart faster and muffles harder as health drops", () => {
    expect(heartbeatInterval(0)).toBeGreaterThan(heartbeatInterval(0.5));
    expect(heartbeatInterval(0.5)).toBeGreaterThan(heartbeatInterval(1));
    expect(heartbeatInterval(1)).toBeGreaterThanOrEqual(0.4);
    expect(muffleCutoff(0)).toBe(20000);
    // The muffle is plainly there the moment the state starts...
    expect(muffleCutoff(0.01)).toBeLessThan(5000);
    // ...and keeps closing in.
    expect(muffleCutoff(1)).toBeLessThan(muffleCutoff(0.5));
    expect(muffleCutoff(1)).toBeGreaterThanOrEqual(500);
  });

  it("shows a vignette that is clearly visible from 30% down, not only near death", () => {
    const at29 = lowHealthSeverity(29, 100);
    // The old vignette was severity * pulse * 0.35: ~0 at the threshold.
    expect(lowHealthVignetteAlpha(at29, 0)).toBeGreaterThan(0.2);
    expect(lowHealthVignetteAlpha(1, 1)).toBeGreaterThan(lowHealthVignetteAlpha(at29, 1));
    expect(lowHealthVignetteAlpha(0, 1)).toBe(0);
  });

  it("pulses the vignette once per heartbeat", () => {
    const period = heartbeatInterval(0.5) * 1000;
    expect(heartPulse(0, 0.5)).toBeCloseTo(1);
    expect(heartPulse(period * 0.5, 0.5)).toBeLessThan(0.2);
    expect(heartPulse(period, 0.5)).toBeCloseTo(1);
  });
});

describe("kill-streak sting", () => {
  it("adds a note and climbs with each tier", () => {
    const tiers = [1, 2, 3, 4, 5, 6].map(streakNotes);
    for (let i = 1; i < tiers.length; i++) expect(tiers[i][0]).toBeGreaterThan(tiers[i - 1][0]);
    expect(tiers[0].length).toBe(2);
    expect(tiers[3].length).toBeGreaterThan(tiers[0].length);
  });

  it("plays the streak sting, not the level-complete jingle", () => {
    const calls = [];
    const game = {
      killStreakSystem: { onKill: () => ({ tier: 2, chronoBonus: 0, screenShake: 0, glitchEffect: 0, playAudio: true, ariaCategory: null }) },
      archive: null,
      mode: "arena",
      entities: [],
      player: { chronoEnergy: 0, maxChronoEnergy: 100, weapons: [], currentWeapon: 0 },
      audio: { streakSting: (t) => calls.push(["sting", t]), roundComplete: () => calls.push(["jingle"]) },
      queueAriaMessage: () => {},
      triggerAriaOnce: () => {},
      achievementStats: {},
      totalEnemies: 10,
      killedEnemies: 1,
    };
    onEnemyKill(game, null);
    expect(calls).toEqual([["sting", 2]]);
  });
});

describe("damage direction cues", () => {
  const player = (angle = 0) => ({ x: 10, y: 10, angle, maxHealth: 100 });

  it("points at the attacker relative to the view: ahead 0, right positive, behind ±π", () => {
    const p = player(0);
    noteDamageCue(p, 15, 10, 10, 1000); // straight ahead (+x)
    expect(activeDamageCues(p, 1000)[0].rel).toBeCloseTo(0);
    const q = player(0);
    noteDamageCue(q, 10, 15, 10, 1000); // +y: to the right as this view turns
    expect(activeDamageCues(q, 1000)[0].rel).toBeCloseTo(Math.PI / 2);
    const r = player(0);
    noteDamageCue(r, 5, 10, 10, 1000); // behind
    expect(Math.abs(activeDamageCues(r, 1000)[0].rel)).toBeCloseTo(Math.PI);
  });

  it("follows the view as the player turns", () => {
    const p = player(0);
    noteDamageCue(p, 15, 10, 10, 1000);
    p.angle = Math.PI / 2;
    expect(activeDamageCues(p, 1100)[0].rel).toBeCloseTo(-Math.PI / 2);
  });

  it("fades out over about a second", () => {
    const p = player();
    noteDamageCue(p, 5, 10, 10, 1000);
    const early = activeDamageCues(p, 1050)[0].alpha;
    const late = activeDamageCues(p, 1900)[0].alpha;
    expect(late).toBeLessThan(early);
    expect(activeDamageCues(p, 1000 + DAMAGE_CUE_MS)).toEqual([]);
  });

  it("draws a big hit stronger than a graze", () => {
    expect(damageCueWeight(30, 100)).toBe(1);
    expect(damageCueWeight(2, 100)).toBeLessThan(0.5);
    const p = player();
    noteDamageCue(p, 5, 10, 2, 1000);
    noteDamageCue(p, 15, 10, 40, 1000);
    const [graze, big] = activeDamageCues(p, 1100);
    expect(big.weight).toBeGreaterThan(graze.weight);
    expect(big.alpha).toBeGreaterThan(graze.alpha);
  });

  it("keeps one cue per side, and several sides at once", () => {
    const p = player();
    noteDamageCue(p, 15, 10, 5, 1000);
    noteDamageCue(p, 15, 10.5, 5, 1200); // same side again: refreshed
    noteDamageCue(p, 5, 10, 5, 1300); // another side
    expect(activeDamageCues(p, 1300)).toHaveLength(2);
  });

  it("is fed by damagePlayer with the attacker's position", () => {
    const game = {
      time: 5000,
      mode: "campaign",
      player: { x: 10, y: 10, angle: 0, alive: true, health: 100, maxHealth: 100, _phaseUntil: 0, thorns: 0 },
      audio: { playerHit: () => {} },
      settings: {},
      screenShake: 0,
      roundDamageTaken: 0,
      triggerAriaOnce: () => {},
    };
    damagePlayer(game, 20, { x: 10, y: 3 }); // from -y: the left
    const cues = activeDamageCues(game.player, 5100);
    expect(cues).toHaveLength(1);
    expect(cues[0].rel).toBeCloseTo(-Math.PI / 2);
    // A hit with no source shows no (stale) direction.
    damagePlayer(game, 5);
    expect(game.player.lastDamageAngle).toBeNull();
  });
});

describe("shield-blocked hits", () => {
  const fakeGame = () => {
    const sounds = [];
    return {
      sounds,
      time: 1000,
      shotsHit: 0,
      achievementStats: { totalShotsHit: 0 },
      player: { x: 0, y: 0, angle: 0, critChance: 0 },
      audio: {
        calculatePan: () => 0,
        enemyHit: () => sounds.push("enemyHit"),
        hitConfirm: () => sounds.push("hitConfirm"),
        shieldBlock: () => sounds.push("shieldBlock"),
        headshotConfirm: () => sounds.push("headshot"),
      },
      glitchEffect: 0,
      damageNumbers: [],
      queueAriaMessage: () => {},
      _spawnHitImpact: () => {},
    };
  };
  // Faces the player (at the origin) from +x, its plate toward them.
  const commander = () => ({ x: 4, y: 0, angle: Math.PI, health: 500, maxHealth: 500, def: { frontShield: true, color1: "#fff" } });

  it("pings and shows the deflect marker instead of the hit ding", () => {
    const g = fakeGame();
    damageEnemy(g, commander(), 15, { name: "body", mult: 1 });
    expect(g.sounds).toEqual(["shieldBlock"]);
    expect(g.hitMarkerBlocked).toBe(true);
    expect(g.hitMarker).toBeGreaterThan(0);
  });

  it("still dings a hit from behind", () => {
    const g = fakeGame();
    const e = commander();
    e.angle = 0; // turned away
    damageEnemy(g, e, 15, { name: "body", mult: 1 });
    expect(g.sounds).toContain("hitConfirm");
    expect(g.hitMarkerBlocked).toBe(false);
  });
});

describe("exit marker", () => {
  it("reads open for an ungated exit and shut while sealed", () => {
    expect(exitIsOpen({ type: "exit", active: true })).toBe(true);
    expect(exitIsOpen({ type: "exit", active: true, sealed: true })).toBe(false);
    expect(exitIsOpen({ type: "exit", active: true, sealed: false })).toBe(true);
    expect(exitIsOpen(null)).toBe(false);
  });
});

describe("projectile pistols", () => {
  /** An open 30x5 hall. */
  const hall = () => ({
    width: 30,
    height: 5,
    grid: Array.from({ length: 5 }, (_, y) => Array.from({ length: 30 }, (_, x) => (x === 0 || y === 0 || x === 29 || y === 4 ? 1 : 0))),
  });

  function shootAt(weaponName, dist) {
    vi.spyOn(Math, "random").mockReturnValue(0); // no scatter
    const wep = WEAPONS.find((w) => w.name === weaponName);
    const target = new Enemy(2.5 + dist, 2.5, "glitchling");
    target.health = target.maxHealth = 1e6;
    const player = {
      x: 2.5, y: 2.5, angle: 0, aimOffsetX: 0, aimOffsetY: 0, pitch: 0,
      weapons: [wep.id], currentWeapon: 0, ammo: 99, lastFireTime: -1e9,
      damageMultiplier: 1, fireRateMultiplier: 1, cameraPunch: 0,
      getWeaponDef: () => wep,
    };
    // Centre the reticle on the target's body, as a player would.
    player.aimOffsetY = -zoneAimHeight(target, "body", true) / dist;
    const game = {
      time: 1000, mode: "campaign", player, settings: { fov: 70 }, canvas: { height: 720 },
      audio: { shootRicochet: () => {}, shootEMP: () => {} }, achievementStats: { totalShotsFired: 0 }, shotsFired: 0,
      projectiles: [], entities: [target], screenShake: 0,
      _spawnMuzzleFlash: () => {}, getCharacterColor: () => ({}),
    };
    fireWeapon(game);
    const proj = game.projectiles[0];
    let hitAt = null;
    const map = hall();
    const ctx = {
      projectiles: game.projectiles,
      entities: game.entities,
      entityGrid: { query: () => [target] },
      map,
      player,
      time: 1000,
      audio: { calculatePan: () => 0, enemyHit: () => {} },
      spawnWallSparks: () => {},
      damageEnemy: () => { hitAt ??= t; },
      damagePlayer: () => {},
    };
    let t = 0;
    for (; t < 2 && hitAt == null && proj.active; t += 1 / 60) updateProjectiles(ctx, 1 / 60);
    return { proj, hitAt };
  }

  for (const name of ["Ricochet Pistol", "EMP Launcher"]) {
    it(`${name} hits a centred stationary target, quickly`, () => {
      for (const dist of [3, 8, 14]) {
        const { proj, hitAt } = shootAt(name, dist);
        expect(proj.speed, name).toBeGreaterThan(12);
        expect(hitAt, `${name} at ${dist} m`).not.toBeNull();
        // Under ~0.7 s even at 14 m (it was 1.2 s at 12 u/s).
        expect(hitAt, `${name} at ${dist} m`).toBeLessThan(0.7);
      }
    });
  }
});
