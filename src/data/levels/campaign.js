// Map legend:
// 0 = empty, 1 = stone, 2 = tech, 3 = metal, 4 = energy, 5 = door, 6 = secret
// 7 = boss wall, 8 = glass, 9 = temporal rift wall

import { STATION_MAPS } from "./station-maps.js";
import { ACT3_MAPS } from "./act3-maps.js";
import { ACT4_MAPS } from "./act4-maps.js";
import { rotateLevel, varyCover } from "./map-helpers.js";
import { SeededRNG } from "../../utils/seeded-rng.js";
import { ACTS, getActLevel } from "../campaign/acts.js";

/** Every campaign map as authored, keyed by the id a level entry names. */
export const MAPS = { ...STATION_MAPS, ...ACT3_MAPS, ...ACT4_MAPS };

const prepared = new Map();

/**
 * The playable map for one level entry of src/data/campaign/acts.js.
 *
 * Every level was hand-built on the same skeleton — a 60x60 grid entered from
 * the south and exited due north — and eight of the nine started on the exact
 * same tile. Turning some of them (the entry's `rotation`) gives the campaign
 * four approach axes instead of one, without re-authoring a room: the rooms,
 * cover and encounters are untouched, only which way the level runs changes.
 *
 * Vary the cover first, then turn the finished level: the variation pass
 * reads the grid's own neighbourhoods, so it does not care which way up the
 * level ends. The seed is fixed per entry, so a given level is the same map
 * on every machine and in every run. Variation edits the grid in place, so it
 * works on a copy: two entries may share a map with different seeds.
 *
 * @param {{ map: string, rotation?: number, seed: number }} entry
 * @returns {object|null} shared prepared map; callers clone before mutating
 */
export function campaignMap(entry) {
  const base = entry && MAPS[entry.map];
  if (!base) return null;
  const key = `${entry.map}|${entry.seed}|${entry.rotation || 0}`;
  let level = prepared.get(key);
  if (!level) {
    level = rotateLevel(
      varyCover(structuredClone(base), new SeededRNG(entry.seed)),
      entry.rotation || 0,
    );
    prepared.set(key, level);
  }
  return level;
}

/** The map for `level` (0-based) of `act`, or null when there is no such slot. */
export function campaignLevelMap(act, level) {
  return campaignMap(getActLevel(act, level));
}

/** Each distinct prepared campaign map once, in the order the acts reach it. */
export function campaignMaps() {
  const seen = new Set();
  const out = [];
  for (const act of ACTS) {
    for (const entry of act.levels) {
      const map = campaignMap(entry);
      if (map && !seen.has(map)) {
        seen.add(map);
        out.push(map);
      }
    }
  }
  return out;
}
