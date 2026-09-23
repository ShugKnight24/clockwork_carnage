// tests/unit/forge-inventory.test.js
import { describe, it, expect } from "vitest";
import { slotVisual } from "../../src/ui/forge-inventory.js";

describe("slotVisual", () => {
  it("is blank for an empty slot", () => {
    expect(slotVisual(null)).toEqual({ color: null, label: "", count: 0, wear: null });
  });

  it("uses the block's colour and shows a count above one", () => {
    const v = slotVisual({ item: "stone", n: 12 });
    expect(v.color).toBe("#6b7280");
    expect(v.label).toBe("Stone");
    expect(v.count).toBe(12);
    expect(v.wear).toBe(null);
  });

  it("hides the count for a single item", () => {
    expect(slotVisual({ item: "stone", n: 1 }).count).toBe(0);
  });

  it("reports wear as a fraction for a tool", () => {
    expect(slotVisual({ item: "pick_stone", n: 1, dur: 60 }).wear).toBeCloseTo(0.5, 5);
    expect(slotVisual({ item: "pick_metal", n: 1, dur: 400 }).wear).toBe(1);
    expect(slotVisual({ item: "pick_stone", n: 1, dur: 0 }).wear).toBe(0);
  });

  it("gives a non-placeable tool a colour of its own rather than crashing", () => {
    const v = slotVisual({ item: "pick_stone", n: 1, dur: 120 });
    expect(typeof v.color).toBe("string");
    expect(v.label).toBe("Stone Pickaxe");
  });

  it("is blank for an unknown item rather than throwing", () => {
    expect(() => slotVisual({ item: "gone", n: 3 })).not.toThrow();
    expect(slotVisual({ item: "gone", n: 3 }).color).toBe(null);
  });
});
