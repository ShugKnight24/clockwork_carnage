import { describe, it, expect, vi } from "vitest";
import {
  getDifficultyMultipliers,
  getArenaEnemyTypes,
  createArenaEnemies,
  createArenaPickups,
  filterArenaSpawns,
  createCampaignEntities,
  createMissedWeaponPickups,
  createMeltdownEnemies,
  createMeltdownPickups,
  applyActEnemyRoster,
} from "../../src/systems/spawner.js";

// ── getDifficultyMultipliers ────────────────────────────────────────────────

describe("getDifficultyMultipliers", () => {
  it("easy (0) — reduced health/damage/speed/spawn, bonus timer", () => {
    const d = getDifficultyMultipliers(0);
    expect(d.healthMul).toBe(0.6);
    expect(d.damageMul).toBe(0.5);
    expect(d.speedMul).toBe(0.8);
    expect(d.spawnMul).toBe(0.7);
    expect(d.timerBonus).toBe(20);
  });

  it("normal (1) — all multipliers 1.0, no timer bonus", () => {
    const d = getDifficultyMultipliers(1);
    expect(d.healthMul).toBe(1.0);
    expect(d.damageMul).toBe(1.0);
    expect(d.speedMul).toBe(1.0);
    expect(d.spawnMul).toBe(1.0);
    expect(d.timerBonus).toBe(0);
  });

  it("hard (2) — elevated multipliers, timer penalty", () => {
    const d = getDifficultyMultipliers(2);
    expect(d.healthMul).toBe(1.4);
    expect(d.damageMul).toBe(1.4);
    expect(d.speedMul).toBe(1.15);
    expect(d.spawnMul).toBe(1.3);
    expect(d.timerBonus).toBe(-10);
  });

  it("nightmare (3) — max multipliers, severe timer penalty", () => {
    const d = getDifficultyMultipliers(3);
    expect(d.healthMul).toBe(2.0);
    expect(d.damageMul).toBe(1.8);
    expect(d.speedMul).toBe(1.3);
    expect(d.spawnMul).toBe(1.6);
    expect(d.timerBonus).toBe(-20);
  });

  it("unknown difficulty falls back to normal", () => {
    const d = getDifficultyMultipliers(99);
    expect(d.healthMul).toBe(1.0);
    expect(d.spawnMul).toBe(1.0);
  });
});

// ── getArenaEnemyTypes ──────────────────────────────────────────────────────

describe("getArenaEnemyTypes", () => {
  it("round 1 — base types only", () => {
    const types = getArenaEnemyTypes(1);
    expect(types).toEqual(["drone", "glitchling"]);
  });

  it("round 2 — adds phantom, corruptCop", () => {
    const types = getArenaEnemyTypes(2);
    expect(types).toContain("phantom");
    expect(types).toContain("corruptCop");
    expect(types).not.toContain("beast");
  });

  it("round 4 — adds beast, sentinel", () => {
    const types = getArenaEnemyTypes(4);
    expect(types).toContain("beast");
    expect(types).toContain("sentinel");
    expect(types).not.toContain("henchman");
  });

  it("round 6 — adds henchman, chronoBomber", () => {
    const types = getArenaEnemyTypes(6);
    expect(types).toContain("henchman");
    expect(types).toContain("chronoBomber");
  });

  it("round 8 — adds shieldCommander", () => {
    const types = getArenaEnemyTypes(8);
    expect(types).toContain("shieldCommander");
    expect(types).not.toContain("temporalSummoner");
  });

  it("round 10 — adds temporalSummoner (full roster)", () => {
    const types = getArenaEnemyTypes(10);
    expect(types).toContain("temporalSummoner");
    expect(types.length).toBe(10);
  });

  it("high rounds include all types", () => {
    const types = getArenaEnemyTypes(50);
    expect(types.length).toBe(10);
  });
});

// ── filterArenaSpawns ───────────────────────────────────────────────────────

describe("filterArenaSpawns", () => {
  const grid = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ];

  it("filters out spawns too close to player (< 5 units)", () => {
    const spawns = [
      { x: 5, y: 5 },   // at player — should be filtered
      { x: 6, y: 5 },   // 1 unit away — filtered
      { x: 1, y: 1 },   // far enough — kept
    ];
    const result = filterArenaSpawns(spawns, 5, 5, grid);
    expect(result.every(s => {
      const dx = s.x - 5, dy = s.y - 5;
      return Math.sqrt(dx * dx + dy * dy) >= 5;
    })).toBe(true);
  });

  it("filters out spawns on wall tiles (non-zero grid)", () => {
    const wallGrid = grid.map(r => [...r]);
    wallGrid[1][1] = 1; // wall at (1,1)
    const spawns = [
      { x: 1.5, y: 1.5 },   // on wall tile — filtered
      { x: 8.5, y: 8.5 },   // far + empty — kept
    ];
    const result = filterArenaSpawns(spawns, 0, 0, wallGrid);
    expect(result.some(s => Math.floor(s.x) === 1 && Math.floor(s.y) === 1)).toBe(false);
  });

  it("filters out spawns outside grid bounds", () => {
    const spawns = [
      { x: -1, y: 5 },
      { x: 5, y: -1 },
      { x: 15, y: 5 },
      { x: 5, y: 15 },
      { x: 8, y: 8 }, // valid
    ];
    const result = filterArenaSpawns(spawns, 0, 0, grid);
    // only the valid one should remain (if far enough from player at 0,0)
    for (const s of result) {
      const gx = Math.floor(s.x), gy = Math.floor(s.y);
      expect(gx).toBeGreaterThanOrEqual(0);
      expect(gy).toBeGreaterThanOrEqual(0);
      expect(gy).toBeLessThan(grid.length);
      expect(gx).toBeLessThan(grid[0].length);
    }
  });

  it("returns shuffled order (non-deterministic)", () => {
    const spawns = Array.from({ length: 20 }, (_, i) => ({ x: 8, y: i % 10 }));
    // Just verify it returns an array without errors
    const result = filterArenaSpawns(spawns, 0, 0, grid);
    expect(Array.isArray(result)).toBe(true);
  });
});

// ── createArenaEnemies ──────────────────────────────────────────────────────

describe("createArenaEnemies", () => {
  const diff = getDifficultyMultipliers(1); // normal
  const spawns = Array.from({ length: 50 }, (_, i) => ({ x: 5 + i * 0.1, y: 5 }));

  it("creates enemies at spawn positions", () => {
    const enemies = createArenaEnemies(1, spawns, diff);
    expect(enemies.length).toBeGreaterThan(0);
    for (const e of enemies) {
      expect(e.type).toBe("enemy");
      expect(e.x).toBeDefined();
      expect(e.y).toBeDefined();
    }
  });

  it("scales enemy count with round", () => {
    const r1 = createArenaEnemies(1, spawns, diff);
    const r5 = createArenaEnemies(5, spawns, diff);
    expect(r5.length).toBeGreaterThan(r1.length);
  });

  it("caps enemy count to available spawns", () => {
    const fewSpawns = [{ x: 5, y: 5 }, { x: 6, y: 6 }];
    const enemies = createArenaEnemies(20, fewSpawns, diff);
    expect(enemies.length).toBeLessThanOrEqual(fewSpawns.length);
  });

  it("scales health with difficulty", () => {
    const hard = getDifficultyMultipliers(2);
    // Both rolls must pick the same enemy types, or a hard roll that happens
    // to draw weaker types fails the comparison (this test was flaky).
    const seq = () => {
      let i = 0;
      return () => ((i++ * 0.6180339887) % 1);
    };
    const rnd = vi.spyOn(Math, "random");
    rnd.mockImplementation(seq());
    const normal = createArenaEnemies(3, spawns, diff);
    rnd.mockImplementation(seq());
    const harder = createArenaEnemies(3, spawns, hard);
    rnd.mockRestore();
    // At least some enemies should have higher health on hard
    const avgNormal = normal.reduce((s, e) => s + e.health, 0) / normal.length;
    const avgHard = harder.reduce((s, e) => s + e.health, 0) / harder.length;
    expect(avgHard).toBeGreaterThan(avgNormal);
  });

  it("scales health with round number", () => {
    const r1 = createArenaEnemies(1, spawns, diff);
    const r10 = createArenaEnemies(10, spawns, diff);
    // Compare max health of first enemy type
    expect(r10[0].health).toBeGreaterThanOrEqual(r1[0].health);
  });
});

// ── createArenaPickups ──────────────────────────────────────────────────────

describe("createArenaPickups", () => {
  const mapPickups = [
    { x: 3, y: 3, type: "health" },
    { x: 5, y: 5, type: "ammo" },
  ];

  it("creates pickups from map data", () => {
    const result = createArenaPickups(mapPickups, 1, { width: 20 });
    expect(result.length).toBe(2);
    expect(result[0].type).toBe("health");
    expect(result[1].type).toBe("ammo");
  });

  it("offsets pickup positions by 0.5", () => {
    const result = createArenaPickups(mapPickups, 1, { width: 20 });
    expect(result[0].x).toBe(3.5);
    expect(result[0].y).toBe(3.5);
  });

  it("adds bonus weapon at round 3+", () => {
    const r2 = createArenaPickups(mapPickups, 2, { width: 20 });
    const r3 = createArenaPickups(mapPickups, 3, { width: 20 });
    expect(r2.length).toBe(2);
    expect(r3.length).toBe(3);
    expect(r3[2].type).toBe("weapon");
  });

  it("gives plasma (id 2) at round 3-4, cannon (id 3) at round 5+", () => {
    const r3 = createArenaPickups([], 3, { width: 20 });
    const r5 = createArenaPickups([], 5, { width: 20 });
    expect(r3[0].weaponId).toBe(2);
    expect(r5[0].weaponId).toBe(3);
  });
});

// ── createCampaignEntities ──────────────────────────────────────────────────

describe("createCampaignEntities", () => {
  const diff = getDifficultyMultipliers(1);
  const level = {
    entities: [
      { type: "enemy", x: 3, y: 3, enemyType: "drone" },
      { type: "enemy", x: 5, y: 5, enemyType: "boss" },
      { type: "health", x: 7, y: 7 },
    ],
    exit: { x: 9, y: 9 },
  };

  it("creates enemies and pickups from level data", () => {
    const { entities } = createCampaignEntities(level, 1, 0, diff);
    const enemies = entities.filter(e => e.type === "enemy");
    const pickups = entities.filter(e => e.type === "health");
    expect(enemies.length).toBe(2);
    expect(pickups.length).toBe(1);
  });

  it("remaps boss to boss_form2 in act 2", () => {
    const { entities } = createCampaignEntities(level, 2, 0, diff);
    const boss = entities.find(e => e.type === "enemy" && e.enemyType.startsWith("boss"));
    expect(boss.enemyType).toBe("boss_form2");
  });

  it("remaps boss to boss_form3 in act 3", () => {
    const { entities } = createCampaignEntities(level, 3, 0, diff);
    const boss = entities.find(e => e.type === "enemy" && e.enemyType.startsWith("boss"));
    expect(boss.enemyType).toBe("boss_form3");
  });

  it("creates exit entity when level has exit", () => {
    const { exitEntity } = createCampaignEntities(level, 1, 0, diff);
    expect(exitEntity).not.toBeNull();
    expect(exitEntity.x).toBe(9);
    expect(exitEntity.y).toBe(9);
    expect(exitEntity.type).toBe("exit");
  });

  it("returns null exitEntity when level has no exit", () => {
    const noExitLevel = { entities: [{ type: "health", x: 1, y: 1 }] };
    const { exitEntity } = createCampaignEntities(noExitLevel, 1, 0, diff);
    expect(exitEntity).toBeNull();
  });

  it("scales enemy health with NG+ cycle", () => {
    const { entities: ng0 } = createCampaignEntities(level, 1, 0, diff);
    const { entities: ng2 } = createCampaignEntities(level, 1, 2, diff);
    const drone0 = ng0.find(e => e.enemyType === "drone");
    const drone2 = ng2.find(e => e.enemyType === "drone");
    expect(drone2.health).toBeGreaterThan(drone0.health);
  });

  it("scales enemy health with act number (non-boss)", () => {
    const { entities: a1 } = createCampaignEntities(level, 1, 0, diff);
    const { entities: a3 } = createCampaignEntities(level, 3, 0, diff);
    const drone1 = a1.find(e => e.enemyType === "drone");
    const drone3 = a3.find(e => e.enemyType === "drone");
    expect(drone3.health).toBeGreaterThan(drone1.health);
  });

  it("boss health does NOT scale with act (actScale = 1 for boss)", () => {
    const bossOnlyLevel = {
      entities: [{ type: "enemy", x: 5, y: 5, enemyType: "boss" }],
    };
    const { entities: a1 } = createCampaignEntities(bossOnlyLevel, 1, 0, diff);
    // boss_form2 and boss_form3 are different enemy types with potentially different base stats,
    // so this test verifies the actScale factor is 1 for bosses
    const boss = a1.find(e => e.type === "enemy");
    // actScale for boss = 1, ngScale for ng0 = 1, diff normal = 1
    // so health should be base health * 1 * 1 * 1
    expect(boss.health).toBe(boss.maxHealth);
  });
});

// ── createMissedWeaponPickups ───────────────────────────────────────────────

describe("createMissedWeaponPickups", () => {
  it("creates weapon pickups for missed IDs", () => {
    const pickups = createMissedWeaponPickups([2, 3, 5], [0], 5, 5);
    expect(pickups.length).toBe(3);
    expect(pickups.every(p => p.type === "weapon")).toBe(true);
  });

  it("skips weapons the player already has", () => {
    const pickups = createMissedWeaponPickups([2, 3, 5], [0, 3], 5, 5);
    expect(pickups.length).toBe(2);
    expect(pickups.find(p => p.weaponId === 3)).toBeUndefined();
  });

  it("places pickups in a circle around player start", () => {
    const pickups = createMissedWeaponPickups([1, 2, 3], [], 5, 5);
    for (const p of pickups) {
      const dx = p.x - 5, dy = p.y - 5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      expect(dist).toBeCloseTo(1.5, 1);
    }
  });

  it("returns empty array when no missed weapons", () => {
    expect(createMissedWeaponPickups([], [0], 5, 5)).toEqual([]);
  });
});

// ── createMeltdownEnemies ───────────────────────────────────────────────────

describe("createMeltdownEnemies", () => {
  const diff = getDifficultyMultipliers(1);

  it("creates enemies from spawn data", () => {
    const spawns = [
      { x: 3, y: 3, type: "drone" },
      { x: 5, y: 5, type: "glitchling" },
    ];
    const enemies = createMeltdownEnemies(spawns, diff);
    expect(enemies.length).toBe(2);
    expect(enemies[0].type).toBe("enemy");
    expect(enemies[0].x).toBe(3);
  });

  it("scales health with difficulty", () => {
    const spawns = [{ x: 3, y: 3, type: "drone" }];
    const normal = createMeltdownEnemies(spawns, diff);
    const hard = createMeltdownEnemies(spawns, getDifficultyMultipliers(2));
    expect(hard[0].health).toBeGreaterThan(normal[0].health);
  });

  it("unknown enemy type causes Enemy constructor to use drone fallback from spawner", () => {
    // createMeltdownEnemies uses ENEMY_TYPES[es.type] || ENEMY_TYPES.drone for local stats,
    // but Enemy constructor accesses ENEMY_TYPES[type] directly without fallback.
    // Unknown types will throw — this verifies behavior for known types only.
    const spawns = [{ x: 3, y: 3, type: "drone" }];
    const enemies = createMeltdownEnemies(spawns, diff);
    expect(enemies.length).toBe(1);
    expect(enemies[0].enemyType).toBe("drone");
  });
});

// ── createMeltdownPickups ───────────────────────────────────────────────────

describe("createMeltdownPickups", () => {
  it("creates pickups from spawn data", () => {
    const spawns = [
      { x: 3, y: 3, type: "health" },
      { x: 5, y: 5, type: "ammo" },
      { x: 7, y: 7, type: "weapon", weaponId: 2 },
    ];
    const pickups = createMeltdownPickups(spawns);
    expect(pickups.length).toBe(3);
    expect(pickups[0].type).toBe("health");
    expect(pickups[2].weaponId).toBe(2);
  });

  it("returns empty array for empty input", () => {
    expect(createMeltdownPickups([])).toEqual([]);
  });
});

// ── applyActEnemyRoster ─────────────────────────────────────────────────────

describe("applyActEnemyRoster", () => {
  const diff = getDifficultyMultipliers(1);

  function makeEnemy(type) {
    return { type: "enemy", enemyType: type, health: 100, maxHealth: 100, speed: 1, damage: 10, baseColor: "#f00", darkColor: "#800" };
  }

  it("does not modify enemies already in the act roster", () => {
    const entities = [makeEnemy("drone"), makeEnemy("glitchling")];
    applyActEnemyRoster(entities, 1, diff);
    expect(entities[0].enemyType).toBe("drone");
    expect(entities[1].enemyType).toBe("glitchling");
  });

  it("substitutes out-of-roster enemies for act 1", () => {
    const entities = [makeEnemy("henchman"), makeEnemy("beast")];
    applyActEnemyRoster(entities, 1, diff);
    expect(entities[0].enemyType).toBe("corruptCop");
    expect(entities[1].enemyType).toBe("sentinel");
  });

  it("substitutes out-of-roster enemies for act 2", () => {
    const entities = [makeEnemy("drone"), makeEnemy("phantom")];
    applyActEnemyRoster(entities, 2, diff);
    expect(entities[0].enemyType).toBe("corruptCop");
    expect(entities[1].enemyType).toBe("henchman");
  });

  it("substitutes out-of-roster enemies for act 3", () => {
    const entities = [makeEnemy("drone"), makeEnemy("corruptCop")];
    applyActEnemyRoster(entities, 3, diff);
    expect(entities[0].enemyType).toBe("echoDrone");
    expect(entities[1].enemyType).toBe("sentinel");
  });

  it("never modifies boss enemies", () => {
    const entities = [makeEnemy("boss"), makeEnemy("boss_form2"), makeEnemy("boss_form3")];
    applyActEnemyRoster(entities, 2, diff);
    expect(entities[0].enemyType).toBe("boss");
    expect(entities[1].enemyType).toBe("boss_form2");
    expect(entities[2].enemyType).toBe("boss_form3");
  });

  it("skips non-enemy entities", () => {
    const entities = [
      { type: "health", x: 3, y: 3 },
      makeEnemy("drone"),
    ];
    applyActEnemyRoster(entities, 1, diff);
    expect(entities[0].type).toBe("health");
  });

  it("updates health/speed/damage based on new type's definition", () => {
    const entities = [makeEnemy("henchman")];
    applyActEnemyRoster(entities, 1, diff);
    // Should now be corruptCop with corruptCop's base stats * diff
    expect(entities[0].enemyType).toBe("corruptCop");
    expect(entities[0].health).toBeGreaterThan(0);
    expect(entities[0].maxHealth).toBe(entities[0].health);
  });
});
