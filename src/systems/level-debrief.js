/**
 * The level-complete debrief: par time, a letter grade, and what the level
 * paid out. Pure functions only — js/game.js gathers the numbers when the exit
 * is reached and the level-complete card (src/ui/game-over-screens.js) draws
 * the result.
 */
import { FINISHES } from "../data/weapon-skins.js";

/**
 * Par for a level, in seconds, from what has to be crossed and fought: a base
 * for the briefing walk, a share of the open floor, a fight per enemy and a
 * detour per power cell. Rounded to 5 s so it reads as a target, not a reading.
 * @param {{ openCells?: number, enemies?: number, powerCells?: number }} level
 */
export function parSeconds({ openCells = 0, enemies = 0, powerCells = 0 } = {}) {
  const raw = 45 + openCells * 0.03 + enemies * 7 + powerCells * 15;
  return Math.max(60, Math.round(raw / 5) * 5);
}

/** Lowest score for each letter, best first. */
export const GRADE_BANDS = [
  ["S", 90],
  ["A", 78],
  ["B", 62],
  ["C", 45],
  ["D", 0],
];

/**
 * Grade a cleared level out of 100: accuracy 30, time against par 30, damage
 * taken 30, secrets 10. Half your shots landing is full marks for accuracy (a
 * shotgun's pellets miss by design); par or faster is full marks for time,
 * falling to none at twice par; taking one and a half health bars is none for
 * damage. A level with no secrets gives its 10 for free.
 * @param {{ shotsFired?: number, shotsHit?: number, seconds: number, par: number,
 *   damageTaken?: number, maxHealth?: number, secretsFound?: number, secretsTotal?: number }} run
 * @returns {{ letter: string, score: number, parts: { accuracy: number, time: number, damage: number, secrets: number } }}
 */
export function gradeLevel(run) {
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const fired = run.shotsFired || 0;
  const acc = fired > 0 ? (run.shotsHit || 0) / fired : 1;
  const accuracy = 30 * clamp01(acc / 0.5);
  const par = Math.max(1, run.par || 1);
  const time = 30 * clamp01(2 - Math.max(0, run.seconds || 0) / par);
  const maxHp = Math.max(1, run.maxHealth || 100);
  const damage = 30 * clamp01(1 - (run.damageTaken || 0) / (maxHp * 1.5));
  const total = run.secretsTotal || 0;
  const secrets = total > 0 ? 10 * clamp01((run.secretsFound || 0) / total) : 10;
  const score = Math.round(accuracy + time + damage + secrets);
  const letter = GRADE_BANDS.find(([, min]) => score >= min)[0];
  return {
    letter,
    score,
    parts: {
      accuracy: Math.round(accuracy),
      time: Math.round(time),
      damage: Math.round(damage),
      secrets: Math.round(secrets),
    },
  };
}

/**
 * Weapon finishes crossed between two per-weapon kill tallies (the stats'
 * `weaponKills`), in kill order per weapon.
 * @returns {{ weaponId: string, finish: object }[]}
 */
export function finishesEarned(before = {}, after = {}) {
  const out = [];
  for (const [weaponId, n] of Object.entries(after || {})) {
    const was = Number(before?.[weaponId]) || 0;
    const now = Number(n) || 0;
    for (const f of FINISHES) {
      if (f.kills && was < f.kills && now >= f.kills) out.push({ weaponId, finish: f });
    }
  }
  return out;
}

/** "3:05" */
export function formatClock(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Open floor and secret walls in a level grid: what par and the secrets tally read. */
export function surveyGrid(grid) {
  let openCells = 0;
  let secrets = 0;
  for (const row of grid || []) {
    for (const t of row) {
      if (t === 0) openCells++;
      else if (t === 6) secrets++;
    }
  }
  return { openCells, secrets };
}
