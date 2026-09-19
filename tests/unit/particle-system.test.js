import { describe, it, expect, beforeEach } from "vitest";
import {
  spawnPickupBurst,
  spawnSmoke,
  spawnEnergyBurst,
  spawnDebris,
  updateParticles,
  updateDustMotes,
} from "../../js/particle-system.js";

// ── helpers ──
const makePlayer = (x = 5, y = 5) => ({ x, y });

describe("spawnPickupBurst", () => {
  it("spawns 10 particles by default", () => {
    const ps = [];
    spawnPickupBurst(ps, 3, 4, "health");
    expect(ps).toHaveLength(10);
  });

  it("sets health color (green-ish)", () => {
    const ps = [];
    spawnPickupBurst(ps, 0, 0, "health");
    // base green: r=50, g=255, b=80 with random noise
    expect(ps[0].g).toBe(255);
    expect(ps[0].b).toBe(80);
  });

  it("sets ammo color (yellow-ish)", () => {
    const ps = [];
    spawnPickupBurst(ps, 0, 0, "ammo");
    expect(ps[0].g).toBe(220);
  });

  it("sets weapon color (blue-ish)", () => {
    const ps = [];
    spawnPickupBurst(ps, 0, 0, "weapon");
    expect(ps[0].g).toBe(200);
  });

  it("particles have required fields", () => {
    const ps = [];
    spawnPickupBurst(ps, 1, 2, "health");
    const p = ps[0];
    expect(p.x).toBe(1);
    expect(p.y).toBe(2);
    expect(p).toHaveProperty("z");
    expect(p).toHaveProperty("vx");
    expect(p).toHaveProperty("vy");
    expect(p).toHaveProperty("vz");
    expect(p).toHaveProperty("life");
    expect(p).toHaveProperty("size");
  });
});

describe("spawnSmoke", () => {
  it("spawns 8 particles by default", () => {
    const ps = [];
    spawnSmoke(ps, 3, 4);
    expect(ps).toHaveLength(8);
  });

  it("respects count override", () => {
    const ps = [];
    spawnSmoke(ps, 0, 0, { count: 3 });
    expect(ps).toHaveLength(3);
  });

  it("tags particles as smoke", () => {
    const ps = [];
    spawnSmoke(ps, 0, 0);
    expect(ps[0]._type).toBe("smoke");
  });

  it("uses gray-ish default color", () => {
    const ps = [];
    spawnSmoke(ps, 0, 0);
    // base: r=120, g=115, b=110 ± 20
    for (const p of ps) {
      expect(p.r).toBeGreaterThanOrEqual(80);
      expect(p.r).toBeLessThanOrEqual(160);
    }
  });

  it("accepts custom color", () => {
    const ps = [];
    spawnSmoke(ps, 0, 0, { r: 200, g: 50, b: 50, count: 1 });
    // base 200 ± 20 noise
    expect(ps[0].r).toBeGreaterThanOrEqual(160);
  });

  it("has slow upward velocity", () => {
    const ps = [];
    spawnSmoke(ps, 0, 0);
    for (const p of ps) {
      expect(p.vz).toBeLessThan(0); // negative z = upward
    }
  });
});

describe("spawnEnergyBurst", () => {
  it("spawns 12 particles by default", () => {
    const ps = [];
    spawnEnergyBurst(ps, 0, 0);
    expect(ps).toHaveLength(12);
  });

  it("tags particles as energy", () => {
    const ps = [];
    spawnEnergyBurst(ps, 0, 0, { count: 1 });
    expect(ps[0]._type).toBe("energy");
  });

  it("has high velocity", () => {
    const ps = [];
    spawnEnergyBurst(ps, 0, 0);
    const avgSpeed = ps.reduce((s, p) => s + Math.sqrt(p.vx ** 2 + p.vy ** 2), 0) / ps.length;
    expect(avgSpeed).toBeGreaterThan(2);
  });

  it("supports directional angle", () => {
    const ps = [];
    spawnEnergyBurst(ps, 0, 0, { angle: 0, count: 20 });
    // all particles should be mostly rightward (cos(0) = 1)
    const rightward = ps.filter(p => p.vx > 0).length;
    expect(rightward).toBeGreaterThan(ps.length * 0.6);
  });

  it("has short default life", () => {
    const ps = [];
    spawnEnergyBurst(ps, 0, 0);
    for (const p of ps) {
      expect(p.life).toBeLessThan(0.6);
    }
  });
});

describe("spawnDebris", () => {
  it("spawns 6 particles by default", () => {
    const ps = [];
    spawnDebris(ps, 0, 0);
    expect(ps).toHaveLength(6);
  });

  it("tags particles as debris", () => {
    const ps = [];
    spawnDebris(ps, 0, 0, { count: 1 });
    expect(ps[0]._type).toBe("debris");
  });

  it("has strong upward initial velocity", () => {
    const ps = [];
    spawnDebris(ps, 0, 0);
    for (const p of ps) {
      expect(p.vz).toBeLessThan(-2);
    }
  });

  it("uses dark earthy colors by default", () => {
    const ps = [];
    spawnDebris(ps, 0, 0);
    for (const p of ps) {
      expect(p.r).toBeLessThan(180);
      expect(p.g).toBeLessThan(160);
    }
  });
});

describe("updateParticles", () => {
  it("advances particle positions", () => {
    const ps = [{ x: 0, y: 0, z: 0, vx: 1, vy: 2, vz: -1, life: 1, size: 0.05 }];
    updateParticles(ps, 0.1, 1, null, makePlayer());
    expect(ps[0].x).toBeCloseTo(0.1);
    expect(ps[0].y).toBeCloseTo(0.2);
  });

  it("removes dead particles", () => {
    const ps = [{ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0.05, size: 0.05 }];
    updateParticles(ps, 0.1, 1, null, makePlayer());
    expect(ps).toHaveLength(0);
  });

  it("applies timeScale", () => {
    const ps1 = [{ x: 0, y: 0, z: 0, vx: 1, vy: 0, vz: 0, life: 1, size: 0.05 }];
    const ps2 = [{ x: 0, y: 0, z: 0, vx: 1, vy: 0, vz: 0, life: 1, size: 0.05 }];
    updateParticles(ps1, 0.1, 1, null, makePlayer());
    updateParticles(ps2, 0.1, 0.5, null, makePlayer());
    expect(ps1[0].x).toBeGreaterThan(ps2[0].x);
  });

  it("bounces particles off floor", () => {
    const ps = [{ x: 0, y: 0, z: 0.47, vx: 0, vy: 0, vz: 5, life: 1, size: 0.05 }];
    updateParticles(ps, 0.1, 1, null, makePlayer());
    expect(ps[0].z).toBeLessThanOrEqual(0.48);
    expect(ps[0].vz).toBeLessThan(0); // bounced upward
  });

  it("applies stronger gravity to debris", () => {
    const normal = [{ x: 0, y: 0, z: -0.3, vx: 0, vy: 0, vz: 0, life: 1, size: 0.05 }];
    const debris = [{ x: 0, y: 0, z: -0.3, vx: 0, vy: 0, vz: 0, life: 1, size: 0.05, _type: "debris" }];
    // run 2 frames so gravity difference accumulates into position
    updateParticles(normal, 0.1, 1, null, makePlayer());
    updateParticles(normal, 0.1, 1, null, makePlayer());
    updateParticles(debris, 0.1, 1, null, makePlayer());
    updateParticles(debris, 0.1, 1, null, makePlayer());
    // debris falls faster (higher z = lower in world)
    expect(debris[0].z).toBeGreaterThan(normal[0].z);
  });

  it("expands smoke particles", () => {
    const ps = [{ x: 0, y: 0, z: -0.3, vx: 0, vy: 0, vz: 0, life: 1, size: 0.05, _type: "smoke" }];
    updateParticles(ps, 0.1, 1, null, makePlayer());
    expect(ps[0].size).toBeGreaterThan(0.05);
  });

  it("shrinks energy particles", () => {
    const ps = [{ x: 0, y: 0, z: -0.3, vx: 0, vy: 0, vz: 0, life: 1, size: 0.05, _type: "energy" }];
    updateParticles(ps, 0.1, 1, null, makePlayer());
    expect(ps[0].size).toBeLessThan(0.05);
  });
});

describe("updateDustMotes", () => {
  it("lazy-initializes 35 motes on first call", () => {
    const motes = updateDustMotes(null, 0.016, makePlayer());
    expect(motes).toHaveLength(35);
  });

  it("preserves existing motes", () => {
    const motes = updateDustMotes(null, 0.016, makePlayer());
    const motes2 = updateDustMotes(motes, 0.016, makePlayer());
    expect(motes2).toBe(motes); // same ref
    expect(motes2).toHaveLength(35);
  });

  it("wraps motes around player position", () => {
    const player = makePlayer(100, 100);
    const motes = [{ x: 120, y: 100, z: 0, vx: 0, vy: 0, vz: 0 }];
    updateDustMotes(motes, 0.016, player);
    expect(motes[0].x).toBeLessThan(110); // wrapped back
  });

  it("clamps z height", () => {
    const motes = [{ x: 5, y: 5, z: -2, vx: 0, vy: 0, vz: -1 }];
    updateDustMotes(motes, 0.016, makePlayer());
    expect(motes[0].z).toBeGreaterThanOrEqual(-0.9);
  });
});
