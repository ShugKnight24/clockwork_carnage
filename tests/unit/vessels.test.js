import { describe, it, expect } from "vitest";
import { generateWorld } from "../../src/world/world-gen.js";
import { WATER, WATER_SURFACE } from "../../src/world/blocks.js";
import { isWater } from "../../src/world/blocks.js";
import {
  VESSELS, VESSEL_KINDS, makeVessel, sanitizeVessels, vesselsOf, waterSurfaceAt, stepVessel,
  canPlaceVessel, placementFor, nearestVessel, dismountCell, pickVessel, vesselPose, WakeTrail, MOUNT_REACH,
} from "../../src/world/vessels.js";

const DT = 1 / 60;

/**
 * A lake in a flat world (grass at z = 31): x, y in 10..69, dug to a stone
 * floor at z = 20, water in z = 21..30, so the surface cell is z = 30 and
 * the drawn surface sits at 30.875. East of it, from x = 70, a bank whose top
 * is `bankTop` (32 = one block above the water cell, level with the grass).
 */
function lake({ bankTop = 32 } = {}) {
  const w = generateWorld({ terrain: false });
  for (let y = 10; y < 70; y++) for (let x = 10; x < 70; x++) {
    for (let z = 20; z <= 31; z++) w.set(x, y, z, z === 20 ? 1 : z <= 30 ? WATER : 0);
  }
  for (let y = 0; y < 128; y++) for (let x = 70; x < 80; x++) for (let z = 21; z < 40; z++) w.set(x, y, z, z < bankTop ? 1 : 0);
  return w;
}
const SURFACE = 30 + WATER_SURFACE;

/** Run `v` for `seconds` with the same input; returns the per-frame event list. */
function run(w, v, input, seconds) {
  const events = [];
  for (let t = 0; t < seconds; t += DT) events.push(stepVessel(w, v, input, DT));
  return events;
}
const speed = (v) => Math.hypot(v.vx, v.vy);

describe("vessels: floating", () => {
  for (const kind of VESSEL_KINDS) {
    it(`a ${kind} settles with its keel its draft below the surface`, () => {
      const w = lake();
      const v = makeVessel(kind, 40.5, 40.5, SURFACE - VESSELS[kind].draft);
      run(w, v, {}, 3);
      expect(v.z).toBeCloseTo(SURFACE - VESSELS[kind].draft, 2);
      expect(Math.abs(v.vz)).toBeLessThan(0.05);
    });
  }

  it("dropped from above, splashes down and settles within two seconds", () => {
    const w = lake();
    const v = makeVessel("boat", 40.5, 40.5, 34);
    const ev = run(w, v, {}, 2);
    expect(ev.some((e) => e.splash > 0)).toBe(true);
    expect(v.z).toBeCloseTo(SURFACE - VESSELS.boat.draft, 1);
  });

  it("finds the water surface under a hull, and none on dry land", () => {
    const w = lake();
    expect(waterSurfaceAt(w, 40.5, 40.5, 30.6)).toBeCloseTo(SURFACE, 9);
    expect(waterSurfaceAt(w, 5.5, 5.5, 32)).toBeNull();
  });
});

describe("vessels: throttle and steering", () => {
  for (const kind of VESSEL_KINDS) {
    it(`a ${kind} reaches but never passes its top speed, and reverses slower`, () => {
      const w = lake();
      const k = VESSELS[kind];
      const v = makeVessel(kind, 15.5, 40.5, SURFACE - k.draft);
      let top = 0;
      for (let t = 0; t < 3; t += DT) {
        stepVessel(w, v, { throttle: 1 }, DT);
        top = Math.max(top, speed(v));
        if (v.x > 60) break;
      }
      expect(top).toBeLessThanOrEqual(k.maxSpeed + 1e-9);
      expect(top).toBeGreaterThan(k.maxSpeed * 0.8);
      const r = makeVessel(kind, 60.5, 40.5, SURFACE - k.draft);
      let back = 0;
      for (let t = 0; t < 4; t += DT) { stepVessel(w, r, { throttle: -1 }, DT); back = Math.max(back, speed(r)); }
      expect(back).toBeLessThanOrEqual(k.maxReverse + 1e-9);
      expect(k.maxReverse).toBeLessThan(k.maxSpeed);
    });
  }

  it("moves along its heading", () => {
    const w = lake();
    const v = makeVessel("boat", 40.5, 40.5, SURFACE - VESSELS.boat.draft, Math.PI / 2);
    run(w, v, { throttle: 1 }, 1);
    expect(v.y).toBeGreaterThan(42);
    expect(Math.abs(v.x - 40.5)).toBeLessThan(0.05);
  });

  it("turns right on +steer and left on -steer, the jetski fastest", () => {
    const w = lake();
    const turned = {};
    for (const kind of VESSEL_KINDS) {
      const v = makeVessel(kind, 40.5, 40.5, SURFACE - VESSELS[kind].draft);
      run(w, v, { throttle: 1, steer: 1 }, 0.5);
      expect(v.yaw).toBeGreaterThan(0);
      const u = makeVessel(kind, 40.5, 40.5, SURFACE - VESSELS[kind].draft);
      run(w, u, { throttle: 1, steer: -1 }, 0.5);
      expect(u.yaw).toBeLessThan(0);
      turned[kind] = v.yaw;
    }
    expect(turned.jetski).toBeGreaterThan(turned.boat);
    expect(turned.boat).toBeGreaterThan(turned.raft);
  });

  it("drifts on a jetski and not in a boat: sideways speed survives a hard turn", () => {
    const w = lake();
    const slip = (kind) => {
      const v = makeVessel(kind, 20.5, 40.5, SURFACE - VESSELS[kind].draft);
      run(w, v, { throttle: 1 }, 1.5);
      run(w, v, { throttle: 1, steer: 1 }, 0.4);
      const fx = Math.cos(v.yaw), fy = Math.sin(v.yaw);
      return Math.abs(-v.vx * fy + v.vy * fx) / speed(v);
    };
    expect(slip("jetski")).toBeGreaterThan(0.2);
    expect(slip("boat")).toBeLessThan(0.1);
  });

  it("coasts to a stop when the throttle is let go", () => {
    const w = lake();
    const v = makeVessel("boat", 20.5, 40.5, SURFACE - VESSELS.boat.draft);
    run(w, v, { throttle: 1 }, 1.5);
    run(w, v, {}, 6);
    expect(speed(v)).toBeLessThan(0.1);
  });
});

describe("vessels: shore and land", () => {
  it("stops at a bank and never climbs it", () => {
    for (const kind of VESSEL_KINDS) {
      const w = lake();
      const k = VESSELS[kind];
      const v = makeVessel(kind, 60.5, 40.5, SURFACE - k.draft);
      const ev = run(w, v, { throttle: 1 }, 4);
      expect(v.x + k.half).toBeLessThanOrEqual(70 + 1e-3);
      expect(v.z).toBeLessThan(SURFACE);
      expect(ev.some((e) => e.bump > 0)).toBe(true);
    }
  });

  it("a raft or boat on land does not move under its own power", () => {
    const w = lake();
    for (const kind of ["raft", "boat"]) {
      const v = makeVessel(kind, 100.5, 40.5, 32);
      run(w, v, { throttle: 1, steer: 1 }, 2);
      expect(Math.hypot(v.x - 100.5, v.y - 40.5)).toBeLessThan(1e-6);
      expect(v.z).toBeCloseTo(32, 6);
    }
  });

  it("a jetski on land crawls at no more than a block a second", () => {
    const w = lake();
    const v = makeVessel("jetski", 100.5, 40.5, 32);
    let top = 0;
    for (let t = 0; t < 3; t += DT) { stepVessel(w, v, { throttle: 1 }, DT); top = Math.max(top, speed(v)); }
    expect(top).toBeLessThanOrEqual(1 + 1e-9);
    expect(v.x).toBeGreaterThan(102);
  });

  it("falls under gravity when there is nothing under it", () => {
    const w = lake();
    const v = makeVessel("raft", 100.5, 40.5, 40);
    run(w, v, {}, 2);
    expect(v.z).toBeCloseTo(32, 6);
  });

  it("the jetski hops a one-block shore step; a boat cannot", () => {
    const w = lake();
    const j = makeVessel("jetski", 55.5, 40.5, SURFACE - VESSELS.jetski.draft);
    for (let t = 0; t < 3 && j.x < 65.5; t += DT) stepVessel(w, j, { throttle: 1 }, DT);
    run(w, j, { throttle: 1, hop: true }, 0.1);
    run(w, j, { throttle: 1 }, 1.5);
    expect(j.x).toBeGreaterThan(70.5);
    expect(j.z).toBeGreaterThanOrEqual(32 - 1e-6);
    const b = makeVessel("boat", 55.5, 40.5, SURFACE - VESSELS.boat.draft);
    run(w, b, { throttle: 1, hop: true }, 3);
    expect(b.x).toBeLessThan(70);
  });

  it("an unloaded column is solid to a hull", () => {
    const w = generateWorld({ terrain: false, endless: true, seed: 3 });
    w.loadAround(0.5, 0.5, 1);
    const v = makeVessel("jetski", 20.5, 8.5, 32);
    run(w, v, { throttle: 1 }, 30);
    expect(v.x).toBeLessThanOrEqual(32);
  });
});

describe("vessels: placing, boarding, leaving", () => {
  it("places on open water and flat ground, not in rock or on top of another", () => {
    const w = lake();
    const list = [];
    const onWater = placementFor(w, "boat", { x: 40, y: 40, z: 30, id: WATER, face: [0, 0, 1] });
    expect(onWater.z).toBeCloseTo(SURFACE - VESSELS.boat.draft, 9);
    expect(canPlaceVessel(w, list, "boat", onWater.x, onWater.y, onWater.z)).toBe(true);
    const onGround = placementFor(w, "raft", { x: 100, y: 40, z: 31, id: 11, face: [0, 0, 1] });
    expect(onGround).toMatchObject({ x: 100.5, y: 40.5, z: 32 });
    expect(canPlaceVessel(w, list, "raft", onGround.x, onGround.y, onGround.z)).toBe(true);
    expect(placementFor(w, "raft", { x: 100, y: 40, z: 31, id: 11, face: [1, 0, 0] })).toBeNull();
    expect(canPlaceVessel(w, list, "boat", 100.5, 40.5, 30)).toBe(false); // in the ground
    list.push(makeVessel("boat", onWater.x, onWater.y, onWater.z));
    expect(canPlaceVessel(w, list, "raft", onWater.x + 1, onWater.y, onWater.z)).toBe(false);
    expect(canPlaceVessel(w, list, "raft", onWater.x + 5, onWater.y, onWater.z)).toBe(true);
  });

  it("boards only a vessel within reach, the nearest first", () => {
    const a = makeVessel("boat", 10, 10, 30), b = makeVessel("raft", 12, 10, 30);
    expect(nearestVessel([a, b], 11.6, 10, 30)).toBe(b);
    expect(nearestVessel([a, b], 10, 10 + MOUNT_REACH + 0.2, 30)).toBeNull();
    expect(nearestVessel([a, b], 10, 10, 36)).toBeNull();
  });

  it("leaves onto dry land when some is near, and into the water beside the hull otherwise", () => {
    const w = lake();
    const near = makeVessel("boat", 67.5, 40.5, SURFACE - VESSELS.boat.draft);
    const d = dismountCell(w, near);
    expect(d.dry).toBe(true);
    expect(d.x).toBeGreaterThanOrEqual(70);
    expect(d.z).toBe(32);
    expect(isWater(w.get(Math.floor(d.x), Math.floor(d.y), d.z))).toBe(false);
    const far = makeVessel("boat", 40.5, 40.5, SURFACE - VESSELS.boat.draft);
    const s = dismountCell(w, far);
    expect(s.dry).toBe(false);
    expect(isWater(w.get(Math.floor(s.x), Math.floor(s.y), Math.floor(s.z)))).toBe(true);
    expect(Math.hypot(s.x - 40.5, s.y - 40.5)).toBeLessThan(2);
  });

  it("picks the nearest hull along a ray", () => {
    const a = makeVessel("boat", 10.5, 0.5, 30), b = makeVessel("raft", 20.5, 0.5, 30);
    const hit = pickVessel([b, a], 0, 0.5, 30.3, 1, 0, 0, 30);
    expect(hit.vessel).toBe(a);
    expect(hit.dist).toBeCloseTo(10.5 - VESSELS.boat.half, 9);
    expect(pickVessel([a], 0, 5, 30.3, 1, 0, 0, 30)).toBeNull();
    expect(pickVessel([b], 0, 0.5, 30.3, 1, 0, 0, 5)).toBeNull();
  });
});

describe("vessels: saved form", () => {
  it("keeps good vessels, drops bad ones, and starts them at rest", () => {
    const list = sanitizeVessels([
      { id: 1, kind: "boat", x: 1.5, y: 2.5, z: 30, yaw: 1, vx: 4, vy: 1, vz: 2, spin: 1 },
      { id: 2, kind: "submarine", x: 1, y: 1, z: 1, yaw: 0 },
      { id: 3, kind: "raft", x: NaN, y: 1, z: 1, yaw: 0 },
      null,
      { kind: "jetski", x: 5, y: 5, z: 40, yaw: 0 },
    ]);
    expect(list.map((v) => v.kind)).toEqual(["boat", "jetski"]);
    expect(list[0]).toMatchObject({ id: 1, x: 1.5, y: 2.5, z: 30, yaw: 1, vx: 0, vy: 0, vz: 0, spin: 0 });
    expect(list[1].id).not.toBe(1);
    expect(sanitizeVessels("nope")).toEqual([]);
  });

  it("lives in meta.vessels", () => {
    const w = lake();
    expect(vesselsOf(w)).toBe(w.meta.vessels);
    vesselsOf(w).push(makeVessel("raft", 1, 1, 1));
    expect(w.meta.vessels.length).toBe(1);
  });
});

describe("vessels: look", () => {
  it("bobs a little on the water, sits still on land, and leans into a turn", () => {
    const v = makeVessel("jetski", 40.5, 40.5, 30.6);
    v.floating = true;
    let lo = Infinity, hi = -Infinity;
    for (let t = 0; t < 10; t += 0.05) { const p = vesselPose(v, t); lo = Math.min(lo, p.dz); hi = Math.max(hi, p.dz); }
    expect(hi - lo).toBeGreaterThan(0.01);
    expect(hi - lo).toBeLessThan(0.15);
    v.spin = 2;
    expect(vesselPose(v, 0).roll).toBeGreaterThan(0.05);
    v.floating = false; v.spin = 0;
    expect(vesselPose(v, 3)).toEqual({ dz: 0, pitch: 0, roll: 0 });
  });

  it("a wake appears only at speed, stays under its cap and fades", () => {
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const wake = new WakeTrail(rand);
    const slow = { kind: "jetski", x: 0, y: 0, z: 30, yaw: 0, vx: 2, vy: 0, floating: true };
    for (let i = 0; i < 60; i++) wake.update(DT, [slow]);
    expect(wake.count).toBe(0);
    const fast = { ...slow, vx: 13 };
    for (let i = 0; i < 600; i++) { fast.x += fast.vx * DT; wake.update(DT, [fast]); }
    expect(wake.count).toBeGreaterThan(20);
    expect(wake.count).toBeLessThanOrEqual(WakeTrail.MAX);
    for (const p of wake.sprites()) expect(p.x).toBeLessThan(fast.x);
    for (let i = 0; i < 300; i++) wake.update(DT, []);
    expect(wake.count).toBe(0);
  });
});
