// Scoped ids for piece painters (src/rendering/svg-art/id-scope.js): two
// figures of different looks on one page never share an SVG id, and every
// url(#…) resolves inside its own figure, so each figure's gradients render
// its own colours. Fixture pieces that define a gradient through K.uid and
// K.defs are added, for this file only, as a frame, a helmet, a shoulder
// (all with the same id, so the slot keeps them apart) and a neck accessory.
import { describe, it, expect, vi } from "vitest";
import { buildAgentSvg, buildAgentParts, buildCastModel, CAST_KEYS } from "../../src/rendering/svg-art/agent-rig.js";
import { validateWardrobe } from "../../src/rendering/svg-art/wardrobe-themes/index.js";
import { idScope } from "../../src/rendering/svg-art/id-scope.js";
import { pieceOf } from "../../src/core/character-fields.js";
import { lookFromIds } from "./helpers/golden-looks.js";

const { gradient } = vi.hoisted(() => ({
  // A painter's gradient in the look's own colour, and a shape filled with it.
  gradient: (K, color, tag) => {
    K.defs(`<linearGradient id="${K.uid("g")}"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#000000"/></linearGradient>`);
    return `<rect data-fixture="${tag}" width="2" height="2" fill="url(#${K.uid("g")})"/>`;
  },
}));

vi.mock("../../src/data/wardrobe-themes/issue.js", async (importOriginal) => {
  const { default: issue } = await importOriginal();
  const fixture = { id: "ids-fixture", name: "Ids", desc: "Ids" };
  return {
    default: {
      ...issue,
      frames: [...issue.frames, fixture],
      helmets: [...issue.helmets, fixture],
      shoulders: [...issue.shoulders, fixture],
    },
  };
});

vi.mock("../../src/rendering/svg-art/wardrobe-themes/issue.js", async (importOriginal) => {
  const { default: issue } = await importOriginal();
  const none = { under: "", legs: "", torso: "", arms: "", glow: "" };
  return {
    default: {
      ...issue,
      frames: {
        ...issue.frames,
        "ids-fixture": { shape: { width: 1, shoulder: 1 }, layers: (P, c, K) => ({ ...none, torso: gradient(K, c.pal.primary, "frame") }) },
      },
      helmets: {
        ...issue.helmets,
        "ids-fixture": {
          anchors: issue.helmets.standard.anchors,
          paint: (c, K) => ({ front: gradient(K, c.pal.primary, "helmet"), glow: "" }),
        },
      },
      shoulders: {
        ...issue.shoulders,
        // Both shoulders register the same gradient: it is kept once.
        "ids-fixture": { paint: (c, s, K) => gradient(K, c.pal.primary, "shoulder") },
      },
    },
  };
});

vi.mock("../../src/data/accessories.js", async (importOriginal) => {
  const mod = await importOriginal();
  return { ...mod, ACCESSORIES: { ...mod.ACCESSORIES, neck: [...mod.ACCESSORIES.neck, { id: "ids-fixture", name: "Ids", desc: "Ids", tier: 1 }] } };
});

vi.mock("../../src/rendering/svg-art/accessories/neck.js", async (importOriginal) => {
  const { PAINTERS } = await importOriginal();
  return { PAINTERS: { ...PAINTERS, "ids-fixture": (A, c, K) => ({ top: gradient(K, c.pal.primary, "accessory") }) } };
});

const FIXTURE = { frame: "ids-fixture", helmet: "ids-fixture", shoulder: "ids-fixture" };
const look = (color) => {
  const ch = lookFromIds({ ...FIXTURE, color });
  return { ...ch, accessories: { ...ch.accessories, neck: "ids-fixture" } };
};
const LOOK_A = look("chrono_teal");
const LOOK_B = look("paradox_red");

const idsIn = (markup) => [...markup.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
const refsIn = (markup) => [...markup.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map((m) => m[1] || m[2]);
/** Every id defined once, and every reference to one this markup defines. */
function selfContained(markup, label) {
  const ids = idsIn(markup);
  expect(ids.length, label).toBe(new Set(ids).size);
  const own = new Set(ids);
  for (const ref of refsIn(markup)) expect(own.has(ref), `${label}: url(#${ref})`).toBe(true);
}
/** The first stop colour of the gradient with this id. */
const stopOf = (markup, id) => markup.match(new RegExp(`<linearGradient id="${id}"><stop offset="0" stop-color="([^"]+)"`))?.[1];

describe("scoped ids for piece painters", () => {
  it("the fixtures are registered", () => {
    expect(validateWardrobe()).toEqual([]);
    for (const tag of ["frame", "helmet", "shoulder", "accessory"]) {
      expect(buildAgentSvg(LOOK_A), tag).toContain(`data-fixture="${tag}"`);
    }
  });

  it("K.uid names an id by the figure's prefix, the piece's slot and id, and the painter's name", () => {
    const page = buildAgentSvg(LOOK_A, { idPrefix: "a-" });
    for (const slot of ["frame", "helmet", "shoulder"]) {
      expect(idsIn(page), slot).toContain(`a-${slot}-ids-fixture-g`);
      expect(page, slot).toContain(`fill="url(#a-${slot}-ids-fixture-g)"`);
    }
    expect(idsIn(page)).toContain("a-acc-neck-ids-fixture-g");
  });

  it("two figures of different looks on one page share no id, and each resolves its own", () => {
    for (const opts of [{ pose: "idle" }, { pose: "hero" }, { headOnly: true }, { pose: "idle", realistic: true }, { headOnly: true, realistic: true }]) {
      const a = buildAgentSvg(LOOK_A, { ...opts, idPrefix: "a-" });
      const b = buildAgentSvg(LOOK_B, { ...opts, idPrefix: "b-" });
      const label = JSON.stringify(opts);
      const page = a + b;
      const ids = idsIn(page);
      expect(ids.length, label).toBe(new Set(ids).size);
      selfContained(a, `${label} a`);
      selfContained(b, `${label} b`);
      // Each figure's gradient carries its own look's colour (the comic look
      // paints it as given; the realistic one grades it, but still per figure).
      if (!opts.realistic) {
        expect(stopOf(a, opts.headOnly ? "a-helmet-ids-fixture-g" : "a-shoulder-ids-fixture-g"), label).toBe(pieceOf(LOOK_A, "color").primary);
        expect(stopOf(b, opts.headOnly ? "b-helmet-ids-fixture-g" : "b-shoulder-ids-fixture-g"), label).toBe(pieceOf(LOOK_B, "color").primary);
      } else {
        expect(stopOf(a, "a-helmet-ids-fixture-g"), label).not.toBe(stopOf(b, "b-helmet-ids-fixture-g"));
      }
    }
  });

  it("a cast model carries the pieces' defs, and every reference resolves inside it", () => {
    for (const key of CAST_KEYS) {
      for (const realistic of [false, true]) {
        const m = buildCastModel(LOOK_A, key, { realistic });
        // Each layer is drawn as its own SVG document with the model's defs.
        for (const [i, l] of m.layers.entries()) selfContained(`<defs>${m.defs}</defs>${l.markup}`, `${key} realistic=${realistic} layer ${i}`);
        expect(m.defs, `${key} realistic=${realistic}`).toContain(`id="shoulder-ids-fixture-g"`);
      }
    }
  });

  it("the parts carry the pieces' defs for callers that build their own <svg>", () => {
    const p = buildAgentParts(LOOK_A);
    expect(p.defs.endsWith(p.pieceDefs)).toBe(true);
    for (const id of ["frame", "helmet", "shoulder", "acc-neck"].map((s) => `${s}-ids-fixture-g`)) expect(idsIn(p.pieceDefs)).toContain(id);
    // Two shoulders, one definition.
    expect(idsIn(p.pieceDefs).filter((id) => id === "shoulder-ids-fixture-g")).toHaveLength(1);
  });
});

describe("idScope", () => {
  it("keeps one copy of markup registered twice, and throws on one id defined two ways", () => {
    const scope = idScope();
    const K = scope.kit("shoulder-x");
    const def = (color) => `<linearGradient id="${K.uid("g")}"><stop stop-color="${color}"/></linearGradient>`;
    K.defs(def("#111111"));
    K.defs(def("#111111"));
    expect(scope.markup()).toBe(def("#111111"));
    expect(() => K.defs(def("#222222"))).toThrow(/shoulder-x-g/);
  });
});
