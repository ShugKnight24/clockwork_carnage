// ARIA in-game comms system.
// Extracted from game.js — Strangler Fig Phase 3.3

import { ARIA_COMMS } from "../data/dialogue.js";
import { voiceKeyFor } from "../audio/voice.js";
import { isCompactPhone } from "../../js/layout.js";
import { isModernArt, isRealisticArt } from "../rendering/art-style.js";
import { drawSvgModelAt } from "../rendering/svg-art/index.js";

/**
 * Beats where ARIA projects herself instead of speaking into the cadet's ear:
 * the ones she would actually stand up for.
 */
const PROJECTED_CATEGORIES = new Set([
  "bossEncounter",
  "bossForm2",
  "criticalHealth",
  "levelComplete",
  "tutorialComplete",
]);

/** Seconds between projections, so her showing up stays an event. */
const PROJECTION_COOLDOWN = 75;

/**
 * How ARIA sounds for each kind of line. She is warm by default; these are
 * the beats where she should sound like she means it.
 */
const CATEGORY_EMOTIONS = {
  lowHealth: "worried",
  criticalHealth: "afraid",
  firstKill: "happy",
  levelComplete: "happy",
  tutorialComplete: "tender",
  secretFound: "curious",
  bossEncounter: "urgent",
  bossForm2: "urgent",
  idle: "warm",
  ariaPersonality: "warm",
  // Chronos (spec §3-§4): the governed shift is a thrill, the loud one a
  // worry; Resonance and hunters are urgent; a new power is a gift.
  chronoShiftActivated: "excited",
  chronoShiftLoud: "worried",
  resonanceRising: "urgent",
  lordHearsYou: "menacing",
  hunterResponse: "urgent",
  powerUnlocked: "happy",
  teachDone: "happy",
  counterShift: "afraid",
  elevenSeconds: "tender",
  ventGallery: "curious",
  collapseChase: "urgent",
  stasisRoom: "sad",
  loopRepeats: "curious",
  loopBroken: "excited",
  // Act III's set pieces and Form 2.
  rewriteWalls: "curious",
  reactorHeat: "urgent",
  reactorHeatHigh: "urgent",
  reactorOverload: "afraid",
  archiveBlast: "worried",
  survivingTake: "sad",
  stasisBreaks: "urgent",
  replayVolley: "urgent",
};
import { SQUAD_TAB_COLORS } from "./squad-comms.js";
import {
  UI,
  uiFont,
  drawPanel,
  drawTitle,
  drawCaption,
  drawKeycap,
  pixelRatio,
} from "../ui/modern-ui-kit.js";
import * as skin from "../ui/hud-skin.js";

export class AriaCommsSystem {
  constructor(game = null) {
    // Only read for Modern layout (HUD style / scale decide where the subtle
    // plate can sit without covering the vitals).
    this.game = game;
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
    this._clock = 0;
    this._lastProjection = -Infinity;
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
    this.game?.audio?.stopSpeech?.("comms");
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
    this._clock = 0;
    this._lastProjection = -Infinity;
  }

  queueMessage(category, arenaRound) {
    if (!this.enabled) return;
    const pool = ARIA_COMMS[category];
    if (!pool || pool.length === 0) return;
    let text = pool[Math.floor(Math.random() * pool.length)];
    text = text.replace("{ROUNDS}", String(arenaRound || 0));
    const prominent = !["idle", "ariaPersonality"].includes(category);
    const projected = this._shouldProject(category);
    this.queue.push({
      text,
      color: "#00ffdd",
      // She holds the floor longer when she has bothered to appear.
      duration: projected ? 6 : prominent ? 4.5 : 3.5,
      prominent,
      projected,
      speaker: "ARIA",
      emotion: CATEGORY_EMOTIONS[category] ?? null,
    });
  }

  /**
   * Whether ARIA projects herself for this line instead of speaking into the
   * cadet's ear. Reserved for the beats that carry weight, and rate-limited so
   * it stays an event: if she showed up a minute ago, she stays a voice.
   */
  _shouldProject(category) {
    if (!PROJECTED_CATEGORIES.has(category)) return false;
    const now = this._clock;
    if (now - (this._lastProjection ?? -Infinity) < PROJECTION_COOLDOWN) return false;
    this._lastProjection = now;
    return true;
  }

  /**
   * Queue a squad-member voice line (Kael/Nova/Rook/Lyra).
   * Uses the same ARIA_COMMS pool (kaelComms/novaComms/etc.) but renders with speaker label + tinted color.
   * @param {string} speaker - display label (e.g. "KAEL")
   * @param {string} category - ARIA_COMMS pool key (e.g. "kaelComms")
   * @param {string} [color] - hex color for text tint
   */
  /**
   * Queue a squad line: a random one from `category`, or `line` when the
   * caller has already chosen who says what.
   */
  queueSquadMessage(speaker, category, color, line = null, { voice = null, emotion = null } = {}) {
    if (!this.enabled) return;
    const pool = ARIA_COMMS[category];
    if (!line && (!pool || pool.length === 0)) return;
    const text = line ?? pool[Math.floor(Math.random() * pool.length)];
    this.queue.push({
      text,
      color: color || "#ffcc66",
      duration: 3.5,
      prominent: false,
      speaker: speaker || "SQUAD",
      // A speaker label can differ from the voice: VOSS on the plate is the
      // Lord's voice, not the tactician's.
      voice,
      emotion: emotion ?? CATEGORY_EMOTIONS[category] ?? null,
    });
  }

  triggerOnce(key, category, arenaRound) {
    if (this.triggered[key]) return;
    this.triggered[key] = true;
    this.queueMessage(category, arenaRound);
  }

  update(dt, isPlaying) {
    if (!this.enabled) return;
    this._clock = (this._clock || 0) + dt;

    // Drain queue -> active message
    if (!this.message && this.queue.length > 0) {
      const msg = this.queue.shift();
      this.message = { ...msg, life: 0 };
      this.idleTimer = 0;
      this.messageLog.push(msg.text);
      this._voice(msg);
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

  /**
   * Speak the line in its speaker's voice. The plate types at TYPE_RATE, far
   * faster than speech, so the voice paces itself to fit most of the time the
   * line stays up instead.
   */
  _voice(msg) {
    const audio = this.game?.audio;
    if (!audio?.speak) return;
    const key = msg.voice ?? voiceKeyFor({ speaker: msg.speaker || "ARIA" });
    const text = String(msg.text).replace(/\{AGENT\}/g, this.game?.character?.name || "Agent");
    const charsPerSec = Math.max(16, text.length / Math.max(1, msg.duration * 0.8));
    audio.speak(text, key, { channel: "comms", charsPerSec, emotion: msg.emotion ?? null });
  }

  /**
   * Narrative context for idle-pool selection. `ambient` is the act's own
   * idle pool (ACTS[].ambient), or null for none.
   */
  setNarrativeContext({ act = 1, ngPlusCycle = 0, ambient = null } = {}) {
    this.narrativeAct = act | 0;
    this.ngPlusCycle = ngPlusCycle | 0;
    this.ambientPool = ambient;
  }

  _pickIdlePool() {
    const ngPlus = this.ngPlusCycle || 0;
    const r = Math.random();
    // NG+ cycles: chance of loop-awareness lines
    if (ngPlus >= 1 && r < 0.25) return "ngPlusAriaLoop";
    if (this.ambientPool && r < 0.35) return this.ambientPool;
    return r < 0.5 ? "idle" : "ariaPersonality";
  }

  /**
   * Render active ARIA message (prominent or subtle).
   * @param {number} [minTop] - keep the prominent box below this y (tutorial step card)
   */
  renderMessage(ctx, w, h, characterName, isTouchDevice, minTop = 0) {
    const msg = this.message;
    if (!msg) return;

    const t = msg.life;
    const dur = msg.duration;
    const agentName = characterName || "Agent";

    if (isRealisticArt() && !msg.projected) {
      if (msg.prominent) this._renderRealProminent(ctx, w, h, msg, t, dur, agentName, minTop);
      else this._renderRealSubtle(ctx, w, h, msg, t, dur, agentName, isTouchDevice);
      return;
    }
    if (isModernArt()) {
      if (msg.projected) this._renderModernProjection(ctx, w, h, msg, t, dur, agentName, minTop);
      else if (msg.prominent) this._renderModernProminent(ctx, w, h, msg, t, dur, agentName, minTop);
      else this._renderModernSubtle(ctx, w, h, msg, t, dur, agentName, isTouchDevice);
      return;
    }

    if (msg.prominent) {
      this._renderProminent(ctx, w, h, msg, t, dur, agentName, minTop);
    } else {
      this._renderSubtle(ctx, w, h, msg, t, dur, agentName, isTouchDevice);
    }
  }

  /** Render ARIA comms log overlay. */
  renderLog(ctx, w, h, characterName) {
    if (isModernArt()) {
      this._renderModernLog(ctx, w, h, characterName);
      return;
    }
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

  _renderProminent(ctx, w, h, msg, t, dur, agentName, minTop = 0) {
    let alpha = 1;
    if (t < 0.4) alpha = t / 0.4;
    else if (t > dur - 0.5) alpha = 1 - (t - (dur - 0.5)) / 0.5;

    let slideY = t < 0.4 ? (1 - t / 0.4) * -40 : 0;

    ctx.save();
    ctx.globalAlpha = alpha;

    const pBoxW = 460;
    const pBx = (w - pBoxW) / 2;
    // Sits high enough to clear the reticle and the horizon where enemies
    // appear. At 0.28 it parked directly in the firing sightline.
    const pBy = Math.max(h * 0.135, minTop ? minTop + 12 : 0) + slideY;

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

  // ── Modern (graphic-novel) rendering ──

  /**
   * Wrapped lines for the active message, cached on the message so the
   * typewriter reveal never re-measures (and never reflows) per frame.
   */
  _modernLines(ctx, msg, agentName, font, maxW) {
    const key = `${font}|${maxW}|${agentName}`;
    if (msg._wrapKey !== key) {
      ctx.font = font;
      msg._wrapKey = key;
      msg._wrap = this._wordWrap(ctx, msg.text.replace(/\{AGENT\}/g, agentName), maxW);
      msg._chars = msg._wrap.reduce((n, l) => n + l.length, 0);
    }
    return msg._wrap;
  }

  /** Typewriter text: lines revealed at TYPE_RATE chars/s with an ink caret. */
  _drawTyped(ctx, msg, lines, x, y, lineH, t, color, caretColor) {
    const shown = Math.max(0, Math.floor((t - 0.12) * TYPE_RATE));
    let left = shown;
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const ly = y + i * lineH;
      if (left >= line.length) {
        ctx.fillText(line, x, ly);
        left -= line.length;
        continue;
      }
      const part = line.slice(0, left);
      if (part) ctx.fillText(part, x, ly);
      // Caret only while typing; blinks at ~6Hz.
      if ((t * 6) % 2 < 1.4) {
        const cx = x + (part ? ctx.measureText(part).width : 0) + 1;
        ctx.fillStyle = caretColor;
        ctx.fillRect(Math.round(cx), Math.round(ly - lineH * 0.62), 2, Math.round(lineH * 0.72));
      }
      return;
    }
  }

  _speaking(msg, t) {
    return (t - 0.12) * TYPE_RATE < (msg._chars || 0);
  }

  /** Where the subtle plate's bottom edge sits so it clears the Modern vitals. */
  _modernSubtleBottom(h, compact) {
    const s = this.game?.settings || {};
    const f = (s.hudScale || 100) / 100;
    const fs = (s.fontScale || 100) / 100;
    if (compact) return h - Math.round(60 * f) - Math.round(7 * f) - 26;
    if (s.hudStyle === 1) return h - Math.round(160 * f) - 56;
    if (s.hudStyle === 0 || s.hudStyle == null) {
      // Minimal: weapon strip + vitals plate + CRITICAL caption above it.
      const plateH = Math.max(10 * f + 6 + 4 * f + 4 + 8 * fs, 30 * fs) + 18 + 7;
      const strip = s.showWeapons === false ? 12 : 12 + 30 * f + 8;
      return h - Math.round(strip + plateH + 36 * fs);
    }
    return h - 150;
  }

  _renderModernProminent(ctx, w, h, msg, t, dur, agentName, minTop = 0) {
    let alpha = 1;
    if (t < 0.3) alpha = t / 0.3;
    else if (t > dur - 0.5) alpha = 1 - (t - (dur - 0.5)) / 0.5;
    // Short drop-in with a touch of overshoot, like a panel slapped on a page.
    const k = Math.min(1, t / 0.3);
    const slideY = t < 0.3 ? -18 * (1 - k) * (1 - k) + Math.sin(k * Math.PI) * 3 : 0;

    const boxW = Math.min(460, w - 24);
    const x = Math.round((w - boxW) / 2);
    // Same anchor as legacy; the speaker tab pokes ~10px above the plate, so
    // clear the tutorial card by that much more.
    const y = Math.round(Math.max(h * 0.135, minTop ? minTop + 22 : 0) + slideY);

    const speaker = msg.speaker || "ARIA";
    const color = speakerTone(speaker);
    const port = 50;
    const tx = x + 14 + port + 14;
    const font = uiFont(15, 600);
    const lineH = 19;
    const lines = this._modernLines(ctx, msg, agentName, font, x + boxW - 18 - tx);
    const boxH = Math.max(port + 22, 26 + lines.length * lineH + 10);

    ctx.save();
    ctx.globalAlpha = alpha;
    const dpr = pixelRatio(ctx);
    const card = captionCardSprite(boxW, boxH, color, dpr);
    ctx.drawImage(card, x - CARD_PAD, y - CARD_PAD, boxW + CARD_PAD * 2, boxH + CARD_PAD * 2);

    const py = y + Math.round((boxH - port) / 2);
    ctx.drawImage(portraitSprite(speaker, color, port, dpr), x + 14 - 2, py - 2, port + 4, port + 4);
    this._drawPortraitLive(ctx, speaker, x + 14, py, port, t);

    const tab = speakerTabSprite(speaker, color, 11, dpr);
    ctx.drawImage(tab.c, tx - 3, y - 11 - 3, tab.w + 6, tab.h + 6);
    drawVoiceBars(ctx, tx + tab.w + 8, y - 11 + tab.h / 2, t, color, this._speaking(msg, t) ? 1 : 0.15);

    ctx.font = font;
    const textY = y + Math.round((boxH - lines.length * lineH) / 2 + lineH * 0.74) + 1;
    this._drawTyped(ctx, msg, lines, tx, textY, lineH, t, UI.captionInk, UI.ink);
    ctx.restore();
  }

  /**
   * ARIA projected into the room: a full-height hologram standing beside the
   * caption rather than a 50px bust inside it. Reserved for the beats in
   * PROJECTED_CATEGORIES, so the bust stays the everyday voice and this reads
   * as her actually showing up.
   */
  _renderModernProjection(ctx, w, h, msg, t, dur, agentName, minTop = 0) {
    let alpha = 1;
    if (t < 0.45) alpha = t / 0.45;
    else if (t > dur - 0.6) alpha = 1 - (t - (dur - 0.6)) / 0.6;

    const compact = isCompactPhone(h);
    // She stands on the left, clear of the vitals ring in the bottom corner.
    const figH = Math.round(Math.min(h * (compact ? 0.4 : 0.5), 352));
    const figW = Math.round(figH * 1.03);
    const figX = Math.round(w * (compact ? 0.02 : 0.055));
    // Clear the score and round panels in the top-left corner.
    const figY = Math.round(Math.max(h * (compact ? 0.2 : 0.26), minTop));

    ctx.save();
    ctx.globalAlpha = alpha;
    // Materialise: she resolves upward out of the projector over the fade-in.
    const rise = t < 0.45 ? (1 - t / 0.45) * figH * 0.08 : 0;
    const drawn = drawSvgModelAt(ctx, "aria", figX, figY + rise, figW, figH, t);
    ctx.restore();

    // If the bitmaps have not decoded yet, fall back rather than show nothing.
    if (!drawn) {
      if (isRealisticArt()) this._renderRealProminent(ctx, w, h, msg, t, dur, agentName, minTop);
      else this._renderModernProminent(ctx, w, h, msg, t, dur, agentName, minTop);
      return;
    }

    // Caption sits beside her, not over her.
    const speaker = msg.speaker || "ARIA";
    const color = speakerTone(speaker);
    const boxW = Math.min(440, Math.max(240, w - figX - figW - 40));
    const x = Math.round(figX + figW + 16);
    if (isRealisticArt()) {
      // She is standing right there: the plate carries no portrait.
      const font = skin.uiFont(compact ? 13 : 14, 600);
      const lineH = compact ? 17 : 19;
      const lines = this._modernLines(ctx, msg, agentName, font, boxW - 32);
      const boxH = realBoxH(lines.length, 0, lineH);
      ctx.save();
      ctx.globalAlpha = alpha;
      this._drawRealCard(ctx, x, Math.round(figY + figH * 0.32), boxW, boxH, 0, lines, font, lineH, msg, t);
      ctx.restore();
      return;
    }
    const font = uiFont(compact ? 13 : 15, 600);
    const lineH = compact ? 17 : 19;
    const lines = this._modernLines(ctx, msg, agentName, font, boxW - 58);
    const boxH = 26 + lines.length * lineH + 10;
    const y = Math.round(figY + figH * 0.32);

    ctx.save();
    ctx.globalAlpha = alpha;
    const dpr = pixelRatio(ctx);
    const card = captionCardSprite(boxW, boxH, color, dpr);
    ctx.drawImage(card, x - CARD_PAD, y - CARD_PAD, boxW + CARD_PAD * 2, boxH + CARD_PAD * 2);

    const tab = speakerTabSprite(speaker, color, 11, dpr);
    ctx.drawImage(tab.c, x + 14 - 3, y - 11 - 3, tab.w + 6, tab.h + 6);
    drawVoiceBars(ctx, x + 14 + tab.w + 8, y - 11 + tab.h / 2, t, color, this._speaking(msg, t) ? 1 : 0.15);

    // The caption card reserves a well for a portrait on its left. She is
    // standing right there, so fill it with the link state instead and start
    // the text clear of it.
    const wellW = 34;
    drawVoiceBars(ctx, x + 12, y + boxH / 2, t, color, this._speaking(msg, t) ? 1 : 0.2);

    ctx.font = font;
    const textY = y + Math.round((boxH - lines.length * lineH) / 2 + lineH * 0.74) + 1;
    this._drawTyped(ctx, msg, lines, x + wellW + 8, textY, lineH, t, UI.captionInk, UI.ink);
    ctx.restore();
  }

  _renderModernSubtle(ctx, w, h, msg, t, dur, agentName, isTouchDevice) {
    let slideX = 0;
    if (t < 0.3) slideX = (1 - t / 0.3) * -360;
    else if (t > dur - 0.4) slideX = ((t - (dur - 0.4)) / 0.4) * -360;
    let alpha = 1;
    if (t < 0.3) alpha = t / 0.3;
    else if (t > dur - 0.4) alpha = 1 - (t - (dur - 0.4)) / 0.4;

    const compact = isTouchDevice && isCompactPhone(h);
    const boxW = compact ? Math.min(360, w - 32) : 360;
    const port = 40;
    const tx = 12 + port + 12;
    const font = uiFont(13, 600);
    const lineH = 16;
    const lines = this._modernLines(ctx, msg, agentName, font, boxW - tx - 14);
    const boxH = Math.max(port + 18, 22 + lines.length * lineH + 8);
    const bx = Math.round((w - boxW) / 2 + slideX);
    const by = this._modernSubtleBottom(h, compact) - boxH;

    const speaker = msg.speaker || "ARIA";
    const color = speakerTone(speaker);

    ctx.save();
    ctx.globalAlpha = alpha;
    drawPanel(ctx, bx, by, boxW, boxH, { variant: "hud", accent: color, bar: true, chamfer: 10 });
    const dpr = pixelRatio(ctx);
    const py = by + Math.round((boxH - port) / 2);
    ctx.drawImage(portraitSprite(speaker, color, port, dpr), bx + 12 - 2, py - 2, port + 4, port + 4);
    this._drawPortraitLive(ctx, speaker, bx + 12, py, port, t);

    const tab = speakerTabSprite(speaker, color, 10, dpr);
    ctx.drawImage(tab.c, bx + tx - 3, by - 9 - 3, tab.w + 6, tab.h + 6);
    drawVoiceBars(ctx, bx + tx + tab.w + 7, by - 9 + tab.h / 2, t, color, this._speaking(msg, t) ? 0.8 : 0.15);

    ctx.font = font;
    const textY = by + Math.round((boxH - lines.length * lineH) / 2 + lineH * 0.74) + 3;
    this._drawTyped(ctx, msg, lines, bx + tx, textY, lineH, t, UI.text, color);
    ctx.restore();
  }

  /** Per-frame life on the cached portrait: ARIA's eyes pulse. */
  _drawPortraitLive(ctx, speaker, px, py, size, t) {
    if (speaker !== "ARIA") return;
    const u = size / 40;
    const cx = px + size / 2;
    const cy = py + size * 0.47;
    const a = ctx.globalAlpha;
    ctx.globalAlpha = a * (0.55 + 0.45 * Math.sin(t * 3));
    ctx.fillStyle = "#b8fbff";
    ctx.fillRect(cx - 5.4 * u, cy - 3.6 * u, 3.2 * u, 1.5 * u);
    ctx.fillRect(cx + 2.2 * u, cy - 3.6 * u, 3.2 * u, 1.5 * u);
    ctx.globalAlpha = a;
  }

  // ─── Realistic comms plate ───────────────────────────────────────────────
  // Same anchors, fades, slides and typewriter as the Modern captions; only
  // the chrome changes: a translucent HUD-skin plate, tracked speaker label
  // with an accent tick, a signal meter in place of the comic tab, and the
  // portrait desaturated behind a hairline frame.

  _renderRealProminent(ctx, w, h, msg, t, dur, agentName, minTop = 0) {
    let alpha = 1;
    if (t < 0.3) alpha = t / 0.3;
    else if (t > dur - 0.5) alpha = 1 - (t - (dur - 0.5)) / 0.5;
    const k = Math.min(1, t / 0.3);
    const slideY = t < 0.3 ? -18 * (1 - k) * (1 - k) + Math.sin(k * Math.PI) * 3 : 0;

    const boxW = Math.min(460, w - 24);
    const x = Math.round((w - boxW) / 2);
    const y = Math.round(Math.max(h * 0.135, minTop ? minTop + 12 : 0) + slideY);
    const port = 48;
    const font = skin.uiFont(15, 600);
    const lineH = 19;
    const lines = this._modernLines(ctx, msg, agentName, font, boxW - realTextX(port) - 16);
    const boxH = realBoxH(lines.length, port, lineH);

    ctx.save();
    ctx.globalAlpha = alpha;
    this._drawRealCard(ctx, x, y, boxW, boxH, port, lines, font, lineH, msg, t);
    ctx.restore();
  }

  _renderRealSubtle(ctx, w, h, msg, t, dur, agentName, isTouchDevice) {
    let slideX = 0;
    if (t < 0.3) slideX = (1 - t / 0.3) * -360;
    else if (t > dur - 0.4) slideX = ((t - (dur - 0.4)) / 0.4) * -360;
    let alpha = 1;
    if (t < 0.3) alpha = t / 0.3;
    else if (t > dur - 0.4) alpha = 1 - (t - (dur - 0.4)) / 0.4;

    const compact = isTouchDevice && isCompactPhone(h);
    const boxW = compact ? Math.min(360, w - 32) : 360;
    const port = 38;
    const font = skin.uiFont(13, 600);
    const lineH = 16;
    const lines = this._modernLines(ctx, msg, agentName, font, boxW - realTextX(port) - 14);
    const boxH = realBoxH(lines.length, port, lineH);
    const bx = Math.round((w - boxW) / 2 + slideX);
    const by = this._modernSubtleBottom(h, compact) - boxH;

    ctx.save();
    ctx.globalAlpha = alpha;
    this._drawRealCard(ctx, bx, by, boxW, boxH, port, lines, font, lineH, msg, t);
    ctx.restore();
  }

  /** Plate, portrait (when `port` > 0), speaker header and typed text. */
  _drawRealCard(ctx, x, y, boxW, boxH, port, lines, font, lineH, msg, t) {
    const speaker = msg.speaker || "ARIA";
    const tone = realTone(speaker);
    const dpr = pixelRatio(ctx);
    skin.drawPanel(ctx, x, y, boxW, boxH, { accent: tone, variant: "raised" });

    if (port > 0) {
      const px = x + REAL_PAD;
      const py = y + Math.round((boxH - port) / 2);
      ctx.drawImage(realPortraitSprite(speaker, tone, port, dpr), px - 2, py - 2, port + 4, port + 4);
      if (speaker === "ARIA") {
        // Her eyes still breathe, in the plate's neutral light.
        const u = port / 40;
        const cx = px + port / 2;
        const cy = py + port * 0.47;
        const a = ctx.globalAlpha;
        ctx.globalAlpha = a * (0.3 + 0.25 * Math.sin(t * 3));
        ctx.fillStyle = "#dcebec";
        ctx.fillRect(cx - 5.4 * u, cy - 3.6 * u, 3.2 * u, 1.5 * u);
        ctx.fillRect(cx + 2.2 * u, cy - 3.6 * u, 3.2 * u, 1.5 * u);
        ctx.globalAlpha = a;
      }
    }

    const tx = x + realTextX(port);
    const label = realLabelSprite(speaker, tone, dpr);
    const headY = y + REAL_HEAD_Y;
    ctx.drawImage(label.c, tx - 2, headY - label.h / 2 - 2, label.w + 4, label.h + 4);
    drawSignal(ctx, tx + label.w + 7, headY + 4, t, tone, this._speaking(msg, t));
    // Hairline under the header, fading toward the right edge.
    ctx.drawImage(realRuleSprite(dpr), tx, headY + 8, x + boxW - 14 - tx, 1);

    ctx.font = font;
    const textY = y + REAL_HEAD_H + Math.round(lineH * 0.74) + Math.max(0, Math.round((boxH - REAL_HEAD_H - 8 - lines.length * lineH) / 2));
    this._drawTyped(ctx, msg, lines, tx, textY, lineH, t, skin.HT.text, skin.HT.accent);
  }

  _renderModernLog(ctx, w, h, characterName) {
    const panelW = Math.min(580, w - 32);
    const panelH = Math.min(430, h - 40);
    const panelX = Math.round((w - panelW) / 2);
    const panelY = Math.round((h - panelH) / 2);
    const compact = panelH < 340;
    // Realistic swaps in the HUD skin's plate, title and palette.
    const real = isRealisticArt();
    const C = real ? skin.HT : UI;
    const panel = real ? skin.drawPanel : drawPanel;
    const font$ = real ? skin.uiFont : uiFont;

    panel(ctx, panelX, panelY, panelW, panelH, { variant: "menu", accent: C.cyan, chamfer: 18 });
    const titleSize = compact ? 20 : 26;
    const titleBase = panelY + (compact ? 34 : 44);
    (real ? skin.drawTitle : drawTitle)(ctx, "ARIA COMMS LOG", w / 2, titleBase, titleSize, C.cyan);

    const footH = compact ? 30 : 38;
    const listX = panelX + 16;
    const listY = titleBase + (compact ? 16 : 22);
    const listW = panelW - 32;
    const listH = panelY + panelH - footH - listY;
    panel(ctx, listX, listY, listW, listH, { variant: "well", chamfer: 8 });

    const log = this.messageLog;
    const lineH = compact ? 22 : 25;
    const maxLines = Math.max(1, Math.floor((listH - 12) / lineH));
    const startIdx = Math.max(0, log.length - maxLines - this.logScroll);
    const endIdx = Math.min(log.length, startIdx + maxLines);
    const scrollable = log.length > maxLines;

    if (log.length === 0) {
      (real ? skin.drawCaption : drawCaption)(ctx, w / 2, listY + listH / 2 - 10, "No messages yet", { size: 11, scheme: "steel", align: "center" });
    } else {
      const agent = characterName || "Agent";
      const textX = listX + 48;
      const textMaxW = listW - 48 - (scrollable ? 22 : 12);
      const font = font$(13, 600);
      ctx.textBaseline = "middle";
      for (let i = startIdx; i < endIdx; i++) {
        const row = i - startIdx;
        const ry = listY + 6 + row * lineH;
        const mid = ry + lineH / 2;
        if (row % 2 === 1) {
          ctx.fillStyle = "rgba(130,160,188,0.05)";
          ctx.fillRect(listX + 4, ry, listW - 8, lineH);
        }
        const newest = i === log.length - 1;
        if (newest) {
          ctx.fillStyle = C.cyan;
          ctx.fillRect(listX + 5, ry + 4, real ? 1 : 3, lineH - 8);
        }
        ctx.font = font$(11, 700, true);
        ctx.textAlign = "right";
        ctx.fillStyle = newest ? C.cyan : C.textFaint;
        ctx.fillText(String(i + 1).padStart(2, "0"), listX + 36, mid + 1);
        ctx.font = font;
        ctx.textAlign = "left";
        ctx.fillStyle = real ? (newest ? C.text : C.textDim) : newest ? "#ffffff" : "#c3d2df";
        ctx.fillText(truncateTo(ctx, font, log[i].replace(/\{AGENT\}/g, agent), textMaxW), textX, mid + 1);
      }
      ctx.textBaseline = "alphabetic";
    }

    if (scrollable) {
      const trackX = listX + listW - 12;
      const trackY = listY + 8;
      const trackH = listH - 16;
      ctx.fillStyle = real ? C.track : "rgba(4,6,11,0.9)";
      ctx.fillRect(trackX, trackY, real ? 2 : 4, trackH);
      const thumbH = Math.max(18, (trackH * maxLines) / log.length);
      const range = log.length - maxLines;
      const pos = range > 0 ? 1 - Math.min(this.logScroll, range) / range : 1;
      ctx.fillStyle = C.cyan;
      ctx.fillRect(trackX, Math.round(trackY + (trackH - thumbH) * pos), real ? 2 : 4, Math.round(thumbH));
    }

    // Footer key hints inside the plate.
    const fy = panelY + panelH - footH / 2 - 10;
    const hints = [["L", "to close"], ["ESC", "to resume"]];
    if (scrollable) hints.push(["W/S", "to scroll"]);
    ctx.font = font$(11, 700);
    let total = 0;
    const parts = hints.map(([key, text]) => {
      const keys = key.split("/");
      const kw = keys.reduce((n, k) => n + keycapWidth(k, 10), 0) + (keys.length - 1) * 4;
      const tw = ctx.measureText(text.toUpperCase()).width + 1;
      total += kw + 6 + tw;
      return { keys, kw, text: text.toUpperCase(), tw };
    });
    total += (parts.length - 1) * 22;
    let hx = Math.round(w / 2 - total / 2);
    for (const p of parts) {
      for (let i = 0; i < p.keys.length; i++) {
        hx += (real ? realKeycap : drawKeycap)(ctx, hx, fy, p.keys[i], { size: 10 }) + (i < p.keys.length - 1 ? 4 : 0);
      }
      ctx.fillStyle = C.textDim;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.letterSpacing = "1px";
      ctx.fillText(p.text, hx + 6, fy + 9);
      ctx.letterSpacing = "0px";
      ctx.textBaseline = "alphabetic";
      hx += 6 + p.tw + 22;
    }
    ctx.textAlign = "left";
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

// ─── Modern comms art (cached sprites; per frame only blits + text) ─────────

const TYPE_RATE = 60; // typewriter chars per second
const CARD_PAD = 6;

/** Speaker tab colour: ARIA cyan, squad members per SQUAD_TAB_COLORS. */
function speakerTone(speaker) {
  if (!speaker || speaker === "ARIA") return UI.cyan;
  return SQUAD_TAB_COLORS[speaker] || UI.cream;
}

const _commsSprites = new Map();
const MAX_COMMS_SPRITES = 64;

function commsSprite(key, w, h, pad, dpr, paint) {
  const k = `${key}|${w}|${h}|${dpr}`;
  let c = _commsSprites.get(k);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil((w + pad * 2) * dpr));
  c.height = Math.max(1, Math.ceil((h + pad * 2) * dpr));
  const g = c.getContext("2d");
  g.scale(dpr, dpr);
  g.translate(pad, pad);
  paint(g, w, h);
  if (_commsSprites.size >= MAX_COMMS_SPRITES) _commsSprites.delete(_commsSprites.keys().next().value);
  _commsSprites.set(k, c);
  return c;
}

function cutPath(g, x, y, w, h, k) {
  g.beginPath();
  g.moveTo(x + k, y);
  g.lineTo(x + w, y);
  g.lineTo(x + w, y + h - k);
  g.lineTo(x + w - k, y + h);
  g.lineTo(x, y + h);
  g.lineTo(x, y + k);
  g.closePath();
}

/** Off-white comic caption card with ink outline, hard shadow and halftone. */
function captionCardSprite(w, h, color, dpr) {
  return commsSprite(`card:${color}`, w, h, CARD_PAD, dpr, (g, sw, sh) => {
    const k = 12;
    g.fillStyle = "rgba(4,6,11,0.82)";
    cutPath(g, 4, 4, sw, sh, k);
    g.fill();
    g.fillStyle = UI.ink;
    cutPath(g, -1.5, -1.5, sw + 3, sh + 3, k + 1);
    g.fill();
    g.save();
    cutPath(g, 0.5, 0.5, sw - 1, sh - 1, k - 0.5);
    g.clip();
    const grad = g.createLinearGradient(0, 0, 0, sh);
    grad.addColorStop(0, "#f8f0da");
    grad.addColorStop(1, "#e0d0a6");
    g.fillStyle = grad;
    g.fillRect(0, 0, sw, sh);
    // Halftone shading toward the lower right (key light is upper-left).
    const step = 5;
    for (let yy = 2; yy < sh; yy += step) {
      for (let xx = sw * 0.45; xx < sw; xx += step) {
        const f = ((xx - sw * 0.45) / (sw * 0.55)) * (yy / sh);
        if (f < 0.12) continue;
        g.fillStyle = `rgba(60,40,16,${(0.13 * f).toFixed(3)})`;
        g.beginPath();
        g.arc(xx + ((yy / step) % 2) * 2.5, yy, 1.35 * f, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.fillStyle = "rgba(255,255,255,0.6)";
    g.fillRect(k, 1.5, sw, 1);
    // Speaker-colour underline flourish along the bottom edge.
    g.fillStyle = UI.ink;
    g.fillRect(sw * 0.58 - 2, sh - 6, sw * 0.42 - 12, 5);
    g.fillStyle = color;
    g.fillRect(sw * 0.58, sh - 5, sw * 0.42 - 16, 3);
    g.restore();
    // Ink drop behind the portrait well.
    const port = 50;
    const py = Math.round((sh - port) / 2);
    g.fillStyle = "rgba(4,6,11,0.55)";
    g.fillRect(14 + 3, py + 3, port, port);
  });
}

function measureLabel(font, text, spacing) {
  const m = _measureCtx();
  m.font = font;
  if ("letterSpacing" in m) m.letterSpacing = `${spacing}px`;
  const tw = m.measureText(text).width;
  if ("letterSpacing" in m) m.letterSpacing = "0px";
  return tw;
}

let _mctx = null;
function _measureCtx() {
  if (!_mctx) _mctx = document.createElement("canvas").getContext("2d");
  return _mctx;
}

/** Slanted speaker tab ("ARIA", "KAEL" …) in the speaker's colour. */
function speakerTabSprite(label, color, size, dpr) {
  const font = uiFont(size, 800);
  const spacing = Math.round(size * 0.14 * 10) / 10;
  const text = String(label).toUpperCase();
  const slant = Math.round(size * 0.7);
  const w = Math.ceil(measureLabel(font, text, spacing)) + Math.round(size * 1.1) + slant;
  const h = Math.round(size * 1.75);
  const c = commsSprite(`tab:${text}:${color}:${size}`, w, h, 3, dpr, (g, sw, sh) => {
    const path = (ox, oy, grow) => {
      g.beginPath();
      g.moveTo(ox - grow, oy - grow);
      g.lineTo(ox + sw + grow, oy - grow);
      g.lineTo(ox + sw - slant + grow, oy + sh + grow);
      g.lineTo(ox - grow, oy + sh + grow);
      g.closePath();
    };
    g.fillStyle = "rgba(4,6,11,0.85)";
    path(2, 2, 0);
    g.fill();
    g.fillStyle = UI.ink;
    path(0, 0, 1.25);
    g.fill();
    g.fillStyle = color;
    path(0, 0, -0.25);
    g.fill();
    const shade = g.createLinearGradient(0, 0, 0, sh);
    shade.addColorStop(0, "rgba(255,255,255,0.38)");
    shade.addColorStop(0.5, "rgba(255,255,255,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.28)");
    g.fillStyle = shade;
    path(0, 0, -0.25);
    g.fill();
    g.font = font;
    if ("letterSpacing" in g) g.letterSpacing = `${spacing}px`;
    g.fillStyle = UI.ink;
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.fillText(text, Math.round(size * 0.55), sh / 2 + size * 0.06);
  });
  return { c, w, h };
}

/** Tiny live "voice" meter beside the speaker tab. */
function drawVoiceBars(ctx, x, midY, t, color, amp) {
  for (let i = 0; i < 5; i++) {
    const v = amp * Math.abs(Math.sin(t * 9 + i * 1.7) * Math.cos(t * 4.3 + i));
    const bh = Math.round(2 + v * 8);
    const bx = Math.round(x + i * 4);
    const by = Math.round(midY - bh / 2);
    ctx.fillStyle = UI.ink;
    ctx.fillRect(bx - 1, by - 1, 4, bh + 2);
    ctx.fillStyle = color;
    ctx.fillRect(bx, by, 2, bh);
  }
}

/**
 * Inked portrait glyph: ARIA (bob, headset, cyan eyes) or a squad helmet with
 * a visor in the member's colour. 3-tone shading, key light upper-left, rim
 * light in the speaker colour on the right. Drawn in a 40-unit box.
 */
function portraitSprite(speaker, color, size, dpr) {
  const isAria = speaker === "ARIA";
  return commsSprite(`port:${isAria ? "ARIA" : "SQUAD"}:${color}`, size, size, 2, dpr, (g, s) => {
    const u = s / 40;
    const k = 6 * u;
    g.fillStyle = UI.ink;
    cutPath(g, -1.5, -1.5, s + 3, s + 3, k + 1);
    g.fill();
    g.save();
    cutPath(g, 0, 0, s, s, k);
    g.clip();
    const bg = g.createLinearGradient(0, 0, 0, s);
    bg.addColorStop(0, "#1a2c40");
    bg.addColorStop(1, "#060a11");
    g.fillStyle = bg;
    g.fillRect(0, 0, s, s);
    const glow = g.createRadialGradient(s * 0.62, s * 0.4, 0, s * 0.62, s * 0.4, s * 0.62);
    glow.addColorStop(0, hexA(color, 0.32));
    glow.addColorStop(1, hexA(color, 0));
    g.fillStyle = glow;
    g.fillRect(0, 0, s, s);

    g.scale(u, u);
    g.lineJoin = "round";
    g.lineCap = "round";
    const ink = () => {
      g.lineWidth = 1.1;
      g.strokeStyle = UI.ink;
      g.stroke();
    };

    // Shoulders / suit. ARIA's frame is slimmer than the squad's, matching the
    // hologram in src/rendering/svg-art/models/cast.js.
    g.beginPath();
    if (isAria) {
      g.moveTo(6, 41);
      g.lineTo(8.5, 33.5);
      g.quadraticCurveTo(11, 30, 16, 29);
      g.lineTo(24, 29);
      g.quadraticCurveTo(29, 30, 31.5, 33.5);
      g.lineTo(34, 41);
    } else {
      g.moveTo(3, 41);
      g.lineTo(6, 33);
      g.quadraticCurveTo(9, 29.5, 15, 28.5);
      g.lineTo(25, 28.5);
      g.quadraticCurveTo(31, 29.5, 34, 33);
      g.lineTo(37, 41);
    }
    g.closePath();
    const suit = g.createLinearGradient(6, 28, 30, 41);
    suit.addColorStop(0, "#4a6680");
    suit.addColorStop(0.45, "#26394b");
    suit.addColorStop(1, "#0e1722");
    g.fillStyle = suit;
    g.fill();
    ink();

    if (isAria) {
      // Neck.
      g.beginPath();
      g.moveTo(16.5, 22);
      g.lineTo(23.5, 22);
      g.lineTo(23, 29);
      g.lineTo(17, 29);
      g.closePath();
      g.fillStyle = "#8fa9ba";
      g.fill();
      ink();
      // High collar V in the speaker colour.
      g.beginPath();
      g.moveTo(13.5, 29);
      g.lineTo(20, 34.5);
      g.lineTo(26.5, 29);
      g.strokeStyle = UI.ink;
      g.lineWidth = 2.4;
      g.stroke();
      g.strokeStyle = color;
      g.lineWidth = 1.1;
      g.stroke();
      // Face: base, shadow side, AO under the jaw.
      g.beginPath();
      g.ellipse(20, 16.5, 7, 8.8, 0, 0, Math.PI * 2);
      g.fillStyle = "#cdf6ff";
      g.fill();
      g.save();
      g.clip();
      g.fillStyle = "#62cce4";
      g.beginPath();
      g.ellipse(24.5, 18.5, 6, 10, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#2f88a6";
      g.fillRect(12, 23.2, 16, 3);
      g.restore();
      g.beginPath();
      g.ellipse(20, 16.5, 7, 8.8, 0, 0, Math.PI * 2);
      ink();
      // Eye sockets (live glow drawn on top per frame) + mouth.
      g.fillStyle = "#2a3a4a";
      g.fillRect(14.3, 14.9, 3.8, 2.1);
      g.fillRect(21.9, 14.9, 3.8, 2.1);
      g.strokeStyle = "rgba(60,80,96,0.8)";
      g.lineWidth = 0.7;
      g.beginPath();
      g.moveTo(18.2, 21.3);
      g.quadraticCurveTo(20, 22.2, 21.8, 21.2);
      g.stroke();
      // Asymmetric bob with a sweeping fringe.
      g.beginPath();
      g.moveTo(11.2, 23.5);
      g.quadraticCurveTo(9.2, 12, 13.5, 8.2);
      g.quadraticCurveTo(20, 4.2, 26.5, 8);
      g.quadraticCurveTo(29.6, 11.5, 28.4, 18.5);
      g.lineTo(26.6, 13.2);
      g.quadraticCurveTo(21, 12.4, 16.5, 10.8);
      g.quadraticCurveTo(13.8, 14.5, 13.8, 23.5);
      g.closePath();
      const hair = g.createLinearGradient(10, 5, 28, 22);
      hair.addColorStop(0, "#3a4a63");
      hair.addColorStop(0.5, "#1b2435");
      hair.addColorStop(1, "#0b111b");
      g.fillStyle = hair;
      g.fill();
      ink();
      g.beginPath();
      g.moveTo(15.2, 8.6);
      g.quadraticCurveTo(11.4, 13, 12, 21.5);
      g.strokeStyle = color;
      g.lineWidth = 1.2;
      g.stroke();
      // Earpiece and temple lead — no headset band, matching the model.
      g.beginPath();
      g.ellipse(28.2, 17.5, 1.6, 3.2, 0.15, 0, Math.PI * 2);
      g.fillStyle = "#2e4255";
      g.fill();
      ink();
      g.beginPath();
      g.moveTo(28, 20.5);
      g.quadraticCurveTo(27, 24.5, 22.8, 24.6);
      g.strokeStyle = "#6f8aa3";
      g.lineWidth = 0.9;
      g.stroke();
      g.beginPath();
      g.arc(22.6, 24.6, 1.1, 0, Math.PI * 2);
      g.fillStyle = color;
      g.fill();
      // Feed scanlines across the whole tile.
      g.globalAlpha = 0.18;
      g.fillStyle = "#bfffff";
      for (let yy = 1; yy < 40; yy += 2.6) g.fillRect(0, yy, 40, 0.7);
      g.globalAlpha = 1;
    } else {
      // Pauldrons.
      for (const sx of [1, -1]) {
        g.beginPath();
        g.ellipse(20 + sx * 12, 31.5, 6.5, 3.8, sx * 0.35, 0, Math.PI * 2);
        g.fillStyle = sx > 0 ? "#1d2b39" : "#3b5268";
        g.fill();
        ink();
      }
      // Helmet dome.
      g.beginPath();
      g.moveTo(11, 21);
      g.quadraticCurveTo(10, 6.5, 20, 6);
      g.quadraticCurveTo(30, 6.5, 29, 21);
      g.lineTo(26.5, 27.5);
      g.lineTo(13.5, 27.5);
      g.closePath();
      const helm = g.createLinearGradient(11, 6, 29, 27);
      helm.addColorStop(0, "#7d97ad");
      helm.addColorStop(0.45, "#3e556a");
      helm.addColorStop(1, "#16212c");
      g.fillStyle = helm;
      g.fill();
      ink();
      // Crest stripe.
      g.fillStyle = color;
      g.fillRect(19, 6.8, 2, 5.5);
      // Visor.
      g.beginPath();
      g.moveTo(12.2, 14);
      g.lineTo(27.8, 14);
      g.lineTo(26.8, 19.6);
      g.lineTo(20, 21.2);
      g.lineTo(13.2, 19.6);
      g.closePath();
      g.fillStyle = color;
      g.fill();
      const vis = g.createLinearGradient(0, 14, 0, 21);
      vis.addColorStop(0, "rgba(255,255,255,0.55)");
      vis.addColorStop(0.35, "rgba(255,255,255,0)");
      vis.addColorStop(1, "rgba(0,0,0,0.35)");
      g.fillStyle = vis;
      g.fill();
      ink();
      // Chin guard vents.
      g.strokeStyle = "rgba(4,6,11,0.8)";
      g.lineWidth = 0.8;
      for (const vx of [17.5, 20, 22.5]) {
        g.beginPath();
        g.moveTo(vx, 23);
        g.lineTo(vx, 26);
        g.stroke();
      }
    }

    // Rim light on the right, in the speaker colour.
    g.beginPath();
    g.arc(20, 16.5, isAria ? 9.6 : 10.6, -0.9, 0.7);
    g.strokeStyle = hexA(color, 0.75);
    g.lineWidth = 0.9;
    g.stroke();

    g.setTransform(dpr, 0, 0, dpr, 2 * dpr, 2 * dpr);
    // Faint scanlines + inner hairline.
    g.fillStyle = "rgba(0,0,0,0.12)";
    for (let yy = 0; yy < s; yy += 2) g.fillRect(0, yy, s, 1);
    g.restore();
    g.strokeStyle = hexA(color, 0.55);
    g.lineWidth = 1;
    cutPath(g, 1.5, 1.5, s - 3, s - 3, k - 1);
    g.stroke();
  });
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const _truncCache = new Map();
/** Ellipsised text that fits maxW, cached (log rows repeat every frame). */
function truncateTo(ctx, font, text, maxW) {
  const key = `${font}|${maxW}|${text}`;
  let out = _truncCache.get(key);
  if (out !== undefined) return out;
  ctx.font = font;
  out = text;
  if (ctx.measureText(out).width > maxW) {
    while (out.length > 3 && ctx.measureText(out + "...").width > maxW) out = out.slice(0, -1);
    out = out.trimEnd() + "...";
  }
  if (_truncCache.size > 200) _truncCache.clear();
  _truncCache.set(key, out);
  return out;
}

/** Width drawKeycap will use for a legend (for centring rows of hints). */
function keycapWidth(text, size) {
  const tw = Math.ceil(measureLabel(uiFont(size, 700), String(text), 0.5));
  return Math.max(Math.round(size * 1.9), tw + Math.round(size * 1.1));
}

// ─── Realistic comms art (cached sprites; per frame only blits + text) ──────

const REAL_PAD = 12;
const REAL_HEAD_Y = 15; // header label centre, from the plate top
const REAL_HEAD_H = 24; // header band height; body text starts below it

const realTextX = (port) => (port > 0 ? REAL_PAD + port + 12 : 16);
const realBoxH = (n, port, lineH) => Math.max(port + REAL_PAD * 2 - 4, REAL_HEAD_H + n * lineH + 10);

const _realTones = new Map();
/**
 * Speaker tone for Realistic: ARIA takes the skin accent, squad colours are
 * pulled halfway to their own grey so a name still reads without shouting.
 */
function realTone(speaker) {
  if (!speaker || speaker === "ARIA") return skin.HT.accent;
  let tone = _realTones.get(speaker);
  if (!tone) {
    const n = parseInt((SQUAD_TAB_COLORS[speaker] || "#e8dcc0").slice(1), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    const l = 0.3 * r + 0.59 * g + 0.11 * b;
    const mix = (c) => Math.round((c + (l - c) * 0.5) * 0.86 + 20);
    tone = `rgb(${mix(r)},${mix(g)},${mix(b)})`;
    _realTones.set(speaker, tone);
  }
  return tone;
}

/** Accent tick plus the speaker's name in small tracked caps. */
function realLabelSprite(speaker, tone, dpr) {
  const size = 10;
  const text = String(speaker || "ARIA").toUpperCase();
  const font = skin.uiFont(size, 700);
  const spacing = Math.round(size * 0.22 * 10) / 10;
  const w = 7 + Math.ceil(measureLabel(font, text, spacing));
  const h = 12;
  const c = commsSprite(`rlabel:${text}:${tone}`, w, h, 2, dpr, (g, sw, sh) => {
    g.fillStyle = tone;
    g.fillRect(0, 1, 1, sh - 2);
    g.font = font;
    if ("letterSpacing" in g) g.letterSpacing = `${spacing}px`;
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.fillStyle = tone;
    g.fillText(text, 7, sh / 2 + 0.5);
  });
  return { c, w, h };
}

/** 1px header rule that fades out to the right (stretched per plate). */
function realRuleSprite(dpr) {
  return commsSprite("rrule", 64, 1, 0, dpr, (g, sw) => {
    const grad = g.createLinearGradient(0, 0, sw, 0);
    grad.addColorStop(0, "rgba(226,232,230,0.16)");
    grad.addColorStop(1, "rgba(226,232,230,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, sw, 1);
  });
}

/**
 * Signal meter beside the speaker label: four stepped 1px bars. While the
 * line is still typing the link "transmits" (the top bars flicker); once it
 * has landed the meter settles to a steady, dim reading.
 */
function drawSignal(ctx, x, baseY, t, tone, live) {
  const a = ctx.globalAlpha;
  ctx.fillStyle = tone;
  const lit = live ? 2 + ((Math.sin(t * 11) + Math.sin(t * 7.3 + 1)) > 0.2 ? 2 : 1) : 4;
  for (let i = 0; i < 4; i++) {
    const bh = 2 + i * 2;
    ctx.globalAlpha = a * (i < lit ? (live ? 0.85 : 0.45) : 0.18);
    ctx.fillRect(Math.round(x + i * 3), Math.round(baseY - bh), 1, bh);
  }
  ctx.globalAlpha = a;
}

/**
 * The Modern portrait glyph, graded down to near-monochrome, lit from the
 * upper left and seated behind a hairline frame instead of the ink bezel.
 */
function realPortraitSprite(speaker, tone, size, dpr) {
  const isAria = speaker === "ARIA";
  return commsSprite(`rport:${isAria ? "ARIA" : "SQUAD"}:${tone}`, size, size, 2, dpr, (g, s) => {
    const src = portraitSprite(speaker, tone, size, dpr);
    const k = 6 * (s / 40);
    g.save();
    cutPath(g, 1, 1, s - 2, s - 2, k - 1);
    g.clip();
    g.fillStyle = "#0b0e11";
    g.fillRect(0, 0, s, s);
    g.filter = "saturate(0.3) brightness(0.9)";
    g.drawImage(src, -2, -2, s + 4, s + 4);
    g.filter = "none";
    const key = g.createLinearGradient(0, 0, s, s);
    key.addColorStop(0, "rgba(255,244,230,0.1)");
    key.addColorStop(0.5, "rgba(0,0,0,0)");
    key.addColorStop(1, "rgba(0,0,0,0.4)");
    g.fillStyle = key;
    g.fillRect(0, 0, s, s);
    g.restore();
    g.strokeStyle = "rgba(222,230,228,0.34)";
    g.lineWidth = 1;
    cutPath(g, 0.5, 0.5, s - 1, s - 1, k - 0.5);
    g.stroke();
  });
}

/** Hairline keycap for the Realistic log footer; same width as drawKeycap. */
function realKeycap(ctx, x, y, text, opts = {}) {
  const size = Math.round(opts.size || 11);
  const w = keycapWidth(text, size);
  const h = Math.round(size * 1.9);
  const bx = Math.round(x);
  const by = Math.round(y);
  ctx.fillStyle = "rgba(10,14,17,0.5)";
  ctx.fillRect(bx, by, w, h);
  ctx.strokeStyle = "rgba(222,230,228,0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, h - 1);
  ctx.font = skin.uiFont(size, 700);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = skin.HT.text;
  ctx.fillText(String(text), bx + w / 2, by + h / 2);
  ctx.textBaseline = "alphabetic";
  return w;
}
