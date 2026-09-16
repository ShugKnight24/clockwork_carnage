// Click dispatch — extracted from game.js menu click handlers.
// Pure functions: receives game instance + DOM event, mutates game state.
// 1:1 extractions of _handleCreatorClick, _handleVictoryClick,
// _handleSettingsClick, _handleGameOverClick.
//
// Callers: game._handle*Click() methods delegate here.

import { GameState } from "../types.js";
import {
  CREATOR_CATEGORIES,
  getCreatorLayout,
} from "../ui/character-creator.js";
import { isCompactPhone } from "../../js/layout.js";
import {
  getSettingsForCategory,
  getVisibleCategories,
} from "../../js/settings-registry.js";

export function handleCreatorClick(game, e) {
  const rect = game.canvas.getBoundingClientRect();
  const scaleX = game.canvas.width / rect.width;
  const scaleY = game.canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  const w = game.canvas.width;
  const h = game.canvas.height;
  const isMobile = game.isTouchDevice && w < 700;
  const categories = CREATOR_CATEGORIES;
  const L = getCreatorLayout(w, h, isMobile);

  // Tab click detection
  if (my >= L.tabY && my <= L.tabY + L.tabH) {
    for (let i = 0; i < categories.length; i++) {
      const tx = L.tabX0 + i * (L.tabW + L.tabGap);
      if (mx >= tx && mx <= tx + L.tabW) {
        game.creatorCategory = i;
        game.audio.menuSelect();
        return;
      }
    }
  }

  // Item list click detection (non-NAME tabs)
  const cat = game.creatorCategory;
  if (cat === 0) return;

  const curCat = categories[cat];
  const items = curCat.data;
  if (!items) return;

  const maxVisible = Math.min(items.length, isMobile ? L.maxBySpace : 8);
  const selIdx = game.character[curCat.key];
  let scrollOff = 0;
  if (selIdx >= maxVisible) scrollOff = selIdx - maxVisible + 1;

  if (mx >= L.contentX && mx <= L.contentX + L.listW) {
    for (let vi = 0; vi < maxVisible; vi++) {
      const idx = vi + scrollOff;
      if (idx >= items.length) break;
      const iy = L.contentY + 8 + vi * L.itemH;
      if (my >= iy && my <= iy + L.itemH) {
        if (curCat.name === "LOADOUT" && items[idx].unlocked === false) return;
        game.character[curCat.key] = idx;
        return;
      }
    }
  }
}

export function handleVictoryClick(game, e) {
  if (game.transitioning) return;
  const rect = game.canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (game.canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (game.canvas.height / rect.height);
  const w = game.canvas.width;
  const h = game.canvas.height;
  const compact = game.isTouchDevice && isCompactPhone(h);

  if (game.ngPlusPrompt && game.mode === "campaign") {
    const promptY = compact ? h * 0.78 : h / 2 + 170;
    const optW = compact ? 140 : 220;
    const optH = compact ? 44 : 56;
    const gap = compact ? 12 : 20;
    const totalW = 2 * optW + gap;
    const startX = w / 2 - totalW / 2;

    // Check if tap is within the card row
    if (y >= promptY && y <= promptY + optH) {
      for (let i = 0; i < 2; i++) {
        const ox = startX + i * (optW + gap);
        if (x >= ox && x <= ox + optW) {
          game.audio.menuConfirm();
          if (i === 0) {
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
          return;
        }
      }
    }
    return; // don't fall through to title-return when prompt is active
  }

  // No NG+ prompt — tap anywhere to return to title
  game.audio.menuConfirm();
  game.fadeTransition(() => {
    game.state = GameState.TITLE;
    game.audio.stopMusic();
    game.audio.startTrack("menu");
    game.audio.startAmbient("menu");
  });
}

export function handleSettingsClick(game, e) {
  const rect = game.canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (game.canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (game.canvas.height / rect.height);
  const w = game.canvas.width;
  const h = game.canvas.height;
  const compact = game.isTouchDevice && isCompactPhone(h);

  const headerH = compact ? 36 : 52;
  const sideW = compact ? 90 : 160;
  const panelX = sideW + 1;
  const panelW = w - panelX - 12;
  const contentTop = headerH + 8;
  const catItemH = compact ? 28 : 38;
  const barW = Math.min(panelW * 0.55, 240);
  const barH = 6;

  const cats = getVisibleCategories(game.isTouchDevice, game.settings);
  const defs = getSettingsForCategory(
    game.isTouchDevice,
    game.settingsCategory,
    game.settings
  );

  // ── Sidebar click: switch category or back ──
  if (x < sideW && y > headerH) {
    // Back button at bottom of sidebar
    const backY = h - 32;
    if (y >= backY - 14 && y < backY + 10) {
      game.handleKeyPress("Escape");
      return;
    }
    const ci = Math.floor((y - contentTop) / catItemH);
    if (ci >= 0 && ci < cats.length) {
      game.settingsCategory = cats[ci];
      game.settingsSelection = 0;
      game.audio.menuSelect();
    }
    return;
  }

  // ── Right panel: click on setting row ──
  if (x >= panelX && x <= panelX + panelW && y >= contentTop) {
    let rowY = contentTop;
    for (let i = 0; i < defs.length; i++) {
      const def = defs[i];
      const itemH = compact ? def.height.compact : def.height.normal;
      if (y >= rowY && y < rowY + itemH) {
        game.settingsSelection = i;

        // Slider: click-to-set on bar region
        if (def.type === "slider" && def.barColor) {
          const sliderY = rowY + (compact ? 20 : 28);
          const sliderX = panelX + (compact ? 8 : 14);
          const sliderW = Math.min(panelW - (compact ? 16 : 28), barW);
          if (
            y >= sliderY - 4 &&
            y <= sliderY + barH + 4 &&
            x >= sliderX &&
            x <= sliderX + sliderW
          ) {
            const pct = Math.max(0, Math.min(1, (x - sliderX) / sliderW));
            let val = def.min + pct * (def.max - def.min);
            // Snap to step
            val = Math.round(val / def.step) * def.step;
            val = Math.max(def.min, Math.min(def.max, val));
            if (def.round != null)
              val =
                Math.round(val * Math.pow(10, def.round)) /
                Math.pow(10, def.round);
            game.settings[def.key] = val;
            if (def.onChange) def.onChange(game);
            game.saveSettings();
            game.audio.menuConfirm();
            return;
          }
        }
        
        // Action buttons
        if (def.type === "action") {
          if (def.onClick) {
            def.onClick(game);
            game.audio.menuConfirm();
          }
          return;
        }

        // Left half: decrement, right half: increment
        const midX = panelX + panelW / 2;
        if (x < midX) {
          game.handleKeyPress("ArrowLeft");
        } else {
          game.handleKeyPress("ArrowRight");
        }
        return;
      }
      rowY += itemH;
    }

    // Clicked below all rows — back
    if (y > rowY) {
      game.handleKeyPress("Escape");
    }
  }
}

export function handleGameOverClick(game, e) {
  if (game.transitioning) return;
  const rect = game.canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const b = game._gameOverBtns;
  if (!b) return;
  const { btnBaseX, btnY, btnW, btnH, btnGap } = b;

  if (y >= btnY && y <= btnY + btnH) {
    for (let i = 0; i < 3; i++) {
      const bx = btnBaseX + i * (btnW + btnGap);
      if (x >= bx && x <= bx + btnW) {
        if (i === 0) {
          // RESTART
          game.audio.menuConfirm();
          game.fadeTransition(() => {
            if (game.mode === "arena") game.startArena();
            else if (game.mode === "meltdown") game.startMeltdown();
            else if (game.mode === "campaign") game.startCampaign();
          });
        } else if (i === 1) {
          // QUIT — return to title
          game.audio.menuConfirm();
          game.fadeTransition(() => {
            game.state = GameState.TITLE;
            game.audio.stopMusic();
            game.audio.startTrack("menu");
            game.audio.startAmbient("menu");
          });
        } else if (i === 2) {
          // SHARE
          game._shareCurrentResult();
        }
        return;
      }
    }
  }
}
