import { describe, it, expect } from "vitest";
import { AISystem, enemyTimeRate, inView, inFrontArc, blinkLanding, ACQUIRE_SECONDS, UNSEEN_WINDUP_MUL, UNSEEN_SWING_MUL, BEHIND_HOLD_MS, attackWindupMs } from "../../src/systems/ai.js";
import { Enemy } from "../../js/entities.js";
import { ENEMY_TYPES } from "../../src/data/enemies.js";
import { resolveHitZone, zoneAimHeight, hitSpan, calculateEnemyDamage } from "../../src/systems/combat.js";

const DT = 1 / 60;
const SHIFT = 0.3; // the world's time scale while the player shifts (game.js)

/** A walled 24x24 room, open inside. */
function room(size = 24) {
  const grid = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => (x === 0 || y === 0 || x === size - 1 || y === size - 1 ? 1 : 0)),
  );
  return { width: size, height: size, grid };
}

function makeAudio(log = []) {
  return {
    calculatePan: () => 0,
    enemyShoot: () => {},
    enemyHit: () => {},
    enemyBark: () => {},
    telegraph: (_pan, kind) => log.push(kind),
  };
}

/** Step the AI for `seconds` of real time at the given world time scale. */
function run(ai, entities, player, map, seconds, { timeScale = 1, t0 = 0, audio = makeAudio(), each } = {}) {
  let time = t0;
  const projectiles = [];
  const hits = [];
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    time += DT * 1000;
    const fx = ai.update(
      { entities, player, map, time, timeScale, projectiles, chronoBombs: [], damageNumbers: [], audio },
      DT * timeScale,
    );
    hits.push(...fx.damagePlayerCalls);
    each?.(time);
  }
  return { time, projectiles, hits };
}

describe("Chrono Shift slows each enemy once, by its own multiplier", () => {
  const shifting = { chronoActive: true };
  it("reads chronoMultiplier as the enemy's rate against real time", () => {
    const rate = (type) => enemyTimeRate(new Enemy(1, 1, type), shifting, SHIFT);
    expect(rate("drone")).toBe(0); // freeze
    expect(rate("phantom")).toBe(0.5); // resist
    expect(rate("beast")).toBe(1.5); // accelerate
    expect(rate("hound")).toBe(1.5);
    expect(rate("boss")).toBe(SHIFT); // the Shell: slowed like the world
    expect(rate("boss_form2")).toBe(1); // the Brute: unaffected
    expect(rate("boss_form3")).toBe(1); // the Remainder: unaffected
    expect(rate("corruptCop")).toBe(0.15);
    // Not shifting: the world's scale (a last-kill slow-mo included).
    expect(enemyTimeRate(new Enemy(1, 1, "beast"), { chronoActive: false }, 0.25)).toBe(0.25);
  });

  const distanceIn = (type, chronoActive, timeScale) => {
    const map = room();
    const e = new Enemy(4.5, 12, type);
    e.state = "chase";
    e.alertRange = 99;
    e.lastAttackTime = 1e12; // no attacks: just the walk
    e.def = { ...e.def, damage: 0, chargeCooldown: 0 };
    const player = { x: 20.5, y: 12, angle: Math.PI, chronoActive };
    run(new AISystem(), [e], player, map, 1, { timeScale });
    return e.x - 4.5;
  };

  it("a beast covers more ground per real second while you shift, not less", () => {
    const normal = distanceIn("beast", false, 1);
    expect(normal).toBeGreaterThan(0.5);
    const shifted = distanceIn("beast", true, SHIFT);
    expect(shifted / normal).toBeCloseTo(1.5, 1);
  });

  it("the Brute walks at his own pace through your shift", () => {
    const normal = distanceIn("boss_form2", false, 1);
    const shifted = distanceIn("boss_form2", true, SHIFT);
    expect(shifted / normal).toBeCloseTo(1, 1);
  });

  it("a phantom runs at half speed, not 15%", () => {
    const normal = distanceIn("phantom", false, 1);
    const shifted = distanceIn("phantom", true, SHIFT);
    expect(shifted / normal).toBeCloseTo(0.5, 1);
  });

  it("the Brute's attack cadence is unchanged by a shift", () => {
    const shots = (chronoActive, timeScale) => {
      const map = room();
      const e = new Enemy(10, 12, "boss_form2");
      e.state = "chase";
      e.alertRange = 99;
      e.lastAttackTime = 0;
      e.def = { ...e.def, ai: "guard", counterShift: false, replay: false, form: undefined };
      e.speed = 0;
      const player = { x: 14, y: 12, angle: Math.PI, chronoActive };
      return run(new AISystem(), [e], player, map, 4, { timeScale }).projectiles.length;
    };
    expect(shots(false, 1)).toBeGreaterThan(1);
    expect(shots(true, SHIFT)).toBe(shots(false, 1));
  });
});

describe("Sentinels advance and bash; their weak points face away from you", () => {
  it("walks at you behind its shield instead of holding", () => {
    const map = room();
    const e = new Enemy(4.5, 12, "sentinel");
    e.state = "chase";
    e.angle = 0;
    const player = { x: 18.5, y: 12, angle: Math.PI, chronoActive: false };
    run(new AISystem(), [e], player, map, 3);
    expect(e.x - 4.5).toBeGreaterThan(2); // ~0.9 cells/s
  });

  it("stops at bashing range, bashes, and the bash shoves you back", () => {
    const map = room();
    const e = new Enemy(8, 12, "sentinel");
    e.state = "chase";
    e.angle = 0;
    e.lastAttackTime = -1e9;
    const player = { x: 12, y: 12, angle: Math.PI, chronoActive: false };
    const { hits } = run(new AISystem(), [e], player, map, 4);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].damage).toBe(ENEMY_TYPES.sentinel.damage);
    // Shoved out past its reach at least once.
    expect(player.x).toBeGreaterThan(e.x + 1.9);
  });

  it("plants its shield through the bash's tell: a sidestep gets you round it", () => {
    const map = room();
    const e = new Enemy(10, 12, "sentinel");
    e.state = "chase";
    e.angle = 0;
    e.lastAttackTime = -1e9;
    const player = { x: 12, y: 12, angle: Math.PI, chronoActive: false };
    const ai = new AISystem();
    run(ai, [e], player, map, 0.05);
    expect(e.state).toBe("windup");
    const facing = e.angle;
    player.x = 10;
    player.y = 14; // stepped to its side
    run(ai, [e], player, map, 0.2, { t0: 100 });
    expect(e.angle).toBeCloseTo(facing, 5);
  });

  const zoneFrom = (type, fromFront, zone) => {
    const e = new Enemy(10, 10, type);
    e.angle = 0; // facing +x
    const dir = fromFront ? -1 : 1; // a round flying -x hits its face
    return resolveHitZone(e, zoneAimHeight(e, zone), dir, 0).name;
  };

  for (const type of ["sentinel", "shieldCommander", "timeWarden"]) {
    it(`${type}: a head shot from the front grazes the visor, from behind it is a head shot`, () => {
      expect(zoneFrom(type, true, "head")).toBe("visor");
      expect(zoneFrom(type, false, "head")).toBe("head");
      expect(zoneFrom(type, false, "core")).toBe("core");
      expect(zoneFrom(type, true, "core")).toBe("armor");
    });
  }

  it("from behind it takes many times what the front takes", () => {
    const e = new Enemy(10, 10, "sentinel");
    e.angle = 0;
    const head = zoneAimHeight(e, "head");
    const front = resolveHitZone(e, head, -1, 0);
    const back = resolveHitZone(e, head, 1, 0);
    const dmg = (zone, from) => calculateEnemyDamage(15 * zone.mult, e, 0, from, { zone: zone.name }).finalDamage;
    expect(front.name).toBe("visor");
    expect(dmg(back, { x: 8, y: 10 })).toBeGreaterThan(1.8 * dmg(front, { x: 12, y: 10 }));
    // ...and a graze still beats the plate (a slow win for a good aim).
    const plate = resolveHitZone(e, zoneAimHeight(e, "armor"), -1, 0);
    expect(dmg(front, { x: 12, y: 10 })).toBeGreaterThan(3 * dmg(plate, { x: 12, y: 10 }));
    expect(hitSpan(e)[1]).toBeGreaterThan(hitSpan(e)[0]);
  });
});

describe("Shield Commander: bait the charge, hit its back", () => {
  it("a missed bash carries it past you and leaves its back turned", () => {
    const map = room(30);
    const e = new Enemy(8, 15, "shieldCommander");
    e.state = "chase";
    e.alertRange = 99;
    e.angle = 0;
    e._chargeCD = 0;
    e._quillCD = 99;
    e.lastAttackTime = 1e12;
    const player = { x: 13.5, y: 15, angle: Math.PI, chronoActive: false };
    const ai = new AISystem();
    let sawRecover = false;
    let backTurned = false;
    run(ai, [e], player, map, 3.5, {
      each: () => {
        // Sidestep once it commits to the lane.
        if (e._chargeState === "sprint" && player.y === 15) player.y = 18;
        if (e._chargeState === "recover") {
          sawRecover = true;
          const toPlayer = Math.atan2(player.y - e.y, player.x - e.x);
          const d = Math.abs(Math.atan2(Math.sin(toPlayer - e.angle), Math.cos(toPlayer - e.angle)));
          if (d > Math.PI / 3) backTurned = true; // outside its shield's arc
        }
      },
    });
    expect(sawRecover).toBe(true);
    expect(backTurned).toBe(true);
    expect(e.x).toBeGreaterThan(13.5); // ran past where you stood
  });
});

describe("ranged enemies aim before they fire, and warn from off-screen", () => {
  it("does not start a shot until it has seen you for the acquire delay", () => {
    const map = room();
    const e = new Enemy(6, 12, "corruptCop");
    e.state = "chase";
    e.lastAttackTime = -1e9;
    e.speed = 0;
    const player = { x: 12, y: 12, angle: Math.PI, chronoActive: false };
    const ai = new AISystem();
    let firstWindup = null;
    run(ai, [e], player, map, 1.5, {
      each: (t) => {
        if (firstWindup == null && e.state === "windup") firstWindup = t;
      },
    });
    expect(firstWindup).not.toBeNull();
    expect(firstWindup / 1000).toBeGreaterThanOrEqual(ACQUIRE_SECONDS[0]);
    expect(firstWindup / 1000).toBeLessThanOrEqual(ACQUIRE_SECONDS[1] + 0.2);
  });

  it("never winds up through a wall", () => {
    const map = room();
    for (let y = 1; y < 23; y++) map.grid[y][9] = 1;
    const e = new Enemy(6, 12, "corruptCop");
    e.state = "chase";
    e.alertRange = 99;
    e.lastAttackTime = -1e9;
    e.speed = 0;
    const player = { x: 12, y: 12, angle: Math.PI, chronoActive: false };
    const { projectiles } = run(new AISystem(), [e], player, map, 3);
    expect(projectiles).toHaveLength(0);
    expect(e.state).not.toBe("windup");
  });

  it("winds up longer and louder out of your view", () => {
    const shoot = (playerAngle) => {
      const map = room();
      const e = new Enemy(6, 12, "corruptCop");
      e.state = "chase";
      e.lastAttackTime = -1e9;
      e._acquire = 1;
      e._acquireNeed = 0.5;
      e.speed = 0;
      const log = [];
      const player = { x: 12, y: 12, angle: playerAngle, chronoActive: false };
      run(new AISystem(), [e], player, map, 0.05, { audio: makeAudio(log) });
      return { ms: e._windupTotalMs, kind: log[0] };
    };
    const seen = shoot(Math.PI); // facing it
    const unseen = shoot(0); // back to it
    expect(inView({ x: 12, y: 12, angle: Math.PI }, { x: 6, y: 12 })).toBe(true);
    expect(seen.kind).toBe("shot");
    expect(unseen.kind).toBe("unseen");
    expect(unseen.ms).toBeCloseTo(seen.ms * UNSEEN_WINDUP_MUL);
    expect(seen.ms).toBe(attackWindupMs(ENEMY_TYPES.corruptCop));
  });
});

describe("phantoms: light rifle, telegraphed blink-in strike", () => {
  const P = ENEMY_TYPES.phantom;

  it("its rifle is a harassment, not a shredder", () => {
    const dps = (P.damage * 1000) / P.attackRate;
    expect(dps).toBeLessThan(7); // was ~19
  });

  const blinkIn = (chronoActive, timeScale, dodge) => {
    const map = room();
    const e = new Enemy(4, 12, "phantom");
    e.state = "chase";
    e.alertRange = 99;
    e.lastAttackTime = 1e12;
    e._teleportTimer = P.teleportCooldown; // blinks on the first tick
    const player = { x: 14, y: 12, angle: Math.PI, chronoActive };
    let landedAt = null;
    let struckAt = null;
    const log = [];
    const { hits } = run(new AISystem(), [e], player, map, 3, {
      timeScale,
      audio: makeAudio(log),
      each: (t) => {
        if (landedAt == null && e._blinkStrike) {
          landedAt = t;
          if (dodge) player.x += 2; // step back out of reach
        }
        if (landedAt != null && struckAt == null && !e._blinkStrike) struckAt = t;
      },
    });
    return { hits, tell: (struckAt - landedAt) / 1000, log };
  };

  it("lands 1.5 cells away into a 0.75 s strike that a shift stretches to ~1.5 s", () => {
    const plain = blinkIn(false, 1, false);
    expect(plain.log).toContain("warp");
    expect(plain.tell).toBeCloseTo(P.blinkStrike.windupMs / 1000, 1);
    expect(plain.hits[0].damage).toBe(P.damage * P.blinkStrike.damageMul);
    const shifted = blinkIn(true, SHIFT, false);
    expect(shifted.tell).toBeCloseTo(1.5, 1);
  });

  it("stepping out of reach during the tell dodges the strike", () => {
    const { hits } = blinkIn(false, 1, true);
    expect(hits.filter((h) => h.damage === P.damage * P.blinkStrike.damageMul)).toHaveLength(0);
  });
});

describe("blinks: only engaged, only in sight, landing where you can see it", () => {
  const P = ENEMY_TYPES.phantom;
  const setup = ({ state = "chase", wall = false, playerAngle = Math.PI } = {}) => {
    const map = room();
    if (wall) for (let y = 1; y < 23; y++) map.grid[y][9] = 1;
    const e = new Enemy(4, 12, "phantom");
    e.state = state;
    e.alertRange = state === "idle" ? 0 : 99;
    e.lastAttackTime = 1e12;
    e._teleportTimer = P.teleportCooldown;
    const player = { x: 14, y: 12, angle: playerAngle, chronoActive: false };
    return { map, e, player };
  };

  it("an idle phantom does not blink at a player it has never seen", () => {
    const { map, e, player } = setup({ state: "idle", wall: true });
    run(new AISystem(), [e], player, map, 6);
    expect(Math.hypot(e.x - 4, e.y - 12)).toBeLessThan(0.5);
  });

  it("never blinks through a wall", () => {
    const { map, e, player } = setup({ wall: true });
    run(new AISystem(), [e], player, map, 0.1);
    expect(e.x).toBeLessThan(9);
  });

  it("from behind you, it lands at the edge of your view, 1.5 cells out", () => {
    const { map, e, player } = setup({ playerAngle: 0 }); // your back to it
    run(new AISystem(), [e], player, map, 0.05);
    expect(Math.hypot(e.x - 14, e.y - 12)).toBeCloseTo(1.5, 1);
    expect(inView(player, e)).toBe(true);
    const land = blinkLanding({ x: 0, y: 0, angle: 0 }, { x: 5, y: 0 }, 1.5);
    expect(land.x).toBeCloseTo(1.5);
  });
});

describe("a swing from out of view", () => {
  it("holds, hums, then winds up longer than one you are facing", () => {
    const swing = (angle, seconds) => {
      const map = room();
      const e = new Enemy(10, 12, "sentinel");
      e.state = "chase";
      e.angle = 0;
      e.lastAttackTime = -1e9;
      const log = [];
      const player = { x: 11.5, y: 12, angle, chronoActive: false };
      let first = null;
      const { hits } = run(new AISystem(), [e], player, map, seconds, {
        audio: makeAudio(log),
        each: (t) => {
          if (first == null && e.state === "windup") first = { t, ms: e._windupTotalMs };
        },
      });
      return { first, kind: log[0], hits };
    };
    const seen = swing(Math.PI, 0.05);
    expect(seen.first.ms).toBe(attackWindupMs(ENEMY_TYPES.sentinel));
    const unseen = swing(0, 3.5);
    expect(unseen.kind).toBe("unseen");
    expect(unseen.first.t).toBeGreaterThanOrEqual(BEHIND_HOLD_MS);
    expect(unseen.first.ms).toBeGreaterThan(2 * seen.first.ms);
    // Its first hit on your back comes no sooner than the hold plus that windup.
    expect(unseen.hits.length).toBeGreaterThan(0);
    const longest = BEHIND_HOLD_MS + unseen.first.ms;
    expect(longest).toBeGreaterThan(2500);
  });
});

describe("a bash you looked away from", () => {
  it("does not land on the short tell: it re-winds the long one", () => {
    const map = room();
    const e = new Enemy(10, 12, "sentinel");
    e.state = "chase";
    e.angle = 0;
    e.lastAttackTime = -1e9;
    const log = [];
    const player = { x: 11.5, y: 12, angle: Math.PI, chronoActive: false };
    const ai = new AISystem();
    run(ai, [e], player, map, 0.05, { audio: makeAudio(log) });
    expect(e.state).toBe("windup");
    player.angle = 0; // turn your back mid-tell
    const short = attackWindupMs(ENEMY_TYPES.sentinel) / 1000;
    const { hits } = run(ai, [e], player, map, short + 0.1, { t0: 50, audio: makeAudio(log) });
    expect(hits).toHaveLength(0);
    expect(log).toContain("unseen");
    const later = run(ai, [e], player, map, short * UNSEEN_SWING_MUL, { t0: 2000, audio: makeAudio(log) });
    expect(later.hits.length).toBe(1);
  });
});

describe("a shield bearer holds its fire at a flanker", () => {
  const cmd = (enemyAngle, playerAngle) => {
    const map = room();
    const e = new Enemy(10, 12, "shieldCommander");
    e.state = "chase";
    e.alertRange = 99;
    e.angle = enemyAngle;
    e.lastAttackTime = -1e9;
    e._chargeCD = 99;
    e._quillCD = 99;
    e.speed = 0;
    const log = [];
    const player = { x: 16, y: 12, angle: playerAngle, chronoActive: false };
    return { map, e, player, log };
  };

  it("does not start a shot at a player behind its shield", () => {
    const { map, e, player, log } = cmd(Math.PI, Math.PI); // its back to you
    run(new AISystem(), [e], player, map, 0.1, { audio: makeAudio(log) });
    expect(e.state).toBe("chase");
    expect(inFrontArc(e, player)).toBe(false);
  });

  it("a shot whose target got round it during the tell goes nowhere", () => {
    const { map, e, player } = cmd(0, Math.PI);
    const ai = new AISystem();
    run(ai, [e], player, map, 0.05);
    expect(e.state).toBe("windup");
    player.x = 4; // round behind it, faster than it turns
    const { projectiles } = run(ai, [e], player, map, 0.5, { t0: 50 });
    expect(projectiles).toHaveLength(0);
  });

  it("from outside your view it shoots only after the long, loud tell", () => {
    const { map, e, player, log } = cmd(0, 0); // facing you; your back to it
    run(new AISystem(), [e], player, map, 0.05, { audio: makeAudio(log) });
    expect(log[0]).toBe("unseen");
    expect(e._windupTotalMs).toBeCloseTo(attackWindupMs(ENEMY_TYPES.shieldCommander) * UNSEEN_WINDUP_MUL);
  });

  it("turns slower than you circle it at a walk, four cells out", () => {
    expect(ENEMY_TYPES.shieldCommander.shieldTurnRate).toBeLessThan(3.5 / 3);
  });
});

describe("the Temporal Summoner's ward", () => {
  it("fails within its fade once the last summon dies, and says so", () => {
    const map = room();
    const e = new Enemy(10, 12, "temporalSummoner");
    e.state = "chase";
    e.alertRange = 99;
    e.lastAttackTime = 1e12;
    e._quillCD = 99;
    e._summonTimer = -1e9;
    const add = new Enemy(12, 14, "drone");
    add._summoned = true;
    add._summoner = e;
    add.alertRange = 0;
    const player = { x: 20, y: 12, angle: Math.PI, chronoActive: false };
    const ai = new AISystem();
    const dn = [];
    const tick = (seconds) => {
      let time = 0;
      for (let i = 0; i < Math.round(seconds / DT); i++) {
        time += DT * 1000;
        ai.update({ entities: [e, add], player, map, time, timeScale: 1, projectiles: [], chronoBombs: [], damageNumbers: dn, audio: makeAudio() }, DT);
      }
    };
    tick(0.2);
    expect(e._shield).toBeGreaterThan(0);
    add.state = "dead";
    add.active = false;
    tick(ENEMY_TYPES.temporalSummoner.ward.fade + 0.2);
    expect(e._shield).toBe(0);
    expect(dn.map((d) => d.value)).toEqual(expect.arrayContaining(["WARD FAILING", "WARD DOWN"]));
  });

  it("calls one drone at a time, on a long channel", () => {
    const S = ENEMY_TYPES.temporalSummoner;
    expect(S.summonCount).toBe(1);
    expect(S.summonMax).toBeLessThanOrEqual(2);
    expect(S.summonChannel).toBeGreaterThanOrEqual(1.5);
  });
});

