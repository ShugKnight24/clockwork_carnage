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
  PLAYER_ADS_ZOOM,
  PLAYER_ADS_SENS,
} from "../constants.js";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/**
 * Aim-down-sights blend: 0 = hip-fire, 1 = fully aimed. One eased value drives
 * FOV, reticle sensitivity and the viewmodel pose together, so the zoom, the
 * cursor speed and the gun move as one motion. Progress runs linearly in time
 * toward the target and is shaped by smootherstep, so the motion starts and
 * stops with zero velocity and acceleration; releasing mid-way reverses from
 * where it is.
 */
let _adsProgress = 0;
let _adsBlend = 0;
/** Seconds for a full hip ↔ ADS transition. */
const ADS_TRANSITION = 0.2;
/**
 * The sight's magnification and look speed, eased toward the held weapon's
 * (src/data/weapons.js adsZoom / adsSens) so a swap while aimed zooms over
 * rather than jumping.
 */
let _adsZoom = PLAYER_ADS_ZOOM;
let _adsZoomVel = 0;
let _adsSens = PLAYER_ADS_SENS;
/** Scope breath: seconds held still, its clock, and the offset it last added. */
let _steady = 0;
let _breathT = 0;
let _breathX = 0;
let _breathY = 0;
let _lastPos = null;

/** Smooth sprint/dash/slide FOV boost (degrees to add). */
let _sprintFovLerp = 0;
let _sprintFovVel = 0;
let _sprintFovTarget = 0;
const SPRINT_FOV_SMOOTH_TIME = 0.12;

/**
 * Critically damped spring step (Game Programming Gems 4 "SmoothDamp").
 * Framerate independent, starts and ends with zero velocity, never overshoots.
 * @returns {[number, number]} [value, velocity]
 */
export function smoothDamp(current, target, velocity, smoothTime, dt) {
  if (!(dt > 0)) return [current, velocity];
  const omega = 2 / Math.max(1e-4, smoothTime);
  const x = omega * dt;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (velocity + omega * change) * dt;
  let v = (velocity - omega * temp) * decay;
  let out = target + (change + temp) * decay;
  if (target - current > 0 === out > target) {
    out = target;
    v = 0;
  }
  return [out, v];
}

/** Current aim-down-sights blend (0 hip … 1 aimed). */
export const getAimBlend = () => _adsBlend;

/** Reticle / look speed multiplier at the current blend: slows with the ADS zoom. */
export const aimSensitivityScale = () => 1 - _adsBlend * (1 - _adsSens);

/** A weapon's sight magnification (1 = none). */
export const adsZoomOf = (wep) => wep?.adsZoom ?? PLAYER_ADS_ZOOM;

/** Magnification at the current blend: 1 at the hip, the weapon's adsZoom fully aimed. */
export const aimZoom = () => 1 + (_adsZoom - 1) * _adsBlend;

/** The held weapon's cone (radians, half-angle) at the current blend: hip `spread` to `adsSpread`. */
export function currentSpread(wep) {
  if (!wep) return 0;
  const hip = wep.spread || 0;
  return hip + ((wep.adsSpread ?? hip) - hip) * _adsBlend;
}

/**
 * Apply mouse delta to player's reticle offset. Returns overflow in raw
 * input units (mouse pixels) for the caller to feed into camera turn.
 *
 * @returns {{ overflowX: number, overflowY: number }}
 */
export function applyAimDelta(player, dx, dy, settings = {}) {
  const sens = PLAYER_AIM_SENSITIVITY * (settings.sensitivity || 1) * aimSensitivityScale();
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
  // tan(pitch) = barH/(2h) − offsetY·(h-barH)/h  (renderer derivation), plus
  // the scene's own vertical shift (opts.yShift, canvas px): the world drawn
  // lower under a fixed reticle puts a higher point of it under the reticle.
  const tanPitch = barH / (2 * h) - offY * viewFrac + (opts.yShift || 0) / h;
  const pitch = Math.atan(tanPitch);
  return { yaw, pitch };
}

/** World-space height (vertical world distance) the aim ray reaches at horizontal `dist`. */
export function aimHeightAtDistance(player, dist, fovDeg = 70, opts) {
  return Math.tan(aimAngles(player, fovDeg, opts).pitch) * dist;
}

export function effectiveAimFov(player, settings = {}) {
  const baseFov = (settings.fov || 70) + _sprintFovLerp;
  const zoom = aimZoom();
  if (zoom === 1) return baseFov;
  // Magnification narrows the view's tangent, not its angle: 4x through a
  // scope is a quarter of the view plane, whatever the base FOV.
  return (Math.atan(Math.tan((baseFov * Math.PI) / 360) / zoom) * 360) / Math.PI;
}

/**
 * Vertical shift (canvas px) the raycaster draws the world with: the crouch
 * or slide stance and the recoil punch. render-pipeline.js draws with it and
 * the fire path aims with it, so a crouched shot lands where the reticle sits
 * on the lowered view rather than a stance height above it.
 */
export function sceneShiftPx(player, h) {
  const punch = (player?.cameraPunch || 0) * -h * 0.12;
  const stance = (player?.isSliding ? 40 : 28) * (player?.crouchBlend || 0);
  return stance + punch;
}

// How fast aiming in pulls a free-aim reticle back to centre (per second).
const ADS_CENTER_RATE = 9;

/** Yaw under the reticle for a horizontal FOV (degrees): the inverse projection in aimAngles. */
const reticleYaw = (player, fovDeg) =>
  player.angle + Math.atan(2 * (player.aimOffsetX || 0) * Math.tan((fovDeg * Math.PI) / 360));

/**
 * Drive the ADS blend (FOV, sensitivity, viewmodel). Call once per frame.
 *
 * With `settings`, whatever is under the reticle stays under it through the
 * zoom. The zoom narrows the view about the screen centre, so a free-aim
 * reticle off to the side used to drift off its target as you aimed in — and
 * the view magnified the middle of the screen, not what you were aiming at.
 * Aiming in now also eases the reticle back to centre, turning the view by
 * the same angle, so the sights and the magnified view land on the target.
 * Vertical aim needs neither: the view's rows are magnified about the
 * reticle's own row (magnifyRows in src/rendering/render-pipeline.js).
 */
export function updateAdsFov(player, dt, settings = null) {
  const hold = settings && player && Number.isFinite(player.angle);
  const yaw0 = hold ? reticleYaw(player, effectiveAimFov(player, settings)) : 0;
  const step = Math.min(dt, 0.1) / ADS_TRANSITION;
  _adsProgress = clamp(_adsProgress + (player?.isAiming ? step : -step), 0, 1);
  const t = _adsProgress;
  _adsBlend = t * t * t * (t * (t * 6 - 15) + 10);
  const wep = player?.getWeaponDef?.() ?? null;
  const zoom = adsZoomOf(wep);
  if (_adsBlend === 0) [_adsZoom, _adsZoomVel] = [zoom, 0];
  else [_adsZoom, _adsZoomVel] = smoothDamp(_adsZoom, zoom, _adsZoomVel, 0.12, Math.min(dt, 0.1));
  _adsSens = wep?.adsSens ?? PLAYER_ADS_SENS;
  if (player) scopeBreath(player, wep, dt);
  if (!hold) return;
  if (player.isAiming && player.aimOffsetX) {
    player.aimOffsetX *= 1 - Math.min(1, ADS_CENTER_RATE * Math.min(dt, 0.1));
    if (Math.abs(player.aimOffsetX) < 1e-4) player.aimOffsetX = 0;
  }
  player.angle += yaw0 - reticleYaw(player, effectiveAimFov(player, settings));
}

/** Reticle drift (fraction of the view) through a scope: moving, and held still for long. */
const BREATH_MOVING = 0.01;
const BREATH_STILL = 0.0015;
/** Seconds held still before the breath is fully settled. */
const BREATH_SETTLE = 1.2;

/**
 * A scope breathes: the reticle wanders on a slow figure-eight, wide while
 * you move and settling to a tremor once you have held still for a moment.
 * It moves the aim itself (the round goes where the drifting reticle is), and
 * is added as a change each frame so it never fights the mouse.
 */
function scopeBreath(player, wep, dt) {
  const d = Math.min(dt, 0.1);
  const moved = _lastPos && Math.hypot(player.x - _lastPos.x, player.y - _lastPos.y) > 0.4 * d;
  _lastPos = { x: player.x, y: player.y };
  _steady = moved || player.isSprinting ? 0 : _steady + d;
  _breathT += d;
  const settle = Math.min(1, _steady / BREATH_SETTLE);
  const amp = wep?.scope ? _adsBlend * (BREATH_MOVING + (BREATH_STILL - BREATH_MOVING) * settle) : 0;
  const bx = amp * Math.sin(_breathT * 0.9);
  const by = amp * 0.7 * Math.sin(_breathT * 1.8 + 0.6);
  if (Number.isFinite(player.aimOffsetX)) player.aimOffsetX += bx - _breathX;
  if (Number.isFinite(player.aimOffsetY)) player.aimOffsetY += by - _breathY;
  _breathX = bx;
  _breathY = by;
}

/** How settled a scope's breath is, 0 (moving) … 1 (held still). */
export const scopeSteadiness = () => Math.min(1, _steady / BREATH_SETTLE);

/** Drive the smooth sprint/dash/slide FOV boost. Call once per frame. */
export function updateSprintFov(player, dt) {
  // Sprint/dash/slide widen the view; a crouch pulls it in a little, which
  // reads as hunkering down rather than rushing.
  _sprintFovTarget = player.isDashing
    ? 12
    : player.isSliding
      ? 10
      : player.isSprinting
        ? 8
        : -4 * (player.crouchBlend || 0);
  [_sprintFovLerp, _sprintFovVel] = smoothDamp(_sprintFovLerp, _sprintFovTarget, _sprintFovVel, SPRINT_FOV_SMOOTH_TIME, Math.min(dt, 0.1));
}

/** Snap the ADS blend back to hip-fire (call on death/respawn). */
export function resetAdsFov() {
  _adsProgress = 0;
  _adsBlend = 0;
  _breathX = _breathY = 0;
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
  const h = game.canvas?.height || 1;
  return aimAngles(game.player, fov, {
    h,
    barH: currentBarH(game),
    yShift: game.world ? 0 : sceneShiftPx(game.player, h),
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

