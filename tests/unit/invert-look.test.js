/**
 * Pad look is added to the mouse delta and goes through the same aim path,
 * so Invert Y must be applied there once, not again inside the pad manager.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { GamepadManager } from "../../js/gamepad.js";
import { applyAimDelta } from "../../src/systems/aim.js";
import { DEFAULT_SETTINGS, SETTINGS_REGISTRY, gamepadSettingsFrom } from "../../js/settings-registry.js";

const stdPad = (axes) => ({
  index: 0, id: "Xbox Controller (STANDARD GAMEPAD)", mapping: "standard", connected: true, timestamp: 1,
  buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes,
});

/** Reticle Y after one frame of right stick pushed down, as game.js feeds it. */
function padAimY(settings) {
  vi.stubGlobal("navigator", { getGamepads: () => [stdPad([0, 0, 0, 1])], userAgent: "" });
  vi.stubGlobal("window", { addEventListener: () => {}, removeEventListener: () => {} });
  const gm = new GamepadManager();
  gm.updateSettings(gamepadSettingsFrom(settings));
  const r = gm.poll(0);
  const player = { aimOffsetX: 0, aimOffsetY: 0 };
  applyAimDelta(player, 0, r.lookY * 0.01, settings);
  return player.aimOffsetY;
}

const mouseAimY = (settings) => {
  const player = { aimOffsetX: 0, aimOffsetY: 0 };
  applyAimDelta(player, 0, 5, settings);
  return player.aimOffsetY;
};

describe("invert Y", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("inverts pad and mouse look exactly once, in the same direction", () => {
    const normal = { ...DEFAULT_SETTINGS, invertY: false };
    const inverted = { ...DEFAULT_SETTINGS, invertY: true };
    expect(Math.sign(padAimY(normal))).toBe(Math.sign(mouseAimY(normal)));
    expect(Math.sign(padAimY(inverted))).toBe(-Math.sign(padAimY(normal)));
    expect(Math.sign(mouseAimY(inverted))).toBe(-Math.sign(mouseAimY(normal)));
  });

  it("never asks the pad manager to invert", () => {
    expect(gamepadSettingsFrom({ ...DEFAULT_SETTINGS, invertY: true })).not.toHaveProperty("invertLookY");
  });

  it("re-syncs the pad when the setting changes", () => {
    const def = SETTINGS_REGISTRY.find((d) => d.key === "invertY");
    let synced = 0;
    def.onChange({ applyGamepadSettings: () => synced++ });
    expect(synced).toBe(1);
  });
});
