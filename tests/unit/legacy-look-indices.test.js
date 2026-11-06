import { describe, it, expect } from "vitest";
import { LEGACY_LOOK_INDICES, LEGACY_FIELD_NAMES } from "../../src/core/legacy-look-indices.js";
import { RETIRED_PIECES } from "../../src/data/retired-pieces.js";
import {
  CHARACTER_COLORS, SKIN_TONES, HAIR_STYLES, EYE_COLORS, BODY_FRAMES, CAPE_STYLES, BODY_TYPES, CAMO_STYLES,
  ARMOR_STYLES, HELMET_STYLES, VISOR_STYLES, SHOULDER_STYLES,
  BADGES, WEAPON_SKINS, LOADOUT_CLASSES, BACKSTORIES, VOICE_PROFILES,
} from "../../src/data/index.js";

const TABLES = {
  color: CHARACTER_COLORS,
  skinTone: SKIN_TONES,
  hair: HAIR_STYLES,
  eye: EYE_COLORS,
  armor: ARMOR_STYLES,
  helmet: HELMET_STYLES,
  visor: VISOR_STYLES,
  shoulder: SHOULDER_STYLES,
  badge: BADGES,
  weaponSkin: WEAPON_SKINS,
  loadout: LOADOUT_CLASSES,
  backstory: BACKSTORIES,
  voice: VOICE_PROFILES,
  frame: BODY_FRAMES,
  cape: CAPE_STYLES,
  body: BODY_TYPES,
  camo: CAMO_STYLES,
};

describe("legacy look indices", () => {
  it("names every legacy field", () => {
    expect(Object.keys(LEGACY_FIELD_NAMES).sort()).toEqual(Object.keys(LEGACY_LOOK_INDICES).sort());
    expect(Object.values(LEGACY_FIELD_NAMES).sort()).toEqual(Object.keys(TABLES).sort());
  });

  it("every frozen id still resolves", () => {
    for (const [legacy, ids] of Object.entries(LEGACY_LOOK_INDICES)) {
      const field = LEGACY_FIELD_NAMES[legacy];
      const current = new Set(TABLES[field].map((e) => e.id));
      const retired = RETIRED_PIECES[field] ?? {};
      expect(ids.length, legacy).toBeGreaterThan(0);
      for (const id of ids) {
        const target = current.has(id) ? id : retired[id];
        expect(target, `${legacy}: ${id}`).toBeDefined();
        expect(current.has(target), `${legacy}: ${id} -> ${target}`).toBe(true);
      }
    }
  });

  it("retires look fields only, into pieces that exist", () => {
    for (const [field, map] of Object.entries(RETIRED_PIECES)) {
      expect(TABLES[field], field).toBeDefined();
      const current = new Set(TABLES[field].map((e) => e.id));
      for (const [oldId, newId] of Object.entries(map)) {
        expect(current.has(newId), `${field}: ${oldId} -> ${newId}`).toBe(true);
      }
    }
    expect(RETIRED_PIECES.badge).toBeUndefined();
  });

  it("frozen arrays are frozen", () => {
    expect(Object.isFrozen(LEGACY_LOOK_INDICES)).toBe(true);
    expect(Object.isFrozen(LEGACY_FIELD_NAMES)).toBe(true);
    expect(Object.isFrozen(RETIRED_PIECES)).toBe(true);
    for (const ids of Object.values(LEGACY_LOOK_INDICES)) expect(Object.isFrozen(ids)).toBe(true);
    for (const map of Object.values(RETIRED_PIECES)) expect(Object.isFrozen(map)).toBe(true);
  });
});
