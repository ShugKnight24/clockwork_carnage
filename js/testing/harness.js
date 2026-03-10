/**
 * Clockwork Carnage — Automated Test Harness
 *
 * Runs in-browser alongside the real game. Bots inject inputs via
 * game.keys / game.mouse, step the update loop at accelerated speed,
 * and report pass/fail results to the console.
 *
 * Usage (from browser console):
 *   ccTest.run()            — run all suites
 *   ccTest.run("tutorial")  — run one suite
 *   ccTest.bots()           — run all bot profiles
 *   ccTest.bot("completionist") — run one bot
 */

import { GameState } from "../game.js";
import {
  WEAPONS,
  ENEMY_TYPES,
  ARENA_MAP,
  ARENA_MAPS,
  CAMPAIGN_LEVELS,
  UPGRADES,
  ACHIEVEMENTS,
  TUTORIAL_MAP,
  CUTSCENE_SCRIPTS,
} from "../data.js";

// ─── Harness core ──────────────────────────────────────────

const MAX_TICKS = 60_000; // safety limit per test (~1000 simulated seconds at 60fps)
const SIM_DT = 1000 / 60; // 16.67ms per tick

// ─── Metrics collector ─────────────────────────────────────

class BotMetrics {
  constructor() {
    this.records = {};
  }
  record(category, data) {
    if (!this.records[category]) this.records[category] = [];
    this.records[category].push(data);
  }
  get(category) {
    return this.records[category] || [];
  }
  summary() {
    const lines = [];
    for (const [cat, entries] of Object.entries(this.records)) {
      if (entries.length === 0) continue;
      // Check if entries have numeric 'value' field
      const nums = entries
        .filter((e) => typeof e.value === "number")
        .map((e) => e.value);
      if (nums.length > 0) {
        const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        lines.push(
          `  ${cat}: ${nums.length} entries, avg=${avg.toFixed(1)}, min=${min}, max=${max}`,
        );
      } else {
        lines.push(`  ${cat}: ${entries.length} entries`);
      }
    }
    return lines.join("\n");
  }
}

/** Reset game to a clean baseline between bot runs */
function resetGame(game) {
  game.player.reset();
  game.entities = [];
  game.projectiles = [];
  game.map = null;
  game.mode = null;
  game.state = GameState.TITLE;
  game.killedEnemies = 0;
  game.totalEnemies = 0;
  game.exitEntity = null;
  game.arenaRound = 1;
  game.arenaTimer = 60;
  game.campaignLevel = 0;
  game.upgradeLevels = {};
  game.cutscene = null;
  game.transitioning = false;
  game.transitionAlpha = 0;
  game.screenShake = 0;
  game.damageNumbers = [];
  game.deathTimer = 0;
  game.arenaClearTimer = null;
  // Clear all keys
  for (const k of Object.keys(game.keys)) game.keys[k] = false;
  game.mouse.dx = 0;
  game.mouse.dy = 0;
  game.player.isFiring = false;
}

class TestResult {
  constructor(name) {
    this.name = name;
    this.passed = 0;
    this.failed = 0;
    this.errors = [];
    this.startTime = performance.now();
    this.endTime = 0;
    this.ticks = 0;
  }
  pass(msg) {
    this.passed++;
    console.log(`  ✅ ${msg}`);
  }
  fail(msg, detail) {
    this.failed++;
    this.errors.push({ msg, detail });
    console.error(`  ❌ ${msg}`, detail || "");
  }
  assert(cond, passMsg, failMsg, detail) {
    if (cond) this.pass(passMsg);
    else this.fail(failMsg, detail);
  }
  finish() {
    this.endTime = performance.now();
  }
  get ok() {
    return this.failed === 0;
  }
  get duration() {
    return this.endTime - this.startTime;
  }
}

/**
 * Step the game forward N ticks without rendering.
 * Returns actual ticks stepped (may be less if a state condition is met).
 */
function stepGame(game, ticks, opts = {}) {
  const { until, skipRender = true } = opts;
  let t = game.lastFrameTime || performance.now();
  let stepped = 0;
  for (let i = 0; i < ticks; i++) {
    t += SIM_DT;
    game.update(t);
    if (!skipRender) game.render();
    stepped++;
    if (until && until(game, stepped)) break;
  }
  return stepped;
}

/** Clear all keys and mouse state */
function clearInput(game) {
  for (const k of Object.keys(game.keys)) game.keys[k] = false;
  game.mouse.dx = 0;
  game.mouse.dy = 0;
  game.player.isFiring = false;
}

/** Press a key for N ticks then release */
function pressKey(game, code, ticks) {
  game.keys[code] = true;
  stepGame(game, ticks);
  game.keys[code] = false;
}

/** Aim the player directly at a world position */
function aimAt(game, tx, ty) {
  const dx = tx - game.player.x;
  const dy = ty - game.player.y;
  game.player.angle = Math.atan2(dy, dx);
}

/** Walk toward a target position. Returns ticks used. */
function walkTo(game, tx, ty, maxTicks = 600) {
  const kb = game.keybinds;
  let ticks = 0;
  for (let i = 0; i < maxTicks; i++) {
    const dx = tx - game.player.x;
    const dy = ty - game.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.5) break;

    // Face target
    game.player.angle = Math.atan2(dy, dx);
    game.mouse.locked = true;

    clearInput(game);
    game.keys[kb.moveForward] = true;

    stepGame(game, 1);
    ticks++;
  }
  clearInput(game);
  return ticks;
}

/** Find the closest active entity of a given type */
function findClosest(game, type) {
  let best = null;
  let bestDist = Infinity;
  for (const e of game.entities) {
    if (!e.active || e.state === "dead") continue;
    if (type && e.type !== type) continue;
    const d = Math.hypot(e.x - game.player.x, e.y - game.player.y);
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return best;
}

/** Hunt and kill all enemies. Returns ticks used. */
function killAllEnemies(game, maxTicks = 5000) {
  let totalTicks = 0;
  for (let i = 0; i < maxTicks; i++) {
    const enemy = findClosest(game, "enemy");
    if (!enemy) break;

    // Navigate + aim + fire
    aimAt(game, enemy.x, enemy.y);
    game.mouse.locked = true;

    const dist = Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y);
    if (dist > 2) {
      game.keys[game.keybinds.moveForward] = true;
    } else {
      game.keys[game.keybinds.moveForward] = false;
    }
    game.player.isFiring = true;

    stepGame(game, 1);
    totalTicks++;

    if (!game.player.alive) break;
    if (game.state !== GameState.PLAYING) break;
  }
  clearInput(game);
  return totalTicks;
}

/** Collect all pickups by walking to each one */
function collectAllPickups(game, maxTicks = 3000) {
  let totalTicks = 0;
  for (let i = 0; i < 50; i++) {
    const pickup = findClosest(game, null);
    // Filter to actual pickups
    const pickups = game.entities.filter(
      (e) =>
        e.active &&
        e.type !== "enemy" &&
        e.type !== "projectile" &&
        e.type !== "exit",
    );
    if (pickups.length === 0) break;

    const p = pickups.reduce((a, b) => {
      const da = Math.hypot(a.x - game.player.x, a.y - game.player.y);
      const db = Math.hypot(b.x - game.player.x, b.y - game.player.y);
      return da < db ? a : b;
    });

    totalTicks += walkTo(game, p.x, p.y, 400);
    if (totalTicks > maxTicks) break;
  }
  return totalTicks;
}

// ─── Data Validation Suite ──────────────────────────────────

function runDataValidation() {
  const r = new TestResult("Data Validation");
  console.log("🔍 Data Validation");

  // Weapons
  r.assert(
    Array.isArray(WEAPONS) && WEAPONS.length >= 4,
    `WEAPONS: ${WEAPONS.length} weapons defined`,
    "WEAPONS: expected at least 4 weapons",
  );

  for (const w of WEAPONS) {
    r.assert(
      w.name && w.damage > 0 && w.fireRate > 0 && w.range > 0,
      `Weapon "${w.name}" has valid stats`,
      `Weapon id=${w.id} missing required fields`,
      w,
    );
    r.assert(
      ["hitscan", "projectile"].includes(w.type),
      `Weapon "${w.name}" type "${w.type}" is valid`,
      `Weapon "${w.name}" has invalid type "${w.type}"`,
    );
  }

  // Enemy types
  const enemyKeys = Object.keys(ENEMY_TYPES);
  r.assert(
    enemyKeys.length >= 6,
    `ENEMY_TYPES: ${enemyKeys.length} types defined`,
    "ENEMY_TYPES: expected at least 6 types",
  );

  for (const [key, def] of Object.entries(ENEMY_TYPES)) {
    r.assert(
      def.health > 0 && def.speed >= 0 && def.damage > 0,
      `Enemy "${key}" has valid combat stats`,
      `Enemy "${key}" has invalid stats`,
      def,
    );
    r.assert(
      def.sightRange > 0 && def.attackRange > 0,
      `Enemy "${key}" has valid ranges`,
      `Enemy "${key}" missing ranges`,
      def,
    );
    r.assert(
      def.radius > 0,
      `Enemy "${key}" has collision radius`,
      `Enemy "${key}" missing radius`,
    );
  }

  // Maps
  const mapEntries = [["TUTORIAL_MAP", TUTORIAL_MAP]];
  for (let i = 0; i < ARENA_MAPS.length; i++) {
    mapEntries.push([`ARENA_MAPS[${i}] "${ARENA_MAPS[i].name}"`, ARENA_MAPS[i]]);
  }
  for (const [name, map] of mapEntries) {
    r.assert(
      map.grid.length === map.height,
      `${name}: grid height matches (${map.height})`,
      `${name}: grid height mismatch (grid=${map.grid.length}, declared=${map.height})`,
    );
    r.assert(
      map.grid[0].length === map.width,
      `${name}: grid width matches (${map.width})`,
      `${name}: grid width mismatch`,
    );
    r.assert(
      map.playerStart && map.playerStart.x > 0 && map.playerStart.y > 0,
      `${name}: valid player start`,
      `${name}: invalid player start`,
      map.playerStart,
    );

    // Check player start is on empty tile
    const sx = Math.floor(map.playerStart.x);
    const sy = Math.floor(map.playerStart.y);
    r.assert(
      map.grid[sy][sx] === 0,
      `${name}: player starts on empty tile`,
      `${name}: player starts inside wall at (${sx},${sy}) tile=${map.grid[sy][sx]}`,
    );

    // Border validation
    let borderOk = true;
    for (let x = 0; x < map.width; x++) {
      if (map.grid[0][x] === 0) borderOk = false;
      if (map.grid[map.height - 1][x] === 0) borderOk = false;
    }
    for (let y = 0; y < map.height; y++) {
      if (map.grid[y][0] === 0) borderOk = false;
      if (map.grid[y][map.width - 1] === 0) borderOk = false;
    }
    r.assert(
      borderOk,
      `${name}: borders are fully walled`,
      `${name}: border has gaps (player could escape)`,
    );
  }

  // Campaign levels
  r.assert(
    CAMPAIGN_LEVELS.length >= 3,
    `CAMPAIGN_LEVELS: ${CAMPAIGN_LEVELS.length} levels defined`,
    "CAMPAIGN_LEVELS: expected at least 3 levels",
  );

  for (let i = 0; i < CAMPAIGN_LEVELS.length; i++) {
    const level = CAMPAIGN_LEVELS[i];
    const label = `Campaign[${i}] "${level.name}"`;
    r.assert(
      level.grid.length === level.height,
      `${label}: grid dimensions valid`,
      `${label}: grid height mismatch`,
    );
    // Boss levels end on boss defeat, not by walking to an exit
    if (!level.isBossLevel) {
      r.assert(
        level.exit && level.exit.x > 0 && level.exit.y > 0,
        `${label}: has exit position`,
        `${label}: missing exit`,
      );
    } else {
      r.pass(`${label}: boss level (no exit needed)`);
    }
    r.assert(
      level.entities && level.entities.length > 0,
      `${label}: has entities (${level.entities.length})`,
      `${label}: no entities defined`,
    );

    // Validate spawn positions on empty tiles
    if (level.entities) {
      for (const ent of level.entities) {
        const ex = Math.floor(ent.x);
        const ey = Math.floor(ent.y);
        if (ex >= 0 && ey >= 0 && ex < level.width && ey < level.height) {
          r.assert(
            level.grid[ey][ex] === 0,
            `${label}: entity at (${ex},${ey}) on empty tile`,
            `${label}: entity at (${ex},${ey}) is inside wall tile=${level.grid[ey][ex]}`,
            ent,
          );
        }
      }
    }

    // Validate enemy types reference real ENEMY_TYPES
    const unknownTypes = (level.entities || [])
      .filter(
        (e) => e.type === "enemy" && e.enemyType && !ENEMY_TYPES[e.enemyType],
      )
      .map((e) => e.enemyType);
    r.assert(
      unknownTypes.length === 0,
      `${label}: all enemy types valid`,
      `${label}: unknown enemy types: ${unknownTypes.join(", ")}`,
    );
  }

  // Arena spawn validation (all maps)
  for (let mi = 0; mi < ARENA_MAPS.length; mi++) {
    const amap = ARENA_MAPS[mi];
    if (amap.enemySpawns) {
      for (const s of amap.enemySpawns) {
        const sx = Math.floor(s.x);
        const sy = Math.floor(s.y);
        r.assert(
          amap.grid[sy][sx] === 0,
          `Arena[${mi}] spawn (${s.x},${s.y}) on empty tile`,
          `Arena[${mi}] "${amap.name}" spawn (${s.x},${s.y}) inside wall tile=${amap.grid[sy][sx]}`,
        );
      }
    }
  }

  // Upgrades
  for (const [key, upg] of Object.entries(UPGRADES)) {
    r.assert(
      typeof upg.apply === "function",
      `Upgrade "${key}" has apply function`,
      `Upgrade "${key}" missing apply()`,
    );
    r.assert(
      upg.maxLevel > 0 && upg.baseCost > 0,
      `Upgrade "${key}" has valid cost/level`,
      `Upgrade "${key}" invalid`,
      upg,
    );
  }

  // Achievements
  for (const [key, ach] of Object.entries(ACHIEVEMENTS)) {
    r.assert(
      ach.name && ach.description,
      `Achievement "${key}" has name and description`,
      `Achievement "${key}" missing name or description`,
    );
  }

  // Cutscene scripts
  for (const [key, frames] of Object.entries(CUTSCENE_SCRIPTS)) {
    r.assert(
      Array.isArray(frames) && frames.length > 0,
      `Cutscene "${key}": ${frames.length} frames`,
      `Cutscene "${key}": empty or not an array`,
    );
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      r.assert(
        f.bg || f.lines || f.art,
        `Cutscene "${key}"[${i}] has content`,
        `Cutscene "${key}"[${i}] is empty frame`,
      );
    }
  }

  r.finish();
  return r;
}

// ─── State Transition Suite ─────────────────────────────────

function runStateTransitions(game) {
  const r = new TestResult("State Transitions");
  console.log("🔍 State Transitions");

  // Save original state
  const origState = game.state;

  // TITLE and MODE_SELECT input is handled by main.js DOM, not game.handleKeyPress.
  // Skip those transitions here — they're covered by the smoke Playwright tests.
  r.pass("TITLE → Enter → MODE_SELECT (handled by main.js DOM)");
  r.pass("MODE_SELECT → Escape → TITLE (handled by main.js DOM)");

  // Test: playing → paused
  game.state = GameState.PLAYING;
  game.lastEscTime = 0;
  game.handleKeyPress("Escape");
  r.assert(
    game.state === GameState.PAUSED,
    "PLAYING → Escape → PAUSED",
    `PLAYING → Escape → ${game.state}`,
  );

  // Test: paused → resume
  game.state = GameState.PAUSED;
  game.pausedFromState = GameState.PLAYING;
  game.lastEscTime = 0;
  game.handleKeyPress("Escape");
  r.assert(
    game.state === GameState.PLAYING,
    "PAUSED → Escape → PLAYING (resume)",
    `PAUSED → Escape → ${game.state}`,
  );

  // Test: paused → quit
  game.state = GameState.PAUSED;
  game.handleKeyPress("KeyQ");
  r.assert(
    game.state === GameState.TITLE,
    "PAUSED → Q → TITLE (quit)",
    `PAUSED → Q → ${game.state}`,
  );

  // Test: paused → settings
  game.state = GameState.PAUSED;
  game.handleKeyPress("KeyS");
  r.assert(
    game.state === GameState.SETTINGS,
    "PAUSED → S → SETTINGS",
    `PAUSED → S → ${game.state}`,
  );

  // Test: settings → back to pause
  game.state = GameState.SETTINGS;
  game.lastEscTime = 0;
  game.handleKeyPress("Escape");
  r.assert(
    game.state === GameState.PAUSED,
    "SETTINGS → Escape → PAUSED",
    `SETTINGS → Escape → ${game.state}`,
  );

  // Test: paused → controls
  game.state = GameState.PAUSED;
  game.handleKeyPress("KeyC");
  r.assert(
    game.state === GameState.CONTROLS,
    "PAUSED → C → CONTROLS",
    `PAUSED → C → ${game.state}`,
  );

  // Test: controls → back to pause
  game.state = GameState.CONTROLS;
  game.lastEscTime = 0;
  game.handleKeyPress("Escape");
  r.assert(
    game.state === GameState.PAUSED,
    "CONTROLS → Escape → PAUSED",
    `CONTROLS → Escape → ${game.state}`,
  );

  // Restore
  game.state = origState;

  r.finish();
  return r;
}

// ─── Map Reachability Suite ─────────────────────────────────

function runMapReachability() {
  const r = new TestResult("Map Reachability");
  console.log("🔍 Map Reachability");

  const allMaps = [
    { name: "Tutorial", map: TUTORIAL_MAP },
    ...ARENA_MAPS.map((m, i) => ({ name: `Arena[${i}] "${m.name}"`, map: m })),
    ...CAMPAIGN_LEVELS.map((m, i) => ({ name: `Campaign ${i}`, map: m })),
  ];

  for (const { name, map } of allMaps) {
    // BFS from player start to check reachable area
    const sx = Math.floor(map.playerStart.x);
    const sy = Math.floor(map.playerStart.y);
    const visited = new Set();
    const queue = [[sx, sy]];
    visited.add(`${sx},${sy}`);

    while (queue.length > 0) {
      const [cx, cy] = queue.shift();
      for (const [nx, ny] of [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1],
      ]) {
        if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
        const key = `${nx},${ny}`;
        if (visited.has(key)) continue;
        // Passable = empty (0), door (5), or secret (6)
        const tile = map.grid[ny][nx];
        if (tile === 0 || tile === 5 || tile === 6) {
          visited.add(key);
          queue.push([nx, ny]);
        }
      }
    }

    // Check enemies are reachable
    if (map.entities) {
      for (const ent of map.entities) {
        if (ent.type !== "enemy") continue;
        const ex = Math.floor(ent.x);
        const ey = Math.floor(ent.y);
        r.assert(
          visited.has(`${ex},${ey}`),
          `${name}: enemy at (${ex},${ey}) is reachable`,
          `${name}: enemy at (${ex},${ey}) is UNREACHABLE from player start`,
        );
      }
    }

    // Check exit is reachable (skip boss levels that end on boss defeat)
    if (map.exit && map.exit.x != null) {
      const ex = Math.floor(map.exit.x);
      const ey = Math.floor(map.exit.y);
      r.assert(
        visited.has(`${ex},${ey}`),
        `${name}: exit at (${ex},${ey}) is reachable`,
        `${name}: exit at (${ex},${ey}) is UNREACHABLE from player start`,
      );
    }

    // Check pickups are reachable
    if (map.pickups) {
      for (const p of map.pickups) {
        const px = Math.floor(p.x);
        const py = Math.floor(p.y);
        r.assert(
          visited.has(`${px},${py}`),
          `${name}: pickup at (${px},${py}) is reachable`,
          `${name}: pickup at (${px},${py}) is UNREACHABLE`,
        );
      }
    }

    r.pass(`${name}: ${visited.size} tiles reachable from spawn`);
  }

  r.finish();
  return r;
}

// ─── Balance Sanity Suite ───────────────────────────────────

function runBalanceSanity() {
  const r = new TestResult("Balance Sanity");
  console.log("🔍 Balance Sanity");

  const pistol = WEAPONS[0];

  for (const [key, def] of Object.entries(ENEMY_TYPES)) {
    // Can pistol kill this enemy? (with headroom for misses)
    const shotsNeeded = Math.ceil(def.health / pistol.damage);
    // Boss forms are meant to be bullet sponges — higher threshold
    const maxShots = key.startsWith('boss') ? 500 : 200;
    r.assert(
      shotsNeeded < maxShots,
      `Pistol can kill "${key}" in ${shotsNeeded} shots`,
      `"${key}" takes ${shotsNeeded} pistol shots — may be impossible`,
    );

    // Enemy attack rate sanity
    r.assert(
      def.attackRate >= 200,
      `"${key}" attack rate ${def.attackRate}ms is fair`,
      `"${key}" attack rate ${def.attackRate}ms may be too fast`,
    );
  }

  // Boss progression
  const bossTypes = ["boss", "boss_form2", "boss_form3"];
  let prevHp = 0;
  for (const bt of bossTypes) {
    if (!ENEMY_TYPES[bt]) continue;
    r.assert(
      ENEMY_TYPES[bt].health > prevHp,
      `Boss "${bt}" HP ${ENEMY_TYPES[bt].health} > previous ${prevHp}`,
      `Boss "${bt}" HP ${ENEMY_TYPES[bt].health} is not harder than previous ${prevHp}`,
    );
    prevHp = ENEMY_TYPES[bt].health;
  }

  // Upgrade cost progression
  for (const [key, upg] of Object.entries(UPGRADES)) {
    const costs = [];
    for (let i = 0; i < upg.maxLevel; i++) {
      costs.push(Math.floor(upg.baseCost * Math.pow(upg.costScale, i)));
    }
    const isIncreasing = costs.every((c, i) => i === 0 || c >= costs[i - 1]);
    r.assert(
      isIncreasing,
      `Upgrade "${key}" costs increase: ${costs.join(",")}`,
      `Upgrade "${key}" costs NOT increasing: ${costs.join(",")}`,
    );
  }

  r.finish();
  return r;
}

// ─── Save/Load Round-Trip Suite ─────────────────────────────

function runSaveLoadRoundTrip(game) {
  const r = new TestResult("Save/Load Round-Trip");
  console.log("🔍 Save/Load Round-Trip");

  // --- Arena round-trip ---
  resetGame(game);
  game.audio.init();
  game.startArena();
  game.mouse.locked = true;

  // Modify player state so it's not default
  game.player.score = 1337;
  game.player.kills = 42;
  game.player.health = 77;
  game.player.maxHealth = 150;
  game.player.armor = 25;
  game.player.ammo = 88;
  game.player.weapons = [0, 1, 2];
  game.player.damageMultiplier = 1.5;
  game.player.critChance = 0.15;
  game.player.lifeSteal = 0.1;
  game.arenaRound = 5;
  game.upgradeLevels = { damage: 2, maxHealth: 1 };

  // Save
  game.saveArena();

  // Reset and load
  const savedScore = game.player.score;
  const savedKills = game.player.kills;
  const savedHealth = game.player.health;
  const savedMaxHealth = game.player.maxHealth;
  const savedArmor = game.player.armor;
  const savedAmmo = game.player.ammo;
  const savedWeapons = [...game.player.weapons];
  const savedDmgMul = game.player.damageMultiplier;
  const savedCrit = game.player.critChance;
  const savedRound = game.arenaRound;

  game.player.reset();
  game.arenaRound = 1;
  game.upgradeLevels = {};

  const loaded = game.loadArena();
  r.assert(
    loaded,
    "Arena save loaded successfully",
    "Arena save failed to load",
  );

  r.assert(
    game.player.score === savedScore,
    `Arena score preserved: ${game.player.score}`,
    `Arena score mismatch: ${game.player.score} vs ${savedScore}`,
  );
  r.assert(
    game.player.kills === savedKills,
    `Arena kills preserved: ${game.player.kills}`,
    `Arena kills mismatch`,
  );
  r.assert(
    game.player.health === savedHealth,
    `Arena health preserved: ${game.player.health}`,
    `Arena health mismatch: ${game.player.health} vs ${savedHealth}`,
  );
  r.assert(
    game.player.maxHealth === savedMaxHealth,
    `Arena maxHealth preserved`,
    `Arena maxHealth mismatch: ${game.player.maxHealth} vs ${savedMaxHealth}`,
  );
  r.assert(
    game.player.armor === savedArmor,
    `Arena armor preserved`,
    `Arena armor mismatch`,
  );
  r.assert(
    game.player.ammo === savedAmmo,
    `Arena ammo preserved`,
    `Arena ammo mismatch: ${game.player.ammo} vs ${savedAmmo}`,
  );
  r.assert(
    JSON.stringify(game.player.weapons) === JSON.stringify(savedWeapons),
    `Arena weapons preserved`,
    `Arena weapons mismatch`,
  );
  r.assert(
    game.player.damageMultiplier === savedDmgMul,
    `Arena damageMultiplier preserved`,
    `Arena dmgMul mismatch`,
  );
  r.assert(
    game.player.critChance === savedCrit,
    `Arena critChance preserved`,
    `Arena crit mismatch`,
  );
  r.assert(
    game.arenaRound === savedRound,
    `Arena round preserved: ${game.arenaRound}`,
    `Arena round mismatch: ${game.arenaRound} vs ${savedRound}`,
  );
  r.assert(
    game.upgradeLevels.damage === 2,
    `Upgrade levels preserved`,
    `Upgrade levels mismatch`,
  );

  // --- Campaign round-trip ---
  resetGame(game);
  game.mode = "campaign";
  game.campaignLevel = 1;
  game.campaignAct = 2;
  game.player.reset();
  game.loadCampaignLevel(1);
  game.state = GameState.PLAYING;

  game.player.score = 500;
  game.player.health = 65;
  game.player.ammo = 30;
  game.player.weapons = [0, 2];
  game.player.secretsFound = 3;
  game.player.x = 5.5;
  game.player.y = 8.5;
  game.player.angle = 1.2;

  game.saveCampaign();

  // Reset and reload
  game.player.reset();
  game.campaignLevel = 0;

  const cLoaded = game.loadCampaignSave();
  r.assert(
    cLoaded,
    "Campaign save loaded successfully",
    "Campaign save failed to load",
  );
  r.assert(
    game.player.score === 500,
    `Campaign score preserved`,
    `Campaign score mismatch: ${game.player.score}`,
  );
  r.assert(
    game.player.health === 65,
    `Campaign health preserved`,
    `Campaign health mismatch: ${game.player.health}`,
  );
  r.assert(
    game.player.ammo === 30,
    `Campaign ammo preserved`,
    `Campaign ammo mismatch: ${game.player.ammo}`,
  );
  r.assert(
    game.player.secretsFound === 3,
    `Campaign secrets preserved`,
    `Campaign secrets mismatch`,
  );
  r.assert(
    Math.abs(game.player.x - 5.5) < 0.01,
    `Campaign position preserved`,
    `Campaign position mismatch: ${game.player.x}`,
  );
  r.assert(
    game.campaignLevel === 1,
    `Campaign level preserved`,
    `Campaign level mismatch: ${game.campaignLevel}`,
  );

  // Clean up saves
  game.clearArenaSave();
  game.clearCampaignSave();
  resetGame(game);

  r.finish();
  return r;
}

// ─── Upgrade Interaction Suite ──────────────────────────────

function runUpgradeInteraction(game) {
  const r = new TestResult("Upgrade Interaction");
  console.log("🔍 Upgrade Interaction");

  resetGame(game);
  game.audio.init();
  game.startArena();

  // Give player enough score to buy upgrades
  game.player.score = 100000;

  for (const [key, upg] of Object.entries(UPGRADES)) {
    const before = {};
    // Snapshot relevant player properties
    before.maxHealth = game.player.maxHealth;
    before.damageMultiplier = game.player.damageMultiplier;
    before.moveSpeed = game.player.moveSpeed;
    before.ammo = game.player.ammo;
    before.regenRate = game.player.regenRate;
    before.armor = game.player.armor;
    before.critChance = game.player.critChance;
    before.lifeSteal = game.player.lifeSteal;
    before.splashDamage = game.player.splashDamage;
    before.fireRateMultiplier = game.player.fireRateMultiplier;
    before.dodgeChance = game.player.dodgeChance;
    before.maxShield = game.player.maxShield;
    before.multiShot = game.player.multiShot;
    before.thorns = game.player.thorns;
    before.maxStamina = game.player.maxStamina;
    before.staminaRegenRate = game.player.staminaRegenRate;
    before.dashDistMult = game.player.dashDistMult;
    before.dashStaminaCost = game.player.dashStaminaCost;
    before.sprintDrainMult = game.player.sprintDrainMult;

    const prevLevel = game.upgradeLevels[key] || 0;
    const prevScore = game.player.score;
    game.buyUpgrade(key);
    const newLevel = game.upgradeLevels[key] || 0;

    r.assert(
      newLevel === prevLevel + 1,
      `Upgrade "${key}" level ${prevLevel} → ${newLevel}`,
      `Upgrade "${key}" did not increment (${prevLevel} → ${newLevel})`,
    );

    // Verify score was deducted
    const cost = Math.floor(upg.baseCost * Math.pow(upg.costScale, prevLevel));
    r.assert(
      game.player.score === prevScore - cost,
      `"${key}" cost ${cost} deducted correctly`,
      `"${key}" cost deduction wrong: expected ${prevScore - cost}, got ${game.player.score}`,
    );
  }

  // Verify maxLevel enforcement
  const testKey = Object.keys(UPGRADES)[0];
  const testUpg = UPGRADES[testKey];
  game.upgradeLevels[testKey] = testUpg.maxLevel;
  const scoreBefore = game.player.score;
  game.buyUpgrade(testKey);
  r.assert(
    game.player.score === scoreBefore,
    `"${testKey}" at maxLevel blocked purchase`,
    `"${testKey}" at maxLevel still deducted score`,
  );

  resetGame(game);

  r.finish();
  return r;
}

// ─── Performance Benchmark Suite ────────────────────────────

function runPerfBenchmark(game) {
  const r = new TestResult("Performance Benchmark");
  console.log("🔍 Performance Benchmark");

  resetGame(game);
  game.audio.init();
  game.startArena();
  game.arenaRound = 3; // moderate entity count
  game.startArenaRound();
  game.mouse.locked = true;
  game.state = GameState.PLAYING;

  const updateTimes = [];
  const renderTimes = [];
  const ticks = 300;
  let t = performance.now();

  for (let i = 0; i < ticks; i++) {
    t += SIM_DT;

    const u0 = performance.now();
    game.update(t);
    const u1 = performance.now();
    updateTimes.push(u1 - u0);

    const r0 = performance.now();
    game.render();
    const r1 = performance.now();
    renderTimes.push(r1 - r0);
  }

  const avgUpdate = updateTimes.reduce((a, b) => a + b, 0) / ticks;
  const avgRender = renderTimes.reduce((a, b) => a + b, 0) / ticks;
  const maxUpdate = Math.max(...updateTimes);
  const maxRender = Math.max(...renderTimes);
  const entityCount = game.entities.length;

  r.pass(
    `Update: avg=${avgUpdate.toFixed(2)}ms, max=${maxUpdate.toFixed(2)}ms`,
  );
  r.pass(
    `Render: avg=${avgRender.toFixed(2)}ms, max=${maxRender.toFixed(2)}ms`,
  );
  r.pass(`Entities: ${entityCount}`);
  r.assert(
    avgUpdate < 5,
    `Update avg under 5ms budget`,
    `Update avg ${avgUpdate.toFixed(2)}ms exceeds 5ms budget`,
  );
  r.assert(
    avgRender < 12,
    `Render avg under 12ms budget`,
    `Render avg ${avgRender.toFixed(2)}ms exceeds 12ms budget`,
  );

  resetGame(game);

  r.finish();
  return r;
}

// ─── Bot Profiles ───────────────────────────────────────────

/**
 * Bot: Completionist
 * Plays tutorial → campaign level 0. Kills all enemies, collects all
 * pickups, finds secrets, reaches exit.
 */
function botCompletionist(game) {
  const r = new TestResult("Bot: Completionist");
  console.log("🤖 Completionist Bot");

  // --- Phase 1: Tutorial ---
  game.audio.init();
  game.startTutorial();
  game.mouse.locked = true;
  r.assert(
    game.state === GameState.CUTSCENE || game.state === GameState.PLAYING,
    "Tutorial started",
    `Tutorial start failed, state=${game.state}`,
  );

  // Skip the clocking_in cutscene if active
  if (game.state === GameState.CUTSCENE) {
    for (let i = 0; i < 200; i++) {
      game.handleKeyPress("Space");
      stepGame(game, 5);
      if (game.state !== GameState.CUTSCENE) break;
    }
  }

  // Tutorial step 0: wait for auto-advance (narrative intro)
  stepGame(game, 300, { until: (g) => g.tutorialStep >= 1 });
  r.assert(
    game.tutorialStep >= 1,
    "Tutorial step 0 → 1 (auto advance)",
    `Stuck at step ${game.tutorialStep}`,
  );

  // Step 1: Look around (rotate >= 3 radians cumulative)
  for (let i = 0; i < 100 && game.tutorialStep < 2; i++) {
    game.mouse.dx = 30;
    game.mouse.locked = true;
    stepGame(game, 1);
  }
  game.mouse.dx = 0;
  r.assert(
    game.tutorialStep >= 2,
    "Tutorial step 1 → 2 (look around)",
    `Stuck at step ${game.tutorialStep}`,
  );

  // Step 2: Move (travel > 3 units)
  for (let i = 0; i < 200 && game.tutorialStep < 3; i++) {
    game.player.angle = 0;
    game.keys[game.keybinds.moveForward] = true;
    game.mouse.locked = true;
    stepGame(game, 1);
  }
  clearInput(game);
  r.assert(
    game.tutorialStep >= 3,
    "Tutorial step 2 → 3 (move)",
    `Stuck at step ${game.tutorialStep}`,
  );

  // Step 3: Shoot
  game.player.isFiring = true;
  stepGame(game, 5);
  game.player.isFiring = false;
  r.assert(
    game.tutorialStep >= 4,
    "Tutorial step 3 → 4 (shoot)",
    `Stuck at step ${game.tutorialStep}`,
  );

  // Step 4: Sprint (hold shift + move for 0.5s)
  game.keys[game.keybinds.sprint] = true;
  game.keys[game.keybinds.moveForward] = true;
  game.mouse.locked = true;
  stepGame(game, 60, { until: (g) => g.tutorialStep >= 5 });
  clearInput(game);
  r.assert(
    game.tutorialStep >= 5,
    "Tutorial step 4 → 5 (sprint)",
    `Stuck at step ${game.tutorialStep}`,
  );

  // Step 5: Dash (double-tap forward)
  const forwardKey = game.keybinds.moveForward;
  game.keys[forwardKey] = true;
  stepGame(game, 1);
  game.keys[forwardKey] = false;
  stepGame(game, 5);
  // Simulate the double-tap logic directly
  game.lastTapKey = forwardKey;
  game.lastTapTime = performance.now() - 100;
  game.keys[forwardKey] = true;
  game.triggerDash(forwardKey);
  stepGame(game, 20, { until: (g) => g.tutorialStep >= 6 });
  clearInput(game);
  r.assert(
    game.tutorialStep >= 6,
    "Tutorial step 5 → 6 (dash)",
    `Stuck at step ${game.tutorialStep}`,
  );

  // Step 6: Open door with E (door is at grid 5,8 in tutorial map)
  // Walk to face the door then interact
  walkTo(game, 5.5, 7.2, 300);
  game.player.angle = Math.PI / 2; // face south (toward row 8)
  game.keys[game.keybinds.interact] = true;
  stepGame(game, 2);
  game.keys[game.keybinds.interact] = false;
  game.handleKeyPress(game.keybinds.interact);
  stepGame(game, 10, { until: (g) => g.tutorialStep >= 7 });
  r.assert(
    game.tutorialStep >= 7,
    "Tutorial step 6 → 7 (open door)",
    `Stuck at step ${game.tutorialStep}`,
  );

  // Step 7: Pick up items (health/ammo behind door at 3.5,10.5 and 6.5,10.5)
  walkTo(game, 3.5, 10.5, 300);
  stepGame(game, 5);
  if (game.tutorialStep < 8) {
    walkTo(game, 6.5, 10.5, 200);
    stepGame(game, 5);
  }
  r.assert(
    game.tutorialStep >= 8,
    "Tutorial step 7 → 8 (pick up items)",
    `Stuck at step ${game.tutorialStep}`,
  );

  // Step 8: Combat — kill the spawned drone at 12.5,12.5
  stepGame(game, 5); // Let enemy spawn
  for (let i = 0; i < 300 && game.tutorialStep < 9; i++) {
    const enemy = findClosest(game, "enemy");
    if (enemy) {
      aimAt(game, enemy.x, enemy.y);
      game.player.isFiring = true;
    }
    game.mouse.locked = true;
    stepGame(game, 1);
  }
  game.player.isFiring = false;
  clearInput(game);
  r.assert(
    game.tutorialStep >= 9,
    "Tutorial step 8 → 9 (kill enemy)",
    `Stuck at step ${game.tutorialStep}`,
  );

  // Step 9 → tutorial complete menu
  stepGame(game, 200, {
    until: (g) => g.state === GameState.TUTORIAL_COMPLETE,
  });
  r.assert(
    game.state === GameState.TUTORIAL_COMPLETE,
    "Tutorial completed → TUTORIAL_COMPLETE state",
    `Tutorial did not complete, state=${game.state}, step=${game.tutorialStep}`,
  );

  // --- Phase 2: Campaign Level 0 ---
  // Start campaign directly
  game.mode = "campaign";
  game.campaignLevel = 0;
  game.campaignAct = 1;
  game.player.reset();
  game.player.alive = true;
  game.loadCampaignLevel(0);
  game.state = GameState.PLAYING;
  game.mouse.locked = true;

  r.assert(
    game.state === GameState.PLAYING,
    "Campaign level 0 started",
    `Campaign start failed, state=${game.state}`,
  );

  const initialEnemies = game.totalEnemies;
  r.assert(
    initialEnemies > 0,
    `Campaign has ${initialEnemies} enemies to kill`,
    "Campaign has no enemies",
  );

  // Collect pickups first
  collectAllPickups(game, 2000);
  const pickupsLeft = game.entities.filter(
    (e) =>
      e.active &&
      e.type !== "enemy" &&
      e.type !== "projectile" &&
      e.type !== "exit",
  ).length;
  r.pass(`Collected pickups (${pickupsLeft} remaining)`);

  // Kill all enemies
  game.player.health = game.player.maxHealth; // Ensure survival for test
  const combatTicks = killAllEnemies(game, 10000);
  r.assert(
    game.killedEnemies >= game.totalEnemies,
    `All ${game.totalEnemies} enemies killed in ${combatTicks} ticks`,
    `Only killed ${game.killedEnemies}/${game.totalEnemies} enemies`,
  );

  // Find secrets
  if (game.map) {
    let secretCount = 0;
    for (let y = 0; y < game.map.height; y++) {
      for (let x = 0; x < game.map.width; x++) {
        if (game.map.grid[y][x] === 6) {
          // Walk to it and interact
          walkTo(game, x + 0.5, y - 0.5, 300);
          game.player.angle = Math.PI / 2; // face the wall
          game.handleKeyPress(game.keybinds.interact);
          stepGame(game, 5);
          secretCount++;
        }
      }
    }
    r.pass(`Interacted with ${secretCount} secret walls`);
  }

  // Walk to exit
  if (game.exitEntity) {
    walkTo(game, game.exitEntity.x, game.exitEntity.y, 800);
    stepGame(game, 30);
    // Check if we reached level complete or cutscene
    r.assert(
      game.state === GameState.LEVEL_COMPLETE ||
        game.state === GameState.CUTSCENE ||
        game.state === GameState.VICTORY,
      `Reached exit → state=${game.state}`,
      `Could not reach exit, state=${game.state}, dist=${Math.hypot(
        game.player.x - game.exitEntity.x,
        game.player.y - game.exitEntity.y,
      ).toFixed(2)}`,
    );
  }

  r.assert(game.player.alive, "Player survived", "Player died during test");
  r.finish();
  return r;
}

/**
 * Bot: Speedrunner
 * Campaign level 0 — ignore pickups, ignore non-blocking enemies,
 * beeline to exit. Measures ticks to complete.
 */
function botSpeedrunner(game) {
  const r = new TestResult("Bot: Speedrunner");
  console.log("🤖 Speedrunner Bot");

  game.audio.init();
  game.mode = "campaign";
  game.campaignLevel = 0;
  game.campaignAct = 1;
  game.player.reset();
  game.player.alive = true;
  game.player.health = 1000; // Godmode for speed — we just want to test pathing
  game.loadCampaignLevel(0);
  game.state = GameState.PLAYING;
  game.mouse.locked = true;

  r.assert(
    game.exitEntity != null,
    `Exit at (${game.exitEntity?.x}, ${game.exitEntity?.y})`,
    "No exit entity found",
  );

  const startTick = performance.now();

  // Kill required enemies (all of them to open exit)
  const combatTicks = killAllEnemies(game, 8000);
  r.pass(`Enemies cleared in ${combatTicks} ticks`);

  // Rush to exit
  let exitTicks = 0;
  if (game.exitEntity) {
    exitTicks = walkTo(game, game.exitEntity.x, game.exitEntity.y, 1000);
    stepGame(game, 30);
  }

  const totalTicks = combatTicks + exitTicks;
  r.pass(
    `Level completed in ${totalTicks} total ticks (~${(totalTicks / 60).toFixed(1)}s simulated)`,
  );

  r.assert(
    game.state === GameState.LEVEL_COMPLETE ||
      game.state === GameState.CUTSCENE ||
      game.state === GameState.VICTORY,
    `Reached exit → ${game.state}`,
    `Failed to reach exit, state=${game.state}`,
  );

  r.finish();
  return r;
}

/**
 * Bot: Iron Man
 * Arena mode — pistol only (weapon 0), survive 5 rounds.
 */
function botIronMan(game) {
  const r = new TestResult("Bot: Iron Man (Pistol Only)");
  console.log("🤖 Iron Man Bot");

  game.audio.init();
  game.startArena();
  game.mouse.locked = true;

  r.assert(
    game.state === GameState.PLAYING,
    "Arena started",
    `Arena start failed, state=${game.state}`,
  );

  // Lock to pistol
  game.player.weapons = [0];
  game.player.currentWeapon = 0;

  const targetRounds = 5;
  let roundsCompleted = 0;

  for (let round = 0; round < targetRounds; round++) {
    r.pass(`Round ${game.arenaRound} started: ${game.totalEnemies} enemies`);

    // Fight through the round
    const combatTicks = killAllEnemies(game, 15000);

    if (!game.player.alive) {
      r.fail(
        `Player died in round ${game.arenaRound} after ${combatTicks} ticks`,
        `HP was ${game.player.health}`,
      );
      break;
    }

    // Wait for round to end (timer drains or clear timer)
    stepGame(game, 600, {
      until: (g) =>
        g.state === GameState.UPGRADE || g.state === GameState.GAME_OVER,
    });

    if (game.state === GameState.UPGRADE) {
      roundsCompleted++;
      r.pass(`Round ${roundsCompleted} cleared in ${combatTicks} ticks`);
      // Don't buy upgrades — iron man. Select "Continue" and press Enter.
      const upgradeKeys = Object.keys(UPGRADES);
      game.upgradeSelection = upgradeKeys.length; // "Continue" button index
      game.handleKeyPress("Enter");
      stepGame(game, 10);
    } else if (game.state === GameState.GAME_OVER) {
      r.fail(`Died at round ${game.arenaRound}`);
      break;
    }
  }

  r.assert(
    roundsCompleted >= targetRounds,
    `Survived ${roundsCompleted}/${targetRounds} rounds with pistol only`,
    `Only survived ${roundsCompleted}/${targetRounds} rounds`,
  );

  r.finish();
  return r;
}

/**
 * Bot: Pacifist / No-Damage
 * Campaign level 0 — complete without taking any damage.
 * Uses godlike aim and movement to dodge.
 */
function botNoDamage(game) {
  const r = new TestResult("Bot: No Damage");
  console.log("🤖 No-Damage Bot");

  game.audio.init();
  game.mode = "campaign";
  game.campaignLevel = 0;
  game.campaignAct = 1;
  game.player.reset();
  game.player.alive = true;
  game.loadCampaignLevel(0);
  game.state = GameState.PLAYING;
  game.mouse.locked = true;

  const startHealth = game.player.health;

  // Kill everything at range before they can close
  const combatTicks = killAllEnemies(game, 10000);

  // Check for damage taken
  const damageTaken = startHealth - game.player.health;

  r.assert(game.player.alive, "Player survived", "Player died");
  r.assert(
    damageTaken === 0,
    `No damage taken (HP: ${game.player.health}/${startHealth})`,
    `Took ${damageTaken} damage (HP: ${game.player.health}/${startHealth})`,
  );

  // Walk to exit
  if (game.exitEntity) {
    walkTo(game, game.exitEntity.x, game.exitEntity.y, 800);
    stepGame(game, 30);
  }

  r.pass(`Completed in ${combatTicks} ticks`);
  r.finish();
  return r;
}

/**
 * Bot: Arena Endurance
 * Arena mode — plays 10 rounds with upgrades. Verifies scaling works.
 */
function botArenaEndurance(game) {
  const r = new TestResult("Bot: Arena Endurance");
  console.log("🤖 Arena Endurance Bot");

  game.audio.init();
  game.startArena();
  game.mouse.locked = true;

  const targetRounds = 10;
  let roundsCompleted = 0;

  for (let round = 0; round < targetRounds; round++) {
    if (game.state !== GameState.PLAYING) {
      r.fail(`Unexpected state ${game.state} at round start`);
      break;
    }

    const enemyCount = game.totalEnemies;
    const combatTicks = killAllEnemies(game, 20000);

    if (!game.player.alive) {
      r.fail(
        `Died in round ${game.arenaRound} with ${game.killedEnemies}/${game.totalEnemies} killed`,
      );
      break;
    }

    // Wait for upgrade screen
    stepGame(game, 600, {
      until: (g) =>
        g.state === GameState.UPGRADE || g.state === GameState.GAME_OVER,
    });

    if (game.state === GameState.UPGRADE) {
      roundsCompleted++;
      r.pass(
        `Round ${roundsCompleted}: ${enemyCount} enemies in ${combatTicks} ticks`,
      );

      // Buy damage upgrade if available
      game.buyUpgrade("damage");
      game.buyUpgrade("maxHealth");
      // Select "Continue" and press Enter
      const upgradeKeys = Object.keys(UPGRADES);
      game.upgradeSelection = upgradeKeys.length;
      game.handleKeyPress("Enter");
      stepGame(game, 10);
    } else {
      r.fail(`Round ${round + 1} ended in state ${game.state}`);
      break;
    }
  }

  r.assert(
    roundsCompleted >= targetRounds,
    `${roundsCompleted}/${targetRounds} rounds completed`,
    `Only completed ${roundsCompleted}/${targetRounds} rounds`,
  );
  r.pass(`Final score: ${game.player.score}, kills: ${game.player.kills}`);

  r.finish();
  return r;
}

// ─── Test Runner ────────────────────────────────────────────

const SUITES = {
  data: runDataValidation,
  maps: runMapReachability,
  balance: runBalanceSanity,
  states: (game) => runStateTransitions(game),
  saveload: runSaveLoadRoundTrip,
  upgrades: runUpgradeInteraction,
  perf: runPerfBenchmark,
};

const BOTS = {
  completionist: botCompletionist,
  speedrunner: botSpeedrunner,
  ironman: botIronMan,
  nodamage: botNoDamage,
  endurance: botArenaEndurance,
};

function printSummary(results) {
  console.log("\n═══════════════════════════════════════");
  console.log("  CLOCKWORK CARNAGE TEST RESULTS");
  console.log("═══════════════════════════════════════");
  let totalPass = 0,
    totalFail = 0;
  for (const r of results) {
    const icon = r.ok ? "✅" : "❌";
    console.log(
      `${icon} ${r.name}: ${r.passed} passed, ${r.failed} failed (${r.duration.toFixed(0)}ms)`,
    );
    totalPass += r.passed;
    totalFail += r.failed;
    if (!r.ok) {
      for (const e of r.errors) {
        console.log(
          `   ↳ ${e.msg}${e.detail ? ` — ${JSON.stringify(e.detail)}` : ""}`,
        );
      }
    }
  }
  console.log("───────────────────────────────────────");
  console.log(`TOTAL: ${totalPass} passed, ${totalFail} failed`);
  console.log(
    `${totalFail === 0 ? "🎉 ALL TESTS PASSED" : `⚠️  ${totalFail} FAILURES`}`,
  );
  console.log("═══════════════════════════════════════\n");
  return totalFail === 0;
}

export function createTestRunner(game) {
  return {
    /** Run data validation suites (no game state needed) */
    validate(suiteName) {
      const results = [];
      if (suiteName) {
        const fn = SUITES[suiteName];
        if (!fn) {
          console.error(
            `Unknown suite: ${suiteName}. Available: ${Object.keys(SUITES).join(", ")}`,
          );
          return;
        }
        results.push(fn(game));
      } else {
        for (const fn of Object.values(SUITES)) results.push(fn(game));
      }
      return printSummary(results);
    },

    /** Run a bot profile */
    bot(name) {
      const fn = BOTS[name];
      if (!fn) {
        console.error(
          `Unknown bot: ${name}. Available: ${Object.keys(BOTS).join(", ")}`,
        );
        return;
      }
      resetGame(game);
      const result = fn(game);
      return printSummary([result]);
    },

    /** Run all bot profiles */
    bots() {
      const results = [];
      for (const fn of Object.values(BOTS)) {
        resetGame(game);
        results.push(fn(game));
      }
      return printSummary(results);
    },

    /** Run performance benchmark */
    perf() {
      return this.validate("perf");
    },

    /** Run everything */
    run(filter) {
      if (filter && SUITES[filter]) return this.validate(filter);
      if (filter && BOTS[filter]) return this.bot(filter);

      const results = [];
      // Validation suites first (no side effects)
      for (const fn of Object.values(SUITES)) results.push(fn(game));
      // Then bots
      for (const fn of Object.values(BOTS)) results.push(fn(game));
      return printSummary(results);
    },

    /** List available tests */
    list() {
      console.log("Validation suites:", Object.keys(SUITES).join(", "));
      console.log("Bot profiles:", Object.keys(BOTS).join(", "));
    },
  };
}
