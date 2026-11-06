/**
 * Validation for the character's look: the id fields (normalizeLook) and the
 * object-valued fields. Every function returns a fresh object, so callers
 * never share state with DEFAULT_CHARACTER.
 */
import { SYMBOLS, FRAMES, ENAMELS, METALS, FINISHES, PLACEMENTS, DEFAULT_BADGE, LEGACY_ICON_SYMBOL, byId } from "../data/badges.js";
import { ACCESSORY_SLOTS, ACCESSORIES, TINT_HEX, accessoryItem } from "../data/accessories.js";
import { BADGES } from "../data/cosmetics.js";
import { LOOK_TABLES, pieceOf } from "./character-fields.js";

const MAX_LAYERS = 8;
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const idIn = (table, id, fallback) => (typeof id === "string" && byId(table, id) ? id : fallback);
const num = (v, lo, hi, dflt) => (typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : dflt);

function normalizeLayer(raw) {
  const d = DEFAULT_BADGE.layers[0];
  const l = isObj(raw) ? raw : {};
  return {
    frame: idIn(FRAMES, l.frame, d.frame),
    symbol: idIn(SYMBOLS, l.symbol, d.symbol),
    enamel: idIn(ENAMELS, l.enamel, d.enamel),
    metal: idIn(METALS, l.metal, d.metal),
    x: num(l.x, -40, 40, 0),
    y: num(l.y, -40, 40, 0),
    scale: num(l.scale, 0.2, 2, 1),
    rot: ((num(l.rot, -3600, 3600, 0) % 360) + 360) % 360,
  };
}

export function normalizeBadge(raw) {
  if (!isObj(raw) || !Array.isArray(raw.layers) || raw.layers.length === 0) return structuredClone(DEFAULT_BADGE);
  const placements = Array.isArray(raw.placements)
    ? [...new Set(raw.placements.filter((p) => typeof p === "string" && byId(PLACEMENTS, p)))]
    : [];
  return {
    layers: raw.layers.slice(0, MAX_LAYERS).map(normalizeLayer),
    finish: idIn(FINISHES, raw.finish, "auto"),
    placements,
  };
}

export function normalizeAccessories(raw) {
  const src = isObj(raw) ? raw : {};
  const out = {};
  for (const { id } of ACCESSORY_SLOTS) {
    const v = src[id];
    out[id] = typeof v === "string" && ACCESSORIES[id].some((i) => i.id === v) ? v : "none";
  }
  return out;
}

/**
 * The accessory colours a character keeps (accessoryTints): a valid
 * `#rrggbb` (lower-cased), and only for a slot whose worn item declares a
 * `tint`; everything else is dropped. A colour for an item no longer worn
 * goes with it, so taking War Paint off and on again starts from its default.
 * @param {unknown} raw stored tints
 * @param {object} accessories the slots worn (normalizeAccessories)
 * @returns {Record<string, string>}
 */
export function normalizeAccessoryTints(raw, accessories) {
  const src = isObj(raw) ? raw : {};
  const out = {};
  for (const { id } of ACCESSORY_SLOTS) {
    const v = src[id];
    if (typeof v === "string" && TINT_HEX.test(v) && accessoryItem(id, accessories?.[id])?.tint) out[id] = v.toLowerCase();
  }
  return out;
}

/**
 * Every look field holding an id its table knows: a known id stays, a retired
 * one becomes its replacement, anything else (a cut piece, a newer build's
 * id, a wrong type, a missing field) becomes the table's first entry, the
 * default. `armorVariant` is clamped to 0..1. Other keys pass through as
 * they are; the object fields have their own normalisers above.
 * @param {object} raw a version 2 save (see migrateCharacterSave)
 */
export function normalizeLook(raw) {
  const src = isObj(raw) ? raw : {};
  const out = { ...src };
  for (const field of Object.keys(LOOK_TABLES)) out[field] = pieceOf(src, field).id;
  out.armorVariant = num(src.armorVariant, 0, 1, 0);
  return out;
}

/**
 * The badge a save from before the badge editor wore: its one legacy badge
 * pick as a single insignia layer, on the shoulder too when the shoulder
 * plates are big enough to carry it. An unknown badge is the default badge.
 * @param {string|undefined} badgeId BADGES id
 * @param {string|undefined} shoulderId SHOULDER_STYLES id
 */
export function migrateLegacyBadge(badgeId, shoulderId) {
  const icon = byId(BADGES, badgeId)?.icon;
  const symbol = icon && LEGACY_ICON_SYMBOL[icon];
  if (!symbol) return structuredClone(DEFAULT_BADGE);
  return {
    layers: [{ frame: "disc", symbol, enamel: "black", metal: "brass", x: 0, y: 0, scale: 1, rot: 0 }],
    finish: "insignia",
    placements: shoulderId === "pauldrons" || shoulderId === "armored" ? ["chest", "shoulder"] : ["chest"],
  };
}
