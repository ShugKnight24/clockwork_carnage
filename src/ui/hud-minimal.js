/**
 * Minimal HUD (hudStyle 0, and Legacy's stand-in for Vanguard): no bottom
 * bar, everything floats at the screen edges. The Legacy panels are below;
 * Modern/Comic panels come from hud-modern.js and hud-vanguard.js.
 *
 * renderFloatingOverlays is the pass on top of every floating desktop layout
 * (Minimal, and the Modern Tactical/Custom/Vanguard panels): minimap,
 * reticle, damage numbers, banners, toasts and comms.
 */

import { getWeaponSprite } from "../assets/loader.js";
import { hudAnchors } from "./hud-modern.js";
import { drawVanguardThreatRing } from "./hud-vanguard.js";
import { drawCombatCues } from "./combat-cues.js";
import { drawChronoCluster } from "./chrono-hud.js";
import { drawConditioningChip } from "./reload-hud.js";
import {
  weaponSlug,
  drawHudMinimap,
  drawReticleStack,
  drawDamageNumbers,
  drawBossNameCard,
  drawStageCleared,
  drawSlowMoVignette,
} from "./hud-shared.js";
import { renderMeltdownUpgradeOverlay } from "./hud-meltdown.js";

/** Overlays over the floating desktop layouts (barH is 0). */
export function renderFloatingOverlays(ctx, w, h, s, game) {
  const vanguard = s.vanguard;
  // ─── MINIMAP (top-right, pushed down if kills pill is shown) ───
  if (!vanguard) {
    let mmSize = s.minimapSize;
    if (s.isTouchDevice && w < 700) {
      mmSize = Math.min(mmSize, Math.round(w * 0.28));
    }
    const mmY = s.showKills ? 48 : 10;
    drawHudMinimap(ctx, w - mmSize - 10, mmY, mmSize, s.minimap);
  }

  drawCombatCues(game, ctx, w, h, 0);
  if (vanguard) drawVanguardThreatRing(game, ctx, w, h, 0);

  // ─── CROSSHAIR (center of full screen, barH is 0), HIT MARKER ───
  drawReticleStack(ctx, game, s, w, h, 0);

  // ─── FLOATING DAMAGE NUMBERS ───
  drawDamageNumbers(ctx, s, w, h, 0, true, false);

  // ─── KILL STREAK ANNOUNCEMENT ───
  game.killStreakSystem.renderThirdPerson(ctx, w, h);
  drawBossNameCard(ctx, game, w, h);

  // ─── STAGE CLEARED (arena only) ───
  drawStageCleared(ctx, game, s, w, h, 0, true);

  // ─── SLOW-MO VIGNETTE ───
  drawSlowMoVignette(ctx, s, w, h, 0);

  // Achievement toast (above minimap area)
  game.renderAchievementToast(ctx, w, h);
  drawConditioningChip(ctx, game, w, h);

  // Meltdown upgrade selection overlay
  if (s.meltdownUpgrade) renderMeltdownUpgradeOverlay(game, ctx, w, h);

  // ARIA comms overlay (bottom-left)
  game.renderAriaComms(ctx, w, h);
}

/** Legacy Minimal panels: pills at the corners, thin bars bottom-centre. */
export function renderLegacyMinimalPanels(ctx, w, h, s, game) {
  // ─── Helper: rounded-rect pill background ───
  const drawPill = (x, y, pw, ph, alpha = 0.55) => {
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.beginPath();
    ctx.roundRect(x, y, pw, ph, 6);
    ctx.fill();
  };

  drawTopLeftStack(ctx, s, drawPill);

  // ─── TOP-RIGHT: Kills counter ───
  if (s.showKills) {
    const killText = `KILLS  ${s.killedEnemies} / ${s.totalEnemies}`;
    ctx.font = "bold 14px monospace";
    const tw = ctx.measureText(killText).width;
    const pw = tw + 20;
    const kx = w - pw - 12;
    // Push minimap Y down if kills pill is shown
    const ky = 12;
    drawPill(kx, ky, pw, 28, 0.55);
    ctx.fillStyle = "#ff8866";
    ctx.textAlign = "left";
    ctx.fillText(killText, kx + 10, ky + 19);
  }

  // ─── BOSS HEALTH BAR (top-center, only when boss is alive) ───
  if (s.boss) drawBossBar(ctx, w, s.boss, drawPill);

  drawBottomCenter(ctx, w, h, s, game);

  // ─── BOTTOM-RIGHT: Ammo count + weapon name ───
  {
    const wep = s.weapon;
    const brX = w - 12;
    const brY = h - 14;
    // Ammo (large number, right-aligned)
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = s.ammoBoost ?? "#ffcc00";
    ctx.font = game.scaledFont(38, "bold");
    ctx.fillText(s.ammoText, brX, brY - 18);
    // Weapon name (below ammo)
    if (wep) {
      ctx.fillStyle = wep.color;
      ctx.font = "bold 13px monospace";
      ctx.fillText(wep.name, brX, brY);
    }
  }
}

/** ─── TOP-LEFT: Score / Timer / Difficulty / Meltdown info ─── */
function drawTopLeftStack(ctx, s, drawPill) {
  let tlY = 12;
  const tlX = 12;
  const pillH = 28;
  const pillGap = 6;

  // Score pill
  if (s.showScore) {
    const scoreText = `SCORE  ${s.score}`;
    ctx.font = "bold 14px monospace";
    const tw = ctx.measureText(scoreText).width;
    const pw = tw + 20;
    drawPill(tlX, tlY, pw, pillH, 0.55);
    ctx.fillStyle = "#00ddff";
    ctx.textAlign = "left";
    ctx.fillText(scoreText, tlX + 10, tlY + 19);
    tlY += pillH + pillGap;
  }

  // Arena timer
  if (s.mode === "arena") {
    const secs = Math.ceil(s.arenaTimer);
    const warning = secs <= 10;
    const cleared = s.arenaClearTimer != null;
    const timerLabel = cleared ? "CLEARED" : `ROUND ${s.arenaRound}`;
    const timerVal = `${secs}s`;
    const timerColor = cleared
      ? "#00ff66"
      : warning
        ? Math.floor(s.time / 250) % 2
          ? "#ff2200"
          : "#ffaa00"
        : "#00ffcc";

    // Elapsed is a right-aligned sub-line sharing the label row, so the pill has
    // to be measured against label + gap + elapsed, not the label alone.
    let elapsedStr = "";
    let elapsedW = 0;
    if (s.roundElapsedSec !== null) {
      const elapsedSec = s.roundElapsedSec;
      const mins = Math.floor(elapsedSec / 60);
      const secs2 = elapsedSec % 60;
      elapsedStr = `${mins}:${secs2.toString().padStart(2, "0")} elapsed`;
      ctx.font = "10px monospace";
      elapsedW = ctx.measureText(elapsedStr).width;
    }

    ctx.font = "bold 12px monospace";
    const labelW = ctx.measureText(timerLabel).width;
    ctx.font = "bold 26px monospace";
    const valW = ctx.measureText(timerVal).width;
    const labelRowW = labelW + (elapsedW ? 12 + elapsedW : 0);
    const pw = Math.max(labelRowW, valW) + 24;
    const ph = 58;
    drawPill(tlX, tlY, pw, ph, 0.6);

    ctx.fillStyle = cleared ? "rgba(0,255,100,0.7)" : "rgba(255,255,255,0.5)";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "left";
    ctx.fillText(timerLabel, tlX + 10, tlY + 16);

    if (elapsedStr) {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.fillText(elapsedStr, tlX + pw - 10, tlY + 16);
      ctx.textAlign = "left";
    }

    ctx.fillStyle = timerColor;
    ctx.font = "bold 26px monospace";
    ctx.fillText(timerVal, tlX + 10, tlY + 46);

    tlY += ph + pillGap;
  }

  // Campaign elapsed timer
  if (s.mode === "campaign" && s.roundElapsedSec !== null) {
    const elapsedSec = s.roundElapsedSec;
    const mins = Math.floor(elapsedSec / 60);
    const secs = elapsedSec % 60;
    const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;
    ctx.font = "bold 14px monospace";
    const tw = ctx.measureText(timeStr).width;
    drawPill(tlX, tlY, tw + 20, pillH, 0.45);
    ctx.fillStyle = "rgba(200,220,255,0.6)";
    ctx.textAlign = "left";
    ctx.fillText(timeStr, tlX + 10, tlY + 19);
    tlY += pillH + pillGap;
  }

  // Campaign level name
  if (s.mode === "campaign") {
    const levelName = s.levelName;
    ctx.font = "bold 12px monospace";
    const tw = ctx.measureText(levelName).width;
    drawPill(tlX, tlY, tw + 20, pillH - 2, 0.4);
    ctx.fillStyle = "#aaddff";
    ctx.textAlign = "left";
    ctx.fillText(levelName, tlX + 10, tlY + 18);
    tlY += pillH + pillGap;
  }

  // Difficulty badge
  const diffNames = ["EASY", "NORMAL", "HARD", "NIGHTMARE"];
  const diffColors = ["#44ff44", "#00ccff", "#ffaa00", "#ff2200"];
  const diffText = diffNames[s.difficulty];
  ctx.font = "bold 11px monospace";
  const diffTW = ctx.measureText(diffText).width;
  drawPill(tlX, tlY, diffTW + 16, 22, 0.4);
  ctx.fillStyle = diffColors[s.difficulty];
  ctx.textAlign = "left";
  ctx.fillText(diffText, tlX + 8, tlY + 15);
  tlY += 22 + pillGap;

  // NG+ cycle badge (campaign only)
  if (s.mode === "campaign" && s.ngPlusCycle > 0) {
    const ngLabel = s.ngPlusCycle >= 3 ? "NG+3 FINAL" : `NG+${s.ngPlusCycle}`;
    const ngColor = s.ngPlusCycle >= 3 ? "#ffcc00" : "#cc88ff";
    ctx.font = "bold 11px monospace";
    const ngTW = ctx.measureText(ngLabel).width;
    drawPill(tlX, tlY, ngTW + 16, 22, 0.4);
    ctx.fillStyle = ngColor;
    ctx.textAlign = "left";
    ctx.fillText(ngLabel, tlX + 8, tlY + 15);
    tlY += 22 + pillGap;
  }

  // Meltdown info
  if (s.mode === "meltdown") {
    const mHud = s.meltdownHud;
    const mText = `${mHud.distance}m`;
    const braking = s.meltdownBraking;
    ctx.font = "bold 22px monospace";
    const mw = ctx.measureText(mText).width;
    const pillW = Math.max(mw + 24, 140);
    drawPill(tlX, tlY, pillW, braking ? 52 : 36, 0.55);
    ctx.fillStyle = "#ffaa00";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    ctx.fillText("REACTOR RUN", tlX + 10, tlY + 13);
    ctx.fillStyle = "#ffcc44";
    ctx.font = "bold 22px monospace";
    ctx.fillText(mText, tlX + 10, tlY + 32);
    if (braking) {
      ctx.fillStyle = "#ff6644";
      ctx.font = "bold 11px monospace";
      ctx.fillText("▼ BRAKING", tlX + 10, tlY + 47);
    }
    tlY += (braking ? 52 : 36) + pillGap;

    // Heat indicator
    const heatText = `HEAT ${mHud.heat}%`;
    ctx.font = "bold 12px monospace";
    const htw = ctx.measureText(heatText).width;
    drawPill(tlX, tlY, htw + 20, 24, 0.45);
    ctx.fillStyle = mHud.heat > 75 ? "#ff2200" : mHud.heat > 50 ? "#ffaa00" : "#ff8844";
    ctx.textAlign = "left";
    ctx.fillText(heatText, tlX + 10, tlY + 16);
    tlY += 24 + pillGap;
  }
  hudAnchors.stackBottom = tlY;
}

/** ─── BOSS HEALTH BAR (top-center) ─── */
function drawBossBar(ctx, w, bossEntity, drawPill) {
  const bossBarW = Math.min(400, w * 0.4);
  const bossBarH = 14;
  const bossBarX = Math.floor(w / 2 - bossBarW / 2);
  const bossBarY = 14;
  const bossPct = Math.max(0, bossEntity.health / bossEntity.maxHealth);
  const bossForm = bossEntity.def.form || 1;
  const bossName = bossEntity.def.name || "BOSS";
  const bossColor =
    bossForm === 3
      ? "#ff0044"
      : bossForm === 2
        ? "#ff0066"
        : "#ff0088";

  // Background pill
  drawPill(bossBarX - 8, bossBarY - 18, bossBarW + 16, bossBarH + 28, 0.65);

  // Name
  ctx.fillStyle = bossColor;
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "center";
  ctx.fillText(bossName, w / 2, bossBarY - 4);

  // Bar track
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.roundRect(bossBarX, bossBarY, bossBarW, bossBarH, 3);
  ctx.fill();

  // Bar fill
  ctx.fillStyle = bossColor;
  ctx.beginPath();
  ctx.roundRect(bossBarX, bossBarY, bossBarW * bossPct, bossBarH, 3);
  ctx.fill();

  // Shine
  const bShine = ctx.createLinearGradient(
    bossBarX,
    bossBarY,
    bossBarX,
    bossBarY + bossBarH,
  );
  bShine.addColorStop(0, "rgba(255,255,255,0.2)");
  bShine.addColorStop(0.5, "rgba(255,255,255,0)");
  bShine.addColorStop(1, "rgba(0,0,0,0.1)");
  ctx.fillStyle = bShine;
  ctx.beginPath();
  ctx.roundRect(bossBarX, bossBarY, bossBarW * bossPct, bossBarH, 3);
  ctx.fill();

  // Border
  ctx.strokeStyle = bossColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(bossBarX, bossBarY, bossBarW, bossBarH, 3);
  ctx.stroke();

  // HP text
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.max(9, bossBarH - 3)}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(
    `${Math.ceil(bossEntity.health)} / ${bossEntity.maxHealth}`,
    w / 2,
    bossBarY + bossBarH - 2,
  );
}

/** ─── BOTTOM-CENTER: Health bar + Shield bar + Weapon strip ─── */
function drawBottomCenter(ctx, w, h, s, game) {
  const { hudFactor, healthPct, healthColor, staminaPct, chronoPct } = s;
  const stripSlotW = Math.round(32 * hudFactor);
  const stripSlotH = Math.round(30 * hudFactor);
  const stripGap = 4;
  const weaponCount = s.weapons.length;
  const stripTotalW =
    weaponCount * stripSlotW + (weaponCount - 1) * stripGap;
  const stripX = Math.floor(w / 2 - stripTotalW / 2);
  const stripY = h - stripSlotH - 14;

  // Health bar (thin, above weapon strip)
  const hBarW = Math.max(stripTotalW, 260);
  const hBarH = Math.round(8 * hudFactor);
  const hBarX = Math.floor(w / 2 - hBarW / 2);
  const hBarY = stripY - hBarH - 8;

  // Shield bar (thin, above health bar)
  const sBarH = Math.round(5 * hudFactor);
  const sBarY = hBarY - sBarH - 3;

  // Stamina + Chrono bars (thin 6px, above shield/health)
  const showChrono = chronoPct > 0.005 || s.chronoActive;
  const isActive = s.isSprinting || s.isDashing;
  const chronoIsActive = s.chronoActive;
  const thinH = Math.round(6 * hudFactor);
  const thinGap = 3;
  const resourceBarW = hBarW;
  const resourceBarX = hBarX;
  const resourceBaseY =
    s.maxShield > 0 ? sBarY - thinH - 6 : hBarY - thinH - 6;

  // ── Stamina bar (thin) ──
  {
    const sby = showChrono ? resourceBaseY - thinH - thinGap : resourceBaseY;
    const staminaColor = s.isDashing
      ? "#00ffff"
      : s.isSprinting
        ? "#ffaa00"
        : staminaPct > 0.3
          ? "#00ccff"
          : "#ff4400";
    // background
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.roundRect(resourceBarX, sby, resourceBarW, thinH, 3);
    ctx.fill();
    // fill
    if (staminaPct > 0.005) {
      ctx.fillStyle = staminaColor;
      ctx.beginPath();
      ctx.roundRect(
        resourceBarX,
        sby,
        resourceBarW * staminaPct,
        thinH,
        3,
      );
      ctx.fill();
    }
    // border when active
    if (isActive) {
      ctx.strokeStyle = staminaColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(resourceBarX, sby, resourceBarW, thinH, 3);
      ctx.stroke();
    }
    // label (only when below full or active)
    if (staminaPct < 0.99 || isActive) {
      const label = s.isDashing
        ? "DASH"
        : s.isSprinting
          ? "SPRINT"
          : "STAM";
      // Labels sit outside the bar: a 9px glyph does not fit inside a 6px bar
      // and drawing it there collided with the fill.
      const ty = sby + thinH - 1;
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = isActive ? staminaColor : "rgba(255,255,255,0.45)";
      ctx.textAlign = "right";
      ctx.fillText(label, resourceBarX - 7, ty);
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText(
        `${Math.floor(staminaPct * 100)}%`,
        resourceBarX + resourceBarW + 7,
        ty,
      );
    }
  }

  // ── Chrono bar (thin) ──
  if (showChrono) {
    const cby = resourceBaseY;
    const chronoColor = chronoIsActive
      ? "#cc44ff"
      : chronoPct >= 0.15
        ? "#9944ff"
        : "#664488";
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.roundRect(resourceBarX, cby, resourceBarW, thinH, 3);
    ctx.fill();
    if (chronoPct > 0.005) {
      ctx.fillStyle = chronoColor;
      ctx.beginPath();
      ctx.roundRect(
        resourceBarX,
        cby,
        resourceBarW * chronoPct,
        thinH,
        3,
      );
      ctx.fill();
    }
    if (chronoIsActive) {
      ctx.strokeStyle = "#cc44ff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(resourceBarX, cby, resourceBarW, thinH, 3);
      ctx.stroke();
    }
    const cty = cby + thinH - 1;
    ctx.font = "bold 9px monospace";
    ctx.fillStyle = chronoIsActive ? "#cc44ff" : "rgba(180,140,220,0.55)";
    ctx.textAlign = "right";
    ctx.fillText("CHRONO", resourceBarX - 7, cty);
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(180,140,220,0.45)";
    ctx.fillText(
      `${Math.floor(chronoPct * 100)}%`,
      resourceBarX + resourceBarW + 7,
      cty,
    );
  }

  // Chronos: the Resonance eye and the unlocked powers, over the bars.
  drawChronoCluster(ctx, game, resourceBarX, (showChrono ? resourceBaseY - thinH - thinGap : resourceBaseY) - Math.round(18 * hudFactor) / 2 - 8, {
    size: Math.round(18 * hudFactor),
  });

  // ── Shield bar (thin, only when player has shield) ──
  if (s.maxShield > 0) {
    const shieldPct = s.shield / s.maxShield;
    const shieldRegenning = s.shield < s.maxShield;
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.roundRect(hBarX, sBarY, hBarW, sBarH, 2);
    ctx.fill();
    const shieldColor = shieldRegenning ? "#4488ff" : "#66aaff";
    ctx.fillStyle = shieldColor;
    ctx.beginPath();
    ctx.roundRect(hBarX, sBarY, hBarW * shieldPct, sBarH, 2);
    ctx.fill();
    if (shieldRegenning) {
      const pulse = 0.08 + Math.sin(s.time * 0.006) * 0.04;
      ctx.fillStyle = `rgba(100,160,255,${pulse})`;
      ctx.beginPath();
      ctx.roundRect(hBarX, sBarY, hBarW * shieldPct, sBarH, 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(100,160,255,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(hBarX, sBarY, hBarW, sBarH, 2);
    ctx.stroke();
    // label
    ctx.fillStyle = "#88bbff";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      `SHIELD ${Math.ceil(s.shield)}`,
      hBarX + hBarW / 2,
      sBarY + sBarH - 0,
    );
  }

  // ── Health bar (thin) ──
  {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.roundRect(hBarX, hBarY, hBarW, hBarH, 3);
    ctx.fill();
    ctx.fillStyle = healthColor;
    ctx.beginPath();
    ctx.roundRect(hBarX, hBarY, hBarW * healthPct, hBarH, 3);
    ctx.fill();
    // shine
    const shineGrad = ctx.createLinearGradient(
      hBarX,
      hBarY,
      hBarX,
      hBarY + hBarH,
    );
    shineGrad.addColorStop(0, "rgba(255,255,255,0.18)");
    shineGrad.addColorStop(0.5, "rgba(255,255,255,0)");
    shineGrad.addColorStop(1, "rgba(0,0,0,0.1)");
    ctx.fillStyle = shineGrad;
    ctx.beginPath();
    ctx.roundRect(hBarX, hBarY, hBarW * healthPct, hBarH, 3);
    ctx.fill();
    // border
    ctx.strokeStyle =
      healthPct < 0.25
        ? "rgba(255,34,0,0.6)"
        : "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(hBarX, hBarY, hBarW, hBarH, 3);
    ctx.stroke();
    // HP reads beside the bar rather than stamped across the fill, where the
    // white text disappeared into the green at full health.
    const hty = hBarY + hBarH - 1;
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = healthPct < 0.25 ? "#ff6644" : "rgba(255,255,255,0.55)";
    ctx.textAlign = "right";
    ctx.fillText("HP", hBarX - 7, hty);
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(
      `${Math.ceil(s.health)} / ${s.maxHealth}`,
      hBarX + hBarW + 7,
      hty,
    );
  }

  // ── Weapon strip (horizontal row) ──
  if (s.showWeapons) {
    ctx.font = `bold ${Math.max(12, stripSlotH - 14)}px monospace`;
    for (let i = 0; i < weaponCount; i++) {
      const active = i === s.currentWeapon;
      const sx = stripX + i * (stripSlotW + stripGap);
      ctx.fillStyle = active
        ? "rgba(0,200,255,0.35)"
        : "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.roundRect(sx, stripY, stripSlotW, stripSlotH, 4);
      ctx.fill();
      ctx.strokeStyle = active ? "#00ccff" : "rgba(255,255,255,0.12)";
      ctx.lineWidth = active ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(sx, stripY, stripSlotW, stripSlotH, 4);
      ctx.stroke();
      // Sprite (if available) takes the slot; otherwise digit. Same
      // pattern as the Classic arms grid for consistency.
      const wp = s.weapons[i];
      const sprite = wp ? getWeaponSprite(weaponSlug(wp.name)) : null;
      if (sprite) {
        const inset = 3;
        ctx.save();
        ctx.globalAlpha = active ? 1 : 0.55;
        ctx.drawImage(sprite, sx + inset, stripY + inset, stripSlotW - inset * 2, stripSlotH - inset * 2);
        ctx.restore();
        ctx.fillStyle = active ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.4)";
        ctx.fillRect(sx + 2, stripY + 2, 11, 10);
        ctx.fillStyle = active ? "#00eaff" : "rgba(255,255,255,0.5)";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${i + 1}`, sx + 7, stripY + 10);
      } else {
        ctx.fillStyle = active ? "#ffffff" : "#555555";
        ctx.textAlign = "center";
        ctx.fillText(
          `${i + 1}`,
          sx + stripSlotW / 2,
          stripY + stripSlotH / 2 + 5,
        );
      }
    }
  }
}
