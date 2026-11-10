/**
 * Mobile Touch Controls for Clockwork Carnage
 *
 * Left side: Virtual joystick for movement (feeds game.keys)
 * Right side: Touch-drag area for look (feeds game.mouse.dx/dy)
 * Buttons: Fire, Aim, Dash, Crouch, Reload, Interact, Chrono Shift, Pause.
 * The stick pushed past its rim sprints; FIRE and AIM double as look pads.
 *
 * Self-contained — call TouchControls.init(game) after game is created.
 * Only activates on touch-capable devices.
 */

import { UPGRADES, WEAPONS } from "../src/data/index.js";
import { isModernArt } from "../src/rendering/art-style.js";
import { COMPACT_PHONE_HEIGHT } from "../src/settings/registry.js";
import {
  pauseLayout,
  hitRect,
  upgradeLayout,
  tutorialMenuLayout,
  campaignPromptLayout,
} from "../src/ui/layout.js";
import { isPrimaryTouchDevice } from "../src/utils/device.js";
import { UI, drawButton } from "../src/ui/modern-ui-kit.js";
import { touchZones, HIT_SHRINK } from "../src/ui/touch-layout.js";
import { creatorTouchControls, drawCreatorTouchHints } from "../src/ui/character-creator.js";
import { isReloading } from "../src/systems/reload.js";
import { gyroLookDelta, gyroActive, webkitRotationOrder } from "../src/systems/gyro-aim.js";
import { findAssistTarget, assistFriction, applyAssistPull } from "../src/systems/aim-assist.js";
import { CENTRED_LOOK_RATE } from "../src/systems/aim.js";

/** A press shorter than this latches AIM or SLOW on; a longer one holds it. */
const TAP_LATCH_MS = 250;
/** The stick runs past this fraction of its radius, and walks again inside the second. */
const SPRINT_OUT = 1.2;
const SPRINT_IN = 0.7;
/** How far (CSS px) a thumb on FIRE or AIM moves before it steers: the press's own roll turns nothing. */
const PAD_SLOP = 8;

/**
 * Look response to a drag's speed (CSS px in one move event): a slow, careful
 * drag turns at about half speed, for fine aim; a fast swipe at full speed or
 * a little over, to turn round.
 */
export function lookCurve(d) {
  return Math.min(1.3, 0.5 + 0.06 * d);
}

/** The stick's dead zone, as a share of its radius. */
const STICK_DEADZONE = 0.2;
/** How near straight (radians either side) a stick direction snaps to it: ~14°. */
const STICK_SNAP = 0.25;
import { directorInput } from "../src/cinematic/director.js";
import { toggleCard } from "../src/ui/tutorial-ui.js";
import { PROMPT_ITEMS } from "../src/ui/campaign-prompt.js";
import { reportBug, shareSession } from "../src/systems/playtest-export.js";
import { gameOverButtonAt, handleGameOverClick } from "../src/systems/input-click-dispatch.js";

export class TouchControls {
  static init(game) {
    // Only activate on touch devices
    if (!isPrimaryTouchDevice()) return null;

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
    this.joyRadius = window.innerHeight < COMPACT_PHONE_HEIGHT ? 45 : 60;

    // Look state
    this.lookTouch = null;
    this.lookOrigin = { x: 0, y: 0 };
    this.lookLast = { x: 0, y: 0 };
    this.lookActive = false;
    this.lookTapTime = 0; // for swipe detection

    // Fire state. FIRE and AIM are look pads too: dragging off either one
    // turns the view, so one thumb can shoot and track a target at once.
    this.fireTouch = null;
    this.aimTouch = null;
    this.fireLast = { x: 0, y: 0 };
    this.aimLast = { x: 0, y: 0 };

    // Layout zones (set on resize)
    this.zones = {};

    // Safe area insets (iPhone X+ notch/Dynamic Island)
    this.safeArea = { top: 0, right: 0, bottom: 0, left: 0 };

    // Canvas for drawing touch controls
    this.canvas = null;
    this.ctx = null;

    // Track active button touches
    this.activeButtons = new Set();

    // Sprinting: the stick is out past its rim (with hysteresis, so a thumb
    // on the edge does not flicker between walk and run).
    this.sprinting = false;

    // AIM and SLOW: a tap latches them on until the next tap, a hold lasts
    // as long as the thumb is down.
    this.aimDownAt = 0;
    this.aimLatched = false;
    this.aimUnlatching = false;
    this.chronoDownAt = 0;
    this.chronoLatched = false;
    this.chronoUnlatching = false;

    // Chrono shift touch tracking
    this.chronoTouch = null;
    // Crouch touch tracking
    this.crouchTouch = null;

    // Gyro aim: the motion listener goes on at the first tap after the
    // setting is on. iOS asks for motion access only inside a finished tap
    // (touchend or click): asked from touchstart, it refuses.
    this.gyroAttached = false;
    this.gyroAsking = false;
    this.gyroDenied = false;
    this.gyroLast = 0;

    // Aim assist (src/systems/aim-assist.js): the target under the reticle
    // this frame, and whether the player steered it.
    this.assistTarget = null;
    this.assistLast = 0;
    this.lookedThisFrame = false;

    // Cutscene hold-to-skip state
    this.cutsceneHoldTouch = null;
    this.cutsceneHoldStart = 0;

    // Double-tap dash state
    this.lastTapTime = 0;
    this.lastTapZone = null;

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
      "position:fixed;top:0;left:0;width:100%;height:100vh;height:100dvh;z-index:20;pointer-events:none;";
    document.body.appendChild(this.canvas);
    // resize() applies the DPR transform, so the context must exist first.
    this.ctx = this.canvas.getContext("2d");

    // Create touch-event catcher (above hudCanvas z-index:10, below touch canvas z-index:20)
    this.touchLayer = document.createElement("div");
    this.touchLayer.id = "touchLayer";
    this.touchLayer.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100vh;height:100dvh;z-index:15;touch-action:none;";
    document.body.appendChild(this.touchLayer);

    this.resize();
    this._onResize = () => this.resize();
    this._onTouchStart = (e) => this.onTouchStart(e);
    this._onTouchMove = (e) => this.onTouchMove(e);
    this._onTouchEnd = (e) => this.onTouchEnd(e);
    this._onMotion = (e) => this.onMotion(e);

    window.addEventListener("resize", this._onResize);

    // Touch events on the touch layer
    this.touchLayer.addEventListener("touchstart", this._onTouchStart, {
      passive: false,
    });
    this.touchLayer.addEventListener("touchmove", this._onTouchMove, {
      passive: false,
    });
    this.touchLayer.addEventListener("touchend", this._onTouchEnd, {
      passive: false,
    });
    this.touchLayer.addEventListener("touchcancel", this._onTouchEnd, {
      passive: false,
    });

    // Override pointer lock for mobile — it's not supported/needed
    this.game.mouse.locked = true;

    // Hide cursor on mobile
    document.body.style.cursor = "none";
  }

  destroy() {
    this.destroyed = true;
    window.removeEventListener("resize", this._onResize);
    this.touchLayer.removeEventListener("touchstart", this._onTouchStart);
    this.touchLayer.removeEventListener("touchmove", this._onTouchMove);
    this.touchLayer.removeEventListener("touchend", this._onTouchEnd);
    this.touchLayer.removeEventListener("touchcancel", this._onTouchEnd);
    if (this.gyroAttached) window.removeEventListener("devicemotion", this._onMotion);
    this.canvas.remove();
    this.touchLayer.remove();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this._updateSafeArea();

    this.zones = touchZones({ w, h, safeArea: this.safeArea, minimapSize: this.game?.settings?.minimapSize });
    // Keep the joystick radius in sync with the viewport.
    this.joyRadius = this.zones.isCompactPhone ? 45 : 60;
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
    // Tighter hit radii than the drawn ones so dragging to look does not
    // trigger a button. touch-layout floors each radius so the shrunk circle
    // still clears the 44px minimum target.
    const hitShrink = HIT_SHRINK;
    if (this.dist(x, y, z.fireBtn.x, z.fireBtn.y) < z.fireBtn.r * hitShrink)
      return "fire";
    if (this.dist(x, y, z.aimBtn.x, z.aimBtn.y) < z.aimBtn.r * hitShrink)
      return "aim";
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
    // REWIND and LOCK exist only once the campaign has granted them.
    const powers = this.game.chronoPowers;
    if (powers?.has("rewind") && this.dist(x, y, z.rewindBtn.x, z.rewindBtn.y) < z.rewindBtn.r * hitShrink)
      return "rewind";
    if (powers?.has("timeLock") && this.dist(x, y, z.lockBtn.x, z.lockBtn.y) < z.lockBtn.r * hitShrink)
      return "lock";
    if (this.dist(x, y, z.reloadBtn.x, z.reloadBtn.y) < z.reloadBtn.r * hitShrink)
      return "reload";
    if (
      this.dist(x, y, z.crouchBtn.x, z.crouchBtn.y) <
      z.crouchBtn.r * hitShrink
    )
      return "crouch";
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
      z.fullscreenBtn &&
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

    // The settings deck takes its own touches; the live view beside it is inert.
    if (g.state === "settings") return;

    // A reel: a tap skips it (the lore video's skip is a held touch).
    if (g.state === "cinematic") {
      directorInput(g, "pointer", { down: true });
      return;
    }

    // Cutscene: tap the AUTO chip to toggle auto-play; elsewhere tap to
    // advance, track hold start for skip
    if (g.state === "cutscene") {
      const t0 = e.changedTouches[0];
      if (t0 && g.cutsceneAutoChipHit(t0.clientX, t0.clientY)) {
        g.toggleCutsceneAuto();
      } else if (e.changedTouches.length > 0) {
        this.cutsceneHoldTouch = e.changedTouches[0].identifier;
        this.cutsceneHoldStart = performance.now();
        g.advanceCutsceneFrame();
      }
      return;
    }

    // Tutorial completion: route taps to specific menu items
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
        // The game-over buttons act on the tap's end (onTouchEnd), where iOS
        // allows the clipboard and downloads; a tap anywhere else goes on.
        const t = e.changedTouches[0];
        if (g.state === "gameOver" && gameOverButtonAt(g, t.clientX, t.clientY) >= 0) return;
        if (g.state === "campaignPrompt" && this.handleCampaignPromptTap(t)) return;
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

    // Upgrade screen: tap to navigate and select upgrades
    if (g.state === "upgrade") {
      if (e.changedTouches.length > 0) {
        this.handleUpgradeTap(e.changedTouches[0]);
      }
      return;
    }

    // Character creator: forward taps for tab/item clicks + nav
    if (g.state === "characterCreate") {
      // Modern mode: the <agent-showroom> overlay takes its own touches.
      if (isModernArt()) return;
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
      // A tap on a folded quest card opens it to reread, rather than look.
      if (zone !== "joy" && this.game.state === "playing" && toggleCard(x, y)) continue;

      if (zone === "joy" && this.joyTouch === null) {
        // Floating joystick: origin spawns at touch point, not fixed position
        this.joyTouch = touch.identifier;
        this.joyOrigin = { x, y };
        this.joyPos = { x, y };
        this.joyActive = true;

        // Double-tap to dash
        const now = performance.now();
        if (this.lastTapZone === "joy" && now - this.lastTapTime < 250) {
          this.activeButtons.add("dash");

          // If double tapped, but they haven't moved the joystick out of the deadzone
          // we still want to dash. We use true for default to forward.
          this.triggerDirectionalDash(g, true);

          this.lastTapTime = 0;
        } else {
          this.lastTapTime = now;
          this.lastTapZone = "joy";
        }
      } else if (zone === "look" && this.lookTouch === null) {
        this.lookTouch = touch.identifier;
        this.lookOrigin = { x, y };
        this.lookLast = { x, y };
        this.lookActive = true;
        this.lookTapTime = performance.now();
      } else if (zone === "fire" && this.fireTouch === null) {
        this.fireTouch = touch.identifier;
        this.fireLast = { x, y, slop: true, x0: x, y0: y };
        g.player.isFiring = true;
        this.activeButtons.add("fire");
        if (g.settings.haptics && navigator.vibrate) navigator.vibrate(15);
      } else if (zone === "aim" && this.aimTouch === null) {
        this.aimTouch = touch.identifier;
        this.aimLast = { x, y, slop: true, x0: x, y0: y };
        this.aimDownAt = performance.now();
        // A tap on a latched AIM lets go; anything else aims while it lasts.
        if (this.aimLatched) {
          this.aimLatched = false;
          this.aimUnlatching = true;
        }
        g.player.isAiming = !this.aimUnlatching;
        this.activeButtons.add("aim");
        if (g.settings.haptics && navigator.vibrate) navigator.vibrate(10);
      } else if (zone === "dash") {
        this.activeButtons.add("dash");
        this.triggerDirectionalDash(g, true);
      } else if (zone === "reload") {
        this.activeButtons.add("reload");
        if (g.reloadPress() && g.settings.haptics && navigator.vibrate) navigator.vibrate(10);
      } else if (zone === "interact") {
        this.activeButtons.add("interact");
        // USE reloads when there is nothing to use, as the pad's X does.
        if (!g.interact()) g.reloadPress?.();
      } else if (zone === "chrono" && this.chronoTouch === null) {
        this.activeButtons.add("chrono");
        this.chronoTouch = touch.identifier;
        this.chronoDownAt = performance.now();
        if (this.chronoLatched) {
          this.chronoLatched = false;
          this.chronoUnlatching = true;
        }
        g.keys[g.keybinds.chronoShift] = !this.chronoUnlatching;
      } else if (zone === "rewind") {
        this.activeButtons.add("rewind");
        if (g.chronoRewind() && g.settings.haptics && navigator.vibrate) navigator.vibrate(25);
      } else if (zone === "lock") {
        this.activeButtons.add("lock");
        if (g.chronoLock() && g.settings.haptics && navigator.vibrate) navigator.vibrate(25);
      } else if (zone === "crouch" && this.crouchTouch === null) {
        this.activeButtons.add("crouch");
        this.crouchTouch = touch.identifier;
        g.keys[g.keybinds.crouch] = true;
        if (g.settings.haptics && navigator.vibrate) navigator.vibrate(10);
      } else if (zone === "weapon") {
        this.activeButtons.add("weapon");
        const p = g.player;
        if (p.weapons.length > 1) {
          p.currentWeapon = (p.currentWeapon + 1) % p.weapons.length;
          g.triggerAriaOnce("weaponSwitch", "weaponSwitch");
          if (g.mode === "tutorial") g.tutorialWeaponSwapped = true;
          if (g.settings.haptics && navigator.vibrate) navigator.vibrate(25);
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

    if (this.game.state === "settings") return; // the deck scrolls itself

    // Hold-to-skip is checked every frame in game.js updateCutscene()
    // via this.cutsceneHoldTouch — no need to duplicate here.

    for (const touch of e.changedTouches) {
      if (touch.identifier === this.joyTouch) {
        this.joyPos.x = touch.clientX;
        this.joyPos.y = touch.clientY;
        this.updateJoystickKeys();
      } else if (touch.identifier === this.fireTouch) {
        this.padLook(this.fireLast, touch.clientX, touch.clientY);
      } else if (touch.identifier === this.aimTouch) {
        this.padLook(this.aimLast, touch.clientX, touch.clientY);
      } else if (touch.identifier === this.lookTouch) {
        this.look(touch.clientX - this.lookLast.x, touch.clientY - this.lookLast.y);

        // Twin-stick auto-fire handling
        if (this.game.settings.autoFire) {
          const originDx = touch.clientX - this.lookOrigin.x;
          const originDy = touch.clientY - this.lookOrigin.y;
          const dist = Math.sqrt(originDx * originDx + originDy * originDy);
          const deadzone = 20;

          if (dist > deadzone) {
            // Auto fire
            if (!this.game.player.isFiring) {
              this.game.player.isFiring = true;
              this.activeButtons.add("fire");
              if (this.game.settings.haptics && navigator.vibrate)
                navigator.vibrate(10);
            }
          } else {
            // Inside deadzone, stop firing
            if (this.game.player.isFiring && this.fireTouch === null) {
              this.game.player.isFiring = false;
              this.activeButtons.delete("fire");
            }
          }
        }

        this.lookLast.x = touch.clientX;
        this.lookLast.y = touch.clientY;
      }
    }
  }

  onTouchEnd(e) {
    e.preventDefault();
    this.ensureGyro();
    if (this.game.state === "paused" && !this.game.showAriaLog && e.changedTouches[0] && this.pauseScreenTap(e.changedTouches[0])) return;
    if (this.game.state === "gameOver" && e.changedTouches[0]) {
      const t = e.changedTouches[0];
      if (gameOverButtonAt(this.game, t.clientX, t.clientY) >= 0) return handleGameOverClick(this.game, t);
    }

    if (this.game.state === "cinematic") {
      if (e.touches.length === 0) {
        directorInput(this.game, "pointer", { down: false });
        // A thumb held on a button into the reel lifts here, not over play:
        // let go of everything it was holding.
        this.joyTouch = this.lookTouch = this.fireTouch = this.aimTouch = null;
        this.chronoTouch = this.crouchTouch = null;
        this.joyActive = this.lookActive = false;
        this.aimUnlatching = this.chronoUnlatching = false;
        this.clearMovementKeys();
        this.releaseLatches();
        const g = this.game;
        if (g.player) g.player.isFiring = false;
        g.keys[g.keybinds.crouch] = false;
        this.activeButtons.clear();
      }
      return;
    }

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
        // Swipe to swap weapons check
        if (this.game.settings.swipeWeapons) {
          const timeDelta = performance.now() - this.lookTapTime;
          const dx = touch.clientX - this.lookOrigin.x;
          const dy = touch.clientY - this.lookOrigin.y;

          // If it's a fast motion mostly horizontally
          if (
            timeDelta < 300 &&
            Math.abs(dx) > 50 &&
            Math.abs(dx) > Math.abs(dy) * 1.5
          ) {
            const p = this.game.player;
            if (p.weapons.length > 1) {
              if (dx > 0) {
                p.currentWeapon = (p.currentWeapon + 1) % p.weapons.length;
              } else {
                p.currentWeapon =
                  (p.currentWeapon - 1 + p.weapons.length) % p.weapons.length;
              }
              this.game.triggerAriaOnce("weaponSwitch", "weaponSwitch");
              if (this.game.mode === "tutorial")
                this.game.tutorialWeaponSwapped = true;
              if (this.game.settings.haptics && navigator.vibrate)
                navigator.vibrate(25);
            }
          }
        }

        if (
          this.game.settings.autoFire &&
          this.game.player.isFiring &&
          this.fireTouch === null
        ) {
          this.game.player.isFiring = false;
          this.activeButtons.delete("fire");
        }

        this.lookTouch = null;
        this.lookActive = false;
      } else if (touch.identifier === this.fireTouch) {
        this.fireTouch = null;
        this.game.player.isFiring = false;
        this.activeButtons.delete("fire");
      } else if (touch.identifier === this.aimTouch) {
        this.aimTouch = null;
        const tap = performance.now() - this.aimDownAt < TAP_LATCH_MS;
        this.aimLatched = tap && !this.aimUnlatching;
        this.aimUnlatching = false;
        this.game.player.isAiming = this.aimLatched;
        this.activeButtons.delete("aim");
      } else if (touch.identifier === this.chronoTouch) {
        this.chronoTouch = null;
        const tap = performance.now() - this.chronoDownAt < TAP_LATCH_MS;
        this.chronoLatched = tap && !this.chronoUnlatching;
        this.chronoUnlatching = false;
        this.game.keys[this.game.keybinds.chronoShift] = this.chronoLatched;
        this.activeButtons.delete("chrono");
      } else if (touch.identifier === this.crouchTouch) {
        this.crouchTouch = null;
        this.game.keys[this.game.keybinds.crouch] = false;
        this.activeButtons.delete("crouch");
      }
    }
    // Clear transient buttons
    this.activeButtons.delete("dash");
    this.activeButtons.delete("rewind");
    this.activeButtons.delete("lock");
    this.activeButtons.delete("interact");
    this.activeButtons.delete("pause");
    this.activeButtons.delete("reload");
    this.activeButtons.delete("weapon");

  }

  /** Start listening to the gyro once it is wanted; on iOS, ask first. */
  ensureGyro() {
    if (this.gyroAttached || this.gyroAsking || this.gyroDenied) return;
    if (!Number(this.game.settings.gyroAim)) return;
    const DM = window.DeviceMotionEvent;
    if (!DM) return;
    const attach = () => {
      if (this.destroyed) return;
      window.addEventListener("devicemotion", this._onMotion);
      this.gyroAttached = true;
    };
    if (typeof DM.requestPermission !== "function") {
      attach();
      return;
    }
    this.gyroAsking = true;
    DM.requestPermission()
      .then((answer) => {
        if (answer === "granted") attach();
        // Only the player's own "Don't Allow" stops the asking; a refusal
        // for want of a gesture gets another go at the next tap.
        else this.gyroDenied = true;
      })
      .catch(() => {})
      .finally(() => {
        this.gyroAsking = false;
      });
  }

  /** A motion sample: the phone's turn becomes look input, in mouse pixels. */
  onMotion(e) {
    const g = this.game;
    const now = performance.now();
    const dt = (now - this.gyroLast) / 1000;
    this.gyroLast = now;
    const p = g.player;
    if (g.state !== "playing" || !p || !gyroActive(Number(g.settings.gyroAim), p.isAiming)) return;
    const angle = screen.orientation?.angle ?? window.orientation ?? 0;
    this.gyroWebkit ??= webkitRotationOrder();
    const { yaw, pitch } = gyroLookDelta(e.rotationRate, angle, dt, this.gyroWebkit);
    // Pixels whose view turn (centredLook in src/systems/aim.js) is that
    // many radians, times the gyro's own gain; the sights' zoom then scales
    // it down like any other look input.
    const gain = Number(g.settings.gyroSensitivity) || 2;
    const pxPerRad = gain / (CENTRED_LOOK_RATE * (g.settings.sensitivity || 1));
    g.mouse.dx += yaw * pxPerRad;
    g.mouse.dy -= pitch * pxPerRad;
  }

  /** Whether the first-launch controls card is up, holding the game still behind it. */
  holdsPlay() {
    return this.showTutorial && !this.tutorialDismissed;
  }

  /** Drop a latched AIM or SLOW (a menu, a cutscene, a death took the screen). */
  releaseLatches() {
    const g = this.game;
    if (this.aimLatched && this.aimTouch === null) {
      this.aimLatched = false;
      if (g.player) g.player.isAiming = false;
    }
    if (this.chronoLatched && this.chronoTouch === null) {
      this.chronoLatched = false;
      g.keys[g.keybinds.chronoShift] = false;
    }
  }

  /**
   * A drag on FIRE or AIM, which double as look pads. The thumb rolls as it
   * presses and lifts: until it has gone PAD_SLOP from where it landed, that
   * roll turns nothing, so a tap fires where the reticle was.
   */
  padLook(last, x, y) {
    if (last.slop) {
      const d = Math.hypot(x - last.x0, y - last.y0);
      if (d < PAD_SLOP) return;
      // A quick swipe can cross the slop in one move: what is past it steers.
      const past = (d - PAD_SLOP) / d;
      this.look((x - last.x0) * past, (y - last.y0) * past);
    } else this.look(x - last.x, y - last.y);
    last.slop = false;
    last.x = x;
    last.y = y;
  }

  /** Turn the view by a touch drag of (dx, dy) CSS px. */
  look(dx, dy) {
    // Touch look uses the same reticle path as mouse so visual crosshair
    // and bullet trajectory stay aligned. Auto-fire only gates firing.
    let rawSens = Number(this.game.settings.touchSensitivity);
    if (!Number.isFinite(rawSens)) rawSens = 1.5;
    const touchSens = Math.min(3.0, Math.max(0.5, rawSens));
    const slow = assistFriction(this.assistTarget, Number(this.game.settings.aimAssist) || 0);
    const curve = lookCurve(Math.hypot(dx, dy));
    this.game.mouse.dx += dx * touchSens * slow * curve;
    this.game.mouse.dy += dy * touchSens * slow * curve;
    if (dx || dy) this.lookedThisFrame = true;
  }

  /** Once a frame in play: find the target under the reticle and lean toward it. */
  updateAssist() {
    const g = this.game;
    const now = performance.now();
    const dt = this.assistLast ? (now - this.assistLast) / 1000 : 0;
    this.assistLast = now;
    const level = Number(g.settings.aimAssist) || 0;
    this.assistTarget = level ? findAssistTarget(g) : null;
    const p = g.player;
    // The pull follows the aim you give it: a drag, or the trigger. Walking alone leans nothing.
    const input = this.lookedThisFrame ? 1 : p?.isFiring ? 0.4 : 0;
    applyAssistPull(g, this.assistTarget, level, dt, input);
    this.lookedThisFrame = false;
  }

  /**
   * The stick as an analog direction: `x` right, `y` forward, length 0..1,
   * or null when it is idle or inside its dead zone. Within STICK_SNAP of
   * straight ahead, back or to a side it snaps to it, so a run (or a dash)
   * meant straight goes straight. Movement and the dash both steer by it.
   */
  moveAxis() {
    if (!this.joyActive) return null;
    const dx = this.joyPos.x - this.joyOrigin.x;
    const dy = this.joyPos.y - this.joyOrigin.y;
    const dist = Math.hypot(dx, dy);
    if (dist < this.joyRadius * STICK_DEADZONE) return null;
    let a = Math.atan2(-dy, dx);
    const quarter = Math.PI / 2;
    const nearest = Math.round(a / quarter) * quarter;
    if (Math.abs(a - nearest) < STICK_SNAP) a = nearest;
    const m = Math.min(1, (dist / this.joyRadius - STICK_DEADZONE) / (1 - STICK_DEADZONE));
    return { x: Math.cos(a) * m, y: Math.sin(a) * m };
  }

  updateJoystickKeys() {
    const dx = this.joyPos.x - this.joyOrigin.x;
    const dy = this.joyPos.y - this.joyOrigin.y;
    const kb = this.game.keybinds;

    // The keys still say which way the stick leans (eight ways, for what
    // reads them as keys); the motion itself comes from moveAxis().
    const axis = this.moveAxis();
    const lean = Math.sin(Math.PI / 8);
    this.game.keys[kb.moveForward] = !!axis && axis.y > lean * Math.hypot(axis.x, axis.y);
    this.game.keys[kb.moveBack] = !!axis && axis.y < -lean * Math.hypot(axis.x, axis.y);
    this.game.keys[kb.moveLeft] = !!axis && axis.x < -lean * Math.hypot(axis.x, axis.y);
    this.game.keys[kb.moveRight] = !!axis && axis.x > lean * Math.hypot(axis.x, axis.y);

    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.joyRadius * SPRINT_OUT) this.sprinting = true;
    else if (dist < this.joyRadius * SPRINT_IN) this.sprinting = false;
    this.game.keys[kb.sprint] = this.sprinting;
  }

  clearMovementKeys() {
    const kb = this.game.keybinds;
    this.game.keys[kb.moveForward] = false;
    this.game.keys[kb.moveBack] = false;
    this.game.keys[kb.moveLeft] = false;
    this.game.keys[kb.moveRight] = false;
    this.sprinting = false;
    this.game.keys[kb.sprint] = false;
  }

  handlePauseTap(touch) {
    // The ARIA log covers the menu: any tap closes it instead of hitting a
    // button hidden underneath.
    if (this.game.showAriaLog) {
      this.game.handleKeyPress("KeyL");
      return;
    }
    const w = this.zones.w;
    const h = this.zones.h;
    const x = touch.clientX;
    const y = touch.clientY;
    const layout = pauseLayout(w, h, this.game.mode, this.screenButtonOpts());
    // Full screen, Session and Report bug act on the tap's end (onTouchEnd):
    // iOS refuses full screen, the clipboard and downloads from touchstart.
    if (hitRect(layout.screenBtn, x, y) || hitRect(layout.sessionBtn, x, y) || hitRect(layout.bugBtn, x, y)) return;

    for (const btn of layout.buttons) {
      if (
        x >= btn.x &&
        x <= btn.x + btn.w &&
        y >= btn.y &&
        y <= btn.y + btn.h
      ) {
        if (btn.index === 0)
          this.game.handleKeyPress("Escape"); // Resume
        else if (btn.index === 1)
          this.game.handleKeyPress("KeyS"); // Settings
        else if (btn.index === 2)
          this.game.handleKeyPress("KeyC"); // Controls
        else if (btn.index === 3) this.game.handleKeyPress("KeyQ"); // Quit
        return;
      }
    }

    if (layout.saveBtn) {
      const s = layout.saveBtn;
      if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
        this.game.handleKeyPress("KeyF");
      }
    }
  }

  /** A tap on a campaign prompt row picks it (the skip included); true if one was hit. */
  handleCampaignPromptTap(touch) {
    const g = this.game;
    const layout = campaignPromptLayout(this.zones.w, this.zones.h, PROMPT_ITEMS.length);
    for (let i = 0; i < PROMPT_ITEMS.length; i++) {
      const iy = layout.my + 8 + i * layout.itemH;
      if (
        touch.clientX >= layout.mx &&
        touch.clientX <= layout.mx + layout.menuW &&
        touch.clientY >= iy &&
        touch.clientY <= iy + layout.itemH - 6
      ) {
        g.campaignPromptSelection = i;
        g.audio.menuConfirm();
        g.executeCampaignPromptChoice(i);
        return true;
      }
    }
    return false;
  }

  handleTutorialCompleteTap(touch) {
    const g = this.game;
    const w = this.zones.w;
    const h = this.zones.h;
    const x = touch.clientX;
    const y = touch.clientY;
    const layout = tutorialMenuLayout(w, h, 4);

    for (let i = 0; i < 4; i++) {
      const iy = layout.my + 8 + i * layout.itemH;
      if (
        x >= layout.mx &&
        x <= layout.mx + layout.menuW &&
        y >= iy &&
        y <= iy + layout.itemH - 6
      ) {
        g.tutorialMenuSelection = i;
        g.audio.menuConfirm();
        g.executeTutorialCompletionChoice(i);
        return;
      }
    }
  }

  triggerDirectionalDash(g, defaultForward = false) {
    // The way the stick points, not the eight ways its keys can: a thumb a
    // little off straight dashes a little off straight, not at 45°.
    const axis = this.moveAxis();
    if (axis) {
      const cos = Math.cos(g.player.angle);
      const sin = Math.sin(g.player.angle);
      g.triggerDash(null, cos * axis.y - sin * axis.x, sin * axis.y + cos * axis.x);
      return;
    }
    const kb = g.keybinds;
    const fwd = g.keys[kb.moveForward];
    const back = g.keys[kb.moveBack];
    const left = g.keys[kb.moveLeft];
    const right = g.keys[kb.moveRight];
    const hasDir = fwd || back || left || right;

    if (hasDir) {
      const cos = Math.cos(g.player.angle);
      const sin = Math.sin(g.player.angle);
      let dX = 0,
        dY = 0;
      if (fwd) {
        dX += cos;
        dY += sin;
      }
      if (back) {
        dX -= cos;
        dY -= sin;
      }
      if (left) {
        dX += sin;
        dY -= cos;
      }
      if (right) {
        dX -= sin;
        dY += cos;
      }
      const len = Math.sqrt(dX * dX + dY * dY);
      if (len > 0) {
        dX /= len;
        dY /= len;
        g.triggerDash(null, dX, dY);
      } else {
        // Opposing keys cancel out — fall back to dashing forward
        g.triggerDash(g.keybinds.moveForward);
      }
    } else if (defaultForward) {
      g.triggerDash(g.keybinds.moveForward);
    }
  }

  handleUpgradeTap(touch) {
    const w = this.game.hudW;
    const h = this.game.hudH;
    const scaleX = w / window.innerWidth;
    const scaleY = h / window.innerHeight;
    const x = touch.clientX * scaleX;
    const y = touch.clientY * scaleY;

    const g = this.game;
    const upgradeKeys = Object.keys(UPGRADES);
    const layout = upgradeLayout(
      w,
      h,
      upgradeKeys.length,
      this.game.isTouchDevice,
      g.upgradeSelection,
    );

    if (y >= layout.contY - 18 && y <= layout.contY + 18) {
      g.upgradeSelection = upgradeKeys.length;
      g.handleKeyPress("Enter");
      return;
    }

    for (let i = 0; i < upgradeKeys.length; i++) {
      const col = i % layout.cols;
      const row = Math.floor(i / layout.cols);
      const baseX = col === 0 ? layout.leftX : layout.rightX;
      const uy = layout.startY + row * (layout.cardH + layout.cardGap);
      // Ignore rows scrolled outside the visible window — they are clipped
      // on screen, so a tap there must not select them.
      if (uy + layout.cardH < layout.listTop || uy > layout.listBottom) continue;
      if (
        x >= baseX &&
        x <= baseX + layout.colW &&
        y >= uy &&
        y <= uy + layout.cardH
      ) {
        g.upgradeSelection = i;
        g.handleKeyPress("Enter");
        return;
      }
    }
  }

  render() {
    const ctx = this.ctx;
    const z = this.zones;
    ctx.clearRect(0, 0, z.w, z.h);

    const gs = this.game.state;

    // Draw pause menu touch buttons
    if (gs === "paused") {
      this.renderPauseButtons(ctx);
      return;
    }

    // The settings deck draws its own controls.
    if (gs === "settings") return;

    // Character creator: draw save/cancel buttons + nav arrows. Modern's
    // <agent-showroom> has its own; these showed through as it faded in.
    if (gs === "characterCreate") {
      if (!isModernArt()) this.renderCreatorOverlay(ctx);
      return;
    }

    // Nothing to draw during cutscenes or other non-playing states
    if (gs !== "playing") {
      this.releaseLatches();
      return;
    }
    if (!this.holdsPlay()) this.updateAssist();
    // A latched SLOW lets go once the energy it runs on is spent.
    const p = this.game.player;
    if (this.chronoLatched && this.chronoTouch === null && p && p.chronoEnergy <= 0) {
      this.chronoLatched = false;
      this.game.keys[this.game.keybinds.chronoShift] = false;
    }

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

    // ── Aim-down-sights button ──
    this.drawButton(
      ctx,
      z.aimBtn.x,
      z.aimBtn.y,
      z.aimBtn.r,
      "AIM",
      this.game.player?.isAiming ? "#66eeff" : "#337799",
    );

    // ── Dash button ──
    this.drawButton(
      ctx,
      z.dashBtn.x,
      z.dashBtn.y,
      z.dashBtn.r,
      // Facing cover, the dash button takes it (src/systems/cover-play.js).
      this.game.player?.coverAvailable ? "COVER" : "DASH",
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

    // ── Rewind and Time-Lock, once granted, with their cooldowns ──
    const powers = this.game.chronoPowers;
    for (const [id, key, label, color, active] of [
      ["rewind", "rewindBtn", "REWIND", "#ff5fb4", "rewind"],
      ["timeLock", "lockBtn", "LOCK", "#4f9dff", "lock"],
    ]) {
      if (!powers?.has(id)) continue;
      const b = z[key];
      const cd = powers.cooldown(id);
      this.drawButton(ctx, b.x, b.y, b.r, label, cd.left > 0 ? "#555566" : this.activeButtons.has(active) ? "#ffffff" : color);
      if (cd.left > 0) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - cd.frac));
        ctx.stroke();
        ctx.restore();
      }
    }

    // ── Crouch button (small) ──
    this.drawButton(
      ctx,
      z.crouchBtn.x,
      z.crouchBtn.y,
      z.crouchBtn.r,
      "CROUCH",
      this.activeButtons.has("crouch") ? "#66dd66" : "#558855",
    );

    // ── Reload (pulses on an empty mag; lit while the reload runs) ──
    {
      const p = this.game.player;
      const wep = p?.weapons?.[p.currentWeapon];
      const empty = !!wep && p.loadedOf?.(wep) === 0;
      const running = isReloading(this.game);
      const pulseOn = empty && !running && Math.sin(performance.now() / 120) > 0;
      this.drawButton(
        ctx,
        z.reloadBtn.x,
        z.reloadBtn.y,
        z.reloadBtn.r,
        "RELOAD",
        running || this.activeButtons.has("reload") ? "#ffffff" : pulseOn ? "#ffcc33" : "#aa9966",
      );
    }

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

    // ── Pause / Menu button (top-right; a short phone's top-left) ──
    this.drawButton(
      ctx,
      z.pauseBtn.x,
      z.pauseBtn.y,
      z.pauseBtn.r,
      "II",
      this.activeButtons.has("pause") ? "#ffdd44" : "rgba(200,200,200,0.5)",
    );

    // ── Fullscreen button (top-right, next to pause) — hidden when API unavailable ──
    if (this.canFullscreen && !this.isStandalone && z.fullscreenBtn) {
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

    // Button hints. Stacked upward from the dismiss prompt so the last line
    // cannot land on it — a fixed base ran the list off a 360px-tall phone.
    const hintFont = isCompact ? 11 : 14;
    const hintGap = isCompact ? 15 : 25;
    const dismissY = h - this.safeArea.bottom - (isCompact ? 14 : 30);
    const hints = [
      { label: "FIRE / AIM", desc: "Hold and drag to track", color: "#ff6644" },
      { label: "RUN", desc: "Push the stick past its ring", color: "#ffaa00" },
      { label: "CROUCH", desc: "Tap while running to slide", color: "#66dd66" },
    ];
    const hintBase =
      dismissY - (isCompact ? 20 : 28) - (hints.length - 1) * hintGap;
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
    ctx.fillText("TAP ANYWHERE TO START", w / 2, dismissY);
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

    // Hints in the lanes beside the buttons, clear of the panels and the
    // edge zones; left out where a lane is too narrow.
    drawCreatorTouchHints(ctx, bounds.controls, this.game);

    ctx.globalAlpha = 1;
  }

  /** Shared creator button bounds — used by both touch handler and renderer */
  _creatorButtonBounds(w, h) {
    const controls = creatorTouchControls(w, h, this.safeArea);
    const { back, save } = controls;
    return { btnH: save.h, btnW: save.w, btnY: save.y, saveX: save.x, cancelX: back.x, controls };
  }

  renderPauseButtons(ctx) {
    const w = this.zones.w;
    const h = this.zones.h;
    // Buttons would draw over the ARIA log panel; offer a close hint instead.
    if (this.game.showAriaLog) {
      if (isModernArt()) {
        drawButton(ctx, w / 2 - 70, h - 46, 140, 36, "Close log", "focus", UI.cyan, { size: 13 });
      } else {
        ctx.fillStyle = "rgba(170,200,220,0.8)";
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        ctx.fillText("TAP TO CLOSE LOG", w / 2, h - 18);
      }
      return;
    }
    const layout = pauseLayout(w, h, this.game.mode, this.screenButtonOpts());
    if (isModernArt()) {
      if (layout.screenBtn) {
        const b = layout.screenBtn;
        drawButton(ctx, b.x, b.y, b.w, b.h, b.label, "idle", UI.cyan, { idleColor: UI.text, size: layout.compact ? 11 : 13 });
      }
      for (const btn of layout.buttons) {
        const accent = btn.index === 0 ? UI.cyan : btn.index === 3 ? UI.crimson : UI.steelHi;
        drawButton(ctx, btn.x, btn.y, btn.w, btn.h, btn.label, btn.index === 0 ? "focus" : "idle", accent, {
          idleAccent: btn.index === 3 ? UI.crimson : null,
          idleColor: btn.index === 3 ? "#ff8a96" : UI.text,
          size: layout.compact ? 11 : 13,
        });
      }
      if (layout.saveBtn) {
        const sv = layout.saveBtn;
        drawButton(ctx, sv.x, sv.y, sv.w, sv.h, "Save", "idle", UI.green, { idleAccent: UI.green, idleColor: UI.green, size: 12 });
      }
      for (const [b, label] of [[layout.sessionBtn, "Session"], [layout.bugBtn, "Report bug"]]) {
        drawButton(ctx, b.x, b.y, b.w, b.h, label, "idle", UI.steelHi, { idleColor: UI.text, size: 12 });
      }
      return;
    }

    ctx.globalAlpha = 0.7;
    for (const btn of layout.buttons) {
      const bx = btn.x;
      const by = btn.y;
      const btnW = btn.w;
      const btnH = btn.h;
      ctx.fillStyle = btn.color;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, by, btnW, btnH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(btn.label, bx + btnW / 2, by + btnH / 2);
    }

    if (layout.saveBtn) {
      const s = layout.saveBtn;
      ctx.fillStyle = "#00aa44";
      ctx.beginPath();
      ctx.roundRect(s.x, s.y, s.w, s.h, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.fillText("SAVE", s.x + s.w / 2, s.y + s.h / 2);
    }
    for (const b of [layout.sessionBtn, layout.bugBtn]) {
      ctx.fillStyle = "#335577";
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
    }
    if (layout.screenBtn) {
      const b = layout.screenBtn;
      ctx.fillStyle = "#335577";
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
    }
    ctx.globalAlpha = 1;
  }

  /** The pause menu's full-screen button: its label, or none where it cannot help. */
  screenButtonOpts() {
    const right = this.safeArea?.right || 0;
    if (this.isStandalone) return { right };
    if (this.canFullscreen && (document.fullscreenEnabled ?? document.webkitFullscreenEnabled ?? true)) {
      const on = document.fullscreenElement || document.webkitFullscreenElement;
      return { screen: on ? "EXIT FULL SCREEN" : "FULL SCREEN", right };
    }
    // An iPhone gives pages no element full screen (only iPad does): the button explains Safari's own ways.
    if (/iP(hone|od)/.test(navigator.userAgent)) return { screen: "FULL SCREEN", right };
    return { right };
  }

  /** A tap that ends on the pause menu's full-screen, Session or Report bug button. */
  pauseScreenTap(touch) {
    const layout = pauseLayout(this.zones.w, this.zones.h, this.game.mode, this.screenButtonOpts());
    if (hitRect(layout.sessionBtn, touch.clientX, touch.clientY)) return shareSession(this.game), true;
    if (hitRect(layout.bugBtn, touch.clientX, touch.clientY)) return reportBug(this.game), true;
    if (!hitRect(layout.screenBtn, touch.clientX, touch.clientY)) return false;
    if (!this.canFullscreen) {
      alert(
        "iPhone browsers don't let a web page go full screen.\n\n" +
          "More room in Safari: open the page menu beside the address and choose \"Hide Toolbar\".\n\n" +
          "No bars at all: tap Share (↑), choose \"Add to Home Screen\", and play from that icon.",
      );
    } else this.toggleFullscreen();
    return true;
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
