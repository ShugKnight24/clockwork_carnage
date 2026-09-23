import { describe, it, expect } from "vitest";
import { World } from "../../src/world/world.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { PLAYER, aabbOverlapsSolid, moveAABB, groundHeight, raycastBlocks, hasLineOfSight3D, playerEyeZ3D } from "../../src/world/voxel-physics.js";

const flat = () => generateWorld({ terrain: false });
const body = (x, y, z) => ({ x, y, z, half: PLAYER.half, height: PLAYER.height });

describe("voxel physics", () => {
  it("overlap test and ground height", () => {
    const w = flat();
    expect(aabbOverlapsSolid(w, 10.5, 10.5, 32, 0.3, 1.7)).toBe(false);
    expect(aabbOverlapsSolid(w, 10.5, 10.5, 31.5, 0.3, 1.7)).toBe(true);
    w.set(10, 10, 32, 1);
    expect(groundHeight(w, 10.5, 10.5, 0.3)).toBe(33);
    expect(groundHeight(w, 20.5, 20.5, 0.3)).toBe(32);
  });

  it("walks into a two-block wall and stops; slides along it", () => {
    const w = flat();
    for (let z = 32; z < 34; z++) w.set(12, 10, z, 1);
    const r = moveAABB(w, body(11.5, 10.5, 32), 1.0, 0.4, 0);
    expect(r.x).toBeCloseTo(12 - 0.3 - 1e-3, 2); expect(r.hitX).toBe(true);
    expect(r.y).toBeCloseTo(10.9, 5);
  });

  it("steps up a single block and not a double", () => {
    const w = flat();
    w.set(12, 10, 32, 1);
    let r = moveAABB(w, body(11.5, 10.5, 32), 0.6, 0, 0, { step: 1 });
    expect(r.z).toBe(33); expect(r.stepped).toBe(true); expect(r.x).toBeCloseTo(12.1, 5);
    w.set(12, 10, 33, 1);
    r = moveAABB(w, body(11.5, 10.5, 32), 0.6, 0, 0, { step: 1 });
    expect(r.z).toBe(32); expect(r.hitX).toBe(true);
  });

  it("keeps the step-up flag when a later axis settles back down", () => {
    const w = flat();
    w.set(12, 10, 32, 1); // X climbs onto this
    w.set(12, 11, 33, 1); // then Y is blocked at the new head height and steps again, over a hole
    const r = moveAABB(w, body(11.5, 10.5, 32), 0.6, 2.0, 0);
    expect(r.z).toBe(33);
    expect(r.stepped).toBe(true);
  });

  it("stops flush on the far side of a wall moving in -x", () => {
    const w = flat();
    for (let z = 32; z < 35; z++) w.set(20, 10, z, 1);
    const r = moveAABB(w, body(24.5, 10.5, 32), -9, 0, 0);
    expect(r.hitX).toBe(true);
    expect(r.x).toBeGreaterThan(21 + 0.3); // the block ends at 21; never inside it
    expect(r.x).toBeCloseTo(21.3, 3);
  });

  it("ground height takes the tallest column a footprint straddles", () => {
    const w = flat();
    w.set(11, 11, 32, 1);
    w.set(12, 11, 32, 1); w.set(12, 11, 33, 1);
    w.set(11, 12, 32, 1);
    expect(groundHeight(w, 12, 12, 0.3)).toBe(34); // straddles all four; (12,11) is the tallest
    expect(groundHeight(w, 12.5, 12.5, 0.3)).toBe(32); // only (12,12), bare ground
  });

  it("falls onto the ground and reports grounded; a ceiling block stops a jump", () => {
    const w = flat();
    let r = moveAABB(w, body(10.5, 10.5, 35), 0, 0, -10);
    expect(r.z).toBe(32); expect(r.grounded).toBe(true); expect(r.hitZ).toBe(true);
    w.set(10, 10, 34, 1);
    r = moveAABB(w, body(10.5, 10.5, 32), 0, 0, 2);
    expect(r.z).toBeCloseTo(34 - 1.7, 3); expect(r.hitZ).toBe(true);
  });

  it("does not tunnel through a wall at high speed", () => {
    const w = flat();
    for (let z = 32; z < 35; z++) w.set(20, 10, z, 1);
    const r = moveAABB(w, body(15.5, 10.5, 32), 9, 0, 0);
    expect(r.x).toBeLessThan(20 - 0.3);
  });

  it("raycasts to the first block and reports the face hit", () => {
    const w = flat();
    w.set(15, 10, 33, 8);
    const hit = raycastBlocks(w, 10.5, 10.5, 33.5, 1, 0, 0, 6);
    expect(hit).toMatchObject({ x: 15, y: 10, z: 33, id: 8, face: [-1, 0, 0] });
    expect(hit.dist).toBeCloseTo(4.5, 5);
    expect(raycastBlocks(w, 10.5, 10.5, 40, 1, 0, 0, 6)).toBeNull();
    const down = raycastBlocks(w, 10.5, 10.5, 34, 0, 0, -1, 6);
    expect(down).toMatchObject({ z: 31, face: [0, 0, 1] });
  });

  it("3D line of sight through a one-block gap", () => {
    const w = flat();
    for (let z = 32; z < 36; z++) for (let y = 8; y < 13; y++) if (!(z === 33 && y === 10)) w.set(15, y, z, 1);
    expect(hasLineOfSight3D(w, 10.5, 10.5, 33.5, 20.5, 10.5, 33.5)).toBe(true);
    expect(hasLineOfSight3D(w, 10.5, 10.5, 32.5, 20.5, 10.5, 32.5)).toBe(false);
  });

  it("eye height rides the crouch blend", () => {
    expect(playerEyeZ3D({ x: 0, y: 0, z: 32 })).toBeCloseTo(32 + PLAYER.eye, 5);
    expect(playerEyeZ3D({ z: 32, crouchBlend: 1 })).toBeCloseTo(32 + PLAYER.crouchEye, 5);
    expect(playerEyeZ3D({ z: 32, crouchBlend: 0.5 })).toBeCloseTo(
      32 + (PLAYER.eye + PLAYER.crouchEye) / 2, 5,
    );
  });

  it("placement refused when it overlaps the player AABB", () => {
    const w = flat();
    // the block at the player's feet cell
    expect(aabbOverlapsSolid(w, 10.5, 10.5, 32, 0.3, 1.7)).toBe(false);
    w.set(10, 10, 32, 1);
    expect(aabbOverlapsSolid(w, 10.5, 10.5, 32, 0.3, 1.7)).toBe(true);
  });

  it("walls the world edges instead of letting a body walk off the map", () => {
    const w = flat();
    // West: the body stops with its west face flush on x = 0.
    const west = moveAABB(w, body(1, 10.5, 32), -4, 0, 0);
    expect(west.x).toBeCloseTo(PLAYER.half, 6);
    expect(west.hitX).toBe(true);

    // And the far side, which is the bounds' far edge rather than zero.
    const { x1, y1 } = w.bounds;
    const east = moveAABB(w, body(x1 - 1, 10.5, 32), 4, 0, 0);
    expect(east.x).toBeCloseTo(x1 - PLAYER.half, 6);
    expect(east.hitX).toBe(true);

    const north = moveAABB(w, body(10.5, 1, 32), 0, -4, 0);
    expect(north.y).toBeCloseTo(PLAYER.half, 6);
    expect(north.hitY).toBe(true);

    const south = moveAABB(w, body(10.5, y1 - 1, 32), 0, 4, 0);
    expect(south.y).toBeCloseTo(y1 - PLAYER.half, 6);
    expect(south.hitY).toBe(true);
  });

  it("caps a body under the world roof and on the world floor", () => {
    const w = new World(); // all air: nothing to stop the fall but the world itself
    const up = moveAABB(w, body(10.5, 10.5, 60), 0, 0, 20);
    expect(up.z).toBeCloseTo(World.H - PLAYER.height, 6);
    expect(up.hitZ).toBe(true);

    const down = moveAABB(w, body(10.5, 10.5, 4), 0, 0, -20);
    expect(down.z).toBe(0);
    expect(down.hitZ).toBe(true);
    expect(down.grounded).toBe(true);
  });

  // Not in the brief: the sweep's core invariant, whatever it hits and from wherever.
  it("never comes to rest inside a solid block", () => {
    const w = flat();
    for (let z = 32; z < 35; z++) { w.set(12, 10, z, 1); w.set(20, 10, z, 1); }
    w.set(11, 11, 34, 1); // low ceiling beside the wall
    const moves = [[1, 0.4, 0], [9, 0, 0], [-9, 0, 0], [0, 0, -10], [0, 0, 2], [0.6, 0.6, -0.4], [0.37, -0.91, 3.3]];
    for (const [dx, dy, dz] of moves) {
      const r = moveAABB(w, body(11.5, 10.5, 32), dx, dy, dz);
      expect(aabbOverlapsSolid(w, r.x, r.y, r.z, PLAYER.half, PLAYER.height), `move ${dx},${dy},${dz}`).toBe(false);
      expect(r.z).toBeGreaterThanOrEqual(0);
      expect(r.z + PLAYER.height).toBeLessThanOrEqual(World.H);
    }
  });
});

describe("voxel physics in a world bounded away from the origin", () => {
  it("walls a body at the world's own edges, negative ones included", () => {
    const w = new World({ bounds: { x0: -48, y0: -32, x1: -16, y1: 0 } });
    for (let y = -32; y < 0; y++) for (let x = -48; x < -16; x++) w.set(x, y, 0, 15);
    const west = moveAABB(w, body(-47, -10.5, 1), -4, 0, 0);
    expect(west.x).toBeCloseTo(-48 + PLAYER.half, 6); expect(west.hitX).toBe(true);
    const east = moveAABB(w, body(-17, -10.5, 1), 4, 0, 0);
    expect(east.x).toBeCloseTo(-16 - PLAYER.half, 6); expect(east.hitX).toBe(true);
    const north = moveAABB(w, body(-30.5, -31, 1), 0, -4, 0);
    expect(north.y).toBeCloseTo(-32 + PLAYER.half, 6); expect(north.hitY).toBe(true);
    const south = moveAABB(w, body(-30.5, -1, 1), 0, 4, 0);
    expect(south.y).toBeCloseTo(0 - PLAYER.half, 6); expect(south.hitY).toBe(true);
    // Crossing a column border inside the bounds is free.
    const across = moveAABB(w, body(-33.5, -10.5, 1), 3, 0, 0);
    expect(across.x).toBeCloseTo(-30.5, 6); expect(across.hitX).toBe(false);
  });
});
