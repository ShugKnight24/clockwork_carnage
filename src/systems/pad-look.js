/**
 * Pad look on grid levels: the right stick's own turn rate and response
 * curve, plus the touch aim assist (src/systems/aim-assist.js), since a thumb
 * on a stick cannot hold a far target the way a mouse can. The mouse gets
 * neither.
 *
 * The stick feeds game.mouse, the same look delta the mouse and touch feed,
 * so centredLook still applies ADS and invert X/Y to it. js/game.js calls it.
 */

import { CENTRED_LOOK_RATE } from "./aim.js";
import { findAssistTarget, assistFriction, applyAssistPull } from "./aim-assist.js";
import { DEFAULT_SETTINGS } from "../settings/registry.js";

/** Turn rate (rad/s) at full deflection, hip, at the default Look Sensitivity. */
export const PAD_TURN_MAX = 2.5;
/**
 * Response curve power: deflection^PAD_EXPONENT. Past 2 a light touch is fine
 * aim (30% of the stick turns at 7% speed) and full deflection still turns fast.
 */
export const PAD_EXPONENT = 2.2;

/**
 * Look delta for one frame of stick at (lookX, lookY), each -1..1, in
 * centredLook's input units (mouse pixels at Sensitivity 1).
 * @returns {{ dx: number, dy: number }}
 */
export function padLook(lookX, lookY, dt) {
  const mag = Math.hypot(lookX, lookY);
  if (!mag) return { dx: 0, dy: 0 };
  const k = ((Math.min(1, mag) ** PAD_EXPONENT / mag) * PAD_TURN_MAX * dt) / CENTRED_LOOK_RATE;
  return { dx: lookX * k, dy: lookY * k };
}

/**
 * One frame of pad look into game.mouse, with the aim assist. `lookX/lookY`
 * are the stick as js/gamepad.js reports it, already times Look Sensitivity.
 */
export function padAim(game, lookX, lookY, dt) {
  const s = game.settings;
  const def = DEFAULT_SETTINGS.gamepadLookSensitivity;
  const sens = Number(s.gamepadLookSensitivity) || def;
  // The curve bends the deflection; Look Sensitivity then scales the speed,
  // so a faster setting is not also a flatter curve.
  const x = lookX / sens;
  const y = lookY / sens;
  const level = Number(s.aimAssist) || 0;
  const target = level ? findAssistTarget(game) : null;
  const look = padLook(x, y, dt);
  // centredLook scales every look delta by the mouse's Sensitivity; the pad
  // has its own, so that is divided back out.
  const k = ((sens / def) * assistFriction(target, level)) / (Number(s.sensitivity) || 1);
  game.mouse.dx += look.dx * k;
  game.mouse.dy += look.dy * k;
  applyAssistPull(game, target, level, dt, Math.hypot(x, y));
}
