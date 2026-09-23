/**
 * Archive — the player's record of what they have encountered and recovered.
 *
 * Two collections share one store because they are read together on one screen
 * and saved together:
 *   - Bestiary: enemy types the player has killed at least once. Killing an
 *     enemy reveals its lore, threat rating and tactical note.
 *   - Memory fragments: Dead Squad story pieces. Visible fragments are awarded
 *     on finishing the level they belong to; hidden ones are awarded by
 *     breaking open the secret wall that conceals them.
 *
 * Progress is account-wide, not per save slot: it survives NG+ and campaign
 * restarts so the player never loses lore they have already earned.
 */
import { BESTIARY } from "../data/bestiary.js";
import { MEMORY_FRAGMENTS } from "../data/memory-fragments.js";
import {
  getAutoFragments,
  getHiddenFragments,
  getCollectionProgress,
  isFragmentCollected,
} from "./memory-fragments.js";
import * as Save from "../core/save-system.js";

export class ArchiveSystem {
  constructor(game) {
    this.game = game;
    /** @type {Record<string, boolean>} enemy type id -> encountered */
    this.seenEnemies = {};
    /** @type {Record<string, boolean>} fragment id -> collected */
    this.fragments = {};
    /** Fragments awarded this level, drained by the level-complete screen. */
    this.pendingFragments = [];
  }

  load() {
    Save.loadArchive(this.seenEnemies, this.fragments);
  }

  save() {
    Save.saveArchive(this.seenEnemies, this.fragments);
  }

  // ── Bestiary ──────────────────────────────────────────────────────────────

  /**
   * Record a kill. Only types with a bestiary entry are tracked, so unknown or
   * internal enemy ids cannot pollute the store.
   * @returns {boolean} true when this was the first kill of that type
   */
  recordKill(enemyType) {
    if (!enemyType || !BESTIARY[enemyType]) return false;
    if (this.seenEnemies[enemyType]) return false;
    this.seenEnemies[enemyType] = true;
    this.save();
    return true;
  }

  isEnemyKnown(enemyType) {
    return this.seenEnemies[enemyType] === true;
  }

  bestiaryProgress() {
    const total = Object.keys(BESTIARY).length;
    const found = Object.keys(BESTIARY).filter(
      (k) => this.seenEnemies[k],
    ).length;
    return { found, total };
  }

  // ── Memory fragments ──────────────────────────────────────────────────────

  /**
   * @returns {object|null} the fragment record when newly collected, else null
   */
  collectFragment(fragmentId) {
    if (!fragmentId) return null;
    const frag = MEMORY_FRAGMENTS.find((f) => f.id === fragmentId);
    if (!frag) return null;
    if (this.fragments[fragmentId]) return null;
    this.fragments[fragmentId] = true;
    this.pendingFragments.push(frag);
    this.save();
    return frag;
  }

  /**
   * Award the first uncollected hidden fragment for this level. Called when a
   * secret wall opens, so exploration is what surfaces the concealed entries.
   * @returns {object|null}
   */
  collectHiddenFragmentFor(act, level) {
    const candidates = getHiddenFragments(act, level);
    for (const frag of candidates) {
      if (!this.fragments[frag.id]) return this.collectFragment(frag.id);
    }
    return null;
  }

  /**
   * Award every visible fragment belonging to this level. Called on level
   * completion so the story beat lands with the debrief rather than mid-fight.
   * @returns {object[]} newly collected fragments
   */
  collectAutoFragmentsFor(act, level) {
    const out = [];
    for (const frag of getAutoFragments(act, level)) {
      const got = this.collectFragment(frag.id);
      if (got) out.push(got);
    }
    return out;
  }

  /** Collected ids as an array — the memory-fragments helpers take a list. */
  collectedIds() {
    return Object.keys(this.fragments).filter((k) => this.fragments[k]);
  }

  isFragmentCollected(fragmentId) {
    return isFragmentCollected(this.collectedIds(), fragmentId);
  }

  fragmentProgress() {
    return getCollectionProgress(this.collectedIds());
  }

  /** Returns and clears fragments awarded since the last drain. */
  drainPending() {
    const out = this.pendingFragments;
    this.pendingFragments = [];
    return out;
  }
}
