import { describe, it, expect } from "vitest";
import { fireWeapon } from "../../src/systems/combat-orchestrator.js";
import { WEAPONS } from "../../src/data/weapons.js";

const dryGame = (weapons, current) => {
  const player = {
    weapons,
    currentWeapon: current,
    ammo: 0,
    lastFireTime: -1e9,
    fireRateMultiplier: 1,
    getWeaponDef() {
      return WEAPONS[this.weapons[this.currentWeapon]];
    },
  };
  return { time: 1000, player, audio: {} };
};

describe("an empty gun", () => {
  it("falls back to the Chrono Pistol, which never runs dry", () => {
    const g = dryGame([0, 1, 2], 2);
    fireWeapon(g);
    expect(g.player.currentWeapon).toBe(0);
    expect(g.player.ammo).toBe(0);
  });

  it("stays put when there is no pistol to fall back to", () => {
    const g = dryGame([1, 2], 1);
    fireWeapon(g);
    expect(g.player.currentWeapon).toBe(1);
  });
});
