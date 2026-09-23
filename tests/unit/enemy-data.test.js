import { describe, it, expect } from "vitest";
import { ENEMY_TYPES } from "../../src/data/enemies.js";

describe("enemy timing data", () => {
  it("keeps charge timings in seconds", () => {
    // ai.js counts these down with dt in seconds; a value in milliseconds
    // (the beast once had 5000) means one charge per level and never again.
    for (const [type, def] of Object.entries(ENEMY_TYPES)) {
      for (const key of ["chargeCooldown", "chargeWindup", "chargeDuration"]) {
        if (def[key] == null) continue;
        expect(def[key], `${type}.${key}`).toBeGreaterThan(0);
        expect(def[key], `${type}.${key}`).toBeLessThan(60);
      }
    }
  });
});
