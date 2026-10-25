import { describe, it, expect } from "vitest";
import {
  createConditioning,
  normalizeConditioning,
  levelFor,
  levelOf,
  progressOf,
  addXp,
  conditioningBonuses,
  SKILLS,
  SKILL_IDS,
  MAX_LEVEL,
} from "../../src/systems/conditioning.js";

describe("conditioning levels", () => {
  it("starts every skill at level 0", () => {
    const c = createConditioning();
    for (const id of SKILL_IDS) expect(levelOf(c, id)).toBe(0);
    expect(SKILL_IDS).toEqual(["stamina", "reload", "steadiness"]);
  });

  it("each skill has five levels, each costing more than the last", () => {
    for (const id of SKILL_IDS) {
      const xp = SKILLS[id].xp;
      expect(xp).toHaveLength(MAX_LEVEL);
      for (let i = 1; i < xp.length; i++) expect(xp[i] - xp[i - 1], id).toBeGreaterThan(i > 1 ? xp[i - 1] - xp[i - 2] : 0);
    }
  });

  it("levels by cumulative XP and stops at five", () => {
    expect(levelFor("reload", 0)).toBe(0);
    expect(levelFor("reload", SKILLS.reload.xp[0])).toBe(1);
    expect(levelFor("reload", SKILLS.reload.xp[4] * 10)).toBe(MAX_LEVEL);
  });

  it("addXp reports the level it crossed, and nothing past the cap", () => {
    const c = createConditioning();
    expect(addXp(c, "stamina", 10)).toBe(0);
    expect(addXp(c, "stamina", SKILLS.stamina.xp[0])).toBe(1);
    expect(addXp(c, "stamina", 1e6)).toBe(MAX_LEVEL);
    const capped = c.stamina;
    expect(addXp(c, "stamina", 50)).toBe(0);
    expect(c.stamina).toBe(capped);
    expect(addXp(c, "nope", 50)).toBe(0);
    expect(addXp(c, "reload", -5)).toBe(0);
  });

  it("progress runs 0 … 1 within a level", () => {
    const c = createConditioning();
    c.reload = SKILLS.reload.xp[0] + (SKILLS.reload.xp[1] - SKILLS.reload.xp[0]) / 2;
    expect(progressOf(c, "reload")).toBeCloseTo(0.5);
    c.reload = 1e6;
    expect(progressOf(c, "reload")).toBe(1);
  });

  it("a save is made safe: bad values and unknown skills are dropped", () => {
    expect(normalizeConditioning({ stamina: 200, reload: "x", steadiness: -3, junk: 9 })).toEqual({ stamina: 200, reload: 0, steadiness: 0 });
    expect(normalizeConditioning(null)).toEqual(createConditioning());
  });
});

describe("conditioning bonuses", () => {
  it("are nothing at level 0", () => {
    expect(conditioningBonuses(createConditioning())).toEqual({
      staminaRegenMult: 1, staminaBonus: 0, reloadMult: 1, zoneMult: 1, steadyMult: 1,
    });
  });

  it("stay small at level 5: skill still beats grind", () => {
    const max = Object.fromEntries(SKILL_IDS.map((id) => [id, 1e9]));
    const b = conditioningBonuses(max);
    expect(b.staminaRegenMult).toBeCloseTo(1.5);
    expect(b.staminaBonus).toBe(25);
    expect(b.reloadMult).toBeGreaterThanOrEqual(0.85);
    expect(b.zoneMult).toBeLessThanOrEqual(1.3);
    expect(b.steadyMult).toBeGreaterThanOrEqual(0.7);
  });

  it("level 2 stamina is +20% regen and +10 stamina", () => {
    const c = createConditioning();
    c.stamina = SKILLS.stamina.xp[1];
    const b = conditioningBonuses(c);
    expect(b.staminaRegenMult).toBeCloseTo(1.2);
    expect(b.staminaBonus).toBe(10);
  });
});
