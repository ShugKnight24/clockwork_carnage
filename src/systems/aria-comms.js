// ARIA in-game comms system.
// Extracted from game.js — Strangler Fig Phase 3.3

import { ARIA_COMMS } from "../data/dialogue.js";
import { isCompactPhone } from "../../js/layout.js";

export class AriaCommsSystem {
  constructor() {
    this.queue = [];
    this.message = null; // { text, color, life, duration, prominent }
    this.triggered = {}; // one-shot triggers per level/round
    this.enabled = false;
    this.idleTimer = 0;
    this.idleThreshold = 30;
    this.combatTimer = 0;
    this.messageLog = [];
    this.showLog = false;
    this.logScroll = 0;
  }

  enable() {
    this.enabled = true;
  }

  resetTriggered() {
    this.triggered = {};
  }

  resetCombatTimer() {
    this.combatTimer = 0;
  }

  resetAll() {
    this.queue = [];
    this.message = null;
    this.triggered = {};
    this.enabled = false;
    this.idleTimer = 0;
    this.idleThreshold = 30;
    this.combatTimer = 0;
    this.messageLog = [];
    this.showLog = false;
    this.logScroll = 0;
  }

  queueMessage(category, arenaRound) {
    if (!this.enabled) return;
    const pool = ARIA_COMMS[category];
    if (!pool || pool.length === 0) return;
    let text = pool[Math.floor(Math.random() * pool.length)];
    text = text.replace("{ROUNDS}", String(arenaRound || 0));
    const prominent = !["idle", "ariaPersonality"].includes(category);
    this.queue.push({
      text,
      color: "#00ffdd",
      duration: prominent ? 4.5 : 3.5,
      prominent,
      speaker: "ARIA",
    });
  }

  /**
   * Queue a squad-member voice line (Kael/Nova/Rook/Lyra).
   * Uses the same ARIA_COMMS pool (kaelComms/novaComms/etc.) but renders with speaker label + tinted color.
   * @param {string} speaker - display label (e.g. "KAEL")
   * @param {string} category - ARIA_COMMS pool key (e.g. "kaelComms")
   * @param {string} [color] - hex color for text tint
   */
  queueSquadMessage(speaker, category, color) {
    if (!this.enabled) return;
    const pool = ARIA_COMMS[category];
    if (!pool || pool.length === 0) return;
    const text = pool[Math.floor(Math.random() * pool.length)];
    this.queue.push({
      text,
      color: color || "#ffcc66",
      duration: 3.5,
      prominent: false,
      speaker: speaker || "SQUAD",
    });
  }

  triggerOnce(key, category, arenaRound) {
    if (this.triggered[key]) return;
    this.triggered[key] = true;
    this.queueMessage(category, arenaRound);
  }

  update(dt, isPlaying) {
    if (!this.enabled) return;

    // Drain queue -> active message
    if (!this.message && this.queue.length > 0) {
      const msg = this.queue.shift();
      this.message = { ...msg, life: 0 };
      this.idleTimer = 0;
      this.messageLog.push(msg.text);
    }
    if (this.message) {
      this.message.life += dt;
      if (this.message.life >= this.message.duration) this.message = null;
    }

    if (!isPlaying) return;

    // Combat timer -> longSurvival trigger
    this.combatTimer += dt;
    if (this.combatTimer > 120)
      this.triggerOnce("longSurvival", "longSurvival");

    // Idle chatter — act-aware (Sprint E 4.8)
    this.idleTimer += dt;
    if (
      this.idleTimer >= this.idleThreshold &&
      !this.message &&
      this.queue.length === 0
    ) {
      const pool = this._pickIdlePool();
      this.queueMessage(pool);
      this.idleThreshold = 25 + Math.random() * 25;
      this.idleTimer = 0;
    }
  }

  /** Narrative context for idle-pool selection. */
  setNarrativeContext({ act = 1, ngPlusCycle = 0 } = {}) {
    this.narrativeAct = act | 0;
    this.ngPlusCycle = ngPlusCycle | 0;
  }

  _pickIdlePool() {
    const act = this.narrativeAct || 1;
    const ngPlus = this.ngPlusCycle || 0;
    const r = Math.random();
    // NG+ cycles: chance of loop-awareness lines
    if (ngPlus >= 1 && r < 0.25) return "ngPlusAriaLoop";
    if (act === 3 && r < 0.35) return "act3Ambient";
    if (act === 2 && r < 0.35) return "act2Ambient";
    return r < 0.5 ? "idle" : "ariaPersonality";
  }

  /** Render active ARIA message (prominent or subtle). */
  renderMessage(ctx, w, h, characterName, isTouchDevice) {
    const msg = this.message;
    if (!msg) return;

    const t = msg.life;
    const dur = msg.duration;
    const agentName = characterName || "Agent";

    if (msg.prominent) {
      this._renderProminent(ctx, w, h, msg, t, dur, agentName);
    } else {
      this._renderSubtle(ctx, w, h, msg, t, dur, agentName, isTouchDevice);
    }
  }

  /** Render ARIA comms log overlay. */
  renderLog(ctx, w, h, characterName) {
    const panelW = Math.min(520, w - 40);
    const panelH = Math.min(400, h - 80);
    const panelX = (w - panelW) / 2;
    const panelY = (h - panelH) / 2;

    // Panel background
    ctx.fillStyle = "rgba(0, 8, 16, 0.96)";
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 200, 255, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 10);
    ctx.stroke();

    // Title
    ctx.fillStyle = "#00ccff";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.fillText("ARIA COMMS LOG", w / 2, panelY + 28);

    // Messages
    const log = this.messageLog;
    const lineH = 22;
    const maxLines = Math.floor((panelH - 70) / lineH);
    const startIdx = Math.max(0, log.length - maxLines - this.logScroll);
    const endIdx = Math.min(log.length, startIdx + maxLines);

    ctx.font = "13px monospace";
    ctx.textAlign = "left";
    const textX = panelX + 16;
    const textMaxW = panelW - 32;

    if (log.length === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.textAlign = "center";
      ctx.fillText("No messages yet", w / 2, panelY + panelH / 2);
    } else {
      for (let i = startIdx; i < endIdx; i++) {
        const y = panelY + 50 + (i - startIdx) * lineH;
        ctx.fillStyle = "rgba(0, 200, 255, 0.4)";
        ctx.fillText(`${String(i + 1).padStart(2, " ")}.`, textX, y);
        const text = log[i].replace(/\{AGENT\}/g, characterName || "Agent");
        ctx.fillStyle = "#00ffdd";
        let display = text;
        while (
          ctx.measureText(display).width > textMaxW - 30 &&
          display.length > 3
        ) {
          display = display.slice(0, -4) + "...";
        }
        ctx.fillText(display, textX + 30, y);
      }
    }

    // Scroll hint
    if (log.length > maxLines) {
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText("W/S to scroll", w / 2, panelY + panelH - 10);
    }

    // Footer
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText("L to close  |  ESC to resume", w / 2, panelY + panelH + 20);
    ctx.textAlign = "left";
  }

  // ── Private rendering helpers ──

  _renderProminent(ctx, w, h, msg, t, dur, agentName) {
    let alpha = 1;
    if (t < 0.4) alpha = t / 0.4;
    else if (t > dur - 0.5) alpha = 1 - (t - (dur - 0.5)) / 0.5;

    let slideY = t < 0.4 ? (1 - t / 0.4) * -40 : 0;

    ctx.save();
    ctx.globalAlpha = alpha;

    const pBoxW = 460;
    const pBx = (w - pBoxW) / 2;
    const pBy = h * 0.28 + slideY;

    // Word wrap
    const ariaText = msg.text.replace(/\{AGENT\}/g, agentName);
    ctx.font = "14px monospace";
    const maxTextW = pBoxW - 32;
    const lines = this._wordWrap(ctx, ariaText, maxTextW);
    const lineH = 17;
    const pBoxH = 64 + Math.max(0, lines.length - 1) * lineH;

    // Background
    ctx.fillStyle = "rgba(0, 8, 16, 0.95)";
    ctx.beginPath();
    ctx.roundRect(pBx, pBy, pBoxW, pBoxH, 8);
    ctx.fill();

    // Glowing border
    ctx.shadowColor = "#00ccff";
    ctx.shadowBlur = 12;
    ctx.strokeStyle = "rgba(0, 200, 255, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(pBx, pBy, pBoxW, pBoxH, 8);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ARIA label centered
    ctx.fillStyle =
      msg.speaker && msg.speaker !== "ARIA"
        ? msg.color || "#ffcc66"
        : "#00ccff";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(msg.speaker || "ARIA", w / 2, pBy + 18);

    // Message text centered
    ctx.fillStyle = msg.color;
    ctx.font = "14px monospace";
    const textStartY = lines.length > 1 ? pBy + 36 : pBy + 44;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], w / 2, textStartY + i * lineH);
    }

    ctx.textAlign = "left";
    ctx.restore();
  }

  _renderSubtle(ctx, w, h, msg, t, dur, agentName, isTouchDevice) {
    let slideX = 0;
    if (t < 0.3) slideX = (1 - t / 0.3) * -360;
    else if (t > dur - 0.4) slideX = ((t - (dur - 0.4)) / 0.4) * -360;

    let alpha = 1;
    if (t < 0.3) alpha = t / 0.3;
    else if (t > dur - 0.4) alpha = 1 - (t - (dur - 0.4)) / 0.4;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Word wrap
    const ariaText = msg.text.replace(/\{AGENT\}/g, agentName);
    const isCompactMobile = isTouchDevice && isCompactPhone(h);
    const boxW = isCompactMobile ? Math.min(340, w - 32) : 340;
    const textAreaX = 54;
    const maxTextW = boxW - textAreaX - 12;
    ctx.font = "13px monospace";
    const msgLines = this._wordWrap(ctx, ariaText, maxTextW);
    const lineH = 15;
    const boxH = 54 + Math.max(0, msgLines.length - 1) * lineH;
    const bx = (w - boxW) / 2 + slideX;
    const by = h - boxH - 70;

    // Background
    ctx.fillStyle = "rgba(0, 10, 20, 0.92)";
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,200,255,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 6);
    ctx.stroke();

    // ARIA Mini Portrait
    this._renderPortrait(ctx, bx + 7, by + 5, 40, 44, t);

    // Text area
    const tx = bx + 54;

    // "ARIA" label
    ctx.fillStyle =
      msg.speaker && msg.speaker !== "ARIA"
        ? msg.color || "#ffcc66"
        : "#00ccff";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "left";
    ctx.fillText(msg.speaker || "ARIA", tx, by + 17);

    // Pulsing indicator dot
    ctx.fillStyle = `rgba(0,255,200,${0.5 + Math.sin(t * 6) * 0.4})`;
    ctx.beginPath();
    ctx.arc(tx + 32, by + 14, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Waveform visualizer
    ctx.strokeStyle = `rgba(0, 200, 255, ${0.3 + Math.sin(t * 4) * 0.15})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i < 20; i++) {
      const wx = tx + 42 + i * 3;
      const wh = Math.sin(t * 10 + i * 0.7) * (3 + Math.sin(t * 3 + i) * 2);
      ctx.moveTo(wx, by + 14 - wh);
      ctx.lineTo(wx, by + 14 + wh);
    }
    ctx.stroke();

    // Message text
    ctx.fillStyle = msg.color;
    ctx.font = "13px monospace";
    for (let i = 0; i < msgLines.length; i++) {
      ctx.fillText(msgLines[i], tx, by + 38 + i * lineH);
    }

    ctx.restore();
  }

  _renderPortrait(ctx, px, py, pw, ph, t) {
    // Portrait background
    ctx.fillStyle = "rgba(0, 30, 50, 0.9)";
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 4);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,200,255,0.5)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 4);
    ctx.stroke();

    const cx = px + pw / 2;
    const cy = py + ph / 2 - 1;
    const breathe = Math.sin(t * 2) * 0.5;

    // Neck
    ctx.fillStyle = "rgba(180, 220, 240, 0.7)";
    ctx.fillRect(cx - 3, cy + 8, 6, 7);

    // High-collar suit
    ctx.fillStyle = "rgba(20, 50, 70, 0.95)";
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy + 14 + breathe);
    ctx.lineTo(cx - 6, cy + 9);
    ctx.lineTo(cx - 3, cy + 13);
    ctx.lineTo(cx + 3, cy + 13);
    ctx.lineTo(cx + 6, cy + 9);
    ctx.lineTo(cx + 14, cy + 14 + breathe);
    ctx.lineTo(cx + 14, cy + 22);
    ctx.lineTo(cx - 14, cy + 22);
    ctx.closePath();
    ctx.fill();
    // Collar trim
    ctx.strokeStyle = "#00ddff";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 9);
    ctx.lineTo(cx - 14, cy + 14 + breathe);
    ctx.moveTo(cx + 6, cy + 9);
    ctx.lineTo(cx + 14, cy + 14 + breathe);
    ctx.stroke();
    // Center line
    ctx.strokeStyle = "rgba(0,200,255,0.4)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 13);
    ctx.lineTo(cx, cy + 22);
    ctx.stroke();

    // Face
    ctx.fillStyle = "rgba(190, 225, 245, 0.8)";
    ctx.beginPath();
    ctx.ellipse(cx, cy - 2, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Holographic grid
    ctx.strokeStyle = "rgba(0,200,255,0.12)";
    ctx.lineWidth = 0.3;
    for (let gy = cy - 12; gy < cy + 9; gy += 3) {
      ctx.beginPath();
      ctx.moveTo(cx - 9, gy);
      ctx.lineTo(cx + 9, gy);
      ctx.stroke();
    }

    // Hair — asymmetric bob
    ctx.fillStyle = "rgba(40, 50, 70, 0.9)";
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy - 14);
    ctx.quadraticCurveTo(cx - 13, cy - 10, cx - 12, cy + 3);
    ctx.lineTo(cx - 9, cy + 2);
    ctx.quadraticCurveTo(cx - 10, cy - 8, cx - 3, cy - 11);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 3, cy - 14);
    ctx.quadraticCurveTo(cx + 12, cy - 10, cx + 10, cy - 1);
    ctx.lineTo(cx + 8, cy - 2);
    ctx.quadraticCurveTo(cx + 9, cy - 8, cx + 3, cy - 11);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 13);
    ctx.quadraticCurveTo(cx, cy - 16, cx + 5, cy - 13);
    ctx.quadraticCurveTo(cx, cy - 11, cx - 5, cy - 13);
    ctx.fill();

    // Cyan highlight streak
    ctx.strokeStyle = "#00eeff";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 13);
    ctx.quadraticCurveTo(cx - 12, cy - 7, cx - 11, cy + 1);
    ctx.stroke();

    // Eyes — glowing cyan
    const eyeGlow = 0.7 + Math.sin(t * 3) * 0.3;
    ctx.fillStyle = `rgba(0, 230, 255, ${eyeGlow})`;
    ctx.beginPath();
    ctx.ellipse(cx - 4, cy - 3, 1.8, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy - 3, 1.8, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(0, 200, 255, ${eyeGlow * 0.15})`;
    ctx.beginPath();
    ctx.ellipse(cx - 4, cy - 3, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy - 3, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Slight smile
    ctx.strokeStyle = "rgba(100, 160, 200, 0.5)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy + 1, 3, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // Tech headset
    ctx.strokeStyle = "rgba(80, 100, 120, 0.9)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy - 3, 11, -0.65 * Math.PI, -0.15 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = "rgba(30, 50, 70, 0.9)";
    ctx.beginPath();
    ctx.ellipse(cx + 10, cy - 1, 2.5, 4, 0.15, 0, Math.PI * 2);
    ctx.fill();
    // Boom mic
    ctx.strokeStyle = "rgba(80, 100, 120, 0.7)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx + 9, cy + 2);
    ctx.quadraticCurveTo(cx + 8, cy + 6, cx + 3, cy + 7);
    ctx.stroke();
    ctx.fillStyle = "#00ddff";
    ctx.beginPath();
    ctx.arc(cx + 3, cy + 7, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Scanlines
    ctx.fillStyle = `rgba(0, 200, 255, ${0.03 + Math.sin(t * 8) * 0.02})`;
    for (let sy = 0; sy < ph; sy += 2) {
      ctx.fillRect(px, py + sy, pw, 1);
    }
  }

  _wordWrap(ctx, text, maxW) {
    const words = text.split(" ");
    const lines = [];
    let cur = "";
    for (const word of words) {
      const test = cur ? cur + " " + word : word;
      if (ctx.measureText(test).width > maxW && cur) {
        lines.push(cur);
        cur = word;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }
}
