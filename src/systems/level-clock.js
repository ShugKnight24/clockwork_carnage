/**
 * The level clock. The HUD timer, the debrief's time against par and the
 * stats card all read `performance.now() - game.roundStartTime`; the clock
 * stops while anything holds it (a pause, the player down and the game-over
 * screen after) by sliding its start forward while held, so every reader
 * sees a frozen time without knowing about holds.
 */
export class LevelClock {
  constructor(now = () => performance.now()) {
    this.now = now;
    this._start = 0;
    this._stoppedAt = 0;
    this._holds = new Set();
  }

  /** The start a reader subtracts from now: frozen while held. 0 is no clock. */
  get start() {
    if (!this._start || !this._stoppedAt) return this._start;
    return this._start + (this.now() - this._stoppedAt);
  }

  /** A fresh clock (a level, a round, a retry) runs, whatever held the last. */
  set start(v) {
    this._start = v;
    this._stoppedAt = 0;
    this._holds.clear();
  }

  /** Hold the clock for `reason` ("pause", "dead"), or let that reason go. */
  hold(reason, on = true) {
    const was = this._holds.size > 0;
    if (on) this._holds.add(reason);
    else this._holds.delete(reason);
    const is = this._holds.size > 0;
    if (!was && is) this._stoppedAt = this.now();
    else if (was && !is) {
      this._start += this.now() - this._stoppedAt;
      this._stoppedAt = 0;
    }
  }

  get running() {
    return this._holds.size === 0;
  }

  /** Seconds on the clock. */
  seconds() {
    return this._start ? Math.max(0, (this.now() - this.start) / 1000) : 0;
  }
}
