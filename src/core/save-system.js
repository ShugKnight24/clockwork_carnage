// Persistence layer — localStorage save/load for all game data.
// Extracted from game.js — Strangler Fig Phase 3.1
// All functions are pure I/O: they read/write localStorage and return data.
// Game-level side effects (startArenaRound, loadCampaignLevel, etc.) stay in Game.

import {
  CHARACTER_COLORS, SKIN_TONES, HAIR_STYLES, EYE_COLORS,
  ARMOR_STYLES, HELMET_STYLES, VISOR_STYLES, SHOULDER_STYLES,
  BADGES, WEAPON_SKINS, LOADOUT_CLASSES, BACKSTORIES, VOICE_PROFILES,
  DEFAULT_CHARACTER,
  ACHIEVEMENTS,
} from "../data/index.js";
import { SETTINGS_REGISTRY } from "../../js/settings-registry.js";
import { normalizeBadge, normalizeAccessories, migrateLegacyBadge } from "./character-normalize.js";

const SAVE_VERSION = 1;

function clampSetting(key, val) {
  const def = SETTINGS_REGISTRY.find((s) => s.key === key);
  if (!def) return val;
  if ((def.type === "slider" || def.type === "enum") && typeof val === "number") {
    let next = Math.max(def.min, Math.min(def.max, val));
    if (def.type === "slider" && def.step) next = Math.round(next / def.step) * def.step;
    if (def.type === "enum") next = Math.round(next);
    if (def.round != null) next = Math.round(next * 10 ** def.round) / 10 ** def.round;
    return Math.max(def.min, Math.min(def.max, next));
  }
  return val;
}

// ── Settings ─────────────────────────────────────────────

export function saveSettings(settings) {
  try { localStorage.setItem("cc_settings", JSON.stringify(settings)); }
  catch (_) {}
}

export function loadSettings(defaults) {
  try {
    const raw = localStorage.getItem("cc_settings");
    if (!raw) return;
    const saved = JSON.parse(raw);
    for (const key of Object.keys(defaults)) {
      if (Object.prototype.hasOwnProperty.call(saved, key)) {
        const val = saved[key];
        if (typeof val !== typeof defaults[key]) continue;
        defaults[key] = clampSetting(key, val);
      }
    }
  } catch (_) {}
}

export function applyMobileMigration(isTouchDevice, settings, saveFn) {
  if (!isTouchDevice) return;
  try {
    if (!localStorage.getItem("cc_mobile_v2")) {
      const hasExisting = localStorage.getItem("cc_settings") !== null;
      const usesOldDefaults =
        (settings.fov === 90 && settings.hudScale === 75) ||
        (settings.fov === 70 && settings.hudScale === 100);
      if (!hasExisting || usesOldDefaults) {
        settings.fov = 100;
        settings.hudScale = 75;
        saveFn();
      }
      localStorage.setItem("cc_mobile_v2", "1");
      localStorage.setItem("cc_mobile_v1", "1");
    }
    if (!localStorage.getItem("cc_mobile_v3")) {
      if (settings.touchSensitivity === 1.5) {
        settings.touchSensitivity = 2.0;
        saveFn();
      }
      localStorage.setItem("cc_mobile_v3", "1");
    }
  } catch (_) {}
}

// ── Dev Flags ────────────────────────────────────────────

export function loadDevFlags() {
  try {
    return localStorage.getItem("cc_dev_always_tutorial") === "1";
  } catch (_) {
    return false;
  }
}

export function setAlwaysTutorial(on) {
  try {
    if (on) localStorage.setItem("cc_dev_always_tutorial", "1");
    else localStorage.removeItem("cc_dev_always_tutorial");
  } catch (_) {}
}

// ── Character ────────────────────────────────────────────

export function saveCharacter(character) {
  try { localStorage.setItem("cc_character", JSON.stringify(character)); }
  catch (_) {}
}

export function loadCharacter(character) {
  try {
    const raw = localStorage.getItem("cc_character");
    if (!raw) return;
    const saved = JSON.parse(raw);
    const maxIndices = {
      colorIndex: CHARACTER_COLORS.length - 1,
      skinToneIndex: SKIN_TONES.length - 1,
      hairIndex: HAIR_STYLES.length - 1,
      eyeIndex: EYE_COLORS.length - 1,
      armorIndex: ARMOR_STYLES.length - 1,
      helmetIndex: HELMET_STYLES.length - 1,
      visorIndex: VISOR_STYLES.length - 1,
      shoulderIndex: SHOULDER_STYLES.length - 1,
      badgeIndex: BADGES.length - 1,
      weaponSkinIndex: WEAPON_SKINS.length - 1,
      loadoutIndex: LOADOUT_CLASSES.length - 1,
      backstoryIndex: BACKSTORIES.length - 1,
      voiceIndex: VOICE_PROFILES.length - 1,
      armorVariant: 1,
    };
    const OBJECT_FIELDS = new Set(["badge", "accessories"]);
    for (const key of Object.keys(DEFAULT_CHARACTER)) {
      if (OBJECT_FIELDS.has(key)) continue;
      if (Object.prototype.hasOwnProperty.call(saved, key)) {
        let val = saved[key];
        if (typeof val !== typeof DEFAULT_CHARACTER[key]) continue;
        if (key in maxIndices) val = Math.max(0, Math.min(val, maxIndices[key]));
        character[key] = val;
      }
    }
    character.badge = saved.badge
      ? normalizeBadge(saved.badge)
      : migrateLegacyBadge(Number(saved.badgeIndex) || 0, Number(saved.shoulderIndex) || 0);
    character.accessories = normalizeAccessories(saved.accessories);
  } catch (_) {}
}

// ── Archive (bestiary + memory fragments) ────────────────

const ARCHIVE_KEY = "cc_archive";

/**
 * @param {Record<string, boolean>} seenEnemies - enemy type ids encountered
 * @param {Record<string, boolean>} fragments   - memory fragment ids collected
 */
export function saveArchive(seenEnemies, fragments) {
  try {
    localStorage.setItem(
      ARCHIVE_KEY,
      JSON.stringify({ seenEnemies, fragments }),
    );
  } catch (_) {}
}

/** Merges stored archive state into the supplied objects, in place. */
export function loadArchive(seenEnemies, fragments) {
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.seenEnemies && typeof data.seenEnemies === "object") {
      for (const key of Object.keys(data.seenEnemies)) {
        if (data.seenEnemies[key] === true) seenEnemies[key] = true;
      }
    }
    if (data.fragments && typeof data.fragments === "object") {
      for (const key of Object.keys(data.fragments)) {
        if (data.fragments[key] === true) fragments[key] = true;
      }
    }
  } catch (_) {}
}

// ── Achievements ─────────────────────────────────────────

export function saveAchievements(unlocked, stats) {
  try {
    localStorage.setItem("cc_achievements", JSON.stringify({ unlocked, stats }));
  } catch (_) {}
}

export function loadAchievements(unlocked, stats) {
  try {
    const raw = localStorage.getItem("cc_achievements");
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.unlocked && typeof data.unlocked === "object") {
      for (const key of Object.keys(data.unlocked)) {
        if (Object.prototype.hasOwnProperty.call(ACHIEVEMENTS, key)) {
          unlocked[key] = true;
        }
      }
    }
    if (data.stats && typeof data.stats === "object") {
      for (const key of Object.keys(stats)) {
        if (Object.prototype.hasOwnProperty.call(data.stats, key)) {
          const val = data.stats[key];
          if (typeof val === typeof stats[key]) stats[key] = val;
        }
      }
    }
  } catch (_) {}
}

// ── Arena Save ───────────────────────────────────────────

export function saveArena(round, player, upgradeLevels, difficulty) {
  try {
    const data = {
      version: SAVE_VERSION,
      round,
      ...player.serialize(),
      upgradeLevels,
      difficulty,
    };
    localStorage.setItem("cc_arena_save", JSON.stringify(data));
  } catch (_) {}
}

/** Returns parsed save data or null. Game applies state changes. */
export function loadArenaData() {
  try {
    const raw = localStorage.getItem("cc_arena_save");
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.version !== SAVE_VERSION) {
      clearArenaSave();
      return null;
    }
    return data;
  } catch (_) {
    return null;
  }
}

export function clearArenaSave() {
  try { localStorage.removeItem("cc_arena_save"); }
  catch (_) {}
}

// ── Campaign Save ────────────────────────────────────────

export function saveCampaign(level, act, ngPlusCycle, player, difficulty, mapGrid, entities, killedEnemies) {
  try {
    const entityStates = entities.map(e => {
      if (e.type === "enemy") {
        return { type: "enemy", active: e.active, health: e.health, x: e.x, y: e.y, state: e.state };
      }
      return { type: e.type, active: e.active };
    });
    const data = {
      version: SAVE_VERSION,
      level,
      act: act || 1,
      ngPlusCycle: ngPlusCycle || 0,
      playerX: player.x,
      playerY: player.y,
      playerAngle: player.angle,
      aimOffsetX: player.aimOffsetX || 0,
      aimOffsetY: player.aimOffsetY || 0,
      ...player.serialize(),
      difficulty,
      mapGrid,
      entityStates,
      killedEnemies,
    };
    localStorage.setItem("cc_campaign_save", JSON.stringify(data));
  } catch (_) {}
}

/** Returns parsed save data or null. Game applies state changes. */
export function loadCampaignData() {
  try {
    const raw = localStorage.getItem("cc_campaign_save");
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.version !== SAVE_VERSION) {
      clearCampaignSave();
      return null;
    }
    return data;
  } catch (_) {
    return null;
  }
}

export function clearCampaignSave() {
  try { localStorage.removeItem("cc_campaign_save"); }
  catch (_) {}
}

// ── Queries ──────────────────────────────────────────────

export function hasSave() {
  return getSaveInfo().length > 0;
}

export function getSaveInfo() {
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
      info.push({ mode: "campaign", level: d.level + 1, score: d.score, ngPlusCycle: d.ngPlusCycle || 0 });
    }
  } catch (_) {}
  return info;
}

// ── Intro Memory Tracking ────────────────────────────────

export function hasSeenIntroMemory(key) {
  try { return localStorage.getItem(key) === "1"; }
  catch (_) { return false; }
}

export function markIntroMemorySeen(key) {
  try { localStorage.setItem(key, "1"); }
  catch (_) {}
}

// ── NG+ Best Cycle ───────────────────────────────────────

export function updateNgPlusBest(cycle) {
  try {
    const best = parseInt(localStorage.getItem("cc_ng_plus_best") || "0", 10);
    if (cycle > best) localStorage.setItem("cc_ng_plus_best", String(cycle));
  } catch (_) {}
}
