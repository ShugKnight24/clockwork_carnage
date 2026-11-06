/**
 * Wardrobe theme "ranger" (Void Ranger): a retro space explorer's pressure
 * suit worn over the armour. Painted by
 * src/rendering/svg-art/wardrobe-themes/ranger.js under the same ids.
 */
export default {
  id: "ranger",
  name: "Void Ranger",
  short: "Ranger",
  frames: [{ id: "spacesuit", name: "Void Ranger", desc: "Puffy white pressure suit: ribbed joints, life-support pack, moon boots", tier: 2, hides: ["kit", "collar", "hips", "limbGlow"],
      // The life-support pack: air to run on, and a med loop.
      bonuses: { maxStaminaAdd: 10, regenAdd: 0.1 } }],
  // Clear glass: the face shows; there is no visor to fit.
  helmets: [{ id: "bubble", name: "Bubble", desc: "Clear glass dome on a neck ring, with a lamp", tier: 3, face: true, visor: false,
      // Its own air supply.
      bonuses: { staminaRegenAdd: 0.15 },
      // Clear glass takes no gear, and a headset would close across the face.
      seats: { crown: false, brow: false, side: false } }],
  shoulders: [{ id: "patches", name: "Mission Patches", desc: "Quilted pads stitched with a mission patch", tier: 2 }],
};
