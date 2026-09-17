// Campaign prompt screen — "Start with tutorial?" before campaign begins

import { isModernArt } from "../rendering/art-style.js";
import { UI, drawBackdrop, drawTitle, drawCaption } from "./modern-ui-kit.js";
import { drawModernMenu, drawModernKeyHints } from "./tutorial-ui.js";

const PROMPT_TITLE = "START CAMPAIGN";
const PROMPT_SUBTITLE = "Clock in like everyone else, or skip to the end of the world?";
const PROMPT_FOOTER = "W/S to navigate  \u00B7  ENTER to select  \u00B7  ESC to go back";
const PROMPT_ITEMS = [
  { label: "PROLOGUE: LOCKER ROOM", key: "[1]", color: "#00ffcc", desc: "Suit up, learn the controls, answer the alarm" },
  { label: "SKIP TO ACT 1", key: "[2]", color: "#ff8844", desc: "Straight into the fire. No training wheels." },
];

export function renderCampaignPrompt(ctx, w, h, selection = 0) {
  const now = performance.now();
  const sel = selection;
  if (isModernArt()) {
    renderModernCampaignPrompt(ctx, w, h, sel, now);
    return;
  }

  // Background
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
  grad.addColorStop(0, "#0a0a2a");
  grad.addColorStop(0.5, "#050515");
  grad.addColorStop(1, "#000005");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Animated rings
  const ringPulse = 0.5 + 0.5 * Math.sin(now * 0.002);
  ctx.save();
  ctx.translate(w / 2, h * 0.25);
  ctx.strokeStyle = `rgba(0, 200, 255, ${0.06 + ringPulse * 0.05})`;
  ctx.lineWidth = 2;
  for (let ring = 0; ring < 3; ring++) {
    const radius = 40 + ring * 18 + Math.sin(now * 0.001 + ring) * 4;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Title
  const titleY = h * 0.2;
  const titlePulse = 0.85 + 0.15 * Math.sin(now * 0.003);
  ctx.save();
  ctx.shadowColor = "#00ccff";
  ctx.shadowBlur = 16 * titlePulse;
  ctx.fillStyle = "#00ccff";
  ctx.font = "bold 32px monospace";
  ctx.textAlign = "center";
  ctx.fillText(PROMPT_TITLE, w / 2, titleY);
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.fillStyle = "rgba(170, 200, 220, 0.5)";
  ctx.font = "14px monospace";
  ctx.textAlign = "center";
  ctx.fillText(PROMPT_SUBTITLE, w / 2, titleY + 28);

  // Menu items
  const menuItems = PROMPT_ITEMS;

  const menuW = 380;
  const itemH = 56;
  const menuH = menuItems.length * itemH + 16;
  const mx = (w - menuW) / 2;
  const my = h * 0.38;

  ctx.fillStyle = "rgba(0, 5, 15, 0.75)";
  ctx.beginPath();
  ctx.roundRect(mx - 10, my - 10, menuW + 20, menuH + 20, 12);
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 200, 255, 0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(mx - 10, my - 10, menuW + 20, menuH + 20, 12);
  ctx.stroke();

  for (let i = 0; i < menuItems.length; i++) {
    const item = menuItems[i];
    const iy = my + 8 + i * itemH;
    const isSelected = i === sel;

    if (isSelected) {
      const sPulse = 0.6 + 0.4 * Math.sin(now * 0.004);
      ctx.fillStyle = `rgba(0, 200, 255, ${0.06 * sPulse})`;
      ctx.beginPath();
      ctx.roundRect(mx, iy, menuW, itemH - 6, 6);
      ctx.fill();
      ctx.fillStyle = item.color;
      ctx.fillRect(mx, iy + 4, 3, itemH - 14);
      ctx.fillStyle = "#00ccff";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "left";
      ctx.fillText("\u25B8", mx + 12, iy + 26);
    }

    ctx.fillStyle = isSelected ? item.color : "rgba(255,255,255,0.45)";
    ctx.font = `${isSelected ? "bold " : ""}16px monospace`;
    ctx.textAlign = "left";
    ctx.fillText(item.label, mx + 32, iy + 26);

    if (item.desc && isSelected) {
      ctx.fillStyle = "rgba(170, 200, 220, 0.5)";
      ctx.font = "11px monospace";
      ctx.fillText(item.desc, mx + 32, iy + 42);
    }

    ctx.fillStyle = isSelected ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)";
    ctx.font = "11px monospace";
    ctx.textAlign = "right";
    ctx.fillText(item.key, mx + menuW - 8, iy + 26);
  }
  ctx.textAlign = "left";

  // Letterbox bars
  const barHeight = h * 0.06;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, barHeight);
  ctx.fillRect(0, h - barHeight, w, barHeight);

  // Bottom hint
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.font = "11px monospace";
  ctx.textAlign = "center";
  ctx.fillText(PROMPT_FOOTER, w / 2, h - barHeight / 2 + 4);
  ctx.textAlign = "left";
}

/** Modern layout: same menu geometry as legacy, kit plates and keycaps. */
function renderModernCampaignPrompt(ctx, w, h, sel, now) {
  drawBackdrop(ctx, w, h, "steel");
  const compact = h < 500;

  // Cinematic letterbox, inked.
  const barHeight = h * 0.06;
  ctx.fillStyle = UI.ink;
  ctx.fillRect(0, 0, w, barHeight);
  ctx.fillRect(0, h - barHeight, w, barHeight);
  ctx.fillStyle = "rgba(34,230,255,0.25)";
  ctx.fillRect(0, Math.round(barHeight), w, 1);
  ctx.fillRect(0, Math.round(h - barHeight) - 1, w, 1);

  const titleY = h * 0.2;
  drawTitle(ctx, PROMPT_TITLE, w / 2, titleY, compact ? 28 : 38, UI.cyan);
  drawCaption(ctx, w / 2, titleY + (compact ? 14 : 20), PROMPT_SUBTITLE, {
    size: compact ? 10 : 11, scheme: "steel", align: "center",
  });

  const menuW = 380;
  const itemH = 56;
  const layout = {
    menuW,
    itemH,
    menuH: PROMPT_ITEMS.length * itemH + 16,
    mx: (w - menuW) / 2,
    my: h * 0.38,
  };
  drawModernMenu(ctx, PROMPT_ITEMS, sel, now, layout, 26, 42);
  drawModernKeyHints(ctx, w / 2, h - barHeight / 2, PROMPT_FOOTER, compact ? 8 : 10);
  ctx.textAlign = "left";
}
