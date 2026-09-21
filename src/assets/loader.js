/**
 * Asset loader — bridges the procedurally generated SVG sprite library
 * to runtime UI (HUD, codex, kill-feed, upgrade cards). Pulls
 * `assets/manifest.json` once at boot, then hands back HTMLImageElement
 * instances on request, cached by id.
 *
 * Why static-import-then-fetch instead of bundling sprites: this keeps
 * the JS bundle small (manifest is tens of KB regardless of sprite
 * count) and lets `npm run assets:generate` regenerate art without a
 * code rebuild. Missing assets resolve to `null` so callers can fall
 * back to procedural draw paths — never throws, never blocks render.
 */

const cache = new Map(); // id → HTMLImageElement | null
let manifestPromise = null;
let manifestData = null;

// Vite serves the app under `base`, which is /clockwork_carnage/ in production.
// A document-relative "assets/..." only happens to resolve when the page URL
// ends in a slash; anywhere else it escapes the base and 404s, and the caller
// silently falls back to procedural art.
const BASE = import.meta.env?.BASE_URL ?? "/";

/** Resolve a manifest-relative asset path against the deployed base. */
function assetUrl(path) {
  if (/^([a-z]+:)?\/\//i.test(path) || path.startsWith("data:")) return path;
  return `${BASE}${path.replace(/^\/+/, "")}`;
}

async function loadManifest() {
  if (manifestData) return manifestData;
  if (!manifestPromise) {
    manifestPromise = fetch(assetUrl("assets/manifest.json"))
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        manifestData = j || { sets: {} };
        return manifestData;
      })
      .catch(() => {
        manifestData = { sets: {} };
        return manifestData;
      });
  }
  return manifestPromise;
}

/**
 * Resolve an asset id within a bucket to an Image. Returns null while
 * loading (caller should fall back to procedural art on null), then
 * the cached image on subsequent calls. Idempotent — calling repeatedly
 * with the same id costs one Map lookup.
 *
 * @param {"weapons"|"ui"|"enemies"|"props"|"backdrops"} bucket
 * @param {string} id  Asset id as it appears in the manifest
 * @returns {HTMLImageElement|null}
 */
export function getSprite(bucket, id) {
  const key = `${bucket}/${id}`;
  if (cache.has(key)) return cache.get(key);
  cache.set(key, null);
  // Kick off async resolve; subsequent calls return the cached entry
  // once the image finishes loading.
  loadManifest().then((m) => {
    const set = m.sets?.[bucket];
    if (!set) return;
    const entry = set.find((e) => e.id === id);
    if (!entry) return;
    const img = new Image();
    img.onload = () => cache.set(key, img);
    img.onerror = () => cache.set(key, null);
    img.src = assetUrl(entry.src);
  });
  return null;
}

/** Convenience helpers for the three primary buckets. */
export const getWeaponSprite = (slug) => getSprite("weapons", slug);
export const getUpgradeSprite = (id) => getSprite("ui", `upgrade-${id.toLowerCase()}`);
export const getEnemySprite = (enemyType) => getSprite("enemies", enemyType.toLowerCase());

/**
 * Force-prefetch every asset in a bucket — useful at boot to warm the
 * cache before menus open. Safe to call multiple times.
 */
export async function prefetchBucket(bucket) {
  const m = await loadManifest();
  const set = m.sets?.[bucket];
  if (!set) return;
  for (const entry of set) getSprite(bucket, entry.id);
}
