/**
 * Touch aim assist: a thumb on glass cannot hold a reticle on a far target the
 * way a mouse can, so on a touch device the aim slows as it crosses an enemy
 * (friction) and leans toward it while the player is aiming or moving
 * (pull). Nothing happens without input: it is help steering, not an aimbot.
 * With the sights up it leans toward the head, so a steady ADS shot is how
 * headshots are made on a phone.
 *
 * Grid levels only (the voxel Forge aims its own way). Pure apart from the
 * player it nudges; js/touch.js calls it.
 */

import { aimAnglesForGame, currentBarH } from "./aim.js";
import { zoneAimHeight, enemyHitRadius } from "./combat.js";
import { hasLineOfSight, eyeOffsetZ } from "./physics.js";
import { PLAYER_AIM_LIMIT_Y } from "../constants.js";

/** aimAssist setting values. */
export const ASSIST_OFF = 0;
export const ASSIST_LOW = 1;
export const ASSIST_STANDARD = 2;

/** Farthest enemy (tiles) the assist will lean toward. */
const RANGE = 24;
/** Smallest capture cone (rad, either side), so a far target is still catchable. */
const CONE_MIN = 0.045;
/** Capture cone in units of the target's own angular half-width. */
const CONE_WIDTHS = 2.6;
/** Look speed left inside the cone, at full strength. */
const FRICTION = 0.45;
/** How fast the pull closes the gap (1/s) at full strength and full input. */
const PULL_RATE = 5.5;

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * The enemy nearest the reticle inside its capture cone, or null.
 * @returns {{ enemy, dYaw: number, dPitch: number, dTan: number, closeness: number } | null}
 *   dYaw/dPitch: radians from the reticle to the aim point; closeness 1 on it, 0 at the cone's edge
 */
export function findAssistTarget(game) {
  const p = game.player;
  if (!p || game.world || !game.entities?.length) return null;
  const aim = aimAnglesForGame(game);
  const eye = eyeOffsetZ(p);
  // Where on the figure it leans: the middle from the hip, the head zone
  // through the sights (combat.js zoneAimHeight, the height a shot needs).
  const zone = p.isAiming ? "head" : "body";
  let best = null;
  for (const e of game.entities) {
    if (e.type !== "enemy" || !e.active || e.state === "dead" || e._phased) continue;
    const ex = e.x - p.x;
    const ey = e.y - p.y;
    const dist = Math.hypot(ex, ey);
    if (dist < 0.3 || dist > RANGE) continue;
    const dYaw = wrap(Math.atan2(ey, ex) - aim.yaw);
    const cone = Math.max(CONE_MIN, Math.atan(enemyHitRadius(e) / dist) * CONE_WIDTHS);
    if (Math.abs(dYaw) > cone) continue;
    const tanT = (zoneAimHeight(e, zone, true) - eye) / dist;
    const dPitch = Math.atan(tanT) - aim.pitch;
    const off = Math.hypot(dYaw, dPitch) / cone;
    if (off > 1 || (best && off >= 1 - best.closeness)) continue;
    if (game.map && !hasLineOfSight(game.map, p.x, p.y, e.x, e.y)) continue;
    best = { enemy: e, dYaw, dPitch, dTan: tanT - Math.tan(aim.pitch), closeness: 1 - off };
  }
  return best;
}

/** Multiplier for look input this frame: below 1 while the reticle is on a target. */
export function assistFriction(target, level) {
  if (!target || !level) return 1;
  const k = (level === ASSIST_LOW ? 0.5 : 1) * Math.min(1, target.closeness * 1.6);
  return 1 - (1 - FRICTION) * k;
}

/**
 * Lean the aim toward `target` for `dt` seconds. `input` (0..1) is how much
 * the player is steering: look drags, the stick, the trigger. No input, no pull.
 */
export function applyAssistPull(game, target, level, dt, input) {
  if (!target || !level || input <= 0) return;
  const p = game.player;
  const strength = (level === ASSIST_LOW ? 0.45 : 1) * (p.isAiming ? 1.25 : 1) * Math.min(1, input);
  const k = 1 - Math.exp(-PULL_RATE * strength * Math.min(dt, 0.05));
  p.angle += target.dYaw * k;
  // Pitch lives in the reticle's vertical offset (aimAngles: tan(pitch)
  // falls as offY rises, scaled by the view's share of the canvas).
  const h = game.canvas?.height || 1;
  const viewFrac = (h - currentBarH(game)) / h || 1;
  const offY = (p.aimOffsetY || 0) - (target.dTan * k) / viewFrac;
  p.aimOffsetY = Math.max(-PLAYER_AIM_LIMIT_Y, Math.min(PLAYER_AIM_LIMIT_Y, offY));
}
