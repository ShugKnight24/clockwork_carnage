import {
  WEAPONS,
  ENEMY_TYPES,
  ARENA_MAP,
  CAMPAIGN_LEVELS,
  UPGRADES,
  WALL_COLORS,
} from "./data.js";
import { Renderer } from "./renderer.js";
import { AudioManager } from "./audio.js";

// TODO: extract a Entity Component system that deals with shared info
class Player {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = 2;
    this.y = 2;
    this.angle = 0;
    this.health = 100;
    this.maxHealth = 100;
    this.armor = 0;
    this.ammo = 50;
    this.moveSpeed = 3.5;
    this.rotSpeed = 3.0;
    this.weapons = [0]; // weapon IDs owned
    this.currentWeapon = 0;
    this.damageMultiplier = 1;
    this.regenRate = 0;
    this.critChance = 0;
    this.lifeSteal = 0;
    this.splashDamage = 0;
    this.fireRateMultiplier = 1;
    this.dodgeChance = 0;
    this.maxShield = 0;
    this.shield = 0;
    this.multiShot = 1;
    this.thorns = 0;
    this.score = 0;
    this.kills = 0;
    this.secretsFound = 0;
    this.lastFireTime = 0;
    this.isFiring = false;
    this.weaponBob = 0;
    this.weaponKick = 0;
    this.hurtTime = 0;
    this.alive = true;
  }
  getWeaponDef() {
    return WEAPONS[this.weapons[this.currentWeapon]];
  }
}

class Enemy {
  constructor(x, y, type) {
    const def = ENEMY_TYPES[type];
    this.x = x;
    this.y = y;
    this.enemyType = type;
    this.def = def;
    this.health = def.health;
    this.maxHealth = def.health;
    this.speed = def.speed;
    // TODO: Improve Enemy AI
    this.state = "idle"; // idle, chase, attack, pain, dead
    this.active = true;
    this.lastAttackTime = 0;
    this.hitTime = 0;
    this.stateTime = 0;
    this.type = "enemy";
    this.angle = Math.random() * Math.PI * 2;
    this.painTimer = 0;
    this.alertRange = def.sightRange;
  }
}

class Pickup {
  constructor(x, y, type, extra = {}) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.active = true;
    this.weaponId = extra.weaponId;
  }
}

class Projectile {
  constructor(x, y, dirX, dirY, damage, speed, owner) {
    this.x = x;
    this.y = y;
    this.dirX = dirX;
    this.dirY = dirY;
    this.damage = damage;
    this.speed = speed;
    this.owner = owner;
    this.type = "projectile";
    this.active = true;
    this.color = "#ff0044";
    this.life = 3; // seconds
  }
}

export const GameState = {
  TITLE: "title",
  MODE_SELECT: "modeSelect",
  PLAYING: "playing",
  PAUSED: "paused",
  SETTINGS: "settings",
  UPGRADE: "upgrade",
  GAME_OVER: "gameOver",
  VICTORY: "victory",
  LEVEL_COMPLETE: "levelComplete",
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
    this.mouse = { dx: 0, locked: false };
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
    };
    this.settingsSelection = 0;
    this.lastEscTime = 0;

    this.setupInput();
    this.loadSettings();
  }

  // TODO: Abstract out InputManager
  setupInput() {
    document.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
      this.handleKeyPress(e.code);
    });
    document.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });
    document.addEventListener("mousemove", (e) => {
      if (this.mouse.locked) {
        this.mouse.dx += e.movementX;
      }
    });
    this.canvas.addEventListener("mousedown", (e) => {
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

    if (this.state === GameState.PLAYING) {
      // Weapon switching
      if (code === "Digit1" && this.player.weapons.length >= 1)
        this.player.currentWeapon = 0;
      if (code === "Digit2" && this.player.weapons.length >= 2)
        this.player.currentWeapon = 1;
      if (code === "Digit3" && this.player.weapons.length >= 3)
        this.player.currentWeapon = 2;
      if (code === "Digit4" && this.player.weapons.length >= 4)
        this.player.currentWeapon = 3;

      if (code === "KeyE") this.interact();
      if (code === "Escape" || code === "KeyP") {
        const now = performance.now();
        if (now - this.lastEscTime < 200) return;
        this.lastEscTime = now;
        this.state = GameState.PAUSED;
        document.exitPointerLock();
      }
      if (code === "KeyF") this.showFPS = !this.showFPS;
      return;
    }

    if (this.state === GameState.PAUSED) {
      if (code === "Escape" || code === "Enter" || code === "KeyP") {
        const now = performance.now();
        if (code === "Escape" && now - this.lastEscTime < 200) return;
        this.lastEscTime = now;
        this.state = GameState.PLAYING;
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
      if (code === "KeyF" && this.mode === "campaign") {
        this.saveCampaign();
        this.pauseSaveFlash = performance.now();
      }
      return;
    }

    if (this.state === GameState.SETTINGS) {
      // TODO: Too many magic numbers here, terrible to maintain
      const settingsCount = 6; // difficulty, crosshair, minimapSize, musicVolume, sfxVolume, sensitivity
      if (code === "ArrowUp" || code === "KeyW") {
        this.settingsSelection =
          (this.settingsSelection - 1 + settingsCount) % settingsCount;
        this.audio.menuSelect();
      }
      if (code === "ArrowDown" || code === "KeyS") {
        this.settingsSelection = (this.settingsSelection + 1) % settingsCount;
        this.audio.menuSelect();
      }
      if (code === "Enter" || code === "Space" || code === "ArrowRight") {
        if (this.settingsSelection === 0) {
          this.settings.difficulty = (this.settings.difficulty + 1) % 4;
        } else if (this.settingsSelection === 1) {
          this.settings.crosshair = (this.settings.crosshair + 1) % 6;
        } else if (this.settingsSelection === 2) {
          this.settings.minimapSize = Math.min(
            300,
            this.settings.minimapSize + 20,
          );
        } else if (this.settingsSelection === 3) {
          this.settings.musicVolume = Math.min(
            100,
            this.settings.musicVolume + 10,
          );
          this.audio.setMusicVolume(this.settings.musicVolume / 100);
        } else if (this.settingsSelection === 4) {
          this.settings.sfxVolume = Math.min(100, this.settings.sfxVolume + 10);
          this.audio.setSfxVolume(this.settings.sfxVolume / 100);
        } else if (this.settingsSelection === 5) {
          this.settings.sensitivity = Math.min(
            2.0,
            Math.round((this.settings.sensitivity + 0.1) * 10) / 10,
          );
        }
        this.audio.menuConfirm();
      }
      if (code === "ArrowLeft") {
        if (this.settingsSelection === 0) {
          this.settings.difficulty = (this.settings.difficulty + 3) % 4;
        } else if (this.settingsSelection === 1) {
          this.settings.crosshair = (this.settings.crosshair + 5) % 6;
        } else if (this.settingsSelection === 2) {
          this.settings.minimapSize = Math.max(
            100,
            this.settings.minimapSize - 20,
          );
        } else if (this.settingsSelection === 3) {
          this.settings.musicVolume = Math.max(
            0,
            this.settings.musicVolume - 10,
          );
          this.audio.setMusicVolume(this.settings.musicVolume / 100);
        } else if (this.settingsSelection === 4) {
          this.settings.sfxVolume = Math.max(0, this.settings.sfxVolume - 10);
          this.audio.setSfxVolume(this.settings.sfxVolume / 100);
        } else if (this.settingsSelection === 5) {
          this.settings.sensitivity = Math.max(
            0.5,
            Math.round((this.settings.sensitivity - 0.1) * 10) / 10,
          );
        }
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
  }

  applyAudioSettings() {
    this.audio.setMusicVolume(this.settings.musicVolume / 100);
    this.audio.setSfxVolume(this.settings.sfxVolume / 100);
  }

  // Save / Load
  saveSettings() {
    try {
      localStorage.setItem("cc_settings", JSON.stringify(this.settings));
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
  }

  saveArena() {
    try {
      const data = {
        round: this.arenaRound,
        score: this.player.score,
        kills: this.player.kills,
        health: this.player.health,
        maxHealth: this.player.maxHealth,
        armor: this.player.armor,
        ammo: this.player.ammo,
        weapons: this.player.weapons,
        moveSpeed: this.player.moveSpeed,
        damageMultiplier: this.player.damageMultiplier,
        regenRate: this.player.regenRate,
        critChance: this.player.critChance,
        lifeSteal: this.player.lifeSteal,
        splashDamage: this.player.splashDamage,
        fireRateMultiplier: this.player.fireRateMultiplier,
        dodgeChance: this.player.dodgeChance,
        maxShield: this.player.maxShield,
        shield: this.player.shield,
        multiShot: this.player.multiShot,
        thorns: this.player.thorns,
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
      this.mode = "arena";
      this.arenaRound = data.round;
      this.player.reset();
      this.player.score = data.score;
      this.player.kills = data.kills;
      this.player.health = data.health;
      this.player.maxHealth = data.maxHealth;
      this.player.armor = data.armor;
      this.player.ammo = data.ammo;
      this.player.weapons = data.weapons;
      this.player.moveSpeed = data.moveSpeed;
      this.player.damageMultiplier = data.damageMultiplier;
      this.player.regenRate = data.regenRate;
      this.player.critChance = data.critChance;
      this.player.lifeSteal = data.lifeSteal;
      this.player.splashDamage = data.splashDamage;
      this.player.fireRateMultiplier = data.fireRateMultiplier;
      this.player.dodgeChance = data.dodgeChance;
      this.player.maxShield = data.maxShield;
      this.player.shield = data.shield;
      this.player.multiShot = data.multiShot;
      this.player.thorns = data.thorns;
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
        level: this.campaignLevel,
        playerX: this.player.x,
        playerY: this.player.y,
        playerAngle: this.player.angle,
        currentWeapon: this.player.currentWeapon,
        health: this.player.health,
        maxHealth: this.player.maxHealth,
        armor: this.player.armor,
        ammo: this.player.ammo,
        weapons: this.player.weapons,
        score: this.player.score,
        kills: this.player.kills,
        secretsFound: this.player.secretsFound,
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
      this.mode = "campaign";
      this.campaignLevel = data.level;
      this.settings.difficulty = data.difficulty ?? this.settings.difficulty;
      this.player.reset();
      this.loadCampaignLevel(this.campaignLevel);

      // Restore player stats and position
      this.player.health = data.health;
      this.player.maxHealth = data.maxHealth;
      this.player.armor = data.armor;
      this.player.ammo = data.ammo;
      this.player.weapons = data.weapons;
      this.player.currentWeapon = data.currentWeapon ?? 0;
      this.player.score = data.score;
      this.player.kills = data.kills;
      this.player.secretsFound = data.secretsFound;

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
    this.map = JSON.parse(JSON.stringify(ARENA_MAP));
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

    this.state = GameState.PLAYING;
    this.roundStartTime = performance.now();
    this.audio.startMusic(140 + this.arenaRound * 5);
    this.canvas.requestPointerLock();
  }

  startCampaign() {
    this.mode = "campaign";
    this.campaignLevel = 0;
    this.player.reset();
    this.loadCampaignLevel(0);
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
    this.map = JSON.parse(JSON.stringify(level));
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
        const enemy = new Enemy(e.x, e.y, e.enemyType);
        enemy.health = Math.floor(enemy.health * diff.healthMul);
        enemy.maxHealth = enemy.health;
        enemy.def = {
          ...enemy.def,
          damage: Math.floor(enemy.def.damage * diff.damageMul),
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
    this.loadCampaignLevel(this.campaignLevel);
    this.saveCampaign();
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
            this.audio.enemyDeath();
            this.glitchEffect = 0.3;
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
      this.audio.enemyDeath();
      this.glitchEffect = 0.3;

      // Check if boss killed in campaign
      if (enemy.enemyType === "boss" && this.mode === "campaign") {
        this.state = GameState.VICTORY;
        this.audio.stopMusic();
        this.audio.roundComplete();
        this.clearCampaignSave();
        document.exitPointerLock();
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

    // FPS counter
    this.frameCount++;
    if (timestamp - this.fpsTime > 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = timestamp;
    }

    if (this.state !== GameState.PLAYING) return;

    // Death transition timer
    if (!this.player.alive) {
      if (this.deathTimer > 0) {
        this.deathTimer -= this.deltaTime;
        if (this.deathTimer <= 0) {
          this.state = GameState.GAME_OVER;
          this.audio.stopMusic();
          if (this.mode === "arena") this.clearArenaSave();
          else this.clearCampaignSave();
          document.exitPointerLock();
        }
      }
      return;
    }

    const dt = this.deltaTime;

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
  }

  updatePlayer(dt) {
    const p = this.player;
    let moveX = 0,
      moveY = 0;
    const cos = Math.cos(p.angle);
    const sin = Math.sin(p.angle);

    // WASD movement
    if (this.keys["KeyW"] || this.keys["ArrowUp"]) {
      moveX += cos;
      moveY += sin;
    }
    if (this.keys["KeyS"] || this.keys["ArrowDown"]) {
      moveX -= cos;
      moveY -= sin;
    }
    if (this.keys["KeyA"]) {
      moveX += sin;
      moveY -= cos;
    }
    if (this.keys["KeyD"]) {
      moveX -= sin;
      moveY += cos;
    }

    // Normalize
    const len = Math.sqrt(moveX * moveX + moveY * moveY);
    if (len > 0) {
      moveX = (moveX / len) * p.moveSpeed * dt;
      moveY = (moveY / len) * p.moveSpeed * dt;
    }

    // TODO: Add additional animations aside from the generic bob
    // Walking bob
    if (len > 0) {
      p.weaponBob += dt * 8;
    } else {
      p.weaponBob *= 0.9;
    }

    // Mouse look w/ Sensitivity
    if (this.mouse.dx !== 0) {
      p.angle += this.mouse.dx * 0.002 * p.rotSpeed * this.settings.sensitivity;
      this.mouse.dx = 0;
    }

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

        // TODO: Add a hit indicator or display damage
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
        }
      } else if (e.type === "ammo") {
        this.player.ammo = Math.min(999, this.player.ammo + 20);
        e.active = false;
        this.audio.pickup();
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

    // Screen shake offset
    let shakeX = 0,
      shakeY = 0;
    if (this.screenShake > 0.5) {
      shakeX = (Math.random() - 0.5) * this.screenShake;
      shakeY = (Math.random() - 0.5) * this.screenShake;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Render 3D scene
    this.renderer.renderScene(this.player, this.map, this.entities, this.time);

    ctx.restore();

    // Draw weapon
    this.drawWeapon(ctx, w, h);

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

    // Render overlay screens on HUD canvas (it's on top via z-index)
    const hctx = this.hudCtx;
    const hw = this.hudCanvas.width;
    const hh = this.hudCanvas.height;
    if (this.state === GameState.PAUSED) this.renderPauseScreen(hctx, hw, hh);
    if (this.state === GameState.SETTINGS)
      this.renderSettingsScreen(hctx, hw, hh);
    if (this.state === GameState.UPGRADE)
      this.renderUpgradeScreen(hctx, hw, hh);
    if (this.state === GameState.GAME_OVER) this.renderGameOver(hctx, hw, hh);
    if (this.state === GameState.VICTORY) this.renderVictory(hctx, hw, hh);
    if (this.state === GameState.LEVEL_COMPLETE)
      this.renderLevelComplete(hctx, hw, hh);
  }

  // TODO: Improve weapon art and animations / Reloading / Idle / Skins / Upgraded versions with visual changes?
  drawWeapon(ctx, w, h) {
    const wep = this.player.getWeaponDef();
    if (!wep) return;

    const bobX = Math.sin(this.player.weaponBob) * 8;
    const bobY = Math.abs(Math.cos(this.player.weaponBob)) * 5;
    const kickY = this.player.weaponKick * 40;

    // weapon scale (larger to stay visible above HUD) - increase assets size instead of scaling up as much in the future by default?
    const sc = 4.8;
    const cx = w / 2 + bobX;
    const cy = h - 190 + bobY + kickY;

    ctx.save();
    ctx.translate(cx, cy);
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

    const barH = 160;

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

    // FPS
    if (this.showFPS) {
      ctx.fillStyle = "#00ff00";
      ctx.font = "12px monospace";
      ctx.fillText(`FPS: ${this.fps}`, 10, 95);
    }

    // Controls hint
    const elapsed = (this.time - this.roundStartTime) / 1000;
    if (elapsed < 6) {
      const alpha = elapsed < 4 ? 0.85 : 0.85 * (1 - (elapsed - 4) / 2);
      this.drawControlsOverlay(ctx, w, h, alpha);
    }
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
    const saveMessage = this.mode === "campaign" ? "F     - Save Game" : "";
    ctx.save();
    ctx.globalAlpha = alpha;
    const boxW = 240;
    const boxH = 180;
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
    ctx.fillText("WASD  - Move", lx, by + 48);
    ctx.fillText("Mouse - Look", lx, by + 66);
    ctx.fillText("Click - Shoot", lx, by + 84);
    ctx.fillText("1-4   - Weapons", lx, by + 102);
    ctx.fillText("E     - Interact/Open", lx, by + 120);
    ctx.fillText("ESC/P - Pause", lx, by + 138);
    if (saveMessage) {
      ctx.fillStyle = "#aaccaa";
      ctx.fillText(saveMessage, lx, by + 156);
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
      "ESC / P to resume  |  S for settings  |  Q to quit" + saveHint,
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
    ctx.fillText("SETTINGS", w / 2, h / 2 - 140);

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
    ];

    const barW = 200;
    const barH = 6;
    const panelX = w / 2 - 220;
    const panelW = 440;
    const itemHeights = [44, 70, 60, 60, 60, 60]; // difficulty, crosshair, minimap, music, sfx, sensitivity
    let startY = h / 2 - 130;

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
    ctx.fillStyle = "rgba(40,0,0,0.9)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ff2200";
    ctx.font = "bold 42px monospace";
    ctx.textAlign = "center";
    ctx.fillText("TIMELINE COLLAPSED", w / 2, h / 2 - 40);
    ctx.fillStyle = "#ff8866";
    ctx.font = "18px monospace";
    ctx.fillText(
      `Final Score: ${this.player.score}  |  Kills: ${this.player.kills}`,
      w / 2,
      h / 2 + 10,
    );
    if (this.mode === "arena") {
      ctx.fillText(
        `Rounds Survived: ${this.arenaRound - 1}`,
        w / 2,
        h / 2 + 35,
      );
    }
    ctx.fillStyle = "#aaaaaa";
    ctx.font = "14px monospace";
    ctx.fillText("Press ENTER to return to title", w / 2, h / 2 + 70);
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
    ctx.fillText("TIMELINE RESTORED", w / 2, h / 2 - 60);

    ctx.fillStyle = "#aaddff";
    ctx.font = "20px monospace";
    ctx.fillText("The Paradox Lord has been defeated.", w / 2, h / 2 - 15);
    ctx.fillText(
      "The quantum continuum is stable once more.",
      w / 2,
      h / 2 + 15,
    );

    ctx.fillStyle = "#ffcc00";
    ctx.font = "bold 22px monospace";
    ctx.fillText(
      `Score: ${this.player.score}  |  Kills: ${this.player.kills}`,
      w / 2,
      h / 2 + 55,
    );

    ctx.fillStyle = "#aaaaaa";
    ctx.font = "14px monospace";
    ctx.fillText("Press ENTER to return to title", w / 2, h / 2 + 95);
    ctx.textAlign = "left";
  }

  renderLevelComplete(ctx, w, h) {
    ctx.fillStyle = "rgba(0,5,20,0.9)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 36px monospace";
    ctx.textAlign = "center";
    ctx.fillText("LEVEL COMPLETE", w / 2, h / 2 - 40);
    ctx.fillStyle = "#aaddff";
    ctx.font = "18px monospace";
    ctx.fillText(
      `Kills: ${this.killedEnemies}/${this.totalEnemies}  |  Secrets: ${this.player.secretsFound}`,
      w / 2,
      h / 2,
    );
    ctx.fillText(`Score: ${this.player.score}`, w / 2, h / 2 + 30);
    ctx.fillStyle = "#aaaaaa";
    ctx.font = "14px monospace";
    ctx.fillText("Press ENTER to continue", w / 2, h / 2 + 70);
    ctx.textAlign = "left";
  }
}
