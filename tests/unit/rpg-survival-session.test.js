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
