/**
 * Player feedback rules: the low-health state and the damage-direction cues.
 *
 * Pure numbers, so the game loop, the audio mix and every HUD style read the
 * same state: the heartbeat, the muffle and the vignette all start at the
 * same health and climb together.
 */
import { clamp, normalizeAngle } from "../utils/math.js";

/** Below this share of max health the low-health state is on. */
export const LOW_HEALTH_AT = 0.3;

/** 0 at or above 30% health (and once dead), rising to 1 at empty. */
export function lowHealthSeverity(health, maxHealth) {
  if (!(maxHealth > 0) || !(health > 0)) return 0;
  const r = health / maxHealth;
  return r >= LOW_HEALTH_AT ? 0 : 1 - r / LOW_HEALTH_AT;
}

/** Seconds between heartbeats: about 70 a minute at 30% health, 140 near empty. */
export function heartbeatInterval(severity) {
  return 0.86 - 0.43 * clamp(severity || 0, 0, 1);
}

/**
 * The muffle's low-pass cutoff in Hz: wide open while healthy, dropping to
 * 4.2 kHz the moment health crosses 30% (the state reads at once) and on down
 * to 600 Hz near empty. Exponential, so each step sounds like the last.
 */
export function muffleCutoff(severity) {
  const s = clamp(severity || 0, 0, 1);
  if (s <= 0) return 20000;
  return 4200 * Math.pow(600 / 4200, s);
}

/**
 * The vignette's beat: 1 on each heartbeat, falling away before the next, at
 * the heartbeat's own rate. `time` in ms.
 */
export function heartPulse(time, severity) {
  const period = heartbeatInterval(severity) * 1000;
  const k = (((time % period) + period) % period) / period;
  return Math.exp(-k * 5);
}

/**
 * How strongly the low-health vignette shows: clearly there from 30% down
 * (0.3 at the threshold), near full at empty, breathing with the pulse.
 */
export function lowHealthVignetteAlpha(severity, pulse = 1) {
  const s = clamp(severity || 0, 0, 1);
  if (s <= 0) return 0;
  return (0.3 + 0.5 * s) * (0.72 + 0.28 * clamp(pulse, 0, 1));
}

/** The kill-streak sting's notes for a tier (1..6): one more note and a step higher per tier. */
export function streakNotes(tier) {
  const t = clamp(Math.round(tier || 1), 1, 6);
  const root = 523.25 * Math.pow(2, (2 * (t - 1)) / 12);
  const steps = [0, 4, 7, 12, 16, 19].slice(0, Math.min(t + 1, 5));
  return steps.map((s) => root * Math.pow(2, s / 12));
}

// ─── Damage direction ───────────────────────────────────────────────────────

/** How long a damage cue shows, in ms. */
export const DAMAGE_CUE_MS = 1000;
const MAX_CUES = 4;
/** Hits within this angle of a live cue refresh it rather than add another. */
const SAME_SIDE = 0.35;

/** 0.4 for a graze up to 1 for a hit worth 15% of max health or more. */
export function damageCueWeight(amount, maxHealth) {
  const share = maxHealth > 0 ? amount / maxHealth : 0;
  return clamp(0.4 + share * 4, 0.4, 1);
}

/**
 * Record a hit on the player from (fromX, fromY) at `time` (game ms), on
 * player.damageCues. A second hit from the same side refreshes that cue and
 * makes it stronger; a hit from somewhere new adds one, up to four.
 */
export function noteDamageCue(player, fromX, fromY, amount, time) {
  if (typeof fromX !== "number" || typeof fromY !== "number") return;
  const angle = Math.atan2(fromY - player.y, fromX - player.x);
  const weight = damageCueWeight(amount, player.maxHealth);
  const cues = player.damageCues || (player.damageCues = []);
  const same = cues.find((c) => time - c.at < DAMAGE_CUE_MS && Math.abs(normalizeAngle(c.angle - angle)) < SAME_SIDE);
  if (same) {
    same.angle = angle;
    same.at = time;
    same.weight = Math.min(1, Math.max(same.weight, weight) + 0.1);
    return;
  }
  cues.push({ angle, at: time, weight });
  if (cues.length > MAX_CUES) cues.shift();
}

/**
 * The cues to draw now: `rel` is the attacker's bearing from the view
 * (0 ahead, positive to the right, ±π behind), `alpha` fades out over the
 * second, `weight` is how hard the hit was. A hit that only set the old
 * lastDamageAngle (scripted damage that skips damagePlayer) still shows.
 */
export function activeDamageCues(player, time) {
  const out = [];
  const push = (angle, at, weight) => {
    const age = time - at;
    if (!(age >= 0 && age < DAMAGE_CUE_MS)) return;
    const k = age / DAMAGE_CUE_MS;
    out.push({ rel: normalizeAngle(angle - player.angle), alpha: (1 - k * k) * (0.6 + 0.4 * weight), weight, age: k });
  };
  const cues = player.damageCues || [];
  for (const c of cues) push(c.angle, c.at, c.weight);
  if (player.lastDamageAngle != null && player.hurtTime && !cues.some((c) => c.at === player.hurtTime)) {
    push(player.lastDamageAngle, player.hurtTime, 0.6);
  }
  return out;
}
