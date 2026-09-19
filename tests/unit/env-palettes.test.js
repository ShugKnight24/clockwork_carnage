import { describe, it, expect } from "vitest";
import {
  resolveEnvPalette,
  getEnvPalette,
  shiftHex,
  LEVEL_ENVS,
} from "../../src/rendering/env/palettes.js";

/** Act each campaign level belongs to, matching campaign-manager's mapping. */
const ACT_OF = [1, 1, 1, 2, 2, 2, 3, 3, 3];
const LEVELS = ACT_OF.map((act, level) => ({ act, level }));

const KEY_FIELDS = ["s0", "s2", "s4", "accent", "lamp"];
const signature = (p) =>
  [...KEY_FIELDS.map((k) => p[k]), p.fogNear.join(), p.fogFar.join()].join("|");

describe("per-level environment palettes", () => {
  it("gives every campaign level its own look", () => {
    const seen = new Map();
    for (const { act, level } of LEVELS) {
      const sig = signature(resolveEnvPalette(act, level));
      expect(seen.has(sig), `level ${level} reuses level ${seen.get(sig)}'s palette`).toBe(false);
      seen.set(sig, level);
    }
  });

  it("keeps each level inside its act's family", () => {
    // The first level of each act is the untouched act base.
    for (const first of [0, 3, 6]) {
      expect(resolveEnvPalette(ACT_OF[first], first)).toEqual(getEnvPalette(ACT_OF[first]));
    }
  });

  it("falls back to the act palette outside the campaign", () => {
    expect(resolveEnvPalette(2, null)).toEqual(getEnvPalette(2));
    expect(resolveEnvPalette(3, undefined)).toEqual(getEnvPalette(3));
  });

  it("moves the light tints with the fixture colours", () => {
    // The authored *RGB triples are deeper than their hex on purpose, so a
    // derived level should follow the hue without flattening to the hex.
    for (const { act, level } of LEVELS) {
      const p = resolveEnvPalette(act, level);
      for (const v of [...p.accentRGB, ...p.lampRGB]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(255);
      }
    }
    // Reactor's light is warmer than the Act 2 base it derives from.
    const reactor = resolveEnvPalette(2, 5);
    const act2 = getEnvPalette(2);
    expect(reactor.accentRGB[0] - reactor.accentRGB[2])
      .toBeGreaterThan(act2.accentRGB[0] - act2.accentRGB[2]);
  });

  it("names every campaign level", () => {
    for (let i = 0; i < 9; i++) expect(LEVEL_ENVS[i]?.name).toBeTruthy();
  });
});

describe("shiftHex", () => {
  it("returns the input when asked for no change", () => {
    expect(shiftHex("#1f3042")).toBe("#1f3042");
  });

  it("lifts a near-black that a multiplier alone cannot move", () => {
    const mul = shiftHex("#0a121b", { l: 1.3 });
    const lifted = shiftHex("#0a121b", { lift: 0.1 });
    const lum = (h) => [1, 3, 5].reduce((a, i) => a + parseInt(h.slice(i, i + 2), 16), 0);
    expect(lum(lifted)).toBeGreaterThan(lum(mul));
  });
});
