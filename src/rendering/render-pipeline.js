// Render pipeline — extracted from game.js render().
// Pure function: receives game instance, orchestrates all render phases.
// 1:1 extraction — no logic changes.
//
// Caller: game.render() → renderFrame(game).

import { renderPostFX as _renderPostFX } from "./postfx.js";
import { renderWeather } from "./weather.js";
import { GameState } from "../types.js";
import { effectiveAimFov, updateSprintFov } from "../systems/aim.js";

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

  // ── Screen shake ─────────────────────────────────────────────────────────
  // Driven by sampled sine at incommensurate frequencies rather than a fresh
  // Math.random() per frame. Per-frame random reads as static buzz; a sampled
  // waveform reads as a physical camera knock. Amplitude is quadratic in
  // trauma, so light hits barely register and heavy ones punch.
  let shakeX = 0,
    shakeY = 0;
  if (game.settings.screenShake && game.screenShake > 0.5) {
    const trauma = Math.min(1, game.screenShake / 14);
    const amp = trauma * trauma * 14;
    const st = game.time * 0.001;
    shakeX = Math.sin(st * 47.3) * amp * 0.85;
    // Recoil-biased: the vertical component keeps an upward push.
    shakeY = Math.sin(st * 61.7) * amp * 0.5 - trauma * amp * 0.45;
    game._shakeRoll = Math.sin(st * 38.1) * trauma * trauma * 0.012;
  } else {
    game._shakeRoll = 0;
  }

  // View bob when sprinting/dashing (whole screen sway)
  if (game.settings.weaponBob && (game.player.isSprinting || game.player.isDashing)) {
    const bobIntensity = game.player.isDashing ? 6 : 3;
    const bobT = game.player.weaponBob * 1.1;
    shakeX += Math.sin(bobT) * bobIntensity;
    shakeY += Math.sin(bobT * 2) * bobIntensity * 0.4;
  }

  ctx.save();
  ctx.translate(shakeX, shakeY);
  // A touch of roll sells the knock as a camera, not a sliding image.
  if (game._shakeRoll) {
    ctx.translate(w / 2, h / 2);
    ctx.rotate(game._shakeRoll);
    ctx.translate(-w / 2, -h / 2);
  }

  // Camera tilt (slide lean)
  const tilt = game.player.cameraTilt || 0;
  if (Math.abs(tilt) > 0.001) {
    ctx.translate(w / 2, h / 2);
    ctx.rotate(tilt);
    ctx.translate(-w / 2, -h / 2);
  }

  // Render 3D scene — timed: raycast phase
  const profiling = !!game.showFPS;
  const _tRay0 = profiling ? performance.now() : 0;
  // Scene yShift is body movement only. Free-aim reticle must not move textures.
  const p = game.player;
  // Camera punch converts to vertical pixel offset (negative = kick upward)
  const punchPx = (p.cameraPunch || 0) * -h * 0.12;
  const yShift = (p.isSliding ? 40 : p.isCrouching ? 28 : 0) + punchPx;
  updateSprintFov(p, game.deltaTime);
  const renderFov = effectiveAimFov(p, game.settings);
  const renderPlaneMul = Math.tan((renderFov * 0.5 * Math.PI) / 180);
  const skipFloorCeil = game.quality && !game.quality.enableFloorTexture;
  if (game.map?.grid) {
    // Hand the renderer this frame's dynamic light list so wall/floor
    // shading can sample radial brightness. Cleared each frame implicitly
    // because the array is replaced by reference.
    game.renderer.lights = game.lights || null;
    game.renderer.renderScene(
      game.player,
      game.map,
      game.entities,
      game.time,
      renderFov,
      game.settings.viewMode,
      skipFloorCeil,
      yShift,
    );
  } else {
    ctx.fillStyle = "#020610";
    ctx.fillRect(0, 0, w, h);
  }

  // Render atmospheric dust motes
  if ((game.quality?.particleMultiplier ?? 1) >= 0.5 && game.dustMotes && game.dustMotes.length > 0) {
    game.renderer.renderParticles(game.player, game.dustMotes, game.time, renderPlaneMul);
  }

  // Hitscan tracers — drawn after sprites so they read on top, before vignette
  if (game.tracers && game.tracers.length > 0) {
    game.renderer.renderTracers(game.player, game.tracers, renderPlaneMul);
  }

  ctx.restore();
  if (profiling) game.profiler.currentPhases.raycast = performance.now() - _tRay0;

  // Subtle atmospheric horizon gradient (per-act fog tint)
  const _act = game.campaign?.act || 1;
  if (game.map?.grid) {
    const horizonY = (h >> 1) + yShift;
    const bandH = 40;
    const hy0 = horizonY - bandH / 2;
    const actHorizon = _act === 2
      ? "20,10,4" : _act === 3
        ? "22,4,8" : "8,18,30";
    const hGrad = ctx.createLinearGradient(0, hy0, 0, hy0 + bandH);
    hGrad.addColorStop(0, "transparent");
    hGrad.addColorStop(0.5, `rgba(${actHorizon},0.12)`);
    hGrad.addColorStop(1, "transparent");
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, hy0, w, bandH);
  }

  // Subtle ambient vignette (cached offscreen for performance)
  // Skipped when adaptive quality disables it
  const _tVig0 = profiling ? performance.now() : 0;
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
  if (profiling) game.profiler.currentPhases.vignette = performance.now() - _tVig0;

  // Draw weapon (hidden in third person)
  const _tWpn0 = profiling ? performance.now() : 0;
  if (game.settings.viewMode === 0) {
    game.drawWeapon(ctx, w, h);
  }

  // Draw player silhouette in third-person mode
  if (game.settings.viewMode === 1) {
    game.drawThirdPersonModel(ctx, w, h);
  }
  if (profiling) game.profiler.currentPhases.weapon = performance.now() - _tWpn0;

  // Per-act atmospheric weather particles (before post-FX)
  if ((game.quality?.particleMultiplier ?? 1) >= 0.3) {
    renderWeather(ctx, w, h, game);
  }

  // Effects: muzzle flash lighting, hurt flash, glitch, death fade
  const _tFx0 = profiling ? performance.now() : 0;

  // GPU post-FX path — use WebGL shader when GL renderer is available
  const _glr = game.renderer.glRenderer;
  const _pp = game.settings.postProcessing !== false;
  if (_glr && _pp && game.renderer.useWebGL) {
    // Per-act grade color in 0-1 range for the GL shader
    const _gradeColors = {
      1: [0, 0.157, 0.235],  // teal
      2: [0.157, 0.098, 0],  // warm amber
      3: [0.157, 0, 0.039],  // hot crimson
    };
    const _gc = _gradeColors[_act] || _gradeColors[1];

    // Run muzzle flash / hurt flash / glitch / death via Canvas 2D first
    // (these are per-event overlays not suited for the static GL shader)
    _renderPostFX(ctx, w, h, {
      time: game.time,
      muzzleFlashTime: game._muzzleFlashTime,
      muzzleFlashColor: game._muzzleFlashColor,
      player: game.player,
      glitchEffect: game.glitchEffect,
      canvas: game.canvas,
      postProcessing: game.settings.postProcessing,
      audio: game.audio,
      // Disable bloom/CA/grain/color-grade in Canvas path — GPU handles them
      enableBloom: false,
      enableChromaticAberration: false,
      enableFilmGrain: false,
      act: _act,
    });

    // GPU post-FX pass: bloom, chromatic aberration, film grain, color grade
    try {
      _glr.renderPostFXFromCanvas(
        game.canvas,
        game.time,
        game.settings.enableBloom !== false,
        game.settings.enableChromaticAberration !== false,
        game.settings.enableFilmGrain !== false,
        _gc,
      );
      // Draw GL result back to main Canvas2D
      ctx.drawImage(_glr.canvas, 0, 0);
    } catch (_e) {
      // Shader failure — fall through silently, Canvas 2D already applied overlays
    }
  } else {
    // Canvas 2D post-FX fallback
    _renderPostFX(ctx, w, h, {
      time: game.time,
      muzzleFlashTime: game._muzzleFlashTime,
      muzzleFlashColor: game._muzzleFlashColor,
      player: game.player,
      glitchEffect: game.glitchEffect,
      canvas: game.canvas,
      postProcessing: game.settings.postProcessing,
      audio: game.audio,
      enableBloom: game.settings.enableBloom,
      enableChromaticAberration: game.settings.enableChromaticAberration,
      enableFilmGrain: game.settings.enableFilmGrain,
      act: _act,
    });
  }
  if (profiling) game.profiler.currentPhases.effects = performance.now() - _tFx0;

  // Render HUD on overlay canvas
  const _tHud0 = profiling ? performance.now() : 0;
  game.renderHUD();

  // Tutorial overlay (rendered on game canvas, above HUD, below pause menus)
  if (game.mode === "tutorial") {
    game.renderTutorialOverlay(ctx, w, h);
  }
  if (profiling) game.profiler.currentPhases.hud = performance.now() - _tHud0;

  // Render overlay screens on HUD canvas (it's on top via z-index)
  const _tOvr0 = profiling ? performance.now() : 0;
  const hctx = game.hudCtx;
  const hw = game.hudW;
  const hh = game.hudH;
  if (game.state === GameState.PAUSED) game.renderPauseScreen(hctx, hw, hh);
  if (game.state === GameState.SETTINGS)
    game.renderSettingsScreen(hctx, hw, hh);
  if (game.state === GameState.HUD_EDITOR)
    game.hudEditor.render(hctx, hw, hh);
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
  if (profiling) game.profiler.currentPhases.overlays = performance.now() - _tOvr0;
}
