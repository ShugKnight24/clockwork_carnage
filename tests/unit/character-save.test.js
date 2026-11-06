import { describe, it, expect, beforeEach, vi } from "vitest";
import { saveCharacter, loadCharacter } from "../../src/core/save-system.js";
import { DEFAULT_CHARACTER } from "../../src/data/cosmetics.js";
import { LOOK_TABLES } from "../../src/core/character-fields.js";

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

const lookFields = Object.keys(LOOK_TABLES);
const last = (field) => LOOK_TABLES[field].at(-1).id;

/** A character with every look field on the last option of its table. */
function maxedCharacter() {
  const ch = { ...DEFAULT_CHARACTER, name: "Vex" };
  for (const field of lookFields) ch[field] = last(field);
  return ch;
}

describe("character save/load", () => {
  it("every look field has a table and a default from it", () => {
    // A field added to DEFAULT_CHARACTER without a table lets a corrupt save
    // hand the renderer an id nothing checked.
    const stringFields = Object.keys(DEFAULT_CHARACTER).filter((k) => typeof DEFAULT_CHARACTER[k] === "string" && k !== "name");
    expect(stringFields.sort()).toEqual([...lookFields].sort());
    for (const field of lookFields) expect(DEFAULT_CHARACTER[field]).toBe(LOOK_TABLES[field][0].id);
    expect(Object.keys(DEFAULT_CHARACTER).filter((k) => k.endsWith("Index"))).toEqual([]);
  });

  it("writes version 2", () => {
    saveCharacter(DEFAULT_CHARACTER);
    expect(JSON.parse(store.cc_character).version).toBe(2);
  });

  it("round-trips every field, including face, hair, eyes, origin and voice", () => {
    const saved = maxedCharacter();
    saveCharacter(saved);

    const loaded = { ...DEFAULT_CHARACTER };
    loadCharacter(loaded);
    expect(loaded).toEqual(saved);
  });

  it.each(lookFields)("loads an unknown %s id as the default", (field) => {
    saveCharacter({ ...maxedCharacter(), [field]: "no_such_piece" });
    const loaded = { ...DEFAULT_CHARACTER };
    loadCharacter(loaded);
    expect(loaded[field]).toBe(DEFAULT_CHARACTER[field]);
    for (const other of lookFields) if (other !== field) expect(loaded[other]).toBe(last(other));
  });

  it("keeps the default for a field the save is missing", () => {
    const partial = maxedCharacter();
    delete partial.voice;
    delete partial.hair;
    saveCharacter(partial);

    const loaded = { ...DEFAULT_CHARACTER };
    loadCharacter(loaded);
    expect(loaded.voice).toBe(DEFAULT_CHARACTER.voice);
    expect(loaded.hair).toBe(DEFAULT_CHARACTER.hair);
    expect(loaded.eye).toBe(last("eye"));
  });

  it("ignores a field saved with the wrong type", () => {
    saveCharacter({ ...DEFAULT_CHARACTER, voice: 3, name: 42 });
    const loaded = { ...DEFAULT_CHARACTER };
    loadCharacter(loaded);
    expect(loaded.voice).toBe(DEFAULT_CHARACTER.voice);
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

describe("badge and accessory persistence", () => {
  it("round-trips a full custom badge and accessories", () => {
    const ch = structuredClone(DEFAULT_CHARACTER);
    ch.badge = { layers: [{ frame: "cog", symbol: "guard", enamel: "oxblood", metal: "gold", x: 0, y: 0, scale: 1, rot: 0 }], finish: "patch", placements: ["chest", "helmet"] };
    ch.accessories = { ...ch.accessories, back: "cloak", helmet: "plume" };
    ch.armorVariant = 1;
    saveCharacter(ch);
    const loaded = structuredClone(DEFAULT_CHARACTER);
    loadCharacter(loaded);
    expect(loaded.badge).toEqual(ch.badge);
    expect(loaded.accessories).toEqual(ch.accessories);
    expect(loaded.armorVariant).toBe(1);
  });

  it("clamps armorVariant to 0..1", () => {
    store.cc_character = JSON.stringify({ ...DEFAULT_CHARACTER, armorVariant: 7 });
    const ch = structuredClone(DEFAULT_CHARACTER);
    loadCharacter(ch);
    expect(ch.armorVariant).toBe(1);
  });
});
