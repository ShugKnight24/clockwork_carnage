/**
 * ProjectileSystem — per-frame projectile movement, collision, cleanup.
 *
 * Stateless: call updateProjectiles(ctx, dt) each frame.
 */
import { projectileHitsEnemy } from "./combat.js";
import { attachProjectileLight, syncProjectileLight } from "../../js/vfx.js";
import { isSolid } from "../world/blocks.js";
import { World } from "../world/world.js";
import { PLAYER, hasLineOfSight3D } from "../world/voxel-physics.js";

const EMP_DURATION_MS = 3000;
const EMP_PAIN_MS = 500;
const EMP_RADIUS = 3;
const SPLASH_RADIUS = 2;
const SPLASH_DAMAGE_FACTOR = 0.5;
const HEAVY_SPLASH_THRESHOLD = 50;
const PLAYER_HIT_RADIUS_SQ = 0.25;
/** Half the standing body, plus a little: the z band a voxel bolt must reach to hit the player. */
const PLAYER_HIT_HALF = PLAYER.height * 0.5 + 0.1;

function isAliveEnemy(e) {
  return e?.type === "enemy" && e.active && e.state !== "dead";
}

/**
 * Is `e` inside the blast? A grid level has one floor, so a disc is the whole
 * answer. A voxel level stacks them: a bolt going off on a roof is a sphere's
 * radius away from the walker under it, not zero — and even inside that sphere
 * the blast has to reach them, so a single block of floor between the two stops
 * it.
 */
function withinBlast(p, e, radius, world) {
  const dx = p.x - e.x, dy = p.y - e.y;
  let d2 = dx * dx + dy * dy;
  if (!world) return d2 < radius * radius;
  const cz = (e.z ?? 0) + (e.def?.hitCenter ?? 0.35);
  const dz = (p.z ?? 0) - cz;
  d2 += dz * dz;
  if (d2 >= radius * radius) return false;
  return hasLineOfSight3D(world, p.x, p.y, p.z ?? 0, e.x, e.y, cz);
}

/** Disable EMP-vulnerable enemies in radius. */
function applyEmpBurst(p, ctx) {
  const blast = ctx.entityGrid.query(p.x, p.y, EMP_RADIUS);
  for (const e of blast) {
    if (!isAliveEnemy(e)) continue;
    if (!withinBlast(p, e, EMP_RADIUS, ctx.world)) continue;
    if (e.def?.attackType !== "ranged" && e.enemyType !== "drone") continue;
    e._empDisabledUntil = ctx.time + EMP_DURATION_MS;
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
    if (withinBlast(p, e, SPLASH_RADIUS, ctx.world)) {
      ctx.damageEnemy(e, p.damage * SPLASH_DAMAGE_FACTOR);
    }
  }
  // Bright orange explosion light, ~250ms — bleeds onto floor + nearby walls.
  if (ctx.lights) {
    ctx.lights.push({
      x: p.x, y: p.y, z: p.z ?? World.GROUND + 0.5,
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
  const in3D = !!ctx.world;
  // Query slightly inflated radius so we catch enemies whose cylinder is
  // brushed by the swept segment but whose center is outside the step radius.
  const queryR = Math.max(1.5, Math.hypot(p.x - prevX, p.y - prevY) + 0.8);
  const candidates = ctx.entityGrid.query(p.x, p.y, queryR);
  let best = null;
  for (const e of candidates) {
    const hit = projectileHitsEnemy(p, e, prevX, prevY, in3D);
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
    applyEmpBurst(p, ctx);
  }

  ctx.damageEnemy(e, p.damage, best.zone);
  p.active = false;
  if (p.damage > HEAVY_SPLASH_THRESHOLD) applySplash(p, e, ctx);
  return true;
}

function tryHitPlayer(p, ctx) {
  const dx = p.x - ctx.player.x, dy = p.y - ctx.player.y;
  if (dx * dx + dy * dy >= PLAYER_HIT_RADIUS_SQ) return false;
  if (ctx.world) {
    // The player is a body, not a column: a bolt aimed at their chest passes
    // harmlessly over their head from a floor above.
    const centre = (ctx.player.z || 0) + PLAYER.height * 0.5;
    if (Math.abs((p.z || 0) - centre) > PLAYER_HIT_HALF) return false;
  }
  ctx.damagePlayer(p.damage);
  p.active = false;
  return true;
}

function stepProjectile(p, ctx, stepDt) {
  const prevX = p.x;
  const prevY = p.y;
  // `dirZ` is the vertical part of a unit 3D heading, so the horizontal part
  // shrinks to match and the bolt keeps one speed however steeply it is aimed.
  // A 2D bullet has no dirZ, flies flat, and takes the whole step horizontally.
  const dz = p.dirZ || 0;
  const hStep = Math.sqrt(Math.max(0, 1 - dz * dz)) * p.speed * stepDt;
  p.x += p.dirX * hStep;
  p.y += p.dirY * hStep;

  if (ctx.world) {
    p.z = (p.z || 0) + dz * p.speed * stepDt;
    const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
    if (bx < 0 || by < 0 || bz < 0 || bx >= World.W || by >= World.D || bz >= World.H) {
      p.active = false; return;
    }
    if (isSolid(ctx.world.get(bx, by, bz))) {
      ctx.spawnWallSparks(p.x, p.y, p.z);
      p.active = false; return;
    }
  } else {
    const mx = Math.floor(p.x), my = Math.floor(p.y);
    const { map } = ctx;
    if (mx < 0 || my < 0 || mx >= map.width || my >= map.height) {
      p.active = false; return;
    }
    if (map.grid[my][mx] > 0) {
      ctx.spawnWallSparks(p.x, p.y);
      p.active = false; return;
    }
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
