import { describe, it, expect } from "vitest";
import { WEAPON_MODELS } from "../../src/rendering/svg-art/viewmodel/weapons.js";
import { createScene } from "../../src/rendering/svg-art/viewmodel/geom.js";

// The hip art is drawn with its origin on the reticle (renderWeapon), so a
// gun points where its shots go when its barrel's line runs into the origin.
describe("the hip hold's aim", () => {
  for (const [id, model] of Object.entries(WEAPON_MODELS)) {
    it(`points weapon ${id}'s barrel at the reticle at fighting range`, () => {
      const { P } = createScene(model.cams.hip, "#36c6ff");
      // Viewmodel units (4 px at 720p) off the reticle along the bore.
      const off = (z) => Math.hypot(...P([0, 10, z]));
      expect(off(10000)).toBeLessThan(1);
      // Past it, it drifts by no more than a few pixels.
      expect(off(40000)).toBeLessThan(4);
      // And it comes in from the lower right.
      const [x, y] = P([0, 10, 0]);
      expect(x).toBeGreaterThan(0);
      expect(y).toBeGreaterThan(0);
    });
  }
});
