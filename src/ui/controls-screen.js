/**
 * Pure render functions for controls overlay and key-bindings screen.
 */

// ── formatKeyCode — pure function ──
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

export function formatKeyCode(code) {
  return KEY_DISPLAY[code] || code.replace('Key', '').replace('Digit', '');
}

// ── drawControlsOverlay — compact in-game control hint box ──
export function drawControlsOverlay(ctx, w, h, alpha, state) {
  const { keybinds, mode } = state;
  const fk = action => formatKeyCode(keybinds[action]);
  const saveMessage = mode === 'campaign'
    ? `${fk('toggleFPS').replace('F', 'F')}     - Save Game`
    : '';

  ctx.save();
  ctx.globalAlpha = alpha;
  const boxW = 280, boxH = 220;
  const bx = (w - boxW) / 2, by = (h - boxH) / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(bx, by, boxW, boxH);
  ctx.strokeStyle = 'rgba(0,200,255,0.3)';
  ctx.strokeRect(bx, by, boxW, boxH);
  ctx.fillStyle = '#00ccff';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CONTROLS', w / 2, by + 24);
  ctx.fillStyle = '#aabbcc';
  ctx.font = '13px monospace';
  ctx.textAlign = 'left';
  const lx = bx + 30;
  const fwd = fk('moveForward'), bk = fk('moveBack'), lt = fk('moveLeft'), rt = fk('moveRight');
  ctx.fillText(`${fwd}/${lt}/${bk}/${rt} - Move`, lx, by + 48);
  ctx.fillText('Mouse - Look', lx, by + 66);
  ctx.fillText('Click - Shoot', lx, by + 84);
  ctx.fillText(`${fk('weapon1')}-${fk('weapon8')}   - Weapons`, lx, by + 102);
  ctx.fillText('Scroll      - Cycle Weapons', lx, by + 120);
  ctx.fillText(`${fk('interact')}     - Interact/Open`, lx, by + 138);
  ctx.fillStyle = '#88ddff';
  ctx.fillText(`${fk('sprint')} - Sprint`, lx, by + 156);
  ctx.fillText(`${fwd}×2   - Dash (double-tap)`, lx, by + 174);
  ctx.fillStyle = '#aabbcc';
  ctx.fillText(`${fk('pause')}/P - Pause`, lx, by + 192);
  if (saveMessage) {
    ctx.fillStyle = '#aaccaa';
    ctx.fillText(saveMessage, lx, by + 210);
  }
  ctx.restore();
}

// ── renderControlsScreen — full key-bindings screen ──
const BIND_LABELS = {
  moveForward: 'Move Forward', moveBack: 'Move Back',
  moveLeft: 'Strafe Left', moveRight: 'Strafe Right',
  sprint: 'Sprint', interact: 'Interact', pause: 'Pause',
  weapon1: 'Weapon 1', weapon2: 'Weapon 2', weapon3: 'Weapon 3',
  weapon4: 'Weapon 4', weapon5: 'Weapon 5', weapon6: 'Weapon 6',
  weapon7: 'Weapon 7', weapon8: 'Weapon 8', toggleFPS: 'Toggle FPS',
  chronoShift: 'Chrono Shift (Slow Time)',
};

export function renderControlsScreen(ctx, w, h, state) {
  const { keybinds, controlsSelection, rebindingKey, keybindSwapFlash } = state;

  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#00ffcc';
  ctx.font = 'bold 30px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('KEY BINDINGS', w / 2, 60);

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

    const isSwapFlashed = keybindSwapFlash
      && keybindSwapFlash.action === key
      && performance.now() - keybindSwapFlash.time < 1500;

    if (isSwapFlashed) {
      const flashAlpha = 0.3 * (1 - (performance.now() - keybindSwapFlash.time) / 1500);
      ctx.fillStyle = `rgba(255,170,0,${flashAlpha})`;
      ctx.fillRect(panelX, y - 2, panelW, itemH - 4);
      ctx.strokeStyle = `rgba(255,170,0,${flashAlpha + 0.1})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(panelX, y - 2, panelW, itemH - 4);
    } else if (selected) {
      ctx.fillStyle = 'rgba(0,200,255,0.12)';
      ctx.fillRect(panelX, y - 2, panelW, itemH - 4);
      ctx.strokeStyle = 'rgba(0,200,255,0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(panelX, y - 2, panelW, itemH - 4);
    }

    // Label
    ctx.fillStyle = selected ? '#00ffcc' : '#8888aa';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(BIND_LABELS[key] || key, panelX + 16, y + 20);

    // Key value or rebind prompt
    ctx.textAlign = 'right';
    if (isRebinding) {
      const blink = Math.floor(performance.now() / 400) % 2;
      ctx.fillStyle = blink ? '#ffcc00' : '#ff8800';
      ctx.font = 'bold 15px monospace';
      ctx.fillText('[ Press a key... ]', panelX + panelW - 16, y + 20);
    } else {
      ctx.fillStyle = isSwapFlashed ? '#ffaa00' : selected ? '#ffffff' : '#aaaacc';
      ctx.font = '15px monospace';
      ctx.fillText(formatKeyCode(keybinds[key]), panelX + panelW - 16, y + 20);
    }
  }

  // Reset Defaults button
  const resetY = startY + bindKeys.length * itemH + 10;
  const resetSelected = controlsSelection === bindKeys.length;
  if (resetSelected) {
    ctx.fillStyle = 'rgba(200,100,0,0.15)';
    ctx.fillRect(panelX, resetY - 2, panelW, itemH - 4);
    ctx.strokeStyle = 'rgba(255,170,0,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, resetY - 2, panelW, itemH - 4);
  }
  ctx.fillStyle = resetSelected ? '#ffaa00' : '#886644';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('[ RESET TO DEFAULTS ]', w / 2, resetY + 20);

  // Help text
  ctx.fillStyle = '#556677';
  ctx.font = '12px monospace';
  ctx.fillText('W/S to navigate, ENTER to rebind, ESC to go back', w / 2, resetY + itemH + 20);
  ctx.textAlign = 'left';
}
