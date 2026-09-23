import { describe, it, expect } from "vitest";
import {
  resolveEnvPalette,
  getEnvPalette,
  shiftHex,
  LEVEL_ENVS,
  envSalt,
} from "../../src/rendering/env/palettes.js";
import { ACTS } from "../../src/data/campaign/acts.js";

/**
 * Each env with the palette of the act the station was authored around: the
 * nine maps were built three to an act, so that is the look each was tuned in.
 */
const ENVS = ACTS[0].levels.map((l) => l.env);
const PALETTE_OF = [1, 1, 1, 2, 2, 2, 3, 3, 3];
const LEVELS = ENVS.map((env, i) => ({ act: PALETTE_OF[i], level: env }));

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
      expect(resolveEnvPalette(PALETTE_OF[first], ENVS[first]))
        .toEqual(getEnvPalette(PALETTE_OF[first]));
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
    const reactor = resolveEnvPalette(2, "reactor");
    const act2 = getEnvPalette(2);
    expect(reactor.accentRGB[0] - reactor.accentRGB[2])
      .toBeGreaterThan(act2.accentRGB[0] - act2.accentRGB[2]);
  });

  it("names the env of every campaign level in every act", () => {
    for (const act of ACTS) {
      for (const l of act.levels) expect(LEVEL_ENVS[l.env]?.name, l.env).toBeTruthy();
      expect(act.palette, `act ${act.id}`).toBeTruthy();
    }
  });

  it("keeps each env's texture salt distinct, and none outside the campaign", () => {
    const salts = ENVS.map(envSalt);
    expect(new Set(salts).size).toBe(ENVS.length);
    expect(salts.every((s) => s > 0)).toBe(true);
    expect(envSalt(null)).toBe(0);
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
