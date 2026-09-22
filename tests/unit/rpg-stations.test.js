import { describe, it, expect } from "vitest";
import { STATIONS, STATION_RADIUS, stationsInRange } from "../../src/rpg/stations.js";
import { World } from "../../src/world/world.js";

const at = (x, y, z) => ({ x, y, z });

describe("stationsInRange", () => {
  it("is empty with no stations, no world, or no player", () => {
    expect(stationsInRange(new World(), at(64, 64, 32)).size).toBe(0);
    expect(stationsInRange(null, at(64, 64, 32)).size).toBe(0);
    expect(stationsInRange(new World(), null).size).toBe(0);
  });

  it("finds a station beside the player", () => {
    const w = new World();
    w.set(65, 64, 32, STATIONS.workbench);
    expect([...stationsInRange(w, at(64, 64, 32))]).toEqual(["workbench"]);
  });

  it("finds every station in range, not just the nearest", () => {
    const w = new World();
    w.set(65, 64, 32, STATIONS.workbench);
    w.set(63, 64, 32, STATIONS.anvil);
    w.set(64, 65, 32, STATIONS.forge);
    const found = stationsInRange(w, at(64, 64, 32));
    expect(found.size).toBe(3);
    expect(found.has("workbench")).toBe(true);
    expect(found.has("anvil")).toBe(true);
    expect(found.has("forge")).toBe(true);
  });

  it("includes a station exactly at the radius and excludes one past it", () => {
    const w = new World();
    w.set(64 + STATION_RADIUS, 64, 32, STATIONS.workbench);
    expect(stationsInRange(w, at(64, 64, 32)).has("workbench")).toBe(true);

    const far = new World();
    far.set(64 + STATION_RADIUS + 1, 64, 32, STATIONS.workbench);
    expect(stationsInRange(far, at(64, 64, 32)).has("workbench")).toBe(false);
  });

  it("does not reach through the world edge or out of bounds", () => {
    const w = new World();
    expect(() => stationsInRange(w, at(0, 0, 0))).not.toThrow();
    expect(() => stationsInRange(w, at(127, 127, 63))).not.toThrow();
    expect(stationsInRange(w, at(0, 0, 0)).size).toBe(0);
  });

  it("uses a fractional player position the way the Forge stores it", () => {
    const w = new World();
    w.set(65, 64, 32, STATIONS.workbench);
    expect(stationsInRange(w, at(64.5, 64.5, 32)).has("workbench")).toBe(true);
  });
});

describe("the station ids are pinned to the block table", () => {
  it("fails loudly here rather than silently never detecting a station", async () => {
    const { BLOCKS } = await import("../../src/world/blocks.js");
    // STATIONS hardcodes ids. If a block is ever inserted at 16, nothing
    // throws: stationsInRange just returns empty forever and every
    // station-gated recipe becomes uncraftable with no error anywhere.
    // This test is the alarm for that.
    expect(BLOCKS[STATIONS.workbench].name).toBe("Workbench");
    expect(BLOCKS[STATIONS.anvil].name).toBe("Anvil");
    expect(BLOCKS[STATIONS.forge].name).toBe("Forge");
    expect(new Set(Object.values(STATIONS)).size).toBe(3);
  });

  it("detects every station the block table calls a station", async () => {
    const { BLOCKS } = await import("../../src/world/blocks.js");
    const { World } = await import("../../src/world/world.js");
    for (const [name, id] of Object.entries(STATIONS)) {
      const w = new World();
      w.set(65, 64, 32, id);
      expect(stationsInRange(w, { x: 64.5, y: 64.5, z: 32 }).has(name)).toBe(true);
      expect(BLOCKS[id].kind).toBe("solid");
    }
  });
});
