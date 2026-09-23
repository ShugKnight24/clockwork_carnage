// src/rpg/survival-session.js
/**
 * Owns every RPG module and is the only object ForgeMode touches. Keeping the
 * Forge's knowledge to one nullable field is what lets creative mode stay
 * byte-identical to before.
 */
import { World, colKey } from "../world/world.js";
import { Inventory } from "./inventory.js";
import { Skills } from "./skills.js";
import { bestTool, TOOLS } from "./tools.js";
import { canMine, breakTime, dropsFor, xpFor } from "./gather.js";
import { itemById, blockForItem } from "./items.js";
import { craft as craftRecipe, canCraft } from "./crafting.js";
import { availableRecipes, recipeById } from "./recipes.js";
import { stationsInRange } from "./stations.js";

/** Bytes of placed bits per 16 × 16 × 64 column. */
const COLUMN_BYTES = (16 * 16 * World.H) >> 3;

/** Durability spent per block broken. */
const WEAR_PER_BLOCK = 1;

export class SurvivalSession {
  constructor({ skills, inventory } = {}) {
    this.skills = skills || new Skills();
    this.inventory = inventory || new Inventory();
    /**
     * One bit per cell: was this block placed by the player? See spec §6.
     * Sparse, one 2 KB bitset per column that has any, so it assumes no world
     * size. The endless-world spec §12 later moves these into the world.
     * @type {Map<number, Uint8Array>} colKey -> bits
     */
    this.placed = new Map();
    this.breaking = null; // { cell, blockId, elapsed, need, toolSlot, toolItem }
    this.progress = 0;
  }

  tool() { return bestTool(this.inventory).tool; }

  /** @returns {{tool:object, slot:number}} the tool that will take the wear */
  toolSlot() { return bestTool(this.inventory); }

  miningLevel() { return this.skills.level("mining"); }

  // ─── The placed-block bitset ──────────────────────────────

  _bit(x, y, z) { return (z << 8) | ((y & 15) << 4) | (x & 15); }

  markPlaced(x, y, z) {
    if (z < 0 || z >= World.H) return;
    const key = colKey(x >> 4, y >> 4);
    let bits = this.placed.get(key);
    if (!bits) this.placed.set(key, (bits = new Uint8Array(COLUMN_BYTES)));
    const i = this._bit(x, y, z);
    bits[i >> 3] |= 1 << (i & 7);
  }

  clearPlaced(x, y, z) {
    const bits = this.placed.get(colKey(x >> 4, y >> 4));
    if (!bits || z < 0 || z >= World.H) return;
    const i = this._bit(x, y, z);
    bits[i >> 3] &= ~(1 << (i & 7));
  }

  /**
   * The bitset is world-local: one session outlives every world switch, and
   * the bits are absolute coordinates, so without this a block placed in one
   * world would silently cost the xp of a natural block at the same cell in
   * the next. Progression itself is deliberately NOT reset — it is
   * per-character and carries across worlds.
   */
  resetPlaced() { this.placed.clear(); this.cancelBreak(); }

  wasPlaced(x, y, z) {
    const bits = this.placed.get(colKey(x >> 4, y >> 4));
    if (!bits || z < 0 || z >= World.H) return false;
    const i = this._bit(x, y, z);
    return (bits[i >> 3] & (1 << (i & 7))) !== 0;
  }

  // ─── Breaking ─────────────────────────────────────────────

  /** @returns {{ok:true}|{ok:false,reason:string}} */
  beginBreak(cell, blockId) {
    const gate = canMine(blockId, this.miningLevel());
    if (!gate.ok) { this.cancelBreak(); return gate; }

    const drop = dropsFor(blockId);
    if (drop && !this.inventory.fits(drop, 1)) {
      this.cancelBreak();
      return { ok: false, reason: "Inventory full" };
    }

    const picked = this.toolSlot();
    this.breaking = {
      cell: { ...cell },
      blockId,
      elapsed: 0,
      need: breakTime(blockId, this.miningLevel(), picked.tool),
      toolSlot: picked.slot,
      toolItem: picked.slot >= 0 ? this.inventory.slots[picked.slot].item : null,
    };
    this.progress = 0;
    return { ok: true };
  }

  cancelBreak() { this.breaking = null; this.progress = 0; }

  /**
   * Advances the in-progress break. `cell` and `blockId` are what the player
   * is looking at *now*: if either moved, the break cancels rather than
   * crediting a block that is no longer there.
   * @returns {{broke:boolean, drop?:string|null, xp?:number, leveled?:boolean}}
   */
  tickBreak(dtMs, cell, blockId) {
    const b = this.breaking;
    if (!b) return { broke: false };
    if (!(dtMs > 0) || !Number.isFinite(dtMs)) return { broke: false };
    if (!cell || cell.x !== b.cell.x || cell.y !== b.cell.y || cell.z !== b.cell.z ||
        blockId !== b.blockId) {
      this.cancelBreak();
      return { broke: false };
    }

    // Clamp the step so one stalled frame can never bank more than this block.
    b.elapsed += Math.min(dtMs, b.need);
    this.progress = Math.min(1, b.elapsed / b.need);
    if (this.progress < 1) return { broke: false };

    const { x, y, z } = b.cell;
    const drop = dropsFor(b.blockId);
    // The fit was checked at beginBreak, but that was seconds ago and the
    // player may have crafted since. Re-check, or the block is destroyed and
    // its drop silently vanishes.
    if (drop && !this.inventory.fits(drop, 1)) {
      this.cancelBreak();
      return { broke: false, reason: "Inventory full" };
    }
    const placedByPlayer = this.wasPlaced(x, y, z);
    if (drop) this.inventory.add(drop, 1);

    let granted = null;
    if (!placedByPlayer) granted = this.skills.grant("mining", xpFor(b.blockId));
    this.clearPlaced(x, y, z);
    this.cancelBreak();

    // Wear the tool that actually started this break. The slot is re-checked
    // because the player may have crafted it away while holding the button.
    let worn = false;
    const ts = b.toolSlot;
    // Taking back a block you placed costs no durability, for the same reason
    // it pays no xp: it never came from the world. The Forge's core loop is
    // revising a structure, and charging wear for every correction would tax
    // exactly the thing players are here to do.
    if (ts >= 0 && !placedByPlayer) {
      const slot = this.inventory.slots[ts];
      if (slot && slot.item === b.toolItem && slot.dur > 0) {
        worn = this.inventory.wearSlot(ts, WEAR_PER_BLOCK) === 0;
      }
    }

    return {
      broke: true,
      drop,
      xp: placedByPlayer ? 0 : xpFor(b.blockId),
      leveled: granted?.leveled ?? false,
      worn,
    };
  }

  // ─── Placing ──────────────────────────────────────────────

  /** Spends one of `itemId`. No xp, no skill gate. */
  tryPlace(itemId) {
    const item = itemById(itemId);
    if (!item) return { ok: false, reason: "Unknown item" };
    const blockId = blockForItem(itemId);
    if (blockId == null) return { ok: false, reason: `${item.name} cannot be placed` };
    if (!this.inventory.remove(itemId, 1)) {
      return { ok: false, reason: `Out of ${item.name}` };
    }
    return { ok: true, blockId };
  }

  /** Puts a placed block back after the Forge refuses the placement. */
  refund(itemId) { this.inventory.add(itemId, 1); }

  // ─── Crafting ─────────────────────────────────────────────

  /** @returns {Set<string>} stations within reach of `player` in `world` */
  stations(world, player) { return stationsInRange(world, player); }

  recipes(stations = null) { return availableRecipes(this.skills, stations); }

  /**
   * A recipe whose station is not in reach is refused by name, so the message
   * tells the player what to go and build rather than just saying no.
   */
  canCraft(recipeId, stations = null) {
    const r = recipeById(recipeId);
    if (r?.station && !(stations && new Set(stations).has(r.station))) {
      const name = r.station[0].toUpperCase() + r.station.slice(1);
      return { ok: false, reason: `Needs a ${name}` };
    }
    return canCraft(recipeId, this.inventory, this.skills);
  }

  craft(recipeId, stations = null) {
    const gate = this.canCraft(recipeId, stations);
    if (!gate.ok) return gate;
    return craftRecipe(recipeId, this.inventory, this.skills);
  }
}

