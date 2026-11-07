/**
 * Art for the wardrobe themes (src/data/wardrobe-themes/), merged by id.
 *
 * Each theme module's default export: `{ id, frames, helmets, shoulders,
 * gloves? }`, its id the same as its data module's.
 *
 *   frames: { [id]: { shape, layers(P, c, K) -> { under, legs, torso, arms, glow } } }
 *     shape: { width, shoulder, softTorso?, rightShoulder? }
 *       width, shoulder — silhouette scales (1 is the issued suit)
 *       softTorso       — fabric over the chest: no chest trim, belt-only core light
 *       rightShoulder   — a shoulder id the frame always wears on the right,
 *                         whatever the pick (the left still takes the pick)
 *     Which stock layers the frame replaces (`hides`) is on its data entry,
 *       not here (src/data/wardrobe-themes/index.js documents it): whether
 *       the shoulder pick is worn decides whether it counts.
 *     layers: drawn from the pose's joints (P.arms, P.legs) over the
 *       armoured body. `under` sits behind the body (packs, coat tails),
 *       `legs`/`torso`/`arms` over their stock parts, `glow` is energy light.
 *       Helpers: ../frame-kit.js and ../models/hero.js by import; K is the
 *       rig's kit (K.mix blends two hex colours). The fallen agent also
 *       asks for each limb on its own, the other side a hole in P.arms or
 *       P.legs, so walk them with map and never index them. A limb's own
 *       light goes in `glow`, drawn from that limb's joints inside the same
 *       map: the rig splits glow per limb (the fallen agent leaves out the
 *       light of the arm trapped under the body). The hands are not a
 *       frame's to draw: its glove (below) dresses them.
 *
 *   helmets: { [id]: { paint(c, K) -> { front, glow, nape? }, anchors } }
 *     paint: the whole head under the helmet (not called for a face peek,
 *       which the rig draws bare). `front` is the head, `glow` its lit parts,
 *       `nape` the hair below the jaw (K.hairNape) on a helmet that shows the
 *       face: the rig draws it behind the neck and collar, in head space.
 *       K is the rig's helmet kit; none of it knows a helmet id, so all a
 *       helmet's own drawing lives here:
 *         K.face(c), K.hair(c, under), K.hairBack(c) — the head under an
 *           open helmet (under: only what shows below the shell), the hair
 *           down to the jaw only
 *         K.hairNape(c, under) — the rest of that hair, below the jaw, for
 *           the painter's `nape` (clipped as its head is, e.g. to a glass)
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
 *         K.faceAccessories({ window? }) -> { front, glow } — the eyes and
 *           face items the look wears, already fitted to the build (only
 *           the slots faceSlots leaves room for). Every helmet that shows
 *           the face calls it and places them over its K.face, inside its
 *           own layering (under the hair, the shell, the bubble's glass).
 *           `window` is the helmet's face opening as a path in head space:
 *           both the items and their light are clipped to it, so a cheek
 *           guard or a brim in front hides them (the light is drawn in the
 *           head's glow layer, over everything, and only the clip keeps it
 *           behind). The rig draws them over the whole head for a painter
 *           that never asks, as a safety net only
 *         K.mix(a, b, t) — blend two hex colours
 *     anchors: { top, half, rail, badge } — where helmet gear seats, in rig
 *       units. `top` is the top of the shell (crown gear), `half` its
 *       half-width (side gear), `rail` the height of the side rail lamps and
 *       whips mount on. `badge` is where the helmet wears the player's badge,
 *       `{ x, y, rot, size }` (size: the badge's diameter), or `false` for a
 *       head with no place for one.
 *     Which accessory seats a helmet takes (`seats`) and which face slots
 *       it leaves room for (`faceSlots`) are on its data entry, not here
 *       (src/data/wardrobe-themes/index.js documents both).
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
 *   gloves: { [id]: { shape?, armour?, paint(H, c, K) -> { palm?, back,
 *       fingers, thumb, cuff?, glow? } } }
 *     Keyed by glove id, which a frame's data entry names (`glove`; left out,
 *       the standard glove, see frameGlove). Ids name the glove, not the
 *       theme, so any frame may wear any theme's glove.
 *     shape: { width?, finger? } — the shared hand made broader (width) or
 *       its digits thicker (finger), 1 being the issued glove's
 *     armour: true for a glove that is part of the armour: the rig recolours
 *       it with the look's armour as it does the arm (accents to the
 *       palette, speculars knocked down on matte plate). Any other glove
 *       keeps its own materials, as the theme pieces do.
 *     paint: dresses one hand's geometry, H (handGeom in ../models/hero.js,
 *       which documents it): the back of the hand, the palm where it shows,
 *       the fingers (index first) and the thumb, each a digit along its
 *       joints; the rig stacks the parts in the pose's order. One hand at a
 *       time, in any pose (at rest, open on the floor, on the rifle's two
 *       grips), so a painter draws from H alone: never from the pose or
 *       P.arms. `fingers` is one markup per H.fingers entry; `cuff` is drawn
 *       last, in the cuff's coordinates (origin the wrist, +y down the
 *       forearm into the hand, H.wrist wide, H.out the side away from the
 *       body); `glow` is the glove's light, in the hand's coordinates. K is
 *       the rig's kit with the hand kit (HAND_KIT in ../models/hero.js):
 *         K.digit(F, fill, o?) — a digit in one material, inked, lit, creased
 *         K.span(F, a, b, o?) — the digit's outline from a to b along it
 *           (a fingerless glove stops short of the tip; a plate rides a joint)
 *         K.across(F, at, inset?) — a line across the digit (a hem, a seam)
 *         K.along(F, a, b, side?) — a line down it (stitching, a lit edge)
 *         K.mix(a, b, t) — blend two hex colours
 *     The standard glove is the stock hero's (STEEL_GLOVE in
 *       ../models/hero.js): the cutscene hero wears it without a look.
 *
 *   Every kit (frames', helmets', shoulders', gloves', and the accessory
 *   painters' in ../accessories/) also has K.uid(name) and K.defs(markup), from
 *   ../id-scope.js: a piece that needs its own gradient, clip, mask or
 *   pattern defines it with K.defs under an id from K.uid and refers to it
 *   as url(#${K.uid(name)}). Ids come out scoped to the figure and the
 *   piece, so figures sharing a page never collide. Never write a bare id.
 *
 *   The one exception is the rig's shared defs, RIG_DEFS in ../agent-rig.js,
 *   which every figure defines and a painter names bare as url(#id):
 *     steel, steelDk  — armour steel, lit and shaded
 *     paint           — the palette's primary colour
 *     suit            — the under-suit (or its camo pattern)
 *     cape, leather, skin, hair, gun
 *     visor, mirrorGlass, goldGlass — visor glass
 *     sheen, shade    — white and black radial falloffs
 *     cyl, pecShade   — cylinder and chest shading overlays
 *     weave           — fabric weave pattern
 *     glow, bloom, ao — blur filters (light, wide light, ambient occlusion)
 *     aboveJaw, belowJaw — the head above and below the jaw (the hair kit's
 *                          split; a painter has no need to name them)
 *   The helmet kit's K.hair defines its own clip inline (HELMET_KIT_IDS,
 *   beside the kit); a painter never names it. tests/unit/
 *   wardrobe-registry.test.js holds every painter to these.
 *
 * `c` is the resolved look (agent-rig.js resolve): c.pal (primary, dark,
 * accent), c.energy, c.core, c.rim, c.skin, c.hair, c.eyes, c.fem, c.armor.
 */
import { WARDROBE_THEMES, THEME_TABLES, HELMET_SEATS, HIDES, DEFAULT_GLOVE, frameGlove } from "../../../data/wardrobe-themes/index.js";
import { ACCESSORIES, FACE_SLOTS, TINT_HEX } from "../../../data/accessories.js";
import { deepFreeze } from "../../../utils/freeze.js";
import issue from "./issue.js";
import exo from "./exo.js";
import marshal from "./marshal.js";
import ronin from "./ronin.js";
import horologist from "./horologist.js";
import runner from "./runner.js";
import diver from "./diver.js";
import ranger from "./ranger.js";
import chronomancer from "./chronomancer.js";

/** Art modules, one per data theme, in the data registry's order; frozen through. */
const ART_THEMES = deepFreeze([issue, exo, marshal, ronin, horologist, runner, diver, ranger, chronomancer]);

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

/** Glove art by glove id. */
export const GLOVE_ART = Object.freeze(Object.assign({}, ...ART_THEMES.map((t) => t.gloves || {})));

/**
 * The glove a frame's hands wear: its data entry's glove (frameGlove, the
 * standard glove when it names none). validateWardrobe holds every frame's
 * glove to an art entry, so an id with no art is a bug and throws.
 * @param {string} frame frame id
 */
export function frameGloveArt(frame) {
  const id = frameGlove(frame);
  const art = GLOVE_ART[id];
  if (!art) throw new Error(`frameGloveArt: no glove "${id}" (frame "${frame}")`);
  return art;
}

// The helmets' accessory seats and face room, and the stock layers a frame
// hides, live on their data entries (src/data/wardrobe-themes/index.js),
// where the data layer can read them; re-exported here for the art's readers.
export { HELMET_SEATS, helmetSeats, helmetFaceSlots, faceSlotBlock, HIDES, frameHides, DEFAULT_GLOVE, frameGlove } from "../../../data/wardrobe-themes/index.js";

/** The anchor numbers every helmet's art declares. */
const HELMET_ANCHORS = ["top", "half", "rail"];

/** The numbers a helmet's badge point declares. */
const BADGE_POINT = ["x", "y", "rot", "size"];

/** The shape numbers a glove may set. */
const GLOVE_SHAPE = ["width", "finger"];

/**
 * Check the data and art registries against each other, and the accessory
 * tables' tints (src/data/accessories.js): a `tint` needs a `#rrggbb`
 * default and a label.
 * @returns {string[]} one message per problem; empty when consistent
 */
export function validateWardrobe(themes = WARDROBE_THEMES, artThemes = ART_THEMES, accessories = ACCESSORIES) {
  const errors = [];
  for (const [slot, items] of Object.entries(accessories)) {
    for (const { id, tint } of items) {
      if (tint === undefined) continue;
      if (typeof tint?.default !== "string" || !TINT_HEX.test(tint.default)) errors.push(`accessories: ${slot} "${id}" tint has no #rrggbb default`);
      if (typeof tint?.label !== "string" || !tint.label) errors.push(`accessories: ${slot} "${id}" tint has no label`);
    }
  }
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
  // Gloves: art by id across the themes, the standard glove among them, and
  // every frame's glove one of them.
  const gloves = new Map();
  for (const t of artThemes) {
    for (const [id, a] of Object.entries(t.gloves || {})) {
      if (gloves.has(id)) errors.push(`gloves: duplicate art "${id}" in themes "${gloves.get(id)}" and "${t.id}"`);
      else gloves.set(id, t.id);
      if (typeof a.paint !== "function") errors.push(`gloves: "${id}" has no paint function`);
      for (const key of Object.keys(a.shape || {})) {
        if (!GLOVE_SHAPE.includes(key)) errors.push(`gloves: "${id}" shape.${key} is not a glove shape number (${GLOVE_SHAPE.join(", ")})`);
        else if (!(Number.isFinite(a.shape[key]) && a.shape[key] > 0)) errors.push(`gloves: "${id}" shape.${key} is not a positive number`);
      }
      if ("armour" in a && typeof a.armour !== "boolean") errors.push(`gloves: "${id}" armour is not true or false`);
    }
  }
  // A frame that names no glove wears the standard one, so a registry with
  // gloves must hold it (one with none, a test's, draws no hands from it).
  if (gloves.size && !gloves.has(DEFAULT_GLOVE)) errors.push(`gloves: no art for the standard glove "${DEFAULT_GLOVE}"`);
  // Hides, seats, face room and gloves, on the data entries.
  for (const t of themes) {
    for (const e of t.frames || []) {
      if ("glove" in e && !gloves.has(e.glove)) errors.push(`frames: "${e.id}" wears glove "${e.glove}", which has no art`);
      if (e.hides === undefined) continue;
      if (!Array.isArray(e.hides)) errors.push(`frames: "${e.id}" hides is not a list`);
      else for (const word of e.hides) if (!HIDES.includes(word)) errors.push(`frames: "${e.id}" hides unknown layer "${word}"`);
    }
    for (const e of t.helmets || []) {
      for (const [seat, on] of Object.entries(e.seats || {})) {
        if (!HELMET_SEATS.includes(seat)) errors.push(`helmets: "${e.id}" seats unknown seat "${seat}" (${HELMET_SEATS.join(", ")})`);
        else if (typeof on !== "boolean") errors.push(`helmets: "${e.id}" seats.${seat} is not true or false`);
      }
      if (!("faceSlots" in e)) continue;
      if (e.face !== true) errors.push(`helmets: "${e.id}" declares faceSlots but hides the face (its entry has no face: true)`);
      for (const [slot, on] of Object.entries(e.faceSlots || {})) {
        if (!FACE_SLOTS.includes(slot)) errors.push(`helmets: "${e.id}" faceSlots unknown slot "${slot}" (${FACE_SLOTS.join(", ")})`);
        else if (typeof on !== "boolean") errors.push(`helmets: "${e.id}" faceSlots.${slot} is not true or false`);
      }
    }
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
      for (const key of ["seats", "faceSlots"]) {
        if (key in a) errors.push(`helmets: art "${id}" declares ${key}, which belongs on its data entry`);
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
      if (a.shape && "hides" in a.shape) errors.push(`frames: art "${id}" declares shape.hides, which belongs on its data entry`);
    }
  }
  return errors;
}

if (import.meta.env?.DEV) for (const msg of validateWardrobe()) console.error(`[wardrobe] ${msg}`);
