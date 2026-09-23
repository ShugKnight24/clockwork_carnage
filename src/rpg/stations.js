/**
 * Crafting stations are ordinary blocks; standing near one unlocks its recipe
 * tier. Every station in range counts, not just the closest, because a base
 * with all three built is the case that matters. Line of sight is not
 * required — a bench behind a wall you built is still your bench.
 */
import { World } from "../world/world.js";

export const STATIONS = { workbench: 16, anvil: 17, forge: 18 };
export const STATION_RADIUS = 5;

const BY_ID = new Map(Object.entries(STATIONS).map(([name, id]) => [id, name]));

/**
 * @param {import("../world/world.js").World|null} world
 * @param {{x:number,y:number,z:number}|null} player
 * @returns {Set<string>} station names within `radius` cells, possibly empty
 */
export function stationsInRange(world, player, radius = STATION_RADIUS) {
  const found = new Set();
  if (!world || !player) return found;
  const px = Math.floor(player.x), py = Math.floor(player.y), pz = Math.floor(player.z);
  if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz)) return found;

  // Only the height is clamped: get() already answers air outside the bounds,
  // and the world may sit anywhere, negative coordinates included.
  for (let z = Math.max(0, pz - radius); z <= Math.min(World.H - 1, pz + radius); z++) {
    for (let y = py - radius; y <= py + radius; y++) {
      for (let x = px - radius; x <= px + radius; x++) {
        const name = BY_ID.get(world.get(x, y, z));
        if (name) found.add(name);
      }
    }
  }
  return found;
}
