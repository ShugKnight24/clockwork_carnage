/**
 * aim.js — Reticle / camera aim math.
 *
 * Single source of truth: the reticle is drawn at one screen pixel; bullets
 * trace through that exact pixel. `aimAngles()` and `reticlePoint()` are
 * inverses of each other under the renderer's projection.
 *
 * Renderer projection (see renderer.js _projectWorld), at the hip:
 *   screenX = (w/2) · (1 + tan(Δyaw) / planeMul)        planeMul = tan(fov_h/2)
 *   screenY =  h/2  - tan(pitch) · h                    (signed: pitch up → up)
 * Aimed in, planeMul shrinks by the sights' zoom and heights grow by it about
 * the reticle's row (zoomedShiftPx), which leaves every relation below as is.
 *
 * Reticle screen position:
 *   chx = w/2     + offsetX · w
 *   chy = viewH/2 + offsetY · viewH    where viewH = h − barH
 *
 * Equating yields:
 *   tan(Δyaw)   = 2·offsetX · planeMul
 *   tan(pitch)  = barH/(2h) − offsetY·(h − barH)/h
 *
 * On grid levels the reticle stays centred (offsets 0) and every look input
 * turns the view instead (centredLook); the offsets stay in the math so the
 * projection keeps one form for the renderer and the fire path.
 */
import {
  PLAYER_ADS_ZOOM,
  PLAYER_ADS_SENS,
  COMPACT_PHONE_HEIGHT,
} from "../constants.js";
import { clamp } from "../utils/math.js";

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
/** How far a peek from cover must be up before the sights start coming up. */
const COVER_ADS_AFTER = 0.75;
/**
 * The sight's magnification and look speed, eased toward the held weapon's
 * (src/data/weapons.js adsZoom / adsSens) so a swap while aimed zooms over
 * rather than jumping.
 */
let _adsZoom = PLAYER_ADS_ZOOM;
let _adsZoomVel = 0;
let _adsSens = PLAYER_ADS_SENS;
/** Scope breath: seconds held still, its clock, and the turn and shift it last added. */
let _steady = 0;
let _breathT = 0;
let _breathYaw = 0;
let _breathY = 0;
let _lastPos = null;
/**
 * Conditioning's Steadiness (src/systems/conditioning.js): divides the time
 * hip bloom takes to close and scales the scope's breath. 1 is untrained.
 */
let _steadyMult = 1;
/**
 * Hip bloom (src/data/weapons.js `bloom`): radians the hip cone has opened
 * from the shots just fired, the id of the gun that fired them (so a gun
 * swapped to mid-spray starts from its own base cone), its `recover` (radians
 * a second) and `delay`, and the seconds since its last shot.
 */
let _bloom = 0;
let _bloomId = -1;
let _bloomRecover = 0;
let _bloomDelay = 0;
let _sinceShot = 0;

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

/**
 * The held weapon's cone (radians, half-angle) at the current blend: hip
 * `spread` plus its bloom, easing to `adsSpread` as the sights come up, so
 * an aimed precision round goes through the reticle however hard the gun
 * was just fired.
 */
export function currentSpread(wep) {
  if (!wep) return 0;
  const hip = (wep.spread || 0) + (wep.id === _bloomId ? _bloom : 0);
  return hip * (1 - _adsBlend) + (wep.adsSpread ?? wep.spread ?? 0) * _adsBlend;
}

/** Set Steadiness's multiplier (1 = none): bloom closes 1/mult as fast once its delay is up, the scope breathes × mult. */
export function setAdsSteadiness(mult) {
  _steadyMult = Number.isFinite(mult) ? Math.max(0, Math.min(1, mult)) : 1;
}

/**
 * A shot fired: open the hip cone by the gun's `bloom.perShot`, up to its
 * `bloom.max`, and hold it for `bloom.delay`. Only a hip shot opens it: the
 * share added falls with the sights, so a fully aimed volley adds none, but
 * any shot holds what is already open.
 */
export function noteShotBloom(wep) {
  const b = wep?.bloom;
  if (!b) return;
  if (wep.id !== _bloomId) [_bloom, _bloomId] = [0, wep.id];
  _bloom = Math.min(b.max, _bloom + b.perShot * (1 - _adsBlend));
  _bloomRecover = b.recover;
  _bloomDelay = b.delay || 0;
  _sinceShot = 0;
}

/**
 * Hold the bloom for the firing gun's `delay` after its last shot, then
 * close it at its `recover` rate (faster with Steadiness). Call once per
 * frame. Only the part of dt past the delay closes it, and a linear close is
 * the same in one step or many, so it runs alike at 144 Hz and through a
 * hitch.
 */
export function updateBloom(dt) {
  if (!(dt > 0)) return;
  const held = Math.max(0, _bloomDelay - _sinceShot);
  _sinceShot += dt;
  if (_bloom <= 0 || dt <= held) return;
  const rate = _bloomRecover / Math.max(0.05, _steadyMult);
  _bloom = Math.max(0, _bloom - rate * (dt - held));
}

/** Radians the hip cone has opened by (0 once recovered). */
export const currentBloom = () => _bloom;

/** Close the bloom at once (a weapon switch, a level load). */
export function resetBloom() {
  _bloom = 0;
  _bloomId = -1;
  _sinceShot = 0;
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

/** How far a slide pitches the view forward (tan of the angle). */
const SLIDE_PITCH = 0.035;

/**
 * Vertical shift (canvas px) the raycaster draws the world with: the slight
 * forward pitch of a slide and the look up and down. render-pipeline.js draws
 * with it and the fire path aims with it, so a shot lands where the reticle
 * sits on the shifted view. The stance itself is not a shift: the renderer
 * draws a crouch or a slide from a lower eye (playerEyeZ in physics.js). A
 * shot's kick (cameraPunch) is not one either: it bumps the whole frame,
 * reticle and all (frameOffset in render-pipeline.js), so it never moves the aim.
 */
export function sceneShiftPx(player, h) {
  // Pitching forward into a slide lifts the horizon a little.
  const lean = (player?.slideBlend || 0) * -h * SLIDE_PITCH;
  // The look up and down (centredLook): the world moves, not the reticle.
  const look = (player?.lookShiftY || 0) * -h;
  return lean + look;
}

/**
 * The scene's vertical shift (canvas px) as the raycaster draws it through
 * sights of magnification `zoom`. Sideways the zoom narrows the FOV; up and
 * down the renderer scales every height by the same factor (its focalY,
 * `h · zoom`) about the reticle's row `ry`. A height `z` at depth `d` is drawn
 * at `h/2 + shift - z · h · zoom / d`, so with this shift a point the hip
 * view draws at row y is drawn at `ry + zoom · (y - ry)`: the reticle's row
 * keeps what it had, and aimAngles (which needs no zoom) still names the
 * point under the reticle.
 */
export function zoomedShiftPx(yShift, ry, h, zoom) {
  return zoom === 1 ? yShift : yShift * zoom + (h / 2 - ry) * (zoom - 1);
}

/** Centred aim's look speed: radians per input unit (a mouse pixel), before the sensitivity settings. */
export const CENTRED_LOOK_RATE = 0.0033;
/** How far centred aim looks up: tan of the angle, ~23°. */
export const CENTRED_LOOK_LIMIT = 0.42;
/**
 * How far it looks down: tan of the angle, ~39°. A landscape phone's view is
 * short, about 26° either side of the horizon, so 23° down still left the
 * floor at your feet, and anything standing on it, below the screen.
 */
export const CENTRED_LOOK_DOWN = 0.8;

/**
 * Centred aim, for mouse, pad and touch alike: the reticle stays in the
 * middle of the view and look input turns the view instead, sideways by
 * turning and up or down by shifting the world under the reticle
 * (player.lookShiftY, a share of the canvas height, which sceneShiftPx draws
 * and aims with). A reticle that wandered inside a box, stopped at its edge
 * and then turned the view at another speed was hard to track on any input.
 *
 * Takes a look delta in input units: mouse pixels, or the pad's and touch's
 * equivalent.
 */
export function centredLook(player, dx, dy, settings = {}) {
  const rate = CENTRED_LOOK_RATE * (settings.sensitivity || 1) * aimSensitivityScale();
  // Aimed in, both ways slow by the zoom: the renderer draws lookShiftY
  // magnified by it (zoomedShiftPx), as the narrower FOV magnifies a turn.
  const zoom = aimZoom();
  player.angle += (dx * rate * (settings.invertX ? -1 : 1)) / zoom;
  const y = (player.lookShiftY || 0) + (dy * rate * (settings.invertY ? -1 : 1)) / zoom;
  player.lookShiftY = clamp(y, -CENTRED_LOOK_LIMIT, CENTRED_LOOK_DOWN);
  player.aimOffsetX = 0;
  player.aimOffsetY = 0;
}

/**
 * Drive the ADS blend (FOV, sensitivity, viewmodel). Call once per frame.
 *
 * The zoom narrows the view about the screen centre, where the reticle is,
 * so whatever is under it stays under it without turning the view; the
 * renderer draws heights magnified by the same factor about the reticle's
 * own row (zoomedShiftPx, renderer focalY). `settings` gives the scope's
 * breath the FOV it turns the view by.
 */
export function updateAdsFov(player, dt, settings = null) {
  const step = Math.min(dt, 0.1) / ADS_TRANSITION;
  // From cover, the sights wait for the pop-out (src/systems/cover-play.js
  // peek): stand up or lean out first, then settle into them. Both at once
  // stacked a rise and a zoom into one lurch.
  const peek = player?.cover?.peek;
  const aiming = !!player?.isAiming && !(peek != null && peek < COVER_ADS_AFTER);
  _adsProgress = clamp(_adsProgress + (aiming ? step : -step), 0, 1);
  const t = _adsProgress;
  _adsBlend = t * t * t * (t * (t * 6 - 15) + 10);
  const wep = player?.getWeaponDef?.() ?? null;
  const zoom = adsZoomOf(wep);
  if (_adsBlend === 0) [_adsZoom, _adsZoomVel] = [zoom, 0];
  else [_adsZoom, _adsZoomVel] = smoothDamp(_adsZoom, zoom, _adsZoomVel, 0.12, Math.min(dt, 0.1));
  _adsSens = wep?.adsSens ?? PLAYER_ADS_SENS;
  if (player) scopeBreath(player, wep, dt, settings);
}

/** Aim drift (fraction of the view) through a scope: moving, and held still for long. */
const BREATH_MOVING = 0.01;
const BREATH_STILL = 0.0015;
/** Seconds held still before the breath is fully settled. */
const BREATH_SETTLE = 1.2;

/**
 * A scope breathes: the view wanders on a slow figure-eight under the
 * centred reticle, wide while you move and settling to a tremor once you
 * have held still for a moment. It moves the aim itself (the round goes
 * where the reticle sits on the drifting view), and is added as a change
 * each frame so it never fights the mouse. The drift is measured as a share
 * of the view, so sideways it turns by the angle that share spans at the
 * current FOV (the yaw term of aimAngles), and up or down it shifts the
 * world by that share divided by the zoom, since the renderer draws
 * lookShiftY magnified by it (zoomedShiftPx).
 */
function scopeBreath(player, wep, dt, settings) {
  const d = Math.min(dt, 0.1);
  const moved = _lastPos && Math.hypot(player.x - _lastPos.x, player.y - _lastPos.y) > 0.4 * d;
  _lastPos = { x: player.x, y: player.y };
  _steady = moved || player.isSprinting ? 0 : _steady + d;
  _breathT += d;
  const settle = Math.min(1, _steady / BREATH_SETTLE);
  const amp = wep?.scope ? _adsBlend * _steadyMult * (BREATH_MOVING + (BREATH_STILL - BREATH_MOVING) * settle) : 0;
  const bx = amp * Math.sin(_breathT * 0.9);
  const by = amp * 0.7 * Math.sin(_breathT * 1.8 + 0.6);
  const yaw = Math.atan(2 * bx * Math.tan((effectiveAimFov(player, settings ?? {}) * Math.PI) / 360));
  if (Number.isFinite(player.angle)) player.angle += yaw - _breathYaw;
  const shift = by / aimZoom();
  if (Number.isFinite(player.lookShiftY)) player.lookShiftY += shift - _breathY;
  _breathYaw = yaw;
  _breathY = shift;
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
  _breathYaw = _breathY = 0;
  // The breath starts over too, so it runs the same however many frames
  // came before.
  _breathT = _steady = 0;
  _lastPos = null;
  resetBloom();
}

/**
 * The HUD bar's height in HUD (CSS) pixels, as `src/ui/hud-state.js` sizes it and
 * places the reticle above it. Inline, so combat code needs no import cycle.
 */
export function hudBarH(game) {
  const hudH = game.hudH || game.canvas?.height || 0;
  const hudFactor = (game.settings?.hudScale || 100) / 100;
  // isCompactPhone (src/ui/layout.js), on the HUD's height, as hud-state.js tests it.
  const compact = game.isTouchDevice && hudH > 0 && hudH < COMPACT_PHONE_HEIGHT;
  if (compact) return Math.round(60 * hudFactor);
  return game.settings?.hudStyle === 1 ? Math.round(160 * hudFactor) : 0;
}

/**
 * The HUD bar's height in scene-canvas pixels, for aimAngles and the
 * renderer. A phone draws the scene at its pixel ratio while the HUD stays
 * in CSS pixels: measured on the scene canvas, a 276 px phone looked 552 px
 * tall, lost its bar, and every shot went 22 px off the reticle.
 */
export function currentBarH(game) {
  const h = game.canvas?.height || 0;
  const hudH = game.hudH || h;
  const bar = hudBarH(game);
  return hudH > 0 && h > 0 ? (bar * h) / hudH : bar;
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

