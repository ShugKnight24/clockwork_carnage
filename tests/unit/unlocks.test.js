import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  unlockContext,
  unlockState,
  evaluateRule,
  ruleFor,
  earnedIds,
  newlyEarned,
  describeId,
  variantState,
  sanitizeLocked,
  ownedKey,
  LOCKABLE as LOCK,
  ensureUnlockStore,
  resetUnlockStore,
} from "../../src/systems/unlocks.js";
import { LOADOUT_CLASSES, ARMOR_STYLES, DEFAULT_CHARACTER } from "../../src/data/cosmetics.js";
import { SYMBOLS, FINISHES, BADGE_PRESETS, indexOfId } from "../../src/data/badges.js";
import { ACCESSORIES } from "../../src/data/accessories.js";
import { cloneLook } from "../../src/core/character-fields.js";

const idx = (table, id) => table.findIndex((x) => x.id === id);
const GUN = idx(LOADOUT_CLASSES, "gunslinger");
const ENF = idx(LOADOUT_CLASSES, "enforcer");
const PHA = idx(LOADOUT_CLASSES, "phantom");
const MK2 = ARMOR_STYLES.findIndex((a) => a.tier === 2);
const MK3 = ARMOR_STYLES.findIndex((a) => a.tier === 3);

describe("unlock rules", () => {
  it("fresh agent: recruit and tier I only", () => {
    const ctx = unlockContext();
    expect(unlockState("loadoutIndex", 0, ctx).unlocked).toBe(true);
    for (const i of [GUN, ENF, PHA]) expect(unlockState("loadoutIndex", i, ctx).unlocked).toBe(false);
    expect(unlockState("armorIndex", 0, ctx).unlocked).toBe(true);
    expect(unlockState("armorIndex", MK2, ctx).unlocked).toBe(false);
    expect(unlockState("armorIndex", MK3, ctx).unlocked).toBe(false);
    expect(earnedIds(ctx)).toEqual([]);
  });

  it("Gunslinger counts kills with both pistols", () => {
    const partial = unlockContext({ stats: { weaponKills: { 0: 25, 6: 3, 1: 99 } } });
    const st = unlockState("loadoutIndex", GUN, partial);
    expect(st.unlocked).toBe(false);
    expect(st.value).toBe(28);
    expect(st.hint).toBe("Score 40 pistol kills · 28/40 kills");
    expect(unlockState("loadoutIndex", GUN, unlockContext({ stats: { weaponKills: { 0: 30, 6: 10 } } })).unlocked).toBe(true);
  });

  it("Enforcer needs Act 1 cleared, from stats, an in-progress save or a finished campaign", () => {
    const st = unlockState("loadoutIndex", ENF, unlockContext({ stats: { campaignLevelsCleared: 2 } }));
    expect(st.hint).toBe("Clear Act 1 of the campaign · 2/3 levels");
    expect(st.unlocked).toBe(false);
    expect(unlockState("loadoutIndex", ENF, unlockContext({ campaignSaveLevel: 4 })).unlocked).toBe(true);
    expect(unlockState("loadoutIndex", ENF, unlockContext({ stats: { campaignComplete: true } })).unlocked).toBe(true);
  });

  it("Phantom unlocks at 50 dashes and caps progress at the target", () => {
    expect(unlockState("loadoutIndex", PHA, unlockContext({ stats: { totalDashes: 49 } })).unlocked).toBe(false);
    const st = unlockState("loadoutIndex", PHA, unlockContext({ stats: { totalDashes: 80 } }));
    expect(st.unlocked).toBe(true);
    expect(st.value).toBe(50);
  });

  it("tier II needs the tutorial; tier III takes Act 1 or arena round 5", () => {
    expect(unlockState("helmetIndex", 1, unlockContext({ stats: { tutorialComplete: true } })).unlocked).toBe(true);
    const arena = unlockContext({ stats: { highestArenaRound: 5 } });
    expect(unlockState("armorIndex", MK3, arena).unlocked).toBe(true);
    const close = unlockContext({ stats: { highestArenaRound: 4, campaignLevelsCleared: 1 } });
    const st = unlockState("armorIndex", MK3, close);
    expect(st.unlocked).toBe(false);
    // Reports the branch closest to done (4/5 rounds beats 1/3 levels).
    expect(st.hint).toBe("Clear Act 1 or survive arena round 5 · 4/5 rounds");
  });

  it("grandfathered gear stays usable", () => {
    const ctx = unlockContext({ owned: { [`loadoutIndex:${ENF}`]: true } });
    expect(unlockState("loadoutIndex", ENF, ctx).unlocked).toBe(true);
    // but it is not "earned", so no toast
    expect(earnedIds(ctx)).not.toContain(`loadoutIndex:${ENF}`);
  });

  it("newlyEarned skips what was already announced", () => {
    const ctx = unlockContext({ stats: { tutorialComplete: true, totalDashes: 60 } });
    const all = earnedIds(ctx);
    expect(all).toContain(`loadoutIndex:${PHA}`);
    expect(all.some((id) => id.startsWith("armorIndex:"))).toBe(true);
    const seen = Object.fromEntries(all.filter((id) => id !== `loadoutIndex:${PHA}`).map((id) => [id, true]));
    expect(newlyEarned(ctx, seen)).toEqual([`loadoutIndex:${PHA}`]);
    expect(describeId(`loadoutIndex:${PHA}`)).toEqual({ kind: "Loadout class", name: "Phantom", tier: 0 });
  });

  it("unknown rule types never unlock and bad stats are tolerated", () => {
    expect(evaluateRule({ type: "nope" }, unlockContext()).met).toBe(false);
    const ctx = unlockContext({ stats: { weaponKills: null, totalDashes: "x" } });
    expect(unlockState("loadoutIndex", PHA, ctx).value).toBe(0);
    expect(ruleFor("badgeIndex", 1)).toBe(null);
  });
});

describe("badge and accessory unlocks", () => {
  it("classic and faction symbols are free; earned ones are locked", () => {
    const ctx = unlockContext();
    expect(unlockState("badge.symbol", indexOfId(SYMBOLS, "clock"), ctx).unlocked).toBe(true);
    expect(unlockState("badge.symbol", indexOfId(SYMBOLS, "corps"), ctx).unlocked).toBe(true);
    expect(unlockState("badge.symbol", indexOfId(SYMBOLS, "lordslayer"), ctx).unlocked).toBe(false);
  });

  it("achievement rules unlock symbols and presets", () => {
    const ctx = unlockContext({ achievements: { lordSlayer: true } });
    expect(unlockState("badge.symbol", indexOfId(SYMBOLS, "lordslayer"), ctx).unlocked).toBe(true);
    expect(unlockState("badge.preset", indexOfId(BADGE_PRESETS, "p_lordslayer"), ctx).unlocked).toBe(true);
  });

  it("campaignActs counts defeated acts and a finished campaign counts as three", () => {
    const act1 = indexOfId(SYMBOLS, "act1");
    const act3 = indexOfId(SYMBOLS, "act3");
    expect(unlockState("badge.symbol", act1, unlockContext({ stats: { campaignActsCleared: 1 } })).unlocked).toBe(true);
    expect(unlockState("badge.symbol", act3, unlockContext({ stats: { campaignActsCleared: 1 } })).unlocked).toBe(false);
    expect(unlockState("badge.symbol", act3, unlockContext({ stats: { campaignComplete: true } })).unlocked).toBe(true);
  });

  it("finishes: insignia free, holo needs the campaign", () => {
    const ctx = unlockContext();
    expect(unlockState("badge.finish", indexOfId(FINISHES, "insignia"), ctx).unlocked).toBe(true);
    expect(unlockState("badge.finish", indexOfId(FINISHES, "holo"), ctx).unlocked).toBe(false);
  });

  it("accessory tiers follow the tier rules", () => {
    const ctx = unlockContext();
    expect(unlockState("acc.back", indexOfId(ACCESSORIES.back, "backpack"), ctx).unlocked).toBe(true);
    expect(unlockState("acc.back", indexOfId(ACCESSORIES.back, "antenna"), ctx).unlocked).toBe(false);
    expect(unlockState("acc.back", indexOfId(ACCESSORIES.back, "antenna"), unlockContext({ stats: { tutorialComplete: true } })).unlocked).toBe(true);
  });

  it("ownership of id-based items survives table reordering", () => {
    const i = indexOfId(SYMBOLS, "lordslayer");
    expect(ownedKey("badge.symbol", i)).toBe("badge.symbol:#lordslayer");
    expect(ownedKey("armorIndex", 2)).toBe("armorIndex:2");
    const ctx = unlockContext({ owned: { "badge.symbol:#lordslayer": true } });
    expect(unlockState("badge.symbol", i, ctx).unlocked).toBe(true);
  });

  it("variants lock by their own rule", () => {
    const ghost = ARMOR_STYLES.findIndex((a) => a.variant.unlock.id === "untouchable");
    expect(variantState(ghost, unlockContext()).unlocked).toBe(false);
    expect(variantState(ghost, unlockContext({ achievements: { untouchable: true } })).unlocked).toBe(true);
  });

  it("sanitizeLocked resets unowned locked picks and keeps owned ones", () => {
    const ch = cloneLook(DEFAULT_CHARACTER);
    ch.accessories.back = "antenna";
    ch.badge = { layers: [{ frame: "disc", symbol: "lordslayer", enamel: "teal", metal: "brass", x: 0, y: 0, scale: 1, rot: 0 }], finish: "holo", placements: ["chest"] };
    ch.armorVariant = 1;
    const changes = sanitizeLocked(ch, unlockContext({ owned: { "acc.back:#antenna": true } }));
    expect(changes.accessories?.back ?? ch.accessories.back).toBe("antenna");
    expect(changes.badge.layers[0].symbol).toBe("clock");
    expect(changes.badge.finish).toBe("auto");
    expect(changes.armorVariant).toBe(0);
  });

  it("every virtual key is lockable", () => {
    for (const k of ["badge.preset", "badge.symbol", "badge.finish", "acc.back", "acc.legs"]) expect(LOCK[k]).toBeTruthy();
  });

  it("describeId names id-based unlocks", () => {
    expect(describeId("badge.symbol:#lordslayer")).toMatchObject({ kind: "Badge symbol", name: "Lord Slayer" });
    expect(describeId("acc.back:#antenna").name).toBe("Rift Antenna");
    expect(describeId(`armorVariant:#${ARMOR_STYLES[0].variant.id}`).kind).toBe("Armour variant");
  });
});

describe("unlock store v2 migration", () => {
  const store = {};
  const mockStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
  };

  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    vi.stubGlobal("localStorage", mockStorage);
    resetUnlockStore();
  });

  it("marks a pre-v2 store's earned virtual ids as seen, so they don't all toast at once", () => {
    // A store saved before badges/accessories/variants were lockable.
    localStorage.setItem("cc_unlocks", JSON.stringify({ owned: {}, seen: {} }));
    const stats = { tutorialComplete: true };
    const achievements = {};
    const store2 = ensureUnlockStore(null, stats, achievements);
    expect(store2.v2).toBe(true);

    const ctx = unlockContext({ stats, achievements });
    const earnedVirtual = earnedIds(ctx).filter((id) => id.includes("."));
    expect(earnedVirtual.length).toBeGreaterThan(0);
    for (const id of earnedVirtual) expect(store2.seen[id]).toBe(true);
    expect(newlyEarned(ctx, store2.seen)).toEqual([]);
  });
});
