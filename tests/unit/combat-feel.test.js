import { describe, it, expect } from "vitest";
import { AISystem, inFrontArc, SHIELD_REACT_MS, SHIELD_BRACE_SECONDS, SHIELD_BRACE_TURN_RATE, FLANK_WINDOW_MS } from "../../src/systems/ai.js";
import { calculateEnemyDamage } from "../../src/systems/combat.js";
import { ENEMY_TYPES } from "../../src/data/enemies.js";
import { Enemy } from "../../js/entities.js";
import { FORMS } from "../../src/systems/paradox-forms.js";

const DT = 1 / 60;
const openMap = () => ({ width: 30, height: 30, grid: Array.from({ length: 30 }, () => new Array(30).fill(0)) });
const sounds = [];
const audio = { calculatePan: () => 0, enemyShoot: () => {}, enemyHit: () => {}, telegraph: (pan, kind) => sounds.push(kind) };
const ctx = (entities, player, time) => ({ entities, player, map: openMap(), time, timeScale: 1, projectiles: [], chronoBombs: [], damageNumbers: [], audio });

describe("front shields can be flanked", () => {
  it("turns the shield at a limited rate instead of snapping to the player", () => {
    const e = new Enemy(15, 15, "shieldCommander");
    expect(e.def.frontShield).toBe(true);
    e.state = "chase";
    e.angle = 0; // facing +x
    const player = { x: 15, y: 18, angle: 0, chronoActive: false }; // 90° to its side
    const ai = new AISystem();
    let time = 1000;
    const step = () => { time += DT * 1000; ai.update(ctx([e], player, time), DT); };
    // Out of its front arc, it takes a beat to react before it turns at all.
    for (let i = 0; i < Math.floor(SHIELD_REACT_MS / 1000 / DT) - 1; i++) step();
    expect(e.angle).toBe(0);
    for (let i = 0; i < 6; i++) step();
    // Then it turns a little toward the player, not all the way.
    expect(e.angle).toBeGreaterThan(0);
    expect(e.angle).toBeLessThan(0.2);
  });
});

describe("a sentinel can be flanked", () => {
  const sentinel = (angle = 0) => {
    const e = new Enemy(15, 15, "sentinel");
    e.state = "chase";
    e.alertRange = 99;
    e.angle = angle;
    e.lastAttackTime = 1e12; // no bashes: just the turning
    e.speed = 0;
    e._shield = 0; // its energy shield aside: just the plate's arc
    return e;
  };
  const stepper = (e, player) => {
    const ai = new AISystem();
    let time = 1000;
    return {
      step: (n = 1) => { for (let i = 0; i < n; i++) { time += DT * 1000; ai.update(ctx([e], player, time), DT); } },
      get time() { return time; },
    };
  };
  const off = (e, p) => Math.abs(Math.atan2(Math.sin(Math.atan2(p.y - e.y, p.x - e.x) - e.angle), Math.cos(Math.atan2(p.y - e.y, p.x - e.x) - e.angle)));

  it("turns slower than you walk round it at bash range", () => {
    const walk = 3.5; // player.moveSpeed
    const bashRange = ENEMY_TYPES.sentinel.attackRange;
    expect(ENEMY_TYPES.sentinel.shieldTurnRate).toBeLessThan(walk / bashRange);
  });

  it("a walk round it at bash range gets you out of its front arc", () => {
    const e = sentinel(0);
    const r = 2.2;
    let a = 0;
    const player = { x: 15 + r, y: 15, angle: Math.PI, chronoActive: false };
    const s = stepper(e, player);
    let flanked = false;
    for (let i = 0; i < 180 && !flanked; i++) {
      a += (3.5 / r) * DT;
      player.x = 15 + Math.cos(a) * r;
      player.y = 15 + Math.sin(a) * r;
      s.step();
      flanked = !inFrontArc(e, player);
    }
    expect(flanked).toBe(true);
  });

  it("still tracks a player in front of it with no delay", () => {
    const e = sentinel(0);
    const player = { x: 20, y: 17, angle: Math.PI, chronoActive: false }; // ~22° off, in its arc
    const s = stepper(e, player);
    s.step();
    expect(e.angle).toBeGreaterThan(0);
  });

  it("is braced after a bash: it barely turns", () => {
    const e = sentinel(0);
    const player = { x: 15, y: 18, angle: 0, chronoActive: false };
    const s = stepper(e, player);
    e._braceT = SHIELD_BRACE_SECONDS;
    s.step(Math.round(SHIELD_BRACE_SECONDS / DT));
    const turned = e.angle;
    expect(turned).toBeLessThanOrEqual(SHIELD_BRACE_TURN_RATE * SHIELD_BRACE_SECONDS + 1e-9);
    expect(turned).toBeLessThan(ENEMY_TYPES.sentinel.shieldTurnRate * (SHIELD_BRACE_SECONDS - SHIELD_REACT_MS / 1000));
  });

  it("a shot in its back leaves a window of free hits, then it wheels round", () => {
    const e = sentinel(0);
    const player = { x: 11, y: 15, angle: 0, chronoActive: false }; // straight behind it
    const s = stepper(e, player);
    calculateEnemyDamage(20, e, 0, player);
    expect(e._flankHit).toBe(true);
    // Through the window it is still slow: you stay behind its shield.
    s.step(Math.floor(FLANK_WINDOW_MS / 1000 / DT) - 2);
    expect(inFrontArc(e, player)).toBe(false);
    e._shield = 0;
    expect(calculateEnemyDamage(20, e, 0, player).finalDamage).toBe(20);
    // Then it wheels round fast, faster than it ever tracks.
    s.step(Math.round(1 / DT));
    expect(off(e, player)).toBeLessThan(Math.PI / 3);
    expect(e._flankedAt).toBeNull();
  });

  it("a shot into its shield does not make it wheel round", () => {
    const e = sentinel(0);
    const player = { x: 20, y: 15, angle: Math.PI, chronoActive: false };
    const { finalDamage } = calculateEnemyDamage(20, e, 0, player);
    expect(finalDamage).toBeCloseTo(4);
    expect(e._flankHit).toBeFalsy();
  });

  it("ordinary enemies still face you at once", () => {
    const e = new Enemy(15, 15, "drone");
    e.state = "chase";
    e.alertRange = 99;
    e.angle = 0;
    e.lastAttackTime = 1e12;
    const player = { x: 15, y: 18, angle: 0, chronoActive: false };
    stepper(e, player).step();
    expect(e.angle).toBeCloseTo(Math.PI / 2, 1);
  });
});

describe("boss attacks are telegraphed", () => {
  it("announces a charge and only starts it after the wind-up", () => {
    sounds.length = 0;
    const e = new Enemy(10, 15, "boss");
    e.state = "chase";
    const player = { x: 18, y: 15, angle: Math.PI, chronoActive: false };
    const ai = new AISystem();
    let time = 1000;
    const step = () => { time += DT * 1000; return ai.update(ctx([e], player, time), DT); };
    step();
    expect(sounds).toContain("charge");
    expect(e._bossCharging).toBeFalsy();
    const tell = FORMS[1].charge.windup;
    for (let i = 0; i < Math.round((tell * 0.8) / DT); i++) step();
    expect(e._bossCharging).toBeFalsy();
    for (let i = 0; i < Math.round((tell * 0.3) / DT); i++) step();
    expect(e._bossCharging || e._bossChargeTimer > 0).toBeTruthy();
  });
});
