// The look tables are presentation order only: reordering one (as the theme
// registry will) must not move anyone's look, ownership or unlock state.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/data/cosmetics.js", async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, HELMET_STYLES: [...real.HELMET_STYLES].reverse(), ARMOR_STYLES: [...real.ARMOR_STYLES].reverse() };
});

const { HELMET_STYLES, ARMOR_STYLES, DEFAULT_CHARACTER } = await import("../../src/data/cosmetics.js");
const { migrateCharacterSave } = await import("../../src/core/save-system.js");
const { normalizeLook } = await import("../../src/core/character-normalize.js");
const { pieceOf, getIndex, withIndex, cloneLook } = await import("../../src/core/character-fields.js");
const { LEGACY_LOOK_INDICES, LEGACY_FIELD_NAMES } = await import("../../src/core/legacy-look-indices.js");
const u = await import("../../src/systems/unlocks.js");

describe("a reordered look table", () => {
  it("really is reordered under this mock", () => {
    expect(HELMET_STYLES[0].id).not.toBe("standard");
    expect(ARMOR_STYLES[0].id).not.toBe("standard");
    expect(u.LOCKABLE.helmet.table).toBe(HELMET_STYLES);
  });

  it("keeps the default pieces, whatever comes first", () => {
    expect(pieceOf({}, "helmet").id).toBe("standard");
    expect(pieceOf({ armor: "nope" }, "armor").id).toBe("standard");
    expect(normalizeLook({ version: 2, helmet: "nope" }).helmet).toBe("standard");
    expect(DEFAULT_CHARACTER.helmet).toBe("standard");
  });

  it("migrates a version 1 save to the same ids", () => {
    for (const [legacy, field] of Object.entries(LEGACY_FIELD_NAMES).filter(([, f]) => f === "helmet" || f === "armor")) {
      LEGACY_LOOK_INDICES[legacy].forEach((id, i) => {
        expect(normalizeLook(migrateCharacterSave({ [legacy]: i }))[field]).toBe(id);
      });
    }
  });

  it("migrates an unlock store to the same ids", () => {
    // Keys as the old build wrote them: `<field>Index:<shipped position>`.
    const pos = (field, id) => `${field}Index:${LEGACY_LOOK_INDICES[`${field}Index`].indexOf(id)}`;
    const s = u.migrateUnlockStore({
      owned: { [pos("helmet", "reaper")]: true, [pos("armor", "howitzer")]: true },
      seen: { [pos("helmet", "pilot")]: true },
    });
    expect(s.owned).toEqual({ "helmet:#reaper": true, "armor:#howitzer": true });
    expect(s.seen).toEqual({ "helmet:#pilot": true });
  });

  it("grid positions follow the new order but name the same pieces", () => {
    const ch = { ...cloneLook(DEFAULT_CHARACTER), helmet: "reaper" };
    const at = getIndex(ch, "helmet");
    expect(HELMET_STYLES[at].id).toBe("reaper");
    expect(withIndex(ch, "helmet", at)).toEqual({ helmet: "reaper" });
  });
});

describe("unlock state after a reorder", () => {
  // Recorded in the shipped order: the same ids, sorted, must come back.
  const unlockedIds = (key, table, ctx) => table.filter((e) => u.unlockState(key, e.id, ctx).unlocked).map((e) => e.id).sort();
  const lockedPairs = (ctx) =>
    u.lockedItems(ctx).filter((x) => x.key === "helmet" || x.key === "armor").map((x) => `${x.key}:${x.id}`).sort();

  beforeEach(() => u.resetUnlockStore());

  it("is unchanged for a fresh agent", () => {
    const ctx = u.unlockContext();
    expect(unlockedIds("helmet", HELMET_STYLES, ctx)).toEqual(["bandana", "standard"]);
    expect(unlockedIds("armor", ARMOR_STYLES, ctx)).toEqual(["standard"]);
    expect(lockedPairs(ctx)).toEqual([
      "armor:heavy", "armor:howitzer", "armor:pathfinder", "armor:recon", "armor:reliquary", "armor:stealth", "armor:tech", "armor:trencher",
      "helmet:angular", "helmet:brim", "helmet:bucket", "helmet:cockpit", "helmet:crested", "helmet:crusader", "helmet:kabuto", "helmet:mohawk", "helmet:ordnance", "helmet:pilot", "helmet:reaper", "helmet:sealed", "helmet:wide",
    ]);
  });

  it("is unchanged after Act I with an owned piece", () => {
    const ctx = u.unlockContext({ stats: { campaignActsCleared: 1 }, owned: { "helmet:#reaper": true } });
    expect(unlockedIds("helmet", HELMET_STYLES, ctx)).toEqual(["angular", "bandana", "pilot", "reaper", "sealed", "standard", "wide"]);
    expect(unlockedIds("armor", ARMOR_STYLES, ctx)).toEqual(["pathfinder", "recon", "standard", "stealth"]);
    expect(lockedPairs(ctx)).toEqual([
      "armor:heavy", "armor:howitzer", "armor:reliquary", "armor:tech", "armor:trencher",
      "helmet:brim", "helmet:bucket", "helmet:cockpit", "helmet:crested", "helmet:crusader", "helmet:kabuto", "helmet:mohawk", "helmet:ordnance",
    ]);
  });

  it("strips a locked piece back to the default, not to whatever comes first", () => {
    const ctx = u.unlockContext();
    const ch = { ...cloneLook(DEFAULT_CHARACTER), helmet: "crested", armor: "heavy" };
    expect(u.sanitizeLocked(ch, ctx)).toMatchObject({ helmet: "standard", armor: "standard" });
  });
});
