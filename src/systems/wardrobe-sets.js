/**
 * Wardrobe sets: a designed theme's frame, helmet and shoulders worn in one
 * go (the creator's Sets row). Only pieces the player owns go on; a locked
 * piece is skipped, the slot keeps what is worn, and the caller is told
 * which and why. Field Issue is the shared stock the themes grew from, not
 * a set, so it has none. Everything stays individually changeable after.
 */
import { WARDROBE_THEMES } from "../data/wardrobe-themes/index.js";
import { pieceOf, withId } from "../core/character-fields.js";
import { unlockState } from "./unlocks.js";

/** The theme whose pieces were never designed as one look. */
const NO_SET = "issue";

/** A set's slots: the character field, and the theme table its piece comes from. */
export const SET_SLOTS = Object.freeze([
  Object.freeze({ field: "frame", table: "frames" }),
  Object.freeze({ field: "helmet", table: "helmets" }),
  Object.freeze({ field: "shoulder", table: "shoulders" }),
]);

/** Every theme that has a set, in creator order. */
export const SET_THEMES = Object.freeze(WARDROBE_THEMES.filter((t) => t.id !== NO_SET));

function setTheme(themeId) {
  if (themeId === NO_SET) throw new RangeError(`equipSet: "${NO_SET}" has no set`);
  const theme = SET_THEMES.find((t) => t.id === themeId);
  if (!theme) throw new RangeError(`equipSet: no theme "${themeId}"`);
  return theme;
}

/**
 * A set's pieces, one per slot the theme fills: its first entry in each table.
 * @param {string} themeId a theme with a set (not "issue": throws)
 * @returns {{ field: string, id: string, name: string }[]}
 */
export function setPieces(themeId) {
  const theme = setTheme(themeId);
  return SET_SLOTS.filter(({ table }) => theme[table].length).map(({ field, table }) => ({ field, id: theme[table][0].id, name: theme[table][0].name }));
}

/**
 * Put on a theme's set. Each piece the unlock context reports unlocked goes
 * into `changes` (through withId, as a single pick would); each locked one
 * is listed in `skipped` with its unlock hint, and its slot left as worn.
 * @param {object} ch the character
 * @param {string} themeId a theme with a set ("issue" throws)
 * @param {object} ctx unlock context (src/systems/unlocks.js)
 * @returns {{ changes: object, skipped: { field: string, id: string, hint: string }[] }}
 */
export function equipSet(ch, themeId, ctx) {
  const changes = {};
  const skipped = [];
  for (const { field, id } of setPieces(themeId)) {
    const st = unlockState(field, id, ctx);
    if (!st.unlocked) skipped.push({ field, id, hint: st.hint });
    else Object.assign(changes, withId(ch, field, id));
  }
  return { changes, skipped };
}

/** True when `ch` wears every piece of the theme's set. */
export function wearsSet(ch, themeId) {
  return setPieces(themeId).every(({ field, id }) => pieceOf(ch, field).id === id);
}
