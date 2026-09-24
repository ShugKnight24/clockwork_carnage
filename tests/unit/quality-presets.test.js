import { describe, it, expect } from "vitest";
import { AdaptiveQuality, effectCeilings, effectCapReason } from "../../src/utils/perf.js";
import { SETTINGS_REGISTRY, DEFAULT_SETTINGS, settingDisplayItem } from "../../js/settings-registry.js";

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

describe("governor respects the player's caps", () => {
  const feed = (q, fps) => {
    for (let i = 0; i < q.historySize; i++) q.recordFPS(fps);
  };

  it("never turns on an effect the player turned off", () => {
    const q = new AdaptiveQuality({ targetFPS: 55 });
    q.setCaps({ enableFloorTexture: false, enableVignette: false });
    for (let t = 10_000; t < 40_000; t += 1500) {
      feed(q, 60);
      q.adjust(t);
      expect(q.enableFloorTexture).toBe(false);
      expect(q.enableVignette).toBe(false);
    }
  });

  it("keeps a player-on effect on at normal performance", () => {
    const q = new AdaptiveQuality({ targetFPS: 55 });
    for (let t = 10_000; t < 40_000; t += 1500) {
      feed(q, 60);
      q.adjust(t);
      expect(q.enableFloorTexture).toBe(true);
      expect(q.particleMultiplier).toBe(1);
    }
  });

  it("scales particles within the player's budget and restores effects with headroom", () => {
    const q = new AdaptiveQuality({ targetFPS: 55 });
    q.setCaps({ particleMultiplier: 0.6 });
    let t = 10_000;
    while (q.renderScale >= 0.6) { feed(q, 20); q.adjust((t += 1500)); }
    expect(q.enableFloorTexture).toBe(false);
    expect(q.particleMultiplier).toBeCloseTo(0.6 * 0.3);
    while (q.renderScale < 1) { feed(q, 120); q.adjust((t += 1500)); }
    expect(q.enableFloorTexture).toBe(true);
    expect(q.particleMultiplier).toBeCloseTo(0.6);
  });

  it("does not flicker effects at a tier boundary", () => {
    const q = new AdaptiveQuality();
    q.renderScale = 0.59;
    q.useAuto();
    expect(q.enableFloorTexture).toBe(false);
    q.renderScale = 0.61; // above the step-down point, below the step-up one
    q.useAuto();
    expect(q.enableFloorTexture).toBe(false);
    q.renderScale = 0.66;
    q.useAuto();
    expect(q.enableFloorTexture).toBe(true);
  });

  it("honours a preset's floor and vignette values", () => {
    const q = new AdaptiveQuality();
    // As game.applyPerformanceSettings does: player toggle AND preset ceiling.
    const ceil = effectCeilings({ graphicsPreset: 2, batterySaver: false });
    q.applyPreset("low");
    q.applyCustom({ enableFloorTexture: true && ceil.enableFloorTexture, enableVignette: true && ceil.enableVignette });
    expect([q.enableFloorTexture, q.enableVignette]).toEqual([false, false]);
  });

  it("resetScale jumps straight back to full resolution", () => {
    const q = new AdaptiveQuality();
    q.applyPreset("low");
    q.useAuto();
    q.setCaps({ enableFloorTexture: true, enableVignette: true });
    q.resetScale();
    expect(q.renderScale).toBe(1);
    expect(q.stableScale).toBe(1);
    expect(q.enableFloorTexture).toBe(true);
  });
});

describe("runtime effect caps", () => {
  const base = { graphicsPreset: 0, batterySaver: false };

  it("caps nothing in Auto, Ultra or Custom", () => {
    for (const graphicsPreset of [0, 5, 6]) {
      expect(Object.values(effectCeilings({ ...base, graphicsPreset })).every(Boolean)).toBe(true);
    }
  });

  it("names the preset or Battery Saver as the reason", () => {
    expect(effectCapReason({ ...base, graphicsPreset: 2 }, "enableBloom")).toBe("preset");
    expect(effectCapReason({ ...base, graphicsPreset: 2 }, "floorTexture")).toBe("preset");
    expect(effectCapReason({ ...base, batterySaver: true }, "enableBloom")).toBe("saver");
    expect(effectCapReason({ ...base, batterySaver: true }, "enableFilmGrain")).toBe(null);
  });

  it("labels a capped toggle instead of showing ON", () => {
    const def = SETTINGS_REGISTRY.find((d) => d.key === "enableBloom");
    const settings = { ...DEFAULT_SETTINGS, graphicsPreset: 2 };
    expect(settingDisplayItem(def, settings).value).toBe("OFF (preset)");
    expect(settingDisplayItem(def, { ...DEFAULT_SETTINGS }).value).toBe("ON");
    expect(settingDisplayItem(def, { ...DEFAULT_SETTINGS, enableBloom: false }).value).toBe("OFF");
  });

  it("does not rewrite the player's toggles", () => {
    const settings = { ...DEFAULT_SETTINGS, batterySaver: true };
    effectCeilings(settings);
    expect(settings.enableBloom).toBe(true);
    expect(settings.enableChromaticAberration).toBe(true);
  });
});

describe("settings registry fixes", () => {
  it("moving Render Scale selects the Custom preset", () => {
    const def = SETTINGS_REGISTRY.find((d) => d.key === "renderScale");
    const g = { settings: { ...DEFAULT_SETTINGS, renderScale: 50 }, applyPerformanceSettings: () => {} };
    def.onChange(g);
    const presets = SETTINGS_REGISTRY.find((d) => d.key === "graphicsPreset").values;
    expect(presets[g.settings.graphicsPreset]).toBe("Custom");
  });

  it("drops the dead shadow and lighting settings and keeps haptics on mobile", () => {
    const keys = SETTINGS_REGISTRY.map((d) => d.key);
    expect(keys).not.toContain("shadowQuality");
    expect(keys).not.toContain("lightingQuality");
    expect(DEFAULT_SETTINGS).not.toHaveProperty("shadowQuality");
    expect(SETTINGS_REGISTRY.find((d) => d.key === "haptics").platform).toBe("mobile");
  });
});
