/** Small, fast, repeatable PRNG for shot set-up (same seed → same shot). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a over "reel/shot". */
export function seedFor(reelId, shotId) {
  let h = 0x811c9dc5;
  for (const ch of `${reelId}/${shotId}`) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
  return h >>> 0;
}
