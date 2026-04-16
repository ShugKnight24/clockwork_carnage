import { Game, GameState, GAME_VERSION } from "./game.js";
import { TouchControls } from "./touch.js";
import { initAnalytics, trackEvent } from "./analytics.js";
import { AdaptiveQuality } from "../src/utils/perf.js";

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

// initialize analytics (will prompt consent if needed)
initAnalytics();

// Set version label on title screen
const versionLabel = document.getElementById("versionLabel");
if (versionLabel) versionLabel.textContent = `v${GAME_VERSION}`;

// Update start prompt for touch devices
if ("ontouchstart" in window) {
  const startPrompt = titleScreen.querySelector(".start-prompt");
  if (startPrompt) startPrompt.textContent = "[ TAP TO START ]";
}

// Track native (CSS) dimensions for adaptive resolution
let nativeW = 0, nativeH = 0;

function resizeCanvases() {
  let w = window.innerWidth;
  let h = window.innerHeight;
  // Cap render resolution on mobile to maintain playable FPS
  if (game.isTouchDevice) {
    const maxDim = 1280;
    if (w > maxDim || h > maxDim) {
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
  }
  nativeW = w;
  nativeH = h;

  // HUD always renders at native res for crisp text
  hudCanvas.width = w;
  hudCanvas.height = h;

  // Game canvas renders at scaled res (adaptive quality)
  const s = quality.renderScale;
  const gw = Math.round(w * s);
  const gh = Math.round(h * s);
  gameCanvas.width = gw;
  gameCanvas.height = gh;
  if (game.renderer) {
    game.renderer.resize(gw, gh);
  }
}

window.addEventListener("resize", resizeCanvases);
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

document.getElementById("btnCampaign").addEventListener("click", () => {
  initAudio();
  game.audio.menuConfirm();
  showGameCanvases();
  trackEvent("mode_start", { mode: "campaign" });
  if (game.shouldShowTutorial()) {
    game.startTutorial();
  } else {
    game.showCampaignPrompt();
  }
});

document.getElementById("btnTutorial").addEventListener("click", () => {
  initAudio();
  game.audio.menuConfirm();
  showGameCanvases();
  trackEvent("mode_start", { mode: "tutorial" });
  game.startTutorial();
});

document.getElementById("btnBuilder").addEventListener("click", () => {
  initAudio();
  game.audio.menuConfirm();
  showGameCanvases();
  trackEvent("mode_start", { mode: "builder" });
  game.startBuilder();
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
      "ontouchstart" in window &&
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
  if (game.shouldShowTutorial()) {
    showGameCanvases();
    trackEvent("mode_start", { mode: "tutorial" });
    game.startTutorial();
  } else {
    titleScreen.classList.add("hidden");
    modeSelect.classList.remove("hidden");
    updateContinueButtons();
    game.state = GameState.MODE_SELECT;
  }
});

document.addEventListener("keydown", (e) => {
  if (
    game.state === GameState.TITLE &&
    (e.code === "Enter" || e.code === "Space")
  ) {
    initAudio();
    game.audio.menuConfirm();
    if (game.shouldShowTutorial()) {
      showGameCanvases();
      trackEvent("mode_start", { mode: "tutorial" });
      game.startTutorial();
      return;
    }
    titleScreen.classList.add("hidden");
    modeSelect.classList.remove("hidden");
    updateContinueButtons();
    game.state = GameState.MODE_SELECT;
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

function gameLoop(timestamp) {
  try {
    const _tUpd0 = performance.now();
    game.update(timestamp);
    const updateMs = performance.now() - _tUpd0;

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
      const _tRnd0 = performance.now();
      game.render();
      renderMs = performance.now() - _tRnd0;

      // Draw fade transition overlay on top of everything
      if (game.transitioning && game.transitionAlpha > 0) {
        const hctx = game.hudCtx;
        const hw = hudCanvas.width;
        const hh = hudCanvas.height;
        game._renderTransitionOverlay(hctx, hw, hh);
        // Also cover the game canvas for cutscene / builder screens
        const gctx = game.renderer.ctx;
        game._renderTransitionOverlay(gctx, gameCanvas.width, gameCanvas.height);
      }
    }

    // Feed profiler
    game.profiler.recordFrame(updateMs, renderMs, game.entities.length);

    // Adaptive quality — feed FPS, adjust render scale
    quality.recordFPS(game.fps);
    if (quality.adjust(timestamp)) {
      const s = quality.renderScale;
      const gw = Math.round(nativeW * s);
      const gh = Math.round(nativeH * s);
      gameCanvas.width = gw;
      gameCanvas.height = gh;
      if (game.renderer) game.renderer.resize(gw, gh);
      // Invalidate cached vignette (it's sized to gameCanvas)
      game._vignetteCanvas = null;
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
    console.error(`[Clockwork Carnage] Frame error (${_errCount}):`, err);
    // If errors persist for 60+ consecutive frames, stop the loop
    if (_errCount >= 60) {
      console.error('[Clockwork Carnage] Too many consecutive errors, halting game loop.');
      return;
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

// Expose test runner on window for console access (dynamic import so
// production works even when js/testing/ is not deployed)
import("./testing/harness.js")
  .then((mod) => {
    window.ccTest = mod.createTestRunner(game);
  })
  .catch(() => {
    /* harness not available — skip */
  });

// Expose debug bridge for Playwright / external automation
import("./testing/debug-bridge.js")
  .then((mod) => {
    window.ccDebug = mod.createDebugBridge(game);
  })
  .catch(() => {
    /* debug bridge not available — skip */
  });

// Expose telemetry collector for session data capture
import("./testing/telemetry.js")
  .then((mod) => {
    window._ccTelemetryModule = mod;
    window.ccTelemetry = mod.createTelemetry(game);
  })
  .catch(() => {
    /* telemetry not available — skip */
  });

// Mobile touch controls — auto-activates on touch devices
const touch = TouchControls.init(game);
if (touch) game.touchControls = touch;
