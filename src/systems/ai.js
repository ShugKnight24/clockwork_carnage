// ─── AI System ──────────────────────────────────────────────────────────────
// Enemy state machine: idle/patrol → chase → windup → attack, and
// chase → search → idle when the player is lost (src/systems/ai-nav.js).
// Enemies path around walls (a shared distance field), call each other in
// when one spots or is shot by the player, hear gunfire, go to where they
// last saw you rather than where you are, and lead their shots. In arena,
// meltdown and the prologue's scripted fights (ctx.hunt) they never lose you.
// The windup is the attack telegraph: the enemy plants, faces the player and
// renders a warning before the hit resolves (see renderer drawEnemy).
// Sub-boss abilities: summon, chrono-bomb, teleport/leap, shield regen, HUD disrupt.
// Boss special abilities: charge, stomp, missile spread, warp.
// The Hound: a beast's lunge with a long tell, and quill volleys (a bristle,
// then a fan of slow quills) that land whether or not it is phased.
// Chrono-bomb fuse + detonation.
// Chronos: an enemy standing in a Time-Lock's slab runs at a tenth, and a
// Rewind echo draws every enemy nearer to it than to the player (ctx.chrono).
// Each enemy exposes its movement intent (`_moveAngle`, `_moveSpeed`) for
// Foresight's ghosts.
//
// ─── TIMER CONVENTION ───────────────────────────────────────────────────────
// • `dt` (seconds): The clamped game.deltaTime (≤0.033s). Used for movement,
//   decay timers, and anything that multiplies by dt directly.
// • `time` (ms): Sim-time in milliseconds (game.time). Used for cooldown
//   comparisons: `time - e.lastAttackTime > scaledAttackRate`.
// • Enemy internal timers (`painTimer`, `_summonTimer`, `_bombTimer`,
//   `_teleportTimer`, `_supportTimer`, `_windupLeftMs`): All in MILLISECONDS. They tick
//   via `+= dt * 1000` or `-= enemyDt * 1000` to stay in ms.
// • `attackRate` in enemy defs: MILLISECONDS (e.g. 1000 = 1s between shots).
// ────────────────────────────────────────────────────────────────────────────
import { isPassable, hasLineOfSight, EYE_Z, playerEyeZ } from "./physics.js";
import { Enemy, Projectile } from "../../js/entities.js";
import { updateForm2, recordShot } from "./boss-form2.js";
import { NavFields, navAngle, navSteps, leadPoint } from "./ai-nav.js";
import {
  ENEMY_MELEE_WINDUP_MS,
  ENEMY_RANGED_WINDUP_MS,
  ENEMY_MELEE_WHIFF_SLACK,
} from "../constants.js";

/** Telegraph length for an enemy def, in ms. */
export function attackWindupMs(def) {
  if (Number.isFinite(def?.attackWindupMs)) return def.attackWindupMs;
  return def?.attackType === "ranged"
    ? ENEMY_RANGED_WINDUP_MS
    : ENEMY_MELEE_WINDUP_MS;
}

/**
 * Enter the telegraph. The attack cooldown starts here, so the windup sits
 * inside the existing attackRate and overall damage output is unchanged.
 * Exported so the voxel AI telegraphs attacks on exactly the same clock.
 */
export function beginWindup(e, time) {
  const ms = attackWindupMs(e.def);
  e.state = "windup";
  e.stateTime = 0;
  e._windupTotalMs = ms;
  e._windupLeftMs = ms;
  e.lastAttackTime = time;
}

/**
 * The directions of a quill volley: `count` quills spread evenly across
 * `spread` radians, centred on the aim. Pure, so the telegraph can draw the
 * fan the volley will follow.
 * @param {{ count: number, spread: number }} q - a def's `quills`
 * @param {number} aim - radians
 */
export function quillFan(q, aim) {
  const n = Math.max(1, q.count);
  if (n === 1) return [aim];
  return Array.from({ length: n }, (_, i) => aim - q.spread / 2 + (q.spread * i) / (n - 1));
}

/**
 * @typedef {{
 *   entities: Array, player: Object, map: number[][],
 *   time: number, timeScale: number,
 *   projectiles: Array, chronoBombs: Array, damageNumbers: Array,
 *   audio: Object,
 * }} AIContext
 *
 * @typedef {{
 *   damagePlayerCalls: Array<{damage: number, attacker?: Object}>,
 *   screenShake: number,
 *   hudDisabledUntil: number | null,
 *   ariaMessages: string[],
 *   totalEnemiesAdded: number,
 * }} AIEffects
 */

/** Seconds an enemy hunts for a player it has lost before it goes back to its post. */
const SEARCH_SECONDS = 3.5;
/** Seconds out of sight before a chaser stops and searches, even short of the last sighting. */
const LOSE_AFTER = 8;
/** How far a spotting (or shot) enemy's shout carries to idle allies, in cells. */
const CALLOUT_RANGE = 10;
/**
 * How far ahead of a moving player ordinary enemies aim (0..1 of the way).
 * A third: a steady strafe gets clipped, a change of direction still dodges.
 * A def can set its own `lead` (a marksman leads more).
 */
const DEFAULT_LEAD = 0.3;
/** How often (s) an enemy re-checks whether it can see its target. */
const SIGHT_EVERY = 0.15;

/**
 * Move an enemy by `step` along `angle`, one axis at a time, keeping
 * `margin` off the walls. Returns whether it got anywhere.
 */
function stepEnemy(e, angle, step, map, margin = 0.3) {
  const x0 = e.x;
  const y0 = e.y;
  const newX = e.x + Math.cos(angle) * step;
  const newY = e.y + Math.sin(angle) * step;
  const mx = Math.cos(angle) >= 0 ? margin : -margin;
  const my = Math.sin(angle) >= 0 ? margin : -margin;
  if (
    isPassable(map, Math.floor(newX + mx), Math.floor(e.y)) &&
    isPassable(map, Math.floor(newX + mx), Math.floor(e.y + margin)) &&
    isPassable(map, Math.floor(newX + mx), Math.floor(e.y - margin))
  ) {
    e.x = newX;
  }
  if (
    isPassable(map, Math.floor(e.x), Math.floor(newY + my)) &&
    isPassable(map, Math.floor(e.x + margin), Math.floor(newY + my)) &&
    isPassable(map, Math.floor(e.x - margin), Math.floor(newY + my))
  ) {
    e.y = newY;
  }
  return Math.abs(e.x - x0) + Math.abs(e.y - y0) > step * 0.5;
}

/**
 * The shout: idle (or searching) allies near `e` that can see it, or are
 * close enough to hear, join in a beat later, heading for what it saw.
 */
export function callOut(e, entities, map, time, from) {
  for (const o of entities) {
    if (o === e || o.type !== "enemy" || !o.active || o.dissolving) continue;
    if (o.state !== "idle" && o.state !== "search") continue;
    if (o._alertAt != null || (o.alertRange ?? 1) <= 0) continue;
    const d = Math.hypot(o.x - e.x, o.y - e.y);
    if (d > CALLOUT_RANGE) continue;
    if (d > 4 && !hasLineOfSight(map, o.x, o.y, e.x, e.y)) continue;
    o._alertAt = time + 250 + Math.random() * 500;
    o._alertFrom = from ? { x: from.x, y: from.y } : { x: e.x, y: e.y };
  }
}

/** Radians per second a front-shielded enemy can turn its shield (~100°/s). */
const SHIELD_TURN_RATE = 1.75;

export class AISystem {
  constructor() {
    /** Shared paths to wherever enemies are heading (src/systems/ai-nav.js). */
    this.nav = new NavFields();
    this._clock = 0;
    this._lastPlayer = null;
    /** The player's velocity (units/s), smoothed, for leading shots. */
    this.playerVel = { x: 0, y: 0 };
  }

  /**
   * @param {AIContext} ctx
   * @param {number} dt
   * @returns {AIEffects}
   */
  update(ctx, dt) {
    const {
      entities,
      player,
      map,
      time,
      timeScale,
      projectiles,
      chronoBombs,
      damageNumbers,
      audio,
      chrono,
      hunt = false,
      noise = null,
    } = ctx;
    this._clock += dt;
    // The player's velocity, for leading shots: smoothed over a few frames
    // so a single dash does not throw every aim across the room.
    if (this._lastPlayer && dt > 0) {
      const k = Math.min(1, dt * 8);
      const vx = (player.x - this._lastPlayer.x) / dt;
      const vy = (player.y - this._lastPlayer.y) / dt;
      if (Math.hypot(vx, vy) < 30) {
        this.playerVel.x += (vx - this.playerVel.x) * k;
        this.playerVel.y += (vy - this.playerVel.y) * k;
      }
    }
    this._lastPlayer = { x: player.x, y: player.y };
    const echo = chrono?.echo ?? null;
    const fx = {
      damagePlayerCalls: [],
      screenShake: 0,
      hudDisabledUntil: null,
      ariaMessages: [],
      totalEnemiesAdded: 0,
    };

    // Tick dissolve timers for dying enemies
    for (let i = entities.length - 1; i >= 0; i--) {
      const e = entities[i];
      if (e.dissolving) {
        e.dissolveTimer -= dt;
        if (e.dissolveTimer <= 0) {
          e.dissolving = false;
          e.active = false;
        }
      }
    }

    for (const e of entities) {
      if (e.type !== "enemy" || !e.active || e.dissolving) continue;
      // The Final Form's stopped time holds everyone else, and drives him.
      if (chrono?.frozen?.(e)) continue;

      // Enemy-specific chrono scale
      const chronoMult = Number.isFinite(e.chronoMultiplier)
        ? e.chronoMultiplier
        : Number.isFinite(e.def?.chronoMultiplier)
          ? e.def.chronoMultiplier
          : 0.15;
      // A Temporal Sniper hit slows its target for a while on top of everything else.
      const slowed = e._slowUntil > time ? e._slowFactor ?? 0.4 : 1;
      const enemyDt = (player.chronoActive ? dt * chronoMult : dt) * (chrono?.enemyTimeScale(e) ?? 1) * slowed;

      // The echo decoy pulls whoever is nearer to it than to the player.
      const toEcho =
        !!echo && Math.hypot(echo.x - e.x, echo.y - e.y) < Math.hypot(player.x - e.x, player.y - e.y);
      const target = toEcho ? echo : player;
      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ai = e.def.ai || "chase";

      // Form 2's Counter-shift and Replay (src/systems/boss-form2.js). Before
      // the pain state: a hit does not loosen his hold on your shift, and a
      // replay does not wait for you to stop shooting.
      if (e.def.counterShift || e.def.replay) {
        updateForm2(e, {
          dt: enemyDt,
          realDt: timeScale > 0 ? dt / timeScale : dt,
          player,
          projectiles,
          entities,
          damageNumbers,
          audio,
          fx,
        });
      }

      // Pain state. Ordinary hits pause a telegraphed attack; a crit, headshot
      // or EMP (which set _staggered) cancels it. Without that distinction any
      // weapon firing faster than the windup would stun-lock melee enemies.
      if (e._hurtAlert) {
        e._hurtAlert = false;
        e._lastSeen = { x: player.x, y: player.y };
        e._lostFor = 0;
        callOut(e, entities, map, time, player);
      }
      if (e.painTimer > 0) {
        e.painTimer -= enemyDt * 1000;
        if (e.painTimer <= 0) {
          if (!e._staggered && e._windupLeftMs > 0) {
            e.state = "windup";
          } else {
            e._windupLeftMs = 0;
            e.state = "chase";
          }
          e._staggered = false;
        }
        continue;
      }

      // EMP-disabled
      if (e._empDisabledUntil && time < e._empDisabledUntil) continue;

      e.stateTime += enemyDt;

      // Gunfire carries: an idle or searching enemy in earshot comes to look.
      if (
        noise &&
        (e.state === "idle" || e.state === "search") &&
        (e.alertRange ?? 1) > 0 &&
        e._alertAt == null &&
        Math.hypot(noise.x - e.x, noise.y - e.y) < noise.radius
      ) {
        e._alertAt = time + 150 + Math.random() * 350;
        e._alertFrom = { x: noise.x, y: noise.y };
      }

      // ── Idle / Search ──
      if (e.state === "idle" || e.state === "search") {
        if (e.state === "search") {
          // Look around where it lost you, then give up and go back to watching.
          e._searchT = (e._searchT ?? SEARCH_SECONDS) - enemyDt;
          e.angle = (e.angle || 0) + 1.6 * enemyDt * (e._searchDir || 1);
          if (e._searchT <= 0) {
            e.state = "idle";
            e._searchT = null;
          }
        } else if (ai === "patrol") {
          this._patrolWander(e, enemyDt, map);
        }
        const sightRange = e.state === "search" ? e.alertRange * 1.25 : e.alertRange;
        if (
          dist < sightRange &&
          hasLineOfSight(map, e.x, e.y, player.x, player.y, EYE_Z, playerEyeZ(player))
        ) {
          e.state = "chase";
          e.stateTime = 0;
          e.lastAttackTime = time; // prevents instant first shot
          e._lastSeen = { x: player.x, y: player.y };
          e._lostFor = 0;
          e._alertAt = null;
          audio.enemyBark?.(e.enemyType, "alert", audio.calculatePan(e.x, e.y, player.x, player.y, player.angle), dist);
          callOut(e, entities, map, time, player);
        } else if (e._alertAt != null && time >= e._alertAt) {
          // Called in by an ally, or a shot heard: go and look.
          e.state = "chase";
          e.stateTime = 0;
          e.lastAttackTime = time;
          e._lastSeen = e._alertFrom ?? { x: player.x, y: player.y };
          e._lostFor = 0;
          e._alertAt = null;
          audio.enemyBark?.(e.enemyType, "alert", audio.calculatePan(e.x, e.y, player.x, player.y, player.angle), dist);
        }
      }

      // ── Chase ──
      if (e.state === "chase") {
        // Can it see what it is chasing? Checked a few times a second.
        e._sightT = (e._sightT ?? 0) - enemyDt;
        if (e._sightT <= 0) {
          e._sightT = SIGHT_EVERY;
          e._sees = hasLineOfSight(map, e.x, e.y, target.x, target.y, EYE_Z, playerEyeZ(player));
        }
        // Hunters (arena, meltdown, scripted fights, and anyone told to hunt
        // with a huge alert range) always know where you are.
        const omniscient = hunt || toEcho || (e.alertRange ?? 0) >= 50;
        if (e._sees || omniscient) {
          if (e._sees) e._lostFor = 0;
          e._lastSeen = { x: target.x, y: target.y };
        } else {
          e._lostFor = (e._lostFor || 0) + enemyDt;
        }
        const goal = e._lastSeen ?? { x: target.x, y: target.y };
        const angle = Math.atan2(dy, dx);
        // A front-shielded enemy turns its shield slowly, so circling it, a
        // dash past it or a teammate's distraction opens its flank. Everyone
        // else tracks the player at once.
        if (e.def.frontShield) {
          let d = angle - (e.angle ?? angle);
          d -= 2 * Math.PI * Math.round(d / (2 * Math.PI));
          const step = SHIELD_TURN_RATE * enemyDt;
          e.angle = (e.angle ?? angle) + Math.max(-step, Math.min(step, d));
        } else {
          e.angle = angle;
        }

        // Beast charge ability (telegraph → sprint → impact)
        this._updateBeastCharge(e, enemyDt, dist, angle, player, map, fx);
        // The Hound's quills (telegraph → a fan of rounds, twice when hurt)
        if (e.def.quills) this._updateQuills(e, enemyDt, dist, target, player, map, projectiles, entities, audio);

        // Movement gate: normally stop inside attackRange, but strafe_fire / erratic
        // keep moving to create combat dynamism. Charging beast is controlled separately.
        // In range only counts with a clear shot: through a wall, close is not close enough.
        const inAttackBand = !!e._sees && dist <= e.def.attackRange * 0.8;
        const keepMoving = ai === "strafe_fire" || ai === "erratic";
        const charging = e._chargeState === "sprint";
        // The Hound plants its feet while its quills stand up, and while it
        // coils for a lunge (the lane it drew starts where it stands).
        const bristling = e._quillState === "bristle" || (e.def.lungeLock && e._chargeState === "windup");
        const shouldMove = !charging && !bristling && (!inAttackBand || keepMoving);
        e._moveSpeed = 0;

        if (shouldMove) {
          let moveAngle = angle;
          let moveSpeed = e.speed;

          if (ai === "flanker") {
            // Picked once: derived from the position every frame, it flipped
            // as the enemy moved and left it jittering in place.
            e._strafeDir ??= Math.floor(e.x * 7 + e.y * 13) % 2 ? 1 : -1;
            const strafeDir = e._strafeDir;
            const strafeFactor = Math.min(1, dist / (e.def.attackRange * 1.5));
            moveAngle = angle + strafeDir * strafeFactor * 1.05;
            moveSpeed *= 1.1;
          } else if (ai === "strafe_fire") {
            // Orbit perpendicular to player while maintaining attackRange band
            if (e._orbitDir == null)
              e._orbitDir = Math.floor(e.x * 11 + e.y * 17) % 2 ? 1 : -1;
            if (e._orbitFlipTimer == null)
              e._orbitFlipTimer = 2 + Math.random() * 2;
            e._orbitFlipTimer -= enemyDt;
            if (e._orbitFlipTimer <= 0) {
              e._orbitDir *= -1;
              e._orbitFlipTimer = 2 + Math.random() * 2;
            }
            const bandTarget = e.def.attackRange * 0.7;
            const radial = dist > bandTarget ? 0 : Math.PI; // push out if too close
            const tangent = e._orbitDir * Math.PI * 0.5;
            moveAngle =
              dist < bandTarget * 0.75 ? angle + radial : angle + tangent;
            moveSpeed *= 0.9;
          } else if (ai === "erratic") {
            // Jitter angle + occasional sudden dodge
            if (e._jitterTimer == null) e._jitterTimer = 0;
            if (e._dodgeTimer == null) e._dodgeTimer = 1 + Math.random() * 2;
            e._jitterTimer -= enemyDt;
            e._dodgeTimer -= enemyDt;
            if (e._jitterTimer <= 0) {
              e._jitterOffset = (Math.random() - 0.5) * 1.4;
              e._jitterTimer = 0.15 + Math.random() * 0.2;
            }
            if (e._dodgeTimer <= 0) {
              e._dodgeOffset = (Math.random() < 0.5 ? -1 : 1) * (Math.PI * 0.5);
              e._dodgeDuration = 0.25;
              e._dodgeTimer = 1.5 + Math.random() * 2;
            }
            if (e._dodgeDuration > 0) {
              moveAngle = angle + (e._dodgeOffset || 0);
              e._dodgeDuration -= enemyDt;
              moveSpeed *= 1.3;
            } else {
              moveAngle = angle + (e._jitterOffset || 0);
            }
          } else if (ai === "ambush") {
            if (e.stateTime < 2) moveSpeed *= 1.8;
          } else if (ai === "guard") {
            // Hold position — back away if player gets too close
            if (dist < e.def.attackRange * 0.5) {
              moveAngle = angle + Math.PI;
              moveSpeed *= 0.6;
            } else {
              moveSpeed = 0;
            }
          } else if (ai === "swarm") {
            // Orbit-strafe around player
            e._swarmDir ??= Math.floor(e.x * 3 + e.y * 7) % 2 ? 1 : -1;
            const orbitDir = e._swarmDir;
            moveAngle = angle + orbitDir * Math.PI * 0.45;
            moveSpeed *= 1.2;
          } else if (ai === "support") {
            // Maintain range — retreat if too close, cautious approach otherwise
            if (dist < e.def.attackRange * 0.6) {
              moveAngle = angle + Math.PI;
              moveSpeed *= 0.8;
            } else if (dist > e.def.attackRange * 0.9) {
              moveSpeed *= 0.6;
            } else {
              moveSpeed = 0;
            }
          } else if (ai === "teleport_strike" || ai === "teleport_melee") {
            // Cautious creep between teleports
            moveSpeed *= 0.5;
          }

          // Out of sight, or walled off from it: take the path, not the
          // straight line. Guards hold their post either way.
          const holding = ai === "guard" && moveSpeed === 0;
          if (!holding && moveSpeed > 0 && (!e._sees || e._blocked)) {
            const field = this.nav.get(map, goal.x, goal.y, this._clock);
            const along = navAngle(field, e.x, e.y);
            if (along != null) {
              moveAngle = along;
              moveSpeed = e.speed;
            }
          }

          e._moveAngle = moveAngle;
          e._moveSpeed = moveSpeed;
          const speed = moveSpeed * enemyDt;
          const moved = speed > 0 ? stepEnemy(e, moveAngle, speed, map) : true;
          // Getting nowhere for a moment (a wall in the way, a strafe into a
          // corner) means: take the path for a while, even with you in sight.
          e._stuckT = moved ? 0 : (e._stuckT || 0) + enemyDt;
          if (e._stuckT > 0.3) {
            e._stuckT = 0;
            e._blocked = 1;
          } else if (e._blocked) {
            e._blocked = Math.max(0, e._blocked - enemyDt);
          }
        }

        // Lost: reached where it last saw you, or out of sight too long.
        if (!e._sees && !omniscient && ai !== "guard") {
          const atGoal = Math.hypot(goal.x - e.x, goal.y - e.y) < 0.9 ||
            navSteps(this.nav.get(map, goal.x, goal.y, this._clock), e.x, e.y) < 0;
          if (atGoal || e._lostFor > LOSE_AFTER) {
            e.state = "search";
            e.stateTime = 0;
            e._searchT = SEARCH_SECONDS;
            e._searchDir = Math.random() < 0.5 ? -1 : 1;
            e._lostFor = 0;
          }
        }

        // Attack if in range
        const chronoAttackScale =
          player.chronoActive && chronoMult > 0 ? chronoMult : 1;
        const scaledAttackRate =
          e.def.attackRate / timeScale / chronoAttackScale;
        // Nothing to hit you with (a training target), nothing to fire.
        if (
          e.def.damage > 0 &&
          dist < e.def.attackRange &&
          time - e.lastAttackTime > scaledAttackRate
        ) {
          if (hasLineOfSight(map, e.x, e.y, target.x, target.y, EYE_Z, playerEyeZ(player))) {
            beginWindup(e, time);
            audio.telegraph?.(audio.calculatePan(e.x, e.y, player.x, player.y, player.angle), "shot", dist);
          }
        }
      }

      // ── Windup (telegraph) ──
      if (e.state === "windup") {
        e.angle = Math.atan2(dy, dx); // keep tracking the player while winding up
        // `|| 0` guards a windup restored from a save without its timer.
        e._windupLeftMs = (e._windupLeftMs || 0) - enemyDt * 1000;
        if (e._windupLeftMs <= 0) {
          e._windupLeftMs = 0;
          e.state = "attack";
          e.stateTime = 0;
        }
      }

      // ── Attack ──
      if (e.state === "attack") {
        if (hasLineOfSight(map, e.x, e.y, target.x, target.y, EYE_Z, playerEyeZ(player))) {
          if (e.def.attackType === "ranged") {
            // Lead a moving player (not an echo, which stands still): part of
            // the way, so strafing still dodges and standing still does not.
            const speed = e.def.projectileSpeed || 6;
            const aimAt = toEcho
              ? target
              : leadPoint(e.x, e.y, target.x, target.y, this.playerVel.x, this.playerVel.y, speed, e.def.lead ?? DEFAULT_LEAD);
            const clear = aimAt === target || hasLineOfSight(map, e.x, e.y, aimAt.x, aimAt.y);
            const angle = clear ? Math.atan2(aimAt.y - e.y, aimAt.x - e.x) : Math.atan2(target.y - e.y, target.x - e.x);
            const proj = new Projectile(
              e.x + Math.cos(angle) * 0.4,
              e.y + Math.sin(angle) * 0.4,
              Math.cos(angle),
              Math.sin(angle),
              e.def.damage,
              e.def.projectileSpeed || 6,
              "enemy",
            );
            proj.color = e.def.color1;
            projectiles.push(proj);
            entities.push(proj);
            if (e.def.replay) recordShot(e, proj);
            audio.enemyShoot(
              audio.calculatePan(e.x, e.y, player.x, player.y, player.angle),
            );
          } else if (dist <= e.def.attackRange * ENEMY_MELEE_WHIFF_SLACK) {
            // A swing at the echo lands on nothing. A phased Hound's swing still
            // lands: "Its attacks still land and still telegraph" (story spec §6).
            if (!toEcho) fx.damagePlayerCalls.push({ damage: e.def.damage, attacker: e });
          }
          // else: the player stepped out during the telegraph — the swing whiffs.
        }
        e.state = "chase";
        e.stateTime = 0;
      }

      // ── Sub-boss abilities ──

      // Summoner
      if (e.def.summonType && e.state !== "dead") {
        e._summonTimer = (e._summonTimer || 0) + enemyDt * 1000;
        if (e._summonTimer >= e.def.summonInterval) {
          e._summonTimer = 0;
          const summonCount = entities.filter(
            (s) =>
              s.type === "enemy" &&
              s.active &&
              s._summoned &&
              s.state !== "dead",
          ).length;
          if (summonCount < (e.def.summonMax || 3)) {
            const sAngle = Math.random() * Math.PI * 2;
            const sx = e.x + Math.cos(sAngle) * 1.5;
            const sy = e.y + Math.sin(sAngle) * 1.5;
            if (isPassable(map, Math.floor(sx), Math.floor(sy))) {
              const summon = new Enemy(sx, sy, e.def.summonType);
              summon._summoned = true;
              entities.push(summon);
              fx.totalEnemiesAdded++;
            }
          }
        }
      }

      // Chrono-Bomber
      if (e.def.dropsBombs && e.state === "chase") {
        e._bombTimer = (e._bombTimer || 0) + enemyDt * 1000;
        if (e._bombTimer >= 4000) {
          e._bombTimer = 0;
          chronoBombs.push({
            x: e.x,
            y: e.y,
            radius: e.def.bombRadius || 2.0,
            damage: e.def.bombDamage || 25,
            fuseLife: 0,
            fuseDuration: 1.5,
            active: true,
          });
        }
      }

      // Teleport / leap
      if (e.state !== "dead") {
        if (e.def.teleportCooldown || e.def.leapDistance) {
          e._teleportTimer = e._teleportTimer || 0;
          e._teleportTimer += enemyDt * 1000;
          const cooldown = e.def.teleportCooldown || 3000;
          if (e._teleportTimer >= cooldown) {
            e._teleportTimer = 0;
            if (dist > (e.def.attackRange || 2) * 0.8 && dist < 30) {
              const atp = Math.atan2(player.y - e.y, player.x - e.x);
              const leapDist =
                e.def.leapDistance || Math.max(1.5, e.def.attackRange || 3);
              const tx = player.x - Math.cos(atp) * Math.min(1.5, leapDist);
              const ty = player.y - Math.sin(atp) * Math.min(1.5, leapDist);
              if (isPassable(map, Math.floor(tx), Math.floor(ty))) {
                e.x = tx;
                e.y = ty;
                // Land into a telegraph. Striking the tick after teleporting
                // gave the player no window to react to a 22-30 damage hit.
                beginWindup(e, time);
                audio.telegraph?.(audio.calculatePan(e.x, e.y, player.x, player.y, player.angle), "shot", dist);
                fx.screenShake = Math.max(fx.screenShake, 2);
                audio.enemyHit(
                  audio.calculatePan(
                    e.x,
                    e.y,
                    player.x,
                    player.y,
                    player.angle,
                  ),
                  Math.hypot(e.x - player.x, e.y - player.y),
                );
              }
            }
          }
        }

        // Shield regen
        if (e.def.shieldRegen) {
          if (e._shieldMax == null) {
            e._shieldMax =
              e.def.shieldMax || Math.max(20, Math.floor(e.def.health * 0.25));
            e._shield = e._shieldMax;
          }
          if (e._shieldRegenDelay > 0) e._shieldRegenDelay -= enemyDt;
          else
            e._shield = Math.min(
              e._shieldMax,
              (e._shield || 0) + (e.def.shieldRegenRate || 2) * enemyDt,
            );
        }

        // HUD disrupt
        if (e.def.disablesHUD) {
          e._supportTimer = (e._supportTimer || 0) + enemyDt * 1000;
          if (e._supportTimer >= (e.def.supportInterval || 8500)) {
            e._supportTimer = 0;
            fx.hudDisabledUntil = time + (e.def.disableDuration || 3000);
            fx.ariaMessages.push("hudDisrupted");
          }
        }

        // ── Boss specials ──
        this._updateBoss(
          e,
          dt,
          dist,
          player,
          map,
          projectiles,
          entities,
          damageNumbers,
          audio,
          fx,
        );
      }
    }

    // Chrono-bomb fuse + detonation
    for (const bomb of chronoBombs) {
      if (!bomb.active || chrono?.timeStopped?.()) continue;
      bomb.fuseLife += dt;
      if (bomb.fuseLife >= bomb.fuseDuration) {
        const bdx = player.x - bomb.x;
        const bdy = player.y - bomb.y;
        if (bdx * bdx + bdy * bdy < bomb.radius * bomb.radius) {
          fx.damagePlayerCalls.push({ damage: bomb.damage, attacker: { x: bomb.x, y: bomb.y } });
        }
        bomb.active = false;
      }
    }

    return fx;
  }

  /** Boss charge / stomp / missiles / warp */
  _updateBoss(
    e,
    dt,
    dist,
    player,
    map,
    projectiles,
    entities,
    damageNumbers,
    audio,
    fx,
  ) {
    const isBoss =
      e.enemyType === "boss" ||
      e.enemyType === "boss_form2" ||
      e.enemyType === "boss_form3";
    if (!isBoss || e.state === "dead" || e.dissolving) return;

    const form = e.def.form || 1;
    e._bossChargeCD = e._bossChargeCD || 0;
    e._bossStompCD = e._bossStompCD || 0;
    e._bossMissileCD = e._bossMissileCD || 0;
    e._bossTeleportCD = e._bossTeleportCD || 0;
    e._bossChargeCD -= dt * 1000;
    e._bossStompCD -= dt * 1000;
    e._bossMissileCD -= dt * 1000;
    e._bossTeleportCD -= dt * 1000;

    const atp = Math.atan2(player.y - e.y, player.x - e.x);
    const pan = audio.calculatePan(e.x, e.y, player.x, player.y, player.angle);
    const callout = (value, life = 1.0) =>
      damageNumbers.push({ x: e.x, y: e.y, value, crit: true, life, vx: (Math.random() - 0.5) * 20 });
    // Every boss attack is telegraphed: a wind-up with a callout and a sound
    // long enough to react to, then the attack. Nothing lands on the frame it
    // is announced.
    if (e._bossWindup) {
      e._bossWindup.t -= dt;
      if (e._bossWindup.kind === "charge") e._bossChargeAngle = atp; // tracks you until it commits
      if (e._bossWindup.t > 0) return;
      const kind = e._bossWindup.kind;
      e._bossWindup = null;
      if (kind === "charge") {
        e._bossCharging = true;
        e._bossChargeTimer = 0;
        e._bossChargeDuration = 1.0;
      } else if (kind === "stomp") {
        if (dist < 4) fx.damagePlayerCalls.push({ damage: e.def.damage * 0.8, attacker: e });
        fx.screenShake = Math.max(fx.screenShake, 12);
      } else if (kind === "warp") {
        const behind = player.angle + Math.PI;
        const tx = player.x + Math.cos(behind) * 3;
        const ty = player.y + Math.sin(behind) * 3;
        if (isPassable(map, Math.floor(tx), Math.floor(ty))) {
          e.x = tx;
          e.y = ty;
          fx.screenShake = Math.max(fx.screenShake, 5);
        }
      }
      return;
    }
    const windup = (kind, seconds, label) => {
      e._bossWindup = { kind, t: seconds };
      callout(label, seconds + 0.4);
      audio.telegraph?.(pan, kind, dist);
    };

    // Form 1+: Charge
    if (!e._bossCharging && form >= 1 && e._bossChargeCD <= 0 && dist > 4 && dist < 20) {
      e._bossChargeCD = 6000;
      e._bossChargeAngle = atp;
      windup("charge", 0.7, "CHARGE!");
      return;
    }
    if (e._bossCharging) {
      e._bossChargeTimer += dt;
      const chargeSpeed = e.speed * 3.5 * dt;
      const cx = e.x + Math.cos(e._bossChargeAngle) * chargeSpeed;
      const cy = e.y + Math.sin(e._bossChargeAngle) * chargeSpeed;
      if (isPassable(map, Math.floor(cx), Math.floor(cy))) {
        e.x = cx;
        e.y = cy;
      }
      const cdx = player.x - e.x;
      const cdy = player.y - e.y;
      if (cdx * cdx + cdy * cdy < 1.5 * 1.5) {
        fx.damagePlayerCalls.push({ damage: e.def.damage * 1.5, attacker: e });
        fx.screenShake = Math.max(fx.screenShake, 8);
        e._bossCharging = false;
      }
      if (e._bossChargeTimer >= e._bossChargeDuration) {
        e._bossCharging = false;
        fx.screenShake = Math.max(fx.screenShake, 3);
      }
    }

    // Form 2+: Stomp
    if (form >= 2 && !e._bossCharging && e._bossStompCD <= 0 && dist < 5) {
      e._bossStompCD = 5000;
      windup("stomp", 0.8, "STOMP!");
      return;
    }

    // Form 2+: Missile spread
    if (
      form >= 2 &&
      e._bossMissileCD <= 0 &&
      dist > 3 &&
      dist < e.def.attackRange * 1.2
    ) {
      e._bossMissileCD = 4000;
      for (let m = -1; m <= 1; m++) {
        const mAngle = atp + m * 0.3;
        const proj = new Projectile(
          e.x + Math.cos(mAngle) * 0.5,
          e.y + Math.sin(mAngle) * 0.5,
          Math.cos(mAngle),
          Math.sin(mAngle),
          e.def.damage * 0.6,
          7,
          "enemy",
        );
        proj.color = form === 3 ? "#ff2244" : "#e04800";
        projectiles.push(proj);
        entities.push(proj);
        if (e.def.replay) recordShot(e, proj);
      }
      audio.enemyShoot(
        audio.calculatePan(e.x, e.y, player.x, player.y, player.angle),
      );
    }

    // Form 3: Teleport behind player
    if (form >= 3 && !e._bossCharging && e._bossTeleportCD <= 0 && dist > 8) {
      e._bossTeleportCD = 8000;
      windup("warp", 0.6, "WARP!");
    }
  }

  /**
   * Beast charge ability — telegraph windup → sprint → impact.
   * No-op for enemies without `chargeCooldown` in def.
   */
  _updateBeastCharge(e, dt, dist, angle, player, map, fx) {
    const def = e.def;
    if (!def.chargeCooldown) return;
    e._chargeCD = (e._chargeCD ?? 0) - dt;
    e._chargeState = e._chargeState ?? "ready";

    if (e._chargeState === "ready") {
      if (e._quillState && e._quillState !== "ready") return;
      if (e._chargeCD <= 0 && dist > def.attackRange && dist < def.sightRange) {
        e._chargeState = "windup";
        e._chargeTimer = def.chargeWindup ?? 0.6;
        e._chargeAngle = angle;
      }
      return;
    }

    if (e._chargeState === "windup") {
      e._chargeTimer -= dt;
      // A lane-locked lunge (the Hound) follows you through most of its tell,
      // then commits: the lane it drew is the lane it runs.
      if (def.lungeLock && e._chargeTimer > (def.chargeWindup ?? 0.6) * 0.3) e._chargeAngle = angle;
      if (e._chargeTimer <= 0) {
        e._chargeState = "sprint";
        e._chargeTimer = def.chargeDuration ?? 0.9;
        if (!def.lungeLock) e._chargeAngle = angle; // re-aim at sprint start
      }
      return;
    }

    if (e._chargeState === "sprint") {
      const spd = e.speed * (def.chargeSpeedMul ?? 3.0) * dt;
      const nx = e.x + Math.cos(e._chargeAngle) * spd;
      const ny = e.y + Math.sin(e._chargeAngle) * spd;
      const margin = 0.3;
      let hitWall = false;
      if (
        isPassable(
          map,
          Math.floor(nx + (Math.cos(e._chargeAngle) >= 0 ? margin : -margin)),
          Math.floor(e.y),
        )
      ) {
        e.x = nx;
      } else hitWall = true;
      if (
        isPassable(
          map,
          Math.floor(e.x),
          Math.floor(ny + (Math.sin(e._chargeAngle) >= 0 ? margin : -margin)),
        )
      ) {
        e.y = ny;
      } else hitWall = true;

      const pdx = player.x - e.x;
      const pdy = player.y - e.y;
      if (pdx * pdx + pdy * pdy < 1.2 * 1.2) {
        fx.damagePlayerCalls.push({
          damage: def.damage * (def.chargeDamageMul ?? 1.5),
          attacker: e,
        });
        fx.screenShake = Math.max(fx.screenShake, 6);
        e._chargeState = "ready";
        e._chargeCD = def.chargeCooldown;
        return;
      }
      e._chargeTimer -= dt;
      if (e._chargeTimer <= 0 || hitWall) {
        e._chargeState = "ready";
        e._chargeCD = def.chargeCooldown;
      }
    }
  }

  /**
   * Quill volleys: at range and in sight, the Hound stops and bristles for
   * `windup` seconds (its ridge stands and runs hot, and the fan it will fire
   * is drawn on the floor), then fires `count` slow quills across `spread`.
   * Below half health it fires a second volley straight after the first.
   * Quills are ordinary enemy rounds: they hit while it is phased, and a
   * Time-Lock catches them. Timers in seconds (enemy time).
   */
  _updateQuills(e, dt, dist, target, player, map, projectiles, entities, audio) {
    const q = e.def.quills;
    e._quillState = e._quillState ?? "ready";
    // It opens with a volley on sight: the first comes a second in.
    e._quillCD = (e._quillCD ?? 1.2) - dt;
    if (e._quillState === "ready") {
      if (e._quillCD > 0 || e._chargeState !== "ready" || e.state !== "chase") return;
      if (dist < q.minRange || dist > q.maxRange) return;
      if (!hasLineOfSight(map, e.x, e.y, target.x, target.y, EYE_Z, playerEyeZ(player))) return;
      e._quillState = "bristle";
      e._quillTimer = q.windup;
      e._quillVolleys = e.health < e.maxHealth * 0.5 ? q.volleysHurt : 1;
      e._quillAim = Math.atan2(target.y - e.y, target.x - e.x);
      audio.enemyBark?.(e.enemyType, "alert", audio.calculatePan?.(e.x, e.y, player.x, player.y, player.angle) ?? 0, dist);
      return;
    }
    e._quillTimer -= dt;
    // Tracks you until the last fifth of the tell, then commits.
    if (e._quillTimer > q.windup * 0.2) e._quillAim = Math.atan2(target.y - e.y, target.x - e.x);
    e.angle = e._quillAim;
    if (e._quillTimer > 0) return;
    for (const a of quillFan(q, e._quillAim)) {
      const quill = new Projectile(e.x + Math.cos(a) * 0.6, e.y + Math.sin(a) * 0.6, Math.cos(a), Math.sin(a), e.def.quills.damage, q.speed, "enemy");
      quill.color = "#ffd79a";
      quill._quill = true;
      projectiles.push(quill);
      entities.push(quill);
    }
    audio.enemyShoot(audio.calculatePan(e.x, e.y, player.x, player.y, player.angle));
    e._quillVolleys--;
    if (e._quillVolleys > 0) {
      e._quillTimer = q.gap;
      return;
    }
    e._quillState = "ready";
    e._quillCD = q.cooldown;
  }

  /** Patrol wander: pick a random direction and drift slowly */
  _patrolWander(e, dt, map) {
    if (e._wanderAngle == null) {
      e._wanderAngle = e.angle;
      e._wanderTimer = 0;
    }
    e._wanderTimer -= dt;
    if (e._wanderTimer <= 0) {
      e._wanderAngle += (Math.random() - 0.5) * Math.PI;
      e._wanderTimer = 1.5 + Math.random() * 2;
    }
    const speed = e.speed * 0.35 * dt;
    if (!stepEnemy(e, e._wanderAngle, speed, map)) e._wanderAngle += Math.PI;

    e.angle = e._wanderAngle;
  }
}
