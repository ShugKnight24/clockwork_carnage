import { describe, it, expect } from "vitest";
import { ACCESSORY_SLOTS, ACCESSORIES, DEFAULT_ACCESSORIES, FACE_SLOTS, accessoryItem } from "../../src/data/accessories.js";
import { GEAR_STATS, bonusText } from "../../src/data/gear-stats.js";

const APPLIED = new Set(Object.keys(GEAR_STATS));
// The newer stats stay under one arena upgrade level (ammo +0.15, fire rate
// +0.12, regen +0.5 per level; stamina regen +0.3).
const CAP = {
  maxHealthAdd: 10,
  maxStaminaAdd: 10,
  maxChronoEnergyAdd: 10,
  armorAdd: 5,
  moveSpeedAdd: 0.05,
  ammoCapAdd: 0.1,
  fireRateAdd: 0.05,
  staminaRegenAdd: 0.15,
  regenAdd: 0.1,
};

describe("accessory tables", () => {
  it("has the eight slots in order, the last two worn on the face", () => {
    expect(ACCESSORY_SLOTS.map((s) => s.id)).toEqual(["back", "waist", "helmet", "arms", "neck", "legs", "eyes", "face"]);
    expect(FACE_SLOTS).toEqual(["eyes", "face"]);
  });

  it("keeps the eyes and face items the spike named", () => {
    expect(ACCESSORIES.eyes.map((i) => i.id)).toEqual(["none", "aviators", "shades", "eyepatch", "cybereye", "monocle"]);
    expect(ACCESSORIES.face.map((i) => i.id)).toEqual(["none", "scar", "warpaint", "cigar", "nosestrip", "piercings", "freckles", "beard"]);
    expect(accessoryItem("eyes", "cybereye").tier).toBe(3);
  });

  it("every slot starts with none and has unique ids", () => {
    for (const { id } of ACCESSORY_SLOTS) {
      const items = ACCESSORIES[id];
      expect(items[0].id).toBe("none");
      expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    }
  });

  it("perks use only applied stats, within the caps, and say them from the stats", () => {
    for (const { id } of ACCESSORY_SLOTS) {
      for (const item of ACCESSORIES[id]) {
        if (!item.bonuses) continue;
        expect(bonusText(item.bonuses)).not.toBe("Looks only");
        for (const [stat, v] of Object.entries(item.bonuses)) {
          expect(APPLIED.has(stat)).toBe(true);
          if (stat === "dashCostAdd") expect(v).toBeGreaterThanOrEqual(-3);
          else expect(v).toBeLessThanOrEqual(CAP[stat]);
        }
      }
    }
  });

  it("about a third of real items are cosmetic only", () => {
    // Eyes and face items are looks only, so the rule is for the gear slots.
    const real = ACCESSORY_SLOTS.filter(({ id }) => !FACE_SLOTS.includes(id)).flatMap(({ id }) => ACCESSORIES[id].slice(1));
    const cosmetic = real.filter((i) => !i.bonuses).length;
    expect(cosmetic).toBeGreaterThanOrEqual(Math.floor(real.length / 4));
    expect(cosmetic).toBeLessThanOrEqual(Math.ceil(real.length / 2));
  });

  it("defaults and lookup fall back to none", () => {
    expect(DEFAULT_ACCESSORIES).toEqual({ back: "none", waist: "none", helmet: "none", arms: "none", neck: "none", legs: "none", eyes: "none", face: "none" });
    expect(accessoryItem("back", "backpack").name).toBe("Tactical Backpack");
    expect(accessoryItem("back", "nope").id).toBe("none");
    expect(accessoryItem("nope", "backpack")).toBeNull();
  });
});
