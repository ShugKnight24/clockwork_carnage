import { describe, it, expect } from "vitest";
import { AdaptiveQuality } from "../../src/utils/perf.js";

describe("adaptive quality on a machine far under target", () => {
  it("steps down after 20 slow frames, not 90, and by a lot", () => {
    const q = new AdaptiveQuality({ targetFPS: 55 });
    for (let i = 0; i < 20; i++) q.recordFPS(10);
    expect(q.adjust(10_000)).toBe(true);
    expect(q.renderScale).toBeCloseTo(0.7, 2);
    expect(q.history.length).toBe(0);
  });

  it("still waits out the full window when frames are merely a bit slow", () => {
    const q = new AdaptiveQuality({ targetFPS: 55 });
    for (let i = 0; i < 20; i++) q.recordFPS(40);
    expect(q.adjust(10_000)).toBe(false);
    expect(q.renderScale).toBe(1);
  });
});
