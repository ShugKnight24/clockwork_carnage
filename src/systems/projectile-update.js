/**
 * ProjectileSystem — per-frame projectile movement, collision, cleanup.
 *
 * Stateless: call updateProjectiles(ctx, dt) each frame.
 */
import { projectileHitsEnemy } from "./combat.js";
import { attachProjectileLight, syncProjectileLight } from "../../js/vfx.js";

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
    e._staggered = true; // EMP cancels a telegraphed attack
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
  // Bright orange explosion light, ~250ms — bleeds onto floor + nearby walls.
  if (ctx.lights) {
    ctx.lights.push({
      x: p.x, y: p.y,
      color: [255, 140, 50],
      radius: 6,
      baseIntensity: 2.2,
      intensity: 2.2,
      life: 0.25,
      maxLife: 0.25,
    });
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
    e._staggered = true; // EMP cancels a telegraphed attack
    const pan = ctx.audio.calculatePan(e.x, e.y, ctx.player.x, ctx.player.y, ctx.player.angle);
    const dist = Math.hypot(e.x - ctx.player.x, e.y - ctx.player.y);
    ctx.audio.enemyHit(pan, dist);
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
// Frame stamp for projectile lights. A level load, restart or tutorial step
// replaces the projectiles array wholesale (a dozen call sites), which would
// leave their never-expiring lights burning. Any projectile light not touched
// last frame has lost its projectile, so it is put out here.
let _tick = 0;

export function updateProjectiles(ctx, dt) {
  const { projectiles, entities } = ctx;
  _tick++;
  if (ctx.lights) {
    for (const L of ctx.lights) {
      if (L._projTick !== undefined && L._projTick < _tick - 1) {
        L.life = 0;
        L.intensity = 0;
        L._projTick = undefined;
      }
    }
  }

  for (const p of projectiles) {
    if (!p.active) continue;
    attachProjectileLight(ctx.lights, p);

    // Sub-step to prevent wall clipping on fast bullets
    const totalDist = p.speed * dt;
    const steps = Math.max(1, Math.ceil(totalDist / 0.3));
    const stepDt = dt / steps;

    for (let s = 0; s < steps && p.active; s++) stepProjectile(p, ctx, stepDt);

    p.life -= dt;
    if (p.life <= 0) p.active = false;
    // Runs after the step, so a bolt that hit something this frame also puts
    // its light out this frame.
    syncProjectileLight(p);
    if (p._light) p._light._projTick = _tick;
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
