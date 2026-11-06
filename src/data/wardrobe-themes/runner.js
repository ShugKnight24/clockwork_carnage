/**
 * Wardrobe theme "runner" (Neon Runner): a street crew's kit over the field
 * suit, light, loud and held together with tape. Painted by
 * src/rendering/svg-art/wardrobe-themes/runner.js under the same ids.
 */
export default {
  id: "runner",
  name: "Neon Runner",
  short: "Runner",
  frames: [{ id: "streetwear", name: "Streetwear", desc: "Cropped crew jacket, LED-inked forearms, a wired wrist deck", tier: 2, hides: ["kit", "collar", "limbGlow"],
      // Light kit: quicker on your feet, cheaper to dash.
      bonuses: { moveSpeedAdd: 0.1, dashCostAdd: -2 } }],
  // A bare face behind a mouth mask: the face shows, no visor.
  helmets: [{ id: "ledmask", name: "LED Mask", desc: "Bare face, a pixel-grin mask, ear jacks and a holo band", tier: 3, face: true, visor: false,
      // Nothing holds a plume on bare hair; the holo band lies across the eyes
      // and the shell over the mouth and jaw, so nothing worn on the face fits.
      seats: { crown: false }, faceSlots: { eyes: false, face: false } }],
  shoulders: [{ id: "spikepad", name: "Spike Pad", desc: "Studded jacket pad with a reflective stripe", tier: 2, bonuses: { armorAdd: 2 } }],
};
