/**
 * Compact phone HUD (a touch device under the compact height): a slim bottom
 * bar with health, ammo and key info, the phone minimap where the touch
 * layout puts it, and the shared overlays scaled for a short screen.
 * Vanguard and Modern draw their own bar (hud-vanguard.js, hud-modern.js);
 * Legacy's is below.
 */

import { renderModernCompact, drawModernTimerPill } from "./hud-modern.js";
import { renderVanguardCompact, drawVanguardThreatRing } from "./hud-vanguard.js";
import { drawCombatCues } from "./combat-cues.js";
import { drawChronoCluster } from "./chrono-hud.js";
import { drawConditioningChip } from "./reload-hud.js";
import {
  drawPhoneMinimap,
  drawReticleStack,
  drawDamageNumbers,
  drawBossNameCard,
  drawStageCleared,
  drawSlowMoVignette,
  drawFpsCounter,
} from "./hud-shared.js";
import { drawMeltdownHeat } from "./hud-meltdown.js";

/** @param {object} s - HUD snapshot (hud-state.js) */
export function renderCompactHUD(ctx, w, h, s, game) {
  const barH = s.barH;
  const vanguard = s.vanguard;
  if (vanguard) renderVanguardCompact(game, ctx, w, h, barH, s.hudFactor, s.portrait);
  else if (s.modern) renderModernCompact(game, ctx, w, h, barH, s.hudFactor);
  else drawLegacyCompactBar(ctx, w, h, s, game);

  drawPhoneMinimap(ctx, w, h, s);

  drawCombatCues(game, ctx, w, h, barH);
  if (vanguard) drawVanguardThreatRing(game, ctx, w, h, barH, true);

  // Crosshair, reload bar, power cells, hit marker
  drawReticleStack(ctx, game, s, w, h, barH);

  // Floating damage numbers
  drawDamageNumbers(ctx, s, w, h, barH, false, true);

  // Kill streak
  game.killStreakSystem.renderFirstPerson(ctx, w, h, barH);
  drawBossNameCard(ctx, game, w, h);

  // Achievement toast
  game.renderAchievementToast(ctx, w, h);
  drawConditioningChip(ctx, game, w, h);

  // Arena timer (compact)
  if (vanguard) {
    // Vanguard shows the round clock beside its vitals gauge.
  } else if (s.mode === "arena" && s.modern) {
    const secs = Math.ceil(s.arenaTimer);
    const warning = secs <= 10;
    drawModernTimerPill(ctx, 10, 10, "TIME", `${secs}s`, warning ? "#ff2a4a" : "#22e6ff",
      warning ? (Math.floor(s.time / 250) % 2 ? "#ff2a4a" : "#ffae3a") : "#e4edf5");
  } else if (s.mode === "arena") {
    const secs = Math.ceil(s.arenaTimer);
    const warning = secs <= 10;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(10, 10, 100, 50);
    ctx.strokeStyle = warning
      ? "rgba(255,34,0,0.6)"
      : "rgba(0,200,255,0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, 100, 50);
    ctx.fillStyle = warning
      ? Math.floor(s.time / 250) % 2
        ? "#ff2200"
        : "#ffaa00"
      : "#00ffcc";
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${secs}s`, 60, 44);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "bold 10px monospace";
    ctx.fillText("TIME", 60, 22);
  }

  // Campaign timer
  const elSec = s.roundElapsedSec;
  if (vanguard) {
    // Clock lives under the Vanguard vitals readout.
  } else if (s.mode === "campaign" && elSec !== null && s.modern) {
    drawModernTimerPill(ctx, 10, 10, "TIME", `${Math.floor(elSec / 60)}:${(elSec % 60).toString().padStart(2, "0")}`, "#22e6ff");
  } else if (s.mode === "campaign" && elSec !== null) {
    const mins = Math.floor(elSec / 60);
    const secs = elSec % 60;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(10, 10, 70, 20);
    ctx.fillStyle = "rgba(200,220,255,0.5)";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${mins}:${secs.toString().padStart(2, "0")}`, 45, 24);
  }

  // ── Meltdown HUD ──
  if (s.mode === "meltdown") {
    const mHud = s.meltdownHud;
    const heatPct = mHud.heat / 100;

    // Distance & Score (top-left)
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(10, 10, 140, 55);
    ctx.strokeStyle = `rgba(255,${Math.floor(170 - heatPct * 170)},0,0.5)`;
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, 140, 55);

    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffaa00";
    ctx.fillText("DISTANCE", 80, 22);
    ctx.font = "bold 22px monospace";
    ctx.fillText(`${mHud.distance}m`, 80, 44);
    ctx.font = "9px monospace";
    ctx.fillStyle = "rgba(200,200,200,0.6)";
    ctx.fillText(`SCORE: ${mHud.score}`, 80, 58);

    drawMeltdownHeat(ctx, s, w, h, barH);
  }

  ctx.textAlign = "left";

  // Stage cleared notification
  drawStageCleared(ctx, game, s, w, h, barH, false);

  // Slow-mo vignette overlay
  drawSlowMoVignette(ctx, s, w, h, barH);

  // FPS counter
  drawFpsCounter(ctx, s, h, barH);

  // ARIA comms overlay
  game.renderAriaComms(ctx, w, h);
}

/** Legacy compact bar: slim bar with health, ammo, and key info only */
function drawLegacyCompactBar(ctx, w, h, s, game) {
  const { barH, hudFactor, healthPct, healthColor, staminaPct, chronoPct } = s;
  const wep = s.weapon;

  // Stamina bar (slim, above the bar)
  const stBarH = Math.round(8 * hudFactor);
  const stBarW = Math.round(220 * hudFactor);
  const stBarX = Math.floor(w / 2 - stBarW / 2);
  const stBarY = h - barH - stBarH - 4;
  const isActive = s.isSprinting || s.isDashing;

  ctx.fillStyle = "rgba(5,5,15,0.7)";
  ctx.fillRect(stBarX - 1, stBarY - 1, stBarW + 2, stBarH + 2);
  if (staminaPct > 0.005) {
    const stColor = s.isDashing
      ? "#00ffff"
      : s.isSprinting
        ? "#ffaa00"
        : staminaPct > 0.3
          ? "#00ccff"
          : "#ff4400";
    ctx.fillStyle = stColor;
    ctx.fillRect(stBarX, stBarY, stBarW * staminaPct, stBarH);
  }
  ctx.strokeStyle = isActive ? "#ffaa00" : "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.strokeRect(stBarX, stBarY, stBarW, stBarH);

  // Chrono bar (smaller, above stamina)
  if (chronoPct > 0.005 || s.chronoActive) {
    const cBarH = Math.round(5 * hudFactor);
    const cBarW = Math.round(140 * hudFactor);
    const cBarX = Math.floor(w / 2 - cBarW / 2);
    const cBarY = stBarY - cBarH - 3;
    ctx.fillStyle = "rgba(5,5,15,0.6)";
    ctx.fillRect(cBarX - 1, cBarY - 1, cBarW + 2, cBarH + 2);
    if (chronoPct > 0.005) {
      ctx.fillStyle = s.chronoActive ? "#cc44ff" : "#9944ff";
      ctx.fillRect(cBarX, cBarY, cBarW * chronoPct, cBarH);
    }
    ctx.strokeStyle = s.chronoActive
      ? "#cc44ff"
      : "rgba(150,100,200,0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(cBarX, cBarY, cBarW, cBarH);
  }

  {
    const chipS = Math.round(14 * hudFactor);
    drawChronoCluster(ctx, game, w / 2, stBarY - Math.round(5 * hudFactor) - 12 - chipS / 2, { size: chipS, align: "center", labels: false });
  }

  // Bottom bar background
  ctx.fillStyle = "rgba(5,5,15,0.88)";
  ctx.fillRect(0, h - barH, w, barH);
  ctx.strokeStyle = "rgba(0,200,255,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h - barH);
  ctx.lineTo(w, h - barH);
  ctx.stroke();

  const pad = 8;
  const midY = h - barH / 2;

  // Left: HEALTH number + bar
  const hpW = Math.round(w * 0.22);
  ctx.fillStyle = healthColor;
  ctx.font = "bold 22px monospace";
  ctx.textAlign = "left";
  ctx.fillText(`${Math.ceil(s.health)}`, pad, midY + 3);
  // Health bar below number
  const hbW = hpW - pad;
  const hbH = 6;
  const hbY = midY + 10;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(pad, hbY, hbW, hbH);
  ctx.fillStyle = healthColor;
  ctx.fillRect(pad, hbY, hbW * healthPct, hbH);

  // Shield (if any)
  if (s.maxShield > 0) {
    const shieldPct = s.shield / s.maxShield;
    const sbY = hbY + hbH + 2;
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(pad, sbY, hbW, 4);
    ctx.fillStyle = "#4488ff";
    ctx.fillRect(pad, sbY, hbW * shieldPct, 4);
  }

  // Center-left: AMMO
  const ammoX = hpW + pad * 2;
  ctx.fillStyle = s.ammoBoost ?? "#ffcc00";
  ctx.font = "bold 22px monospace";
  ctx.textAlign = "center";
  ctx.fillText(s.ammoText, ammoX + 30, midY + 3);
  ctx.fillStyle = "rgba(255,204,0,0.5)";
  ctx.font = "bold 8px monospace";
  ctx.fillText("AMMO", ammoX + 30, midY - 12);

  // Center: Weapon name
  if (wep) {
    ctx.fillStyle = wep.color;
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(wep.name, w / 2, midY + 14);
  }

  // Weapon number
  ctx.fillStyle = "rgba(0,200,255,0.5)";
  ctx.font = "bold 9px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`W${s.currentWeapon + 1}`, w / 2, midY - 12);

  // Right: Kills + Score
  if (s.showKills) {
    const kx = w - pad - 110;
    ctx.fillStyle = "#ff8866";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${s.killedEnemies}/${s.totalEnemies}`, kx, midY + 2);
    ctx.fillStyle = "rgba(255,136,102,0.5)";
    ctx.font = "bold 8px monospace";
    ctx.fillText("KILLS", kx, midY - 10);
  }

  if (s.showScore) {
    const sx = w - pad;
    ctx.fillStyle = "#00ddff";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${s.score}`, sx, midY + 2);
    ctx.fillStyle = "rgba(0,221,255,0.5)";
    ctx.font = "bold 8px monospace";
    ctx.fillText("SCORE", sx, midY - 10);
  }

  // Round indicator (arena)
  if (s.mode === "arena") {
    ctx.fillStyle = "#ffaa00";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`R${s.arenaRound}`, w - pad, midY + 14);
  }

  // Difficulty
  const diffNames = ["EASY", "NORM", "HARD", "NITE"];
  const diffColors = ["#44ff44", "#00ccff", "#ffaa00", "#ff2200"];
  ctx.fillStyle = diffColors[s.difficulty];
  ctx.font = "bold 8px monospace";
  ctx.textAlign = "left";
  ctx.fillText(diffNames[s.difficulty], pad, midY - 12);
}
