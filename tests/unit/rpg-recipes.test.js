// tests/unit/rpg-recipes.test.js
import { describe, it, expect } from "vitest";
import { RECIPES, recipeById, availableRecipes } from "../../src/rpg/recipes.js";
import { itemById } from "../../src/rpg/items.js";
import { Skills } from "../../src/rpg/skills.js";

describe("recipe table", () => {
  it("references only real items and yields a positive count", () => {
    RECIPES.forEach((r) => {
      expect(itemById(r.output[0])).not.toBe(null);
      expect(r.output[1]).toBeGreaterThan(0);
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
    expect(RECIPES.filter((r) => r.station === null).length).toBe(RECIPES.length);
  });

  it("never closes a cycle that returns its own inputs", () => {
    // A recipe whose output is also one of its inputs would be an xp loop.
    RECIPES.forEach((r) => {
      expect(r.inputs.map(([id]) => id)).not.toContain(r.output[0]);
    });
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
