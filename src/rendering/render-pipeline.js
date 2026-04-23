// Render pipeline — extracted from game.js render().
// Pure function: receives game instance, orchestrates all render phases.
// 1:1 extraction — no logic changes.
//
// Caller: game.render() → renderFrame(game).

import { renderPostFX as _renderPostFX } from "./postfx.js";
import { GameState } from "../types.js";

export function renderFrame(game) {
  const ctx = game.renderer.ctx;
  const w = game.renderer.width;
  const h = game.renderer.height;

  if (
    game.state === GameState.TITLE ||
    game.state === GameState.MODE_SELECT
  ) {
    // Handled by html
    return;
  }

  if (game.state === GameState.CUTSCENE) {
    // Clear HUD canvas so it doesn't overlay the cutscene
    game.hudCtx.clearRect(0, 0, game.hudW, game.hudH);
    game.renderCutscene(ctx, w, h);
    return;
  }

  if (game.state === GameState.CAMPAIGN_PROMPT) {
    game.hudCtx.clearRect(0, 0, game.hudW, game.hudH);
    game.renderCampaignPrompt(ctx, w, h);
    return;
  }

  if (game.state === GameState.TUTORIAL_COMPLETE) {
    game.hudCtx.clearRect(0, 0, game.hudW, game.hudH);
    game.renderTutorialCompletionMenu(ctx, w, h);
    return;
  }

  if (game.state === GameState.CHARACTER_CREATE) {
    game.hudCtx.clearRect(0, 0, game.hudW, game.hudH);
    game.renderCharacterCreator(ctx, w, h);
    return;
  }

  if (game.state === GameState.STATS && game._statsReturnToMenu) {
    game.hudCtx.clearRect(0, 0, game.hudW, game.hudH);
    game.renderStatsScreen(ctx, w, h);
    return;
  }

  if (game.state === GameState.BUILDER) {
    game.hudCtx.clearRect(0, 0, game.hudW, game.hudH);
    game.builder.render(ctx, w, h, game.time);
    if (!game._builderOnboardingDismissed) {
      game._renderBuilderOnboarding(ctx, w, h);
    }
    return;
  }

  // When paused from builder, render builder scene as the background
  if (
    game.state === GameState.PAUSED &&
    game.pausedFromState === GameState.BUILDER
  ) {
    game.builder.render(ctx, w, h, game.time);
    const hctx = game.hudCtx;
    const hw = game.hudW;
    const hh = game.hudH;
    hctx.clearRect(0, 0, hw, hh);
    game.renderPauseScreen(hctx, hw, hh);
    return;
  }

  // Screen shake offset
  let shakeX = 0,
    shakeY = 0;
  if (game.screenShake > 0.5) {
    shakeX = (Math.random() - 0.5) * game.screenShake;
    shakeY = (Math.random() - 0.5) * game.screenShake;
  }

  // View bob when sprinting/dashing (whole screen sway)
  if (game.player.isSprinting || game.player.isDashing) {
    const bobIntensity = game.player.isDashing ? 6 : 3;
    shakeX += Math.sin(game.player.weaponBob * 1.1) * bobIntensity;
    shakeY +=
      Math.abs(Math.cos(game.player.weaponBob * 1.1)) * bobIntensity * 0.6;
  }

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // Render 3D scene — timed: raycast phase
  const _tRay0 = performance.now();
  // Camera vertical shift for crouch/slide
  const p = game.player;
  const yShift = p.isSliding ? 40 : p.isCrouching ? 28 : 0;
  game.renderer.renderScene(
    game.player,
    game.map,
    game.entities,
    game.time,
    game.settings.fov,
    game.settings.viewMode,
    false,
    yShift,
  );

  // Render atmospheric dust motes
  if (game.dustMotes && game.dustMotes.length > 0) {
    game.renderer.renderParticles(game.player, game.dustMotes, game.time);
  }

  ctx.restore();
  game.profiler.currentPhases.raycast = performance.now() - _tRay0;

  // Subtle ambient vignette (cached offscreen for performance)
  // Skipped when adaptive quality disables it
  const _tVig0 = performance.now();
  const _qVignette = !game.quality || game.quality.enableVignette;
  if (_qVignette) {
    if (
      !game._vignetteCanvas ||
      game._vignetteW !== w ||
      game._vignetteH !== h
    ) {
      game._vignetteCanvas = document.createElement("canvas");
      game._vignetteCanvas.width = w;
      game._vignetteCanvas.height = h;
      const vCtx = game._vignetteCanvas.getContext("2d");
      const vigGrad = vCtx.createRadialGradient(
        w / 2,
        h / 2,
        h * 0.35,
        w / 2,
        h / 2,
        h * 0.9,
      );
      vigGrad.addColorStop(0, "transparent");
      vigGrad.addColorStop(1, "rgba(0,0,10,0.35)");
      vCtx.fillStyle = vigGrad;
      vCtx.fillRect(0, 0, w, h);
      game._vignetteW = w;
      game._vignetteH = h;
    }
    ctx.drawImage(game._vignetteCanvas, 0, 0);
  }
  game.profiler.currentPhases.vignette = performance.now() - _tVig0;

  // Draw weapon (hidden in third person)
  const _tWpn0 = performance.now();
  if (game.settings.viewMode === 0) {
    game.drawWeapon(ctx, w, h);
  }

  // Draw player silhouette in third-person mode
  if (game.settings.viewMode === 1) {
    game.drawThirdPersonModel(ctx, w, h);
  }
  game.profiler.currentPhases.weapon = performance.now() - _tWpn0;

  // Effects: muzzle flash lighting, hurt flash, glitch, death fade
  const _tFx0 = performance.now();
  _renderPostFX(ctx, w, h, {
    time: game.time,
    muzzleFlashTime: game._muzzleFlashTime,
    muzzleFlashColor: game._muzzleFlashColor,
    player: game.player,
    glitchEffect: game.glitchEffect,
    canvas: game.canvas,
  });
  game.profiler.currentPhases.effects = performance.now() - _tFx0;

  // Render HUD on overlay canvas
  const _tHud0 = performance.now();
  game.renderHUD();

  // Tutorial overlay (rendered on game canvas, above HUD, below pause menus)
  if (game.mode === "tutorial") {
    game.renderTutorialOverlay(ctx, w, h);
  }
  game.profiler.currentPhases.hud = performance.now() - _tHud0;

  // Render overlay screens on HUD canvas (it's on top via z-index)
  const _tOvr0 = performance.now();
  const hctx = game.hudCtx;
  const hw = game.hudW;
  const hh = game.hudH;
  if (game.state === GameState.PAUSED) game.renderPauseScreen(hctx, hw, hh);
  if (game.state === GameState.SETTINGS)
    game.renderSettingsScreen(hctx, hw, hh);
  if (game.state === GameState.CONTROLS)
    game.renderControlsScreen(hctx, hw, hh);
  if (game.state === GameState.ACHIEVEMENTS)
    game.renderAchievementsScreen(hctx, hw, hh);
  if (game.state === GameState.STATS) game.renderStatsScreen(hctx, hw, hh);
  if (game.state === GameState.UPGRADE)
    game.renderUpgradeScreen(hctx, hw, hh);
  if (game.state === GameState.GAME_OVER) game.renderGameOver(hctx, hw, hh);
  if (game.state === GameState.VICTORY) game.renderVictory(hctx, hw, hh);
  if (game.state === GameState.LEVEL_COMPLETE)
    game.renderLevelComplete(hctx, hw, hh);
  game.profiler.currentPhases.overlays = performance.now() - _tOvr0;
}
