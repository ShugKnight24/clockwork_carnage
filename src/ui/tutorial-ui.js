// Tutorial UI — overlay, completion menu, and tutorial menu rendering

import { tutorialMenuLayout } from "../../js/layout.js";
import { drawScanlines } from "./scanlines.js";

/**
 * In-game tutorial step overlay (HUD boot, ARIA dialogue boxes)
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {{ mode: string, isTouchDevice: boolean, tutorialStepTime: number, tutorialStep: number }} state
 */
export function renderTutorialOverlay(ctx, w, h, state) {
  const { mode, isTouchDevice, tutorialStepTime, tutorialStep } = state;
  if (mode !== "tutorial") return;

  const isMobile = isTouchDevice;
  const now = performance.now();
  const elapsed = (now - tutorialStepTime) / 1000;

  // ── Step 0: HUD Boot Animation (no text box) ──
  if (tutorialStep === 0) {
    const fadeIn = Math.min(1, elapsed / 0.5);
    ctx.save();
    ctx.globalAlpha = fadeIn;

    // Scan line sweep
    const scanY = (elapsed / 2) * h;
    const scanGrad = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 40);
    scanGrad.addColorStop(0, "rgba(0,255,200,0)");
    scanGrad.addColorStop(0.5, "rgba(0,255,200,0.08)");
    scanGrad.addColorStop(1, "rgba(0,255,200,0)");
    ctx.fillStyle = scanGrad;
    ctx.fillRect(0, 0, w, h);

    // Boot readouts
    const lines = [
      { text: "NEURAL LINK.......... OK", delay: 0.3 },
      { text: "BIOMETRICS........... NOMINAL", delay: 0.8 },
      { text: "CADET ID: CONFIRMED", delay: 1.2 },
      { text: "CHRONO MODULE........ STANDBY", delay: 1.6 },
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
      ctx.fillStyle = "#00ffcc";
      ctx.fillText(l.text, w / 2, baseY + i * 30);
    }

    ctx.restore();
    return;
  }

  // ── Steps 1-14: ARIA Dialogue Boxes ──
  const steps = [
    null, // step 0 handled above
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
        : 'ARIA: "Time-dilation module is active. Press Q. The next few seconds matter."',
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

  const step = steps[tutorialStep];
  if (!step) return;

  // Fade in
  const fadeIn = Math.min(1, elapsed / 0.4);
  const pulse = 0.85 + 0.15 * Math.sin(now / 300);

  const boxW = 500;
  const boxH = 80;
  const by = 60;

  // Measure text to auto-size the box
  ctx.font = "bold 20px monospace";
  const titleW = ctx.measureText(step.title).width;
  ctx.font = "14px monospace";
  const hintW = ctx.measureText(step.hint).width;
  const textMaxW = Math.max(titleW, hintW);
  const dynamicW = Math.max(boxW, textMaxW + 60);
  const dynamicBx = (w - dynamicW) / 2;

  ctx.save();
  ctx.globalAlpha = fadeIn * 0.9;

  // Background
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.beginPath();
  ctx.roundRect(dynamicBx, by, dynamicW, boxH, 8);
  ctx.fill();

  // Border
  ctx.strokeStyle = step.color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = fadeIn * pulse * 0.8;
  ctx.beginPath();
  ctx.roundRect(dynamicBx, by, dynamicW, boxH, 8);
  ctx.stroke();

  ctx.globalAlpha = fadeIn;

  // Step counter (steps 1-13 shown as X/13)
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "left";
  if (tutorialStep > 0 && tutorialStep < 14) {
    ctx.fillText(`${tutorialStep}/13`, dynamicBx + 14, by + 18);
  }

  // Title
  ctx.fillStyle = step.color;
  ctx.font = "bold 20px monospace";
  ctx.textAlign = "center";
  ctx.fillText(step.title, w / 2, by + 34);

  // Hint
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "14px monospace";
  ctx.fillText(step.hint, w / 2, by + 58);

  // Sandbox (step 15) — no overlay menu, just the step indicator
  // (no-op block intentionally left empty)

  ctx.restore();
}

/**
 * Full-screen tutorial completion menu (4 choices after training)
 */
export function renderTutorialCompletionMenu(ctx, w, h, selection = 0) {
  const now = performance.now();
  const sel = selection;

  // Full-screen cinematic backdrop
  ctx.fillStyle = "rgba(0, 5, 15, 0.7)";
  ctx.fillRect(0, 0, w, h);

  // Subtle animated grid
  ctx.strokeStyle = "rgba(0,200,255,0.02)";
  ctx.lineWidth = 1;
  const gridSz = 48;
  const gridOff = (now * 0.008) % gridSz;
  for (let gx = -gridOff; gx < w; gx += gridSz) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }
  for (let gy = -gridOff; gy < h; gy += gridSz) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }

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

  // Animated energy ring
  const ringPulse = 0.5 + 0.5 * Math.sin(now * 0.002);
  ctx.save();
  ctx.translate(w / 2, h * 0.2);
  ctx.strokeStyle = `rgba(0, 255, 200, ${0.08 + ringPulse * 0.06})`;
  ctx.lineWidth = 2;
  for (let ring = 0; ring < 3; ring++) {
    const radius = 50 + ring * 20 + Math.sin(now * 0.001 + ring) * 4;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Title
  const titleY = h * 0.14;
  const titlePulse = 0.85 + 0.15 * Math.sin(now * 0.003);
  ctx.save();
  ctx.shadowColor = "#00ffcc";
  ctx.shadowBlur = 20 * titlePulse;
  ctx.fillStyle = "#00ffcc";
  ctx.font = "bold 36px monospace";
  ctx.textAlign = "center";
  ctx.fillText("TRAINING COMPLETE", w / 2, titleY);
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.fillStyle = "rgba(170, 200, 220, 0.6)";
  ctx.font = "13px monospace";
  ctx.textAlign = "center";
  ctx.fillText("All systems nominal. What's your next move, agent?", w / 2, titleY + 24);

  // Decorative line
  ctx.strokeStyle = "rgba(0, 255, 200, 0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 100, titleY + 36);
  ctx.lineTo(w / 2 + 100, titleY + 36);
  ctx.stroke();

  // Menu items
  const menuItems = [
    { label: "CONTINUE TRAINING", key: "[1]", color: "#ffcc00", desc: "Stay in the sandbox" },
    { label: "BEGIN CAMPAIGN", key: "[2]", color: "#00ccff", desc: "Face the Paradox Lord" },
    { label: "CUSTOMIZE AGENT", key: "[3]", color: "#aa44ff", desc: "Armor, colors, badges, loadout" },
    { label: "MAIN MENU", key: "[ESC]", color: "#666666", desc: "Return to title screen" },
  ];

  const layout = tutorialMenuLayout(w, h, menuItems.length);
  const { menuW, itemH, menuH, mx, my } = layout;

  ctx.fillStyle = "rgba(0, 5, 15, 0.75)";
  ctx.beginPath();
  ctx.roundRect(mx - 10, my - 10, menuW + 20, menuH + 20, 12);
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 255, 200, 0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(mx - 10, my - 10, menuW + 20, menuH + 20, 12);
  ctx.stroke();

  for (let i = 0; i < menuItems.length; i++) {
    const item = menuItems[i];
    const iy = my + 8 + i * itemH;
    const isSelected = i === sel;

    if (isSelected) {
      const sPulse = 0.6 + 0.4 * Math.sin(now * 0.004);
      ctx.fillStyle = `rgba(0, 255, 200, ${0.06 * sPulse})`;
      ctx.beginPath();
      ctx.roundRect(mx, iy, menuW, itemH - 6, 6);
      ctx.fill();
      ctx.fillStyle = item.color;
      ctx.fillRect(mx, iy + 4, 3, itemH - 14);
      ctx.fillStyle = "#00ffcc";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "left";
      ctx.fillText("\u25B8", mx + 12, iy + 24);
    }

    ctx.fillStyle = isSelected ? item.color : "rgba(255,255,255,0.45)";
    ctx.font = `${isSelected ? "bold " : ""}16px monospace`;
    ctx.textAlign = "left";
    ctx.fillText(item.label, mx + 32, iy + 24);

    if (item.desc && isSelected) {
      ctx.fillStyle = "rgba(170, 200, 220, 0.5)";
      ctx.font = "11px monospace";
      ctx.fillText(item.desc, mx + 32, iy + 40);
    }

    ctx.fillStyle = isSelected ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)";
    ctx.font = "11px monospace";
    ctx.textAlign = "right";
    ctx.fillText(item.key, mx + menuW - 8, iy + 24);
  }
  ctx.textAlign = "left";

  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.font = "11px monospace";
  ctx.textAlign = "center";
  ctx.fillText("W/S to navigate  \u00B7  ENTER to select", w / 2, h - 30);

  // Scanline overlay
  drawScanlines(ctx, w, h);
  ctx.textAlign = "left";
}

/**
 * Tutorial start/resume menu (DEAD CODE — never called from render dispatch,
 * but kept for potential future use. executeTutorialMenuChoice still lives in game.js)
 */
export function renderTutorialMenu(ctx, w, h, selection = 0) {
  const now = performance.now();
  const sel = selection;

  // Full-screen cinematic backdrop
  ctx.fillStyle = "rgba(0, 5, 15, 0.6)";
  ctx.fillRect(0, 0, w, h);

  // Animated energy ring behind title
  const ringPulse = 0.5 + 0.5 * Math.sin(now * 0.002);
  ctx.save();
  ctx.translate(w / 2, h * 0.22);
  ctx.strokeStyle = `rgba(0, 255, 200, ${0.08 + ringPulse * 0.06})`;
  ctx.lineWidth = 2;
  for (let ring = 0; ring < 3; ring++) {
    const radius = 60 + ring * 25 + Math.sin(now * 0.001 + ring) * 5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // "AGENT READY" title
  const titleY = h * 0.15;
  const titlePulse = 0.85 + 0.15 * Math.sin(now * 0.003);
  ctx.save();
  ctx.shadowColor = "#00ffcc";
  ctx.shadowBlur = 20 * titlePulse;
  ctx.fillStyle = "#00ffcc";
  ctx.font = "bold 36px monospace";
  ctx.textAlign = "center";
  ctx.fillText("AGENT READY", w / 2, titleY);
  ctx.shadowBlur = 0;
  ctx.restore();

  // Subtitle
  ctx.fillStyle = "rgba(170, 200, 220, 0.6)";
  ctx.font = "13px monospace";
  ctx.textAlign = "center";
  ctx.fillText("Temporal calibration complete. All systems nominal.", w / 2, titleY + 24);

  // Decorative line
  const lineW = 200;
  ctx.strokeStyle = "rgba(0, 255, 200, 0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2 - lineW / 2, titleY + 36);
  ctx.lineTo(w / 2 + lineW / 2, titleY + 36);
  ctx.stroke();

  // Menu
  const menuItems = [
    { label: "BEGIN CAMPAIGN", key: "[1]", color: "#00ccff", desc: "Face the Paradox Lord" },
    { label: "ENTER ARENA", key: "[2]", color: "#ff8844", desc: "Endless combat simulation" },
    { label: "RECALIBRATE", key: "[R]", color: "#ffcc00", desc: "Restart tutorial" },
    { label: "MAIN MENU", key: "[ESC]", color: "#666666", desc: "" },
  ];

  const layout = tutorialMenuLayout(w, h, menuItems.length);
  const { menuW, itemH, menuH, mx, my } = layout;

  // Menu container
  ctx.fillStyle = "rgba(0, 5, 15, 0.75)";
  ctx.beginPath();
  ctx.roundRect(mx - 10, my - 10, menuW + 20, menuH + 20, 12);
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 255, 200, 0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(mx - 10, my - 10, menuW + 20, menuH + 20, 12);
  ctx.stroke();

  for (let i = 0; i < menuItems.length; i++) {
    const item = menuItems[i];
    const iy = my + 8 + i * itemH;
    const isSelected = i === sel;

    if (isSelected) {
      const sPulse = 0.6 + 0.4 * Math.sin(now * 0.004);
      ctx.fillStyle = `rgba(0, 255, 200, ${0.06 * sPulse})`;
      ctx.beginPath();
      ctx.roundRect(mx, iy, menuW, itemH - 6, 6);
      ctx.fill();
      ctx.fillStyle = item.color;
      ctx.fillRect(mx, iy + 4, 3, itemH - 14);
      ctx.fillStyle = "#00ffcc";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "left";
      ctx.fillText("\u25B8", mx + 12, iy + 24);
    }

    ctx.fillStyle = isSelected ? item.color : "rgba(255,255,255,0.45)";
    ctx.font = `${isSelected ? "bold " : ""}16px monospace`;
    ctx.textAlign = "left";
    ctx.fillText(item.label, mx + 32, iy + 24);

    if (item.desc && isSelected) {
      ctx.fillStyle = "rgba(170, 200, 220, 0.5)";
      ctx.font = "11px monospace";
      ctx.fillText(item.desc, mx + 32, iy + 40);
    }

    ctx.fillStyle = isSelected ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)";
    ctx.font = "11px monospace";
    ctx.textAlign = "right";
    ctx.fillText(item.key, mx + menuW - 8, iy + 24);
  }
  ctx.textAlign = "left";

  // Bottom hints
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.font = "11px monospace";
  ctx.textAlign = "center";
  ctx.fillText(
    "Practice on dummies while you decide  \u00B7  W/S to navigate  \u00B7  ENTER to select",
    w / 2,
    h - 30,
  );
  ctx.textAlign = "left";
}
