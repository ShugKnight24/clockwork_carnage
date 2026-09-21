// Click dispatch — extracted from game.js menu click handlers.
// Pure functions: receives game instance + DOM event, mutates game state.
// 1:1 extractions of _handleCreatorClick, _handleVictoryClick and
// _handleGameOverClick. The settings screen now lives in game.js and reads its
// geometry from js/layout.js, so it is not duplicated here.
//
// Callers: game._handle*Click() methods delegate here.

import { GameState } from "../types.js";
import {
  CREATOR_CATEGORIES,
  getCreatorLayout,
} from "../ui/character-creator.js";
import { isCompactPhone } from "../../js/layout.js";
import { gameUnlockContext, isUnlocked } from "./unlocks.js";

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

  // Same window the renderer uses — L.maxBySpace is derived from panel height.
  const maxVisible = Math.min(items.length, L.maxBySpace);
  const selIdx = game.character[curCat.key];
  let scrollOff = 0;
  if (selIdx >= maxVisible) scrollOff = selIdx - maxVisible + 1;

  if (mx >= L.contentX && mx <= L.contentX + L.listW) {
    for (let vi = 0; vi < maxVisible; vi++) {
      const idx = vi + scrollOff;
      if (idx >= items.length) break;
      const iy = L.contentY + 8 + vi * L.itemH;
      if (my >= iy && my <= iy + L.itemH) {
        if (!isUnlocked(curCat.key, idx, gameUnlockContext(game))) return;
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
