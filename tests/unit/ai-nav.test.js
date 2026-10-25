import { describe, it, expect } from "vitest";
import { buildNavField, navAngle, navSteps, leadPoint, NavFields } from "../../src/systems/ai-nav.js";
import { AISystem, callOut } from "../../src/systems/ai.js";
import { Enemy } from "../../js/entities.js";

const DT = 1 / 60;

/** A 20x20 room with a wall down the middle (x = 10) open only at the top (y = 1). */
function walledMap() {
  const size = 20;
  const grid = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => (x === 0 || y === 0 || x === size - 1 || y === size - 1 ? 1 : 0)),
  );
  for (let y = 2; y < size - 1; y++) grid[y][10] = 1;
  return { width: size, height: size, grid };
}

const audio = { calculatePan: () => 0, enemyShoot: () => {}, enemyHit: () => {}, enemyBark: () => {}, telegraph: () => {} };

function ctx(entities, player, map, time, extra = {}) {
  return { entities, player, map, time, timeScale: 1, projectiles: [], chronoBombs: [], damageNumbers: [], audio, ...extra };
}

function run(ai, entities, player, map, ticks, extra = {}, t0 = 0) {
  let time = t0;
  const projectiles = [];
  for (let i = 0; i < ticks; i++) {
    time += DT * 1000;
    ai.update({ ...ctx(entities, player, map, time, extra), projectiles }, DT);
  }
  return { time, projectiles };
}

describe("navigation field", () => {
  it("routes around a wall instead of into it", () => {
    const map = walledMap();
    const f = buildNavField(map, 15.5, 15.5);
    // From the left half the only way is up and over the gap at the top.
    expect(navSteps(f, 5.5, 15.5)).toBeGreaterThan(20);
    const a = navAngle(f, 5.5, 15.5);
    expect(Math.sin(a)).toBeLessThan(0); // heads north, toward the gap
  });

  it("knows when there is no way there", () => {
    const map = walledMap();
    map.grid[1][10] = 1; // close the gap
    const f = buildNavField(map, 15.5, 15.5);
    expect(navSteps(f, 5.5, 15.5)).toBe(-1);
    expect(navAngle(f, 5.5, 15.5)).toBeNull();
  });

  it("shares one search between enemies heading to the same cell", () => {
    const map = walledMap();
    const nav = new NavFields();
    expect(nav.get(map, 15.2, 15.7, 0)).toBe(nav.get(map, 15.9, 15.1, 0.1));
    expect(nav.get(map, 15.2, 15.7, 0)).not.toBe(nav.get(map, 15.2, 15.7, 1)); // stale after its TTL
  });
});

describe("leadPoint", () => {
  it("aims ahead of a moving target, part of the way", () => {
    const p = leadPoint(0, 0, 10, 0, 0, 4, 10, 0.5);
    // 1 s of flight at 10 u/s; half of 4 u/s of sideways motion.
    expect(p.x).toBeCloseTo(10);
    expect(p.y).toBeCloseTo(2);
  });

  it("aims straight at a target standing still", () => {
    expect(leadPoint(0, 0, 10, 0, 0, 0, 10)).toEqual({ x: 10, y: 0 });
  });
});

describe("enemies that hunt", () => {
  it("come round a wall to a player they cannot see", () => {
    const map = walledMap();
    const e = new Enemy(5.5, 15.5, "henchman");
    e.state = "chase";
    const player = { x: 15.5, y: 15.5, angle: 0, chronoActive: false };
    const before = Math.hypot(player.x - e.x, player.y - e.y);
    run(new AISystem(), [e], player, map, 60 * 25, { hunt: true });
    expect(e.x).toBeGreaterThan(10); // it made it through the gap
    expect(Math.hypot(player.x - e.x, player.y - e.y)).toBeLessThan(before);
  });

  it("go to where they last saw you, search, and give up", () => {
    const map = walledMap();
    const e = new Enemy(5.5, 15.5, "henchman");
    e.state = "chase";
    e._lastSeen = { x: 6.5, y: 15.5 }; // you ducked away just here
    const player = { x: 15.5, y: 15.5, angle: 0, chronoActive: false };
    const ai = new AISystem();
    run(ai, [e], player, map, 60 * 2);
    expect(e.state).toBe("search");
    expect(e.x).toBeLessThan(10); // it did not track you through the wall
    run(ai, [e], player, map, 60 * 5, {}, 2000);
    expect(e.state).toBe("idle");
  });
});

describe("alerts", () => {
  it("an enemy that spots you calls in its idle neighbours", () => {
    const map = walledMap();
    const spotter = new Enemy(14.5, 10.5, "henchman");
    const buddy = new Enemy(16.5, 10.5, "henchman");
    const player = { x: 14.5, y: 16.5, angle: 0, chronoActive: false };
    callOut(spotter, [spotter, buddy], map, 0, player);
    expect(buddy._alertAt).toBeGreaterThan(0);
    // A beat later it is on its way.
    buddy.alertRange = 1; // too short-sighted to spot you itself
    run(new AISystem(), [buddy], player, map, 60);
    expect(buddy.state).toBe("chase");
  });

  it("gunfire brings idle enemies in earshot, through walls", () => {
    const map = walledMap();
    const e = new Enemy(5.5, 15.5, "henchman");
    const player = { x: 13.5, y: 15.5, angle: 0, chronoActive: false };
    const ai = new AISystem();
    run(ai, [e], player, map, 1, { noise: { x: 13.5, y: 15.5, radius: 12 } });
    run(ai, [e], player, map, 60, {}, 20);
    expect(e.state).toBe("chase");
    expect(e._lastSeen).toEqual({ x: 13.5, y: 15.5 });
  });

  it("training targets with no sight ignore it all", () => {
    const map = walledMap();
    const dummy = new Enemy(5.5, 15.5, "drone");
    dummy.alertRange = 0;
    const player = { x: 6.5, y: 15.5, angle: 0, chronoActive: false };
    callOut(new Enemy(5.5, 14.5, "drone"), [dummy], map, 0, player);
    expect(dummy._alertAt).toBeUndefined();
  });
});

describe("leading shots", () => {
  it("a ranged enemy aims ahead of a strafing player", () => {
    const map = { width: 30, height: 30, grid: Array.from({ length: 30 }, () => new Array(30).fill(0)) };
    const e = new Enemy(5.5, 15.5, "henchman");
    e.state = "chase";
    e.lastAttackTime = -1e9;
    const player = { x: 12.5, y: 15.5, angle: 0, chronoActive: false };
    const ai = new AISystem();
    let time = 0;
    let shot = null;
    for (let i = 0; i < 240 && !shot; i++) {
      player.y += 4 * DT; // strafing south at 4 u/s
      time += DT * 1000;
      const projectiles = [];
      ai.update({ ...ctx([e], player, map, time), projectiles }, DT);
      shot = projectiles[0] ?? null;
    }
    expect(shot).not.toBeNull();
    const aimed = Math.atan2(shot.dirY, shot.dirX);
    const direct = Math.atan2(player.y - e.y, player.x - e.x);
    expect(aimed).toBeGreaterThan(direct + 0.02); // ahead, toward where you are going
  });
});

describe("chrono shift slows enemy abilities", () => {
  it("a summoner's clock runs on enemy time", () => {
    const map = { width: 20, height: 20, grid: Array.from({ length: 20 }, () => new Array(20).fill(0)) };
    const e = new Enemy(10, 10, "drone");
    e.def = { ...e.def, summonType: "drone", summonInterval: 1000, summonMax: 3 };
    e.chronoMultiplier = 0.15;
    e.state = "idle";
    e.alertRange = 0;
    const player = { x: 2, y: 2, angle: 0, chronoActive: true };
    const ai = new AISystem();
    run(ai, [e], player, map, 60);
    expect(e._summonTimer).toBeLessThan(200); // 1 s of real time is 0.15 s for it
  });
});
