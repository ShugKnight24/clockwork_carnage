/**
 * Wardrobe theme "horologist" (Horologist): the suit as a working clock,
 * brass, patina and an exposed gear train. Painted by
 * src/rendering/svg-art/wardrobe-themes/horologist.js under the same ids.
 */
export default {
  id: "horologist",
  name: "Horologist",
  frames: [{ id: "clockwork", name: "Clockwork", desc: "Brass chest plate over an open gear train, a pendulum at the back and a wind-up key", tier: 2 }],
  // The clock face is the visor: the visor pick has no glass to show.
  helmets: [{ id: "clockface", name: "Clockface", desc: "Round brass helmet whose visor is a glowing clock face, wound at the crown", tier: 3, visor: false }],
  shoulders: [{ id: "gearrim", name: "Gear Rim", desc: "Round pauldrons rimmed with gear teeth round an inner cog", tier: 2 }],
};
