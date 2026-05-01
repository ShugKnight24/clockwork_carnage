/**
 * ProjectileSystem — per-frame projectile movement, collision, cleanup.
 *
 * Stateless: call updateProjectiles(ctx, dt) each frame.
 */
import { projectileHitsEnemy } from "./combat.js";

const EMP_DURATION_MS = 3000;
const EMP_PAIN_MS = 500;
const EMP_RADIUS = 3;
const SPLASH_RADIUS = 2;
const SPLASH_DAMAGE_FACTOR = 0.5;
const HEAVY_SPLASH_THRESHOLD = 50;
const PLAYER_HIT_RADIUS_SQ = 0.25;

function isAliveEnemy(e) {
  return e?.type === "enemy" && e.active && e.state !== "dead";
}

/** Disable EMP-vulnerable enemies in radius. */
function applyEmpBurst(p, hitTargets, time, audio, player, entityGrid) {
  const blast = entityGrid.query(p.x, p.y, EMP_RADIUS);
  for (const e of blast) {
    if (!isAliveEnemy(e)) continue;
    const dx = e.x - p.x, dy = e.y - p.y;
    if (dx * dx + dy * dy >= EMP_RADIUS * EMP_RADIUS) continue;
    if (e.def?.attackType !== "ranged" && e.enemyType !== "drone") continue;
    e._empDisabledUntil = time + EMP_DURATION_MS;
    e.state = "pain";
    e.painTimer = EMP_PAIN_MS;
  }
}

/** Splash damage to nearby enemies (cannon-class bullets). */
function applySplash(p, primary, ctx) {
  const nearby = ctx.entityGrid.query(p.x, p.y, SPLASH_RADIUS);
  for (const e of nearby) {
    if (e === primary || !isAliveEnemy(e)) continue;
    const dx = p.x - e.x, dy = p.y - e.y;
    if (dx * dx + dy * dy < SPLASH_RADIUS * SPLASH_RADIUS) {
      ctx.damageEnemy(e, p.damage * SPLASH_DAMAGE_FACTOR);
    }
  }
}

/** Test if projectile p hits any enemy candidate; mutates state on hit. */
function tryHitEnemies(p, ctx, prevX, prevY) {
  // Query slightly inflated radius so we catch enemies whose cylinder is
  // brushed by the swept segment but whose center is outside the step radius.
  const queryR = Math.max(1.5, Math.hypot(p.x - prevX, p.y - prevY) + 0.8);
  const candidates = ctx.entityGrid.query(p.x, p.y, queryR);
  let best = null;
  for (const e of candidates) {
    const hit = projectileHitsEnemy(p, e, prevX, prevY);
    if (hit && (!best || hit.dist < best.dist)) best = hit;
  }
  if (!best) return false;
  const e = best.enemy;

  if (p.emp) {
    if (e._shield) e._shield = 0;
    e._empDisabledUntil = ctx.time + EMP_DURATION_MS;
    e.state = "pain";
    e.painTimer = EMP_PAIN_MS;
    const pan = ctx.audio.calculatePan(e.x, e.y, ctx.player.x, ctx.player.y, ctx.player.angle);
    ctx.audio.enemyHit(pan);
    applyEmpBurst(p, e, ctx.time, ctx.audio, ctx.player, ctx.entityGrid);
  }

  ctx.damageEnemy(e, p.damage, best.zone);
  p.active = false;
  if (p.damage > HEAVY_SPLASH_THRESHOLD) applySplash(p, e, ctx);
  return true;
}

function tryHitPlayer(p, ctx) {
  const dx = p.x - ctx.player.x, dy = p.y - ctx.player.y;
  if (dx * dx + dy * dy < PLAYER_HIT_RADIUS_SQ) {
    ctx.damagePlayer(p.damage);
    p.active = false;
    return true;
  }
  return false;
}

function stepProjectile(p, ctx, stepDt) {
  const prevX = p.x;
  const prevY = p.y;
  p.x += p.dirX * p.speed * stepDt;
  p.y += p.dirY * p.speed * stepDt;

  const mx = Math.floor(p.x), my = Math.floor(p.y);
  const { map } = ctx;
  if (mx < 0 || my < 0 || mx >= map.width || my >= map.height) {
    p.active = false; return;
  }
  if (map.grid[my][mx] > 0) {
    ctx.spawnWallSparks(p.x, p.y);
    p.active = false; return;
  }

  if (p.owner === "player") tryHitEnemies(p, ctx, prevX, prevY);
  else if (p.owner === "enemy") tryHitPlayer(p, ctx);
}

/**
 * @param {object} ctx - Game context bag
 * @param {number} dt  - Delta time in seconds
 */
export function updateProjectiles(ctx, dt) {
  const { projectiles, entities } = ctx;

  for (const p of projectiles) {
    if (!p.active) continue;

    // Sub-step to prevent wall clipping on fast bullets
    const totalDist = p.speed * dt;
    const steps = Math.max(1, Math.ceil(totalDist / 0.3));
    const stepDt = dt / steps;

    for (let s = 0; s < steps && p.active; s++) stepProjectile(p, ctx, stepDt);

    p.life -= dt;
    if (p.life <= 0) p.active = false;
  }

  // In-place compaction
  let pw = 0;
  for (let i = 0; i < projectiles.length; i++) {
    if (projectiles[i].active) projectiles[pw++] = projectiles[i];
  }
  projectiles.length = pw;

  let ew = 0;
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    if (e.type !== "projectile" || e.active) entities[ew++] = e;
  }
  entities.length = ew;
}
