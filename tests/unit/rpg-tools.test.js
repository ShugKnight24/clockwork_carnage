// tests/unit/rpg-tools.test.js
import { describe, it, expect } from "vitest";
import { TOOLS, toolForItem, bestTool } from "../../src/rpg/tools.js";
import { Inventory } from "../../src/rpg/inventory.js";
import { itemById } from "../../src/rpg/items.js";

describe("tools", () => {
  it("orders tiers so a better tool always has a smaller multiplier", () => {
    expect(TOOLS.HAND.mult).toBe(1);
    expect(TOOLS.HAND.tier).toBe(0);
    expect(TOOLS.PICK_STONE.mult).toBeLessThan(TOOLS.HAND.mult);
    expect(TOOLS.PICK_METAL.mult).toBeLessThan(TOOLS.PICK_STONE.mult);
    expect(TOOLS.PICK_METAL.tier).toBeGreaterThan(TOOLS.PICK_STONE.tier);
  });

  it("maps pickaxe items to tools and everything else to nothing", () => {
    expect(toolForItem("pick_stone")).toBe(TOOLS.PICK_STONE);
    expect(toolForItem("pick_metal")).toBe(TOOLS.PICK_METAL);
    expect(toolForItem("stone")).toBe(null);
    expect(toolForItem("nope")).toBe(null);
  });

  it("picks the best tier held, and bare hands when none is", () => {
    const empty = new Inventory();
    expect(bestTool(empty)).toBe(TOOLS.HAND);

    const stone = new Inventory();
    stone.add("pick_stone", 1);
    expect(bestTool(stone)).toBe(TOOLS.PICK_STONE);

    const both = new Inventory();
    both.add("pick_stone", 1);
    both.add("pick_metal", 1);
    expect(bestTool(both)).toBe(TOOLS.PICK_METAL);

    const reversed = new Inventory();
    reversed.add("pick_metal", 1);
    reversed.add("pick_stone", 1);
    expect(bestTool(reversed)).toBe(TOOLS.PICK_METAL);
  });

  it("falls back to hands for a null inventory", () => {
    expect(bestTool(null)).toBe(TOOLS.HAND);
  });
});

describe("durability tables", () => {
  it("gives every real tool a durability and a repair cost", () => {
    for (const t of [TOOLS.PICK_STONE, TOOLS.PICK_METAL]) {
      expect(t.durability).toBeGreaterThan(0);
      expect(Array.isArray(t.repair)).toBe(true);
      expect(t.repair.length).toBeGreaterThan(0);
      t.repair.forEach(([id, n]) => {
        expect(typeof id).toBe("string");
        expect(n).toBeGreaterThan(0);
      });
    }
    expect(TOOLS.HAND.durability).toBe(Infinity);
    expect(TOOLS.HAND.repair).toEqual([]);
  });

  it("makes the better tool last longer", () => {
    expect(TOOLS.PICK_METAL.durability).toBeGreaterThan(TOOLS.PICK_STONE.durability);
  });

  it("agrees with the item table", () => {
    expect(TOOLS.PICK_STONE.durability).toBe(itemById("pick_stone").durability);
    expect(TOOLS.PICK_METAL.durability).toBe(itemById("pick_metal").durability);
  });
});
