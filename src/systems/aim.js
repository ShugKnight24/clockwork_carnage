/**
 * aim.js — Reticle / camera aim math.
 *
 * Single source of truth: the reticle is drawn at one screen pixel; bullets
 * trace through that exact pixel. `aimAngles()` and `reticlePoint()` are
 * inverses of each other under the renderer's projection.
 *
 * Renderer projection (see renderer.js _projectWorld):
 *   screenX = (w/2) · (1 + tan(Δyaw) / planeMul)        planeMul = tan(fov_h/2)
 *   screenY =  h/2  - tan(pitch) · h                    (signed: pitch up → up)
 *
 * Reticle screen position:
 *   chx = w/2     + offsetX · w
 *   chy = viewH/2 + offsetY · viewH    where viewH = h − barH
 *
 * Equating yields:
 *   tan(Δyaw)   = 2·offsetX · planeMul
 *   tan(pitch)  = barH/(2h) − offsetY·(h − barH)/h
 *
 * Free-aim feel (Halo-hybrid): mouse moves reticle inside a deadzone; once
 * clamped at the edge, leftover input turns the camera (caller handles).
 */
import {
  PLAYER_AIM_LIMIT_X,
  PLAYER_AIM_LIMIT_Y,
  PLAYER_AIM_RECENTER,
  PLAYER_AIM_SENSITIVITY,
  PLAYER_ADS_FOV_MULT,
} from "../constants.js";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/** Smooth ADS FOV interpolant: 0 = hip-fire, 1 = full ADS. */
let _adsFovLerp = 0;

/** Smooth sprint/dash/slide FOV boost (degrees to add). */
let _sprintFovLerp = 0;
let _sprintFovTarget = 0;

/**
 * Apply mouse delta to player's reticle offset. Returns overflow in raw
 * input units (mouse pixels) for the caller to feed into camera turn.
 *
 * @returns {{ overflowX: number, overflowY: number }}
 */
export function applyAimDelta(player, dx, dy, settings = {}) {
  const sens = PLAYER_AIM_SENSITIVITY * (settings.sensitivity || 1);
  const invX = settings.invertX ? -1 : 1;
  const invY = settings.invertY ? -1 : 1;

  const rawX = (player.aimOffsetX || 0) + dx * sens * invX;
  const rawY = (player.aimOffsetY || 0) + dy * sens * invY;

  player.aimOffsetX = clamp(rawX, -PLAYER_AIM_LIMIT_X, PLAYER_AIM_LIMIT_X);
  player.aimOffsetY = clamp(rawY, -PLAYER_AIM_LIMIT_Y, PLAYER_AIM_LIMIT_Y);

  return {
    overflowX: (rawX - player.aimOffsetX) / (sens * invX || 1e-9),
    overflowY: (rawY - player.aimOffsetY) / (sens * invY || 1e-9),
  };
}

/** Pull reticle toward center. Call only when player is moving. */
export function recenterAim(player, dt, rate = PLAYER_AIM_RECENTER) {
  const t = Math.min(1, rate * dt);
  player.aimOffsetX = (player.aimOffsetX || 0) * (1 - t);
  player.aimOffsetY = (player.aimOffsetY || 0) * (1 - t);
}

/**
 * World yaw/pitch where the reticle currently points.
 *
 * Inverse of the renderer projection. Pitch depends on viewport vs canvas
 * height (barH) so the reticle pixel and bullet ray stay glued together
 * even with a HUD bar present.
 *
 * @param {object} player
 * @param {number} fovDeg     horizontal FOV in degrees
 * @param {object} [opts]
 * @param {number} [opts.barH]   HUD bar height in canvas pixels (default 0)
 * @param {number} [opts.h]      canvas height (default = h, only ratio matters)
 */
export function aimAngles(player, fovDeg = 70, opts = {}) {
  const planeMul = Math.tan((fovDeg * 0.5 * Math.PI) / 180);
  const offX = player.aimOffsetX || 0;
  const offY = player.aimOffsetY || 0;
  const h = opts.h || 1;
  const barH = opts.barH || 0;
  const viewFrac = (h - barH) / h; // 1.0 when no HUD bar

  const yaw = player.angle + Math.atan(2 * offX * planeMul);
  // tan(pitch) = barH/(2h) − offsetY·(h-barH)/h  (renderer derivation)
  const tanPitch = barH / (2 * h) - offY * viewFrac;
  const pitch = Math.atan(tanPitch);
  return { yaw, pitch };
}

/** World-space height (vertical world distance) the aim ray reaches at horizontal `dist`. */
export function aimHeightAtDistance(player, dist, fovDeg = 70, opts) {
  return Math.tan(aimAngles(player, fovDeg, opts).pitch) * dist;
}

export function effectiveAimFov(player, settings = {}) {
  const baseFov = (settings.fov || 70) + _sprintFovLerp;
  return baseFov * (1 - _adsFovLerp * (1 - PLAYER_ADS_FOV_MULT));
}

/** Drive the smooth ADS FOV transition. Call once per frame. */
export function updateAdsFov(player, dt) {
  const target = player?.isAiming ? 1 : 0;
  _adsFovLerp += (target - _adsFovLerp) * Math.min(1, 8 * dt);
}

/** Drive the smooth sprint/dash/slide FOV boost. Call once per frame. */
export function updateSprintFov(player, dt) {
  _sprintFovTarget = player.isDashing ? 12 : player.isSliding ? 10 : player.isSprinting ? 8 : 0;
  _sprintFovLerp += (_sprintFovTarget - _sprintFovLerp) * Math.min(1, 6 * dt);
}

/** Snap ADS lerp back to hip-fire (call on death/respawn). */
export function resetAdsFov() {
  _adsFovLerp = 0;
}

/**
 * Compute current HUD bar height in canvas pixels. Mirrors the math in
 * `src/ui/hud.js` so combat code can pass the correct `barH` to aimAngles
 * without circular imports.
 */
export function currentBarH(game) {
  const h = game.canvas?.height || 0;
  const hudFactor = (game.settings?.hudScale || 100) / 100;
  // Inline isCompactPhone test (avoids cycle): viewport <= 420 on touch.
  const compact = game.isTouchDevice && h > 0 && h <= 420;
  if (compact) return Math.round(60 * hudFactor);
  return game.settings?.hudStyle === 1 ? Math.round(160 * hudFactor) : 0;
}

/** Convenience wrapper for fire path: bind game-derived dims and FOV. */
export function aimAnglesForGame(game) {
  const fov = effectiveAimFov(game.player, game.settings);
  return aimAngles(game.player, fov, {
    h: game.canvas?.height || 1,
    barH: currentBarH(game),
  });
}

/**
 * Reticle screen pixel. Inverse of aimAngles for any (offsetX, offsetY).
 *
 * @param {number} w     canvas width
 * @param {number} h     canvas height
 * @param {number} barH  HUD bar height (subtracted from viewport)
 * @param {object} player
 */
export function reticlePoint(w, h, barH = 0, player) {
  const viewH = h - barH;
  return {
    x: w / 2 + (player?.aimOffsetX || 0) * w,
    y: viewH / 2 + (player?.aimOffsetY || 0) * viewH,
  };
}

