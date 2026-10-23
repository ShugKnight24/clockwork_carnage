import { describe, it, expect } from "vitest";
import { arenaRoundPacks, noteCrateTaken, updateAmmoEconomy, BOSS_CRATE_RESPAWN_MS, KILL_DROP_CHANCE } from "../../src/systems/ammo-economy.js";

const boss = () => ({ type: "enemy", active: true, state: "chase", enemyType: "boss" });

describe("ammo economy", () => {
  it("arena rounds restock more as they go", () => {
    expect(arenaRoundPacks(1)).toBe(1);
    expect(arenaRoundPacks(10)).toBeGreaterThan(arenaRoundPacks(3));
    expect(KILL_DROP_CHANCE.arena).toBeGreaterThan(0);
  });

  it("a boss arena's crate comes back while the boss stands, and not after", () => {
    const game = { mode: "campaign", time: 0, entities: [boss()] };
    noteCrateTaken(game, { x: 3, y: 4 });
    game.time = BOSS_CRATE_RESPAWN_MS - 1;
    updateAmmoEconomy(game);
    expect(game.entities).toHaveLength(1);
    game.time = BOSS_CRATE_RESPAWN_MS;
    updateAmmoEconomy(game);
    expect(game.entities.at(-1)).toMatchObject({ type: "ammo", x: 3, y: 4 });

    noteCrateTaken(game, { x: 1, y: 1 });
    game.entities[0].state = "dead";
    game.time += BOSS_CRATE_RESPAWN_MS;
    updateAmmoEconomy(game);
    expect(game.entities.filter((e) => e.type === "ammo")).toHaveLength(1);
  });

  it("an ordinary level's crates stay taken", () => {
    const game = { mode: "campaign", time: 0, entities: [] };
    noteCrateTaken(game, { x: 3, y: 4 });
    expect(game._bossCrates).toBeUndefined();
  });
});
