// Every helmet that shows the face places the eyes and face items itself
// (K.faceAccessories), and keeps them and their light to its face window:
// the light is drawn in the head's glow layer, over the helmet, so only the
// window's clip keeps it behind a cheek guard or a brim.
import { describe, it, expect } from "vitest";
import { buildAgentParts, buildCastModel, HELMET_KIT, rigAnchors } from "../../src/rendering/svg-art/agent-rig.js";
import { HELMET_ART, helmetFaceSlots } from "../../src/rendering/svg-art/wardrobe-themes/index.js";
import { FACE_HELMETS } from "../../src/data/wardrobe-themes/index.js";
import { ACCESSORIES, FACE_SLOTS } from "../../src/data/accessories.js";
import { paintAccessories } from "../../src/rendering/svg-art/accessories/index.js";
import { idScope } from "../../src/rendering/svg-art/id-scope.js";
import { STAND } from "../../src/rendering/svg-art/models/hero.js";
import { lookFromIds } from "./helpers/golden-looks.js";

const wearing = (ids, slot, item) => {
  const ch = lookFromIds(ids);
  return { ...ch, accessories: { ...ch.accessories, [slot]: item } };
};

/** Eyes and face items that give off light. */
const GLOWING = FACE_SLOTS.flatMap((slot) =>
  ACCESSORIES[slot]
    .slice(1)
    .filter(({ id }) => paintAccessories({ [slot]: id }, rigAnchors(STAND, [0, 0], "standing", "wide"), buildAgentParts(lookFromIds({})).look).faceGlow)
    .map(({ id }) => [slot, id]),
);

/** The markup inside the face-window clip groups of helmet `id`. */
const inWindow = (markup, id) => {
  const open = `<g clip-path="url(#helmet-${id}-face-window)">`;
  const out = [];
  for (let at = markup.indexOf(open); at >= 0; at = markup.indexOf(open, at + 1)) {
    let depth = 0;
    const re = /<g\b|<\/g>/g;
    re.lastIndex = at;
    for (let m = re.exec(markup); m; m = re.exec(markup)) {
      depth += m[0] === "</g>" ? -1 : 1;
      if (!depth) {
        out.push(markup.slice(at, m.index));
        break;
      }
    }
  }
  return out.join("");
};

describe("face windows", () => {
  it("knows which items glow", () => {
    expect(GLOWING.map(([, id]) => id).sort()).toEqual(["cigar", "cybereye", "shades"]);
  });

  it.each([...FACE_HELMETS])("%s places the face items itself", (id) => {
    let asked = 0;
    const c = buildAgentParts(lookFromIds({ helmet: id })).look;
    const scope = idScope();
    HELMET_ART[id].paint(c, { ...HELMET_KIT, ...scope.kit(`helmet-${id}`), faceAccessories: (...a) => (asked++, HELMET_KIT.faceAccessories(...a)) });
    expect(asked).toBe(1);
  });

  for (const helmet of [...FACE_HELMETS]) {
    for (const [slot, item] of GLOWING) {
      if (!helmetFaceSlots(helmet)[slot]) continue;
      it(`${helmet}: ${item} and its light stay inside the face window, standing, fallen and in the cast`, () => {
        for (const body of ["masc", "fem"]) {
          const ch = wearing({ helmet, body }, slot, item);
          const p = buildAgentParts(ch);
          const tag = `data-acc="${item}"`;
          for (const [layer, markup] of [["head", p.head], ["headGlow", p.headGlow]]) {
            // Every copy of the item in the layer is inside the window.
            expect(markup.split(tag).length, `${body} ${layer}`).toBeGreaterThan(1);
            expect(inWindow(markup, helmet).split(tag).length, `${body} ${layer}`).toBe(markup.split(tag).length);
          }
          expect(p.defs).toContain(`<clipPath id="helmet-${helmet}-face-window">`);
          for (const key of ["hero", "hero_fallen"]) {
            for (const realistic of [false, true]) {
              const model = buildCastModel(ch, key, { realistic });
              const glow = model.layers.filter((l) => l.blend === "lighter").map((l) => l.markup).join("");
              const all = model.layers.map((l) => l.markup).join("");
              const label = `${body} ${key} realistic=${realistic}`;
              expect(glow.split(tag).length, label).toBeGreaterThan(1);
              expect(inWindow(all, helmet).split(tag).length, label).toBe(all.split(tag).length);
              expect(model.defs, label).toContain(`id="helmet-${helmet}-face-window"`);
            }
          }
        }
      });
    }
  }
});
