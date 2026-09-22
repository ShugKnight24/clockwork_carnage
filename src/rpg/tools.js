// src/rpg/tools.js
/**
 * Tool tiers. `mult` scales break time, so lower is faster. The best tool held
 * is chosen automatically — there is deliberately no equip UI before the
 * hotbar redesign. Durability is not modelled; it arrives with stations.
 */
export const TOOLS = {
  HAND: { id: "hand", name: "Bare Hands", item: null, mult: 1.0, tier: 0 },
  PICK_STONE: { id: "pick_stone", name: "Stone Pickaxe", item: "pick_stone", mult: 0.75, tier: 1 },
  PICK_METAL: { id: "pick_metal", name: "Metal Pickaxe", item: "pick_metal", mult: 0.55, tier: 2 },
};

const BY_ITEM = new Map(
  Object.values(TOOLS).filter((t) => t.item).map((t) => [t.item, t]),
);

export const toolForItem = (itemId) => BY_ITEM.get(itemId) || null;

/** @returns {object} the highest-tier tool in `inventory`, else `TOOLS.HAND` */
export function bestTool(inventory) {
  if (!inventory) return TOOLS.HAND;
  let best = TOOLS.HAND;
  for (const [itemId, tool] of BY_ITEM) {
    if (tool.tier > best.tier && inventory.count(itemId) > 0) best = tool;
  }
  return best;
}
