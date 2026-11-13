// Gear stats that fit the piece: the vocabulary, its perk text and value
// weights, every piece's numbers, the budget new pieces keep to, and how the
// four newer stats reach a live player.
import { describe, it, expect } from "vitest";
import { GEAR_STATS, bonusText, gearValue } from "../../src/data/gear-stats.js";
import {
  ARMOR_STYLES,
  BODY_FRAMES,
  HELMET_STYLES,
  VISOR_STYLES,
  SHOULDER_STYLES,
  BACKSTORIES,
  gearBonuses,
} from "../../src/data/cosmetics.js";
import { ACCESSORIES, FACE_SLOTS } from "../../src/data/accessories.js";
import { syncGearStats } from "../../src/systems/gear-sync.js";
import { Player } from "../../src/entities/index.js";
import { WEAPONS } from "../../src/data/weapons.js";

const KEYS = [
  "maxHealthAdd",
  "armorAdd",
  "maxStaminaAdd",
  "maxChronoEnergyAdd",
  "moveSpeedAdd",
  "dashCostAdd",
  "ammoCapAdd",
  "fireRateAdd",
  "staminaRegenAdd",
  "regenAdd",
];

const find = (table, id) => {
  const e = table.find((x) => x.id === id);
  if (!e) throw new Error(`no "${id}"`);
  return e;
};
const acc = (slot, id) => find(ACCESSORIES[slot], id);

/** Every table whose pieces can carry gear stats. */
const GEAR_TABLES = {
  armor: ARMOR_STYLES,
  frame: BODY_FRAMES,
  helmet: HELMET_STYLES,
  visor: VISOR_STYLES,
  shoulder: SHOULDER_STYLES,
  ...Object.fromEntries(Object.entries(ACCESSORIES).map(([slot, items]) => [`acc.${slot}`, items])),
};

describe("GEAR_STATS", () => {
  it("names the ten stats gear may tune, with a label and a weight each", () => {
    expect(Object.keys(GEAR_STATS).sort()).toEqual([...KEYS].sort());
    for (const [key, s] of Object.entries(GEAR_STATS)) {
      expect(typeof s.label, key).toBe("function");
      expect(Number.isFinite(s.weight), key).toBe(true);
    }
  });

  it("every bonus key is in GEAR_STATS", () => {
    for (const [table, items] of Object.entries(GEAR_TABLES)) {
      for (const item of items) for (const key of Object.keys(item.bonuses || {})) expect(KEYS, `${table} ${item.id} ${key}`).toContain(key);
    }
    // Origins share the vocabulary.
    for (const o of BACKSTORIES) for (const key of Object.keys(o.bonuses || {})) expect(KEYS, o.id).toContain(key);
  });

  it("weighs each stat against one point of max health", () => {
    expect(Object.fromEntries(Object.entries(GEAR_STATS).map(([k, s]) => [k, s.weight]))).toEqual({
      maxHealthAdd: 1,
      armorAdd: 3,
      maxStaminaAdd: 0.5,
      maxChronoEnergyAdd: 0.5,
      moveSpeedAdd: 60,
      dashCostAdd: -1.5,
      ammoCapAdd: 60,
      fireRateAdd: 160,
      staminaRegenAdd: 40,
      regenAdd: 50,
    });
  });
});

describe("bonusText", () => {
  it("says Looks only for a piece with no stats", () => {
    expect(bonusText({})).toBe("Looks only");
    expect(bonusText(undefined)).toBe("Looks only");
    expect(bonusText(null)).toBe("Looks only");
  });

  it("holster text says the real percent", () => {
    expect(bonusText(acc("waist", "holster").bonuses)).toBe("+5% ammo capacity");
    expect(bonusText(acc("legs", "thigh").bonuses)).toBe("+5% ammo capacity");
  });

  it("states move speed as a percent of the 3.5 base", () => {
    expect(bonusText({ moveSpeedAdd: 0.25 })).toBe("+7% move speed");
    expect(bonusText({ moveSpeedAdd: -0.1 })).toBe("-3% move speed");
  });

  it("states every stat's real effect, in the piece's own order", () => {
    expect(bonusText({ armorAdd: 3, maxHealthAdd: 10, moveSpeedAdd: -0.1 })).toBe("+3 armour · +10 max health · -3% move speed");
    expect(bonusText({ maxStaminaAdd: 10, regenAdd: 0.1 })).toBe("+10 stamina · +0.1 health per second");
    expect(bonusText({ maxChronoEnergyAdd: 15 })).toBe("+15 chrono energy");
    expect(bonusText({ dashCostAdd: -2 })).toBe("-2 stamina per dash");
    expect(bonusText({ fireRateAdd: 0.06 })).toBe("+6% fire rate");
    expect(bonusText({ staminaRegenAdd: 0.15 })).toBe("+15% stamina regen");
    expect(bonusText({ ammoCapAdd: 0.1 })).toBe("+10% ammo capacity");
  });

  it("throws on a stat outside the vocabulary rather than printing nothing", () => {
    expect(() => bonusText({ luck: 1 })).toThrow(/luck/);
  });
});

describe("gearValue", () => {
  it("sums value times weight", () => {
    expect(gearValue({})).toBe(0);
    expect(gearValue(undefined)).toBe(0);
    expect(gearValue({ armorAdd: 3, maxHealthAdd: 10, moveSpeedAdd: -0.1 })).toBeCloseTo(13, 10);
    expect(gearValue({ dashCostAdd: -2 })).toBeCloseTo(3, 10);
  });
});

// The numbers each piece carries. `null`: looks only.
const THEME_STATS = {
  frame: {
    exo: { armorAdd: 3, maxHealthAdd: 10, moveSpeedAdd: -0.1 },
    duster: { ammoCapAdd: 0.15 },
    lamellar: { armorAdd: 4, moveSpeedAdd: -0.04 },
    clockwork: { maxChronoEnergyAdd: 15 },
    streetwear: { moveSpeedAdd: 0.1, dashCostAdd: -2 },
    diving: { maxHealthAdd: 12, moveSpeedAdd: -0.08 },
    spacesuit: { regenAdd: 0.25, moveSpeedAdd: -0.05 },
    vestment: { maxChronoEnergyAdd: 12, regenAdd: 0.08 },
  },
  helmet: {
    cockpit: { armorAdd: 2, fireRateAdd: 0.06 },
    brim: null,
    kabuto: { maxHealthAdd: 8, armorAdd: 3 },
    clockface: { maxChronoEnergyAdd: 20 },
    ledmask: null,
    porthole: { armorAdd: 5 },
    bubble: { staminaRegenAdd: 0.15 },
    hood: { maxChronoEnergyAdd: 20 },
  },
  shoulder: {
    pods: { ammoCapAdd: 0.25, moveSpeedAdd: -0.08 },
    poncho: null,
    sode: { armorAdd: 3 },
    gearrim: { armorAdd: 2 },
    spikepad: { armorAdd: 2 },
    lantern: null,
    patches: null,
    mantle: { maxChronoEnergyAdd: 10 },
  },
};

// The old gear whose stats changed to fit the piece.
const AUDITED = {
  armor: { tech: { maxChronoEnergyAdd: 25, regenAdd: 0.2 } },
  helmet: {
    bucket: { armorAdd: 6 },
    crested: { armorAdd: 3 },
    sealed: { staminaRegenAdd: 0.2 },
    pilot: { fireRateAdd: 0.03 },
  },
  visor: { slit: { armorAdd: 2 }, split: { fireRateAdd: 0.03 } },
  shoulder: { ordnance: { armorAdd: 6, ammoCapAdd: 0.1, moveSpeedAdd: -0.1 }, layered: { armorAdd: 4 } },
  "acc.back": { backpack: { ammoCapAdd: 0.1 } },
  "acc.waist": { belt: { regenAdd: 0.1 }, holster: { ammoCapAdd: 0.05 }, grenades: null },
  "acc.legs": { thigh: { ammoCapAdd: 0.05 } },
  "acc.arms": { screen: { fireRateAdd: 0.02 } },
  "acc.neck": { tags: null, bandolier: { ammoCapAdd: 0.1 } },
};

describe("the stat table", () => {
  for (const table of new Set([...Object.keys(THEME_STATS), ...Object.keys(AUDITED)])) {
    it(`${table}: every piece carries the stats that fit it`, () => {
      for (const [id, bonuses] of Object.entries({ ...THEME_STATS[table], ...AUDITED[table] })) {
        const item = find(GEAR_TABLES[table], id);
        if (bonuses === null) expect(item.bonuses, `${table} ${id}`).toBeUndefined();
        else expect(item.bonuses, `${table} ${id}`).toEqual(bonuses);
      }
    });
  }

  it("the Optic Implant aims; every other eyes and face item is looks only", () => {
    for (const slot of FACE_SLOTS) {
      for (const item of ACCESSORIES[slot]) {
        if (item.id === "cybereye") expect(item.bonuses).toEqual({ fireRateAdd: 0.03 });
        else expect(item.bonuses, `${slot} ${item.id}`).toBeUndefined();
      }
    }
  });

  it("no accessory keeps a hand-written perk: the text comes from its stats", () => {
    for (const items of Object.values(ACCESSORIES)) for (const item of items) expect("perk" in item, item.id).toBe(false);
  });

  it("frame bonuses count in gearBonuses", () => {
    expect(gearBonuses({ frame: "exo" })).toEqual({ armorAdd: 3, maxHealthAdd: 10, moveSpeedAdd: -0.1 });
    expect(gearBonuses({ frame: "standard" })).toEqual({});
  });

  it("only puts stats on frames that have to be earned", () => {
    for (const f of BODY_FRAMES) if (f.bonuses) expect(f.tier, f.id).toBeGreaterThan(1);
  });
});

describe("the budget", () => {
  // Legacy pieces are the Field Issue theme's and the accessories outside the
  // face slots; every other theme piece and every eyes/face item is new.
  const LEGACY_HELMETS = HELMET_STYLES.filter((e) => e.theme === "issue");
  const LEGACY_SHOULDERS = SHOULDER_STYLES.filter((e) => e.theme === "issue");
  const LEGACY_ACCESSORIES = Object.entries(ACCESSORIES)
    .filter(([slot]) => !FACE_SLOTS.includes(slot))
    .flatMap(([, items]) => items);
  // A piece paced later than any old tier (MK IV, MK V) is held to the old
  // top tier: the act it opens with moved, not what it is worth.
  const ceiling = (pieces, tier) => {
    const top = Math.max(...pieces.filter((p) => p.tier <= tier).map((p) => p.tier));
    return Math.max(...pieces.filter((p) => p.tier === top).map((p) => gearValue(p.bonuses)));
  };

  const cases = [
    // Legacy frames carry no stats: a frame is held to the helmets of its tier.
    ["frame", BODY_FRAMES.filter((e) => e.theme !== "issue"), LEGACY_HELMETS],
    ["helmet", HELMET_STYLES.filter((e) => e.theme !== "issue"), LEGACY_HELMETS],
    ["shoulder", SHOULDER_STYLES.filter((e) => e.theme !== "issue"), LEGACY_SHOULDERS],
    // Eyes and face are new slots: held to every other accessory slot's tier.
    ["eyes/face", FACE_SLOTS.flatMap((slot) => ACCESSORIES[slot]).filter((i) => i.id !== "none"), LEGACY_ACCESSORIES],
  ];
  for (const [label, pieces, legacy] of cases) {
    it(`no new ${label} piece is worth more than the best old piece of its tier`, () => {
      expect(pieces.length).toBeGreaterThan(0);
      for (const p of pieces) {
        expect(Number.isInteger(p.tier), p.id).toBe(true);
        expect(gearValue(p.bonuses), `${p.id} (tier ${p.tier})`).toBeLessThanOrEqual(ceiling(legacy, p.tier) + 1e-9);
      }
    });
  }
});

describe("syncGearStats with the newer stats", () => {
  const fresh = () => {
    const p = new Player();
    p._gearApplied = null;
    return p;
  };

  it("each new stat reaches its player stat and comes off on removal", () => {
    const p = fresh();
    const base = { ammoCap: p.ammoCap, fireRateMultiplier: p.fireRateMultiplier, staminaRegenRate: p.staminaRegenRate, regenRate: p.regenRate };
    const gear = { ammoCapAdd: 0.1, fireRateAdd: 0.06, staminaRegenAdd: 0.15, regenAdd: 0.2 };
    syncGearStats(p, gear);
    expect(p.ammoCap).toBeCloseTo(base.ammoCap + 0.1, 10);
    expect(p.fireRateMultiplier).toBeCloseTo(base.fireRateMultiplier + 0.06, 10);
    expect(p.staminaRegenRate).toBeCloseTo(base.staminaRegenRate + 0.15, 10);
    expect(p.regenRate).toBeCloseTo(base.regenRate + 0.2, 10);
    // A second call with the same gear changes nothing.
    syncGearStats(p, gear);
    expect(p.fireRateMultiplier).toBeCloseTo(base.fireRateMultiplier + 0.06, 10);
    syncGearStats(p, {});
    for (const [k, v] of Object.entries(base)) expect(p[k], k).toBeCloseTo(v, 10);
  });

  it("stacks on what arena upgrades already gave", () => {
    const p = fresh();
    p.ammoCap = 1.15;
    p.regenRate = 0.5;
    syncGearStats(p, { ammoCapAdd: 0.1, regenAdd: 0.1 });
    expect(p.ammoCap).toBeCloseTo(1.25, 10);
    expect(p.regenRate).toBeCloseTo(0.6, 10);
    syncGearStats(p, {});
    expect(p.ammoCap).toBeCloseTo(1.15, 10);
    expect(p.regenRate).toBeCloseTo(0.5, 10);
  });

  it("removing ammo gear clamps held rounds to the new cap and re-adding does not refill", () => {
    const p = fresh();
    const rifle = Object.values(WEAPONS).find((w) => !w.infiniteAmmo && w.maxAmmo >= 20 && w.magSize);
    p.weapons = [0, rifle.id];
    syncGearStats(p, { ammoCapAdd: 0.1 });
    const bigCap = p.ammoCapOf(rifle.id);
    expect(bigCap).toBe(Math.round(rifle.maxAmmo * 1.1));
    p.reserves[rifle.id] = bigCap;
    p.mags[rifle.id] = rifle.magSize;
    syncGearStats(p, {});
    expect(p.ammoCapOf(rifle.id)).toBe(rifle.maxAmmo);
    expect(p.reserveOf(rifle.id)).toBe(rifle.maxAmmo);
    expect(p.loadedOf(rifle.id)).toBeLessThanOrEqual(p.reserveOf(rifle.id));
    syncGearStats(p, { ammoCapAdd: 0.1 });
    expect(p.reserveOf(rifle.id)).toBe(rifle.maxAmmo);
    expect(p.ammoCapOf(rifle.id)).toBe(bigCap);
  });

  it("leaves rounds under the new cap alone", () => {
    const p = fresh();
    const rifle = Object.values(WEAPONS).find((w) => !w.infiniteAmmo && w.maxAmmo >= 20);
    p.weapons = [0, rifle.id];
    syncGearStats(p, { ammoCapAdd: 0.1 });
    p.reserves[rifle.id] = 5;
    syncGearStats(p, {});
    expect(p.reserveOf(rifle.id)).toBe(5);
  });
});

describe("the canvas creator's perk lines", () => {
  it("say each stat on its own line, Looks only for a piece with none, nothing off gear", async () => {
    const { gearPerkLines } = await import("../../src/ui/character-creator.js");
    expect(gearPerkLines({ key: "frame" }, find(BODY_FRAMES, "exo"))).toEqual(["+3 armour", "+10 max health", "-3% move speed"]);
    expect(gearPerkLines({ key: "shoulder" }, find(SHOULDER_STYLES, "poncho"))).toEqual(["Looks only"]);
    expect(gearPerkLines({ key: "acc.waist", slot: "waist" }, acc("waist", "holster"))).toEqual(["+5% ammo capacity"]);
    expect(gearPerkLines({ key: "acc.waist", slot: "waist" }, acc("waist", "none"))).toEqual([]);
    expect(gearPerkLines({ key: "hair" }, { id: "buzz" })).toEqual([]);
  });
});
