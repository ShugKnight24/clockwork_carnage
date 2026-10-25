import { describe, it, expect } from "vitest";
import { ForgeHand, heldKey, shade } from "../../src/ui/forge-viewmodel.js";

const step = (hand, secs, state) => {
  for (let t = 0; t < secs; t += 1 / 60) hand.update(1 / 60, state);
};

describe("Forge hand", () => {
  it("keeps swinging while a break is held, and settles when it is released", () => {
    const hand = new ForgeHand();
    step(hand, 1, { mining: true, moving: false, held: "pick_stone" });
    expect(hand.swingT).toBeGreaterThanOrEqual(0);
    step(hand, 0.5, { mining: false, moving: false, held: "pick_stone" });
    expect(hand.swingT).toBe(-1);
  });

  it("punches once on a place", () => {
    const hand = new ForgeHand();
    hand.punch();
    step(hand, 0.1, { mining: false, moving: false, held: "block:1" });
    expect(hand.punchT).toBeGreaterThan(0);
    step(hand, 0.3, { mining: false, moving: false, held: "block:1" });
    expect(hand.punchT).toBe(-1);
  });

  it("drops and raises on an item switch, but not for the first item", () => {
    const hand = new ForgeHand();
    hand.update(1 / 60, { mining: false, moving: false, held: "pick_stone" });
    expect(hand.switchT).toBeGreaterThan(0.2);
    hand.update(1 / 60, { mining: false, moving: false, held: "block:3" });
    expect(hand.switchT).toBeLessThan(0.05);
  });

  it("throws chips that fall and expire", () => {
    const hand = new ForgeHand();
    hand.chip("#6b7280", 10);
    expect(hand.chips).toHaveLength(10);
    const y0 = hand.chips[0].y;
    step(hand, 0.3, { mining: false, moving: false, held: null });
    expect(hand.chips.every((c) => c.vy > -1000)).toBe(true);
    expect(hand.chips[0].y).not.toBe(y0); // they fall
    step(hand, 1, { mining: false, moving: false, held: null });
    expect(hand.chips).toHaveLength(0);
  });

  it("holds what the mode has selected", () => {
    expect(heldKey({ riding: {}, survival: {} })).toBe("none");
    expect(heldKey({ survival: {}, heldItem: "pick_metal" })).toBe("pick_metal");
    expect(heldKey({ survival: {}, heldItem: null })).toBe("hand");
    expect(heldKey({ toolMode: "block", tile: 3 })).toBe("block:3");
    expect(heldKey({ toolMode: "spawn", tile: 3 })).toBe("hand");
  });

  it("shades colours both ways", () => {
    expect(shade("#808080", 0)).toBe("rgb(128,128,128)");
    expect(shade("#000000", 1)).toBe("rgb(255,255,255)");
    expect(shade("#ffffff", -1)).toBe("rgb(0,0,0)");
  });
});
