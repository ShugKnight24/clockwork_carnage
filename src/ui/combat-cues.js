/**
 * Combat cues for every HUD style: which way the last second's hits came
 * from. Comic and Modern art draw inked chevrons (hud-modern.js); Legacy
 * draws red arcs at the edge of the view, wider and thicker for a heavy hit.
 * Both read the cues from src/systems/player-feedback.js, so a hit points
 * at its attacker whatever the HUD or art style, post-processing on or off.
 */
import { isModernArt } from "../rendering/art-style.js";
import { drawModernCombatCues } from "./hud-modern.js";
import { activeDamageCues } from "../systems/player-feedback.js";

/** The damage-direction cues (and Modern's low-health frames) over a view `h - barH` tall. */
export function drawCombatCues(game, ctx, w, h, barH = 0) {
  if (isModernArt()) {
    drawModernCombatCues(game, ctx, w, h, barH);
    return;
  }
  drawLegacyDamageArcs(ctx, w, h - barH, activeDamageCues(game.player, game.time));
}

/** Legacy: a red band on the view's edge toward each attacker (0 rad ahead = top). */
export function drawLegacyDamageArcs(ctx, w, viewH, cues) {
  if (!cues.length) return;
  const cx = w / 2;
  const cy = viewH / 2;
  const rx = w * 0.45;
  const ry = viewH * 0.43;
  ctx.save();
  ctx.lineCap = "round";
  for (const c of cues) {
    const a = c.rel - Math.PI / 2;
    const half = 0.14 + 0.14 * c.weight;
    // A soft wide band under a bright core.
    ctx.globalAlpha = c.alpha * 0.45;
    ctx.strokeStyle = "rgb(255,20,0)";
    ctx.lineWidth = 14 + 18 * c.weight;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, a - half, a + half);
    ctx.stroke();
    ctx.globalAlpha = c.alpha;
    ctx.strokeStyle = "rgb(255,70,40)";
    ctx.lineWidth = 4 + 5 * c.weight;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, a - half * 0.8, a + half * 0.8);
    ctx.stroke();
  }
  ctx.restore();
}
