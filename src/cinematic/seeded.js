/** Small, fast, repeatable PRNG for shot set-up (same seed → same shot). */
export { mulberry32 } from "../utils/rng.js";

/** FNV-1a over "reel/shot". */
export function seedFor(reelId, shotId) {
  let h = 0x811c9dc5;
  for (const ch of `${reelId}/${shotId}`) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
  return h >>> 0;
}
