/**
 * Wardrobe theme "exo" (Exo-Frame): a one-person mech worn over the suit.
 * Painted by src/rendering/svg-art/wardrobe-themes/exo.js under the same ids.
 */
export default {
  id: "exo",
  name: "Exo-Frame",
  short: "Exo",
  frames: [{ id: "exo", name: "Exo-Frame", desc: "Hydraulic exoskeleton over the suit: piston limbs, reactor core, mech boots", tier: 5, glove: "servo",
      // Plate and a reactor-fed frame: tougher, and heavier on its feet.
      bonuses: { armorAdd: 3, maxHealthAdd: 10, moveSpeedAdd: -0.1 } }],
  helmets: [{ id: "cockpit", name: "Cockpit", desc: "Roll-cage pilot helmet with a HUD canopy", tier: 5, visor: false,
      // A cage to take hits and a targeting canopy.
      bonuses: { armorAdd: 2, fireRateAdd: 0.06 } }],
  shoulders: [{ id: "pods", name: "Missile Pods", desc: "Six-tube launcher pods on hinge arms", tier: 5,
      // Racks of rounds carried high: more to fire, more to haul.
      bonuses: { ammoCapAdd: 0.25, moveSpeedAdd: -0.08 } }],
};
