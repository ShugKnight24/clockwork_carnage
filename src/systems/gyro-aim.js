/**
 * Gyro aiming for touch devices: the phone's turn rate (DeviceMotionEvent
 * rotationRate, degrees per second about the device's own axes) mapped onto
 * the screen as it is held, so turning the phone like a camera turns the
 * view. Pure: the listener and the iOS permission prompt live in js/touch.js.
 *
 * Device axes (portrait): x right, y up, z out of the screen. The spec has
 * beta turn about x and gamma about y; iPhone browsers (WebKit) report
 * rotationRate as alpha about x and beta about y instead, so read as the
 * spec says a tilt came through as a turn. Held in landscape, the screen's
 * vertical is the device's x axis and its horizontal the y axis, signed by
 * which way it was turned (screen.orientation.angle 90 or 270).
 */

/** gyroAim setting values. */
export const GYRO_OFF = 0;
export const GYRO_WHILE_AIMING = 1;
export const GYRO_ALWAYS = 2;

/** A gap between motion events longer than this (s) is a stall, not a turn. */
const MAX_STEP = 0.05;

const DEG = Math.PI / 180;

/**
 * Radians to turn the view for one motion sample.
 * @param {{ alpha?: number|null, beta?: number|null, gamma?: number|null }} rate - deg/s
 * @param {number} angle - screen.orientation.angle: 0, 90, 180 or 270
 * @param {number} dt - seconds since the last sample
 * @param {boolean} [webkit] - rates in WebKit's order (alpha about x, beta about y)
 * @returns {{ yaw: number, pitch: number }} yaw positive turns right, pitch positive looks up
 */
export function gyroLookDelta(rate, angle, dt, webkit = false) {
  const step = Math.min(Math.max(dt, 0), MAX_STEP);
  // Turn rates about the device's x and y axes.
  const beta = ((webkit ? rate?.alpha : rate?.beta) || 0) * DEG * step;
  const gamma = ((webkit ? rate?.beta : rate?.gamma) || 0) * DEG * step;
  switch (((angle % 360) + 360) % 360) {
    case 90:
      return { yaw: -beta, pitch: -gamma };
    case 270:
      return { yaw: beta, pitch: gamma };
    case 180:
      return { yaw: gamma, pitch: -beta };
    default:
      return { yaw: -gamma, pitch: beta };
  }
}

/**
 * Whether this browser reports rotationRate in WebKit's order: every iPhone
 * and iPad browser is WebKit, and only WebKit asks permission for motion.
 */
export function webkitRotationOrder() {
  return typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function";
}

/** Whether gyro aim drives the view right now. */
export function gyroActive(mode, aiming) {
  return mode === GYRO_ALWAYS || (mode === GYRO_WHILE_AIMING && !!aiming);
}
