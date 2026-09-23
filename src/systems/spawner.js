// ─── Spawner ────────────────────────────────────────────────────────────────
// Pure entity-creation functions for arena / campaign / meltdown.
// No game state mutation — returns entity arrays for the caller to place.
// ────────────────────────────────────────────────────────────────────────────
import { Enemy, Pickup, Prop } from "../../js/entities.js";
import { ENEMY_TYPES } from "../../js/data.js";
import { SeededRNG } from "../utils/seeded-rng.js";
import { ACTS, getAct } from "../data/campaign/acts.js";

/**
 * Per-instance palette jitter — shift HSL hue ±8° and lightness ±6% so
 * sibling enemies of the same type don't look mass-produced. Bosses and
 * shielded variants are intentionally not jittered (they're recognisable
 * landmarks, not background noise).
 *
 * Returns [baseHex, darkHex]. Pure; safe to call at spawn or replacement.
 */
export function jitterPalette(baseHex, darkHex, kind) {
  if (!baseHex || ENEMY_TYPES[kind]?.boss) {
    return [baseHex, darkHex];
  }
  const dh = (Math.random() - 0.5) * 16;        // ±8°
  const dl = (Math.random() - 0.5) * 0.12;       // ±6%
  return [shiftHsl(baseHex, dh, dl), shiftHsl(darkHex, dh, dl * 0.6)];
}

function shiftHsl(hex, dHue, dLight) {
  if (!hex || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  h = (h * 360 + dHue + 360) % 360 / 360;
  const nl = Math.max(0, Math.min(1, l + dLight));
  return hslToHex(h, s, nl);
}

function hslToHex(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
  return "#" + toHex(r) + toHex(g) + toHex(b);
}

/**
 * Difficulty multipliers from a settings.difficulty value (0-3).
 * @param {number} difficulty
 * @returns {{ healthMul: number, damageMul: number, speedMul: number, spawnMul: number, timerBonus: number }}
 */
export function getDifficultyMultipliers(difficulty) {
  switch (difficulty) {
    case 0:
      return {
        healthMul: 0.6,
        damageMul: 0.5,
        speedMul: 0.8,
        spawnMul: 0.7,
        timerBonus: 20,
      };
    case 2:
      return {
        healthMul: 1.4,
        damageMul: 1.4,
        speedMul: 1.15,
        spawnMul: 1.3,
        timerBonus: -10,
      };
    case 3:
      return {
        healthMul: 2.0,
        damageMul: 1.8,
        speedMul: 1.3,
        spawnMul: 1.6,
        timerBonus: -20,
      };
    default:
      return {
        healthMul: 1.0,
        damageMul: 1.0,
        speedMul: 1.0,
        spawnMul: 1.0,
        timerBonus: 0,
      };
  }
}

/**
 * Build the arena enemy type pool for a given round.
 * @param {number} round
 * @returns {string[]}
 */
export function getArenaEnemyTypes(round) {
  const types = ["drone", "glitchling"];
  if (round >= 2) types.push("phantom", "corruptCop");
  if (round >= 4) types.push("beast", "sentinel");
  if (round >= 6) types.push("henchman", "chronoBomber");
  if (round >= 8) types.push("shieldCommander");
  if (round >= 10) types.push("temporalSummoner");
  return types;
}

/**
 * Create scaled enemies for an arena round.
 * @param {number} round
 * @param {{ x: number, y: number }[]} validSpawns - pre-filtered spawn points
 * @param {ReturnType<getDifficultyMultipliers>} diff
 * @param {SeededRNG} [rng] - optional seeded RNG for reproducible spawns
 * @returns {Enemy[]}
 */
export function createArenaEnemies(round, validSpawns, diff, rng) {
  const types = getArenaEnemyTypes(round);
  const count = Math.min(
    validSpawns.length,
    Math.floor((4 + round * 3) * diff.spawnMul),
  );
  const enemies = [];
  for (let i = 0; i < count; i++) {
    const spawn = validSpawns[i % validSpawns.length];
    const type = rng ? rng.pick(types) : types[Math.floor(Math.random() * types.length)];
    const e = new Enemy(spawn.x, spawn.y, type);
    e.health = Math.floor(e.health * (1 + (round - 1) * 0.15) * diff.healthMul);
    e.maxHealth = e.health;
    e.def = {
      ...e.def,
      damage: Math.floor(e.def.damage * diff.damageMul),
      speed: e.def.speed * diff.speedMul,
    };
    enemies.push(e);
  }
  return enemies;
}

/**
 * Create pickups for an arena round (map pickups + milestone weapon).
 * @param {{ x: number, y: number, type: string, weaponId?: number }[]} mapPickups
 * @param {number} round
 * @param {{ width: number }} map
 * @returns {Pickup[]}
 */
export function createArenaPickups(mapPickups, round, map) {
  const pickups = [];
  for (const p of mapPickups) {
    pickups.push(
      new Pickup(p.x + 0.5, p.y + 0.5, p.type, { weaponId: p.weaponId }),
    );
  }
  // Extra weapon at milestone rounds
  if (round >= 3) {
    const mx = map.width - 4.5;
    const my = 4.5;
    const weaponId = round >= 5 ? 3 : 2;
    pickups.push(new Pickup(mx, my, "weapon", { weaponId }));
  }
  return pickups;
}

/**
 * Filter arena spawn points: minimum distance from player, on empty tiles, shuffled.
 * @param {{ x: number, y: number }[]} spawns
 * @param {number} px - player x
 * @param {number} py - player y
 * @param {number[][]} grid
 * @param {SeededRNG} [rng] - optional seeded RNG for reproducible shuffle
 * @returns {{ x: number, y: number }[]}
 */
export function filterArenaSpawns(spawns, px, py, grid, rng) {
  const filtered = spawns
    .filter((s) => {
      const dx = s.x - px;
      const dy = s.y - py;
      if (Math.sqrt(dx * dx + dy * dy) < 5) return false;
      const gx = Math.floor(s.x);
      const gy = Math.floor(s.y);
      if (gy < 0 || gy >= grid.length || gx < 0 || gx >= grid[0].length)
        return false;
      return grid[gy][gx] === 0;
    });
  return rng ? rng.shuffle(filtered) : filtered.sort(() => Math.random() - 0.5);
}

/**
 * Create scaled entities for a campaign level.
 * @param {{ entities: Array, exit?: { x: number, y: number } }} level
 * @param {number} act - ACTS id: its boss type replaces the map's "boss", and
 *   its scale applies to everything else
 * @param {number} ngPlusCycle
 * @param {ReturnType<getDifficultyMultipliers>} diff
 * @returns {{ entities: (Enemy|Pickup)[], exitEntity: Object|null }}
 */
export function createCampaignEntities(level, act, ngPlusCycle, diff) {
  const actDef = getAct(act);
  const ngScale = 1 + (ngPlusCycle || 0) * 0.3;
  const result = [];
  const gW = level.width ?? level.grid?.[0]?.length ?? 0;
  const gH = level.height ?? level.grid?.length ?? 0;
  const nudge = (x, y) => {
    if (!level.grid) return { x, y };
    const gx = x | 0,
      gy = y | 0;
    const pos = validatePropPosition(gx, gy, level.grid, gW, gH);
    return pos ? { x: pos.x + 0.5, y: pos.y + 0.5 } : { x, y };
  };

  for (const e of level.entities) {
    const safe = nudge(e.x, e.y);
    if (e.type === "enemy") {
      let enemyType = e.enemyType;
      if (enemyType === "boss") enemyType = actDef?.boss.type ?? "boss";
      const enemy = new Enemy(safe.x, safe.y, enemyType);
      const actScale = ENEMY_TYPES[enemyType]?.boss ? 1 : (actDef?.scale ?? 1);
      enemy.health = Math.floor(
        enemy.health * diff.healthMul * actScale * ngScale,
      );
      enemy.maxHealth = enemy.health;
      enemy.def = {
        ...enemy.def,
        damage: Math.floor(
          enemy.def.damage * diff.damageMul * actScale * ngScale,
        ),
        speed: enemy.def.speed * diff.speedMul * (1 + (ngPlusCycle || 0) * 0.1),
      };
      result.push(enemy);
    } else {
      result.push(new Pickup(safe.x, safe.y, e.type, { weaponId: e.weaponId }));
    }
  }

  let exitEntity = null;
  if (level.exit) {
    const safeExit = nudge(level.exit.x, level.exit.y);
    exitEntity = {
      x: safeExit.x,
      y: safeExit.y,
      type: "exit",
      active: true,
    };
    result.push(exitEntity);
  }

  // Environmental props (non-interactive decoration, wall-validated)
  if (Array.isArray(level.props) && level.grid) {
    const w = level.width ?? level.grid[0]?.length ?? 0;
    const h = level.height ?? level.grid.length ?? 0;
    for (const p of level.props) {
      const pos = validatePropPosition(p.x | 0, p.y | 0, level.grid, w, h);
      if (pos) result.push(new Prop(pos.x + 0.5, pos.y + 0.5, p.type));
    }
  }

  return { entities: result, exitEntity };
}

/**
 * Create pickups for missed weapons from previous campaign levels.
 * @param {number[]} missedWeapons - weapon IDs not yet collected
 * @param {number[]} playerWeapons - weapon IDs player currently has
 * @param {number} sx - player start x
 * @param {number} sy - player start y
 * @returns {Pickup[]}
 */
export function createMissedWeaponPickups(
  missedWeapons,
  playerWeapons,
  sx,
  sy,
) {
  const pickups = [];
  for (let i = 0; i < missedWeapons.length; i++) {
    const wid = missedWeapons[i];
    if (!playerWeapons.includes(wid)) {
      const angle = (i / missedWeapons.length) * Math.PI * 2;
      pickups.push(
        new Pickup(
          sx + Math.cos(angle) * 1.5,
          sy + Math.sin(angle) * 1.5,
          "weapon",
          { weaponId: wid },
        ),
      );
    }
  }
  return pickups;
}

/**
 * Create scaled enemies for a meltdown corridor.
 * @param {{ x: number, y: number, type: string }[]} enemySpawns
 * @param {ReturnType<getDifficultyMultipliers>} diff
 * @returns {Enemy[]}
 */
export function createMeltdownEnemies(enemySpawns, diff) {
  const enemies = [];
  for (const es of enemySpawns) {
    const et = ENEMY_TYPES[es.type] || ENEMY_TYPES.drone;
    const e = new Enemy(es.x, es.y, es.type);
    e.health = et.health * diff.healthMul;
    e.maxHealth = e.health;
    e.speed = et.speed * diff.speedMul;
    e.damage = (et.damage || 10) * diff.damageMul;
    e.aiType = et.aiType || "patrol";
    const [bc, dc] = jitterPalette(et.baseColor || "#ff0000", et.darkColor || "#880000", e.enemyType);
    e.baseColor = bc;
    e.darkColor = dc;
    enemies.push(e);
  }
  return enemies;
}

/**
 * Create pickups for meltdown corridor.
 * @param {{ x: number, y: number, type: string, weaponId?: number }[]} pickupSpawns
 * @returns {Pickup[]}
 */
export function createMeltdownPickups(pickupSpawns) {
  return pickupSpawns.map(
    (pk) => new Pickup(pk.x, pk.y, pk.type, { weaponId: pk.weaponId }),
  );
}

// ── Act-aware enemy roster ──────────────────────────────────────────────────

/**
 * Remap enemy types to act-appropriate roster. Mutates entities in place.
 * The roster and substitutes are the act's row in ACTS; an unknown act
 * keeps Act 1's roster and swaps nothing.
 * @param {Enemy[]} entities
 * @param {number} act
 * @param {ReturnType<getDifficultyMultipliers>} diff
 */
export function applyActEnemyRoster(entities, act, diff) {
  const actDef = getAct(act);
  const roster = actDef?.roster ?? ACTS[0].roster;
  const subs = actDef?.substitutes ?? {};
  for (const e of entities) {
    if (e.type !== "enemy") continue;
    if (ENEMY_TYPES[e.enemyType]?.boss) continue;
    if (e.enemyType && !roster.includes(e.enemyType)) {
      const replacement = subs[e.enemyType];
      if (replacement && ENEMY_TYPES[replacement]) {
        const def = ENEMY_TYPES[replacement];
        e.enemyType = replacement;
        e.health = def.health * diff.healthMul;
        e.maxHealth = e.health;
        e.speed = def.speed * diff.speedMul;
        e.damage = (def.damage || 10) * diff.damageMul;
        const [bc2, dc2] = jitterPalette(def.color1 || "#ff0000", def.color2 || "#880000", e.enemyType);
        e.baseColor = bc2;
        e.darkColor = dc2;
      }
    }
  }
}

/**
 * Validate a prop's grid position isn't inside a wall.
 * If it is, BFS-nudge to the nearest open cell (max 5 tiles).
 * @param {number} x - grid column (integer)
 * @param {number} y - grid row (integer)
 * @param {number[][]} grid - map grid (0 = open, >0 = wall/door)
 * @param {number} w - map width
 * @param {number} h - map height
 * @returns {{ x: number, y: number } | null} valid position or null
 */
export function validatePropPosition(x, y, grid, w, h) {
  if (x >= 0 && y >= 0 && x < w && y < h && grid[y][x] === 0) return { x, y };
  // BFS nearest open cell
  const queue = [[x, y, 0]];
  const seen = new Set([`${x},${y}`]);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (let i = 0; i < queue.length; i++) {
    const [cx, cy, d] = queue[i];
    if (d > 5) break;
    for (const [dx, dy] of dirs) {
      const nx = cx + dx,
        ny = cy + dy;
      const k = `${nx},${ny}`;
      if (seen.has(k)) continue;
      seen.add(k);
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && grid[ny][nx] === 0)
        return { x: nx, y: ny };
      queue.push([nx, ny, d + 1]);
    }
  }
  return null;
}
