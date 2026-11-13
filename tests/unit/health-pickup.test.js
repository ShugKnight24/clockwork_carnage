/**
 * health-pickup.test.js — a med pack is only used when it heals.
 *
 * At full health it stays on the floor, in the prologue too; there, walking
 * over it still counts for the step that points you at it (the "patch" step).
 */
import { describe, it, expect } from "vitest";
import { Game } from "../../js/game.js";
import { Pickup } from "../../src/entities/index.js";

function gameAt(health, mode) {
  const g = Object.create(Game.prototype);
  const pack = new Pickup(5, 5, "health");
  g.mode = mode;
  g.world = null;
  g.player = { x: 5, y: 5, z: 0, health, maxHealth: 100 };
  g.entities = [pack];
  g.entityGrid = { query: () => [pack] };
  g.tutorial = { pickupsOpen: true, pickedUp: false };
  g.audio = { pickup() {} };
  g.spawnPickupBurst = () => {};
  g.triggerAriaOnce = () => {};
  return { g, pack };
}

describe("a med pack", () => {
  for (const mode of ["campaign", "tutorial"]) {
    it(`stays on the floor at full health (${mode})`, () => {
      const { g, pack } = gameAt(100, mode);
      g.checkPickups();
      expect(pack.active).toBe(true);
      expect(g.player.health).toBe(100);
    });

    it(`heals when hurt (${mode})`, () => {
      const { g, pack } = gameAt(60, mode);
      g.checkPickups();
      expect(pack.active).toBe(false);
      expect(g.player.health).toBe(85);
    });
  }

  it("still counts for the prologue's step when found at full health", () => {
    const { g } = gameAt(100, "tutorial");
    g.checkPickups();
    expect(g.tutorial.pickedUp).toBe(true);
  });
});
