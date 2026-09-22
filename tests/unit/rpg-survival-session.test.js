// tests/unit/rpg-survival-session.test.js
import { describe, it, expect } from "vitest";
import { SurvivalSession } from "../../src/rpg/survival-session.js";
import { Inventory } from "../../src/rpg/inventory.js";
import { Skills } from "../../src/rpg/skills.js";
import { breakTime } from "../../src/rpg/gather.js";
import { TOOLS } from "../../src/rpg/tools.js";

const session = (over = {}) =>
  new SurvivalSession({ skills: new Skills(), inventory: new Inventory(), ...over });

const DIRT = { x: 1, y: 2, z: 3 }, DIRT_ID = 10;

describe("breaking", () => {
  it("refuses a gated block and reports the reason", () => {
    const s = session();
    expect(s.beginBreak({ x: 0, y: 0, z: 0 }, 14)).toEqual({ ok: false, reason: "Requires Mining 15" });
    expect(s.progress).toBe(0);
  });

  it("completes after the block's break time and yields item plus xp", () => {
    const s = session();
    expect(s.beginBreak(DIRT, DIRT_ID)).toEqual({ ok: true });
    const need = breakTime(DIRT_ID, 1, TOOLS.HAND);
    let done = s.tickBreak(need / 2, DIRT, DIRT_ID);
    expect(done.broke).toBe(false);
    expect(s.progress).toBeGreaterThan(0.4);
    done = s.tickBreak(need / 2 + 1, DIRT, DIRT_ID);
    expect(done.broke).toBe(true);
    expect(done.drop).toBe("dirt");
    expect(s.inventory.count("dirt")).toBe(1);
    expect(s.skills.xp.mining).toBe(5);
    expect(s.progress).toBe(0);
  });

  it("refuses to break when the drop has nowhere to go", () => {
    const inv = new Inventory();
    for (let i = 0; i < inv.slots.length; i++) inv.add("stone", 64);
    const s = session({ inventory: inv });
    expect(s.beginBreak(DIRT, DIRT_ID)).toEqual({ ok: false, reason: "Inventory full" });
  });

  // Review Focus 3
  it("cancels when the targeted cell or its block changes mid-break", () => {
    const s = session();
    s.beginBreak(DIRT, DIRT_ID);
    s.tickBreak(10, DIRT, DIRT_ID);
    expect(s.progress).toBeGreaterThan(0);

    expect(s.tickBreak(10, { x: 9, y: 9, z: 9 }, DIRT_ID).broke).toBe(false);
    expect(s.progress).toBe(0);

    s.beginBreak(DIRT, DIRT_ID);
    s.tickBreak(10, DIRT, DIRT_ID);
    expect(s.tickBreak(10, DIRT, 0).broke).toBe(false); // block became air
    expect(s.progress).toBe(0);
  });

  it("refuses to destroy the block when the pack filled during the break", () => {
    const s = session();
    s.beginBreak(DIRT, DIRT_ID);           // fits at this point
    s.tickBreak(10, DIRT, DIRT_ID);
    for (const slot of s.inventory.slots.keys()) s.inventory.add("stone", 64);
    expect(s.inventory.fits("dirt", 1)).toBe(false);

    const res = s.tickBreak(1e6, DIRT, DIRT_ID);
    expect(res.broke).toBe(false);          // block survives
    expect(res.reason).toBe("Inventory full");
    expect(s.inventory.count("dirt")).toBe(0);
    expect(s.skills.xp.mining).toBe(0);
    expect(s.progress).toBe(0);
  });

  // Review Focus 2
  it("credits at most one block for a single huge dt", () => {
    const s = session();
    s.beginBreak(DIRT, DIRT_ID);
    const res = s.tickBreak(600_000, DIRT, DIRT_ID);
    expect(res.broke).toBe(true);
    expect(s.inventory.count("dirt")).toBe(1);
    expect(s.skills.xp.mining).toBe(5);
  });

  it("ignores a tick with no break in progress or a bad dt", () => {
    const s = session();
    expect(s.tickBreak(100, DIRT, DIRT_ID).broke).toBe(false);
    s.beginBreak(DIRT, DIRT_ID);
    expect(s.tickBreak(NaN, DIRT, DIRT_ID).broke).toBe(false);
    expect(s.tickBreak(-5, DIRT, DIRT_ID).broke).toBe(false);
    expect(s.progress).toBe(0);
  });
});

describe("the place-and-break loop guard", () => {
  it("returns the item but grants no mining xp for a player-placed block", () => {
    const s = session();
    s.inventory.add("dirt", 1);
    expect(s.tryPlace("dirt")).toEqual({ ok: true, blockId: 10 });
    s.markPlaced(DIRT.x, DIRT.y, DIRT.z);
    expect(s.wasPlaced(DIRT.x, DIRT.y, DIRT.z)).toBe(true);

    s.beginBreak(DIRT, DIRT_ID);
    const res = s.tickBreak(1e6, DIRT, DIRT_ID);
    expect(res.broke).toBe(true);
    expect(s.inventory.count("dirt")).toBe(1); // item came back
    expect(s.skills.xp.mining).toBe(0);        // but no xp
  });
});

describe("placing", () => {
  it("spends the item and grants no xp", () => {
    const s = session();
    s.inventory.add("stone", 2);
    expect(s.tryPlace("stone")).toEqual({ ok: true, blockId: 1 });
    expect(s.inventory.count("stone")).toBe(1);
    expect(s.skills.xp.construction).toBe(0);
    expect(s.skills.xp.mining).toBe(0);
  });

  it("refuses an empty stack and a non-placeable item", () => {
    const s = session();
    expect(s.tryPlace("stone")).toEqual({ ok: false, reason: "Out of Stone" });
    s.inventory.add("pick_stone", 1);
    expect(s.tryPlace("pick_stone")).toEqual({ ok: false, reason: "Stone Pickaxe cannot be placed" });
  });
});

describe("tool and crafting pass-through", () => {
  it("uses the best pickaxe held and speeds breaking up", () => {
    const s = session();
    expect(s.tool()).toBe(TOOLS.HAND);
    s.inventory.add("pick_metal", 1);
    expect(s.tool()).toBe(TOOLS.PICK_METAL);
  });

  it("crafts through the session", () => {
    const s = session();
    s.inventory.add("rock", 2);
    expect(s.craft("cut_stone").ok).toBe(true);
    expect(s.inventory.count("stone")).toBe(1);
    expect(s.skills.xp.construction).toBe(10);
  });
});

describe("placed flags are world-local", () => {
  it("clears on a world switch but keeps skills and inventory", () => {
    const s = session();
    s.inventory.add("dirt", 1);
    s.tryPlace("dirt");
    s.markPlaced(10, 10, 10);
    s.skills.grant("mining", 500);
    s.inventory.add("rock", 3);
    expect(s.wasPlaced(10, 10, 10)).toBe(true);

    s.resetPlaced(); // what _adopt does when a new world loads

    // The same cell in the next world is natural again, so it pays xp.
    expect(s.wasPlaced(10, 10, 10)).toBe(false);
    // ...but progression is per-character and must survive the switch.
    expect(s.skills.xp.mining).toBe(500);
    expect(s.inventory.count("rock")).toBe(3);
  });

  it("abandons an in-progress break when the world changes", () => {
    const s = session();
    s.beginBreak(DIRT, DIRT_ID);
    s.tickBreak(10, DIRT, DIRT_ID);
    expect(s.progress).toBeGreaterThan(0);
    s.resetPlaced();
    expect(s.progress).toBe(0);
    expect(s.tickBreak(1e6, DIRT, DIRT_ID).broke).toBe(false);
  });
});

describe("tool wear", () => {
  const withPick = () => {
    const s = session();
    s.inventory.add("pick_stone", 1);
    return s;
  };
  const mineOnce = (s) => {
    s.beginBreak(DIRT, DIRT_ID);
    return s.tickBreak(1e6, DIRT, DIRT_ID);
  };

  it("costs one durability per block broken", () => {
    const s = withPick();
    const slot = s.inventory.slots.findIndex((x) => x && x.item === "pick_stone");
    mineOnce(s);
    expect(s.inventory.slots[slot].dur).toBe(119);
    mineOnce(s);
    expect(s.inventory.slots[slot].dur).toBe(118);
  });

  it("reports worn exactly once, on the break that empties it", () => {
    const s = withPick();
    const slot = s.inventory.slots.findIndex((x) => x && x.item === "pick_stone");
    s.inventory.wearSlot(slot, 118); // 120 - 118 = 2 uses left
    expect(mineOnce(s).worn).toBe(false);   // down to 1, not empty yet
    expect(s.inventory.slots[slot].dur).toBe(1);
    expect(mineOnce(s).worn).toBe(true);    // this is the one that empties it
    expect(s.inventory.slots[slot].dur).toBe(0);
    expect(mineOnce(s).worn).toBe(false);   // already worn, not reported again
  });

  it("falls back to bare hands once worn, so breaking gets slower", () => {
    const s = withPick();
    const slot = s.inventory.slots.findIndex((x) => x && x.item === "pick_stone");
    const fast = breakTime(DIRT_ID, 1, TOOLS.PICK_STONE);
    s.beginBreak(DIRT, DIRT_ID);
    expect(s.breaking.need).toBeCloseTo(fast, 5);
    s.cancelBreak();

    s.inventory.wearSlot(slot, 120);
    s.beginBreak(DIRT, DIRT_ID);
    expect(s.breaking.need).toBeCloseTo(breakTime(DIRT_ID, 1, TOOLS.HAND), 5);
  });

  it("grants no wear at all bare-handed", () => {
    const s = session();
    expect(mineOnce(s).worn).toBe(false);
    expect(s.inventory.slots.every((x) => !x || x.dur == null)).toBe(true);
  });

  // Review Focus 4
  it("does not wear a slot whose tool the player crafted away mid-break", () => {
    const s = withPick();
    const slot = s.inventory.slots.findIndex((x) => x && x.item === "pick_stone");
    s.beginBreak(DIRT, DIRT_ID);
    s.inventory.remove("pick_stone", 1);   // gone mid-hold
    s.inventory.add("stone", 4);           // something else now occupies the slot
    const res = s.tickBreak(1e6, DIRT, DIRT_ID);
    expect(res.broke).toBe(true);
    expect(s.inventory.slots[slot]?.dur).toBe(undefined); // the stone was not "worn"
    expect(s.inventory.count("stone")).toBe(4);
  });
});

describe("revising your own build is free", () => {
  it("costs no durability to take back a block you placed", () => {
    const s = session();
    s.inventory.add("pick_stone", 1);
    s.inventory.add("dirt", 1);
    const slot = s.inventory.slots.findIndex((x) => x && x.item === "pick_stone");

    s.tryPlace("dirt");
    s.markPlaced(DIRT.x, DIRT.y, DIRT.z);
    s.beginBreak(DIRT, DIRT_ID);
    const res = s.tickBreak(1e6, DIRT, DIRT_ID);

    expect(res.broke).toBe(true);
    expect(s.inventory.count("dirt")).toBe(1);        // the block comes back
    expect(s.skills.xp.mining).toBe(0);               // no xp, as before
    expect(s.inventory.slots[slot].dur).toBe(120);    // and no wear
  });

  it("still costs durability on a natural block", () => {
    const s = session();
    s.inventory.add("pick_stone", 1);
    const slot = s.inventory.slots.findIndex((x) => x && x.item === "pick_stone");
    s.beginBreak(DIRT, DIRT_ID);
    s.tickBreak(1e6, DIRT, DIRT_ID);
    expect(s.inventory.slots[slot].dur).toBe(119);
  });
});
