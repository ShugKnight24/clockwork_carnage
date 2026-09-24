/**
 * Rebinding rules for keyboard and controller, kept pure so the deck's remap
 * screen and the tests share them. Esc and Start always pause; menu
 * navigation is not rebindable; a bound input taken by another action is a
 * conflict the player resolves by swapping.
 */
import { PAD, REMAPPABLE_PAD_ACTIONS, DEFAULT_GAMEPAD_ACTIONS } from "./pad-actions.js";
import { DEFAULT_KEYBINDS } from "../../js/input-manager.js";

export const REMAPPABLE_KEY_ACTIONS = Object.keys(DEFAULT_KEYBINDS).filter((a) => a !== "pause");
/** RB rewinds while shifting and is previous weapon otherwise, so these two may share a button. */
export const SHARED_PAD = [["chronoRewind", "weaponPrev"]];

export const isReservedKey = (code) => code === "Escape";
export const isReservedButton = (index) => index === PAD.MENU;
const reserved = (input) => (typeof input === "number" ? isReservedButton(input) : isReservedKey(input));
const shared = (a, b) => SHARED_PAD.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
// Face, shoulder, trigger, stick and d-pad buttons; not Home (16) or beyond.
const isButton = (v) => Number.isInteger(v) && v >= 0 && v <= PAD.RIGHT;

/** Remappable actions other than `action` already on `input`. */
const holders = (table, action, input, remappable) =>
  remappable.filter((a) => a !== action && table[a] === input && !shared(a, action));

export function planBind(table, action, input, remappable) {
  if (!remappable.includes(action)) return { ok: false, reason: "unknown" };
  if (reserved(input)) return { ok: false, reason: "reserved" };
  // The action's current binding says which device the table is for.
  const valid = typeof table[action] === "number" ? isButton(input) : typeof input === "string" && input !== "";
  if (!valid) return { ok: false, reason: "unknown" };
  return { ok: true, swapWith: holders(table, action, input, remappable)[0] ?? null };
}

/**
 * Bind `action` to `input`. With `swap`, every remappable action of the same
 * table that held `input` takes `action`'s old input — both halves of the RB
 * pair move together. Fixed menu/cutscene entries sharing the button stay.
 */
export function applyBind(table, action, input, swap = false) {
  const remappable = typeof input === "number" ? REMAPPABLE_PAD_ACTIONS : REMAPPABLE_KEY_ACTIONS;
  const previous = table[action];
  // A shared pair still on one button moves as one: rebinding only half of it
  // would leave the other half behind for the displaced action to land on.
  const group = [action, ...SHARED_PAD.flatMap((pair) => (pair.includes(action) ? pair.filter((a) => a !== action && table[a] === previous) : []))];
  const displaced = holders(table, action, input, remappable).filter((a) => !group.includes(a));
  for (const a of group) table[a] = input;
  if (swap) for (const a of displaced) table[a] = previous;
  return table;
}

export function resetBindings(table, defaults, actions) {
  for (const a of actions) table[a] = defaults[a];
  return table;
}

/** The last override (in list order) sharing a button with another action, if any. */
function collidingOverride(overrides) {
  const table = { ...DEFAULT_GAMEPAD_ACTIONS, ...overrides };
  for (let i = REMAPPABLE_PAD_ACTIONS.length - 1; i >= 0; i--) {
    const a = REMAPPABLE_PAD_ACTIONS[i];
    if (a in overrides && holders(table, a, table[a], REMAPPABLE_PAD_ACTIONS).length) return a;
  }
  return null;
}

/**
 * Validated overrides from a `cc_padbinds` string. Anything unreadable,
 * unknown, out of range or reserved is dropped; then overrides that would put
 * two actions on one button (after defaults fill the gaps) are dropped, last
 * first, until the table is clean. Never throws.
 */
export function loadPadBinds(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch (_) {
    return {};
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const out = {};
  for (const a of REMAPPABLE_PAD_ACTIONS) {
    if (!Object.prototype.hasOwnProperty.call(data, a)) continue;
    const v = data[a];
    if (isButton(v) && !isReservedButton(v)) out[a] = v;
  }
  for (let a = collidingOverride(out); a; a = collidingOverride(out)) delete out[a];
  return out;
}

export function savePadBinds(table) {
  const out = {};
  for (const a of REMAPPABLE_PAD_ACTIONS) if (table[a] !== DEFAULT_GAMEPAD_ACTIONS[a]) out[a] = table[a];
  return JSON.stringify(out);
}
