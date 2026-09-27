/**
 * CLOCKWORK CARNAGE — Wired Xbox 360 pads over WebUSB
 * ═══════════════════════════════════════════════════
 * Chrome on macOS reads Xbox 360 controllers with its own USB driver, but that
 * driver only matches Microsoft's vendor id. Third-party wired 360 pads
 * (Pelican, PDP, PowerA, Mad Catz, Afterglow…) speak the same protocol and are
 * invisible to the Gamepad API there. They are vendor-class USB devices, so
 * WebUSB may open them: this module does, parses the 20-byte input report and
 * hands GamepadManager a Gamepad-shaped object in the standard layout.
 *
 * Chrome and Edge only. The first connection needs a click (the browser's
 * device chooser); after that Chrome remembers the grant and the pad connects
 * on load and on replug.
 */

/** Any interface of class 0xFF / subclass 0x5D / protocol 0x01 is 360 input. */
export const XINPUT_FILTERS = [{ classCode: 0xff, subclassCode: 0x5d, protocolCode: 0x01 }];

const AXIS_MAX = 32767;

export const webUsbSupported = () => typeof navigator !== 'undefined' && !!navigator.usb;

/** Is this USBDevice a 360-protocol pad? */
export function isXInputDevice(device) {
  for (const cfg of device?.configurations ?? []) {
    for (const itf of cfg.interfaces) {
      const a = itf.alternates[0];
      if (a && a.interfaceClass === 0xff && a.interfaceSubclass === 0x5d && a.interfaceProtocol === 0x01) return true;
    }
  }
  return false;
}

/**
 * Parse one 360 input report into a standard-layout pad (in place).
 * Report: [0]=0x00 type, [1]=0x14 length, [2..3] button bits, [4] LT, [5] RT,
 * [6..13] LX, LY, RX, RY as little-endian int16 with Y up positive.
 * @param {DataView} dv
 * @param {{ buttons: {pressed: boolean, value: number}[], axes: number[] }} pad
 * @returns {boolean} true if the report was an input report
 */
export function parseXInputReport(dv, pad) {
  if (dv.byteLength < 14 || dv.getUint8(0) !== 0x00) return false;
  const lo = dv.getUint8(2);
  const hi = dv.getUint8(3);
  const set = (i, on, value = on ? 1 : 0) => {
    const b = pad.buttons[i];
    b.pressed = on;
    b.value = value;
  };
  set(0, !!(hi & 0x10)); // A
  set(1, !!(hi & 0x20)); // B
  set(2, !!(hi & 0x40)); // X
  set(3, !!(hi & 0x80)); // Y
  set(4, !!(hi & 0x01)); // LB
  set(5, !!(hi & 0x02)); // RB
  const lt = dv.getUint8(4) / 255;
  const rt = dv.getUint8(5) / 255;
  set(6, lt > 0.12, lt);
  set(7, rt > 0.12, rt);
  set(8, !!(lo & 0x20)); // Back
  set(9, !!(lo & 0x10)); // Start
  set(10, !!(lo & 0x40)); // L3
  set(11, !!(lo & 0x80)); // R3
  set(12, !!(lo & 0x01)); // D-pad up
  set(13, !!(lo & 0x02)); // down
  set(14, !!(lo & 0x04)); // left
  set(15, !!(lo & 0x08)); // right
  set(16, !!(hi & 0x04)); // Guide
  const axis = (off, flip) => {
    const v = Math.max(-1, Math.min(1, dv.getInt16(off, true) / AXIS_MAX));
    return flip ? -v : v;
  };
  // Standard layout is Y down positive; 360 reports Y up positive.
  pad.axes[0] = axis(6, false);
  pad.axes[1] = axis(8, true);
  pad.axes[2] = axis(10, false);
  pad.axes[3] = axis(12, true);
  return true;
}

/** A 360 pad opened over WebUSB, shaped like a standard-mapping Gamepad. */
export class XInputUsbPad {
  constructor(device) {
    this.device = device;
    const name = device.productName || 'Wired pad';
    this.id = `Xbox 360 Controller (USB: ${name}) Vendor: ${hex(device.vendorId)} Product: ${hex(device.productId)}`;
    this.index = -1; // assigned by GamepadManager
    this.mapping = 'standard';
    this.connected = false;
    this.timestamp = 0;
    this.buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
    this.axes = [0, 0, 0, 0];
    this.onlost = null;
    this._in = 0;
    this._out = 0;
    this._rumbleTimer = 0;
    const pad = this;
    this.vibrationActuator = {
      playEffect: (_type, { duration = 100, weakMagnitude = 0, strongMagnitude = 0 } = {}) => pad._rumble(duration, weakMagnitude, strongMagnitude),
    };
  }

  async open() {
    const d = this.device;
    if (!d.opened) await d.open();
    if (!d.configuration) await d.selectConfiguration(1);
    const itf = d.configuration.interfaces.find((i) => {
      const a = i.alternates[0];
      return a.interfaceClass === 0xff && a.interfaceSubclass === 0x5d && a.interfaceProtocol === 0x01;
    });
    if (!itf) throw new Error('No Xbox 360 input interface');
    await d.claimInterface(itf.interfaceNumber);
    const eps = itf.alternates[0].endpoints;
    this._in = eps.find((e) => e.direction === 'in')?.endpointNumber ?? 1;
    this._out = eps.find((e) => e.direction === 'out')?.endpointNumber ?? 0;
    this.connected = true;
    // Light quadrant 1 so the player can see which pad the game took.
    this._send([0x01, 0x03, 0x06]);
    this._readLoop();
  }

  async _readLoop() {
    while (this.connected) {
      try {
        const r = await this.device.transferIn(this._in, 32);
        if (r.status === 'stall') await this.device.clearHalt('in', this._in);
        else if (r.data && parseXInputReport(r.data, this)) this.timestamp = performance.now();
      } catch (_) {
        this._lost();
        return;
      }
    }
  }

  _send(bytes) {
    if (!this._out || !this.connected) return Promise.resolve();
    return this.device.transferOut(this._out, new Uint8Array(bytes)).catch(() => {});
  }

  _rumble(duration, weak, strong) {
    const k = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255);
    clearTimeout(this._rumbleTimer);
    this._rumbleTimer = setTimeout(() => this._send([0x00, 0x08, 0x00, 0, 0, 0, 0, 0]), duration);
    return this._send([0x00, 0x08, 0x00, k(strong), k(weak), 0, 0, 0]).then(() => 'complete');
  }

  _lost() {
    if (!this.connected) return;
    this.connected = false;
    clearTimeout(this._rumbleTimer);
    this.onlost?.(this);
  }

  async close() {
    this._lost();
    try { await this.device.close(); } catch (_) { /* already gone */ }
  }
}

const hex = (n) => (n ?? 0).toString(16).padStart(4, '0');

/**
 * Wire WebUSB 360 pads into a GamepadManager: reconnect pads the browser
 * already granted, follow plug/unplug, and return `request()` for the
 * one-time chooser (call it from a click or key press).
 */
export function initXInputUsb(manager) {
  if (!webUsbSupported()) return { supported: false, request: async () => false };
  const open = new Map(); // USBDevice -> XInputUsbPad

  async function attach(device) {
    if (open.has(device) || !isXInputDevice(device)) return false;
    const pad = new XInputUsbPad(device);
    open.set(device, pad);
    try {
      await pad.open();
    } catch (err) {
      open.delete(device);
      console.warn('[gamepad] could not open USB pad:', err?.message || err);
      return false;
    }
    pad.onlost = () => {
      open.delete(device);
      manager.removeVirtualPad(pad);
    };
    manager.addVirtualPad(pad);
    return true;
  }

  navigator.usb.getDevices().then((list) => list.forEach(attach)).catch(() => {});
  navigator.usb.addEventListener('connect', (e) => attach(e.device));
  navigator.usb.addEventListener('disconnect', (e) => open.get(e.device)?._lost());

  return {
    supported: true,
    get count() {
      return open.size;
    },
    async request() {
      try {
        return await attach(await navigator.usb.requestDevice({ filters: XINPUT_FILTERS }));
      } catch (_) {
        return false; // chooser dismissed
      }
    },
  };
}
