/**
 * Mobile Touch Controls for Clockwork Carnage
 *
 * Left side: Virtual joystick for movement (feeds game.keys)
 * Right side: Touch-drag area for look (feeds game.mouse.dx/dy)
 * Buttons: Fire, Dash, Interact, Pause
 *
 * Self-contained — call TouchControls.init(game) after game is created.
 * Only activates on touch-capable devices.
 */

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

    // Start render loop
    this.renderLoop();
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
      pauseBtn: { x: w - 50, y: 40, r: 24 },
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
    if (this.dist(x, y, z.pauseBtn.x, z.pauseBtn.y) < z.pauseBtn.r)
      return "pause";
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
      } else if (zone === "fire") {
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
      } else if (zone === "pause") {
        this.activeButtons.add("pause");
        g.handleKeyPress("Escape");
      }
    }
  }

  onTouchMove(e) {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      if (touch.identifier === this.joyTouch) {
        this.joyPos = { x: touch.clientX, y: touch.clientY };
        this.updateJoystickKeys();
      } else if (touch.identifier === this.lookTouch) {
        const dx = touch.clientX - this.lookLast.x;
        const dy = touch.clientY - this.lookLast.y;
        // Feed into mouse look system (scaled for touch sensitivity)
        this.game.mouse.dx += dx * 1.5;
        this.game.mouse.dy += dy * 1.5;
        this.lookLast = { x: touch.clientX, y: touch.clientY };
      }
    }
  }

  onTouchEnd(e) {
    e.preventDefault();
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
      }
    }
    // Clear transient buttons
    this.activeButtons.delete("dash");
    this.activeButtons.delete("interact");
    this.activeButtons.delete("pause");
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

    // Sprint if joystick pushed far enough
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.game.keys[kb.sprint] = dist > this.joyRadius * 1.2;
  }

  clearMovementKeys() {
    const kb = this.game.keybinds;
    this.game.keys[kb.moveForward] = false;
    this.game.keys[kb.moveBack] = false;
    this.game.keys[kb.moveLeft] = false;
    this.game.keys[kb.moveRight] = false;
    this.game.keys[kb.sprint] = false;
  }

  renderLoop() {
    this.render();
    requestAnimationFrame(() => this.renderLoop());
  }

  render() {
    const ctx = this.ctx || (this.ctx = this.canvas.getContext("2d"));
    const z = this.zones;
    ctx.clearRect(0, 0, z.w, z.h);

    // Only draw during gameplay
    const gs = this.game.state;
    if (gs !== "playing" && gs !== "paused") return;

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

    ctx.globalAlpha = 1;
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
