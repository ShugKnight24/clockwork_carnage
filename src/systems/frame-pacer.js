/**
 * Frame pacing for the main requestAnimationFrame loop.
 *
 * The loop updates on every animation frame but renders at most `cap` times a
 * second. Deciding that with a bare `now - lastRender >= 1000 / cap` drops a
 * render whenever vsync jitter lands a fraction of a millisecond early, which
 * halves the visible rate: a 60 fps cap on a 60 Hz panel renders at 30, and on
 * a 120 Hz panel at 40. The pacer keeps a running render deadline and allows
 * half a display period of slack, so a capped rate lands on the cap.
 *
 * It also reports the measured display rate, which adaptive quality needs: a
 * deliberate 30 fps cap must not read as a machine that cannot keep up.
 */

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Frame target options, indexed by `settings.frameTarget`. 0 = uncapped. */
export const FRAME_TARGETS = [0, 30, 60, 90, 120];

/** Frames per second the loop should render at, given the player's settings. */
export function frameCapFor(settings) {
  if (settings?.batterySaver) return 30;
  return FRAME_TARGETS[settings?.frameTarget] || 0;
}

/**
 * FPS that adaptive quality should aim for under a given cap.
 * Uncapped keeps the historical 55 fps target. Capped aims just under whatever
 * the cap and the panel can actually deliver, and never asks for more than the
 * uncapped target — so turning a cap on cannot start a render-scale spiral.
 */
export function qualityTargetFPS(cap, displayHz) {
  if (!cap) return 55;
  const achievable = displayHz > 0 ? Math.min(cap, displayHz) : cap;
  return clamp(achievable - 5, 20, 55);
}

export class FramePacer {
  constructor() {
    this.reset();
  }

  /** Forget timing history. Call after a stall (tab hidden, level load). */
  reset() {
    this.lastFrame = 0;
    this.period = 0;
    this.deadline = 0;
  }

  /** Measured display refresh in Hz, or 0 before enough frames have run. */
  get displayHz() {
    return this.period > 0 ? 1000 / this.period : 0;
  }

  /**
   * Call once per animation frame, in order. Returns true when this frame
   * should render.
   * @param {number} now rAF timestamp, ms
   * @param {number} cap frames per second, 0 for uncapped
   */
  shouldRender(now, cap) {
    const delta = now - this.lastFrame;
    // Ignore the first frame and any backwards clock, then smooth the rest so
    // one long frame does not skew the display estimate.
    if (this.lastFrame > 0 && delta > 0 && delta < 100) {
      this.period = this.period > 0 ? this.period * 0.9 + delta * 0.1 : delta;
    }
    this.lastFrame = now;

    if (!cap) return true;

    const interval = 1000 / cap;
    if (this.deadline === 0) {
      this.deadline = now + interval;
      return true;
    }

    const slack = Math.min(this.period * 0.5, interval * 0.5) || 0.5;
    if (now < this.deadline - slack) return false;

    this.deadline += interval;
    // After a long stall, land on the next interval instead of burst-rendering
    // to catch up on deadlines that are already in the past.
    if (this.deadline <= now) this.deadline = now + interval;
    return true;
  }
}
