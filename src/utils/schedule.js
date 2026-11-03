/**
 * Idle and next-frame scheduling. WebKit has no requestIdleCallback, so every
 * helper here says what it does without one; sites that need a different
 * stand-in (a deadline that runs out, a pixel read to settle GPU work) keep
 * their own and only use hasIdleCallback.
 */

/** True where the browser has requestIdleCallback. Checked per call, so tests can stub it. */
export const hasIdleCallback = () => typeof requestIdleCallback === "function";

/**
 * Run `cb` when the browser is idle (by `timeout` ms at the latest, if given).
 * Without requestIdleCallback it runs after `fallbackMs` on a timer, or at
 * once when `fallbackMs` is null.
 */
export function idle(cb, { timeout, fallbackMs = 0 } = {}) {
  if (hasIdleCallback()) return requestIdleCallback(cb, timeout === undefined ? undefined : { timeout });
  if (fallbackMs === null) return cb();
  return setTimeout(cb, fallbackMs);
}

/** Resolves on idle time, or after `timeout` ms of none; a macrotask without requestIdleCallback. */
export function whenIdle(timeout) {
  return new Promise((resolve) => idle(() => resolve(), { timeout }));
}

/** Resolves after the next frame has painted (a macrotask when there are no frames). */
export function nextFrame() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => setTimeout(resolve, 0));
    else setTimeout(resolve, 0);
  });
}
