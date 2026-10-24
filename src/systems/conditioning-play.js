/**
 * Conditioning in play: where the XP comes from, where the bonuses go, the
 * level-up chip and sound, and saving. The rules are pure
 * (src/systems/conditioning.js).
 *
 * `game.conditioning` is the XP record ({ stamina, reload, steadiness });
 * `game.conditioningChip` is the latest level-up ({ skill, level, at }) the
 * HUD shows for a moment.
 */
import { addXp, conditioningBonuses, createConditioning, normalizeConditioning, STEADY_XP } from "./conditioning.js";
import { setAdsSteadiness } from "./aim.js";
import * as Save from "../core/save-system.js";

/** Modes that train nothing: the Forge's play test and the Meltdown runner are not the agent's work. */
const UNTRAINED_MODES = new Set(["playtest", "meltdown"]);
/** Game ms between saves of XP earned without a level-up. */
const SAVE_EVERY_MS = 10000;
/** A frame's move longer than this (tiles) is a teleport, not a sprint. */
const MAX_STEP = 1;

/** The saved record, made safe. */
export function loadConditioning() {
  return normalizeConditioning(Save.loadConditioning());
}

/** Start the agent over: every skill back to level 0, saved. */
export function resetConditioning(game) {
  game.conditioning = createConditioning();
  game.conditioningChip = null;
  Save.clearConditioning();
  applyConditioning(game);
}

/**
 * Add XP to a skill (in a mode that trains). A level crossed is saved at
 * once and announced with a chip and a sound.
 */
export function awardConditioning(game, skill, amount) {
  if (!game.conditioning || UNTRAINED_MODES.has(game.mode)) return 0;
  const level = addXp(game.conditioning, skill, amount);
  game._conditioningDirty = true;
  if (level) {
    game.conditioningChip = { skill, level, at: game.time };
    // The HUD's chip lane (src/ui/reload-hud.js drawConditioningChip).
    game.messages?.post?.(`conditioning:${skill}:${level}`, "conditioning", { skill, level });
    game.audio?.conditioningUp?.();
    saveNow(game);
    applyConditioning(game);
  }
  return level;
}

function saveNow(game) {
  game._conditioningDirty = false;
  game._conditioningSavedAt = game.time;
  Save.saveConditioning(game.conditioning);
}

/** Push the levels' bonuses onto the player and the aim. */
export function applyConditioning(game) {
  const b = conditioningBonuses(game.conditioning);
  const p = game.player;
  if (p) {
    p.condRegenMult = b.staminaRegenMult;
    p.condStaminaBonus = b.staminaBonus;
  }
  setAdsSteadiness(b.steadyMult);
}

/**
 * Once a frame after the player moves: count the tiles sprinted, keep the
 * bonuses on, and save now and then.
 */
export function updateConditioning(game) {
  const p = game.player;
  if (!p || !game.conditioning) return;
  const last = game._condLast;
  if (last && last.p === p && p.isSprinting) {
    const d = Math.hypot(p.x - last.x, p.y - last.y);
    if (d > 0 && d < MAX_STEP) awardConditioning(game, "stamina", d);
  }
  game._condLast = { p, x: p.x, y: p.y };
  // Every frame, it is a handful of assignments: a reset or a new player
  // object would otherwise drop the bonuses until the next level-up.
  applyConditioning(game);
  if (game._conditioningDirty && !(game.time - (game._conditioningSavedAt ?? 0) < SAVE_EVERY_MS)) saveNow(game);
}

/** A kill: Steadiness XP when it was made with the sights up, and for a headshot, aimed or not. */
export function noteConditioningKill(game, headshot) {
  const xp = (game.player?.isAiming ? STEADY_XP.adsKill : 0) + (headshot ? STEADY_XP.headshot : 0);
  if (xp) awardConditioning(game, "steadiness", xp);
}
