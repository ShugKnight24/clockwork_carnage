// src/rpg/tools.js
/**
 * Tool tiers. `mult` scales break time, so lower is faster. The best tool held
 * is chosen automatically — there is deliberately no equip UI before the
 * hotbar redesign. Durability is not modelled; it arrives with stations.
 */
export const TOOLS = {
  HAND: { id: "hand", name: "Bare Hands", item: null, mult: 1.0, tier: 0, durability: Infinity, repair: [] },
  PICK_STONE: { id: "pick_stone", name: "Stone Pickaxe", item: "pick_stone", mult: 0.75, tier: 1, durability: 120, repair: [["stone", 1], ["rock", 1]] },
  PICK_METAL: { id: "pick_metal", name: "Metal Pickaxe", item: "pick_metal", mult: 0.55, tier: 2, durability: 400, repair: [["metal", 1], ["rock", 1]] },
};

const BY_ITEM = new Map(
  Object.values(TOOLS).filter((t) => t.item).map((t) => [t.item, t]),
);

export const toolForItem = (itemId) => BY_ITEM.get(itemId) || null;

/**
 * The best usable tool held, and the slot holding it. A tool at zero
 * durability is skipped entirely, so a spent pickaxe never beats an intact
 * lesser one — and bare hands are always the floor.
 * @returns {{tool: object, slot: number}} slot is -1 for TOOLS.HAND
 */
export function bestTool(inventory) {
  const none = { tool: TOOLS.HAND, slot: -1 };
  if (!inventory?.slots) return none;
  let best = none;
  for (let i = 0; i < inventory.slots.length; i++) {
    const s = inventory.slots[i];
    if (!s) continue;
    const tool = BY_ITEM.get(s.item);
    if (!tool || (s.dur ?? tool.durability) <= 0) continue;
    if (tool.tier > best.tool.tier) best = { tool, slot: i };
    // Same tier: take the least worn, so wear spreads instead of destroying one.
    else if (tool.tier === best.tool.tier && best.slot >= 0 &&
             (s.dur ?? 0) > (inventory.slots[best.slot].dur ?? 0)) best = { tool, slot: i };
  }
  return best;
}
