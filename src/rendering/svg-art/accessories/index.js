/**
 * Accessory painters by slot. Each painter takes the rig anchors (with
 * A.pose) and the resolved look and returns markup for the layers it uses:
 * back (behind the torso and cape), front (on the body, under the arms and
 * rifle), top (over the arms, hands and collar), glow, head (with the helmet).
 * Helmet-slot glows come back as headGlow so they turn and fall with the head.
 * Every group is tagged data-acc="<id>" for tests and debugging.
 */
import { ACCESSORY_SLOTS } from "../../../data/accessories.js";
import { PAINTERS as back } from "./back.js";
import { PAINTERS as waist } from "./waist.js";
import { PAINTERS as helmet } from "./helmet.js";
import { PAINTERS as arms } from "./arms.js";
import { PAINTERS as neck } from "./neck.js";
import { PAINTERS as legs } from "./legs.js";

export const PAINTERS_BY_SLOT = { back, waist, helmet, arms, neck, legs };
const CAPE_REPLACERS = new Set(["cloak"]);
const LAYERS = ["back", "front", "top", "glow", "head"];

export function paintAccessories(accessories, A, c) {
  const out = { back: "", front: "", top: "", glow: "", head: "", headGlow: "", replacesCape: false };
  for (const { id: slot } of ACCESSORY_SLOTS) {
    const itemId = accessories?.[slot];
    if (!itemId || itemId === "none") continue;
    const paint = PAINTERS_BY_SLOT[slot][itemId];
    if (!paint) continue;
    const r = paint(A, c);
    for (const k of LAYERS) {
      if (!r[k]) continue;
      out[slot === "helmet" && k === "glow" ? "headGlow" : k] += `<g data-acc="${itemId}">${r[k]}</g>`;
    }
    if (slot === "back" && CAPE_REPLACERS.has(itemId)) out.replacesCape = true;
  }
  return out;
}
