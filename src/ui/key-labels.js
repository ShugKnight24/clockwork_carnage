/**
 * Display labels for keyboard codes, shared by every prompt and HUD hint that
 * names a key (single source of truth).
 */

export const KEY_DISPLAY = {
  KeyW: "W", KeyA: "A", KeyS: "S", KeyD: "D", KeyE: "E", KeyF: "F",
  KeyQ: "Q", KeyR: "R", KeyP: "P", KeyC: "C", KeyX: "X", KeyV: "V",
  Digit1: "1", Digit2: "2", Digit3: "3", Digit4: "4", Digit5: "5",
  ShiftLeft: "L-Shift", ShiftRight: "R-Shift",
  ControlLeft: "L-Ctrl", ControlRight: "R-Ctrl",
  AltLeft: "L-Alt", AltRight: "R-Alt",
  Space: "Space", Enter: "Enter", Escape: "Escape", Tab: "Tab",
  ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right",
  Backspace: "Backspace",
};

export function formatKeyCode(code) {
  return KEY_DISPLAY[code] || code.replace("Key", "").replace("Digit", "");
}
