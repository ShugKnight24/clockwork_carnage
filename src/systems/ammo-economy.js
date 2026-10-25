/**
 * Ammo economy around the per-gun reserves (js/entities.js Player.reserves):
 * what an arena round hands out, kill drops by mode, and the boss arenas'
 * crates, which come back while a boss stands so a long fight never starves
 * the guns you hold. The caps stay; only the supply is topped up.
 */
import { Pickup } from "../../js/entities.js";
import { isBossEnemy } from "./combat.js";

/** Chance a kill drops an ammo crate, by mode. Arena rounds are all fighting. */
export const KILL_DROP_CHANCE = { campaign: 0.18, arena: 0.3 };
/** Game ms before a boss arena's crate is back, while the boss stands. */
export const BOSS_CRATE_RESPAWN_MS = 12000;

/** Crates' worth of rounds for every gun held at the start of arena round `round` (1-based). */
export function arenaRoundPacks(round) {
  return 1 + Math.floor(Math.max(0, round - 1) / 2);
}

/** Whether a boss is standing in the level (any form). */
export function bossStanding(game) {
  return game.entities.some((e) => e.type === "enemy" && e.active && e.state !== "dead" && isBossEnemy(e));
}

/** A crate was picked up: in a boss fight, it comes back where it was. */
export function noteCrateTaken(game, crate) {
  if (game.mode !== "campaign" || !bossStanding(game)) return;
  (game._bossCrates ??= []).push({ x: crate.x, y: crate.y, at: game.time + BOSS_CRATE_RESPAWN_MS });
}

/** Once a frame: put back the boss arena's crates that are due, while the boss stands. */
export function updateAmmoEconomy(game) {
  const due = game._bossCrates;
  if (!due?.length) return;
  if (game.mode !== "campaign" || !bossStanding(game)) {
    due.length = 0;
    return;
  }
  for (let i = due.length - 1; i >= 0; i--) {
    if (game.time < due[i].at) continue;
    game.entities.push(new Pickup(due[i].x, due[i].y, "ammo"));
    due.splice(i, 1);
  }
}
