import { describe, it, expect } from "vitest";
import { BODY_FRAMES } from "../../src/data/cosmetics.js";
import { WARDROBE_THEMES, themeOf } from "../../src/data/wardrobe-themes/index.js";
import { FRAME_ART, HIDES, frameArt, frameHides, validateWardrobe } from "../../src/rendering/svg-art/wardrobe-themes/index.js";

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

  it("throws on an unknown frame rather than drawing another", () => {
    expect(() => frameHides("no-such-frame", "cape")).toThrow(/no-such-frame/);
    expect(() => frameArt("no-such-frame")).toThrow(/no-such-frame/);
  });

  it("freezes every theme, table, entry and art shape", () => {
    for (const t of WARDROBE_THEMES) {
      expect(Object.isFrozen(t)).toBe(true);
      for (const key of ["frames", "helmets", "shoulders"]) {
        expect(Object.isFrozen(t[key])).toBe(true);
        for (const e of t[key]) expect(Object.isFrozen(e)).toBe(true);
      }
    }
    expect(Object.isFrozen(WARDROBE_THEMES)).toBe(true);
    for (const art of Object.values(FRAME_ART)) {
      expect(Object.isFrozen(art)).toBe(true);
      expect(Object.isFrozen(art.shape)).toBe(true);
      expect(Object.isFrozen(art.shape.hides)).toBe(true);
    }
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

  it("reports theme ids that do not match between data and art", () => {
    const msgs = validateWardrobe([theme("a", [])], [{ id: "b", frames: {} }]);
    expect(msgs.some((m) => /theme "a" has no art module/.test(m))).toBe(true);
    expect(msgs.some((m) => /art module "b" has no data theme/.test(m))).toBe(true);
  });

  it("reports art filed under another theme than its entry", () => {
    const msgs = validateWardrobe([theme("a", ["x"]), theme("b", [])], [{ id: "a", frames: {} }, { id: "b", frames: { x: art() } }]);
    expect(msgs).toEqual([expect.stringMatching(/"x" is in theme "b" but its entry is in "a"/)]);
  });

  it("reports a frame without a layers function", () => {
    const msgs = validateWardrobe([theme("a", ["x"])], [{ id: "a", frames: { x: { ...art(), layers: "nope" } } }]);
    expect(msgs).toEqual([expect.stringMatching(/"x" has no layers function/)]);
  });

  it("reports a width or shoulder that is not a finite number", () => {
    const bad = { ...art(), shape: { width: Number.NaN, shoulder: "1", hides: [] } };
    const msgs = validateWardrobe([theme("a", ["x"])], [{ id: "a", frames: { x: bad } }]);
    expect(msgs).toHaveLength(2);
    expect(msgs.some((m) => /shape\.width/.test(m))).toBe(true);
    expect(msgs.some((m) => /shape\.shoulder/.test(m))).toBe(true);
  });

  it("passes a consistent pair", () => {
    expect(validateWardrobe([theme("a", ["x"])], [{ id: "a", frames: { x: art(["kit"]) } }])).toEqual([]);
  });
});

