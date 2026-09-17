/**
 * Define read/write accessors on `target` that forward to a property of a
 * sub-object, e.g. `game.killStreak` ↔ `game.killStreakSystem.streak`.
 *
 * The sub-object is looked up on every access (`this[sourceKey]`), so
 * replacing it later keeps the aliases pointing at the new instance.
 * Works on an instance or on a class prototype.
 *
 * @param {object} target
 * @param {string} sourceKey - property on `this` that holds the real owner
 * @param {Record<string, string>} aliases - alias name → property on the owner
 */
export function forwardProps(target, sourceKey, aliases) {
  for (const [alias, key] of Object.entries(aliases)) {
    Object.defineProperty(target, alias, {
      get() {
        return this[sourceKey][key];
      },
      set(v) {
        this[sourceKey][key] = v;
      },
      configurable: true,
    });
  }
}
