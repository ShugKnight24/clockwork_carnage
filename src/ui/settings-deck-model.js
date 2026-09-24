/**
 * The settings deck's navigation as a pure state machine, so every key rule
 * is testable without a DOM. Keyboard, gamepad (translated to key codes by
 * the game) and the deck's own buttons all go through deckKey.
 */

export function createDeckState({ section = 0, row = 0 } = {}) {
  return { section, row, zone: "rows", compare: false, confirm: null, capture: null };
}

const STEPPABLE = new Set(["slider", "enum", "toggle"]);
// A held key repeats; only these kinds may repeat a step.
const REPEATABLE = new Set(["slider", "enum"]);

export function deckKey(state, code, ctx) {
  const s = { ...state };
  const effects = [];
  const n = ctx.rows.length;
  // Rows can disappear under the focus (a change hides dependent rows).
  if (s.row >= n) s.row = Math.max(0, n - 1);
  const row = ctx.rows[s.row];

  if (s.capture) {
    if (code === "Escape") {
      s.capture = null;
      effects.push({ type: "captureCancel" });
    }
    // Every other key is the capture itself; the deck handles it.
    return { state: s, effects };
  }

  if (s.confirm) {
    // A held R (or Enter) must not answer the prompt it just opened.
    if (ctx.repeat) return { state: s, effects };
    if (code === "Enter" || code === "Space") effects.push({ type: s.confirm });
    s.confirm = null;
    effects.push({ type: "sound", name: "menuConfirm" });
    return { state: s, effects };
  }

  switch (code) {
    case "ArrowUp":
    case "ArrowDown":
      if (n) {
        s.row = (s.row + (code === "ArrowUp" ? -1 : 1) + n) % n;
        effects.push({ type: "focus" }, { type: "sound", name: "menuSelect" });
      }
      break;
    case "KeyQ":
    case "KeyE":
      s.section = (s.section + (code === "KeyQ" ? -1 : 1) + ctx.sectionCount) % ctx.sectionCount;
      s.row = 0;
      effects.push({ type: "focus" }, { type: "sound", name: "menuSelect" });
      break;
    case "ArrowLeft":
    case "ArrowRight":
      if (row && STEPPABLE.has(row.kind) && (!ctx.repeat || REPEATABLE.has(row.kind))) {
        effects.push({ type: "step", dir: code === "ArrowLeft" ? -1 : 1 });
      }
      break;
    case "Enter":
    case "Space":
      if (row && !ctx.repeat) effects.push({ type: "activate" });
      break;
    case "Backspace":
    case "Delete":
    case "KeyX":
      if (row && !ctx.repeat) effects.push({ type: "reset" });
      break;
    case "KeyR":
      if (!ctx.repeat) s.confirm = "resetSection";
      break;
    case "KeyC":
    case "GamepadY":
      if (!s.compare) {
        s.compare = true;
        effects.push({ type: "compare", on: true });
      }
      break;
    case "Escape":
      effects.push({ type: "close" });
      break;
  }
  return { state: s, effects };
}

export function deckKeyUp(state, code) {
  if (state.compare && (code === "KeyC" || code === "GamepadY")) {
    return { state: { ...state, compare: false }, effects: [{ type: "compare", on: false }] };
  }
  return { state, effects: [] };
}
