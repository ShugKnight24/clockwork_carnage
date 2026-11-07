/**
 * Wardrobe theme "ronin" (Ronin): samurai armour recast in chrono-steel.
 * Painted by src/rendering/svg-art/wardrobe-themes/ronin.js under the same ids.
 */
export default {
  id: "ronin",
  name: "Ronin",
  short: "Ronin",
  frames: [{ id: "lamellar", name: "Ronin", desc: "Laced chrono-steel lamellar, hanging tassets, an obi with a short blade and a back banner", tier: 2, glove: "tekko",
      // Laced steel scales: real plate, and a little weight to carry.
      bonuses: { armorAdd: 4, moveSpeedAdd: -0.04 } }],
  // The war mask covers the face; there is no visor to fit.
  helmets: [{ id: "kabuto", name: "Kabuto", desc: "Crescent-crested helm, flared neck guard and a snarling war mask", tier: 3, visor: false, bonuses: { maxHealthAdd: 8, armorAdd: 3 },
      // The crest holds the crown and its clock fitting the brow.
      seats: { crown: false, brow: false } }],
  shoulders: [{ id: "sode", name: "Sode", desc: "Broad laced shoulder plates hung in rows", tier: 2, bonuses: { armorAdd: 3 } }],
};
