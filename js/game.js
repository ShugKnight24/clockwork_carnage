import { setArtStyle, onArtStyleChange, isModernArt } from "../src/rendering/art-style.js";
import { renderModernPauseScreen } from "../src/ui/pause-menu-modern.js";
import { AssetEditor } from "./editor.js";
import { InputManager, DEFAULT_KEYBINDS } from "./input-manager.js";
import { GamepadManager } from "./gamepad.js";
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
  spawnPointLight as _spawnPointLight,
} from "./vfx.js";
import {
  WEAPONS,
  ENEMY_TYPES,
  ARENA_MAPS,
  UPGRADES,
  WALL_COLORS,
  TUTORIAL_MAP,
  ARIA_COMMS,
  CHARACTER_COLORS,
  SKIN_TONES,
  ARMOR_STYLES,
  BADGES,
  WEAPON_SKINS,
  LOADOUT_CLASSES,
  BACKSTORIES,
  VOICE_PROFILES,
  DEFAULT_CHARACTER,
} from "./data.js";
import { Renderer } from "./renderer.js";
import { renderPostFX as _renderPostFX } from "../src/rendering/postfx.js";
import { drawGlow as _drawGlow } from "../src/rendering/draw-utils.js";
import { requestPointerLockSafe, exitPointerLockSafe } from "../src/utils/pointer-lock.js";
import { AudioManager } from "./audio.js";

import { Player, Enemy, Pickup, Prop, Projectile } from "./entities.js";
import { Profiler } from "../src/utils/profiler.js";
import { trackEvent } from "./analytics.js";
import { upgradeLayout, tutorialMenuLayout, isCompactPhone } from "./layout.js";
import { KillStreakSystem } from "../src/systems/kill-streak.js";
import { AriaCommsSystem } from "../src/systems/aria-comms.js";
import { SquadCommsController } from "../src/systems/squad-comms.js";
import * as Save from "../src/core/save-system.js";
import { AchievementSystem } from "../src/systems/achievement-system.js";
import { ArchiveSystem } from "../src/systems/archive.js";
import { renderArchiveScreen as _renderArchiveScreen } from "../src/ui/archive-screen.js";
import {
  isPassable as _isPassable,
  hasLineOfSight as _hasLineOfSight,
  moveWithCollision,
} from "../src/systems/physics.js";
import { PlayerUpdateSystem } from "../src/systems/player-update.js";
import { updateAdsFov, resetAdsFov } from "../src/systems/aim.js";
import { AISystem } from "../src/systems/ai.js";
import {
  getDifficultyMultipliers as _getDifficultyMultipliers,
  filterArenaSpawns,
  createArenaEnemies,
  createArenaPickups,
  createMeltdownEnemies,
  createMeltdownPickups,
} from "../src/systems/spawner.js";
import { updateMeltdownRun } from "../src/systems/meltdown-run.js";
import { SeededRNG } from "../src/utils/seeded-rng.js";
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

export { GAME_VERSION } from "../src/constants.js";

import {
  COMPACT_PHONE_HEIGHT,
  DEFAULT_SETTINGS,
  SETTINGS_REGISTRY,
  getVisibleSettings,
  getSettingsForCategory,
  getVisibleCategories,
  settingDisplayItem,
  applySettingStep,
} from "./settings-registry.js";
import { isPrimaryTouchDevice } from "../src/utils/device.js";
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
import { dispatchKeyPress } from "../src/systems/input-dispatch.js";
import { renderFrame } from "../src/rendering/render-pipeline.js";
import {
  handleCreatorClick,
  handleVictoryClick,
  handleSettingsClick,
  handleGameOverClick,
} from "../src/systems/input-click-dispatch.js";
import { GameState } from "../src/types.js";
import { forwardProps } from "../src/utils/forward-props.js";
import { CUTSCENE_KEYS } from "../src/data/cutscene-keys.js";
import { HudEditor } from "../src/ui/hud-editor.js";
import * as Persistence from "../src/core/persistence.js";
import { gameUnlockContext } from "../src/systems/unlocks.js";
export { GameState };

// Lazy-loaded heavy modules — populated on first use via dynamic import()
let _CutsceneEngine = null;
let _BuilderMode = null;
let _MeltdownMode = null;

const _DEV = import.meta.env?.DEV ?? false;
const _systemErrors = new Map(); // throttle: system name → last error time

/** Swap-pop removal of entries whose `life` runs out. Order is not preserved. */
function expireByLife(list, dt) {
  for (let i = list.length - 1; i >= 0; i--) {
    list[i].life -= dt;
    if (list[i].life <= 0) {
      list[i] = list[list.length - 1];
      list.pop();
    }
  }
}

function _safeCall(name, fn) {
  try {
    fn();
  } catch (err) {
    const now = performance.now();
    const last = _systemErrors.get(name) || 0;
    if (_DEV && now - last > 3000) {
      _systemErrors.set(name, now);
      console.warn(`[${name}] error (non-fatal):`, err.message || err);
    }
  }
}

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
    this.renderer = new Renderer(canvas, 0); // renderMode applied after settings load
    this.audio = new AudioManager();
    this.cutsceneEngine = null; // Lazy-loaded on first cutscene
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
    this.meltdown = null; // Lazy-loaded on first meltdown
    this.time = 0;
    this.deltaTime = 0;
    this.lastFrameTime = 0;
    this.arenaTimer = 60;
    this.arenaRound = 1;
    this.particleSystem = null; // initialized in startGame
    this.killStreakSystem = new KillStreakSystem(this);
    this.ariaComms = new AriaCommsSystem(this);
    this.squadComms = new SquadCommsController(this);
    this.achievementSystem = new AchievementSystem(this);
    this.archive = new ArchiveSystem(this);
    this.tutorial = new TutorialSystem(this);
    this.campaign = new CampaignManager(this);
    this.hudEditor = new HudEditor(this);
    this.isTouchDevice = isPrimaryTouchDevice();
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
    this.hitStopMs = 0; // Hit-stop: freeze gameplay for N ms on kills
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
    this.tracers = []; // hitscan visual tracers — short-lived line segments
    // Dynamic point lights (muzzle flash, explosions, plasma) bleed onto
    // walls/floor in the column draw. Each: {x,y,color:[r,g,b],radius,intensity,life,maxLife}.
    this.lights = [];
    // Legacy aliases kept for callers that predate the system extraction.
    forwardProps(this, "killStreakSystem", {
      killStreak: "streak",
      killStreakTimer: "timer",
      killStreakDisplay: "display",
      bestStreak: "best",
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
    this.settings = { ...DEFAULT_SETTINGS };
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
        if (e.button === 2) this.player.isAiming = false;
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
    this.gamepad = new GamepadManager();
    this._gamepadPrevKeys = new Set();
    this._gamepadNextKeys = new Set();
    this._lastGamepadMove = { x: 0, y: 0 };
    this.applyGamepadSettings();

    // Previous-frame key state tracking for edge-detection (crouch start)
    // Owned by PlayerUpdateSystem — kept here for backward compat only
    this._prevCrouchKey = false;
    this.playerUpdateSystem = new PlayerUpdateSystem();
    this.aiSystem = new AISystem();
    this.controlsSelection = 0;
    this.rebindingKey = null; // null = not rebinding, string = action being rebound

    // Builder mode (extracted)
    this.builder = null; // Lazy-loaded on builder entry
    this._builderOpts = {
      renderer: this.renderer,
      audio: this.audio,
      settings: this.settings,
      keybinds: this.keybinds,
      canvas: this.canvas,
    };

    // Dev flags
    this.alwaysShowTutorial = false;

    // Cached vignette (recreated on resize)
    this._vignetteCanvas = null;
    this._vignetteW = 0;
    this._vignetteH = 0;

    // Cached scanline patterns (avoids 180+ fillRect calls per overlay)
    this._scanlinePattern = null; // rgba(0,0,0,0.03) every 4px
    this._scanlinePatternDense = null; // rgba(0,0,0,0.04) every 3px

    // Legacy aliases kept for callers that predate the system extraction.
    forwardProps(this, "achievementSystem", {
      unlockedAchievements: "unlockedAchievements",
      achievementQueue: "achievementQueue",
      achievementToast: "achievementToast",
      achievementIcons: "achievementIcons",
      achievementStats: "achievementStats",
      roundDamageTaken: "roundDamageTaken",
      achievementsScroll: "achievementsScroll",
    });

    // Legacy aliases kept for callers that predate the system extraction.
    forwardProps(this, "ariaComms", {
      ariaQueue: "queue",
      ariaMessage: "message",
      ariaTriggered: "triggered",
      ariaEnabled: "enabled",
      ariaIdleTimer: "idleTimer",
      ariaIdleThreshold: "idleThreshold",
      ariaCombatTimer: "combatTimer",
      ariaMessageLog: "messageLog",
      showAriaLog: "showLog",
      ariaLogScroll: "logScroll",
    });

    // Character creator state
    this.character = { ...DEFAULT_CHARACTER };
    this.creatorCategory = 0;
    // Kept in sync with CREATOR_CATEGORIES.length (touch.js reads this).
    this.creatorCategoryCount = CREATOR_CATEGORIES.length;
    this.creatorReturnState = null; // state to return to after saving
    this._creatorSaveCallback = null; // optional callback after creator save

    this.setupInput();
    // Apply mobile-optimized defaults before loading saved settings.
    // Wide FOV + compact HUD keeps the game playable on small screens.
    if (this.isTouchDevice) {
      this.settings.fov = 100;
      this.settings.hudScale = 75;
    }
    this.loadSettings();
    this._applyMobileMigration();
    this.applyGamepadSettings();
    this.applyPerformanceSettings();
    this.loadDevFlags();
    this.showFPS = !!this.settings.showPerformanceOverlay;
    this.loadAchievements();
    this.archive.load();
    this.loadCharacter();
    this.renderer.applyVisualStyle(this.settings.visualStyle);
    setArtStyle(this.settings.artStyle);
    // The title-screen toggle flips the style outside the settings menu; keep
    // the saved setting in step so the choice persists.
    onArtStyleChange((style) => {
      if (this.settings.artStyle === style) return;
      this.settings.artStyle = style;
      this.saveSettings();
    });
  }

  // ── State management (delegates to StateManager) ──────────────────────────

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
    this.player.isAiming = false;
    this.player.isFiring = false;
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
      requestPointerLockSafe(this.canvas);
    }
  }

  unlockPointer() {
    if (!this.isTouchDevice) exitPointerLockSafe();
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
      if (this.builder && this.builder.handleKeyDown(e)) return;
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
    // Tab cycles creator categories (input-dispatch); only stop the browser
    // moving focus off the canvas. It used to call a method that never existed.
    if (e.code === "Tab" && this.state === GameState.CHARACTER_CREATE && !isModernArt()) {
      e.preventDefault();
    }
    
    // Exit HUD editor
    if (e.code === "Escape" && this.state === GameState.HUD_EDITOR) {
      e.preventDefault();
      this.hudEditor.stop();
      return;
    }
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
    this.handleKeyPress(e.code, e);
  }

  /** Handles all mousedown events with full game state context. */
  _inputMouseDown(e) {
    // Cutscene: click to advance frame (manual advance)
    if (this.state === GameState.CUTSCENE && e.button === 0) {
      this.advanceCutsceneFrame();
      return;
    }
    // Settings
    if (this.state === GameState.SETTINGS) {
      // Handled via InputManager clicks, but could do background updates if needed
      return;
    }
    
    // HUD Editor
    if (this.state === GameState.HUD_EDITOR) {
      // Get logical mouse coords if needed
      const rect = this.canvas.getBoundingClientRect();
      const mx = (this.mouse.x - rect.left) * (this.canvas.width / rect.width);
      const my = (this.mouse.y - rect.top) * (this.canvas.height / rect.height);
      this.hudEditor.update(this.deltaTime, mx, my, this.input.isDown("interact") || this.mouse.down);
      return;
    }
    if (this.state === GameState.CHARACTER_CREATE && e.button === 0) {
      // Modern mode edits through the <agent-showroom> overlay instead.
      if (!isModernArt()) this._handleCreatorClick(e);
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
      if (this.builder && !this.mouse.locked && !this.builder.overhead) {
        this.lockPointer();
        return;
      }
      this.builder?.handleMouseDown(e.button);
      return;
    }
    if (e.button === 0) {
      if (this.state === GameState.PLAYING) {
        this.player.isFiring = true;
      }
      if (!this.mouse.locked && this.state === GameState.PLAYING) {
        this.lockPointer();
      }
    } else if (e.button === 2 && this.state === GameState.PLAYING) {
      this.player.isAiming = true;
      if (!this.mouse.locked) this.lockPointer();
    }
  }

  /** Mouse-wheel: weapon cycling in play, row navigation in settings. */
  _inputWheel(deltaY) {
    if (this.state === GameState.SETTINGS) {
      const defs = getSettingsForCategory(
        this.isTouchDevice,
        this.settingsCategory,
        this.settings
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
      this.player.isAiming = false;
      this.player.isFiring = false;
      const now = performance.now();
      if (now - this.lastEscTime > 200) {
        this.pauseGame(GameState.PLAYING);
      }
    }
  }

  handleKeyPress(code, e) {
    dispatchKeyPress(this, code, e);
  }

  _setGamepadKey(code, on, nextHeld) {
    if (!on) return; // release is handled in _updateGamepadInput so keyboard holds survive
    nextHeld.add(code);
    if (!this._gamepadPrevKeys.has(code)) this.handleKeyPress(code, { code, key: code });
    this.keys[code] = true;
  }

  _updateGamepadInput(dt) {
    if (!this.gamepad || !this.settings.gamepadEnabled) return;
    const gp = this.gamepad.poll();
    if (!gp.connected) return;

    // Two sets swapped each frame, so polling allocates nothing.
    const nextHeld = this._gamepadNextKeys;
    nextHeld.clear();
    const moveX = gp.moveX;
    const moveY = gp.moveY;
    if (Math.abs(moveX) > 0.05 || Math.abs(moveY) > 0.05) {
      this._lastGamepadMove.x = moveX;
      this._lastGamepadMove.y = moveY;
    }

    this._setGamepadKey(this.keybinds.moveForward, moveY < -0.25, nextHeld);
    this._setGamepadKey(this.keybinds.moveBack, moveY > 0.25, nextHeld);
    this._setGamepadKey(this.keybinds.moveLeft, moveX < -0.25, nextHeld);
    this._setGamepadKey(this.keybinds.moveRight, moveX > 0.25, nextHeld);
    this._setGamepadKey(this.keybinds.sprint, gp.sprint, nextHeld);
    this._setGamepadKey(this.keybinds.crouch, gp.reload, nextHeld);
    this._setGamepadKey(this.keybinds.chronoShift, gp.chronoShift, nextHeld);

    if (this.state === GameState.TITLE && gp.justPressed.interact) {
      document.dispatchEvent(new KeyboardEvent("keydown", { code: "GamepadStart", bubbles: true }));
    }
    // X / Select flips the title-screen art style (the DOM toggle has no pad focus).
    if (this.state === GameState.TITLE && (gp.justPressed.reload || gp.justPressed.minimap)) {
      setArtStyle(isModernArt() ? 0 : 1);
    }
    if (this.state === GameState.MODE_SELECT) {
      if (gp.justPressed.dpadUp) document.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp", bubbles: true }));
      if (gp.justPressed.dpadDown) document.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowDown", bubbles: true }));
      if (gp.justPressed.interact) document.dispatchEvent(new KeyboardEvent("keydown", { code: "Enter", bubbles: true }));
      if (gp.justPressed.pause || gp.justPressed.dash) document.getElementById("btnBack")?.click();
    }
    if (this.state === GameState.PLAYING) {
      this.player.isFiring = gp.shoot;
      this.player.isAiming = gp.aim;
      if (gp.aim || gp.shoot || gp.lookX || gp.lookY) this.lastInputWasGamepad = true;
      if (gp.lookX || gp.lookY) {
        const aimScale = 420 * dt;
        this.mouse.dx += gp.lookX * aimScale;
        this.mouse.dy += gp.lookY * aimScale;
      }
      if (gp.justPressed.dash) {
        const cos = Math.cos(this.player.angle);
        const sin = Math.sin(this.player.angle);
        const lx = this._lastGamepadMove.x || 0;
        const ly = this._lastGamepadMove.y || -1;
        const rawX = cos * -ly + sin * lx;
        const rawY = sin * -ly - cos * lx;
        this.triggerDash(this.keybinds.moveForward, rawX, rawY);
        this.gamepad.vibrateLight();
      }
      if (gp.justPressed.interact) this.interact();
      if (gp.justPressed.weaponNext || gp.justPressed.dpadRight) this._inputWheel(1);
      if (gp.justPressed.weaponPrev || gp.justPressed.dpadLeft) this._inputWheel(-1);
      if (gp.justPressed.pause) this.handleKeyPress(this.keybinds.pause);
    } else {
      if (gp.justPressed.dpadUp) this.handleKeyPress("ArrowUp");
      if (gp.justPressed.dpadDown) this.handleKeyPress("ArrowDown");
      if (gp.justPressed.dpadLeft) this.handleKeyPress("ArrowLeft");
      if (gp.justPressed.dpadRight) this.handleKeyPress("ArrowRight");
      if (gp.justPressed.interact) this.handleKeyPress("Enter");
      if (gp.justPressed.pause || gp.justPressed.dash) this.handleKeyPress("Escape");
      if (gp.justPressed.weaponPrev) this.handleKeyPress("KeyQ");
      if (gp.justPressed.weaponNext) this.handleKeyPress("KeyE");
      // Showroom face buttons: X randomize, Y save & deploy.
      if (this.state === GameState.CHARACTER_CREATE && isModernArt()) {
        if (gp.justPressed.reload) this.handleKeyPress("GamepadX");
        if (gp.justPressed.chronoShift) this.handleKeyPress("GamepadY");
      }
    }

    for (const code of this._gamepadPrevKeys) {
      if (!nextHeld.has(code)) this.keys[code] = false;
    }
    this._gamepadNextKeys = this._gamepadPrevKeys;
    this._gamepadPrevKeys = nextHeld;
  }

  applyAudioSettings() {
    this.audio.setMusicVolume(this.settings.musicVolume / 100);
    this.audio.setSfxVolume(this.settings.sfxVolume / 100);
  }

  // Save / Load
  // ── Save/Load (delegated to SaveSystem) ──────────────────
  saveSettings() {
    Persistence.saveSettings(this);
  }

  loadSettings() {
    Persistence.loadSettings(this);
  }

  applyGamepadSettings() {
    if (!this.gamepad) return;
    this.gamepad.updateSettings({
      enabled: this.settings.gamepadEnabled,
      deadzone: this.settings.gamepadDeadzone,
      lookSensitivity: this.settings.gamepadLookSensitivity,
      vibrationEnabled: this.settings.gamepadRumble,
      invertLookY: this.settings.invertY,
    });
  }

  applyPerformanceSettings() {
    if (!this.quality) return;
    const prevScale = this.quality.renderScale;
    const presets = ["auto", "ultra-low", "low", "medium", "high", "ultra", "custom"];
    const preset = presets[this.settings.graphicsPreset] || "auto";
    const presetParticles = { "ultra-low": 0.15, low: 0.3, medium: 0.5, high: 0.8, ultra: 1 };
    const targets = [55, 30, 60, 90, 120];
    this.quality.targetFPS = this.settings.batterySaver ? 30 : targets[this.settings.frameTarget] || 55;
    this.quality.maxScale = this.settings.batterySaver ? Math.min(this.quality.maxScale, 0.7) : 1.0;
    if (preset === "auto") {
      this.quality.useAuto();
      if (this.settings.batterySaver && this.quality.renderScale > this.quality.maxScale) {
        this.quality.renderScale = this.quality.stableScale = this.quality.maxScale;
      }
    } else if (preset !== "custom") {
      this.quality.applyPreset(preset);
    }
    const effectMul = [0.3, 0.6, 1][this.settings.effectsQuality] ?? 1;
    if (preset === "auto") {
      const scale = this.quality.renderScale;
      const low = scale < 0.6;
      const med = scale < 0.8;
      this.quality.particleMultiplier = (low ? 0.3 : med ? 0.5 : 1) * effectMul * (this.settings.batterySaver ? 0.6 : 1);
      this.quality.drawDistance = low ? 10 : med ? 14 : 20;
      this.quality.enableScanlines = this.settings.postProcessing && !med;
      this.quality.enableVignette = this.settings.postProcessing && !low;
      this.quality.enableFloorTexture = this.settings.floorTexture && !low;
    } else {
      const isCustom = preset === "custom";
      const customParticles = preset === "custom" ? 1 : (presetParticles[preset] ?? 1);
      this.quality.applyCustom({
        renderScale: Math.min(isCustom ? this.settings.renderScale / 100 : this.quality.renderScale, this.quality.maxScale),
        particleMultiplier: customParticles * effectMul * (this.settings.batterySaver ? 0.6 : 1),
        enableVignette: this.settings.postProcessing && !this.settings.batterySaver,
        enableScanlines: this.settings.postProcessing && !this.settings.batterySaver,
        enableFloorTexture: this.settings.floorTexture,
      });
    }
    // Battery saver: also disable bloom & CA for max power savings
    if (this.settings.batterySaver) {
      this.settings.enableBloom = false;
      this.settings.enableChromaticAberration = false;
    }
    this.quality.stableScale = this.quality.renderScale;
    if (Math.abs(prevScale - this.quality.renderScale) > 0.001) {
      window.dispatchEvent(new CustomEvent("cc-quality-change"));
    }
  }

  _applyMobileMigration() {
    Persistence.applyMobileMigration(this.isTouchDevice, this.settings, () =>
      this.saveSettings(),
    );
  }

  loadDevFlags() {
    this.alwaysShowTutorial = Persistence.loadDevFlags();
  }

  saveCharacter() {
    Persistence.saveCharacter(this);
  }

  loadCharacter() {
    Persistence.loadCharacter(this);
  }

  setAlwaysTutorial(on) {
    this.alwaysShowTutorial = on;
    Persistence.setAlwaysTutorial(on);
  }

  saveAchievements() {
    Persistence.saveAchievements(this);
  }
  loadAchievements() {
    Persistence.loadAchievements(this);
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
      this.mode === "tutorial" ? this._tutorialCardBottom || 0 : 0,
    );
  }

  saveArena() {
    Persistence.saveArena(this);
  }

  // TODO: Reconsider current arena loading. Better system or no loading at all? This will get tricky to track if we add different maps, procedural generation, additional random upgrades. Too much *randomness* to track reliably
  loadArena() {
    return Persistence.loadArena(this);
  }

  clearArenaSave() {
    Persistence.clearArenaSave(this);
  }

  saveCampaign() {
    Persistence.saveCampaign(this);
  }

  loadCampaignSave() {
    return Persistence.loadCampaignSave(this);
  }

  clearCampaignSave() {
    Persistence.clearCampaignSave(this);
  }

  /** Enter New Game Plus — keep weapons & score, reset to Act 1, bump cycle */
  startNgPlus() {
    Persistence.startNgPlus(this);
  }

  hasSave() {
    return Persistence.hasSave();
  }
  getSaveInfo() {
    return Persistence.getSaveInfo();
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

  async _ensureMeltdown() {
    if (!this.meltdown) {
      if (!_MeltdownMode) {
        _MeltdownMode = (await import("./meltdown.js")).MeltdownMode;
      }
      this.meltdown = new _MeltdownMode();
    }
  }

  /**
   * Enters meltdown. Runs synchronously once the chunk is warm, so callers that
   * cannot await (menu click handlers, the playtest harness) still observe the
   * new state in the same tick. Always returns a promise for callers that can.
   */
  startMeltdown(heroKey = "agent", ironman = false) {
    if (!this.meltdown) {
      return this._ensureMeltdown().then(() => this._enterMeltdown(heroKey, ironman));
    }
    this._enterMeltdown(heroKey, ironman);
    return Promise.resolve();
  }

  _enterMeltdown(heroKey, ironman) {
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
    resetAdsFov();

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
    resetAdsFov();
    this.arenaTimer = 60;
    this.arenaClearTimer = null;
    this.entities = [];
    this.dustMotes = null;
    this.projectiles = [];
    this._chronoBombs = [];

    const diff = this.getDifficultyMultipliers();
    this.arenaTimer = Math.max(30, 60 + diff.timerBonus);

    // Seeded RNG for reproducible arena spawns (BUG-027)
    const rng = new SeededRNG(SeededRNG.arenaSeed(this.arenaRound, this.settings.difficulty));

    // Spawn enemies — filter spawns, create scaled enemies, create pickups
    const validSpawns = filterArenaSpawns(
      this.map.enemySpawns,
      this.player.x,
      this.player.y,
      this.map.grid,
      rng,
    );
    this.entities.push(
      ...createArenaEnemies(this.arenaRound, validSpawns, diff, rng),
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
    return this.tutorial.start();
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
    // Remembered so ARIA's toast can sit below the step card instead of over it.
    this._tutorialCardBottom = _renderTutorialOverlay(ctx, w, h, {
      mode: this.mode,
      isTouchDevice: this.isTouchDevice,
      tutorialStepTime: this.tutorialStepTime,
      tutorialStep: this.tutorialStep,
    });
  }

  renderTutorialCompletionMenu(ctx, w, h) {
    _renderTutorialCompletionMenu(ctx, w, h, this.tutorialMenuSelection || 0);
  }

  // ── Cutscene Delegation (engine in js/cutscene.js) ─────────────────

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

    const origin = BACKSTORIES[this.character.backstoryIndex || 0];
    const ob = origin?.bonuses || {};
    if (ob.maxHealthAdd) {
      this.player.maxHealth += ob.maxHealthAdd;
      this.player.health = Math.min(this.player.maxHealth, this.player.health + ob.maxHealthAdd);
    }
    if (ob.maxChronoEnergyAdd) this.player.maxChronoEnergy += ob.maxChronoEnergyAdd;
    if (ob.dashCostAdd) this.player.dashStaminaCost = Math.max(8, this.player.dashStaminaCost + ob.dashCostAdd);
    if (ob.armorAdd) this.player.armor = Math.max(this.player.armor, ob.armorAdd);
  }

  getCharacterColor() {
    return CHARACTER_COLORS[this.character.colorIndex] || CHARACTER_COLORS[0];
  }

  getWeaponSkin() {
    return WEAPON_SKINS[this.character.weaponSkinIndex] || WEAPON_SKINS[0];
  }

  getVoiceProfile() {
    return VOICE_PROFILES[this.character.voiceIndex || 0] || VOICE_PROFILES[0];
  }

  renderCharacterCreator(ctx, w, h) {
    _renderCharacterCreator(
      ctx,
      w,
      h,
      this.creatorCategory,
      this.character,
      this.isTouchDevice,
      gameUnlockContext(this),
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
    handleCreatorClick(this, e);
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

  // ── Cutscene Delegation (engine in js/cutscene.js) ─────────────────

  async _ensureCutsceneEngine() {
    if (!this.cutsceneEngine) {
      if (!_CutsceneEngine) {
        _CutsceneEngine = (await import("./cutscene.js")).CutsceneEngine;
      }
      this.cutsceneEngine = new _CutsceneEngine({
        audio: this.audio,
        getKeys: () => this.keys,
        getTouchControls: () => this.touchControls,
        isTouchDevice: isPrimaryTouchDevice(),
        getPlayerName: () => this.character.name || "Agent",
        getSettings: () => this.settings,
      });
    }
  }

  /**
   * Whether a cutscene script exists. Reads the key index, so it answers
   * without forcing the lazily-split cutscene chunk to load — callers ask
   * this to decide *whether* to play a cutscene at all.
   */
  hasCutsceneScript(key) {
    return CUTSCENE_KEYS.has(key);
  }

  /** @see startMeltdown — same sync-when-warm contract. */
  startCutscene(scriptKey, onComplete) {
    if (!this.cutsceneEngine) {
      return this._ensureCutsceneEngine().then(() => this._enterCutscene(scriptKey, onComplete));
    }
    this._enterCutscene(scriptKey, onComplete);
    return Promise.resolve();
  }

  _enterCutscene(scriptKey, onComplete) {
    if (this.cutsceneEngine.start(scriptKey, onComplete)) {
      this.state = GameState.CUTSCENE;
    }
  }

  /**
   * Warms every lazily-split chunk so later mode entry is synchronous.
   * Used by the playtest harness; safe to call from the game at idle.
   */
  preloadLazyModes() {
    return Promise.all([
      this._ensureMeltdown(),
      this._ensureBuilder(),
      this._ensureCutsceneEngine(),
    ]);
  }

  advanceCutsceneFrame() {
    this.cutsceneEngine?.advance();
  }

  endCutscene() {
    this.cutsceneEngine?.end();
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
    this.cutsceneEngine?.update();
    // If cutscene ended during update (skip/complete), state was already
    // changed by the onComplete callback or we need to handle it here
    if (!this.cutsceneEngine?.isActive && this.state === GameState.CUTSCENE) {
      // Cutscene ended without a callback setting state — shouldn't normally
      // happen, but guard against it
      this.state = GameState.TITLE;
      this.audio.startTrack("menu");
      this.audio.startAmbient("menu");
    }
  }

  renderCutscene(ctx, w, h) {
    this.cutsceneEngine?.render(ctx, w, h);
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
        // Hidden memory fragments are what secret walls actually conceal, so
        // the fragment reaction replaces the generic line when one is found.
        // Fragment data numbers levels 1-9; campaign.level is a 0-based index.
        const frag =
          this.mode === "campaign"
            ? this.archive.collectHiddenFragmentFor(
                this.campaign.act,
                this.campaign.level + 1,
              )
            : null;
        if (frag) this.queueAriaMessage("memoryFragment");
        else this.queueAriaMessage("secretFound");
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

  damageEnemy(enemy, damage, zone) {
    _damageEnemy(this, enemy, damage, zone);
  }

  damagePlayer(amount, attacker) {
    // Meltdown exotic pickup: temporary full invulnerability
    if (this.mode === "meltdown" && this.meltdown?.isInvulnerable()) return;
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
    // 30fps floor prevents a physics explosion after a stall; the lower clamp
    // keeps a backwards timestamp from running timers (hit-stop, cooldowns)
    // *up* instead of down.
    this.deltaTime = Math.min(0.033, Math.max(0, realDt));
    // Accumulate lifetime play time using unclamped real time
    this.achievementStats.totalTimePlayed += realDt;
    this.lastFrameTime = timestamp;
    // Sim-time advances by clamped dt so all gameplay systems (enemy cooldowns,
    // attack timers, EMP disable) stay in sync with movement on slow machines.
    // Visual-only code (Math.sin animations) can use this.wallTime instead.
    this.time = (this.time || 0) + this.deltaTime * 1000;
    this.wallTime = timestamp;

    this._updateGamepadInput(this.deltaTime);

    this._updateTimeScale();

    // Sync audio with time scale (chrono shift pitch-down + ducking)
    this.audio.setTimeScale?.(this.timeScale);
    this.audio.updateDucking?.(this.deltaTime);

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
    if (this.state === GameState.HUD_EDITOR) {
      const rect = this.canvas.getBoundingClientRect();
      const mx = (this.mouse.x - rect.left) * (this.canvas.width / rect.width);
      const my = (this.mouse.y - rect.top) * (this.canvas.height / rect.height);
      this.hudEditor.update(this.deltaTime, mx, my, this.input.isDown("interact") || this.mouse.down);
      return;
    }
    if (this.state !== GameState.PLAYING) return;

    // Hit-stop freeze — skip gameplay update but keep rendering.
    // Gives DOOM-like impact on kills: the world freezes for a beat.
    // Counted in ms, not frames, so the beat is the same length on a 30 fps
    // cap and on a 144 Hz panel.
    if (this.hitStopMs > 0) {
      this.hitStopMs -= this.deltaTime * 1000;
      return;
    }

    // Shift + U toggle for Asset Editor
    if (this.keys["ShiftLeft"] && this.keys["KeyU"]) {
      this.keys["KeyU"] = false; // debounce
      this.assetEditor.toggle();
    }
    if (this.assetEditor.active) return; // Pause game logic but keep rendering

    if (!this.player.alive) {
      this._updateDeathTimer();
      return;
    }

    const dt = this.deltaTime * this.timeScale;

    this._updateChronoEnergy();

    // Kill streak update (timer decay + display fade)
    _safeCall("KillStreak", () => this.killStreakSystem.update(this.deltaTime));

    if (this.mode === "arena" && this._updateArenaTimer(dt)) return;

    if (this.mode === "playtest" && this._updatePlaytestVictory()) return;

    // Tutorial step progression
    if (this.mode === "tutorial") {
      this.updateTutorial(dt);
    }

    this._regenPlayer(dt);

    // Player movement
    const _profilePlayerStart = this.showFPS ? performance.now() : 0;
    this.updatePlayer(dt);

    if (this.mode === "meltdown" && this.meltdown.alive) {
      updateMeltdownRun(this, dt);
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
    // Camera punch recovery (faster than weapon kick — camera snaps back)
    this.player.cameraPunch *= decay(0.78, this.deltaTime);
    if (Math.abs(this.player.cameraPunch) < 0.001) this.player.cameraPunch = 0;
    if (_profilePlayerStart) this.profiler.currentPhases.player =
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
    const _profileEnemiesStart = this.showFPS ? performance.now() : 0;
    _safeCall("AI", () => this.updateEnemies(dt));
    if (_profileEnemiesStart) this.profiler.currentPhases.enemies =
      performance.now() - _profileEnemiesStart;

    // Update projectiles
    const _profileProjectilesStart = this.showFPS ? performance.now() : 0;
    _safeCall("Projectiles", () => this.updateProjectiles(dt));
    if (_profileProjectilesStart) this.profiler.currentPhases.projectiles =
      performance.now() - _profileProjectilesStart;

    // Check pickups
    const _profilePickupsStart = this.showFPS ? performance.now() : 0;
    this.checkPickups();
    if (_profilePickupsStart) this.profiler.currentPhases.pickups =
      performance.now() - _profilePickupsStart;

    // Misc: exit check, decay, achievements
    const _tMisc0 = this.showFPS ? performance.now() : 0;

    this._checkExitReached();

    // screen shake decay (framerate-invariant)
    this.screenShake *= decay(0.9, this.deltaTime);
    if (this.screenShake < 0.1) this.screenShake = 0;

    // Update VFX particles
    _safeCall("Particles", () => this.updateParticles(dt));

    this._decayEffects(dt);

    // Achievement checks (periodic, not every frame)
    _safeCall("Achievements", () => {
      this.checkAchievements();
      this.updateAchievementToast(dt);
    });
    this.updateAriaComms(dt);
    if (_tMisc0) this.profiler.currentPhases.misc = performance.now() - _tMisc0;
  }

  /** Slow-mo (last kill) outranks Chrono Shift; both drain here. */
  _updateTimeScale() {
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
  }

  /** Counts down the death beat, then routes to game over or back to the builder. */
  _updateDeathTimer() {
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
  }

  _updateChronoEnergy() {
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
  }

  /** Arena round clock. Returns true when the round just ended (state is now UPGRADE). */
  _updateArenaTimer(dt) {
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
      return true;
    }
    return false;
  }

  /**
   * Playtest ends after a short pause once every enemy is down, or once the
   * exit armed the timer (see _checkExitReached). Returns true on exit.
   */
  _updatePlaytestVictory() {
    const allDown =
      this.totalEnemies > 0 &&
      this.killedEnemies >= this.totalEnemies &&
      this.slowMoTimer <= 0;
    if (allDown && !this._playtestEndTimer) {
      this._playtestEndTimer = 2.0; // 2-second victory pause
    }
    if (!this._playtestEndTimer) return false;
    this._playtestEndTimer -= this.deltaTime;
    if (this._playtestEndTimer > 0) return false;
    this._playtestEndTimer = null;
    this.exitBuilderPlayTest();
    return true;
  }

  _regenPlayer(dt) {
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
  }

  /** Campaign exit completes the level; playtest exit arms the end timer. */
  _checkExitReached() {
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
        // Visible fragments land with the debrief rather than mid-fight.
        this.archive.collectAutoFragmentsFor(
          this.campaign.act,
          this.campaign.level + 1, // fragment data is 1-based
        );
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
  }

  /** Glitch, hit marker, damage numbers, tracers and point lights fade out. */
  _decayEffects(dt) {
    // Glitch effect decay (framerate-invariant)
    this.glitchEffect *= decay(0.95, this.deltaTime);
    if (this.glitchEffect < 0.01) this.glitchEffect = 0;

    // Hit marker decay
    if (this.hitMarker > 0) {
      this.hitMarker -= dt;
      if (this.hitMarker < 0) this.hitMarker = 0;
    }

    // Damage numbers and hitscan tracers (short-lived bullet streaks)
    expireByLife(this.damageNumbers, dt);
    expireByLife(this.tracers, dt);

    // Dynamic point lights — decay and prune. Intensity follows life ratio
    // so flashes fade smoothly into the wall/floor shading.
    for (let i = this.lights.length - 1; i >= 0; i--) {
      const L = this.lights[i];
      L.life -= dt;
      if (L.life <= 0) {
        this.lights[i] = this.lights[this.lights.length - 1];
        this.lights.pop();
      } else {
        L.intensity = L.baseIntensity * (L.life / L.maxLife);
      }
    }
  }

  triggerDash(code, rawDirX, rawDirY) {
    if (rawDirX !== undefined && rawDirY !== undefined) {
      const len = Math.hypot(rawDirX, rawDirY);
      if (len > 1e-6) {
        rawDirX /= len;
        rawDirY /= len;
      }
    }
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
      this.audio.dashSound?.();
    }
  }

  updatePlayer(dt) {
    this.player._drawDistance = this.quality?.drawDistance;
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
        voiceProfile: this.getVoiceProfile(),
        noclip: !!this._noclip,
      },
      dt,
    );
    if (flags) {
      if (flags.tutorialSlid) this.tutorialSlid = true;
      if (flags.tutorialCrouched) this.tutorialCrouched = true;
    }
    // Smooth ADS FOV transition — must run every frame
    updateAdsFov(this.player, dt);
  }

  isPassable(mx, my) {
    return _isPassable(this.map, mx, my);
  }

  // TODO: Improve Enemy AI
  // ─── VFX / Particles ──────────────────────────────────────────────────────

  _spawnHitImpact(x, y, enemyColor, isCrit) {
    if (!this.player.particles) this.player.particles = [];
    _spawnHitImpact(this.player.particles, x, y, enemyColor, isCrit, this.quality?.particleMultiplier ?? 1);
  }

  _spawnMuzzleFlash(wep) {
    if (!this.player.particles) this.player.particles = [];
    _spawnMuzzleFlash(this.player.particles, this.player, wep, this.quality?.particleMultiplier ?? 1);
    // Brief light bleed at the barrel — falls off in ~80 ms so it reads
    // as a flash, not a flare. Color follows weapon family.
    const FLASH_LIGHT = {
      2: [80, 220, 255], 7: [80, 220, 255], // plasma / EMP
      3: [255, 160, 40],                     // cannon
      6: [100, 255, 120],                    // ricochet
    };
    const color = FLASH_LIGHT[wep.id] || [255, 200, 90];
    const bx = this.player.x + Math.cos(this.player.angle) * 0.6;
    const by = this.player.y + Math.sin(this.player.angle) * 0.6;
    _spawnPointLight(this.lights, bx, by, color, 4.5, 1.4, 0.08);
  }

  spawnDeathParticles(x, y, c1, c2) {
    if (!this.player.particles) this.player.particles = [];
    _spawnDeathParticles(this.player.particles, x, y, c1, c2, this.quality?.particleMultiplier ?? 1);
  }

  spawnWallSparks(x, y) {
    if (!this.player.particles) this.player.particles = [];
    _spawnWallSparks(this.player.particles, x, y, this.quality?.particleMultiplier ?? 1);
  }

  spawnPickupBurst(x, y, pickupType) {
    if (!this.player.particles) this.player.particles = [];
    _spawnPickupBurst(this.player.particles, x, y, pickupType, this.quality?.particleMultiplier ?? 1);
  }

  updateParticles(dt) {
    this.dustMotes = _updateParticles(
      this.player.particles,
      dt,
      this.timeScale,
      this.dustMotes,
      this.player,
      { enableDust: (this.quality?.particleMultiplier ?? 1) >= 0.5 },
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
        damageEnemy: (e, d, z) => this.damageEnemy(e, d, z),
        damagePlayer: (d) => this.damagePlayer(d),
        lights: this.lights,
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

      // In tutorial, block pickups until step 13 ("Resupply")
      if (this.mode === "tutorial" && this.tutorialStep < 13) {
        if (e.type === "health" || e.type === "ammo") continue;
      }

      if (e.type === "health") {
        if (this.player.health >= this.player.maxHealth && this.mode !== "tutorial") continue;
        this.player.health = Math.min(
          this.player.maxHealth,
          this.player.health + 25,
        );
        e.active = false;
        this.spawnPickupBurst(e.x, e.y, "health");
        this.audio.pickup();
        this.triggerAriaOnce("healthPickup", "healthPickup");
        if (this.mode === "tutorial" && this.tutorialStep === 13)
          this.tutorialPickedUp = true;
        if (this.mode === "tutorial") e._respawnAt = performance.now() + 8000;
      } else if (e.type === "ammo") {
        this.player.ammo = Math.min(999, this.player.ammo + 20);
        e.active = false;
        this.spawnPickupBurst(e.x, e.y, "ammo");
        this.audio.pickup();
        if (this.mode === "tutorial" && this.tutorialStep === 13)
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
      } else if (
        (e.type === "damage2x" || e.type === "invuln") &&
        this.mode === "meltdown"
      ) {
        // Exotic meltdown pickups — distance-based buff windows
        this.meltdown.onExoticPickup(e.type);
        e.active = false;
        this.spawnPickupBurst(
          e.x,
          e.y,
          e.type === "damage2x" ? "weapon" : "health",
        );
        this.audio.pickup();
        _spawnEnergyBurst(this.player.particles, e.x, e.y, {
          count: 14,
          r: e.type === "damage2x" ? 255 : 255,
          g: e.type === "damage2x" ? 80 : 220,
          b: e.type === "damage2x" ? 40 : 120,
        });
      }
    }
  }

  render() {
    renderFrame(this);
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
      isAiming: this.player.isAiming,
      isSprinting: this.player.isSprinting,
      isDashing: this.player.isDashing,
      crouchBlend: this.player.crouchBlend || 0,
      weaponBob: this.settings.weaponBob ? this.player.weaponBob : 0,
      weaponKick: this.player.weaponKick,
      weaponSwayX: this.settings.weaponBob ? this.player.weaponSwayX : 0,
      weaponSwayY: this.settings.weaponBob ? this.player.weaponSwayY : 0,
      skinTone: (SKIN_TONES[this.character.skinToneIndex] || SKIN_TONES[0])?.color,
      weaponAnimFrame: this.weaponAnimFrame,
      time: this.time,
      lastFireTime: this.player.lastFireTime || 0,
      isTouchDevice: this.isTouchDevice,
      hudStyle: this.settings.hudStyle,
      hudScale: this.settings.hudScale,
      aimOffsetX: this.player.aimOffsetX || 0,
      aimOffsetY: this.player.aimOffsetY || 0,
      state: this.state,
      pausedFromState: this.pausedFromState,
      alive: this.player.alive,
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
    if (isModernArt()) {
      renderModernPauseScreen(this, ctx, w, h);
      return;
    }
    const compact = this.isTouchDevice && isCompactPhone(h);
    ctx.fillStyle = "rgba(0,0,0,0.82)";
    ctx.fillRect(0, 0, w, h);

    // ARIA log overlay
    if (this.showAriaLog) {
      this.renderAriaLog(ctx, w, h);
      return;
    }

    // Menu entries laid out as a panel. The old version floated a title and a
    // single pipe-separated hint line over a lightly dimmed frame, 210px
    // apart, which read as unfinished next to the other screens.
    const entries = [
      { key: "ESC / P", label: "Resume" },
      { key: "S", label: "Settings" },
      { key: "A", label: "Achievements" },
      { key: "B", label: "Archive" },
      { key: "T", label: "Stats" },
      { key: "L", label: "ARIA log" },
    ];
    if (this.mode === "campaign") entries.push({ key: "F", label: "Save game" });
    entries.push({ key: "Q", label: "Quit to title" });

    ctx.textAlign = "center";

    if (this.isTouchDevice) {
      ctx.fillStyle = "#00ffcc";
      ctx.font = `bold ${compact ? 24 : 36}px monospace`;
      ctx.fillText("PAUSED", w / 2, compact ? h * 0.2 : h / 2 - 100);
    } else {
      const rowH = 30;
      const panelW = 330;
      const panelH = 78 + entries.length * rowH + 18;
      const panelX = w / 2 - panelW / 2;
      const panelY = h / 2 - panelH / 2;

      ctx.fillStyle = "rgba(4,10,18,0.9)";
      ctx.beginPath();
      ctx.roundRect(panelX, panelY, panelW, panelH, 10);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,255,204,0.28)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(panelX, panelY, panelW, panelH, 10);
      ctx.stroke();

      ctx.fillStyle = "#00ffcc";
      ctx.font = "bold 30px monospace";
      ctx.fillText("PAUSED", w / 2, panelY + 48);

      ctx.strokeStyle = "rgba(0,255,204,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(panelX + 28, panelY + 66);
      ctx.lineTo(panelX + panelW - 28, panelY + 66);
      ctx.stroke();

      ctx.font = "14px monospace";
      for (let i = 0; i < entries.length; i++) {
        const ey = panelY + 92 + i * rowH;
        ctx.textAlign = "right";
        ctx.fillStyle = "rgba(0,255,204,0.75)";
        ctx.fillText(entries[i].key, w / 2 - 18, ey);
        ctx.textAlign = "left";
        ctx.fillStyle = "#aab4c8";
        ctx.fillText(entries[i].label, w / 2 + 2, ey);
      }
      ctx.textAlign = "center";
    }

    if (this.pauseSaveFlash && performance.now() - this.pauseSaveFlash < 1500) {
      const alpha = 1 - (performance.now() - this.pauseSaveFlash) / 1500;
      ctx.fillStyle = `rgba(0, 255, 100, ${alpha.toFixed(2)})`;
      ctx.font = `bold ${compact ? 13 : 16}px monospace`;
      ctx.fillText("GAME SAVED", w / 2, compact ? h * 0.7 : h / 2 + 150);
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

  renderArchiveScreen(ctx, w, h) {
    _renderArchiveScreen(ctx, w, h, {
      tab: this.archiveTab || 0,
      selection: this.archiveSelection || 0,
      scroll: this.archiveScroll || 0,
      archive: this.archive,
    });
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

  async _ensureBuilder() {
    if (!this.builder) {
      if (!_BuilderMode) {
        _BuilderMode = (await import("./builder.js")).BuilderMode;
      }
      this.builder = new _BuilderMode(this._builderOpts);
      this.builder.onShareMap = () => this._shareBuilderMap();
    }
  }

  /** @see startMeltdown — same sync-when-warm contract. */
  startBuilder() {
    if (!this.builder) {
      return this._ensureBuilder().then(() => this._enterBuilder());
    }
    this._enterBuilder();
    return Promise.resolve();
  }

  _enterBuilder() {
    this.mode = "builder";
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

    // Use the builder's map as the gameplay map.
    // BUG-034: Ensure heightMap is valid — older saves may lack it,
    // causing the renderer's heightFrac to NaN/clip walls to zero.
    this.map = this.builder.map;
    if (!this.map.heightMap || this.map.heightMap.length !== this.map.height) {
      this.builder.syncGrid(); // Rebuilds heightMap from layers
    }
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

  async _loadSharedMap(mapGrid) {
    if (
      !Array.isArray(mapGrid) ||
      mapGrid.length === 0 ||
      !Array.isArray(mapGrid[0])
    )
      return;
    await this.startBuilder();
    this.builder.importMapData({
      name: "Shared Map",
      width: mapGrid[0].length,
      height: mapGrid.length,
      grid: mapGrid,
    });
    this.map = this.builder.map;
  }

  _handleVictoryClick(e) {
    handleVictoryClick(this, e);
  }

  _handleSettingsClick(e) {
    handleSettingsClick(this, e);
  }

  _handleGameOverClick(e) {
    handleGameOverClick(this, e);
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

// Campaign and tutorial state bridges (legacy aliases on the prototype).
forwardProps(Game.prototype, "campaign", {
  campaignLevel: "level",
  campaignAct: "act",
  ngPlusCycle: "ngPlusCycle",
  ngPlusPrompt: "ngPlusPrompt",
  ngPlusPromptSel: "ngPlusPromptSel",
  campaignMissedWeapons: "missedWeapons",
  campaignPromptSelection: "promptSelection",
});
forwardProps(Game.prototype, "tutorial", {
  tutorialStep: "step",
  tutorialStepTime: "stepTime",
  tutorialMenuSelection: "menuSelection",
  tutorialShowCompletionMenu: "showCompletionMenu",
  tutorialPickedUp: "pickedUp",
  tutorialWeaponPickedUp: "weaponPickedUp",
  tutorialWeaponSwapped: "weaponSwapped",
  tutorialSecondWeaponPickedUp: "secondWeaponPickedUp",
  tutorialDoorOpened: "doorOpened",
  tutorialDashed: "dashed",
  tutorialCrouched: "crouched",
  tutorialSlid: "slid",
  tutorialFired: "fired",
  tutorialChronoUsed: "chronoUsed",
});
