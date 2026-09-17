/**
 * Meltdown run tick — auto-forward movement, corridor extension, hazards and
 * the temporal-anchor death check. Runs inside Game.update() while a meltdown
 * run is alive, after player movement and before firing.
 *
 * Same `game`-reference pattern as combat-orchestrator.js.
 */
import { createMeltdownEnemies, createMeltdownPickups } from "./spawner.js";

export function updateMeltdownRun(game, dt) {
  // Allow limited horizontal look: ±60° from forward (+Y / PI/2)
  const fwd = Math.PI / 2;
  const maxTurn = Math.PI / 3;
  let a = game.player.angle;
  // Normalize angle to [fwd - PI, fwd + PI]
  while (a - fwd > Math.PI) a -= Math.PI * 2;
  while (a - fwd < -Math.PI) a += Math.PI * 2;
  if (a > fwd + maxTurn) a = fwd + maxTurn;
  if (a < fwd - maxTurn) a = fwd - maxTurn;
  game.player.angle = a;

  const mResult = game.meltdown.update(dt, game.player.x, game.player.y);

  // Sync meltdown damage multiplier to player (for weapon system)
  game.player.damageMultiplier = game.meltdown.effectiveDamage();

  // Apply auto-forward movement (+Y direction) with collision
  // Braking: holding back key slows to 50% but costs stamina
  const kb = game.keybinds;
  const brakingHeld = game.keys[kb.moveBack] || game.keys["ArrowDown"];
  let effectiveMoveY = mResult.moveY;
  if (brakingHeld && effectiveMoveY > 0) {
    const brakeCost = 15 * dt; // stamina per second when braking
    if (game.player.stamina > 0) {
      game.player.stamina = Math.max(0, game.player.stamina - brakeCost);
      effectiveMoveY *= 0.5;
      game.player._meltdownBraking = true;
    } else {
      game.player._meltdownBraking = false;
    }
  } else {
    game.player._meltdownBraking = false;
  }
  const margin = 0.2;
  const newY = game.player.y + effectiveMoveY;
  const phasing =
    game.meltdown.abilityActive && game.meltdown.hero.ability === "phase";
  if (
    phasing ||
    game.isPassable(Math.floor(game.player.x), Math.floor(newY + margin))
  ) {
    game.player.y = newY;
  } else {
    // Can't move forward — take damage from impact
    game.player.health -= 5 * dt;
  }

  // Extend map when approaching the end
  for (const ev of mResult.events) {
    // Meltdown event audio
    if (ev.type === "heatWarning") game.audio.meltdownSpeedUp();
    else if (ev.type === "milestone") game.audio.meltdownCollect();
    else if (ev.type === "abilityEnd") game.audio.meltdownHit();

    // Meltdown upgrade screen — pause run and show choices
    if (ev.type === "upgradeScreen") {
      game._meltdownUpgradeChoices = ev.choices;
      game._meltdownUpgradeSel = 0;
      game.audio.meltdownCollect();
    }

    if (ev.type === "extend") {
      const { enemySpawns, pickupSpawns } = game.meltdown.extend(25);
      const diff = game.getDifficultyMultipliers();
      game.entities.push(
        ...createMeltdownEnemies(enemySpawns, diff),
        ...createMeltdownPickups(pickupSpawns),
      );
      game.map.height = game.meltdown.map.height;
    }
  }

  // Despawn entities far behind the player to avoid accumulation
  // In-place compaction; despawnY < player.y so one bound is enough.
  const despawnY = game.player.y - 40;
  let write = 0;
  for (const e of game.entities) {
    if (e.y > despawnY) game.entities[write++] = e;
  }
  game.entities.length = write;

  // Hazard damage
  if (mResult.hazardDmg > 0) {
    game.player.health -= mResult.hazardDmg;
    if (game.screenShake < 2) game.screenShake = 2;
  }

  // ARIA messages
  if (mResult.ariaMsg) {
    game._meltdownAriaText = mResult.ariaMsg;
    game._meltdownAriaTimer = 4;
  }
  if (game._meltdownAriaTimer > 0) {
    game._meltdownAriaTimer -= dt;
    if (game._meltdownAriaTimer <= 0) game._meltdownAriaText = null;
  }

  // Heal from upgrades (Nano-Repair Pulse)
  if (mResult.healAmount > 0) {
    game.player.health = Math.min(
      game.player.maxHealth,
      game.player.health + mResult.healAmount,
    );
  }

  // Death check — temporal anchor can save once
  if (game.player.health <= 0) {
    if (game.meltdown.onFatalHit()) {
      game.player.health = 1;
      game.screenShake = Math.max(game.screenShake, 10);
    } else {
      game.player.health = 0;
      game.player.alive = false;
      game.audio.meltdownDeath();
      game.meltdown.onDeath();
      game.deathTimer = 1.5;
    }
  }
}
