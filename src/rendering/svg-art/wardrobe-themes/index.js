/**
 * Art for the wardrobe themes (src/data/wardrobe-themes/), merged by id.
 *
 * Each theme module's default export: `{ id, frames }`, its id the same as
 * its data module's.
 *
 *   frames: { [id]: { shape, layers(P, c, K) -> { under, legs, torso, arms, glow } } }
 *     shape: { width, shoulder, softTorso?, bareRight?, hides: string[] }
 *       width, shoulder — silhouette scales (1 is the issued suit)
 *       softTorso       — fabric over the chest: no chest trim, belt-only core light
 *       bareRight       — the right shoulder takes the soft cap, not its piece
 *       hides           — the stock rig layers the frame replaces, words from
 *                         HIDES: kit (chest kit and trims), collar, hips (the
 *                         belt's hip plates), shoulders, cape, limbGlow
 *     layers: drawn from the pose's joints (P.arms, P.legs) over the
 *       armoured body. `under` sits behind the body (packs, coat tails),
 *       `legs`/`torso`/`arms` over their stock parts, `glow` is energy light.
 *       Helpers: ../frame-kit.js and ../models/hero.js by import; K is the
 *       rig's kit (K.mix blends two hex colours).
 *
 * `c` is the resolved look (agent-rig.js resolve): c.pal (primary, dark,
 * accent), c.energy, c.core, c.rim, c.skin, c.hair, c.eyes, c.fem, c.armor.
 */
import { WARDROBE_THEMES, THEME_TABLES } from "../../../data/wardrobe-themes/index.js";
import issue from "./issue.js";

/** Art modules, one per data theme. */
const ART_THEMES = [issue];

/** The stock rig layers a frame may hide (shape.hides). */
export const HIDES = Object.freeze(["kit", "collar", "hips", "shoulders", "cape", "limbGlow"]);

/** Frame art by frame id. */
export const FRAME_ART = Object.freeze(Object.assign({}, ...ART_THEMES.map((t) => t.frames || {})));

/** A frame's art; an unknown id draws the issued suit. */
export const frameArt = (id) => FRAME_ART[id] || FRAME_ART.standard;

/**
 * Whether a frame replaces one of the rig's stock layers.
 * @param {string} id frame id
 * @param {string} what a word from HIDES
 */
export function frameHides(id, what) {
  if (!HIDES.includes(what)) throw new Error(`frameHides: "${what}" is not a hides word (${HIDES.join(", ")})`);
  return frameArt(id).shape.hides.includes(what);
}

/** The art tables an art module fills, by data table key. */
const ART_TABLES = ["frames"];

/**
 * Check the data and art registries against each other.
 * @returns {string[]} one message per problem; empty when consistent
 */
export function validateWardrobe(themes = WARDROBE_THEMES, artThemes = ART_THEMES) {
  const errors = [];
  for (const table of THEME_TABLES) {
    const seen = new Map();
    for (const t of themes) {
      for (const { id } of t[table] || []) {
        if (seen.has(id)) errors.push(`${table}: duplicate id "${id}" in themes "${seen.get(id)}" and "${t.id}"`);
        else seen.set(id, t.id);
      }
    }
    if (!ART_TABLES.includes(table)) continue;
    const art = new Map();
    for (const t of artThemes) {
      for (const id of Object.keys(t[table] || {})) {
        if (art.has(id)) errors.push(`${table}: duplicate art "${id}" in themes "${art.get(id)}" and "${t.id}"`);
        else art.set(id, t.id);
      }
    }
    for (const [id, theme] of seen) if (!art.has(id)) errors.push(`${table}: "${id}" (theme "${theme}") has no art`);
    for (const [id, theme] of art) if (!seen.has(id)) errors.push(`${table}: art "${id}" (theme "${theme}") has no entry`);
  }
  for (const t of artThemes) {
    for (const [id, a] of Object.entries(t.frames || {})) {
      const hides = a.shape?.hides;
      if (!Array.isArray(hides)) {
        errors.push(`frames: "${id}" has no shape.hides list`);
        continue;
      }
      for (const word of hides) if (!HIDES.includes(word)) errors.push(`frames: "${id}" hides unknown layer "${word}"`);
    }
  }
  return errors;
}

if (import.meta.env?.DEV) for (const msg of validateWardrobe()) console.error(`[wardrobe] ${msg}`);
