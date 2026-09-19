// Map legend:
// 0 = empty, 1 = stone, 2 = tech, 3 = metal, 4 = energy, 5 = door, 6 = secret
// 7 = boss wall, 8 = glass, 9 = temporal rift wall

import { ACT1_LEVELS } from "./act1-maps.js";
import { ACT2_LEVELS } from "./act2-maps.js";
import { ACT3_LEVELS } from "./act3-maps.js";
import { rotateLevel, varyCover } from "./map-helpers.js";
import { SeededRNG } from "../../utils/seeded-rng.js";

/**
 * Quarter turns applied per level, by index.
 *
 * Every level was hand-built on the same skeleton — a 60x60 grid entered from
 * the south and exited due north — and eight of the nine started on the exact
 * same tile. Turning some of them gives the campaign four approach axes
 * instead of one, without re-authoring a room: the rooms, cover and encounters
 * are untouched, only which way the level runs changes.
 *
 * Level 7 is left alone: it already runs west-to-east, which is why it was the
 * one level that did not read like all the others.
 */
const ROTATIONS = [0, 90, 0, 0, 180, 0, 0, 270, 0];

export const CAMPAIGN_LEVELS = [...ACT1_LEVELS, ...ACT2_LEVELS, ...ACT3_LEVELS].map(
  // Vary the cover first, then turn the finished level: the variation pass
  // reads the grid's own neighbourhoods, so it does not care which way up the
  // level ends. The seed is fixed per level, so a given level is the same map
  // on every machine and in every run.
  (level, i) => rotateLevel(varyCover(level, new SeededRNG(7919 + i * 104729)), ROTATIONS[i] || 0),
);
