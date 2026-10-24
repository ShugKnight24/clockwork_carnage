/**
 * stats-screen.js — Standalone lifetime stats screen renderer.
 *
 * Usage:
 *   import { drawStatsScreen } from "./stats-screen.js";
 *   drawStatsScreen(ctx, w, h, achievementStats, conditioning);
 *
 * Pure drawing function — no game state references.
 */
import { SKILL_IDS, SKILLS, MAX_LEVEL, levelOf, progressOf } from "../src/systems/conditioning.js";

/**
 * Render the full-screen lifetime stats overlay.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w  Canvas width
 * @param {number} h  Canvas height
 * @param {object} achievementStats  The game's achievementStats object
 * @param {object} [conditioning]  The agent's Conditioning XP (game.conditioning)
 */
export function drawStatsScreen(ctx, w, h, achievementStats, conditioning = null) {
  const s = achievementStats;

  ctx.fillStyle = "rgba(0,0,0,0.92)";
  ctx.fillRect(0, 0, w, h);

  // Title
  ctx.fillStyle = "#00ffcc";
  ctx.font = "bold 28px monospace";
  ctx.textAlign = "center";
  ctx.fillText("LIFETIME STATS", w / 2, 50);

  // Format time played
  const totalSec = Math.floor(s.totalTimePlayed || 0);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const timeStr = hours > 0
    ? `${hours}h ${mins}m ${secs}s`
    : `${mins}m ${secs}s`;

  // Accuracy
  const accuracy = s.totalShotsFired > 0
    ? ((s.totalShotsHit / s.totalShotsFired) * 100).toFixed(1) + "%"
    : "N/A";

  // K/D ratio
  const kd = s.totalDeaths > 0
    ? (s.totalKills / s.totalDeaths).toFixed(2)
    : s.totalKills > 0 ? "Perfect" : "N/A";

  const stats = [
    { label: "TOTAL KILLS",      value: (s.totalKills      || 0).toLocaleString(), color: "#ff4444" },
    { label: "TOTAL DEATHS",     value: (s.totalDeaths     || 0).toLocaleString(), color: "#ff6666" },
    { label: "K/D RATIO",        value: kd,                                         color: "#ffcc00" },
    { label: "TIME PLAYED",      value: timeStr,                                    color: "#00ccff" },
    { label: "SHOTS FIRED",      value: (s.totalShotsFired || 0).toLocaleString(), color: "#aaddff" },
    { label: "ACCURACY",         value: accuracy,                                   color: "#44ff88" },
    { label: "SECRETS FOUND",    value: (s.totalSecretsFound  || 0).toLocaleString(), color: "#ffaa00" },
    { label: "CAMPAIGN LEVELS",  value: (s.totalCampaignLevels || 0).toLocaleString(), color: "#cc88ff" },
    { label: "GAMES PLAYED",     value: (s.totalGamesPlayed || 0).toLocaleString(), color: "#88ccff" },
    { label: "HIGHEST ARENA",    value: "Round " + (s.highestArenaRound || 0),      color: "#ff88cc" },
    { label: "HIGHEST SCORE",    value: (s.highestScore    || 0).toLocaleString(), color: "#ffcc44" },
    { label: "TOTAL DASHES",     value: (s.totalDashes     || 0).toLocaleString(), color: "#88ffcc" },
    { label: "UPGRADES BOUGHT",  value: (s.upgradesBought  || 0).toLocaleString(), color: "#ccccff" },
    { label: "FLAWLESS ROUNDS",  value: (s.flawlessRounds  || 0).toLocaleString(), color: "#44ffff" },
  ];

  const cols   = 2;
  const rowH   = 42;
  const colW   = 260;
  const totalW = cols * colW;
  const startX = w / 2 - totalW / 2;
  const startY = 80;

  for (let i = 0; i < stats.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * colW;
    const y = startY + row * rowH;

    // Label
    ctx.fillStyle = "rgba(180,190,200,0.6)";
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillText(stats[i].label, x + 10, y + 14);

    // Value
    ctx.fillStyle = stats[i].color;
    ctx.font = "bold 18px monospace";
    ctx.fillText(stats[i].value, x + 10, y + 34);
  }

  // Campaign complete badge
  let belowY = startY + Math.ceil(stats.length / cols) * rowH + 20;
  if (s.campaignComplete) {
    ctx.fillStyle = "#ffcc00";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("★ CAMPAIGN COMPLETED ★", w / 2, belowY);
    belowY += 24;
  }

  // Conditioning: each skill's level and the way to the next.
  if (conditioning) {
    ctx.fillStyle = "rgba(180,190,200,0.6)";
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillText("CONDITIONING", startX + 10, belowY);
    const cw = totalW / SKILL_IDS.length;
    SKILL_IDS.forEach((id, i) => {
      const x = startX + i * cw + 10;
      const lv = levelOf(conditioning, id);
      ctx.fillStyle = "#88ffcc";
      ctx.font = "bold 14px monospace";
      ctx.fillText(`${SKILLS[id].label} ${lv}/${MAX_LEVEL}`, x, belowY + 22);
      const bw = cw - 30;
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(x, belowY + 30, bw, 4);
      ctx.fillStyle = "#88ffcc";
      ctx.fillRect(x, belowY + 30, Math.round(bw * progressOf(conditioning, id)), 4);
    });
  }

  // Footer
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.font = "11px monospace";
  ctx.textAlign = "center";
  ctx.fillText("ESC to go back", w / 2, h - 20);
  ctx.textAlign = "left";
}
