// tests/unit/rpg-inventory.test.js
import { describe, it, expect } from "vitest";
import { Inventory, HOTBAR_SLOTS, TOTAL_SLOTS } from "../../src/rpg/inventory.js";

describe("Inventory", () => {
  it("is nine hotbar slots plus twenty-seven backpack slots", () => {
    expect(HOTBAR_SLOTS).toBe(9);
    expect(TOTAL_SLOTS).toBe(36);
    expect(new Inventory().slots.length).toBe(36);
  });

  it("merges into an existing stack before opening a new slot", () => {
    const inv = new Inventory();
    expect(inv.add("stone", 10)).toBe(10);
    expect(inv.add("stone", 5)).toBe(5);
    expect(inv.count("stone")).toBe(15);
    expect(inv.slots.filter((s) => s).length).toBe(1);
  });

  it("overflows past the stack size into a second slot", () => {
    const inv = new Inventory();
    inv.add("stone", 70);
    expect(inv.count("stone")).toBe(70);
    const used = inv.slots.filter((s) => s);
    expect(used.length).toBe(2);
    expect(used[0].n).toBe(64);
    expect(used[1].n).toBe(6);
  });

  it("adds only what fits and reports the amount taken", () => {
    const inv = new Inventory();
    for (let i = 0; i < TOTAL_SLOTS; i++) inv.add("stone", 64);
    expect(inv.count("stone")).toBe(TOTAL_SLOTS * 64);
    expect(inv.fits("rock", 1)).toBe(false);
    expect(inv.add("rock", 1)).toBe(0);
    expect(inv.fits("stone", 1)).toBe(false);
  });

  it("removes all-or-nothing across several stacks", () => {
    const inv = new Inventory();
    inv.add("stone", 70);
    expect(inv.remove("stone", 100)).toBe(false);
    expect(inv.count("stone")).toBe(70);
    expect(inv.remove("stone", 68)).toBe(true);
    expect(inv.count("stone")).toBe(2);
    expect(inv.slots.filter((s) => s).length).toBe(1);
  });

  // Review Focus 4
  it("refuses zero, negative and non-integer quantities without mutating", () => {
    const inv = new Inventory();
    inv.add("stone", 5);
    expect(inv.add("stone", 0)).toBe(0);
    expect(inv.add("stone", -3)).toBe(0);
    expect(inv.add("stone", 1.5)).toBe(0);
    expect(inv.remove("stone", 0)).toBe(false);
    expect(inv.remove("stone", -3)).toBe(false);
    expect(inv.count("stone")).toBe(5);
    expect(inv.slots.filter((s) => s && s.n <= 0).length).toBe(0);
  });

  it("refuses unknown item ids", () => {
    const inv = new Inventory();
    expect(inv.add("nope", 1)).toBe(0);
    expect(inv.count("nope")).toBe(0);
  });

  it("preserves the slot count through a round trip", () => {
    // A clone that grew to 36 slots would tell crafting an output fits when
    // it does not, and the inputs would already be gone.
    const small = new Inventory(4);
    small.add("stone", 64);
    const clone = Inventory.fromJSON(small.toJSON());
    expect(clone.slots.length).toBe(4);
    expect(clone.fits("rock", 300)).toBe(small.fits("rock", 300));
    expect(clone.count("stone")).toBe(64);
  });

  it("round-trips through JSON", () => {
    const inv = new Inventory();
    inv.add("stone", 70);
    inv.add("rock", 3);
    const back = Inventory.fromJSON(JSON.parse(JSON.stringify(inv.toJSON())));
    expect(back.count("stone")).toBe(70);
    expect(back.count("rock")).toBe(3);
  });
});

describe("tool durability", () => {
  it("never merges tools — two pickaxes take two slots", () => {
    const inv = new Inventory();
    inv.add("pick_stone", 1);
    inv.add("pick_stone", 1);
    expect(inv.count("pick_stone")).toBe(2);
    expect(inv.slots.filter((s) => s).length).toBe(2);
  });

  it("gives a new tool full durability and a material none", () => {
    const inv = new Inventory();
    inv.add("pick_stone", 1);
    inv.add("stone", 5);
    expect(inv.slots[0].dur).toBe(120);
    expect(inv.slots[1].dur).toBe(undefined);
  });

  it("honours a per-item stack of one in fits", () => {
    const inv = new Inventory(2);
    expect(inv.fits("pick_stone", 2)).toBe(true);
    expect(inv.fits("pick_stone", 3)).toBe(false);
    expect(inv.fits("stone", 128)).toBe(true);
  });

  it("wears a slot down to zero and no further", () => {
    const inv = new Inventory();
    inv.add("pick_stone", 1);
    expect(inv.wearSlot(0, 20)).toBe(100);
    expect(inv.wearSlot(0, 1000)).toBe(0);
    expect(inv.slots[0].dur).toBe(0);
    expect(inv.slots[0].item).toBe("pick_stone"); // worn, not gone
  });

  it("ignores wear on a material slot or an empty slot", () => {
    const inv = new Inventory();
    inv.add("stone", 5);
    expect(inv.wearSlot(0, 3)).toBe(null);
    expect(inv.wearSlot(5, 3)).toBe(null);
    expect(inv.slots[0].n).toBe(5);
  });

  it("finds the most worn tool, and repairs it to full", () => {
    const inv = new Inventory();
    inv.add("pick_stone", 1);
    inv.add("pick_stone", 1);
    inv.wearSlot(1, 90);
    expect(inv.findWorn("pick_stone")).toBe(1);
    expect(inv.repairSlot(1)).toBe(true);
    expect(inv.slots[1].dur).toBe(120);
    expect(inv.findWorn("pick_metal")).toBe(-1);
  });

  it("removes the most worn tool first, keeping the fresh one", () => {
    const inv = new Inventory();
    inv.add("pick_stone", 1);
    inv.add("pick_stone", 1);
    inv.wearSlot(0, 100); // slot 0 is the worn one
    inv.remove("pick_stone", 1);
    const left = inv.slots.find((s) => s && s.item === "pick_stone");
    expect(left.dur).toBe(120);
  });

  // Review Focus 1
  it("round-trips durability through JSON", () => {
    const inv = new Inventory();
    inv.add("pick_stone", 1);
    inv.wearSlot(0, 45);
    const back = Inventory.fromJSON(JSON.parse(JSON.stringify(inv.toJSON())));
    expect(back.slots[0].dur).toBe(75);
  });

  // Review Focus 2
  it("loads a spec-1 tool with no dur at full durability, never broken", () => {
    const back = Inventory.fromJSON([{ item: "pick_metal", n: 1 }]);
    expect(back.slots[0].dur).toBe(400);
  });

  // Review Focus 3
  it("clamps a dur that is out of range, negative or not a number", () => {
    expect(Inventory.fromJSON([{ item: "pick_stone", n: 1, dur: 9999 }]).slots[0].dur).toBe(120);
    expect(Inventory.fromJSON([{ item: "pick_stone", n: 1, dur: -5 }]).slots[0].dur).toBe(0);
    expect(Inventory.fromJSON([{ item: "pick_stone", n: 1, dur: "x" }]).slots[0].dur).toBe(120);
    expect(Inventory.fromJSON([{ item: "pick_stone", n: 1, dur: NaN }]).slots[0].dur).toBe(120);
  });

  it("never lets a tool slot hold more than one", () => {
    const inv = new Inventory();
    inv.add("pick_stone", 3);
    expect(inv.slots.filter((s) => s).length).toBe(3);
    inv.slots.filter((s) => s).forEach((s) => expect(s.n).toBe(1));
  });
});
