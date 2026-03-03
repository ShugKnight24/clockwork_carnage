import {
  WEAPONS,
  ENEMY_TYPES,
  ARENA_MAP,
  CAMPAIGN_LEVELS,
  UPGRADES,
  WALL_COLORS,
  TUTORIAL_MAP,
  CUTSCENE_SCRIPTS,
  ACHIEVEMENTS,
  ACHIEVEMENT_ICON_SVGS,
} from "./data.js";
import { Renderer } from "./renderer.js";
import { AudioManager } from "./audio.js";
import { BuilderMode } from "./builder.js";
import { Player, Enemy, Pickup, Projectile } from "./entities.js";

const SAVE_VERSION = 1;

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
};

// TODO: Restructure this entire file, but especially this class... it's a mess. It handles too much. 3k lines for a class is normal right? Split into multiple classes/files (Player, Enemy, Projectile, GameState, etc.) and have a main Game class that manages everything? Likely a StateManager that handles states and the Game class handles core game logic and delegates to other classes as needed. Definitely a base ECS that extracts shared logic and data between entities
export class Game {
  constructor(canvas, hudCanvas) {
    this.canvas = canvas;
    this.hudCanvas = hudCanvas;
    this.hudCtx = hudCanvas.getContext("2d");
    this.renderer = new Renderer(canvas);
    this.audio = new AudioManager();
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

    this.setupInput();
    this.loadSettings();
    this.loadDevFlags();
    this.loadAchievements();
  }

  // TODO: Abstract out InputManager
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
          this.keybinds[this.rebindingKey] = e.code;
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
      this.handleKeyPress(e.code);
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
      if (this.state === GameState.BUILDER) {
        if (!this.mouse.locked && !this.builder.overhead) {
          this.canvas.requestPointerLock();
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
          this.canvas.requestPointerLock();
        }
      }
    });
    this.canvas.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        this.player.isFiring = false;
      }
    });
    document.addEventListener("pointerlockchange", () => {
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

  handleKeyPress(code) {
    // Nested Spaghetti 😂🤦‍♂️
    // TODO: Abstract into StateManager
    if (this.state === GameState.TITLE) {
      if (code === "Enter" || code === "Space") {
        this.audio.init();
        this.audio.resume();
        this.applyAudioSettings();
        this.audio.menuConfirm();
        this.state = GameState.MODE_SELECT;
        this.menuSelection = 0;
      }
      return;
    }

    if (this.state === GameState.MODE_SELECT) {
      // Navigation handled by main.js via HTML button focus
      if (code === "Escape") {
        this.state = GameState.TITLE;
      }
      return;
    }

    if (this.state === GameState.BUILDER) {
      // Only Escape is handled by the host (for pause)
      if (code === "Escape") {
        this.pausedFromState = GameState.BUILDER;
        this.state = GameState.PAUSED;
        document.exitPointerLock();
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
      const menuLen = 3;
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
      if (code === "Escape") {
        this.audio.menuConfirm();
        this.executeTutorialCompletionChoice(2);
        return;
      }
      return;
    }

    if (this.state === GameState.PLAYING) {
      // Tutorial sandbox — ESC/Q returns to title, C starts campaign
      if (this.mode === "tutorial" && this.tutorialStep === 10) {
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
      if (this.mode === "tutorial" && this.tutorialStep < 10) {
        if (code === "Escape") {
          const now = performance.now();
          if (now - this.lastEscTime < 200) return;
          this.lastEscTime = now;
          document.exitPointerLock();
          this.audio.stopMusic();
          this.mode = null;
          this.state = GameState.TITLE;
          return;
        }
      }

      // Weapon switching
      if (code === this.keybinds.weapon1 && this.player.weapons.length >= 1)
        this.player.currentWeapon = 0;
      if (code === this.keybinds.weapon2 && this.player.weapons.length >= 2)
        this.player.currentWeapon = 1;
      if (code === this.keybinds.weapon3 && this.player.weapons.length >= 3)
        this.player.currentWeapon = 2;
      if (code === this.keybinds.weapon4 && this.player.weapons.length >= 4)
        this.player.currentWeapon = 3;

      if (code === this.keybinds.interact) this.interact();
      if (code === this.keybinds.pause || code === "KeyP") {
        const now = performance.now();
        if (now - this.lastEscTime < 200) return;
        this.lastEscTime = now;
        if (this.mode === "playtest") {
          this.exitBuilderPlayTest();
          return;
        }
        this.pausedFromState = GameState.PLAYING;
        this.state = GameState.PAUSED;
        document.exitPointerLock();
      }
      if (code === this.keybinds.toggleFPS) this.showFPS = !this.showFPS;
      return;
    }

    if (this.state === GameState.PAUSED) {
      if (code === "Escape" || code === "Enter" || code === "KeyP") {
        const now = performance.now();
        if (code === "Escape" && now - this.lastEscTime < 200) return;
        this.lastEscTime = now;
        this.state = this.pausedFromState || GameState.PLAYING;
        this.canvas.requestPointerLock();
      }
      if (code === "KeyQ") {
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

  // Dev feature flags
  loadDevFlags() {
    try {
      this.alwaysShowTutorial =
        localStorage.getItem("cc_dev_always_tutorial") === "1";
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
    this.upgradeLevels = {};
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

    this.state = GameState.PLAYING;
    this.roundStartTime = performance.now();
    this.audio.startMusic(140 + this.arenaRound * 5);
    this.canvas.requestPointerLock();
  }

  startCampaign() {
    this.mode = "campaign";
    this.campaignLevel = 0;
    this.campaignAct = 1;
    this.player.reset();
    // Play origin story cutscene, then campaign intro
    if (CUTSCENE_SCRIPTS["clocking_in"]) {
      this.startCutscene("clocking_in", () => {
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
    if (choice === 0) {
      // With tutorial
      this.startTutorial();
    } else {
      // Without tutorial — straight to campaign
      this.startCampaign();
    }
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
    if (CUTSCENE_SCRIPTS["clocking_in"]) {
      this.startCutscene("clocking_in", () => {
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
    this.tutorialSandboxInit = false;
    this.tutorialMenuSelection = 0;
    this.tutorialOriginPlayed = false;
    this.tutorialShowCompletionMenu = false;

    this.state = GameState.PLAYING;
    this.roundStartTime = performance.now() + 99999; // suppress controls overlay
    this.audio.startMusic(130);
    this.canvas.requestPointerLock();
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

      case 3: // Shoot
        if (this.tutorialFired) this.advanceTutorialStep();
        break;

      case 4: // Sprint
        if (p.isSprinting) this.tutorialSprintTime += dt;
        if (this.tutorialSprintTime > 0.5) this.advanceTutorialStep();
        break;

      case 5: // Dash
        if (this.tutorialDashed) this.advanceTutorialStep();
        break;

      case 6: // Open a door with E
        if (this.tutorialDoorOpened) this.advanceTutorialStep();
        break;

      case 7: // Pick up items (health & ammo behind the door)
        if (this.tutorialPickedUp) this.advanceTutorialStep();
        break;

      case 8: // Combat
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

      case 9: // Training complete → show completion menu
        if (elapsed > 2 && !this.tutorialOriginPlayed) {
          this.achievementStats.tutorialComplete = true;
          this.checkAchievements();
          this.tutorialOriginPlayed = true;
          this.tutorialMenuSelection = 0;
          this.tutorialShowCompletionMenu = true;
          this.audio.stopMusic();
          this.state = GameState.TUTORIAL_COMPLETE;
          document.exitPointerLock();
        }
        break;

      case 10: {
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
    document.exitPointerLock();
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
        this.canvas.requestPointerLock();
        break;
      case 1: // Begin Campaign (skip clocking_in — already seen before tutorial)
        document.exitPointerLock();
        this.mode = "campaign";
        this.campaignLevel = 0;
        this.campaignAct = 1;
        this.player.reset();
        this.startCutscene("the_hunt_begins", () => {
          this.startCutscene("intro", () => {
            this.loadCampaignLevel(0);
          });
        });
        break;
      case 2: // Main Menu
      default:
        document.exitPointerLock();
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

    const steps = [
      {
        title: "ARRIVING AT CHRONOS STATION...",
        hint: "Armor calibration in progress...",
        color: "#00ffcc",
      },
      {
        title: "SERVO CALIBRATION — VISUAL TRACKING",
        hint: "Move your mouse to look around — the armor tracks your head movement",
        color: "#00ccff",
      },
      {
        title: "LOCOMOTION SYNC",
        hint: "W A S D  to move — the armor amplifies each step precisely",
        color: "#00ccff",
      },
      {
        title: "WEAPONS INTEGRATION",
        hint: "Click to fire — the rifle syncs to your armor's targeting HUD",
        color: "#ff8844",
      },
      {
        title: "SPRINT BURST CALIBRATION",
        hint: "Hold  SHIFT  to sprint — the servos let you move faster and longer",
        color: "#ffcc00",
      },
      {
        title: "EVASIVE DASH PROTOCOL",
        hint: "Double-tap a movement key to dash — each step must be precise",
        color: "#ff44ff",
      },
      {
        title: "OPEN THE ARMORY DOOR",
        hint: "Face the door and press  E  to interact",
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
        hint: "Free practice — Q to quit · C to start the campaign",
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

    ctx.save();
    ctx.globalAlpha = fadeIn * 0.9;

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 8);
    ctx.fill();

    // Border
    ctx.strokeStyle = step.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = fadeIn * pulse * 0.8;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 8);
    ctx.stroke();

    ctx.globalAlpha = fadeIn;

    // Step counter
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    if (this.tutorialStep > 0 && this.tutorialStep < 9) {
      ctx.fillText(`${this.tutorialStep}/8`, bx + 14, by + 18);
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
    if (this.tutorialStep === 10) {
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
    ctx.textAlign = "left";
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

  // ── Cutscene / Flip-Book Engine ────────────────────────────────────
  startCutscene(scriptKey, onComplete) {
    const script = CUTSCENE_SCRIPTS[scriptKey];
    if (!script || script.length === 0) {
      if (onComplete) onComplete();
      return;
    }
    this.cutscene = {
      script,
      frame: 0,
      frameStart: performance.now(),
      onComplete,
      particles: [],
      skipHeldStart: 0,
    };
    this.state = GameState.CUTSCENE;
  }

  advanceCutsceneFrame() {
    if (!this.cutscene) return;
    this.cutscene.frame++;
    this.cutscene.frameStart = performance.now();
    this.cutscene.particles = [];
    this.audio.menuSelect();
    if (this.cutscene.frame >= this.cutscene.script.length) {
      this.endCutscene();
    }
  }

  endCutscene() {
    const cb = this.cutscene?.onComplete;
    this.cutscene = null;
    if (cb) cb();
  }

  updateCutscene() {
    if (!this.cutscene) return;
    const cs = this.cutscene;
    const frame = cs.script[cs.frame];
    if (!frame) return;

    const elapsed = performance.now() - cs.frameStart;

    // Hold Space to skip entire cutscene (1 second hold)
    if (this.keys["Space"]) {
      if (!cs.skipHeldStart) cs.skipHeldStart = performance.now();
      if (performance.now() - cs.skipHeldStart >= 1000) {
        this.endCutscene();
        return;
      }
    } else {
      cs.skipHeldStart = 0;
    }

    // Auto-advance
    if (frame.duration > 0 && elapsed > frame.duration) {
      this.advanceCutsceneFrame();
      return;
    }

    // Spawn particles
    if (frame.particles && cs.particles.length < 60 && Math.random() < 0.3) {
      cs.particles.push(this.spawnCutsceneParticle(frame.particles));
    }
    // Update particles
    for (let i = cs.particles.length - 1; i >= 0; i--) {
      const p = cs.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.016;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) cs.particles.splice(i, 1);
    }
  }

  spawnCutsceneParticle(type) {
    const p = {
      x: Math.random(),
      y: Math.random(),
      vx: 0,
      vy: 0,
      size: 2,
      color: "#ffffff",
      alpha: 1,
      life: 2,
      maxLife: 2,
    };
    switch (type) {
      case "stars":
        p.size = 1 + Math.random() * 2;
        p.color = "#aaccff";
        p.vy = -0.0003;
        p.life = p.maxLife = 3 + Math.random() * 2;
        break;
      case "embers":
        p.x = 0.3 + Math.random() * 0.4;
        p.y = 0.8 + Math.random() * 0.2;
        p.vx = (Math.random() - 0.5) * 0.002;
        p.vy = -(0.002 + Math.random() * 0.003);
        p.size = 2 + Math.random() * 3;
        p.color = Math.random() > 0.5 ? "#ff6622" : "#ffaa00";
        p.life = p.maxLife = 1.5 + Math.random() * 1.5;
        break;
      case "sparks":
        p.x = Math.random();
        p.y = 0.3 + Math.random() * 0.4;
        p.vx = (Math.random() - 0.5) * 0.004;
        p.vy = (Math.random() - 0.5) * 0.002;
        p.size = 1 + Math.random() * 2;
        p.color = "#00ccff";
        p.life = p.maxLife = 0.8 + Math.random();
        break;
      case "glow":
        p.x = 0.45 + Math.random() * 0.1;
        p.y = 0.3 + Math.random() * 0.3;
        p.vx = (Math.random() - 0.5) * 0.001;
        p.vy = -0.001;
        p.size = 3 + Math.random() * 4;
        p.color = "#00ffcc";
        p.life = p.maxLife = 2 + Math.random() * 2;
        break;
    }
    return p;
  }

  renderCutscene(ctx, w, h) {
    if (!this.cutscene) return;
    const cs = this.cutscene;
    const frame = cs.script[cs.frame];
    if (!frame) return;

    const elapsed = performance.now() - cs.frameStart;
    const t = elapsed / 1000; // seconds

    // === Comic panel layout ===
    if (frame.panels) {
      this.renderComicPanels(ctx, w, h, frame, elapsed, t);
      return;
    }

    // === Background ===
    this.drawCutsceneBg(ctx, w, h, frame.bg, t);

    // === Flash effect ===
    if (frame.flash && elapsed < 300) {
      const flashAlpha = 0.6 * (1 - elapsed / 300);
      ctx.fillStyle = frame.flash;
      ctx.globalAlpha = flashAlpha;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    // === Shake ===
    if (frame.shake) {
      const intensity = frame.shake * Math.max(0, 1 - t / 2);
      ctx.save();
      ctx.translate(
        (Math.random() - 0.5) * intensity * 2,
        (Math.random() - 0.5) * intensity * 2,
      );
    }

    // === Particles ===
    for (const p of cs.particles) {
      ctx.globalAlpha = p.alpha * 0.8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // === Art ===
    if (frame.art) {
      this.drawCutsceneArt(ctx, w, h, frame.art, t);
    }

    // === Text (typewriter reveal) ===
    if (frame.lines) {
      const centerY = frame.art ? h * 0.72 : h * 0.4;
      let lineY = centerY;
      for (const line of frame.lines) {
        const lineElapsed = elapsed - line.delay;
        if (lineElapsed < 0) continue;

        // Typewriter
        const charsPerSec = 40;
        const visibleChars = Math.min(
          line.text.length,
          Math.floor((lineElapsed / 1000) * charsPerSec),
        );
        const displayText = line.text.substring(0, visibleChars);

        // Fade in
        const fadeIn = Math.min(1, lineElapsed / 400);

        ctx.globalAlpha = fadeIn;
        ctx.fillStyle = line.color || "#ffffff";
        ctx.font = `bold ${line.size || 16}px monospace`;
        ctx.textAlign = "center";
        ctx.fillText(displayText, w / 2, lineY);

        // Cursor blink while typing
        if (visibleChars < line.text.length) {
          const cursorAlpha = Math.floor(elapsed / 200) % 2 ? 0.8 : 0.2;
          ctx.globalAlpha = cursorAlpha;
          const textW = ctx.measureText(displayText).width;
          ctx.fillRect(
            w / 2 + textW / 2 + 4,
            lineY - (line.size || 16) + 4,
            2,
            line.size || 16,
          );
        }

        ctx.globalAlpha = 1;
        lineY += (line.size || 16) + 12;
      }
    }

    if (frame.shake) {
      ctx.restore();
    }

    // === Letterbox bars ===
    const barHeight = h * 0.08;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, barHeight);
    ctx.fillRect(0, h - barHeight, w, barHeight);

    // === Scanlines ===
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }

    // === Progress indicator ===
    const frameCount = cs.script.length;
    const dotSize = 6;
    const dotGap = 14;
    const dotsW = frameCount * dotGap;
    const dotsX = (w - dotsW) / 2;
    for (let i = 0; i < frameCount; i++) {
      ctx.fillStyle =
        i === cs.frame
          ? "#00ffcc"
          : i < cs.frame
            ? "rgba(0,200,200,0.5)"
            : "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.arc(
        dotsX + i * dotGap + dotGap / 2,
        h - barHeight / 2,
        i === cs.frame ? dotSize / 2 + 1 : dotSize / 2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    // === Skip prompt ===
    const skipAlpha = 0.3 + 0.15 * Math.sin(elapsed / 500);
    ctx.fillStyle = `rgba(255,255,255,${skipAlpha})`;
    ctx.font = "12px monospace";
    ctx.textAlign = "right";
    ctx.fillText(
      "[ENTER] continue  ·  [ESC] skip",
      w - 20,
      h - barHeight / 2 + 4,
    );

    // === Hold-to-skip progress bar ===
    if (cs.skipHeldStart > 0) {
      const holdProgress = Math.min(
        1,
        (performance.now() - cs.skipHeldStart) / 1000,
      );
      const skipBarW = 120;
      const skipBarH = 4;
      const skipBarX = w - 20 - skipBarW;
      const skipBarY = h - barHeight / 2 + 12;
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(skipBarX, skipBarY, skipBarW, skipBarH);
      ctx.fillStyle = "#00ffcc";
      ctx.fillRect(skipBarX, skipBarY, skipBarW * holdProgress, skipBarH);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "10px monospace";
      ctx.fillText("Hold SPACE to skip all...", w - 20, skipBarY + 16);
    }

    ctx.textAlign = "left";
  }

  // ── Comic Book Panel Renderer ───────────────────────────────────
  renderComicPanels(ctx, w, h, frame, elapsed, t) {
    const cs = this.cutscene;

    // Page background — vintage paper
    const paperGrad = ctx.createRadialGradient(
      w / 2,
      h / 2,
      0,
      w / 2,
      h / 2,
      w * 0.8,
    );
    paperGrad.addColorStop(0, "#12101a");
    paperGrad.addColorStop(0.7, "#0a0812");
    paperGrad.addColorStop(1, "#050408");
    ctx.fillStyle = paperGrad;
    ctx.fillRect(0, 0, w, h);

    // Constrain comic page area on very wide screens
    const maxPageW = Math.min(w, 1400);
    const maxPageH = Math.min(h, 900);
    const pageX = (w - maxPageW) / 2;
    const pageY = (h - maxPageH) / 2;

    const panels = frame.panels;
    const gutter = 8;
    const margin = 24;
    const panelDelay = 800;

    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      const panelElapsed = elapsed - i * panelDelay;
      if (panelElapsed < 0) continue;

      // Panel position (fractional coords → pixel within page bounds)
      const avW = maxPageW - margin * 2;
      const avH = maxPageH - margin * 2;
      const px = pageX + margin + panel.x * avW;
      const py = pageY + margin + panel.y * avH;
      const pw = panel.w * avW - gutter;
      const ph = panel.h * avH - gutter;

      // Slam-in animation
      const revealT = Math.min(1, panelElapsed / 350);
      const scale = 0.6 + 0.4 * (1 - Math.pow(1 - revealT, 3));
      const panelAlpha = Math.min(1, panelElapsed / 300);

      ctx.save();
      ctx.globalAlpha = panelAlpha;

      // Scale from panel center for slam effect
      const cx = px + pw / 2;
      const cy = py + ph / 2;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);

      // Clip to panel bounds
      ctx.beginPath();
      ctx.rect(px, py, pw, ph);
      ctx.clip();

      // Panel background
      ctx.save();
      ctx.translate(px, py);
      if (panel.bg) {
        this.drawCutsceneBg(ctx, pw, ph, panel.bg, t);
      } else {
        ctx.fillStyle = "#0a0a18";
        ctx.fillRect(0, 0, pw, ph);
      }
      ctx.restore();

      // Panel art (scaled proportionally to fill panel)
      if (panel.art) {
        const artT = Math.max(0, (panelElapsed - 200) / 1000);
        ctx.save();
        ctx.translate(px, py);
        // Art is designed for ~200px effective area; scale to panel dimensions
        const artScale = Math.min(pw, ph) / 200;
        const artCx = pw / 2;
        const artCy = ph * 0.38;
        ctx.translate(artCx, artCy);
        ctx.scale(artScale, artScale);
        ctx.translate(-artCx / artScale, -artCy / artScale);
        this.drawCutsceneArt(
          ctx,
          pw / artScale,
          ph / artScale,
          panel.art,
          artT,
        );
        ctx.restore();
      }

      // Speed lines (action panels)
      if (panel.action) {
        const lineAlpha = 0.12 + 0.05 * Math.sin(t * 4 + i);
        ctx.strokeStyle = `rgba(255,255,255,${lineAlpha})`;
        ctx.lineWidth = 1;
        const centerX =
          px +
          pw / 2 +
          (panel.actionDir === "left"
            ? pw * 0.3
            : panel.actionDir === "right"
              ? -pw * 0.3
              : 0);
        const centerY = py + ph * 0.4;
        for (let l = 0; l < 12; l++) {
          const ang = (l / 12) * Math.PI * 2;
          const r1 = pw * 0.15;
          const r2 = pw * 0.6 + Math.sin(l * 7 + t * 3) * pw * 0.1;
          ctx.beginPath();
          ctx.moveTo(
            centerX + Math.cos(ang) * r1,
            centerY + Math.sin(ang) * r1,
          );
          ctx.lineTo(
            centerX + Math.cos(ang) * r2,
            centerY + Math.sin(ang) * r2,
          );
          ctx.stroke();
        }
      }

      // Halftone dots (for shading feel)
      if (panel.halftone) {
        ctx.fillStyle = `rgba(0,0,0,${panel.halftone})`;
        const dotSpacing = 8;
        for (let dx = px; dx < px + pw; dx += dotSpacing) {
          for (let dy = py + ph * 0.6; dy < py + ph; dy += dotSpacing) {
            const dist = (dy - (py + ph * 0.6)) / (ph * 0.4);
            const dotR = dist * 2.5;
            if (dotR > 0.3) {
              ctx.beginPath();
              ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      ctx.restore(); // clip + slam

      // Panel border — thick ink style (outside clip)
      ctx.save();
      ctx.globalAlpha = panelAlpha;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.strokeRect(px, py, pw, ph);
      ctx.strokeStyle = "rgba(0,200,255,0.15)";
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 2, py + 2, pw - 4, ph - 4);

      // Caption box text
      if (panel.caption) {
        const captionElapsed = panelElapsed - 400;
        if (captionElapsed > 0) {
          const capFade = Math.min(1, captionElapsed / 400);
          const capBg = panel.captionBg || "rgba(0,0,0,0.85)";
          const capColor = panel.captionColor || "#ffffff";
          const capSize = panel.captionSize || 12;
          const capPos = panel.captionPos || "bottom";

          ctx.font = `bold ${capSize}px monospace`;
          const textW = ctx.measureText(panel.caption).width;
          const boxW = Math.min(pw - 12, textW + 20);
          const boxH = capSize + 14;

          let boxX = px + (pw - boxW) / 2;
          let boxY;
          if (capPos === "top") boxY = py + 6;
          else if (capPos === "center") boxY = py + (ph - boxH) / 2;
          else boxY = py + ph - boxH - 6;

          ctx.globalAlpha = panelAlpha * capFade;
          ctx.fillStyle = capBg;
          ctx.fillRect(boxX, boxY, boxW, boxH);
          ctx.strokeStyle = capColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(boxX, boxY, boxW, boxH);

          // Typewriter reveal
          const charsPerSec = 35;
          const visibleChars = Math.min(
            panel.caption.length,
            Math.floor((captionElapsed / 1000) * charsPerSec),
          );
          ctx.fillStyle = capColor;
          ctx.textAlign = "center";
          ctx.fillText(
            panel.caption.substring(0, visibleChars),
            px + pw / 2,
            boxY + capSize + 4,
          );
          ctx.textAlign = "left";
        }
      }

      // SFX text (comic style onomatopoeia)
      if (panel.sfx) {
        const sfxElapsed = panelElapsed - 150;
        if (sfxElapsed > 0) {
          const sfxScale = 0.5 + 0.5 * Math.min(1, sfxElapsed / 200);
          const sfxAlpha =
            Math.min(1, sfxElapsed / 200) *
            (1 - Math.max(0, (sfxElapsed - 2000) / 500));
          if (sfxAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = sfxAlpha;
            const sfxX = px + pw * (panel.sfxX || 0.5);
            const sfxY = py + ph * (panel.sfxY || 0.3);
            ctx.translate(sfxX, sfxY);
            ctx.scale(sfxScale, sfxScale);
            ctx.rotate(((panel.sfxRot || 0) * Math.PI) / 180);
            ctx.font = `bold ${panel.sfxSize || 28}px monospace`;
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 4;
            ctx.textAlign = "center";
            ctx.strokeText(panel.sfx, 0, 0);
            ctx.fillStyle = panel.sfxColor || "#ffcc00";
            ctx.fillText(panel.sfx, 0, 0);
            ctx.textAlign = "left";
            ctx.restore();
          }
        }
      }

      ctx.restore(); // border + scale
    }

    // === Page-level scanlines ===
    ctx.fillStyle = "rgba(0,0,0,0.04)";
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }

    // === Letterbox ===
    const barH = h * 0.04;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, barH);
    ctx.fillRect(0, h - barH, w, barH);

    // === Frame page number ===
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "italic 11px monospace";
    ctx.textAlign = "right";
    ctx.fillText(
      `${cs.frame + 1} / ${cs.script.length}`,
      w - 16,
      h - barH / 2 + 4,
    );

    // === Skip prompt ===
    const skipAlpha = 0.3 + 0.1 * Math.sin(elapsed / 500);
    ctx.fillStyle = `rgba(255,255,255,${skipAlpha})`;
    ctx.font = "12px monospace";
    ctx.fillText("[ENTER] next  ·  [ESC] skip", w - 240, barH / 2 + 4);

    // === Hold-to-skip progress bar ===
    if (cs.skipHeldStart > 0) {
      const holdProgress = Math.min(
        1,
        (performance.now() - cs.skipHeldStart) / 1000,
      );
      const skipBarW = 120;
      const skipBarBH = 4;
      const skipBarX = w - 240;
      const skipBarY = barH / 2 + 12;
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(skipBarX, skipBarY, skipBarW, skipBarBH);
      ctx.fillStyle = "#00ffcc";
      ctx.fillRect(skipBarX, skipBarY, skipBarW * holdProgress, skipBarBH);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "10px monospace";
      ctx.fillText("Hold SPACE to skip all...", w - 240, skipBarY + 16);
    }

    ctx.textAlign = "left";
  }

  drawCutsceneBg(ctx, w, h, bg, t) {
    switch (bg) {
      case "deep_space": {
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
        break;
      }
      case "station": {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#0a1020");
        grad.addColorStop(0.5, "#0d1828");
        grad.addColorStop(1, "#060c18");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // Tech grid lines
        ctx.strokeStyle = "rgba(0,100,180,0.08)";
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        break;
      }
      case "boss_lair": {
        const grad = ctx.createRadialGradient(
          w / 2,
          h / 2,
          0,
          w / 2,
          h / 2,
          w * 0.6,
        );
        grad.addColorStop(0, "#1a0520");
        grad.addColorStop(0.5, "#10031a");
        grad.addColorStop(1, "#050008");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // Pulsing energy veins
        ctx.strokeStyle = `rgba(200,30,60,${0.06 + 0.04 * Math.sin(t * 2)})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + t * 0.3;
          ctx.beginPath();
          ctx.moveTo(w / 2, h / 2);
          ctx.lineTo(
            w / 2 + Math.cos(angle) * w * 0.6,
            h / 2 + Math.sin(angle) * h * 0.6,
          );
          ctx.stroke();
        }
        break;
      }
      default: {
        ctx.fillStyle = "#020210";
        ctx.fillRect(0, 0, w, h);
      }
    }
  }

  drawCutsceneArt(ctx, w, h, art, t) {
    const cx = w / 2;
    const cy = h * 0.38;
    ctx.save();
    ctx.translate(cx, cy);

    // Base scale: make characters larger in all cutscene art
    const baseScale = 1.6;
    ctx.scale(baseScale, baseScale);

    switch (art) {
      case "hero": {
        // Armored temporal agent — adult proportions (tall torso, long legs)
        const fadeIn = Math.min(1, t / 1.2);
        const scale = 0.9 + fadeIn * 0.1;
        ctx.scale(scale, scale);
        ctx.globalAlpha = fadeIn;

        // Glow aura
        const glowGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 90);
        glowGrad.addColorStop(0, "rgba(0,255,200,0.15)");
        glowGrad.addColorStop(1, "rgba(0,255,200,0)");
        ctx.fillStyle = glowGrad;
        ctx.fillRect(-120, -120, 240, 240);

        // Cape (shoulder-length, not floor-length)
        ctx.fillStyle = "#6b1515";
        ctx.beginPath();
        ctx.moveTo(-16, -30);
        ctx.quadraticCurveTo(-26, 0, -22 + Math.sin(t * 2) * 3, 30);
        ctx.lineTo(-10 + Math.sin(t * 1.8) * 2, 28);
        ctx.quadraticCurveTo(-8, -5, -10, -30);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#7a1818";
        ctx.beginPath();
        ctx.moveTo(-10, -30);
        ctx.quadraticCurveTo(-4, 5, 0 + Math.sin(t * 2.2) * 2, 32);
        ctx.lineTo(12 + Math.sin(t * 1.9) * 2, 30);
        ctx.quadraticCurveTo(8, 0, 4, -30);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#5c1212";
        ctx.beginPath();
        ctx.moveTo(4, -30);
        ctx.quadraticCurveTo(18, -2, 20 + Math.sin(t * 2.4) * 3, 28);
        ctx.lineTo(22 + Math.sin(t * 2.1) * 2, 26);
        ctx.quadraticCurveTo(20, -6, 14, -30);
        ctx.closePath();
        ctx.fill();

        // Torso (wide, tall — adult proportions)
        ctx.fillStyle = "#2a3a4a";
        ctx.beginPath();
        ctx.moveTo(-14, -38);
        ctx.lineTo(-16, 12);
        ctx.lineTo(16, 12);
        ctx.lineTo(14, -38);
        ctx.closePath();
        ctx.fill();

        // Chest plate (broad)
        ctx.fillStyle = "#334455";
        ctx.beginPath();
        ctx.moveTo(-10, -36);
        ctx.quadraticCurveTo(0, -30, 10, -36);
        ctx.lineTo(9, -16);
        ctx.quadraticCurveTo(0, -13, -9, -16);
        ctx.closePath();
        ctx.fill();

        // Pec detail lines
        ctx.strokeStyle = "#446688";
        ctx.lineWidth = 0.6;
        ctx.globalAlpha = fadeIn * 0.4;
        ctx.beginPath();
        ctx.moveTo(-8, -30);
        ctx.quadraticCurveTo(-3, -27, 0, -30);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -30);
        ctx.quadraticCurveTo(3, -27, 8, -30);
        ctx.stroke();
        ctx.globalAlpha = fadeIn;

        // Abs detail lines
        ctx.strokeStyle = "#446688";
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = fadeIn * 0.3;
        for (let i = 0; i < 4; i++) {
          const ay = -12 + i * 5;
          ctx.beginPath();
          ctx.moveTo(-7, ay);
          ctx.lineTo(7, ay);
          ctx.stroke();
        }
        ctx.globalAlpha = fadeIn;

        // Belt
        ctx.fillStyle = "#1a1a2a";
        ctx.fillRect(-15, 8, 30, 4);
        ctx.fillStyle = "#00aacc";
        ctx.fillRect(-3, 9, 6, 2);

        // Collar
        ctx.fillStyle = "#3a4a5a";
        ctx.beginPath();
        ctx.moveTo(-14, -38);
        ctx.quadraticCurveTo(0, -34, 14, -38);
        ctx.lineTo(12, -41);
        ctx.quadraticCurveTo(0, -37, -12, -41);
        ctx.closePath();
        ctx.fill();

        // Shoulder pauldrons (large, curved)
        ctx.fillStyle = "#3a4a5a";
        ctx.beginPath();
        ctx.arc(-18, -36, 10, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(18, -36, 10, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = "#556688";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(-18, -36, 10, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(18, -36, 10, Math.PI, 0);
        ctx.stroke();

        // Neck
        ctx.fillStyle = "#1a2a3a";
        ctx.fillRect(-5, -46, 10, 8);

        // Helmet (shaped, not just a circle)
        ctx.fillStyle = "#1a2a3a";
        ctx.beginPath();
        ctx.moveTo(-10, -48);
        ctx.quadraticCurveTo(-13, -56, -10, -64);
        ctx.quadraticCurveTo(0, -69, 10, -64);
        ctx.quadraticCurveTo(13, -56, 10, -48);
        ctx.quadraticCurveTo(0, -45, -10, -48);
        ctx.closePath();
        ctx.fill();

        // Helmet ridge
        ctx.strokeStyle = "#334466";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-5, -66);
        ctx.quadraticCurveTo(0, -70, 5, -66);
        ctx.stroke();

        // Visor (curved, glowing)
        ctx.fillStyle = "#00aadd";
        ctx.shadowColor = "#00ffcc";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(-8, -57);
        ctx.quadraticCurveTo(-10, -53, -7, -50);
        ctx.quadraticCurveTo(0, -48, 7, -50);
        ctx.quadraticCurveTo(10, -53, 8, -57);
        ctx.quadraticCurveTo(0, -59, -8, -57);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#00ddff";
        ctx.globalAlpha = fadeIn * 0.3;
        ctx.beginPath();
        ctx.moveTo(-6, -56);
        ctx.quadraticCurveTo(0, -58, 6, -56);
        ctx.quadraticCurveTo(4, -53, 0, -52);
        ctx.quadraticCurveTo(-4, -53, -6, -56);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = fadeIn;
        ctx.shadowBlur = 0;

        // Upper arms
        ctx.fillStyle = "#1a2a3a";
        ctx.beginPath();
        ctx.moveTo(-18, -30);
        ctx.quadraticCurveTo(-22, -18, -20, -6);
        ctx.lineTo(-15, -6);
        ctx.quadraticCurveTo(-14, -18, -14, -30);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(18, -30);
        ctx.quadraticCurveTo(22, -18, 20, -6);
        ctx.lineTo(15, -6);
        ctx.quadraticCurveTo(14, -18, 14, -30);
        ctx.closePath();
        ctx.fill();

        // Forearms
        ctx.fillStyle = "#1a2a3a";
        ctx.fillRect(-21, -6, 6, 16);
        ctx.fillRect(15, -6, 6, 16);
        ctx.fillStyle = "#243d50";
        ctx.fillRect(-20, 0, 4, 5);
        ctx.fillRect(16, 0, 4, 5);

        // Fists
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.arc(-18, 12, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(18, 12, 3, 0, Math.PI * 2);
        ctx.fill();

        // Legs (long — adult proportions)
        ctx.fillStyle = "#1a2a3a";
        ctx.fillRect(-11, 12, 9, 32);
        ctx.fillRect(2, 12, 9, 32);
        // Knee detail
        ctx.fillStyle = "#243d50";
        ctx.fillRect(-10, 24, 7, 4);
        ctx.fillRect(3, 24, 7, 4);
        // Shin armor stripe
        ctx.fillStyle = "#2a4055";
        ctx.fillRect(-9, 32, 5, 6);
        ctx.fillRect(4, 32, 5, 6);

        // Boots
        ctx.fillStyle = "#111a22";
        ctx.fillRect(-12, 42, 10, 6);
        ctx.fillRect(2, 42, 10, 6);

        ctx.globalAlpha = 1;
        break;
      }

      case "hero_armed": {
        // Armed temporal agent — adult proportions, rifle in hand
        const fadeIn = Math.min(1, t / 0.8);
        ctx.globalAlpha = fadeIn;

        // Glow
        const glowGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 90);
        glowGrad.addColorStop(0, "rgba(0,255,200,0.2)");
        glowGrad.addColorStop(1, "rgba(0,255,200,0)");
        ctx.fillStyle = glowGrad;
        ctx.fillRect(-120, -120, 240, 240);

        // Cape (shoulder-length, dramatic flow)
        ctx.fillStyle = "#8b1a1a";
        ctx.beginPath();
        ctx.moveTo(-16, -30);
        ctx.quadraticCurveTo(-30, 2, -26 + Math.sin(t * 2.5) * 4, 34);
        ctx.lineTo(-12 + Math.sin(t * 2) * 2, 32);
        ctx.quadraticCurveTo(-10, -3, -10, -30);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#9a1e1e";
        ctx.beginPath();
        ctx.moveTo(-10, -30);
        ctx.quadraticCurveTo(-2, 6, 2 + Math.sin(t * 2.3) * 3, 36);
        ctx.lineTo(14 + Math.sin(t * 2.1) * 2, 34);
        ctx.quadraticCurveTo(10, 2, 4, -30);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#6b1515";
        ctx.beginPath();
        ctx.moveTo(4, -30);
        ctx.quadraticCurveTo(20, 0, 24 + Math.sin(t * 2.6) * 4, 32);
        ctx.lineTo(26 + Math.sin(t * 2.2) * 2, 30);
        ctx.quadraticCurveTo(22, -4, 14, -30);
        ctx.closePath();
        ctx.fill();

        // Torso (wide, tall)
        ctx.fillStyle = "#2a3a4a";
        ctx.beginPath();
        ctx.moveTo(-14, -38);
        ctx.lineTo(-16, 12);
        ctx.lineTo(16, 12);
        ctx.lineTo(14, -38);
        ctx.closePath();
        ctx.fill();

        // Chest plate
        ctx.fillStyle = "#334455";
        ctx.beginPath();
        ctx.moveTo(-10, -36);
        ctx.quadraticCurveTo(0, -30, 10, -36);
        ctx.lineTo(9, -16);
        ctx.quadraticCurveTo(0, -13, -9, -16);
        ctx.closePath();
        ctx.fill();

        // Belt
        ctx.fillStyle = "#1a1a2a";
        ctx.fillRect(-15, 8, 30, 4);
        ctx.fillStyle = "#00aacc";
        ctx.fillRect(-3, 9, 6, 2);

        // Collar
        ctx.fillStyle = "#3a4a5a";
        ctx.beginPath();
        ctx.moveTo(-14, -38);
        ctx.quadraticCurveTo(0, -34, 14, -38);
        ctx.lineTo(12, -41);
        ctx.quadraticCurveTo(0, -37, -12, -41);
        ctx.closePath();
        ctx.fill();

        // Pauldrons
        ctx.fillStyle = "#3a4a5a";
        ctx.beginPath();
        ctx.arc(-18, -36, 10, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(18, -36, 10, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = "#556688";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(-18, -36, 10, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(18, -36, 10, Math.PI, 0);
        ctx.stroke();

        // Neck
        ctx.fillStyle = "#1a2a3a";
        ctx.fillRect(-5, -46, 10, 8);

        // Helmet
        ctx.fillStyle = "#1a2a3a";
        ctx.beginPath();
        ctx.moveTo(-10, -48);
        ctx.quadraticCurveTo(-13, -56, -10, -64);
        ctx.quadraticCurveTo(0, -69, 10, -64);
        ctx.quadraticCurveTo(13, -56, 10, -48);
        ctx.quadraticCurveTo(0, -45, -10, -48);
        ctx.closePath();
        ctx.fill();

        // Helmet ridge
        ctx.strokeStyle = "#334466";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-5, -66);
        ctx.quadraticCurveTo(0, -70, 5, -66);
        ctx.stroke();

        // Visor
        ctx.fillStyle = "#00aadd";
        ctx.shadowColor = "#00ffcc";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(-8, -57);
        ctx.quadraticCurveTo(-10, -53, -7, -50);
        ctx.quadraticCurveTo(0, -48, 7, -50);
        ctx.quadraticCurveTo(10, -53, 8, -57);
        ctx.quadraticCurveTo(0, -59, -8, -57);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        // Left arm (at side)
        ctx.fillStyle = "#1a2a3a";
        ctx.beginPath();
        ctx.moveTo(-18, -30);
        ctx.quadraticCurveTo(-22, -18, -20, -6);
        ctx.lineTo(-15, -6);
        ctx.quadraticCurveTo(-14, -18, -14, -30);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(-21, -6, 6, 16);
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.arc(-18, 12, 3, 0, Math.PI * 2);
        ctx.fill();

        // Right arm + Rifle (held forward)
        ctx.fillStyle = "#1a2a3a";
        ctx.save();
        ctx.translate(18, -30);
        ctx.rotate(-0.3);
        // Upper arm
        ctx.fillRect(-3, 0, 7, 18);
        // Forearm + hand
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.arc(0.5, 20, 3, 0, Math.PI * 2);
        ctx.fill();
        // Rifle
        ctx.fillStyle = "#2a2a2a";
        ctx.fillRect(-2, 17, 36, 6);
        // Barrel
        ctx.fillStyle = "#3a3a3a";
        ctx.fillRect(30, 18, 12, 4);
        // Magazine
        ctx.fillStyle = "#1a3a4a";
        ctx.fillRect(8, 23, 6, 10);
        // Muzzle glow
        ctx.fillStyle = "#00ccff";
        ctx.shadowColor = "#00ccff";
        ctx.shadowBlur = 10;
        ctx.fillRect(40, 18.5, 4, 3);
        ctx.shadowBlur = 0;
        // Rail
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(2, 16, 28, 2);
        ctx.restore();

        // Legs (long)
        ctx.fillStyle = "#1a2a3a";
        ctx.fillRect(-11, 12, 9, 32);
        ctx.fillRect(2, 12, 9, 32);
        ctx.fillStyle = "#243d50";
        ctx.fillRect(-10, 24, 7, 4);
        ctx.fillRect(3, 24, 7, 4);

        // Boots
        ctx.fillStyle = "#111a22";
        ctx.fillRect(-12, 42, 10, 6);
        ctx.fillRect(2, 42, 10, 6);

        ctx.globalAlpha = 1;
        break;
      }

      case "hero_human": {
        // Unarmored agent in casual work clothes — adult male proportions
        const fadeIn = Math.min(1, t / 1.0);
        ctx.globalAlpha = fadeIn;

        // Hair (short, dark)
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.moveTo(-9, -62);
        ctx.quadraticCurveTo(-12, -68, -8, -72);
        ctx.quadraticCurveTo(0, -76, 8, -72);
        ctx.quadraticCurveTo(12, -68, 9, -62);
        ctx.closePath();
        ctx.fill();

        // Head (skin tone)
        ctx.fillStyle = "#c8956c";
        ctx.beginPath();
        ctx.moveTo(-8, -48);
        ctx.quadraticCurveTo(-10, -56, -8, -64);
        ctx.quadraticCurveTo(0, -68, 8, -64);
        ctx.quadraticCurveTo(10, -56, 8, -48);
        ctx.quadraticCurveTo(0, -45, -8, -48);
        ctx.closePath();
        ctx.fill();

        // Eyes
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-5, -58, 4, 3);
        ctx.fillRect(1, -58, 4, 3);
        ctx.fillStyle = "#2a4a3a";
        ctx.fillRect(-4, -57, 2, 2);
        ctx.fillRect(2, -57, 2, 2);

        // Eyebrows
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-6, -60);
        ctx.lineTo(-1, -61);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(1, -61);
        ctx.lineTo(6, -60);
        ctx.stroke();

        // Mouth
        ctx.strokeStyle = "#8a6050";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-3, -50);
        ctx.quadraticCurveTo(0, -49, 3, -50);
        ctx.stroke();

        // Neck
        ctx.fillStyle = "#c8956c";
        ctx.fillRect(-4, -48, 8, 8);

        // Jacket/shirt (casual work — dark grey jacket, white shirt)
        ctx.fillStyle = "#3a3a44";
        ctx.beginPath();
        ctx.moveTo(-14, -40);
        ctx.lineTo(-16, 12);
        ctx.lineTo(16, 12);
        ctx.lineTo(14, -40);
        ctx.closePath();
        ctx.fill();

        // Shirt collar (white V-neck visible)
        ctx.fillStyle = "#d8d8d8";
        ctx.beginPath();
        ctx.moveTo(-5, -40);
        ctx.lineTo(0, -32);
        ctx.lineTo(5, -40);
        ctx.closePath();
        ctx.fill();

        // Jacket lapels
        ctx.strokeStyle = "#2a2a30";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-6, -40);
        ctx.lineTo(-8, -20);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(6, -40);
        ctx.lineTo(8, -20);
        ctx.stroke();

        // ID badge clipped to pocket
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-12, -18, 6, 8);
        ctx.fillStyle = "#0066aa";
        ctx.fillRect(-11, -16, 4, 4);
        // Badge lanyard
        ctx.strokeStyle = "#0066aa";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-9, -18);
        ctx.quadraticCurveTo(-6, -30, -4, -40);
        ctx.stroke();

        // Belt
        ctx.fillStyle = "#2a2020";
        ctx.fillRect(-15, 8, 30, 4);
        ctx.fillStyle = "#888888";
        ctx.fillRect(-2, 9, 4, 2);

        // Arms (jacket sleeves)
        ctx.fillStyle = "#3a3a44";
        ctx.beginPath();
        ctx.moveTo(-14, -36);
        ctx.quadraticCurveTo(-20, -20, -18, -4);
        ctx.lineTo(-13, -4);
        ctx.quadraticCurveTo(-12, -20, -10, -36);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(14, -36);
        ctx.quadraticCurveTo(20, -20, 18, -4);
        ctx.lineTo(13, -4);
        ctx.quadraticCurveTo(12, -20, 10, -36);
        ctx.closePath();
        ctx.fill();

        // Hands (skin)
        ctx.fillStyle = "#c8956c";
        ctx.beginPath();
        ctx.arc(-15.5, -2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(15.5, -2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Pants (dark slacks)
        ctx.fillStyle = "#2a2a33";
        ctx.fillRect(-11, 12, 9, 32);
        ctx.fillRect(2, 12, 9, 32);

        // Shoes
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(-12, 42, 10, 5);
        ctx.fillRect(2, 42, 10, 5);

        ctx.globalAlpha = 1;
        break;
      }

      case "hero_at_desk": {
        // Hero standing at front desk, secretary ignoring him
        const fadeIn = Math.min(1, t / 1.0);
        ctx.globalAlpha = fadeIn;

        // --- Front desk counter ---
        ctx.fillStyle = "#3a3022";
        ctx.fillRect(-60, 5, 120, 8);
        // Desk front panel
        ctx.fillStyle = "#2a2418";
        ctx.fillRect(-60, 13, 120, 35);
        // Desk edge highlight
        ctx.strokeStyle = "#4a4030";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-60, 5);
        ctx.lineTo(60, 5);
        ctx.stroke();

        // --- Secretary (right side, behind desk, looking at monitor) ---
        ctx.save();
        ctx.translate(28, 0);

        // Monitor
        ctx.fillStyle = "#111111";
        ctx.fillRect(10, -22, 20, 16);
        ctx.fillStyle = "#2244aa";
        ctx.fillRect(11, -21, 18, 14);
        // Screen glare
        ctx.fillStyle = "rgba(100,150,255,0.15)";
        ctx.fillRect(12, -20, 8, 6);
        // Monitor stand
        ctx.fillStyle = "#222222";
        ctx.fillRect(18, -6, 4, 6);

        // Hair (long, flowing — she's not looking at hero, facing her screen)
        ctx.fillStyle = "#2a1508";
        ctx.beginPath();
        ctx.moveTo(-6, -52);
        ctx.quadraticCurveTo(-10, -46, -10, -38);
        ctx.quadraticCurveTo(-12, -20, -10, -10);
        ctx.lineTo(-6, -10);
        ctx.quadraticCurveTo(-6, -30, -4, -42);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(6, -52);
        ctx.quadraticCurveTo(10, -46, 10, -38);
        ctx.quadraticCurveTo(12, -20, 10, -10);
        ctx.lineTo(6, -10);
        ctx.quadraticCurveTo(6, -30, 4, -42);
        ctx.closePath();
        ctx.fill();

        // Face (turned toward monitor — 3/4 view)
        ctx.fillStyle = "#dba882";
        ctx.beginPath();
        ctx.moveTo(-6, -42);
        ctx.quadraticCurveTo(-8, -48, -6, -54);
        ctx.quadraticCurveTo(2, -58, 8, -54);
        ctx.quadraticCurveTo(10, -48, 8, -42);
        ctx.quadraticCurveTo(2, -39, -6, -42);
        ctx.closePath();
        ctx.fill();

        // Eye (one visible — looking at screen, NOT at hero)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(2, -50, 4, 2.5);
        ctx.fillStyle = "#3a2a1a";
        ctx.fillRect(4, -49.5, 1.5, 1.5);

        // Eyelash
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(1, -50.5);
        ctx.lineTo(7, -51.5);
        ctx.stroke();

        // Lips
        ctx.fillStyle = "#cc6666";
        ctx.beginPath();
        ctx.moveTo(0, -43);
        ctx.quadraticCurveTo(3, -41.5, 6, -43);
        ctx.quadraticCurveTo(3, -42, 0, -43);
        ctx.closePath();
        ctx.fill();

        // Blouse (professional, teal)
        ctx.fillStyle = "#2a7a7a";
        ctx.beginPath();
        ctx.moveTo(-8, -36);
        ctx.lineTo(-10, 4);
        ctx.lineTo(10, 4);
        ctx.lineTo(8, -36);
        ctx.closePath();
        ctx.fill();

        // Necklace
        ctx.strokeStyle = "#ccaa44";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(-4, -36);
        ctx.quadraticCurveTo(1, -32, 4, -36);
        ctx.stroke();
        ctx.fillStyle = "#ccaa44";
        ctx.beginPath();
        ctx.arc(1, -33, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Arm (on desk, typing — visible above counter)
        ctx.fillStyle = "#dba882";
        ctx.fillRect(8, -6, 10, 3);
        // Hand on keyboard area
        ctx.beginPath();
        ctx.arc(19, -4, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // --- Hero (left side, standing at counter, facing desk) ---
        ctx.save();
        ctx.translate(-30, 0);

        // Head (3/4 view facing right toward desk)
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.moveTo(-7, -56);
        ctx.quadraticCurveTo(-10, -62, -7, -66);
        ctx.quadraticCurveTo(0, -69, 7, -66);
        ctx.quadraticCurveTo(10, -62, 7, -56);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#c8956c";
        ctx.beginPath();
        ctx.moveTo(-7, -44);
        ctx.quadraticCurveTo(-9, -52, -7, -58);
        ctx.quadraticCurveTo(0, -61, 7, -58);
        ctx.quadraticCurveTo(9, -52, 7, -44);
        ctx.quadraticCurveTo(0, -41, -7, -44);
        ctx.closePath();
        ctx.fill();
        // Eye (looking toward desk/secretary)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(2, -52, 3.5, 2.5);
        ctx.fillStyle = "#2a4a3a";
        ctx.fillRect(4, -51.5, 1.5, 1.5);

        // Neck
        ctx.fillStyle = "#c8956c";
        ctx.fillRect(-3, -44, 6, 6);

        // Jacket
        ctx.fillStyle = "#3a3a44";
        ctx.beginPath();
        ctx.moveTo(-12, -38);
        ctx.lineTo(-14, 12);
        ctx.lineTo(14, 12);
        ctx.lineTo(12, -38);
        ctx.closePath();
        ctx.fill();

        // Badge on chest
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(5, -26, 5, 7);
        ctx.fillStyle = "#0066aa";
        ctx.fillRect(6, -24, 3, 3);

        // Arm resting on counter
        ctx.fillStyle = "#3a3a44";
        ctx.beginPath();
        ctx.moveTo(12, -34);
        ctx.quadraticCurveTo(18, -20, 16, -2);
        ctx.lineTo(11, -2);
        ctx.quadraticCurveTo(10, -18, 8, -34);
        ctx.closePath();
        ctx.fill();
        // Hand on counter
        ctx.fillStyle = "#c8956c";
        ctx.beginPath();
        ctx.arc(14, -1, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Other arm at side
        ctx.fillStyle = "#3a3a44";
        ctx.beginPath();
        ctx.moveTo(-12, -34);
        ctx.quadraticCurveTo(-18, -18, -16, 0);
        ctx.lineTo(-11, 0);
        ctx.quadraticCurveTo(-10, -18, -8, -34);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#c8956c";
        ctx.beginPath();
        ctx.arc(-13.5, 2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Belt
        ctx.fillStyle = "#2a2020";
        ctx.fillRect(-13, 8, 26, 3);

        // Pants
        ctx.fillStyle = "#2a2a33";
        ctx.fillRect(-9, 12, 8, 28);
        ctx.fillRect(1, 12, 8, 28);

        // Shoes
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(-10, 38, 9, 5);
        ctx.fillRect(1, 38, 9, 5);

        ctx.restore();

        ctx.globalAlpha = 1;
        break;
      }

      case "villain": {
        const fadeIn = Math.min(1, t / 1.5);
        const breathe = 1 + Math.sin(t * 1.5) * 0.02;
        ctx.scale(breathe * 1.15, breathe * 1.15); // Bulkier scale
        ctx.globalAlpha = fadeIn;

        // Dark aura (larger)
        const auraGrad = ctx.createRadialGradient(0, 0, 25, 0, 0, 120);
        auraGrad.addColorStop(0, "rgba(200,30,60,0.2)");
        auraGrad.addColorStop(0.5, "rgba(150,0,40,0.1)");
        auraGrad.addColorStop(1, "rgba(100,0,30,0)");
        ctx.fillStyle = auraGrad;
        ctx.fillRect(-140, -140, 280, 280);

        // Ambient energy wisps
        for (let i = 0; i < 3; i++) {
          const angle = t * (1.5 + i * 0.4) + (i * Math.PI * 2) / 3;
          ctx.strokeStyle = `rgba(255,34,68,${0.15 + Math.sin(t * 3 + i) * 0.1})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, -10, 60 + i * 12, angle, angle + 0.6);
          ctx.stroke();
        }

        // Robes (wider, heavier)
        ctx.fillStyle = "#1a0520";
        ctx.beginPath();
        ctx.moveTo(-25, -15);
        ctx.quadraticCurveTo(-38, 20, -35 + Math.sin(t * 1.6) * 3, 65);
        ctx.lineTo(35 + Math.sin(t * 1.9) * 3, 65);
        ctx.quadraticCurveTo(38, 20, 25, -15);
        ctx.closePath();
        ctx.fill();

        // Armored torso (wider, plated)
        ctx.fillStyle = "#2a1030";
        ctx.beginPath();
        ctx.moveTo(-16, -32);
        ctx.lineTo(-18, 0);
        ctx.lineTo(18, 0);
        ctx.lineTo(16, -32);
        ctx.closePath();
        ctx.fill();

        // Chest plate detail
        ctx.fillStyle = "#3a1545";
        ctx.beginPath();
        ctx.moveTo(-10, -28);
        ctx.quadraticCurveTo(0, -24, 10, -28);
        ctx.lineTo(8, -12);
        ctx.quadraticCurveTo(0, -10, -8, -12);
        ctx.closePath();
        ctx.fill();

        // Chest core (pulsing)
        const corePulse = 0.4 + Math.sin(t * 2.5) * 0.4;
        ctx.fillStyle = `rgba(255,34,68,${corePulse * 0.5})`;
        ctx.shadowColor = "#ff2244";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, -20, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Massive pauldrons (spiked)
        ctx.fillStyle = "#3a1040";
        ctx.beginPath();
        ctx.moveTo(-24, -32);
        ctx.quadraticCurveTo(-28, -42, -20, -38);
        ctx.lineTo(-10, -28);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(24, -32);
        ctx.quadraticCurveTo(28, -42, 20, -38);
        ctx.lineTo(10, -28);
        ctx.closePath();
        ctx.fill();
        // Pauldron edge glow
        ctx.strokeStyle = "#ff224440";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-24, -32);
        ctx.quadraticCurveTo(-28, -42, -20, -38);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(24, -32);
        ctx.quadraticCurveTo(28, -42, 20, -38);
        ctx.stroke();

        // Arms (thick, armored)
        ctx.fillStyle = "#1a0520";
        ctx.fillRect(-26, -26, 8, 24);
        ctx.fillRect(18, -26, 8, 24);
        // Arm armor bands
        ctx.fillStyle = "#3a1040";
        ctx.fillRect(-25, -20, 6, 4);
        ctx.fillRect(19, -20, 6, 4);
        ctx.fillRect(-25, -10, 6, 4);
        ctx.fillRect(19, -10, 6, 4);

        // Fists (gauntlets)
        ctx.fillStyle = "#2a0830";
        ctx.beginPath();
        ctx.arc(-22, 1, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(22, 1, 4, 0, Math.PI * 2);
        ctx.fill();

        // Head/Hood (larger, more imposing)
        ctx.fillStyle = "#0d0315";
        ctx.beginPath();
        ctx.moveTo(-12, -34);
        ctx.quadraticCurveTo(-14, -48, -10, -52);
        ctx.quadraticCurveTo(0, -56, 10, -52);
        ctx.quadraticCurveTo(14, -48, 12, -34);
        ctx.quadraticCurveTo(0, -30, -12, -34);
        ctx.closePath();
        ctx.fill();

        // Hood ridges
        ctx.strokeStyle = "#1a0828";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-10, -50);
        ctx.quadraticCurveTo(0, -55, 10, -50);
        ctx.stroke();

        // Three eyes (pulsing, brighter)
        const eyeGlow = 0.7 + Math.sin(t * 3) * 0.3;
        ctx.fillStyle = `rgba(255,34,68,${eyeGlow})`;
        ctx.shadowColor = "#ff2244";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(-6, -42, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(6, -42, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, -47, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Legs (visible under robes)
        ctx.fillStyle = "#150418";
        ctx.fillRect(-10, 0, 8, 20);
        ctx.fillRect(2, 0, 8, 20);

        ctx.globalAlpha = 1;
        break;
      }

      case "villain_form2": {
        // Paradox Lord — Evolved Form: larger, more defined, crackling energy
        const fadeIn = Math.min(1, t / 1.2);
        const breathe = 1 + Math.sin(t * 2) * 0.03;
        ctx.scale(breathe * 1.3, breathe * 1.3);
        ctx.globalAlpha = fadeIn;

        // Intense aura
        const auraGrad = ctx.createRadialGradient(0, 0, 25, 0, 0, 120);
        auraGrad.addColorStop(0, "rgba(255,0,100,0.2)");
        auraGrad.addColorStop(0.6, "rgba(200,0,60,0.1)");
        auraGrad.addColorStop(1, "rgba(100,0,30,0)");
        ctx.fillStyle = auraGrad;
        ctx.fillRect(-140, -140, 280, 280);

        // Energy crackling arcs
        for (let i = 0; i < 4; i++) {
          const angle = t * (2 + i * 0.5) + (i * Math.PI) / 2;
          ctx.strokeStyle = `rgba(255,0,100,${0.3 + Math.sin(t * 4 + i) * 0.2})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, -10, 55 + i * 10, angle, angle + 0.8);
          ctx.stroke();
        }

        // Robes (larger, more flowing)
        ctx.fillStyle = "#200830";
        ctx.beginPath();
        ctx.moveTo(-25, -15);
        ctx.quadraticCurveTo(-35, 20, -32 + Math.sin(t * 1.8) * 3, 65);
        ctx.lineTo(32 + Math.sin(t * 2.1) * 3, 65);
        ctx.quadraticCurveTo(35, 20, 25, -15);
        ctx.closePath();
        ctx.fill();

        // Armored torso (evolved plates)
        ctx.fillStyle = "#3a1045";
        ctx.fillRect(-15, -32, 30, 34);
        // Chest core (pulsing brighter)
        const corePulse = 0.5 + Math.sin(t * 3) * 0.5;
        ctx.fillStyle = `rgba(255,0,100,${corePulse * 0.6})`;
        ctx.shadowColor = "#ff0066";
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, -18, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Larger pauldrons with spikes
        ctx.fillStyle = "#4a1555";
        ctx.beginPath();
        ctx.arc(-20, -28, 10, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(20, -28, 10, Math.PI, 0);
        ctx.fill();
        // Spikes
        ctx.fillStyle = "#660038";
        ctx.beginPath();
        ctx.moveTo(-20, -38);
        ctx.lineTo(-24, -52);
        ctx.lineTo(-16, -38);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(20, -38);
        ctx.lineTo(24, -52);
        ctx.lineTo(16, -38);
        ctx.closePath();
        ctx.fill();

        // Head/Hood (horned)
        ctx.fillStyle = "#0d0315";
        ctx.beginPath();
        ctx.arc(0, -42, 13, 0, Math.PI * 2);
        ctx.fill();
        // Horns
        ctx.fillStyle = "#440022";
        ctx.beginPath();
        ctx.moveTo(-10, -50);
        ctx.lineTo(-16, -68);
        ctx.lineTo(-6, -52);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(10, -50);
        ctx.lineTo(16, -68);
        ctx.lineTo(6, -52);
        ctx.closePath();
        ctx.fill();

        // Four eyes (evolved)
        const eye2Glow = 0.6 + Math.sin(t * 4) * 0.4;
        ctx.fillStyle = `rgba(255,0,68,${eye2Glow})`;
        ctx.shadowColor = "#ff0044";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(-6, -44, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(6, -44, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-3, -48, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(3, -48, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.globalAlpha = 1;
        break;
      }

      case "villain_final": {
        // Paradox Lord — FINAL FORM: terrifying, cosmic, reality-bending
        const fadeIn = Math.min(1, t / 1.5);
        const breathe = 1 + Math.sin(t * 1.5) * 0.04;
        ctx.scale(breathe * 1.6, breathe * 1.6);
        ctx.globalAlpha = fadeIn;

        // Reality distortion rings
        for (let ring = 0; ring < 3; ring++) {
          const r = 70 + ring * 20;
          const ringAlpha = 0.12 + Math.sin(t * 2 + ring) * 0.06;
          ctx.strokeStyle = `rgba(255,0,68,${ringAlpha})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(
            0,
            -10,
            r,
            t * (0.5 + ring * 0.2),
            t * (0.5 + ring * 0.2) + Math.PI,
          );
          ctx.stroke();
        }

        // Cosmic aura
        const cosmicGrad = ctx.createRadialGradient(0, -10, 15, 0, -10, 100);
        cosmicGrad.addColorStop(0, "rgba(255,0,50,0.25)");
        cosmicGrad.addColorStop(0.4, "rgba(180,0,60,0.12)");
        cosmicGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = cosmicGrad;
        ctx.fillRect(-120, -120, 240, 240);

        // Temporal body (no longer robes — pure energy form)
        ctx.fillStyle = "#1a0520";
        ctx.beginPath();
        ctx.moveTo(-22, -20);
        ctx.quadraticCurveTo(-30, 15, -25 + Math.sin(t * 2) * 4, 55);
        ctx.lineTo(25 + Math.sin(t * 2.3) * 4, 55);
        ctx.quadraticCurveTo(30, 15, 22, -20);
        ctx.closePath();
        ctx.fill();
        // Energy veins
        ctx.strokeStyle = `rgba(255,0,100,${0.3 + Math.sin(t * 3) * 0.2})`;
        ctx.lineWidth = 1;
        for (let v = 0; v < 5; v++) {
          const vx = -15 + v * 7;
          ctx.beginPath();
          ctx.moveTo(vx, -18);
          ctx.quadraticCurveTo(vx + Math.sin(t * 2 + v) * 3, 15, vx, 50);
          ctx.stroke();
        }

        // Core (massive, aggressive)
        const finalCorePulse = 0.4 + Math.sin(t * 4) * 0.6;
        ctx.fillStyle = `rgba(255,0,50,${finalCorePulse * 0.5})`;
        ctx.shadowColor = "#ff0033";
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(0, -10, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,100,150,${finalCorePulse * 0.8})`;
        ctx.beginPath();
        ctx.arc(0, -10, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Crown of temporal shards
        ctx.fillStyle = "#880044";
        for (let s = 0; s < 7; s++) {
          const sAngle = -Math.PI / 2 + (s - 3) * 0.35;
          const sLen = 18 + Math.sin(t * 3 + s * 1.5) * 4;
          ctx.beginPath();
          ctx.moveTo(Math.cos(sAngle) * 12, -42 + Math.sin(sAngle) * 12);
          ctx.lineTo(Math.cos(sAngle) * sLen, -42 + Math.sin(sAngle) * sLen);
          ctx.lineTo(
            Math.cos(sAngle + 0.1) * 10,
            -42 + Math.sin(sAngle + 0.1) * 10,
          );
          ctx.closePath();
          ctx.fill();
        }

        // Head (angular, crown-like)
        ctx.fillStyle = "#0d0315";
        ctx.beginPath();
        ctx.moveTo(-12, -35);
        ctx.lineTo(-14, -50);
        ctx.lineTo(0, -55);
        ctx.lineTo(14, -50);
        ctx.lineTo(12, -35);
        ctx.closePath();
        ctx.fill();

        // Six eyes (final form — the all-seeing)
        const eyeFGlow = 0.5 + Math.sin(t * 5) * 0.5;
        ctx.fillStyle = `rgba(255,0,40,${eyeFGlow})`;
        ctx.shadowColor = "#ff0022";
        ctx.shadowBlur = 15;
        const eyePositions = [
          [-7, -44, 2],
          [-2, -48, 1.5],
          [2, -48, 1.5],
          [7, -44, 2],
          [-4, -41, 1.3],
          [4, -41, 1.3],
        ];
        for (const [ex, ey, er] of eyePositions) {
          ctx.beginPath();
          ctx.arc(ex, ey, er, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;

        ctx.globalAlpha = 1;
        break;
      }

      case "hero_fallen": {
        // Hero defeated — lying on the ground
        const fadeIn = Math.min(1, t / 1.5);
        ctx.globalAlpha = fadeIn;

        // Dim glow (fading)
        const dimGrad = ctx.createRadialGradient(0, 15, 5, 0, 15, 50);
        dimGrad.addColorStop(0, "rgba(0,100,80,0.08)");
        dimGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = dimGrad;
        ctx.fillRect(-60, -30, 120, 90);

        // Body (lying horizontal)
        ctx.save();
        ctx.translate(0, 20);
        ctx.rotate(Math.PI / 2.2);

        // Cape (crumpled)
        ctx.fillStyle = "#4a1010";
        ctx.fillRect(-12, -5, 24, 35);

        // Body
        ctx.fillStyle = "#1a2a3a";
        ctx.fillRect(-8, -25, 16, 30);

        // Helmet (cracked — visor flickering)
        ctx.fillStyle = "#1a2a3a";
        ctx.beginPath();
        ctx.arc(0, -32, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(0,255,200,${0.2 + Math.sin(t * 8) * 0.15})`;
        ctx.fillRect(-5, -34, 10, 2);

        // Crack lines on armor
        ctx.strokeStyle = "rgba(255,100,50,0.4)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-3, -20);
        ctx.lineTo(2, -10);
        ctx.lineTo(-1, 0);
        ctx.stroke();

        ctx.restore();

        ctx.globalAlpha = 1;
        break;
      }

      case "party": {
        // The five-person squad — silhouettes with class identifiers
        const fadeIn = Math.min(1, t / 1.2);
        ctx.globalAlpha = fadeIn;

        // Group glow
        const partyGrad = ctx.createRadialGradient(0, 0, 20, 0, 0, 130);
        partyGrad.addColorStop(0, "rgba(0,200,255,0.1)");
        partyGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = partyGrad;
        ctx.fillRect(-140, -80, 280, 160);

        const members = [
          { x: -56, color: "#4488ff", visor: "#4488ff", label: "KAEL" }, // Vanguard
          { x: -28, color: "#ffaa44", visor: "#ffaa44", label: "LYRA" }, // Chrono-Analyst
          { x: 0, color: "#00ffcc", visor: "#00ffcc", label: "YOU" }, // Agent
          { x: 28, color: "#ff4488", visor: "#ff4488", label: "NOVA" }, // Striker
          { x: 56, color: "#44ff88", visor: "#44ff88", label: "ROOK" }, // Engineer
        ];

        for (const m of members) {
          ctx.save();
          ctx.translate(m.x, 0);

          // Cape (small)
          ctx.fillStyle =
            m.label === "YOU"
              ? "#6b1515"
              : m.label === "LYRA"
                ? "#3a2a10"
                : "#1a2a3a";
          ctx.beginPath();
          ctx.moveTo(-6, -12);
          ctx.quadraticCurveTo(-9, 8, -8 + Math.sin(t * 2 + m.x) * 1.5, 28);
          ctx.lineTo(8 + Math.sin(t * 2.3 + m.x) * 1, 27);
          ctx.quadraticCurveTo(9, 8, 6, -12);
          ctx.closePath();
          ctx.fill();

          // Body
          ctx.fillStyle = "#2a3a4a";
          ctx.fillRect(-6, -22, 12, 22);

          // Helmet
          ctx.fillStyle = "#1a2a3a";
          ctx.beginPath();
          ctx.arc(0, -28, 7, 0, Math.PI * 2);
          ctx.fill();

          // Visor (class-colored)
          ctx.fillStyle = m.visor;
          ctx.shadowColor = m.visor;
          ctx.shadowBlur = 6;
          ctx.fillRect(-4, -30, 8, 2);
          ctx.shadowBlur = 0;

          // Shoulders
          ctx.fillStyle = "#3a4a5a";
          ctx.fillRect(-9, -20, 4, 7);
          ctx.fillRect(5, -20, 4, 7);

          // Legs
          ctx.fillStyle = "#1a2a3a";
          ctx.fillRect(-4, 0, 3.5, 12);
          ctx.fillRect(0.5, 0, 3.5, 12);

          // Class indicator glow at feet
          ctx.fillStyle = m.color;
          ctx.globalAlpha = 0.3 + Math.sin(t * 2 + m.x * 0.1) * 0.15;
          ctx.fillRect(-5, 13, 10, 2);
          ctx.globalAlpha = fadeIn;

          // Name label
          ctx.fillStyle = m.color;
          ctx.font = "bold 6px monospace";
          ctx.textAlign = "center";
          ctx.fillText(m.label, 0, 22);

          ctx.restore();
        }

        ctx.globalAlpha = 1;
        break;
      }

      case "lyra": {
        // LYRA — The Chrono-Analyst, holographic data displays around her
        const fadeIn = Math.min(1, t / 1.0);
        ctx.globalAlpha = fadeIn;

        // Ambient glow
        const lyraGlow = ctx.createRadialGradient(0, 0, 10, 0, 0, 80);
        lyraGlow.addColorStop(0, "rgba(255,170,68,0.12)");
        lyraGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = lyraGlow;
        ctx.fillRect(-100, -80, 200, 160);

        // Holographic data panels floating around her
        const panelAlpha = 0.15 + Math.sin(t * 1.5) * 0.08;
        ctx.save();
        // Left panel
        ctx.translate(-55, -20);
        ctx.rotate(-0.15 + Math.sin(t * 0.8) * 0.03);
        ctx.fillStyle = `rgba(255,170,68,${panelAlpha})`;
        ctx.fillRect(0, 0, 28, 40);
        ctx.strokeStyle = `rgba(255,170,68,${panelAlpha + 0.15})`;
        ctx.lineWidth = 0.8;
        ctx.strokeRect(0, 0, 28, 40);
        // Data lines
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = `rgba(255,200,100,${panelAlpha * 0.7})`;
          ctx.fillRect(3, 4 + i * 6, 10 + Math.sin(t + i) * 4, 1.5);
        }
        ctx.restore();

        // Right panel
        ctx.save();
        ctx.translate(28, -30);
        ctx.rotate(0.12 + Math.sin(t * 0.9 + 1) * 0.03);
        ctx.fillStyle = `rgba(255,170,68,${panelAlpha})`;
        ctx.fillRect(0, 0, 24, 35);
        ctx.strokeStyle = `rgba(255,170,68,${panelAlpha + 0.15})`;
        ctx.lineWidth = 0.8;
        ctx.strokeRect(0, 0, 24, 35);
        // Timeline graph
        ctx.strokeStyle = `rgba(255,200,100,${panelAlpha + 0.1})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(3, 25);
        for (let i = 0; i < 18; i++) {
          ctx.lineTo(3 + i, 25 - Math.sin(t * 0.5 + i * 0.5) * 8 - i * 0.3);
        }
        ctx.stroke();
        ctx.restore();

        // --- Character body ---
        // Hair — long, dark with amber highlights, flowing past shoulders
        ctx.fillStyle = "#1a1208";
        ctx.beginPath();
        ctx.moveTo(-9, -62);
        ctx.quadraticCurveTo(-14, -50, -13, -30);
        ctx.quadraticCurveTo(-14, -10, -11 + Math.sin(t * 1.5) * 1, 5);
        ctx.lineTo(-7, 5);
        ctx.quadraticCurveTo(-8, -20, -7, -45);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(9, -62);
        ctx.quadraticCurveTo(14, -50, 13, -30);
        ctx.quadraticCurveTo(14, -10, 11 + Math.sin(t * 1.5 + 0.5) * 1, 5);
        ctx.lineTo(7, 5);
        ctx.quadraticCurveTo(8, -20, 7, -45);
        ctx.closePath();
        ctx.fill();
        // Amber shimmer strand
        ctx.strokeStyle = "rgba(255,170,68,0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-10, -48);
        ctx.quadraticCurveTo(-12, -30, -10 + Math.sin(t * 1.2) * 1, 0);
        ctx.stroke();

        // Face
        ctx.fillStyle = "#dba882";
        ctx.beginPath();
        ctx.moveTo(-8, -48);
        ctx.quadraticCurveTo(-10, -56, -8, -62);
        ctx.quadraticCurveTo(0, -66, 8, -62);
        ctx.quadraticCurveTo(10, -56, 8, -48);
        ctx.quadraticCurveTo(0, -44, -8, -48);
        ctx.closePath();
        ctx.fill();

        // Eyes — warm amber
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-5, -57, 4, 3);
        ctx.fillRect(2, -57, 4, 3);
        ctx.fillStyle = "#cc7722";
        ctx.fillRect(-3.5, -56.5, 2, 2);
        ctx.fillRect(3.5, -56.5, 2, 2);
        // Pupils
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(-3, -56, 1, 1);
        ctx.fillRect(4, -56, 1, 1);

        // Eyebrows
        ctx.strokeStyle = "#2a1a08";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-6, -59);
        ctx.lineTo(-1, -60);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(1, -60);
        ctx.lineTo(6, -59);
        ctx.stroke();

        // Lips
        ctx.fillStyle = "#cc6655";
        ctx.beginPath();
        ctx.moveTo(-3, -49);
        ctx.quadraticCurveTo(0, -47, 3, -49);
        ctx.quadraticCurveTo(0, -48, -3, -49);
        ctx.closePath();
        ctx.fill();

        // Neck
        ctx.fillStyle = "#dba882";
        ctx.fillRect(-3, -48, 6, 6);

        // Analyst coat — dark with amber trim
        ctx.fillStyle = "#1a1a2a";
        ctx.beginPath();
        ctx.moveTo(-12, -42);
        ctx.lineTo(-14, 20);
        ctx.lineTo(14, 20);
        ctx.lineTo(12, -42);
        ctx.closePath();
        ctx.fill();
        // Amber collar trim
        ctx.strokeStyle = "#ffaa44";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-8, -42);
        ctx.lineTo(-4, -38);
        ctx.lineTo(4, -38);
        ctx.lineTo(8, -42);
        ctx.stroke();

        // Chrono-Analyst badge — glowing amber circle
        ctx.fillStyle = "#ffaa44";
        ctx.shadowColor = "#ffaa44";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(6, -32, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Belt with data modules
        ctx.fillStyle = "#2a2020";
        ctx.fillRect(-13, 8, 26, 3);
        ctx.fillStyle = "#ffaa44";
        ctx.fillRect(-4, 8.5, 3, 2);
        ctx.fillRect(1, 8.5, 3, 2);

        // Arms — one raised, palm-up projecting holo
        ctx.fillStyle = "#1a1a2a";
        // Left arm at side
        ctx.beginPath();
        ctx.moveTo(-12, -38);
        ctx.quadraticCurveTo(-16, -22, -14, 2);
        ctx.lineTo(-10, 2);
        ctx.quadraticCurveTo(-10, -20, -8, -38);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#dba882";
        ctx.beginPath();
        ctx.arc(-12, 4, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Right arm raised, projecting
        ctx.fillStyle = "#1a1a2a";
        ctx.beginPath();
        ctx.moveTo(12, -38);
        ctx.quadraticCurveTo(20, -42, 22, -36);
        ctx.lineTo(18, -34);
        ctx.quadraticCurveTo(16, -38, 10, -36);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#dba882";
        ctx.beginPath();
        ctx.arc(22, -35, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Holographic emission from raised hand
        ctx.strokeStyle = `rgba(255,170,68,${0.3 + Math.sin(t * 3) * 0.15})`;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(22, -35, 6 + i * 4, -0.8, 0.8);
          ctx.stroke();
        }

        // Legs
        ctx.fillStyle = "#1a1a2a";
        ctx.fillRect(-6, 12, 5, 22);
        ctx.fillRect(1, 12, 5, 22);

        // Boots — sleek with amber accents
        ctx.fillStyle = "#111118";
        ctx.fillRect(-7, 32, 6, 6);
        ctx.fillRect(1, 32, 6, 6);
        ctx.fillStyle = "#ffaa44";
        ctx.fillRect(-7, 32, 6, 1);
        ctx.fillRect(1, 32, 6, 1);

        ctx.globalAlpha = 1;
        break;
      }

      case "rift": {
        // Temporal rift / portal
        const pulse = 0.8 + Math.sin(t * 2) * 0.2;
        ctx.globalAlpha = Math.min(1, t / 1.0);

        // Outer ring
        for (let ring = 3; ring >= 0; ring--) {
          const r = 40 + ring * 20;
          const alpha = (0.15 - ring * 0.03) * pulse;
          const riftGrad = ctx.createRadialGradient(0, 0, r - 15, 0, 0, r);
          riftGrad.addColorStop(0, `rgba(0,200,255,0)`);
          riftGrad.addColorStop(0.7, `rgba(0,200,255,${alpha})`);
          riftGrad.addColorStop(1, `rgba(100,0,200,${alpha * 0.5})`);
          ctx.fillStyle = riftGrad;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
        }

        // Core
        ctx.fillStyle = "rgba(200,220,255,0.3)";
        ctx.shadowColor = "#00ccff";
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Spinning arcs
        for (let i = 0; i < 3; i++) {
          const angle = t * (1.5 + i * 0.3) + (i * Math.PI * 2) / 3;
          ctx.strokeStyle = `rgba(0,200,255,${0.4 * pulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 30 + i * 12, angle, angle + 1.2);
          ctx.stroke();
        }

        ctx.globalAlpha = 1;
        break;
      }

      case "station": {
        // Chronos Station exterior silhouette
        ctx.globalAlpha = Math.min(1, t / 1.5);
        ctx.fillStyle = "#0d1828";

        // Main structure
        ctx.fillRect(-60, -20, 120, 50);
        // Tower
        ctx.fillRect(-10, -50, 20, 35);
        // Antenna
        ctx.fillRect(-2, -65, 4, 18);
        // Windows (glowing)
        ctx.fillStyle = "rgba(0,200,255,0.4)";
        for (let i = 0; i < 5; i++) {
          ctx.fillRect(-45 + i * 20, -10, 8, 6);
        }
        // Beacon
        ctx.fillStyle = "#00ffcc";
        ctx.shadowColor = "#00ffcc";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, -68, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.globalAlpha = 1;
        break;
      }
    }

    ctx.restore();
  }

  loadCampaignLevel(index) {
    if (index >= CAMPAIGN_LEVELS.length) {
      this.state = GameState.VICTORY;
      this.audio.stopMusic();
      this.audio.roundComplete();
      this.clearCampaignSave();
      document.exitPointerLock();
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

    this.state = GameState.PLAYING;
    this.roundStartTime = performance.now();
    this.audio.startMusic(130);
    this.canvas.requestPointerLock();
  }

  nextCampaignLevel() {
    this.campaignLevel++;
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
    if (briefingKey && CUTSCENE_SCRIPTS[briefingKey]) {
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
        proj.color = wep.color;
        this.projectiles.push(proj);
        this.entities.push(proj);
      }
    }

    this.screenShake = Math.max(
      this.screenShake,
      wep.id === 3 ? 6 : wep.id === 1 ? 4 : 2,
    );
  }

  _onEnemyKill() {
    this.killStreak++;
    this.killStreakTimer = 0;
    if (this.killStreak > this.bestStreak) this.bestStreak = this.killStreak;

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
    }

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
            this._onEnemyKill();
          }
        }
      }
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
      this._onEnemyKill();

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
              document.exitPointerLock();
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
            document.exitPointerLock();
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
        this._onEnemyKill();
      }
    }

    if (this.player.health <= 0) {
      this.player.health = 0;
      this.player.alive = false;
      this.deathTimer = 1.5;
      this.audio.playerDeath();
    }
  }

  update(timestamp) {
    this.deltaTime = Math.min(0.05, (timestamp - this.lastFrameTime) / 1000);
    this.lastFrameTime = timestamp;
    this.time = timestamp;

    // Slow-motion time scale
    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= this.deltaTime;
      this.timeScale = 0.25;
      if (this.slowMoTimer <= 0) {
        this.slowMoTimer = 0;
        this.timeScale = 1;
      }
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
          document.exitPointerLock();
        }
      }
      return;
    }

    const dt = this.deltaTime * this.timeScale;

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
        }
        this.checkAchievements();
        this.audio.stopMusic();
        this.audio.roundComplete();
        this.state = GameState.UPGRADE;
        this.upgradeSelection = 0;
        this.arenaClearTimer = null;
        this.saveArena();
        document.exitPointerLock();
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
        document.exitPointerLock();
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

      if (e.type === "health") {
        if (this.player.health < this.player.maxHealth) {
          this.player.health = Math.min(
            this.player.maxHealth,
            this.player.health + 25,
          );
          e.active = false;
          this.audio.pickup();
          if (this.mode === "tutorial" && this.tutorialStep >= 7)
            this.tutorialPickedUp = true;
        }
      } else if (e.type === "ammo") {
        this.player.ammo = Math.min(999, this.player.ammo + 20);
        e.active = false;
        this.audio.pickup();
        if (this.mode === "tutorial" && this.tutorialStep >= 7)
          this.tutorialPickedUp = true;
      } else if (e.type === "weapon") {
        if (!this.player.weapons.includes(e.weaponId)) {
          this.player.weapons.push(e.weaponId);
          this.player.currentWeapon = this.player.weapons.length - 1;
          this.audio.pickup();
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

    if (this.state === GameState.BUILDER) {
      this.builder.render(ctx, w, h, this.time);
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
    const sc = 4.8;
    const cx = w / 2 + bobX;
    const cy = h - 190 + bobY + kickY;

    ctx.save();
    ctx.translate(cx, cy);
    if (tiltAngle !== 0) ctx.rotate(tiltAngle);
    ctx.scale(sc, sc);
    // All coordinates now relative to (0, 0) at weapon center

    // Muzzle flash
    if (this.weaponAnimFrame === 1) {
      ctx.fillStyle = wep.color;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(0, -40, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(0, -40, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (wep.id === 0) {
      // Chrono Pistol
      // Barrel
      ctx.fillStyle = "#445566";
      ctx.fillRect(-6, -35, 12, 15);
      ctx.fillStyle = "#556677";
      ctx.fillRect(-4, -32, 8, 10);
      // Barrel tip glow
      ctx.fillStyle = wep.color;
      ctx.fillRect(-3, -35, 6, 3);
      // Main body/slide
      ctx.fillStyle = "#334455";
      ctx.fillRect(-9, -20, 18, 35);
      ctx.fillStyle = "#3d4f60";
      ctx.fillRect(-7, -18, 14, 30);
      // Chrono energy line
      ctx.fillStyle = wep.color;
      ctx.globalAlpha = 0.6 + Math.sin(this.time * 0.008) * 0.3;
      ctx.fillRect(-2, -18, 4, 25);
      ctx.globalAlpha = 1;
      // Trigger guard
      ctx.strokeStyle = "#445566";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 12, 6, 0, Math.PI);
      ctx.stroke();
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
    } else if (wep.id === 1) {
      // Temporal Shotgun
      // Barrels
      ctx.fillStyle = "#333333";
      ctx.fillRect(-10, -48, 8, 12);
      ctx.fillRect(2, -48, 8, 12);
      ctx.fillStyle = "#444444";
      ctx.fillRect(-8, -46, 4, 8);
      ctx.fillRect(4, -46, 4, 8);
      // Barrel tips glow
      ctx.fillStyle = wep.color;
      ctx.fillRect(-8, -48, 3, 2);
      ctx.fillRect(5, -48, 3, 2);
      // Main body/receiver
      ctx.fillStyle = "#554433";
      ctx.fillRect(-14, -36, 28, 50);
      ctx.fillStyle = "#665544";
      ctx.fillRect(-11, -33, 22, 44);
      // Pump grip
      ctx.fillStyle = "#776655";
      ctx.fillRect(-12, -10, 24, 12);
      ctx.fillStyle = "#887766";
      ctx.fillRect(-10, -8, 20, 8);
      // Shell ejection port
      ctx.fillStyle = "#222222";
      ctx.fillRect(8, -30, 5, 8);
      // Stock
      ctx.fillStyle = "#443322";
      ctx.fillRect(-11, 14, 24, 30);
      ctx.fillStyle = "#554433";
      ctx.fillRect(-9, 16, 20, 26);
      // Temporal coils
      ctx.fillStyle = wep.color;
      ctx.globalAlpha = 0.4 + Math.sin(this.time * 0.006) * 0.2;
      ctx.fillRect(-12, -25, 2, 20);
      ctx.fillRect(10, -25, 2, 20);
      ctx.globalAlpha = 1;
    } else if (wep.id === 2) {
      // Plasma Rifle
      // Barrel
      ctx.fillStyle = "#2a2a44";
      ctx.fillRect(-5, -58, 10, 30);
      ctx.fillStyle = "#3a3a55";
      ctx.fillRect(-3, -55, 6, 25);
      // Barrel tip
      ctx.fillStyle = wep.color;
      ctx.fillRect(-4, -60, 8, 3);
      // Body/receiver
      ctx.fillStyle = "#2a2a44";
      ctx.fillRect(-10, -28, 20, 48);
      ctx.fillStyle = "#3a3a55";
      ctx.fillRect(-8, -25, 16, 42);
      // Energy rings
      ctx.fillStyle = wep.color;
      for (let i = 0; i < 5; i++) {
        const ringA = 0.3 + Math.sin(this.time * 0.01 + i * 1.2) * 0.3;
        ctx.globalAlpha = ringA;
        ctx.fillRect(-6, -50 + i * 8, 12, 2);
      }
      ctx.globalAlpha = 1;
      // Scope
      ctx.fillStyle = "#222244";
      ctx.fillRect(-3, -55, 6, 8);
      ctx.fillStyle = "#1a1a33";
      ctx.beginPath();
      ctx.arc(0, -59, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = wep.color;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(0, -59, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // Stock
      ctx.fillStyle = "#1a1a33";
      ctx.fillRect(-7, 20, 16, 25);
      ctx.fillStyle = "#252545";
      ctx.fillRect(-5, 22, 12, 20);
    } else if (wep.id === 3) {
      // Quantum Cannon
      // Barrel
      ctx.fillStyle = "#331111";
      ctx.fillRect(-12, -55, 24, 20);
      ctx.fillStyle = "#441122";
      ctx.fillRect(-10, -52, 20, 15);
      // Barrel glow core
      ctx.fillStyle = wep.color;
      const pulse = 0.4 + Math.sin(this.time * 0.01) * 0.4;
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.arc(0, -48, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // Main body
      ctx.fillStyle = "#441122";
      ctx.fillRect(-18, -35, 36, 55);
      ctx.fillStyle = "#552233";
      ctx.fillRect(-15, -32, 30, 48);
      // Quantum energy core
      ctx.fillStyle = wep.color;
      ctx.globalAlpha = pulse * 0.8;
      ctx.fillRect(-8, -25, 16, 16);
      ctx.globalAlpha = pulse * 0.4;
      ctx.fillRect(-12, -28, 24, 22);
      ctx.globalAlpha = 1;
      // Energy conduits on sides
      ctx.fillStyle = wep.color;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(-17, -28, 3, 35);
      ctx.fillRect(14, -28, 3, 35);
      ctx.globalAlpha = 1;
      // Ventilation slits
      ctx.fillStyle = "#220011";
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(-14, -5 + i * 6, 10, 2);
        ctx.fillRect(4, -5 + i * 6, 10, 2);
      }
      // Grip
      ctx.fillStyle = "#330011";
      ctx.fillRect(-12, 20, 26, 28);
      ctx.fillStyle = "#440022";
      ctx.fillRect(-10, 22, 22, 24);
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

    const barH = 160;

    // Stamina bar (above the HUD bar)
    const staminaPct = this.player.stamina / this.player.maxStamina;
    const staminaBarH = 22;
    const staminaBarY = h - barH - staminaBarH - 8;
    const staminaBarW = 420;
    const staminaBarX = Math.floor(w / 2 - staminaBarW / 2);
    const isActive = this.player.isSprinting || this.player.isDashing;

    // Glow when sprinting or dashing
    if (isActive) {
      const glowColor = this.player.isDashing
        ? "rgba(0,255,255,0.25)"
        : "rgba(255,170,0,0.2)";
      ctx.shadowColor = this.player.isDashing ? "#00ffff" : "#ffaa00";
      ctx.shadowBlur = 12;
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.roundRect(
        staminaBarX - 4,
        staminaBarY - 4,
        staminaBarW + 8,
        staminaBarH + 8,
        6,
      );
      ctx.fill();
      ctx.shadowBlur = 0;
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
      healthPct > 0.6 ? "#00ff66" : healthPct > 0.3 ? "#ffaa00" : "#ff2200";

    // TODO: Allow users to customize based off what they find useful for different modes?
    // TODO: Can still be improved - too much empty space
    // ─── Layout: AMMO | HEALTH | PORTRAIT | WEAPONS(2x2) | KILLS | SCORE | ROUND/LOC ───
    const pad = 14;
    const portraitW = 180;
    const portraitH = 160;
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
    ctx.font = "bold 46px monospace";
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
    ctx.font = "bold 46px monospace";
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

    // Portrait
    this.drawPortrait(ctx, portraitX, portraitY, portraitW, portraitH);
    ctx.strokeStyle = "rgba(0,200,255,0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(portraitX - 1, portraitY - 1, portraitW + 2, portraitH + 2);
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

    // Weapons
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
      ctx.fillStyle = active ? "rgba(0,200,255,0.4)" : "rgba(255,255,255,0.06)";
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

    // Kills
    const killsX = wpnX + rsecW + pad;
    ctx.fillStyle = "rgba(255,136,102,0.6)";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillText("KILLS", killsX + rsecW / 2, topY + 4);
    ctx.fillStyle = "#ff8866";
    ctx.font = "bold 42px monospace";
    ctx.fillText(`${this.killedEnemies}`, killsX + rsecW / 2, midY + 12);
    ctx.fillStyle = "rgba(255,136,102,0.6)";
    ctx.font = "bold 18px monospace";
    ctx.fillText(`/ ${this.totalEnemies}`, killsX + rsecW / 2, midY + 34);

    // Score
    const scoreX = killsX + rsecW + pad;
    ctx.fillStyle = "rgba(0,221,255,0.6)";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SCORE", scoreX + rsecW / 2, topY + 4);
    ctx.fillStyle = "#00ddff";
    ctx.font = "bold 40px monospace";
    ctx.fillText(`${this.player.score}`, scoreX + rsecW / 2, midY + 14);

    // Location
    const locX = scoreX + rsecW + pad;
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
    const div3X = portraitX + portraitW + pad / 2;
    ctx.beginPath();
    ctx.moveTo(div3X, divTop);
    ctx.lineTo(div3X, divBot);
    ctx.stroke();
    // Between Weapons and Kills
    const div4X = wpnX + rsecW + pad / 2;
    ctx.beginPath();
    ctx.moveTo(div4X, divTop);
    ctx.lineTo(div4X, divBot);
    ctx.stroke();
    // Between Kills and Score
    const div5X = killsX + rsecW + pad / 2;
    ctx.beginPath();
    ctx.moveTo(div5X, divTop);
    ctx.lineTo(div5X, divBot);
    ctx.stroke();
    // Between Score and Location
    const div6X = scoreX + rsecW + pad / 2;
    ctx.beginPath();
    ctx.moveTo(div6X, divTop);
    ctx.lineTo(div6X, divBot);
    ctx.stroke();

    // Arena Timer in the Top Left Corner
    if (this.mode === "arena") {
      const secs = Math.ceil(this.arenaTimer);
      const warning = secs <= 10;
      const cleared = this.arenaClearTimer != null;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(10, 10, 160, 72);
      ctx.strokeStyle = warning
        ? "rgba(255,34,0,0.6)"
        : cleared
          ? "rgba(0,255,100,0.5)"
          : "rgba(0,200,255,0.3)";
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, 160, 72);

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
      ctx.font = dn.crit ? "bold 18px monospace" : "bold 14px monospace";
      ctx.fillStyle = dn.crit ? "#ffcc00" : "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(dn.value, screenX, screenY);
      if (dn.crit) {
        ctx.fillStyle = "rgba(255,204,0,0.3)";
        ctx.fillText(dn.value, screenX + 1, screenY + 1);
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
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `bold ${Math.round(ksd.size * scale)}px monospace`;
      const ky = (h - barH) * 0.3;
      // Glow
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

    // Slow-mo vignette overlay
    if (this.slowMoTimer > 0) {
      const smAlpha = Math.min(0.35, (this.slowMoTimer / 1.5) * 0.35);
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
  }

  // Multistage portrait drawing based on health and alive status - can be improved with better art and more stages / smoother transitions between stages
  drawPortrait(ctx, x, y, w, h) {
    const healthPct = this.player.health / this.player.maxHealth;
    const isDead = !this.player.alive || this.player.health <= 0;

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
      ctx.globalAlpha = 0.8 + Math.sin(this.time / 400) * 0.15;
      ctx.fillRect(cx - 16 * s, cy - 6 * s, 32 * s, 10 * s);
      ctx.globalAlpha = 1;

      ctx.fillStyle = "rgba(0,0,0,0.15)";
      for (let sl = 0; sl < 5; sl++) {
        ctx.fillRect(cx - 16 * s, cy - 6 * s + sl * 2 * s, 32 * s, 1 * s);
      }
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(cx - 12 * s, cy - 4 * s, 10 * s, 3 * s);

      ctx.fillStyle = "#66ffff";
      ctx.globalAlpha = 0.4 + Math.sin(this.time / 200) * 0.2;
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
      ctx.globalAlpha = 0.75 + Math.sin(this.time / 400) * 0.12;
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
      ctx.globalAlpha = 0.65 + Math.sin(this.time / 350) * 0.1;
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
      ctx.globalAlpha = 0.55 + Math.sin(this.time / 250) * 0.12;
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
      ctx.globalAlpha = 0.5 + Math.sin(this.time / 300) * 0.1;
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
      ctx.globalAlpha = 0.3 + Math.sin(this.time / 200) * 0.1;
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
      ctx.globalAlpha = 0.15 + Math.sin(this.time / 100) * 0.1;
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
    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 36px monospace";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", w / 2, h / 2 - 100);
    this.drawControlsOverlay(ctx, w, h, 0.9);
    ctx.font = "14px monospace";
    ctx.fillStyle = "#aaaacc";
    ctx.textAlign = "center";
    const saveHint = this.mode === "campaign" ? "  |  F to save" : "";
    ctx.fillText(
      "ESC / P to resume  |  S settings  |  C controls  |  Q quit" + saveHint,
      w / 2,
      h / 2 + 110,
    );
    if (this.pauseSaveFlash && performance.now() - this.pauseSaveFlash < 1500) {
      const alpha = 1 - (performance.now() - this.pauseSaveFlash) / 1500;
      ctx.fillStyle = `rgba(0, 255, 100, ${alpha.toFixed(2)})`;
      ctx.font = "bold 16px monospace";
      ctx.fillText("GAME SAVED", w / 2, h / 2 + 140);
    }
    ctx.textAlign = "left";
  }

  renderSettingsScreen(ctx, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 30px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SETTINGS", w / 2, h / 2 - 170);

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
    ];

    const barW = 200;
    const barH = 6;
    const panelX = w / 2 - 220;
    const panelW = 440;
    const itemHeights = [44, 70, 60, 60, 60, 60, 60, 44, 44]; // difficulty, crosshair, minimap, music, sfx, sensitivity, fov, viewMode, invertX
    let startY = h / 2 - 155;

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
      }

      startY += itemH;
    }

    ctx.fillStyle = "#556677";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      "W/S to navigate, LEFT/RIGHT to change, ESC to go back",
      w / 2,
      startY + 20,
    );
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
      if (selected) {
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
        ctx.fillStyle = selected ? "#ffffff" : "#aaaacc";
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

  renderUpgradeScreen(ctx, w, h) {
    ctx.fillStyle = "rgba(0,0,10,0.92)";
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 36px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`ROUND ${this.arenaRound - 1} COMPLETE!`, w / 2, 50);

    ctx.fillStyle = "#ffcc00";
    ctx.font = "20px monospace";
    ctx.fillText(`Score: ${this.player.score}`, w / 2, 80);

    ctx.fillStyle = "#aaddff";
    ctx.font = "bold 22px monospace";
    ctx.fillText("UPGRADES", w / 2, 112);

    // Arena upgrades are currently a 2 column grid
    const upgradeKeys = Object.keys(UPGRADES);
    const startY = 140;
    const lineH = 50;
    const colW = 340;
    const cols = 2;
    const leftX = w / 2 - colW - 15;
    const rightX = w / 2 + 15;

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
      const y = startY + row * lineH;

      if (selected) {
        ctx.fillStyle = "rgba(0,200,255,0.15)";
        ctx.fillRect(baseX - 5, y - 16, colW, lineH - 2);
        ctx.strokeStyle = "rgba(0,255,200,0.4)";
        ctx.lineWidth = 1;
        ctx.strokeRect(baseX - 5, y - 16, colW, lineH - 2);
      }

      ctx.fillStyle = selected ? "#00ffcc" : "#8888aa";
      ctx.font = "bold 17px monospace";
      ctx.textAlign = "left";
      ctx.fillText(upg.name, baseX, y);

      ctx.font = "13px monospace";
      ctx.fillStyle = "#7777aa";
      ctx.fillText(upg.description, baseX, y + 16);

      ctx.textAlign = "right";
      if (maxed) {
        ctx.fillStyle = "#44ff44";
        ctx.font = "bold 15px monospace";
        ctx.fillText("MAX", baseX + colW - 10, y);
      } else {
        ctx.fillStyle = affordable ? "#ffcc00" : "#ff4444";
        ctx.font = "bold 15px monospace";
        ctx.fillText(`${cost}`, baseX + colW - 10, y);
      }

      // Level pips
      const maxPips = Math.min(upg.maxLevel, 10);
      const pipW = Math.min(12, (colW - 20) / maxPips - 2);
      for (let l = 0; l < maxPips; l++) {
        ctx.fillStyle = l < level ? "#00ffcc" : "#333344";
        ctx.fillRect(baseX + l * (pipW + 2), y + 22, pipW, 5);
      }
    }

    // Continue button
    const totalRows = Math.ceil(upgradeKeys.length / cols);
    const contY = startY + totalRows * lineH + 25;
    const contSelected = this.upgradeSelection === upgradeKeys.length;
    ctx.fillStyle = contSelected ? "#00ffcc" : "#888888";
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "center";
    ctx.fillText("[ CONTINUE TO NEXT ROUND ]", w / 2, contY);

    ctx.fillStyle = "#556677";
    ctx.font = "14px monospace";
    ctx.fillText("W/S/A/D to navigate, ENTER to select", w / 2, contY + 30);

    ctx.textAlign = "left";
  }

  renderGameOver(ctx, w, h) {
    ctx.fillStyle = "rgba(40,0,0,0.92)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ff2200";
    ctx.font = "bold 42px monospace";
    ctx.textAlign = "center";
    ctx.fillText("TIMELINE COLLAPSED", w / 2, h / 2 - 110);

    this._renderStatsCard(ctx, w, h / 2 - 60, "#ff2200", "#ff6644");

    if (this.mode === "arena") {
      ctx.fillStyle = "#ff8866";
      ctx.font = "16px monospace";
      ctx.fillText(
        `Rounds Survived: ${this.arenaRound - 1}`,
        w / 2,
        h / 2 + 72,
      );
    }
    ctx.fillStyle = "#aaaaaa";
    ctx.font = "14px monospace";
    ctx.fillText("Press ENTER to return to title", w / 2, h / 2 + 100);
    ctx.textAlign = "left";
  }

  renderVictory(ctx, w, h) {
    ctx.fillStyle = "rgba(0,10,30,0.92)";
    ctx.fillRect(0, 0, w, h);

    // Animated glow
    const pulse = 0.7 + Math.sin(this.time * 0.003) * 0.3;
    ctx.fillStyle = `rgba(0,255,200,${pulse * 0.15})`;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 42px monospace";
    ctx.textAlign = "center";
    ctx.fillText("TIMELINE RESTORED", w / 2, h / 2 - 80);

    ctx.fillStyle = "#ffcc00";
    ctx.font = "bold 20px monospace";
    ctx.fillText(
      "The Paradox Lord has been destroyed — for good.",
      w / 2,
      h / 2 - 35,
    );

    ctx.fillStyle = "#aaddff";
    ctx.font = "18px monospace";
    ctx.fillText("Three forms. Three acts. One team.", w / 2, h / 2 - 5);
    ctx.fillText(
      "The quantum continuum is stable once more.",
      w / 2,
      h / 2 + 20,
    );

    this._renderStatsCard(ctx, w, h / 2 + 40, "#ffcc00", "#aaddff");

    ctx.fillStyle = "#aaaaaa";
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Press ENTER to return to title", w / 2, h / 2 + 180);
    ctx.textAlign = "left";
  }

  renderLevelComplete(ctx, w, h) {
    ctx.fillStyle = "rgba(0,5,20,0.92)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 36px monospace";
    ctx.textAlign = "center";
    ctx.fillText("LEVEL COMPLETE", w / 2, h / 2 - 110);

    this._renderStatsCard(ctx, w, h / 2 - 60, "#00ffcc", "#aaddff");

    ctx.fillStyle = "#aaddff";
    ctx.font = "16px monospace";
    ctx.fillText(
      `Secrets: ${this.player.secretsFound || 0}`,
      w / 2,
      h / 2 + 72,
    );
    ctx.fillStyle = "#aaaaaa";
    ctx.font = "14px monospace";
    ctx.fillText("Press ENTER to continue", w / 2, h / 2 + 100);
    ctx.textAlign = "left";
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

    // Card background
    const cardW = 320;
    const cardH = 110;
    const cx = w / 2 - cardW / 2;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx, startY, cardW, cardH, 6);
    ctx.fill();
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
      const sy = startY + row * rowH + 20;

      ctx.fillStyle = textColor;
      ctx.font = "10px monospace";
      ctx.fillText(stats[i].label, sx, sy);

      ctx.fillStyle = accentColor;
      ctx.font = "bold 22px monospace";
      ctx.fillText(stats[i].value, sx, sy + 24);
    }

    // Score bar at bottom of card
    ctx.fillStyle = accentColor;
    ctx.font = "bold 14px monospace";
    ctx.fillText(`SCORE: ${this.player.score}`, w / 2, startY + cardH + 16);
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

    // Spawn some enemies scattered around the map
    const enemyTypes = ["drone", "phantom", "beast"];
    let spawned = 0;
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
    this.canvas.requestPointerLock();
  }

  exitBuilderPlayTest() {
    this.audio.stopMusic();
    this._playtestEndTimer = null;
    this.state = GameState.BUILDER;
    this.mode = "builder";
    this.map = this.builder.map;
    this.entities = [];
    this.projectiles = [];
    if (this._builderSnapshot) {
      this.builder.player.x = this._builderSnapshot.playerX;
      this.builder.player.y = this._builderSnapshot.playerY;
      this.builder.player.angle = this._builderSnapshot.playerAngle;
      this._builderSnapshot = null;
    }
  }
}
