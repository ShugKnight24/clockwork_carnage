/**
 * Drawing kit shared by the wardrobe themes' painters (wardrobe-themes/) and
 * the rig: shared colours, joint-local plates and strokes, limb lerps along
 * a pose's joints, and the Exo-Frame's machinery (strut, drum).
 */
import { INK, f, pt, lerp, mirror, shape, line } from "./models/hero.js";

/** Shared gradients the frames paint with (defined by the rig's defs). */
export const STEEL = "url(#steel)";
export const STEEL_DK = "url(#steelDk)";
export const SUIT = "url(#suit)";

/** Candy red: the Reliquary's tabard and trim, not the player's palette (the Modern look keeps it lacquer-dark). */
export const CANDY = "#c8102e";
export const CANDY_HI = "#ff3c54";
/** Ordnance amber: feed belts, warning lights and launcher rails. */
export const AMBER = "#ffae3a";
/** Hazard yellow (warning bands on machinery) and the chrome of a piston rod. */
export const HAZARD = "#e8b425";
export const CHROME = "#cfd8e0";

export const angle = (a, b) => (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI - 90;
/** A plate path drawn in a joint's local frame: origin at `at`, +y along `from`→`to`. */
export const plateAt = (at, from, to, d, fill = STEEL, w = 0.9) =>
  `<g transform="translate(${pt(...at)}) rotate(${f(angle(from, to))})">${shape(d, fill, w)}</g>`;

/** A stroke drawn in a joint's local frame (see plateAt). */
export const lineAt = (at, from, to, d, color, w, op) =>
  `<g transform="translate(${pt(...at)}) rotate(${f(angle(from, to))})">${line(d, color, w, op)}</g>`;

/** A right-side path, mirrored for the left side (s < 0). */
export const mirrorIf = (s, d) => (s < 0 ? mirror(d) : d);

/** A limb profile ([t, width] pairs) with every width scaled by `x`. */
export const k = (prof, x) => prof.map(([t, w]) => [t, w * x]);
/** A point `t` of the way down a leg's thigh (hip → knee). */
export const T = (leg, t) => lerp(leg.hip, leg.kn, t);
/** A point `t` of the way down a leg's shin (knee → ankle). */
export const S = (leg, t) => lerp(leg.kn, leg.an, t);

/**
 * A hydraulic strut from `a` to `b`, pushed `off` out to the side `s`: a
 * cylinder over the first part, the chrome rod sliding out of it, a pin at
 * each end.
 */
export function strut(a, b, s, off, cyl = 3.2, rod = 1.5) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const at = [a[0] + s * off, a[1]];
  const to = [b[0] + s * off, b[1]];
  const c0 = len * 0.08;
  const c1 = len * 0.6;
  const body =
    `M${f(-rod / 2)},${f(c1 - 1)} L${f(rod / 2)},${f(c1 - 1)} L${f(rod / 2)},${f(len - 1.6)} L${f(-rod / 2)},${f(len - 1.6)} Z`;
  const tube = `M${f(-cyl / 2)},${f(c0)} L${f(cyl / 2)},${f(c0)} L${f(cyl / 2)},${f(c1)} L${f(-cyl / 2)},${f(c1)} Z`;
  return (
    plateAt(at, at, to, body, CHROME, 0.6) +
    lineAt(at, at, to, `M${f(-rod / 4)},${f(c1)} L${f(-rod / 4)},${f(len - 2)}`, "#ffffff", 0.4, 0.8) +
    plateAt(at, at, to, tube, STEEL_DK, 0.8) +
    lineAt(at, at, to, `M${f(-cyl / 2 + 0.6)},${f(c0 + 1)} L${f(-cyl / 2 + 0.6)},${f(c1 - 1)}`, "#9fb0c0", 0.45, 0.7) +
    lineAt(at, at, to, `M${f(-cyl / 2)},${f(c1 - 0.6)} L${f(cyl / 2)},${f(c1 - 0.6)}`, INK, 0.6, 0.8) +
    `<circle cx="${f(at[0])}" cy="${f(at[1])}" r="${f(cyl * 0.62)}" fill="${STEEL}" stroke="${INK}" stroke-width=".6"/>` +
    `<circle cx="${f(to[0])}" cy="${f(to[1])}" r="${f(rod * 0.9)}" fill="${STEEL_DK}" stroke="${INK}" stroke-width=".5"/>`
  );
}

/** A joint actuator: a drum on the joint with a hub light. */
export const drum = (p, r) =>
  `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${f(r)}" fill="${STEEL_DK}" stroke="${INK}" stroke-width=".8"/>` +
  `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${f(r * 0.62)}" fill="${STEEL}" stroke="${INK}" stroke-width=".5"/>` +
  `<path d="M${pt(p[0] - r * 0.62, p[1])} L${pt(p[0] + r * 0.62, p[1])} M${pt(p[0], p[1] - r * 0.62)} L${pt(p[0], p[1] + r * 0.62)}" stroke="${INK}" stroke-width=".4" opacity=".6"/>`;

// ── Gloves ─────────────────────────────────────────────────────────────────
// For the themes' glove painters (see wardrobe-themes/index.js), which draw
// on the hand's geometry (H) and the cuff's coordinates: origin the wrist,
// +y down the forearm into the hand.

/** Stitching: a dashed thread along a path. */
export const stitch = (d, color, w = 0.3, op = 0.9, dash = ".7 .5") =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-opacity="${op}" stroke-dasharray="${dash}" stroke-linecap="round"/>`;

/**
 * A glove's cuff round the forearm, from `top` (up the forearm, negative) to
 * `bottom` (onto the hand), `flare` wider than the forearm at the top and
 * `hug` at the bottom; both edges curve round the arm.
 */
export function cuffPath(H, top, bottom, flare = 1, hug = 0.4) {
  const a = H.wrist / 2 + flare;
  const b = H.wrist / 2 + hug;
  return (
    `M${f(-a)},${f(top)} C${f(-a * 0.4)},${f(top - 0.8)} ${f(a * 0.4)},${f(top - 0.8)} ${f(a)},${f(top)} ` +
    `L${f(b)},${f(bottom)} C${f(b * 0.4)},${f(bottom + 0.7)} ${f(-b * 0.4)},${f(bottom + 0.7)} ${f(-b)},${f(bottom)} Z`
  );
}

/** A line round the cuff at `y`, `out` wider than the forearm, curving with the arm. */
export const cuffLine = (H, y, out = 0.4) => {
  const a = H.wrist / 2 + out;
  return `M${f(-a)},${f(y)} C${f(-a * 0.4)},${f(y + 0.7)} ${f(a * 0.4)},${f(y + 0.7)} ${f(a)},${f(y)}`;
};

/** The middle of the wrist's two sides on the back of the hand (H.back.wrist), in the hand's coordinates. */
export const wristMid = (H) => lerp(...H.back.wrist, 0.5);

/**
 * A line over the back of the hand from the wrist toward knuckle `i` (H.back.knuckles),
 * from `a` to `b` of the way: a tendon, a seam or a row of stitches.
 */
export const ray = (H, i, a, b) => {
  const m = wristMid(H);
  const k = H.back.knuckles[i];
  return `M${pt(...lerp(m, k, a))}L${pt(...lerp(m, k, b))}`;
};
