/**
 * Meltdown's HUD extras: the reactor heat meter (top-right), the heat tint
 * over the view and ARIA's centre-screen line, shared by the Classic and
 * compact layouts, plus the upgrade picker every layout shows between runs.
 */

import { activeDevice, drawPrompt } from "./input-glyphs.js";

/** Heat meter (top-right), heat tint over the view and ARIA text. */
export function drawMeltdownHeat(ctx, s, w, h, barH) {
  const mHud = s.meltdownHud;
  const heatPct = mHud.heat / 100;
  // Heat meter (top-right)
  const heatW = 120, heatH = 16;
  const heatX = w - heatW - 15, heatY = 15;
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(heatX - 5, heatY - 5, heatW + 10, heatH + 24);
  ctx.strokeStyle = "rgba(255,68,0,0.3)";
  ctx.strokeRect(heatX - 5, heatY - 5, heatW + 10, heatH + 24);
  // Heat bar background
  ctx.fillStyle = "rgba(60,20,0,0.6)";
  ctx.fillRect(heatX, heatY, heatW, heatH);
  // Heat bar fill
  const heatColor = heatPct < 0.5
    ? `rgb(255, ${Math.floor(200 - heatPct * 300)}, 0)`
    : `rgb(255, ${Math.floor(100 - (heatPct - 0.5) * 200)}, 0)`;
  ctx.fillStyle = heatColor;
  ctx.fillRect(heatX, heatY, heatW * heatPct, heatH);
  // Heat label
  ctx.font = "bold 9px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = heatPct > 0.7 ? "#ff4400" : "#ffaa66";
  ctx.fillText(`REACTOR: ${mHud.heat}%`, heatX + heatW / 2, heatY + heatH + 12);
  // Speed indicator
  ctx.font = "8px monospace";
  ctx.fillStyle = "rgba(150,200,255,0.5)";
  ctx.textAlign = "right";
  ctx.fillText(`${mHud.speed} m/s`, w - 15, heatY + heatH + 28);
  // Heat overlay on world
  const overlay = s.heatOverlay;
  if (overlay) {
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, w, h - barH);
  }
  // ARIA text (center screen)
  if (s.meltdownAriaText) {
    const ariaAlpha = Math.min(1, s.meltdownAriaTimer / 0.5);
    ctx.save();
    ctx.globalAlpha = ariaAlpha;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    const tw = ctx.measureText(s.meltdownAriaText).width + 40;
    ctx.fillRect(w / 2 - tw / 2, h * 0.2 - 15, tw, 30);
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#00ccff";
    ctx.fillText(s.meltdownAriaText, w / 2, h * 0.2 + 3);
    ctx.restore();
  }
}

/**
 * Meltdown upgrade selection overlay — 3 choices side by side. Exported for
 * the reels' Meltdown shot (src/cinematic/scenes/meltdown.js).
 */
export function renderMeltdownUpgradeOverlay(game, ctx, w, h) {
  const choices = game._meltdownUpgradeChoices;
  if (!choices || choices.length === 0) return;

  // Dim background
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0, 0, w, h);

  // Title
  ctx.fillStyle = "#ffaa00";
  ctx.font = "bold 28px monospace";
  ctx.textAlign = "center";
  ctx.fillText("SYSTEM UPGRADE", w / 2, h * 0.22);
  const device = activeDevice(game);
  if (device === "touch") {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "14px monospace";
    ctx.fillText("Press 1, 2, or 3 to select — or use Arrow Keys + Enter", w / 2, h * 0.22 + 30);
  } else {
    drawPrompt(ctx, w / 2, h * 0.22 + 25, [["pick", "select"], ["arrowsH", "move"], ["confirm", "confirm"]], {
      input: game, size: 12, font: "14px monospace", color: "rgba(255,255,255,0.6)", align: "center", look: "legacy",
    });
  }

  // Cards
  const cardW = Math.min(200, (w - 80) / 3);
  const cardH = 160;
  const gap = 16;
  const totalW = choices.length * cardW + (choices.length - 1) * gap;
  const startX = Math.floor(w / 2 - totalW / 2);
  const startY = Math.floor(h / 2 - cardH / 2);

  for (let i = 0; i < choices.length; i++) {
    const c = choices[i];
    const cx = startX + i * (cardW + gap);
    const selected = i === game._meltdownUpgradeSel;

    // Card background
    ctx.fillStyle = selected ? "rgba(0,200,255,0.2)" : "rgba(10,10,30,0.85)";
    ctx.beginPath();
    ctx.roundRect(cx, startY, cardW, cardH, 8);
    ctx.fill();

    // Border
    ctx.strokeStyle = selected ? "#00ccff" : "rgba(255,255,255,0.2)";
    ctx.lineWidth = selected ? 2.5 : 1;
    ctx.beginPath();
    ctx.roundRect(cx, startY, cardW, cardH, 8);
    ctx.stroke();

    // Key number (the pad has no number keys); its colour also tints the icon.
    ctx.fillStyle = selected ? "#00ccff" : "rgba(255,255,255,0.4)";
    if (device !== "gamepad") {
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`[${i + 1}]`, cx + 10, startY + 20);
    }

    // Icon
    ctx.font = "32px serif";
    ctx.textAlign = "center";
    ctx.fillText(c.icon || "⚙", cx + cardW / 2, startY + 52);

    // Name
    ctx.fillStyle = selected ? "#ffffff" : "rgba(255,255,255,0.8)";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText(c.name, cx + cardW / 2, startY + 80);

    // Description (wrap if needed)
    ctx.fillStyle = "rgba(200,220,255,0.6)";
    ctx.font = "12px monospace";
    const desc = c.description || "";
    const maxTextW = cardW - 16;
    const words = desc.split(" ");
    let line = "";
    let lineY = startY + 100;
    for (const word of words) {
      const testLine = line ? line + " " + word : word;
      if (ctx.measureText(testLine).width > maxTextW) {
        ctx.fillText(line, cx + cardW / 2, lineY);
        line = word;
        lineY += 15;
      } else {
        line = testLine;
      }
    }
    if (line) ctx.fillText(line, cx + cardW / 2, lineY);
  }

  ctx.textAlign = "left";
}
