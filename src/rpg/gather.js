// src/rpg/gather.js
/**
 * Gathering rules. This is the one seam between the world's block table and
 * the RPG's item table; nothing else in src/rpg imports blocks.js.
 * Every number here is a tuning knob — none may be inlined at a call site.
 */
import { BLOCKS, AIR, BEDROCK } from "../world/blocks.js";
import { itemForBlock } from "./items.js";
import { TOOLS } from "./tools.js";

const LEVEL_SPEED = 0.03; // each mining level shaves this fraction off the divisor
const MS_PER_HARDNESS = 1000;

/** blockId -> { minLevel, xp } */
export const GATHER = {
  1:  { minLevel: 1,  xp: 10 },  // Stone
  2:  { minLevel: 1,  xp: 10 },  // Tech
  3:  { minLevel: 10, xp: 20 },  // Metal
  4:  { minLevel: 1,  xp: 10 },  // Energy
  5:  { minLevel: 1,  xp: 10 },  // Door
  6:  { minLevel: 20, xp: 30 },  // Secret
  7:  { minLevel: 25, xp: 50 },  // Boss
  8:  { minLevel: 1,  xp: 10 },  // Glass
  9:  { minLevel: 25, xp: 50 },  // Rift
  10: { minLevel: 1,  xp: 5  },  // Dirt
  11: { minLevel: 1,  xp: 5  },  // Grass
  12: { minLevel: 1,  xp: 5  },  // Sand
  13: { minLevel: 5,  xp: 15 },  // Rock
  14: { minLevel: 15, xp: 35 },  // Ore
};

const entry = (blockId) => GATHER[blockId] || null;

/** @returns {{ok:true}|{ok:false,reason:string}} */
export function canMine(blockId, miningLevel) {
  const g = entry(blockId);
  if (!g || blockId === AIR || blockId === BEDROCK) {
    return { ok: false, reason: "Unbreakable" };
  }
  if (miningLevel < g.minLevel) {
    return { ok: false, reason: `Requires Mining ${g.minLevel}` };
  }
  return { ok: true };
}

/** @returns {number} milliseconds to break, or Infinity when unbreakable */
export function breakTime(blockId, level, tool = TOOLS.HAND) {
  if (!entry(blockId)) return Infinity;
  const hardness = BLOCKS[blockId]?.hardness;
  if (!Number.isFinite(hardness)) return Infinity;
  // A malformed tool would otherwise yield NaN, which makes break progress
  // NaN and the block silently unbreakable. Fall back to bare hands.
  const mult = Number.isFinite(tool?.mult) && tool.mult > 0 ? tool.mult : TOOLS.HAND.mult;
  return (hardness * MS_PER_HARDNESS * mult) / (1 + level * LEVEL_SPEED);
}

/** @returns {string|null} the item id a broken block yields */
export const dropsFor = (blockId) => (entry(blockId) ? itemForBlock(blockId) : null);

/** @returns {number} mining xp for breaking this block */
export const xpFor = (blockId) => entry(blockId)?.xp ?? 0;
