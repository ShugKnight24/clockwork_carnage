/**
 * Is there an enemy under the reticle that the held gun reaches? The HUD
 * turns the reticle red when there is (src/ui/hud-shared.js drawAimReticle:
 * one cast a frame, and only on a frame that draws a reticle).
 *
 * The same ray a shot takes (src/systems/combat-orchestrator.js hitscan):
 * through the reticle, stopped by walls, nearest enemy first. "Reaches" is
 * the gun's full-damage distance, `falloff[0]`, where it has one, else its
 * range; so the Phase Scattergun goes red only inside 3 tiles. A projectile
 * gun is judged as if its round arrived at once, out to `range`.
 *
 * Red only where the round would do damage: not on the dead, an enemy held
 * by a stasis room, or the Final Form while he stops time (damageScale 0,
 * as damageEnemy reads it). One of those in front of an enemy hides it, as
 * it takes the round. Friendly people are invisible to the shot (only
 * `type === "enemy"` is tested), so an enemy behind one still shows red.
 *
 * Blind fire from cover never shows red here: that round leaves from another
 * point and finds its own target (src/systems/cover-play.js), which the
 * reticle does not try to predict.
 */
import { aimAnglesForGame } from "./aim.js";
import { pickHitscanTarget, voxelShotReach } from "./combat.js";

export function hostileUnderReticle(game) {
  const player = game.player;
  const wep = player?.alive === false ? null : player?.getWeaponDef?.();
  if (!wep || !game.entities) return false;
  const range = wep.falloff ? wep.falloff[0] : wep.range;
  const aim = aimAnglesForGame(game);
  // A voxel level shoots along the camera's real pitch (hitscan, as above).
  const pitch = game.world ? player.pitch || 0 : aim.pitch;
  const dirX = Math.cos(aim.yaw);
  const dirY = Math.sin(aim.yaw);
  const reach = game.world ? voxelShotReach(game.world, player, dirX, dirY, pitch, range) : null;
  const hit = pickHitscanTarget(player, dirX, dirY, pitch, range, game.entities, game.map, reach);
  const e = hit?.enemy;
  if (!e || !(e.health > 0) || e._stasis) return false;
  return (game.chronoPowers?.damageScale?.(e) ?? 1) !== 0;
}
