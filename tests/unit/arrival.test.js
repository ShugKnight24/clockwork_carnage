import { describe, it, expect } from "vitest";
import {
  arrive,
  updateArrivals,
  pendingArrivals,
  clearArrivals,
  inViewOrNear,
  telegraphK,
  ARRIVALS,
  ARMED_AFTER,
  LINGER,
  QUICK_TEAR,
} from "../../src/systems/arrival.js";
import { AISystem, ACQUIRE_SECONDS } from "../../src/systems/ai.js";
import { Enemy } from "../../js/entities.js";

const DT = 1 / 60;

function openMap(size = 20) {
  return { width: size, height: size, grid: Array.from({ length: size }, () => new Array(size).fill(0)) };
}

const audio = { calculatePan: () => 0, enemyShoot: () => {}, enemyHit: () => {}, telegraph: () => {} };

function fakeGame() {
  return { map: openMap(), player: { x: 10, y: 10, angle: 0, chronoActive: false }, entities: [], time: 0, audio: null };
}

/** Advance the game's clock and arrivals by `seconds` in DT steps. */
function run(game, seconds, each = null) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) {
    game.time += DT * 1000;
    updateArrivals(game, DT);
    each?.(game);
  }
}

describe("arrive", () => {
  it("makes the enemy at once but keeps it out of the world through the telegraph", () => {
    const game = fakeGame();
    let made = 0;
    const a = arrive(game, { x: 13, y: 10, make: (x, y) => (made++, new Enemy(x, y, "drone")) });
    expect(made).toBe(1);
    expect(a.enemy.enemyType).toBe("drone");
    expect(a.phase).toBe("telegraph");
    expect(game.entities).toEqual([]);
    run(game, ARRIVALS.tear.telegraph - 0.05);
    expect(game.entities).toEqual([]);
    expect(telegraphK(a)).toBeGreaterThan(0.9);
  });

  it("steps out of the tear toward the player and ends where it was asked to", () => {
    const game = fakeGame();
    const a = arrive(game, { x: 13, y: 10, make: (x, y) => new Enemy(x, y, "drone") });
    // The tear hangs a step behind the mark, on the far side from the player.
    expect(a.tx).toBeGreaterThan(13);
    run(game, ARRIVALS.tear.telegraph + 0.02);
    expect(game.entities).toContain(a.enemy);
    expect(a.phase).toBe("step");
    expect(a.enemy._arriving).toBe(true);
    expect(a.enemy.renderAlpha).toBeLessThan(1);
    run(game, ARRIVALS.tear.step);
    expect(a.phase).toBe("done");
    expect(a.enemy._arriving).toBe(false);
    expect(a.enemy.renderAlpha).toBe(1);
    expect(a.enemy.x).toBeCloseTo(13);
    expect(a.enemy.y).toBeCloseTo(10);
  });

  it("drops out of a vent from above and lands on its mark", () => {
    const game = fakeGame();
    const a = arrive(game, { x: 12, y: 12, via: "vent", make: (x, y) => new Enemy(x, y, "drone") });
    run(game, ARRIVALS.vent.telegraph + 0.02);
    expect(a.phase).toBe("step");
    expect(a.enemy.liftZ).toBeGreaterThan(0.4);
    run(game, ARRIVALS.vent.step);
    expect(a.enemy.liftZ).toBe(0);
    expect([a.enemy.x, a.enemy.y]).toEqual([12, 12]);
  });

  it("lets a lift's enemy straight in, armed a moment later", () => {
    const game = fakeGame();
    game.time = 5000;
    const a = arrive(game, { x: 12, y: 12, via: "lift", make: (x, y) => new Enemy(x, y, "drone") });
    expect(a.phase).toBe("done");
    expect(game.entities).toContain(a.enemy);
    expect(a.enemy._armedAt).toBe(5000 + ARMED_AFTER * 1000);
  });

  it("waits out a delay before the telegraph starts, and accepts a short tear", () => {
    const game = fakeGame();
    const a = arrive(game, { x: 12, y: 12, delay: 0.3, telegraph: QUICK_TEAR, make: (x, y) => new Enemy(x, y, "drone") });
    expect(a.phase).toBe("wait");
    run(game, 0.25);
    expect(a.phase).toBe("wait");
    run(game, 0.1 + QUICK_TEAR);
    expect(a.phase).not.toBe("telegraph");
    expect(game.entities).toContain(a.enemy);
  });

  it("forgets a finished arrival after its scar fades", () => {
    const game = fakeGame();
    const a = arrive(game, { x: 12, y: 12, make: (x, y) => new Enemy(x, y, "drone") });
    run(game, ARRIVALS.tear.telegraph + ARRIVALS.tear.step + LINGER + 0.1);
    expect(game.arrivals).toEqual([]);
    expect(a.enemy._arrival).toBe(null);
    expect(game.entities).toContain(a.enemy);
  });

  it("drops an arrival from a level the player has left", () => {
    const game = fakeGame();
    arrive(game, { x: 12, y: 12, make: (x, y) => new Enemy(x, y, "drone") });
    game.map = openMap();
    run(game, 3);
    expect(game.entities).toEqual([]);
    expect(game.arrivals).toEqual([]);
  });
});

describe("pendingArrivals and clearArrivals", () => {
  it("count those not yet out, keep their number when they step out, and clear", () => {
    const game = fakeGame();
    for (let i = 0; i < 3; i++) arrive(game, { x: 12 + i, y: 12, delay: i * 0.15, make: (x, y) => Object.assign(new Enemy(x, y, "drone"), { _teach: i < 2 }) });
    expect(pendingArrivals(game)).toBe(3);
    expect(pendingArrivals(game, (e) => e._teach)).toBe(2);
    run(game, ARRIVALS.tear.telegraph + 0.05);
    // The first is out; the staggered ones are still coming.
    expect(pendingArrivals(game)).toBe(2);
    expect(game.entities.length + pendingArrivals(game)).toBe(3);
    clearArrivals(game);
    expect(pendingArrivals(game)).toBe(0);
  });
});

describe("inViewOrNear", () => {
  const p = { x: 10, y: 10, angle: 0 };
  it("is true close by, in any direction", () => {
    expect(inViewOrNear(p, 7, 10)).toBe(true);
  });
  it("is true far off in the view cone and false far off behind", () => {
    expect(inViewOrNear(p, 30, 11)).toBe(true);
    expect(inViewOrNear(p, -12, 10)).toBe(false);
  });
});

describe("damage gating", () => {
  /** A melee enemy arriving right beside the player; AI and arrivals run together. */
  function scene(type) {
    const game = fakeGame();
    game.player = { x: 10, y: 10, angle: 0, chronoActive: false, health: 100 };
    const ai = new AISystem();
    const a = arrive(game, {
      x: 10.8,
      y: 10,
      make: (x, y) => {
        const e = new Enemy(x, y, type);
        e.state = "chase";
        e.lastAttackTime = -1e9;
        return e;
      },
    });
    const hits = [];
    let firstHitAt = null;
    let windupAt = null;
    const step = (g) => {
      const fx = ai.update(
        { entities: g.entities, player: g.player, map: g.map, time: g.time, timeScale: 1, projectiles: [], chronoBombs: [], damageNumbers: [], audio },
        DT,
      );
      if (windupAt == null && a.enemy.state === "windup") windupAt = g.time / 1000;
      if (fx.damagePlayerCalls.length && firstHitAt == null) firstHitAt = g.time / 1000;
      hits.push(...fx.damagePlayerCalls);
    };
    return { game, a, hits, step, firstHitAt: () => firstHitAt, windupAt: () => windupAt };
  }

  it("starts no attack while telegraphing or stepping out, nor for ARMED_AFTER once out", () => {
    const s = scene("glitchling");
    const out = ARRIVALS.tear.telegraph + ARRIVALS.tear.step;
    run(s.game, out + ARMED_AFTER - 0.05, s.step);
    expect(s.hits).toEqual([]);
    expect(s.windupAt()).toBe(null);
  });

  it("does attack after that, so the gate holds rather than disarms", () => {
    const s = scene("glitchling");
    const out = ARRIVALS.tear.telegraph + ARRIVALS.tear.step;
    run(s.game, out + ARMED_AFTER + 3, s.step);
    expect(s.windupAt()).toBeGreaterThanOrEqual(out + ARMED_AFTER - DT);
    expect(s.hits.length).toBeGreaterThan(0);
  });

  it("a rifle aims from scratch once out: its acquire time comes on top", () => {
    const s = scene("corruptCop");
    const out = ARRIVALS.tear.telegraph + ARRIVALS.tear.step;
    run(s.game, out + ARMED_AFTER + ACQUIRE_SECONDS[0] - 0.05, s.step);
    expect(s.windupAt()).toBe(null);
  });

  it("is not moved by the AI while stepping out", () => {
    const s = scene("glitchling");
    run(s.game, ARRIVALS.tear.telegraph + 0.1, s.step);
    const k = (s.game.time / 1000 - ARRIVALS.tear.telegraph) / ARRIVALS.tear.step;
    const eased = k * k * (3 - 2 * k);
    expect(s.a.enemy.x).toBeCloseTo(s.a.tx + (s.a.x - s.a.tx) * eased, 1);
  });
});
