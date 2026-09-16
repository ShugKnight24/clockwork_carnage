/**
 * TutorialSystem — owns all tutorial state and progression logic.
 * Extracted from game.js via strangler fig pattern.
 *
 * Receives a `game` reference for accessing shared state
 * (player, entities, audio, map, etc).
 */
import { TUTORIAL_MAP } from "./data.js";
import { Enemy, Pickup, Prop } from "./entities.js";
import { GameState } from "./game.js";
import { validatePropPosition } from "../src/systems/spawner.js";

export class TutorialSystem {
  constructor(game) {
    this.game = game;

    // Step progression
    this.step = 0;
    this.stepTime = 0;

    // Look tracking
    this.startAngle = 0;
    this.cumulativeAngle = 0;
    this.prevAngle = 0;

    // Movement tracking
    this.startX = 0;
    this.startY = 0;

    // Sprint tracking
    this.sprintTime = 0;
    this.sprintDone = false;

    // Interaction flags
    this.pickedUp = false;
    this.weaponPickedUp = false;
    this.weaponSwapped = false;
    this.secondWeaponPickedUp = false;
    this.doorOpened = false;
    this.dashed = false;
    this.crouched = false;
    this.slid = false;
    this.fired = false;
    this.chronoUsed = false;

    // Wave tracking
    this.wave1Spawned = false;
    this.wave2Spawned = false;

    // Post-combat
    this.sandboxInit = false;
    this.menuSelection = 1; // Default to "Begin Campaign" for better funnel
    this.originPlayed = false;
    this.showCompletionMenu = false;
    this.alarmPlayed = false;
  }

  async start() {
    const g = this.game;
    g.mode = "tutorial";
    g.player.reset();
    await g._ensureCutsceneEngine();
    if (g.cutsceneEngine.hasScript("clocking_in")) {
      g.startCutscene("clocking_in", () => {
        g.ariaEnabled = true;
        this.initLevel();
      });
    } else {
      this.initLevel();
    }
  }

  initLevel() {
    const g = this.game;
    g.map = structuredClone(TUTORIAL_MAP);
    g.player.x = TUTORIAL_MAP.playerStart.x;
    g.player.y = TUTORIAL_MAP.playerStart.y;
    g.player.angle = TUTORIAL_MAP.playerStart.dir;
    g.player.alive = true;
    g.player.weapons = [];
    g.player.currentWeapon = -1;
    g.entities = [];
    g.dustMotes = null;
    g.projectiles = [];

    // Spawn tutorial pickups
    for (const p of TUTORIAL_MAP.pickups) {
      g.entities.push(new Pickup(p.x, p.y, p.type, p));
    }
    // Spawn environmental props (with wall-intersection validation)
    if (TUTORIAL_MAP.props) {
      for (const p of TUTORIAL_MAP.props) {
        const pos = validatePropPosition(p.x, p.y, TUTORIAL_MAP.grid, TUTORIAL_MAP.width, TUTORIAL_MAP.height);
        if (pos) g.entities.push(new Prop(pos.x + 0.5, pos.y + 0.5, p.type));
      }
    }

    g.killedEnemies = 0;
    g.totalEnemies = 0;
    g.exitEntity = null;

    // Reset all tutorial state
    this.step = 0;
    this.stepTime = performance.now();
    this.startAngle = g.player.angle;
    this.cumulativeAngle = 0;
    this.prevAngle = g.player.angle;
    this.startX = g.player.x;
    this.startY = g.player.y;
    this.sprintTime = 0;
    this.sprintDone = false;
    this.pickedUp = false;
    this.weaponPickedUp = false;
    this.weaponSwapped = false;
    this.secondWeaponPickedUp = false;
    this.doorOpened = false;
    this.dashed = false;
    this.crouched = false;
    this.slid = false;
    this.fired = false;
    this.chronoUsed = false;
    this.wave1Spawned = false;
    this.wave2Spawned = false;
    this.sandboxInit = false;
    this.menuSelection = 1; // Default to "Begin Campaign" for better funnel
    this.originPlayed = false;
    this.showCompletionMenu = false;
    this.alarmPlayed = false;

    g.state = GameState.PLAYING;
    g.roundStartTime = performance.now() + 99999; // suppress controls overlay
    g.audio.startTrack("campaign", 130);
    g.audio.startAmbient("industrial");
    g.lockPointer();
  }

  advanceStep() {
    const g = this.game;
    this.step++;
    this.stepTime = performance.now();
    g.audio.menuConfirm();

    // Auto-open doors for later zones
    const doorMap = TUTORIAL_MAP.doors;
    const autoOpenDoors = {
      4: doorMap.door2,   // Step 4 (Arm) → open Firing Range
      8: doorMap.door3,   // Step 8 (Sprint) → open Fitness Center
      12: doorMap.door4,  // Step 12 (Chrono) → open Supervisor Office
      13: doorMap.door6,  // Step 13 (Resupply) → open inner office supplies
      14: doorMap.door5,  // Step 14 (Alert) → open Combat Arena
    };
    const doorsToOpen = autoOpenDoors[this.step];
    if (doorsToOpen) {
      for (const d of doorsToOpen) {
        g.map.grid[d.y][d.x] = 0;
      }
    }

    // Reset per-step interaction flags
    this.sprintTime = 0;
    this.sprintDone = false;
    this.dashed = false;
    this.crouched = false;
    this.slid = false;
    this.fired = false;
    this.weaponSwapped = false;
    this.doorOpened = false;
    this.chronoUsed = false;
    this.pickedUp = false;
    // Note: weaponPickedUp and secondWeaponPickedUp remain true once done
  }

  update(dt) {
    const g = this.game;
    const p = g.player;
    const now = performance.now();
    const elapsed = (now - this.stepTime) / 1000;

    // Respawn collected pickups after delay
    for (const e of g.entities) {
      if (!e.active && e._respawnAt && now >= e._respawnAt) {
        e.active = true;
        e._respawnAt = 0;
      }
    }

    // Clear waypoint by default
    g.objectiveWaypoint = null;

    switch (this.step) {
      case 0: // HUD CALIBRATION — auto 2.4s (cadet ID readout legibility)
        if (elapsed > 2.4) this.advanceStep();
        break;

      case 1: // SYSTEMS ONLINE — look around (cumulative angle > 2 rad)
        {
          let delta = p.angle - this.prevAngle;
          while (delta > Math.PI) delta -= Math.PI * 2;
          while (delta < -Math.PI) delta += Math.PI * 2;
          this.cumulativeAngle += Math.abs(delta);
          this.prevAngle = p.angle;
          if (this.cumulativeAngle > 2) this.advanceStep();
        }
        break;

      case 2: // MOVE — walk > 2.5 units from start
        g.objectiveWaypoint = { x: 25.5, y: 41.5 };
        {
          const dx = p.x - this.startX;
          const dy = p.y - this.startY;
          if (Math.sqrt(dx * dx + dy * dy) > 2.5) this.advanceStep();
        }
        break;

      case 3: // BREACH DOOR
        g.objectiveWaypoint = { x: 25.5, y: 41.5 };
        if (this.doorOpened) this.advanceStep();
        break;

      case 4: // ARM YOURSELF
        g.objectiveWaypoint = { x: 38.5, y: 42.5 };
        if (this.weaponPickedUp) this.advanceStep();
        break;

      case 5: // CONFIRM TARGETING — fire
        g.objectiveWaypoint = { x: 50, y: 42.5 };
        if (elapsed > 0.1 && this.fired) this.advanceStep();
        break;

      case 6: // AIM DOWN SIGHTS
        if (p.isAiming) this.advanceStep();
        break;

      case 7: // WEAPON SWITCH
        g.objectiveWaypoint = { x: 43.5, y: 42.5 };
        if (this.secondWeaponPickedUp && this.weaponSwapped)
          this.advanceStep();
        break;

      case 8: // SPRINT
        g.objectiveWaypoint = { x: 14, y: 20.5 };
        if (p.isSprinting) this.sprintTime += dt;
        if (this.sprintTime > 0.5) this.advanceStep();
        break;

      case 9: // CROUCH
        g.objectiveWaypoint = { x: 14, y: 19.5 };
        if (this.crouched) this.advanceStep();
        break;

      case 10: // SLIDE
        g.objectiveWaypoint = { x: 14, y: 18.5 };
        if (this.slid) this.advanceStep();
        break;

      case 11: // PHASE DASH
        g.objectiveWaypoint = { x: 14, y: 18 };
        if (this.dashed) this.advanceStep();
        break;

      case 12: // CHRONO SHIFT
        g.objectiveWaypoint = { x: 44.5, y: 21.5 };
        if (elapsed > 0.1 && this.chronoUsed) this.advanceStep();
        break;

      case 13: // RESUPPLY
        g.objectiveWaypoint = { x: 44.5, y: 21.5 };
        if (this.pickedUp) this.advanceStep();
        break;

      case 14: // ALERT
        if (!this.alarmPlayed) {
          this.alarmPlayed = true;
          g.audio.alarmKlaxon();
          g.screenShake = 3;
        }
        if (elapsed > 2.5) this.advanceStep();
        break;

      case 15: // WAVE 1 — kill 3 drones
        if (!this.wave1Spawned) {
          this.wave1Spawned = true;
          const positions = [
            { x: 20.5, y: 5.5 },
            { x: 39.5, y: 5.5 },
            { x: 29.5, y: 4.5 },
          ];
          for (const pos of positions) {
            const enemy = new Enemy(pos.x, pos.y, "drone");
            enemy.health = 15;
            enemy.maxHealth = 15;
            enemy.def = { ...enemy.def, damage: 3, speed: enemy.def.speed * 0.5 };
            g.entities.push(enemy);
          }
          g.totalEnemies = 3;
          g.killedEnemies = 0;
        }
        g.objectiveWaypoint = { x: 29.5, y: 6.5 };
        if (g.killedEnemies >= 3) this.advanceStep();
        break;

      case 16: // WAVE 2 — kill 2 henchmen + 1 drone
        if (!this.wave2Spawned) {
          this.wave2Spawned = true;
          const wavePositions = [
            { x: 15.5, y: 7.5, type: "henchman" },
            { x: 44.5, y: 7.5, type: "henchman" },
            { x: 29.5, y: 4.5, type: "drone" },
          ];
          for (const pos of wavePositions) {
            const enemy = new Enemy(pos.x, pos.y, pos.type);
            if (pos.type === "henchman") {
              enemy.health = 25;
              enemy.maxHealth = 25;
              enemy.def = { ...enemy.def, damage: 5, speed: enemy.def.speed * 0.6 };
            } else {
              enemy.health = 15;
              enemy.maxHealth = 15;
              enemy.def = { ...enemy.def, damage: 3, speed: enemy.def.speed * 0.5 };
            }
            g.entities.push(enemy);
          }
          g.totalEnemies = 3;
          g.killedEnemies = 0;
        }
        g.objectiveWaypoint = { x: 29.5, y: 6.5 };
        if (g.killedEnemies >= 3) this.advanceStep();
        break;

      case 17: // CALIBRATION COMPLETE — creator already shown pre-tutorial
        // (see js/main.js:playCreatorThen). Skip directly to completion sandbox.
        if (elapsed > 2 && !this.originPlayed) {
          g.achievementStats.tutorialComplete = true;
          g.checkAchievements();
          this.originPlayed = true;
          g.audio.stopMusic();
          this.advanceStep(); // → step 18 (sandbox + completion menu)
        }
        break;

      case 18: // Post-Creator Sandbox
        {
          if (!this.sandboxInit) {
            this.sandboxInit = true;
            this.spawnDummies();
            this.showCompletionMenu = true;
            g.state = GameState.TUTORIAL_COMPLETE;
            g.unlockPointer();
          }
          const dummies = g.entities.filter(
            (e) => e.type === "enemy" && e.active && e.state !== "dead",
          );
          if (dummies.length === 0 && this.sandboxInit) {
            this.spawnDummies();
          }
        }
        break;
    }
  }

  spawnDummies() {
    const g = this.game;
    g.entities = g.entities.filter(
      (e) => e.type !== "enemy" || (e.active && e.state !== "dead"),
    );
    const positions = [
      { x: 20.5, y: 6.5 },
      { x: 39.5, y: 6.5 },
      { x: 29.5, y: 4.5 },
    ];
    for (const pos of positions) {
      const dummy = new Enemy(pos.x, pos.y, "drone");
      dummy.health = 20;
      dummy.maxHealth = 20;
      dummy.speed = 0;
      dummy.def = { ...dummy.def, damage: 0, speed: 0, sightRange: 0 };
      dummy.state = "idle";
      g.entities.push(dummy);
    }
    g.totalEnemies = 3;
    g.killedEnemies = 0;
  }

  executeMenuChoice(choice) {
    const g = this.game;
    g.unlockPointer();
    g.audio.stopMusic();
    g.mode = null;
    switch (choice) {
      case 0: g.startCampaign(); break;
      case 1: g.startArena(); break;
      case 2: g.startTutorial(); break;
      case 3:
      default:
        g.state = GameState.TITLE;
        g.audio.stopMusic();
        g.audio.startTrack("menu");
        g.audio.startAmbient("menu");
        break;
    }
  }

  executeCompletionChoice(choice) {
    const g = this.game;
    this.showCompletionMenu = false;
    switch (choice) {
      case 0: // Continue Training (sandbox step 18)
        this.step = 18;
        this.stepTime = performance.now();
        this.sandboxInit = false;
        g.state = GameState.PLAYING;
        g.audio.startTrack("campaign", 130);
        g.audio.startAmbient("industrial");
        g.lockPointer();
        break;
      case 1: // Begin Campaign
        g.unlockPointer();
        g.startCampaign();
        break;
      case 2: // Customize Agent
        g.creatorReturnState = GameState.TUTORIAL_COMPLETE;
        g.state = GameState.CHARACTER_CREATE;
        break;
      case 3: // Main Menu
      default:
        g.unlockPointer();
        g.mode = null;
        g.state = GameState.TITLE;
        g.audio.stopMusic();
        g.audio.startTrack("menu");
        g.audio.startAmbient("menu");
        break;
    }
  }

  shouldShow() {
    const g = this.game;
    if (g.alwaysShowTutorial) return true;
    return !g.achievementStats.tutorialComplete;
  }
}
