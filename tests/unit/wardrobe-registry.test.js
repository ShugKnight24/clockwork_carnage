import { describe, it, expect } from "vitest";
import { BODY_FRAMES } from "../../src/data/cosmetics.js";
import { WARDROBE_THEMES, themeOf } from "../../src/data/wardrobe-themes/index.js";
import { FRAME_ART, HIDES, frameHides, validateWardrobe } from "../../src/rendering/svg-art/wardrobe-themes/index.js";
import { buildAgentParts } from "../../src/rendering/svg-art/agent-rig.js";
import { torso } from "../../src/rendering/svg-art/models/hero.js";
import { lookFromIds } from "./helpers/golden-looks.js";

const LEGACY_FRAMES = ["standard", "strider", "vanguard", "operator", "wraith", "breacher"];

describe("wardrobe registries", () => {
  it("validateWardrobe() returns []", () => {
    expect(validateWardrobe()).toEqual([]);
  });

  it("every BODY_FRAMES id has FRAME_ART", () => {
    for (const { id } of BODY_FRAMES) expect(FRAME_ART[id], id).toBeTruthy();
  });

  it("BODY_FRAMES order equals issue theme order", () => {
    expect(WARDROBE_THEMES[0].id).toBe("issue");
    expect(BODY_FRAMES.map((e) => e.id)).toEqual(WARDROBE_THEMES.flatMap((t) => t.frames.map((e) => e.id)));
    expect(WARDROBE_THEMES[0].frames.map((e) => e.id)).toEqual(LEGACY_FRAMES);
  });

  it("tags every table entry with its theme", () => {
    for (const e of BODY_FRAMES) expect(e.theme).toBe(themeOf("frames", e.id));
    expect(themeOf("frames", "wraith")).toBe("issue");
    expect(themeOf("frames", "no-such-frame")).toBeUndefined();
  });

  it("names the hides vocabulary exactly", () => {
    expect([...HIDES]).toEqual(["kit", "collar", "hips", "shoulders", "cape", "limbGlow"]);
    expect(Object.isFrozen(HIDES)).toBe(true);
  });

  it("carries the legacy flags as hides words", () => {
    expect(FRAME_ART.operator.shape.hides).toEqual(["shoulders", "limbGlow"]);
    expect(FRAME_ART.wraith.shape.hides).toEqual(["cape", "limbGlow"]);
    for (const id of ["standard", "strider", "vanguard", "breacher"]) expect(FRAME_ART[id].shape.hides).toEqual([]);
    expect(frameHides("operator", "shoulders")).toBe(true);
    expect(frameHides("wraith", "cape")).toBe(true);
    expect(frameHides("wraith", "shoulders")).toBe(false);
    expect(frameHides("standard", "limbGlow")).toBe(false);
  });

  it("treats an unknown frame as the standard frame", () => {
    for (const word of HIDES) expect(frameHides("no-such-frame", word)).toBe(false);
  });

  it("rejects a hides word outside the vocabulary", () => {
    expect(() => frameHides("standard", "helmet")).toThrow(/helmet/);
  });
});

describe("validateWardrobe", () => {
  const entry = (id) => ({ id, name: id, desc: id });
  const art = (hides = []) => ({ shape: { width: 1, shoulder: 1, hides }, layers: () => ({ under: "", legs: "", torso: "", arms: "", glow: "" }) });
  const theme = (id, frames) => ({ id, name: id, frames: frames.map(entry), helmets: [], shoulders: [] });

  it("reports a duplicate id across themes", () => {
    const themes = [theme("a", ["x"]), theme("b", ["x"])];
    const msgs = validateWardrobe(themes, [{ id: "a", frames: { x: art() } }]);
    expect(msgs.some((m) => /duplicate/.test(m) && /"x"/.test(m))).toBe(true);
  });

  it("reports an entry without art and art without an entry", () => {
    const msgs = validateWardrobe([theme("a", ["x"])], [{ id: "a", frames: { y: art() } }]);
    expect(msgs.some((m) => /no art/.test(m) && /"x"/.test(m))).toBe(true);
    expect(msgs.some((m) => /no entry/.test(m) && /"y"/.test(m))).toBe(true);
  });

  it("reports an unknown hides word", () => {
    const msgs = validateWardrobe([theme("a", ["x"])], [{ id: "a", frames: { x: art(["cape", "boots"]) } }]);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/"boots"/);
  });

  it("passes a consistent pair", () => {
    expect(validateWardrobe([theme("a", ["x"])], [{ id: "a", frames: { x: art(["kit"]) } }])).toEqual([]);
  });
});

describe("the rig honours every hides word", () => {
  /** Render a look as if the standard frame hid `words`. */
  function partsHiding(words, ids) {
    const shape = FRAME_ART.standard.shape;
    const was = shape.hides;
    shape.hides = words;
    try {
      return buildAgentParts(lookFromIds({ frame: "standard", ...ids }), { pose: "idle" });
    } finally {
      shape.hides = was;
    }
  }
  const TASSET = "M-4.8,-22.4 L-14.6,-23";

  it("hips: leaves off the belt's hip plates", () => {
    expect(torso()).toContain(TASSET);
    expect(torso({ hips: false })).not.toContain(TASSET);
    // The rig warps the torso to the build, so compare sizes, not paths.
    const cyl = (m) => m.split('fill="url(#cyl)"').length;
    expect(cyl(partsHiding(["hips"]).body)).toBe(cyl(partsHiding([]).body) - 1);
  });

  it("collar: drops the suit's collar", () => {
    const stock = partsHiding([]);
    const hidden = partsHiding(["collar"]);
    expect(stock.collar).not.toBe("");
    expect(hidden.collar).toBe("");
    expect(hidden.body.length).toBeLessThan(stock.body.length);
  });

  it("kit: drops the armour's chest kit and its light", () => {
    const stock = partsHiding([], { armor: "heavy" });
    const hidden = partsHiding(["kit"], { armor: "heavy" });
    expect(hidden.body.length).toBeLessThan(stock.body.length);
    expect(hidden.glow.length).toBeLessThan(stock.glow.length);
    expect(hidden.back).toBe(stock.back);
  });

  it("shoulders, cape, limbGlow: drop their stock layers", () => {
    const stock = partsHiding([]);
    expect(partsHiding(["shoulders"]).body.length).toBeLessThan(stock.body.length);
    expect(stock.cape).not.toBe("");
    expect(partsHiding(["cape"]).cape).toBe("");
    expect(partsHiding(["limbGlow"]).glow.length).toBeLessThan(stock.glow.length);
  });
});
