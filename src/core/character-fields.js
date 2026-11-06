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
import { ACCESSORY_SLOTS, ACCESSORIES } from "../data/accessories.js";
import {
  CHARACTER_COLORS, SKIN_TONES, HAIR_STYLES, EYE_COLORS, ARMOR_STYLES, HELMET_STYLES, VISOR_STYLES, SHOULDER_STYLES,
  WEAPON_SKINS, LOADOUT_CLASSES, BACKSTORIES, VOICE_PROFILES, BODY_FRAMES, CAPE_STYLES, BODY_TYPES, CAMO_STYLES,
  pieceIn,
} from "../data/cosmetics.js";

/** Look field -> the table its id picks from. The one map of them. */
export const LOOK_TABLES = Object.freeze({
  color: CHARACTER_COLORS,
  skinTone: SKIN_TONES,
  hair: HAIR_STYLES,
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

export function getIndex(ch, key) {
  const badge = ch.badge;
  if (key === "badge.preset") {
    if (!badge?.placements?.length || badge.layers.length !== 1) return -1;
    return BADGE_PRESETS.findIndex((p) => p.badge.finish === badge.finish && sameLayer(p.badge.layers[0], badge.layers[0]));
  }
  if (key in LAYER_FIELD) {
    const [field, table] = LAYER_FIELD[key];
    return Math.max(0, indexOfId(table, badge?.layers?.[0]?.[field]));
  }
  if (key === "badge.finish") return Math.max(0, indexOfId(FINISHES, badge?.finish));
  if (key.startsWith("acc.")) {
    const slot = key.slice(4);
    return Math.max(0, indexOfId(ACCESSORIES[slot] || [], ch.accessories?.[slot]));
  }
  const table = LOOK_TABLES[key];
  return table ? table.indexOf(pieceOf(ch, key)) : ch[key] | 0;
}

const shown = (placements) => (placements.length ? [...placements] : ["chest"]);

export function withIndex(ch, key, idx) {
  const badge = ch.badge;
  if (key === "badge.preset") {
    const p = BADGE_PRESETS[idx];
    return { badge: { layers: structuredClone(p.badge.layers), finish: p.badge.finish, placements: shown(badge.placements) } };
  }
  if (key in LAYER_FIELD) {
    const [field, table] = LAYER_FIELD[key];
    const layers = badge.layers.map((l, i) => (i === 0 ? { ...l, [field]: table[idx].id } : { ...l }));
    return { badge: { ...badge, layers, placements: shown(badge.placements) } };
  }
  if (key === "badge.finish") {
    return { badge: { ...badge, layers: badge.layers.map((l) => ({ ...l })), placements: shown(badge.placements), finish: FINISHES[idx].id } };
  }
  if (key.startsWith("acc.")) {
    const slot = key.slice(4);
    return { accessories: { ...ch.accessories, [slot]: ACCESSORIES[slot][idx].id } };
  }
  const table = LOOK_TABLES[key];
  if (!table) return { [key]: idx };
  const id = table[idx]?.id;
  if (key === "armor" && ch.armorVariant) return { armor: id, armorVariant: 0 };
  return { [key]: id };
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
  if (ch.weaponFinishes) out.weaponFinishes = { ...ch.weaponFinishes };
  if (ch.customSkins) out.customSkins = ch.customSkins.map((s) => ({ ...s }));
  return out;
}

/** Look fields that change the drawn agent (name and voice do not). */
const DRAWN = [
  "color", "skinTone", "hair", "eye", "armor", "helmet",
  "visor", "shoulder", "weaponSkin", "loadout", "backstory",
  "frame", "cape", "body", "camo",
];

export function lookKey(ch) {
  const c = ch || {};
  const flat = `${DRAWN.map((k) => pieceOf(c, k).id).join(".")}.${c.armorVariant | 0}`;
  const b = c.badge;
  const badge = b
    ? `${b.finish}|${(b.placements || []).join(",")}|${(b.layers || []).map((l) => `${l.frame}:${l.symbol}:${l.enamel}:${l.metal}:${l.x}:${l.y}:${l.scale}:${l.rot}`).join(";")}`
    : "-";
  const acc = c.accessories ? ACCESSORY_SLOTS.map(({ id }) => c.accessories[id] || "none").join(",") : "-";
  return `${flat}#${badge}#${acc}`;
}
