import { Game, GameState, GAME_VERSION } from "./game.js";
import { TouchControls } from "./touch.js";
import { initAnalytics, trackEvent } from "./analytics.js";
import { AdaptiveQuality } from "../src/utils/perf.js";
import { isPrimaryTouchDevice } from "../src/utils/device.js";
import { invalidateHUD } from "../src/ui/hud.js";
import { preloadShowroom } from "../src/rendering/render-pipeline.js";
import { onArtStyleChange, isModernArt } from "../src/rendering/art-style.js";
import { detectDeviceTier, budgetedRenderSize } from "../src/utils/device-tier.js";
import { injectDesignTokens } from "../src/ui/design-tokens.js";
import { initUnlockToasts, showGearToast } from "../src/ui/unlock-toast.js";
import {
  FramePacer,
  frameCapFor,
  qualityTargetFPS,
} from "../src/systems/frame-pacer.js";

const primaryTouch = isPrimaryTouchDevice();
const debugParam = new URLSearchParams(window.location.search).has("debug");
const devToolsEnabled = (import.meta.env?.DEV ?? false) || debugParam;

const gameCanvas = document.getElementById("gameCanvas");
const hudCanvas = document.getElementById("hudCanvas");
const titleScreen = document.getElementById("titleScreen");
const modeSelect = document.getElementById("modeSelect");
const btnContinueCampaign = document.getElementById("btnContinueCampaign");
const continueCampaignDesc = document.getElementById("continueCampaignDesc");
const btnContinueArena = document.getElementById("btnContinueArena");
const continueArenaDesc = document.getElementById("continueArenaDesc");

const game = new Game(gameCanvas, hudCanvas);
const quality = new AdaptiveQuality({
  targetFPS: 55,
  minScale: game.isTouchDevice ? 0.35 : 0.5,
  maxScale: 1.0,
});
game.quality = quality;
game.applyPerformanceSettings();

// Modern UI tokens on :root, and the agent showroom chunk warmed while the
// title is up so a campaign never opens on a blank (or Legacy) creator frame.
injectDesignTokens();
preloadShowroom(game);
initUnlockToasts(game);
// The DOM toast lives in the UI layer; the game only needs to be able to ask
// for one when a drop is collected.
game.showGearToast = showGearToast;
onArtStyleChange(() => {
  if (isModernArt()) preloadShowroom(game);
});

// initialize analytics (consent UI waits until first user interaction)
initAnalytics();

// Set version label on title screen
const versionLabel = document.getElementById("versionLabel");
if (versionLabel) versionLabel.textContent = `v${GAME_VERSION}`;

// Update start prompt for touch devices
if (primaryTouch) {
  const startPrompt = titleScreen.querySelector(".start-prompt");
  if (startPrompt) startPrompt.textContent = "[ TAP TO START ]";
}

// Track native (CSS) dimensions for adaptive resolution
let nativeW = 0, nativeH = 0;

function resizeCanvases() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap at 2× for perf
  const cssW = window.innerWidth;
  const cssH = window.innerHeight;
  // Render at a per-device pixel budget, not the raw window size: a 4K monitor
  // is 6x the pixels of a laptop, and a phone GPU a fraction of a desktop's.
  // (This replaces a flat 1280px cap that only applied to touch devices.)
  const { w: renderW, h: renderH } = budgetedRenderSize(cssW, cssH, detectDeviceTier());
  nativeW = renderW;
  nativeH = renderH;

  // Store DPR + CSS-pixel dimensions on game for layout code
  game.dpr = dpr;
  game.hudW = cssW;
  game.hudH = cssH;

  // HUD at full DPR for crisp text
  hudCanvas.style.width = cssW + "px";
  hudCanvas.style.height = cssH + "px";
  hudCanvas.width = Math.round(cssW * dpr);
  hudCanvas.height = Math.round(cssH * dpr);
  game.hudCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Game canvas renders at quality-scaled res (no DPR — adaptive quality handles it)
  const s = quality.stableScale ?? quality.renderScale;
  gameCanvas.style.width = cssW + "px";
  gameCanvas.style.height = cssH + "px";
  const gw = Math.round(renderW * s);
  const gh = Math.round(renderH * s);
  gameCanvas.width = gw;
  gameCanvas.height = gh;
  if (game.renderer) {
    game.renderer.resize(gw, gh);
  }
  game.voxelRenderer?.resize(gw, gh);
  invalidateHUD();
}

window.addEventListener("resize", resizeCanvases);
window.addEventListener("cc-quality-change", resizeCanvases);
resizeCanvases();

function showGameCanvases() {
  titleScreen.classList.add("hidden");
  modeSelect.classList.add("hidden");
  gameCanvas.style.display = "block";
  hudCanvas.style.display = "block";
}

function updateContinueButtons() {
  const saves = game.getSaveInfo();
  const campaign = saves.find((s) => s.mode === "campaign");
  const arena = saves.find((s) => s.mode === "arena");
  if (campaign) {
    btnContinueCampaign.classList.remove("hidden");
    continueCampaignDesc.textContent = `Level ${campaign.level} (${campaign.score} pts)`;
  } else {
    btnContinueCampaign.classList.add("hidden");
  }
  if (arena) {
    btnContinueArena.classList.remove("hidden");
    continueArenaDesc.textContent = `Round ${arena.round} (${arena.score} pts)`;
  } else {
    btnContinueArena.classList.add("hidden");
  }
}

function enterModeSelect() {
  titleScreen.classList.add("hidden");
  modeSelect.classList.remove("hidden");
  updateContinueButtons();
  game.state = GameState.MODE_SELECT;
  window.dispatchEvent(new Event("cc:first-interaction"));
  requestAnimationFrame(() => document.getElementById("btnCampaign")?.focus());
}

function initAudio() {
  game.audio.init();
  game.audio.resume();
  game.applyAudioSettings();
}

document.getElementById("btnArena").addEventListener("click", () => {
  initAudio();
  game.audio.menuConfirm();
  showGameCanvases();
  trackEvent("mode_start", { mode: "arena" });
  game.startArena();
});

// Plays the comic-book flipbook intro on every new campaign (Esc skips it),
// then runs cb. It used to play once per browser, so returning players never
// saw it again. The seen flag is still written: campaign-manager checks it to
// avoid replaying the flipbook a second time when the campaign itself starts.
async function playIntroFlipbookThen(cb) {
  const FLIPBOOK_KEY = "cc_seen_intro_flipbook";
  showGameCanvases();
  await game.startCutscene("intro_flipbook", () => {
    try { localStorage.setItem(FLIPBOOK_KEY, "1"); } catch (_) {}
    cb();
  });
}

// Every new campaign opens on the agent customizer, pre-filled with the saved
// agent, so the name and look the flipbook references ({AGENT}) are confirmed
// first. Returning players deploy with one keypress; saving or backing out both
// continue the campaign. The seen flag is still written on save for anything
// that reads it.
function playCreatorThen(cb) {
  showGameCanvases();
  game.creatorCategory = 0;
  game._creatorSaveCallback = (saved) => {
    if (saved) {
      try { localStorage.setItem("cc_seen_creator_intro", "1"); } catch (_) {}
    }
    cb();
  };
  game.state = GameState.CHARACTER_CREATE;
}

document.getElementById("btnCampaign").addEventListener("click", () => {
  initAudio();
  game.audio.menuConfirm();
  showGameCanvases();
  trackEvent("mode_start", { mode: "campaign" });
  // Order: Creator → Flipbook → Prologue prompt (locker room or skip) → Level 1
  playCreatorThen(() => {
    // Every new campaign offers the locker-room prologue (default choice) so
    // the station training and its narrative stay reachable after the first run.
    playIntroFlipbookThen(() => game.showCampaignPrompt());
  });
});

document.getElementById("btnTutorial").addEventListener("click", () => {
  initAudio();
  game.audio.menuConfirm();
  showGameCanvases();
  trackEvent("mode_start", { mode: "tutorial" });
  game.startTutorial();
});

/** The Forge needs WebGL2; say so on the button rather than open a blank canvas. */
function markForgeUnavailable() {
  const btn = document.getElementById("btnBuilder");
  if (!btn) return;
  btn.classList.add("mode-btn-disabled");
  btn.setAttribute("aria-disabled", "true");
  const desc = btn.querySelector(".mode-desc");
  if (desc) desc.textContent = "Unavailable — the Forge needs WebGL2 on this device.";
}

document.getElementById("btnBuilder").addEventListener("click", async () => {
  initAudio();
  if (game.voxelUnavailable) {
    markForgeUnavailable();
    return;
  }
  game.audio.menuConfirm();
  showGameCanvases();
  trackEvent("mode_start", { mode: "builder" });
  await game.startBuilder();
  if (game.voxelUnavailable) {
    markForgeUnavailable();
    titleScreen.classList.add("hidden");
    modeSelect.classList.remove("hidden");
    gameCanvas.style.display = "none";
    hudCanvas.style.display = "none";
  }
});

document.getElementById("btnMeltdown").addEventListener("click", () => {
  initAudio();
  game.audio.menuConfirm();
  showGameCanvases();
  trackEvent("mode_start", { mode: "meltdown" });
  game.startMeltdown();
});

document.getElementById("btnCustomize").addEventListener("click", () => {
  initAudio();
  game.audio.menuConfirm();
  showGameCanvases();
  trackEvent("mode_start", { mode: "creator" });
  game.creatorReturnState = GameState.MODE_SELECT;
  game.state = GameState.CHARACTER_CREATE;
});

document.getElementById("btnStats").addEventListener("click", () => {
  initAudio();
  game.audio.menuConfirm();
  showGameCanvases();
  game.state = GameState.STATS;
  game._statsReturnToMenu = true;
});

document.getElementById("btnArchive").addEventListener("click", () => {
  initAudio();
  game.audio.menuConfirm();
  showGameCanvases();
  game.archiveTab = 0;
  game.archiveSelection = 0;
  game.archiveScroll = 0;
  game.state = GameState.ARCHIVE;
  game._archiveReturnToMenu = true;
});

// Settings used to be reachable only by starting a match and pausing.
document.getElementById("btnSettings").addEventListener("click", () => {
  initAudio();
  game.audio.menuConfirm();
  showGameCanvases();
  game.settingsSelection = 0;
  game.settingsScroll = 0;
  game.state = GameState.SETTINGS;
  game._settingsReturnToMenu = true;
});

// Expose dev flag toggle on window for console access
window.ccDevTutorial = (on) => {
  game.setAlwaysTutorial(on !== false);
  console.log(
    `[CC DEV] Always-show-tutorial: ${game.alwaysShowTutorial ? "ON" : "OFF"}`,
  );
};

document.getElementById("btnBack").addEventListener("click", () => {
  game.audio.menuSelect();
  modeSelect.classList.add("hidden");
  titleScreen.classList.remove("hidden");
  game.state = GameState.TITLE;
});

// Fullscreen toggle (with iOS webkit prefix fallback)
const btnFullscreen = document.getElementById("btnFullscreen");
const canFullscreen =
  typeof document.documentElement.requestFullscreen === "function" ||
  typeof document.documentElement.webkitRequestFullscreen === "function";
const isStandalone =
  window.navigator.standalone === true ||
  window.matchMedia("(display-mode: standalone)").matches;
if (btnFullscreen) {
  if (!canFullscreen) {
    // Fullscreen API not supported (e.g. iPhone Safari/Brave).
    // Show "Add to Home Screen" hint or hide button.
    if (isStandalone) {
      btnFullscreen.style.display = "none"; // Already fullscreen via home screen
    } else if (
      primaryTouch &&
      /iP(hone|ad|od)/.test(navigator.userAgent)
    ) {
      // iOS device without Fullscreen API — offer PWA install via home screen
      const ua = navigator.userAgent;
      const isSafari =
        /Safari/.test(ua) &&
        !/CriOS|FxiOS|OPiOS|EdgiOS|DuckDuckGo|brave/i.test(ua) &&
        /Apple/.test(navigator.vendor);
      if (isSafari) {
        btnFullscreen.textContent = "📲 ADD TO HOME SCREEN";
        btnFullscreen.setAttribute("aria-label", "Add to Home Screen");
        btnFullscreen.title =
          "Tap Share → Add to Home Screen for fullscreen mode";
        btnFullscreen.addEventListener("click", () => {
          alert(
            "To play fullscreen on this device:\n\n" +
              "1. Tap the Share button (↑) in Safari\n" +
              '2. Select "Add to Home Screen"\n' +
              "3. Open Clockwork Carnage from your home screen\n\n" +
              "The game will run in fullscreen mode!",
          );
        });
      } else {
        btnFullscreen.textContent = "📲 OPEN IN SAFARI";
        btnFullscreen.setAttribute(
          "aria-label",
          "Open in Safari to add to Home Screen",
        );
        btnFullscreen.title = "Open in Safari to add as home screen app";
        btnFullscreen.addEventListener("click", () => {
          alert(
            "To play fullscreen on this device:\n\n" +
              "1. Open this page in Safari\n" +
              "2. Tap the Share button (↑)\n" +
              '3. Select "Add to Home Screen"\n' +
              "4. Open Clockwork Carnage from your home screen\n\n" +
              "Note: Only Safari supports home screen apps on iOS.",
          );
        });
      }
    } else {
      btnFullscreen.style.display = "none"; // Non-iOS or desktop without API — hide
    }
  } else {
    if (isStandalone) {
      btnFullscreen.style.display = "none"; // Already standalone
    } else {
      btnFullscreen.addEventListener("click", async () => {
        try {
          const el =
            document.fullscreenElement || document.webkitFullscreenElement;
          if (el) {
            const exitFn =
              document.exitFullscreen || document.webkitExitFullscreen;
            if (exitFn) {
              await exitFn.call(document);
            }
          } else {
            const root = document.documentElement;
            const reqFn =
              root.requestFullscreen || root.webkitRequestFullscreen;
            if (reqFn) {
              await reqFn.call(root);
            }
          }
        } catch (_) {}
      });
      const updateFSLabel = () => {
        btnFullscreen.textContent =
          document.fullscreenElement || document.webkitFullscreenElement
            ? "⛶ EXIT FULLSCREEN"
            : "⛶ FULLSCREEN";
      };
      document.addEventListener("fullscreenchange", updateFSLabel);
      document.addEventListener("webkitfullscreenchange", updateFSLabel);
      updateFSLabel();
    }
  }
}

btnContinueCampaign.addEventListener("click", () => {
  initAudio();
  game.audio.menuConfirm();
  if (game.loadCampaignSave()) {
    showGameCanvases();
  } else {
    updateContinueButtons();
  }
});

btnContinueArena.addEventListener("click", () => {
  initAudio();
  game.audio.menuConfirm();
  if (game.loadArena()) {
    showGameCanvases();
  } else {
    updateContinueButtons();
  }
});

titleScreen.addEventListener("click", () => {
  initAudio();
  game.audio.menuConfirm();
  enterModeSelect();
});

document.addEventListener("keydown", (e) => {
  if (
    game.state === GameState.TITLE &&
    (e.code === "Enter" || e.code === "Space" || e.code === "GamepadStart")
  ) {
    initAudio();
    game.audio.menuConfirm();
    enterModeSelect();
    return;
  }
  if (game.state === GameState.MODE_SELECT) {
    if (e.code === "Digit1") {
      document.getElementById("btnCampaign").click();
    } else if (e.code === "Digit2") {
      document.getElementById("btnMeltdown").click();
    } else if (e.code === "Digit3") {
      document.getElementById("btnArena").click();
    } else if (e.code === "Digit4") {
      document.getElementById("btnTutorial").click();
    } else if (e.code === "Digit5") {
      document.getElementById("btnBuilder").click();
    } else if (e.code === "Digit6") {
      document.getElementById("btnCustomize").click();
    } else if (e.code === "Digit7") {
      document.getElementById("btnStats").click();
    } else if (e.code === "Digit8") {
      document.getElementById("btnArchive").click();
    } else if (e.code === "Digit9") {
      document.getElementById("btnSettings").click();
    } else if (e.code === "Escape") {
      document.getElementById("btnBack").click();
    } else if (
      e.code === "ArrowUp" ||
      e.code === "ArrowDown" ||
      e.code === "KeyW" ||
      e.code === "KeyS"
    ) {
      const btns = Array.from(
        modeSelect.querySelectorAll(".mode-btn:not(.hidden)"),
      );
      if (btns.length === 0) return;
      const idx = btns.indexOf(document.activeElement);
      const dir = e.code === "ArrowUp" || e.code === "KeyW" ? -1 : 1;

      // When no button is focused, start at first (down) or last (up)
      // Otherwise cycle through the list
      let next;
      if (idx === -1) {
        next = dir === 1 ? 0 : btns.length - 1;
      } else {
        next = (idx + dir + btns.length) % btns.length;
      }
      btns[next].focus();
      game.audio.menuSelect();
    } else if (e.code === "Enter" || e.code === "Space") {
      const focused = document.activeElement;
      if (focused && focused.classList.contains("mode-btn")) {
        focused.click();
      }
    }
  }
  if (
    (game.state === GameState.GAME_OVER || game.state === GameState.VICTORY) &&
    (e.code === "Enter" || e.code === "Space")
  ) {
    titleScreen.classList.remove("hidden");
    modeSelect.classList.add("hidden");
  }
});

let prevState = null;
let _errCount = 0;
let _loopRecoveries = 0;
let _lastQualityTimestamp = 0;
const pacer = new FramePacer();

// rAF stops while the tab is hidden. Drop the timing history on the way back in
// so the first frame is neither skipped by the pacer nor read as a stall.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    pacer.reset();
    _lastQualityTimestamp = 0;
  }
});

function gameLoop(timestamp) {
  try {
    const updateStart = devToolsEnabled || game.showFPS ? performance.now() : 0;
    game.update(timestamp);
    const cap = frameCapFor(game.settings);
    if (!pacer.shouldRender(timestamp, cap)) {
      _errCount = 0;
      requestAnimationFrame(gameLoop);
      return;
    }

    const updateMs = updateStart ? performance.now() - updateStart : game.deltaTime * 1000;

    if (game.state !== prevState) {
      prevState = game.state;
      if (game.state === GameState.TITLE) {
        titleScreen.classList.remove("hidden");
        modeSelect.classList.add("hidden");
        gameCanvas.style.display = "none";
        hudCanvas.style.display = "none";
      } else if (game.state === GameState.MODE_SELECT) {
        titleScreen.classList.add("hidden");
        modeSelect.classList.remove("hidden");
        updateContinueButtons();
        gameCanvas.style.display = "none";
        hudCanvas.style.display = "none";
      } else {
        titleScreen.classList.add("hidden");
        modeSelect.classList.add("hidden");
        gameCanvas.style.display = "block";
        hudCanvas.style.display = "block";
      }
    }

    let renderMs = 0;
    if (game.state !== GameState.TITLE && game.state !== GameState.MODE_SELECT) {
      const _tRnd0 = devToolsEnabled || game.showFPS ? performance.now() : 0;
      game.render();
      renderMs = _tRnd0 ? performance.now() - _tRnd0 : 0;

      // Draw fade transition overlay on top of everything
      if (game.transitioning && game.transitionAlpha > 0) {
        const hctx = game.hudCtx;
        game._renderTransitionOverlay(hctx, game.hudW, game.hudH);
        // Also cover the game canvas for cutscene / builder screens
        const gctx = game.renderer.ctx;
        game._renderTransitionOverlay(gctx, gameCanvas.width, gameCanvas.height);
      }
    }

    if (devToolsEnabled || game.showFPS) {
      game.profiler.recordFrame(updateMs, renderMs, game.entities.length);
    }

    // Adaptive quality needs per-frame FPS; game.fps is a 1s HUD counter.
    // A frame cap lowers that rate on purpose, so the target moves with the cap
    // — otherwise Battery Saver reads as a slow machine and the render scale
    // spirals down to the floor.
    quality.targetFPS = qualityTargetFPS(cap, pacer.displayHz);
    const frameMs = _lastQualityTimestamp ? timestamp - _lastQualityTimestamp : 1000 / 60;
    _lastQualityTimestamp = timestamp;
    quality.recordFPS(1000 / Math.max(frameMs, 1));
    if (quality.adjust(timestamp)) {
      game.applyPerformanceSettings();
      const s = quality.renderScale;
      quality.stableScale = s;
      resizeCanvases();
    }

    // Draw profiler overlay when showFPS is active
    if (game.showFPS) {
      const ctx = game.hudCtx;
      const pw = 220;
      const ph = 280;
      game.profiler.render(ctx, 4, 4, pw, ph);
    }

    // Render touch controls overlay (merged into main rAF)
    if (touch) touch.render();

    // Clear error counter on successful frame
    _errCount = 0;
  } catch (err) {
    _errCount++;
    // One line per burst, not one per frame — 60 identical traces a second
    // buries whatever threw first.
    if (_errCount === 1) console.error("[Clockwork Carnage] Frame error:", err);
    // A second of solid failures means the current screen cannot draw itself.
    // Bail out to the menu rather than killing the loop: a frozen canvas with a
    // live pointer lock is unrecoverable for the player.
    if (_errCount >= 60) {
      _errCount = 0;
      _loopRecoveries++;
      if (_loopRecoveries > 3) {
        console.error("[Clockwork Carnage] Frame errors persist after recovery, halting game loop.");
        return;
      }
      console.error(
        `[Clockwork Carnage] Recovering from persistent frame errors (attempt ${_loopRecoveries}) — returning to the menu.`,
      );
      try {
        document.exitPointerLock?.();
        game.state = GameState.MODE_SELECT;
        pacer.reset();
      } catch (recoveryErr) {
        console.error("[Clockwork Carnage] Recovery failed:", recoveryErr);
      }
    }
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

// Auto-save on tab close / navigate away
window.addEventListener("beforeunload", () => {
  if (game.state === GameState.PLAYING && game.mode === "arena")
    game.saveArena();
  if (game.state === GameState.PLAYING && game.mode === "campaign")
    game.saveCampaign();
});
window.__ccBeforeUnloadRegistered = true;

// Expose profiler snapshot for test harness / telemetry
window.ccProfiler = () => game.profiler.getSnapshot();

if (devToolsEnabled) {
  // Expose test runner on window for console access.
  const testingRoot = `${location.origin}${import.meta.env?.BASE_URL ?? "/"}js/testing/`;
  const debugPath = `${testingRoot}harness.js`;
  const bridgePath = `${testingRoot}debug-bridge.js`;
  const telemetryPath = `${testingRoot}telemetry.js`;

  import(/* @vite-ignore */ debugPath)
    .then((mod) => {
      window.ccTest = mod.createTestRunner(game);
    })
    .catch(() => {
      /* harness not available — skip */
    });

  // Expose debug bridge for Playwright / external automation.
  import(/* @vite-ignore */ bridgePath)
    .then((mod) => {
      window.ccDebug = mod.createDebugBridge(game);
    })
    .catch(() => {
      /* debug bridge not available — skip */
    });

  // Expose telemetry collector for session data capture.
  import(/* @vite-ignore */ telemetryPath)
    .then((mod) => {
      window._ccTelemetryModule = mod;
      window.ccTelemetry = mod.createTelemetry(game);
    })
    .catch(() => {
      /* telemetry not available — skip */
    });
}

// Mobile touch controls — auto-activates on touch devices
const touch = TouchControls.init(game);
if (touch) game.touchControls = touch;
