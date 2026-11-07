/**
 * Wardrobe theme "issue" (Field Issue): the pieces the suit shipped with.
 * Painted by src/rendering/svg-art/wardrobe-themes/issue.js under the same ids.
 */
export default {
  id: "issue",
  name: "Field Issue",
  short: "Issue",
  /** Body frames: the silhouette the suit is built on. Any armour style can be worn on any frame. */
  frames: [
    { id: "standard", name: "Field", desc: "The suit as issued: balanced, familiar" },
    { id: "strider", name: "Strider", desc: "Lean under-suit, modular kit, a jump-kit behind the shoulders" },
    { id: "vanguard", name: "Vanguard", desc: "Sleek sculpted plate, panel lines and glowing seams" },
    { id: "operator", name: "Operator", desc: "Soft kit: fabric sleeves and trousers, chest rig, elbow pads", hides: ["shoulders", "limbGlow"] },
    { id: "wraith", name: "Wraith", desc: "Hooded long coat, wrapped forearms and shins", hides: ["cape", "limbGlow"] },
    { id: "breacher", name: "Breacher", desc: "Ballistic chest plate, riot vambrace, grenade belt, heavy boots" },
  ],
  /**
   * Helmets. `face: true`: an open helmet, the face shows under it.
   * `visor: false`: the head has no visor to fit, so the pick is neither drawn
   * nor counted (see takesVisor in src/data/cosmetics.js). `seats` and
   * `faceSlots`: the accessory seats and face slots the helmet turns off
   * (see src/data/wardrobe-themes/index.js).
   */
  helmets: [
    { id: "standard", name: "Standard Dome", desc: "Regulation sphere shell", tier: 1 },
    { id: "wide", name: "Bastion", desc: "Wide reinforced dome", tier: 2, bonuses: { maxHealthAdd: 10 }, face: true },
    { id: "angular", name: "Angular", desc: "Faceted tactical shell", tier: 2, bonuses: { armorAdd: 3 } },
    { id: "mohawk", name: "Centurion", desc: "Crested ridge crown", tier: 3, bonuses: { maxHealthAdd: 15, armorAdd: 2 }, face: true,
      // The crest takes the crown, so a plume does not seat there.
      seats: { crown: false } },
    { id: "crested", name: "Vanguard", desc: "Forward combat fin", tier: 3, bonuses: { armorAdd: 3 } },
    { id: "ordnance", name: "Ordnance", desc: "Faceted gunner's helm with targeting spine", tier: 3, bonuses: { armorAdd: 4, maxHealthAdd: 8 } },
    { id: "bucket", name: "Bucket", desc: "Low riveted dome, sunk into the collar", tier: 3, bonuses: { armorAdd: 6 } },
    { id: "crusader", name: "Crusader", desc: "Beaked cast helm, rivet crown", tier: 3, bonuses: { armorAdd: 5, maxChronoEnergyAdd: 8 } },
    { id: "sealed", name: "Sealed", desc: "One-piece shell, no seams", tier: 2, bonuses: { staminaRegenAdd: 0.2 } },
    {
      id: "reaper", name: "Reaper", desc: "Skull-print balaclava, comms headset, field scarf", tier: 3, visor: false,
      unlock: { type: "achievement", id: "centurion", label: "Earn Centurion" },
    },
    { id: "pilot", name: "Pilot", desc: "Tri-lens optics, sealed jaw", tier: 2, bonuses: { fireRateAdd: 0.03 } },
    { id: "bandana", name: "Do-Rag", desc: "Tied head wrap, face to the wind", tier: 1, visor: false },
  ],
  /** Shoulder pieces, drawn on both shoulders. */
  shoulders: [
    { id: "none", name: "Bare", desc: "No additional plating", tier: 1 },
    { id: "pads", name: "Combat Pads", desc: "Standard oval shoulder pads", tier: 1 },
    { id: "spikes", name: "Jagged", desc: "Aggressive spiked guards", tier: 2, bonuses: { armorAdd: 3 } },
    { id: "pauldrons", name: "Pauldrons", desc: "Heavy trapezoidal plates", tier: 3, bonuses: { maxHealthAdd: 15, armorAdd: 4 } },
    { id: "armored", name: "Bulwark", desc: "Angular armored blocks", tier: 3, bonuses: { armorAdd: 8, moveSpeedAdd: -0.1 } },
    { id: "slab", name: "Slab", desc: "Oversized rounded shoulder slabs", tier: 3, bonuses: { maxHealthAdd: 18, armorAdd: 4, moveSpeedAdd: -0.12 } },
    { id: "dome", name: "Domed", desc: "Deep crusader half-shells with a raised rim", tier: 3, bonuses: { armorAdd: 9, moveSpeedAdd: -0.08 } },
    { id: "ordnance", name: "Launcher", desc: "Vented ordnance housing on a rail", tier: 3, bonuses: { armorAdd: 6, ammoCapAdd: 0.1, moveSpeedAdd: -0.1 } },
    { id: "layered", name: "Layered", desc: "Stepped overlapping plates", tier: 2, bonuses: { armorAdd: 4 } },
  ],
};
