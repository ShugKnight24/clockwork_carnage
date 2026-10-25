import { describe, it, expect } from "vitest";
import {
  isFrozen,
  holdOffFrozen,
  stillnessAt,
  hushCutoff,
  echoAt,
  FROZEN_BODY,
  FROZEN_SETTLE_S,
  HUSH_NEAR,
  HUSH_FAR,
  FROZEN_PROP_TYPES,
} from "../../src/systems/stillness.js";
import { Npc, setNpcWorld } from "../../js/npc.js";
import { Prop } from "../../js/entities.js";
import { PlayerUpdateSystem } from "../../src/systems/player-update.js";

function stopped(x = 5, y = 5) {
  const n = new Npc(x, y, "clerk");
  n.freeze();
  return n;
}

describe("isFrozen", () => {
  it("is true for a frozen person and a settled frozen pose, not for anyone else", () => {
    expect(isFrozen(stopped())).toBe(true);
    const posed = new Npc(1, 1, "staff");
    posed.pose("frozen", Infinity);
    // Still easing into the pose: drawn the ordinary way for that moment.
    expect(isFrozen(posed)).toBe(false);
    posed.update(FROZEN_SETTLE_S + 0.01);
    expect(isFrozen(posed)).toBe(true);
    const walker = new Npc(1, 1, "officer");
    expect(isFrozen(walker)).toBe(false);
    walker.pose("salute", Infinity);
    walker.update(1);
    expect(isFrozen(walker)).toBe(false);
    expect(isFrozen({ type: "enemy", frozen: true })).toBe(false);
  });

  it("is false once they are gone", () => {
    const n = stopped();
    n.active = false;
    expect(isFrozen(n)).toBe(false);
  });
});

describe("Npc.freeze", () => {
  it("holds them where they stand: no turning, no route, no step settling", () => {
    setNpcWorld(null);
    const n = new Npc(5, 5, "clerk", { angle: 0.3 });
    n.stride = 0.37;
    n.faceTo({ x: 0, y: 0 });
    n.freeze();
    for (let i = 0; i < 120; i++) n.update(1 / 60);
    expect(n.angle).toBe(0.3);
    expect(n.stride).toBe(0.37);
    expect([n.x, n.y]).toEqual([5, 5]);
    n.walk([[8, 5]]);
    for (let i = 0; i < 60; i++) n.update(1 / 60);
    expect([n.x, n.y]).toEqual([5, 5]);
    expect(n.gesture).toBe("frozen");
  });

  it("turns them once if asked, and thaw lets them walk again", () => {
    const n = new Npc(5, 5, "staff", { angle: 0 });
    n.freeze({ face: { x: 5, y: 9 } });
    expect(n.angle).toBeCloseTo(Math.PI / 2);
    n.thaw();
    expect(isFrozen(n)).toBe(false);
    n.walk([[5, 6]]);
    for (let i = 0; i < 200; i++) n.update(1 / 60);
    expect(n.y).toBeCloseTo(6, 1);
  });
});

describe("holdOffFrozen", () => {
  it("puts a player who walked into them back on the edge, and never moves them", () => {
    const n = stopped(5, 5);
    const p = { x: 5.2, y: 5 };
    expect(holdOffFrozen([n], p, 4, 5)).toBe(true);
    expect(Math.hypot(p.x - 5, p.y - 5)).toBeCloseTo(FROZEN_BODY);
    expect([n.x, n.y]).toEqual([5, 5]);
  });

  it("leaves the player alone outside their body, and ignores the unfrozen", () => {
    const p = { x: 6, y: 5 };
    expect(holdOffFrozen([stopped(5, 5)], p)).toBe(false);
    const walker = new Npc(5, 5, "officer");
    const q = { x: 5.1, y: 5 };
    expect(holdOffFrozen([walker], q)).toBe(false);
    expect(q.x).toBe(5.1);
  });

  it("is what the player's movement runs: walking straight at one stops short of them", () => {
    const sys = new PlayerUpdateSystem();
    const grid = Array.from({ length: 12 }, () => new Array(12).fill(0));
    const n = stopped(6.5, 5.5);
    const p = { x: 5.5, y: 5.5 };
    for (let i = 0; i < 60; i++) sys._applyMove({ player: p, map: { grid }, entities: [n] }, 0.05, 0, 1 / 60, null);
    expect(p.x).toBeLessThanOrEqual(6.5 - FROZEN_BODY + 1e-9);
    expect([n.x, n.y]).toEqual([6.5, 5.5]);
  });
});

describe("stillnessAt", () => {
  it("is full beside a frozen person, none past HUSH_FAR, and rises in between", () => {
    const list = [stopped(0, 0)];
    expect(stillnessAt(list, HUSH_NEAR * 0.5, 0)).toBe(1);
    expect(stillnessAt(list, HUSH_FAR + 0.01, 0)).toBe(0);
    const a = stillnessAt(list, 2.2, 0);
    const b = stillnessAt(list, 1.4, 0);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    expect(b).toBeLessThan(1);
  });

  it("counts the stopped props and ignores a held round", () => {
    for (const kind of FROZEN_PROP_TYPES) expect(stillnessAt([new Prop(0, 0, kind)], 0.5, 0)).toBe(1);
    expect(stillnessAt([new Prop(0, 0, "desk")], 0.5, 0)).toBe(0);
    expect(stillnessAt([{ type: "projectile", frozen: true, active: true, x: 0, y: 0 }], 0.5, 0)).toBe(0);
    expect(stillnessAt([], 0, 0)).toBe(0);
  });
});

describe("hushCutoff", () => {
  it("is open at 0 and closes to 900 Hz at 1, steadily", () => {
    expect(hushCutoff(0)).toBe(20000);
    expect(hushCutoff(1)).toBeCloseTo(900);
    expect(hushCutoff(0.5)).toBeLessThan(hushCutoff(0.25));
  });
});

describe("echoAt", () => {
  it("steps out over the cycle, is gone at the snap back, and repeats each second", () => {
    const at = (t) => ({ ...echoAt(t, 0) });
    expect(at(0).step).toBe(0);
    expect(at(0).alpha).toBe(0);
    expect(at(300).step).toBeGreaterThan(at(100).step);
    expect(at(700).step).toBe(1);
    expect(at(999).alpha).toBeLessThan(0.01);
    expect(at(1400)).toEqual(at(400));
    // Two people are out of step with each other.
    expect(echoAt(400, 1).step).not.toBe(echoAt(400, 2).step);
  });
});
