import { describe, it, expect } from "vitest";
import { clamp, lerp, dist, dist2, normalizeAngle, deg2rad, rad2deg, smoothstep, randInt, randFloat, randPick } from "../../src/utils/math.js";

describe("clamp", () => {
  it("within range → unchanged", () => expect(clamp(5, 0, 10)).toBe(5));
  it("below min → min", () => expect(clamp(-1, 0, 10)).toBe(0));
  it("above max → max", () => expect(clamp(15, 0, 10)).toBe(10));
  it("at min → min", () => expect(clamp(0, 0, 10)).toBe(0));
  it("at max → max", () => expect(clamp(10, 0, 10)).toBe(10));
});

describe("lerp", () => {
  it("t=0 → a", () => expect(lerp(10, 20, 0)).toBe(10));
  it("t=1 → b", () => expect(lerp(10, 20, 1)).toBe(20));
  it("t=0.5 → midpoint", () => expect(lerp(10, 20, 0.5)).toBe(15));
  it("negative range", () => expect(lerp(-10, 10, 0.5)).toBe(0));
});

describe("dist", () => {
  it("same point → 0", () => expect(dist(5, 5, 5, 5)).toBe(0));
  it("horizontal → abs diff", () => expect(dist(0, 0, 3, 0)).toBe(3));
  it("vertical → abs diff", () => expect(dist(0, 0, 0, 4)).toBe(4));
  it("3-4-5 triangle", () => expect(dist(0, 0, 3, 4)).toBe(5));
});

describe("dist2", () => {
  it("same point → 0", () => expect(dist2(5, 5, 5, 5)).toBe(0));
  it("3-4-5 triangle → 25", () => expect(dist2(0, 0, 3, 4)).toBe(25));
});

describe("normalizeAngle", () => {
  it("already normalized → unchanged", () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(1)).toBe(1);
    expect(normalizeAngle(-1)).toBe(-1);
  });
  it("wraps > PI", () => {
    const result = normalizeAngle(Math.PI + 0.5);
    expect(result).toBeCloseTo(-Math.PI + 0.5);
  });
  it("wraps < -PI", () => {
    const result = normalizeAngle(-Math.PI - 0.5);
    expect(result).toBeCloseTo(Math.PI - 0.5);
  });
});

describe("deg2rad / rad2deg", () => {
  it("0° → 0 rad", () => expect(deg2rad(0)).toBe(0));
  it("180° → PI", () => expect(deg2rad(180)).toBeCloseTo(Math.PI));
  it("90° → PI/2", () => expect(deg2rad(90)).toBeCloseTo(Math.PI / 2));
  it("PI → 180°", () => expect(rad2deg(Math.PI)).toBeCloseTo(180));
  it("roundtrip", () => expect(rad2deg(deg2rad(45))).toBeCloseTo(45));
});

describe("smoothstep", () => {
  it("below edge0 → 0", () => expect(smoothstep(0, 1, -0.5)).toBe(0));
  it("above edge1 → 1", () => expect(smoothstep(0, 1, 1.5)).toBe(1));
  it("at midpoint → 0.5", () => expect(smoothstep(0, 1, 0.5)).toBe(0.5));
  it("at edge0 → 0", () => expect(smoothstep(0, 1, 0)).toBe(0));
  it("at edge1 → 1", () => expect(smoothstep(0, 1, 1)).toBe(1));
});

describe("randInt", () => {
  it("returns integer in range", () => {
    for (let i = 0; i < 100; i++) {
      const v = randInt(5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
  it("min === max → returns that value", () => {
    expect(randInt(7, 7)).toBe(7);
  });
});

describe("randFloat", () => {
  it("returns float in range", () => {
    for (let i = 0; i < 100; i++) {
      const v = randFloat(1.0, 2.0);
      expect(v).toBeGreaterThanOrEqual(1.0);
      expect(v).toBeLessThan(2.0);
    }
  });
});

describe("randPick", () => {
  it("returns element from array", () => {
    const arr = ["a", "b", "c"];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(randPick(arr));
    }
  });
  it("single element → returns it", () => {
    expect(randPick([42])).toBe(42);
  });
});
