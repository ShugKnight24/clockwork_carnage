// ─── Voxel AI System ────────────────────────────────────────────────────────
// Enemy behaviour for a voxel play-test. `AISystem` steers enemies across the
// raycaster's grid map, which a voxel level does not have: here the world is
// blocks, so movement runs through the same swept AABB the player uses and
// sight is a 3D ray.
//
// Only movement, sight and altitude differ. The state machine —
// idle → chase → windup → attack — keeps `AISystem`'s shape and timers so the
// two systems telegraph identically (`beginWindup` is shared, not copied).
//
// Deliberately simpler than `AISystem`: no per-`ai` flavours (flank, orbit,
// erratic), and none of the grid-bound sub-boss abilities (summon, teleport,
// chrono-bombs, boss specials) — those navigate `map` and have no voxel
// equivalent yet. A walker walks at the player, a flyer flies at them.
// ────────────────────────────────────────────────────────────────────────────
import {
  PLAYER,
  moveAABB,
  groundHeight,
  aabbOverlapsSolid,
  hasLineOfSight3D,
  playerEyeZ3D,
} from "../world/voxel-physics.js";
import { beginWindup } from "./ai.js";
import { ENEMY_MELEE_WHIFF_SLACK } from "../constants.js";

/** Fallback footprint for a def that carries no hitbox (combat.js agrees). */
const DEFAULT_RADIUS = 0.3;
/** Half a body's height: an enemy sights from this far above its own feet. */
const ENEMY_SIGHT_OFFSET = 0.55;
/** How close a chaser presses, as a fraction of its own attack range. */
const PRESS_FRACTION = 0.6;
/** …but never further out than this, so a melee enemy always closes. */
const PRESS_MIN = 1.2;
/** Hover bob: amplitude in blocks, and radians per millisecond of sim time. */
const HOVER_AMPLITUDE = 0.3, HOVER_RATE = 0.002;
/** Blocks a flyer keeps between itself and whatever it is crossing. */
const FLYER_CLEARANCE = 1;
/** How far ahead a flyer reads the ground, so a hill lifts it before it arrives. */
const FLYER_LOOKAHEAD = 1.5;
/** Blocks per second a flyer may climb or sink to reach that altitude. */
const FLY_RATE = 3;

/**
 * A fixed bob offset per flyer, so a pair of drones do not rise and fall in
 * lockstep. Taken from where it spawned rather than `Math.random`, so a replay
 * of the same level bobs the same way.
 */
function hoverPhase(e) {
  return (e.x * 7.13 + e.y * 3.71 + e.z * 1.37) % (Math.PI * 2);
}

/** Collision box for an enemy: as wide as its sprite, twice its hit height. */
function bodyOf(e) {
  const def = e.def || {};
  return {
    half: def.radius ?? DEFAULT_RADIUS,
    height: (def.hitHeight ?? ENEMY_SIGHT_OFFSET) * 2,
  };
}

/** Where an enemy looks from — the middle of its body, not its feet. */
function enemySightZ(e) {
  return (e.z || 0) + bodyOf(e).height * 0.5;
}

export class VoxelAISystem {
  /**
   * @param {import("./ai.js").AIContext & {world: import("../world/world.js").World}} ctx
   * @param {number} dt
   * @returns {import("./ai.js").AIEffects}
   */
  update(ctx, dt) {
    const { world, entities, player, time, audio } = ctx;
    const timeScale = ctx.timeScale || 1;
    const fx = {
      damagePlayerCalls: [],
      screenShake: 0,
      hudDisabledUntil: null,
      ariaMessages: [],
      totalEnemiesAdded: 0,
    };
    if (!world) return fx;

    // Tick dissolve timers for dying enemies
    for (const e of entities) {
      if (!e.dissolving) continue;
      e.dissolveTimer -= dt;
      if (e.dissolveTimer <= 0) {
        e.dissolving = false;
        e.active = false;
      }
    }

    const eyeZ = playerEyeZ3D(player);

    for (const e of entities) {
      if (e.type !== "enemy" || !e.active || e.dissolving) continue;
      const def = e.def || {};

      // Enemy-specific chrono scale
      const chronoMult = Number.isFinite(e.chronoMultiplier)
        ? e.chronoMultiplier
        : Number.isFinite(def.chronoMultiplier)
          ? def.chronoMultiplier
          : 0.15;
      const enemyDt = player.chronoActive ? dt * chronoMult : dt;

      // A spawn that never set one starts on the floor under it.
      if (!Number.isFinite(e.z)) e.z = groundHeight(world, e.x, e.y, bodyOf(e).half);

      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const distH = Math.hypot(dx, dy);
      const sightZ = enemySightZ(e);
      // Range is the true 3D distance: a drone four blocks overhead is four
      // blocks away, however close its shadow is.
      const dist = Math.hypot(distH, eyeZ - sightZ);
      const los = hasLineOfSight3D(world, e.x, e.y, sightZ, player.x, player.y, eyeZ);

      // Pain state, then EMP: both take the enemy's decisions away for the
      // frame. Unlike the grid AI they do not skip the body — gravity still
      // applies, or a staggered enemy would hang in the air.
      let stunned = false;
      if (e.painTimer > 0) {
        e.painTimer -= enemyDt * 1000;
        if (e.painTimer <= 0) {
          // An ordinary hit pauses a telegraph; a crit/headshot/EMP cancels it.
          if (!e._staggered && e._windupLeftMs > 0) {
            e.state = "windup";
          } else {
            e._windupLeftMs = 0;
            e.state = "chase";
          }
          e._staggered = false;
        }
        stunned = true;
      } else if (e._empDisabledUntil && time < e._empDisabledUntil) {
        stunned = true;
      }

      if (!stunned) {
        e.stateTime += enemyDt;

        // ── Idle → chase ──
        if (e.state === "idle" && dist < e.alertRange && los) {
          e.state = "chase";
          e.stateTime = 0;
          e.lastAttackTime = time; // prevents instant first shot
        }
      }

      // ── Movement intent ──
      let stepX = 0, stepY = 0;
      if (!stunned && e.state !== "dead") {
        if (e.state === "chase" || e.state === "windup" || e.state === "attack") {
          e.angle = Math.atan2(dy, dx);
        }
        if (e.state === "chase") {
          // Press in until the player is inside range with a clear shot; a
          // blocked view is a reason to keep coming, not to stand still.
          const press = Math.max(PRESS_MIN, (def.attackRange || PRESS_MIN) * PRESS_FRACTION);
          if (distH > press || !los) {
            const speed = Number.isFinite(e.speed) ? e.speed : def.speed || 0;
            const inv = distH > 1e-6 ? speed * enemyDt / distH : 0;
            stepX = dx * inv;
            stepY = dy * inv;
          }
        }
      }

      if (def.flying) this._moveFlyer(world, e, stepX, stepY, time, enemyDt);
      else this._moveWalker(world, e, stepX, stepY, enemyDt);

      if (stunned) continue;

      // ── Attack cadence ──
      if (e.state === "chase") {
        const chronoAttackScale = player.chronoActive && chronoMult > 0 ? chronoMult : 1;
        const scaledAttackRate = (def.attackRate || 1000) / timeScale / chronoAttackScale;
        if (dist < (def.attackRange || 0) && time - e.lastAttackTime > scaledAttackRate && los) {
          beginWindup(e, time);
        }
      }

      // ── Windup (telegraph) ──
      if (e.state === "windup") {
        e._windupLeftMs = (e._windupLeftMs || 0) - enemyDt * 1000;
        if (e._windupLeftMs <= 0) {
          e._windupLeftMs = 0;
          e.state = "attack";
          e.stateTime = 0;
        }
      }

      // ── Attack ──
      if (e.state === "attack") {
        if (los) {
          if (def.attackType === "ranged") {
            // Projectiles do not fly in a voxel level yet (Task 11), so a shot
            // that finished its telegraph resolves along the sight line that
            // allowed it rather than spawning a round that never lands.
            fx.damagePlayerCalls.push({ damage: def.damage, attacker: e });
            audio?.enemyShoot?.(
              audio.calculatePan?.(e.x, e.y, player.x, player.y, player.angle) ?? 0,
            );
          } else if (dist <= def.attackRange * ENEMY_MELEE_WHIFF_SLACK) {
            fx.damagePlayerCalls.push({ damage: def.damage, attacker: e });
          }
          // else: the player stepped out during the telegraph — the swing whiffs.
        }
        e.state = "chase";
        e.stateTime = 0;
      }
    }

    return fx;
  }

  /**
   * Ground movement: gravity, the one-block step-up the player gets, and a hop
   * for a ledge the step-up refused.
   */
  _moveWalker(world, e, stepX, stepY, dt) {
    const { half, height } = bodyOf(e);
    e.vz = (e.vz || 0) - PLAYER.gravity * dt;
    const body = { x: e.x, y: e.y, z: e.z, half, height };
    const res = moveAABB(world, body, stepX, stepY, e.vz * dt);
    e.x = res.x;
    e.y = res.y;
    e.z = res.z;
    if (res.grounded && e.vz <= 0) e.vz = 0;
    else if (res.hitZ && e.vz > 0) e.vz = 0; // bonked a ceiling

    // Still walled in after the step-up had its go: jump, if what is one block
    // up is open. A full jump impulse, not a fraction of one — 0.8 of it peaks
    // at 0.96 blocks and would scrape every ledge it tried to clear. Only the
    // axis that actually hit is probed: a body sliding along a wall is blocked
    // on one axis while the other runs free, and has nothing to hop over.
    if (res.grounded && (res.hitX || res.hitY)) {
      const dirX = res.hitX ? Math.sign(stepX) : 0;
      const dirY = res.hitX ? 0 : Math.sign(stepY);
      if (this._hopClears(world, e, dirX, dirY, half, height)) e.vz = PLAYER.jump;
    }
  }

  /**
   * Is the space one block above the obstacle ahead free to land in?
   * @param {number} dirX -1, 0 or 1 — the blocked axis, not a heading
   */
  _hopClears(world, e, dirX, dirY, half, height) {
    if (!dirX && !dirY) return false;
    const ahead = half + 0.5; // the middle of the cell the body is pressed against
    return !aabbOverlapsSolid(
      world,
      e.x + dirX * ahead,
      e.y + dirY * ahead,
      e.z + PLAYER.step,
      half,
      height,
    );
  }

  /** Air movement: hold the spawn altitude (bobbing), pass over the ground. */
  _moveFlyer(world, e, stepX, stepY, time, dt) {
    const { half, height } = bodyOf(e);
    if (!Number.isFinite(e._hoverZ)) e._hoverZ = e.z;
    if (!Number.isFinite(e._hoverPhase)) e._hoverPhase = hoverPhase(e);
    // Never lower than the ground it is crossing — and it reads that ground a
    // step ahead as well, or a drone that set out over a valley would press
    // into the next hill instead of rising over it.
    const len = Math.hypot(stepX, stepY);
    const aheadX = len > 1e-6 ? e.x + (stepX / len) * FLYER_LOOKAHEAD : e.x;
    const aheadY = len > 1e-6 ? e.y + (stepY / len) * FLYER_LOOKAHEAD : e.y;
    const floor =
      Math.max(groundHeight(world, e.x, e.y, half), groundHeight(world, aheadX, aheadY, half)) +
      FLYER_CLEARANCE;
    const target =
      Math.max(e._hoverZ, floor) +
      Math.sin(time * HOVER_RATE + e._hoverPhase) * HOVER_AMPLITUDE;
    // Climb and sink at a bounded rate. The ground under a flyer can rise a
    // whole hill between one cell and the next, and sweeping that difference
    // in a single frame would teleport it up and drop it back.
    const limit = FLY_RATE * dt;
    const dz = Math.max(-limit, Math.min(limit, target - e.z));
    const body = { x: e.x, y: e.y, z: e.z, half, height };
    const res = moveAABB(world, body, stepX, stepY, dz, { step: 0 });
    e.x = res.x;
    e.y = res.y;
    e.z = res.z;
    e.vz = 0;
  }
}
