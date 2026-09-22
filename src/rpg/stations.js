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

  const lo = (v) => Math.max(0, v - radius);
  for (let z = lo(pz); z <= Math.min(World.H - 1, pz + radius); z++) {
    for (let y = lo(py); y <= Math.min(World.D - 1, py + radius); y++) {
      for (let x = lo(px); x <= Math.min(World.W - 1, px + radius); x++) {
        const name = BY_ID.get(world.get(x, y, z));
        if (name) found.add(name);
      }
    }
  }
  return found;
}
