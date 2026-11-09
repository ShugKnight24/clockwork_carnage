/**
 * First-person glove materials: the wardrobe's gloves (GLOVE_ART in
 * ../wardrobe-themes/) as the viewmodel hands wear them.
 *
 * The hands keep the tactical rig's shape (its fingers are fitted round each
 * weapon's grip); a glove only dresses them: the material's tones, what sits
 * on the fingers and the back of the hand, and the cuff. The colours are the
 * third-person painters' own, so the suit's hands match from both cameras.
 *
 * A tone record is the hand kit's `T` (createHandArt in ./hands.js). Beyond
 * the stock glove's tones, every feature is optional and off by default:
 *   pad: null       — no padded strip over the proximal phalanx
 *   tipSeam: false  — no stitched fingertip seam
 *   tip             — a cap over the fingertip from `at` along its bone: the
 *                     bare skin of a fingerless glove (`skin`) or a grip pad
 *                     (`fill`), with a `hem` where the glove stops
 *   plates          — a steel plate over each bone
 *   along           — a line down the back of each finger (stitched when `dash`)
 *   turns           — a cloth binding's turns across each finger
 *   back            — back-of-hand dress: `panel` (fill, hi) replaces the
 *                     padded panel, `rays`, `stud`, `piston`, `turns`, and an
 *                     emissive `trace` or `rune` (Modern lights it in the
 *                     hand bloom layer; Realistic has no emissive)
 *   knuckle, knuckleLine — the knuckle row's fill and a line along it
 *   cuff/cuffLen/cuffFlare, strap (null for none), band, lace, ribs, tab,
 *   hazard, drum, latch, cuffLines — the glove's cuff over the wrist
 */

import { INK, mix } from "./geom.js";
import { cloth } from "../wardrobe-themes/chronomancer.js";
import { pieceOf } from "../../../core/character-fields.js";

/** The issued glove's tones per art style; `standard` wears exactly these. */
export const TONES = {
  modern: {
    // A bolder ink line than the weapon's, so a hand reads apart from the gun it grips.
    // A shade lighter and cooler than the gunmetal it grips, with a firmer sheen.
    base: "#3f4a58", hi: "#d2dde8", hiOp: 0.24, sh: "#05070a", shOp: 0.5,
    edge: INK, edgeOp: 1, edgeW: 0.5, crease: INK, creaseOp: 0.42,
    pad: "#4a5665", seam: "#a9b7c5", seamOp: 0.34, plateHi: "#eef6ff", plateHiOp: 0.42,
    sleeve: "url(#vmSleeve)", cuff: "url(#vmCuff)",
  },
  real: {
    base: "#2c2f33", hi: "#b8bec4", hiOp: 0.09, sh: "#020304", shOp: 0.55,
    edge: "#050607", edgeOp: 0.55, edgeW: 0.24, crease: "#000000", creaseOp: 0.34,
    pad: "#35393e", seam: "#8b9299", seamOp: 0.24, plateHi: "#d9dde1", plateHiOp: 0.2,
    sleeve: "url(#vmSleeveR)", cuff: "url(#vmCuffR)",
  },
};

/** Metal gradients the gloves share (steel plate, brass), in both art styles. */
export const GLOVE_DEFS = `
<linearGradient id="vmPlate" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#e8eef5"/><stop offset=".3" stop-color="#9aa6b3"/>
  <stop offset=".7" stop-color="#4a5664"/><stop offset="1" stop-color="#1c232c"/></linearGradient>
<linearGradient id="vmPlateR" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#b9bec3"/><stop offset=".35" stop-color="#7a8087"/>
  <stop offset=".75" stop-color="#3d4248"/><stop offset="1" stop-color="#16181b"/></linearGradient>
<linearGradient id="vmBrass" x1="0" y1="0" x2="1" y2=".4">
  <stop offset="0" stop-color="#ffe29a"/><stop offset=".22" stop-color="#d9a441"/><stop offset=".55" stop-color="#9c6a1e"/>
  <stop offset=".85" stop-color="#5a3a0e"/><stop offset="1" stop-color="#3a2508"/></linearGradient>
<linearGradient id="vmBrassR" x1="0" y1="0" x2="1" y2=".4">
  <stop offset="0" stop-color="#d8bd7c"/><stop offset=".3" stop-color="#a7813d"/><stop offset=".65" stop-color="#6b4c1c"/>
  <stop offset="1" stop-color="#2e1f08"/></linearGradient>`;

const REAL_URL = { "url(#vmPlate)": "url(#vmPlateR)", "url(#vmBrass)": "url(#vmBrassR)" };
const realUrl = (v) => REAL_URL[v] ?? v;

/**
 * A glove's Realistic tones from its Modern ones: the soft occlusion edge in
 * place of the ink, a matte sheen, the metals' Realistic gradients and the
 * material pulled a little toward neutral, as the stock glove is. `over`
 * replaces anything that reads wrong that way.
 */
function realOf(m, over = {}) {
  const r = {
    ...m,
    base: mix(m.base, "#2c2f33", 0.15), hiOp: m.hiOp * 0.6, shOp: Math.min(0.6, m.shOp + 0.05),
    edge: "#050607", edgeOp: 0.55, edgeW: 0.24, creaseOp: m.creaseOp * 0.8,
    seamOp: m.seamOp * 0.75, plateHiOp: m.plateHiOp * 0.5,
    sleeve: "url(#vmSleeveR)", cuff: realUrl(m.cuff),
  };
  if (m.pad) r.pad = mix(m.pad, "#2c2f33", 0.15);
  if (m.plates) r.plates = { ...m.plates, fill: realUrl(m.plates.fill), hiOp: m.plates.hiOp * 0.5 };
  if (m.back?.panel) r.back = { ...m.back, panel: { ...m.back.panel, fill: realUrl(m.back.panel.fill) } };
  if (m.back?.stud) r.back = { ...r.back, stud: { ...m.back.stud, fill: realUrl(m.back.stud.fill) } };
  if (m.band) r.band = { ...m.band, fill: realUrl(m.band.fill) };
  if (m.drum) r.drum = realUrl(m.drum);
  if (m.latch) r.latch = realUrl(m.latch);
  return { ...r, ...over };
}

/** A wardrobe glove's tones in both styles; its cuff is drawn by the glove (cuffShade). */
const both = (tones, over) => {
  const modern = { ...tones, cuffShade: true };
  return { modern, real: realOf(modern, over) };
};

// Colours below are the third-person painters' (../wardrobe-themes/<theme>.js).
const STD = TONES.modern;

/**
 * Every glove's first-person dress, by glove id. `bare`: the fingertips show
 * the player's skin; `tinted`: the glove takes a palette colour (laces,
 * rings, cuff tabs, cloth). Each says which of the look's colours its tones
 * read, so the bake key carries only those (fpGlove).
 * `tones(look)` -> { modern, real }, look = { skin, pal }.
 */
export const FP_GLOVES = Object.freeze({
  standard: { tones: () => TONES },

  // Exo-Frame servo gauntlets: dark servo glove under steel plates, one to a
  // bone, a plate and a piston on the back, a hazard band and a hinge drum.
  servo: {
    tones: () => both({
      ...STD, base: "#272d35", hiOp: 0.1, pad: null, tipSeam: false,
      plates: { fill: "url(#vmPlate)", hi: "#f4faff", hiOp: 0.5 },
      back: { panel: { fill: "url(#vmPlate)", hi: "#f4faff" }, piston: "#59636f" },
      knuckle: "#59636f",
      cuff: "url(#vmPlate)", strap: null, hazard: "#e8b425", drum: "url(#vmPlate)",
    }),
  },

  // Marshal: tan leather work gloves, stitched down each finger and the
  // back's tendons, a seam round the knuckles, a flared gauntlet cuff.
  leather: {
    tones: () => both({
      ...STD, base: "#7a5232", hi: "#c49668", hiOp: 0.22, sh: "#120a04", shOp: 0.45,
      crease: "#4a3019", creaseOp: 0.8, pad: null, seam: "#e8cf9c", seamOp: 0.7, plateHi: "#e8c49a",
      along: { color: "#e8cf9c", op: 0.75, dash: true },
      back: { rays: { color: "#e8cf9c", op: 0.7, dash: true } },
      knuckleLine: "#e8cf9c", knuckleDash: true,
      cuff: "#7a5232", cuffLen: 1.3, cuffFlare: 1.22, strap: null,
      cuffLines: [{ at: 0.2, color: "#c49668", op: 0.55 }, { at: 0.55, color: "#e8cf9c", op: 0.8, dash: true }, { at: 0.9, color: "#e8cf9c", op: 0.8, dash: true }],
    }, { base: "#6a4a30", hi: "#b08a64" }),
  },

  // Ronin tekko: a steel plate over the back of the hand, cloth fingers, a
  // small plate on the thumb, laced at the wrist with the palette's cord.
  tekko: {
    tinted: true,
    tones: ({ pal }) => both({
      ...STD, base: "#22232d", hi: "#4d5162", hiOp: 0.3, crease: "#08090d", creaseOp: 0.7,
      pad: null, tipSeam: false, thumbPlate: "url(#vmPlate)",
      back: { panel: { fill: "url(#vmPlate)", hi: "#f4faff", point: true } },
      cuff: "#22232d", strap: null, lace: { color: pal.primary, knot: "#e6dcc2" },
    }),
  },

  // Horologist: fitted dark kid leather, three stitched points down the
  // back, a brass gear riveted on it, a brass cuff.
  kid: {
    tones: () => both({
      ...STD, base: "#3a2a20", hi: "#94735a", hiOp: 0.24, crease: "#1a120c", creaseOp: 0.7,
      pad: null, tipSeam: false, plateHi: "#c9a585",
      back: { rays: { color: "#94735a", op: 0.6, from: 0.55 }, stud: { fill: "url(#vmBrass)", ink: "#2a1a06" } },
      cuff: "url(#vmBrass)", strap: null,
      cuffLines: [{ at: 0.3, color: "#fff1c2", op: 0.8 }, { at: 0.95, color: "#2a1a06", op: 0.7 }],
    }),
  },

  // Runner: dark synthetic knit cut off at the last joint (bare fingertips),
  // a padded knuckle guard, a ribbed cuff with the palette's tab, and an LED
  // trace across the back.
  fingerless: {
    bare: true,
    tinted: true,
    tones: ({ skin, pal }) => both({
      ...STD, base: "#1d2026", hi: "#5c636e", hiOp: 0.22, pad: null, tipSeam: false,
      tip: { skin, at: 0.12, hem: "#8c9089" },
      along: { color: "#5c636e", op: 0.5 },
      back: { trace: "#05070a" },
      knuckle: "#2e333c", knuckleLine: "#5c636e",
      cuff: "#1d2026", strap: null, ribs: "#5c636e", tab: pal.primary,
    }),
  },

  // Diver: thick black rubber, wet-glossy, sealed by a bolted brass ring.
  rubber: {
    tones: () => both({
      ...STD, base: "#2a2421", hi: "#6e625a", hiOp: 0.42, sh: "#050403", crease: "#0c0a09", creaseOp: 0.7,
      pad: null, tipSeam: false, seamRing: false, plateHi: "#cfc3b8",
      along: { color: "#d8ccc2", op: 0.4, side: 0.45 },
      knuckleLine: "#6e625a",
      cuff: "#2a2421", strap: null, band: { fill: "url(#vmBrass)", hi: "#fff1c2", lo: "#6b4818", rivets: true },
    }, { hiOp: 0.3 }),
  },

  // Void Ranger: puffy white pressure gloves, grey grip pads at the tips, a
  // pleat across the knuckles, locked to the sleeve by a palette ring with a
  // steel latch.
  pressure: {
    tinted: true,
    tones: ({ pal }) => both({
      ...STD, base: "#e2e5e4", hi: "#ffffff", hiOp: 0.5, sh: "#4a535a", shOp: 0.42,
      crease: "#8e979e", creaseOp: 0.7, pad: "#f0f2f0", seam: "#8e979e", seamOp: 0.5, tipSeam: false,
      plateHi: "#ffffff", tip: { fill: "#4c535a", at: 0.5 },
      knuckleLine: "#8e979e",
      cuff: "#e2e5e4", strap: null, band: { fill: pal.primary, hi: "#ffffff" }, latch: "url(#vmPlate)",
    }, { base: "#cfd3d3", pad: "#dadddc", hiOp: 0.3 }),
  },

  // Chronomancer: cloth wraps in the robe's colours bound down each finger
  // to the last joint (bare fingertips), thread trim across the knuckles,
  // and a rune on the back lit with the agent's energy.
  wraps: {
    bare: true,
    tinted: true,
    tones: ({ skin, pal }) => {
      const C = cloth({ pal }, mix);
      return both({
        ...STD, base: C.base, hi: mix(C.base, "#ffffff", 0.35), hiOp: 0.25, crease: C.lo, creaseOp: 0.8,
        pad: null, tipSeam: false, seamRing: false, tip: { skin, at: 0.15, hem: C.hi },
        turns: C.lo,
        back: { turns: C.lo, rune: "#05070c" },
        knuckleLine: C.trim,
        cuff: C.base, strap: null,
        cuffLines: [{ at: 0.35, color: C.trim, op: 0.8 }, { at: 0.7, color: C.lo, op: 0.9 }],
      });
    },
  },
});

const gloves = new Map(); // bake key -> glove
/** The stock glove, worn when a caller names none. */
export const STANDARD_GLOVE = Object.freeze({ id: "standard", key: "", ...TONES });

/**
 * A glove resolved for the viewmodel: `{ id, key, modern, real }`. `key`
 * names everything its markup depends on and goes into the bake keys: empty
 * for the stock glove (its bitmaps are the ones it always had), and the skin
 * or palette only for a glove that shows them, so a skin change re-bakes
 * no hands in a glove that covers the fingers. An unknown id wears the
 * stock glove, as frameGlove does.
 * @param {string} [id] glove id (frameGlove)
 * @param {string} [skin] skin colour, for bare fingertips
 * @param {{ primary: string, dark: string }} [pal] the look's palette
 */
export function fpGlove(id, skin, pal) {
  const entry = FP_GLOVES[id];
  if (!entry || id === "standard") return STANDARD_GLOVE;
  skin ??= pieceOf(null, "skinTone").color;
  pal ??= pieceOf(null, "color");
  const key = id + (entry.tinted ? `:${pal.primary}:${pal.dark}` : "") + (entry.bare ? `:${skin}` : "");
  let g = gloves.get(key);
  if (!g) {
    g = Object.freeze({ id, key, ...entry.tones({ skin, pal }) });
    gloves.set(key, g);
    // A creator colour drag makes a new key on every input event.
    while (gloves.size > 16) gloves.delete(gloves.keys().next().value);
  }
  return g;
}
