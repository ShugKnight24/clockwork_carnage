/**
 * Freeze an object and every plain object or array reachable from it.
 * Functions are left as they are (painters stay callable, not frozen).
 * @template T
 * @param {T} value
 * @returns {T} the same value, frozen
 */
export function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const v of Object.values(value)) deepFreeze(v);
  return Object.freeze(value);
}

/** A Set whose add, delete and clear throw: membership fixed at construction. */
class ReadonlySet extends Set {
  constructor(items = []) {
    super();
    for (const v of items) Set.prototype.add.call(this, v);
    Object.freeze(this);
  }
  add() {
    throw new TypeError("read-only set: add");
  }
  delete() {
    throw new TypeError("read-only set: delete");
  }
  clear() {
    throw new TypeError("read-only set: clear");
  }
}

/**
 * A read-only Set of the given items.
 * @template T
 * @param {Iterable<T>} items
 * @returns {ReadonlySet<T>}
 */
export const readonlySet = (items) => new ReadonlySet(items);
