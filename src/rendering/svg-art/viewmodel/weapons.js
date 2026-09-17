/**
 * Modern viewmodel weapon models, keyed by weapon id (src/data/weapons.js).
 *
 * Each model has two cameras — "hip" (weapon low right, barrel aimed at the
 * reticle) and "ads" (eye on the sight line) — and a build(sc, A) that paints
 * the weapon into the "body" layer back-to-front (occluded parts first), then
 * the gloves via the poses in hands.js. Emissive parts write their bloom into
 * the "glow" layer automatically. Dimensions are millimetres; build returns
 * the muzzle, ejection port, a recoil pivot and the sight anchor in gun space
 * (hip and ADS anchors are matched to morph one pose into the other).
 */

import { INK, rrect, circle } from "./geom.js";
import { firingHand, sidearmGrip, supportThumb, clampHand, clampThumb } from "./hands.js";

// Five-tone material ramps, deep shadow → specular.
const STEEL = ["#0b1118", "#1c2733", "#3a4d61", "#6f8aa3", "#c3d6e6"];
const GUNMETAL = ["#06080c", "#131920", "#27313c", "#4a5866", "#98a8b8"];
const POLYMER = ["#050709", "#0e1318", "#1b222a", "#2d3641", "#56636f"];
const BRONZE = ["#120a04", "#2e1d10", "#553820", "#8a633c", "#d2ad7a"];
const CRIMSON = ["#100308", "#2c0a15", "#541a2b", "#8a3550", "#d0798f"];
const PLUM = ["#0e050b", "#27101e", "#482a3a", "#70495d", "#b48ca2"];
const NAVY = ["#050b13", "#10202f", "#213a52", "#446682", "#9dbdd6"];
const BRASS = ["#0e0b04", "#29240f", "#4a4530", "#7d7449", "#c9bc86"];
const TEAL = ["#040b0b", "#0f201f", "#1e3a3a", "#3e6765", "#8fbcb9"];
const INDIGO = ["#06061a", "#15153a", "#2a2a52", "#4a4a80", "#9696c8"];

// Viewmodel focal length in units (4 px at 720p): a slightly wide lens exaggerates depth.
const F = 230;

/**
 * Hip camera: the rear top edge of the receiver lands at (rx, ry) units from
 * the reticle, `oz` mm ahead of the eye; the muzzle then falls on the line to
 * the reticle, shrunk by (oz + len) / oz. `top` = receiver top height (mm).
 */
function hipCam({ top, oz, rx, ry, kx = -0.24 }) {
  const yTop = -(ry * oz) / F;
  return { F, ox: (rx * oz) / F - kx * top, oy: yTop - top, oz, kx };
}
/**
 * ADS camera: eye `above` mm over a sight line at (sightX, sightY), weapon
 * rear `oz` mm ahead. The eye sits high on a riser or sight tower and the
 * gun is held out, so the body stays in the bottom third of the screen.
 */
const adsCam = ({ sightY, oz, above = 2.5, sightX = 0 }) => ({ F, ox: -sightX, oy: -(sightY + above), oz, kx: 0 });

/** ADS-only ghost-ring tower: rear aperture on a post and a tall front blade, both reaching the sight line. */
function ghostRing(sc, top, rib, zRear, zFront, sightY) {
  sc.boxZ(-3, 3, top, sightY - 7, zRear - 5, zRear + 5, GUNMETAL, { rim: 0.3 });
  ringSight(sc, [0, sightY, zRear], 7, 1.2, false);
  sc.boxZ(-2, 2, rib, sightY, zFront - 4, zFront + 4, GUNMETAL, { rim: 0.3 });
  sc.glowPoly(sc.disc([0, sightY + 0.6, zFront - 4.2], 1.3, "z", 8), { inner: false });
}

/**
 * ADS-only side-mounted aperture for the bulky launchers: brackets off the
 * left flank carry a rear ring and a front post out at (x, sightY), so the
 * chassis sits low and right of the reticle.
 */
function sideAperture(sc, { x, top, sightY, zRear, zFront, frontY, frontX }) {
  sc.boxZ(x - 4, frontX, frontY - 3, frontY + 3, zFront - 5, zFront + 5, GUNMETAL, { rim: 0.3 });
  sc.boxZ(x - 2.5, x + 2.5, frontY, sightY, zFront - 3, zFront + 3, GUNMETAL, { rim: 0.3 });
  sc.glowPoly(sc.disc([x, sightY + 0.6, zFront - 3.2], 1.3, "z", 8), { inner: false });
  sc.boxZ(x - 5, x + 30, top, top + 5, zRear - 8, zRear + 8, GUNMETAL, { rim: 0.3 });
  sc.boxZ(x - 3, x + 3, top + 5, sightY - 6, zRear - 4, zRear + 4, GUNMETAL, { rim: 0.3 });
  ringSight(sc, [x, sightY, zRear], 6, 1.2, false);
}

/** Open ring sight: a machined hoop on a post, with a glowing aim dot at its centre. */
function ringSight(sc, c, r, w = 1.5, dot = true) {
  const pts = [];
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, c[2]]);
  }
  sc.line(pts, INK, w + 0.8, 1);
  sc.line(pts, "#4a5866", w, 1);
  sc.line(pts.slice(9, 17), "#c3d6e6", w * 0.4, 0.7);
  if (dot) sc.glowPoly(sc.disc(c, 1.2, "z", 8), { inner: false });
}

const range = (a, b, step) => {
  const out = [];
  for (let v = a; v <= b + 1e-6; v += step) out.push(v);
  return out;
};

/** Serration lines across a right-hand face at x, from y0..y1, at each z. */
function grooves(sc, x, y0, y1, zs) {
  for (const z of zs) {
    sc.line([[x, y0, z], [x, y1, z]], INK, 0.32, 0.75);
    sc.line([[x, y0, z + 2], [x, y1, z + 2]], "#c3d6e6", 0.16, 0.22);
  }
}

/** Visible arc (right flank round to the top-left) of a circle in the z plane. */
function arc(cx, cy, r, z, a0 = -70, a1 = 190, n = 16) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]);
  }
  return out;
}
const glowArc = (sc, cx, cy, r, z, w = 0.55) => sc.glowLine(arc(cx, cy, r, z), w);

/** Visible arc of a rounded-rect section (right flank + top) at depth z, pushed out by `grow`. */
function sectionArc(x0, x1, y0, y1, c, z, grow = 0.8) {
  return [[x1 - c, y0 - grow], [x1 + grow, y0 + c], [x1 + grow, y1 - c], [x1 - c, y1 + grow], [x0 + c, y1 + grow], [x0 - grow, y1 - c]].map(([x, y]) => [x, y, z]);
}

/** Flat rectangle on the right flank (x const) spanning y and z ranges. */
const sideRect = (x, y0, y1, z0, z1) => [[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]];
/** Flat rectangle on a top face (y const). */
const topRect = (y, x0, x1, z0, z1) => [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]];

function pistolGrip(sc, g, mat = POLYMER) {
  sc.post({
    yTop: g.yTop, yBot: g.yBot,
    top: rrect(-g.hw, g.hw, g.zbT, g.zfT, 5),
    bot: rrect(-g.hw - 1, g.hw + 1, g.zbB, g.zfB, 6),
  }, mat, { rim: 0.3 });
  return g;
}

function triggerGuard(sc, y, z0, z1, drop) {
  const pts = [[0, y, z1], [0, y - drop, z1 - 4], [0, y - drop - 2, z0 + 8], [0, y - 6, z0]];
  sc.line(pts, INK, 2.2, 1);
  sc.line(pts, "#2d3641", 1.3, 1);
}


/** Detailing for a big rear bulkhead: inset access panel, bolts and a charge readout. */
function rearPanel(sc, hw, y0, y1, trim) {
  const z = -0.2;
  sc.poly([[-hw, y0, z], [hw, y0, z], [hw, y1, z], [-hw, y1, z]], "#000000", { op: 0.28, stroke: trim, sw: 0.3, sop: 0.35 });
  for (const x of [-hw + 5, hw - 5]) for (const y of [y0 + 5, y1 - 5]) sc.poly(sc.disc([x, y, z - 0.1], 2.2, "z", 8), trim, { op: 0.6, stroke: INK, sw: 0.2 });
  for (const y of range(y0 + 10, y1 - 22, 6)) sc.line([[-hw + 10, y, z - 0.1], [hw - 10, y, z - 0.1]], INK, 0.5, 0.7);
  sc.poly([[-hw * 0.5, y1 - 16, z - 0.1], [hw * 0.5, y1 - 16, z - 0.1], [hw * 0.5, y1 - 9, z - 0.1], [-hw * 0.5, y1 - 9, z - 0.1]], "#02050a", { stroke: INK, sw: 0.25 });
  sc.glowLine([[-hw * 0.42, y1 - 12.5, z - 0.2], [hw * 0.15, y1 - 12.5, z - 0.2]], 0.5);
}

/** Glowing node studs along a line on a face. */
function nodes(sc, pts, r, axis = "y") {
  for (const p of pts) sc.glowPoly(sc.disc(p, r, axis, 10));
}

export const WEAPON_MODELS = {
  // ── Chrono Pistol ───────────────────────────────────────────────────────────
  // Compact steel slide over a polymer frame, chrono channel inlaid along the top.
  0: {
    cams: { hip: hipCam({ top: 22, oz: 320, rx: 58, ry: 36, kx: -0.2 }), ads: adsCam({ sightY: 28.5, oz: 440 }) },
    build(sc, A, pose) {
      sc.cylZ(0, 11, 7, 186, 196, GUNMETAL, { n: 16 });
      glowArc(sc, 0, 11, 8.5, 195.8, 0.5);
      const g = pistolGrip(sc, { yTop: -12, yBot: -92, zfT: 55, zbT: 5, zfB: 6, zbB: -40, hw: 14.5 });
      sc.boxZ(-13, 13, -14, 0.5, 5, 175, POLYMER, { ch: 2.5 });
      triggerGuard(sc, -14, 70, 125, 26);
      for (const z of [140, 152, 164]) sc.poly(sideRect(13.05, -11, -3, z, z + 8), "#07090d", { stroke: INK, sw: 0.2 });
      supportThumb(A, g);
      // Slide.
      sc.prismZ([[-15, 0], [15, 0], [15, 17], [11, 22], [-11, 22], [-15, 17]], 0, 190, STEEL);
      sc.boxZ(-5, 5, 6, 14, -3, 0.5, STEEL, { ch: 2 });
      grooves(sc, 15.05, 3, 15, range(8, 50, 7));
      grooves(sc, 15.05, 3.5, 14.5, range(152, 180, 7));
      // Ejection port with a casing peeking out.
      sc.poly(sideRect(15.06, 6, 16.5, 70, 115), "#05070a", { stroke: INK, sw: 0.3 });
      sc.poly(sideRect(15.1, 8, 14.5, 82, 102), "#b0893c", { stroke: "#4a3510", sw: 0.25 });
      // Chrono channel along the top.
      sc.poly(topRect(22.05, -4.5, 4.5, 60, 178), "#04060a", { stroke: "#6f8aa3", sw: 0.25, sop: 0.6 });
      sc.glowLine([[0, 22.1, 66], [0, 22.1, 172]], 0.7);
      nodes(sc, [[0, 22.2, 85], [0, 22.2, 115], [0, 22.2, 145]], 2.8);
      sc.glowLine([[15.1, 3, 130], [15.1, 3, 186]], 0.45);
      // Sights.
      sc.boxZ(-13, -6, 22, 28.5, 2, 16, GUNMETAL, { rim: 0.3 });
      sc.boxZ(6, 13, 22, 28.5, 2, 16, GUNMETAL, { rim: 0.3 });
      sc.boxZ(-2.5, 2.5, 22, 27.5, 172, 186, GUNMETAL, { rim: 0.2 });
      sc.glowPoly(sc.disc([0, 25, 171.5], 1.6, "z", 10), { inner: false });

      sidearmGrip(A, g, pose === "ads");
      return { muzzle: [0, 11, 198], eject: [15, 16, 92], pivot: [0, -12, 20], sight: [0, 28, 8] };
    },
  },

  // ── Temporal Shotgun ────────────────────────────────────────────────────────
  // Bronze receiver, twin steel barrels with a ribbed pump; temporal coils on the top edges.
  1: {
    cams: { hip: hipCam({ top: 30, oz: 240, rx: 84, ry: 64, kx: -0.28 }), ads: adsCam({ sightY: 85, oz: 280 }) },
    build(sc, A, pose) {
      const hg = { y0: -18, y1: 27, hw: 21, zc: 300 };
      clampThumb(A, hg);
      if (pose === "ads") clampHand(A, hg, "body", true);
      sc.boxZ(-21, 21, -18, 6, 290, 420, BRONZE, { ch: 6 });
      grooves(sc, 21.05, -13, 1, range(300, 410, 11));
      for (const x of [-11.5, 11.5]) sc.cylZ(x, 16, 11, 225, 560, GUNMETAL, { n: 16 });
      for (const x of [-11.5, 11.5]) glowArc(sc, x, 16, 11.8, 559.5, 0.5);
      sc.boxZ(-24, 24, 3, 29, 470, 486, STEEL, { ch: 4 });
      sc.boxZ(-3, 3, 26, 30.5, 230, 556, STEEL, { rim: 0.2 });
      sc.boxZ(-2.5, 2.5, 30.5, 35, 540, 552, BRASS);
      sc.glowPoly(sc.disc([0, 35.5, 546], 1.4, "y", 8), { inner: false });
      const g = pistolGrip(sc, { yTop: -10, yBot: -76, zfT: 90, zbT: 40, zfB: 64, zbB: 14, hw: 14 });
      triggerGuard(sc, -12, 95, 150, 24);
      sc.boxZ(-20, 20, -14, 30, 0, 230, BRONZE, { ch: 6 });
      // Loading port with a shell, and the coil channels.
      sc.poly(sideRect(20.05, 2, 22, 60, 150), "#0a0603", { stroke: INK, sw: 0.3 });
      sc.poly(sideRect(20.1, 5, 19, 80, 128), "#c89a3c", { stroke: "#4a3510", sw: 0.25 });
      sc.poly(sideRect(20.12, 5, 19, 80, 90), "#8a2a1a", { stroke: INK, sw: 0.2 });
      for (const x of [-14.5, 14.5]) {
        sc.poly(topRect(30.05, x - 2.5, x + 2.5, 18, 212), "#070403", { stroke: INK, sw: 0.2 });
        sc.glowLine([[x, 30.1, 22], [x, 30.1, 208]], 0.6);
      }
      nodes(sc, [[14.5, 30.2, 60], [14.5, 30.2, 115], [14.5, 30.2, 170]], 2.2);
      for (const [y, z] of [[22, 30], [22, 200], [-6, 30], [-6, 200]]) sc.poly(sc.disc([20.1, y, z], 2.2, "x", 8), "#d2ad7a", { stroke: INK, sw: 0.25 });

      for (const x of [-8, 3]) sc.boxZ(x, x + 5, 30, 36, 6, 16, GUNMETAL, { rim: 0.3 });
      if (pose === "ads") ghostRing(sc, 30, 30.5, 20, 530, 85);
      firingHand(A, g, pose === "ads");
      if (pose !== "ads") clampHand(A, hg);
      return { muzzle: [0, 16, 570], eject: [20, 20, 110], pivot: [0, -10, 60], sight: pose === "ads" ? [0, 85, 20] : [0, 34, 10] };
    },
  },

  // ── Phase Rifle ─────────────────────────────────────────────────────────────
  // Indigo handguard banded with phase emitter rings, optic up top, power cell below.
  2: {
    cams: { hip: hipCam({ top: 30, oz: 260, rx: 84, ry: 66, kx: -0.28 }), ads: adsCam({ sightY: 86, oz: 280, above: 0 }) },
    build(sc, A, pose) {
      const hg = { y0: -14, y1: 32, hw: 22, zc: 290 };
      clampThumb(A, hg);
      if (pose === "ads") clampHand(A, hg, "body", true);
      sc.cylZ(0, 12, 8, 440, 630, GUNMETAL, { n: 14 });
      sc.cylZ(0, 12, 12, 610, 652, STEEL, { n: 16 });
      for (const z of [620, 634]) sc.poly(sideRect(12.2, 8, 16, z, z + 8), "#05070a", { stroke: INK, sw: 0.2 });
      glowArc(sc, 0, 12, 12.6, 651.5, 0.55);
      sc.boxZ(-12, 12, -62, -14, 150, 205, GUNMETAL, { ch: 3 });
      sc.glowPoly(sideRect(12.05, -52, -24, 160, 195));
      const g = pistolGrip(sc, { yTop: -14, yBot: -80, zfT: 100, zbT: 55, zfB: 76, zbB: 30, hw: 14 });
      triggerGuard(sc, -16, 105, 150, 22);
      sc.prismZ(rrect(-22, 22, -14, 32, 8), 240, 452, INDIGO);
      for (const z of range(262, 432, 34)) sc.poly(sideRect(22.05, -6, 22, z + 8, z + 24), "#07071a", { stroke: INK, sw: 0.25 });
      for (const z of range(258, 428, 34)) sc.glowLine(sectionArc(-22, 22, -14, 32, 8, z), 0.55);
      sc.boxZ(-20, 20, -16, 30, 0, 240, GUNMETAL, { ch: 5 });
      // Plasma chamber window on the right flank.
      sc.poly(sideRect(20.05, -2, 22, 140, 226), "#05050f", { stroke: INK, sw: 0.3 });
      sc.glowPoly(sideRect(20.1, 3, 17, 148, 218));
      grooves(sc, 20.05, -10, 24, range(14, 60, 8));
      // Holographic ring sight on a rail.
      sc.boxZ(-8, 8, 30, 36, 50, 170, GUNMETAL, { ch: 2 });
      for (const z of range(58, 162, 13)) sc.line([[-8, 36.1, z], [8, 36.1, z]], INK, 0.35, 0.6);
      // At ADS the sight rides a tall riser so the rifle stays low in the frame.
      const ringY = pose === "ads" ? 86 : 62;
      sc.boxZ(-3, 3, 36, ringY - 16, 104, 116, GUNMETAL);
      ringSight(sc, [0, ringY, 110], 16, 1.6);

      firingHand(A, g, pose === "ads");
      if (pose !== "ads") clampHand(A, hg);
      return { muzzle: [0, 12, 660], eject: [20, 22, 120], pivot: [0, -14, 70], sight: [0, ringY, 110] };
    },
  },

  // ── Quantum Cannon ──────────────────────────────────────────────────────────
  // Heavy crimson chassis, tapering coil housing, exposed quantum core, aperture sights.
  3: {
    cams: { hip: hipCam({ top: 44, oz: 225, rx: 82, ry: 58, kx: -0.24 }), ads: adsCam({ sightY: 100, sightX: -58, oz: 340 }) },
    build(sc, A, pose) {
      const hg = { y0: -24, y1: 36, hw: 30, zc: 330 };
      clampThumb(A, hg);
      if (pose === "ads") clampHand(A, hg, "body", true);
      const housing = rrect(-30, 30, -20, 40, 10);
      sc.prismZ(housing, 300, 470, CRIMSON, { taper: 0.74, pivot: [0, 10] });
      for (const z of [330, 370, 410, 450]) {
        const t = 1 - ((z - 300) / 170) * 0.26;
        sc.glowLine(sectionArc(-30 * t, 30 * t, 10 - 30 * t, 10 + 30 * t, 10 * t, z, 1), 0.6);
      }
      sc.cylZ(0, 10, 20, 468, 500, GUNMETAL, { n: 18 });
      glowArc(sc, 0, 10, 21.5, 499.5, 0.8);
      const g = pistolGrip(sc, { yTop: -28, yBot: -94, zfT: 95, zbT: 45, zfB: 68, zbB: 18, hw: 15 });
      triggerGuard(sc, -30, 100, 150, 22);
      sc.prismZ(rrect(-40, 40, -30, 44, 12), 0, 300, CRIMSON);
      // Side conduit and vents on the right flank.
      sc.cylZ(40, 30, 6, 20, 290, GUNMETAL, { n: 10 });
      sc.glowLine([[40, 36.4, 30], [40, 36.4, 280]], 0.55);
      for (const z of [60, 90, 120]) {
        sc.poly(sideRect(40.05, 8, 30, z, z + 16), "#0a0205", { stroke: INK, sw: 0.3 });
        sc.glowLine([[40.1, 12, z + 8], [40.1, 26, z + 8]], 0.5);
      }
      // Quantum core window.
      sc.poly(topRect(44.05, -22, 22, 118, 232), "#0a0205", { stroke: "#d0798f", sw: 0.3, sop: 0.5 });
      sc.glowPoly(topRect(44.1, -16, 16, 128, 222));
      sc.line([[-16, 44.2, 175], [16, 44.2, 175]], INK, 0.3, 0.6);
      sc.line([[0, 44.2, 128], [0, 44.2, 222]], INK, 0.3, 0.6);
      sc.poly(topRect(44.05, -38, 38, 284, 296), "#ff3344", { op: 0.55 });
      for (const x of [-34, -18, -2, 14, 30]) sc.poly([[x, 44.1, 284], [x + 7, 44.1, 284], [x + 12, 44.1, 296], [x + 5, 44.1, 296]], "#12030a", { op: 0.8 });
      for (const [y, z] of [[36, 12], [36, 288], [-22, 12], [-22, 288]]) sc.poly(sc.disc([40.1, y, z], 2.6, "x", 8), "#d0798f", { stroke: INK, sw: 0.25 });
      rearPanel(sc, 30, -22, 36, "#d0798f");

      // Aperture sights: on top at the hip, swung out to a side mount when aiming.
      if (pose === "ads") {
        sideAperture(sc, { x: -58, top: 44, sightY: 100, zRear: 20, zFront: 440, frontY: 30, frontX: -18 });
      } else {
        sc.boxZ(-3, 3, 44, 49, 14, 26, GUNMETAL);
        ringSight(sc, [0, 54, 20], 6, 1.1, false);
        sc.boxZ(-2.5, 2.5, 30, 54, 450, 460, GUNMETAL, { rim: 0.3 });
        sc.glowPoly(sc.disc([0, 54, 449.5], 1.3, "z", 8), { inner: false });
      }
      firingHand(A, g, pose === "ads");
      if (pose !== "ads") clampHand(A, hg);
      return { muzzle: [0, 10, 505], eject: [40, 20, 100], pivot: [0, -28, 70], sight: pose === "ads" ? [-58, 100, 20] : [0, 54, 20] };
    },
  },

  // ── Phase Scattergun ────────────────────────────────────────────────────────
  // Wide plum body, three stacked barrels under a vented shroud, phase emitter core.
  4: {
    cams: { hip: hipCam({ top: 34, oz: 225, rx: 84, ry: 62, kx: -0.28 }), ads: adsCam({ sightY: 89, oz: 280 }) },
    build(sc, A, pose) {
      const hg = { y0: -22, y1: 6, hw: 26, zc: 330 };
      clampThumb(A, hg);
      if (pose === "ads") clampHand(A, hg, "body", true);
      sc.boxZ(-26, 26, -22, 6, 300, 420, PLUM, { ch: 6 });
      grooves(sc, 26.05, -17, 1, range(310, 410, 11));
      for (const x of [-16, 0, 16]) sc.cylZ(x, 18, 9.5, 250, 515, GUNMETAL, { n: 14 });
      sc.boxZ(-30, 30, 4, 32, 470, 522, PLUM, { ch: 7 });
      for (const z of [480, 494]) {
        sc.poly(sideRect(30.05, 10, 26, z, z + 8), "#0a0409", { stroke: INK, sw: 0.25 });
        sc.glowLine([[30.1, 13, z + 4], [30.1, 23, z + 4]], 0.45);
      }
      sc.glowLine([[-24, 32.2, 512], [24, 32.2, 512]], 0.8);
      const g = pistolGrip(sc, { yTop: -12, yBot: -78, zfT: 92, zbT: 42, zfB: 66, zbB: 16, hw: 14 });
      triggerGuard(sc, -14, 98, 150, 22);
      sc.boxZ(-30, 30, -14, 34, 0, 262, PLUM, { ch: 9 });
      // Phase emitter core set in the top plate.
      sc.poly(sc.disc([0, 34.05, 150], 19, "y", 20), "#0a0409", { stroke: "#b48ca2", sw: 0.35, sop: 0.6 });
      sc.glowPoly(sc.disc([0, 34.1, 150], 12.5, "y", 20));
      sc.poly(topRect(34.05, -26, 26, 10, 18), "#ff66cc", { op: 0.25 });
      // Conduit and studs on the right flank.
      sc.poly(sideRect(30.05, 4, 12, 20, 245), "#0a0409", { stroke: INK, sw: 0.25 });
      sc.glowLine([[30.1, 8, 26], [30.1, 8, 238]], 0.55);
      nodes(sc, [[30.2, 8, 70], [30.2, 8, 130], [30.2, 8, 190]], 2.6, "x");

      for (const x of [-9, 4]) sc.boxZ(x, x + 5, 34, 40, 6, 16, GUNMETAL, { rim: 0.3 });
      sc.boxZ(-2.5, 2.5, 32, 40, 500, 512, GUNMETAL, { rim: 0.3 });
      sc.glowPoly(sc.disc([0, 40.5, 506], 1.3, "y", 8), { inner: false });
      if (pose === "ads") ghostRing(sc, 34, 32, 20, 500, 89);
      firingHand(A, g, pose === "ads");
      if (pose !== "ads") clampHand(A, hg);
      return { muzzle: [0, 18, 530], eject: [30, 20, 110], pivot: [0, -12, 65], sight: pose === "ads" ? [0, 89, 20] : [0, 38, 10] };
    },
  },

  // ── Temporal Sniper ─────────────────────────────────────────────────────────
  // Long fluted barrel with coil rings, bolt action, big optic with a glowing eyepiece.
  5: {
    cams: { hip: hipCam({ top: 28, oz: 350, rx: 84, ry: 66, kx: -0.28 }), ads: adsCam({ sightY: 88, oz: 300, above: 0 }) },
    build(sc, A, pose) {
      const hg = { y0: -12, y1: 26, hw: 19, zc: 330 };
      clampThumb(A, hg);
      if (pose === "ads") clampHand(A, hg, "body", true);
      sc.cylZ(0, 12, 9, 380, 870, NAVY, { n: 14 });
      for (const z of range(640, 820, 60)) sc.line([[9.2, 12, z], [9.2, 12, z + 40]], INK, 0.3, 0.6);
      for (const z of [520, 560, 600]) glowArc(sc, 0, 12, 10, z, 0.55);
      sc.cylZ(0, 12, 13, 860, 905, GUNMETAL, { n: 16 });
      glowArc(sc, 0, 12, 13.6, 904.5, 0.6);
      sc.boxZ(-10, 10, -52, -14, 120, 170, GUNMETAL, { ch: 3 });
      sc.glowPoly(sideRect(10.05, -44, -22, 128, 162));
      const g = pistolGrip(sc, { yTop: -12, yBot: -78, zfT: 92, zbT: 45, zfB: 68, zbB: 22, hw: 14 });
      triggerGuard(sc, -14, 95, 140, 22);
      sc.prismZ(rrect(-19, 19, -12, 26, 6), 220, 520, NAVY);
      for (const z of range(250, 490, 40)) sc.poly(sideRect(19.05, -4, 18, z, z + 24), "#050b13", { stroke: INK, sw: 0.25 });
      sc.boxZ(-19, 19, -14, 28, 0, 220, NAVY, { ch: 4 });
      sc.poly(sideRect(19.05, 2, 10, 60, 214), "#03070c", { stroke: INK, sw: 0.25 });
      sc.glowLine([[19.1, 6, 66], [19.1, 6, 208]], 0.55);
      nodes(sc, [[19.2, 6, 100], [19.2, 6, 150], [19.2, 6, 196]], 2.2, "x");
      // Bolt handle (it would loom in front of the eye at ADS).
      if (pose !== "ads") {
        sc.boxZ(19, 38, 12, 18, 30, 42, STEEL);
        sc.boxZ(34, 46, 7, 23, 26, 46, STEEL, { ch: 4 });
      }
      // Temporal ring sights: a wide rear hoop and a glowing front hoop that line up at ADS.
      sc.boxZ(-8, 8, 28, 34, 60, 260, GUNMETAL, { ch: 2 });
      const ringY = pose === "ads" ? 88 : 66;
      for (const z of [104, 234]) sc.boxZ(-3, 3, 34, ringY - 18, z, z + 12, GUNMETAL);
      ringSight(sc, [0, ringY, 240], 11, 1.2, false);
      sc.glowLine(arc(0, ringY, 11, 239.5, -90, 270, 24), 0.4);
      ringSight(sc, [0, ringY, 110], 18, 1.8);

      firingHand(A, g, pose === "ads");
      if (pose !== "ads") clampHand(A, hg);
      return { muzzle: [0, 12, 915], eject: [19, 20, 90], pivot: [0, -12, 65], sight: [0, ringY, 110] };
    },
  },

  // ── Ricochet Pistol ─────────────────────────────────────────────────────────
  // Angular brass slide with deflector fins and a zig-zag ricochet channel.
  6: {
    cams: { hip: hipCam({ top: 22, oz: 310, rx: 58, ry: 36, kx: -0.2 }), ads: adsCam({ sightY: 29.5, oz: 430 }) },
    build(sc, A, pose) {
      sc.cylZ(0, 11, 6.5, 168, 184, GUNMETAL, { n: 6, rot: Math.PI / 6 });
      sc.glowLine(arc(0, 11, 8, 183.5, -60, 240, 6), 0.55);
      for (const s of [-1, 1]) sc.prismZ([[s * 15, 3], [s * 25, 8], [s * 15, 17]], 128, 176, BRASS, { taper: 0.7, pivot: [s * 15, 10] });
      const g = pistolGrip(sc, { yTop: -12, yBot: -90, zfT: 55, zbT: 5, zfB: 8, zbB: -38, hw: 14.5 });
      sc.boxZ(-13, 13, -14, 0.5, 5, 160, GUNMETAL, { ch: 2.5 });
      triggerGuard(sc, -14, 70, 122, 24);
      supportThumb(A, g);
      sc.prismZ([[-15, 0], [15, 0], [16, 12], [10, 22], [-10, 22], [-16, 12]], 0, 172, BRASS);
      sc.boxZ(-5, 5, 6, 14, -3, 0.5, GUNMETAL, { ch: 2 });
      grooves(sc, 15.6, 3, 11, range(8, 44, 7));
      sc.poly(sideRect(15.8, 5, 11, 70, 108), "#07060a", { stroke: INK, sw: 0.3 });
      // Ricochet channel zig-zagging down the top.
      const zig = [[-6, 30], [6, 62], [-6, 94], [6, 126], [-6, 158]].map(([x, z]) => [x, 22.1, z]);
      sc.poly(topRect(22.05, -9, 9, 26, 162), "#0b0903", { stroke: "#7d7449", sw: 0.25, sop: 0.6 });
      sc.glowLine(zig, 0.7);
      nodes(sc, zig.slice(1, 4), 2.4);
      // Angular sights.
      for (const s of [-1, 1]) sc.prismZ([[s * 12, 22], [s * 6, 22], [s * 9, 30]], 2, 14, GUNMETAL, { rim: 0.3 });
      sc.prismZ([[-2.5, 22], [2.5, 22], [0, 28]], 160, 170, GUNMETAL);
      sc.glowPoly(sc.disc([0, 24.5, 159.5], 1.5, "z", 6), { inner: false });

      sidearmGrip(A, g, pose === "ads");
      return { muzzle: [0, 11, 188], eject: [15, 14, 90], pivot: [0, -12, 20], sight: [0, 29, 8] };
    },
  },

  // ── EMP Launcher ────────────────────────────────────────────────────────────
  // Armoured teal launcher: wide finned tube with charging rings, capacitor bank, aperture sights.
  7: {
    cams: { hip: hipCam({ top: 46, oz: 215, rx: 82, ry: 58, kx: -0.24 }), ads: adsCam({ sightY: 102, sightX: -56, oz: 340 }) },
    build(sc, A, pose) {
      const hg = { y0: -14, y1: 46, hw: 30, zc: 340 };
      clampThumb(A, hg);
      if (pose === "ads") clampHand(A, hg, "body", true);
      sc.cylZ(0, 16, 30, 280, 470, TEAL, { n: 22 });
      for (const z of [300, 330, 360, 390, 420]) {
        sc.boxZ(28, 42, 8, 24, z, z + 12, GUNMETAL);
        sc.glowLine([[35, 24.2, z + 2], [35, 24.2, z + 10]], 0.4);
      }
      glowArc(sc, 0, 16, 32, 469.5, 0.9);
      sc.glowLine(arc(0, 16, 20, 471, -20, 200, 14), 0.5);
      const g = pistolGrip(sc, { yTop: -24, yBot: -90, zfT: 95, zbT: 45, zfB: 68, zbB: 18, hw: 15 });
      triggerGuard(sc, -26, 100, 150, 22);
      sc.boxZ(-38, 38, -26, 46, 0, 290, TEAL, { ch: 10 });
      // Capacitor bank on the right flank.
      sc.cylZ(44, 4, 8, 30, 262, GUNMETAL, { n: 12 });
      for (const z of [50, 110, 170, 230]) sc.glowPoly(topRect(12.1, 41, 47, z, z + 22));
      // Charge window with hazard mark on top.
      sc.poly(topRect(46.05, -24, 24, 100, 222), "#041010", { stroke: "#8fbcb9", sw: 0.3, sop: 0.5 });
      sc.glowPoly(topRect(46.1, -18, 18, 110, 212));
      sc.line([[0, 46.2, 190], [-11, 46.2, 132], [11, 46.2, 132], [0, 46.2, 190]], INK, 0.45, 0.8);
      for (const z0 of [16, 256]) {
        sc.poly(topRect(46.05, -34, 34, z0, z0 + 14), "#ffaa44", { op: 0.7 });
        for (const x of [-30, -14, 2, 18]) sc.poly([[x, 46.1, z0], [x + 7, 46.1, z0], [x + 13, 46.1, z0 + 14], [x + 6, 46.1, z0 + 14]], "#0f201f", { op: 0.85 });
      }
      for (const [y, z] of [[38, 12], [38, 278], [-18, 12], [-18, 278]]) sc.poly(sc.disc([38.1, y, z], 2.8, "x", 8), "#8fbcb9", { stroke: INK, sw: 0.25 });
      rearPanel(sc, 28, -18, 38, "#8fbcb9");

      if (pose === "ads") {
        sideAperture(sc, { x: -56, top: 46, sightY: 102, zRear: 20, zFront: 440, frontY: 16, frontX: -26 });
      } else {
        sc.boxZ(-3, 3, 46, 51, 14, 26, GUNMETAL);
        ringSight(sc, [0, 56, 20], 6, 1.1, false);
        sc.boxZ(-2.5, 2.5, 44, 56, 452, 462, GUNMETAL, { rim: 0.3 });
        sc.glowPoly(sc.disc([0, 56, 451.5], 1.3, "z", 8), { inner: false });
      }
      firingHand(A, g, pose === "ads");
      if (pose !== "ads") clampHand(A, hg);
      return { muzzle: [0, 16, 480], eject: [38, 30, 120], pivot: [0, -24, 70], sight: pose === "ads" ? [-56, 102, 20] : [0, 56, 20] };
    },
  },
};
