// Tutorial UI — overlay, completion menu rendering.
//
// All rendering is purely a function of state passed in; no globals besides
// performance.now(). Shared backdrop / menu helpers are private to this file.

import { tutorialMenuLayout } from "../../js/layout.js";
import { drawScanlines } from "./scanlines.js";
import { isModernArt } from "../rendering/art-style.js";
import {
  UI,
  uiFont,
  drawPanel,
  drawBrackets,
  drawCaption,
  drawKeycap,
  drawTitle,
  drawBackdrop,
  inkText,
} from "./modern-ui-kit.js";

// ─── Tunable design tokens (single source of truth for tutorial UI) ───
const ACCENT = "#00ffcc";
const BACKDROP_FILL = "rgba(0, 5, 15, 0.7)";
const PANEL_FILL = "rgba(0, 5, 15, 0.75)";
const PANEL_BORDER = "rgba(0, 255, 200, 0.12)";
const HINT_GREY = "rgba(170, 200, 220, 0.6)";
const FOOTER_GREY = "rgba(255,255,255,0.2)";
const RING_RGBA = (alpha) => `rgba(0, 255, 200, ${alpha})`;

// ─── Shared low-level helpers ───────────────────────────────────────────────

/** Animated grid + radial vignette + pulsing ring trio used by full-screen menus. */
function drawCinematicBackdrop(ctx, w, h, ringCenterY, now) {
  ctx.fillStyle = BACKDROP_FILL;
  ctx.fillRect(0, 0, w, h);

  // Drifting grid
  ctx.strokeStyle = "rgba(0,200,255,0.02)";
  ctx.lineWidth = 1;
  const gridSz = 48;
  const gridOff = (now * 0.008) % gridSz;
  ctx.beginPath();
  for (let gx = -gridOff; gx < w; gx += gridSz) { ctx.moveTo(gx, 0); ctx.lineTo(gx, h); }
  for (let gy = -gridOff; gy < h; gy += gridSz) { ctx.moveTo(0, gy); ctx.lineTo(w, gy); }
  ctx.stroke();

  // Ambient particles
  ctx.fillStyle = "rgba(0,255,200,0.1)";
  for (let i = 0; i < 20; i++) {
    const px = w * 0.5 + Math.sin(now * 0.00025 + i * 2.3) * w * 0.42;
    const py = h * 0.5 + Math.cos(now * 0.0003 + i * 1.9) * h * 0.42;
    const ps = 1 + Math.sin(now * 0.002 + i) * 0.5;
    ctx.beginPath();
    ctx.arc(px, py, ps, 0, Math.PI * 2);
    ctx.fill();
  }

  // Radial vignette
  const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.8);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,10,0.5)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // Pulsing rings
  const ringPulse = 0.5 + 0.5 * Math.sin(now * 0.002);
  ctx.save();
  ctx.translate(w / 2, ringCenterY);
  ctx.strokeStyle = RING_RGBA(0.08 + ringPulse * 0.06);
  ctx.lineWidth = 2;
  for (let ring = 0; ring < 3; ring++) {
    const radius = 50 + ring * 22 + Math.sin(now * 0.001 + ring) * 4;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Glowing title + subtitle + decorative underline. Returns titleY. */
function drawCinematicTitle(ctx, w, h, title, subtitle, now) {
  const titleY = h * 0.14;
  const titlePulse = 0.85 + 0.15 * Math.sin(now * 0.003);

  ctx.save();
  ctx.shadowColor = ACCENT;
  ctx.shadowBlur = 20 * titlePulse;
  ctx.fillStyle = ACCENT;
  ctx.font = "bold 36px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(title, w / 2, titleY);
  ctx.restore();

  if (subtitle) {
    ctx.fillStyle = HINT_GREY;
    ctx.font = "13px monospace";
    ctx.textAlign = "center";
    ctx.fillText(subtitle, w / 2, titleY + 24);
  }

  // Decorative underline
  ctx.strokeStyle = "rgba(0, 255, 200, 0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 100, titleY + 36);
  ctx.lineTo(w / 2 + 100, titleY + 36);
  ctx.stroke();

  return titleY;
}

/** Vertical menu list with selection highlight, accent bar, key hint. */
function drawCinematicMenu(ctx, w, h, items, selection, now) {
  const layout = tutorialMenuLayout(w, h, items.length);
  const { menuW, itemH, menuH, mx, my } = layout;

  // Container
  ctx.fillStyle = PANEL_FILL;
  ctx.beginPath();
  ctx.roundRect(mx - 10, my - 10, menuW + 20, menuH + 20, 12);
  ctx.fill();
  ctx.strokeStyle = PANEL_BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(mx - 10, my - 10, menuW + 20, menuH + 20, 12);
  ctx.stroke();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const iy = my + 8 + i * itemH;
    const isSelected = i === selection;

    if (isSelected) {
      const sPulse = 0.6 + 0.4 * Math.sin(now * 0.004);
      ctx.fillStyle = `rgba(0, 255, 200, ${0.06 * sPulse})`;
      ctx.beginPath();
      ctx.roundRect(mx, iy, menuW, itemH - 6, 6);
      ctx.fill();
      // Accent bar
      ctx.fillStyle = item.color;
      ctx.fillRect(mx, iy + 4, 3, itemH - 14);
      // Selection chevron
      ctx.fillStyle = ACCENT;
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "left";
      ctx.fillText("\u25B8", mx + 12, iy + 24);
    }

    // Label
    ctx.fillStyle = isSelected ? item.color : "rgba(255,255,255,0.45)";
    ctx.font = `${isSelected ? "bold " : ""}16px monospace`;
    ctx.textAlign = "left";
    ctx.fillText(item.label, mx + 32, iy + 24);

    // Description (selected only)
    if (item.desc && isSelected) {
      ctx.fillStyle = "rgba(170, 200, 220, 0.5)";
      ctx.font = "11px monospace";
      ctx.fillText(item.desc, mx + 32, iy + 40);
    }

    // Right-aligned key hint
    ctx.fillStyle = isSelected ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)";
    ctx.font = "11px monospace";
    ctx.textAlign = "right";
    ctx.fillText(item.key, mx + menuW - 8, iy + 24);
  }
  ctx.textAlign = "left";
}

/** Footer hint text centered at the bottom of the screen. */
function drawFooterHint(ctx, w, h, text) {
  ctx.fillStyle = FOOTER_GREY;
  ctx.font = "11px monospace";
  ctx.textAlign = "center";
  ctx.fillText(text, w / 2, h - 30);
  ctx.textAlign = "left";
}

// ─── Tutorial step content (single source of truth) ────────────────────────

/**
 * Step copy for in-game tutorial overlay (steps 1-17).
 * Step 0 is HUD boot animation, no copy. Step 18 is sandbox, no overlay.
 *
 * Copy chosen to feel like a movie: ARIA narrates, sometimes the supervisor
 * cuts in. Mobile alternatives respect touch verbs.
 */
export function tutorialStepCopy(isMobile) {
  return [
    null, // step 0 handled separately (HUD boot)
    {
      title: "SYSTEMS ONLINE — LOOK AROUND",
      hint: isMobile
        ? 'ARIA: "Morning, Cadet. Drag to look around. Get used to seeing the world through a weapon."'
        : 'ARIA: "Morning, Cadet. Move the mouse to look around. Get used to seeing the world through a weapon."',
      color: "#00ccff",
    },
    {
      title: "MOVE — TEST THE SUIT",
      hint: isMobile
        ? 'ARIA: "Use the stick to walk. Head for the door ahead. Try not to hit the frame."'
        : 'ARIA: "W A S D to walk. Head for the bulkhead ahead. Try not to hit the frame."',
      color: "#00ccff",
    },
    {
      title: "BREACH — OPEN THE DOOR",
      hint: isMobile
        ? 'ARIA: "Sealed bulkhead. Face it and tap USE. I\'ll crack the lock — you look confident."'
        : 'ARIA: "Sealed bulkhead. Face it and press E. I\'ll crack the lock — you look confident."',
      color: "#ff8844",
    },
    {
      title: "ARM YOURSELF",
      hint: 'ARIA: "Weapon crate ahead. Walk over it to pick it up. From here on, nothing\'s a drill."',
      color: "#ff6600",
    },
    {
      title: "CONFIRM TARGETING",
      hint: isMobile
        ? 'ARIA: "Tap FIRE. Let\'s confirm the dangerous end works."'
        : 'ARIA: "CLICK to fire. Let\'s confirm the dangerous end works."',
      color: "#ff8844",
    },
    {
      title: "AIM DOWN SIGHTS — FOCUS FIRE",
      hint: isMobile
        ? 'ARIA: "Hold AIM to aim down sights. Slower feet, tighter shots."'
        : 'ARIA: "Hold RIGHT MOUSE to aim down sights. Slower feet, tighter shots."',
      color: "#66eeff",
    },
    {
      title: "WEAPON SWITCH — GRAB THE SHOTGUN",
      hint: isMobile
        ? 'ARIA: "Shotgun on the range. Pick it up, then swipe to switch weapons. Right tool, right problem."'
        : 'ARIA: "Shotgun on the range. Pick it up, then scroll or press 1/2 to switch. Right tool, right problem."',
      color: "#ff6600",
    },
    {
      title: "SPRINT — MOVE FAST",
      hint: isMobile
        ? 'ARIA: "Fitness center. Tap RUN to sprint. Yes, the Bureau has a gym. No, you\'ve never used it."'
        : 'ARIA: "Fitness center. Hold SHIFT to sprint. Yes, the Bureau has a gym. No, you\'ve never used it."',
      color: "#ff44ff",
    },
    {
      title: "CROUCH — LOWER YOUR PROFILE",
      hint: isMobile
        ? 'ARIA: "Hold CROUCH. Smaller target, quieter feet."'
        : 'ARIA: "Hold CTRL to crouch. Smaller target, quieter feet."',
      color: "#66dd66",
    },
    {
      title: "SLIDE — STAY MOVING",
      hint: isMobile
        ? 'ARIA: "While running, tap CROUCH to slide. Momentum is armor."'
        : 'ARIA: "While sprinting, tap CTRL to slide. Momentum is armor."',
      color: "#66ff99",
    },
    {
      title: "PHASE DASH — BLINK FORWARD",
      hint: isMobile
        ? 'ARIA: "Double-tap a direction to phase-dash. Blink, and you\'re somewhere else."'
        : 'ARIA: "Double-tap a movement key to phase-dash. Blink, and you\'re somewhere else."',
      color: "#ff44ff",
    },
    {
      title: "CHRONO SHIFT — BEND TIME",
      hint: isMobile
        ? 'ARIA: "Time-dilation module online. Hold SLOW. The world crawls. You don\'t."'
        : 'ARIA: "Time-dilation module online. Hold Q and keep firing. The world crawls. You don\'t."',
      color: "#8844ff",
    },
    {
      title: "RESUPPLY — THE SUPERVISOR'S OFFICE",
      hint: 'SUPERVISOR (radio): "Cadet. My desk. Health, ammo — take all of it. Leave the coffee. Something\'s wrong upstairs."',
      color: "#44ff88",
    },
    {
      title: "\u26A1 ALERT — INTRUSION DETECTED",
      hint: 'SUPERVISOR: "Breach — every sector — they\'re already insi—" [STATIC] ARIA: "Lost him. Combat arena. Move."',
      color: "#ff2244",
    },
    {
      title: "WAVE 1 — FIRST CONTACT",
      hint: 'ARIA: "Three drones in the arena. This isn\'t a sim, Cadet. Put them down."',
      color: "#ff2244",
    },
    {
      title: "WAVE 2 — REINFORCEMENTS",
      hint: 'ARIA: "Two henchmen and a drone. These ones shoot back. Shoot first."',
      color: "#ff2244",
    },
    {
      title: "SYSTEMS ONLINE — CALIBRATION COMPLETE",
      hint: 'ARIA: "Suit synced. You\'re officially dangerous. Proceeding to deployment."',
      color: "#00ffcc",
    },
  ];
}

// ─── HUD-boot animation (step 0) ────────────────────────────────────────────

function renderHudBoot(ctx, w, h, elapsed) {
  const fadeIn = Math.min(1, elapsed / 0.5);
  ctx.save();
  ctx.globalAlpha = fadeIn;

  // Sweeping scan line
  const scanY = (elapsed / 2) * h;
  const scanGrad = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 40);
  scanGrad.addColorStop(0, "rgba(0,255,200,0)");
  scanGrad.addColorStop(0.5, "rgba(0,255,200,0.08)");
  scanGrad.addColorStop(1, "rgba(0,255,200,0)");
  ctx.fillStyle = scanGrad;
  ctx.fillRect(0, 0, w, h);

  const lines = [
    { text: "NEURAL LINK.......... OK",        delay: 0.3 },
    { text: "BIOMETRICS........... NERVOUS",   delay: 0.8 },
    { text: "BADGE 11235.......... CONFIRMED", delay: 1.2 },
    { text: "CHRONO MODULE........ STANDBY",   delay: 1.6 },
  ];
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  const baseY = h / 2 - 40;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (elapsed < l.delay) continue;
    const lineAlpha = Math.min(1, (elapsed - l.delay) / 0.3);
    const flicker = elapsed - l.delay < 0.15 ? 0.4 + Math.random() * 0.6 : 1;
    ctx.globalAlpha = fadeIn * lineAlpha * flicker;
    ctx.fillStyle = ACCENT;
    ctx.fillText(l.text, w / 2, baseY + i * 30);
  }

  ctx.restore();
}

/**
 * Draw a single tutorial step's instruction card. Auto-sizes to text length
 * with a maximum width clamp; word-wraps long hints onto a second line.
 */
function renderStepCard(ctx, w, h, step, fadeIn, pulse, stepNum, totalSteps) {
  const TITLE_FONT = "bold 20px monospace";
  const HINT_FONT = "14px monospace";
  const PAD_X = 30;
  const PAD_Y = 14;
  const MAX_W = Math.min(720, w - 80);
  const TITLE_HINT_GAP = 10;
  const HINT_LINE_H = 18;

  // Measure
  ctx.font = TITLE_FONT;
  const titleW = ctx.measureText(step.title).width;
  ctx.font = HINT_FONT;
  const hintLines = wrapText(ctx, step.hint, MAX_W - PAD_X * 2);
  const hintW = hintLines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0);

  const contentW = Math.max(titleW, hintW);
  const boxW = Math.min(MAX_W, contentW + PAD_X * 2);
  const boxH = PAD_Y * 2 + 22 /* title height */ + TITLE_HINT_GAP + hintLines.length * HINT_LINE_H;
  const bx = (w - boxW) / 2;
  const by = 60;

  ctx.save();
  ctx.globalAlpha = fadeIn * 0.92;

  // Drop shadow under panel for separation from bright backgrounds
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, 10);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Pulsing border
  ctx.strokeStyle = step.color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = fadeIn * pulse * 0.85;
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, 10);
  ctx.stroke();

  ctx.globalAlpha = fadeIn;

  // Step counter
  if (stepNum > 0 && stepNum <= totalSteps) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`${stepNum}/${totalSteps}`, bx + 14, by + 18);
  }

  // Title with subtle glow
  ctx.save();
  ctx.shadowColor = step.color;
  ctx.shadowBlur = 6;
  ctx.fillStyle = step.color;
  ctx.font = TITLE_FONT;
  ctx.textAlign = "center";
  ctx.fillText(step.title, w / 2, by + PAD_Y + 16);
  ctx.restore();

  // Hint lines
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = HINT_FONT;
  ctx.textAlign = "center";
  let hy = by + PAD_Y + 16 + TITLE_HINT_GAP + 14;
  for (const line of hintLines) {
    ctx.fillText(line, w / 2, hy);
    hy += HINT_LINE_H;
  }

  ctx.restore();
  return by + boxH;
}

/** Greedy word-wrapper for canvas text. Returns an array of lines. */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? line + " " + word : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * In-game tutorial step overlay (HUD boot, ARIA dialogue cards).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {{ mode: string, isTouchDevice: boolean, tutorialStepTime: number, tutorialStep: number }} state
 */
/** Returns the bottom edge of the step card in px, or 0 when none is drawn. */
export function renderTutorialOverlay(ctx, w, h, state) {
  const { mode, isTouchDevice, tutorialStepTime, tutorialStep } = state;
  if (mode !== "tutorial") return 0;

  const now = performance.now();
  const elapsed = (now - tutorialStepTime) / 1000;

  const modern = isModernArt();

  if (tutorialStep === 0) {
    if (modern) renderModernHudBoot(ctx, w, h, elapsed);
    else renderHudBoot(ctx, w, h, elapsed);
    return 0;
  }

  const copy = tutorialStepCopy(isTouchDevice);
  const step = copy[tutorialStep];
  if (!step) return 0; // sandbox/completion menu has no overlay

  const fadeIn = Math.min(1, elapsed / 0.4);
  const pulse = 0.85 + 0.15 * Math.sin(now / 300);
  if (modern) {
    return renderModernStepCard(ctx, w, h, step, fadeIn, pulse, tutorialStep, copy.length - 1);
  }
  return renderStepCard(ctx, w, h, step, fadeIn, pulse, tutorialStep, copy.length - 1);
}

/** Full-screen tutorial completion menu (4 choices after training). */
export function renderTutorialCompletionMenu(ctx, w, h, selection = 0) {
  const now = performance.now();
  if (isModernArt()) {
    renderModernCompletionMenu(ctx, w, h, selection, now);
    return;
  }

  drawCinematicBackdrop(ctx, w, h, h * 0.2, now);
  drawCinematicTitle(
    ctx, w, h,
    "TRAINING COMPLETE",
    "All systems nominal. What's your next move, agent?",
    now,
  );

  drawCinematicMenu(ctx, w, h, COMPLETION_ITEMS, selection, now);
  drawFooterHint(ctx, w, h, "W/S to navigate  \u00B7  ENTER to select");

  drawScanlines(ctx, w, h);
  ctx.textAlign = "left";
}

// ─── Modern (graphic-novel) rendering ───────────────────────────────────────
// Kit panels, inked type and keycap glyphs for key names. Same anchors as the
// legacy layouts (touch hit-tests and the ARIA box's minTop depend on them).

/** Completion menu entries (shared by the legacy and Modern renderers). */
const COMPLETION_ITEMS = [
  { label: "CONTINUE TRAINING", key: "[1]",   color: "#ffcc00", desc: "Stay in the sandbox" },
  { label: "BEGIN CAMPAIGN",    key: "[2]",   color: "#00ccff", desc: "Face the Paradox Lord" },
  { label: "CUSTOMIZE AGENT",   key: "[3]",   color: "#aa44ff", desc: "Armor, colors, badges, loadout" },
  { label: "MAIN MENU",         key: "[ESC]", color: "#666666", desc: "Return to title screen" },
];

let _mctx = null;
function measureSpaced(font, text, spacing = 0) {
  if (!_mctx) _mctx = document.createElement("canvas").getContext("2d");
  _mctx.font = font;
  _mctx.letterSpacing = `${spacing}px`;
  const tw = _mctx.measureText(text).width;
  _mctx.letterSpacing = "0px";
  return tw;
}

/** Width drawKeycap will take for a legend. */
function keycapW(text, size) {
  const tw = Math.ceil(measureSpaced(uiFont(size, 700), String(text), 0.5));
  return Math.max(Math.round(size * 1.9), tw + Math.round(size * 1.1));
}

// Words in hint copy that name an input get drawn as keycaps.
const KEY_WORDS = new Set([
  "CLICK", "E", "Q", "SHIFT", "CTRL", "ENTER", "ESC", "TAB", "SPACE",
  "USE", "FIRE", "AIM", "RUN", "CROUCH", "SLOW", "DASH",
]);
const SPEAKER_SCHEMES = { ARIA: "cyan", SUPERVISOR: "amber" };

/**
 * Break hint copy into atoms: plain words, keycap groups and speaker tabs.
 * The text itself is untouched; only how each token is drawn changes.
 */
function tokenizeHint(text) {
  const words = text.split(" ").filter(Boolean);
  const atoms = [];
  for (let i = 0; i < words.length; i++) {
    const wd = words[i];
    if (wd === "SUPERVISOR" && /^\(radio\):$/.test(words[i + 1] || "")) {
      atoms.push({ kind: "speaker", text: "SUPERVISOR (radio)", scheme: "amber" });
      i++;
      continue;
    }
    const sp = /^([A-Z]+):$/.exec(wd);
    if (sp && SPEAKER_SCHEMES[sp[1]]) {
      atoms.push({ kind: "speaker", text: sp[1], scheme: SPEAKER_SCHEMES[sp[1]] });
      continue;
    }
    const wasd = /^(\W*)W$/.exec(wd);
    if (wasd && words[i + 1] === "A" && words[i + 2] === "S" && /^D\W*$/.test(words[i + 3] || "")) {
      const tail = words[i + 3].slice(1);
      atoms.push({ kind: "keys", keys: ["W", "A", "S", "D"], pre: wasd[1], post: tail });
      i += 3;
      continue;
    }
    if (wd === "RIGHT" && /^MOUSE\W*$/.test(words[i + 1] || "")) {
      atoms.push({ kind: "keys", keys: ["RIGHT MOUSE"], pre: "", post: words[i + 1].slice(5) });
      i++;
      continue;
    }
    if (/^\[[A-Z]+\]$/.test(wd)) {
      atoms.push({ kind: "tag", text: wd.slice(1, -1) });
      continue;
    }
    const m = /^(\W*)([A-Z0-9/]+?)(\W*)$/.exec(wd);
    if (m) {
      if (KEY_WORDS.has(m[2])) {
        atoms.push({ kind: "keys", keys: [m[2]], pre: m[1], post: m[3] });
        continue;
      }
      if (/^\d(\/\d)+$/.test(m[2])) {
        atoms.push({ kind: "keys", keys: m[2].split("/"), sep: "/", pre: m[1], post: m[3] });
        continue;
      }
    }
    atoms.push({ kind: "word", text: wd });
  }
  return atoms;
}

const KEY_SIZE = 11;
const _richCache = new Map();

/** Wrap atoms into centred lines; cached per text/width/font. */
function layoutRich(text, maxW, font) {
  const cacheKey = `${font}|${maxW}|${text}`;
  let lay = _richCache.get(cacheKey);
  if (lay) return lay;
  const space = measureSpaced(font, " ");
  const sepW = measureSpaced(font, "/") + 4;
  const atoms = tokenizeHint(text).map((a) => {
    if (a.kind === "word") return { ...a, w: measureSpaced(font, a.text) };
    if (a.kind === "speaker" || a.kind === "tag") {
      const size = 10;
      const label = a.text.toUpperCase();
      const w = Math.ceil(measureSpaced(uiFont(size, 700), label, Math.max(0.5, size * 0.08))) + Math.round(size * 0.7) * 2;
      return { ...a, w };
    }
    const preW = a.pre ? measureSpaced(font, a.pre) + 1 : 0;
    const postW = a.post ? measureSpaced(font, a.post) + 1 : 0;
    let kw = 0;
    for (let k = 0; k < a.keys.length; k++) {
      kw += keycapW(a.keys[k], KEY_SIZE) + (k ? (a.sep ? sepW : 3) : 0);
    }
    return { ...a, preW, postW, w: preW + kw + postW };
  });
  const lines = [];
  let cur = [];
  let curW = 0;
  for (const a of atoms) {
    const add = (cur.length ? space : 0) + a.w;
    if (cur.length && curW + add > maxW) {
      lines.push({ atoms: cur, w: curW });
      cur = [a];
      curW = a.w;
    } else {
      cur.push(a);
      curW += add;
    }
  }
  if (cur.length) lines.push({ atoms: cur, w: curW });
  lay = { lines, space, sepW, w: lines.reduce((m, l) => Math.max(m, l.w), 0) };
  if (_richCache.size > 80) _richCache.clear();
  _richCache.set(cacheKey, lay);
  return lay;
}

function drawRichLine(ctx, line, lay, x, midY, font, color) {
  let cx = x;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  for (let i = 0; i < line.atoms.length; i++) {
    const a = line.atoms[i];
    if (i) cx += lay.space;
    if (a.kind === "word") {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.fillText(a.text, cx, midY + 1);
    } else if (a.kind === "speaker") {
      drawCaption(ctx, cx, Math.round(midY - 8), a.text, { size: 10, scheme: a.scheme });
    } else if (a.kind === "tag") {
      drawCaption(ctx, cx, Math.round(midY - 8), a.text, { size: 10, scheme: "crimson" });
    } else {
      let kx = cx;
      ctx.font = font;
      ctx.fillStyle = color;
      if (a.pre) {
        ctx.fillText(a.pre, kx, midY + 1);
        kx += a.preW;
      }
      for (let k = 0; k < a.keys.length; k++) {
        if (k) {
          if (a.sep) {
            ctx.font = font;
            ctx.fillStyle = color;
            ctx.fillText(a.sep, kx + 2, midY + 1);
            kx += lay.sepW;
          } else {
            kx += 3;
          }
        }
        kx += drawKeycap(ctx, kx, Math.round(midY - KEY_SIZE * 0.95), a.keys[k], { size: KEY_SIZE });
      }
      if (a.post) {
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.fillText(a.post, kx + 1, midY + 1);
      }
    }
    cx += a.w;
  }
  ctx.textBaseline = "alphabetic";
}

function renderModernStepCard(ctx, w, h, step, fadeIn, pulse, stepNum, totalSteps) {
  const TITLE_SIZE = 20;
  const titleFont = uiFont(TITLE_SIZE, 800);
  const hintFont = uiFont(15, 600);
  const PAD_X = 30;
  const PAD_Y = 14;
  const MAX_W = Math.min(720, w - 80);
  const TITLE_H = 24;
  const GAP = 8;
  const LINE_H = 25;

  const titleW = measureSpaced(titleFont, step.title, 1);
  const lay = layoutRich(step.hint, MAX_W - PAD_X * 2, hintFont);
  const contentW = Math.max(titleW, lay.w);
  const boxW = Math.round(Math.min(MAX_W, contentW + PAD_X * 2));
  const boxH = PAD_Y + TITLE_H + GAP + lay.lines.length * LINE_H + PAD_Y - 4;
  const bx = Math.round((w - boxW) / 2);
  const by = 60;

  ctx.save();
  ctx.globalAlpha = fadeIn;
  drawPanel(ctx, bx, by, boxW, boxH, { variant: "menu", accent: step.color, bar: true, chamfer: 12 });
  // Pulsing live brackets outside the plate (the legacy border pulse).
  ctx.globalAlpha = fadeIn * (0.35 + (pulse - 0.7) * 2);
  drawBrackets(ctx, bx - 5, by - 5, boxW + 10, boxH + 10, step.color, 12, 2);
  ctx.globalAlpha = fadeIn;

  if (stepNum > 0 && stepNum <= totalSteps) {
    drawCaption(ctx, bx + 16, by - 9, `${stepNum}/${totalSteps}`, { size: 9, scheme: "steel" });
  }

  ctx.font = titleFont;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = "1px";
  inkText(ctx, step.title, w / 2, by + PAD_Y + 18, step.color, 4);
  ctx.letterSpacing = "0px";

  let midY = by + PAD_Y + TITLE_H + GAP + LINE_H / 2 - 1;
  for (const line of lay.lines) {
    drawRichLine(ctx, line, lay, Math.round(w / 2 - line.w / 2), midY, hintFont, UI.text);
    midY += LINE_H;
  }
  ctx.restore();
  ctx.textAlign = "left";
  return by + boxH;
}

const BOOT_STATUS_SCHEME = { OK: "cyan", CONFIRMED: "cyan", NERVOUS: "amber", STANDBY: "steel" };

function renderModernHudBoot(ctx, w, h, elapsed) {
  const fadeIn = Math.min(1, elapsed / 0.5);
  ctx.save();
  ctx.globalAlpha = fadeIn;

  // Sweeping scan line: a hairline and a faint band, no per-frame gradient.
  const scanY = Math.round((elapsed / 2) * h);
  ctx.fillStyle = "rgba(34,230,255,0.05)";
  ctx.fillRect(0, scanY - 24, w, 48);
  ctx.fillStyle = "rgba(34,230,255,0.35)";
  ctx.fillRect(0, scanY, w, 1);

  const lines = [
    { text: "NEURAL LINK.......... OK",        delay: 0.3 },
    { text: "BIOMETRICS........... NERVOUS",   delay: 0.8 },
    { text: "BADGE 11235.......... CONFIRMED", delay: 1.2 },
    { text: "CHRONO MODULE........ STANDBY",   delay: 1.6 },
  ];
  const baseY = h / 2 - 40;
  const pw = Math.min(440, w - 40);
  const px = Math.round(w / 2 - pw / 2);
  const py = Math.round(baseY - 36);
  const ph = 30 * lines.length + 26;
  drawPanel(ctx, px, py, pw, ph, { variant: "hud", accent: UI.energy, chamfer: 12 });

  const labelFont = uiFont(15, 700);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (elapsed < l.delay) continue;
    const lineAlpha = Math.min(1, (elapsed - l.delay) / 0.3);
    const flicker = elapsed - l.delay < 0.15 ? 0.4 + Math.random() * 0.6 : 1;
    ctx.globalAlpha = fadeIn * lineAlpha * flicker;
    const m = /^(.*?)\.{2,}\s*(.*)$/.exec(l.text);
    const label = m ? m[1] : l.text;
    const status = m ? m[2] : "";
    const ly = baseY + i * 30 - 5;
    ctx.font = labelFont;
    ctx.letterSpacing = "1.5px";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = UI.text;
    ctx.fillText(label, px + 22, ly);
    const lw = ctx.measureText(label).width;
    ctx.letterSpacing = "0px";
    if (status) {
      const cap = drawCaption(ctx, px + pw - 22, ly - 9, status, {
        size: 10, scheme: BOOT_STATUS_SCHEME[status] || "steel", align: "right",
      });
      // Dotted leader between label and status chip.
      ctx.strokeStyle = UI.textFaint;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([1.5, 4]);
      ctx.beginPath();
      ctx.moveTo(px + 30 + lw, ly + 3);
      ctx.lineTo(cap.x - 8, ly + 3);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();
}

/**
 * Menu list over a steel plate: raised glowing row for the selection, keycap
 * legends on the right. Shared with the campaign prompt. `labelDy`/`descDy`
 * are the legacy text baselines within a row.
 */
export function drawModernMenu(ctx, items, selection, now, layout, labelDy = 24, descDy = 40) {
  const { menuW, itemH, menuH, mx, my } = layout;
  drawPanel(ctx, mx - 10, my - 10, menuW + 20, menuH + 20, { variant: "menu", accent: UI.cyan, chamfer: 16 });

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const iy = my + 8 + i * itemH;
    const rowH = itemH - 6;
    const isSelected = i === selection;
    const accent = item.color === "#666666" ? UI.steelHi : item.color;

    if (isSelected) {
      drawPanel(ctx, mx, iy, menuW, rowH, { variant: "raised", accent, bar: true, glow: true, chamfer: 9 });
      // Chevron nudges forward in time with the legacy selection pulse.
      const nudge = Math.round(Math.sin(now * 0.004) * 1.5);
      const cy = iy + labelDy - 6;
      ctx.beginPath();
      ctx.moveTo(mx + 13 + nudge, cy - 6);
      ctx.lineTo(mx + 22 + nudge, cy);
      ctx.lineTo(mx + 13 + nudge, cy + 6);
      ctx.closePath();
      ctx.lineWidth = 3;
      ctx.lineJoin = "miter";
      ctx.strokeStyle = UI.ink;
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fill();
    } else if (i > 0 && i - 1 !== selection) {
      ctx.fillStyle = "rgba(130,160,188,0.1)";
      ctx.fillRect(mx + 14, iy - 3, menuW - 28, 1);
    }

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = uiFont(16, isSelected ? 800 : 600);
    ctx.letterSpacing = "1.5px";
    ctx.fillStyle = isSelected ? "#ffffff" : "#9fb1c2";
    ctx.fillText(item.label, mx + 32, iy + labelDy);
    ctx.letterSpacing = "0px";

    if (item.desc && isSelected) {
      ctx.font = uiFont(12, 600);
      ctx.fillStyle = UI.textDim;
      ctx.fillText(item.desc, mx + 32, iy + descDy);
    }

    const legend = item.key.replace(/^\[|\]$/g, "");
    drawKeycap(ctx, mx + menuW - 10, Math.round(iy + rowH / 2 - 10), legend, {
      size: 10, align: "right", accent: isSelected ? accent : null,
    });
  }
  ctx.textAlign = "left";
}

/**
 * Footer hint like "W/S to navigate · ENTER to select": each segment's first
 * word becomes keycaps, the rest a dim label. Centred on cx, vertically on midY.
 */
export function drawModernKeyHints(ctx, cx, midY, text, size = 10) {
  const labelFont = uiFont(Math.max(9, size), 700);
  const segs = text.split("·").map((sgm) => sgm.trim()).filter(Boolean).map((sgm) => {
    const [first, ...rest] = sgm.split(/\s+/);
    const keys = first.split("/");
    const label = rest.join(" ").toUpperCase();
    const kw = keys.reduce((n, k) => n + keycapW(k, size), 0) + (keys.length - 1) * 3;
    const lw = label ? measureSpaced(labelFont, label, 1) : 0;
    return { keys, label, kw, lw, w: kw + (label ? 7 + lw : 0) };
  });
  const gap = Math.round(size * 2.4);
  const total = segs.reduce((n, sg) => n + sg.w, 0) + gap * (segs.length - 1);
  let x = Math.round(cx - total / 2);
  const capY = Math.round(midY - size * 0.95);
  for (const sg of segs) {
    for (let k = 0; k < sg.keys.length; k++) {
      x += drawKeycap(ctx, x, capY, sg.keys[k], { size }) + (k < sg.keys.length - 1 ? 3 : 0);
    }
    if (sg.label) {
      ctx.font = labelFont;
      ctx.letterSpacing = "1px";
      ctx.fillStyle = UI.textDim;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(sg.label, x + 7, midY);
      ctx.letterSpacing = "0px";
      ctx.textBaseline = "alphabetic";
      x += 7 + sg.lw;
    }
    x += gap;
  }
  ctx.textAlign = "left";
}

function renderModernCompletionMenu(ctx, w, h, selection, now) {
  drawBackdrop(ctx, w, h, "cyan");
  const compact = h < 500;
  const titleY = h * 0.14;
  drawTitle(ctx, "TRAINING COMPLETE", w / 2, titleY + (compact ? 6 : 8), compact ? 30 : 40, UI.energy, {
    fillTop: "#f2fffb", fillBottom: "#8fe8d4",
  });
  drawCaption(ctx, w / 2, titleY + (compact ? 22 : 30), "All systems nominal. What's your next move, agent?", {
    size: compact ? 10 : 11, scheme: "steel", align: "center",
  });

  const layout = tutorialMenuLayout(w, h, COMPLETION_ITEMS.length);
  drawModernMenu(ctx, COMPLETION_ITEMS, selection, now, layout);
  if (!compact) {
    drawModernKeyHints(ctx, w / 2, h - 30, "W/S to navigate  ·  ENTER to select", 10);
  } else {
    // Short screens: the menu panel runs to the bottom edge, so the hints stack
    // in the gutter beside it instead of overlapping its lower rim.
    const gutterX = layout.mx + layout.menuW + 10;
    if (w - gutterX >= 140) {
      const gx = Math.round((gutterX + w) / 2);
      const midY = layout.my + layout.menuH / 2;
      drawModernKeyHints(ctx, gx, midY - 12, "W/S to navigate", 9);
      drawModernKeyHints(ctx, gx, midY + 12, "ENTER to select", 9);
    }
  }
  ctx.textAlign = "left";
}
