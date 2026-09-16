// Tutorial UI — overlay, completion menu rendering.
//
// All rendering is purely a function of state passed in; no globals besides
// performance.now(). Shared backdrop / menu helpers are private to this file.

import { tutorialMenuLayout } from "../../js/layout.js";
import { drawScanlines } from "./scanlines.js";

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
function tutorialStepCopy(isMobile) {
  return [
    null, // step 0 handled separately (HUD boot)
    {
      title: "SYSTEMS ONLINE — LOOK AROUND",
      hint: isMobile
        ? 'ARIA: "Welcome to the Bureau, Cadet. Drag to look — get used to the augmented feed."'
        : 'ARIA: "Welcome to the Bureau, Cadet. Move the mouse — get used to the augmented feed."',
      color: "#00ccff",
    },
    {
      title: "MOVE — TEST THE SUIT",
      hint: isMobile
        ? 'ARIA: "Good. Use the stick to walk — head toward the door ahead."'
        : 'ARIA: "Good. W A S D — walk it off, head toward the bulkhead ahead."',
      color: "#00ccff",
    },
    {
      title: "BREACH — OPEN THE DOOR",
      hint: isMobile
        ? 'ARIA: "Sealed bulkhead. Face it and tap USE — override the lock."'
        : 'ARIA: "Sealed bulkhead. Face it and press E — override the magnetic lock."',
      color: "#ff8844",
    },
    {
      title: "ARM YOURSELF",
      hint: 'ARIA: "Weapon crate ahead. Walk over it — this is no longer a drill."',
      color: "#ff6600",
    },
    {
      title: "CONFIRM TARGETING",
      hint: isMobile
        ? 'ARIA: "Tap FIRE. Confirm your targeting solution is live."'
        : 'ARIA: "CLICK to fire. Confirm your targeting system is live."',
      color: "#ff8844",
    },
    {
      title: "AIM DOWN SIGHTS — FOCUS FIRE",
      hint: isMobile
        ? 'ARIA: "Hold AIM to tighten the sight picture. Same reticle, cleaner shot."'
        : 'ARIA: "Hold RIGHT MOUSE to aim down sights. Same reticle, cleaner shot."',
      color: "#66eeff",
    },
    {
      title: "WEAPON SWITCH — GRAB THE SHOTGUN",
      hint: isMobile
        ? 'ARIA: "Second weapon on the range. Pick it up, then swipe to switch weapons."'
        : 'ARIA: "Second weapon on the range. Pick it up, then scroll or press 1/2 to switch."',
      color: "#ff6600",
    },
    {
      title: "SPRINT — MOVE FAST",
      hint: isMobile
        ? 'ARIA: "Fitness center ahead. Tap RUN to sprint — cover ground fast."'
        : 'ARIA: "Fitness center ahead. Hold SHIFT to sprint — cover ground fast."',
      color: "#ff44ff",
    },
    {
      title: "CROUCH — LOWER YOUR PROFILE",
      hint: isMobile
        ? 'ARIA: "Hold CROUCH. Smaller target, quieter movement."'
        : 'ARIA: "Hold CTRL to crouch. Smaller target, quieter movement."',
      color: "#66dd66",
    },
    {
      title: "SLIDE — STAY MOVING",
      hint: isMobile
        ? 'ARIA: "While running, tap CROUCH to slide through danger."'
        : 'ARIA: "While sprinting, tap CTRL to slide through danger."',
      color: "#66ff99",
    },
    {
      title: "PHASE DASH — BLINK FORWARD",
      hint: isMobile
        ? 'ARIA: "Double-tap a direction to phase-dash. Covers distance instantly."'
        : 'ARIA: "Double-tap a movement key to phase-dash. Covers distance instantly."',
      color: "#ff44ff",
    },
    {
      title: "CHRONO SHIFT — BEND TIME",
      hint: isMobile
        ? 'ARIA: "Time-dilation module is active. Hold SLOW. The next few seconds matter."'
        : 'ARIA: "Time-dilation module is active. Hold Q. Keep holding while you fire."',
      color: "#8844ff",
    },
    {
      title: "RESUPPLY — THE SUPERVISOR'S OFFICE",
      hint: 'SUPERVISOR (radio): "Cadet, grab what\'s on the desk. Health. Ammo. Take everything — the Bureau just went hot."',
      color: "#44ff88",
    },
    {
      title: "\u26A1 ALERT — INTRUSION DETECTED",
      hint: 'SUPERVISOR: "Multiple sectors — breach — they\'re inside —" [STATIC] ARIA: "Signal lost. Combat arena, NOW."',
      color: "#ff2244",
    },
    {
      title: "WAVE 1 — FIRST CONTACT",
      hint: 'ARIA: "Three drones in the arena. Cadet — this isn\'t a sim. Put them down."',
      color: "#ff2244",
    },
    {
      title: "WAVE 2 — REINFORCEMENTS",
      hint: 'ARIA: "More contacts. Two henchmen and a drone. Stay sharp."',
      color: "#ff2244",
    },
    {
      title: "SYSTEMS ONLINE — CALIBRATION COMPLETE",
      hint: 'ARIA: "Suit fully integrated. Proceeding to agent deployment array."',
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
    { text: "BIOMETRICS........... NOMINAL",   delay: 0.8 },
    { text: "CADET ID: CONFIRMED",             delay: 1.2 },
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
export function renderTutorialOverlay(ctx, w, h, state) {
  const { mode, isTouchDevice, tutorialStepTime, tutorialStep } = state;
  if (mode !== "tutorial") return;

  const now = performance.now();
  const elapsed = (now - tutorialStepTime) / 1000;

  if (tutorialStep === 0) {
    renderHudBoot(ctx, w, h, elapsed);
    return;
  }

  const copy = tutorialStepCopy(isTouchDevice);
  const step = copy[tutorialStep];
  if (!step) return; // sandbox/completion menu has no overlay

  const fadeIn = Math.min(1, elapsed / 0.4);
  const pulse = 0.85 + 0.15 * Math.sin(now / 300);
  renderStepCard(ctx, w, h, step, fadeIn, pulse, tutorialStep, copy.length - 1);
}

/** Full-screen tutorial completion menu (4 choices after training). */
export function renderTutorialCompletionMenu(ctx, w, h, selection = 0) {
  const now = performance.now();

  drawCinematicBackdrop(ctx, w, h, h * 0.2, now);
  drawCinematicTitle(
    ctx, w, h,
    "TRAINING COMPLETE",
    "All systems nominal. What's your next move, agent?",
    now,
  );

  const items = [
    { label: "CONTINUE TRAINING", key: "[1]",   color: "#ffcc00", desc: "Stay in the sandbox" },
    { label: "BEGIN CAMPAIGN",    key: "[2]",   color: "#00ccff", desc: "Face the Paradox Lord" },
    { label: "CUSTOMIZE AGENT",   key: "[3]",   color: "#aa44ff", desc: "Armor, colors, badges, loadout" },
    { label: "MAIN MENU",         key: "[ESC]", color: "#666666", desc: "Return to title screen" },
  ];
  drawCinematicMenu(ctx, w, h, items, selection, now);
  drawFooterHint(ctx, w, h, "W/S to navigate  \u00B7  ENTER to select");

  drawScanlines(ctx, w, h);
  ctx.textAlign = "left";
}
