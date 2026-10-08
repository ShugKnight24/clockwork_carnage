import { describe, it, expect, afterEach } from "vitest";
import {
  FINISHES,
  MAX_CUSTOM,
  rampOf,
  customFinish,
  finishesFor,
  finishById,
  finishUnlocked,
  finishFor,
  finishKey,
  normalizeCustomSkins,
  normalizeWeaponFinishes,
  setSkinCharacter,
  activeFinish,
} from "../../src/data/weapon-skins.js";

const mine = { name: "Red", primary: "#c8102e", secondary: "#1a1a1a", energy: "#ffd23a", pattern: "camo" };

describe("weapon finishes", () => {
  afterEach(() => setSkinCharacter(null));

  it("ramps run from shadow to highlight around the base colour", () => {
    const r = rampOf("#808080");
    expect(r).toHaveLength(5);
    expect(r[2]).toBe("#808080");
    const lum = r.map((h) => parseInt(h.slice(1, 3), 16));
    expect([...lum].sort((a, b) => a - b)).toEqual(lum);
  });

  it("unlocks built-ins by kills with that weapon; custom ones are always open", () => {
    const chrome = FINISHES.find((f) => f.id === "chrome");
    const stats = { weaponKills: { 1: chrome.kills, 2: chrome.kills - 1 } };
    expect(finishUnlocked(chrome, 1, stats)).toBe(true);
    expect(finishUnlocked(chrome, 2, stats)).toBe(false);
    expect(finishUnlocked(FINISHES[0], 5, {})).toBe(true);
    expect(finishUnlocked(customFinish(mine, 0), 2, {})).toBe(true);
    expect(finishUnlocked(null, 0, stats)).toBe(false);
  });

  it("keeps thresholds rising in list order", () => {
    const kills = FINISHES.map((f) => f.kills);
    expect(kills[0]).toBe(0);
    expect([...kills].sort((a, b) => a - b)).toEqual(kills);
  });

  it("resolves the finish each weapon wears; Factory renders as null", () => {
    const ch = { customSkins: [mine], weaponFinishes: { 0: "chrome", 1: "custom:0", 2: "default" } };
    expect(finishFor(ch, 0).id).toBe("chrome");
    expect(finishFor(ch, 1)).toMatchObject({ id: "custom:0", name: "Red", custom: true, energy: "#ffd23a", pattern: "camo" });
    expect(finishFor(ch, 2)).toBeNull();
    expect(finishFor(ch, 3)).toBeNull();
    expect(finishById(ch, "custom:4")).toBeNull();
    expect(finishesFor(ch)).toHaveLength(FINISHES.length + 1);
  });

  it("gives the same look the same cache key", () => {
    expect(finishKey(null)).toBe("");
    expect(finishKey(FINISHES[2])).toBe(FINISHES[2].id);
    expect(finishKey(customFinish(mine, 0))).toBe(finishKey(customFinish({ ...mine, name: "Other" }, 3)));
    expect(finishKey(customFinish(mine, 0))).not.toBe(finishKey(customFinish({ ...mine, pattern: "hex" }, 0)));
  });

  it("cleans saved custom finishes", () => {
    const out = normalizeCustomSkins([
      { ...mine, primary: "#C8102E", name: "x".repeat(40), pattern: "nope" },
      { primary: "red", secondary: "#000000" },
      null,
      ...Array(8).fill(mine),
    ]);
    expect(out).toHaveLength(MAX_CUSTOM - 2);
    expect(out[0]).toEqual({ name: "x".repeat(18), primary: "#c8102e", secondary: "#1a1a1a", energy: "#ffd23a", pattern: "none" });
    expect(normalizeCustomSkins("bad")).toEqual([]);
  });

  it("drops saved finish choices that no longer exist", () => {
    const out = normalizeWeaponFinishes({ 0: "chrome", 1: "custom:0", 2: "custom:3", 3: "gold", x: "chrome", 99: "chrome", 4: 7 }, [mine]);
    expect(out).toEqual({ 0: "chrome", 1: "custom:0" });
    expect(normalizeWeaponFinishes(null)).toEqual({});
  });

  it("reads the live character for renderers", () => {
    expect(activeFinish(0)).toBeNull();
    const ch = { weaponFinishes: { 0: "ember" } };
    setSkinCharacter(ch);
    expect(activeFinish(0).id).toBe("ember");
    ch.weaponFinishes[0] = "frost";
    expect(activeFinish(0).id).toBe("frost");
  });
});
