// tests/unit/forge-hotbar.test.js
import { describe, it, expect } from "vitest";
import { hotbarCells } from "../../src/ui/forge-hud.js";
import { ForgeMode } from "../../js/forge.js";
import { World } from "../../src/world/world.js";

const make = (mode) => {
  const f = new ForgeMode({
    renderer: null, audio: { menuSelect() {}, menuConfirm() {} },
    settings: {}, keybinds: {}, canvas: null,
  });
  f._adopt(new World(mode === "survival" ? { mode } : {}), 0);
  f.active = true;
  return f;
};

describe("hotbarCells", () => {
  it("lists the creative palette, unlimited", () => {
    const cells = hotbarCells(make("creative"));
    expect(cells.length).toBe(15);
    expect(cells[14].blockId).toBe(19); // water, last
    expect(cells[0].blockId).toBe(1);
    expect(cells[0].count).toBe(0);
  });

  it("lists the nine survival hotbar slots, with counts", () => {
    const f = make("survival");
    f.survival.inventory.add("stone", 7);
    const cells = hotbarCells(f);
    expect(cells.length).toBe(9);
    expect(cells[0].count).toBe(7);
    expect(cells[0].blockId).toBe(1);
    expect(cells[1].blockId).toBe(null); // empty slot
  });

  it("shows a tool's wear in the hotbar", () => {
    const f = make("survival");
    f.survival.inventory.add("pick_stone", 1);
    f.survival.inventory.wearSlot(0, 30);
    expect(hotbarCells(f)[0].wear).toBeCloseTo(0.75, 5);
  });
});

describe("hotbar selection drives heldItem", () => {
  it("sets heldItem from the selected slot", () => {
    const f = make("survival");
    f.survival.inventory.add("stone", 4);
    f.survival.inventory.slots[2] = { item: "rock", n: 3 };
    f.selectHotbar(0);
    expect(f.heldItem).toBe("stone");
    f.selectHotbar(2);
    expect(f.heldItem).toBe("rock");
  });

  it("selects with the digit keys", () => {
    const f = make("survival");
    f.survival.inventory.slots[4] = { item: "dirt", n: 1 };
    f.handleKeyDown({ code: "Digit5" });
    expect(f.hotbarIndex).toBe(4);
    expect(f.heldItem).toBe("dirt");
  });

  // Review Focus 4
  it("keeps the selection on an emptied slot rather than jumping", () => {
    const f = make("survival");
    f.survival.inventory.slots[3] = { item: "stone", n: 1 };
    f.selectHotbar(3);
    f.survival.inventory.remove("stone", 1);
    f.refreshHeld();
    expect(f.hotbarIndex).toBe(3);
    expect(f.heldItem).toBe(null);
  });

  it("leaves creative's tile selection alone", () => {
    const f = make("creative");
    f.handleKeyDown({ code: "Digit3" });
    expect(f.heldItem).toBe(null);
    expect(f.tile).toBe(3);
  });
});
