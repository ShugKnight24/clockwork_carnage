import { getVisibleCategories, getSettingsForCategory, settingDisplayItem } from '../../js/settings-registry.js';
import { isCompactPhone } from '../../js/layout.js';
import { drawCrosshair } from './crosshair.js';

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
