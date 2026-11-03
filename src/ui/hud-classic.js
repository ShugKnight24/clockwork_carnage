/**
 * Classic HUD (hudStyle 1): an opaque bottom bar with portrait, weapons and
 * stats, restored from the pre-redesign codebase. Modern/Comic draw the bar
 * through renderModernClassic (hud-modern.js); Legacy's DOOM-style console
 * is below. Both then share the overlays above the bar.
 */

import { drawPortrait } from "./portrait.js";
import { getWeaponSprite } from "../assets/loader.js";
import { renderModernClassic } from "./hud-modern.js";
import { drawCombatCues } from "./combat-cues.js";
import { drawChronoCluster } from "./chrono-hud.js";
import { glyph } from "./input-glyphs.js";
import { drawConditioningChip } from "./reload-hud.js";
import {
  weaponSlug,
  drawHudMinimap,
  drawReticleStack,
  drawDamageNumbers,
  drawBossNameCard,
  drawStageCleared,
  drawSlowMoVignette,
  drawFpsCounter,
} from "./hud-shared.js";
import { drawMeltdownHeat, renderMeltdownUpgradeOverlay } from "./hud-meltdown.js";

/** @param {object} s - HUD snapshot (hud-state.js) */
export function renderClassicHUD(ctx, w, h, s, game) {
  const barH = s.barH;
  if (s.modern) {
    renderModernClassic(game, ctx, w, h, barH, s.hudFactor, s.portrait);
  } else {
    drawLegacyClassicConsole(ctx, w, h, s, game);
  }

  // ─── Meltdown HUD (heat meter top-right, overlay, ARIA text) ───
  if (s.mode === "meltdown") drawMeltdownHeat(ctx, s, w, h, barH);

  // ─── Boss Health Bar (top-center) ───
  if (!s.modern && s.boss) drawLegacyBossBar(ctx, w, s.boss);

  ctx.textAlign = "left";

  // ─── Minimap (top-right) ───
  const mmSize = s.minimapSize;
  drawHudMinimap(ctx, w - mmSize - 10, 10, mmSize, s.minimap);

  drawCombatCues(game, ctx, w, h, barH);

  // ─── Crosshair (centered in viewport above bar), reload, hit marker ───
  drawReticleStack(ctx, game, s, w, h, barH);

  // ─── Floating damage numbers ───
  drawDamageNumbers(ctx, s, w, h, barH, true, true);

  // ─── Kill streak ───
  game.killStreakSystem.renderFirstPerson(ctx, w, h, barH);
  drawBossNameCard(ctx, game, w, h);

  // ─── Stage cleared (arena only) ───
  drawStageCleared(ctx, game, s, w, h, barH, true);

  // ─── Slow-mo vignette ───
  drawSlowMoVignette(ctx, s, w, h, barH);

  // FPS counter
  drawFpsCounter(ctx, s, h, barH);

  // Achievement toast
  game.renderAchievementToast(ctx, w, h);
  drawConditioningChip(ctx, game, w, h);

  // Meltdown upgrade overlay
  if (s.meltdownUpgrade) renderMeltdownUpgradeOverlay(game, ctx, w, h);

  // ARIA comms overlay
  game.renderAriaComms(ctx, w, h);
}

/** Legacy boss bar: a boxed bar under the top edge with name and HP. */
function drawLegacyBossBar(ctx, w, bossEntity) {
  const bossBarW = Math.min(400, w * 0.4);
  const bossBarH = 14;
  const bossBarX = Math.floor(w / 2 - bossBarW / 2);
  const bossBarY = 14;
  const bossPct = Math.max(0, bossEntity.health / bossEntity.maxHealth);
  const bossForm = bossEntity.def.form || 1;
  const bossName = bossEntity.def.name || "BOSS";
  const bossColor = bossForm === 3 ? "#ff0044" : bossForm === 2 ? "#ff0066" : "#ff0088";
  // Background
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(bossBarX - 8, bossBarY - 18, bossBarW + 16, bossBarH + 28);
  ctx.strokeStyle = bossColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(bossBarX - 8, bossBarY - 18, bossBarW + 16, bossBarH + 28);
  // Name
  ctx.fillStyle = bossColor;
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "center";
  ctx.fillText(bossName, w / 2, bossBarY - 4);
  // Bar track + fill
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(bossBarX, bossBarY, bossBarW, bossBarH);
  ctx.fillStyle = bossColor;
  ctx.fillRect(bossBarX, bossBarY, bossBarW * bossPct, bossBarH);
  // Shine
  const bShine = ctx.createLinearGradient(bossBarX, bossBarY, bossBarX, bossBarY + bossBarH);
  bShine.addColorStop(0, "rgba(255,255,255,0.2)");
  bShine.addColorStop(0.5, "rgba(255,255,255,0)");
  bShine.addColorStop(1, "rgba(0,0,0,0.1)");
  ctx.fillStyle = bShine;
  ctx.fillRect(bossBarX, bossBarY, bossBarW * bossPct, bossBarH);
  // Border
  ctx.strokeStyle = bossColor;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(bossBarX, bossBarY, bossBarW, bossBarH);
  // HP text
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.max(9, bossBarH - 3)}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(`${Math.ceil(bossEntity.health)} / ${bossEntity.maxHealth}`, w / 2, bossBarY + bossBarH - 2);
}

/** Legacy console: stamina/chrono bars above a DOOM-style bottom bar. */
function drawLegacyClassicConsole(ctx, w, h, s, game) {
  const { barH, hudFactor, healthColor, staminaPct, chronoPct } = s;

  // ─── Stamina + Chrono bars (side-by-side above bottom bar) ───
  const staminaFactor = s.staminaBarSize / 100;
  const showChrono = chronoPct > 0.005 || s.chronoActive;
  const isActive = s.isSprinting || s.isDashing;
  const chronoIsActive = s.chronoActive;
  const gap = 10;

  const staminaBarH = Math.round(24 * staminaFactor);
  const totalW = Math.round(520 * staminaFactor);
  let staminaBarW, staminaBarX, chronoBarW, chronoBarX;
  if (showChrono) {
    staminaBarW = Math.round(totalW * 0.55);
    chronoBarW = totalW - staminaBarW - gap;
    staminaBarX = Math.floor(w / 2 - totalW / 2);
    chronoBarX = staminaBarX + staminaBarW + gap;
  } else {
    staminaBarW = totalW;
    staminaBarX = Math.floor(w / 2 - staminaBarW / 2);
    chronoBarW = 0;
    chronoBarX = 0;
  }
  const staminaBarY = h - barH - staminaBarH - 8;
  const chronoBarH = staminaBarH;
  const chronoBarY = staminaBarY;

  // Stamina glow
  if (isActive) {
    const glowColor = s.isDashing ? "rgba(0,255,255,0.15)" : "rgba(255,170,0,0.12)";
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.roundRect(staminaBarX - 6, staminaBarY - 6, staminaBarW + 12, staminaBarH + 12, 8);
    ctx.fill();
    const innerGlow = s.isDashing ? "rgba(0,255,255,0.25)" : "rgba(255,170,0,0.2)";
    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.roundRect(staminaBarX - 4, staminaBarY - 4, staminaBarW + 8, staminaBarH + 8, 6);
    ctx.fill();
  }

  // Stamina background
  ctx.fillStyle = "rgba(5,5,15,0.8)";
  ctx.beginPath();
  ctx.roundRect(staminaBarX - 2, staminaBarY - 2, staminaBarW + 4, staminaBarH + 4, 5);
  ctx.fill();

  // Stamina fill
  const staminaColor = s.isDashing ? "#00ffff"
    : s.isSprinting ? "#ffaa00"
    : staminaPct > 0.3 ? "#00ccff" : "#ff4400";
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath();
  ctx.roundRect(staminaBarX, staminaBarY, staminaBarW, staminaBarH, 4);
  ctx.fill();
  if (staminaPct > 0.005) {
    ctx.fillStyle = staminaColor;
    ctx.beginPath();
    ctx.roundRect(staminaBarX, staminaBarY, staminaBarW * staminaPct, staminaBarH, 4);
    ctx.fill();
    // Shine
    const shineGrad = ctx.createLinearGradient(staminaBarX, staminaBarY, staminaBarX, staminaBarY + staminaBarH);
    shineGrad.addColorStop(0, "rgba(255,255,255,0.25)");
    shineGrad.addColorStop(0.5, "rgba(255,255,255,0)");
    shineGrad.addColorStop(1, "rgba(0,0,0,0.15)");
    ctx.fillStyle = shineGrad;
    ctx.beginPath();
    ctx.roundRect(staminaBarX, staminaBarY, staminaBarW * staminaPct, staminaBarH, 4);
    ctx.fill();
  }
  // Stamina border
  ctx.strokeStyle = isActive ? staminaColor : "rgba(255,255,255,0.2)";
  ctx.lineWidth = isActive ? 1.5 : 1;
  ctx.beginPath();
  ctx.roundRect(staminaBarX, staminaBarY, staminaBarW, staminaBarH, 4);
  ctx.stroke();
  // Stamina label
  if (staminaPct < 0.99 || isActive) {
    const label = s.isDashing ? "DASH" : s.isSprinting ? "SPRINT" : "STAMINA";
    ctx.fillStyle = isActive ? staminaColor : "rgba(255,255,255,0.6)";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, staminaBarX + staminaBarW * 0.25, staminaBarY + staminaBarH / 2 + 5);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(`${Math.floor(staminaPct * 100)}%`, staminaBarX + staminaBarW * 0.75, staminaBarY + staminaBarH / 2 + 5);
  }

  // Chrono bar
  if (showChrono) {
    if (chronoIsActive) {
      ctx.fillStyle = "rgba(180,0,255,0.15)";
      ctx.beginPath();
      ctx.roundRect(chronoBarX - 4, chronoBarY - 4, chronoBarW + 8, chronoBarH + 8, 6);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(5,5,15,0.7)";
    ctx.beginPath();
    ctx.roundRect(chronoBarX - 1, chronoBarY - 1, chronoBarW + 2, chronoBarH + 2, 4);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.beginPath();
    ctx.roundRect(chronoBarX, chronoBarY, chronoBarW, chronoBarH, 3);
    ctx.fill();
    if (chronoPct > 0.005) {
      const chronoColor = chronoIsActive ? "#cc44ff" : chronoPct >= 0.15 ? "#9944ff" : "#664488";
      ctx.fillStyle = chronoColor;
      ctx.beginPath();
      ctx.roundRect(chronoBarX, chronoBarY, chronoBarW * chronoPct, chronoBarH, 3);
      ctx.fill();
      const cShine = ctx.createLinearGradient(chronoBarX, chronoBarY, chronoBarX, chronoBarY + chronoBarH);
      cShine.addColorStop(0, "rgba(255,255,255,0.2)");
      cShine.addColorStop(0.5, "rgba(255,255,255,0)");
      cShine.addColorStop(1, "rgba(0,0,0,0.1)");
      ctx.fillStyle = cShine;
      ctx.beginPath();
      ctx.roundRect(chronoBarX, chronoBarY, chronoBarW * chronoPct, chronoBarH, 3);
      ctx.fill();
    }
    ctx.strokeStyle = chronoIsActive ? "#cc44ff" : "rgba(150,100,200,0.3)";
    ctx.lineWidth = chronoIsActive ? 1.5 : 1;
    ctx.beginPath();
    ctx.roundRect(chronoBarX, chronoBarY, chronoBarW, chronoBarH, 3);
    ctx.stroke();
    const chronoLabel = chronoIsActive ? "CHRONO SHIFT" : "CHRONO";
    ctx.fillStyle = chronoIsActive ? "#cc44ff" : "rgba(180,140,220,0.6)";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(chronoLabel, chronoBarX + chronoBarW * 0.3, chronoBarY + chronoBarH / 2 + 4);
    ctx.fillStyle = "rgba(180,140,220,0.5)";
    ctx.fillText(`${Math.floor(chronoPct * 100)}%`, chronoBarX + chronoBarW * 0.75, chronoBarY + chronoBarH / 2 + 4);
    ctx.fillStyle = "rgba(150,120,200,0.3)";
    ctx.font = "bold 9px monospace";
    ctx.fillText(`[HOLD ${glyph(game, "chronoShift").text}]`, chronoBarX + chronoBarW - 15, chronoBarY + chronoBarH / 2 + 4);
  }

  // Chronos: the Resonance eye and the unlocked powers, on the bars' row.
  drawChronoCluster(ctx, game, Math.floor(w / 2 - totalW / 2) + totalW + 14, staminaBarY + staminaBarH / 2, {
    size: Math.round(24 * staminaFactor),
  });

  // ─── DOOM-Style Bottom Bar ───
  // Base panel
  ctx.fillStyle = "#333333";
  ctx.fillRect(0, h - barH, w, barH);
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(4, h - barH + 4, w - 8, barH - 8);

  // Layout constants
  const pad = 14;
  const portraitW = Math.round(180 * hudFactor);
  const portraitH = Math.round(160 * hudFactor);
  const portraitX = Math.floor(w / 2 - portraitW / 2);
  const portraitY = h - barH;

  // Panel beveling helper
  const drawPanel = (px, py, pw, ph) => {
    ctx.fillStyle = "#111111";
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = "#555555";
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, pw, ph);
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(px + 4, py + 4, pw - 8, ph - 8);
  };

  // ─── AMMO (Far Left) ───
  const ammoPanelW = Math.floor(portraitX * 0.4);
  const panelY = h - barH + 12;
  const panelH = barH - 24;
  drawPanel(pad, panelY, ammoPanelW, panelH);
  ctx.fillStyle = "#ffcc00";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("AMMO", pad + ammoPanelW / 2, panelY + 22);
  ctx.fillStyle = s.ammoBoost ?? "#ffaa00";
  ctx.font = game.scaledFont(64, "bold");
  {
    // Shrink a long count (god mode) to the panel rather than spill out of it.
    const ammoStr = s.ammoText;
    const tw = ctx.measureText(ammoStr).width;
    if (tw > ammoPanelW - 20) ctx.font = game.scaledFont(Math.floor(64 * (ammoPanelW - 20) / tw), "bold");
    ctx.fillText(ammoStr, pad + ammoPanelW / 2, panelY + panelH - 24);
  }

  // ─── HEALTH (Left Center) ───
  const healthPanelW = portraitX - ammoPanelW - pad * 2.5;
  const healthX = pad + ammoPanelW + pad / 2;
  drawPanel(healthX, panelY, healthPanelW, panelH);
  ctx.fillStyle = healthColor;
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  ctx.fillText("HEALTH", healthX + healthPanelW / 2, panelY + 22);
  ctx.fillStyle = "#ffffff";
  ctx.font = game.scaledFont(64, "bold");
  ctx.fillText(`${Math.ceil(s.health)}%`, healthX + healthPanelW / 2, panelY + panelH - 24);

  // ─── PORTRAIT (Center) ───
  if (s.showPortrait) {
    drawPortrait(ctx, portraitX, portraitY, portraitW, portraitH, s.portrait);

    // Heavy DOOM border for portrait
    ctx.strokeStyle = "#444444";
    ctx.lineWidth = 8;
    ctx.strokeRect(portraitX - 4, portraitY - 4, portraitW + 8, portraitH + 8);
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 4;
    ctx.strokeRect(portraitX - 2, portraitY - 2, portraitW + 4, portraitH + 4);
  }

  // ─── SHIELD / ARMOR (Right Center) ───
  const rightZoneW = w - (portraitX + portraitW);
  const shieldPanelW = Math.floor(rightZoneW * 0.4) - pad * 1.5;
  const shieldX = portraitX + portraitW + pad;
  if (s.maxShield > 0) {
    drawPanel(shieldX, panelY, shieldPanelW, panelH);
    ctx.fillStyle = "#00ccff";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SHIELD", shieldX + shieldPanelW / 2, panelY + 22);
    const shieldPct = Math.ceil((s.shield / s.maxShield) * 100);
    ctx.fillStyle = "#ffffff";
    ctx.font = game.scaledFont(64, "bold");
    ctx.fillText(`${shieldPct}%`, shieldX + shieldPanelW / 2, panelY + panelH - 24);
  }

  // ─── ARMS / WEAPONS (Far Right) ───
  // We will show 8 slots as a grid
  const armsX = shieldX + shieldPanelW + pad / 2;
  const armsW = rightZoneW - shieldPanelW - pad * 2.5;
  drawPanel(armsX, panelY, armsW, panelH);

  ctx.fillStyle = "#ff5500";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  ctx.fillText("ARMS", armsX + armsW / 2, panelY + 22);

  const cols = 4;
  const rows = 2;
  const cellW = (armsW - 16) / cols;
  const cellH = (panelH - 40) / rows;
  const startX = armsX + 8;
  const startY = panelY + 30;

  for (let i = 0; i < 8; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = startX + col * cellW;
    const cy = startY + row * cellH;

    const hasWeapon = s.weapons[i] !== undefined;
    const isActive = i === s.currentWeapon;

    // Cell bg
    if (isActive) {
      ctx.fillStyle = "rgba(255,170,0,0.3)";
      ctx.fillRect(cx + 2, cy + 2, cellW - 4, cellH - 4);
    }

    if (hasWeapon) {
      const wp = s.weapons[i];
      const sprite = getWeaponSprite(weaponSlug(wp.name));
      if (sprite) {
        const inset = 4;
        ctx.save();
        ctx.globalAlpha = isActive ? 1.0 : 0.4;
        ctx.drawImage(sprite, cx + inset, cy + inset, cellW - inset * 2, cellH - inset * 2);
        ctx.restore();
      }
    }

    // Number overlay
    ctx.fillStyle = isActive ? "#ffffff" : hasWeapon ? "#ffaa00" : "#444444";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`${i + 1}`, cx + 4, cy + 14);
  }

  // ─── KILLS / SCORE (Small, top corners of HUD bar) ───
  // Only show if setting is enabled, tuck them in unobtrusively
  if (s.showKills) {
    ctx.fillStyle = "#ff8866";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`KILLS: ${s.killedEnemies}`, pad, h - barH - 8);
  }
  if (s.showScore) {
    ctx.fillStyle = "#00ddff";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`SCORE: ${s.score}`, w - pad, h - barH - 8);
  }

  // ─── Arena Timer (top-left, larger box) ───
  if (s.mode === "arena") {
    const secs = Math.ceil(s.arenaTimer);
    const warning = secs <= 10;
    const cleared = s.arenaClearTimer != null;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(10, 10, 160, 90);
    ctx.strokeStyle = warning ? "rgba(255,34,0,0.6)" : cleared ? "rgba(0,255,100,0.5)" : "rgba(0,200,255,0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 160, 90);
    ctx.fillStyle = cleared ? "#00ff66" : warning ? (Math.floor(s.time / 250) % 2 ? "#ff2200" : "#ffaa00") : "#00ffcc";
    ctx.font = "bold 44px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${secs}s`, 90, 62);
    ctx.fillStyle = cleared ? "rgba(0,255,100,0.7)" : "rgba(255,255,255,0.5)";
    ctx.font = "bold 14px monospace";
    ctx.fillText(cleared ? "CLEARED!" : "TIME", 90, 28);
    if (s.roundElapsedSec !== null) {
      const elapsedSec = s.roundElapsedSec;
      const mins = Math.floor(elapsedSec / 60);
      const secs2 = elapsedSec % 60;
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "12px monospace";
      ctx.fillText(`${mins}:${secs2.toString().padStart(2, "0")} elapsed`, 90, 82);
    }
  }

  // ─── Campaign Timer (top-left) ───
  if (s.mode === "campaign" && s.roundElapsedSec !== null) {
    const elapsedSec = s.roundElapsedSec;
    const mins = Math.floor(elapsedSec / 60);
    const secs = elapsedSec % 60;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(10, 10, 90, 24);
    ctx.fillStyle = "rgba(200,220,255,0.5)";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${mins}:${secs.toString().padStart(2, "0")}`, 55, 27);
  }
}
