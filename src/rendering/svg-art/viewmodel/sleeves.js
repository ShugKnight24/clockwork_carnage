/**
 * First-person forearm materials: each suit frame's sleeve as the viewmodel
 * arms wear it (hands.js `forearm`). Colours follow the frame's third-person
 * art (../wardrobe-themes/<theme>.js) and the look's palette, so the arms
 * match the suit from both cameras.
 *
 * A tone record (`S` in hands.js), per art style:
 *   base, hi, hiOp, sh, shOp — the cloth or shell and its key-light shading
 *   fold, foldOp             — creases following the arm's bend
 *   puff                     — mm the sleeve stands off the arm (padding, coats)
 *   bell                     — mm a robe's sleeve widens toward the wrist
 * and optional dress, each off by default:
 *   trim     { fill, glow?, w } — a band round the arm above the cuff (Modern lights `glow`)
 *   plate    { fill, hi, channel? } — an armoured vambrace over the top of the forearm
 *   seams    — emissive seam lines along the arm (Modern only)
 *   ribs     — ribbed rings down the arm (pressure suits)
 *   struts   — piston struts along the arm's sides (exo frame)
 *   lamellar { fill, lace } — laced rows of small plates
 *   bands    — brass bands round the arm
 *   wraps    — cloth bound round the forearm
 *   bare     — the forearm's skin (rolled sleeves), with `ink`: an LED tattoo line
 *   roll     — the rolled-up sleeve bunched near the elbow
 *   stitch   — a stitched seam along the arm
 *   turnback { fill, w } — a coat's turned-back cuff
 */

import { mix } from "./geom.js";
import { cloth } from "../wardrobe-themes/chronomancer.js";
import { pieceOf } from "../../../core/character-fields.js";

const MODERN = {
  hi: "#c3d0dc", hiOp: 0.14, sh: "#05070a", shOp: 0.45, fold: "#04060b", foldOp: 0.4, puff: 3, bell: 0,
};

/** A sleeve's Realistic tones from its Modern ones: matte, no emissive, a little toward neutral. */
function realOf(m, over = {}) {
  const r = { ...m, base: mix(m.base, "#2e302c", 0.18), hiOp: m.hiOp * 0.6, shOp: Math.min(0.6, m.shOp + 0.08), foldOp: m.foldOp * 0.8, seams: null };
  if (m.trim) r.trim = { ...m.trim, glow: false, fill: m.trim.glow ? "#1c1e1b" : m.trim.fill };
  if (m.plate) r.plate = { ...m.plate, channel: false };
  if (m.bare) r.bare = { ...m.bare, ink: null };
  return { ...r, ...over };
}
const both = (m, over) => {
  const modern = { ...MODERN, ...m };
  return { modern, real: realOf(modern, over) };
};

/** The issued suit's undersuit, from the palette. */
const undersuit = (pal) => mix(mix(pal.dark, "#1b2a3c", 0.55), "#000000", 0.15);

/**
 * Every frame's first-person sleeve, by frame id. `tinted`: the sleeve takes
 * palette colours; `bare`: it shows the skin. The bake key carries only what
 * a sleeve reads (fpSleeve). `tones({ skin, pal, accent })` -> { modern, real }.
 */
export const FP_SLEEVES = Object.freeze({
  // Field issue: the undersuit with an armoured vambrace and its energy channel.
  standard: {
    tinted: true,
    tones: ({ pal }) => both({
      base: undersuit(pal),
      plate: { fill: mix(pal.primary, "#1a2636", 0.5), hi: mix(pal.primary, "#ffffff", 0.45), channel: true },
      trim: { fill: "accent", glow: true, w: 4 },
    }),
  },
  // Strider: the lean under-suit, energy seams down the arm.
  strider: {
    tinted: true,
    tones: ({ pal }) => both({ base: mix(undersuit(pal), "#000000", 0.1), puff: 1, seams: true, trim: { fill: "accent", glow: true, w: 2.5 } }),
  },
  // Vanguard: sculpted plate over the whole forearm, glowing seams.
  vanguard: {
    tinted: true,
    tones: ({ pal }) => both({
      base: mix(pal.primary, "#141c26", 0.55), hi: "#eef6ff", hiOp: 0.2, puff: 4,
      plate: { fill: mix(pal.primary, "#2a3644", 0.35), hi: "#eef6ff", channel: true, wide: true },
      seams: true,
    }),
  },
  // Breacher: a riot vambrace, broad dark steel over the undersuit.
  breacher: {
    tinted: true,
    tones: ({ pal }) => both({
      base: undersuit(pal), puff: 4,
      plate: { fill: "#22262b", hi: "#c9d6e2", wide: true },
      bands: "#3c434b",
    }),
  },
  // Operator: soft kit, fabric sleeves in the palette's dark, no light.
  operator: {
    tinted: true,
    tones: ({ pal }) => both({ base: mix(pal.dark, "#3a4048", 0.35), fold: "#0a0c0f", foldOp: 0.55, puff: 5, stitch: mix(pal.dark, "#c9ccc4", 0.4) }),
  },
  // Wraith: the long coat's sleeve over wrapped forearms.
  wraith: {
    tinted: true,
    tones: ({ pal }) => both({ base: mix(pal.dark, "#101216", 0.55), puff: 4, wraps: mix(pal.dark, "#8a8f96", 0.35) }),
  },
  // Exo-Frame: the suit under a steel servo strut on each side of the forearm.
  exo: {
    tinted: true,
    tones: ({ pal }) => both({ base: undersuit(pal), struts: { fill: "#56626f", hi: "#c8d2dc" }, trim: { fill: "#e8b425", w: 3 } }),
  },
  // Marshal: the duster's cloth sleeve, roomy, with a turned-back leather cuff.
  duster: {
    tinted: true,
    tones: ({ pal }) => {
      const coat = mix(mix(pal.dark, "#000000", 0.2), "#5a3f2a", 0.62);
      return both({ base: coat, hi: "#e8d2b0", hiOp: 0.16, fold: mix(coat, "#000000", 0.6), foldOp: 0.6, puff: 7, turnback: { fill: mix(coat, "#000000", 0.25), w: 16 } });
    },
  },
  // Ronin: laced lacquer lamellar over a cloth sleeve.
  lamellar: {
    tinted: true,
    tones: ({ pal }) => both({ base: mix(pal.dark, "#1a1b22", 0.5), puff: 4, lamellar: { fill: mix(pal.dark, "#07080b", 0.45), hi: "#f4faff", lace: pal.primary } }),
  },
  // Horologist: a dark sleeve ringed with brass bands.
  clockwork: {
    tinted: true,
    tones: ({ pal }) => both({ base: mix(pal.dark, "#2a2018", 0.5), bands: "url(#vmBrass)", stitch: "#94735a" }),
  },
  // Runner: sleeves rolled to the elbow, LED ink up the bare forearm.
  streetwear: {
    tinted: true,
    bare: true,
    tones: ({ pal, skin }) => both({
      base: skin, hi: "#ffffff", hiOp: 0.12, fold: mix(skin, "#000000", 0.5), foldOp: 0.25, puff: 0,
      bare: { ink: "accent" }, roll: { fill: pal.primary, lo: mix(pal.primary, "#000000", 0.45) },
    }),
  },
  // Abyssal Diver: heavy canvas, stitched seams.
  diving: {
    tones: () => both({ base: "#4a4130", hi: "#7d7052", hiOp: 0.3, fold: "#1e1a12", foldOp: 0.6, puff: 6, stitch: "#a39280" }),
  },
  // Void Ranger: the puffy white pressure suit, ribbed.
  spacesuit: {
    tones: () => both({ base: "#e2e5e4", hi: "#ffffff", hiOp: 0.45, sh: "#4a535a", shOp: 0.4, fold: "#8e979e", foldOp: 0.6, puff: 9, ribs: "#c2c8cb" }, { base: "#cfd3d3", hiOp: 0.3 }),
  },
  // Chronomancer: the robe's bell sleeve, its hem in thread.
  vestment: {
    tinted: true,
    tones: ({ pal }) => {
      const C = cloth({ pal }, mix);
      return both({ base: C.base, hi: mix(C.base, "#ffffff", 0.35), hiOp: 0.2, fold: C.lo, foldOp: 0.7, puff: 6, bell: 14, trim: { fill: C.trim, w: 3 } });
    },
  },
});

const sleeves = new Map(); // bake key -> sleeve
/** The issued suit's sleeve in the default palette, as the stock look wears it. */
export const STANDARD_FRAME = "standard";

/**
 * A frame's sleeve for the viewmodel: `{ id, key, modern, real }`. `key`
 * names what its markup depends on: the frame, and the palette or skin only
 * for a sleeve that shows them. An unknown frame wears the issued sleeve.
 * @param {string} [id] frame id
 * @param {string} [skin] skin colour (rolled sleeves)
 * @param {{ primary: string, dark: string }} [pal] the look's palette
 */
export function fpSleeve(id, skin, pal) {
  if (!FP_SLEEVES[id]) id = STANDARD_FRAME;
  const entry = FP_SLEEVES[id];
  skin ??= pieceOf(null, "skinTone").color;
  pal ??= pieceOf(null, "color");
  const key = id + (entry.tinted ? `:${pal.primary}:${pal.dark}` : "") + (entry.bare ? `:${skin}` : "");
  let s = sleeves.get(key);
  if (!s) {
    s = Object.freeze({ id, key, ...entry.tones({ skin, pal }) });
    sleeves.set(key, s);
    while (sleeves.size > 16) sleeves.delete(sleeves.keys().next().value);
  }
  return s;
}
