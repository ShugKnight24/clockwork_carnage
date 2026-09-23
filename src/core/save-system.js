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
  WEAPONS,
} from "../data/index.js";
import { PLAYER_AIM_LIMIT_X, PLAYER_AIM_LIMIT_Y } from "../constants.js";
import { SETTINGS_REGISTRY } from "../../js/settings-registry.js";
import { normalizeBadge, normalizeAccessories, migrateLegacyBadge } from "./character-normalize.js";

const SAVE_VERSION = 1;
/**
 * Campaign saves moved to v2 with the four-act campaign (29 slots instead of
 * three passes over nine maps). Arena saves did not change and stay v1.
 */
export const CAMPAIGN_SAVE_VERSION = 2;

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

/**
 * Every key is written back on boot, so a changed default never reaches a
 * player who has launched the game before. Move values still sitting on the
 * old default; anything the player chose stays.
 */
export function applyDefaultsMigration(isTouchDevice, settings, saveFn) {
  try {
    if (localStorage.getItem("cc_defaults_v1")) return;
    let changed = false;
    if (settings.sensitivity === 1.0) { settings.sensitivity = 0.7; changed = true; }
    if (!isTouchDevice && settings.hudStyle === 4) { settings.hudStyle = 1; changed = true; }
    if (changed) saveFn();
    localStorage.setItem("cc_defaults_v1", "1");
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

/**
 * Make a campaign save safe to apply to `level` (the level's current data).
 *
 * Saves outlive the maps they were made on. A grid of another size crashed
 * every frame; a position that is now inside a wall, or a NaN that JSON wrote
 * as null, left the player staring at walls unable to move. Anything that no
 * longer fits is dropped, so the caller falls back to the level's own start
 * for that part and keeps the rest (weapons, score, upgrades).
 */
export function sanitizeCampaignSave(data, level) {
  const out = { ...data };
  const fin = Number.isFinite;
  const { width: W, height: H } = level;
  const gridOk =
    Array.isArray(data.mapGrid) && data.mapGrid.length === H &&
    data.mapGrid.every((row) => Array.isArray(row) && row.length === W && row.every(fin));
  if (!gridOk) {
    delete out.mapGrid;
    delete out.entityStates;
    delete out.killedEnemies;
  }
  const grid = gridOk ? data.mapGrid : level.grid;
  const open = (x, y) =>
    fin(x) && fin(y) && x >= 0 && y >= 0 && x < W && y < H && grid[Math.floor(y)][Math.floor(x)] === 0;

  if (!open(data.playerX, data.playerY) || !fin(data.playerAngle)) {
    delete out.playerX;
    delete out.playerY;
    delete out.playerAngle;
  }
  const clampAim = (v, lim) => (fin(v) ? Math.max(-lim, Math.min(lim, v)) : 0);
  out.aimOffsetX = clampAim(data.aimOffsetX, PLAYER_AIM_LIMIT_X);
  out.aimOffsetY = clampAim(data.aimOffsetY, PLAYER_AIM_LIMIT_Y);

  // Player stats: a non-number means "keep the fresh player's value".
  for (const [k, v] of Object.entries(out)) {
    if (k === "aimOffsetX" || k === "aimOffsetY") continue;
    if (typeof v === "number" && !fin(v)) delete out[k];
    if (v === null && k !== "mapGrid") delete out[k];
  }
  if (!(out.health > 0)) delete out.health;

  if (Array.isArray(data.weapons)) {
    const ids = [...new Set(data.weapons.filter((w) => Number.isInteger(w) && w >= 0 && w < WEAPONS.length))];
    if (ids.length) {
      // currentWeapon indexes the weapons array; keep the same gun selected.
      const held = data.weapons[data.currentWeapon];
      out.weapons = ids;
      out.currentWeapon = Math.max(0, ids.indexOf(held));
    } else {
      delete out.weapons;
      delete out.currentWeapon;
    }
  }

  if (Array.isArray(out.entityStates)) {
    out.entityStates = out.entityStates.map((e) => {
      if (e?.type !== "enemy" || open(e.x, e.y)) return e;
      const { x: _x, y: _y, ...rest } = e;
      return rest;
    });
  }
  return out;
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

/**
 * Bring a campaign save up to CAMPAIGN_SAVE_VERSION, or null if it cannot be.
 *
 * v1 saves were made when every act replayed the same nine maps. The story
 * restructure (spec §15 "Save migration", decision 12) restarts the act a
 * save was in, where the act changed:
 *   - Act I levels 0-6 are the same maps with the same seeds, so they keep
 *     everything, down to where the player stood.
 *   - Act I levels 7-8 (the Nexus, which left Act I, and the Core) land on
 *     the Core, now Act I's level 7.
 *   - Act 2 restarts at the Gathering's first level: there is no honest
 *     mid-point in a different story. Act 3 restarts at Act IV.
 * Anything restarted loses its mid-level state (grid, enemies, position) and
 * is flagged `migrated` so the game can say why, once. The NG+ cycle, player
 * stats, weapons and difficulty carry over.
 * @param {object} data
 * @returns {object|null}
 */
export function migrateCampaignSave(data) {
  if (!data || typeof data !== "object") return null;
  if (data.version === CAMPAIGN_SAVE_VERSION) return data;
  if (data.version !== 1) return null;
  const act = data.act || 1;
  const level = data.level | 0;
  if (act === 1 && level >= 0 && level <= 6) return { ...data, version: CAMPAIGN_SAVE_VERSION };
  const to = { 1: { act: 1, level: 7 }, 2: { act: 2, level: 0 }, 3: { act: 4, level: 0 } }[act];
  if (!to) return null;
  const {
    mapGrid: _grid,
    entityStates: _entities,
    killedEnemies: _killed,
    playerX: _x,
    playerY: _y,
    playerAngle: _angle,
    ...kept
  } = data;
  return { ...kept, version: CAMPAIGN_SAVE_VERSION, act: to.act, level: to.level, migrated: true };
}

export function saveCampaign(level, act, ngPlusCycle, player, difficulty, mapGrid, entities, killedEnemies) {
  try {
    const entityStates = entities.map(e => {
      if (e.type === "enemy") {
        return { type: "enemy", active: e.active, health: e.health, x: e.x, y: e.y, state: e.state };
      }
      return { type: e.type, active: e.active };
    });
    const data = {
      version: CAMPAIGN_SAVE_VERSION,
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

/**
 * Returns parsed save data, migrated to the current version, or null. Game
 * applies state changes. A save no migration can read is cleared.
 */
export function loadCampaignData() {
  try {
    const raw = localStorage.getItem("cc_campaign_save");
    if (!raw) return null;
    const data = migrateCampaignSave(JSON.parse(raw));
    if (!data) {
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
    // Report where a Continue will actually land, after any migration.
    const d = campaign ? migrateCampaignSave(JSON.parse(campaign)) : null;
    if (d) {
      info.push({ mode: "campaign", act: d.act || 1, level: d.level + 1, score: d.score, ngPlusCycle: d.ngPlusCycle || 0 });
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
