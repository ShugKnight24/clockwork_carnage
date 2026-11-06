// Eyes and face slots: drawn on the face only where it shows and the helmet
// leaves the slot room (its entry's faceSlots), fitted to the feminine jaw,
// placed by a helmet that layers its own face (K.faceAccessories), and on
// every renderer that draws the head. A fixture open helmet that never asks
// for them is added, for this file only, to pin the rig's fallback.
import { describe, it, expect, vi } from "vitest";
import { buildAgentParts, buildAgentSvg, buildCastModel, HELMET_KIT } from "../../src/rendering/svg-art/agent-rig.js";
import { helmetFaceSlots } from "../../src/rendering/svg-art/wardrobe-themes/index.js";
import { FACE_HELMETS } from "../../src/data/wardrobe-themes/index.js";
import { FACE_SLOTS } from "../../src/data/accessories.js";
import { HELMET_STYLES } from "../../src/data/cosmetics.js";
import { lookKey } from "../../src/core/character-fields.js";
import { characterLayers } from "../../src/ui/portrait-modern.js";
import { lookFromIds } from "./helpers/golden-looks.js";

vi.mock("../../src/data/wardrobe-themes/issue.js", async (importOriginal) => {
  const { default: issue } = await importOriginal();
  return { default: { ...issue, helmets: [...issue.helmets, { id: "face-fixture", name: "Open", desc: "Open", face: true }] } };
});

vi.mock("../../src/rendering/svg-art/wardrobe-themes/issue.js", async (importOriginal) => {
  const { default: issue } = await importOriginal();
  return {
    default: {
      ...issue,
      helmets: {
        ...issue.helmets,
        // An open helmet whose painter never asks for the face items.
        "face-fixture": { anchors: issue.helmets.wide.anchors, paint: (c, K) => ({ front: `<g data-fixture="head">${K.face(c)}</g>`, glow: "" }) },
      },
    },
  };
});

const wearing = (ids, eyes = "aviators", face = "scar") => {
  const ch = lookFromIds(ids);
  return { ...ch, accessories: { ...ch.accessories, eyes, face } };
};
const worn = (markup, id) => markup.includes(`data-acc="${id}"`);
const xs = (markup) => [...markup.matchAll(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g)].map((m) => Math.abs(Number(m[1])));

describe("eyes and face slots", () => {
  it("eyes and face draw under an open helmet, not under a closed one", () => {
    for (const helmet of ["wide", "mohawk", "bubble"]) {
      const p = buildAgentParts(wearing({ helmet }));
      expect(worn(p.head, "aviators"), helmet).toBe(true);
      expect(worn(p.head, "scar"), helmet).toBe(true);
    }
    for (const helmet of ["standard", "sealed", "reaper"]) {
      const ch = wearing({ helmet });
      const p = buildAgentParts(ch);
      expect(worn(p.head + p.headGlow, "aviators"), helmet).toBe(false);
      expect(worn(p.head + p.headGlow, "scar"), helmet).toBe(false);
      // The pick is kept, only not drawn.
      expect(ch.accessories).toMatchObject({ eyes: "aviators", face: "scar" });
    }
  });

  it("a peek under a closed helmet shows them on the bare head", () => {
    const p = buildAgentParts(wearing({ helmet: "standard" }), { peek: true });
    expect(worn(p.head, "aviators") && worn(p.head, "scar")).toBe(true);
  });

  it("lights go with the head's glow", () => {
    const p = buildAgentParts(wearing({ helmet: "wide" }, "cybereye", "cigar"));
    expect(worn(p.headGlow, "cybereye") && worn(p.headGlow, "cigar")).toBe(true);
    expect(worn(p.glow, "cybereye")).toBe(false);
  });

  it("changing an eyes or face pick changes the look's key", () => {
    const a = wearing({ helmet: "wide" }, "aviators", "scar");
    expect(lookKey(wearing({ helmet: "wide" }, "monocle", "scar"))).not.toBe(lookKey(a));
    expect(lookKey(wearing({ helmet: "wide" }, "aviators", "beard"))).not.toBe(lookKey(a));
  });
});

describe("face room per helmet (faceSlots)", () => {
  it("a helmet that shows the face takes both slots unless its entry turns one off; a closed one takes none", () => {
    for (const { id } of HELMET_STYLES) {
      const room = helmetFaceSlots(id);
      expect(Object.keys(room), id).toEqual([...FACE_SLOTS]);
      if (!FACE_HELMETS.has(id)) expect(room, id).toEqual({ eyes: false, face: false });
      else for (const slot of FACE_SLOTS) expect(room[slot], `${id} ${slot}`).toBe(HELMET_STYLES.find((e) => e.id === id).faceSlots?.[slot] !== false);
    }
    expect(helmetFaceSlots("wide")).toEqual({ eyes: true, face: true });
    expect(helmetFaceSlots("mohawk")).toEqual({ eyes: true, face: true });
    expect(helmetFaceSlots("bubble")).toEqual({ eyes: true, face: true });
    // The bandana is up over the nose and jaw; eyewear fits over it.
    expect(helmetFaceSlots("brim")).toEqual({ eyes: true, face: false });
    // The holo band covers the eyes, the shell the mouth and jaw.
    expect(helmetFaceSlots("ledmask")).toEqual({ eyes: false, face: false });
  });

  it("does not draw a slot the helmet has no room for", () => {
    const brim = buildAgentParts(wearing({ helmet: "brim" }, "aviators", "beard"));
    expect(worn(brim.head, "aviators")).toBe(true);
    expect(worn(brim.head + brim.headGlow, "beard")).toBe(false);
    const mask = buildAgentParts(wearing({ helmet: "ledmask" }, "cybereye", "cigar"));
    expect(worn(mask.head + mask.headGlow, "cybereye")).toBe(false);
    expect(worn(mask.head + mask.headGlow, "cigar")).toBe(false);
  });

  it("the bubble puts them on the face inside its glass clip, under the glass", () => {
    const svg = buildAgentSvg(wearing({ helmet: "bubble" }, "shades", "beard"), { idPrefix: "b-" });
    const clip = svg.indexOf('<g clip-path="url(#b-helmet-bubble-clip)">');
    expect(clip).toBeGreaterThan(-1);
    const end = svg.indexOf("</g>", svg.lastIndexOf('data-acc="beard"'));
    const inside = svg.slice(clip, end);
    expect(worn(inside, "shades") && worn(inside, "beard")).toBe(true);
    // The glass (its tint gradient) is drawn after them, over them.
    expect(svg.indexOf("url(#b-helmet-bubble-glass)")).toBeGreaterThan(svg.lastIndexOf('data-acc="beard"'));
    // Each item once: the rig does not also draw them over the glass.
    expect(svg.split('data-acc="beard"').length).toBe(2);
  });

  it("the open issued helmets put them under the shell, so the cheek guards close over them", () => {
    for (const helmet of ["wide", "mohawk"]) {
      const head = buildAgentParts(wearing({ helmet }, "aviators", "beard")).head;
      expect(head.lastIndexOf('data-acc="beard"'), helmet).toBeLessThan(head.indexOf('fill="url(#steel)"'));
    }
  });

  it("an open helmet whose painter never asks for them gets them over its head", () => {
    const p = buildAgentParts(wearing({ helmet: "face-fixture" }, "cybereye", "scar"));
    expect(p.head.indexOf('data-acc="scar"')).toBeGreaterThan(p.head.indexOf('data-fixture="head"'));
    expect(worn(p.headGlow, "cybereye")).toBe(true);
  });

  it("the kit's faceAccessories is empty outside a figure", () => {
    expect(HELMET_KIT.faceAccessories()).toEqual({ front: "", glow: "" });
  });
});

describe("fitted and drawn everywhere the head is", () => {
  it("the feminine build narrows them with the jaw", () => {
    const masc = buildAgentParts(wearing({ helmet: "wide", body: "masc" }, "none", "beard")).head;
    const fem = buildAgentParts(wearing({ helmet: "wide", body: "fem" }, "none", "beard")).head;
    const beard = (head) => head.match(/data-acc="beard"><path d="([^"]+)"/)[1];
    expect(Math.max(...xs(beard(fem)))).toBeLessThan(Math.max(...xs(beard(masc))));
  });

  it("the fallen agent, the realistic look, the option tile and the HUD portrait carry them", () => {
    const ch = wearing({ helmet: "wide" }, "monocle", "freckles");
    const fallen = buildCastModel(ch, "hero_fallen").layers.map((l) => l.markup).join("");
    for (const markup of [
      fallen,
      buildAgentSvg(ch, { realistic: true }),
      buildAgentSvg(ch, { headOnly: true }),
      buildAgentSvg(ch, { headOnly: true, realistic: true }),
      characterLayers(ch).base,
    ]) {
      expect(worn(markup, "monocle") && worn(markup, "freckles")).toBe(true);
    }
    const closed = wearing({ helmet: "standard" }, "monocle", "freckles");
    expect(worn(buildCastModel(closed, "hero_fallen").layers.map((l) => l.markup).join(""), "monocle")).toBe(false);
    expect(worn(characterLayers(closed).base, "monocle")).toBe(false);
  });
});
