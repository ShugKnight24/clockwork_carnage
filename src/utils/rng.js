/**
 * Seeded PRNG factories. Each returns a () => number in [0, 1) that replays
 * the same sequence for the same seed. Callers keep the algorithm (and seed
 * handling) they were tuned with: generated art, maps and golden hashes
 * depend on the exact stream, so never swap one for another.
 */

/** Mulberry32: fast 32-bit generator with a good spread. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Numerical Recipes LCG (1664525, 1013904223) mod 2^32. */
export function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Park–Miller minimal standard (16807 mod 2^31 - 1), mapped to [0, 1).
 * The seed is used as given: keep it in 1..2^31 - 2.
 */
export function parkMiller(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Xorshift32 (13, 17, 5). A zero seed stays zero; pass a non-zero one. */
export function xorshift32(seed) {
  let s = seed;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}
