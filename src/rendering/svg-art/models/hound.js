/**
 * The Hound (suit C-0016) in the cutscenes: the same empty suit the player
 * fights (sprites/creatures.js `hound`), cut from its sprite so the thing
 * through the glass in `hound_attack`, in the den in `hound_intro` and
 * falling open in `gathering_finale` is the thing in the Foundry.
 *
 *   hound         standing its ground, ridge up and hot, the ember turning;
 *                 a heat-shimmer behind it, stuttering like a bad frame rate
 *   hound_fallen  the suit fallen open on its side, the ember out
 *
 * Art units: feet near y = +60 (the sprite's floor is +86), so the sprite
 * is lifted 26 and drawn at its own scale.
 */
import { buildEnemyModel } from "../sprites/enemies.js";
import { hound, CREATURES, CREATURE_DEFS } from "../sprites/creatures.js";
import { lit, baseDefs, BASE_MATERIALS, paletteMaterials } from "../sprites/kit.js";
import { ENEMY_TYPES } from "../../../data/enemies.js";

const LIFT = -26;
const lift = (markup, extra = "") => `<g transform="translate(0 ${LIFT})${extra}">${markup}</g>`;

let sprite = null;
const poses = () => (sprite ??= buildEnemyModel("hound").variants[0].poses);

function ground(r = 90) {
  return (
    `<ellipse cx="0" cy="60" rx="${r}" ry="9" fill="url(#hgsh)"/>` +
    `<ellipse cx="6" cy="-10" rx="${r + 10}" ry="80" fill="url(#hamb)"/>`
  );
}

const defs = (base) =>
  base +
  `<radialGradient id="hgsh"><stop offset="0" stop-color="#000" stop-opacity=".6"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="hamb"><stop offset="0" stop-color="#ffb45a" stop-opacity=".22"/><stop offset="1" stop-color="#ffb45a" stop-opacity="0"/></radialGradient>`;

function houndModel() {
  const p = poses().bristle;
  return {
    box: [-110, -130, 220, 200],
    defs: defs(p.body.defs),
    anim: { type: "breathe", amp: 0.006, speed: 1.1, pivot: [0, 60] },
    layers: [
      { markup: ground(), anim: { type: "pulse", min: 0.6, max: 1, speed: 1.6 } },
      // The afterimage: a frame behind itself.
      { markup: lift(p.body.markup, " translate(-14 2)"), opacity: 0.22, anim: { type: "flicker", min: 0.1, max: 0.45, speed: 7 } },
      { markup: lift(p.body.markup), anim: { type: "drift", amp: 1.2, speed: 9 } },
      { markup: lift(p.glow.markup), anim: { type: "flicker", min: 0.55, max: 1, speed: 4 }, blend: "lighter" },
    ],
  };
}

function houndFallenModel() {
  // The cutscene-only pose: collapsed flat, legs splayed, the ember out.
  const spec = CREATURES.hound;
  const def = ENEMY_TYPES.hound;
  const p = hound().poses.fallen;
  const base = baseDefs(spec.box) + BASE_MATERIALS + paletteMaterials("armor", def.color1, def.color2) + CREATURE_DEFS.hound;
  return {
    box: [-130, -120, 260, 212],
    defs: defs(base),
    layers: [
      { markup: ground(100), opacity: 0.8 },
      { markup: lift(lit(p.body, spec.box, spec.rim)) },
      { markup: lift(p.glow), opacity: 0.5, blend: "lighter" },
    ],
  };
}

export const MODELS = {
  /** The Hound: C-0016, an empty suit on all fours, ridge up, ember turning. */
  hound: houndModel(),
  /** The Hound fallen open: nothing inside. There never was. */
  hound_fallen: houndFallenModel(),
};
