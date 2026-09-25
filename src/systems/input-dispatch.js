// Input dispatch — extracted from game.js handleKeyPress.
// Pure function: receives `game` instance + key code + event, mutates game state.
// No new logic; 1:1 extraction of the original state-machine dispatch.
//
// Callers: game._inputKeyDown() → game.handleKeyPress() → dispatchKeyPress(game, code, e).

import { GameState } from "../types.js";
import { TUTORIAL_SANDBOX_STEP } from "../constants.js";
import { isModernArt } from "../rendering/art-style.js";
import { gameUnlockContext, isUnlocked } from "./unlocks.js";
import { UPGRADES } from "../data/upgrades.js";
import { CREATOR_CATEGORIES, setCreatorCategory } from "../ui/character-creator.js";
import { getIndex, withIndex, togglePlacement } from "../core/character-fields.js";
import { archiveLayout, archiveEntries } from "../ui/archive-screen.js";
import { directorInput } from "../cinematic/director.js";

export function dispatchKeyPress(game, code, e) {
  // Nested Spaghetti 😂🤦‍♂️
  // TODO: Abstract into StateManager

  // A reel takes every key as its skip (the lore video's as a hold). It must
  // not also reach main.js's title/menu listener: a skip back to the menu
  // would take the same Space or Enter as a click on the focused mode.
  if (game.state === GameState.CINEMATIC) {
    directorInput(game, "key", { down: true, code });
    if (e?.stopImmediatePropagation) swallowKey(e);
    return;
  }

  // TITLE and MODE_SELECT input is handled exclusively by main.js
  // (which owns the DOM elements for those screens)
  if (game.state === GameState.TITLE || game.state === GameState.MODE_SELECT) {
    return;
  }

  if (game.state === GameState.BUILDER) {
    // Only Escape is handled by the host (for pause)
    if (code === "Escape") {
      const now = performance.now();
      if (now - game.lastEscTime < 200) return;
      game.lastEscTime = now;
      game.pauseGame(GameState.BUILDER);
    }
    return;
  }

  // Campaign prompt (with/without tutorial)
  if (game.state === GameState.CAMPAIGN_PROMPT) {
    const menuLen = 2;
    if (code === "ArrowUp" || code === "KeyW") {
      game.campaignPromptSelection =
        (game.campaignPromptSelection - 1 + menuLen) % menuLen;
      game.audio.menuSelect();
      return;
    }
    if (code === "ArrowDown" || code === "KeyS") {
      game.campaignPromptSelection =
        (game.campaignPromptSelection + 1) % menuLen;
      game.audio.menuSelect();
      return;
    }
    if (code === "Enter" || code === "Space") {
      game.audio.menuConfirm();
      game.executeCampaignPromptChoice(game.campaignPromptSelection);
      return;
    }
    if (code === "Digit1") {
      game.audio.menuConfirm();
      game.executeCampaignPromptChoice(0);
      return;
    }
    if (code === "Digit2") {
      game.audio.menuConfirm();
      game.executeCampaignPromptChoice(1);
      return;
    }
    if (code === "Escape") {
      game.audio.menuConfirm();
      game.state = GameState.MODE_SELECT;
      return;
    }
    return;
  }

  // Tutorial completion — standalone full-screen menu
  if (game.state === GameState.TUTORIAL_COMPLETE) {
    const menuLen = 4;
    if (code === "ArrowUp" || code === "KeyW") {
      game.tutorialMenuSelection =
        (game.tutorialMenuSelection - 1 + menuLen) % menuLen;
      game.audio.menuSelect();
      return;
    }
    if (code === "ArrowDown" || code === "KeyS") {
      game.tutorialMenuSelection = (game.tutorialMenuSelection + 1) % menuLen;
      game.audio.menuSelect();
      return;
    }
    if (code === "Enter" || code === "Space") {
      game.audio.menuConfirm();
      game.executeTutorialCompletionChoice(game.tutorialMenuSelection);
      return;
    }
    if (code === "Digit1") {
      game.audio.menuConfirm();
      game.executeTutorialCompletionChoice(0);
      return;
    }
    if (code === "Digit2") {
      game.audio.menuConfirm();
      game.executeTutorialCompletionChoice(1);
      return;
    }
    if (code === "Digit3") {
      game.audio.menuConfirm();
      game.executeTutorialCompletionChoice(2);
      return;
    }
    if (code === "Escape") {
      game.audio.menuConfirm();
      game.executeTutorialCompletionChoice(3);
      return;
    }
    return;
  }

  // Character creator — full-screen customization
  if (game.state === GameState.CHARACTER_CREATE) {
    // Modern mode: the showroom overlay owns every key while it is open.
    if (isModernArt() && game.showroom?.isOpen) {
      game.showroom.handleKey(code, e);
      return;
    }
    const catLen = CREATOR_CATEGORIES.length;

    // NAME tab (0) — typed text input
    if (game.creatorCategory === 0) {
      // Confirm / Cancel still work
      if (code === "Enter" || code === "Space") {
        game.audio.menuConfirm();
        game._exitCreator(true);
        return;
      }
      if (code === "Escape") {
        const now = performance.now();
        if (now - game.lastEscTime < 200) return;
        game.lastEscTime = now;
        game._creatorExitTime = now;
        game.audio.menuConfirm();
        game._exitCreator(false);
        return;
      }
      // Tab / Arrow to switch category
      if (code === "Tab") {
        const dir = game.keys["ShiftLeft"] || game.keys["ShiftRight"] ? -1 : 1;
        setCreatorCategory(game, (game.creatorCategory + dir + catLen) % catLen);
        game.audio.menuSelect();
        return;
      }
      if (code === "ArrowRight") {
        setCreatorCategory(game, (game.creatorCategory + 1) % catLen);
        game.audio.menuSelect();
        return;
      }
      if (code === "ArrowLeft") {
        setCreatorCategory(game, (game.creatorCategory - 1 + catLen) % catLen);
        game.audio.menuSelect();
        return;
      }
      // Backspace deletes last char
      if (code === "Backspace") {
        if (game.character.name.length > 0) {
          game.character.name = game.character.name.slice(0, -1);
        }
        return;
      }
      // Typed letter/number — append to name (max 16 chars)
      if (e?.key && e.key.length === 1 && game.character.name.length < 16) {
        game.character.name += e.key;
      }
      return;
    }

    const curCat = CREATOR_CATEGORIES[game.creatorCategory];
    const itemLen = curCat.data.length;

    // Switch category
    if (code === "Tab") {
      // Shift+Tab → previous category
      const dir = game.keys["ShiftLeft"] || game.keys["ShiftRight"] ? -1 : 1;
      setCreatorCategory(game, (game.creatorCategory + dir + catLen) % catLen);
      game.audio.menuSelect();
      return;
    }
    if (code === "ArrowRight" || code === "KeyD") {
      setCreatorCategory(game, (game.creatorCategory + 1) % catLen);
      game.audio.menuSelect();
      return;
    }
    if (code === "ArrowLeft" || code === "KeyA") {
      setCreatorCategory(game, (game.creatorCategory - 1 + catLen) % catLen);
      game.audio.menuSelect();
      return;
    }

    // Navigate items within category. Badge and gear fields are nested, so the
    // index is read and written through character-fields rather than off the
    // character directly.
    const step = code === "ArrowUp" || code === "KeyW" ? -1 : code === "ArrowDown" || code === "KeyS" ? 1 : 0;
    if (step) {
      if (curCat.multi) {
        // PLACE moves a row cursor; SPACE below does the actual toggling.
        game.creatorPlacementSel = ((game.creatorPlacementSel | 0) + step + itemLen) % itemLen;
        game.audio.menuSelect();
        return;
      }
      let next = (getIndex(game.character, curCat.key) + step + itemLen) % itemLen;
      // Skip options that are still locked (classes, tiered gear).
      const unlockCtx = gameUnlockContext(game);
      for (let tries = 0; tries < itemLen; tries++) {
        if (isUnlocked(curCat.key, next, unlockCtx)) break;
        next = (next + step + itemLen) % itemLen;
      }
      Object.assign(game.character, withIndex(game.character, curCat.key, next));
      game.audio.menuSelect();
      return;
    }

    // Wear / remove the highlighted placement (PLACE tab only).
    if (code === "Space" && curCat.multi) {
      const placement = curCat.data[(game.creatorPlacementSel | 0) % itemLen];
      Object.assign(game.character, togglePlacement(game.character, placement.id));
      game.audio.menuSelect();
      return;
    }

    // Confirm — save and return
    if (code === "Enter" || code === "Space") {
      game.audio.menuConfirm();
      game._exitCreator(true);
      return;
    }

    // Cancel — discard and return
    if (code === "Escape") {
      const now = performance.now();
      if (now - game.lastEscTime < 200) return;
      game.lastEscTime = now;
      game._creatorExitTime = now;
      game.audio.menuConfirm();
      game._exitCreator(false);
      return;
    }
    return;
  }

  if (game.state === GameState.PLAYING) {
    // Tutorial sandbox — ESC/Q returns to title, C starts campaign
    if (game.mode === "tutorial" && game.tutorialStep === TUTORIAL_SANDBOX_STEP) {
      if (code === "Escape" || code === "KeyQ") {
        game.audio.menuConfirm();
        game.executeTutorialMenuChoice(3); // Main menu
        return;
      }
      if (code === "KeyC") {
        game.audio.menuConfirm();
        game.executeTutorialCompletionChoice(1); // Begin Campaign
        return;
      }
    }

    // Tutorial (non-sandbox steps): ESC pauses (same as normal gameplay)
    if (game.mode === "tutorial" && game.tutorialStep < TUTORIAL_SANDBOX_STEP) {
      if (code === "Escape") {
        const now = performance.now();
        if (now - game.lastEscTime < 200) return;
        game.lastEscTime = now;
        game.pauseGame(GameState.PLAYING);
        return;
      }
    }

    // Meltdown upgrade selection overlay — intercept keys before weapon switching
    if (game._meltdownUpgradeChoices) {
      const choices = game._meltdownUpgradeChoices;
      if (code === "Digit1" && choices.length > 0) {
        game.meltdown.selectUpgrade(0);
        game._meltdownUpgradeChoices = null;
        game.audio.menuConfirm();
        return;
      }
      if (code === "Digit2" && choices.length > 1) {
        game.meltdown.selectUpgrade(1);
        game._meltdownUpgradeChoices = null;
        game.audio.menuConfirm();
        return;
      }
      if (code === "Digit3" && choices.length > 2) {
        game.meltdown.selectUpgrade(2);
        game._meltdownUpgradeChoices = null;
        game.audio.menuConfirm();
        return;
      }
      // Arrow keys + Enter navigation
      if (code === "ArrowLeft" || code === "ArrowUp") {
        game._meltdownUpgradeSel = Math.max(0, game._meltdownUpgradeSel - 1);
        game.audio.menuNav();
        return;
      }
      if (code === "ArrowRight" || code === "ArrowDown") {
        game._meltdownUpgradeSel = Math.min(
          choices.length - 1,
          game._meltdownUpgradeSel + 1,
        );
        game.audio.menuNav();
        return;
      }
      if (code === "Enter" || code === "Space") {
        game.meltdown.selectUpgrade(game._meltdownUpgradeSel);
        game._meltdownUpgradeChoices = null;
        game.audio.menuConfirm();
        return;
      }
      return; // Block all other input while upgrade overlay is shown
    }

    // Weapon switching (slots 1-8)
    const prevWeapon = game.player.currentWeapon;
    const weaponSlots = [
      game.keybinds.weapon1,
      game.keybinds.weapon2,
      game.keybinds.weapon3,
      game.keybinds.weapon4,
      game.keybinds.weapon5,
      game.keybinds.weapon6,
      game.keybinds.weapon7,
      game.keybinds.weapon8,
    ];
    const slotIdx = weaponSlots.indexOf(code);
    if (slotIdx !== -1 && game.player.weapons.length > slotIdx)
      game.player.currentWeapon = slotIdx;
    if (game.player.currentWeapon !== prevWeapon) {
      game.triggerAriaOnce("weaponSwitch", "weaponSwitch");
      if (game.mode === "tutorial") game.tutorialWeaponSwapped = true;
    }

    if (code === game.keybinds.interact) game.interact();
    // Chronos powers on their own keys (spec decision 4: no double-taps).
    if (code === game.keybinds.chronoRewind && !e?.repeat) game.chronoRewind?.();
    if (code === game.keybinds.chronoLock && !e?.repeat) game.chronoLock?.();
    // Meltdown hero ability (Q key)
    if (code === "KeyQ" && game.mode === "meltdown" && game.meltdown.alive) {
      const abilityResult = game.meltdown.useAbility();
      if (abilityResult) {
        if (abilityResult.type === "dash")
          game.meltdown.speed += abilityResult.speedBoost;
        game.audio.menuConfirm();
      }
    }
    if (code === game.keybinds.pause || code === "KeyP") {
      const now = performance.now();
      if (now - game.lastEscTime < 200) return;
      game.lastEscTime = now;
      game.pauseGame(GameState.PLAYING);
    }
    if (code === game.keybinds.toggleFPS) {
      game.showFPS = !game.showFPS;
      game.settings.showPerformanceOverlay = game.showFPS;
      game.saveSettings();
    }
    return;
  }

  if (game.state === GameState.PAUSED) {
    // A key answers the pad's quit prompt with "no" (Q still quits).
    game.pauseQuitConfirm = false;
    if (code === "Escape" || code === "Enter" || code === "KeyP") {
      const now = performance.now();
      if (now - game.lastEscTime < 200) return;
      game.lastEscTime = now;
      game.showAriaLog = false;
      game.resumeGame();
      game.triggerAriaOnce("pauseResume", "pauseResume");
    }
    if (code === "KeyQ") {
      if (game.mode === "playtest") {
        game.exitBuilderPlayTest();
        return;
      }
      if (game.builder && game.pausedFromState === GameState.BUILDER) {
        game.builder.saveMap();
        game.builder.stop();
      }
      if (game.pausedFromState === GameState.BUILDER) {
        game.mode = null;
        game.world = null;
        game.exitEntity = null;
        game.entities = [];
        game.projectiles = [];
      }
      game.state = GameState.TITLE;
      game.audio.stopMusic();
      game.audio.startTrack("menu");
      game.audio.startAmbient("menu");
    }
    if (code === "KeyS" || code === "Tab") {
      game.openSettings({ returnTo: "pause" });
    }
    if (code === "KeyC") {
      game.openSettings({ returnTo: "pause", section: "controls" });
    }
    if (code === "KeyA") {
      game.achievementsScroll = 0;
      game.state = GameState.ACHIEVEMENTS;
    }
    if (code === "KeyT") {
      game.state = GameState.STATS;
    }
    if (code === "KeyB") {
      game.archiveTab = 0;
      game.archiveSelection = 0;
      game.archiveScroll = 0;
      game.state = GameState.ARCHIVE;
    }
    if (code === "KeyL") {
      game.showAriaLog = !game.showAriaLog;
      game.ariaLogScroll = 0;
    }
    // Scroll ARIA log with W/S
    if (game.showAriaLog) {
      if (code === "KeyW" || code === "ArrowUp") {
        game.ariaLogScroll = Math.min(
          game.ariaLogScroll + 1,
          Math.max(0, game.ariaMessageLog.length - 5),
        );
      }
      if (code === "KeyS" || code === "ArrowDown") {
        game.ariaLogScroll = Math.max(0, game.ariaLogScroll - 1);
      }
    }
    if (code === "KeyF" && game.mode === "campaign") {
      game.saveCampaign();
      game.pauseSaveFlash = performance.now();
    }
    return;
  }

  if (game.state === GameState.SETTINGS) {
    // The settings deck owns every key while it is open.
    if (game.settingsDeck?.isOpen) {
      game.settingsDeck.handleKey(code, e);
      return;
    }
    // The deck is still loading (or failed to). Back (Esc, pad B / Start)
    // closes through the deck's own path so the opener comes back exactly.
    if (code === "Escape") {
      const now = performance.now();
      if (now - game.lastEscTime < 200) return;
      game.lastEscTime = now;
      game.onSettingsDeckClose(game._settingsReturnTo ?? "pause");
    }
    return;
  }

  if (game.state === GameState.ACHIEVEMENTS) {
    if (code === "Escape" || code === "KeyA") {
      const now = performance.now();
      if (now - game.lastEscTime < 200) return;
      game.lastEscTime = now;
      game.state = GameState.PAUSED;
    }
    if (code === "ArrowUp" || code === "KeyW") {
      game.achievementsScroll = Math.max(
        0,
        (game.achievementsScroll || 0) - 1,
      );
    }
    if (code === "ArrowDown" || code === "KeyS") {
      game.achievementsScroll = (game.achievementsScroll || 0) + 1;
    }
    return;
  }

  if (game.state === GameState.ARCHIVE) {
    if (code === "Escape" || code === "KeyB") {
      const now = performance.now();
      if (now - game.lastEscTime < 200) return;
      game.lastEscTime = now;
      game.state = game._archiveReturnToMenu
        ? GameState.MODE_SELECT
        : GameState.PAUSED;
      game._archiveReturnToMenu = false;
      return;
    }
    const L = archiveLayout(game.hudW, game.hudH);
    const entries = archiveEntries(game.archiveTab || 0, game.archive);
    if (code === "KeyA" || code === "ArrowLeft") {
      game.archiveTab = (game.archiveTab || 0) === 0 ? 1 : 0;
      game.archiveSelection = 0;
      game.archiveScroll = 0;
    }
    if (code === "KeyD" || code === "ArrowRight") {
      game.archiveTab = (game.archiveTab || 0) === 1 ? 0 : 1;
      game.archiveSelection = 0;
      game.archiveScroll = 0;
    }
    if (code === "KeyW" || code === "ArrowUp") {
      game.archiveSelection = Math.max(0, (game.archiveSelection || 0) - 1);
    }
    if (code === "KeyS" || code === "ArrowDown") {
      game.archiveSelection = Math.min(
        entries.length - 1,
        (game.archiveSelection || 0) + 1,
      );
    }
    // Keep the selection inside the visible window.
    const sel = game.archiveSelection || 0;
    let scroll = game.archiveScroll || 0;
    if (sel < scroll) scroll = sel;
    if (sel >= scroll + L.visibleRows) scroll = sel - L.visibleRows + 1;
    game.archiveScroll = Math.max(
      0,
      Math.min(scroll, Math.max(0, entries.length - L.visibleRows)),
    );
    return;
  }

  if (game.state === GameState.STATS) {
    if (code === "Escape") {
      const now = performance.now();
      if (now - game.lastEscTime < 200) return;
      game.lastEscTime = now;
      if (game._statsReturnToMenu) {
        game._statsReturnToMenu = false;
        game.state = GameState.MODE_SELECT;
      } else {
        game.state = GameState.PAUSED;
      }
    }
    return;
  }

  if (game.state === GameState.UPGRADE) {
    const upgradeKeys = Object.keys(UPGRADES);
    const cols = 2;
    const totalRows = Math.ceil(upgradeKeys.length / cols);
    const curIdx = game.upgradeSelection;
    const isOnContinue = curIdx === upgradeKeys.length;

    if (code === "ArrowUp" || code === "KeyW") {
      if (isOnContinue) {
        // Move from continue to last row, keep in left column
        game.upgradeSelection = (totalRows - 1) * cols;
      } else {
        const col = curIdx % cols;
        const row = Math.floor(curIdx / cols);
        if (row > 0) {
          game.upgradeSelection = (row - 1) * cols + col;
        } else {
          // Wrap to continue button
          game.upgradeSelection = upgradeKeys.length;
        }
      }
      game.audio.menuSelect();
    }
    if (code === "ArrowDown" || code === "KeyS") {
      if (isOnContinue) {
        // Wrap to first row left column
        game.upgradeSelection = 0;
      } else {
        const col = curIdx % cols;
        const row = Math.floor(curIdx / cols);
        if (
          row < totalRows - 1 &&
          (row + 1) * cols + col < upgradeKeys.length
        ) {
          game.upgradeSelection = (row + 1) * cols + col;
        } else {
          // Go to continue button
          game.upgradeSelection = upgradeKeys.length;
        }
      }
      game.audio.menuSelect();
    }
    if (code === "ArrowLeft" || code === "KeyA") {
      if (!isOnContinue) {
        const col = curIdx % cols;
        if (col > 0) {
          game.upgradeSelection = curIdx - 1;
          game.audio.menuSelect();
        }
      }
    }
    if (code === "ArrowRight" || code === "KeyD") {
      if (!isOnContinue) {
        const col = curIdx % cols;
        if (col < cols - 1 && curIdx + 1 < upgradeKeys.length) {
          game.upgradeSelection = curIdx + 1;
          game.audio.menuSelect();
        }
      }
    }
    if (code === "Enter" || code === "Space") {
      if (game.upgradeSelection === upgradeKeys.length) {
        // Continue button
        game.audio.menuConfirm();
        game.startArenaRound();
      } else {
        game.buyUpgrade(upgradeKeys[game.upgradeSelection]);
      }
    }
    return;
  }

  if (
    game.state === GameState.GAME_OVER ||
    game.state === GameState.VICTORY
  ) {
    // NG+ prompt handling on victory screen
    if (game.state === GameState.VICTORY && game.ngPlusPrompt) {
      if (code === "ArrowLeft" || code === "ArrowUp") {
        game.ngPlusPromptSel = 0;
        game.audio.menuNav();
      } else if (code === "ArrowRight" || code === "ArrowDown") {
        game.ngPlusPromptSel = 1;
        game.audio.menuNav();
      } else if (code === "Enter" || code === "Space") {
        if (game.transitioning) return;
        game.audio.menuConfirm();
        if (game.ngPlusPromptSel === 0) {
          game.fadeTransition(() => game.startNgPlus());
        } else {
          game.fadeTransition(() => {
            game.ngPlusPrompt = false;
            game.clearCampaignSave();
            game.state = GameState.TITLE;
            game.audio.stopMusic();
            game.audio.startTrack("menu");
            game.audio.startAmbient("menu");
          });
        }
      }
      if (code === "KeyS") {
        game._shareCurrentResult();
      }
      return;
    }
    if (code === "Enter" || code === "Space") {
      if (game.transitioning) return;
      game.audio.menuConfirm();
      game.fadeTransition(() => {
        game.state = GameState.TITLE;
        game.audio.stopMusic();
        game.audio.startTrack("menu");
        game.audio.startAmbient("menu");
      });
    }
    if (code === "KeyR" && game.state === GameState.GAME_OVER) {
      if (game.transitioning) return;
      game.audio.menuConfirm();
      game.fadeTransition(() => {
        if (game.mode === "arena") game.startArena();
        else if (game.mode === "meltdown") game.startMeltdown();
        else if (game.mode === "campaign") game.startCampaign();
      });
    }
    if (code === "KeyS") {
      game._shareCurrentResult();
    }
    return;
  }

  if (game.state === GameState.LEVEL_COMPLETE) {
    if (code === "Enter" || code === "Space") {
      if (game.transitioning) return;
      game.audio.menuConfirm();
      game.fadeTransition(() => game.nextCampaignLevel());
    }
    return;
  }

  if (game.state === GameState.CUTSCENE) {
    // Ignore key repeat: holding Space to skip must not riffle through pages.
    if ((code === "Enter" || code === "Space") && !e?.repeat) {
      game.advanceCutsceneFrame();
    }
    if (code === "KeyT" && !e?.repeat) game.toggleCutsceneAuto();
    if (code === "Escape") {
      const now = performance.now();
      if (now - game.lastEscTime < 200) return;
      game.lastEscTime = now;
      game.endCutscene();
    }
    return;
  }
}

/**
 * Keep a key the reel took from the page: main.js's listener, the focused
 * menu button's Enter (on keydown) and Space (on keyup), once the skip has put
 * the menu back under it. Browser shortcuts keep working.
 */
function swallowKey(e) {
  e.stopImmediatePropagation();
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  e.preventDefault();
  const up = (u) => {
    if (u.code !== e.code) return;
    u.preventDefault();
    window.removeEventListener("keyup", up, true);
  };
  window.addEventListener("keyup", up, true);
}
