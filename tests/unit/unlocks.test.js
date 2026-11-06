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
  withinReach,
  droppableItems,
  migrateUnlockStore,
  lockedItems,
} from "../../src/systems/unlocks.js";
import { LEGACY_LOOK_INDICES } from "../../src/core/legacy-look-indices.js";
import { LOADOUT_CLASSES, ARMOR_STYLES, HELMET_STYLES, BODY_FRAMES, HAIR_COLORS, DEFAULT_CHARACTER, TIER_UNLOCKS } from "../../src/data/cosmetics.js";
import { WARDROBE_THEMES } from "../../src/data/wardrobe-themes/index.js";
import { SYMBOLS, BADGE_PRESETS, byId } from "../../src/data/badges.js";
import { ACTS } from "../../src/data/campaign/acts.js";
import { ACCESSORIES } from "../../src/data/accessories.js";
import { cloneLook } from "../../src/core/character-fields.js";

// Unlock state is asked by piece id, never by table position.
const GUN = "gunslinger";
const ENF = "enforcer";
const PHA = "phantom";
const MK2 = ARMOR_STYLES.find((a) => a.tier === 2).id;
const MK3 = ARMOR_STYLES.find((a) => a.tier === 3).id;

describe("unlock rules", () => {
  it("backfills a finished campaign with every act and every level", () => {
    const ctx = unlockContext({ stats: { campaignComplete: true } });
    expect(ctx.campaignActsCleared).toBe(ACTS.length);
    expect(ctx.campaignLevelsCleared).toBe(ACTS.reduce((n, a) => n + a.levels.length, 0));
  });

  it("counts levels across the campaign, not within one act", () => {
    // A save parked at Act II level 2 has cleared all of Act I and two more.
    const parked = unlockContext({ campaignSaveAct: 2, campaignSaveLevel: 2 });
    expect(parked.campaignLevelsCleared).toBe(ACTS[0].levels.length + 2);
    // An older, per-act mark never counts against the player.
    expect(unlockContext({ stats: { campaignLevelsCleared: 8 } }).campaignLevelsCleared).toBe(8);
  });

  it("fresh agent: recruit and tier I only", () => {
    const ctx = unlockContext();
    expect(unlockState("loadout", "recruit", ctx).unlocked).toBe(true);
    for (const i of [GUN, ENF, PHA]) expect(unlockState("loadout", i, ctx).unlocked).toBe(false);
    expect(unlockState("armor", "standard", ctx).unlocked).toBe(true);
    expect(unlockState("armor", MK2, ctx).unlocked).toBe(false);
    expect(unlockState("armor", MK3, ctx).unlocked).toBe(false);
    expect(earnedIds(ctx)).toEqual([]);
  });

  it("Gunslinger counts kills with both pistols", () => {
    const partial = unlockContext({ stats: { weaponKills: { 0: 25, 6: 3, 1: 99 } } });
    const st = unlockState("loadout", GUN, partial);
    expect(st.unlocked).toBe(false);
    expect(st.value).toBe(28);
    expect(st.hint).toBe("Score 40 pistol kills · 28/40 kills");
    expect(unlockState("loadout", GUN, unlockContext({ stats: { weaponKills: { 0: 30, 6: 10 } } })).unlocked).toBe(true);
  });

  it("Enforcer needs three campaign levels cleared, from stats, an in-progress save or a finished campaign", () => {
    const st = unlockState("loadout", ENF, unlockContext({ stats: { campaignLevelsCleared: 2 } }));
    expect(st.hint).toBe("Clear 3 campaign levels · 2/3 levels");
    expect(st.unlocked).toBe(false);
    expect(unlockState("loadout", ENF, unlockContext({ campaignSaveLevel: 4 })).unlocked).toBe(true);
    expect(unlockState("loadout", ENF, unlockContext({ stats: { campaignComplete: true } })).unlocked).toBe(true);
  });

  it("Phantom unlocks at 50 dashes and caps progress at the target", () => {
    expect(unlockState("loadout", PHA, unlockContext({ stats: { totalDashes: 49 } })).unlocked).toBe(false);
    const st = unlockState("loadout", PHA, unlockContext({ stats: { totalDashes: 80 } }));
    expect(st.unlocked).toBe(true);
    expect(st.value).toBe(50);
  });

  it("tier II takes Act 1 or arena round 10; tier III takes Act 2 or arena round 15", () => {
    // The tutorial and most of Act I no longer open MK II.
    expect(unlockState("helmet", "wide", unlockContext({ stats: { tutorialComplete: true } })).unlocked).toBe(false);
    expect(unlockState("helmet", "wide", unlockContext({ campaignSaveAct: 1, campaignSaveLevel: 7 })).unlocked).toBe(false);
    expect(unlockState("helmet", "wide", unlockContext({ stats: { campaignActsCleared: 1 } })).unlocked).toBe(true);
    expect(unlockState("armor", MK2, unlockContext({ stats: { highestArenaRound: 10 } })).unlocked).toBe(true);
    const actOne = unlockContext({ campaignSaveAct: 2 });
    expect(unlockState("armor", MK2, actOne).unlocked).toBe(true);
    expect(unlockState("armor", MK3, actOne).unlocked).toBe(false);
    expect(unlockState("armor", MK3, unlockContext({ stats: { campaignActsCleared: 2 } })).unlocked).toBe(true);
    expect(unlockState("armor", MK3, unlockContext({ stats: { highestArenaRound: 15 } })).unlocked).toBe(true);
    const close = unlockContext({ stats: { highestArenaRound: 14 }, campaignSaveAct: 2 });
    const st = unlockState("armor", MK3, close);
    expect(st.unlocked).toBe(false);
    // Reports the branch closest to done (14/15 rounds beats 1/2 acts).
    expect(st.hint).toBe("Clear Act 2 or survive arena round 15 · 14/15 rounds");
  });

  it("Corpsman's rule is the act its label names", () => {
    const COR = "corpsman";
    expect(byId(LOADOUT_CLASSES, COR).unlock).toMatchObject({ type: "campaignActs", count: 2, label: "Clear Act 2 of the campaign" });
    expect(unlockState("loadout", COR, unlockContext({ campaignSaveAct: 2, campaignSaveLevel: 6 })).unlocked).toBe(false);
    expect(unlockState("loadout", COR, unlockContext({ campaignSaveAct: 3 })).unlocked).toBe(true);
  });

  it("grandfathered gear stays usable", () => {
    const ctx = unlockContext({ owned: { [`loadout:#enforcer`]: true } });
    expect(unlockState("loadout", ENF, ctx).unlocked).toBe(true);
    // but it is not "earned", so no toast
    expect(earnedIds(ctx)).not.toContain(`loadout:#enforcer`);
  });

  it("newlyEarned skips what was already announced", () => {
    const ctx = unlockContext({ stats: { campaignActsCleared: 1, totalDashes: 60 } });
    const all = earnedIds(ctx);
    expect(all).toContain(`loadout:#phantom`);
    expect(all.some((id) => id.startsWith("armor:#"))).toBe(true);
    const seen = Object.fromEntries(all.filter((id) => id !== `loadout:#phantom`).map((id) => [id, true]));
    expect(newlyEarned(ctx, seen)).toEqual([`loadout:#phantom`]);
    expect(describeId(`loadout:#phantom`)).toEqual({ kind: "Loadout class", name: "Phantom", tier: 0 });
  });

  it("unknown rule types never unlock and bad stats are tolerated", () => {
    expect(evaluateRule({ type: "nope" }, unlockContext()).met).toBe(false);
    const ctx = unlockContext({ stats: { weaponKills: null, totalDashes: "x" } });
    expect(unlockState("loadout", PHA, ctx).value).toBe(0);
    expect(ruleFor("badge", "shield")).toBe(null);
    expect(ruleFor("helmet", "no_such_helmet")).toBe(null);
  });
});

describe("badge and accessory unlocks", () => {
  it("classic and faction symbols are free; earned ones are locked", () => {
    const ctx = unlockContext();
    expect(unlockState("badge.symbol", "clock", ctx).unlocked).toBe(true);
    expect(unlockState("badge.symbol", "corps", ctx).unlocked).toBe(true);
    expect(unlockState("badge.symbol", "lordslayer", ctx).unlocked).toBe(false);
  });

  it("achievement rules unlock symbols and presets", () => {
    const ctx = unlockContext({ achievements: { lordSlayer: true } });
    expect(unlockState("badge.symbol", "lordslayer", ctx).unlocked).toBe(true);
    expect(unlockState("badge.preset", "p_lordslayer", ctx).unlocked).toBe(true);
  });

  it("backfills acts for saves made before campaignActsCleared was tracked", () => {
    const act1 = "act1";
    const act2 = "act2";
    // A run parked in act 3 got there by felling the act 1 and act 2 Lords.
    const parked = unlockContext({ stats: {}, campaignSaveAct: 3 });
    expect(parked.campaignActsCleared).toBe(2);
    expect(unlockState("badge.symbol", act2, parked).unlocked).toBe(true);
    // No save left, but the achievement stat remembers a Lord went down.
    const bossed = unlockContext({ stats: { bossKilled: true } });
    expect(bossed.campaignActsCleared).toBe(1);
    expect(unlockState("badge.symbol", act1, bossed).unlocked).toBe(true);
    expect(unlockState("badge.symbol", act2, bossed).unlocked).toBe(false);
    // A first act still in progress grants nothing.
    expect(unlockContext({ stats: {}, campaignSaveAct: 1 }).campaignActsCleared).toBe(0);
    expect(unlockContext().campaignActsCleared).toBe(0);
  });

  it("campaignActs counts defeated acts and a finished campaign counts as all four", () => {
    const act1 = "act1";
    const act3 = "act3";
    const act4 = "act4";
    expect(unlockState("badge.symbol", act1, unlockContext({ stats: { campaignActsCleared: 1 } })).unlocked).toBe(true);
    expect(unlockState("badge.symbol", act3, unlockContext({ stats: { campaignActsCleared: 1 } })).unlocked).toBe(false);
    expect(unlockState("badge.symbol", act4, unlockContext({ stats: { campaignActsCleared: 3 } })).unlocked).toBe(false);
    expect(unlockState("badge.symbol", act4, unlockContext({ stats: { campaignComplete: true } })).unlocked).toBe(true);
  });

  it("every act of the campaign has an emblem and a library preset", () => {
    for (const a of ACTS) {
      const sym = byId(SYMBOLS, `act${a.id}`);
      expect(sym?.unlock).toMatchObject({ type: "campaignActs", count: a.id });
      expect(byId(BADGE_PRESETS, `p_act${a.id}`)?.unlock).toMatchObject({ type: "campaignActs", count: a.id });
    }
  });

  it("finishes: insignia free, holo needs the campaign", () => {
    const ctx = unlockContext();
    expect(unlockState("badge.finish", "insignia", ctx).unlocked).toBe(true);
    expect(unlockState("badge.finish", "holo", ctx).unlocked).toBe(false);
  });

  it("accessory tiers follow the tier rules", () => {
    const ctx = unlockContext();
    expect(unlockState("acc.back", "backpack", ctx).unlocked).toBe(true);
    expect(unlockState("acc.back", "antenna", ctx).unlocked).toBe(false);
    expect(unlockState("acc.back", "antenna", unlockContext({ stats: { campaignActsCleared: 1 } })).unlocked).toBe(true);
    // One rule set for armour and accessories alike.
    for (const [slot, items] of Object.entries(ACCESSORIES)) {
      for (const item of items) {
        if (item.tier > 1) expect(ruleFor(`acc.${slot}`, item.id)).toBe(TIER_UNLOCKS[item.tier]);
      }
    }
  });

  it("ownership of id-based items survives table reordering", () => {
    const i = "lordslayer";
    expect(ownedKey("badge.symbol", i)).toBe("badge.symbol:#lordslayer");
    expect(ownedKey("armor", "heavy")).toBe("armor:#heavy");
    const ctx = unlockContext({ owned: { "badge.symbol:#lordslayer": true } });
    expect(unlockState("badge.symbol", i, ctx).unlocked).toBe(true);
  });

  it("variants lock by their own rule", () => {
    const ghost = ARMOR_STYLES.find((a) => a.variant.unlock.id === "untouchable").id;
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

  it("sanitizeLocked resets a locked flat pick to the default, and keeps an owned one", () => {
    const ctx = unlockContext();
    const locked = ARMOR_STYLES.find((a) => !unlockState("armor", a.id, ctx).unlocked).id;
    const ch = { ...cloneLook(DEFAULT_CHARACTER), armor: locked };
    expect(sanitizeLocked(ch, ctx).armor).toBe("standard");
    const owned = unlockContext({ owned: { [ownedKey("armor", locked)]: true } });
    expect(sanitizeLocked(ch, owned).armor).toBeUndefined();
    expect(sanitizeLocked(cloneLook(DEFAULT_CHARACTER), ctx)).toEqual({});
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

describe("gear drop reach", () => {
  const helm = (tier) => HELMET_STYLES.find((h) => h.tier === tier && !h.unlock).id;

  it("drops only the act in progress's tier, never a later one", () => {
    const actOne = unlockContext({ campaignSaveAct: 1, campaignSaveLevel: 2 });
    expect(withinReach(ruleFor("helmet", helm(2)), actOne)).toBe(true);
    expect(withinReach(ruleFor("helmet", helm(3)), actOne)).toBe(false);
    const actTwo = unlockContext({ campaignSaveAct: 2 });
    expect(withinReach(ruleFor("helmet", helm(3)), actTwo)).toBe(true);
    // Act emblems follow the same reach: Act 3's waits for Act 3.
    expect(withinReach(ruleFor("badge.symbol", "act3"), actTwo)).toBe(false);
  });

  it("never drops what a feat earns", () => {
    const ctx = unlockContext({ campaignSaveAct: 4 });
    expect(withinReach({ type: "achievement", id: "centurion" }, ctx)).toBe(false);
    expect(withinReach({ type: "dashes", count: 50 }, ctx)).toBe(false);
    const pool = droppableItems(unlockContext({ campaignSaveAct: 1 }));
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.some(({ key, id }) => key === "helmet" && id === "reaper")).toBe(false);
    for (const { key, id } of pool) expect(ruleFor(key, id)).not.toBe(TIER_UNLOCKS[3]);
  });

  it("counts a level rule by the act its level falls in", () => {
    const actOne = unlockContext({ campaignSaveAct: 1 });
    expect(withinReach({ type: "campaignLevels", count: ACTS[0].levels.length }, actOne)).toBe(true);
    expect(withinReach({ type: "campaignLevels", count: ACTS[0].levels.length + 1 }, actOne)).toBe(false);
  });
});

describe("unlock store pacing migration", () => {
  const store = {};
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    vi.stubGlobal("localStorage", {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = v; },
      removeItem: (k) => { delete store[k]; },
    });
    resetUnlockStore();
  });

  it("keeps gear earned under the earlier tier rules", () => {
    // A tutorial graduate who had MK II announced under the old rules.
    const id = ownedKey("armor", MK2);
    localStorage.setItem("cc_unlocks", JSON.stringify({ owned: { "acc.back:#antenna": true }, seen: { [id]: true }, v2: true }));
    const s = ensureUnlockStore(null, { tutorialComplete: true }, {});
    expect(s.paced).toBe(true);
    expect(s.owned[id]).toBe(true);
    expect(s.owned["acc.back:#antenna"]).toBe(true);
    const ctx = unlockContext({ stats: { tutorialComplete: true }, owned: s.owned });
    expect(unlockState("armor", MK2, ctx).unlocked).toBe(true);
    expect(unlockState("armor", MK3, ctx).unlocked).toBe(false);
    expect(JSON.parse(store.cc_unlocks).paced).toBe(true);
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

describe("unlock store v3 migration (index keys to ids)", () => {
  const store = {};
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    vi.stubGlobal("localStorage", {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = v; },
      removeItem: (k) => { delete store[k]; },
    });
    resetUnlockStore();
  });

  // The shipped positions, spelled out: these keys are what real stores hold.
  const legacy = (field, id) => `${field}Index:${LEGACY_LOOK_INDICES[`${field}Index`].indexOf(id)}`;

  it("migrates owned and seen index keys to ids", () => {
    const old = {
      owned: { [legacy("helmet", "reaper")]: true, [legacy("loadout", "phantom")]: true, "acc.back:#antenna": true },
      seen: { [legacy("armor", "howitzer")]: true, [legacy("camo", "urban")]: true, [legacy("color", "eclipse")]: true, "badge.symbol:#lordslayer": true },
      v2: true,
      paced: true,
    };
    const s = migrateUnlockStore(structuredClone(old));
    expect(s.v3).toBe(true);
    expect(s.owned).toEqual({ "helmet:#reaper": true, "loadout:#phantom": true, "acc.back:#antenna": true });
    expect(s.seen).toEqual({ "armor:#howitzer": true, "camo:#urban": true, "color:#eclipse": true, "badge.symbol:#lordslayer": true });
    expect(s.v2).toBe(true);
    expect(s.paced).toBe(true);
  });

  it("runs once", () => {
    const once = migrateUnlockStore({ owned: { [legacy("helmet", "reaper")]: true }, seen: {}, v2: true, paced: true });
    expect(once.owned).toEqual({ "helmet:#reaper": true });
    const twice = migrateUnlockStore(structuredClone(once));
    expect(twice).toEqual(once);
    // A v3 store is never read as positions, even if a key looks like one.
    const v3 = { owned: { [legacy("helmet", "angular")]: true }, seen: {}, v2: true, paced: true, v3: true };
    expect(migrateUnlockStore(structuredClone(v3))).toEqual(v3);
  });

  it("keeps id keys untouched", () => {
    const s = migrateUnlockStore({ owned: { "badge.symbol:#x": true, "armorVariant:#ghost": true }, seen: { "acc.legs:#greaves": true } });
    expect(s.owned).toEqual({ "badge.symbol:#x": true, "armorVariant:#ghost": true });
    expect(s.seen).toEqual({ "acc.legs:#greaves": true });
  });

  it("drops an index key past the end of its shipped table", () => {
    const past = `${legacy("helmet", "wide").split(":")[0]}:99`;
    const s = migrateUnlockStore({ owned: { [past]: true, [legacy("helmet", "wide")]: true }, seen: {} });
    expect(s.owned).toEqual({ "helmet:#wide": true });
  });

  // Review Focus 2: same pieces owned, and no unlock toast replays for them.
  it("a player who owned gear by index owns the same pieces after, with nothing to announce", () => {
    const stats = { tutorialComplete: true };
    const ctx0 = unlockContext({ stats });
    // What the old build wrote: grandfathered MK III gear, and every earned
    // unlock (MK II from the tutorial) announced, all keyed by position.
    const mk3 = ARMOR_STYLES.filter((a) => a.tier === 3).map((a) => a.id);
    const owned = Object.fromEntries(mk3.map((id) => [legacy("armor", id), true]));
    const seen = Object.fromEntries(
      earnedIds(ctx0).map((id) => {
        const [key, rest] = id.split(":");
        return LOCK[key] && !key.includes(".") ? [`${key}Index:${LEGACY_LOOK_INDICES[`${key}Index`].indexOf(rest.slice(1))}`, true] : [id, true];
      }),
    );
    expect(Object.keys(seen).some((k) => /Index:\d+$/.test(k))).toBe(true);
    store.cc_unlocks = JSON.stringify({ owned, seen, v2: true, paced: true });

    const s = ensureUnlockStore(null, stats, {});
    expect(s.v3).toBe(true);
    expect(JSON.parse(store.cc_unlocks).v3).toBe(true);
    const ctx = unlockContext({ stats, owned: s.owned });
    for (const id of mk3) expect(unlockState("armor", id, ctx).unlocked, id).toBe(true);
    expect(unlockState("helmet", HELMET_STYLES.find((h) => h.tier === 3).id, ctx).unlocked).toBe(false);
    expect(newlyEarned(ctx, s.seen)).toEqual([]);
    expect(Object.keys({ ...s.owned, ...s.seen }).filter((k) => /Index:/.test(k))).toEqual([]);
  });

  it("a fresh store starts as v3", () => {
    expect(ensureUnlockStore(null, {}, {}).v3).toBe(true);
  });
});

describe("unlock lookups take piece ids", () => {
  it("ownedKey refuses an id its table does not have", () => {
    expect(() => ownedKey("helmet", undefined)).toThrow(RangeError);
    expect(() => ownedKey("helmet", "nope")).toThrow(RangeError);
    expect(() => ownedKey("notASlot", "standard")).toThrow(RangeError);
    expect(ownedKey("helmet", "reaper")).toBe("helmet:#reaper");
  });

  it("an unknown id has no rule and never produces an ownership key", () => {
    const ctx = unlockContext();
    expect(ruleFor("helmet", "nope")).toBe(null);
    expect(unlockState("helmet", "nope", ctx).unlocked).toBe(true);
    expect(earnedIds(unlockContext({ stats: { campaignComplete: true } })).some((k) => k.endsWith("#undefined"))).toBe(false);
  });

  it("variantState reads the armour by id", () => {
    const heavy = ARMOR_STYLES.find((a) => a.id === "heavy");
    const met = unlockContext({ owned: { [`armorVariant:#${heavy.variant.id}`]: true } });
    expect(variantState("heavy", met).unlocked).toBe(true);
    expect(variantState("nope", met).unlocked).toBe(false);
  });
});

describe("theme piece pacing", () => {
  const LEGACY_FRAMES = ["standard", "strider", "vanguard", "operator", "wraith", "breacher"];
  const actsCleared = (n) => unlockContext({ stats: { campaignActsCleared: n } });
  const themeFrames = (tier) => BODY_FRAMES.filter((f) => f.tier === tier).map((f) => f.id);

  it("legacy frames are always unlocked", () => {
    for (const id of LEGACY_FRAMES) {
      expect(ruleFor("frame", id), id).toBe(null);
      expect(unlockState("frame", id, unlockContext()).unlocked, id).toBe(true);
    }
    // Nothing always open is loot, and nothing about them is announced.
    expect(lockedItems(unlockContext()).some(({ key, id }) => key === "frame" && LEGACY_FRAMES.includes(id))).toBe(false);
    expect(earnedIds(actsCleared(4)).filter((k) => LEGACY_FRAMES.some((id) => k === `frame:#${id}`))).toEqual([]);
  });

  it("a tier 2 theme frame unlocks with Act 1", () => {
    expect(LOCK.frame.kind).toBe("Frame");
    const tier2 = themeFrames(2);
    expect(tier2.length).toBeGreaterThan(0);
    for (const id of tier2) {
      expect(ruleFor("frame", id), id).toBe(TIER_UNLOCKS[2]);
      expect(unlockState("frame", id, unlockContext()).unlocked, id).toBe(false);
      expect(unlockState("frame", id, unlockContext()).hint, id).toBe(TIER_UNLOCKS[2].label);
      expect(unlockState("frame", id, actsCleared(1)).unlocked, id).toBe(true);
      expect(earnedIds(actsCleared(1)), id).toContain(`frame:#${id}`);
    }
  });

  it("exo pieces unlock with Act 2", () => {
    const exo = WARDROBE_THEMES.find((t) => t.id === "exo");
    const pieces = [["frame", exo.frames], ["helmet", exo.helmets], ["shoulder", exo.shoulders]].flatMap(([key, items]) => items.map((it) => [key, it.id]));
    expect(pieces.length).toBe(3);
    for (const [key, id] of pieces) {
      expect(ruleFor(key, id), `${key} ${id}`).toBe(TIER_UNLOCKS[3]);
      expect(unlockState(key, id, actsCleared(1)).unlocked, `${key} ${id}`).toBe(false);
      expect(unlockState(key, id, actsCleared(2)).unlocked, `${key} ${id}`).toBe(true);
    }
  });

  it("every designed theme spreads frame and shoulders at tier 2, the helmet at tier 3", () => {
    for (const t of WARDROBE_THEMES.filter((x) => x.id !== "issue" && x.id !== "exo")) {
      for (const f of t.frames) expect(f.tier, `${t.id} frame`).toBe(2);
      for (const s of t.shoulders) expect(s.tier, `${t.id} shoulders`).toBe(2);
      for (const h of t.helmets) expect(h.tier, `${t.id} helmet`).toBe(3);
    }
  });

  it("a frame can drop in the act that is working towards it", () => {
    const actOne = unlockContext({ campaignSaveAct: 1, campaignSaveLevel: 2 });
    const frames = droppableItems(actOne).filter(({ key }) => key === "frame").map(({ id }) => id).sort();
    expect(frames).toEqual(themeFrames(2).sort());
    // Act 2's pool has the Exo-Frame; an owned frame never drops again.
    const owned = { [ownedKey("frame", "exo")]: true };
    expect(droppableItems(unlockContext({ campaignSaveAct: 2 })).some(({ key, id }) => key === "frame" && id === "exo")).toBe(true);
    expect(droppableItems(unlockContext({ campaignSaveAct: 2, owned })).some(({ key, id }) => key === "frame" && id === "exo")).toBe(false);
  });

  it("hair colours and eyes/face tier-1 items are unlocked from the start", () => {
    const ctx = unlockContext();
    expect(LOCK.hairColor).toBeUndefined();
    for (const c of HAIR_COLORS) expect(unlockState("hairColor", c.id, ctx).unlocked, c.id).toBe(true);
    for (const slot of ["eyes", "face"]) {
      for (const item of ACCESSORIES[slot]) {
        const open = unlockState(`acc.${slot}`, item.id, ctx).unlocked;
        expect(open, `${slot} ${item.id}`).toBe(!item.tier || item.tier === 1);
      }
    }
  });

  it("a locked theme frame worn without owning it falls back to the default frame", () => {
    const ch = { ...cloneLook(DEFAULT_CHARACTER), frame: "duster" };
    expect(sanitizeLocked(ch, unlockContext()).frame).toBe("standard");
    expect(sanitizeLocked(ch, actsCleared(1)).frame).toBeUndefined();
    expect(sanitizeLocked({ ...ch, frame: "wraith" }, unlockContext())).toEqual({});
  });

  describe("grandfathering the saved frame", () => {
    const store = {};
    beforeEach(() => {
      for (const k of Object.keys(store)) delete store[k];
      vi.stubGlobal("localStorage", {
        getItem: (k) => store[k] ?? null,
        setItem: (k, v) => { store[k] = v; },
        removeItem: (k) => { delete store[k]; },
      });
      resetUnlockStore();
    });

    it("a player whose saved frame is a legacy one is unaffected", () => {
      store.cc_character = "{}";
      const s = ensureUnlockStore({ ...cloneLook(DEFAULT_CHARACTER), frame: "wraith" }, {}, {});
      expect(Object.keys(s.owned).filter((k) => k.startsWith("frame:"))).toEqual([]);
      expect(unlockState("frame", "wraith", unlockContext({ owned: s.owned })).unlocked).toBe(true);
    });

    it("a first-run save already wearing a theme frame keeps it", () => {
      store.cc_character = "{}";
      const s = ensureUnlockStore({ ...cloneLook(DEFAULT_CHARACTER), frame: "duster" }, {}, {});
      expect(s.owned["frame:#duster"]).toBe(true);
    });
  });
});
