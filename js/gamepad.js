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
 *   // input.moveX/moveY/lookX/lookY (sticks), input.pressed.dash,
 *   // input.justPressed.interact, ... per action in the binding table
 *   // (src/systems/pad-actions.js GAMEPAD_ACTIONS).
 */

import { GAMEPAD_ACTIONS, PAD_LABELS, resolvePadActions } from '../src/systems/pad-actions.js';

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

// ── Menu Navigation ─────────────────────────────────────────────
// The left stick drives menus like the d-pad. It engages past NAV_ENGAGE and
// lets go below NAV_RELEASE, so a worn stick hovering near the line doesn't
// chatter. Holding either repeats after NAV_DELAY, every NAV_REPEAT (ms).
const NAV_ENGAGE = 0.6;
const NAV_RELEASE = 0.35;
const NAV_DELAY = 400;
const NAV_REPEAT = 110;

/** A stick on an idle pad must pass this (or the deadzone) to take over as the active pad. */
const SWITCH_STICK = 0.5;
// Stick centre calibration: sampling window, and the most a resting stick may
// read (anything past it is the player pushing the stick).
const CALIB_MS = 500;
const CALIB_MAX = 0.35;
// Virtual (WebUSB) pads take indices from here up, clear of the browser's.
const VIRTUAL_BASE = 16;

// ── Mapping Normalisation ───────────────────────────────────────
// Chrome (and Edge) remap known pads to the W3C "standard" layout, including
// a wired Xbox 360 pad on macOS through Chrome's own driver. Firefox on Linux
// and many 360 clones hand over the raw Linux xpad layout with mapping "":
//   buttons 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 Back, 7 Start, 8 Guide, 9 L3, 10 R3
//   axes    0 LX, 1 LY, 2 LT, 3 RX, 4 RY, 5 RT (triggers -1 rest .. +1 pulled),
//           6/7 d-pad hat (-1/0/1); some drivers give the d-pad as buttons 11-14
//           (left, right, up, down) instead.
// Old Windows DirectInput 360 drivers give 5 axes: both triggers share axis 2
// (LT towards +1, RT towards -1), no Guide, so L3/R3 sit at 8/9, and the
// d-pad is a POV hat we don't decode (the stick navigates menus anyway).

/** Vendor ids of Microsoft and the XInput clone makers (PDP, PowerA, Harmonix/Rock Candy, Mad Catz). */
const XINPUT_VENDOR = /(?:^|vendor:\s*)(?:045e|0e6f|24c6|1bad|0738)\b/;
/** Logitech F310/F510/F710 in their XInput (X) switch position. */
const LOGITECH_XINPUT = /046d.*c21[def]\b/;

/**
 * Which layout a pad reports: 'standard' (browser remapped it), 'xpad'
 * (recognised XInput-style pad in the raw layout above) or 'unknown'
 * (read as standard, as before, and hope).
 * @param {{ id?: string, mapping?: string, axes?: ArrayLike<number>, buttons?: ArrayLike<any> }} gp
 */
export function mappingKindOf(gp) {
  if (gp.mapping === 'standard') return 'standard';
  const axes = gp.axes ? gp.axes.length : 0;
  const buttons = gp.buttons ? gp.buttons.length : 0;
  if (detectControllerType(gp.id || '') === 'xbox' && axes >= 5 && buttons >= 10) return 'xpad';
  return 'unknown';
}

/** Controller family from a Gamepad id: 'xbox' | 'playstation' | 'switch' | 'generic'. */
export function detectControllerType(id) {
  const lower = String(id).toLowerCase();
  // Sony and Nintendo first: clone makers (PDP, PowerA) sell licensed pads for them too.
  if (lower.includes('dualsense') || lower.includes('dualshock') ||
      lower.includes('sony') || lower.includes('playstation') || lower.includes('054c'))
    return 'playstation';
  if (lower.includes('pro controller') || lower.includes('057e') || lower.includes('nintendo'))
    return 'switch';
  if (lower.includes('xbox') || lower.includes('x-box') || lower.includes('xinput') ||
      lower.includes('microsoft') || /\b360\b/.test(lower) ||
      XINPUT_VENDOR.test(lower) || LOGITECH_XINPUT.test(lower))
    return 'xbox';
  return 'generic';
}

/**
 * Human name from a Gamepad id. Drops Chrome's "(STANDARD GAMEPAD Vendor: 045e
 * Product: 028e)" suffix and Firefox's "045e-028e-" prefix.
 */
export function controllerDisplayName(id) {
  const name = String(id || '')
    .replace(/\s*\([^)]*(?:standard gamepad|vendor:)[^)]*\)\s*$/i, '')
    .replace(/^[0-9a-f]{1,4}-[0-9a-f]{1,4}-/i, '')
    .trim();
  return name || 'Controller';
}

/** Output buffer for normalizeGamepad: 17 standard buttons and 4 axes. */
export function createPadView() {
  return { pressed: new Array(17).fill(false), values: new Array(17).fill(0), axes: [0, 0, 0, 0] };
}

/** Per-pad memory the xpad reader needs (has each trigger axis ever moved?). */
export function createPadMemo() {
  return { triggerSeen: [false, false] };
}

/**
 * Read a Gamepad-like object `{ id, mapping, buttons, axes }` into the
 * standard layout. Fills and returns `out`, so the per-frame call allocates
 * nothing. Unknown layouts are read as standard.
 * @param {string} [kind] mappingKindOf(gp), when the caller has it cached
 */
export function normalizeGamepad(gp, out = createPadView(), memo = createPadMemo(), kind = mappingKindOf(gp)) {
  if (kind === 'xpad') readXpad(gp, out, memo);
  else readStandard(gp, out);
  return out;
}

function setBtn(out, i, btn) {
  out.pressed[i] = !!btn && !!btn.pressed;
  out.values[i] = btn ? (typeof btn.value === 'number' ? btn.value : (btn.pressed ? 1 : 0)) : 0;
}

function setAnalog(out, i, value) {
  out.values[i] = value;
  out.pressed[i] = value > 0.1;
}

function readStandard(gp, out) {
  const b = gp.buttons || [];
  const a = gp.axes || [];
  for (let i = 0; i < 17; i++) setBtn(out, i, b[i]);
  for (let i = 0; i < 4; i++) out.axes[i] = a[i] || 0;
}

/**
 * xpad trigger axis (-1 rest .. +1 pulled) to 0..1. Firefox reports exactly 0
 * until the trigger is first touched, which would read as half-pulled, so an
 * axis that has never left 0 counts as released.
 */
function readTrigger(v, memo, slot) {
  if (typeof v !== 'number') return 0;
  if (v !== 0) memo.triggerSeen[slot] = true;
  if (!memo.triggerSeen[slot]) return 0;
  return Math.max(0, Math.min(1, (v + 1) / 2));
}

function readXpad(gp, out, memo) {
  const b = gp.buttons || [];
  const a = gp.axes || [];
  const dinput = a.length < 6;
  setBtn(out, BTN.A, b[0]);
  setBtn(out, BTN.B, b[1]);
  setBtn(out, BTN.X, b[2]);
  setBtn(out, BTN.Y, b[3]);
  setBtn(out, BTN.LB, b[4]);
  setBtn(out, BTN.RB, b[5]);
  setBtn(out, BTN.SELECT, b[6]);
  setBtn(out, BTN.START, b[7]);
  out.axes[AXIS.LEFT_X] = a[0] || 0;
  out.axes[AXIS.LEFT_Y] = a[1] || 0;
  out.axes[AXIS.RIGHT_X] = a[3] || 0;
  out.axes[AXIS.RIGHT_Y] = a[4] || 0;

  if (dinput) {
    const z = a[2] || 0;
    setAnalog(out, BTN.LT, z > 0 ? Math.min(1, z) : 0);
    setAnalog(out, BTN.RT, z < 0 ? Math.min(1, -z) : 0);
    setBtn(out, BTN.L3, b[8]);
    setBtn(out, BTN.R3, b[9]);
    setBtn(out, BTN.HOME, null);
    for (let i = BTN.DPAD_UP; i <= BTN.DPAD_RIGHT; i++) setBtn(out, i, null);
    return;
  }

  setAnalog(out, BTN.LT, readTrigger(a[2], memo, 0));
  setAnalog(out, BTN.RT, readTrigger(a[5], memo, 1));
  setBtn(out, BTN.HOME, b[8]);
  setBtn(out, BTN.L3, b[9]);
  setBtn(out, BTN.R3, b[10]);

  // D-pad: hat axes 6/7, or buttons 11-14 (left, right, up, down), whichever is live.
  const hx = a[6] || 0;
  const hy = a[7] || 0;
  const up = hy < -0.5 || !!(b[13] && b[13].pressed);
  const down = hy > 0.5 || !!(b[14] && b[14].pressed);
  const left = hx < -0.5 || !!(b[11] && b[11].pressed);
  const right = hx > 0.5 || !!(b[12] && b[12].pressed);
  out.pressed[BTN.DPAD_UP] = up; out.values[BTN.DPAD_UP] = up ? 1 : 0;
  out.pressed[BTN.DPAD_DOWN] = down; out.values[BTN.DPAD_DOWN] = down ? 1 : 0;
  out.pressed[BTN.DPAD_LEFT] = left; out.values[BTN.DPAD_LEFT] = left ? 1 : 0;
  out.pressed[BTN.DPAD_RIGHT] = right; out.values[BTN.DPAD_RIGHT] = right ? 1 : 0;
}

/**
 * Radial deadzone: ignore the stick until its distance from centre passes
 * `dz`, then rescale so the output still reaches 1. Unlike a per-axis
 * deadzone, diagonals don't snap to the cardinal directions.
 * @param {{x: number, y: number}} out filled and returned
 */
export function radialDeadzone(x, y, dz, out = { x: 0, y: 0 }) {
  const mag = Math.hypot(x, y);
  if (mag <= dz || mag === 0) {
    out.x = 0;
    out.y = 0;
    return out;
  }
  const scaled = (Math.min(1, mag) - dz) / (1 - dz);
  out.x = (x / mag) * scaled;
  out.y = (y / mag) * scaled;
  return out;
}

// ── Status Text ─────────────────────────────────────────────────

/** Browser facts the status text needs. */
export function detectBrowserEnv(nav = typeof navigator !== 'undefined' ? navigator : null) {
  const ua = (nav && nav.userAgent) || '';
  return {
    supported: !!(nav && typeof nav.getGamepads === 'function'),
    mac: /Macintosh|Mac OS X/.test(ua),
    chromium: /Chrome\/|Chromium\/|Edg\//.test(ua),
    webUsb: !!(nav && nav.usb),
  };
}

const TYPE_LABEL = { xbox: 'XBOX', playstation: 'PLAYSTATION', switch: 'SWITCH', generic: 'GENERIC' };

/**
 * Short value plus one-line description for the settings page.
 * @param {{ enabled: boolean, connected: boolean, name?: string, type?: string, mappingKind?: string, others?: number }} info
 * @param {{ supported: boolean, mac: boolean, chromium: boolean }} env
 * @returns {{ value: string, desc: string }}
 */
export function describeGamepadStatus(info, env) {
  if (!info.enabled) return { value: 'OFF', desc: 'Controller support is off.' };
  if (!env.supported) {
    return { value: 'UNAVAILABLE', desc: 'This browser exposes no controllers here. Use Chrome or Edge.' };
  }
  if (info.connected) {
    let desc = `Controller: ${info.name} (${info.mappingKind})`;
    if (info.mappingKind === 'unknown') desc += '. Unrecognised layout; some buttons may be off';
    if (info.others > 0) desc += `. ${info.others} more connected; press a button on one to switch`;
    return { value: TYPE_LABEL[info.type] || 'CONNECTED', desc: `${desc}.` };
  }
  if (env.mac && !env.chromium) {
    return {
      value: 'NONE',
      desc: "No controller. Press any button on it. Safari and Firefox on macOS can't see wired Xbox 360 pads; use Chrome or Edge.",
    };
  }
  if (env.mac && env.webUsb) {
    return {
      value: 'NONE',
      desc: 'No controller. Press any button on it. A wired third-party Xbox 360 pad? Select this row to connect it over USB.',
    };
  }
  return { value: 'NONE', desc: 'No controller. Press any button on it to connect.' };
}

export class GamepadManager {
  constructor(settings = {}) {
    this.settings = { ...DEFAULTS, ...settings };

    /** @type {Gamepad|null} */
    this.activeGamepad = null;
    this.activeIndex = -1;

    /** Button states (this and last frame) for per-action edge detection */
    this._prevButtons = new Array(17).fill(false);
    this._downButtons = new Array(17).fill(false);

    /** Action → button table poll() resolves (a remap edits this table). */
    this.bindings = GAMEPAD_ACTIONS;

    /** Connected controller info for display */
    this.controllerId = '';
    this.controllerName = '';
    this.controllerType = 'unknown'; // 'xbox', 'playstation', 'switch', 'generic'
    this.mappingKind = 'unknown'; // 'standard', 'xpad', 'unknown'
    this.connectedCount = 0;

    /** Settings-page status, updated in place (settings-registry reads it). */
    this.status = { value: 'NONE', desc: '' };
    this._env = detectBrowserEnv();

    /** Per-index pad memory: id, layout, last timestamp, busy flag, trigger memo. */
    this._pads = [];
    this._view = createPadView();
    this._stick = { x: 0, y: 0 };
    this._navStick = [false, false, false, false]; // up, down, left, right
    this._navNext = [-1, -1, -1, -1];
    this._result = createResult();

    /** Pads read by our own drivers (WebUSB), merged into the native list. */
    this._virtual = [];
    this._virtualSeq = 0;
    this._padList = [];

    /** Last raw stick values of the active pad, before offset and deadzone. */
    this.rawAxes = [0, 0, 0, 0];

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
    this._refreshStatus();
  }

  // ── Connection Management ──────────────────────────────────────

  _handleConnect(e) {
    const gp = e.gamepad;
    this._padState(gp);
    if (this.activeIndex === -1) this._activate(gp);
    else this._refreshStatus();
  }

  _handleDisconnect(e) {
    const index = e.gamepad.index;
    this._pads[index] = undefined;
    if (index === this.activeIndex) this._dropActive(index);
    else this._refreshStatus();
  }

  /** Lose the active pad, say so, and fall back to another connected one. */
  _dropActive(skipIndex = -1) {
    if (this.onDisconnect) this.onDisconnect(this.controllerName);
    this._clearActive();
    this._scanForGamepad(skipIndex);
    this._refreshStatus();
  }

  _clearActive() {
    this.activeIndex = -1;
    this.activeGamepad = null;
    this.controllerId = '';
    this.controllerName = '';
    this.controllerType = 'unknown';
    this.mappingKind = 'unknown';
    this._resetEdges();
  }

  /** Adopt the most recently used connected pad (or the first one). */
  _scanForGamepad(skipIndex = -1, gamepads = this._allPads()) {
    let best = null;
    let bestAt = -1;
    for (const gp of gamepads) {
      if (!gp || !gp.connected || gp.index === skipIndex) continue;
      const at = this._padState(gp).lastActive;
      if (!best || at > bestAt) {
        best = gp;
        bestAt = at;
      }
    }
    if (best) this._activate(best);
  }

  // ── Virtual pads (js/xinput-usb.js) ───────────────────────────
  // Pads the browser's Gamepad API cannot see, read by our own driver. They
  // sit in the same list as native pads at indices past the browser's.

  /** Native pads plus virtual ones, indexed by `gp.index`. */
  _allPads() {
    const native = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    if (!this._virtual.length) return native;
    const list = this._padList;
    list.length = 0;
    for (const gp of native) if (gp) list[gp.index] = gp;
    for (const v of this._virtual) list[v.index] = v;
    return list;
  }

  addVirtualPad(pad) {
    pad.index = VIRTUAL_BASE + this._virtualSeq++;
    this._virtual.push(pad);
    this._handleConnect({ gamepad: pad });
  }

  removeVirtualPad(pad) {
    const i = this._virtual.indexOf(pad);
    if (i < 0) return;
    this._virtual.splice(i, 1);
    this._handleDisconnect({ gamepad: pad });
  }

  /**
   * Learn the resting stick offsets over half a second. Runs when a pad is
   * adopted and on request; a sample with any stick past CALIB_MAX means the
   * player is using it, and those samples are skipped.
   */
  _calibrate(st, axes, now) {
    const c = st.calib;
    if (c.pending) {
      c.pending = false;
      c.until = now + CALIB_MS;
      c.n = 0;
      c.sum.fill(0);
    }
    if (c.until < 0) return;
    if (now < c.until) {
      if (axes.every((v) => Math.abs(v) < CALIB_MAX)) {
        for (let i = 0; i < 4; i++) c.sum[i] += axes[i];
        c.n++;
      }
      return;
    }
    c.until = -1;
    if (c.n >= 3) for (let i = 0; i < 4; i++) st.bias[i] = c.sum[i] / c.n;
    this._refreshStatus();
  }

  /** Re-learn the active pad's resting stick offsets (settings action). */
  calibrate() {
    const st = this._pads[this.activeIndex];
    if (st) st.calib.pending = true;
  }

  /** Resting offsets being subtracted from the active pad, [lx, ly, rx, ry]. */
  get stickBias() {
    return this._pads[this.activeIndex]?.bias ?? [0, 0, 0, 0];
  }

  /** Re-read connected pads (the settings row's action). */
  rescan() {
    if (this.activeIndex < 0) this._scanForGamepad();
    this._refreshStatus();
  }

  _activate(gp) {
    const st = this._padState(gp);
    this.activeIndex = gp.index;
    this.activeGamepad = gp;
    this.controllerId = gp.id;
    this.controllerName = controllerDisplayName(gp.id);
    this.controllerType = this._detectType(gp.id);
    this.mappingKind = st.kind;
    this._resetEdges();
    this._refreshStatus();
    if (this.onConnect) this.onConnect(this.controllerName, this.controllerType);
  }

  /** Memory for the pad at gp.index; reset when a different device takes the slot. */
  _padState(gp) {
    let st = this._pads[gp.index];
    if (!st || st.id !== gp.id) {
      st = {
        id: gp.id,
        kind: mappingKindOf(gp),
        timestamp: -1,
        busy: false,
        lastActive: -1,
        memo: createPadMemo(),
        // Resting stick offsets. Worn sticks (old 360 pads especially) sit
        // 0.15-0.3 off centre, past the deadzone, and the camera turns on
        // its own; the offset is learned while the sticks are untouched.
        bias: [0, 0, 0, 0],
        calib: { pending: true, until: -1, n: 0, sum: [0, 0, 0, 0] },
      };
      this._pads[gp.index] = st;
    }
    return st;
  }

  _detectType(id) {
    return detectControllerType(id);
  }

  _refreshStatus() {
    const next = describeGamepadStatus({
      enabled: this.settings.enabled,
      connected: this.activeIndex >= 0,
      name: this.controllerName,
      type: this.controllerType,
      mappingKind: this.mappingKind,
      others: Math.max(0, this.connectedCount - 1),
    }, this._env);
    this.status.value = next.value;
    this.status.desc = next.desc;
  }

  _resetEdges() {
    this._prevButtons.fill(false);
    this._navStick.fill(false);
    this._navNext.fill(-1);
  }

  /** Is a controller currently connected? */
  get connected() {
    return this.activeIndex >= 0;
  }

  /**
   * Walk the connected pads: count them, and hand control to one that just
   * started being used (a button went down or a stick was pushed), so a
   * second pad, or the same pad back at a new index, takes over without a
   * reload. The busy check is edge-triggered, so an idle pad with a stuck
   * button or a drifting stick can't hold the slot.
   */
  _selectPad(gamepads, now) {
    let count = 0;
    let takeover = null;
    const dz = Math.max(this.settings.deadzone, SWITCH_STICK);
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (!gp || !gp.connected) continue;
      count++;
      const st = this._padState(gp);
      // An unchanged timestamp means unchanged input; skip the re-read.
      if (typeof gp.timestamp === 'number' && gp.timestamp === st.timestamp) continue;
      st.timestamp = typeof gp.timestamp === 'number' ? gp.timestamp : -1;
      const busy = padBusy(gp, st.kind, dz);
      if (busy && !st.busy) {
        st.lastActive = now;
        if (gp.index !== this.activeIndex) takeover = gp;
      }
      st.busy = busy;
    }
    if (count !== this.connectedCount) {
      this.connectedCount = count;
      this._refreshStatus();
    }
    if (takeover) this._activate(takeover);
  }

  // ── Per-Frame Polling ──────────────────────────────────────────

  /**
   * Poll the active gamepad and return a normalized input state.
   * Call this once per frame from the game loop. The returned object is
   * reused between calls.
   *
   * @param {number} [now] — ms clock for menu-repeat timing (performance.now())
   * @returns {GamepadInput} Normalized input object
   */
  poll(now = typeof performance !== 'undefined' ? performance.now() : Date.now()) {
    const result = resetResult(this._result);

    if (!this.settings.enabled) return result;

    const gamepads = this._allPads();
    this._selectPad(gamepads, now);
    if (this.activeIndex < 0) {
      // Pads can appear without a gamepadconnected event (Safari, or one
      // already awake when the page loaded).
      this._scanForGamepad(-1, gamepads);
      if (this.activeIndex < 0) return result;
    }

    const gp = gamepads[this.activeIndex];
    if (!gp || !gp.connected || gp.id !== this.controllerId) {
      this._pads[this.activeIndex] = undefined;
      this._dropActive(this.activeIndex);
      return result;
    }

    this.activeGamepad = gp;
    result.connected = true;
    result.controllerType = this.controllerType;

    const st = this._padState(gp);
    const view = normalizeGamepad(gp, this._view, st.memo, st.kind);
    this._calibrate(st, view.axes, now);
    const ax = view.axes;
    for (let i = 0; i < 4; i++) {
      this.rawAxes[i] = ax[i];
      // Re-centre, rescaling each side so a full push still reads 1.
      const b = st.bias[i];
      const d = ax[i] - b;
      ax[i] = Math.max(-1, Math.min(1, d / (d > 0 ? 1 - b : 1 + b)));
    }

    // ── Sticks (radial deadzone) ──
    const dz = this.settings.deadzone;
    const move = radialDeadzone(view.axes[AXIS.LEFT_X], view.axes[AXIS.LEFT_Y], dz, this._stick);
    result.moveX = move.x * this.settings.moveSensitivity;
    result.moveY = move.y * this.settings.moveSensitivity;
    const look = radialDeadzone(view.axes[AXIS.RIGHT_X], view.axes[AXIS.RIGHT_Y], dz, this._stick);
    result.lookX = look.x * this.settings.lookSensitivity;
    result.lookY = look.y * this.settings.lookSensitivity;

    if (this.settings.invertLookY) result.lookY *= -1;

    // ── Actions: held and just-pressed, from the binding table ──
    // Triggers stay analog in the view; past 0.1 they count as held.
    const down = this._downButtons;
    const prev = this._prevButtons;
    const jp = result.justPressed;
    result.anyButton = resolvePadActions(view, prev, down, result.pressed, jp, this.bindings);

    // Raw d-pad edges: the Forge steps its cursor with them.
    jp.dpadUp = down[BTN.DPAD_UP] && !prev[BTN.DPAD_UP];
    jp.dpadDown = down[BTN.DPAD_DOWN] && !prev[BTN.DPAD_DOWN];
    jp.dpadLeft = down[BTN.DPAD_LEFT] && !prev[BTN.DPAD_LEFT];
    jp.dpadRight = down[BTN.DPAD_RIGHT] && !prev[BTN.DPAD_RIGHT];

    // ── Menu navigation: d-pad or left stick, with hold-to-repeat ──
    this._updateNav(view.axes[AXIS.LEFT_X], view.axes[AXIS.LEFT_Y], down, now, jp);

    // The first button to go down this frame, by index: a remap capture binds it.
    for (let i = 0; i < 17; i++) {
      if (down[i] && !prev[i]) {
        result.buttonPressed = i;
        break;
      }
    }

    // Save current state for next frame
    for (let i = 0; i < 17; i++) prev[i] = down[i];

    return result;
  }

  /** Fill justPressed.navUp/Down/Left/Right from the d-pad and the left stick. */
  _updateNav(lx, ly, pressed, now, jp) {
    const s = this._navStick;
    const ax = Math.abs(lx);
    const ay = Math.abs(ly);
    // Engage only on the dominant axis so a diagonal push moves one way.
    s[0] = s[0] ? ly < -NAV_RELEASE : ly < -NAV_ENGAGE && ay >= ax;
    s[1] = s[1] ? ly > NAV_RELEASE : ly > NAV_ENGAGE && ay >= ax;
    s[2] = s[2] ? lx < -NAV_RELEASE : lx < -NAV_ENGAGE && ax > ay;
    s[3] = s[3] ? lx > NAV_RELEASE : lx > NAV_ENGAGE && ax > ay;
    jp.navUp = this._navFire(0, s[0] || pressed[BTN.DPAD_UP], now);
    jp.navDown = this._navFire(1, s[1] || pressed[BTN.DPAD_DOWN], now);
    jp.navLeft = this._navFire(2, s[2] || pressed[BTN.DPAD_LEFT], now);
    jp.navRight = this._navFire(3, s[3] || pressed[BTN.DPAD_RIGHT], now);
  }

  _navFire(dir, held, now) {
    const next = this._navNext;
    if (!held) {
      next[dir] = -1;
      return false;
    }
    if (next[dir] < 0) {
      next[dir] = now + NAV_DELAY;
      return true;
    }
    if (now >= next[dir]) {
      next[dir] = now + NAV_REPEAT;
      return true;
    }
    return false;
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
    this._refreshStatus();
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
   * Button legend per action for the current controller type, from the
   * binding table (the same legends the prompts draw).
   */
  getButtonLabels() {
    const family = this.controllerType === 'playstation' || this.controllerType === 'switch' ? this.controllerType : 'xbox';
    const legends = PAD_LABELS[family];
    const labels = {};
    for (const action in this.bindings) {
      const i = this.bindings[action];
      if (typeof i === 'number' && i < legends.length) labels[action] = legends[i];
    }
    return labels;
  }
}

// ── Internal Helpers ─────────────────────────────────────────────

/** Any button down, or a stick past `dz`, on a pad in its own layout. */
function padBusy(gp, kind, dz) {
  const b = gp.buttons || [];
  for (let i = 0; i < b.length; i++) {
    if (b[i] && b[i].pressed) return true;
  }
  const a = gp.axes || [];
  const rx = kind === 'xpad' ? 3 : 2;
  return Math.hypot(a[0] || 0, a[1] || 0) > dz || Math.hypot(a[rx] || 0, a[rx + 1] || 0) > dz;
}

function createResult() {
  return resetResult({ pressed: {}, justPressed: {} });
}

/** Zero the reused poll() result in place. */
function resetResult(r) {
  // Analog sticks (after deadzone)
  r.moveX = 0;        // -1 (left) to +1 (right) — left stick
  r.moveY = 0;        // -1 (up) to +1 (down) — left stick
  r.lookX = 0;        // -1 (left) to +1 (right) — right stick
  r.lookY = 0;        // -1 (up) to +1 (down) — right stick

  // Per action (src/systems/pad-actions.js): held this frame, and true only
  // on the frame its button goes down. justPressed also carries the raw
  // d-pad edges (dpadUp...) and nav*, which fire while the d-pad or left
  // stick is held (menu repeat).
  for (const k in r.pressed) r.pressed[k] = false;
  for (const k in r.justPressed) r.justPressed[k] = false;
  r.anyButton = false;  // any button but Home held
  r.buttonPressed = -1; // standard index of the first button down this frame

  // Meta
  r.connected = false;
  r.controllerType = 'unknown';
  return r;
}
