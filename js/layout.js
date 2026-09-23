/**
 * Pure layout helpers shared by renderers and touch hit-testing.
 *
 * All functions are deterministic and side-effect free.
 * Compact phone support: adapts layout for landscape phones (h < COMPACT_PHONE_HEIGHT).
 */

import {
  getVisibleSettings,
  getSettingsForCategory,
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

/**
 * Geometry for the settings screen: header, sidebar, scrolled row list, and
 * every hit zone the mouse and touch handlers test against.
 *
 * The row list scrolls. `scrollY` is clamped here, so callers can pass a raw
 * accumulated value and read back the legal one.
 *
 * @param {number} scrollY - requested scroll offset in pixels, clamped to [0, maxScroll]
 * @param {boolean} follow - when true, scroll is nudged so `settingsSelection` stays on screen
 */
export function settingsLayout(
  w,
  h,
  settingsSelection,
  isTouchDevice,
  category,
  scrollY = 0,
  follow = false,
) {
  const compact = isTouchDevice && isCompactPhone(h);

  // Must match renderSettingsScreen geometry in src/ui/settings-screen.js
  const headerH = compact ? 36 : 52;
  const sideW = compact ? 90 : 160;
  const panelX = sideW + 1;
  const panelW = w - panelX - 12;
  const contentTop = headerH + 8;
  const barW = Math.min(panelW * 0.55, 240);
  const barH = 6;
  const catItemH = compact ? 28 : 38;
  // Footer band holds the description of the selected row plus the key hints.
  const footerH = compact ? 34 : 52;
  const viewTop = contentTop;
  const viewH = Math.max(catItemH, h - viewTop - footerH);

  const visibleDefs = category
    ? getSettingsForCategory(isTouchDevice, category)
    : getVisibleSettings(isTouchDevice);
  const itemHeights = visibleDefs.map((def) =>
    compact ? def.height.compact : def.height.normal,
  );
  const totalH = itemHeights.reduce((a, b) => a + b, 0);
  const maxScroll = Math.max(0, totalH - viewH);

  // Offset of each row from the top of the (unscrolled) list.
  const offsets = [];
  let acc = 0;
  for (const ih of itemHeights) {
    offsets.push(acc);
    acc += ih;
  }

  let scroll = Math.max(0, Math.min(maxScroll, scrollY));
  if (follow && settingsSelection >= 0 && settingsSelection < offsets.length) {
    const selTop = offsets[settingsSelection];
    const selBottom = selTop + itemHeights[settingsSelection];
    if (selTop < scroll) scroll = selTop;
    else if (selBottom > scroll + viewH) scroll = selBottom - viewH;
    scroll = Math.max(0, Math.min(maxScroll, scroll));
  }

  // Hit zones. Arrow zones are at least 44px so a thumb can land on them.
  const inset = compact ? 8 : 14;
  const zoneW = Math.max(44, compact ? 44 : 56);
  const rows = visibleDefs.map((def, i) => {
    const y = viewTop + offsets[i] - scroll;
    const rowH = itemHeights[i];
    const incX = panelX + panelW - inset - zoneW;
    const decX = incX - zoneW;
    const sliderX = panelX + inset;
    const sliderW = Math.min(panelW - inset * 2, barW);
    return {
      def,
      index: i,
      y,
      h: rowH,
      // A row is drawn only when some part of it sits inside the view band.
      visible: y + rowH > viewTop && y < viewTop + viewH,
      decZone: { x: decX, y, w: zoneW, h: rowH },
      incZone: { x: incX, y, w: zoneW, h: rowH },
      slider:
        def.type === 'slider'
          ? {
              x: sliderX,
              y: y + (compact ? 20 : 28),
              w: sliderW,
              h: barH,
              // Generous vertical grab band for touch.
              hitY: y + (compact ? 12 : 18),
              hitH: compact ? 22 : 26,
            }
          : null,
    };
  });

  const catRects = [];
  // On touch the back button is the only way out of this screen, so it gets a
  // full 44px target rather than the 24px the desktop chrome uses.
  const backH = isTouchDevice ? 44 : compact ? 24 : 28;
  const backBtn = {
    x: 8,
    y: h - backH - (isTouchDevice ? 12 : 20),
    w: sideW - 16,
    h: backH,
  };

  return {
    headerH,
    sideW,
    panelX,
    panelW,
    barW,
    barH,
    contentTop,
    catItemH,
    itemHeights,
    totalH,
    compact,
    visibleDefs,
    // Scrolling
    footerH,
    viewTop,
    viewH,
    scrollY: scroll,
    maxScroll,
    offsets,
    rows,
    inset,
    zoneW,
    catRects,
    backBtn,
  };
}

/**
 * Category rows in the sidebar. Kept separate from settingsLayout because the
 * visible category list depends on live settings, which the pure layout does
 * not read.
 */
export function settingsCategoryRects(layout, cats) {
  const { sideW, contentTop, catItemH, backBtn } = layout;
  // The list has to clear the back button and the Q/E hint above it, or the
  // last categories are drawn underneath them and cannot be clicked.
  const available = backBtn.y - 34 - contentTop;
  const itemH =
    cats.length > 0
      ? Math.max(22, Math.min(catItemH, Math.floor(available / cats.length)))
      : catItemH;
  return cats.map((cat, ci) => ({
    cat,
    x: 0,
    y: contentTop + ci * itemH - 2,
    w: sideW,
    h: itemH,
  }));
}

/**
 * Which part of a settings row the pointer is over.
 * @returns {'slider'|'dec'|'inc'|'row'|null}
 */
export function settingsZoneAt(row, x, y) {
  if (y < row.y || y >= row.y + row.h) return null;
  const s = row.slider;
  if (s && y >= s.hitY && y < s.hitY + s.hitH && x >= s.x && x <= s.x + s.w) return "slider";
  if (x >= row.decZone.x && x < row.decZone.x + row.decZone.w) return "dec";
  if (x >= row.incZone.x && x < row.incZone.x + row.incZone.w) return "inc";
  return "row";
}

/**
 * Resolve a pointer position on the settings screen to the thing it hit.
 * Mouse and touch both go through this, so the two can never drift apart.
 *
 * @returns {{kind:'category',cat:string}
 *          |{kind:'row',index:number,zone:string,pct?:number}
 *          |{kind:'back'}
 *          |{kind:'none'}}
 */
export function resolveSettingsHit(layout, catRects, x, y) {
  if (hitRect(layout.backBtn, x, y)) return { kind: "back" };

  if (x < layout.sideW && y > layout.headerH) {
    for (const r of catRects) {
      if (hitRect(r, x, y)) return { kind: "category", cat: r.cat };
    }
    return { kind: "none" };
  }

  // Outside the scrolling band (header gap or footer) nothing is hit.
  if (y < layout.viewTop || y > layout.viewTop + layout.viewH) return { kind: "none" };

  for (const row of layout.rows) {
    if (!row.visible) continue;
    const zone = settingsZoneAt(row, x, y);
    if (!zone) continue;
    if (zone === "slider") {
      const pct = Math.max(0, Math.min(1, (x - row.slider.x) / row.slider.w));
      return { kind: "row", index: row.index, zone, pct };
    }
    return { kind: "row", index: row.index, zone };
  }
  return { kind: "none" };
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
