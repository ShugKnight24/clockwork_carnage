import { describe, it, expect } from "vitest";
import { World } from "../../src/world/world.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { PLAYER } from "../../src/world/voxel-physics.js";
import { ART_LEGACY, ART_MODERN, ART_REALISTIC } from "../../src/rendering/art-style.js";
import { styleName, camFromPlayer, spawnFromMeta, standableNear } from "../../src/systems/voxel-glue.js";

/** Flat world: solid up to z=31, so a standing spawn has its feet at 32. */
const flat = () => generateWorld({ terrain: false });

describe("styleName", () => {
  it("maps every art style id to a renderer style", () => {
    expect(styleName(ART_LEGACY)).toBe("legacy");
    expect(styleName(ART_MODERN)).toBe("comic");
    expect(styleName(ART_REALISTIC)).toBe("modern");
  });
});

describe("camFromPlayer", () => {
  it("puts the eye above the feet and follows the crouch blend", () => {
    const player = { x: 10.5, y: 20.5, z: 32, angle: 1.25, pitch: -0.4 };
    const cam = camFromPlayer(player, { fov: 90 });
    expect(cam).toEqual({ x: 10.5, y: 20.5, z: 32 + PLAYER.eye, yaw: 1.25, pitch: -0.4, fovDeg: 90 });

    expect(camFromPlayer({ ...player, crouchBlend: 1 }, { fov: 90 }).z).toBeCloseTo(32 + PLAYER.crouchEye);
    // Half-way through the blend the eye sits half-way between the two heights.
    expect(camFromPlayer({ ...player, crouchBlend: 0.5 }, { fov: 90 }).z).toBeCloseTo(
      32 + (PLAYER.eye + PLAYER.crouchEye) / 2,
    );
    // An effective FOV (ADS, sprint) overrides the settings default.
    expect(camFromPlayer(player, { fov: 90 }, 55).fovDeg).toBe(55);
  });
});

describe("spawnFromMeta", () => {
  it("uses the world's own spawn when a player fits there", () => {
    const world = flat();
    world.meta.spawn = { x: 64.5, y: 64.5, z: 32, yaw: 1.5 };
    expect(spawnFromMeta(world)).toEqual({ x: 64.5, y: 64.5, z: 32, yaw: 1.5 });
  });

  it("falls back to the nearest standable column top when the spawn is buried", () => {
    const world = flat();
    world.meta.spawn = { x: 64.5, y: 64.5, z: 32, yaw: 0.5 };
    // Bury the spawn column and its whole 3x3 neighbourhood head-high.
    for (let y = 63; y <= 65; y++) {
      for (let x = 63; x <= 65; x++) {
        for (let z = 32; z < 34; z++) world.set(x, y, z, 1);
      }
    }
    // The nearest column is the buried one itself — stand on top of it.
    expect(spawnFromMeta(world)).toEqual({ x: 64.5, y: 64.5, z: 34, yaw: 0.5 });

    // Cap that column to the world roof and the search steps off it instead.
    for (let z = 34; z < World.H; z++) world.set(64, 64, z, 1);
    const spawn = spawnFromMeta(world);
    expect(spawn.z).toBe(34);
    expect(Math.hypot(spawn.x - 64.5, spawn.y - 64.5)).toBeLessThanOrEqual(1.5); // a ring-1 neighbour
  });

  it("returns null when there is nowhere to stand", () => {
    const world = new World(); // all air: no column has a floor
    expect(spawnFromMeta(world)).toBeNull();
    expect(spawnFromMeta(null)).toBeNull();
  });
});

describe("standableNear", () => {
  it("keeps a cell that already has standing room", () => {
    const world = flat();
    expect(standableNear(world, 40.5, 40.5, 32)).toEqual({ x: 40.5, y: 40.5, z: 32 });
  });

  it("climbs the column when a block has been dropped on the marker", () => {
    const world = flat();
    world.set(40, 40, 32, 1); // a builder placed a block over the spawn
    expect(standableNear(world, 40.5, 40.5, 32)).toEqual({ x: 40.5, y: 40.5, z: 33 });

    world.set(40, 40, 33, 1); // and another on top of that
    expect(standableNear(world, 40.5, 40.5, 32)).toEqual({ x: 40.5, y: 40.5, z: 34 });
  });

  it("steps to a neighbouring column when its own is full to the roof", () => {
    const world = flat();
    for (let z = 32; z < World.H; z++) world.set(40, 40, z, 1);
    const at = standableNear(world, 40.5, 40.5, 32);
    expect(at.z).toBe(32);
    expect(Math.hypot(at.x - 40.5, at.y - 40.5)).toBeLessThanOrEqual(1.5);
  });

  it("takes the body's own size, so a wider body needs a wider gap", () => {
    const world = flat();
    // A one-block slot: air at (40, 40, 32), walled on every side.
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let z = 32; z < 35; z++) world.set(40 + dx, 40 + dy, z, 1);
    }
    expect(standableNear(world, 40.5, 40.5, 32)).toEqual({ x: 40.5, y: 40.5, z: 32 });
    // Half a block wider than the slot: the search has to leave it.
    const wide = standableNear(world, 40.5, 40.5, 32, 0.6, PLAYER.height);
    expect(wide).not.toEqual({ x: 40.5, y: 40.5, z: 32 });
  });

  it("returns null when nothing within reach has a floor", () => {
    expect(standableNear(new World(), 40.5, 40.5, 32)).toBeNull();
  });
});
