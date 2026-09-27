import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  GAMEPAD_ACTIONS,
  PAD,
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
import { Game, GameState } from "../../js/game.js";
import { Player } from "../../js/entities.js";
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
  return { connected: true, moveX: 0, moveY: 0, lookX: 0, lookY: 0, anyButton: false, pressed: {}, justPressed: {} };
}

/** A standard pad with `down` (button indices) held. */
const stdPad = (down = [], timestamp = 1) => ({
  index: 0, id: "Xbox Wireless Controller (STANDARD GAMEPAD)", mapping: "standard", connected: true, timestamp,
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: down.includes(i), value: down.includes(i) ? 1 : 0 })),
  axes: [0, 0, 0, 0],
});

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
    trackGamepad(game, { ...idlePoll(), anyButton: true });
    expect(activeDevice(game)).toBe("gamepad");
    noteInput(game, "keyboard");
    trackGamepad(game, { ...idlePoll(), lookX: 0.3 });
    expect(activeDevice(game)).toBe("gamepad");
  });

  it("ignores an idle or unplugged pad", () => {
    expect(padActive(idlePoll())).toBe(false);
    expect(padActive({ ...idlePoll(), connected: false, anyButton: true })).toBe(false);
    expect(padActive({ ...idlePoll(), anyButton: true })).toBe(true);
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
    trackGamepad(game, { ...idlePoll(), anyButton: true });
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
    expect(padGlyph("dash", "xbox")).toMatchObject({ text: "A", kind: "face", color: "#5fb33f" });
    expect(padGlyph("crouch", "xbox")).toMatchObject({ text: "B", kind: "face", color: "#d9352c" });
    expect(padGlyph("interact", "xbox")).toMatchObject({ text: "X", kind: "face", color: "#2f7fd8" });
    expect(padGlyph("weaponNext", "xbox")).toMatchObject({ text: "Y", kind: "face", color: "#e6b422" });
    expect(padGlyph("chronoShift", "xbox")).toMatchObject({ text: "LB", kind: "pill" });
    expect(padGlyph("weaponPrev", "xbox")).toMatchObject({ text: "RB", kind: "pill" });
    expect(padGlyph("fire", "xbox")).toMatchObject({ text: "RT", kind: "pill" });
    expect(padGlyph("pause", "xbox").text).toBe("☰");
    expect(padGlyph("minimap", "xbox").text).toBe("⧉");
    expect(padGlyph("navigateV", "xbox")).toMatchObject({ text: "✚↕", kind: "dpad" });
  });

  it("names PlayStation and Switch buttons by their own legends", () => {
    expect(["dash", "crouch", "interact", "weaponNext"].map((a) => padGlyph(a, "playstation").text)).toEqual(["✕", "○", "□", "△"]);
    expect(["chronoShift", "weaponPrev", "aim", "fire", "pause", "minimap"].map((a) => padGlyph(a, "playstation").text))
      .toEqual(["L1", "R1", "L2", "R2", "OPTIONS", "SHARE"]);
    // Switch: the bottom face button is B, the right one A.
    expect(["dash", "crouch", "interact", "weaponNext"].map((a) => padGlyph(a, "switch").text)).toEqual(["B", "A", "Y", "X"]);
    expect(["aim", "fire", "pause", "minimap"].map((a) => padGlyph(a, "switch").text)).toEqual(["ZL", "ZR", "+", "−"]);
    expect(glyph(fakeGame({ gamepad: { connected: true, controllerType: "generic" } }), "dash", "gamepad").text).toBe("A");
  });

  it("agrees with js/gamepad.js getButtonLabels for every family", () => {
    for (const family of ["xbox", "playstation", "switch"]) {
      const labels = GamepadManager.prototype.getButtonLabels.call({ controllerType: family, bindings: GAMEPAD_ACTIONS });
      for (const [action, index] of Object.entries(GAMEPAD_ACTIONS)) {
        if (typeof index === "number" && index < PAD.UP) expect(labels[action], `${family} ${action}`).toBe(padGlyph(action, family).text);
      }
    }
  });

  it("maps a button back from its legend (tutorial cards)", () => {
    expect(padLabelGlyph("xbox", "A")).toMatchObject({ kind: "face", index: 0 });
    expect(padLabelGlyph("playstation", "△")).toMatchObject({ kind: "face", index: 3 });
    expect(padLabelGlyph("xbox", "Q")).toBeNull();
  });
});

describe("the binding table drives the game", () => {
  let pads;
  beforeEach(() => {
    pads = [];
    vi.stubGlobal("navigator", { getGamepads: () => pads, userAgent: "" });
    vi.stubGlobal("window", { addEventListener: () => {}, removeEventListener: () => {} });
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each(Object.entries(GAMEPAD_ACTIONS).filter(([, i]) => typeof i === "number"))(
    "pressing %s's button (%i) sets poll().pressed and justPressed for it",
    (action, index) => {
      pads[0] = stdPad([index]);
      const r = new GamepadManager().poll(0);
      expect(r.pressed[action]).toBe(true);
      expect(r.justPressed[action]).toBe(true);
    },
  );

  it("edges once per press, held until release", () => {
    pads[0] = stdPad([PAD.LB]);
    const gm = new GamepadManager();
    expect(gm.poll(0).justPressed.chronoShift).toBe(true);
    pads[0] = stdPad([PAD.LB], 2);
    const r = gm.poll(16);
    expect(r.justPressed.chronoShift).toBe(false);
    expect(r.pressed.chronoShift).toBe(true);
    pads[0] = stdPad([], 3);
    expect(gm.poll(32).pressed.chronoShift).toBe(false);
  });

  it("reads the triggers as held past 0.1", () => {
    pads[0] = stdPad();
    pads[0].buttons[PAD.RT] = { pressed: false, value: 0.3 };
    pads[0].buttons[PAD.LT] = { pressed: false, value: 0.05 };
    const r = new GamepadManager().poll(0);
    expect(r.pressed.fire).toBe(true);
    expect(r.pressed.aim).toBe(false);
  });

  it("is the one source: rebinding an action moves both the behaviour and its glyph", () => {
    const was = GAMEPAD_ACTIONS.dash;
    try {
      GAMEPAD_ACTIONS.dash = PAD.RS;
      expect(padGlyph("dash", "xbox").text).toBe("RS");
      pads[0] = stdPad([PAD.RS]);
      expect(new GamepadManager().poll(0).justPressed.dash).toBe(true);
      pads[0] = stdPad([PAD.A]);
      expect(new GamepadManager().poll(0).justPressed.dash).toBe(false);
    } finally {
      GAMEPAD_ACTIONS.dash = was;
    }
  });
});

describe("default pad layout in play", () => {
  let pads;
  beforeEach(() => {
    pads = [];
    vi.stubGlobal("navigator", { getGamepads: () => pads, userAgent: "" });
    vi.stubGlobal("window", { addEventListener: () => {}, removeEventListener: () => {} });
  });
  afterEach(() => vi.unstubAllGlobals());

  /** Just enough of a Game for _updateGamepadInput, in `state`. */
  function padGame(state = GameState.PLAYING) {
    const player = new Player();
    player.weapons = [0, 1, 2];
    const calls = [];
    const note = (name) => () => calls.push(name);
    const game = {
      state, mode: "campaign", settings: { gamepadEnabled: true }, gamepad: new GamepadManager(),
      keybinds: { ...DEFAULT_KEYBINDS }, keys: {}, mouse: { dx: 0, dy: 0 }, player, calls,
      _gamepadPrevKeys: new Set(), _gamepadNextKeys: new Set(), _lastGamepadMove: { x: 0, y: 0 },
      chronoPowers: { has: (p) => p === "rewind" },
      triggerDash: note("dash"), interact: note("interact"), chronoRewind: note("rewind"), chronoLock: note("lock"),
      toggleCutsceneAuto: note("auto"),
      handleKeyPress: (code) => calls.push(`key:${code}`),
    };
    for (const m of ["_updateGamepadInput", "_setGamepadKey", "_releaseGamepadKeys", "_inputWheel"]) game[m] = Game.prototype[m];
    return game;
  }
  let t = 1;
  /** One frame with `down` held. */
  function frame(game, down) {
    pads[0] = stdPad(down, ++t);
    game.player.trackWeapon();
    game._updateGamepadInput(1 / 60);
  }
  const press = (game, button) => {
    frame(game, [button]);
    frame(game, []);
  };

  it("A dashes, X interacts, B holds crouch, R3 locks, Start pauses", () => {
    const game = padGame();
    press(game, PAD.A);
    press(game, PAD.X);
    press(game, PAD.RS);
    press(game, PAD.MENU);
    expect(game.calls).toEqual(["dash", "interact", "lock", `key:${DEFAULT_KEYBINDS.pause}`]);
    frame(game, [PAD.B]);
    expect(game.keys[DEFAULT_KEYBINDS.crouch]).toBe(true);
    frame(game, []);
    expect(game.keys[DEFAULT_KEYBINDS.crouch]).toBe(false);
  });

  it("LB holds chrono shift, and RB rewinds only while shifting with Nova's power", () => {
    const game = padGame();
    frame(game, [PAD.LB]);
    expect(game.keys[DEFAULT_KEYBINDS.chronoShift]).toBe(true);
    game.player.chronoActive = true;
    frame(game, [PAD.LB, PAD.RB]);
    // The shift key goes down like a keyboard press (it is the keyboard's key).
    const shiftKey = `key:${DEFAULT_KEYBINDS.chronoShift}`;
    expect(game.calls).toEqual([shiftKey, "rewind"]);
    expect(game.player.currentWeapon).toBe(0);
    game.player.chronoActive = false;
    frame(game, []);
    expect(game.keys[DEFAULT_KEYBINDS.chronoShift]).toBe(false);
    press(game, PAD.RB); // not shifting: previous weapon
    expect(game.player.currentWeapon).toBe(2);
    game.chronoPowers.has = () => false;
    game.player.chronoActive = true;
    press(game, PAD.RB); // no rewind yet: still previous weapon
    expect(game.player.currentWeapon).toBe(1);
    expect(game.calls).toEqual([shiftKey, "rewind"]);
  });

  it("Y and the d-pad switch weapons; up returns to the last one, down to slot 1", () => {
    const game = padGame();
    const p = game.player;
    press(game, PAD.Y);
    expect(p.currentWeapon).toBe(1);
    press(game, PAD.RIGHT);
    expect(p.currentWeapon).toBe(2);
    press(game, PAD.LEFT);
    expect(p.currentWeapon).toBe(1);
    press(game, PAD.UP);
    expect(p.currentWeapon).toBe(2);
    press(game, PAD.UP);
    expect(p.currentWeapon).toBe(1);
    press(game, PAD.DOWN);
    expect(p.currentWeapon).toBe(0);
    press(game, PAD.UP);
    expect(p.currentWeapon).toBe(1);
  });

  it("keeps A confirm, B back and the bumpers as tabs in menus", () => {
    const game = padGame(GameState.SETTINGS);
    press(game, PAD.A);
    press(game, PAD.B);
    press(game, PAD.LB);
    press(game, PAD.RB);
    expect(game.calls).toEqual(["key:Enter", "key:Escape", "key:KeyQ", "key:KeyE"]);
    expect(game.keys[DEFAULT_KEYBINDS.chronoShift]).toBeFalsy();
  });

  it("keeps A advance, Y auto and B skip in cutscenes", () => {
    const game = padGame(GameState.CUTSCENE);
    press(game, PAD.A);
    press(game, PAD.Y);
    press(game, PAD.B);
    expect(game.calls).toEqual(["key:Enter", "auto", "key:Escape"]);
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
    expect(pad[3].hint).toContain("press X");
    expect(pad[7].hint).toContain("press Y");
    expect(pad[9].hint).toContain("Hold B");
    expect(pad[11].hint).toContain("Tap A");
    expect(pad[12].hint).toContain("Hold LB");
    expect(pad[3].pad).toBe("xbox");
    for (const step of pad.slice(1)) {
      expect(step.hint).not.toMatch(/\b(mouse|click|press [EQ]\b|WASD|W A S D|SHIFT|CTRL|scroll)\b/i);
    }
  });

  it("teaches Chronos powers with the same pad table", () => {
    const game = fakeGame({ gamepad: { connected: true, controllerType: "playstation" } });
    expect(powerKeys(game, "gamepad")).toMatchObject({ shift: "hold L1", dash: "✕", rewind: "R1 while shifting", lock: "R3" });
    expect(powerKeys(fakeGame(), "gamepad")).toMatchObject({ shift: "hold LB", dash: "A", rewind: "RB while shifting", lock: "RS" });
  });
});
