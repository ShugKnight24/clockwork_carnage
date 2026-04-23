import { AssetEditor } from "./editor.js";
import { InputManager, DEFAULT_KEYBINDS } from "./input-manager.js";
import { drawWeapon as renderWeapon } from "./weapon-renderer.js";
import {
  spawnPickupBurst as _spawnPickupBurst,
  spawnEnergyBurst as _spawnEnergyBurst,
  updateParticles as _updateParticles,
} from "./particle-system.js";
import {
  spawnHitImpact as _spawnHitImpact,
  spawnMuzzleFlash as _spawnMuzzleFlash,
  spawnDeathParticles as _spawnDeathParticles,
  spawnWallSparks as _spawnWallSparks,
} from "./vfx.js";
import {
  WEAPONS,
  ENEMY_TYPES,
  CUTSCENE_SCRIPTS,
  ARENA_MAPS,
  UPGRADES,
  WALL_COLORS,
  TUTORIAL_MAP,
  ARIA_COMMS,
  CHARACTER_COLORS,
  ARMOR_STYLES,
  BADGES,
  WEAPON_SKINS,
  LOADOUT_CLASSES,
  DEFAULT_CHARACTER,
} from "./data.js";
import { Renderer } from "./renderer.js";
import { renderPostFX as _renderPostFX } from "../src/rendering/postfx.js";
import { drawGlow as _drawGlow } from "../src/rendering/draw-utils.js";
import { AudioManager } from "./audio.js";
import { BuilderMode } from "./builder.js";
import { MeltdownMode } from "./meltdown.js";
import { CutsceneEngine } from "./cutscene.js";
import { Player, Enemy, Pickup, Prop, Projectile } from "./entities.js";
import { Profiler } from "./editor/debug/profiler.js";
import { trackEvent } from "./analytics.js";
import { upgradeLayout, tutorialMenuLayout, isCompactPhone } from "./layout.js";
import { KillStreakSystem } from "../src/systems/kill-streak.js";
import { AriaCommsSystem } from "../src/systems/aria-comms.js";
import { SquadCommsController } from "../src/systems/squad-comms.js";
import * as Save from "../src/core/save-system.js";
import { AchievementSystem } from "../src/systems/achievement-system.js";
import {
  isPassable as _isPassable,
  hasLineOfSight as _hasLineOfSight,
  moveWithCollision,
} from "../src/systems/physics.js";
import { PlayerUpdateSystem } from "../src/systems/player-update.js";
import { AISystem } from "../src/systems/ai.js";
import {
  getDifficultyMultipliers as _getDifficultyMultipliers,
  filterArenaSpawns,
  createArenaEnemies,
  createArenaPickups,
  createMeltdownEnemies,
  createMeltdownPickups,
} from "../src/systems/spawner.js";
import { updateProjectiles as _updateProjectiles } from "../src/systems/projectile-update.js";
import {
  fireWeapon as _fireWeapon,
  hitscan as _hitscan,
  damageEnemy as _damageEnemy,
  onEnemyKill as _onEnemyKill,
  damagePlayer as _damagePlayer,
} from "../src/systems/combat-orchestrator.js";
import { drawCrosshair } from "../src/ui/crosshair.js";
import { drawScanlines } from "../src/ui/scanlines.js";
import { drawPortrait as _drawPortrait } from "../src/ui/portrait.js";
import { drawMinimap as _drawMinimap } from "../src/ui/minimap.js";
import { renderStatsCard } from "../src/ui/stats-card.js";
import { renderHUD as _renderHUD } from "../src/ui/hud.js";
import { renderCampaignPrompt as _renderCampaignPrompt } from "../src/ui/campaign-prompt.js";
import { renderUpgradeScreen as _renderUpgradeScreen } from "../src/ui/upgrade-screen.js";
import {
  renderTutorialOverlay as _renderTutorialOverlay,
  renderTutorialCompletionMenu as _renderTutorialCompletionMenu,
  renderTutorialMenu as _renderTutorialMenu,
} from "../src/ui/tutorial-ui.js";
import { renderSettingsScreen as _renderSettingsScreen } from "../src/ui/settings-screen.js";
import {
  renderControlsScreen as _renderControlsScreen,
  drawControlsOverlay as _drawControlsOverlay,
  formatKeyCode as _formatKeyCode,
} from "../src/ui/controls-screen.js";
import {
  renderGameOver as _renderGameOver,
  renderVictory as _renderVictory,
  renderLevelComplete as _renderLevelComplete,
  renderShareToast,
  renderBuilderOnboarding as _renderBuilderOnboarding,
} from "../src/ui/game-over-screens.js";
import {
  renderCharacterCreator as _renderCharacterCreator,
  renderCharacterPreview as _renderCharacterPreview,
  CREATOR_CATEGORIES,
  getCreatorLayout,
} from "../src/ui/character-creator.js";
import { SpatialGrid } from "../src/utils/spatial-grid.js";
import { decay } from "../src/utils/math.js";

export const GAME_VERSION = "0.8.1";

import {
  COMPACT_PHONE_HEIGHT,
  SETTINGS_REGISTRY,
  getVisibleSettings,
  getSettingsForCategory,
  getVisibleCategories,
  settingDisplayItem,
  applySettingStep,
} from "./settings-registry.js";
export {
  COMPACT_PHONE_HEIGHT,
  SETTINGS_REGISTRY,
  getVisibleSettings,
  settingDisplayItem,
  applySettingStep,
};

import { StateManager } from "./state-manager.js";
import { CampaignManager } from "./campaign-manager.js";
import { TutorialSystem } from "./tutorial-system.js";

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
  STATS: "stats",
};

// TODO: Rethink this entire file... It handles too much. Split into multiple classes/files (Player, Enemy, Projectile, GameState, etc.) and have a main Game class that manages everything? Likely a StateManager that handles states and the Game class handles core game logic and delegates to other classes as needed. Definitely a base ECS that extracts shared logic and data between entities

export class Game {
  constructor(canvas, hudCanvas) {
    this.canvas = canvas;
    this.hudCanvas = hudCanvas;
    this.hudCtx = hudCanvas.getContext("2d");
    // DPR-aware HUD dimensions (CSS pixels). Set by resizeCanvases in main.js.
    this.dpr = 1;
    this.hudW = hudCanvas.width;
    this.hudH = hudCanvas.height;
    this.renderer = new Renderer(canvas);
    this.audio = new AudioManager();
    this.cutsceneEngine = new CutsceneEngine({
      audio: this.audio,
      getKeys: () => this.keys,
      getTouchControls: () => this.touchControls,
      isTouchDevice: "ontouchstart" in window,
      getPlayerName: () => this.character.name || "Agent",
      getSettings: () => this.settings,
    });
    this.player = new Player();
    this.entities = [];
    this.entityGrid = new SpatialGrid(2);
    this.dustMotes = null;
    this.projectiles = [];
    this._chronoBombs = [];
    this.map = null;
    this._stateManager = new StateManager(GameState.TITLE);
    this.assetEditor = new AssetEditor(this);
    this.mode = null; // 'arena', 'campaign', or 'meltdown'
    this.meltdown = new MeltdownMode();
    this.time = 0;
    this.deltaTime = 0;
    this.lastFrameTime = 0;
    this.arenaTimer = 60;
    this.arenaRound = 1;
    this.campaign = new CampaignManager(this);
    this.tutorial = new TutorialSystem(this);
    this.isTouchDevice = "ontouchstart" in window;
    this.menuSelection = 0;
    this.upgradeSelection = 0;
    this.upgradeLevels = {};
    this._meltdownUpgradeChoices = null; // Array of 3 upgrade objects or null
    this._meltdownUpgradeSel = 0; // Currently highlighted choice (0-2)
    this._builderOnboardingDismissed = false;
    this.transitioning = false;
    this.transitionAlpha = 0;
    this._transitionCallback = null;
    this._transitionDir = 0; // 1 = fading out, -1 = fading in
    this._transitionSpeed = 2.5; // full fade in 0.4s
    this.screenShake = 0;
    this.killedEnemies = 0;
    this.totalEnemies = 0;
    this.fps = 0;
    this.frameCount = 0;
    this.fpsTime = 0;
    this.showFPS = false;
    this.profiler = new Profiler();
    this.glitchEffect = 0;
    this.hitMarker = 0;
    this.damageNumbers = [];
    // Kill streak system (delegated to KillStreakSystem)
    this.killStreakSystem = new KillStreakSystem();
    // Forwarding properties for backward compat during migration
    Object.defineProperties(this, {
      killStreak: {
        get() {
          return this.killStreakSystem.streak;
        },
        set(v) {
          this.killStreakSystem.streak = v;
        },
      },
      killStreakTimer: {
        get() {
          return this.killStreakSystem.timer;
        },
        set(v) {
          this.killStreakSystem.timer = v;
        },
      },
      killStreakDisplay: {
        get() {
          return this.killStreakSystem.display;
        },
        set(v) {
          this.killStreakSystem.display = v;
        },
      },
      bestStreak: {
        get() {
          return this.killStreakSystem.best;
        },
        set(v) {
          this.killStreakSystem.best = v;
        },
      },
    });
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
      cutsceneAutoAdvance: false, // manual advance by default
      minimapSize: 200,
      musicVolume: 80, // 0..100
      sfxVolume: 80, // 0..100
      sensitivity: 1.0, // 0.5..2.0
      fov: 70, // 50..120 degrees
      viewMode: 0, // 0=first-person, 1=third-person
      invertX: false,
      fontScale: 100, // 100, 125, 150 percent
      colorblind: 0, // 0=off, 1=deuteranopia, 2=protanopia, 3=tritanopia
      visualStyle: 0, // 0=Clockwork (cartoony), 1=Brutal
      hudStyle: 0, // 0=Minimal (transparent pills), 1=Classic (bottom bar + portrait)
      hudScale: 100, // 75, 100, 125 percent
      staminaBarSize: 100, // 75, 100, 125, 150 percent
      showPortrait: true,
      showWeapons: true,
      showKills: true,
      showScore: true,
      touchSensitivity: 2.0,
      haptics: true,
      autoFire: false,
      swipeWeapons: true,
    };
    this.settingsSelection = 0;
    this.settingsCategory = "Gameplay"; // active sidebar category
    this.lastEscTime = 0;
    // Mouse hover tracking for settings UI
    this._settingsMouseX = -1;
    this._settingsMouseY = -1;
    document.addEventListener("mousemove", (e) => {
      if (this.state !== GameState.SETTINGS) {
        if (this.canvas.style.cursor === "pointer")
          this.canvas.style.cursor = "";
        return;
      }
      const rect = this.canvas.getBoundingClientRect();
      const sx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const sy = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      this._settingsMouseX = sx;
      this._settingsMouseY = sy;
      // Set pointer cursor when hovering interactive areas
      const cph = this.isTouchDevice && isCompactPhone(this.canvas.height);
      const hdrH = cph ? 36 : 52;
      const sdW = cph ? 90 : 160;
      const inSidebar = sx < sdW && sy > hdrH;
      const inPanel = sx >= sdW + 1 && sy > hdrH + 8;
      this.canvas.style.cursor = inSidebar || inPanel ? "pointer" : "";
    });

    // Share URL handling
    window.addEventListener("hashchange", () => this._handleHashChange());
    this._handleHashChange();

    // InputManager owns keys, mouse, keybinds and all DOM event wiring.
    // setupInput() below finishes wiring it after the game is fully constructed.
    this.input = new InputManager({
      canvas: this.canvas,
      onKeyDown: (code, e) => this._inputKeyDown(code, e),
      onKeyUp: (code) => {
        /* state machine reacts to held keys each frame */ void code;
      },
      onDashTrigger: (code) => this.triggerDash(code),
      onMouseDown: (e) => this._inputMouseDown(e),
      onMouseUp: (e) => {
        if (e.button === 0) this.player.isFiring = false;
      },
      onWheel: (deltaY) => this._inputWheel(deltaY),
      onLockChange: (locked, wasLocked) =>
        this._inputLockChange(locked, wasLocked),
      getState: () => this.state,
      playingState: GameState.PLAYING,
    });
    // Convenience aliases so all existing `this.keys`, `this.mouse`, `this.keybinds` references
    // continue to work without a sweeping rename.
    this.keys = this.input.keys;
    this.mouse = this.input.mouse;
    this.keybinds = this.input.keybinds;

    // Previous-frame key state tracking for edge-detection (crouch start)
    // Owned by PlayerUpdateSystem — kept here for backward compat only
    this._prevCrouchKey = false;
    this.playerUpdateSystem = new PlayerUpdateSystem();
    this.aiSystem = new AISystem();
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
    this.builder.onShareMap = () => this._shareBuilderMap();

    // Dev flags
    this.alwaysShowTutorial = false;

    // Cached vignette (recreated on resize)
    this._vignetteCanvas = null;
    this._vignetteW = 0;
    this._vignetteH = 0;

    // Cached scanline patterns (avoids 180+ fillRect calls per overlay)
    this._scanlinePattern = null; // rgba(0,0,0,0.03) every 4px
    this._scanlinePatternDense = null; // rgba(0,0,0,0.04) every 3px

    // Achievement system (delegated to AchievementSystem)
    this.achievementSystem = new AchievementSystem();
    // Forwarding properties for backward compat during migration
    Object.defineProperties(this, {
      unlockedAchievements: {
        get() {
          return this.achievementSystem.unlockedAchievements;
        },
        set(v) {
          this.achievementSystem.unlockedAchievements = v;
        },
      },
      achievementQueue: {
        get() {
          return this.achievementSystem.achievementQueue;
        },
        set(v) {
          this.achievementSystem.achievementQueue = v;
        },
      },
      achievementToast: {
        get() {
          return this.achievementSystem.achievementToast;
        },
        set(v) {
          this.achievementSystem.achievementToast = v;
        },
      },
      achievementIcons: {
        get() {
          return this.achievementSystem.achievementIcons;
        },
        set(v) {
          this.achievementSystem.achievementIcons = v;
        },
      },
      achievementStats: {
        get() {
          return this.achievementSystem.achievementStats;
        },
        set(v) {
          this.achievementSystem.achievementStats = v;
        },
      },
      roundDamageTaken: {
        get() {
          return this.achievementSystem.roundDamageTaken;
        },
        set(v) {
          this.achievementSystem.roundDamageTaken = v;
        },
      },
      achievementsScroll: {
        get() {
          return this.achievementSystem.achievementsScroll;
        },
        set(v) {
          this.achievementSystem.achievementsScroll = v;
        },
      },
    });

    // ARIA in-game comms system (delegated to AriaCommsSystem)
    this.ariaComms = new AriaCommsSystem();
    // Squad voice lines (Kael/Nova/Rook/Lyra) — act 2+ only
    this.squadComms = new SquadCommsController(this.ariaComms);
    // Forwarding properties for backward compat during migration
    Object.defineProperties(this, {
      ariaQueue: {
        get() {
          return this.ariaComms.queue;
        },
        set(v) {
          this.ariaComms.queue = v;
        },
      },
      ariaMessage: {
        get() {
          return this.ariaComms.message;
        },
        set(v) {
          this.ariaComms.message = v;
        },
      },
      ariaTriggered: {
        get() {
          return this.ariaComms.triggered;
        },
        set(v) {
          this.ariaComms.triggered = v;
        },
      },
      ariaEnabled: {
        get() {
          return this.ariaComms.enabled;
        },
        set(v) {
          this.ariaComms.enabled = v;
        },
      },
      ariaIdleTimer: {
        get() {
          return this.ariaComms.idleTimer;
        },
        set(v) {
          this.ariaComms.idleTimer = v;
        },
      },
      ariaIdleThreshold: {
        get() {
          return this.ariaComms.idleThreshold;
        },
        set(v) {
          this.ariaComms.idleThreshold = v;
        },
      },
      ariaCombatTimer: {
        get() {
          return this.ariaComms.combatTimer;
        },
        set(v) {
          this.ariaComms.combatTimer = v;
        },
      },
      ariaMessageLog: {
        get() {
          return this.ariaComms.messageLog;
        },
        set(v) {
          this.ariaComms.messageLog = v;
        },
      },
      showAriaLog: {
        get() {
          return this.ariaComms.showLog;
        },
        set(v) {
          this.ariaComms.showLog = v;
        },
      },
      ariaLogScroll: {
        get() {
          return this.ariaComms.logScroll;
        },
        set(v) {
          this.ariaComms.logScroll = v;
        },
      },
    });

    // Character creator state
    this.character = { ...DEFAULT_CHARACTER };
    this.creatorCategory = 0; // 0=name, 1=color, 2=armor, 3=badge, 4=weaponSkin, 5=loadout
    this.creatorCategoryCount = 6;
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
    this.renderer.applyVisualStyle(this.settings.visualStyle);
  }

  // ─── State management (delegates to StateManager) ──────────────────────────

  /**
   * `this.state` getter/setter — all existing reads and direct assignments
   * continue to work unchanged.  Internally everything goes through
   * StateManager so transitions are observable and pause logic is centralised.
   */
  get state() {
    return this._stateManager.current;
  }

  set state(v) {
    this._stateManager.transition(v);
  }

  /**
   * Backward-compat shim for `this.pausedFromState`.
   * Prefer using `pauseGame(from)` / `resumeGame()` for new code.
   */
  get pausedFromState() {
    return this._stateManager.pausedFrom;
  }

  // ── Campaign state bridges (delegates to CampaignManager) ──
  get campaignLevel() {
    return this.campaign.level;
  }
  set campaignLevel(v) {
    this.campaign.level = v;
  }
  get campaignAct() {
    return this.campaign.act;
  }
  set campaignAct(v) {
    this.campaign.act = v;
  }
  get ngPlusCycle() {
    return this.campaign.ngPlusCycle;
  }
  set ngPlusCycle(v) {
    this.campaign.ngPlusCycle = v;
  }
  get ngPlusPrompt() {
    return this.campaign.ngPlusPrompt;
  }
  set ngPlusPrompt(v) {
    this.campaign.ngPlusPrompt = v;
  }
  get ngPlusPromptSel() {
    return this.campaign.ngPlusPromptSel;
  }
  set ngPlusPromptSel(v) {
    this.campaign.ngPlusPromptSel = v;
  }
  get campaignMissedWeapons() {
    return this.campaign.missedWeapons;
  }
  set campaignMissedWeapons(v) {
    this.campaign.missedWeapons = v;
  }
  get campaignPromptSelection() {
    return this.campaign.promptSelection;
  }
  set campaignPromptSelection(v) {
    this.campaign.promptSelection = v;
  }

  // ── Tutorial state bridges (delegates to TutorialSystem) ──
  get tutorialStep() {
    return this.tutorial.step;
  }
  set tutorialStep(v) {
    this.tutorial.step = v;
  }
  get tutorialStepTime() {
    return this.tutorial.stepTime;
  }
  set tutorialStepTime(v) {
    this.tutorial.stepTime = v;
  }
  get tutorialMenuSelection() {
    return this.tutorial.menuSelection;
  }
  set tutorialMenuSelection(v) {
    this.tutorial.menuSelection = v;
  }
  get tutorialShowCompletionMenu() {
    return this.tutorial.showCompletionMenu;
  }
  set tutorialShowCompletionMenu(v) {
    this.tutorial.showCompletionMenu = v;
  }
  get tutorialPickedUp() {
    return this.tutorial.pickedUp;
  }
  set tutorialPickedUp(v) {
    this.tutorial.pickedUp = v;
  }
  get tutorialWeaponPickedUp() {
    return this.tutorial.weaponPickedUp;
  }
  set tutorialWeaponPickedUp(v) {
    this.tutorial.weaponPickedUp = v;
  }
  get tutorialWeaponSwapped() {
    return this.tutorial.weaponSwapped;
  }
  set tutorialWeaponSwapped(v) {
    this.tutorial.weaponSwapped = v;
  }
  get tutorialSecondWeaponPickedUp() {
    return this.tutorial.secondWeaponPickedUp;
  }
  set tutorialSecondWeaponPickedUp(v) {
    this.tutorial.secondWeaponPickedUp = v;
  }
  get tutorialDoorOpened() {
    return this.tutorial.doorOpened;
  }
  set tutorialDoorOpened(v) {
    this.tutorial.doorOpened = v;
  }
  get tutorialDashed() {
    return this.tutorial.dashed;
  }
  set tutorialDashed(v) {
    this.tutorial.dashed = v;
  }
  get tutorialCrouched() {
    return this.tutorial.crouched;
  }
  set tutorialCrouched(v) {
    this.tutorial.crouched = v;
  }
  get tutorialSlid() {
    return this.tutorial.slid;
  }
  set tutorialSlid(v) {
    this.tutorial.slid = v;
  }
  get tutorialFired() {
    return this.tutorial.fired;
  }
  set tutorialFired(v) {
    this.tutorial.fired = v;
  }
  get tutorialChronoUsed() {
    return this.tutorial.chronoUsed;
  }
  set tutorialChronoUsed(v) {
    this.tutorial.chronoUsed = v;
  }

  set pausedFromState(v) {
    // Allow legacy direct assignment — routes through StateManager internals.
    this._stateManager._pausedFrom = v;
  }

  /**
   * Pause the game.  Always sets pausedFrom so resume() can find its way back.
   * Unifies the 5+ scattered `this.state = GameState.PAUSED` calls.
   * @param {string} [from] - state to return to on resume (defaults to current)
   */
  pauseGame(from) {
    this._stateManager.pause(from ?? this.state);
    this.unlockPointer();
  }

  /**
   * Resume after a pause.  Returns to the state captured by pauseGame().
   */
  resumeGame() {
    this._stateManager.resume();
    this.lockPointer();
  }

  // Pointer lock helpers — kept here because they need the isTouchDevice guard.

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
    // InputManager was created in the constructor and registered all DOM
    // listeners. This method now just loads saved keybinds from localStorage.
    this.input.loadKeybinds();
  }

  /** Handles the keydown part that needs full game state context. */
  _inputKeyDown(code, e) {
    // Builder delegates input to its own handler
    if (this.state === GameState.BUILDER) {
      if (!this._builderOnboardingDismissed) {
        this._builderOnboardingDismissed = true;
        // Dismiss on any key EXCEPT Escape — let Escape fall through to pause.
        if (e.code !== "Escape") return;
      }
      if (this.builder.handleKeyDown(e)) return;
    }
    // Rebinding mode — capture the next key
    if (this.state === GameState.CONTROLS && this.rebindingKey) {
      e.preventDefault();
      if (e.code !== "Escape") {
        const { swappedAction } = this.input.rebind(this.rebindingKey, e.code);
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
      const now = performance.now();
      if (now - (this._creatorExitTime || 0) < 100) {
        e.stopImmediatePropagation();
      }
    }
  }

  /** Handles all mousedown events with full game state context. */
  _inputMouseDown(e) {
    // Cutscene: click to advance frame (manual advance)
    if (this.state === GameState.CUTSCENE && e.button === 0) {
      this.advanceCutsceneFrame();
      return;
    }
    if (this.state === GameState.SETTINGS && e.button === 0) {
      this._handleSettingsClick(e);
      return;
    }
    if (this.state === GameState.CHARACTER_CREATE && e.button === 0) {
      this._handleCreatorClick(e);
      return;
    }
    if (this.state === GameState.GAME_OVER && e.button === 0) {
      this._handleGameOverClick(e);
      return;
    }
    if (this.state === GameState.VICTORY && e.button === 0) {
      this._handleVictoryClick(e);
      return;
    }
    if (this.state === GameState.LEVEL_COMPLETE && e.button === 0) {
      if (this.transitioning) return;
      this.audio.menuConfirm();
      this.fadeTransition(() => this.nextCampaignLevel());
      return;
    }
    if (this.state === GameState.BUILDER) {
      if (!this._builderOnboardingDismissed) {
        this._builderOnboardingDismissed = true;
        return;
      }
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
  }

  /** Mouse-wheel: weapon cycling in play, row navigation in settings. */
  _inputWheel(deltaY) {
    if (this.state === GameState.SETTINGS) {
      const defs = getSettingsForCategory(
        this.isTouchDevice,
        this.settingsCategory,
      );
      if (!defs.length) return;
      const dir = deltaY > 0 ? 1 : -1;
      this.settingsSelection =
        (this.settingsSelection + dir + defs.length) % defs.length;
      this.audio.menuSelect();
      return;
    }
    if (this.state !== GameState.PLAYING) return;
    const count = this.player.weapons.length;
    if (count <= 1) return;
    const dir = deltaY > 0 ? 1 : -1;
    this.player.currentWeapon =
      (this.player.currentWeapon + dir + count) % count;
  }

  /** Reacts to pointer lock acquire/release. */
  _inputLockChange(locked, wasLocked) {
    if (this.isTouchDevice) return; // touch controls manage their own state
    // Only auto-pause if we lost lock without ESC (e.g. alt-tab)
    if (wasLocked && !locked && this.state === GameState.PLAYING) {
      const now = performance.now();
      if (now - this.lastEscTime > 200) {
        this.pauseGame(GameState.PLAYING);
      }
    }
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
        this.pauseGame(GameState.BUILDER);
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
      const catLen = CREATOR_CATEGORIES.length;

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

      const curCat = CREATOR_CATEGORIES[this.creatorCategory];
      const itemLen = curCat.data.length;

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
        let next = (this.character[curCat.key] - 1 + itemLen) % itemLen;
        // Skip locked loadouts
        if (this.creatorCategory === 5) {
          for (let tries = 0; tries < itemLen; tries++) {
            if (curCat.data[next].unlocked !== false) break;
            next = (next - 1 + itemLen) % itemLen;
          }
        }
        this.character[curCat.key] = next;
        this.audio.menuSelect();
        return;
      }
      if (code === "ArrowDown" || code === "KeyS") {
        let next = (this.character[curCat.key] + 1) % itemLen;
        // Skip locked loadouts
        if (this.creatorCategory === 5) {
          for (let tries = 0; tries < itemLen; tries++) {
            if (curCat.data[next].unlocked !== false) break;
            next = (next + 1) % itemLen;
          }
        }
        this.character[curCat.key] = next;
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
      if (this.mode === "tutorial" && this.tutorialStep === 15) {
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

      // Tutorial (non-sandbox steps): ESC pauses (same as normal gameplay)
      if (this.mode === "tutorial" && this.tutorialStep < 15) {
        if (code === "Escape") {
          const now = performance.now();
          if (now - this.lastEscTime < 200) return;
          this.lastEscTime = now;
          this.pauseGame(GameState.PLAYING);
          return;
        }
      }

      // Meltdown upgrade selection overlay — intercept keys before weapon switching
      if (this._meltdownUpgradeChoices) {
        const choices = this._meltdownUpgradeChoices;
        if (code === "Digit1" && choices.length > 0) {
          this.meltdown.selectUpgrade(0);
          this._meltdownUpgradeChoices = null;
          this.audio.menuConfirm();
          return;
        }
        if (code === "Digit2" && choices.length > 1) {
          this.meltdown.selectUpgrade(1);
          this._meltdownUpgradeChoices = null;
          this.audio.menuConfirm();
          return;
        }
        if (code === "Digit3" && choices.length > 2) {
          this.meltdown.selectUpgrade(2);
          this._meltdownUpgradeChoices = null;
          this.audio.menuConfirm();
          return;
        }
        // Arrow keys + Enter navigation
        if (code === "ArrowLeft" || code === "ArrowUp") {
          this._meltdownUpgradeSel = Math.max(0, this._meltdownUpgradeSel - 1);
          this.audio.menuNav();
          return;
        }
        if (code === "ArrowRight" || code === "ArrowDown") {
          this._meltdownUpgradeSel = Math.min(
            choices.length - 1,
            this._meltdownUpgradeSel + 1,
          );
          this.audio.menuNav();
          return;
        }
        if (code === "Enter" || code === "Space") {
          this.meltdown.selectUpgrade(this._meltdownUpgradeSel);
          this._meltdownUpgradeChoices = null;
          this.audio.menuConfirm();
          return;
        }
        return; // Block all other input while upgrade overlay is shown
      }

      // Weapon switching (slots 1-8)
      const prevWeapon = this.player.currentWeapon;
      const weaponSlots = [
        this.keybinds.weapon1,
        this.keybinds.weapon2,
        this.keybinds.weapon3,
        this.keybinds.weapon4,
        this.keybinds.weapon5,
        this.keybinds.weapon6,
        this.keybinds.weapon7,
        this.keybinds.weapon8,
      ];
      const slotIdx = weaponSlots.indexOf(code);
      if (slotIdx !== -1 && this.player.weapons.length > slotIdx)
        this.player.currentWeapon = slotIdx;
      if (this.player.currentWeapon !== prevWeapon) {
        this.triggerAriaOnce("weaponSwitch", "weaponSwitch");
        if (this.mode === "tutorial") this.tutorialWeaponSwapped = true;
      }

      if (code === this.keybinds.interact) this.interact();
      // Meltdown hero ability (Q key)
      if (code === "KeyQ" && this.mode === "meltdown" && this.meltdown.alive) {
        const abilityResult = this.meltdown.useAbility();
        if (abilityResult) {
          if (abilityResult.type === "dash")
            this.meltdown.speed += abilityResult.speedBoost;
          this.audio.menuConfirm();
        }
      }
      if (code === this.keybinds.pause || code === "KeyP") {
        const now = performance.now();
        if (now - this.lastEscTime < 200) return;
        this.lastEscTime = now;
        this.pauseGame(GameState.PLAYING);
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
        this.resumeGame();
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
        this.audio.startTrack("menu");
        this.audio.startAmbient("menu");
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
      if (code === "KeyT") {
        this.state = GameState.STATS;
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
      // Category-aware navigation: Q/E = category, W/S/↑/↓ = navigate, A/D/←/→ = value, Enter/Space = cycle
      const cats = getVisibleCategories(this.isTouchDevice);
      const catIdx = cats.indexOf(this.settingsCategory);
      const settingsDef = getSettingsForCategory(
        this.isTouchDevice,
        this.settingsCategory,
      );
      const settingsCount = settingsDef.length;

      // Switch category: Q = prev, E = next
      if (code === "KeyQ") {
        const next = (catIdx - 1 + cats.length) % cats.length;
        this.settingsCategory = cats[next];
        this.settingsSelection = 0;
        this.audio.menuSelect();
        return;
      }
      if (code === "KeyE") {
        const next = (catIdx + 1) % cats.length;
        this.settingsCategory = cats[next];
        this.settingsSelection = 0;
        this.audio.menuSelect();
        return;
      }

      // Move selection within category
      if (code === "ArrowUp" || code === "KeyW") {
        this.settingsSelection =
          (this.settingsSelection - 1 + settingsCount) % settingsCount;
        this.audio.menuSelect();
        return;
      }
      if (code === "ArrowDown" || code === "KeyS") {
        this.settingsSelection = (this.settingsSelection + 1) % settingsCount;
        this.audio.menuSelect();
        return;
      }

      // Change setting value — Enter/Space cycle forward, Left/A decrement, Right/D increment
      const stepDir =
        code === "ArrowLeft" || code === "KeyA"
          ? -1
          : code === "ArrowRight" ||
              code === "KeyD" ||
              code === "Enter" ||
              code === "Space"
            ? 1
            : 0;
      if (stepDir !== 0) {
        const def = settingsDef[this.settingsSelection];
        if (def) {
          applySettingStep(this.settings, def, stepDir);
          if (def.onChange) def.onChange(this);
          this.audio.menuConfirm();
        }
        return;
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
          // Reset to defaults (mutate in place so the InputManager alias stays valid)
          Object.assign(this.keybinds, DEFAULT_KEYBINDS);
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

    if (this.state === GameState.STATS) {
      if (code === "Escape") {
        const now = performance.now();
        if (now - this.lastEscTime < 200) return;
        this.lastEscTime = now;
        if (this._statsReturnToMenu) {
          this._statsReturnToMenu = false;
          this.state = GameState.MODE_SELECT;
        } else {
          this.state = GameState.PAUSED;
        }
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
      // NG+ prompt handling on victory screen
      if (this.state === GameState.VICTORY && this.ngPlusPrompt) {
        if (code === "ArrowLeft" || code === "ArrowUp") {
          this.ngPlusPromptSel = 0;
          this.audio.menuNav();
        } else if (code === "ArrowRight" || code === "ArrowDown") {
          this.ngPlusPromptSel = 1;
          this.audio.menuNav();
        } else if (code === "Enter" || code === "Space") {
          if (this.transitioning) return;
          this.audio.menuConfirm();
          if (this.ngPlusPromptSel === 0) {
            this.fadeTransition(() => this.startNgPlus());
          } else {
            this.fadeTransition(() => {
              this.ngPlusPrompt = false;
              this.clearCampaignSave();
              this.state = GameState.TITLE;
              this.audio.stopMusic();
              this.audio.startTrack("menu");
              this.audio.startAmbient("menu");
            });
          }
        }
        if (code === "KeyS") {
          this._shareCurrentResult();
        }
        return;
      }
      if (code === "Enter" || code === "Space") {
        if (this.transitioning) return;
        this.audio.menuConfirm();
        this.fadeTransition(() => {
          this.state = GameState.TITLE;
          this.audio.stopMusic();
          this.audio.startTrack("menu");
          this.audio.startAmbient("menu");
        });
      }
      if (code === "KeyR" && this.state === GameState.GAME_OVER) {
        if (this.transitioning) return;
        this.audio.menuConfirm();
        this.fadeTransition(() => {
          if (this.mode === "arena") this.startArena();
          else if (this.mode === "meltdown") this.startMeltdown();
          else if (this.mode === "campaign") this.startCampaign();
        });
      }
      if (code === "KeyS") {
        this._shareCurrentResult();
      }
      return;
    }

    if (this.state === GameState.LEVEL_COMPLETE) {
      if (code === "Enter" || code === "Space") {
        if (this.transitioning) return;
        this.audio.menuConfirm();
        this.fadeTransition(() => this.nextCampaignLevel());
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
  // ── Save/Load (delegated to SaveSystem) ──────────────────
  saveSettings() {
    Save.saveSettings(this.settings);
    this.input.saveKeybinds();
  }

  loadSettings() {
    Save.loadSettings(this.settings);
  }

  _applyMobileMigration() {
    Save.applyMobileMigration(this.isTouchDevice, this.settings, () =>
      this.saveSettings(),
    );
  }

  loadDevFlags() {
    this.alwaysShowTutorial = Save.loadDevFlags();
  }

  saveCharacter() {
    Save.saveCharacter(this.character);
  }

  loadCharacter() {
    Save.loadCharacter(this.character);
  }

  setAlwaysTutorial(on) {
    this.alwaysShowTutorial = on;
    Save.setAlwaysTutorial(on);
  }

  saveAchievements() {
    this.achievementSystem.save();
  }
  loadAchievements() {
    this.achievementSystem.load();
  }
  unlockAchievement(id) {
    this.achievementSystem.unlockAchievement(id);
  }
  checkAchievements() {
    this.achievementSystem.checkAchievements(this.player.score);
  }

  updateAchievementToast(dt) {
    const fx = this.achievementSystem.updateToast(dt);
    if (fx.playSound) this.audio.pickup();
  }

  renderAchievementToast(ctx, w, h) {
    this.achievementSystem.renderToast(ctx, w, h);
  }

  // ── ARIA in-game comms (delegated to AriaCommsSystem) ──
  queueAriaMessage(category) {
    this.ariaComms.queueMessage(category, this.arenaRound);
  }

  triggerAriaOnce(key, category) {
    this.ariaComms.triggerOnce(key, category, this.arenaRound);
  }

  updateAriaComms(dt) {
    this.ariaComms.update(dt, this.state === GameState.PLAYING);
    this.squadComms.update(dt);
  }

  renderAriaComms(ctx, w, h) {
    this.ariaComms.renderMessage(
      ctx,
      w,
      h,
      this.character.name,
      this.isTouchDevice,
    );
  }

  saveArena() {
    Save.saveArena(
      this.arenaRound,
      this.player,
      this.upgradeLevels,
      this.settings.difficulty,
    );
  }

  // TODO: Reconsider current arena loading. Better system or no loading at all? This will get tricky to track if we add different maps, procedural generation, additional random upgrades. Too much *randomness* to track reliably
  loadArena() {
    const data = Save.loadArenaData();
    if (!data) return false;
    this.mode = "arena";
    this.arenaRound = data.round;
    this.player.reset();
    this.player.deserialize(data);
    this.upgradeLevels = data.upgradeLevels || {};
    this.settings.difficulty = data.difficulty ?? this.settings.difficulty;
    this.startArenaRound();
    return true;
  }

  clearArenaSave() {
    Save.clearArenaSave();
  }

  saveCampaign() {
    this.campaign.save();
  }

  loadCampaignSave() {
    return this.campaign.load();
  }

  clearCampaignSave() {
    this.campaign.clearSave();
  }

  /** Enter New Game Plus — keep weapons & score, reset to Act 1, bump cycle */
  startNgPlus() {
    this.campaign.startNgPlus();
  }

  hasSave() {
    return Save.hasSave();
  }
  getSaveInfo() {
    return Save.getSaveInfo();
  }

  // --- Asset Editor Hooks ---
  getAssetMetadata(category) {
    if (category === "enemies") return ENEMY_TYPES;
    if (category === "weapons") {
      const map = {};
      WEAPONS.forEach((w) => (map[w.name] = w));
      return map;
    }
    return {};
  }

  getAssetConfig(category, id) {
    if (category === "enemies") return ENEMY_TYPES[id];
    if (category === "weapons") return WEAPONS.find((w) => w.name === id);
    return null;
  }

  updateAssetLive(category, id, key, val) {
    const asset = this.getAssetConfig(category, id);
    if (asset) {
      asset[key] = val;
      // If it's a weapon, we might need to update the player's current weapon def reference
      // However, most entities read from these objects dynamically or at spawn.
    }
  }

  getDifficultyMultipliers() {
    return _getDifficultyMultipliers(this.settings.difficulty);
  }

  startArena() {
    this.mode = "arena";
    this.arenaRound = 1;
    this.achievementStats.totalGamesPlayed++;
    this.player.reset();
    this.applyLoadoutBonuses();
    this.upgradeLevels = {};
    this.ariaEnabled = true;
    this.ariaTriggered = {};
    this.queueAriaMessage("arenaStart");
    this.queueAriaMessage("arenaIntro");
    this.startArenaRound();
  }

  startMeltdown(heroKey = "agent", ironman = false) {
    this.mode = "meltdown";
    this.achievementStats.totalGamesPlayed++;
    this.player.reset();
    this.applyLoadoutBonuses();
    this.ariaEnabled = true;
    this.ariaTriggered = {};

    // Generate the meltdown corridor
    const mMap = this.meltdown.start(heroKey, ironman);
    this.map = mMap;
    this._meltdownUpgradeChoices = null;
    this._meltdownUpgradeSel = 0;

    // Place player at start
    this.player.x = mMap.playerStart.x;
    this.player.y = mMap.playerStart.y;
    this.player.angle = mMap.playerStart.dir;
    this.player.alive = true;

    // Lock player rotation — they always face forward (north / -PI/2)
    this.meltdownLockAngle = true;

    // Spawn entities
    this.entities = [];
    this.dustMotes = null;
    this.projectiles = [];
    this._chronoBombs = [];
    const diff = this.getDifficultyMultipliers();

    this.entities.push(...createMeltdownEnemies(mMap.enemySpawns, diff));
    this.entities.push(...createMeltdownPickups(mMap.pickupSpawns));

    this.totalEnemies = mMap.enemySpawns.length;
    this.killedEnemies = 0;
    this.roundStartTime = performance.now();

    this.state = GameState.PLAYING;
    this.audio.startTrack("meltdown");
    this.audio.startAmbient("meltdown");
    this.lockPointer();
  }

  startArenaRound() {
    // TODO: Refactor as we don't properly clean the Arena between rounds, we just reset the player and spawn new enemies on top. Deep cloning will cause performance issues on later levels. Clear entities properly after levels
    // Rotate maps each round
    const mapIdx = (this.arenaRound - 1) % ARENA_MAPS.length;
    this.map = structuredClone(ARENA_MAPS[mapIdx]);
    this.player.x = this.map.playerStart.x;
    this.player.y = this.map.playerStart.y;
    this.player.angle = this.map.playerStart.dir;
    this.player.alive = true;
    this.arenaTimer = 60;
    this.arenaClearTimer = null;
    this.entities = [];
    this.dustMotes = null;
    this.projectiles = [];
    this._chronoBombs = [];

    const diff = this.getDifficultyMultipliers();
    this.arenaTimer = Math.max(30, 60 + diff.timerBonus);

    // Spawn enemies — filter spawns, create scaled enemies, create pickups
    const validSpawns = filterArenaSpawns(
      this.map.enemySpawns,
      this.player.x,
      this.player.y,
      this.map.grid,
    );
    this.entities.push(
      ...createArenaEnemies(this.arenaRound, validSpawns, diff),
    );
    this.entities.push(
      ...createArenaPickups(this.map.pickups, this.arenaRound, this.map),
    );

    this.killedEnemies = 0;
    this.totalEnemies = this.entities.filter((e) => e.type === "enemy").length;
    this.roundDamageTaken = 0;
    this.killStreakSystem.reset();
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.slowMoTimer = 0;
    this.timeScale = 1;
    this.ariaCombatTimer = 0;

    this.state = GameState.PLAYING;
    this.roundStartTime = performance.now();
    this.audio.startTrack("arena", 140 + this.arenaRound * 5);
    this.audio.startAmbient("arena");

    // Arena milestone ARIA callouts
    if (this.arenaRound === 5)
      this.triggerAriaOnce("arenaRound5_comm", "arenaRound5");
    else if (this.arenaRound === 10)
      this.triggerAriaOnce("arenaRound10_comm", "arenaRound10");

    this.lockPointer();
  }

  startCampaign() {
    this.campaign.start();
  }

  showCampaignPrompt() {
    this.campaign.showPrompt();
  }

  executeCampaignPromptChoice(choice) {
    this.campaign.executePromptChoice(choice);
  }

  renderCampaignPrompt(ctx, w, h) {
    _renderCampaignPrompt(ctx, w, h, this.campaignPromptSelection || 0);
  }

  // ── Tutorial system ──────────────────────────────────────────────
  startTutorial() {
    this.tutorial.start();
  }

  initTutorialLevel() {
    this.tutorial.initLevel();
  }

  advanceTutorialStep() {
    this.tutorial.advanceStep();
  }

  updateTutorial(dt) {
    this.tutorial.update(dt);
  }

  spawnTrainingDummies() {
    this.tutorial.spawnDummies();
  }

  executeTutorialMenuChoice(choice) {
    this.tutorial.executeMenuChoice(choice);
  }

  executeTutorialCompletionChoice(choice) {
    this.tutorial.executeCompletionChoice(choice);
  }

  shouldShowTutorial() {
    return this.tutorial.shouldShow();
  }

  renderTutorialOverlay(ctx, w, h) {
    _renderTutorialOverlay(ctx, w, h, {
      mode: this.mode,
      isTouchDevice: this.isTouchDevice,
      tutorialStepTime: this.tutorialStepTime,
      tutorialStep: this.tutorialStep,
    });
  }

  renderTutorialCompletionMenu(ctx, w, h) {
    _renderTutorialCompletionMenu(ctx, w, h, this.tutorialMenuSelection || 0);
  }

  _makeScanlinePattern(ctx, alpha, step) {
    /* forwarded to src/ui/scanlines.js */
  }

  _drawScanlines(ctx, w, h, dense) {
    drawScanlines(ctx, w, h, dense);
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
    _renderCharacterCreator(
      ctx,
      w,
      h,
      this.creatorCategory,
      this.character,
      this.isTouchDevice,
    );
  }

  _exitCreator(saved) {
    if (saved) {
      this.saveCharacter();
      trackEvent("character_create", {
        loadout_class: this.character.loadoutClass || "default",
      });
    } else this.loadCharacter();
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
    const h = this.canvas.height;
    const isMobile = this.isTouchDevice && w < 700;
    const categories = CREATOR_CATEGORIES;
    const L = getCreatorLayout(w, h, isMobile);

    // Tab click detection
    if (my >= L.tabY && my <= L.tabY + L.tabH) {
      for (let i = 0; i < categories.length; i++) {
        const tx = L.tabX0 + i * (L.tabW + L.tabGap);
        if (mx >= tx && mx <= tx + L.tabW) {
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

    const maxVisible = Math.min(items.length, isMobile ? L.maxBySpace : 8);
    const selIdx = this.character[curCat.key];
    let scrollOff = 0;
    if (selIdx >= maxVisible) scrollOff = selIdx - maxVisible + 1;

    if (mx >= L.contentX && mx <= L.contentX + L.listW) {
      for (let vi = 0; vi < maxVisible; vi++) {
        const idx = vi + scrollOff;
        if (idx >= items.length) break;
        const iy = L.contentY + 8 + vi * L.itemH;
        if (my >= iy && my <= iy + L.itemH) {
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
    );
  }

  renderTutorialMenu(ctx, w, h) {
    _renderTutorialMenu(ctx, w, h, this.tutorialMenuSelection || 0);
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

  // ── Fade Transition System ──────────────────────────────────────────
  /**
   * Start a fade-to-black transition.  The screen fades out over ~0.4s,
   * then `callback` is invoked (state changes / level loads go here),
   * then the screen fades back in over ~0.4s.
   */
  fadeTransition(callback) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.transitionAlpha = 0;
    this._transitionDir = 1; // fading out
    this._transitionCallback = callback;
  }

  /** Tick the transition each frame (called before state-specific update). */
  _tickTransition(dt) {
    if (!this.transitioning) return;
    this.transitionAlpha += this._transitionDir * this._transitionSpeed * dt;

    if (this._transitionDir === 1 && this.transitionAlpha >= 1) {
      // Peak black — fire callback
      this.transitionAlpha = 1;
      if (this._transitionCallback) {
        this._transitionCallback();
        this._transitionCallback = null;
      }
      this._transitionDir = -1; // fade back in
    } else if (this._transitionDir === -1 && this.transitionAlpha <= 0) {
      // Fade-in complete
      this.transitionAlpha = 0;
      this.transitioning = false;
      this._transitionDir = 0;
    }
  }

  /** Draw the transition overlay on top of everything. */
  _renderTransitionOverlay(ctx, w, h) {
    if (!this.transitioning || this.transitionAlpha <= 0) return;
    ctx.fillStyle = `rgba(0,0,0,${this.transitionAlpha})`;
    ctx.fillRect(0, 0, w, h);
  }

  updateCutscene() {
    this.cutsceneEngine.update();
    // If cutscene ended during update (skip/complete), state was already
    // changed by the onComplete callback or we need to handle it here
    if (!this.cutsceneEngine.isActive && this.state === GameState.CUTSCENE) {
      // Cutscene ended without a callback setting state — shouldn't normally
      // happen, but guard against it
      this.state = GameState.TITLE;
      this.audio.startTrack("menu");
      this.audio.startAmbient("menu");
    }
  }

  renderCutscene(ctx, w, h) {
    this.cutsceneEngine.render(ctx, w, h);
  }

  loadCampaignLevel(index) {
    this.campaign.loadLevel(index);
  }

  _applyActEnemyRoster() {
    this.campaign._applyActEnemyRoster();
  }

  nextCampaignLevel() {
    this.campaign.nextLevel();
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
        this.achievementStats.totalSecretsFound++;
        this.player.score += 500;
        this.audio.secretFound();
        this.queueAriaMessage("secretFound");
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
    _fireWeapon(this);
  }

  _onEnemyKill(enemy) {
    _onEnemyKill(this, enemy);
  }

  hitscan(angle, damage, range) {
    _hitscan(this, angle, damage, range);
  }

  damageEnemy(enemy, damage) {
    _damageEnemy(this, enemy, damage);
  }

  damagePlayer(amount, attacker) {
    const prevHp = this.player.health;
    _damagePlayer(this, amount, attacker);
    // Squad low-HP reaction: fires once per level when crossing 30% threshold
    if (this.squadComms && this.player.alive && this.player.maxHealth > 0) {
      const prevRatio = prevHp / this.player.maxHealth;
      const curRatio = this.player.health / this.player.maxHealth;
      if (prevRatio > 0.3 && curRatio <= 0.3) this.squadComms.onLowHealth();
    }
  }

  update(timestamp) {
    const realDt = (timestamp - this.lastFrameTime) / 1000;
    this.deltaTime = Math.min(0.033, realDt); // 30fps floor — prevents physics explosion
    // Accumulate lifetime play time using unclamped real time
    this.achievementStats.totalTimePlayed += realDt;
    this.lastFrameTime = timestamp;
    // Sim-time advances by clamped dt so all gameplay systems (enemy cooldowns,
    // attack timers, EMP disable) stay in sync with movement on slow machines.
    // Visual-only code (Math.sin animations) can use this.wallTime instead.
    this.time = (this.time || 0) + this.deltaTime * 1000;
    this.wallTime = timestamp;

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

    // Fade transition tick (runs in any state)
    this._tickTransition(this.deltaTime);

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

    // Shift + U toggle for Asset Editor
    if (this.keys["ShiftLeft"] && this.keys["KeyU"]) {
      this.keys["KeyU"] = false; // debounce
      this.assetEditor.toggle();
    }
    if (this.assetEditor.active) return; // Pause game logic but keep rendering

    // Death transition timer
    if (!this.player.alive) {
      if (this.deathTimer > 0) {
        this.deathTimer -= this.deltaTime;
        if (this.deathTimer <= 0) {
          if (this.mode === "playtest") {
            this.exitBuilderPlayTest();
            return;
          }
          this.checkAchievements(); // Sync final score/stats before game over
          this.state = GameState.GAME_OVER;
          this.audio.stopMusic();
          trackEvent("player_death", {
            mode: this.mode,
            round: this.arenaRound,
            cause: "health",
            time_seconds: Math.floor(
              (performance.now() - this.roundStartTime) / 1000,
            ),
          });
          if (this.mode === "arena") this.clearArenaSave();
          // No longer clearing campaign save on death to allow per-level checkpoints
          this.unlockPointer();
        }
      }
      return;
    }

    const dt = this.deltaTime * this.timeScale;

    // Chrono Shift activation (hold-to-activate, like sprint)
    // Need 15 energy to engage; once active, stays on until key released or energy depleted
    const chronoKeyHeld = !!this.keys[this.keybinds.chronoShift];
    if (
      chronoKeyHeld &&
      !this.player.chronoActive &&
      this.player.chronoEnergy >= 15
    ) {
      this.player.chronoActive = true;
      if (this.mode === "tutorial") this.tutorialChronoUsed = true;
    } else if (this.player.chronoActive && !chronoKeyHeld) {
      this.player.chronoActive = false;
      this.timeScale = 1;
    }

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

    // Kill streak update (timer decay + display fade)
    this.killStreakSystem.update(this.deltaTime);

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
        trackEvent("round_complete", {
          mode: "arena",
          round: this.arenaRound - 1,
          kills: this.killedEnemies,
          time_seconds: 60,
        });
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
        // Arena milestone callouts
        if (this.arenaRound - 1 === 5) this.queueAriaMessage("arenaRound5");
        if (this.arenaRound - 1 === 10) this.queueAriaMessage("arenaRound10");
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
    const _profilePlayerStart = performance.now();
    this.updatePlayer(dt);

    // ── Meltdown auto-forward ──
    if (this.mode === "meltdown" && this.meltdown.alive) {
      // Allow limited horizontal look: ±60° from forward (+Y / PI/2)
      const fwd = Math.PI / 2;
      const maxTurn = Math.PI / 3;
      let a = this.player.angle;
      // Normalize angle to [fwd - PI, fwd + PI]
      while (a - fwd > Math.PI) a -= Math.PI * 2;
      while (a - fwd < -Math.PI) a += Math.PI * 2;
      if (a > fwd + maxTurn) a = fwd + maxTurn;
      if (a < fwd - maxTurn) a = fwd - maxTurn;
      this.player.angle = a;

      const mResult = this.meltdown.update(dt, this.player.x, this.player.y);

      // Sync meltdown damage multiplier to player (for weapon system)
      this.player.damageMultiplier = this.meltdown.damageMultiplier;

      // Apply auto-forward movement (+Y direction) with collision
      // Braking: holding back key slows to 50% but costs stamina
      const kb = this.keybinds;
      const brakingHeld = this.keys[kb.moveBack] || this.keys["ArrowDown"];
      let effectiveMoveY = mResult.moveY;
      if (brakingHeld && effectiveMoveY > 0) {
        const brakeCost = 15 * dt; // stamina per second when braking
        if (this.player.stamina > 0) {
          this.player.stamina = Math.max(0, this.player.stamina - brakeCost);
          effectiveMoveY *= 0.5;
          this.player._meltdownBraking = true;
        } else {
          this.player._meltdownBraking = false;
        }
      } else {
        this.player._meltdownBraking = false;
      }
      const margin = 0.2;
      const newY = this.player.y + effectiveMoveY;
      const phasing =
        this.meltdown.abilityActive && this.meltdown.hero.ability === "phase";
      if (
        phasing ||
        this.isPassable(Math.floor(this.player.x), Math.floor(newY + margin))
      ) {
        this.player.y = newY;
      } else {
        // Can't move forward — take damage from impact
        this.player.health -= 5 * dt;
      }

      // Extend map when approaching the end
      for (const ev of mResult.events) {
        // Meltdown event audio
        if (ev.type === "heatWarning") this.audio.meltdownSpeedUp();
        else if (ev.type === "milestone") this.audio.meltdownCollect();
        else if (ev.type === "abilityEnd") this.audio.meltdownHit();

        // Meltdown upgrade screen — pause run and show choices
        if (ev.type === "upgradeScreen") {
          this._meltdownUpgradeChoices = ev.choices;
          this._meltdownUpgradeSel = 0;
          this.audio.meltdownCollect();
        }

        if (ev.type === "extend") {
          const { enemySpawns, pickupSpawns } = this.meltdown.extend(25);
          const diff = this.getDifficultyMultipliers();
          for (const es of enemySpawns) {
            const et = ENEMY_TYPES[es.type] || ENEMY_TYPES.drone;
            const e = new Enemy(es.x, es.y, es.type);
            e.health = et.health * diff.healthMul;
            e.maxHealth = e.health;
            e.speed = et.speed * diff.speedMul;
            e.damage = (et.damage || 10) * diff.damageMul;
            e.aiType = et.aiType || "patrol";
            e.baseColor = et.baseColor || "#ff0000";
            e.darkColor = et.darkColor || "#880000";
            this.entities.push(e);
          }
          for (const pk of pickupSpawns) {
            this.entities.push(
              new Pickup(pk.x, pk.y, pk.type, { weaponId: pk.weaponId }),
            );
          }
          this.map.height = this.meltdown.map.height;
        }
      }

      // Despawn entities far behind the player to avoid accumulation
      const despawnY = this.player.y - 40;
      this.entities = this.entities.filter(
        (e) => e.y > despawnY || e.y > this.player.y,
      );

      // Hazard damage
      if (mResult.hazardDmg > 0) {
        this.player.health -= mResult.hazardDmg;
        if (this.screenShake < 2) this.screenShake = 2;
      }

      // ARIA messages
      if (mResult.ariaMsg) {
        this._meltdownAriaText = mResult.ariaMsg;
        this._meltdownAriaTimer = 4;
      }
      if (this._meltdownAriaTimer > 0) {
        this._meltdownAriaTimer -= dt;
        if (this._meltdownAriaTimer <= 0) this._meltdownAriaText = null;
      }

      // Heal from upgrades (Nano-Repair Pulse)
      if (mResult.healAmount > 0) {
        this.player.health = Math.min(
          this.player.maxHealth,
          this.player.health + mResult.healAmount,
        );
      }

      // Death check — temporal anchor can save once
      if (this.player.health <= 0) {
        if (this.meltdown.onFatalHit()) {
          this.player.health = 1;
          this.screenShake = Math.max(this.screenShake, 10);
        } else {
          this.player.health = 0;
          this.player.alive = false;
          this.audio.meltdownDeath();
          this.meltdown.onDeath();
          this.deathTimer = 1.5;
        }
      }
    }

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

    // Weapon kick recovery (framerate-invariant)
    this.player.weaponKick *= decay(0.85, this.deltaTime);
    if (this.player.weaponKick < 0.01) this.player.weaponKick = 0;
    this.profiler.currentPhases.player =
      performance.now() - _profilePlayerStart;

    // Clean up dead entities (keep recently-dead for death animation)
    // In-place compaction avoids creating a new array every frame
    if (this.entities.length > 30) {
      let write = 0;
      for (let i = 0; i < this.entities.length; i++) {
        const e = this.entities[i];
        if (
          e.active ||
          (e.deathTime != null && this.time - e.deathTime < 2000)
        ) {
          this.entities[write++] = e;
        }
      }
      this.entities.length = write;
    }

    // Populate spatial grid for O(1) proximity queries
    this.entityGrid.clear();
    this.entityGrid.insertAll(this.entities);

    // Update enemies
    const _profileEnemiesStart = performance.now();
    this.updateEnemies(dt);
    this.profiler.currentPhases.enemies =
      performance.now() - _profileEnemiesStart;

    // Update projectiles
    const _profileProjectilesStart = performance.now();
    this.updateProjectiles(dt);
    this.profiler.currentPhases.projectiles =
      performance.now() - _profileProjectilesStart;

    // Check pickups
    const _profilePickupsStart = performance.now();
    this.checkPickups();
    this.profiler.currentPhases.pickups =
      performance.now() - _profilePickupsStart;

    // Misc: exit check, decay, achievements
    const _tMisc0 = performance.now();

    // Check exit (campaign)
    if (this.mode === "campaign" && this.exitEntity && this.exitEntity.active) {
      const dx = this.player.x - this.exitEntity.x;
      const dy = this.player.y - this.exitEntity.y;
      if (dx * dx + dy * dy < 1.0) {
        this.state = GameState.LEVEL_COMPLETE;
        this._levelCompleteTime = performance.now();
        this.audio.stopMusic();
        this.audio.roundComplete();
        this.unlockPointer();
        this.queueAriaMessage("levelComplete");
      }
    }

    // Check exit (playtest) — reaching exit ends the playtest
    if (this.mode === "playtest" && this.exitEntity && this.exitEntity.active) {
      const dx = this.player.x - this.exitEntity.x;
      const dy = this.player.y - this.exitEntity.y;
      if (dx * dx + dy * dy < 1.0) {
        if (!this._playtestEndTimer) {
          this._playtestEndTimer = 1.5;
        }
      }
    }

    // screen shake decay (framerate-invariant)
    this.screenShake *= decay(0.9, this.deltaTime);
    if (this.screenShake < 0.1) this.screenShake = 0;

    // Update VFX particles
    this.updateParticles(dt);

    // Glitch effect decay (framerate-invariant)
    this.glitchEffect *= decay(0.95, this.deltaTime);
    if (this.glitchEffect < 0.01) this.glitchEffect = 0;

    // Hit marker decay
    if (this.hitMarker > 0) {
      this.hitMarker -= dt;
      if (this.hitMarker < 0) this.hitMarker = 0;
    }

    // Damage numbers decay
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      this.damageNumbers[i].life -= dt;
      if (this.damageNumbers[i].life <= 0) {
        this.damageNumbers[i] =
          this.damageNumbers[this.damageNumbers.length - 1];
        this.damageNumbers.pop();
      }
    }

    // Achievement checks (periodic, not every frame)
    this.checkAchievements();
    this.updateAchievementToast(dt);
    this.updateAriaComms(dt);
    this.profiler.currentPhases.misc = performance.now() - _tMisc0;
  }

  triggerDash(code, rawDirX, rawDirY) {
    const triggered = this.playerUpdateSystem.triggerDash(
      { player: this.player, keybinds: this.keybinds },
      code,
      rawDirX,
      rawDirY,
    );
    if (triggered) {
      if (this.mode === "tutorial") this.tutorialDashed = true;
      this.achievementStats.totalDashes++;
      this.triggerAriaOnce("dash", "dashUsed");
    }
  }

  updatePlayer(dt) {
    const flags = this.playerUpdateSystem.update(
      {
        player: this.player,
        keys: this.keys,
        keybinds: this.keybinds,
        mouse: this.mouse,
        settings: this.settings,
        mode: this.mode,
        map: this.map,
        audio: this.audio,
        noclip: !!this._noclip,
      },
      dt,
    );
    if (flags) {
      if (flags.tutorialSlid) this.tutorialSlid = true;
      if (flags.tutorialCrouched) this.tutorialCrouched = true;
    }
  }

  isPassable(mx, my) {
    return _isPassable(this.map, mx, my);
  }

  // TODO: Improve Enemy AI
  // ─── VFX / Particles ──────────────────────────────────────────────────────

  _spawnHitImpact(x, y, enemyColor, isCrit) {
    if (!this.player.particles) this.player.particles = [];
    _spawnHitImpact(this.player.particles, x, y, enemyColor, isCrit);
  }

  _spawnMuzzleFlash(wep) {
    if (!this.player.particles) this.player.particles = [];
    _spawnMuzzleFlash(this.player.particles, this.player, wep);
  }

  spawnDeathParticles(x, y, c1, c2) {
    if (!this.player.particles) this.player.particles = [];
    _spawnDeathParticles(this.player.particles, x, y, c1, c2);
  }

  spawnWallSparks(x, y) {
    if (!this.player.particles) this.player.particles = [];
    _spawnWallSparks(this.player.particles, x, y);
  }

  spawnPickupBurst(x, y, pickupType) {
    if (!this.player.particles) this.player.particles = [];
    _spawnPickupBurst(this.player.particles, x, y, pickupType);
  }

  updateParticles(dt) {
    this.dustMotes = _updateParticles(
      this.player.particles,
      dt,
      this.timeScale,
      this.dustMotes,
      this.player,
    );
  }

  updateEnemies(dt) {
    const fx = this.aiSystem.update(
      {
        entities: this.entities,
        player: this.player,
        map: this.map,
        time: this.time,
        timeScale: this.timeScale,
        projectiles: this.projectiles,
        chronoBombs: this._chronoBombs,
        damageNumbers: this.damageNumbers,
        audio: this.audio,
      },
      dt,
    );
    // Apply side effects
    for (const call of fx.damagePlayerCalls)
      this.damagePlayer(call.damage, call.attacker);
    this.screenShake = Math.max(this.screenShake, fx.screenShake);
    if (fx.hudDisabledUntil != null)
      this._hudDisabledUntil = fx.hudDisabledUntil;
    for (const msg of fx.ariaMessages) this.queueAriaMessage(msg);
    this.totalEnemies += fx.totalEnemiesAdded;
    // Filter detonated chrono-bombs
    this._chronoBombs = this._chronoBombs.filter((b) => b.active);
  }

  hasLineOfSight(x1, y1, x2, y2) {
    return _hasLineOfSight(this.map, x1, y1, x2, y2);
  }

  updateProjectiles(dt) {
    _updateProjectiles(
      {
        projectiles: this.projectiles,
        entities: this.entities,
        entityGrid: this.entityGrid,
        map: this.map,
        player: this.player,
        time: this.time,
        audio: this.audio,
        spawnWallSparks: (x, y) => this.spawnWallSparks(x, y),
        damageEnemy: (e, d) => this.damageEnemy(e, d),
        damagePlayer: (d) => this.damagePlayer(d),
      },
      dt,
    );
  }

  checkPickups() {
    // Spatial grid query — only check entities within pickup range (1.0 unit)
    const nearby = this.entityGrid.query(this.player.x, this.player.y, 1.0);
    for (const e of nearby) {
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

      // In tutorial, block pickups until step 10 ("Resupply")
      if (this.mode === "tutorial" && this.tutorialStep < 10) {
        if (e.type === "health" || e.type === "ammo") continue;
      }

      if (e.type === "health") {
        if (this.player.health >= this.player.maxHealth) continue;
        this.player.health = Math.min(
          this.player.maxHealth,
          this.player.health + 25,
        );
        e.active = false;
        this.spawnPickupBurst(e.x, e.y, "health");
        this.audio.pickup();
        this.triggerAriaOnce("healthPickup", "healthPickup");
        if (this.mode === "tutorial" && this.tutorialStep === 10)
          this.tutorialPickedUp = true;
        if (this.mode === "tutorial") e._respawnAt = performance.now() + 8000;
      } else if (e.type === "ammo") {
        this.player.ammo = Math.min(999, this.player.ammo + 20);
        e.active = false;
        this.spawnPickupBurst(e.x, e.y, "ammo");
        this.audio.pickup();
        if (this.mode === "tutorial" && this.tutorialStep === 10)
          this.tutorialPickedUp = true;
        if (this.mode === "tutorial") e._respawnAt = performance.now() + 8000;
      } else if (e.type === "weapon") {
        if (!this.player.weapons.includes(e.weaponId)) {
          this.player.weapons.push(e.weaponId);
          this.player.currentWeapon = this.player.weapons.length - 1;
          this.audio.pickup();
          this.queueAriaMessage("weaponPickup");
        }
        this.player.ammo = Math.min(999, this.player.ammo + 30);
        e.active = false;
        this.spawnPickupBurst(e.x, e.y, "weapon");
        _spawnEnergyBurst(this.player.particles, e.x, e.y, {
          count: 8,
          r: 50,
          g: 200,
          b: 255,
        });
        if (this.mode === "tutorial") {
          if (this.tutorialWeaponPickedUp) {
            this.tutorialSecondWeaponPickedUp = true;
          }
          this.tutorialWeaponPickedUp = true;
          e._respawnAt = performance.now() + 8000;
        }
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
      this.hudCtx.clearRect(0, 0, this.hudW, this.hudH);
      this.renderCutscene(ctx, w, h);
      return;
    }

    if (this.state === GameState.CAMPAIGN_PROMPT) {
      this.hudCtx.clearRect(0, 0, this.hudW, this.hudH);
      this.renderCampaignPrompt(ctx, w, h);
      return;
    }

    if (this.state === GameState.TUTORIAL_COMPLETE) {
      this.hudCtx.clearRect(0, 0, this.hudW, this.hudH);
      this.renderTutorialCompletionMenu(ctx, w, h);
      return;
    }

    if (this.state === GameState.CHARACTER_CREATE) {
      this.hudCtx.clearRect(0, 0, this.hudW, this.hudH);
      this.renderCharacterCreator(ctx, w, h);
      return;
    }

    if (this.state === GameState.STATS && this._statsReturnToMenu) {
      this.hudCtx.clearRect(0, 0, this.hudW, this.hudH);
      this.renderStatsScreen(ctx, w, h);
      return;
    }

    if (this.state === GameState.BUILDER) {
      this.hudCtx.clearRect(0, 0, this.hudW, this.hudH);
      this.builder.render(ctx, w, h, this.time);
      if (!this._builderOnboardingDismissed) {
        this._renderBuilderOnboarding(ctx, w, h);
      }
      return;
    }

    // When paused from builder, render builder scene as the background
    if (
      this.state === GameState.PAUSED &&
      this.pausedFromState === GameState.BUILDER
    ) {
      this.builder.render(ctx, w, h, this.time);
      const hctx = this.hudCtx;
      const hw = this.hudW;
      const hh = this.hudH;
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

    // Render 3D scene — timed: raycast phase
    const _tRay0 = performance.now();
    // Camera vertical shift for crouch/slide
    const p = this.player;
    const yShift = p.isSliding ? 40 : p.isCrouching ? 28 : 0;
    this.renderer.renderScene(
      this.player,
      this.map,
      this.entities,
      this.time,
      this.settings.fov,
      this.settings.viewMode,
      false,
      yShift,
    );

    // Render atmospheric dust motes
    if (this.dustMotes && this.dustMotes.length > 0) {
      this.renderer.renderParticles(this.player, this.dustMotes, this.time);
    }

    ctx.restore();
    this.profiler.currentPhases.raycast = performance.now() - _tRay0;

    // Subtle ambient vignette (cached offscreen for performance)
    // Skipped when adaptive quality disables it
    const _tVig0 = performance.now();
    const _qVignette = !this.quality || this.quality.enableVignette;
    if (_qVignette) {
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
    }
    this.profiler.currentPhases.vignette = performance.now() - _tVig0;

    // Draw weapon (hidden in third person)
    const _tWpn0 = performance.now();
    if (this.settings.viewMode === 0) {
      this.drawWeapon(ctx, w, h);
    }

    // Draw player silhouette in third-person mode
    if (this.settings.viewMode === 1) {
      this.drawThirdPersonModel(ctx, w, h);
    }
    this.profiler.currentPhases.weapon = performance.now() - _tWpn0;

    // Effects: muzzle flash lighting, hurt flash, glitch, death fade
    const _tFx0 = performance.now();
    _renderPostFX(ctx, w, h, {
      time: this.time,
      muzzleFlashTime: this._muzzleFlashTime,
      muzzleFlashColor: this._muzzleFlashColor,
      player: this.player,
      glitchEffect: this.glitchEffect,
      canvas: this.canvas,
    });
    this.profiler.currentPhases.effects = performance.now() - _tFx0;

    // Render HUD on overlay canvas
    const _tHud0 = performance.now();
    this.renderHUD();

    // Tutorial overlay (rendered on game canvas, above HUD, below pause menus)
    if (this.mode === "tutorial") {
      this.renderTutorialOverlay(ctx, w, h);
    }
    this.profiler.currentPhases.hud = performance.now() - _tHud0;

    // Render overlay screens on HUD canvas (it's on top via z-index)
    const _tOvr0 = performance.now();
    const hctx = this.hudCtx;
    const hw = this.hudW;
    const hh = this.hudH;
    if (this.state === GameState.PAUSED) this.renderPauseScreen(hctx, hw, hh);
    if (this.state === GameState.SETTINGS)
      this.renderSettingsScreen(hctx, hw, hh);
    if (this.state === GameState.CONTROLS)
      this.renderControlsScreen(hctx, hw, hh);
    if (this.state === GameState.ACHIEVEMENTS)
      this.renderAchievementsScreen(hctx, hw, hh);
    if (this.state === GameState.STATS) this.renderStatsScreen(hctx, hw, hh);
    if (this.state === GameState.UPGRADE)
      this.renderUpgradeScreen(hctx, hw, hh);
    if (this.state === GameState.GAME_OVER) this.renderGameOver(hctx, hw, hh);
    if (this.state === GameState.VICTORY) this.renderVictory(hctx, hw, hh);
    if (this.state === GameState.LEVEL_COMPLETE)
      this.renderLevelComplete(hctx, hw, hh);
    this.profiler.currentPhases.overlays = performance.now() - _tOvr0;
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
    const charColor = CHARACTER_COLORS[this.character.colorIndex];
    const wep = this.player.getWeaponDef();
    renderWeapon(ctx, w, h, {
      wep,
      energyColor: charColor ? charColor.accent : wep?.color,
      isSprinting: this.player.isSprinting,
      isDashing: this.player.isDashing,
      weaponBob: this.player.weaponBob,
      weaponKick: this.player.weaponKick,
      weaponAnimFrame: this.weaponAnimFrame,
      time: this.time,
      isTouchDevice: this.isTouchDevice,
      drawGlow: _drawGlow,
    });
  }

  // HUD rendering — forwarded to src/ui/hud.js
  renderHUD() {
    _renderHUD(this);
  }

  // Multistage portrait — forwarded to src/ui/portrait.js
  drawPortrait(ctx, x, y, w, h) {
    _drawPortrait(ctx, x, y, w, h, {
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      alive: this.player.alive,
      time: this.time,
    });
  }

  drawCrosshairAt(ctx, cx, cy) {
    drawCrosshair(ctx, cx, cy, this.settings.crosshair);
  }

  drawMinimap(ctx, x, y, w, h) {
    _drawMinimap(ctx, x, y, w, h, {
      map: this.map,
      entities: this.entities,
      player: this.player,
      chronoBombs: this._chronoBombs,
      objectiveWaypoint: this.objectiveWaypoint,
    });
  }

  drawControlsOverlay(ctx, w, h, alpha) {
    _drawControlsOverlay(ctx, w, h, alpha, {
      keybinds: this.keybinds,
      mode: this.mode,
    });
  }

  renderPauseScreen(ctx, w, h) {
    const compact = this.isTouchDevice && isCompactPhone(h);
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, w, h);

    // ARIA log overlay
    if (this.showAriaLog) {
      this.renderAriaLog(ctx, w, h);
      return;
    }

    ctx.fillStyle = "#00ffcc";
    ctx.font = `bold ${compact ? 24 : 36}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", w / 2, compact ? h * 0.2 : h / 2 - 100);
    if (!compact) {
      this.drawControlsOverlay(ctx, w, h, 0.9);
    }
    ctx.font = `${compact ? 11 : 14}px monospace`;
    ctx.fillStyle = "#aaaacc";
    ctx.textAlign = "center";
    const saveHint = this.mode === "campaign" ? "  |  F to save" : "";
    if (!this.isTouchDevice) {
      ctx.fillText(
        "ESC / P to resume  |  S settings  |  C controls  |  A achievements  |  T stats  |  L ARIA log  |  Q quit" +
          saveHint,
        w / 2,
        h / 2 + 110,
      );
    }
    if (this.pauseSaveFlash && performance.now() - this.pauseSaveFlash < 1500) {
      const alpha = 1 - (performance.now() - this.pauseSaveFlash) / 1500;
      ctx.fillStyle = `rgba(0, 255, 100, ${alpha.toFixed(2)})`;
      ctx.font = `bold ${compact ? 13 : 16}px monospace`;
      ctx.fillText("GAME SAVED", w / 2, compact ? h * 0.7 : h / 2 + 140);
    }
    ctx.textAlign = "left";
  }

  renderAriaLog(ctx, w, h) {
    this.ariaComms.renderLog(ctx, w, h, this.character.name);
  }

  renderSettingsScreen(ctx, w, h) {
    _renderSettingsScreen(ctx, w, h, {
      isTouchDevice: this.isTouchDevice,
      settingsCategory: this.settingsCategory,
      settingsSelection: this.settingsSelection,
      settings: this.settings,
      mouseX: this._settingsMouseX,
      mouseY: this._settingsMouseY,
    });
  }

  renderControlsScreen(ctx, w, h) {
    _renderControlsScreen(ctx, w, h, {
      keybinds: this.keybinds,
      controlsSelection: this.controlsSelection,
      rebindingKey: this.rebindingKey,
      keybindSwapFlash: this._keybindSwapFlash,
    });
  }

  formatKeyCode(code) {
    return _formatKeyCode(code);
  }

  renderAchievementsScreen(ctx, w, h) {
    this.achievementSystem.renderScreen(ctx, w, h);
  }

  renderStatsScreen(ctx, w, h) {
    this.achievementSystem.renderStats(ctx, w, h);
  }

  renderUpgradeScreen(ctx, w, h) {
    _renderUpgradeScreen(ctx, w, h, {
      isTouchDevice: this.isTouchDevice,
      arenaRound: this.arenaRound,
      playerScore: this.player.score,
      upgradeLevels: this.upgradeLevels,
      upgradeSelection: this.upgradeSelection,
    });
  }

  renderGameOver(ctx, w, h) {
    const result = _renderGameOver(ctx, w, h, {
      time: this.time,
      isTouchDevice: this.isTouchDevice,
      mode: this.mode,
      arenaRound: this.arenaRound,
      achievementStats: this.achievementStats,
      meltdown: this.meltdown,
      deltaTime: this.deltaTime,
      shareToast: this._shareToast,
      statsCardData: this._statsCardData(),
    });
    this._gameOverBtns = result.gameOverBtns;
    if (result.toastExpired) this._shareToast = null;
  }

  _shareScore() {
    this._shareCurrentResult();
  }

  _renderShareToast(ctx, w, h) {
    const result = renderShareToast(
      ctx,
      w,
      h,
      this._shareToast,
      this.deltaTime,
    );
    if (result.expired) this._shareToast = null;
  }

  _renderBuilderOnboarding(ctx, w, h) {
    _renderBuilderOnboarding(ctx, w, h, {
      time: this.time,
      isTouchDevice: this.isTouchDevice,
    });
  }

  renderVictory(ctx, w, h) {
    const result = _renderVictory(ctx, w, h, {
      time: this.time,
      isTouchDevice: this.isTouchDevice,
      ngPlusCycle: this.ngPlusCycle,
      mode: this.mode,
      ngPlusPrompt: this.ngPlusPrompt,
      ngPlusPromptSel: this.ngPlusPromptSel,
      deltaTime: this.deltaTime,
      shareToast: this._shareToast,
      statsCardData: this._statsCardData(),
    });
    if (result.toastExpired) this._shareToast = null;
  }

  renderLevelComplete(ctx, w, h) {
    _renderLevelComplete(ctx, w, h, {
      time: this.time,
      isTouchDevice: this.isTouchDevice,
      levelCompleteTime: this._levelCompleteTime,
      playerSecretsFound: this.player.secretsFound,
      statsCardData: this._statsCardData(),
    });
  }

  _renderStatsCard(ctx, w, startY, accentColor, textColor, countUp) {
    renderStatsCard(
      ctx,
      w,
      startY,
      accentColor,
      textColor,
      countUp,
      this._statsCardData(),
    );
  }

  _statsCardData() {
    return {
      isTouchDevice: this.isTouchDevice,
      canvasHeight: this.hudH,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      roundStartTime: this.roundStartTime,
      killedEnemies: this.killedEnemies,
      totalEnemies: this.totalEnemies,
      bestStreak: this.bestStreak,
      score: this.player.score,
    };
  }

  // ── Builder Mode (delegated to BuilderMode) ────────────────────

  startBuilder() {
    this.builder.start();
    this.builder.onPlayTest = () => this.startBuilderPlayTest();
    this.map = this.builder.map;
    this.entities = [];
    this.dustMotes = null;
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
    this.dustMotes = null;
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

    // Spawn pickups from builder-placed entities
    if (this.map.entities && this.map.entities.length > 0) {
      for (const e of this.map.entities) {
        this.entities.push(
          new Pickup(e.x, e.y, e.type, { weaponId: e.weaponId }),
        );
      }
    }

    // Spawn exit marker from builder
    if (this.map.exit) {
      this.exitEntity = {
        x: this.map.exit.x,
        y: this.map.exit.y,
        type: "exit",
        active: true,
      };
      this.entities.push(this.exitEntity);
    } else {
      this.exitEntity = null;
    }

    this.killedEnemies = 0;
    this.totalEnemies = spawned;
    this.killStreakSystem.reset();
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.slowMoTimer = 0;
    this.timeScale = 1;

    this.mode = "playtest";
    this.state = GameState.PLAYING;
    this.roundStartTime = performance.now();
    this.audio.startTrack("campaign", 140);
    this.audio.startAmbient("industrial");
    this.lockPointer();
  }

  exitBuilderPlayTest() {
    this.audio.stopMusic();
    this._playtestEndTimer = null;
    this.state = GameState.BUILDER;
    this.mode = "builder";
    this.map = this.builder.map;
    this.entities = [];
    this.dustMotes = null;
    this.projectiles = [];
    // Clear stale gameplay HUD
    this.hudCtx.clearRect(0, 0, this.hudW, this.hudH);
    if (this._builderSnapshot) {
      this.builder.player.x = this._builderSnapshot.playerX;
      this.builder.player.y = this._builderSnapshot.playerY;
      this.builder.player.angle = this._builderSnapshot.playerAngle;
      this._builderSnapshot = null;
    }
    // Delay pointer lock to avoid race with browser's ESC-triggered unlock
    setTimeout(() => this.lockPointer(), 120);
  }

  _handleHashChange() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    try {
      const decoded = this._decodeShareURL(hash);
      if (decoded.mode === "arena") {
        this._showSharedScore(decoded);
      } else if (decoded.mode === "builder") {
        this._loadSharedMap(decoded.map);
      }
    } catch (e) {
      console.warn("Invalid share URL:", e);
    }
  }

  _encodeShareURL(data) {
    return btoa(JSON.stringify(data));
  }

  _decodeShareURL(hash) {
    return JSON.parse(atob(hash));
  }

  _showSharedScore(data) {
    this.killedEnemies = data.kills || 0;
    this.totalEnemies = data.total || 0;
    this.arenaRound = (data.round || 0) + 1;
    this.player.score = data.score || 0;
    this.state = GameState.GAME_OVER;
    this._sharedScoreView = true;
  }

  _loadSharedMap(mapGrid) {
    if (
      !Array.isArray(mapGrid) ||
      mapGrid.length === 0 ||
      !Array.isArray(mapGrid[0])
    )
      return;
    this.startBuilder();
    this.builder.importMapData({
      name: "Shared Map",
      width: mapGrid[0].length,
      height: mapGrid.length,
      grid: mapGrid,
    });
    this.map = this.builder.map;
  }

  _handleVictoryClick(e) {
    if (this.transitioning) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    const w = this.canvas.width;
    const h = this.canvas.height;
    const compact = this.isTouchDevice && isCompactPhone(h);

    if (this.ngPlusPrompt && this.mode === "campaign") {
      const promptY = compact ? h * 0.78 : h / 2 + 170;
      const optW = compact ? 140 : 220;
      const optH = compact ? 44 : 56;
      const gap = compact ? 12 : 20;
      const totalW = 2 * optW + gap;
      const startX = w / 2 - totalW / 2;

      // Check if tap is within the card row
      if (y >= promptY && y <= promptY + optH) {
        for (let i = 0; i < 2; i++) {
          const ox = startX + i * (optW + gap);
          if (x >= ox && x <= ox + optW) {
            this.audio.menuConfirm();
            if (i === 0) {
              this.fadeTransition(() => this.startNgPlus());
            } else {
              this.fadeTransition(() => {
                this.ngPlusPrompt = false;
                this.clearCampaignSave();
                this.state = GameState.TITLE;
                this.audio.stopMusic();
                this.audio.startTrack("menu");
                this.audio.startAmbient("menu");
              });
            }
            return;
          }
        }
      }
      return; // don't fall through to title-return when prompt is active
    }

    // No NG+ prompt — tap anywhere to return to title
    this.audio.menuConfirm();
    this.fadeTransition(() => {
      this.state = GameState.TITLE;
      this.audio.stopMusic();
      this.audio.startTrack("menu");
      this.audio.startAmbient("menu");
    });
  }

  _handleSettingsClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    const w = this.canvas.width;
    const h = this.canvas.height;
    const compact = this.isTouchDevice && isCompactPhone(h);

    const headerH = compact ? 36 : 52;
    const sideW = compact ? 90 : 160;
    const panelX = sideW + 1;
    const panelW = w - panelX - 12;
    const contentTop = headerH + 8;
    const catItemH = compact ? 28 : 38;
    const barW = Math.min(panelW * 0.55, 240);
    const barH = 6;

    const cats = getVisibleCategories(this.isTouchDevice);
    const defs = getSettingsForCategory(
      this.isTouchDevice,
      this.settingsCategory,
    );

    // ── Sidebar click: switch category or back ──
    if (x < sideW && y > headerH) {
      // Back button at bottom of sidebar
      const backY = h - 32;
      if (y >= backY - 14 && y < backY + 10) {
        this.handleKeyPress("Escape");
        return;
      }
      const ci = Math.floor((y - contentTop) / catItemH);
      if (ci >= 0 && ci < cats.length) {
        this.settingsCategory = cats[ci];
        this.settingsSelection = 0;
        this.audio.menuSelect();
      }
      return;
    }

    // ── Right panel: click on setting row ──
    if (x >= panelX && x <= panelX + panelW && y >= contentTop) {
      let rowY = contentTop;
      for (let i = 0; i < defs.length; i++) {
        const def = defs[i];
        const itemH = compact ? def.height.compact : def.height.normal;
        if (y >= rowY && y < rowY + itemH) {
          this.settingsSelection = i;

          // Slider: click-to-set on bar region
          if (def.type === "slider" && def.barColor) {
            const sliderY = rowY + (compact ? 20 : 28);
            const sliderX = panelX + (compact ? 8 : 14);
            const sliderW = Math.min(panelW - (compact ? 16 : 28), barW);
            if (
              y >= sliderY - 4 &&
              y <= sliderY + barH + 4 &&
              x >= sliderX &&
              x <= sliderX + sliderW
            ) {
              const pct = Math.max(0, Math.min(1, (x - sliderX) / sliderW));
              let val = def.min + pct * (def.max - def.min);
              // Snap to step
              val = Math.round(val / def.step) * def.step;
              val = Math.max(def.min, Math.min(def.max, val));
              if (def.round != null)
                val =
                  Math.round(val * Math.pow(10, def.round)) /
                  Math.pow(10, def.round);
              this.settings[def.key] = val;
              if (def.onChange) def.onChange(this);
              this.audio.menuConfirm();
              return;
            }
          }

          // Left half: decrement, right half: increment
          const midX = panelX + panelW / 2;
          if (x < midX) {
            this.handleKeyPress("ArrowLeft");
          } else {
            this.handleKeyPress("ArrowRight");
          }
          return;
        }
        rowY += itemH;
      }

      // Clicked below all rows — back
      if (y > rowY) {
        this.handleKeyPress("Escape");
      }
    }
  }

  _handleGameOverClick(e) {
    if (this.transitioning) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const b = this._gameOverBtns;
    if (!b) return;
    const { btnBaseX, btnY, btnW, btnH, btnGap } = b;

    if (y >= btnY && y <= btnY + btnH) {
      for (let i = 0; i < 3; i++) {
        const bx = btnBaseX + i * (btnW + btnGap);
        if (x >= bx && x <= bx + btnW) {
          if (i === 0) {
            // RESTART
            this.audio.menuConfirm();
            this.fadeTransition(() => {
              if (this.mode === "arena") this.startArena();
              else if (this.mode === "meltdown") this.startMeltdown();
              else if (this.mode === "campaign") this.startCampaign();
            });
          } else if (i === 1) {
            // QUIT — return to title
            this.audio.menuConfirm();
            this.fadeTransition(() => {
              this.state = GameState.TITLE;
              this.audio.stopMusic();
              this.audio.startTrack("menu");
              this.audio.startAmbient("menu");
            });
          } else if (i === 2) {
            // SHARE
            this._shareCurrentResult();
          }
          return;
        }
      }
    }
  }

  _shareCurrentResult() {
    let shareData = null;
    if (this.mode === "campaign" && this.state === GameState.VICTORY) {
      shareData = {
        mode: "campaign",
        act: this.campaignAct || 3,
        score: this.player.score,
        kills: this.killedEnemies || 0,
      };
    } else if (this.mode === "meltdown") {
      shareData = {
        mode: "meltdown",
        distance: Math.floor(this.meltdown.distance || 0),
        score: Math.floor(this.meltdown.score || 0),
        heat: Math.floor(this.meltdown.heat || 0),
        hero: this.meltdown.hero?.id || "default",
        kills: this.killedEnemies || 0,
      };
    } else if (this.mode === "campaign" && this.state === GameState.GAME_OVER) {
      shareData = {
        mode: "campaign",
        act: this.campaignAct || 1,
        level: this.campaignLevel || 0,
        score: this.player.score,
        kills: this.killedEnemies || 0,
      };
    } else if (this.mode === "arena" || this.state === GameState.GAME_OVER) {
      shareData = {
        mode: "arena",
        score: this.player.score,
        round: (this.arenaRound || 1) - 1,
        kills: this.killedEnemies || 0,
        total: this.totalEnemies || 0,
      };
    } else if (this.state === GameState.BUILDER) {
      shareData = {
        mode: "builder",
        map: this.builder.map.grid,
      };
    }

    if (shareData) {
      const hash = this._encodeShareURL(shareData);
      const url = `${window.location.origin}${window.location.pathname}#${hash}`;
      navigator.clipboard
        .writeText(url)
        .then(() => {
          this.audio.menuConfirm();
          this._shareToast = {
            text:
              shareData.mode === "builder"
                ? "Map link copied!"
                : shareData.mode === "meltdown"
                  ? `Meltdown score copied! (${shareData.distance}m)`
                  : shareData.mode === "campaign"
                    ? `Campaign victory copied! (${shareData.kills} kills)`
                    : "Score link copied!",
            life: 2.5,
          };
          if (
            shareData.mode === "arena" ||
            shareData.mode === "meltdown" ||
            shareData.mode === "campaign"
          ) {
            trackEvent("share_score", {
              mode: shareData.mode,
              score: shareData.score,
              round: shareData.round,
              distance: shareData.distance,
            });
          }
        })
        .catch(() => {
          // Clipboard can fail in non-secure contexts; still expose the URL.
          this._shareToast = { text: url, life: 4.0 };
        });
    }
  }

  _shareBuilderMap() {
    const shareData = {
      mode: "builder",
      map: this.builder?.map?.grid,
    };
    if (!Array.isArray(shareData.map) || shareData.map.length === 0) return;
    const hash = this._encodeShareURL(shareData);
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        this.audio.menuConfirm();
        this.builder.saveFlash = Math.max(this.builder.saveFlash, 2);
        this._shareToast = { text: "Map link copied!", life: 2.5 };
      })
      .catch(() => {
        this._shareToast = { text: url, life: 4.0 };
      });
  }
}
