/**
 * combat.js — Pure combat math extracted from game.js damageEnemy/damagePlayer.
 * No game state, no audio, no particles — just numbers in, numbers out.
 */

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
