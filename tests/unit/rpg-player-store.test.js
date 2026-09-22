// tests/unit/rpg-player-store.test.js
import { describe, it, expect } from "vitest";
import { PLAYER_VERSION, MemoryPlayerBackend, PlayerStore, decodePlayer } from "../../src/rpg/player-store.js";
import { Inventory } from "../../src/rpg/inventory.js";
import { Skills } from "../../src/rpg/skills.js";

describe("decodePlayer", () => {
  it("returns a fresh session for a missing row", () => {
    const p = decodePlayer(null);
    expect(p.skills.xp.mining).toBe(0);
    expect(p.inventory.slots.every((s) => s === null)).toBe(true);
  });

  // Review Focus 1
  it("drops unknown item ids and keeps the rest of the inventory", () => {
    const p = decodePlayer({
      id: 0, version: PLAYER_VERSION,
      skills: { mining: 500 },
      inventory: [{ item: "stone", n: 4 }, { item: "gone_in_a_rename", n: 9 }, null],
    });
    expect(p.skills.xp.mining).toBe(500);
    expect(p.inventory.count("stone")).toBe(4);
    expect(p.inventory.count("gone_in_a_rename")).toBe(0);
  });

  it("refuses a record from a future version rather than coercing it", () => {
    const p = decodePlayer({ id: 0, version: PLAYER_VERSION + 1, skills: { mining: 9999 }, inventory: [] });
    expect(p.stale).toBe(true);
    expect(p.skills.xp.mining).toBe(0);
  });
});

describe("PlayerStore", () => {
  it("round-trips skills and inventory", async () => {
    const store = new PlayerStore(new MemoryPlayerBackend());
    const inventory = new Inventory();
    inventory.add("rock", 7);
    const skills = new Skills();
    skills.grant("mining", 250);

    await store.save(0, { skills, inventory });
    const back = await store.load(0);
    expect(back.inventory.count("rock")).toBe(7);
    expect(back.skills.xp.mining).toBe(250);
    expect(back.stale).toBe(false);
  });

  it("returns a fresh session when the backend throws", async () => {
    const broken = { get: () => Promise.reject(new Error("quota")), put: () => Promise.reject(new Error("quota")) };
    const store = new PlayerStore(broken);
    const p = await store.load(0);
    expect(p.skills.xp.mining).toBe(0);
    expect(p.unavailable).toBe(true);
    await expect(store.save(0, { skills: new Skills(), inventory: new Inventory() })).resolves.toBe(false);
  });
});
