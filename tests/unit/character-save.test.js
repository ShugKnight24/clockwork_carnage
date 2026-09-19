import { describe, it, expect, beforeEach, vi } from "vitest";
import { saveCharacter, loadCharacter } from "../../src/core/save-system.js";
import {
  DEFAULT_CHARACTER,
  CHARACTER_COLORS,
  SKIN_TONES,
  HAIR_STYLES,
  EYE_COLORS,
  ARMOR_STYLES,
  HELMET_STYLES,
  VISOR_STYLES,
  SHOULDER_STYLES,
  BADGES,
  WEAPON_SKINS,
  LOADOUT_CLASSES,
  BACKSTORIES,
  VOICE_PROFILES,
} from "../../src/data/cosmetics.js";

const store = {};
const mockStorage = {
  getItem: vi.fn((key) => store[key] ?? null),
  setItem: vi.fn((key, val) => { store[key] = val; }),
  removeItem: vi.fn((key) => { delete store[key]; }),
};

beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key];
  vi.stubGlobal("localStorage", mockStorage);
  vi.clearAllMocks();
});

/** The option list each index field picks from. */
const OPTION_LISTS = {
  colorIndex: CHARACTER_COLORS,
  skinToneIndex: SKIN_TONES,
  hairIndex: HAIR_STYLES,
  eyeIndex: EYE_COLORS,
  armorIndex: ARMOR_STYLES,
  helmetIndex: HELMET_STYLES,
  visorIndex: VISOR_STYLES,
  shoulderIndex: SHOULDER_STYLES,
  badgeIndex: BADGES,
  weaponSkinIndex: WEAPON_SKINS,
  loadoutIndex: LOADOUT_CLASSES,
  backstoryIndex: BACKSTORIES,
  voiceIndex: VOICE_PROFILES,
};

const indexFields = Object.keys(DEFAULT_CHARACTER).filter((k) => k.endsWith("Index"));

/** A character with every index pushed to the last valid option. */
function maxedCharacter() {
  const ch = { ...DEFAULT_CHARACTER, name: "Vex" };
  for (const key of indexFields) ch[key] = OPTION_LISTS[key].length - 1;
  return ch;
}

describe("character save/load", () => {
  it("every index field has an option list and a clamp bound", () => {
    // A field added to DEFAULT_CHARACTER without a bound in loadCharacter lets a
    // corrupt save hand the renderer an out-of-range index.
    for (const key of indexFields) {
      expect(OPTION_LISTS[key], `no option list for ${key}`).toBeDefined();
      expect(OPTION_LISTS[key].length).toBeGreaterThan(0);
    }
  });

  it("round-trips every field, including face, hair, eyes, origin and voice", () => {
    const saved = maxedCharacter();
    saveCharacter(saved);

    const loaded = { ...DEFAULT_CHARACTER };
    loadCharacter(loaded);
    expect(loaded).toEqual(saved);
  });

  it.each(indexFields)("clamps %s above the last option", (key) => {
    saveCharacter({ ...DEFAULT_CHARACTER, [key]: 9999 });
    const loaded = { ...DEFAULT_CHARACTER };
    loadCharacter(loaded);
    expect(loaded[key]).toBe(OPTION_LISTS[key].length - 1);
  });

  it.each(indexFields)("clamps a negative %s to the first option", (key) => {
    saveCharacter({ ...DEFAULT_CHARACTER, [key]: -5 });
    const loaded = { ...DEFAULT_CHARACTER };
    loadCharacter(loaded);
    expect(loaded[key]).toBe(0);
  });

  it("keeps the default for a field the save is missing", () => {
    const partial = maxedCharacter();
    delete partial.voiceIndex;
    delete partial.hairIndex;
    saveCharacter(partial);

    const loaded = { ...DEFAULT_CHARACTER };
    loadCharacter(loaded);
    expect(loaded.voiceIndex).toBe(DEFAULT_CHARACTER.voiceIndex);
    expect(loaded.hairIndex).toBe(DEFAULT_CHARACTER.hairIndex);
    expect(loaded.eyeIndex).toBe(EYE_COLORS.length - 1);
  });

  it("ignores a field saved with the wrong type", () => {
    saveCharacter({ ...DEFAULT_CHARACTER, voiceIndex: "synthetic", name: 42 });
    const loaded = { ...DEFAULT_CHARACTER };
    loadCharacter(loaded);
    expect(loaded.voiceIndex).toBe(DEFAULT_CHARACTER.voiceIndex);
    expect(loaded.name).toBe(DEFAULT_CHARACTER.name);
  });

  it("drops keys that are not part of the character", () => {
    store.cc_character = JSON.stringify({ ...DEFAULT_CHARACTER, godMode: true });
    const loaded = { ...DEFAULT_CHARACTER };
    loadCharacter(loaded);
    expect(loaded).not.toHaveProperty("godMode");
  });

  it("leaves the character untouched when nothing is saved", () => {
    const loaded = { ...DEFAULT_CHARACTER };
    loadCharacter(loaded);
    expect(loaded).toEqual(DEFAULT_CHARACTER);
  });

  it("survives a corrupt save", () => {
    store.cc_character = "{not json";
    const loaded = { ...DEFAULT_CHARACTER };
    expect(() => loadCharacter(loaded)).not.toThrow();
    expect(loaded).toEqual(DEFAULT_CHARACTER);
  });
});
