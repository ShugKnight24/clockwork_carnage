/**
 * Accessory slots worn over the armour. Items are referenced by id; entry 0 of
 * every slot is "none". Perks use the same bonus vocabulary as armour and are
 * summed by gearBonuses() (src/data/cosmetics.js). Painted by
 * src/rendering/svg-art/accessories/.
 */

const TIER2 = { type: "tutorial", label: "Graduate Chronos Academy (tutorial)" };
const TIER3 = {
  type: "anyOf",
  label: "Clear Act 1 or survive arena round 5",
  rules: [
    { type: "campaignLevels", count: 3, label: "Clear Act 1", unit: "levels" },
    { type: "arenaRound", count: 5, label: "Survive arena round 5", unit: "rounds" },
  ],
};
const NONE = { id: "none", name: "None", desc: "Nothing fitted" };

export const ACCESSORY_SLOTS = [
  { id: "back", name: "Back" },
  { id: "waist", name: "Waist" },
  { id: "helmet", name: "Helmet" },
  { id: "arms", name: "Arms" },
  { id: "neck", name: "Neck" },
  { id: "legs", name: "Legs" },
];

export const ACCESSORIES = {
  back: [
    NONE,
    { id: "backpack", name: "Tactical Backpack", desc: "Boxy pack with a bedroll", tier: 1, bonuses: { maxStaminaAdd: 8 }, perk: "+8 stamina" },
    { id: "antenna", name: "Rift Antenna", desc: "Field radio mast", tier: 2, unlock: TIER2, bonuses: { maxChronoEnergyAdd: 8 }, perk: "+8 chrono energy" },
    { id: "blade", name: "Sheathed Blade", desc: "Chrono-steel sword across the back", tier: 3, unlock: TIER3 },
    { id: "cloak", name: "Long Cloak", desc: "Replaces the armour's cape", tier: 1 },
  ],
  waist: [
    NONE,
    { id: "belt", name: "Utility Belt", desc: "Pouches all round", tier: 1, bonuses: { maxHealthAdd: 5 }, perk: "+5 max health" },
    { id: "holster", name: "Drop Holster", desc: "Sidearm on the thigh strap", tier: 2, unlock: TIER2, bonuses: { moveSpeedAdd: 0.03 }, perk: "+3% move speed" },
    { id: "grenades", name: "Grenade Rig", desc: "Canisters on a webbing belt", tier: 3, unlock: TIER3, bonuses: { armorAdd: 3 }, perk: "+3 armour" },
    { id: "canister", name: "Chrono Canister", desc: "Glowing energy cell at the hip", tier: 2, unlock: TIER2 },
  ],
  helmet: [
    NONE,
    { id: "nvg", name: "Night-Vision Mount", desc: "Flip-up quad tubes", tier: 2, unlock: TIER2 },
    { id: "whip", name: "Whip Antenna", desc: "Tall flexible aerial", tier: 1, bonuses: { maxChronoEnergyAdd: 5 }, perk: "+5 chrono energy" },
    { id: "lamp", name: "Head Lamp", desc: "Side-mounted torch", tier: 1 },
    { id: "plume", name: "Plume", desc: "Parade crest", tier: 3, unlock: TIER3 },
  ],
  arms: [
    NONE,
    { id: "gauntlets", name: "Gauntlets", desc: "Heavy forearm guards", tier: 2, unlock: TIER2, bonuses: { armorAdd: 2 }, perk: "+2 armour" },
    { id: "screen", name: "Forearm Screen", desc: "Tactical wrist display", tier: 1, bonuses: { dashCostAdd: -2 }, perk: "-2 dash cost" },
    { id: "launcher", name: "Wrist Launcher", desc: "Compact dart launcher", tier: 3, unlock: TIER3 },
  ],
  neck: [
    NONE,
    { id: "scarf", name: "Scarf", desc: "Wrapped field scarf", tier: 1 },
    { id: "tags", name: "Dog Tags", desc: "Chain and two tags", tier: 1, bonuses: { maxHealthAdd: 3 }, perk: "+3 max health" },
    { id: "bandolier", name: "Bandolier", desc: "Ammo belt across the chest", tier: 2, unlock: TIER2, bonuses: { maxStaminaAdd: 5 }, perk: "+5 stamina" },
  ],
  legs: [
    NONE,
    { id: "kneepads", name: "Knee Pads", desc: "Hard-shell pads", tier: 1, bonuses: { dashCostAdd: -1 }, perk: "-1 dash cost" },
    { id: "thigh", name: "Thigh Holster", desc: "Magazine pouch on the thigh", tier: 2, unlock: TIER2, bonuses: { moveSpeedAdd: 0.02 }, perk: "+2% move speed" },
    { id: "shins", name: "Shin Guards", desc: "Plated greaves", tier: 3, unlock: TIER3, bonuses: { armorAdd: 2 }, perk: "+2 armour" },
  ],
};

export const DEFAULT_ACCESSORIES = Object.fromEntries(ACCESSORY_SLOTS.map((s) => [s.id, "none"]));

/** Item for a slot by id; the slot's "none" for unknown ids; null for an unknown slot. */
export function accessoryItem(slot, id) {
  const items = ACCESSORIES[slot];
  if (!items) return null;
  return items.find((i) => i.id === id) || items[0];
}
