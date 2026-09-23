import { describe, it, expect } from "vitest";
import { ElevenSeconds, ELEVEN, PHASE, isTimeStopper } from "../../src/systems/eleven-seconds.js";
import { ChronoPowers, windupLine } from "../../src/systems/chrono-powers.js";
import { ENEMY_TYPES } from "../../src/data/enemies.js";
import { Enemy, Projectile } from "../../js/entities.js";
import { AISystem } from "../../src/systems/ai.js";
import { updateProjectiles } from "../../src/systems/projectile-update.js";
import { damageEnemy } from "../../src/systems/combat-orchestrator.js";

// Spec §6, Form 3 "Eleven Seconds": he stops time at 75%, 50% and 25%. The
// first stop holds you too and lands a hit that never kills; every later one
// freezes everything but the two of you, and his armour with it.

function open(w = 40, h = 40) {
  const grid = Array.from({ length: h }, (_, r) =>
    Array.from({ length: w }, (_, c) => (r === 0 || c === 0 || r === h - 1 || c === w - 1 ? 1 : 0)),
  );
  return { width: w, height: h, grid };
}

function fight() {
  const boss = Object.assign(new Enemy(20.5, 10.5, "boss_form3"), { state: "chase", lastAttackTime: 0 });
  const add = Object.assign(new Enemy(6.5, 6.5, "sentinel"), { state: "chase", lastAttackTime: 0 });
  const player = { x: 20.5, y: 25.5, angle: 0, health: 100, maxHealth: 100, chronoActive: false, alive: true };
  const hits = [];
  const aria = [];
  const plate = [];
  const game = {
    mode: "campaign",
    map: open(),
    entities: [boss, add],
    projectiles: [],
    player,
    time: 0,
    screenShake: 0,
    damagePlayer: (d) => {
      hits.push(d);
      player.health -= d;
    },
    queueAriaMessage: (k) => aria.push(k),
    ariaComms: { queueSquadMessage: (speaker, category, _c, _l, o) => plate.push({ speaker, category, ...o }) },
  };
  return { game, boss, add, player, hits, aria, plate };
}

/** Run the stop runtime for `secs` in 60 Hz steps. */
function run(stop, game, secs) {
  const n = Math.round(secs * 60);
  for (let i = 0; i < n; i++) {
    game.time += 1000 / 60;
    stop.update(game, 1 / 60);
  }
}

const toFrac = (boss, f) => {
  boss.health = boss.maxHealth * f;
};

describe("the Final Form", () => {
  it("is the one who stops time, and your shift does not slow him", () => {
    expect(ENEMY_TYPES.boss_form3.elevenSeconds).toBe(true);
    expect(ENEMY_TYPES.boss_form3.chronoMultiplier).toBe(1);
    expect(isTimeStopper(new Enemy(0, 0, "boss_form3"))).toBe(true);
    for (const t of ["boss", "boss_form2", "hound"]) expect(isTimeStopper(new Enemy(0, 0, t)), t).toBe(false);
  });
});

describe("Eleven Seconds", () => {
  it("does nothing above 75%, then telegraphs before the first stop", () => {
    const { game, boss } = fight();
    const stop = new ElevenSeconds();
    toFrac(boss, 0.8);
    run(stop, game, 2);
    expect(stop.phase).toBe(PHASE.IDLE);
    toFrac(boss, 0.74);
    run(stop, game, 0.1);
    expect(stop.phase).toBe(PHASE.TELEGRAPH);
    // He is untouchable while he winds the clock, and nobody is frozen yet.
    expect(stop.damageScale(boss)).toBe(0);
    expect(stop.playerFrozen()).toBe(false);
    expect(stop.stopped).toBe(false);
    run(stop, game, ELEVEN.telegraph);
    expect(stop.phase).toBe(PHASE.SCRIPTED);
  });

  it("first stop: you are frozen too, he walks up, and the hit never kills", () => {
    const { game, boss, add, player, plate } = fight();
    const stop = new ElevenSeconds();
    player.health = 12;
    toFrac(boss, 0.7);
    run(stop, game, ELEVEN.telegraph + 0.05);
    expect(stop.phase).toBe(PHASE.SCRIPTED);
    expect(stop.playerFrozen()).toBe(true);
    expect(stop.frozen(add)).toBe(true);
    expect(stop.frozen(boss)).toBe(true); // the AI leaves him to the stop
    expect(stop.damageScale(boss)).toBe(0);
    expect(plate[0]).toMatchObject({ speaker: "VOSS", category: "lordStopsTime", voice: "lord" });
    run(stop, game, ELEVEN.scripted.hitAt);
    expect(Math.hypot(boss.x - player.x, boss.y - player.y)).toBeLessThan(ELEVEN.scripted.reach + 0.2);
    expect(player.health).toBe(1);
    run(stop, game, ELEVEN.scripted.duration);
    // Lyra's recording, after his line.
    expect(plate.map((p) => p.category)).toEqual(["lordStopsTime", "lyraRecorded"]);
    expect(plate[1]).toMatchObject({ voice: "lyra", emotion: "tender" });
    expect(stop.phase).toBe(PHASE.IDLE);
    expect(stop.playerFrozen()).toBe(false);
  });

  it("the heavy hit is a third of your health when you have it", () => {
    const { game, boss, player } = fight();
    const stop = new ElevenSeconds();
    toFrac(boss, 0.7);
    run(stop, game, ELEVEN.telegraph + ELEVEN.scripted.duration + 0.1);
    expect(player.health).toBeCloseTo(100 - 100 * ELEVEN.scripted.hitFrac, 5);
  });

  it("later stops are your window: everything else frozen, double damage, you free", () => {
    const { game, boss, add, aria } = fight();
    const stop = new ElevenSeconds();
    toFrac(boss, 0.7);
    run(stop, game, ELEVEN.telegraph + ELEVEN.scripted.duration + 0.1);
    toFrac(boss, 0.49);
    run(stop, game, ELEVEN.rest + ELEVEN.telegraph + 0.1);
    expect(stop.phase).toBe(PHASE.WINDOW);
    expect(stop.playerFrozen()).toBe(false);
    expect(stop.frozen(add)).toBe(true);
    expect(stop.damageScale(boss)).toBe(ELEVEN.window.damage);
    expect(stop.damageScale(add)).toBe(1);
    expect(aria).toContain("elevenSeconds");
    // Eleven real seconds, then time comes back.
    run(stop, game, ELEVEN.window.duration);
    expect(stop.phase).toBe(PHASE.IDLE);
    expect(stop.frozen(add)).toBe(false);
  });

  it("fires each threshold once, in order, and no more than three stops", () => {
    const { game, boss } = fight();
    const stop = new ElevenSeconds();
    const seen = [];
    toFrac(boss, 0.1); // everything at once
    for (let i = 0; i < 60 * 60; i++) {
      game.time += 1000 / 60;
      stop.update(game, 1 / 60);
      if (stop.phase === PHASE.TELEGRAPH && seen.at(-1) !== stop.stopIndex) seen.push(stop.stopIndex);
    }
    expect(seen).toEqual([0, 1, 2]);
    expect(stop.phase).toBe(PHASE.IDLE);
  });

  it("telegraphs his lunge in the window before it lands", () => {
    const { game, boss, player, hits } = fight();
    const stop = new ElevenSeconds();
    stop.next = 1; // straight to a window
    toFrac(boss, 0.49);
    run(stop, game, ELEVEN.telegraph + 0.05);
    expect(stop.phase).toBe(PHASE.WINDOW);
    player.x = boss.x;
    player.y = boss.y + 4;
    let sawWindup = false;
    for (let i = 0; i < 60 * 6 && !hits.length; i++) {
      game.time += 1000 / 60;
      stop.update(game, 1 / 60);
      if (boss.state === "windup") {
        sawWindup = true;
        // Foresight's red line points at you.
        expect(windupLine(boss, player)).not.toBeNull();
      }
    }
    expect(sawWindup).toBe(true);
    expect(hits.length).toBe(1);
  });

  it("a dodged lunge lands nothing", () => {
    const { game, boss, player, hits } = fight();
    const stop = new ElevenSeconds();
    stop.next = 1;
    toFrac(boss, 0.49);
    run(stop, game, ELEVEN.telegraph + 0.05);
    player.x = boss.x;
    player.y = boss.y + 4;
    let dodged = 0;
    for (let i = 0; i < 60 * 6; i++) {
      game.time += 1000 / 60;
      stop.update(game, 1 / 60);
      // Step sideways out of the line the moment the windup shows.
      if (boss.state === "windup") {
        const a = stop._lunge.angle + Math.PI / 2;
        player.x = boss.x + Math.cos(a) * 3;
        player.y = boss.y + Math.sin(a) * 3;
        dodged++;
      }
    }
    expect(dodged).toBeGreaterThan(0);
    expect(hits).toEqual([]);
  });

  it("lets go of everything when he dies in his window", () => {
    const { game, boss, add } = fight();
    const stop = new ElevenSeconds();
    stop.next = 1;
    toFrac(boss, 0.49);
    run(stop, game, ELEVEN.telegraph + 0.5);
    expect(stop.frozen(add)).toBe(true);
    boss.health = 0;
    boss.state = "dead";
    run(stop, game, 0.05);
    expect(stop.phase).toBe(PHASE.IDLE);
    expect(stop.frozen(add)).toBe(false);
  });

  it("stays out of every other fight and every other mode", () => {
    const { game, boss } = fight();
    const stop = new ElevenSeconds();
    game.entities = [Object.assign(new Enemy(20.5, 10.5, "boss_form2"), { health: 1 })];
    run(stop, game, 5);
    expect(stop.phase).toBe(PHASE.IDLE);
    game.entities = [boss];
    game.mode = "arena";
    toFrac(boss, 0.1);
    run(stop, game, 5);
    expect(stop.phase).toBe(PHASE.IDLE);
  });
});

describe("Eleven Seconds in the systems", () => {
  const audio = { calculatePan: () => 0, enemyShoot: () => {}, enemyHit: () => {}, enemyBark: () => {}, hitConfirm: () => {} };

  function stoppedGame({ first = false } = {}) {
    const f = fight();
    const cp = new ChronoPowers();
    f.game.campaign = { act: 4, level: 6, ngPlusCycle: 0 };
    f.game.settings = { difficulty: 1, hunterResponse: 0 };
    f.game.player.chronoEnergy = 100;
    f.game.player.maxChronoEnergy = 100;
    f.game.getDifficultyMultipliers = () => ({ healthMul: 1, damageMul: 1, speedMul: 1 });
    f.game.chronoPowers = cp;
    cp.startLevel(f.game);
    if (!first) cp.stop.next = 1;
    toFrac(f.boss, first ? 0.7 : 0.49);
    for (let i = 0; i < 100; i++) cp.update(f.game, 1 / 60, 1 / 60);
    return { ...f, cp };
  }

  it("the AI leaves frozen enemies where they stand, and they do not fire", () => {
    const { game, add, cp } = stoppedGame();
    expect(cp.timeStopped()).toBe(true);
    const ai = new AISystem();
    const before = { x: add.x, y: add.y };
    add.lastAttackTime = -1e9;
    let calls = 0;
    for (let i = 0; i < 60; i++) {
      calls += ai.update({
        entities: game.entities, player: game.player, map: game.map, time: 1e6 + i * 16, timeScale: 1,
        projectiles: [], chronoBombs: [], damageNumbers: [], audio, chrono: cp,
      }, 1 / 60).damagePlayerCalls.length;
    }
    expect(add.x).toBe(before.x);
    expect(add.y).toBe(before.y);
    expect(calls).toBe(0);
  });

  it("enemy rounds hang in stopped time and fly on after it", () => {
    const { game, cp } = stoppedGame();
    const round = new Projectile(10, 20, 1, 0, 10, 8, "enemy");
    const ctx = {
      projectiles: [round], entities: [round], map: game.map, player: game.player, time: 0, audio,
      entityGrid: { query: () => [] }, spawnWallSparks: () => {}, damageEnemy: () => {}, damagePlayer: () => {},
      lights: null, chronoPowers: cp,
    };
    for (let i = 0; i < 30; i++) updateProjectiles(ctx, 1 / 60);
    expect(round.x).toBe(10);
    expect(round.active).toBe(true);
    for (let i = 0; i < 60 * 12; i++) cp.update(game, 1 / 60, 1 / 60);
    expect(cp.timeStopped()).toBe(false);
    updateProjectiles(ctx, 1 / 60);
    expect(round.x).toBeGreaterThan(10);
  });

  it("a hit on him is worth double in his window and nothing in the first stop", () => {
    const hitFor = (first) => {
      const { game, boss, cp } = stoppedGame({ first });
      Object.assign(game, {
        shotsHit: 0, achievementStats: { totalShotsHit: 0 }, glitchEffect: 0, audio, damageNumbers: [],
        player: { ...game.player, critChance: 0 },
      });
      // Everything else damageEnemy touches (particles, markers) is a no-op here.
      const g = new Proxy(game, { get: (t, k) => (k in t ? t[k] : () => {}) });
      const before = boss.health;
      damageEnemy(g, boss, 100, { name: "body", mult: 1 });
      return before - boss.health;
    };
    const window = hitFor(false);
    const scripted = hitFor(true);
    expect(scripted).toBe(0);
    expect(window).toBeGreaterThan(150);
  });

  it("holds you still, and your powers with you, in the first stop", () => {
    const { game, cp } = stoppedGame({ first: true });
    expect(cp.playerFrozen()).toBe(true);
    game.player.chronoActive = true;
    expect(cp.tryRewind(game)).toBe(false);
    expect(cp.tryTimeLock(game)).toBe(false);
    expect(cp.tryChronoDash(game, 1, 0)).toBe(false);
  });
});
