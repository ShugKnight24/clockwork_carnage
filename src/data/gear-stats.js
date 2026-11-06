/**
 * The stats gear may tune, shared by every piece's `bonuses` (armour, frames,
 * helmets, visors, shoulders, accessories) and the origins: how each reads on
 * a tile, and what it is worth.
 *
 * A piece gets a stat only when a player would guess it from the piece (plate
 * gives armour, a gun belt carries rounds); a piece nothing fits is looks
 * only. gearBonuses (src/data/cosmetics.js) sums what is worn and
 * syncGearStats (src/systems/gear-sync.js) puts it on the player:
 *   maxHealthAdd       → maxHealth
 *   armorAdd           → armor (a floor, not a sum)
 *   maxStaminaAdd      → maxStamina
 *   maxChronoEnergyAdd → maxChronoEnergy
 *   moveSpeedAdd       → moveSpeed (base 3.5)
 *   dashCostAdd        → dashStaminaCost
 *   ammoCapAdd         → ammoCap (multiplier on every gun's maxAmmo, base 1)
 *   fireRateAdd        → fireRateMultiplier (higher is faster, base 1)
 *   staminaRegenAdd    → staminaRegenRate (multiplier, base 1)
 *   regenAdd           → regenRate (health per second, base 0)
 *
 * `weight` is a stat's worth against one point of max health, for holding a
 * new piece to the budget of the old ones (gearValue). A lower dash cost is
 * worth more, so its weight is negative.
 */

/** The player's base move speed (Player.moveSpeed), which moveSpeedAdd is a share of. */
const BASE_MOVE_SPEED = 3.5;

const signed = (n) => `${n < 0 ? "-" : "+"}${Math.abs(n)}`;
const percent = (fraction) => signed(Math.round(fraction * 100));

/** @type {Readonly<Record<string, { label: (v: number) => string, weight: number }>>} */
export const GEAR_STATS = Object.freeze({
  maxHealthAdd: { label: (v) => `${signed(v)} max health`, weight: 1 },
  armorAdd: { label: (v) => `${signed(v)} armour`, weight: 3 },
  maxStaminaAdd: { label: (v) => `${signed(v)} stamina`, weight: 0.5 },
  maxChronoEnergyAdd: { label: (v) => `${signed(v)} chrono energy`, weight: 0.5 },
  moveSpeedAdd: { label: (v) => `${percent(v / BASE_MOVE_SPEED)}% move speed`, weight: 60 },
  dashCostAdd: { label: (v) => `${signed(v)} stamina per dash`, weight: -1.5 },
  ammoCapAdd: { label: (v) => `${percent(v)}% ammo capacity`, weight: 60 },
  fireRateAdd: { label: (v) => `${percent(v)}% fire rate`, weight: 160 },
  staminaRegenAdd: { label: (v) => `${percent(v)}% stamina regen`, weight: 40 },
  regenAdd: { label: (v) => `${signed(v)} health per second`, weight: 50 },
});

/** A stat of the vocabulary; any other key is a bug in a piece's data and throws. */
function stat(key) {
  const s = GEAR_STATS[key];
  if (!s) throw new Error(`gear stat "${key}" is not one of ${Object.keys(GEAR_STATS).join(", ")}`);
  return s;
}

/** A piece's stats that do anything, in the piece's own order. */
const entries = (bonuses) => Object.entries(bonuses || {}).filter(([, v]) => v);

/**
 * A piece's stats as its tile says them ("+3 armour · -3% move speed"), or
 * "Looks only" for a piece with none.
 * @param {Record<string, number>|null|undefined} bonuses
 * @returns {string}
 */
export function bonusText(bonuses) {
  const parts = entries(bonuses).map(([key, v]) => stat(key).label(v));
  return parts.length ? parts.join(" · ") : "Looks only";
}

/**
 * What a piece's stats are worth, in points of max health: Σ value × weight.
 * @param {Record<string, number>|null|undefined} bonuses
 * @returns {number}
 */
export function gearValue(bonuses) {
  return entries(bonuses).reduce((sum, [key, v]) => sum + v * stat(key).weight, 0);
}
