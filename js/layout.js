/**
 * Pure layout helpers shared by renderers and touch hit-testing.
 *
 * All functions are deterministic and side-effect free.
 * Compact phone support: adapts layout for landscape phones (h < COMPACT_PHONE_HEIGHT).
 */

import {
  getVisibleSettings,
  COMPACT_PHONE_HEIGHT,
} from "./settings-registry.js";

export function isCompactPhone(h) {
  return h < COMPACT_PHONE_HEIGHT;
}

export function pauseLayout(w, h, mode) {
  const compact = isCompactPhone(h);
  const btnY = compact ? h * 0.55 : h / 2 + 115;
  const btnH = compact ? 40 : 50;
  const btnW = Math.max(44, Math.min(compact ? 80 : 90, (w - 60) / 4 - 10));
  const gap = compact ? 6 : 10;
  const labels = ["RESUME", "SETTINGS", "CONTROLS", "QUIT"];
  const colors = ["#00ccff", "#88aaff", "#aabbcc", "#ff4444"];
  const totalW = labels.length * btnW + (labels.length - 1) * gap;
  const startX = (w - totalW) / 2;
  const buttons = labels.map((label, i) => ({
    label,
    color: colors[i],
    x: startX + i * (btnW + gap),
    y: btnY,
    w: btnW,
    h: btnH,
    index: i,
  }));

  const isCampaign = mode === "campaign";
  const saveBtn = isCampaign
    ? {
        label: "SAVE",
        x: (w - 100) / 2,
        y: btnY + btnH + 10,
        w: 100,
        h: 40,
      }
    : null;

  return { btnY, btnH, btnW, gap, buttons, saveBtn, compact };
}

export function settingsLayout(w, h, settingsSelection, isTouchDevice) {
  const compact = isTouchDevice && isCompactPhone(h);
  const panelW = compact ? Math.min(w - 20, 380) : 440;
  const panelX = w / 2 - panelW / 2;
  const barW = compact ? 140 : 200;
  const barH = compact ? 4 : 6;

  const visibleDefs = getVisibleSettings(isTouchDevice);
  const itemHeights = visibleDefs.map((def) =>
    compact ? def.height.compact : def.height.normal,
  );
  const totalH = itemHeights.reduce((a, b) => a + b, 0);
  const visibleH = h - (compact ? 60 : 120);
  const titleAreaY = compact ? 28 : 50;
  let startY = titleAreaY + (compact ? 20 : 40);

  if (totalH > visibleH) {
    let selTop = 0;
    for (let i = 0; i < settingsSelection; i++) selTop += itemHeights[i];
    const selCenter = selTop + itemHeights[settingsSelection] / 2;
    const idealOffset = visibleH / 2 - selCenter;
    const maxOffset = 0;
    const minOffset = visibleH - totalH;
    startY += Math.max(minOffset, Math.min(maxOffset, idealOffset));
  }

  return {
    panelX,
    panelW,
    barW,
    barH,
    itemHeights,
    totalH,
    visibleH,
    startY,
    compact,
    visibleDefs,
  };
}

export function upgradeLayout(w, h, upgradeCount, isTouchDevice) {
  const compact = isTouchDevice && isCompactPhone(h);
  const cols = 2;
  const headerY = compact ? 14 : 40;
  const startY = headerY + (compact ? 30 : 90);
  const cardH = compact ? 40 : 64;
  const cardGap = compact ? 3 : 6;
  const colW = compact ? Math.min(280, Math.floor((w - 36) / 2)) : 320;
  const leftX = w / 2 - colW - (compact ? 6 : 12);
  const rightX = w / 2 + (compact ? 6 : 12);
  const totalRows = Math.ceil(upgradeCount / cols);
  const contY = startY + totalRows * (cardH + cardGap) + 20;

  return {
    cols,
    headerY,
    startY,
    cardH,
    cardGap,
    colW,
    leftX,
    rightX,
    totalRows,
    contY,
    compact,
  };
}

export function tutorialMenuLayout(w, h, itemCount) {
  const menuW = Math.min(360, w - 40);
  const itemH = 52;
  const menuH = itemCount * itemH + 16;
  const mx = (w - menuW) / 2;
  const my = h * 0.35;
  return { menuW, itemH, menuH, mx, my };
}
