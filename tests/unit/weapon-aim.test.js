/**
 * weapon-aim.test.js — every weapon's rounds go where its sight says.
 *
 * Pins, per weapon in src/data/weapons.js:
 *   1. the hit ray projects back onto the reticle / ADS sight pixel through
 *      the frame the renderer draws (zoomed FOV, magnified rows, eye height and
 *      recoil shift, HUD bar), hip and aimed, standing and crouched
 *   2. rounds scatter inside the cone the spread brackets draw, which closes
 *      to the weapon's adsSpread aimed (none for the sniper)
 *   3. each sight magnifies by its adsZoom, the scope by 3x or more
 *   4. the reticle on a drawn head, hip or aimed, standing or crouched, near
 *      or far, is a headshot (and on the chest a body hit); the gun model is
 *      not part of the aim: it is placed for looks and only kept off the reticle
 */
import { describe, it, expect, vi } from "vitest";
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
} from "../../src/systems/aim.js";
import { scatter } from "../../src/systems/combat-orchestrator.js";
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
