import { describe, it, expect, vi, beforeEach } from "vitest";
import { migrateCharacterSave, loadCharacter, saveCharacter } from "../../src/core/save-system.js";
import { normalizeLook } from "../../src/core/character-normalize.js";
import { LEGACY_LOOK_INDICES, LEGACY_FIELD_NAMES } from "../../src/core/legacy-look-indices.js";
import { DEFAULT_CHARACTER, BADGES } from "../../src/data/cosmetics.js";
import { LOOK_TABLES, cloneLook } from "../../src/core/character-fields.js";

// One retired helmet, so the redirect is exercised without touching the real map.
vi.mock("../../src/data/retired-pieces.js", async (importOriginal) => {
  const real = await importOriginal();
  return { RETIRED_PIECES: { ...real.RETIRED_PIECES, helmet: { old_dome: "wide" } } };
});

/** Every legacy field that became a flat id field (badgeIndex became the badge object). */
const FLAT = Object.keys(LEGACY_LOOK_INDICES).filter((k) => k !== "badgeIndex");

/** What loadCharacter does with a parsed save. */
const load = (raw) => normalizeLook(migrateCharacterSave(raw));

describe("migrateCharacterSave", () => {
  it("migrates every legacy index of every field", () => {
    for (const legacy of FLAT) {
      const field = LEGACY_FIELD_NAMES[legacy];
      LEGACY_LOOK_INDICES[legacy].forEach((id, i) => {
        expect(migrateCharacterSave({ [legacy]: i })[field], `${legacy}: ${i}`).toBe(id);
      });
    }
  });

  it("clamps out-of-range indices then maps", () => {
    const ids = LEGACY_LOOK_INDICES.helmetIndex;
    expect(migrateCharacterSave({ helmetIndex: 999 }).helmet).toBe(ids[ids.length - 1]);
    expect(migrateCharacterSave({ helmetIndex: -3 }).helmet).toBe(ids[0]);
  });

  it("marks the result version 2", () => {
    expect(migrateCharacterSave({ helmetIndex: 1 }).version).toBe(2);
    expect(migrateCharacterSave({}).version).toBe(2);
  });

  it("no *Index key survives migration", () => {
    const raw = Object.fromEntries(Object.keys(LEGACY_LOOK_INDICES).map((k) => [k, 1]));
    const out = migrateCharacterSave({ ...raw, name: "Vex", armorVariant: 1 });
    expect(Object.keys(out).filter((k) => k.endsWith("Index"))).toEqual([]);
    expect(out.name).toBe("Vex");
    expect(out.armorVariant).toBe(1);
  });

  it("version 2 round-trips unchanged", () => {
    const v2 = { version: 2, name: "Vex", helmet: "wide", frame: "strider", armorVariant: 1, badge: { layers: [], finish: "auto", placements: [] } };
    expect(migrateCharacterSave(structuredClone(v2))).toEqual(v2);
  });

  it("legacy badgeIndex without badge still migrates the badge", () => {
    const out = migrateCharacterSave({ badgeIndex: 5, shoulderIndex: 3 });
    expect(out.badge.layers[0].symbol).toBe(BADGES[5].icon);
    // Shoulder index 3 shipped as pauldrons, which carry the badge too.
    expect(out.badge.placements).toEqual(["chest", "shoulder"]);
  });

  it("a saved badge object wins over a stale badgeIndex", () => {
    const badge = { layers: [{ frame: "hex", symbol: "rift", enamel: "violet", metal: "steel", x: 0, y: 0, scale: 1, rot: 0 }], finish: "insignia", placements: ["forearm"] };
    expect(migrateCharacterSave({ badgeIndex: 2, badge }).badge).toEqual(badge);
  });

  it("a non-number index is dropped and loads as the default", () => {
    const out = load({ voiceIndex: "synthetic", helmetIndex: 2 });
    expect(out.voice).toBe(DEFAULT_CHARACTER.voice);
    expect(out.helmet).toBe(LEGACY_LOOK_INDICES.helmetIndex[2]);
  });

  it("does not touch its input", () => {
    const raw = { helmetIndex: 2, badgeIndex: 1 };
    migrateCharacterSave(raw);
    expect(raw).toEqual({ helmetIndex: 2, badgeIndex: 1 });
  });
});

describe("normalizeLook", () => {
  it("unknown id falls back to the default", () => {
    expect(load({ version: 2, helmet: "nope" }).helmet).toBe(DEFAULT_CHARACTER.helmet);
    expect(load({ version: 2, helmet: 7 }).helmet).toBe(DEFAULT_CHARACTER.helmet);
  });

  it("retired id redirects", () => {
    expect(load({ version: 2, helmet: "old_dome" }).helmet).toBe("wide");
  });

  it("fills every look field with an id from its table", () => {
    const out = load({});
    for (const [field, table] of Object.entries(LOOK_TABLES)) {
      expect(table.some((e) => e.id === out[field]), field).toBe(true);
    }
  });

  it("clamps armorVariant to 0..1", () => {
    expect(load({ version: 2, armorVariant: 7 }).armorVariant).toBe(1);
    expect(load({ version: 2, armorVariant: -2 }).armorVariant).toBe(0);
    expect(load({ version: 2 }).armorVariant).toBe(0);
  });

  // Review Focus 1: an old build's pick past the end of a table, or a cut piece.
  it("a save with one bad field keeps every other field", () => {
    const good = { version: 2, name: "Vex", color: "sakura", hair: "locs", helmet: "reaper", visor: "glow", frame: "wraith", body: "fem", camo: "urban" };
    const out = load({ ...good, shoulder: "cut_piece" });
    expect(out.shoulder).toBe(DEFAULT_CHARACTER.shoulder);
    for (const [k, v] of Object.entries(good)) if (k !== "version") expect(out[k], k).toBe(v);

    const v1 = load({ colorIndex: 11, hairIndex: 13, helmetIndex: 9, shoulderIndex: 4000 });
    expect(v1.color).toBe("sakura");
    expect(v1.hair).toBe("locs");
    expect(v1.helmet).toBe("reaper");
    expect(v1.shoulder).toBe(LEGACY_LOOK_INDICES.shoulderIndex.at(-1));
  });
});

describe("loadCharacter on a version 1 save", () => {
  const store = {};
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    vi.stubGlobal("localStorage", {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = v; },
      removeItem: (k) => { delete store[k]; },
    });
  });

  it("loads every pick as the same piece, and saves it back as version 2", () => {
    store.cc_character = JSON.stringify({
      name: "Vex", colorIndex: 15, skinToneIndex: 5, hairIndex: 14, eyeIndex: 5, armorIndex: 8, helmetIndex: 11,
      visorIndex: 5, shoulderIndex: 8, badgeIndex: 0, weaponSkinIndex: 5, loadoutIndex: 7, backstoryIndex: 3,
      voiceIndex: 3, frameIndex: 5, capeIndex: 1, bodyIndex: 1, camoIndex: 5, armorVariant: 1,
    });
    const ch = cloneLook(DEFAULT_CHARACTER);
    loadCharacter(ch);
    expect(ch).toMatchObject({
      name: "Vex", color: "eclipse", skinTone: "synthetic", hair: "ponytail", eye: "silver", armor: "pathfinder", helmet: "bandana",
      visor: "goldwrap", shoulder: "layered", weaponSkin: "toxic", loadout: "corpsman", backstory: "ex_enforcer",
      voice: "synthetic", frame: "breacher", cape: "none", body: "fem", camo: "digital", armorVariant: 1,
    });
    expect(Object.keys(ch).filter((k) => k.endsWith("Index"))).toEqual([]);
    saveCharacter(ch);
    const saved = JSON.parse(store.cc_character);
    expect(saved.version).toBe(2);
    expect(saved.helmet).toBe("bandana");
  });

  it("migrates a pre-badge-object save", () => {
    store.cc_character = JSON.stringify({ name: "Agent", helmetIndex: 0, badgeIndex: 5 });
    const ch = cloneLook(DEFAULT_CHARACTER);
    loadCharacter(ch);
    expect(ch.badge.layers[0].symbol).toBe(BADGES[5].icon);
    expect(ch.badge.placements).toContain("chest");
    expect(ch.accessories.back).toBe("none");
  });

  it("a saved badge object wins over a stale badgeIndex", () => {
    const badge = { layers: [{ frame: "hex", symbol: "rift", enamel: "violet", metal: "steel", x: 0, y: 0, scale: 1, rot: 0 }], finish: "insignia", placements: ["forearm"] };
    store.cc_character = JSON.stringify({ name: "Agent", helmetIndex: 0, badgeIndex: 2, badge });
    const ch = cloneLook(DEFAULT_CHARACTER);
    loadCharacter(ch);
    expect(ch.badge).toEqual(badge);
  });

  it("a badge pick past the shipped list is no badge, as before", () => {
    store.cc_character = JSON.stringify({ name: "Agent", badgeIndex: 99 });
    const ch = cloneLook(DEFAULT_CHARACTER);
    loadCharacter(ch);
    expect(ch.badge).toEqual(DEFAULT_CHARACTER.badge);
  });
});
