import { describe, it, expect } from "vitest";
import { AdaptiveQuality } from "../../src/utils/perf.js";

describe("quality preset post-FX ceilings", () => {
  it("copies bloom, chromatic aberration and grain from the preset", () => {
    const q = new AdaptiveQuality();
    q.applyPreset("low");
    expect([q.enableBloom, q.enableChromaticAberration, q.enableFilmGrain]).toEqual([false, false, false]);
    q.applyPreset("medium");
    expect([q.enableBloom, q.enableChromaticAberration, q.enableFilmGrain]).toEqual([false, false, true]);
    q.applyPreset("ultra");
    expect([q.enableBloom, q.enableChromaticAberration, q.enableFilmGrain]).toEqual([true, true, true]);
  });

  it("restores the ceilings when returning to auto", () => {
    const q = new AdaptiveQuality();
    q.applyPreset("ultra-low");
    q.useAuto();
    expect([q.enableBloom, q.enableChromaticAberration, q.enableFilmGrain]).toEqual([true, true, true]);
  });
});
