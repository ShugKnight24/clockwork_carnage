/**
 * Return true when the device's primary pointer is touch-like.
 *
 * Why this exists:
 * - `"ontouchstart" in window` is true on many hybrid laptops/desktops.
 * - Those devices should still run desktop input + pointer lock.
 */
export function isPrimaryTouchDevice() {
  if (typeof window === "undefined") return false;
  const hasTouch =
    (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) ||
    "ontouchstart" in window;
  const coarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  return hasTouch && coarse;
}
