// Accessory paint colours: War Paint takes a colour of its own, never the
// suit's. The pick is kept per slot in accessoryTints, normalised to a valid
// #rrggbb for an item that declares a tint, saved, part of the look's key,
// and drawn from the resolved colour.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ACCESSORIES, PAINT_SWATCHES, TINT_HEX, accessoryItem, tintFor } from "../../src/data/accessories.js";
import { DEFAULT_CHARACTER } from "../../src/data/cosmetics.js";
import { normalizeAccessoryTints } from "../../src/core/character-normalize.js";
import { cloneLook, lookKey, withId, withIndex, withTint } from "../../src/core/character-fields.js";
import { saveCharacter, loadCharacter } from "../../src/core/save-system.js";
import { buildAgentParts } from "../../src/rendering/svg-art/agent-rig.js";
import { validateWardrobe } from "../../src/rendering/svg-art/wardrobe-themes/index.js";
import { CREATOR_CATEGORIES, PAINT_SWATCH_MIN_TOUCH, faceSlotFoot, getCreatorLayout, listRows } from "../../src/ui/character-creator.js";
import { WARDROBE_THEMES } from "../../src/data/wardrobe-themes/index.js";
import { lookFromIds } from "./helpers/golden-looks.js";

const painted = (ids, tint) => {
  const ch = lookFromIds(ids);
  return { ...ch, accessories: { ...ch.accessories, face: "warpaint" }, accessoryTints: tint ? { face: tint } : {} };
};
/** The fill colours of the war paint drawn on a figure's head. */
const paintFills = (ch) => {
  const head = buildAgentParts(ch, { peek: true }).head;
  const group = head.match(/<g data-acc="warpaint">(.*?)<\/g>/)[1];
  return [...new Set([...group.matchAll(/fill="([^"]+)"/g)].map((m) => m[1]))];
};

describe("war paint colour", () => {
  it("declares a tint with a default and a label; the paint swatches are the plan's seven", () => {
    expect(accessoryItem("face", "warpaint").tint).toEqual({ default: "#b0302a", label: "Paint" });
    expect(PAINT_SWATCHES.map((p) => p.hex)).toEqual(["#b0302a", "#121212", "#f2efe8", "#2f4f8f", "#7d8288", "#3f7a3a", "#d9b02c"]);
    for (const p of PAINT_SWATCHES) expect(p.hex).toMatch(TINT_HEX);
    // Only War Paint takes a colour for now.
    const tinted = Object.entries(ACCESSORIES).flatMap(([slot, items]) => items.filter((i) => i.tint).map((i) => `${slot}.${i.id}`));
    expect(tinted).toEqual(["face.warpaint"]);
  });

  it("war paint defaults to #b0302a", () => {
    expect(tintFor(painted({}), "face")).toBe("#b0302a");
    expect(paintFills(painted({}))).toEqual(["#b0302a"]);
    expect(DEFAULT_CHARACTER.accessoryTints).toEqual({});
  });

  it("war paint uses its tint, not the suit primary", () => {
    for (const tint of ["#2f4f8f", "#f2efe8"]) {
      const a = paintFills(painted({ color: "chrono_teal" }, tint));
      const b = paintFills(painted({ color: "midnight_blue" }, tint));
      expect(a).toEqual([tint]);
      expect(b).toEqual(a);
    }
    // And the suit's own colour is nowhere in it.
    const look = painted({ color: "chrono_teal" });
    expect(paintFills(look)).not.toContain(buildAgentParts(look).look.pal.primary);
  });

  it("edges the paint against the skin: dark on light skin, light on deep skin", () => {
    const edge = (skinTone) => buildAgentParts(painted({ skinTone }, "#b0302a"), { peek: true }).head.match(/data-acc="warpaint"><path [^>]*stroke="([^"]+)"/)[1];
    const lum = (hex) => [1, 3, 5].reduce((s, i, k) => s + parseInt(hex.slice(i, i + 2), 16) * [0.2126, 0.7152, 0.0722][k], 0) / 255;
    expect(lum(edge("cool_fair"))).toBeLessThan(lum("#b0302a"));
    expect(lum(edge("deep_brown"))).toBeGreaterThan(lum("#b0302a"));
  });

  it("tints keep only valid hex for tintable worn items", () => {
    const worn = { face: "warpaint", waist: "belt" };
    expect(normalizeAccessoryTints({ face: "red" }, worn)).toEqual({});
    expect(normalizeAccessoryTints({ face: "#12345" }, worn)).toEqual({});
    expect(normalizeAccessoryTints({ waist: "#ffffff" }, worn)).toEqual({});
    expect(normalizeAccessoryTints({ face: "#2F4F8F", tail: "#ffffff" }, worn)).toEqual({ face: "#2f4f8f" });
    // A colour for an item not worn goes with it.
    expect(normalizeAccessoryTints({ face: "#2f4f8f" }, { face: "beard" })).toEqual({});
    for (const junk of [null, undefined, "x", [], 3]) expect(normalizeAccessoryTints(junk, worn)).toEqual({});
    // A stored colour that is not one reads as the item's default.
    expect(tintFor({ accessories: worn, accessoryTints: { face: "red" } }, "face")).toBe("#b0302a");
    expect(tintFor({ accessories: worn, accessoryTints: { face: "#2f4f8f" } }, "waist")).toBeNull();
  });

  it("tint changes lookKey, and only while the tinted item is worn", () => {
    const red = painted({}, "#b0302a");
    expect(lookKey(painted({}, "#2f4f8f"))).not.toBe(lookKey(red));
    // The default and no pick draw the same, so they key the same.
    expect(lookKey(painted({}))).toBe(lookKey(red));
    const bare = lookFromIds({});
    expect(lookKey({ ...bare, accessoryTints: { face: "#2f4f8f" } })).toBe(lookKey(bare));
  });

  it("cloneLook copies the tints; withTint sets one and refuses what cannot be painted", () => {
    const ch = painted({}, "#2f4f8f");
    const copy = cloneLook(ch);
    expect(copy.accessoryTints).toEqual({ face: "#2f4f8f" });
    expect(copy.accessoryTints).not.toBe(ch.accessoryTints);
    expect(withTint(ch, "face", "#3F7A3A")).toEqual({ accessoryTints: { face: "#3f7a3a" } });
    expect(() => withTint(ch, "face", "green")).toThrow(RangeError);
    expect(() => withTint(lookFromIds({}), "face", "#3f7a3a")).toThrow(RangeError);
  });

  it("a colour goes when its item comes off, so the item comes back in its default", () => {
    const blue = painted({}, "#2f4f8f");
    const off = { ...blue, ...withId(blue, "acc.face", "beard") };
    expect(off.accessoryTints).toEqual({});
    const on = { ...off, ...withId(off, "acc.face", "warpaint") };
    expect(tintFor(on, "face")).toBe("#b0302a");
    // The canvas creator picks by position through the same path.
    const none = { ...blue, ...withIndex(blue, "acc.face", 0) };
    expect(none.accessoryTints).toEqual({});
    // Another slot's pick keeps the colour of the item still worn.
    expect(withId(blue, "acc.eyes", "monocle").accessoryTints).toEqual({ face: "#2f4f8f" });
  });

  it("a tint without a default (or label) fails validateWardrobe()", () => {
    const withTable = (tint) => validateWardrobe(undefined, undefined, { ...ACCESSORIES, face: [...ACCESSORIES.face, { id: "x", name: "X", desc: "X", tint }] });
    expect(validateWardrobe()).toEqual([]);
    expect(withTable({ label: "Paint" })).toEqual([expect.stringMatching(/face "x" tint has no #rrggbb default/)]);
    expect(withTable({ default: "red", label: "Paint" })).toEqual([expect.stringMatching(/face "x" tint has no #rrggbb default/)]);
    expect(withTable({ default: "#ffffff" })).toEqual([expect.stringMatching(/face "x" tint has no label/)]);
    expect(withTable({ default: "#ffffff", label: "Paint" })).toEqual([]);
    expect(WARDROBE_THEMES.length).toBeGreaterThan(0);
  });
});

describe("war paint colour is saved", () => {
  const store = {};
  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key];
    vi.stubGlobal("localStorage", { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } });
  });

  it("round-trips through the character save", () => {
    saveCharacter(painted({}, "#2f4f8f"));
    const ch = cloneLook(DEFAULT_CHARACTER);
    loadCharacter(ch);
    expect(ch.accessories.face).toBe("warpaint");
    expect(ch.accessoryTints).toEqual({ face: "#2f4f8f" });
  });

  it("drops a bad colour, one for an item not worn, and loads a save from before tints with none", () => {
    store.cc_character = JSON.stringify({ version: 2, accessories: { face: "warpaint" }, accessoryTints: { face: "blue", eyes: "#ffffff" } });
    const a = cloneLook(DEFAULT_CHARACTER);
    loadCharacter(a);
    expect(a.accessoryTints).toEqual({});
    store.cc_character = JSON.stringify({ version: 2, accessories: { face: "beard" }, accessoryTints: { face: "#2f4f8f" } });
    const b = cloneLook(DEFAULT_CHARACTER);
    loadCharacter(b);
    expect(b.accessoryTints).toEqual({});
    store.cc_character = JSON.stringify({ version: 2, color: "chrono_teal", accessories: { face: "warpaint" } });
    const c = cloneLook(DEFAULT_CHARACTER);
    loadCharacter(c);
    expect(c.accessoryTints).toEqual({});
    expect(tintFor(c, "face")).toBe("#b0302a");
  });
});

describe("legacy creator paint swatches", () => {
  const face = CREATOR_CATEGORIES.find((c) => c.slot === "face");
  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  it("shows under War Paint only", () => {
    const L = getCreatorLayout(1440, 900, false, false);
    expect(faceSlotFoot(L, face, painted({ helmet: "wide" })).tint.rects).toHaveLength(PAINT_SWATCHES.length);
    expect(faceSlotFoot(L, face, lookFromIds({ helmet: "wide" }))).toBeNull();
    // Under a closed helmet: the note, and the colour can still be picked.
    const hidden = faceSlotFoot(L, face, painted({ helmet: "standard" }));
    expect(hidden.head.length).toBeGreaterThan(0);
    expect(hidden.tint.label).toBe("Paint");
    expect(hidden.noteY + (hidden.head.length + hidden.sub.length - 1) * 13).toBeLessThan(hidden.tint.labelY - 10);
  });

  it.each([[1440, 900, false, false], [375, 667, true, true], [667, 375, true, true], [844, 390, false, true], [640, 360, true, true]])(
    "fit in the list at %ix%i, out of the touch edge zones, a fingertip on touch",
    (w, h, mobile, touch) => {
      const L = getCreatorLayout(w, h, mobile, touch);
      for (const helmet of ["wide", "standard"]) {
        const ch = painted({ helmet });
        const foot = faceSlotFoot(L, face, ch);
        for (const [i, r] of foot.tint.rects.entries()) {
          if (touch) expect(Math.min(r.w, r.h), `swatch ${i}`).toBeGreaterThanOrEqual(PAINT_SWATCH_MIN_TOUCH);
          expect(r.x).toBeGreaterThanOrEqual(Math.max(L.contentX, L.inset));
          expect(r.x + r.w).toBeLessThanOrEqual(Math.min(L.contentX + L.listW, w - L.inset));
          expect(r.y + r.h).toBeLessThanOrEqual(L.contentY + L.panelH);
          for (const o of foot.tint.rects.slice(i + 1)) expect(overlap(r, o)).toBe(false);
        }
        const rows = listRows(L, face, ch);
        expect(rows).toBeGreaterThanOrEqual(2);
        expect(L.contentY + 8 + rows * L.itemH, helmet).toBeLessThanOrEqual(foot.top);
      }
    },
  );
});
