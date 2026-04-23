// Map legend:
// 0 = empty, 1 = stone, 2 = tech, 3 = metal, 4 = energy, 5 = door, 6 = secret
// 7 = boss wall, 8 = glass, 9 = temporal rift wall

import { ACT1_LEVELS } from "./act1-maps.js";
import { ACT2_LEVELS } from "./act2-maps.js";
import { ACT3_LEVELS } from "./act3-maps.js";

export const CAMPAIGN_LEVELS = [...ACT1_LEVELS, ...ACT2_LEVELS, ...ACT3_LEVELS];
