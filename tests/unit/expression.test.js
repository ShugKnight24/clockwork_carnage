import { describe, it, expect } from "vitest";
import { EXPRESSIONS, DEFAULT_CHARACTER, DEFAULT_LOOK_IDS } from "../../src/data/cosmetics.js";
import { lookKey, cloneLook, getIndex, withIndex, LOOK_TABLES } from "../../src/core/character-fields.js";
import { normalizeLook } from "../../src/core/character-normalize.js";
import { migrateCharacterSave } from "../../src/core/save-system.js";
import { LEGACY_LOOK_INDICES } from "../../src/core/legacy-look-indices.js";
import { LOCKABLE, unlockState } from "../../src/systems/unlocks.js";

const load = (raw) => normalizeLook(migrateCharacterSave(raw));

describe("expression data", () => {
  it("lists the eight expressions, default first", () => {
    expect(EXPRESSIONS.map((e) => e.id)).toEqual(["default", "smile", "grin", "smirk", "grim", "frown", "shout", "shocked"]);
    expect(EXPRESSIONS.map((e) => e.name)).toEqual(["Default", "Smile", "Grin", "Smirk", "Grim", "Frown", "Shout", "Shocked"]);
    for (const e of EXPRESSIONS) expect(e.desc, e.id).toMatch(/\S/);
    expect(DEFAULT_LOOK_IDS.expression).toBe("default");
    expect(DEFAULT_CHARACTER.expression).toBe("default");
    expect(LOOK_TABLES.expression).toBe(EXPRESSIONS);
    expect(Object.isFrozen(EXPRESSIONS)).toBe(true);
    expect(EXPRESSIONS.every((e) => Object.isFrozen(e))).toBe(true);
  });

  it("is picked by index like every look field, and stored by id", () => {
    const ch = cloneLook(DEFAULT_CHARACTER);
    expect(getIndex(ch, "expression")).toBe(0);
    const grin = EXPRESSIONS.findIndex((e) => e.id === "grin");
    expect(withIndex(ch, "expression", grin)).toEqual({ expression: "grin" });
  });

  it("normalises an unknown or missing id to default", () => {
    expect(load({ version: 2, expression: "smile" }).expression).toBe("smile");
    for (const bad of ["sneer", 3, null, "", { id: "grin" }]) expect(load({ version: 2, expression: bad }).expression, String(bad)).toBe("default");
    expect(load({ version: 2 }).expression).toBe("default");
  });

  it("an old save without an expression loads default", () => {
    // A version 1 save: table positions, no expression ever stored.
    const v1 = { hairIndex: LEGACY_LOOK_INDICES.hairIndex.indexOf("long"), colorIndex: 2, name: "Old" };
    const loaded = load(v1);
    expect(loaded.hair).toBe("long");
    expect(loaded.expression).toBe("default");
    // A version 2 save from before the pick keeps everything else it holds.
    const v2 = load({ version: 2, hair: "afro", hairColor: "pink", helmet: "ledmask" });
    expect(v2).toMatchObject({ hair: "afro", hairColor: "pink", helmet: "ledmask", expression: "default" });
    // The frozen legacy tables never learn the field.
    expect(Object.keys(LEGACY_LOOK_INDICES).some((k) => k.startsWith("expression"))).toBe(false);
  });

  it("a saved look round-trips its expression, and one saved before it holds none", () => {
    // How cc_saved_looks stores a look: the appearance fields, stamped with
    // the save version, read back through the save migration.
    const look = { ...cloneLook(DEFAULT_CHARACTER), expression: "smirk", version: 2 };
    const back = migrateCharacterSave(JSON.parse(JSON.stringify(look)));
    expect(back.expression).toBe("smirk");
    // A look from before the pick: the field is absent, so wearing it keeps
    // the player's current expression (the showroom's readLook skips it).
    expect("expression" in migrateCharacterSave({ version: 2, hair: "afro" })).toBe(false);
    expect("expression" in migrateCharacterSave({ colorIndex: 3, hairIndex: 12 })).toBe(false);
  });

  it("is part of the look key", () => {
    const a = cloneLook(DEFAULT_CHARACTER);
    expect(lookKey({ ...a, expression: "shout" })).not.toBe(lookKey(a));
    expect(lookKey({ ...a, expression: "default" })).toBe(lookKey(a));
    const bare = cloneLook(DEFAULT_CHARACTER);
    delete bare.expression;
    expect(lookKey(bare)).toBe(lookKey(a));
  });

  it("is never lockable", () => {
    expect(LOCKABLE.expression).toBeUndefined();
    for (const { id } of EXPRESSIONS) expect(unlockState("expression", id, {}).unlocked, id).toBe(true);
  });
});
