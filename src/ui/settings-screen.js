import { getVisibleCategories, getSettingsForCategory, settingDisplayItem } from '../../js/settings-registry.js';
import { isCompactPhone } from '../../js/layout.js';
import { drawCrosshair } from './crosshair.js';

/**
 * Pure render function for the settings screen.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w  canvas width
 * @param {number} h  canvas height
 * @param {object} state  - context bag from game
 */
export function renderSettingsScreen(ctx, w, h, state) {
  const {
    isTouchDevice, settingsCategory, settingsSelection, settings,
    mouseX: mx, mouseY: my,
  } = state;

  const compact = isTouchDevice && isCompactPhone(h);
  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, w, h);

  // ── Layout constants ──
  const headerH = compact ? 36 : 52;
  const sideW = compact ? 90 : 160;
  const panelX = sideW + 1;
  const panelW = w - panelX - 12;
  const contentTop = headerH + 8;
  const barW = Math.min(panelW * 0.55, 240);
  const barH = 6;

  // ── Header ──
  ctx.fillStyle = '#00ffcc';
  ctx.font = `bold ${compact ? 18 : 28}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('SETTINGS', w / 2, compact ? 24 : 38);
  ctx.textAlign = 'left';

  // Divider below header
  ctx.strokeStyle = 'rgba(0,255,200,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, headerH);
  ctx.lineTo(w, headerH);
  ctx.stroke();

  // Sidebar background
  ctx.fillStyle = 'rgba(0,10,24,0.7)';
  ctx.fillRect(0, headerH, sideW, h - headerH);

  // Sidebar border (right edge)
  ctx.strokeStyle = 'rgba(0,160,120,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sideW, headerH);
  ctx.lineTo(sideW, h);
  ctx.stroke();

  // ── Category sidebar ──
  const cats = getVisibleCategories(isTouchDevice);
  const catItemH = compact ? 28 : 38;
  const catColors = {
    Gameplay: '#00ffcc', Display: '#00ccff', Audio: '#00ff88',
    Controls: '#ffcc00', Accessibility: '#aaaacc', HUD: '#44ffaa',
    Mobile: '#ff88cc',
  };
  for (let ci = 0; ci < cats.length; ci++) {
    const cat = cats[ci];
    const isActive = cat === settingsCategory;
    const cy = contentTop + ci * catItemH;
    const isHovered = !isActive && mx >= 0 && mx < sideW && my >= cy - 2 && my < cy - 2 + catItemH;

    if (isActive) {
      ctx.fillStyle = 'rgba(0,220,170,0.15)';
      ctx.fillRect(0, cy - 2, sideW, catItemH);
      ctx.fillStyle = catColors[cat] || '#00ffcc';
      ctx.fillRect(0, cy - 2, 3, catItemH);
    } else if (isHovered) {
      ctx.fillStyle = 'rgba(0,220,170,0.07)';
      ctx.fillRect(0, cy - 2, sideW, catItemH);
    }

    ctx.fillStyle = isActive ? catColors[cat] || '#00ffcc'
      : isHovered ? '#88aacc' : '#445566';
    ctx.font = `bold ${compact ? 11 : 15}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(cat.toUpperCase(), sideW / 2, cy + (compact ? 16 : 22));
  }

  // ── Sidebar: Back button ──
  const backY = h - 32;
  const backHovered = mx >= 0 && mx < sideW && my >= backY - 14 && my < backY + 10;
  ctx.fillStyle = backHovered ? '#00ffcc' : '#667788';
  ctx.font = `bold ${compact ? 12 : 14}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('< BACK', sideW / 2, backY);

  // Help prompt for navigation keys
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#b0e0ff';
  ctx.font = compact ? '9px monospace' : '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Q/E: Category', sideW / 2, h - 54);
  ctx.restore();
  ctx.textAlign = 'left';

  // ── Right panel — settings for active category ──
  const defs = getSettingsForCategory(isTouchDevice, settingsCategory);
  const items = defs.map(def => settingDisplayItem(def, settings));

  let startY = contentTop;
  for (let i = 0; i < items.length; i++) {
    const def = defs[i];
    const item = items[i];
    const selected = settingsSelection === i;
    const itemH = compact ? def.height.compact : def.height.normal;
    const y = startY;
    const labelSize = compact ? 12 : 16;
    const isRowHovered = !selected && mx >= panelX && mx <= panelX + panelW &&
      my >= y - 2 && my < y - 2 + itemH;

    // Selection highlight
    if (selected) {
      ctx.fillStyle = 'rgba(0,200,255,0.10)';
      ctx.fillRect(panelX, y - 2, panelW, itemH);
      ctx.strokeStyle = 'rgba(0,200,255,0.22)';
      ctx.lineWidth = 1;
      ctx.strokeRect(panelX, y - 2, panelW, itemH);
    } else if (isRowHovered) {
      ctx.fillStyle = 'rgba(0,200,255,0.05)';
      ctx.fillRect(panelX, y - 2, panelW, itemH);
    }

    // Row separator
    if (i > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(panelX + 8, y - 2);
      ctx.lineTo(panelX + panelW - 8, y - 2);
      ctx.stroke();
    }

    // Label
    ctx.fillStyle = selected ? '#00ffcc' : isRowHovered ? '#aaddcc' : '#8888aa';
    ctx.font = `bold ${labelSize}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(item.label, panelX + (compact ? 8 : 14), y + (compact ? 13 : 18));

    // Value
    ctx.textAlign = 'right';
    ctx.fillStyle = item.color || (selected ? '#ffffff' : isRowHovered ? '#ccccee' : '#aaaacc');
    ctx.font = `bold ${labelSize}px monospace`;
    ctx.fillText(`< ${item.value} >`, panelX + panelW - (compact ? 8 : 14), y + (compact ? 13 : 18));

    // Sub-widgets
    if (def.widget === 'crosshairPreview') {
      const prevX = panelX + panelW / 2;
      const prevY = y + 44;
      ctx.fillStyle = 'rgba(30,30,50,0.8)';
      ctx.fillRect(prevX - 40, prevY - 18, 80, 36);
      ctx.strokeStyle = 'rgba(0,200,255,0.2)';
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
    } else if (def.type === 'slider' && def.barColor) {
      const sliderY = y + (compact ? 20 : 28);
      const val = settings[def.key];
      const pct = (val - def.min) / (def.max - def.min);
      const sliderX = panelX + (compact ? 8 : 14);
      const sliderW = Math.min(panelW - (compact ? 16 : 28), barW);
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(sliderX, sliderY, sliderW, barH);
      ctx.fillStyle = def.barColor(val);
      ctx.fillRect(sliderX, sliderY, sliderW * pct, barH);
      ctx.strokeStyle = 'rgba(0,200,255,0.18)';
      ctx.lineWidth = 1;
      ctx.strokeRect(sliderX, sliderY, sliderW, barH);
      // Slider thumb
      const thumbX = sliderX + sliderW * pct;
      ctx.fillStyle = selected ? '#00ffcc' : '#88bbcc';
      ctx.beginPath();
      ctx.arc(thumbX, sliderY + barH / 2, compact ? 4 : 5, 0, Math.PI * 2);
      ctx.fill();
    }

    startY += itemH;
  }

  // ── Footer hint text ──
  ctx.fillStyle = '#334455';
  ctx.font = `${compact ? 10 : 13}px monospace`;
  ctx.textAlign = 'center';
  if (!isTouchDevice) {
    ctx.fillText(
      'Click to adjust  |  Scroll to navigate  |  Q/E category  |  ESC back',
      w / 2, h - (compact ? 6 : 10),
    );
  }
  ctx.textAlign = 'left';
}
