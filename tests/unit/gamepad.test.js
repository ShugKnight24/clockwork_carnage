import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  GamepadManager,
  normalizeGamepad,
  createPadView,
  createPadMemo,
  mappingKindOf,
  detectControllerType,
  controllerDisplayName,
  radialDeadzone,
  describeGamepadStatus,
} from "../../js/gamepad.js";
import { SETTINGS_REGISTRY, bindGamepadStatus, settingDisplayItem } from "../../js/settings-registry.js";

const btn = (pressed = false, value = pressed ? 1 : 0) => ({ pressed, value });
const buttons = (n, down = []) => Array.from({ length: n }, (_, i) => btn(down.includes(i)));

const CHROME_360 = "Xbox 360 Controller (STANDARD GAMEPAD Vendor: 045e Product: 028e)";
const FIREFOX_360 = "045e-028e-Microsoft X-Box 360 pad";

/** A Gamepad-like object; xpad pads rest with triggers at -1 unless overridden. */
function pad({ index = 0, id = CHROME_360, mapping = "standard", down = [], axes, nButtons, timestamp = 1 } = {}) {
  const std = mapping === "standard";
  return {
    index,
    id,
    mapping,
    connected: true,
    timestamp,
    buttons: buttons(nButtons ?? (std ? 17 : 11), down),
    axes: axes ?? (std ? [0, 0, 0, 0] : [0, 0, -1, 0, 0, -1, 0, 0]),
  };
}

describe("mapping normalisation", () => {
  it("passes a standard pad straight through", () => {
    const gp = pad({ down: [0, 7, 12], axes: [0.5, -0.25, 0.1, 0.9] });
    gp.buttons[7] = btn(true, 0.8);
    const v = normalizeGamepad(gp);
    expect(v.pressed[0]).toBe(true);
    expect(v.pressed[12]).toBe(true);
    expect(v.values[7]).toBe(0.8);
    expect(v.pressed[1]).toBe(false);
    expect(v.axes).toEqual([0.5, -0.25, 0.1, 0.9]);
  });

  it("classifies layouts", () => {
    expect(mappingKindOf(pad())).toBe("standard");
    expect(mappingKindOf(pad({ id: FIREFOX_360, mapping: "" }))).toBe("xpad");
    expect(mappingKindOf(pad({ id: "0e6f-0213-Afterglow Gamepad for Xbox 360", mapping: "" }))).toBe("xpad");
    expect(mappingKindOf(pad({ id: "Some Wheel (Vendor: 1234 Product: 5678)", mapping: "" }))).toBe("unknown");
  });

  it("reads xpad buttons into their standard slots", () => {
    // xpad: 6 Back, 7 Start, 8 Guide, 9 L3, 10 R3
    const v = normalizeGamepad(pad({ id: FIREFOX_360, mapping: "", down: [0, 6, 7, 8, 9, 10] }));
    expect(v.pressed[0]).toBe(true); // A
    expect(v.pressed[8]).toBe(true); // Back -> Select
    expect(v.pressed[9]).toBe(true); // Start
    expect(v.pressed[16]).toBe(true); // Guide -> Home
    expect(v.pressed[10]).toBe(true); // L3
    expect(v.pressed[11]).toBe(true); // R3
  });

  it("moves the xpad right stick from axes 3/4 to 2/3", () => {
    const v = normalizeGamepad(pad({ id: FIREFOX_360, mapping: "", axes: [0.1, 0.2, -1, 0.3, 0.4, -1, 0, 0] }));
    expect(v.axes).toEqual([0.1, 0.2, 0.3, 0.4]);
  });

  it("rescales xpad trigger axes from -1..1 to 0..1", () => {
    const memo = createPadMemo();
    const out = createPadView();
    const gp = pad({ id: FIREFOX_360, mapping: "", axes: [0, 0, -1, 0, 0, 1, 0, 0] });
    normalizeGamepad(gp, out, memo);
    expect(out.values[6]).toBe(0); // LT at rest
    expect(out.values[7]).toBe(1); // RT fully pulled
    expect(out.pressed[7]).toBe(true);
    gp.axes[2] = 0; // LT half pulled, after it has moved once
    normalizeGamepad(gp, out, memo);
    expect(out.values[6]).toBe(0.5);
  });

  it("treats a trigger axis that never left 0 as released (Firefox)", () => {
    const memo = createPadMemo();
    const out = createPadView();
    const gp = pad({ id: FIREFOX_360, mapping: "", axes: [0, 0, 0, 0, 0, 0, 0, 0] });
    normalizeGamepad(gp, out, memo);
    expect(out.values[6]).toBe(0);
    expect(out.values[7]).toBe(0);
    expect(out.pressed[7]).toBe(false);
    gp.axes[5] = -1; // first touch, then back to rest
    normalizeGamepad(gp, out, memo);
    gp.axes[5] = 0;
    normalizeGamepad(gp, out, memo);
    expect(out.values[7]).toBe(0.5);
  });

  it("reads the xpad d-pad from the hat axes", () => {
    const v = normalizeGamepad(pad({ id: FIREFOX_360, mapping: "", axes: [0, 0, -1, 0, 0, -1, -1, 1] }));
    expect(v.pressed[14]).toBe(true); // left
    expect(v.pressed[13]).toBe(true); // down
    expect(v.pressed[12]).toBe(false);
    expect(v.pressed[15]).toBe(false);
  });

  it("reads the xpad d-pad from buttons 11-14 when the driver sends them", () => {
    // 11 left, 12 right, 13 up, 14 down
    const v = normalizeGamepad(pad({ id: FIREFOX_360, mapping: "", nButtons: 15, down: [12, 13] }));
    expect(v.pressed[15]).toBe(true); // right
    expect(v.pressed[12]).toBe(true); // up
    expect(v.pressed[14]).toBe(false);
  });

  it("splits the DirectInput combined trigger axis", () => {
    const gp = pad({ id: CHROME_360.replace("STANDARD GAMEPAD ", ""), mapping: "", nButtons: 10, axes: [0, 0, 0.6, 0.2, 0.3] });
    const v = normalizeGamepad(gp);
    expect(v.values[6]).toBeCloseTo(0.6); // LT
    expect(v.values[7]).toBe(0);
    expect(v.axes).toEqual([0, 0, 0.2, 0.3]);
  });

  it("reads unknown layouts as standard", () => {
    const gp = pad({ id: "Generic USB Joystick", mapping: "", down: [3], axes: [0, 0, 0.7, 0] });
    const v = normalizeGamepad(gp);
    expect(v.pressed[3]).toBe(true);
    expect(v.axes[2]).toBe(0.7);
  });
});

describe("radialDeadzone", () => {
  it("zeroes inside the deadzone, including drift on both axes", () => {
    expect(radialDeadzone(0.1, 0.1, 0.2)).toEqual({ x: 0, y: 0 });
  });

  it("still reaches 1 at full tilt", () => {
    const o = radialDeadzone(1, 0, 0.2);
    expect(o.x).toBeCloseTo(1);
    expect(o.y).toBe(0);
  });

  it("keeps the direction of a diagonal instead of snapping it", () => {
    // Per-axis 0.2 deadzone would zero y here and snap to pure right.
    const o = radialDeadzone(0.6, 0.18, 0.2);
    expect(o.y).toBeGreaterThan(0);
    expect(o.y / o.x).toBeCloseTo(0.18 / 0.6);
  });

  it("clamps square-gate corners to magnitude 1", () => {
    const o = radialDeadzone(1, 1, 0.15);
    expect(Math.hypot(o.x, o.y)).toBeCloseTo(1);
  });
});

describe("controller type and name", () => {
  it("recognises 360 pads and clones", () => {
    for (const id of [
      CHROME_360,
      FIREFOX_360,
      "Xbox 360 Wired Controller",
      "xinput",
      "0e6f-0401-PDP Wired",
      "24c6-5300-PowerA Mini Pro Ex",
      "1bad-f016-Mad Catz Xbox 360 Controller",
      "0738-4716-Mad Catz Wired",
      "Logitech Gamepad F310 (STANDARD GAMEPAD Vendor: 046d Product: c21d)",
      "Controller (Vendor: 045e Product: 028e)",
    ]) {
      expect(detectControllerType(id), id).toBe("xbox");
    }
  });

  it("keeps Sony and Nintendo pads apart", () => {
    expect(detectControllerType("DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)")).toBe("playstation");
    expect(detectControllerType("Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)")).toBe("switch");
    expect(detectControllerType("Logitech Dual Action (Vendor: 046d Product: c216)")).toBe("generic");
  });

  it("strips browser suffixes and prefixes from the name", () => {
    expect(controllerDisplayName(CHROME_360)).toBe("Xbox 360 Controller");
    expect(controllerDisplayName(FIREFOX_360)).toBe("Microsoft X-Box 360 pad");
    expect(controllerDisplayName("Xbox 360 Controller (XInput STANDARD GAMEPAD)")).toBe("Xbox 360 Controller");
    expect(controllerDisplayName("")).toBe("Controller");
  });
});

describe("GamepadManager", () => {
  let pads;
  const listeners = {};

  beforeEach(() => {
    pads = [];
    vi.stubGlobal("navigator", { getGamepads: () => pads, userAgent: "" });
    vi.stubGlobal("window", {
      addEventListener: (type, fn) => { listeners[type] = fn; },
      removeEventListener: () => {},
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports nothing until a pad appears, then adopts it without an event", () => {
    const gm = new GamepadManager();
    expect(gm.poll(0).connected).toBe(false);
    pads[0] = pad();
    const r = gm.poll(16);
    expect(r.connected).toBe(true);
    expect(gm.controllerName).toBe("Xbox 360 Controller");
    expect(gm.mappingKind).toBe("standard");
  });

  it("drives the game from an xpad-layout pad", () => {
    pads[0] = pad({ id: FIREFOX_360, mapping: "", axes: [0, -1, -1, 0, 0, 1, 0, 0], down: [0] });
    const gm = new GamepadManager();
    const r = gm.poll(0);
    expect(r.shoot).toBe(true);
    expect(r.aim).toBe(false);
    expect(r.moveY).toBeCloseTo(-1);
    expect(r.justPressed.interact).toBe(true);
    expect(gm.controllerType).toBe("xbox");
  });

  it("applies the radial deadzone setting to both sticks", () => {
    pads[0] = pad({ axes: [0.2, 0.1, 0.1, -0.2] });
    const gm = new GamepadManager({ deadzone: 0.25 });
    const r = gm.poll(0);
    expect(r.moveX).toBe(0);
    expect(r.moveY).toBe(0);
    expect(r.lookX).toBe(0);
    expect(r.lookY).toBe(0);
  });

  it("switches to whichever pad was used last", () => {
    pads[0] = pad({ index: 0 });
    pads[1] = pad({ index: 1, id: "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)" });
    const gm = new GamepadManager();
    expect(gm.activeIndex).toBe(0);
    gm.poll(0);
    pads[1] = { ...pads[1], timestamp: 2, buttons: buttons(17, [0]) };
    const r = gm.poll(16);
    expect(gm.activeIndex).toBe(1);
    expect(gm.controllerType).toBe("playstation");
    expect(r.justPressed.interact).toBe(true);
  });

  it("does not hand over to an idle pad with a stuck button", () => {
    pads[0] = pad({ index: 0 });
    pads[1] = pad({ index: 1, id: "Generic", down: [4] });
    const gm = new GamepadManager();
    gm.poll(0);
    gm.poll(16);
    // Pad 0 is used; pad 1's button stays held the whole time.
    pads[0] = { ...pads[0], timestamp: 3, buttons: buttons(17, [0]) };
    pads[1] = { ...pads[1], timestamp: 3 };
    gm.poll(32);
    expect(gm.activeIndex).toBe(0);
    // Pad 1 keeps reporting (fresh timestamps, same stuck button): no takeover.
    for (let t = 4; t < 10; t++) {
      pads[1] = { ...pads[1], timestamp: t };
      gm.poll(t * 16);
    }
    expect(gm.activeIndex).toBe(0);
  });

  it("falls back to the other pad on disconnect and follows a pad to a new index", () => {
    pads[0] = pad({ index: 0 });
    pads[1] = pad({ index: 1, id: FIREFOX_360, mapping: "" });
    const gm = new GamepadManager();
    const onDisconnect = vi.fn();
    gm.onDisconnect = onDisconnect;
    const gone = pads[0];
    pads[0] = null;
    listeners.gamepaddisconnected({ gamepad: gone });
    expect(onDisconnect).toHaveBeenCalledWith("Xbox 360 Controller");
    expect(gm.activeIndex).toBe(1);
    expect(gm.mappingKind).toBe("xpad");

    // The first pad returns at index 2 and is pressed: it takes over.
    pads[2] = pad({ index: 2, down: [0] });
    listeners.gamepadconnected({ gamepad: pads[2] });
    gm.poll(0);
    expect(gm.activeIndex).toBe(2);
    expect(gm.mappingKind).toBe("standard");
  });

  it("notices a pad that vanished without an event", () => {
    pads[0] = pad();
    const gm = new GamepadManager();
    gm.poll(0);
    pads[0] = null;
    expect(gm.poll(16).connected).toBe(false);
    expect(gm.connected).toBe(false);
  });

  describe("menu navigation", () => {
    it("fires once on a stick push, with hysteresis", () => {
      pads[0] = pad();
      const gm = new GamepadManager();
      gm.poll(0);
      const set = (y, t) => {
        pads[0] = { ...pads[0], timestamp: t, axes: [0, y, 0, 0] };
        return gm.poll(t).justPressed.navDown;
      };
      expect(set(0.5, 10)).toBe(false); // below engage
      expect(set(0.7, 20)).toBe(true); // engages
      expect(set(0.4, 30)).toBe(false); // still held (above release), no repeat yet
      expect(set(0.3, 40)).toBe(false); // released
      expect(set(0.7, 50)).toBe(true); // a second push fires again
    });

    it("repeats after a hold", () => {
      pads[0] = pad({ axes: [0, -0.9, 0, 0] });
      const gm = new GamepadManager();
      const fired = [];
      for (let t = 0; t <= 700; t += 10) {
        if (gm.poll(t).justPressed.navUp) fired.push(t);
      }
      expect(fired).toEqual([0, 400, 510, 620]);
    });

    it("repeats the d-pad too, but dpad* edges stay single", () => {
      pads[0] = pad({ down: [15] });
      const gm = new GamepadManager();
      let nav = 0;
      let edge = 0;
      for (let t = 0; t <= 520; t += 10) {
        const jp = gm.poll(t).justPressed;
        if (jp.navRight) nav++;
        if (jp.dpadRight) edge++;
      }
      expect(nav).toBe(3); // 0, 400, 510
      expect(edge).toBe(1);
    });

    it("moves one way on a diagonal", () => {
      pads[0] = pad({ axes: [0.75, -0.7, 0, 0] });
      const jp = new GamepadManager().poll(0).justPressed;
      expect(jp.navRight).toBe(true);
      expect(jp.navUp).toBe(false);
    });
  });

  it("publishes a status for the settings row", () => {
    const gm = new GamepadManager();
    bindGamepadStatus(gm.status);
    const row = SETTINGS_REGISTRY.find((d) => d.key === "gamepadStatus");
    expect(row.category).toBe("Gamepad");
    expect(settingDisplayItem(row, {}).value).toBe("NONE");
    expect(row.desc).toMatch(/No controller/);
    pads[0] = pad();
    gm.poll(0);
    expect(settingDisplayItem(row, {}).value).toBe("XBOX");
    expect(row.desc).toBe("Controller: Xbox 360 Controller (standard).");
    gm.updateSettings({ enabled: false });
    expect(row.desc).toBe("Controller support is off.");
  });

  it("learns a drifting stick's resting offset so the camera stays still", () => {
    // A worn right stick resting at (0.24, -0.2): past the 0.15 deadzone.
    pads[0] = pad({ axes: [0.05, 0, 0.24, -0.2] });
    const gm = new GamepadManager();
    let r = gm.poll(0);
    expect(r.lookX).not.toBe(0); // before calibration it turns
    for (let t = 16; t <= 600; t += 16) {
      pads[0].timestamp = t;
      r = gm.poll(t);
    }
    expect(r.lookX).toBe(0);
    expect(r.lookY).toBe(0);
    expect(gm.stickBias[2]).toBeCloseTo(0.24);
    // Full deflection still reaches the edge.
    pads[0].axes = [0, 0, 1, 0];
    pads[0].timestamp = 700;
    expect(gm.poll(700).lookX).toBeGreaterThan(gm.settings.lookSensitivity * 0.95);
  });

  it("does not learn a stick the player is pushing", () => {
    pads[0] = pad({ axes: [0, -0.9, 0, 0] });
    const gm = new GamepadManager();
    for (let t = 0; t <= 600; t += 16) gm.poll(t);
    expect(gm.stickBias[1]).toBe(0);
  });
});

describe("describeGamepadStatus", () => {
  const base = { enabled: true, connected: false };
  it("warns Safari and Firefox on macOS about wired 360 pads", () => {
    const s = describeGamepadStatus(base, { supported: true, mac: true, chromium: false });
    expect(s.desc).toMatch(/Safari and Firefox on macOS/);
    const chrome = describeGamepadStatus(base, { supported: true, mac: true, chromium: true });
    expect(chrome.desc).not.toMatch(/Safari/);
  });

  it("counts the other pads and flags unknown layouts", () => {
    const s = describeGamepadStatus(
      { enabled: true, connected: true, name: "Pad", type: "generic", mappingKind: "unknown", others: 1 },
      { supported: true, mac: false, chromium: true },
    );
    expect(s.value).toBe("GENERIC");
    expect(s.desc).toMatch(/Unrecognised layout/);
    expect(s.desc).toMatch(/1 more connected/);
  });
});
