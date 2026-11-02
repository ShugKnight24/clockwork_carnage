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
const MIN_BUTTON_RADIUS = MIN_TOUCH_TARGET / 2 / HIT_SHRINK;

const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

const floorRadius = (r) => (r < MIN_BUTTON_RADIUS ? MIN_BUTTON_RADIUS : r);

/** The vitals block a landscape phone's HUD draws in its top-left corner (message-lanes topLeft). */
export const PHONE_VITALS_H = 100;

/** Where a landscape phone's vitals start: right of the pause button in the corner. */
export function phoneVitalsLeft(zones, safeLeft) {
  const p = zones?.isCompactPhone ? zones.pauseBtn : null;
  return p ? p.x + p.r + 6 : 10 + safeLeft;
}

/**
 * A landscape phone's minimap side, in px. A short screen (a browser's bars
 * take a third of it) shrinks it with the height, so the right thumb's
 * buttons still fit under it.
 */
export function phoneMinimapSize(minimapSize, w, h) {
  return Math.min(minimapSize, Math.round(w * 0.18), Math.round(h * 0.3));
}

/** Buttons the player aims at. The joystick and the look zone are not in here. */
export const BUTTON_KEYS = [
  "fireBtn",
  "aimBtn",
  "dashBtn",
  "interactBtn",
  "reloadBtn",
  "chronoBtn",
  "crouchBtn",
  "weaponBtn",
  "pauseBtn",
  "fullscreenBtn",
  "rewindBtn",
  "lockBtn",
];

/**
 * @param {{ w: number, h: number, safeArea?: {top:number,right:number,bottom:number,left:number}, minimapSize?: number }} view
 */
export function touchZones({ w, h, safeArea, minimapSize = 200 }) {
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
  // The chrono column: SLOW, and USE offset right of it. LOCK and REWIND
  // join SLOW's row once the campaign grants those powers.
  // A short phone keeps them under the vitals block rather than on it.
  const chronoR = floorRadius(btnSize * 0.6);
  const chronoY = Math.max(h - (isCompactPhone ? 240 : 350) - sa.bottom, isCompactPhone ? PHONE_VITALS_H + sa.top + chronoR + 6 : 0);
  const powerStep = Math.max(MIN_BUTTON_RADIUS * 2.1, btnSize * 1.1);
  // A short phone puts USE on SLOW's row: a step down and right of it, it
  // sat where the left thumb lands for the stick.
  const useY = isCompactPhone ? chronoY : Math.max(h - 290 - sa.bottom, chronoY + MIN_BUTTON_RADIUS * 1.6);
  const useX = leftX + (isCompactPhone ? powerStep : Math.max(btnSize * 0.9, MIN_BUTTON_RADIUS * 1.9));
  const mm = phoneMinimapSize(minimapSize, w, h);
  const pauseR = floorRadius(isCompactPhone ? 22 : 26);
  const pauseX = isCompactPhone ? sa.left + 8 + pauseR : w - 50 - sa.right;

  return {
    w,
    h,
    btnSize,
    isCompactPhone,
    // Hint position for the joystick, shown when no thumb is on the left zone.
    joyCenter: {
      x: Math.max(80, 60 + sa.left),
      y: isCompactPhone ? h - 70 - sa.bottom : h - 140 - sa.bottom,
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
    // CROUCH is under the right thumb: the left one is on the stick, and a
    // slide is CROUCH tapped while the stick runs.
    crouchBtn: {
      x: w - pad - btnSize * 2.9,
      y: h - bottomPad - btnSize * (isCompactPhone ? 2.5 : 3.2),
      r: floorRadius(btnSize * 0.65),
    },
    // RELOAD on the bottom row, inside the weapon button: above DASH it ran
    // into the minimap on a short screen. Sprint has no button: the stick
    // pushed past its rim runs.
    reloadBtn: {
      x: w - pad - btnSize * 3.2 - Math.max(btnSize * 1.15, MIN_BUTTON_RADIUS * 2.1),
      y: h - bottomPad - btnSize * (isCompactPhone ? 1.0 : 1.3),
      r: floorRadius(btnSize * 0.55),
    },
    // Chrono Shift (time slow) — left side, above the stick.
    chronoBtn: {
      x: leftX,
      y: chronoY,
      r: chronoR,
    },
    // USE (doors, people, and a reload when there is nothing to use) is
    // seldom pressed on the move, so it takes the left thumb, right of SLOW.
    interactBtn: {
      x: useX,
      y: useY,
      r: floorRadius(btnSize * 0.45),
    },
    // Kael's Time-Lock and Nova's Rewind: a row out from SLOW, past USE,
    // so a short landscape phone still has room for them.
    lockBtn: {
      x: useX + powerStep,
      y: chronoY,
      r: floorRadius(btnSize * 0.5),
    },
    rewindBtn: {
      x: useX + powerStep * 2,
      y: chronoY,
      r: floorRadius(btnSize * 0.5),
    },
    // Weapon cycle — left of fire, still under the right thumb.
    weaponBtn: {
      x: w - pad - btnSize * 3.2,
      y: h - bottomPad - btnSize * (isCompactPhone ? 1.0 : 1.3),
      r: floorRadius(btnSize * 0.55),
    },
    // A short phone's minimap takes the top-right corner, inside the notch
    // inset. Pause takes the top-left one, and the vitals move right of it:
    // beside the minimap it left the mission card no room on an SE.
    minimap: isCompactPhone ? { x: w - mm - 10 - sa.right, y: 10, s: mm } : null,
    pauseBtn: {
      x: pauseX,
      y: isCompactPhone ? 10 + pauseR : topY,
      r: pauseR,
    },
    // None on a short phone: no room beside pause for it and the mission
    // card both, and the title's fullscreen button carries into the game.
    fullscreenBtn: isCompactPhone ? null : { x: pauseX - MIN_BUTTON_RADIUS * 2.2, y: topY, r: pauseR },
    // Divider: left quarter drives movement, the rest drives look.
    midX: w * 0.28,
  };
}
