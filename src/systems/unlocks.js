/**
 * Cosmetic and loadout unlocks, earned through existing progression.
 *
 * Rules live on the data (LOADOUT_CLASSES[].unlock, TIER_UNLOCKS in
 * src/data/cosmetics.js). Evaluation is pure: build a context from the saved
 * stats once (`unlockContext`), then ask about any item. Both creators (the
 * Modern showroom and the Legacy canvas creator) and the unlock toast read it.
 *
 * Persistence (`cc_unlocks`): `owned` grandfathers gear a player had already
 * equipped before unlocks existed, and `seen` records which unlocks have been
 * announced so the celebration toast fires once.
 */

import {
  ARMOR_STYLES,
  HELMET_STYLES,
  VISOR_STYLES,
  SHOULDER_STYLES,
  LOADOUT_CLASSES,
  TIER_UNLOCKS,
} from "../data/cosmetics.js";

const STORE_KEY = "cc_unlocks";

/** Character fields whose options can be locked, with their tables. */
export const LOCKABLE = {
  armorIndex: { table: ARMOR_STYLES, kind: "Armor" },
  helmetIndex: { table: HELMET_STYLES, kind: "Helmet" },
  visorIndex: { table: VISOR_STYLES, kind: "Visor" },
  shoulderIndex: { table: SHOULDER_STYLES, kind: "Shoulders" },
  loadoutIndex: { table: LOADOUT_CLASSES, kind: "Loadout class" },
};

/** Rule attached to an item, or null when it is always available. */
export function ruleFor(key, index) {
  const item = LOCKABLE[key]?.table[index];
  if (!item) return null;
  if (item.unlock) return item.unlock;
  if (item.tier && TIER_UNLOCKS[item.tier]) return TIER_UNLOCKS[item.tier];
  return null;
}

/**
 * Snapshot of everything rules can look at.
 * @param {{ stats?: object, achievements?: object, campaignSaveLevel?: number, owned?: object }} src
 */
export function unlockContext({ stats = {}, achievements = {}, campaignSaveLevel = 0, owned = {} } = {}) {
  // Levels cleared in order: the tracked high-water mark, the level an
  // in-progress save sits on, or all of them once the campaign is beaten.
  const cleared = Math.max(
    Number(stats.campaignLevelsCleared) || 0,
    Number(campaignSaveLevel) || 0,
    stats.campaignComplete ? 9 : 0,
  );
  return {
    tutorialComplete: !!stats.tutorialComplete,
    campaignLevelsCleared: cleared,
    highestArenaRound: Number(stats.highestArenaRound) || 0,
    totalDashes: Number(stats.totalDashes) || 0,
    weaponKills: stats.weaponKills && typeof stats.weaponKills === "object" ? stats.weaponKills : {},
    achievements: achievements || {},
    owned: owned || {},
  };
}

/** @returns {{ met: boolean, value: number, target: number }} */
export function evaluateRule(rule, ctx) {
  if (!rule) return { met: true, value: 1, target: 1 };
  const count = (value, target) => ({ met: value >= target, value: Math.min(value, target), target });
  switch (rule.type) {
    case "tutorial":
      return count(ctx.tutorialComplete ? 1 : 0, 1);
    case "campaignLevels":
      return count(ctx.campaignLevelsCleared, rule.count);
    case "arenaRound":
      return count(ctx.highestArenaRound, rule.count);
    case "dashes":
      return count(ctx.totalDashes, rule.count);
    case "weaponKills": {
      const kills = (rule.weapons || []).reduce((n, w) => n + (Number(ctx.weaponKills[w]) || 0), 0);
      return count(kills, rule.count);
    }
    case "achievement":
      return count(ctx.achievements[rule.id] ? 1 : 0, 1);
    case "anyOf": {
      // Met if any branch is; otherwise report the branch closest to done.
      let best = null;
      for (const r of rule.rules || []) {
        const e = evaluateRule(r, ctx);
        if (e.met) return { ...e, met: true, branch: r };
        if (!best || e.value / e.target > best.value / best.target) best = { ...e, branch: r };
      }
      return best || { met: false, value: 0, target: 1 };
    }
    default:
      return { met: false, value: 0, target: 1 };
  }
}

/** "Clear Act 1 of the campaign · 2/3 levels" (count rules) or just the label. */
export function progressText(rule, evaluation) {
  if (!rule) return "";
  const shown = evaluation.branch || rule;
  if (evaluation.target <= 1 || !shown.unit) return rule.label;
  return `${rule.label} · ${evaluation.value}/${evaluation.target} ${shown.unit}`;
}

/**
 * Full state for one option.
 * @returns {{ unlocked: boolean, rule: object|null, value: number, target: number, pct: number, hint: string }}
 */
export function unlockState(key, index, ctx) {
  const rule = ruleFor(key, index);
  if (!rule) return { unlocked: true, rule: null, value: 1, target: 1, pct: 1, hint: "" };
  const e = evaluateRule(rule, ctx);
  const owned = !!ctx.owned?.[`${key}:${index}`];
  return {
    unlocked: e.met || owned,
    rule,
    value: e.value,
    target: e.target,
    pct: e.target ? e.value / e.target : 0,
    hint: progressText(rule, e),
  };
}

export const isUnlocked = (key, index, ctx) => unlockState(key, index, ctx).unlocked;

/** Every lockable option that is currently unlocked by its rule, as "key:index" ids. */
export function earnedIds(ctx) {
  const out = [];
  for (const [key, { table }] of Object.entries(LOCKABLE)) {
    table.forEach((_, i) => {
      const rule = ruleFor(key, i);
      if (rule && evaluateRule(rule, ctx).met) out.push(`${key}:${i}`);
    });
  }
  return out;
}

/** Ids earned now that are not yet in `seen` — what the toast should announce. */
export function newlyEarned(ctx, seen) {
  return earnedIds(ctx).filter((id) => !seen[id]);
}

/** Display name for an id, e.g. "Loadout class · Enforcer". */
export function describeId(id) {
  const [key, idx] = id.split(":");
  const entry = LOCKABLE[key];
  const item = entry?.table[Number(idx)];
  return item ? { kind: entry.kind, name: item.name, tier: item.tier || 0 } : { kind: "", name: id, tier: 0 };
}

// ── Persistence ────────────────────────────────────────────

export function loadUnlockStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return { owned: data.owned || {}, seen: data.seen || {} };
  } catch (_) {
    return null;
  }
}

export function saveUnlockStore(store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ owned: store.owned, seen: store.seen }));
  } catch (_) {}
}

function readCampaignSaveLevel() {
  try {
    const raw = localStorage.getItem("cc_campaign_save");
    return raw ? Number(JSON.parse(raw).level) || 0 : 0;
  } catch (_) {
    return 0;
  }
}

/**
 * First run: grandfather gear already equipped in the saved character and
 * mark current unlocks as seen, so nobody loses their look or gets a toast
 * storm for old progress.
 */
export function ensureUnlockStore(character, stats, achievements) {
  let store = loadUnlockStore();
  if (store) return store;
  store = { owned: {}, seen: {} };
  const ctx = unlockContext({ stats, achievements, campaignSaveLevel: readCampaignSaveLevel() });
  let hasSavedCharacter = false;
  try {
    hasSavedCharacter = !!localStorage.getItem("cc_character");
  } catch (_) {}
  if (hasSavedCharacter && character) {
    for (const key of Object.keys(LOCKABLE)) {
      const i = character[key];
      if (ruleFor(key, i) && !evaluateRule(ruleFor(key, i), ctx).met) store.owned[`${key}:${i}`] = true;
    }
  }
  for (const id of earnedIds(ctx)) store.seen[id] = true;
  saveUnlockStore(store);
  return store;
}

let _ctxCache = null;
let _ctxAt = -Infinity;

/**
 * Context for a live Game instance (stats, achievements, campaign save, owned
 * gear). Cached for a quarter second: the Legacy creator asks every frame and
 * the campaign save is a large JSON blob.
 */
export function gameUnlockContext(game, { fresh = false } = {}) {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (!fresh && _ctxCache && now - _ctxAt < 250) return _ctxCache;
  const stats = game?.achievementStats || {};
  const achievements = game?.unlockedAchievements || {};
  const store = ensureUnlockStore(game?.character, stats, achievements);
  _ctxCache = unlockContext({ stats, achievements, campaignSaveLevel: readCampaignSaveLevel(), owned: store.owned });
  _ctxAt = now;
  return _ctxCache;
}
