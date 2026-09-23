// Render pipeline — extracted from game.js render().
// Pure function: receives game instance, orchestrates all render phases.
// 1:1 extraction — no logic changes.
//
// Caller: game.render() → renderFrame(game).

import { renderPostFX as _renderPostFX } from "./postfx.js";
import { renderWeather } from "./weather.js";
import { GameState } from "../types.js";
import { effectiveAimFov, updateSprintFov } from "../systems/aim.js";
import { isModernArt } from "./art-style.js";
import { styleName, camFromPlayer } from "../systems/voxel-glue.js";
import { streamerFor, drawRadiusFor } from "../world/world-streamer.js";
import { prepareEnemySprite } from "./svg-art/sprites/enemies.js";
import { renderChronoWorld, renderChronoScreen } from "./chrono-fx.js";

let showroomLoad = "idle"; // idle | loading | ready | failed

/** Half-height in canvas pixels the enemy bitmaps are rasterised at. */
const ENEMY_SPRITE_PX = 128;

const PICKUP_COLORS = {
  health: "#ff4466",
  ammo: "#ffcc33",
  weapon: "#00ccff",
  gear: "#ffb84d",
  damage2x: "#ff5028",
  invuln: "#ffdc78",
  exit: "#44ffaa",
};
/** Non-enemy entities that earn a billboard; everything else is skipped. */
const MARKER_TYPES = new Set(Object.keys(PICKUP_COLORS));
const _pickupIcons = new Map();

/**
 * Placeholder billboard for a pickup or the exit. The 2D pickup art draws
 * straight into the frame with no bakeable sprite behind it, so this is a
 * tinted disc with the type's initial until they get real quads.
 */
function pickupIcon(type) {
  let icon = _pickupIcons.get(type);
  if (icon) return icon;
  icon = document.createElement("canvas");
  icon.width = icon.height = 32;
  const c = icon.getContext("2d");
  const color = PICKUP_COLORS[type] || "#ffffff";
  c.fillStyle = color;
  c.globalAlpha = 0.35;
  c.beginPath();
  c.arc(16, 16, 15, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = 1;
  c.beginPath();
  c.arc(16, 16, 10, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#04080f";
  c.font = "bold 14px monospace";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText((type || "?")[0].toUpperCase(), 16, 17);
  _pickupIcons.set(type, icon);
  return icon;
}

let _dotCanvas = null;
/** Soft round dot, white so a tint can colour it: bullets, sparks and debris. */
function softDot() {
  if (_dotCanvas) return _dotCanvas;
  _dotCanvas = document.createElement("canvas");
  // 32px, not the 8 a distant mote needs: a bolt leaving the barrel is
  // magnified enough that a coarser gradient shows its texels as a square.
  _dotCanvas.width = _dotCanvas.height = 32;
  const c = _dotCanvas.getContext("2d");
  const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.5, "rgba(255,255,255,0.75)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, 32, 32);
  return _dotCanvas;
}

let _streakCanvas = null;
/**
 * Tracer ribbon: uniform along the shot, fading out across its width so the
 * quad's edges do not read as a hard-edged strip of paper.
 */
function streakTexture() {
  if (_streakCanvas) return _streakCanvas;
  _streakCanvas = document.createElement("canvas");
  _streakCanvas.width = 4;
  _streakCanvas.height = 64;
  const c = _streakCanvas.getContext("2d");
  const g = c.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.5, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, 4, 64);
  return _streakCanvas;
}

/** Sprites a voxel frame may carry, particles included. */
const VOXEL_SPRITE_BUDGET = 400;

/** "r,g,b" (0-255) → the 0-1 triple the sprite program multiplies by. */
function tintFromCsv(csv) {
  const p = String(csv || "").split(",");
  return [(+p[0] || 255) / 255, (+p[1] || 255) / 255, (+p[2] || 255) / 255];
}

const _hexTints = new Map();
/** "#rrggbb" → the same 0-1 triple. Cached; the caller must not mutate it. */
function hexTint(hex) {
  if (!hex || hex.length < 7) return [1, 1, 1];
  let t = _hexTints.get(hex);
  if (!t) {
    t = [
      (parseInt(hex.slice(1, 3), 16) || 0) / 255,
      (parseInt(hex.slice(3, 5), 16) || 0) / 255,
      (parseInt(hex.slice(5, 7), 16) || 0) / 255,
    ];
    _hexTints.set(hex, t);
  }
  return t;
}

/**
 * Feet-anchored billboards for everything solid in a voxel play-test: enemies,
 * the pickup kinds above and the exit. Anything else (props) is left out;
 * projectiles and particles are light, and go through `fxSprites`.
 */
function spriteListFromEntities(game) {
  const out = [];
  const ctx = game.renderer.ctx;
  for (const e of game.entities) {
    if (!e.active) continue;
    // Not drawn in a column that is not loaded: it is frozen there (spec §16).
    if (game.world.unloadedAt(Math.floor(e.x), Math.floor(e.y))) continue;
    if (e.type === "enemy") {
      if (e.state === "dead") continue;
      const frame = prepareEnemySprite(ctx, e, ENEMY_SPRITE_PX, game.time);
      // `frame` is a shared object the boss branch fills differently: it sets
      // `parts` and leaves whatever `body` the previous enemy left behind, so
      // the model has to be asked whether this frame is a boss.
      if (!frame?.body || frame.model?.boss) continue;
      const def = e.def || {};
      out.push({
        x: e.x,
        y: e.y,
        z: e.z || 0,
        w: def.radius * 2.2 || 0.9,
        h: def.hitHeight * 2 || 1.6,
        image: frame.body,
        // The variant picks a different body bitmap for the same type and
        // pose, so it belongs in the cache identity.
        key: `enemy:${e.enemyType}:${frame.m?.variant ?? 0}:${frame.pose}`,
      });
      continue;
    }
    if (!MARKER_TYPES.has(e.type)) continue;
    const exit = e.type === "exit";
    out.push({
      x: e.x,
      y: e.y,
      z: e.z || 0,
      w: exit ? 1.2 : 0.6,
      h: exit ? 1.8 : 0.6,
      image: pickupIcon(e.type),
      key: `pickup:${e.type}`,
    });
  }
  return out;
}

/** Diameter of a bolt in flight, in blocks. */
const PROJECTILE_SIZE = 0.3;

/**
 * Bolts in flight, then sparks, smoke and debris as tinted dots — up to
 * whatever is left of the frame's sprite budget. All of it is drawn as light
 * (additive, no depth write), which is what it is.
 *
 * A particle's `z` is an offset from the raycaster's horizon (negative = up),
 * which means nothing in a level made of blocks; `wz` is the world height its
 * spawner stamped on it, and `z` still carries the rise and fall on top of
 * that. A particle with no `wz` was not placed in the world, so it is skipped
 * rather than drawn somewhere wrong.
 */
function fxSprites(game, budget) {
  const out = [];
  for (const e of game.entities) {
    if (!e.active || e.type !== "projectile") continue;
    if (out.length >= budget) return out;
    out.push({
      x: e.x, y: e.y, z: (e.z || 0) - PROJECTILE_SIZE / 2,
      w: PROJECTILE_SIZE, h: PROJECTILE_SIZE,
      image: softDot(),
      key: "fx:dot",
      tint: hexTint(e.color),
    });
  }
  const particles = game.player?.particles;
  if (!particles) return out;
  for (const p of particles) {
    if (out.length >= budget) break;
    if (p.wz == null || p.life <= 0) continue;
    const s = Math.max(0.05, (p.size || 0.04) * 2);
    out.push({
      x: p.x,
      y: p.y,
      z: p.wz - p.z - s / 2,
      w: s,
      h: s,
      image: softDot(),
      key: "fx:dot",
      alpha: Math.min(1, p.life / (p.maxLife || 0.3)),
      tint: [(p.r || 0) / 255, (p.g || 0) / 255, (p.b || 0) / 255],
    });
  }
  return out;
}

/**
 * The Forge's own light — a jetski's spray and foam — as additive dots. The
 * Forge hands over plain particles; the dot texture lives here with the rest.
 */
function forgeFx(builder) {
  const list = builder.fxFor?.();
  if (!list?.length) return null;
  for (const p of list) { p.image = softDot(); p.key = "fx:dot"; }
  return list;
}

/**
 * Hitscan tracers as world-space streaks for the voxel pass. The 2D renderer
 * draws the same list through its own projection; only a voxel level carries
 * the `z1/z2` these need.
 */
function segmentListFromTracers(game) {
  const out = [];
  for (const tr of game.tracers || []) {
    const t = Math.max(0, tr.life / tr.maxLife);
    if (t <= 0 || tr.z1 == null) continue;
    out.push({
      x1: tr.x1, y1: tr.y1, z1: tr.z1,
      x2: tr.x2, y2: tr.y2, z2: tr.z2,
      image: streakTexture(),
      key: "fx:streak",
      width: 0.05,
      alpha: t,
      tint: tintFromCsv(tr.color),
    });
  }
  return out;
}

/**
 * One frame of streaming for an endless world, just before it is drawn: the
 * one call site the Forge and a play-test share (spec §5). Loading takes at
 * most half the frame's budget and meshing the rest, so each always moves.
 * Bounded worlds have no streamer and get the renderer's defaults.
 * @returns {{meshMs:number, drawRadius:number, meshRadius:number, fogEnd:number, ms:number}|null}
 */
function streamVoxels(game, cam) {
  const st = streamerFor(game.world);
  if (!st) return null;
  st.setDrawRadius(drawRadiusFor(game.quality));
  const budget = st.budget(cam.x, cam.y);
  const ms = st.update(cam.x, cam.y, budget / 2);
  const r = st.radii;
  return { meshMs: Math.max(0, budget - ms), drawRadius: r.draw, meshRadius: r.mesh, fogEnd: r.draw, ms };
}

/**
 * Draw the voxel world into the 2D frame. Falls back to the empty-level fill
 * when the renderer is missing or its context is lost.
 * @returns {boolean} true when the world made it onto the canvas
 */
function drawVoxelScene(game, ctx, w, h, cam, sprites, lights, fx = null, segments = null, models = null) {
  const vr = game.voxelRenderer;
  const stream = vr && game.world ? streamVoxels(game, cam) : null;
  const drawn =
    vr &&
    game.world &&
    vr.render(cam, game.world, sprites, lights, {
      style: styleName(),
      act: game.world.meta.act || 1,
      fx,
      segments,
      models,
      ...stream,
    }) !== false;
  if (!drawn) {
    ctx.fillStyle = "#020610";
    ctx.fillRect(0, 0, w, h);
    return false;
  }
  ctx.drawImage(vr.canvas, 0, 0, w, h);
  // Streaming is part of the voxel phase: it is what the long flight costs.
  if (game.showFPS) game.profiler.currentPhases.voxel = vr.stats.ms + (stream?.ms || 0);
  return true;
}

/**
 * Fetch and mount the Modern <agent-showroom> overlay. main.js calls this on
 * boot (and when Modern is switched on) so the chunk is ready before the first
 * CHARACTER_CREATE frame; renderFrame calls it as a fallback.
 */
export function preloadShowroom(game) {
  if (game.showroom || showroomLoad !== "idle" || !isModernArt()) return;
  showroomLoad = "loading";
  import("../../js/components/agent-showroom.js")
    .then((m) => {
      game.showroom = m.mountShowroom(game);
      showroomLoad = "ready";
    })
    .catch((err) => {
      showroomLoad = "failed";
      console.warn("[showroom] failed to load, using the canvas creator", err);
    });
}

/**
 * Modern mode replaces the canvas creator with the showroom overlay, synced
 * every frame so it opens/closes with GameState.CHARACTER_CREATE and swaps
 * cleanly when the art style changes. Returns true while the overlay owns the
 * creator (including the frames while its chunk is still loading, so the
 * canvas creator never flashes in Modern).
 */
function syncShowroom(game) {
  const inCreator = game.state === GameState.CHARACTER_CREATE;
  const modern = isModernArt();
  if (game.showroom) {
    game.showroom.sync(inCreator, modern);
    return inCreator && modern;
  }
  preloadShowroom(game);
  return inCreator && modern && showroomLoad === "loading";
}

export function renderFrame(game) {
  const ctx = game.renderer.ctx;
  const w = game.renderer.width;
  const h = game.renderer.height;
  const showroom = syncShowroom(game);

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
    if (showroom) {
      ctx.fillStyle = "#03050a";
      ctx.fillRect(0, 0, w, h);
      return;
    }
    game.renderCharacterCreator(ctx, w, h);
    return;
  }

  if (game.state === GameState.STATS && game._statsReturnToMenu) {
    game.hudCtx.clearRect(0, 0, game.hudW, game.hudH);
    game.renderStatsScreen(ctx, w, h);
    return;
  }

  if (game.state === GameState.ARCHIVE) {
    game.hudCtx.clearRect(0, 0, game.hudW, game.hudH);
    game.renderArchiveScreen(ctx, w, h);
    return;
  }

  if (game.state === GameState.BUILDER) {
    game.hudCtx.clearRect(0, 0, game.hudW, game.hudH);
    // The onboarding modal already lists the core bindings. Showing the
    // persistent help panel underneath it duplicated half of them and left two
    // competing help surfaces on screen at once.
    const onboarding = !game._builderOnboardingDismissed;
    game.builder.suppressHelp = onboarding;
    drawVoxelScene(
      game,
      ctx,
      w,
      h,
      game.builder.cameraFor(),
      game.builder.spritesFor(),
      null,
      forgeFx(game.builder),
      null,
      game.builder.modelsFor?.(),
    );
    game.builder.render(ctx, w, h, game.time);
    if (onboarding) {
      game._renderBuilderOnboarding(ctx, w, h);
    }
    return;
  }

  // When paused from builder, render builder scene as the background
  if (
    game.state === GameState.PAUSED &&
    game.pausedFromState === GameState.BUILDER
  ) {
    drawVoxelScene(
      game,
      ctx,
      w,
      h,
      game.builder.cameraFor(),
      game.builder.spritesFor(),
      null,
      forgeFx(game.builder),
      null,
      game.builder.modelsFor?.(),
    );
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
  const stanceShift = (p.isSliding ? 40 : 28) * (p.crouchBlend || 0);
  const yShift = stanceShift + punchPx;
  updateSprintFov(p, game.deltaTime);
  const renderFov = effectiveAimFov(p, game.settings);
  const renderPlaneMul = Math.tan((renderFov * 0.5 * Math.PI) / 180);
  const skipFloorCeil = game.quality && !game.quality.enableFloorTexture;
  if (game.world) {
    const voxelSprites = spriteListFromEntities(game);
    drawVoxelScene(
      game,
      ctx,
      w,
      h,
      camFromPlayer(game.player, game.settings, renderFov),
      voxelSprites,
      game.lights || null,
      fxSprites(game, VOXEL_SPRITE_BUDGET - voxelSprites.length),
      segmentListFromTracers(game),
    );
  } else if (game.map?.grid) {
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
    // Chronos: Foresight, the Time-Lock, the echo, set pieces, the Hound.
    renderChronoWorld(game, game.renderer, renderPlaneMul, yShift);
  } else {
    ctx.fillStyle = "#020610";
    ctx.fillRect(0, 0, w, h);
  }

  // Motes and tracers project through the raycaster's camera. A voxel level
  // does not use it: its tracers and particles were drawn as world quads in
  // the pass above, and it grows no dust motes.
  const flat2D = !game.world;

  // Render atmospheric dust motes
  if (flat2D && (game.quality?.particleMultiplier ?? 1) >= 0.5 && game.dustMotes && game.dustMotes.length > 0) {
    game.renderer.renderParticles(game.player, game.dustMotes, game.time, renderPlaneMul, undefined, undefined, yShift);
  }

  // Hitscan tracers — drawn after sprites so they read on top, before vignette
  if (flat2D && game.tracers && game.tracers.length > 0) {
    game.renderer.renderTracers(game.player, game.tracers, renderPlaneMul, undefined, undefined, yShift);
  }

  ctx.restore();
  if (profiling) {
    // The voxel pass reports itself as `voxel` (drawVoxelScene); counting it in
    // `raycast` as well would show the same milliseconds twice. Each branch
    // zeroes the other's phase so neither shows a stale figure.
    game.profiler.currentPhases.raycast = game.world ? 0 : performance.now() - _tRay0;
    if (!game.world) game.profiler.currentPhases.voxel = 0;
  }

  // Subtle atmospheric horizon gradient (per-act fog tint)
  const _act = game.campaign?.act || 1;
  if (game.map?.grid) {
    const horizonY = (h >> 1) + yShift;
    const bandH = 40;
    const hy0 = horizonY - bandH / 2;
    const actHorizon = _act === 2
      ? "20,10,4" : _act === 3
        ? "22,4,8" : _act === 4
          ? "40,30,42" : "8,18,30";
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
  renderChronoScreen(game, ctx, w, h);

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

  // Each post-FX effect needs both the player's toggle and the quality preset
  // to allow it. Only the settings toggles were consulted before, so the
  // preset's post-FX choices had no effect.
  const _q = game.quality;
  const _fxBloom = game.settings.enableBloom !== false && _q?.enableBloom !== false;
  const _fxCA = game.settings.enableChromaticAberration !== false && _q?.enableChromaticAberration !== false;
  const _fxGrain = game.settings.enableFilmGrain !== false && _q?.enableFilmGrain !== false;

  // GPU post-FX path — use WebGL shader when GL renderer is available
  const _glr = game.renderer.glRenderer;
  const _pp = game.settings.postProcessing !== false;
  // The GPU pass copies the finished 2D frame into WebGL every frame, and on
  // many browser/GPU combinations that copy blocks the main thread until the
  // GPU has finished the whole frame (7-10 ms at 1440x900 @2x, and the main
  // cause of frame spikes). It is opt-in; the default grade runs as CSS
  // filters on the canvas element plus cached Canvas2D overlays, neither of
  // which reads pixels back.
  if (_glr && _pp && game.renderer.useWebGL && game.settings.gpuPostFx) {
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
      // Disable bloom/CA/grain/color-grade in Canvas path — GPU handles them.
      // Color grade had no flag, so it was applied here and again in the shader.
      enableBloom: false,
      enableChromaticAberration: false,
      enableFilmGrain: false,
      enableColorGrade: false,
      act: _act,
    });

    // GPU post-FX pass: bloom, chromatic aberration, film grain, color grade
    try {
      const src = postFxSource(_glr, game.canvas);
      if (src) {
        _glr.renderPostFXFromCanvas(src, game.time, _fxBloom, _fxCA, _fxGrain, _gc);
        // Draw GL result back to main Canvas2D
        ctx.drawImage(_glr.canvas, 0, 0);
      }
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
      // Canvas2D bloom downsamples the frame into a second canvas every frame,
      // the same cross-canvas copy the GPU pass was switched off for. Bloom
      // stays a GPU Film Grade effect.
      enableBloom: false,
      enableChromaticAberration: _fxCA,
      enableFilmGrain: _fxGrain,
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
  } else if (game.mode === "campaign" && game.state === GameState.PLAYING) {
    // A Chronos teach card, in the same place and the same card.
    game.renderTeachCard(ctx, w, h);
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


/**
 * Pick what the GPU post-FX pass reads this frame.
 *
 * Uploading the 2D canvas straight into WebGL makes the main thread wait for
 * the GPU to finish drawing the whole 2D frame first: 6-12 ms of blocked time
 * per frame at 1440x900 @2x, and the main source of frame spikes in every art
 * style. Instead, snapshot the canvas with createImageBitmap (no CPU wait) and
 * post-process the most recent completed snapshot. The world is therefore one
 * frame behind the HUD, which sits on its own canvas.
 *
 * Falls back to the direct (blocking) upload where createImageBitmap is
 * missing or fails, so older browsers keep working.
 */
function postFxSource(glr, canvas) {
  if (glr._syncUpload || typeof createImageBitmap !== "function") return canvas;
  if (!glr._snapPending) {
    glr._snapPending = true;
    createImageBitmap(canvas).then(
      (bm) => {
        glr._snapPending = false;
        if (glr._snapBitmap) glr._snapBitmap.close();
        glr._snapBitmap = bm;
      },
      () => {
        glr._snapPending = false;
        glr._syncUpload = true;
      },
    );
  }
  const bm = glr._snapBitmap;
  // Size changed (resize, render-scale step): drop the stale snapshot and
  // show this frame un-post-processed rather than stretch last frame.
  if (bm && (bm.width !== canvas.width || bm.height !== canvas.height)) {
    bm.close();
    glr._snapBitmap = null;
    return null;
  }
  return bm || null;
}
