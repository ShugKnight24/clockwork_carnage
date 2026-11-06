import { describe, it, expect } from "vitest";
import { HAIR_COLORS, HAIR_STYLES, CHARACTER_COLORS, DEFAULT_CHARACTER, DEFAULT_LOOK_IDS } from "../../src/data/cosmetics.js";
import { lookKey, pieceOf, cloneLook } from "../../src/core/character-fields.js";
import { normalizeLook } from "../../src/core/character-normalize.js";
import { migrateCharacterSave } from "../../src/core/save-system.js";
import { LEGACY_LOOK_INDICES } from "../../src/core/legacy-look-indices.js";
import { LOCKABLE, unlockState } from "../../src/systems/unlocks.js";
import { buildAgentParts, buildAgentSvg, hairOf, mix } from "../../src/rendering/svg-art/agent-rig.js";
import { characterLayers } from "../../src/ui/portrait-modern.js";
import { lookFromIds } from "./helpers/golden-looks.js";

const cut = (id) => HAIR_STYLES.find((e) => e.id === id);
const look = (ids) => buildAgentParts(lookFromIds(ids)).look;
// The rig's hair gradient: highlight, the colour itself, shade.
const hairStops = (color) => `<stop offset=".45" stop-color="${color}"/>`;

describe("hair colour", () => {
  it("lists the eighteen colours, natural first", () => {
    expect(HAIR_COLORS.map((e) => e.id)).toEqual([
      "natural", "jet", "brown", "chestnut", "auburn", "copper", "honey", "platinum", "silver",
      "snow", "crimson", "pink", "violet", "electric", "teal", "toxic", "sunset", "chrono",
    ]);
    expect(DEFAULT_LOOK_IDS.hairColor).toBe("natural");
    expect(DEFAULT_CHARACTER.hairColor).toBe("natural");
    expect(Object.isFrozen(HAIR_COLORS)).toBe(true);
  });

  it("natural keeps the cut colour", () => {
    for (const { id } of HAIR_STYLES) {
      expect(look({ hair: id }).hair).toBe(cut(id));
      expect(look({ hair: id, hairColor: "natural" }).hair).toBe(cut(id));
    }
    // And draws the agent exactly as a record with no hair colour at all.
    const bare = cloneLook(DEFAULT_CHARACTER);
    delete bare.hairColor;
    expect(buildAgentSvg({ ...bare, helmet: "wide", hair: "long" }, { idPrefix: "a-" })).toBe(
      buildAgentSvg(lookFromIds({ helmet: "wide", hair: "long", hairColor: "natural" }), { idPrefix: "a-" }),
    );
  });

  it("a natural shade takes the brows with it", () => {
    const h = look({ hair: "short", hairColor: "platinum" }).hair;
    expect(h.color).toBe("#e8dcc0");
    expect(h.brow).toBe(mix("#e8dcc0", "#000000", 0.25));
    expect(h.id).toBe("short");
  });

  it("dye keeps natural brows", () => {
    for (const id of ["short", "long", "afro", "white"]) {
      const h = look({ hair: id, hairColor: "pink" }).hair;
      expect(h.color).toBe("#e8408c");
      expect(h.brow, id).toBe(cut(id).color);
    }
    // A cut already dyed (the mohawk) keeps the natural brow it carries.
    expect(look({ hair: "hawk", hairColor: "teal" }).hair.brow).toBe(cut("hawk").brow);
  });

  it("chrono takes the suit accent", () => {
    for (const pal of [CHARACTER_COLORS[0], CHARACTER_COLORS[3], CHARACTER_COLORS.at(-1)]) {
      const h = look({ hair: "long", hairColor: "chrono", color: pal.id }).hair;
      expect(h.color).toBe(mix(pal.accent, "#ffffff", 0.15));
      expect(h.brow).toBe(cut("long").color);
    }
  });

  it("a shaved head has nothing to colour", () => {
    for (const { id } of HAIR_COLORS) expect(look({ hair: "none", hairColor: id }).hair.brow).toBeUndefined();
  });

  it("old save without hairColor loads natural", () => {
    // A version 1 save: table positions, no hair colour ever stored.
    const v1 = { hairIndex: LEGACY_LOOK_INDICES.hairIndex.indexOf("long"), colorIndex: 2, name: "Old" };
    const loaded = normalizeLook(migrateCharacterSave(v1));
    expect(loaded.hair).toBe("long");
    expect(loaded.hairColor).toBe("natural");
    // A version 2 save keeps its pick; one this build does not know loads natural.
    expect(normalizeLook(migrateCharacterSave({ version: 2, hairColor: "pink" })).hairColor).toBe("pink");
    expect(normalizeLook(migrateCharacterSave({ version: 2, hairColor: "ultraviolet" })).hairColor).toBe("natural");
    expect(normalizeLook(migrateCharacterSave({ version: 2, hairColor: 7 })).hairColor).toBe("natural");
    // The frozen legacy tables never learn the field.
    expect(Object.keys(LEGACY_LOOK_INDICES).some((k) => k.startsWith("hairColor"))).toBe(false);
  });

  it("is part of the look key", () => {
    const a = cloneLook(DEFAULT_CHARACTER);
    expect(lookKey({ ...a, hairColor: "pink" })).not.toBe(lookKey(a));
    expect(lookKey({ ...a, hairColor: "natural" })).toBe(lookKey(a));
  });

  it("portrait hair fill equals the rig's resolved colour", () => {
    for (const hairColor of ["natural", "platinum", "pink", "chrono"]) {
      const ch = lookFromIds({ helmet: "wide", hair: "short", hairColor, color: "void_purple" });
      const resolved = hairOf(ch).color;
      expect(resolved).toBe(buildAgentParts(ch).look.hair.color);
      expect(characterLayers(ch).defs, hairColor).toContain(hairStops(resolved));
    }
    expect(hairOf(lookFromIds({ hair: "short" })).color).toBe(pieceOf(lookFromIds({ hair: "short" }), "hair").color);
  });

  it("HAIR_COLORS never lockable", () => {
    expect(LOCKABLE.hairColor).toBeUndefined();
    for (const { id } of HAIR_COLORS) expect(unlockState("hairColor", id, {}).unlocked, id).toBe(true);
  });
});
