import { describe, it, expect, vi, afterEach } from "vitest";

// The raster cache, faked: every figure decodes but one in the diving suit
// (lookKey holds the frame id), which the browser could not draw.
const isBroken = (id) => id.includes(".diving.");
vi.mock("../../src/rendering/svg-art/raster.js", () => ({
  getLayerImage: (id) => (isBroken(id) ? null : { id }),
  layerFailed: (id) => isBroken(id),
}));

const { CREATOR_CATEGORIES, previewFigure, renderCharacterCreator } = await import("../../src/ui/character-creator.js");
const { DEFAULT_CHARACTER } = await import("../../src/data/index.js");
const { cloneLook } = await import("../../src/core/character-fields.js");

/** A 2D context that records the bitmaps drawn and does nothing else. */
function drawCtx() {
  const drawn = [];
  const o = { drawn, measureText: (t) => ({ width: String(t).length * 6 }), drawImage: (img) => drawn.push(img.id) };
  return new Proxy(o, { get: (t, k) => (k in t ? t[k] : () => {}), set: () => true });
}

const armor = CREATOR_CATEGORIES.findIndex((c) => c.key === "armor");
const frame = (ch) => {
  const ctx = drawCtx();
  renderCharacterCreator(ctx, 1280, 720, armor, ch, false, null, 0, null);
  return ctx.drawn.filter((id) => id.startsWith("legacy-agent:"));
};

afterEach(() => vi.restoreAllMocks());

describe("legacy creator preview, a figure that fails to decode", () => {
  it("keeps the last good figure, stops waiting on the broken one, and says so once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const good = cloneLook(DEFAULT_CHARACTER);
    const [first] = frame(good);
    expect(first).toBeTruthy();
    expect(previewFigure().shown).toBe(previewFigure().wanted);

    const key = previewFigure().shown;
    const bad = { ...good, frame: "diving" };
    for (let i = 0; i < 3; i++) expect(frame(bad)).toEqual([first]);
    expect(previewFigure().wanted).toBeNull();
    expect(previewFigure().shown).toBe(key);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/failed to decode/);
  });
});
