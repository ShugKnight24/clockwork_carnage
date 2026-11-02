// tests/unit/seeded-random.js
// The AI rolls Math.random for wander, strafe, dodge and fire jitter. A test
// that drives AISystem unseeded can pass or fail on the roll, so these files
// replace Math.random with a fixed LCG for every test: the same numbers, in
// the same order, on every run.
import { beforeEach, afterEach, vi } from "vitest";

// Numerical Recipes' 32-bit LCG. Plenty for test noise, and cheap.
export function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Call once at the top level of a test file.
export function seedMathRandom(seed = 0x5eed) {
  let spy;
  beforeEach(() => {
    spy = vi.spyOn(Math, "random").mockImplementation(lcg(seed));
  });
  afterEach(() => spy.mockRestore());
}
