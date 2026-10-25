/**
 * Which way a shield bearer is turned, as the camera sees it.
 *
 * Enemies are camera-facing billboards, so without this a Sentinel looked the
 * same from every side and nobody could tell where its shield was pointing.
 * A shield bearer (def.frontShield) instead picks one of five drawn views
 * from the angle between its facing (`enemy.angle`) and the line to the
 * camera:
 *
 *   front      within FRONT_DEG of facing you: the shield face on
 *   threeNear  turned so its shield arm comes toward you: the shield,
 *              foreshortened, slides across in front of its body
 *   threeFar   turned so its shield arm goes away: the shield, foreshortened,
 *              out at the edge on the side it is turning to
 *   side       past the front arc (FLANK_DEG, the same ±60° combat.js and
 *              ai.js use for the shield): a profile, the shield edge-on out
 *              in front of it, its body open to you
 *   back       past BACK_DEG: its back and the power core on it; the shield
 *              is behind it, an edge showing past its shoulder
 *
 * The side view is drawn facing toward its shield side and mirrored (`flip`)
 * when it faces the other way. Front, the three-quarter views and the back are
 * drawn as they are. `shieldSide` is the side of the front view the shield is
 * drawn on: -1 screen left (the Sentinel, the Commander), +1 screen right
 * (the Time Warden's arc).
 *
 * The boundaries hold a few degrees either way of the view already showing
 * (HOLD_DEG), so a bearer standing on one does not flicker between two views.
 * The view changes at exactly the front arc's edge going out, so "I can see
 * its side" and "my shots land" agree.
 */

export const FRONT_DEG = 22.5;
export const FLANK_DEG = 60;
export const BACK_DEG = 125;
export const HOLD_DEG = 3;
/** Screen-sideways share of its facing under which the near/far side holds. */
const SIDE_HOLD = 0.06;

export const FACING_VIEWS = ["front", "threeNear", "threeFar", "side", "back"];

const RAD = 180 / Math.PI;

const band = (deg) => (deg < FRONT_DEG ? 0 : deg < FLANK_DEG ? 1 : deg < BACK_DEG ? 2 : 3);
const BAND_EDGES = [[-Infinity, FRONT_DEG], [FRONT_DEG, FLANK_DEG], [FLANK_DEG, BACK_DEG], [BACK_DEG, Infinity]];
const bandOf = (view) => (view === "front" ? 0 : view === "side" ? 2 : view === "back" ? 3 : 1);

/**
 * @param {number} angle    the enemy's facing (radians, world)
 * @param {number} toCamX   vector from the enemy toward the camera (any length)
 * @param {number} toCamY
 * @param {number} camRightX the camera's right vector
 * @param {number} camRightY
 * @param {number} [shieldSide=-1]
 * @param {{view:string, sx:number}|null} [prev] the last result, for hysteresis
 * @param {object} [out] reused result object
 * @returns {{view:string, flip:boolean, sx:number, deg:number}}
 */
export function facingView(angle, toCamX, toCamY, camRightX, camRightY, shieldSide = -1, prev = null, out = {}) {
  const fx = Math.cos(angle || 0);
  const fy = Math.sin(angle || 0);
  const len = Math.hypot(toCamX, toCamY) || 1;
  const c = (fx * toCamX + fy * toCamY) / len;
  const deg = Math.acos(Math.max(-1, Math.min(1, c))) * RAD;
  // Which way across the screen it is turned: + toward screen right.
  let sx = fx * camRightX + fy * camRightY;
  let b = band(deg);
  if (prev) {
    const pb = bandOf(prev.view);
    const [lo, hi] = BAND_EDGES[pb];
    // Hold the current band a few degrees past its edges, except the front
    // arc's: that one is exact both ways, so the side view never shows while
    // the shield would take your shot, nor the shield while it would not.
    const loHold = pb === 2 ? lo : lo - HOLD_DEG;
    const hiHold = pb === 1 ? hi : hi + HOLD_DEG;
    if (Math.abs(pb - b) === 1 && deg >= loHold && deg < hiHold) b = pb;
    if (Math.abs(sx) < SIDE_HOLD && Number.isFinite(prev.sx)) sx = Math.sign(prev.sx) * SIDE_HOLD || sx;
  }
  // Toward its shield side = the shield arm swings away from the camera.
  const towardShield = sx * shieldSide > 0;
  let view;
  if (b === 0) view = "front";
  else if (b === 1) view = towardShield ? "threeFar" : "threeNear";
  else if (b === 2) view = "side";
  else view = "back";
  out.view = view;
  out.flip = view === "side" && !towardShield;
  out.sx = sx;
  out.deg = deg;
  return out;
}
