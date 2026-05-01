// Upgrade screen — rendered between arena rounds

import { UPGRADES } from "../../js/data.js";
import { upgradeLayout, isCompactPhone } from "../../js/layout.js";
import { drawScanlines } from "./scanlines.js";
import { getUpgradeSprite } from "../assets/loader.js";

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {{ isTouchDevice: boolean, arenaRound: number, playerScore: number, upgradeLevels: Object, upgradeSelection: number }} state
 */
export function renderUpgradeScreen(ctx, w, h, state) {
  const { isTouchDevice, arenaRound, playerScore, upgradeLevels, upgradeSelection } = state;
  const now = performance.now();

  // ── Deep space backdrop ──
  ctx.fillStyle = "#020510";
  ctx.fillRect(0, 0, w, h);

  // Subtle animated grid
  ctx.strokeStyle = "rgba(0,200,255,0.03)";
  ctx.lineWidth = 1;
  const gridSize = 40;
  const gridOff = (now * 0.01) % gridSize;
  for (let gx = -gridOff; gx < w; gx += gridSize) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }
  for (let gy = -gridOff; gy < h; gy += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }

  // Ambient particle field
  ctx.fillStyle = "rgba(0,255,200,0.12)";
  for (let i = 0; i < 30; i++) {
    const px = w * 0.5 + Math.sin(now * 0.0003 + i * 2.1) * w * 0.45;
    const py = h * 0.5 + Math.cos(now * 0.0004 + i * 1.7) * h * 0.45;
    const ps = 1 + Math.sin(now * 0.002 + i) * 0.5;
    ctx.beginPath();
    ctx.arc(px, py, ps, 0, Math.PI * 2);
    ctx.fill();
  }

  // Radial vignette
  const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.8);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,10,0.6)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // ── Header section ──
  const compactUpg = isTouchDevice && isCompactPhone(h);
  const headerY = compactUpg ? 14 : 40;

  // Horizontal accent line
  if (!compactUpg) {
    const lineW = 200;
    ctx.strokeStyle = "rgba(0,255,200,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - lineW, headerY + 14);
    ctx.lineTo(w / 2 + lineW, headerY + 14);
    ctx.stroke();
  }

  // Round complete title
  const titlePulse = 0.85 + 0.15 * Math.sin(now * 0.003);
  ctx.save();
  ctx.shadowColor = "#00ffcc";
  ctx.shadowBlur = 18 * titlePulse;
  ctx.fillStyle = "#00ffcc";
  ctx.font = `bold ${compactUpg ? 18 : 32}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(`ROUND ${arenaRound - 1} COMPLETE`, w / 2, headerY);
  ctx.shadowBlur = 0;
  ctx.restore();

  // Score
  ctx.fillStyle = "#ffcc00";
  ctx.font = `bold ${compactUpg ? 13 : 18}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(`\u2605  SCORE: ${playerScore}  \u2605`, w / 2, headerY + (compactUpg ? 20 : 34));

  if (!compactUpg) {
    // Section divider
    ctx.strokeStyle = "rgba(0,200,255,0.15)";
    ctx.beginPath();
    ctx.moveTo(w * 0.15, headerY + 52);
    ctx.lineTo(w * 0.85, headerY + 52);
    ctx.stroke();

    // UPGRADES subtitle
    ctx.fillStyle = "rgba(170,200,255,0.6)";
    ctx.font = "bold 14px monospace";
    ctx.fillText("\u25C6  UPGRADES  \u25C6", w / 2, headerY + 70);
  }

  // ── Upgrade cards ──
  const upgradeKeys = Object.keys(UPGRADES);
  const layout = upgradeLayout(w, h, upgradeKeys.length, isTouchDevice);
  const { startY, cardH, cardGap, colW, cols, leftX, rightX } = layout;

  for (let i = 0; i < upgradeKeys.length; i++) {
    const key = upgradeKeys[i];
    const upg = UPGRADES[key];
    const level = upgradeLevels[key] || 0;
    const cost = Math.floor(upg.baseCost * Math.pow(upg.costScale, level));
    const maxed = level >= upg.maxLevel;
    const selected = upgradeSelection === i;
    const affordable = playerScore >= cost;

    const col = i % cols;
    const row = Math.floor(i / cols);
    const baseX = col === 0 ? leftX : rightX;
    const y = startY + row * (cardH + cardGap);

    // Card background
    ctx.fillStyle = selected ? "rgba(0,200,255,0.08)" : "rgba(10,15,30,0.6)";
    ctx.beginPath();
    ctx.roundRect(baseX, y, colW, cardH, 6);
    ctx.fill();

    // Card border
    if (selected) {
      const borderPulse = 0.5 + 0.5 * Math.sin(now * 0.005);
      ctx.strokeStyle = `rgba(0,255,200,${0.3 + borderPulse * 0.3})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(baseX, y, colW, cardH, 6);
      ctx.stroke();
      // Left accent bar
      ctx.fillStyle = maxed ? "#44ff44" : "#00ffcc";
      ctx.beginPath();
      ctx.roundRect(baseX, y, 3, cardH, [3, 0, 0, 3]);
      ctx.fill();
    } else {
      ctx.strokeStyle = "rgba(50,60,80,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(baseX, y, colW, cardH, 6);
      ctx.stroke();
    }

    // Sprite icon — left edge of the card. Reserved gutter is 28px on
    // wide layout, 18px on compact. Falls through silently if the
    // image hasn't decoded yet (procedural-art fallback was the prior
    // baseline, so missing sprites just look like the old version).
    const iconSize = compactUpg ? 16 : 26;
    const iconX = baseX + (compactUpg ? 6 : 10);
    const iconY = y + (compactUpg ? 2 : 6);
    const sprite = getUpgradeSprite(key);
    if (sprite) {
      ctx.save();
      ctx.globalAlpha = selected ? 1 : 0.75;
      ctx.drawImage(sprite, iconX, iconY, iconSize, iconSize);
      ctx.restore();
    }
    const textInset = (compactUpg ? 8 : 14) + iconSize + (compactUpg ? 4 : 8);

    // Upgrade name
    ctx.fillStyle = selected ? "#ffffff" : "#8888aa";
    ctx.font = `${selected ? "bold " : ""}${compactUpg ? 11 : 15}px monospace`;
    ctx.textAlign = "left";
    ctx.fillText(upg.name, baseX + textInset, y + (compactUpg ? 14 : 20));

    // Description (skip on compact)
    if (!compactUpg) {
      ctx.fillStyle = selected ? "rgba(170,200,220,0.7)" : "rgba(100,110,130,0.6)";
      ctx.font = "11px monospace";
      ctx.fillText(upg.description, baseX + textInset, y + 36);
    }

    // Cost or MAX badge
    ctx.textAlign = "right";
    if (maxed) {
      ctx.fillStyle = "rgba(0,255,100,0.15)";
      const badgeW = compactUpg ? 30 : 40;
      const badgeH = compactUpg ? 14 : 20;
      ctx.beginPath();
      ctx.roundRect(baseX + colW - badgeW - 12, y + (compactUpg ? 4 : 8), badgeW, badgeH, 4);
      ctx.fill();
      ctx.fillStyle = "#44ff44";
      ctx.font = `bold ${compactUpg ? 9 : 12}px monospace`;
      ctx.fillText("MAX", baseX + colW - (compactUpg ? 8 : 16), y + (compactUpg ? 14 : 22));
    } else {
      ctx.fillStyle = affordable ? "#ffcc00" : "#ff4455";
      ctx.font = `bold ${compactUpg ? 11 : 14}px monospace`;
      ctx.fillText(`${cost}`, baseX + colW - (compactUpg ? 6 : 12), y + (compactUpg ? 14 : 22));
      if (!compactUpg) {
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.font = "9px monospace";
        ctx.fillText("COST", baseX + colW - 12, y + 12);
      }
    }

    // Level pips — progress bar
    const maxPips = Math.min(upg.maxLevel, 10);
    const pipBarW = colW - (compactUpg ? 16 : 28);
    const pipH = compactUpg ? 2 : 3;
    const pipY = y + cardH - (compactUpg ? 6 : 12);
    // Track
    ctx.fillStyle = "rgba(30,40,60,0.8)";
    ctx.beginPath();
    ctx.roundRect(baseX + (compactUpg ? 8 : 14), pipY, pipBarW, pipH, 2);
    ctx.fill();
    // Filled
    if (level > 0) {
      const fillW = (pipBarW * level) / maxPips;
      const pipGrad = ctx.createLinearGradient(
        baseX + (compactUpg ? 8 : 14), 0,
        baseX + (compactUpg ? 8 : 14) + fillW, 0,
      );
      pipGrad.addColorStop(0, maxed ? "#44ff44" : "#00ffcc");
      pipGrad.addColorStop(1, maxed ? "#22cc22" : "#0088aa");
      ctx.fillStyle = pipGrad;
      ctx.beginPath();
      ctx.roundRect(baseX + (compactUpg ? 8 : 14), pipY, fillW, pipH, 2);
      ctx.fill();
    }

    // Level text
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(150,170,190,0.4)";
    ctx.font = `${compactUpg ? 7 : 9}px monospace`;
    ctx.fillText(`LV ${level}/${upg.maxLevel}`, baseX + colW - (compactUpg ? 6 : 12), pipY + 3);

    ctx.textAlign = "left";
  }

  // ── Continue button ──
  const contY = layout.contY;
  const contSelected = upgradeSelection === upgradeKeys.length;

  const contBtnW = compactUpg ? 260 : 360;
  const contBtnH = compactUpg ? 28 : 36;
  if (contSelected) {
    const btnPulse = 0.5 + 0.5 * Math.sin(now * 0.004);
    ctx.fillStyle = `rgba(0,255,200,${0.06 + btnPulse * 0.04})`;
    ctx.beginPath();
    ctx.roundRect(w / 2 - contBtnW / 2, contY - contBtnH / 2, contBtnW, contBtnH, 8);
    ctx.fill();
    ctx.strokeStyle = `rgba(0,255,200,${0.3 + btnPulse * 0.3})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(w / 2 - contBtnW / 2, contY - contBtnH / 2, contBtnW, contBtnH, 8);
    ctx.stroke();
  }
  ctx.fillStyle = contSelected ? "#00ffcc" : "#556677";
  ctx.font = `bold ${compactUpg ? 13 : 18}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(contSelected ? "\u25B6  CONTINUE  \u25B6" : "CONTINUE", w / 2, contY + (compactUpg ? 3 : 5));

  // ── Footer hint ──
  if (!compactUpg) {
    ctx.fillStyle = "rgba(100,120,140,0.4)";
    ctx.font = "11px monospace";
    ctx.fillText("W/S/A/D navigate  \u00B7  ENTER select", w / 2, contY + 34);
  }

  // ── Scanline overlay ──
  drawScanlines(ctx, w, h);

  ctx.textAlign = "left";
}
