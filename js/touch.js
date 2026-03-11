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

import { UPGRADES, WEAPONS } from "./data.js";

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

    // Joystick state — floating origin: spawns where thumb touches
    this.joyTouch = null; // active touch ID
    this.joyOrigin = { x: 0, y: 0 };
    this.joyPos = { x: 0, y: 0 };
    this.joyActive = false;
    this.joyRadius = window.innerHeight < 420 ? 45 : 60;

    // Look state
    this.lookTouch = null;
    this.lookLast = { x: 0, y: 0 };

    // Fire state
    this.fireTouch = null;

    // Layout zones (set on resize)
    this.zones = {};

    // Safe area insets (iPhone X+ notch/Dynamic Island)
    this.safeArea = { top: 0, right: 0, bottom: 0, left: 0 };

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

    this._updateSafeArea();
    const sa = this.safeArea;

    // Compact phone detection: landscape phone with short viewport
    const isCompactPhone = h < 420;

    // Button sizing base — smallest derived target (sprint: 0.55×btnSize×2)
    // stays ≥ 44px (Apple HIG) thanks to this floor
    // On compact phones, slightly smaller buttons to avoid crowding
    const btnSize = isCompactPhone
      ? Math.max(40, Math.min(46, w * 0.07))
      : Math.max(44, Math.min(56, w * 0.09));
    const pad = (isCompactPhone ? 10 : 14) + sa.right;
    const bottomPad = (isCompactPhone ? 8 : 14) + sa.bottom;

    // Default joystick hint center (shown when no thumb is on left zone)
    const joyHintX = Math.max(80, 60 + sa.left);
    const joyHintY = isCompactPhone ? h - 90 - sa.bottom : h - 140 - sa.bottom;

    this.zones = {
      w,
      h,
      btnSize,
      isCompactPhone,
      // Hint position for joystick (shown when not touching)
      joyCenter: { x: joyHintX, y: joyHintY },
      // Right side buttons — fire is large and accessible, others spaced around it
      fireBtn: {
        x: w - pad - btnSize * 1.6,
        y: isCompactPhone
          ? h - bottomPad - btnSize * 1.0
          : h - bottomPad - btnSize * 1.3,
        r: btnSize,
      },
      dashBtn: {
        x: w - pad - btnSize * 0.5,
        y: isCompactPhone
          ? h - bottomPad - btnSize * 2.5
          : h - bottomPad - btnSize * 3.2,
        r: btnSize * 0.65,
      },
      interactBtn: {
        x: w - pad - btnSize * 2.9,
        y: isCompactPhone
          ? h - bottomPad - btnSize * 2.5
          : h - bottomPad - btnSize * 3.2,
        r: btnSize * 0.65,
      },
      // Sprint toggle — left side above joystick
      sprintBtn: {
        x: Math.max(60, 42 + sa.left),
        y: isCompactPhone ? h - 170 - sa.bottom : h - 260 - sa.bottom,
        r: btnSize * 0.55,
      },
      // Chrono Shift (time slow) — left side above sprint
      chronoBtn: {
        x: Math.max(60, 42 + sa.left),
        y: isCompactPhone ? h - 240 - sa.bottom : h - 350 - sa.bottom,
        r: btnSize * 0.6,
      },
      // Weapon cycle — left of fire, easily reachable by right thumb
      weaponBtn: {
        x: w - pad - btnSize * 3.2,
        y: isCompactPhone
          ? h - bottomPad - btnSize * 1.0
          : h - bottomPad - btnSize * 1.3,
        r: btnSize * 0.55,
      },
      pauseBtn: {
        x: w - 50 - sa.right,
        y: (isCompactPhone ? 28 : 40) + sa.top,
        r: isCompactPhone ? 22 : 26,
      },
      fullscreenBtn: {
        x: w - 110 - sa.right,
        y: (isCompactPhone ? 28 : 40) + sa.top,
        r: isCompactPhone ? 22 : 26,
      },
      // Divider: left quarter = movement, rest = look
      midX: w * 0.28,
    };
  }

  /** Read CSS custom property safe area insets (iPhone X+ notch, Dynamic Island) */
  _updateSafeArea() {
    try {
      const style = getComputedStyle(document.documentElement);
      const parse = (prop) => parseInt(style.getPropertyValue(prop), 10) || 0;
      this.safeArea = {
        top: parse("--sat"),
        right: parse("--sar"),
        bottom: parse("--sab"),
        left: parse("--sal"),
      };
    } catch (_) {
      // Fallback: no safe area
    }
  }

  hitTest(x, y) {
    const z = this.zones;
    // Use tighter hit radii than visual radii for buttons
    // so dragging to look doesn't accidentally trigger buttons
    const hitShrink = 0.85;
    if (this.dist(x, y, z.fireBtn.x, z.fireBtn.y) < z.fireBtn.r * hitShrink)
      return "fire";
    if (this.dist(x, y, z.dashBtn.x, z.dashBtn.y) < z.dashBtn.r * hitShrink)
      return "dash";
    if (
      this.dist(x, y, z.interactBtn.x, z.interactBtn.y) <
      z.interactBtn.r * hitShrink
    )
      return "interact";
    if (
      this.dist(x, y, z.chronoBtn.x, z.chronoBtn.y) <
      z.chronoBtn.r * hitShrink
    )
      return "chrono";
    if (
      this.dist(x, y, z.sprintBtn.x, z.sprintBtn.y) <
      z.sprintBtn.r * hitShrink
    )
      return "sprint";
    if (
      this.dist(x, y, z.weaponBtn.x, z.weaponBtn.y) <
      z.weaponBtn.r * hitShrink
    )
      return "weapon";
    if (this.dist(x, y, z.pauseBtn.x, z.pauseBtn.y) < z.pauseBtn.r * hitShrink)
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

    // Tutorial completion: route taps to menu items
    if (g.state === "tutorialComplete") {
      if (e.changedTouches.length > 0) {
        this.handleTutorialCompleteTap(e.changedTouches[0]);
      }
      return;
    }

    // Campaign prompt / game over / victory / level complete: tap to advance
    if (
      g.state === "campaignPrompt" ||
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

    // Character creator: forward taps for tab/item clicks + nav
    if (g.state === "characterCreate") {
      if (e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        const w = this.zones.w;
        const h = this.zones.h;
        const bounds = this._creatorButtonBounds(w, h);
        // SAVE button (exact rendered bounds)
        if (
          t.clientX >= bounds.saveX &&
          t.clientX <= bounds.saveX + bounds.btnW &&
          t.clientY >= bounds.btnY &&
          t.clientY <= bounds.btnY + bounds.btnH
        ) {
          g.audio.menuConfirm();
          g._exitCreator(true);
          return;
        }
        // CANCEL button (exact rendered bounds)
        if (
          t.clientX >= bounds.cancelX &&
          t.clientX <= bounds.cancelX + bounds.btnW &&
          t.clientY >= bounds.btnY &&
          t.clientY <= bounds.btnY + bounds.btnH
        ) {
          g.audio.menuConfirm();
          g._exitCreator(false);
          return;
        }
        // Left/right edge taps = switch tab (near arrow affordance at y≈72)
        if (t.clientY > 40 && t.clientY < 110) {
          const catLen = g.creatorCategoryCount || 6;
          if (t.clientX < 60) {
            g.creatorCategory = (g.creatorCategory - 1 + catLen) % catLen;
            g.audio.menuSelect();
            return;
          }
          if (t.clientX > w - 60) {
            g.creatorCategory = (g.creatorCategory + 1) % catLen;
            g.audio.menuSelect();
            return;
          }
        }
        // Forward to creator click handler (tab and item taps)
        g._handleCreatorClick({ clientX: t.clientX, clientY: t.clientY });
      }
      return;
    }

    for (const touch of e.changedTouches) {
      const x = touch.clientX;
      const y = touch.clientY;
      const zone = this.hitTest(x, y);

      if (zone === "joy" && this.joyTouch === null) {
        // Floating joystick: origin spawns at touch point, not fixed position
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
        this.activeButtons.add("dash");
        // Dash in current movement direction (from joystick or keys)
        const kb = g.keybinds;
        const fwd = g.keys[kb.moveForward];
        const back = g.keys[kb.moveBack];
        const left = g.keys[kb.moveLeft];
        const right = g.keys[kb.moveRight];
        const hasDir = fwd || back || left || right;
        if (hasDir) {
          const cos = Math.cos(g.player.angle);
          const sin = Math.sin(g.player.angle);
          let dX = 0, dY = 0;
          if (fwd)   { dX += cos;  dY += sin; }
          if (back)  { dX -= cos;  dY -= sin; }
          if (left)  { dX += sin;  dY -= cos; }
          if (right) { dX -= sin;  dY += cos; }
          const len = Math.sqrt(dX * dX + dY * dY);
          if (len > 0) { dX /= len; dY /= len; }
          g.triggerDash(null, dX, dY);
        } else {
          g.triggerDash(g.keybinds.moveForward);
        }
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
      } else if (zone === "weapon") {
        this.activeButtons.add("weapon");
        const p = g.player;
        if (p.weapons.length > 1) {
          p.currentWeapon = (p.currentWeapon + 1) % p.weapons.length;
          g.triggerAriaOnce("weaponSwitch", "weaponSwitch");
        }
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
    this.activeButtons.delete("weapon");
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
    const isCompact = this.zones.isCompactPhone;
    const x = touch.clientX;
    const y = touch.clientY;
    // Pause menu touch buttons are rendered in a row
    const btnY = isCompact ? h * 0.55 : h / 2 + 115;
    const btnH = isCompact ? 40 : 50;
    const btnW = Math.max(44, Math.min(isCompact ? 80 : 90, (w - 60) / 4 - 10));
    const gap = isCompact ? 6 : 10;
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

  handleTutorialCompleteTap(touch) {
    const g = this.game;
    const w = this.zones.w;
    const h = this.zones.h;
    const x = touch.clientX;
    const y = touch.clientY;

    // Menu layout must match renderTutorialCompletionMenu in game.js
    const menuW = Math.min(360, w - 40);
    const itemH = 52;
    const menuItems = 4;
    const mx = (w - menuW) / 2;
    const my = h * 0.35;

    for (let i = 0; i < menuItems; i++) {
      const iy = my + 8 + i * itemH;
      if (x >= mx && x <= mx + menuW && y >= iy && y <= iy + itemH - 6) {
        g.tutorialMenuSelection = i;
        g.audio.menuConfirm();
        g.executeTutorialCompletionChoice(i);
        return;
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
    const compactSettings = this.game.isTouchDevice && h < 420;
    const panelW = compactSettings ? Math.min(w - 20, 380) : 440;
    const panelX = w / 2 - panelW / 2;
    const itemHeights = compactSettings
      ? [30, 50, 42, 42, 42, 42, 42, 30, 30, 30, 30, 42, 42, 30, 30, 30, 30, 42]
      : [
          44, 70, 60, 60, 60, 60, 60, 44, 44, 44, 44, 60, 60, 44, 44, 44, 44,
          60,
        ];

    // Scroll-aware startY — must match renderSettingsScreen in game.js
    const totalH = itemHeights.reduce((a, b) => a + b, 0);
    const visibleH = h - (compactSettings ? 60 : 120);
    const titleAreaY = compactSettings ? 28 : 50;
    let startY = titleAreaY + (compactSettings ? 20 : 40);
    if (totalH > visibleH) {
      let selTop = 0;
      for (let si = 0; si < this.game.settingsSelection; si++)
        selTop += itemHeights[si];
      const selCenter = selTop + itemHeights[this.game.settingsSelection] / 2;
      const idealOffset = visibleH / 2 - selCenter;
      const maxOffset = 0;
      const minOffset = visibleH - totalH;
      startY += Math.max(minOffset, Math.min(maxOffset, idealOffset));
    }
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
    const h = hud.height;
    const x = touch.clientX * scaleX;
    const y = touch.clientY * scaleY;

    const g = this.game;
    const upgradeKeys = Object.keys(UPGRADES);
    const cols = 2;
    // Must match renderUpgradeScreen in game.js
    const compactUpg = this.game.isTouchDevice && h < 420;
    const headerY = compactUpg ? 14 : 40;
    const startY = headerY + (compactUpg ? 30 : 90);
    const cardH = compactUpg ? 40 : 64;
    const cardGap = compactUpg ? 3 : 6;
    const colW = compactUpg ? Math.min(280, Math.floor((w - 36) / 2)) : 320;
    const leftX = w / 2 - colW - (compactUpg ? 6 : 12);
    const totalRows = Math.ceil(upgradeKeys.length / cols);
    const contY = startY + totalRows * (cardH + cardGap) + 20;

    // Check continue button area
    if (y >= contY - 18 && y <= contY + 18) {
      g.upgradeSelection = upgradeKeys.length;
      g.handleKeyPress("Enter");
      return;
    }

    // Check upgrade grid
    for (let i = 0; i < upgradeKeys.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const baseX = col === 0 ? leftX : w / 2 + 12;
      const uy = startY + row * (cardH + cardGap);
      if (x >= baseX && x <= baseX + colW && y >= uy && y <= uy + cardH) {
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

    // Character creator: draw save/cancel buttons + nav arrows
    if (gs === "characterCreate") {
      this.renderCreatorOverlay(ctx);
      return;
    }

    // Nothing to draw during cutscenes or other non-playing states
    if (gs !== "playing") return;

    // First-launch mobile tutorial overlay
    if (this.showTutorial && !this.tutorialDismissed) {
      this.renderTouchTutorial(ctx);
      return;
    }

    ctx.globalAlpha = 0.35;

    // ── Look zone hint (fades after 5 seconds) ──
    if (!this._lookHintStart) this._lookHintStart = performance.now();
    const lookHintAge = (performance.now() - this._lookHintStart) / 1000;
    if (lookHintAge < 6) {
      const hintAlpha = lookHintAge < 5 ? 0.12 : 0.12 * (6 - lookHintAge);
      ctx.globalAlpha = hintAlpha;
      ctx.fillStyle = "#00ccff";
      ctx.font = "14px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("↔ DRAG TO LOOK ↔", z.w * 0.55, z.h * 0.35);
      ctx.globalAlpha = 0.35;
    }

    // ── Joystick (floating: ghost ring when idle, active ring at touch origin) ──
    if (this.joyActive) {
      // Active joystick at touch origin
      const jc = this.joyOrigin;
      ctx.beginPath();
      ctx.arc(jc.x, jc.y, this.joyRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "#00ccff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner stick follows thumb
      const dx = this.joyPos.x - jc.x;
      const dy = this.joyPos.y - jc.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clamped = Math.min(dist, this.joyRadius);
      let sx = jc.x,
        sy = jc.y;
      if (dist > 0) {
        sx = jc.x + (dx / dist) * clamped;
        sy = jc.y + (dy / dist) * clamped;
      }
      ctx.beginPath();
      ctx.arc(sx, sy, 22, 0, Math.PI * 2);
      ctx.fillStyle = "#00ccff";
      ctx.fill();
    } else {
      // Ghost joystick ring at default position (hint)
      const jc = z.joyCenter;
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.arc(jc.x, jc.y, this.joyRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "#00ccff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(jc.x, jc.y, 22, 0, Math.PI * 2);
      ctx.fillStyle = "#00ccff";
      ctx.fill();
      ctx.globalAlpha = 0.35;
    }

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

    // ── Weapon cycle button ──
    {
      const p = this.game.player;
      if (p) {
        const wDef = WEAPONS[p.weapons[p.currentWeapon]];
        const wName = wDef ? wDef.name.split(" ")[0].toUpperCase() : "W1";
        this.drawButton(
          ctx,
          z.weaponBtn.x,
          z.weaponBtn.y,
          z.weaponBtn.r,
          wName,
          this.activeButtons.has("weapon") ? "#ffdd44" : "#aa8833",
        );
      }
    }

    // ── Pause / Menu button (top-right) ──
    this.drawButton(
      ctx,
      z.pauseBtn.x,
      z.pauseBtn.y,
      z.pauseBtn.r,
      "II",
      this.activeButtons.has("pause") ? "#ffffff" : "rgba(200,200,200,0.5)",
    );

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
    const isCompact = this.zones.isCompactPhone;

    // Semi-transparent overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Title
    ctx.fillStyle = "#00ffcc";
    ctx.font = `bold ${isCompact ? 18 : 24}px monospace`;
    ctx.fillText("TOUCH CONTROLS", w / 2, isCompact ? 24 : 50);

    const zoneTop = isCompact ? 42 : 80;
    const zoneH = isCompact ? h - 80 : h - 160;

    // Left side: joystick
    ctx.fillStyle = "rgba(0, 200, 255, 0.2)";
    ctx.fillRect(0, zoneTop, w * 0.4, zoneH);
    ctx.fillStyle = "#00ccff";
    ctx.font = `bold ${isCompact ? 13 : 16}px monospace`;
    ctx.fillText("MOVE", w * 0.2, h / 2 - (isCompact ? 24 : 40));
    ctx.fillStyle = "#aabbcc";
    ctx.font = `${isCompact ? 11 : 14}px monospace`;
    ctx.fillText("Touch to place stick", w * 0.2, h / 2 - (isCompact ? 8 : 15));
    if (!isCompact) ctx.fillText("Push far to sprint", w * 0.2, h / 2 + 5);

    // Right side: look
    ctx.fillStyle = "rgba(0, 200, 255, 0.1)";
    ctx.fillRect(w * 0.4, zoneTop, w * 0.6, zoneH);
    ctx.fillStyle = "#00ccff";
    ctx.font = `bold ${isCompact ? 13 : 16}px monospace`;
    ctx.fillText("LOOK", w * 0.7, h / 2 - (isCompact ? 24 : 40));
    ctx.fillStyle = "#aabbcc";
    ctx.font = `${isCompact ? 11 : 14}px monospace`;
    ctx.fillText("Drag to aim", w * 0.7, h / 2 - (isCompact ? 8 : 15));

    // Button hints
    const hintFont = isCompact ? 11 : 14;
    const hintGap = isCompact ? 16 : 25;
    const hintBase = isCompact ? h - 80 : h - 145;
    const hints = [
      { label: "FIRE", desc: "Big button", color: "#ff6644" },
      { label: "DASH", desc: "Top-right", color: "#00cccc" },
      { label: "USE", desc: "Top-left", color: "#00cc44" },
      { label: "SLOW", desc: "Time slow", color: "#9944ff" },
      { label: "RUN/WALK", desc: "Sprint toggle", color: "#ffaa00" },
    ];
    for (let i = 0; i < hints.length; i++) {
      ctx.fillStyle = hints[i].color;
      ctx.font = `bold ${hintFont}px monospace`;
      ctx.fillText(
        `${hints[i].label} — ${hints[i].desc}`,
        w / 2,
        hintBase + i * hintGap,
      );
    }

    // Dismiss prompt
    const pulse = 0.5 + 0.3 * Math.sin(performance.now() / 400);
    ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
    ctx.font = `bold ${isCompact ? 13 : 16}px monospace`;
    ctx.fillText("TAP ANYWHERE TO START", w / 2, h - (isCompact ? 12 : 30));
  }

  renderCreatorOverlay(ctx) {
    const w = this.zones.w;
    const h = this.zones.h;
    const bounds = this._creatorButtonBounds(w, h);
    const { btnH, btnW, btnY, saveX, cancelX } = bounds;

    ctx.globalAlpha = 0.9;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // SAVE button (bottom right)
    ctx.fillStyle = "rgba(0, 180, 80, 0.5)";
    ctx.beginPath();
    ctx.roundRect(saveX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.strokeStyle = "#00cc66";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(saveX, btnY, btnW, btnH, 8);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px monospace";
    ctx.fillText("\u2713 SAVE", saveX + btnW / 2, btnY + btnH / 2);

    // CANCEL button (bottom left)
    ctx.fillStyle = "rgba(180, 40, 40, 0.4)";
    ctx.beginPath();
    ctx.roundRect(cancelX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.strokeStyle = "#cc3333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cancelX, btnY, btnW, btnH, 8);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px monospace";
    ctx.fillText("\u2717 BACK", cancelX + btnW / 2, btnY + btnH / 2);

    // Tab navigation arrows — wider tap targets
    ctx.font = "bold 36px monospace";
    ctx.fillStyle = "rgba(0, 255, 200, 0.6)";
    ctx.fillText("\u25C0", 30, 72);
    ctx.fillText("\u25B6", w - 30, 72);

    // Hint text
    ctx.font = "11px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillText(
      "Tap tabs \u00B7 \u25C0 \u25B6 to switch \u00B7 Tap items to select",
      w / 2,
      btnY - 12,
    );

    ctx.globalAlpha = 1;
  }

  /** Shared creator button bounds — used by both touch handler and renderer */
  _creatorButtonBounds(w, h) {
    const sa = this.safeArea;
    const btnH = 52;
    const btnW = Math.min(140, Math.max(110, w * 0.18));
    const gap = 16;
    const btnY = h - btnH - 16 - sa.bottom;
    const saveX = w / 2 + gap / 2;
    const cancelX = w / 2 - gap / 2 - btnW;
    return { btnH, btnW, gap, btnY, saveX, cancelX };
  }

  renderPauseButtons(ctx) {
    const w = this.zones.w;
    const h = this.zones.h;
    const isCompact = this.zones.isCompactPhone;
    const btnY = isCompact ? h * 0.55 : h / 2 + 115;
    const btnH = isCompact ? 40 : 50;
    const btnW = Math.max(44, Math.min(isCompact ? 80 : 90, (w - 60) / 4 - 10));
    const gap = isCompact ? 6 : 10;
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
