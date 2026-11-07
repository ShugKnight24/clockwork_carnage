// Gloves: each frame names the glove its hands wear (its data entry's
// `glove`), the themes' art paints it over the shared hand (handGeom in
// models/hero.js), and the rig draws a hand on every arm in every pose.
import { describe, it, expect } from "vitest";
import { BODY_FRAMES, SKIN_TONES, CHARACTER_COLORS } from "../../src/data/cosmetics.js";
import { DEFAULT_GLOVE, frameGlove } from "../../src/data/wardrobe-themes/index.js";
import { GLOVE_ART, frameGloveArt, validateWardrobe } from "../../src/rendering/svg-art/wardrobe-themes/index.js";
import { buildAgentParts, buildCastModel, RIG_DEFS } from "../../src/rendering/svg-art/agent-rig.js";
import { handGeom, HAND_POSE_NAMES, STAND, ARMED, FALLEN } from "../../src/rendering/svg-art/models/hero.js";
import { lookFromIds } from "./helpers/golden-looks.js";

const HAND = '<g class="ag-hand"';
const count = (markup, s) => markup.split(s).length - 1;

/** The hands in some markup: each `ag-hand` group with its children. */
function hands(markup) {
  const out = [];
  let at = markup.indexOf(HAND);
  while (at >= 0) {
    let depth = 0;
    let end = at;
    for (const m of markup.slice(at).matchAll(/<(\/?)g\b[^>]*>/g)) {
      depth += m[1] ? -1 : 1;
      if (depth === 0) {
        end = at + m.index + m[0].length;
        break;
      }
    }
    out.push(markup.slice(at, end));
    at = markup.indexOf(HAND, end);
  }
  return out;
}

const THEMED = { exo: "servo", duster: "leather", lamellar: "tekko", clockwork: "kid", streetwear: "fingerless", diving: "rubber", spacesuit: "pressure", vestment: "wraps" };

describe("every frame wears a glove", () => {
  it("resolves every frame's glove to art, the themes' frames to their own", () => {
    for (const { id } of BODY_FRAMES) {
      expect(GLOVE_ART[frameGlove(id)], id).toBeDefined();
      expect(frameGloveArt(id), id).toBe(GLOVE_ART[frameGlove(id)]);
      expect(frameGlove(id), id).toBe(THEMED[id] ?? DEFAULT_GLOVE);
    }
  });

  it("falls back to the standard glove for an unknown frame", () => {
    expect(DEFAULT_GLOVE).toBe("standard");
    expect(frameGlove("no-such-frame")).toBe("standard");
    expect(frameGloveArt("no-such-frame")).toBe(GLOVE_ART.standard);
  });

  it("names every glove with art a frame wears", () => {
    expect(Object.keys(GLOVE_ART).sort()).toEqual([DEFAULT_GLOVE, ...Object.values(THEMED)].sort());
  });
});

describe("validateWardrobe and gloves", () => {
  const frames = (glove) => ({ id: "a", name: "a", frames: [{ id: "x", name: "x", desc: "x", ...(glove ? { glove } : {}) }], helmets: [], shoulders: [] });
  const art = (gloves) => ({ id: "a", frames: { x: { shape: { width: 1, shoulder: 1 }, layers: () => ({}) } }, gloves });
  const paint = () => ({ back: "", fingers: [], thumb: "" });

  it("passes a frame wearing a glove with art, or naming none", () => {
    expect(validateWardrobe([frames("mitt")], [art({ standard: { paint }, mitt: { paint } })], {})).toEqual([]);
    expect(validateWardrobe([frames()], [art({ standard: { paint } })], {})).toEqual([]);
  });

  it("rejects a frame with an unknown glove", () => {
    const msgs = validateWardrobe([frames("mitt")], [art({ standard: { paint } })], {});
    expect(msgs).toEqual([expect.stringMatching(/"x" wears glove "mitt", which has no art/)]);
  });

  it("rejects gloves without the standard one, a paint function, a sound shape or a boolean armour", () => {
    expect(validateWardrobe([frames("mitt")], [art({ mitt: { paint } })], {})).toEqual([expect.stringMatching(/standard glove/)]);
    const msgs = validateWardrobe([frames()], [art({ standard: { paint }, a: {}, b: { paint, shape: { width: 0 } }, c: { paint, shape: { reach: 1 } }, d: { paint, armour: "yes" } })], {});
    expect(msgs).toHaveLength(4);
    expect(msgs.join("\n")).toMatch(/"a" has no paint function/);
    expect(msgs.join("\n")).toMatch(/"b" shape.width is not a positive number/);
    expect(msgs.join("\n")).toMatch(/"c" shape.reach is not a glove shape number/);
    expect(msgs.join("\n")).toMatch(/"d" armour is not true or false/);
  });

  it("rejects a glove id two themes both paint", () => {
    const b = { id: "b", name: "b", frames: [], helmets: [], shoulders: [] };
    const msgs = validateWardrobe([frames(), b], [art({ standard: { paint } }), { id: "b", gloves: { standard: { paint } } }], {});
    expect(msgs).toEqual([expect.stringMatching(/duplicate art "standard"/)]);
  });
});

describe("the rig draws a hand on every arm", () => {
  it.each(BODY_FRAMES.map((e) => e.id))("%s: idle, armed and fallen, both builds", (frame) => {
    for (const body of ["masc", "fem"]) {
      for (const pose of ["idle", "hero"]) {
        const p = buildAgentParts(lookFromIds({ frame, body }), { pose });
        expect(count(p.body, HAND), `${body} ${pose}`).toBe(2);
        for (const h of hands(p.body)) expect(h, `${body} ${pose}`).toMatch(/<path d="M/);
      }
      // One hand under the body, the free one over it.
      const [, figure] = buildCastModel(lookFromIds({ frame, body }), "hero_fallen").layers;
      expect(count(figure.markup, HAND), `${body} fallen`).toBe(2);
    }
  });

  it("poses the hand from the arm: at rest, open on the floor, on the rifle's two grips", () => {
    expect([...HAND_POSE_NAMES].sort()).toEqual(["open", "rest", "support", "trigger"]);
    expect(STAND.arms.map((a) => a.hand)).toEqual(["rest", "rest"]);
    expect(ARMED.arms.map((a) => a.hand)).toEqual(["trigger", "support"]);
    expect(FALLEN.arms.map((a) => a.hand)).toEqual(["open", "rest"]);
    expect(handGeom({ ...STAND.arms[0], hand: "none" }, -1)).toBeNull();
    expect(() => handGeom({ ...STAND.arms[0], hand: "claw" }, -1)).toThrow(/claw/);
  });

  it("puts the thumb on the body's side of either hanging hand", () => {
    for (const [i, s] of [[0, -1], [1, 1]]) {
      const H = handGeom(STAND.arms[i], s);
      // Drawn about the wrist with +y down the hand: the body is at -s.
      expect(Math.sign(H.thumb.J[2][0])).toBe(-s);
    }
  });

  it("slims the feminine build's hand, as the build slims its arms", () => {
    const width = (body) => {
      const H = handGeom(STAND.arms[1], 1, body === "fem" ? 0.97 : 1.12);
      return Math.max(...H.back.knuckles.map((p) => p[0])) - Math.min(...H.back.knuckles.map((p) => p[0]));
    };
    expect(width("fem")).toBeLessThan(width("masc"));
    const [mascHand] = hands(buildAgentParts(lookFromIds({ body: "masc" }), { pose: "idle" }).body);
    const [femHand] = hands(buildAgentParts(lookFromIds({ body: "fem" }), { pose: "idle" }).body);
    expect(femHand).not.toBe(mascHand);
  });
});

describe("glove materials", () => {
  it("the Runner's fingertips are bare, in the look's own skin", () => {
    const [a, b] = [SKIN_TONES[0], SKIN_TONES[SKIN_TONES.length - 1]];
    for (const tone of [a, b]) {
      const markup = hands(buildAgentParts(lookFromIds({ frame: "streetwear", skinTone: tone.id }), { pose: "idle" }).body).join("");
      expect(markup).toContain(`fill="${tone.color}"`);
      // And only there: the standard glove shows no skin.
      expect(hands(buildAgentParts(lookFromIds({ skinTone: tone.id }), { pose: "idle" }).body).join("")).not.toContain(tone.color);
    }
  });

  it("the standard glove takes the armour's recolour; themed gloves keep their own materials", () => {
    const glove = (frame, ids) => hands(buildAgentParts(lookFromIds({ frame, ...ids }), { pose: "idle" }).body).join("");
    // A matte armour knocks the painted speculars down on the armour, the standard glove's included.
    expect(glove("standard", {})).toContain("#eaf4ff");
    expect(glove("standard", { armor: "stealth" })).not.toContain("#eaf4ff");
    // The pressure glove's white stays white on matte armour; the leather
    // and the rubber are the same whatever the palette or armour.
    expect(glove("spacesuit", { armor: "stealth" })).toContain("#ffffff");
    const [p0, p1] = [CHARACTER_COLORS[0].id, CHARACTER_COLORS[CHARACTER_COLORS.length - 1].id];
    for (const frame of ["duster", "diving"]) {
      expect(glove(frame, { color: p1, armor: "stealth" }), frame).toBe(glove(frame, { color: p0 }));
    }
  });

  it("each glove names only its own ids and the rig's shared defs", () => {
    for (const id of Object.keys(GLOVE_ART)) {
      const frame = BODY_FRAMES.find((e) => frameGlove(e.id) === id).id;
      for (const pose of ["idle", "hero"]) {
        const p = buildAgentParts(lookFromIds({ frame }), { pose });
        const own = [...p.defs.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
        for (const [, ref] of hands(p.body).join("").matchAll(/url\(#([^)]+)\)/g)) {
          expect(RIG_DEFS.includes(ref) || (ref.startsWith(`glove-${id}-`) && own.includes(ref)), `${id} ${pose}: url(#${ref})`).toBe(true);
        }
      }
    }
  });
});
