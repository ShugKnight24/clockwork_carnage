/**
 * Accessory painters by slot. Each painter takes the rig anchors (with
 * A.pose) and the resolved look and returns markup for the layers it uses:
 * back (behind the torso and cape), front (on the body, under the arms and
 * rifle), top (over the arms, hands and collar), glow, head (with the helmet).
 * Helmet-slot glows come back as headGlow so they turn and fall with the head.
 * Every group is tagged data-acc="<id>" for tests and debugging.
 * A painter's third argument is its kit, K.uid(name) and K.defs(markup)
 * (../id-scope.js): scoped ids and the figure's defs, which come back as
 * `defs` for the rig to put in the figure's <defs>.
 * Helmet gear needs its `seat` on the helmet (A.seats, from the helmet's
 * art); a helmet that turns that seat off does not wear it.
 */
import { ACCESSORY_SLOTS, ACCESSORIES } from "../../../data/accessories.js";
import { idScope } from "../id-scope.js";
import { PAINTERS as back } from "./back.js";
import { PAINTERS as waist } from "./waist.js";
import { PAINTERS as helmet } from "./helmet.js";
import { PAINTERS as arms } from "./arms.js";
import { PAINTERS as neck } from "./neck.js";
import { PAINTERS as legs } from "./legs.js";

export const PAINTERS_BY_SLOT = { back, waist, helmet, arms, neck, legs };
const CAPE_REPLACERS = new Set(["cloak"]);
const LAYERS = ["back", "front", "top", "glow", "head"];
/** The helmet seat each helmet-slot item needs. */
const SEAT_OF = new Map(ACCESSORIES.helmet.filter((e) => e.seat).map((e) => [e.id, e.seat]));

export function paintAccessories(accessories, A, c) {
  const out = { back: "", front: "", top: "", glow: "", head: "", headGlow: "", defs: "", replacesCape: false };
  const scope = idScope();
  for (const { id: slot } of ACCESSORY_SLOTS) {
    const itemId = accessories?.[slot];
    if (!itemId || itemId === "none") continue;
    const paint = PAINTERS_BY_SLOT[slot][itemId];
    if (!paint) continue;
    if (slot === "helmet" && A.seats?.[SEAT_OF.get(itemId)] === false) continue;
    const r = paint(A, c, scope.kit(`acc-${slot}-${itemId}`));
    for (const k of LAYERS) {
      if (!r[k]) continue;
      out[slot === "helmet" && k === "glow" ? "headGlow" : k] += `<g data-acc="${itemId}">${r[k]}</g>`;
    }
    if (slot === "back" && CAPE_REPLACERS.has(itemId)) out.replacesCape = true;
  }
  out.defs = scope.markup();
  return out;
}
