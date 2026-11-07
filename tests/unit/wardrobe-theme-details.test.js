// Details of single theme pieces that a review once found wrong and the
// golden snapshots alone would let drift back: each case pins the rule the
// fix follows, not the drawing.
import { describe, it, expect } from "vitest";
import { buildAgentParts, mix, HELMET_KIT } from "../../src/rendering/svg-art/agent-rig.js";
import { FRAME_ART, HELMET_ART } from "../../src/rendering/svg-art/wardrobe-themes/index.js";
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

describe("the Abyssal Diver's porthole helmet", () => {
  const paint = (frame) => {
    const c = lookOf({ frame, helmet: "porthole", shoulder: "lantern" });
    return HELMET_ART.porthole.paint(c, { ...HELMET_KIT, ...idScope().kit("helmet-porthole") }).front;
  };
  const points = (d) => [...d.matchAll(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  /** Filled shapes in drawing order: their index in the markup and the box round their points. */
  const filled = (markup) =>
    [...markup.matchAll(/<path d="([^"]+)" fill="([^"]+)"/g)]
      .filter((m) => m[2] !== "none")
      .map((m) => {
        const p = points(m[1]);
        const xs = p.map(([x]) => x);
        const ys = p.map(([, y]) => y);
        return { at: m.index, d: m[1], box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
      });
  const inside = ([x, y], [x0, y0, x1, y1], e = 0.05) => x >= x0 - e && x <= x1 + e && y >= y0 - e && y <= y1 + e;
  /** The hose off the crown's elbow (it starts at the elbow's mouth) and where it ends. */
  const crownHose = (markup) => {
    const d = markup.match(/<path d="(M6\.8,-102\.5[^"]*)"/)[1];
    return { d, end: points(d).at(-1) };
  };

  it("the crown hose ends in a coupling, over the diving frame's tanks and on any other frame", () => {
    const ends = [];
    for (const frame of ["diving", "standard", "strider"]) {
      const m = paint(frame);
      const { d, end } = crownHose(m);
      const fittings = filled(m).filter((s) => s.d !== d && inside(end, s.box));
      expect(fittings.length, frame).toBeGreaterThan(0);
      ends.push(end.join());
    }
    // Over the tanks it runs to the tank's riser; elsewhere it is stowed on the collar.
    expect(ends[0]).not.toBe(ends[1]);
    expect(ends[1]).toBe(ends[2]);
  });

  it("over the tanks the riser from the hose's coupling turns in behind the dome, to the tank's valve", () => {
    const m = paint("diving");
    const dome = m.indexOf('<path d="M0,-100 C9.6,-100');
    const { end } = crownHose(m);
    const coupling = filled(m).find((s) => inside(end, s.box));
    // The riser runs from the coupling's foot to a point the dome covers, and is drawn before it.
    const riser = [...m.matchAll(/<path d="(M[^"]+)" fill="none"/g)].find((r) => {
      const [first] = points(r[1]);
      return inside(first, coupling.box) && r[1] !== crownHose(m).d;
    });
    expect(riser).toBeDefined();
    expect(riser.index).toBeLessThan(dome);
    const [x, y] = points(riser[1]).at(-1);
    // Inside the dome's outline at that height (its right side runs out to 15.6 round -84).
    expect(x).toBeLessThan(15);
    expect(y).toBeGreaterThan(-100);
    expect(y).toBeLessThan(-69.4);
  });
});

describe("the Abyssal Diver's tank hoses", () => {
  const c = lookOf({ frame: "diving", helmet: "porthole", shoulder: "lantern" });
  const points = (d) => [...d.matchAll(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  /** The hoses' paths (the rubber stroke each hose draws once). */
  const hoses = (markup) => [...markup.matchAll(/<path d="([^"]+)" fill="none" stroke="#5e5348"/g)].map((m) => points(m[1]));

  it("each run from a tank ends, and each run into the corselet starts, under the sleeve; the latter ends in its coupling", () => {
    // The tanks sit behind the body and the corselet's hoses over it, which
    // the rig fits to the build differently: the two runs may only meet where
    // the sleeve (from 4 above the shoulder joint down) hides the join.
    const { under, torso } = frameLayers("diving", STAND, c);
    const sleeveTop = Math.max(...STAND.arms.map(({ sh }) => sh[1])) - 4;
    const fromTanks = hoses(under);
    const toCorselet = hoses(torso);
    expect(fromTanks).toHaveLength(2);
    expect(toCorselet).toHaveLength(2);
    for (const run of fromTanks) expect(run.at(-1)[1]).toBeGreaterThanOrEqual(sleeveTop);
    for (const run of toCorselet) {
      expect(run[0][1]).toBeGreaterThanOrEqual(sleeveTop);
      const [x, y] = run.at(-1);
      const couplings = [...torso.matchAll(/<circle cx="(-?[\d.]+)" cy="(-?[\d.]+)" r="2"/g)].map((m) => [Number(m[1]), Number(m[2])]);
      expect(couplings.some(([cx, cy]) => Math.hypot(x - cx, y - cy) <= 2)).toBe(true);
    }
  });
});
