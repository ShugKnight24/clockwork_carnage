// src/rpg/inventory-ops.js
/**
 * Drag-and-drop as pure operations over an Inventory. They are here rather
 * than on the class because this is where items get destroyed if a failure
 * path is wrong, and pure functions let every one of those paths be tested
 * for conservation without a canvas or a pointer.
 *
 * A "carried" stack is `{item, n, dur?}` or null — the thing on the cursor.
 */
import { itemById } from "./items.js";
import { HOTBAR_SLOTS } from "./inventory.js";

const inRange = (inv, i) => Number.isInteger(i) && i >= 0 && i < inv.slots.length;
const copy = (s) => (s.dur == null ? { item: s.item, n: s.n } : { item: s.item, n: s.n, dur: s.dur });

/** @returns {object|null} the stack lifted off slot `i` */
export function takeStack(inv, i) {
  if (!inRange(inv, i) || !inv.slots[i]) return null;
  const carried = copy(inv.slots[i]);
  inv.slots[i] = null;
  return carried;
}

/** @returns {object|null} whatever is still carried after the drop */
export function dropStack(inv, i, carried) {
  if (!carried) return null;
  if (!inRange(inv, i)) return carried;
  const here = inv.slots[i];

  if (!here) {
    inv.slots[i] = copy(carried);
    return null;
  }

  const cap = itemById(carried.item)?.stack ?? 1;
  if (here.item === carried.item && cap > 1 && here.n < cap) {
    const take = Math.min(cap - here.n, carried.n);
    here.n += take;
    const left = carried.n - take;
    return left > 0 ? { ...carried, n: left } : null;
  }

  // Anything else is a swap, including two tools, whose stack is one.
  inv.slots[i] = copy(carried);
  return here;
}

/** Put a carried stack back anywhere it fits. @returns {object|null} */
export function returnStack(inv, carried) {
  if (!carried) return null;
  const placed = inv.add(carried.item, carried.n, carried.dur ?? null);
  const left = carried.n - placed;
  return left > 0 ? { ...carried, n: left } : null;
}

/** Move a stack between the hotbar and the backpack. */
export function shiftMove(inv, i) {
  if (!inRange(inv, i) || !inv.slots[i]) return;
  const fromHotbar = i < HOTBAR_SLOTS;
  const lo = fromHotbar ? HOTBAR_SLOTS : 0;
  const hi = fromHotbar ? inv.slots.length : HOTBAR_SLOTS;
  for (let j = lo; j < hi; j++) {
    if (inv.slots[j] === null) {
      inv.slots[j] = inv.slots[i];
      inv.slots[i] = null;
      return;
    }
  }
  // The other region is full; leave the stack where it is rather than dropping it.
}
