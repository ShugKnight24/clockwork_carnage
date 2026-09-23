import { describe, it, expect } from "vitest";
import { renderBadge, resolveTreatment, _cacheSize } from "../../src/rendering/svg-art/insignia/compose.js";
import { symbolMarkup } from "../../src/rendering/svg-art/insignia/symbols.js";
import { FRAME_PATHS } from "../../src/rendering/svg-art/insignia/frames.js";
import { SYMBOLS, FRAMES, FINISHES, layer } from "../../src/data/badges.js";
import { ARMOR_STYLES, DEFAULT_CHARACTER } from "../../src/data/cosmetics.js";

/** Balanced tags: every <x ...> has a </x> unless self-closed. */
function wellFormed(markup) {
  const stack = [];
  for (const m of markup.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) {
    const [, close, tag, self] = m;
    if (self) continue;
    if (close) { if (stack.pop() !== tag) return false; } else stack.push(tag);
  }
  return stack.length === 0;
}

describe("insignia", () => {
  it("every symbol draws something", () => {
    for (const s of SYMBOLS) expect(symbolMarkup(s.id, "#fff", "#000").length, s.id).toBeGreaterThan(20);
    expect(symbolMarkup("nope", "#fff", "#000")).toBe("");
  });

  it("an unknown frame falls back to the disc instead of throwing", () => {
    const stack = { layers: [layer("clock", "no-such-frame", "teal", "brass")], finish: "insignia", placements: ["chest"] };
    const disc = { layers: [layer("clock", "disc", "teal", "brass")], finish: "insignia", placements: ["chest"] };
    for (const f of FINISHES.filter((x) => x.id !== "auto")) {
      expect(() => renderBadge({ ...stack, finish: f.id }, {}), f.id).not.toThrow();
      expect(renderBadge({ ...stack, finish: f.id }, {})).toBe(renderBadge({ ...disc, finish: f.id }, {}));
    }
  });

  it("every frame has outer and inner paths", () => {
    for (const f of FRAMES) {
      expect(FRAME_PATHS[f.id].outer).toMatch(/^M/);
      expect(FRAME_PATHS[f.id].inner).toMatch(/^M/);
    }
  });

  it("every symbol x frame x finish is well-formed and id-free", () => {
    const finishes = FINISHES.map((f) => f.id).filter((f) => f !== "auto");
    for (const s of SYMBOLS) for (const f of FRAMES) for (const fin of finishes) {
      const out = renderBadge({ layers: [layer(s.id, f.id)], finish: fin, placements: ["chest"] }, { treatment: { finish: "insignia", metal: "brass" } });
      expect(wellFormed(out), `${s.id}/${f.id}/${fin}`).toBe(true);
      expect(out).not.toMatch(/\bid="/);
      expect(out).not.toMatch(/url\(#/);
    }
  });

  it("auto finish follows the treatment", () => {
    const b = { layers: [layer("clock")], finish: "auto", placements: ["chest"] };
    const patch = renderBadge(b, { treatment: { finish: "patch", metal: "brass" } });
    const holo = renderBadge(b, { treatment: { finish: "holo", metal: "brass" } });
    expect(patch).not.toBe(holo);
    expect(patch).toContain('data-finish="patch"');
  });

  it("auto finish uses the treatment metal; explicit finish keeps the layer metal", () => {
    const gold = "#f2c230";
    const autoB = { layers: [layer("clock", "disc", "teal", "steel")], finish: "auto", placements: ["chest"] };
    expect(renderBadge(autoB, { treatment: { finish: "insignia", metal: "gold" } })).toContain(gold);
    const explicit = { ...autoB, finish: "insignia" };
    expect(renderBadge(explicit, { treatment: { finish: "insignia", metal: "gold" } })).not.toContain(gold);
  });

  it("low detail is shorter than high detail", () => {
    const b = { layers: [layer("guard", "cog")], finish: "insignia", placements: ["chest"] };
    expect(renderBadge(b, { detail: "low" }).length).toBeLessThan(renderBadge(b, { detail: "high" }).length);
  });

  it("memoizes identical requests", () => {
    const b = { layers: [layer("eye", "hex")], finish: "insignia", placements: ["chest"] };
    const a = renderBadge(b, {});
    const n = _cacheSize();
    expect(renderBadge(structuredClone(b), {})).toBe(a);
    expect(_cacheSize()).toBe(n);
  });

  it("resolveTreatment reads the armour, and the variant when worn", () => {
    const i = ARMOR_STYLES.findIndex((a) => a.variant.badgeTreatment.metal !== a.badgeTreatment.metal);
    const base = { ...DEFAULT_CHARACTER, armorIndex: i, armorVariant: 0 };
    expect(resolveTreatment(base)).toEqual(ARMOR_STYLES[i].badgeTreatment);
    expect(resolveTreatment({ ...base, armorVariant: 1 })).toEqual(ARMOR_STYLES[i].variant.badgeTreatment);
  });

  it("empty placements still render (the caller decides where)", () => {
    expect(renderBadge({ layers: [layer("star")], finish: "insignia", placements: [] }, {}).length).toBeGreaterThan(0);
  });
});
