import {
  WEAPONS,
  ENEMY_TYPES,
  ARENA_MAP,
  CAMPAIGN_LEVELS,
  UPGRADES,
  WALL_COLORS,
  TUTORIAL_MAP,
  ACHIEVEMENTS,
  ACHIEVEMENT_ICON_SVGS,
  ARIA_COMMS,
  CHARACTER_COLORS,
  ARMOR_STYLES,
  BADGES,
  WEAPON_SKINS,
  LOADOUT_CLASSES,
  DEFAULT_CHARACTER,
} from "./data.js";
import { Renderer } from "./renderer.js";
import { AudioManager } from "./audio.js";
import { BuilderMode } from "./builder.js";
import { CutsceneEngine } from "./cutscene.js";
import { Player, Enemy, Pickup, Projectile } from "./entities.js";

const SAVE_VERSION = 1;
export const GAME_VERSION = "0.7.2";

export const GameState = {
  TITLE: "title",
  MODE_SELECT: "modeSelect",
  PLAYING: "playing",
  PAUSED: "paused",
  SETTINGS: "settings",
  CONTROLS: "controls",
  UPGRADE: "upgrade",
  GAME_OVER: "gameOver",
  BUILDER: "builder",
  VICTORY: "victory",
  LEVEL_COMPLETE: "levelComplete",
  TUTORIAL: "tutorial",
  CUTSCENE: "cutscene",
  CAMPAIGN_PROMPT: "campaignPrompt",
  TUTORIAL_COMPLETE: "tutorialComplete",
  CHARACTER_CREATE: "characterCreate",
  ACHIEVEMENTS: "achievements",
};

// TODO: Restructure this entire file, but especially this class... it's a mess. It handles too much. 3k lines for a class is normal right? Split into multiple classes/files (Player, Enemy, Projectile, GameState, etc.) and have a main Game class that manages everything? Likely a StateManager that handles states and the Game class handles core game logic and delegates to other classes as needed. Definitely a base ECS that extracts shared logic and data between entities
export class Game {
  constructor(canvas, hudCanvas) {
    this.canvas = canvas;
    this.hudCanvas = hudCanvas;
    this.hudCtx = hudCanvas.getContext("2d");
    this.renderer = new Renderer(canvas);
    this.audio = new AudioManager();
    this.cutsceneEngine = new CutsceneEngine({
      audio: this.audio,
      getKeys: () => this.keys,
      getTouchControls: () => this.touchControls,
      isTouchDevice: "ontouchstart" in window,
      getPlayerName: () => this.character.name || "Agent",
    });
    this.player = new Player();
    this.entities = [];
    this.projectiles = [];
    this.map = null;
    this.state = GameState.TITLE;
    this.mode = null; // 'arena' or 'campaign'
    this.time = 0;
    this.deltaTime = 0;
    this.lastFrameTime = 0;
    this.arenaTimer = 60;
    this.arenaRound = 1;
    this.campaignLevel = 0;
    this.keys = {};
    this.mouse = { dx: 0, dy: 0, locked: false };
    this.isTouchDevice = "ontouchstart" in window;
    this.menuSelection = 0;
    this.upgradeSelection = 0;
    this.upgradeLevels = {};
    this.transitioning = false;
    this.transitionAlpha = 0;
    this.screenShake = 0;
    this.killedEnemies = 0;
    this.totalEnemies = 0;
    this.fps = 0;
    this.frameCount = 0;
    this.fpsTime = 0;
    this.showFPS = false;
    this.glitchEffect = 0;
    this.hitMarker = 0;
    this.damageNumbers = [];
    // Kill streak system
    this.killStreak = 0;
    this.killStreakTimer = 0; // time since last kill, resets streak if > 3s
    this.killStreakDisplay = null; // { text, color, size, life }
    this.bestStreak = 0;
    // Slow-motion last kill
    this.timeScale = 1;
    this.slowMoTimer = 0;
    // Stats tracking
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.exitEntity = null;
    this.weaponAnimFrame = 0;
    this.weaponAnimTime = 0;
    this.roundStartTime = 0;
    this.deathTimer = 0;
    this.pauseSaveFlash = 0;
    this.settings = {
      crosshair: 0, // 0=red dot, 1=green cross, 2=acog, 3=circle, 4=minimal, 5=none
      difficulty: 1, // 0=easy, 1=normal, 2=hard, 3=nightmare
      minimapSize: 200,
      musicVolume: 80, // 0..100
      sfxVolume: 80, // 0..100
      sensitivity: 1.0, // 0.5..2.0
      fov: 70, // 50..120 degrees
      viewMode: 0, // 0=first-person, 1=third-person
      invertX: false,
      fontScale: 100, // 100, 125, 150 percent
      colorblind: 0, // 0=off, 1=deuteranopia, 2=protanopia, 3=tritanopia
      hudScale: 100, // 75, 100, 125 percent
      staminaBarSize: 100, // 75, 100, 125, 150 percent
      showPortrait: true,
      showWeapons: true,
      showKills: true,
      showScore: true,
      touchSensitivity: 2.0,
    };
    this.settingsSelection = 0;
    this.lastEscTime = 0;
    // Double-tap dash tracking
    this.lastTapKey = null;
    this.lastTapTime = 0;

    // Key remapping
    this.keybinds = {
      moveForward: "KeyW",
      moveBack: "KeyS",
      moveLeft: "KeyA",
      moveRight: "KeyD",
      sprint: "ShiftLeft",
      interact: "KeyE",
      pause: "Escape",
      weapon1: "Digit1",
      weapon2: "Digit2",
      weapon3: "Digit3",
      weapon4: "Digit4",
      toggleFPS: "KeyF",
      chronoShift: "KeyQ",
    };
    this.controlsSelection = 0;
    this.rebindingKey = null; // null = not rebinding, string = action being rebound

    // Builder mode (extracted)
    this.builder = new BuilderMode({
      renderer: this.renderer,
      audio: this.audio,
      settings: this.settings,
      keybinds: this.keybinds,
      canvas: this.canvas,
    });

    // Dev flags
    this.alwaysShowTutorial = false;

    // Cached vignette (recreated on resize)
    this._vignetteCanvas = null;
    this._vignetteW = 0;
    this._vignetteH = 0;

    // Achievement system
    this.unlockedAchievements = {};
    this.achievementQueue = []; // toast notification queue
    this.achievementToast = null; // currently displaying toast

    // Preload achievement SVG icons into Image objects
    this.achievementIcons = {};
    for (const [key, svgStr] of Object.entries(ACHIEVEMENT_ICON_SVGS)) {
      const img = new Image();
      img.src =
        "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
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
    };
    // Track damage taken per round for flawless detection
    this.roundDamageTaken = 0;

    // ARIA in-game comms system
    this.ariaQueue = []; // queued messages
    this.ariaMessage = null; // { text, color, life, duration }
    this.ariaTriggered = {}; // tracks one-shot triggers per level
    this.ariaEnabled = false; // enabled after clocking_in cutscene
    this.ariaIdleTimer = 0; // seconds since last ARIA message
    this.ariaIdleThreshold = 30; // seconds of silence before idle chatter
    this.ariaCombatTimer = 0; // track time in combat for longSurvival
    this.ariaMessageLog = []; // all ARIA messages for review
    this.showAriaLog = false; // toggle ARIA message log overlay
    this.ariaLogScroll = 0; // scroll position in log

    // Character creator state
    this.character = { ...DEFAULT_CHARACTER };
    this.creatorCategory = 0; // 0=name, 1=color, 2=armor, 3=badge, 4=weaponSkin, 5=loadout
    this.creatorReturnState = null; // state to return to after saving
    this._creatorSaveCallback = null; // optional callback after creator save

    this.setupInput();
    // Apply mobile-optimized defaults before loading saved settings.
    // Wide FOV + compact HUD keeps the game playable on small screens.
    if (this.isTouchDevice) {
      this.settings.fov = 100;
      this.settings.hudScale = 65;
    }
    this.loadSettings();
    this._applyMobileMigration();
    this.loadDevFlags();
    this.loadAchievements();
    this.loadCharacter();
  }

  // TODO: Abstract out InputManager

  lockPointer() {
    if (!this.isTouchDevice) {
      try {
        this.canvas.requestPointerLock();
      } catch (e) {
        /* requires gesture */
      }
    }
  }

  unlockPointer() {
    if (!this.isTouchDevice && document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch (e) {
        /* already unlocked */
      }
    }
  }

  // Returns a font string with the size scaled by the fontScale setting
  scaledFont(sizePx, style = "") {
    const s = Math.round(sizePx * (this.settings.fontScale / 100));
    return `${style ? style + " " : ""}${s}px monospace`;
  }

  // Remap UI colors for colorblind accessibility
  cbColor(hex) {
    const m = this.settings.colorblind;
    if (!m) return hex;
    const lower = hex.toLowerCase();
    // Deuteranopia & Protanopia: remap red/green
    if (m === 1 || m === 2) {
      if (
        lower === "#ff2200" ||
        lower === "#ff4400" ||
        lower === "#ff4444" ||
        lower === "#ff0000"
      )
        return "#ff8800"; // red → orange
      if (
        lower === "#00ff66" ||
        lower === "#44ff44" ||
        lower === "#00ff00" ||
        lower === "#00cc44"
      )
        return "#00ccff"; // green → cyan
      if (lower === "#ff8866") return "#ffbb44"; // kill orange → gold
    }
    // Tritanopia: remap blue/yellow
    if (m === 3) {
      if (lower === "#00ccff" || lower === "#00ddff" || lower === "#00ffcc")
        return "#ff88cc"; // cyan → pink
      if (lower === "#ffcc00" || lower === "#ffaa00") return "#ff8844"; // yellow → orange
    }
    return hex;
  }

  setupInput() {
    document.addEventListener("keydown", (e) => {
      // Builder delegates input to its own handler
      if (this.state === GameState.BUILDER) {
        if (this.builder.handleKeyDown(e)) return;
      }
      // Rebinding mode — capture the next key
      if (this.state === GameState.CONTROLS && this.rebindingKey) {
        e.preventDefault();
        if (e.code !== "Escape") {
          const oldCode = this.keybinds[this.rebindingKey];
          // Swap with any action already using this key
          let swappedAction = null;
          for (const action of Object.keys(this.keybinds)) {
            if (
              action !== this.rebindingKey &&
              this.keybinds[action] === e.code
            ) {
              this.keybinds[action] = oldCode;
              swappedAction = action;
              break;
            }
          }
          this.keybinds[this.rebindingKey] = e.code;
          if (swappedAction) {
            this._keybindSwapFlash = {
              action: swappedAction,
              time: performance.now(),
            };
          }
          this.saveSettings();
        }
        this.rebindingKey = null;
        return;
      }

      // Double-tap dash detection for movement keys
      const dashKeys = [
        this.keybinds.moveForward,
        this.keybinds.moveLeft,
        this.keybinds.moveBack,
        this.keybinds.moveRight,
      ];
      if (
        dashKeys.includes(e.code) &&
        !e.repeat &&
        this.state === GameState.PLAYING
      ) {
        const now = performance.now();
        if (this.lastTapKey === e.code && now - this.lastTapTime < 250) {
          this.triggerDash(e.code);
          this.lastTapKey = null;
        } else {
          this.lastTapKey = e.code;
          this.lastTapTime = now;
        }
      }
      this.keys[e.code] = true;
      // Prevent Tab from shifting DOM focus in menus
      if (e.code === "Tab" && this.state === GameState.CHARACTER_CREATE) {
        e.preventDefault();
      }
      this.handleKeyPress(e.code, e);
      // Prevent ESC from leaking to main.js when CHARACTER_CREATE changes state
      if (
        e.code === "Escape" &&
        (this.state === GameState.MODE_SELECT ||
          this.state === GameState.TUTORIAL_COMPLETE)
      ) {
        // State just changed via handleKeyPress — suppress further listeners
        const now = performance.now();
        if (now - (this._creatorExitTime || 0) < 100) {
          e.stopImmediatePropagation();
        }
      }
    });
    document.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });
    document.addEventListener("mousemove", (e) => {
      if (this.mouse.locked) {
        this.mouse.dx += e.movementX;
        this.mouse.dy += e.movementY;
      }
    });
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.canvas.addEventListener("mousedown", (e) => {
      if (this.state === GameState.CHARACTER_CREATE && e.button === 0) {
        this._handleCreatorClick(e);
        return;
      }
      if (this.state === GameState.BUILDER) {
        if (!this.mouse.locked && !this.builder.overhead) {
          this.lockPointer();
          return;
        }
        this.builder.handleMouseDown(e.button);
        return;
      }
      if (e.button === 0) {
        if (this.state === GameState.PLAYING) {
          this.player.isFiring = true;
        }
        if (!this.mouse.locked && this.state === GameState.PLAYING) {
          this.lockPointer();
        }
      }
    });
    this.canvas.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        this.player.isFiring = false;
      }
    });
    document.addEventListener("pointerlockchange", () => {
      if (this.isTouchDevice) return; // touch controls manage their own state
      const wasLocked = this.mouse.locked;
      this.mouse.locked = document.pointerLockElement === this.canvas;
      // Only auto-pause if we lost pointer lock without ESC (e.g. alt-tab)
      if (wasLocked && !this.mouse.locked && this.state === GameState.PLAYING) {
        const now = performance.now();
        if (now - this.lastEscTime > 200) {
          this.state = GameState.PAUSED;
        }
      }
    });
  }

  handleKeyPress(code, e) {
    // Nested Spaghetti 😂🤦‍♂️
    // TODO: Abstract into StateManager

    // TITLE and MODE_SELECT input is handled exclusively by main.js
    // (which owns the DOM elements for those screens)
    if (
      this.state === GameState.TITLE ||
      this.state === GameState.MODE_SELECT
    ) {
      return;
    }

    if (this.state === GameState.BUILDER) {
      // Only Escape is handled by the host (for pause)
      if (code === "Escape") {
        const now = performance.now();
        if (now - this.lastEscTime < 200) return;
        this.lastEscTime = now;
        this.pausedFromState = GameState.BUILDER;
        this.state = GameState.PAUSED;
        this.unlockPointer();
      }
      return;
    }

    // Campaign prompt (with/without tutorial)
    if (this.state === GameState.CAMPAIGN_PROMPT) {
      const menuLen = 2;
      if (code === "ArrowUp" || code === "KeyW") {
        this.campaignPromptSelection =
          (this.campaignPromptSelection - 1 + menuLen) % menuLen;
        this.audio.menuSelect();
        return;
      }
      if (code === "ArrowDown" || code === "KeyS") {
        this.campaignPromptSelection =
          (this.campaignPromptSelection + 1) % menuLen;
        this.audio.menuSelect();
        return;
      }
      if (code === "Enter" || code === "Space") {
        this.audio.menuConfirm();
        this.executeCampaignPromptChoice(this.campaignPromptSelection);
        return;
      }
      if (code === "Digit1") {
        this.audio.menuConfirm();
        this.executeCampaignPromptChoice(0);
        return;
      }
      if (code === "Digit2") {
        this.audio.menuConfirm();
        this.executeCampaignPromptChoice(1);
        return;
      }
      if (code === "Escape") {
        this.audio.menuConfirm();
        this.state = GameState.MODE_SELECT;
        return;
      }
      return;
    }

    // Tutorial completion — standalone full-screen menu
    if (this.state === GameState.TUTORIAL_COMPLETE) {
      const menuLen = 4;
      if (code === "ArrowUp" || code === "KeyW") {
        this.tutorialMenuSelection =
          (this.tutorialMenuSelection - 1 + menuLen) % menuLen;
        this.audio.menuSelect();
        return;
      }
      if (code === "ArrowDown" || code === "KeyS") {
        this.tutorialMenuSelection = (this.tutorialMenuSelection + 1) % menuLen;
        this.audio.menuSelect();
        return;
      }
      if (code === "Enter" || code === "Space") {
        this.audio.menuConfirm();
        this.executeTutorialCompletionChoice(this.tutorialMenuSelection);
        return;
      }
      if (code === "Digit1") {
        this.audio.menuConfirm();
        this.executeTutorialCompletionChoice(0);
        return;
      }
      if (code === "Digit2") {
        this.audio.menuConfirm();
        this.executeTutorialCompletionChoice(1);
        return;
      }
      if (code === "Digit3") {
        this.audio.menuConfirm();
        this.executeTutorialCompletionChoice(2);
        return;
      }
      if (code === "Escape") {
        this.audio.menuConfirm();
        this.executeTutorialCompletionChoice(3);
        return;
      }
      return;
    }

    // Character creator — full-screen customization
    if (this.state === GameState.CHARACTER_CREATE) {
      const categories = [
        null, // NAME tab — handled specially
        CHARACTER_COLORS,
        ARMOR_STYLES,
        BADGES,
        WEAPON_SKINS,
        LOADOUT_CLASSES,
      ];
      const catKeys = [
        null, // NAME
        "colorIndex",
        "armorIndex",
        "badgeIndex",
        "weaponSkinIndex",
        "loadoutIndex",
      ];
      const catLen = categories.length;

      // NAME tab (0) — typed text input
      if (this.creatorCategory === 0) {
        // Confirm / Cancel still work
        if (code === "Enter" || code === "Space") {
          this.audio.menuConfirm();
          this._exitCreator(true);
          return;
        }
        if (code === "Escape") {
          const now = performance.now();
          if (now - this.lastEscTime < 200) return;
          this.lastEscTime = now;
          this._creatorExitTime = now;
          this.audio.menuConfirm();
          this._exitCreator(false);
          return;
        }
        // Tab / Arrow to switch category
        if (code === "Tab") {
          if (this.keys["ShiftLeft"] || this.keys["ShiftRight"]) {
            this.creatorCategory = (this.creatorCategory - 1 + catLen) % catLen;
          } else {
            this.creatorCategory = (this.creatorCategory + 1) % catLen;
          }
          this.audio.menuSelect();
          return;
        }
        if (code === "ArrowRight") {
          this.creatorCategory = (this.creatorCategory + 1) % catLen;
          this.audio.menuSelect();
          return;
        }
        if (code === "ArrowLeft") {
          this.creatorCategory = (this.creatorCategory - 1 + catLen) % catLen;
          this.audio.menuSelect();
          return;
        }
        // Backspace deletes last char
        if (code === "Backspace") {
          if (this.character.name.length > 0) {
            this.character.name = this.character.name.slice(0, -1);
          }
          return;
        }
        // Typed letter/number — append to name (max 16 chars)
        if (e?.key && e.key.length === 1 && this.character.name.length < 16) {
          this.character.name += e.key;
        }
        return;
      }

      const itemLen = categories[this.creatorCategory].length;

      // Switch category
      if (code === "Tab") {
        if (this.keys["ShiftLeft"] || this.keys["ShiftRight"]) {
          // Shift+Tab → previous category
          this.creatorCategory = (this.creatorCategory - 1 + catLen) % catLen;
        } else {
          this.creatorCategory = (this.creatorCategory + 1) % catLen;
        }
        this.audio.menuSelect();
        return;
      }
      if (code === "ArrowRight" || code === "KeyD") {
        this.creatorCategory = (this.creatorCategory + 1) % catLen;
        this.audio.menuSelect();
        return;
      }
      if (code === "ArrowLeft" || code === "KeyA") {
        this.creatorCategory = (this.creatorCategory - 1 + catLen) % catLen;
        this.audio.menuSelect();
        return;
      }

      // Navigate items within category
      if (code === "ArrowUp" || code === "KeyW") {
        const key = catKeys[this.creatorCategory];
        let next = (this.character[key] - 1 + itemLen) % itemLen;
        // Skip locked loadouts
        if (this.creatorCategory === 5) {
          for (let tries = 0; tries < itemLen; tries++) {
            if (categories[5][next].unlocked !== false) break;
            next = (next - 1 + itemLen) % itemLen;
          }
        }
        this.character[key] = next;
        this.audio.menuSelect();
        return;
      }
      if (code === "ArrowDown" || code === "KeyS") {
        const key = catKeys[this.creatorCategory];
        let next = (this.character[key] + 1) % itemLen;
        // Skip locked loadouts
        if (this.creatorCategory === 5) {
          for (let tries = 0; tries < itemLen; tries++) {
            if (categories[5][next].unlocked !== false) break;
            next = (next + 1) % itemLen;
          }
        }
        this.character[key] = next;
        this.audio.menuSelect();
        return;
      }

      // Confirm — save and return
      if (code === "Enter" || code === "Space") {
        this.audio.menuConfirm();
        this._exitCreator(true);
        return;
      }

      // Cancel — discard and return
      if (code === "Escape") {
        const now = performance.now();
        if (now - this.lastEscTime < 200) return;
        this.lastEscTime = now;
        this._creatorExitTime = now;
        this.audio.menuConfirm();
        this._exitCreator(false);
        return;
      }
      return;
    }

    if (this.state === GameState.PLAYING) {
      // Tutorial sandbox — ESC/Q returns to title, C starts campaign
      if (this.mode === "tutorial" && this.tutorialStep === 11) {
        if (code === "Escape" || code === "KeyQ") {
          this.audio.menuConfirm();
          this.executeTutorialMenuChoice(3); // Main menu
          return;
        }
        if (code === "KeyC") {
          this.audio.menuConfirm();
          this.executeTutorialCompletionChoice(1); // Begin Campaign
          return;
        }
      }

      // Tutorial (non-sandbox steps): ESC exits tutorial to title
      if (this.mode === "tutorial" && this.tutorialStep < 11) {
        if (code === "Escape") {
          const now = performance.now();
          if (now - this.lastEscTime < 200) return;
          this.lastEscTime = now;
          this.unlockPointer();
          this.audio.stopMusic();
          this.mode = null;
          this.state = GameState.TITLE;
          return;
        }
      }

      // Weapon switching
      const prevWeapon = this.player.currentWeapon;
      if (code === this.keybinds.weapon1 && this.player.weapons.length >= 1)
        this.player.currentWeapon = 0;
      if (code === this.keybinds.weapon2 && this.player.weapons.length >= 2)
        this.player.currentWeapon = 1;
      if (code === this.keybinds.weapon3 && this.player.weapons.length >= 3)
        this.player.currentWeapon = 2;
      if (code === this.keybinds.weapon4 && this.player.weapons.length >= 4)
        this.player.currentWeapon = 3;
      if (this.player.currentWeapon !== prevWeapon)
        this.triggerAriaOnce("weaponSwitch", "weaponSwitch");

      if (code === this.keybinds.interact) this.interact();
      if (code === this.keybinds.pause || code === "KeyP") {
        const now = performance.now();
        if (now - this.lastEscTime < 200) return;
        this.lastEscTime = now;
        this.pausedFromState = GameState.PLAYING;
        this.state = GameState.PAUSED;
        this.unlockPointer();
      }
      if (code === this.keybinds.toggleFPS) this.showFPS = !this.showFPS;
      return;
    }

    if (this.state === GameState.PAUSED) {
      if (code === "Escape" || code === "Enter" || code === "KeyP") {
        const now = performance.now();
        if (now - this.lastEscTime < 200) return;
        this.lastEscTime = now;
        this.showAriaLog = false;
        this.state = this.pausedFromState || GameState.PLAYING;
        this.lockPointer();
        this.triggerAriaOnce("pauseResume", "pauseResume");
      }
      if (code === "KeyQ") {
        if (this.mode === "playtest") {
          this.exitBuilderPlayTest();
          return;
        }
        if (this.builder && this.pausedFromState === GameState.BUILDER) {
          this.builder.saveMap();
          this.builder.stop();
        }
        this.state = GameState.TITLE;
        this.audio.stopMusic();
      }
      if (code === "KeyS" || code === "Tab") {
        this.settingsSelection = 0;
        this.state = GameState.SETTINGS;
      }
      if (code === "KeyC") {
        this.controlsSelection = 0;
        this.rebindingKey = null;
        this.state = GameState.CONTROLS;
      }
      if (code === "KeyA") {
        this.achievementsScroll = 0;
        this.state = GameState.ACHIEVEMENTS;
      }
      if (code === "KeyL") {
        this.showAriaLog = !this.showAriaLog;
        this.ariaLogScroll = 0;
      }
      // Scroll ARIA log with W/S
      if (this.showAriaLog) {
        if (code === "KeyW" || code === "ArrowUp") {
          this.ariaLogScroll = Math.min(
            this.ariaLogScroll + 1,
            Math.max(0, this.ariaMessageLog.length - 5),
          );
        }
        if (code === "KeyS" || code === "ArrowDown") {
          this.ariaLogScroll = Math.max(0, this.ariaLogScroll - 1);
        }
      }
      if (code === "KeyF" && this.mode === "campaign") {
        this.saveCampaign();
        this.pauseSaveFlash = performance.now();
      }
      return;
    }

    if (this.state === GameState.SETTINGS) {
      // Table-driven settings: each entry defines key, min, max, step, wrap, and optional onChange
      const settingsDef = [
        { key: "difficulty", min: 0, max: 3, step: 1, wrap: true },
        { key: "crosshair", min: 0, max: 5, step: 1, wrap: true },
        { key: "minimapSize", min: 100, max: 300, step: 20 },
        {
          key: "musicVolume",
          min: 0,
          max: 100,
          step: 10,
          onChange: () =>
            this.audio.setMusicVolume(this.settings.musicVolume / 100),
        },
        {
          key: "sfxVolume",
          min: 0,
          max: 100,
          step: 10,
          onChange: () =>
            this.audio.setSfxVolume(this.settings.sfxVolume / 100),
        },
        { key: "sensitivity", min: 0.5, max: 2.0, step: 0.1, round: 1 },
        { key: "fov", min: 50, max: 120, step: 5 },
        { key: "viewMode", min: 0, max: 1, step: 1, wrap: true },
        { key: "invertX", toggle: true },
        { key: "fontScale", min: 100, max: 150, step: 25 },
        { key: "colorblind", min: 0, max: 3, step: 1, wrap: true },
        { key: "hudScale", min: 75, max: 125, step: 25 },
        { key: "staminaBarSize", min: 75, max: 150, step: 25 },
        { key: "showPortrait", toggle: true },
        { key: "showWeapons", toggle: true },
        { key: "showKills", toggle: true },
        { key: "showScore", toggle: true },
        { key: "touchSensitivity", min: 0.5, max: 3.0, step: 0.1, round: 1 },
      ];
      const settingsCount = settingsDef.length;
      if (code === "ArrowUp" || code === "KeyW") {
        this.settingsSelection =
          (this.settingsSelection - 1 + settingsCount) % settingsCount;
        this.audio.menuSelect();
      }
      if (code === "ArrowDown" || code === "KeyS") {
        this.settingsSelection = (this.settingsSelection + 1) % settingsCount;
        this.audio.menuSelect();
      }
      if (
        code === "Enter" ||
        code === "Space" ||
        code === "ArrowRight" ||
        code === "ArrowLeft"
      ) {
        const def = settingsDef[this.settingsSelection];
        const dir = code === "ArrowLeft" ? -1 : 1;
        if (def.toggle) {
          this.settings[def.key] = !this.settings[def.key];
        } else if (def.wrap) {
          const range = def.max - def.min + 1;
          this.settings[def.key] =
            def.min +
            ((this.settings[def.key] - def.min + dir + range) % range);
        } else {
          let val = this.settings[def.key] + def.step * dir;
          val = Math.max(def.min, Math.min(def.max, val));
          if (def.round != null)
            val =
              Math.round(val * Math.pow(10, def.round)) /
              Math.pow(10, def.round);
          this.settings[def.key] = val;
        }
        if (def.onChange) def.onChange();
        this.audio.menuConfirm();
      }
      if (code === "Escape") {
        const now = performance.now();
        if (now - this.lastEscTime < 200) return;
        this.lastEscTime = now;
        this.saveSettings();
        this.state = GameState.PAUSED;
      }
      return;
    }

    if (this.state === GameState.CONTROLS) {
      if (this.rebindingKey) return; // handled by setupInput keydown listener
      const bindKeys = Object.keys(this.keybinds);
      const totalItems = bindKeys.length + 1; // +1 for "Reset Defaults"
      if (code === "ArrowUp" || code === "KeyW") {
        this.controlsSelection =
          (this.controlsSelection - 1 + totalItems) % totalItems;
        this.audio.menuSelect();
      }
      if (code === "ArrowDown" || code === "KeyS") {
        this.controlsSelection = (this.controlsSelection + 1) % totalItems;
        this.audio.menuSelect();
      }
      if (code === "Enter" || code === "Space") {
        if (this.controlsSelection < bindKeys.length) {
          // Start rebinding
          this.rebindingKey = bindKeys[this.controlsSelection];
          this.audio.menuConfirm();
        } else {
          // Reset defaults
          this.keybinds = {
            moveForward: "KeyW",
            moveBack: "KeyS",
            moveLeft: "KeyA",
            moveRight: "KeyD",
            sprint: "ShiftLeft",
            interact: "KeyE",
            pause: "Escape",
            weapon1: "Digit1",
            weapon2: "Digit2",
            weapon3: "Digit3",
            weapon4: "Digit4",
            toggleFPS: "KeyF",
          };
          this.saveSettings();
          this.audio.menuConfirm();
        }
      }
      if (code === "Escape") {
        const now = performance.now();
        if (now - this.lastEscTime < 200) return;
        this.lastEscTime = now;
        this.saveSettings();
        this.state = GameState.PAUSED;
      }
      return;
    }

    if (this.state === GameState.ACHIEVEMENTS) {
      if (code === "Escape" || code === "KeyA") {
        const now = performance.now();
        if (now - this.lastEscTime < 200) return;
        this.lastEscTime = now;
        this.state = GameState.PAUSED;
      }
      if (code === "ArrowUp" || code === "KeyW") {
        this.achievementsScroll = Math.max(
          0,
          (this.achievementsScroll || 0) - 1,
        );
      }
      if (code === "ArrowDown" || code === "KeyS") {
        this.achievementsScroll = (this.achievementsScroll || 0) + 1;
      }
      return;
    }

    if (this.state === GameState.UPGRADE) {
      const upgradeKeys = Object.keys(UPGRADES);
      const cols = 2;
      const totalRows = Math.ceil(upgradeKeys.length / cols);
      const curIdx = this.upgradeSelection;
      const isOnContinue = curIdx === upgradeKeys.length;

      if (code === "ArrowUp" || code === "KeyW") {
        if (isOnContinue) {
          // Move from continue to last row, keep in left column
          this.upgradeSelection = (totalRows - 1) * cols;
        } else {
          const col = curIdx % cols;
          const row = Math.floor(curIdx / cols);
          if (row > 0) {
            this.upgradeSelection = (row - 1) * cols + col;
          } else {
            // Wrap to continue button
            this.upgradeSelection = upgradeKeys.length;
          }
        }
        this.audio.menuSelect();
      }
      if (code === "ArrowDown" || code === "KeyS") {
        if (isOnContinue) {
          // Wrap to first row left column
          this.upgradeSelection = 0;
        } else {
          const col = curIdx % cols;
          const row = Math.floor(curIdx / cols);
          if (
            row < totalRows - 1 &&
            (row + 1) * cols + col < upgradeKeys.length
          ) {
            this.upgradeSelection = (row + 1) * cols + col;
          } else {
            // Go to continue button
            this.upgradeSelection = upgradeKeys.length;
          }
        }
        this.audio.menuSelect();
      }
      if (code === "ArrowLeft" || code === "KeyA") {
        if (!isOnContinue) {
          const col = curIdx % cols;
          if (col > 0) {
            this.upgradeSelection = curIdx - 1;
            this.audio.menuSelect();
          }
        }
      }
      if (code === "ArrowRight" || code === "KeyD") {
        if (!isOnContinue) {
          const col = curIdx % cols;
          if (col < cols - 1 && curIdx + 1 < upgradeKeys.length) {
            this.upgradeSelection = curIdx + 1;
            this.audio.menuSelect();
          }
        }
      }
      if (code === "Enter" || code === "Space") {
        if (this.upgradeSelection === upgradeKeys.length) {
          // Continue button
          this.audio.menuConfirm();
          this.startArenaRound();
        } else {
          this.buyUpgrade(upgradeKeys[this.upgradeSelection]);
        }
      }
      return;
    }

    if (
      this.state === GameState.GAME_OVER ||
      this.state === GameState.VICTORY
    ) {
      if (code === "Enter" || code === "Space") {
        this.audio.menuConfirm();
        this.state = GameState.TITLE;
        this.audio.stopMusic();
      }
      if (code === "KeyR" && this.state === GameState.GAME_OVER) {
        this.audio.menuConfirm();
        if (this.mode === "arena") this.startArena();
        else if (this.mode === "campaign") this.startCampaign();
      }
      return;
    }

    if (this.state === GameState.LEVEL_COMPLETE) {
      if (code === "Enter" || code === "Space") {
        this.audio.menuConfirm();
        this.nextCampaignLevel();
      }
      return;
    }

    if (this.state === GameState.CUTSCENE) {
      if (code === "Enter" || code === "Space") {
        this.advanceCutsceneFrame();
      }
      if (code === "Escape") {
        const now = performance.now();
        if (now - this.lastEscTime < 200) return;
        this.lastEscTime = now;
        this.endCutscene();
      }
      return;
    }
  }

  applyAudioSettings() {
    this.audio.setMusicVolume(this.settings.musicVolume / 100);
    this.audio.setSfxVolume(this.settings.sfxVolume / 100);
  }

  // Save / Load
  saveSettings() {
    try {
      localStorage.setItem("cc_settings", JSON.stringify(this.settings));
      localStorage.setItem("cc_keybinds", JSON.stringify(this.keybinds));
    } catch (_) {}
  }

  loadSettings() {
    try {
      const raw = localStorage.getItem("cc_settings");
      if (raw) {
        const saved = JSON.parse(raw);
        // Whitelist known keys to avoid prototype pollution
        for (const key of Object.keys(this.settings)) {
          if (Object.prototype.hasOwnProperty.call(saved, key)) {
            const val = saved[key];
            if (typeof val !== typeof this.settings[key]) continue;
            this.settings[key] = val;
          }
        }
      }
    } catch (_) {}
    try {
      const raw = localStorage.getItem("cc_keybinds");
      if (raw) {
        const saved = JSON.parse(raw);
        for (const key of Object.keys(this.keybinds)) {
          if (Object.prototype.hasOwnProperty.call(saved, key)) {
            const val = saved[key];
            if (typeof val === "string") {
              this.keybinds[key] = val;
            }
          }
        }
      }
    } catch (_) {}
  }

  // One-time migration for existing mobile users who had desktop-tuned defaults
  _applyMobileMigration() {
    if (!this.isTouchDevice) return;
    try {
      // v2 migration: widen FOV to 100, shrink HUD to 65
      if (!localStorage.getItem("cc_mobile_v2")) {
        const hasExisting = localStorage.getItem("cc_settings") !== null;
        // Only override if user still has old v1 defaults or desktop defaults
        const usesOldDefaults =
          (this.settings.fov === 90 && this.settings.hudScale === 75) ||
          (this.settings.fov === 70 && this.settings.hudScale === 100);
        if (!hasExisting || usesOldDefaults) {
          this.settings.fov = 100;
          this.settings.hudScale = 65;
          this.saveSettings();
        }
        localStorage.setItem("cc_mobile_v2", "1");
        localStorage.setItem("cc_mobile_v1", "1");
      }
      // v3 migration: bump touch sensitivity from 1.5 to 2.0
      if (!localStorage.getItem("cc_mobile_v3")) {
        if (this.settings.touchSensitivity === 1.5) {
          this.settings.touchSensitivity = 2.0;
          this.saveSettings();
        }
        localStorage.setItem("cc_mobile_v3", "1");
      }
    } catch (_) {}
  }

  // Dev feature flags
  loadDevFlags() {
    try {
      this.alwaysShowTutorial =
        localStorage.getItem("cc_dev_always_tutorial") === "1";
    } catch (_) {}
  }

  saveCharacter() {
    try {
      localStorage.setItem("cc_character", JSON.stringify(this.character));
    } catch (_) {}
  }

  loadCharacter() {
    try {
      const raw = localStorage.getItem("cc_character");
      if (raw) {
        const saved = JSON.parse(raw);
        const maxIndices = {
          colorIndex: CHARACTER_COLORS.length - 1,
          armorIndex: ARMOR_STYLES.length - 1,
          badgeIndex: BADGES.length - 1,
          weaponSkinIndex: WEAPON_SKINS.length - 1,
          loadoutIndex: LOADOUT_CLASSES.length - 1,
        };
        for (const key of Object.keys(DEFAULT_CHARACTER)) {
          if (Object.prototype.hasOwnProperty.call(saved, key)) {
            let val = saved[key];
            if (typeof val !== typeof DEFAULT_CHARACTER[key]) continue;
            // Clamp indices to valid range
            if (key in maxIndices) {
              val = Math.max(0, Math.min(val, maxIndices[key]));
            }
            this.character[key] = val;
          }
        }
      }
    } catch (_) {}
  }

  setAlwaysTutorial(on) {
    this.alwaysShowTutorial = on;
    try {
      if (on) {
        localStorage.setItem("cc_dev_always_tutorial", "1");
      } else {
        localStorage.removeItem("cc_dev_always_tutorial");
      }
    } catch (_) {}
  }

  // Achievement persistence
  saveAchievements() {
    try {
      localStorage.setItem(
        "cc_achievements",
        JSON.stringify({
          unlocked: this.unlockedAchievements,
          stats: this.achievementStats,
        }),
      );
    } catch (_) {}
  }

  loadAchievements() {
    try {
      const raw = localStorage.getItem("cc_achievements");
      if (raw) {
        const data = JSON.parse(raw);
        if (data.unlocked && typeof data.unlocked === "object") {
          for (const key of Object.keys(data.unlocked)) {
            if (Object.prototype.hasOwnProperty.call(ACHIEVEMENTS, key)) {
              this.unlockedAchievements[key] = true;
            }
          }
        }
        if (data.stats && typeof data.stats === "object") {
          for (const key of Object.keys(this.achievementStats)) {
            if (Object.prototype.hasOwnProperty.call(data.stats, key)) {
              const val = data.stats[key];
              if (typeof val === typeof this.achievementStats[key]) {
                this.achievementStats[key] = val;
              }
            }
          }
        }
      }
    } catch (_) {}
  }

  unlockAchievement(id) {
    if (this.unlockedAchievements[id]) return;
    if (!ACHIEVEMENTS[id] || id.startsWith("_")) return;
    this.unlockedAchievements[id] = true;
    this.achievementQueue.push(id);
    this.saveAchievements();
  }

  checkAchievements() {
    // Update rolling stats
    this.achievementStats.highestScore = Math.max(
      this.achievementStats.highestScore,
      this.player.score,
    );

    for (const [id, ach] of Object.entries(ACHIEVEMENTS)) {
      if (id.startsWith("_")) continue;
      if (this.unlockedAchievements[id]) continue;
      if (ach.check(this.achievementStats)) {
        this.unlockAchievement(id);
      }
    }
  }

  updateAchievementToast(dt) {
    // Process toast queue
    if (!this.achievementToast && this.achievementQueue.length > 0) {
      const id = this.achievementQueue.shift();
      const ach = ACHIEVEMENTS[id];
      if (ach) {
        this.achievementToast = {
          id,
          name: ach.name,
          description: ach.description,
          icon: ach.icon,
          time: 0,
          duration: 3.5, // seconds to display
        };
        this.audio.pickup();
      }
    }
    if (this.achievementToast) {
      this.achievementToast.time += dt;
      if (this.achievementToast.time >= this.achievementToast.duration) {
        this.achievementToast = null;
      }
    }
  }

  renderAchievementToast(ctx, w, h) {
    const toast = this.achievementToast;
    if (!toast) return;

    const t = toast.time;
    const dur = toast.duration;
    // Slide in from right (0-0.4s), hold, slide out (last 0.4s)
    let slideX = 0;
    if (t < 0.4) {
      slideX = (1 - t / 0.4) * 350;
    } else if (t > dur - 0.4) {
      slideX = ((t - (dur - 0.4)) / 0.4) * 350;
    }

    const boxW = 320;
    const boxH = 70;
    const bx = w - boxW - 20 + slideX;
    const by = 20;

    ctx.save();

    // Background
    ctx.fillStyle = "rgba(10, 10, 30, 0.92)";
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 8);
    ctx.fill();

    // Gold border
    ctx.strokeStyle = "#ffcc00";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 8);
    ctx.stroke();

    // Gold accent line on left
    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.roundRect(bx, by, 4, boxH, [8, 0, 0, 8]);
    ctx.fill();

    // Icon — draw SVG image or fall back to text
    const iconImg = this.achievementIcons[toast.icon];
    if (iconImg && iconImg.complete && iconImg.naturalWidth > 0) {
      const iconSize = 32;
      ctx.drawImage(iconImg, bx + 14, by + 19, iconSize, iconSize);
    } else {
      ctx.font = "28px monospace";
      ctx.textAlign = "center";
      ctx.fillText(toast.icon, bx + 30, by + 44);
    }

    // "ACHIEVEMENT UNLOCKED"
    ctx.fillStyle = "#ffcc00";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    ctx.fillText("ACHIEVEMENT UNLOCKED", bx + 55, by + 22);

    // Name
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px monospace";
    ctx.fillText(toast.name, bx + 55, by + 42);

    // Description
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "12px monospace";
    ctx.fillText(toast.description, bx + 55, by + 58);

    ctx.restore();
  }

  // ── ARIA in-game comms ──────────────────────────────────
  queueAriaMessage(category) {
    if (!this.ariaEnabled) return;
    const pool = ARIA_COMMS[category];
    if (!pool || pool.length === 0) return;
    const text = pool[Math.floor(Math.random() * pool.length)];
    // Only idle chatter and personality moments use the subtle bottom-left style
    const prominent = !["idle", "ariaPersonality"].includes(category);
    this.ariaQueue.push({
      text,
      color: "#00ffdd",
      duration: prominent ? 4.5 : 3.5,
      prominent,
    });
  }

  triggerAriaOnce(key, category) {
    if (this.ariaTriggered[key]) return;
    this.ariaTriggered[key] = true;
    this.queueAriaMessage(category);
  }

  updateAriaComms(dt) {
    if (!this.ariaEnabled) return;
    // Drain queue into active message
    if (!this.ariaMessage && this.ariaQueue.length > 0) {
      const msg = this.ariaQueue.shift();
      this.ariaMessage = { ...msg, life: 0 };
      this.ariaIdleTimer = 0; // reset idle clock when speaking
      // Log the message for review
      this.ariaMessageLog.push(msg.text);
    }
    if (this.ariaMessage) {
      this.ariaMessage.life += dt;
      if (this.ariaMessage.life >= this.ariaMessage.duration) {
        this.ariaMessage = null;
      }
    }

    // Track combat time for longSurvival trigger
    if (this.state === GameState.PLAYING) {
      this.ariaCombatTimer += dt;
      // Long survival callout at 120s
      if (this.ariaCombatTimer > 120) {
        this.triggerAriaOnce("longSurvival", "longSurvival");
      }

      // Idle chatter — ARIA talks when nothing's been said for a while
      this.ariaIdleTimer += dt;
      if (
        this.ariaIdleTimer >= this.ariaIdleThreshold &&
        !this.ariaMessage &&
        this.ariaQueue.length === 0
      ) {
        // 50% chance idle, 50% chance personality moment
        const pool = Math.random() < 0.5 ? "idle" : "ariaPersonality";
        this.queueAriaMessage(pool);
        // Randomize next idle between 25-50s
        this.ariaIdleThreshold = 25 + Math.random() * 25;
        this.ariaIdleTimer = 0;
      }
    }
  }

  renderAriaComms(ctx, w, h) {
    const msg = this.ariaMessage;
    if (!msg) return;

    const t = msg.life;
    const dur = msg.duration;

    // ── Prominent (centered) messages ──
    if (msg.prominent) {
      let alpha = 1;
      const fadeIn = 0.4;
      const fadeOut = 0.5;
      if (t < fadeIn) alpha = t / fadeIn;
      else if (t > dur - fadeOut) alpha = 1 - (t - (dur - fadeOut)) / fadeOut;

      // Slide down from top
      let slideY = 0;
      if (t < fadeIn) slideY = (1 - t / fadeIn) * -40;

      ctx.save();
      ctx.globalAlpha = alpha;

      const pBoxW = 460;
      const pBx = (w - pBoxW) / 2;
      const pBy = h * 0.28 + slideY;

      // Pre-compute wrapped text lines to size the box
      const ariaText = msg.text.replace(
        /\{AGENT\}/g,
        this.character.name || "Agent",
      );
      ctx.font = "14px monospace";
      const maxTextW = pBoxW - 32;
      const words = ariaText.split(" ");
      const lines = [];
      let currentLine = "";
      for (const word of words) {
        const testLine = currentLine ? currentLine + " " + word : word;
        if (ctx.measureText(testLine).width > maxTextW && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
      const lineH = 17;
      const pBoxH = 64 + Math.max(0, lines.length - 1) * lineH;

      // Background with stronger presence
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
      ctx.fillStyle = "#00ccff";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText("ARIA", w / 2, pBy + 18);

      // Message text centered
      ctx.fillStyle = msg.color;
      ctx.font = "14px monospace";
      const textStartY = lines.length > 1 ? pBy + 36 : pBy + 44;
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], w / 2, textStartY + i * lineH);
      }

      ctx.textAlign = "left";
      ctx.restore();
      return;
    }

    // Slide in from left (0-0.3s), hold, slide out (last 0.4s)
    let slideX = 0;
    if (t < 0.3) {
      slideX = (1 - t / 0.3) * -360;
    } else if (t > dur - 0.4) {
      slideX = ((t - (dur - 0.4)) / 0.4) * -360;
    }
    // Fade
    let alpha = 1;
    if (t < 0.3) alpha = t / 0.3;
    else if (t > dur - 0.4) alpha = 1 - (t - (dur - 0.4)) / 0.4;

    ctx.save();
    ctx.globalAlpha = alpha;

    const boxW = 340;
    const boxH = 54;
    const bx = 16 + slideX;
    const by = h - 124;

    // Background
    ctx.fillStyle = "rgba(0, 10, 20, 0.92)";
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 6);
    ctx.fill();

    // Cyan border (subtle)
    ctx.strokeStyle = "rgba(0,200,255,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 6);
    ctx.stroke();

    // --- ARIA Mini Portrait ---
    const px = bx + 7;
    const py = by + 5;
    const pw = 40;
    const ph = 44;

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

    // High-collar suit top
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
    // Suit collar cyan trim
    ctx.strokeStyle = "#00ddff";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 9);
    ctx.lineTo(cx - 14, cy + 14 + breathe);
    ctx.moveTo(cx + 6, cy + 9);
    ctx.lineTo(cx + 14, cy + 14 + breathe);
    ctx.stroke();
    // Suit center line
    ctx.strokeStyle = "rgba(0,200,255,0.4)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 13);
    ctx.lineTo(cx, cy + 22);
    ctx.stroke();

    // Face (slightly oval)
    ctx.fillStyle = "rgba(190, 225, 245, 0.8)";
    ctx.beginPath();
    ctx.ellipse(cx, cy - 2, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Holographic grid overlay on face
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
    // Left side (longer)
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy - 14);
    ctx.quadraticCurveTo(cx - 13, cy - 10, cx - 12, cy + 3);
    ctx.lineTo(cx - 9, cy + 2);
    ctx.quadraticCurveTo(cx - 10, cy - 8, cx - 3, cy - 11);
    ctx.closePath();
    ctx.fill();
    // Right side (shorter)
    ctx.beginPath();
    ctx.moveTo(cx + 3, cy - 14);
    ctx.quadraticCurveTo(cx + 12, cy - 10, cx + 10, cy - 1);
    ctx.lineTo(cx + 8, cy - 2);
    ctx.quadraticCurveTo(cx + 9, cy - 8, cx + 3, cy - 11);
    ctx.closePath();
    ctx.fill();
    // Top hair
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 13);
    ctx.quadraticCurveTo(cx, cy - 16, cx + 5, cy - 13);
    ctx.quadraticCurveTo(cx, cy - 11, cx - 5, cy - 13);
    ctx.fill();

    // Cyan highlight streak (left side)
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
    // Eye glow bloom
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

    // Tech headset with boom mic
    ctx.strokeStyle = "rgba(80, 100, 120, 0.9)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy - 3, 11, -0.65 * Math.PI, -0.15 * Math.PI);
    ctx.stroke();
    // Earpiece
    ctx.fillStyle = "rgba(30, 50, 70, 0.9)";
    ctx.beginPath();
    ctx.ellipse(cx + 10, cy - 1, 2.5, 4, 0.15, 0, Math.PI * 2);
    ctx.fill();
    // Boom mic arm
    ctx.strokeStyle = "rgba(80, 100, 120, 0.7)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx + 9, cy + 2);
    ctx.quadraticCurveTo(cx + 8, cy + 6, cx + 3, cy + 7);
    ctx.stroke();
    // Mic tip
    ctx.fillStyle = "#00ddff";
    ctx.beginPath();
    ctx.arc(cx + 3, cy + 7, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Holographic scanlines over portrait
    ctx.fillStyle = `rgba(0, 200, 255, ${0.03 + Math.sin(t * 8) * 0.02})`;
    for (let sy = 0; sy < ph; sy += 2) {
      ctx.fillRect(px, py + sy, pw, 1);
    }

    // --- Text area ---
    const tx = bx + 54;

    // "ARIA" label
    ctx.fillStyle = "#00ccff";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "left";
    ctx.fillText("ARIA", tx, by + 17);

    // Pulsing indicator dot
    const dotAlpha = 0.5 + Math.sin(t * 6) * 0.4;
    ctx.fillStyle = `rgba(0,255,200,${dotAlpha})`;
    ctx.beginPath();
    ctx.arc(tx + 32, by + 14, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Waveform visualizer (animated while speaking)
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
    const ariaText = msg.text.replace(
      /\{AGENT\}/g,
      this.character.name || "Agent",
    );
    ctx.fillStyle = msg.color;
    ctx.font = "13px monospace";
    ctx.fillText(ariaText, tx, by + 38);

    ctx.restore();
  }

  saveArena() {
    try {
      const data = {
        version: SAVE_VERSION,
        round: this.arenaRound,
        ...this.player.serialize(),
        upgradeLevels: this.upgradeLevels,
        difficulty: this.settings.difficulty,
      };
      localStorage.setItem("cc_arena_save", JSON.stringify(data));
    } catch (_) {}
  }

  // TODO: Reconsider current arena loading. Better system or no loading at all? This will get tricky to track if we add different maps, procedural generation, additional random upgrades. Too much *randomness* to track reliably
  loadArena() {
    try {
      const raw = localStorage.getItem("cc_arena_save");
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data.version !== SAVE_VERSION) {
        this.clearArenaSave();
        return false;
      }
      this.mode = "arena";
      this.arenaRound = data.round;
      this.player.reset();
      this.player.deserialize(data);
      this.upgradeLevels = data.upgradeLevels || {};
      this.settings.difficulty = data.difficulty ?? this.settings.difficulty;
      this.startArenaRound();
      return true;
    } catch (_) {
      return false;
    }
  }

  clearArenaSave() {
    try {
      localStorage.removeItem("cc_arena_save");
    } catch (_) {}
  }

  saveCampaign() {
    try {
      const entityStates = this.entities.map((e) => {
        if (e.type === "enemy") {
          return {
            type: "enemy",
            active: e.active,
            health: e.health,
            x: e.x,
            y: e.y,
            state: e.state,
          };
        }
        return { type: e.type, active: e.active };
      });
      const data = {
        version: SAVE_VERSION,
        level: this.campaignLevel,
        act: this.campaignAct || 1,
        playerX: this.player.x,
        playerY: this.player.y,
        playerAngle: this.player.angle,
        ...this.player.serialize(),
        difficulty: this.settings.difficulty,
        mapGrid: this.map.grid,
        entityStates,
        killedEnemies: this.killedEnemies,
      };
      localStorage.setItem("cc_campaign_save", JSON.stringify(data));
    } catch (_) {}
  }

  loadCampaignSave() {
    try {
      const raw = localStorage.getItem("cc_campaign_save");
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data.version !== SAVE_VERSION) {
        this.clearCampaignSave();
        return false;
      }
      this.mode = "campaign";
      this.campaignLevel = data.level;
      this.campaignAct = data.act || 1;
      this.settings.difficulty = data.difficulty ?? this.settings.difficulty;
      this.player.reset();
      this.loadCampaignLevel(this.campaignLevel);

      // Restore player stats
      this.player.deserialize(data);

      // Restore exact position if save has it
      if (data.playerX !== undefined) {
        this.player.x = data.playerX;
        this.player.y = data.playerY;
        this.player.angle = data.playerAngle;
      }

      // Restore map grid (opened doors/secrets)
      if (data.mapGrid) {
        this.map.grid = data.mapGrid;
      }

      // Restore entity states (dead enemies, collected pickups)
      if (
        data.entityStates &&
        data.entityStates.length === this.entities.length
      ) {
        for (let i = 0; i < data.entityStates.length; i++) {
          const saved = data.entityStates[i];
          const ent = this.entities[i];
          // Validate type match before restoring to prevent index-order corruption
          if (saved.type !== ent.type) continue;
          ent.active = saved.active;
          if (saved.type === "enemy" && ent.type === "enemy") {
            ent.health = saved.health;
            ent.x = saved.x;
            ent.y = saved.y;
            ent.state = saved.state;
          }
        }
        this.killedEnemies = data.killedEnemies ?? 0;
      }

      return true;
    } catch (_) {
      return false;
    }
  }

  clearCampaignSave() {
    try {
      localStorage.removeItem("cc_campaign_save");
    } catch (_) {}
  }

  hasSave() {
    return this.getSaveInfo().length > 0;
  }

  getSaveInfo() {
    const info = [];
    try {
      const arena = localStorage.getItem("cc_arena_save");
      if (arena) {
        const d = JSON.parse(arena);
        info.push({ mode: "arena", round: d.round, score: d.score });
      }
      const campaign = localStorage.getItem("cc_campaign_save");
      if (campaign) {
        const d = JSON.parse(campaign);
        info.push({ mode: "campaign", level: d.level + 1, score: d.score });
      }
    } catch (_) {}
    return info;
  }

  getDifficultyMultipliers() {
    switch (this.settings.difficulty) {
      case 0:
        return {
          healthMul: 0.6,
          damageMul: 0.5,
          speedMul: 0.8,
          spawnMul: 0.7,
          timerBonus: 20,
        };
      case 1:
        return {
          healthMul: 1.0,
          damageMul: 1.0,
          speedMul: 1.0,
          spawnMul: 1.0,
          timerBonus: 0,
        };
      case 2:
        return {
          healthMul: 1.4,
          damageMul: 1.4,
          speedMul: 1.15,
          spawnMul: 1.3,
          timerBonus: -10,
        };
      case 3:
        return {
          healthMul: 2.0,
          damageMul: 1.8,
          speedMul: 1.3,
          spawnMul: 1.6,
          timerBonus: -20,
        };
      default:
        return {
          healthMul: 1.0,
          damageMul: 1.0,
          speedMul: 1.0,
          spawnMul: 1.0,
          timerBonus: 0,
        };
    }
  }

  startArena() {
    this.mode = "arena";
    this.arenaRound = 1;
    this.player.reset();
    this.applyLoadoutBonuses();
    this.upgradeLevels = {};
    this.ariaEnabled = true;
    this.ariaTriggered = {};
    this.queueAriaMessage("arenaStart");
    this.startArenaRound();
  }

  startArenaRound() {
    // TODO: Refactor as we don't properly clean the Arena between rounds, we just reset the player and spawn new enemies on top. Deep cloning will cause performance issues on later levels. Clear entities properly after levels
    this.map = structuredClone(ARENA_MAP);
    this.player.x = this.map.playerStart.x;
    this.player.y = this.map.playerStart.y;
    this.player.angle = this.map.playerStart.dir;
    this.player.alive = true;
    this.arenaTimer = 60;
    this.arenaClearTimer = null;
    this.entities = [];
    this.projectiles = [];

    const diff = this.getDifficultyMultipliers();
    this.arenaTimer = Math.max(30, 60 + diff.timerBonus);

    // Spawn enemies based on round
    const count = Math.min(
      this.map.enemySpawns.length,
      Math.floor((4 + this.arenaRound * 3) * diff.spawnMul),
    );
    const types = ["drone", "glitchling"];
    if (this.arenaRound >= 2) types.push("phantom", "corruptCop");
    if (this.arenaRound >= 4) types.push("beast", "sentinel");

    // TODO: Reconsider this for later levels... this gets brutally difficult
    // Filter spawns to minimum distance 5 from player AND on empty tiles, then shuffle
    const px = this.player.x;
    const py = this.player.y;
    const grid = this.map.grid;
    const validSpawns = this.map.enemySpawns
      .filter((s) => {
        const dx = s.x - px;
        const dy = s.y - py;
        if (Math.sqrt(dx * dx + dy * dy) < 5) return false;
        const gx = Math.floor(s.x);
        const gy = Math.floor(s.y);
        if (gy < 0 || gy >= grid.length || gx < 0 || gx >= grid[0].length)
          return false;
        return grid[gy][gx] === 0;
      })
      .sort(() => Math.random() - 0.5);

    for (let i = 0; i < count; i++) {
      const spawn = validSpawns[i % validSpawns.length];
      const type = types[Math.floor(Math.random() * types.length)];
      const e = new Enemy(spawn.x, spawn.y, type);
      // Scale health with rounds and difficulty
      e.health = Math.floor(
        e.health * (1 + (this.arenaRound - 1) * 0.15) * diff.healthMul,
      );
      e.maxHealth = e.health;
      e.def = {
        ...e.def,
        damage: Math.floor(e.def.damage * diff.damageMul),
        speed: e.def.speed * diff.speedMul,
      };
      this.entities.push(e);
    }

    // Spawn pickups
    for (const p of this.map.pickups) {
      this.entities.push(
        new Pickup(p.x + 0.5, p.y + 0.5, p.type, { weaponId: p.weaponId }),
      );
    }

    // Spawn one extra weapon pickup at milestone rounds
    if (this.arenaRound >= 3 && this.arenaRound < 5) {
      this.entities.push(new Pickup(19.5, 5.5, "weapon", { weaponId: 2 }));
    } else if (this.arenaRound >= 5) {
      this.entities.push(new Pickup(19.5, 5.5, "weapon", { weaponId: 3 }));
    }

    this.killedEnemies = 0;
    this.totalEnemies = this.entities.filter((e) => e.type === "enemy").length;
    this.roundDamageTaken = 0;
    this.killStreak = 0;
    this.killStreakTimer = 0;
    this.killStreakDisplay = null;
    this.bestStreak = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.slowMoTimer = 0;
    this.timeScale = 1;
    this.ariaCombatTimer = 0;

    this.state = GameState.PLAYING;
    this.roundStartTime = performance.now();
    this.audio.startMusic(140 + this.arenaRound * 5);
    this.lockPointer();
  }

  startCampaign() {
    this.mode = "campaign";
    this.campaignLevel = 0;
    this.campaignAct = 1;
    this.campaignMissedWeapons = []; // weapon IDs skipped in previous levels
    this.player.reset();
    this.applyLoadoutBonuses();
    // Play origin story cutscene, then campaign intro
    if (this.cutsceneEngine.hasScript("clocking_in")) {
      this.startCutscene("clocking_in", () => {
        this.ariaEnabled = true;
        this.queueAriaMessage("campaignStart");
        this.startCutscene("intro", () => {
          this.loadCampaignLevel(0);
        });
      });
    } else {
      this.startCutscene("intro", () => {
        this.loadCampaignLevel(0);
      });
    }
  }

  showCampaignPrompt() {
    this.state = GameState.CAMPAIGN_PROMPT;
    this.campaignPromptSelection = 0;
  }

  executeCampaignPromptChoice(choice) {
    const afterCreator = () => {
      if (choice === 0) {
        this.startTutorial();
      } else {
        this.startCampaign();
      }
    };
    this.creatorCategory = 0;
    this._creatorSaveCallback = () => afterCreator();
    this.state = GameState.CHARACTER_CREATE;
  }

  renderCampaignPrompt(ctx, w, h) {
    const now = performance.now();
    const sel = this.campaignPromptSelection || 0;

    // Background
    const grad = ctx.createRadialGradient(
      w / 2,
      h / 2,
      0,
      w / 2,
      h / 2,
      w * 0.7,
    );
    grad.addColorStop(0, "#0a0a2a");
    grad.addColorStop(0.5, "#050515");
    grad.addColorStop(1, "#000005");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Animated ring
    const ringPulse = 0.5 + 0.5 * Math.sin(now * 0.002);
    ctx.save();
    ctx.translate(w / 2, h * 0.25);
    ctx.strokeStyle = `rgba(0, 200, 255, ${0.06 + ringPulse * 0.05})`;
    ctx.lineWidth = 2;
    for (let ring = 0; ring < 3; ring++) {
      const radius = 40 + ring * 18 + Math.sin(now * 0.001 + ring) * 4;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Title
    const titleY = h * 0.2;
    const titlePulse = 0.85 + 0.15 * Math.sin(now * 0.003);
    ctx.save();
    ctx.shadowColor = "#00ccff";
    ctx.shadowBlur = 16 * titlePulse;
    ctx.fillStyle = "#00ccff";
    ctx.font = "bold 32px monospace";
    ctx.textAlign = "center";
    ctx.fillText("START CAMPAIGN", w / 2, titleY);
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.fillStyle = "rgba(170, 200, 220, 0.5)";
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      "Would you like to run through training first?",
      w / 2,
      titleY + 28,
    );

    // Menu
    const menuItems = [
      {
        label: "WITH TUTORIAL",
        key: "[1]",
        color: "#00ffcc",
        desc: "Run station training before deploying",
      },
      {
        label: "SKIP TO CAMPAIGN",
        key: "[2]",
        color: "#ff8844",
        desc: "Deploy directly to the mission",
      },
    ];

    const menuW = 380;
    const itemH = 56;
    const menuH = menuItems.length * itemH + 16;
    const mx = (w - menuW) / 2;
    const my = h * 0.38;

    ctx.fillStyle = "rgba(0, 5, 15, 0.75)";
    ctx.beginPath();
    ctx.roundRect(mx - 10, my - 10, menuW + 20, menuH + 20, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 200, 255, 0.12)";
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
        ctx.fillStyle = `rgba(0, 200, 255, ${0.06 * sPulse})`;
        ctx.beginPath();
        ctx.roundRect(mx, iy, menuW, itemH - 6, 6);
        ctx.fill();
        ctx.fillStyle = item.color;
        ctx.fillRect(mx, iy + 4, 3, itemH - 14);
        ctx.fillStyle = "#00ccff";
        ctx.font = "bold 16px monospace";
        ctx.textAlign = "left";
        ctx.fillText("\u25B8", mx + 12, iy + 26);
      }

      ctx.fillStyle = isSelected ? item.color : "rgba(255,255,255,0.45)";
      ctx.font = `${isSelected ? "bold " : ""}16px monospace`;
      ctx.textAlign = "left";
      ctx.fillText(item.label, mx + 32, iy + 26);

      if (item.desc && isSelected) {
        ctx.fillStyle = "rgba(170, 200, 220, 0.5)";
        ctx.font = "11px monospace";
        ctx.fillText(item.desc, mx + 32, iy + 42);
      }

      ctx.fillStyle = isSelected
        ? "rgba(255,255,255,0.5)"
        : "rgba(255,255,255,0.2)";
      ctx.font = "11px monospace";
      ctx.textAlign = "right";
      ctx.fillText(item.key, mx + menuW - 8, iy + 26);
    }
    ctx.textAlign = "left";

    // Letterbox bars
    const barHeight = h * 0.06;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, barHeight);
    ctx.fillRect(0, h - barHeight, w, barHeight);

    // Bottom hint
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      "W/S to navigate  \u00B7  ENTER to select  \u00B7  ESC to go back",
      w / 2,
      h - barHeight / 2 + 4,
    );
    ctx.textAlign = "left";
  }

  // ── Tutorial system ──────────────────────────────────────────────
  startTutorial() {
    // Play the clocking_in cutscene first to set the scene,
    // then initialize the tutorial level
    this.mode = "tutorial";
    this.player.reset();
    if (this.cutsceneEngine.hasScript("clocking_in")) {
      this.startCutscene("clocking_in", () => {
        this.ariaEnabled = true;
        this.initTutorialLevel();
      });
    } else {
      this.initTutorialLevel();
    }
  }

  initTutorialLevel() {
    this.map = structuredClone(TUTORIAL_MAP);
    this.player.x = TUTORIAL_MAP.playerStart.x;
    this.player.y = TUTORIAL_MAP.playerStart.y;
    this.player.angle = TUTORIAL_MAP.playerStart.dir;
    this.player.alive = true;
    this.entities = [];
    this.projectiles = [];

    // Spawn tutorial pickups
    for (const p of TUTORIAL_MAP.pickups) {
      this.entities.push(new Pickup(p.x, p.y, p.type, {}));
    }

    this.killedEnemies = 0;
    this.totalEnemies = 0;
    this.exitEntity = null;

    // Tutorial step tracking
    this.tutorialStep = 0;
    this.tutorialStepTime = performance.now();
    this.tutorialStartAngle = this.player.angle;
    this.tutorialCumulativeAngle = 0;
    this.tutorialPrevAngle = this.player.angle;
    this.tutorialStartX = this.player.x;
    this.tutorialStartY = this.player.y;
    this.tutorialSprintTime = 0;
    this.tutorialPickedUp = false;
    this.tutorialDoorOpened = false;
    this.tutorialEnemySpawned = false;
    this.tutorialEnemyKilled = false;
    this.tutorialDashed = false;
    this.tutorialFired = false;
    this.tutorialChronoUsed = false;
    this.tutorialSandboxInit = false;
    this.tutorialMenuSelection = 0;
    this.tutorialOriginPlayed = false;
    this.tutorialShowCompletionMenu = false;

    this.state = GameState.PLAYING;
    this.roundStartTime = performance.now() + 99999; // suppress controls overlay
    this.audio.startMusic(130);
    this.lockPointer();
  }

  advanceTutorialStep() {
    this.tutorialStep++;
    this.tutorialStepTime = performance.now();
    this.audio.menuConfirm();
  }

  updateTutorial(dt) {
    const p = this.player;
    const now = performance.now();
    const elapsed = (now - this.tutorialStepTime) / 1000;

    switch (this.tutorialStep) {
      case 0: // Narrative intro - auto advance
        if (elapsed > 3.5) this.advanceTutorialStep();
        break;

      case 1: {
        // Look around
        const angleDiff = Math.abs(p.angle - this.tutorialPrevAngle);
        // Handle angle wrapping
        const wrapped =
          angleDiff > Math.PI ? 2 * Math.PI - angleDiff : angleDiff;
        this.tutorialCumulativeAngle += wrapped;
        this.tutorialPrevAngle = p.angle;
        if (this.tutorialCumulativeAngle > 3) this.advanceTutorialStep();
        break;
      }

      case 2: {
        // Move with WASD
        const dx = p.x - this.tutorialStartX;
        const dy = p.y - this.tutorialStartY;
        if (Math.sqrt(dx * dx + dy * dy) > 3) this.advanceTutorialStep();
        break;
      }

      case 3: // Shoot — reset flag so pre-step firing doesn't skip
        if (elapsed < 0.05) {
          this.tutorialFired = false;
          break;
        }
        if (this.tutorialFired) this.advanceTutorialStep();
        break;

      case 4: // Sprint
        if (p.isSprinting) this.tutorialSprintTime += dt;
        if (this.tutorialSprintTime > 0.5) this.advanceTutorialStep();
        break;

      case 5: // Dash
        if (this.tutorialDashed) this.advanceTutorialStep();
        break;

      case 6: // Chrono Shift — reset flag so pre-step usage doesn't skip
        if (elapsed < 0.05) {
          this.tutorialChronoUsed = false;
          break;
        }
        if (this.tutorialChronoUsed) this.advanceTutorialStep();
        break;

      case 7: // Open a door with E
        if (this.tutorialDoorOpened) this.advanceTutorialStep();
        break;

      case 8: // Pick up items (health & ammo behind the door)
        if (this.tutorialPickedUp) this.advanceTutorialStep();
        break;

      case 9: // Combat
        if (!this.tutorialEnemySpawned) {
          const enemy = new Enemy(12.5, 12.5, "drone");
          enemy.health = 15;
          enemy.maxHealth = 15;
          enemy.def = { ...enemy.def, damage: 3, speed: enemy.def.speed * 0.5 };
          this.entities.push(enemy);
          this.tutorialEnemySpawned = true;
          this.totalEnemies = 1;
          this.killedEnemies = 0;
        }
        if (this.killedEnemies >= 1) this.advanceTutorialStep();
        break;

      case 10: // Training complete → show completion menu
        if (elapsed > 2 && !this.tutorialOriginPlayed) {
          this.achievementStats.tutorialComplete = true;
          this.checkAchievements();
          this.tutorialOriginPlayed = true;
          this.tutorialMenuSelection = 0;
          this.tutorialShowCompletionMenu = true;
          this.audio.stopMusic();
          this.state = GameState.TUTORIAL_COMPLETE;
          this.unlockPointer();
        }
        break;

      case 11: {
        // Sandbox — spawn training dummies, let player practice
        if (!this.tutorialSandboxInit) {
          this.tutorialSandboxInit = true;
          this.spawnTrainingDummies();
        }
        // Respawn dummies when all killed
        const dummies = this.entities.filter(
          (e) => e.type === "enemy" && e.active && e.state !== "dead",
        );
        if (dummies.length === 0 && this.tutorialSandboxInit) {
          this.spawnTrainingDummies();
        }
        break;
      }
    }
  }

  spawnTrainingDummies() {
    // Clear dead entities
    this.entities = this.entities.filter(
      (e) => e.type !== "enemy" || (e.active && e.state !== "dead"),
    );
    // Spawn 3 dummies at fixed positions
    const dummyPositions = [
      { x: 8.5, y: 8.5 },
      { x: 12.5, y: 10.5 },
      { x: 5.5, y: 12.5 },
    ];
    for (const pos of dummyPositions) {
      const dummy = new Enemy(pos.x, pos.y, "drone");
      dummy.health = 20;
      dummy.maxHealth = 20;
      dummy.speed = 0; // Stationary
      dummy.def = { ...dummy.def, damage: 0, speed: 0, sightRange: 0 };
      dummy.state = "idle";
      this.entities.push(dummy);
    }
    this.totalEnemies = 3;
    this.killedEnemies = 0;
  }

  executeTutorialMenuChoice(choice) {
    this.unlockPointer();
    this.audio.stopMusic();
    this.mode = null;
    switch (choice) {
      case 0: // Campaign
        this.startCampaign();
        break;
      case 1: // Arena
        this.startArena();
        break;
      case 2: // Restart tutorial
        this.startTutorial();
        break;
      case 3: // Main menu
      default:
        this.state = GameState.TITLE;
        break;
    }
  }

  executeTutorialCompletionChoice(choice) {
    this.tutorialShowCompletionMenu = false;
    switch (choice) {
      case 0: // Continue Training (go to sandbox step 9)
        this.state = GameState.PLAYING;
        this.advanceTutorialStep();
        this.audio.startMusic(130);
        this.lockPointer();
        break;
      case 1: // Begin Campaign (skip clocking_in — already seen before tutorial)
        this.unlockPointer();
        this.mode = "campaign";
        this.campaignLevel = 0;
        this.campaignAct = 1;
        this.player.reset();
        this.applyLoadoutBonuses();
        this.startCutscene("the_hunt_begins", () => {
          this.startCutscene("intro", () => {
            this.loadCampaignLevel(0);
          });
        });
        break;
      case 2: // Customize Agent
        this.creatorReturnState = GameState.TUTORIAL_COMPLETE;
        this.state = GameState.CHARACTER_CREATE;
        break;
      case 3: // Main Menu
      default:
        this.unlockPointer();
        this.mode = null;
        this.state = GameState.TITLE;
        break;
    }
  }

  shouldShowTutorial() {
    if (this.alwaysShowTutorial) return true;
    return !this.achievementStats.tutorialComplete;
  }

  renderTutorialOverlay(ctx, w, h) {
    if (this.mode !== "tutorial") return;

    const isMobile = this.isTouchDevice;

    const steps = [
      {
        title: "ARRIVING AT CHRONOS STATION...",
        hint: "Armor calibration in progress...",
        color: "#00ffcc",
      },
      {
        title: "SERVO CALIBRATION — VISUAL TRACKING",
        hint: isMobile
          ? "Drag the right side of the screen to look around"
          : "Move your mouse to look around — the armor tracks your head movement",
        color: "#00ccff",
      },
      {
        title: "LOCOMOTION SYNC",
        hint: isMobile
          ? "Use the joystick on the left to move"
          : "W A S D  to move — the armor amplifies each step precisely",
        color: "#00ccff",
      },
      {
        title: "WEAPONS INTEGRATION",
        hint: isMobile
          ? "Tap the FIRE button to shoot — the rifle syncs to your HUD"
          : "Click to fire — the rifle syncs to your armor's targeting HUD",
        color: "#ff8844",
      },
      {
        title: "SPRINT BURST CALIBRATION",
        hint: isMobile
          ? "Tap RUN/WALK to toggle sprint — the servos amplify your speed"
          : "Hold  SHIFT  to sprint — the servos let you move faster and longer",
        color: "#ffcc00",
      },
      {
        title: "EVASIVE DASH PROTOCOL",
        hint: isMobile
          ? "Tap the DASH button to dash forward"
          : "Double-tap a movement key to dash — each step must be precise",
        color: "#ff44ff",
      },
      {
        title: "CHRONO SHIFT — TIME CONTROL",
        hint: isMobile
          ? "Hold the SLOW button to bend time — release to resume"
          : "Press  Q  to slow time — the Paradox Lord won't see you coming",
        color: "#8844ff",
      },
      {
        title: "OPEN THE ARMORY DOOR",
        hint: isMobile
          ? "Face the door and tap USE to interact"
          : "Face the door and press  E  to interact",
        color: "#ff8844",
      },
      {
        title: "GRAB SUPPLIES",
        hint: "Walk over health packs & ammo — the armor carries more than standard kit",
        color: "#44ff88",
      },
      {
        title: "HOSTILE DETECTED!",
        hint: "Engage the threat — take it down!",
        color: "#ff2244",
      },
      {
        title: "TRAINING COMPLETE",
        hint: "Alpha program passed. You're the last one standing.",
        color: "#00ffcc",
      },
      {
        title: "TRAINING GROUND",
        hint: isMobile
          ? "Free practice — tap PAUSE to quit or start the campaign"
          : "Free practice — Q to quit · C to start the campaign",
        color: "#00ffcc",
      },
    ];

    const step = steps[this.tutorialStep];
    if (!step) return;

    const now = performance.now();
    const elapsed = (now - this.tutorialStepTime) / 1000;

    // Fade in
    const fadeIn = Math.min(1, elapsed / 0.4);
    // Pulse for emphasis
    const pulse = 0.85 + 0.15 * Math.sin(now / 300);

    const boxW = 500;
    const boxH = 80;
    const bx = (w - boxW) / 2;
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

    // Step counter
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    if (this.tutorialStep > 0 && this.tutorialStep < 10) {
      ctx.fillText(`${this.tutorialStep}/9`, dynamicBx + 14, by + 18);
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

    // Sandbox - no overlay menu, just the step indicator
    if (this.tutorialStep === 11) {
      // No menu — sandbox is pure practice mode
    }

    ctx.restore();
  }

  renderTutorialCompletionMenu(ctx, w, h) {
    const now = performance.now();
    const sel = this.tutorialMenuSelection || 0;

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
    const vig = ctx.createRadialGradient(
      w / 2,
      h / 2,
      h * 0.2,
      w / 2,
      h / 2,
      h * 0.8,
    );
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
    ctx.fillText(
      "All systems nominal. What's your next move, agent?",
      w / 2,
      titleY + 24,
    );

    // Decorative line
    ctx.strokeStyle = "rgba(0, 255, 200, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 100, titleY + 36);
    ctx.lineTo(w / 2 + 100, titleY + 36);
    ctx.stroke();

    // Menu items
    const menuItems = [
      {
        label: "CONTINUE TRAINING",
        key: "[1]",
        color: "#ffcc00",
        desc: "Stay in the sandbox",
      },
      {
        label: "BEGIN CAMPAIGN",
        key: "[2]",
        color: "#00ccff",
        desc: "Face the Paradox Lord",
      },
      {
        label: "CUSTOMIZE AGENT",
        key: "[3]",
        color: "#aa44ff",
        desc: "Armor, colors, badges, loadout",
      },
      {
        label: "MAIN MENU",
        key: "[ESC]",
        color: "#666666",
        desc: "Return to title screen",
      },
    ];

    const menuW = 360;
    const itemH = 52;
    const menuH = menuItems.length * itemH + 16;
    const mx = (w - menuW) / 2;
    const my = h * 0.35;

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

      ctx.fillStyle = isSelected
        ? "rgba(255,255,255,0.5)"
        : "rgba(255,255,255,0.2)";
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
    ctx.fillStyle = "rgba(0,0,0,0.03)";
    for (let sy = 0; sy < h; sy += 4) {
      ctx.fillRect(0, sy, w, 1);
    }
    ctx.textAlign = "left";
  }

  applyLoadoutBonuses() {
    const cls = LOADOUT_CLASSES[this.character.loadoutIndex];
    if (!cls || !cls.bonuses) return;
    const b = cls.bonuses;
    if (b.fireRateMultiplier != null)
      this.player.fireRateMultiplier = b.fireRateMultiplier;
    if (b.maxHealth != null) {
      this.player.maxHealth = b.maxHealth;
      this.player.health = b.maxHealth;
    }
    if (b.moveSpeed != null) this.player.moveSpeed = 3.5 + b.moveSpeed;
    if (b.maxStamina != null) {
      this.player.maxStamina = b.maxStamina;
      this.player.stamina = b.maxStamina;
    }
    if (cls.startWeapons) this.player.weapons = [...cls.startWeapons];
    // Class-specific chrono energy tuning
    if (cls.id === "phantom") {
      this.player.maxChronoEnergy = 120; // speed demon gets more chrono
      this.player.dashStaminaCost = 15;
    } else if (cls.id === "enforcer") {
      this.player.maxChronoEnergy = 80; // tank gets less chrono
      this.player.damageMultiplier = 1.15;
    } else if (cls.id === "gunslinger") {
      this.player.maxChronoEnergy = 100;
    }
  }

  getCharacterColor() {
    return CHARACTER_COLORS[this.character.colorIndex] || CHARACTER_COLORS[0];
  }

  getWeaponSkin() {
    return WEAPON_SKINS[this.character.weaponSkinIndex] || WEAPON_SKINS[0];
  }

  renderCharacterCreator(ctx, w, h) {
    const now = performance.now();
    const cat = this.creatorCategory;
    const char = this.character;
    const palette = CHARACTER_COLORS[char.colorIndex];
    const armor = ARMOR_STYLES[char.armorIndex];
    const badge = BADGES[char.badgeIndex];
    const skin = WEAPON_SKINS[char.weaponSkinIndex];
    const loadout = LOADOUT_CLASSES[char.loadoutIndex];

    const categories = [
      { name: "NAME", shortLabel: "NAME", data: null, key: null },
      { name: "COLOR", shortLabel: "CLR", data: CHARACTER_COLORS, key: "colorIndex" },
      { name: "ARMOR", shortLabel: "ARMR", data: ARMOR_STYLES, key: "armorIndex" },
      { name: "BADGE", shortLabel: "BDGE", data: BADGES, key: "badgeIndex" },
      { name: "SKIN", shortLabel: "SKIN", data: WEAPON_SKINS, key: "weaponSkinIndex" },
      { name: "LOADOUT", shortLabel: "LOAD", data: LOADOUT_CLASSES, key: "loadoutIndex" },
    ];

    // Full-screen dark backdrop
    ctx.fillStyle = "#000a14";
    ctx.fillRect(0, 0, w, h);

    // Subtle grid background
    ctx.strokeStyle = "rgba(0, 255, 200, 0.03)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx < w; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();
    }
    for (let gy = 0; gy < h; gy += 40) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    // Title
    const titleY = 44;
    const titlePulse = 0.85 + 0.15 * Math.sin(now * 0.003);
    ctx.save();
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = 16 * titlePulse;
    ctx.fillStyle = palette.accent;
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.fillText("AGENT CUSTOMIZATION", w / 2, titleY);
    ctx.shadowBlur = 0;
    ctx.restore();

    // Decorative line under title
    ctx.strokeStyle = `${palette.primary}55`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 120, titleY + 10);
    ctx.lineTo(w / 2 + 120, titleY + 10);
    ctx.stroke();

    // ─── Category tabs (responsive) ───
    const isMobile = this.isTouchDevice && w < 700;
    const tabGap = isMobile ? 4 : 8;
    const tabW = isMobile
      ? Math.max(
          30,
          Math.floor(
            (w - 50 - (categories.length - 1) * tabGap) / categories.length,
          ),
        )
      : 90;
    const tabH = 28;
    const totalTabW =
      categories.length * tabW + (categories.length - 1) * tabGap;
    const tabX0 = (w - totalTabW) / 2;
    const tabY = titleY + 22;
    const tabLabels = isMobile
      ? categories.map((c) => c.shortLabel)
      : categories.map((c) => c.name);

    for (let i = 0; i < categories.length; i++) {
      const tx = tabX0 + i * (tabW + tabGap);
      const selected = i === cat;

      ctx.fillStyle = selected
        ? `${palette.primary}44`
        : "rgba(255,255,255,0.04)";
      ctx.beginPath();
      ctx.roundRect(tx, tabY, tabW, tabH, 4);
      ctx.fill();

      if (selected) {
        ctx.strokeStyle = palette.accent;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(tx, tabY, tabW, tabH, 4);
        ctx.stroke();
      }

      ctx.fillStyle = selected ? palette.accent : "rgba(255,255,255,0.35)";
      ctx.font = `${selected ? "bold " : ""}${isMobile ? 9 : 11}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText(tabLabels[i], tx + tabW / 2, tabY + 18);
    }

    // ─── Layout: responsive (3-col desktop, 2-col mobile) ───
    const contentY = tabY + tabH + 20;
    const listW = isMobile ? Math.min(w * 0.45, 180) : 200;
    const previewW = isMobile ? Math.min(w * 0.4, 140) : 200;
    const infoW = isMobile ? 0 : 200;
    const contentGap = isMobile ? 8 : 20;
    const totalContentW =
      listW + previewW + (isMobile ? 0 : infoW + contentGap) + contentGap;
    const contentX = (w - totalContentW) / 2;

    // ─── NAME tab — special rendering ───
    if (cat === 0) {
      const nameBoxW = isMobile ? Math.min(320, w - 40) : 320;
      const nameBoxH = 50;
      const nameBoxX = w / 2 - nameBoxW / 2;
      const nameBoxY = contentY + 40;

      // Label
      ctx.fillStyle = palette.accent;
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("AGENT CALLSIGN", w / 2, nameBoxY - 12);

      // Input box
      ctx.fillStyle = "rgba(0, 5, 15, 0.8)";
      ctx.beginPath();
      ctx.roundRect(nameBoxX, nameBoxY, nameBoxW, nameBoxH, 6);
      ctx.fill();

      const blink = Math.sin(now * 0.005) > 0;
      ctx.strokeStyle = blink ? palette.accent : `${palette.accent}88`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(nameBoxX, nameBoxY, nameBoxW, nameBoxH, 6);
      ctx.stroke();

      // Name text
      const displayName = char.name || "";
      const cursor = blink ? "▌" : "";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.fillText(displayName + cursor, w / 2, nameBoxY + 33);

      // Hint
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "11px monospace";
      ctx.fillText(
        "Type your name (max 16 chars) · Backspace to delete",
        w / 2,
        nameBoxY + nameBoxH + 20,
      );

      // Still show character preview below
      const prevCX = w / 2;
      const prevCY = nameBoxY + nameBoxH + 160;
      this._renderCharacterPreview(
        ctx,
        prevCX,
        prevCY,
        palette,
        armor,
        badge,
        skin,
        now,
        loadout,
        1.5,
      );

      // Agent name under preview
      ctx.fillStyle = palette.accent;
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText(char.name || "Agent", prevCX, prevCY + 100);

      // Footer controls
      if (!isMobile) {
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.font = "11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(
          "Click or TAB/\u2190/\u2192 = category  \u00B7  ENTER = save  \u00B7  ESC = cancel",
          w / 2,
          h - 20,
        );
        ctx.textAlign = "left";
      }
      return;
    }

    // ─── Item list (left panel) ───
    const curCat = categories[cat];
    const items = curCat.data;
    const selIdx = char[curCat.key];
    const listX = contentX;
    const maxVisible = Math.min(items.length, 8);
    const itemH = 36;
    const listH = maxVisible * itemH + 16;

    ctx.fillStyle = "rgba(0, 5, 15, 0.7)";
    ctx.beginPath();
    ctx.roundRect(listX, contentY, listW, listH, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 255, 200, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(listX, contentY, listW, listH, 8);
    ctx.stroke();

    // Scroll offset to keep selection visible
    let scrollOff = 0;
    if (selIdx >= maxVisible) scrollOff = selIdx - maxVisible + 1;

    for (let vi = 0; vi < maxVisible; vi++) {
      const i = vi + scrollOff;
      if (i >= items.length) break;
      const item = items[i];
      const iy = contentY + 8 + vi * itemH;
      const isSelected = i === selIdx;

      if (isSelected) {
        const sPulse = 0.6 + 0.4 * Math.sin(now * 0.004);
        ctx.fillStyle = `${palette.primary}${Math.round(15 * sPulse)
          .toString(16)
          .padStart(2, "0")}`;
        ctx.beginPath();
        ctx.roundRect(listX + 4, iy, listW - 8, itemH - 4, 4);
        ctx.fill();
        ctx.fillStyle = palette.accent;
        ctx.fillRect(listX + 4, iy + 6, 3, itemH - 16);
      }

      // Color swatch for color category
      if (cat === 1 && item.primary) {
        ctx.fillStyle = item.primary;
        ctx.beginPath();
        ctx.roundRect(listX + 14, iy + 8, 18, 18, 3);
        ctx.fill();
        ctx.fillStyle = item.accent;
        ctx.beginPath();
        ctx.roundRect(listX + 18, iy + 12, 10, 10, 2);
        ctx.fill();
      }

      const labelX = cat === 1 ? listX + 40 : listX + 16;
      ctx.fillStyle = isSelected ? "#ffffff" : "rgba(255,255,255,0.45)";
      ctx.font = `${isSelected ? "bold " : ""}12px monospace`;
      ctx.textAlign = "left";
      ctx.fillText(item.name, labelX, iy + 22);

      // Lock icon for locked loadouts
      if (cat === 5 && item.unlocked === false) {
        ctx.fillStyle = "rgba(255,100,100,0.6)";
        ctx.font = "10px monospace";
        ctx.fillText("\uD83D\uDD12", listX + listW - 28, iy + 22);
      }
    }

    // ─── Character preview (center panel) ───
    const prevX = contentX + listW + contentGap;
    const prevCX = prevX + previewW / 2;
    const prevH = listH;

    ctx.fillStyle = "rgba(0, 5, 15, 0.6)";
    ctx.beginPath();
    ctx.roundRect(prevX, contentY, previewW, prevH, 8);
    ctx.fill();
    ctx.strokeStyle = `${palette.primary}33`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(prevX, contentY, previewW, prevH, 8);
    ctx.stroke();

    // Draw character preview
    this._renderCharacterPreview(
      ctx,
      prevCX,
      contentY + prevH / 2,
      palette,
      armor,
      badge,
      skin,
      now,
      loadout,
      1.3,
    );

    // ─── Info panel (right) — hidden on mobile ───
    const infoX = prevX + previewW + contentGap;
    const selectedItem = items[selIdx];

    if (!isMobile) {
      ctx.fillStyle = "rgba(0, 5, 15, 0.6)";
      ctx.beginPath();
      ctx.roundRect(infoX, contentY, infoW, prevH, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 255, 200, 0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(infoX, contentY, infoW, prevH, 8);
      ctx.stroke();

      // Info title
      ctx.fillStyle = palette.accent;
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "left";
      ctx.fillText(selectedItem.name, infoX + 12, contentY + 28);

      // Description
      if (selectedItem.desc) {
        ctx.fillStyle = "rgba(200, 220, 240, 0.6)";
        ctx.font = "11px monospace";
        const words = selectedItem.desc.split(" ");
        let line = "";
        let lineY = contentY + 50;
        for (const word of words) {
          const test = line + (line ? " " : "") + word;
          if (ctx.measureText(test).width > infoW - 24) {
            ctx.fillText(line, infoX + 12, lineY);
            line = word;
            lineY += 16;
          } else {
            line = test;
          }
        }
        if (line) ctx.fillText(line, infoX + 12, lineY);
      }

      // Loadout bonuses
      if (cat === 5 && loadout.bonuses) {
        let by = contentY + 90;
        ctx.fillStyle = "rgba(170, 200, 220, 0.5)";
        ctx.font = "11px monospace";
        const b = loadout.bonuses;
        if (b.fireRateMultiplier != null) {
          ctx.fillText(`Fire Rate: ${b.fireRateMultiplier}x`, infoX + 12, by);
          by += 16;
        }
        if (b.maxHealth != null) {
          ctx.fillText(`Max Health: ${b.maxHealth}`, infoX + 12, by);
          by += 16;
        }
        if (b.moveSpeed != null) {
          const sign = b.moveSpeed > 0 ? "+" : "";
          ctx.fillText(`Move Speed: ${sign}${b.moveSpeed}`, infoX + 12, by);
          by += 16;
        }
        if (b.maxStamina != null) {
          ctx.fillText(`Max Stamina: ${b.maxStamina}`, infoX + 12, by);
          by += 16;
        }
        if (loadout.unlocked === false) {
          ctx.fillStyle = "rgba(255, 100, 100, 0.7)";
          ctx.font = "bold 12px monospace";
          ctx.fillText("LOCKED", infoX + 12, by + 10);
        }
      }

      // Color swatches in info panel
      if (cat === 1) {
        let sy = contentY + 80;
        ctx.fillStyle = "rgba(170, 200, 220, 0.4)";
        ctx.font = "10px monospace";
        ctx.fillText("PRIMARY", infoX + 12, sy);
        ctx.fillStyle = palette.primary;
        ctx.fillRect(infoX + 12, sy + 4, 40, 16);
        sy += 30;
        ctx.fillStyle = "rgba(170, 200, 220, 0.4)";
        ctx.font = "10px monospace";
        ctx.fillText("ACCENT", infoX + 12, sy);
        ctx.fillStyle = palette.accent;
        ctx.fillRect(infoX + 12, sy + 4, 40, 16);
        sy += 30;
        ctx.fillStyle = "rgba(170, 200, 220, 0.4)";
        ctx.font = "10px monospace";
        ctx.fillText("DARK", infoX + 12, sy);
        ctx.fillStyle = palette.dark;
        ctx.fillRect(infoX + 12, sy + 4, 40, 16);
      }
    }

    // Agent name at bottom of preview
    ctx.fillStyle = palette.accent;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(char.name || "Agent", prevCX, contentY + prevH - 12);

    // ─── Footer controls ───
    if (!isMobile) {
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        "Click or TAB/A/D = category  \u00B7  Click or W/S = select  \u00B7  ENTER = save  \u00B7  ESC = cancel",
        w / 2,
        h - 20,
      );
      ctx.textAlign = "left";
    }
  }

  _exitCreator(saved) {
    if (saved) this.saveCharacter();
    else this.loadCharacter();
    if (this._creatorSaveCallback) {
      const cb = this._creatorSaveCallback;
      this._creatorSaveCallback = null;
      cb(saved);
    } else {
      this.state = this.creatorReturnState || GameState.TUTORIAL_COMPLETE;
    }
  }

  _handleCreatorClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const w = this.canvas.width;
    const isMobile = this.isTouchDevice && w < 700;
    const categories = [
      { name: "NAME", shortLabel: "NAME", data: null, key: null },
      { name: "COLOR", shortLabel: "CLR", data: CHARACTER_COLORS, key: "colorIndex" },
      { name: "ARMOR", shortLabel: "ARMR", data: ARMOR_STYLES, key: "armorIndex" },
      { name: "BADGE", shortLabel: "BDGE", data: BADGES, key: "badgeIndex" },
      { name: "SKIN", shortLabel: "SKIN", data: WEAPON_SKINS, key: "weaponSkinIndex" },
      { name: "LOADOUT", shortLabel: "LOAD", data: LOADOUT_CLASSES, key: "loadoutIndex" },
    ];

    const titleY = 44;
    const tabGap = isMobile ? 4 : 8;
    const tabW = isMobile
      ? Math.max(
          30,
          Math.floor(
            (w - 50 - (categories.length - 1) * tabGap) / categories.length,
          ),
        )
      : 90;
    const tabH = 28;
    const totalTabW =
      categories.length * tabW + (categories.length - 1) * tabGap;
    const tabX0 = (w - totalTabW) / 2;
    const tabY = titleY + 22;

    // Tab click detection
    if (my >= tabY && my <= tabY + tabH) {
      for (let i = 0; i < categories.length; i++) {
        const tx = tabX0 + i * (tabW + tabGap);
        if (mx >= tx && mx <= tx + tabW) {
          this.creatorCategory = i;
          this.audio.menuSelect();
          return;
        }
      }
    }

    // Item list click detection (non-NAME tabs)
    const cat = this.creatorCategory;
    if (cat === 0) return;

    const curCat = categories[cat];
    const items = curCat.data;
    if (!items) return;

    const contentY = tabY + tabH + 20;
    const listW = isMobile ? Math.min(w * 0.45, 180) : 200;
    const previewW = isMobile ? Math.min(w * 0.4, 140) : 200;
    const infoW = isMobile ? 0 : 200;
    const contentGap = isMobile ? 8 : 20;
    const totalContentW =
      listW + previewW + (isMobile ? 0 : infoW + contentGap) + contentGap;
    const contentX = (w - totalContentW) / 2;
    const listX = contentX;
    const maxVisible = Math.min(items.length, 8);
    const itemH = 36;

    const selIdx = this.character[curCat.key];
    let scrollOff = 0;
    if (selIdx >= maxVisible) scrollOff = selIdx - maxVisible + 1;

    if (mx >= listX && mx <= listX + listW) {
      for (let vi = 0; vi < maxVisible; vi++) {
        const idx = vi + scrollOff;
        if (idx >= items.length) break;
        const iy = contentY + 8 + vi * itemH;
        if (my >= iy && my <= iy + itemH) {
          this.character[curCat.key] = idx;
          return;
        }
      }
    }
  }

  _renderCharacterPreview(
    ctx,
    cx,
    cy,
    palette,
    armor,
    badge,
    skin,
    now,
    loadout,
    scale,
  ) {
    const s = scale || 1;
    const rotAngle = now * 0.001;
    const breathe = Math.sin(now * 0.002) * 2;

    ctx.save();
    ctx.translate(cx, cy + breathe);
    ctx.scale(s, s);

    // ── Armor body ──
    const armorW = 52;
    const armorH = 70;

    // Shadow underneath
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, armorH / 2 + 20, 30, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = palette.dark;
    ctx.fillRect(-14, armorH / 2 - 5, 10, 25);
    ctx.fillRect(4, armorH / 2 - 5, 10, 25);
    // Boots
    ctx.fillStyle = palette.primary;
    ctx.beginPath();
    ctx.roundRect(-16, armorH / 2 + 16, 14, 8, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(2, armorH / 2 + 16, 14, 8, 2);
    ctx.fill();
    // Boot sole accent
    ctx.fillStyle = palette.accent + "44";
    ctx.fillRect(-15, armorH / 2 + 22, 12, 2);
    ctx.fillRect(3, armorH / 2 + 22, 12, 2);

    // Knee pads
    ctx.fillStyle = palette.primary + "88";
    ctx.beginPath();
    ctx.ellipse(-9, armorH / 2 + 2, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(9, armorH / 2 + 2, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main torso
    ctx.fillStyle = palette.primary;
    ctx.beginPath();
    ctx.roundRect(-armorW / 2, -armorH / 2, armorW, armorH, 6);
    ctx.fill();

    // Armor style details
    if (armor.id === "recon") {
      // Light diagonal stripes
      ctx.strokeStyle = palette.accent + "44";
      ctx.lineWidth = 1;
      for (let i = -3; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(-armorW / 2 + i * 12, -armorH / 2);
        ctx.lineTo(-armorW / 2 + i * 12 + armorH, armorH / 2);
        ctx.stroke();
      }
    } else if (armor.id === "heavy") {
      // Thick shoulder plates
      ctx.fillStyle = palette.dark;
      ctx.fillRect(-armorW / 2 - 6, -armorH / 2 - 2, armorW + 12, 14);
      ctx.fillRect(-armorW / 2 - 4, -armorH / 2 + 10, 12, 8);
      ctx.fillRect(armorW / 2 - 8, -armorH / 2 + 10, 12, 8);
    } else if (armor.id === "stealth") {
      // Dark overlay with seam lines
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(-armorW / 2 + 3, -armorH / 2 + 3, armorW - 6, armorH - 6);
      ctx.strokeStyle = palette.accent + "33";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, -armorH / 2);
      ctx.lineTo(0, armorH / 2);
      ctx.stroke();
    } else if (armor.id === "tech") {
      // Utility pouches / tech panels
      ctx.fillStyle = palette.dark;
      ctx.fillRect(-armorW / 2 + 4, 8, 14, 10);
      ctx.fillRect(armorW / 2 - 18, 8, 14, 10);
      ctx.fillStyle = palette.accent + "66";
      ctx.fillRect(-armorW / 2 + 6, 10, 4, 6);
      ctx.fillRect(armorW / 2 - 10, 10, 4, 6);
    }

    // Center accent stripe
    ctx.fillStyle = palette.accent;
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(now * 0.004);
    ctx.fillRect(-2, -armorH / 2 + 8, 4, armorH - 16);
    ctx.globalAlpha = 1;

    // Belt
    ctx.fillStyle = palette.dark;
    ctx.fillRect(-armorW / 2 + 2, armorH / 2 - 10, armorW - 4, 6);
    ctx.fillStyle = palette.accent + "88";
    ctx.beginPath();
    ctx.arc(0, armorH / 2 - 7, 4, 0, Math.PI * 2);
    ctx.fill();

    // Chest emblem glow
    ctx.save();
    ctx.globalAlpha = 0.15 + 0.1 * Math.sin(now * 0.005);
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.arc(0, -10, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Collar / neck
    ctx.fillStyle = palette.dark;
    ctx.fillRect(-10, -armorH / 2 - 6, 20, 8);

    // Helmet
    const helmY = -armorH / 2 - 28;
    ctx.fillStyle = palette.primary;
    ctx.beginPath();
    ctx.arc(0, helmY, 18, 0, Math.PI * 2);
    ctx.fill();
    // Visor
    ctx.fillStyle = palette.accent;
    ctx.globalAlpha = 0.6 + 0.2 * Math.sin(now * 0.003);
    ctx.beginPath();
    ctx.ellipse(0, helmY + 2, 14, 7, 0, 0, Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Visor glint
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.ellipse(-5, helmY - 1, 4, 2, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Arms
    ctx.fillStyle = palette.primary;
    ctx.fillRect(-armorW / 2 - 10, -armorH / 2 + 8, 10, 40);
    ctx.fillRect(armorW / 2, -armorH / 2 + 8, 10, 40);
    // Hands
    ctx.fillStyle = palette.dark;
    ctx.fillRect(-armorW / 2 - 8, -armorH / 2 + 46, 8, 8);
    ctx.fillRect(armorW / 2 + 2, -armorH / 2 + 46, 8, 8);

    // ── Badge ──
    if (badge.icon) {
      const bx = -8;
      const by = -armorH / 2 + 16;
      const icons = {
        shield: "\u25C6",
        skull: "\u2620",
        clock: "\u23F0",
        star: "\u2605",
        bolt: "\u26A1",
        eye: "\u25C9",
        rift: "\u00D7",
      };
      // Badge backing circle with glow
      const badgePulse = 0.6 + 0.4 * Math.sin(now * 0.004);
      ctx.fillStyle = `${palette.dark}cc`;
      ctx.beginPath();
      ctx.arc(bx, by - 4, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = badgePulse;
      ctx.beginPath();
      ctx.arc(bx, by - 4, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Badge icon
      ctx.fillStyle = palette.accent;
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "center";
      ctx.fillText(icons[badge.icon] || "\u2726", bx, by + 2);
      ctx.textAlign = "left";
    }

    // ── Weapon (right hand) ──
    const wpnX = armorW / 2 + 6;
    const wpnY = -armorH / 2 + 30;
    // Weapon body
    const skinColors = {
      default: "#556677",
      carbon: "#222222",
      chrome: "#aabbcc",
      ember: "#aa4400",
      frost: "#4488bb",
      toxic: "#339933",
    };
    ctx.fillStyle = skinColors[skin.id] || "#556677";
    ctx.fillRect(wpnX, wpnY, 6, 30);
    // Barrel tip energy
    ctx.fillStyle = palette.accent;
    ctx.globalAlpha = 0.6 + 0.3 * Math.sin(now * 0.006);
    ctx.fillRect(wpnX + 1, wpnY - 4, 4, 6);
    ctx.globalAlpha = 1;

    // ── Class-specific visual traits ──
    if (loadout) {
      if (loadout.id === "gunslinger") {
        // Dual weapon holsters on hips
        ctx.fillStyle = "#664422";
        ctx.fillRect(-armorW / 2 - 4, 4, 6, 14);
        ctx.fillRect(armorW / 2 - 2, 4, 6, 14);
        // Speed lines
        ctx.strokeStyle = palette.accent + "44";
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const ly = -armorH / 2 + 20 + i * 18;
          ctx.beginPath();
          ctx.moveTo(armorW / 2 + 18, ly);
          ctx.lineTo(armorW / 2 + 28 + i * 4, ly);
          ctx.stroke();
        }
      } else if (loadout.id === "enforcer") {
        // Heavy shoulder pads
        ctx.fillStyle = palette.dark;
        ctx.fillRect(-armorW / 2 - 14, -armorH / 2 + 4, 14, 12);
        ctx.fillRect(armorW / 2, -armorH / 2 + 4, 14, 12);
        // Thick border
        ctx.strokeStyle = palette.primary;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(
          -armorW / 2 - 2,
          -armorH / 2 - 2,
          armorW + 4,
          armorH + 4,
          8,
        );
        ctx.stroke();
      } else if (loadout.id === "phantom") {
        // Ghost after-image
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = palette.accent;
        const ghostOff = 8 + Math.sin(now * 0.003) * 3;
        ctx.beginPath();
        ctx.roundRect(-armorW / 2 + ghostOff, -armorH / 2, armorW, armorH, 6);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Dash trail particles
        for (let i = 0; i < 4; i++) {
          const px = armorW / 2 + 14 + i * 8;
          const py = Math.sin(now * 0.004 + i) * 10;
          ctx.fillStyle = palette.accent;
          ctx.globalAlpha = 0.3 - i * 0.06;
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }

    // ── Rotating energy ring (behind character) ──
    ctx.strokeStyle = palette.accent + "22";
    ctx.lineWidth = 1;
    for (let r = 0; r < 2; r++) {
      ctx.beginPath();
      ctx.arc(0, 0, 60 + r * 12, rotAngle + r, rotAngle + r + Math.PI * 1.2);
      ctx.stroke();
    }

    ctx.restore();
  }

  renderTutorialMenu(ctx, w, h) {
    const now = performance.now();
    const sel = this.tutorialMenuSelection || 0;

    // === Full-screen cinematic backdrop ===
    // Darken and add atmosphere
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

    // === "AGENT READY" title ===
    const titleY = h * 0.15;
    const titlePulse = 0.85 + 0.15 * Math.sin(now * 0.003);

    // Glow underneath
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
    ctx.fillText(
      "Temporal calibration complete. All systems nominal.",
      w / 2,
      titleY + 24,
    );

    // Decorative line
    const lineW = 200;
    ctx.strokeStyle = "rgba(0, 255, 200, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - lineW / 2, titleY + 36);
    ctx.lineTo(w / 2 + lineW / 2, titleY + 36);
    ctx.stroke();

    // === Menu ===
    const menuItems = [
      {
        label: "BEGIN CAMPAIGN",
        key: "[1]",
        color: "#00ccff",
        desc: "Face the Paradox Lord",
      },
      {
        label: "ENTER ARENA",
        key: "[2]",
        color: "#ff8844",
        desc: "Endless combat simulation",
      },
      {
        label: "RECALIBRATE",
        key: "[R]",
        color: "#ffcc00",
        desc: "Restart tutorial",
      },
      { label: "MAIN MENU", key: "[ESC]", color: "#666666", desc: "" },
    ];

    const menuW = 360;
    const itemH = 52;
    const menuH = menuItems.length * itemH + 16;
    const mx = (w - menuW) / 2;
    const my = h * 0.35;

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
        // Highlight background
        const sPulse = 0.6 + 0.4 * Math.sin(now * 0.004);
        ctx.fillStyle = `rgba(0, 255, 200, ${0.06 * sPulse})`;
        ctx.beginPath();
        ctx.roundRect(mx, iy, menuW, itemH - 6, 6);
        ctx.fill();

        // Left accent bar
        ctx.fillStyle = item.color;
        ctx.fillRect(mx, iy + 4, 3, itemH - 14);

        // Selection arrow
        ctx.fillStyle = "#00ffcc";
        ctx.font = "bold 16px monospace";
        ctx.textAlign = "left";
        ctx.fillText("▸", mx + 12, iy + 24);
      }

      // Label
      ctx.fillStyle = isSelected ? item.color : "rgba(255,255,255,0.45)";
      ctx.font = `${isSelected ? "bold " : ""}16px monospace`;
      ctx.textAlign = "left";
      ctx.fillText(item.label, mx + 32, iy + 24);

      // Description
      if (item.desc && isSelected) {
        ctx.fillStyle = "rgba(170, 200, 220, 0.5)";
        ctx.font = "11px monospace";
        ctx.fillText(item.desc, mx + 32, iy + 40);
      }

      // Keybind
      ctx.fillStyle = isSelected
        ? "rgba(255,255,255,0.5)"
        : "rgba(255,255,255,0.2)";
      ctx.font = "11px monospace";
      ctx.textAlign = "right";
      ctx.fillText(item.key, mx + menuW - 8, iy + 24);
    }
    ctx.textAlign = "left";

    // === Bottom hints ===
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      "Practice on dummies while you decide  ·  W/S to navigate  ·  ENTER to select",
      w / 2,
      h - 30,
    );
    ctx.textAlign = "left";
  }

  // ── Cutscene Delegation (engine in js/cutscene.js) ─────────────────
  startCutscene(scriptKey, onComplete) {
    if (this.cutsceneEngine.start(scriptKey, onComplete)) {
      this.state = GameState.CUTSCENE;
    }
  }

  advanceCutsceneFrame() {
    this.cutsceneEngine.advance();
  }

  endCutscene() {
    this.cutsceneEngine.end();
  }

  updateCutscene() {
    this.cutsceneEngine.update();
    // If cutscene ended during update (skip/complete), state was already
    // changed by the onComplete callback or we need to handle it here
    if (!this.cutsceneEngine.isActive && this.state === GameState.CUTSCENE) {
      // Cutscene ended without a callback setting state — shouldn't normally
      // happen, but guard against it
      this.state = GameState.TITLE;
    }
  }

  renderCutscene(ctx, w, h) {
    this.cutsceneEngine.render(ctx, w, h);
  }

  loadCampaignLevel(index) {
    if (index >= CAMPAIGN_LEVELS.length) {
      this.state = GameState.VICTORY;
      this.audio.stopMusic();
      this.audio.roundComplete();
      this.clearCampaignSave();
      this.unlockPointer();
      return;
    }
    const level = CAMPAIGN_LEVELS[index];
    this.map = structuredClone(level);
    this.player.x = level.playerStart.x;
    this.player.y = level.playerStart.y;
    this.player.angle = level.playerStart.dir;
    this.player.alive = true;
    this.entities = [];
    this.projectiles = [];

    const diff = this.getDifficultyMultipliers();

    // Spawn entities from level data
    for (const e of level.entities) {
      if (e.type === "enemy") {
        let enemyType = e.enemyType;
        // Swap boss form based on current act
        if (enemyType === "boss") {
          if (this.campaignAct === 2) enemyType = "boss_form2";
          else if (this.campaignAct === 3) enemyType = "boss_form3";
        }
        const enemy = new Enemy(e.x, e.y, enemyType);
        // Act-based scaling for non-boss enemies
        const actScale = enemyType.startsWith("boss")
          ? 1
          : 1 + (this.campaignAct - 1) * 0.4;
        enemy.health = Math.floor(enemy.health * diff.healthMul * actScale);
        enemy.maxHealth = enemy.health;
        enemy.def = {
          ...enemy.def,
          damage: Math.floor(enemy.def.damage * diff.damageMul * actScale),
          speed: enemy.def.speed * diff.speedMul,
        };
        this.entities.push(enemy);
      } else {
        this.entities.push(
          new Pickup(e.x, e.y, e.type, { weaponId: e.weaponId }),
        );
      }
    }

    // Add exit marker
    if (level.exit) {
      this.exitEntity = {
        x: level.exit.x,
        y: level.exit.y,
        type: "exit",
        active: true,
      };
      this.entities.push(this.exitEntity);
    } else {
      this.exitEntity = null;
    }

    // Spawn missed weapons from previous levels near the player start
    if (this.campaignMissedWeapons && this.campaignMissedWeapons.length > 0) {
      const sx = level.playerStart.x;
      const sy = level.playerStart.y;
      for (let i = 0; i < this.campaignMissedWeapons.length; i++) {
        const wid = this.campaignMissedWeapons[i];
        if (!this.player.weapons.includes(wid)) {
          const angle = (i / this.campaignMissedWeapons.length) * Math.PI * 2;
          this.entities.push(
            new Pickup(
              sx + Math.cos(angle) * 1.5,
              sy + Math.sin(angle) * 1.5,
              "weapon",
              { weaponId: wid },
            ),
          );
        }
      }
    }

    this.killedEnemies = 0;
    this.totalEnemies = this.entities.filter((e) => e.type === "enemy").length;
    this.killStreak = 0;
    this.killStreakTimer = 0;
    this.killStreakDisplay = null;
    this.bestStreak = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.slowMoTimer = 0;
    this.timeScale = 1;
    this.ariaCombatTimer = 0;

    // ARIA boss encounter callout
    const hasBoss = this.entities.some(
      (e) =>
        e.type === "enemy" &&
        (e.enemyType === "boss" ||
          e.enemyType === "boss_form2" ||
          e.enemyType === "boss_form3"),
    );
    if (hasBoss) {
      const form = this.campaignAct;
      if (form === 2) this.queueAriaMessage("bossForm2");
      else if (form === 3) this.queueAriaMessage("bossForm3");
      else this.queueAriaMessage("bossEncounter");
    }

    this.state = GameState.PLAYING;
    this.roundStartTime = performance.now();
    this.audio.startMusic(130);
    this.lockPointer();
  }

  nextCampaignLevel() {
    // Track uncollected weapons from the level we just finished
    if (this.campaignMissedWeapons == null) this.campaignMissedWeapons = [];
    for (const e of this.entities) {
      if (e.type === "weapon" && e.active && e.weaponId != null) {
        if (!this.campaignMissedWeapons.includes(e.weaponId)) {
          this.campaignMissedWeapons.push(e.weaponId);
        }
      }
    }
    // Remove any missed weapons the player has since acquired
    this.campaignMissedWeapons = this.campaignMissedWeapons.filter(
      (id) => !this.player.weapons.includes(id),
    );

    this.campaignLevel++;
    if (this.campaignLevel >= CAMPAIGN_LEVELS.length) {
      this.loadCampaignLevel(this.campaignLevel); // triggers VICTORY via bounds check
      return;
    }
    // Keep player stats but heal a bit
    this.player.health = Math.min(
      this.player.health + 30,
      this.player.maxHealth,
    );
    this.player.ammo = Math.min(this.player.ammo + 20, 999);

    // Act-aware level briefing cutscenes
    const actBriefings = {
      1: { 1: "level2_briefing", 2: "level3_briefing" },
      2: { 1: "act2_level2", 2: "act2_level3" },
      3: { 1: "act3_level2", 2: "act3_boss" },
    };
    const briefingKey = actBriefings[this.campaignAct]?.[this.campaignLevel];
    if (briefingKey && this.cutsceneEngine.hasScript(briefingKey)) {
      this.startCutscene(briefingKey, () => {
        this.loadCampaignLevel(this.campaignLevel);
        this.saveCampaign();
      });
    } else {
      this.loadCampaignLevel(this.campaignLevel);
      this.saveCampaign();
    }
  }

  interact() {
    // Check for doors/secrets at multiple distances in front of player
    const cos = Math.cos(this.player.angle);
    const sin = Math.sin(this.player.angle);
    for (let dist = 0.5; dist <= 1.5; dist += 0.25) {
      const checkX = Math.floor(this.player.x + cos * dist);
      const checkY = Math.floor(this.player.y + sin * dist);

      if (
        checkX < 0 ||
        checkY < 0 ||
        checkX >= this.map.width ||
        checkY >= this.map.height
      )
        continue;

      // Skip the player's own tile
      if (
        checkX === Math.floor(this.player.x) &&
        checkY === Math.floor(this.player.y)
      )
        continue;

      const tile = this.map.grid[checkY][checkX];
      if (tile === 5) {
        // Door
        this.map.grid[checkY][checkX] = 0;
        this.audio.doorOpen();
        if (this.mode === "tutorial") this.tutorialDoorOpened = true;
        return;
      } else if (tile === 6) {
        // Secret wall
        this.map.grid[checkY][checkX] = 0;
        this.player.secretsFound++;
        this.player.score += 500;
        this.audio.secretFound();
        return;
      }
    }
  }

  // Arena Upgrades
  buyUpgrade(key) {
    const upg = UPGRADES[key];
    const level = this.upgradeLevels[key] || 0;
    if (level >= upg.maxLevel) return;
    const cost = Math.floor(upg.baseCost * Math.pow(upg.costScale, level));
    if (this.player.score >= cost) {
      this.player.score -= cost;
      this.upgradeLevels[key] = level + 1;
      upg.apply(this.player);
      this.achievementStats.upgradesBought++;
      this.checkAchievements();
      this.audio.pickup();
      this.queueAriaMessage("upgradeChosen");
    }
  }

  // Combat

  fireWeapon() {
    const now = this.time;
    const wep = this.player.getWeaponDef();
    if (
      !wep ||
      now - this.player.lastFireTime <
        wep.fireRate / (this.player.fireRateMultiplier || 1)
    )
      return;
    if (this.player.ammo < wep.ammoPerShot && wep.id !== 0) return;

    this.player.lastFireTime = now;
    if (wep.id !== 0) this.player.ammo -= wep.ammoPerShot;
    this.player.weaponKick = 1;
    this.weaponAnimFrame = 1;
    this.weaponAnimTime = now;
    this.shotsFired++;
    if (this.mode === "tutorial") this.tutorialFired = true;

    // Sound
    if (wep.id === 0) this.audio.shootPistol();
    else if (wep.id === 1) this.audio.shootShotgun();
    else if (wep.id === 2) this.audio.shootPlasma();
    else if (wep.id === 3) this.audio.shootCannon();

    const damage = wep.damage * this.player.damageMultiplier;

    let aimAngle = this.player.angle;

    if (wep.type === "hitscan") {
      const pellets = (wep.pellets || 1) * (this.player.multiShot || 1);
      for (let p = 0; p < pellets; p++) {
        const spread = (Math.random() - 0.5) * wep.spread * 2;
        const rayAngle = aimAngle + spread;
        this.hitscan(rayAngle, damage, wep.range);
      }
    } else {
      // Projectile - fire extra projectiles with spread for multiShot
      const shots = this.player.multiShot || 1;
      for (let ms = 0; ms < shots; ms++) {
        const spreadAngle = shots > 1 ? (ms - (shots - 1) / 2) * 0.12 : 0;
        const shotAngle = aimAngle + spreadAngle;
        const dirX = Math.cos(shotAngle);
        const dirY = Math.sin(shotAngle);
        const proj = new Projectile(
          this.player.x + dirX * 0.5,
          this.player.y + dirY * 0.5,
          dirX,
          dirY,
          damage,
          12,
          "player",
        );
        proj.color = this.getCharacterColor().accent || wep.color;
        this.projectiles.push(proj);
        this.entities.push(proj);
      }
    }

    this.screenShake = Math.max(
      this.screenShake,
      wep.id === 3 ? 6 : wep.id === 1 ? 4 : 2,
    );
  }

  _onEnemyKill(enemy) {
    this.killStreak++;
    this.killStreakTimer = 0;
    if (this.killStreak > this.bestStreak) this.bestStreak = this.killStreak;

    // Campaign ammo drops — 18% chance to drop ammo on kill
    if (enemy && this.mode === "campaign" && Math.random() < 0.18) {
      this.entities.push(new Pickup(enemy.x, enemy.y, "ammo"));
    }

    // Chrono energy on kill (+20, bonus on streaks)
    const chronoGain = this.killStreak >= 3 ? 30 : 20;
    this.player.chronoEnergy = Math.min(
      this.player.maxChronoEnergy,
      this.player.chronoEnergy + chronoGain,
    );

    const STREAK_TIERS = [
      null, // 1 kill — no announcement
      { text: "DOUBLE KILL", color: "#ffcc00", size: 32 }, // 2
      { text: "TRIPLE KILL", color: "#ff8800", size: 36 }, // 3
      { text: "OVERKILL", color: "#ff4400", size: 40 }, // 4
      { text: "RAMPAGE", color: "#ff0044", size: 44 }, // 5
      { text: "UNSTOPPABLE", color: "#ff00ff", size: 48 }, // 6
      { text: "GODLIKE", color: "#aa00ff", size: 52 }, // 7+
    ];
    const tier = Math.min(this.killStreak, STREAK_TIERS.length) - 1;
    if (tier >= 1) {
      const t = STREAK_TIERS[tier];
      this.killStreakDisplay = {
        text: t.text,
        color: t.color,
        size: t.size,
        life: 2.0,
      };
      this.screenShake = Math.max(this.screenShake, 4 + tier * 2);
      this.audio.roundComplete(); // big pop for streak
      // ARIA streak callouts
      if (this.killStreak === 3) this.queueAriaMessage("killStreak3");
      else if (this.killStreak === 5) this.queueAriaMessage("killStreak5");
      else if (this.killStreak === 7) this.queueAriaMessage("killStreak7");
    }

    // ARIA first kill callout
    this.triggerAriaOnce("firstKill", "firstKill");

    // Slow-mo last kill — triggers when all enemies dead
    if (
      this.totalEnemies > 0 &&
      this.killedEnemies >= this.totalEnemies &&
      this.mode !== "tutorial"
    ) {
      this.slowMoTimer = 1.5;
      this.timeScale = 0.25;
    }
  }

  hitscan(angle, damage, range) {
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const step = 0.1;
    let x = this.player.x;
    let y = this.player.y;

    for (let d = 0; d < range; d += step) {
      x += dirX * step;
      y += dirY * step;

      // Wall check
      const mx = Math.floor(x);
      const my = Math.floor(y);
      if (mx < 0 || my < 0 || mx >= this.map.width || my >= this.map.height)
        break;
      if (this.map.grid[my][mx] > 0) break;

      // Enemy check
      for (const e of this.entities) {
        if (e.type !== "enemy" || !e.active || e.state === "dead") continue;
        const dx = x - e.x;
        const dy = y - e.y;
        if (dx * dx + dy * dy < e.def.radius * e.def.radius) {
          this.damageEnemy(e, damage);
          return;
        }
      }
    }
  }

  damageEnemy(enemy, damage) {
    this.shotsHit++;
    // Critical hit check
    let finalDamage = damage;
    let isCrit = false;
    if (this.player.critChance && Math.random() < this.player.critChance) {
      finalDamage *= 2;
      isCrit = true;
    }

    enemy.health -= finalDamage;
    enemy.hitTime = this.time;
    enemy.state = "pain";
    enemy.painTimer = isCrit ? 250 : 150;
    this.audio.enemyHit();

    // Hit marker
    this.hitMarker = 0.15;

    // Floating damage number
    this.damageNumbers.push({
      x: enemy.x,
      y: enemy.y,
      value: Math.round(finalDamage),
      crit: isCrit,
      life: 0.8,
    });

    // Life steal
    if (this.player.lifeSteal && this.player.alive) {
      const heal = finalDamage * this.player.lifeSteal;
      this.player.health = Math.min(
        this.player.health + heal,
        this.player.maxHealth,
      );
    }

    // Splash damage to nearby enemies
    if (this.player.splashDamage && finalDamage > 0) {
      const splashRadius = 2.5;
      const splashDmg = finalDamage * this.player.splashDamage;
      let splashKills = 0;
      for (const e2 of this.entities) {
        if (
          e2 === enemy ||
          e2.type !== "enemy" ||
          !e2.active ||
          e2.state === "dead"
        )
          continue;
        const sdx = e2.x - enemy.x;
        const sdy = e2.y - enemy.y;
        if (sdx * sdx + sdy * sdy < splashRadius * splashRadius) {
          e2.health -= splashDmg;
          e2.hitTime = this.time;
          if (e2.health <= 0) {
            e2.state = "dead";
            e2.active = false;
            e2.deathTime = this.time;
            this.player.score += e2.def.score;
            this.player.kills++;
            this.killedEnemies++;
            this.achievementStats.totalKills++;
            this.audio.enemyDeath();
            this.glitchEffect = 0.3;
            this._onEnemyKill(e2);
            splashKills++;
          }
        }
      }
      if (splashKills >= 2)
        this.triggerAriaOnce("multiKillSplash", "multiKillSplash");
    }

    if (enemy.health <= 0) {
      enemy.state = "dead";
      enemy.active = false;
      enemy.deathTime = this.time;
      this.player.score += enemy.def.score;
      this.player.kills++;
      this.killedEnemies++;
      this.achievementStats.totalKills++;
      this.audio.enemyDeath();
      this.glitchEffect = 0.3;
      this._onEnemyKill(enemy);

      // Check if boss killed in campaign
      const isBoss =
        enemy.enemyType === "boss" ||
        enemy.enemyType === "boss_form2" ||
        enemy.enemyType === "boss_form3";
      if (isBoss && this.mode === "campaign") {
        this.achievementStats.bossKilled = true;
        this.checkAchievements();

        if (this.campaignAct === 1) {
          // Act 1 complete — false victory subversion, then end game for now
          this.audio.stopMusic();
          this.startCutscene("false_victory", () => {
            this.startCutscene("coming_soon", () => {
              this.state = GameState.TITLE;
              this.mode = null;
              this.clearCampaignSave();
              this.unlockPointer();
            });
          });
        } else if (this.campaignAct === 2) {
          // Act 2 complete — the team regroups for the final stand
          this.audio.stopMusic();
          this.startCutscene("act2_victory", () => {
            this.campaignAct = 3;
            this.campaignLevel = 0;
            this.player.health = this.player.maxHealth;
            this.player.ammo = Math.min(this.player.ammo + 50, 999);
            this.startCutscene("lyra_reveal", () => {
              this.startCutscene("act3_intro", () => {
                this.loadCampaignLevel(0);
                this.saveCampaign();
              });
            });
          });
        } else {
          // Act 3 — True victory. The timeline is truly restored.
          this.achievementStats.campaignComplete = true;
          this.checkAchievements();
          this.audio.stopMusic();
          this.startCutscene("true_victory", () => {
            this.state = GameState.VICTORY;
            this.audio.roundComplete();
            this.clearCampaignSave();
            this.unlockPointer();
          });
        }
      }
    }
  }

  damagePlayer(amount, attacker) {
    if (!this.player.alive) return;

    // Dodge chance
    if (this.player.dodgeChance > 0 && Math.random() < this.player.dodgeChance)
      return;

    let actualDamage = Math.max(1, amount - this.player.armor * 0.3);

    // Shield absorbs damage first
    if (this.player.shield > 0) {
      const shieldAbsorb = Math.min(this.player.shield, actualDamage);
      this.player.shield -= shieldAbsorb;
      actualDamage -= shieldAbsorb;
      if (actualDamage <= 0) return;
    }

    this.player.health -= actualDamage;
    this.player.hurtTime = this.time;
    this.screenShake = Math.max(this.screenShake, 4);
    this.audio.playerHit();
    this.roundDamageTaken += actualDamage;

    // ARIA low health warnings
    const hpPct = this.player.health / this.player.maxHealth;
    if (hpPct <= 0.1 && hpPct > 0) {
      this.triggerAriaOnce("critical", "criticalHealth");
    } else if (hpPct <= 0.3 && hpPct > 0.1) {
      this.triggerAriaOnce("lowHp", "lowHealth");
    }

    // Thorns: reflect damage back to attacker
    if (
      this.player.thorns > 0 &&
      attacker &&
      attacker.active &&
      attacker.state !== "dead"
    ) {
      attacker.health -= amount * this.player.thorns;
      if (attacker.health <= 0) {
        attacker.state = "dead";
        attacker.active = false;
        attacker.deathTime = this.time;
        this.killedEnemies++;
        this.player.score += attacker.def.score;
        this.player.kills++;
        this.audio.enemyDeath();
        this.glitchEffect = 0.3;
        this._onEnemyKill(attacker);
      }
    }

    if (this.player.health <= 0) {
      this.player.health = 0;
      this.player.alive = false;
      this.deathTimer = 1.5;
      this.audio.playerDeath();
      this.queueAriaMessage("playerDeath");
    }
  }

  update(timestamp) {
    this.deltaTime = Math.min(0.05, (timestamp - this.lastFrameTime) / 1000);
    this.lastFrameTime = timestamp;
    this.time = timestamp;

    // Slow-motion time scale (last-kill effect takes priority)
    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= this.deltaTime;
      this.timeScale = 0.25;
      if (this.slowMoTimer <= 0) {
        this.slowMoTimer = 0;
        this.timeScale = this.player.chronoActive ? 0.3 : 1;
      }
    } else if (this.player.chronoActive) {
      // Chrono Shift — player-activated time slow
      this.player.chronoEnergy -= 33 * this.deltaTime; // ~3s at full
      this.timeScale = 0.3;
      if (this.player.chronoEnergy <= 0) {
        this.player.chronoEnergy = 0;
        this.player.chronoActive = false;
        this.timeScale = 1;
      }
    } else if (this.timeScale !== 1 && this.slowMoTimer <= 0) {
      this.timeScale = 1;
    }

    // FPS counter
    this.frameCount++;
    if (timestamp - this.fpsTime > 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = timestamp;
    }

    if (this.state === GameState.CUTSCENE) {
      this.updateCutscene();
      return;
    }
    if (this.state === GameState.BUILDER) {
      this.builder.feedKeys(this.keys);
      this.builder.feedMouse(this.mouse.dx, this.mouse.dy, this.mouse.locked);
      this.mouse.dx = 0;
      this.mouse.dy = 0;
      this.builder.update(this.deltaTime);
      return;
    }
    if (this.state !== GameState.PLAYING) return;

    // Death transition timer
    if (!this.player.alive) {
      if (this.deathTimer > 0) {
        this.deathTimer -= this.deltaTime;
        if (this.deathTimer <= 0) {
          if (this.mode === "playtest") {
            this.exitBuilderPlayTest();
            return;
          }
          this.state = GameState.GAME_OVER;
          this.audio.stopMusic();
          if (this.mode === "arena") this.clearArenaSave();
          else this.clearCampaignSave();
          this.unlockPointer();
        }
      }
      return;
    }

    const dt = this.deltaTime * this.timeScale;

    // Chrono Shift activation (Q key toggle)
    if (this.keys[this.keybinds.chronoShift] && !this._chronoKeyHeld) {
      this._chronoKeyHeld = true;
      if (this.player.chronoActive) {
        this.player.chronoActive = false;
        this.timeScale = 1;
      } else if (this.player.chronoEnergy >= 15) {
        this.player.chronoActive = true;
        if (this.mode === "tutorial") this.tutorialChronoUsed = true;
      }
    }
    if (!this.keys[this.keybinds.chronoShift]) this._chronoKeyHeld = false;

    // Passive chrono energy regen (+5/sec)
    if (
      !this.player.chronoActive &&
      this.player.chronoEnergy < this.player.maxChronoEnergy
    ) {
      this.player.chronoEnergy = Math.min(
        this.player.maxChronoEnergy,
        this.player.chronoEnergy + 5 * this.deltaTime,
      );
    }

    // Kill streak timer decay
    if (this.killStreak > 0) {
      this.killStreakTimer += this.deltaTime;
      if (this.killStreakTimer > 3) {
        this.killStreak = 0;
        this.killStreakTimer = 0;
      }
    }
    // Kill streak display decay
    if (this.killStreakDisplay) {
      this.killStreakDisplay.life -= this.deltaTime;
      if (this.killStreakDisplay.life <= 0) this.killStreakDisplay = null;
    }

    // Arena timer
    if (this.mode === "arena") {
      const prevTimer = this.arenaTimer;
      this.arenaTimer -= dt;

      // Timer warning beep once per second when under 10s
      if (this.arenaTimer <= 10 && this.arenaTimer > 0) {
        if (Math.floor(prevTimer) !== Math.floor(this.arenaTimer)) {
          this.audio.timerWarning();
        }
      }

      // Auto-end round when all enemies killed
      if (
        this.totalEnemies > 0 &&
        this.killedEnemies >= this.totalEnemies &&
        !this.arenaClearTimer
      ) {
        this.arenaClearTimer = 5.0;
      }
      if (this.arenaClearTimer) {
        this.arenaClearTimer -= dt;
        if (this.arenaClearTimer <= 0) {
          this.arenaClearTimer = null;
          this.arenaTimer = 0;
        }
      }

      if (this.arenaTimer <= 0) {
        this.arenaTimer = 0;
        // Round complete
        this.arenaRound++;
        this.player.score += 1000 + this.killedEnemies * 50;
        this.achievementStats.highestArenaRound = Math.max(
          this.achievementStats.highestArenaRound,
          this.arenaRound - 1,
        );
        if (this.roundDamageTaken === 0) {
          this.achievementStats.flawlessRounds++;
          this.queueAriaMessage("noHitRound");
        }
        this.checkAchievements();
        this.audio.stopMusic();
        this.audio.roundComplete();
        this.state = GameState.UPGRADE;
        this.upgradeSelection = 0;
        this.arenaClearTimer = null;
        this.saveArena();
        this.unlockPointer();
        const accuracy =
          this.shotsFired > 0 ? (this.shotsHit / this.shotsFired) * 100 : 0;
        if (accuracy >= 75 && this.shotsFired >= 10)
          this.queueAriaMessage("highAccuracy");
        this.queueAriaMessage("roundComplete");
        this.ariaTriggered = {}; // reset one-shot triggers per round
        return;
      }
    }

    // Playtest — return to builder when all enemies killed (after slow-mo)
    if (this.mode === "playtest") {
      if (
        this.totalEnemies > 0 &&
        this.killedEnemies >= this.totalEnemies &&
        this.slowMoTimer <= 0
      ) {
        if (!this._playtestEndTimer) {
          this._playtestEndTimer = 2.0; // 2-second victory pause
        }
        this._playtestEndTimer -= this.deltaTime;
        if (this._playtestEndTimer <= 0) {
          this._playtestEndTimer = null;
          this.exitBuilderPlayTest();
          return;
        }
      }
    }

    // Tutorial step progression
    if (this.mode === "tutorial") {
      this.updateTutorial(dt);
    }

    // TODO: Reconsider or increase cost as this becomes OP - Same for Shield
    // Player HP Regen
    if (this.player.regenRate > 0) {
      this.player.health = Math.min(
        this.player.maxHealth,
        this.player.health + this.player.regenRate * dt,
      );
    }

    // Shield Regen (2 per second)
    if (
      this.player.maxShield > 0 &&
      this.player.shield < this.player.maxShield
    ) {
      this.player.shield = Math.min(
        this.player.maxShield,
        this.player.shield + 2 * dt,
      );
    }

    // Player movement
    this.updatePlayer(dt);

    // Firing
    if (this.player.isFiring) {
      this.fireWeapon();
    }

    // Weapon animation
    if (this.weaponAnimFrame > 0) {
      if (this.time - this.weaponAnimTime > 80) {
        this.weaponAnimFrame++;
        this.weaponAnimTime = this.time;
        if (this.weaponAnimFrame > 3) this.weaponAnimFrame = 0;
      }
    }

    // Weapon kick recovery
    this.player.weaponKick *= 0.85;
    if (this.player.weaponKick < 0.01) this.player.weaponKick = 0;

    // TODO: Find a better solution here
    // Clean up dead entities (arena only — campaign uses index-based system)
    if (this.mode === "arena" && this.entities.length > 30) {
      this.entities = this.entities.filter(
        (e) =>
          e.active || (e.deathTime != null && this.time - e.deathTime < 2000),
      );
    }

    // Update enemies
    this.updateEnemies(dt);

    // Update projectiles
    this.updateProjectiles(dt);

    // Check pickups
    this.checkPickups();

    // Check exit (campaign)
    if (this.mode === "campaign" && this.exitEntity && this.exitEntity.active) {
      const dx = this.player.x - this.exitEntity.x;
      const dy = this.player.y - this.exitEntity.y;
      if (dx * dx + dy * dy < 1.0) {
        this.state = GameState.LEVEL_COMPLETE;
        this.audio.stopMusic();
        this.audio.roundComplete();
        this.unlockPointer();
        this.queueAriaMessage("levelComplete");
      }
    }

    // Screen shake decay
    this.screenShake *= 0.9;
    if (this.screenShake < 0.1) this.screenShake = 0;

    // Glitch effect decay
    this.glitchEffect *= 0.95;
    if (this.glitchEffect < 0.01) this.glitchEffect = 0;

    // Hit marker decay
    if (this.hitMarker > 0) {
      this.hitMarker -= dt;
      if (this.hitMarker < 0) this.hitMarker = 0;
    }

    // Damage numbers decay
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      this.damageNumbers[i].life -= dt;
      if (this.damageNumbers[i].life <= 0) this.damageNumbers.splice(i, 1);
    }

    // Achievement checks (periodic, not every frame)
    this.checkAchievements();
    this.updateAchievementToast(dt);
    this.updateAriaComms(dt);
  }

  triggerDash(code) {
    const p = this.player;
    const cost = Math.max(0, p.dashStaminaCost);
    if (p.dashCooldown > 0 || p.stamina < cost || p.isDashing) return;

    const cos = Math.cos(p.angle);
    const sin = Math.sin(p.angle);
    let dirX = 0,
      dirY = 0;

    if (code === this.keybinds.moveForward) {
      dirX = cos;
      dirY = sin;
    } else if (code === this.keybinds.moveBack) {
      dirX = -cos;
      dirY = -sin;
    } else if (code === this.keybinds.moveLeft) {
      dirX = sin;
      dirY = -cos;
    } else if (code === this.keybinds.moveRight) {
      dirX = -sin;
      dirY = cos;
    }

    p.isDashing = true;
    p.dashTime = 0.15; // 150ms dash duration
    p.dashDirX = dirX;
    p.dashDirY = dirY;
    p.dashCooldown = 0.4; // 400ms cooldown
    p.stamina -= cost;
    p.staminaRegenDelay = 0.5;
    if (this.mode === "tutorial") this.tutorialDashed = true;
    this.achievementStats.totalDashes++;
    this.triggerAriaOnce("dash", "dashUsed");
  }

  updatePlayer(dt) {
    const p = this.player;
    let moveX = 0,
      moveY = 0;
    const cos = Math.cos(p.angle);
    const sin = Math.sin(p.angle);

    // Dash cooldown
    if (p.dashCooldown > 0) p.dashCooldown -= dt;

    // Active dash movement
    if (p.isDashing) {
      p.dashTime -= dt;
      if (p.dashTime <= 0) {
        p.isDashing = false;
      } else {
        const dashSpeed = p.moveSpeed * 3.5 * p.dashDistMult;
        moveX = p.dashDirX * dashSpeed * dt;
        moveY = p.dashDirY * dashSpeed * dt;

        // Collision detection and movement (dash)
        const margin = 0.2;
        const newX = p.x + moveX;
        const newY = p.y + moveY;
        if (
          this.isPassable(
            Math.floor(newX + margin * Math.sign(moveX)),
            Math.floor(p.y),
          )
        ) {
          p.x = newX;
        }
        if (
          this.isPassable(
            Math.floor(p.x),
            Math.floor(newY + margin * Math.sign(moveY)),
          )
        ) {
          p.y = newY;
        }

        // Mouse look still works during dash
        if (this.mouse.dx !== 0) {
          const invertMul = this.settings.invertX ? -1 : 1;
          p.angle +=
            this.mouse.dx *
            0.002 *
            p.rotSpeed *
            this.settings.sensitivity *
            invertMul;
          this.mouse.dx = 0;
        }
        if (this.keys["ArrowLeft"]) p.angle -= p.rotSpeed * dt;
        if (this.keys["ArrowRight"]) p.angle += p.rotSpeed * dt;

        // Stamina regen paused during dash
        p.staminaRegenDelay = 0.5;
        return;
      }
    }

    // Sprint check: Shift held + moving + has stamina
    const kb = this.keybinds;
    const isMoving =
      this.keys[kb.moveForward] ||
      this.keys[kb.moveBack] ||
      this.keys[kb.moveLeft] ||
      this.keys[kb.moveRight] ||
      this.keys["ArrowUp"] ||
      this.keys["ArrowDown"];
    p.isSprinting = this.keys[kb.sprint] || this.keys["ShiftRight"];
    p.isSprinting = p.isSprinting && isMoving && p.stamina > 0;

    // Stamina management
    if (p.isSprinting) {
      p.stamina = Math.max(
        0,
        p.stamina - 25 * Math.max(0, p.sprintDrainMult) * dt,
      );
      p.staminaRegenDelay = 0.5;
      if (p.stamina <= 0) p.isSprinting = false;
    } else {
      if (p.staminaRegenDelay > 0) {
        p.staminaRegenDelay -= dt;
      } else {
        p.stamina = Math.min(
          p.maxStamina,
          p.stamina + 15 * p.staminaRegenRate * dt,
        );
      }
    }

    const speed = p.isSprinting ? p.moveSpeed * 1.6 : p.moveSpeed;

    // WASD movement
    if (this.keys[kb.moveForward] || this.keys["ArrowUp"]) {
      moveX += cos;
      moveY += sin;
    }
    if (this.keys[kb.moveBack] || this.keys["ArrowDown"]) {
      moveX -= cos;
      moveY -= sin;
    }
    if (this.keys[kb.moveLeft]) {
      moveX += sin;
      moveY -= cos;
    }
    if (this.keys[kb.moveRight]) {
      moveX -= sin;
      moveY += cos;
    }

    // Normalize
    const len = Math.sqrt(moveX * moveX + moveY * moveY);
    if (len > 0) {
      moveX = (moveX / len) * speed * dt;
      moveY = (moveY / len) * speed * dt;
    }

    // Walking bob (faster + harder when sprinting, intense during dash)
    if (p.isDashing) {
      p.weaponBob += dt * 22;
    } else if (len > 0) {
      p.weaponBob += dt * (p.isSprinting ? 15 : 8);
    } else {
      p.weaponBob *= 0.9;
    }

    // Mouse look w/ Sensitivity
    if (this.mouse.dx !== 0) {
      const invertMul = this.settings.invertX ? -1 : 1;
      p.angle +=
        this.mouse.dx *
        0.002 *
        p.rotSpeed *
        this.settings.sensitivity *
        invertMul;
      this.mouse.dx = 0;
    }
    this.mouse.dy = 0;

    // Keyboard rotation
    if (this.keys["ArrowLeft"]) p.angle -= p.rotSpeed * dt;
    if (this.keys["ArrowRight"]) p.angle += p.rotSpeed * dt;

    // Collision detection and movement
    const margin = 0.2;
    const newX = p.x + moveX;
    const newY = p.y + moveY;

    if (
      this.isPassable(
        Math.floor(newX + margin * Math.sign(moveX)),
        Math.floor(p.y),
      )
    ) {
      p.x = newX;
    }
    if (
      this.isPassable(
        Math.floor(p.x),
        Math.floor(newY + margin * Math.sign(moveY)),
      )
    ) {
      p.y = newY;
    }
  }

  isPassable(mx, my) {
    if (mx < 0 || my < 0 || mx >= this.map.width || my >= this.map.height)
      return false;
    return this.map.grid[my][mx] === 0;
  }

  // TODO: Improve Enemy AI
  updateEnemies(dt) {
    for (const e of this.entities) {
      if (e.type !== "enemy" || !e.active) continue;

      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Pain state
      if (e.painTimer > 0) {
        e.painTimer -= dt * 1000;
        if (e.painTimer <= 0) {
          e.state = "chase";
        }
        continue;
      }

      // State machine
      if (e.state === "idle") {
        if (dist < e.alertRange) {
          // Line of sight check
          if (this.hasLineOfSight(e.x, e.y, this.player.x, this.player.y)) {
            e.state = "chase";
          }
        }
      }

      if (e.state === "chase") {
        // Move toward player
        const angle = Math.atan2(dy, dx);
        e.angle = angle;
        const speed = e.speed * dt;

        if (dist > e.def.attackRange * 0.8) {
          const newX = e.x + Math.cos(angle) * speed;
          const newY = e.y + Math.sin(angle) * speed;

          // Collision with wall margin to prevent clipping
          const margin = 0.3;
          const mx = Math.cos(angle) >= 0 ? margin : -margin;
          const my = Math.sin(angle) >= 0 ? margin : -margin;
          if (
            this.isPassable(Math.floor(newX + mx), Math.floor(e.y)) &&
            this.isPassable(Math.floor(newX + mx), Math.floor(e.y + margin)) &&
            this.isPassable(Math.floor(newX + mx), Math.floor(e.y - margin))
          ) {
            e.x = newX;
          }
          if (
            this.isPassable(Math.floor(e.x), Math.floor(newY + my)) &&
            this.isPassable(Math.floor(e.x + margin), Math.floor(newY + my)) &&
            this.isPassable(Math.floor(e.x - margin), Math.floor(newY + my))
          ) {
            e.y = newY;
          }
        }

        // Attack if in range
        if (
          dist < e.def.attackRange &&
          this.time - e.lastAttackTime > e.def.attackRate
        ) {
          if (this.hasLineOfSight(e.x, e.y, this.player.x, this.player.y)) {
            e.state = "attack";
            e.lastAttackTime = this.time;
          }
        }
      }

      if (e.state === "attack") {
        // Re-check line of sight before dealing damage
        if (this.hasLineOfSight(e.x, e.y, this.player.x, this.player.y)) {
          if (e.def.attackType === "ranged") {
            // Fire a projectile toward the player
            const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
            const proj = new Projectile(
              e.x + Math.cos(angle) * 0.4,
              e.y + Math.sin(angle) * 0.4,
              Math.cos(angle),
              Math.sin(angle),
              e.def.damage,
              6,
              "enemy",
            );
            proj.color = e.def.color1;
            this.projectiles.push(proj);
            this.entities.push(proj);
          } else {
            // Melee: direct damage
            this.damagePlayer(e.def.damage, e);
          }
        }
        e.state = "chase";
      }
    }
  }

  hasLineOfSight(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(dist / 0.2);
    const stepX = dx / steps;
    const stepY = dy / steps;

    for (let i = 1; i < steps; i++) {
      const cx = Math.floor(x1 + stepX * i);
      const cy = Math.floor(y1 + stepY * i);
      if (cx < 0 || cy < 0 || cx >= this.map.width || cy >= this.map.height)
        return false;
      if (this.map.grid[cy][cx] > 0) return false;
    }
    return true;
  }

  updateProjectiles(dt) {
    for (const p of this.projectiles) {
      if (!p.active) continue;

      // To prevent wall clipping
      const totalDist = p.speed * dt;
      const stepSize = 0.3; // max distance per sub-step (less than wall thickness)
      const steps = Math.max(1, Math.ceil(totalDist / stepSize));
      const stepDt = dt / steps;

      for (let s = 0; s < steps; s++) {
        if (!p.active) break;

        p.x += p.dirX * p.speed * stepDt;
        p.y += p.dirY * p.speed * stepDt;

        const mx = Math.floor(p.x);
        const my = Math.floor(p.y);
        if (mx < 0 || my < 0 || mx >= this.map.width || my >= this.map.height) {
          p.active = false;
          break;
        }
        if (this.map.grid[my][mx] > 0) {
          p.active = false;
          break;
        }

        // Hit enemies
        if (p.owner === "player") {
          for (const e of this.entities) {
            if (e.type !== "enemy" || !e.active || e.state === "dead") continue;
            const edx = p.x - e.x;
            const edy = p.y - e.y;
            if (edx * edx + edy * edy < e.def.radius * e.def.radius) {
              this.damageEnemy(e, p.damage);
              p.active = false;
              // Splash damage for cannon
              if (p.damage > 50) {
                for (const e2 of this.entities) {
                  if (e2 === e || e2.type !== "enemy" || !e2.active) continue;
                  const sdx = p.x - e2.x;
                  const sdy = p.y - e2.y;
                  if (sdx * sdx + sdy * sdy < 4) {
                    this.damageEnemy(e2, p.damage * 0.5);
                  }
                }
              }
              break;
            }
          }
        }

        // Hit player (enemy projectiles)
        if (p.owner === "enemy" && p.active) {
          const pdx = p.x - this.player.x;
          const pdy = p.y - this.player.y;
          if (pdx * pdx + pdy * pdy < 0.25) {
            this.damagePlayer(p.damage);
            p.active = false;
          }
        }
      }

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
      }
    }

    // Clean up dead projectiles
    this.projectiles = this.projectiles.filter((p) => p.active);
    this.entities = this.entities.filter(
      (e) => e.type !== "projectile" || e.active,
    );
  }

  checkPickups() {
    for (const e of this.entities) {
      if (
        e.type === "enemy" ||
        e.type === "exit" ||
        e.type === "projectile" ||
        !e.active
      )
        continue;
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      if (dx * dx + dy * dy > 1.0) continue;

      // In tutorial, block pickups until step 7 ("Grab Supplies")
      if (this.mode === "tutorial" && this.tutorialStep < 8) {
        if (e.type === "health" || e.type === "ammo") continue;
      }

      if (e.type === "health") {
        if (this.player.health < this.player.maxHealth) {
          this.player.health = Math.min(
            this.player.maxHealth,
            this.player.health + 25,
          );
          e.active = false;
          this.audio.pickup();
          this.triggerAriaOnce("healthPickup", "healthPickup");
          if (this.mode === "tutorial" && this.tutorialStep >= 8)
            this.tutorialPickedUp = true;
        }
      } else if (e.type === "ammo") {
        this.player.ammo = Math.min(999, this.player.ammo + 20);
        e.active = false;
        this.audio.pickup();
        if (this.mode === "tutorial" && this.tutorialStep >= 8)
          this.tutorialPickedUp = true;
      } else if (e.type === "weapon") {
        if (!this.player.weapons.includes(e.weaponId)) {
          this.player.weapons.push(e.weaponId);
          this.player.currentWeapon = this.player.weapons.length - 1;
          this.audio.pickup();
          this.queueAriaMessage("weaponPickup");
        }
        this.player.ammo = Math.min(999, this.player.ammo + 30);
        e.active = false;
      }
    }
  }

  render() {
    const ctx = this.renderer.ctx;
    const w = this.renderer.width;
    const h = this.renderer.height;

    if (
      this.state === GameState.TITLE ||
      this.state === GameState.MODE_SELECT
    ) {
      // Handled by html
      return;
    }

    if (this.state === GameState.CUTSCENE) {
      // Clear HUD canvas so it doesn't overlay the cutscene
      this.hudCtx.clearRect(0, 0, this.hudCanvas.width, this.hudCanvas.height);
      this.renderCutscene(ctx, w, h);
      return;
    }

    if (this.state === GameState.CAMPAIGN_PROMPT) {
      this.hudCtx.clearRect(0, 0, this.hudCanvas.width, this.hudCanvas.height);
      this.renderCampaignPrompt(ctx, w, h);
      return;
    }

    if (this.state === GameState.TUTORIAL_COMPLETE) {
      this.hudCtx.clearRect(0, 0, this.hudCanvas.width, this.hudCanvas.height);
      this.renderTutorialCompletionMenu(ctx, w, h);
      return;
    }

    if (this.state === GameState.CHARACTER_CREATE) {
      this.hudCtx.clearRect(0, 0, this.hudCanvas.width, this.hudCanvas.height);
      this.renderCharacterCreator(ctx, w, h);
      return;
    }

    if (this.state === GameState.BUILDER) {
      this.hudCtx.clearRect(0, 0, this.hudCanvas.width, this.hudCanvas.height);
      this.builder.render(ctx, w, h, this.time);
      return;
    }

    // When paused from builder, render builder scene as the background
    if (
      this.state === GameState.PAUSED &&
      this.pausedFromState === GameState.BUILDER
    ) {
      this.builder.render(ctx, w, h, this.time);
      const hctx = this.hudCtx;
      const hw = this.hudCanvas.width;
      const hh = this.hudCanvas.height;
      hctx.clearRect(0, 0, hw, hh);
      this.renderPauseScreen(hctx, hw, hh);
      return;
    }

    // Screen shake offset
    let shakeX = 0,
      shakeY = 0;
    if (this.screenShake > 0.5) {
      shakeX = (Math.random() - 0.5) * this.screenShake;
      shakeY = (Math.random() - 0.5) * this.screenShake;
    }

    // View bob when sprinting/dashing (whole screen sway)
    if (this.player.isSprinting || this.player.isDashing) {
      const bobIntensity = this.player.isDashing ? 6 : 3;
      shakeX += Math.sin(this.player.weaponBob * 1.1) * bobIntensity;
      shakeY +=
        Math.abs(Math.cos(this.player.weaponBob * 1.1)) * bobIntensity * 0.6;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Render 3D scene
    this.renderer.renderScene(
      this.player,
      this.map,
      this.entities,
      this.time,
      this.settings.fov,
      this.settings.viewMode,
    );

    ctx.restore();

    // Subtle ambient vignette (cached offscreen for performance)
    if (
      !this._vignetteCanvas ||
      this._vignetteW !== w ||
      this._vignetteH !== h
    ) {
      this._vignetteCanvas = document.createElement("canvas");
      this._vignetteCanvas.width = w;
      this._vignetteCanvas.height = h;
      const vCtx = this._vignetteCanvas.getContext("2d");
      const vigGrad = vCtx.createRadialGradient(
        w / 2,
        h / 2,
        h * 0.35,
        w / 2,
        h / 2,
        h * 0.9,
      );
      vigGrad.addColorStop(0, "transparent");
      vigGrad.addColorStop(1, "rgba(0,0,10,0.35)");
      vCtx.fillStyle = vigGrad;
      vCtx.fillRect(0, 0, w, h);
      this._vignetteW = w;
      this._vignetteH = h;
    }
    ctx.drawImage(this._vignetteCanvas, 0, 0);

    // Draw weapon (hidden in third person)
    if (this.settings.viewMode === 0) {
      this.drawWeapon(ctx, w, h);
    }

    // Draw player silhouette in third-person mode
    if (this.settings.viewMode === 1) {
      this.drawThirdPersonModel(ctx, w, h);
    }

    // Hurt flash
    if (this.player.hurtTime && this.time - this.player.hurtTime < 200) {
      const alpha = 0.3 * (1 - (this.time - this.player.hurtTime) / 200);
      ctx.fillStyle = `rgba(255,0,0,${alpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Glitch effect
    if (this.glitchEffect > 0.01) {
      this.drawGlitch(ctx, w, h);
    }

    // Death fade
    if (!this.player.alive) {
      ctx.fillStyle = "rgba(80,0,0,0.5)";
      ctx.fillRect(0, 0, w, h);
    }

    // Render HUD on overlay canvas
    this.renderHUD();

    // Tutorial overlay (rendered on game canvas, above HUD, below pause menus)
    if (this.mode === "tutorial") {
      this.renderTutorialOverlay(ctx, w, h);
    }

    // Render overlay screens on HUD canvas (it's on top via z-index)
    const hctx = this.hudCtx;
    const hw = this.hudCanvas.width;
    const hh = this.hudCanvas.height;
    if (this.state === GameState.PAUSED) this.renderPauseScreen(hctx, hw, hh);
    if (this.state === GameState.SETTINGS)
      this.renderSettingsScreen(hctx, hw, hh);
    if (this.state === GameState.CONTROLS)
      this.renderControlsScreen(hctx, hw, hh);
    if (this.state === GameState.ACHIEVEMENTS)
      this.renderAchievementsScreen(hctx, hw, hh);
    if (this.state === GameState.UPGRADE)
      this.renderUpgradeScreen(hctx, hw, hh);
    if (this.state === GameState.GAME_OVER) this.renderGameOver(hctx, hw, hh);
    if (this.state === GameState.VICTORY) this.renderVictory(hctx, hw, hh);
    if (this.state === GameState.LEVEL_COMPLETE)
      this.renderLevelComplete(hctx, hw, hh);
  }

  // Third-person player silhouette (back view)
  drawThirdPersonModel(ctx, w, h) {
    const bobX = Math.sin(this.player.weaponBob) * 3;
    const bobY = Math.abs(Math.cos(this.player.weaponBob)) * 4;
    const cx = w / 2 + bobX;
    const cy = h - 160 + bobY;
    const sc = 2.8;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);

    // Cape (flowing behind)
    ctx.fillStyle = "rgba(30, 60, 90, 0.7)";
    ctx.beginPath();
    ctx.moveTo(-10, -20);
    ctx.quadraticCurveTo(-14, 0, -12 + Math.sin(this.time / 200) * 2, 20);
    ctx.lineTo(12 + Math.sin(this.time / 250) * 2, 20);
    ctx.quadraticCurveTo(14, 0, 10, -20);
    ctx.closePath();
    ctx.fill();

    // Body (armored torso - back view)
    ctx.fillStyle = "#3a4a5a";
    ctx.fillRect(-8, -22, 16, 24);

    // Shoulder armor
    ctx.fillStyle = "#4a5a6a";
    ctx.fillRect(-12, -22, 5, 8);
    ctx.fillRect(7, -22, 5, 8);

    // Helmet (back)
    ctx.fillStyle = "#2a3a4a";
    ctx.beginPath();
    ctx.arc(0, -28, 7, 0, Math.PI * 2);
    ctx.fill();

    // Visor glow (faint, seen from back)
    ctx.fillStyle = "rgba(0, 200, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(0, -28, 7.5, -0.3, 0.3);
    ctx.fill();

    // Arms
    ctx.fillStyle = "#3a4a5a";
    ctx.fillRect(-14, -14, 4, 14);
    ctx.fillRect(10, -14, 4, 14);

    // Weapon (rifle on back or held forward)
    ctx.fillStyle = "#555";
    ctx.fillRect(-2, -18, 4, -12);
    ctx.fillStyle = "#00ccff";
    ctx.fillRect(-1, -30, 2, 2);

    // Legs
    ctx.fillStyle = "#2a3a4a";
    ctx.fillRect(-6, 2, 5, 16);
    ctx.fillRect(1, 2, 5, 16);

    // Boots
    ctx.fillStyle = "#1a2a3a";
    ctx.fillRect(-7, 16, 6, 4);
    ctx.fillRect(1, 16, 6, 4);

    ctx.restore();
  }

  // TODO: Improve weapon art and animations / Reloading / Idle / Skins / Upgraded versions with visual changes?
  drawWeapon(ctx, w, h) {
    const wep = this.player.getWeaponDef();
    if (!wep) return;

    // Apply character energy color to weapon
    const charColor = CHARACTER_COLORS[this.character.colorIndex];
    const energyColor = charColor ? charColor.accent : wep.color;

    const isSprinting = this.player.isSprinting;
    const isDashing = this.player.isDashing;
    const bobMulX = isDashing ? 18 : isSprinting ? 14 : 8;
    const bobMulY = isDashing ? 12 : isSprinting ? 10 : 5;
    const bobX = Math.sin(this.player.weaponBob) * bobMulX;
    const bobY = Math.abs(Math.cos(this.player.weaponBob)) * bobMulY;
    const kickY = this.player.weaponKick * 40;
    // Tilt weapon when sprinting (held at slight angle)
    const tiltAngle = isSprinting ? Math.sin(this.player.weaponBob) * 0.06 : 0;

    // weapon scale (larger to stay visible above HUD) - increase assets size instead of scaling up as much in the future by default?
    // On touch devices, scale the weapon linearly with viewport height so the view
    // stays clear. The factor is clamped between 0.55 and 1.0 (h/720, with a 0.55 minimum)
    // to keep the weapon visible but not dominate the screen on small displays.
    const viewportFactor = this.isTouchDevice
      ? Math.max(0.55, Math.min(1, h / 720))
      : 1;
    const sc = 4.8 * viewportFactor;
    const cx = w / 2 + bobX;
    const cy = h - 170 * viewportFactor + bobY + kickY;

    ctx.save();
    ctx.translate(cx, cy);
    if (tiltAngle !== 0) ctx.rotate(tiltAngle);
    ctx.scale(sc, sc);
    // All coordinates now relative to (0, 0) at weapon center

    // Recoil animation for frames 2 & 3
    if (this.weaponAnimFrame === 2) {
      ctx.translate(0, -3); // barrel rise
      ctx.rotate(-0.03); // slight kick angle
    } else if (this.weaponAnimFrame === 3) {
      ctx.translate(0, -1); // settling back
      ctx.rotate(-0.01);
    }

    // Muzzle flash
    if (this.weaponAnimFrame === 1) {
      ctx.fillStyle = energyColor;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(0, -40, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(0, -40, 8, 0, Math.PI * 2);
      ctx.fill();
      // Flash spikes
      ctx.strokeStyle = energyColor;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + this.time * 0.02;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 10, -40 + Math.sin(a) * 10);
        ctx.lineTo(Math.cos(a) * 22, -40 + Math.sin(a) * 22);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Shell casing ejection (frame 2)
    if (this.weaponAnimFrame === 2 && wep.id !== 2) {
      // not plasma
      ctx.fillStyle = "#ddaa44";
      ctx.globalAlpha = 0.8;
      ctx.fillRect(7, -18, 3, 2);
      ctx.globalAlpha = 1;
    }

    // Smoke wisp (frame 3)
    if (this.weaponAnimFrame === 3) {
      ctx.fillStyle = "rgba(180,180,180,0.15)";
      ctx.beginPath();
      ctx.arc(1, -42, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (wep.id === 0) {
      // Chrono Pistol
      // Barrel
      ctx.fillStyle = "#445566";
      ctx.fillRect(-6, -35, 12, 15);
      ctx.fillStyle = "#556677";
      ctx.fillRect(-4, -32, 8, 10);
      // Barrel bore
      ctx.fillStyle = "#222233";
      ctx.beginPath();
      ctx.arc(0, -35, 3, 0, Math.PI * 2);
      ctx.fill();
      // Barrel tip glow
      ctx.fillStyle = energyColor;
      ctx.fillRect(-3, -35, 6, 3);
      // Barrel highlight
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(-5, -34, 2, 12);
      // Main body/slide
      ctx.fillStyle = "#334455";
      ctx.fillRect(-9, -20, 18, 35);
      ctx.fillStyle = "#3d4f60";
      ctx.fillRect(-7, -18, 14, 30);
      // Slide serrations
      ctx.fillStyle = "#2a3a4a";
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(-8, -18 + i * 3, 16, 1);
      }
      // Ejection port
      ctx.fillStyle = "#222233";
      ctx.fillRect(5, -16, 3, 6);
      // Chrono energy line
      ctx.fillStyle = energyColor;
      ctx.globalAlpha = 0.6 + Math.sin(this.time * 0.008) * 0.3;
      ctx.fillRect(-2, -18, 4, 25);
      // Energy dots along line
      for (let i = 0; i < 4; i++) {
        const dotY = -16 + i * 6 + Math.sin(this.time * 0.01 + i) * 2;
        ctx.beginPath();
        ctx.arc(0, dotY, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Trigger guard
      ctx.strokeStyle = "#445566";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 12, 6, 0, Math.PI);
      ctx.stroke();
      // Trigger
      ctx.fillStyle = "#334455";
      ctx.fillRect(-1, 8, 2, 6);
      // Grip
      ctx.fillStyle = "#223344";
      ctx.fillRect(-7, 15, 16, 25);
      ctx.fillStyle = "#2a3a4a";
      ctx.fillRect(-5, 17, 12, 20);
      // Grip texture lines
      ctx.fillStyle = "#1a2a3a";
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(-5, 19 + i * 5, 12, 1);
      }
      // Grip bottom cap
      ctx.fillStyle = "#445566";
      ctx.fillRect(-6, 38, 14, 3);
      // Rear sight
      ctx.fillStyle = "#2a3a4a";
      ctx.fillRect(-5, -20, 3, 3);
      ctx.fillRect(2, -20, 3, 3);
      // Front sight
      ctx.fillStyle = energyColor;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(-1, -36, 2, 2);
      ctx.globalAlpha = 1;
      // Screws/rivets
      ctx.fillStyle = "#667788";
      ctx.beginPath();
      ctx.arc(-6, -5, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(6, -5, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-6, 8, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(6, 8, 1, 0, Math.PI * 2);
      ctx.fill();
    } else if (wep.id === 1) {
      // Temporal Shotgun
      // Barrels
      ctx.fillStyle = "#333333";
      ctx.fillRect(-10, -48, 8, 12);
      ctx.fillRect(2, -48, 8, 12);
      ctx.fillStyle = "#444444";
      ctx.fillRect(-8, -46, 4, 8);
      ctx.fillRect(4, -46, 4, 8);
      // Barrel bores
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(-6, -48, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(6, -48, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Barrel tips glow
      ctx.fillStyle = energyColor;
      ctx.fillRect(-8, -48, 3, 2);
      ctx.fillRect(5, -48, 3, 2);
      // Barrel clamp
      ctx.fillStyle = "#555555";
      ctx.fillRect(-10, -40, 20, 2);
      // Metal highlight on barrels
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(-9, -47, 1.5, 10);
      ctx.fillRect(3, -47, 1.5, 10);
      // Main body/receiver
      ctx.fillStyle = "#554433";
      ctx.fillRect(-14, -36, 28, 50);
      ctx.fillStyle = "#665544";
      ctx.fillRect(-11, -33, 22, 44);
      // Receiver detail — loading port
      ctx.fillStyle = "#443322";
      ctx.fillRect(-5, -34, 10, 6);
      // Shell-shaped detail
      ctx.fillStyle = "#887766";
      ctx.beginPath();
      ctx.arc(0, -31, 3, 0, Math.PI * 2);
      ctx.fill();
      // Pump grip
      ctx.fillStyle = "#776655";
      ctx.fillRect(-12, -10, 24, 12);
      ctx.fillStyle = "#887766";
      ctx.fillRect(-10, -8, 20, 8);
      // Pump grip ridges
      ctx.fillStyle = "#665544";
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(-11, -9 + i * 3, 22, 1);
      }
      // Shell ejection port
      ctx.fillStyle = "#222222";
      ctx.fillRect(8, -30, 5, 8);
      // Visible shell brass
      ctx.fillStyle = "#ccaa44";
      ctx.fillRect(9, -28, 3, 4);
      // Stock
      ctx.fillStyle = "#443322";
      ctx.fillRect(-11, 14, 24, 30);
      ctx.fillStyle = "#554433";
      ctx.fillRect(-9, 16, 20, 26);
      // Stock checkering
      ctx.fillStyle = "#3a2a1a";
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(-8, 18 + i * 5, 18, 1);
      }
      // Stock butt plate
      ctx.fillStyle = "#332211";
      ctx.fillRect(-10, 42, 22, 3);
      // Temporal coils
      ctx.fillStyle = energyColor;
      ctx.globalAlpha = 0.4 + Math.sin(this.time * 0.006) * 0.2;
      ctx.fillRect(-12, -25, 2, 20);
      ctx.fillRect(10, -25, 2, 20);
      // Coil energy dots
      for (let i = 0; i < 3; i++) {
        const dotY = -23 + i * 7 + Math.sin(this.time * 0.008 + i * 1.5) * 2;
        ctx.beginPath();
        ctx.arc(-11, dotY, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(11, dotY, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Screws
      ctx.fillStyle = "#998877";
      ctx.beginPath();
      ctx.arc(-10, -15, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(10, -15, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-10, 5, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(10, 5, 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (wep.id === 2) {
      // Plasma Rifle
      // Barrel shroud
      ctx.fillStyle = "#2a2a44";
      ctx.fillRect(-5, -58, 10, 30);
      ctx.fillStyle = "#3a3a55";
      ctx.fillRect(-3, -55, 6, 25);
      // Barrel bore
      ctx.fillStyle = "#1a1a33";
      ctx.beginPath();
      ctx.arc(0, -58, 3, 0, Math.PI * 2);
      ctx.fill();
      // Barrel tip
      ctx.fillStyle = energyColor;
      ctx.fillRect(-4, -60, 8, 3);
      // Cooling vents on barrel
      ctx.fillStyle = "#222244";
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(-4, -52 + i * 7, 2, 4);
        ctx.fillRect(2, -52 + i * 7, 2, 4);
      }
      // Barrel highlight
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(-4, -57, 1.5, 28);
      // Body/receiver
      ctx.fillStyle = "#2a2a44";
      ctx.fillRect(-10, -28, 20, 48);
      ctx.fillStyle = "#3a3a55";
      ctx.fillRect(-8, -25, 16, 42);
      // Panel lines
      ctx.strokeStyle = "#222244";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-8, -10);
      ctx.lineTo(8, -10);
      ctx.moveTo(-8, 5);
      ctx.lineTo(8, 5);
      ctx.stroke();
      // Side panels
      ctx.fillStyle = "#252545";
      ctx.fillRect(-9, -22, 3, 15);
      ctx.fillRect(6, -22, 3, 15);
      // Energy rings (animated)
      ctx.fillStyle = energyColor;
      for (let i = 0; i < 5; i++) {
        const ringA = 0.3 + Math.sin(this.time * 0.01 + i * 1.2) * 0.3;
        ctx.globalAlpha = ringA;
        ctx.fillRect(-6, -50 + i * 8, 12, 2);
        // Small side indicator dots
        ctx.beginPath();
        ctx.arc(-7, -49 + i * 8, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(7, -49 + i * 8, 1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Plasma core chamber (visible through body)
      ctx.fillStyle = energyColor;
      ctx.globalAlpha = 0.15 + Math.sin(this.time * 0.008) * 0.1;
      ctx.fillRect(-5, -20, 10, 12);
      ctx.globalAlpha = 1;
      // Scope
      ctx.fillStyle = "#222244";
      ctx.fillRect(-3, -55, 6, 8);
      ctx.fillStyle = "#1a1a33";
      ctx.beginPath();
      ctx.arc(0, -59, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = energyColor;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(0, -59, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // Scope cross-hair
      ctx.strokeStyle = energyColor;
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(-2, -59);
      ctx.lineTo(2, -59);
      ctx.moveTo(0, -61);
      ctx.lineTo(0, -57);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Magazine/power cell
      ctx.fillStyle = "#1a1a33";
      ctx.fillRect(-4, 8, 10, 14);
      ctx.fillStyle = energyColor;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(-2, 10, 6, 10);
      ctx.globalAlpha = 1;
      // Stock
      ctx.fillStyle = "#1a1a33";
      ctx.fillRect(-7, 20, 16, 25);
      ctx.fillStyle = "#252545";
      ctx.fillRect(-5, 22, 12, 20);
      // Stock padding
      ctx.fillStyle = "#1a1a33";
      ctx.fillRect(-6, 43, 14, 3);
      // Rivets
      ctx.fillStyle = "#5555aa";
      ctx.beginPath();
      ctx.arc(-8, -8, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(8, -8, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-8, 10, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(8, 10, 1, 0, Math.PI * 2);
      ctx.fill();
    } else if (wep.id === 3) {
      // Quantum Cannon
      // Barrel housing
      ctx.fillStyle = "#331111";
      ctx.fillRect(-12, -55, 24, 20);
      ctx.fillStyle = "#441122";
      ctx.fillRect(-10, -52, 20, 15);
      // Barrel bore
      ctx.fillStyle = "#110008";
      ctx.beginPath();
      ctx.arc(0, -55, 5, 0, Math.PI * 2);
      ctx.fill();
      // Barrel rim glow
      ctx.strokeStyle = energyColor;
      ctx.lineWidth = 1.5;
      const pulse = 0.4 + Math.sin(this.time * 0.01) * 0.4;
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.arc(0, -55, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Barrel glow core
      ctx.fillStyle = energyColor;
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.arc(0, -48, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = pulse * 0.3;
      ctx.beginPath();
      ctx.arc(0, -48, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // Barrel highlight
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(-11, -54, 2, 18);
      // Main body
      ctx.fillStyle = "#441122";
      ctx.fillRect(-18, -35, 36, 55);
      ctx.fillStyle = "#552233";
      ctx.fillRect(-15, -32, 30, 48);
      // Body panel lines
      ctx.strokeStyle = "#331122";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-15, -15);
      ctx.lineTo(15, -15);
      ctx.moveTo(-15, 0);
      ctx.lineTo(15, 0);
      ctx.stroke();
      // Warning stripe
      ctx.fillStyle = "#ff3333";
      ctx.globalAlpha = 0.15;
      ctx.fillRect(-15, -35, 30, 3);
      ctx.globalAlpha = 1;
      // Quantum energy core
      ctx.fillStyle = energyColor;
      ctx.globalAlpha = pulse * 0.8;
      ctx.fillRect(-8, -25, 16, 16);
      ctx.globalAlpha = pulse * 0.4;
      ctx.fillRect(-12, -28, 24, 22);
      ctx.globalAlpha = 1;
      // Core crosshair
      ctx.strokeStyle = energyColor;
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(-4, -17);
      ctx.lineTo(4, -17);
      ctx.moveTo(0, -21);
      ctx.lineTo(0, -13);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Energy conduits on sides
      ctx.fillStyle = energyColor;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(-17, -28, 3, 35);
      ctx.fillRect(14, -28, 3, 35);
      ctx.globalAlpha = 1;
      // Conduit energy dots
      for (let i = 0; i < 4; i++) {
        const dotA = 0.3 + Math.sin(this.time * 0.012 + i * 1.5) * 0.3;
        ctx.fillStyle = energyColor;
        ctx.globalAlpha = dotA;
        ctx.beginPath();
        ctx.arc(-15.5, -22 + i * 8, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(15.5, -22 + i * 8, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Ventilation slits
      ctx.fillStyle = "#220011";
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(-14, -5 + i * 6, 10, 2);
        ctx.fillRect(4, -5 + i * 6, 10, 2);
      }
      // Heat glow in vents
      ctx.fillStyle = energyColor;
      ctx.globalAlpha = pulse * 0.2;
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(-13, -4 + i * 6, 8, 1);
        ctx.fillRect(5, -4 + i * 6, 8, 1);
      }
      ctx.globalAlpha = 1;
      // Grip
      ctx.fillStyle = "#330011";
      ctx.fillRect(-12, 20, 26, 28);
      ctx.fillStyle = "#440022";
      ctx.fillRect(-10, 22, 22, 24);
      // Grip texture ridges
      ctx.fillStyle = "#2a000e";
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(-9, 24 + i * 5, 20, 1.5);
      }
      // Grip cap
      ctx.fillStyle = "#330011";
      ctx.fillRect(-11, 46, 24, 3);
      // Rivets
      ctx.fillStyle = "#aa3355";
      ctx.beginPath();
      ctx.arc(-16, -30, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(16, -30, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-16, 10, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(16, 10, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawGlitch(ctx, w, h) {
    const intensity = this.glitchEffect;
    for (let i = 0; i < 3; i++) {
      const y = Math.random() * h;
      const sliceH = 2 + Math.random() * 10;
      const offset = (Math.random() - 0.5) * 30 * intensity;
      ctx.drawImage(this.canvas, 0, y, w, sliceH, offset, y, w, sliceH);
    }
  }

  renderHUD() {
    const ctx = this.hudCtx;
    const w = this.hudCanvas.width;
    const h = this.hudCanvas.height;
    ctx.clearRect(0, 0, w, h);

    if (this.state !== GameState.PLAYING && this.state !== GameState.PAUSED)
      return;

    // Playtest mode banner
    if (this.mode === "playtest") {
      ctx.save();
      ctx.fillStyle = "rgba(0, 200, 255, 0.15)";
      ctx.fillRect(0, 0, w, 32);
      ctx.fillStyle = "#00ccff";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const allDead =
        this.killedEnemies >= this.totalEnemies && this.totalEnemies > 0;
      const label = allDead
        ? "PLAY TEST COMPLETE — Returning to builder..."
        : `PLAY TEST — ${this.killedEnemies}/${this.totalEnemies} killed — ESC to return`;
      ctx.fillText(label, w / 2, 16);
      ctx.restore();
    }

    const hudFactor = this.settings.hudScale / 100;
    const barH = Math.round(160 * hudFactor);

    // Stamina bar (above the HUD bar)
    const staminaFactor = this.settings.staminaBarSize / 100;
    const staminaPct = this.player.stamina / this.player.maxStamina;
    const staminaBarH = Math.round(22 * staminaFactor);
    const staminaBarY = h - barH - staminaBarH - 8;
    const staminaBarW = Math.round(420 * staminaFactor);
    const staminaBarX = Math.floor(w / 2 - staminaBarW / 2);
    const isActive = this.player.isSprinting || this.player.isDashing;

    // Glow when sprinting or dashing (no shadowBlur for performance)
    if (isActive) {
      const glowColor = this.player.isDashing
        ? "rgba(0,255,255,0.15)"
        : "rgba(255,170,0,0.12)";
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.roundRect(
        staminaBarX - 6,
        staminaBarY - 6,
        staminaBarW + 12,
        staminaBarH + 12,
        8,
      );
      ctx.fill();
      const innerGlow = this.player.isDashing
        ? "rgba(0,255,255,0.25)"
        : "rgba(255,170,0,0.2)";
      ctx.fillStyle = innerGlow;
      ctx.beginPath();
      ctx.roundRect(
        staminaBarX - 4,
        staminaBarY - 4,
        staminaBarW + 8,
        staminaBarH + 8,
        6,
      );
      ctx.fill();
    }

    // Background
    ctx.fillStyle = "rgba(5,5,15,0.8)";
    ctx.beginPath();
    ctx.roundRect(
      staminaBarX - 2,
      staminaBarY - 2,
      staminaBarW + 4,
      staminaBarH + 4,
      5,
    );
    ctx.fill();

    // Bar fill
    const staminaColor = this.player.isDashing
      ? "#00ffff"
      : this.player.isSprinting
        ? "#ffaa00"
        : staminaPct > 0.3
          ? "#00ccff"
          : "#ff4400";
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.roundRect(staminaBarX, staminaBarY, staminaBarW, staminaBarH, 4);
    ctx.fill();

    // Filled portion
    if (staminaPct > 0.005) {
      ctx.fillStyle = staminaColor;
      ctx.beginPath();
      ctx.roundRect(
        staminaBarX,
        staminaBarY,
        staminaBarW * staminaPct,
        staminaBarH,
        4,
      );
      ctx.fill();

      // Inner shine
      const shineGrad = ctx.createLinearGradient(
        staminaBarX,
        staminaBarY,
        staminaBarX,
        staminaBarY + staminaBarH,
      );
      shineGrad.addColorStop(0, "rgba(255,255,255,0.25)");
      shineGrad.addColorStop(0.5, "rgba(255,255,255,0)");
      shineGrad.addColorStop(1, "rgba(0,0,0,0.15)");
      ctx.fillStyle = shineGrad;
      ctx.beginPath();
      ctx.roundRect(
        staminaBarX,
        staminaBarY,
        staminaBarW * staminaPct,
        staminaBarH,
        4,
      );
      ctx.fill();
    }

    // Border
    ctx.strokeStyle = isActive ? staminaColor : "rgba(255,255,255,0.2)";
    ctx.lineWidth = isActive ? 1.5 : 1;
    ctx.beginPath();
    ctx.roundRect(staminaBarX, staminaBarY, staminaBarW, staminaBarH, 4);
    ctx.stroke();

    // Label
    if (staminaPct < 0.99 || isActive) {
      const label = this.player.isDashing
        ? "DASH"
        : this.player.isSprinting
          ? "SPRINT"
          : "STAMINA";
      ctx.fillStyle = isActive ? staminaColor : "rgba(255,255,255,0.6)";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.fillText(label, w / 2 - 60, staminaBarY + staminaBarH / 2 + 5);
      // Percentage
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "bold 13px monospace";
      ctx.fillText(
        `${Math.floor(staminaPct * 100)}%`,
        w / 2 + 60,
        staminaBarY + staminaBarH / 2 + 5,
      );
    }

    // ─── Chrono Shift bar (above stamina, only when player has energy) ───
    const chronoPct = this.player.chronoEnergy / this.player.maxChronoEnergy;
    if (chronoPct > 0.005 || this.player.chronoActive) {
      const chronoBarH = Math.round(14 * staminaFactor);
      const chronoBarW = Math.round(280 * staminaFactor);
      const chronoBarX = Math.floor(w / 2 - chronoBarW / 2);
      const chronoBarY = staminaBarY - chronoBarH - 6;
      const chronoIsActive = this.player.chronoActive;

      // Glow when active
      if (chronoIsActive) {
        ctx.fillStyle = "rgba(180,0,255,0.15)";
        ctx.beginPath();
        ctx.roundRect(
          chronoBarX - 4,
          chronoBarY - 4,
          chronoBarW + 8,
          chronoBarH + 8,
          6,
        );
        ctx.fill();
      }

      // Background
      ctx.fillStyle = "rgba(5,5,15,0.7)";
      ctx.beginPath();
      ctx.roundRect(
        chronoBarX - 1,
        chronoBarY - 1,
        chronoBarW + 2,
        chronoBarH + 2,
        4,
      );
      ctx.fill();

      // Empty track
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.beginPath();
      ctx.roundRect(chronoBarX, chronoBarY, chronoBarW, chronoBarH, 3);
      ctx.fill();

      // Filled portion
      if (chronoPct > 0.005) {
        const chronoColor = chronoIsActive
          ? "#cc44ff"
          : chronoPct >= 0.15
            ? "#9944ff"
            : "#664488";
        ctx.fillStyle = chronoColor;
        ctx.beginPath();
        ctx.roundRect(
          chronoBarX,
          chronoBarY,
          chronoBarW * chronoPct,
          chronoBarH,
          3,
        );
        ctx.fill();

        // Shine
        const cShine = ctx.createLinearGradient(
          chronoBarX,
          chronoBarY,
          chronoBarX,
          chronoBarY + chronoBarH,
        );
        cShine.addColorStop(0, "rgba(255,255,255,0.2)");
        cShine.addColorStop(0.5, "rgba(255,255,255,0)");
        cShine.addColorStop(1, "rgba(0,0,0,0.1)");
        ctx.fillStyle = cShine;
        ctx.beginPath();
        ctx.roundRect(
          chronoBarX,
          chronoBarY,
          chronoBarW * chronoPct,
          chronoBarH,
          3,
        );
        ctx.fill();
      }

      // Border
      ctx.strokeStyle = chronoIsActive ? "#cc44ff" : "rgba(150,100,200,0.3)";
      ctx.lineWidth = chronoIsActive ? 1.5 : 1;
      ctx.beginPath();
      ctx.roundRect(chronoBarX, chronoBarY, chronoBarW, chronoBarH, 3);
      ctx.stroke();

      // Label
      const chronoLabel = chronoIsActive ? "CHRONO SHIFT" : "CHRONO";
      ctx.fillStyle = chronoIsActive ? "#cc44ff" : "rgba(180,140,220,0.6)";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(chronoLabel, w / 2 - 50, chronoBarY + chronoBarH / 2 + 4);
      ctx.fillStyle = "rgba(180,140,220,0.5)";
      ctx.fillText(
        `${Math.floor(chronoPct * 100)}%`,
        w / 2 + 50,
        chronoBarY + chronoBarH / 2 + 4,
      );
      // Key hint
      ctx.fillStyle = "rgba(150,120,200,0.3)";
      ctx.font = "bold 9px monospace";
      ctx.fillText("[Q]", w / 2 + 80, chronoBarY + chronoBarH / 2 + 4);
    }

    // Bottom Bar
    ctx.fillStyle = "rgba(5,5,15,0.92)";
    ctx.fillRect(0, h - barH, w, barH);
    ctx.strokeStyle = "rgba(0,200,255,0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h - barH);
    ctx.lineTo(w, h - barH);
    ctx.stroke();

    const wep = this.player.getWeaponDef();
    const healthPct = this.player.health / this.player.maxHealth;
    const healthColor =
      healthPct > 0.6
        ? this.cbColor("#00ff66")
        : healthPct > 0.3
          ? this.cbColor("#ffaa00")
          : this.cbColor("#ff2200");

    // TODO: Allow users to customize based off what they find useful for different modes?
    // TODO: Can still be improved - too much empty space
    // ─── Layout: AMMO | HEALTH | PORTRAIT | WEAPONS(2x2) | KILLS | SCORE | ROUND/LOC ───
    const pad = 14;
    const portraitW = Math.round(180 * hudFactor);
    const portraitH = Math.round(160 * hudFactor);
    const portraitX = Math.floor(w / 2 - portraitW / 2);
    const portraitY = h - barH;

    const leftZone = portraitX - pad;
    const rightZone = w - (portraitX + portraitW + pad);
    const ammoSecW = Math.floor(leftZone * 0.35);
    const healthSecW = Math.floor(leftZone * 0.65);
    const rsecW = Math.floor(rightZone / 4);

    const topY = h - barH + 10;
    const midY = h - barH + Math.floor(barH / 2);
    const botY = h - barH + barH - 12;

    // Ammo
    const ammoX = pad;
    ctx.fillStyle = "rgba(255,204,0,0.6)";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("AMMO", ammoX + ammoSecW / 2, topY + 4);
    ctx.fillStyle = "#ffcc00";
    ctx.font = this.scaledFont(46, "bold");
    ctx.fillText(`${this.player.ammo}`, ammoX + ammoSecW / 2, midY + 14);

    // Health
    const healthX = ammoX + ammoSecW + pad;
    const hbW = healthSecW - pad * 2;
    const hbH = 30;

    ctx.fillStyle = healthColor;
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillText("HEALTH", healthX + hbW / 2, topY + 4);

    ctx.fillStyle = "#ffffff";
    ctx.font = this.scaledFont(46, "bold");
    ctx.fillText(
      `${Math.ceil(this.player.health)}`,
      healthX + hbW / 2,
      midY + 8,
    );

    const hbY = midY + 16;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(healthX, hbY, hbW, hbH);
    ctx.fillStyle = healthColor;
    ctx.fillRect(healthX, hbY, hbW * healthPct, hbH);
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(healthX, hbY, hbW, hbH);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px monospace";
    ctx.fillText(
      `${Math.ceil(this.player.health)} / ${this.player.maxHealth}`,
      healthX + hbW / 2,
      hbY + 22,
    );

    // Shield bar (below health bar, only when player has shield upgrade)
    if (this.player.maxShield > 0) {
      const sbH = 12;
      const sbY = hbY + hbH + 4;
      const shieldPct = this.player.shield / this.player.maxShield;
      const shieldRegenning = this.player.shield < this.player.maxShield;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(healthX, sbY, hbW, sbH);
      const shieldColor = shieldRegenning ? "#4488ff" : "#66aaff";
      ctx.fillStyle = shieldColor;
      ctx.fillRect(healthX, sbY, hbW * shieldPct, sbH);
      // Pulse effect when regenerating
      if (shieldRegenning) {
        const pulse = 0.1 + Math.sin(this.time * 0.006) * 0.06;
        ctx.fillStyle = `rgba(100,160,255,${pulse})`;
        ctx.fillRect(healthX, sbY, hbW * shieldPct, sbH);
      }
      ctx.strokeStyle = "rgba(100,160,255,0.4)";
      ctx.lineWidth = 1;
      ctx.strokeRect(healthX, sbY, hbW, sbH);
      ctx.fillStyle = "#88bbff";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        `SHIELD ${Math.ceil(this.player.shield)} / ${this.player.maxShield}`,
        healthX + hbW / 2,
        sbY + 10,
      );
    }

    // Portrait
    if (this.settings.showPortrait) {
      this.drawPortrait(ctx, portraitX, portraitY, portraitW, portraitH);
      ctx.strokeStyle = "rgba(0,200,255,0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        portraitX - 1,
        portraitY - 1,
        portraitW + 2,
        portraitH + 2,
      );
      const accentL = 12;
      ctx.strokeStyle = "#00ddff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(portraitX - 1, portraitY + accentL);
      ctx.lineTo(portraitX - 1, portraitY - 1);
      ctx.lineTo(portraitX + accentL, portraitY - 1);
      ctx.moveTo(portraitX + portraitW + 1 - accentL, portraitY - 1);
      ctx.lineTo(portraitX + portraitW + 1, portraitY - 1);
      ctx.lineTo(portraitX + portraitW + 1, portraitY + accentL);
      ctx.stroke();
    }

    // Weapons
    if (this.settings.showWeapons) {
      const wpnX = portraitX + portraitW + pad;
      ctx.fillStyle = "rgba(0,200,255,0.6)";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("WEAPONS", wpnX + rsecW / 2, topY + 4);

      const slotW = 42;
      const slotH = 38;
      const slotGap = 6;
      const gridW = slotW * 2 + slotGap;
      const gridH = slotH * 2 + slotGap;
      const gridStartX = wpnX + rsecW / 2 - gridW / 2;
      const gridStartY = topY + 16;
      ctx.font = "bold 16px monospace";
      for (let i = 0; i < this.player.weapons.length; i++) {
        const active = i === this.player.currentWeapon;
        const col = i % 2;
        const row = Math.floor(i / 2);
        const sx = gridStartX + col * (slotW + slotGap);
        const sy = gridStartY + row * (slotH + slotGap);
        ctx.fillStyle = active
          ? "rgba(0,200,255,0.4)"
          : "rgba(255,255,255,0.06)";
        ctx.fillRect(sx, sy, slotW, slotH);
        ctx.strokeStyle = active ? "#00ccff" : "rgba(255,255,255,0.15)";
        ctx.lineWidth = active ? 2 : 1;
        ctx.strokeRect(sx, sy, slotW, slotH);
        ctx.fillStyle = active ? "#ffffff" : "#666666";
        ctx.textAlign = "center";
        ctx.fillText(`${i + 1}`, sx + slotW / 2, sy + slotH / 2 + 6);
      }
      // Current weapon name below grid
      if (wep) {
        ctx.fillStyle = wep.color;
        ctx.font = "bold 16px monospace";
        ctx.textAlign = "center";
        ctx.fillText(wep.name, wpnX + rsecW / 2, gridStartY + gridH + 14);
      }
    }

    // Kills
    if (this.settings.showKills) {
      const killsX = portraitX + portraitW + rsecW + pad * 2;
      ctx.fillStyle = "rgba(255,136,102,0.6)";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("KILLS", killsX + rsecW / 2, topY + 4);
      ctx.fillStyle = "#ff8866";
      ctx.font = this.scaledFont(42, "bold");
      ctx.fillText(`${this.killedEnemies}`, killsX + rsecW / 2, midY + 12);
      ctx.fillStyle = "rgba(255,136,102,0.6)";
      ctx.font = "bold 18px monospace";
      ctx.fillText(`/ ${this.totalEnemies}`, killsX + rsecW / 2, midY + 34);
    }

    // Score
    if (this.settings.showScore) {
      const scoreX = portraitX + portraitW + rsecW * 2 + pad * 3;
      ctx.fillStyle = "rgba(0,221,255,0.6)";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("SCORE", scoreX + rsecW / 2, topY + 4);
      ctx.fillStyle = "#00ddff";
      ctx.font = this.scaledFont(40, "bold");
      ctx.fillText(`${this.player.score}`, scoreX + rsecW / 2, midY + 14);
    }

    // Location
    const locX = portraitX + portraitW + rsecW * 3 + pad * 4;
    const locCx = Math.min(locX + rsecW / 2, w - 50);

    if (this.mode === "arena") {
      ctx.fillStyle = "#ffaa00";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.fillText("ROUND", locCx, topY + 4);
      ctx.font = "bold 44px monospace";
      ctx.fillText(`${this.arenaRound}`, locCx, midY + 12);
    } else if (this.mode === "campaign") {
      const levelName = this.map.name || `Level ${this.campaignLevel + 1}`;
      // Truncate long level names to fit - Wrap or display differently?
      const maxLocW = w - locX - pad;
      ctx.font = "bold 14px monospace";
      let displayName = levelName;
      while (
        ctx.measureText(displayName).width > maxLocW &&
        displayName.length > 4
      ) {
        displayName = displayName.slice(0, -1);
      }
      if (displayName !== levelName) displayName += "…";
      ctx.fillStyle = "#aaddff";
      ctx.textAlign = "center";
      ctx.fillText(displayName, locCx, midY + 4);
    }

    // Difficulty indicator
    const diffNames = ["EASY", "NORMAL", "HARD", "NIGHTMARE"];
    const diffColors = ["#44ff44", "#00ccff", "#ffaa00", "#ff2200"];
    ctx.fillStyle = diffColors[this.settings.difficulty];
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText(diffNames[this.settings.difficulty], locCx, botY);

    // Vertical Dividers
    ctx.strokeStyle = "rgba(0,200,255,0.2)";
    ctx.lineWidth = 1;
    const divTop = h - barH + 4;
    const divBot = h - 4;
    // Between Ammo and Health
    const div1X = ammoX + ammoSecW + pad / 2;
    ctx.beginPath();
    ctx.moveTo(div1X, divTop);
    ctx.lineTo(div1X, divBot);
    ctx.stroke();
    // Left of portrait
    ctx.beginPath();
    ctx.moveTo(portraitX - pad / 2, divTop);
    ctx.lineTo(portraitX - pad / 2, divBot);
    ctx.stroke();
    // Right of portrait
    ctx.beginPath();
    ctx.moveTo(portraitX + portraitW + pad / 2, divTop);
    ctx.lineTo(portraitX + portraitW + pad / 2, divBot);
    ctx.stroke();
    // Between right-side sections
    for (let s = 1; s <= 3; s++) {
      const dx = portraitX + portraitW + rsecW * s + pad * s + pad / 2;
      ctx.beginPath();
      ctx.moveTo(dx, divTop);
      ctx.lineTo(dx, divBot);
      ctx.stroke();
    }

    // Arena Timer in the Top Left Corner
    if (this.mode === "arena") {
      const secs = Math.ceil(this.arenaTimer);
      const warning = secs <= 10;
      const cleared = this.arenaClearTimer != null;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(10, 10, 160, 90);
      ctx.strokeStyle = warning
        ? "rgba(255,34,0,0.6)"
        : cleared
          ? "rgba(0,255,100,0.5)"
          : "rgba(0,200,255,0.3)";
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, 160, 90);

      ctx.fillStyle = cleared
        ? "#00ff66"
        : warning
          ? Math.floor(this.time / 250) % 2
            ? "#ff2200"
            : "#ffaa00"
          : "#00ffcc";
      ctx.font = "bold 44px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${secs}s`, 90, 62);
      ctx.fillStyle = cleared ? "rgba(0,255,100,0.7)" : "rgba(255,255,255,0.5)";
      ctx.font = "bold 14px monospace";
      ctx.fillText(cleared ? "CLEARED!" : "TIME", 90, 28);

      // Elapsed time
      if (this.roundStartTime) {
        const elapsedSec = Math.floor(
          (performance.now() - this.roundStartTime) / 1000,
        );
        const mins = Math.floor(elapsedSec / 60);
        const secs2 = elapsedSec % 60;
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.font = "12px monospace";
        ctx.fillText(
          `${mins}:${secs2.toString().padStart(2, "0")} elapsed`,
          90,
          82,
        );
      }

      // Stage Cleared Notification
      if (cleared) {
        const countSecs = Math.ceil(this.arenaClearTimer);
        const pulse = 0.7 + Math.sin(this.time * 0.005) * 0.3;
        ctx.fillStyle = `rgba(0,10,5,${0.5 * pulse})`;
        ctx.fillRect(0, (h - barH) / 2 - 60, w, 120);
        ctx.fillStyle = `rgba(0,255,100,${pulse})`;
        ctx.font = "bold 48px monospace";
        ctx.textAlign = "center";
        ctx.fillText("STAGE CLEARED!", w / 2, (h - barH) / 2 - 8);
        ctx.fillStyle = "rgba(200,230,255,0.8)";
        ctx.font = "bold 22px monospace";
        ctx.fillText(
          `Next round in ${countSecs}s...`,
          w / 2,
          (h - barH) / 2 + 30,
        );
        ctx.textAlign = "left";
      }
    }

    // Campaign elapsed timer (top-left)
    if (this.mode === "campaign" && this.roundStartTime) {
      const elapsedSec = Math.floor(
        (performance.now() - this.roundStartTime) / 1000,
      );
      const mins = Math.floor(elapsedSec / 60);
      const secs = elapsedSec % 60;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(10, 10, 90, 24);
      ctx.fillStyle = "rgba(200,220,255,0.5)";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${mins}:${secs.toString().padStart(2, "0")}`, 55, 27);
    }

    ctx.textAlign = "left";

    // Minimap - Top Right Corner
    const mmSize = this.settings.minimapSize;
    this.drawMinimap(ctx, w - mmSize - 10, 10, mmSize, mmSize);

    // Crosshair
    const chx = w / 2;
    const chy = (h - barH) / 2;
    this.drawCrosshairAt(ctx, chx, chy);

    // Hit marker
    if (this.hitMarker > 0) {
      const a = Math.min(1, this.hitMarker / 0.08);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = "#ff3333";
      ctx.lineWidth = 2;
      ctx.translate(chx, chy);
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(8, 0);
      ctx.moveTo(0, -8);
      ctx.lineTo(0, 8);
      ctx.stroke();
      ctx.restore();
    }

    // Floating damage numbers
    for (const dn of this.damageNumbers) {
      const dx = dn.x - this.player.x;
      const dy = dn.y - this.player.y;
      let angle = Math.atan2(dy, dx) - this.player.angle;
      while (angle < -Math.PI) angle += Math.PI * 2;
      while (angle > Math.PI) angle -= Math.PI * 2;
      const fov = ((this.settings.fov || 70) * Math.PI) / 180;
      if (Math.abs(angle) > fov / 2) continue;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.1) continue;
      const screenX = w / 2 + (angle / (fov / 2)) * (w / 2);
      const rise = (0.8 - dn.life) * 60;
      const screenY = (h - barH) / 2 - rise;
      const alpha = Math.min(1, dn.life / 0.3);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = "center";
      if (dn.crit) {
        ctx.font = "bold 18px monospace";
        ctx.shadowColor = "#ffcc00";
        ctx.shadowBlur = 8;
        ctx.fillStyle = "#ffcc00";
        ctx.fillText(dn.value, screenX, screenY);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 2;
        ctx.strokeText(dn.value, screenX, screenY);
        ctx.fillText(dn.value, screenX, screenY);
      } else {
        ctx.font = "bold 14px monospace";
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.lineWidth = 2;
        ctx.strokeText(dn.value, screenX, screenY);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(dn.value, screenX, screenY);
      }
      ctx.restore();
    }

    // Kill streak announcement
    if (this.killStreakDisplay) {
      const ksd = this.killStreakDisplay;
      const alpha =
        ksd.life > 1.5
          ? Math.min(1, (2.0 - ksd.life) * 4)
          : Math.min(1, ksd.life / 0.5);
      const scale = ksd.life > 1.8 ? 1.2 + (2.0 - ksd.life) * 3 : 1.0;
      const fontSize = Math.round(ksd.size * scale);
      const ky = (h - barH) * 0.3;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `bold ${fontSize}px monospace`;

      // Background plate
      const textW = ctx.measureText(ksd.text).width;
      const plateW = textW + 60;
      const plateH = fontSize + 20;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(w / 2 - plateW / 2, ky - plateH / 2, plateW, plateH);
      // Accent lines
      ctx.fillStyle = ksd.color;
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillRect(w / 2 - plateW / 2, ky - plateH / 2, plateW, 2);
      ctx.fillRect(w / 2 - plateW / 2, ky + plateH / 2 - 2, plateW, 2);
      ctx.globalAlpha = alpha;

      // Glow text
      ctx.shadowColor = ksd.color;
      ctx.shadowBlur = 20;
      ctx.fillStyle = ksd.color;
      ctx.fillText(ksd.text, w / 2, ky);
      // White outline pass
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1.5;
      ctx.strokeText(ksd.text, w / 2, ky);
      ctx.restore();
    }

    // Slow-mo vignette overlay with temporal blue tint
    if (this.slowMoTimer > 0) {
      const smAlpha = Math.min(0.35, (this.slowMoTimer / 1.5) * 0.35);
      // Blue tint overlay
      ctx.fillStyle = `rgba(0,20,60,${smAlpha * 0.4})`;
      ctx.fillRect(0, 0, w, h - barH);
      // Edge vignette
      const gradient = ctx.createRadialGradient(
        w / 2,
        (h - barH) / 2,
        w * 0.25,
        w / 2,
        (h - barH) / 2,
        w * 0.7,
      );
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, `rgba(0,0,0,${smAlpha})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h - barH);
    }

    // FPS
    if (this.showFPS) {
      ctx.fillStyle = "#00ff00";
      ctx.font = "12px monospace";
      ctx.fillText(`FPS: ${this.fps}`, 10, 95);
    }

    // Controls hint (only first round, not during cutscenes/tutorial)
    if (this.mode !== "tutorial") {
      const elapsed = (this.time - this.roundStartTime) / 1000;
      if (elapsed < 6) {
        const alpha = elapsed < 4 ? 0.85 : 0.85 * (1 - (elapsed - 4) / 2);
        this.drawControlsOverlay(ctx, w, h, alpha);
      }
    }

    // Achievement toast (above minimap area)
    this.renderAchievementToast(ctx, w, h);

    // ARIA comms overlay (bottom-left)
    this.renderAriaComms(ctx, w, h);
  }

  // Multistage portrait drawing based on health and alive status - can be improved with better art and more stages / smoother transitions between stages
  drawPortrait(ctx, x, y, w, h) {
    const healthPct = this.player.health / this.player.maxHealth;
    const isDead = !this.player.alive || this.player.health <= 0;
    // Use modular time to prevent floating-point precision loss after hours of play
    const animTime = this.time % 25132; // ~4*PI*2000, covers all portrait sin periods

    ctx.fillStyle = "#0a0a18";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = isDead ? "rgba(255,0,0,0.6)" : "rgba(0,200,255,0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    const cx = x + w / 2;
    const cy = y + h / 2;
    const s = w / 90; // scale factor relative to 90px base

    // Head/neck base
    if (isDead || healthPct <= 0.9) {
      const skinColor = isDead
        ? "#778877"
        : healthPct > 0.7
          ? "#cc9966"
          : healthPct > 0.5
            ? "#bb8855"
            : healthPct > 0.3
              ? "#aa7744"
              : "#8a5544";
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 2 * s, 18 * s, 22 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (isDead || healthPct <= 0.1) {
      // Stage 10
      ctx.fillStyle = isDead ? "#667766" : "#6a4444";
      ctx.beginPath();
      ctx.ellipse(cx, cy + 2 * s, 18 * s, 22 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isDead ? "#445544" : "#553333";
      ctx.beginPath();
      ctx.ellipse(cx - 8 * s, cy - 2 * s, 6 * s, 4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 8 * s, cy - 2 * s, 6 * s, 4 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isDead ? "#334433" : "#442222";
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(cx - 12 * s, cy - 2 * s);
      ctx.lineTo(cx - 4 * s, cy - 2 * s);
      ctx.moveTo(cx + 4 * s, cy - 2 * s);
      ctx.lineTo(cx + 12 * s, cy - 2 * s);
      ctx.stroke();

      ctx.fillStyle = "#2a2222";
      ctx.beginPath();
      ctx.ellipse(cx, cy + 12 * s, 7 * s, 5 * s, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = "#660000";
      ctx.fillRect(cx + 5 * s, cy + 13 * s, 2 * s, 6 * s);

      ctx.fillStyle = isDead ? "#556655" : "#553333";
      ctx.fillRect(cx - 13 * s, cy - 7 * s, 26 * s, 2 * s);

      ctx.fillStyle = isDead ? "#778877" : "#6a4444";
      ctx.beginPath();
      ctx.moveTo(cx, cy + 1 * s);
      ctx.lineTo(cx + 2 * s, cy + 5 * s);
      ctx.lineTo(cx - 2 * s, cy + 5 * s);
      ctx.fill();

      ctx.strokeStyle = "#553333";
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.moveTo(cx + 3 * s, cy - 5 * s);
      ctx.lineTo(cx + 10 * s, cy - 1 * s);
      ctx.stroke();

      ctx.fillStyle = "#1a2a3a";
      ctx.fillRect(cx - 17 * s, cy - 10 * s, 6 * s, 3 * s);
      ctx.fillRect(cx + 11 * s, cy - 9 * s, 5 * s, 3 * s);
    }

    // Helmet
    if (!isDead && healthPct > 0.5) {
      ctx.fillStyle = "#1a2a3a";
      ctx.beginPath();
      ctx.ellipse(cx, cy - 2 * s, 20 * s, 24 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#334466";
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.arc(cx, cy - 6 * s, 18 * s, Math.PI + 0.3, -0.3);
      ctx.stroke();
    }

    if (!isDead && healthPct > 0.9) {
      // Stage 1 (>90%)
      ctx.fillStyle = "#0a1520";
      ctx.fillRect(cx - 18 * s, cy - 8 * s, 36 * s, 22 * s);

      ctx.fillStyle = "#00ddff";
      ctx.globalAlpha = 0.8 + Math.sin(animTime / 400) * 0.15;
      ctx.fillRect(cx - 16 * s, cy - 6 * s, 32 * s, 10 * s);
      ctx.globalAlpha = 1;

      ctx.fillStyle = "rgba(0,0,0,0.15)";
      for (let sl = 0; sl < 5; sl++) {
        ctx.fillRect(cx - 16 * s, cy - 6 * s + sl * 2 * s, 32 * s, 1 * s);
      }
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(cx - 12 * s, cy - 4 * s, 10 * s, 3 * s);

      ctx.fillStyle = "#66ffff";
      ctx.globalAlpha = 0.4 + Math.sin(animTime / 200) * 0.2;
      ctx.fillRect(cx + 8 * s, cy - 4 * s, 2 * s, 2 * s);
      ctx.fillRect(cx + 12 * s, cy - 3 * s, 2 * s, 2 * s);
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#1a2a3a";
      ctx.fillRect(cx - 14 * s, cy + 8 * s, 28 * s, 10 * s);
      ctx.fillStyle = "#112233";
      ctx.fillRect(cx - 8 * s, cy + 10 * s, 16 * s, 4 * s);
      ctx.fillStyle = "#0a1520";
      for (let v = 0; v < 3; v++) {
        ctx.fillRect(cx - 5 * s + v * 4 * s, cy + 10 * s, 2 * s, 4 * s);
      }
      ctx.fillStyle = "#1a2a3a";
      ctx.fillRect(cx - 16 * s, cy + 18 * s, 32 * s, 6 * s);
      ctx.fillStyle = "#0f1f2f";
      ctx.fillRect(cx - 12 * s, cy + 20 * s, 24 * s, 3 * s);

      ctx.strokeStyle = "rgba(0,200,255,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 18 * s, cy - 8 * s, 36 * s, 22 * s);
    } else if (healthPct > 0.8) {
      // Stage 2 (80-90%)
      ctx.fillStyle = "#0a1520";
      ctx.fillRect(cx - 18 * s, cy - 8 * s, 36 * s, 22 * s);

      ctx.fillStyle = "#00ddff";
      ctx.globalAlpha = 0.75 + Math.sin(animTime / 400) * 0.12;
      ctx.fillRect(cx - 16 * s, cy - 6 * s, 32 * s, 10 * s);
      ctx.globalAlpha = 1;

      ctx.fillStyle = "rgba(0,0,0,0.15)";
      for (let sl = 0; sl < 5; sl++) {
        ctx.fillRect(cx - 16 * s, cy - 6 * s + sl * 2 * s, 32 * s, 1 * s);
      }
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillRect(cx - 12 * s, cy - 4 * s, 10 * s, 3 * s);

      // Scorch mark
      ctx.fillStyle = "rgba(40,20,10,0.45)";
      ctx.beginPath();
      ctx.ellipse(cx + 13 * s, cy - 14 * s, 4 * s, 3 * s, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Small dent
      ctx.strokeStyle = "#223344";
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.arc(cx - 10 * s, cy - 16 * s, 3 * s, 0.5, 2.5);
      ctx.stroke();

      ctx.fillStyle = "#1a2a3a";
      ctx.fillRect(cx - 14 * s, cy + 8 * s, 28 * s, 10 * s);
      ctx.fillStyle = "#112233";
      ctx.fillRect(cx - 8 * s, cy + 10 * s, 16 * s, 4 * s);
      ctx.fillStyle = "#0a1520";
      for (let v = 0; v < 3; v++) {
        ctx.fillRect(cx - 5 * s + v * 4 * s, cy + 10 * s, 2 * s, 4 * s);
      }
      ctx.fillStyle = "#1a2a3a";
      ctx.fillRect(cx - 16 * s, cy + 18 * s, 32 * s, 6 * s);
    } else if (healthPct > 0.7) {
      // Stage 3 (70-80%)
      ctx.fillStyle = "#0a1520";
      ctx.fillRect(cx - 18 * s, cy - 8 * s, 36 * s, 22 * s);

      ctx.fillStyle = "#00ccee";
      ctx.globalAlpha = 0.65 + Math.sin(animTime / 350) * 0.1;
      ctx.fillRect(cx - 16 * s, cy - 6 * s, 32 * s, 10 * s);
      ctx.globalAlpha = 1;

      ctx.fillStyle = "rgba(0,0,0,0.18)";
      for (let sl = 0; sl < 5; sl++) {
        ctx.fillRect(cx - 16 * s, cy - 6 * s + sl * 2 * s, 32 * s, 1 * s);
      }
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillRect(cx - 12 * s, cy - 4 * s, 8 * s, 3 * s);

      // Single crack
      ctx.strokeStyle = "#ff4466";
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(cx + 4 * s, cy - 6 * s);
      ctx.lineTo(cx + 6 * s, cy - 2 * s);
      ctx.lineTo(cx + 10 * s, cy + 2 * s);
      ctx.stroke();

      // Blood spot
      ctx.fillStyle = "#880000";
      ctx.beginPath();
      ctx.arc(cx + 5 * s, cy - 6 * s, 1.5 * s, 0, Math.PI * 2);
      ctx.fill();

      // Scorch marks
      ctx.fillStyle = "rgba(40,20,10,0.45)";
      ctx.beginPath();
      ctx.ellipse(cx + 12 * s, cy - 14 * s, 4 * s, 3 * s, 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1a2a3a";
      ctx.fillRect(cx - 14 * s, cy + 8 * s, 28 * s, 10 * s);
      ctx.fillStyle = "#112233";
      ctx.fillRect(cx - 8 * s, cy + 10 * s, 16 * s, 4 * s);
      ctx.fillStyle = "#1a2a3a";
      ctx.fillRect(cx - 16 * s, cy + 18 * s, 32 * s, 6 * s);
    } else if (healthPct > 0.6) {
      // Stage 4 (60-70%)
      ctx.fillStyle = "#0a1520";
      ctx.fillRect(cx - 18 * s, cy - 8 * s, 36 * s, 22 * s);

      ctx.fillStyle = "#00aacc";
      ctx.globalAlpha = 0.55 + Math.sin(animTime / 250) * 0.12;
      ctx.fillRect(cx - 16 * s, cy - 6 * s, 32 * s, 10 * s);
      ctx.globalAlpha = 1;

      ctx.fillStyle = "rgba(0,0,0,0.2)";
      for (let sl = 0; sl < 5; sl++) {
        ctx.fillRect(cx - 16 * s, cy - 6 * s + sl * 2 * s, 32 * s, 1 * s);
      }

      // Spider cracks
      ctx.strokeStyle = "#ff4466";
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(cx + 2 * s, cy - 6 * s);
      ctx.lineTo(cx + 5 * s, cy - 1 * s);
      ctx.lineTo(cx + 9 * s, cy + 3 * s);
      ctx.moveTo(cx + 4 * s, cy - 3 * s);
      ctx.lineTo(cx + 10 * s, cy);
      ctx.lineTo(cx + 14 * s, cy + 1 * s);
      ctx.stroke();

      // Eye peeking
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.ellipse(cx + 8 * s, cy - 1 * s, 3 * s, 2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#224488";
      ctx.beginPath();
      ctx.arc(cx + 8 * s, cy - 1 * s, 1.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Blood drip
      ctx.fillStyle = "#880000";
      ctx.fillRect(cx + 5 * s, cy + 1 * s, 2 * s, 6 * s);

      // Scorch marks
      ctx.fillStyle = "rgba(40,20,10,0.45)";
      ctx.beginPath();
      ctx.ellipse(cx + 12 * s, cy - 13 * s, 4 * s, 3 * s, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - 8 * s, cy - 15 * s, 3 * s, 2 * s, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1a2a3a";
      ctx.fillRect(cx - 14 * s, cy + 8 * s, 28 * s, 10 * s);
      ctx.fillStyle = "#112233";
      ctx.fillRect(cx - 8 * s, cy + 10 * s, 16 * s, 4 * s);
      ctx.fillStyle = "#1a2a3a";
      ctx.fillRect(cx - 16 * s, cy + 18 * s, 32 * s, 6 * s);
    } else if (healthPct > 0.5) {
      // Stage 5 (50-60%)
      ctx.fillStyle = "#0a1520";
      ctx.fillRect(cx - 18 * s, cy - 8 * s, 36 * s, 22 * s);

      ctx.fillStyle = "#00aacc";
      ctx.globalAlpha = 0.5 + Math.sin(animTime / 300) * 0.1;
      ctx.fillRect(cx - 16 * s, cy - 6 * s, 14 * s, 10 * s);
      ctx.globalAlpha = 0.2;
      ctx.fillRect(cx + 2 * s, cy - 6 * s, 14 * s, 10 * s);
      ctx.globalAlpha = 1;

      ctx.fillStyle = "rgba(0,0,0,0.15)";
      for (let sl = 0; sl < 3; sl++) {
        ctx.fillRect(cx - 16 * s, cy - 6 * s + sl * 3 * s, 14 * s, 1 * s);
      }

      ctx.strokeStyle = "#ff4466";
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(cx - 2 * s, cy - 6 * s);
      ctx.lineTo(cx + 2 * s, cy);
      ctx.lineTo(cx + 6 * s, cy + 4 * s);
      ctx.moveTo(cx, cy - 4 * s);
      ctx.lineTo(cx + 8 * s, cy);
      ctx.lineTo(cx + 12 * s, cy + 2 * s);
      ctx.moveTo(cx + 3 * s, cy - 6 * s);
      ctx.lineTo(cx + 5 * s, cy - 2 * s);
      ctx.stroke();

      // Eye
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(cx + 7 * s, cy - 1 * s, 4 * s, 3 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#224488";
      ctx.beginPath();
      ctx.arc(cx + 7 * s, cy - 1 * s, 2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(cx + 7 * s, cy - 1 * s, 1 * s, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1a2a3a";
      ctx.fillRect(cx - 14 * s, cy + 8 * s, 28 * s, 10 * s);
      ctx.fillStyle = "#112233";
      ctx.fillRect(cx - 8 * s, cy + 10 * s, 16 * s, 4 * s);

      ctx.fillStyle = "#880000";
      ctx.fillRect(cx + 3 * s, cy + 2 * s, 2 * s, 8 * s);

      ctx.fillStyle = "rgba(40,20,10,0.5)";
      ctx.beginPath();
      ctx.ellipse(cx + 12 * s, cy - 12 * s, 5 * s, 4 * s, 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1a2a3a";
      ctx.fillRect(cx - 16 * s, cy + 18 * s, 32 * s, 6 * s);
    } else if (healthPct > 0.4) {
      // Stage 6 (40-50%)
      ctx.fillStyle = "#1a2a3a";
      ctx.beginPath();
      ctx.ellipse(
        cx - 2 * s,
        cy - 2 * s,
        19 * s,
        23 * s,
        0,
        Math.PI * 0.6,
        Math.PI * 2.1,
      );
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#334466";
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.arc(cx - 2 * s, cy - 6 * s, 17 * s, Math.PI + 0.3, -0.4);
      ctx.stroke();

      ctx.fillStyle = "#0a1520";
      ctx.fillRect(cx - 17 * s, cy - 7 * s, 17 * s, 18 * s);

      ctx.fillStyle = "#00aacc";
      ctx.globalAlpha = 0.3 + Math.sin(animTime / 200) * 0.1;
      ctx.fillRect(cx - 15 * s, cy - 5 * s, 14 * s, 7 * s);
      ctx.globalAlpha = 1;

      ctx.fillStyle = "rgba(0,0,0,0.2)";
      for (let sl = 0; sl < 3; sl++) {
        ctx.fillRect(cx - 15 * s, cy - 5 * s + sl * 3 * s, 14 * s, 1 * s);
      }

      ctx.strokeStyle = "#ff4466";
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(cx - 4 * s, cy - 5 * s);
      ctx.lineTo(cx + 1 * s, cy + 2 * s);
      ctx.moveTo(cx - 8 * s, cy - 3 * s);
      ctx.lineTo(cx - 3 * s, cy + 3 * s);
      ctx.moveTo(cx - 12 * s, cy);
      ctx.lineTo(cx - 7 * s, cy + 4 * s);
      ctx.stroke();

      // Left eye
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(cx - 8 * s, cy - 1 * s, 4 * s, 3 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#224488";
      ctx.beginPath();
      ctx.arc(cx - 8 * s, cy - 1 * s, 2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(cx - 8 * s, cy - 1 * s, 1 * s, 0, Math.PI * 2);
      ctx.fill();

      // Right eye
      ctx.fillStyle = "#887055";
      ctx.beginPath();
      ctx.ellipse(cx + 8 * s, cy - 2 * s, 5 * s, 3.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(cx + 8 * s, cy - 1.5 * s, 3 * s, 2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#224488";
      ctx.beginPath();
      ctx.arc(cx + 8 * s, cy - 1.5 * s, 1.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(cx + 8 * s, cy - 1.5 * s, 0.7 * s, 0, Math.PI * 2);
      ctx.fill();

      // Nose
      ctx.fillStyle = "#aa7744";
      ctx.beginPath();
      ctx.moveTo(cx + 2 * s, cy + 2 * s);
      ctx.lineTo(cx + 4 * s, cy + 6 * s);
      ctx.lineTo(cx + 1 * s, cy + 6 * s);
      ctx.fill();

      // Break edge
      ctx.strokeStyle = "#2a3a4a";
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(cx + 1 * s, cy - 20 * s);
      ctx.lineTo(cx + 3 * s, cy - 10 * s);
      ctx.lineTo(cx + 1 * s, cy - 2 * s);
      ctx.lineTo(cx + 3 * s, cy + 8 * s);
      ctx.stroke();

      ctx.fillStyle = "#880000";
      ctx.fillRect(cx + 2 * s, cy + 2 * s, 2 * s, 8 * s);

      ctx.fillStyle = "#1a2a3a";
      ctx.fillRect(cx - 14 * s, cy + 8 * s, 16 * s, 10 * s);
      ctx.fillStyle = "#1a2a3a";
      ctx.fillRect(cx - 16 * s, cy + 18 * s, 32 * s, 6 * s);
    } else if (healthPct > 0.3) {
      // Stage 7 (30-40%)
      ctx.fillStyle = "#1a2a3a";
      ctx.beginPath();
      ctx.moveTo(cx - 18 * s, cy - 18 * s);
      ctx.lineTo(cx - 8 * s, cy - 20 * s);
      ctx.lineTo(cx - 6 * s, cy - 12 * s);
      ctx.lineTo(cx - 16 * s, cy - 10 * s);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#00aacc";
      ctx.globalAlpha = 0.15 + Math.sin(animTime / 100) * 0.1;
      ctx.fillRect(cx - 16 * s, cy - 16 * s, 6 * s, 3 * s);
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#885533";
      ctx.fillRect(cx - 14 * s, cy - 8 * s, 28 * s, 3 * s);

      // Left eye
      ctx.fillStyle = "#ffddcc";
      ctx.beginPath();
      ctx.ellipse(cx - 8 * s, cy - 2 * s, 5 * s, 3.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#cc3333";
      ctx.lineWidth = 0.5 * s;
      ctx.beginPath();
      ctx.moveTo(cx - 12 * s, cy - 3 * s);
      ctx.lineTo(cx - 9 * s, cy - 2 * s);
      ctx.moveTo(cx - 12 * s, cy - 1 * s);
      ctx.lineTo(cx - 10 * s, cy - 1.5 * s);
      ctx.stroke();
      ctx.fillStyle = "#224488";
      ctx.beginPath();
      ctx.arc(cx - 8 * s, cy - 2 * s, 2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(cx - 8 * s, cy - 2 * s, 1 * s, 0, Math.PI * 2);
      ctx.fill();

      // Right eye
      ctx.fillStyle = "#774455";
      ctx.beginPath();
      ctx.ellipse(cx + 8 * s, cy - 2 * s, 6 * s, 4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffddcc";
      ctx.fillRect(cx + 5 * s, cy - 2.5 * s, 6 * s, 1.5 * s);
      ctx.fillStyle = "#224488";
      ctx.fillRect(cx + 7 * s, cy - 2 * s, 2 * s, 1 * s);

      // Broken nose
      ctx.fillStyle = "#aa6633";
      ctx.beginPath();
      ctx.moveTo(cx, cy + 1 * s);
      ctx.lineTo(cx + 3 * s, cy + 6 * s);
      ctx.lineTo(cx - 2 * s, cy + 6 * s);
      ctx.fill();
      ctx.fillStyle = "#990000";
      ctx.fillRect(cx, cy + 6 * s, 2 * s, 3 * s);

      // Snarl
      ctx.fillStyle = "#331111";
      ctx.beginPath();
      ctx.ellipse(cx, cy + 12 * s, 8 * s, 3.5 * s, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = "#ddccbb";
      for (let t = 0; t < 6; t++) {
        ctx.fillRect(cx - 6 * s + t * 2 * s, cy + 10.5 * s, 1.5 * s, 2 * s);
      }
      ctx.fillStyle = "#331111";
      ctx.fillRect(cx + 2 * s, cy + 10.5 * s, 2 * s, 2 * s);

      ctx.fillStyle = "rgba(60,40,30,0.3)";
      ctx.fillRect(cx - 12 * s, cy + 8 * s, 24 * s, 10 * s);

      ctx.fillStyle = "#990000";
      ctx.fillRect(cx - 14 * s, cy - 6 * s, 2 * s, 10 * s);
      ctx.fillRect(cx + 10 * s, cy - 4 * s, 2 * s, 12 * s);

      ctx.strokeStyle = "#990000";
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(cx + 4 * s, cy - 6 * s);
      ctx.lineTo(cx + 12 * s, cy - 2 * s);
      ctx.stroke();
    } else if (healthPct > 0.2) {
      // Stage 8 (20-30%)
      ctx.fillStyle = "#774422";
      ctx.fillRect(cx - 14 * s, cy - 8 * s, 28 * s, 3.5 * s);

      // Left eye
      ctx.fillStyle = "#ffccbb";
      ctx.beginPath();
      ctx.ellipse(cx - 8 * s, cy - 2 * s, 4.5 * s, 3 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#cc2222";
      ctx.lineWidth = 0.5 * s;
      ctx.beginPath();
      ctx.moveTo(cx - 11 * s, cy - 3 * s);
      ctx.lineTo(cx - 9 * s, cy - 2 * s);
      ctx.moveTo(cx - 11 * s, cy - 1 * s);
      ctx.lineTo(cx - 9 * s, cy - 1.5 * s);
      ctx.stroke();
      ctx.fillStyle = "#224488";
      ctx.beginPath();
      ctx.arc(cx - 8 * s, cy - 2 * s, 1.8 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(cx - 8 * s, cy - 2 * s, 0.8 * s, 0, Math.PI * 2);
      ctx.fill();

      // Right eye
      ctx.fillStyle = "#664455";
      ctx.beginPath();
      ctx.ellipse(cx + 8 * s, cy - 2 * s, 6 * s, 4.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffddcc";
      ctx.fillRect(cx + 5 * s, cy - 2.5 * s, 6 * s, 1 * s);

      // Broken nose
      ctx.fillStyle = "#995533";
      ctx.beginPath();
      ctx.moveTo(cx + 1 * s, cy + 1 * s);
      ctx.lineTo(cx + 4 * s, cy + 5 * s);
      ctx.lineTo(cx - 1 * s, cy + 6 * s);
      ctx.fill();
      ctx.fillStyle = "#990000";
      ctx.fillRect(cx + 1 * s, cy + 5 * s, 2 * s, 4 * s);

      // Grimace
      ctx.fillStyle = "#2a1111";
      ctx.beginPath();
      ctx.ellipse(cx, cy + 12 * s, 7 * s, 3.5 * s, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = "#ccbbaa";
      for (let t = 0; t < 5; t++) {
        ctx.fillRect(cx - 5 * s + t * 2.5 * s, cy + 10.5 * s, 1.5 * s, 2 * s);
      }

      // Heavy bruising
      ctx.fillStyle = "rgba(80,30,50,0.35)";
      ctx.beginPath();
      ctx.ellipse(cx - 5 * s, cy - 3 * s, 7 * s, 5 * s, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(60,20,40,0.25)";
      ctx.beginPath();
      ctx.ellipse(cx + 7 * s, cy + 1 * s, 6 * s, 4 * s, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Stubble/grime
      ctx.fillStyle = "rgba(50,30,25,0.3)";
      ctx.fillRect(cx - 12 * s, cy + 7 * s, 24 * s, 11 * s);

      // Blood
      ctx.fillStyle = "#880000";
      ctx.fillRect(cx - 14 * s, cy - 6 * s, 2 * s, 12 * s);
      ctx.fillRect(cx + 10 * s, cy - 5 * s, 2 * s, 14 * s);
      ctx.fillRect(cx - 3 * s, cy + 5 * s, 6 * s, 2 * s);

      // Deep cut
      ctx.strokeStyle = "#880000";
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(cx + 3 * s, cy - 7 * s);
      ctx.lineTo(cx + 12 * s, cy - 2 * s);
      ctx.stroke();
    } else if (healthPct > 0.1) {
      // Stage 9 (10-20%)
      ctx.fillStyle = "#8a5544";
      ctx.beginPath();
      ctx.ellipse(cx, cy + 2 * s, 18 * s, 22 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Heavy bruising
      ctx.fillStyle = "rgba(80,30,50,0.4)";
      ctx.beginPath();
      ctx.ellipse(cx - 6 * s, cy - 4 * s, 8 * s, 6 * s, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(60,20,40,0.3)";
      ctx.beginPath();
      ctx.ellipse(cx + 6 * s, cy, 7 * s, 5 * s, 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#774422";
      ctx.fillRect(cx - 14 * s, cy - 8 * s, 28 * s, 3.5 * s);

      // Left eye
      ctx.fillStyle = "#ffccbb";
      ctx.beginPath();
      ctx.ellipse(cx - 8 * s, cy - 2 * s, 4 * s, 2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#cc2222";
      ctx.lineWidth = 0.5 * s;
      ctx.beginPath();
      ctx.moveTo(cx - 11 * s, cy - 2.5 * s);
      ctx.lineTo(cx - 9 * s, cy - 2 * s);
      ctx.moveTo(cx - 11 * s, cy - 1 * s);
      ctx.lineTo(cx - 9 * s, cy - 1.5 * s);
      ctx.stroke();
      ctx.fillStyle = "#224488";
      ctx.beginPath();
      ctx.arc(cx - 8 * s, cy - 2 * s, 1.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(cx - 8 * s, cy - 2 * s, 0.7 * s, 0, Math.PI * 2);
      ctx.fill();

      // Right eye
      ctx.fillStyle = "#664455";
      ctx.beginPath();
      ctx.ellipse(cx + 8 * s, cy - 2 * s, 6 * s, 4.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#553344";
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(cx + 4 * s, cy - 2 * s);
      ctx.lineTo(cx + 12 * s, cy - 2 * s);
      ctx.stroke();

      // Nose
      ctx.fillStyle = "#995533";
      ctx.beginPath();
      ctx.moveTo(cx + 1 * s, cy + 1 * s);
      ctx.lineTo(cx + 4 * s, cy + 5 * s);
      ctx.lineTo(cx - 1 * s, cy + 6 * s);
      ctx.fill();
      ctx.fillStyle = "#990000";
      ctx.fillRect(cx + 1 * s, cy + 5 * s, 2 * s, 5 * s);

      // Mouth
      ctx.fillStyle = "#2a1111";
      ctx.beginPath();
      ctx.ellipse(cx, cy + 12 * s, 7 * s, 4 * s, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = "#ccbbaa";
      ctx.fillRect(cx - 4 * s, cy + 10.5 * s, 1.5 * s, 2 * s);
      ctx.fillRect(cx - 1 * s, cy + 10.5 * s, 1.5 * s, 2 * s);
      ctx.fillRect(cx + 3 * s, cy + 10.5 * s, 1.5 * s, 2 * s);
      ctx.fillStyle = "#880000";
      ctx.fillRect(cx + 5 * s, cy + 13 * s, 2 * s, 5 * s);
      ctx.fillRect(cx - 3 * s, cy + 14 * s, 2 * s, 3 * s);

      // Heavy blood
      ctx.fillStyle = "#880000";
      ctx.fillRect(cx - 15 * s, cy - 6 * s, 2 * s, 14 * s);
      ctx.fillRect(cx + 11 * s, cy - 8 * s, 2 * s, 16 * s);
      ctx.fillRect(cx - 4 * s, cy + 5 * s, 8 * s, 2 * s);

      // Deep cuts
      ctx.strokeStyle = "#880000";
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(cx + 3 * s, cy - 8 * s);
      ctx.lineTo(cx + 13 * s, cy - 1 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 10 * s, cy + 3 * s);
      ctx.lineTo(cx - 4 * s, cy + 8 * s);
      ctx.stroke();

      // Stubble/grime
      ctx.fillStyle = "rgba(40,25,20,0.35)";
      ctx.fillRect(cx - 13 * s, cy + 6 * s, 26 * s, 12 * s);
    }

    // Temporal badge
    ctx.fillStyle = "#ffaa00";
    ctx.globalAlpha = 0.5 + Math.sin(this.time / 500) * 0.2;
    ctx.beginPath();
    ctx.arc(x + 8 * s, y + h - 10 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffcc44";
    ctx.beginPath();
    ctx.arc(x + 8 * s, y + h - 10 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawCrosshairAt(ctx, cx, cy) {
    const type = this.settings.crosshair;
    if (type === 0) {
      // Red Dot
      ctx.fillStyle = "rgba(255,50,50,0.9)";
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,150,150,0.5)";
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 1) {
      // Green Cross
      ctx.strokeStyle = "rgba(0,255,200,0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy);
      ctx.lineTo(cx - 4, cy);
      ctx.moveTo(cx + 4, cy);
      ctx.lineTo(cx + 10, cy);
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx, cy - 4);
      ctx.moveTo(cx, cy + 4);
      ctx.lineTo(cx, cy + 10);
      ctx.stroke();
      ctx.fillStyle = "rgba(0,255,200,0.9)";
      ctx.fillRect(cx - 1, cy - 1, 2, 2);
    } else if (type === 2) {
      // ACOG Scope
      ctx.strokeStyle = "rgba(255,100,100,0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy);
      ctx.lineTo(cx - 5, cy);
      ctx.moveTo(cx + 5, cy);
      ctx.lineTo(cx + 18, cy);
      ctx.moveTo(cx, cy - 18);
      ctx.lineTo(cx, cy - 5);
      ctx.moveTo(cx, cy + 5);
      ctx.lineTo(cx, cy + 18);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,80,80,0.8)";
      ctx.beginPath();
      ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 3) {
      // Circle
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillRect(cx - 1, cy - 1, 2, 2);
    } else if (type === 4) {
      // Minimal
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillRect(cx - 1, cy - 1, 3, 3);
    } else if (type === 5) {
      // None — very subtle center reference
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(cx, cy, 1, 1);
    }
  }

  drawMinimap(ctx, x, y, w, h) {
    if (!this.map) return;

    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(0,200,255,0.3)";
    ctx.strokeRect(x, y, w, h);

    const scale = Math.min(w / this.map.width, h / this.map.height);
    const ox = x + (w - this.map.width * scale) / 2;
    const oy = y + (h - this.map.height * scale) / 2;

    // Draw walls
    for (let my = 0; my < this.map.height; my++) {
      for (let mx = 0; mx < this.map.width; mx++) {
        const tile = this.map.grid[my][mx];
        if (tile > 0) {
          const color = WALL_COLORS[tile];
          if (color) {
            ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
          } else {
            ctx.fillStyle = "#444466";
          }
          ctx.fillRect(ox + mx * scale, oy + my * scale, scale, scale);
        }
      }
    }

    // Draw entities
    for (const e of this.entities) {
      if (!e.active) continue;
      if (e.type === "enemy") {
        ctx.fillStyle = e.def.color1;
        ctx.fillRect(ox + e.x * scale - 1.5, oy + e.y * scale - 1.5, 3, 3);
      } else if (e.type === "exit") {
        ctx.fillStyle = "#00ff88";
        ctx.fillRect(ox + e.x * scale - 2, oy + e.y * scale - 2, 4, 4);
      } else if (e.type !== "projectile") {
        ctx.fillStyle = e.type === "health" ? "#00ff44" : "#ffaa00";
        ctx.fillRect(ox + e.x * scale - 1, oy + e.y * scale - 1, 2, 2);
      }
    }

    // Player
    const px = ox + this.player.x * scale;
    const py = oy + this.player.y * scale;
    ctx.fillStyle = "#00ffcc";
    ctx.fillRect(px - 2, py - 2, 4, 4);

    // Player direction
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(
      px + Math.cos(this.player.angle) * 8,
      py + Math.sin(this.player.angle) * 8,
    );
    ctx.stroke();
  }

  drawControlsOverlay(ctx, w, h, alpha) {
    const fk = (action) => this.formatKeyCode(this.keybinds[action]);
    const saveMessage =
      this.mode === "campaign"
        ? `${fk("toggleFPS").replace("F", "F")}     - Save Game`
        : "";
    ctx.save();
    ctx.globalAlpha = alpha;
    const boxW = 280;
    const boxH = 220;
    const bx = (w - boxW) / 2;
    const by = (h - boxH) / 2;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = "rgba(0,200,255,0.3)";
    ctx.strokeRect(bx, by, boxW, boxH);
    ctx.fillStyle = "#00ccff";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("CONTROLS", w / 2, by + 24);
    ctx.fillStyle = "#aabbcc";
    ctx.font = "13px monospace";
    ctx.textAlign = "left";
    const lx = bx + 30;
    const fwd = fk("moveForward");
    const bk = fk("moveBack");
    const lt = fk("moveLeft");
    const rt = fk("moveRight");
    ctx.fillText(`${fwd}/${lt}/${bk}/${rt} - Move`, lx, by + 48);
    ctx.fillText("Mouse - Look", lx, by + 66);
    ctx.fillText("Click - Shoot", lx, by + 84);
    ctx.fillText(`${fk("weapon1")}-${fk("weapon4")}   - Weapons`, lx, by + 102);
    ctx.fillText(`${fk("interact")}     - Interact/Open`, lx, by + 120);
    ctx.fillStyle = "#88ddff";
    ctx.fillText(`${fk("sprint")} - Sprint`, lx, by + 138);
    ctx.fillText(`${fwd}×2   - Dash (double-tap)`, lx, by + 156);
    ctx.fillStyle = "#aabbcc";
    ctx.fillText(`${fk("pause")}/P - Pause`, lx, by + 174);
    if (saveMessage) {
      ctx.fillStyle = "#aaccaa";
      ctx.fillText(saveMessage, lx, by + 192);
    }
    ctx.restore();
  }

  renderPauseScreen(ctx, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, w, h);

    // ARIA log overlay
    if (this.showAriaLog) {
      this.renderAriaLog(ctx, w, h);
      return;
    }

    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 36px monospace";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", w / 2, h / 2 - 100);
    this.drawControlsOverlay(ctx, w, h, 0.9);
    ctx.font = "14px monospace";
    ctx.fillStyle = "#aaaacc";
    ctx.textAlign = "center";
    const saveHint = this.mode === "campaign" ? "  |  F to save" : "";
    if (!this.isTouchDevice) {
      ctx.fillText(
        "ESC / P to resume  |  S settings  |  C controls  |  A achievements  |  L ARIA log  |  Q quit" +
          saveHint,
        w / 2,
        h / 2 + 110,
      );
    }
    if (this.pauseSaveFlash && performance.now() - this.pauseSaveFlash < 1500) {
      const alpha = 1 - (performance.now() - this.pauseSaveFlash) / 1500;
      ctx.fillStyle = `rgba(0, 255, 100, ${alpha.toFixed(2)})`;
      ctx.font = "bold 16px monospace";
      ctx.fillText("GAME SAVED", w / 2, h / 2 + 140);
    }
    ctx.textAlign = "left";
  }

  renderAriaLog(ctx, w, h) {
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
    const log = this.ariaMessageLog;
    const lineH = 22;
    const maxLines = Math.floor((panelH - 70) / lineH);
    const startIdx = Math.max(0, log.length - maxLines - this.ariaLogScroll);
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
        const msgNum = i + 1;
        ctx.fillStyle = "rgba(0, 200, 255, 0.4)";
        ctx.fillText(`${String(msgNum).padStart(2, " ")}.`, textX, y);
        const text = log[i].replace(
          /\{AGENT\}/g,
          this.character.name || "Agent",
        );
        ctx.fillStyle = "#00ffdd";
        // Truncate if too long for panel
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

  renderSettingsScreen(ctx, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 30px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SETTINGS", w / 2, 40);

    const crosshairNames = [
      "Red Dot",
      "Green Cross",
      "ACOG Scope",
      "Circle",
      "Minimal",
      "None",
    ];
    const difficultyNames = ["Easy", "Normal", "Hard", "Nightmare"];
    const difficultyColors = ["#44ff44", "#00ccff", "#ffaa00", "#ff2200"];
    const colorblindNames = ["Off", "Deuteranopia", "Protanopia", "Tritanopia"];
    const items = [
      {
        label: "Difficulty",
        value: difficultyNames[this.settings.difficulty],
        color: difficultyColors[this.settings.difficulty],
      },
      { label: "Crosshair", value: crosshairNames[this.settings.crosshair] },
      { label: "Minimap Size", value: `${this.settings.minimapSize}px` },
      {
        label: "Music Volume",
        value:
          this.settings.musicVolume === 0
            ? "MUTED"
            : `${this.settings.musicVolume}%`,
      },
      {
        label: "SFX Volume",
        value:
          this.settings.sfxVolume === 0
            ? "MUTED"
            : `${this.settings.sfxVolume}%`,
      },
      {
        label: "Sensitivity",
        value: `${this.settings.sensitivity.toFixed(1)}x`,
      },
      {
        label: "FOV",
        value: `${this.settings.fov}°`,
      },
      {
        label: "View Mode",
        value: this.settings.viewMode === 0 ? "First Person" : "Third Person",
        color: this.settings.viewMode === 0 ? "#00ccff" : "#ff88cc",
      },
      {
        label: "Invert X Axis",
        value: this.settings.invertX ? "ON" : "OFF",
        color: this.settings.invertX ? "#ff8844" : "#888888",
      },
      {
        label: "Font Scale",
        value: `${this.settings.fontScale}%`,
      },
      {
        label: "Colorblind Mode",
        value: colorblindNames[this.settings.colorblind],
        color: this.settings.colorblind > 0 ? "#ffcc00" : "#888888",
      },
      {
        label: "HUD Scale",
        value: `${this.settings.hudScale}%`,
      },
      {
        label: "Stamina Bar Size",
        value: `${this.settings.staminaBarSize}%`,
      },
      {
        label: "Show Portrait",
        value: this.settings.showPortrait ? "ON" : "OFF",
        color: this.settings.showPortrait ? "#00ccff" : "#888888",
      },
      {
        label: "Show Weapons",
        value: this.settings.showWeapons ? "ON" : "OFF",
        color: this.settings.showWeapons ? "#00ccff" : "#888888",
      },
      {
        label: "Show Kills",
        value: this.settings.showKills ? "ON" : "OFF",
        color: this.settings.showKills ? "#00ccff" : "#888888",
      },
      {
        label: "Show Score",
        value: this.settings.showScore ? "ON" : "OFF",
        color: this.settings.showScore ? "#00ccff" : "#888888",
      },
      {
        label: "Touch Sensitivity",
        value: `${this.settings.touchSensitivity.toFixed(1)}x`,
      },
    ];

    const barW = 200;
    const barH = 6;
    const panelX = w / 2 - 220;
    const panelW = 440;
    const itemHeights = [
      44, 70, 60, 60, 60, 60, 60, 44, 44, 44, 44, 60, 60, 44, 44, 44, 44, 60,
    ]; // difficulty, crosshair, minimap, music, sfx, sensitivity, fov, viewMode, invertX, fontScale, colorblind, hudScale, staminaBarSize, showPortrait, showWeapons, showKills, showScore, touchSensitivity

    // Scroll the settings panel so the selected item stays visible
    const totalH = itemHeights.reduce((a, b) => a + b, 0);
    const visibleH = h - 120; // leave room for title + hint
    const titleAreaY = 50;
    let startY = titleAreaY + 40;
    if (totalH > visibleH) {
      // Calculate selected item center and scroll to keep it visible
      let selTop = 0;
      for (let i = 0; i < this.settingsSelection; i++) selTop += itemHeights[i];
      const selCenter = selTop + itemHeights[this.settingsSelection] / 2;
      const idealOffset = visibleH / 2 - selCenter;
      const maxOffset = 0;
      const minOffset = visibleH - totalH;
      startY += Math.max(minOffset, Math.min(maxOffset, idealOffset));
    }

    for (let i = 0; i < items.length; i++) {
      const selected = this.settingsSelection === i;
      const itemH = itemHeights[i];
      const y = startY;

      // Selection highlight
      if (selected) {
        ctx.fillStyle = "rgba(0,200,255,0.12)";
        ctx.fillRect(panelX, y - 4, panelW, itemH);
        ctx.strokeStyle = "rgba(0,200,255,0.25)";
        ctx.strokeRect(panelX, y - 4, panelW, itemH);
      }

      // Label
      ctx.fillStyle = selected ? "#00ffcc" : "#8888aa";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "left";
      ctx.fillText(items[i].label, panelX + 16, y + 18);

      // Value
      ctx.textAlign = "right";
      ctx.fillStyle = items[i].color || (selected ? "#ffffff" : "#aaaacc");
      ctx.fillText(`< ${items[i].value} >`, panelX + panelW - 16, y + 18);

      // Sub-widgets under their setting
      if (i === 1) {
        // Crosshair preview
        const prevX = w / 2;
        const prevY = y + 46;
        ctx.fillStyle = "rgba(30,30,50,0.8)";
        ctx.fillRect(prevX - 40, prevY - 18, 80, 36);
        ctx.strokeStyle = "rgba(0,200,255,0.2)";
        ctx.strokeRect(prevX - 40, prevY - 18, 80, 36);
        if (this.settings.crosshair < 5) {
          this.drawCrosshairAt(ctx, prevX, prevY);
        } else {
          ctx.fillStyle = "rgba(255,255,255,0.3)";
          ctx.font = "10px monospace";
          ctx.textAlign = "center";
          ctx.fillText("(none)", prevX, prevY + 4);
        }
      } else if (i === 2) {
        // Minimap size bar
        const sliderY = y + 32;
        const pct = (this.settings.minimapSize - 100) / 200;
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(w / 2 - barW / 2, sliderY, barW, barH);
        ctx.fillStyle = "#00ccff";
        ctx.fillRect(w / 2 - barW / 2, sliderY, barW * pct, barH);
        ctx.strokeStyle = "rgba(0,200,255,0.2)";
        ctx.strokeRect(w / 2 - barW / 2, sliderY, barW, barH);
      } else if (i === 3) {
        // Music volume bar
        const sliderY = y + 32;
        const volPct = this.settings.musicVolume / 100;
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(w / 2 - barW / 2, sliderY, barW, barH);
        ctx.fillStyle = this.settings.musicVolume === 0 ? "#ff4444" : "#00ff88";
        ctx.fillRect(w / 2 - barW / 2, sliderY, barW * volPct, barH);
        ctx.strokeStyle = "rgba(0,200,255,0.2)";
        ctx.strokeRect(w / 2 - barW / 2, sliderY, barW, barH);
      } else if (i === 4) {
        // SFX volume bar
        const sliderY = y + 32;
        const volPct = this.settings.sfxVolume / 100;
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(w / 2 - barW / 2, sliderY, barW, barH);
        ctx.fillStyle = this.settings.sfxVolume === 0 ? "#ff4444" : "#88aaff";
        ctx.fillRect(w / 2 - barW / 2, sliderY, barW * volPct, barH);
        ctx.strokeStyle = "rgba(0,200,255,0.2)";
        ctx.strokeRect(w / 2 - barW / 2, sliderY, barW, barH);
      } else if (i === 5) {
        // Sensitivity bar
        const sliderY = y + 32;
        const sensPct = (this.settings.sensitivity - 0.5) / 1.5;
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(w / 2 - barW / 2, sliderY, barW, barH);
        ctx.fillStyle = "#ffcc00";
        ctx.fillRect(w / 2 - barW / 2, sliderY, barW * sensPct, barH);
        ctx.strokeStyle = "rgba(0,200,255,0.2)";
        ctx.strokeRect(w / 2 - barW / 2, sliderY, barW, barH);
      } else if (i === 6) {
        // FOV bar
        const sliderY = y + 32;
        const fovPct = (this.settings.fov - 50) / 70; // range 50-120
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(w / 2 - barW / 2, sliderY, barW, barH);
        ctx.fillStyle = "#cc88ff";
        ctx.fillRect(w / 2 - barW / 2, sliderY, barW * fovPct, barH);
        ctx.strokeStyle = "rgba(0,200,255,0.2)";
        ctx.strokeRect(w / 2 - barW / 2, sliderY, barW, barH);
      } else if (i === 11) {
        // HUD Scale bar
        const sliderY = y + 32;
        const pct = (this.settings.hudScale - 75) / 50; // range 75-125
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(w / 2 - barW / 2, sliderY, barW, barH);
        ctx.fillStyle = "#44ffaa";
        ctx.fillRect(w / 2 - barW / 2, sliderY, barW * pct, barH);
        ctx.strokeStyle = "rgba(0,200,255,0.2)";
        ctx.strokeRect(w / 2 - barW / 2, sliderY, barW, barH);
      } else if (i === 12) {
        // Stamina Bar Size bar
        const sliderY = y + 32;
        const pct = (this.settings.staminaBarSize - 75) / 75; // range 75-150
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(w / 2 - barW / 2, sliderY, barW, barH);
        ctx.fillStyle = "#00ccff";
        ctx.fillRect(w / 2 - barW / 2, sliderY, barW * pct, barH);
        ctx.strokeStyle = "rgba(0,200,255,0.2)";
        ctx.strokeRect(w / 2 - barW / 2, sliderY, barW, barH);
      } else if (i === 17) {
        // Touch Sensitivity bar
        const sliderY = y + 32;
        const pct = (this.settings.touchSensitivity - 0.5) / 2.5; // range 0.5-3.0
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(w / 2 - barW / 2, sliderY, barW, barH);
        ctx.fillStyle = "#ff88cc";
        ctx.fillRect(w / 2 - barW / 2, sliderY, barW * pct, barH);
        ctx.strokeStyle = "rgba(0,200,255,0.2)";
        ctx.strokeRect(w / 2 - barW / 2, sliderY, barW, barH);
      }

      startY += itemH;
    }

    ctx.fillStyle = "#556677";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    if (!this.isTouchDevice) {
      ctx.fillText(
        "W/S to navigate, LEFT/RIGHT to change, ESC to go back",
        w / 2,
        startY + 20,
      );
    }
    ctx.textAlign = "left";
  }

  renderControlsScreen(ctx, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.88)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 30px monospace";
    ctx.textAlign = "center";
    ctx.fillText("KEY BINDINGS", w / 2, 60);

    const bindKeys = Object.keys(this.keybinds);
    const labels = {
      moveForward: "Move Forward",
      moveBack: "Move Back",
      moveLeft: "Strafe Left",
      moveRight: "Strafe Right",
      sprint: "Sprint",
      interact: "Interact",
      pause: "Pause",
      weapon1: "Weapon 1",
      weapon2: "Weapon 2",
      weapon3: "Weapon 3",
      weapon4: "Weapon 4",
      toggleFPS: "Toggle FPS",
      chronoShift: "Chrono Shift (Slow Time)",
    };

    const panelX = w / 2 - 240;
    const panelW = 480;
    const itemH = 36;
    const startY = 100;

    for (let i = 0; i < bindKeys.length; i++) {
      const key = bindKeys[i];
      const selected = this.controlsSelection === i;
      const isRebinding = this.rebindingKey === key;
      const y = startY + i * itemH;

      // Selection highlight
      const isSwapFlashed =
        this._keybindSwapFlash &&
        this._keybindSwapFlash.action === key &&
        performance.now() - this._keybindSwapFlash.time < 1500;
      if (isSwapFlashed) {
        const flashAlpha =
          0.3 * (1 - (performance.now() - this._keybindSwapFlash.time) / 1500);
        ctx.fillStyle = `rgba(255,170,0,${flashAlpha})`;
        ctx.fillRect(panelX, y - 2, panelW, itemH - 4);
        ctx.strokeStyle = `rgba(255,170,0,${flashAlpha + 0.1})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, y - 2, panelW, itemH - 4);
      } else if (selected) {
        ctx.fillStyle = "rgba(0,200,255,0.12)";
        ctx.fillRect(panelX, y - 2, panelW, itemH - 4);
        ctx.strokeStyle = "rgba(0,200,255,0.25)";
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, y - 2, panelW, itemH - 4);
      }

      // Label
      ctx.fillStyle = selected ? "#00ffcc" : "#8888aa";
      ctx.font = "bold 15px monospace";
      ctx.textAlign = "left";
      ctx.fillText(labels[key] || key, panelX + 16, y + 20);

      // Key value or "Press a key..." prompt
      ctx.textAlign = "right";
      if (isRebinding) {
        const blink = Math.floor(performance.now() / 400) % 2;
        ctx.fillStyle = blink ? "#ffcc00" : "#ff8800";
        ctx.font = "bold 15px monospace";
        ctx.fillText("[ Press a key... ]", panelX + panelW - 16, y + 20);
      } else {
        ctx.fillStyle = isSwapFlashed
          ? "#ffaa00"
          : selected
            ? "#ffffff"
            : "#aaaacc";
        ctx.font = "15px monospace";
        ctx.fillText(
          this.formatKeyCode(this.keybinds[key]),
          panelX + panelW - 16,
          y + 20,
        );
      }
    }

    // Reset Defaults button
    const resetY = startY + bindKeys.length * itemH + 10;
    const resetSelected = this.controlsSelection === bindKeys.length;
    if (resetSelected) {
      ctx.fillStyle = "rgba(200,100,0,0.15)";
      ctx.fillRect(panelX, resetY - 2, panelW, itemH - 4);
      ctx.strokeStyle = "rgba(255,170,0,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(panelX, resetY - 2, panelW, itemH - 4);
    }
    ctx.fillStyle = resetSelected ? "#ffaa00" : "#886644";
    ctx.font = "bold 15px monospace";
    ctx.textAlign = "center";
    ctx.fillText("[ RESET TO DEFAULTS ]", w / 2, resetY + 20);

    // Help text
    ctx.fillStyle = "#556677";
    ctx.font = "12px monospace";
    ctx.fillText(
      "W/S to navigate, ENTER to rebind, ESC to go back",
      w / 2,
      resetY + itemH + 20,
    );
    ctx.textAlign = "left";
  }

  formatKeyCode(code) {
    // Human-readable key names
    const map = {
      KeyW: "W",
      KeyA: "A",
      KeyS: "S",
      KeyD: "D",
      KeyE: "E",
      KeyF: "F",
      KeyQ: "Q",
      KeyR: "R",
      KeyP: "P",
      KeyC: "C",
      Digit1: "1",
      Digit2: "2",
      Digit3: "3",
      Digit4: "4",
      Digit5: "5",
      ShiftLeft: "L-Shift",
      ShiftRight: "R-Shift",
      ControlLeft: "L-Ctrl",
      ControlRight: "R-Ctrl",
      AltLeft: "L-Alt",
      AltRight: "R-Alt",
      Space: "Space",
      Enter: "Enter",
      Escape: "Escape",
      Tab: "Tab",
      ArrowUp: "Up",
      ArrowDown: "Down",
      ArrowLeft: "Left",
      ArrowRight: "Right",
      Backspace: "Backspace",
    };
    return map[code] || code.replace("Key", "").replace("Digit", "");
  }

  renderAchievementsScreen(ctx, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.92)";
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = "#ffcc00";
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.fillText("ACHIEVEMENTS", w / 2, 50);

    const entries = Object.entries(ACHIEVEMENTS);
    const cols = 2;
    const cardW = 260;
    const cardH = 72;
    const gap = 12;
    const totalW = cols * cardW + (cols - 1) * gap;
    const startX = w / 2 - totalW / 2;
    const startY = 80;
    const maxScroll = Math.max(
      0,
      Math.ceil(entries.length / cols) -
        Math.floor((h - startY - 50) / (cardH + gap)),
    );
    this.achievementsScroll = Math.min(this.achievementsScroll || 0, maxScroll);
    const scroll = this.achievementsScroll || 0;

    let unlocked = 0;
    for (const [id] of entries) {
      if (this.unlockedAchievements[id]) unlocked++;
    }

    // Progress bar
    const progW = 300;
    const progH = 10;
    const progX = w / 2 - progW / 2;
    const progY = 58;
    const progPct = entries.length > 0 ? unlocked / entries.length : 0;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.roundRect(progX, progY, progW, progH, 4);
    ctx.fill();
    if (progPct > 0) {
      ctx.fillStyle = "#ffcc00";
      ctx.beginPath();
      ctx.roundRect(progX, progY, progW * progPct, progH, 4);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "10px monospace";
    ctx.fillText(`${unlocked} / ${entries.length}`, w / 2, progY + progH + 12);

    const visibleRows = Math.floor((h - startY - 50) / (cardH + gap));

    for (let idx = 0; idx < entries.length; idx++) {
      const [id, ach] = entries[idx];
      const row = Math.floor(idx / cols) - scroll;
      const col = idx % cols;
      if (row < 0 || row >= visibleRows) continue;

      const cx = startX + col * (cardW + gap);
      const cy = startY + row * (cardH + gap);
      const isUnlocked = !!this.unlockedAchievements[id];

      // Card bg
      ctx.fillStyle = isUnlocked ? "rgba(40,40,10,0.7)" : "rgba(10,10,20,0.6)";
      ctx.beginPath();
      ctx.roundRect(cx, cy, cardW, cardH, 6);
      ctx.fill();
      ctx.strokeStyle = isUnlocked
        ? "rgba(255,204,0,0.4)"
        : "rgba(100,100,120,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cx, cy, cardW, cardH, 6);
      ctx.stroke();

      // Icon
      const iconKey = ach.icon;
      const iconImg = this.achievementIcons[iconKey];
      if (iconImg && iconImg.complete) {
        ctx.globalAlpha = isUnlocked ? 1 : 0.25;
        ctx.drawImage(iconImg, cx + 8, cy + 10, 48, 48);
        ctx.globalAlpha = 1;
      }

      // Name
      ctx.fillStyle = isUnlocked ? "#ffcc00" : "#555566";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "left";
      ctx.fillText(ach.name, cx + 64, cy + 24);

      // Description
      ctx.fillStyle = isUnlocked
        ? "rgba(200,210,220,0.7)"
        : "rgba(100,100,120,0.5)";
      ctx.font = "11px monospace";
      ctx.fillText(ach.description, cx + 64, cy + 42);

      // Status
      if (isUnlocked) {
        ctx.fillStyle = "rgba(0,255,100,0.6)";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "right";
        ctx.fillText("UNLOCKED", cx + cardW - 8, cy + 60);
        ctx.textAlign = "left";
      }
    }

    // Footer
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("W/S to scroll  ·  ESC to go back", w / 2, h - 20);
    ctx.textAlign = "left";
  }

  renderUpgradeScreen(ctx, w, h) {
    const now = performance.now();

    // ── Deep space backdrop ──
    ctx.fillStyle = "#020510";
    ctx.fillRect(0, 0, w, h);

    // Subtle animated grid
    ctx.strokeStyle = "rgba(0,200,255,0.03)";
    ctx.lineWidth = 1;
    const gridSize = 40;
    const gridOff = (now * 0.01) % gridSize;
    for (let gx = -gridOff; gx < w; gx += gridSize) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();
    }
    for (let gy = -gridOff; gy < h; gy += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    // Ambient particle field
    ctx.fillStyle = "rgba(0,255,200,0.12)";
    for (let i = 0; i < 30; i++) {
      const px = w * 0.5 + Math.sin(now * 0.0003 + i * 2.1) * w * 0.45;
      const py = h * 0.5 + Math.cos(now * 0.0004 + i * 1.7) * h * 0.45;
      const ps = 1 + Math.sin(now * 0.002 + i) * 0.5;
      ctx.beginPath();
      ctx.arc(px, py, ps, 0, Math.PI * 2);
      ctx.fill();
    }

    // Radial vignette
    const vig = ctx.createRadialGradient(
      w / 2,
      h / 2,
      h * 0.2,
      w / 2,
      h / 2,
      h * 0.8,
    );
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,10,0.6)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    // ── Header section ──
    const headerY = 40;
    // Horizontal accent line
    const lineW = 200;
    ctx.strokeStyle = "rgba(0,255,200,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - lineW, headerY + 14);
    ctx.lineTo(w / 2 + lineW, headerY + 14);
    ctx.stroke();

    // Round complete title
    const titlePulse = 0.85 + 0.15 * Math.sin(now * 0.003);
    ctx.save();
    ctx.shadowColor = "#00ffcc";
    ctx.shadowBlur = 18 * titlePulse;
    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 32px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`ROUND ${this.arenaRound - 1} COMPLETE`, w / 2, headerY);
    ctx.shadowBlur = 0;
    ctx.restore();

    // Score with animated counter feel
    ctx.fillStyle = "#ffcc00";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      `\u2605  SCORE: ${this.player.score}  \u2605`,
      w / 2,
      headerY + 34,
    );

    // Section divider
    ctx.strokeStyle = "rgba(0,200,255,0.15)";
    ctx.beginPath();
    ctx.moveTo(w * 0.15, headerY + 52);
    ctx.lineTo(w * 0.85, headerY + 52);
    ctx.stroke();

    // UPGRADES subtitle
    ctx.fillStyle = "rgba(170,200,255,0.6)";
    ctx.font = "bold 14px monospace";
    ctx.fillText("\u25C6  UPGRADES  \u25C6", w / 2, headerY + 70);

    // ── Upgrade cards ──
    const upgradeKeys = Object.keys(UPGRADES);
    const startY = headerY + 90;
    const cardH = 64;
    const cardGap = 6;
    const colW = 320;
    const cols = 2;
    const leftX = w / 2 - colW - 12;
    const rightX = w / 2 + 12;

    for (let i = 0; i < upgradeKeys.length; i++) {
      const key = upgradeKeys[i];
      const upg = UPGRADES[key];
      const level = this.upgradeLevels[key] || 0;
      const cost = Math.floor(upg.baseCost * Math.pow(upg.costScale, level));
      const maxed = level >= upg.maxLevel;
      const selected = this.upgradeSelection === i;
      const affordable = this.player.score >= cost;

      const col = i % cols;
      const row = Math.floor(i / cols);
      const baseX = col === 0 ? leftX : rightX;
      const y = startY + row * (cardH + cardGap);

      // Card background
      ctx.fillStyle = selected ? "rgba(0,200,255,0.08)" : "rgba(10,15,30,0.6)";
      ctx.beginPath();
      ctx.roundRect(baseX, y, colW, cardH, 6);
      ctx.fill();

      // Card border
      if (selected) {
        const borderPulse = 0.5 + 0.5 * Math.sin(now * 0.005);
        ctx.strokeStyle = `rgba(0,255,200,${0.3 + borderPulse * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(baseX, y, colW, cardH, 6);
        ctx.stroke();
        // Left accent bar
        ctx.fillStyle = maxed ? "#44ff44" : "#00ffcc";
        ctx.beginPath();
        ctx.roundRect(baseX, y, 3, cardH, [3, 0, 0, 3]);
        ctx.fill();
      } else {
        ctx.strokeStyle = "rgba(50,60,80,0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(baseX, y, colW, cardH, 6);
        ctx.stroke();
      }

      // Upgrade name
      ctx.fillStyle = selected ? "#ffffff" : "#8888aa";
      ctx.font = `${selected ? "bold " : ""}15px monospace`;
      ctx.textAlign = "left";
      ctx.fillText(upg.name, baseX + 14, y + 20);

      // Description
      ctx.fillStyle = selected
        ? "rgba(170,200,220,0.7)"
        : "rgba(100,110,130,0.6)";
      ctx.font = "11px monospace";
      ctx.fillText(upg.description, baseX + 14, y + 36);

      // Cost or MAX badge
      ctx.textAlign = "right";
      if (maxed) {
        // MAX badge
        ctx.fillStyle = "rgba(0,255,100,0.15)";
        ctx.beginPath();
        ctx.roundRect(baseX + colW - 52, y + 8, 40, 20, 4);
        ctx.fill();
        ctx.fillStyle = "#44ff44";
        ctx.font = "bold 12px monospace";
        ctx.fillText("MAX", baseX + colW - 16, y + 22);
      } else {
        ctx.fillStyle = affordable ? "#ffcc00" : "#ff4455";
        ctx.font = "bold 14px monospace";
        ctx.fillText(`${cost}`, baseX + colW - 12, y + 22);
        // Cost label
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.font = "9px monospace";
        ctx.fillText("COST", baseX + colW - 12, y + 12);
      }

      // Level pips — progress bar style
      const maxPips = Math.min(upg.maxLevel, 10);
      const pipBarW = colW - 28;
      const pipH = 3;
      const pipY = y + cardH - 12;
      // Track
      ctx.fillStyle = "rgba(30,40,60,0.8)";
      ctx.beginPath();
      ctx.roundRect(baseX + 14, pipY, pipBarW, pipH, 2);
      ctx.fill();
      // Filled
      if (level > 0) {
        const fillW = (pipBarW * level) / maxPips;
        const pipGrad = ctx.createLinearGradient(
          baseX + 14,
          0,
          baseX + 14 + fillW,
          0,
        );
        pipGrad.addColorStop(0, maxed ? "#44ff44" : "#00ffcc");
        pipGrad.addColorStop(1, maxed ? "#22cc22" : "#0088aa");
        ctx.fillStyle = pipGrad;
        ctx.beginPath();
        ctx.roundRect(baseX + 14, pipY, fillW, pipH, 2);
        ctx.fill();
      }

      // Level text (right side)
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(150,170,190,0.4)";
      ctx.font = "9px monospace";
      ctx.fillText(`LV ${level}/${upg.maxLevel}`, baseX + colW - 12, pipY + 3);

      ctx.textAlign = "left";
    }

    // ── Continue button ──
    const totalRows = Math.ceil(upgradeKeys.length / cols);
    const contY = startY + totalRows * (cardH + cardGap) + 20;
    const contSelected = this.upgradeSelection === upgradeKeys.length;

    if (contSelected) {
      const btnPulse = 0.5 + 0.5 * Math.sin(now * 0.004);
      ctx.fillStyle = `rgba(0,255,200,${0.06 + btnPulse * 0.04})`;
      ctx.beginPath();
      ctx.roundRect(w / 2 - 180, contY - 18, 360, 36, 8);
      ctx.fill();
      ctx.strokeStyle = `rgba(0,255,200,${0.3 + btnPulse * 0.3})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(w / 2 - 180, contY - 18, 360, 36, 8);
      ctx.stroke();
    }
    ctx.fillStyle = contSelected ? "#00ffcc" : "#556677";
    ctx.font = `bold 18px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(
      contSelected
        ? "\u25B6  CONTINUE TO NEXT ROUND  \u25B6"
        : "CONTINUE TO NEXT ROUND",
      w / 2,
      contY + 5,
    );

    // ── Footer hint ──
    ctx.fillStyle = "rgba(100,120,140,0.4)";
    ctx.font = "11px monospace";
    ctx.fillText("W/S/A/D navigate  \u00B7  ENTER select", w / 2, contY + 34);

    // ── Top scanline overlay ──
    ctx.fillStyle = "rgba(0,0,0,0.03)";
    for (let sy = 0; sy < h; sy += 4) {
      ctx.fillRect(0, sy, w, 1);
    }

    ctx.textAlign = "left";
  }

  renderGameOver(ctx, w, h) {
    // Animated red-tinged background
    ctx.fillStyle = "rgba(30,0,0,0.94)";
    ctx.fillRect(0, 0, w, h);
    // Pulsing red vignette
    const pulse = 0.5 + Math.sin(this.time * 0.003) * 0.2;
    const vig = ctx.createRadialGradient(
      w / 2,
      h / 2,
      h * 0.15,
      w / 2,
      h / 2,
      h * 0.7,
    );
    vig.addColorStop(0, "rgba(80,0,0,0)");
    vig.addColorStop(0.5, `rgba(60,0,0,${pulse * 0.15})`);
    vig.addColorStop(1, `rgba(40,0,0,${0.4 + pulse * 0.15})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
    // Floating static debris
    ctx.fillStyle = "rgba(255,30,0,0.06)";
    for (let i = 0; i < 12; i++) {
      const sx = w * (0.1 + (Math.sin(this.time * 0.0005 + i * 1.7) + 1) * 0.4);
      const sy =
        h * (0.05 + (Math.cos(this.time * 0.0007 + i * 2.3) + 1) * 0.45);
      const sz = 20 + Math.sin(i * 3) * 15;
      ctx.fillRect(sx - sz / 2, sy - 1, sz, 2);
    }
    // Horizontal divider lines
    const divY1 = h / 2 - 135;
    const divY2 = h / 2 - 40;
    ctx.strokeStyle = "rgba(255,34,0,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, divY1);
    ctx.lineTo(w * 0.8, divY1);
    ctx.moveTo(w * 0.25, divY2);
    ctx.lineTo(w * 0.75, divY2);
    ctx.stroke();
    // Title with glow
    ctx.shadowColor = "#ff2200";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#ff2200";
    ctx.font = "bold 42px monospace";
    ctx.textAlign = "center";
    ctx.fillText("TIMELINE COLLAPSED", w / 2, h / 2 - 110);
    ctx.shadowBlur = 0;
    // Subtitle
    ctx.fillStyle = "rgba(255,100,70,0.7)";
    ctx.font = "14px monospace";
    ctx.fillText(
      "Temporal integrity failed — reality unraveled",
      w / 2,
      h / 2 - 75,
    );

    this._renderStatsCard(ctx, w, h / 2 - 50, "#ff2200", "#ff6644");

    if (this.mode === "arena") {
      ctx.fillStyle = "#ff8866";
      ctx.font = "bold 18px monospace";
      ctx.fillText(
        `Rounds Survived: ${this.arenaRound - 1}`,
        w / 2,
        h / 2 + 100,
      );
    }
    // Prompt with pulsing alpha
    const promptA = 0.4 + Math.sin(this.time * 0.004) * 0.3;
    ctx.fillStyle = `rgba(170,170,170,${promptA})`;
    ctx.font = "14px monospace";
    ctx.fillText("Press ENTER to return to title", w / 2, h / 2 + 130);
    ctx.fillStyle = `rgba(255,136,100,${promptA * 0.8})`;
    ctx.fillText("Press R to restart", w / 2, h / 2 + 155);
    ctx.textAlign = "left";

    // Scanline overlay
    ctx.fillStyle = "rgba(0,0,0,0.04)";
    for (let sy = 0; sy < h; sy += 3) {
      ctx.fillRect(0, sy, w, 1);
    }
  }

  renderVictory(ctx, w, h) {
    ctx.fillStyle = "rgba(0,6,20,0.95)";
    ctx.fillRect(0, 0, w, h);
    // Animated aurora glow
    const pulse = 0.7 + Math.sin(this.time * 0.003) * 0.3;
    const auroraGrad = ctx.createRadialGradient(
      w / 2,
      h * 0.35,
      0,
      w / 2,
      h * 0.35,
      h * 0.6,
    );
    auroraGrad.addColorStop(0, `rgba(0,255,200,${pulse * 0.08})`);
    auroraGrad.addColorStop(0.4, `rgba(0,180,255,${pulse * 0.04})`);
    auroraGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = auroraGrad;
    ctx.fillRect(0, 0, w, h);
    // Rising particle streaks
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 20; i++) {
      const px = w * (0.1 + (i / 20) * 0.8);
      const py = h - ((this.time * 0.04 + i * 73) % h);
      const pLen = 8 + Math.sin(i * 2) * 5;
      ctx.fillStyle =
        i % 3 === 0 ? "#00ffcc" : i % 3 === 1 ? "#ffcc00" : "#aaddff";
      ctx.fillRect(px, py, 1.5, pLen);
    }
    ctx.globalAlpha = 1;
    // Decorative dividers
    ctx.strokeStyle = "rgba(0,255,200,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.15, h / 2 - 100);
    ctx.lineTo(w * 0.85, h / 2 - 100);
    ctx.stroke();
    // Title with teal glow
    ctx.shadowColor = "#00ffcc";
    ctx.shadowBlur = 25;
    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 42px monospace";
    ctx.textAlign = "center";
    ctx.fillText("TIMELINE RESTORED", w / 2, h / 2 - 75);
    ctx.shadowBlur = 0;
    // Subtitles with stagger
    ctx.fillStyle = "#ffcc00";
    ctx.font = "bold 18px monospace";
    ctx.fillText(
      "The Paradox Lord has been destroyed — for good.",
      w / 2,
      h / 2 - 35,
    );
    ctx.fillStyle = "rgba(170,220,255,0.7)";
    ctx.font = "16px monospace";
    ctx.fillText("Three forms. Three acts. One team.", w / 2, h / 2 - 8);
    ctx.fillText(
      "The quantum continuum is stable once more.",
      w / 2,
      h / 2 + 14,
    );
    // Divider below text
    ctx.strokeStyle = "rgba(255,204,0,0.15)";
    ctx.beginPath();
    ctx.moveTo(w * 0.25, h / 2 + 28);
    ctx.lineTo(w * 0.75, h / 2 + 28);
    ctx.stroke();

    this._renderStatsCard(ctx, w, h / 2 + 40, "#ffcc00", "#aaddff");

    const promptA = 0.4 + Math.sin(this.time * 0.004) * 0.3;
    ctx.fillStyle = `rgba(170,170,170,${promptA})`;
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Press ENTER to return to title", w / 2, h / 2 + 215);
    ctx.textAlign = "left";

    // Scanline overlay
    ctx.fillStyle = "rgba(0,0,0,0.03)";
    for (let sy = 0; sy < h; sy += 4) {
      ctx.fillRect(0, sy, w, 1);
    }
  }

  renderLevelComplete(ctx, w, h) {
    ctx.fillStyle = "rgba(0,4,18,0.94)";
    ctx.fillRect(0, 0, w, h);
    // Subtle cyan glow
    const pulse = 0.6 + Math.sin(this.time * 0.004) * 0.3;
    const glow = ctx.createRadialGradient(
      w / 2,
      h * 0.35,
      0,
      w / 2,
      h * 0.35,
      h * 0.5,
    );
    glow.addColorStop(0, `rgba(0,255,200,${pulse * 0.06})`);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    // Decorative top line
    ctx.strokeStyle = "rgba(0,255,200,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h / 2 - 130);
    ctx.lineTo(w * 0.8, h / 2 - 130);
    ctx.stroke();
    // Title with glow
    ctx.shadowColor = "#00ffcc";
    ctx.shadowBlur = 15;
    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 36px monospace";
    ctx.textAlign = "center";
    ctx.fillText("LEVEL COMPLETE", w / 2, h / 2 - 100);
    ctx.shadowBlur = 0;
    // Divider
    ctx.strokeStyle = "rgba(0,255,200,0.15)";
    ctx.beginPath();
    ctx.moveTo(w * 0.25, h / 2 - 75);
    ctx.lineTo(w * 0.75, h / 2 - 75);
    ctx.stroke();

    this._renderStatsCard(ctx, w, h / 2 - 55, "#00ffcc", "#aaddff");

    ctx.fillStyle = "#aaddff";
    ctx.font = "16px monospace";
    ctx.fillText(
      `Secrets: ${this.player.secretsFound || 0}`,
      w / 2,
      h / 2 + 80,
    );

    const promptA = 0.4 + Math.sin(this.time * 0.004) * 0.3;
    ctx.fillStyle = `rgba(170,170,170,${promptA})`;
    ctx.font = "14px monospace";
    ctx.fillText("Press ENTER to continue", w / 2, h / 2 + 110);
    ctx.textAlign = "left";

    // Scanline overlay
    ctx.fillStyle = "rgba(0,0,0,0.03)";
    for (let sy = 0; sy < h; sy += 4) {
      ctx.fillRect(0, sy, w, 1);
    }
  }

  _renderStatsCard(ctx, w, startY, accentColor, textColor) {
    const accuracy =
      this.shotsFired > 0
        ? Math.round((this.shotsHit / this.shotsFired) * 100)
        : 0;
    const elapsed = Math.round(
      (performance.now() - this.roundStartTime) / 1000,
    );
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const timeStr = `${mins}:${String(secs).padStart(2, "0")}`;

    // Card background with inner glow
    const cardW = 380;
    const cardH = 130;
    const cx = w / 2 - cardW / 2;
    // Outer glow
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.beginPath();
    ctx.roundRect(cx, startY, cardW, cardH, 8);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Border
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx, startY, cardW, cardH, 8);
    ctx.stroke();
    // Inner accent line at top of card
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.roundRect(cx + 1, startY + 1, cardW - 2, 3, [7, 7, 0, 0]);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Vertical divider
    ctx.strokeStyle = `${accentColor}33`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, startY + 12);
    ctx.lineTo(w / 2, startY + cardH - 12);
    ctx.stroke();
    // Horizontal divider
    ctx.beginPath();
    ctx.moveTo(cx + 16, startY + cardH / 2);
    ctx.lineTo(cx + cardW - 16, startY + cardH / 2);
    ctx.stroke();

    // Stats in 2x2 grid
    const stats = [
      { label: "KILLS", value: `${this.killedEnemies}/${this.totalEnemies}` },
      { label: "TIME", value: timeStr },
      { label: "ACCURACY", value: `${accuracy}%` },
      { label: "BEST STREAK", value: `${this.bestStreak}x` },
    ];

    const colW = cardW / 2;
    const rowH = cardH / 2;
    ctx.textAlign = "center";
    for (let i = 0; i < stats.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const sx = cx + col * colW + colW / 2;
      const sy = startY + row * rowH + 18;

      ctx.fillStyle = textColor;
      ctx.globalAlpha = 0.6;
      ctx.font = "bold 10px monospace";
      ctx.fillText(stats[i].label, sx, sy);
      ctx.globalAlpha = 1;

      ctx.fillStyle = accentColor;
      ctx.font = "bold 24px monospace";
      ctx.fillText(stats[i].value, sx, sy + 26);
    }

    // Score bar at bottom of card
    ctx.fillStyle = accentColor;
    ctx.font = "bold 14px monospace";
    ctx.fillText(`SCORE: ${this.player.score}`, w / 2, startY + cardH + 20);
  }

  // ── Builder Mode (delegated to BuilderMode) ────────────────────

  startBuilder() {
    this.builder.start();
    this.builder.onPlayTest = () => this.startBuilderPlayTest();
    this.map = this.builder.map;
    this.entities = [];
    this.state = GameState.BUILDER;
  }

  startBuilderPlayTest() {
    // Save builder state so we can return
    this._builderSnapshot = {
      playerX: this.builder.player.x,
      playerY: this.builder.player.y,
      playerAngle: this.builder.player.angle,
    };

    // Use the builder's map as the gameplay map
    this.map = this.builder.map;
    this.entities = [];
    this.projectiles = [];

    // Find a spawn point — center of map or player position
    const spawnX = this.builder.player.x;
    const spawnY = this.builder.player.y;

    // Reset player for play-test
    this.player = new Player(spawnX, spawnY);
    this.player.health = 100;
    this.player.maxHealth = 100;
    this.player.ammo = 50;
    this.player.angle = this.builder.player.angle;
    this.player.weapons = [0, 1]; // pistol + shotgun
    this.player.currentWeapon = 0;

    // Spawn enemies — prefer placed spawns, fallback to random
    let spawned = 0;
    if (this.map.enemySpawns && this.map.enemySpawns.length > 0) {
      for (const s of this.map.enemySpawns) {
        const enemy = new Enemy(s.x + 0.5, s.y + 0.5, s.enemy || "drone");
        this.entities.push(enemy);
        spawned++;
      }
    } else {
      const enemyTypes = ["drone", "phantom", "beast"];
      const maxEnemies = 8;
      for (let attempt = 0; attempt < 200 && spawned < maxEnemies; attempt++) {
        const ex = 1.5 + Math.random() * (this.map.width - 3);
        const ey = 1.5 + Math.random() * (this.map.height - 3);
        const gx = Math.floor(ex),
          gy = Math.floor(ey);
        if (
          gx >= 0 &&
          gy >= 0 &&
          gx < this.map.width &&
          gy < this.map.height &&
          this.map.grid[gy][gx] === 0
        ) {
          const dist = Math.sqrt((ex - spawnX) ** 2 + (ey - spawnY) ** 2);
          if (dist > 3) {
            const etype = enemyTypes[spawned % enemyTypes.length];
            const enemy = new Enemy(ex, ey, etype);
            this.entities.push(enemy);
            spawned++;
          }
        }
      }
    }

    this.killedEnemies = 0;
    this.totalEnemies = spawned;
    this.killStreak = 0;
    this.killStreakTimer = 0;
    this.killStreakDisplay = null;
    this.bestStreak = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.slowMoTimer = 0;
    this.timeScale = 1;

    this.mode = "playtest";
    this.state = GameState.PLAYING;
    this.roundStartTime = performance.now();
    this.audio.startMusic(140);
    this.lockPointer();
  }

  exitBuilderPlayTest() {
    this.audio.stopMusic();
    this._playtestEndTimer = null;
    this.state = GameState.BUILDER;
    this.mode = "builder";
    this.map = this.builder.map;
    this.entities = [];
    this.projectiles = [];
    // Clear stale gameplay HUD
    this.hudCtx.clearRect(0, 0, this.hudCanvas.width, this.hudCanvas.height);
    if (this._builderSnapshot) {
      this.builder.player.x = this._builderSnapshot.playerX;
      this.builder.player.y = this._builderSnapshot.playerY;
      this.builder.player.angle = this._builderSnapshot.playerAngle;
      this._builderSnapshot = null;
    }
    // Delay pointer lock to avoid race with browser's ESC-triggered unlock
    setTimeout(() => this.lockPointer(), 120);
  }
}
