// tests/unit/rpg-gather.test.js
import { describe, it, expect } from "vitest";
import { GATHER, canMine, breakTime, dropsFor, xpFor } from "../../src/rpg/gather.js";
import { TOOLS } from "../../src/rpg/tools.js";
import { BLOCKS, AIR, BEDROCK, isSolid } from "../../src/world/blocks.js";

describe("gather table", () => {
  it("covers every solid block except air and bedrock", () => {
    const covered = Object.keys(GATHER).map(Number);
    // Water is not mined: it is scooped with a bucket (water spec, phase C).
    const expected = BLOCKS.filter((b) => b.id !== AIR && b.id !== BEDROCK && isSolid(b.id)).map((b) => b.id);
    expect(covered.sort((a, b) => a - b)).toEqual(expected.sort((a, b) => a - b));
  });
});

describe("canMine", () => {
  it("gates on mining level and names the requirement", () => {
    expect(canMine(10, 1)).toEqual({ ok: true });         // dirt
    expect(canMine(14, 15)).toEqual({ ok: true });        // ore at exactly 15
    expect(canMine(14, 14)).toEqual({ ok: false, reason: "Requires Mining 15" });
    expect(canMine(13, 4)).toEqual({ ok: false, reason: "Requires Mining 5" }); // rock
  });

  it("refuses bedrock, air and unknown ids", () => {
    expect(canMine(BEDROCK, 50)).toEqual({ ok: false, reason: "Unbreakable" });
    expect(canMine(AIR, 50)).toEqual({ ok: false, reason: "Unbreakable" });
    expect(canMine(999, 50)).toEqual({ ok: false, reason: "Unbreakable" });
  });
});

describe("breakTime", () => {
  it("defaults to bare hands", () => {
    expect(breakTime(1, 1)).toBe(breakTime(1, 1, TOOLS.HAND));
  });

  it("never gets slower as level rises", () => {
    let prev = Infinity;
    for (let L = 1; L <= 50; L++) {
      const t = breakTime(13, L);
      expect(t).toBeLessThanOrEqual(prev);
      prev = t;
    }
  });

  it("never gets slower with a better tool", () => {
    const hand = breakTime(13, 1, TOOLS.HAND);
    const stone = breakTime(13, 1, TOOLS.PICK_STONE);
    const metal = breakTime(13, 1, TOOLS.PICK_METAL);
    expect(stone).toBeLessThan(hand);
    expect(metal).toBeLessThan(stone);
  });

  it("is harder for harder blocks and always positive", () => {
    expect(breakTime(14, 20)).toBeGreaterThan(breakTime(10, 20)); // ore vs dirt
    expect(breakTime(10, 50, TOOLS.PICK_METAL)).toBeGreaterThan(0);
  });

  it("falls back to bare hands for a malformed tool rather than returning NaN", () => {
    const hand = breakTime(13, 1, TOOLS.HAND);
    expect(breakTime(13, 1, {})).toBe(hand);
    expect(breakTime(13, 1, { mult: NaN })).toBe(hand);
    expect(breakTime(13, 1, { mult: 0 })).toBe(hand);
    expect(breakTime(13, 1, { mult: -1 })).toBe(hand);
    expect(breakTime(13, 1, null)).toBe(hand);
  });

  it("is infinite for unbreakable blocks", () => {
    expect(breakTime(BEDROCK, 50)).toBe(Infinity);
    expect(breakTime(999, 50)).toBe(Infinity);
  });
});

describe("drops and xp", () => {
  it("drops the matching item and grants the table's xp", () => {
    expect(dropsFor(13)).toBe("rock");
    expect(xpFor(13)).toBe(15);
    expect(xpFor(14)).toBe(35);
  });

  it("drops and grants nothing for unknown ids rather than throwing", () => {
    expect(dropsFor(999)).toBe(null);
    expect(xpFor(999)).toBe(0);
    expect(dropsFor(BEDROCK)).toBe(null);
    expect(xpFor(AIR)).toBe(0);
  });
});

describe("stations are gatherable", () => {
  it("drops itself and pays xp, like any other block", () => {
    for (const [id, item] of [[16, "workbench"], [17, "anvil"], [18, "forge"]]) {
      expect(canMine(id, 50)).toEqual({ ok: true });
      expect(dropsFor(id)).toBe(item);
      expect(xpFor(id)).toBeGreaterThan(0);
      expect(Number.isFinite(breakTime(id, 1))).toBe(true);
    }
  });
});
