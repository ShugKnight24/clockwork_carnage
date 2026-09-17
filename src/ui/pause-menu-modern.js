/**
 * Modern-mode pause menu. Game.renderPauseScreen hands over here when
 * isModernArt() is on; the legacy renderer in js/game.js stays untouched.
 * Same entries and key bindings — only the presentation differs. On touch
 * devices the buttons are drawn by js/touch.js, so only the title shows here.
 */

import { isCompactPhone } from "../../js/layout.js";
import {
  UI,
  uiFont,
  drawBackdrop,
  drawPanel,
  drawTitle,
  drawKeycap,
  drawCaption,
} from "./modern-ui-kit.js";

export function renderModernPauseScreen(game, ctx, w, h) {
  const compact = game.isTouchDevice && isCompactPhone(h);
  drawBackdrop(ctx, w, h, "steel", 0.9);

  if (game.showAriaLog) {
    game.renderAriaLog(ctx, w, h);
    return;
  }

  const entries = [
    { key: "ESC", label: "Resume", primary: true },
    { key: "S", label: "Settings" },
    { key: "A", label: "Achievements" },
    { key: "B", label: "Archive" },
    { key: "T", label: "Stats" },
    { key: "L", label: "ARIA log" },
  ];
  if (game.mode === "campaign") entries.push({ key: "F", label: "Save game" });
  entries.push({ key: "Q", label: "Quit to title", danger: true });

  if (game.isTouchDevice) {
    drawTitle(ctx, "PAUSED", w / 2, compact ? h * 0.2 : h / 2 - 100, compact ? 30 : 46, UI.cyan);
  } else {
    const rowH = 34;
    const panelW = 360;
    const panelH = 104 + entries.length * rowH + 16;
    const panelX = Math.round(w / 2 - panelW / 2);
    const panelY = Math.round(h / 2 - panelH / 2);

    drawPanel(ctx, panelX, panelY, panelW, panelH, { variant: "menu", accent: UI.cyan, chamfer: 20 });
    drawTitle(ctx, "PAUSED", w / 2, panelY + 60, 40, UI.cyan);
    drawCaption(ctx, w / 2, panelY + panelH - 11, "Timeline on hold", { size: 9, scheme: "steel", align: "center" });

    const listY = panelY + 96;
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const ry = listY + i * rowH;
      if (e.primary) {
        drawPanel(ctx, panelX + 18, ry, panelW - 36, rowH - 4, { variant: "raised", accent: UI.cyan, bar: true, chamfer: 8 });
      } else if (i > 0) {
        ctx.fillStyle = "rgba(130,160,188,0.1)";
        ctx.fillRect(panelX + 28, ry - 2, panelW - 56, 1);
      }
      const accent = e.danger ? UI.crimson : e.primary ? UI.cyan : null;
      drawKeycap(ctx, panelX + 34, ry + 5, e.key, { size: 10, accent });
      ctx.font = uiFont(15, e.primary ? 800 : 600);
      ctx.textAlign = "left";
      ctx.letterSpacing = "1px";
      ctx.fillStyle = e.danger ? "#ff8a96" : e.primary ? "#ffffff" : "#b9c8d6";
      ctx.fillText(e.label.toUpperCase(), panelX + 96, ry + 20);
      ctx.letterSpacing = "0px";
    }
  }

  if (game.pauseSaveFlash && performance.now() - game.pauseSaveFlash < 1500) {
    ctx.globalAlpha = 1 - (performance.now() - game.pauseSaveFlash) / 1500;
    drawCaption(ctx, w / 2, compact ? h * 0.7 : h / 2 + 170, "Game saved", { size: compact ? 12 : 14, scheme: "cyan", align: "center" });
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = "left";
}
