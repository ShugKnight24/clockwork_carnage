/**
 * Validation for the object-valued character fields. Every function returns a
 * fresh object, so callers never share state with DEFAULT_CHARACTER.
 */
import { SYMBOLS, FRAMES, ENAMELS, METALS, FINISHES, PLACEMENTS, DEFAULT_BADGE, LEGACY_ICON_SYMBOL, byId } from "../data/badges.js";
import { ACCESSORY_SLOTS, ACCESSORIES } from "../data/accessories.js";
import { BADGES, SHOULDER_STYLES } from "../data/cosmetics.js";

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

export function migrateLegacyBadge(badgeIndex, shoulderIndex) {
  const icon = BADGES[badgeIndex]?.icon;
  const symbol = icon && LEGACY_ICON_SYMBOL[icon];
  if (!symbol) return structuredClone(DEFAULT_BADGE);
  const sh = SHOULDER_STYLES[shoulderIndex]?.id;
  return {
    layers: [{ frame: "disc", symbol, enamel: "black", metal: "brass", x: 0, y: 0, scale: 1, rot: 0 }],
    finish: "insignia",
    placements: sh === "pauldrons" || sh === "armored" ? ["chest", "shoulder"] : ["chest"],
  };
}
