import { describe, it, expect, afterEach } from "vitest";
import { setCentredAim, centredLook, aimAnglesForGame, reticlePoint, sceneShiftPx, currentBarH, CENTRED_LOOK_LIMIT, CENTRED_LOOK_DOWN } from "../../src/systems/aim.js";
import { findAssistTarget, applyAssistPull, ASSIST_STANDARD } from "../../src/systems/aim-assist.js";
import { PlayerUpdateSystem } from "../../src/systems/player-update.js";

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

afterEach(() => setCentredAim(false));

describe("centred aim (touch)", () => {
  it("turns the view with a sideways drag and keeps the reticle in the middle", () => {
    const g = game();
    centredLook(g.player, 100, 0, {});
    expect(g.player.angle).toBeGreaterThan(0.2);
    expect(g.player.aimOffsetX).toBe(0);
    const r = reticlePoint(800, 400, 0, g.player);
    expect(r).toEqual({ x: 400, y: 200 });
  });

  it("looks up by moving the world, and the shot follows the world", () => {
    const g = game();
    centredLook(g.player, 0, -60, {});
    expect(g.player.lookShiftY).toBeLessThan(0);
    // The world is drawn lower under the fixed reticle, so the aim rises.
    expect(sceneShiftPx(g.player, 400)).toBeGreaterThan(0);
    expect(aimAnglesForGame(g).pitch).toBeGreaterThan(0);
    // The same pitch as the old free-aim reticle the same share of the view up.
    const free = game({ aimOffsetY: g.player.lookShiftY, lookShiftY: 0 });
    expect(aimAnglesForGame(g).pitch).toBeCloseTo(aimAnglesForGame(free).pitch, 6);
  });

  it("stops looking up or down at its limit, past where the free-aim box stopped", () => {
    const g = game();
    centredLook(g.player, 0, -10000, {});
    expect(g.player.lookShiftY).toBe(-CENTRED_LOOK_LIMIT);
    expect(CENTRED_LOOK_LIMIT).toBeGreaterThan(0.3);
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

  it("routes look input through centred aim only when it is on", () => {
    const sys = new PlayerUpdateSystem();
    const g = game();
    const mouse = { dx: 50, dy: 0 };
    sys.look({ player: g.player, mouse, settings: {} });
    expect(g.player.aimOffsetX).toBeGreaterThan(0);
    setCentredAim(true);
    const h = game();
    sys.look({ player: h.player, mouse: { dx: 50, dy: 0 }, settings: {} });
    expect(h.player.aimOffsetX).toBe(0);
    expect(h.player.angle).toBeGreaterThan(0);
  });

  it("leans the look, not the reticle, toward a target", () => {
    setCentredAim(true);
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
