// A saved run's stats already hold the gear it was saved in. Continuing it
// must move them to the gear worn now exactly once: never count the gear
// twice, never keep stats of gear taken off since.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Player } from "../../src/entities/index.js";
import { gearBonuses, DEFAULT_CHARACTER } from "../../src/data/cosmetics.js";
import { cloneLook } from "../../src/core/character-fields.js";
import { syncGearStats, resumeGearStats, savedGearApplied } from "../../src/systems/gear-sync.js";
import { legacyGearBonuses, LEGACY_GEAR_BONUSES } from "../../src/data/legacy-gear.js";
import { saveArena, loadArenaData, saveCampaign, loadCampaignData } from "../../src/core/save-system.js";
import { WEAPONS } from "../../src/data/weapons.js";

const store = {};
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  vi.stubGlobal("localStorage", {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  });
});
afterEach(() => vi.unstubAllGlobals());

const look = (over = {}) => {
  const ch = cloneLook(DEFAULT_CHARACTER);
  return { ...ch, ...over, accessories: { ...ch.accessories, ...over.accessories } };
};

/** The stats gear moves, rounded so float order does not matter. */
const STATS = ["maxHealth", "armor", "maxStamina", "maxChronoEnergy", "moveSpeed", "dashStaminaCost", "ammoCap", "fireRateMultiplier", "staminaRegenRate", "regenRate"];
const stats = (p) => Object.fromEntries(STATS.map((k) => [k, Math.round(p[k] * 1e6) / 1e6]));
/** The same, but armour: it is a pool gear tops up and never takes back (syncGearStats). */
const statsButArmor = (p) => {
  const { armor: _armor, ...rest } = stats(p);
  return rest;
};

/** A run started in `character`'s gear (what applyLoadoutBonuses does for gear). */
function startRun(character) {
  const p = new Player();
  p.reset();
  syncGearStats(p, gearBonuses(character));
  return p;
}

/** A continue, as Game.loadArena and CampaignManager.load do it. */
function continueRun(data, character) {
  const p = new Player();
  p.reset();
  syncGearStats(p, gearBonuses(character)); // applyLoadoutBonuses: the stats the save does not carry
  p.deserialize(data);
  resumeGearStats(p, data, character, gearBonuses(character));
  return p;
}

const AMMO = look({ shoulder: "ordnance", accessories: { neck: "bandolier", back: "backpack" } });
const LIGHT = look({ armor: "recon", accessories: { waist: "belt" } });

describe("continuing a saved run", () => {
  it("a run saved in ammo gear and continued in other gear has exactly that gear's stats", () => {
    const p = startRun(AMMO);
    saveArena(3, p, {}, "normal");
    const data = loadArenaData();
    expect(data.gearApplied).toEqual(gearBonuses(AMMO));
    const q = continueRun(data, LIGHT);
    expect(statsButArmor(q)).toEqual(statsButArmor(startRun(LIGHT)));
    expect(q.armor).toBe(p.armor);
    // And in the same gear, nothing moves.
    expect(stats(continueRun(data, AMMO))).toEqual(stats(startRun(AMMO)));
  });

  it("a campaign save does the same, and clamps rounds the lost capacity no longer holds", () => {
    const p = startRun(AMMO);
    const rifle = WEAPONS.find((w) => !w.infiniteAmmo && w.maxAmmo >= 20);
    p.weapons = [0, rifle.id];
    p.reserves[rifle.id] = p.ammoCapOf(rifle.id);
    saveCampaign(2, 1, 0, p, "normal", [], [], 0);
    const data = loadCampaignData();
    const q = continueRun(data, LIGHT);
    expect(statsButArmor(q)).toEqual(statsButArmor(startRun(LIGHT)));
    expect(q.reserveOf(rifle.id)).toBe(rifle.maxAmmo);
  });

  it("an arena continue followed by a sync in the same gear does not count it twice", () => {
    saveArena(2, startRun(AMMO), {}, "normal");
    const q = continueRun(loadArenaData(), AMMO);
    const once = stats(q);
    syncGearStats(q, gearBonuses(AMMO));
    expect(stats(q)).toEqual(once);
    expect(once).toEqual(stats(startRun(AMMO)));
  });

  it("keeps arena upgrades taken during the run", () => {
    const p = startRun(AMMO);
    p.ammoCap += 0.15;
    p.regenRate += 0.5;
    saveArena(4, p, { ammo: 1, regen: 1 }, "normal");
    const q = continueRun(loadArenaData(), LIGHT);
    const want = startRun(LIGHT);
    expect(q.ammoCap).toBeCloseTo(want.ammoCap + 0.15, 10);
    expect(q.regenRate).toBeCloseTo(want.regenRate + 0.5, 10);
  });

  it("reset() forgets the gear a player had on", () => {
    const p = startRun(AMMO);
    expect(p._gearApplied).not.toBeNull();
    p.reset();
    expect(p._gearApplied).toBeNull();
  });
});

describe("a save from before gear was saved", () => {
  // What the old release's save holds: its stats built with the old numbers,
  // no gearApplied and no maxStamina.
  function legacySave(character) {
    const p = new Player();
    p.reset();
    syncGearStats(p, legacyGearBonuses(character));
    const data = p.serialize();
    delete data.maxStamina;
    return JSON.parse(JSON.stringify({ version: 1, round: 2, ...data }));
  }

  it("gets today's stats for the same gear once", () => {
    // The Launcher, Bandolier and Utility Belt all changed what they give.
    const ch = look({ shoulder: "ordnance", accessories: { neck: "bandolier", waist: "belt" }, armor: "tech" });
    const q = continueRun(legacySave(ch), ch);
    expect(stats(q)).toEqual(stats(startRun(ch)));
    syncGearStats(q, gearBonuses(ch));
    expect(stats(q)).toEqual(stats(startRun(ch)));
  });

  it("keeps the old visor rule: a visor under a visorless helmet was never in the stats", () => {
    // The Do-Rag and the Reaper shipped with the rule (17839ad9), so a save
    // wearing one never had the visor's +25 chrono to take back off.
    for (const helmet of ["bandana", "reaper"]) {
      const ch = look({ helmet, visor: "glow" });
      expect(legacyGearBonuses(ch).maxChronoEnergyAdd ?? 0, helmet).toBe(0);
      // The save as that release wrote it: stats without the visor's share.
      const written = legacySave(look({ helmet, visor: "standard" }));
      expect(stats(continueRun(written, ch)), helmet).toEqual(stats(startRun(ch)));
    }
    // Under a helmet that takes one, the visor counted, as it always did.
    expect(legacyGearBonuses(look({ helmet: "wide", visor: "glow" })).maxChronoEnergyAdd).toBe(25);
  });

  it("takes maxStamina's share from the gear worn now, which the load put there", () => {
    const ch = look({ helmet: "crested" });
    const baked = savedGearApplied({}, ch, gearBonuses(ch));
    expect(baked.maxStaminaAdd).toBeUndefined();
    expect(baked.moveSpeedAdd).toBe(0.1);
    expect(savedGearApplied({ maxStamina: 120 }, ch, gearBonuses(ch)).maxStaminaAdd).toBe(20);
  });

  it("falls back to the old numbers for a gearApplied that is not a gear record", () => {
    const ch = look({ armor: "tech" });
    for (const bad of [null, [], "x", { luck: 1 }, { armorAdd: Number.NaN }]) {
      expect(savedGearApplied({ gearApplied: bad, maxStamina: 100 }, ch, {}), JSON.stringify(bad)).toEqual(LEGACY_GEAR_BONUSES.armor.tech);
    }
  });

  it("freezes the old numbers: the 42 pieces that had stats", () => {
    expect(Object.isFrozen(LEGACY_GEAR_BONUSES)).toBe(true);
    expect(Object.values(LEGACY_GEAR_BONUSES).reduce((n, t) => n + Object.keys(t).length, 0)).toBe(42);
  });
});
