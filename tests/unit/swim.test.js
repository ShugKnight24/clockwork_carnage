import { describe, it, expect } from "vitest";
import { World } from "../../src/world/world.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { WATER } from "../../src/world/blocks.js";
import {
  PLAYER, SWIM, submersion, eyeInWater, swimSpeedScale, verticalVelocity, stepWalker, raycastBlocks,
} from "../../src/world/voxel-physics.js";

const DT = 1 / 60;
const WALK = 8; // the Forge's MOVE_SPEED, blocks a second

/**
 * A pool in a flat world (grass at z = 31): x, y in 10..29, dug down to a
 * stone floor at z = 20, water in z = 21..30, so the surface cell is z = 30
 * and the drawn surface sits at 30.875. East of it, from x = 30, a bank.
 */
function pool({ bankTop = 32 } = {}) {
  const w = generateWorld({ terrain: false });
  for (let y = 10; y < 30; y++) for (let x = 10; x < 30; x++) {
    for (let z = 20; z <= 31; z++) w.set(x, y, z, z === 20 ? 1 : z <= 30 ? WATER : 0);
  }
  for (let y = 0; y < 64; y++) for (let x = 30; x < 40; x++) for (let z = 21; z < 40; z++) w.set(x, y, z, z < bankTop ? 1 : 0);
  return w;
}

const body = (x, y, z) => ({ x, y, z, velZ: 0, grounded: false, against: false });

/** Run the walker for `seconds` with the same input every frame; returns the z trace. */
function run(w, s, input, seconds, dir = [0, 0]) {
  const trace = [];
  for (let t = 0; t < seconds; t += DT) {
    stepWalker(w, s, { ...input, mx: dir[0] * WALK * DT, my: dir[1] * WALK * DT }, DT);
    trace.push(s.z);
  }
  return trace;
}

describe("water: submersion and the camera test", () => {
  it("measures the wet part of a body against the 7/8 surface", () => {
    const w = pool();
    expect(submersion(w, 20.5, 20.5, 25, PLAYER.height)).toBeCloseTo(1, 9);
    expect(submersion(w, 20.5, 20.5, 30, PLAYER.height)).toBeCloseTo(0.875 / 1.7, 6);
    expect(submersion(w, 20.5, 20.5, 31, PLAYER.height)).toBe(0);
    expect(submersion(w, 5.5, 5.5, 32, PLAYER.height)).toBe(0); // dry land
  });

  it("counts a cell under a ceiling as full", () => {
    const w = new World();
    w.set(5, 5, 5, WATER); w.set(5, 5, 6, 1);
    expect(submersion(w, 5.5, 5.5, 5, 1)).toBe(1);
  });

  it("puts the eye under water only below the drawn surface", () => {
    const w = pool();
    expect(eyeInWater(w, 20.5, 20.5, 30.8)).toBe(true);
    expect(eyeInWater(w, 20.5, 20.5, 30.9)).toBe(false);
    expect(eyeInWater(w, 20.5, 20.5, 22.0)).toBe(true);
    expect(eyeInWater(w, 5.5, 5.5, 32.5)).toBe(false);
  });
});

describe("water: swimming", () => {
  it("sinks slowly with no input", () => {
    const w = pool();
    const s = body(20.5, 20.5, 26);
    run(w, s, {}, 1);
    expect(s.z).toBeLessThan(26 - 0.5);
    expect(s.z).toBeGreaterThan(26 - 1.5);
    expect(s.velZ).toBeGreaterThan(-2);
    expect(s.velZ).toBeLessThan(0);
  });

  it("rises with Space and then floats with the eye out of the water", () => {
    const w = pool();
    const s = body(20.5, 20.5, 22);
    const trace = run(w, s, { up: true }, 5);
    const eye = s.z + PLAYER.eye;
    expect(eye).toBeGreaterThan(30.875);
    expect(s.z).toBeLessThan(30.875); // still in the water, not hopping out of it
    const last = trace.slice(-60);
    expect(Math.max(...last) - Math.min(...last)).toBeLessThan(0.3);
  });

  it("dives with the crouch key", () => {
    const w = pool();
    const s = body(20.5, 20.5, 29);
    run(w, s, { down: true }, 1);
    expect(s.z).toBeLessThan(29 - 2.5);
  });

  it("moves more slowly swimming than walking, and eases while wading", () => {
    expect(swimSpeedScale(0)).toBe(1);
    expect(swimSpeedScale(SWIM.wade)).toBeCloseTo(SWIM.moveScale, 9);
    expect(swimSpeedScale(1)).toBeCloseTo(SWIM.moveScale, 9);
    const half = swimSpeedScale(SWIM.wade / 2);
    expect(half).toBeLessThan(1); expect(half).toBeGreaterThan(SWIM.moveScale);
    const w = pool();
    const s = body(12.5, 20.5, 25);
    run(w, s, {}, 1, [1, 0]);
    expect(s.x - 12.5).toBeCloseTo(WALK * SWIM.moveScale, 0);
  });

  it("climbs out onto a bank one block above the water", () => {
    const w = pool({ bankTop: 32 });
    const s = body(28.5, 20.5, 29.4);
    run(w, s, { up: true }, 1.5, [1, 0]);
    run(w, s, {}, 1, [1, 0]); // let go of Space, or the player hops along the bank
    expect(s.x).toBeGreaterThan(30.3);
    expect(s.z).toBeCloseTo(32, 3);
    expect(s.grounded).toBe(true);
  });

  it("cannot climb a bank two blocks above the water", () => {
    const w = pool({ bankTop: 33 });
    const s = body(28.5, 20.5, 29.4);
    run(w, s, { up: true }, 3, [1, 0]);
    expect(s.x).toBeLessThan(30);
  });

  it("brakes a fall into water within a few tenths of a second", () => {
    const w = pool();
    const s = body(20.5, 20.5, 40);
    s.velZ = -20;
    let t = 0;
    while (s.z > 29.5 && t < 5) { run(w, s, {}, DT); t += DT; }
    run(w, s, {}, 0.3);
    expect(s.velZ).toBeGreaterThan(-7);
  });

  it("stands and jumps in water one block deep", () => {
    const w = generateWorld({ terrain: false });
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) w.set(x, y, 32, WATER);
    const s = body(5.5, 5.5, 32);
    run(w, s, {}, 0.2);
    expect(s.grounded).toBe(true);
    expect(s.z).toBe(32);
    s.velZ = verticalVelocity(s.velZ, submersion(w, s.x, s.y, s.z, PLAYER.height), { up: true, grounded: true }, DT);
    expect(s.velZ).toBeGreaterThan(PLAYER.jump - 1);
  });

  it("keeps the dry-land rules exactly: jump from the ground, gravity in the air", () => {
    expect(verticalVelocity(0, 0, { up: true, grounded: true }, DT)).toBeCloseTo(PLAYER.jump - PLAYER.gravity * DT, 9);
    expect(verticalVelocity(2, 0, { up: true, grounded: false }, DT)).toBeCloseTo(2 - PLAYER.gravity * DT, 9);
    expect(verticalVelocity(0, 0, { up: true, against: true }, DT)).toBeCloseTo(-PLAYER.gravity * DT, 9);
  });
});

describe("water: picking", () => {
  it("rays pass through water unless asked to stop on it", () => {
    const w = pool();
    const down = raycastBlocks(w, 20.5, 20.5, 33, 0, 0, -1, 20);
    expect(down.id).toBe(1);
    expect(down.z).toBe(20);
    const wet = raycastBlocks(w, 20.5, 20.5, 33, 0, 0, -1, 20, (id) => id !== 0);
    expect(wet.id).toBe(WATER);
    expect(wet.z).toBe(30);
    expect(wet.face).toEqual([0, 0, 1]);
  });
});
