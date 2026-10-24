/**
 * Active reload (the Gears of War kind), as pure state and timing.
 *
 * A reload sweeps a marker across a bar for the weapon's `reloadMs`. Part of
 * the bar is the sweet zone (`reloadZone: [start, width]`, fractions of the
 * bar), and the first third of that zone is the perfect zone. Press reload
 * again while the marker is inside the zone and the magazine is in at once,
 * and it hits harder (BOOST) until it is spent. Press anywhere else and the
 * gun jams: the reload runs JAM_MS longer and a second press does nothing.
 * No press is an ordinary reload.
 *
 * Nothing here touches the player or the game: times are passed in (game
 * ms) and the caller fills the magazine when a reload reports it is done
 * (src/systems/reload.js).
 */

/** Damage multiplier for a magazine loaded by a hit. */
export const BOOST = 1.15;
/** Extra ms a jammed reload takes. */
export const JAM_MS = 600;
/** The perfect zone is this share of the sweet zone, at its leading edge. */
export const PERFECT_SHARE = 0.35;
/** A weapon with no tuning of its own. */
const DEFAULT_ZONE = [0.5, 0.15];
const DEFAULT_RELOAD_MS = 1600;

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** A fresh tracker. `stats` counts outcomes for lessons and progress (never reset by a reload). */
export function createActiveReload() {
  return {
    /** The reload in progress, or null. */
    active: null,
    /** Weapon id → true while that gun's magazine was loaded by a hit. */
    boosted: {},
    /** The last outcome: { outcome, weaponId, at }, for HUD flashes. */
    last: null,
    stats: { reloads: 0, hits: 0, perfects: 0, jams: 0, cancels: 0 },
  };
}

/**
 * The bar for `wep`, with Conditioning's modifiers: `reloadMult` scales the
 * time, `zoneMult` widens the sweet zone about its centre (never past the
 * bar's ends).
 * @returns {{ duration: number, zoneStart: number, zoneEnd: number, perfectEnd: number }}
 */
export function reloadWindow(wep, { reloadMult = 1, zoneMult = 1 } = {}) {
  const duration = Math.max(200, (wep?.reloadMs ?? DEFAULT_RELOAD_MS) * reloadMult);
  const [start, width] = wep?.reloadZone ?? DEFAULT_ZONE;
  const w = width * zoneMult;
  const mid = start + width / 2;
  const zoneStart = clamp01(mid - w / 2);
  const zoneEnd = clamp01(mid + w / 2);
  return { duration, zoneStart, zoneEnd, perfectEnd: zoneStart + (zoneEnd - zoneStart) * PERFECT_SHARE };
}

/**
 * Begin reloading `wep` at `now`. A new magazine replaces the old, so any
 * boost on this gun ends here. Returns false if a reload is already running.
 */
export function startReload(ar, wep, now, mods) {
  if (ar.active || !wep) return false;
  const win = reloadWindow(wep, mods);
  ar.active = { weaponId: wep.id, start: now, ...win, end: now + win.duration, pressed: null };
  delete ar.boosted[wep.id];
  return true;
}

/** Where the marker is, 0 … 1 along the bar (it stops at the end while a jam runs out). */
export function reloadProgress(ar, now) {
  const a = ar.active;
  if (!a) return 0;
  return clamp01((now - a.start) / a.duration);
}

/** How far through the whole reload, jam included, 0 … 1. */
export function reloadCompletion(ar, now) {
  const a = ar.active;
  if (!a) return 0;
  return clamp01((now - a.start) / Math.max(1, a.end - a.start));
}

/**
 * The second press. Inside the zone: "perfect" or "hit", and the reload is
 * over (boosted). Outside: "jam". Returns null when there is nothing to press
 * (no reload, or this one was already pressed).
 */
export function pressReload(ar, now) {
  const a = ar.active;
  if (!a || a.pressed) return null;
  const t = reloadProgress(ar, now);
  if (t >= a.zoneStart && t <= a.zoneEnd) {
    const outcome = t <= a.perfectEnd ? "perfect" : "hit";
    a.pressed = outcome;
    ar.boosted[a.weaponId] = true;
    ar.stats.reloads++;
    ar.stats.hits++;
    if (outcome === "perfect") ar.stats.perfects++;
    ar.last = { outcome, weaponId: a.weaponId, at: now };
    ar.active = null;
    return outcome;
  }
  a.pressed = "jam";
  a.end += JAM_MS;
  ar.stats.jams++;
  ar.last = { outcome: "jam", weaponId: a.weaponId, at: now };
  return "jam";
}

/**
 * Once a frame. Returns the weapon id whose reload just finished on its own
 * (with or without a jam), else null.
 */
export function updateReload(ar, now) {
  const a = ar.active;
  if (!a || now < a.end) return null;
  ar.active = null;
  ar.stats.reloads++;
  if (a.pressed !== "jam") ar.last = { outcome: "normal", weaponId: a.weaponId, at: now };
  return a.weaponId;
}

/** Drop the reload in progress (a weapon switch): the magazine stays as it was. */
export function cancelReload(ar) {
  if (!ar.active) return false;
  ar.active = null;
  ar.stats.cancels++;
  return true;
}

/** The damage multiplier for a round from weapon `id`. */
export const boostFor = (ar, id) => (ar?.boosted[id] ? BOOST : 1);

/** A boosted magazine ran dry: the next one is ordinary unless it is earned again. */
export function spendBoost(ar, id) {
  delete ar.boosted[id];
}
