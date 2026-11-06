/**
 * Index-shaped access to every character field, so the showroom and the
 * Legacy creator can keep treating each option list as "key + index" while
 * the record stores ids (flat look fields, badge stack, accessories).
 *
 * Flat keys are the look fields of LOOK_TABLES (`helmet`, `frame`, ...); the
 * record holds the piece id, and a position is asked of the table only when
 * a caller needs one. Virtual keys: badge.preset, badge.symbol, badge.frame,
 * badge.enamel, badge.metal, badge.finish, acc.<slot>.
 */
import { SYMBOLS, FRAMES, ENAMELS, METALS, FINISHES, BADGE_PRESETS, indexOfId } from "../data/badges.js";
import { ACCESSORY_SLOTS, ACCESSORIES, TINT_HEX, accessoryItem, tintFor } from "../data/accessories.js";
import {
  CHARACTER_COLORS, SKIN_TONES, HAIR_STYLES, HAIR_COLORS, EYE_COLORS, ARMOR_STYLES, HELMET_STYLES, VISOR_STYLES, SHOULDER_STYLES,
  WEAPON_SKINS, LOADOUT_CLASSES, BACKSTORIES, VOICE_PROFILES, BODY_FRAMES, CAPE_STYLES, BODY_TYPES, CAMO_STYLES,
  pieceIn,
} from "../data/cosmetics.js";

/** Look field -> the table its id picks from. The one map of them. */
export const LOOK_TABLES = Object.freeze({
  color: CHARACTER_COLORS,
  skinTone: SKIN_TONES,
  hair: HAIR_STYLES,
  hairColor: HAIR_COLORS,
  eye: EYE_COLORS,
  armor: ARMOR_STYLES,
  helmet: HELMET_STYLES,
  visor: VISOR_STYLES,
  shoulder: SHOULDER_STYLES,
  weaponSkin: WEAPON_SKINS,
  loadout: LOADOUT_CLASSES,
  backstory: BACKSTORIES,
  voice: VOICE_PROFILES,
  frame: BODY_FRAMES,
  cape: CAPE_STYLES,
  body: BODY_TYPES,
  camo: CAMO_STYLES,
});

/**
 * The table entry a character wears in a look field: its id, else the piece
 * that replaced it (RETIRED_PIECES), else the table's first entry. Never
 * undefined, whatever the record holds.
 * @param {object|null|undefined} ch
 * @param {string} field a key of LOOK_TABLES
 */
export function pieceOf(ch, field) {
  return pieceIn(LOOK_TABLES[field], field, ch?.[field]);
}

const LAYER_FIELD = { "badge.symbol": ["symbol", SYMBOLS], "badge.frame": ["frame", FRAMES], "badge.enamel": ["enamel", ENAMELS], "badge.metal": ["metal", METALS] };

export const FIELD_TABLES = {
  "badge.preset": BADGE_PRESETS,
  "badge.symbol": SYMBOLS,
  "badge.frame": FRAMES,
  "badge.enamel": ENAMELS,
  "badge.metal": METALS,
  "badge.finish": FINISHES,
  ...Object.fromEntries(ACCESSORY_SLOTS.map(({ id }) => [`acc.${id}`, ACCESSORIES[id]])),
};

export const isVirtualKey = (key) => key in FIELD_TABLES;
export const tableFor = (key) => FIELD_TABLES[key];

const sameLayer = (a, b) => a.frame === b.frame && a.symbol === b.symbol && a.enamel === b.enamel && a.metal === b.metal;

/** The table behind any key, flat or virtual; undefined for a key that has none. */
const anyTable = (key) => LOOK_TABLES[key] || FIELD_TABLES[key];

/** `id` when `table` has it, else the table's first entry's (how virtual fields always read). */
const idIn = (table, id) => (table.some((e) => e.id === id) ? id : table[0].id);

/**
 * The id a character wears under a key. Flat look fields resolve through
 * pieceOf; badge layers, finish and accessory slots read their nested id;
 * `badge.preset` is the library preset the badge matches, or null.
 */
export function getId(ch, key) {
  if (LOOK_TABLES[key]) return pieceOf(ch, key).id;
  const badge = ch.badge;
  if (key === "badge.preset") {
    if (!badge?.placements?.length || badge.layers.length !== 1) return null;
    return BADGE_PRESETS.find((p) => p.badge.finish === badge.finish && sameLayer(p.badge.layers[0], badge.layers[0]))?.id ?? null;
  }
  if (key in LAYER_FIELD) {
    const [field, table] = LAYER_FIELD[key];
    return idIn(table, badge?.layers?.[0]?.[field]);
  }
  if (key === "badge.finish") return idIn(FINISHES, badge?.finish);
  if (key.startsWith("acc.") && ACCESSORIES[key.slice(4)]) return idIn(ACCESSORIES[key.slice(4)], ch.accessories?.[key.slice(4)]);
  throw new TypeError(`getId: no table for "${key}"`);
}

/**
 * Position of the worn piece in its table, for grid navigation only; -1 for
 * a badge that matches no preset. Everything else works in ids (getId).
 */
export function getIndex(ch, key) {
  return indexOfId(anyTable(key) || [], getId(ch, key));
}

const shown = (placements) => (placements.length ? [...placements] : ["chest"]);

/**
 * The changes that put piece `id` on under `key`, as fresh objects. Throws a
 * RangeError for an id its table does not have: equipping one is a bug.
 */
export function withId(ch, key, id) {
  const table = anyTable(key);
  if (!table) throw new TypeError(`withId: no table for "${key}"`);
  const item = table.find((e) => e.id === id);
  if (!item) throw new RangeError(`withId: "${key}" has no piece "${id}"`);
  const badge = ch.badge;
  if (key === "badge.preset") {
    return { badge: { layers: structuredClone(item.badge.layers), finish: item.badge.finish, placements: shown(badge.placements) } };
  }
  if (key in LAYER_FIELD) {
    const [field] = LAYER_FIELD[key];
    const layers = badge.layers.map((l, i) => (i === 0 ? { ...l, [field]: id } : { ...l }));
    return { badge: { ...badge, layers, placements: shown(badge.placements) } };
  }
  if (key === "badge.finish") {
    return { badge: { ...badge, layers: badge.layers.map((l) => ({ ...l })), placements: shown(badge.placements), finish: id } };
  }
  if (key.startsWith("acc.")) return { accessories: { ...ch.accessories, [key.slice(4)]: id } };
  if (key === "armor" && ch.armorVariant) return { armor: id, armorVariant: 0 };
  return { [key]: id };
}

/**
 * withId for the piece at a grid position. Throws a RangeError for a position
 * outside the table: grids only ever offer real positions.
 */
export function withIndex(ch, key, idx) {
  const table = anyTable(key);
  if (!table) throw new TypeError(`withIndex: no table for "${key}"`);
  if (!Number.isInteger(idx) || idx < 0 || idx >= table.length) {
    throw new RangeError(`withIndex: position ${idx} is outside "${key}" (0..${table.length - 1})`);
  }
  return withId(ch, key, table[idx].id);
}

/**
 * The change that paints the item worn in `slot` in `hex` (accessoryTints).
 * Throws a RangeError for a colour that is not `#rrggbb` or a slot whose
 * worn item takes no tint: the creator only offers a colour for one that does.
 */
export function withTint(ch, slot, hex) {
  if (typeof hex !== "string" || !TINT_HEX.test(hex)) throw new RangeError(`withTint: "${hex}" is not a #rrggbb colour`);
  if (!accessoryItem(slot, ch.accessories?.[slot])?.tint) throw new RangeError(`withTint: nothing worn in "${slot}" takes a tint`);
  return { accessoryTints: { ...ch.accessoryTints, [slot]: hex.toLowerCase() } };
}

export function togglePlacement(ch, placementId) {
  const has = ch.badge.placements.includes(placementId);
  const placements = has ? ch.badge.placements.filter((p) => p !== placementId) : [...ch.badge.placements, placementId];
  return { badge: { ...ch.badge, layers: ch.badge.layers.map((l) => ({ ...l })), placements } };
}

export function cloneLook(ch) {
  const out = { ...ch };
  if (ch.badge) out.badge = structuredClone(ch.badge);
  if (ch.accessories) out.accessories = { ...ch.accessories };
  if (ch.accessoryTints) out.accessoryTints = { ...ch.accessoryTints };
  if (ch.weaponFinishes) out.weaponFinishes = { ...ch.weaponFinishes };
  if (ch.customSkins) out.customSkins = ch.customSkins.map((s) => ({ ...s }));
  return out;
}

/** Look fields that change the drawn agent (name and voice do not). */
const DRAWN = [
  "color", "skinTone", "hair", "eye", "armor", "helmet",
  "visor", "shoulder", "weaponSkin", "loadout", "backstory",
  "frame", "cape", "body", "camo", "hairColor",
];

export function lookKey(ch) {
  const c = ch || {};
  const flat = `${DRAWN.map((k) => pieceOf(c, k).id).join(".")}.${c.armorVariant | 0}`;
  const b = c.badge;
  const badge = b
    ? `${b.finish}|${(b.placements || []).join(",")}|${(b.layers || []).map((l) => `${l.frame}:${l.symbol}:${l.enamel}:${l.metal}:${l.x}:${l.y}:${l.scale}:${l.rot}`).join(";")}`
    : "-";
  // Each worn item's colour as drawn (tintFor), so a colour kept for an item
  // not worn changes nothing.
  const acc = c.accessories ? ACCESSORY_SLOTS.map(({ id }) => (c.accessories[id] || "none") + (tintFor(c, id) ? `:${tintFor(c, id)}` : "")).join(",") : "-";
  return `${flat}#${badge}#${acc}`;
}
