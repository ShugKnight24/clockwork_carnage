import { Game, GameState } from "./game.js";

const gameCanvas = document.getElementById("gameCanvas");
const hudCanvas = document.getElementById("hudCanvas");
const titleScreen = document.getElementById("titleScreen");
const modeSelect = document.getElementById("modeSelect");
const btnContinueCampaign = document.getElementById("btnContinueCampaign");
const continueCampaignDesc = document.getElementById("continueCampaignDesc");
const btnContinueArena = document.getElementById("btnContinueArena");
const continueArenaDesc = document.getElementById("continueArenaDesc");

const game = new Game(gameCanvas, hudCanvas);

function resizeCanvases() {
  const w = window.innerWidth;
  const h = window.innerHeight;
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
  game.startCampaign();
});

document.getElementById("btnBack").addEventListener("click", () => {
  game.audio.menuSelect();
  modeSelect.classList.add("hidden");
  titleScreen.classList.remove("hidden");
  game.state = GameState.TITLE;
});

btnContinueCampaign.addEventListener("click", () => {
  initAudio();
  game.audio.menuConfirm();
  showGameCanvases();
  game.loadCampaignSave();
});

btnContinueArena.addEventListener("click", () => {
  initAudio();
  game.audio.menuConfirm();
  showGameCanvases();
  game.loadArena();
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
    } else if (e.code === "Escape") {
      document.getElementById("btnBack").click();
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

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
