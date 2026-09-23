import { describe, it, expect } from "vitest";
import { AISystem, attackWindupMs } from "../../src/systems/ai.js";
import { Enemy } from "../../js/entities.js";
import { ENEMY_TYPES } from "../../src/data/enemies.js";
import {
  ENEMY_MELEE_WINDUP_MS,
  ENEMY_RANGED_WINDUP_MS,
} from "../../src/constants.js";

const DT = 1 / 60;

// Open 20x20 room — no walls between enemy and player.
function openMap() {
  const size = 20;
  const grid = Array.from({ length: size }, () => new Array(size).fill(0));
  return { width: size, height: size, grid };
}

const audio = {
  calculatePan: () => 0,
  enemyShoot: () => {},
  enemyHit: () => {},
};

function ctxFor(enemy, player, time) {
  return {
    entities: [enemy],
    player,
    map: openMap(),
    time,
    timeScale: 1,
    projectiles: [],
    chronoBombs: [],
    damageNumbers: [],
    audio,
  };
}

/** A melee enemy already chasing, parked just inside attack range. */
function meleeSetup(type = "sentinel") {
  const e = new Enemy(10, 10, type);
  e.state = "chase";
  e.lastAttackTime = -1e9;
  const player = { x: 10 + e.def.attackRange * 0.5, y: 10, angle: 0, chronoActive: false };
  return { e, player };
}

/** Step the AI; returns every damage call it produced. */
function run(ai, e, player, ticks, startTime = 0) {
  const hits = [];
  let time = startTime;
  for (let i = 0; i < ticks; i++) {
    time += DT * 1000;
    const fx = ai.update(ctxFor(e, player, time), DT);
    hits.push(...fx.damagePlayerCalls);
  }
  return { hits, time };
}

describe("attackWindupMs", () => {
  it("uses the per-type override when present", () => {
    expect(attackWindupMs(ENEMY_TYPES.riftLeaper)).toBe(ENEMY_TYPES.riftLeaper.attackWindupMs);
  });

  it("falls back to melee and ranged defaults", () => {
    expect(attackWindupMs({ attackType: "melee" })).toBe(ENEMY_MELEE_WINDUP_MS);
    expect(attackWindupMs({ attackType: "ranged" })).toBe(ENEMY_RANGED_WINDUP_MS);
  });

  it("keeps every enemy's windup inside its attack cooldown", () => {
    for (const [key, def] of Object.entries(ENEMY_TYPES)) {
      expect(attackWindupMs(def), key).toBeLessThan(def.attackRate);
    }
  });
});

describe("melee windup", () => {
  it("enters windup instead of hitting immediately", () => {
    const ai = new AISystem();
    const { e, player } = meleeSetup();
    const { hits } = run(ai, e, player, 1);
    expect(e.state).toBe("windup");
    expect(hits).toHaveLength(0);
  });

  it("lands the hit once the windup elapses", () => {
    const ai = new AISystem();
    const { e, player } = meleeSetup();
    const ticks = Math.ceil(attackWindupMs(e.def) / (DT * 1000)) + 2;
    const { hits } = run(ai, e, player, ticks);
    expect(hits).toHaveLength(1);
    expect(hits[0].damage).toBe(e.def.damage);
  });

  it("whiffs when the player leaves range during the telegraph", () => {
    const ai = new AISystem();
    const { e, player } = meleeSetup();
    run(ai, e, player, 1);
    expect(e.state).toBe("windup");
    player.x = 10 + e.def.attackRange * 3; // step well out of reach
    const ticks = Math.ceil(attackWindupMs(e.def) / (DT * 1000)) + 2;
    const { hits } = run(ai, e, player, ticks);
    expect(hits).toHaveLength(0);
  });

  it("holds position while winding up", () => {
    const ai = new AISystem();
    const { e, player } = meleeSetup();
    run(ai, e, player, 1);
    const { x, y } = e;
    run(ai, e, player, 5);
    expect(e.state).toBe("windup");
    expect([e.x, e.y]).toEqual([x, y]);
  });
});

describe("pain during windup", () => {
  it("an ordinary hit pauses the windup and it resumes", () => {
    const ai = new AISystem();
    const { e, player } = meleeSetup();
    run(ai, e, player, 3);
    const left = e._windupLeftMs;
    e.state = "pain";
    e.painTimer = 150;
    run(ai, e, player, 12); // pain runs out
    expect(e.state).toBe("windup");
    expect(e._windupLeftMs).toBeLessThanOrEqual(left);
    expect(e._windupLeftMs).toBeGreaterThan(0);
  });

  it("a stagger cancels the windup", () => {
    const ai = new AISystem();
    const { e, player } = meleeSetup();
    run(ai, e, player, 3);
    e.state = "pain";
    e.painTimer = 250;
    e._staggered = true;
    run(ai, e, player, 18);
    expect(e._staggered).toBe(false);
    expect(e._windupLeftMs).toBe(0);
    expect(e.state).not.toBe("attack");
  });
});

describe("restored state", () => {
  it("a windup restored without its timer resolves instead of hanging", () => {
    const ai = new AISystem();
    const { e, player } = meleeSetup();
    e.state = "windup"; // as if loaded from a save that predates the timer
    delete e._windupLeftMs;
    // Without the guard, undefined - dt is NaN, NaN <= 0 is false, and the
    // enemy would sit in windup forever without ever attacking.
    const { hits } = run(ai, e, player, 1);
    expect(hits).toHaveLength(1);
    expect(Number.isFinite(e._windupLeftMs)).toBe(true);
  });
});

describe("ranged windup", () => {
  it("fires its projectile after the telegraph, not on detection", () => {
    const ai = new AISystem();
    const e = new Enemy(10, 10, "drone");
    e.state = "chase";
    e.lastAttackTime = -1e9;
    const player = { x: 13, y: 10, angle: 0, chronoActive: false };
    const ctx0 = ctxFor(e, player, 16);
    ai.update(ctx0, DT);
    expect(e.state).toBe("windup");
    expect(ctx0.projectiles).toHaveLength(0);

    let fired = 0;
    let time = 16;
    for (let i = 0; i < 30 && fired === 0; i++) {
      time += DT * 1000;
      const c = ctxFor(e, player, time);
      ai.update(c, DT);
      fired += c.projectiles.length;
    }
    expect(fired).toBe(1);
  });
});
