/**
 * Wardrobe themes: named sets of creator pieces (frames, helmets, shoulders)
 * that mix freely with every other piece. Each theme is a data module here
 * and an art module under src/rendering/svg-art/wardrobe-themes/ with the
 * same ids. Saves store piece ids, so the tables' order is presentation:
 * src/data/cosmetics.js builds each table from these themes, in this order.
 *
 * A theme module's default export:
 *   { id, name, frames?: Entry[], helmets?: Entry[], shoulders?: Entry[] }
 * with each entry `{ id, name, desc, tier?, unlock?, bonuses?, perk?, visor?, face? }`.
 *
 * Data only: nothing here imports rendering code.
 */
import issue from "./issue.js";

/** The tables a theme fills, by key. */
export const THEME_TABLES = Object.freeze(["frames", "helmets", "shoulders"]);

const THEMES = [issue];

/** Every theme in creator order, each with all three tables. */
export const WARDROBE_THEMES = Object.freeze(
  THEMES.map((t) => Object.freeze({ id: t.id, name: t.name, ...Object.fromEntries(THEME_TABLES.map((key) => [key, t[key] || []])) })),
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
