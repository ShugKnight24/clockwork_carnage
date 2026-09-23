// src/rpg/items.js
/**
 * Item table for the survival Forge. Ids are strings so reordering never
 * breaks a save. `blockId` is present only on items that can be placed;
 * tools have none. Bedrock (15) and Air (0) deliberately have no item.
 */
export const STACK_MAX = 64;

const block = (id, name, blockId) => ({ id, name, stack: STACK_MAX, blockId });
const tool = (id, name, durability) => ({ id, name, stack: 1, blockId: null, durability });
/** One per slot, no block and no wear; `color` stands in for the block colour in the hotbar. */
const vessel = (id, name, color) => ({ id, name, stack: 1, blockId: null, color });

export const ITEMS = [
  block("stone", "Stone", 1),
  block("tech", "Tech Plate", 2),
  block("metal", "Metal", 3),
  block("energy", "Energy Cell", 4),
  block("door", "Door", 5),
  block("secret", "Secret Panel", 6),
  block("boss", "Boss Plate", 7),
  block("glass", "Glass", 8),
  block("rift", "Rift Shard", 9),
  block("dirt", "Dirt", 10),
  block("grass", "Grass", 11),
  block("sand", "Sand", 12),
  block("rock", "Rock", 13),
  block("ore", "Ore", 14),
  block("workbench", "Workbench", 16),
  block("anvil", "Anvil", 17),
  block("forge", "Forge", 18),
  tool("pick_stone", "Stone Pickaxe", 120),
  tool("pick_metal", "Metal Pickaxe", 400),
  block("log", "Log", 20),
  block("planks", "Planks", 22),
  block("sapling", "Sapling", 23),
  // A bucket scoops a water source and pours it back: the slot swaps between the two.
  vessel("bucket", "Bucket", "#9aa3ad"),
  vessel("bucket_water", "Water Bucket", "#2f8fbf"),
];

const BY_ID = new Map(ITEMS.map((i) => [i.id, i]));
const BY_BLOCK = new Map(ITEMS.filter((i) => i.blockId != null).map((i) => [i.blockId, i.id]));

export const itemById = (id) => BY_ID.get(id) || null;
export const itemForBlock = (blockId) => BY_BLOCK.get(blockId) ?? null;
export const blockForItem = (itemId) => BY_ID.get(itemId)?.blockId ?? null;
