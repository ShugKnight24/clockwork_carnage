import { describe, it, expect } from "vitest";
import { SeededRNG } from "../../src/utils/seeded-rng.js";

describe("SeededRNG (BUG-027)", () => {
  it("produces deterministic sequences from the same seed", () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(42);
    const seq1 = Array.from({ length: 20 }, () => rng1.next());
    const seq2 = Array.from({ length: 20 }, () => rng2.next());
    expect(seq1).toEqual(seq2);
  });

  it("produces different sequences from different seeds", () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(99);
    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());
    expect(seq1).not.toEqual(seq2);
  });

  it("next() returns values in [0, 1)", () => {
    const rng = new SeededRNG(123);
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("nextInt() returns integers in the requested range", () => {
    const rng = new SeededRNG(77);
    for (let i = 0; i < 100; i++) {
      const v = rng.nextInt(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("pick() returns elements from the array", () => {
    const rng = new SeededRNG(55);
    const items = ["a", "b", "c", "d"];
    for (let i = 0; i < 50; i++) {
      expect(items).toContain(rng.pick(items));
    }
  });

  it("shuffle() is deterministic and in-place", () => {
    const rng1 = new SeededRNG(101);
    const rng2 = new SeededRNG(101);
    const arr1 = [1, 2, 3, 4, 5, 6, 7, 8];
    const arr2 = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = rng1.shuffle(arr1);
    rng2.shuffle(arr2);
    expect(result).toBe(arr1); // in-place
    expect(arr1).toEqual(arr2); // deterministic
  });

  it("arenaSeed produces different seeds for different rounds", () => {
    const s1 = SeededRNG.arenaSeed(1, 1);
    const s2 = SeededRNG.arenaSeed(2, 1);
    const s3 = SeededRNG.arenaSeed(1, 2);
    expect(s1).not.toBe(s2);
    expect(s1).not.toBe(s3);
    expect(s2).not.toBe(s3);
  });

  it("arenaSeed is deterministic", () => {
    expect(SeededRNG.arenaSeed(5, 2)).toBe(SeededRNG.arenaSeed(5, 2));
  });
});
