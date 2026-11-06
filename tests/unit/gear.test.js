import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  gearBonuses,
  GEAR_SLOTS,
  ARMOR_STYLES,
  HELMET_STYLES,
  VISOR_STYLES,
  SHOULDER_STYLES,
  DEFAULT_CHARACTER,
  takesVisor,
  BODY_FRAMES,
} from "../../src/data/cosmetics.js";
import { HIDES, frameHides, helmetSeats, helmetFaceSlots } from "../../src/data/wardrobe-themes/index.js";
import {
  grantOwned,
  lockedItems,
  unlockState,
  unlockContext,
  resetUnlockStore,
  LOCKABLE,
  ownedKey,
} from "../../src/systems/unlocks.js";
import { ACCESSORY_SLOTS, ACCESSORIES, FACE_SLOTS } from "../../src/data/accessories.js";
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
    const b = gearBonuses({ armor: "heavy", helmet: "mohawk", visor: "fullface", shoulder: "armored" });
    expect(b.maxHealthAdd).toBe(40);
    expect(b.armorAdd).toBe(20);
    // The heavy set pays for it in speed.
    expect(b.moveSpeedAdd).toBeLessThan(0);
  });

  it("gives the light set speed instead of bulk", () => {
    const b = gearBonuses({ armor: "stealth", helmet: "crested", visor: "slit", shoulder: "none" });
    expect(b.moveSpeedAdd).toBeGreaterThan(0);
    expect(b.maxHealthAdd ?? 0).toBe(0);
  });

  it("skips the visor under a helmet that has none", () => {
    const beacon = "glow";
    expect(gearBonuses({ helmet: "bandana", visor: beacon }).maxChronoEnergyAdd ?? 0).toBe(0);
    expect(gearBonuses({ helmet: "reaper", visor: beacon }).maxChronoEnergyAdd ?? 0).toBe(0);
    // Pilot's lenses take the visor.
    expect(gearBonuses({ helmet: "pilot", visor: beacon }).maxChronoEnergyAdd).toBe(25);
    expect(takesVisor("pilot")).toBe(true);
    expect(takesVisor("bandana")).toBe(false);
    expect(takesVisor(undefined)).toBe(true);
    expect(takesVisor("no_such_helmet")).toBe(true);
  });

  it("survives a missing or partial character", () => {
    expect(gearBonuses(null)).toEqual({});
    expect(gearBonuses({})).toEqual({});
  });

  it("covers every lockable cosmetic slot", () => {
    const slots = GEAR_SLOTS.map(([k]) => k);
    for (const [key, entry] of Object.entries(LOCKABLE)) {
      if (key === "loadout" || key === "color" || key === "camo") continue; // class, palette and camo: not gear
      if (entry.virtual) continue; // badge/accessory virtual keys: bonuses summed separately, via ACCESSORY_SLOTS
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

describe("gearBonuses counts only what is drawn", () => {
  const BULWARK = "armored"; // +8 armour shoulders

  it("counts the frame slot", () => {
    expect(GEAR_SLOTS.map(([k]) => k)).toContain("frame");
  });

  it("gives no shoulder stats on a frame that hides the shoulders", () => {
    expect(frameHides("operator", "shoulders")).toBe(true);
    expect(gearBonuses({ frame: "operator", shoulder: BULWARK }).armorAdd ?? 0).toBe(0);
    expect(gearBonuses({ frame: "standard", shoulder: BULWARK }).armorAdd).toBe(8);
    // The Strider wears its own bare cap on the right; the pick is still worn on the left.
    expect(gearBonuses({ frame: "strider", shoulder: BULWARK }).armorAdd).toBe(8);
  });

  it("never takes stats away for stock art a frame hides (kit, collar, hips, cape, limb light)", () => {
    const look = { armor: "heavy", helmet: "mohawk", visor: "fullface", shoulder: BULWARK, accessories: { back: "cloak", waist: "belt", legs: "shins" } };
    const bare = gearBonuses({ ...look, frame: "standard" });
    for (const { id } of BODY_FRAMES) {
      if (frameHides(id, "shoulders")) continue;
      expect(gearBonuses({ ...look, frame: id }), id).toEqual(bare);
    }
    // The loop above takes in frames hiding each of these (no frame hides the hips yet).
    for (const word of ["kit", "collar", "cape", "limbGlow"]) expect(BODY_FRAMES.some((f) => frameHides(f.id, word)), word).toBe(true);
    expect(HIDES).toContain("hips");
  });

  it("gives no stats for helmet gear on a seat the helmet refuses", () => {
    const whip = ACCESSORIES.helmet.find((i) => i.id === "whip");
    expect(whip.seat).toBe("side");
    expect(whip.bonuses).toBeTruthy();
    expect(helmetSeats("bubble").side).toBe(false);
    expect(gearBonuses({ helmet: "bubble", accessories: { helmet: "whip" } })).toEqual(gearBonuses({ helmet: "bubble" }));
    expect(gearBonuses({ helmet: "standard", accessories: { helmet: "whip" } })).toEqual(whip.bonuses);
  });

  describe("eyes and face items", () => {
    // A fixture item with a stat in every face slot, taken out after each test.
    const FIXTURE = { id: "stat-fixture", name: "Fixture", desc: "Fixture", tier: 2, bonuses: { maxHealthAdd: 7 } };
    beforeEach(() => {
      for (const slot of FACE_SLOTS) ACCESSORIES[slot].push(FIXTURE);
    });
    afterEach(() => {
      for (const slot of FACE_SLOTS) ACCESSORIES[slot].splice(ACCESSORIES[slot].indexOf(FIXTURE), 1);
    });
    const wearing = (helmet, slot) => gearBonuses({ helmet, accessories: { [slot]: FIXTURE.id } }).maxHealthAdd ?? 0;
    const base = (helmet) => gearBonuses({ helmet }).maxHealthAdd ?? 0;

    it("count under an open helmet with room for them", () => {
      // Bastion: an open helmet with room for both.
      for (const slot of FACE_SLOTS) expect(wearing("wide", slot) - base("wide"), slot).toBe(7);
    });

    it("give nothing under a closed helmet", () => {
      expect(helmetFaceSlots("standard")).toEqual({ eyes: false, face: false });
      for (const slot of FACE_SLOTS) expect(wearing("standard", slot), slot).toBe(0);
    });

    it("give nothing where an open helmet has no room for the slot", () => {
      // The Marshal's bandana is up over the face, but eyewear fits.
      expect(helmetFaceSlots("brim")).toEqual({ eyes: true, face: false });
      expect(wearing("brim", "face")).toBe(base("brim"));
      expect(wearing("brim", "eyes") - base("brim")).toBe(7);
      // The LED mask leaves room for neither.
      for (const slot of FACE_SLOTS) expect(wearing("ledmask", slot), slot).toBe(base("ledmask"));
    });
  });
});

describe("gear drops", () => {
  const ctx = () => unlockContext({ stats: {}, achievements: {}, campaignSaveLevel: 0, owned: {} });

  it("offers only items that are still locked", () => {
    const pool = lockedItems(ctx());
    expect(pool.length).toBeGreaterThan(0);
    for (const { key, id } of pool) {
      expect(unlockState(key, id, ctx()).unlocked).toBe(false);
    }
  });

  it("grants an item and records it as owned", () => {
    const { key, id } = lockedItems(ctx())[0];
    expect(grantOwned(key, id)).toBe(true);
    expect(JSON.parse(store.cc_unlocks).owned[ownedKey(key, id)]).toBe(true);
  });

  it("reports a duplicate so the pickup can stay quiet", () => {
    const { key, id } = lockedItems(ctx())[0];
    expect(grantOwned(key, id)).toBe(true);
    expect(grantOwned(key, id)).toBe(false);
  });

  it("marks a drop as already seen, so it is not re-announced as an unlock", () => {
    const { key, id } = lockedItems(ctx())[0];
    grantOwned(key, id);
    expect(JSON.parse(store.cc_unlocks).seen[ownedKey(key, id)]).toBe(true);
  });

  it("refuses an id that is not a real option", () => {
    expect(grantOwned("armor", "no_such_armor")).toBe(false);
    expect(grantOwned("armor", undefined)).toBe(false);
    expect(grantOwned("notASlot", "standard")).toBe(false);
    expect(store.cc_unlocks ? Object.keys(JSON.parse(store.cc_unlocks).owned) : []).not.toContain("armor:#undefined");
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
      const markup = svg({ ...DEFAULT_CHARACTER, armor: ARMOR_STYLES[i].id });
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
