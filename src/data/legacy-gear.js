/**
 * The gear stats a saved run made before gear stats were saved with it was
 * built on. Frozen: never edit these numbers to follow the live tables.
 *
 * A run's save carries its player's stats with the gear's bonuses already in
 * them, and since this update the bonuses that were in them (`gearApplied`).
 * A save from before has no `gearApplied`, so on load the game works out what
 * its stats were built with: the bonuses of the release that wrote it. Then
 * syncGearStats (src/systems/gear-sync.js) moves the player to today's gear,
 * once.
 *
 * Those releases summed the armour, helmet, visor and shoulder picks and
 * every accessory slot, with the numbers below: every piece that had stats,
 * by look field and id. The one piece they skipped was a visor under a
 * helmet with no visor to fit (takesVisor): the Do-Rag and the Reaper came
 * in with that rule, so no save ever counted one. Frames and the eyes and
 * face slots had none, and no piece then gave ammo capacity, fire rate or
 * either regen.
 *
 * The one assumption: the save was made wearing the gear worn now. The save
 * does not say what was worn, and the creator is the only way to change it
 * between sessions; a player who changed gear since gets today's gear on
 * stats built from the old pick's numbers as if it were the new one's.
 */
import { deepFreeze } from "../utils/freeze.js";
import { ACCESSORY_SLOTS } from "./accessories.js";
import { ARMOR_STYLES, HELMET_STYLES, VISOR_STYLES, SHOULDER_STYLES, pieceIn, takesVisor } from "./cosmetics.js";

/** Stats by look field (`acc.<slot>` for an accessory slot), then piece id. */
export const LEGACY_GEAR_BONUSES = deepFreeze({
  armor: {
    recon: { moveSpeedAdd: 0.25, maxStaminaAdd: 15 },
    heavy: { maxHealthAdd: 25, armorAdd: 6, moveSpeedAdd: -0.15 },
    stealth: { dashCostAdd: -4, moveSpeedAdd: 0.1 },
    tech: { maxChronoEnergyAdd: 25, maxHealthAdd: 10 },
    howitzer: { maxHealthAdd: 20, armorAdd: 6, moveSpeedAdd: -0.2 },
    trencher: { maxHealthAdd: 20, armorAdd: 5, maxStaminaAdd: 10 },
    reliquary: { maxHealthAdd: 15, armorAdd: 7, maxChronoEnergyAdd: 10 },
    pathfinder: { moveSpeedAdd: 0.2, maxStaminaAdd: 20, dashCostAdd: -3 },
  },
  helmet: {
    wide: { maxHealthAdd: 10 },
    angular: { armorAdd: 3 },
    mohawk: { maxHealthAdd: 15, armorAdd: 2 },
    crested: { maxStaminaAdd: 20, moveSpeedAdd: 0.1 },
    ordnance: { armorAdd: 4, maxHealthAdd: 8 },
    bucket: { maxHealthAdd: 18 },
    crusader: { armorAdd: 5, maxChronoEnergyAdd: 8 },
    sealed: { maxStaminaAdd: 12, moveSpeedAdd: 0.08 },
    pilot: { maxStaminaAdd: 10 },
  },
  visor: {
    slit: { maxChronoEnergyAdd: 10 },
    fullface: { armorAdd: 4, maxChronoEnergyAdd: 10 },
    split: { maxStaminaAdd: 10 },
    glow: { maxChronoEnergyAdd: 25 },
    goldwrap: { maxChronoEnergyAdd: 6 },
  },
  shoulder: {
    spikes: { armorAdd: 3 },
    pauldrons: { maxHealthAdd: 15, armorAdd: 4 },
    armored: { armorAdd: 8, moveSpeedAdd: -0.1 },
    slab: { maxHealthAdd: 18, armorAdd: 4, moveSpeedAdd: -0.12 },
    dome: { armorAdd: 9, moveSpeedAdd: -0.08 },
    ordnance: { armorAdd: 6, maxHealthAdd: 10, moveSpeedAdd: -0.1 },
    layered: { maxStaminaAdd: 14, moveSpeedAdd: 0.1 },
  },
  "acc.back": { backpack: { maxStaminaAdd: 8 }, antenna: { maxChronoEnergyAdd: 8 } },
  "acc.waist": { belt: { maxHealthAdd: 5 }, holster: { moveSpeedAdd: 0.03 }, grenades: { armorAdd: 3 } },
  "acc.helmet": { whip: { maxChronoEnergyAdd: 5 } },
  "acc.arms": { gauntlets: { armorAdd: 2 }, screen: { dashCostAdd: -2 } },
  "acc.neck": { tags: { maxHealthAdd: 3 }, bandolier: { maxStaminaAdd: 5 } },
  "acc.legs": { kneepads: { dashCostAdd: -1 }, thigh: { moveSpeedAdd: 0.02 }, shins: { armorAdd: 2 } },
});

const SLOTS = [
  ["armor", ARMOR_STYLES],
  ["helmet", HELMET_STYLES],
  ["visor", VISOR_STYLES],
  ["shoulder", SHOULDER_STYLES],
];

/**
 * What the old releases' gearBonuses gave for the gear `character` wears now.
 * @param {object} character
 * @returns {Record<string, number>}
 */
export function legacyGearBonuses(character) {
  const out = {};
  if (!character) return out;
  const add = (bonuses) => {
    for (const [stat, value] of Object.entries(bonuses || {})) out[stat] = (out[stat] || 0) + value;
  };
  for (const [field, table] of SLOTS) {
    if (field === "visor" && !takesVisor(character.helmet)) continue;
    add(LEGACY_GEAR_BONUSES[field][pieceIn(table, field, character[field]).id]);
  }
  const acc = character.accessories || {};
  for (const { id: slot } of ACCESSORY_SLOTS) add(LEGACY_GEAR_BONUSES[`acc.${slot}`]?.[acc[slot]]);
  return out;
}
