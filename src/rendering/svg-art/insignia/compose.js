/**
 * renderBadge: a badge layer stack as SVG markup in a -50..50 box. Memoized by
 * the stack, treatment and detail. Placement (where and how big) is the
 * caller's job; see agent-rig.js.
 */
import { ENAMELS, METALS, byId } from "../../../data/badges.js";
import { ARMOR_STYLES } from "../../../data/cosmetics.js";
import { renderFinish } from "./finishes.js";

const DEFAULT_TREATMENT = { finish: "insignia", metal: "brass" };
const cache = new Map();
const MAX = 256;

export function resolveTreatment(ch) {
  const a = ARMOR_STYLES[(ch && ch.armorIndex) | 0] || ARMOR_STYLES[0];
  const t = ch?.armorVariant ? a.variant?.badgeTreatment : a.badgeTreatment;
  return t || DEFAULT_TREATMENT;
}

export function renderBadge(badge, { treatment = DEFAULT_TREATMENT, detail = "high" } = {}) {
  const auto = badge.finish === "auto";
  const finish = auto ? treatment.finish : badge.finish;
  const key = `${finish}|${auto ? treatment.metal : ""}|${detail}|${badge.layers.map((l) => `${l.frame}:${l.symbol}:${l.enamel}:${l.metal}:${l.x}:${l.y}:${l.scale}:${l.rot}`).join(";")}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let body = "";
  for (const l of badge.layers) {
    const metal = byId(METALS, auto ? treatment.metal : l.metal) || METALS[0];
    const enamel = (byId(ENAMELS, l.enamel) || ENAMELS[0]).color;
    const inner = renderFinish(finish, { frame: l.frame, symbol: l.symbol, enamel, ramp: metal.ramp, detail });
    const tf = l.x || l.y || l.scale !== 1 || l.rot ? ` transform="translate(${l.x},${l.y}) rotate(${l.rot}) scale(${l.scale})"` : "";
    body += tf ? `<g${tf}>${inner}</g>` : inner;
  }
  const out = `<g data-finish="${finish}">${body}</g>`;
  if (cache.size >= MAX) cache.delete(cache.keys().next().value);
  cache.set(key, out);
  return out;
}

/** Test hook. */
export const _cacheSize = () => cache.size;
