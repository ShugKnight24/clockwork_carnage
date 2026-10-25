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
 * Aims just under whatever the cap and the panel can actually deliver, and
 * never asks for more than 55 fps — so a cap, or a panel under 60 Hz, cannot
 * start a render-scale spiral. Uncapped on an unmeasured panel keeps 55.
 */
export function qualityTargetFPS(cap, displayHz) {
  const achievable = cap ? (displayHz > 0 ? Math.min(cap, displayHz) : cap) : displayHz;
  if (!achievable) return 55;
  return clamp(achievable - 5, 20, 55);
}

export class FramePacer {
  constructor() {
    // The panel's refresh outlives a level load or a hidden tab, so the
    // learned floor is kept across reset().
    this.floor = 0;
    this.reset();
  }

  /** Forget timing history. Call after a stall (tab hidden, level load). */
  reset() {
    this.lastFrame = 0;
    this.period = 0;
    this.deadline = 0;
  }

  /**
   * Measured display refresh in Hz, or 0 before enough frames have run.
   * Frames can never come faster than the panel refreshes, so the refresh is
   * the floor of the frame interval, not its average: a GPU-bound game at
   * 20 fps must not read as a 20 Hz panel, or adaptive quality would aim for
   * 20 fps and never scale down. The floor is the fastest recent interval,
   * creeping up very slowly so a move to a slower panel is eventually seen.
   */
  get displayHz() {
    return this.floor > 0 ? 1000 / this.floor : 0;
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
      // Ignore sub-4 ms deltas (two callbacks in one vsync).
      if (delta >= 4) this.floor = this.floor > 0 ? Math.min(this.floor * 1.0001, delta) : delta;
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
