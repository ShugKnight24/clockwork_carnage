/**
 * The pad's binding table: every action a controller can perform, by W3C
 * standard button index. js/gamepad.js resolves poll().pressed / justPressed
 * per action from it, js/game.js acts on those actions, and the prompts
 * (src/ui/input-glyphs.js) draw their glyphs from it, so a remap is a change
 * to this table and nothing else.
 */

/** Standard button indices by Xbox name. */
export const PAD = {
  A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7,
  VIEW: 8, MENU: 9, LS: 10, RS: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15,
};

/**
 * Action → standard button index, or a d-pad / stick pseudo button that only
 * prompts draw: "dpad" (all four), "dpadV", "dpadH", "lstick", "rstick".
 * Actions sharing a button are told apart by where js/game.js reads them:
 * gameplay while PLAYING, menus (A is Enter, B and Start are Escape, LB/RB are
 * Q/E) everywhere else. Menu navigation itself (d-pad or left stick, with
 * repeat) is fixed and not in here.
 */
export const GAMEPAD_ACTIONS = {
  // Gameplay
  dash: PAD.A,
  crouch: PAD.B,
  interact: PAD.X,
  weaponNext: PAD.Y,
  chronoShift: PAD.LB, // held, like the keyboard key
  chronoRewind: PAD.RB, // only while shifting, with Nova's power
  weaponPrev: PAD.RB, // when RB is not rewinding
  aim: PAD.LT,
  fire: PAD.RT,
  sprint: PAD.LS,
  chronoLock: PAD.RS,
  pause: PAD.MENU,
  minimap: PAD.VIEW,
  weaponCyclePrev: PAD.LEFT,
  weaponCycleNext: PAD.RIGHT,
  weaponLast: PAD.UP,
  weaponFirst: PAD.DOWN,
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

/** The shipped layout; GAMEPAD_ACTIONS is the live (remappable) copy. */
export const DEFAULT_GAMEPAD_ACTIONS = Object.freeze({ ...GAMEPAD_ACTIONS });

/** Gameplay actions a player may rebind. Menu, cutscene and showroom buttons stay fixed. */
export const REMAPPABLE_PAD_ACTIONS = [
  "dash", "crouch", "interact", "weaponNext", "chronoShift", "chronoRewind", "weaponPrev",
  "aim", "fire", "sprint", "chronoLock", "minimap", "weaponCyclePrev", "weaponCycleNext", "weaponLast", "weaponFirst",
];

/** Legend per standard button index, per controller family. */
export const PAD_LABELS = {
  xbox: ["A", "B", "X", "Y", "LB", "RB", "LT", "RT", "⧉", "☰", "LS", "RS"],
  playstation: ["✕", "○", "□", "△", "L1", "R1", "L2", "R2", "SHARE", "OPTIONS", "L3", "R3"],
  switch: ["B", "A", "Y", "X", "L", "R", "ZL", "ZR", "−", "+", "LS", "RS"],
};

// Past this a trigger counts as held.
const ANALOG_DOWN = 0.1;

/**
 * Fill `pressed` and `justPressed` for every action bound to a button.
 * @param {{ pressed: boolean[], values: number[] }} view  this frame's buttons
 *   (js/gamepad.js normalizeGamepad)
 * @param {boolean[]} prev  last frame's `down`, by index
 * @param {boolean[]} down  filled with this frame's held state, by index
 * @returns {boolean} whether any button but Home is held
 */
export function resolvePadActions(view, prev, down, pressed, justPressed, table = GAMEPAD_ACTIONS) {
  let any = false;
  for (let i = 0; i < down.length; i++) {
    down[i] = !!view.pressed[i] || view.values[i] > ANALOG_DOWN;
    if (down[i] && i <= PAD.RIGHT) any = true;
  }
  for (const action in table) {
    const i = table[action];
    if (typeof i !== "number") continue;
    pressed[action] = down[i];
    justPressed[action] = down[i] && !prev[i];
  }
  return any;
}
