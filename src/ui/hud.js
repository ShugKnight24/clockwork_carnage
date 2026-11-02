import { isCompactPhone } from "./layout.js";
import { isModernArt } from "../rendering/art-style.js";
import {
  renderModernMinimalPanels,
  renderModernTacticalPanels,
  renderModernCustomPanels,
  hudAnchors,
} from "./hud-modern.js";
import { renderVanguardPanels, renderVanguardMinimap } from "./hud-vanguard.js";
import { updateHudMotion } from "./hud-motion.js";
import { buildHudState, minimapState } from "./hud-state.js";
import { drawHudMinimap, drawPhoneMinimap } from "./hud-shared.js";
import { renderCompactHUD } from "./hud-compact.js";
import { renderClassicHUD } from "./hud-classic.js";
import { renderLegacyTacticalHUD } from "./hud-tactical.js";
import { renderLegacyCustomHUD } from "./hud-custom.js";
import { renderLegacyMinimalPanels, renderFloatingOverlays } from "./hud-minimal.js";

/**
 * HUD rendering — extracted from game.js. renderHUD picks the layout; each
 * style draws from a per-frame snapshot (hud-state.js):
 *
 *   compact phone        hud-compact.js   (Vanguard/Modern bars from their modules)
 *   Classic (1)          hud-classic.js   (Modern bar: renderModernClassic)
 *   Tactical (2) Legacy  hud-tactical.js
 *   Custom (3) Legacy    hud-custom.js
 *   Minimal (0), Vanguard (4, Modern-only; Legacy draws Minimal), and the
 *   Modern Tactical/Custom panels share hud-minimal.js's floating overlays.
 *
 * Pieces every layout draws (reticle, hit marker, damage numbers, minimap,
 * banners) live in hud-shared.js; Meltdown's extras in hud-meltdown.js.
 */

export { renderMeltdownUpgradeOverlay } from "./hud-meltdown.js";

/**
 * The settings deck shows the HUD behind it so HUD settings change visibly:
 * the paused match's own HUD, or the menu showcase's fresh player. Not over
 * the Forge (its pause draws no FPS HUD) or a menu with nothing loaded yet.
 */
function hudBehindDeck(game) {
  if (game.state !== "settings") return false;
  if (game.mode === "showcase") return true;
  return game._settingsReturnTo !== "menu" && game.pausedFromState !== "builder" && !!game.map?.grid;
}

/**
 * @param {object} game - Game instance (read-only access)
 */
export function renderHUD(game) {
  const ctx = game.hudCtx;
  const w = game.hudW;
  const h = game.hudH;
  ctx.clearRect(0, 0, w, h);
  // The HUD canvas keeps its state from frame to frame: a panel that left the
  // baseline at "top" or "middle" dropped next frame's ammo count off the
  // bottom of the screen, until something (the reload bar) set it back.
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  if (game.state !== "playing" && game.state !== "paused" && !hudBehindDeck(game))
    return;

  hudAnchors.stackBottom = 0;

  // The prologue's opening, before the suit goes on: no HUD yet, only the
  // station map (where am I, where's my locker) and what people say.
  if (game.mode === "tutorial" && game.tutorial?.preSuit) {
    const mm = minimapState(game);
    if (game.isTouchDevice && isCompactPhone(h)) {
      drawPhoneMinimap(ctx, w, h, {
        touchMinimapZone: game.touchControls?.zones?.minimap,
        minimapSize: game.settings.minimapSize,
        minimap: mm,
      });
    } else if (game.settings.hudStyle === 4 && isModernArt()) renderVanguardMinimap(game, ctx, w, h, mm);
    else drawHudMinimap(ctx, w - game.settings.minimapSize - 10, 10, game.settings.minimapSize, mm);
    game.renderAriaComms(ctx, w, h);
    return;
  }

  // HUD disruption effect (disabled by enemy support abilities)
  if (game._hudDisabledUntil && game.time < game._hudDisabledUntil) {
    drawDisruptedHUD(ctx, w, h);
    return;
  }

  const s = buildHudState(game);

  if (s.mode === "playtest") drawPlaytestBanner(ctx, w, s);

  if (s.modern) updateHudMotion(game);

  // On compact mobile, render a slim HUD and skip the full layout
  if (s.compact) {
    renderCompactHUD(ctx, w, h, s, game);
    return;
  }

  // Classic HUD — opaque bottom bar with portrait, weapons, stats
  if (s.hudStyle === 1) {
    renderClassicHUD(ctx, w, h, s, game);
    return;
  }

  if (!s.modern) {
    // Tactical HUD — sleek floating arc; Custom HUD — JSON layout driven.
    // Neither draws the shared overlays.
    if (s.hudStyle === 2) {
      renderLegacyTacticalHUD(ctx, w, h, s);
      return;
    }
    if (s.hudStyle === 3) {
      renderLegacyCustomHUD(ctx, w, h, s);
      return;
    }
    renderLegacyMinimalPanels(ctx, w, h, s, game);
  } else if (s.vanguard) renderVanguardPanels(game, ctx, w, h, s.hudFactor, s.portrait, s.minimap);
  else if (s.hudStyle === 2) renderModernTacticalPanels(game, ctx, w, h, s.hudFactor);
  else if (s.hudStyle === 3) renderModernCustomPanels(game, ctx, w, h, s.hudFactor, s.portrait);
  else renderModernMinimalPanels(game, ctx, w, h, s.hudFactor);

  // Minimal and the Modern panels share the overlay pass (reticle, minimap, toasts).
  renderFloatingOverlays(ctx, w, h, s, game);
}

/** Enemy support abilities can knock the HUD offline for a moment. */
function drawDisruptedHUD(ctx, w, h) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#ff6666";
  ctx.font = "bold 20px monospace";
  ctx.textAlign = "center";
  ctx.fillText("SYSTEMS DISRUPTED", w / 2, h / 2 - 12);
  ctx.font = "12px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText("HUD offline — temporary interference.", w / 2, h / 2 + 10);
  ctx.restore();
}

/** Playtest mode banner across the top. */
function drawPlaytestBanner(ctx, w, s) {
  ctx.save();
  ctx.fillStyle = "rgba(0, 200, 255, 0.15)";
  ctx.fillRect(0, 0, w, 32);
  ctx.fillStyle = "#00ccff";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const allDead =
    s.killedEnemies >= s.totalEnemies && s.totalEnemies > 0;
  const label = allDead
    ? "PLAY TEST COMPLETE — Returning to builder..."
    : `PLAY TEST — ${s.killedEnemies}/${s.totalEnemies} killed — ESC to return`;
  ctx.fillText(label, w / 2, 16);
  ctx.restore();
}
