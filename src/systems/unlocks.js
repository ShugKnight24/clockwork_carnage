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
import { FIELD_TABLES, getIndex } from "../core/character-fields.js";
import { indexOfId } from "../data/badges.js";
import { ACCESSORY_SLOTS } from "../data/accessories.js";
import { levelsBefore, totalActs, totalLevels } from "../data/campaign/acts.js";

const STORE_KEY = "cc_unlocks";

/** Character fields whose options can be locked, with their tables. */
export const LOCKABLE = {
  armorIndex: { table: ARMOR_STYLES, kind: "Armor" },
  helmetIndex: { table: HELMET_STYLES, kind: "Helmet" },
  visorIndex: { table: VISOR_STYLES, kind: "Visor" },
  shoulderIndex: { table: SHOULDER_STYLES, kind: "Shoulders" },
  loadoutIndex: { table: LOADOUT_CLASSES, kind: "Loadout class" },
};

const VIRTUAL_KINDS = {
  "badge.preset": "Badge",
  "badge.symbol": "Badge symbol",
  "badge.frame": "Badge frame",
  "badge.enamel": "Enamel",
  "badge.metal": "Metal",
  "badge.finish": "Badge finish",
};
// Badge and accessory fields are nested (a layer stack, a per-slot id), not
// flat indices, so they carry their own table and are looked up by item id
// rather than array position — see ownedKey().
for (const [key, table] of Object.entries(FIELD_TABLES)) {
  LOCKABLE[key] = { table, kind: VIRTUAL_KINDS[key] || `${key.slice(4)[0].toUpperCase()}${key.slice(5)} gear`, byId: true };
}

/** Ownership id: index for the legacy flat tables, item id for id-based tables. */
export function ownedKey(key, index) {
  const entry = LOCKABLE[key];
  return entry?.byId ? `${key}:#${entry.table[index]?.id}` : `${key}:${index}`;
}

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
 * @param {{ stats?: object, achievements?: object, campaignSaveLevel?: number, campaignSaveAct?: number, owned?: object }} src
 */
export function unlockContext({ stats = {}, achievements = {}, campaignSaveLevel = 0, campaignSaveAct = 0, owned = {} } = {}) {
  // Levels cleared in order, counted across the whole campaign: the tracked
  // high-water mark, how far an in-progress save got, or all of them once
  // the campaign is beaten. Marks from before the four-act campaign counted
  // within one act; they are smaller, never wrong, so they still stand.
  const cleared = Math.max(
    Number(stats.campaignLevelsCleared) || 0,
    (Number(campaignSaveLevel) || 0) + (campaignSaveAct ? levelsBefore(Number(campaignSaveAct) || 1) : 0),
    stats.campaignComplete ? totalLevels() : 0,
  );
  return {
    tutorialComplete: !!stats.tutorialComplete,
    campaignLevelsCleared: cleared,
    // Highest act whose Paradox Lord has fallen. `campaignActsCleared` only
    // started being tracked with these unlocks, so a save made before that
    // reads 0 however far it got — backfill it from signals those saves do
    // carry: a finished campaign is every act; a run parked in act N has
    // cleared N-1; `bossKilled` means at least one Lord fell.
    campaignActsCleared: Math.max(
      Number(stats.campaignActsCleared) || 0,
      stats.campaignComplete ? totalActs() : 0,
      (Number(campaignSaveAct) || 1) - 1,
      stats.bossKilled ? 1 : 0,
    ),
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
    case "campaignActs":
      return count(ctx.campaignActsCleared, rule.count);
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
  const owned = !!ctx.owned?.[ownedKey(key, index)];
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

/** Every lockable option that is currently unlocked by its rule, as ownedKey() ids. */
export function earnedIds(ctx) {
  const out = [];
  for (const [key, { table }] of Object.entries(LOCKABLE)) {
    table.forEach((_, i) => {
      const rule = ruleFor(key, i);
      if (rule && evaluateRule(rule, ctx).met) out.push(ownedKey(key, i));
    });
  }
  // Armour variants live on ARMOR_STYLES[i].variant, not in a LOCKABLE table.
  for (const a of ARMOR_STYLES) {
    if (a.variant?.unlock && evaluateRule(a.variant.unlock, ctx).met) out.push(`armorVariant:#${a.variant.id}`);
  }
  return out;
}

/** Ids earned now that are not yet in `seen` — what the toast should announce. */
export function newlyEarned(ctx, seen) {
  return earnedIds(ctx).filter((id) => !seen[id]);
}

/** Display name for an id, e.g. "Loadout class · Enforcer" or "Badge symbol · Lord Slayer". */
export function describeId(id) {
  const [key, idx] = id.split(":");
  if (key === "armorVariant" && idx?.startsWith("#")) {
    const vid = idx.slice(1);
    const armor = ARMOR_STYLES.find((a) => a.variant?.id === vid);
    return armor ? { kind: "Armour variant", name: armor.variant.name, tier: 0 } : { kind: "", name: id, tier: 0 };
  }
  const entry = LOCKABLE[key];
  if (!entry) return { kind: "", name: id, tier: 0 };
  const item = idx?.startsWith("#") ? entry.table.find((x) => x.id === idx.slice(1)) : entry.table[Number(idx)];
  return item ? { kind: entry.kind, name: item.name, tier: item.tier || 0 } : { kind: "", name: id, tier: 0 };
}

// The four flat slots that share TIER_UNLOCKS: one tier opens items across all
// of them at once, so they are announced together rather than four times over.
const TIER_SLOTS = new Set(["armorIndex", "helmetIndex", "visorIndex", "shoulderIndex"]);

/**
 * The lines the unlock toast should show for a batch of freshly earned ids, in
 * order. Loadout classes, badges, finishes, accessories and armour variants
 * each get their own plate; the tier-gated armour slots collapse into one plate
 * per tier. Everything the toast marks as seen must come back out of here, or
 * that unlock is silently swallowed.
 * @param {string[]} ids ownedKey() ids, e.g. "badge.symbol:#lordslayer"
 * @returns {{ kind: string, name: string }[]}
 */
export function announcements(ids) {
  const out = [];
  const tiers = new Set();
  for (const id of ids) {
    const key = id.split(":")[0];
    const info = describeId(id);
    if (TIER_SLOTS.has(key) && info.tier) {
      if (tiers.has(info.tier)) continue;
      tiers.add(info.tier);
      out.push({ kind: "Gear tier", name: `MK ${"I".repeat(info.tier)} armor, helmets, visors & shoulders` });
      continue;
    }
    // An id whose table entry has gone (a renamed item in an old save) has no
    // kind and nothing worth showing.
    if (info.kind) out.push({ kind: info.kind, name: info.name });
  }
  return out;
}

// ── Persistence ────────────────────────────────────────────

/** The live store, shared by everything that reads or writes ownership. */
let _store = null;

export function loadUnlockStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return { owned: data.owned || {}, seen: data.seen || {}, v2: !!data.v2 };
  } catch (_) {
    return null;
  }
}

export function saveUnlockStore(store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ owned: store.owned, seen: store.seen, v2: !!store.v2 }));
  } catch (_) {}
}

/** How far an in-progress campaign save got: `{ level, act }`, 0/0 when there is none. */
function readCampaignSave() {
  try {
    const raw = localStorage.getItem("cc_campaign_save");
    if (!raw) return { level: 0, act: 0 };
    const data = JSON.parse(raw);
    return { level: Number(data.level) || 0, act: Number(data.act) || 0 };
  } catch (_) {
    return { level: 0, act: 0 };
  }
}

/**
 * First run: grandfather gear already equipped in the saved character and
 * mark current unlocks as seen, so nobody loses their look or gets a toast
 * storm for old progress.
 *
 * Stores saved before badges/accessories/variants were lockable (no `v2`
 * flag) would otherwise have every newly-lockable id fire the unlock toast
 * at once for progress the player already made — so on first touch after the
 * upgrade, mark everything currently earned as seen instead.
 */
export function ensureUnlockStore(character, stats, achievements) {
  // One shared object. The toast listener holds onto the store it was given at
  // init and writes it back on every progress event; if a drop mutated a
  // separate copy, that write would silently roll the drop back.
  if (_store) return _store;
  let store = loadUnlockStore();
  if (store) {
    if (!store.v2) {
      const save = readCampaignSave();
      const ctx = unlockContext({ stats, achievements, campaignSaveLevel: save.level, campaignSaveAct: save.act, owned: store.owned });
      for (const id of earnedIds(ctx)) store.seen[id] = true;
      store.v2 = true;
      saveUnlockStore(store);
    }
    return (_store = store);
  }
  store = { owned: {}, seen: {}, v2: true };
  const save = readCampaignSave();
  const ctx = unlockContext({ stats, achievements, campaignSaveLevel: save.level, campaignSaveAct: save.act });
  let hasSavedCharacter = false;
  try {
    hasSavedCharacter = !!localStorage.getItem("cc_character");
  } catch (_) {}
  if (hasSavedCharacter && character) {
    for (const key of Object.keys(LOCKABLE)) {
      const i = getIndex(character, key);
      if (ruleFor(key, i) && !evaluateRule(ruleFor(key, i), ctx).met) store.owned[ownedKey(key, i)] = true;
    }
  }
  for (const id of earnedIds(ctx)) store.seen[id] = true;
  saveUnlockStore(store);
  return (_store = store);
}

/** Forget the in-memory store. Tests and a storage reset need this. */
export function resetUnlockStore() {
  _store = null;
  invalidateUnlockContext();
}

let _ctxCache = null;
let _ctxAt = -Infinity;

/** Drop the memoised context so the next read sees a just-granted item. */
export function invalidateUnlockContext() {
  _ctxCache = null;
  _ctxAt = -Infinity;
}

/**
 * Grant an item outright, regardless of whether its rule is met — how a
 * battlefield drop is recorded. Returns false when it was already owned, so
 * callers can skip the pickup toast for a duplicate.
 */
export function grantOwned(key, index) {
  if (!LOCKABLE[key]?.table[index]) return false;
  const store = ensureUnlockStore();
  const id = ownedKey(key, index);
  if (store.owned[id]) return false;
  store.owned[id] = true;
  // A dropped item is never a surprise — the player watched it fall — so mark
  // it seen and let the pickup speak for itself instead of the unlock toast.
  store.seen[id] = true;
  saveUnlockStore(store);
  invalidateUnlockContext();
  return true;
}

/**
 * Items the player has not earned or been given yet, as {key, index} pairs.
 * Gear drops pick from here so a kill never hands over a duplicate.
 */
export function lockedItems(ctx) {
  const out = [];
  for (const key of Object.keys(LOCKABLE)) {
    const table = LOCKABLE[key].table;
    for (let i = 0; i < table.length; i++) {
      if (!ruleFor(key, i)) continue; // always-available items are not loot
      if (!unlockState(key, i, ctx).unlocked) out.push({ key, index: i });
    }
  }
  return out;
}

/**
 * Unlock state for an armour style's variant treatment. Variants live on
 * ARMOR_STYLES[i].variant rather than in a LOCKABLE table, so they get their
 * own reader instead of `unlockState`.
 * @returns {{ unlocked: boolean, rule: object|null, value: number, target: number, pct: number, hint: string }}
 */
export function variantState(armorIndex, ctx) {
  const v = ARMOR_STYLES[armorIndex]?.variant;
  if (!v) return { unlocked: false, rule: null, value: 0, target: 1, pct: 0, hint: "" };
  const e = evaluateRule(v.unlock, ctx);
  const owned = !!ctx.owned?.[`armorVariant:#${v.id}`];
  return {
    unlocked: e.met || owned,
    rule: v.unlock,
    value: e.value,
    target: e.target,
    pct: e.target ? e.value / e.target : 0,
    hint: progressText(v.unlock, e),
  };
}

/**
 * Changes that strip locked, unowned nested picks — a badge symbol or finish,
 * an accessory, an armour variant — from a saved character. Run on load so a
 * save from before a rule tightened (or from a cleared unlock store) never
 * keeps showing gear the player has not earned. Returns only the fields that
 * changed, for `Object.assign(character, sanitizeLocked(character, ctx))`.
 */
export function sanitizeLocked(ch, ctx) {
  const changes = {};
  const ok = (key, id) => unlockState(key, indexOfId(LOCKABLE[key].table, id), ctx).unlocked;
  const acc = { ...ch.accessories };
  let accChanged = false;
  for (const { id } of ACCESSORY_SLOTS) {
    if (acc[id] !== "none" && !ok(`acc.${id}`, acc[id])) {
      acc[id] = "none";
      accChanged = true;
    }
  }
  if (accChanged) changes.accessories = acc;
  const b = ch.badge;
  if (b) {
    const layers = b.layers.map((l) => (ok("badge.symbol", l.symbol) ? { ...l } : { ...l, symbol: "clock" }));
    const finish = ok("badge.finish", b.finish) ? b.finish : "auto";
    if (finish !== b.finish || layers.some((l, i) => l.symbol !== b.layers[i].symbol)) {
      changes.badge = { ...b, layers, finish, placements: [...b.placements] };
    }
  }
  if (ch.armorVariant && !variantState(ch.armorIndex | 0, ctx).unlocked) changes.armorVariant = 0;
  return changes;
}

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
  const save = readCampaignSave();
  _ctxCache = unlockContext({ stats, achievements, campaignSaveLevel: save.level, campaignSaveAct: save.act, owned: store.owned });
  _ctxAt = now;
  return _ctxCache;
}
