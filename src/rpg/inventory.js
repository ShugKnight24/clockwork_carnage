// src/rpg/inventory.js
import { STACK_MAX, itemById } from "./items.js";

export const HOTBAR_SLOTS = 9;
export const BACKPACK_SLOTS = 27;
export const TOTAL_SLOTS = HOTBAR_SLOTS + BACKPACK_SLOTS;

/** A whole, positive count. Guards every quantity entering the inventory. */
const validQty = (n) => Number.isInteger(n) && n > 0;

/**
 * A tool slot's remaining uses, clamped into the tool's range. A missing or
 * unusable value means full, never broken: a spec-1 record has no `dur` at
 * all, and reading that as zero would scrap every tool the player owns.
 */
const clampDur = (value, max) => {
  if (!Number.isFinite(value)) return max;
  return Math.max(0, Math.min(max, value));
};

export class Inventory {
  constructor(size = TOTAL_SLOTS) {
    /** @type {Array<{item:string,n:number,dur?:number}|null>} */
    this.slots = new Array(size).fill(null);
  }

  count(itemId) {
    return this.slots.reduce((t, s) => (s && s.item === itemId ? t + s.n : t), 0);
  }

  /** @returns {boolean} true when all `n` would be accepted */
  fits(itemId, n) {
    const item = itemById(itemId);
    if (!validQty(n) || !item) return false;
    const cap = item.stack;
    let room = 0;
    for (const s of this.slots) {
      // Stack-of-one items never top up an occupied slot.
      room += s === null ? cap : cap > 1 && s.item === itemId ? cap - s.n : 0;
      if (room >= n) return true;
    }
    return false;
  }

  /**
   * @param {number|null} dur starting durability for a tool; null means full
   * @returns {number} how many were actually added
   */
  add(itemId, n, dur = null) {
    const item = itemById(itemId);
    if (!validQty(n) || !item) return 0;
    const cap = item.stack;
    let left = n;
    if (cap > 1) {
      // Top up existing stacks first so the inventory stays compact.
      for (const s of this.slots) {
        if (left === 0) break;
        if (s && s.item === itemId && s.n < cap) {
          const take = Math.min(cap - s.n, left);
          s.n += take; left -= take;
        }
      }
    }
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      if (this.slots[i] !== null) continue;
      const take = Math.min(cap, left);
      const slot = { item: itemId, n: take };
      if (item.durability != null) slot.dur = clampDur(dur, item.durability);
      this.slots[i] = slot;
      left -= take;
    }
    return n - left;
  }

  /**
   * Matching slot indices, most worn first. Materials have no `dur` and sort
   * as if full — via a finite sentinel, not Infinity, because subtracting two
   * Infinities yields NaN and would leave material order resting on the
   * engine coercing that to zero and on the sort being stable.
   */
  _byWear(itemId) {
    const wear = (i) => this.slots[i].dur ?? Number.MAX_SAFE_INTEGER;
    return this.slots
      .map((s, i) => (s && s.item === itemId ? i : -1))
      .filter((i) => i >= 0)
      .sort((a, b) => wear(a) - wear(b));
  }

  /**
   * All-or-nothing, so a partial failure never destroys materials. Tools go
   * most-worn-first, so crafting after a repair never eats the fresh one.
   */
  remove(itemId, n) {
    if (!validQty(n) || this.count(itemId) < n) return false;
    let left = n;
    for (const i of this._byWear(itemId)) {
      if (left === 0) break;
      const s = this.slots[i];
      const take = Math.min(s.n, left);
      s.n -= take; left -= take;
      if (s.n === 0) this.slots[i] = null;
    }
    return true;
  }

  /** @returns {number|null} remaining durability, or null if the slot has none */
  wearSlot(i, amount) {
    const s = this.slots[i];
    if (!s || s.dur == null || !(amount > 0)) return null;
    s.dur = Math.max(0, s.dur - amount);
    return s.dur;
  }

  /** @returns {boolean} true when a tool slot was restored to full */
  repairSlot(i) {
    const s = this.slots[i];
    if (!s || s.dur == null) return false;
    // A slot can outlive its item id if the table changes under a save.
    const item = itemById(s.item);
    if (!item?.durability) return false;
    s.dur = item.durability;
    return true;
  }

  /** @returns {number} index of the most worn matching tool, or -1 */
  findWorn(itemId) {
    const idx = this._byWear(itemId).filter((i) => this.slots[i].dur != null);
    return idx.length ? idx[0] : -1;
  }

  toJSON() {
    return this.slots.map((s) =>
      s ? (s.dur == null ? { item: s.item, n: s.n } : { item: s.item, n: s.n, dur: s.dur }) : null,
    );
  }

  /**
   * Unknown item ids are dropped rather than thrown on — see player-store.
   * Without an explicit `size` the slot count is inferred from the data,
   * because `toJSON` emits one entry per slot: a clone that silently grew to
   * TOTAL_SLOTS would over-report room, and crafting's fit probe would then
   * consume inputs for an output that does not actually fit. Loading a
   * character passes `size` instead, so a truncated record cannot shrink a
   * player's pack.
   */
  static fromJSON(data, size = null) {
    if (!Array.isArray(data)) return new Inventory(size ?? TOTAL_SLOTS);
    const n = size ?? Math.min(Math.max(data.length, 1), TOTAL_SLOTS);
    const inv = new Inventory(n);
    data.slice(0, n).forEach((s, i) => {
      const item = s && itemById(s.item);
      if (!item || !validQty(s.n)) return;
      const slot = { item: s.item, n: Math.min(s.n, item.stack) };
      if (item.durability != null) slot.dur = clampDur(s.dur, item.durability);
      inv.slots[i] = slot;
    });
    return inv;
  }
}

export { STACK_MAX };
