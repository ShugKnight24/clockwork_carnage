// src/rpg/inventory.js
import { STACK_MAX, itemById } from "./items.js";

export const HOTBAR_SLOTS = 9;
export const BACKPACK_SLOTS = 27;
export const TOTAL_SLOTS = HOTBAR_SLOTS + BACKPACK_SLOTS;

/** A whole, positive count. Guards every quantity entering the inventory. */
const validQty = (n) => Number.isInteger(n) && n > 0;

export class Inventory {
  constructor(size = TOTAL_SLOTS) {
    /** @type {Array<{item:string,n:number}|null>} */
    this.slots = new Array(size).fill(null);
  }

  count(itemId) {
    return this.slots.reduce((t, s) => (s && s.item === itemId ? t + s.n : t), 0);
  }

  /** @returns {boolean} true when all `n` would be accepted */
  fits(itemId, n) {
    if (!validQty(n) || !itemById(itemId)) return false;
    let room = 0;
    for (const s of this.slots) {
      room += s === null ? STACK_MAX : s.item === itemId ? STACK_MAX - s.n : 0;
      if (room >= n) return true;
    }
    return false;
  }

  /** @returns {number} how many were actually added */
  add(itemId, n) {
    if (!validQty(n) || !itemById(itemId)) return 0;
    let left = n;
    // Top up existing stacks first so the inventory stays compact.
    for (const s of this.slots) {
      if (left === 0) break;
      if (s && s.item === itemId && s.n < STACK_MAX) {
        const take = Math.min(STACK_MAX - s.n, left);
        s.n += take; left -= take;
      }
    }
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      if (this.slots[i] === null) {
        const take = Math.min(STACK_MAX, left);
        this.slots[i] = { item: itemId, n: take }; left -= take;
      }
    }
    return n - left;
  }

  /** All-or-nothing, so a partial failure never destroys materials. */
  remove(itemId, n) {
    if (!validQty(n) || this.count(itemId) < n) return false;
    let left = n;
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      const s = this.slots[i];
      if (!s || s.item !== itemId) continue;
      const take = Math.min(s.n, left);
      s.n -= take; left -= take;
      if (s.n === 0) this.slots[i] = null;
    }
    return true;
  }

  toJSON() {
    return this.slots.map((s) => (s ? { item: s.item, n: s.n } : null));
  }

  /** Unknown item ids are dropped rather than thrown on — see player-store. */
  static fromJSON(data) {
    const inv = new Inventory();
    if (!Array.isArray(data)) return inv;
    data.slice(0, TOTAL_SLOTS).forEach((s, i) => {
      if (s && itemById(s.item) && validQty(s.n)) {
        inv.slots[i] = { item: s.item, n: Math.min(s.n, STACK_MAX) };
      }
    });
    return inv;
  }
}
