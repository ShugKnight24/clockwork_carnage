import { describe, it, expect } from "vitest";
import {
  POWER_IDS,
  POWERS,
  SHIFT,
  RESONANCE,
  powersFor,
  shiftTuning,
  hunterPolicy,
  hunterCap,
  newResonance,
  stepResonance,
  pickRiftCell,
  RewindBuffer,
  rewindHealth,
  makeTimeLock,
  lockCrossing,
  inLockSlab,
  predictEnemy,
  windupLine,
  projectilePath,
  ChronoPowers,
} from "../../src/systems/chrono-powers.js";
import { ACTS, getActLevel } from "../../src/data/campaign/acts.js";
import { Enemy, Projectile } from "../../js/entities.js";
import { AISystem } from "../../src/systems/ai.js";
import { rayEnemyHit, projectileHitsEnemy } from "../../src/systems/combat.js";
import { updateProjectiles } from "../../src/systems/projectile-update.js";

// Spec §3 (Resonance), §4 (the four powers), §16.3, and the 2026-09-22
// decisions: Story only on Easy, Rewind on its own input, no powers outside
// the campaign.

/** A walled box of open floor, `w` by `h`, with optional extra walls. */
function box(w, h, walls = []) {
  const grid = Array.from({ length: h }, (_, r) =>
    Array.from({ length: w }, (_, c) => (r === 0 || c === 0 || r === h - 1 || c === w - 1 ? 1 : 0)),
  );
  for (const [c, r] of walls) grid[r][c] = 1;
  return { width: w, height: h, grid };
}

/** Every slot of the campaign in play order. */
function slots() {
  const out = [];
  for (const act of ACTS) act.levels.forEach((_, level) => out.push({ act: act.id, level }));
  return out;
}

describe("powersFor: powers follow the recruits", () => {
  it("gives nothing in Act I or the first level of Act II", () => {
    for (let l = 0; l < 8; l++) expect(powersFor(1, l)).toEqual([]);
    expect(powersFor(2, 0)).toEqual([]);
  });

  it("unlocks Foresight at II-2, Chrono Dash at II-3, Rewind at II-6, Time-Lock at II-7", () => {
    expect(powersFor(2, 1)).toEqual(["foresight"]);
    expect(powersFor(2, 2)).toEqual(["foresight", "dash"]);
    expect(powersFor(2, 4)).toEqual(["foresight", "dash"]);
    expect(powersFor(2, 5)).toEqual(["foresight", "dash", "rewind"]);
    expect(powersFor(2, 6)).toEqual(POWER_IDS);
  });

  it("each grant sits on the chapter of the ally who gives it", () => {
    const at = (id) => {
      for (const { act, level } of slots()) {
        if (getActLevel(act, level).grants.includes(id)) return getActLevel(act, level).squad;
      }
      return null;
    };
    expect(at("foresight")).toContain("lyra");
    expect(at("dash")).toContain("rook");
    expect(at("rewind")).toContain("nova");
    expect(at("timeLock")).toContain("kael");
  });

  it("keeps all four through Acts III and IV", () => {
    for (const { act, level } of slots()) if (act >= 3) expect(powersFor(act, level)).toEqual(POWER_IDS);
  });

  it("grants everything in NG+", () => {
    expect(powersFor(1, 0, { ngPlus: 1 })).toEqual(POWER_IDS);
  });

  it("grants each power exactly once and never takes one away", () => {
    const seen = [];
    for (const { act, level } of slots()) seen.push(...getActLevel(act, level).grants);
    expect([...seen].sort()).toEqual([...POWER_IDS].sort());
    let prev = [];
    for (const { act, level } of slots()) {
      const now = powersFor(act, level);
      for (const p of prev) expect(now, `${act}.${level}`).toContain(p);
      prev = now;
    }
  });

  it("is empty for an act the table does not know", () => {
    expect(powersFor(9, 0)).toEqual([]);
  });
});

describe("shift tuning", () => {
  it("engages at 15 and drains 33/s until Rook tunes it", () => {
    expect(shiftTuning(powersFor(2, 1))).toEqual(SHIFT.base);
    expect(SHIFT.base).toEqual({ engage: 15, drain: 33 });
  });

  it("engages at 10 and drains 28/s from II-3 on", () => {
    expect(shiftTuning(powersFor(2, 2))).toEqual({ engage: 10, drain: 28 });
    expect(shiftTuning(powersFor(4, 6))).toEqual(SHIFT.tuned);
  });
});

describe("Resonance", () => {
  const on = { policy: "on", cap: 3, bossLevel: false };
  const run = (r, seconds, input, step = 0.05) => {
    const events = [];
    for (let t = 0; t < seconds - 1e-9; t += step) events.push(...stepResonance(r, { dt: step, ...input }));
    return events;
  };

  it("is quiet for a short shift and loud for a long one", () => {
    const r = newResonance();
    run(r, 1.5, { shifting: true, ...on });
    expect(r.value).toBeCloseTo(9, 1); // 6/s for the first 1.5 s
    run(r, 1, { shifting: true, ...on });
    expect(r.value).toBeCloseTo(29, 1); // then 20/s
  });

  it("adds the power costs: dash 4, rewind 10, lock 8", () => {
    expect(RESONANCE.events).toEqual({ dash: 4, rewind: 10, timeLock: 8 });
    const r = newResonance();
    stepResonance(r, { dt: 0, shifting: false, add: RESONANCE.events.rewind, ...on });
    expect(r.value).toBe(10);
  });

  it("decays at 8/s only after two seconds without a shift", () => {
    const r = newResonance();
    r.value = 50;
    r.warned = true;
    run(r, 2, { shifting: false, ...on });
    expect(r.value).toBeCloseTo(50, 5);
    run(r, 1, { shifting: false, ...on });
    expect(r.value).toBeCloseTo(42, 1);
  });

  it("restarts the quiet window after each release", () => {
    const r = newResonance();
    run(r, 1, { shifting: true, ...on });
    run(r, 0.1, { shifting: false, ...on });
    const before = r.value;
    run(r, 1, { shifting: true, ...on });
    expect(r.value - before).toBeCloseTo(6, 1);
  });

  it("warns at 50 and whispers at 75, once per climb", () => {
    const r = newResonance();
    r.value = 49;
    expect(stepResonance(r, { dt: 0, shifting: false, add: 2, ...on })).toEqual(["warn"]);
    expect(stepResonance(r, { dt: 0, shifting: false, add: 2, ...on })).toEqual([]);
    expect(stepResonance(r, { dt: 0, shifting: false, add: 30, ...on })).toEqual(["whisper"]);
    r.value = 30; // fell back under both rearm lines
    stepResonance(r, { dt: 0, shifting: false, ...on });
    expect(stepResonance(r, { dt: 0, shifting: false, add: 25, ...on })).toEqual(["warn"]);
  });

  it("sends hunters at 100, resets, and waits 45 s before the next", () => {
    const r = newResonance();
    r.value = 95;
    expect(stepResonance(r, { dt: 0, shifting: false, add: 10, ...on })).toContain("hunt");
    expect(r.value).toBe(0);
    expect(r.responses).toBe(1);
    expect(r.cooldown).toBe(RESONANCE.cooldown);
    r.value = 100;
    expect(run(r, 44, { shifting: true, ...on })).not.toContain("hunt");
    expect(run(r, 2, { shifting: true, ...on })).toContain("hunt");
  });

  it("caps hunter responses per level by difficulty", () => {
    expect([0, 1, 2, 3].map(hunterCap)).toEqual([1, 2, 3, 3]);
    const r = newResonance();
    r.responses = 1;
    r.value = 100;
    expect(stepResonance(r, { dt: 0.1, shifting: true, policy: "on", cap: 1, bossLevel: false })).not.toContain("hunt");
    expect(r.value).toBe(100);
  });

  it("never sends random hunters on a boss level", () => {
    const r = newResonance();
    r.value = 100;
    expect(stepResonance(r, { dt: 0.1, shifting: true, policy: "on", cap: 3, bossLevel: true })).not.toContain("hunt");
  });

  it("Story only keeps the warnings and drops the random hunters", () => {
    const r = newResonance();
    const events = run(r, 10, { shifting: true, policy: "story", cap: 3, bossLevel: false });
    expect(events).toEqual(["warn", "whisper"]);
    expect(r.value).toBe(100);
  });

  it("Off never fills the meter", () => {
    const r = newResonance();
    expect(run(r, 10, { shifting: true, add: 10, policy: "off", cap: 3, bossLevel: false })).toEqual([]);
    expect(r.value).toBe(0);
  });

  it("defaults to Story only on Easy and On above it; the setting overrides", () => {
    expect(hunterPolicy(0, 0)).toBe("story");
    expect([1, 2, 3].map((d) => hunterPolicy(0, d))).toEqual(["on", "on", "on"]);
    expect(hunterPolicy(1, 0)).toBe("on");
    expect(hunterPolicy(2, 3)).toBe("story");
    expect(hunterPolicy(3, 1)).toBe("off");
  });
});

describe("pickRiftCell", () => {
  it("opens the rift 8-12 tiles away, out of sight, somewhere the pack can walk from", () => {
    // A wall across the room hides its far side; a sealed closet is unreachable.
    const walls = [];
    for (let c = 1; c < 29; c++) if (c !== 27) walls.push([c, 10]);
    for (let r = 2; r < 6; r++) walls.push([4, r]);
    for (let c = 1; c < 5; c++) walls.push([c, 6]);
    const map = box(30, 30, walls);
    const player = { x: 15.5, y: 16.5 };
    const rolls = [0, 0.3, 0.6, 0.99];
    for (const roll of rolls) {
      const cell = pickRiftCell(map, player, () => roll);
      expect(cell).not.toBeNull();
      const d = Math.hypot(cell.x - player.x, cell.y - player.y);
      expect(d).toBeGreaterThanOrEqual(8);
      expect(d).toBeLessThanOrEqual(12);
      expect(map.grid[Math.floor(cell.y)][Math.floor(cell.x)]).toBe(0);
      expect(cell.y).toBeLessThan(10); // behind the wall
      expect(Math.floor(cell.x) <= 3 && Math.floor(cell.y) <= 5).toBe(false); // not in the closet
    }
  });

  it("returns null when there is nowhere to open", () => {
    expect(pickRiftCell(box(6, 6), { x: 3, y: 3 }, () => 0)).toBeNull();
  });
});

describe("Rewind Echo", () => {
  it("keeps three seconds and hands back the moment from three seconds ago", () => {
    const b = new RewindBuffer(3);
    for (let t = 0; t <= 10.0001; t += 0.05) b.push(t, { x: t, y: 0, angle: 0, health: 100 });
    const s = b.sampleAt(10 - 3);
    expect(s.x).toBeCloseTo(7, 1);
    expect(b.oldest().t).toBeGreaterThanOrEqual(7 - 0.1);
  });

  it("goes back as far as it can after a fresh level load", () => {
    const b = new RewindBuffer(3);
    b.push(0, { x: 1, y: 1, angle: 0, health: 100 });
    b.push(0.5, { x: 2, y: 1, angle: 0, health: 100 });
    expect(b.sampleAt(-2.5).x).toBe(1);
  });

  it("restores the higher health, capped at +35", () => {
    expect(rewindHealth(40, 100)).toBe(75);
    expect(rewindHealth(40, 60)).toBe(60);
    expect(rewindHealth(80, 50)).toBe(80);
  });

  it("knows how much was lost inside the window", () => {
    const b = new RewindBuffer(3);
    b.push(0, { x: 0, y: 0, angle: 0, health: 100 });
    b.push(1, { x: 0, y: 0, angle: 0, health: 70 });
    expect(b.maxHealth()).toBe(100);
  });
});

describe("Time-Lock", () => {
  const lock = makeTimeLock(10, 10, 0, 0); // facing +x

  it("stands 1.5 tiles ahead, 3 tiles wide, for 4 seconds", () => {
    expect(lock.cx).toBeCloseTo(11.5);
    expect(lock.cy).toBeCloseTo(10);
    expect(lock.half).toBeCloseTo(1.5);
    expect(lock.until).toBe(POWERS.timeLock.duration);
  });

  it("catches a round that crosses it and lets one past its edge fly", () => {
    const hit = lockCrossing(lock, 14, 10.4, 11, 10.4);
    expect(hit.x).toBeCloseTo(11.5);
    expect(hit.y).toBeCloseTo(10.4);
    expect(lockCrossing(lock, 14, 12.2, 11, 12.2)).toBeNull();
    expect(lockCrossing(lock, 14, 10, 12, 10)).toBeNull(); // not there yet
  });

  it("slows what stands inside it", () => {
    expect(inLockSlab(lock, 11.6, 9)).toBe(true);
    expect(inLockSlab(lock, 13, 10)).toBe(false);
    expect(inLockSlab(lock, 11.5, 12)).toBe(false);
  });

  it("holds every round it catches and drops them all when it ends", () => {
    const cp = new ChronoPowers();
    const game = fakeGame({ act: 2, level: 6 });
    cp.startLevel(game);
    game.player.angle = Math.PI; // facing -x
    expect(cp.tryTimeLock(game)).toBe(true);
    const rounds = [];
    for (let i = 0; i < 5; i++) {
      const p = new Projectile(4, 10 - 0.5 + i * 0.25, 1, 0, 10, 20, "enemy");
      rounds.push(p);
      game.projectiles.push(p);
    }
    const mine = new Projectile(9, 10, -1, 0, 10, 20, "player");
    game.projectiles.push(mine);
    for (const p of game.projectiles) cp.captureProjectile(p, p.x, p.y, p.x + p.dirX * 6, p.y);
    expect(rounds.every((p) => p.frozen && p.active)).toBe(true);
    expect(mine.frozen).toBeFalsy();
    expect(cp.lock.caught).toBe(5);
    cp.update(game, POWERS.timeLock.duration + 0.1, POWERS.timeLock.duration + 0.1);
    expect(cp.lock).toBeNull();
    expect(rounds.every((p) => !p.active)).toBe(true);
  });
});

describe("Foresight", () => {
  const map = box(20, 20, [[10, 5], [10, 6], [10, 7]]);

  it("puts the ghost where the enemy's intent carries it in 0.6 s", () => {
    const e = { x: 5.5, y: 12.5, _moveAngle: 0, _moveSpeed: 2, state: "chase" };
    const g = predictEnemy(e, map);
    expect(g.x).toBeCloseTo(6.7, 1);
    expect(g.y).toBeCloseTo(12.5, 5);
  });

  it("stops the ghost at a wall", () => {
    const e = { x: 8.5, y: 6.5, _moveAngle: 0, _moveSpeed: 5, state: "chase" };
    expect(predictEnemy(e, map).x).toBeLessThan(10);
  });

  it("follows a beast's charge line", () => {
    const e = { x: 5.5, y: 15.5, speed: 1, _chargeState: "sprint", _chargeAngle: 0, def: { chargeSpeedMul: 3 } };
    expect(predictEnemy(e, map).x).toBeCloseTo(7.3, 1);
  });

  it("draws a line from a winding-up enemy to its target", () => {
    expect(windupLine({ x: 1, y: 1, state: "chase" }, { x: 5, y: 5 })).toBeNull();
    expect(windupLine({ x: 1, y: 1, state: "windup" }, { x: 5, y: 5 })).toEqual({ x0: 1, y0: 1, x1: 5, y1: 5 });
    const line = windupLine({ x: 1, y: 1, state: "chase", _chargeState: "windup", _chargeAngle: 0, def: { chargeDuration: 1, chargeSpeedMul: 2 }, speed: 2 }, { x: 5, y: 5 });
    expect(line.x1).toBeCloseTo(5);
    expect(line.y1).toBeCloseTo(1);
  });

  it("traces a round's path to the wall", () => {
    const path = projectilePath({ x: 2.5, y: 6.5, dirX: 1, dirY: 0, speed: 10 }, map);
    expect(path.length).toBeGreaterThan(3);
    expect(Math.max(...path.map((p) => p.x))).toBeLessThan(10);
  });
});

/** The slice of Game the runtime reads. */
function fakeGame({ act = 2, level = 6, mode = "campaign", difficulty = 1, setting = 0, ngPlus = 0 } = {}) {
  const map = box(40, 40);
  const aria = [];
  return {
    mode,
    map,
    time: 0,
    deltaTime: 0.016,
    settings: { difficulty, hunterResponse: setting },
    campaign: { act, level, ngPlusCycle: ngPlus },
    player: {
      x: 10, y: 10, angle: 0, health: 100, maxHealth: 100,
      chronoEnergy: 100, maxChronoEnergy: 100, chronoActive: false,
      stamina: 100, isDashing: false, dashCooldown: 0, dashDistMult: 1, moveSpeed: 3.5,
    },
    entities: [],
    projectiles: [],
    aria,
    queueAriaMessage: (k) => aria.push(k),
    triggerAriaOnce: (_id, k) => aria.push(k),
    getDifficultyMultipliers: () => ({ healthMul: 1, damageMul: 1, speedMul: 1 }),
  };
}

describe("ChronoPowers runtime", () => {
  it("has no powers outside the campaign", () => {
    for (const mode of ["arena", "meltdown", "tutorial", "playtest"]) {
      const cp = new ChronoPowers();
      const game = fakeGame({ mode, act: 3, level: 0 });
      cp.startLevel(game);
      expect(cp.powers, mode).toEqual([]);
      expect(cp.resonanceOn, mode).toBe(false);
      expect(cp.tryRewind(game), mode).toBe(false);
      expect(cp.tryTimeLock(game), mode).toBe(false);
      expect(cp.engageCost()).toBe(15);
    }
  });

  it("keeps Resonance off in Act I", () => {
    const cp = new ChronoPowers();
    cp.startLevel(fakeGame({ act: 1, level: 4 }));
    expect(cp.resonanceOn).toBe(false);
  });

  it("charges each power's cost and holds it to its cooldown", () => {
    const cp = new ChronoPowers();
    const game = fakeGame({ act: 2, level: 6 });
    cp.startLevel(game);
    expect(cp.tryTimeLock(game)).toBe(true);
    expect(game.player.chronoEnergy).toBe(100 - POWERS.timeLock.cost);
    expect(cp.tryTimeLock(game)).toBe(false);
    cp.update(game, 9.9, 9.9);
    expect(cp.tryTimeLock(game)).toBe(false);
    cp.update(game, 0.2, 0.2);
    expect(cp.tryTimeLock(game)).toBe(true);
    game.player.chronoEnergy = POWERS.rewind.cost - 1;
    expect(cp.tryRewind(game)).toBe(false);
  });

  it("will not Time-Lock before Kael joins", () => {
    const cp = new ChronoPowers();
    const game = fakeGame({ act: 2, level: 5 });
    cp.startLevel(game);
    expect(cp.tryTimeLock(game)).toBe(false);
    expect(game.player.chronoEnergy).toBe(100);
  });

  it("rewinds to three seconds ago, restores health by the rule and leaves an echo", () => {
    const cp = new ChronoPowers();
    const game = fakeGame({ act: 2, level: 5 });
    cp.startLevel(game);
    const p = game.player;
    for (let i = 0; i < 100; i++) {
      p.x = 10 + i * 0.1;
      if (i === 60) p.health = 30;
      cp.update(game, 0.05, 0.05);
    }
    const leftAt = p.x;
    expect(cp.tryRewind(game)).toBe(true);
    expect(p.x).toBeCloseTo(10 + 40 * 0.1, 0);
    expect(p.health).toBe(65);
    expect(p.chronoEnergy).toBe(100 - POWERS.rewind.cost);
    expect(cp.echo).toMatchObject({ x: leftAt });
    cp.update(game, POWERS.rewind.echoLife + 0.1, POWERS.rewind.echoLife + 0.1);
    expect(cp.echo).toBeNull();
  });

  it("forgets the rewind buffer at a level load", () => {
    const cp = new ChronoPowers();
    const game = fakeGame({ act: 2, level: 5 });
    cp.startLevel(game);
    for (let i = 0; i < 40; i++) { game.player.x += 0.2; cp.update(game, 0.05, 0.05); }
    cp.startLevel(game);
    const x = game.player.x;
    cp.update(game, 0.05, 0.05);
    cp.tryRewind(game);
    expect(game.player.x).toBe(x);
  });

  it("turns a dash while shifting into a Chrono Dash: 20 chrono, no stamina, 1 s cooldown, 2.2x, i-frames", () => {
    const cp = new ChronoPowers();
    const game = fakeGame({ act: 2, level: 2 });
    cp.startLevel(game);
    const p = game.player;
    expect(cp.tryChronoDash(game, 1, 0)).toBe(false); // not shifting: the ordinary dash handles it
    p.chronoActive = true;
    expect(cp.tryChronoDash(game, 1, 0)).toBe(true);
    expect(p.chronoEnergy).toBe(80);
    expect(p.stamina).toBe(100);
    expect(p.isDashing).toBe(true);
    expect(p.chronoDashMult).toBeCloseTo(POWERS.dash.distance);
    expect(cp.isInvulnerable(p)).toBe(true);
    p.isDashing = false;
    expect(cp.tryChronoDash(game, 1, 0)).toBe(false);
    cp.update(game, 1.01, 1.01);
    expect(cp.tryChronoDash(game, 1, 0)).toBe(true);
    expect(cp.res.value).toBeGreaterThanOrEqual(RESONANCE.events.dash * 2 - 1e-9);
  });

  it("does not Chrono Dash before Rook tunes the shard", () => {
    const cp = new ChronoPowers();
    const game = fakeGame({ act: 2, level: 1 });
    cp.startLevel(game);
    game.player.chronoActive = true;
    expect(cp.tryChronoDash(game, 1, 0)).toBe(false);
  });

  it("queues the loud shift line from Act II and the governed one in Act I", () => {
    for (const [act, pool] of [[1, "chronoShiftActivated"], [2, "chronoShiftLoud"]]) {
      const cp = new ChronoPowers();
      const game = fakeGame({ act, level: 1 });
      cp.startLevel(game);
      cp.onShiftStart(game);
      cp.onShiftStart(game);
      expect(game.aria).toEqual([pool]);
    }
  });

  it("drops a capped, marked hunter pack that does not count toward the level", () => {
    const cp = new ChronoPowers();
    const game = fakeGame({ act: 2, level: 3, difficulty: 1, setting: 1 });
    game.totalEnemies = 7;
    cp.startLevel(game);
    game.player.chronoActive = true;
    cp.res.value = 99.9;
    cp.update(game, 0.1, 0.1);
    const pack = game.entities.filter((e) => e._hunter);
    expect(pack.length).toBeGreaterThanOrEqual(2);
    expect(pack.length).toBeLessThanOrEqual(4);
    for (const h of pack) expect(["riftLeaper", "echoDrone"]).toContain(h.enemyType);
    expect(game.totalEnemies).toBe(7);
    expect(game.aria).toContain("hunterResponse");
  });

  it("sends no random hunters in Act I or on Easy's default", () => {
    for (const opts of [{ act: 1, level: 3 }, { act: 2, level: 3, difficulty: 0 }]) {
      const cp = new ChronoPowers();
      const game = fakeGame(opts);
      cp.startLevel(game);
      game.player.chronoActive = true;
      for (let i = 0; i < 400; i++) cp.update(game, 0.05, 0.05);
      expect(game.entities.filter((e) => e._hunter)).toEqual([]);
    }
  });

  it("pays out 40 chrono for a hunter kill", () => {
    const cp = new ChronoPowers();
    const game = fakeGame({ act: 2, level: 3 });
    cp.startLevel(game);
    game.player.chronoEnergy = 10;
    cp.onEnemyKill(game, { _hunter: true });
    expect(game.player.chronoEnergy).toBe(50);
  });

  it("keeps the Hound phased unless the player shifts", () => {
    const cp = new ChronoPowers();
    const game = fakeGame({ act: 2, level: 6 });
    const hound = { type: "enemy", active: true, x: 20, y: 20, def: { phased: true } };
    game.entities.push(hound);
    cp.startLevel(game);
    cp.update(game, 0.05, 0.05);
    expect(hound._phased).toBe(true);
    game.player.chronoActive = true;
    cp.update(game, 0.05, 0.05);
    expect(hound._phased).toBe(false);
  });
});

describe("Chronos in the combat systems", () => {
  const open = () => ({ width: 30, height: 30, grid: Array.from({ length: 30 }, () => new Array(30).fill(0)) });
  const audio = { calculatePan: () => 0, enemyShoot: () => {}, enemyHit: () => {}, enemyBark: () => {} };
  const aiCtx = (entities, player, chrono, time) => ({
    entities, player, map: open(), time, timeScale: 1,
    projectiles: [], chronoBombs: [], damageNumbers: [], audio, chrono,
  });

  it("lets rounds through the Hound until the player shifts", () => {
    const cp = new ChronoPowers();
    const game = fakeGame({ act: 2, level: 6 });
    const hound = new Enemy(15.5, 10, "hound");
    game.entities.push(hound);
    cp.startLevel(game);
    const shot = () => rayEnemyHit({ x: 10, y: 10 }, 1, 0, 20, 0, hound);
    const round = () => projectileHitsEnemy({ x: 15.5, y: 10, originX: 10, originY: 10, dirX: 1, dirY: 0 }, hound, 15, 10);
    cp.update(game, 0.016, 0.016);
    expect(shot()).toBeNull();
    expect(round()).toBeNull();
    game.player.chronoActive = true;
    cp.update(game, 0.016, 0.016);
    expect(shot()).not.toBeNull();
    expect(round()).not.toBeNull();
  });

  it("runs an enemy in the Time-Lock's slab at a tenth", () => {
    const ai = new AISystem();
    const player = { x: 10, y: 10, angle: 0, chronoActive: false };
    const walker = () => Object.assign(new Enemy(20, 10, "henchman"), { state: "chase", lastAttackTime: 1e12 });
    const free = walker();
    const held = walker();
    const lock = makeTimeLock(18.5, 10, 0, 0); // plane at x = 20, across the lane
    const chrono = { echo: null, enemyTimeScale: (e) => (e === held && inLockSlab(lock, e.x, e.y) ? POWERS.timeLock.slow : 1) };
    for (let i = 0; i < 10; i++) ai.update(aiCtx([free, held], player, chrono, 1000 + i * 16), 1 / 60);
    expect(20 - held.x).toBeCloseTo((20 - free.x) * POWERS.timeLock.slow, 3);
  });

  it("sends the swing at the echo instead of the player", () => {
    const ai = new AISystem();
    const e = Object.assign(new Enemy(10, 10, "sentinel"), { state: "chase", lastAttackTime: -1e9 });
    const player = { x: 16, y: 10, angle: 0, chronoActive: false };
    const chrono = { echo: { x: 11, y: 10 }, enemyTimeScale: () => 1 };
    let hits = 0;
    for (let i = 0; i < 120; i++) hits += ai.update(aiCtx([e], player, chrono, i * 16), 1 / 60).damagePlayerCalls.length;
    expect(e.lastAttackTime).toBeGreaterThan(-1e9); // it did swing
    expect(hits).toBe(0);
  });

  it("holds a caught round in the air and drops it when the lock ends", () => {
    const cp = new ChronoPowers();
    const game = fakeGame({ act: 2, level: 6 });
    game.map = open();
    cp.startLevel(game);
    game.player.angle = Math.PI;
    cp.tryTimeLock(game); // plane at x = 8.5
    const round = new Projectile(4, 10, 1, 0, 10, 10, "enemy");
    const ctx = {
      projectiles: [round], entities: [round], map: game.map, player: game.player, time: 0, audio,
      entityGrid: { query: () => [] }, spawnWallSparks: () => {}, damageEnemy: () => {}, damagePlayer: () => {},
      lights: null, chronoPowers: cp,
    };
    for (let i = 0; i < 60; i++) updateProjectiles(ctx, 1 / 60);
    expect(round.frozen).toBe(true);
    expect(round.active).toBe(true);
    expect(round.x).toBeCloseTo(8.5, 5);
    expect(ctx.projectiles).toContain(round);
    cp.update(game, 5, 5);
    updateProjectiles(ctx, 1 / 60);
    expect(round.active).toBe(false);
    expect(ctx.projectiles).not.toContain(round);
  });
});
