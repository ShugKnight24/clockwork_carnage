/**
 * Accessory slots worn over the armour. Items are referenced by id; entry 0 of
 * every slot is "none". Perks use the same bonus vocabulary as armour and are
 * summed by gearBonuses() (src/data/cosmetics.js). Painted by
 * src/rendering/svg-art/accessories/. Tier 2 and 3 items unlock by the
 * armour's TIER_UNLOCKS (src/data/cosmetics.js), looked up from `tier`.
 *
 * An item may declare `tint: { default: "#rrggbb", label }`: a colour of its
 * own the player picks (War Paint's paint), never the suit's. The character
 * keeps the pick per slot in `accessoryTints` ({ face: "#2f4f8f" }); the
 * painter reads the resolved colour as c.tints[slot] (tintFor).
 */
const NONE = { id: "none", name: "None", desc: "Nothing fitted" };

export const ACCESSORY_SLOTS = [
  { id: "back", name: "Back" },
  { id: "waist", name: "Waist" },
  { id: "helmet", name: "Helmet" },
  { id: "arms", name: "Arms" },
  { id: "neck", name: "Neck" },
  { id: "legs", name: "Legs" },
  // Worn on the face (FACE_SLOTS): eyewear and the rest are separate picks,
  // so an eyepatch and a beard can go together.
  { id: "eyes", name: "Eyes" },
  { id: "face", name: "Face" },
];

/**
 * The slots worn on the face itself. Drawn only where the face shows (a
 * helmet whose entry says `face: true`, or a peek), and only where that
 * helmet leaves room for the slot (its art's `faceSlots`, see
 * src/rendering/svg-art/wardrobe-themes/index.js). Under a closed helmet the
 * pick is kept but not drawn.
 */
export const FACE_SLOTS = Object.freeze(["eyes", "face"]);

export const ACCESSORIES = {
  back: [
    NONE,
    { id: "backpack", name: "Tactical Backpack", desc: "Boxy pack with a bedroll", tier: 1, bonuses: { maxStaminaAdd: 8 }, perk: "+8 stamina" },
    { id: "antenna", name: "Rift Antenna", desc: "Field radio mast", tier: 2, bonuses: { maxChronoEnergyAdd: 8 }, perk: "+8 chrono energy" },
    { id: "blade", name: "Sheathed Blade", desc: "Chrono-steel sword across the back", tier: 3 },
    { id: "cloak", name: "Long Cloak", desc: "Replaces the armour's cape", tier: 1 },
  ],
  waist: [
    NONE,
    { id: "belt", name: "Utility Belt", desc: "Pouches all round", tier: 1, bonuses: { maxHealthAdd: 5 }, perk: "+5 max health" },
    { id: "holster", name: "Drop Holster", desc: "Sidearm on the thigh strap", tier: 2, bonuses: { moveSpeedAdd: 0.03 }, perk: "+3% move speed" },
    { id: "grenades", name: "Grenade Rig", desc: "Canisters on a webbing belt", tier: 3, bonuses: { armorAdd: 3 }, perk: "+3 armour" },
    { id: "canister", name: "Chrono Canister", desc: "Glowing energy cell at the hip", tier: 2 },
  ],
  // Helmet gear sits on one of the helmet's seats (`seat`: crown, brow or
  // side, HELMET_SEATS in src/rendering/svg-art/wardrobe-themes/index.js); a
  // helmet that turns a seat off does not draw the gear that needs it.
  helmet: [
    NONE,
    { id: "nvg", name: "Night-Vision Mount", desc: "Flip-up quad tubes", tier: 2, seat: "brow" },
    { id: "whip", name: "Whip Antenna", desc: "Tall flexible aerial", tier: 1, bonuses: { maxChronoEnergyAdd: 5 }, perk: "+5 chrono energy", seat: "side" },
    { id: "lamp", name: "Head Lamp", desc: "Side-mounted torch", tier: 1, seat: "side" },
    { id: "plume", name: "Plume", desc: "Parade crest", tier: 3, seat: "crown" },
    { id: "comms", name: "Comms Headset", desc: "Ear cups and a boom mic over any helmet", tier: 1, seat: "side" },
  ],
  arms: [
    NONE,
    { id: "gauntlets", name: "Gauntlets", desc: "Heavy forearm guards", tier: 2, bonuses: { armorAdd: 2 }, perk: "+2 armour" },
    { id: "screen", name: "Forearm Screen", desc: "Tactical wrist display", tier: 1, bonuses: { dashCostAdd: -2 }, perk: "-2 dash cost" },
    { id: "launcher", name: "Wrist Launcher", desc: "Compact dart launcher", tier: 3 },
  ],
  neck: [
    NONE,
    { id: "scarf", name: "Scarf", desc: "Wrapped field scarf", tier: 1 },
    { id: "tags", name: "Dog Tags", desc: "Chain and two tags", tier: 1, bonuses: { maxHealthAdd: 3 }, perk: "+3 max health" },
    { id: "bandolier", name: "Bandolier", desc: "Ammo belt across the chest", tier: 2, bonuses: { maxStaminaAdd: 5 }, perk: "+5 stamina" },
  ],
  legs: [
    NONE,
    { id: "kneepads", name: "Knee Pads", desc: "Hard-shell pads", tier: 1, bonuses: { dashCostAdd: -1 }, perk: "-1 dash cost" },
    { id: "thigh", name: "Thigh Holster", desc: "Magazine pouch on the thigh", tier: 2, bonuses: { moveSpeedAdd: 0.02 }, perk: "+2% move speed" },
    { id: "shins", name: "Shin Guards", desc: "Plated greaves", tier: 3, bonuses: { armorAdd: 2 }, perk: "+2 armour" },
  ],
  eyes: [
    NONE,
    { id: "aviators", name: "Aviators", desc: "Teardrop shades on a gold wire frame", tier: 1 },
    { id: "shades", name: "Wraparound Shades", desc: "One lens, tinted the suit's energy", tier: 2 },
    { id: "eyepatch", name: "Eyepatch", desc: "Strapped over the left eye", tier: 1 },
    { id: "cybereye", name: "Optic Implant", desc: "A glowing lens set into the right eye", tier: 3 },
    { id: "monocle", name: "Brass Monocle", desc: "A lens and its chain", tier: 2 },
  ],
  face: [
    NONE,
    { id: "scar", name: "Brow Scar", desc: "An old cut across the right eye", tier: 1 },
    { id: "warpaint", name: "War Paint", desc: "Two stripes under the eyes, in a paint you pick", tier: 1, tint: { default: "#b0302a", label: "Paint" } },
    { id: "cigar", name: "Cigar", desc: "Lit, in the corner of the mouth", tier: 2 },
    { id: "nosestrip", name: "Field Dressing", desc: "A strip across the nose", tier: 1 },
    { id: "piercings", name: "Piercings", desc: "Brow bar and a lip ring", tier: 1 },
    { id: "freckles", name: "Freckles", desc: "A dusting across the nose", tier: 1 },
    { id: "beard", name: "Stubble Beard", desc: "Short beard in the hair colour", tier: 1 },
  ],
};

export const DEFAULT_ACCESSORIES = Object.fromEntries(ACCESSORY_SLOTS.map((s) => [s.id, "none"]));

/** Item for a slot by id; the slot's "none" for unknown ids; null for an unknown slot. */
export function accessoryItem(slot, id) {
  const items = ACCESSORIES[slot];
  if (!items) return null;
  return items.find((i) => i.id === id) || items[0];
}

/** A tint colour: `#rrggbb`. */
export const TINT_HEX = /^#[0-9a-f]{6}$/i;

/**
 * The paint colours the creator offers for a tintable item, before its
 * custom colour input: ochre red (War Paint's own default), black, white,
 * woad blue, ash grey, green and yellow.
 */
export const PAINT_SWATCHES = Object.freeze([
  { hex: "#b0302a", name: "Ochre Red" },
  { hex: "#121212", name: "Black" },
  { hex: "#f2efe8", name: "White" },
  { hex: "#2f4f8f", name: "Woad Blue" },
  { hex: "#7d8288", name: "Ash Grey" },
  { hex: "#3f7a3a", name: "Green" },
  { hex: "#d9b02c", name: "Yellow" },
].map(Object.freeze));

/**
 * The colours kept for `accessories`: one rule, the colours stored are the
 * colours drawn. A valid `#rrggbb` (lower-cased), only for a slot whose worn
 * item declares a `tint`; anything else is dropped, so a colour goes the
 * moment its item comes off and the item comes back in its default.
 * @param {unknown} raw stored colours by slot
 * @param {object} accessories the slots worn
 * @returns {Record<string, string>}
 */
export function wornTints(raw, accessories) {
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const out = {};
  for (const { id } of ACCESSORY_SLOTS) {
    const v = src[id];
    if (typeof v === "string" && TINT_HEX.test(v) && accessoryItem(id, accessories?.[id])?.tint) out[id] = v.toLowerCase();
  }
  return out;
}

/**
 * The colour a slot's worn item is painted in: the character's pick for
 * that slot when it is a valid colour, else the item's default; null when
 * the item worn there takes no tint.
 * @param {{ accessories?: object, accessoryTints?: object }} ch
 * @param {string} slot
 * @returns {string|null} lower-case `#rrggbb`
 */
export function tintFor(ch, slot) {
  const tint = accessoryItem(slot, ch?.accessories?.[slot])?.tint;
  if (!tint) return null;
  const pick = ch?.accessoryTints?.[slot];
  return (typeof pick === "string" && TINT_HEX.test(pick) ? pick : tint.default).toLowerCase();
}
