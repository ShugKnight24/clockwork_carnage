/**
 * The Paradox Lord's Form 2 (story spec §6): Counter-shift and Replay.
 */
import { describe, it, expect } from "vitest";
import {
  FORM2,
  newCounterShift,
  stepCounterShift,
  takeShift,
  canShift,
  counterShiftScale,
  replayVolley,
  dueThresholds,
  pendingReplay,
} from "../../src/systems/boss-form2.js";
import { AISystem } from "../../src/systems/ai.js";
import { Enemy } from "../../js/entities.js";
import { ENEMY_TYPES } from "../../src/data/enemies.js";

const DT = 1 / 60;

describe("Form 2's def", () => {
  it("is unaffected by your shift and carries both tricks", () => {
    const d = ENEMY_TYPES.boss_form2;
    expect(d.chronoMultiplier).toBe(1);
    expect(d.counterShift).toBe(true);
    expect(d.replay).toBe(true);
    expect(new Enemy(0, 0, "boss_form2").chronoMultiplier).toBe(1);
    // Form 1 has neither: Act I's job is to beat you, not to teach his tricks.
    expect(ENEMY_TYPES.boss.counterShift).toBeUndefined();
    expect(ENEMY_TYPES.boss.replay).toBeUndefined();
  });
});

describe("Counter-shift", () => {
  const hold = (s, seconds, input = {}) => {
    const events = [];
    for (let t = 0; t < seconds - 1e-9; t += DT) {
      events.push(...stepCounterShift(s, { dt: DT, shifting: true, engaged: true, ...input }));
    }
    return events;
  };

  it("warns at one second of one continuous shift and takes it at two", () => {
    const s = newCounterShift();
    expect(hold(s, 0.95)).toEqual([]);
    expect(hold(s, 0.1)).toEqual(["warn"]);
    expect(hold(s, 0.9)).toEqual([]);
    expect(hold(s, 0.1)).toEqual(["take"]);
    expect(s.takes).toBe(1);
  });

  it("forgets the hold the moment you let go: short shifts are the answer", () => {
    const s = newCounterShift();
    for (let i = 0; i < 10; i++) {
      hold(s, 1.5);
      stepCounterShift(s, { dt: DT, shifting: false, engaged: true });
    }
    expect(s.takes).toBe(0);
    expect(s.held).toBe(0);
  });

  it("does nothing while he is not in the fight", () => {
    const s = newCounterShift();
    expect(hold(s, 5, { engaged: false })).toEqual([]);
  });

  it("ends the shift, holds you at half speed for two seconds and blocks a new one", () => {
    const p = { chronoActive: true };
    takeShift(p);
    expect(p.chronoActive).toBe(false);
    expect(canShift(p)).toBe(false);
    let slowed = 0;
    for (let t = 0; t < 3; t += DT) if (counterShiftScale(p, DT) === FORM2.counterShift.playerScale) slowed += DT;
    expect(slowed).toBeCloseTo(FORM2.counterShift.slowFor, 1);
    expect(FORM2.counterShift.playerScale).toBe(0.5);
    expect(canShift(p)).toBe(true);
    expect(counterShiftScale(p, DT)).toBe(1);
  });
});

describe("Replay", () => {
  const log = [0, 500, 3000, 9000, 10000, 12500].map((t, i) => ({ t, x: i, y: 0, dx: 1, dy: 0, speed: 7, damage: 10 }));

  it("replays the last four seconds of his firing, on their first timing", () => {
    const v = replayVolley(log);
    expect(v.map((s) => s.t)).toEqual([9000, 10000, 12500]);
    expect(v.map((s) => s.at)).toEqual([0, 1, 3.5]);
    expect(replayVolley([])).toEqual([]);
  });

  it("caps a volley at its newest rounds", () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ t: i * 10, x: 0, y: 0, dx: 1, dy: 0, speed: 7, damage: 1 }));
    expect(replayVolley(many)).toHaveLength(FORM2.replay.maxShots);
    expect(replayVolley(many).at(-1).t).toBe(590);
  });

  it("fires once at 66% and once at 33%, even when one hit crosses both", () => {
    expect(dueThresholds(0.8, [])).toEqual([]);
    expect(dueThresholds(0.6, [])).toEqual([0.66]);
    expect(dueThresholds(0.6, [0.66])).toEqual([]);
    expect(dueThresholds(0.2, [])).toEqual([0.66, 0.33]);
  });
});

// ── Through the AI, the way the game runs it ─────────────────────────────────

function openMap(size = 30) {
  return { width: size, height: size, grid: Array.from({ length: size }, () => new Array(size).fill(0)) };
}

const audio = { calculatePan: () => 0, enemyShoot: () => {}, enemyHit: () => {}, enemyBark: () => {} };

function fight() {
  const boss = new Enemy(15, 10, "boss_form2");
  boss.state = "chase";
  boss.maxHealth = boss.health;
  const player = { x: 15, y: 20, angle: 0, chronoActive: false, health: 100 };
  const ctx = {
    entities: [boss],
    player,
    map: openMap(),
    time: 0,
    timeScale: 1,
    projectiles: [],
    chronoBombs: [],
    damageNumbers: [],
    audio,
  };
  const ai = new AISystem();
  const aria = [];
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      ctx.timeScale = player.chronoActive ? 0.3 : 1;
      ctx.time += DT * 1000;
      aria.push(...ai.update(ctx, DT * ctx.timeScale).ariaMessages);
    }
  };
  return { boss, player, ctx, step, aria };
}

describe("Form 2 in the AI", () => {
  it("takes a shift held two seconds, and warns once", () => {
    const { boss, player, step, aria, ctx } = fight();
    player.chronoActive = true;
    step(Math.round(1.5 / DT));
    expect(boss._counterCharge).toBeGreaterThan(0.7);
    expect(aria).toEqual(["counterShift"]);
    step(Math.round(0.6 / DT));
    expect(player.chronoActive).toBe(false);
    expect(player.counterShifted).toBeGreaterThan(1.5);
    expect(ctx.damageNumbers.some((d) => d.value === "COUNTER-SHIFT!")).toBe(true);
    step(1);
    expect(boss._counterCharge).toBe(0);
  });

  it("leaves a string of short shifts alone", () => {
    const { player, step } = fight();
    for (let i = 0; i < 8; i++) {
      player.chronoActive = true;
      step(Math.round(0.8 / DT));
      player.chronoActive = false;
      step(10);
    }
    expect(player.counterShifted ?? 0).toBe(0);
  });

  it("replays his recorded rounds from where he fired them, after the telegraph", () => {
    const { boss, player, step, ctx, aria } = fight();
    // Let him fire for a while at the player's old spot.
    step(Math.round(6 / DT));
    const fired = ctx.projectiles.filter((p) => !p._replay);
    expect(fired.length).toBeGreaterThan(2);
    const origins = new Set(boss._replayLog.map((s) => `${s.x.toFixed(2)},${s.y.toFixed(2)}`));
    // Move away, and knock him under two thirds.
    player.x = 25;
    boss.health = boss.maxHealth * 0.6;
    step(1);
    expect(aria).toContain("replayVolley");
    const pending = pendingReplay(boss);
    expect(pending.length).toBeGreaterThan(0);
    // Every ghost leaves from a spot he actually fired from, aimed where he aimed then.
    for (const s of pending) expect(origins.has(`${s.x.toFixed(2)},${s.y.toFixed(2)}`)).toBe(true);
    for (const s of pending) expect(Math.atan2(s.dy, s.dx)).toBeCloseTo(Math.atan2(20 - s.y, 15 - s.x), 0);
    expect(pending[0].in).toBeGreaterThan(0.9);
    const before = ctx.projectiles.filter((p) => p._replay).length;
    expect(before).toBe(0);
    step(Math.round((FORM2.replay.telegraph + FORM2.replay.window + 0.2) / DT));
    const ghosts = ctx.projectiles.filter((p) => p._replay);
    expect(ghosts.length).toBe(pending.length);
    for (const g of ghosts) expect(g.color).toBe(FORM2.replay.color);
    expect(pendingReplay(boss)).toEqual([]);
    // The 66% volley does not come round again.
    boss.health = boss.maxHealth * 0.5;
    step(Math.round(2 / DT));
    expect(aria.filter((a) => a === "replayVolley")).toHaveLength(1);
  });
});
