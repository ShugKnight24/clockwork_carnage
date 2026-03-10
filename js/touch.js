/**
 * Mobile Touch Controls for Clockwork Carnage
 *
 * Left side: Virtual joystick for movement (feeds game.keys)
 * Right side: Touch-drag area for look (feeds game.mouse.dx/dy)
 * Buttons: Fire, Dash, Interact, Chrono Shift, Sprint toggle, Pause
 *
 * Self-contained — call TouchControls.init(game) after game is created.
 * Only activates on touch-capable devices.
 */

import { UPGRADES } from "./data.js";

export class TouchControls {
  static init(game) {
    // Only activate on touch devices
    if (!("ontouchstart" in window)) return null;

    const tc = new TouchControls(game);
    tc.setup();
    return tc;
  }

  constructor(game) {
    this.game = game;

    // Joystick state
    this.joyTouch = null; // active touch ID
    this.joyOrigin = { x: 0, y: 0 };
    this.joyPos = { x: 0, y: 0 };
    this.joyActive = false;
    this.joyRadius = 60;

    // Look state
    this.lookTouch = null;
    this.lookLast = { x: 0, y: 0 };

    // Fire state
    this.fireTouch = null;

    // Layout zones (set on resize)
    this.zones = {};

    // Canvas for drawing touch controls
    this.canvas = null;
    this.ctx = null;

    // Track active button touches
    this.activeButtons = new Set();

    // Sprint toggle state (tap to toggle auto-sprint)
    this.sprintToggleActive = false;

    // Chrono shift touch tracking
    this.chronoTouch = null;

    // Cutscene hold-to-skip state
    this.cutsceneHoldTouch = null;
    this.cutsceneHoldStart = 0;

    // Mobile tutorial overlay state
    let tutorialDone = false;
    try {
      tutorialDone = !!localStorage.getItem("cc_touch_tutorial_done");
    } catch (_) {}
    this.showTutorial = !tutorialDone;
    this.tutorialDismissed = false;

    // Detect fullscreen API support (iPhone has none) — computed once, never changes
    this.canFullscreen =
      typeof document.documentElement.requestFullscreen === "function" ||
      typeof document.documentElement.webkitRequestFullscreen === "function";
    this.isStandalone =
      window.navigator.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
  }

  setup() {
    // Create overlay canvas for touch controls
    this.canvas = document.createElement("canvas");
    this.canvas.id = "touchCanvas";
    this.canvas.style.cssText =
      "position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:20;pointer-events:none;";
    document.body.appendChild(this.canvas);

    // Create touch-event catcher (above hudCanvas z-index:10, below touch canvas z-index:20)
    this.touchLayer = document.createElement("div");
    this.touchLayer.id = "touchLayer";
    this.touchLayer.style.cssText =
      "position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:15;touch-action:none;";
    document.body.appendChild(this.touchLayer);

    this.resize();
    window.addEventListener("resize", () => this.resize());

    // Touch events on the touch layer
    this.touchLayer.addEventListener(
      "touchstart",
      (e) => this.onTouchStart(e),
      { passive: false },
    );
    this.touchLayer.addEventListener("touchmove", (e) => this.onTouchMove(e), {
      passive: false,
    });
    this.touchLayer.addEventListener("touchend", (e) => this.onTouchEnd(e), {
      passive: false,
    });
    this.touchLayer.addEventListener("touchcancel", (e) => this.onTouchEnd(e), {
      passive: false,
    });

    // Override pointer lock for mobile — it's not supported/needed
    this.game.mouse.locked = true;

    // Hide cursor on mobile
    document.body.style.cursor = "none";
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w;
    this.canvas.height = h;

    // Define zones
    const btnSize = Math.min(64, w * 0.1);
    const pad = 20;
    this.zones = {
      w,
      h,
      btnSize,
      joyCenter: { x: 100, y: h - 140 },
      // Right side buttons
      fireBtn: {
        x: w - pad - btnSize * 2.5,
        y: h - pad - btnSize * 1.5,
        r: btnSize,
      },
      dashBtn: {
        x: w - pad - btnSize,
        y: h - pad - btnSize * 3,
        r: btnSize * 0.65,
      },
      interactBtn: {
        x: w - pad - btnSize * 3.5,
        y: h - pad - btnSize * 3,
        r: btnSize * 0.65,
      },
      // Chrono Shift (time slow) — above dash/interact cluster
      chronoBtn: {
        x: w - pad - btnSize * 2.2,
        y: h - pad - btnSize * 4.6,
        r: btnSize * 0.6,
      },
      // Sprint toggle — left side above joystick
      sprintBtn: {
        x: 70,
        y: h - 250,
        r: btnSize * 0.55,
      },
      pauseBtn: { x: w - 50, y: 40, r: 24 },
      fullscreenBtn: { x: w - 110, y: 40, r: 24 },
      // Divider: left half = movement, right half = look
      midX: w * 0.4,
    };
  }

  hitTest(x, y) {
    const z = this.zones;
    // Check buttons first (right side)
    if (this.dist(x, y, z.fireBtn.x, z.fireBtn.y) < z.fireBtn.r) return "fire";
    if (this.dist(x, y, z.dashBtn.x, z.dashBtn.y) < z.dashBtn.r) return "dash";
    if (this.dist(x, y, z.interactBtn.x, z.interactBtn.y) < z.interactBtn.r)
      return "interact";
    if (this.dist(x, y, z.chronoBtn.x, z.chronoBtn.y) < z.chronoBtn.r)
      return "chrono";
    if (this.dist(x, y, z.sprintBtn.x, z.sprintBtn.y) < z.sprintBtn.r)
      return "sprint";
    if (this.dist(x, y, z.pauseBtn.x, z.pauseBtn.y) < z.pauseBtn.r)
      return "pause";
    if (
      this.canFullscreen &&
      !this.isStandalone &&
      this.dist(x, y, z.fullscreenBtn.x, z.fullscreenBtn.y) < z.fullscreenBtn.r
    )
      return "fullscreen";
    // Left region = joystick, right region = look
    if (x < z.midX) return "joy";
    return "look";
  }

  dist(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
  }

  onTouchStart(e) {
    e.preventDefault();
    const g = this.game;

    // Dismiss mobile tutorial on any touch
    if (this.showTutorial && !this.tutorialDismissed && g.state === "playing") {
      this.tutorialDismissed = true;
      try {
        localStorage.setItem("cc_touch_tutorial_done", "1");
      } catch (_) {}
      return;
    }

    // Cutscene: tap to advance, track hold start for skip
    if (g.state === "cutscene") {
      if (e.changedTouches.length > 0) {
        this.cutsceneHoldTouch = e.changedTouches[0].identifier;
        this.cutsceneHoldStart = performance.now();
        g.advanceCutsceneFrame();
      }
      return;
    }

    // Campaign prompt / tutorial complete / game over / victory / level complete: tap to advance
    if (
      g.state === "campaignPrompt" ||
      g.state === "tutorialComplete" ||
      g.state === "gameOver" ||
      g.state === "victory" ||
      g.state === "levelComplete"
    ) {
      if (e.changedTouches.length > 0) {
        g.handleKeyPress("Enter");
      }
      return;
    }

    // Paused menu: route taps to key commands
    if (g.state === "paused") {
      if (e.changedTouches.length > 0) {
        this.handlePauseTap(e.changedTouches[0]);
      }
      return;
    }

    // Settings menu: route taps to navigation
    if (g.state === "settings") {
      if (e.changedTouches.length > 0) {
        this.handleSettingsTap(e.changedTouches[0]);
      }
      return;
    }

    // Upgrade screen: tap to navigate and select upgrades
    if (g.state === "upgrade") {
      if (e.changedTouches.length > 0) {
        this.handleUpgradeTap(e.changedTouches[0]);
      }
      return;
    }

    // Controls rebinding screen: tap to navigate and select
    if (g.state === "controls") {
      if (e.changedTouches.length > 0) {
        this.handleControlsTap(e.changedTouches[0]);
      }
      return;
    }

    for (const touch of e.changedTouches) {
      const x = touch.clientX;
      const y = touch.clientY;
      const zone = this.hitTest(x, y);

      if (zone === "joy" && this.joyTouch === null) {
        this.joyTouch = touch.identifier;
        this.joyOrigin = { x, y };
        this.joyPos = { x, y };
        this.joyActive = true;
      } else if (zone === "look" && this.lookTouch === null) {
        this.lookTouch = touch.identifier;
        this.lookLast = { x, y };
      } else if (zone === "fire" && this.fireTouch === null) {
        this.fireTouch = touch.identifier;
        g.player.isFiring = true;
        this.activeButtons.add("fire");
      } else if (zone === "dash") {
        // Trigger dash forward
        this.activeButtons.add("dash");
        g.triggerDash(g.keybinds.moveForward);
      } else if (zone === "interact") {
        this.activeButtons.add("interact");
        g.interact();
      } else if (zone === "chrono" && this.chronoTouch === null) {
        this.activeButtons.add("chrono");
        this.chronoTouch = touch.identifier;
        g.keys[g.keybinds.chronoShift] = true;
      } else if (zone === "sprint") {
        this.sprintToggleActive = !this.sprintToggleActive;
        this.activeButtons.add("sprint");
        g.keys[g.keybinds.sprint] = this.sprintToggleActive;
      } else if (zone === "fullscreen") {
        this.toggleFullscreen();
      } else if (zone === "pause") {
        this.activeButtons.add("pause");
        g.handleKeyPress("Escape");
      }
    }
  }

  onTouchMove(e) {
    e.preventDefault();

    // Hold-to-skip is checked every frame in game.js updateCutscene()
    // via this.cutsceneHoldTouch — no need to duplicate here.

    for (const touch of e.changedTouches) {
      if (touch.identifier === this.joyTouch) {
        this.joyPos = { x: touch.clientX, y: touch.clientY };
        this.updateJoystickKeys();
      } else if (touch.identifier === this.lookTouch) {
        const dx = touch.clientX - this.lookLast.x;
        const dy = touch.clientY - this.lookLast.y;
        // Feed into mouse look system (scaled for touch sensitivity from settings)
        let rawSens = Number(this.game.settings.touchSensitivity);
        if (!Number.isFinite(rawSens)) rawSens = 1.5;
        const touchSens = Math.min(3.0, Math.max(0.5, rawSens));
        this.game.mouse.dx += dx * touchSens;
        this.game.mouse.dy += dy * touchSens;
        this.lookLast = { x: touch.clientX, y: touch.clientY };
      }
    }
  }

  onTouchEnd(e) {
    e.preventDefault();

    // Clear cutscene hold
    if (this.cutsceneHoldTouch !== null) {
      for (const touch of e.changedTouches) {
        if (touch.identifier === this.cutsceneHoldTouch) {
          this.cutsceneHoldTouch = null;
          break;
        }
      }
    }

    for (const touch of e.changedTouches) {
      if (touch.identifier === this.joyTouch) {
        this.joyTouch = null;
        this.joyActive = false;
        this.clearMovementKeys();
      } else if (touch.identifier === this.lookTouch) {
        this.lookTouch = null;
      } else if (touch.identifier === this.fireTouch) {
        this.fireTouch = null;
        this.game.player.isFiring = false;
        this.activeButtons.delete("fire");
      } else if (touch.identifier === this.chronoTouch) {
        this.chronoTouch = null;
        this.game.keys[this.game.keybinds.chronoShift] = false;
        this.activeButtons.delete("chrono");
      }
    }
    // Clear transient buttons
    this.activeButtons.delete("dash");
    this.activeButtons.delete("interact");
    this.activeButtons.delete("pause");
    this.activeButtons.delete("sprint");
  }

  updateJoystickKeys() {
    const dx = this.joyPos.x - this.joyOrigin.x;
    const dy = this.joyPos.y - this.joyOrigin.y;
    const deadzone = 15;
    const kb = this.game.keybinds;

    this.game.keys[kb.moveForward] = dy < -deadzone;
    this.game.keys[kb.moveBack] = dy > deadzone;
    this.game.keys[kb.moveLeft] = dx < -deadzone;
    this.game.keys[kb.moveRight] = dx > deadzone;

    // Sprint if toggle is active OR joystick pushed far enough
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.game.keys[kb.sprint] =
      this.sprintToggleActive || dist > this.joyRadius * 1.2;
  }

  clearMovementKeys() {
    const kb = this.game.keybinds;
    this.game.keys[kb.moveForward] = false;
    this.game.keys[kb.moveBack] = false;
    this.game.keys[kb.moveLeft] = false;
    this.game.keys[kb.moveRight] = false;
    // Preserve sprint toggle state
    this.game.keys[kb.sprint] = this.sprintToggleActive;
  }

  handlePauseTap(touch) {
    const w = this.zones.w;
    const h = this.zones.h;
    const x = touch.clientX;
    const y = touch.clientY;
    // Pause menu touch buttons are rendered in a row at h/2 + 130
    const btnY = h / 2 + 115;
    const btnH = 50;
    const btnW = 90;
    const gap = 10;
    const labels = ["RESUME", "SETTINGS", "CONTROLS", "QUIT"];
    const totalW = labels.length * btnW + (labels.length - 1) * gap;
    const startX = (w - totalW) / 2;

    if (y >= btnY && y <= btnY + btnH) {
      for (let i = 0; i < labels.length; i++) {
        const bx = startX + i * (btnW + gap);
        if (x >= bx && x <= bx + btnW) {
          if (i === 0)
            this.game.handleKeyPress("Escape"); // Resume
          else if (i === 1)
            this.game.handleKeyPress("KeyS"); // Settings
          else if (i === 2)
            this.game.handleKeyPress("KeyC"); // Controls
          else if (i === 3) this.game.handleKeyPress("KeyQ"); // Quit
          return;
        }
      }
    }
    // Save button for campaign (below main row)
    if (this.game.mode === "campaign") {
      const saveY = btnY + btnH + 10;
      const saveBtnW = 100;
      const saveX = (w - saveBtnW) / 2;
      if (
        y >= saveY &&
        y <= saveY + 40 &&
        x >= saveX &&
        x <= saveX + saveBtnW
      ) {
        this.game.handleKeyPress("KeyF");
      }
    }
  }

  handleSettingsTap(touch) {
    const hud = this.game.hudCanvas;
    const scaleX = hud.width / window.innerWidth;
    const scaleY = hud.height / window.innerHeight;
    const w = hud.width;
    const h = hud.height;
    const x = touch.clientX * scaleX;
    const y = touch.clientY * scaleY;
    const panelX = w / 2 - 220;
    const panelW = 440;
    const itemHeights = [44, 70, 60, 60, 60, 60, 60, 44, 44, 44, 44];
    let startY = h / 2 - 155;

    // Check if tap is in the "Back" area (bottom)
    const totalH = itemHeights.reduce((a, b) => a + b, 0);
    if (y > startY + totalH) {
      this.game.handleKeyPress("Escape");
      return;
    }

    // Find which setting was tapped
    for (let i = 0; i < itemHeights.length; i++) {
      if (
        y >= startY &&
        y <= startY + itemHeights[i] &&
        x >= panelX &&
        x <= panelX + panelW
      ) {
        this.game.settingsSelection = i;
        // Left half = decrease, right half = increase
        if (x < w / 2) {
          this.game.handleKeyPress("ArrowLeft");
        } else {
          this.game.handleKeyPress("ArrowRight");
        }
        return;
      }
      startY += itemHeights[i];
    }
  }

  handleUpgradeTap(touch) {
    const hud = this.game.hudCanvas;
    const scaleX = hud.width / window.innerWidth;
    const scaleY = hud.height / window.innerHeight;
    const w = hud.width;
    const x = touch.clientX * scaleX;
    const y = touch.clientY * scaleY;

    const g = this.game;
    const upgradeKeys = Object.keys(UPGRADES);
    const cols = 2;
    const startY = 140;
    const lineH = 50;
    const colW = 340;
    const leftX = w / 2 - colW - 15;
    const totalRows = Math.ceil(upgradeKeys.length / cols);
    const contY = startY + totalRows * lineH + 25;

    // Check continue button area
    if (y >= contY - 15 && y <= contY + 15) {
      g.upgradeSelection = upgradeKeys.length;
      g.handleKeyPress("Enter");
      return;
    }

    // Check upgrade grid
    for (let i = 0; i < upgradeKeys.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const baseX = col === 0 ? leftX : w / 2 + 15;
      const uy = startY + row * lineH;
      if (
        x >= baseX - 5 &&
        x <= baseX + colW - 5 &&
        y >= uy - 16 &&
        y <= uy + lineH - 18
      ) {
        g.upgradeSelection = i;
        g.handleKeyPress("Enter");
        return;
      }
    }
  }

  handleControlsTap(touch) {
    const hud = this.game.hudCanvas;
    const scaleX = hud.width / window.innerWidth;
    const scaleY = hud.height / window.innerHeight;
    const w = hud.width;
    const x = touch.clientX * scaleX;
    const y = touch.clientY * scaleY;

    const g = this.game;
    if (g.rebindingKey) return; // rebinding handled by keyboard

    const bindKeys = Object.keys(g.keybinds);
    const panelX = w / 2 - 240;
    const panelW = 480;
    const itemH = 36;
    const startY = 100;

    // Check each binding row
    for (let i = 0; i < bindKeys.length; i++) {
      const ry = startY + i * itemH;
      if (
        x >= panelX &&
        x <= panelX + panelW &&
        y >= ry - 2 &&
        y <= ry + itemH - 6
      ) {
        g.controlsSelection = i;
        g.handleKeyPress("Enter");
        return;
      }
    }

    // Check "Reset Defaults" button
    const resetY = startY + bindKeys.length * itemH + 10;
    if (
      x >= panelX &&
      x <= panelX + panelW &&
      y >= resetY - 2 &&
      y <= resetY + itemH - 6
    ) {
      g.controlsSelection = bindKeys.length;
      g.handleKeyPress("Enter");
      return;
    }

    // Tap outside = back
    g.handleKeyPress("Escape");
  }

  render() {
    const ctx = this.ctx || (this.ctx = this.canvas.getContext("2d"));
    const z = this.zones;
    ctx.clearRect(0, 0, z.w, z.h);

    const gs = this.game.state;

    // Draw pause menu touch buttons
    if (gs === "paused") {
      this.renderPauseButtons(ctx);
      return;
    }

    // Draw settings back button hint
    if (gs === "settings") {
      this.renderSettingsHint(ctx);
      return;
    }

    // Nothing to draw during cutscenes (prompts are in game.js)
    if (gs !== "playing") return;

    // First-launch mobile tutorial overlay
    if (this.showTutorial && !this.tutorialDismissed) {
      this.renderTouchTutorial(ctx);
      return;
    }

    ctx.globalAlpha = 0.35;

    // ── Joystick ──
    const jc = this.joyActive ? this.joyOrigin : z.joyCenter;
    // Outer ring
    ctx.beginPath();
    ctx.arc(jc.x, jc.y, this.joyRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "#00ccff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner stick
    let sx = jc.x,
      sy = jc.y;
    if (this.joyActive) {
      const dx = this.joyPos.x - jc.x;
      const dy = this.joyPos.y - jc.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clamped = Math.min(dist, this.joyRadius);
      if (dist > 0) {
        sx = jc.x + (dx / dist) * clamped;
        sy = jc.y + (dy / dist) * clamped;
      }
    }
    ctx.beginPath();
    ctx.arc(sx, sy, 22, 0, Math.PI * 2);
    ctx.fillStyle = "#00ccff";
    ctx.fill();

    // ── Fire button ──
    this.drawButton(
      ctx,
      z.fireBtn.x,
      z.fireBtn.y,
      z.fireBtn.r,
      "FIRE",
      this.activeButtons.has("fire") ? "#ff4444" : "#ff6644",
    );

    // ── Dash button ──
    this.drawButton(
      ctx,
      z.dashBtn.x,
      z.dashBtn.y,
      z.dashBtn.r,
      "DASH",
      this.activeButtons.has("dash") ? "#44ffff" : "#00cccc",
    );

    // ── Interact button ──
    this.drawButton(
      ctx,
      z.interactBtn.x,
      z.interactBtn.y,
      z.interactBtn.r,
      "USE",
      this.activeButtons.has("interact") ? "#44ff44" : "#00cc44",
    );

    // ── Chrono Shift button ──
    const chronoActive = this.game.player && this.game.player.chronoActive;
    this.drawButton(
      ctx,
      z.chronoBtn.x,
      z.chronoBtn.y,
      z.chronoBtn.r,
      "SLOW",
      chronoActive
        ? "#cc44ff"
        : this.activeButtons.has("chrono")
          ? "#aa44dd"
          : "#9944ff",
    );

    // ── Sprint toggle button (left side) ──
    this.drawButton(
      ctx,
      z.sprintBtn.x,
      z.sprintBtn.y,
      z.sprintBtn.r,
      this.sprintToggleActive ? "RUN" : "WALK",
      this.sprintToggleActive ? "#ffaa00" : "#887744",
    );

    // ── Pause button (top-right) ──
    ctx.beginPath();
    ctx.arc(z.pauseBtn.x, z.pauseBtn.y, z.pauseBtn.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("II", z.pauseBtn.x, z.pauseBtn.y);

    // ── Fullscreen button (top-right, next to pause) — hidden when API unavailable ──
    if (this.canFullscreen && !this.isStandalone) {
      const isFS = !!(
        document.fullscreenElement || document.webkitFullscreenElement
      );
      ctx.beginPath();
      ctx.arc(
        z.fullscreenBtn.x,
        z.fullscreenBtn.y,
        z.fullscreenBtn.r,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = isFS ? "rgba(0,255,200,0.35)" : "rgba(255,255,255,0.3)";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px monospace";
      ctx.fillText(isFS ? "⊡" : "⊞", z.fullscreenBtn.x, z.fullscreenBtn.y);
    }

    ctx.globalAlpha = 1;
  }

  renderTouchTutorial(ctx) {
    const w = this.zones.w;
    const h = this.zones.h;

    // Semi-transparent overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Title
    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 24px monospace";
    ctx.fillText("TOUCH CONTROLS", w / 2, 50);

    // Left side: joystick
    ctx.fillStyle = "rgba(0, 200, 255, 0.2)";
    ctx.fillRect(0, 80, w * 0.4, h - 160);
    ctx.fillStyle = "#00ccff";
    ctx.font = "bold 16px monospace";
    ctx.fillText("MOVE", w * 0.2, h / 2 - 40);
    ctx.fillStyle = "#aabbcc";
    ctx.font = "14px monospace";
    ctx.fillText("Left stick", w * 0.2, h / 2 - 15);
    ctx.fillText("Push far to sprint", w * 0.2, h / 2 + 5);

    // Right side: look
    ctx.fillStyle = "rgba(0, 200, 255, 0.1)";
    ctx.fillRect(w * 0.4, 80, w * 0.6, h - 160);
    ctx.fillStyle = "#00ccff";
    ctx.font = "bold 16px monospace";
    ctx.fillText("LOOK", w * 0.7, h / 2 - 40);
    ctx.fillStyle = "#aabbcc";
    ctx.font = "14px monospace";
    ctx.fillText("Drag to aim", w * 0.7, h / 2 - 15);

    // Button hints
    const hints = [
      { label: "FIRE", desc: "Big button", color: "#ff6644", y: h - 145 },
      { label: "DASH", desc: "Top-right", color: "#00cccc", y: h - 120 },
      { label: "USE", desc: "Top-left", color: "#00cc44", y: h - 95 },
      { label: "SLOW", desc: "Time slow", color: "#9944ff", y: h - 70 },
      { label: "RUN/WALK", desc: "Sprint toggle", color: "#ffaa00", y: h - 45 },
    ];
    for (const hint of hints) {
      ctx.fillStyle = hint.color;
      ctx.font = "bold 14px monospace";
      ctx.fillText(`${hint.label} — ${hint.desc}`, w / 2, hint.y);
    }

    // Dismiss prompt
    const pulse = 0.5 + 0.3 * Math.sin(performance.now() / 400);
    ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
    ctx.font = "bold 16px monospace";
    ctx.fillText("TAP ANYWHERE TO START", w / 2, h - 30);
  }

  renderPauseButtons(ctx) {
    const w = this.zones.w;
    const h = this.zones.h;
    const btnY = h / 2 + 115;
    const btnH = 50;
    const btnW = 90;
    const gap = 10;
    const labels = ["RESUME", "SETTINGS", "CONTROLS", "QUIT"];
    const colors = ["#00ccff", "#88aaff", "#aabbcc", "#ff4444"];
    const totalW = labels.length * btnW + (labels.length - 1) * gap;
    const startX = (w - totalW) / 2;

    ctx.globalAlpha = 0.7;
    for (let i = 0; i < labels.length; i++) {
      const bx = startX + i * (btnW + gap);
      ctx.fillStyle = colors[i];
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, btnY, btnW, btnH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labels[i], bx + btnW / 2, btnY + btnH / 2);
    }

    if (this.game.mode === "campaign") {
      const saveY = btnY + btnH + 10;
      const saveBtnW = 100;
      const saveX = (w - saveBtnW) / 2;
      ctx.fillStyle = "#00aa44";
      ctx.beginPath();
      ctx.roundRect(saveX, saveY, saveBtnW, 40, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.fillText("SAVE", saveX + saveBtnW / 2, saveY + 20);
    }
    ctx.globalAlpha = 1;
  }

  renderSettingsHint(ctx) {
    const w = this.zones.w;
    const h = this.zones.h;
    ctx.globalAlpha = 0.6;
    // Back button at bottom
    const btnW = 120;
    const btnH = 44;
    const bx = (w - btnW) / 2;
    const by = h - 60;
    ctx.fillStyle = "#556677";
    ctx.strokeStyle = "#aabbcc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, btnW, btnH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("< BACK", bx + btnW / 2, by + btnH / 2);
    // Hint text
    ctx.fillStyle = "#8899aa";
    ctx.font = "12px monospace";
    ctx.fillText(
      "Tap setting to change  ·  Left = decrease  ·  Right = increase",
      w / 2,
      by - 12,
    );
    ctx.globalAlpha = 1;
  }

  toggleFullscreen() {
    if (!this.canFullscreen || this.isStandalone) return;
    const el = document.fullscreenElement || document.webkitFullscreenElement;
    let p;
    if (el) {
      p = document.exitFullscreen
        ? document.exitFullscreen()
        : document.webkitExitFullscreen
          ? document.webkitExitFullscreen()
          : undefined;
    } else {
      const root = document.documentElement;
      p = root.requestFullscreen
        ? root.requestFullscreen()
        : root.webkitRequestFullscreen
          ? root.webkitRequestFullscreen()
          : undefined;
    }
    if (p && typeof p.catch === "function") p.catch(() => {});
  }

  drawButton(ctx, x, y, r, label, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.max(12, r * 0.45)}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y);
  }
}
