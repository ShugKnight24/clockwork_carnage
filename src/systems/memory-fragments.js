/**
 * Memory Fragments System — manages fragment collection state and queries.
 */
import { MEMORY_FRAGMENTS } from '../data/memory-fragments.js';

/**
 * Get all fragments assigned to a specific act and level.
 */
export function getFragmentsForLevel(act, level) {
  return MEMORY_FRAGMENTS.filter(f => f.act === act && f.level === level);
}

/**
 * Get only auto-collected (non-hidden) fragments for a given act/level.
 */
export function getAutoFragments(act, level) {
  return getFragmentsForLevel(act, level).filter(f => !f.hidden);
}

/**
 * Get only hidden/secret fragments for a given act/level.
 */
export function getHiddenFragments(act, level) {
  return getFragmentsForLevel(act, level).filter(f => f.hidden);
}

/**
 * Returns collection progress: how many found vs total, and whether complete.
 * @param {string[]} collected — array of collected fragment IDs
 */
export function getCollectionProgress(collected) {
  const total = MEMORY_FRAGMENTS.length;
  const found = collected ? collected.length : 0;
  return { found, total, complete: found >= total };
}

/**
 * Check whether a specific fragment has already been collected.
 * @param {string[]} collected — array of collected fragment IDs
 * @param {string} fragmentId — the fragment ID to check
 */
export function isFragmentCollected(collected, fragmentId) {
  return collected?.includes(fragmentId) ?? false;
}
