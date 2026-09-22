// tests/unit/rpg-items.test.js
import { describe, it, expect } from "vitest";
import { ITEMS, itemById, itemForBlock, blockForItem, STACK_MAX } from "../../src/rpg/items.js";

describe("items", () => {
  it("maps every placeable block to exactly one item and back", () => {
    const blockIds = ITEMS.filter((i) => i.blockId != null).map((i) => i.blockId);
    expect(new Set(blockIds).size).toBe(blockIds.length);
    expect(itemForBlock(1)).toBe("stone");
    expect(itemForBlock(13)).toBe("rock");
    expect(blockForItem("stone")).toBe(1);
    expect(blockForItem("glass")).toBe(8);
  });

  it("returns null for blocks and items with no counterpart", () => {
    expect(itemForBlock(0)).toBe(null);   // air
    expect(itemForBlock(15)).toBe(null);  // bedrock
    expect(itemForBlock(999)).toBe(null);
    expect(blockForItem("pick_stone")).toBe(null); // tools are not placeable
    expect(blockForItem("nope")).toBe(null);
  });

  it("gives every item a name and the shared stack size", () => {
    expect(ITEMS.length).toBeGreaterThan(0);
    ITEMS.forEach((i) => {
      expect(typeof i.name).toBe("string");
      expect(i.name.length).toBeGreaterThan(0);
      expect(i.stack).toBe(i.durability === undefined ? STACK_MAX : 1);
    });
    expect(STACK_MAX).toBe(64);
    expect(itemById("pick_metal").name).toBe("Metal Pickaxe");
    expect(itemById("nope")).toBe(null);
  });
});

describe("stacking and durability", () => {
  it("stacks materials to 64 but tools one per slot", () => {
    expect(itemById("stone").stack).toBe(64);
    expect(itemById("rock").stack).toBe(64);
    expect(itemById("pick_stone").stack).toBe(1);
    expect(itemById("pick_metal").stack).toBe(1);
  });

  it("gives tools a durability and materials none", () => {
    expect(itemById("pick_stone").durability).toBe(120);
    expect(itemById("pick_metal").durability).toBe(400);
    expect(itemById("stone").durability).toBe(undefined);
  });

  it("adds the three station items mapped to the new blocks", () => {
    expect(itemForBlock(16)).toBe("workbench");
    expect(itemForBlock(17)).toBe("anvil");
    expect(itemForBlock(18)).toBe("forge");
    expect(blockForItem("workbench")).toBe(16);
    expect(itemById("forge").name).toBe("Forge");
    expect(itemById("workbench").stack).toBe(64);
  });
});
