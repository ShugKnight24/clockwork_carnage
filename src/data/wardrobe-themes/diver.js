/**
 * Wardrobe theme "diver" (Abyssal Diver): a hard-hat diver's canvas, brass
 * and lead. Painted by src/rendering/svg-art/wardrobe-themes/diver.js under
 * the same ids.
 */
export default {
  id: "diver",
  name: "Abyssal Diver",
  short: "Diver",
  frames: [{ id: "diving", name: "Abyssal Diver", desc: "Canvas pressure suit, brass corselet, back tank and lead boots", tier: 2 }],
  // A sealed helmet whose port glass is its own: no visor to fit.
  helmets: [{ id: "porthole", name: "Porthole", desc: "Round brass diving helmet, grilled front port, bolted collar", tier: 3, visor: false,
      // The air fitting holds the crown and the front port fills the brow.
      seats: { crown: false, brow: false } }],
  shoulders: [{ id: "lantern", name: "Deep Lantern", desc: "Brass lantern on a shoulder bracket, for the dark floors", tier: 2 }],
};
