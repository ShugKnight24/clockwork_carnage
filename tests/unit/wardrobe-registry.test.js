import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { BODY_FRAMES, HELMET_STYLES } from "../../src/data/cosmetics.js";
import { WARDROBE_THEMES, FACE_HELMETS, themeOf } from "../../src/data/wardrobe-themes/index.js";
import { FRAME_ART, HELMET_ART, HIDES, frameArt, frameHides, helmetArt, validateWardrobe } from "../../src/rendering/svg-art/wardrobe-themes/index.js";
import { rigAnchors } from "../../src/rendering/svg-art/agent-rig.js";
import { STAND } from "../../src/rendering/svg-art/models/hero.js";

const LEGACY_FRAMES = ["standard", "strider", "vanguard", "operator", "wraith", "breacher"];
const LEGACY_HELMETS = ["standard", "wide", "angular", "mohawk", "crested", "ordnance", "bucket", "crusader", "sealed", "reaper", "pilot", "bandana"];

// The rig's per-helmet tables before the move (SHELL_TOP, SHELL_HALF,
// SIDE_RAIL); a helmet missing from one took the fallback (standard's top and
// half, a -86.4 rail).
const LEGACY_ANCHORS = {
  standard: { top: -95, half: 11.2, rail: -86.4 },
  wide: { top: -96.4, half: 14.2, rail: -86.4 },
  angular: { top: -96, half: 12.2, rail: -86.4 },
  mohawk: { top: -95, half: 11.7, rail: -86.4 },
  crested: { top: -95.6, half: 11.4, rail: -86.4 },
  ordnance: { top: -97.4, half: 12.5, rail: -79.4 },
  bucket: { top: -93.2, half: 13.7, rail: -86.4 },
  crusader: { top: -97, half: 11.7, rail: -86.4 },
  sealed: { top: -95.8, half: 11.7, rail: -86.4 },
  reaper: { top: -95, half: 11.2, rail: -86.4 },
  pilot: { top: -95, half: 11.2, rail: -86.4 },
  bandana: { top: -95, half: 11.2, rail: -86.4 },
};

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

describe("helmets", () => {
  it("every HELMET_STYLES id has HELMET_ART with numeric anchors", () => {
    for (const { id } of HELMET_STYLES) {
      const art = HELMET_ART[id];
      expect(art, id).toBeTruthy();
      expect(typeof art.paint, id).toBe("function");
      for (const key of ["top", "half", "rail"]) expect(Number.isFinite(art.anchors[key]), `${id} ${key}`).toBe(true);
    }
  });

  it("HELMET_STYLES order equals issue theme order", () => {
    expect(HELMET_STYLES.map((e) => e.id)).toEqual(WARDROBE_THEMES.flatMap((t) => t.helmets.map((e) => e.id)));
    expect(WARDROBE_THEMES[0].helmets.map((e) => e.id)).toEqual(LEGACY_HELMETS);
    for (const e of HELMET_STYLES) expect(e.theme).toBe(themeOf("helmets", e.id));
  });

  it("carries today's anchors per helmet, and rigAnchors seats crown gear on them", () => {
    for (const id of LEGACY_HELMETS) {
      expect({ ...HELMET_ART[id].anchors }, id).toEqual(LEGACY_ANCHORS[id]);
      const { top, half, rail } = LEGACY_ANCHORS[id];
      const A = rigAnchors(STAND, [0, 0], "standing", id);
      expect(A.crown.y, id).toBeCloseTo(top + 0.8, 10);
      expect(A.browL.y, id).toBeCloseTo(top + 7.6, 10);
      expect(A.sideL.x, id).toBeCloseTo(-half + 0.2, 10);
      expect(A.sideL.y, id).toBe(rail);
    }
  });

  it("FACE_HELMETS equals {wide, mohawk}, derived from the data and read-only", () => {
    expect([...FACE_HELMETS].sort()).toEqual(["mohawk", "wide"]);
    expect([...FACE_HELMETS].sort()).toEqual(HELMET_STYLES.filter((e) => e.face === true).map((e) => e.id).sort());
    expect(() => FACE_HELMETS.add("standard")).toThrow();
    expect(() => FACE_HELMETS.delete("wide")).toThrow();
    expect(() => FACE_HELMETS.clear()).toThrow();
    expect(FACE_HELMETS.has("wide")).toBe(true);
    expect(FACE_HELMETS.size).toBe(2);
  });

  it("throws on an unknown helmet rather than drawing another", () => {
    expect(() => helmetArt("no-such-helmet")).toThrow(/no-such-helmet/);
    expect(() => rigAnchors(STAND, [0, 0], "standing", "no-such-helmet")).toThrow(/no-such-helmet/);
  });

  it("freezes every helmet's art and anchors", () => {
    for (const art of Object.values(HELMET_ART)) {
      expect(Object.isFrozen(art)).toBe(true);
      expect(Object.isFrozen(art.anchors)).toBe(true);
    }
  });

  it("agent-rig.js source has no helmet-id case", () => {
    // The shoulder painter still switches on shoulder ids, one of which
    // ("ordnance") is also a helmet id; it is cut out until shoulders move.
    const src = readFileSync(new URL("../../src/rendering/svg-art/agent-rig.js", import.meta.url), "utf8").replace(/\nfunction shoulder\([\s\S]*?\n}\n/, "\n");
    for (const id of LEGACY_HELMETS) {
      expect(src, id).not.toContain(`case "${id}"`);
      expect(src, id).not.toMatch(new RegExp(`[!=]==? ?"${id}"`));
    }
    expect(src).not.toMatch(/helmet\s*[!=]==/);
    expect(src).not.toMatch(/style\s*[!=]==/);
  });

  it("no module keeps its own list of open helmets", () => {
    const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
    expect(read("src/rendering/svg-art/agent-rig.js")).not.toMatch(/OPEN_HELMETS/);
    for (const p of ["src/ui/portrait-modern.js", "src/ui/character-creator.js", "js/components/agent-showroom.js", "src/rendering/svg-art/agent-rig.js"]) {
      const src = read(p);
      expect(src, p).toMatch(/import \{[^}]*\bFACE_HELMETS\b[^}]*\} from "[./]*\/?(?:src\/)?data\/wardrobe-themes\/index\.js"/);
      expect(src, p).not.toMatch(/new Set\(\[\s*"wide"/);
    }
  });
});

describe("validateWardrobe", () => {
  const entry = (id) => ({ id, name: id, desc: id });
  const art = (hides = []) => ({ shape: { width: 1, shoulder: 1, hides }, layers: () => ({ under: "", legs: "", torso: "", arms: "", glow: "" }) });
  const theme = (id, frames, helmets = []) => ({ id, name: id, frames: frames.map(entry), helmets: helmets.map(entry), shoulders: [] });
  const helm = (anchors = { top: -95, half: 11.2, rail: -86.4 }) => ({ paint: () => ({ front: "", glow: "" }), anchors });

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

  it("reports a helmet without art and helmet art without an entry", () => {
    const msgs = validateWardrobe([theme("a", [], ["h"])], [{ id: "a", frames: {}, helmets: { g: helm() } }]);
    expect(msgs).toHaveLength(2);
    expect(msgs.some((m) => /^helmets: "h" .*no art/.test(m))).toBe(true);
    expect(msgs.some((m) => /^helmets: art "g" .*no entry/.test(m))).toBe(true);
  });

  it("reports a duplicate helmet across themes and helmet art filed under another theme", () => {
    const dup = validateWardrobe([theme("a", [], ["h"]), theme("b", [], ["h"])], [{ id: "a", helmets: { h: helm() } }, { id: "b" }]);
    expect(dup.some((m) => /^helmets: duplicate id "h"/.test(m))).toBe(true);
    const moved = validateWardrobe([theme("a", [], ["h"]), theme("b", [])], [{ id: "a" }, { id: "b", helmets: { h: helm() } }]);
    expect(moved).toEqual([expect.stringMatching(/^helmets: art "h" is in theme "b" but its entry is in "a"/)]);
  });

  it("reports a helmet without a paint function", () => {
    const msgs = validateWardrobe([theme("a", [], ["h"])], [{ id: "a", helmets: { h: { ...helm(), paint: null } } }]);
    expect(msgs).toEqual([expect.stringMatching(/helmets: "h" has no paint function/)]);
  });

  it("reports helmet anchors that are missing or not finite numbers", () => {
    const bad = validateWardrobe([theme("a", [], ["h"])], [{ id: "a", helmets: { h: helm({ top: Number.NaN, half: "11", rail: Infinity }) } }]);
    expect(bad).toHaveLength(3);
    for (const key of ["top", "half", "rail"]) expect(bad.some((m) => m.includes(`anchors.${key}`))).toBe(true);
    const none = validateWardrobe([theme("a", [], ["h"])], [{ id: "a", helmets: { h: { paint: () => ({}) } } }]);
    expect(none).toHaveLength(3);
  });

  it("passes a consistent pair", () => {
    expect(validateWardrobe([theme("a", ["x"])], [{ id: "a", frames: { x: art(["kit"]) } }])).toEqual([]);
    expect(validateWardrobe([theme("a", ["x"], ["h"])], [{ id: "a", frames: { x: art() }, helmets: { h: helm() } }])).toEqual([]);
  });
});

