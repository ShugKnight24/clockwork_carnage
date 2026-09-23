// tests/unit/rpg-inventory-ops.test.js
import { describe, it, expect } from "vitest";
import { takeStack, dropStack, returnStack, shiftMove } from "../../src/rpg/inventory-ops.js";
import { Inventory } from "../../src/rpg/inventory.js";

const total = (inv, carried) =>
  inv.slots.reduce((t, s) => t + (s ? s.n : 0), 0) + (carried ? carried.n : 0);

describe("takeStack", () => {
  it("lifts the whole stack off the slot", () => {
    const inv = new Inventory();
    inv.add("stone", 20);
    const carried = takeStack(inv, 0);
    expect(carried).toEqual({ item: "stone", n: 20 });
    expect(inv.slots[0]).toBe(null);
    expect(total(inv, carried)).toBe(20);
  });

  it("carries a tool's durability with it", () => {
    const inv = new Inventory();
    inv.add("pick_stone", 1);
    inv.wearSlot(0, 40);
    expect(takeStack(inv, 0)).toEqual({ item: "pick_stone", n: 1, dur: 80 });
  });

  it("returns null for an empty or out-of-range slot", () => {
    const inv = new Inventory();
    expect(takeStack(inv, 0)).toBe(null);
    expect(takeStack(inv, 99)).toBe(null);
    expect(takeStack(inv, -1)).toBe(null);
  });
});

describe("dropStack", () => {
  it("fills an empty slot and leaves nothing carried", () => {
    const inv = new Inventory();
    const carried = { item: "stone", n: 5 };
    expect(dropStack(inv, 3, carried)).toBe(null);
    expect(inv.slots[3]).toEqual({ item: "stone", n: 5 });
    expect(total(inv, null)).toBe(5);
  });

  // Review Focus 2
  it("merges up to the stack size and keeps the remainder carried", () => {
    const inv = new Inventory();
    inv.add("stone", 60);
    const left = dropStack(inv, 0, { item: "stone", n: 10 });
    expect(inv.slots[0].n).toBe(64);
    expect(left).toEqual({ item: "stone", n: 6 });
    expect(total(inv, left)).toBe(70);
  });

  it("swaps when the slot holds a different item", () => {
    const inv = new Inventory();
    inv.add("stone", 5);
    const left = dropStack(inv, 0, { item: "rock", n: 3 });
    expect(inv.slots[0]).toEqual({ item: "rock", n: 3 });
    expect(left).toEqual({ item: "stone", n: 5 });
    expect(total(inv, left)).toBe(8);
  });

  it("swaps rather than merging two tools, since their stack is one", () => {
    const inv = new Inventory();
    inv.add("pick_stone", 1);
    const left = dropStack(inv, 0, { item: "pick_stone", n: 1, dur: 10 });
    expect(inv.slots[0].dur).toBe(10);
    expect(left).toEqual({ item: "pick_stone", n: 1, dur: 120 });
  });

  it("refuses an out-of-range slot and keeps the stack carried", () => {
    const inv = new Inventory();
    const carried = { item: "stone", n: 5 };
    expect(dropStack(inv, 99, carried)).toBe(carried);
    expect(total(inv, carried)).toBe(5);
  });
});

describe("returnStack", () => {
  // Review Focus 1
  it("puts a carried stack back and never loses it", () => {
    const inv = new Inventory();
    inv.add("stone", 64);
    const carried = { item: "rock", n: 7 };
    expect(returnStack(inv, carried)).toBe(null);
    expect(inv.count("rock")).toBe(7);
  });

  it("keeps the stack carried when there is genuinely nowhere for it", () => {
    const inv = new Inventory(1);
    inv.add("stone", 64);
    const carried = { item: "rock", n: 7 };
    expect(returnStack(inv, carried)).toEqual(carried);
    expect(inv.count("rock")).toBe(0);
  });

  it("is a no-op with nothing carried", () => {
    expect(returnStack(new Inventory(), null)).toBe(null);
  });
});

describe("shiftMove", () => {
  it("moves a backpack stack to the first free hotbar slot", () => {
    const inv = new Inventory();
    inv.add("stone", 64); // slot 0, hotbar
    inv.slots[9] = { item: "rock", n: 5 };
    shiftMove(inv, 9);
    expect(inv.slots[9]).toBe(null);
    expect(inv.slots[1]).toEqual({ item: "rock", n: 5 });
  });

  it("moves a hotbar stack to the backpack", () => {
    const inv = new Inventory();
    inv.add("stone", 5);
    shiftMove(inv, 0);
    expect(inv.slots[0]).toBe(null);
    expect(inv.slots[9]).toEqual({ item: "stone", n: 5 });
  });

  it("leaves the stack alone when the other region is full", () => {
    const inv = new Inventory();
    for (let i = 9; i < 36; i++) inv.slots[i] = { item: "dirt", n: 64 };
    inv.add("stone", 5);
    shiftMove(inv, 0);
    expect(inv.slots[0]).toEqual({ item: "stone", n: 5 });
  });

  it("conserves totals in every case", () => {
    const inv = new Inventory();
    inv.add("stone", 70);
    inv.add("rock", 3);
    const before = total(inv, null);
    for (const i of [0, 1, 9, 35, -1, 99]) shiftMove(inv, i);
    expect(total(inv, null)).toBe(before);
  });
});
