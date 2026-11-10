/**
 * weapon-aim.test.js — every weapon's rounds go where its sight says.
 *
 * Pins, per weapon in src/data/weapons.js:
 *   1. the hit ray projects back onto the reticle / ADS sight pixel through
 *      the frame the renderer draws (zoomed FOV, magnified rows, eye height and
 *      recoil shift, HUD bar), hip and aimed, standing and crouched
 *   2. rounds scatter inside the cone the spread brackets draw, which closes
 *      to the weapon's adsSpread aimed (none for the precision guns); hip
 *      fire blooms per shot up to a cap and recovers in time, whatever the
 *      frame rate
 *   3. each sight magnifies by its adsZoom, the scope by 3x or more
 *   4. the reticle on a drawn head, hip or aimed, standing or crouched, near
 *      or far, is a headshot (and on the chest a body hit); the gun model is
 *      not part of the aim: it is placed for looks and only kept off the reticle
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WEAPONS } from "../../src/data/weapons.js";
import {
  aimAngles,
  reticlePoint,
  sceneShiftPx,
  updateAdsFov,
  resetAdsFov,
  effectiveAimFov,
  aimZoom,
  getAimBlend,
  currentSpread,
  noteShotBloom,
  updateBloom,
  currentBloom,
  resetBloom,
} from "../../src/systems/aim.js";
import { scatter, fireWeapon } from "../../src/systems/combat-orchestrator.js";
import { aimAnglesForGame } from "../../src/systems/aim.js";
import { Player } from "../../src/entities/index.js";
import { Game } from "../../js/game.js";
import { rayEnemyHit } from "../../src/systems/combat.js";
import { drawWeapon } from "../../js/weapon-renderer.js";
import { ENEMY_TYPES } from "../../src/data/enemies.js";
import { hitSpan, zoneAimHeight } from "../../src/systems/combat.js";
import { eyeOffsetZ } from "../../src/systems/physics.js";

const W = 1280;
const H = 720;
const settings = { fov: 70 };

const playerWith = (wep, over = {}) => ({
  x: 10, y: 10, angle: 0.7,
  aimOffsetX: 0, aimOffsetY: 0,
  crouchBlend: 0, cameraPunch: 0,
  isAiming: false,
  getWeaponDef: () => wep,
  ...over,
});

/** Settle the ADS blend (and the eased zoom) for this player. */
function settle(p) {
  for (let i = 0; i < 90; i++) updateAdsFov(p, 1 / 60, settings);
}

/**
 * Where a round on (yaw, pitch) is drawn: the raycaster's projection
 * (js/renderer.js _projectWorld) shifted by the scene's yShift, then the
 * rows magnified about the reticle row (magnifyRows in render-pipeline.js).
 */
function project(p, yaw, pitch, barH) {
  const fov = effectiveAimFov(p, settings);
  const planeMul = Math.tan((fov * Math.PI) / 360);
  const x = (W / 2) * (1 + Math.tan(yaw - p.angle) / planeMul);
  const y0 = H / 2 + sceneShiftPx(p, H) - Math.tan(pitch) * H;
  const ry = reticlePoint(W, H, barH, p).y;
  return { x, y: ry + aimZoom() * (y0 - ry) };
}

describe("the hit ray lands on the sight", () => {
  for (const wep of WEAPONS) {
    for (const aimed of [false, true]) {
      for (const crouch of [0, 1]) {
        for (const barH of [0, 160]) {
          it(`${wep.name}: ${aimed ? "aimed" : "hip"}, ${crouch ? "crouched" : "standing"}, bar ${barH}`, () => {
            resetAdsFov();
            const p = playerWith(wep, { isAiming: aimed, crouchBlend: crouch, aimOffsetX: aimed ? 0 : 0.1, aimOffsetY: -0.12 });
            settle(p);
            expect(getAimBlend()).toBe(aimed ? 1 : 0);
            p.cameraPunch = 0.03; // mid-recoil: the view and the shot kick together
            const { yaw, pitch } = aimAngles(p, effectiveAimFov(p, settings), { h: H, barH, yShift: sceneShiftPx(p, H) });
            const hit = project(p, yaw, pitch, barH);
            const sight = reticlePoint(W, H, barH, p);
            expect(hit.x).toBeCloseTo(sight.x, 6);
            expect(hit.y).toBeCloseTo(sight.y, 6);
          });
        }
      }
    }
  }

  for (const [stance, over, dist] of [["crouched", { crouchBlend: 1 }, 25], ["sliding", { crouchBlend: 1, slideBlend: 1, isSliding: true }, 5]]) {
    it(`a ${stance} round on the reticle hits the figure drawn there`, () => {
      resetAdsFov();
      const p = playerWith(WEAPONS[5], over);
      settle(p);
      const { yaw, pitch } = aimAngles(p, effectiveAimFov(p, settings), { h: H, yShift: sceneShiftPx(p, H) });
      // A head-sized target exactly where the lowered view draws the reticle's
      // point: the renderer lifts a figure by the eye's drop, so a point z up
      // the standing eye line is under the reticle when z - offset = tan·dist.
      const off = eyeOffsetZ(p);
      expect(off).toBeLessThan(-0.2);
      const head = { type: "enemy", active: true, state: "idle", x: p.x + Math.cos(yaw) * dist, y: p.y + Math.sin(yaw) * dist,
        def: { radius: 0.2, hitCenter: off + Math.tan(pitch) * dist, hitHeight: 0.1 } };
      expect(rayEnemyHit(p, Math.cos(yaw), Math.sin(yaw), 60, pitch, head, off)?.enemy).toBe(head);
      // From the standing eye the same round passes over it.
      if (stance === "sliding") expect(rayEnemyHit(p, Math.cos(yaw), Math.sin(yaw), 60, pitch, head, 0)).toBeNull();
    });
  }
});

describe("rounds scatter inside the drawn cone", () => {
  it("scatter stays inside its cone and covers it", () => {
    let far = 0;
    for (let i = 0; i < 2000; i++) {
      const [dy, dp] = scatter(0.05);
      const r = Math.hypot(dy, dp);
      expect(r).toBeLessThanOrEqual(0.05 + 1e-12);
      far = Math.max(far, r);
    }
    expect(far).toBeGreaterThan(0.045);
    expect(scatter(0)).toEqual([0, 0]);
  });

  for (const wep of WEAPONS) {
    it(`${wep.name}: hip spread at the hip, adsSpread aimed`, () => {
      resetAdsFov();
      resetBloom();
      const p = playerWith(wep);
      settle(p);
      expect(currentSpread(wep)).toBeCloseTo(wep.spread, 9);
      p.isAiming = true;
      settle(p);
      expect(currentSpread(wep)).toBeCloseTo(wep.adsSpread, 9);
      expect(wep.adsSpread).toBeLessThanOrEqual(wep.spread);
    });
  }

  it("the sniper is exact through the scope and wild from the hip", () => {
    const sniper = WEAPONS.find((w) => w.scope);
    expect(sniper.adsSpread).toBe(0);
    expect(sniper.spread).toBeGreaterThanOrEqual(0.05);
    expect(sniper.headshotMult).toBeGreaterThan(1);
  });
});

describe("Halo pacing: dead-on aimed, blooming at the hip", () => {
  const pistol = WEAPONS[0];
  /** Run the bloom's clock for `secs` in frames of `dt`. */
  const run = (secs, dt) => {
    for (let t = 0; t < secs - 1e-9; t += dt) updateBloom(Math.min(dt, secs - t));
  };
  // At the hip, with the cone closed (resetAdsFov closes the bloom too).
  beforeEach(() => resetAdsFov());

  it("an aimed precision shot has zero spread", () => {
    for (const id of [0, 2, 3, 5, 6, 7]) {
      const wep = WEAPONS[id];
      resetAdsFov();
      resetBloom();
      const p = playerWith(wep, { isAiming: true });
      settle(p);
      expect(getAimBlend()).toBe(1);
      expect(currentSpread(wep), wep.name).toBe(0);
    }
  });

  it("each hip shot adds perShot up to max", () => {
    resetBloom();
    noteShotBloom(pistol);
    expect(currentBloom()).toBeCloseTo(pistol.bloom.perShot, 12);
    for (let i = 0; i < 9; i++) noteShotBloom(pistol);
    expect(currentBloom()).toBe(0.03);
    expect(currentBloom()).toBe(pistol.bloom.max);
  });

  it("bloom holds for its delay, then recovers at recover rad/s, frame-rate independent", () => {
    for (const wep of [pistol, WEAPONS[1]]) {
      const { max, recover, delay } = wep.bloom;
      // 0.1 s frames straddle the end of the delay; one 0.45 s step jumps it.
      for (const dt of [1 / 144, 0.1, delay + 0.1]) {
        resetBloom();
        for (let i = 0; i < 10; i++) noteShotBloom(wep);
        run(delay, dt);
        expect(currentBloom(), `${wep.name} held, dt ${dt}`).toBe(max);
        resetBloom();
        for (let i = 0; i < 10; i++) noteShotBloom(wep);
        run(delay + 0.1, dt);
        expect(Math.abs(currentBloom() - (max - recover * 0.1)), `${wep.name} dt ${dt}`).toBeLessThanOrEqual(0.0005);
      }
    }
    expect(pistol.bloom.max - pistol.bloom.recover * 0.1).toBeCloseTo(0.018, 9);
  });

  it("rapid fire at 144 Hz and through a hitch never passes the cap", () => {
    for (const dt of [1 / 144, 0.1]) {
      resetBloom();
      // Firing every frame, faster than any gun can.
      for (let i = 0; i < 300; i++) {
        noteShotBloom(pistol);
        updateBloom(dt);
        expect(currentBloom()).toBeLessThanOrEqual(pistol.bloom.max);
        expect(currentBloom()).toBeGreaterThanOrEqual(0);
      }
    }
    resetBloom();
    noteShotBloom(pistol);
    updateBloom(5);
    expect(currentBloom()).toBe(0);
  });

  for (const wep of [WEAPONS[0], WEAPONS[1]]) {
    const gap = wep.fireRate / 1000;
    it(`${wep.name}: holding fire at fireRate for 3 s reaches at least 0.5 × max`, () => {
      resetBloom();
      for (let t = 0; t < 3; t += gap) {
        noteShotBloom(wep);
        run(gap, 1 / 60);
      }
      expect(currentBloom()).toBeGreaterThanOrEqual(0.5 * wep.bloom.max);
    });

    it(`${wep.name}: tapping at 2 × fireRate stays at or below perShot`, () => {
      resetBloom();
      for (let t = 0; t < 5; t += 2 * gap) {
        noteShotBloom(wep);
        expect(currentBloom()).toBeLessThanOrEqual(wep.bloom.perShot + 1e-12);
        run(2 * gap, 1 / 60);
      }
    });
  }

  it("only hip shots bloom: a fully aimed volley adds none", () => {
    resetAdsFov();
    resetBloom();
    const p = playerWith(pistol, { isAiming: true });
    settle(p);
    expect(getAimBlend()).toBe(1);
    for (let i = 0; i < 10; i++) noteShotBloom(pistol);
    expect(currentBloom()).toBe(0);
    resetAdsFov();
    noteShotBloom(pistol);
    expect(currentBloom()).toBeCloseTo(pistol.bloom.perShot, 12);
    resetBloom();
  });

  it("bloom fades with the sights", () => {
    resetAdsFov();
    resetBloom();
    const p = playerWith(pistol);
    settle(p);
    for (let i = 0; i < 10; i++) noteShotBloom(pistol);
    expect(currentSpread(pistol)).toBeCloseTo(pistol.spread + 0.03, 12);
    p.isAiming = true;
    settle(p);
    for (let i = 0; i < 10; i++) noteShotBloom(pistol);
    expect(currentBloom()).toBe(0.03);
    expect(currentSpread(pistol)).toBe(0);
    resetBloom();
  });

  it("a swap starts the new gun from its base cone", () => {
    resetAdsFov();
    resetBloom();
    const rifle = WEAPONS[2];
    settle(playerWith(rifle));
    for (let i = 0; i < 10; i++) noteShotBloom(pistol);
    expect(currentSpread(rifle)).toBeCloseTo(rifle.spread, 12);
    resetBloom();
    expect(currentBloom()).toBe(0);
  });

  it("every gun has bloom data", () => {
    for (const wep of WEAPONS) {
      const b = wep.bloom;
      expect(b, wep.name).toBeTruthy();
      expect(b.perShot).toBeGreaterThanOrEqual(0);
      expect(b.max).toBeGreaterThanOrEqual(b.perShot);
      expect(b.recover).toBeGreaterThan(0);
    }
  });
});

describe("each sight magnifies by its own zoom", () => {
  for (const wep of WEAPONS) {
    it(`${wep.name}: ${wep.adsZoom}x`, () => {
      resetAdsFov();
      const p = playerWith(wep, { isAiming: true });
      settle(p);
      const tanHip = Math.tan((settings.fov * Math.PI) / 360);
      const tanAds = Math.tan((effectiveAimFov(p, settings) * Math.PI) / 360);
      expect(tanHip / tanAds).toBeCloseTo(wep.adsZoom, 3);
      expect(aimZoom()).toBeCloseTo(wep.adsZoom, 3);
    });
  }

  it("the scope is a real scope; the rest stay modest", () => {
    for (const wep of WEAPONS) {
      if (wep.scope) expect(wep.adsZoom).toBeGreaterThanOrEqual(3);
      else expect(wep.adsZoom).toBeLessThanOrEqual(1.6);
    }
    resetAdsFov();
  });
});

describe("a scoped weapon hides its model", () => {
  const mockCtx = () => {
    const noop = vi.fn();
    const calls = [];
    return {
      calls,
      save: noop, restore: noop, rotate: noop,
      translate: (x, y) => calls.push(["t", x, y]),
      scale: (x, y) => calls.push(["s", x, y]),
      beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
      arc: noop, ellipse: noop, quadraticCurveTo: noop, bezierCurveTo: noop,
      fill: noop, stroke: noop, clip: noop, fillRect: noop, strokeRect: noop, clearRect: noop,
      fillText: noop, strokeText: noop, measureText: vi.fn(() => ({ width: 40 })),
      createLinearGradient: vi.fn(() => ({ addColorStop: noop })),
      createRadialGradient: vi.fn(() => ({ addColorStop: noop })),
      setTransform: noop, resetTransform: noop, drawImage: noop, roundRect: noop,
      globalAlpha: 1, canvas: { width: W, height: H },
    };
  };

  it("behind the scope, aimed", () => {
    const ctx = mockCtx();
    drawWeapon(ctx, W, H, { wep: WEAPONS.find((w) => w.scope), energyColor: "#fff", isAiming: true, drawGlow: vi.fn() });
    expect(ctx.calls).toHaveLength(0);
  });
});

/**
 * The reticle is the aim: put it on the head of a figure as the raycaster
 * draws it (a point z above the eye line, `dist` ahead, sits at
 * h/2 + yShift - z/dist·h; the ADS row stretch keeps the reticle row fixed),
 * fire through it, and the round must land in the head zone.
 */
describe("the reticle on a head is a headshot", () => {
  const humanoid = (type, p, yaw, dist) => ({
    type: "enemy", active: true, state: "idle", enemyType: type, def: ENEMY_TYPES[type],
    x: p.x + Math.cos(yaw) * dist, y: p.y + Math.sin(yaw) * dist, angle: yaw + Math.PI,
  });
  /** The height (from the eye line) of the chest: between the legs and the head. */
  const chest = (e) => {
    const [bottom, top] = hitSpan(e);
    return bottom + (0.65 / 1.05) * (top - bottom);
  };

  for (const wep of WEAPONS) {
    for (const aimed of [false, true]) {
      for (const crouch of [0, 1]) {
        it(`${wep.name}: ${aimed ? "aimed" : "hip"}, ${crouch ? "crouched" : "standing"}`, () => {
          resetAdsFov();
          const p = playerWith(wep, { isAiming: aimed, crouchBlend: crouch, aimOffsetX: aimed ? 0 : 0.06 });
          settle(p);
          for (const barH of [0, 160]) {
            for (const type of ["henchman", "corruptCop", "sentinel"]) {
              for (const dist of [3, 8, 15]) {
                for (const [zone, height] of [["head", (e) => zoneAimHeight(e, "head")], ["body", chest]]) {
                  const viewH = H - barH;
                  const yaw0 = aimAngles(p, effectiveAimFov(p, settings), { h: H, barH }).yaw;
                  const e = humanoid(type, p, yaw0, dist);
                  // The reticle on the drawn point.
                  // Drawn from the player's eye: lifted by its drop under the standing eye line.
                  const off = eyeOffsetZ(p);
                  const row = H / 2 + sceneShiftPx(p, H) - ((height(e) - off) / dist) * H;
                  p.aimOffsetY = (row - viewH / 2) / viewH;
                  const { yaw, pitch } = aimAngles(p, effectiveAimFov(p, settings), { h: H, barH, yShift: sceneShiftPx(p, H) });
                  const hit = rayEnemyHit(p, Math.cos(yaw), Math.sin(yaw), 60, pitch, e, off);
                  // Face on, the Sentinel's plate covers its chest and its
                  // head shows only through the visor slit.
                  const want = type === "sentinel" ? (zone === "head" ? "visor" : "armor") : zone;
                  expect(hit?.zone.name, `${type} at ${dist} m, bar ${barH}, ${zone}`).toBe(want);
                }
              }
            }
          }
        });
      }
    }
  }
});

describe("bloom wiring", () => {
  /** A game around a real Player holding `ids`, with projectiles going nowhere. */
  function makeGame(ids) {
    const player = new Player(2.5, 2.5, 0.3);
    player.weapons = ids;
    player.currentWeapon = 0;
    return {
      time: 10000, mode: "campaign", player, settings: { fov: 70 }, canvas: { height: 720 },
      audio: new Proxy({}, { get: () => () => {} }),
      achievementStats: { totalShotsFired: 0 }, shotsFired: 0,
      projectiles: [], entities: [], screenShake: 0, map: { width: 1, height: 1, grid: [[1]] },
      _spawnMuzzleFlash: () => {}, getCharacterColor: () => ({}),
    };
  }

  it("a hip shot through fireWeapon opens the cone by perShot", () => {
    resetAdsFov();
    resetBloom();
    const g = makeGame([0]);
    fireWeapon(g);
    expect(g.shotsFired).toBe(1);
    expect(currentBloom()).toBe(WEAPONS[0].bloom.perShot);
    resetBloom();
  });

  it("trackWeapon reports a switch, and only a switch", () => {
    const p = new Player(2.5, 2.5, 0);
    p.weapons = [0, 1];
    expect(p.trackWeapon()).toBe(false);
    p.currentWeapon = 1;
    expect(p.trackWeapon()).toBe(true);
    expect(p.trackWeapon()).toBe(false);
  });

  it("the game loop's switch check closes the bloom on a switch, and keeps it otherwise", () => {
    resetAdsFov();
    resetBloom();
    const player = new Player(2.5, 2.5, 0);
    player.weapons = [0, 1];
    const game = { player };
    noteShotBloom(WEAPONS[0]);
    Game.prototype._trackWeaponSwitch.call(game);
    expect(currentBloom()).toBe(WEAPONS[0].bloom.perShot);
    player.currentWeapon = 1;
    Game.prototype._trackWeaponSwitch.call(game);
    expect(currentBloom()).toBe(0);
  });

  it("an aimed multishot fan puts a bolt through the reticle", () => {
    const cannon = WEAPONS[3];
    for (const shots of [2, 3, 4]) {
      resetAdsFov();
      resetBloom();
      const g = makeGame([cannon.id]);
      g.player.multiShot = shots;
      g.player.isAiming = true;
      for (let i = 0; i < 90; i++) updateAdsFov(g.player, 1 / 60, g.settings);
      expect(getAimBlend()).toBe(1);
      const aim = aimAnglesForGame(g).yaw;
      fireWeapon(g);
      expect(g.projectiles).toHaveLength(shots);
      const yaws = g.projectiles.map((b) => Math.atan2(b.dirY, b.dirX));
      expect(Math.min(...yaws.map((y) => Math.abs(y - aim))), `${shots} bolts`).toBeLessThan(1e-9);
      // The rest still fan out either side.
      expect(new Set(yaws.map((y) => Math.sign(Math.round((y - aim) * 1e6)))).size).toBe(shots > 2 ? 3 : 2);
    }
    resetAdsFov();
  });
});
