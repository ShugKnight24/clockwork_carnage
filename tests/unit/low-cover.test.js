import { describe, it, expect } from "vitest";
import {
  wallHeight,
  hasLineOfSight,
  isPassable,
  playerEyeZ,
  EYE_Z,
  CROUCH_EYE_Z,
} from "../../src/systems/physics.js";
import { distanceToWall } from "../../src/systems/combat.js";
import { createGrid, createHeights, lowWall, LAYER } from "../../src/data/levels/map-helpers.js";

/** A 12x3 corridor: low cover at col 5, a full-height wall at col 9. */
function corridorMap(layers = LAYER.WAIST) {
  const g = createGrid(12, 3, 1);
  const hm = createHeights(12, 3);
  for (let c = 1; c <= 10; c++) g[1][c] = 0;
  lowWall(g, hm, 1, 5, 1, 5, layers, 3);
  g[1][9] = 1;
  return { width: 12, height: 3, grid: g, heightMap: hm };
}

const shooter = { x: 1.5, y: 1.5 };

describe("wallHeight", () => {
  it("reports open floor, low cover and full walls", () => {
    const map = corridorMap();
    expect(wallHeight(map, 3, 1)).toBe(0);
    expect(wallHeight(map, 5, 1)).toBeCloseTo(0.4);
    expect(wallHeight(map, 9, 1)).toBe(1);
  });

  it("treats a map with no heightMap as all full-height", () => {
    const map = corridorMap();
    delete map.heightMap;
    expect(wallHeight(map, 5, 1)).toBe(1);
  });

  it("counts out-of-bounds as solid", () => {
    expect(wallHeight(corridorMap(), -1, 1)).toBe(1);
  });
});

describe("low cover blocks movement but not sight", () => {
  it("is still solid to walk through", () => {
    expect(isPassable(corridorMap(), 5, 1)).toBe(false);
  });

  it("lets a standing agent see over waist-high cover", () => {
    expect(hasLineOfSight(corridorMap(), 1.5, 1.5, 8.5, 1.5)).toBe(true);
  });

  it("hides a crouched agent behind waist-high cover but not a standing one", () => {
    // Waist is 0.4 of a wall: under a standing eye at 0.5, over a crouched 0.3.
    const map = corridorMap(LAYER.WAIST);
    expect(hasLineOfSight(map, 1.5, 1.5, 8.5, 1.5, EYE_Z, CROUCH_EYE_Z)).toBe(false);
    expect(hasLineOfSight(map, 1.5, 1.5, 8.5, 1.5, EYE_Z, EYE_Z)).toBe(true);
  });

  it("blocks sight for everyone once cover is above the eye line", () => {
    const map = corridorMap(LAYER.SHOULDER);
    expect(hasLineOfSight(map, 1.5, 1.5, 8.5, 1.5, EYE_Z, EYE_Z)).toBe(false);
  });

  it("never sees through a full-height wall", () => {
    expect(hasLineOfSight(corridorMap(), 1.5, 1.5, 10.5, 1.5)).toBe(false);
  });
});

describe("hitscan over low cover", () => {
  it("passes over waist-high cover and stops at the full wall", () => {
    // Without the height test the shot would die on the cover at ~3.5.
    expect(distanceToWall(shooter, 1, 0, corridorMap(), 20)).toBeCloseTo(7.5, 1);
  });

  it("stops at the cover when the map has no heights", () => {
    const map = corridorMap();
    delete map.heightMap;
    expect(distanceToWall(shooter, 1, 0, map, 20)).toBeCloseTo(3.5, 1);
  });

  it("stops at cover the shot is still below", () => {
    // Shoulder-high cover: a level shot from the hip never rises above it.
    expect(distanceToWall(shooter, 1, 0, corridorMap(LAYER.SHOULDER), 20)).toBeCloseTo(3.5, 1);
  });
});

describe("playerEyeZ", () => {
  it("follows the crouch blend between standing and crouched", () => {
    expect(playerEyeZ({ crouchBlend: 0 })).toBe(EYE_Z);
    expect(playerEyeZ({ crouchBlend: 1 })).toBe(CROUCH_EYE_Z);
    expect(playerEyeZ({ crouchBlend: 0.5 })).toBeCloseTo((EYE_Z + CROUCH_EYE_Z) / 2);
  });

  it("treats a missing blend as standing", () => {
    expect(playerEyeZ({})).toBe(EYE_Z);
    expect(playerEyeZ(null)).toBe(EYE_Z);
  });
});
