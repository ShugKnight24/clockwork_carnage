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
import { FACE } from "../../src/rendering/svg-art/accessories/face.js";

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

describe("paint on the skin stays on the face", () => {
  const SKIN = ["scar", "warpaint", "freckles"];
  const clipOf = (p) => p.defs.match(/<clipPath id="face-skin">(.*?)<\/clipPath>/)?.[1];

  it("a scar, freckles and war paint are clipped to the build's face outline, under the eyewear", () => {
    for (const item of SKIN) {
      for (const body of ["masc", "fem"]) {
        for (const peek of [false, true]) {
          const p = buildAgentParts(wearing({ helmet: peek ? "standard" : "wide", body }, "aviators", item), { peek });
          const clip = p.head.indexOf('<g clip-path="url(#face-skin)">');
          expect(clip, `${item} ${body} peek=${peek}`).toBeGreaterThan(-1);
          expect(p.head.indexOf(`data-acc="${item}"`), `${item} ${body}`).toBeGreaterThan(clip);
          expect(p.head.indexOf('data-acc="aviators"'), `${item} ${body}`).toBeGreaterThan(p.head.indexOf(`data-acc="${item}"`));
          expect(clipOf(p), `${item} ${body}`).toBeTruthy();
        }
      }
    }
  });

  it("the clip follows the feminine jaw", () => {
    const outline = (body) => clipOf(buildAgentParts(wearing({ helmet: "wide", body }, "none", "warpaint"))).match(/d="([^"]+)"/)[1];
    expect(Math.max(...xs(outline("fem")))).toBeLessThan(Math.max(...xs(outline("masc"))));
  });

  it("the clip is only there when something is painted on the skin", () => {
    const p = buildAgentParts(wearing({ helmet: "wide" }, "aviators", "beard"));
    expect(clipOf(p)).toBeUndefined();
    expect(p.head).not.toContain("url(#face-skin)");
  });

  it("war paint tapers out on the cheek, short of the face's edge", () => {
    const head = buildAgentParts(wearing({ helmet: "wide" }, "none", "warpaint")).head;
    const paint = head.slice(head.indexOf('data-acc="warpaint"'), head.indexOf("</g>", head.indexOf('data-acc="warpaint"')));
    // The cheek's edge is at x 7.2 on the masculine face.
    expect(Math.max(...xs(paint))).toBeLessThanOrEqual(6.2);
  });
});

/** Points along a path of M, L and C commands (absolute), `n` per segment. */
function samplePath(d, n = 24) {
  const out = [];
  let at = [0, 0];
  for (const [, cmd, args] of d.matchAll(/([MLC])([^MLC]*)/g)) {
    const v = args.trim().split(/[\s,]+/).map(Number);
    if (cmd === "M") at = [v[0], v[1]];
    else if (cmd === "L") {
      for (let i = 1; i <= n; i++) out.push([at[0] + ((v[0] - at[0]) * i) / n, at[1] + ((v[1] - at[1]) * i) / n]);
      at = [v[0], v[1]];
    } else {
      const [p1, p2, p3] = [[v[0], v[1]], [v[2], v[3]], [v[4], v[5]]];
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const b = (k) => (1 - t) ** 3 * at[k] + 3 * (1 - t) ** 2 * t * p1[k] + 3 * (1 - t) * t * t * p2[k] + t ** 3 * p3[k];
        out.push([b(0), b(1)]);
      }
      at = p3;
    }
    if (cmd === "M") out.push(at);
  }
  return out;
}

describe("the eyepatch's strap", () => {
  // The right eye (whites and lid fold) and the top of the right brow, the
  // higher feminine arch, from agent-rig.js EYE mirrored to the right.
  const EYE = { x0: 1.1, x1: 5.3, y0: -84.4, y1: -79.9 };
  const BROW_TOP = [[1.3, -85.1], [2.15, -85.55], [3.09, -85.7], [4.05, -85.52], [4.94, -84.99], [5.7, -84.1]];
  const browTop = (x) => {
    for (let i = 1; i < BROW_TOP.length; i++) {
      const [[xa, ya], [xb, yb]] = [BROW_TOP[i - 1], BROW_TOP[i]];
      if (x <= xb) return ya + ((yb - ya) * (x - xa)) / (xb - xa);
    }
    return null;
  };

  it("crosses the forehead above the right brow and never touches the right eye, on either build", () => {
    for (const body of ["masc", "fem"]) {
      const head = buildAgentParts(wearing({ helmet: "wide", body }, "eyepatch", "none")).head;
      const strap = head.slice(head.indexOf('data-acc="eyepatch"')).match(/<path d="([^"]+)"/)[1];
      // Half the strap's inked width, and a little air.
      const half = 0.55 + 0.15;
      for (const [x, y] of samplePath(strap)) {
        const inEye = x > EYE.x0 - half && x < EYE.x1 + half && y > EYE.y0 - half && y < EYE.y1 + half;
        expect(inEye, `${body} strap at ${x.toFixed(2)},${y.toFixed(2)} over the right eye`).toBe(false);
        if (x >= BROW_TOP[0][0] && x <= BROW_TOP.at(-1)[0]) expect(y + half, `${body} strap at ${x.toFixed(2)},${y.toFixed(2)} on the right brow`).toBeLessThan(browTop(x));
      }
    }
  });
});

describe("piercings sit in the build's own lip and brow", () => {
  // Before the jaw's warp, from agent-rig.js face(): the lower lip runs from
  // the mouth line down to its edge at the ring's x (1.4), and the outer
  // right brow's top and bottom at the bar's x (4.4 to 4.75).
  const FACES = {
    masc: { lip: [-73.6, -72.7], brow: [-84.95, -84.25] },
    fem: { lip: [-73.85, -72.95], brow: [-85.4, -84.95] },
  };
  const strokes = (markup) => [...markup.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
  const pts = (d) => [...d.matchAll(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);

  it("the lip ring leaves from inside the lower lip and hangs below it", () => {
    for (const body of ["masc", "fem"]) {
      const c = buildAgentParts(lookFromIds({ body })).look;
      const ring = pts(strokes(FACE.piercings({}, c).face).at(-1));
      const [top, edge] = FACES[body].lip;
      for (const [x, y] of [ring[0], ring.at(-1)]) {
        expect(y, `${body} ring end ${x},${y}`).toBeGreaterThan(top);
        expect(y, `${body} ring end ${x},${y}`).toBeLessThan(edge);
        // Inside the mouth's width (its corners at x ±2.4).
        expect(Math.abs(x), body).toBeLessThan(2.4);
      }
      // Its loop hangs below the lip's edge.
      expect(Math.max(...ring.map(([, y]) => y)), body).toBeGreaterThan(edge);
    }
  });

  it("the brow bar goes through the brow, a bead above it and one below", () => {
    for (const body of ["masc", "fem"]) {
      const c = buildAgentParts(lookFromIds({ body })).look;
      const [[, y0], [, y1]] = pts(strokes(FACE.piercings({}, c).face)[0]);
      const [top, bottom] = FACES[body].brow;
      expect(Math.min(y0, y1), body).toBeLessThan(top);
      expect(Math.max(y0, y1), body).toBeGreaterThan(bottom);
    }
  });
});
