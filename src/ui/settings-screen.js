import {
  getVisibleCategories, getSettingsForCategory, settingDisplayItem, DEFAULT_SETTINGS,
} from '../../js/settings-registry.js';
import { settingsLayout, settingsCategoryRects, settingsZoneAt } from '../../js/layout.js';
import { drawCrosshair } from './crosshair.js';
import { isModernArt } from '../rendering/art-style.js';
import {
  UI, uiFont, drawBackdrop, drawPanel, drawTitle, drawBar, drawButton, drawKeycap, drawCaption,
} from './modern-ui-kit.js';

// ─── Design tokens ──────────────────────────────────────────────────────────
const ACCENT = '#00ffcc';
const ACCENT_DIM = 'rgba(0,255,200,0.15)';
const SIDEBAR_BG = 'rgba(0,10,24,0.7)';
const PANEL_BG_OVERLAY = 'rgba(0,0,0,0.92)';
const ROW_SELECT_BG = 'rgba(0,200,255,0.12)';
const ROW_SELECT_BORDER = 'rgba(0,220,255,0.45)';
const ROW_HOVER_BG = 'rgba(0,200,255,0.05)';
const ROW_DIVIDER = 'rgba(255,255,255,0.04)';
const MODIFIED_DOT = '#ffcc44';

// Every category needs an entry. A missing one used to fall back to the shared
// accent, which made Performance and Gamepad indistinguishable from Gameplay.
const CATEGORY_COLORS = {
  Gameplay: '#00ffcc', Display: '#00ccff', Performance: '#ff9944', Audio: '#00ff88',
  Controls: '#ffcc00', Gamepad: '#cc88ff', Accessibility: '#aaaacc', HUD: '#44ffaa',
  Mobile: '#ff88cc',
};

/** True when the player has moved this setting off its shipped default. */
function isModified(def, settings) {
  return def.type !== 'action' && settings[def.key] !== DEFAULT_SETTINGS[def.key];
}

/** Shared geometry + data for one frame of the settings screen. */
function frame(w, h, state) {
  const { isTouchDevice, settingsCategory, settingsSelection, settings } = state;
  const cats = getVisibleCategories(isTouchDevice, settings);
  // follow=false: the input layer owns scroll. Re-following here would snap
  // the view back to the selection on every frame and kill wheel scrolling.
  const layout = settingsLayout(
    w, h, settingsSelection, isTouchDevice, settingsCategory,
    state.settingsScroll || 0, false,
  );
  const defs = getSettingsForCategory(isTouchDevice, settingsCategory, settings);
  const items = defs.map((def) => settingDisplayItem(def, settings));
  return { layout, cats, catRects: settingsCategoryRects(layout, cats), defs, items };
}

/** Count of settings in a category that differ from their default. */
function modifiedCount(cat, isTouchDevice, settings) {
  return getSettingsForCategory(isTouchDevice, cat, settings)
    .filter((def) => isModified(def, settings)).length;
}

// ─── Small private renderers ────────────────────────────────────────────────

/**
 * Largest font size at or below `base` that fits `text` into `maxW`.
 * Long category names (ACCESSIBILITY, PERFORMANCE) overflowed the sidebar on
 * narrow and compact layouts.
 */
function fitSize(ctx, text, maxW, base, font) {
  for (let size = base; size > 7; size--) {
    ctx.font = font(size);
    if (ctx.measureText(text).width <= maxW) return size;
  }
  return 8;
}

/** Glowing screen header with divider underneath. */
function drawHeader(ctx, w, headerH, compact) {
  ctx.save();
  ctx.shadowColor = ACCENT;
  ctx.shadowBlur = 12;
  ctx.fillStyle = ACCENT;
  ctx.font = `bold ${compact ? 18 : 28}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('SETTINGS', w / 2, compact ? 24 : 38);
  ctx.restore();

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, 'rgba(0,255,200,0)');
  grad.addColorStop(0.5, 'rgba(0,255,200,0.30)');
  grad.addColorStop(1, 'rgba(0,255,200,0)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, headerH);
  ctx.lineTo(w, headerH);
  ctx.stroke();
}

/** Vertical category list (left sidebar). */
function drawSidebar(ctx, layout, catRects, settingsCategory, mx, my, isTouchDevice, settings) {
  const { sideW, headerH, compact } = layout;
  const h = layout.backBtn.y + 48;
  ctx.fillStyle = SIDEBAR_BG;
  ctx.fillRect(0, headerH, sideW, h - headerH);

  ctx.strokeStyle = 'rgba(0,160,120,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sideW, headerH);
  ctx.lineTo(sideW, h);
  ctx.stroke();

  for (const r of catRects) {
    const isActive = r.cat === settingsCategory;
    const isHovered = !isActive && mx >= 0 && mx < sideW && my >= r.y && my < r.y + r.h;
    const color = CATEGORY_COLORS[r.cat] || ACCENT;

    if (isActive) {
      ctx.fillStyle = ACCENT_DIM;
      ctx.fillRect(0, r.y, sideW, r.h);
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = color;
      ctx.fillRect(0, r.y, 3, r.h);
      ctx.restore();
    } else if (isHovered) {
      ctx.fillStyle = 'rgba(0,220,170,0.07)';
      ctx.fillRect(0, r.y, sideW, r.h);
    }

    const label = r.cat.toUpperCase();
    const legacyFont = (px) => `bold ${px}px monospace`;
    ctx.fillStyle = isActive ? color : isHovered ? '#88aacc' : '#445566';
    ctx.font = legacyFont(
      fitSize(ctx, label, sideW - 20, compact ? 11 : 15, legacyFont),
    );
    ctx.textAlign = 'center';
    ctx.fillText(label, sideW / 2, r.y + r.h / 2 + (compact ? 4 : 5));

    const mods = modifiedCount(r.cat, isTouchDevice, settings);
    if (mods > 0) {
      ctx.fillStyle = MODIFIED_DOT;
      ctx.beginPath();
      ctx.arc(sideW - (compact ? 8 : 12), r.y + r.h / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Scroll indicator for the row list. Drawn only when the list overflows. */
function drawScrollbar(ctx, layout, track, thumb) {
  if (layout.maxScroll <= 0) return;
  const { panelX, panelW, viewTop, viewH, totalH, scrollY } = layout;
  const x = panelX + panelW - 4;
  ctx.fillStyle = track;
  ctx.fillRect(x, viewTop, 3, viewH);
  const thumbH = Math.max(24, viewH * (viewH / totalH));
  const thumbY = viewTop + (viewH - thumbH) * (scrollY / layout.maxScroll);
  ctx.fillStyle = thumb;
  ctx.fillRect(x, thumbY, 3, thumbH);
}

/** Crosshair-preview sub-widget. */
function drawCrosshairPreview(ctx, prevX, prevY, settings) {
  ctx.fillStyle = 'rgba(30,30,50,0.8)';
  ctx.fillRect(prevX - 40, prevY - 18, 80, 36);
  ctx.strokeStyle = 'rgba(0,200,255,0.22)';
  ctx.strokeRect(prevX - 40, prevY - 18, 80, 36);
  if (settings.crosshair < 5) {
    drawCrosshair(ctx, prevX, prevY, settings.crosshair);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('(none)', prevX, prevY + 4);
    ctx.textAlign = 'left';
  }
}

/** Slider sub-widget with glowing thumb when selected. */
function drawSliderWidget(ctx, def, settings, rect, selected) {
  const val = settings[def.key];
  const pct = (val - def.min) / (def.max - def.min);

  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = def.barColor(val);
  ctx.fillRect(rect.x, rect.y, rect.w * pct, rect.h);
  ctx.strokeStyle = 'rgba(0,200,255,0.18)';
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

  const thumbX = rect.x + rect.w * pct;
  ctx.save();
  if (selected) {
    ctx.shadowColor = ACCENT;
    ctx.shadowBlur = 8;
  }
  ctx.fillStyle = selected ? ACCENT : '#88bbcc';
  ctx.beginPath();
  ctx.arc(thumbX, rect.y + rect.h / 2, selected ? 6 : 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Single setting row: label, value, optional slider/preview widget. */
function drawSettingRow(ctx, args) {
  const {
    def, item, row, selected, layout, isRowHovered, settings, labelSize, hoverZone,
  } = args;
  const { panelX, panelW, compact, inset } = layout;
  const { y, h: itemH } = row;

  if (selected) {
    ctx.fillStyle = ROW_SELECT_BG;
    ctx.fillRect(panelX, y, panelW, itemH);
    ctx.strokeStyle = ROW_SELECT_BORDER;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(panelX + 0.5, y + 0.5, panelW - 1, itemH - 1);
    ctx.fillStyle = ACCENT;
    ctx.fillRect(panelX, y, 2, itemH);
  } else if (isRowHovered) {
    ctx.fillStyle = ROW_HOVER_BG;
    ctx.fillRect(panelX, y, panelW, itemH);
  } else if (row.index > 0) {
    ctx.strokeStyle = ROW_DIVIDER;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 8, y);
    ctx.lineTo(panelX + panelW - 8, y);
    ctx.stroke();
  }

  const textY = y + (compact ? 15 : 20);
  const labelX = panelX + inset + (compact ? 6 : 8);

  if (isModified(def, settings)) {
    ctx.fillStyle = MODIFIED_DOT;
    ctx.beginPath();
    ctx.arc(panelX + inset - 2, textY - 5, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = selected ? ACCENT : isRowHovered ? '#aaddcc' : '#8888aa';
  ctx.font = `bold ${labelSize}px monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(item.label, labelX, textY);

  // Value with hit-visible steppers. The arrows sit inside decZone/incZone so
  // what the player clicks is what they see.
  ctx.textAlign = 'center';
  ctx.font = `bold ${labelSize}px monospace`;
  const decMid = row.decZone.x + row.decZone.w / 2;
  const incMid = row.incZone.x + row.incZone.w / 2;
  if (def.type !== 'action') {
    ctx.fillStyle = hoverZone === 'dec' ? ACCENT : selected ? '#ccffee' : '#556677';
    ctx.fillText('<', decMid, textY);
    ctx.fillStyle = hoverZone === 'inc' ? ACCENT : selected ? '#ccffee' : '#556677';
    ctx.fillText('>', incMid, textY);
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = item.color || (selected ? '#ffffff' : isRowHovered ? '#ccccee' : '#aaaacc');
  if (selected) {
    ctx.save();
    ctx.shadowColor = item.color || ACCENT;
    ctx.shadowBlur = 4;
    ctx.fillText(item.value, row.decZone.x - 6, textY);
    ctx.restore();
  } else {
    ctx.fillText(item.value, row.decZone.x - 6, textY);
  }

  if (def.widget === 'crosshairPreview') {
    drawCrosshairPreview(ctx, panelX + panelW / 2, y + 46, settings);
  } else if (def.type === 'slider' && def.barColor && row.slider) {
    drawSliderWidget(ctx, def, settings, row.slider, selected);
  }
}

/** Empty-state placeholder when a category has no settings. */
function drawEmptyCategory(ctx, layout) {
  const { panelX, panelW, viewTop, viewH } = layout;
  ctx.fillStyle = '#445566';
  ctx.font = '13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('No settings in this category.', panelX + panelW / 2, viewTop + viewH / 2);
  ctx.textAlign = 'left';
}

/**
 * Footer band: what the highlighted setting does, then the key hints.
 * 47 settings with names like "Chromatic Aberration" are unreadable without it.
 */
function drawFooter(ctx, w, h, layout, def, isTouchDevice, colors) {
  const { compact, footerH, panelX } = layout;
  const top = h - footerH;
  ctx.fillStyle = colors.bg;
  ctx.fillRect(panelX, top, w - panelX, footerH);
  ctx.strokeStyle = colors.rule;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(panelX, top + 0.5);
  ctx.lineTo(w, top + 0.5);
  ctx.stroke();

  if (def?.desc) {
    ctx.fillStyle = colors.desc;
    ctx.font = colors.descFont(compact ? 11 : 13);
    ctx.textAlign = 'left';
    ctx.fillText(def.desc, panelX + 14, top + (compact ? 14 : 20));
  }

  ctx.fillStyle = colors.hint;
  ctx.font = colors.hintFont(compact ? 9 : 11);
  ctx.textAlign = 'left';
  ctx.fillText(
    isTouchDevice
      ? 'Tap ◀ ▶ to change  ·  Tap a bar to set it  ·  Swipe the list to scroll'
      : 'ARROWS adjust  ·  WHEEL scroll  ·  Q/E category  ·  BACKSPACE reset  ·  ESC back',
    panelX + 14, top + (compact ? 27 : 39),
  );
  ctx.textAlign = 'left';
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Pure render function for the settings screen.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {{ isTouchDevice, settingsCategory, settingsSelection, settings,
 *           mouseX, mouseY, settingsScroll }} state
 */
export function renderSettingsScreen(ctx, w, h, state) {
  if (isModernArt()) {
    renderSettingsScreenModern(ctx, w, h, state);
    return;
  }

  const {
    isTouchDevice, settingsCategory, settingsSelection, settings,
    mouseX: mx, mouseY: my,
  } = state;
  const { layout, catRects, defs, items } = frame(w, h, state);
  const { compact, sideW, panelX, panelW, headerH, viewTop, viewH } = layout;

  ctx.fillStyle = PANEL_BG_OVERLAY;
  ctx.fillRect(0, 0, w, h);

  // Content surface behind the rows. Without it the settings sat directly on
  // the dimmed gameplay frame, so a short category (Gameplay has three rows)
  // read as a broken panel with the live arena showing through the gap.
  ctx.fillStyle = 'rgba(6,12,20,0.82)';
  ctx.fillRect(sideW + 1, headerH, w - sideW - 1, h - headerH);

  drawHeader(ctx, w, headerH, compact);
  drawSidebar(ctx, layout, catRects, settingsCategory, mx, my, isTouchDevice, settings);

  // Back button (hit rect comes from the layout, so click and paint agree).
  const b = layout.backBtn;
  const backHovered = mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
  ctx.fillStyle = backHovered ? ACCENT : '#667788';
  ctx.font = `bold ${compact ? 12 : 14}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('< BACK', b.x + b.w / 2, b.y + b.h - (compact ? 7 : 9));

  if (defs.length === 0) {
    drawEmptyCategory(ctx, layout);
  } else {
    ctx.save();
    ctx.beginPath();
    ctx.rect(panelX, viewTop, panelW, viewH);
    ctx.clip();
    const labelSize = compact ? 12 : 16;
    for (const row of layout.rows) {
      if (!row.visible) continue;
      const i = row.index;
      const selected = settingsSelection === i;
      const inRow = mx >= panelX && mx <= panelX + panelW && my >= row.y && my < row.y + row.h;
      const hoverZone = settingsZoneAt(row, mx, my);
      drawSettingRow(ctx, {
        def: defs[i], item: items[i], row, selected, layout,
        isRowHovered: !selected && inRow, settings, labelSize, hoverZone,
      });
    }
    ctx.restore();
    drawScrollbar(ctx, layout, 'rgba(255,255,255,0.06)', 'rgba(0,220,200,0.5)');
  }

  drawFooter(ctx, w, h, layout, defs[settingsSelection], isTouchDevice, {
    bg: 'rgba(3,8,14,0.92)',
    rule: 'rgba(0,255,200,0.18)',
    desc: '#8fb6c8',
    hint: '#5a6a7a',
    descFont: (px) => `${px}px monospace`,
    hintFont: (px) => `${px}px monospace`,
  });
  ctx.textAlign = 'left';
}

// ─── Modern art style ───────────────────────────────────────────────────────
// Same geometry as the legacy screen — both read js/layout.js settingsLayout,
// as do the mouse and touch hit tests.

function modernToggle(ctx, right, cy, on, selected, compact) {
  const tw = compact ? 30 : 40;
  const th = compact ? 14 : 18;
  const tx = right - tw;
  const ty = Math.round(cy - th / 2);
  ctx.fillStyle = UI.ink;
  ctx.beginPath();
  ctx.roundRect(tx - 1.5, ty - 1.5, tw + 3, th + 3, (th + 3) / 2);
  ctx.fill();
  ctx.fillStyle = on ? (selected ? '#0f7c8f' : '#0b5563') : '#0d151e';
  ctx.beginPath();
  ctx.roundRect(tx, ty, tw, th, th / 2);
  ctx.fill();
  ctx.fillStyle = on ? 'rgba(125,242,255,0.35)' : 'rgba(130,160,188,0.12)';
  ctx.fillRect(tx + th / 2, ty + 2, tw - th, 1);
  const r = th / 2 - 2.5;
  const kx = on ? tx + tw - th / 2 : tx + th / 2;
  const ky = ty + th / 2;
  ctx.fillStyle = UI.ink;
  ctx.beginPath();
  ctx.arc(kx, ky, r + 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = on ? '#e8fbff' : '#5b6f83';
  ctx.beginPath();
  ctx.arc(kx, ky, r, 0, Math.PI * 2);
  ctx.fill();
  return tw;
}

function modernSlider(ctx, def, settings, rect, selected, compact) {
  const val = settings[def.key];
  const pct = (val - def.min) / (def.max - def.min);
  drawBar(ctx, rect.x, rect.y, rect.w, rect.h, pct, def.barColor(val),
    { segments: 10, glow: selected ? 0.4 : 0, edge: false });
  const tx = Math.round(rect.x + rect.w * pct);
  const tH = compact ? 12 : 16;
  const tW = compact ? 7 : 9;
  const ty = Math.round(rect.y + rect.h / 2 - tH / 2);
  ctx.fillStyle = UI.ink;
  ctx.fillRect(tx - tW / 2 - 1, ty - 1, tW + 2, tH + 2);
  ctx.fillStyle = selected ? '#7df2ff' : '#6f8aa3';
  ctx.fillRect(tx - tW / 2, ty, tW, tH);
  ctx.fillStyle = 'rgba(4,6,11,0.55)';
  for (let k = 3; k < tH - 2; k += 3) ctx.fillRect(tx - tW / 2 + 2, ty + k, tW - 4, 1);
}

function renderSettingsScreenModern(ctx, w, h, state) {
  const {
    isTouchDevice, settingsCategory, settingsSelection, settings,
    mouseX: mx, mouseY: my,
  } = state;
  const { layout, catRects, defs, items } = frame(w, h, state);
  const { compact, sideW, panelX, panelW, headerH, viewTop, viewH, inset } = layout;

  drawBackdrop(ctx, w, h, 'steel', 0.97);

  // Header band + sidebar column.
  drawPanel(ctx, -6, -6, w + 12, headerH + 6, { variant: 'menu', chamfer: 0 });
  drawTitle(ctx, 'SETTINGS', w / 2, compact ? 25 : 37, compact ? 18 : 28, UI.cyan);
  drawPanel(ctx, -6, headerH - 1, sideW + 7, h - headerH + 8, { variant: 'menu', chamfer: 0 });
  ctx.fillStyle = UI.ink;
  ctx.fillRect(0, headerH - 1, w, 2);
  ctx.fillRect(sideW - 1, headerH, 2, h - headerH);
  ctx.fillStyle = 'rgba(34,230,255,0.35)';
  ctx.fillRect(0, headerH + 1, w, 1);

  ctx.textAlign = 'left';
  for (const r of catRects) {
    const isActive = r.cat === settingsCategory;
    const isHovered = !isActive && mx >= 0 && mx < sideW && my >= r.y && my < r.y + r.h;
    const color = CATEGORY_COLORS[r.cat] || UI.cyan;
    if (isActive) {
      drawPanel(ctx, 6, r.y + 1, sideW - 14, r.h - 4,
        { variant: 'raised', accent: color, bar: true, chamfer: compact ? 5 : 8 });
    } else if (isHovered) {
      ctx.fillStyle = 'rgba(130,160,188,0.08)';
      ctx.fillRect(6, r.y + 1, sideW - 14, r.h - 4);
    }
    const label = r.cat.toUpperCase();
    const labelX = compact ? 14 : 20;
    const weight = isActive ? 800 : 600;
    const modernFont = (px) => uiFont(px, weight);
    ctx.letterSpacing = compact ? '0.5px' : '1.5px';
    ctx.font = modernFont(
      fitSize(ctx, label, sideW - labelX - 16, compact ? 11 : 14, modernFont),
    );
    ctx.fillStyle = isActive ? '#ffffff' : isHovered ? '#c9d6e2' : UI.textDim;
    ctx.textAlign = 'left';
    ctx.fillText(label, labelX, r.y + r.h / 2 + (compact ? 4 : 5));
    ctx.letterSpacing = '0px';

    if (modifiedCount(r.cat, isTouchDevice, settings) > 0) {
      ctx.fillStyle = MODIFIED_DOT;
      ctx.beginPath();
      ctx.arc(sideW - (compact ? 12 : 16), r.y + r.h / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Sidebar footer: category hint + back button.
  const b = layout.backBtn;
  const backHovered = mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
  if (!compact) {
    const kw = drawKeycap(ctx, 14, b.y - 28, 'Q', { size: 9 });
    const kw2 = drawKeycap(ctx, 14 + kw + 4, b.y - 28, 'E', { size: 9 });
    ctx.font = uiFont(10, 600);
    ctx.fillStyle = UI.textDim;
    ctx.fillText('CATEGORY', 14 + kw + kw2 + 12, b.y - 16);
  }
  drawButton(ctx, b.x, b.y, b.w, b.h, '‹ Back', backHovered ? 'focus' : 'idle', UI.cyan,
    { size: compact ? 11 : 13 });

  if (defs.length === 0) {
    ctx.fillStyle = UI.textDim;
    ctx.font = uiFont(14, 600);
    ctx.textAlign = 'center';
    ctx.fillText('No settings in this category.', panelX + panelW / 2, viewTop + viewH / 2);
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(panelX, viewTop, panelW, viewH);
  ctx.clip();

  const labelSize = compact ? 12 : 16;
  for (const row of layout.rows) {
    if (!row.visible) continue;
    const i = row.index;
    const def = defs[i];
    const item = items[i];
    const selected = settingsSelection === i;
    const inRow = mx >= panelX && mx <= panelX + panelW && my >= row.y && my < row.y + row.h;
    const isRowHovered = !selected && inRow;
    const hoverZone = settingsZoneAt(row, mx, my);
    const y = row.y;
    const itemH = row.h;
    const textY = y + (compact ? 15 : 20);

    if (selected) {
      drawPanel(ctx, panelX + 4, y, panelW - 4, itemH - 1,
        { variant: 'raised', accent: UI.cyan, bar: true, chamfer: compact ? 6 : 10 });
    } else {
      if (isRowHovered) {
        ctx.fillStyle = 'rgba(130,160,188,0.07)';
        ctx.fillRect(panelX + 4, y, panelW - 4, itemH - 1);
      }
      if (i > 0) {
        ctx.fillStyle = 'rgba(130,160,188,0.1)';
        ctx.fillRect(panelX + 14, y, panelW - 24, 1);
      }
    }

    if (isModified(def, settings)) {
      ctx.fillStyle = MODIFIED_DOT;
      ctx.beginPath();
      ctx.arc(panelX + inset - 2, textY - 5, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = 'left';
    ctx.font = uiFont(labelSize, selected ? 700 : 600);
    ctx.fillStyle = selected ? '#ffffff' : isRowHovered ? '#dbe6ef' : '#b3c2d0';
    ctx.fillText(item.label, panelX + inset + 6, textY);

    const midY = textY - labelSize * 0.35;
    if (def.type === 'action') {
      drawCaption(ctx, panelX + panelW - inset, midY - (compact ? 9 : 11), item.value,
        { size: compact ? 10 : 12, scheme: selected ? 'violet' : 'steel', align: 'right' });
    } else if (def.type === 'toggle') {
      const on = item.value === 'ON';
      const tw = modernToggle(ctx, row.incZone.x + row.incZone.w, midY, on, selected, compact);
      ctx.textAlign = 'right';
      ctx.font = uiFont(compact ? 10 : 12, 700);
      ctx.fillStyle = on ? (selected ? UI.cyan : '#7fdcec') : UI.textFaint;
      ctx.fillText(item.value, row.incZone.x + row.incZone.w - tw - 8, textY);
    } else {
      ctx.textAlign = 'center';
      ctx.font = uiFont(labelSize, 800);
      ctx.fillStyle = hoverZone === 'dec' ? UI.cyan : selected ? '#cfe9f4' : UI.textFaint;
      ctx.fillText('◀', row.decZone.x + row.decZone.w / 2, textY - 1);
      ctx.fillStyle = hoverZone === 'inc' ? UI.cyan : selected ? '#cfe9f4' : UI.textFaint;
      ctx.fillText('▶', row.incZone.x + row.incZone.w / 2, textY - 1);
      ctx.textAlign = 'right';
      ctx.font = uiFont(labelSize, 800);
      ctx.fillStyle = item.color || (selected ? '#ffffff' : '#c9d6e2');
      ctx.fillText(item.value, row.decZone.x - 6, textY);
    }

    if (def.widget === 'crosshairPreview') {
      const px = panelX + panelW / 2;
      const py = y + 46;
      drawPanel(ctx, px - 40, py - 18, 80, 36, { variant: 'well', chamfer: 6 });
      if (settings.crosshair < 5) {
        drawCrosshair(ctx, px, py, settings.crosshair);
      } else {
        ctx.fillStyle = UI.textFaint;
        ctx.font = uiFont(11, 600);
        ctx.textAlign = 'center';
        ctx.fillText('NONE', px, py + 4);
      }
    } else if (def.type === 'slider' && def.barColor && row.slider) {
      modernSlider(ctx, def, settings, row.slider, selected, compact);
    }
  }
  ctx.restore();
  drawScrollbar(ctx, layout, 'rgba(130,160,188,0.12)', 'rgba(34,230,255,0.55)');

  drawFooter(ctx, w, h, layout, defs[settingsSelection], isTouchDevice, {
    bg: 'rgba(8,13,20,0.94)',
    rule: 'rgba(34,230,255,0.22)',
    desc: '#9fb6c8',
    hint: UI.textFaint,
    descFont: (px) => uiFont(px, 600),
    hintFont: (px) => uiFont(px, 600),
  });
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';
}
