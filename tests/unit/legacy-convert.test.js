import { describe, it, expect } from "vitest";
import { convertLegacyMap } from "../../src/world/legacy-convert.js";
import { decodeWorld } from "../../src/world/world-codec.js";

const grid = () => Array.from({ length: 60 }, () => Array(60).fill(0));
function v3() {
  const layers = Array.from({ length: 5 }, grid);
  const g = grid();
  // full wall at (2,3): all 5 layers stone; waist wall at (4,3): 2 layers metal
  for (let l = 0; l < 5; l++) layers[l][3][2] = 1;
  layers[0][3][4] = 3; layers[1][3][4] = 3;
  g[3][2] = 1; g[3][4] = 3;
  return { version: 3, name: "Old", width: 60, height: 60, grid: g, layers,
    playerStart: { x: 10, y: 10, dir: 1.5 }, enemySpawns: [{ x: 20, y: 21, enemy: "drone" }],
    entities: [{ x: 5.5, y: 6.5, type: "ammo" }], exit: { x: 50, y: 50 } };
}

describe("convertLegacyMap", () => {
  it("converts layer counts through LAYER_TO_BLOCKS and centres the map", () => {
    const w = convertLegacyMap(v3());
    // full wall → 3 blocks at z 32..34, waist wall → 1 block
    expect([32, 33, 34].map((z) => w.get(34 + 2, 34 + 3, z))).toEqual([1, 1, 1]);
    expect(w.get(36, 37, 35)).toBe(0);
    expect(w.get(34 + 4, 34 + 3, 32)).toBe(3); expect(w.get(38, 37, 33)).toBe(0);
    // empty cell gets a grass floor at 31, nothing at 32
    expect(w.get(40, 40, 31)).toBe(11); expect(w.get(40, 40, 32)).toBe(0);
    expect(w.meta.name).toBe("Old");
    expect(w.meta.spawn).toEqual({ x: 44.5, y: 44.5, z: 32, yaw: 1.5 });
    expect(w.meta.enemySpawns).toEqual([{ x: 54.5, y: 55.5, z: 32, type: "drone" }]);
    expect(w.meta.pickups).toEqual([{ x: 39.5, y: 40.5, z: 32, type: "ammo", weaponId: undefined }]);
    expect(w.meta.exit).toEqual({ x: 84, y: 84, z: 32 });
  });

  it("v2 without layers uses the flat grid as a full wall", () => {
    const m = v3(); delete m.layers; m.version = 2;
    const w = convertLegacyMap(m);
    expect([32, 33, 34].map((z) => w.get(36, 37, z))).toEqual([1, 1, 1]);
  });

  it("decodeWorld accepts a legacy object", () => {
    expect(decodeWorld(v3()).meta.name).toBe("Old");
  });
});
