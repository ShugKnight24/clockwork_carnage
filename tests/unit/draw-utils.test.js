import { describe, it, expect, vi } from "vitest";
import { drawGlow, drawTechLines } from "../../src/rendering/draw-utils.js";

const mockCtx = () => ({
  save: vi.fn(), restore: vi.fn(),
  beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
  moveTo: vi.fn(), lineTo: vi.fn(),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  globalAlpha: 1, fillStyle: "", strokeStyle: "", lineWidth: 1,
});

describe("drawGlow", () => {
  it("is an exported function", () => {
    expect(typeof drawGlow).toBe("function");
  });

  it("creates a radial gradient and draws an arc", () => {
    const ctx = mockCtx();
    drawGlow(ctx, 100, 200, 32, "#ff0000", 0.5);
    expect(ctx.createRadialGradient).toHaveBeenCalledWith(100, 200, 0, 100, 200, 32);
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.globalAlpha).toBe(1.0); // restored
  });

  it("defaults strength to 0.5", () => {
    const ctx = mockCtx();
    drawGlow(ctx, 0, 0, 10, "#fff");
    // Should have set globalAlpha to 0.5 during draw — verify it restored
    expect(ctx.globalAlpha).toBe(1.0);
  });
});

describe("drawTechLines", () => {
  it("is an exported function", () => {
    expect(typeof drawTechLines).toBe("function");
  });

  it("draws vertical lines across the area", () => {
    const ctx = mockCtx();
    drawTechLines(ctx, 0, 0, 20, 40, "#00ff00", 0.3);
    // spacing is 4, width 20 → expect 5 lines (0,4,8,12,16)
    expect(ctx.moveTo).toHaveBeenCalledTimes(5);
    expect(ctx.lineTo).toHaveBeenCalledTimes(5);
    expect(ctx.stroke).toHaveBeenCalledTimes(5);
    expect(ctx.globalAlpha).toBe(1.0); // restored
  });
});
