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
 *   strider   — lean under-suit, modular kit, a jump-kit behind the shoulders
 *   vanguard  — sleek sculpted plate, panel lines, glowing seams
 *   operator  — soft kit: fabric sleeves and trousers, chest rig, elbow pads
 *   wraith    — hooded long coat over wrapped forearms and shins
 *   breacher  — ballistic chest, riot vambrace, grenade belt, heavy boots
 */
import { INK, RIM, f, pt, lerp, mirror, shape, line, part, energy, muscle, armJoints, polar, heading, LIMB } from "./models/hero.js";

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
  vanguard: { width: 1, shoulder: 1.04 },
  // softTorso: fabric over the chest, so no chest trim or core light;
  // noLimbGlow: sleeves and wraps cover the limbs' energy channels.
  operator: { width: 0.97, shoulder: 1, noShoulders: true, softTorso: true, noLimbGlow: true },
  wraith: { width: 1, shoulder: 0.96, noCape: true, noLimbGlow: true },
  breacher: { width: 1.04, shoulder: 1.12 },
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
    case "vanguard":
      return vanguard(P, c);
    case "operator":
      return operator(P, c);
    case "wraith":
      return wraith(P, c);
    case "breacher":
      return breacher(P, c);
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

const k = (prof, x) => prof.map(([t, w]) => [t, w * x]);
const T = (leg, t) => lerp(leg.hip, leg.kn, t);
const S = (leg, t) => lerp(leg.kn, leg.an, t);

// ── Vanguard: sleek sculpted plate ─────────────────────────────────────────

function vanguard(P, c) {
  let glow = "";
  const legs = P.legs
    .map((leg, i) => {
      const s = i === 0 ? -1 : 1;
      // Thin moulded shells that follow the muscle, with a panel line and a
      // glowing seam on the outside of each.
      const seamA = T(leg, 0.3);
      const seamB = T(leg, 0.56);
      const shinA = S(leg, 0.28);
      const shinB = S(leg, 0.6);
      glow += energy(
        `<path d="M${pt(seamA[0] + s * 5.2, seamA[1])}L${pt(seamB[0] + s * 4.8, seamB[1])} M${pt(shinA[0] + s * 3.4, shinA[1])}L${pt(shinB[0] + s * 3, shinB[1])}" fill="none" stroke-width=".8" stroke-linecap="round"/>`,
        c.energy,
      );
      return (
        muscle(T(leg, 0.08), T(leg, 0.66), k(LIMB.THIGH.out, 0.88), k(LIMB.THIGH.in, 0.84), s, { hi: 0.65 }) +
        line(`M${pt(...T(leg, 0.14))}L${pt(...T(leg, 0.6))}`, INK, 0.5, 0.5) +
        muscle(S(leg, 0.2), S(leg, 0.66), k(LIMB.CALF.out, 0.86), k(LIMB.CALF.in, 0.84), s, { hi: 0.6 }) +
        line(`M${pt(...S(leg, 0.24))}L${pt(...S(leg, 0.62))}`, INK, 0.45, 0.5)
      );
    })
    .join("");
  const chest =
    "M-15.4,-64.6 C-8,-67 8,-67 15.4,-64.6 C17.6,-58 17.4,-50 15.8,-45 L11.6,-41.4 L0,-38.6 L-11.6,-41.4 L-15.8,-45 C-17.4,-50 -17.6,-58 -15.4,-64.6 Z";
  const torso =
    shape("M-9.2,-72.4 C-4.4,-74 4.4,-74 9.2,-72.4 L13.4,-66.2 C7,-64.2 -7,-64.2 -13.4,-66.2 Z", STEEL_DK, 0.9) +
    shape(chest, STEEL, 1.1) +
    line("M-12.6,-60.4 L-3,-55.4 L0,-55 L3,-55.4 L12.6,-60.4", INK, 0.6, 0.6) +
    line("M-13.4,-49 C-9,-45 -4,-43.4 0,-43 C4,-43.4 9,-45 13.4,-49", INK, 0.5, 0.5) +
    line("M-14.2,-61 C-10,-63.6 -5,-64 -1.6,-63.6", "#ffffff", 0.8, 0.65) +
    line("M16.6,-58 C17,-53 16.4,-48.6 15,-45.6", RIM, 0.7, 0.8) +
    `<circle cx="0" cy="-54" r="3.4" fill="#070c12" stroke="${INK}" stroke-width=".6"/><circle cx="0" cy="-54" r="1.8" fill="#0b7c90"/>` +
    shape("M-9.6,-37.6 C-5,-36.6 5,-36.6 9.6,-37.6 L9,-33.2 C5,-32.4 -5,-32.4 -9,-33.2 Z", STEEL_DK, 0.8) +
    shape("M-9,-32.4 C-5,-31.6 5,-31.6 9,-32.4 L8.6,-28.6 C5,-28 -5,-28 -8.6,-28.6 Z", STEEL_DK, 0.8);
  glow += energy(`<path d="M-15.6,-58 L-14.8,-50.4 L-12.2,-45.4 M15.6,-58 L14.8,-50.4 L12.2,-45.4 M-8.6,-35.2 L8.6,-35.2" fill="none" stroke-width=".8" stroke-linecap="round" stroke-linejoin="round"/>`, c.energy);
  return { under: "", legs, torso, arms: "", glow };
}

// ── Operator: soft kit ─────────────────────────────────────────────────────

function operator(P, c) {
  const pad = "#2a2e33";
  const legs = P.legs
    .map((leg, i) => {
      const s = i === 0 ? -1 : 1;
      // Combat trousers over the plates: fabric thigh and shin, the knee pad
      // still strapped on top; a drop-leg holster on the right.
      let out =
        muscle(T(leg, 0.04), T(leg, 0.9), k(LIMB.THIGH.out, 1.02), k(LIMB.THIGH.in, 1.0), s, { fill: SUIT, hi: 0.14, rim: 0.3, weave: true }) +
        line(`M${pt(T(leg, 0.5)[0] + s * 5, T(leg, 0.5)[1])} l${f(s * 0.6)},5`, "#000000", 0.5, 0.4) +
        muscle(S(leg, 0.3), S(leg, 0.66), k(LIMB.CALF.out, 1.02), k(LIMB.CALF.in, 1.0), s, { fill: SUIT, hi: 0.12, rim: 0.3, weave: true }) +
        // Cargo pocket.
        plateAt(T(leg, 0.48), leg.hip, leg.kn, `M${f(s * 2.4)},-3.6 L${f(s * 7.4)},-3.4 L${f(s * 7.2)},4 L${f(s * 2.6)},4 Z`, SUIT, 0.6) +
        lineAt(T(leg, 0.48), leg.hip, leg.kn, `M${f(s * 2.6)},-2 L${f(s * 7.2)},-1.8`, "#000000", 0.45, 0.5) +
        // Knee pad on top of the trousers.
        plateAt(S(leg, 0.08), leg.kn, leg.an, "M0,-5.2 C3.4,-5.2 5,-3.2 5,-0.4 C5,2.6 3,4.6 0,5.2 C-3,4.6 -5,2.6 -5,-0.4 C-5,-3.2 -3.4,-5.2 0,-5.2 Z", pad, 1) +
        lineAt(S(leg, 0.08), leg.kn, leg.an, "M-3.4,-1 C-1.4,-2.4 1.4,-2.4 3.4,-1", "#4a5058", 0.5, 0.8);
      if (s > 0)
        out +=
          lineAt(T(leg, 0.55), leg.hip, leg.kn, "M-7.6,-3.6 L9.8,-3.6 M-7.6,4 L9.8,4", "#1a1d21", 1.4, 1) +
          plateAt(T(leg, 0.55), leg.hip, leg.kn, "M2.4,-6.4 L9.8,-6.4 L9.4,7 L2.8,7 Z", "#22262a", 0.8);
      return out;
    })
    .join("");
  const arms = P.arms
    .map((arm, i) => {
      const s = i === 0 ? -1 : 1;
      const { sh, el, wr } = armJoints(arm, s);
      const up = heading(sh, el);
      // Fabric sleeves from the shoulder (no pauldron), rolled at the
      // forearm, an elbow pad on the point.
      return (
        muscle(polar(sh, up, -4.4), el, k(LIMB.UPPER_ARM.out, 1.06), k(LIMB.UPPER_ARM.in, 1.04), s, { fill: SUIT, hi: 0.18, rim: 0.35, weave: true }) +
        muscle(el, lerp(el, wr, 0.5), k(LIMB.FOREARM.out, 1.06), k(LIMB.FOREARM.in, 1.04), s, { fill: SUIT, hi: 0.14, rim: 0.3, weave: true }) +
        plateAt(lerp(el, wr, 0.5), el, wr, "M-5,-1.2 L5,-1.2 L5.2,1.4 L-5.2,1.4 Z", SUIT, 0.7) +
        lineAt(lerp(el, wr, 0.5), el, wr, "M-4.6,0 L4.6,0", "#000000", 0.4, 0.5) +
        plateAt(el, sh, el, `M${f(s * 1.2)},-3.4 C${f(s * 5.4)},-3.8 ${f(s * 6.8)},-0.6 ${f(s * 6)},2.8 C${f(s * 4.6)},4 ${f(s * 2.4)},3.6 ${f(s * 1)},2.6 Z`, pad, 0.8)
      );
    })
    .join("");
  // A shirt over the chest plate, and a chest rig: a row of mag pouches on a
  // harness, a radio on the left.
  const rig = "#2f3329";
  const torso =
    shape("M-15.6,-64.8 C-17.4,-56 -17,-46 -15,-38 C-14,-34 -13.6,-30 -13.8,-27.6 L13.8,-27.6 C13.6,-30 14,-34 15,-38 C17,-46 17.4,-56 15.6,-64.8 C8,-66.6 -8,-66.6 -15.6,-64.8 Z", SUIT, 1) +
    `<path d="M-15.6,-64.8 C-17.4,-56 -17,-46 -15,-38 C-14,-34 -13.6,-30 -13.8,-27.6 L13.8,-27.6 C13.6,-30 14,-34 15,-38 C17,-46 17.4,-56 15.6,-64.8 C8,-66.6 -8,-66.6 -15.6,-64.8 Z" fill="url(#weave)"/>` +
    line("M-4,-66 L-2.6,-60 M4,-66 L2.6,-60", "#000000", 0.5, 0.4) +
    line("M-11.6,-64.4 L-9.4,-50.6 M11.6,-64.4 L9.4,-50.6", INK, 2.6) +
    line("M-11.6,-64.4 L-9.4,-50.6 M11.6,-64.4 L9.4,-50.6", rig, 1.8) +
    shape("M-14.2,-50.8 L14.2,-50.8 L13.8,-40.4 L-13.8,-40.4 Z", rig, 1) +
    [-12.8, -6.6, -0.4, 5.8].map((x) => shape(`M${f(x)},-50.2 L${f(x + 5.6)},-50.2 L${f(x + 5.4)},-41.2 L${f(x + 0.2)},-41.2 Z`, "#292c24", 0.7) + line(`M${f(x + 0.4)},-48.6 L${f(x + 5.2)},-48.6`, "#5c6248", 0.45, 0.85)).join("") +
    shape("M-15.4,-62.2 L-12.2,-62.8 L-11.8,-55 L-15,-54.6 Z", "#22262a", 0.8) +
    line("M-14.8,-62.4 L-15.8,-69.6", INK, 1.1) +
    line("M-14.8,-62.4 L-15.8,-69.6", "#3c4147", 0.5);
  return { under: "", legs, torso, arms, glow: "" };
}

// ── Wraith: a hooded long coat ─────────────────────────────────────────────

function wraith(P, c) {
  const coat = "#2e2924";
  const coatHi = "#4a433a";
  const wrap = "#5c574a";
  // The back of the coat hangs behind the legs, ragged at the knee.
  const back =
    "M-15.6,-62 L15.6,-62 L18.4,8 L14.6,13.6 L10.6,10 L6,14.8 L1.6,11 L-3,15 L-7.6,10.6 L-11.8,14.6 L-15.4,10.2 L-18.4,8 Z";
  const under = shape(back, coat, 1) + `<path d="${back}" fill="url(#weave)" opacity=".6"/>` + line("M-8,-40 L-10.4,8 M8,-40 L10.4,8", "#000000", 0.6, 0.45);
  // Wraps up the shins.
  const legs = P.legs
    .map((leg, i) => {
      const s = i === 0 ? -1 : 1;
      let out = muscle(S(leg, 0.22), S(leg, 0.66), k(LIMB.CALF.out, 1.04), k(LIMB.CALF.in, 1.02), s, { fill: wrap, hi: 0.2, rim: 0.3, weave: true });
      for (let t = 0.26; t < 0.64; t += 0.075) out += lineAt(S(leg, t), leg.kn, leg.an, "M-5.4,-1.2 L5.4,1.2", "#2e2b24", 0.55, 0.8);
      return out;
    })
    .join("");
  // Front panels, open down the middle, a hood behind the head, a strap
  // cinching the coat at the waist.
  const panel = "M-18.2,-66 C-14,-67.8 -9,-67.8 -5.4,-66.6 C-4,-52 -3.2,-40 -4,-28 L-5.6,12 L-9.6,15.6 L-13.4,11.6 L-17.2,14.6 L-19.6,10.8 L-19.4,-28 C-20.4,-42 -20.4,-56 -18.2,-66 Z";
  const hood = "M-12.2,-64 C-15.4,-73 -13,-84.6 -6,-88.6 C-2,-90.6 2,-90.6 6,-88.6 C13,-84.6 15.4,-73 12.2,-64 C8,-66.4 -8,-66.4 -12.2,-64 Z";
  const torso =
    shape(hood, coat, 1) +
    `<path d="${hood}" fill="url(#weave)" opacity=".5"/>` +
    line("M-10.4,-66 C-12.6,-74 -10.6,-83 -5,-86.6", coatHi, 0.6, 0.8) +
    shape(panel, coat, 1) +
    shape(mirror(panel), coat, 1) +
    `<path d="${panel}" fill="url(#weave)" opacity=".6"/><path d="${mirror(panel)}" fill="url(#weave)" opacity=".6"/>` +
    line("M-5.4,-66.6 C-4,-52 -3.2,-40 -4,-28 L-5.6,12 M5.4,-66.6 C4,-52 3.2,-40 4,-28 L5.6,12", coatHi, 0.8, 0.9) +
    // Lapels folded back at the chest.
    shape("M-5.4,-66.6 L-9.6,-66.8 L-7.2,-54 L-4.6,-56.4 Z", coatHi, 0.6) +
    shape("M5.4,-66.6 L9.6,-66.8 L7.2,-54 L4.6,-56.4 Z", coatHi, 0.6) +
    line("M-18.4,-62.6 C-19.6,-52 -19.6,-40 -18.8,-28", coatHi, 0.5, 0.6) +
    line("M-13,-40 L-14,8 M13,-40 L14,8", "#000000", 0.5, 0.4) +
    line("M-17.8,-29.6 L17.8,-29.6", INK, 2.6) +
    line("M-17.8,-29.6 L17.8,-29.6", "#2a2622", 1.8) +
    shape("M-2.2,-31.2 L2.2,-31.2 L2.2,-28 L-2.2,-28 Z", "url(#steel)", 0.6);
  // Wrapped forearms.
  const arms = P.arms
    .map((arm, i) => {
      const s = i === 0 ? -1 : 1;
      const { el, wr } = armJoints(arm, s);
      let out = muscle(lerp(el, wr, 0.2), lerp(el, wr, 0.88), k(LIMB.FOREARM.out, 1.06), k(LIMB.FOREARM.in, 1.04), s, { fill: wrap, hi: 0.2, rim: 0.3, weave: true });
      for (let t = 0.26; t < 0.86; t += 0.09) out += lineAt(lerp(el, wr, t), el, wr, "M-5,-1.1 L5,1.1", "#2e2b24", 0.5, 0.8);
      return out;
    })
    .join("");
  return { under, legs, torso, arms, glow: "" };
}

// ── Breacher: built to go through the door first ───────────────────────────

function breacher(P, c) {
  const legs = P.legs
    .map((leg, i) => {
      const s = i === 0 ? -1 : 1;
      return (
        // Reinforced knee cap over the pad.
        plateAt(S(leg, 0.06), leg.kn, leg.an, "M0,-6.4 C4.2,-6.4 6.2,-4 6.2,-0.6 C6.2,3 3.8,5.6 0,6.4 C-3.8,5.6 -6.2,3 -6.2,-0.6 C-6.2,-4 -4.2,-6.4 0,-6.4 Z", STEEL, 1.1) +
        lineAt(S(leg, 0.06), leg.kn, leg.an, "M-4.6,-2.4 C-2,-4.4 2,-4.4 4.6,-2.4 M0,-6 L0,5.8", INK, 0.5, 0.5) +
        // Heavy boots up the shin, with a toe cap.
        muscle(S(leg, 0.52), S(leg, 1.02), [[0, 5.2], [1, 5.4]], [[0, 5], [1, 5.2]], s, { fill: STEEL_DK, hi: 0.35, rim: 0.5 }) +
        lineAt(S(leg, 0.6), leg.kn, leg.an, "M-5,0 L5,0 M-5.1,3 L5.1,3 M-5.2,6 L5.2,6", "#05070a", 0.9, 0.85) +
        plateAt(leg.an, leg.kn, leg.an, `M${f(s * 1.2 - 5)},3.4 L${f(s * 1.2 + 5)},3.4 L${f(s * 1.2 + 6.2)},6.4 L${f(s * 1.2 - 6.2)},6.4 Z`, STEEL, 0.6)
      );
    })
    .join("");
  // Ballistic chest plate with a heavy collar; a belt of grenades.
  const torso =
    shape("M-12.6,-72 L12.6,-72 L16.4,-64.2 L-16.4,-64.2 Z", STEEL_DK, 1) +
    line("M-11.6,-70.8 L11.6,-70.8", "#eaf4ff", 0.5, 0.5) +
    shape("M-14.8,-64.4 C-6,-66 6,-66 14.8,-64.4 L15.6,-44 C14.6,-41.4 12.6,-40.4 10.4,-40.2 L-10.4,-40.2 C-12.6,-40.4 -14.6,-41.4 -15.6,-44 Z", STEEL, 1.1) +
    shape("M-11.6,-61 C-5,-62.2 5,-62.2 11.6,-61 L12,-46 C6,-44.8 -6,-44.8 -12,-46 Z", STEEL_DK, 0.7) +
    line("M-13.6,-62.4 C-8,-63.8 -3,-64 0,-64", "#f4faff", 0.7, 0.6) +
    `<g fill="#0c1013">${[-13.2, 13.2].flatMap((x) => [-60, -52, -45].map((y) => `<circle cx="${x}" cy="${y}" r=".7"/>`)).join("")}</g>` +
    `<circle cx="0" cy="-54" r="3.2" fill="#070c12" stroke="${INK}" stroke-width=".6"/><circle cx="0" cy="-54" r="1.7" fill="#0b7c90"/>` +
    [-12.4, -7.6, 7.6, 12.4].map((x) => `<ellipse cx="${x}" cy="-31.6" rx="2" ry="2.5" fill="#3d4436" stroke="${INK}" stroke-width=".7"/>` + line(`M${f(x - 1.2)},-33.4 L${f(x + 1.2)},-33.4`, "#7a8266", 0.5, 0.9) + `<rect x="${f(x - 0.7)}" y="-35.2" width="1.4" height="1.4" fill="#22262a" stroke="${INK}" stroke-width=".35"/>`).join("");
  // Riot vambrace on the off-hand: a broad plate down the forearm.
  const arms = P.arms
    .map((arm, i) => {
      if (i === 0) return "";
      const { el, wr } = armJoints(arm, 1);
      return (
        plateAt(lerp(el, wr, 0.52), el, wr, "M-6.6,-10 L6.6,-10 L7.2,8.6 L-7.2,8.6 Z", STEEL, 1.1) +
        lineAt(lerp(el, wr, 0.52), el, wr, "M0,-9.4 L0,8 M-6,-8.6 L6,-8.6", INK, 0.5, 0.5) +
        lineAt(lerp(el, wr, 0.52), el, wr, "M-5.6,-8.4 L-5.8,7.4", "#f4faff", 0.6, 0.55)
      );
    })
    .join("");
  return { under: "", legs, torso, arms, glow: "" };
}
