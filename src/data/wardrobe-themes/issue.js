/**
 * Wardrobe theme "issue" (Field Issue): the pieces the suit shipped with.
 * Painted by src/rendering/svg-art/wardrobe-themes/issue.js under the same ids.
 */
export default {
  id: "issue",
  name: "Field Issue",
  /** Body frames: the silhouette the suit is built on. Any armour style can be worn on any frame. */
  frames: [
    { id: "standard", name: "Field", desc: "The suit as issued: balanced, familiar" },
    { id: "strider", name: "Strider", desc: "Lean under-suit, modular kit, a jump-kit behind the shoulders" },
    { id: "vanguard", name: "Vanguard", desc: "Sleek sculpted plate, panel lines and glowing seams" },
    { id: "operator", name: "Operator", desc: "Soft kit: fabric sleeves and trousers, chest rig, elbow pads" },
    { id: "wraith", name: "Wraith", desc: "Hooded long coat, wrapped forearms and shins" },
    { id: "breacher", name: "Breacher", desc: "Ballistic chest plate, riot vambrace, grenade belt, heavy boots" },
  ],
  /**
   * Helmets. `face: true`: an open helmet, the face shows under it.
   * `visor: false`: the head has no visor to fit, so the pick is neither drawn
   * nor counted (see takesVisor in src/data/cosmetics.js).
   */
  helmets: [
    { id: "standard", name: "Standard Dome", desc: "Regulation sphere shell", tier: 1 },
    { id: "wide", name: "Bastion", desc: "Wide reinforced dome", tier: 2, bonuses: { maxHealthAdd: 10 }, face: true },
    { id: "angular", name: "Angular", desc: "Faceted tactical shell", tier: 2, bonuses: { armorAdd: 3 } },
    { id: "mohawk", name: "Centurion", desc: "Crested ridge crown", tier: 3, bonuses: { maxHealthAdd: 15, armorAdd: 2 }, face: true },
    { id: "crested", name: "Vanguard", desc: "Forward combat fin", tier: 3, bonuses: { maxStaminaAdd: 20, moveSpeedAdd: 0.1 } },
    { id: "ordnance", name: "Ordnance", desc: "Faceted gunner's helm with targeting spine", tier: 3, bonuses: { armorAdd: 4, maxHealthAdd: 8 } },
    { id: "bucket", name: "Bucket", desc: "Low riveted dome, sunk into the collar", tier: 3, bonuses: { maxHealthAdd: 18 } },
    { id: "crusader", name: "Crusader", desc: "Beaked cast helm, rivet crown", tier: 3, bonuses: { armorAdd: 5, maxChronoEnergyAdd: 8 } },
    { id: "sealed", name: "Sealed", desc: "One-piece shell, no seams", tier: 2, bonuses: { maxStaminaAdd: 12, moveSpeedAdd: 0.08 } },
    {
      id: "reaper", name: "Reaper", desc: "Skull-print balaclava, comms headset, field scarf", tier: 3, visor: false,
      unlock: { type: "achievement", id: "centurion", label: "Earn Centurion" },
    },
    { id: "pilot", name: "Pilot", desc: "Tri-lens optics, sealed jaw", tier: 2, bonuses: { maxStaminaAdd: 10 } },
    { id: "bandana", name: "Do-Rag", desc: "Tied head wrap, face to the wind", tier: 1, visor: false },
  ],
};
