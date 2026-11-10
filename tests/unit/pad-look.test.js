import { describe, it, expect, beforeEach } from "vitest";
import { Game, GameState } from "../../js/game.js";
import { TouchControls } from "../../js/touch.js";
import { Player } from "../../src/entities/index.js";
import { DEFAULT_KEYBINDS } from "../../src/systems/input-manager.js";
import { padLook, padAim, PAD_TURN_MAX } from "../../src/systems/pad-look.js";
import { centredLook, resetAdsFov } from "../../src/systems/aim.js";
import { ASSIST_OFF, ASSIST_STANDARD } from "../../src/systems/aim-assist.js";
import { PlayerUpdateSystem } from "../../src/systems/player-update.js";
import { DEFAULT_SETTINGS } from "../../src/settings/registry.js";

const open = (n = 40) => Array.from({ length: n }, () => Array(n).fill(0));
const enemy = (x, y) => ({ type: "enemy", active: true, state: "chase", x, y, enemyType: "drone", def: {} });
// hudStyle 0: no HUD bar lifting the aim row on this small canvas.
function game(settings = {}, entities = []) {
  return {
    player: { x: 5, y: 5, angle: 0, aimOffsetX: 0, aimOffsetY: 0, lookShiftY: 0, isAiming: false },
    settings: { ...DEFAULT_SETTINGS, hudStyle: 0, ...settings },
    canvas: { width: 800, height: 400 },
    mouse: { dx: 0, dy: 0 },
    entities,
    map: { grid: open() },
    world: null,
  };
}

/** Turn (rad) from holding the stick at (x, y) for `secs` at frame time dt, through padLook alone. */
function turn(x, y, dt, secs = 1) {
  const p = { angle: 0, lookShiftY: 0 };
  for (let t = 0; t < secs - 1e-9; t += dt) {
    const { dx, dy } = padLook(x, y, dt);
    centredLook(p, dx, dy, {});
  }
  return p.angle;
}

/** Turn from the pad as the game feeds it: stick values already scaled by Look Sensitivity. */
function gameTurn(g, x, y, dt = 1 / 60, secs = 1) {
  const look = new PlayerUpdateSystem();
  for (let t = 0; t < secs - 1e-9; t += dt) {
    padAim(g, x, y, dt);
    look.look(g);
  }
  return g.player.angle;
}

beforeEach(() => resetAdsFov());

describe("pad look", () => {
  it("full deflection turns at PAD_TURN_MAX", () => {
    expect(turn(1, 0, 1 / 60)).toBeCloseTo(2.5, 1);
    expect(Math.abs(turn(1, 0, 1 / 60) - PAD_TURN_MAX)).toBeLessThan(0.05);
  });

  it("small deflection is gentle", () => {
    const dt = 1 / 60;
    expect(padLook(0.3, 0, dt).dx).toBeLessThan(0.3 * padLook(1, 0, dt).dx * 0.5);
    expect(padLook(0.3, 0, dt).dx).toBeGreaterThan(0);
  });

  it("is frame-rate independent", () => {
    const slow = turn(1, 0, 1 / 30);
    const fast = turn(1, 0, 1 / 144);
    expect(Math.abs(slow - fast) / slow).toBeLessThan(0.01);
    expect(Math.abs(turn(0.5, 0, 1 / 30) - turn(0.5, 0, 1 / 144))).toBeLessThan(0.01);
  });

  it("keeps the stick's direction on a diagonal", () => {
    const { dx, dy } = padLook(0.6, -0.3, 1 / 60);
    expect(dy / dx).toBeCloseTo(-0.5, 6);
  });

  it("turns at PAD_TURN_MAX on default settings, whatever the mouse Sensitivity", () => {
    const sens = DEFAULT_SETTINGS.gamepadLookSensitivity;
    expect(gameTurn(game(), sens, 0)).toBeCloseTo(PAD_TURN_MAX, 1);
    expect(gameTurn(game({ sensitivity: 2 }), sens, 0)).toBeCloseTo(PAD_TURN_MAX, 1);
  });

  it("scales with the controller's Look Sensitivity, not its curve", () => {
    // gamepad.js multiplies the stick by Look Sensitivity: 4x at full stick reads 4.
    const fast = gameTurn(game({ gamepadLookSensitivity: 4 }), 4, 0);
    expect(fast).toBeCloseTo((PAD_TURN_MAX * 4) / DEFAULT_SETTINGS.gamepadLookSensitivity, 1);
    const half = gameTurn(game({ gamepadLookSensitivity: 4 }), 2, 0);
    const halfDefault = gameTurn(game(), DEFAULT_SETTINGS.gamepadLookSensitivity / 2, 0);
    expect(half / halfDefault).toBeCloseTo(4 / DEFAULT_SETTINGS.gamepadLookSensitivity, 2);
  });

  it("assist slows the pad on a target and does nothing on mouse", () => {
    const dt = 1 / 60;
    const on = game({ aimAssist: ASSIST_STANDARD }, [enemy(15, 5)]);
    const off = game({ aimAssist: ASSIST_OFF }, [enemy(15, 5)]);
    padAim(on, 1, 0, dt);
    padAim(off, 1, 0, dt);
    expect(on.mouse.dx).toBeGreaterThan(0);
    expect(on.mouse.dx).toBeLessThan(off.mouse.dx);

    // Mouse: the same flick on the same target turns the same either way.
    const look = new PlayerUpdateSystem();
    const mouseOn = game({ aimAssist: ASSIST_STANDARD }, [enemy(15, 5)]);
    const mouseOff = game({ aimAssist: ASSIST_OFF }, [enemy(15, 5)]);
    mouseOn.mouse.dx = mouseOff.mouse.dx = 40;
    look.look(mouseOn);
    look.look(mouseOff);
    expect(mouseOn.player.angle).toBe(mouseOff.player.angle);
  });

  it("pulls toward a target only while the stick moves", () => {
    const g = game({ aimAssist: ASSIST_STANDARD }, [enemy(17, 5.4)]);
    padAim(g, 0, 0, 1 / 60);
    expect(g.player.angle).toBe(0);
    expect(g.mouse.dx).toBe(0);
    padAim(g, 0.2, 0, 1 / 60);
    expect(g.player.angle).toBeGreaterThan(0);
  });
});

describe("pad look in the game loop", () => {
  /** Just enough of a Game for _updateGamepadInput, its pad stubbed to report the right stick at (lookX, lookY). */
  function padGame(lookX, lookY, world = null) {
    const player = new Player();
    Object.assign(player, { x: 5, y: 5, angle: 0, lookShiftY: 0 });
    const poll = { connected: true, moveX: 0, moveY: 0, lookX, lookY, anyButton: false, buttonPressed: -1, pressed: {}, justPressed: {} };
    const g = {
      state: GameState.PLAYING, mode: "campaign", world, player, entities: [], map: { grid: open() },
      settings: { ...DEFAULT_SETTINGS, gamepadEnabled: true },
      gamepad: { poll: () => poll }, keybinds: { ...DEFAULT_KEYBINDS }, keys: {}, mouse: { dx: 0, dy: 0 },
      _gamepadPrevKeys: new Set(), _gamepadNextKeys: new Set(), _lastGamepadMove: { x: 0, y: 0 },
      chronoPowers: { has: () => false }, handleKeyPress() {},
    };
    for (const m of ["_updateGamepadInput", "_setGamepadKey", "_releaseGamepadKeys", "_inputWheel"]) g[m] = Game.prototype[m];
    return g;
  }

  it("feeds the right stick through padLook on a grid level", () => {
    const dt = 1 / 60;
    const sens = DEFAULT_SETTINGS.gamepadLookSensitivity;
    const g = padGame(0.6 * sens, -0.3 * sens);
    g._updateGamepadInput(dt);
    // Default Look Sensitivity, no target: padLook's delta with the mouse's Sensitivity divided out.
    const want = padLook(0.6, -0.3, dt);
    expect(g.mouse.dx).toBeCloseTo(want.dx / DEFAULT_SETTINGS.sensitivity, 9);
    expect(g.mouse.dy).toBeCloseTo(want.dy / DEFAULT_SETTINGS.sensitivity, 9);
  });

  it("leaves the voxel Forge on its old linear pad look", () => {
    const dt = 1 / 60;
    const g = padGame(1.5, -0.5, {});
    g._updateGamepadInput(dt);
    expect(g.mouse.dx).toBeCloseTo(1.5 * 420 * dt, 9);
    expect(g.mouse.dy).toBeCloseTo(-0.5 * 420 * dt, 9);
  });
});

describe("touch assist with a pad connected", () => {
  /** Touch controls on a game with an enemy just off the reticle and the trigger held by `isFiring`. */
  function touchOn(isFiring) {
    const g = game({ aimAssist: ASSIST_STANDARD }, [enemy(17, 5.4)]);
    g.player.isFiring = isFiring;
    const tc = Object.create(TouchControls.prototype);
    Object.assign(tc, { game: g, activeButtons: new Set(), lookedThisFrame: false, assistTarget: null, assistLast: performance.now() - 16 });
    return tc;
  }

  it("pulls on its own fire button, not on the pad's trigger", () => {
    const pad = touchOn(true); // the pad's RT set isFiring; no finger on fire
    pad.updateAssist();
    expect(pad.game.player.angle).toBe(0);

    const touch = touchOn(true);
    touch.activeButtons.add("fire");
    touch.updateAssist();
    expect(touch.game.player.angle).toBeGreaterThan(0);
  });
});
