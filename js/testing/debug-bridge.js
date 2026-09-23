/**
 * Clockwork Carnage — Debug Bridge
 *
 * Exposes window.ccDebug for external automation (Playwright, devtools).
 * Allows jumping to any game state, injecting player stats, capturing
 * frame data, and reading telemetry.
 *
 * PROPRIETARY — not shipped with the game.
 */

import { GameState } from "../game.js";
import {
  WEAPONS,
  getAct,
  campaignMap,
  UPGRADES,
  ENEMY_TYPES,
} from "../data.js";
import { CUTSCENE_SCRIPTS } from "../../src/data/cutscene-scripts.js";
import { Enemy } from "../entities.js";
import { effectiveAimFov } from "../../src/systems/aim.js";
import { bestTool } from "../../src/rpg/tools.js";

export function createDebugBridge(game) {
  const bridge = {
    // ── State Navigation ──────────────────────────────────
    /** Get current game state */
    getState() {
      return game.state;
    },

    /** Jump directly to a game state */
    setState(state) {
      game.state = state;
      return game.state;
    },

    /** Get all available states */
    getStates() {
      return { ...GameState };
    },

    // ── Game Mode Launchers ───────────────────────────────
    startTutorial() {
      game.audio.init();
      game.startTutorial();
      return game.state;
    },

    startArena() {
      game.audio.init();
      game.startArena();
      return game.state;
    },

    /**
     * The campaign plays all nine levels once per act (roster, briefings and
     * boss form change with the act), so act and level are independent.
     * Deriving the act from the level index started level 8 as the form-3
     * boss, which ends the game in one kill.
     */
    startCampaign(level = 0, act = 1) {
      game.audio.init();
      game.mode = "campaign";
      game.campaignLevel = level;
      game.campaignAct = act;
      game.player.reset();
      game.player.alive = true;
      game.loadCampaignLevel(level);
      game.state = GameState.PLAYING;
      return game.state;
    },

    startMeltdown(heroKey = "agent", ironman = false) {
      game.audio.init();
      game.startMeltdown(heroKey, ironman);
      return game.state;
    },

    startBuilder() {
      game.audio.init();
      game.startBuilder();
      return game.state;
    },

    // ── Voxel level building ──────────────────────────────
    // The Forge is mouse-driven; these reach the same world directly so a
    // test can lay out geometry and spawns without aiming a cursor at it.

    /** Set one block in the live voxel world. @returns {boolean} it changed */
    setBlock(x, y, z, id = 1) {
      const world = game.world || game.builder?.world;
      return world ? world.set(x, y, z, id) : false;
    },

    /** Add an enemy spawn marker for the next play-test. @returns {number} count */
    addEnemySpawn(x, y, z, type = "drone") {
      const world = game.world || game.builder?.world;
      if (!world) return 0;
      const list = world.meta.enemySpawns || [];
      list.push({ x, y, z, type });
      world.meta.enemySpawns = list;
      return list.length;
    },

    /** Place the exit marker a play-test ends on. @returns {object|null} the marker */
    setVoxelExit(x, y, z) {
      const world = game.world || game.builder?.world;
      if (!world) return null;
      world.meta.exit = { x, y, z };
      return { ...world.meta.exit };
    },

    /** Add a pickup marker for the next play-test. @returns {number} count */
    addVoxelPickup(x, y, z, type = "ammo", weaponId) {
      const world = game.world || game.builder?.world;
      if (!world) return 0;
      const list = world.meta.pickups || [];
      list.push({ x, y, z, type, weaponId });
      world.meta.pickups = list;
      return list.length;
    },

    /** Move where a play-test drops the player in. */
    setVoxelSpawn(x, y, z, yaw = 0) {
      const world = game.world || game.builder?.world;
      if (!world) return null;
      world.meta.spawn = { x, y, z, yaw };
      return { ...world.meta.spawn };
    },

    /** Voxel renderer + world mesh state, for tests that wait out a mesh sweep. */
    forgeWorldStats() {
      const world = game.world || game.builder?.world;
      const vr = game.voxelRenderer;
      if (!world || !vr) return null;
      let dirty = 0;
      for (let i = 0; i < world.dirty.length; i++) if (world.dirty[i]) dirty++;
      return {
        chunksDrawn: vr.stats.chunksDrawn,
        meshedThisFrame: vr.stats.meshedThisFrame,
        ms: vr.stats.ms,
        version: world.version,
        dirty,
      };
    },

    /**
     * Survival progression for the world open in the Forge, or null in a
     * creative one — that null is the flag e2e coverage branches on. Returns
     * plain data because the session itself holds a typed array the page
     * bridge cannot hand back.
     */
    forgeSurvival() {
      const s = game.builder?.survival;
      if (!s) return null;
      const items = {};
      for (const slot of s.inventory.slots) {
        if (slot) items[slot.item] = s.inventory.count(slot.item);
      }
      return {
        progress: s.progress,
        breaking: s.breaking !== null,
        tool: s.tool().id,
        mining: s.skills.level("mining"),
        construction: s.skills.level("construction"),
        xp: { ...s.skills.xp },
        items,
      };
    },

    /**
     * Station names within reach, as the Forge last polled them. A `Set` does
     * not cross the page bridge, so it is handed back as a plain array.
     */
    forgeStations() {
      return [...(game.builder?.stationsNear ?? [])];
    },

    /**
     * The craft menu's row ids for whatever is currently in reach — what the
     * player would see listed, without reading pixels.
     *
     * `craftMenuRows` lives in the lazily-loaded Forge chunk, so it is pulled
     * in dynamically: a static import would drag the whole Forge into the boot
     * bundle. There is no builder until that chunk has loaded, so this always
     * resolves from the module cache.
     */
    async craftRowIds() {
      const b = game.builder;
      if (!b?.survival) return [];
      const { craftMenuRows } = await import("../forge.js");
      return craftMenuRows(b.survival, b.stationsNear).map((r) => r.id);
    },

    /** Best held tool and its wear, or null bare-handed. */
    forgeTool() {
      const inv = game.builder?.survival?.inventory;
      if (!inv) return null;
      const { tool, slot } = bestTool(inv);
      if (slot < 0) return null;
      return { id: tool.id, dur: inv.slots[slot].dur, max: tool.durability };
    },

    async startBuilderPlayTest() {
      game.audio.init();
      // startBuilder lazy-loads the builder chunk on first use.
      if (game.state !== GameState.BUILDER) await game.startBuilder();
      game.startBuilderPlayTest();
      return game.state;
    },

    /** Start a specific cutscene by script key */
    async startCutscene(scriptKey) {
      game.audio.init();
      await game.startCutscene(scriptKey, () => {
        // Without a loaded map, PLAYING crashes the physics tick every frame.
        game.state = game.map ? GameState.PLAYING : GameState.TITLE;
      });
      return { state: game.state, available: scriptKey in CUTSCENE_SCRIPTS };
    },

    /** List all cutscene script keys */
    listCutscenes() {
      return Object.keys(CUTSCENE_SCRIPTS);
    },

    /** Navigate to upgrade screen with score */
    showUpgradeScreen(score = 10000) {
      game.audio.init();
      if (!game.mode) {
        game.startArena();
      }
      game.player.score = score;
      game.arenaRound = 3;
      game.state = GameState.UPGRADE;
      return game.state;
    },

    /** Navigate to game over */
    showGameOver() {
      game.state = GameState.GAME_OVER;
      return game.state;
    },

    /** Navigate to victory */
    showVictory() {
      game.state = GameState.VICTORY;
      return game.state;
    },

    /** Navigate to level complete */
    showLevelComplete() {
      game.state = GameState.LEVEL_COMPLETE;
      return game.state;
    },

    /** Navigate to tutorial complete */
    showTutorialComplete() {
      game.state = GameState.TUTORIAL_COMPLETE;
      game.tutorialMenuSelection = 0;
      return game.state;
    },

    /** Navigate to character creator */
    showCharacterCreate() {
      game.audio.init();
      game.creatorReturnState = GameState.MODE_SELECT;
      game.state = GameState.CHARACTER_CREATE;
      return game.state;
    },

    /** Navigate to pause menu */
    showPauseMenu() {
      game.pausedFromState = game.state;
      game.state = GameState.PAUSED;
      return game.state;
    },

    /** Navigate to settings */
    showSettings() {
      game.state = GameState.SETTINGS;
      return game.state;
    },

    /** Navigate to controls */
    showControls() {
      game.state = GameState.CONTROLS;
      return game.state;
    },

    // ── Player Manipulation ───────────────────────────────
    /** Set player stats */
    setPlayer(stats) {
      for (const [key, val] of Object.entries(stats)) {
        if (key in game.player) {
          game.player[key] = val;
        }
      }
      return this.getPlayer();
    },

    /** Get current player stats */
    getPlayer() {
      return {
        x: game.player.x,
        y: game.player.y,
        // Voxel levels give the player a third axis; a grid level leaves these
        // at zero.
        z: game.player.z || 0,
        vz: game.player.vz || 0,
        pitch: game.player.pitch || 0,
        grounded: !!game.player.grounded,
        angle: game.player.angle,
        aimOffsetX: game.player.aimOffsetX || 0,
        aimOffsetY: game.player.aimOffsetY || 0,
        health: game.player.health,
        maxHealth: game.player.maxHealth,
        armor: game.player.armor,
        ammo: game.player.ammo,
        score: game.player.score,
        kills: game.player.kills,
        alive: game.player.alive,
        weapons: [...game.player.weapons],
        currentWeapon: game.player.currentWeapon,
        damageMultiplier: game.player.damageMultiplier,
        critChance: game.player.critChance,
        moveSpeed: game.player.moveSpeed,
      };
    },

    /**
     * FOV the renderer and the fire path are using this frame. ADS eases in
     * rather than snapping, so tests must read this instead of assuming the
     * fully-zoomed value.
     */
    getAimFov() {
      return effectiveAimFov(game.player, game.settings);
    },

    /** Shot accounting for the current run — for diagnosing bot combat. */
    getCombatStats() {
      const alive = game.entities.filter((e) => e.type === "enemy" && e.active && !e.dissolving);
      return {
        shotsFired: game.shotsFired,
        shotsHit: game.shotsHit,
        playerHealth: game.player.health,
        playerAlive: game.player.alive,
        arenaRound: game.arenaRound,
        aliveEnemies: alive.map((e) => ({
          type: e.enemyType, state: e.state, hp: e.health,
          dist: +Math.hypot(e.x - game.player.x, e.y - game.player.y).toFixed(2),
        })),
      };
    },

    /**
     * Enable per-phase profiling and return the profiler's rolling averages.
     * Phase timings are only collected while game.showFPS is on.
     */
    getPerf(enable = true) {
      if (enable) game.showFPS = true;
      return game.profiler?.getSnapshot?.() ?? null;
    },

    /** Give player all weapons */
    giveAllWeapons() {
      game.player.weapons = WEAPONS.map((_, i) => i);
      return game.player.weapons;
    },

    /** Set god mode */
    godMode(on = true) {
      if (on) {
        game.player.health = 999999;
        game.player.maxHealth = 999999;
        game.player.ammo = 999999;
      }
      return on;
    },

    // ── World Info ────────────────────────────────────────
    /** Get entity counts and positions */
    getEntities() {
      const enemies = game.entities.filter(
        (e) => e.active && e.type === "enemy",
      );
      const pickups = game.entities.filter(
        (e) =>
          e.active &&
          e.type !== "enemy" &&
          e.type !== "projectile" &&
          e.type !== "exit",
      );
      return {
        total: game.entities.length,
        enemies: enemies.length,
        pickups: pickups.length,
        projectiles: game.projectiles.length,
        positions: enemies.map((e) => ({
          type: e.enemyType,
          x: e.x,
          y: e.y,
          z: e.z || 0,
          health: e.health,
          state: e.state,
          windupLeftMs: e._windupLeftMs || 0,
        })),
      };
    },

    /** Get map metadata */
    getMapInfo() {
      if (!game.map) return null;
      return {
        width: game.map.width,
        height: game.map.height,
        playerStart: game.map.playerStart,
        exit: game.map.exit,
        name: game.map.name,
      };
    },

    /** Get round/level info */
    getProgress() {
      return {
        mode: game.mode,
        state: game.state,
        arenaRound: game.arenaRound,
        arenaTimer: game.arenaTimer,
        campaignLevel: game.campaignLevel,
        campaignAct: game.campaignAct,
        killedEnemies: game.killedEnemies,
        totalEnemies: game.totalEnemies,
        tutorialStep: game.tutorialStep,
      };
    },

    getDiagnostics() {
      return {
        state: game.state,
        mode: game.mode,
        player: this.getPlayer(),
        progress: this.getProgress(),
        entities: this.getEntities(),
        map: this.getMapInfo(),
        meltdown: game.meltdown
          ? {
              distance: game.meltdown.distance,
              maxDistance: game.meltdown.maxDistance,
              heat: game.meltdown.heat,
              score: game.meltdown.score,
              alive: game.meltdown.alive,
              upgradesPending: !!game.meltdown.upgradesPending,
            }
          : null,
      };
    },

    chooseMeltdownUpgrade(index = 0) {
      if (!game._meltdownUpgradeChoices) return false;
      game.meltdown.selectUpgrade(index);
      game._meltdownUpgradeChoices = null;
      return true;
    },

    // ── Cutscene Control ──────────────────────────────────
    /** Advance cutscene by one frame */
    advanceCutscene() {
      if (game.cutsceneEngine?.isActive) {
        game.cutsceneEngine.advance();
      }
      return game.cutsceneEngine?.isActive;
    },

    /** Skip entire cutscene */
    skipCutscene() {
      if (game.cutsceneEngine?.isActive) {
        game.cutsceneEngine.end();
      }
      return game.state;
    },

    /** Get cutscene info */
    getCutsceneInfo() {
      const cs = game.cutsceneEngine.cutscene;
      if (!cs) return null;
      return {
        frame: cs.frame,
        totalFrames: cs.script.length,
        currentFrame: cs.script[cs.frame],
      };
    },

    // ── Input Simulation ──────────────────────────────────
    /** Press a key */
    pressKey(code) {
      game.handleKeyPress(code);
    },

    /** Hold key down */
    keyDown(code) {
      game.keys[code] = true;
    },

    /** Release key */
    keyUp(code) {
      game.keys[code] = false;
    },

    /** Simulate mouse movement */
    mouseDelta(dx, dy) {
      game.mouse.dx = dx;
      game.mouse.dy = dy;
      game.mouse.locked = true;
    },

    /** Fire weapon */
    fire(on = true) {
      game.player.isFiring = on;
    },

    /** Clear all input */
    clearInput() {
      for (const k of Object.keys(game.keys)) game.keys[k] = false;
      game.mouse.dx = 0;
      game.mouse.dy = 0;
      game.player.isFiring = false;
    },

    // ── Canvas / Screenshot Helpers ───────────────────────
    /** Force a render frame (for screenshots when paused) */
    forceRender() {
      game.render();
    },

    /** Get canvas dimensions */
    getCanvasSize() {
      return {
        width: game.canvas.width,
        height: game.canvas.height,
      };
    },

    // ── Upgrade Manipulation ──────────────────────────────
    /** Buy an upgrade by key */
    buyUpgrade(key) {
      game.buyUpgrade(key);
      return game.upgradeLevels;
    },

    /** Set upgrade levels directly */
    setUpgradeLevels(levels) {
      game.upgradeLevels = { ...levels };
      return game.upgradeLevels;
    },

    /** List available upgrades */
    listUpgrades() {
      return Object.entries(UPGRADES).map(([key, u]) => ({
        key,
        name: u.name,
        maxLevel: u.maxLevel,
        currentLevel: game.upgradeLevels[key] || 0,
      }));
    },

    // ── Campaign Info ─────────────────────────────────────
    /** The levels of one act, in play order: startCampaign's `level`. */
    listCampaignLevels(act = 1) {
      const maps = (getAct(act)?.levels ?? []).map(campaignMap);
      return maps.map((l, i) => ({
        index: i,
        name: l.name,
        width: l.width,
        height: l.height,
        entities: l.entities?.length || 0,
      }));
    },

    // ── Batch Helpers ─────────────────────────────────────
    /** Wait N frames (lets game update) */
    async waitFrames(n) {
      return new Promise((resolve) => {
        let count = 0;
        function tick() {
          if (++count >= n) return resolve();
          requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    },

    /** Wait until game reaches a specific state (max timeout ms) */
    async waitForState(targetState, timeoutMs = 5000) {
      const start = Date.now();
      return new Promise((resolve) => {
        function check() {
          if (game.state === targetState) return resolve(true);
          if (Date.now() - start > timeoutMs) return resolve(false);
          requestAnimationFrame(check);
        }
        requestAnimationFrame(check);
      });
    },

    // ── Spawn / World Manipulation ────────────────────────
    /** Spawn an enemy at (x, y). Defaults to player position + 2 units ahead. */
    spawn(type = "drone", x, y) {
      if (!ENEMY_TYPES[type]) {
        return { error: `Unknown type "${type}". Valid: ${Object.keys(ENEMY_TYPES).join(", ")}` };
      }
      if (x == null || y == null) {
        x = game.player.x + Math.cos(game.player.angle) * 2;
        y = game.player.y + Math.sin(game.player.angle) * 2;
      }
      const enemy = new Enemy(x, y, type);
      enemy.state = "chase";
      game.entities.push(enemy);
      return { type, x: enemy.x, y: enemy.y, health: enemy.health };
    },

    /** List all spawnable enemy types */
    listEnemyTypes() {
      return Object.entries(ENEMY_TYPES).map(([key, def]) => ({
        key, name: def.name, health: def.health, speed: def.speed,
      }));
    },

    /** Kill all enemies instantly */
    killAll() {
      let killed = 0;
      for (const e of game.entities) {
        if (e.type === "enemy" && e.active) { e.active = false; e.health = 0; killed++; }
      }
      return killed;
    },

    // ── Teleport ──────────────────────────────────────────
    /** Teleport player to (x, y). If no args, teleport to map exit. */
    teleport(x, y) {
      if (x != null && y != null) {
        game.player.x = x;
        game.player.y = y;
      } else if (game.map?.exit) {
        game.player.x = game.map.exit.x;
        game.player.y = game.map.exit.y;
      }
      return { x: game.player.x, y: game.player.y };
    },

    // ── Noclip ────────────────────────────────────────────
    /** Toggle noclip (walk through walls). Sets game._noclip flag checked by physics. */
    noclip(on) {
      game._noclip = on ?? !game._noclip;
      return game._noclip;
    },

    // ── Slow Motion ───────────────────────────────────────
    /** Set game time scale. 1 = normal, 0.1 = 10x slower, 2 = double speed. */
    slowmo(scale = 0.25) {
      game.timeScale = Math.max(0.01, Math.min(scale, 5));
      game.slowMoTimer = scale < 1 ? 999999 : 0; // keep it locked if slowed
      return game.timeScale;
    },

    // ── Quality Presets ───────────────────────────────────
    /** Apply a quality preset: ultra, high, medium, low. */
    quality(preset) {
      if (!game.quality) return { error: "AdaptiveQuality not attached" };
      if (preset && typeof game.quality.applyPreset === "function") {
        game.quality.applyPreset(preset);
        return {
          preset,
          renderScale: game.quality.renderScale,
          particles: game.quality.particleMultiplier,
          drawDistance: game.quality.drawDistance,
        };
      }
      // No arg → return current quality state
      return {
        renderScale: game.quality.renderScale,
        particles: game.quality.particleMultiplier,
        drawDistance: game.quality.drawDistance,
        scanlines: game.quality.enableScanlines,
        vignette: game.quality.enableVignette,
        floorTexture: game.quality.enableFloorTexture,
      };
    },

    // ── Spatial Grid Debug ────────────────────────────────
    /** Dump spatial grid stats. */
    spatial() {
      const grid = game.entityGrid;
      if (!grid) return { error: "SpatialGrid not attached" };
      const entities = game.entities.filter((e) => e.active).length;
      const nearby = grid.query(game.player.x, game.player.y, 3);
      return {
        activeCells: grid.size,
        totalEntities: entities,
        nearPlayer: nearby.length,
        nearPlayerTypes: nearby.map((e) => e.enemyType || e.type),
      };
    },
  };

  // Live game object, for probes that need internals the bridge does not wrap.
  bridge.game = game;

  return bridge;
}
