import { describe, it, expect } from "vitest";
import {
  SYMBOLS, FRAMES, ENAMELS, METALS, FINISHES, PLACEMENTS, BADGE_PRESETS,
  DEFAULT_BADGE, LEGACY_ICON_SYMBOL, byId, indexOfId,
} from "../../src/data/badges.js";
import { BADGES } from "../../src/data/cosmetics.js";

const ids = (t) => t.map((x) => x.id);
const unique = (t) => new Set(ids(t)).size === t.length;

describe("badge tables", () => {
  it("every table has unique ids", () => {
    for (const t of [SYMBOLS, FRAMES, ENAMELS, METALS, FINISHES, PLACEMENTS, BADGE_PRESETS]) expect(unique(t)).toBe(true);
  });

  it("has the launch content counts", () => {
    const bySet = (s) => SYMBOLS.filter((x) => x.set === s).length;
    expect(bySet("classic")).toBe(7);
    expect(bySet("faction")).toBe(8);
    expect(bySet("rank")).toBe(6);
    expect(bySet("act")).toBe(3);
    expect(bySet("earned")).toBeGreaterThanOrEqual(6);
    expect(ids(FRAMES)).toEqual(["disc", "shield", "hex", "chevron", "tag", "cog"]);
    expect(ids(METALS)).toEqual(["brass", "steel", "blackened", "gold"]);
    expect(ids(FINISHES)).toEqual(["auto", "insignia", "stencil", "patch", "holo"]);
    expect(ids(PLACEMENTS)).toEqual(["chest", "shoulder", "helmet", "forearm"]);
    expect(ENAMELS.length).toBeGreaterThanOrEqual(12);
    expect(BADGE_PRESETS.length).toBeGreaterThanOrEqual(24);
  });

  it("classic symbols are free so existing badges keep working", () => {
    for (const s of SYMBOLS.filter((x) => x.set === "classic")) expect(s.unlock).toBeUndefined();
  });

  it("every old icon maps to a classic symbol", () => {
    for (const b of BADGES.filter((x) => x.icon)) {
      const sym = byId(SYMBOLS, LEGACY_ICON_SYMBOL[b.icon]);
      expect(sym?.set).toBe("classic");
    }
  });

  it("presets reference only real ids", () => {
    for (const p of BADGE_PRESETS) {
      expect(byId(FINISHES, p.badge.finish)).toBeTruthy();
      for (const l of p.badge.layers) {
        expect(byId(SYMBOLS, l.symbol)).toBeTruthy();
        expect(byId(FRAMES, l.frame)).toBeTruthy();
        expect(byId(ENAMELS, l.enamel)).toBeTruthy();
        expect(byId(METALS, l.metal)).toBeTruthy();
      }
    }
  });

  it("default badge is valid and hidden", () => {
    expect(DEFAULT_BADGE.placements).toEqual([]);
    expect(DEFAULT_BADGE.finish).toBe("auto");
    expect(DEFAULT_BADGE.layers).toHaveLength(1);
    expect(byId(SYMBOLS, DEFAULT_BADGE.layers[0].symbol)).toBeTruthy();
  });

  it("indexOfId returns -1 for unknown ids", () => {
    expect(indexOfId(FRAMES, "hex")).toBe(2);
    expect(indexOfId(FRAMES, "nope")).toBe(-1);
  });
});
