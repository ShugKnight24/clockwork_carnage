/**
 * Pure layout helpers shared by renderers and touch hit-testing.
 *
 * All functions are deterministic and side-effect free.
 * Compact phone support: adapts layout for landscape phones (h < COMPACT_PHONE_HEIGHT).
 */

import { COMPACT_PHONE_HEIGHT } from "./settings-registry.js";

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

/** True when (x, y) is inside a {x, y, w, h} rect. */
export function hitRect(rect, x, y) {
  return (
    !!rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h
  );
}

export function upgradeLayout(w, h, upgradeCount, isTouchDevice, selectedIndex = -1) {
  const compact = isTouchDevice && isCompactPhone(h);
  const cols = 2;
  const headerY = compact ? 14 : 40;
  const listTop = headerY + (compact ? 30 : 90);
  const cardH = compact ? 40 : 64;
  const cardGap = compact ? 3 : 6;
  const colW = compact ? Math.min(280, Math.floor((w - 36) / 2)) : 320;
  const leftX = w / 2 - colW - (compact ? 6 : 12);
  const rightX = w / 2 + (compact ? 6 : 12);
  const totalRows = Math.ceil(upgradeCount / cols);
  const rowPitch = cardH + cardGap;

  // The continue prompt is pinned above the bottom edge; the list scrolls in
  // the space above it. Previously every row was drawn unconditionally from
  // listTop, so with 18 upgrades the last rows and the prompt itself fell off
  // the bottom of the screen with no way to reach them.
  const contY = h - (compact ? 34 : 58);
  const listBottom = contY - (compact ? 14 : 26);
  const listH = Math.max(rowPitch, listBottom - listTop);
  const maxVisibleRows = Math.max(1, Math.floor((listH + cardGap) / rowPitch));
  const maxScrollRow = Math.max(0, totalRows - maxVisibleRows);

  // Keep the selected row inside the window.
  let scrollRow = 0;
  if (selectedIndex >= 0 && selectedIndex < upgradeCount && maxScrollRow > 0) {
    const selRow = Math.floor(selectedIndex / cols);
    scrollRow = Math.min(
      maxScrollRow,
      Math.max(0, selRow - Math.floor((maxVisibleRows - 1) / 2)),
    );
  }

  // Show whole rows only — a row sliced through the middle reads as a
  // rendering fault rather than as scrollable content.
  const visibleH = maxVisibleRows * rowPitch - cardGap;

  return {
    cols,
    headerY,
    // startY carries the scroll offset so renderer and hit-testing agree.
    startY: listTop - scrollRow * rowPitch,
    listTop,
    visibleH,
    listBottom: listTop + visibleH,
    listH,
    rowPitch,
    maxVisibleRows,
    scrollRow,
    maxScrollRow,
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

/**
 * The Forge's inventory screen. Geometry lives here, beside the settings
 * layout, so the renderer and the mouse handler read the same rects — a
 * duplicated copy of that geometry has already been a live bug in this repo.
 * Coordinates are hudW/hudH CSS pixels, never the DPR-scaled backing store.
 */
export function inventoryLayout(w, h, slotCount = 36) {
  const gap = 6;
  const cols = 9;
  const pad = 18;
  // The grid is nine columns wide whatever happens, so the cell shrinks to fit
  // rather than the panel hanging off both edges. hudW is window.innerWidth
  // with no floor, and this project targets viewports down to 420px.
  const cell = Math.max(18, Math.min(44, Math.floor((w - pad * 2 - (cols - 1) * gap) / cols)));
  const rowGap = 14; // between the backpack block and the hotbar row

  const backpackCount = Math.max(0, Math.min(slotCount, 36) - 9);
  const backpackRows = Math.ceil(backpackCount / cols);
  const hotbarCount = Math.min(slotCount, 9);

  const gridW = cols * cell + (cols - 1) * gap;
  const gridH = backpackRows * cell + Math.max(0, backpackRows - 1) * gap
    + (hotbarCount ? rowGap + cell : 0);

  const panel = {
    x: Math.round((w - gridW) / 2) - pad,
    y: Math.round((h - gridH) / 2) - pad - 10,
    w: gridW + pad * 2,
    h: gridH + pad * 2 + 20 + 12, // room for the title and the hint line
  };
  const originX = panel.x + pad;
  const originY = panel.y + pad + 20;

  const cells = [];
  // Backpack first in index order (slots 9..35), laid out above the hotbar.
  for (let i = 0; i < backpackCount; i++) {
    cells.push({
      index: 9 + i, region: "backpack", w: cell, h: cell,
      x: originX + (i % cols) * (cell + gap),
      y: originY + Math.floor(i / cols) * (cell + gap),
    });
  }
  const hotbarY = originY + backpackRows * (cell + gap) + rowGap
    - (backpackRows ? gap : 0);
  for (let i = 0; i < hotbarCount; i++) {
    cells.push({
      index: i, region: "hotbar", w: cell, h: cell,
      x: originX + i * (cell + gap), y: hotbarY,
    });
  }
  cells.sort((a, b) => a.index - b.index);
  return { panel, cells, cell, gap };
}

/**
 * Half-open variant of `hitRect` for grid cells: a cell owns its top-left
 * pixel and not the pixel past its right or bottom edge. `hitRect` is
 * inclusive on both bounds, which is fine for isolated buttons but would give
 * two neighbouring cells a shared edge pixel, handed to whichever is tested
 * first.
 */
function hitCell(rect, x, y) {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

/** @returns {{kind:"slot"|"panel"|"none", index:number}} */
export function resolveInventoryHit(layout, x, y) {
  if (!hitRect(layout.panel, x, y)) return { kind: "none", index: -1 };
  for (const c of layout.cells) {
    if (hitCell(c, x, y)) return { kind: "slot", index: c.index };
  }
  return { kind: "panel", index: -1 };
}
