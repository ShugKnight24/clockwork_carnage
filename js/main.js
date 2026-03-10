import { Game, GameState, GAME_VERSION } from "./game.js";
import { TouchControls } from "./touch.js";

const gameCanvas = document.getElementById("gameCanvas");
const hudCanvas = document.getElementById("hudCanvas");
const titleScreen = document.getElementById("titleScreen");
const modeSelect = document.getElementById("modeSelect");
const btnContinueCampaign = document.getElementById("btnContinueCampaign");
const continueCampaignDesc = document.getElementById("continueCampaignDesc");
const btnContinueArena = document.getElementById("btnContinueArena");
const continueArenaDesc = document.getElementById("continueArenaDesc");

const game = new Game(gameCanvas, hudCanvas);

// Set version label on title screen
const versionLabel = document.getElementById("versionLabel");
if (versionLabel) versionLabel.textContent = `v${GAME_VERSION}`;

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
  gameCanvas.width = w;
  gameCanvas.height = h;
  hudCanvas.width = w;
  hudCanvas.height = h;
  if (game.renderer) {
    game.renderer.resize(w, h);
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
  game.startArena();
});

document.getElementById("btnCampaign").addEventListener("click", () => {
  initAudio();
  game.audio.menuConfirm();
  showGameCanvases();
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
  game.startTutorial();
});

document.getElementById("btnBuilder").addEventListener("click", () => {
  initAudio();
  game.audio.menuConfirm();
  showGameCanvases();
  game.startBuilder();
});

document.getElementById("btnCustomize").addEventListener("click", () => {
  initAudio();
  game.audio.menuConfirm();
  showGameCanvases();
  game.creatorReturnState = GameState.MODE_SELECT;
  game.state = GameState.CHARACTER_CREATE;
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
  titleScreen.classList.add("hidden");
  modeSelect.classList.remove("hidden");
  updateContinueButtons();
  game.state = GameState.MODE_SELECT;
});

document.addEventListener("keydown", (e) => {
  if (
    game.state === GameState.TITLE &&
    (e.code === "Enter" || e.code === "Space")
  ) {
    initAudio();
    game.audio.menuConfirm();
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
      document.getElementById("btnArena").click();
    } else if (e.code === "Digit3") {
      document.getElementById("btnTutorial").click();
    } else if (e.code === "Digit4") {
      document.getElementById("btnBuilder").click();
    } else if (e.code === "Digit5") {
      document.getElementById("btnCustomize").click();
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

function gameLoop(timestamp) {
  game.update(timestamp);

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

  if (game.state !== GameState.TITLE && game.state !== GameState.MODE_SELECT) {
    game.render();
  }

  // Render touch controls overlay (merged into main rAF)
  if (touch) touch.render();

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
