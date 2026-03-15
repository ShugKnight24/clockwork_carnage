/**
 * StateManager — single source of truth for game state transitions.
 *
 * Extracted from game.js.  The Game class wires this via a getter/setter on
 * `this.state` so all existing reads/writes continue to work without a mass
 * rename, while this module adds the missing structure:
 *
 *   • One controlled entry-point per transition type
 *   • pause() / resume() that always preserve the "paused from" state
 *   • onChange hook so main.js can react to transitions without polling
 *   • isIn() / wasIn() helpers for common pattern-matching
 *
 * Usage:
 *   const sm = new StateManager('title');
 *   sm.onChange((next, prev) => console.log(prev, '→', next));
 *
 *   sm.transition('playing');          // direct transition
 *   sm.pause('playing');               // saves "from", goes to 'paused'
 *   sm.resume();                       // returns to saved "from"
 */
export class StateManager {
  /**
   * @param {string} initial - starting state string (e.g. GameState.TITLE)
   */
  constructor(initial) {
    this._state = initial;
    this._prev = null;
    this._pausedFrom = null;
    this._onChange = null;
  }

  // ─── Getters ───────────────────────────────────────────────────

  /** Current state string */
  get current() {
    return this._state;
  }

  /** Previous state before the last transition */
  get previous() {
    return this._prev;
  }

  /**
   * The state that was active when pause() was called.
   * Use this to decide where to return after resuming.
   */
  get pausedFrom() {
    return this._pausedFrom;
  }

  // ─── Transitions ───────────────────────────────────────────────

  /**
   * Transition to a new state.  No-ops if already in that state.
   * Notifies the onChange listener.
   * @param {string} to
   */
  transition(to) {
    if (this._state === to) return;
    this._prev = this._state;
    this._state = to;
    if (this._onChange) this._onChange(to, this._prev);
  }

  /**
   * Suspend gameplay: saves `from` (or the current state) as the return point
   * and transitions to 'paused'.  Always call this instead of
   * `transition('paused')` directly so resume() knows where to go back.
   *
   * @param {string} [from] - override the "pause from" state; defaults to current
   */
  pause(from) {
    this._pausedFrom = from ?? this._state;
    this.transition("paused");
  }

  /**
   * Resume gameplay: transitions back to the state saved by pause().
   * Falls back to 'playing' if pause() was never called (defensive).
   */
  resume() {
    const returnTo = this._pausedFrom ?? "playing";
    this._pausedFrom = null;
    this.transition(returnTo);
  }

  // ─── Helpers ───────────────────────────────────────────────────

  /**
   * Returns true when the current state matches any of the provided values.
   * @param {...string} states
   * @returns {boolean}
   */
  isIn(...states) {
    return states.includes(this._state);
  }

  /**
   * Returns true when the previous state matches any of the provided values.
   * Useful for "just left X" guards.
   * @param {...string} states
   * @returns {boolean}
   */
  wasIn(...states) {
    return states.includes(this._prev);
  }

  // ─── Listener ──────────────────────────────────────────────────

  /**
   * Register a callback invoked after every transition (including pause/resume).
   * Only one listener is supported — call this once during Game init.
   * @param {(next: string, prev: string) => void} fn
   */
  onChange(fn) {
    this._onChange = fn;
  }
}
