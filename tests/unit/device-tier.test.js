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

  it("leaves a smooth run alone", () => {
    const q = new AdaptiveQuality({ targetFPS: 55 });
    feed(q, [60]);
    q.adjust(10_000);
    expect(q.renderScale).toBe(1);
  });
});
