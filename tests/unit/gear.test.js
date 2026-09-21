import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  gearBonuses,
  GEAR_SLOTS,
  ARMOR_STYLES,
  HELMET_STYLES,
  VISOR_STYLES,
  SHOULDER_STYLES,
  DEFAULT_CHARACTER,
} from "../../src/data/cosmetics.js";
import {
  grantOwned,
  lockedItems,
  unlockState,
  unlockContext,
  resetUnlockStore,
  LOCKABLE,
} from "../../src/systems/unlocks.js";
import { ACCESSORY_SLOTS } from "../../src/data/accessories.js";
import { DEFAULT_BADGE } from "../../src/data/badges.js";

const store = {};
const mockStorage = {
  getItem: vi.fn((k) => store[k] ?? null),
  setItem: vi.fn((k, v) => { store[k] = v; }),
  removeItem: vi.fn((k) => { delete store[k]; }),
};

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  vi.stubGlobal("localStorage", mockStorage);
  resetUnlockStore();
});

describe("gearBonuses", () => {
  it("is empty for regulation kit", () => {
    expect(gearBonuses(DEFAULT_CHARACTER)).toEqual({});
  });

  it("sums across every slot", () => {
    // Juggernaut armour + Centurion helm + Blackout visor + Bulwark shoulders.
    const b = gearBonuses({ armorIndex: 2, helmetIndex: 3, visorIndex: 2, shoulderIndex: 4 });
    expect(b.maxHealthAdd).toBe(40);
    expect(b.armorAdd).toBe(20);
    // The heavy set pays for it in speed.
    expect(b.moveSpeedAdd).toBeLessThan(0);
  });

  it("gives the light set speed instead of bulk", () => {
    const b = gearBonuses({ armorIndex: 3, helmetIndex: 4, visorIndex: 1, shoulderIndex: 0 });
    expect(b.moveSpeedAdd).toBeGreaterThan(0);
    expect(b.maxHealthAdd ?? 0).toBe(0);
  });

  it("survives a missing or partial character", () => {
    expect(gearBonuses(null)).toEqual({});
    expect(gearBonuses({})).toEqual({});
  });

  it("covers every lockable cosmetic slot", () => {
    const slots = GEAR_SLOTS.map(([k]) => k);
    for (const [key, entry] of Object.entries(LOCKABLE)) {
      if (key === "loadoutIndex") continue; // class, not gear
      if (entry.byId) continue; // badge/accessory virtual keys: bonuses summed separately, via ACCESSORY_SLOTS
      expect(slots).toContain(key);
    }
  });

  it("only puts bonuses on gear that has to be earned", () => {
    // A tier-1 starting piece giving stats would make the default kit strictly
    // worse for no reason the player can see.
    for (const table of [ARMOR_STYLES, HELMET_STYLES, VISOR_STYLES, SHOULDER_STYLES]) {
      for (const item of table) {
        if (item.bonuses) expect(item.tier).toBeGreaterThan(1);
      }
    }
  });
});

describe("gear drops", () => {
  const ctx = () => unlockContext({ stats: {}, achievements: {}, campaignSaveLevel: 0, owned: {} });

  it("offers only items that are still locked", () => {
    const pool = lockedItems(ctx());
    expect(pool.length).toBeGreaterThan(0);
    for (const { key, index } of pool) {
      expect(unlockState(key, index, ctx()).unlocked).toBe(false);
    }
  });

  it("grants an item and records it as owned", () => {
    const { key, index } = lockedItems(ctx())[0];
    expect(grantOwned(key, index)).toBe(true);
    expect(JSON.parse(store.cc_unlocks).owned[`${key}:${index}`]).toBe(true);
  });

  it("reports a duplicate so the pickup can stay quiet", () => {
    const { key, index } = lockedItems(ctx())[0];
    expect(grantOwned(key, index)).toBe(true);
    expect(grantOwned(key, index)).toBe(false);
  });

  it("marks a drop as already seen, so it is not re-announced as an unlock", () => {
    const { key, index } = lockedItems(ctx())[0];
    grantOwned(key, index);
    expect(JSON.parse(store.cc_unlocks).seen[`${key}:${index}`]).toBe(true);
  });

  it("refuses an index that is not a real option", () => {
    expect(grantOwned("armorIndex", 999)).toBe(false);
    expect(grantOwned("notASlot", 0)).toBe(false);
  });
});

describe("armour catalogue", () => {
  it("gives every style a steel ramp and a width", async () => {
    // A style missing either renders untextured or at the wrong scale, and
    // nothing in the creator would tell you.
    const rig = await import("../../src/rendering/svg-art/agent-rig.js");
    const svg = rig.buildAgentSvg ?? null;
    expect(svg, "buildAgentSvg export").toBeTruthy();
    for (let i = 0; i < ARMOR_STYLES.length; i++) {
      const markup = svg({ ...DEFAULT_CHARACTER, armorIndex: i });
      expect(markup.length, ARMOR_STYLES[i].id).toBeGreaterThan(1000);
      expect(markup).not.toContain("undefined");
      expect(markup).not.toContain("NaN");
    }
  });

  it("keeps armour ids unique", () => {
    const ids = ARMOR_STYLES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("armour treatments and variants", () => {
  it("every armour has a badge treatment and one earned variant", () => {
    for (const a of ARMOR_STYLES) {
      expect(["insignia", "stencil", "patch", "holo"]).toContain(a.badgeTreatment.finish);
      expect(["brass", "steel", "blackened", "gold"]).toContain(a.badgeTreatment.metal);
      expect(a.variant.id).toMatch(/^[a-z_]+$/);
      expect(a.variant.unlock).toBeTruthy();
      expect(a.variant.trim).toMatch(/^#[0-9a-f]{6}$/i);
      expect(a.variant.wear).toBeGreaterThanOrEqual(0);
      expect(a.variant.wear).toBeLessThanOrEqual(1);
    }
    expect(new Set(ARMOR_STYLES.map((a) => a.variant.id)).size).toBe(ARMOR_STYLES.length);
  });

  it("default character carries the new fields", () => {
    expect(DEFAULT_CHARACTER.badge).toEqual(DEFAULT_BADGE);
    expect(Object.keys(DEFAULT_CHARACTER.accessories)).toEqual(ACCESSORY_SLOTS.map((s) => s.id));
    expect(DEFAULT_CHARACTER.armorVariant).toBe(0);
  });
});

describe("gearBonuses with accessories", () => {
  it("adds accessory perks to armour perks", () => {
    const ch = { ...DEFAULT_CHARACTER, accessories: { ...DEFAULT_CHARACTER.accessories, back: "backpack", waist: "belt" } };
    const base = gearBonuses(DEFAULT_CHARACTER);
    const g = gearBonuses(ch);
    expect(g.maxStaminaAdd || 0).toBe((base.maxStaminaAdd || 0) + 8);
    expect(g.maxHealthAdd || 0).toBe((base.maxHealthAdd || 0) + 5);
  });

  it("ignores unknown accessory ids and a missing accessories object", () => {
    const bad = { ...DEFAULT_CHARACTER, accessories: { back: "nope" } };
    expect(gearBonuses(bad)).toEqual(gearBonuses(DEFAULT_CHARACTER));
    const none = { ...DEFAULT_CHARACTER };
    delete none.accessories;
    expect(() => gearBonuses(none)).not.toThrow();
  });
});
