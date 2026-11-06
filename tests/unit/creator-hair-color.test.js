import { describe, it, expect } from "vitest";
import { drawHairColorHint } from "../../src/ui/character-creator.js";
import { DEFAULT_KEYBINDS } from "../../src/systems/input-manager.js";

/** A 2D context that keeps the text drawn and does nothing else. */
function textCtx() {
  const texts = [];
  const ctx = new Proxy(
    { texts, measureText: (t) => ({ width: String(t).length * 6 }), fillText: (t) => texts.push(String(t)) },
    { get: (o, k) => (k in o ? o[k] : () => {}), set: () => true },
  );
  return ctx;
}

const game = (over = {}) => ({ isTouchDevice: false, keybinds: { ...DEFAULT_KEYBINDS }, gamepad: { connected: true, controllerType: "xbox" }, ...over });

describe("legacy creator hair colour hint", () => {
  it("shows Q / E on a keyboard", () => {
    const ctx = textCtx();
    expect(drawHairColorHint(ctx, 200, 10, game({ inputDevice: "keyboard" }))).toBeGreaterThan(0);
    expect(ctx.texts).toEqual(["Q", "E"]);
  });

  it("shows the bumpers on a pad, in the pad's own legends", () => {
    const xbox = textCtx();
    drawHairColorHint(xbox, 200, 10, game({ inputDevice: "gamepad" }));
    expect(xbox.texts).toEqual(["LB", "RB"]);
    const ps = textCtx();
    drawHairColorHint(ps, 200, 10, game({ inputDevice: "gamepad", gamepad: { connected: true, controllerType: "playstation" } }));
    expect(ps.texts).toEqual(["L1", "R1"]);
  });

  it("shows nothing on touch, where the swatches are tapped", () => {
    const ctx = textCtx();
    expect(drawHairColorHint(ctx, 200, 10, game({ isTouchDevice: true, inputDevice: "touch" }))).toBe(0);
    expect(ctx.texts).toEqual([]);
  });
});
