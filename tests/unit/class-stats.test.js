// A class card's bars say what the class does in play.
import { describe, it, expect } from "vitest";
import { classStats } from "../../src/ui/class-stats.js";
import { LOADOUT_CLASSES } from "../../src/data/cosmetics.js";
import { WEAPONS } from "../../src/data/weapons.js";

const bar = (cls, label) => classStats(cls).find((s) => s.label === label);

describe("class fire rate", () => {
  it("is the fire rate multiplier itself, as the game applies it", () => {
    // combat-orchestrator.js waits wep.fireRate / fireRateMultiplier between shots.
    const gun = WEAPONS[1];
    for (const cls of LOADOUT_CLASSES) {
      const mult = cls.bonuses?.fireRateMultiplier ?? 1;
      const shotsPerUnit = 1 / (gun.fireRate / mult);
      const base = 1 / gun.fireRate;
      expect(bar(cls, "Fire rate").value, cls.id).toBeCloseTo(shotsPerUnit / base, 10);
    }
  });

  it("shows the Gunslinger's 0.9 as slower than standard", () => {
    const gunslinger = LOADOUT_CLASSES.find((c) => c.id === "gunslinger");
    const fr = bar(gunslinger, "Fire rate");
    expect(fr.value).toBeLessThan(fr.base);
    expect(fr.fmt(fr.value)).toBe("90%");
  });
});
