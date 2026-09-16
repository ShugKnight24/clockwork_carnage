/**
 * CombatOrchestrator — weapon firing, hitscan, damage application, kill flow.
 * Extracted from game.js via strangler fig pattern.
 *
 * All functions take `game` reference for state access (same pattern as CampaignManager).
 * Pure damage math lives in combat.js — this module orchestrates side effects.
 */
import {
  calculateEnemyDamage,
  applySplashDamage,
  markEnemyDead,
  calculatePlayerDamage,
  isBossEnemy,
  distanceToWall,
  pickHitscanTarget,
} from "./combat.js";
import { Projectile, Enemy, Pickup } from "../../js/entities.js";
import { aimAnglesForGame } from "./aim.js";
import { PLAYER_ADS_SPREAD_MULT } from "../constants.js";

export function fireWeapon(game) {
  const now = game.time;
  const wep = game.player.getWeaponDef();
  if (
    !wep ||
    now - game.player.lastFireTime <
      wep.fireRate / (game.player.fireRateMultiplier || 1)
  )
    return;
  if (game.player.ammo < wep.ammoPerShot && wep.id !== 0) return;

  game.player.lastFireTime = now;
  if (wep.id !== 0) game.player.ammo -= wep.ammoPerShot;
  game.player.weaponKick = 1;
  game.weaponAnimFrame = 1;
  game.weaponAnimTime = now;
  game.shotsFired++;
  game.achievementStats.totalShotsFired++;
  if (game.mode === "tutorial") game.tutorialFired = true;

  game._spawnMuzzleFlash(wep);

  // Screen-wide muzzle flash
  game._muzzleFlashTime = now;
  const MUZZLE_COLORS = { 2: "80,220,255", 7: "80,220,255", 3: "255,160,40", 6: "100,255,120" };
  game._muzzleFlashColor = MUZZLE_COLORS[wep.id] || "255,200,60";

  // Sound
  const WEAPON_SOUNDS = ["shootPistol", "shootShotgun", "shootPlasma", "shootCannon", "shootScattergun", "shootSniper", "shootRicochet", "shootEMP"];
  const soundMethod = WEAPON_SOUNDS[wep.id];
  if (soundMethod) game.audio[soundMethod]();

  const damage = wep.damage * game.player.damageMultiplier;
  const { yaw: aimAngle, pitch: aimPitch } = aimAnglesForGame(game);
  const spreadMul = game.player.isAiming ? PLAYER_ADS_SPREAD_MULT : 1;

  if (wep.type === "hitscan") {
    const pellets = (wep.pellets || 1) * (game.player.multiShot || 1);
    for (let p = 0; p < pellets; p++) {
      const spread = pellets > 1 ? (Math.random() - 0.5) * wep.spread * 2 * spreadMul : 0;
      hitscan(game, aimAngle + spread, damage, wep.range, aimPitch);
    }
  } else {
    const shots = game.player.multiShot || 1;
    for (let ms = 0; ms < shots; ms++) {
      const spreadAngle = shots > 1 ? (ms - (shots - 1) / 2) * 0.12 * spreadMul : 0;
      const shotAngle = aimAngle + spreadAngle;
      const dirX = Math.cos(shotAngle);
      const dirY = Math.sin(shotAngle);
      const proj = new Projectile(
        game.player.x,
        game.player.y,
        dirX, dirY, damage, 12, "player",
      );
      proj.pitch = aimPitch;
      proj.weaponId = wep.id;
      if (wep.id === 7) proj.emp = true;
      proj.color = game.getCharacterColor().accent || wep.color;
      game.projectiles.push(proj);
      game.entities.push(proj);
    }
  }

  game.screenShake = Math.max(
    game.screenShake,
    wep.id === 3 ? 6 : wep.id === 1 ? 4 : 2,
  );
  // Camera punch — per-weapon vertical recoil (radians)
  // Heavier weapons kick harder. ADS halves it.
  const CAMERA_PUNCH = [0.015, 0.03, 0.015, 0.04, 0.025, 0.035, 0.02, 0.025];
  const punchMul = game.player.isAiming ? 0.5 : 1;
  game.player.cameraPunch = Math.max(
    game.player.cameraPunch,
    (CAMERA_PUNCH[wep.id] || 0.015) * punchMul,
  );
  // Gamepad haptics — weapon fire
  game.gamepad?.vibrateLight?.();
}

export function hitscan(game, angle, damage, range, pitch = 0) {
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const hit = pickHitscanTarget(game.player, dirX, dirY, pitch, range, game.entities, game.map);
  // Tracer end = hit point, wall, or max range. Always spawn a tracer so the
  // player sees where the bullet went (closes the muzzle-flash → impact gap).
  let endDist;
  if (hit) {
    endDist = hit.dist;
    damageEnemy(game, hit.enemy, damage, hit.zone);
  } else {
    const wallDist = distanceToWall(game.player, dirX, dirY, game.map, range);
    endDist = wallDist;
    if (wallDist < range) game.spawnWallSparks(game.player.x + dirX * wallDist, game.player.y + dirY * wallDist);
  }
  if (game.tracers) {
    const wep = game.player.getWeaponDef?.();
    const TRACER_COLORS = { 0: "255,210,80", 1: "255,180,80", 4: "255,160,40", 5: "120,220,255", 6: "100,255,120" };
    game.tracers.push({
      x1: game.player.x,
      y1: game.player.y,
      x2: game.player.x + dirX * endDist,
      y2: game.player.y + dirY * endDist,
      pitch,
      life: 0.06,
      maxLife: 0.06,
      color: TRACER_COLORS[wep?.id] || "255,220,120",
    });
  }
}

export function damageEnemy(game, enemy, damage, zone = null) {
  game.shotsHit++;
  game.achievementStats.totalShotsHit++;

  // Apply zone multiplier before crit/shield. Crit + zone stack multiplicatively
  // (a headshot crit does HEADSHOT_MULT * 2 = 5x base damage).
  const zoneName = zone?.name || "body";
  const zoneMult = zone?.mult ?? 1;
  const zoneDamage = damage * zoneMult;
  const isHead = zoneName === "head";

  const { finalDamage, isCrit, shieldSpark } = calculateEnemyDamage(
    zoneDamage, enemy, game.player.critChance, game.player,
  );
  if (shieldSpark) game.glitchEffect = Math.max(game.glitchEffect, 0.08);

  // Sub-boss ARIA callout
  if (enemy.def.subBoss && !enemy._ariaTriggered) {
    enemy._ariaTriggered = true;
    game.queueAriaMessage("subBossEncounter");
  }

  enemy.health -= finalDamage;
  enemy.hitTime = game.time;
  enemy.state = "pain";
  enemy.painTimer = (isCrit || isHead) ? 250 : 150;
  // A crit or headshot interrupts a telegraphed attack outright; ordinary hits
  // only pause it (see the pain branch in ai.js).
  if (isCrit || isHead) enemy._staggered = true;

  const pan = game.audio.calculatePan(enemy.x, enemy.y, game.player.x, game.player.y, game.player.angle);
  const dist = Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y);
  game.audio.enemyHit(pan, dist);
  game.audio.hitConfirm?.(pan); // Distinct metallic ding for hit feedback
  if (isHead) game.audio.enemyHit?.(pan, dist); // double-tap for headshot ping

  game.hitMarker = (isCrit || isHead) ? 0.22 : 0.15;
  game.hitMarkerCrit = isCrit;
  game.hitMarkerHead = isHead;
  game.hitMarkerKill = enemy.health <= 0;
  game._lastHitWasCrit = isCrit || isHead;
  game._spawnHitImpact(enemy.x, enemy.y, enemy.def.color1, isCrit || isHead);
  game.damageNumbers.push({
    x: enemy.x, y: enemy.y,
    value: Math.round(finalDamage),
    crit: isCrit,
    zone: zoneName,
    head: isHead,
    life: 0.8,
    vx: (Math.random() - 0.5) * 30,
  });

  // Life steal
  if (game.player.lifeSteal && game.player.alive) {
    const heal = finalDamage * game.player.lifeSteal;
    game.player.health = Math.min(game.player.health + heal, game.player.maxHealth);
  }

  // Splash damage
  if (game.player.splashDamage && finalDamage > 0) {
    const killed = applySplashDamage(
      game.entities, enemy, finalDamage, game.player.splashDamage, game.time,
    );
    for (const target of killed) {
      game.player.score += target.def.score;
      game.player.kills++;
      game.killedEnemies++;
      game.achievementStats.totalKills++;
      const pan2 = game.audio.calculatePan(target.x, target.y, game.player.x, game.player.y, game.player.angle);
      const dist2 = Math.hypot(target.x - game.player.x, target.y - game.player.y);
      game.audio.enemyDeath(pan2, dist2);
      game.spawnDeathParticles(target.x, target.y, target.def.color1, target.def.color2);
      game.glitchEffect = 0.3;
      onEnemyKill(game, target);
    }
    if (killed.length >= 2) game.triggerAriaOnce("multiKillSplash", "multiKillSplash");
  }

  // Primary kill
  if (enemy.health <= 0) {
    markEnemyDead(enemy, game.time);
    game.player.score += enemy.def.score;
    game.player.kills++;
    game.killedEnemies++;
    game.achievementStats.totalKills++;
    const panDeath = game.audio.calculatePan(enemy.x, enemy.y, game.player.x, game.player.y, game.player.angle);
    const distDeath = Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y);
    game.audio.enemyDeath(panDeath, distDeath);
    game.spawnDeathParticles(enemy.x, enemy.y, enemy.def.color1, enemy.def.color2);
    game.glitchEffect = 0.3;
    onEnemyKill(game, enemy);
    // Hit-stop — freeze gameplay for a beat on kills (DOOM-like impact)
    game.hitStopFrames = Math.max(game.hitStopFrames || 0, (isCrit || isHead) ? 5 : 3);
    // Gamepad haptics — kill
    game.gamepad?.vibrateMedium?.();

    if (isBossEnemy(enemy) && game.mode === "campaign") {
      game.campaign.handleBossKill();
    }
  }
}

export function onEnemyKill(game, enemy) {
  const fx = game.killStreakSystem.onKill();

  // Bestiary: a kill is what reveals an enemy's dossier. Covers every kill
  // path — direct, splash and thorns all funnel through here.
  if (enemy?.enemyType && game.archive?.recordKill(enemy.enemyType)) {
    game.queueAriaMessage?.("bestiaryUnlocked");
  }

  // Campaign ammo drops
  if (enemy && game.mode === "campaign" && Math.random() < 0.18) {
    game.entities.push(new Pickup(enemy.x, enemy.y, "ammo"));
  }

  game.player.chronoEnergy = Math.min(
    game.player.maxChronoEnergy,
    game.player.chronoEnergy + fx.chronoBonus,
  );

  if (fx.screenShake) game.screenShake = Math.max(game.screenShake, fx.screenShake);
  if (fx.playAudio) game.audio.roundComplete();
  if (fx.glitchEffect) game.glitchEffect = Math.max(game.glitchEffect, fx.glitchEffect);
  if (fx.ariaCategory) game.queueAriaMessage(fx.ariaCategory);

  game.triggerAriaOnce("firstKill", "firstKill");

  // Echo clone spawning
  if (enemy?.def?.echoCloneOnDeath && enemy.def.cloneCount) {
    const clones = enemy.def.cloneCount || 1;
    for (let i = 0; i < clones; i++) {
      const angle = Math.random() * Math.PI * 2;
      const sx = enemy.x + Math.cos(angle) * 0.8;
      const sy = enemy.y + Math.sin(angle) * 0.8;
      if (game.isPassable(Math.floor(sx), Math.floor(sy))) {
        const clone = new Enemy(sx, sy, "glitchling");
        clone._isClone = true;
        clone.health = Math.max(6, Math.floor(clone.health * 0.5));
        clone.maxHealth = clone.health;
        game.entities.push(clone);
        game.totalEnemies++;
      }
    }
  }

  // Slow-mo last kill
  if (
    game.totalEnemies > 0 &&
    game.killedEnemies >= game.totalEnemies &&
    game.mode !== "tutorial"
  ) {
    game.slowMoTimer = 1.5;
    game.timeScale = 0.25;
  }
}

export function damagePlayer(game, amount, attacker) {
  if (!game.player.alive) return;

  const { actualDamage, dodged } = calculatePlayerDamage(amount, game.player);
  if (dodged || actualDamage <= 0) return;

  game.player.health -= actualDamage;
  game.player.hurtTime = game.time;
  if (attacker && typeof attacker.x === "number") {
    game.player.lastDamageAngle = Math.atan2(attacker.y - game.player.y, attacker.x - game.player.x);
  }
  game.screenShake = Math.max(game.screenShake, 4);
  game.audio.playerHit();
  game.audio.playerGrunt?.(game.getVoiceProfile?.(), "hurt");
  if (game.settings.haptics && navigator.vibrate) navigator.vibrate(50);
  // Gamepad haptics — player hit
  game.gamepad?.vibrateMedium?.();
  game.roundDamageTaken += actualDamage;

  // ARIA low health warnings
  const hpPct = game.player.health / game.player.maxHealth;
  if (hpPct <= 0.1 && hpPct > 0) {
    game.triggerAriaOnce("critical", "criticalHealth");
  } else if (hpPct <= 0.3 && hpPct > 0.1) {
    game.triggerAriaOnce("lowHp", "lowHealth");
  }

  // Thorns
  if (game.player.thorns > 0 && attacker && attacker.active && attacker.state !== "dead") {
    attacker.health -= amount * game.player.thorns;
    if (attacker.health <= 0) {
      markEnemyDead(attacker, game.time);
      game.killedEnemies++;
      game.player.score += attacker.def.score;
      game.player.kills++;
      const panThorns = game.audio.calculatePan(attacker.x, attacker.y, game.player.x, game.player.y, game.player.angle);
      const distThorns = Math.hypot(attacker.x - game.player.x, attacker.y - game.player.y);
      game.audio.enemyDeath(panThorns, distThorns);
      game.spawnDeathParticles(attacker.x, attacker.y, attacker.def.color1, attacker.def.color2);
      game.glitchEffect = 0.3;
      onEnemyKill(game, attacker);
    }
  }

  if (game.player.health <= 0) {
    game.player.health = 0;
    game.player.alive = false;
    game.deathTimer = 1.5;
    game.achievementStats.totalDeaths++;
    game.saveAchievements();
    game.audio.playerGrunt?.(game.getVoiceProfile?.(), "death");
    game.audio.playerDeath();
    game.queueAriaMessage("playerDeath");
    if (game.mode === "arena") {
      game.queueAriaMessage("arenaDefeat");
      if (game.arenaRound > game.achievementStats.highestArenaRound) {
        game.queueAriaMessage("arenaNewBest");
      }
    }
  }
}
