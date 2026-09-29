import { describe, it, expect } from "vitest";
import { classifyDevice, budgetedRenderSize, PIXEL_BUDGET } from "../../src/utils/device-tier.js";
import { AdaptiveQuality } from "../../src/utils/perf.js";

describe("device tier", () => {
  it("puts software GL in the low tier whatever the CPU", () => {
    expect(classifyDevice({ renderer: "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))", cores: 16, memoryGB: 32 })).toBe("low");
  });

  it("rates Apple silicon and discrete GPUs high", () => {
    expect(classifyDevice({ renderer: "ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro)", cores: 10 })).toBe("high");
    expect(classifyDevice({ renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)", cores: 8 })).toBe("high");
  });

  it("rates integrated Intel mid, or low on a weak CPU", () => {
    expect(classifyDevice({ renderer: "ANGLE (Intel, Intel(R) UHD Graphics 620)", cores: 8, memoryGB: 8 })).toBe("mid");
    expect(classifyDevice({ renderer: "ANGLE (Intel, Intel(R) UHD Graphics 600)", cores: 4, memoryGB: 4 })).toBe("low");
  });

  it("keeps most phones low and recent flagships mid", () => {
    expect(classifyDevice({ renderer: "Mali-G52", cores: 8, memoryGB: 3, touch: true })).toBe("low");
    expect(classifyDevice({ renderer: "Apple A16 GPU", cores: 6, touch: true })).toBe("mid");
  });
});

describe("render pixel budget", () => {
  it("leaves a window inside the budget at native size", () => {
    expect(budgetedRenderSize(1280, 720, "high")).toEqual({ w: 1280, h: 720 });
  });

  it("scales a 4K window down to the budget, keeping aspect", () => {
    const { w, h } = budgetedRenderSize(3840, 2160, "high");
    expect(w * h).toBeLessThanOrEqual(PIXEL_BUDGET.high * 1.01);
    expect(Math.abs(w / h - 16 / 9)).toBeLessThan(0.01);
  });

  it("gives lower tiers fewer pixels", () => {
    const hi = budgetedRenderSize(1920, 1080, "high");
    const lo = budgetedRenderSize(1920, 1080, "low");
    expect(lo.w * lo.h).toBeLessThan(hi.w * hi.h);
  });
});

describe("adaptive quality", () => {
  const feed = (q, fpsList) => {
    for (let i = 0; i < q.historySize; i++) q.recordFPS(fpsList[i % fpsList.length]);
  };

  it("scales down on frequent hitches even when the average is high", () => {
    const q = new AdaptiveQuality({ targetFPS: 55 });
    // Nine smooth 120 fps frames, then a 25 fps hitch: average ~110.
    feed(q, [120, 120, 120, 120, 120, 120, 120, 120, 120, 25]);
    expect(q.averageFPS).toBeGreaterThan(90);
    const before = q.renderScale;
    q.adjust(10_000);
    expect(q.renderScale).toBeLessThan(before);
  });

  it("does not scale up while hitches continue", () => {
    const q = new AdaptiveQuality({ targetFPS: 55, maxScale: 1 });
    q.renderScale = 0.7;
    feed(q, [120, 120, 120, 120, 120, 120, 120, 40, 40, 40]);
    q.adjust(10_000);
    expect(q.renderScale).toBeLessThanOrEqual(0.7);
  });

  it("recovers resolution once frames are smooth again", () => {
    const q = new AdaptiveQuality({ targetFPS: 55, maxScale: 1 });
    q.renderScale = q.stableScale = 0.8;
    let resized = false;
    for (let t = 10_000; t < 60_000 && !resized; t += 1500) {
      feed(q, [120]);
      resized = q.adjust(t);
    }
    expect(resized).toBe(true);
    expect(q.renderScale).toBeGreaterThanOrEqual(0.86);
  });

  it("recovers resolution on a 60 Hz display, where vsync holds frames at ~59.9", () => {
    const q = new AdaptiveQuality({ targetFPS: 55, maxScale: 1 });
    q.renderScale = q.stableScale = 0.8;
    let resized = false;
    for (let t = 10_000; t < 60_000 && !resized; t += 1500) {
      feed(q, [59.9, 60.1, 59.8, 60]);
      resized = q.adjust(t);
    }
    expect(resized).toBe(true);
    expect(q.renderScale).toBeGreaterThanOrEqual(0.86);
  });

  it("treats a lone long stall as a pause, not a slow machine", () => {
    const q = new AdaptiveQuality({ targetFPS: 55 });
    feed(q, [120]);
    q.recordFPS(2); // a 500 ms level load
    expect(q.history.length).toBe(0);
    expect(q.adjust(10_000)).toBe(false);
    expect(q.renderScale).toBe(1);
  });

  // One governor tick, applying a resize the way main.js does.
  const tick = (q, t, fpsList) => {
    feed(q, fpsList);
    const resized = q.adjust(t);
    if (resized) q.stableScale = q.renderScale;
    return resized;
  };
  const HITCHY = [120, 120, 120, 120, 120, 120, 120, 120, 120, 25];

  it("undoes a hitch-only step down that did not ease the hitches, then holds off", () => {
    const q = new AdaptiveQuality({ targetFPS: 55 });
    expect(tick(q, 10_000, HITCHY)).toBe(true);
    expect(q.stableScale).toBeLessThan(1);
    // Same hitches at the lower size: the step is taken back.
    tick(q, 11_500, HITCHY);
    expect(q.renderScale).toBe(1);
    // And the hitches no longer push the scale down while the hold lasts.
    for (let t = 13_000; t < 38_000; t += 1500) tick(q, t, HITCHY);
    expect(q.stableScale).toBe(1);
    expect(q.renderScale).toBe(1);
  });

  it("keeps a hitch-only step down that cured the hitches", () => {
    const q = new AdaptiveQuality({ targetFPS: 55 });
    tick(q, 10_000, HITCHY);
    const lowered = q.stableScale;
    tick(q, 11_500, [60]);
    // Not undone: at most the usual slow climb from the lower size.
    expect(q.renderScale).toBeGreaterThanOrEqual(lowered);
    expect(q.renderScale).toBeLessThan(0.96);
  });

  it("still scales down for a slow average during a hitch hold", () => {
    const q = new AdaptiveQuality({ targetFPS: 55 });
    tick(q, 10_000, HITCHY);
    tick(q, 11_500, HITCHY); // undone, hold starts
    expect(q.renderScale).toBe(1);
    tick(q, 13_000, [30]);
    expect(q.renderScale).toBeLessThan(1);
  });

  it("keeps stepping for hitches until a step reaches the canvases", () => {
    const q = new AdaptiveQuality({ targetFPS: 55 });
    // At 0.8 one 7% step is under the resize threshold.
    q.renderScale = q.stableScale = 0.8;
    expect(tick(q, 10_000, HITCHY)).toBe(false);
    expect(tick(q, 11_500, HITCHY)).toBe(true);
    expect(q.stableScale).toBeLessThan(0.7);
  });

  it("leaves a smooth run alone", () => {
    const q = new AdaptiveQuality({ targetFPS: 55 });
    feed(q, [60]);
    q.adjust(10_000);
    expect(q.renderScale).toBe(1);
  });
});
