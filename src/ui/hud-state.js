/**
 * The HUD's per-frame snapshot: everything the legacy layouts read from the
 * game, gathered once by renderHUD so each style renderer reads a plain
 * object instead of reaching into `game`. Arrays and the weapon def are the
 * live references, not copies; nothing here is written back.
 *
 * Modern/Vanguard layouts (hud-modern.js, hud-vanguard.js) still take `game`,
 * and so do the shared pieces that call into game systems (aim, cover,
 * reload, chrono cluster, boss name card, comms).
 */

import { effectiveAimFov } from "../systems/aim.js";
import { isCompactPhone } from "./layout.js";
import { pieceOf } from "../core/character-fields.js";
import { isModernArt } from "../rendering/art-style.js";
import { ammoTint } from "./reload-hud.js";

/** Build minimap state from game instance */
export function minimapState(game) {
  return {
    map: game.map,
    entities: game.entities,
    player: game.player,
    chronoBombs: game._chronoBombs,
    objectiveWaypoint: game.objectiveWaypoint,
  };
}

/** Build portrait state from game instance */
export function portraitState(game) {
  const c = game.character || {};
  return {
    health: game.player.health,
    maxHealth: game.player.maxHealth,
    alive: game.player.alive,
    time: game.time,
    palette: pieceOf(c, "color"),
    helmet: pieceOf(c, "helmet"),
    visor: pieceOf(c, "visor"),
    shield: game.player.shield || 0,
    character: game.character,
  };
}

/** Elapsed whole seconds since the round started, or null before it has. */
function roundElapsed(game) {
  if (!game.roundStartTime) return null;
  return Math.floor((performance.now() - game.roundStartTime) / 1000);
}

/**
 * The live boss for the legacy boss bar. Classic matches the boss enemy
 * types; the floating layouts match any def flagged `boss`.
 */
function legacyBoss(game, byType) {
  return game.entities.find((e) =>
    byType
      ? e.type === "enemy" && e.active && e.health > 0 &&
        (e.enemyType === "boss" || e.enemyType === "boss_form2" || e.enemyType === "boss_form3")
      : e.type === "enemy" && e.active && e.health > 0 && e.def?.boss,
  ) || null;
}

/** @param {object} game - Game instance (read-only access) */
export function buildHudState(game) {
  const p = game.player;
  const settings = game.settings;
  const h = game.hudH;
  const modern = isModernArt();
  const hudStyle = settings.hudStyle;
  const hudFactor = settings.hudScale / 100;
  const compact = !!(game.isTouchDevice && isCompactPhone(h));
  const barH = compact
    ? Math.round(60 * hudFactor)
    : hudStyle === 1
      ? Math.round(160 * hudFactor)
      : 0;
  const healthPct = p.health / p.maxHealth;
  const meltdown = game.mode === "meltdown" ? game.meltdown : null;

  return {
    mode: game.mode,
    time: game.time,
    modern,
    hudStyle,
    hudFactor,
    // Vanguard (hudStyle 4) is Modern-only; Legacy draws it as Minimal.
    vanguard: hudStyle === 4 && modern,
    compact,
    barH,
    isTouchDevice: game.isTouchDevice,
    touchMinimapZone: game.touchControls?.zones?.minimap ?? null,

    showScore: settings.showScore,
    showKills: settings.showKills,
    showWeapons: settings.showWeapons,
    showPortrait: settings.showPortrait,
    minimapSize: settings.minimapSize,
    staminaBarSize: settings.staminaBarSize,
    difficulty: settings.difficulty,
    customHudLayout: settings.customHudLayout,

    health: p.health,
    maxHealth: p.maxHealth,
    healthPct,
    healthColor:
      healthPct > 0.6
        ? game.cbColor("#00ff66")
        : healthPct > 0.3
          ? game.cbColor("#ffaa00")
          : game.cbColor("#ff2200"),
    shield: p.shield,
    maxShield: p.maxShield,
    staminaPct: p.stamina / (p.staminaCap ?? p.maxStamina),
    chronoPct: p.chronoEnergy / p.maxChronoEnergy,
    chronoActive: p.chronoActive,
    isSprinting: p.isSprinting,
    isDashing: p.isDashing,
    weapon: p.getWeaponDef(),
    weapons: p.weapons,
    currentWeapon: p.currentWeapon,
    ammoText: `${p.ammoLabel ?? p.ammo}`,
    // The active-reload boost colour, or null: `s.ammoBoost ?? base`.
    ammoBoost: ammoTint(game, null),
    score: p.score,
    playerX: p.x,
    playerY: p.y,
    playerAngle: p.angle,
    meltdownBraking: p._meltdownBraking,

    killedEnemies: game.killedEnemies,
    totalEnemies: game.totalEnemies,
    arenaTimer: game.arenaTimer,
    arenaRound: game.arenaRound,
    arenaClearTimer: game.arenaClearTimer,
    roundElapsedSec: roundElapsed(game),
    levelName: game.mode === "campaign" ? game.map.name || `Level ${game.campaignLevel + 1}` : "",
    ngPlusCycle: game.ngPlusCycle,
    powerCells: game.mode === "campaign" || game.mode === "tutorial" ? game.powerCells : null,
    lockdown: game.mode === "campaign" ? game.lockdown : null,
    boss: modern ? null : legacyBoss(game, hudStyle === 1),

    meltdownHud: meltdown ? meltdown.getHUD() : null,
    heatOverlay: meltdown ? meltdown.getHeatOverlay() : null,
    meltdownAriaText: game._meltdownAriaText,
    meltdownAriaTimer: game._meltdownAriaTimer,
    meltdownUpgrade: !!game._meltdownUpgradeChoices,

    hitMarker: game.hitMarker,
    hitMarkerCrit: game.hitMarkerCrit,
    hitMarkerHead: game.hitMarkerHead,
    hitMarkerKill: game.hitMarkerKill,
    hitMarkerBlocked: game.hitMarkerBlocked,
    damageNumbers: game.damageNumbers,
    aimFov: (effectiveAimFov(p, settings) * Math.PI) / 180,

    slowMoTimer: game.slowMoTimer,
    showFPS: game.showFPS,
    fps: game.fps,

    portrait: portraitState(game),
    minimap: minimapState(game),
  };
}
