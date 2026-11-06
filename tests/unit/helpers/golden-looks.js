// tests/unit/helpers/golden-looks.js
// The look matrix the golden rig snapshots render (agent-rig-golden.test.js).
// Looks are named by piece id and built through lookFromIds, so the same
// matrix renders the same agents whatever the character record stores.
import {
  DEFAULT_CHARACTER,
  CHARACTER_COLORS,
  SKIN_TONES,
  HAIR_STYLES,
  EYE_COLORS,
  ARMOR_STYLES,
  VISOR_STYLES,
  WEAPON_SKINS,
  BODY_TYPES,
  CAMO_STYLES,
} from "../../../src/data/cosmetics.js";
import { SYMBOLS, FRAMES, ENAMELS, METALS, FINISHES, PLACEMENTS, layer } from "../../../src/data/badges.js";
import { ACCESSORIES } from "../../../src/data/accessories.js";
import { cloneLook, LOOK_TABLES } from "../../../src/core/character-fields.js";
import { CAST_KEYS } from "../../../src/rendering/svg-art/agent-rig.js";
import { WARDROBE_THEMES } from "../../../src/data/wardrobe-themes/index.js";

/**
 * A full character from look fields named by piece id
 * (`{ helmet: "wide", frame: "strider" }`). Fields not given keep
 * DEFAULT_CHARACTER's value; non-table fields (armorVariant, badge,
 * accessories) are copied as given. Throws on an unknown field or id so a
 * typo can never silently render the default piece.
 */
export function lookFromIds(ids) {
  const ch = cloneLook(DEFAULT_CHARACTER);
  for (const [field, value] of Object.entries(ids)) {
    const table = LOOK_TABLES[field];
    if (!table) {
      if (!(field in DEFAULT_CHARACTER)) throw new Error(`lookFromIds: unknown field "${field}"`);
      ch[field] = structuredClone(value);
      continue;
    }
    if (!table.some((e) => e.id === value)) throw new Error(`lookFromIds: unknown ${field} id "${value}"`);
    ch[field] = value;
  }
  return ch;
}

const ids = (table) => table.map((e) => e.id);
const at = (list, i) => list[i % list.length];

const worn = (table) => ids(table).filter((id) => id !== "none");

// The accessory slots the matrix's looks cycle through: the ones they were
// recorded with. Slots added later (the eyes and face slots) are covered by
// their own entries at the end (FACE_LOOKS), so adding one never changes the
// earlier looks.
const LOOK_SLOTS = ["back", "waist", "helmet", "arms", "neck", "legs"];

// One look per Field Issue helmet; frames, shoulders and visors cycle
// alongside so every legacy piece appears at least once, and the first six
// helmets (all take a visor) carry every visor. The other fields cycle too,
// so palettes, armour, hair, camo, armour variants, badges and accessories
// get covered without extra files. Every look wears a badge at every
// placement (so each helmet's badge seat is drawn) and one accessory per
// slot; the helmet slot cycles, so every helmet carries a helmet accessory.
//
// The Field Issue looks cycle over that theme's own pieces. Every other
// theme's looks (THEME_LOOKS) are rendered after them and named by theme, so
// adding a theme, or a piece to one, adds files and never renames or changes
// another theme's (see THEME_LOOKS).
const lookAt = (i, { helmet, frame, shoulder }) => ({
  helmet,
  frame,
  shoulder,
  visor: at(ids(VISOR_STYLES), i),
  color: at(ids(CHARACTER_COLORS), i),
  armor: at(ids(ARMOR_STYLES), i),
  hair: at(ids(HAIR_STYLES), i),
  skinTone: at(ids(SKIN_TONES), i),
  eye: at(ids(EYE_COLORS), i),
  camo: at(ids(CAMO_STYLES), i),
  weaponSkin: at(ids(WEAPON_SKINS), i),
  cape: i % 4 === 3 ? "none" : "cape",
  armorVariant: i % 2,
  badge: {
    layers: [layer(at(ids(SYMBOLS), i), at(ids(FRAMES), i), at(ids(ENAMELS), i), at(ids(METALS), i))],
    finish: at(ids(FINISHES), i),
    placements: ids(PLACEMENTS),
  },
  accessories: Object.fromEntries(LOOK_SLOTS.map((id) => [id, at(worn(ACCESSORIES[id]), i)])),
});

const [ISSUE, ...THEMES] = WARDROBE_THEMES;
const PIECE_LOOKS = ids(ISSUE.helmets).map((helmet, i) => lookAt(i, { helmet, frame: at(ids(ISSUE.frames), i), shoulder: at(ids(ISSUE.shoulders), i) }));

const ISSUE_LOOKS = ISSUE.helmets.length;

// Each later theme: as many looks as its longest table, its own pieces
// cycling. The other fields cycle from a seed of the theme's own (its place
// after Field Issue, plus the look's number in the theme), never from how
// many looks came before, so one theme's pieces never move another's. A look
// is named `<theme>-<n>-<helmet>-<frame>-<shoulder>`.
const THEME_LOOKS = THEMES.flatMap((t, k) => {
  const n = Math.max(t.frames.length, t.helmets.length, t.shoulders.length);
  return Array.from({ length: n }, (_, j) => {
    const look = lookAt(ISSUE_LOOKS + k + j, {
      helmet: t.helmets.length ? at(ids(t.helmets), j) : "standard",
      frame: t.frames.length ? at(ids(t.frames), j) : "standard",
      shoulder: t.shoulders.length ? at(ids(t.shoulders), j) : "pads",
    });
    return { name: `${t.id}-${j}-${look.helmet}-${look.frame}-${look.shoulder}`, look };
  });
});

const pad = (n) => String(n).padStart(2, "0");
const lookName = (i) => {
  const l = PIECE_LOOKS[i];
  return `${pad(i)}-${l.helmet}-${l.frame}-${l.shoulder}`;
};

function buildMatrix() {
  const out = [];
  const looks = (from, to) => {
    for (let i = from; i < to; i++) {
      for (const body of ids(BODY_TYPES)) {
        for (const pose of ["idle", "hero"]) {
          out.push({ name: `${lookName(i)}-${body}-${pose}`, ids: { ...PIECE_LOOKS[i], body }, opts: { pose }, kind: "svg" });
        }
      }
    }
  };
  looks(0, PIECE_LOOKS.length);
  // The stock agent with nothing worn: no badge, no accessories.
  out.push({ name: "default-plain-masc-idle", ids: {}, opts: { pose: "idle" }, kind: "svg" });
  // Cast models: look 0, and a fem build with a wide frame and pads.
  for (const [i, body] of [[0, "masc"], [4, "fem"]]) {
    for (const key of CAST_KEYS) {
      out.push({ name: `cast-${key}-${lookName(i)}-${body}`, ids: { ...PIECE_LOOKS[i], body }, opts: { key }, kind: "cast" });
    }
  }
  // The fallen agent with an open helmet and with both visorless helmets.
  for (const helmet of ["wide", "reaper", "bandana"]) {
    const i = PIECE_LOOKS.findIndex((l) => l.helmet === helmet);
    out.push({ name: `cast-hero_fallen-${lookName(i)}-masc`, ids: { ...PIECE_LOOKS[i], body: "masc" }, opts: { key: "hero_fallen" }, kind: "cast" });
  }
  // Option tiles (head only): an open and a closed helmet, plain and realistic.
  for (const i of [1, 0]) {
    for (const realistic of [false, true]) {
      const name = `head-${realistic ? "real-" : ""}${lookName(i)}-masc`;
      out.push({ name, ids: { ...PIECE_LOOKS[i], body: "masc" }, opts: { headOnly: true, realistic }, kind: "svg" });
    }
  }
  out.push({ name: `real-${lookName(2)}-fem-hero`, ids: { ...PIECE_LOOKS[2], body: "fem" }, opts: { pose: "hero", realistic: true }, kind: "svg" });
  out.push({ name: `real-cast-hero_fallen-${lookName(6)}-masc`, ids: { ...PIECE_LOOKS[6], body: "masc" }, opts: { key: "hero_fallen", realistic: true }, kind: "cast" });
  out.push({ name: `bust-peek-${lookName(1)}-masc`, ids: { ...PIECE_LOOKS[1], body: "masc" }, opts: { pose: "bust", peek: true }, kind: "svg" });
  // The fallen agent in every Field Issue frame the helmets above left out,
  // so each frame's fallen silhouette is drawn (appended: no id moves).
  const downFrames = new Set(out.filter((e) => e.opts.key === "hero_fallen").map((e) => e.ids.frame));
  for (const frame of ids(ISSUE.frames).filter((id) => !downFrames.has(id))) {
    const i = PIECE_LOOKS.findIndex((l) => l.frame === frame);
    out.push({ name: `cast-hero_fallen-${lookName(i)}-masc`, ids: { ...PIECE_LOOKS[i], body: "masc" }, opts: { key: "hero_fallen" }, kind: "cast" });
  }
  // Field Issue entries take their ids from their place in the matrix.
  const issue = out.map((e, n) => (e.kind === "svg" ? { ...e, opts: { ...e.opts, idPrefix: `g${n}-` } } : e));
  // The other themes, last, each entry's ids prefixed by its own name so no
  // other entry moves them; every look fallen too, as above.
  const themed = [];
  for (const { name, look } of THEME_LOOKS) {
    for (const body of ids(BODY_TYPES)) {
      for (const pose of ["idle", "hero"]) themed.push({ name: `${name}-${body}-${pose}`, ids: { ...look, body }, opts: { pose }, kind: "svg" });
    }
    themed.push({ name: `cast-hero_fallen-${name}-masc`, ids: { ...look, body: "masc" }, opts: { key: "hero_fallen" }, kind: "cast" });
  }
  // Hair colour, appended: a natural shade, a dye (the brows stay natural) and
  // the charged colour (the suit's accent), on face-showing helmets so the
  // hair is drawn. Named by colour, ids prefixed by name like the themes'.
  const hair = [
    ["platinum", { helmet: "wide", hair: "short" }],
    ["pink", { helmet: "ledmask", hair: "hawk" }],
    ["chrono", { helmet: "bubble", hair: "long", color: "void_purple" }],
  ].map(([hairColor, ids]) => {
    const name = `hair-${hairColor}-${ids.helmet}-${ids.hair}-masc-idle`;
    return { name, ids: { ...ids, hairColor, body: "masc" }, opts: { pose: "idle" }, kind: "svg" };
  });
  // Eyes and face items, appended: every item worn on an open helmet in both
  // builds (the feminine jaw narrows them), on each helmet that shows the
  // face (the Marshal's brim takes eyewear only, the bubble draws them inside
  // its glass), fallen, and on a bare-headed peek under a closed helmet.
  const face = [];
  const wearing = (eyes, item) => ({ ...DEFAULT_CHARACTER.accessories, eyes, face: item });
  for (const [eyes, item, helmet, hair] of FACE_LOOKS) {
    for (const body of ids(BODY_TYPES)) {
      const name = `face-${eyes}-${item}-${helmet}-${body}-idle`;
      face.push({ name, ids: { helmet, hair, body, accessories: wearing(eyes, item) }, opts: { pose: "idle" }, kind: "svg" });
    }
  }
  face.push({ name: "cast-hero_fallen-face-cybereye-beard-wide-masc", ids: { helmet: "wide", body: "masc", accessories: wearing("cybereye", "beard") }, opts: { key: "hero_fallen" }, kind: "cast" });
  face.push({ name: "bust-peek-face-monocle-scar-standard-fem", ids: { helmet: "standard", body: "fem", accessories: wearing("monocle", "scar") }, opts: { pose: "bust", peek: true }, kind: "svg" });
  // War paint in two paints on two palettes (the same paint on either), on
  // light and deep skin, both builds.
  for (const [paint, hex, color, skinTone, body] of PAINT_LOOKS) {
    const name = `paint-${paint}-${color}-${skinTone}-${body}-idle`;
    face.push({ name, ids: { helmet: "wide", hair: "buzz", color, skinTone, body, accessories: wearing("none", "warpaint"), accessoryTints: { face: hex } }, opts: { pose: "idle" }, kind: "svg" });
  }
  return [...issue, ...[...themed, ...hair, ...face].map((e) => (e.kind === "svg" ? { ...e, opts: { ...e.opts, idPrefix: `${e.name}-` } } : e))];
}

/** Eyes item, face item, helmet and hair cut of the appended face looks. */
const FACE_LOOKS = [
  ["aviators", "scar", "wide", "short"],
  ["shades", "cigar", "mohawk", "buzz"],
  ["eyepatch", "beard", "bubble", "long"],
  ["cybereye", "freckles", "brim", "short"],
  ["monocle", "piercings", "wide", "curtain"],
  ["aviators", "nosestrip", "bubble", "hawk"],
  ["shades", "warpaint", "mohawk", "short"],
];

/** Paint name and colour, palette, skin tone and build of the appended war paint looks. */
const PAINT_LOOKS = [
  ["woad", "#2f4f8f", "chrono_teal", "cool_fair", "masc"],
  ["woad", "#2f4f8f", "midnight_blue", "deep_brown", "fem"],
  ["white", "#f2efe8", "chrono_teal", "deep_brown", "masc"],
  ["white", "#f2efe8", "midnight_blue", "cool_fair", "fem"],
];

/** @type {{ name: string, ids: object, opts: object, kind: "svg"|"cast" }[]} */
export const GOLDEN_MATRIX = buildMatrix();

/**
 * Markup normalised for a readable, stable diff: every decimal number at
 * three places (trailing zeros dropped, -0 as 0), one element per line
 * (whitespace between tags dropped: it draws nothing).
 */
export function normaliseSvg(markup) {
  return (
    markup
      .replace(/-?\d*\.\d+(?:e[+-]?\d+)?/gi, (m) => String(+Number(m).toFixed(3)))
      .split(/>\s*</)
      .join(">\n<") + "\n"
  );
}
