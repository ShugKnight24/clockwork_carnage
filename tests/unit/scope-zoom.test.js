/**
 * scope-zoom.test.js — the sights' zoom is drawn by the raycaster itself.
 *
 * Aimed in, the FOV narrows the view sideways (effectiveAimFov) and the
 * renderer scales every height by the same factor (renderer focalY, about the
 * reticle's row: zoomedShiftPx). Pins:
 *   1. a sprite grows by the zoom in both axes, as walls do sideways, so it
 *      keeps its shape at 1x, 1.5x and 4x (the frame used to be stretched
 *      up and down after drawing, leaving a 4x-scoped enemy a tall sliver)
 *   2. the point the aim math names (aimAngles, what a round hits) is drawn
 *      under the reticle at every zoom, standing or crouched, looking up or
 *      down, with or without the HUD bar
 *   3. sprites drawn after the scene (Chronos ghosts, arrivals) measure the
 *      screen's edges in the scene's shifted space, so a scope's shift does
 *      not cut them off
 */
import { describe, it, expect } from "vitest";
import { Renderer } from "../../js/renderer.js";
import { aimAngles, reticlePoint, sceneShiftPx, zoomedShiftPx } from "../../src/systems/aim.js";
import { EYE_Z, playerEyeZ } from "../../src/systems/physics.js";

const W = 1280;
const H = 720;
const FOV = 70;
const ZOOMS = [1, 1.5, 4];

/** The FOV the sights draw with: the hip view's tangent over the zoom (effectiveAimFov). */
const fovAt = (zoom) => (Math.atan(Math.tan((FOV * Math.PI) / 360) / zoom) * 360) / Math.PI;
const planeMulAt = (zoom) => Math.tan((fovAt(zoom) * Math.PI) / 360);

/** A Renderer with just the state the projection reads; no canvas. */
function renderer(zoom, player = null) {
  const r = Object.create(Renderer.prototype);
  r.width = W;
  r.height = H;
  r.viewZoom = zoom;
  r.zBuffer = new Float64Array(W).fill(Infinity);
  r._eyeDrop = player ? EYE_Z - playerEyeZ(player) : 0;
  r._spriteShift = 0;
  r._facingCam = { rx: 0, ry: 0, x: 0, y: 0 };
  r.coverClipY = () => Infinity;
  r._spriteClipPath = () => 0;
  return r;
}

/** Draw one sprite and return the box renderSprites hands drawEntity. */
function spriteBox(zoom, entity) {
  const r = renderer(zoom);
  let box = null;
  r.drawEntity = (ctx, e, screenX, startY, endY, startX, endX, sprWidth, sprHeight) => {
    box = { screenX, sprWidth, sprHeight };
  };
  const ctx = { save() {}, restore() {}, translate() {} };
  r.ctx = ctx;
  const player = { x: 0, y: 0, angle: 0 };
  r.renderSprites(player, [entity], 0, planeMulAt(zoom));
  return box;
}

describe("the scope draws its zoom in both axes", () => {
  for (const [depth, across] of [[10, 0], [5, -0.3], [19, 0.8]]) {
    it(`a sprite ${depth} cells out keeps its shape at ${ZOOMS.join("x, ")}x`, () => {
      const prop = { type: "prop", x: depth, y: across, active: true };
      const hip = spriteBox(1, prop);
      expect(hip).not.toBeNull();
      for (const zoom of ZOOMS) {
        const z = spriteBox(zoom, prop);
        // Up and down and sideways alike: a wall's height at that depth,
        // times the zoom (to the pixel the renderer rounds to).
        expect(Math.abs(z.sprHeight - (H * zoom) / depth)).toBeLessThan(1);
        expect(Math.abs(z.sprWidth - (H * zoom) / depth)).toBeLessThan(1);
        expect(z.sprWidth / z.sprHeight).toBe(hip.sprWidth / hip.sprHeight);
        // And as a wall's face does sideways at that depth: a cell's width
        // on screen grows by the same factor through the narrower FOV.
        const cell = (pm) => (W / 2) / (pm * depth);
        expect(cell(planeMulAt(zoom)) / cell(planeMulAt(1))).toBeCloseTo(zoom, 6);
      }
    });
  }

  it("the scene's shift magnifies about the reticle's row", () => {
    for (const ry of [H / 2, (H - 160) / 2]) {
      for (const shift of [0, -90, 140]) {
        // At the hip a height is drawn at y0; aimed in, at ry + zoom · (y0 - ry).
        const y0 = H / 2 + shift - 0.3 * H / 7;
        for (const zoom of ZOOMS) {
          const y = H / 2 + zoomedShiftPx(shift, ry, H, zoom) - (0.3 * H * zoom) / 7;
          expect(y).toBeCloseTo(ry + zoom * (y0 - ry), 6);
        }
      }
    }
  });
});

describe("sprites drawn after the scene share its shift", () => {
  // Chronos ghosts and an arrival stepping out are drawn after renderScene,
  // moved by the scene's shift. Scoped with the HUD bar, the shift is a few
  // hundred px down; the screen's top must be measured in that moved space,
  // or the sprite is cut off that many rows below the top of the screen.
  for (const zoom of [1, 4]) {
    it(`a tall near sprite keeps its top under a ${zoom}x scope's shift`, () => {
      const r = renderer(zoom);
      let box = null;
      r.drawEntity = (ctx, e, screenX, startY) => {
        box = { startY };
      };
      const moves = [];
      r.ctx = { save() {}, restore() {}, translate(x, y) { moves.push(y); } };
      // 800 px tall about the eye line: its top 40 px above the unshifted screen.
      const depth = (H * zoom) / 800;
      const ghost = { type: "prop", x: depth, y: 0, active: true };
      r.renderSpritesShifted({ x: 0, y: 0, angle: 0 }, [ghost], 0, planeMulAt(zoom), 240.4);
      expect(moves[0]).toBe(240);
      expect(box.startY).toBe(-40);
      expect(r._spriteShift).toBe(0);
    });
  }
});

describe("what a round hits is drawn under the reticle at every zoom", () => {
  const stances = [
    ["standing", {}],
    ["crouched", { crouchBlend: 1 }],
  ];
  for (const zoom of ZOOMS) {
    for (const [stance, over] of stances) {
      for (const look of [-0.3, 0, 0.14, 0.6]) {
        for (const barH of [0, 160]) {
          it(`${zoom}x, ${stance}, look ${look}, bar ${barH}`, () => {
            const p = { x: 3.5, y: 12, angle: 0.4, aimOffsetX: 0, aimOffsetY: 0, lookShiftY: look, ...over };
            const shift = sceneShiftPx(p, H);
            const { yaw, pitch } = aimAngles(p, fovAt(zoom), { h: H, barH, yShift: shift });
            const sight = reticlePoint(W, H, barH, p);
            const r = renderer(zoom, p);
            const drawShift = zoomedShiftPx(shift, sight.y, H, zoom);
            for (const dist of [2, 10, 19]) {
              // The round's height there, from the eye it leaves (eyeOffsetZ),
              // in _projectWorld's screen-down units from the standing eye line.
              const rise = Math.tan(pitch) * dist;
              const z = r._eyeDrop - rise;
              const pt = r._projectWorld(p, p.x + Math.cos(yaw) * dist, p.y + Math.sin(yaw) * dist, planeMulAt(zoom), undefined, undefined, z, drawShift);
              expect(pt.x).toBeCloseTo(sight.x, 6);
              expect(pt.y).toBeCloseTo(sight.y, 6);
            }
          });
        }
      }
    }
  }
});
