/**
 * Wardrobe theme "marshal" (Frontier Marshal): a lawman's long coat, hat and
 * serape. Painted by src/rendering/svg-art/wardrobe-themes/marshal.js under
 * the same ids.
 */
export default {
  id: "marshal",
  name: "Frontier Marshal",
  short: "Marshal",
  frames: [{ id: "duster", name: "Frontier Duster", desc: "Long duster over the suit: twin thigh holsters, a marshal's star, spurred boots", tier: 2, hides: ["kit", "hips", "cape", "limbGlow"],
      // Oilcloth stops weather, not rounds: what it carries is the twin
      // holsters and the rounds on the belt.
      bonuses: { ammoCapAdd: 0.15 } }],
  // An open hat with a bandana over the mouth: the face shows, no visor.
  helmets: [{ id: "brim", name: "Marshal's Brim", desc: "Wide-brim hat over a comm band, bandana up over the face", tier: 3, face: true, visor: false,
      // Night vision has no brow under the brim; the bandana is up over the
      // nose and jaw, so eyewear fits over it and nothing else on the face shows.
      seats: { brow: false }, faceSlots: { face: false } }],
  shoulders: [{ id: "poncho", name: "Serape", desc: "Woven poncho mantle with a fringed hem", tier: 2 }],
};
