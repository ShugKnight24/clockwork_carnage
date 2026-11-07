// Hair below the jaw hangs behind the neck and collar: the head carries the
// hair down to the jaw, and the figure draws the rest (its `nape`) between
// the body and the collar, on every renderer and pose, bare-headed or under
// an open helmet.
import { describe, it, expect } from "vitest";
import { buildAgentParts, buildAgentSvg, buildCastModel, HELMET_KIT } from "../../src/rendering/svg-art/agent-rig.js";
import { HELMET_ART } from "../../src/rendering/svg-art/wardrobe-themes/index.js";
import { FACE_HELMETS } from "../../src/data/wardrobe-themes/index.js";
import { HAIR_STYLES } from "../../src/data/cosmetics.js";
import { idScope } from "../../src/rendering/svg-art/id-scope.js";
import { characterLayers } from "../../src/ui/portrait-modern.js";
import { lookFromIds } from "./helpers/golden-looks.js";

/** The cuts that hang past the jaw, and the jaw's height (agent-rig.js JAW_Y, the neck's top). */
const HANGING = ["long", "locs", "braid", "ponytail"];
const JAW = -74.6;
const BELOW = 'clip-path="url(#belowJaw)"';
const ABOVE = 'clip-path="url(#aboveJaw)"';
/** Where the gorget's steel plate (models/hero.js gorget) is drawn in the collar: its outline's heights (the build narrows its x). */
const gorgetAt = (m) => m.search(/,-70\.4 C-?[\d.]+,-68\.7 /);
const lowestY = (m) => Math.max(...[...m.matchAll(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g)].map((p) => Number(p[2])));

describe("the hair kit splits the hair at the jaw", () => {
  it("hair and hairBack never reach below the jaw unless clipped to it; hairNape is only what is below", () => {
    for (const { id } of HAIR_STYLES) {
      for (const body of ["masc", "fem"]) {
        const c = buildAgentParts(lookFromIds({ hair: id, body })).look;
        for (const m of [HELMET_KIT.hair(c, false), HELMET_KIT.hair(c, true), HELMET_KIT.hairBack(c)]) {
          if (lowestY(m) > JAW) expect(m.startsWith(`<g ${ABOVE}>`), `${id} ${body}`).toBe(true);
        }
        const nape = HELMET_KIT.hairNape(c, false);
        expect(nape === "" || nape.startsWith(`<g ${BELOW}>`), `${id} ${body}`).toBe(true);
        expect(nape !== "", `${id} ${body} hangs past the jaw`).toBe(HANGING.includes(id));
      }
    }
  });
});

describe("hair below the jaw sits behind the neck", () => {
  const bare = (hair, body) => lookFromIds({ hair, body, helmet: "standard" });

  it("on the bare head (a peek), idle, armed and bust, both builds", () => {
    for (const hair of HANGING) {
      for (const body of ["masc", "fem"]) {
        for (const pose of ["idle", "hero", "bust"]) {
          const svg = buildAgentSvg(bare(hair, body), { pose, peek: true });
          const nape = svg.indexOf(BELOW);
          const what = `${hair} ${body} ${pose}`;
          expect(nape, what).toBeGreaterThan(svg.indexOf('class="ag-body"'));
          expect(nape, what).toBeLessThan(svg.indexOf('class="ag-neck"'));
          expect(gorgetAt(svg), what).toBeGreaterThan(nape);
          // The head's own copy stops at the jaw.
          expect(svg.slice(svg.indexOf('class="ag-head"')), what).toContain(ABOVE);
          expect(svg.slice(svg.indexOf('class="ag-head"')), what).not.toContain(BELOW);
        }
      }
    }
  });

  it("under every helmet that shows the face, which hands its nape back", () => {
    for (const helmet of FACE_HELMETS) {
      for (const hair of ["long", "braid"]) {
        const svg = buildAgentSvg(lookFromIds({ hair, helmet }));
        const nape = svg.indexOf(BELOW);
        // Under an open shell only the braid shows below it (K.hairNape(c, true)); the long cut's back still does.
        expect(nape, `${helmet} ${hair}`).toBeGreaterThan(-1);
        expect(nape, `${helmet} ${hair}`).toBeLessThan(svg.indexOf('class="ag-neck"'));
        expect(svg.slice(svg.indexOf('class="ag-head"')), `${helmet} ${hair}`).not.toContain(BELOW);
      }
    }
  });

  it("a painter's nape is the kit's, clipped as the painter clips its head", () => {
    const c = buildAgentParts(lookFromIds({ hair: "long", helmet: "bubble" })).look;
    const scope = idScope();
    const out = HELMET_ART.bubble.paint(c, { ...HELMET_KIT, ...scope.kit("helmet-bubble") });
    expect(out.nape).toContain('clip-path="url(#helmet-bubble-clip)"');
    expect(out.nape).toContain(HELMET_KIT.hairNape(c, false));
  });

  it("in the cutscene models, the fallen agent, the realistic look, the option tile and the HUD portrait", () => {
    const ch = lookFromIds({ hair: "long", helmet: "wide" });
    const layers = (key, realistic = false) => buildCastModel(ch, key, { realistic }).layers.map((l) => l.markup).join("");
    for (const [what, markup] of [
      ["cast hero", layers("hero")],
      ["cast armed", layers("hero_armed")],
      ["cast fallen", layers("hero_fallen")],
      ["cast hero realistic", layers("hero", true)],
      ["cast fallen realistic", layers("hero_fallen", true)],
      ["realistic", buildAgentSvg(ch, { realistic: true })],
      ["tile", buildAgentSvg(ch, { headOnly: true })],
      ["tile realistic", buildAgentSvg(ch, { headOnly: true, realistic: true })],
      ["portrait", characterLayers(ch).base],
    ]) {
      const nape = markup.indexOf("belowJaw)");
      expect(nape, what).toBeGreaterThan(-1);
      expect(gorgetAt(markup), what).toBeGreaterThan(nape);
    }
  });

  it("draws no nape, and keeps one collar group, for a cut that ends above the jaw", () => {
    const svg = buildAgentSvg(lookFromIds({ hair: "short", helmet: "wide" }));
    expect(svg).not.toContain(BELOW);
    const cast = buildCastModel(lookFromIds({ hair: "short", helmet: "wide" }), "hero").layers.map((l) => l.markup).join("");
    expect(cast).not.toContain("belowJaw)");
  });
});
