// ─── AI System ──────────────────────────────────────────────────────────────
// Enemy state machine: idle/patrol → chase → attack.
// Sub-boss abilities: summon, chrono-bomb, teleport/leap, shield regen, HUD disrupt.
// Boss special abilities: charge, stomp, missile spread, warp.
// Chrono-bomb fuse + detonation.
//
// ─── TIMER CONVENTION ───────────────────────────────────────────────────────
// • `dt` (seconds): The clamped game.deltaTime (≤0.033s). Used for movement,
//   decay timers, and anything that multiplies by dt directly.
// • `time` (ms): Sim-time in milliseconds (game.time). Used for cooldown
//   comparisons: `time - e.lastAttackTime > scaledAttackRate`.
// • Enemy internal timers (`painTimer`, `_summonTimer`, `_bombTimer`,
//   `_teleportTimer`, `_supportTimer`): All in MILLISECONDS. They tick
//   via `+= dt * 1000` or `-= enemyDt * 1000` to stay in ms.
// • `attackRate` in enemy defs: MILLISECONDS (e.g. 1000 = 1s between shots).
// ────────────────────────────────────────────────────────────────────────────
import { isPassable, hasLineOfSight } from "./physics.js";
import { Enemy, Projectile } from "../../js/entities.js";

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

export class AISystem {
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
    } = ctx;
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

      // Enemy-specific chrono scale
      const chronoMult = Number.isFinite(e.chronoMultiplier)
        ? e.chronoMultiplier
        : Number.isFinite(e.def?.chronoMultiplier)
          ? e.def.chronoMultiplier
          : 0.15;
      const enemyDt = player.chronoActive ? dt * chronoMult : dt;

      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ai = e.def.ai || "chase";

      // Pain state
      if (e.painTimer > 0) {
        e.painTimer -= enemyDt * 1000;
        if (e.painTimer <= 0) e.state = "chase";
        continue;
      }

      // EMP-disabled
      if (e._empDisabledUntil && time < e._empDisabledUntil) continue;

      e.stateTime += enemyDt;

      // ── Idle ──
      if (e.state === "idle") {
        if (ai === "patrol") this._patrolWander(e, enemyDt, map);
        if (
          dist < e.alertRange &&
          hasLineOfSight(map, e.x, e.y, player.x, player.y)
        ) {
          e.state = "chase";
          e.stateTime = 0;
          e.lastAttackTime = time; // prevents instant first shot
        }
      }

      // ── Chase ──
      if (e.state === "chase") {
        const angle = Math.atan2(dy, dx);
        e.angle = angle;

        // Beast charge ability (telegraph → sprint → impact)
        this._updateBeastCharge(e, enemyDt, dist, angle, player, map, fx);

        // Movement gate: normally stop inside attackRange, but strafe_fire / erratic
        // keep moving to create combat dynamism. Charging beast is controlled separately.
        const inAttackBand = dist <= e.def.attackRange * 0.8;
        const keepMoving = ai === "strafe_fire" || ai === "erratic";
        const charging = e._chargeState === "sprint";
        const shouldMove = !charging && (!inAttackBand || keepMoving);

        if (shouldMove) {
          let moveAngle = angle;
          let moveSpeed = e.speed;

          if (ai === "flanker") {
            const strafeDir = Math.floor(e.x * 7 + e.y * 13) % 2 ? 1 : -1;
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
            const orbitDir = Math.floor(e.x * 3 + e.y * 7) % 2 ? 1 : -1;
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

          const speed = moveSpeed * enemyDt;
          const newX = e.x + Math.cos(moveAngle) * speed;
          const newY = e.y + Math.sin(moveAngle) * speed;
          const margin = 0.3;
          const mx = Math.cos(moveAngle) >= 0 ? margin : -margin;
          const my = Math.sin(moveAngle) >= 0 ? margin : -margin;
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
        }

        // Attack if in range
        const chronoAttackScale =
          player.chronoActive && chronoMult > 0 ? chronoMult : 1;
        const scaledAttackRate =
          e.def.attackRate / timeScale / chronoAttackScale;
        if (
          dist < e.def.attackRange &&
          time - e.lastAttackTime > scaledAttackRate
        ) {
          if (hasLineOfSight(map, e.x, e.y, player.x, player.y)) {
            e.state = "attack";
            e.stateTime = 0;
            e.lastAttackTime = time;
          }
        }
      }

      // ── Attack ──
      if (e.state === "attack") {
        if (hasLineOfSight(map, e.x, e.y, player.x, player.y)) {
          if (e.def.attackType === "ranged") {
            const angle = Math.atan2(player.y - e.y, player.x - e.x);
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
            audio.enemyShoot(
              audio.calculatePan(e.x, e.y, player.x, player.y, player.angle),
            );
          } else {
            fx.damagePlayerCalls.push({ damage: e.def.damage, attacker: e });
          }
        }
        e.state = "chase";
        e.stateTime = 0;
      }

      // ── Sub-boss abilities ──

      // Summoner
      if (e.def.summonType && e.state !== "dead") {
        e._summonTimer = (e._summonTimer || 0) + dt * 1000;
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
        e._bombTimer = (e._bombTimer || 0) + dt * 1000;
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
          e._teleportTimer += dt * 1000;
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
                e.state = "attack";
                e.stateTime = 0;
                e.lastAttackTime = time;
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
          e._shield = Math.min(
            e._shieldMax,
            (e._shield || 0) + (e.def.shieldRegenRate || 2) * dt,
          );
        }

        // HUD disrupt
        if (e.def.disablesHUD) {
          e._supportTimer = (e._supportTimer || 0) + dt * 1000;
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
      if (!bomb.active) continue;
      bomb.fuseLife += dt;
      if (bomb.fuseLife >= bomb.fuseDuration) {
        const bdx = player.x - bomb.x;
        const bdy = player.y - bomb.y;
        if (bdx * bdx + bdy * bdy < bomb.radius * bomb.radius) {
          fx.damagePlayerCalls.push({ damage: bomb.damage });
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

    // Form 1+: Charge
    if (form >= 1 && e._bossChargeCD <= 0 && dist > 4 && dist < 20) {
      e._bossChargeCD = 6000;
      e._bossCharging = true;
      e._bossChargeTimer = 0;
      e._bossChargeDuration = 1.0;
      e._bossChargeAngle = atp;
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
    if (form >= 2 && e._bossStompCD <= 0 && dist < 5) {
      e._bossStompCD = 5000;
      if (dist < 4) {
        fx.damagePlayerCalls.push({ damage: e.def.damage * 0.8, attacker: e });
        fx.screenShake = Math.max(fx.screenShake, 12);
      }
      damageNumbers.push({
        x: e.x,
        y: e.y,
        value: "STOMP!",
        crit: true,
        life: 1.2,
        vx: (Math.random() - 0.5) * 20,
      });
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
      }
      audio.enemyShoot(
        audio.calculatePan(e.x, e.y, player.x, player.y, player.angle),
      );
    }

    // Form 3: Teleport behind player
    if (form >= 3 && e._bossTeleportCD <= 0 && dist > 8) {
      e._bossTeleportCD = 8000;
      const behind = player.angle + Math.PI;
      const tx = player.x + Math.cos(behind) * 3;
      const ty = player.y + Math.sin(behind) * 3;
      if (isPassable(map, Math.floor(tx), Math.floor(ty))) {
        e.x = tx;
        e.y = ty;
        fx.screenShake = Math.max(fx.screenShake, 5);
        damageNumbers.push({
          x: e.x,
          y: e.y,
          value: "WARP!",
          crit: true,
          life: 1.0,
          vx: (Math.random() - 0.5) * 20,
        });
      }
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
      if (e._chargeCD <= 0 && dist > def.attackRange && dist < def.sightRange) {
        e._chargeState = "windup";
        e._chargeTimer = def.chargeWindup ?? 0.6;
        e._chargeAngle = angle;
      }
      return;
    }

    if (e._chargeState === "windup") {
      e._chargeTimer -= dt;
      if (e._chargeTimer <= 0) {
        e._chargeState = "sprint";
        e._chargeTimer = def.chargeDuration ?? 0.9;
        e._chargeAngle = angle; // re-aim at sprint start
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
    const newX = e.x + Math.cos(e._wanderAngle) * speed;
    const newY = e.y + Math.sin(e._wanderAngle) * speed;
    const margin = 0.3;
    const mx = Math.cos(e._wanderAngle) >= 0 ? margin : -margin;
    const my = Math.sin(e._wanderAngle) >= 0 ? margin : -margin;
    if (
      isPassable(map, Math.floor(newX + mx), Math.floor(e.y)) &&
      isPassable(map, Math.floor(newX + mx), Math.floor(e.y + margin)) &&
      isPassable(map, Math.floor(newX + mx), Math.floor(e.y - margin))
    ) {
      e.x = newX;
    } else {
      e._wanderAngle += Math.PI;
    }

    if (
      isPassable(map, Math.floor(e.x), Math.floor(newY + my)) &&
      isPassable(map, Math.floor(e.x + margin), Math.floor(newY + my)) &&
      isPassable(map, Math.floor(e.x - margin), Math.floor(newY + my))
    ) {
      e.y = newY;
    } else {
      e._wanderAngle += Math.PI;
    }

    e.angle = e._wanderAngle;
  }
}
