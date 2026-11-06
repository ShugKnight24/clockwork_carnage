/**
 * Wardrobe theme "chronomancer" (Chronomancer): ritual robes for a keeper of
 * time. Painted by src/rendering/svg-art/wardrobe-themes/chronomancer.js
 * under the same ids.
 */
export default {
  id: "chronomancer",
  name: "Chronomancer",
  short: "Chrono",
  frames: [{ id: "vestment", name: "Vestment", desc: "Split ritual robe, clock tabard, hourglass, rune gauntlets", tier: 2, hides: ["kit", "cape", "limbGlow"],
      // Chrono-wrought robes that mend their wearer.
      bonuses: { maxChronoEnergyAdd: 12, regenAdd: 0.08 } }],
  // The face is lost in the hood's shadow but for the eyes: no visor.
  helmets: [{ id: "hood", name: "Chrono Hood", desc: "Deep hood, eyes alight, a clock-ring halo", tier: 3, visor: false, bonuses: { maxChronoEnergyAdd: 20 },
      // The halo rings the peak and the hollow fills the brow.
      seats: { crown: false, brow: false } }],
  shoulders: [{ id: "mantle", name: "Mantle", desc: "Rune-engraved ceremonial collar plates with tassels", tier: 2, bonuses: { maxChronoEnergyAdd: 10 } }],
};
