import { describe, it, expect } from "vitest";
import { SKILLS, MAX_LEVEL, xpForLevel, levelFor, Skills } from "../../src/rpg/skills.js";

describe("skill table", () => {
  it("launches with mining and construction", () => {
    expect(SKILLS.map((s) => s.id)).toEqual(["mining", "construction"]);
    SKILLS.forEach((s) => expect(typeof s.name).toBe("string"));
    expect(MAX_LEVEL).toBe(50);
  });
});

describe("xp curve", () => {
  it("starts at level 1 for zero xp and rises monotonically", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(levelFor(0)).toBe(1);
    for (let L = 2; L <= MAX_LEVEL; L++) {
      expect(xpForLevel(L)).toBeGreaterThan(xpForLevel(L - 1));
    }
  });

  it("levels exactly at the threshold, not one xp early", () => {
    for (const L of [2, 5, 15, 50]) {
      const need = xpForLevel(L);
      expect(levelFor(need - 1)).toBe(L - 1);
      expect(levelFor(need)).toBe(L);
    }
  });

  // Review Focus 5
  it("clamps at the cap while xp keeps accumulating", () => {
    const beyond = xpForLevel(MAX_LEVEL) * 10;
    expect(levelFor(beyond)).toBe(MAX_LEVEL);
    const s = new Skills();
    s.grant("mining", beyond);
    s.grant("mining", beyond);
    expect(s.xp.mining).toBe(beyond * 2);
    expect(s.level("mining")).toBe(MAX_LEVEL);
  });
});

describe("Skills", () => {
  it("starts every skill at zero xp and level 1", () => {
    const s = new Skills();
    expect(s.level("mining")).toBe(1);
    expect(s.level("construction")).toBe(1);
  });

  it("reports when a grant crossed a level boundary", () => {
    const s = new Skills();
    const need = xpForLevel(2);
    expect(s.grant("mining", need - 1)).toEqual({ level: 1, leveled: false });
    expect(s.grant("mining", 1)).toEqual({ level: 2, leveled: true });
  });

  it("ignores unknown skills and non-positive grants", () => {
    const s = new Skills();
    expect(s.grant("nope", 100)).toBe(null);
    expect(s.grant("mining", 0)).toBe(null);
    expect(s.grant("mining", -5)).toBe(null);
    expect(s.xp.mining).toBe(0);
    expect(s.level("nope")).toBe(1);
  });

  it("refuses Infinity, NaN, strings and negatives rather than corrupting the ledger", () => {
    const s = new Skills();
    expect(s.grant("mining", Infinity)).toBe(null);
    expect(s.grant("mining", NaN)).toBe(null);
    expect(s.grant("mining", "123")).toBe(null);
    expect(s.grant("mining", -5)).toBe(null);
    expect(s.xp.mining).toBe(0);
    expect(typeof s.xp.mining).toBe("number");

    s.grant("mining", 50);
    s.grant("mining", "123");
    expect(s.xp.mining).toBe(50); // not the string "50123"
  });

  it("sanitises a corrupt stored record instead of loading it", () => {
    expect(Skills.fromJSON({ mining: "500" }).xp.mining).toBe(0);
    expect(Skills.fromJSON({ mining: -900 }).xp.mining).toBe(0);
    expect(Skills.fromJSON({ mining: Infinity }).xp.mining).toBe(0);
    expect(Skills.fromJSON({ mining: NaN }).xp.mining).toBe(0);
    expect(Skills.fromJSON({ mining: 500 }).xp.mining).toBe(500); // good data still loads
  });

  it("round-trips through JSON and ignores unknown keys", () => {
    const s = Skills.fromJSON({ mining: 500, nope: 9999 });
    expect(s.xp.mining).toBe(500);
    expect(s.xp.nope).toBe(undefined);
    expect(Skills.fromJSON(null).xp.mining).toBe(0);
  });
});
