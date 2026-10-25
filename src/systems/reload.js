/**
 * Magazines and the active reload, wired to the game: the reload key, the
 * auto-reload an empty trigger asks for, the boost on the next magazine, and
 * what a hit is worth to Conditioning. The timing itself is pure
 * (src/systems/active-reload.js); the rounds are the player's
 * (js/entities.js loadedOf / refillMag / spendRounds).
 *
 * For lessons and progress: `game.activeReload.stats` counts reloads, hits,
 * perfects, jams and cancels, and `game.onActiveReload` (if set) is called
 * with (outcome, weaponId) for every "perfect", "hit", "jam" and "normal".
 */
import {
  createActiveReload,
  startReload,
  pressReload,
  updateReload,
  cancelReload,
  boostFor,
  spendBoost,
} from "./active-reload.js";
import { conditioningBonuses, RELOAD_XP } from "./conditioning.js";
import { awardConditioning } from "./conditioning-play.js";

/** A pull this soon after the reload began is the one that began it. */
const TRIGGER_GRACE_MS = 60;

/** The game's tracker, made on first use. */
export function activeReloadOf(game) {
  return (game.activeReload ??= createActiveReload());
}

/** The held weapon's definition, or null. */
const held = (game) => game.player?.getWeaponDef?.() ?? null;

/** Start reloading the held gun, if a reload would add anything. */
export function beginReload(game) {
  const p = game.player;
  const wep = held(game);
  if (!wep || !p.canReload?.(wep.id)) return false;
  const ar = activeReloadOf(game);
  const { reloadMult, zoneMult } = conditioningBonuses(game.conditioning);
  if (!startReload(ar, wep, game.time, { reloadMult, zoneMult })) return false;
  ar.active.map = game.map; // a new level cancels it (updateReloads)
  game.audio?.reloadStart?.();
  return true;
}

/**
 * The reload key (R, or the pad's X when nothing is there to use): the
 * first press starts a reload, a press during one is the active reload.
 */
export function reloadPress(game) {
  const ar = activeReloadOf(game);
  if (!ar.active) return beginReload(game);
  const outcome = pressReload(ar, game.time);
  if (!outcome) return false;
  if (outcome === "jam") game.audio?.reloadJam?.();
  else {
    game.player.refillMag(ar.last.weaponId);
    game.audio?.reloadHit?.(outcome === "perfect");
    awardConditioning(game, "reload", RELOAD_XP[outcome]);
  }
  game.onActiveReload?.(outcome, ar.last.weaponId);
  return true;
}

/** Whether the held gun is mid-reload (and so cannot fire). */
export function isReloading(game) {
  const a = game.activeReload?.active;
  return !!a && a.weaponId === held(game)?.id;
}

/**
 * Once a frame: a switch or a new level cancels the reload; one that has run
 * its time fills the magazine.
 */
export function updateReloads(game) {
  const ar = activeReloadOf(game);
  const a = ar.active;
  if (a && (a.weaponId !== held(game)?.id || a.map !== game.map)) {
    cancelReload(ar);
    // The pull that pressed the reload was that gun's, not the next one's.
    ar.holdFire = false;
  }
  // A fresh pull of the trigger mid-reload is the active-reload press too
  // (mouse, touch and pad alike): a held trigger, or the pull that started
  // an empty gun's reload, is not.
  const firing = !!game.player?.isFiring;
  const b = ar.active;
  if (firing && !ar.fireWas && b && !b.pressed && game.time - b.start > TRIGGER_GRACE_MS) {
    reloadPress(game);
    // That pull was the reload's, not a shot: the gun waits for the next one.
    ar.holdFire = true;
  }
  if (!firing) ar.holdFire = false;
  ar.fireWas = firing;
  const done = updateReload(ar, game.time);
  if (done == null) return;
  game.player.refillMag(done);
  game.audio?.reloadDone?.();
  game.onActiveReload?.("normal", done);
}

/**
 * The trigger, before a round goes: false (and maybe a reload started) when
 * the magazine cannot fire `wep` now.
 */
export function readyToFire(game, wep) {
  const p = game.player;
  if (!p.loadedOf) return true; // a bare player (tests) has no magazines
  if (isReloading(game) || game.activeReload?.holdFire) return false;
  if (p.loadedOf(wep.id) >= (wep.ammoPerShot || 1)) return true;
  // Empty: reload when there is something to load.
  beginReload(game);
  return false;
}

/** A round left: spend it, and the boost with the magazine's last one. Returns the damage multiplier. */
export function spendShot(game, wep) {
  const p = game.player;
  const ar = activeReloadOf(game);
  const mult = boostFor(ar, wep.id);
  if (!p.spendRounds) {
    if (wep.id !== 0) p.ammo -= wep.ammoPerShot;
    return mult;
  }
  p.spendRounds(wep.id, wep.ammoPerShot || 1);
  if (p.loadedOf(wep.id) < (wep.ammoPerShot || 1)) spendBoost(ar, wep.id);
  return mult;
}
