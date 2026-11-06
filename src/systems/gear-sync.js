import { GEAR_STATS } from "../data/gear-stats.js";
import { legacyGearBonuses } from "../data/legacy-gear.js";

/**
 * Gear bonuses applied to a live player as a difference, so gear put on in
 * the middle of a run (a battlefield drop, a change saved in the creator from
 * the pause menu) works at once and is never counted twice.
 */

/**
 * Bring `player` from the bonuses recorded in `player._gearApplied` to `next`
 * (gearBonuses(character)). Only the difference goes on, so a second call
 * with the same gear changes nothing. Armour is a floor rather than a sum: it
 * rises with better gear and never drops. The stats are those of GEAR_STATS
 * (src/data/gear-stats.js).
 *
 * Less ammo capacity clamps every gun's rounds to its new cap
 * (player.ammoCapOf), and the loaded rounds to what is carried; more
 * capacity adds room, never rounds.
 * @param {object} player
 * @param {Record<string, number>} next
 */
export function syncGearStats(player, next) {
  const p = player;
  const prev = p._gearApplied || {};
  const d = (k) => (next[k] || 0) - (prev[k] || 0);
  const hp = d("maxHealthAdd");
  if (hp) {
    p.maxHealth += hp;
    p.health = Math.min(p.maxHealth, p.health + Math.max(0, hp));
  }
  const chrono = d("maxChronoEnergyAdd");
  if (chrono) {
    p.maxChronoEnergy += chrono;
    p.chronoEnergy = Math.min(p.maxChronoEnergy, p.chronoEnergy);
  }
  const stamina = d("maxStaminaAdd");
  if (stamina) {
    p.maxStamina += stamina;
    p.stamina = stamina > 0 ? p.maxStamina : Math.min(p.maxStamina, p.stamina);
  }
  const dash = d("dashCostAdd");
  if (dash) p.dashStaminaCost = Math.max(8, p.dashStaminaCost + dash);
  if (next.armorAdd) p.armor = Math.max(p.armor, next.armorAdd);
  const speed = d("moveSpeedAdd");
  if (speed) p.moveSpeed += speed;
  const ammo = d("ammoCapAdd");
  if (ammo) {
    p.ammoCap = (p.ammoCap || 1) + ammo;
    if (ammo < 0) clampRounds(p);
  }
  const fire = d("fireRateAdd");
  if (fire) p.fireRateMultiplier = (p.fireRateMultiplier || 1) + fire;
  const staminaRegen = d("staminaRegenAdd");
  if (staminaRegen) p.staminaRegenRate = (p.staminaRegenRate || 1) + staminaRegen;
  const regen = d("regenAdd");
  if (regen) p.regenRate = (p.regenRate || 0) + regen;
  p._gearApplied = { ...next };
}

/**
 * Hold every gun's rounds to its cap: the guns held and any other the player
 * has rounds for. A gun not yet stocked is left alone (it is stocked with its
 * startAmmo, under any cap, when first held).
 * @param {object} p player
 */
function clampRounds(p) {
  const reserves = p.reserves || {};
  const ids = new Set([...(p.weapons || []), ...Object.keys(reserves).map(Number)]);
  for (const id of ids) {
    if (reserves[id] === undefined) continue;
    reserves[id] = Math.min(reserves[id], p.ammoCapOf(id));
    if (p.mags?.[id] > reserves[id]) p.mags[id] = reserves[id];
  }
}

/** A stored gear record: an object of finite numbers, each a GEAR_STATS key. */
function isGearRecord(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  return Object.entries(v).every(([k, n]) => k in GEAR_STATS && Number.isFinite(n));
}

/**
 * The gear bonuses a saved run's stats were built with: the save's own
 * `gearApplied`, or for a save from before it was kept, what that release's
 * gear gave for the gear worn now (legacyGearBonuses; see there for the
 * assumption). An old save does not carry maxStamina either: that comes from
 * the loadout and the gear worn now (`now`) before the save is applied, so
 * its share is today's.
 * @param {object} data the save, already applied to the player
 * @param {object} character
 * @param {Record<string, number>} now gearBonuses(character)
 * @returns {Record<string, number>}
 */
export function savedGearApplied(data, character, now) {
  if (isGearRecord(data?.gearApplied)) return { ...data.gearApplied };
  const baked = legacyGearBonuses(character);
  if (!(data && "maxStamina" in data)) {
    delete baked.maxStaminaAdd;
    if (now.maxStaminaAdd) baked.maxStaminaAdd = now.maxStaminaAdd;
  }
  return baked;
}

/**
 * Continue a saved run: the save's stats (already deserialized onto
 * `player`) hold the gear they were built with; record it, then move them to
 * the gear worn now, once. Without this a continue counted the gear twice,
 * or kept the stats of gear taken off since.
 * @param {object} player
 * @param {object} data the save
 * @param {object} character
 * @param {Record<string, number>} now gearBonuses(character)
 */
export function resumeGearStats(player, data, character, now) {
  player._gearApplied = savedGearApplied(data, character, now);
  syncGearStats(player, now);
}
