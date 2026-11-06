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
