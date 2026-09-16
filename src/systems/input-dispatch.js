// Input dispatch — extracted from game.js handleKeyPress.
// Pure function: receives `game` instance + key code + event, mutates game state.
// No new logic; 1:1 extraction of the original state-machine dispatch.
//
// Callers: game._inputKeyDown() → game.handleKeyPress() → dispatchKeyPress(game, code, e).

import { GameState } from "../types.js";
import { DEFAULT_KEYBINDS } from "../../js/input-manager.js";
import { UPGRADES } from "../data/upgrades.js";
import { CREATOR_CATEGORIES } from "../ui/character-creator.js";
import {
  getSettingsForCategory,
  getVisibleCategories,
  applySettingStep,
} from "../../js/settings-registry.js";

export function dispatchKeyPress(game, code, e) {
  // Nested Spaghetti 😂🤦‍♂️
  // TODO: Abstract into StateManager

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
        if (game.keys["ShiftLeft"] || game.keys["ShiftRight"]) {
          game.creatorCategory = (game.creatorCategory - 1 + catLen) % catLen;
        } else {
          game.creatorCategory = (game.creatorCategory + 1) % catLen;
        }
        game.audio.menuSelect();
        return;
      }
      if (code === "ArrowRight") {
        game.creatorCategory = (game.creatorCategory + 1) % catLen;
        game.audio.menuSelect();
        return;
      }
      if (code === "ArrowLeft") {
        game.creatorCategory = (game.creatorCategory - 1 + catLen) % catLen;
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
      if (game.keys["ShiftLeft"] || game.keys["ShiftRight"]) {
        // Shift+Tab → previous category
        game.creatorCategory = (game.creatorCategory - 1 + catLen) % catLen;
      } else {
        game.creatorCategory = (game.creatorCategory + 1) % catLen;
      }
      game.audio.menuSelect();
      return;
    }
    if (code === "ArrowRight" || code === "KeyD") {
      game.creatorCategory = (game.creatorCategory + 1) % catLen;
      game.audio.menuSelect();
      return;
    }
    if (code === "ArrowLeft" || code === "KeyA") {
      game.creatorCategory = (game.creatorCategory - 1 + catLen) % catLen;
      game.audio.menuSelect();
      return;
    }

    // Navigate items within category
    if (code === "ArrowUp" || code === "KeyW") {
      let next = (game.character[curCat.key] - 1 + itemLen) % itemLen;
      // Skip locked loadouts (LOADOUT category — index lookup is brittle to
      // CREATOR_CATEGORIES reorders, so name-check instead).
      if (curCat.name === "LOADOUT") {
        for (let tries = 0; tries < itemLen; tries++) {
          if (curCat.data[next].unlocked !== false) break;
          next = (next - 1 + itemLen) % itemLen;
        }
      }
      game.character[curCat.key] = next;
      game.audio.menuSelect();
      return;
    }
    if (code === "ArrowDown" || code === "KeyS") {
      let next = (game.character[curCat.key] + 1) % itemLen;
      // Skip locked loadouts
      if (curCat.name === "LOADOUT") {
        for (let tries = 0; tries < itemLen; tries++) {
          if (curCat.data[next].unlocked !== false) break;
          next = (next + 1) % itemLen;
        }
      }
      game.character[curCat.key] = next;
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
    if (game.mode === "tutorial" && game.tutorialStep === 18) {
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
    if (game.mode === "tutorial" && game.tutorialStep < 18) {
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
      game.settingsSelection = 0;
      game.state = GameState.SETTINGS;
    }
    if (code === "KeyC") {
      game.controlsSelection = 0;
      game.state = GameState.CONTROLS;
    }
    if (code === "KeyA") {
      game.achievementsScroll = 0;
      game.state = GameState.ACHIEVEMENTS;
    }
    if (code === "KeyT") {
      game.state = GameState.STATS;
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
    // Category-aware navigation: Q/E = category, W/S/↑/↓ = navigate, A/D/←/→ = value, Enter/Space = cycle
    const cats = getVisibleCategories(game.isTouchDevice);
    const catIdx = cats.indexOf(game.settingsCategory);
    const settingsDef = getSettingsForCategory(
      game.isTouchDevice,
      game.settingsCategory,
    );
    const settingsCount = settingsDef.length;

    // Switch category: Q = prev, E = next
    if (code === "KeyQ") {
      const next = (catIdx - 1 + cats.length) % cats.length;
      game.settingsCategory = cats[next];
      game.settingsSelection = 0;
      game.audio.menuSelect();
      return;
    }
    if (code === "KeyE") {
      const next = (catIdx + 1) % cats.length;
      game.settingsCategory = cats[next];
      game.settingsSelection = 0;
      game.audio.menuSelect();
      return;
    }

    // Move selection within category
    if (code === "ArrowUp" || code === "KeyW") {
      game.settingsSelection =
        (game.settingsSelection - 1 + settingsCount) % settingsCount;
      game.audio.menuSelect();
      return;
    }
    if (code === "ArrowDown" || code === "KeyS") {
      game.settingsSelection = (game.settingsSelection + 1) % settingsCount;
      game.audio.menuSelect();
      return;
    }

    // Change setting value — Enter/Space cycle forward, Left/A decrement, Right/D increment
    const stepDir =
      code === "ArrowLeft" || code === "KeyA"
        ? -1
        : code === "ArrowRight" ||
            code === "KeyD" ||
            code === "Enter" ||
            code === "Space"
          ? 1
          : 0;
    if (stepDir !== 0) {
      const def = settingsDef[game.settingsSelection];
      if (def) {
        if (applySettingStep(game.settings, def, stepDir)) {
          if (def.onChange) def.onChange(game);
          game.saveSettings();
          game.audio.menuConfirm();
        }
      }
      return;
    }

    if (code === "Escape") {
      const now = performance.now();
      if (now - game.lastEscTime < 200) return;
      game.lastEscTime = now;
      game.saveSettings();
      game.state = GameState.PAUSED;
    }
    return;
  }

  if (game.state === GameState.CONTROLS) {
    if (game.rebindingKey) return; // handled by setupInput keydown listener
    const bindKeys = Object.keys(game.keybinds);
    const totalItems = bindKeys.length + 1; // +1 for "Reset Defaults"
    if (code === "ArrowUp" || code === "KeyW") {
      game.controlsSelection =
        (game.controlsSelection - 1 + totalItems) % totalItems;
      game.audio.menuSelect();
    }
    if (code === "ArrowDown" || code === "KeyS") {
      game.controlsSelection = (game.controlsSelection + 1) % totalItems;
      game.audio.menuSelect();
    }
    if (code === "Enter" || code === "Space") {
      if (game.controlsSelection < bindKeys.length) {
        // Start rebinding
        game.rebindingKey = bindKeys[game.controlsSelection];
        game.audio.menuConfirm();
      } else {
        // Reset to defaults (mutate in place so the InputManager alias stays valid)
        Object.assign(game.keybinds, DEFAULT_KEYBINDS);
        game.saveSettings();
        game.audio.menuConfirm();
      }
    }
    if (code === "Escape") {
      const now = performance.now();
      if (now - game.lastEscTime < 200) return;
      game.lastEscTime = now;
      game.saveSettings();
      game.state = GameState.PAUSED;
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
    if (code === "Enter" || code === "Space") {
      game.advanceCutsceneFrame();
    }
    if (code === "Escape") {
      const now = performance.now();
      if (now - game.lastEscTime < 200) return;
      game.lastEscTime = now;
      game.endCutscene();
    }
    return;
  }
}
