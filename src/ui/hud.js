import { drawCrosshair } from "./crosshair.js";
import { drawScanlines } from "./scanlines.js";
import { drawPortrait } from "./portrait.js";
import { drawMinimap } from "./minimap.js";
import { effectiveAimFov, reticlePoint } from "../systems/aim.js";
import { isCompactPhone } from "../../js/layout.js";
import {
  CHARACTER_COLORS,
  HELMET_STYLES,
  VISOR_STYLES,
} from "../../js/data.js";

/**
 * Hit-marker reticle overlay. Pops in fast, eases out, with crit (yellow,
 * larger, double ring) and kill (white flash + outward burst) variants.
 * Single source of truth — replaces three copies that previously diverged.
 *
 * Reads: game.hitMarker (seconds remaining), game.hitMarkerCrit, game.hitMarkerKill.
 * Lifetime budget: 0.22s crit, 0.15s normal — driver decides at write site.
 */
function drawHitMarker(ctx, game, cx, cy) {
  const t = game.hitMarker;
  if (t <= 0) return;
  const total = (game.hitMarkerCrit || game.hitMarkerHead) ? 0.22 : 0.15;
  const age = Math.max(0, total - t);            // 0 → total
  const popIn = Math.min(1, age / 0.04);          // first 40 ms scale-up
  const fade = Math.min(1, t / 0.10);             // last 100 ms fade
  const alpha = popIn * fade;
  const scale = 0.6 + 0.5 * (1 - Math.pow(1 - popIn, 3)); // ease-out cubic to 1.1

  const kill = game.hitMarkerKill;
  const crit = game.hitMarkerCrit;
  const head = game.hitMarkerHead;
  // Headshots get the warmest highlight (orange→red), crit stays gold,
  // normal hits red, kill flash is white. Headshot+crit stacks visually
  // toward orange-gold so player can read both at a glance.
  const color = kill
    ? "#ffffff"
    : head && crit ? "#ff9a1f"
    : head ? "#ff6a1f"
    : crit ? "#ffe14a"
    : "#ff3a3a";
  const isAccent = crit || head;
  const len = (isAccent ? 11 : 8) * scale;
  const gap = (isAccent ? 4 : 3) * scale;
  const lw = isAccent ? 2.6 : 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.lineCap = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur = isAccent ? 8 : 4;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;

  // Four spokes with center gap (more readable than a solid X)
  ctx.beginPath();
  for (const [sx, sy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    ctx.moveTo(sx * gap, sy * gap);
    ctx.lineTo(sx * len, sy * len);
  }
  ctx.stroke();

  // Crit/head get a second outer ring of dashes
  if (isAccent) {
    ctx.globalAlpha = alpha * 0.6;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, len + 4, 0, Math.PI * 2);
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Kill flash: outward expanding ring
  if (kill) {
    const k = age / total; // 0 → 1
    ctx.globalAlpha = alpha * (1 - k);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 6 + k * 18, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Floating damage number sprite. Style varies with hit category:
 *   crit  → gold, bold, with stroke shadow
 *   head  → orange, bold, with "HEAD!" tag above
 *   else  → white outlined number
 *
 * Caller controls font scale via `large` flag (true = HUD/builder paths,
 * false = compact in-bar HUD).
 */
function drawDamageNumber(ctx, dn, x, y, large) {
  const f = large ? 18 : 16;
  const fSmall = large ? 14 : 12;
  if (dn.crit) {
    ctx.font = `bold ${f}px monospace`;
    ctx.shadowColor = "#ffcc00";
    ctx.shadowBlur = large ? 8 : 6;
    ctx.fillStyle = "#ffcc00";
    ctx.fillText(dn.value, x, y);
    ctx.shadowBlur = 0;
    if (large) {
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 2;
      ctx.strokeText(dn.value, x, y);
      ctx.fillText(dn.value, x, y);
    }
  } else if (dn.head) {
    ctx.font = `bold ${f}px monospace`;
    ctx.shadowColor = "#ff7a1f";
    ctx.shadowBlur = large ? 8 : 6;
    ctx.fillStyle = "#ff7a1f";
    ctx.fillText(dn.value, x, y);
    ctx.shadowBlur = 0;
    ctx.font = `bold ${large ? 10 : 9}px monospace`;
    ctx.fillStyle = "#ffaa44";
    ctx.fillText("HEAD!", x, y - (large ? 16 : 13));
  } else {
    ctx.font = `bold ${fSmall}px monospace`;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 2;
    ctx.strokeText(dn.value, x, y);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(dn.value, x, y);
  }
}

function drawAdsReticle(ctx, game, cx, cy) {
  if (!game.player?.isAiming) return;
  const t = game.time * 0.006;
  const r = 22 + Math.sin(t) * 1.5;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = "rgba(120,220,255,0.75)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.moveTo(cx - r - 7, cy);
  ctx.lineTo(cx - r + 6, cy);
  ctx.moveTo(cx + r - 6, cy);
  ctx.lineTo(cx + r + 7, cy);
  ctx.moveTo(cx, cy - r - 7);
  ctx.lineTo(cx, cy - r + 6);
  ctx.moveTo(cx, cy + r - 6);
  ctx.lineTo(cx, cy + r + 7);
  ctx.stroke();
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(120,220,255,0.75)";
  ctx.fillText("ADS", cx, cy + r + 20);
  ctx.restore();
}

/**
 * HUD rendering — extracted from game.js.
 * All game state accessed via `game` parameter (read-only).
 */

/** Build minimap state from game instance */
function _minimapState(game) {
  return {
    map: game.map,
    entities: game.entities,
    player: game.player,
    chronoBombs: game._chronoBombs,
    objectiveWaypoint: game.objectiveWaypoint,
  };
}

/** Build portrait state from game instance */
function _portraitState(game) {
  const c = game.character || {};
  return {
    health: game.player.health,
    maxHealth: game.player.maxHealth,
    alive: game.player.alive,
    time: game.time,
    palette: CHARACTER_COLORS[c.colorIndex || 0],
    helmet: HELMET_STYLES[c.helmetIndex || 0],
    visor: VISOR_STYLES[c.visorIndex || 0],
  };
}

/**
 * @param {object} game - Game instance (read-only access)
 */
export function renderHUD(game) {
const ctx = game.hudCtx;
const w = game.hudW;
const h = game.hudH;
ctx.clearRect(0, 0, w, h);

if (game.state !== "playing" && game.state !== "paused")
  return;

// HUD disruption effect (disabled by enemy support abilities)
if (game._hudDisabledUntil && game.time < game._hudDisabledUntil) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#ff6666";
  ctx.font = "bold 20px monospace";
  ctx.textAlign = "center";
  ctx.fillText("SYSTEMS DISRUPTED", w / 2, h / 2 - 12);
  ctx.font = "12px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText("HUD offline — temporary interference.", w / 2, h / 2 + 10);
  ctx.restore();
  return;
}

// Playtest mode banner
if (game.mode === "playtest") {
  ctx.save();
  ctx.fillStyle = "rgba(0, 200, 255, 0.15)";
  ctx.fillRect(0, 0, w, 32);
  ctx.fillStyle = "#00ccff";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const allDead =
    game.killedEnemies >= game.totalEnemies && game.totalEnemies > 0;
  const label = allDead
    ? "PLAY TEST COMPLETE — Returning to builder..."
    : `PLAY TEST — ${game.killedEnemies}/${game.totalEnemies} killed — ESC to return`;
  ctx.fillText(label, w / 2, 16);
  ctx.restore();
}

const hudFactor = game.settings.hudScale / 100;
const isCompactMobile = game.isTouchDevice && isCompactPhone(h);
const barH = isCompactMobile
  ? Math.round(60 * hudFactor)
  : game.settings.hudStyle === 1
    ? Math.round(160 * hudFactor)
    : 0;

// On compact mobile, render a slim HUD and skip the full layout
if (isCompactMobile) {
  _renderCompactMobileHUD(game, ctx, w, h, barH, hudFactor);

  // Minimap (smaller on compact mobile)
  let mmSize = Math.min(game.settings.minimapSize, Math.round(w * 0.18));
  drawMinimap(ctx, w - mmSize - 10, 10, mmSize, mmSize, _minimapState(game));

  // Crosshair
  const { x: chx, y: chy } = reticlePoint(w, h, barH, game.player);
  drawCrosshair(ctx, chx, chy, game.settings.crosshair);
  drawAdsReticle(ctx, game, chx, chy);

  // Hit marker
  drawHitMarker(ctx, game, chx, chy);

  // Floating damage numbers
  for (const dn of game.damageNumbers) {
    const ddx = dn.x - game.player.x;
    const ddy = dn.y - game.player.y;
    let dAngle = Math.atan2(ddy, ddx) - game.player.angle;
    while (dAngle < -Math.PI) dAngle += Math.PI * 2;
    while (dAngle > Math.PI) dAngle -= Math.PI * 2;
    const fov = (effectiveAimFov(game.player, game.settings) * Math.PI) / 180;
    if (Math.abs(dAngle) > fov / 2) continue;
    const ddist = Math.sqrt(ddx * ddx + ddy * ddy);
    if (ddist < 0.1) continue;
    const dsX = w / 2 + (dAngle / (fov / 2)) * (w / 2);
    const dsRise = (0.8 - dn.life) * 60;
    const dsY = (h - barH) / 2 - dsRise;
    const dAlpha = Math.min(1, dn.life / 0.3);
    ctx.save();
    ctx.globalAlpha = dAlpha;
    ctx.textAlign = "center";
    drawDamageNumber(ctx, dn, dsX, dsY, false);
    ctx.restore();
  }

  // Kill streak
  game.killStreakSystem.renderFirstPerson(ctx, w, h, barH);

  // Achievement toast
  game.renderAchievementToast(ctx, w, h);

  // Arena timer (compact)
  if (game.mode === "arena") {
    const secs = Math.ceil(game.arenaTimer);
    const warning = secs <= 10;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(10, 10, 100, 50);
    ctx.strokeStyle = warning
      ? "rgba(255,34,0,0.6)"
      : "rgba(0,200,255,0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, 100, 50);
    ctx.fillStyle = warning
      ? Math.floor(game.time / 250) % 2
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
  if (game.mode === "campaign" && game.roundStartTime) {
    const elSec = Math.floor(
      (performance.now() - game.roundStartTime) / 1000,
    );
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
  if (game.mode === "meltdown") {
    const mHud = game.meltdown.getHUD();
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

    // Heat meter (top-right)
    const heatW = 120;
    const heatH = 16;
    const heatX = w - heatW - 15;
    const heatY = 15;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(heatX - 5, heatY - 5, heatW + 10, heatH + 24);
    ctx.strokeStyle = "rgba(255,68,0,0.3)";
    ctx.strokeRect(heatX - 5, heatY - 5, heatW + 10, heatH + 24);

    // Heat bar background
    ctx.fillStyle = "rgba(60,20,0,0.6)";
    ctx.fillRect(heatX, heatY, heatW, heatH);

    // Heat bar fill
    const heatColor =
      heatPct < 0.5
        ? `rgb(255, ${Math.floor(200 - heatPct * 300)}, 0)`
        : `rgb(255, ${Math.floor(100 - (heatPct - 0.5) * 200)}, 0)`;
    ctx.fillStyle = heatColor;
    ctx.fillRect(heatX, heatY, heatW * heatPct, heatH);

    // Heat label
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = heatPct > 0.7 ? "#ff4400" : "#ffaa66";
    ctx.fillText(
      `REACTOR: ${mHud.heat}%`,
      heatX + heatW / 2,
      heatY + heatH + 12,
    );

    // Speed indicator
    ctx.font = "8px monospace";
    ctx.fillStyle = "rgba(150,200,255,0.5)";
    ctx.textAlign = "right";
    ctx.fillText(`${mHud.speed} m/s`, w - 15, heatY + heatH + 28);

    // Heat overlay on world
    const overlay = game.meltdown.getHeatOverlay();
    if (overlay) {
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, w, h - barH);
    }

    // ARIA text (center screen)
    if (game._meltdownAriaText) {
      const ariaAlpha = Math.min(1, game._meltdownAriaTimer / 0.5);
      ctx.save();
      ctx.globalAlpha = ariaAlpha;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      const tw = ctx.measureText(game._meltdownAriaText).width + 40;
      ctx.fillRect(w / 2 - tw / 2, h * 0.2 - 15, tw, 30);
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#00ccff";
      ctx.fillText(game._meltdownAriaText, w / 2, h * 0.2 + 3);
      ctx.restore();
    }
  }

  ctx.textAlign = "left";

  // Stage cleared notification
  if (game.mode === "arena" && game.arenaClearTimer != null) {
    const countSecs = Math.ceil(game.arenaClearTimer);
    const pulse = 0.7 + Math.sin(game.time * 0.005) * 0.3;
    ctx.fillStyle = `rgba(0,10,5,${0.5 * pulse})`;
    ctx.fillRect(0, (h - barH) / 2 - 36, w, 72);
    ctx.fillStyle = `rgba(0,255,100,${pulse})`;
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.fillText("STAGE CLEARED!", w / 2, (h - barH) / 2 - 6);
    ctx.fillStyle = "rgba(200,230,255,0.8)";
    ctx.font = "bold 14px monospace";
    ctx.fillText(
      `Next round in ${countSecs}s...`,
      w / 2,
      (h - barH) / 2 + 18,
    );
    ctx.textAlign = "left";
  }

  // Slow-mo vignette overlay
  if (game.slowMoTimer > 0) {
    const smAlpha = Math.min(0.35, (game.slowMoTimer / 1.5) * 0.35);
    ctx.fillStyle = `rgba(0,20,60,${smAlpha * 0.4})`;
    ctx.fillRect(0, 0, w, h - barH);
    const gradient = ctx.createRadialGradient(
      w / 2,
      (h - barH) / 2,
      w * 0.25,
      w / 2,
      (h - barH) / 2,
      w * 0.7,
    );
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, `rgba(0,0,0,${smAlpha})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h - barH);
  }

  // FPS counter
  if (game.showFPS) {
    ctx.fillStyle = "#ffcc00";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`FPS: ${game.fps}`, 10, h - barH - 8);
  }

  // ARIA comms overlay
  game.renderAriaComms(ctx, w, h);

  return;
}

// Classic HUD — opaque bottom bar with portrait, weapons, stats
if (game.settings.hudStyle === 1) {
  _renderClassicDesktopHUD(game, ctx, w, h, barH, hudFactor);
  return;
}

// ═══════════════════════════════════════════════════════════════════════
// MINIMALIST TRANSPARENT OVERLAY HUD (desktop)
// No bottom bar — all info floats at screen edges
// ═══════════════════════════════════════════════════════════════════════

const wep = game.player.getWeaponDef();
const healthPct = game.player.health / game.player.maxHealth;
const healthColor =
  healthPct > 0.6
    ? game.cbColor("#00ff66")
    : healthPct > 0.3
      ? game.cbColor("#ffaa00")
      : game.cbColor("#ff2200");

// ─── Helper: rounded-rect pill background ───
const drawPill = (x, y, pw, ph, alpha = 0.55) => {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.roundRect(x, y, pw, ph, 6);
  ctx.fill();
};

// ─── TOP-LEFT: Score / Timer / Difficulty / Meltdown info ───
{
  let tlY = 12;
  const tlX = 12;
  const pillH = 28;
  const pillGap = 6;

  // Score pill
  if (game.settings.showScore) {
    const scoreText = `SCORE  ${game.player.score}`;
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
  if (game.mode === "arena") {
    const secs = Math.ceil(game.arenaTimer);
    const warning = secs <= 10;
    const cleared = game.arenaClearTimer != null;
    const timerLabel = cleared ? "CLEARED" : `ROUND ${game.arenaRound}`;
    const timerVal = `${secs}s`;
    const timerColor = cleared
      ? "#00ff66"
      : warning
        ? Math.floor(game.time / 250) % 2
          ? "#ff2200"
          : "#ffaa00"
        : "#00ffcc";

    ctx.font = "bold 14px monospace";
    const labelW = ctx.measureText(timerLabel).width;
    ctx.font = "bold 26px monospace";
    const valW = ctx.measureText(timerVal).width;
    const pw = Math.max(labelW, valW) + 24;
    const ph = 58;
    drawPill(tlX, tlY, pw, ph, 0.6);

    ctx.fillStyle = cleared ? "rgba(0,255,100,0.7)" : "rgba(255,255,255,0.5)";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "left";
    ctx.fillText(timerLabel, tlX + 10, tlY + 16);

    ctx.fillStyle = timerColor;
    ctx.font = "bold 26px monospace";
    ctx.fillText(timerVal, tlX + 10, tlY + 46);

    // Elapsed sub-line
    if (game.roundStartTime) {
      const elapsedSec = Math.floor(
        (performance.now() - game.roundStartTime) / 1000,
      );
      const mins = Math.floor(elapsedSec / 60);
      const secs2 = elapsedSec % 60;
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "10px monospace";
      ctx.fillText(
        `${mins}:${secs2.toString().padStart(2, "0")} elapsed`,
        tlX + pw - 78,
        tlY + 16,
      );
    }
    tlY += ph + pillGap;
  }

  // Campaign elapsed timer
  if (game.mode === "campaign" && game.roundStartTime) {
    const elapsedSec = Math.floor(
      (performance.now() - game.roundStartTime) / 1000,
    );
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
  if (game.mode === "campaign") {
    const levelName = game.map.name || `Level ${game.campaignLevel + 1}`;
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
  const diffText = diffNames[game.settings.difficulty];
  ctx.font = "bold 11px monospace";
  const diffTW = ctx.measureText(diffText).width;
  drawPill(tlX, tlY, diffTW + 16, 22, 0.4);
  ctx.fillStyle = diffColors[game.settings.difficulty];
  ctx.textAlign = "left";
  ctx.fillText(diffText, tlX + 8, tlY + 15);
  tlY += 22 + pillGap;

  // NG+ cycle badge (campaign only)
  if (game.mode === "campaign" && game.ngPlusCycle > 0) {
    const ngLabel = game.ngPlusCycle >= 3 ? "NG+3 FINAL" : `NG+${game.ngPlusCycle}`;
    const ngColor = game.ngPlusCycle >= 3 ? "#ffcc00" : "#cc88ff";
    ctx.font = "bold 11px monospace";
    const ngTW = ctx.measureText(ngLabel).width;
    drawPill(tlX, tlY, ngTW + 16, 22, 0.4);
    ctx.fillStyle = ngColor;
    ctx.textAlign = "left";
    ctx.fillText(ngLabel, tlX + 8, tlY + 15);
    tlY += 22 + pillGap;
  }

  // Meltdown info
  if (game.mode === "meltdown") {
    const mHud = game.meltdown.getHUD();
    const mText = `${mHud.distance}m`;
    const braking = game.player._meltdownBraking;
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
}

// ─── TOP-RIGHT: Kills counter ───
if (game.settings.showKills) {
  const killText = `KILLS  ${game.killedEnemies} / ${game.totalEnemies}`;
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
{
  const bossEntity = game.entities.find(
    (e) =>
      e.type === "enemy" &&
      e.active &&
      e.health > 0 &&
      (e.enemyType === "boss" ||
        e.enemyType === "boss_form2" ||
        e.enemyType === "boss_form3"),
  );
  if (bossEntity) {
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
}

// ─── BOTTOM-CENTER: Health bar + Shield bar + Weapon strip ───
{
  const stripSlotW = Math.round(32 * hudFactor);
  const stripSlotH = Math.round(30 * hudFactor);
  const stripGap = 4;
  const weaponCount = game.player.weapons.length;
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
  const staminaPct = game.player.stamina / game.player.maxStamina;
  const chronoPct = game.player.chronoEnergy / game.player.maxChronoEnergy;
  const showChrono = chronoPct > 0.005 || game.player.chronoActive;
  const isActive = game.player.isSprinting || game.player.isDashing;
  const chronoIsActive = game.player.chronoActive;
  const thinH = Math.round(6 * hudFactor);
  const thinGap = 3;
  const resourceBarW = hBarW;
  const resourceBarX = hBarX;
  const resourceBaseY =
    game.player.maxShield > 0 ? sBarY - thinH - 6 : hBarY - thinH - 6;

  // ── Stamina bar (thin) ──
  {
    const sby = showChrono ? resourceBaseY - thinH - thinGap : resourceBaseY;
    const staminaColor = game.player.isDashing
      ? "#00ffff"
      : game.player.isSprinting
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
      const label = game.player.isDashing
        ? "DASH"
        : game.player.isSprinting
          ? "SPRINT"
          : "STAM";
      ctx.fillStyle = isActive
        ? staminaColor
        : "rgba(255,255,255,0.45)";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "left";
      ctx.fillText(label, resourceBarX + 4, sby + thinH - 1);
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText(
        `${Math.floor(staminaPct * 100)}%`,
        resourceBarX + resourceBarW - 4,
        sby + thinH - 1,
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
    ctx.fillStyle = chronoIsActive ? "#cc44ff" : "rgba(180,140,220,0.5)";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "left";
    ctx.fillText("CHRONO", resourceBarX + 4, cby + thinH - 1);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(180,140,220,0.4)";
    ctx.fillText(
      `${Math.floor(chronoPct * 100)}%`,
      resourceBarX + resourceBarW - 4,
      cby + thinH - 1,
    );
  }

  // ── Shield bar (thin, only when player has shield) ──
  if (game.player.maxShield > 0) {
    const shieldPct = game.player.shield / game.player.maxShield;
    const shieldRegenning = game.player.shield < game.player.maxShield;
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
      const pulse = 0.08 + Math.sin(game.time * 0.006) * 0.04;
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
      `SHIELD ${Math.ceil(game.player.shield)}`,
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
    // HP text (centered on bar)
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.max(9, hBarH - 1)}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(
      `${Math.ceil(game.player.health)} / ${game.player.maxHealth}`,
      hBarX + hBarW / 2,
      hBarY + hBarH - 1,
    );
  }

  // ── Weapon strip (horizontal row) ──
  if (game.settings.showWeapons) {
    ctx.font = `bold ${Math.max(12, stripSlotH - 14)}px monospace`;
    for (let i = 0; i < weaponCount; i++) {
      const active = i === game.player.currentWeapon;
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

// ─── BOTTOM-RIGHT: Ammo count + weapon name ───
{
  const brX = w - 12;
  const brY = h - 14;
  // Ammo (large number, right-aligned)
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffcc00";
  ctx.font = game.scaledFont(38, "bold");
  ctx.fillText(`${game.player.ammo}`, brX, brY - 18);
  // Weapon name (below ammo)
  if (wep) {
    ctx.fillStyle = wep.color;
    ctx.font = "bold 13px monospace";
    ctx.fillText(wep.name, brX, brY);
  }
}

// ─── MINIMAP (top-right, pushed down if kills pill is shown) ───
{
  let mmSize = game.settings.minimapSize;
  if (game.isTouchDevice && w < 700) {
    mmSize = Math.min(mmSize, Math.round(w * 0.28));
  }
  const mmY = game.settings.showKills ? 48 : 10;
  drawMinimap(ctx, w - mmSize - 10, mmY, mmSize, mmSize, _minimapState(game));
}

// ─── CROSSHAIR (center of full screen, barH is 0) ───
const { x: chx, y: chy } = reticlePoint(w, h, 0, game.player);
drawCrosshair(ctx, chx, chy, game.settings.crosshair);
drawAdsReticle(ctx, game, chx, chy);

// ─── HIT MARKER ───
drawHitMarker(ctx, game, chx, chy);

// ─── FLOATING DAMAGE NUMBERS ───
for (const dn of game.damageNumbers) {
  const dx = dn.x - game.player.x;
  const dy = dn.y - game.player.y;
  let angle = Math.atan2(dy, dx) - game.player.angle;
  while (angle < -Math.PI) angle += Math.PI * 2;
  while (angle > Math.PI) angle -= Math.PI * 2;
  const fov = (effectiveAimFov(game.player, game.settings) * Math.PI) / 180;
  if (Math.abs(angle) > fov / 2) continue;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.1) continue;
  const screenX = w / 2 + (angle / (fov / 2)) * (w / 2);
  const rise = (0.8 - dn.life) * 60;
  const screenY = h / 2 - rise;
  const alpha = Math.min(1, dn.life / 0.3);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";
  drawDamageNumber(ctx, dn, screenX, screenY, true);
  ctx.restore();
}

// ─── KILL STREAK ANNOUNCEMENT ───
game.killStreakSystem.renderThirdPerson(ctx, w, h);

// ─── STAGE CLEARED (arena only) ───
if (game.mode === "arena" && game.arenaClearTimer != null) {
  const countSecs = Math.ceil(game.arenaClearTimer);
  const pulse = 0.7 + Math.sin(game.time * 0.005) * 0.3;
  ctx.fillStyle = `rgba(0,10,5,${0.5 * pulse})`;
  ctx.fillRect(0, h / 2 - 60, w, 120);
  ctx.fillStyle = `rgba(0,255,100,${pulse})`;
  ctx.font = "bold 48px monospace";
  ctx.textAlign = "center";
  ctx.fillText("STAGE CLEARED!", w / 2, h / 2 - 8);
  ctx.fillStyle = "rgba(200,230,255,0.8)";
  ctx.font = "bold 22px monospace";
  ctx.fillText(
    `Next round in ${countSecs}s...`,
    w / 2,
    h / 2 + 30,
  );
  ctx.textAlign = "left";
}

// ─── SLOW-MO VIGNETTE ───
if (game.slowMoTimer > 0) {
  const smAlpha = Math.min(0.35, (game.slowMoTimer / 1.5) * 0.35);
  ctx.fillStyle = `rgba(0,20,60,${smAlpha * 0.4})`;
  ctx.fillRect(0, 0, w, h);
  const gradient = ctx.createRadialGradient(
    w / 2,
    h / 2,
    w * 0.25,
    w / 2,
    h / 2,
    w * 0.7,
  );
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, `rgba(0,0,0,${smAlpha})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

// Achievement toast (above minimap area)
game.renderAchievementToast(ctx, w, h);

// Meltdown upgrade selection overlay
if (game._meltdownUpgradeChoices) {
  _renderMeltdownUpgradeOverlay(game, ctx, w, h);
}

// ARIA comms overlay (bottom-left)
game.renderAriaComms(ctx, w, h);
}

// ═══════════════════════════════════════════════════════════════════════
// CLASSIC DESKTOP HUD — opaque bottom bar with portrait, weapons, stats
// Restored from pre-redesign codebase; toggled via Settings > HUD Style
// ═══════════════════════════════════════════════════════════════════════

function _renderClassicDesktopHUD(game, ctx, w, h, barH, hudFactor) {
const wep = game.player.getWeaponDef();
const healthPct = game.player.health / game.player.maxHealth;
const healthColor =
  healthPct > 0.6
    ? game.cbColor("#00ff66")
    : healthPct > 0.3
      ? game.cbColor("#ffaa00")
      : game.cbColor("#ff2200");

// ─── Stamina + Chrono bars (side-by-side above bottom bar) ───
const staminaFactor = game.settings.staminaBarSize / 100;
const staminaPct = game.player.stamina / game.player.maxStamina;
const chronoPct = game.player.chronoEnergy / game.player.maxChronoEnergy;
const showChrono = chronoPct > 0.005 || game.player.chronoActive;
const isActive = game.player.isSprinting || game.player.isDashing;
const chronoIsActive = game.player.chronoActive;
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
  const glowColor = game.player.isDashing ? "rgba(0,255,255,0.15)" : "rgba(255,170,0,0.12)";
  ctx.fillStyle = glowColor;
  ctx.beginPath();
  ctx.roundRect(staminaBarX - 6, staminaBarY - 6, staminaBarW + 12, staminaBarH + 12, 8);
  ctx.fill();
  const innerGlow = game.player.isDashing ? "rgba(0,255,255,0.25)" : "rgba(255,170,0,0.2)";
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
const staminaColor = game.player.isDashing ? "#00ffff"
  : game.player.isSprinting ? "#ffaa00"
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
  const label = game.player.isDashing ? "DASH" : game.player.isSprinting ? "SPRINT" : "STAMINA";
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
  ctx.fillText("[HOLD Q]", chronoBarX + chronoBarW - 15, chronoBarY + chronoBarH / 2 + 4);
}

// ─── Bottom Bar ───
ctx.fillStyle = "rgba(5,5,15,0.92)";
ctx.fillRect(0, h - barH, w, barH);
ctx.strokeStyle = "rgba(0,200,255,0.3)";
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(0, h - barH);
ctx.lineTo(w, h - barH);
ctx.stroke();

// ─── Layout: AMMO | HEALTH | PORTRAIT | WEAPONS(2x2) | KILLS | SCORE | ROUND/LOC ───
const pad = 14;
const portraitW = Math.round(180 * hudFactor);
const portraitH = Math.round(160 * hudFactor);
const portraitX = Math.floor(w / 2 - portraitW / 2);
const portraitY = h - barH;

const leftZone = portraitX - pad;
const rightZone = w - (portraitX + portraitW + pad);
const ammoSecW = Math.floor(leftZone * 0.35);
const healthSecW = Math.floor(leftZone * 0.65);
const rsecW = Math.floor(rightZone / 4);

const topY = h - barH + 10;
const midY = h - barH + Math.floor(barH / 2);
const botY = h - barH + barH - 12;

// Ammo
const ammoX = pad;
ctx.fillStyle = "rgba(255,204,0,0.6)";
ctx.font = "bold 14px monospace";
ctx.textAlign = "center";
ctx.fillText("AMMO", ammoX + ammoSecW / 2, topY + 4);
ctx.fillStyle = "#ffcc00";
ctx.font = game.scaledFont(46, "bold");
ctx.fillText(`${game.player.ammo}`, ammoX + ammoSecW / 2, midY + 14);

// Health
const healthX = ammoX + ammoSecW + pad;
const hbW = healthSecW - pad * 2;
const hbH = 30;
ctx.fillStyle = healthColor;
ctx.font = "bold 16px monospace";
ctx.textAlign = "center";
ctx.fillText("HEALTH", healthX + hbW / 2, topY + 4);
const bigHealthSize = Math.max(20, Math.round(46 * hudFactor));
const smallHealthSize = Math.max(11, Math.round(14 * hudFactor));
const hbY = midY + Math.max(12, Math.round(16 * hudFactor));
const bigNumY = Math.floor(topY + (hbY - topY) / 2 + Math.round(4 * hudFactor));
ctx.fillStyle = "#ffffff";
ctx.font = game.scaledFont(bigHealthSize, "bold");
ctx.fillText(`${Math.ceil(game.player.health)}`, healthX + hbW / 2, bigNumY);
ctx.fillStyle = "rgba(255,255,255,0.08)";
ctx.fillRect(healthX, hbY, hbW, hbH);
ctx.fillStyle = healthColor;
ctx.fillRect(healthX, hbY, hbW * healthPct, hbH);
ctx.strokeStyle = "rgba(255,255,255,0.3)";
ctx.lineWidth = 1;
ctx.strokeRect(healthX, hbY, hbW, hbH);
ctx.fillStyle = "#ffffff";
ctx.font = game.scaledFont(smallHealthSize, "bold");
ctx.fillText(`${Math.ceil(game.player.health)} / ${game.player.maxHealth}`, healthX + hbW / 2, hbY + Math.max(14, Math.round(12 * hudFactor)));

// Shield bar (below health, only when player has shield)
if (game.player.maxShield > 0) {
  const sbH = 12;
  const sbY = hbY + hbH + 4;
  const shieldPct = game.player.shield / game.player.maxShield;
  const shieldRegenning = game.player.shield < game.player.maxShield;
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(healthX, sbY, hbW, sbH);
  ctx.fillStyle = shieldRegenning ? "#4488ff" : "#66aaff";
  ctx.fillRect(healthX, sbY, hbW * shieldPct, sbH);
  if (shieldRegenning) {
    const pulse = 0.1 + Math.sin(game.time * 0.006) * 0.06;
    ctx.fillStyle = `rgba(100,160,255,${pulse})`;
    ctx.fillRect(healthX, sbY, hbW * shieldPct, sbH);
  }
  ctx.strokeStyle = "rgba(100,160,255,0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(healthX, sbY, hbW, sbH);
  ctx.fillStyle = "#88bbff";
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`SHIELD ${Math.ceil(game.player.shield)} / ${game.player.maxShield}`, healthX + hbW / 2, sbY + 10);
}

// Portrait
if (game.settings.showPortrait) {
  drawPortrait(ctx, portraitX, portraitY, portraitW, portraitH, _portraitState(game));
  ctx.strokeStyle = "rgba(0,200,255,0.5)";
  ctx.lineWidth = 2;
  ctx.strokeRect(portraitX - 1, portraitY - 1, portraitW + 2, portraitH + 2);
  const accentL = 12;
  ctx.strokeStyle = "#00ddff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(portraitX - 1, portraitY + accentL);
  ctx.lineTo(portraitX - 1, portraitY - 1);
  ctx.lineTo(portraitX + accentL, portraitY - 1);
  ctx.moveTo(portraitX + portraitW + 1 - accentL, portraitY - 1);
  ctx.lineTo(portraitX + portraitW + 1, portraitY - 1);
  ctx.lineTo(portraitX + portraitW + 1, portraitY + accentL);
  ctx.stroke();
}

// Weapons (2x2 grid)
if (game.settings.showWeapons) {
  const wpnX = portraitX + portraitW + pad;
  ctx.fillStyle = "rgba(0,200,255,0.6)";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  ctx.fillText("WEAPONS", wpnX + rsecW / 2, topY + 4);
  const slotW = 42, slotH = 38, slotGap = 6;
  const gridW = slotW * 2 + slotGap;
  const gridH = slotH * 2 + slotGap;
  const gridStartX = wpnX + rsecW / 2 - gridW / 2;
  const gridStartY = topY + 16;
  ctx.font = "bold 16px monospace";
  for (let i = 0; i < game.player.weapons.length; i++) {
    const active = i === game.player.currentWeapon;
    const col = i % 2, row = Math.floor(i / 2);
    const sx = gridStartX + col * (slotW + slotGap);
    const sy = gridStartY + row * (slotH + slotGap);
    ctx.fillStyle = active ? "rgba(0,200,255,0.4)" : "rgba(255,255,255,0.06)";
    ctx.fillRect(sx, sy, slotW, slotH);
    ctx.strokeStyle = active ? "#00ccff" : "rgba(255,255,255,0.15)";
    ctx.lineWidth = active ? 2 : 1;
    ctx.strokeRect(sx, sy, slotW, slotH);
    ctx.fillStyle = active ? "#ffffff" : "#666666";
    ctx.textAlign = "center";
    ctx.fillText(`${i + 1}`, sx + slotW / 2, sy + slotH / 2 + 6);
  }
  if (wep) {
    ctx.fillStyle = wep.color;
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillText(wep.name, wpnX + rsecW / 2, gridStartY + gridH + 14);
  }
}

// Kills
if (game.settings.showKills) {
  const killsX = portraitX + portraitW + rsecW + pad * 2;
  ctx.fillStyle = "rgba(255,136,102,0.6)";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  ctx.fillText("KILLS", killsX + rsecW / 2, topY + 4);
  ctx.fillStyle = "#ff8866";
  ctx.font = game.scaledFont(42, "bold");
  ctx.fillText(`${game.killedEnemies}`, killsX + rsecW / 2, midY + 12);
  ctx.fillStyle = "rgba(255,136,102,0.6)";
  ctx.font = "bold 18px monospace";
  ctx.fillText(`/ ${game.totalEnemies}`, killsX + rsecW / 2, midY + 34);
}

// Score
if (game.settings.showScore) {
  const scoreX = portraitX + portraitW + rsecW * 2 + pad * 3;
  ctx.fillStyle = "rgba(0,221,255,0.6)";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  ctx.fillText("SCORE", scoreX + rsecW / 2, topY + 4);
  ctx.fillStyle = "#00ddff";
  ctx.font = game.scaledFont(40, "bold");
  ctx.fillText(`${game.player.score}`, scoreX + rsecW / 2, midY + 14);
}

// Location / Round
const locX = portraitX + portraitW + rsecW * 3 + pad * 4;
const locCx = Math.min(locX + rsecW / 2, w - 50);
if (game.mode === "arena") {
  ctx.fillStyle = "#ffaa00";
  ctx.font = "bold 22px monospace";
  ctx.textAlign = "center";
  ctx.fillText("ROUND", locCx, topY + 4);
  ctx.font = "bold 44px monospace";
  ctx.fillText(`${game.arenaRound}`, locCx, midY + 12);
} else if (game.mode === "meltdown") {
  const mHud = game.meltdown.getHUD();
  ctx.fillStyle = "#ffaa00";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  ctx.fillText("REACTOR RUN", locCx, topY + 4);
  ctx.font = "bold 28px monospace";
  ctx.fillText(`${mHud.distance}m`, locCx, midY + 8);
} else if (game.mode === "campaign") {
  const levelName = game.map.name || `Level ${game.campaignLevel + 1}`;
  const maxLocW = w - locX - pad;
  ctx.font = "bold 14px monospace";
  let displayName = levelName;
  while (ctx.measureText(displayName).width > maxLocW && displayName.length > 4) {
    displayName = displayName.slice(0, -1);
  }
  if (displayName !== levelName) displayName += "…";
  ctx.fillStyle = "#aaddff";
  ctx.textAlign = "center";
  ctx.fillText(displayName, locCx, midY + 4);
}

// NG+ badge (campaign)
if (game.mode === "campaign" && game.ngPlusCycle > 0) {
  const ngLabel = game.ngPlusCycle >= 3 ? "NG+3 FINAL" : `NG+${game.ngPlusCycle}`;
  const ngColor = game.ngPlusCycle >= 3 ? "#ffcc00" : "#cc88ff";
  ctx.fillStyle = ngColor;
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "center";
  ctx.fillText(ngLabel, locCx, botY - 16);
}

// Difficulty
const diffNames = ["EASY", "NORMAL", "HARD", "NIGHTMARE"];
const diffColors = ["#44ff44", "#00ccff", "#ffaa00", "#ff2200"];
ctx.fillStyle = diffColors[game.settings.difficulty];
ctx.font = "bold 14px monospace";
ctx.textAlign = "center";
ctx.fillText(diffNames[game.settings.difficulty], locCx, botY);

// Vertical dividers
ctx.strokeStyle = "rgba(0,200,255,0.2)";
ctx.lineWidth = 1;
const divTop = h - barH + 4, divBot = h - 4;
const div1X = ammoX + ammoSecW + pad / 2;
ctx.beginPath(); ctx.moveTo(div1X, divTop); ctx.lineTo(div1X, divBot); ctx.stroke();
ctx.beginPath(); ctx.moveTo(portraitX - pad / 2, divTop); ctx.lineTo(portraitX - pad / 2, divBot); ctx.stroke();
ctx.beginPath(); ctx.moveTo(portraitX + portraitW + pad / 2, divTop); ctx.lineTo(portraitX + portraitW + pad / 2, divBot); ctx.stroke();
for (let s = 1; s <= 3; s++) {
  const dx = portraitX + portraitW + rsecW * s + pad * s + pad / 2;
  ctx.beginPath(); ctx.moveTo(dx, divTop); ctx.lineTo(dx, divBot); ctx.stroke();
}

// ─── Arena Timer (top-left, larger box) ───
if (game.mode === "arena") {
  const secs = Math.ceil(game.arenaTimer);
  const warning = secs <= 10;
  const cleared = game.arenaClearTimer != null;
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(10, 10, 160, 90);
  ctx.strokeStyle = warning ? "rgba(255,34,0,0.6)" : cleared ? "rgba(0,255,100,0.5)" : "rgba(0,200,255,0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, 160, 90);
  ctx.fillStyle = cleared ? "#00ff66" : warning ? (Math.floor(game.time / 250) % 2 ? "#ff2200" : "#ffaa00") : "#00ffcc";
  ctx.font = "bold 44px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${secs}s`, 90, 62);
  ctx.fillStyle = cleared ? "rgba(0,255,100,0.7)" : "rgba(255,255,255,0.5)";
  ctx.font = "bold 14px monospace";
  ctx.fillText(cleared ? "CLEARED!" : "TIME", 90, 28);
  if (game.roundStartTime) {
    const elapsedSec = Math.floor((performance.now() - game.roundStartTime) / 1000);
    const mins = Math.floor(elapsedSec / 60);
    const secs2 = elapsedSec % 60;
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "12px monospace";
    ctx.fillText(`${mins}:${secs2.toString().padStart(2, "0")} elapsed`, 90, 82);
  }
}

// ─── Campaign Timer (top-left) ───
if (game.mode === "campaign" && game.roundStartTime) {
  const elapsedSec = Math.floor((performance.now() - game.roundStartTime) / 1000);
  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(10, 10, 90, 24);
  ctx.fillStyle = "rgba(200,220,255,0.5)";
  ctx.font = "12px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${mins}:${secs.toString().padStart(2, "0")}`, 55, 27);
}

// ─── Meltdown HUD (heat meter top-right, overlay, ARIA text) ───
if (game.mode === "meltdown") {
  const mHud = game.meltdown.getHUD();
  const heatPct = mHud.heat / 100;
  // Heat meter (top-right)
  const heatW = 120, heatH = 16;
  const heatX = w - heatW - 15, heatY = 15;
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(heatX - 5, heatY - 5, heatW + 10, heatH + 24);
  ctx.strokeStyle = "rgba(255,68,0,0.3)";
  ctx.strokeRect(heatX - 5, heatY - 5, heatW + 10, heatH + 24);
  ctx.fillStyle = "rgba(60,20,0,0.6)";
  ctx.fillRect(heatX, heatY, heatW, heatH);
  const heatColor = heatPct < 0.5
    ? `rgb(255, ${Math.floor(200 - heatPct * 300)}, 0)`
    : `rgb(255, ${Math.floor(100 - (heatPct - 0.5) * 200)}, 0)`;
  ctx.fillStyle = heatColor;
  ctx.fillRect(heatX, heatY, heatW * heatPct, heatH);
  ctx.font = "bold 9px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = heatPct > 0.7 ? "#ff4400" : "#ffaa66";
  ctx.fillText(`REACTOR: ${mHud.heat}%`, heatX + heatW / 2, heatY + heatH + 12);
  ctx.font = "8px monospace";
  ctx.fillStyle = "rgba(150,200,255,0.5)";
  ctx.textAlign = "right";
  ctx.fillText(`${mHud.speed} m/s`, w - 15, heatY + heatH + 28);
  // Heat overlay on world
  const overlay = game.meltdown.getHeatOverlay();
  if (overlay) {
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, w, h - barH);
  }
  // ARIA text (center screen)
  if (game._meltdownAriaText) {
    const ariaAlpha = Math.min(1, game._meltdownAriaTimer / 0.5);
    ctx.save();
    ctx.globalAlpha = ariaAlpha;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    const tw = ctx.measureText(game._meltdownAriaText).width + 40;
    ctx.fillRect(w / 2 - tw / 2, h * 0.2 - 15, tw, 30);
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#00ccff";
    ctx.fillText(game._meltdownAriaText, w / 2, h * 0.2 + 3);
    ctx.restore();
  }
}

// ─── Boss Health Bar (top-center) ───
{
  const bossEntity = game.entities.find(
    (e) => e.type === "enemy" && e.active && e.health > 0 &&
      (e.enemyType === "boss" || e.enemyType === "boss_form2" || e.enemyType === "boss_form3"),
  );
  if (bossEntity) {
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
}

ctx.textAlign = "left";

// ─── Minimap (top-right) ───
let mmSize = game.settings.minimapSize;
drawMinimap(ctx, w - mmSize - 10, 10, mmSize, mmSize, _minimapState(game));

// ─── Crosshair (centered in viewport above bar) ───
const { x: chx, y: chy } = reticlePoint(w, h, barH, game.player);
drawCrosshair(ctx, chx, chy, game.settings.crosshair);
drawAdsReticle(ctx, game, chx, chy);

// ─── Hit marker ───
drawHitMarker(ctx, game, chx, chy);

// ─── Floating damage numbers ───
for (const dn of game.damageNumbers) {
  const dx = dn.x - game.player.x;
  const dy = dn.y - game.player.y;
  let angle = Math.atan2(dy, dx) - game.player.angle;
  while (angle < -Math.PI) angle += Math.PI * 2;
  while (angle > Math.PI) angle -= Math.PI * 2;
  const fov = (effectiveAimFov(game.player, game.settings) * Math.PI) / 180;
  if (Math.abs(angle) > fov / 2) continue;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.1) continue;
  const screenX = w / 2 + (angle / (fov / 2)) * (w / 2);
  const rise = (0.8 - dn.life) * 60;
  const screenY = (h - barH) / 2 - rise;
  const alpha = Math.min(1, dn.life / 0.3);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";
  drawDamageNumber(ctx, dn, screenX, screenY, true);
  ctx.restore();
}

// ─── Kill streak ───
game.killStreakSystem.renderFirstPerson(ctx, w, h, barH);

// ─── Stage cleared (arena only) ───
if (game.mode === "arena" && game.arenaClearTimer != null) {
  const countSecs = Math.ceil(game.arenaClearTimer);
  const pulse = 0.7 + Math.sin(game.time * 0.005) * 0.3;
  ctx.fillStyle = `rgba(0,10,5,${0.5 * pulse})`;
  ctx.fillRect(0, (h - barH) / 2 - 60, w, 120);
  ctx.fillStyle = `rgba(0,255,100,${pulse})`;
  ctx.font = "bold 48px monospace";
  ctx.textAlign = "center";
  ctx.fillText("STAGE CLEARED!", w / 2, (h - barH) / 2 - 8);
  ctx.fillStyle = "rgba(200,230,255,0.8)";
  ctx.font = "bold 22px monospace";
  ctx.fillText(`Next round in ${countSecs}s...`, w / 2, (h - barH) / 2 + 30);
  ctx.textAlign = "left";
}

// ─── Slow-mo vignette ───
if (game.slowMoTimer > 0) {
  const smAlpha = Math.min(0.35, (game.slowMoTimer / 1.5) * 0.35);
  ctx.fillStyle = `rgba(0,20,60,${smAlpha * 0.4})`;
  ctx.fillRect(0, 0, w, h - barH);
  const gradient = ctx.createRadialGradient(w / 2, (h - barH) / 2, w * 0.25, w / 2, (h - barH) / 2, w * 0.7);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, `rgba(0,0,0,${smAlpha})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h - barH);
}

// FPS counter
if (game.showFPS) {
  ctx.fillStyle = "#ffcc00";
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "left";
  ctx.fillText(`FPS: ${game.fps}`, 10, h - barH - 8);
}

// Achievement toast
game.renderAchievementToast(ctx, w, h);

// Meltdown upgrade overlay
if (game._meltdownUpgradeChoices) {
  _renderMeltdownUpgradeOverlay(game, ctx, w, h);
}

// ARIA comms overlay
game.renderAriaComms(ctx, w, h);
}

/** Meltdown upgrade selection overlay — 3 choices side by side */

function _renderMeltdownUpgradeOverlay(game, ctx, w, h) {
const choices = game._meltdownUpgradeChoices;
if (!choices || choices.length === 0) return;

// Dim background
ctx.fillStyle = "rgba(0,0,0,0.65)";
ctx.fillRect(0, 0, w, h);

// Title
ctx.fillStyle = "#ffaa00";
ctx.font = "bold 28px monospace";
ctx.textAlign = "center";
ctx.fillText("SYSTEM UPGRADE", w / 2, h * 0.22);
ctx.fillStyle = "rgba(255,255,255,0.5)";
ctx.font = "14px monospace";
ctx.fillText("Press 1, 2, or 3 to select — or use Arrow Keys + Enter", w / 2, h * 0.22 + 30);

// Cards
const cardW = Math.min(200, (w - 80) / 3);
const cardH = 160;
const gap = 16;
const totalW = choices.length * cardW + (choices.length - 1) * gap;
const startX = Math.floor(w / 2 - totalW / 2);
const startY = Math.floor(h / 2 - cardH / 2);

for (let i = 0; i < choices.length; i++) {
  const c = choices[i];
  const cx = startX + i * (cardW + gap);
  const selected = i === game._meltdownUpgradeSel;

  // Card background
  ctx.fillStyle = selected ? "rgba(0,200,255,0.2)" : "rgba(10,10,30,0.85)";
  ctx.beginPath();
  ctx.roundRect(cx, startY, cardW, cardH, 8);
  ctx.fill();

  // Border
  ctx.strokeStyle = selected ? "#00ccff" : "rgba(255,255,255,0.2)";
  ctx.lineWidth = selected ? 2.5 : 1;
  ctx.beginPath();
  ctx.roundRect(cx, startY, cardW, cardH, 8);
  ctx.stroke();

  // Key number
  ctx.fillStyle = selected ? "#00ccff" : "rgba(255,255,255,0.4)";
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "left";
  ctx.fillText(`[${i + 1}]`, cx + 10, startY + 20);

  // Icon
  ctx.font = "32px serif";
  ctx.textAlign = "center";
  ctx.fillText(c.icon || "⚙", cx + cardW / 2, startY + 52);

  // Name
  ctx.fillStyle = selected ? "#ffffff" : "rgba(255,255,255,0.8)";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  ctx.fillText(c.name, cx + cardW / 2, startY + 80);

  // Description (wrap if needed)
  ctx.fillStyle = "rgba(200,220,255,0.6)";
  ctx.font = "12px monospace";
  const desc = c.description || "";
  const maxTextW = cardW - 16;
  const words = desc.split(" ");
  let line = "";
  let lineY = startY + 100;
  for (const word of words) {
    const testLine = line ? line + " " + word : word;
    if (ctx.measureText(testLine).width > maxTextW) {
      ctx.fillText(line, cx + cardW / 2, lineY);
      line = word;
      lineY += 15;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, cx + cardW / 2, lineY);
}

ctx.textAlign = "left";
}

/** Compact mobile HUD: slim bar with health, ammo, and key info only */

function _renderCompactMobileHUD(game, ctx, w, h, barH, hudFactor) {
const wep = game.player.getWeaponDef();
const healthPct = game.player.health / game.player.maxHealth;
const healthColor =
  healthPct > 0.6
    ? game.cbColor("#00ff66")
    : healthPct > 0.3
      ? game.cbColor("#ffaa00")
      : game.cbColor("#ff2200");

// Stamina bar (slim, above the bar)
const staminaPct = game.player.stamina / game.player.maxStamina;
const stBarH = Math.round(8 * hudFactor);
const stBarW = Math.round(220 * hudFactor);
const stBarX = Math.floor(w / 2 - stBarW / 2);
const stBarY = h - barH - stBarH - 4;
const isActive = game.player.isSprinting || game.player.isDashing;

ctx.fillStyle = "rgba(5,5,15,0.7)";
ctx.fillRect(stBarX - 1, stBarY - 1, stBarW + 2, stBarH + 2);
if (staminaPct > 0.005) {
  const stColor = game.player.isDashing
    ? "#00ffff"
    : game.player.isSprinting
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
const chronoPct = game.player.chronoEnergy / game.player.maxChronoEnergy;
if (chronoPct > 0.005 || game.player.chronoActive) {
  const cBarH = Math.round(5 * hudFactor);
  const cBarW = Math.round(140 * hudFactor);
  const cBarX = Math.floor(w / 2 - cBarW / 2);
  const cBarY = stBarY - cBarH - 3;
  ctx.fillStyle = "rgba(5,5,15,0.6)";
  ctx.fillRect(cBarX - 1, cBarY - 1, cBarW + 2, cBarH + 2);
  if (chronoPct > 0.005) {
    ctx.fillStyle = game.player.chronoActive ? "#cc44ff" : "#9944ff";
    ctx.fillRect(cBarX, cBarY, cBarW * chronoPct, cBarH);
  }
  ctx.strokeStyle = game.player.chronoActive
    ? "#cc44ff"
    : "rgba(150,100,200,0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(cBarX, cBarY, cBarW, cBarH);
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
ctx.fillText(`${Math.ceil(game.player.health)}`, pad, midY + 3);
// Health bar below number
const hbW = hpW - pad;
const hbH = 6;
const hbY = midY + 10;
ctx.fillStyle = "rgba(255,255,255,0.08)";
ctx.fillRect(pad, hbY, hbW, hbH);
ctx.fillStyle = healthColor;
ctx.fillRect(pad, hbY, hbW * healthPct, hbH);

// Shield (if any)
if (game.player.maxShield > 0) {
  const shieldPct = game.player.shield / game.player.maxShield;
  const sbY = hbY + hbH + 2;
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(pad, sbY, hbW, 4);
  ctx.fillStyle = "#4488ff";
  ctx.fillRect(pad, sbY, hbW * shieldPct, 4);
}

// Center-left: AMMO
const ammoX = hpW + pad * 2;
ctx.fillStyle = "#ffcc00";
ctx.font = "bold 22px monospace";
ctx.textAlign = "center";
ctx.fillText(`${game.player.ammo}`, ammoX + 30, midY + 3);
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
ctx.fillText(`W${game.player.currentWeapon + 1}`, w / 2, midY - 12);

// Right: Kills + Score
if (game.settings.showKills) {
  const kx = w - pad - 110;
  ctx.fillStyle = "#ff8866";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "right";
  ctx.fillText(`${game.killedEnemies}/${game.totalEnemies}`, kx, midY + 2);
  ctx.fillStyle = "rgba(255,136,102,0.5)";
  ctx.font = "bold 8px monospace";
  ctx.fillText("KILLS", kx, midY - 10);
}

if (game.settings.showScore) {
  const sx = w - pad;
  ctx.fillStyle = "#00ddff";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "right";
  ctx.fillText(`${game.player.score}`, sx, midY + 2);
  ctx.fillStyle = "rgba(0,221,255,0.5)";
  ctx.font = "bold 8px monospace";
  ctx.fillText("SCORE", sx, midY - 10);
}

// Round indicator (arena)
if (game.mode === "arena") {
  ctx.fillStyle = "#ffaa00";
  ctx.font = "bold 9px monospace";
  ctx.textAlign = "right";
  ctx.fillText(`R${game.arenaRound}`, w - pad, midY + 14);
}

// Difficulty
const diffNames = ["EASY", "NORM", "HARD", "NITE"];
const diffColors = ["#44ff44", "#00ccff", "#ffaa00", "#ff2200"];
ctx.fillStyle = diffColors[game.settings.difficulty];
ctx.font = "bold 8px monospace";
ctx.textAlign = "left";
ctx.fillText(diffNames[game.settings.difficulty], pad, midY - 12);
}
