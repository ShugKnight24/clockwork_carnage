import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { BODY_FRAMES, HELMET_STYLES, SHOULDER_STYLES } from "../../src/data/cosmetics.js";
import { ACCESSORIES } from "../../src/data/accessories.js";
import { WARDROBE_THEMES, FACE_HELMETS, themeOf } from "../../src/data/wardrobe-themes/index.js";
import {
  FRAME_ART,
  HELMET_ART,
  SHOULDER_ART,
  HIDES,
  HELMET_SEATS,
  frameArt,
  frameHides,
  helmetArt,
  helmetSeats,
  shoulderArt,
  validateWardrobe,
} from "../../src/rendering/svg-art/wardrobe-themes/index.js";
import { rigAnchors, buildAgentSvg, buildCastModel } from "../../src/rendering/svg-art/agent-rig.js";
import { STAND } from "../../src/rendering/svg-art/models/hero.js";
import { lookFromIds } from "./helpers/golden-looks.js";

const LEGACY_FRAMES = ["standard", "strider", "vanguard", "operator", "wraith", "breacher"];
const LEGACY_HELMETS = ["standard", "wide", "angular", "mohawk", "crested", "ordnance", "bucket", "crusader", "sealed", "reaper", "pilot", "bandana"];
const LEGACY_SHOULDERS = ["none", "pads", "spikes", "pauldrons", "armored", "slab", "dome", "ordnance", "layered"];

// The rig's fixed helmet badge point before the move (A.helmet), the same on every helmet.
const LEGACY_BADGE = { x: -8.6, y: -90, rot: -8, size: 4.6 };

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

  it("the Strider names its bare right shoulder in its shape; no other legacy frame has one", () => {
    expect(FRAME_ART.strider.shape.rightShoulder).toBe("none");
    for (const id of LEGACY_FRAMES.filter((f) => f !== "strider")) expect(FRAME_ART[id].shape.rightShoulder, id).toBeUndefined();
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
      expect({ ...HELMET_ART[id].anchors }, id).toEqual({ ...LEGACY_ANCHORS[id], badge: LEGACY_BADGE });
      const { top, half, rail } = LEGACY_ANCHORS[id];
      const A = rigAnchors(STAND, [0, 0], "standing", id);
      expect(A.helmet, id).toEqual(LEGACY_BADGE);
      expect(A.crown.y, id).toBeCloseTo(top + 0.8, 10);
      expect(A.browL.y, id).toBeCloseTo(top + 7.6, 10);
      expect(A.sideL.x, id).toBeCloseTo(-half + 0.2, 10);
      expect(A.sideL.y, id).toBe(rail);
    }
  });

  it("FACE_HELMETS equals {wide, mohawk, brim}, derived from the data and read-only", () => {
    expect([...FACE_HELMETS].sort()).toEqual(["brim", "mohawk", "wide"]);
    expect([...FACE_HELMETS].sort()).toEqual(HELMET_STYLES.filter((e) => e.face === true).map((e) => e.id).sort());
    expect(() => FACE_HELMETS.add("standard")).toThrow();
    expect(() => FACE_HELMETS.delete("wide")).toThrow();
    expect(() => FACE_HELMETS.clear()).toThrow();
    expect(FACE_HELMETS.has("wide")).toBe(true);
    expect(FACE_HELMETS.size).toBe(3);
  });

  it("throws on an unknown helmet rather than drawing another", () => {
    expect(() => helmetArt("no-such-helmet")).toThrow(/no-such-helmet/);
    expect(() => rigAnchors(STAND, [0, 0], "standing", "no-such-helmet")).toThrow(/no-such-helmet/);
  });

  it("freezes every helmet's art and anchors", () => {
    for (const art of Object.values(HELMET_ART)) {
      expect(Object.isFrozen(art)).toBe(true);
      expect(Object.isFrozen(art.anchors)).toBe(true);
      if (art.anchors.badge) expect(Object.isFrozen(art.anchors.badge)).toBe(true);
      if (art.seats) expect(Object.isFrozen(art.seats)).toBe(true);
    }
  });

  it("seats accessories on every helmet but the Centurion's crown, and names the seats exactly", () => {
    expect([...HELMET_SEATS]).toEqual(["crown", "brow", "side"]);
    expect(Object.isFrozen(HELMET_SEATS)).toBe(true);
    for (const id of LEGACY_HELMETS) {
      expect(helmetSeats(id), id).toEqual({ crown: id !== "mohawk", brow: true, side: true });
      expect(rigAnchors(STAND, [0, 0], "standing", id).seats, id).toEqual(helmetSeats(id));
    }
    expect(HELMET_ART.mohawk.seats).toEqual({ crown: false });
  });

  it("every helmet accessory names the seat it needs", () => {
    for (const item of ACCESSORIES.helmet.slice(1)) expect(HELMET_SEATS, item.id).toContain(item.seat);
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

describe("the Exo-Frame theme", () => {
  it("comes second, with one tier-3 frame, helmet and shoulder", () => {
    expect(WARDROBE_THEMES.map((t) => t.id).slice(0, 2)).toEqual(["issue", "exo"]);
    const exo = WARDROBE_THEMES[1];
    expect(exo.name).toBe("Exo-Frame");
    expect(exo.frames.map((e) => [e.id, e.tier])).toEqual([["exo", 3]]);
    expect(exo.helmets.map((e) => [e.id, e.tier])).toEqual([["cockpit", 3]]);
    expect(exo.shoulders.map((e) => [e.id, e.tier])).toEqual([["pods", 3]]);
    for (const [table, id] of [["frames", "exo"], ["helmets", "cockpit"], ["shoulders", "pods"]]) expect(themeOf(table, id)).toBe("exo");
  });

  it("grows the silhouette, hides no stock layer, and seats the cockpit's gear on its cage and sensor blocks", () => {
    expect({ ...FRAME_ART.exo.shape, hides: [...FRAME_ART.exo.shape.hides] }).toEqual({ width: 1.14, shoulder: 1.2, hides: [] });
    expect(helmetSeats("cockpit")).toEqual({ crown: true, brow: true, side: true });
    const A = rigAnchors(STAND, [0, 0], "standing", "cockpit");
    expect(A.crown.y).toBeCloseTo(-100.8, 10);
    expect(A.sideL.x).toBeCloseTo(-15.8, 10);
    expect(A.helmet).toEqual({ x: -7.6, y: -93.4, rot: -6, size: 4.2 });
    expect(FACE_HELMETS.has("cockpit")).toBe(false);
  });
});

// The themes in creator order; the spike's later themes join as they are ported.
const THEME_ORDER = ["issue", "exo", "marshal", "ronin", "horologist", "runner", "diver", "ranger", "chronomancer"];
const PORTED = ["issue", "exo", "marshal", "ronin"];

describe("the spike themes", () => {
  const spike = () => WARDROBE_THEMES.filter((t) => !["issue", "exo"].includes(t.id));

  it("every theme ported so far is registered in theme order", () => {
    const ids = WARDROBE_THEMES.map((t) => t.id);
    expect(ids).toEqual(PORTED);
    expect(ids).toEqual(THEME_ORDER.slice(0, ids.length));
  });

  it("each has one frame (tier 2), helmet (tier 3) and shoulder (tier 2), all its own", () => {
    for (const t of spike()) {
      expect(t.frames.map((e) => e.tier), t.id).toEqual([2]);
      expect(t.helmets.map((e) => e.tier), t.id).toEqual([3]);
      expect(t.shoulders.map((e) => e.tier), t.id).toEqual([2]);
      for (const table of ["frames", "helmets", "shoulders"]) expect(themeOf(table, t[table][0].id), t.id).toBe(t.id);
    }
  });

  it("the Marshal's duster covers the kit, the cape and the limb light; the brim is an open hat with no brow seat", () => {
    expect([...FRAME_ART.duster.shape.hides]).toEqual(["kit", "cape", "limbGlow"]);
    expect(HELMET_STYLES.find((e) => e.id === "brim")).toMatchObject({ face: true, visor: false });
    expect(helmetSeats("brim")).toEqual({ crown: true, brow: false, side: true });
    expect(HELMET_ART.brim.anchors.badge).toBe(false);
  });
});

describe("the Ronin theme", () => {
  it("wears the laced plate over the suit, the kabuto's crest and fitting take the crown and brow, the badge rides the wing", () => {
    expect([...FRAME_ART.lamellar.shape.hides]).toEqual([]);
    expect(FRAME_ART.lamellar.shape.softTorso).toBe(true);
    expect(HELMET_STYLES.find((e) => e.id === "kabuto").visor).toBe(false);
    expect(FACE_HELMETS.has("kabuto")).toBe(false);
    expect(helmetSeats("kabuto")).toEqual({ crown: false, brow: false, side: true });
    expect(rigAnchors(STAND, [0, 0], "standing", "kabuto").helmet).toEqual({ x: -15.6, y: -86.8, rot: -12, size: 3.8 });
  });
});

describe("every theme piece draws cleanly", () => {
  // Each theme's own set, both builds, both poses and fallen: no NaN or
  // undefined in the markup, ids unique in the figure, every url(#…) one of its own.
  const looks = WARDROBE_THEMES.filter((t) => t.id !== "issue").map((t) => [t.id, { frame: t.frames[0].id, helmet: t.helmets[0].id, shoulder: t.shoulders[0].id }]);
  const check = (markup) => {
    expect(markup).not.toMatch(/NaN|undefined/);
    const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [, ref] of markup.matchAll(/url\(#([^)]+)\)/g)) expect(ids, ref).toContain(ref);
  };
  it.each(looks)("%s", (id, pieces) => {
    for (const body of ["masc", "fem"]) {
      for (const pose of ["idle", "hero"]) check(buildAgentSvg(lookFromIds({ ...pieces, body }), { pose, idPrefix: "t-" }));
    }
    const fallen = buildCastModel(lookFromIds(pieces), "hero_fallen");
    check(`<defs>${fallen.defs}</defs>` + fallen.layers.map((l) => l.markup).join(""));
  });
});

describe("shoulders", () => {
  it("every SHOULDER_STYLES id has SHOULDER_ART", () => {
    for (const { id } of SHOULDER_STYLES) {
      expect(SHOULDER_ART[id], id).toBeTruthy();
      expect(typeof SHOULDER_ART[id].paint, id).toBe("function");
    }
  });

  it("SHOULDER_STYLES order equals issue theme order", () => {
    expect(SHOULDER_STYLES.map((e) => e.id)).toEqual(WARDROBE_THEMES.flatMap((t) => t.shoulders.map((e) => e.id)));
    expect(WARDROBE_THEMES[0].shoulders.map((e) => e.id)).toEqual(LEGACY_SHOULDERS);
    for (const e of SHOULDER_STYLES) expect(e.theme).toBe(themeOf("shoulders", e.id));
  });

  it("throws on an unknown shoulder rather than drawing another", () => {
    expect(() => shoulderArt("no-such-shoulder")).toThrow(/no-such-shoulder/);
  });

  it("freezes every shoulder's art; no legacy piece caps the frame's scale", () => {
    for (const [id, art] of Object.entries(SHOULDER_ART)) {
      expect(Object.isFrozen(art), id).toBe(true);
      if (LEGACY_SHOULDERS.includes(id)) expect(art.maxShoulderScale, id).toBeUndefined();
    }
  });
});

describe("validateWardrobe", () => {
  const entry = (id) => ({ id, name: id, desc: id });
  const art = (hides = []) => ({ shape: { width: 1, shoulder: 1, hides }, layers: () => ({ under: "", legs: "", torso: "", arms: "", glow: "" }) });
  const theme = (id, frames, helmets = [], shoulders = []) => ({ id, name: id, frames: frames.map(entry), helmets: helmets.map(entry), shoulders: shoulders.map(entry) });
  const BADGE = { x: -8.6, y: -90, rot: -8, size: 4.6 };
  const helm = (anchors = { top: -95, half: 11.2, rail: -86.4, badge: BADGE }, seats) => ({ paint: () => ({ front: "", glow: "" }), anchors, ...(seats && { seats }) });
  const pad = (extra = {}) => ({ paint: () => "", ...extra });

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

  it("reports a rightShoulder that is not a shoulder id", () => {
    const run = (rightShoulder) =>
      validateWardrobe([theme("a", ["x"], [], ["p"])], [{ id: "a", frames: { x: { ...art(), shape: { width: 1, shoulder: 1, hides: [], rightShoulder } } }, shoulders: { p: pad() } }]);
    expect(run(undefined)).toEqual([]);
    expect(run("p")).toEqual([]);
    expect(run("q")).toEqual([expect.stringMatching(/frames: "x" shape\.rightShoulder "q" is not a shoulder/)]);
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
    const bad = validateWardrobe([theme("a", [], ["h"])], [{ id: "a", helmets: { h: helm({ top: Number.NaN, half: "11", rail: Infinity, badge: BADGE }) } }]);
    expect(bad).toHaveLength(3);
    for (const key of ["top", "half", "rail"]) expect(bad.some((m) => m.includes(`anchors.${key}`))).toBe(true);
    // No anchors at all: the three numbers and the badge point's four.
    const none = validateWardrobe([theme("a", [], ["h"])], [{ id: "a", helmets: { h: { paint: () => ({}) } } }]);
    expect(none).toHaveLength(7);
  });

  it("takes a badge point or badge: false, and reports a partial or missing one", () => {
    const run = (badge) => validateWardrobe([theme("a", [], ["h"])], [{ id: "a", helmets: { h: helm({ top: -95, half: 11.2, rail: -86.4, badge }) } }]);
    expect(run(BADGE)).toEqual([]);
    expect(run(false)).toEqual([]);
    expect(run({ x: 1, y: 2, rot: 0 })).toEqual([expect.stringMatching(/"h" anchors\.badge\.size/)]);
    expect(run(undefined)).toHaveLength(4);
    expect(run(null)).toHaveLength(4);
  });

  it("reports an unknown seat word or a seat that is not true or false", () => {
    const run = (seats) => validateWardrobe([theme("a", [], ["h"])], [{ id: "a", helmets: { h: helm(undefined, seats) } }]);
    expect(run({ crown: false, side: true })).toEqual([]);
    expect(run({ crown: false, chin: false })).toEqual([expect.stringMatching(/"h" seats unknown seat "chin"/)]);
    expect(run({ brow: "no" })).toEqual([expect.stringMatching(/"h" seats\.brow is not true or false/)]);
  });

  it("reports a shoulder without art, shoulder art without an entry, and one filed under another theme", () => {
    const msgs = validateWardrobe([theme("a", [], [], ["p"])], [{ id: "a", shoulders: { q: pad() } }]);
    expect(msgs).toHaveLength(2);
    expect(msgs.some((m) => /^shoulders: "p" .*no art/.test(m))).toBe(true);
    expect(msgs.some((m) => /^shoulders: art "q" .*no entry/.test(m))).toBe(true);
    const moved = validateWardrobe([theme("a", [], [], ["p"]), theme("b", [])], [{ id: "a" }, { id: "b", shoulders: { p: pad() } }]);
    expect(moved).toEqual([expect.stringMatching(/^shoulders: art "p" is in theme "b" but its entry is in "a"/)]);
  });

  it("reports a shoulder without a paint function or with a maxShoulderScale that is not a finite number", () => {
    const run = (art) => validateWardrobe([theme("a", [], [], ["p"])], [{ id: "a", shoulders: { p: art } }]);
    expect(run(pad({ paint: undefined }))).toEqual([expect.stringMatching(/shoulders: "p" has no paint function/)]);
    expect(run(pad({ maxShoulderScale: 1.1 }))).toEqual([]);
    for (const bad of [Number.NaN, Infinity, "1", undefined]) {
      expect(run(pad({ maxShoulderScale: bad })), String(bad)).toEqual([expect.stringMatching(/shoulders: "p" maxShoulderScale is not a finite number/)]);
    }
  });

  it("passes a consistent pair", () => {
    expect(validateWardrobe([theme("a", ["x"])], [{ id: "a", frames: { x: art(["kit"]) } }])).toEqual([]);
    expect(validateWardrobe([theme("a", ["x"], ["h"])], [{ id: "a", frames: { x: art() }, helmets: { h: helm() } }])).toEqual([]);
    expect(validateWardrobe([theme("a", [], [], ["p"])], [{ id: "a", shoulders: { p: pad({ maxShoulderScale: 1 }) } }])).toEqual([]);
  });
});

