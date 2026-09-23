import { describe, it, expect } from "vitest";
import { itemById, blockForItem } from "../../src/rpg/items.js";
import { recipeById, RECIPES } from "../../src/rpg/recipes.js";
import { SurvivalSession } from "../../src/rpg/survival-session.js";
import { Skills, xpForLevel } from "../../src/rpg/skills.js";
import { VESSEL_KINDS } from "../../src/world/vessels.js";

const at = (level) => new Skills({ construction: xpForLevel(level) });

describe("vessel items and recipes", () => {
  it("has one stack-of-one item per vessel kind that places no block", () => {
    for (const kind of VESSEL_KINDS) {
      expect(itemById(kind)).toMatchObject({ id: kind, stack: 1, blockId: null, vessel: kind });
      expect(blockForItem(kind)).toBe(null);
      expect(itemById(kind).color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("lashes a raft from six logs by hand", () => {
    expect(recipeById("raft")).toMatchObject({ inputs: [["log", 6]], output: ["raft", 1], station: null, requires: { construction: 1 } });
    const s = new SurvivalSession();
    s.inventory.add("log", 7);
    expect(s.craft("raft")).toMatchObject({ ok: true });
    expect(s.inventory.count("raft")).toBe(1);
    expect(s.inventory.count("log")).toBe(1);
  });

  it("builds a boat from planks and metal at a Workbench", () => {
    expect(recipeById("boat")).toMatchObject({ inputs: [["planks", 8], ["metal", 1]], output: ["boat", 1], station: "workbench" });
    const s = new SurvivalSession({ skills: at(recipeById("boat").requires.construction) });
    s.inventory.add("planks", 8); s.inventory.add("metal", 1);
    expect(s.craft("boat").ok).toBe(false); // no Workbench in reach
    expect(s.craft("boat", ["workbench"])).toMatchObject({ ok: true });
    expect(s.inventory.count("boat")).toBe(1);
    expect(s.inventory.count("planks")).toBe(0);
  });

  it("builds a jetski only at a Forge, and only at construction 15", () => {
    const r = recipeById("jetski");
    expect(r).toMatchObject({ inputs: [["metal", 8], ["energy", 2], ["tech", 2]], output: ["jetski", 1], station: "forge", requires: { construction: 15 } });
    const stock = (s) => { s.inventory.add("metal", 8); s.inventory.add("energy", 2); s.inventory.add("tech", 2); };
    const low = new SurvivalSession({ skills: at(14) });
    stock(low);
    expect(low.craft("jetski", ["forge"])).toMatchObject({ ok: false, reason: "Requires Construction 15" });
    const high = new SurvivalSession({ skills: at(15) });
    stock(high);
    expect(high.craft("jetski", ["workbench", "anvil"])).toMatchObject({ ok: false, reason: "Needs a Forge" });
    expect(high.craft("jetski", ["forge"])).toMatchObject({ ok: true });
    expect(high.inventory.count("jetski")).toBe(1);
  });

  it("every vessel recipe spends items that exist", () => {
    for (const kind of VESSEL_KINDS) {
      const r = RECIPES.find((x) => x.output?.[0] === kind);
      expect(r, kind).toBeTruthy();
      for (const [id] of r.inputs) expect(itemById(id), id).toBeTruthy();
    }
  });
});
