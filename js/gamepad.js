/**
 * CLOCKWORK CARNAGE — Gamepad Manager
 * ════════════════════════════════════
 * Browser Gamepad API integration for Xbox, PS5 (DualSense),
 * Switch Pro, and generic USB/Bluetooth controllers.
 *
 * Usage:
 *   import { GamepadManager } from './gamepad.js';
 *   const gp = new GamepadManager();
 *   // In game loop:
 *   const input = gp.poll();
 *   // input.moveX, input.moveY, input.lookX, input.lookY, input.shoot, etc.
 */

// ── Standard Gamepad Button Mapping (W3C "standard" layout) ─────
// Works for Xbox, PS5, Switch Pro, and most modern controllers.
const BTN = {
  A: 0,            // Xbox A / PS ✕ / Switch B
  B: 1,            // Xbox B / PS ○ / Switch A
  X: 2,            // Xbox X / PS □ / Switch Y
  Y: 3,            // Xbox Y / PS △ / Switch X
  LB: 4,           // Left Bumper / L1
  RB: 5,           // Right Bumper / R1
  LT: 6,           // Left Trigger / L2
  RT: 7,           // Right Trigger / R2
  SELECT: 8,       // Back / Share / Minus
  START: 9,        // Start / Options / Plus
  L3: 10,          // Left Stick Press
  R3: 11,          // Right Stick Press
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
  HOME: 16,        // Xbox button / PS button / Home
};

// ── Axis Indices ────────────────────────────────────────────────
const AXIS = {
  LEFT_X: 0,       // Left stick horizontal (-1 left, +1 right)
  LEFT_Y: 1,       // Left stick vertical (-1 up, +1 down)
  RIGHT_X: 2,      // Right stick horizontal
  RIGHT_Y: 3,      // Right stick vertical
};

// ── Default Settings ────────────────────────────────────────────
const DEFAULTS = {
  enabled: true,
  deadzone: 0.15,
  lookSensitivity: 2.5,
  moveSensitivity: 1.0,
  vibrationEnabled: true,
  invertLookY: false,
};

export class GamepadManager {
  constructor(settings = {}) {
    this.settings = { ...DEFAULTS, ...settings };

    /** @type {Gamepad|null} */
    this.activeGamepad = null;
    this.activeIndex = -1;

    /** Previous frame button states for edge detection */
    this._prevButtons = new Array(17).fill(false);

    /** Connected controller info for display */
    this.controllerName = '';
    this.controllerType = 'unknown'; // 'xbox', 'playstation', 'switch', 'generic'

    /** Toast callback (set externally) */
    this.onConnect = null;
    this.onDisconnect = null;

    // Listen for connect/disconnect events
    this._onConnected = this._handleConnect.bind(this);
    this._onDisconnected = this._handleDisconnect.bind(this);
    window.addEventListener('gamepadconnected', this._onConnected);
    window.addEventListener('gamepaddisconnected', this._onDisconnected);

    // Check if a gamepad is already connected
    this._scanForGamepad();
  }

  // ── Connection Management ──────────────────────────────────────

  _handleConnect(e) {
    const gp = e.gamepad;
    if (this.activeIndex === -1) {
      this.activeIndex = gp.index;
      this.controllerName = gp.id;
      this.controllerType = this._detectType(gp.id);
      console.log(`[Gamepad] Connected: ${gp.id} (${this.controllerType})`);
      if (this.onConnect) this.onConnect(this.controllerName, this.controllerType);
    }
  }

  _handleDisconnect(e) {
    if (e.gamepad.index === this.activeIndex) {
      console.log(`[Gamepad] Disconnected: ${this.controllerName}`);
      if (this.onDisconnect) this.onDisconnect(this.controllerName);
      this.activeIndex = -1;
      this.activeGamepad = null;
      this.controllerName = '';
      this.controllerType = 'unknown';
      this._prevButtons.fill(false);

      // Try to find another connected gamepad
      this._scanForGamepad();
    }
  }

  _scanForGamepad() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gamepads) {
      if (gp && gp.connected) {
        this.activeIndex = gp.index;
        this.controllerName = gp.id;
        this.controllerType = this._detectType(gp.id);
        return;
      }
    }
  }

  _detectType(id) {
    const lower = id.toLowerCase();
    if (lower.includes('xbox') || lower.includes('xinput') || lower.includes('microsoft'))
      return 'xbox';
    if (lower.includes('dualsense') || lower.includes('dualshock') ||
        lower.includes('sony') || lower.includes('playstation') || lower.includes('054c'))
      return 'playstation';
    if (lower.includes('pro controller') || lower.includes('057e') || lower.includes('nintendo'))
      return 'switch';
    return 'generic';
  }

  /** Is a controller currently connected? */
  get connected() {
    return this.activeIndex >= 0;
  }

  // ── Per-Frame Polling ──────────────────────────────────────────

  /**
   * Poll the active gamepad and return a normalized input state.
   * Call this once per frame from the game loop.
   *
   * @returns {GamepadInput} Normalized input object
   */
  poll() {
    const result = {
      // Analog sticks (after deadzone)
      moveX: 0,        // -1 (left) to +1 (right) — left stick
      moveY: 0,        // -1 (up) to +1 (down) — left stick
      lookX: 0,        // -1 (left) to +1 (right) — right stick
      lookY: 0,        // -1 (up) to +1 (down) — right stick

      // Face buttons (current frame state)
      shoot: false,     // RT (right trigger)
      aim: false,       // LT (left trigger)
      interact: false,  // A / ✕
      dash: false,      // B / ○
      reload: false,    // X / □
      chronoShift: false, // Y / △
      sprint: false,    // L3 (left stick click)

      // Shoulder buttons
      weaponNext: false, // RB
      weaponPrev: false, // LB

      // Menu
      pause: false,     // Start
      minimap: false,   // Select

      // D-pad (for menu navigation + weapon select)
      dpadUp: false,
      dpadDown: false,
      dpadLeft: false,
      dpadRight: false,

      // Edge-detected (true only on the frame the button is first pressed)
      justPressed: {
        interact: false,
        dash: false,
        reload: false,
        chronoShift: false,
        pause: false,
        minimap: false,
        weaponNext: false,
        weaponPrev: false,
        dpadUp: false,
        dpadDown: false,
        dpadLeft: false,
        dpadRight: false,
      },

      // Meta
      connected: false,
      controllerType: 'unknown',
    };

    if (!this.settings.enabled || this.activeIndex < 0) return result;

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[this.activeIndex];
    if (!gp || !gp.connected) return result;

    this.activeGamepad = gp;
    result.connected = true;
    result.controllerType = this.controllerType;

    // ── Sticks ──
    result.moveX = this._applyDeadzone(gp.axes[AXIS.LEFT_X] || 0) * this.settings.moveSensitivity;
    result.moveY = this._applyDeadzone(gp.axes[AXIS.LEFT_Y] || 0) * this.settings.moveSensitivity;
    result.lookX = this._applyDeadzone(gp.axes[AXIS.RIGHT_X] || 0) * this.settings.lookSensitivity;
    result.lookY = this._applyDeadzone(gp.axes[AXIS.RIGHT_Y] || 0) * this.settings.lookSensitivity;

    if (this.settings.invertLookY) result.lookY *= -1;

    // ── Triggers (analog, 0 to 1 — treat as button if > 0.1) ──
    const ltValue = gp.buttons[BTN.LT] ? (typeof gp.buttons[BTN.LT].value === 'number' ? gp.buttons[BTN.LT].value : (gp.buttons[BTN.LT].pressed ? 1 : 0)) : 0;
    const rtValue = gp.buttons[BTN.RT] ? (typeof gp.buttons[BTN.RT].value === 'number' ? gp.buttons[BTN.RT].value : (gp.buttons[BTN.RT].pressed ? 1 : 0)) : 0;

    result.shoot = rtValue > 0.1;
    result.aim = ltValue > 0.1;

    // ── Face buttons ──
    result.interact = this._btn(gp, BTN.A);
    result.dash = this._btn(gp, BTN.B);
    result.reload = this._btn(gp, BTN.X);
    result.chronoShift = this._btn(gp, BTN.Y);

    // ── Shoulders ──
    result.weaponNext = this._btn(gp, BTN.RB);
    result.weaponPrev = this._btn(gp, BTN.LB);

    // ── Stick clicks ──
    result.sprint = this._btn(gp, BTN.L3);

    // ── Menu ──
    result.pause = this._btn(gp, BTN.START);
    result.minimap = this._btn(gp, BTN.SELECT);

    // ── D-pad ──
    result.dpadUp = this._btn(gp, BTN.DPAD_UP);
    result.dpadDown = this._btn(gp, BTN.DPAD_DOWN);
    result.dpadLeft = this._btn(gp, BTN.DPAD_LEFT);
    result.dpadRight = this._btn(gp, BTN.DPAD_RIGHT);

    // ── Edge detection (just pressed this frame) ──
    const curr = this._currentButtons(gp);
    result.justPressed.interact = curr[BTN.A] && !this._prevButtons[BTN.A];
    result.justPressed.dash = curr[BTN.B] && !this._prevButtons[BTN.B];
    result.justPressed.reload = curr[BTN.X] && !this._prevButtons[BTN.X];
    result.justPressed.chronoShift = curr[BTN.Y] && !this._prevButtons[BTN.Y];
    result.justPressed.pause = curr[BTN.START] && !this._prevButtons[BTN.START];
    result.justPressed.minimap = curr[BTN.SELECT] && !this._prevButtons[BTN.SELECT];
    result.justPressed.weaponNext = curr[BTN.RB] && !this._prevButtons[BTN.RB];
    result.justPressed.weaponPrev = curr[BTN.LB] && !this._prevButtons[BTN.LB];
    result.justPressed.dpadUp = curr[BTN.DPAD_UP] && !this._prevButtons[BTN.DPAD_UP];
    result.justPressed.dpadDown = curr[BTN.DPAD_DOWN] && !this._prevButtons[BTN.DPAD_DOWN];
    result.justPressed.dpadLeft = curr[BTN.DPAD_LEFT] && !this._prevButtons[BTN.DPAD_LEFT];
    result.justPressed.dpadRight = curr[BTN.DPAD_RIGHT] && !this._prevButtons[BTN.DPAD_RIGHT];

    // Save current state for next frame
    for (let i = 0; i < curr.length; i++) this._prevButtons[i] = curr[i];

    return result;
  }

  // ── Haptic Feedback ────────────────────────────────────────────

  /**
   * Trigger controller vibration (if supported).
   * @param {number} duration — milliseconds
   * @param {number} weakMagnitude — 0 to 1 (subtle rumble)
   * @param {number} strongMagnitude — 0 to 1 (heavy rumble)
   */
  vibrate(duration = 100, weakMagnitude = 0.3, strongMagnitude = 0.5) {
    if (!this.settings.vibrationEnabled || !this.activeGamepad) return;

    const actuator = this.activeGamepad.vibrationActuator;
    if (actuator && actuator.playEffect) {
      actuator.playEffect('dual-rumble', {
        startDelay: 0,
        duration,
        weakMagnitude: Math.min(1, weakMagnitude),
        strongMagnitude: Math.min(1, strongMagnitude),
      }).catch(() => { /* vibration not supported — ignore */ });
    }
  }

  /** Light rumble (weapon fire, dash) */
  vibrateLight() { this.vibrate(80, 0.2, 0.1); }

  /** Medium rumble (hit taken, kill) */
  vibrateMedium() { this.vibrate(150, 0.4, 0.3); }

  /** Heavy rumble (explosion, boss hit, chrono shift) */
  vibrateHeavy() { this.vibrate(300, 0.6, 0.8); }

  /** Pulse pattern (kill streak, low health) */
  vibratePulse(count = 3, interval = 100) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => this.vibrate(60, 0.3, 0.4), i * interval);
    }
  }

  // ── Settings ───────────────────────────────────────────────────

  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings);
  }

  // ── Cleanup ────────────────────────────────────────────────────

  destroy() {
    window.removeEventListener('gamepadconnected', this._onConnected);
    window.removeEventListener('gamepaddisconnected', this._onDisconnected);
    this.activeGamepad = null;
    this.activeIndex = -1;
  }

  // ── Display Helpers ────────────────────────────────────────────

  /**
   * Get display labels for the current controller type.
   * Useful for showing context-sensitive button prompts in-game.
   */
  getButtonLabels() {
    switch (this.controllerType) {
      case 'playstation':
        return {
          interact: '✕', dash: '○', reload: '□', chronoShift: '△',
          shoot: 'R2', aim: 'L2', weaponNext: 'R1', weaponPrev: 'L1',
          pause: 'OPTIONS', minimap: 'SHARE', sprint: 'L3',
        };
      case 'switch':
        return {
          interact: 'B', dash: 'A', reload: 'Y', chronoShift: 'X',
          shoot: 'ZR', aim: 'ZL', weaponNext: 'R', weaponPrev: 'L',
          pause: '+', minimap: '-', sprint: 'LS',
        };
      case 'xbox':
      default:
        return {
          interact: 'A', dash: 'B', reload: 'X', chronoShift: 'Y',
          shoot: 'RT', aim: 'LT', weaponNext: 'RB', weaponPrev: 'LB',
          pause: 'MENU', minimap: 'VIEW', sprint: 'LS',
        };
    }
  }

  // ── Internal Helpers ───────────────────────────────────────────

  _applyDeadzone(value) {
    const dz = this.settings.deadzone;
    if (Math.abs(value) < dz) return 0;
    // Remap remaining range to 0-1 for smooth response
    const sign = value > 0 ? 1 : -1;
    return sign * ((Math.abs(value) - dz) / (1 - dz));
  }

  _btn(gp, index) {
    const btn = gp.buttons[index];
    return btn ? btn.pressed : false;
  }

  _currentButtons(gp) {
    const result = [];
    for (let i = 0; i < 17; i++) {
      result.push(gp.buttons[i] ? gp.buttons[i].pressed : false);
    }
    return result;
  }
}
