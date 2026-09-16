/**
 * Pure render functions for controls overlay and key-bindings screen.
 *
 * Two exports:
 *   - drawControlsOverlay  : compact in-game help box (toggle on demand)
 *   - renderControlsScreen : full key-bindings screen with rebind affordance
 */

// ─── Design tokens ──────────────────────────────────────────────────────────
const ACCENT = '#00ffcc';
const ACCENT_BLUE = '#00ccff';
const BIND_FLASH_RGBA = (a) => `rgba(255,170,0,${a})`;
const ROW_SELECT_BG = 'rgba(0,200,255,0.12)';
const ROW_SELECT_BORDER = 'rgba(0,220,255,0.45)';
const RESET_BG = 'rgba(200,100,0,0.15)';
const RESET_BORDER = 'rgba(255,170,0,0.4)';

// Display labels for keycodes (single source of truth).
const KEY_DISPLAY = {
  KeyW: 'W', KeyA: 'A', KeyS: 'S', KeyD: 'D', KeyE: 'E', KeyF: 'F',
  KeyQ: 'Q', KeyR: 'R', KeyP: 'P', KeyC: 'C',
  Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', Digit5: '5',
  ShiftLeft: 'L-Shift', ShiftRight: 'R-Shift',
  ControlLeft: 'L-Ctrl', ControlRight: 'R-Ctrl',
  AltLeft: 'L-Alt', AltRight: 'R-Alt',
  Space: 'Space', Enter: 'Enter', Escape: 'Escape', Tab: 'Tab',
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
  Backspace: 'Backspace',
};

// Friendly action labels for the rebind list.
const BIND_LABELS = {
  moveForward: 'Move Forward', moveBack: 'Move Back',
  moveLeft: 'Strafe Left', moveRight: 'Strafe Right',
  sprint: 'Sprint', interact: 'Interact', pause: 'Pause',
  crouch: 'Crouch / Slide',
  weapon1: 'Weapon 1', weapon2: 'Weapon 2', weapon3: 'Weapon 3',
  weapon4: 'Weapon 4', weapon5: 'Weapon 5', weapon6: 'Weapon 6',
  weapon7: 'Weapon 7', weapon8: 'Weapon 8',
  toggleFPS: 'Toggle FPS',
  chronoShift: 'Chrono Shift (Slow Time)',
};

export function formatKeyCode(code) {
  return KEY_DISPLAY[code] || code.replace('Key', '').replace('Digit', '');
}

// ─── In-game compact help overlay ──────────────────────────────────────────

export function drawControlsOverlay(ctx, w, h, alpha, state) {
  const { keybinds } = state;
  const fk = (action) => formatKeyCode(keybinds[action]);

  ctx.save();
  ctx.globalAlpha = alpha;

  const boxW = 300, boxH = 270;
  const bx = (w - boxW) / 2, by = (h - boxH) / 2;

  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.fillRect(bx, by, boxW, boxH);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.strokeStyle = 'rgba(0,200,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, boxW - 1, boxH - 1);

  // Title with glow
  ctx.save();
  ctx.shadowColor = ACCENT_BLUE;
  ctx.shadowBlur = 8;
  ctx.fillStyle = ACCENT_BLUE;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CONTROLS', w / 2, by + 24);
  ctx.restore();

  ctx.fillStyle = '#aabbcc';
  ctx.font = '13px monospace';
  ctx.textAlign = 'left';
  const lx = bx + 30;
  const fwd = fk('moveForward'), bk = fk('moveBack'), lt = fk('moveLeft'), rt = fk('moveRight');
  const lines = [
    [`${fwd}/${lt}/${bk}/${rt}`, 'Move',                 '#aabbcc'],
    ['Mouse',                    'Look',                 '#aabbcc'],
    ['Click',                    'Shoot',                '#aabbcc'],
    ['Right Click',              'Aim Down Sights',      '#66eeff'],
    [`${fk('weapon1')}-${fk('weapon8')}`, 'Weapons',     '#aabbcc'],
    ['Scroll',                   'Cycle Weapons',        '#aabbcc'],
    [`${fk('interact')}`,        'Interact/Open',        '#aabbcc'],
    [`${fk('sprint')}`,          'Sprint',               '#88ddff'],
    [`${fk('crouch')}`,          'Crouch',               '#88ddff'],
    [`${fk('sprint')}+${fk('crouch')}`, 'Slide',          '#88ddff'],
    [`${fwd}×2`,                 'Dash (double-tap)',    '#88ddff'],
    [`${fk('pause')}/P`,         'Pause',                '#aabbcc'],
  ];

  // Two-column rendering: keys flush right at column boundary, descriptions flush left
  const KEY_COL_W = 110;
  let ly = by + 48;
  for (const [keyText, desc, color] of lines) {
    ctx.fillStyle = color;
    ctx.textAlign = 'right';
    ctx.fillText(keyText, lx + KEY_COL_W, ly);
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.fillText(`- ${desc}`, lx + KEY_COL_W + 6, ly);
    ly += 18;
  }

  ctx.restore();
}

// ─── Full key-bindings screen ──────────────────────────────────────────────

/** Glowing screen header with gradient divider. */
function drawHeader(ctx, w) {
  ctx.save();
  ctx.shadowColor = ACCENT;
  ctx.shadowBlur = 14;
  ctx.fillStyle = ACCENT;
  ctx.font = 'bold 30px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('KEY BINDINGS', w / 2, 60);
  ctx.restore();

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0,   'rgba(0,255,200,0)');
  grad.addColorStop(0.5, 'rgba(0,255,200,0.30)');
  grad.addColorStop(1,   'rgba(0,255,200,0)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 76);
  ctx.lineTo(w, 76);
  ctx.stroke();
}

/** Background highlight for a single bind row. */
function drawRowBackground(ctx, panelX, panelW, y, itemH, kind, alpha = 1) {
  const fillH = itemH - 4;
  if (kind === 'flash') {
    ctx.fillStyle = BIND_FLASH_RGBA(0.3 * alpha);
    ctx.fillRect(panelX, y - 2, panelW, fillH);
    ctx.strokeStyle = BIND_FLASH_RGBA(0.4 * alpha);
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX + 0.5, y - 1.5, panelW - 1, fillH - 1);
  } else if (kind === 'rebinding') {
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.008);
    ctx.fillStyle = `rgba(255,200,0,${0.10 + pulse * 0.06})`;
    ctx.fillRect(panelX, y - 2, panelW, fillH);
    ctx.strokeStyle = `rgba(255,200,0,${0.45 + pulse * 0.25})`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(panelX + 0.5, y - 1.5, panelW - 1, fillH - 1);
  } else if (kind === 'selected') {
    ctx.fillStyle = ROW_SELECT_BG;
    ctx.fillRect(panelX, y - 2, panelW, fillH);
    ctx.strokeStyle = ROW_SELECT_BORDER;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(panelX + 0.5, y - 1.5, panelW - 1, fillH - 1);
    ctx.fillStyle = ACCENT;
    ctx.fillRect(panelX, y - 2, 2, fillH);
  }
}

/** Right-side value: key name, rebind prompt, or recently-swapped indicator. */
function drawBindValue(ctx, args) {
  const { panelX, panelW, y, isRebinding, isSwapFlashed, selected, keyCode } = args;
  ctx.textAlign = 'right';
  const tx = panelX + panelW - 16;
  if (isRebinding) {
    const blink = Math.floor(performance.now() / 380) % 2;
    ctx.fillStyle = blink ? '#ffd23a' : '#ff8800';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('▸ Press a key…  (ESC cancels)', tx, y + 20);
  } else {
    ctx.fillStyle = isSwapFlashed ? '#ffaa00' : selected ? '#ffffff' : '#aaaacc';
    ctx.font = selected ? 'bold 15px monospace' : '15px monospace';
    if (selected) {
      ctx.save();
      ctx.shadowColor = ACCENT;
      ctx.shadowBlur = 4;
      ctx.fillText(formatKeyCode(keyCode), tx, y + 20);
      ctx.restore();
    } else {
      ctx.fillText(formatKeyCode(keyCode), tx, y + 20);
    }
  }
}

export function renderControlsScreen(ctx, w, h, state) {
  const { keybinds, controlsSelection, rebindingKey, keybindSwapFlash } = state;

  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, w, h);

  drawHeader(ctx, w);

  const bindKeys = Object.keys(keybinds);
  const panelX = w / 2 - 240;
  const panelW = 480;
  const itemH = 36;
  const startY = 100;

  for (let i = 0; i < bindKeys.length; i++) {
    const key = bindKeys[i];
    const selected = controlsSelection === i;
    const isRebinding = rebindingKey === key;
    const y = startY + i * itemH;

    const swapAge = keybindSwapFlash && keybindSwapFlash.action === key
      ? performance.now() - keybindSwapFlash.time : Infinity;
    const isSwapFlashed = swapAge < 1500;

    // Row background — rebinding > flash > selected
    if (isRebinding) drawRowBackground(ctx, panelX, panelW, y, itemH, 'rebinding');
    else if (isSwapFlashed) drawRowBackground(ctx, panelX, panelW, y, itemH, 'flash', 1 - swapAge / 1500);
    else if (selected) drawRowBackground(ctx, panelX, panelW, y, itemH, 'selected');

    // Label
    ctx.fillStyle = selected ? ACCENT : '#8888aa';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(BIND_LABELS[key] || key, panelX + 16, y + 20);

    drawBindValue(ctx, {
      panelX, panelW, y,
      isRebinding, isSwapFlashed, selected,
      keyCode: keybinds[key],
    });
  }

  // ── Reset Defaults button ──
  const resetY = startY + bindKeys.length * itemH + 10;
  const resetSelected = controlsSelection === bindKeys.length;
  if (resetSelected) {
    ctx.fillStyle = RESET_BG;
    ctx.fillRect(panelX, resetY - 2, panelW, itemH - 4);
    ctx.strokeStyle = RESET_BORDER;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(panelX + 0.5, resetY - 1.5, panelW - 1, itemH - 5);
  }
  ctx.fillStyle = resetSelected ? '#ffaa00' : '#886644';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  if (resetSelected) {
    ctx.save();
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 6;
    ctx.fillText('[ RESET TO DEFAULTS ]', w / 2, resetY + 20);
    ctx.restore();
  } else {
    ctx.fillText('[ RESET TO DEFAULTS ]', w / 2, resetY + 20);
  }

  // ── Help footer ──
  ctx.fillStyle = '#5a6a7a';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  const help = rebindingKey
    ? 'Press the new key… ESC to cancel · keys already in use will be swapped'
    : 'W/S to navigate · ENTER to rebind · ESC to go back';
  ctx.fillText(help, w / 2, resetY + itemH + 20);
  ctx.textAlign = 'left';
}
