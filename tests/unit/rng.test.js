import { describe, it, expect } from "vitest";
import { mulberry32, lcg, parkMiller, xorshift32 } from "../../src/utils/rng.js";
import { rng as paintRng } from "../../src/rendering/env/paint.js";
import { mulberry32 as cinematicMulberry32 } from "../../src/cinematic/seeded.js";

// The local generators these replaced, verbatim: generated art, maps and
// golden hashes depend on each stream staying bit-identical.
const OLD = {
  // cinematic/seeded.js, systems/showcase-path.js
  mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  // rendering/env/paint.js (signed state, operands swapped)
  paintRng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  // title-background, title-clock, villain, backdrops
  lcg(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  },
  // js/cutscene.js
  fbRand(seed) {
    let s = seed >>> 0 || 1;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  },
  // ui/comms-portraits.js
  lcgImul(seed) {
    let s = seed >>> 0;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  },
  // svg-art/models/scenes.js
  parkMiller(seed) {
    let s = seed;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  },
  // js/audio.js (audioRandom and the noise clips)
  xorshift(seed) {
    let s = seed;
    return () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return (s >>> 0) / 4294967296;
    };
  },
};

const SEEDS = [0, 1, 7, 31, 1648, 2718, 4711, 9173, 20260924, 0x7fffffff, 0x80000000, 0x9e3779b9, 0xffffffff, -1, -12345, 2 ** 40 + 3];
const N = 2000;

const stream = (gen) => Array.from({ length: N }, gen);
const same = (a, b, label) => {
  for (const seed of SEEDS) expect(stream(a(seed)), `${label} seed ${seed}`).toEqual(stream(b(seed)));
};

describe("shared seeded generators", () => {
  it("mulberry32 replays the cinematic, showcase-path and paint streams", () => {
    same(mulberry32, OLD.mulberry32, "mulberry32");
    same(mulberry32, OLD.paintRng, "paint");
    same(paintRng, OLD.paintRng, "paint export");
    same(cinematicMulberry32, OLD.mulberry32, "cinematic export");
  });

  it("lcg replays the title, villain, backdrop and comms-portrait streams", () => {
    same(lcg, OLD.lcg, "lcg");
    same(lcg, OLD.lcgImul, "lcg (imul)");
  });

  it("lcg with a zero seed bumped to 1 replays the flipbook stream", () => {
    same((seed) => lcg(seed >>> 0 || 1), OLD.fbRand, "fbRand");
  });

  it("parkMiller replays the scene-art stream", () => {
    for (const seed of [7, 29, 31, 53, 61, 71, 77, 83, 97, 412, 1234567]) {
      expect(stream(parkMiller(seed)), `seed ${seed}`).toEqual(stream(OLD.parkMiller(seed)));
    }
  });

  it("xorshift32 replays the audio streams", () => {
    for (const key of [0, 1, 2, 17, 4410, 22050, 96000]) {
      const seed = (key * 2654435761) >>> 0 || 1;
      expect(stream(xorshift32(seed))).toEqual(stream(OLD.xorshift(seed)));
    }
    expect(stream(xorshift32(0x9e3779b9))).toEqual(stream(OLD.xorshift(0x9e3779b9)));
  });

  it("every stream stays in [0, 1)", () => {
    for (const make of [mulberry32, lcg, xorshift32]) {
      for (const v of stream(make(12345))) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    }
    for (const v of stream(parkMiller(12345))) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
