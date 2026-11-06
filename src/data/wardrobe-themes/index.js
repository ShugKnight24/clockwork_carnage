/**
 * Wardrobe themes: named sets of creator pieces (frames, helmets, shoulders)
 * that mix freely with every other piece. Each theme is a data module here
 * and an art module under src/rendering/svg-art/wardrobe-themes/ with the
 * same ids. Saves store piece ids, so the tables' order is presentation:
 * src/data/cosmetics.js builds each table from these themes, in this order.
 *
 * A theme module's default export:
 *   { id, name, frames?: Entry[], helmets?: Entry[], shoulders?: Entry[] }
 * with each entry `{ id, name, desc, tier?, unlock?, bonuses?, perk?, visor?, face? }`,
 * and a helmet entry also `seats?` and `faceSlots?`:
 *   seats: which accessory seats the helmet takes, words from HELMET_SEATS
 *     mapped to booleans; a seat left out is taken. A helmet that already
 *     wears what a seat holds (the Centurion's crest) turns it off, and the
 *     helmet-slot accessory for that seat is not drawn on it.
 *   faceSlots: on a helmet that shows the face (`face: true`), which face
 *     slots it leaves room for, words from FACE_SLOTS (src/data/accessories.js)
 *     mapped to booleans; a slot left out has room. A helmet that covers the
 *     eyes or the jaw (the LED mask's band and shell) turns that slot off,
 *     and the item worn there is kept but not drawn. A closed helmet hides
 *     both slots and declares none.
 *
 * Data only: nothing here imports rendering code.
 */
import { deepFreeze, readonlySet } from "../../utils/freeze.js";
import { FACE_SLOTS } from "../accessories.js";
import issue from "./issue.js";
import exo from "./exo.js";
import marshal from "./marshal.js";
import ronin from "./ronin.js";
import horologist from "./horologist.js";
import runner from "./runner.js";
import diver from "./diver.js";
import ranger from "./ranger.js";
import chronomancer from "./chronomancer.js";

/** The tables a theme fills, by key. */
export const THEME_TABLES = Object.freeze(["frames", "helmets", "shoulders"]);

const THEMES = [issue, exo, marshal, ronin, horologist, runner, diver, ranger, chronomancer];

/** Every theme in creator order, each with all three tables; frozen through. */
export const WARDROBE_THEMES = deepFreeze(
  THEMES.map((t) => ({ id: t.id, name: t.name, ...Object.fromEntries(THEME_TABLES.map((key) => [key, t[key] || []])) })),
);

const OWNER = Object.fromEntries(
  THEME_TABLES.map((key) => [key, new Map(WARDROBE_THEMES.flatMap((t) => t[key].map((e) => [e.id, t.id])))]),
);

/**
 * The theme a piece belongs to.
 * @param {"frames"|"helmets"|"shoulders"} table
 * @param {string} id piece id
 * @returns {string|undefined} theme id, or undefined for a piece no theme lists
 */
export function themeOf(table, id) {
  return OWNER[table]?.get(id);
}

/**
 * One table as the creator lists it: every theme's entries, in theme order,
 * each tagged with its `theme`.
 * @param {"frames"|"helmets"|"shoulders"} table
 */
export function themeTable(table) {
  return WARDROBE_THEMES.flatMap((t) => t[table].map((e) => ({ ...e, theme: t.id })));
}

/**
 * Helmets that leave the face visible (entries with `face: true`), derived
 * once from the themes. Every reader (the rig, the fallen agent, the HUD
 * portrait, the creator) asks this set; nothing keeps its own list.
 * @type {ReadonlySet<string>}
 */
export const FACE_HELMETS = readonlySet(WARDROBE_THEMES.flatMap((t) => t.helmets.filter((e) => e.face === true).map((e) => e.id)));

const HELMET_ENTRY = new Map(WARDROBE_THEMES.flatMap((t) => t.helmets.map((e) => [e.id, e])));

/** A helmet's data entry; an unknown id is a bug and throws. */
function helmetEntry(id) {
  const e = HELMET_ENTRY.get(id);
  if (!e) throw new Error(`helmetEntry: no helmet "${id}"`);
  return e;
}

/**
 * The accessory seats on a helmet (its entry's `seats`), and the
 * helmet-slot gear each holds (src/data/accessories.js `seat`):
 *   crown — on top of the shell (a plume)
 *   brow  — on the forehead above the visor (night vision)
 *   side  — on the side rail and over the ears (lamps, whips, a headset)
 */
export const HELMET_SEATS = Object.freeze(["crown", "brow", "side"]);

/**
 * Which accessory seats a helmet takes: every seat, unless its entry turns one off.
 * @param {string} id helmet id
 * @returns {Record<string, boolean>}
 */
export function helmetSeats(id) {
  const seats = helmetEntry(id).seats || {};
  return Object.fromEntries(HELMET_SEATS.map((seat) => [seat, seats[seat] !== false]));
}

/**
 * Which face slots (FACE_SLOTS: eyes, face) show under a helmet: none under
 * one that hides the face, else every slot its entry leaves room for.
 * @param {string} id helmet id
 * @returns {Record<string, boolean>}
 */
export function helmetFaceSlots(id) {
  const e = helmetEntry(id);
  const slots = e.faceSlots || {};
  return Object.fromEntries(FACE_SLOTS.map((slot) => [slot, e.face === true && slots[slot] !== false]));
}

/**
 * Why a face slot does not show under a helmet, for the creator's note:
 * "hidden" under a helmet that hides the face, "room" under an open one
 * with no room for the slot, null when it shows.
 * @param {string} id helmet id
 * @param {string} slot a word from FACE_SLOTS
 * @returns {"hidden"|"room"|null}
 */
export function faceSlotBlock(id, slot) {
  if (!FACE_SLOTS.includes(slot)) throw new Error(`faceSlotBlock: "${slot}" is not a face slot (${FACE_SLOTS.join(", ")})`);
  if (!FACE_HELMETS.has(id)) return "hidden";
  return helmetFaceSlots(id)[slot] ? null : "room";
}
