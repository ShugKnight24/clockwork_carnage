/**
 * On-screen control layout for touch devices.
 *
 * Pure geometry, no DOM: `touchZones()` takes the viewport and the safe-area
 * insets and returns every button's centre and radius. Keeping it out of
 * TouchControls.resize() means the layout can be checked against real phone
 * sizes in a unit test instead of by eye on one device.
 *
 * Hit tests shrink each button so dragging to look does not trigger it, which
 * makes the *hit* diameter — not the drawn one — the number that has to clear
 * Apple's 44 px minimum. Radii are floored here so it always does.
 */

import { COMPACT_PHONE_HEIGHT } from "../constants.js";

/** Hit radii are this fraction of the drawn radius. */
export const HIT_SHRINK = 0.85;

/** Apple HIG minimum touch target, in CSS px. */
export const MIN_TOUCH_TARGET = 44;

/** Smallest drawn radius whose shrunk hit circle still clears the minimum. */
export const MIN_BUTTON_RADIUS = MIN_TOUCH_TARGET / 2 / HIT_SHRINK;

const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

const floorRadius = (r) => (r < MIN_BUTTON_RADIUS ? MIN_BUTTON_RADIUS : r);

/** Buttons the player aims at. The joystick and the look zone are not in here. */
export const BUTTON_KEYS = [
  "fireBtn",
  "aimBtn",
  "dashBtn",
  "interactBtn",
  "sprintBtn",
  "chronoBtn",
  "crouchBtn",
  "weaponBtn",
  "pauseBtn",
  "fullscreenBtn",
];

/**
 * @param {{ w: number, h: number, safeArea?: {top:number,right:number,bottom:number,left:number} }} view
 */
export function touchZones({ w, h, safeArea }) {
  const sa = safeArea ?? NO_INSETS;

  // Compact phone: landscape phone with a short viewport.
  const isCompactPhone = h < COMPACT_PHONE_HEIGHT;

  // Button sizing base. Derived radii are floored separately, so this only
  // sets how generous the layout is, not whether it is reachable.
  const btnSize = isCompactPhone
    ? Math.max(40, Math.min(46, w * 0.07))
    : Math.max(44, Math.min(56, w * 0.09));
  const pad = (isCompactPhone ? 10 : 14) + sa.right;
  const bottomPad = (isCompactPhone ? 8 : 14) + sa.bottom;

  // Left column sits far enough in that a floored radius still clears the
  // screen edge and the left safe-area inset.
  const leftX = Math.max(60, 42 + sa.left, MIN_BUTTON_RADIUS + 8 + sa.left);
  const topY = (isCompactPhone ? 28 : 40) + sa.top + MIN_BUTTON_RADIUS * 0.2;

  return {
    w,
    h,
    btnSize,
    isCompactPhone,
    // Hint position for the joystick, shown when no thumb is on the left zone.
    joyCenter: {
      x: Math.max(80, 60 + sa.left),
      y: isCompactPhone ? h - 90 - sa.bottom : h - 140 - sa.bottom,
    },
    // Right side — fire is large and central to the thumb, the rest ring it.
    fireBtn: {
      x: w - pad - btnSize * 1.6,
      y: h - bottomPad - btnSize * (isCompactPhone ? 1.0 : 1.3),
      r: floorRadius(btnSize),
    },
    // AIM sits a full button clear of DASH: once the small radii are floored
    // up to the minimum target, the old 0.15-0.25 button gap made the two
    // circles overlap on every phone size.
    aimBtn: {
      x: w - pad - btnSize * 1.6,
      y: h - bottomPad - btnSize * (isCompactPhone ? 3.2 : 3.9),
      r: floorRadius(btnSize * 0.55),
    },
    dashBtn: {
      x: w - pad - btnSize * 0.5,
      y: h - bottomPad - btnSize * (isCompactPhone ? 2.5 : 3.2),
      r: floorRadius(btnSize * 0.65),
    },
    interactBtn: {
      x: w - pad - btnSize * 2.9,
      y: h - bottomPad - btnSize * (isCompactPhone ? 2.5 : 3.2),
      r: floorRadius(btnSize * 0.65),
    },
    // Sprint toggle — left side, above the joystick.
    sprintBtn: {
      x: leftX,
      y: h - (isCompactPhone ? 170 : 260) - sa.bottom,
      r: floorRadius(btnSize * 0.55),
    },
    // Chrono Shift (time slow) — left side, above sprint.
    chronoBtn: {
      x: leftX,
      y: h - (isCompactPhone ? 240 : 350) - sa.bottom,
      r: floorRadius(btnSize * 0.6),
    },
    // Crouch — offset right of the sprint/chrono column so the floored radii
    // of all three still clear one another.
    crouchBtn: {
      x: leftX + Math.max(btnSize * 0.9, MIN_BUTTON_RADIUS * 1.9),
      y: h - (isCompactPhone ? 200 : 290) - sa.bottom,
      r: floorRadius(btnSize * 0.45),
    },
    // Weapon cycle — left of fire, still under the right thumb.
    weaponBtn: {
      x: w - pad - btnSize * 3.2,
      y: h - bottomPad - btnSize * (isCompactPhone ? 1.0 : 1.3),
      r: floorRadius(btnSize * 0.55),
    },
    pauseBtn: {
      x: w - 50 - sa.right,
      y: topY,
      r: floorRadius(isCompactPhone ? 22 : 26),
    },
    fullscreenBtn: {
      x: w - 50 - sa.right - MIN_BUTTON_RADIUS * 2.2,
      y: topY,
      r: floorRadius(isCompactPhone ? 22 : 26),
    },
    // Divider: left quarter drives movement, the rest drives look.
    midX: w * 0.28,
  };
}
