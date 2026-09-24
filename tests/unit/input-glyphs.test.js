import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  GAMEPAD_ACTIONS,
  activeDevice,
  glyph,
  noteInput,
  padActive,
  padGlyph,
  padLabelGlyph,
  promptText,
  trackGamepad,
} from "../../src/ui/input-glyphs.js";
import { GamepadManager } from "../../js/gamepad.js";
import { DEFAULT_KEYBINDS } from "../../js/input-manager.js";
import { tutorialStepCopy } from "../../src/ui/tutorial-ui.js";
import { powerKeys } from "../../src/ui/chrono-hud.js";

const fakeGame = (over = {}) => ({
  isTouchDevice: false,
  keybinds: { ...DEFAULT_KEYBINDS },
  gamepad: { connected: true, controllerType: "xbox" },
  ...over,
});

/** A poll() result with nothing pressed. */
function idlePoll() {
  return {
    connected: true, moveX: 0, moveY: 0, lookX: 0, lookY: 0,
    shoot: false, aim: false, interact: false, dash: false, reload: false, chronoShift: false,
    sprint: false, chronoLock: false, weaponNext: false, weaponPrev: false, pause: false, minimap: false,
    dpadUp: false, dpadDown: false, dpadLeft: false, dpadRight: false,
  };
}

describe("active device", () => {
  it("starts on keyboard, or touch on a touch-first device", () => {
    expect(activeDevice(fakeGame())).toBe("keyboard");
    expect(activeDevice(fakeGame({ isTouchDevice: true }))).toBe("touch");
    expect(activeDevice(undefined)).toBe("keyboard");
  });

  it("switches to the pad on a button or a stick past the deadzone, and back on a keypress", () => {
    const game = fakeGame();
    trackGamepad(game, idlePoll());
    expect(activeDevice(game)).toBe("keyboard");
    trackGamepad(game, { ...idlePoll(), moveX: 0.4 });
    expect(activeDevice(game)).toBe("gamepad");
    noteInput(game, "keyboard");
    expect(activeDevice(game)).toBe("keyboard");
    trackGamepad(game, { ...idlePoll(), interact: true });
    expect(activeDevice(game)).toBe("gamepad");
    noteInput(game, "keyboard");
    trackGamepad(game, { ...idlePoll(), dpadLeft: true });
    expect(activeDevice(game)).toBe("gamepad");
  });

  it("ignores an idle or unplugged pad", () => {
    expect(padActive(idlePoll())).toBe(false);
    expect(padActive({ ...idlePoll(), connected: false, shoot: true })).toBe(false);
    expect(padActive({ ...idlePoll(), aim: true })).toBe(true);
    expect(padActive({ ...idlePoll(), lookY: -0.2 })).toBe(true);
  });

  it("falls back once the pad it switched to is unplugged", () => {
    const game = fakeGame();
    noteInput(game, "gamepad");
    game.gamepad.connected = false;
    expect(activeDevice(game)).toBe("keyboard");
    game.isTouchDevice = true;
    expect(activeDevice(game)).toBe("touch");
  });

  it("lets a touch-first device show pad prompts once the pad is used", () => {
    const game = fakeGame({ isTouchDevice: true });
    trackGamepad(game, { ...idlePoll(), chronoShift: true });
    expect(activeDevice(game)).toBe("gamepad");
  });
});

describe("binding table", () => {
  it("takes keyboard keys from the keybinds, including rebinds", () => {
    const game = fakeGame();
    expect(glyph(game, "interact", "keyboard")).toEqual({ text: "E", kind: "key" });
    expect(glyph(game, "sprint", "keyboard").text).toBe("SHIFT");
    expect(glyph(game, "crouch", "keyboard").text).toBe("CTRL");
    expect(glyph(game, "confirm", "keyboard").text).toBe("ENTER");
    expect(glyph(game, "back", "keyboard").text).toBe("ESC");
    game.keybinds.interact = "KeyF";
    expect(glyph(game, "interact", "keyboard").text).toBe("F");
  });

  it("draws Xbox face buttons in Xbox colours and the rest as pills", () => {
    expect(padGlyph("interact", "xbox")).toMatchObject({ text: "A", kind: "face", color: "#5fb33f" });
    expect(padGlyph("dash", "xbox")).toMatchObject({ text: "B", kind: "face", color: "#d9352c" });
    expect(padGlyph("crouch", "xbox")).toMatchObject({ text: "X", kind: "face", color: "#2f7fd8" });
    expect(padGlyph("chronoShift", "xbox")).toMatchObject({ text: "Y", kind: "face", color: "#e6b422" });
    expect(padGlyph("weaponPrev", "xbox")).toMatchObject({ text: "LB", kind: "pill" });
    expect(padGlyph("fire", "xbox")).toMatchObject({ text: "RT", kind: "pill" });
    expect(padGlyph("pause", "xbox").text).toBe("☰");
    expect(padGlyph("minimap", "xbox").text).toBe("⧉");
    expect(padGlyph("navigateV", "xbox")).toMatchObject({ text: "✚↕", kind: "dpad" });
  });

  it("names PlayStation and Switch buttons by their own legends", () => {
    expect(["interact", "dash", "crouch", "chronoShift"].map((a) => padGlyph(a, "playstation").text)).toEqual(["✕", "○", "□", "△"]);
    expect(["weaponPrev", "weaponNext", "aim", "fire", "pause", "minimap"].map((a) => padGlyph(a, "playstation").text))
      .toEqual(["L1", "R1", "L2", "R2", "OPTIONS", "SHARE"]);
    // Switch: the bottom face button is B, the right one A.
    expect(["interact", "dash", "crouch", "chronoShift"].map((a) => padGlyph(a, "switch").text)).toEqual(["B", "A", "Y", "X"]);
    expect(["aim", "fire", "pause", "minimap"].map((a) => padGlyph(a, "switch").text)).toEqual(["ZL", "ZR", "+", "−"]);
    expect(glyph(fakeGame({ gamepad: { connected: true, controllerType: "generic" } }), "interact", "gamepad").text).toBe("A");
  });

  it("agrees with js/gamepad.js getButtonLabels for every family", () => {
    const norm = { MENU: "☰", VIEW: "⧉", "-": "−" };
    const fields = {
      interact: "interact", dash: "dash", reload: "crouch", chronoShift: "chronoShift",
      shoot: "fire", aim: "aim", weaponNext: "weaponNext", weaponPrev: "weaponPrev",
      pause: "pause", minimap: "minimap", sprint: "sprint", chronoRewind: "chronoRewind", chronoLock: "chronoLock",
    };
    for (const family of ["xbox", "playstation", "switch"]) {
      const labels = GamepadManager.prototype.getButtonLabels.call({ controllerType: family });
      for (const [field, action] of Object.entries(fields)) {
        expect(padGlyph(action, family).text, `${family} ${field}`).toBe(norm[labels[field]] ?? labels[field]);
      }
    }
  });

  it("maps a button back from its legend (tutorial cards)", () => {
    expect(padLabelGlyph("xbox", "A")).toMatchObject({ kind: "face", index: 0 });
    expect(padLabelGlyph("playstation", "△")).toMatchObject({ kind: "face", index: 3 });
    expect(padLabelGlyph("xbox", "Q")).toBeNull();
  });
});

describe("pad layout matches what the game reads", () => {
  let pads;
  beforeEach(() => {
    pads = [];
    vi.stubGlobal("navigator", { getGamepads: () => pads, userAgent: "" });
    vi.stubGlobal("window", { addEventListener: () => {}, removeEventListener: () => {} });
  });
  afterEach(() => vi.unstubAllGlobals());

  // Prompt action → the poll() field js/game.js acts on for it.
  const FIELD = {
    interact: "interact", dash: "dash", crouch: "reload", chronoShift: "chronoShift",
    weaponPrev: "weaponPrev", chronoRewind: "weaponPrev", weaponNext: "weaponNext",
    aim: "aim", fire: "shoot", sprint: "sprint", chronoLock: "chronoLock", pause: "pause", minimap: "minimap",
    confirm: "interact", back: "dash", prevTab: "weaponPrev", nextTab: "weaponNext", start: "interact",
    artStyle: "reload", advance: "interact", auto: "chronoShift", skip: "dash", randomize: "reload", deploy: "chronoShift",
  };

  it.each(Object.entries(FIELD))("pressing the %s button sets poll().%s", (action, field) => {
    const index = GAMEPAD_ACTIONS[action];
    expect(typeof index).toBe("number");
    const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: i === index, value: i === index ? 1 : 0 }));
    pads[0] = { index: 0, id: "Xbox Wireless Controller (STANDARD GAMEPAD)", mapping: "standard", connected: true, timestamp: 1, buttons, axes: [0, 0, 0, 0] };
    const r = new GamepadManager().poll(0);
    expect(r[field]).toBe(true);
  });

  it("has a poll field for every numbered action", () => {
    for (const [action, index] of Object.entries(GAMEPAD_ACTIONS)) {
      if (typeof index === "number") expect(FIELD[action], action).toBeDefined();
    }
  });
});

describe("prompt text", () => {
  it("follows the device and drops actions the device has no binding for", () => {
    const game = fakeGame();
    const items = [["confirm", "return to title"], ["restart", "restart"], ["share", "share score"]];
    expect(promptText(game, items)).toBe("ENTER return to title  ·  R restart  ·  S share score");
    noteInput(game, "gamepad");
    expect(promptText(game, items)).toBe("A return to title");
    game.gamepad.controllerType = "playstation";
    expect(promptText(game, [["advance", "continue"], ["auto", "auto"], ["skip", "skip"]])).toBe("✕ continue  ·  △ auto  ·  ○ skip");
  });

  it("gives the tutorial pad cards with the pad's buttons and no keyboard verbs", () => {
    const game = fakeGame();
    const pad = tutorialStepCopy("gamepad", game);
    expect(pad.length).toBe(tutorialStepCopy(false).length);
    expect(pad[3].hint).toContain("press A");
    expect(pad[3].pad).toBe("xbox");
    for (const step of pad.slice(1)) {
      expect(step.hint).not.toMatch(/\b(mouse|click|press [EQ]\b|WASD|W A S D|SHIFT|CTRL|scroll)\b/i);
    }
  });

  it("teaches Chronos powers with the same pad table", () => {
    const game = fakeGame({ gamepad: { connected: true, controllerType: "playstation" } });
    expect(powerKeys(game, "gamepad")).toMatchObject({ shift: "hold △", dash: "○", rewind: "L1 while shifting", lock: "R3" });
  });
});
