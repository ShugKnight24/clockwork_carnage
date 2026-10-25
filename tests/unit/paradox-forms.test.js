import { describe, it, expect } from "vitest";
import { AISystem } from "../../src/systems/ai.js";
import { Enemy } from "../../js/entities.js";
import { ENEMY_TYPES } from "../../src/data/enemies.js";
import { calculateEnemyDamage, hitSpan } from "../../src/systems/combat.js";
import { FORMS, TAUNTS, ringAngles, shellCrackDue, undoDue, tickBossForm } from "../../src/systems/paradox-forms.js";

const DT = 1 / 60;

function openMap(size = 40) {
  return { width: size, height: size, grid: Array.from({ length: size }, () => new Array(size).fill(0)) };
}

const audio = { calculatePan: () => 0, enemyShoot: () => {}, enemyHit: () => {}, enemyBark: () => {}, telegraph: () => {} };

/** A fight on an open map, the way the game runs it. */
function fight(type, { player = { x: 20, y: 28 }, at = { x: 20, y: 20 }, map = openMap() } = {}) {
  const boss = new Enemy(at.x, at.y, type);
  boss.state = "chase";
  const p = { angle: -Math.PI / 2, chronoActive: false, health: 100, ...player };
  const ctx = {
    entities: [boss],
    player: p,
    map,
    time: 0,
    timeScale: 1,
    projectiles: [],
    chronoBombs: [],
    damageNumbers: [],
    audio,
    noise: null,
  };
  const ai = new AISystem();
  const lines = [];
  const hits = [];
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      ctx.time += DT * 1000;
      const fx = ai.update(ctx, DT);
      lines.push(...fx.lines);
      hits.push(...fx.damagePlayerCalls);
      ctx.noise = null;
    }
  };
  return { boss, player: p, ctx, step, lines, hits, map };
}

describe("the three forms, by the numbers", () => {
  const [f1, f2, f3] = ["boss", "boss_form2", "boss_form3"].map((t) => ENEMY_TYPES[t]);

  it("each one is stronger than the last, whatever it looks like", () => {
    expect(f1.health).toBeLessThan(f2.health);
    expect(f2.health).toBeLessThan(f3.health);
    expect(f1.damage).toBeLessThan(f2.damage);
    expect(f2.damage).toBeLessThan(f3.damage);
    expect(f1.speed).toBeLessThan(f2.speed);
    expect(f2.speed).toBeLessThan(f3.speed);
  });

  it("the Shell is the biggest target and the Final Form the smallest", () => {
    expect(f1.radius).toBeGreaterThan(f2.radius);
    expect(f2.radius).toBeGreaterThan(f3.radius);
    // Its telegraphs are the longest: it is loud, and slow to land.
    expect(f1.attackWindupMs).toBeGreaterThan(f2.attackWindupMs);
    expect(FORMS[1].charge.windup).toBeGreaterThan(FORMS[2].charge.windup);
  });

  it("every form moves its own way and says its lines", () => {
    expect(new Set([f1.ai, f2.ai, f3.ai]).size).toBe(3);
    for (const form of [1, 2, 3]) {
      expect(TAUNTS[form].open).toBeTruthy();
      expect(TAUNTS[form].low).toBeTruthy();
    }
  });
});

describe("pure helpers", () => {
  it("a slam's ring leaves its gap", () => {
    const ring = ringAngles(16, 3, 5);
    expect(ring).toHaveLength(13);
    const step = (Math.PI * 2) / 16;
    const missing = [5, 6, 7].map((i) => i * step);
    for (const a of missing) expect(ring.some((r) => Math.abs(r - a) < 1e-9)).toBe(false);
    expect(ringAngles(10, 0)).toHaveLength(10);
  });

  it("the shell cracks once, at half health", () => {
    const e = { health: 330, maxHealth: 640 };
    expect(shellCrackDue(e)).toBe(false);
    e.health = 320;
    expect(shellCrackDue(e)).toBe(true);
    e._shellCracked = true;
    expect(shellCrackDue(e)).toBe(false);
  });

  it("undo answers a burst, not a trickle", () => {
    const log = [
      { t: 9, hp: 1000, x: 1, y: 1 },
      { t: 10, hp: 1000, x: 2, y: 2 },
      { t: 10.5, hp: 990, x: 3, y: 3 },
    ];
    expect(undoDue(log, 11, 985, 2600)).toBeNull();
    const due = undoDue(log, 11, 780, 2600);
    expect(due.heal).toBeCloseTo(110);
    expect(due.to).toBe(log[0]);
  });
});

describe("the Shell (Form 1)", () => {
  it("cracks at half health: staggers, takes double, shrinks, and says so", () => {
    const { boss, step, lines } = fight("boss");
    step();
    expect(lines.map((l) => l.text)).toContain(TAUNTS[1].open);
    const speed = boss.speed;
    boss.health = boss.maxHealth * 0.49;
    step();
    expect(boss._shellCracked).toBe(true);
    expect(boss._takenMul).toBe(FORMS[1].shell.takenMul);
    expect(boss.speed).toBeCloseTo(speed * FORMS[1].shell.speedMul);
    expect(boss.painTimer).toBeGreaterThan(1000);
    expect(lines.map((l) => l.text)).toContain(TAUNTS[1].crack);
    // The stagger holds even against the poise bosses have.
    step(30);
    expect(boss.painTimer).toBeGreaterThan(0);
    step(Math.round(3 / DT));
    expect(boss._spriteScale).toBeCloseTo(FORMS[1].shell.shrink);
    expect(boss.state).not.toBe("pain");
  });

  it("takes full damage once cracked, and stands shorter", () => {
    const e = new Enemy(10, 10, "boss");
    const at = { x: 10, y: 5 };
    // Uncracked, the carapace takes its cut (def.armor), and shows it.
    const shell = calculateEnemyDamage(10, e, 0, at);
    expect(shell.finalDamage).toBeCloseTo(10 * ENEMY_TYPES.boss.armor.mul);
    expect(shell.shieldSpark).toBe(true);
    // Stuck after a charge, the core is open.
    e._stagger = true;
    expect(calculateEnemyDamage(10, e, 0, at).finalDamage).toBe(10);
    e._stagger = false;
    const tall = hitSpan(e)[1];
    e._shellCracked = true;
    e._takenMul = FORMS[1].shell.takenMul;
    tickBossForm(e, 10);
    expect(calculateEnemyDamage(10, e, 0, at).finalDamage).toBe(10);
    expect(hitSpan(e)[1]).toBeLessThan(tall);
  });

  it("the Brute and the Remainder take no more than their cap from one round", () => {
    for (const type of ["boss_form2", "boss_form3"]) {
      const e = new Enemy(10, 10, type);
      const r = calculateEnemyDamage(140 * 2.5 * 1.6, e, 0, { x: 10, y: 5 });
      expect(r.finalDamage, type).toBe(ENEMY_TYPES[type].armor.cap);
      expect(r.shieldSpark).toBe(true);
      // A sniper alone, every bolt landing, takes a minute or more.
      const sniperOnly = (ENEMY_TYPES[type].health / ENEMY_TYPES[type].armor.cap) * 1.2;
      expect(sniperOnly).toBeGreaterThanOrEqual(54);
      expect(calculateEnemyDamage(20, e, 0, { x: 10, y: 5 }).finalDamage).toBe(20);
    }
  });

  it("a sniper bolt glances off the uncracked carapace, and lands once it cracks", () => {
    const e = new Enemy(10, 10, "boss");
    const at = { x: 10, y: 5 };
    const bolt = 140 * 2.5; // a core hit
    expect(calculateEnemyDamage(bolt, e, 0, at).finalDamage).toBeLessThanOrEqual(ENEMY_TYPES.boss.armor.cap);
    e._stagger = true; // even stuck, one round is capped
    expect(calculateEnemyDamage(bolt, e, 0, at).finalDamage).toBe(ENEMY_TYPES.boss.armor.cap);
    e._stagger = false;
    e._shellCracked = true;
    e._takenMul = FORMS[1].shell.takenMul;
    // The core: a pistol round lands in full, a bolt only up to its cap.
    expect(calculateEnemyDamage(15, e, 0, at).finalDamage).toBe(15);
    expect(calculateEnemyDamage(bolt, e, 0, at).finalDamage).toBe(ENEMY_TYPES.boss.armor.crackedCap);
  });

  it("cracked, the core darts aside from your fire", () => {
    const { boss, step, ctx } = fight("boss", { player: { x: 20, y: 30 } });
    boss._shellCracked = true;
    boss.painTimer = 0;
    const x0 = boss.x;
    const y0 = boss.y;
    ctx.noise = { x: 20, y: 30, radius: 20 };
    step();
    expect(Math.hypot(boss.x - x0, boss.y - y0)).toBeGreaterThan(1);
  });

  it("slams a player who gets close, after a long tell, with a gap in the ring", () => {
    const { boss, step, ctx, hits } = fight("boss", { player: { x: 20, y: 23 } });
    step();
    expect(boss._bossWindup?.kind).toBe("slam");
    step(Math.round((FORMS[1].slam.windup - 0.2) / DT));
    expect(hits.some((h) => h.attacker === boss && h.damage === boss.def.damage * FORMS[1].slam.damageMul)).toBe(false);
    step(Math.round(0.3 / DT));
    expect(hits.some((h) => h.damage === boss.def.damage * FORMS[1].slam.damageMul)).toBe(true);
    const ring = ctx.projectiles.filter((p) => p.speed === FORMS[1].slam.ringSpeed);
    expect(ring).toHaveLength(FORMS[1].slam.ring - FORMS[1].slam.gap);
  });

  it("charges into a wall and sticks there", () => {
    const map = openMap();
    for (let y = 0; y < 40; y++) map.grid[y][25] = 1;
    const { boss, player, step } = fight("boss", { player: { x: 24.75, y: 10 }, at: { x: 20.7, y: 10 }, map });
    let stuck = false;
    for (let i = 0; i < Math.round(5 / DT) && !stuck; i++) {
      step();
      // Dodge it once it has committed: it runs on into the wall.
      if (boss._bossCharging) player.y = 16;
      stuck = !!boss._stagger && boss.painTimer > 0 && !boss._bossCharging;
    }
    expect(stuck).toBe(true);
    expect(boss.x).toBeLessThan(25);
  });
});

describe("bosses do not get stuck in their chamber", () => {
  it("keeps hunting a player it cannot see, instead of going back to idle", () => {
    const map = openMap();
    // A chamber with a two-tile gate, and the player round the corner outside.
    for (let x = 0; x < 40; x++) map.grid[25][x] = 1;
    map.grid[25][19] = 0;
    map.grid[25][20] = 0;
    for (let y = 26; y < 35; y++) map.grid[y][24] = 1;
    const { boss, step } = fight("boss", { player: { x: 30, y: 30 }, at: { x: 20, y: 18 }, map });
    step(Math.round(25 / DT));
    expect(boss.state).not.toBe("idle");
    expect(boss.state).not.toBe("search");
    // Out of the chamber, through the gate.
    expect(boss.y).toBeGreaterThan(26);
  });

  it("steps off a wall margin that holds it (where a charge used to leave it)", () => {
    const map = openMap();
    map.grid[9][10] = 1;
    map.grid[9][11] = 1;
    // Its centre a hair below a 2-wide block, the player straight above it.
    const { boss, step } = fight("boss_form2", { player: { x: 10.6, y: 3 }, at: { x: 10.6, y: 10.02 }, map });
    boss._bossCD = { charge: 99, slam: 99, barrage: 99 };
    step(Math.round(4 / DT));
    expect(boss.y).toBeLessThan(9);
  });

  it("is not flinched by ordinary hits", () => {
    const { boss, step } = fight("boss_form2");
    boss.state = "pain";
    boss.painTimer = 250;
    step();
    expect(boss.painTimer).toBe(0);
    expect(boss.state).not.toBe("pain");
  });

  it("does nothing special while it has not noticed you", () => {
    const { boss, step } = fight("boss", { player: { x: 20, y: 28 } });
    boss.state = "idle";
    boss.alertRange = 0;
    step(Math.round(3 / DT));
    expect(boss._bossWindup).toBeFalsy();
    expect(boss._bossCharging).toBeFalsy();
  });
});

describe("the Brute (Form 2)", () => {
  it("pounces twice in a row, then stands and recovers", () => {
    const { boss, step } = fight("boss_form2", { player: { x: 20, y: 30 } });
    boss._bossCD = { slam: 99, barrage: 99 };
    let charges = 0;
    let was = false;
    let held = false;
    for (let i = 0; i < Math.round(4 / DT); i++) {
      step();
      if (boss._bossCharging && !was) charges++;
      was = !!boss._bossCharging;
      if (boss._bossHold > 0) held = true;
      if (held) break;
      boss.y = Math.min(boss.y, 26); // keep him off you, so each pounce runs its course
    }
    expect(charges).toBe(FORMS[2].charge.chain);
    expect(held).toBe(true);
  });

  it("enrages below 40%", () => {
    const { boss, step, lines } = fight("boss_form2");
    const speed = boss.speed;
    boss.health = boss.maxHealth * 0.39;
    step();
    expect(boss._enraged).toBe(true);
    expect(boss.speed).toBeCloseTo(speed * FORMS[2].enrage.speedMul);
    expect(lines.map((l) => l.text)).toContain(TAUNTS[2].enrage);
  });
});

describe("the Remainder (Form 3)", () => {
  it("steps out of the line of fire when you shoot", () => {
    const { boss, step, ctx } = fight("boss_form3", { player: { x: 20, y: 26.5 } });
    boss._bossCD = { warp: 99, needles: 99 };
    step();
    const x = boss.x;
    ctx.noise = { x: 20, y: 26.5, radius: 10 };
    step();
    expect(Math.abs(boss.x - x)).toBeGreaterThan(1.5);
    // And not again straight away.
    const x2 = boss.x;
    ctx.noise = { x: 20, y: 26.5, radius: 10 };
    step();
    expect(boss.x).toBeCloseTo(x2, 1);
  });

  it("undoes a burst of damage, twice and no more", () => {
    const { boss, step, lines } = fight("boss_form3", { player: { x: 20, y: 26.5 } });
    boss._bossCD = { warp: 99, needles: 99, sidestep: 99 };
    for (let n = 0; n < 3; n++) {
      step(Math.round(1 / DT));
      const before = boss.health;
      boss.health -= boss.maxHealth * 0.1;
      step(2);
      if (n < 2) expect(boss.health).toBeGreaterThan(before - boss.maxHealth * 0.1);
      else expect(boss.health).toBeCloseTo(before - boss.maxHealth * 0.1);
    }
    expect(boss._undoUsed).toBe(FORMS[3].undo.uses);
    expect(lines.map((l) => l.text)).toContain(TAUNTS[3].undo);
  });

  it("fires its needles as a burst, led", () => {
    const { boss, step, ctx } = fight("boss_form3", { player: { x: 20, y: 26.5 } });
    boss._bossCD = { warp: 99, sidestep: 99 };
    step(Math.round((FORMS[3].needles.windup + 0.5) / DT));
    const needles = ctx.projectiles.filter((p) => p.speed === FORMS[3].needles.speed);
    expect(needles.length).toBe(FORMS[3].needles.count);
  });
});

describe("the mini-bosses", () => {
  it("are tough: more health, and shields of their own", () => {
    for (const t of ["shieldCommander", "temporalSummoner"]) {
      expect(ENEMY_TYPES[t].health).toBeGreaterThanOrEqual(500);
      expect(ENEMY_TYPES[t].subBoss).toBe(true);
    }
  });

  it("the Summoner channels, then calls two at once, and its ward lives on them", () => {
    const { boss: s, step, ctx } = fight("temporalSummoner", { player: { x: 20, y: 30 } });
    s._summonTimer = s.def.summonInterval;
    step();
    expect(s._channel).toBeGreaterThan(0);
    expect(ctx.damageNumbers.some((d) => d.value === "SUMMONING")).toBe(true);
    step(Math.round((s.def.summonChannel + 0.1) / DT));
    const mine = ctx.entities.filter((e) => e._summoner === s);
    expect(mine).toHaveLength(s.def.summonCount);
    // The ward comes back while they live...
    s._shield = 0;
    s._shieldRegenDelay = 0;
    step(30);
    expect(s._shield).toBeGreaterThan(0);
    // ...and not once they are dead.
    for (const m of mine) m.active = false;
    s._shield = 0;
    step(60);
    expect(s._shield).toBe(0);
  });

  it("the Commander rallies the allies round it with shields", () => {
    const { boss: c, step, ctx } = fight("shieldCommander", { player: { x: 20, y: 34 } });
    const ally = new Enemy(22, 20, "corruptCop");
    ally.alertRange = 0;
    ctx.entities.push(ally);
    c._rallyT = 0;
    step();
    expect(ally._shield).toBe(c.def.rally.shield);
    expect(ctx.damageNumbers.some((d) => d.value === "RALLY")).toBe(true);
  });
});
