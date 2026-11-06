/**
 * Wardrobe theme "exo" (Exo-Frame): the art for
 * src/data/wardrobe-themes/exo.js, by id. See ./index.js for what each
 * painter is given and returns.
 *
 *   exo      — a one-person mech worn over the suit: roll hoops and a power
 *              pack behind, piston struts and drums on every limb, a reactor
 *              harness on the chest, stomper boots
 *   cockpit  — a boxy pilot's helmet in a roll cage, a HUD canopy across the
 *              face (tinted by the look's energy), sensor blocks at the temples
 *   pods     — six-tube missile launchers on hinge arms over the shoulders
 */
import { INK, f, lerp, mirror, shape, line, energy, armJoints } from "../models/hero.js";
import { STEEL, STEEL_DK, HAZARD, plateAt, lineAt, mirrorIf, T, S, strut, drum } from "../frame-kit.js";

// ── Exo-Frame: a one-person mech worn over the suit ────────────────────────

function exo(P, c) {
  let glow = "";
  // Behind the body: the spine frame, a power pack, and the roll hoops that
  // stand over the shoulders.
  const hoop = (s) =>
    line(mirrorIf(s, "M6,-62 L8,-80 C8.6,-84.6 12.6,-86.6 17,-85.4 L24.6,-82.6 L26,-66"), INK, 3.4, 1) +
    line(mirrorIf(s, "M6,-62 L8,-80 C8.6,-84.6 12.6,-86.6 17,-85.4 L24.6,-82.6 L26,-66"), "#3a4450", 2.2, 1) +
    line(mirrorIf(s, "M8.4,-79 C9.2,-83 12.4,-84.6 16.6,-83.6"), "#8d9cab", 0.5, 0.8);
  const under =
    hoop(-1) +
    hoop(1) +
    shape("M-11,-70 L11,-70 L12.4,-36 L-12.4,-36 Z", STEEL_DK, 1) +
    [-58, -50, -42].map((y) => line(`M-10.6,${y} L10.6,${y}`, INK, 0.6, 0.6)).join("") +
    shape("M-14.6,-30 L14.6,-30 L15.6,-20 L-15.6,-20 Z", STEEL_DK, 1);
  glow += energy(`<path d="M-15.6,-82.8 L-14.2,-79.4 M15.6,-82.8 L14.2,-79.4" fill="none" stroke-width="1.2" stroke-linecap="round"/>`, c.energy);

  const legs = P.legs
    .map((leg, i) => {
      const s = i === 0 ? -1 : 1;
      const { hip, kn, an } = leg;
      // Outer rails down the leg, a piston on each segment, a drum at the
      // knee, and a stomper: a broad sole plate with a heel spur.
      let out =
        plateAt(T(leg, 0.12), hip, kn, `M${f(s * 6.2)},-2 L${f(s * 9.4)},-2 L${f(s * 9)},26 L${f(s * 6.6)},26 Z`, STEEL, 0.8) +
        strut(T(leg, 0.04), T(leg, 0.9), s, 4.6) +
        // A straight shin guard from the knee into the boot: it hides the
        // suit's calf, which bulges inward and made the shin look bent
        // against the straight struts.
        plateAt(S(leg, 0.06), kn, an, "M-9,-1 L9,-1 L7.8,22.6 C3.4,24 -3.4,24 -7.8,22.6 Z", STEEL_DK, 1) +
        plateAt(S(leg, 0.06), kn, an, "M-6.6,1.4 L6.6,1.4 L5.8,20.4 C2.4,21.4 -2.4,21.4 -5.8,20.4 Z", STEEL, 0.7) +
        lineAt(S(leg, 0.06), kn, an, "M0,1.8 L0,20.6", INK, 0.5, 0.55) +
        lineAt(S(leg, 0.06), kn, an, `M${f(-s * 4.4)},2.4 L${f(-s * 4)},19.4`, "#f4faff", 0.5, 0.45) +
        plateAt(S(leg, 0.1), kn, an, `M${f(s * 5.6)},-2 L${f(s * 8.6)},-2 L${f(s * 8.2)},22 L${f(s * 5.8)},22 Z`, STEEL, 0.8) +
        strut(S(leg, 0.12), S(leg, 0.86), s, 3.8, 2.8, 1.3) +
        drum([kn[0] + s * 6.6, kn[1]], 4.2);
      // Knee guard over the joint, cut with a hazard band.
      out +=
        plateAt(S(leg, 0.02), kn, an, "M-5.6,-6.2 L5.6,-6.2 L6.4,2.6 L0,6.8 L-6.4,2.6 Z", STEEL, 1) +
        plateAt(S(leg, 0.02), kn, an, "M-5.4,-3 L5.4,-3 L5.6,-0.4 L-5.6,-0.4 Z", HAZARD, 0.5) +
        lineAt(S(leg, 0.02), kn, an, "M-4,-3 L-5.6,-0.4 M-1,-3 L-2.6,-0.4 M2,-3 L0.4,-0.4 M5,-3 L3.4,-0.4", INK, 0.7, 0.9);
      // Mech boot: an armoured shaft up the ankle, a rounded toe cap that
      // widens over the foot, a thick tread sole and an ankle actuator.
      const ax = an[0] + s * 1.2;
      const y = an[1];
      const shaft = `M${f(ax - 5.8)},${f(y - 9)} L${f(ax + 5.8)},${f(y - 9)} L${f(ax + 6.4)},${f(y + 2)} L${f(ax - 6.4)},${f(y + 2)} Z`;
      const foot =
        `M${f(ax - 6.4)},${f(y + 1)} L${f(ax + 6.4)},${f(y + 1)} C${f(ax + 8.4)},${f(y + 2.4)} ${f(ax + 8.8)},${f(y + 5.4)} ${f(ax + 8.6)},${f(y + 7.4)} ` +
        `L${f(ax - 8.6)},${f(y + 7.4)} C${f(ax - 8.8)},${f(y + 5.4)} ${f(ax - 8.4)},${f(y + 2.4)} ${f(ax - 6.4)},${f(y + 1)} Z`;
      const sole = `M${f(ax - 9)},${f(y + 7.2)} L${f(ax + 9)},${f(y + 7.2)} L${f(ax + 8.6)},${f(y + 9.4)} L${f(ax - 8.6)},${f(y + 9.4)} Z`;
      out +=
        shape(shaft, STEEL_DK, 1) +
        line(`M${f(ax - 5.6)},${f(y - 5.6)} L${f(ax + 5.6)},${f(y - 5.6)} M${f(ax - 5.9)},${f(y - 2.4)} L${f(ax + 5.9)},${f(y - 2.4)}`, INK, 0.6, 0.6) +
        shape(foot, STEEL, 1) +
        line(`M${f(ax - 6.6)},${f(y + 2.6)} C${f(ax - 3)},${f(y + 1.6)} ${f(ax + 3)},${f(y + 1.6)} ${f(ax + 6.6)},${f(y + 2.6)}`, "#f4faff", 0.5, 0.55) +
        line(`M${f(ax)},${f(y + 1.6)} L${f(ax)},${f(y + 7)}`, INK, 0.5, 0.5) +
        shape(sole, "#14181d", 0.9) +
        line(`M${f(ax - 7)},${f(y + 8.4)} L${f(ax - 5)},${f(y + 8.4)} M${f(ax - 2)},${f(y + 8.4)} L${f(ax + 2)},${f(y + 8.4)} M${f(ax + 5)},${f(y + 8.4)} L${f(ax + 7)},${f(y + 8.4)}`, "#3a4048", 0.7, 0.9) +
        drum([ax + s * 6.4, y - 3.4], 2.4);
      glow += energy(`<circle cx="${f(kn[0] + s * 6.6)}" cy="${f(kn[1])}" r=".9"/>`, c.energy);
      return out;
    })
    .join("");

  const arms = P.arms
    .map((arm, i) => {
      const s = i === 0 ? -1 : 1;
      const { sh, el, wr } = armJoints(arm, s);
      // Struts down the outside of the arm, a drum at the elbow, and a servo
      // gauntlet: an oversized cuff over the forearm and knuckle plates.
      return (
        strut(lerp(sh, el, 0.18), lerp(sh, el, 0.96), s, 6.4, 3, 1.4) +
        drum([el[0] + s * 5.8, el[1]], 3.6) +
        plateAt(lerp(el, wr, 0.56), el, wr, "M-7.2,-8.6 L7.2,-8.6 L8,7.4 L-8,7.4 Z", STEEL, 1.1) +
        plateAt(lerp(el, wr, 0.56), el, wr, "M-6.2,-5.4 L6.2,-5.4 L6.4,-2.8 L-6.4,-2.8 Z", HAZARD, 0.5) +
        lineAt(lerp(el, wr, 0.56), el, wr, "M-5,-5.4 L-6.4,-2.8 M-2,-5.4 L-3.4,-2.8 M1,-5.4 L-0.4,-2.8 M4,-5.4 L2.6,-2.8", INK, 0.6, 0.9) +
        lineAt(lerp(el, wr, 0.56), el, wr, "M-7,2 L7,2 M-7.4,5 L7.4,5", INK, 0.5, 0.55) +
        plateAt(wr, el, wr, "M-5.6,1 L5.6,1 L6,6.6 L-6,6.6 Z", STEEL_DK, 0.8)
      );
    })
    .join("");

  // The chest harness: a cage round the torso, the reactor at its centre,
  // a hazard-banded belly plate and the unit number.
  const torso =
    shape("M-17.4,-66 L-9,-70 L9,-70 L17.4,-66 L18.2,-40 L13.6,-36 L-13.6,-36 L-18.2,-40 Z", "none", 0) +
    line("M-17.4,-66 L-18.2,-40 L-13.6,-36 M17.4,-66 L18.2,-40 L13.6,-36", INK, 3.2, 1) +
    line("M-17.4,-66 L-18.2,-40 L-13.6,-36 M17.4,-66 L18.2,-40 L13.6,-36", "#46515e", 2, 1) +
    line("M-17.4,-66 L-9,-70 L9,-70 L17.4,-66", INK, 3.4, 1) +
    line("M-17.4,-66 L-9,-70 L9,-70 L17.4,-66", "#56626f", 2.2, 1) +
    shape("M-10.6,-62 L10.6,-62 L12.4,-56 L12.4,-47 L8,-43.4 L-8,-43.4 L-12.4,-47 L-12.4,-56 Z", STEEL, 1.1) +
    line("M-10,-60.6 L10,-60.6", "#f4faff", 0.5, 0.5) +
    `<circle cx="0" cy="-53" r="6.4" fill="#05080d" stroke="${INK}" stroke-width=".9"/>` +
    `<circle cx="0" cy="-53" r="5" fill="none" stroke="${STEEL_DK}" stroke-width="1.6"/>` +
    [0, 60, 120, 180, 240, 300].map((a) => {
      const r = (a * Math.PI) / 180;
      return `<circle cx="${f(Math.cos(r) * 5)}" cy="${f(-53 + Math.sin(r) * 5)}" r=".6" fill="#0c1116"/>`;
    }).join("") +
    shape("M-11.4,-41.6 L11.4,-41.6 L11,-35 L-11,-35 Z", HAZARD, 0.8) +
    line("M-9,-41.6 L-11.4,-35 M-5,-41.6 L-7.4,-35 M-1,-41.6 L-3.4,-35 M3,-41.6 L0.6,-35 M7,-41.6 L4.6,-35 M11,-41.6 L8.6,-35", INK, 1, 0.95) +
    `<text x="-12" y="-56.6" font-family="monospace" font-weight="bold" font-size="3.4" fill="${HAZARD}" stroke="${INK}" stroke-width=".25">07</text>`;
  glow += energy(
    `<circle cx="0" cy="-53" r="3.4"/><circle cx="0" cy="-53" r="5" fill="none" stroke-width=".7"/>`,
    c.energy,
  );
  return { under, legs, torso, arms, glow };
}

// ── Cockpit ────────────────────────────────────────────────────────────────

/**
 * Cockpit: a boxy pilot's helmet in a roll cage, a wide HUD canopy across
 * the face (tinted by the look's energy, not the visor pick), sensor blocks
 * at the temples and an intake under the chin.
 */
function cockpit(c, K) {
  const shell = "M0,-98 L9.6,-96.6 L13.6,-90.6 L14,-78.6 L11.6,-72 L6,-68.2 L0,-67.4 L-6,-68.2 L-11.6,-72 L-14,-78.6 L-13.6,-90.6 L-9.6,-96.6 Z";
  const canopy = "M-12.2,-89.4 L12.2,-89.4 L12.6,-81.4 L9.4,-76.6 L-9.4,-76.6 L-12.6,-81.4 Z";
  const glass = K.mix(c.energy, "#02060a", 0.72);
  const cage = "M-13.2,-84 L-14.6,-92.4 C-12.6,-99.6 -6,-101.6 0,-101.6 C6,-101.6 12.6,-99.6 14.6,-92.4 L13.2,-84";
  const block = (s) => shape(s < 0 ? mirror("M13.4,-88 L17.8,-87.2 L18,-79 L13.8,-78.4 Z") : "M13.4,-88 L17.8,-87.2 L18,-79 L13.8,-78.4 Z", "url(#steelDk)", 0.7);
  return {
    front:
      block(-1) +
      block(1) +
      shape(shell, "url(#steel)") +
      `<ellipse cx="-6" cy="-92.6" rx="4.6" ry="2.4" fill="url(#sheen)"/>` +
      line(cage, INK, 3, 1) +
      line(cage, "#56626f", 1.8, 1) +
      line("M0,-101.6 L0,-89.6", INK, 2.6, 1) +
      line("M0,-101.6 L0,-89.6", "#56626f", 1.4, 1) +
      shape(canopy, glass, 0.9) +
      line("M-11.4,-88 L-3,-88.2", "#ffffff", 0.6, 0.55) +
      shape("M-5.6,-75 L5.6,-75 L4.6,-69.6 L-4.6,-69.6 Z", "url(#steelDk)", 0.6) +
      line("M-3.6,-73.4 L3.6,-73.4 M-3.2,-71.6 L3.2,-71.6", "#020306", 0.6, 0.9) +
      line("M14.2,-92 L16.2,-101", INK, 1.2, 1) +
      line("M14.2,-92 L16.2,-101", "#9aa3ad", 0.5, 1),
    glow:
      energy(
        `<path d="M-10.6,-86.8 L-10.6,-88 L-8.6,-88 M10.6,-86.8 L10.6,-88 L8.6,-88 M-10.6,-80.6 L-10.6,-79.4 L-8.6,-79.4 M10.6,-80.6 L10.6,-79.4 L8.6,-79.4" fill="none" stroke-width=".5"/>` +
          `<circle cx="0" cy="-83.4" r="1.6" fill="none" stroke-width=".4"/><path d="M-2.8,-83.4 L-2,-83.4 M2,-83.4 L2.8,-83.4" stroke-width=".4"/>` +
          `<circle cx="16.2" cy="-101" r=".7"/><circle cx="-15.9" cy="-83.2" r=".6"/><circle cx="15.9" cy="-83.2" r=".6"/>`,
        c.energy,
      ) + K.eyeGlow(c, 0.7, true),
  };
}

// ── Missile Pods ───────────────────────────────────────────────────────────

/**
 * Missile Pods: a launcher box on a hinge arm over the shoulder, six tubes
 * facing out, a hazard band on its side. The stock pad sits between the arm
 * and the box; all three turn with the arm.
 */
function pods(c, s, K) {
  const { M, rot, lit } = K;
  const arm = "M11,-66 L18,-74 L22,-71 L16,-62 Z";
  const box = "M13.4,-84.6 L33.4,-86.6 L35.8,-82.4 L35.6,-64.4 L32.6,-61.2 L14.4,-62.4 L12.4,-66.6 Z";
  const tubes = [];
  for (let r = 0; r < 2; r++)
    for (let k = 0; k < 3; k++) {
      const x = 18.6 + k * 5.6;
      const y = -80.2 + r * 6.8;
      tubes.push(`<circle cx="${f(s < 0 ? -x : x)}" cy="${f(y)}" r="2.1" fill="#05070a" stroke="${INK}" stroke-width=".6"/><circle cx="${f(s < 0 ? -x : x)}" cy="${f(y + 0.3)}" r="1.1" fill="#c8402e"/>`);
    }
  return (
    rot(shape(M(arm), "url(#steelDk)", 0.8)) +
    K.pauldron(s) +
    rot(
      shape(M(box), "url(#steelDk)", 1.1) +
        shape(M("M15,-82.6 L32.6,-84.4 L33.6,-81.8 L33.4,-66.4 L31.4,-64.2 L16,-65 L14.6,-68 Z"), "url(#steel)", 0.8) +
        tubes.join("") +
        shape(M("M14.2,-67.4 L35.6,-68 L35.6,-64.6 L15,-64 Z"), HAZARD, 0.5) +
        line(M("M18,-67.5 L16.6,-64.1 M22,-67.6 L20.6,-64.2 M26,-67.7 L24.6,-64.3 M30,-67.8 L28.6,-64.4 M34,-67.9 L32.6,-64.5"), INK, 0.8, 0.9) +
        line(M("M14.6,-84.2 L33,-86"), "#f4faff", 0.6, lit ? 0.8 : 0.4) +
        (lit ? "" : line("M35.8,-82 L35.6,-64.8", c.rim, 0.9, 0.9)),
    )
  );
}

export default {
  id: "exo",
  frames: {
    // A machine worn over the suit: the silhouette grows with it.
    exo: { shape: { width: 1.14, shoulder: 1.2, hides: [] }, layers: exo },
  },
  helmets: {
    // Gear seats on the cage (crown), the shell above the canopy (brow) and
    // the temple sensor blocks (side); the badge sits high on the left of
    // the shell, clear of the canopy and the cage.
    cockpit: { anchors: { top: -101.6, half: 16, rail: -86.4, badge: { x: -7.6, y: -93.4, rot: -6, size: 4.2 } }, paint: cockpit },
  },
  shoulders: {
    pods: { paint: pods },
  },
};
