// Details of single theme pieces that a review once found wrong and the
// golden snapshots alone would let drift back: each case pins the rule the
// fix follows, not the drawing.
import { describe, it, expect } from "vitest";
import { buildAgentParts, mix } from "../../src/rendering/svg-art/agent-rig.js";
import { FRAME_ART } from "../../src/rendering/svg-art/wardrobe-themes/index.js";
import { idScope } from "../../src/rendering/svg-art/id-scope.js";
import { STAND, FALLEN } from "../../src/rendering/svg-art/models/hero.js";
import { lookFromIds } from "./helpers/golden-looks.js";

const lookOf = (ids) => buildAgentParts(lookFromIds(ids)).look;
const frameLayers = (id, P, c) => FRAME_ART[id].layers(P, c, { mix, ...idScope().kit(`frame-${id}`) });

describe("the Frontier Marshal's duster", () => {
  const c = lookOf({ frame: "duster", helmet: "brim", shoulder: "poncho" });

  it("the marshal's badge is plain brass: the coat gives nothing to the glow layer, standing or fallen", () => {
    for (const P of [STAND, FALLEN]) expect(frameLayers("duster", P, c).glow).toBe("");
    expect(frameLayers("duster", STAND, c).torso).not.toContain(c.energy);
  });

  it("the spurs ride each foot's own frame, so they move and turn with the leg, standing or fallen", () => {
    // Moved bodily, a leg's spur markup changes only where its groups are placed.
    const placed = (m) => m.replace(/translate\([^)]*\)/g, "translate()");
    const shift = (P, dx, dy) => ({ ...P, legs: P.legs.map((leg) => Object.fromEntries(Object.entries(leg).map(([k, [x, y]]) => [k, [x + dx, y + dy]]))) });
    for (const P of [STAND, FALLEN]) {
      const legs = frameLayers("duster", P, c).legs;
      expect(legs).toContain("translate(");
      expect(placed(frameLayers("duster", shift(P, 5, -7), c).legs)).toBe(placed(legs));
    }
  });
});
