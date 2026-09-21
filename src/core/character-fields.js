/**
 * Index-shaped access to every character field, so the showroom and the
 * Legacy creator can keep treating each option list as "key + index" while
 * the record stores nested ids (badge stack, accessories).
 *
 * Virtual keys: badge.preset, badge.symbol, badge.frame, badge.enamel,
 * badge.metal, badge.finish, acc.<slot>. Everything else is a flat index key.
 */
import { SYMBOLS, FRAMES, ENAMELS, METALS, FINISHES, BADGE_PRESETS, indexOfId } from "../data/badges.js";
import { ACCESSORY_SLOTS, ACCESSORIES } from "../data/accessories.js";

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
  return ch[key] | 0;
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
    return { badge: { ...badge, layers: badge.layers.map((l) => ({ ...l })), placements: [...badge.placements], finish: FINISHES[idx].id } };
  }
  if (key.startsWith("acc.")) {
    const slot = key.slice(4);
    return { accessories: { ...ch.accessories, [slot]: ACCESSORIES[slot][idx].id } };
  }
  if (key === "armorIndex" && ch.armorVariant) return { armorIndex: idx, armorVariant: 0 };
  return { [key]: idx };
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
  return out;
}

/** Index fields that change the drawn agent (name and voice do not). */
const DRAWN = [
  "colorIndex", "skinToneIndex", "hairIndex", "eyeIndex", "armorIndex", "helmetIndex",
  "visorIndex", "shoulderIndex", "weaponSkinIndex", "loadoutIndex", "backstoryIndex", "armorVariant",
];

export function lookKey(ch) {
  const c = ch || {};
  const flat = DRAWN.map((k) => c[k] | 0).join(".");
  const b = c.badge;
  const badge = b
    ? `${b.finish}|${(b.placements || []).join(",")}|${(b.layers || []).map((l) => `${l.frame}:${l.symbol}:${l.enamel}:${l.metal}:${l.x}:${l.y}:${l.scale}:${l.rot}`).join(";")}`
    : "-";
  const acc = c.accessories ? ACCESSORY_SLOTS.map(({ id }) => c.accessories[id] || "none").join(",") : "-";
  return `${flat}#${badge}#${acc}`;
}
