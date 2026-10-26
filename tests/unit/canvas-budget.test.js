// tests/unit/canvas-budget.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

// paint.js keeps the wall base and the starved flag per module: a fresh copy per test.
let paint;
beforeEach(async () => {
  vi.resetModules();
  paint = await import("../../src/rendering/env/paint.js");
});

describe("wall base", () => {
  it("is full size until a phone asks for half", () => {
    expect(paint.getWallBase()).toBe(paint.T);
    paint.setWallBase(paint.T / 2);
    expect(paint.getWallBase()).toBe(paint.T / 2);
    paint.setWallBase(4096);
    expect(paint.getWallBase()).toBe(paint.T);
  });
});

describe("guardBake", () => {
  it("returns the bake's result", () => {
    expect(paint.guardBake(() => 7, null)).toBe(7);
    expect(paint.canvasStarved()).toBe(false);
  });

  it("turns a null context into the fallback, and stops later bakes", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const ctx = null;
    expect(paint.guardBake(() => ctx.createLinearGradient(0, 0, 1, 1), "flat")).toBe("flat");
    expect(paint.canvasStarved()).toBe(true);
    const bake = vi.fn(() => 1);
    expect(paint.guardBake(bake, "flat")).toBe("flat");
    expect(bake).not.toHaveBeenCalled();
  });

  it("still throws errors that are not a starved canvas", () => {
    expect(() => paint.guardBake(() => { throw new RangeError("bad size"); }, null)).toThrow(RangeError);
    expect(paint.canvasStarved()).toBe(false);
  });
});
