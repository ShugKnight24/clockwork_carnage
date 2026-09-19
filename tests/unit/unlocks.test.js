import { describe, it, expect } from "vitest";
import {
  unlockContext,
  unlockState,
  evaluateRule,
  ruleFor,
  earnedIds,
  newlyEarned,
  describeId,
} from "../../src/systems/unlocks.js";
import { LOADOUT_CLASSES, ARMOR_STYLES } from "../../src/data/cosmetics.js";

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
