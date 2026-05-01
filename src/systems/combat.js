/**
 * combat.js — Pure combat math extracted from game.js damageEnemy/damagePlayer.
 * No game state, no audio, no particles — just numbers in, numbers out.
 */

import {
  ENEMY_HIT_HEIGHT_PAD,
  ENEMY_HIT_ANGLE_MIN,
  ENEMY_HIT_RADIUS_MIN,
  ENEMY_HIT_RADIUS_PAD,
  ENEMY_HIT_VERTICAL_ANGLE_MIN,
  HEADSHOT_PRECISION_PAD,
  ZONE_RADIUS_PAD,
} from "../constants.js";

/**
 * Calculate final damage to an enemy after crit, front shield, and energy shield.
 * Mutates enemy._shield if present (absorbs damage).
 *
 * @returns {{ finalDamage: number, isCrit: boolean, shieldSpark: boolean }}
 */
export function calculateEnemyDamage(baseDamage, enemy, playerCritChance, playerPos) {
  let finalDamage = baseDamage;
  let isCrit = false;
  let shieldSpark = false;

  // Critical hit
  if (playerCritChance && Math.random() < playerCritChance) {
    finalDamage *= 2;
    isCrit = true;
  }

  // Front shield — shield commanders take 80% less from front
  if (enemy.def.frontShield) {
    const dx = playerPos.x - enemy.x;
    const dy = playerPos.y - enemy.y;
    const angleToPlayer = Math.atan2(dy, dx);
    const facingAngle = enemy.angle || 0;
    let angleDiff = Math.abs(angleToPlayer - facingAngle);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    if (angleDiff < Math.PI / 3) {
      finalDamage *= 0.2;
    }
  }

  // Energy shield absorption
  if (enemy._shield && enemy._shield > 0) {
    const absorb = Math.min(enemy._shield, finalDamage);
    enemy._shield -= absorb;
    finalDamage -= absorb;
    if (absorb > 0) shieldSpark = true;
  }

  return { finalDamage, isCrit, shieldSpark };
}

/**
 * Apply splash damage to nearby enemies. Returns array of killed targets.
 * Mutates target health/state directly.
 *
 * @returns {Array<Object>} killed enemies (need post-processing: score, particles, etc.)
 */
export function applySplashDamage(entities, sourceEnemy, finalDamage, splashMultiplier, time) {
  const splashRadius = 2.5;
  const splashDmg = finalDamage * splashMultiplier;
  const killed = [];

  for (const target of entities) {
    if (target === sourceEnemy || target.type !== "enemy" || !target.active || target.state === "dead") continue;
    const dx = target.x - sourceEnemy.x;
    const dy = target.y - sourceEnemy.y;
    if (dx * dx + dy * dy >= splashRadius * splashRadius) continue;

    target.health -= splashDmg;
    target.hitTime = time;
    if (target.health <= 0) {
      target.state = "dead";
      target.dissolving = true;
      target.dissolveTimer = 0.5;
      target.deathTime = time;
      killed.push(target);
    }
  }

  return killed;
}

/**
 * Mark an enemy as dead (state transition).
 */
export function markEnemyDead(enemy, time) {
  enemy.state = "dead";
  enemy.dissolving = true;
  enemy.dissolveTimer = 0.5;
  enemy.deathTime = time;
}

/**
 * Calculate damage to player after dodge, armor, and shield.
 * Mutates player.shield if absorbing.
 *
 * @returns {{ actualDamage: number, dodged: boolean, shieldAbsorbed: number }}
 */
export function calculatePlayerDamage(amount, player) {
  // Dodge
  if (player.dodgeChance > 0 && Math.random() < player.dodgeChance) {
    return { actualDamage: 0, dodged: true, shieldAbsorbed: 0 };
  }

  let actualDamage = Math.max(1, amount - player.armor * 0.3);
  let shieldAbsorbed = 0;

  if (player.shield > 0) {
    shieldAbsorbed = Math.min(player.shield, actualDamage);
    player.shield -= shieldAbsorbed;
    actualDamage -= shieldAbsorbed;
  }

  return { actualDamage, dodged: false, shieldAbsorbed };
}

/**
 * Check if an enemy is a campaign boss type.
 */
export function isBossEnemy(enemy) {
  return enemy.enemyType === "boss" ||
    enemy.enemyType === "boss_form2" ||
    enemy.enemyType === "boss_form3";
}

export function aimHitsTargetHeight(aimHeight, enemy) {
  const center = enemy.def?.hitCenter ?? 0.35;
  const halfHeight = (enemy.def?.hitHeight ?? 0.55) + ENEMY_HIT_HEIGHT_PAD;
  return Math.abs(aimHeight - center - (enemy.z || 0)) <= halfHeight;
}

export function enemyHitRadius(enemy) {
  return Math.max(ENEMY_HIT_RADIUS_MIN, (enemy.def?.radius || 0) + ENEMY_HIT_RADIUS_PAD);
}

export function distanceToWall(player, dirX, dirY, map, range) {
  let mapX = Math.floor(player.x);
  let mapY = Math.floor(player.y);
  const deltaDistX = Math.abs(1 / (Math.abs(dirX) < 1e-9 ? 1e-9 : dirX));
  const deltaDistY = Math.abs(1 / (Math.abs(dirY) < 1e-9 ? 1e-9 : dirY));
  const stepX = dirX < 0 ? -1 : 1;
  const stepY = dirY < 0 ? -1 : 1;
  let sideDistX = dirX < 0
    ? (player.x - mapX) * deltaDistX
    : (mapX + 1 - player.x) * deltaDistX;
  let sideDistY = dirY < 0
    ? (player.y - mapY) * deltaDistY
    : (mapY + 1 - player.y) * deltaDistY;
  let side = 0;

  while (true) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1;
    }

    if (mapX < 0 || mapY < 0 || mapX >= map.width || mapY >= map.height) return range;
    const dist = side === 0
      ? (mapX - player.x + (1 - stepX) / 2) / dirX
      : (mapY - player.y + (1 - stepY) / 2) / dirY;
    if (dist > range) return range;
    if (map.grid[mapY][mapX] > 0) return Math.max(0, dist);
  }
}

export function rayEnemyHit(player, dirX, dirY, range, pitch, enemy) {
  if (enemy.type !== "enemy" || !enemy.active || enemy.state === "dead") return null;

  const ex = enemy.x - player.x;
  const ey = enemy.y - player.y;
  const along = ex * dirX + ey * dirY;
  if (along <= 0 || along > range) return null;

  const aimHeight = Math.tan(pitch || 0) * along;

  // Resolve which zone the bullet would land in (head/core/legs/armor/body).
  // Tight zones (heads) get a smaller angular pad so headshots reward precision.
  const zone = resolveHitZone(enemy, aimHeight, dirX, dirY);
  const angleScale = zone.tight ? HEADSHOT_PRECISION_PAD : 1;

  const lateralX = ex - dirX * along;
  const lateralY = ey - dirY * along;
  const radius = Math.max(
    enemyHitRadius(enemy) - (zone.tight ? ZONE_RADIUS_PAD : 0),
    along * ENEMY_HIT_ANGLE_MIN * angleScale,
  );
  if (lateralX * lateralX + lateralY * lateralY > radius * radius) {
    // Lateral miss inside a tight zone — try again as the surrounding "body"
    // zone so a near-headshot still counts as a body hit instead of a whiff.
    if (zone.tight) {
      const bodyRadius = Math.max(enemyHitRadius(enemy), along * ENEMY_HIT_ANGLE_MIN);
      if (lateralX * lateralX + lateralY * lateralY > bodyRadius * bodyRadius) return null;
      // Demote zone to body for damage purposes.
      const center = (enemy.def?.hitCenter ?? 0.35) + (enemy.z || 0);
      const halfHeight = Math.max(
        (enemy.def?.hitHeight ?? 0.55) + ENEMY_HIT_HEIGHT_PAD,
        along * ENEMY_HIT_VERTICAL_ANGLE_MIN,
      );
      if (Math.abs(aimHeight - center) > halfHeight) return null;
      return { enemy, dist: along, zone: { name: "body", mult: 1, tight: false } };
    }
    return null;
  }
  const center = (enemy.def?.hitCenter ?? 0.35) + (enemy.z || 0);
  const halfHeight = Math.max(
    (enemy.def?.hitHeight ?? 0.55) + ENEMY_HIT_HEIGHT_PAD,
    along * ENEMY_HIT_VERTICAL_ANGLE_MIN,
  );
  if (Math.abs(aimHeight - center) > halfHeight) return null;

  return { enemy, dist: along, zone };
}

/**
 * Resolve which hit zone a bullet lands in given enemy + ray vertical height.
 *
 * Zone schema (per-enemy `def.hitZones[]`):
 *   { name, top, bottom, mult, tight?, frontOnly?, rearOnly? }
 * top/bottom are in enemy-local Y (0 = feet of hitbox, 2*hitHeight = top).
 *
 * Returns { name, mult, tight }. Falls back to { body, 1, false } when no
 * zones defined or no zone matches the ray.
 *
 * Front/rear gating: bullet's travel direction (`dirX/dirY`) is compared
 * against `enemy.angle`. Front = bullet hits enemy from the side it's
 * facing (within ±60°). Used for armor plates / rear weak points.
 */
export function resolveHitZone(enemy, aimHeight, dirX, dirY) {
  const zones = enemy.def?.hitZones;
  if (!zones || !zones.length) return { name: "body", mult: 1, tight: false };

  const hitCenter = enemy.def?.hitCenter ?? 0.35;
  const hitHeight = enemy.def?.hitHeight ?? 0.55;
  const z = enemy.z || 0;
  // Local Y = aim height relative to feet of hitbox.
  const localY = aimHeight - (z + hitCenter - hitHeight);

  for (const zone of zones) {
    if (localY > zone.top || localY < zone.bottom) continue;
    if (zone.frontOnly || zone.rearOnly) {
      const facing = enemy.angle || 0;
      const bulletDir = Math.atan2(dirY, dirX);
      // Bullet is "from the front" when its travel vector points roughly
      // opposite to the enemy's facing — i.e. the bullet flies into the
      // enemy's face. atan2 of (-dirX, -dirY) gives the bullet's incoming
      // direction; compare to enemy.angle.
      const incoming = bulletDir + Math.PI;
      let diff = incoming - facing;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      const front = Math.abs(diff) < Math.PI / 3;
      if (zone.frontOnly && !front) continue;
      if (zone.rearOnly && front) continue;
    }
    return { name: zone.name, mult: zone.mult, tight: !!zone.tight };
  }
  return { name: "body", mult: 1, tight: false };
}

export function pickHitscanTarget(player, dirX, dirY, pitch, range, entities, map) {
  const maxDist = map ? distanceToWall(player, dirX, dirY, map, range) : range;
  let best = null;
  for (const enemy of entities) {
    const hit = rayEnemyHit(player, dirX, dirY, maxDist, pitch, enemy);
    if (hit && (!best || hit.dist < best.dist)) best = hit;
  }
  return best;
}

/**
 * Projectile↔enemy hit test (swept-segment).
 *
 * Single source of truth for moving-projectile collision. Tests whether the
 * line segment from `(prevX, prevY)` to `(p.x, p.y)` intersects the enemy's
 * hit cylinder, with the same angular forgiveness as hitscan so projectiles
 * and hitscan feel equally responsive.
 *
 * Pre-conditions: projectile has `originX`, `originY`, `dirX`, `dirY`,
 * optional `pitch`. Caller passes `prevX/prevY` (position before this step).
 *
 * @returns {{ enemy, dist } | null} hit info (dist = travel along ray from origin)
 */
export function projectileHitsEnemy(p, enemy, prevX, prevY) {
  if (enemy.type !== "enemy" || !enemy.active || enemy.state === "dead") return null;

  // Reuse hitscan's swept-ray logic for symmetry. Use the projectile's full
  // travel ray (origin → current pos) so the angular pad scales with distance
  // identically to hitscan. Range = current travelled distance + small step
  // padding (ray must reach at least to current frame).
  const ox = p.originX ?? prevX ?? p.x;
  const oy = p.originY ?? prevY ?? p.y;
  const travelDist = Math.hypot(p.x - ox, p.y - oy);
  if (travelDist <= 0) {
    // First-frame edge case: bullet spawned on top of enemy.
    const dx = p.x - enemy.x, dy = p.y - enemy.y;
    const r = enemyHitRadius(enemy);
    return dx * dx + dy * dy <= r * r ? { enemy, dist: 0 } : null;
  }

  const dirX = (p.x - ox) / travelDist;
  const dirY = (p.y - oy) / travelDist;

  // Cast from origin out to current position. rayEnemyHit's angular pads
  // (ENEMY_HIT_ANGLE_MIN / VERTICAL_ANGLE_MIN) provide the same forgiveness
  // that hitscan weapons enjoy.
  const hit = rayEnemyHit(
    { x: ox, y: oy },
    dirX, dirY,
    travelDist,
    p.pitch || 0,
    enemy,
  );
  if (!hit) return null;

  // Also constrain: the intersection must lie on the segment we just stepped
  // through, not earlier travel (otherwise a bullet that *passed* an enemy
  // would re-hit it). Allow a small slop (one step length) for the spawn frame.
  const prevDist = prevX != null && prevY != null
    ? Math.hypot(prevX - ox, prevY - oy)
    : 0;
  if (hit.dist + 0.05 < prevDist) return null;

  return hit;
}
