import { describe, it, expect, beforeEach } from "vitest";
import {
  centredLook,
  aimAnglesForGame,
  reticlePoint,
  sceneShiftPx,
  currentBarH,
  updateAdsFov,
  resetAdsFov,
  getAimBlend,
  CENTRED_LOOK_LIMIT,
  CENTRED_LOOK_DOWN,
} from "../../src/systems/aim.js";
import { findAssistTarget, applyAssistPull, ASSIST_STANDARD } from "../../src/systems/aim-assist.js";
import { PlayerUpdateSystem } from "../../src/systems/player-update.js";
import { Player } from "../../src/entities/index.js";
import { WEAPONS } from "../../src/data/weapons.js";

const open = (n = 40) => Array.from({ length: n }, () => Array(n).fill(0));
function game(player = {}, entities = []) {
  return {
    player: { x: 5, y: 5, angle: 0, aimOffsetX: 0, aimOffsetY: 0, lookShiftY: 0, isAiming: false, ...player },
    settings: { fov: 70, hudStyle: 0 },
    canvas: { width: 800, height: 400 },
    entities,
    map: { grid: open() },
  };
}

/** A grid-level frame for PlayerUpdateSystem.update. */
const gridCtx = (player, over = {}) => ({
  player,
  world: null,
  map: { width: 40, height: 40, grid: open() },
  entities: [],
  keys: {},
  keybinds: { moveForward: "KeyW", moveBack: "KeyS", moveLeft: "KeyA", moveRight: "KeyD", sprint: "ShiftLeft", crouch: "ControlLeft" },
  mouse: { dx: 0, dy: 0 },
  settings: { sensitivity: 1 },
  mode: "arena",
  audio: { setFootstepCadence() {}, updateFootsteps() {}, playerGrunt() {} },
  ...over,
});

beforeEach(() => resetAdsFov());

describe("centred aim (every input)", () => {
  it("turns the view with a sideways drag and keeps the reticle in the middle", () => {
    const g = game();
    centredLook(g.player, 100, 0, {});
    expect(g.player.angle).toBeGreaterThan(0.2);
    expect(g.player.aimOffsetX).toBe(0);
    const r = reticlePoint(800, 400, 0, g.player);
    expect(r).toEqual({ x: 400, y: 200 });
  });

  it("a mouse delta turns the view at CENTRED_LOOK_RATE and leaves the reticle centred", () => {
    const sys = new PlayerUpdateSystem();
    const p = new Player(5.5, 5.5);
    sys.look({ player: p, mouse: { dx: 100, dy: 0 }, settings: { sensitivity: 1 } });
    expect(p.angle).toBeCloseTo(0.33, 3);
    expect(p.aimOffsetX).toBe(0);
    expect(reticlePoint(800, 400, 0, p)).toEqual({ x: 400, y: 200 });
  });

  it("walking never moves the reticle", () => {
    const sys = new PlayerUpdateSystem();
    const p = new Player(20.5, 20.5);
    const ctx = gridCtx(p);
    // A flick first, then a second of walking with the mouse still.
    ctx.mouse.dx = 40;
    ctx.mouse.dy = -30;
    sys.update(ctx, 1 / 60);
    ctx.keys.KeyW = true;
    for (let i = 0; i < 60; i++) {
      expect(p.aimOffsetX).toBe(0);
      expect(p.aimOffsetY).toBe(0);
      sys.update(ctx, 1 / 60);
    }
    expect(p.aimOffsetX).toBe(0);
    expect(p.aimOffsetY).toBe(0);
    expect(Math.hypot(p.x - 20.5, p.y - 20.5)).toBeGreaterThan(1);
  });

  it("aiming in and out leaves the view where it was", () => {
    const sniper = WEAPONS.find((w) => w.id === 5);
    const p = { x: 5, y: 5, angle: 1.2, aimOffsetX: 0, aimOffsetY: 0, lookShiftY: 0.1, isAiming: true, getWeaponDef: () => sniper };
    for (let i = 0; i < 30; i++) {
      updateAdsFov(p, 1 / 60, { fov: 70 });
      expect(reticlePoint(800, 400, 0, p)).toEqual({ x: 400, y: 200 });
    }
    expect(getAimBlend()).toBe(1);
    p.isAiming = false;
    for (let i = 0; i < 60 && getAimBlend() > 0; i++) {
      updateAdsFov(p, 1 / 60, { fov: 70 });
      expect(reticlePoint(800, 400, 0, p)).toEqual({ x: 400, y: 200 });
    }
    expect(getAimBlend()).toBe(0);
    // The scope's breath turned the view on the way; all of it is handed back.
    expect(p.angle).toBeCloseTo(1.2, 12);
    expect(p.lookShiftY).toBeCloseTo(0.1, 12);
  });

  /** Walk `seconds` with the sniper aimed at a step of `dt`; returns the player. */
  function swayRun(dt, seconds = 2) {
    resetAdsFov();
    const sniper = WEAPONS.find((w) => w.id === 5);
    const p = { x: 5, y: 5, angle: 0, aimOffsetX: 0, aimOffsetY: 0, lookShiftY: 0, isAiming: true, getWeaponDef: () => sniper };
    const angles = new Set();
    const shifts = new Set();
    const n = Math.round(seconds / dt);
    for (let i = 0; i < n; i++) {
      p.x += 3 * dt; // walking: the breath at its widest
      updateAdsFov(p, dt, { fov: 70 });
      expect(p.aimOffsetX).toBe(0);
      expect(p.aimOffsetY).toBe(0);
      expect(reticlePoint(800, 400, 0, p)).toEqual({ x: 400, y: 200 });
      angles.add(p.angle.toFixed(5));
      shifts.add(p.lookShiftY.toFixed(5));
    }
    return { p, angles, shifts };
  }

  it("scope sway never moves the reticle off centre", () => {
    expect(WEAPONS.find((w) => w.id === 5).scope).toBe(true);
    const { p, angles, shifts } = swayRun(1 / 60);
    // The breath moves the view instead.
    expect(angles.size).toBeGreaterThan(10);
    expect(shifts.size).toBeGreaterThan(10);
    // And hands all of it back when the sights come down: no drift.
    p.isAiming = false;
    for (let i = 0; i < 60 && getAimBlend() > 0; i++) updateAdsFov(p, 1 / 60, { fov: 70 });
    expect(getAimBlend()).toBe(0);
    expect(Math.abs(p.angle)).toBeLessThan(1e-9);
    expect(Math.abs(p.lookShiftY)).toBeLessThan(1e-9);
  });

  it("scope sway lands the same at any frame rate", () => {
    const fast = swayRun(1 / 144).p;
    const slow = swayRun(1 / 30).p;
    const mid = swayRun(1 / 60).p;
    // The sway swings about 3.5 milliradians (0.01 of the view through the
    // 4x scope) and follows the clock, not the frame count: after 2 s the
    // runs agree to rounding (~1e-16), so 5e-10 (a millionth of the swing)
    // still catches a sway that steps per frame.
    expect(Math.abs(mid.angle)).toBeGreaterThan(1e-3);
    expect(fast.angle).toBeCloseTo(slow.angle, 9);
    expect(fast.lookShiftY).toBeCloseTo(slow.lookShiftY, 9);
    expect(mid.angle).toBeCloseTo(slow.angle, 9);
  });

  it("looks up by moving the world, and the shot follows the world", () => {
    const g = game();
    centredLook(g.player, 0, -60, {});
    expect(g.player.lookShiftY).toBeLessThan(0);
    // The world is drawn lower under the fixed reticle, so the aim rises.
    expect(sceneShiftPx(g.player, 400)).toBeGreaterThan(0);
    expect(aimAnglesForGame(g).pitch).toBeGreaterThan(0);
  });

  it("stops looking up or down at its limit", () => {
    const g = game();
    centredLook(g.player, 0, -10000, {});
    expect(g.player.lookShiftY).toBe(-CENTRED_LOOK_LIMIT);
    centredLook(g.player, 0, 20000, {});
    expect(g.player.lookShiftY).toBe(CENTRED_LOOK_DOWN);
  });

  it("looks further down than up, to the floor a short phone view leaves off", () => {
    expect(CENTRED_LOOK_DOWN).toBeGreaterThan(CENTRED_LOOK_LIMIT);
    const g = game();
    centredLook(g.player, 0, 20000, {});
    // ~39° down: past the 23° that left the floor at your feet off screen.
    expect((aimAnglesForGame(g).pitch * 180) / Math.PI).toBeLessThan(-35);
  });

  it("inverts each axis on its own setting", () => {
    const a = game().player;
    const b = game().player;
    centredLook(a, 30, 30, {});
    centredLook(b, 30, 30, { invertX: true, invertY: true });
    expect(Math.sign(b.angle)).toBe(-Math.sign(a.angle));
    expect(Math.sign(b.lookShiftY)).toBe(-Math.sign(a.lookShiftY));
  });

  it("shoots through the reticle on a phone whose scene is drawn at its pixel ratio", () => {
    // An iPhone in Safari: the HUD is 852x276 CSS px, the scene canvas 2x that.
    const g = { ...game(), isTouchDevice: true, hudW: 852, hudH: 276, canvas: { width: 1704, height: 552 } };
    g.settings = { fov: 100, hudStyle: 4, hudScale: 75 };
    // The HUD draws the reticle above the phone's 45 px bar...
    const bar = Math.round(60 * 0.75);
    const ry = reticlePoint(852, 276, bar, g.player).y;
    // ...and the shot's pitch is the one the renderer puts on that row.
    expect(currentBarH(g)).toBeCloseTo(bar * 2, 6);
    const rowY = 276 / 2 - Math.tan(aimAnglesForGame(g).pitch) * 276;
    expect(rowY).toBeCloseTo(ry, 6);
  });

  it("leans the look, not the reticle, toward a target", () => {
    const e = { type: "enemy", active: true, state: "chase", x: 15, y: 5, enemyType: "drone", def: {} };
    const g = game({}, [e]);
    g.player.lookShiftY = 0.08; // looking a little low
    const before = findAssistTarget(g);
    for (let i = 0; i < 30; i++) applyAssistPull(g, findAssistTarget(g), ASSIST_STANDARD, 1 / 60, 1);
    const after = findAssistTarget(g);
    expect(g.player.aimOffsetY).toBe(0);
    expect(Math.abs(after.dPitch)).toBeLessThan(Math.abs(before.dPitch));
  });
});
