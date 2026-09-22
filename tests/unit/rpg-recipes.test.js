// tests/unit/rpg-recipes.test.js
import { describe, it, expect } from "vitest";
import { RECIPES, recipeById, availableRecipes } from "../../src/rpg/recipes.js";
import { itemById } from "../../src/rpg/items.js";
import { Skills } from "../../src/rpg/skills.js";

describe("recipe table", () => {
  it("references only real items and yields a positive count", () => {
    RECIPES.forEach((r) => {
      if (r.output) {
        expect(r.repairs).toBe(null);
        expect(itemById(r.output[0])).not.toBe(null);
        expect(r.output[1]).toBeGreaterThan(0);
      } else {
        // A repair yields no item, so its target stands in for the output and
        // must be just as real — and repairable, meaning it has a durability.
        expect(itemById(r.repairs)).not.toBe(null);
        expect(itemById(r.repairs).durability).toBeGreaterThan(0);
      }
      r.inputs.forEach(([id, n]) => {
        expect(itemById(id)).not.toBe(null);
        expect(n).toBeGreaterThan(0);
      });
      expect(r.xp).toBeGreaterThan(0);
      expect(r.requires.construction).toBeGreaterThanOrEqual(1);
    });
  });

  it("has unique ids and ships the basic tier station-free", () => {
    const ids = RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("cut_stone");
    expect(ids).toContain("pick_stone");
    // The basic tier stays craftable anywhere — nothing here may drift behind
    // a station, or a fresh character could never build its first workbench.
    const free = ["cut_stone", "melt_glass", "pick_stone", "pick_metal", "workbench"];
    free.forEach((id) => expect(recipeById(id).station).toBe(null));
    // Every other row names a station that actually exists.
    RECIPES.filter((r) => !free.includes(r.id)).forEach((r) => {
      expect(["workbench", "anvil", "forge"]).toContain(r.station);
    });
  });

  it("never closes a cycle that returns its own inputs", () => {
    // A recipe whose output is also one of its inputs would be an xp loop.
    // A repair that consumed the tool it restores would be the same loop.
    RECIPES.forEach((r) => {
      expect(r.inputs.map(([id]) => id)).not.toContain(r.output ? r.output[0] : r.repairs);
    });
  });

  it("cannot be corrupted through a row handed out by availableRecipes", () => {
    const row = availableRecipes(new Skills())[0];
    const source = RECIPES.find((r) => r.id === row.id);
    const before = JSON.stringify(source.inputs);
    // ES modules are strict mode, so mutating the frozen table throws.
    expect(() => { row.inputs[0][1] = 999; }).toThrow();
    expect(() => { row.inputs.push(["stone", 1]); }).toThrow();
    expect(() => { RECIPES.push({}); }).toThrow();
    expect(JSON.stringify(source.inputs)).toBe(before);
  });

  it("looks a recipe up by id", () => {
    expect(recipeById("cut_stone").output).toEqual(["stone", 1]);
    expect(recipeById("nope")).toBe(null);
  });
});

describe("availableRecipes", () => {
  it("returns what the construction level allows, with the rest marked locked", () => {
    const s = new Skills();
    const low = availableRecipes(s);
    expect(low.find((r) => r.id === "cut_stone").locked).toBe(false);
    expect(low.find((r) => r.id === "pick_metal").locked).toBe(true);
    expect(low.find((r) => r.id === "pick_metal").reason).toBe("Requires Construction 10");
  });

  it("unlocks as construction rises", () => {
    const s = new Skills({ construction: 10_000 });
    expect(availableRecipes(s).every((r) => r.locked === false)).toBe(true);
  });

  it("filters out recipes needing a station this caller does not have", () => {
    const s = new Skills({ construction: 10_000 });
    const withStation = [...RECIPES, {
      id: "x", inputs: [["stone", 1]], output: ["metal", 1],
      requires: { construction: 1 }, xp: 1, station: "workbench",
    }];
    const shown = availableRecipes(s, null, withStation);
    expect(shown.find((r) => r.id === "x")).toBe(undefined);
    expect(availableRecipes(s, "workbench", withStation).find((r) => r.id === "x")).toBeTruthy();
  });
});

describe("station tiers", () => {
  it("puts smelting at the workbench, not the forge, so ore is never dead weight", () => {
    expect(recipeById("smelt_metal").station).toBe("workbench");
  });

  it("gates the three station builds in ladder order", () => {
    expect(recipeById("workbench").station).toBe(null);
    expect(recipeById("anvil").station).toBe("workbench");
    expect(recipeById("forge").station).toBe("workbench");
    expect(recipeById("anvil").requires.construction)
      .toBeLessThan(recipeById("forge").requires.construction);
  });

  it("gives repair recipes a repairs target and no output", () => {
    const r = recipeById("repair_pick_stone");
    expect(r.repairs).toBe("pick_stone");
    expect(r.output).toBe(null);
    expect(r.station).toBe("anvil");
    expect(recipeById("repair_pick_metal").repairs).toBe("pick_metal");
  });

  it("keeps every non-repair recipe acyclic and pointing at real items", () => {
    RECIPES.forEach((r) => {
      r.inputs.forEach(([id]) => expect(itemById(id)).not.toBe(null));
      if (r.output) {
        expect(itemById(r.output[0])).not.toBe(null);
        expect(r.inputs.map(([id]) => id)).not.toContain(r.output[0]);
      } else {
        expect(itemById(r.repairs)).not.toBe(null);
      }
    });
  });
});

describe("availableRecipes with a set of stations", () => {
  const maxed = () => new Skills({ construction: 100_000 });

  it("shows only station-free rows when nothing is in range", () => {
    const rows = availableRecipes(maxed(), null);
    expect(rows.every((r) => r.station === null)).toBe(true);
    expect(rows.find((r) => r.id === "anvil")).toBe(undefined);
  });

  it("accepts a single station name, an array, and a Set alike", () => {
    const ids = (arg) => availableRecipes(maxed(), arg).map((r) => r.id).sort();
    expect(ids("workbench")).toEqual(ids(["workbench"]));
    expect(ids("workbench")).toEqual(ids(new Set(["workbench"])));
    expect(ids("workbench")).toContain("anvil");
  });

  it("shows every in-range station's rows at once, so repairs stay reachable", () => {
    const rows = availableRecipes(maxed(), new Set(["workbench", "anvil", "forge"]));
    const ids = rows.map((r) => r.id);
    expect(ids).toContain("cut_stone");       // station-free
    expect(ids).toContain("anvil");           // workbench
    expect(ids).toContain("repair_pick_stone"); // anvil
    expect(ids).toContain("cast_energy");     // forge
  });

  it("hides a station's rows once it is out of range", () => {
    const ids = availableRecipes(maxed(), new Set(["workbench"])).map((r) => r.id);
    expect(ids).not.toContain("repair_pick_stone");
    expect(ids).not.toContain("cast_energy");
  });
});

describe("a repair must never consume the tool it restores", () => {
  it("keeps every repair's own tool out of its inputs", () => {
    // craft() removes inputs most-worn-first, so a repair listing its own tool
    // would consume the exact slot canCraft approved. findWorn would then miss,
    // repairSlot(-1) would quietly return false, and craft would still report
    // success — inputs gone, nothing repaired.
    RECIPES.filter((r) => r.repairs).forEach((r) => {
      expect(r.inputs.map(([id]) => id)).not.toContain(r.repairs);
    });
  });

  it("points every repair at an item that can actually wear", () => {
    RECIPES.filter((r) => r.repairs).forEach((r) => {
      expect(itemById(r.repairs)?.durability).toBeGreaterThan(0);
    });
  });
});
