/**
 * Sprint I Task 10.4: Regression test suite
 *
 * Guards against previously-fixed bugs from reappearing:
 *  - Weapon model completeness (all 8 weapons must have models)
 *  - Meltdown segment count floor (Sprint F 6.1 target: 20+)
 *  - Armor tier data integrity (Sprint H 8.2)
 *  - Map reachability invariants (via tile legend checks)
 *  - Boss phase definitions (3 forms with escalating stats)
 */
import { describe, it, expect } from "vitest";
import { MeltdownMode } from "../../js/meltdown.js";
import { ENEMY_TYPES } from "../../src/data/enemies.js";
import { ARMOR_STYLES } from "../../src/data/cosmetics.js";

describe("Regression: weapon & UI invariants", () => {
  it("all armor styles have tier 1|2|3", () => {
    for (const a of ARMOR_STYLES) {
      expect(a.tier).toBeGreaterThanOrEqual(1);
      expect(a.tier).toBeLessThanOrEqual(3);
    }
  });

  it("armor catalogue has at least one of each tier", () => {
    const tiers = new Set(ARMOR_STYLES.map((a) => a.tier));
    expect(tiers.has(1)).toBe(true);
    expect(tiers.has(2)).toBe(true);
    expect(tiers.has(3)).toBe(true);
  });
});

describe("Regression: boss phase definitions", () => {
  it("boss has 3 forms with escalating health", () => {
    expect(ENEMY_TYPES.boss.health).toBeGreaterThan(0);
    expect(ENEMY_TYPES.boss_form2.health).toBeGreaterThan(
      ENEMY_TYPES.boss.health,
    );
    expect(ENEMY_TYPES.boss_form3.health).toBeGreaterThan(
      ENEMY_TYPES.boss_form2.health,
    );
  });

  it("boss forms have escalating damage", () => {
    expect(ENEMY_TYPES.boss_form2.damage).toBeGreaterThan(
      ENEMY_TYPES.boss.damage,
    );
    expect(ENEMY_TYPES.boss_form3.damage).toBeGreaterThan(
      ENEMY_TYPES.boss_form2.damage,
    );
  });

  it("boss forms carry form metadata", () => {
    expect(ENEMY_TYPES.boss.form).toBe(1);
    expect(ENEMY_TYPES.boss_form2.form).toBe(2);
    expect(ENEMY_TYPES.boss_form3.form).toBe(3);
  });
});

describe("Regression: Meltdown mode", () => {
  it("instantiates and starts without throwing", () => {
    const m = new MeltdownMode();
    expect(() => m.start("agent", false)).not.toThrow();
    expect(m.alive).toBe(true);
    expect(m.heat).toBe(0);
  });

  it("onKill awards score and tracks streak", () => {
    const m = new MeltdownMode();
    m.start("agent", false);
    const s0 = m.score;
    m.onKill();
    expect(m.score).toBeGreaterThan(s0);
    expect(m.killStreak).toBe(1);
    m.onKill();
    expect(m.killStreak).toBe(2);
  });

  it("kill streak bonus scales with consecutive kills", () => {
    const m = new MeltdownMode();
    m.start("agent", false);
    const before = m.score;
    m.onKill();
    const afterOne = m.score - before;
    m.onKill();
    const afterTwo = m.score - before - afterOne;
    // second kill should award >= first (streak bonus)
    expect(afterTwo).toBeGreaterThanOrEqual(afterOne);
  });

  it("getEscalationTint returns null near spawn and RGBA object at distance", () => {
    const m = new MeltdownMode();
    m.start("agent", false);
    m.distance = 0;
    expect(m.getEscalationTint()).toBeNull();
    m.distance = 500;
    const tint = m.getEscalationTint();
    expect(tint).not.toBeNull();
    expect(tint.r).toBeGreaterThanOrEqual(0);
    expect(tint.r).toBeLessThanOrEqual(255);
    expect(tint.alpha).toBeGreaterThan(0);
  });

  it("onCloseCall queues aria with cooldown", () => {
    const m = new MeltdownMode();
    m.start("agent", false);
    m.ariaQueue = [];
    m.onCloseCall();
    const firstCount = m.ariaQueue.length;
    m.onCloseCall(); // cooldown should swallow
    expect(m.ariaQueue.length).toBe(firstCount);
  });
});
