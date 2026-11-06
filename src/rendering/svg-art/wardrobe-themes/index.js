/**
 * Art for the wardrobe themes (src/data/wardrobe-themes/), merged by id.
 *
 * Each theme module's default export: `{ id, frames, helmets, shoulders }`,
 * its id the same as its data module's.
 *
 *   frames: { [id]: { shape, layers(P, c, K) -> { under, legs, torso, arms, glow } } }
 *     shape: { width, shoulder, softTorso?, rightShoulder?, hides: string[] }
 *       width, shoulder — silhouette scales (1 is the issued suit)
 *       softTorso       — fabric over the chest: no chest trim, belt-only core light
 *       rightShoulder   — a shoulder id the frame always wears on the right,
 *                         whatever the pick (the left still takes the pick)
 *       hides           — the stock rig layers the frame replaces, words from
 *                         HIDES (see there for what each one removes)
 *     layers: drawn from the pose's joints (P.arms, P.legs) over the
 *       armoured body. `under` sits behind the body (packs, coat tails),
 *       `legs`/`torso`/`arms` over their stock parts, `glow` is energy light.
 *       Helpers: ../frame-kit.js and ../models/hero.js by import; K is the
 *       rig's kit (K.mix blends two hex colours). The fallen agent also
 *       asks for each arm on its own, the other side a hole in P.arms, so
 *       walk P.arms (and P.legs) with map and never index them.
 *
 *   helmets: { [id]: { paint(c, K) -> { front, glow }, anchors, seats? } }
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
 *     anchors: { top, half, rail, badge } — where helmet gear seats, in rig
 *       units. `top` is the top of the shell (crown gear), `half` its
 *       half-width (side gear), `rail` the height of the side rail lamps and
 *       whips mount on. `badge` is where the helmet wears the player's badge,
 *       `{ x, y, rot, size }` (size: the badge's diameter), or `false` for a
 *       head with no place for one.
 *     seats: which accessory seats the helmet takes, words from HELMET_SEATS
 *       mapped to booleans; a seat left out is taken. A helmet that already
 *       wears what a seat holds (the Centurion's crest) turns it off, and
 *       the helmet-slot accessory for that seat is not drawn on it.
 *
 *   shoulders: { [id]: { paint(c, s, K) -> markup, maxShoulderScale? } }
 *     paint: one shoulder, drawn for the right side and mirrored for the
 *       left (s = -1 left, 1 right). K is the rig's shoulder kit:
 *         K.M(d) — mirror a right-side path for this side
 *         K.rot(markup) — turn markup with the arm's tilt about the joint
 *         K.lit — true on the lit (left) side
 *         K.pauldron(side) — the stock hero pad, already tilted
 *         K.mix(a, b, t) — blend two hex colours
 *     maxShoulderScale: the most a frame's `shoulder` scale may grow the
 *       piece (a large piece that would swamp a broad frame caps it); the
 *       rig draws it at min(frame shoulder, maxShoulderScale).
 *
 *   Every kit (frames', helmets', shoulders', and the accessory painters'
 *   in ../accessories/) also has K.uid(name) and K.defs(markup), from
 *   ../id-scope.js: a piece that needs its own gradient, clip, mask or
 *   pattern defines it with K.defs under an id from K.uid and refers to it
 *   as url(#${K.uid(name)}). Ids come out scoped to the figure and the
 *   piece, so figures sharing a page never collide. Never write a bare id.
 *
 * `c` is the resolved look (agent-rig.js resolve): c.pal (primary, dark,
 * accent), c.energy, c.core, c.rim, c.skin, c.hair, c.eyes, c.fem, c.armor.
 */
import { WARDROBE_THEMES, THEME_TABLES } from "../../../data/wardrobe-themes/index.js";
import { deepFreeze } from "../../../utils/freeze.js";
import issue from "./issue.js";
import exo from "./exo.js";
import marshal from "./marshal.js";

/** Art modules, one per data theme, in the data registry's order; frozen through. */
const ART_THEMES = deepFreeze([issue, exo, marshal]);

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

/** Shoulder art by shoulder id. */
export const SHOULDER_ART = Object.freeze(Object.assign({}, ...ART_THEMES.map((t) => t.shoulders || {})));

/**
 * A shoulder's art. Looks resolve through pieceOf, so the id is always a
 * known shoulder; an unknown one is a bug and throws rather than drawing another.
 */
export function shoulderArt(id) {
  const art = SHOULDER_ART[id];
  if (!art) throw new Error(`shoulderArt: no shoulder "${id}"`);
  return art;
}

/**
 * The accessory seats on a helmet (helmet art `seats`), and the helmet-slot
 * gear each holds (src/data/accessories.js `seat`):
 *   crown — on top of the shell (a plume)
 *   brow  — on the forehead above the visor (night vision)
 *   side  — on the side rail and over the ears (lamps, whips, a headset)
 */
export const HELMET_SEATS = Object.freeze(["crown", "brow", "side"]);

/**
 * Which accessory seats a helmet takes: every seat, unless its art turns one off.
 * @param {string} id helmet id
 * @returns {Record<string, boolean>}
 */
export function helmetSeats(id) {
  const seats = helmetArt(id).seats || {};
  return Object.fromEntries(HELMET_SEATS.map((seat) => [seat, seats[seat] !== false]));
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

/** The anchor numbers every helmet's art declares. */
const HELMET_ANCHORS = ["top", "half", "rail"];

/** The numbers a helmet's badge point declares. */
const BADGE_POINT = ["x", "y", "rot", "size"];

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
  const shoulderIds = new Set(themes.flatMap((t) => (t.shoulders || []).map((e) => e.id)));
  for (const t of artThemes) {
    for (const table of THEME_TABLES) {
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
      const badge = a.anchors?.badge;
      if (badge !== false) {
        for (const key of BADGE_POINT) {
          if (!Number.isFinite(badge?.[key])) errors.push(`helmets: "${id}" anchors.badge.${key} is not a finite number (or set badge: false)`);
        }
      }
      for (const [seat, on] of Object.entries(a.seats || {})) {
        if (!HELMET_SEATS.includes(seat)) errors.push(`helmets: "${id}" seats unknown seat "${seat}" (${HELMET_SEATS.join(", ")})`);
        else if (typeof on !== "boolean") errors.push(`helmets: "${id}" seats.${seat} is not true or false`);
      }
    }
    for (const [id, a] of Object.entries(t.shoulders || {})) {
      if (typeof a.paint !== "function") errors.push(`shoulders: "${id}" has no paint function`);
      if ("maxShoulderScale" in a && !Number.isFinite(a.maxShoulderScale)) errors.push(`shoulders: "${id}" maxShoulderScale is not a finite number`);
    }
    for (const [id, a] of Object.entries(t.frames || {})) {
      if (typeof a.layers !== "function") errors.push(`frames: "${id}" has no layers function`);
      for (const key of ["width", "shoulder"]) {
        if (!Number.isFinite(a.shape?.[key])) errors.push(`frames: "${id}" shape.${key} is not a finite number`);
      }
      const right = a.shape?.rightShoulder;
      if (right !== undefined && !shoulderIds.has(right)) errors.push(`frames: "${id}" shape.rightShoulder "${right}" is not a shoulder`);
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
