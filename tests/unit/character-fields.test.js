import { describe, it, expect } from "vitest";
import { FIELD_TABLES, isVirtualKey, getIndex, withIndex, togglePlacement, cloneLook, lookKey } from "../../src/core/character-fields.js";
import { DEFAULT_CHARACTER } from "../../src/data/cosmetics.js";
import { SYMBOLS, FRAMES, FINISHES, BADGE_PRESETS, indexOfId } from "../../src/data/badges.js";
import { ACCESSORIES } from "../../src/data/accessories.js";

const fresh = () => cloneLook(DEFAULT_CHARACTER);

describe("character fields", () => {
  it("knows its virtual keys", () => {
    expect(isVirtualKey("badge.symbol")).toBe(true);
    expect(isVirtualKey("acc.back")).toBe(true);
    expect(isVirtualKey("armorIndex")).toBe(false);
    expect(FIELD_TABLES["acc.back"]).toBe(ACCESSORIES.back);
  });

  it("getIndex reads flat and nested fields", () => {
    const ch = fresh();
    ch.armorIndex = 3;
    ch.accessories.back = "cloak";
    expect(getIndex(ch, "armorIndex")).toBe(3);
    expect(getIndex(ch, "badge.symbol")).toBe(indexOfId(SYMBOLS, "clock"));
    expect(getIndex(ch, "acc.back")).toBe(indexOfId(ACCESSORIES.back, "cloak"));
  });

  it("withIndex returns fresh objects and does not mutate", () => {
    const ch = fresh();
    const before = JSON.stringify(ch);
    const changes = withIndex(ch, "badge.frame", indexOfId(FRAMES, "hex"));
    expect(JSON.stringify(ch)).toBe(before);
    expect(changes.badge).not.toBe(ch.badge);
    expect(changes.badge.layers[0].frame).toBe("hex");
  });

  it("withIndex on badge.symbol adds chest when placements are empty", () => {
    const ch = fresh();
    expect(ch.badge.placements).toEqual([]);
    const changes = withIndex(ch, "badge.symbol", indexOfId(SYMBOLS, "star"));
    expect(changes.badge.placements).toEqual(["chest"]);
  });

  it("withIndex on badge.finish adds chest when placements are empty", () => {
    const ch = fresh();
    expect(ch.badge.placements).toEqual([]);
    const changes = withIndex(ch, "badge.finish", indexOfId(FINISHES, "patch"));
    expect(changes.badge.finish).toBe("patch");
    expect(changes.badge.placements).toEqual(["chest"]);
  });

  it("badge.preset loads the preset stack and is found again by getIndex", () => {
    const ch = fresh();
    const i = indexOfId(BADGE_PRESETS, "p_guard");
    Object.assign(ch, withIndex(ch, "badge.preset", i));
    expect(ch.badge.layers[0].symbol).toBe("guard");
    expect(ch.badge.placements).toEqual(["chest"]);
    expect(getIndex(ch, "badge.preset")).toBe(i);
    Object.assign(ch, withIndex(ch, "badge.frame", indexOfId(FRAMES, "tag")));
    expect(getIndex(ch, "badge.preset")).toBe(-1);
  });

  it("withIndex on a flat key is a plain assignment", () => {
    expect(withIndex(fresh(), "armorIndex", 2)).toEqual({ armorIndex: 2 });
  });

  it("changing armour resets the variant to standard", () => {
    const ch = fresh();
    ch.armorVariant = 1;
    expect(withIndex(ch, "armorIndex", 2)).toEqual({ armorIndex: 2, armorVariant: 0 });
  });

  it("togglePlacement adds and removes", () => {
    const ch = fresh();
    Object.assign(ch, togglePlacement(ch, "helmet"));
    expect(ch.badge.placements).toEqual(["helmet"]);
    Object.assign(ch, togglePlacement(ch, "helmet"));
    expect(ch.badge.placements).toEqual([]);
  });

  it("cloneLook is deep for nested fields", () => {
    const a = fresh();
    const b = cloneLook(a);
    b.accessories.back = "cloak";
    b.badge.layers[0].symbol = "star";
    expect(a.accessories.back).toBe("none");
    expect(a.badge.layers[0].symbol).toBe("clock");
  });

  it("lookKey changes with every drawn field and ignores name and voice", () => {
    const a = fresh();
    const k = lookKey(a);
    expect(lookKey({ ...cloneLook(a), name: "Zed", voiceIndex: 3 })).toBe(k);
    for (const mutate of [
      (c) => { c.colorIndex = 1; },
      (c) => { c.armorVariant = 1; },
      (c) => { c.accessories.neck = "scarf"; },
      (c) => { c.badge.placements = ["chest"]; },
      (c) => { c.badge.layers[0].enamel = "crimson"; },
      (c) => { c.badge.finish = "holo"; },
    ]) {
      const c = cloneLook(a);
      mutate(c);
      expect(lookKey(c)).not.toBe(k);
    }
  });
});
