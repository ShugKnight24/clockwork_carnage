// ─── AI System ──────────────────────────────────────────────────────────────
// Enemy state machine: idle/patrol → chase → attack.
// Sub-boss abilities: summon, chrono-bomb, teleport/leap, shield regen, HUD disrupt.
// Boss special abilities: charge, stomp, missile spread, warp.
// Chrono-bomb fuse + detonation.
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
    const { entities, player, map, time, timeScale, projectiles, chronoBombs, damageNumbers, audio } = ctx;
    const fx = { damagePlayerCalls: [], screenShake: 0, hudDisabledUntil: null, ariaMessages: [], totalEnemiesAdded: 0 };

    // Tick dissolve timers for dying enemies
    for (let i = entities.length - 1; i >= 0; i--) {
      const e = entities[i];
      if (e.dissolving) {
        e.dissolveTimer -= dt;
        if (e.dissolveTimer <= 0) { e.dissolving = false; e.active = false; }
      }
    }

    for (const e of entities) {
      if (e.type !== "enemy" || !e.active || e.dissolving) continue;

      // Enemy-specific chrono scale
      const chronoMult = Number.isFinite(e.chronoMultiplier)
        ? e.chronoMultiplier
        : Number.isFinite(e.def?.chronoMultiplier) ? e.def.chronoMultiplier : 0.15;
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
        if (dist < e.alertRange && hasLineOfSight(map, e.x, e.y, player.x, player.y)) {
          e.state = "chase";
          e.stateTime = 0;
        }
      }

      // ── Chase ──
      if (e.state === "chase") {
        const angle = Math.atan2(dy, dx);
        e.angle = angle;

        if (dist > e.def.attackRange * 0.8) {
          let moveAngle = angle;
          let moveSpeed = e.speed;

          if (ai === "flanker") {
            const strafeDir = Math.floor(e.x * 7 + e.y * 13) % 2 ? 1 : -1;
            const strafeFactor = Math.min(1, dist / (e.def.attackRange * 1.5));
            moveAngle = angle + strafeDir * strafeFactor * 1.05;
            moveSpeed *= 1.1;
          } else if (ai === "ambush") {
            if (e.stateTime < 2) moveSpeed *= 1.8;
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
          ) { e.x = newX; }
          if (
            isPassable(map, Math.floor(e.x), Math.floor(newY + my)) &&
            isPassable(map, Math.floor(e.x + margin), Math.floor(newY + my)) &&
            isPassable(map, Math.floor(e.x - margin), Math.floor(newY + my))
          ) { e.y = newY; }
        }

        // Attack if in range
        const chronoAttackScale = player.chronoActive && chronoMult > 0 ? chronoMult : 1;
        const scaledAttackRate = e.def.attackRate / timeScale / chronoAttackScale;
        if (dist < e.def.attackRange && time - e.lastAttackTime > scaledAttackRate) {
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
              e.x + Math.cos(angle) * 0.4, e.y + Math.sin(angle) * 0.4,
              Math.cos(angle), Math.sin(angle),
              e.def.damage, 6, "enemy",
            );
            proj.color = e.def.color1;
            projectiles.push(proj);
            entities.push(proj);
            audio.enemyShoot(audio.calculatePan(e.x, e.y, player.x, player.y, player.angle));
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
            s => s.type === "enemy" && s.active && s._summoned && s.state !== "dead",
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
            x: e.x, y: e.y,
            radius: e.def.bombRadius || 2.0,
            damage: e.def.bombDamage || 25,
            fuseLife: 0, fuseDuration: 1.5,
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
              const leapDist = e.def.leapDistance || Math.max(1.5, e.def.attackRange || 3);
              const tx = player.x - Math.cos(atp) * Math.min(1.5, leapDist);
              const ty = player.y - Math.sin(atp) * Math.min(1.5, leapDist);
              if (isPassable(map, Math.floor(tx), Math.floor(ty))) {
                e.x = tx; e.y = ty;
                e.state = "attack"; e.stateTime = 0; e.lastAttackTime = time;
                fx.screenShake = Math.max(fx.screenShake, 2);
                audio.enemyHit(audio.calculatePan(e.x, e.y, player.x, player.y, player.angle));
              }
            }
          }
        }

        // Shield regen
        if (e.def.shieldRegen) {
          if (e._shieldMax == null) {
            e._shieldMax = e.def.shieldMax || Math.max(20, Math.floor(e.def.health * 0.25));
            e._shield = e._shieldMax;
          }
          e._shield = Math.min(e._shieldMax, (e._shield || 0) + (e.def.shieldRegenRate || 2) * dt);
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
        this._updateBoss(e, dt, dist, player, map, projectiles, entities, damageNumbers, audio, fx);
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
  _updateBoss(e, dt, dist, player, map, projectiles, entities, damageNumbers, audio, fx) {
    const isBoss = e.enemyType === "boss" || e.enemyType === "boss_form2" || e.enemyType === "boss_form3";
    if (!isBoss || e.state !== "chase") return;

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
      if (isPassable(map, Math.floor(cx), Math.floor(cy))) { e.x = cx; e.y = cy; }
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
      damageNumbers.push({ x: e.x, y: e.y, value: "STOMP!", crit: true, life: 1.2 });
    }

    // Form 2+: Missile spread
    if (form >= 2 && e._bossMissileCD <= 0 && dist > 3 && dist < e.def.attackRange * 1.2) {
      e._bossMissileCD = 4000;
      for (let m = -1; m <= 1; m++) {
        const mAngle = atp + m * 0.3;
        const proj = new Projectile(
          e.x + Math.cos(mAngle) * 0.5, e.y + Math.sin(mAngle) * 0.5,
          Math.cos(mAngle), Math.sin(mAngle),
          e.def.damage * 0.6, 7, "enemy",
        );
        proj.color = form === 3 ? "#ff2244" : "#e04800";
        projectiles.push(proj);
        entities.push(proj);
      }
      audio.enemyShoot(audio.calculatePan(e.x, e.y, player.x, player.y, player.angle));
    }

    // Form 3: Teleport behind player
    if (form >= 3 && e._bossTeleportCD <= 0 && dist > 8) {
      e._bossTeleportCD = 8000;
      const behind = player.angle + Math.PI;
      const tx = player.x + Math.cos(behind) * 3;
      const ty = player.y + Math.sin(behind) * 3;
      if (isPassable(map, Math.floor(tx), Math.floor(ty))) {
        e.x = tx; e.y = ty;
        fx.screenShake = Math.max(fx.screenShake, 5);
        damageNumbers.push({ x: e.x, y: e.y, value: "WARP!", crit: true, life: 1.0 });
      }
    }
  }

  /** Patrol wander: pick a random direction and drift slowly */
  _patrolWander(e, dt, map) {
    if (e._wanderAngle == null) { e._wanderAngle = e.angle; e._wanderTimer = 0; }
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
    ) { e.x = newX; }
    else { e._wanderAngle += Math.PI; }

    if (
      isPassable(map, Math.floor(e.x), Math.floor(newY + my)) &&
      isPassable(map, Math.floor(e.x + margin), Math.floor(newY + my)) &&
      isPassable(map, Math.floor(e.x - margin), Math.floor(newY + my))
    ) { e.y = newY; }
    else { e._wanderAngle += Math.PI; }

    e.angle = e._wanderAngle;
  }
}
