/**
 * Wardrobe theme "runner" (Neon Runner): a street crew's kit over the field
 * suit, light, loud and held together with tape. Painted by
 * src/rendering/svg-art/wardrobe-themes/runner.js under the same ids.
 */
export default {
  id: "runner",
  name: "Neon Runner",
  frames: [{ id: "streetwear", name: "Streetwear", desc: "Cropped crew jacket, LED-inked forearms, a wired wrist deck", tier: 2 }],
  // A bare face behind a mouth mask: the face shows, no visor.
  helmets: [{ id: "ledmask", name: "LED Mask", desc: "Bare face, a pixel-grin mask, ear jacks and a holo band", tier: 3, face: true, visor: false }],
  shoulders: [{ id: "spikepad", name: "Spike Pad", desc: "Studded jacket pad with a reflective stripe", tier: 2 }],
};
