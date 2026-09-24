import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { parseXInputReport, isXInputDevice, XInputUsbPad } from "../../js/xinput-usb.js";
import { GamepadManager } from "../../js/gamepad.js";

/** A 20-byte 360 input report. */
function report({ lo = 0, hi = 0, lt = 0, rt = 0, lx = 0, ly = 0, rx = 0, ry = 0 } = {}) {
  const dv = new DataView(new ArrayBuffer(20));
  dv.setUint8(0, 0x00);
  dv.setUint8(1, 0x14);
  dv.setUint8(2, lo);
  dv.setUint8(3, hi);
  dv.setUint8(4, lt);
  dv.setUint8(5, rt);
  dv.setInt16(6, lx, true);
  dv.setInt16(8, ly, true);
  dv.setInt16(10, rx, true);
  dv.setInt16(12, ry, true);
  return dv;
}

const blankPad = () => ({ buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] });
const pressed = (p) => p.buttons.flatMap((b, i) => (b.pressed ? [i] : []));

describe("parseXInputReport", () => {
  it("maps face, shoulder and menu bits to standard indices", () => {
    const p = blankPad();
    // hi: A 0x10, Y 0x80, LB 0x01, Guide 0x04; lo: Start 0x10, R3 0x80
    expect(parseXInputReport(report({ hi: 0x10 | 0x80 | 0x01 | 0x04, lo: 0x10 | 0x80 }), p)).toBe(true);
    expect(pressed(p)).toEqual([0, 3, 4, 9, 11, 16]);
  });

  it("maps the d-pad bits", () => {
    const p = blankPad();
    parseXInputReport(report({ lo: 0x01 | 0x08 }), p);
    expect(pressed(p)).toEqual([12, 15]);
  });

  it("reads triggers as analog values with a press threshold", () => {
    const p = blankPad();
    parseXInputReport(report({ lt: 20, rt: 255 }), p);
    expect(p.buttons[6].pressed).toBe(false);
    expect(p.buttons[6].value).toBeCloseTo(20 / 255);
    expect(p.buttons[7]).toEqual({ pressed: true, value: 1 });
  });

  it("flips Y so down is positive, like the standard layout", () => {
    const p = blankPad();
    parseXInputReport(report({ lx: 32767, ly: 32767, rx: -32768, ry: -16384 }), p);
    expect(p.axes[0]).toBe(1);
    expect(p.axes[1]).toBe(-1);
    expect(p.axes[2]).toBe(-1);
    expect(p.axes[3]).toBeCloseTo(0.5, 3);
  });

  it("ignores non-input messages (LED status, headset)", () => {
    const dv = new DataView(new ArrayBuffer(3));
    dv.setUint8(0, 0x01);
    expect(parseXInputReport(dv, blankPad())).toBe(false);
  });
});

describe("isXInputDevice", () => {
  const dev = (cls, sub, proto) => ({
    configurations: [{ interfaces: [{ alternates: [{ interfaceClass: cls, interfaceSubclass: sub, interfaceProtocol: proto }] }] }],
  });
  it("matches the 360 input interface (the Pelican TSZ360 reports ff/5d/01)", () => {
    expect(isXInputDevice(dev(0xff, 0x5d, 0x01))).toBe(true);
  });
  it("rejects anything else", () => {
    expect(isXInputDevice(dev(0x03, 0x00, 0x00))).toBe(false);
    expect(isXInputDevice(dev(0xff, 0x47, 0xd0))).toBe(false);
  });
});

describe("GamepadManager with a virtual pad", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", { getGamepads: () => [null, null, null, null], userAgent: "" });
    vi.stubGlobal("window", { addEventListener: () => {}, removeEventListener: () => {} });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("adopts, reads and drops a WebUSB pad like a native one", () => {
    const gm = new GamepadManager();
    const pad = new XInputUsbPad({ productName: "TSZ360 Pad", vendorId: 0x0e6f, productId: 0x0201 });
    pad.connected = true;
    const onConnect = vi.fn();
    gm.onConnect = onConnect;
    gm.addVirtualPad(pad);
    expect(onConnect).toHaveBeenCalledWith(expect.stringContaining("TSZ360"), "xbox");

    parseXInputReport(report({ hi: 0x10, rt: 255, lx: 32767 }), pad);
    pad.timestamp = 5;
    const r = gm.poll(10);
    expect(r.connected).toBe(true);
    expect(r.interact).toBe(true);
    expect(r.shoot).toBe(true);
    expect(r.moveX).toBeGreaterThan(0.9);

    gm.removeVirtualPad(pad);
    expect(gm.poll(20).connected).toBe(false);
  });
});
