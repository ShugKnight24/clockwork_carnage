import { getVisibleCategories, getSettingsForCategory, settingDisplayItem } from '../../js/settings-registry.js';
import { isCompactPhone } from '../../js/layout.js';
import { drawCrosshair } from './crosshair.js';
import { isModernArt } from '../rendering/art-style.js';
import {
  UI, uiFont, drawBackdrop, drawPanel, drawTitle, drawBar, drawButton, drawKeycap, drawCaption,
} from './modern-ui-kit.js';

// ─── Design tokens ──────────────────────────────────────────────────────────
const ACCENT = '#00ffcc';
const ACCENT_DIM = 'rgba(0,255,200,0.15)';
const ACCENT_FAINT = 'rgba(0,255,200,0.05)';
const SIDEBAR_BG = 'rgba(0,10,24,0.7)';
const PANEL_BG_OVERLAY = 'rgba(0,0,0,0.92)';
const ROW_SELECT_BG = 'rgba(0,200,255,0.12)';
const ROW_SELECT_BORDER = 'rgba(0,220,255,0.45)';
const ROW_HOVER_BG = 'rgba(0,200,255,0.05)';
const ROW_DIVIDER = 'rgba(255,255,255,0.04)';
const CATEGORY_COLORS = {
  Gameplay: '#00ffcc', Display: '#00ccff', Audio: '#00ff88',
  Controls: '#ffcc00', Accessibility: '#aaaacc', HUD: '#44ffaa',
  Mobile: '#ff88cc',
};

// ─── Small private renderers ────────────────────────────────────────────────

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

  // Divider with subtle gradient
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0,    'rgba(0,255,200,0)');
  grad.addColorStop(0.5,  'rgba(0,255,200,0.30)');
  grad.addColorStop(1,    'rgba(0,255,200,0)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, headerH);
  ctx.lineTo(w, headerH);
  ctx.stroke();
}

/** Vertical category list (left sidebar). */
function drawSidebar(ctx, sideW, headerH, h, contentTop, compact, cats, settingsCategory, mx, my) {
  ctx.fillStyle = SIDEBAR_BG;
  ctx.fillRect(0, headerH, sideW, h - headerH);

  ctx.strokeStyle = 'rgba(0,160,120,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sideW, headerH);
  ctx.lineTo(sideW, h);
  ctx.stroke();

  const catItemH = compact ? 28 : 38;
  for (let ci = 0; ci < cats.length; ci++) {
    const cat = cats[ci];
    const isActive = cat === settingsCategory;
    const cy = contentTop + ci * catItemH;
    const isHovered = !isActive && mx >= 0 && mx < sideW && my >= cy - 2 && my < cy - 2 + catItemH;
    const color = CATEGORY_COLORS[cat] || ACCENT;

    if (isActive) {
      ctx.fillStyle = ACCENT_DIM;
      ctx.fillRect(0, cy - 2, sideW, catItemH);
      // Accent bar with glow
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = color;
      ctx.fillRect(0, cy - 2, 3, catItemH);
      ctx.restore();
    } else if (isHovered) {
      ctx.fillStyle = 'rgba(0,220,170,0.07)';
      ctx.fillRect(0, cy - 2, sideW, catItemH);
    }

    ctx.fillStyle = isActive ? color : isHovered ? '#88aacc' : '#445566';
    ctx.font = `bold ${compact ? 11 : 15}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(cat.toUpperCase(), sideW / 2, cy + (compact ? 16 : 22));
  }
}

/** Footer of sidebar: back button + nav-key hint. */
function drawSidebarFooter(ctx, sideW, h, compact, mx, my) {
  const backY = h - 32;
  const backHovered = mx >= 0 && mx < sideW && my >= backY - 14 && my < backY + 10;
  ctx.fillStyle = backHovered ? ACCENT : '#667788';
  ctx.font = `bold ${compact ? 12 : 14}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('< BACK', sideW / 2, backY);

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#b0e0ff';
  ctx.font = compact ? '9px monospace' : '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Q/E: Category', sideW / 2, h - 54);
  ctx.restore();
}

/** Single setting row: label, value, optional slider/preview widget. */
function drawSettingRow(ctx, args) {
  const {
    def, item, selected, panelX, panelW, y, itemH, compact, labelSize,
    isRowHovered, settings, barW, barH, drawDivider,
  } = args;

  // Selection / hover background
  if (selected) {
    ctx.fillStyle = ROW_SELECT_BG;
    ctx.fillRect(panelX, y - 2, panelW, itemH);
    ctx.strokeStyle = ROW_SELECT_BORDER;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(panelX + 0.5, y - 1.5, panelW - 1, itemH - 1);
    // Left accent bar matching selection ring
    ctx.fillStyle = ACCENT;
    ctx.fillRect(panelX, y - 2, 2, itemH);
  } else if (isRowHovered) {
    ctx.fillStyle = ROW_HOVER_BG;
    ctx.fillRect(panelX, y - 2, panelW, itemH);
  }

  if (drawDivider) {
    ctx.strokeStyle = ROW_DIVIDER;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 8, y - 2);
    ctx.lineTo(panelX + panelW - 8, y - 2);
    ctx.stroke();
  }

  // Label
  ctx.fillStyle = selected ? ACCENT : isRowHovered ? '#aaddcc' : '#8888aa';
  ctx.font = `bold ${labelSize}px monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(item.label, panelX + (compact ? 8 : 14), y + (compact ? 13 : 18));

  // Value (right-aligned)
  ctx.textAlign = 'right';
  ctx.fillStyle = item.color || (selected ? '#ffffff' : isRowHovered ? '#ccccee' : '#aaaacc');
  ctx.font = `bold ${labelSize}px monospace`;
  if (selected) {
    ctx.save();
    ctx.shadowColor = item.color || ACCENT;
    ctx.shadowBlur = 4;
    ctx.fillText(`< ${item.value} >`, panelX + panelW - (compact ? 8 : 14), y + (compact ? 13 : 18));
    ctx.restore();
  } else {
    ctx.fillText(`< ${item.value} >`, panelX + panelW - (compact ? 8 : 14), y + (compact ? 13 : 18));
  }

  // Widgets
  if (def.widget === 'crosshairPreview') {
    drawCrosshairPreview(ctx, panelX + panelW / 2, y + 44, settings);
  } else if (def.type === 'slider' && def.barColor) {
    drawSliderWidget(ctx, {
      def, settings, panelX, panelW, y, compact, barH, barW, selected,
    });
  }
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
function drawSliderWidget(ctx, args) {
  const { def, settings, panelX, panelW, y, compact, barH, barW, selected } = args;
  const sliderY = y + (compact ? 20 : 28);
  const val = settings[def.key];
  const pct = (val - def.min) / (def.max - def.min);
  const sliderX = panelX + (compact ? 8 : 14);
  const sliderW = Math.min(panelW - (compact ? 16 : 28), barW);

  // Track
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fillRect(sliderX, sliderY, sliderW, barH);

  // Filled portion
  ctx.fillStyle = def.barColor(val);
  ctx.fillRect(sliderX, sliderY, sliderW * pct, barH);

  ctx.strokeStyle = 'rgba(0,200,255,0.18)';
  ctx.lineWidth = 1;
  ctx.strokeRect(sliderX, sliderY, sliderW, barH);

  // Thumb (glow if selected)
  const thumbX = sliderX + sliderW * pct;
  const thumbR = compact ? 4 : 5;
  ctx.save();
  if (selected) {
    ctx.shadowColor = ACCENT;
    ctx.shadowBlur = 8;
  }
  ctx.fillStyle = selected ? ACCENT : '#88bbcc';
  ctx.beginPath();
  ctx.arc(thumbX, sliderY + barH / 2, thumbR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Empty-state placeholder when a category has no settings. */
function drawEmptyCategory(ctx, panelX, panelW, contentTop, h) {
  ctx.fillStyle = '#445566';
  ctx.font = '13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    'No settings in this category.',
    panelX + panelW / 2,
    contentTop + (h - contentTop) / 2,
  );
  ctx.textAlign = 'left';
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Pure render function for the settings screen.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {{ isTouchDevice, settingsCategory, settingsSelection, settings, mouseX, mouseY }} state
 */
export function renderSettingsScreen(ctx, w, h, state) {
  const {
    isTouchDevice, settingsCategory, settingsSelection, settings,
    mouseX: mx, mouseY: my,
  } = state;

  if (isModernArt()) {
    renderSettingsScreenModern(ctx, w, h, state);
    return;
  }

  const compact = isTouchDevice && isCompactPhone(h);
  ctx.fillStyle = PANEL_BG_OVERLAY;
  ctx.fillRect(0, 0, w, h);

  // Layout
  const headerH = compact ? 36 : 52;
  const sideW = compact ? 90 : 160;
  const panelX = sideW + 1;
  const panelW = w - panelX - 12;
  const contentTop = headerH + 8;
  const barW = Math.min(panelW * 0.55, 240);
  const barH = 6;

  // Content surface behind the rows. Without it the settings sat directly on
  // the dimmed gameplay frame, so a short category (Gameplay has three rows)
  // read as a broken panel with the live arena showing through the gap.
  ctx.fillStyle = 'rgba(6,12,20,0.82)';
  ctx.fillRect(sideW + 1, headerH, w - sideW - 1, h - headerH);

  drawHeader(ctx, w, headerH, compact);

  const cats = getVisibleCategories(isTouchDevice, settings);
  drawSidebar(ctx, sideW, headerH, h, contentTop, compact, cats, settingsCategory, mx, my);
  drawSidebarFooter(ctx, sideW, h, compact, mx, my);

  // Right panel: settings rows for active category
  const defs = getSettingsForCategory(isTouchDevice, settingsCategory, settings);
  const items = defs.map((def) => settingDisplayItem(def, settings));

  if (defs.length === 0) {
    drawEmptyCategory(ctx, panelX, panelW, contentTop, h);
  } else {
    let y = contentTop;
    for (let i = 0; i < items.length; i++) {
      const def = defs[i];
      const item = items[i];
      const selected = settingsSelection === i;
      const itemH = compact ? def.height.compact : def.height.normal;
      const labelSize = compact ? 12 : 16;
      const isRowHovered = !selected && mx >= panelX && mx <= panelX + panelW &&
        my >= y - 2 && my < y - 2 + itemH;

      drawSettingRow(ctx, {
        def, item, selected, panelX, panelW, y, itemH, compact, labelSize,
        isRowHovered, settings, barW, barH, drawDivider: i > 0,
      });
      y += itemH;
    }
  }

  // Footer hint (desktop only — touch users don't read keyboard hints)
  if (!isTouchDevice) {
    ctx.fillStyle = '#5a6a7a';
    ctx.font = `${compact ? 10 : 13}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(
      'Click to adjust  ·  Scroll to navigate  ·  Q/E category  ·  ESC back',
      w / 2, h - (compact ? 6 : 10),
    );
  }
  ctx.textAlign = 'left';
}

// ─── Modern art style ───────────────────────────────────────────────────────
// Same geometry as the legacy screen (js/layout.js settingsLayout and the
// touch hit-testing rely on it); only the chrome is machined steel.

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

function modernSlider(ctx, def, settings, panelX, panelW, y, compact, barW, selected) {
  const sliderY = y + (compact ? 20 : 28);
  const val = settings[def.key];
  const pct = (val - def.min) / (def.max - def.min);
  const sliderX = panelX + (compact ? 8 : 14);
  const sliderW = Math.min(panelW - (compact ? 16 : 28), barW);
  const bh = compact ? 5 : 6;
  drawBar(ctx, sliderX, sliderY, sliderW, bh, pct, def.barColor(val), { segments: 10, glow: selected ? 0.4 : 0, edge: false });
  // Knurled steel thumb.
  const tx = Math.round(sliderX + sliderW * pct);
  const tH = compact ? 12 : 16;
  const tW = compact ? 7 : 9;
  const ty = Math.round(sliderY + bh / 2 - tH / 2);
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
  const compact = isTouchDevice && isCompactPhone(h);
  const headerH = compact ? 36 : 52;
  const sideW = compact ? 90 : 160;
  const panelX = sideW + 1;
  const panelW = w - panelX - 12;
  const contentTop = headerH + 8;
  const barW = Math.min(panelW * 0.55, 240);

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

  const cats = getVisibleCategories(isTouchDevice, settings);
  const catItemH = compact ? 28 : 38;
  ctx.textAlign = 'left';
  for (let ci = 0; ci < cats.length; ci++) {
    const cat = cats[ci];
    const isActive = cat === settingsCategory;
    const cy = contentTop + ci * catItemH;
    const isHovered = !isActive && mx >= 0 && mx < sideW && my >= cy - 2 && my < cy - 2 + catItemH;
    const color = CATEGORY_COLORS[cat] || UI.cyan;
    if (isActive) {
      drawPanel(ctx, 6, cy - 1, sideW - 14, catItemH - 4, { variant: 'raised', accent: color, bar: true, chamfer: compact ? 5 : 8 });
    } else if (isHovered) {
      ctx.fillStyle = 'rgba(130,160,188,0.08)';
      ctx.fillRect(6, cy - 1, sideW - 14, catItemH - 4);
    }
    ctx.font = uiFont(compact ? 11 : 14, isActive ? 800 : 600);
    ctx.letterSpacing = compact ? '0.5px' : '1.5px';
    ctx.fillStyle = isActive ? '#ffffff' : isHovered ? '#c9d6e2' : UI.textDim;
    ctx.fillText(cat.toUpperCase(), compact ? 14 : 20, cy + (compact ? 16 : 22));
    ctx.letterSpacing = '0px';
  }

  // Sidebar footer: category hint + back button (same hit band as legacy).
  const backY = h - 32;
  const backHovered = mx >= 0 && mx < sideW && my >= backY - 14 && my < backY + 10;
  if (!compact) {
    const kw = drawKeycap(ctx, 14, h - 76, 'Q', { size: 9 });
    const kw2 = drawKeycap(ctx, 14 + kw + 4, h - 76, 'E', { size: 9 });
    ctx.font = uiFont(10, 600);
    ctx.fillStyle = UI.textDim;
    ctx.fillText('CATEGORY', 14 + kw + kw2 + 12, h - 64);
  }
  drawButton(ctx, 8, backY - 16, sideW - 16, compact ? 24 : 28, '‹ Back', backHovered ? 'focus' : 'idle', UI.cyan,
    { size: compact ? 11 : 13 });

  // Rows.
  const defs = getSettingsForCategory(isTouchDevice, settingsCategory, settings);
  const items = defs.map((def) => settingDisplayItem(def, settings));
  if (defs.length === 0) {
    ctx.fillStyle = UI.textDim;
    ctx.font = uiFont(14, 600);
    ctx.textAlign = 'center';
    ctx.fillText('No settings in this category.', panelX + panelW / 2, contentTop + (h - contentTop) / 2);
  }
  let y = contentTop;
  const labelSize = compact ? 12 : 16;
  const inset = compact ? 8 : 14;
  for (let i = 0; i < items.length; i++) {
    const def = defs[i];
    const item = items[i];
    const selected = settingsSelection === i;
    const itemH = compact ? def.height.compact : def.height.normal;
    const isRowHovered = !selected && mx >= panelX && mx <= panelX + panelW && my >= y - 2 && my < y - 2 + itemH;
    const textY = y + (compact ? 13 : 18);

    if (selected) {
      drawPanel(ctx, panelX + 4, y - 2, panelW - 4, itemH - 1, { variant: 'raised', accent: UI.cyan, bar: true, chamfer: compact ? 6 : 10 });
    } else {
      if (isRowHovered) {
        ctx.fillStyle = 'rgba(130,160,188,0.07)';
        ctx.fillRect(panelX + 4, y - 2, panelW - 4, itemH - 1);
      }
      if (i > 0) {
        ctx.fillStyle = 'rgba(130,160,188,0.1)';
        ctx.fillRect(panelX + 14, y - 2, panelW - 24, 1);
      }
    }

    ctx.textAlign = 'left';
    ctx.font = uiFont(labelSize, selected ? 700 : 600);
    ctx.fillStyle = selected ? '#ffffff' : isRowHovered ? '#dbe6ef' : '#b3c2d0';
    ctx.fillText(item.label, panelX + inset + 4, textY);

    const right = panelX + panelW - inset;
    const midY = textY - labelSize * 0.35;
    if (def.type === 'toggle') {
      const on = item.value === 'ON';
      const tw = modernToggle(ctx, right, midY, on, selected, compact);
      ctx.textAlign = 'right';
      ctx.font = uiFont(compact ? 10 : 12, 700);
      ctx.fillStyle = on ? (selected ? UI.cyan : '#7fdcec') : UI.textFaint;
      ctx.fillText(item.value, right - tw - 8, textY);
    } else if (def.type === 'action') {
      drawCaption(ctx, right, midY - (compact ? 9 : 11), item.value, { size: compact ? 10 : 12, scheme: selected ? 'violet' : 'steel', align: 'right' });
    } else {
      ctx.textAlign = 'right';
      ctx.font = uiFont(labelSize, 800);
      const valueColor = item.color || (selected ? '#ffffff' : '#c9d6e2');
      const vw = ctx.measureText(item.value).width;
      ctx.fillStyle = valueColor;
      ctx.fillText(item.value, right - (compact ? 12 : 18), textY);
      ctx.fillStyle = selected ? UI.cyan : UI.textFaint;
      ctx.font = uiFont(labelSize - 2, 800);
      ctx.fillText('▶', right, textY - 1);
      ctx.fillText('◀', right - (compact ? 18 : 26) - vw, textY - 1);
    }

    if (def.widget === 'crosshairPreview') {
      const px = panelX + panelW / 2;
      const py = y + 44;
      drawPanel(ctx, px - 40, py - 18, 80, 36, { variant: 'well', chamfer: 6 });
      if (settings.crosshair < 5) {
        drawCrosshair(ctx, px, py, settings.crosshair);
      } else {
        ctx.fillStyle = UI.textFaint;
        ctx.font = uiFont(11, 600);
        ctx.textAlign = 'center';
        ctx.fillText('NONE', px, py + 4);
      }
    } else if (def.type === 'slider' && def.barColor) {
      modernSlider(ctx, def, settings, panelX, panelW, y, compact, barW, selected);
    }
    y += itemH;
  }

  if (!isTouchDevice) {
    ctx.fillStyle = UI.textFaint;
    ctx.font = uiFont(compact ? 10 : 12, 600);
    ctx.textAlign = 'center';
    ctx.letterSpacing = '1px';
    ctx.fillText(
      'CLICK TO ADJUST  ·  SCROLL TO NAVIGATE  ·  Q/E CATEGORY  ·  ESC BACK',
      panelX + panelW / 2, h - (compact ? 6 : 12),
    );
    ctx.letterSpacing = '0px';
  }
  ctx.textAlign = 'left';
}
