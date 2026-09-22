// src/rpg/recipes.js
/**
 * Basic crafting tier. Every output is a block that already exists, so this
 * adds no atlas art. `station: null` means craftable anywhere; station-gated
 * tiers arrive with crafting stations and are filtered out until then.
 */
const recipe = (id, name, inputs, output, construction, xp, station = null) =>
  ({ id, name, inputs, output, requires: { construction }, xp, station });

export const RECIPES = [
  recipe("cut_stone",  "Cut Stone",     [["rock", 2]],                 ["stone", 1],      1,  10),
  recipe("melt_glass", "Melt Glass",    [["sand", 4]],                 ["glass", 1],      1,  15),
  recipe("pick_stone", "Stone Pickaxe", [["stone", 3], ["rock", 2]],   ["pick_stone", 1], 1,  25),
  recipe("smelt_metal","Smelt Metal",   [["ore", 2]],                  ["metal", 1],      5,  30),
  recipe("pick_metal", "Metal Pickaxe", [["metal", 3], ["rock", 2]],   ["pick_metal", 1], 10, 60),
];

const BY_ID = new Map(RECIPES.map((r) => [r.id, r]));

export const recipeById = (id) => BY_ID.get(id) || null;

/**
 * Recipes for the given station, each tagged with whether the player's skills
 * reach it. Locked entries are returned rather than hidden so levelling has a
 * visible destination.
 * @returns {Array<object & {locked:boolean, reason:string|null}>}
 */
export function availableRecipes(skills, station = null, table = RECIPES) {
  return table
    .filter((r) => r.station === station)
    .map((r) => {
      const need = r.requires.construction;
      const locked = skills.level("construction") < need;
      return { ...r, locked, reason: locked ? `Requires Construction ${need}` : null };
    });
}
