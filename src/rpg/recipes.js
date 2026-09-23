// src/rpg/recipes.js
/**
 * The crafting table. Every output is a block or an item that already exists,
 * so this adds no atlas art. `station: null` means craftable anywhere; the other tiers
 * name the station that must be within reach, and are hidden otherwise.
 */
const recipe = (id, name, inputs, output, construction, xp, station = null) =>
  ({ id, name, inputs, output, requires: { construction }, xp, station, repairs: null });

/** A repair consumes its inputs and restores a worn tool; it yields no item. */
const repair = (id, name, inputs, toolId, construction, xp, station) =>
  ({ id, name, inputs, output: null, requires: { construction }, xp, station, repairs: toolId });

export const RECIPES = [
  recipe("cut_stone",   "Cut Stone",     [["rock", 2]],                          ["stone", 1],      1,  10),
  recipe("melt_glass",  "Melt Glass",    [["sand", 4]],                          ["glass", 1],      1,  15),
  recipe("pick_stone",  "Stone Pickaxe", [["stone", 3], ["rock", 2]],            ["pick_stone", 1], 1,  25),
  recipe("pick_metal",  "Metal Pickaxe", [["metal", 3], ["rock", 2]],            ["pick_metal", 1], 10, 60),
  recipe("workbench",   "Workbench",     [["stone", 10], ["metal", 2]],          ["workbench", 1],  5,  100),
  recipe("saw_planks",  "Saw Planks",    [["log", 1]],                           ["planks", 4],     1,  5),

  recipe("smelt_metal", "Smelt Metal",   [["ore", 2]],                           ["metal", 1],      5,  30, "workbench"),
  recipe("reinforce",   "Reinforce Stone", [["stone", 4], ["metal", 1]],         ["tech", 2],       6,  40, "workbench"),
  recipe("anvil",       "Anvil",         [["metal", 6], ["stone", 4]],           ["anvil", 1],      8,  200, "workbench"),
  recipe("forge",       "Forge",         [["stone", 12], ["metal", 8], ["energy", 2]], ["forge", 1], 15, 400, "workbench"),
  recipe("bucket",      "Bucket",        [["metal", 3]],                         ["bucket", 1],     5,  30, "workbench"),
  recipe("wood_door",   "Wooden Door",   [["planks", 6]],                        ["door", 1],       3,  20, "workbench"),

  repair("repair_pick_stone", "Repair Stone Pickaxe", [["stone", 1], ["rock", 1]], "pick_stone", 1,  15, "anvil"),
  repair("repair_pick_metal", "Repair Metal Pickaxe", [["metal", 1], ["rock", 1]], "pick_metal", 10, 35, "anvil"),

  recipe("cast_energy", "Cast Energy",   [["ore", 4], ["glass", 2]],             ["energy", 1],     18, 90, "forge"),
  recipe("bind_rift",   "Bind Rift",     [["energy", 4], ["secret", 1]],         ["rift", 1],       25, 200, "forge"),
];

/**
 * `availableRecipes` hands out shallow copies whose `inputs` still point at
 * these arrays, so the table is frozen rather than copied per call: the menu
 * rebuilds on every keypress, and freezing costs nothing at runtime while
 * making accidental mutation of the global table throw instead of corrupt.
 */
for (const r of RECIPES) {
  r.inputs.forEach(Object.freeze);
  Object.freeze(r.inputs);
  Object.freeze(r.output);
  Object.freeze(r.requires);
  Object.freeze(r);
}
Object.freeze(RECIPES);

const BY_ID = new Map(RECIPES.map((r) => [r.id, r]));

export const recipeById = (id) => BY_ID.get(id) || null;

/**
 * Recipes reachable right now: the station-free tier plus every station in
 * range. Rows the player's level does not reach are returned locked rather
 * than hidden, so levelling has a visible destination — but a station you are
 * not standing at is hidden, because it is not a goal you can act on here.
 * @param {string|string[]|Set<string>|null} stations
 * @returns {Array<object & {locked:boolean, reason:string|null}>}
 */
export function availableRecipes(skills, stations = null, table = RECIPES) {
  // A number or a plain object is not iterable, and `new Set(5)` throws. A
  // bad argument should show the station-free tier, not crash the craft menu.
  const iterable = stations != null && typeof stations[Symbol.iterator] === "function";
  const inRange =
    stations == null ? new Set() :
    typeof stations === "string" ? new Set([stations]) :
    iterable ? new Set(stations) : new Set();
  return table
    .filter((r) => r.station === null || inRange.has(r.station))
    .map((r) => {
      const need = r.requires.construction;
      const locked = skills.level("construction") < need;
      return { ...r, locked, reason: locked ? `Requires Construction ${need}` : null };
    });
}
