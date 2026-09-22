// src/rpg/crafting.js
import { recipeById } from "./recipes.js";
import { itemById } from "./items.js";

/**
 * Inputs are only consumed once the output is known to fit, so a full
 * inventory can never destroy materials.
 * @returns {{ok:true}|{ok:false,reason:string}}
 */
export function canCraft(recipeId, inventory, skills) {
  const r = recipeById(recipeId);
  if (!r) return { ok: false, reason: "Unknown recipe" };

  const need = r.requires.construction;
  if (skills.level("construction") < need) {
    return { ok: false, reason: `Requires Construction ${need}` };
  }

  for (const [itemId, n] of r.inputs) {
    if (inventory.count(itemId) < n) {
      return { ok: false, reason: `Need ${n} ${itemById(itemId).name}` };
    }
  }

  // A repair yields no item, so it needs a worn tool rather than a free slot.
  if (r.repairs) {
    const slot = inventory.findWorn(r.repairs);
    const full = slot >= 0 && inventory.slots[slot].dur >= itemById(r.repairs).durability;
    if (slot < 0 || full) return { ok: false, reason: "Nothing to repair" };
    return { ok: true };
  }

  // Check the output fits against the inventory as it will be *after* the
  // inputs come out, since removing them may free the slot the output needs.
  const probe = cloneInventory(inventory);
  for (const [itemId, n] of r.inputs) probe.remove(itemId, n);
  if (!probe.fits(r.output[0], r.output[1])) {
    return { ok: false, reason: "Inventory full" };
  }
  return { ok: true };
}

function cloneInventory(inventory) {
  const Ctor = inventory.constructor;
  return Ctor.fromJSON(inventory.toJSON());
}

/**
 * @returns {{ok:true,output:[string,number],leveled:boolean}|{ok:false,reason:string}}
 */
export function craft(recipeId, inventory, skills) {
  const check = canCraft(recipeId, inventory, skills);
  if (!check.ok) return check;

  const r = recipeById(recipeId);
  for (const [itemId, n] of r.inputs) inventory.remove(itemId, n);

  let repaired = null;
  if (r.repairs) {
    inventory.repairSlot(inventory.findWorn(r.repairs));
    repaired = r.repairs;
  } else {
    inventory.add(r.output[0], r.output[1]);
  }
  const granted = skills.grant("construction", r.xp);

  return {
    ok: true,
    output: r.output ? [...r.output] : null,
    repaired,
    leveled: granted?.leveled ?? false,
  };
}
