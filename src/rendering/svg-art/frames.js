/**
 * Body frames: the silhouette an agent's suit is built on.
 *
 * The rig (models/hero.js) draws one armoured body from joint data. A frame
 * adds sculpted layers over it, positioned from the same joints, and scales
 * the parts that define a silhouette (width, shoulders). The suit (armour
 * style), shoulder choice, gear and colours all still apply on top, so any
 * suit can be worn on any frame.
 *
 *   standard  — the field suit as issued
 *   strider   — lean under-suit, modular kit, a jump-kit on the hips
 */
import { INK, RIM, f, pt, lerp, mirror, shape, line, part, energy } from "./models/hero.js";

/** Shared gradients the frames paint with (defined by the rig's defs). */
const STEEL = "url(#steel)";
const STEEL_DK = "url(#steelDk)";
const SUIT = "url(#suit)";

const angle = (a, b) => (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI - 90;
/** A plate path drawn in a joint's local frame: origin at `at`, +y along `from`→`to`. */
const plateAt = (at, from, to, d, fill = STEEL, w = 0.9) =>
  `<g transform="translate(${pt(...at)}) rotate(${f(angle(from, to))})">${shape(d, fill, w)}</g>`;

/** A stroke drawn in a joint's local frame (see plateAt). */
const lineAt = (at, from, to, d, color, w, op) =>
  `<g transform="translate(${pt(...at)}) rotate(${f(angle(from, to))})">${line(d, color, w, op)}</g>`;

/** Per-frame silhouette numbers the rig reads. */
export const FRAME_SHAPE = {
  standard: { width: 1, shoulder: 1 },
  strider: { width: 0.93, shoulder: 0.92, bareRight: true },
};

const NONE = { under: "", legs: "", torso: "", arms: "", glow: "" };

/**
 * Frame layers for a pose.
 * @param {string} id frame id
 * @param {{arms: object[], legs: object[]}} P pose
 * @param {{ energy: string, pal: object }} c resolved look
 */
export function frameLayers(id, P, c) {
  switch (id) {
    case "strider":
      return strider(P, c);
    default:
      return NONE;
  }
}

// ── Strider: lean, modular, a jump-kit ──────────────────────────────────────

function strider(P, c) {
  // Jump-kit: two exhaust stacks rising behind the shoulders from a pack on
  // the back, vents glowing at the tips.
  const stack = (s) =>
    shape(mirrorIf(s, "M8.6,-64 L9.4,-79.6 C9.6,-81.2 11,-82.2 12.6,-82 L15.8,-81.4 C17.2,-81 18,-79.8 17.8,-78.4 L16.6,-63 Z"), STEEL_DK, 1) +
    shape(mirrorIf(s, "M10.4,-66 L11,-77.6 L15.6,-77 L15,-65.4 Z"), STEEL, 0.6) +
    line(mirrorIf(s, "M10.8,-74 L15.4,-73.4 M10.6,-70.4 L15.2,-69.8"), "#0a0f16", 0.7, 0.9) +
    shape(mirrorIf(s, "M9.6,-80.4 L17.6,-79.2 L17.2,-82.4 L10.2,-83.4 Z"), "#0a0f16", 0.6);
  const under = stack(-1) + stack(1);
  const vent = (s) => `<path d="${mirrorIf(s, "M10.6,-82.2 L16.8,-81.3")}" fill="none" stroke-width="1.1" stroke-linecap="round"/>`;
  const glow = energy(vent(-1) + vent(1), c.energy);
  const legs = P.legs
    .map(({ hip, kn, an }, i) => {
      const s = i === 0 ? -1 : 1;
      // Fabric sleeve over the shin plate, a rubber knee pad, a thigh holster on the right.
      let out =
        part(lerp(kn, an, 0.18), lerp(kn, an, 0.86), 10.2, 7.2, { fill: SUIT, bulge: 1.2, hi: 0.2, rim: 0.45 }) +
        plateAt(kn, kn, an, "M-5.2,-5 C-2,-6 2,-6 5.2,-5 L5,3.4 C2,4.6 -2,4.6 -5,3.4 Z", "#22262b", 0.9) +
        lineAt(kn, kn, an, "M-4.2,-1 L4.2,-1", "#3c434b", 0.6, 0.9);
      if (s > 0)
        out += lineAt(lerp(hip, kn, 0.5), hip, kn, "M-7.6,-3.6 L9.8,-3.6 M-7.6,4 L9.8,4", "#1a1d21", 1.4, 1) + plateAt(lerp(hip, kn, 0.5), hip, kn, "M2.6,-6 L9.6,-6 L9.2,6.6 L3,6.6 Z", STEEL_DK, 0.8);
      return out;
    })
    .join("");
  // Fitted under-suit torso, a plate carrier with straps, three mag pouches.
  const torso =
    shape("M-14.8,-64.6 C-16.8,-56 -16.4,-46 -14.4,-38 C-13.4,-34 -13,-30 -13.2,-27.6 L13.2,-27.6 C13,-30 13.4,-34 14.4,-38 C16.4,-46 16.8,-56 14.8,-64.6 C8,-66.2 -8,-66.2 -14.8,-64.6 Z", SUIT, 1) +
    line("M-14.4,-61 C-15.6,-54 -15.4,-46 -13.8,-40", "#3a4d61", 0.6, 0.6) +
    line("M-11.4,-62.4 L-13.2,-68 M11.4,-62.4 L13.2,-68", "#1a1d21", 2.4, 1) +
    shape("M-12.4,-62.6 L12.4,-62.6 L11.8,-39 L-11.8,-39 Z", STEEL, 1) +
    line("M-11,-61 L11,-61", "#eaf4ff", 0.5, 0.45) +
    line("M12.4,-61.6 L11.8,-40", RIM, 0.6, 0.7) +
    [-10.4, -3.3, 3.8]
      .map((x) => shape(`M${f(x)},-45.6 L${f(x + 6.6)},-45.6 L${f(x + 6.4)},-34.6 L${f(x + 0.2)},-34.6 Z`, "#2a2f35", 0.8) + line(`M${f(x + 0.6)},-43.4 L${f(x + 6)},-43.4`, "#5c6773", 0.5, 0.8))
      .join("") +
    `<circle cx="0" cy="-54" r="3" fill="#070c12" stroke="${INK}" stroke-width=".6"/><circle cx="0" cy="-54" r="1.6" fill="#0b7c90"/>`;
  return { under, legs, torso, arms: "", glow };
}

const mirrorIf = (s, d) => (s < 0 ? mirror(d) : d);
