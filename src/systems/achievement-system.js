// Achievement tracking, toast notifications, and screens.
// Extracted from game.js — Strangler Fig Phase 3.2
// Owns: unlockedAchievements, achievementQueue, achievementToast, achievementIcons,
//       achievementStats, roundDamageTaken, achievementsScroll.
// Side effects returned as data (e.g. { playSound }) — caller handles audio.

import { ACHIEVEMENTS, ACHIEVEMENT_ICON_SVGS } from "../data/index.js";
import * as Save from "../core/save-system.js";
import { drawStatsScreen } from "../../js/stats-screen.js";

export class AchievementSystem {
  constructor() {
    this.unlockedAchievements = {};
    this.achievementQueue = [];
    this.achievementToast = null;
    this.achievementsScroll = 0;
    this._lastStatsSave = 0;
    this.roundDamageTaken = 0;

    // Preload SVG icons
    this.achievementIcons = {};
    for (const [key, svgStr] of Object.entries(ACHIEVEMENT_ICON_SVGS)) {
      const img = new Image();
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
      this.achievementIcons[key] = img;
    }

    this.achievementStats = {
      totalKills: 0,
      totalDashes: 0,
      highestArenaRound: 0,
      highestScore: 0,
      campaignComplete: false,
      bossKilled: false,
      tutorialComplete: false,
      upgradesBought: 0,
      flawlessRounds: 0,
      totalDeaths: 0,
      totalTimePlayed: 0,
      totalShotsFired: 0,
      totalShotsHit: 0,
      totalSecretsFound: 0,
      totalCampaignLevels: 0,
      totalGamesPlayed: 0,
      // Unlock progression (src/systems/unlocks.js)
      weaponKills: {}, // weapon id → kills
      gearFound: 0, // gear pieces picked up off the ground
      campaignLevelsCleared: 0, // campaign levels cleared in order (high-water mark)
      campaignActsCleared: 0, // Paradox Lord defeats, highest act (1..3)
    };
    this._lastProgressEmit = 0;
  }

  // ── Persistence ────────────────────────────────────────

  save() {
    Save.saveAchievements(this.unlockedAchievements, this.achievementStats);
    this.emitProgress();
  }

  /** Tell listeners (unlock toast) that progression may have changed. */
  emitProgress() {
    this._lastProgressEmit = typeof performance !== "undefined" ? performance.now() : 0;
    if (typeof window !== "undefined" && typeof CustomEvent === "function") {
      window.dispatchEvent(new CustomEvent("cc:progress"));
    }
  }

  load() {
    Save.loadAchievements(this.unlockedAchievements, this.achievementStats);
  }

  // ── Core logic ─────────────────────────────────────────

  unlockAchievement(id) {
    if (this.unlockedAchievements[id]) return;
    if (!ACHIEVEMENTS[id] || id.startsWith("_")) return;
    this.unlockedAchievements[id] = true;
    this.achievementQueue.push(id);
    this.save();
  }

  /** @param {number} playerScore */
  checkAchievements(playerScore) {
    this.achievementStats.highestScore = Math.max(
      this.achievementStats.highestScore, playerScore,
    );
    for (const [id, ach] of Object.entries(ACHIEVEMENTS)) {
      if (id.startsWith("_")) continue;
      if (this.unlockedAchievements[id]) continue;
      if (ach.check(this.achievementStats)) this.unlockAchievement(id);
    }
    const now = performance.now();
    // Kills and dashes change stats every frame without saving; a cheap
    // once-a-second nudge lets unlocks be announced as they are earned.
    if (now - this._lastProgressEmit > 1000) this.emitProgress();
    if (!this._lastStatsSave || now - this._lastStatsSave > 30000) {
      this._lastStatsSave = now;
      this.save();
    }
  }

  /**
   * With a message director, each unlocked achievement waits its turn in the
   * chip lane (held back through boss intros, fresh teach cards and heavy
   * combat) and shows for as long as the director gives it.
   * @param {number} dt
   * @param {import("../ui/message-director.js").MessageDirector} [director]
   * @returns {{ playSound: boolean }}
   */
  updateToast(dt, director = null) {
    if (director) return this._directedToast(director);
    let playSound = false;
    if (!this.achievementToast && this.achievementQueue.length > 0) {
      const id = this.achievementQueue.shift();
      const ach = ACHIEVEMENTS[id];
      if (ach) {
        this.achievementToast = {
          id, name: ach.name, description: ach.description,
          icon: ach.icon, time: 0, duration: 3.5,
        };
        playSound = true;
      }
    }
    if (this.achievementToast) {
      this.achievementToast.time += dt;
      if (this.achievementToast.time >= this.achievementToast.duration)
        this.achievementToast = null;
    }
    return { playSound };
  }

  _directedToast(director) {
    while (this.achievementQueue.length > 0) {
      const id = this.achievementQueue.shift();
      if (ACHIEVEMENTS[id]) director.post(`achievement:${id}`, "achievement", { id });
    }
    let playSound = false;
    const cur = director.current("chip");
    if (cur?.kind === "achievement") {
      const ach = ACHIEVEMENTS[cur.data.id];
      if (this.achievementToast?.id !== cur.data.id) {
        this.achievementToast = { id: cur.data.id, name: ach.name, description: ach.description, icon: ach.icon, time: 0, duration: cur.duration };
        playSound = true;
      }
      this.achievementToast.time = director.age(cur.key);
    } else {
      this.achievementToast = null;
    }
    return { playSound };
  }

  // ── Rendering ──────────────────────────────────────────

  /**
   * @param {object} [director] - with lanes, the toast is a chip in the chip
   *   lane (under the minimap) instead of a card over the minimap
   */
  renderToast(ctx, w, h, director = null) {
    const toast = this.achievementToast;
    if (!toast) return;
    const t = toast.time, dur = toast.duration;
    const lane = director?.lanes?.chips;
    const boxW = lane ? lane.w : 320, boxH = lane ? Math.min(70, lane.h - 4) : 70;
    let slideX = 0;
    if (t < 0.4) slideX = (1 - t / 0.4) * (boxW + 30);
    else if (t > dur - 0.4) slideX = ((t - (dur - 0.4)) / 0.4) * (boxW + 30);

    const bx = (lane ? lane.x : w - boxW - 20) + slideX, by = lane ? lane.y : 20;
    if (lane && boxH < 50) {
      this._renderChipLine(ctx, toast, bx, by, boxW, boxH);
      return;
    }
    // Laid out for a 70px card; a chip lane scales it down.
    const k = boxH / 70;
    const px = (n) => Math.round(n * k);
    const textW = boxW - px(55) - 8;

    ctx.save();
    ctx.fillStyle = "rgba(10, 10, 30, 0.92)";
    ctx.beginPath(); ctx.roundRect(bx, by, boxW, boxH, 8); ctx.fill();
    ctx.strokeStyle = "#ffcc00"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(bx, by, boxW, boxH, 8); ctx.stroke();
    ctx.fillStyle = "#ffcc00";
    ctx.beginPath(); ctx.roundRect(bx, by, 4, boxH, [8, 0, 0, 8]); ctx.fill();

    const iconImg = this.achievementIcons[toast.icon];
    if (iconImg?.complete && iconImg.naturalWidth > 0) {
      ctx.drawImage(iconImg, bx + px(14), by + px(19), px(32), px(32));
    } else {
      ctx.font = `${px(28)}px monospace`; ctx.textAlign = "center";
      ctx.fillText(toast.icon, bx + px(30), by + px(44));
    }

    ctx.fillStyle = "#ffcc00"; ctx.font = `bold ${px(11)}px monospace`; ctx.textAlign = "left";
    ctx.fillText("ACHIEVEMENT UNLOCKED", bx + px(55), by + px(22), textW);
    ctx.fillStyle = "#ffffff"; ctx.font = `bold ${px(16)}px monospace`;
    ctx.fillText(toast.name, bx + px(55), by + px(42), textW);
    ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = `${px(12)}px monospace`;
    ctx.fillText(toast.description, bx + px(55), by + px(58), textW);
    ctx.restore();
  }

  /** One-line chip for a phone's short chip lane. */
  _renderChipLine(ctx, toast, bx, by, boxW, boxH) {
    ctx.save();
    ctx.fillStyle = "rgba(10, 10, 30, 0.92)";
    ctx.beginPath(); ctx.roundRect(bx, by, boxW, boxH, 6); ctx.fill();
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(bx, by, 3, boxH);
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = "bold 9px monospace";
    ctx.fillText("ACHIEVEMENT", bx + 9, by + boxH / 2);
    const lw = ctx.measureText("ACHIEVEMENT").width;
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 11px monospace";
    ctx.fillText(toast.name, bx + 17 + lw, by + boxH / 2, boxW - lw - 24);
    ctx.restore();
  }

  renderScreen(ctx, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.92)"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ffcc00"; ctx.font = "bold 28px monospace";
    ctx.textAlign = "center"; ctx.fillText("ACHIEVEMENTS", w / 2, 50);

    const entries = Object.entries(ACHIEVEMENTS);
    const cols = 2, cardW = 260, cardH = 72, gap = 12;
    const totalW = cols * cardW + (cols - 1) * gap;
    const startX = w / 2 - totalW / 2, startY = 80;
    const visibleRows = Math.floor((h - startY - 50) / (cardH + gap));
    const maxScroll = Math.max(0, Math.ceil(entries.length / cols) - visibleRows);
    this.achievementsScroll = Math.min(this.achievementsScroll || 0, maxScroll);
    const scroll = this.achievementsScroll || 0;

    let unlocked = 0;
    for (const [id] of entries) if (this.unlockedAchievements[id]) unlocked++;

    // Progress bar
    const progW = 300, progH = 10;
    const progX = w / 2 - progW / 2, progY = 58;
    const progPct = entries.length > 0 ? unlocked / entries.length : 0;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath(); ctx.roundRect(progX, progY, progW, progH, 4); ctx.fill();
    if (progPct > 0) {
      ctx.fillStyle = "#ffcc00";
      ctx.beginPath(); ctx.roundRect(progX, progY, progW * progPct, progH, 4); ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "10px monospace";
    ctx.fillText(`${unlocked} / ${entries.length}`, w / 2, progY + progH + 12);

    for (let idx = 0; idx < entries.length; idx++) {
      const [id, ach] = entries[idx];
      const row = Math.floor(idx / cols) - scroll;
      const col = idx % cols;
      if (row < 0 || row >= visibleRows) continue;
      const cx = startX + col * (cardW + gap);
      const cy = startY + row * (cardH + gap);
      const isUnlocked = !!this.unlockedAchievements[id];

      ctx.fillStyle = isUnlocked ? "rgba(40,40,10,0.7)" : "rgba(10,10,20,0.6)";
      ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 6); ctx.fill();
      ctx.strokeStyle = isUnlocked ? "rgba(255,204,0,0.4)" : "rgba(100,100,120,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 6); ctx.stroke();

      const iconImg = this.achievementIcons[ach.icon];
      if (iconImg?.complete) {
        ctx.globalAlpha = isUnlocked ? 1 : 0.25;
        ctx.drawImage(iconImg, cx + 8, cy + 10, 48, 48);
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = isUnlocked ? "#ffcc00" : "#555566";
      ctx.font = "bold 13px monospace"; ctx.textAlign = "left";
      ctx.fillText(ach.name, cx + 64, cy + 24);
      ctx.fillStyle = isUnlocked ? "rgba(200,210,220,0.7)" : "rgba(100,100,120,0.5)";
      ctx.font = "11px monospace";
      ctx.fillText(ach.description, cx + 64, cy + 42);

      if (isUnlocked) {
        ctx.fillStyle = "rgba(0,255,100,0.6)"; ctx.font = "bold 10px monospace";
        ctx.textAlign = "right"; ctx.fillText("UNLOCKED", cx + cardW - 8, cy + 60);
        ctx.textAlign = "left";
      }
    }

    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("W/S to scroll  \u00b7  ESC to go back", w / 2, h - 20);
    ctx.textAlign = "left";
  }

  renderStats(ctx, w, h) {
    drawStatsScreen(ctx, w, h, this.achievementStats);
  }
}
