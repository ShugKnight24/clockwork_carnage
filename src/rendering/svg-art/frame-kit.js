/**
 * Drawing kit shared by the wardrobe themes' painters (wardrobe-themes/) and
 * the rig: shared colours, joint-local plates and strokes, and limb lerps
 * along a pose's joints.
 */
import { f, pt, lerp, mirror, shape, line } from "./models/hero.js";

/** Shared gradients the frames paint with (defined by the rig's defs). */
export const STEEL = "url(#steel)";
export const STEEL_DK = "url(#steelDk)";
export const SUIT = "url(#suit)";

/** Candy red: the Reliquary's tabard and trim, not the player's palette (the Modern look keeps it lacquer-dark). */
export const CANDY = "#c8102e";
export const CANDY_HI = "#ff3c54";
/** Ordnance amber: feed belts, warning lights and launcher rails. */
export const AMBER = "#ffae3a";

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
