/**
 * InputManager — owns keyboard/mouse state and event wiring.
 *
 * Responsibilities:
 *  - Maintain `keys` (held-key map), `mouse` (delta + lock state), `keybinds`
 *  - Register/unregister DOM event listeners
 *  - Double-tap dash detection
 *  - Keybind load/save (localStorage)
 *  - Pointer lock helpers
 *
 * The game's state-machine key handling (`handleKeyPress`) stays in Game
 * because it depends on every game state — but it reads input data
 * exclusively through this manager.
 */

import {
  STORAGE_KEY_KEYBINDS,
  DOUBLE_TAP_WINDOW_MS,
} from "../src/constants.js";

/**
 * Default keybind mappings for game actions.
 * Maps action names to KeyboardEvent.code values.
 */
export const DEFAULT_KEYBINDS = {
  moveForward: "KeyW",
  moveBack: "KeyS",
  moveLeft: "KeyA",
  moveRight: "KeyD",
  sprint: "ShiftLeft",
  interact: "KeyE",
  pause: "Escape",
  weapon1: "Digit1",
  weapon2: "Digit2",
  weapon3: "Digit3",
  weapon4: "Digit4",
  weapon5: "Digit5",
  weapon6: "Digit6",
  weapon7: "Digit7",
  weapon8: "Digit8",
  toggleFPS: "KeyF",
  chronoShift: "KeyQ",
  crouch: "ControlLeft",
};

/**
 * InputManager handles all keyboard and mouse input for the game.
 * Manages keybinds, pointer lock, and double-tap dash detection.
 */
export class InputManager {
  /**
   * @param {object} opts
   * @param {HTMLElement}  opts.canvas          - Game canvas element
   * @param {Function}     opts.onKeyDown       - (code, event) => void
   * @param {Function}     opts.onKeyUp         - (code) => void
   * @param {Function}     opts.onDashTrigger   - (code) => void   (double-tap)
   * @param {Function}     opts.onMouseDown     - (event) => void
   * @param {Function}     opts.onMouseUp       - (event) => void
   * @param {Function}     opts.onWheel         - (deltaY: number) => void
   * @param {Function}     opts.onLockChange    - (isLocked: boolean) => void
   * @param {Function}     opts.getState        - () => current GameState string
   * @param {string}       opts.playingState    - GameState.PLAYING value
   */
  constructor({
    canvas,
    onKeyDown = () => {},
    onKeyUp = () => {},
    onDashTrigger = () => {},
    onMouseDown = () => {},
    onMouseUp = () => {},
    onWheel = () => {},
    onLockChange = () => {},
    getState = () => null,
    playingState = "PLAYING",
  } = {}) {
    this.canvas = canvas;

    /** Live held-key map: { [code]: boolean } */
    this.keys = {};

    /** Mouse delta accumulated each frame, consumed by the camera update */
    this.mouse = { dx: 0, dy: 0, locked: false };

    /** Keybind action → KeyboardEvent.code mapping */
    this.keybinds = { ...DEFAULT_KEYBINDS };

    // Callbacks
    this._onKeyDown = onKeyDown;
    this._onKeyUp = onKeyUp;
    this._onDashTrigger = onDashTrigger;
    this._onMouseDown = onMouseDown;
    this._onMouseUp = onMouseUp;
    this._onWheel = onWheel;
    this._onLockChange = onLockChange;
    this._getState = getState;
    this._playingState = playingState;

    // Double-tap dash state
    this._lastTapKey = null;
    this._lastTapTime = 0;

    this._bound = {}; // holds bound handler refs for later removeEventListener
    this._register();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Load saved keybinds from localStorage.
   * Should be called after constructing the InputManager.
   */
  loadKeybinds() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_KEYBINDS);
      if (!raw) return;
      const saved = JSON.parse(raw);
      for (const action of Object.keys(this.keybinds)) {
        if (
          Object.prototype.hasOwnProperty.call(saved, action) &&
          typeof saved[action] === "string"
        ) {
          this.keybinds[action] = saved[action];
        }
      }
    } catch (_) {}
  }

  /**
   * Persist current keybinds to localStorage.
   */
  saveKeybinds() {
    try {
      localStorage.setItem(STORAGE_KEY_KEYBINDS, JSON.stringify(this.keybinds));
    } catch (_) {}
  }

  /**
   * Reset a single keybind, swapping with any action that currently uses the
   * new code (to avoid duplicates), and saving.
   *
   * @param {string} action   - keybind action name
   * @param {string} newCode  - KeyboardEvent.code
   * @returns {{ swappedAction: string|null }}
   */
  rebind(action, newCode) {
    const oldCode = this.keybinds[action];
    let swappedAction = null;
    for (const a of Object.keys(this.keybinds)) {
      if (a !== action && this.keybinds[a] === newCode) {
        this.keybinds[a] = oldCode;
        swappedAction = a;
        break;
      }
    }
    this.keybinds[action] = newCode;
    this.saveKeybinds();
    return { swappedAction };
  }

  /**
   * Consume and zero out accumulated mouse deltas.
   * Should be called once per frame.
   * @returns {{dx: number, dy: number}} Mouse movement delta
   */
  consumeMouseDelta() {
    const { dx, dy } = this.mouse;
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    return { dx, dy };
  }

  /**
   * Request pointer lock on the canvas.
   * Hides cursor and captures mouse movement.
   */
  lockPointer() {
    this.canvas.requestPointerLock();
  }

  /**
   * Release pointer lock.
   * Shows cursor and stops capturing mouse movement.
   */
  unlockPointer() {
    document.exitPointerLock();
  }

  /**
   * Remove all event listeners and clean up.
   * Should be called when disposing of the InputManager.
   */
  destroy() {
    document.removeEventListener("keydown", this._bound.keydown);
    document.removeEventListener("keyup", this._bound.keyup);
    document.removeEventListener("mousemove", this._bound.mousemove);
    document.removeEventListener("pointerlockchange", this._bound.lockchange);
    this.canvas.removeEventListener("contextmenu", this._bound.contextmenu);
    this.canvas.removeEventListener("mousedown", this._bound.mousedown);
    this.canvas.removeEventListener("mouseup", this._bound.mouseup);
    this.canvas.removeEventListener("wheel", this._bound.wheel);
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  _register() {
    const b = this._bound;

    b.keydown = (e) => this._handleKeyDown(e);
    b.keyup   = (e) => { this.keys[e.code] = false; this._onKeyUp(e.code); };
    b.mousemove = (e) => {
      if (this.mouse.locked) {
        this.mouse.dx += e.movementX;
        this.mouse.dy += e.movementY;
      }
    };
    b.contextmenu = (e) => e.preventDefault();
    b.mousedown = (e) => this._onMouseDown(e);
    b.mouseup   = (e) => this._onMouseUp(e);
    b.wheel     = (e) => { e.preventDefault(); this._onWheel(e.deltaY); };
    b.lockchange = () => {
      const locked = document.pointerLockElement === this.canvas;
      const prev = this.mouse.locked;
      this.mouse.locked = locked;
      this._onLockChange(locked, prev);
    };

    document.addEventListener("keydown",          b.keydown);
    document.addEventListener("keyup",            b.keyup);
    document.addEventListener("mousemove",        b.mousemove);
    document.addEventListener("pointerlockchange", b.lockchange);
    this.canvas.addEventListener("contextmenu",   b.contextmenu);
    this.canvas.addEventListener("mousedown",     b.mousedown);
    this.canvas.addEventListener("mouseup",       b.mouseup);
    this.canvas.addEventListener("wheel",         b.wheel, { passive: false });
  }

  _handleKeyDown(e) {
    // Double-tap dash (only when in PLAYING state, no key repeat)
    if (!e.repeat && this._getState() === this._playingState) {
      const dashKeys = [
        this.keybinds.moveForward,
        this.keybinds.moveLeft,
        this.keybinds.moveBack,
        this.keybinds.moveRight,
      ];
      if (dashKeys.includes(e.code)) {
        const now = performance.now();
        if (this._lastTapKey === e.code && now - this._lastTapTime < DOUBLE_TAP_WINDOW_MS) {
          this._onDashTrigger(e.code);
          this._lastTapKey = null;
        } else {
          this._lastTapKey = e.code;
          this._lastTapTime = now;
        }
      }
    }

    this.keys[e.code] = true;
    this._onKeyDown(e.code, e);
  }
}
