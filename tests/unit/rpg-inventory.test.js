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
