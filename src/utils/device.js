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

/**
 * Keep a phone's page at 1:1. iPhone browsers ignore user-scalable=no, so a
 * pinch or a double-tap on the title zoomed the whole game in; Chrome then
 * kept that zoom for the site, and the game laid itself out for a 459x208
 * screen. Pinches are refused, and a zoom that gets in anyway (a double-tap
 * on an element without touch-action) is put back by restating the viewport.
 */
export function lockPageZoom() {
  if (typeof document === "undefined") return;
  const stop = (e) => e.preventDefault();
  // WebKit's own pinch events: the only way to refuse a pinch on iOS.
  for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
    document.addEventListener(type, stop, { passive: false });
  }
  const meta = document.querySelector('meta[name="viewport"]');
  const vv = window.visualViewport;
  if (!meta || !vv) return;
  const content = meta.getAttribute("content");
  const unzoom = () => {
    if (vv.scale <= 1.01) return;
    // Restating the viewport (briefly with a different maximum) makes
    // WebKit snap back to its initial scale.
    meta.setAttribute("content", `${content}, maximum-scale=1.0001`);
    requestAnimationFrame(() => meta.setAttribute("content", content));
  };
  vv.addEventListener("resize", unzoom);
  unzoom();
}
