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
 *   sentinel  — moulded one-piece plates, a heroic smooth shell
 *   bulwark   — slabbed, stacked and wide: a walking wall
 *   strider   — lean under-suit, modular kit, a jump-kit on the hips
 */
import { INK, RIM, f, pt, lerp, mirror, shape, line, part, armJoints, energy } from "./models/hero.js";

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
  sentinel: { width: 1.04, shoulder: 1.12 },
  bulwark: { width: 1.14, shoulder: 1.32 },
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
    case "sentinel":
      return sentinel(P, c);
    case "bulwark":
      return bulwark(P, c);
    case "strider":
      return strider(P, c);
    default:
      return NONE;
  }
}

// ── Sentinel: moulded one-piece plates ──────────────────────────────────────

function sentinel(P) {
  const legs = P.legs
    .map(({ hip, kn, an }) => {
      // Sculpted thigh shell and a greave that wraps the shin.
      return (
        part(lerp(hip, kn, 0.12), lerp(hip, kn, 0.88), 15.8, 11.4, { bulge: 2.4, hi: 0.6 }) +
        line(`M${pt(...lerp(hip, kn, 0.3))}L${pt(...lerp(hip, kn, 0.72))}`, INK, 0.45, 0.45) +
        part(lerp(kn, an, 0.14), lerp(kn, an, 0.86), 12.8, 9.4, { bulge: 2.2, hi: 0.55 })
      );
    })
    .join("");
  const chest =
    "M-15.6,-64.4 C-8,-66.8 8,-66.8 15.6,-64.4 C18.8,-58.2 19,-50 17.2,-44 C15.8,-39.2 13.4,-34.6 11.2,-30.4 " +
    "C6,-29.4 -6,-29.4 -11.2,-30.4 C-13.4,-34.6 -15.8,-39.2 -17.2,-44 C-19,-50 -18.8,-58.2 -15.6,-64.4 Z";
  const torso =
    shape(chest, STEEL, 1.1) +
    // High moulded collar ring the helmet seats into.
    shape("M-8.8,-72.6 C-4,-74 4,-74 8.8,-72.6 L14.6,-65.2 C8,-63.2 -8,-63.2 -14.6,-65.2 Z", STEEL, 1) +
    line("M-12.4,-66.8 C-6,-65.2 6,-65.2 12.4,-66.8", INK, 0.5, 0.6) +
    line("M-8,-72 C-4,-73.2 0,-73.4 2,-73.2", "#ffffff", 0.6, 0.6) +
    // Pectoral contours, the sternum ridge and a single moulded ab plate.
    line("M-15.6,-49.4 C-10.6,-44 -4.6,-44.2 -0.7,-46.8", INK, 0.6, 0.6) +
    line("M15.6,-49.4 C10.6,-44 4.6,-44.2 0.7,-46.8", INK, 0.6, 0.6) +
    line("M0,-65.6 L0,-31", INK, 0.5, 0.55) +
    line("M-0.6,-65 L-0.6,-32", "#eaf4ff", 0.35, 0.45) +
    line("M-10.4,-38.6 C-5,-37.4 5,-37.4 10.4,-38.6", INK, 0.5, 0.45) +
    line("M-14.2,-60.6 C-10,-63 -5.4,-63.4 -2.2,-62.6", "#ffffff", 0.9, 0.7) +
    `<ellipse cx="-8.4" cy="-55.4" rx="6.6" ry="4.6" fill="url(#sheen)" opacity=".6"/>` +
    line("M17.6,-58 C18.2,-53 17.4,-48.4 15.6,-44.4", RIM, 0.75, 0.8) +
    // Core housing, set into the plate.
    `<circle cx="0" cy="-54" r="3.8" fill="#070c12" stroke="${INK}" stroke-width=".6"/><circle cx="0" cy="-54" r="1.9" fill="#0b7c90"/>`;
  const arms = P.arms
    .map((arm, i) => {
      const s = i === 0 ? -1 : 1;
      const { sh, el } = armJoints(arm, s);
      const { wr } = armJoints(arm, s);
      // A rounded bicep shell under the pauldron; a moulded bracer on the
      // off-hand (the chrono device keeps the other vambrace clear).
      return (
        part(lerp(sh, el, 0.18), lerp(sh, el, 0.82), 13.6, 10.2, { bulge: 1.8, hi: 0.6 }) +
        (i === 1 ? part(lerp(el, wr, 0.12), lerp(el, wr, 0.88), 11.2, 8.6, { bulge: 1.4, hi: 0.55 }) : "")
      );
    })
    .join("");
  return { under: "", legs, torso, arms, glow: "" };
}

// ── Bulwark: slabs and straps ───────────────────────────────────────────────

function bulwark(P, c) {
  const legs = P.legs
    .map(({ hip, kn, an }, i) => {
      const s = i === 0 ? -1 : 1;
      const thigh =
        part(lerp(hip, kn, 0.1), lerp(hip, kn, 0.84), 16.4, 12, { bulge: 1.4, hi: 0.45 }) +
        // Strap across the thigh.
        plateAt(lerp(hip, kn, 0.46), hip, kn, "M-8.4,-1.4 L8.4,-1.4 L8.4,1.6 L-8.4,1.6 Z", "#1a1d21", 0.6) +
        plateAt(lerp(hip, kn, 0.46), hip, kn, `M${f(s * 2.4 - 1.8)},-1.8 L${f(s * 2.4 + 1.8)},-1.8 L${f(s * 2.4 + 1.8)},2 L${f(s * 2.4 - 1.8)},2 Z`, STEEL, 0.5);
      // Oversized knee guard and a slab greave.
      const knee = plateAt(
        kn,
        kn,
        an,
        "M-6.8,-7.4 L6.8,-7.4 L7.6,2.4 C5,6.4 2.6,8.2 0,8.8 C-2.6,8.2 -5,6.4 -7.6,2.4 Z",
        STEEL,
        1.1,
      );
      const greave = part(lerp(kn, an, 0.22), lerp(kn, an, 0.82), 13, 10, { bulge: 1, hi: 0.4 });
      const boot =
        plateAt(an, kn, an, `M-6,-6.4 L6,-6.4 L6.6,2.2 L${f(s * 1.4 + 7.8)},4.6 L${f(s * 1.4 + 7.6)},8.6 L${f(s * 1.4 - 7.6)},8.6 L${f(s * 1.4 - 7.8)},4.6 L-6.6,2.2 Z`, STEEL_DK, 1.1) +
        lineAt(an, kn, an, `M-6.2,-2.4 L6.2,-2.4 M${f(s * 1.4 - 7.4)},6.6 L${f(s * 1.4 + 7.4)},6.6`, INK, 0.6, 0.7) +
        lineAt(an, kn, an, "M-5.4,-5.4 L5.4,-5.4", "#eaf4ff", 0.5, 0.45);
      return thigh + greave + boot + knee + lineAt(kn, kn, an, "M-6,-3.2 L6,-3.2", INK, 0.6, 0.6) + lineAt(kn, kn, an, "M-5.6,-6.2 L5.6,-6.2", "#eaf4ff", 0.6, 0.5);
    })
    .join("");
  // Three stacked slabs with rivets, a high collar, a belt of pouches.
  const slab = (y0, y1, w0, w1, fill = STEEL) =>
    shape(`M${f(-w0)},${f(y0)} L${f(w0)},${f(y0)} L${f(w1)},${f(y1)} L${f(-w1)},${f(y1)} Z`, fill, 1.1) +
    line(`M${f(-w0 + 1.6)},${f(y0 + 1)} L${f(w0 - 1.6)},${f(y0 + 1)}`, "#eaf4ff", 0.6, 0.45) +
    `<g fill="#0a0f16"><circle cx="${f(-w0 + 2.2)}" cy="${f((y0 + y1) / 2)}" r=".7"/><circle cx="${f(w0 - 2.2)}" cy="${f((y0 + y1) / 2)}" r=".7"/></g>`;
  const torso =
    slab(-65.4, -50.6, 17.6, 19.2) +
    slab(-50, -40.4, 18.4, 16.6) +
    slab(-39.8, -31.6, 16.2, 14.8, STEEL_DK) +
    line("M18.8,-63 L19.6,-51", RIM, 0.8, 0.8) +
    `<circle cx="0" cy="-54" r="3.6" fill="#070c12" stroke="${INK}" stroke-width=".6"/><circle cx="0" cy="-54" r="1.9" fill="#0b7c90"/>` +
    // High collar.
    shape("M-11.6,-71.2 L11.6,-71.2 L17.4,-64.6 L-17.4,-64.6 Z", STEEL_DK, 1) +
    line("M-10.6,-70 L10.6,-70", "#eaf4ff", 0.5, 0.5) +
    // Pouch belt.
    [-13.6, -7.4, 4.6, 10.8]
      .map((x) => shape(`M${f(x)},-29.4 L${f(x + 5.2)},-29.4 L${f(x + 5)},-21 L${f(x + 0.2)},-21 Z`, "#262a2f", 0.8) + line(`M${f(x + 0.4)},-27.4 L${f(x + 4.8)},-27.4`, "#55606b", 0.5, 0.7))
      .join("");
  const arms = P.arms
    .map((arm, i) => {
      const s = i === 0 ? -1 : 1;
      const { sh, el, wr } = armJoints(arm, s);
      // Thick bicep slab; the off-hand (no chrono device) gets a forearm slab.
      let out = part(lerp(sh, el, 0.2), lerp(sh, el, 0.84), 14.6, 11.4, { bulge: 1.2, hi: 0.5 });
      if (i === 1) out += part(lerp(el, wr, 0.12), lerp(el, wr, 0.86), 12.4, 10.2, { bulge: 0.8, hi: 0.45 }) + plateAt(lerp(el, wr, 0.5), el, wr, "M-6.4,-1 L6.4,-1 L6.2,1.4 L-6.2,1.4 Z", "#1a1d21", 0.5);
      return out;
    })
    .join("");
  return { under: "", legs, torso, arms, glow: "" };
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
