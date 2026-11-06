/**
 * Art for the wardrobe themes (src/data/wardrobe-themes/), merged by id.
 *
 * Each theme module's default export: `{ id, frames, helmets }`, its id the
 * same as its data module's.
 *
 *   frames: { [id]: { shape, layers(P, c, K) -> { under, legs, torso, arms, glow } } }
 *     shape: { width, shoulder, softTorso?, bareRight?, hides: string[] }
 *       width, shoulder — silhouette scales (1 is the issued suit)
 *       softTorso       — fabric over the chest: no chest trim, belt-only core light
 *       bareRight       — the right shoulder takes the soft cap, not its piece
 *       hides           — the stock rig layers the frame replaces, words from
 *                         HIDES (see there for what each one removes)
 *     layers: drawn from the pose's joints (P.arms, P.legs) over the
 *       armoured body. `under` sits behind the body (packs, coat tails),
 *       `legs`/`torso`/`arms` over their stock parts, `glow` is energy light.
 *       Helpers: ../frame-kit.js and ../models/hero.js by import; K is the
 *       rig's kit (K.mix blends two hex colours).
 *
 *   helmets: { [id]: { paint(c, K) -> { front, glow }, anchors: { top, half, rail } } }
 *     paint: the whole head under the helmet (not called for a face peek,
 *       which the rig draws bare). `front` is the head, `glow` its lit parts.
 *       K is the rig's helmet kit; none of it knows a helmet id, so all a
 *       helmet's own drawing lives here:
 *         K.face(c), K.hair(c, under), K.hairBack(c) — the head under an
 *           open helmet (under: only what shows below the shell)
 *         K.eyeGlow(c, opacity, behindVisor?) — the eyes' light
 *         K.closedVisor(c) -> { body, glow, jaw, eyeGlints } — the visor
 *           pick's glass, drawn down over the face; `jaw` says whether the
 *           glass leaves a jaw below it for the helmet to plate
 *         K.raisedVisor(c, y) -> { body, glow } — the pick flipped up onto
 *           the brow at height y
 *         K.visorLenses(c, [[x, y, r], ...]) -> { glass, glint, glow } — the
 *           pick's glass and light for round optics
 *         K.helmetShell(c, { path, half, ears? }) -> { shell, dome, ears,
 *           earGlow } — a steel shell from its outline, the dome's sheen and
 *           rim light, and the bolted ear cups at ±half (ears: false for a
 *           one-piece shell)
 *         K.mix(a, b, t) — blend two hex colours
 *     anchors: where helmet gear seats, in rig units. `top` is the top of
 *       the shell (crown gear), `half` its half-width (side gear), `rail` the
 *       height of the side rail lamps and whips mount on.
 *
 * `c` is the resolved look (agent-rig.js resolve): c.pal (primary, dark,
 * accent), c.energy, c.core, c.rim, c.skin, c.hair, c.eyes, c.fem, c.armor.
 */
import { WARDROBE_THEMES, THEME_TABLES } from "../../../data/wardrobe-themes/index.js";
import { deepFreeze } from "../../../utils/freeze.js";
import issue from "./issue.js";

/** Art modules, one per data theme, in the data registry's order; frozen through. */
const ART_THEMES = deepFreeze([issue]);

/**
 * The stock rig layers a frame may hide (shape.hides), and what each removes:
 *   kit       — the armour's chest kit and its light (gear front and glow),
 *               the plate and variant trims, the chest seams, the origin
 *               insignia and the chest core light (the belt light stays).
 *               Gear on the back and the player's badge still draw: the
 *               badge is placed on whatever the frame wears.
 *   collar    — the gorget plate; the bare neck under an open helmet stays
 *   hips      — the belt's hip plates (centre plate and both tassets)
 *   shoulders — both shoulder pieces
 *   cape      — the cape
 *   limbGlow  — the energy channels along the arms and legs
 */
export const HIDES = Object.freeze(["kit", "collar", "hips", "shoulders", "cape", "limbGlow"]);

/** Frame art by frame id. */
export const FRAME_ART = Object.freeze(Object.assign({}, ...ART_THEMES.map((t) => t.frames || {})));

/**
 * A frame's art. Looks resolve through pieceOf, so the id is always a known
 * frame; an unknown one is a bug and throws rather than drawing another frame.
 */
export function frameArt(id) {
  const art = FRAME_ART[id];
  if (!art) throw new Error(`frameArt: no frame "${id}"`);
  return art;
}

/** Helmet art by helmet id. */
export const HELMET_ART = Object.freeze(Object.assign({}, ...ART_THEMES.map((t) => t.helmets || {})));

/**
 * A helmet's art. Looks resolve through pieceOf, so the id is always a known
 * helmet; an unknown one is a bug and throws rather than drawing another.
 */
export function helmetArt(id) {
  const art = HELMET_ART[id];
  if (!art) throw new Error(`helmetArt: no helmet "${id}"`);
  return art;
}

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
const ART_TABLES = ["frames", "helmets"];

/** The anchor numbers every helmet's art declares. */
const HELMET_ANCHORS = ["top", "half", "rail"];

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
  const dataIds = themes.map((t) => t.id);
  const artIds = artThemes.map((t) => t.id);
  for (const id of dataIds) if (!artIds.includes(id)) errors.push(`theme "${id}" has no art module`);
  for (const id of artIds) if (!dataIds.includes(id)) errors.push(`art module "${id}" has no data theme`);
  for (const t of artThemes) {
    for (const table of ART_TABLES) {
      for (const id of Object.keys(t[table] || {})) {
        const owner = themes.find((d) => (d[table] || []).some((e) => e.id === id));
        if (owner && owner.id !== t.id) errors.push(`${table}: art "${id}" is in theme "${t.id}" but its entry is in "${owner.id}"`);
      }
    }
    for (const [id, a] of Object.entries(t.helmets || {})) {
      if (typeof a.paint !== "function") errors.push(`helmets: "${id}" has no paint function`);
      for (const key of HELMET_ANCHORS) {
        if (!Number.isFinite(a.anchors?.[key])) errors.push(`helmets: "${id}" anchors.${key} is not a finite number`);
      }
    }
    for (const [id, a] of Object.entries(t.frames || {})) {
      if (typeof a.layers !== "function") errors.push(`frames: "${id}" has no layers function`);
      for (const key of ["width", "shoulder"]) {
        if (!Number.isFinite(a.shape?.[key])) errors.push(`frames: "${id}" shape.${key} is not a finite number`);
      }
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
