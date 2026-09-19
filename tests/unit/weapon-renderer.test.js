import { describe, it, expect, vi } from "vitest";
import { drawWeapon } from "../../js/weapon-renderer.js";

// Minimal Canvas2D mock — stubs every method weapon-renderer touches
const mockCtx = () => {
  const noop = vi.fn();
  return {
    save: noop, restore: noop, translate: noop, rotate: noop, scale: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    arc: noop, ellipse: noop, quadraticCurveTo: noop, bezierCurveTo: noop,
    fill: noop, stroke: noop, clip: noop,
    fillRect: noop, strokeRect: noop, clearRect: noop,
    fillText: noop, strokeText: noop, measureText: vi.fn(() => ({ width: 40 })),
    createLinearGradient: vi.fn(() => ({ addColorStop: noop })),
    createRadialGradient: vi.fn(() => ({ addColorStop: noop })),
    setTransform: noop, resetTransform: noop,
    drawImage: noop, getImageData: vi.fn(() => ({ data: new Uint8Array(4) })),
    putImageData: noop,
    globalAlpha: 1, fillStyle: "", strokeStyle: "", lineWidth: 1,
    lineCap: "butt", lineJoin: "miter", font: "", textAlign: "left",
    shadowColor: "", shadowBlur: 0, globalCompositeOperation: "source-over",
    canvas: { width: 640, height: 480 },
    roundRect: noop,
  };
};

const baseOpts = (overrides = {}) => ({
  wep: { id: 0, name: "Pistol", damage: 10, fireRate: 300, range: 15, spread: 0.02 },
  energyColor: "#00ffcc",
  isSprinting: false,
  isDashing: false,
  weaponBob: 0,
  weaponKick: 0,
  weaponAnimFrame: 0,
  time: 1000,
  isTouchDevice: false,
  drawGlow: vi.fn(),
  ...overrides,
});

describe("drawWeapon", () => {
  it("is an exported function", () => {
    expect(typeof drawWeapon).toBe("function");
  });

  it("renders without throwing for each weapon id", () => {
    for (let id = 0; id < 8; id++) {
      const ctx = mockCtx();
      const opts = baseOpts({ wep: { id, name: `w${id}`, damage: 10, fireRate: 300, range: 15, spread: 0 } });
      expect(() => drawWeapon(ctx, 640, 480, opts)).not.toThrow();
    }
  });

  it("calls drawGlow during muzzle flash (weaponAnimFrame === 1)", () => {
    const ctx = mockCtx();
    const glow = vi.fn();
    const opts = baseOpts({ weaponAnimFrame: 1, drawGlow: glow });
    drawWeapon(ctx, 640, 480, opts);
    expect(glow).toHaveBeenCalled();
  });

  it("does not call drawGlow when not firing", () => {
    const ctx = mockCtx();
    const glow = vi.fn();
    const opts = baseOpts({ weaponAnimFrame: 0, drawGlow: glow });
    drawWeapon(ctx, 640, 480, opts);
    expect(glow).not.toHaveBeenCalled();
  });

  it("does nothing when wep is null", () => {
    const ctx = mockCtx();
    const opts = baseOpts({ wep: null });
    expect(() => drawWeapon(ctx, 640, 480, opts)).not.toThrow();
    // save/restore should not be called if wep is null
    expect(ctx.save).not.toHaveBeenCalled();
  });
});
