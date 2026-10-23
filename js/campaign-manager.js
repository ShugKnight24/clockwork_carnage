/**
 * CampaignManager — owns all campaign state and progression logic.
 * Extracted from game.js via strangler fig pattern.
 *
 * Receives a `game` reference for accessing shared state
 * (player, entities, audio, renderer, etc).
 */
import * as Save from "../src/core/save-system.js";
import {
  ACTS,
  NG_PLUS,
  campaignMap,
  campaignLevelMap,
  getAct,
  getActLevel,
  isLastAct,
} from "./data.js";
import {
  createCampaignEntities,
  createMissedWeaponPickups,
  applyActEnemyRoster,
} from "../src/systems/spawner.js";
import { isBossEnemy } from "../src/systems/combat.js";
import { levelsBefore, sceneFor, earnsTrueEnding } from "../src/data/campaign/acts.js";
import { trackEvent } from "./analytics.js";
import { GameState } from "../src/types.js";
import { getArtStyle, ART_LEGACY } from "../src/rendering/art-style.js";
import { prefetchEnemyModel } from "../src/rendering/svg-art/sprites/enemies.js";
import { EXIT_GATES, lockdownFor, planLockdown, planPowerCells, powerCellsFor } from "../src/systems/exit-cells.js";
import { setPieceFor } from "../src/data/campaign/set-pieces.js";
import { Pickup } from "./entities.js";

/** ARIA's line for each parting gift (src/systems/chrono-powers.js GIFTS). */
const GIFT_LINES = {
  timeLock: "giftTimeLock",
  rewind: "giftRewind",
  dash: "giftDash",
  foresight: "giftForesight",
};

export class CampaignManager {
  constructor(game) {
    this.game = game;
    this.level = 0;
    this.act = 1;
    this.missedWeapons = [];
    this.ngPlusCycle = 0;
    this.ngPlusPrompt = false;
    this.trueEnding = false;
    this.ngPlusPromptSel = 0;
    this.promptSelection = 0;
    // Delayed level-start callouts. Cleared on the next loadLevel so a
    // quick restart or level skip cannot fire the previous level's lines.
    this._levelTimers = new Set();
  }

  _afterLevelStart(ms, fn) {
    const id = setTimeout(() => {
      this._levelTimers.delete(id);
      fn();
    }, ms);
    this._levelTimers.add(id);
  }

  _clearLevelTimers() {
    for (const id of this._levelTimers) clearTimeout(id);
    this._levelTimers.clear();
  }

  // ── persistence ──

  save() {
    const g = this.game;
    Save.saveCampaign(
      this.level,
      this.act,
      this.ngPlusCycle,
      g.player,
      g.settings.difficulty,
      g.map.grid,
      g.entities,
      g.killedEnemies,
    );
  }

  load() {
    const g = this.game;
    const raw = Save.loadCampaignData();
    if (!raw) return false;
    const index = raw.level | 0;
    const level = campaignLevelMap(raw.act || 1, index);
    if (!level) {
      this.clearSave();
      return false;
    }
    try {
      const data = Save.sanitizeCampaignSave(raw, level);
      g.mode = "campaign";
      this.level = index;
      this.act = data.act || 1;
      this.ngPlusCycle = data.ngPlusCycle || 0;
      g.settings.difficulty = data.difficulty ?? g.settings.difficulty;
      g.player.reset();
      // Stats the save does not carry (stamina) come from the class and
      // gear; everything it does carry is overwritten just below.
      g.applyLoadoutBonuses?.();
      this.loadLevel(this.level);
      g.player.deserialize(data);
      if (data.playerX !== undefined) {
        g.player.x = data.playerX;
        g.player.y = data.playerY;
        g.player.angle = data.playerAngle;
      }
      if (data.mapGrid) g.map.grid = data.mapGrid;
      if (data.entityStates && data.entityStates.length === g.entities.length) {
        for (let i = 0; i < data.entityStates.length; i++) {
          const saved = data.entityStates[i];
          const ent = g.entities[i];
          if (saved.type !== ent.type) continue;
          ent.active = saved.active;
          if (saved.type === "enemy" && ent.type === "enemy") {
            if (Number.isFinite(saved.health)) ent.health = saved.health;
            if (saved.x !== undefined) {
              ent.x = saved.x;
              ent.y = saved.y;
            }
            ent.state = saved.state;
          }
        }
        g.killedEnemies = data.killedEnemies ?? 0;
      }
      this._noteMigration(raw);
      // The level's tally restarts on resume; secret walls already opened in
      // the saved map still count as this level's finds.
      if (g._levelLog) {
        let shut = 0;
        for (const row of g.map.grid) for (const t of row) if (t === 6) shut++;
        const opened = Math.max(0, g._levelLog.secretsTotal - shut);
        g._levelLog.secretsAtStart = Math.max(0, (g.player.secretsFound || 0) - opened);
      }
      this._levelStart = this._snapshotPlayer();
      return true;
    } catch (err) {
      // A save this build cannot apply: restart its level rather than leave
      // the player in a half-loaded one.
      console.warn("[Campaign] save could not be applied; restarting level", err);
      g.player.reset();
      this.loadLevel(index);
      this._noteMigration(raw);
      return true;
    }
  }

  /**
   * A save from before the story restructure was moved to where its act now
   * begins (save-system migrateCampaignSave); ARIA says so, once. The save
   * loadLevel just wrote no longer carries the flag.
   */
  _noteMigration(raw) {
    if (raw.migrated) this.game.queueAriaMessage?.("storyRestructured");
  }

  clearSave() {
    Save.clearCampaignSave();
  }

  // ── lifecycle ──

  start() {
    const g = this.game;
    // The locker-room prologue already played "clocking_in"; don't repeat it.
    const fromTutorial = g.mode === "tutorial";
    g.mode = "campaign";
    this.level = 0;
    this.act = 1;
    this.ngPlusCycle = 0;
    this.ngPlusPrompt = false;
    this.trueEnding = false;
    g.achievementStats.totalGamesPlayed++;
    this.missedWeapons = [];
    g.player.reset();
    g.applyLoadoutBonuses();

    const playIntroAndMaybeMemory = () => {
      const seenKey = "cc_seen_intro_memory_01";
      const flipbookKey = "cc_seen_intro_flipbook";
      const playMemory = () => {
        if (!Save.hasSeenIntroMemory(seenKey)) {
          Save.markIntroMemorySeen(seenKey);
          g.startCutscene("intro_memory_01", () => {
            this.loadLevel(0);
          });
        } else {
          this.loadLevel(0);
        }
      };
      // ARIA's briefing film (src/cinematic/films.js, LORE_SEEN_KEY) tells the
      // premise — 2181, the Chronos Engine, the eleven seconds, the last
      // anchor — so once it has played, "intro" would only say it again.
      const premise = (next) => {
        if (Save.hasSeenIntroMemory("cc_seen_lore_video")) next();
        else g.startCutscene("intro", next);
      };
      const afterFlipbook = () => {
        if (!fromTutorial && g.hasCutsceneScript("clocking_in")) {
          g.startCutscene("clocking_in", () => {
            const suited = () => {
              g.ariaEnabled = true;
              g.queueAriaMessage("campaignStart");
              premise(playMemory);
            };
            if (g.hasCutsceneScript("suit_up")) g.startCutscene("suit_up", suited);
            else suited();
          });
        } else {
          premise(playMemory);
        }
      };
      // First-play: show Marvel-style flipbook intro before the rest.
      // Mark-seen fires inside the cutscene's onComplete so an aborted intro replays.
      if (
        !Save.hasSeenIntroMemory(flipbookKey) &&
        g.hasCutsceneScript("intro_flipbook")
      ) {
        g.startCutscene("intro_flipbook", () => {
          Save.markIntroMemorySeen(flipbookKey);
          afterFlipbook();
        });
      } else {
        afterFlipbook();
      }
    };
    playIntroAndMaybeMemory();
  }

  /**
   * Bake the next level's environment while its briefing plays: an idle
   * callback during the scenes, so the level's first frame is not a ~200 ms
   * freeze. Harmless if the level starts first (the renderer bakes as before).
   */
  _prewarmLevel(actId, index) {
    const r = this.game.renderer;
    const act = getAct(actId);
    const entry = act && getActLevel(actId, index);
    if (!r?.prewarmEnv || !entry) return;
    const run = () => r.prewarmEnv(act.palette, entry.env);
    if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 1500 });
    else setTimeout(run, 300);
  }

  loadLevel(index) {
    const g = this.game;
    this._clearLevelTimers();
    g.ariaComms?.flush();
    const entry = getActLevel(this.act, index);
    const level = campaignMap(entry);
    if (!level) {
      g.state = GameState.VICTORY;
      g.audio.stopMusic();
      g.audio.roundComplete();
      this.clearSave();
      g.unlockPointer();
      return;
    }
    g.map = structuredClone(level);
    g.world = null;
    g.player.x = level.playerStart.x;
    g.player.y = level.playerStart.y;
    g.player.angle = level.playerStart.dir;
    g.player.alive = true;
    g.entities = [];
    g.dustMotes = null;
    g.projectiles = [];
    g._chronoBombs = [];

    const diff = g.getDifficultyMultipliers();
    const { entities: spawned, exitEntity } = createCampaignEntities(
      level,
      this.act,
      this.ngPlusCycle,
      diff,
    );
    g.entities.push(...spawned);
    g.exitEntity = exitEntity || null;

    // Power cells hold the exit shut where the power is the story (the
    // reactor, the Engine): placed in the side rooms off the direct route,
    // the same every run (exit-cells.js EXIT_GATES).
    const gate = EXIT_GATES[entry.map];
    const cellCount = powerCellsFor(level, setPieceFor(entry), entry.map);
    const cells = cellCount
      ? planPowerCells(level.grid, level.playerStart, level.exit, cellCount, entry.seed ?? this.act * 100 + index)
      : [];
    for (const c of cells) g.entities.push(new Pickup(c.x, c.y, "powerCell"));
    // Last level's notice card does not carry over.
    if (g._noticeCard) {
      g.messages?.done(g._noticeCard.key);
      g._noticeCard = null;
    }
    g.powerCells = cells.length ? { total: cells.length, found: 0 } : null;
    g.lockdown = null;
    // The story told while the level is played (src/data/campaign/beats.js).
    g.levelBeats?.start(this.act, entry.map);
    if (g.exitEntity) g.exitEntity.sealed = !!g.powerCells;
    if (g.powerCells) {
      g.queueAriaMessage(gate?.brief ?? "powerCellsBrief");
      // The first gated level explains the rule; later ones just remind.
      let seen = false;
      try {
        seen = !!localStorage.getItem("cc_seen_power_cells");
        localStorage.setItem("cc_seen_power_cells", "1");
      } catch (_) {}
      const n = g.powerCells.total;
      g.showNotice?.(
        "cells",
        `EXTRACTION SEALED — FIND ${n} POWER CELL${n === 1 ? "" : "S"}`,
        seen
          ? `${gate?.why ?? "The exit needs them."} Amber diamonds on your map.`
          : `${gate?.why ?? "The exit beacon stays locked until you recover them."} They're off the main corridor: look for the amber glow, or the amber diamonds on your map. The count is under your timer.`,
        seen ? 6 : 11,
      );
    }

    if (this.missedWeapons && this.missedWeapons.length > 0) {
      g.entities.push(
        ...createMissedWeaponPickups(
          this.missedWeapons,
          g.player.weapons,
          level.playerStart.x,
          level.playerStart.y,
        ),
      );
    }

    // Chronos: the powers this slot has earned, and its set piece (seals, a
    // teach room's enemies) laid over the map before the enemies are counted.
    g.chronoPowers?.startLevel(g);
    g.chronoHazards?.load(g, entry);

    g.killedEnemies = 0;
    g.totalEnemies = g.entities.filter((e) => e.type === "enemy").length;
    // A lockdown holds the exit until a share of those hostiles is down.
    if (!g.powerCells) {
      g.lockdown = planLockdown(lockdownFor(level, setPieceFor(entry), entry.map), g.totalEnemies);
      if (g.lockdown && g.exitEntity) {
        g.exitEntity.sealed = true;
        g.queueAriaMessage("lockdownBrief");
        g.showNotice?.(
          "lockdown",
          `LOCKDOWN — DROP ${g.lockdown.need} HOSTILES`,
          "The doors out are held while this floor's defenders stand. Put them down and the exit opens. The count is under your timer.",
          8,
        );
      }
    }
    g.killStreakSystem.reset();
    g.shotsFired = 0;
    g.shotsHit = 0;
    g.slowMoTimer = 0;
    g.timeScale = 1;
    g.ariaCombatTimer = 0;

    // Update squad comms narrative context
    if (g.squadComms) {
      g.squadComms.setContext(this.act, this.level);
    }
    // Update ARIA idle-pool narrative context (Sprint E 4.8/4.11)
    if (g.ariaComms && typeof g.ariaComms.setNarrativeContext === "function") {
      g.ariaComms.setNarrativeContext({
        act: this.act,
        ngPlusCycle: this.ngPlusCycle || 0,
        ambient: getAct(this.act)?.ambient ?? null,
      });
    }

    this._applyActEnemyRoster(entry);
    this._warmRoster();

    const act = getAct(this.act);
    const hasBoss = g.entities.some((e) => e.type === "enemy" && isBossEnemy(e));
    if (hasBoss) {
      g.queueAriaMessage(act.boss.aria);
      // Sprint E 4.10: Squad ensemble chatter per boss phase
      const pool = act.boss.squadPool;
      if (pool != null && g.squadComms && typeof g.squadComms.onBossPhase === "function") {
        this._afterLevelStart(2000, () => g.squadComms.onBossPhase(pool));
      }
      // Boss intro flourish — 2.5s slow-mo + glitch spike + name card.
      // Drives drama on first encounter without depending on a cutscene
      // pipeline. HUD reads bossNameCard to render the overlay.
      g.slowMoTimer = 2.5;
      g.timeScale = 0.4;
      g.glitchEffect = Math.max(g.glitchEffect, 0.8);
      g.bossNameCard = {
        ...act.boss.card,
        time: g.time,
        duration: 3500,
      };
    } else if (g.squadComms && entry.squad.length > 0) {
      // Squad chimes in at non-boss level starts, when anyone is present
      this._afterLevelStart(1500, () => g.squadComms.onCombatStart());
    }

    // A power granted at this slot: ARIA says so as its teach card comes up.
    if (g.chronoPowers?.fresh?.length && g.queueAriaMessage) {
      this._afterLevelStart(2500, () => g.queueAriaMessage("powerUnlocked"));
    }
    // Act IV: what the ally who stays behind in this level left in the suit.
    for (const gift of g.chronoPowers?.freshGifts ?? []) {
      if (!g.queueAriaMessage) break;
      this._afterLevelStart(3500, () => g.queueAriaMessage(GIFT_LINES[gift]));
    }

    // One-shot lore lines for this level (Sprint E 4.3/4.4 reveals, and the
    // 4.6 NG+ Dead Squad foreshadowing).
    for (const line of entry.onStart) {
      if ((line.minNgPlus ?? 0) > (this.ngPlusCycle || 0) || !g.queueAriaMessage) continue;
      this._afterLevelStart(line.delay ?? 0, () => g.queueAriaMessage(line.aria));
    }

    g.state = GameState.PLAYING;
    g.roundStartTime = performance.now();
    g.beginLevelLog?.();
    g.renderer.applyActPalette(act.palette, entry.env);
    if (hasBoss) {
      g.audio.startTrack("boss");
    } else {
      g.audio.startTrack("campaign", 130);
    }
    g.audio.startAmbient("industrial");
    this.save();
    this._levelStart = this._snapshotPlayer();
    g.lockPointer();
  }

  /**
   * The player as a level began, for Retry Level: the saved stats, plus the
   * stamina the save leaves out and the gear bonuses already applied, so a
   * piece picked up during the failed attempt goes back on exactly once.
   */
  _snapshotPlayer() {
    const p = this.game.player;
    if (!p.serialize) return null;
    return structuredClone({ ...p.serialize(), maxStamina: p.maxStamina, gearApplied: p._gearApplied ?? null });
  }

  /**
   * After a death: play this level again from its start, with the kit the
   * player brought into it and full health. Restart used to begin a new
   * campaign, overwriting the save — one death in Act I level 7 cost all of it.
   */
  retryLevel() {
    const g = this.game;
    const start = this._levelStart;
    g.mode = "campaign";
    g.player.reset();
    this.loadLevel(this.level);
    if (start) {
      g.player.deserialize(structuredClone(start));
      if (start.maxStamina) g.player.maxStamina = start.maxStamina;
      g.player._gearApplied = structuredClone(start.gearApplied ?? null);
      if (g._levelLog) g._levelLog.secretsAtStart = g.player.secretsFound || 0;
    }
    g.syncGearBonuses?.();
    g.player.health = g.player.maxHealth;
    g.player.stamina = g.player.maxStamina;
    g.player.alive = true;
    this._levelStart = this._snapshotPlayer();
    this.save();
  }

  nextLevel() {
    const g = this.game;
    if (this.missedWeapons == null) this.missedWeapons = [];

    // Track missed weapon pickups
    for (const e of g.entities) {
      if (e.type === "weapon" && e.active && e.weaponId != null) {
        if (!this.missedWeapons.includes(e.weaponId)) {
          this.missedWeapons.push(e.weaponId);
        }
      }
    }
    this.missedWeapons = this.missedWeapons.filter(
      (id) => !g.player.weapons.includes(id),
    );

    this.level++;
    g.achievementStats.totalCampaignLevels++;
    // Counted across the campaign, not within the act.
    g.achievementStats.campaignLevelsCleared = Math.max(
      g.achievementStats.campaignLevelsCleared || 0,
      levelsBefore(this.act) + this.level,
    );
    g.saveAchievements();

    if (!getActLevel(this.act, this.level)) {
      this.loadLevel(this.level); // triggers VICTORY via bounds check
      return;
    }

    // Difficulty-based healing between levels
    const diffHeal = { easy: 999, normal: 30, hard: 10, nightmare: 0 };
    const healAmt = diffHeal[g.settings.difficulty] ?? 30;
    if (healAmt >= 999) {
      g.player.health = g.player.maxHealth;
    } else {
      g.player.health = Math.min(g.player.health + healAmt, g.player.maxHealth);
    }
    g.player.addAmmoPacks?.(1);

    // The level's briefing, then the level.
    const entry = getActLevel(this.act, this.level);
    this._prewarmLevel(this.act, this.level);
    this._playScenes(entry.briefing ?? [], () => {
      this.loadLevel(this.level);
      this.save();
    });
  }

  handleBossKill() {
    const g = this.game;
    g.achievementStats.bossKilled = true;
    g.achievementStats.campaignActsCleared = Math.max(g.achievementStats.campaignActsCleared || 0, this.act);
    g.saveAchievements();
    g.checkAchievements();
    trackEvent("boss_kill", {
      mode: "campaign",
      form: this.act,
      time_seconds: Math.floor((performance.now() - g.roundStartTime) / 1000),
    });

    // An act this build does not know ends the campaign, as it always has.
    const act = getAct(this.act) ?? ACTS[ACTS.length - 1];
    if (!isLastAct(act.id)) {
      // The act's outro, then the next act opens at level 0 behind its intro.
      const next = ACTS[ACTS.indexOf(act) + 1];
      g.audio.stopMusic();
      this._playScenes(act.outro, () => {
        this.act = next.id;
        this.level = 0;
        g.player.health = g.player.maxHealth;
        g.player.addAmmoPacks?.(2);
        this._prewarmLevel(next.id, 0);
        this._playScenes(next.intro, () => {
          this.loadLevel(0);
          this.save();
        });
      });
    } else {
      // Last act — game complete
      g.achievementStats.campaignComplete = true;
      g.checkAchievements();
      g.audio.stopMusic();
      Save.updateNgPlusBest(this.ngPlusCycle);

      // The true ending: any NG+ cycle finished with every memory recovered.
      this.trueEnding = earnsTrueEnding(this.ngPlusCycle, g.archive?.fragmentProgress?.().found ?? 0);
      if (this.trueEnding) {
        this._playScenes([...act.outro, ...NG_PLUS.trueEnding], () => {
          g.state = GameState.VICTORY;
          g.audio.roundComplete();
          this.clearSave();
          g.unlockPointer();
        });
      } else {
        this._playScenes(act.outro, () => {
          g.state = GameState.VICTORY;
          this.ngPlusPrompt = true;
          this.ngPlusPromptSel = 0;
          g.audio.roundComplete();
          g.unlockPointer();
        });
      }
    }
  }

  startNgPlus() {
    const g = this.game;
    this.ngPlusCycle++;
    this.ngPlusPrompt = false;
    this.trueEnding = false;
    this.act = NG_PLUS.startAct;
    this.level = NG_PLUS.startLevel;
    this.missedWeapons = [];
    g.player.health = g.player.maxHealth;
    g.player.shield = g.player.maxShield || 0;
    g.player.addAmmoPacks?.(4);
    g.player.alive = true;

    const cutsceneKey = `ng_plus_cycle_${this.ngPlusCycle}`;
    const hasCycleCutscene = g.hasCutsceneScript(cutsceneKey);
    const afterCutscene = () => {
      this.loadLevel(this.level);
      this.save();
      g.lockPointer();
    };
    g.audio.stopMusic();
    if (hasCycleCutscene) {
      g.startCutscene(cutsceneKey, afterCutscene);
    } else {
      g.startCutscene("ng_plus_intro", afterCutscene);
    }
  }

  // ── internal ──

  /**
   * Play scenes in order, skipping any this build has no script for. In NG+
   * a scene with a déjà-vu echo (NG_PLUS.scenes) plays the echo instead.
   */
  _playScenes(keys, done) {
    const g = this.game;
    const next = (i) => {
      if (i >= keys.length) return done();
      const key = sceneFor(keys[i], this.ngPlusCycle || 0);
      if (!g.hasCutsceneScript(key)) return next(i + 1);
      g.startCutscene(key, () => next(i + 1));
    };
    next(0);
  }

  /**
   * Rasterise every pose of this level's enemy types now, a couple of layers
   * a frame, while the player is still getting their bearings. Left to first
   * sight, a new type's SVG layers were drawn mid-fight: 60-110 ms stalls on
   * a fast laptop, the first time each type was seen or shot.
   */
  _warmRoster() {
    const g = this.game;
    const ctx = g.renderer?.ctx;
    const viewH = g.renderer?.height;
    if (!ctx || !viewH || getArtStyle() === ART_LEGACY || typeof requestAnimationFrame !== "function") return;
    const types = [...new Set(g.entities.filter((e) => e.type === "enemy").map((e) => e.enemyType))];
    // Half-heights for a close encounter and mid-room range; nearer and
    // farther sizes are GPU rescales of these (raster.js deriveSmaller).
    const halfHeights = [viewH / 2.4, viewH / 5];
    const map = g.map;
    const until = performance.now() + 8000;
    let i = 0;
    const step = () => {
      if (g.map !== map || i >= types.length || performance.now() > until) return;
      if (prefetchEnemyModel(ctx, types[i], halfHeights, undefined, 2)) i++;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  _applyActEnemyRoster(entry = getActLevel(this.act, this.level)) {
    applyActEnemyRoster(
      this.game.entities,
      this.act,
      this.game.getDifficultyMultipliers(),
      entry?.holdBack,
      this.ngPlusCycle,
    );
  }

  showPrompt() {
    this.game.state = GameState.CAMPAIGN_PROMPT;
    this.promptSelection = 0;
  }

  executePromptChoice(choice) {
    // The customizer already ran at the start of this campaign (main.js
    // playCreatorThen), so the prompt goes straight to the chosen start.
    if (choice === 0) this.game.startTutorial();
    else this.start();
  }
}
