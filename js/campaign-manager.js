/**
 * CampaignManager — owns all campaign state and progression logic.
 * Extracted from game.js via strangler fig pattern.
 *
 * Receives a `game` reference for accessing shared state
 * (player, entities, audio, renderer, etc).
 */
import * as Save from "../src/core/save-system.js";
import { campaignLevelMap, getAct } from "./data.js";
import {
  createCampaignEntities,
  createMissedWeaponPickups,
  applyActEnemyRoster,
} from "../src/systems/spawner.js";
import { isBossEnemy } from "../src/systems/combat.js";
import { trackEvent } from "./analytics.js";
import { GameState } from "../src/types.js";

export class CampaignManager {
  constructor(game) {
    this.game = game;
    this.level = 0;
    this.act = 1;
    this.missedWeapons = [];
    this.ngPlusCycle = 0;
    this.ngPlusPrompt = false;
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
      return true;
    } catch (err) {
      // A save this build cannot apply: restart its level rather than leave
      // the player in a half-loaded one.
      console.warn("[Campaign] save could not be applied; restarting level", err);
      g.player.reset();
      this.loadLevel(index);
      return true;
    }
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
      const afterFlipbook = () => {
        if (!fromTutorial && g.hasCutsceneScript("clocking_in")) {
          g.startCutscene("clocking_in", () => {
            g.ariaEnabled = true;
            g.queueAriaMessage("campaignStart");
            g.startCutscene("intro", () => {
              playMemory();
            });
          });
        } else {
          g.startCutscene("intro", () => {
            playMemory();
          });
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

  loadLevel(index) {
    const g = this.game;
    this._clearLevelTimers();
    const level = campaignLevelMap(this.act, index);
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

    g.killedEnemies = 0;
    g.totalEnemies = g.entities.filter((e) => e.type === "enemy").length;
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
      });
    }

    this._applyActEnemyRoster();

    const hasBoss = g.entities.some(
      (e) =>
        e.type === "enemy" &&
        (e.enemyType === "boss" ||
          e.enemyType === "boss_form2" ||
          e.enemyType === "boss_form3"),
    );
    if (hasBoss) {
      const form = this.act;
      if (form === 2) g.queueAriaMessage("bossForm2");
      else if (form === 3) g.queueAriaMessage("bossForm3");
      else g.queueAriaMessage("bossEncounter");
      // Sprint E 4.10: Squad ensemble chatter per boss phase
      if (g.squadComms && typeof g.squadComms.onBossPhase === "function") {
        this._afterLevelStart(2000, () => g.squadComms.onBossPhase(form));
      }
      // Boss intro flourish — 2.5s slow-mo + glitch spike + name card.
      // Drives drama on first encounter without depending on a cutscene
      // pipeline. HUD reads bossNameCard to render the overlay.
      g.slowMoTimer = 2.5;
      g.timeScale = 0.4;
      g.glitchEffect = Math.max(g.glitchEffect, 0.8);
      const BOSS_NAMES = {
        1: { title: "PARADOX LORD", subtitle: "FIRST INCURSION" },
        2: { title: "PARADOX LORD", subtitle: "SECOND INCURSION" },
        3: { title: "PARADOX LORD", subtitle: "FINAL INCURSION" },
      };
      g.bossNameCard = {
        ...(BOSS_NAMES[form] || BOSS_NAMES[1]),
        time: g.time,
        duration: 3500,
      };
    } else if (g.squadComms && this.act >= 2) {
      // Squad chimes in at non-boss level starts (act 2+ only)
      this._afterLevelStart(1500, () => g.squadComms.onCombatStart());
    }

    // Sprint E 4.3/4.4: one-shot Act 3 lore reveals
    if (this.act === 3) {
      if (this.level === 0 && g.queueAriaMessage) {
        this._afterLevelStart(3000, () => g.queueAriaMessage("encryptedChannelReveal"));
      } else if (this.level === 1 && g.queueAriaMessage) {
        this._afterLevelStart(3000, () => g.queueAriaMessage("analystLMReveal"));
      }
    }
    // Sprint E 4.6: NG+ Dead Squad foreshadowing (cycles 1+)
    if (this.ngPlusCycle >= 1 && this.level === 0 && g.queueAriaMessage) {
      this._afterLevelStart(5000, () => g.queueAriaMessage("ngPlusDeadSquad"));
    }

    g.state = GameState.PLAYING;
    g.roundStartTime = performance.now();
    g.renderer.applyActPalette(this.act, this.level);
    if (hasBoss) {
      g.audio.startTrack("boss");
    } else {
      g.audio.startTrack("campaign", 130);
    }
    g.audio.startAmbient("industrial");
    this.save();
    g.lockPointer();
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
    g.achievementStats.campaignLevelsCleared = Math.max(g.achievementStats.campaignLevelsCleared || 0, this.level);
    g.saveAchievements();

    if (this.level >= (getAct(this.act)?.levels.length ?? 0)) {
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
    g.player.ammo = Math.min(g.player.ammo + 20, 999);

    // Act-based briefing cutscenes
    const actBriefings = {
      1: {
        1: "security_briefing",
        2: "research_briefing",
        3: "containment_briefing",
        4: "server_briefing",
        5: "reactor_briefing",
        6: "voss_lab_briefing",
        7: "nexus_briefing",
        8: "paradox_core_briefing",
      },
      2: {
        1: "act2_level2",
        2: "act2_level3",
        3: "act2_level4",
        4: "act2_level5",
        5: "act2_level6",
        6: "voss_confrontation",
        7: "act2_level8",
        8: "act2_level9",
      },
      3: {
        1: "act3_level2",
        2: "act3_boss",
        3: "act3_level4",
        4: "act3_level5",
        5: "act3_level6",
        6: "origin_panels",
        7: "act3_level8",
        8: "act3_level9",
      },
    };
    const briefingKey = actBriefings[this.act]?.[this.level];
    if (briefingKey && g.hasCutsceneScript(briefingKey)) {
      g.startCutscene(briefingKey, () => {
        this.loadLevel(this.level);
        this.save();
      });
    } else {
      this.loadLevel(this.level);
      this.save();
    }
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

    if (this.act === 1) {
      g.audio.stopMusic();
      g.startCutscene("false_victory", () => {
        this.act = 2;
        this.level = 0;
        g.player.health = g.player.maxHealth;
        g.player.ammo = Math.min(g.player.ammo + 50, 999);
        const afterAct2Fb = () => {
          g.startCutscene("act2_intro", () => {
            this.loadLevel(0);
            this.save();
          });
        };
        if (g.hasCutsceneScript("act2_transition_fb")) {
          g.startCutscene("act2_transition_fb", afterAct2Fb);
        } else {
          afterAct2Fb();
        }
      });
    } else if (this.act === 2) {
      g.audio.stopMusic();
      g.startCutscene("act2_victory", () => {
        this.act = 3;
        this.level = 0;
        g.player.health = g.player.maxHealth;
        g.player.ammo = Math.min(g.player.ammo + 50, 999);
        const afterAct3Fb = () => {
          g.startCutscene("lyra_reveal", () => {
            g.startCutscene("act3_intro", () => {
              this.loadLevel(0);
              this.save();
            });
          });
        };
        if (g.hasCutsceneScript("act3_transition_fb")) {
          g.startCutscene("act3_transition_fb", afterAct3Fb);
        } else {
          afterAct3Fb();
        }
      });
    } else {
      // Act 3 — game complete
      g.achievementStats.campaignComplete = true;
      g.checkAchievements();
      g.audio.stopMusic();
      Save.updateNgPlusBest(this.ngPlusCycle);

      if (this.ngPlusCycle >= 3) {
        g.startCutscene("true_victory", () => {
          g.startCutscene("ng_plus_true_ending", () => {
            g.state = GameState.VICTORY;
            g.audio.roundComplete();
            this.clearSave();
            g.unlockPointer();
          });
        });
      } else {
        g.startCutscene("true_victory", () => {
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
    this.act = 1;
    this.level = 0;
    this.missedWeapons = [];
    g.player.health = g.player.maxHealth;
    g.player.shield = g.player.maxShield || 0;
    g.player.ammo = Math.min(g.player.ammo + 100, 999);
    g.player.alive = true;

    const cutsceneKey = `ng_plus_cycle_${this.ngPlusCycle}`;
    const hasCycleCutscene = g.hasCutsceneScript(cutsceneKey);
    const afterCutscene = () => {
      this.loadLevel(0);
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

  _applyActEnemyRoster() {
    applyActEnemyRoster(
      this.game.entities,
      this.act,
      this.game.getDifficultyMultipliers(),
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
