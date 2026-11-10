/**
 * frame-kick.test.js — a shot's kick moves the whole frame, never the aim.
 *
 * Pins:
 *   1. frameOffset (src/rendering/render-pipeline.js): screen shake, view bob
 *      and the kick's bump in one offset; with the shake setting off there is
 *      no shake in it, but the bump (not shake) still applies
 *   2. the reticle stack draws moved by that same offset, converted from the
 *      scene canvas's pixels to the HUD's, so it stays on the world point the
 *      round goes to
 *   3. aimed, the gun rides the same move (so the iron sight stays on the sight
 *      dot); at the hip it does not
 *   4. the moved reticle stack stays inside the view: a scope's tube never
 *      covers the HUD bar
 *   5. per-gun kick data drives the fire path and settles at the gun's rate
 * Where the round goes with a kick on is in aim.test.js.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { frameOffset, viewmodelOffset } from "../../src/rendering/render-pipeline.js";
import { drawReticleStack, moveWithFrame } from "../../src/ui/hud-shared.js";
import { Game } from "../../js/game.js";
import { WEAPONS } from "../../src/data/weapons.js";
import { fireWeapon } from "../../src/systems/combat-orchestrator.js";
import { updateAdsFov, resetAdsFov, getAimBlend } from "../../src/systems/aim.js";

const H = 720;
const gameWith = ({ settings = {}, player = {}, ...over } = {}) => ({
  time: 1234,
  screenShake: 0,
  settings: { screenShake: true, weaponBob: true, fov: 70, crosshair: 0, ...settings },
  player: { weaponBob: 0, cameraPunch: 0, kickSide: 0, ...player },
  ...over,
});

describe("frameOffset — one offset for the world and the reticle", () => {
  it("the bump moves world and reticle together", () => {
    const up = frameOffset(gameWith({ player: { cameraPunch: 0.05 } }), H);
    expect(up.y).toBeLessThan(0);
    // The sideways kick goes along x.
    const side = frameOffset(gameWith({ player: { kickSide: 0.01 } }), H);
    expect(Math.abs(side.x)).toBeGreaterThan(0);
    expect(side.y).toBe(0);
  });

  it("with screen shake off there is no shake offset, whatever the trauma", () => {
    for (const trauma of [0, 3, 14, 40]) {
      const g = gameWith({ screenShake: trauma, settings: { screenShake: false } });
      expect(frameOffset(g, H)).toEqual({ x: 0, y: 0, roll: 0 });
    }
  });

  it("the bump is not shake: it still applies with the shake setting off", () => {
    const on = frameOffset(gameWith({ settings: { screenShake: false }, player: { cameraPunch: 0.05 } }), H);
    expect(on.y).toBeCloseTo(0.05 * -H * 0.12, 9);
    expect(on.roll).toBe(0);
  });

  it("with screen shake on, a heavy hit moves and rolls the frame", () => {
    const g = gameWith({ screenShake: 10 });
    const o = frameOffset(g, H);
    expect(Math.hypot(o.x, o.y)).toBeGreaterThan(0.5);
    expect(o.roll).not.toBe(0);
  });

  it("view bob moves the frame while sprinting, and not with the bob setting off", () => {
    const run = { isSprinting: true, weaponBob: 1.3 };
    expect(Math.abs(frameOffset(gameWith({ player: run }), H).x)).toBeGreaterThan(0);
    expect(frameOffset(gameWith({ player: run, settings: { weaponBob: false } }), H)).toEqual({ x: 0, y: 0, roll: 0 });
  });
});

/** A 2D context that records the calls made on it and draws nothing. */
function recordingCtx(width, height) {
  const calls = [];
  const target = {
    canvas: { width, height },
    globalAlpha: 1,
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    measureText: () => ({ width: 0 }),
  };
  const ctx = new Proxy(target, {
    get(t, k) {
      if (k in t) return t[k];
      return (...args) => calls.push([k, ...args]);
    },
    set(t, k, v) {
      t[k] = v;
      return true;
    },
  });
  return { ctx, calls };
}

describe("the reticle moves with the frame", () => {
  // The HUD is drawn in CSS pixels (game.hudW/hudH); the scene canvas at its
  // render size, here twice that.
  const hud = { hudW: 640, hudH: 360, canvas: { width: 1280, height: 720 } };

  it("converts the scene offset to HUD pixels and rolls about the same point", () => {
    const { ctx, calls } = recordingCtx(640, 360);
    moveWithFrame(ctx, { ...hud, _frameOffset: { x: 8, y: -12, roll: 0.01 } }, 640, 360);
    expect(calls).toEqual([
      ["translate", 4, -6],
      ["translate", 320, 180],
      ["rotate", 0.01],
      ["translate", -320, -180],
    ]);
  });

  it("does nothing without an offset", () => {
    const { ctx, calls } = recordingCtx(640, 360);
    moveWithFrame(ctx, { ...hud }, 640, 360);
    moveWithFrame(ctx, { ...hud, _frameOffset: { x: 0, y: 0, roll: 0 } }, 640, 360);
    expect(calls).toEqual([]);
  });

  for (const shake of [true, false]) {
    it(`the crosshair and hit marker draw moved, screen shake ${shake ? "on" : "off"}`, () => {
      const wep = WEAPONS[0];
      const game = gameWith({
        ...hud,
        settings: { screenShake: shake },
        screenShake: 8,
        player: { cameraPunch: 0.02, kickSide: 0.004, getWeaponDef: () => wep },
      });
      game._frameOffset = frameOffset(game, hud.canvas.height);
      const { ctx, calls } = recordingCtx(640, 360);
      drawReticleStack(ctx, game, { hitMarker: 0.1 }, 640, 360, 0);
      const names = calls.map((c) => c[0]);
      const moved = names.indexOf("translate");
      expect(moved).toBeGreaterThanOrEqual(0);
      // Moved before anything is drawn, and put back after.
      const firstDraw = names.findIndex((n) => /^(stroke|fill|fillRect|strokeRect|arc|moveTo|lineTo)$/.test(n));
      expect(moved).toBeLessThan(firstDraw);
      expect(names.lastIndexOf("restore")).toBeGreaterThan(names.lastIndexOf("stroke"));
      const [, tx, ty] = calls[moved];
      expect(tx).toBeCloseTo(game._frameOffset.x / 2, 9);
      expect(ty).toBeCloseTo(game._frameOffset.y / 2, 9);
    });
  }
});

describe("the gun rides the frame when aimed", () => {
  const off = { x: 6, y: -10, roll: 0.004 };

  it("not at all from the hip", () => {
    const g = viewmodelOffset(off, 0);
    expect([g.x, g.y, g.roll].every((v) => v === 0)).toBe(true);
  });

  it("all of it fully aimed, matching the reticle's move", () => {
    expect({ ...viewmodelOffset(off, 1) }).toEqual(off);
  });

  it("in proportion on the way up", () => {
    const g = viewmodelOffset(off, 0.25);
    expect(g.x).toBeCloseTo(1.5, 9);
    expect(g.y).toBeCloseTo(-2.5, 9);
    expect(g.roll).toBeCloseTo(0.001, 9);
    // Out-of-range blends are held to [0, 1].
    expect({ ...viewmodelOffset(off, 1.4) }).toEqual(off);
  });
});

describe("the reticle stack stays in the view", () => {
  it("a scoped sniper over the Classic bar draws nothing below the view", () => {
    const sniper = WEAPONS.find((w) => w.scope);
    resetAdsFov();
    const aimer = { isAiming: true, getWeaponDef: () => sniper };
    for (let i = 0; i < 90; i++) updateAdsFov(aimer, 1 / 60, { fov: 70 });
    expect(getAimBlend()).toBe(1);
    const W = 1280, Hh = 720, barH = 160;
    const game = gameWith({
      hudW: W, hudH: Hh, canvas: { width: W, height: Hh },
      player: { cameraPunch: 0.05, isAiming: true, getWeaponDef: () => sniper },
    });
    game._frameOffset = frameOffset(game, Hh);
    const { ctx, calls } = recordingCtx(W, Hh);
    drawReticleStack(ctx, game, {}, W, Hh, barH);
    resetAdsFov();
    const names = calls.map((c) => c[0]);
    // Clipped to the view above the bar before anything is moved or drawn...
    const clip = names.indexOf("clip");
    expect(clip).toBeGreaterThan(0);
    expect(calls[clip - 1]).toEqual(["rect", 0, 0, W, Hh - barH]);
    expect(clip).toBeLessThan(names.indexOf("translate"));
    // ...and the scope (its oversized tube) is drawn inside that clip.
    const tube = calls.findIndex((c) => c[0] === "rect" && c[1] < 0 && c[2] < 0);
    expect(tube).toBeGreaterThan(clip);
    // The clip is not lifted until the stack is done.
    const restores = names.map((n, i) => (n === "restore" ? i : -1)).filter((i) => i >= 0);
    expect(restores.at(-1)).toBeGreaterThan(tube);
    expect(names.slice(clip + 1).filter((n) => n === "save").length).toBe(names.slice(clip + 1).filter((n) => n === "restore").length - 1);
  });
});

describe("per-gun kick", () => {
  it("every gun carries kick data", () => {
    for (const w of WEAPONS) {
      expect(w.kick, w.name).toBeTruthy();
      for (const k of ["view", "side", "settle", "shove", "shake"]) expect(typeof w.kick[k], `${w.name} ${k}`).toBe("number");
    }
  });

  it("the shotgun kicks harder than the pistol", () => {
    const [pistol, shotgun] = [WEAPONS[0].kick, WEAPONS[1].kick];
    for (const k of ["view", "side", "shove", "shake"]) expect(shotgun[k]).toBeGreaterThan(pistol[k]);
    // Heavier: slower to settle (a higher per-frame retention).
    expect(shotgun.settle).toBeGreaterThan(pistol.settle);
  });

  afterEach(() => vi.restoreAllMocks());

  /** Fire one round of `wep` (a projectile gun, so no map is needed). */
  const fire = (wep, over = {}) => {
    const player = {
      x: 2.5, y: 2.5, angle: 0, aimOffsetX: 0, aimOffsetY: 0, pitch: 0,
      weapons: [wep.id], currentWeapon: 0, ammo: 99, lastFireTime: -1e9,
      damageMultiplier: 1, fireRateMultiplier: 1, cameraPunch: 0, kickSide: 0,
      getWeaponDef: () => wep,
      ...over,
    };
    const game = {
      time: 1000, mode: "campaign", player, settings: { fov: 70 }, canvas: { height: 720 },
      audio: new Proxy({}, { get: () => () => {} }), achievementStats: { totalShotsFired: 0 }, shotsFired: 0,
      projectiles: [], entities: [], screenShake: 0,
      _spawnMuzzleFlash: () => {}, getCharacterColor: () => ({}),
    };
    fireWeapon(game);
    return game;
  };

  it("a shot kicks by its gun's own numbers, half as much aimed", () => {
    const wep = { ...WEAPONS[7], kick: { view: 0.033, side: 0.01, settle: 0.7, shove: 1, shake: 3.3 } };
    vi.spyOn(Math, "random").mockReturnValue(1);
    const hip = fire(wep);
    expect(hip.screenShake).toBe(3.3);
    expect(hip.player.cameraPunch).toBeCloseTo(0.033, 9);
    expect(Math.abs(hip.player.kickSide)).toBeCloseTo(0.01, 9);
    const aimed = fire(wep, { isAiming: true });
    expect(aimed.player.cameraPunch).toBeCloseTo(0.0165, 9);
    expect(Math.abs(aimed.player.kickSide)).toBeCloseTo(0.005, 9);
  });

  const feel = (wep) => {
    const g = {
      weaponAnimFrame: 0,
      time: 0,
      player: { weaponKick: 1, cameraPunch: wep.kick.view, kickSide: wep.kick.side, getWeaponDef: () => wep },
    };
    return g;
  };

  it("the bump settles", () => {
    const g = feel(WEAPONS[0]);
    for (let i = 0; i < 30; i++) Game.prototype._updateWeaponFeel.call(g, 1 / 60);
    expect(g.player.cameraPunch).toBeLessThan(0.001);
    expect(Math.abs(g.player.kickSide)).toBeLessThan(0.001);
  });

  it("a heavier gun's bump settles slower", () => {
    const left = (wep) => {
      const g = feel(wep);
      for (let i = 0; i < 3; i++) Game.prototype._updateWeaponFeel.call(g, 1 / 60);
      return g.player.cameraPunch / wep.kick.view;
    };
    expect(left(WEAPONS[1])).toBeGreaterThan(left(WEAPONS[0]));
  });
});
