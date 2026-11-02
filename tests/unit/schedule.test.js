import { describe, it, expect, vi, afterEach } from "vitest";
import { hasIdleCallback, idle, whenIdle, nextFrame } from "../../src/utils/schedule.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("schedule helpers", () => {
  it("hasIdleCallback follows the global per call", () => {
    vi.stubGlobal("requestIdleCallback", undefined);
    expect(hasIdleCallback()).toBe(false);
    vi.stubGlobal("requestIdleCallback", () => 1);
    expect(hasIdleCallback()).toBe(true);
  });

  it("idle hands the callback and timeout to requestIdleCallback", () => {
    const ric = vi.fn(() => 7);
    vi.stubGlobal("requestIdleCallback", ric);
    const cb = () => {};
    expect(idle(cb, { timeout: 300 })).toBe(7);
    expect(ric).toHaveBeenCalledWith(cb, { timeout: 300 });
    idle(cb);
    expect(ric).toHaveBeenLastCalledWith(cb, undefined);
  });

  it("without requestIdleCallback, idle waits fallbackMs, or runs at once for null", () => {
    vi.stubGlobal("requestIdleCallback", undefined);
    vi.useFakeTimers();
    const cb = vi.fn();
    idle(cb, { timeout: 100, fallbackMs: 200 });
    vi.advanceTimersByTime(199);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledTimes(1);

    const now = vi.fn();
    idle(now, { fallbackMs: null });
    expect(now).toHaveBeenCalledTimes(1);
  });

  it("whenIdle and nextFrame resolve without idle callbacks or frames", async () => {
    vi.stubGlobal("requestIdleCallback", undefined);
    vi.stubGlobal("requestAnimationFrame", undefined);
    await expect(whenIdle(200)).resolves.toBeUndefined();
    await expect(nextFrame()).resolves.toBeUndefined();
  });

  it("whenIdle resolves from the idle callback with no argument", async () => {
    vi.stubGlobal("requestIdleCallback", (cb, opts) => {
      expect(opts).toEqual({ timeout: 200 });
      cb({ didTimeout: false, timeRemaining: () => 10 });
    });
    await expect(whenIdle(200)).resolves.toBeUndefined();
  });
});
