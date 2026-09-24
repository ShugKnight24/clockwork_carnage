/**
 * Device-aware input prompts: the one place a screen asks "what does the
 * player press for this?".
 *
 *   activeDevice   keyboard, gamepad or touch: whichever the player touched
 *                  last. A pad button or a stick past the deadzone switches to
 *                  gamepad; a real keypress, click or mouse move switches back.
 *                  Mirrored on <html data-input> (and data-pad, the family) so
 *                  DOM screens can switch with CSS.
 *   glyph          one action's binding for that device: a keycap legend,
 *                  a face button, a pill (shoulders, triggers, sticks, menu
 *                  buttons) or the d-pad.
 *   promptText     "A continue  ·  B skip" footers as plain text.
 *   drawPrompt     the same footer on a canvas, glyph then label per item.
 *   glyphHTML      a glyph as DOM (renderDomGlyphs fills [data-glyph]).
 *
 * GAMEPAD_ACTIONS is the pad layout, by W3C standard button index. js/gamepad.js
 * reads the same buttons into its named poll() fields and js/game.js acts on
 * those; tests/unit/input-glyphs.test.js presses each button here through
 * poll() and checks the field it lands on, so the two cannot drift apart.
 */
import { formatKeyCode } from "./controls-screen.js";
import { drawKeycap, uiFont } from "./modern-ui-kit.js";

// ─── Pad layout ─────────────────────────────────────────────────────────────

/** Standard button indices by Xbox name. */
export const PAD = {
  A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7,
  VIEW: 8, MENU: 9, LS: 10, RS: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15,
};

/**
 * Action → standard button index, or a d-pad / stick pseudo button:
 * "dpad" (all four), "dpadV", "dpadH", "lstick", "rstick".
 * Gameplay (PLAYING in js/game.js _updateGamepadInput) then menus (the
 * non-PLAYING branch, where A is Enter, B and Start are Escape, LB/RB are Q/E).
 */
export const GAMEPAD_ACTIONS = {
  // Gameplay
  interact: PAD.A,
  dash: PAD.B,
  crouch: PAD.X,
  chronoShift: PAD.Y,
  weaponPrev: PAD.LB,
  chronoRewind: PAD.LB, // LB while shifting
  weaponNext: PAD.RB,
  aim: PAD.LT,
  fire: PAD.RT,
  sprint: PAD.LS,
  chronoLock: PAD.RS,
  pause: PAD.MENU,
  minimap: PAD.VIEW,
  weaponCycle: "dpadH",
  move: "lstick",
  look: "rstick",
  // Menus
  confirm: PAD.A,
  back: PAD.B,
  prevTab: PAD.LB,
  nextTab: PAD.RB,
  navigate: "dpad",
  navigateV: "dpadV",
  navigateH: "dpadH",
  arrowsV: "dpadV",
  arrowsH: "dpadH",
  start: PAD.A,
  artStyle: PAD.X, // title screen: X (or View) cycles the art style
  // Cutscenes: A advances, Y toggles auto-play, B or Start skips.
  advance: PAD.A,
  auto: PAD.Y,
  skip: PAD.B,
  // Showroom face buttons.
  randomize: PAD.X,
  deploy: PAD.Y,
};

/** Face-button colours (Xbox) and symbol colours (PlayStation). */
export const XBOX_COLORS = { 0: "#5fb33f", 1: "#d9352c", 2: "#2f7fd8", 3: "#e6b422" };
const PS_COLORS = { 0: "#7fa9e8", 1: "#ef6a63", 2: "#dc8fd0", 3: "#44c9a6" };
// Legend colour on the filled Xbox buttons: dark on green/yellow, white on red/blue.
const XBOX_INK = { 0: "#0b1208", 1: "#ffffff", 2: "#ffffff", 3: "#1a1204" };

/** Legend per standard button index, per controller family. */
const PAD_LABELS = {
  xbox: ["A", "B", "X", "Y", "LB", "RB", "LT", "RT", "⧉", "☰", "LS", "RS"],
  playstation: ["✕", "○", "□", "△", "L1", "R1", "L2", "R2", "SHARE", "OPTIONS", "L3", "R3"],
  switch: ["B", "A", "Y", "X", "L", "R", "ZL", "ZR", "−", "+", "LS", "RS"],
};

const DPAD_ARROWS = { dpad: "", dpadV: "↕", dpadH: "↔", 12: "↑", 13: "↓", 14: "←", 15: "→" };

/** Controller family for glyphs: generic pads read as Xbox. */
export function padFamily(game) {
  const t = game?.gamepad?.controllerType;
  return t === "playstation" || t === "switch" ? t : "xbox";
}

// ─── Keyboard ───────────────────────────────────────────────────────────────

/** Keyboard legends where formatKeyCode's rebind-list names are too long. */
const KEY_SHORT = {
  Escape: "ESC", Enter: "ENTER", Space: "SPACE", Tab: "TAB",
  ShiftLeft: "SHIFT", ShiftRight: "SHIFT", ControlLeft: "CTRL", ControlRight: "CTRL",
  AltLeft: "ALT", AltRight: "ALT", ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→",
};

/** A key code as a keycap legend: "KeyE" → "E", "Escape" → "ESC". */
export function keyLabel(code) {
  if (!code) return "";
  return KEY_SHORT[code] || formatKeyCode(code).toUpperCase();
}

/** Keybind actions (js/input-manager.js DEFAULT_KEYBINDS names). */
const KEYBIND_ACTIONS = new Set([
  "interact", "sprint", "crouch", "chronoShift", "chronoRewind", "chronoLock", "pause", "toggleFPS",
]);

/** Fixed keyboard legends: mouse buttons and the menu keys every screen shares. */
const KEYBOARD_FIXED = {
  fire: "CLICK",
  aim: "RIGHT MOUSE",
  dash: "2× DIR",
  weaponPrev: "WHEEL",
  weaponNext: "WHEEL",
  weaponCycle: "1-8",
  move: "WASD",
  look: "MOUSE",
  minimap: "TAB",
  confirm: "ENTER",
  back: "ESC",
  prevTab: "Q",
  nextTab: "E",
  navigate: "WASD",
  navigateV: "W/S",
  navigateH: "A/D",
  arrowsV: "↑↓",
  arrowsH: "←→",
  start: "ENTER",
  artStyle: "",
  advance: "ENTER",
  auto: "T",
  skip: "ESC",
  skipAll: "SPACE",
  restart: "R",
  share: "S",
  randomize: "R",
  undo: "Z",
  deploy: "⇧ ENTER",
  pick: "1/2/3",
};

/** Touch verbs, for the few prompts that name an on-screen button. */
const TOUCH_LABELS = {
  interact: "USE", fire: "FIRE", aim: "AIM", sprint: "RUN", crouch: "CROUCH", dash: "DASH",
  chronoShift: "SLOW", chronoRewind: "REWIND", chronoLock: "LOCK", pause: "PAUSE",
  confirm: "TAP", advance: "TAP", start: "TAP", skipAll: "HOLD",
};

// ─── Active device ──────────────────────────────────────────────────────────

/** keyboard, gamepad or touch: the device the player used last. */
export function activeDevice(game) {
  const fallback = game?.isTouchDevice ? "touch" : "keyboard";
  const d = game?.inputDevice;
  if (d === "gamepad") return game.gamepad?.connected ? "gamepad" : fallback;
  return d || fallback;
}

/**
 * Record that `device` was just used. Mirrors it (and the pad family) on
 * <html>, and tells DOM screens with a `cc-input-change` event when either
 * changed.
 */
export function noteInput(game, device) {
  if (!game) return;
  const family = padFamily(game);
  if (game.inputDevice === device && game._inputFamily === family) return;
  game.inputDevice = device;
  game._inputFamily = family;
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.input = device;
  root.dataset.pad = family;
  renderDomGlyphs(game, document);
  window.dispatchEvent(new CustomEvent("cc-input-change", { detail: { device, family } }));
}

/** True when a gamepad poll() result shows the player using the pad. */
export function padActive(gp) {
  if (!gp?.connected) return false;
  // Sticks are already past the radial deadzone (poll zeroes them inside it).
  if (gp.moveX || gp.moveY || gp.lookX || gp.lookY) return true;
  return !!(gp.shoot || gp.aim || gp.interact || gp.dash || gp.reload || gp.chronoShift ||
    gp.sprint || gp.chronoLock || gp.weaponNext || gp.weaponPrev || gp.pause || gp.minimap ||
    gp.dpadUp || gp.dpadDown || gp.dpadLeft || gp.dpadRight);
}

/** Once per poll: a pad in use takes over the prompts. */
export function trackGamepad(game, gp) {
  if (padActive(gp)) noteInput(game, "gamepad");
  else if (game.inputDevice === "gamepad" && game._inputFamily !== padFamily(game)) noteInput(game, "gamepad");
}

/**
 * Listen for real keyboard and mouse use (synthetic events, like the ones the
 * pad path dispatches for the DOM menus, are not the player's keyboard), and
 * for touches on touch-first devices. Idempotent.
 */
export function installInputTracking(game) {
  if (typeof window === "undefined" || game._inputTracking) return;
  game._inputTracking = true;
  const kb = (e) => {
    if (e.isTrusted) noteInput(game, "keyboard");
  };
  window.addEventListener("keydown", kb, true);
  window.addEventListener("wheel", kb, { capture: true, passive: true });
  window.addEventListener("pointerdown", (e) => {
    if (!e.isTrusted) return;
    if (e.pointerType === "touch") {
      if (game.isTouchDevice) noteInput(game, "touch");
    } else {
      noteInput(game, "keyboard");
    }
  }, true);
  window.addEventListener("mousemove", (e) => {
    if (!e.isTrusted || e.sourceCapabilities?.firesTouchEvents) return;
    if (Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0) < 3) return;
    if (game.inputDevice !== "keyboard") noteInput(game, "keyboard");
  }, { capture: true, passive: true });
  injectGlyphStyles();
  noteInput(game, game.isTouchDevice ? "touch" : "keyboard");
}

// ─── Glyph lookup ───────────────────────────────────────────────────────────

/**
 * An action's binding on the active device (or `device`).
 * @returns {{ text: string, kind: "key"|"face"|"pill"|"dpad"|"touch",
 *   family?: string, index?: number|string, color?: string, ink?: string }}
 */
export function glyph(game, action, device = activeDevice(game)) {
  if (device === "gamepad") return padGlyph(action, padFamily(game));
  if (device === "touch") return { text: TOUCH_LABELS[action] || "", kind: "touch" };
  const kb = game?.keybinds;
  if (KEYBIND_ACTIONS.has(action) && kb?.[action]) return { text: keyLabel(kb[action]), kind: "key" };
  if (action in KEYBOARD_FIXED) return { text: KEYBOARD_FIXED[action], kind: "key" };
  return { text: keyLabel(kb?.[action] || action), kind: "key" };
}

/** A pad action's glyph for a controller family. */
export function padGlyph(action, family = "xbox") {
  const index = GAMEPAD_ACTIONS[action];
  if (index === undefined) return { text: "", kind: "pill", family };
  if (typeof index === "string") {
    if (index === "lstick" || index === "rstick") {
      const text = family === "playstation" ? (index === "lstick" ? "L" : "R") : index === "lstick" ? "LS" : "RS";
      return { text, kind: "pill", family, index };
    }
    return { text: `✚${DPAD_ARROWS[index]}`, kind: "dpad", family, index };
  }
  return buttonGlyph(index, family);
}

/** A standard button's glyph for a controller family. */
export function buttonGlyph(index, family = "xbox") {
  if (index >= PAD.UP) return { text: `✚${DPAD_ARROWS[index]}`, kind: "dpad", family, index };
  const labels = PAD_LABELS[family] || PAD_LABELS.xbox;
  const text = labels[index];
  if (index > PAD.Y) return { text, kind: "pill", family, index };
  const g = { text, kind: "face", family, index };
  if (family === "xbox") {
    g.color = XBOX_COLORS[index];
    g.ink = XBOX_INK[index];
  } else if (family === "playstation") {
    g.color = PS_COLORS[index];
  }
  return g;
}

/** The pad family while the pad is in use, else null (step cards' `pad`). */
export function padFor(game) {
  return activeDevice(game) === "gamepad" ? padFamily(game) : null;
}

/** A pad legend ("A", "LB", "△") back to its glyph, or null if the family has none. */
export function padLabelGlyph(family, text) {
  const i = (PAD_LABELS[family] || PAD_LABELS.xbox).indexOf(text);
  return i < 0 ? null : buttonGlyph(i, family);
}

/**
 * Footer text: [[action, label], ...] → "ENTER continue  ·  ESC skip". Items
 * whose action has no binding on this device are left out.
 */
export function promptText(game, items, sep = "  ·  ", device = activeDevice(game)) {
  const out = [];
  for (const [action, label] of items) {
    const g = glyph(game, action, device);
    if (!g.text) continue;
    out.push(label ? `${g.text} ${label}` : g.text);
  }
  return out.join(sep);
}

// ─── Canvas ─────────────────────────────────────────────────────────────────

const PILL_FILL = "#1b222c";
const PILL_EDGE = "rgba(200, 220, 240, 0.55)";

/** Width drawGlyph takes for `g` at `size` (legend px). */
export function glyphWidth(ctx, g, size = 11, look = "modern") {
  const d = Math.round(size * 1.8);
  if (g.kind === "face" || g.kind === "dpad") return d + (g.kind === "dpad" && DPAD_ARROWS[g.index] ? Math.round(size * 0.9) : 0);
  ctx.save();
  ctx.font = glyphFont(g, size, look);
  const tw = Math.ceil(ctx.measureText(g.text).width);
  ctx.restore();
  // drawKeycap's own sizing (0.5px tracking per character).
  if (g.kind === "key" && look === "modern") return Math.max(Math.round(size * 1.9), Math.ceil(tw + g.text.length * 0.5) + Math.round(size * 1.1));
  return Math.max(d, tw + Math.round(size * (g.kind === "pill" ? 1.3 : 1.0)));
}

function glyphFont(g, size, look) {
  if (g.kind === "key") return look === "legacy" ? `bold ${size}px monospace` : uiFont(size, 700);
  return uiFont(g.kind === "pill" && g.text.length > 3 ? size * 0.82 : size, 800);
}

/**
 * Draw one glyph with its left edge at x, vertically centred on midY.
 * `look` is "modern" (steel keycaps) or "legacy" (thin outlined keys).
 * @returns {number} width drawn
 */
export function drawGlyph(ctx, x, midY, g, size = 11, look = "modern", color = "#e4edf5") {
  const w = glyphWidth(ctx, g, size, look);
  const d = Math.round(size * 1.8);
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (g.kind === "key") {
    if (look === "modern") {
      drawKeycap(ctx, x, Math.round(midY - size * 0.95), g.text, { size });
    } else {
      const h = d;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      roundRect(ctx, x + 0.5, Math.round(midY - h / 2) + 0.5, w - 1, h - 1, 3);
      ctx.stroke();
      ctx.font = glyphFont(g, size, look);
      ctx.fillStyle = color;
      ctx.fillText(g.text, x + w / 2, midY + 1);
    }
  } else if (g.kind === "face") {
    const r = d / 2;
    const cx = x + r;
    ctx.beginPath();
    ctx.arc(cx, midY, r, 0, Math.PI * 2);
    ctx.fillStyle = g.family === "xbox" ? g.color : PILL_FILL;
    ctx.fill();
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = g.family === "xbox" ? "rgba(0,0,0,0.55)" : PILL_EDGE;
    ctx.stroke();
    ctx.fillStyle = g.family === "xbox" ? g.ink : g.color || "#ffffff";
    ctx.font = uiFont(g.family === "playstation" ? size * 1.05 : size, 800);
    ctx.fillText(g.text, cx, midY + 1);
  } else if (g.kind === "pill") {
    roundRect(ctx, x, Math.round(midY - d / 2), w, d, d / 2);
    ctx.fillStyle = PILL_FILL;
    ctx.fill();
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = PILL_EDGE;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = glyphFont(g, size, look);
    ctx.fillText(g.text, x + w / 2, midY + 1);
  } else if (g.kind === "dpad") {
    drawDpad(ctx, x, midY, d, g.index);
    const arrow = DPAD_ARROWS[g.index];
    if (arrow) {
      ctx.fillStyle = color;
      ctx.font = uiFont(size, 800);
      ctx.fillText(arrow, x + d + size * 0.45, midY + 1);
    }
  } else if (g.text) {
    ctx.fillStyle = color;
    ctx.font = uiFont(size, 800);
    ctx.fillText(g.text, x + w / 2, midY + 1);
  }
  ctx.restore();
  return w;
}

/** A d-pad cross `d` wide; the arms named by `index` lit. */
function drawDpad(ctx, x, midY, d, index) {
  const arm = Math.round(d * 0.36);
  const cx = x + d / 2;
  const top = midY - d / 2;
  ctx.fillStyle = PILL_FILL;
  ctx.strokeStyle = PILL_EDGE;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.rect(cx - arm / 2, top, arm, d);
  ctx.rect(x, midY - arm / 2, d, arm);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(cx - arm / 2 + 1, midY - arm / 2 + 1, arm - 2, arm - 2);
  const lit = {
    12: ["u"], 13: ["d"], 14: ["l"], 15: ["r"],
    dpadV: ["u", "d"], dpadH: ["l", "r"], dpad: ["u", "d", "l", "r"],
  }[index] || [];
  ctx.fillStyle = "#22e6ff";
  const pad = 2;
  const len = (d - arm) / 2 - pad;
  for (const a of lit) {
    if (a === "u") ctx.fillRect(cx - arm / 2 + pad, top + pad, arm - pad * 2, len);
    if (a === "d") ctx.fillRect(cx - arm / 2 + pad, midY + arm / 2, arm - pad * 2, len);
    if (a === "l") ctx.fillRect(x + pad, midY - arm / 2 + pad, len, arm - pad * 2);
    if (a === "r") ctx.fillRect(x + d - pad - len, midY - arm / 2 + pad, len, arm - pad * 2);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

/**
 * Lay out [[action, label], ...] as glyph + label pairs on one line centred
 * vertically on y.
 * @param {{ input: object, size?: number, font?: string, color?: string,
 *   align?: "left"|"center"|"right", gap?: number, look?: "modern"|"legacy",
 *   device?: string, alpha?: number, measure?: boolean }} style  `input` is
 *   the game (device, pad family and keybinds); `alpha` fades the labels,
 *   and the glyphs less, so a pulsing prompt keeps its pad colours readable;
 *   `measure` only returns the width.
 * @returns {number} total width
 */
export function drawPrompt(ctx, x, y, items, style) {
  const size = style.size || 11;
  const look = style.look || "modern";
  const font = style.font || (look === "legacy" ? `${size + 1}px monospace` : uiFont(size, 700));
  const color = style.color || "#e4edf5";
  const gap = style.gap ?? Math.round(size * 2.2);
  const labelGap = Math.round(size * 0.55);
  const device = style.device || activeDevice(style.input);
  ctx.save();
  ctx.font = font;
  const parts = [];
  let total = 0;
  for (const [action, label] of items) {
    const g = glyph(style.input, action, device);
    if (!g.text) continue;
    const gw = glyphWidth(ctx, g, size, look);
    ctx.font = font;
    const lw = label ? Math.ceil(ctx.measureText(label).width) : 0;
    const w = gw + (label ? labelGap + lw : 0);
    if (parts.length) total += gap;
    parts.push({ g, gw, label, w });
    total += w;
  }
  if (style.measure) {
    ctx.restore();
    return total;
  }
  let cx = style.align === "center" ? x - total / 2 : style.align === "right" ? x - total : x;
  cx = Math.round(cx);
  const alpha = Math.max(0, Math.min(1, style.alpha ?? 1));
  const glyphAlpha = Math.min(1, 0.6 + alpha * 0.5);
  const base = ctx.globalAlpha;
  for (const p of parts) {
    ctx.globalAlpha = base * glyphAlpha;
    drawGlyph(ctx, cx, y, p.g, size, look, color);
    if (p.label) {
      ctx.save();
      ctx.globalAlpha = base * alpha;
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(p.label, cx + p.gw + labelGap, y + 1);
      ctx.restore();
    }
    cx += p.w + gap;
  }
  ctx.restore();
  return total;
}

// ─── DOM ────────────────────────────────────────────────────────────────────

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** A glyph as an inline element (styled by GLYPH_CSS). */
export function glyphHTML(g) {
  if (!g?.text) return "";
  if (g.kind === "face") {
    const style = g.family === "xbox"
      ? ` style="--g-bg:${g.color};--g-ink:${g.ink}"`
      : g.color ? ` style="--g-ink:${g.color}"` : "";
    return `<span class="ccg ccg-face ccg-${g.family}"${style}>${esc(g.text)}</span>`;
  }
  if (g.kind === "pill" || g.kind === "dpad") return `<span class="ccg ccg-pill">${esc(g.text)}</span>`;
  return `<kbd class="ccg ccg-key">${esc(g.text)}</kbd>`;
}

/**
 * Fill every [data-glyph="action"] under `root` for the active device, or the
 * device named by the element's data-glyph-device.
 */
export function renderDomGlyphs(game, root = document) {
  if (!root?.querySelectorAll) return;
  for (const el of root.querySelectorAll("[data-glyph]")) {
    const device = el.dataset.glyphDevice || activeDevice(game);
    const html = glyphHTML(glyph(game, el.dataset.glyph, device));
    if (el.innerHTML !== html) el.innerHTML = html;
  }
}

/**
 * Glyph looks for the DOM. Injected into the document once; shadow roots
 * include it themselves. Which prompts show per device is style.css's
 * [data-input-only] rules (they must apply before this module runs).
 */
export const GLYPH_CSS = `
.ccg { display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; height: 1.7em; min-width: 1.7em;
  font: 800 0.8em/1 Bahnschrift, "Avenir Next Condensed", "DIN Condensed", "Roboto Condensed", "Arial Narrow", sans-serif;
  letter-spacing: 0.5px; vertical-align: middle; text-shadow: none; text-transform: none; }
.ccg-face { border-radius: 50%; background: var(--g-bg, #1b222c); color: var(--g-ink, #fff);
  border: 1px solid rgba(0, 0, 0, 0.55); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.25); }
.ccg-face:not(.ccg-xbox) { border-color: rgba(200, 220, 240, 0.55); }
.ccg-playstation { font-size: 0.9em; }
.ccg-pill { padding: 0 0.55em; border-radius: 0.85em; background: #1b222c; color: #fff; border: 1px solid rgba(200, 220, 240, 0.55); }
.ccg-key { padding: 0 0.5em; border-radius: 3px; color: #e4edf5; background: linear-gradient(180deg, #56708a 0%, #34475b 14%, #1c2835 80%, #0d141c 100%);
  border: 1px solid #04060b; box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.35); }
`;

function injectGlyphStyles() {
  if (typeof document === "undefined" || document.getElementById("cc-glyph-css")) return;
  const style = document.createElement("style");
  style.id = "cc-glyph-css";
  style.textContent = GLYPH_CSS;
  document.head.appendChild(style);
}
